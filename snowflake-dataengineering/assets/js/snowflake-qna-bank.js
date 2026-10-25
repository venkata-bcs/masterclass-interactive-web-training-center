/* =============================================================================
   Snowflake track - interview Q&A bank page (interview-qna.html)
   Search, topic/level filters, interview mode (blurred answers), random pick.
   ============================================================================= */
(function () {
  const $ = id => document.getElementById(id);
  const state = { topic: '', level: '', text: '', interview: false };

  function plain(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent.toLowerCase();
  }

  function init() {
    const all = window.SF_QNA || [];
    all.forEach(q => { q._text = (plain(q.q) + ' ' + plain(q.a) + ' ' + q.topic).toLowerCase(); });

    const topics = [...new Set(all.map(q => q.topic))];
    const levels = ['beginner', 'intermediate', 'advanced'];
    $('qb-summary').innerHTML =
      `<span class="sf-chip"><i data-lucide="list"></i> ${all.length} questions</span>` +
      `<span class="sf-chip"><i data-lucide="folder"></i> ${topics.length} topics</span>` +
      levels.map(l => `<span class="sf-chip">${all.filter(q => q.level === l).length} ${l}</span>`).join('');

    function renderChips() {
      const chip = (topic, label, n) => {
        const safe = window.SF.escapeHtml(topic);
        return `<button type="button" data-topic="${safe}" aria-pressed="${state.topic === topic}">${window.SF.escapeHtml(label)}<span class="n">${n}</span></button>`;
      };
      $('qb-topics').innerHTML = chip('', 'All topics', all.length) +
        topics.map(t => chip(t, t, all.filter(q => q.topic === t).length)).join('');
    }

    function visible() {
      return all.filter(q =>
        (!state.topic || q.topic === state.topic) &&
        (!state.level || q.level === state.level) &&
        (!state.text || state.text.split(/\s+/).every(w => q._text.includes(w))));
    }

    function render() {
      const items = visible();
      const list = $('qb-list');
      list.classList.toggle('sf-interview', state.interview);
      list.innerHTML = items.length
        ? items.map(q => window.SF.renderQa(q, { showTopic: !state.topic })).join('')
        : '<div class="sf-empty">No questions match. Try fewer words or another topic.</div>';
      $('qb-count').textContent = `Showing ${items.length} of ${all.length}`;
      window.SF.enhanceCode(list);
      if (window.lucide) window.lucide.createIcons();
    }

    $('qb-topics').addEventListener('click', e => {
      const b = e.target.closest('button[data-topic]');
      if (!b) return;
      state.topic = b.dataset.topic; // dataset is already entity-decoded
      renderChips();
      render();
    });
    $('qb-search').addEventListener('input', e => { state.text = e.target.value.trim().toLowerCase(); render(); });
    $('qb-level').addEventListener('change', e => { state.level = e.target.value; render(); });

    $('qb-interview').addEventListener('click', e => {
      state.interview = !state.interview;
      e.currentTarget.setAttribute('aria-pressed', String(state.interview));
      e.currentTarget.classList.toggle('primary', state.interview);
      render();
    });
    // In interview mode, a click on the blurred answer reveals it
    $('qb-list').addEventListener('click', e => {
      if (!state.interview) return;
      const body = e.target.closest('.sf-qa-body');
      if (body) body.parentElement.classList.add('revealed');
    });

    $('qb-expand').addEventListener('click', () => {
      const boxes = [...$('qb-list').querySelectorAll('details')];
      const open = !boxes.every(d => d.open);
      boxes.forEach(d => { d.open = open; });
    });

    $('qb-random').addEventListener('click', () => {
      const boxes = [...$('qb-list').querySelectorAll('details')];
      if (!boxes.length) return;
      boxes.forEach(d => { d.open = false; d.classList.remove('revealed'); });
      const pick = boxes[Math.floor(Math.random() * boxes.length)];
      pick.open = true;
      pick.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    renderChips();
    render();

    // Deep link: interview-qna.html#q-tt-4
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash) {
      const target = document.getElementById(hash);
      if (target && target.tagName === 'DETAILS') {
        target.open = true;
        target.scrollIntoView({ block: 'center' });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
