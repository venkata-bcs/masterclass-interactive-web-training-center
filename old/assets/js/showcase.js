// Showcase slideshow: dark cinematic stage with a live wireframe orb.
// Markup: #showcase > .showcase-slide (data-enter, data-orb), with #showcaseDots,
// #showcaseProgress, #showcaseCounter, #showcasePause, #showcasePrev, #showcaseNext
// and #showcaseCanvas. Styles live in assets/css/home-material.css.
// Call initShowcase() once the DOM is ready.

const SHOWCASE_INTERVAL = 8000;

// Wrap every word of a title in a mask so it can rise into view; <em> keeps the accent
function splitTitleWords(title) {
  let i = 0;
  const wrap = (text, accent) => text.split(/(\s+)/).map(part => {
    if (!part.trim()) return part;
    const inner = accent ? `<em>${part}</em>` : part;
    return `<span class="w"><span style="--i:${i++}">${inner}</span></span>`;
  }).join('');
  title.innerHTML = [...title.childNodes].map(node =>
    node.nodeType === Node.TEXT_NODE ? wrap(node.textContent, false)
      : node.tagName === 'EM' ? wrap(node.textContent, true) : node.outerHTML
  ).join('');
}

// Decode effect: random glyphs resolve left to right into the real label
function scrambleText(el) {
  const target = el.dataset.text || (el.dataset.text = el.textContent);
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_<>';
  const duration = 900;
  const start = performance.now();
  cancelAnimationFrame(el._scramble);
  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const revealed = Math.floor(p * target.length);
    el.textContent = target.split('').map((ch, n) =>
      n < revealed || ch === ' ' || ch === '|' ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]
    ).join('');
    if (p < 1) el._scramble = requestAnimationFrame(step);
  };
  el._scramble = requestAnimationFrame(step);
}

function countUp(el) {
  const target = Number(el.dataset.count);
  const duration = 1400;
  const start = performance.now();
  cancelAnimationFrame(el._count);
  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) el._count = requestAnimationFrame(step);
  };
  el._count = requestAnimationFrame(step);
}

// Live background: drifting light streaks and a breathing wireframe orb
function createShowcaseScene(canvas, reduceMotion) {
  const ctx = canvas.getContext('2d');
  // Accent arc colour as "r, g, b", from the stage's --sc-accent-rgb
  const accentRgb = getComputedStyle(canvas).getPropertyValue('--sc-accent-rgb').trim() || '254, 96, 97';
  const orb = { x: 0.5, y: 0.5, r: 0.34, tx: 0.5, ty: 0.5, tr: 0.34, energy: 1 };
  let w = 0, h = 0, dpr = 1, streaks = [], running = false, raf = 0, t = 0, last = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    streaks = Array.from({ length: Math.round(w / 60) }, () => makeStreak(true));
    if (!running) draw();
  }

  function makeStreak(anywhere) {
    const vertical = Math.random() < 0.25;
    const col = Math.floor(Math.random() * 6);
    return {
      vertical,
      x: vertical ? (col + 0.5) * w / 6 : (anywhere ? Math.random() * w : -200),
      y: vertical ? (anywhere ? Math.random() * h : -100) : Math.random() * h,
      len: vertical ? 20 + Math.random() * 50 : 60 + Math.random() * 220,
      speed: (vertical ? 20 : 30) + Math.random() * 90,
      alpha: 0.08 + Math.random() * 0.3,
    };
  }

  function drawStreaks(dt) {
    streaks.forEach((s, n) => {
      if (s.vertical) s.y += s.speed * dt; else s.x += s.speed * dt;
      if (s.x - s.len > w || s.y - s.len > h) streaks[n] = s = makeStreak(false);
      const g = s.vertical
        ? ctx.createLinearGradient(s.x, s.y - s.len, s.x, s.y)
        : ctx.createLinearGradient(s.x - s.len, s.y, s.x, s.y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.7, `rgba(255,255,255,${s.alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      if (s.vertical) ctx.fillRect(s.x - 0.5, s.y - s.len, 1, s.len);
      else ctx.fillRect(s.x - s.len, s.y - 0.75, s.len, 1.5);
    });
  }

  function drawOrb() {
    const cx = orb.x * w, cy = orb.y * h;
    const R = orb.r * Math.min(w, h * 1.15);
    // Soft inner glow
    const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25);
    glow.addColorStop(0, 'rgba(255,255,255,0.05)');
    glow.addColorStop(0.75, 'rgba(255,255,255,0.025)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();

    // Rings: great circles at different tilts, warped by layered sine noise
    const rings = 26, steps = 90, spin = t * 0.18, amp = 0.05 * orb.energy;
    ctx.lineWidth = 1;
    for (let i = 0; i < rings; i++) {
      const tilt = (i / rings) * Math.PI;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      ctx.beginPath();
      let frontness = 0;
      for (let k = 0; k <= steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        const warp = 1 + amp * Math.sin(3 * a + t * 0.9 + i * 0.7) + amp * 0.7 * Math.sin(5 * a - t * 1.3 + i * 1.9);
        const x0 = Math.cos(a) * warp, y0 = Math.sin(a) * ct * warp, z0 = Math.sin(a) * st * warp;
        const x = x0 * Math.cos(spin) + z0 * Math.sin(spin);
        const z = -x0 * Math.sin(spin) + z0 * Math.cos(spin);
        const persp = 1 / (1.9 - z * 0.35);
        const px = cx + x * R * persp * 1.9, py = cy + y0 * R * persp * 1.9;
        frontness += z;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      const a = 0.05 + 0.07 * (0.5 + frontness / steps / 2) * orb.energy;
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(a, 0.22)})`;
      ctx.stroke();
    }
    // Bright rim with a warm accent glint
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(${accentRgb}, 0.75)`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.0, -spin * 2, -spin * 2 + 0.35); ctx.stroke();

    // Side ripples like a field disturbance at the orb's equator
    for (let s = -1; s <= 1; s += 2) {
      for (let k = 0; k < 9; k++) {
        const off = (k - 4) * 4;
        const len = (14 - Math.abs(k - 4) * 2.5) * (1 + 0.3 * Math.sin(t * 2 + k));
        ctx.fillStyle = `rgba(255,255,255,${0.25 - Math.abs(k - 4) * 0.05})`;
        ctx.fillRect(s > 0 ? cx + R : cx - R - len, cy + off, len, 1);
      }
    }
  }

  function draw(now = performance.now()) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    if (!reduceMotion) t += dt;
    // Ease the orb toward the active slide's target and settle any pulse
    const k = 1 - Math.pow(0.02, dt);
    orb.x += (orb.tx - orb.x) * k;
    orb.y += (orb.ty - orb.y) * k;
    orb.r += (orb.tr - orb.r) * k;
    orb.energy += (1 - orb.energy) * k * 0.6;
    ctx.clearRect(0, 0, w, h);
    drawStreaks(reduceMotion ? 0 : dt);
    drawOrb();
    if (running) raf = requestAnimationFrame(draw);
  }

  return {
    resize,
    moveTo(x, y, r) { orb.tx = x; orb.ty = y; orb.tr = r; orb.energy = 2.6; if (reduceMotion) { Object.assign(orb, { x, y, r }); draw(); } },
    start() { if (running || reduceMotion) return; running = true; last = 0; raf = requestAnimationFrame(draw); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}

function initShowcase() {
  const root = document.getElementById('showcase');
  if (!root) return;

  const slides = [...root.querySelectorAll('.showcase-slide')];
  const dotsWrap = document.getElementById('showcaseDots');
  const bar = document.getElementById('showcaseProgress');
  const counter = document.getElementById('showcaseCounter');
  const pauseBtn = document.getElementById('showcasePause');
  const rulerMarks = root.querySelectorAll('.showcase-ruler');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 900px)');
  const scene = createShowcaseScene(document.getElementById('showcaseCanvas'), reduceMotion);
  const pad = (n) => String(n).padStart(2, '0');
  let index = 0;
  let paused = reduceMotion;
  let hovering = false;
  let started = 0;
  let elapsed = 0;

  root.querySelectorAll('.showcase-title').forEach(splitTitleWords);
  root.querySelectorAll('[data-fx="pop"], [data-fx="slide"], [data-fx="flip"], [data-fx="wipe"], [data-fx="scatter"]').forEach(group =>
    [...group.children].forEach((child, i) => child.style.setProperty('--i', i))
  );

  dotsWrap.innerHTML = slides.map((s, i) =>
    `<button type="button" class="showcase-dot" role="tab" aria-label="Slide ${i + 1}: ${s.querySelector('.showcase-title').textContent.trim()}" aria-selected="${i === 0}">${pad(i + 1)}</button>`
  ).join('');
  const dots = [...dotsWrap.children];

  // Centre the orb behind the slide's visual (or its copy on centred slides)
  function placeOrb(slide) {
    const anchor = slide.querySelector('.showcase-visual > *') || slide.querySelector('.showcase-copy');
    // Offsets ignore the slide's entrance transform, so this is its resting position
    let left = anchor.offsetWidth / 2, top = anchor.offsetHeight / 2;
    for (let el = anchor; el && el !== root; el = el.offsetParent) { left += el.offsetLeft; top += el.offsetTop; }
    const x = left / root.offsetWidth;
    const y = top / root.offsetHeight;
    scene.moveTo(x, y, narrow.matches ? 0.3 : Number(slide.dataset.orb));
  }

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      s.classList.toggle('is-active', n === index);
      s.setAttribute('aria-hidden', n === index ? 'false' : 'true');
    });
    dots.forEach((d, n) => d.setAttribute('aria-selected', n === index ? 'true' : 'false'));
    counter.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
    rulerMarks.forEach(r => r.style.setProperty('--p', index / (slides.length - 1)));
    const slide = slides[index];
    placeOrb(slide);
    if (!reduceMotion) {
      slide.querySelectorAll('[data-fx="scramble"]').forEach(scrambleText);
      slide.querySelectorAll('[data-count]').forEach(countUp);
    }
    elapsed = 0;
    started = performance.now();
  }

  function tick(now) {
    if (!paused && !hovering && !document.hidden) {
      elapsed += now - started;
      if (elapsed >= SHOWCASE_INTERVAL) show(index + 1);
    }
    started = now;
    bar.style.width = `${Math.min(elapsed / SHOWCASE_INTERVAL, 1) * 100}%`;
    requestAnimationFrame(tick);
  }

  function setPaused(value) {
    paused = value;
    pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    pauseBtn.querySelector('.ic-pause').hidden = paused;
    pauseBtn.querySelector('.ic-play').hidden = !paused;
  }

  document.getElementById('showcasePrev').addEventListener('click', () => show(index - 1));
  document.getElementById('showcaseNext').addEventListener('click', () => show(index + 1));
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  dots.forEach((d, n) => d.addEventListener('click', () => show(n)));

  root.addEventListener('mouseenter', () => { hovering = true; });
  root.addEventListener('mouseleave', () => { hovering = false; });
  root.addEventListener('focusin', () => { hovering = true; });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) hovering = false; });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  // Touch swipe
  let touchX = null;
  root.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // Only animate the canvas while the stage is on screen
  new ResizeObserver(() => { scene.resize(); placeOrb(slides[index]); }).observe(root);
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? scene.start() : scene.stop())).observe(root);

  setPaused(paused);
  show(0);
  requestAnimationFrame(tick);
}
