/* Imad Qureshi — portfolio site behaviour
   1. mobile menu   2. scroll reveal   3. chart hover layer (crosshair + tooltips) */
(function () {
  'use strict';

  /* 1. mobile menu */
  var menu = document.getElementById('menu');
  var links = document.getElementById('links');
  if (menu && links) {
    menu.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* 2. scroll reveal */
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

  /* helpers */
  function fmtK(v) { return v >= 1000 ? '$' + (v / 1000).toFixed(2) + 'M' : '$' + v + 'K'; }
  function row(color, label, value) {
    var r = document.createElement('div'); r.className = 'row';
    var l = document.createElement('span');
    var i = document.createElement('i'); i.style.background = color;
    l.appendChild(i); l.appendChild(document.createTextNode(' ' + label));
    var b = document.createElement('b'); b.textContent = value;
    r.appendChild(l); r.appendChild(b);
    return r;
  }

  /* 3a. line chart crosshair + tooltip */
  var svg = document.getElementById('line');
  var tip = document.getElementById('tip');
  if (svg && tip) {
    var months = svg.dataset.months.split(',');
    var actual = svg.dataset.actual.split(',').map(Number);
    var forecast = svg.dataset.forecast.split(',').map(Number);
    var x0 = +svg.dataset.x0, x1 = +svg.dataset.x1;
    var xhair = document.getElementById('xhair');
    var dotA = document.getElementById('dotA');
    var dotF = document.getElementById('dotF');
    var yOf = function (v) { return 232 - v * 0.13; };
    var xOf = function (i) { return x0 + i * (x1 - x0) / (months.length - 1); };
    var hit = svg.querySelector('.hit');
    var panel = svg.parentElement;

    function show(i, clientX) {
      var vx = xOf(i);
      xhair.setAttribute('x1', vx); xhair.setAttribute('x2', vx); xhair.style.opacity = 1;
      dotA.setAttribute('cx', vx); dotA.setAttribute('cy', yOf(actual[i]));
      dotF.setAttribute('cx', vx); dotF.setAttribute('cy', yOf(forecast[i])); dotF.style.opacity = 1;
      while (tip.firstChild) tip.removeChild(tip.firstChild);
      var h = document.createElement('b'); h.textContent = months[i]; tip.appendChild(h);
      tip.appendChild(row('#17a672', 'Actual', fmtK(actual[i])));
      tip.appendChild(row('#d9722f', 'Forecast', fmtK(forecast[i])));
      var d = (actual[i] - forecast[i]) / forecast[i] * 100;
      var e = document.createElement('div'); e.className = 'row';
      e.textContent = 'vs forecast ' + (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1) + '%';
      tip.appendChild(e);
      var pr = panel.getBoundingClientRect();
      var sr = svg.getBoundingClientRect();
      var px = sr.left + (vx / 780) * sr.width - pr.left;
      var py = sr.top + (yOf(Math.max(actual[i], forecast[i])) / 272) * sr.height - pr.top;
      tip.style.left = px + 'px'; tip.style.top = (py - 8) + 'px'; tip.style.opacity = 1;
    }
    function hide() {
      xhair.style.opacity = 0; tip.style.opacity = 0; dotF.style.opacity = 0;
      dotA.setAttribute('cx', xOf(months.length - 1)); dotA.setAttribute('cy', yOf(actual[months.length - 1]));
    }
    hit.addEventListener('pointermove', function (ev) {
      var sr = svg.getBoundingClientRect();
      var vx = (ev.clientX - sr.left) / sr.width * 780;
      var i = Math.round((vx - x0) / ((x1 - x0) / (months.length - 1)));
      i = Math.max(0, Math.min(months.length - 1, i));
      show(i, ev.clientX);
    });
    hit.addEventListener('pointerleave', hide);
    /* keyboard: arrow keys walk the months */
    hit.setAttribute('tabindex', '0');
    var ki = months.length - 1;
    hit.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') { ki = Math.max(0, ki - 1); show(ki); ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { ki = Math.min(months.length - 1, ki + 1); show(ki); ev.preventDefault(); }
      if (ev.key === 'Escape') hide();
    });
    hit.addEventListener('focus', function () { show(ki); });
    hit.addEventListener('blur', hide);
  }

  /* 3b. bar tooltips */
  var bars = document.getElementById('bars');
  var tip2 = document.getElementById('tip2');
  if (bars && tip2) {
    var panel2 = bars.parentElement;
    bars.querySelectorAll('.bar').forEach(function (bar) {
      bar.setAttribute('tabindex', '0');
      function on(ev) {
        while (tip2.firstChild) tip2.removeChild(tip2.firstChild);
        var h = document.createElement('b'); h.textContent = bar.dataset.label; tip2.appendChild(h);
        var v = document.createElement('div'); v.textContent = bar.dataset.value; tip2.appendChild(v);
        var br = bar.getBoundingClientRect(), pr = panel2.getBoundingClientRect();
        tip2.style.left = (br.left + br.width / 2 - pr.left) + 'px';
        tip2.style.top = (br.top - pr.top - 6) + 'px';
        tip2.style.opacity = 1;
      }
      function off() { tip2.style.opacity = 0; }
      bar.addEventListener('pointerenter', on);
      bar.addEventListener('pointerleave', off);
      bar.addEventListener('focus', on);
      bar.addEventListener('blur', off);
    });
  }
})();
