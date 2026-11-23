/* Live background: a 3D constellation of points that morphs between shapes drawn from my projects.
   - Neural core: the opening shape, a shell of linked points around a bright core.
   - Forward curves (RiskLedger), order book (TickStream), power grid (GridFlow), embedding space
     (Desk Copilot), revenue bridge (Revenue Trust), A/B distributions (Experiment Lab) and a
     batch pipeline (Mobility Pipeline).
   On the home page it cycles like a film and the scene buttons in the intro choose a shape; hovering
   or focusing a project card shows that project's shape. Project pages hold their own shape.
   The pointer bends nearby points, a click sends a ripple, and signals travel along the links.
   Stays still for prefers-reduced-motion or when paused, and stops drawing while the tab is hidden. */
(function () {
  'use strict';
  var body = document.body;
  var canvas = document.createElement('canvas');
  canvas.className = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var grain = document.createElement('div');
  grain.className = 'bg-grain';
  grain.setAttribute('aria-hidden', 'true');
  body.insertBefore(grain, body.firstChild);
  body.insertBefore(canvas, body.firstChild);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var TAU = Math.PI * 2;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia('(max-width: 860px)').matches;
  var N = narrow ? 760 : 1200;          // points in every shape
  var RING = narrow ? 90 : 140;         // the last RING points form the projector ring under each shape
  var M = N - RING;                     // points each shape is free to place
  var INK = 0, PINK = 1, CYAN = 2, AMBER = 3;

  // Seeded random numbers, so every shape looks the same on every visit.
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(TAU * r()); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---------- shapes ---------- */
  function Shape() {
    this.pos = new Float32Array(N * 3); this.col = new Uint8Array(N);
    this.edges = []; this.hot = []; this.n = 0;
    this.flow = null; this.spin = false; this.yaw = -0.45; this.pitch = -0.34; this.zoom = 1;
  }
  Shape.prototype.add = function (x, y, z, c) {
    if (this.n >= M) return -1;
    var i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.col[i] = c;
    return i;
  };
  Shape.prototype.link = function (a, b) { if (a >= 0 && b >= 0) this.edges.push(a, b); };

  // Link each point to its nearest neighbours inside [from, to).
  function knn(s, from, to, k, maxD) {
    var p = s.pos, seen = {}, md = maxD * maxD;
    for (var a = from; a < to; a++) {
      var bi = [], bd = [];
      for (var b = from; b < to; b++) {
        if (b === a) continue;
        var dx = p[a * 3] - p[b * 3], dy = p[a * 3 + 1] - p[b * 3 + 1], dz = p[a * 3 + 2] - p[b * 3 + 2];
        var d = dx * dx + dy * dy + dz * dz;
        if (d > md) continue;
        if (bi.length < k) { bi.push(b); bd.push(d); continue; }
        var w = 0;
        for (var j = 1; j < k; j++) if (bd[j] > bd[w]) w = j;
        if (d < bd[w]) { bi[w] = b; bd[w] = d; }
      }
      for (var q = 0; q < bi.length; q++) {
        var lo = Math.min(a, bi[q]), hi = Math.max(a, bi[q]), key = lo * N + hi;
        if (!seen[key]) { seen[key] = 1; s.edges.push(lo, hi); }
      }
    }
  }

  // Opening shape: a shell of linked points around a bright core, like a small neural net.
  function core(s) {
    var r = seeded(11), shell = Math.round(M * 0.8), GA = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < shell; i++) {
      var y = 1 - 2 * (i + 0.5) / shell, rad = Math.sqrt(1 - y * y), th = i * GA;
      var x = Math.cos(th) * rad, z = Math.sin(th) * rad;
      var k = 0.93 * (0.93 + 0.07 * Math.sin(4 * x + 2.5 * y) * Math.cos(3.5 * z + 1));
      s.add(x * k, y * k, z * k, r() < 0.08 ? PINK : INK);
    }
    while (s.n < M) {
      var u = Math.cbrt(r()) * 0.4, a = r() * TAU, b = Math.acos(2 * r() - 1);
      s.add(u * Math.sin(b) * Math.cos(a), u * Math.cos(b), u * Math.sin(b) * Math.sin(a), r() < 0.55 ? PINK : CYAN);
    }
    knn(s, 0, shell, 2, narrow ? 0.24 : 0.17);
    for (var j = 0; j < 12; j++) s.hot.push(shell + Math.floor(r() * (M - shell)), Math.floor(r() * shell));
    s.spin = true; s.pitch = -0.3;
  }

  // RiskLedger: forward curves for 4 power and 4 gas hubs over 18 delivery months, winter peaks included.
  function forwardCurves(s) {
    var r = seeded(23), C = narrow ? 30 : 40, R = Math.floor(M / C) - 1;
    var base = [0.28, 0.22, 0.34, 0.18, -0.42, -0.38, -0.34, -0.47], amp = [0.24, 0.22, 0.27, 0.2, 0.15, 0.14, 0.16, 0.13];
    for (var row = 0; row < R; row++) {
      var h = Math.min(7, Math.floor(row * 8 / R)), wob = 0.035 * Math.sin(row * 0.9) + 0.02 * gauss(r) * 0.3;
      var first = -1;
      for (var c = 0; c < C; c++) {
        var m = c / (C - 1) * 18, x = -1.25 + 2.5 * c / (C - 1), z = -0.95 + 1.9 * row / (R - 1);
        var y = base[h] + wob + amp[h] * Math.cos(TAU * (m - 10.5) / 12) + 0.006 * m;
        var i = s.add(x, y, z, h < 4 ? PINK : CYAN);
        if (c > 0) s.link(i - 1, i); else first = i;
      }
    }
    while (s.n < M) { var t = (s.n % 60) / 59; s.add(-1.25 + 2.5 * t, -0.78, 1.08, INK); }
    s.yaw = -0.4; s.pitch = -0.36; s.zoom = 0.8;
  }

  // TickStream: bid and ask depth around the spread, one slice per snapshot, stacked over time.
  function orderBook(s) {
    var r = seeded(37), T = narrow ? 14 : 18, L = Math.floor((M - 20) / T / 2) * 2, half = L / 2;
    for (var t = 0; t < T; t++) {
      var z = -0.9 + 1.8 * t / (T - 1);
      for (var side = 0; side < 2; side++) {
        var cum = 0, sizes = [], total = 0;
        for (var l = 0; l < half; l++) {
          var sz = (0.4 + l / half) * (1 + 0.45 * Math.sin(t * 0.55 + l * 0.35 + side * 2)) + 0.6 * r();
          sizes.push(sz); total += sz;
        }
        var prev = -1;
        for (var q = 0; q < half; q++) {
          cum += sizes[q];
          var off = 0.07 + q / (half - 1) * 1.18, x = side === 0 ? -off : off;
          var i = s.add(x, -0.72 + 1.3 * cum / total, z, side === 0 ? CYAN : PINK);
          if (prev >= 0) s.link(prev, i);
          prev = i;
        }
      }
    }
    var k = 0;
    while (s.n < M) { s.add(0, -0.74, -0.9 + 1.8 * (k++ % 20) / 19, AMBER); }
    s.yaw = -0.42; s.pitch = -0.3; s.zoom = 0.84;
  }

  // GridFlow: European bidding zones as price pillars on a map, linked by interconnector arcs.
  function powerGrid(s) {
    var zones = [
      ['NL', 5.0, 52.3, 86], ['BE', 4.5, 50.6, 84], ['FR', 2.5, 46.8, 61], ['DE-LU', 10.2, 51.0, 89],
      ['DK1', 9.0, 56.0, 71], ['PL', 19.0, 52.1, 104], ['AT', 14.6, 47.5, 93], ['CH', 8.2, 46.8, 96],
      ['IT-N', 10.4, 45.2, 111], ['ES', -3.7, 40.3, 56]
    ];
    var links = [[0, 1], [0, 3], [0, 4], [1, 2], [2, 3], [2, 7], [2, 9], [2, 8], [3, 4], [3, 5], [3, 6], [3, 7], [6, 7], [6, 8], [7, 8]];
    var P = narrow ? 26 : 40, A = narrow ? 18 : 28, floorY = -0.72;
    var xy = zones.map(function (zn) { return [(zn[1] - 7.6) / 10.5, -(zn[2] - 48.2) / 8.2]; });
    zones.forEach(function (zn, zi) {
      var h = zn[3] / 111 * 1.35, prev = -1;
      for (var j = 0; j < P; j++) {
        var a = (j % 2) * Math.PI, i = s.add(xy[zi][0] + 0.012 * Math.cos(a), floorY + h * j / (P - 1), xy[zi][1] + 0.012 * Math.sin(a), AMBER);
        if (prev >= 0) s.link(prev, i);
        prev = i;
      }
    });
    links.forEach(function (lk) {
      var a = xy[lk[0]], b = xy[lk[1]], prev = -1;
      for (var j = 0; j < A; j++) {
        var u = j / (A - 1), i = s.add(a[0] + (b[0] - a[0]) * u, floorY + 0.34 * Math.sin(Math.PI * u), a[1] + (b[1] - a[1]) * u, CYAN);
        if (prev >= 0) s.link(prev, i);
        prev = i;
      }
    });
    var left = M - s.n, cols = Math.ceil(Math.sqrt(left * 1.3)), k = 0;
    while (s.n < M) {
      var cx = k % cols, cz = Math.floor(k / cols), rows = Math.ceil(left / cols);
      s.add(-1.2 + 2.4 * cx / (cols - 1), floorY, -0.95 + 1.9 * cz / Math.max(1, rows - 1), INK);
      k++;
    }
    s.spin = true; s.pitch = -0.5; s.zoom = 0.92;
  }

  // Desk Copilot: documents as clusters in embedding space; a question finds its nearest neighbours.
  function embeddings(s) {
    var r = seeded(53), K = 9, centres = [], q = null;
    for (var c = 0; c < K; c++) {
      var a = r() * TAU, b = Math.acos(2 * r() - 1), rad = 0.45 + 0.4 * r();
      centres.push([rad * Math.sin(b) * Math.cos(a), rad * Math.cos(b) * 0.8, rad * Math.sin(b) * Math.sin(a)]);
    }
    q = [centres[0][0] + 0.2, centres[0][1] + 0.12, centres[0][2] + 0.06];
    var Q = 16, docs = M - Q, start = s.n;
    for (var i = 0; i < docs; i++) {
      var ci = Math.floor(Math.pow(r(), 1.3) * K), sd = 0.09 + 0.05 * (ci % 3), cc = centres[ci];
      s.add(cc[0] + gauss(r) * sd, cc[1] + gauss(r) * sd, cc[2] + gauss(r) * sd, ci === 0 ? CYAN : INK);
    }
    var end = s.n;
    knn(s, start, end, 1, narrow ? 0.14 : 0.1);
    var qi = s.add(q[0], q[1], q[2], PINK);
    while (s.n < M) s.add(q[0] + gauss(r) * 0.018, q[1] + gauss(r) * 0.018, q[2] + gauss(r) * 0.018, PINK);
    var near = [];
    for (var j = start; j < end; j++) {
      var dx = s.pos[j * 3] - q[0], dy = s.pos[j * 3 + 1] - q[1], dz = s.pos[j * 3 + 2] - q[2];
      near.push([dx * dx + dy * dy + dz * dz, j]);
    }
    near.sort(function (x, y) { return x[0] - y[0]; });
    for (var n = 0; n < 10; n++) { s.col[near[n][1]] = PINK; s.hot.push(qi, near[n][1]); }
    s.spin = true; s.pitch = -0.22;
  }

  // Revenue Trust: the May to June revenue bridge as wireframe bars (calendar, volume, order value, refunds).
  function revenueBridge(s) {
    var steps = [['t', 1.0], ['d', -0.03], ['d', -0.06], ['d', 0.01], ['d', -0.04], ['t', 0.88]];
    var yv = function (v) { return -0.72 + (v - 0.8) / 0.2 * 1.3; };
    var per = Math.floor((M - 40) / steps.length), level = 0, w = 0.15, d = 0.15, tops = [];
    steps.forEach(function (st, bi) {
      var x0 = -1.1 + bi * 0.44, lo, hi, col;
      if (st[0] === 't') { lo = yv(0.8); hi = yv(st[1]); level = st[1]; col = INK; }
      else { var nl = level + st[1]; lo = yv(Math.min(level, nl)); hi = yv(Math.max(level, nl)); level = nl; col = st[1] < 0 ? PINK : CYAN; }
      tops.push([x0, yv(level)]);
      var X = [x0 - w, x0 + w], Y = [lo, hi], Z = [-d, d], corners = [];
      for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) for (var c = 0; c < 2; c++) corners.push([X[a], Y[b], Z[c]]);
      var pairs = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      var len = pairs.map(function (p) { var A = corners[p[0]], B = corners[p[1]]; return Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]); });
      var total = len.reduce(function (x, y) { return x + y; }, 0);
      pairs.forEach(function (p, pi) {
        var A = corners[p[0]], B = corners[p[1]], n = Math.max(2, Math.round(per * len[pi] / total)), first = -1, last = -1;
        for (var k = 0; k < n; k++) {
          var u = k / (n - 1), i = s.add(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u, col);
          if (k === 0) first = i;
          last = i;
        }
        s.link(first, last);
      });
    });
    var k2 = 0;
    while (s.n < M) {
      var seg = k2 % 5, u = (Math.floor(k2 / 5) % 8) / 7, a0 = tops[seg], a1 = tops[seg + 1];
      s.add(a0[0] + w + (a1[0] - w - a0[0] - w) * u, a0[1], 0, INK);
      k2++;
    }
    s.yaw = -0.3; s.pitch = -0.22; s.zoom = 0.88;
  }

  // Experiment Lab: control and treatment distributions as ridges, with the guardrail limit in amber.
  function abTest(s) {
    var r = seeded(71), S = narrow ? 4 : 5, Cn = narrow ? 50 : 70, groups = [[-0.22, -0.5, CYAN], [0.2, 0.5, PINK]];
    var pdf = function (x, mu) { return -0.72 + 1.3 * Math.exp(-((x - mu) * (x - mu)) / (2 * 0.3 * 0.3)); };
    groups.forEach(function (g) {
      for (var sl = 0; sl < S; sl++) {
        var z = g[1] - 0.22 + 0.44 * sl / (S - 1), prev = -1;
        for (var c = 0; c < Cn; c++) {
          var x = -1.25 + 2.5 * c / (Cn - 1), i = s.add(x, pdf(x, g[0]), z, g[2]);
          if (prev >= 0) s.link(prev, i);
          prev = i;
        }
      }
    });
    var guard = 22, fill = M - s.n - guard;
    for (var f = 0; f < fill; f++) {
      var g2 = groups[f % 2], x2 = clamp(g2[0] + gauss(r) * 0.3, -1.25, 1.25);
      s.add(x2, -0.72 + (pdf(x2, g2[0]) + 0.72) * r(), g2[1] - 0.22 + 0.44 * r(), g2[2]);
    }
    var gi = 0;
    while (s.n < M) { s.add(0.78, -0.72 + 1.2 * (gi % 11) / 10, gi < 11 ? -0.75 : 0.75, AMBER); gi++; }
    s.yaw = -0.3; s.pitch = -0.26; s.zoom = 0.84;
  }

  // Mobility Pipeline: records flowing through a tube, checksum gates along the way, bad rows set aside.
  function pipeline(s) {
    var r = seeded(89), G = narrow ? 18 : 26, P = narrow ? 24 : 30, gates = [-0.65, 0, 0.65], GP = narrow ? 26 : 40;
    s.flow = new Uint8Array(N);
    for (var g = 0; g < G; g++) {
      for (var j = 0; j < P; j++) {
        var a = j / P * TAU + g * 0.22, i = s.add(-1.3 + 2.6 * g / G, 0.05 + 0.32 * Math.sin(a), 0.32 * Math.cos(a), r() < 0.04 ? PINK : INK);
        if (i >= 0) s.flow[i] = 1;
      }
    }
    gates.forEach(function (gx) {
      var first = -1, prev = -1;
      for (var j = 0; j < GP; j++) {
        var a = j / GP * TAU, i = s.add(gx, 0.05 + 0.44 * Math.sin(a), 0.44 * Math.cos(a), AMBER);
        if (prev >= 0) s.link(prev, i); else first = i;
        prev = i;
      }
      s.link(prev, first);
    });
    while (s.n < M) s.add(0.42 + gauss(r) * 0.16, -0.76 + Math.abs(gauss(r)) * 0.05, gauss(r) * 0.14, PINK);
    s.yaw = -0.3; s.pitch = -0.22; s.zoom = 0.86;
  }

  var BUILD = {
    'core': core, 'riskledger': forwardCurves, 'tickstream': orderBook, 'gridflow': powerGrid,
    'desk-copilot': embeddings, 'revenue-trust': revenueBridge, 'experiment-lab': abTest, 'mobility-pipeline': pipeline
  };
  var ORDER = ['core', 'riskledger', 'tickstream', 'gridflow', 'desk-copilot', 'revenue-trust', 'experiment-lab', 'mobility-pipeline'];
  var CAPTION = {
    'core': 'Each shape in the background is drawn from the data behind one of my projects. Hover a project, or pick a scene.',
    'riskledger': 'RiskLedger: forward curves for four power and four gas hubs across 18 delivery months, the prices every trade is marked against.',
    'tickstream': 'TickStream: bid and ask depth either side of the spread, one slice per order-book snapshot.',
    'gridflow': 'GridFlow: European bidding zones as price pillars on the map, joined by their interconnectors.',
    'desk-copilot': 'Desk Copilot: a question lands in embedding space and pulls in its nearest documents.',
    'revenue-trust': 'Revenue Trust: the bridge from May to June revenue, split into calendar, volume, order value and refunds.',
    'experiment-lab': 'Experiment Lab: control and treatment distributions, with the guardrail limit in amber.',
    'mobility-pipeline': 'Mobility Pipeline: records flow through checksum gates, and bad rows are set aside instead of dropped.'
  };

  var cache = {};
  function shape(name) {
    if (!BUILD[name]) name = 'core';
    if (cache[name]) return cache[name];
    var s = new Shape();
    BUILD[name](s);
    while (s.n < M) s.add(0, -0.72, 0, INK);
    for (var k = 0; k < RING; k++) {            // projector ring, identical in every shape
      var a = k / RING * TAU, rad = k % 2 ? 1.5 : 1.58, i = M + k;
      s.pos[i * 3] = Math.cos(a) * rad; s.pos[i * 3 + 1] = -1.02; s.pos[i * 3 + 2] = Math.sin(a) * rad;
      s.col[i] = k % 14 === 0 ? PINK : INK;
    }
    cache[name] = s;
    return s;
  }

  /* ---------- state ---------- */
  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 1;
  var cur = new Float32Array(N * 3), from = new Float32Array(N * 3), tgt = new Float32Array(N * 3);
  var curCol = new Uint8Array(N), fromCol = new Uint8Array(N), fade = new Float32Array(N);
  var delay = new Float32Array(N), swirl = new Float32Array(N * 3);
  var sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N), sp = new Float32Array(N);
  var seedR = seeded(5);
  for (var i0 = 0; i0 < N; i0++) {
    delay[i0] = seedR() * 0.45;
    var a0 = seedR() * TAU, b0 = Math.acos(2 * seedR() - 1);
    swirl[i0 * 3] = Math.sin(b0) * Math.cos(a0); swirl[i0 * 3 + 1] = Math.cos(b0); swirl[i0 * 3 + 2] = Math.sin(b0) * Math.sin(a0);
    var rr = 2.2 + seedR() * 2.2;                // start scattered, like dust before the opening shape forms
    cur[i0 * 3] = swirl[i0 * 3] * rr; cur[i0 * 3 + 1] = swirl[i0 * 3 + 1] * rr; cur[i0 * 3 + 2] = swirl[i0 * 3 + 2] * rr;
  }

  var clock = 0, lastT = 0, raf = 0, paused = false, still = reduce.matches;
  var active = null, target = null, morphStart = 0, morphDur = 2200, done = false;
  var yaw = -0.6, pitch = -0.34, yawBase = 0, zoom = 1;
  var pointer = { x: -9999, y: -9999, on: false }, lens = { x: -9999, y: -9999, k: 0 }, tilt = { x: 0, y: 0 };
  var ripples = [], pulses = [], nextPulse = 0, dust = [];
  var cycleOn = body.getAttribute('data-cycle') === 'on', CYCLE = 9000, cycleStart = 0, hold = null, holdTimer = 0;
  var pageScene = body.getAttribute('data-scene') || 'core';

  var colours = { 0: '242,239,233', 1: '255,45,149', 2: '17,157,187', 3: '201,133,0' };
  function rgb(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v ? v.split(/\s+/).join(',') : fallback;
  }
  var sprites = [];
  function makeSprites() {
    colours[INK] = rgb('--bg-dot-rgb', colours[INK]); colours[PINK] = rgb('--accent-rgb', colours[PINK]);
    colours[CYAN] = rgb('--cyan-rgb', colours[CYAN]); colours[AMBER] = rgb('--amber-rgb', colours[AMBER]);
    for (var c = 0; c < 4; c++) {
      var sc = document.createElement('canvas'); sc.width = sc.height = 32;
      var g = sc.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(' + colours[c] + ',1)');
      gr.addColorStop(0.18, 'rgba(' + colours[c] + ',0.85)');
      gr.addColorStop(0.45, 'rgba(' + colours[c] + ',0.16)');
      gr.addColorStop(1, 'rgba(' + colours[c] + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
      sprites[c] = sc;
    }
  }

  function layout() {
    if (W >= 1100) { cx = W * 0.73; cy = H * 0.5; R = Math.min(W * 0.175, H * 0.31); }
    else if (W >= 700) { cx = W * 0.62; cy = H * 0.46; R = Math.min(W * 0.26, H * 0.3); }
    else { cx = W * 0.5; cy = H * 0.4; R = Math.min(W * 0.34, H * 0.26); }
  }

  function resize() {
    dpr = Math.min(1.75, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    var dr = seeded(97); dust = [];
    for (var k = 0; k < (narrow ? 70 : 150); k++) dust.push([dr() * W, dr() * H * 1.5, 0.08 + dr() * 0.25, dr() * TAU, dr() < 0.12]);
    request();
  }

  /* ---------- scenes ---------- */
  var ui = document.querySelector('[data-scenes]');
  var buttons = ui ? Array.prototype.slice.call(ui.querySelectorAll('[data-scene-btn]')) : [];
  var caption = ui ? ui.querySelector('[data-scene-caption]') : null;
  var pauseBtn = ui ? ui.querySelector('[data-scene-pause]') : null;

  function setScene(name, dur) {
    if (!BUILD[name]) name = 'core';
    if (name === active) return;
    from.set(cur); fromCol.set(curCol);
    active = name; target = shape(name);
    morphStart = clock; morphDur = dur || 2200; done = false;
    if (still || paused) morphStart = clock - 1e7;   // no motion: jump straight to the shape
    // Chart-like shapes face the viewer and sway; 3D shapes keep turning.
    if (!target.spin) yawBase = target.yaw + Math.round((yaw - target.yaw) / TAU) * TAU;
    if (still || paused) { yaw = target.spin ? yaw : yawBase; pitch = target.pitch; zoom = target.zoom; }
    buttons.forEach(function (b) {
      var on = b.getAttribute('data-scene-btn') === name;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.style.setProperty('--p', on && (!cycleOn || paused || hold || still) ? '1' : '0');
    });
    if (caption) caption.textContent = CAPTION[name];
    request();
  }

  function nextScene() {
    var i = ORDER.indexOf(active);
    setScene(ORDER[(i + 1) % ORDER.length]);
    cycleStart = clock;
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      hold = null;
      setScene(b.getAttribute('data-scene-btn'));
      cycleStart = clock;
    });
  });
  function setPaused(p) {
    paused = p;
    if (pauseBtn) {
      pauseBtn.setAttribute('data-state', p ? 'paused' : 'playing');
      pauseBtn.textContent = p ? 'Play' : 'Pause';
    }
    buttons.forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') b.style.setProperty('--p', '1'); });
    lastT = 0;
    request();
  }
  if (pauseBtn) pauseBtn.addEventListener('click', function () { setPaused(!paused); });

  // Hovering or focusing a project shows its shape; leaving lets the film carry on from there.
  Array.prototype.forEach.call(document.querySelectorAll('.work-item[data-scene]'), function (el) {
    var name = el.getAttribute('data-scene');
    function enter() { clearTimeout(holdTimer); hold = name; setScene(name); }
    function leave() {
      clearTimeout(holdTimer);
      holdTimer = setTimeout(function () { hold = null; cycleStart = clock; request(); }, 900);
    }
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('focusin', enter);
    el.addEventListener('focusout', leave);
  });

  /* ---------- update and draw ---------- */
  function update(dt) {
    var g = (clock - morphStart) / morphDur, p = target.pos, flow = target.flow;
    var phase = (clock * 0.00016) % 2.6;
    for (var i = 0; i < N; i++) {
      var j = i * 3, tx = p[j], f = 1;
      if (flow && flow[i]) {
        tx = ((tx + 1.3 + phase) % 2.6) - 1.3;
        f = clamp(Math.min(tx + 1.3, 1.3 - tx) / 0.3, 0, 1);
      }
      tgt[j] = tx; tgt[j + 1] = p[j + 1]; tgt[j + 2] = p[j + 2];
      var e = ease(clamp((g - delay[i]) / 0.55, 0, 1));
      var w = i < M ? Math.sin(Math.PI * e) * 0.28 : 0;
      cur[j] = from[j] + (tgt[j] - from[j]) * e + swirl[j] * w;
      cur[j + 1] = from[j + 1] + (tgt[j + 1] - from[j + 1]) * e + swirl[j + 1] * w;
      cur[j + 2] = from[j + 2] + (tgt[j + 2] - from[j + 2]) * e + swirl[j + 2] * w;
      curCol[i] = e > 0.5 ? target.col[i] : fromCol[i];
      fade[i] = e > 0.5 ? f : 1;
    }
    if (g >= 1.05) { done = true; }

    // Camera: slow turn for 3D shapes, a gentle sway for chart-like ones, tilted by the pointer.
    if (target.spin) yaw += dt * 0.00011;
    else yaw += (yawBase + 0.3 * Math.sin(clock * 0.00013) - yaw) * Math.min(1, dt * 0.0016);
    pitch += (target.pitch - pitch) * Math.min(1, dt * 0.002);
    zoom += (target.zoom - zoom) * Math.min(1, dt * 0.002);
    tilt.x += ((pointer.on ? (pointer.x / W - 0.5) : 0) - tilt.x) * Math.min(1, dt * 0.003);
    tilt.y += ((pointer.on ? (pointer.y / H - 0.5) : 0) - tilt.y) * Math.min(1, dt * 0.003);

    ripples.forEach(function (rp) { rp.r += 0.5 * dt; });
    ripples = ripples.filter(function (rp) { return rp.r < rp.max; });

    if (cycleOn && !hold && !paused && clock - cycleStart > CYCLE) nextScene();
  }

  function project() {
    var a = yaw + tilt.x * 0.35 + window.scrollY * 0.0004, b = pitch + tilt.y * 0.14;
    var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), F = 5;
    for (var i = 0; i < N; i++) {
      var j = i * 3, x = cur[j], y = cur[j + 1], z = cur[j + 2];
      var x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      var y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      var s = F / (F + z2);
      sx[i] = cx + x1 * R * zoom * s; sy[i] = cy - y1 * R * zoom * s; sz[i] = z2; sp[i] = s;
    }
    return [ca, sa, cb, sb, F];
  }

  function brightness() {
    var home = cycleOn, k = clamp(window.scrollY / (H * 0.9), 0, 1);
    var d = home ? 1 - 0.55 * k : 0.45;
    if (hold) d = Math.max(d, 0.85);
    return d * (narrow ? 0.9 : 1);
  }

  function draw() {
    var cam = project(), dim = brightness();
    var since = clock - morphStart, edgeFade = done || still || paused ? clamp((since - morphDur) / 700, 0, 1) : 0;
    if (since > 1e6) edgeFade = 1;
    lens.x += (pointer.x - lens.x) * 0.2; lens.y += (pointer.y - lens.y) * 0.2;
    lens.k += ((pointer.on ? 1 : 0) - lens.k) * 0.1;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // Far dust, drifting a little slower than the page.
    if (!still) {
      var off = (window.scrollY * 0.06) % (H * 1.5);
      for (var di = 0; di < dust.length; di++) {
        var dd = dust[di], y = ((dd[1] - off) % (H * 1.5) + H * 1.5) % (H * 1.5);
        if (y > H) continue;
        ctx.fillStyle = 'rgba(' + colours[dd[4] ? PINK : INK] + ',' + (dd[2] * (0.6 + 0.4 * Math.sin(clock * 0.0009 + dd[3])) * dim) + ')';
        ctx.fillRect(dd[0], y, 1.2, 1.2);
      }
    }

    // Projector ring outline with a marker running round it.
    var ca = cam[0], sa = cam[1], cb = cam[2], sb = cam[3], F = cam[4];
    function pr(x, y, z) {
      var x1 = x * ca + z * sa, z1 = -x * sa + z * ca, y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb, s = F / (F + z2);
      return [cx + x1 * R * zoom * s, cy - y1 * R * zoom * s, s];
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + colours[INK] + ',' + (0.09 * dim) + ')';
    ctx.beginPath();
    for (var k = 0; k <= 96; k++) {
      var an = k / 96 * TAU, q = pr(Math.cos(an) * 1.72, -1.02, Math.sin(an) * 1.72);
      if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
    }
    ctx.stroke();
    var mk = pr(Math.cos(clock * 0.0005) * 1.72, -1.02, Math.sin(clock * 0.0005) * 1.72);
    ctx.globalAlpha = 0.9 * dim;
    ctx.drawImage(sprites[PINK], mk[0] - 7, mk[1] - 7, 14, 14);
    ctx.globalAlpha = 1;

    // Links, grouped by colour so each group is one path.
    if (edgeFade > 0.01) {
      var paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], E = target.edges;
      for (var e = 0; e < E.length; e += 2) {
        var a = E[e], b = E[e + 1];
        if (fade[a] < 0.5 || fade[b] < 0.5) continue;
        var pth = paths[curCol[a]];
        pth.moveTo(sx[a], sy[a]); pth.lineTo(sx[b], sy[b]);
      }
      ctx.lineWidth = 0.75;
      for (var c = 0; c < 4; c++) {
        ctx.strokeStyle = 'rgba(' + colours[c] + ',' + ((c === INK ? 0.085 : 0.2) * edgeFade * dim) + ')';
        ctx.stroke(paths[c]);
      }
      if (target.hot.length) {
        var hp = new Path2D(), Hh = target.hot;
        for (var h = 0; h < Hh.length; h += 2) { hp.moveTo(sx[Hh[h]], sy[Hh[h]]); hp.lineTo(sx[Hh[h + 1]], sy[Hh[h + 1]]); }
        ctx.strokeStyle = 'rgba(' + colours[PINK] + ',' + (0.34 * edgeFade * dim) + ')';
        ctx.stroke(hp);
      }
    }

    // A scan line sweeps the shape as it forms, like a hologram resolving.
    var scanK = still || paused ? 0 : clamp(1 - since / 2600, 0, 1), scanY = cy - R * 1.3 + (since / 2600) * R * 2.6;

    // Points, nearest brightest; the pointer bends and lights the ones under it.
    for (var i = 0; i < N; i++) {
      var px = sx[i], py = sy[i], depth = clamp((sz[i] + 1.6) / 3.2, 0, 1);
      var al = (0.28 + 0.72 * (1 - depth)) * fade[i], size = (curCol[i] === INK ? 2.5 : 3.4) * sp[i];
      if (i >= M) { al *= 0.55; size *= 0.8; }
      if (lens.k > 0.02) {
        var dx = px - lens.x, dy = py - lens.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          var kb = (1 - dist / 140) * lens.k, push = kb * 18 / (dist || 1);
          px += dx * push; py += dy * push; al += 0.6 * kb; size *= 1 + 0.7 * kb;
        }
      }
      for (var ri = 0; ri < ripples.length; ri++) {
        var rp = ripples[ri], rx = px - rp.x, ry = py - rp.y, rd = Math.sqrt(rx * rx + ry * ry), band = Math.abs(rd - rp.r);
        if (band < 30) { var kr = (1 - band / 30) * (1 - rp.r / rp.max); al += 0.8 * kr; px += rx / (rd || 1) * 10 * kr; py += ry / (rd || 1) * 10 * kr; }
      }
      if (scanK > 0) { var sd = Math.abs(py - scanY); if (sd < 26) al += 0.7 * (1 - sd / 26) * scanK; }
      if (al <= 0.01) continue;
      ctx.globalAlpha = Math.min(1, al * dim);
      ctx.drawImage(sprites[curCol[i]], px - size, py - size, size * 2, size * 2);
    }

    // Signals travelling along the links.
    if (!still && !paused && edgeFade > 0.5 && target.edges.length) {
      if (clock > nextPulse && pulses.length < (narrow ? 6 : 12)) {
        var ed = Math.floor(Math.random() * target.edges.length / 2) * 2;
        pulses.push({ a: target.edges[ed], b: target.edges[ed + 1], t0: clock, dur: 500 + Math.random() * 700 });
        nextPulse = clock + 120 + Math.random() * 260;
      }
    }
    pulses = pulses.filter(function (pl) { return clock - pl.t0 < pl.dur && !still; });
    pulses.forEach(function (pl) {
      var u = (clock - pl.t0) / pl.dur, x = sx[pl.a] + (sx[pl.b] - sx[pl.a]) * u, y = sy[pl.a] + (sy[pl.b] - sy[pl.a]) * u;
      ctx.globalAlpha = Math.min(1, 0.95 * dim * Math.sin(Math.PI * u) * edgeFade);
      ctx.drawImage(sprites[PINK], x - 6, y - 6, 12, 12);
    });
    ctx.globalAlpha = 1;

    // Keep the reading column calm: a soft scrim on the text side.
    ctx.globalCompositeOperation = 'source-over';
    if (W >= 700) {
      var sg = ctx.createLinearGradient(0, 0, W * 0.6, 0);
      sg.addColorStop(0, 'rgba(0,0,0,0.72)'); sg.addColorStop(0.6, 'rgba(0,0,0,0.42)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W * 0.6, H);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
    }

    // Progress under the active scene button.
    if (cycleOn && !hold && !paused && !still) {
      var pb = buttons.filter(function (bt) { return bt.getAttribute('aria-pressed') === 'true'; })[0];
      if (pb) pb.style.setProperty('--p', String(clamp((clock - cycleStart) / CYCLE, 0, 1)));
    }
  }

  function running() { return !still && !paused && !document.hidden; }
  function frame(t) {
    raf = 0;
    var dt = lastT ? Math.min(50, t - lastT) : 16;
    lastT = t;
    if (running()) clock += dt;
    update(running() ? dt : 0);
    draw();
    if (running()) request(); else lastT = 0;
  }
  function request() { if (!raf) raf = window.requestAnimationFrame(frame); }

  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch' || e.buttons > 0;
    request();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.on = false; request(); });
  window.addEventListener('blur', function () { pointer.on = false; });
  window.addEventListener('pointerdown', function (e) {
    if (still || paused) return;
    ripples.push({ x: e.clientX, y: e.clientY, r: 0, max: Math.max(240, Math.min(W, H) * 0.5) });
    request();
  }, { passive: true });
  window.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') pointer.on = false; });
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () { lastT = 0; request(); });
  if (reduce.addEventListener) reduce.addEventListener('change', function () { still = reduce.matches; if (still) morphStart = clock - 1e7; lastT = 0; request(); });

  makeSprites();
  resize();
  for (var r0 = 0; r0 < N; r0++) curCol[r0] = r0 % 9 === 0 ? PINK : INK;
  setScene(cycleOn ? 'core' : pageScene, 3200);
  if (still) { from.set(target.pos); cur.set(target.pos); }
  cycleStart = 0;
  request();
})();
