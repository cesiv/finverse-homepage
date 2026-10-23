/* Finverse — public content pages
 * Renders 市场温度 / 研究框架 from the assets/data files and handles the
 * shared bits: theme toggle, copy-link button, sparkline and gauge.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME = 'finverse-theme';

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function el(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmtPct(value) {
    var n = Number(value) || 0;
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }

  /* ------------------------------------------------------------------ theme */

  var meta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(next) {
    root.setAttribute('data-theme', next);
    if (meta) meta.setAttribute('content', next === 'light' ? '#faf7f2' : '#0c0b0a');
  }

  applyTheme(read(THEME) || 'dark');

  var toggle = el('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      store(THEME, next);
    });
  }

  /* -------------------------------------------------------------- copy link */

  Array.prototype.forEach.call(document.querySelectorAll('[data-copy-link]'), function (btn) {
    btn.addEventListener('click', function () {
      var original = btn.textContent;
      var done = function () {
        btn.textContent = '链接已复制';
        if (window.FvTrack) window.FvTrack('copy');
        setTimeout(function () { btn.textContent = original; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href).then(done, function () {});
      }
    });
  });

  /* ------------------------------------------------------------- sparkline */

  function drawSpark(host, values) {
    if (!host || !values || values.length < 2) return;
    var w = Math.max(240, Math.round(host.clientWidth || 320));
    var h = 74;
    var pad = 10;
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = Math.max(1, max - min);
    var points = values.map(function (value, index) {
      var x = pad + (index * (w - pad * 2)) / (values.length - 1);
      var y = h - pad - ((value - min) / span) * (h - pad * 2);
      return [x, y];
    });
    var path = points.map(function (point, index) {
      return (index ? 'L' : 'M') + point[0].toFixed(1) + ' ' + point[1].toFixed(1);
    }).join(' ');
    var last = points[points.length - 1];
    host.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="最近 ' + values.length + ' 个交易日的温度走势">' +
      '<path d="' + path + '" style="fill:none;stroke:var(--brand);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"></path>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4" style="fill:var(--brand)"></circle>' +
      '</svg>';
  }

  /* ------------------------------------------------------ market temperature */

  var temp = window.FINVERSE_TEMPERATURE;

  if (temp && el('tempScore')) {
    if (temp.sample && el('sampleFlag')) el('sampleFlag').hidden = false;

    if (el('tempScore')) el('tempScore').textContent = String(temp.score);
    if (el('tempState')) el('tempState').textContent = temp.label;
    if (el('tempCommentary')) el('tempCommentary').textContent = temp.commentary;
    if (el('tempUpdated')) el('tempUpdated').textContent = temp.updated;
    if (el('tempMarket')) el('tempMarket').textContent = temp.market;

    // Never let a stale file masquerade as "today's" reading: show the data
    // date in the title area and a prominent notice once it is older than 2 days.
    if (el('tempDate')) el('tempDate').textContent = String(temp.updated || '—');
    var updatedAt = Date.parse(String(temp.updated || '').replace(' ', 'T'));
    if (updatedAt && el('dataStale')) {
      var ageDays = Math.floor((Date.now() - updatedAt) / 86400000);
      if (ageDays > 2) {
        el('dataStale').innerHTML =
          '<strong>数据未更新：</strong>本页数据截至 ' + esc(temp.updated) +
          '，已过去 ' + ageDays + ' 天。请勿当作当日行情，仅供研究参考。';
        el('dataStale').hidden = false;
      }
    }

    var arc = el('gaugeArc');
    if (arc) {
      var radius = 54;
      var circumference = 2 * Math.PI * radius;
      var value = Math.max(0, Math.min(100, Number(temp.score) || 0));
      arc.style.strokeDasharray = circumference.toFixed(1) + ' ' + circumference.toFixed(1);
      arc.style.strokeDashoffset = (circumference * (1 - value / 100)).toFixed(1);
    }

    var kpis = el('tempKpis');
    if (kpis && temp.kpis) {
      kpis.innerHTML = temp.kpis.map(function (kpi) {
        return '<div class="kpi"><span class="kpi-k">' + esc(kpi.label) + '</span>' +
          '<span class="kpi-v ' + esc(kpi.tone || '') + '">' + esc(kpi.value) + '</span></div>';
      }).join('');
    }

    var indices = el('tempIndices');
    if (indices && temp.indices) {
      indices.innerHTML = temp.indices.map(function (item) {
        return '<div class="idx"><span class="idx-name">' + esc(item.name) + '</span>' +
          '<span class="idx-row"><span class="idx-value">' + esc(item.value) + '</span>' +
          '<span class="idx-chg ' + (item.change >= 0 ? 'up' : 'down') + '">' + fmtPct(item.change) + '</span></span></div>';
      }).join('');
    }

    var dims = el('tempDims');
    if (dims && temp.dims) {
      dims.innerHTML = temp.dims.map(function (dim) {
        var score = Math.max(0, Math.min(100, Number(dim.score) || 0));
        return '<div class="dim"><div class="dim-head"><span>' + esc(dim.name) + '</span><b>' + score + '</b></div>' +
          '<div class="dim-bar"><i style="width:' + score + '%"></i></div>' +
          '<p>' + esc(dim.note) + '</p></div>';
      }).join('');
    }

    var sectors = el('sectorBody');
    if (sectors && temp.sectors) {
      sectors.innerHTML = temp.sectors.map(function (row) {
        return '<tr><td>' + esc(row.name) + '</td>' +
          '<td class="num ' + (row.change >= 0 ? 'up' : 'down') + '">' + fmtPct(row.change) + '</td>' +
          '<td>' + esc(row.note) + '</td></tr>';
      }).join('');
    }

    drawSpark(el('tempSpark'), temp.history);
  }

  /* ------------------------------------------------------------ weekly picks */

  var picks = window.FINVERSE_PICKS;

  if (picks && el('picksWeek')) el('picksWeek').textContent = picks.weekLabel || '';
  if (picks && el('picksUpdated')) el('picksUpdated').textContent = picks.updated || '';

  if (picks && el('picksList')) {
    if (picks.sample && el('sampleFlag')) el('sampleFlag').hidden = false;

    el('picksList').innerHTML = (picks.picks || []).map(function (pick) {
      var tags = (pick.tags || []).map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('');
      return '<article class="pick panel">' +
        '<div class="pick-head"><span class="pick-code">' + esc(pick.code) + '</span>' +
        '<span class="pick-market">' + esc(pick.market) + '</span></div>' +
        '<h3>' + esc(pick.name) + '</h3>' +
        '<p class="pick-thesis">' + esc(pick.thesis) + '</p>' +
        '<dl class="pick-meta">' +
        '<div><dt>形态</dt><dd>' + esc(pick.pattern) + '</dd></div>' +
        '<div><dt>参考区间</dt><dd>' + esc(pick.entry) + '</dd></div>' +
        '<div><dt>失效条件</dt><dd>' + esc(pick.invalid) + '</dd></div>' +
        '</dl>' +
        '<p class="pick-tags">' + tags + '</p>' +
        '</article>';
    }).join('');

    var reviewBody = el('reviewBody');
    if (reviewBody && picks.review) {
      reviewBody.innerHTML = (picks.review || []).map(function (row) {
        var cls = row.change >= 0 ? 'up' : 'down';
        var verdict = row.verdict === '已失效' ? 'bad' : (row.change >= 0 ? 'ok' : '');
        return '<tr><td>' + esc(row.code) + ' ' + esc(row.name) + '<span class="note">' + esc(row.market) + '</span></td>' +
          '<td>' + esc(row.entry) + '</td>' +
          '<td class="num">' + esc(row.close) + '</td>' +
          '<td class="num ' + cls + '">' + fmtPct(row.change) + '</td>' +
          '<td><span class="verdict ' + verdict + '">' + esc(row.verdict) + '</span><span class="note">' + esc(row.note) + '</span></td></tr>';
      }).join('');
    }

  }

  // Methodology list can render without any stock-level data (weekly-picks page).
  var method = el('methodList');
  if (method && picks && picks.method) {
    method.innerHTML = picks.method.map(function (item) {
      return '<div class="dim"><div class="dim-head"><span>' + esc(item.name) + '</span></div>' +
        '<p>' + esc(item.note) + '</p></div>';
    }).join('');
  }
})();
