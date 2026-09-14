/* ===== EXTENSION PROBLEM: live position-vector diagram =====
   Geometry and orbital periods ported from Adar's mars-position-vectors.html. */
(function () {
  const root = document.getElementById('mpv');
  if (!root) return;
  const $ = id => document.getElementById(id);

  const stage = root.querySelector('.mpv-stage');
  const svg   = $('mpv-svg');
  const slider = $('mpv-day'), dayOut = $('mpv-day-value');
  const xAxis = $('mpv-xaxis'), yAxis = $('mpv-yaxis');
  const orbitE = $('mpv-orbit-e'), orbitM = $('mpv-orbit-m');
  const vES = $('mpv-v-es'), vMS = $('mpv-v-ms'), vME = $('mpv-v-me');
  const sunGlow = $('mpv-sun-glow'), sun = $('mpv-sun'), earth = $('mpv-earth'), mars = $('mpv-mars');
  const labES = $('mpv-lab-es'), labMS = $('mpv-lab-ms'), labME = $('mpv-lab-me');
  const labSun = $('mpv-lab-sun'), labEarth = $('mpv-lab-earth'), labMars = $('mpv-lab-mars');
  const labX = $('mpv-lab-x'), labY = $('mpv-lab-y');

  const T_EARTH = 365.256, T_MARS = 686.980;   /* days */

  function setLine(l, a, b) {
    l.setAttribute('x1', a.x); l.setAttribute('y1', a.y);
    l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
  }
  function setCircle(c, p, r) {
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
    if (r !== undefined) c.setAttribute('r', r);
  }
  function place(node, p) { node.style.left = p.x + 'px'; node.style.top = p.y + 'px'; }
  /* Where a label wants to sit: pushed out from `p` along `d`, far enough that its
     box clears the point by `gap` however wide the rendered math turns out. */
  function box(node, p, d, gap, pinned) {
    const w = node.offsetWidth, h = node.offsetHeight;
    const out = Math.abs(d.x) * w / 2 + Math.abs(d.y) * h / 2 + gap;
    return { node: node, x: p.x + d.x * out, y: p.y + d.y * out, w: w, h: h, pinned: !!pinned };
  }
  /* the planets and the Sun are obstacles too: they never move, labels go round them */
  function blocker(p, size) {
    return { node: null, x: p.x, y: p.y, w: size, h: size, pinned: true };
  }
  /* Then nudge apart any boxes that still overlap. Needed because when the three
     bodies line up -- at t = 0, and again at opposition -- "outside the triangle"
     has no side left to pick and several labels want the same spot. */
  function settle(boxes) {
    for (let pass = 0; pass < 14; pass++) {
      let moved = false;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.pinned && b.pinned) continue;
          const ox = (a.w + b.w) / 2 + 4 - Math.abs(a.x - b.x);
          const oy = (a.h + b.h) / 2 + 3 - Math.abs(a.y - b.y);
          if (ox <= 0 || oy <= 0) continue;
          moved = true;
          /* separate along whichever axis needs the least travel */
          const vertical = oy <= ox;
          const push = (vertical ? oy : ox) / (a.pinned || b.pinned ? 1 : 2);
          const dir = vertical ? (a.y <= b.y ? -1 : 1) : (a.x <= b.x ? -1 : 1);
          if (!a.pinned) { if (vertical) a.y += dir * push; else a.x += dir * push; }
          if (!b.pinned) { if (vertical) b.y -= dir * push; else b.x -= dir * push; }
        }
      }
      if (!moved) break;
    }
    boxes.forEach(b => { if (b.node) place(b.node, b); });
  }
  function onOrbit(c, r, a) { return { x: c.x + r * Math.cos(a), y: c.y - r * Math.sin(a) }; }

  /* pull both ends in a little so the arrowhead lands beside the planet, not under it */
  function trim(a, b, head, tail) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return [{ x: a.x + dx / L * head, y: a.y + dy / L * head },
            { x: b.x - dx / L * tail, y: b.y - dy / L * tail }];
  }
  /* A vector's label sits alongside its arrow, `frac` of the way along it and on
     the far side from `away` -- the triangle's third corner -- so the three of them
     end up outside the triangle rather than inside it. */
  function beside(node, a, b, away, frac) {
    const u = unit(a, b);
    const at = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
    let d = { x: -u.y, y: u.x };
    if (d.x * (away.x - at.x) + d.y * (away.y - at.y) > 0) d = { x: u.y, y: -u.x };
    return box(node, at, d, 7);
  }
  function unit(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.max(1e-6, Math.hypot(dx, dy));
    return { x: dx / L, y: dy / L };
  }

  let days = Number(slider.value);

  function render() {
    const width = Math.round(stage.clientWidth);
    if (width < 40) return;                       /* tab still hidden */
    const height = width < 480 ? 390 : 450;
    const c  = { x: width < 480 ? width / 2 : width * 0.46, y: height * 0.54 };
    const rM = Math.min((width - 54) / 2, (height - 70) / 2);
    const rE = rM / 1.52;
    const aE = 2 * Math.PI * days / T_EARTH;
    const aM = 2 * Math.PI * days / T_MARS;
    const E  = onOrbit(c, rE, aE);
    const M  = onOrbit(c, rM, aM);

    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.style.height = height + 'px';

    setLine(xAxis, { x: 14, y: c.y }, { x: width - 16, y: c.y });
    setLine(yAxis, { x: c.x, y: height - 14 }, { x: c.x, y: 16 });

    setCircle(orbitM, c, rM);
    setCircle(orbitE, c, rE);

    let s = trim(c, E, 7, 9); setLine(vES, s[0], s[1]);
    s = trim(c, M, 7, 9);     setLine(vMS, s[0], s[1]);
    s = trim(E, M, 9, 9);     setLine(vME, s[0], s[1]);

    setCircle(sunGlow, c, 24);
    setCircle(sun, c); setCircle(earth, E); setCircle(mars, M);

    stage.classList.toggle('narrow', width < 380);

    /* Earth sits inside the triangle, so its name goes sideways off the Sun-Earth
       arrow, on whichever side Mars is not. Mars goes straight out past its orbit,
       and the Sun's name goes opposite both arrows leaving it. */
    const uE = unit(c, E), uM = unit(c, M), uME = unit(E, M);
    const side = (uE.x * uME.y - uE.y * uME.x) > 0 ? -1 : 1;
    const bx = uE.x + uM.x, by = uE.y + uM.y, bL = Math.max(1e-6, Math.hypot(bx, by));

    settle([
      beside(labES, c, E, M, 0.55),
      beside(labMS, c, M, E, 0.45),
      beside(labME, E, M, c, 0.55),
      box(labEarth, E, { x: -uE.y * side, y: uE.x * side }, 9),
      box(labMars, M, uM, 9),
      box(labSun, c, { x: -bx / bL, y: -by / bL }, 9),
      box(labX, { x: width - 26, y: c.y - 15 }, { x: 0, y: 0 }, 0, true),
      box(labY, { x: c.x + 16, y: 26 }, { x: 0, y: 0 }, 0, true),
      blocker(c, 20), blocker(E, 18), blocker(M, 18)
    ]);

    dayOut.textContent = days + (days === 1 ? ' day' : ' days');
  }

  slider.addEventListener('input', () => { days = Number(slider.value); render(); });

  new ResizeObserver(render).observe(stage);
  /* registered before KaTeX's own DOMContentLoaded handler, so defer a frame and
     re-measure once the math has actually been typeset */
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(render));
  window.addEventListener('load', render);
  render();
})();

/* ===== EXTENSION PROBLEM: draw-your-own-model sketchpad ===== */
(function () {
  const wrap = document.getElementById('sketch1');
  if (!wrap) return;
  const canvas = document.getElementById('sketch1-canvas');
  const ctx = canvas.getContext('2d');
  let pen = '#e7ecf6';
  let strokes = [], cur = null, drawing = false;

  function setCssHeight() {
    const w = canvas.clientWidth || wrap.clientWidth;
    canvas.style.height = Math.max(240, Math.round(w * 0.6)) + 'px';
  }
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 20) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  function guide() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const cx = w / 2, cy = h / 2;
    const rM = Math.min(w, h) * 0.42, rE = rM / 1.6;
    ctx.save();
    ctx.strokeStyle = 'rgba(200,215,245,.18)';
    ctx.setLineDash([5, 6]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, rM, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, rE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
    g.addColorStop(0, 'rgba(255,205,120,.5)'); g.addColorStop(1, 'rgba(255,205,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd48a'; ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,215,245,.55)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('Sun', cx + 9, cy + 4);
    ctx.restore();
  }
  function drawStroke(s) {
    if (!s.pts.length) return;
    ctx.save();
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.pts[0].x, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
    if (s.pts.length === 1) ctx.lineTo(s.pts[0].x + 0.1, s.pts[0].y + 0.1);
    ctx.stroke(); ctx.restore();
  }
  function redraw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    guide();
    strokes.forEach(drawStroke);
    if (cur) drawStroke(cur);
  }
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function start(e) {
    e.preventDefault();
    drawing = true;
    cur = { color: pen, pts: [pos(e)] };
    if (canvas.setPointerCapture && e.pointerId != null) { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} }
    redraw();
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    cur.pts.push(pos(e));
    redraw();
  }
  function end() {
    if (!drawing) return;
    drawing = false;
    if (cur && cur.pts.length) strokes.push(cur);
    cur = null;
    redraw();
  }
  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  wrap.querySelectorAll('[data-pen]').forEach(b => {
    b.addEventListener('click', () => {
      pen = b.dataset.pen;
      wrap.querySelectorAll('[data-pen]').forEach(x => x.classList.toggle('active', x === b));
    });
  });
  wrap.querySelector('[data-undo]').addEventListener('click', () => { strokes.pop(); redraw(); });
  wrap.querySelector('[data-clear]').addEventListener('click', () => { strokes = []; cur = null; redraw(); });

  new ResizeObserver(() => { setCssHeight(); resize(); }).observe(canvas);
  setCssHeight(); resize();
  window.addEventListener('load', () => { setCssHeight(); resize(); });
})();