/* Live background: a dot grid like graph paper.
   - Dots near the pointer lift, turn accent-coloured and link up, like a lens over a scatter plot.
   - Short "records" travel along the rows from left to right, like rows moving through a pipeline.
   - A click or tap sends out a ripple, the way a batch lands.
   Stays still for prefers-reduced-motion and pauses while the tab is hidden. */
(function () {
  'use strict';
  var canvas = document.createElement('canvas');
  canvas.className = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var GAP = 26, LENS = 160, PARALLAX = 0.18;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var W = 0, H = 0, dpr = 1, raf = 0, last = 0, nextPulse = 0;
  var dot = '242,239,233', accent = '255,45,149';
  var pointer = { x: -9999, y: -9999, on: false }, lens = { x: -9999, y: -9999, k: 0 };
  var pulses = [], ripples = [];

  function rgb(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v ? v.split(/\s+/).join(',') : fallback;
  }
  function readTheme() { dot = rgb('--bg-dot-rgb', dot); accent = rgb('--accent-rgb', accent); }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    request();
  }

  function spawnPulse(now) {
    var rows = Math.ceil(H / GAP) + 2;
    pulses.push({ row: Math.floor(Math.random() * rows), x: -60, speed: 0.12 + Math.random() * 0.16, len: 110 + Math.random() * 150 });
    nextPulse = now + 700 + Math.random() * 1100;
  }

  function draw(now) {
    var dt = Math.min(48, now - (last || now));
    last = now;
    var still = reduce.matches;

    // Ease the lens toward the pointer, and fade it in and out.
    lens.x += (pointer.x - lens.x) * (still ? 1 : 0.16);
    lens.y += (pointer.y - lens.y) * (still ? 1 : 0.16);
    lens.k += ((pointer.on && !still ? 1 : 0) - lens.k) * 0.08;

    if (!still) {
      if (now > nextPulse && pulses.length < 5 && !document.hidden) spawnPulse(now);
      pulses.forEach(function (p) { p.x += p.speed * dt; });
      pulses = pulses.filter(function (p) { return p.x - p.len < W + 40; });
      ripples.forEach(function (r) { r.r += 0.42 * dt; });
      ripples = ripples.filter(function (r) { return r.r < r.max; });
    }

    ctx.clearRect(0, 0, W, H);

    // Soft spotlight under the pointer.
    if (lens.k > 0.02) {
      var g = ctx.createRadialGradient(lens.x, lens.y, 0, lens.x, lens.y, 320);
      g.addColorStop(0, 'rgba(' + accent + ',' + (0.1 * lens.k) + ')');
      g.addColorStop(1, 'rgba(' + accent + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(lens.x - 320, lens.y - 320, 640, 640);
    }

    var offset = still ? 0 : -((window.scrollY * PARALLAX) % GAP);
    var cols = Math.ceil(W / GAP) + 1, rows = Math.ceil(H / GAP) + 2;
    var hot = [];
    ctx.fillStyle = 'rgba(' + dot + ',0.13)';
    ctx.beginPath();
    for (var r = 0; r < rows; r++) {
      var y = r * GAP + offset + GAP / 2;
      var rowPulses = pulses.filter(function (p) { return p.row === r; });
      for (var c = 0; c < cols; c++) {
        var x = c * GAP + GAP / 2;
        var k = 0, dx = x - lens.x, dy = y - lens.y, d = Math.sqrt(dx * dx + dy * dy);
        var kl = d < LENS ? (1 - d / LENS) * lens.k : 0;
        k = kl;
        for (var i = 0; i < rowPulses.length; i++) {
          var p = rowPulses[i], behind = p.x - x;
          if (behind >= 0 && behind < p.len) k = Math.max(k, (1 - behind / p.len) * 0.85);
        }
        for (var j = 0; j < ripples.length; j++) {
          var q = ripples[j], rd = Math.abs(Math.sqrt((x - q.x) * (x - q.x) + (y - q.y) * (y - q.y)) - q.r);
          if (rd < 22) k = Math.max(k, (1 - rd / 22) * (1 - q.r / q.max));
        }
        if (k > 0.03) {
          // Lifted dots drift slightly away from the pointer.
          var push = kl * 7 / (d || 1);
          hot.push({ x: x + dx * push, y: y + dy * push, k: k, lens: kl });
        } else {
          ctx.moveTo(x + 1.1, y);
          ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();

    // Thin links between neighbouring lifted dots inside the lens.
    var linked = hot.filter(function (h) { return h.lens > 0.35; });
    ctx.lineWidth = 1;
    for (var a = 0; a < linked.length; a++) {
      for (var b = a + 1; b < linked.length; b++) {
        var ex = linked[a].x - linked[b].x, ey = linked[a].y - linked[b].y;
        if (ex * ex + ey * ey < GAP * GAP * 2.1) {
          ctx.strokeStyle = 'rgba(' + accent + ',' + (0.32 * Math.min(linked[a].lens, linked[b].lens)) + ')';
          ctx.beginPath(); ctx.moveTo(linked[a].x, linked[a].y); ctx.lineTo(linked[b].x, linked[b].y); ctx.stroke();
        }
      }
    }
    // Neon glow on lifted dots only (a few dozen at most), so the blur stays cheap.
    ctx.shadowColor = 'rgba(' + accent + ',0.9)';
    hot.forEach(function (h) {
      ctx.shadowBlur = 10 * h.k;
      ctx.fillStyle = 'rgba(' + accent + ',' + (0.25 + 0.65 * h.k) + ')';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 1.1 + 2.1 * h.k, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Records keep flowing, so keep animating unless motion is reduced or the tab is hidden.
    if (!still && !document.hidden) request();
  }

  function request() { if (!raf) raf = window.requestAnimationFrame(function (t) { raf = 0; draw(t); }); }

  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch' || e.buttons > 0;
    request();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.on = false; });
  window.addEventListener('blur', function () { pointer.on = false; });
  window.addEventListener('pointerdown', function (e) {
    if (reduce.matches) return;
    ripples.push({ x: e.clientX, y: e.clientY, r: 0, max: Math.max(220, Math.min(W, H) * 0.45) });
    request();
  }, { passive: true });
  window.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') pointer.on = false; });
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = 0; request(); } });
  if (reduce.addEventListener) reduce.addEventListener('change', request);
  var scheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (scheme.addEventListener) scheme.addEventListener('change', function () { readTheme(); request(); });
  new MutationObserver(function () { readTheme(); request(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  readTheme();
  resize();
})();
