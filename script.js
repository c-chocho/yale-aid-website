// Y-AID — shared behaviour: header state, mobile menu, the two scroll moments.
(function () {
  document.documentElement.classList.remove('no-js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header border once the page scrolls
  const header = document.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    const set = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) set(false); });
  }

  // Moment 1: statement words light up as their section scrolls through the viewport
  document.querySelectorAll('[data-highlight]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    const spans = el.querySelectorAll('.w');
    if (reduce) { spans.forEach((s) => s.classList.add('on')); return; }
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.5)));
      const n = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < n));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  });

  // Project filter chips (projects page)
  const chips = document.querySelectorAll('.chip[data-filter]');
  if (chips.length) {
    const cards = document.querySelectorAll('#current-grid .card');
    const status = document.querySelector('.filter-status');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      let n = 0;
      cards.forEach((card) => {
        const show = f === 'all' || card.dataset.cat === f;
        card.hidden = !show;
        if (show) n++;
      });
      if (status) status.textContent = f === 'all' ? `Showing all ${n} projects` : `Showing ${n} ${chip.textContent.trim().toLowerCase()} project${n === 1 ? '' : 's'}`;
    }));
  }

  // Moment 2: a photograph develops from greyscale to colour when it comes into view
  const dev = document.querySelectorAll('.develop');
  if (dev.length) {
    if (reduce || !('IntersectionObserver' in window)) dev.forEach((d) => d.classList.add('on'));
    else {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
      }), { threshold: 0.25 });
      dev.forEach((d) => io.observe(d));
    }
  }
})();
