/* =============================================================================
   TINITIATE MASTERCLASS ACADEMY - UNIFIED GLOBAL INTERACTIVITY
   MasterClass & Demo Dropdowns, In-Page Scrollspy, and Theme Synchronization
   ============================================================================= */

(function() {
  const HOVER_OPEN_MS = 180;     // hover intent before opening
  const HOVER_CLOSE_MS = 350;    // buffer so a brief slip doesn't collapse a menu
  const DROPDOWN_IDS = ['subjectsDropdown', 'placementDropdown', 'demoDropdown', 'instructorsDropdown'];
  const toggleOf = dd => dd.querySelector('[aria-haspopup]');

  function allDropdowns() {
    return DROPDOWN_IDS.map(id => document.getElementById(id)).filter(Boolean);
  }

  function adjustMegaMenuPosition() {
    const menu = document.querySelector('#subjectsDropdown .master-dropdown-menu');
    if (!menu) return;
    // Nudge with margin-left so the CSS centering transform stays intact
    menu.style.marginLeft = '';
    // 8px gutter: matches the 10px inset the CSS already uses on phones, so nothing shifts there
    const gutter = 8;
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - gutter) {
      menu.style.marginLeft = `-${rect.right - (window.innerWidth - gutter)}px`;
    } else if (rect.left < gutter) {
      menu.style.marginLeft = `${gutter - rect.left}px`;
    }
  }

  function openDropdown(dd, viaHover) {
    allDropdowns().forEach(other => { if (other !== dd) closeDropdown(other); });
    if (dd.classList.contains('open')) return;
    dd.classList.add('open');
    if (viaHover) dd._hoverOpenedAt = Date.now();
    const toggle = toggleOf(dd);
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (dd.id === 'subjectsDropdown') requestAnimationFrame(adjustMegaMenuPosition);
  }
  function closeDropdown(dd) {
    clearTimeout(dd._openTimeout);
    clearTimeout(dd._closeTimeout);
    dd.classList.remove('open');
    const toggle = toggleOf(dd);
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  // 1. Dropdown toggles (header buttons call these via onclick)
  function toggleDropdown(e, id) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const dd = document.getElementById(id);
    if (!dd) return;
    clearTimeout(dd._closeTimeout);
    clearTimeout(dd._openTimeout);
    if (!dd.classList.contains('open')) { openDropdown(dd, false); return; }
    // A click right after hover opened the menu means "keep it open", not "close it"
    if (Date.now() - (dd._hoverOpenedAt || 0) < 800) return;
    closeDropdown(dd);
  }
  window.toggleSubjectsDropdown = e => toggleDropdown(e, 'subjectsDropdown');
  window.togglePlacementDropdown = e => toggleDropdown(e, 'placementDropdown');
  window.toggleDemoDropdown = e => toggleDropdown(e, 'demoDropdown');
  window.toggleInstructorsDropdown = e => toggleDropdown(e, 'instructorsDropdown');

  // Instructors menu: the header tag stays empty until an instructor is picked; picking one shows
  // their name plus LinkedIn / GitHub buttons. "Other instructor" takes a typed name (no profile links).
  function setSocial(a, url, label) {
    if (!a) return;
    a.hidden = !url;
    if (url) { a.href = url; a.title = label; } else { a.removeAttribute('href'); }
  }
  function showInstructor(info, selectedOpt) {
    const dd = document.getElementById('instructorsDropdown');
    if (!dd) return;
    dd.querySelectorAll('.instructor-option[data-name]').forEach(o => {
      const on = o === selectedOpt;
      o.classList.toggle('is-selected', on);
      o.setAttribute('aria-checked', String(on));
    });
    const other = dd.querySelector('.instructor-other');
    if (other) other.classList.toggle('is-selected', !selectedOpt);
    const nameEl = dd.querySelector('.inst-name');
    if (nameEl) { nameEl.textContent = info.name; nameEl.classList.remove('is-empty'); }
    const toggle = toggleOf(dd);
    if (toggle) toggle.title = info.role ? info.role.replace(/&amp;/g, '&') : info.name;
    setSocial(document.getElementById('instructorLinkedin'), info.linkedin, info.name + ' on LinkedIn');
    setSocial(document.getElementById('instructorGithub'), info.github, info.name + ' on GitHub');
    closeDropdown(dd);
  }
  window.selectInstructor = opt => showInstructor(opt.dataset, opt);
  window.selectOtherInstructor = function(e) {
    e.preventDefault();
    const input = e.target.querySelector('.instructor-other-input');
    const name = input.value.trim().replace(/\s+/g, ' ');
    if (!name) { input.focus(); return; }
    showInstructor({ name: name, role: 'Instructor', linkedin: '', github: '' }, null);
  };

  // Setup hover and keyboard listeners once DOM is ready
  function initDropdown(dd) {
    const toggle = toggleOf(dd);
    if (!toggle) return;
    const canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (canHover) {
      // Hover intent: only open when the pointer rests on the button itself,
      // so passing across the header doesn't pop the menu open
      toggle.addEventListener('mouseenter', () => {
        clearTimeout(dd._closeTimeout);
        clearTimeout(dd._openTimeout);
        dd._openTimeout = setTimeout(() => openDropdown(dd, true), HOVER_OPEN_MS);
      });
      toggle.addEventListener('mouseleave', () => clearTimeout(dd._openTimeout));
    }

    // Moving between the button and the open menu keeps it open
    dd.addEventListener('mouseenter', () => clearTimeout(dd._closeTimeout));
    dd.addEventListener('mouseleave', () => {
      clearTimeout(dd._openTimeout);
      if (!dd.classList.contains('open')) return;
      if (dd.contains(document.activeElement) && document.activeElement.matches('input')) return;
      dd._closeTimeout = setTimeout(() => closeDropdown(dd), HOVER_CLOSE_MS);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && dd.classList.contains('open')) { closeDropdown(dd); toggle.focus(); }
    });

    // Mark the menu entry for the page we're on
    const here = location.href.split('#')[0];
    dd.querySelectorAll('a.master-dropdown-item').forEach(a => {
      if (a.href.split('#')[0] === here) a.classList.add('is-current');
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', function(e) {
    allDropdowns().forEach(dd => {
      if (!dd.contains(e.target) && dd.classList.contains('open')) closeDropdown(dd);
    });
  });

  // 2. In-Page Scrollspy for Right Sidebar Navigation
  document.addEventListener('DOMContentLoaded', function() {
    allDropdowns().forEach(initDropdown);
    const inpageLinks = document.querySelectorAll('.sidebar-inpage-nav .inpage-link');
    if (inpageLinks.length === 0) return;

    const sections = [];
    inpageLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const target = document.getElementById(href.substring(1));
        if (target) {
          sections.push({ id: href.substring(1), elem: target, link: link });
        }
      }
    });

    if (sections.length === 0) return;

    function onScrollSpy() {
      const scrollPos = window.scrollY + 120;
      let activeIndex = 0;
      for (let i = 0; i < sections.length; i++) {
        const top = sections[i].elem.getBoundingClientRect().top + window.scrollY;
        if (scrollPos >= top - 20) {
          activeIndex = i;
        }
      }

      sections.forEach((sec, idx) => {
        if (idx === activeIndex) {
          sec.link.classList.add('active');
        } else {
          sec.link.classList.remove('active');
        }
      });
    }

    window.addEventListener('scroll', onScrollSpy, { passive: true });
    onScrollSpy();

    // Re-init lucide icons if available
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });
})();
