(() => {
  const body = document.body;
  const loader = document.querySelector('.loader');
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress span');
  const cursor = document.querySelector('.cursor');
  const menu = document.querySelector('.menu');
  const mobileNav = document.querySelector('.mobile-nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Intro loader: lets the first screen enter cleanly instead of appearing all at once.
  body.classList.add('is-loading');
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      loader.classList.add('is-done');
      body.classList.remove('is-loading');
      document.querySelectorAll('.hero .reveal, .hero .split-reveal').forEach(el => el.classList.add('is-visible'));
    }, reduceMotion ? 50 : 950);
  });

  // Mobile menu.
  function closeMenu() {
    mobileNav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    mobileNav.setAttribute('aria-hidden', 'true');
  }
  menu.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    mobileNav.setAttribute('aria-hidden', String(!open));
  });
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  // Scroll progress + persistent navigation.
  // The header stays visible while scrolling so every section is always one click away.
  let ticking = false;
  function updateScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? window.scrollY / max : 0;
    progress.style.height = `${pct * 100}%`;
    header.classList.toggle('scrolled', window.scrollY > 18);
    header.classList.remove('hide');
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateScroll); ticking = true; }
  }, { passive: true });
  updateScroll();

  // Reveal sections as they enter the viewport.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Active navigation follows the section currently on screen.
  // Use the actual document position instead of IntersectionObserver so the
  // active item cannot get stuck on Home while a smooth scroll is finishing.
  const navSections = [...document.querySelectorAll('[data-section][id]')];
  const navTargets = new Map(
    [...document.querySelectorAll('.navlinks a[data-nav]')].map(a => [a.dataset.nav, a])
  );
  let activeNavId = '';
  let activeNavTick = false;

  function updateActiveNav() {
    const headerOffset = header.offsetHeight + 8;
    const probe = window.scrollY + headerOffset + 24;
    let current = navSections[0];

    for (const section of navSections) {
      if (section.offsetTop <= probe) current = section;
      else break;
    }

    // The statement section sits between Home and About but has no nav item.
    // Keep Home active there until the About section itself is reached.
    let id = current?.dataset.section || 'home';
    if (id === 'statement') id = 'home';

    if (id !== activeNavId) {
      activeNavId = id;
      document.querySelectorAll('.navlinks a').forEach(a => a.classList.toggle('active', a.dataset.nav === id));
      navSections.forEach(section => section.classList.toggle('is-current', section.dataset.section === id));
    }
  }

  function scheduleActiveNav() {
    if (activeNavTick) return;
    activeNavTick = true;
    requestAnimationFrame(() => {
      updateActiveNav();
      activeNavTick = false;
    });
  }

  window.addEventListener('scroll', scheduleActiveNav, { passive: true });
  window.addEventListener('resize', scheduleActiveNav, { passive: true });
  updateActiveNav();

  // Number count-up when statistics enter the viewport.
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = target + suffix; obs.unobserve(el); return; }
      const start = performance.now();
      const duration = 1100;
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.7 });
  counters.forEach(el => counterObserver.observe(el));

  // Cursor and magnetic links for desktop.
  if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    let mx = -100, my = -100, cx = -100, cy = -100;
    window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
    function cursorLoop() {
      cx += (mx - cx) * 0.16; cy += (my - cy) * 0.16;
      cursor.style.left = `${cx}px`; cursor.style.top = `${cy}px`;
      requestAnimationFrame(cursorLoop);
    }
    cursorLoop();

    document.querySelectorAll('a,button,.tilt').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });

    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.18;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.18;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // Subtle 3D card response to pointer movement.
    document.querySelectorAll('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 3.5).toFixed(2)}deg) rotateY(${(x * 3.5).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // Mouse-wheel / scroll parallax on the hero glow.
  if (!reduceMotion) {
    const parallaxEls = document.querySelectorAll('[data-parallax]');
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      parallaxEls.forEach(el => {
        const speed = Number(el.dataset.parallax || 0);
        el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      });
    }, { passive: true });
  }

  // Smooth anchor scrolling with a fixed-header offset.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      const offset = header.offsetHeight - 1;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', `#${id}`);
      activeNavId = id;
      document.querySelectorAll('.navlinks a').forEach(a => a.classList.toggle('active', a.dataset.nav === id));
      scheduleActiveNav();
    });
  });
})();
