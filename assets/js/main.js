/* ==========================================================================
   Finverse — page behaviour
   Theme + language switching, scroll reveals, counters, nav state, trial modal.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var STORE_THEME = 'finverse-theme';
  var STORE_LANG = 'finverse-lang';

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------ theme */

  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function setTheme(next, persist) {
    root.setAttribute('data-theme', next);
    if (themeMeta) themeMeta.setAttribute('content', next === 'light' ? '#faf7f2' : '#0c0b0a');
    if (window.FinverseScene) window.FinverseScene.setTheme(next);
    if (persist) store(STORE_THEME, next);
  }

  setTheme(read(STORE_THEME) || 'dark', false);

  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      setTheme(next, true);
    });
  }

  /* --------------------------------------------------------------- language */

  var langButtons = Array.prototype.slice.call(document.querySelectorAll('.lang [data-lang]'));
  var langWrap = document.querySelector('.lang');
  var thumb = langWrap ? langWrap.querySelector('.lang-thumb') : null;

  function positionThumb() {
    if (!thumb || !langButtons.length) return;
    var active = langWrap.querySelector('[data-lang].is-active') || langButtons[0];
    thumb.style.width = active.offsetWidth + 'px';
    thumb.style.transform = 'translateX(' + (active.offsetLeft - 3) + 'px)';
  }

  function applyLang(lang) {
    var dict = (window.FinverseI18N || {})[lang] || {};
    window.FinverseLang = lang;
    root.setAttribute('lang', lang === 'en' ? 'en' : 'zh-Hans');

    var i, el;
    var textNodes = document.querySelectorAll('[data-i18n]');
    for (i = 0; i < textNodes.length; i++) {
      el = textNodes[i];
      var tk = el.getAttribute('data-i18n');
      if (dict[tk] != null) el.textContent = dict[tk];
    }
    var htmlNodes = document.querySelectorAll('[data-i18n-html]');
    for (i = 0; i < htmlNodes.length; i++) {
      el = htmlNodes[i];
      var hk = el.getAttribute('data-i18n-html');
      if (dict[hk] != null) el.innerHTML = dict[hk];
    }
    var ariaNodes = document.querySelectorAll('[data-i18n-aria]');
    for (i = 0; i < ariaNodes.length; i++) {
      el = ariaNodes[i];
      if (dict[el.getAttribute('data-i18n-aria')] != null) {
        el.setAttribute('aria-label', dict[el.getAttribute('data-i18n-aria')]);
      }
    }

    langButtons.forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    positionThumb();

    if (window.FinverseMockups) window.FinverseMockups.render();
    fitWordmark();
    if (window.FinverseScene) window.FinverseScene.refresh();
  }

  langButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-lang');
      applyLang(lang);
      store(STORE_LANG, lang);
    });
  });

  window.FinverseI18N_APPLY = applyLang;

  /* -------------------------------------------------------------- nav + menu */

  var nav = document.getElementById('nav');
  var menuBtn = document.getElementById('menuBtn');
  var mobilePanel = document.getElementById('mobilePanel');

  function onScrollNav() {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  function closeMenu() {
    if (!mobilePanel || !menuBtn) return;
    mobilePanel.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  if (menuBtn && mobilePanel) {
    menuBtn.addEventListener('click', function () {
      var open = mobilePanel.hidden;
      mobilePanel.hidden = !open;
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobilePanel.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) closeMenu();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) closeMenu();
    });
  }

  /* ------------------------------------------------------------ active link */

  var navTargets = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'))
    .map(function (a) { return { link: a, el: document.querySelector(a.getAttribute('href')) }; })
    .filter(function (x) { return x.el; });

  // The section whose centre sits nearest the viewport centre owns the highlight.
  function updateActiveLink() {
    if (!navTargets.length) return;
    var mid = window.scrollY + window.innerHeight / 2;
    var best = null, bestDist = Infinity;
    navTargets.forEach(function (x) {
      var r = x.el.getBoundingClientRect();
      var centre = r.top + window.scrollY + r.height / 2;
      var dist = Math.abs(centre - mid);
      if (dist < bestDist) { bestDist = dist; best = x; }
    });
    navTargets.forEach(function (x) { x.link.classList.toggle('is-current', x === best); });
  }

  var activeTick = false;
  window.addEventListener('scroll', function () {
    if (activeTick) return;
    activeTick = true;
    requestAnimationFrame(function () { activeTick = false; updateActiveLink(); });
  }, { passive: true });
  updateActiveLink();

  /* -------------------------------------------------------------- reveals */

  var riseNodes = Array.prototype.slice.call(document.querySelectorAll('.rise'));
  if ('IntersectionObserver' in window) {
    var riseObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          riseObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    riseNodes.forEach(function (el) { riseObserver.observe(el); });
  } else {
    riseNodes.forEach(function (el) { el.classList.add('in'); });
  }

  /* -------------------------------------------------------------- counters */

  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (isNaN(target)) return;
    var start = performance.now();
    var dur = 1400;
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = target * eased;
      el.textContent = (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US')) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var countNodes = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if ('IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    countNodes.forEach(function (el) { countObserver.observe(el); });
  } else {
    countNodes.forEach(function (el) {
      el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
    });
  }

  /* --------------------------------------------------------------- marquee */

  var track = document.querySelector('[data-marquee]');
  if (track) {
    var group = track.querySelector('.marquee-group');
    if (group) {
      var clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(clone.querySelectorAll('li'), function (li) {
        li.removeAttribute('aria-label');
      });
      Array.prototype.forEach.call(clone.querySelectorAll('a'), function (a) {
        a.setAttribute('tabindex', '-1');
      });
      track.appendChild(clone);
    }
  }

  /* ----------------------------------------------------------------- modal */

  var modal = document.getElementById('trialModal');
  var formWrap = document.getElementById('trialForm');
  var doneWrap = document.getElementById('trialDone');
  var form = document.getElementById('trialFormEl');
  var errorEl = document.getElementById('trialError');
  var failEl = document.getElementById('trialFail');
  var lastFocus = null;

  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (formWrap) formWrap.hidden = false;
    if (doneWrap) doneWrap.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (failEl) failEl.hidden = true;
    if (window.FvTrack) window.FvTrack('form_open');
    // Autofocus is desktop-only; on touch devices it would pop the keyboard over the form.
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var first = form ? form.querySelector('input') : null;
      if (first) setTimeout(function () { first.focus(); }, 60);
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-open-trial]'), function (btn) {
    btn.addEventListener('click', openModal);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-close-trial]'), function (btn) {
    btn.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  // Deep link: index.html#trial opens the trial modal (used by the content pages).
  if (modal && (location.hash === '#trial' || /[?&]trial=1/.test(location.search))) openModal();

  // Show the WeChat blocks up front; hide them only when the QR image fails.
  // (They must be visible for lazy loading to fetch the image at all.)
  Array.prototype.forEach.call(document.querySelectorAll('[data-wechat]'), function (block) {
    var qr = block.querySelector('img');
    block.hidden = false;
    if (!qr) return;
    qr.addEventListener('error', function () { block.hidden = true; });
    if (qr.complete && qr.naturalWidth === 0) block.hidden = true;
  });

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function validPhone(v) { return /^[0-9+\-()\s]{6,20}$/.test(v); }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.elements['name'] ? form.elements['name'].value : '').trim();
      var phone = (form.phone.value || '').trim();
      var email = (form.email.value || '').trim();
      var ok = name !== '' && ((phone && validPhone(phone)) || (email && validEmail(email)));
      var consent = form.elements['consent'];
      var crossBorder = form.elements['cross_border'];
      var consentOk = !!(consent && consent.checked && crossBorder && crossBorder.checked);
      var consentLabels = Array.prototype.slice.call(form.querySelectorAll('.consent'));
      consentLabels.forEach(function (label) {
        label.classList.toggle('is-error', !consentOk);
      });
      if (!ok || !consentOk) {
        if (errorEl) errorEl.hidden = false;
        return;
      }
      if (errorEl) errorEl.hidden = true;
      if (failEl) failEl.hidden = true;
      if (consentLabels.length) consentLabels.forEach(function (label) { label.classList.remove('is-error'); });
      if (window.FvTrack) window.FvTrack('form_submit');

      // Post to submit.php, which emails the request to the team. The URL is
      // relative so the same file works from any host the site is served.
      var els = form.elements;
      var btn = form.querySelector('button[type="submit"]');
      var dict = (window.FinverseI18N || {})[window.FinverseLang || 'zh'] || {};
      var payload = {
        name: (els['name'] ? els['name'].value : '').trim(),
        company: (els['company'] ? els['company'].value : '').trim(),
        phone: phone,
        email: email,
        website: els['website'] ? els['website'].value : '',
        lang: window.FinverseLang || 'zh',
        consent: true,
        cross_border: true
      };

      if (btn) {
        btn.disabled = true;
        btn.textContent = dict['form.sending'] || '提交中…';
      }

      fetch('submit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().catch(function () { return { ok: false }; });
      }).then(function (data) {
        if (!data || data.ok !== true) throw new Error('rejected');
        form.reset();
        if (formWrap) formWrap.hidden = true;
        if (doneWrap) doneWrap.hidden = false;
        if (window.FvTrack) window.FvTrack('form_ok');
      }).catch(function () {
        if (failEl) failEl.hidden = false;
        if (window.FvTrack) window.FvTrack('form_fail');
      }).then(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = dict['form.submit'] || '提交申请';
        }
      });
    });
  }

  /* ------------------------------------------------------------ boot state */

  /* ------------------------------------------------------- footer wordmark */

  // Measure the mark at a reference size, then scale it to span the page.
  var wordmark = document.querySelector('.wordmark span');

  function fitWordmark() {
    if (!wordmark) return;
    var box = wordmark.parentElement;
    var avail = box.clientWidth - 28;
    if (avail <= 0) return;
    wordmark.style.fontSize = '100px';
    var measured = wordmark.scrollWidth;
    if (!measured) { wordmark.style.fontSize = ''; return; }
    var size = Math.max(30, Math.min(420, (avail / measured) * 100));
    wordmark.style.fontSize = size.toFixed(1) + 'px';
  }


  applyLang(read(STORE_LANG) || 'zh');
  fitWordmark();
  positionThumb();

  window.addEventListener('load', fitWordmark);
  setTimeout(fitWordmark, 600);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      positionThumb();
      fitWordmark();
    });
  }
  window.addEventListener('resize', function () {
    positionThumb();
    fitWordmark();
    updateActiveLink();
  });
})();
