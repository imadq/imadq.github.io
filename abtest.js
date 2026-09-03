/* A/B test readout. Two-proportion z-test for the p-value, Newcombe (Wilson-based) interval for the
   difference, log-ratio interval for the relative lift, plain-English verdict driven by the interval.
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

  /* standard normal CDF (Abramowitz & Stegun 7.1.26) */
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
    return [centre - half, centre + half];
  }
  function pct(v, d) { return (v * 100).toFixed(d === undefined ? 2 : d) + '%'; }
  function signed(v, d, unit) { var r = Math.abs(v).toFixed(d); return (v < 0 && +r !== 0 ? '−' : '+') + r + (unit || ''); }
  function num(v) { return Math.round(v).toLocaleString('en-US'); }

  var IDS = { cn: 'ab-cn', cc: 'ab-cc', vn: 'ab-vn', vc: 'ab-vc' };
  function read() {
    var g = function (id) { var raw = $(id).value.trim(); return raw === '' ? NaN : Math.floor(+raw); };
    var v = { n1: g(IDS.cn), c1: g(IDS.cc), n2: g(IDS.vn), c2: g(IDS.vc), conf: String($('ab-conf').value) };
    if (!ZCRIT[v.conf]) v.conf = '95';
    var problems = [];
    if (!(v.n1 >= 1)) problems.push('control visitors');
    if (!(v.c1 >= 0)) problems.push('control conversions');
    if (!(v.n2 >= 1)) problems.push('variant visitors');
    if (!(v.c2 >= 0)) problems.push('variant conversions');
    if (v.c1 > v.n1) problems.push('control conversions cannot exceed visitors');
    if (v.c2 > v.n2) problems.push('variant conversions cannot exceed visitors');
    [[IDS.cn, !(v.n1 >= 1)], [IDS.cc, !(v.c1 >= 0) || v.c1 > v.n1], [IDS.vn, !(v.n2 >= 1)], [IDS.vc, !(v.c2 >= 0) || v.c2 > v.n2]]
      .forEach(function (x) { $(x[0]).setAttribute('aria-invalid', x[1] ? 'true' : 'false'); });
    v.problems = problems;
    return v;
  }

  function compute(v) {
    var z = ZCRIT[v.conf], alpha = 1 - (+v.conf) / 100;
    var p1 = v.c1 / v.n1, p2 = v.c2 / v.n2, diff = p2 - p1;
    var pooled = (v.c1 + v.c2) / (v.n1 + v.n2);
    var sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / v.n1 + 1 / v.n2));
    var zStat = sePooled > 0 ? diff / sePooled : 0;
    var pValue = sePooled > 0 ? 2 * (1 - phi(Math.abs(zStat))) : 1;
    var w1 = wilson(v.c1, v.n1, z), w2 = wilson(v.c2, v.n2, z);
    /* Newcombe method 10: interval for the difference built from the two Wilson intervals */
    var lo = diff - Math.sqrt(Math.pow(p2 - w2[0], 2) + Math.pow(w1[1] - p1, 2));
    var hi = diff + Math.sqrt(Math.pow(w2[1] - p2, 2) + Math.pow(p1 - w1[0], 2));
    var sig = !(lo <= 0 && hi >= 0);
    /* relative lift with a log-ratio interval; undefined when either arm has no conversions */
    var lift = null, liftLo = null, liftHi = null;
    if (v.c1 > 0 && v.c2 > 0) {
      var seLog = Math.sqrt((1 - p1) / v.c1 + (1 - p2) / v.c2), lr = Math.log(p2 / p1);
      lift = p2 / p1 - 1; liftLo = Math.exp(lr - z * seLog) - 1; liftHi = Math.exp(lr + z * seLog) - 1;
    }
    var varSum = p1 * (1 - p1) + p2 * (1 - p2);
    var need = (diff !== 0 && varSum > 0) ? Math.ceil(Math.pow(z + Z_POWER80, 2) * varSum / (diff * diff)) : null;
    var small = [[v.n1, p1], [v.n2, p2]].some(function (a) { return a[0] * a[1] < 5 || a[0] * (1 - a[1]) < 5; });
    return { p1: p1, p2: p2, diff: diff, zStat: zStat, pValue: pValue, lo: lo, hi: hi, sig: sig, lift: lift, liftLo: liftLo, liftHi: liftHi, need: need, alpha: alpha, w1: w1, w2: w2, small: small };
  }

  function setTile(id, value, delta) { var t = $(id); t.querySelector('.value').textContent = value; t.querySelector('.delta').textContent = delta; return t; }

  function render() {
    var v = read();
    var verdict = $('ab-verdict'); clear(verdict);
    var svg = $('ab-chart'); clear(svg);
    var lt = $('ab-tl'); lt.querySelector('.value').classList.remove('good', 'bad');
    if (v.problems.length) {
      setTile('ab-tc', '—', ''); setTile('ab-tv', '—', ''); setTile('ab-tl', '—', ''); setTile('ab-tp', '—', '');
      var b0 = document.createElement('b'); b0.textContent = 'Waiting for numbers.';
      var s0 = document.createElement('span'); s0.textContent = ' Enter visitors and conversions for both arms (' + v.problems.join('; ') + ').';
      verdict.appendChild(b0); verdict.appendChild(s0);
      svg.setAttribute('aria-label', 'No chart until both arms have valid numbers');
      return;
    }
    var r = compute(v);
    setTile('ab-tc', pct(r.p1), num(v.c1) + ' of ' + num(v.n1) + ' · ' + v.conf + '% CI ' + pct(Math.max(0, r.w1[0])) + ' to ' + pct(Math.min(1, r.w1[1])));
    setTile('ab-tv', pct(r.p2), num(v.c2) + ' of ' + num(v.n2) + ' · ' + v.conf + '% CI ' + pct(Math.max(0, r.w2[0])) + ' to ' + pct(Math.min(1, r.w2[1])));
    if (r.lift === null) {
      setTile('ab-tl', '—', 'relative lift is not defined when an arm has zero conversions');
    } else {
      setTile('ab-tl', signed(r.lift * 100, 1, '%'), 'relative lift · ' + v.conf + '% CI ' + signed(r.liftLo * 100, 1, '%') + ' to ' + signed(r.liftHi * 100, 1, '%'));
      if (r.sig) lt.querySelector('.value').classList.add(r.diff > 0 ? 'good' : 'bad');
    }
    setTile('ab-tp', r.pValue < 0.001 ? '< 0.001' : r.pValue.toFixed(3), 'two-sided z-test · z = ' + signed(r.zStat, 2) + ' · threshold ' + r.alpha.toFixed(2));

    var b = document.createElement('b'), body = document.createElement('span');
    var ci = signed(r.lo * 100, 2) + ' to ' + signed(r.hi * 100, 2) + ' pts';
    if (r.sig) {
      b.textContent = (r.diff > 0 ? 'Variant wins' : 'Variant loses') + ' at ' + v.conf + '% confidence.';
      body.textContent = ' The difference is ' + signed(r.diff * 100, 2, ' pts') + ' and the ' + v.conf + '% interval, ' + ci + ', does not include zero. ' +
        (r.diff > 0 ? 'Ship the variant and keep measuring. The point estimate is the best single guess; plan on something inside the interval, not the top of it.' : 'Keep the control. The variant is doing measurable harm.');
    } else {
      b.textContent = 'Not significant at ' + v.conf + '% confidence.';
      var needTxt = r.need === null ? 'The two arms are identical so far, so there is no effect size to plan around.'
        : r.need > 1e8 ? 'The difference is so small that detecting it would take more than 100 million visitors per arm; treat the arms as equal.'
        : 'To detect a lift this size with 80% power you would need about ' + num(r.need) + ' visitors per arm; keep the test running or decide with the risk stated.';
      body.textContent = ' The ' + v.conf + '% interval on the difference, ' + ci + ', includes zero, so the data is consistent with no effect. ' + needTxt;
    }
    verdict.appendChild(b); verdict.appendChild(body);
    if (r.small) {
      var note = document.createElement('span'); note.className = 'ab-small';
      note.textContent = ' Small counts in at least one arm: the p-value is approximate here, the intervals are the more reliable read.';
      verdict.appendChild(note);
    }

    /* chart: two bars with interval whiskers */
    var L = 84, R = 356;
    var rows = [{ name: 'Control', p: r.p1, w: r.w1, fill: '#9298a6' }, { name: 'Variant', p: r.p2, w: r.w2, fill: '#17a672' }];
    var max = Math.min(1, Math.max(r.w1[1], r.w2[1]) * 1.15) || 0.01;
    var x = function (p) { return L + (Math.max(0, Math.min(1, p)) / max) * (R - L); };
    svgEl('line', { 'class': 'axis', x1: L, x2: L, y1: 8, y2: 104 }, svg);
    for (var i = 1; i <= 4; i++) { var p = max * i / 4; svgEl('line', { 'class': 'grid', x1: x(p), x2: x(p), y1: 8, y2: 96 }, svg); txt(svg, x(p), 112, pct(p, 1), null, 'middle'); }
    rows.forEach(function (row, i) {
      var y = 18 + i * 42, len = Math.max(4, x(row.p) - L);
      txt(svg, L - 10, y + 13, row.name, 'lbl', 'end');
      svgEl('path', { d: 'M' + L + ',' + y + ' h' + (len - 4) + ' a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 H' + L + ' Z', fill: row.fill }, svg);
      var a = x(row.w[0]), c = x(row.w[1]);
      svgEl('line', { x1: a, x2: c, y1: y + 9, y2: y + 9, stroke: '#f1f0eb', 'stroke-width': '2' }, svg);
      svgEl('line', { x1: a, x2: a, y1: y + 4, y2: y + 14, stroke: '#f1f0eb', 'stroke-width': '2' }, svg);
      svgEl('line', { x1: c, x2: c, y1: y + 4, y2: y + 14, stroke: '#f1f0eb', 'stroke-width': '2' }, svg);
      txt(svg, Math.min(c + 8, R + 4), y + 13, pct(row.p), 'lbl');
    });
    svg.setAttribute('aria-label', 'Conversion rate by arm with ' + v.conf + '% intervals: control ' + pct(r.p1) + ', variant ' + pct(r.p2));
  }

  [IDS.cn, IDS.cc, IDS.vn, IDS.vc].forEach(function (id) { $(id).addEventListener('input', render); });
  $('ab-conf').addEventListener('change', render);
  $('ab-reset').addEventListener('click', function () { $(IDS.cn).value = 12480; $(IDS.cc).value = 412; $(IDS.vn).value = 12510; $(IDS.vc).value = 468; $('ab-conf').value = '95'; render(); });
  render();
})();
