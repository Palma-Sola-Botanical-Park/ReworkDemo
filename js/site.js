/* ── PALMA SOLA BOTANICAL PARK · SHARED JS v2 ── */

const INAT_PROJECT = 'palma-sola-botanical-park';
const SHEET_ID     = '12gRB-c4gND8qJWPmwBoV2X4adqTfRROYHtA8jR4-kS4';

// Sheet tab GIDs — update if Bev renames tabs
const TAB = {
  events:        992316234,       // gid=0  (first tab)
  classes:       141740803,       // gid=1
  volunteer:     269225929,       // gid=2
  announcements: 673905300,       // gid=3
  Newsletters:   1749891854,      // gid=4
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
    <li><a href="members.html#donate" class="nav-cta">Donate</a></li>
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
  <a href="members.html#donate" style="color:var(--gold-light)">Donate ❤️</a>
</div>`;

// ── FOOTER HTML ───────────────────────────────────────────────
const FOOTER_HTML = `
<footer id="site-footer">
  <div class="footer-inat">
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
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap';
  document.head.appendChild(link);

  const navDiv = document.getElementById('nav-placeholder');
  if (navDiv) navDiv.outerHTML = NAV_HTML;

  if (opts.inatBar) {
    const barDiv = document.getElementById('inat-bar-placeholder');
    if (barDiv) barDiv.outerHTML = INAT_BAR_HTML;
  }

  const footDiv = document.getElementById('footer-placeholder');
  if (footDiv) footDiv.outerHTML = FOOTER_HTML;

  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#site-nav a, #navMobile a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
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
    ['statTotal','statSpecies','statObservers','statWeek'].forEach((id,i) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = [total,species,observers,week][i].toLocaleString(); el.classList.remove('pulse'); }
    });

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

// ── ANNOUNCEMENTS ─────────────────────────────────────────────
async function loadAnnouncements(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const rows = await fetchTab(TAB.announcements);
    const visible = rows.filter(r => isWebVisible(r));
    if (!visible.length) { el.style.display='none'; return; }
    el.innerHTML = visible.map(a => `
      <div class="announcement-card">
        ${a.emoji?`<span class="ann-emoji">${a.emoji}</span>`:''}
        <div class="ann-body">
          <strong>${a.title||''}</strong>
          ${a.body?`<p>${a.body}</p>`:''}
          ${a.link_url&&a.link_text?`<a href="${a.link_url}" target="_blank" rel="noopener" class="ann-link">${a.link_text} →</a>`:''}
          ${a.pdf_url?`<a href="${a.pdf_url}" target="_blank" rel="noopener" class="ann-link">📄 Read More →</a>`:''}
        </div>
      </div>`).join('');
  } catch(e) {
    el.style.display='none';
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

// ── PLANT DATA ────────────────────────────────────────────────
const PLANTS = [
  {id:'PSBP-00001',common:'Tree Crinum',sci:'Crinum asiaticum',family:'Amaryllidaceae',origin:'Non-native',cat:'Flowering Shrubs & Vines',native:false,butterfly:false,toxic:true,edible:false,invasive:false,wetland:false,quick:'One of the largest bulbs on earth — up to 40 lbs. Night-blooming for Sphinx moths. Nicknamed cemetery lily for its near-immortal constitution.'},
  {id:'PSBP-00002',common:'Weeping Bottlebrush',sci:'Melaleuca viminalis',family:'Myrtaceae',origin:'Non-native',cat:'Flowering Shrubs & Vines',native:false,butterfly:true,toxic:false,edible:false,invasive:false,wetland:false,quick:'That red brush is stamens, not petals. Crush a leaf for citrus. Hummingbirds, butterflies, and bees swarm it year-round.'},
  {id:'PSBP-00003',common:'Buccaneer Palm',sci:'Pseudophoenix sargentii',family:'Arecaceae',origin:'Native',cat:'Native Palms & Cycads',native:true,butterfly:false,toxic:false,edible:false,invasive:false,wetland:false,quick:'Fewer than 50 wild specimens survive in Florida. Blue-gray fronds shimmer silver. Every cultivated specimen is a conservation choice.'},
  {id:'PSBP-00004',common:'Silk Floss Tree',sci:'Ceiba speciosa',family:'Malvaceae',origin:'Non-native',cat:'Tropical Specimen Trees',native:false,butterfly:false,toxic:false,edible:false,invasive:false,wetland:false,quick:'Trunk spines may be defenses against extinct megafauna. Green bark photosynthesizes. One study found 80 insect species on a single tree.'},
  {id:'PSBP-00006',common:'Peregrina',sci:'Jatropha integerrima',family:'Euphorbiaceae',origin:'Non-native',cat:'Flowering Shrubs & Vines',native:false,butterfly:true,toxic:true,edible:false,invasive:false,wetland:false,quick:'Every part is toxic yet butterflies and hummingbirds love it. Find three different leaf shapes on the same branch.'},
  {id:'PSBP-00007',common:'Jacaranda',sci:'Jacaranda mimosifolia',family:'Bignoniaceae',origin:'Non-native',cat:'Tropical Specimen Trees',native:false,butterfly:true,toxic:false,edible:false,invasive:false,wetland:false,quick:'The entire canopy turns purple before a single leaf appears. Vulnerable in wild Argentina, planted on every tropical boulevard on Earth.'},
  {id:'PSBP-00008',common:'Beach Sunflower',sci:'Helianthus debilis',family:'Asteraceae',origin:'Native',cat:'Native Wildflowers',native:true,butterfly:true,toxic:false,edible:true,invasive:false,wetland:false,quick:"Florida's own native sunflower. Seeds feed migrating painted buntings and goldfinches each fall. Thrives in pure coastal sand."},
  {id:'PSBP-00010',common:'Geiger Tree',sci:'Cordia sebestena',family:'Boraginaceae',origin:'Native',cat:'Tropical Specimen Trees',native:true,butterfly:true,toxic:false,edible:true,invasive:false,wetland:false,quick:"Audubon painted it in Key West. Blooms nearly year-round. Host plant for the federally endangered Schaus' swallowtail butterfly."},
  {id:'PSBP-00011',common:'African Baobab',sci:'Adansonia digitata',family:'Malvaceae',origin:'Non-native',cat:'Tropical Specimen Trees',native:false,butterfly:false,toxic:false,edible:true,invasive:false,wetland:false,quick:'Can live 1,000+ years. Fruit has 6× more vitamin C than oranges. Elephants tear open the trunk for water during drought.'},
  {id:'PSBP-00012',common:'Peacock Flower',sci:'Caesalpinia pulcherrima',family:'Fabaceae',origin:'Non-native',cat:'Flowering Shrubs & Vines',native:false,butterfly:true,toxic:true,edible:false,invasive:false,wetland:false,quick:'National flower of Barbados. Linnaeus named it "most beautiful." Butterflies and hummingbirds fight over the near-constant blooms.'},
  {id:'PSBP-00013',common:'Sunshine Mimosa',sci:'Mimosa strigillosa',family:'Fabaceae',origin:'Native',cat:'Native Wildflowers',native:true,butterfly:true,toxic:false,edible:false,invasive:false,wetland:true,quick:'Touch the leaves — they fold shut in seconds. Fixes nitrogen in the soil. Larval host for the Little Sulphur butterfly.'},
  {id:'PSBP-00015',common:'Coral Bean',sci:'Erythrina herbacea',family:'Fabaceae',origin:'Native',cat:'Native Trees & Shrubs',native:true,butterfly:true,toxic:true,edible:false,invasive:false,wetland:false,quick:'Spring flowers timed perfectly for Ruby-throated Hummingbird migration. Brilliant red seeds — beautiful and seriously toxic.'},
  {id:'PSBP-00017',common:'Paurotis Palm',sci:'Acoelorrhaphe wrightii',family:'Arecaceae',origin:'Native',cat:'Native Palms & Cycads',native:true,butterfly:false,toxic:false,edible:false,invasive:false,wetland:true,quick:'The Everglades Palm — the only species in its genus. Dense colonies shelter wading birds and anchor the pond edge.'},
  {id:'PSBP-00018',common:'Gumbo Limbo',sci:'Bursera simaruba',family:'Burseraceae',origin:'Native',cat:'Native Trees & Shrubs',native:true,butterfly:true,toxic:false,edible:false,invasive:false,wetland:false,quick:'The Tourist Tree — bark is always red and peeling. Stick a branch in the ground; it roots. Hurricane-resistant.'},
  {id:'PSBP-00023',common:'Bald Cypress',sci:'Taxodium distichum',family:'Cupressaceae',origin:'Native',cat:'Native Wetland',native:true,butterfly:false,toxic:false,edible:false,invasive:false,wetland:true,quick:'The oldest in eastern North America is 2,624 years old. One of the few deciduous conifers. The knees still puzzle scientists.'},
  {id:'PSBP-00024',common:'Coontie Palm',sci:'Zamia integrifolia',family:'Zamiaceae',origin:'Native',cat:'Native Palms & Cycads',native:true,butterfly:true,toxic:true,edible:false,invasive:false,wetland:false,quick:"Florida's only native cycad. Sole host plant for the Atala butterfly — once thought extinct in Florida."},
  {id:'PSBP-00025',common:'Dahoon Holly',sci:'Ilex cassine',family:'Aquifoliaceae',origin:'Native',cat:'Native Trees & Shrubs',native:true,butterfly:false,toxic:true,edible:false,invasive:false,wetland:true,quick:'Berries toxic to people, safe for birds. Overripe berries ferment — Cedar Waxwings have been documented intoxicated after feeding.'},
  {id:'PSBP-00027',common:'Live Oak',sci:'Quercus virginiana',family:'Fagaceae',origin:'Native',cat:'Native Trees & Shrubs',native:true,butterfly:true,toxic:false,edible:true,invasive:false,wetland:false,quick:'500+ caterpillar species. USS Constitution cannonballs bounced off it. Less a tree than an entire ecosystem.'},
  {id:'PSBP-00028',common:'Red Mangrove',sci:'Rhizophora mangle',family:'Rhizophoraceae',origin:'Native',cat:'Native Wetland',native:true,butterfly:false,toxic:false,edible:false,invasive:false,wetland:true,quick:"Seeds float for a year before rooting. Prop roots nurse Florida's seafood industry. Protected by state law."},
  {id:'PSBP-00029',common:'Alligator Flag',sci:'Thalia geniculata',family:'Marantaceae',origin:'Native',cat:'Native Wetland',native:true,butterfly:true,toxic:false,edible:true,invasive:false,wetland:true,quick:'Leaves wave when an alligator swims through. Seminoles ate the roots. Larval host for the Brazilian Skipper butterfly.'},
  {id:'PSBP-00030',common:'Fakahatchee Grass',sci:'Tripsacum dactyloides',family:'Poaceae',origin:'Native',cat:'Native Wetland',native:true,butterfly:false,toxic:false,edible:false,invasive:false,wetland:true,quick:'Same botanical subtribe as corn — they can hybridize. Seed spike looks exactly like a miniature primitive corn ear.'},
  {id:'PSBP-00032',common:'Mahogany',sci:'Swietenia mahagoni',family:'Meliaceae',origin:'Native',cat:'Native Trees & Shrubs',native:true,butterfly:false,toxic:false,edible:false,invasive:false,wetland:false,quick:"The original mahogany — Chippendale's furniture came from this exact species. Threatened in Florida."},
  {id:'PSBP-00033',common:'Wild Lime',sci:'Zanthoxylum fagara',family:'Rutaceae',origin:'Native',cat:'Native Trees & Shrubs',native:true,butterfly:true,toxic:false,edible:true,invasive:false,wetland:false,quick:"Host plant for Florida's largest butterfly — the Giant Swallowtail. Crush a leaf: instant citrus."},
  {id:'PSBP-00034',common:'Golden Canna',sci:'Canna flaccida',family:'Cannaceae',origin:'Native',cat:'Native Wetland',native:true,butterfly:true,toxic:false,edible:true,invasive:false,wetland:true,quick:"Florida's only native Canna. Seeds viable after 600 years. Recovering at the pond edge after hurricane flooding."},
  {id:'PSBP-00035',common:'Royal Palm',sci:'Roystonea regia',family:'Arecaceae',origin:'Native',cat:'Native Palms & Cycads',native:true,butterfly:false,toxic:false,edible:false,invasive:false,wetland:false,quick:"Pollen release looks like a snowstorm. Cuba's national tree. One of few non-legumes proven to fix atmospheric nitrogen."},
  {id:'PSBP-00036',common:'Royal Poinciana',sci:'Delonix regia',family:'Fabaceae',origin:'Non-native',cat:'Tropical Specimen Trees',native:false,butterfly:true,toxic:false,edible:false,invasive:false,wetland:false,quick:'Wild homeland unknown to science for 400 years. Entire canopy disappears under orange-red blooms. Endangered in Madagascar.'},
  {id:'PSBP-00037',common:'Umbrella Tree',sci:'Schefflera actinophylla',family:'Sapindaceae',origin:'Non-native',cat:'Invasive Watch',native:false,butterfly:false,toxic:true,edible:false,invasive:true,wetland:false,quick:'FISC Category I invasive. Germinates in tree crotches and strangles the host. Kept as educational specimen.'},
  {id:'PSBP-00038',common:'Mexican Petunia',sci:'Ruellia simplex',family:'Acanthaceae',origin:'Non-native',cat:'Invasive Watch',native:false,butterfly:true,toxic:false,edible:false,invasive:true,wetland:true,quick:'Beautiful and aggressively invasive. Seed capsules launch seeds when wetted. FISC Category I since 2001.'},
  {id:'PSBP-00039',common:'Giant Milkweed',sci:'Calotropis gigantea',family:'Apocynaceae',origin:'Non-native',cat:'Tropical Foliage',native:false,butterfly:true,toxic:true,edible:false,invasive:false,wetland:false,quick:'Monarch and Queen butterfly host. Silver-grey leaves visible from the parking lot. Hawaiian queens strung the flowers into leis.'},
  {id:'PSBP-00040',common:'Century Plant',sci:'Agave americana',family:'Asparagaceae',origin:'Non-native',cat:'Culturally Significant',native:false,butterfly:false,toxic:false,edible:true,invasive:false,wetland:false,quick:'Lives 10–30 years, blooms once and dies. The cactus garden shows all three life stages at once.'},
  {id:'PSBP-00042',common:'Scorpion Tail',sci:'Heliotropium angiospermum',family:'Boraginaceae',origin:'Native',cat:'Native Wildflowers',native:true,butterfly:true,toxic:true,edible:false,invasive:false,wetland:true,quick:"Flower spike coils like a scorpion's tail and slowly uncurls. Being planted along pond shores under two estuary grants."},
  {id:'PSBP-00043',common:'African Iris',sci:'Dietes bicolor',family:'Iridaceae',origin:'Non-native',cat:'Tropical Foliage',native:false,butterfly:false,toxic:true,edible:false,invasive:false,wetland:false,quick:'Blooms in fortnightly flushes. Each flower lasts one day. Never cut the spent stalks — the plant reblooms from them.'},
  {id:'PSBP-00046',common:'Snake Plant',sci:'Dracaena trifasciata',family:'Asparagaceae',origin:'Non-native',cat:'Tropical Foliage',native:false,butterfly:false,toxic:true,edible:false,invasive:false,wetland:false,quick:'Reclassified by DNA in 2017. A patch was planted by Bright Futures high school volunteers just past the front gate.'},
  {id:'PSBP-00057',common:'Wax Myrtle',sci:'Morella cerifera',family:'Myricaceae',origin:'Native',cat:'Native Trees & Shrubs',native:true,butterfly:true,toxic:false,edible:true,invasive:false,wetland:true,quick:"Colonial Americans boiled the berries for bayberry candles. Yellow-rumped Warblers eat them exclusively. Nobody stops at the sign — but it's doing more than most trees here."},
  {id:'PSBP-00059',common:'Beautyberry',sci:'Callicarpa americana',family:'Lamiaceae',origin:'Native',cat:'Native Trees & Shrubs',native:true,butterfly:false,toxic:false,edible:false,invasive:false,wetland:false,quick:'That saturated purple is real. Crush a leaf — USDA confirmed it repels mosquitoes as effectively as DEET. 40+ bird species eat the berries.'},
];

// ── PLANT FILTER ENGINE ───────────────────────────────────────
let _activeFilters = new Set();

function plantCard(p) {
  return `<div class="card plant-card" onclick="openPlantModal('${p.id}')">
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
  </div>`;
}

function renderPlants(list) {
  const grid = document.getElementById('plantGrid');
  if (!grid) return;
  const ctr = document.getElementById('plantCount');
  if (ctr) ctr.textContent = list.length;
  grid.innerHTML = list.length ? list.map(plantCard).join('') :
    '<p class="text-soft" style="grid-column:1/-1;padding:2rem;text-align:center">No plants match. Try clearing some filters.</p>';
}

function filterPlants() {
  const q = (document.getElementById('plantSearch')?.value||'').toLowerCase();
  renderPlants(PLANTS.filter(p => {
    const text = !q || [p.common,p.sci,p.family,p.cat,p.quick].some(s=>s.toLowerCase().includes(q));
    return text
      && (!_activeFilters.has('native')    || p.native)
      && (!_activeFilters.has('butterfly') || p.butterfly)
      && (!_activeFilters.has('toxic')     || p.toxic)
      && (!_activeFilters.has('edible')    || p.edible)
      && (!_activeFilters.has('wetland')   || p.wetland)
      && (!_activeFilters.has('invasive')  || p.invasive);
  }));
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

function openPlantModal(id) {
  const p = PLANTS.find(x=>x.id===id);
  if (!p) return;
  document.getElementById('modalContent').innerHTML = `
    <h2 style="font-size:1.5rem;color:var(--green-deep);margin-bottom:.2rem">${p.common}</h2>
    <div style="font-style:italic;font-size:.9rem;color:var(--text-soft);margin-bottom:.85rem">${p.sci} · ${p.family} · ${p.id}</div>
    <div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:1rem">
      ${p.native?'<span class="tag tag-native">🌿 Florida Native</span>':'<span class="tag tag-nonnative">Non-native</span>'}
      ${p.butterfly?'<span class="tag tag-butterfly">🦋 Butterfly Plant</span>':''}
      ${p.toxic?'<span class="tag tag-toxic">⚠️ Caution: Toxic</span>':''}
      ${p.edible?'<span class="tag tag-edible">🍃 Edible (see notes)</span>':''}
      ${p.invasive?'<span class="tag tag-invasive">🚫 Invasive Watch</span>':''}
      ${p.wetland?'<span class="tag tag-wetland">💧 Wetland</span>':''}
    </div>
    <p style="font-size:.97rem;line-height:1.72;color:var(--text)">${p.quick}</p>
    <div class="modal-grid">
      <div class="modal-field"><div class="modal-lbl">Family</div><div class="modal-val">${p.family}</div></div>
      <div class="modal-field"><div class="modal-lbl">Origin</div><div class="modal-val">${p.origin}</div></div>
      <div class="modal-field"><div class="modal-lbl">Category</div><div class="modal-val">${p.cat}</div></div>
      <div class="modal-field"><div class="modal-lbl">PSBP ID</div><div class="modal-val">${p.id}</div></div>
    </div>`;
  document.getElementById('plantModal').classList.add('open');
}

function closePlantModal(e) {
  if (!e||e.target.id==='plantModal') document.getElementById('plantModal')?.classList.remove('open');
}

const MODAL_HTML = `
<div class="modal-overlay" id="plantModal" onclick="closePlantModal(event)">
  <div class="modal-box">
    <button class="modal-close" onclick="closePlantModal()">✕</button>
    <div id="modalContent"></div>
  </div>
</div>`;
