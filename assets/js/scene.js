/* ==========================================================================
   Finverse — scroll-driven particle stage
   --------------------------------------------------------------------------
   A single full-screen canvas that morphs a 3D particle field between shapes
   as the page scrolls. Points share one index space, so every morph is a
   continuous interpolation between two position sets rather than a fade.
   ========================================================================== */

(function () {
  'use strict';

  var canvas = document.getElementById('scene');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------ utils */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // deterministic hash -> [0,1)
  function hash(i) {
    var x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  // cheap 2D value noise for the terrain shape
  function noise2(x, y) {
    var s = Math.sin(x * 0.9) * Math.cos(y * 1.1) +
            Math.sin(x * 2.1 + y * 0.7) * 0.5 +
            Math.cos(y * 2.7 - x * 1.3) * 0.32;
    return s / 1.82;
  }

  /* --------------------------------------------------------------- palettes */

  var PALETTES = {
    dark: {
      colors: ['#f4b942', '#ffd98a', '#7ad3ff'],
      mix: [0.70, 0.19, 0.11],
      line: [244, 185, 66],
      composite: 'lighter',
      pointAlpha: 0.92,
      lineAlpha: 0.3,
      size: 1.0
    },
    light: {
      colors: ['#a8760c', '#c98a2e', '#1d6fa5'],
      mix: [0.72, 0.18, 0.10],
      line: [168, 118, 12],
      composite: 'source-over',
      pointAlpha: 0.72,
      lineAlpha: 0.24,
      size: 0.9
    }
  };

  var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  var palette = PALETTES[theme];
  var sprites = [];

  function buildSprite(color, light) {
    var size = 64;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    if (light) {
      grad.addColorStop(0, hexA(color, 1));
      grad.addColorStop(0.20, hexA(color, 0.78));
      grad.addColorStop(0.55, hexA(color, 0.20));
      grad.addColorStop(1, hexA(color, 0));
    } else {
      grad.addColorStop(0, hexA(color, 1));
      grad.addColorStop(0.14, hexA(color, 0.86));
      grad.addColorStop(0.42, hexA(color, 0.22));
      grad.addColorStop(1, hexA(color, 0));
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function buildSprites() {
    sprites = palette.colors.map(function (c) { return buildSprite(c, theme === 'light'); });
  }

  /* ---------------------------------------------------------------- shapes */

  var R = 400; // model-space radius

  var SHAPES = {
    // fibonacci sphere — the hero "market globe"
    globe: function (i, n, out) {
      var gr = Math.PI * (3 - Math.sqrt(5));
      var y = 1 - (i / (n - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = gr * i;
      var j = 1 + (hash(i * 2.3) - 0.5) * 0.05;
      out[0] = Math.cos(th) * r * R * j;
      out[1] = y * R * j;
      out[2] = Math.sin(th) * r * R * j;
    },

    // ring of vertical filaments — market bars / volume columns
    bars: function (i, n, out, cacheMeta) {
      var cols = cacheMeta.cols;
      var per = cacheMeta.per;
      var ci = i % cols;
      var k = Math.floor(i / cols);
      var ang = (ci / cols) * Math.PI * 2;
      var h = R * (0.22 + hash(ci * 5.7) * 1.15);
      var radius = R * 0.86 + Math.sin(k * 0.35 + ci) * 16;
      var v = per > 1 ? (k / (per - 1)) - 0.5 : 0;
      out[0] = Math.cos(ang) * radius + (hash(i * 1.7) - 0.5) * 16;
      out[1] = v * h * 2;
      out[2] = Math.sin(ang) * radius + (hash(i * 3.1) - 0.5) * 16;
    },

    // cubic lattice — structured data
    stack: function (i, n, out, cacheMeta) {
      var s = cacheMeta.side;
      var x = i % s;
      var y = Math.floor(i / s) % s;
      var z = Math.floor(i / (s * s)) % s;
      var d = s > 1 ? s - 1 : 1;
      out[0] = (x / d - 0.5) * R * 1.62;
      out[1] = (y / d - 0.5) * R * 1.62;
      out[2] = (z / d - 0.5) * R * 1.62;
    },

    // heightfield — the research landscape
    terrain: function (i, n, out, cacheMeta) {
      var cols = cacheMeta.cols;
      var rows = cacheMeta.rows;
      var gx = (i % cols) / (cols - 1);
      var gz = Math.floor(i / cols) / (rows - 1);
      var x = (gx - 0.5) * R * 2.9;
      var z = (gz - 0.5) * R * 2.9;
      var h = noise2(gx * 3.1, gz * 3.1) * 0.5 + noise2(gx * 7.7, gz * 6.3) * 0.22;
      out[0] = x;
      out[1] = h * R * 0.92;
      out[2] = z;
    },

    // tilted rings + inner shell — the covered markets
    orbit: function (i, n, out) {
      var mode = i % 3;
      var ang = (i / n) * Math.PI * 2 * 7;
      if (mode === 0) {
        var r1 = R * 1.18;
        var t1 = 0.36;
        out[0] = Math.cos(ang) * r1;
        out[1] = Math.sin(ang * 1.0) * r1 * Math.sin(t1) * 0.34;
        out[2] = Math.sin(ang) * r1 * Math.cos(t1);
      } else if (mode === 1) {
        var r2 = R * 0.86;
        var a2 = ang * 0.82 + 1.9;
        out[0] = Math.cos(a2) * r2 * 0.92;
        out[1] = Math.sin(a2) * r2 * 0.30;
        out[2] = Math.sin(a2) * r2 * 0.72;
      } else {
        var gr = Math.PI * (3 - Math.sqrt(5));
        var y = 1 - (i / n) * 2;
        var rr = Math.sqrt(Math.max(0, 1 - y * y)) * R * 0.46;
        out[0] = Math.cos(gr * i) * rr;
        out[1] = y * R * 0.46;
        out[2] = Math.sin(gr * i) * rr;
      }
    },

    // torus — the values ring
    torus: function (i, n, out) {
      var u = (i / n) * Math.PI * 2;
      var v = (i * 2.39996) % (Math.PI * 2);
      var mj = R * 0.78;
      var mn = R * 0.32;
      out[0] = (mj + mn * Math.cos(v)) * Math.cos(u);
      out[1] = mn * Math.sin(v) * 1.15;
      out[2] = (mj + mn * Math.cos(v)) * Math.sin(u);
    },

    // loose shell used for the intro assembly
    scatter: function (i, n, out) {
      var gr = Math.PI * (3 - Math.sqrt(5));
      var y = 1 - (i / n) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y)) * R * (2.6 + hash(i * 9.1) * 2.2);
      out[0] = Math.cos(gr * i) * r;
      out[1] = y * R * 3.4;
      out[2] = Math.sin(gr * i) * r;
    }
  };

  /* ------------------------------------------------------------------ state */

  var state = {
    w: 0, h: 0, dpr: 1,
    n: 0,
    radius: 1,
    cx: 0, cy: 0,
    cache: {},
    meta: {},
    pos: null,      // Float32Array(n*3) interpolated model positions
    proj: null,     // Float32Array(n*4) screen x, y, depth, scale
    colors: null,   // Uint8Array(n)
    edges: null,    // Int32Array pairs
    phase: null,    // Float32Array(n) animation phase
    targetP: 0,
    p: 0,
    intro: 0,
    introStart: 0,
    time: 0,
    pointer: { x: 0, y: 0, tx: 0, ty: 0 },
    running: false,
    lastFrame: 0,
    shapes: ['globe']
  };

  function collectSections() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-shape]'));
    if (!els.length) return;
    state.sections = els.map(function (el) {
      return { el: el, shape: el.getAttribute('data-shape') || 'globe', center: 0 };
    });
    state.shapes = state.sections.map(function (s) { return s.shape; });
  }

  function measureSections() {
    if (!state.sections) return;
    for (var i = 0; i < state.sections.length; i++) {
      var el = state.sections[i].el;
      var r = el.getBoundingClientRect();
      state.sections[i].center = r.top + window.scrollY + r.height / 2;
    }
  }

  // continuous scene index in [0, sections-1] for the current scroll position
  function sceneProgress() {
    var secs = state.sections;
    if (!secs || secs.length < 2) return 0;
    var mid = window.scrollY + window.innerHeight / 2;
    if (mid <= secs[0].center) return 0;
    var last = secs.length - 1;
    if (mid >= secs[last].center) return last;
    for (var i = 0; i < last; i++) {
      var a = secs[i].center, b = secs[i + 1].center;
      if (mid >= a && mid <= b) {
        var t = (mid - a) / Math.max(1, b - a);
        return i + t;
      }
    }
    return last;
  }

  /* ----------------------------------------------------------- particle set */

  function particleCount() {
    var area = window.innerWidth * window.innerHeight;
    var base = area > 1500000 ? 2300 : area > 900000 ? 1700 : 1100;
    if (window.innerWidth < 720) base = 760;
    if (reduceMotion.matches) base = Math.min(base, 900);
    return base;
  }

  function buildCache() {
    state.cache = {};
    state.meta = {};
    state.colors = new Uint8Array(state.n);
    state.phase = new Float32Array(state.n);
    state.pos = new Float32Array(state.n * 3);
    state.proj = new Float32Array(state.n * 4);

    for (var i = 0; i < state.n; i++) {
      var r = hash(i * 4.77);
      state.colors[i] = r < palette.mix[0] ? 0 : r < palette.mix[0] + palette.mix[1] ? 1 : 2;
      state.phase[i] = hash(i * 13.13) * Math.PI * 2;
    }

    // geometry hints used by the shape functions
    state.meta.bars = { cols: 44, per: Math.max(1, Math.floor(state.n / 44)) };
    state.meta.stack = { side: Math.max(3, Math.round(Math.cbrt(state.n))) };
    state.meta.terrain = { cols: Math.round(Math.sqrt(state.n)), rows: Math.ceil(state.n / Math.round(Math.sqrt(state.n))) };

    // static constellation: every Nth particle becomes a node
    var nodes = [];
    var stride = state.n > 1800 ? 13 : state.n > 1200 ? 10 : 8;
    for (var j = 0; j < state.n; j += stride) nodes.push(j);
    var pairs = [];
    for (var k = 0; k < nodes.length; k++) {
      pairs.push(nodes[k], nodes[(k + 1) % nodes.length]);
      pairs.push(nodes[k], nodes[(k + 5) % nodes.length]);
    }
    state.edges = new Int32Array(pairs);
  }

  function shapeCache(name) {
    if (state.cache[name]) return state.cache[name];
    var fn = SHAPES[name] || SHAPES.globe;
    var arr = new Float32Array(state.n * 3);
    var tmp = new Float32Array(3);
    for (var i = 0; i < state.n; i++) {
      fn(i, state.n, tmp, state.meta[name] || {});
      arr[i * 3] = tmp[0];
      arr[i * 3 + 1] = tmp[1];
      arr[i * 3 + 2] = tmp[2];
    }
    state.cache[name] = arr;
    return arr;
  }

  /* --------------------------------------------------------------- resizing */

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = w;
    state.h = h;
    state.cx = w / 2;
    state.cy = h / 2;
    canvas.width = Math.round(w * state.dpr);
    canvas.height = Math.round(h * state.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.radius = clamp(Math.min(w, h) / 820, 0.5, 1.5);

    var n = particleCount();
    if (n !== state.n) {
      state.n = n;
      buildCache();
    }
    measureSections();
  }

  /* ----------------------------------------------------------------- render */

  function project(x, y, z, ay, ax, zoom, out, o) {
    var cy = Math.cos(ay), sy = Math.sin(ay);
    var x1 = x * cy + z * sy;
    var z1 = -x * sy + z * cy;
    var cx = Math.cos(ax), sx = Math.sin(ax);
    var y1 = y * cx - z1 * sx;
    var z2 = y * sx + z1 * cx;

    var focal = 1400;
    var camZ = 900;
    var scale = focal / (focal + camZ - z2);
    out[o] = state.cx + x1 * scale * zoom;
    out[o + 1] = state.cy + y1 * scale * zoom;
    out[o + 2] = z2;
    out[o + 3] = scale;
  }

  function render() {
    if (!state.n) return;
    var n = state.n;
    var pos = state.pos;
    var proj = state.proj;

    var p = state.p;
    var last = state.shapes.length - 1;
    var i0 = clamp(Math.floor(p), 0, last);
    var i1 = clamp(i0 + 1, 0, last);
    var raw = clamp(p - i0, 0, 1);
    // hold each shape for a while, then morph across the middle of the gap
    var t = smooth(clamp((raw - 0.18) / 0.64, 0, 1));

    var a = shapeCache(state.shapes[i0]);
    var b = shapeCache(state.shapes[i1]);
    var sc = shapeCache('scatter');

    var intro = state.intro;                       // 0 -> 1 assembly on load
    var introE = 1 - Math.pow(1 - intro, 3);
    var assemble = smooth(introE);

    var time = state.time;
    var wobbleAmp = reduceMotion.matches ? 0 : 5.5;
    var zoom = state.radius * (1 + Math.sin(p * 1.3) * 0.045);

    // pointer parallax + scroll-linked rotation
    state.pointer.x = lerp(state.pointer.x, state.pointer.tx, 0.06);
    state.pointer.y = lerp(state.pointer.y, state.pointer.ty, 0.06);

    var ay = (reduceMotion.matches ? 0.5 : time * 0.075) + p * 0.42 + state.pointer.x * 0.46;
    var ax = 0.24 + Math.sin(p * 1.7) * 0.24 + state.pointer.y * 0.3;
    if (!reduceMotion.matches) ax += Math.sin(time * 0.19) * 0.05;

    for (var i = 0; i < n; i++) {
      var o = i * 3;
      var tx = lerp(a[o], b[o], t);
      var ty = lerp(a[o + 1], b[o + 1], t);
      var tz = lerp(a[o + 2], b[o + 2], t);

      if (assemble < 1) {
        tx = lerp(sc[o], tx, assemble);
        ty = lerp(sc[o + 1], ty, assemble);
        tz = lerp(sc[o + 2], tz, assemble);
      }

      if (wobbleAmp) {
        var ph = state.phase[i];
        tx += Math.sin(time * 0.7 + ph) * wobbleAmp;
        ty += Math.cos(time * 0.62 + ph * 1.3) * wobbleAmp;
        tz += Math.sin(time * 0.55 + ph * 0.7) * wobbleAmp;
      }

      pos[o] = tx; pos[o + 1] = ty; pos[o + 2] = tz;
      project(tx, ty, tz, ay, ax, zoom, proj, i * 4);
    }

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, state.w, state.h);
    ctx.globalCompositeOperation = palette.composite === 'lighter' ? 'lighter' : 'source-over';

    // edges first so points sit on top
    var edgeAlpha = palette.lineAlpha * assemble;
    if (edgeAlpha > 0.01) {
      var lr = palette.line[0], lg = palette.line[1], lb = palette.line[2];
      var maxD = 150 * state.radius * state.radius + 60;
      var maxD2 = maxD * maxD;
      ctx.lineWidth = 1;
      for (var e = 0; e < state.edges.length; e += 2) {
        var p1 = state.edges[e] * 4;
        var p2 = state.edges[e + 1] * 4;
        var dx = proj[p1] - proj[p2];
        var dy = proj[p1 + 1] - proj[p2 + 1];
        var d2 = dx * dx + dy * dy;
        if (d2 > maxD2) continue;
        var depth = clamp((proj[p1 + 2] + R) / (2 * R), 0, 1);
        var alpha = (1 - Math.sqrt(d2) / maxD) * edgeAlpha * (0.35 + depth * 0.65);
        if (alpha <= 0.008) continue;
        ctx.strokeStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(proj[p1], proj[p1 + 1]);
        ctx.lineTo(proj[p2], proj[p2 + 1]);
        ctx.stroke();
      }
    }

    // particle sprites
    var pointAlpha = palette.pointAlpha * (0.25 + assemble * 0.75);
    var sizeBase = palette.size * state.radius;
    for (var q = 0; q < n; q++) {
      var po = q * 4;
      var depthF = clamp((proj[po + 2] + R) / (2 * R), 0, 1);
      var size = (1.6 + depthF * 4.6) * sizeBase * proj[po + 3];
      if (size < 0.5) continue;
      var alpha = pointAlpha * (0.16 + Math.pow(depthF, 1.5) * 0.84);
      var sprite = sprites[state.colors[q]] || sprites[0];
      ctx.globalAlpha = alpha > 1 ? 1 : alpha;
      ctx.drawImage(sprite, proj[po] - size / 2, proj[po + 1] - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------------- loop */

  function frame(now) {
    if (!state.running) return;
    var dt = Math.min(48, now - state.lastFrame || 16);
    state.lastFrame = now;
    state.time += dt / 1000;

    if (state.intro < 1) {
      state.intro = clamp(state.intro + dt / 1700, 0, 1);
    }

    state.targetP = sceneProgress();
    state.p = reduceMotion.matches
      ? state.targetP
      : lerp(state.p, state.targetP, clamp(dt / 1000 * 3.4, 0.02, 0.16));

    render();

    if (reduceMotion.matches && state.intro >= 1) {
      // static render is complete; resume only on interaction
      state.running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.lastFrame = performance.now();
    requestAnimationFrame(frame);
  }

  function stop() { state.running = false; }

  /* ----------------------------------------------------------------- events */

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      render();
      if (!reduceMotion.matches) start();
    }, 140);
  }

  function onScroll() {
    state.targetP = sceneProgress();
    if (reduceMotion.matches) {
      state.p = state.targetP;
      state.intro = 1;
      render();
    }
  }

  function onPointer(e) {
    if (e.pointerType === 'touch') return;
    state.pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    state.pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onVisibility() {
    if (document.hidden) stop();
    else if (!reduceMotion.matches) start();
  }

  function setTheme(next) {
    theme = next === 'light' ? 'light' : 'dark';
    palette = PALETTES[theme];
    buildSprites();
    // colour assignment depends on the palette mix
    if (state.n) {
      for (var i = 0; i < state.n; i++) {
        var r = hash(i * 4.77);
        state.colors[i] = r < palette.mix[0] ? 0 : r < palette.mix[0] + palette.mix[1] ? 1 : 2;
      }
    }
    render();
  }

  /* -------------------------------------------------------------------- init */

  buildSprites();
  collectSections();
  resize();
  measureSections();
  state.targetP = state.p = sceneProgress();
  render();

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  // web fonts and images change section heights; re-measure once they settle
  function remeasure() {
    measureSections();
    state.targetP = state.p = sceneProgress();
    render();
  }
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  setTimeout(remeasure, 1200);

  if (reduceMotion.matches) {
    state.intro = 1;
    render();
  } else {
    start();
  }

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', function () {
      if (reduceMotion.matches) { state.intro = 1; state.p = state.targetP; render(); stop(); }
      else start();
    });
  }

  window.FinverseScene = {
    setTheme: setTheme,
    refresh: function () { resize(); render(); },
    render: render
  };
})();
