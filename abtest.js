/* A/B test readout: two-proportion z-test with Wilson intervals, editable inputs, plain-English verdict.
   Sample numbers only; nothing here is real traffic. */
(function () {
  'use strict';
  var root = document.getElementById('ab');
  if (!root) return;

  function $(id) { return document.getElementById(id); }
  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, s, cls, anchor) { var t = svgEl('text', { x: x, y: y }, parent); if (cls) t.setAttribute('class', cls); if (anchor) t.setAttribute('text-anchor', anchor); t.textContent = s; return t; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  /* standard normal CDF (Abramowitz & Stegun 7.1.26, accurate to ~1e-7) */
  function phi(z) {
    var s = z < 0 ? -1 : 1, x = Math.abs(z) / Math.SQRT2;
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return 0.5 * (1 + s * y);
  }
  var ZCRIT = { '90': 1.6449, '95': 1.9600, '99': 2.5758 };
  var Z_POWER80 = 0.8416;

  function wilson(c, n, z) {
    var p = c / n, d = 1 + z * z / n;
    var centre = (p + z * z / (2 * n)) / d;
    var half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return [Math.max(0, centre - half), Math.min(1, centre + half)];
  }
  function pct(v, d) { return (v * 100).toFixed(d === undefined ? 2 : d) + '%'; }
  function signed(v, d, unit) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d) + (unit || ''); }
  function num(v) { return Math.round(v).toLocaleString('en-US'); }

  function read() {
    var v = {
      n1: Math.max(1, Math.floor(+$('c-n').value || 0)), c1: Math.max(0, Math.floor(+$('c-c').value || 0)),
      n2: Math.max(1, Math.floor(+$('v-n').value || 0)), c2: Math.max(0, Math.floor(+$('v-c').value || 0)),
      conf: $('ab-conf').value
    };
    v.c1 = Math.min(v.c1, v.n1); v.c2 = Math.min(v.c2, v.n2);
    return v;
  }

  function compute(v) {
    var z = ZCRIT[v.conf], alpha = 1 - (+v.conf) / 100;
    var p1 = v.c1 / v.n1, p2 = v.c2 / v.n2, diff = p2 - p1;
    var pooled = (v.c1 + v.c2) / (v.n1 + v.n2);
    var sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / v.n1 + 1 / v.n2));
    var zStat = sePooled > 0 ? diff / sePooled : 0;
    var pValue = sePooled > 0 ? 2 * (1 - phi(Math.abs(zStat))) : 1;
    var se = Math.sqrt(p1 * (1 - p1) / v.n1 + p2 * (1 - p2) / v.n2);
    var lo = diff - z * se, hi = diff + z * se;
    var lift = p1 > 0 ? diff / p1 : 0, liftLo = p1 > 0 ? lo / p1 : 0, liftHi = p1 > 0 ? hi / p1 : 0;
    var need = diff !== 0 ? Math.ceil(Math.pow(z + Z_POWER80, 2) * (p1 * (1 - p1) + p2 * (1 - p2)) / (diff * diff)) : Infinity;
    return { p1: p1, p2: p2, diff: diff, zStat: zStat, pValue: pValue, lo: lo, hi: hi, lift: lift, liftLo: liftLo, liftHi: liftHi, need: need, alpha: alpha, z: z,
             w1: wilson(v.c1, v.n1, z), w2: wilson(v.c2, v.n2, z), sig: pValue < alpha };
  }

  function render() {
    var v = read(), r = compute(v);
    $('t-c').querySelector('.value').textContent = pct(r.p1);
    $('t-c').querySelector('.delta').textContent = num(v.c1) + ' of ' + num(v.n1) + ' · ' + v.conf + '% CI ' + pct(r.w1[0]) + ' to ' + pct(r.w1[1]);
    $('t-v').querySelector('.value').textContent = pct(r.p2);
    $('t-v').querySelector('.delta').textContent = num(v.c2) + ' of ' + num(v.n2) + ' · ' + v.conf + '% CI ' + pct(r.w2[0]) + ' to ' + pct(r.w2[1]);
    var lt = $('t-l'); lt.querySelector('.value').textContent = signed(r.lift * 100, 1, '%');
    lt.querySelector('.value').className = 'value ' + (r.sig ? (r.diff > 0 ? 'good' : 'bad') : '');
    lt.querySelector('.delta').textContent = 'relative lift · ' + v.conf + '% CI ' + signed(r.liftLo * 100, 1, '%') + ' to ' + signed(r.liftHi * 100, 1, '%');
    $('t-p').querySelector('.value').textContent = r.pValue < 0.001 ? '< 0.001' : r.pValue.toFixed(3);
    $('t-p').querySelector('.delta').textContent = 'two-sided · z = ' + r.zStat.toFixed(2) + ' · threshold ' + r.alpha.toFixed(2);

    var verdict = $('ab-verdict'); clear(verdict);
    var b = document.createElement('b');
    var body = document.createElement('span');
    if (r.sig) {
      b.textContent = (r.diff > 0 ? 'Variant wins' : 'Variant loses') + ' at ' + v.conf + '% confidence.';
      body.textContent = ' The absolute difference is ' + signed(r.diff * 100, 2, ' pts') + ', with a ' + v.conf + '% interval of ' + signed(r.lo * 100, 2) + ' to ' + signed(r.hi * 100, 2) + ' pts that does not include zero. ' + (r.diff > 0 ? 'Ship the variant, then keep measuring; the true lift is more likely near the middle of the interval than the top.' : 'Keep the control. The variant is doing measurable harm.');
    } else {
      b.textContent = 'Not significant at ' + v.conf + '% confidence.';
      body.textContent = ' The ' + v.conf + '% interval on the difference runs from ' + signed(r.lo * 100, 2) + ' to ' + signed(r.hi * 100, 2) + ' pts and includes zero, so the data is consistent with no effect. ' + (isFinite(r.need) ? 'To detect a lift this size with 80% power you would need about ' + num(r.need) + ' visitors per arm; keep the test running or decide with the risk stated.' : 'The two arms are identical so far.');
    }
    verdict.appendChild(b); verdict.appendChild(body);

    /* chart: two bars with interval whiskers */
    var svg = $('ab-chart'); clear(svg);
    var W = 380, L = 84, R = 356, rows = [{ name: 'Control', p: r.p1, w: r.w1, fill: '#9298a6' }, { name: 'Variant', p: r.p2, w: r.w2, fill: '#17a672' }];
    var max = Math.max(r.w1[1], r.w2[1]) * 1.15 || 0.01;
    var x = function (p) { return L + (p / max) * (R - L); };
    svgEl('line', { 'class': 'axis', x1: L, x2: L, y1: 8, y2: 104 }, svg);
    var ticks = 4;
    for (var i = 1; i <= ticks; i++) { var p = max * i / ticks; svgEl('line', { 'class': 'grid', x1: x(p), x2: x(p), y1: 8, y2: 96 }, svg); txt(svg, x(p), 112, pct(p, 1), null, 'middle'); }
    rows.forEach(function (row, i) {
      var y = 18 + i * 42, len = Math.max(4, x(row.p) - L);
      txt(svg, L - 10, y + 13, row.name, 'lbl', 'end');
      svgEl('path', { d: 'M' + L + ',' + y + ' h' + (len - 4) + ' a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 H' + L + ' Z', fill: row.fill }, svg);
      svgEl('line', { x1: x(row.w[0]), x2: x(row.w[1]), y1: y + 9, y2: y + 9, stroke: '#f1f0eb', 'stroke-width': '2' }, svg);
      svgEl('line', { x1: x(row.w[0]), x2: x(row.w[0]), y1: y + 4, y2: y + 14, stroke: '#f1f0eb', 'stroke-width': '2' }, svg);
      svgEl('line', { x1: x(row.w[1]), x2: x(row.w[1]), y1: y + 4, y2: y + 14, stroke: '#f1f0eb', 'stroke-width': '2' }, svg);
      txt(svg, x(row.w[1]) + 8, y + 13, pct(row.p), 'lbl');
    });
    svg.setAttribute('aria-label', 'Conversion rate by arm with ' + v.conf + '% intervals: control ' + pct(r.p1) + ', variant ' + pct(r.p2));
  }

  ['c-n', 'c-c', 'v-n', 'v-c', 'ab-conf'].forEach(function (id) { $(id).addEventListener('input', render); $(id).addEventListener('change', render); });
  $('ab-reset').addEventListener('click', function () { $('c-n').value = 12480; $('c-c').value = 412; $('v-n').value = 12510; $('v-c').value = 468; $('ab-conf').value = '95'; render(); });
  render();
})();
