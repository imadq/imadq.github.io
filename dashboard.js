/* Interactive e-commerce dashboard. All data is synthetic, generated deterministically in the browser
   so the page has no data dependency; the page labels it "Sample data". */
(function () {
  'use strict';
  var root = document.getElementById('dash');
  if (!root) return;

  /* ---------- synthetic dataset ---------- */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var CH = [
    { name: 'Marketplaces',   base: 9800,  aov: 82,  conv: 0.034, ret: 0.06, wk: [1, 1, 1, 1, 1, 1.06, 1.08],       cat: [0.30, 0.22, 0.18, 0.12, 0.10, 0.08] },
    { name: 'Web store',      base: 8200,  aov: 96,  conv: 0.041, ret: 0.04, wk: [1, 1, 1, 1, 1, 1.05, 1.06],       cat: [0.28, 0.25, 0.15, 0.12, 0.12, 0.08] },
    { name: 'Retail partners', base: 6300, aov: 74,  conv: 0.029, ret: 0.07, wk: [1, 1, 1, 1, 1.03, 1.12, 1.10],    cat: [0.34, 0.18, 0.20, 0.10, 0.10, 0.08] },
    { name: 'Wholesale',      base: 5100,  aov: 168, conv: 0.052, ret: 0.02, wk: [1.08, 1.1, 1.1, 1.08, 1.0, 0.45, 0.35], cat: [0.40, 0.25, 0.15, 0.10, 0.05, 0.05] }
  ];
  var CATS = ['Apparel', 'Home & Kitchen', 'Electronics', 'Outdoors', 'Beauty', 'Toys'];
  var END = Date.UTC(2026, 7, 31);
  var DAYS = 730;
  var MS = 86400000;

  function season(doy) {
    var g = function (c, w, a) { var x = Math.min(Math.abs(doy - c), 365 - Math.abs(doy - c)); return a * Math.exp(-(x * x) / (2 * w * w)); };
    return 1 + g(335, 22, 0.55) + g(185, 30, 0.08) - g(15, 18, 0.14) + g(90, 20, 0.05);
  }
  var days = [];
  (function build() {
    var r = rng(20260831);
    /* a forecast misses by a little every month (demand shifts it cannot see), plus small daily noise */
    var rb = rng(7), bias = {};
    for (var d = 0; d < DAYS; d++) {
      var ts = END - (DAYS - 1 - d) * MS;
      var dt = new Date(ts);
      var doy = Math.floor((ts - Date.UTC(dt.getUTCFullYear(), 0, 0)) / MS);
      var trend = 1 + 0.085 * (d / 365); /* arbitrary demo growth, not a real figure */
      var row = { t: ts, ch: [] };
      var mkey = dt.getUTCFullYear() * 12 + dt.getUTCMonth();
      if (!bias[mkey]) bias[mkey] = CH.map(function () { return 1 + (rb() - 0.5) * 0.09; });
      for (var c = 0; c < CH.length; c++) {
        var k = CH[c];
        var base = k.base * season(doy) * trend * k.wk[dt.getUTCDay()];
        var rev = base * (1 + (r() - 0.5) * 0.16);
        var fc = base * bias[mkey][c] * (1 + (r() - 0.5) * 0.06);
        var orders = Math.max(1, Math.round(rev / k.aov * (1 + (r() - 0.5) * 0.1)));
        var sessions = Math.round(orders / (k.conv * (1 + 0.06 * (d / 365))) * (1 + (r() - 0.5) * 0.1));
        var returns = Math.round(orders * k.ret * (1 + (r() - 0.5) * 0.3));
        var cat = [];
        for (var i = 0; i < CATS.length; i++) cat.push(rev * k.cat[i] * (1 + (r() - 0.5) * 0.2));
        row.ch.push({ rev: rev, fc: fc, orders: orders, sessions: sessions, returns: returns, cat: cat });
      }
      days.push(row);
    }
  })();

  /* ---------- state ---------- */
  var state = { range: '12m', channel: 'all', sort: { key: 'rev', dir: -1 } };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function rangeDays() { return state.range === '30d' ? 30 : state.range === '90d' ? 91 : 365; }
  function slice(offset) { var n = rangeDays(); var end = days.length - offset; return days.slice(end - n, end); }
  function chIdx() { return state.channel === 'all' ? null : CH.findIndex(function (c) { return c.name === state.channel; }); }
  function sumRow(row, ci) {
    var out = { rev: 0, fc: 0, orders: 0, sessions: 0, returns: 0, cat: CATS.map(function () { return 0; }) };
    row.ch.forEach(function (x, i) {
      if (ci !== null && i !== ci) return;
      out.rev += x.rev; out.fc += x.fc; out.orders += x.orders; out.sessions += x.sessions; out.returns += x.returns;
      x.cat.forEach(function (v, j) { out.cat[j] += v; });
    });
    return out;
  }
  function totals(rows, ci) {
    var t = { rev: 0, fc: 0, orders: 0, sessions: 0, returns: 0 };
    rows.forEach(function (row) { var s = sumRow(row, ci); t.rev += s.rev; t.fc += s.fc; t.orders += s.orders; t.sessions += s.sessions; t.returns += s.returns; });
    return t;
  }
  function buckets(rows, ci) {
    var out = [], key = null, cur = null;
    rows.forEach(function (row, i) {
      var dt = new Date(row.t), k, label;
      if (state.range === '30d') { k = i; label = MONTHS[dt.getUTCMonth()] + ' ' + dt.getUTCDate(); }
      else if (state.range === '90d') { k = Math.floor(i / 7); label = MONTHS[dt.getUTCMonth()] + ' ' + dt.getUTCDate(); }
      else { k = dt.getUTCFullYear() * 12 + dt.getUTCMonth(); label = MONTHS[dt.getUTCMonth()]; }
      if (k !== key) { key = k; cur = { label: label, rev: 0, fc: 0, n: 0 }; out.push(cur); }
      var s = sumRow(row, ci); cur.rev += s.rev; cur.fc += s.fc; cur.n++;
    });
    return out;
  }

  /* ---------- formatting ---------- */
  function money(v) { return v >= 1e6 ? '$' + (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : '$' + Math.round(v); }
  function count(v) { return v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e4 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v).toLocaleString('en-US'); }
  function pct(v, d) { return (v * 100).toFixed(d === undefined ? 1 : d) + '%'; }
  function signed(v, unit) { var s = v >= 0 ? '+' : '−'; return s + Math.abs(v).toFixed(1) + (unit || '%'); }
  function nice(max) { var p = Math.pow(10, Math.floor(Math.log10(max))); var f = max / p; var step = f <= 1 ? 0.2 : f <= 2 ? 0.5 : f <= 5 ? 1 : 2; step *= p; return { step: step, top: Math.ceil(max / step) * step }; }

  /* ---------- DOM helpers ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, s, cls, anchor) { var t = svgEl('text', { x: x, y: y }, parent); if (cls) t.setAttribute('class', cls); if (anchor) t.setAttribute('text-anchor', anchor); t.textContent = s; return t; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function $(id) { return document.getElementById(id); }

  /* ---------- render ---------- */
  var COLORS = { actual: '#17a672', forecast: '#d9722f' };

  function renderTiles() {
    var ci = chIdx();
    var cur = totals(slice(0), ci), prev = totals(slice(rangeDays()), ci);
    var b = buckets(slice(0), ci);
    var mape = b.reduce(function (a, x) { return a + Math.abs(x.rev - x.fc) / x.rev; }, 0) / b.length;
    var conv = cur.orders / cur.sessions, pconv = prev.orders / prev.sessions;
    var periodLabel = state.range === '30d' ? 'prior 30 days' : state.range === '90d' ? 'prior 13 weeks' : 'prior 12 months';
    setTile('t-rev', money(cur.rev), (cur.rev / prev.rev - 1) * 100, periodLabel);
    setTile('t-ord', count(cur.orders), (cur.orders / prev.orders - 1) * 100, periodLabel);
    setTile('t-conv', pct(conv), (conv - pconv) * 100, periodLabel, ' pts');
    var acc = $('t-acc'); acc.querySelector('.value').textContent = pct(1 - mape);
    acc.querySelector('.delta').textContent = 'MAPE ' + pct(mape) + ' across ' + b.length + (state.range === '30d' ? ' daily' : state.range === '90d' ? ' weekly' : ' monthly') + ' forecasts';
  }
  function setTile(id, value, delta, label, unit) {
    var t = $(id); t.querySelector('.value').textContent = value;
    var d = t.querySelector('.delta'); clear(d);
    var b = document.createElement('b'); b.className = delta >= 0 ? 'up' : 'down';
    var arrow = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }); svgEl('path', { d: delta >= 0 ? 'M12 19V5m0 0-6 6m6-6 6 6' : 'M12 5v14m0 0-6-6m6 6 6-6' }, arrow);
    b.appendChild(arrow); b.appendChild(document.createTextNode(signed(delta, unit)));
    d.appendChild(b); d.appendChild(document.createTextNode(' vs ' + label));
  }

  var line = { W: 780, H: 272, L: 52, R: 704, T: 24, B: 232 };
  function renderLine() {
    var ci = chIdx();
    var b = buckets(slice(0), ci);
    var svg = $('line'); clear(svg);
    var max = Math.max.apply(null, b.map(function (x) { return Math.max(x.rev, x.fc); }));
    var sc = nice(max * 1.05);
    var yOf = function (v) { return line.B - (v / sc.top) * (line.B - line.T); };
    var xOf = function (i) { return b.length === 1 ? line.L : line.L + i * (line.R - line.L) / (b.length - 1); };
    for (var v = 0; v <= sc.top + 1e-9; v += sc.step) {
      var y = yOf(v);
      svgEl('line', { x1: line.L, x2: line.R, y1: y, y2: y, 'class': v === 0 ? 'axis' : 'grid' }, svg);
      txt(svg, line.L - 8, y + 4, v === 0 ? '0' : money(v), null, 'end');
    }
    var every = Math.ceil(b.length / 12);
    b.forEach(function (x, i) { if (i % every === 0 || i === b.length - 1) txt(svg, xOf(i), line.B + 24, x.label, null, 'middle'); });
    var pts = function (key) { return b.map(function (x, i) { return xOf(i) + ',' + yOf(x[key]); }).join(' '); };
    svgEl('path', { d: 'M' + pts('rev').replace(/ /g, ' L') + ' L' + xOf(b.length - 1) + ',' + line.B + ' L' + line.L + ',' + line.B + ' Z', fill: COLORS.actual, opacity: '0.12' }, svg);
    svgEl('polyline', { points: pts('fc'), fill: 'none', stroke: COLORS.forecast, 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    svgEl('polyline', { points: pts('rev'), fill: 'none', stroke: COLORS.actual, 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    var xhair = svgEl('line', { 'class': 'xhair', x1: line.L, x2: line.L, y1: line.T, y2: line.B }, svg);
    var last = b.length - 1;
    var dotF = svgEl('circle', { cx: xOf(last), cy: yOf(b[last].fc), r: '4.5', fill: COLORS.forecast, stroke: '#232730', 'stroke-width': '2', opacity: '0' }, svg);
    var dotA = svgEl('circle', { cx: xOf(last), cy: yOf(b[last].rev), r: '4.5', fill: COLORS.actual, stroke: '#232730', 'stroke-width': '2' }, svg);
    txt(svg, line.R + 10, yOf(b[last].rev) + 4, money(b[last].rev), 'lbl').setAttribute('font-weight', '500');
    var hit = svgEl('rect', { 'class': 'hit', x: line.L, y: line.T, width: line.R - line.L, height: line.B - line.T, tabindex: '0', 'aria-label': 'Revenue chart. Use left and right arrow keys to read values.' }, svg);

    var tip = $('tip'), panel = svg.closest('.panel');
    function show(i) {
      var vx = xOf(i);
      xhair.setAttribute('x1', vx); xhair.setAttribute('x2', vx); xhair.style.opacity = 1;
      dotA.setAttribute('cx', vx); dotA.setAttribute('cy', yOf(b[i].rev));
      dotF.setAttribute('cx', vx); dotF.setAttribute('cy', yOf(b[i].fc)); dotF.style.opacity = 1;
      clear(tip);
      var h = document.createElement('b'); h.textContent = b[i].label; tip.appendChild(h);
      tip.appendChild(row(COLORS.actual, 'Actual', money(b[i].rev)));
      tip.appendChild(row(COLORS.forecast, 'Forecast', money(b[i].fc)));
      var e = document.createElement('div'); e.className = 'row'; e.textContent = 'vs forecast ' + signed((b[i].rev / b[i].fc - 1) * 100); tip.appendChild(e);
      var pr = panel.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      tip.style.left = (sr.left + (vx / line.W) * sr.width - pr.left) + 'px';
      tip.style.top = (sr.top + (yOf(Math.max(b[i].rev, b[i].fc)) / line.H) * sr.height - pr.top - 8) + 'px';
      tip.style.opacity = 1;
    }
    function hide() { xhair.style.opacity = 0; tip.style.opacity = 0; dotF.style.opacity = 0; dotA.setAttribute('cx', xOf(last)); dotA.setAttribute('cy', yOf(b[last].rev)); }
    var ki = last;
    hit.addEventListener('pointermove', function (ev) {
      var sr = svg.getBoundingClientRect();
      var vx = (ev.clientX - sr.left) / sr.width * line.W;
      var i = Math.round((vx - line.L) / ((line.R - line.L) / Math.max(1, b.length - 1)));
      ki = Math.max(0, Math.min(last, i)); show(ki);
    });
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') { ki = Math.max(0, ki - 1); show(ki); ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { ki = Math.min(last, ki + 1); show(ki); ev.preventDefault(); }
      if (ev.key === 'Escape') hide();
    });
    hit.addEventListener('focus', function () { show(ki); });
    hit.addEventListener('blur', hide);
  }
  function row(color, label, value) {
    var r = document.createElement('div'); r.className = 'row';
    var l = document.createElement('span'); var i = document.createElement('i'); i.style.background = color;
    l.appendChild(i); l.appendChild(document.createTextNode(' ' + label));
    var b = document.createElement('b'); b.textContent = value; r.appendChild(l); r.appendChild(b); return r;
  }

  function breakdown() {
    var ci = chIdx();
    var cur = slice(0), prev = slice(rangeDays());
    var rows;
    if (ci === null) {
      rows = CH.map(function (c, i) { var t = totals(cur, i), p = totals(prev, i); return { name: c.name, rev: t.rev, orders: t.orders, aov: t.rev / t.orders, ret: t.returns / t.orders, delta: (t.rev / p.rev - 1) * 100 }; });
    } else {
      rows = CATS.map(function (name, j) {
        var t = 0, p = 0, o = 0;
        cur.forEach(function (r) { t += r.ch[ci].cat[j]; o += r.ch[ci].orders * CH[ci].cat[j]; });
        prev.forEach(function (r) { p += r.ch[ci].cat[j]; });
        return { name: name, rev: t, orders: o, aov: t / o, ret: CH[ci].ret * (1 + (j - 2.5) * 0.08), delta: (t / p - 1) * 100 };
      });
    }
    return rows;
  }

  function renderBars() {
    var rows = breakdown().slice().sort(function (a, b) { return b.rev - a.rev; });
    var svg = $('bars'); clear(svg);
    var H = rows.length * 36 + 12; svg.setAttribute('viewBox', '0 0 380 ' + H);
    var max = rows[0].rev, L = 108, span = 232;
    svgEl('line', { 'class': 'axis', x1: L, x2: L, y1: 6, y2: H - 6 }, svg);
    var tip = $('tip2'), panel = svg.closest('.panel');
    rows.forEach(function (r, i) {
      var y = 10 + i * 36, len = Math.max(6, r.rev / max * span);
      txt(svg, L - 8, y + 13, r.name, 'lbl', 'end');
      var bar = svgEl('path', { 'class': 'bar', d: 'M' + L + ',' + y + ' h' + (len - 4) + ' a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 H' + L + ' Z', fill: COLORS.actual, tabindex: '0', 'aria-label': r.name + ' ' + money(r.rev) }, svg);
      txt(svg, L + len + 8, y + 13, money(r.rev));
      function on() {
        clear(tip); var h = document.createElement('b'); h.textContent = r.name; tip.appendChild(h);
        var v = document.createElement('div'); v.textContent = money(r.rev) + ' · ' + count(r.orders) + ' orders · ' + signed(r.delta) + ' vs prior'; tip.appendChild(v);
        var br = bar.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        tip.style.left = (br.left + br.width / 2 - pr.left) + 'px'; tip.style.top = (br.top - pr.top - 6) + 'px'; tip.style.opacity = 1;
      }
      function off() { tip.style.opacity = 0; }
      bar.addEventListener('pointerenter', on); bar.addEventListener('pointerleave', off); bar.addEventListener('focus', on); bar.addEventListener('blur', off);
    });
    $('bars-title').textContent = state.channel === 'all' ? 'Revenue by channel' : 'Revenue by category · ' + state.channel;
  }

  function renderTable() {
    var rows = breakdown();
    var k = state.sort.key, dir = state.sort.dir;
    rows.sort(function (a, b) { return typeof a[k] === 'string' ? a[k].localeCompare(b[k]) * dir : (a[k] - b[k]) * dir; });
    var tb = $('tbody'); clear(tb);
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      var td = document.createElement('td'); td.className = 'ch'; var i = document.createElement('i'); td.appendChild(i); td.appendChild(document.createTextNode(r.name)); tr.appendChild(td);
      [money(r.rev), count(r.orders), '$' + Math.round(r.aov), pct(r.ret)].forEach(function (v) { var c = document.createElement('td'); c.textContent = v; tr.appendChild(c); });
      var d = document.createElement('td'); d.className = r.delta >= 0 ? 'up' : 'dn'; d.textContent = signed(r.delta); tr.appendChild(d);
      tb.appendChild(tr);
    });
    $('table-title').textContent = (state.channel === 'all' ? 'Channel' : 'Category') + ' detail';
    document.querySelectorAll('#rt th[data-key]').forEach(function (th) {
      th.setAttribute('aria-sort', th.dataset.key === k ? (dir > 0 ? 'ascending' : 'descending') : 'none');
    });
  }

  function renderAll() {
    renderTiles(); renderLine(); renderBars(); renderTable();
    $('range-label').textContent = state.range === '30d' ? 'Last 30 days' : state.range === '90d' ? 'Last 13 weeks' : 'Last 12 months';
    document.querySelectorAll('[data-range]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.range === state.range ? 'true' : 'false'); });
  }

  /* ---------- controls ---------- */
  document.querySelectorAll('[data-range]').forEach(function (b) { b.addEventListener('click', function () { state.range = b.dataset.range; renderAll(); }); });
  var sel = $('channel'); CH.forEach(function (c) { var o = document.createElement('option'); o.value = c.name; o.textContent = c.name; sel.appendChild(o); });
  sel.addEventListener('change', function () { state.channel = sel.value; renderAll(); });
  document.querySelectorAll('#rt th[data-key]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.dataset.key;
      state.sort = { key: key, dir: state.sort.key === key ? -state.sort.dir : (key === 'name' ? 1 : -1) };
      renderTable();
    });
  });
  var csv = $('csv');
  if (csv) csv.addEventListener('click', function () {
    var rows = breakdown();
    var lines = [['Name', 'Revenue', 'Orders', 'AOV', 'Return rate', 'Change vs prior %'].join(',')];
    rows.forEach(function (r) { lines.push([JSON.stringify(r.name), Math.round(r.rev), Math.round(r.orders), r.aov.toFixed(2), (r.ret * 100).toFixed(2), r.delta.toFixed(2)].join(',')); });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample-' + state.range + '-' + state.channel.replace(/\s+/g, '-').toLowerCase() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  window.addEventListener('resize', function () { $('tip').style.opacity = 0; $('tip2').style.opacity = 0; });

  renderAll();
})();
