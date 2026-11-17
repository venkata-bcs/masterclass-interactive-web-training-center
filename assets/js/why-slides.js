// "Why Tinitiate" slideshow on the home page.
// Markup: #whySlidesTrack > .why-slide, tabs in #whySlidesTabs, arrows #whySlidesPrev / #whySlidesNext.
// Auto-advances; pauses on hover, focus, or when the tab is hidden. Supports
// arrow keys and swipe. Styles: assets/css/why-slides.css
(function () {
  const INTERVAL = 8000;

  function init() {
    const stage = document.getElementById('whySlidesTrack');
    if (!stage) return;
    const slides = [...stage.querySelectorAll('.why-slide')];
    const tabs = [...document.querySelectorAll('#whySlidesTabs .why-tab')];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let index = 0, elapsed = 0, last = performance.now(), paused = false;

    function show(next) {
      next = (next + slides.length) % slides.length;
      if (next === index) return;
      const prev = slides[index];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(() => prev.classList.remove('is-leaving'), 600);
      prev.setAttribute('aria-hidden', 'true');
      slides[next].classList.add('is-active');
      slides[next].removeAttribute('aria-hidden');
      tabs.forEach((t, i) => {
        t.classList.toggle('is-active', i === next);
        t.setAttribute('aria-selected', i === next ? 'true' : 'false');
        t.style.setProperty('--p', '0%');
      });
      index = next;
      elapsed = 0;
    }

    function tick(now) {
      const dt = now - last;
      last = now;
      if (!paused && !reduceMotion) {
        elapsed += dt;
        tabs[index].style.setProperty('--p', Math.min(elapsed / INTERVAL * 100, 100) + '%');
        if (elapsed >= INTERVAL) show(index + 1);
      }
      requestAnimationFrame(tick);
    }

    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    document.getElementById('whySlidesPrev').addEventListener('click', () => show(index - 1));
    document.getElementById('whySlidesNext').addEventListener('click', () => show(index + 1));

    const wrap = stage.closest('.why-stage');
    wrap.addEventListener('mouseenter', () => { paused = true; });
    wrap.addEventListener('mouseleave', () => { paused = false; });
    wrap.addEventListener('focusin', () => { paused = true; });
    wrap.addEventListener('focusout', () => { paused = false; });
    document.addEventListener('visibilitychange', () => { paused = document.hidden; });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { show(index + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { show(index - 1); e.preventDefault(); }
    });

    let startX = null;
    wrap.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });

    slides.forEach((s, i) => { if (i !== 0) s.setAttribute('aria-hidden', 'true'); });
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
