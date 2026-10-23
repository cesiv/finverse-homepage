/* ==========================================================================
   Finverse — product UI mockups
   --------------------------------------------------------------------------
   The "screenshots" on this page are live DOM + SVG panels rendered from
   deterministic sample data, so they stay crisp at any size and can be
   restyled with the rest of the site.
   ========================================================================== */

(function () {
  'use strict';

  var uid = 0;

  function t(key) {
    var lang = window.FinverseLang || 'zh';
    var dict = (window.FinverseI18N || {})[lang] || {};
    return dict[key] || key;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function r2(v) { return Math.round(v * 100) / 100; }
  function fmt(v, d) { return v.toFixed(d == null ? 2 : d); }
  function pct(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; }
  function cls(v) { return v >= 0 ? 'up' : 'down'; }

  /* ------------------------------------------------------------- instruments */

  var INSTRUMENTS = [
    { code: '688213', zh: '星枢半导体', en: 'Nexaris Semi', score: 96, chg: 8.4, price: 128.60 },
    { code: '002471', zh: '远望能源', en: 'Farview Energy', score: 94, chg: 6.1, price: 42.18 },
    { code: 'HK.2382', zh: '云启科技', en: 'Cloudrise Tech', score: 92, chg: 5.3, price: 96.45 },
    { code: '600731', zh: '华恒精密', en: 'Huaheng Precision', score: 90, chg: 4.8, price: 61.72 },
    { code: 'HK.0987', zh: '南岸医药', en: 'Southbank Pharma', score: 88, chg: 3.9, price: 33.90 },
    { code: '300915', zh: '沐光新材', en: 'Dawnlit Materials', score: 86, chg: 3.2, price: 24.55 },
    { code: '601204', zh: '恒川重工', en: 'Hengchuan Heavy', score: 84, chg: 2.7, price: 18.36 },
    { code: 'HK.1366', zh: '明远物流', en: 'Mingyuan Logistics', score: 82, chg: 2.1, price: 12.04 }
  ];

  function nameOf(row) { return (window.FinverseLang === 'en' ? row.en : row.zh); }

  /* ------------------------------------------------------------------ charts */

  function linePath(values, x, y) {
    var d = '';
    for (var i = 0; i < values.length; i++) {
      d += (i ? 'L' : 'M') + r2(x(i)) + ' ' + r2(y(values[i]));
    }
    return d;
  }

  function sparkline(values, w, h, color) {
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = max - min || 1;
    var x = function (i) { return (i / (values.length - 1)) * (w - 2) + 1; };
    var y = function (v) { return h - 2 - ((v - min) / span) * (h - 4); };
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
      '<path d="' + linePath(values, x, y) + '" fill="none" stroke="' + color +
      '" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  function walk(seed, n, start, drift, vol) {
    var rnd = mulberry32(seed);
    var out = [];
    var v = start;
    for (var i = 0; i < n; i++) {
      v += drift + (rnd() - 0.5) * vol;
      out.push(v);
    }
    return out;
  }

  // CSI-300-ish six month trend for the desk chart
  function indexSeries() {
    var rnd = mulberry32(770415);
    var out = [];
    var v = 3480;
    for (var i = 0; i < 92; i++) {
      var t = i / 91;
      var trend = Math.sin(t * Math.PI * 0.9 - 0.7) * 120 + t * 410;
      v = 3480 + trend + (rnd() - 0.5) * 46;
      out.push(v);
    }
    return out;
  }

  function areaChart(values, w, h, id) {
    var pad = { t: 16, r: 10, b: 22, l: 40 };
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var padV = (max - min) * 0.12 || 1;
    min -= padV; max += padV;
    var x = function (i) { return pad.l + (i / (values.length - 1)) * (w - pad.l - pad.r); };
    var y = function (v) { return pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b); };

    var s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="presentation">';
    s += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
         '<stop offset="0%" stop-color="currentColor" stop-opacity=".26"/>' +
         '<stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>';
    s += '<g style="color:var(--brand)">';
    for (var g = 0; g <= 3; g++) {
      var gy = pad.t + (g / 3) * (h - pad.t - pad.b);
      s += '<line class="grid-line" x1="' + pad.l + '" y1="' + r2(gy) + '" x2="' + (w - pad.r) + '" y2="' + r2(gy) + '"/>';
      var val = max - (g / 3) * (max - min);
      s += '<text class="axis-label" x="' + (pad.l - 8) + '" y="' + r2(gy + 3) + '" text-anchor="end">' + Math.round(val) + '</text>';
    }
    var line = linePath(values, x, y);
    s += '<path class="series-area" d="' + line + 'L' + r2(x(values.length - 1)) + ' ' + (h - pad.b) +
         'L' + r2(x(0)) + ' ' + (h - pad.b) + 'Z" fill="url(#' + id + ')"/>';
    s += '<path class="series" d="' + line + '"/>';
    s += '<circle cx="' + r2(x(values.length - 1)) + '" cy="' + r2(y(values[values.length - 1])) +
         '" r="3.2" fill="currentColor"/>';
    s += '</g></svg>';
    return s;
  }

  /* ------------------------------------------------------- candlestick model */

  function buildCandles() {
    var rnd = mulberry32(20260518);
    var ctrl = [
      [0.00, 116], [0.10, 104], [0.22, 92], [0.33, 84], [0.42, 87],
      [0.52, 97], [0.60, 107], [0.68, 112], [0.74, 107], [0.80, 105],
      [0.86, 108], [0.92, 117], [0.96, 126], [1.00, 133]
    ];
    var n = 58, bars = [], closes = [];

    function target(t) {
      for (var i = 1; i < ctrl.length; i++) {
        if (t <= ctrl[i][0]) {
          var a = ctrl[i - 1], b = ctrl[i];
          var u = (t - a[0]) / (b[0] - a[0]);
          return a[1] + (b[1] - a[1]) * (u * u * (3 - 2 * u));
        }
      }
      return ctrl[ctrl.length - 1][1];
    }

    for (var i = 0; i < n; i++) {
      var tf = i / (n - 1);
      var close = target(tf) + (rnd() - 0.5) * 2.4;
      var prev = closes.length ? closes[closes.length - 1] : close + 1.2;
      var open = prev + (rnd() - 0.5) * 1.4;
      var hi = Math.max(open, close) + rnd() * 1.5;
      var lo = Math.min(open, close) - rnd() * 1.5;
      var volBase = 0.55 + tf * 0.4;
      if (tf > 0.88) volBase *= 2.6;
      if (tf > 0.7 && tf < 0.85) volBase *= 0.72;
      var vol = volBase * (0.7 + rnd() * 0.6);
      closes.push(close);
      bars.push({ o: open, h: hi, l: lo, c: close, v: vol });
    }
    return { bars: bars, closes: closes };
  }

  function candleChart(model, w, h) {
    var bars = model.bars;
    var closes = model.closes;
    var pad = { t: 18, r: 14, b: 46, l: 38 };
    var volH = 26;
    var plotB = h - pad.b;
    var prices = [];
    for (var i = 0; i < bars.length; i++) { prices.push(bars[i].h, bars[i].l); }
    var min = Math.min.apply(null, prices), max = Math.max.apply(null, prices);
    var padV = (max - min) * 0.08;
    min -= padV; max += padV;

    var step = (w - pad.l - pad.r) / bars.length;
    var bw = Math.max(3, step * 0.56);
    var x = function (i) { return pad.l + step * i + step / 2; };
    var y = function (v) { return pad.t + (1 - (v - min) / (max - min)) * (plotB - pad.t); };
    var maxVol = Math.max.apply(null, bars.map(function (b) { return b.v; }));
    var yv = function (v) { return (h - 10) - (v / maxVol) * volH; };

    var s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="presentation">';

    // horizontal grid
    for (var g = 0; g <= 3; g++) {
      var gy = pad.t + (g / 3) * (plotB - pad.t);
      s += '<line class="grid-line" x1="' + pad.l + '" y1="' + r2(gy) + '" x2="' + (w - pad.r) + '" y2="' + r2(gy) + '"/>';
      var val = max - (g / 3) * (max - min);
      s += '<text class="axis-label" x="' + (pad.l - 8) + '" y="' + r2(gy + 3) + '" text-anchor="end">' + fmt(val, 0) + '</text>';
    }

    // volume
    for (var v = 0; v < bars.length; v++) {
      var b = bars[v];
      var yTop = yv(b.v);
      s += '<rect class="' + (b.c >= b.o ? 'vol-up' : 'vol-down') + '" x="' + r2(x(v) - bw / 2) + '" y="' +
           r2(yTop) + '" width="' + r2(bw) + '" height="' + r2(h - 10 - yTop) + '" rx="1"/>';
    }

    // candles
    for (var c = 0; c < bars.length; c++) {
      var k = bars[c];
      var up = k.c >= k.o;
      var col = up ? 'candle-up' : 'candle-down';
      var top = y(Math.max(k.o, k.c));
      var bot = y(Math.min(k.o, k.c));
      s += '<line class="' + col + '" x1="' + r2(x(c)) + '" y1="' + r2(y(k.h)) + '" x2="' + r2(x(c)) +
           '" y2="' + r2(y(k.l)) + '" stroke="' + (up ? 'var(--up)' : 'var(--down)') + '" stroke-width="1"/>';
      s += '<rect class="' + col + '" x="' + r2(x(c) - bw / 2) + '" y="' + r2(top) + '" width="' + r2(bw) +
           '" height="' + r2(Math.max(1, bot - top)) + '" rx="1"/>';
    }

    // 20-day moving average
    var ma = [];
    for (var m = 0; m < closes.length; m++) {
      if (m < 19) { ma.push(closes[m]); continue; }
      var sum = 0;
      for (var q = m - 19; q <= m; q++) sum += closes[q];
      ma.push(sum / 20);
    }
    s += '<path class="ma" d="' + linePath(ma, x, y) + '"/>';

    // breakout level = handle high
    var hiHandle = -Infinity;
    for (var z = Math.floor(bars.length * 0.68); z < Math.floor(bars.length * 0.88); z++) {
      hiHandle = Math.max(hiHandle, closes[z]);
    }
    var entry = hiHandle + 0.6;
    var ey = y(entry);
    var bx = x(Math.floor(bars.length * 0.68));
    var ex = x(bars.length - 1);
    s += '<line class="entry-line" x1="' + r2(bx) + '" y1="' + r2(ey) + '" x2="' + r2(ex) + '" y2="' + r2(ey) + '"/>';

    // handle highlight
    var hx1 = x(Math.floor(bars.length * 0.70));
    var hx2 = x(Math.floor(bars.length * 0.87));
    var hy = y(Math.max(closes[Math.floor(bars.length * 0.68)], closes[Math.floor(bars.length * 0.74)]));
    s += '<path class="annot" d="M' + r2(hx1) + ' ' + r2(hy - 6) + 'Q' + r2((hx1 + hx2) / 2) + ' ' + r2(hy - 20) +
         ' ' + r2(hx2) + ' ' + r2(hy - 6) + '"/>';

    // labels
    var labelY = ey - 22;
    s += '<rect class="annot-box" x="' + r2(bx + 4) + '" y="' + r2(labelY - 11) + '" width="52" height="15" rx="3"/>';
    s += '<text class="annot-text" x="' + r2(bx + 30) + '" y="' + r2(labelY) + '" text-anchor="middle">' + t('app.pattern.ann2') + '</text>';
    s += '<rect class="annot-box" x="' + r2((hx1 + hx2) / 2 - 26) + '" y="' + r2(hy - 40) + '" width="52" height="15" rx="3"/>';
    s += '<text class="annot-text" x="' + r2((hx1 + hx2) / 2) + '" y="' + r2(hy - 29) + '" text-anchor="middle">' + t('app.pattern.ann1') + '</text>';

    // breakout marker
    var mx = x(bars.length - 3);
    var my = y(closes[closes.length - 3]) - 16;
    s += '<path class="annot" d="M' + r2(mx) + ' ' + r2(my + 12) + 'L' + r2(mx) + ' ' + r2(my - 2) +
         '" stroke-dasharray="0" stroke-width="1.6"/>';
    s += '<path d="M' + r2(mx - 4) + ' ' + r2(my + 1) + 'L' + r2(mx) + ' ' + r2(my - 5) + 'L' + r2(mx + 4) +
         ' ' + r2(my + 1) + '" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';

    s += '</svg>';
    return { svg: s, entry: entry };
  }

  /* ------------------------------------------------------------------ panels */

  function appBar(title, chip, mutedFirst) {
    return '<div class="app-bar">' +
      '<span class="app-dots"><i></i><i></i><i></i></span>' +
      '<span class="app-title">' + title + '</span>' +
      (mutedFirst === false ? '' : '<span class="app-chip is-muted">' + t('app.sample') + '</span>') +
      (chip ? '<span class="app-chip">' + chip + '</span>' : '') +
      '</div>';
  }

  function panel(title, right, body, extraClass) {
    return '<div class="panel' + (extraClass ? ' ' + extraClass : '') + '">' +
      '<div class="panel-hd"><b>' + title + '</b>' + (right ? '<span class="mono">' + right + '</span>' : '') + '</div>' +
      '<div class="panel-bd">' + body + '</div></div>';
  }

  /* --------------------------------------------------------------- 1. desk */

  function buildDash() {
    var id = 'fvArea' + (++uid);
    var series = indexSeries();
    var last = series[series.length - 1];
    var first = series[0];
    var chg = ((last - first) / first) * 100;

    var chart = panel(t('app.dash.chart'),
      '<span class="' + cls(chg) + '">' + pct(chg) + '</span>',
      areaChart(series, 520, 190, id));

    var watchRows = INSTRUMENTS.slice(0, 5).map(function (row, i) {
      var seed = 4100 + i * 37;
      var vals = walk(seed, 22, 50, row.chg / 22, 3.2);
      return '<div class="row-item watch-row">' +
        '<span class="rank-name"><b>' + nameOf(row) + '</b><span>' + row.code + '</span></span>' +
        sparkline(vals, 52, 18, row.chg >= 0 ? 'var(--up)' : 'var(--down)') +
        '<span class="mono ' + cls(row.chg) + '">' + pct(row.chg) + '</span>' +
        '</div>';
    }).join('');

    var watch = panel(t('app.dash.watch'), String(INSTRUMENTS.length), '<div class="row-list">' + watchRows + '</div>');

    var signals = [
      { k: 'app.dash.sig1', tone: 'brand' },
      { k: 'app.dash.sig2', tone: 'brand' },
      { k: 'app.dash.sig3', tone: 'accent' }
    ].map(function (s) {
      return '<div class="signal"><i class="dot ' + s.tone + '"></i><span>' + t(s.k) + '</span></div>';
    }).join('');

    var sigPanel = panel(t('app.dash.signal'), '3', signals);

    return '<div class="app app--dash">' + appBar(t('app.dash.title'), t('app.dash.chip')) +
      '<div class="app-body">' + chart +
      '<div class="dash-cols">' + watch + sigPanel + '</div>' +
      '</div></div>';
  }

  /* --------------------------------------------------------------- 2. rank */

  function buildRank() {
    var head = '<div class="row-item rank-row rank-head">' +
      '<span class="rank-no">#</span>' +
      '<span>' + t('app.rank.colName') + '</span>' +
      '<span class="rank-hd-score">' + t('app.rank.colScore') + '</span>' +
      '<span class="rank-hd-chg">' + t('app.rank.colChg') + '</span>' +
      '</div>';

    var rows = INSTRUMENTS.map(function (row, i) {
      return '<div class="row-item rank-row">' +
        '<span class="rank-no">' + (i + 1) + '</span>' +
        '<span class="rank-name"><b>' + nameOf(row) + '</b><span>' + row.code + '</span></span>' +
        '<span class="score"><span class="score-bar"><i style="width:' + ((row.score - 60) / 40 * 100).toFixed(0) + '%"></i></span>' +
        '<b>' + row.score + '</b></span>' +
        '<span class="rank-chg mono ' + cls(row.chg) + '">' + pct(row.chg) + '</span>' +
        '</div>';
    }).join('');

    return '<div class="app app--rank">' + appBar(t('app.rank.title'), t('app.rank.chip')) +
      '<div class="app-body">' + head + rows + '</div></div>';
  }

  /* ------------------------------------------------------------ 3. pattern */

  function buildPattern() {
    var model = buildCandles();
    var chart = candleChart(model, 560, 268);
    var closes = model.closes;
    var last = closes[closes.length - 1];
    var inval = last * 0.88;

    var legend = '<div class="legend">' +
      '<span><i style="background:var(--up)"></i>' + t('app.pattern.legendClose') + '</span>' +
      '<span><i style="background:var(--brand-2)"></i>' + t('app.pattern.legendMa') + '</span>' +
      '</div>';

    var keys = '<div class="kv-row">' +
      '<div class="kv"><span>' + t('app.pattern.k1') + '</span><b>92%</b></div>' +
      '<div class="kv"><span>' + t('app.pattern.k2') + '</span><b>1.8x</b></div>' +
      '<div class="kv"><span>' + t('app.pattern.k3') + '</span><b>¥' + fmt(inval, 2) + '</b></div>' +
      '</div>';

    return '<div class="app app--pattern">' + appBar(t('app.pattern.title'), t('app.pattern.chip')) +
      '<div class="app-body"><div class="chart-head">' + legend +
      '<span class="mono up">' + t('app.pattern.ann2') + ' ¥' + fmt(chart.entry, 2) + '</span></div>' +
      chart.svg + keys + '</div></div>';
  }

  /* ---------------------------------------------------------- 4. portfolio */

  function buildPortfolio() {
    var holdings = [
      { i: 0, cost: 108.40, last: 128.60, w: 34 },
      { i: 1, cost: 39.10, last: 42.18, w: 22 },
      { i: 2, cost: 88.20, last: 96.45, w: 18 },
      { i: 4, cost: 36.50, last: 33.90, w: 14 },
      { i: 5, cost: 21.80, last: 24.55, w: 12 }
    ];

    var head = '<div class="row-item holding-row holding-head">' +
      '<span>' + t('app.portfolio.colName') + '</span>' +
      '<span>' + t('app.portfolio.colCost') + '</span>' +
      '<span>' + t('app.portfolio.colLast') + '</span>' +
      '<span>' + t('app.portfolio.colPnl') + '</span>' +
      '</div>';

    var rows = holdings.map(function (h) {
      var row = INSTRUMENTS[h.i];
      var pnl = ((h.last - h.cost) / h.cost) * 100;
      return '<div class="row-item holding-row">' +
        '<span class="rank-name"><b>' + nameOf(row) + '</b><span>' + row.code + '</span></span>' +
        '<span class="mono dim">' + fmt(h.cost, 2) + '</span>' +
        '<span class="mono">' + fmt(h.last, 2) + '</span>' +
        '<span class="mono ' + cls(pnl) + '">' + pct(pnl) + '</span>' +
        '</div>';
    }).join('');

    var sectors = [
      { label: 'app.portfolio.sector1', value: 34, color: 'var(--brand)' },
      { label: 'app.portfolio.sector2', value: 26, color: 'var(--brand-2)' },
      { label: 'app.portfolio.sector3', value: 22, color: 'var(--brand-3)' },
      { label: 'app.portfolio.sector4', value: 18, color: 'var(--text-faint)' }
    ];
    var circ = 2 * Math.PI * 42;
    var offset = 0;
    var rings = sectors.map(function (s) {
      var len = (s.value / 100) * circ;
      var seg = '<circle cx="54" cy="54" r="42" stroke="' + s.color + '" stroke-dasharray="' +
        r2(len - 3) + ' ' + r2(circ - len + 3) + '" stroke-dashoffset="' + r2(-offset) +
        '" stroke-linecap="round" transform="rotate(-90 54 54)"/>';
      offset += len;
      return seg;
    }).join('');

    var legend = sectors.map(function (s) {
      return '<div><i style="background:' + s.color + '"></i>' + t(s.label) + '<b>' + s.value + '%</b></div>';
    }).join('');

    var donut = '<div class="donut-wrap">' +
      '<svg class="donut" viewBox="0 0 108 108" role="presentation">' +
      '<circle cx="54" cy="54" r="42" stroke="var(--line)"/>' + rings + '</svg>' +
      '<div class="donut-legend">' + legend + '</div></div>';

    return '<div class="app app--portfolio">' + appBar(t('app.portfolio.title'), t('app.portfolio.chip')) +
      '<div class="app-body">' + head + rows + donut +
      '</div></div>';
  }

  /* ------------------------------------------------------------ 5. breadth */

  function buildBreadth() {
    var tiles = [
      { k: 'app.breadth.t1', v: '3,412.68', c: 0.84 },
      { k: 'app.breadth.t2', v: '24,318.40', c: 1.16 },
      { k: 'app.breadth.t3', v: '19,204.15', c: -0.42 }
    ].map(function (x) {
      return '<div class="tile"><span>' + t(x.k) + '</span><b>' + x.v + '</b>' +
        '<i class="' + cls(x.c) + '">' + pct(x.c) + '</i></div>';
    }).join('');

    var heat = '';
    var rnd = mulberry32(5150);
    for (var i = 0; i < 24; i++) {
      var v = rnd();
      var col = v > 0.62 ? 'var(--up)' : v > 0.38 ? 'var(--brand-2)' : 'var(--down)';
      heat += '<i style="background:' + col + ';opacity:' + (0.28 + Math.abs(v - 0.5) * 1.2).toFixed(2) + '"></i>';
    }

    var adv = 2864, dec = 1902;
    var total = adv + dec;
    var bar = '<div class="breadth-bar">' +
      '<i style="width:' + ((adv / total) * 100).toFixed(1) + '%;background:var(--up)"></i>' +
      '<i style="width:' + ((dec / total) * 100).toFixed(1) + '%;background:var(--down)"></i>' +
      '</div>' +
      '<div class="breadth-legend"><span class="up mono">' + t('app.breadth.adv') + ' ' + adv.toLocaleString() + '</span>' +
      '<span class="down mono">' + t('app.breadth.dec') + ' ' + dec.toLocaleString() + '</span></div>';

    // 62/100 gauge
    var angle = -90 + (62 / 100) * 180;
    var gauge = '<div class="gauge">' +
      '<svg viewBox="0 0 116 62" role="presentation">' +
      '<path d="M8 56a50 50 0 0 1 100 0" fill="none" stroke="var(--line)" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M8 56a50 50 0 0 1 100 0" fill="none" stroke="var(--brand)" stroke-width="8" stroke-linecap="round"' +
      ' stroke-dasharray="' + (157 * 0.62).toFixed(1) + ' 400"/>' +
      '<line x1="58" y1="56" x2="' + (58 + 34 * Math.cos(angle * Math.PI / 180)).toFixed(1) + '" y2="' +
      (56 + 34 * Math.sin(angle * Math.PI / 180)).toFixed(1) + '" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="58" cy="56" r="3.4" fill="var(--accent)"/>' +
      '</svg>' +
      '<div><div class="gauge-val">62</div><div class="gauge-label">' + t('app.breadth.pulseVal') + '</div></div>' +
      '</div>';

    var pulse = panel(t('app.breadth.pulse'), '/100', gauge);
    var breadth = panel(t('app.breadth.adv') + ' / ' + t('app.breadth.dec'), ((adv / total) * 100).toFixed(0) + '%', bar);
    var heatPanel = panel(t('app.breadth.heat'), '', '<div class="heat">' + heat + '</div>');

    return '<div class="app app--breadth">' + appBar(t('app.breadth.title'), t('app.breadth.chip')) +
      '<div class="app-body">' +
      '<div class="tile-grid">' + tiles + '</div>' +
      pulse + breadth + heatPanel +
      '</div></div>';
  }

  /* ----------------------------------------------------------------- render */

  var BUILDERS = {
    dash: buildDash,
    rank: buildRank,
    pattern: buildPattern,
    portfolio: buildPortfolio,
    breadth: buildBreadth
  };

  function render() {
    var nodes = document.querySelectorAll('[data-app]');
    for (var i = 0; i < nodes.length; i++) {
      var kind = nodes[i].getAttribute('data-app');
      var build = BUILDERS[kind];
      if (!build) continue;
      nodes[i].innerHTML = build();
    }
    if (window.FinverseScene && window.FinverseScene.render) window.FinverseScene.render();
  }

  window.FinverseMockups = { render: render };
  render();
})();
