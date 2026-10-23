/* Finverse — 轻量首方埋点
 *
 * 把浏览、滚动、表单与点击事件 POST 到同目录的 track.php，落盘在站点根目录之外。
 * 不写 Cookie、不引入第三方脚本；DNT=1 时完全不发送，统计脚本出错也不影响页面。
 */
(function () {
  'use strict';

  if (location.protocol === 'file:') return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  if (/bot|crawler|spider|slurp|headless/i.test(navigator.userAgent || '')) return;

  var SID_KEY = 'finverse-sid';
  var sid = '';
  try {
    sid = sessionStorage.getItem(SID_KEY) || '';
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem(SID_KEY, sid);
    }
  } catch (e) { sid = ''; }

  function send(event, value) {
    var body;
    try {
      body = JSON.stringify({
        e: event,
        v: value || 0,
        p: location.pathname + location.search,
        r: document.referrer || '',
        w: window.innerWidth || 0,
        h: window.innerHeight || 0,
        l: (document.documentElement.getAttribute('lang') || 'zh').slice(0, 2),
        s: sid
      });
    } catch (e) { return; }

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('track.php', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch('track.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      });
    } catch (e) { /* 统计失败不影响页面 */ }
  }

  window.FvTrack = send;
  send('pageview');

  /* 滚动深度：25 / 50 / 75 / 100 */
  var marks = [25, 50, 75, 100];
  var hit = {};
  var ticking = false;

  function onScroll() {
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var depth = Math.round(Math.min(100, Math.max(0, (window.scrollY / max) * 100)));
    for (var i = 0; i < marks.length; i++) {
      if (depth >= marks[i] && !hit[marks[i]]) {
        hit[marks[i]] = true;
        send('scroll', marks[i]);
      }
    }
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    var run = function () { ticking = false; onScroll(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else setTimeout(run, 120);
  }, { passive: true });

  /* 带 data-track 的链接与按钮 */
  Array.prototype.forEach.call(document.querySelectorAll('[data-track]'), function (node) {
    node.addEventListener('click', function () { send('click', node.getAttribute('data-track')); });
  });

  /* 停留时长（页面隐藏或离开时各发一次） */
  var started = Date.now();
  var sent = false;

  function leave() {
    if (sent) return;
    sent = true;
    send('dwell', Math.round((Date.now() - started) / 1000));
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') leave();
  });
  window.addEventListener('pagehide', leave);
})();
