import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Builds the site into _site/ from the text and photo choices in content/*.json.
// Edit the words and photos in content/ (or through Pages CMS), then run: node tools/build.mjs
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '_site');
const load = name => JSON.parse(readFileSync(join(ROOT, 'content', name + '.json'), 'utf8'));
const SITE = load('site'), HOME = load('home'), ABOUT = load('about'), PROJ = load('projects'), TEAM = load('team'), CONTACT = load('contact');

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Plain text with **bold**, *italic* and [link text](address).
const fmt = s => esc(s)
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => /^(javascript|data):/i.test(u) ? t : `<a class="link" href="${u}">${t}</a>`)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const src = p => esc(String(p || '').replace(/^\/+/, ''));
const initials = n => String(n).replace(/,.*$/, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const isPh = s => /^\s*\[placeholder\]/i.test(String(s || ''));
// Text that may hold several paragraphs (blank line between). "[Placeholder] ..." text is shown greyed.
const paras = (s, cls = '') => String(s || '').split(/\n\s*\n/).map(t => t.trim()).filter(Boolean)
  .map(t => `<p class="${[cls, isPh(t) ? 'ph' : ''].filter(Boolean).join(' ')}">${fmt(t)}</p>`).join('');
const inline = s => isPh(s) ? `<span class="ph">${fmt(s)}</span>` : fmt(s);

const MAIL = esc(SITE.contactEmail);
const mailto = subject => `mailto:${MAIL}${subject ? '?subject=' + encodeURIComponent(subject) : ''}`;
const ext = u => /^https?:/i.test(u || '') ? ' target="_blank" rel="noopener"' : '';
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const down = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
const chev = '<svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 4l4 4 4-4"/></svg>';
const xIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const plus = '<span class="plus" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>';

// Contact topics: the first three keep the menu's #join, #partner and #support links working.
const topicIds = ['join', 'partner', 'support'];
const topicId = (t, i) => topicIds[i] || 'topic-' + slug(t.title);

const NAV = [
  ['index', 'Home', []],
  ['about', 'About', [['about.html#mission', 'Mission'], ['about.html#history', 'Our history'], ['about.html#affiliations', 'Affiliations']]],
  ['projects', 'Projects', [['projects.html#current', 'Current projects'], ['projects.html#past', 'Concluded projects']]],
  ['team', 'Team', [['team.html#board', 'Executive board'], ['team.html#managers', 'Project managers'], ['team.html#advisor', 'Faculty advisor']]],
  ['contact', 'Contact', [['contact.html#message', 'Send a message'], ['contact.html#mailing-list', 'Mailing list']]],
];

const brand = `<a class="brand" href="index.html" aria-label="${esc(SITE.name)} home"><span class="brand-name">${esc(SITE.name)}<small>${esc(SITE.fullName)}</small></span></a>`;

function header(cur) {
  const items = NAV.map(([id, label, sub]) => {
    const current = id === cur ? ' aria-current="page"' : '';
    const subHtml = sub.length ? `<ul class="submenu">${sub.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul>` : '';
    return `<div class="nav-item"><a class="nav-link" href="${id}.html"${current}>${label}${sub.length ? chev : ''}</a>${subHtml}</div>`;
  }).join('\n      ');
  return `<header class="site-header">
  <div class="wrap">
    ${brand}
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <nav class="nav" id="site-nav" aria-label="Main">
      ${items}
      <a class="btn small" href="contact.html#join">Join a team</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div>
        ${brand}
        <p class="about">${fmt(SITE.footerAbout)}</p>
      </div>
      <div><h2>Pages</h2><ul><li><a href="about.html">About</a></li><li><a href="projects.html">Projects</a></li><li><a href="team.html">Team</a></li><li><a href="contact.html">Contact</a></li></ul></div>
      <div><h2>Reach us</h2><ul><li><a href="contact.html#message">Contact us</a></li><li><a href="${esc(SITE.yaleConnectUrl)}"${ext(SITE.yaleConnectUrl)}>Mailing list on YaleConnect</a></li></ul></div>
    </div>
    ${SITE.photoCredits ? `<p class="credits">${fmt(SITE.photoCredits)}</p>` : ''}
  </div>
</footer>`;
}

function page({ file, cur, title, desc, ogTitle, ogDesc, comment, body }) {
  const html = `<!doctype html>
<html lang="en" class="no-js" data-type="service">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="page-type" content="service">
  <meta name="site-kind" content="other">
  <meta name="theme-color" content="#00356b">
  <meta property="og:title" content="${esc(ogTitle)}">
  <meta property="og:description" content="${esc(ogDesc)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="share.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,600..800&family=Nunito+Sans:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
<!-- ${comment} Built from content/*.json by tools/build.mjs: edit the content, not this file. -->
<a class="skip" href="#main">Skip to content</a>

${header(cur)}

<main id="main">
${body}
</main>

${footer()}
<script src="script.js"></script>
</body>
</html>
`;
  writeFileSync(join(OUT, file), html);
}

/* ---------- shared blocks ---------- */
const img = (path, alt, extra = '') => path ? `<img src="${src(path)}" alt="${esc(alt)}"${extra}>` : '';
const fullName = SITE.fullName.replace('&', 'and');

const pageHero = (h, buttons) => `  <section class="page-hero" data-enter aria-labelledby="hero-title">
    <div class="banner">${img(h.image, h.imageAlt, ' fetchpriority="high"')}</div>
    <div class="wrap">
      <div class="title-row">
        <div>
          <p class="eyebrow enter">${fmt(h.eyebrow)}</p>
          <h1 id="hero-title" class="enter">${fmt(h.title)}</h1>
        </div>
        <div>
          <p class="lede enter">${fmt(h.text)}</p>${h.after ?? ''}${buttons ? `
          <div class="actions enter">
            ${buttons}
          </div>` : ''}
        </div>
      </div>
    </div>
  </section>`;

const sectionHead = (s, id, extraText) => `<div class="section-head">
        <div>
          <p class="eyebrow">${fmt(s.eyebrow)}</p>
          <h2 id="${id}">${fmt(s.title)}</h2>
        </div>
        ${extraText ?? (s.text ? `<p>${fmt(s.text)}</p>` : '')}
      </div>`;

const closeBand = (c, buttons, id = 'close-title', sectionId = '') => `  <section${sectionId ? ` id="${sectionId}"` : ''} class="close-band" style="--h: 1" aria-labelledby="${id}">
    <div class="wrap">
      <p class="eyebrow">${fmt(c.eyebrow)}</p>
      <h2 id="${id}">${fmt(c.title)}</h2>
      <div class="actions">
        ${buttons}
      </div>
      <p class="big" aria-hidden="true">${fmt(c.big)}</p>
    </div>
  </section>`;

// Affiliations: a row of logos, each linking to the organization's own site.
const logoRow = `<ul class="logos">
        ${SITE.affiliations.map(a => {
          const inner = a.logo ? `<img src="${src(a.logo)}" alt="${esc(a.name)}" loading="lazy">` : `<span class="logo-text">${esc(a.name)}</span>`;
          const label = esc(a.description || a.name);
          return `<li>${a.url ? `<a href="${esc(a.url)}"${ext(a.url)} title="${label}">${inner}</a>` : `<span class="logo-box" title="${label}">${inner}</span>`}</li>`;
        }).join('\n        ')}
      </ul>`;

/* ---------- projects: cards and their popups ---------- */
const projId = p => 'p-' + slug(p.name);
const opener = (id, label) => `<button class="open" type="button" data-open="m-${id}" aria-haspopup="dialog">${label}</button>`;

const projectCard = (p, past, showMeta = true) => {
  const id = projId(p);
  const meta = past ? [p.started, 'Concluded'] : [p.stage, p.partner];
  return `<article class="card" id="${id}"${past ? '' : ` data-cat="${esc(p.category)}"`}><div class="photo${past ? ' develop' : ''}">${img(p.image, p.imageAlt, ' loading="lazy"')}</div>${plus}<div class="card-body"><span class="tag">${fmt(p.tag)}</span><h3>${opener(id, fmt(p.name))}</h3><p>${fmt(p.description)}</p>${showMeta ? `<div class="card-meta"><span>${fmt(meta[0])}</span><span>${fmt(meta[1])}</span></div>` : ''}</div></article>`;
};

const gallery = p => {
  const pics = (p.gallery || []).map(g => typeof g === 'string' ? g : g?.image).filter(Boolean);
  const tiles = pics.length
    ? pics.map(g => `<img src="${src(g)}" alt="" loading="lazy">`)
    : ['Photo to come', 'Photo to come', 'Photo to come'].map(t => `<div class="ph-photo"><span>${t}</span></div>`);
  return `<div class="modal-gallery">${tiles.join('')}</div>`;
};

const fact = (k, v) => v ? `<dt>${k}</dt><dd>${inline(v)}</dd>` : '';
const projectModal = (p, past) => {
  const id = projId(p);
  return `<dialog class="modal" id="m-${id}" aria-labelledby="m-${id}-title">
    <div class="modal-inner">
      <button class="modal-close" type="button" data-close aria-label="Close">${xIcon}</button>
      <div class="modal-media">
        <div class="modal-photo">${img(p.image, p.imageAlt, ' loading="lazy"')}</div>
        ${gallery(p)}
      </div>
      <div class="modal-body">
        <span class="tag">${fmt(p.tag)}</span>
        <h2 id="m-${id}-title">${fmt(p.name)}</h2>
        <p class="modal-lede">${fmt(p.description)}</p>
        <dl class="modal-facts">${past ? fact('Started', String(p.started || '').replace(/^Started\s*/i, '')) + fact('Status', 'Concluded') : fact('Stage', p.stage) + fact('Partner', p.partner)}${fact('Project manager', p.lead)}${fact('Team', p.team)}</dl>
        ${p.overview ? `<h3>Overview</h3>${paras(p.overview)}` : ''}
        ${p.need ? `<h3>Who it’s for</h3>${paras(p.need)}` : ''}
        ${p.design ? `<h3>How it works</h3>${paras(p.design)}` : ''}
        ${p.status ? `<h3>${past ? 'Outcome' : 'Where it stands'}</h3>${paras(p.status)}` : ''}
      </div>
    </div>
  </dialog>`;
};

/* ---------- people: cards and their popups ---------- */
const personId = p => slug(p.name.replace(/,.*$/, ''));
const face = (person, alt) => `<div class="avatar${alt ? ' alt' : ''}"><span aria-hidden="true">${esc(initials(person.name))}</span>${person.photo ? `<img src="${src(person.photo)}" alt="${esc(person.name)}" loading="lazy" onerror="this.remove()">` : ''}</div>`;
const projectsOf = p => (p.projects || []).filter(Boolean);
const personCard = (p, isPm) => {
  const id = personId(p);
  const projs = projectsOf(p);
  return `<article class="person" id="${id}">${face(p, isPm)}<span class="role">${fmt(p.role)}</span><h3>${opener(id, fmt(p.name))}</h3>${isPm ? `<p class="info">${projs.length ? projs.map(inline).join(', ') : ''}</p>` : ''}<span class="cue" aria-hidden="true">Read bio</span></article>`;
};
const personModal = p => {
  const id = personId(p);
  const projs = projectsOf(p);
  return `<dialog class="modal modal-person" id="m-${id}" aria-labelledby="m-${id}-title">
    <div class="modal-inner">
      <button class="modal-close" type="button" data-close aria-label="Close">${xIcon}</button>
      <div class="modal-portrait"><span aria-hidden="true">${esc(initials(p.name))}</span>${p.photo ? `<img src="${src(p.photo)}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">` : ''}</div>
      <div class="modal-body">
        <span class="tag">${fmt(p.role)}</span>
        <h2 id="m-${id}-title">${fmt(p.name)}</h2>
        <dl class="modal-facts">${p.year ? fact('Class of', p.year) : ''}${fact('College', p.college)}${fact('Major', p.major)}${projs.length ? fact(projs.length > 1 ? 'Projects' : 'Project', projs.join(', ')) : ''}</dl>
        ${paras(p.bio)}
      </div>
    </div>
  </dialog>`;
};

/* ---------- start fresh ---------- */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of ['styles.css', 'script.js', 'favicon.svg', 'share.jpg', 'img']) {
  if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f), { recursive: true });
}

/* ---------------- HOME ---------------- */
const h = HOME;
// Featured: tick "Featured" on any current or concluded project; the first three are shown.
const featured = [...PROJ.current.map(p => [p, false]), ...PROJ.past.map(p => [p, true])].filter(([p]) => p.featured).slice(0, 3);
page({
  file: 'index.html', cur: 'index',
  title: `${SITE.name} · ${fullName}`,
  desc: `${SITE.name} is a Yale student team building free, open-source assistive devices with disabled people, patients, clinicians and caregivers.`,
  ogTitle: `${SITE.name} · ${fullName}`, ogDesc: 'Free, open-source assistive technology built by Yale engineering and medical students.',
  comment: 'Kind: service (student design club) · Yale palette · Archivo / Nunito Sans · Moment: quote word-highlight.',
  body: `  <section class="hero" data-enter aria-labelledby="hero-title">
    <div class="hero-bg">${img(h.hero.image, h.hero.imageAlt, ' fetchpriority="high"')}</div>
    <div class="wrap">
      <div class="hero-copy">
        <p class="eyebrow enter">${fmt(h.hero.eyebrow)}</p>
        <h1 id="hero-title" class="enter">${fmt(h.hero.title)}</h1>
        <p class="lede enter">${fmt(h.hero.text)}</p>
        <div class="actions enter">
          <a class="btn" href="contact.html#join">Join a project team ${arrow}</a>
          <a class="btn ghost" href="projects.html">See the projects</a>
        </div>
      </div>
    </div>
  </section>

  <section style="--h: 1" aria-labelledby="about-title">
    <div class="wrap">
      <div class="split">
        <div>
          <p class="eyebrow">${fmt(h.about.eyebrow)}</p>
          <h2 id="about-title">${fmt(h.about.title)}</h2>
          <p class="lede">${fmt(h.about.text)}</p>
          <a class="more" href="about.html">Learn more about ${esc(SITE.name)} ${arrow}</a>
        </div>
        <div class="photo zoom" style="aspect-ratio:4/5">
          ${img(h.about.image, h.about.imageAlt, ' loading="lazy"')}
        </div>
      </div>
    </div>
  </section>

  <section class="ground-blue" style="--h: 1" aria-labelledby="numbers-title">
    <div class="wrap">
      <p class="eyebrow">${fmt(h.stats.eyebrow)}</p>
      <h2 id="numbers-title">${fmt(h.stats.title)}</h2>
      <p class="lede">${fmt(h.stats.text)}</p>
      <div class="stats" style="--n: ${Math.max(1, h.stats.items.length)}">
        ${h.stats.items.map(s => `<div><strong>${esc(s.number)}</strong><span>${fmt(s.label)}</span></div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="ground-paper" style="--h: 1" aria-labelledby="featured-title">
    <div class="wrap">
      ${sectionHead(h.featured, 'featured-title', `<a class="more" href="projects.html" style="margin-top:0">See all projects ${arrow}</a>`)}
      <div class="cards c3">
        ${featured.map(([p, past]) => projectCard(p, past, false)).join('\n        ')}
      </div>
    </div>
  </section>

  <section style="--h: 1" aria-labelledby="quote-title">
    <div class="wrap">
      <h2 id="quote-title" class="eyebrow" style="text-align:center">${fmt(h.mission.eyebrow)}</h2>
      <figure class="quote" style="margin:auto 0">
        <blockquote style="margin:0"><p class="statement" data-highlight>${esc(h.mission.quote)}</p></blockquote>
        <cite>${fmt(h.mission.cite)}</cite>
      </figure>
    </div>
  </section>

  <section class="ground-paper" style="--h: 1" aria-labelledby="affil-title">
    <div class="wrap">
      ${sectionHead(h.affiliations, 'affil-title')}
      ${logoRow}
    </div>
  </section>

${closeBand(h.close, `<a class="btn" href="contact.html#join">Join a project team ${arrow}</a>
        <a class="btn ghost" href="about.html">Read our history</a>`)}

  ${featured.map(([p, past]) => projectModal(p, past)).join('\n  ')}`,
});

/* ---------------- ABOUT ---------------- */
const a = ABOUT;
page({
  file: 'about.html', cur: 'about',
  title: `About · ${SITE.name}, ${fullName}`,
  desc: `${SITE.name}'s mission, its history from Yale e-NABLE to a TOM chapter, and the organizations it works with.`,
  ogTitle: `About ${SITE.name}`, ogDesc: 'Formerly Yale e-NABLE, now a TOM chapter at Yale.',
  comment: 'Moment: picture-develops (mission photograph).',
  body: `${pageHero(a.hero, `<a class="btn" href="#history">Read our history ${down}</a>
            <a class="btn ghost" href="team.html">Meet the team</a>`)}

  <section id="mission" class="ground-paper" style="--h: 1" aria-labelledby="mission-title">
    <div class="wrap">
      <div class="split rev">
        <div>
          <p class="eyebrow">${fmt(a.mission.eyebrow)}</p>
          <h2 id="mission-title">${fmt(a.mission.title)}</h2>
          ${a.mission.paragraphs.map(t => `<p class="lede">${fmt(t)}</p>`).join('\n          ')}
        </div>
        <div class="photo develop" style="aspect-ratio:4/3">
          ${img(a.mission.image, a.mission.imageAlt, ' loading="lazy"')}
        </div>
      </div>
    </div>
  </section>

  <section id="history" style="--h: 1" aria-labelledby="history-title">
    <div class="wrap">
      ${sectionHead(a.history, 'history-title')}
      <ol class="timeline">
        ${a.history.events.map(e => `<li><span class="yr">${esc(e.year)}</span><h3>${fmt(e.title)}</h3><p>${fmt(e.text)}</p></li>`).join('\n        ')}
      </ol>
    </div>
  </section>

  <section id="affiliations" class="ground-paper" style="--h: 1" aria-labelledby="affil-title">
    <div class="wrap">
      ${sectionHead(a.affiliations, 'affil-title')}
      ${logoRow}
    </div>
  </section>

${closeBand(a.close, `<a class="btn" href="contact.html">Contact us ${arrow}</a>
        <a class="btn ghost" href="projects.html">See the projects</a>`)}`,
});

/* ---------------- PROJECTS ---------------- */
const pr = PROJ;
const CATS = [['rehab', 'Rehabilitation'], ['hospital', 'Hospital care'], ['prosthetics', 'Prosthetics'], ['mobility', 'Mobility']];
const usedCats = CATS.filter(([c]) => pr.current.some(p => p.category === c));
const chips = [['all', 'All'], ...usedCats];
page({
  file: 'projects.html', cur: 'projects',
  title: `Projects · ${SITE.name}, ${fullName}`,
  desc: `The assistive technology projects ${SITE.name} is building now, and its concluded projects: ${pr.past.map(p => p.name).join(', ')}.`,
  ogTitle: `${SITE.name} projects`, ogDesc: `${pr.current.length} assistive technology projects in build, ${pr.past.length} concluded.`,
  comment: 'Moment: picture-develops (concluded projects). Each card opens a popup with the project details.',
  body: `${pageHero(pr.hero, '')}

  <section id="current" class="ground-paper" style="--h: 2" aria-labelledby="current-title">
    <div class="wrap">
      ${sectionHead(pr.currentIntro, 'current-title')}
      <div class="filters" role="group" aria-label="Filter projects by category">
        ${chips.map(([f, l], i) => `<button class="chip" type="button" data-filter="${f}" aria-pressed="${i === 0}">${l}</button>`).join('\n        ')}
      </div>
      <p class="filter-status" aria-live="polite">Showing all ${pr.current.length} projects</p>
      <div class="cards c4" id="current-grid">
        ${pr.current.map(p => projectCard(p, false)).join('\n        ')}
      </div>
    </div>
  </section>

  <section id="past" style="--h: 1" aria-labelledby="past-title">
    <div class="wrap">
      ${sectionHead(pr.pastIntro, 'past-title')}
      <div class="cards c3">
        ${pr.past.map(p => projectCard(p, true)).join('\n        ')}
      </div>
    </div>
  </section>

${closeBand(pr.close, `<a class="btn" href="contact.html#partner">Propose a project ${arrow}</a>
        <a class="btn ghost" href="team.html#managers">Meet the project managers</a>`)}

  ${[...pr.current.map(p => projectModal(p, false)), ...pr.past.map(p => projectModal(p, true))].join('\n  ')}`,
});

/* ---------------- TEAM ---------------- */
const t = TEAM;
const gridClass = n => n >= 5 ? 'c5' : n === 4 ? 'c4' : 'c3';
const adv = t.advisor;
const advId = personId(adv);
page({
  file: 'team.html', cur: 'team',
  title: `Team · ${SITE.name}, ${fullName}`,
  desc: `Meet the ${SITE.name} executive board, project managers and faculty advisor.`,
  ogTitle: `The ${SITE.name} team`, ogDesc: `${t.board.length} board members and ${t.managers.length} project managers lead ${SITE.name}.`,
  comment: 'Each person opens a popup with their bio. A person with no photo shows their initials.',
  body: `${pageHero(t.hero, '')}

  <section id="board" class="ground-paper" style="--h: 1" aria-labelledby="board-title">
    <div class="wrap">
      ${sectionHead(t.boardIntro, 'board-title')}
      <div class="cards ${gridClass(t.board.length)}">
        ${t.board.map(p => personCard(p, false)).join('\n        ')}
      </div>
    </div>
  </section>

  <section id="managers" style="--h: 1" aria-labelledby="managers-title">
    <div class="wrap">
      ${sectionHead(t.managersIntro, 'managers-title')}
      <div class="cards ${gridClass(t.managers.length)}">
        ${t.managers.map(p => personCard(p, true)).join('\n        ')}
      </div>
      <div class="advisor" id="advisor">
        ${face(adv)}
        <div>
          <span class="role" style="font-size:.74rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--blue-mid)">${fmt(adv.role)}</span>
          <h3>${opener(advId, fmt(adv.name))}</h3>
          <p>${fmt(adv.text)}</p>
        </div>
        <span class="cue" aria-hidden="true">Read bio</span>
      </div>
    </div>
  </section>

${closeBand(t.close, `<a class="btn" href="contact.html#join">Join a project team ${arrow}</a>
        <a class="btn ghost" href="projects.html">See the projects</a>`)}

  ${[...t.board, ...t.managers, adv].map(personModal).join('\n  ')}`,
});

/* ---------------- CONTACT ---------------- */
const c = CONTACT;
const endpoint = String(SITE.formEndpoint || '').trim();
page({
  file: 'contact.html', cur: 'contact',
  title: `Contact · ${SITE.name}, ${fullName}`,
  desc: `Contact ${SITE.name} to join a project team, propose a device or support the club, or join the mailing list on YaleConnect.`,
  ogTitle: `Contact ${SITE.name}`, ogDesc: 'Join a team, propose a project, or support Yale\'s assistive technology design club.',
  comment: 'Moment: type-led (the email address set large). The form opens the visitor\'s email app, or posts to a form service if one is set in Site settings.',
  body: `${pageHero({
    ...c.hero,
    after: `\n          <p class="enter" style="margin-top:20px"><a class="email-big" href="${mailto()}">${MAIL}</a></p>`,
  }, `<a class="btn" href="#message">Send a message ${down}</a>
            <a class="btn ghost" href="#mailing-list">Join the mailing list</a>`)}

  <section id="message" class="ground-paper" style="--h: 1" aria-labelledby="form-title">
    <div class="wrap">
      <div class="form-split">
        <div>
          <p class="eyebrow">${fmt(c.formIntro.eyebrow)}</p>
          <h2 id="form-title">${fmt(c.formIntro.title)}</h2>
          <p class="lede">${fmt(c.formIntro.text)}</p>
        </div>
        <form class="contact-form" action="${endpoint ? esc(endpoint) : mailto()}" method="post"${endpoint ? '' : ' enctype="text/plain"'} data-mail="${MAIL}" data-endpoint="${esc(endpoint)}">
          <fieldset class="topics">
            <legend>Topic</legend>
            ${c.topics.map((tp, i) => `<label class="topic" id="${topicId(tp, i)}"><input type="radio" name="topic" value="${esc(tp.title)}" data-subject="${esc(tp.subject || tp.title)}"${i === 0 ? ' checked' : ''}><span class="topic-title">${fmt(tp.title)}</span><span class="topic-text">${fmt(tp.text)}</span></label>`).join('\n            ')}
          </fieldset>
          <input type="hidden" name="_subject" value="${esc(c.topics[0]?.subject || '')}">
          <div class="field-row">
            <label class="field"><span>Your name</span><input type="text" name="name" autocomplete="name" required></label>
            <label class="field"><span>Your email</span><input type="email" name="email" autocomplete="email" required></label>
          </div>
          <label class="field"><span>Message</span><textarea name="message" rows="4" required></textarea></label>
          <button class="btn" type="submit">Send message ${arrow}</button>
          <p class="form-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  </section>

${closeBand(c.close, `<a class="btn" href="${esc(SITE.yaleConnectUrl)}"${ext(SITE.yaleConnectUrl)}>Join on YaleConnect ${arrow}</a>
        <a class="btn ghost" href="projects.html">See the projects</a>`, 'list-title', 'mailing-list')}`,
});

console.log('Built the site into _site/');
