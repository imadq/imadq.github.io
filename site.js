/* Imad Qureshi — portfolio site behaviour: theme toggle, mobile menu, scroll reveal.
   The interactive dashboard lives in dashboard.js. */
(function () {
  'use strict';

  /* 1. theme: system preference by default, toggle remembered per browser */
  var rootEl = document.documentElement;
  var toggle = document.getElementById('theme');
  function stored() { try { return localStorage.getItem('theme'); } catch (e) { return null; } }
  function current() {
    var s = rootEl.getAttribute('data-theme');
    if (s) return s;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function apply(t) {
    rootEl.setAttribute('data-theme', t);
    if (toggle) toggle.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  var saved = stored();
  if (saved === 'dark' || saved === 'light') apply(saved);
  else if (toggle) toggle.setAttribute('aria-label', current() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  if (toggle) toggle.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode: theme still applies for this page view */ }
  });

  /* 2. mobile menu */
  var menu = document.getElementById('menu');
  var links = document.getElementById('links');
  if (menu && links) {
    menu.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    function closeMenu() { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
    links.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* 3. scroll reveal */
  var reveal = document.querySelectorAll('.rv:not(.in)');
  if ('IntersectionObserver' in window && reveal.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach(function (el) { io.observe(el); });
  } else {
    reveal.forEach(function (el) { el.classList.add('in'); });
  }
})();
