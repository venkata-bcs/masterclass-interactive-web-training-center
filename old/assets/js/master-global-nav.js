/* =============================================================================
   TINITIATE MASTERCLASS ACADEMY - UNIFIED GLOBAL INTERACTIVITY
   Subjects Dropdown, In-Page Scrollspy, and Theme Synchronization
   ============================================================================= */

(function() {
  let dropdownTimeout = null;   // pending close
  let openTimeout = null;       // pending hover-intent open
  let hoverOpenedAt = 0;        // when hover last opened the menu
  // Resolve site-root links from this script's own URL so they work at any folder depth
  const NAV_SCRIPT_SRC = document.currentScript && document.currentScript.src;

  // "Why TinitiateAI" call-to-action, added to every page's header after the Subjects menu
  function injectWhyButton() {
    const links = document.querySelector('.master-menu-links');
    if (!links || links.querySelector('.why-tinitiate-btn') || !NAV_SCRIPT_SRC) return;
    const href = new URL('../../why-tinitiate.html', NAV_SCRIPT_SRC).href;
    const a = document.createElement('a');
    a.className = 'master-nav-btn why-tinitiate-btn';
    a.href = href;
    a.title = 'Why learn with TinitiateAI';
    a.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2l2.4 6.9L21 9.3l-5.2 4.4L17.5 21 12 17.3 6.5 21l1.7-7.3L3 9.3l6.6-.4z"/></svg><span>Why TinitiateAI</span>';
    if (location.href.split('#')[0] === href) a.classList.add('is-current');
    links.appendChild(a);
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

  // 1. Dropdown Toggle Function
  window.toggleSubjectsDropdown = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const dd = document.getElementById('subjectsDropdown');
    if (dd) {
      clearTimeout(dropdownTimeout);
      clearTimeout(openTimeout);
      const isOpen = dd.classList.contains('open');
      // A click right after hover opened the menu means "keep it open", not "close it"
      if (isOpen && Date.now() - hoverOpenedAt < 800) return;
      dd.classList.toggle('open', !isOpen);
      const toggle = dd.querySelector('.master-dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) {
        requestAnimationFrame(adjustMegaMenuPosition);
      }
    }
  };

  function openDropdown(dd) {
    if (dd.classList.contains('open')) return;
    dd.classList.add('open');
    hoverOpenedAt = Date.now();
    const toggle = dd.querySelector('.master-dropdown-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(adjustMegaMenuPosition);
  }
  function closeDropdown(dd) {
    clearTimeout(openTimeout);
    dd.classList.remove('open');
    const toggle = dd.querySelector('.master-dropdown-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  // Setup hover and click listeners once DOM is ready
  function initSubjectsDropdown() {
    const dd = document.getElementById('subjectsDropdown');
    if (!dd) return;

    const toggle = dd.querySelector('.master-dropdown-toggle');
    if (!toggle) return;
    const canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (canHover) {
      // Hover intent: only open when the pointer rests on the Subjects button itself,
      // so passing across the header doesn't pop the menu open
      toggle.addEventListener('mouseenter', () => {
        clearTimeout(dropdownTimeout);
        clearTimeout(openTimeout);
        openTimeout = setTimeout(() => openDropdown(dd), 180);
      });
      toggle.addEventListener('mouseleave', () => clearTimeout(openTimeout));
    }

    // Moving between the button and the open menu keeps it open
    dd.addEventListener('mouseenter', () => clearTimeout(dropdownTimeout));
    dd.addEventListener('mouseleave', () => {
      clearTimeout(openTimeout);
      if (!dd.classList.contains('open')) return;
      dropdownTimeout = setTimeout(() => closeDropdown(dd), 350); // buffer so a brief slip doesn't collapse it
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && dd.classList.contains('open')) { closeDropdown(dd); toggle.focus(); }
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', function(e) {
    const dd = document.getElementById('subjectsDropdown');
    if (dd && !dd.contains(e.target) && dd.classList.contains('open')) {
      closeDropdown(dd);
    }
  });

  // 2. In-Page Scrollspy for Right Sidebar Navigation
  document.addEventListener('DOMContentLoaded', function() {
    initSubjectsDropdown();
    injectWhyButton();
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
