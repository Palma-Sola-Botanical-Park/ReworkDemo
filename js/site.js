/* ── PALMA SOLA BOTANICAL PARK · SHARED JS v2 ── */

const INAT_PROJECT = 'palma-sola-botanical-park';
const SHEET_ID     = '12gRB-c4gND8qJWPmwBoV2X4adqTfRROYHtA8jR4-kS4';

// Sheet tab GIDs — update if Bev renames tabs
const TAB = {
  events:        992316234,
  classes:       141740803,
  volunteer:     269225929,
  announcements: 673905300,
  newsletters:   1749891854,
};

// display filter: which values should appear on the website
const WEB_DISPLAY = new Set(['web', 'both']);

// ── SHEET FETCH HELPER ────────────────────────────────────────
async function fetchTab(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Sheet tab ${gid} failed`);
  const text = await resp.text();
  const lines = text.trim().split('\n');
  // Row 0 = section title, Row 1 = column headers, Row 2 = notes, Row 3+ = data
  const headers = parseCSVLine(lines[1]).map(h => h.trim().toLowerCase().replace(/\s+/g,'_'));
  return lines.slice(3)
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
  <a href="index.html" class="nav-logo">
    <img src="images/white_PSBP_logo.png" alt="Palma Sola Botanical Park">
  </a>
  <ul class="nav-links">
    <li><a href="index.html">Home</a></li>
    <li><a href="nature.html">Nature</a></li>
    <li><a href="visit.html">Visit</a></li>
    <li><a href="events.html">Events</a></li>
    <li><a href="venue.html">Venue</a></li>
    <li><a href="volunteer.html">Volunteer</a></li>
    <li><a href="members.html">Members</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>
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
  <a href="contact.html">Contact</a>
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
        <li><a href="nature.html#inat">iNaturalist Project</a></li>
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
        <li><a href="contact.html">Contact Us</a></li>
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

  const btn = document.getElementById('navHamburger');
  const mob = document.getElementById('navMobile');
  if (btn && mob) btn.addEventListener('click', () => mob.classList.toggle('open'));
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
async function loadEvents(containerId, maxItems=8) {
  const el = document.getElementById(containerId);
  if (!el) return [];
  try {
    const rows = await fetchTab(TAB.events);
    const now = new Date();
    const upcoming = rows
      .filter(r => isWebVisible(r))
      .filter(r => { try { return new Date(r.date+'T12:00') >= now; } catch { return false; } })
      .sort((a,b) => new Date(a.date)-new Date(b.date))
      .slice(0, maxItems);

    if (!upcoming.length) {
      el.innerHTML = '<p class="text-soft" style="padding:1.5rem">No upcoming events scheduled. Check back soon.</p>';
      return rows;
    }

    const typeClass = t => t.includes('wed')?'wedding':t.includes('edu')?'education':t.includes('soc')?'social':'';
    const typeLabel = t => t.includes('wed')?'💍 Wedding/Private':t.includes('edu')?'📚 Learning':t.includes('soc')?'🎉 Community':'📅 Event';

    el.innerHTML = upcoming.map(e => {
      const d = new Date(e.date+'T12:00');
      const pdfBtn = e.pdf_url ? `<a href="${e.pdf_url}" target="_blank" rel="noopener" class="btn btn-sm btn-gold" style="margin-top:.6rem">📄 Event Details</a>` : '';
      return `<div class="event-card">
        <div class="event-datebox">
          <div class="mo">${d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</div>
          <div class="dy">${d.getDate()}</div>
        </div>
        <div class="event-info">
          <h4>${e.title}</h4>
          ${e.description?`<p>${e.description.slice(0,120)}</p>`:''}
          ${e.time?`<p style="font-size:.8rem;color:#999">${e.time}</p>`:''}
          <span class="event-type ${typeClass(e.type)}">${typeLabel(e.type)}</span>
          ${pdfBtn}
        </div>
      </div>`;
    }).join('');
    return rows;
  } catch(err) {
    el.innerHTML = `<p class="text-soft" style="padding:1rem">Could not load events. <a href="https://palmasolabp.org/calendar/" target="_blank">See the park calendar →</a></p>`;
    return [];
  }
}

// ── CLASSES ───────────────────────────────────────────────────
async function loadClasses(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const rows = await fetchTab(TAB.classes);
    const visible = rows.filter(r => isWebVisible(r));
    if (!visible.length) { el.innerHTML='<p class="text-soft">No classes currently scheduled.</p>'; return; }
    el.innerHTML = visible.map(c => `
      <div class="class-card">
        <div class="class-day">${c.day||''} <span>${c.time||''}</span></div>
        <h4>${c.title||''}</h4>
        ${c.instructor?`<div class="class-instructor">with ${c.instructor}</div>`:''}
        ${c.description?`<p>${c.description}</p>`:''}
        ${c.pdf_url?`<a href="${c.pdf_url}" target="_blank" rel="noopener" class="btn btn-sm btn-green" style="margin-top:.5rem">📄 Details</a>`:''}
        ${c.registration_url?`<a href="${c.registration_url}" target="_blank" rel="noopener" class="btn btn-sm btn-gold" style="margin-top:.5rem">Register →</a>`:''}
      </div>`).join('');
  } catch(e) {
    el.innerHTML = '<p class="text-soft">Could not load classes.</p>';
  }
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
      const pdfHref = a.pdf_url
        ? `viewer.html?url=${encodeURIComponent(a.pdf_url)}&title=${encodeURIComponent(a.title||'')}&back=${encodeURIComponent(window.location.pathname.split('/').pop()||'index.html')}`
        : '';
      return `<div class="ann-cycle-item ${i===0?'active':''}" data-idx="${i}" style="
        ${i===0 ? 'position:relative' : 'position:absolute;top:0;left:0;right:0'};
        display:flex;align-items:center;gap:1rem;padding:.6rem 0;
        opacity:${i===0?'1':'0'};transition:opacity 1.2s ease;pointer-events:${i===0?'auto':'none'}
      ">
        ${a.emoji?`<span style="font-size:1.4rem;flex-shrink:0">${a.emoji}</span>`:''}
        <div style="flex:1">
          <strong style="color:var(--white)">${a.title||''}</strong>
          ${a.body?`<span style="color:rgba(255,255,255,.78);font-size:.9rem;margin-left:.5rem">${a.body}</span>`:''}
          ${a.link_url&&a.link_text?`<a href="${a.link_url}" class="ann-link" style="margin-left:.75rem">${a.link_text} →</a>`:''}
          ${a.pdf_url?`<a href="${pdfHref}" class="ann-link" style="margin-left:.75rem">📄 Read More →</a>`:''}
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
    if (ctr) ctr.textContent = PLANTS.length;
    renderPlants(PLANTS);
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
const PLANTS_PER_PAGE = 10;
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

  if (!q) { renderPlants(pool); return; }

  // Score each plant — higher score = better match = shown first
  const scored = pool.map(p => {
    const common = (p.common||'').toLowerCase();
    const sci    = (p.sci||'').toLowerCase();
    const family = (p.family||'').toLowerCase();
    const quick  = (p.quick||'').toLowerCase();
    const more   = (p.more||p.origin||'').toLowerCase();

    let score = 0;
    if (common.startsWith(q))         score += 100; // starts with query — top priority
    else if (common.includes(q))      score += 80;  // name contains query
    if (sci.includes(q))              score += 60;  // scientific name
    if (family.includes(q))           score += 40;  // family name
    if (quick.includes(q))            score += 20;  // quick hits text
    if (more.includes(q))             score += 10;  // more info text

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
  document.querySelectorAll('.filter-btn').forEach(b => {
    if (b.dataset.filter===type) b.classList.toggle('on', _activeFilters.has(type));
  });
  filterPlants();
}

function clearFilters() {
  _activeFilters.clear();
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('on'));
  const s=document.getElementById('plantSearch'); if(s) s.value='';
  filterPlants();
}

// Plant modal removed — plant cards now link directly to full detail pages
