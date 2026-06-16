/* ── PALMA SOLA BOTANICAL PARK · SHARED JS v2 ── */

/* ============================================================
   PSBP LINK ROUTER  —  one place decides how every link behaves
     • internal  → same window   (your own pages)
     • external  → new tab       (other websites)
     • document  → viewer.html   (PDFs & PUBLISHED Google Docs/
                                   Sheets/Slides), framed in-site
     • direct    → mailto: / tel:, opened natively
   Usage:
     PSBP.linkTag(url, label, { title, back, className, style })
     PSBP.linkAttrs(url, { title, back })  → { href, target, rel, kind }
     PSBP.linkKind(url)                     → 'internal'|'external'|'document'|'direct'
     PSBP.rowLink(row)                      → { url, text }  (reads new or legacy column names)
   ============================================================ */
window.PSBP = window.PSBP || {};
(function (P) {

  P.linkKind = function (url) {
    var u = (url || '').trim();
    if (!u) return 'internal';
    if (/^(mailto:|tel:)/i.test(u)) return 'direct';
    if (/\.pdf($|[?#])/i.test(u)) return 'document';
    if (/docs\.google\.com\/.+\/pub(html)?($|[?#])/i.test(u)) return 'document';
    if (/^https?:\/\//i.test(u)) {
      try { if (new URL(u).host === location.host) return 'internal'; } catch (e) {}
      return 'external';
    }
    return 'internal';
  };

  P.linkAttrs = function (url, opts) {
    opts = opts || {};
    var u = (url || '').trim();
    var kind = P.linkKind(u);
    if (kind === 'document') {
      var back = opts.back || (location.pathname.split('/').pop() || '');
      var href = 'viewer.html?url=' + encodeURIComponent(u) +
                 '&title=' + encodeURIComponent(opts.title || 'Document') +
                 (back ? '&back=' + encodeURIComponent(back) : '');
      return { href: href, target: '', rel: '', kind: kind };
    }
    if (kind === 'external') {
      return { href: u, target: '_blank', rel: 'noopener', kind: kind };
    }
    return { href: u, target: '', rel: '', kind: kind }; // internal + direct
  };

  P.linkTag = function (url, label, opts) {
    opts = opts || {};
    var a = P.linkAttrs(url, opts);
    var attrs = 'href="' + a.href + '"';
    if (a.target)        attrs += ' target="' + a.target + '"';
    if (a.rel)           attrs += ' rel="' + a.rel + '"';
    if (opts.className)  attrs += ' class="' + opts.className + '"';
    if (opts.style)      attrs += ' style="' + opts.style + '"';
    return '<a ' + attrs + '>' + (label == null ? '' : label) + '</a>';
  };

  P.rowLink = function (row) {
    row = row || {};
    return {
      url:  ((row.link_url || row.pdf_url || row.link || '') + '').trim(),
      text: row.link_text || row.pdf_link_text || ''
    };
  };

})(window.PSBP);

const INAT_PROJECT = 'palma-sola-botanical-park';
const SHEET_ID     = '12gRB-c4gND8qJWPmwBoV2X4adqTfRROYHtA8jR4-kS4';

// Sheet tab GIDs — update if Bev renames tabs
const TAB = {
  events:        992316234,
  classes:       141740803,
  series:        926436540,
  volunteer:     269225929,
  announcements: 673905300,
  newsletters:   1749891854,
  news:          195499912,
  venues:        1744975586,
  wedding_calendar: 1260078193,
  wedding_gallery:  874456476,
};

// display filter: which values should appear on the website
const WEB_DISPLAY = new Set(['web', 'both']);

// ── FEATURED ORDER ────────────────────────────────────────────
// The "biggies" that lead the default (un-searched) grid, in this order.
// Everything else follows in PSBP-ID order. List PSBP IDs exactly.
// Searching or filtering uses relevance instead — featured items just
// float to the top of whatever pool is showing.
// Leave an array empty to fall back to plain ID order.
const FEATURED_PLANTS = [
  'PSBP-00011', // Baobab
  'PSBP-00004', // Silk Floss Tree
  'PSBP-00003', // Buccaneer Palm
  'PSBP-00007', // Jacaranda
  'PSBP-00001', // Tree Crinum
];
const FEATURED_WILDLIFE = [
  'PSBP-99983', // Bald Eagle
  'PSBP-99987', // Roseate Spoonbill
  'PSBP-99982', // Osprey
  'PSBP-99971', // Florida Zebra Longwing (state butterfly)
  'PSBP-99977', // Yellow-crowned Night Heron
];

// Float featured IDs to the front of a list, in the order listed above.
// Unknown IDs are ignored; non-featured items keep their existing order.
function orderByFeatured(list, featuredIds) {
  const rank = new Map(featuredIds.map((id, i) => [id, i]));
  return list.slice().sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
    const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
    return ra - rb; // stable sort keeps non-featured in their original order
  });
}

// ── SHEET FETCH HELPER ────────────────────────────────────────
// Column-header tokens seen across the live tabs. Used to LOCATE the header row by
// its CONTENT rather than trusting a fixed row index — so an inserted row, a stray
// blank, or a Google Sheets "Table" wrapper can't silently shove the feed off its
// rails (that exact thing took the News feed dark on 2026-06-14).
const KNOWN_HEADERS = new Set([
  'display','date','pinned','headline','subhead','blurb','hero_image','intro',
  'image1','image1_caption','aside','body2','title','role','name','bio','body',
  'description','photo_url','link','link_text','url','time','start','end',
  'location','status','note','category','tags',
  // events / classes / series model (see EVENTS_DATA_MODEL.md)
  'series','weekday','day','instructor','link_url','registration_url','cost',
  'fundraiser','closes_park','active','active_from','active_to',
  'flyer_url','flyer_text'
]);
const normHeader = s => (s || '').trim().toLowerCase().replace(/\s+/g, '_');

async function fetchTab(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Sheet tab ${gid} failed`);
  const text = await resp.text();
  const lines = text.trim().split('\n');

  // Convention: [section title] / [column headers] / [hint] / data…
  // Find the header row by content (the row with the most cells matching known
  // column names) instead of assuming it's always line 2. If rows shift up or down,
  // this self-corrects; data is taken from two rows below it (skipping the hint row).
  let headerIdx = 1, best = 0;
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const hits = parseCSVLine(lines[i]).map(normHeader).filter(c => KNOWN_HEADERS.has(c)).length;
    if (hits > best) { best = hits; headerIdx = i; }
  }
  if (best < 2) headerIdx = 1; // not confident → fall back to the documented layout

  const headers = parseCSVLine(lines[headerIdx]).map(normHeader);
  return lines.slice(headerIdx + 2) // skip the hint row directly beneath the header
    .map(line => {
      const vals = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
      return obj;
    })
    .filter(r => Object.values(r).some(v => v)); // skip blank rows
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function isWebVisible(row) {
  const d = (row.display || '').toLowerCase().trim();
  return WEB_DISPLAY.has(d);
}

// ── NAV HTML ─────────────────────────────────────────────────
const NAV_HTML = `
<nav id="site-nav">
  <ul class="nav-links">
    <li><a href="index.html">Home</a></li>
    <li><a href="nature.html">Nature</a></li>
    <li><a href="visit.html">Visit</a></li>
    <li><a href="events.html">Events</a></li>
    <li><a href="venue.html">Venue</a></li>
    <li><a href="volunteer.html">Volunteer</a></li>
    <li><a href="members.html">Members</a></li>
    <li><a href="contact.html">About</a></li>
  </ul>
  <a href="index.html" class="nav-logo">
    <img src="images/white_PSBP_logo.png" alt="Palma Sola Botanical Park">
  </a>
  <button class="nav-hamburger" id="navHamburger" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
</nav>
<div class="nav-mobile" id="navMobile">
  <a href="index.html">Home</a>
  <a href="nature.html">Nature</a>
  <a href="visit.html">Visit</a>
  <a href="events.html">Events</a>
  <a href="venue.html">Venue</a>
  <a href="volunteer.html">Volunteer</a>
  <a href="members.html">Members</a>
  <a href="contact.html">About</a>
</div>`;

// ── FOOTER HTML ───────────────────────────────────────────────
const FOOTER_HTML = `
<footer id="site-footer">
  <div class="footer-inat" id="footerInatStrip" style="display:none">
    <div class="footer-inat-stats">
      <div class="footer-inat-stat"><strong id="fTotal" class="pulse">—</strong><span>Observations</span></div>
      <div class="footer-inat-stat"><strong id="fSpecies" class="pulse">—</strong><span>Species</span></div>
      <div class="footer-inat-stat"><strong id="fObservers" class="pulse">—</strong><span>Observers</span></div>
      <div class="footer-inat-stat"><strong id="fWeek" class="pulse">—</strong><span>This Week</span></div>
    </div>
    <a href="https://www.inaturalist.org/projects/palma-sola-botanical-park" target="_blank" rel="noopener" class="inat-bar-link">
      📷 Palma Sola on iNaturalist →
    </a>
  </div>
  <div class="footer-grid">
    <div class="footer-col footer-brand">
      <img src="images/white_PSBP_logo.png" alt="PSBP" style="height:44px;opacity:.85;margin-bottom:.65rem">
      <p>A 501(c)(3) nonprofit botanical park on the shore of Palma Sola Bay.<br>
      Free every day. No government funding. Powered by community.</p>
      <div class="social-links" style="margin-top:.9rem">
        <a href="https://www.facebook.com/people/Palma-Sola-Botanical-Park/100064517386906/" target="_blank" rel="noopener" class="social-link">f</a>
        <a href="https://www.instagram.com/palmasolabotanical/" target="_blank" rel="noopener" class="social-link">ig</a>
        <a href="https://www.inaturalist.org/projects/palma-sola-botanical-park" target="_blank" rel="noopener" class="social-link">iN</a>
      </div>
    </div>
    <div class="footer-col">
      <h4>Explore</h4>
      <ul>
        <li><a href="nature.html">Nature at PSBP</a></li>
        <li><a href="nature.html#plants">Plant Collection</a></li>
        <li><a href="nature.html#wildlife">Wildlife</a></li>
        <li><a href="news.html">Park News</a></li>
        <li><a href="visit.html#nursery">Hidden Garden Nursery</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Visit</h4>
      <ul>
        <li><a href="visit.html">Hours & Directions</a></li>
        <li><a href="events.html">Events & Classes</a></li>
        <li><a href="venue.html">Venue Rentals</a></li>
        <li><a href="venue.html#art">Art in the Park</a></li>
        <li><a href="visit.html#rarefruit">Rare Fruit Trail</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Support</h4>
      <ul>
        <li><a href="members.html#donate">Donate</a></li>
        <li><a href="members.html">Membership</a></li>
        <li><a href="volunteer.html">Volunteer</a></li>
        <li><a href="contact.html">About</a></li>
        <li><a href="https://palmasolabp.org/wp-content/uploads/2024/08/Photo-Policy.pdf" target="_blank" rel="noopener">Photo Policy</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2025 Palma Sola Botanical Park Foundation, Inc. · 9800 17th Ave NW, Bradenton FL 34209</span>
    <span style="color:rgba(255,255,255,.3)">Free. Always.</span>
  </div>
</footer>`;

// ── INAT BAR HTML ─────────────────────────────────────────────
const INAT_BAR_HTML = `
<div id="inat-bar">
  <div class="inat-bar-stat"><span class="inat-bar-num pulse" id="barTotal">—</span><span class="inat-bar-lbl">Observations</span></div>
  <div class="inat-bar-stat"><span class="inat-bar-num pulse" id="barSpecies">—</span><span class="inat-bar-lbl">Species</span></div>
  <div class="inat-bar-stat"><span class="inat-bar-num pulse" id="barWeek">—</span><span class="inat-bar-lbl">This Week</span></div>
  <div class="inat-bar-stat" style="display:flex;flex-direction:column;gap:.3rem">
    <span class="inat-bar-lbl">Latest</span>
    <div class="inat-photos" id="barPhotos"></div>
  </div>
  <a href="https://www.inaturalist.org/projects/palma-sola-botanical-park" target="_blank" rel="noopener" class="inat-bar-link">Join the project →</a>
</div>`;

// ── INJECT SHARED ELEMENTS ────────────────────────────────────
function injectShared(opts = {}) {
  // Detect if we're in a subfolder (e.g. /plants/) and prefix links accordingly
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const repoName = 'ReworkDemo';
  const repoIdx = pathParts.indexOf(repoName);
  // Only treat as subfolder if there's a directory segment between the repo and the file
  // e.g. /ReworkDemo/plants/PSBP-00001.html → inSubfolder = true
  // e.g. /ReworkDemo/nature.html → inSubfolder = false
  const inSubfolder = repoIdx >= 0 && pathParts.length > repoIdx + 2;
  const base = inSubfolder ? '../' : '';

  // Replace relative paths in NAV and FOOTER with correct base
  const fixPaths = html => html
    .replace(/href="(?!http|#|\/\/|mailto:|tel:|\.\.\/|\/[^"])([^"]+)"/g, (m, p) => `href="${base}${p}"`)
    .replace(/src="(?!http|\/\/|data:|\.\.\/|\/[^"])([^"]+)"/g, (m, p) => `src="${base}${p}"`);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap';
  document.head.appendChild(link);

  const navDiv = document.getElementById('nav-placeholder');
  if (navDiv) navDiv.outerHTML = fixPaths(NAV_HTML);

  if (opts.inatBar) {
    const barDiv = document.getElementById('inat-bar-placeholder');
    if (barDiv) barDiv.outerHTML = fixPaths(INAT_BAR_HTML);
  }

  const footDiv = document.getElementById('footer-placeholder');
  if (footDiv) footDiv.outerHTML = fixPaths(FOOTER_HTML);

  // Show footer iNat stats strip only on Nature and Home pages
  if (opts.inatFooter) {
    const strip = document.getElementById('footerInatStrip');
    if (strip) strip.style.display = '';
  }

  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#site-nav a, #navMobile a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href.endsWith(path)) a.classList.add('active');
  });

  // Use document-level delegation for hamburger — works regardless of DOM timing
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('#navHamburger');
    if (btn) {
      const mob = document.getElementById('navMobile');
      if (mob) mob.classList.toggle('open');
    }
  });
}

// ── INAT API ──────────────────────────────────────────────────
async function loadINat() {
  const base = `https://api.inaturalist.org/v1`;
  try {
    const [totR, spR, obR] = await Promise.all([
      fetch(`${base}/observations?project_id=${INAT_PROJECT}&per_page=1`).then(r=>r.json()),
      fetch(`${base}/observations/species_counts?project_id=${INAT_PROJECT}`).then(r=>r.json()),
      fetch(`${base}/observations/observers?project_id=${INAT_PROJECT}`).then(r=>r.json()),
    ]);
    const total = totR.total_results || 0;
    const species = spR.total_results || 0;
    const observers = obR.total_results || 0;

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
    const wR = await fetch(`${base}/observations?project_id=${INAT_PROJECT}&created_d1=${weekAgo.toISOString().split('T')[0]}&per_page=1`).then(r=>r.json());
    const week = wR.total_results || 0;

    const set = (id, val) => document.querySelectorAll(`#${id}`).forEach(el => {
      el.textContent = typeof val === 'number' ? val.toLocaleString() : val;
      el.classList.remove('pulse');
    });
    set('barTotal', total); set('barSpecies', species); set('barWeek', week);
    set('fTotal', total); set('fSpecies', species); set('fObservers', observers); set('fWeek', week);
    // Nature page stats — species, observers, total (no time-based stats)
    ['statSpecies','statObservers','statTotal'].forEach((id,i) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = [species,observers,total][i].toLocaleString(); el.classList.remove('pulse'); }
    });
    // Index page inline stats (same IDs, same values — works on both pages)


    const photoR = await fetch(`${base}/observations?project_id=${INAT_PROJECT}&per_page=6&order=desc&order_by=created_at&photos=true`).then(r=>r.json());
    const photosEl = document.getElementById('barPhotos');
    if (photosEl) {
      photosEl.innerHTML = '';
      (photoR.results||[]).slice(0,5).forEach(o => {
        if (o.photos?.[0]) {
          const img = document.createElement('img');
          img.src = (o.photos[0].url||'').replace('square','small');
          img.className = 'inat-thumb';
          img.title = `${o.species_guess||'Unknown'} · ${o.user?.login||''}`;
          img.onclick = () => window.open(`https://www.inaturalist.org/observations/${o.id}`,'_blank');
          photosEl.appendChild(img);
        }
      });
    }
    return { total, species, observers, week, recentObs: photoR.results||[] };
  } catch(e) { console.warn('iNat error',e); return {}; }
}

async function loadRecentObs(opts={}) {
  const params = new URLSearchParams({
    project_id: INAT_PROJECT, per_page: opts.count||12,
    order:'desc', order_by:'created_at', photos:'true',
  });
  if (opts.iconicTaxon) params.set('iconic_taxa', opts.iconicTaxon);
  const r = await fetch(`https://api.inaturalist.org/v1/observations?${params}`).then(r=>r.json());
  return r.results||[];
}

function renderObsGrid(containerId, obs) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!obs.length) { el.innerHTML='<p class="text-soft" style="grid-column:1/-1;padding:2rem;text-align:center">No observations found.</p>'; return; }
  el.innerHTML = obs.map(o => {
    const photo = o.photos?.[0]?.url?.replace('square','medium')||'';
    const date = o.observed_on ? new Date(o.observed_on+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
    return photo ? `<a class="card obs-card" href="https://www.inaturalist.org/observations/${o.id}" target="_blank" rel="noopener">
      <div class="obs-card-img" style="background-image:url('${photo}')"></div>
      <div class="obs-card-body">
        <div class="obs-species">${o.species_guess||o.taxon?.name||'Unknown'}</div>
        <div class="obs-by">📷 ${o.user?.login||'observer'}</div>
        <div class="obs-date">${date}</div>
      </div></a>` : '';
  }).join('');
}

// ── EVENTS (with PDF links, display filter) ───────────────────
// Truncate at a word boundary with an ellipsis (no mid-word "plus mor" cutoffs).
function clip(s, n = 140) {
  if (!s) return '';
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!–—-]+$/, '') + '…';
}

/* ============================================================
   EVENTS ENGINE  —  events.html (see EVENTS_DATA_MODEL.md)

   Three kinds of content:
     • one-off EVENT      → events tab (a dated row)
     • standing CLASS     → classes tab (a weekday RULE, expanded
                            into dated instances only inside a window)
     • SERIES             → series tab (a label bundling dated events)

   Three views, all rendered by loadEventsPage():
     1. AGENDA   — next 14 days, MERGED: events + series sessions +
                   expanded class instances, sorted by date.
     2. AHEAD    — dated events/sessions beyond the window (NO class
                   instances — that's what stops infinite repeats).
     3. RHYTHM   — weekly class SCHEDULE (each class once) + SERIES
                   index (each series once, with its flyer link).

   Closures (events with closes_park = yes) announce the park is shut
   and SUPPRESS any other programming on that date.

   loadEvents()/loadClasses() are kept as simpler single-list
   renderers for other pages (e.g. a homepage teaser).
   ============================================================ */

// Controlled category vocabulary → badge emoji + accent colour.
// Order here is also the filter-button order. Keep in sync with the
// sheet's `category` dropdown (the 8 terms in EVENTS_DATA_MODEL.md §2).
const EVENT_CATEGORIES = [
  { key:'Fitness & Wellness', emoji:'🧘', color:'#5b8db8' },
  { key:'Talks & Learning',   emoji:'📚', color:'#2d6a35' },
  { key:'Workshops',          emoji:'✂️', color:'#b07d2b' },
  { key:'Family & Kids',      emoji:'🎨', color:'#c8643c' },
  { key:'Arts & Music',       emoji:'🎵', color:'#8a5a9b' },
  { key:'Community',          emoji:'🎉', color:'#d29a1f' },
  { key:'Volunteer',          emoji:'🌱', color:'#4a8b3b' },
  { key:'Private',            emoji:'🔒', color:'#8a8a8a' },
];
const catMeta = key => EVENT_CATEGORIES.find(c => c.key === (key||'').trim())
  || { key:(key||'').trim(), emoji:'📅', color:'#8a8a8a' };

// Map a row's category, tolerating the legacy `type` values during migration.
function eventCategory(row){
  const c = (row.category || row.type || '').trim();
  const legacy = { education:'Talks & Learning', social:'Community',
                   event:'Community', wedding:'Private' };
  return legacy[c.toLowerCase()] || c;
}

const _evEsc = s => (s==null?'':(''+s)).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _isYes = v => /^(yes|y|true|1)$/i.test(((v||'')+'').trim());
const _BACK  = () => location.pathname.split('/').pop() || 'events.html';

// 'YYYY-MM-DD' → local Date at noon (noon anchor avoids timezone day-shift).
function parseDateLocal(s){
  if (!s) return null;
  const d = new Date(((s+'').trim()) + 'T12:00');
  return isNaN(d) ? null : d;
}
const _ymd = d => d.getFullYear() + '-' +
  String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const _mo  = d => d.toLocaleDateString('en-US',{month:'short'}).toUpperCase();

const DAY_CODES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_FULL  = {Sun:'Sundays',Mon:'Mondays',Tue:'Tuesdays',Wed:'Wednesdays',
                   Thu:'Thursdays',Fri:'Fridays',Sat:'Saturdays'};
const formatWeekday = w => (w||'').split(',')
  .map(s => DAY_FULL[s.trim().slice(0,3)] || s.trim()).filter(Boolean).join(' & ');

// Sort by date, then by start time (best-effort time parse).
function _timeKey(t){
  const m = (t||'').match(/(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m)?/i);
  if (!m) return 9999;
  let h = +m[1]; const min = +(m[2]||0); const ap = (m[3]||'').toLowerCase();
  if (ap.startsWith('p') && h < 12) h += 12;
  if (ap.startsWith('a') && h === 12) h = 0;
  return h*60 + min;
}
const _byDateThenTime = (a,b) => (a.date - b.date) || (_timeKey(a.time) - _timeKey(b.time));

// Turn one event row into an agenda item.
function _eventItem(e){
  const date = parseDateLocal(e.date);
  if (!date) return null;
  return {
    kind: _isYes(e.closes_park) ? 'closure' : 'event',
    date, title: e.title, time: e.time, description: e.description,
    category: eventCategory(e), cost: e.cost, series: e.series,
    fundraiser: _isYes(e.fundraiser), registration_url: e.registration_url,
    instructor: '', _link: PSBP.rowLink(e)
  };
}

// Expand visible classes into dated instances inside [start, end],
// honouring weekday rule(s) and any active_from / active_to season.
function expandClasses(classes, start, end){
  const out = [];
  classes.forEach(c => {
    const days = (c.weekday||'').split(',').map(s => DAY_CODES.indexOf(s.trim().slice(0,3)))
                  .filter(i => i >= 0);
    if (!days.length) return;                 // no weekday rule → not expandable
    const from = parseDateLocal(c.active_from);
    const to   = parseDateLocal(c.active_to);
    const cur  = new Date(start);
    for (; cur <= end; cur.setDate(cur.getDate()+1)){
      if (!days.includes(cur.getDay())) continue;
      if (from && cur < from) continue;
      if (to   && cur > to)   continue;
      out.push({
        kind: 'class', date: new Date(cur), title: c.title, time: c.time,
        instructor: c.instructor, description: c.description,
        category: eventCategory(c), cost: c.cost, series: '',
        fundraiser: false, registration_url: c.registration_url, _link: PSBP.rowLink(c)
      });
    }
  });
  return out;
}

// Resolve a series row from a session's `series` name.
const _seriesOf = (item, map) => item.series ? map[item.series.trim().toLowerCase()] : null;

// Details link: the event's own link, else fall back to its series flyer.
function _detailsLink(item, seriesMap){
  let url  = item._link && item._link.url;
  let text = item._link && item._link.text;
  if (!url){
    const s = _seriesOf(item, seriesMap);
    if (s && s.flyer_url){ url = s.flyer_url; text = text || s.flyer_text || 'See the flyer'; }
  }
  if (!url) return '';
  return PSBP.linkTag(url, '📄 ' + (text || 'Details'),
    { title: item.title || 'Details', back: _BACK(), className: 'btn btn-sm btn-green', style:'margin-top:.5rem' });
}

// "Part of {series}" line, linking the flyer when present.
function _seriesLine(item, seriesMap){
  if (!item.series) return '';
  const label = item.series.trim();
  const s = _seriesOf(item, seriesMap);
  if (s && s.flyer_url)
    return `<div class="ev-series">Part of ${PSBP.linkTag(s.flyer_url, _evEsc(label)+' →',
      { title: label, back: _BACK(), className:'ev-series-link' })}</div>`;
  return `<div class="ev-series">Part of ${_evEsc(label)}</div>`;
}

function _badges(item){
  const out = [];
  const cm = catMeta(item.category);
  if (item.category)
    out.push(`<span class="ev-badge" style="background:${cm.color}1a;color:${cm.color}">${cm.emoji} ${_evEsc(item.category)}</span>`);
  if (/^free$/i.test((item.cost||'').trim()))
    out.push(`<span class="ev-badge ev-badge-free">Free</span>`);
  else if (item.cost)
    out.push(`<span class="ev-badge ev-badge-cost">${_evEsc(item.cost)}</span>`);
  if (item.registration_url)
    out.push(`<span class="ev-badge ev-badge-reg">Sign-up</span>`);
  if (item.fundraiser)
    out.push(`<span class="ev-badge ev-badge-fund">💛 Fundraiser</span>`);
  return out.length ? `<div class="ev-badges">${out.join('')}</div>` : '';
}

// One agenda/ahead card (events, series sessions, class instances, closures).
function renderAgendaCard(item, seriesMap){
  const d = item.date;
  if (item.kind === 'closure'){
    return `<div class="event-card agenda-closure" data-category="Private" data-always="1">
      <div class="event-datebox"><div class="mo">${_mo(d)}</div><div class="dy">${d.getDate()}</div></div>
      <div class="event-info">
        <h4>🔒 Park closed${item.title?` — ${_evEsc(item.title)}`:''}</h4>
        <p>${item.description ? clip(item.description,160) : 'The park is closed to the public this day for a private event — please plan your visit around it.'}</p>
        ${item.time?`<p class="ev-time">${_evEsc(item.time)}</p>`:''}
      </div>
    </div>`;
  }
  const reg = item.registration_url
    ? PSBP.linkTag(item.registration_url, 'Register →',
        { title:item.title||'Register', back:_BACK(), className:'btn btn-sm btn-gold', style:'margin-top:.5rem' })
    : '';
  return `<div class="event-card" data-category="${_evEsc(item.category)}">
    <div class="event-datebox"><div class="mo">${_mo(d)}</div><div class="dy">${d.getDate()}</div></div>
    <div class="event-info">
      <h4>${_evEsc(item.title||'')}</h4>
      ${item.kind==='class' && item.instructor ? `<div class="class-instructor">with ${_evEsc(item.instructor)}</div>` : ''}
      ${item.description ? `<p>${clip(item.description,140)}</p>` : ''}
      ${item.time ? `<p class="ev-time">${_evEsc(item.time)}</p>` : ''}
      ${_badges(item)}
      ${_seriesLine(item, seriesMap)}
      <div class="ev-actions">${_detailsLink(item, seriesMap)}${reg}</div>
    </div>
  </div>`;
}

// One weekly-schedule row (a class shown ONCE, as a rule not an instance).
function renderScheduleRow(c){
  const dayLabel = c.day || formatWeekday(c.weekday) || '';
  const link = PSBP.rowLink(c);
  const details = link.url
    ? PSBP.linkTag(link.url, (link.text||'Details')+' →',
        { title:c.title||'', back:_BACK(), className:'sched-link' })
    : '';
  return `<div class="sched-row">
    <div class="sched-day">${_evEsc(dayLabel)}${c.time?`<span>${_evEsc(c.time)}</span>`:''}</div>
    <div class="sched-body">
      <strong>${_evEsc(c.title||'')}</strong>${c.instructor?` <span class="text-soft">· ${_evEsc(c.instructor)}</span>`:''}
      ${c.cost?` <span class="sched-cost">· ${_evEsc(c.cost)}</span>`:''}
      ${details?`<div class="sched-actions">${details}</div>`:''}
    </div>
  </div>`;
}

// One series-index card (a series shown ONCE, with its flyer link).
function renderSeriesCard(s){
  const cm = catMeta(s.category);
  const link = s.flyer_url
    ? PSBP.linkTag(s.flyer_url, (s.flyer_text||'Learn more')+' →',
        { title:s.name||'', back:_BACK(), className:'series-link' })
    : '';
  return `<div class="series-card">
    <h4>${_evEsc(s.name||'')}</h4>
    ${s.category?`<span class="ev-badge" style="background:${cm.color}1a;color:${cm.color}">${cm.emoji} ${_evEsc(s.category)}</span>`:''}
    ${s.blurb?`<p>${_evEsc(s.blurb)}</p>`:''}
    ${link?`<div class="series-actions">${link}</div>`:''}
  </div>`;
}

// Build the category filter from categories actually present, and wire
// show/hide. Closure cards (data-always="1") stay visible under every filter.
function buildEventFilters(container, cardContainers){
  if (!container) return;
  const present = new Set();
  cardContainers.forEach(c => c && c.querySelectorAll('[data-category]')
    .forEach(el => { const v = el.getAttribute('data-category'); if (v) present.add(v); }));
  const order = EVENT_CATEGORIES.map(c => c.key).filter(k => present.has(k));
  if (order.length < 2){ container.innerHTML = ''; return; }   // not worth a filter
  const btn = (cat,label,active) =>
    `<button class="ev-filter-btn${active?' active':''}" data-cat="${_evEsc(cat)}">${label}</button>`;
  container.innerHTML = btn('__all','All',true) +
    order.map(k => { const m = catMeta(k); return btn(k, `${m.emoji} ${k}`, false); }).join('');
  container.querySelectorAll('.ev-filter-btn').forEach(b => {
    b.addEventListener('click', () => {
      container.querySelectorAll('.ev-filter-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const cat = b.getAttribute('data-cat');
      cardContainers.forEach(c => c && c.querySelectorAll('[data-category]').forEach(el => {
        const show = cat === '__all' || el.getAttribute('data-always') === '1'
                  || el.getAttribute('data-category') === cat;
        el.style.display = show ? '' : 'none';
      }));
    });
  });
}

// ── ORCHESTRATOR for events.html ──────────────────────────────
// opts: { agenda, ahead, aheadHeading, filters, schedule, series, windowDays, aheadMax }
async function loadEventsPage(opts){
  opts = opts || {};
  const $ = id => id ? document.getElementById(id) : null;
  const agendaEl = $(opts.agenda), aheadEl = $(opts.ahead), aheadHeadEl = $(opts.aheadHeading),
        filtersEl = $(opts.filters), schedEl = $(opts.schedule), seriesEl = $(opts.series);
  try {
    const [events, classes, series] = await Promise.all([
      fetchTab(TAB.events).catch(()=>[]),
      fetchTab(TAB.classes).catch(()=>[]),
      fetchTab(TAB.series).catch(()=>[]),
    ]);

    // series lookup (visible only)
    const seriesMap = {};
    series.filter(isWebVisible).forEach(s => { if (s.name) seriesMap[s.name.trim().toLowerCase()] = s; });

    const today = new Date(); today.setHours(12,0,0,0);
    const windowEnd = new Date(today); windowEnd.setDate(windowEnd.getDate() + (opts.windowDays || 14));

    const evItems = events.filter(isWebVisible).map(_eventItem).filter(Boolean);
    const closureDays = new Set(evItems.filter(i => i.kind === 'closure').map(i => _ymd(i.date)));
    const notSuppressed = i => i.kind === 'closure' || !closureDays.has(_ymd(i.date));

    // AGENDA — within window: events + sessions + class instances (closures preempt)
    const classInst = expandClasses(classes.filter(isWebVisible), today, windowEnd).filter(notSuppressed);
    const agenda = evItems.filter(i => i.date >= today && i.date <= windowEnd)
      .filter(notSuppressed).concat(classInst).sort(_byDateThenTime);

    // AHEAD — beyond window: dated events/sessions only, no class instances
    const ahead = evItems.filter(i => i.date > windowEnd).filter(notSuppressed)
      .sort(_byDateThenTime).slice(0, opts.aheadMax || 24);

    if (agendaEl) agendaEl.innerHTML = agenda.length
      ? agenda.map(i => renderAgendaCard(i, seriesMap)).join('')
      : '<p class="text-soft" style="padding:1rem 0">Nothing scheduled in the next two weeks — see what\'s further ahead below.</p>';

    if (aheadEl){
      aheadEl.innerHTML = ahead.map(i => renderAgendaCard(i, seriesMap)).join('');
      if (aheadHeadEl) aheadHeadEl.style.display = ahead.length ? '' : 'none';
    }

    buildEventFilters(filtersEl, [agendaEl, aheadEl]);

    if (schedEl){
      const cls = classes.filter(isWebVisible);
      schedEl.innerHTML = cls.length
        ? cls.map(renderScheduleRow).join('')
        : '<p class="text-soft" style="font-size:.9rem">No weekly classes scheduled right now.</p>';
    }

    if (seriesEl){
      const act = series.filter(isWebVisible).filter(s => !s.active || _isYes(s.active));
      seriesEl.innerHTML = act.length ? act.map(renderSeriesCard).join('') : '';
    }
  } catch(err){
    if (agendaEl) agendaEl.innerHTML =
      '<p class="text-soft" style="padding:1rem">Could not load events. <a href="https://palmasolabp.org/calendar/" target="_blank" rel="noopener">See the park calendar →</a></p>';
  }
}

// ── Simpler single-list renderers (homepage teasers, other pages) ─────
// loadEvents: upcoming dated events only (no class expansion), same card style.
async function loadEvents(containerId, maxItems=8){
  const el = document.getElementById(containerId);
  if (!el) return [];
  try {
    const [events, series] = await Promise.all([
      fetchTab(TAB.events).catch(()=>[]), fetchTab(TAB.series).catch(()=>[])
    ]);
    const seriesMap = {};
    series.filter(isWebVisible).forEach(s => { if (s.name) seriesMap[s.name.trim().toLowerCase()] = s; });
    const today = new Date(); today.setHours(12,0,0,0);
    const items = events.filter(isWebVisible).map(_eventItem).filter(Boolean)
      .filter(i => i.date >= today).sort(_byDateThenTime).slice(0, maxItems);
    el.innerHTML = items.length
      ? items.map(i => renderAgendaCard(i, seriesMap)).join('')
      : '<p class="text-soft" style="padding:1rem 0">No upcoming events scheduled. Check back soon.</p>';
    return events;
  } catch(err){
    el.innerHTML = '<p class="text-soft" style="padding:1rem">Could not load events. <a href="https://palmasolabp.org/calendar/" target="_blank" rel="noopener">See the park calendar →</a></p>';
    return [];
  }
}

// loadClasses: the weekly schedule list (each class once).
async function loadClasses(containerId){
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const rows = (await fetchTab(TAB.classes)).filter(isWebVisible);
    el.innerHTML = rows.length
      ? rows.map(renderScheduleRow).join('')
      : '<p class="text-soft">No classes currently scheduled.</p>';
  } catch(e){
    el.innerHTML = '<p class="text-soft">Could not load classes.</p>';
  }
}

// Announcement link button. No type column needed — PSBP.linkKind reads the
// URL and routes it: a .pdf or published Google Doc frames inside viewer.html,
// an internal page opens same-window, any other site opens in a new tab.
function annButton(a){
  const { url, text } = PSBP.rowLink(a);
  if (!url) return '';
  const isDoc = PSBP.linkKind(url) === 'document';
  const label = (isDoc ? '📄 ' : '') + (text || (isDoc ? 'Read More' : 'Learn more')) + ' →';
  return PSBP.linkTag(url, label, {
    title: a.title || '',
    back: location.pathname.split('/').pop() || 'index.html',
    className: 'ann-link',
    style: 'margin-left:.75rem'
  });
}

// ── ANNOUNCEMENTS — slow-cycling, one at a time ───────────────
async function loadAnnouncements(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const rows = await fetchTab(TAB.announcements);
    const visible = rows.filter(r => isWebVisible(r));
    if (!visible.length) { el.style.display='none'; return; }

    // Show the bar
    const bar = el.closest('#announcements-bar') || el.parentElement;
    if (bar) bar.style.display = 'block';

    // Build items — absolute positioned so they fade over each other
    el.style.position = 'relative';
    el.style.minHeight = '48px';

    el.innerHTML = visible.map((a, i) => {
      return `<div class="ann-cycle-item ${i===0?'active':''}" data-idx="${i}" style="
        ${i===0 ? 'position:relative' : 'position:absolute;top:0;left:0;right:0'};
        display:flex;align-items:center;gap:1rem;padding:.6rem 0;
        opacity:${i===0?'1':'0'};transition:opacity 1.2s ease;pointer-events:${i===0?'auto':'none'}
      ">
        ${a.emoji?`<span style="font-size:1.4rem;flex-shrink:0">${a.emoji}</span>`:''}
        <div style="flex:1">
          <strong style="color:var(--white)">${a.title||''}</strong>
          ${a.body?`<span style="color:rgba(255,255,255,.78);font-size:.9rem;margin-left:.5rem">${a.body}</span>`:''}
          ${annButton(a)}
        </div>
      </div>`;
    }).join('');

    // Cycle if more than one
    if (visible.length > 1) {
      let cur = 0;
      setInterval(() => {
        const items = el.querySelectorAll('.ann-cycle-item');
        // Fade out current
        items[cur].style.opacity = '0';
        items[cur].style.pointerEvents = 'none';
        items[cur].style.position = 'absolute';
        // Fade in next
        cur = (cur + 1) % items.length;
        items[cur].style.position = 'relative';
        items[cur].style.opacity = '1';
        items[cur].style.pointerEvents = 'auto';
      }, 5000);
    }

  } catch(e) {
    el.style.display = 'none';
  }
}

// ── VOLUNTEER OF MONTH ────────────────────────────────────────
async function loadVolunteerOfMonth() {
  try {
    const rows = await fetchTab(TAB.volunteer);
    const vol = rows.find(r => isWebVisible(r));
    if (!vol) return;
    const set = (id, val) => { const el=document.getElementById(id); if(el&&val) el.textContent=val; };
    set('volName', vol.name);
    set('volTitle', vol.title || 'Volunteer of the Month');
    set('volBio', vol.bio);
    set('volHours', vol.hours);
    set('volYears', vol.seasons || vol.years);
    if (vol.photo_url) {
      const img = document.getElementById('volAvatar');
      if (img) { img.style.backgroundImage=`url('${vol.photo_url}')`; img.style.backgroundSize='cover'; img.textContent=''; }
    }
  } catch(e) { /* silent */ }
}

// ── PLANT DATA — loaded from plants.json ─────────────────────
// plants.json is generated by generate_plants_json.py
// Run that script any time plant pages are added or updated.
let PLANTS = [];

async function loadPlants() {
  const grid = document.getElementById('plantGrid');
  const ctr  = document.getElementById('plantCount');
  if (!grid) return;

  try {
    // Determine correct path based on subfolder depth
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const repoIdx   = pathParts.indexOf('ReworkDemo');
    const inSubfolder = repoIdx >= 0 && pathParts.length > repoIdx + 2;
    const base = inSubfolder ? '../' : '';

    const resp = await fetch(base + 'plants.json');
    if (!resp.ok) throw new Error('plants.json not found');
    PLANTS = await resp.json();
    // Precompute lowercased search fields ONCE on load, so each keystroke is a
    // cheap lookup instead of re-lowercasing every field of every plant.
    PLANTS.forEach(p => {
      p._common  = (p.common  || '').toLowerCase();
      p._sci     = (p.sci     || '').toLowerCase();
      p._family  = (p.family  || '').toLowerCase();
      p._quick   = (p.quick   || '').toLowerCase();
      p._aliases = (p.aliases || []).join(' ').toLowerCase();
    });
    if (ctr) ctr.textContent = PLANTS.length;
    // Update the collection count in the intro text
    const collectionCount = document.getElementById('plantCollectionCount');
    if (collectionCount) collectionCount.textContent = PLANTS.length + '+';
    renderPlants(orderByFeatured(PLANTS, FEATURED_PLANTS));
    // Apply any URL search/family filter after load
    const searchEl = document.getElementById('plantSearch');
    if (searchEl && searchEl.value) filterPlants();
  } catch(e) {
    console.warn('Could not load plants.json — falling back to empty list.', e);
    if (grid) grid.innerHTML = '<p class="text-soft" style="grid-column:1/-1;padding:2rem;text-align:center">Plant data unavailable. Please try again.</p>';
  }
}

// ── PLANT FILTER ENGINE ───────────────────────────────────────
let _activeFilters = new Set();

function plantCard(p) {
  // Support both old hardcoded format and new JSON format
  const slug = p.id + '-' + p.common.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const photoUrl = p.photo || ('plants/' + p.id + '_' + p.common.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + '.jpg');
  const pageUrl  = p.page  || ('plants/' + slug + '.html');

  return `<a class="card plant-card" href="${pageUrl}" style="text-decoration:none;display:block">
    <div style="height:160px;overflow:hidden;position:relative;background:var(--sand)">
      <img src="${photoUrl}" alt="${p.common}"
        style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .4s ease"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        loading="lazy">
      <div style="display:none;height:100%;align-items:center;justify-content:center;font-size:2.5rem;color:var(--text-soft);opacity:.3">🌿</div>
    </div>
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.4rem;margin-bottom:.25rem">
        <h4 style="font-size:.97rem;color:var(--green-deep);line-height:1.3">${p.common}</h4>
        <span style="font-size:.68rem;color:#ccc;white-space:nowrap">${p.id}</span>
      </div>
      <div style="font-style:italic;font-size:.82rem;color:var(--text-soft);margin-bottom:.55rem">${p.sci}</div>
      <div style="display:flex;flex-wrap:wrap;gap:.3rem">
        ${p.native?'<span class="tag tag-native">🌿 Native</span>':'<span class="tag tag-nonnative">Non-native</span>'}
        ${p.butterfly?'<span class="tag tag-butterfly">🦋</span>':''}
        ${p.toxic?'<span class="tag tag-toxic">⚠️ Toxic</span>':''}
        ${p.edible?'<span class="tag tag-edible">🍃 Edible</span>':''}
        ${p.invasive?'<span class="tag tag-invasive">🚫 Invasive</span>':''}
        ${p.wetland?'<span class="tag tag-wetland">💧</span>':''}
      </div>
    </div>
  </a>`;
}

// ── PLANT PAGINATION ─────────────────────────────────────────
const PLANTS_PER_PAGE = 8;
let _plantPage = 0;
let _filteredPlants = [];

function renderPlants(list) {
  _filteredPlants = list;
  _plantPage = 0;
  renderPlantPage();
}

function renderPlantPage() {
  const grid  = document.getElementById('plantGrid');
  const ctr   = document.getElementById('plantCount');
  const label = document.getElementById('plantPageLabel');
  const prev  = document.getElementById('plantPrev');
  const next  = document.getElementById('plantNext');
  const pag   = document.getElementById('plantPagination');
  const info  = document.getElementById('plantPageInfo');
  if (!grid) return;

  const total     = _filteredPlants.length;
  const totalPages = Math.ceil(total / PLANTS_PER_PAGE);
  const start     = _plantPage * PLANTS_PER_PAGE;
  const slice     = _filteredPlants.slice(start, start + PLANTS_PER_PAGE);

  if (ctr) ctr.textContent = total;
  if (info && totalPages > 1) info.textContent = ` — page ${_plantPage + 1} of ${totalPages}`;
  else if (info) info.textContent = '';

  grid.innerHTML = slice.length ? slice.map(plantCard).join('') :
    '<p class="text-soft" style="grid-column:1/-1;padding:2rem;text-align:center">No plants match. Try clearing some filters.</p>';

  // Show/hide pagination
  if (pag) pag.style.display = totalPages > 1 ? 'flex' : 'none';
  if (label) label.textContent = `${_plantPage + 1} of ${totalPages}`;
  if (prev) prev.style.opacity = _plantPage === 0 ? '.3' : '1';
  if (next) next.style.opacity = _plantPage >= totalPages - 1 ? '.3' : '1';

  // Scroll to top of plant grid when page changes
  if (_plantPage > 0) {
    document.getElementById('tabSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function stepPlants(dir) {
  const total = Math.ceil(_filteredPlants.length / PLANTS_PER_PAGE);
  _plantPage  = Math.max(0, Math.min(total - 1, _plantPage + dir));
  renderPlantPage();
}

function filterPlants() {
  const q = (document.getElementById('plantSearch')?.value||'').toLowerCase().trim();

  // Apply tag filters first
  let pool = PLANTS.filter(p =>
    (!_activeFilters.has('native')    || p.native)
    && (!_activeFilters.has('butterfly') || p.butterfly)
    && (!_activeFilters.has('toxic')     || p.toxic)
    && (!_activeFilters.has('edible')    || p.edible)
    && (!_activeFilters.has('wetland')   || p.wetland)
    && (!_activeFilters.has('invasive')  || p.invasive)
  );

  if (!q) { renderPlants(orderByFeatured(pool, FEATURED_PLANTS)); return; }

  // Score each plant — higher score = better match = shown first.
  // Fields were lowercased once at load (see loadPlants), so this is cheap.
  const scored = pool.map(p => {
    let score = 0;
    if (p._common.startsWith(q))      score += 100; // starts with query — top priority
    else if (p._common.includes(q))   score += 80;  // name contains query
    if (p._aliases.includes(q))       score += 70;  // alternate names
    if (p._sci.includes(q))           score += 60;  // scientific name
    if (p._family.includes(q))        score += 40;  // family name
    if (p._quick.includes(q))         score += 20;  // quick hits text

    return { p, score };
  })
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(x => x.p);

  renderPlants(scored);
}

function toggleFilter(type) {
  if (_activeFilters.has(type)) _activeFilters.delete(type);
  else _activeFilters.add(type);
  // Scoped to the Plants panel — Wildlife has its own filter buttons
  document.querySelectorAll('#panel-plants .filter-btn').forEach(b => {
    if (b.dataset.filter===type) b.classList.toggle('on', _activeFilters.has(type));
  });
  filterPlants();
}

function clearFilters() {
  _activeFilters.clear();
  document.querySelectorAll('#panel-plants .filter-btn').forEach(b=>b.classList.remove('on'));
  const s=document.getElementById('plantSearch'); if(s) s.value='';
  filterPlants();
}

// Plant modal removed — plant cards now link directly to full detail pages

// ── WILDLIFE DATA — loaded from wildlife.json ─────────────────
// wildlife.json is generated by generate_wildlife_json.py
// Run that script any time wildlife pages are added or updated.
let WILDLIFE = [];

// Category buttons — built dynamically from whatever themes exist
// in wildlife.json, in this order. Add a line here if a new
// theme-* class is ever introduced on the wildlife pages.
const WILD_THEMES = [
  { key: 'bird',      label: '🐦 Birds' },
  { key: 'butterfly', label: '🦋 Butterflies' },
  { key: 'reptile',   label: '🐢 Reptiles' },
  { key: 'amphibian', label: '🐸 Amphibians' },
  { key: 'mammal',    label: '🦝 Mammals' },
];

async function loadWildlife() {
  const grid = document.getElementById('wildGrid');
  if (!grid) return;

  try {
    // Determine correct path based on subfolder depth (same logic as loadPlants)
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const repoIdx   = pathParts.indexOf('ReworkDemo');
    const inSubfolder = repoIdx >= 0 && pathParts.length > repoIdx + 2;
    const base = inSubfolder ? '../' : '';

    const resp = await fetch(base + 'wildlife.json');
    if (!resp.ok) throw new Error('wildlife.json not found');
    WILDLIFE = await resp.json();

    // Update the collection count in the intro text
    const collectionCount = document.getElementById('wildCollectionCount');
    if (collectionCount) collectionCount.textContent = WILDLIFE.length + '+';

    renderWildFilterButtons();
    renderWildlife(orderByFeatured(WILDLIFE, FEATURED_WILDLIFE));

    // Apply any URL search filter after load
    const searchEl = document.getElementById('wildSearch');
    if (searchEl && searchEl.value) filterWildlife();
  } catch(e) {
    console.warn('Could not load wildlife.json — falling back to empty list.', e);
    grid.innerHTML = '<p class="text-soft" style="grid-column:1/-1;padding:2rem;text-align:center">Wildlife data unavailable. Please try again.</p>';
  }
}

// Build category buttons from the themes actually present in the data
function renderWildFilterButtons() {
  const bar = document.getElementById('wildFilterButtons');
  if (!bar) return;
  const present = new Set(WILDLIFE.map(w => w.theme).filter(Boolean));
  bar.innerHTML = WILD_THEMES
    .filter(t => present.has(t.key))
    .map(t => `<button class="filter-btn" data-wfilter="${t.key}" onclick="toggleWildFilter('${t.key}')">${t.label}</button>`)
    .join('');
}

// ── WILDLIFE CARD ─────────────────────────────────────────────
function wildCard(w) {
  const themeLabel = (WILD_THEMES.find(t => t.key === w.theme) || {}).label || w.category || '';
  return `<a class="card plant-card" href="${w.page}" style="text-decoration:none;display:block">
    <div style="height:160px;overflow:hidden;position:relative;background:var(--sand)">
      <img src="${w.photo}" alt="${w.common}"
        style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .4s ease"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        loading="lazy">
      <div style="display:none;height:100%;align-items:center;justify-content:center;font-size:2.5rem;color:var(--text-soft);opacity:.3">🦜</div>
    </div>
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.4rem;margin-bottom:.25rem">
        <h4 style="font-size:.97rem;color:var(--green-deep);line-height:1.3">${w.common}</h4>
        <span style="font-size:.68rem;color:#ccc;white-space:nowrap">${w.id}</span>
      </div>
      <div style="font-style:italic;font-size:.82rem;color:var(--text-soft);margin-bottom:.55rem">${w.sci}</div>
      <div style="display:flex;flex-wrap:wrap;gap:.3rem">
        ${themeLabel?`<span class="tag">${themeLabel}</span>`:''}
        ${w.native?'<span class="tag tag-native">🌿 Native</span>':''}
      </div>
    </div>
  </a>`;
}

// ── WILDLIFE PAGINATION ───────────────────────────────────────
const WILD_PER_PAGE = 8;
let _wildPage = 0;
let _filteredWild = [];

function renderWildlife(list) {
  _filteredWild = list;
  _wildPage = 0;
  renderWildPage();
}

function renderWildPage() {
  const grid  = document.getElementById('wildGrid');
  const ctr   = document.getElementById('wildCount');
  const label = document.getElementById('wildPageLabel');
  const prev  = document.getElementById('wildPrev');
  const next  = document.getElementById('wildNext');
  const pag   = document.getElementById('wildPagination');
  const info  = document.getElementById('wildPageInfo');
  if (!grid) return;

  const total      = _filteredWild.length;
  const totalPages = Math.ceil(total / WILD_PER_PAGE);
  const start      = _wildPage * WILD_PER_PAGE;
  const slice      = _filteredWild.slice(start, start + WILD_PER_PAGE);

  if (ctr) ctr.textContent = total;
  if (info && totalPages > 1) info.textContent = ` — page ${_wildPage + 1} of ${totalPages}`;
  else if (info) info.textContent = '';

  grid.innerHTML = slice.length ? slice.map(wildCard).join('') :
    '<p class="text-soft" style="grid-column:1/-1;padding:2rem;text-align:center">No animals match. Try clearing some filters.</p>';

  if (pag) pag.style.display = totalPages > 1 ? 'flex' : 'none';
  if (label) label.textContent = `${_wildPage + 1} of ${totalPages}`;
  if (prev) prev.style.opacity = _wildPage === 0 ? '.3' : '1';
  if (next) next.style.opacity = _wildPage >= totalPages - 1 ? '.3' : '1';

  // Scroll back to top of tab section when page changes
  if (_wildPage > 0) {
    document.getElementById('tabSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function stepWild(dir) {
  const total = Math.ceil(_filteredWild.length / WILD_PER_PAGE);
  _wildPage   = Math.max(0, Math.min(total - 1, _wildPage + dir));
  renderWildPage();
}

// ── WILDLIFE FILTER ENGINE ────────────────────────────────────
// Category filters are OR'd together (an animal is one category),
// unlike plant tag filters which are AND'd.
let _wildFilters = new Set();

function filterWildlife() {
  const q = (document.getElementById('wildSearch')?.value||'').toLowerCase().trim();

  // Category filter first — empty set means show all
  let pool = _wildFilters.size
    ? WILDLIFE.filter(w => _wildFilters.has(w.theme))
    : WILDLIFE.slice();

  if (!q) { renderWildlife(orderByFeatured(pool, FEATURED_WILDLIFE)); return; }

  // Score each animal — higher score = better match = shown first
  const scored = pool.map(w => {
    const common  = (w.common||'').toLowerCase();
    const sci     = (w.sci||'').toLowerCase();
    const family  = (w.family||'').toLowerCase();
    const quick   = (w.quick||'').toLowerCase();
    const aliases = (w.aliases||[]).join(' ').toLowerCase();
    const tags    = (w.tags||[]).join(' ').toLowerCase();
    const cat     = (w.category||'').toLowerCase();

    let score = 0;
    if (common.startsWith(q))         score += 100; // starts with query — top priority
    else if (common.includes(q))      score += 80;  // name contains query
    if (aliases.includes(q))          score += 70;  // alternate names
    if (sci.includes(q))              score += 60;  // scientific name
    if (family.includes(q))           score += 40;  // family name
    if (cat.includes(q))              score += 35;  // category label
    if (tags.includes(q))             score += 30;  // keyword tags
    if (quick.includes(q))            score += 20;  // quick hits text

    return { w, score };
  })
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(x => x.w);

  renderWildlife(scored);
}

function toggleWildFilter(theme) {
  if (_wildFilters.has(theme)) _wildFilters.delete(theme);
  else _wildFilters.add(theme);
  document.querySelectorAll('#panel-wildlife .filter-btn').forEach(b => {
    if (b.dataset.wfilter===theme) b.classList.toggle('on', _wildFilters.has(theme));
  });
  filterWildlife();
}

function clearWildFilters() {
  _wildFilters.clear();
  document.querySelectorAll('#panel-wildlife .filter-btn').forEach(b=>b.classList.remove('on'));
  const s=document.getElementById('wildSearch'); if(s) s.value='';
  filterWildlife();
}
