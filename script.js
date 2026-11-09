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

  // Popups: project and person cards open a <dialog> on the same page.
  // The address bar gets #card-id so a popup can be linked to directly.
  const dialogs = document.querySelectorAll('dialog.modal');
  if (dialogs.length) {
    const openModal = (dlg) => {
      if (!dlg || dlg.open) return;
      dlg.showModal();
      document.documentElement.classList.add('modal-open');
      const id = dlg.id.replace(/^m-/, '');
      history.replaceState(null, '', '#' + id);
    };
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open]');
      if (btn) { e.preventDefault(); openModal(document.getElementById(btn.dataset.open)); return; }
      const card = e.target.closest('.advisor');
      if (card && !e.target.closest('a')) { const b = card.querySelector('[data-open]'); if (b) openModal(document.getElementById(b.dataset.open)); }
    });
    // Tidy up after a popup closes (safe to run more than once).
    const cleanup = (dlg) => {
      if (dlg.open) return;
      document.documentElement.classList.remove('modal-open');
      if (location.hash === '#' + dlg.id.replace(/^m-/, '')) history.replaceState(null, '', location.pathname + location.search);
    };
    const closeModal = (dlg) => { if (dlg.open) dlg.close(); cleanup(dlg); };
    dialogs.forEach((dlg) => {
      dlg.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) { closeModal(dlg); return; }
        // A click on the dark backdrop (outside the box) closes it
        const r = dlg.getBoundingClientRect();
        if (e.target === dlg && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) closeModal(dlg);
      });
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(dlg); });
      dlg.addEventListener('close', () => cleanup(dlg));
    });
    const fromHash = () => { const id = decodeURIComponent(location.hash.slice(1)); if (id) openModal(document.getElementById('m-' + id)); };
    fromHash();
    window.addEventListener('hashchange', fromHash);
  }

  // Contact form: pick a topic, then send. With a form service set in Site settings the message
  // is posted there; otherwise the visitor's email app opens with everything filled in.
  const form = document.querySelector('.contact-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const subjectField = form.querySelector('[name="_subject"]');
    const pick = () => {
      const id = location.hash.slice(1);
      const label = id && form.querySelector(`.topic#${CSS.escape(id)}`);
      if (label) label.querySelector('input').checked = true;
      sync();
    };
    const sync = () => { const r = form.querySelector('[name="topic"]:checked'); if (r && subjectField) subjectField.value = r.dataset.subject; };
    form.addEventListener('change', sync);
    pick();
    window.addEventListener('hashchange', pick);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const d = new FormData(form);
      const topic = form.querySelector('[name="topic"]:checked');
      const subject = topic ? topic.dataset.subject : 'Hello';
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        status.className = 'form-status'; status.textContent = 'Sending…';
        try {
          const res = await fetch(endpoint, { method: 'POST', body: d, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(res.status);
          form.reset(); sync();
          status.className = 'form-status ok'; status.textContent = 'Thanks! Your message was sent. We’ll reply by email.';
        } catch (err) {
          status.className = 'form-status'; status.innerHTML = `That didn’t send. Please email us at <a class="link" href="mailto:${form.dataset.mail}">${form.dataset.mail}</a>.`;
        }
        return;
      }
      const body = `${d.get('message')}\n\n${d.get('name')}\n${d.get('email')}`;
      window.location.href = `mailto:${form.dataset.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.className = 'form-status'; status.innerHTML = `Your email app should open with the message ready to send. If it doesn’t, email us at <a class="link" href="mailto:${form.dataset.mail}">${form.dataset.mail}</a>.`;
    });
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
