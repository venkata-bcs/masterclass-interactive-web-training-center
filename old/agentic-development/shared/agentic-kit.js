// Shared engine for the Agentic Development demos (agents, agentic loops, agent swarms):
// run control with abort, operative icons (secret agents and their gear), curved flights,
// rings, beams, missiles, captions, feeds and count-up numbers.
const AgentKit = (() => {
  const $ = id => document.getElementById(id);
  const ABORT = new Error('agentic-abort');
  // ACTIVE bumps on every reset; a run captures it in CUR and stops as soon as they differ.
  let ACTIVE = 0, CUR = -1, SPEED = 1, sky = null;
  const check = () => { if (CUR !== ACTIVE) throw ABORT; };
  const wait = async ms => { await new Promise(r => setTimeout(r, ms / SPEED)); check(); };
  const rand = (a, b) => Math.round(a + Math.random() * (b - a));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const newRun = () => { ACTIVE++; if (sky) sky.innerHTML = ''; };
  const start = () => { CUR = ACTIVE; };
  const live = () => CUR === ACTIVE;

  // ---------- Icons ----------
  // Agents are secret agents: suit, tie in the kind colour, dark glasses with a glint, earpiece.
  const AGENT_KINDS = ['agent', 'cmd', 'planner', 'tester', 'exit', 'critic'];
  function agentSVG() {
    const g = (Math.random() * 3).toFixed(2);
    return `<svg viewBox="-34 -34 68 68" style="color:var(--c)">` +
      `<path d="M-26 34C-26 21-18 14-8 12H8C18 14 26 21 26 34Z" fill="#111827" stroke="currentColor" stroke-opacity=".6" stroke-width="1.4"/>` +
      `<path d="M-8 12L0 27L8 12Z" fill="#e2e8f0"/>` +
      `<path d="M-8 12L-2 25L-10 19L-13 14ZM8 12L2 25L10 19L13 14Z" fill="#1f2937"/>` +
      `<path d="M-2.2 14H2.2L3.4 24L0 29L-3.4 24Z" fill="currentColor"/>` +
      `<rect x="-4.5" y="1" width="9" height="12" rx="3" fill="#94a3b8"/>` +
      `<ellipse cx="0" cy="-8" rx="11" ry="13" fill="#cbd5e1"/>` +
      `<path d="M-11.5-8C-13-21-4-25 2-24C10-23 13-16 11.5-8C9-15 3-18-3-17C-7-16-10-13-11.5-8Z" fill="#0b1020"/>` +
      `<rect x="-10.5" y="-11" width="9.5" height="6.5" rx="2.4" fill="#020617" stroke="currentColor" stroke-width=".9"/>` +
      `<rect x="1" y="-11" width="9.5" height="6.5" rx="2.4" fill="#020617" stroke="currentColor" stroke-width=".9"/>` +
      `<path d="M-1-9H1" stroke="#020617" stroke-width="1.6"/>` +
      `<path d="M-8.5-9.4L-5.5-10.1M3-9.4L6-10.1" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.72;.78;.84;1" dur="3.2s" begin="${g}s" repeatCount="indefinite"/></path>` +
      `<path d="M-3 1.6Q0 2.6 3 1.6" stroke="#475569" stroke-width="1" fill="none" stroke-linecap="round"/>` +
      `<circle cx="11.2" cy="-5" r="1.6" fill="#e2e8f0"/><path d="M11.4-3.5C13.5 2 12 7 9 12" stroke="#e2e8f0" stroke-opacity=".75" stroke-width=".9" fill="none"/>` +
      `</svg>`;
  }
  // Their gear: skills are badges, tools are gadget cases, knowledge is a dossier, memory is microfilm.
  const GEAR = {
    skill: `<path d="M0-24L18-17V-2C18 10 10 19 0 24C-10 19-18 10-18-2V-17Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="2"/>` +
      `<path d="M0-11L3.5-3.6L11.5-2.8L5.5 2.6L7.2 10.5L0 6.5L-7.2 10.5L-5.5 2.6L-11.5-2.8L-3.5-3.6Z" fill="currentColor"/>`,
    tool: `<path d="M-7-14V-18C-7-20-5.5-21-4-21H4C5.5-21 7-20 7-18V-14" fill="none" stroke="currentColor" stroke-width="2.2"/>` +
      `<rect x="-22" y="-14" width="44" height="30" rx="5" fill="#0b1020" stroke="currentColor" stroke-width="2"/>` +
      `<path d="M-22-2H22" stroke="currentColor" stroke-opacity=".5" stroke-width="1.4"/><rect x="-5" y="-5" width="10" height="7" rx="1.5" fill="currentColor"/>` +
      `<circle cx="14" cy="9" r="2" fill="currentColor"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></circle>`,
    knowledge: `<path d="M-22-16H-6L-2-11H22V18H-22Z" fill="#0b1020" stroke="currentColor" stroke-width="2"/>` +
      `<path d="M-14 0H10M-14 5H6M-14 10H8" stroke="currentColor" stroke-opacity=".55" stroke-width="1.6"/>` +
      `<g transform="rotate(-14)"><rect x="-14" y="-10" width="28" height="9" rx="1.5" fill="#0b1020" stroke="#f43f5e" stroke-width="1.4"/>` +
      `<text x="0" y="-3.4" text-anchor="middle" font-size="6" font-weight="700" fill="#f43f5e" font-family="monospace">SECRET</text></g>`,
    memory: `<circle r="21" fill="#0b1020" stroke="currentColor" stroke-width="2"/>` +
      `<g><circle r="4" fill="currentColor"/>` + [0, 72, 144, 216, 288].map(a => `<circle cx="${(11 * Math.cos(a * Math.PI / 180)).toFixed(2)}" cy="${(11 * Math.sin(a * Math.PI / 180)).toFixed(2)}" r="4.4" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="1"/>`).join('') +
      `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="9s" repeatCount="indefinite"/></g>` +
      `<path d="M15 14L27 24" stroke="currentColor" stroke-width="5" stroke-opacity=".35" stroke-linecap="round"/>`,
    // Sealed orders (the agent's role and instructions) and a padlock (guardrails).
    role: `<rect x="-24" y="-15" width="48" height="31" rx="3" fill="#0b1020" stroke="currentColor" stroke-width="2"/><path d="M-24-13L0 4L24-13" fill="none" stroke="currentColor" stroke-width="2"/>` +
      `<circle cx="0" cy="6" r="5.5" fill="#f43f5e"/><path d="M-2 6H2" stroke="#0b1020" stroke-width="1.6"/>`,
    guard: `<path d="M-11-6V-13C-11-20-6-24 0-24C6-24 11-20 11-13V-6" fill="none" stroke="currentColor" stroke-width="3"/>` +
      `<rect x="-18" y="-7" width="36" height="29" rx="5" fill="#0b1020" stroke="currentColor" stroke-width="2"/><circle cy="5" r="4" fill="currentColor"/><path d="M0 7V14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
    // For comparisons: a plain model call (a chat bubble) and a fixed workflow (boxes on rails).
    llm: `<path d="M-22-18H22C24-18 25-17 25-15V8C25 10 24 11 22 11H-4L-14 20V11H-22C-24 11-25 10-25 8V-15C-25-17-24-18-22-18Z" fill="#0b1020" stroke="currentColor" stroke-width="2"/>` +
      [-10, 0, 10].map((x, i) => `<circle cx="${x}" cy="-3" r="3" fill="currentColor"><animate attributeName="opacity" values=".25;1;.25" dur="1.2s" begin="${i * 0.2}s" repeatCount="indefinite"/></circle>`).join(''),
    flow: `<rect x="-26" y="-9" width="14" height="14" rx="3" fill="#0b1020" stroke="currentColor" stroke-width="2"/><rect x="-7" y="-9" width="14" height="14" rx="3" fill="#0b1020" stroke="currentColor" stroke-width="2"/>` +
      `<rect x="12" y="-9" width="14" height="14" rx="3" fill="#0b1020" stroke="currentColor" stroke-width="2"/><path d="M-12-2H-7M7-2H12" stroke="currentColor" stroke-width="2"/>` +
      `<path d="M-26 13H26" stroke="currentColor" stroke-opacity=".4" stroke-width="2" stroke-dasharray="3 3"/>`
  };
  const iconSVG = kind => AGENT_KINDS.includes(kind) || !GEAR[kind] ? agentSVG()
    : `<svg viewBox="-34 -34 68 68" style="color:var(--c)">${GEAR[kind]}</svg>`;
  function makeUnit(kind, label) {
    const el = document.createElement('div');
    el.className = `op c-${kind}`;
    el.dataset.name = label;
    el.innerHTML = `<div class="bob" style="animation-delay:-${(Math.random() * 2).toFixed(2)}s">${iconSVG(kind)}</div><span class="lbl">${esc(label)}</span>`;
    return el;
  }

  // ---------- Flight ----------
  const T = p => `translate(${p.x}px, ${p.y}px) scale(${p.s}) rotate(${p.r || 0}deg)`;
  function center(el) {
    const r = el.getBoundingClientRect(), s = sky.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  }
  function spawn(kind, label, at, opts = {}) {
    const el = makeUnit(kind, label);
    el.classList.add('fly');
    if (opts.big) el.classList.add('big');
    el._p = { x: at.x, y: at.y, s: opts.s ?? 1, r: 0 };
    el.style.transform = T(el._p);
    sky.appendChild(el);
    return el;
  }
  // Moves along a quadratic curve that lifts by `arc` pixels, leaning towards the direction of travel.
  // `ctrl` overrides the curve's control point (used to run around the loop ring).
  async function fly(el, to, { s = el._p.s, dur = 1100, arc = 70, delay = 0, ctrl = null } = {}) {
    const p = el._p, N = 16, frames = [];
    const cx = ctrl ? ctrl.x : (p.x + to.x) / 2, cy = ctrl ? ctrl.y : Math.min(p.y, to.y) - arc;
    const tilt = Math.max(-12, Math.min(12, (to.x - p.x) / 26));
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      frames.push({ transform: T({ x: u * u * p.x + 2 * u * t * cx + t * t * to.x, y: u * u * p.y + 2 * u * t * cy + t * t * to.y, s: p.s + (s - p.s) * t, r: Math.sin(Math.PI * t) * tilt }) });
    }
    const a = el.animate(frames, { duration: dur / SPEED, delay: delay / SPEED, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
    el._p = { x: to.x, y: to.y, s, r: 0 };
    try { await a.finished; } catch (e) { throw ABORT; }
    check();
    el.style.transform = T(el._p);
    a.cancel();
  }
  function ring(at, color) {
    const r = document.createElement('div');
    r.className = 'sw-ring';
    r.style.cssText = `left:${at.x}px;top:${at.y}px;--c:${color}`;
    r.style.animationDuration = (0.9 / SPEED) + 's';
    sky.appendChild(r);
    setTimeout(() => r.remove(), 1000 / SPEED);
  }
  function beam(from, to) {
    const b = document.createElement('div');
    b.className = 'sw-beam';
    b.style.cssText = `left:${from.x}px;top:${from.y}px;height:${Math.max(0, to.y - from.y)}px`;
    sky.appendChild(b);
    setTimeout(() => b.remove(), 700 / SPEED);
  }
  // A glowing missile to a target, nose following the curve; explodes on impact.
  async function missile(from, to, delay = 0) {
    const m = document.createElement('div');
    m.className = 'sw-missile';
    sky.appendChild(m);
    const N = 18, frames = [];
    const cx = (from.x + to.x) / 2 + (to.x - from.x) * 0.15, cy = Math.min(from.y, to.y) - 90;
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      const x = u * u * from.x + 2 * u * t * cx + t * t * to.x, y = u * u * from.y + 2 * u * t * cy + t * t * to.y;
      const dx = 2 * u * (cx - from.x) + 2 * t * (to.x - cx), dy = 2 * u * (cy - from.y) + 2 * t * (to.y - cy);
      // Unwrap the heading so the missile never spins the long way between frames.
      let ang = Math.atan2(dy, dx);
      if (prev != null) while (ang - prev > Math.PI) ang -= 2 * Math.PI;
      if (prev != null) while (prev - ang > Math.PI) ang += 2 * Math.PI;
      prev = ang;
      frames.push({ transform: `translate(${x}px, ${y}px) rotate(${ang}rad)` });
    }
    setTimeout(() => { if (live()) ring(from, COLOR('cmd')); }, delay / SPEED);
    const a = m.animate(frames, { duration: 750 / SPEED, delay: delay / SPEED, easing: 'cubic-bezier(.55,0,.85,.55)', fill: 'both' });
    try { await a.finished; } catch (e) { throw ABORT; }
    m.remove();
    check();
    explode(to);
  }
  function explode(at) {
    ring(at, COLOR('cmd'));
    ring(at, COLOR('agent'));
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.className = 'sw-shard';
      sky.appendChild(p);
      const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.4, dist = 28 + Math.random() * 34;
      p.animate([{ transform: `translate(${at.x}px, ${at.y}px) scale(1)`, opacity: 1 }, { transform: `translate(${at.x + Math.cos(ang) * dist}px, ${at.y + Math.sin(ang) * dist}px) scale(.2)`, opacity: 0 }],
        { duration: 650 / SPEED, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.then(() => p.remove(), () => p.remove());
    }
  }
  const COLOR = k => getComputedStyle(document.documentElement).getPropertyValue('--c-' + k).trim();

  // ---------- Page chrome ----------
  function setPhase(k, what, why) {
    document.querySelectorAll('#sw-stepper li').forEach(li => {
      const i = +li.dataset.k;
      li.classList.toggle('on', i === k);
      li.classList.toggle('done', i < k);
    });
    const cap = $('sw-caption');
    cap.innerHTML = `<span class="sw-caption-what">${what}</span><span class="sw-caption-why">${why}</span>`;
    cap.classList.remove('flash'); void cap.offsetWidth; cap.classList.add('flash');
  }
  function follow(el) {
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > window.innerHeight - 20) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function line(feedId, html, cls = '', max = 5) {
    const f = $(feedId);
    const d = document.createElement('div');
    d.className = 'ln ' + cls;
    d.innerHTML = html;
    f.appendChild(d);
    while (f.children.length > max) f.firstChild.remove();
    return d;
  }
  function countUp(el) {
    const text = el.dataset.v, m = text.match(/-?\d[\d,]*(\.\d+)?/);
    // Times and zero-padded values ("07:02") would lose their format, so they stay as written.
    if (!m || text.includes(':') || /^0\d/.test(m[0])) return;
    const pre = text.slice(0, m.index), post = text.slice(m.index + m[0].length);
    const target = parseFloat(m[0].replace(/,/g, '')), dec = m[1] ? m[1].length - 1 : 0, comma = m[0].includes(',');
    const fmt = v => (comma ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec));
    const t0 = performance.now(), dur = 1200;
    const step = now => {
      // The first frame's timestamp can be slightly before t0, so clamp to avoid "-0".
      const t = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - t, 3);
      el.textContent = pre + fmt(target * e) + post;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return {
    ABORT, $, rand, esc, check, wait, newRun, start, live,
    speed: () => SPEED, setSpeed: v => { SPEED = v; }, setSky: el => { sky = el; },
    iconSVG, makeUnit, center, spawn, fly, ring, beam, missile, explode, COLOR,
    setPhase, follow, line, countUp
  };
})();
