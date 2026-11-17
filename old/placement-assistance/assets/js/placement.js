/* =============================================================================
   PLACEMENT ASSISTANCE: shared page behaviour
   Scrollspy for "On this page", myth/fact flip cards, action-plan checklist
   (saved in this browser), the readiness check on the hub, reveal animations.
   ============================================================================= */
(function () {
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: progress just isn't saved */ } }
  };

  // Reveal sections as they scroll into view
  const reveals = document.querySelectorAll('.pa-reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // "On this page" scrollspy
  const tocLinks = [...document.querySelectorAll('.pa-toc a[href^="#"]')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) tocLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-30% 0px -60% 0px' });
    tocLinks.forEach(a => { const t = document.querySelector(a.getAttribute('href')); if (t) spy.observe(t); });
  }

  // Myth / fact flip cards
  document.querySelectorAll('.pa-myth').forEach(card => {
    const flip = () => card.classList.toggle('open');
    card.addEventListener('click', flip);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  });

  // Action-plan checklist with saved progress
  document.querySelectorAll('.pa-check[data-key]').forEach(list => {
    const key = 'pa-plan:' + list.dataset.key;
    const boxes = [...list.querySelectorAll('input[type="checkbox"]')];
    const saved = store.get(key) || [];
    boxes.forEach((b, i) => { b.checked = !!saved[i]; });
    const score = document.querySelector(`[data-score-for="${list.dataset.key}"]`);
    const bar = document.querySelector(`[data-bar-for="${list.dataset.key}"]`);
    const party = document.querySelector(`[data-celebrate-for="${list.dataset.key}"]`);
    const update = () => {
      const done = boxes.filter(b => b.checked).length;
      if (score) score.textContent = `${done} / ${boxes.length} done`;
      if (bar) bar.style.width = (done / boxes.length * 100) + '%';
      if (party) party.classList.toggle('show', done === boxes.length);
      store.set(key, boxes.map(b => b.checked));
    };
    boxes.forEach(b => b.addEventListener('change', update));
    update();
  });

  // Hub: overall progress across every topic's action plan
  const overall = document.querySelectorAll('[data-overall]');
  if (overall.length) {
    overall.forEach(el => {
      const keys = el.dataset.overall.split(',');
      let done = 0, total = 0;
      keys.forEach(k => {
        const [slug, n] = k.split(':');
        const saved = store.get('pa-plan:' + slug) || [];
        done += saved.filter(Boolean).length;
        total += +n;
      });
      el.querySelector('b').textContent = `${done} / ${total}`;
      el.querySelector('.pa-bar > div').style.width = (total ? done / total * 100 : 0) + '%';
    });
  }

  // Hub: placement readiness check
  const quiz = document.getElementById('paQuiz');
  if (quiz) {
    const rows = [...quiz.querySelectorAll('label')];
    const answers = store.get('pa-readiness') || [];
    const ring = document.getElementById('paRing');
    const msg = document.getElementById('paScoreMsg');
    const render = () => {
      rows.forEach((row, i) => row.querySelectorAll('button').forEach(b => b.classList.toggle('on', answers[i] === b.dataset.v)));
      const yes = answers.filter(a => a === 'y').length;
      const pct = Math.round(yes / rows.length * 100);
      ring.style.setProperty('--p', pct);
      ring.querySelector('span').textContent = pct + '%';
      const answered = answers.filter(Boolean).length;
      msg.textContent = answered < rows.length
        ? `Answer all ${rows.length} to see your plan (${answered} done).`
        : pct >= 80 ? 'You are interview-ready. Start applying daily and keep practising mock interviews.'
        : pct >= 50 ? 'Good base! Fix the "No" items first: each one links to a guide below.'
        : 'No tension: everyone starts somewhere. Begin with Resume Prep and Confidence & Mindset this week.';
    };
    rows.forEach((row, i) => row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      answers[i] = b.dataset.v;
      store.set('pa-readiness', answers);
      render();
    })));
    render();
  }
})();
