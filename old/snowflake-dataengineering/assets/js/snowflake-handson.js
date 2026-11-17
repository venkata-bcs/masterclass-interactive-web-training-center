/* =============================================================================
   Snowflake track - hands-on lab progress (demo.html)
   Step completion is a per-viewer convenience kept in localStorage.
   ============================================================================= */
(function () {
  const KEY = 'sf-handson-progress-v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const steps = [...document.querySelectorAll('.sf-labstep')];
    const state = load();

    function paint() {
      let done = 0;
      steps.forEach(step => {
        const on = !!state[step.dataset.step];
        step.classList.toggle('done', on);
        step.querySelector('input[type="checkbox"]').checked = on;
        if (on) done++;
      });
      document.getElementById('lab-progress-bar').style.width = (done / steps.length * 100) + '%';
      document.getElementById('lab-progress-text').textContent = `${done} of ${steps.length} steps done`;
    }

    steps.forEach(step => {
      step.querySelector('input[type="checkbox"]').addEventListener('change', e => {
        if (e.target.checked) state[step.dataset.step] = true; else delete state[step.dataset.step];
        save(state);
        paint();
      });
    });

    document.getElementById('lab-reset').addEventListener('click', () => {
      Object.keys(state).forEach(k => delete state[k]);
      save(state);
      paint();
    });

    paint();
  });
})();
