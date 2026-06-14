# PSBP — Maintenance & Cleanup Backlog

Refreshed running list for the ReworkDemo site + plant/wildlife catalog.
Supersedes the 2026-06-08 version. Items ranked by **Criticality** (do-it-now → polish)
and tagged with **Effort** (Low / Medium / High) plus high-level steps.

**Last updated: 2026-06-14 (rev 7)**

---

## ✅ Recently completed (this session — for the record)

- Duplicate plant pages (renamed-file orphans) deleted: 00010, 00087, 00096, 00103, 00107, 00116. **Catalog reconciled and verified** — `comm` diff of pages vs photos returns zero mismatches end to end.
- Dead iNaturalist bar markup + wasted `loadINat()` removed from `events.html` and `viewer.html`.
- `data/` folder restructured into `sources/ scripts/ archive/`; scattered duplicate scripts (`restyle_plants.py` ×3, `check_wildlife_photos.py`) consolidated/removed.
- `plants/`, `wildlife/`, `photos/` swept to pure content (HTML pages / HTML pages / JPGs only).
- Legacy hardcoded gallery (`plants/index.html`) + stale `output/` folder retired to archive.
- Placeholder masters established: `PLACEHOLDER-plant-green.jpg` + `PLACEHOLDER-bird-blue.jpg`; convention documented.
- `newsletters.html` consolidated into `news.html` (archive scroll); old file archived.
- Dev `README.md` written (architecture + sheet ID/GID migration checklist + placeholder convention).

---

## 🔴 Do now — pending actions (live data slightly out of sync until done)

### ✅ A1. Regenerate `plants.json` / `wildlife.json` — COMPLETE (2026-06-14)
Both JSONs regenerated after the duplicate-page deletes; catalog reconciles clean.

### ✅ A2. Confirm `photos/` has no stray script — COMPLETE (2026-06-14)
`photos/` is JPG-only.

---

## 🟠 High — infrastructure & resilience (the bigger threads)

### B1. Google account migration (park-owned identity)
- **Issue:** Content backend is tied to a personal Google account. Migrating to the park-owned "Palma Sola Botanical Park Demo" account before Bev/Jenny ever touch the sheet makes the system survive any one volunteer leaving.
- **Criticality:** High — best done *now*, before onboarding; gets harder later. Also un-traps the stale CONTENT-GUIDE.
- **Effort:** Medium–High — it's a find-and-replace across the codebase, not just a Sheets task.
- **Steps:** 1) Check if **ownership transfer** is possible (keeps same ID/GIDs → near-zero code change); if not, **copy** the sheet (new GIDs → full replace). 2) Update `SHEET_ID` + 6 `TAB` GIDs in `site.js`. 3) Update/verify `screen/display.html` (known stale-ID risk). 4) Re-confirm sheet is shared "Anyone with link → Viewer". 5) Use the README's migration checklist to tick each file.

### B2. Live Sheets tabs have no offline fallback
- **Issue:** `events`, `classes`, `announcements`, `volunteer`, `newsletters`, `news` are fetched live from Google at page load. If Google is slow/down, those tabs come up empty — no repo floor (unlike plants/wildlife, which already have JSON).
- **Criticality:** Medium–High — single point of failure for the time-sensitive content.
- **Effort:** Medium — pattern is known (nightly bake → JSON + stale-while-revalidate fallback).
- **Steps:** 1) GitHub Action on a cron to bake each tab to JSON nightly, with a "row count didn't shrink" guard. 2) Page loads snapshot first, tries live with a ~4s timeout, swaps in if valid. 3) Show a small "as of [date]" note when on snapshot.

### B3. (Conditional) Master spreadsheet data hygiene — *prerequisite if going JSON-exclusive*
- **Issue:** Master columns N (Size) & O (Growing Conditions) mix canonical one-field-per-line (rows 1–46) with run-on/prose (rows ~47–74, +00106, 00111): 27 divergent in O, 25 in N. Also label drift, mixed Alternate-Names separators (middle-dot / line-break / single), and stray citation markers `[1]/[2]` + Unicode separators (U+2028/2029).
- **Criticality:** **Low if staying as-is** (the generator parser already normalizes all of it — render impact is cosmetic). **High if migrating to a nightly-bake JSON architecture**, because automated baking removes the human safety net — messy source could slip a malformed row through.
- **Effort:** Medium — careful, row-by-row, no fabrication.
- **Steps:** 1) Normalize N/O to canonical labels: Light, Soil tolerances, Drought, Salt, Wind, Cold tolerance, USDA zones (+Note). 2) Inline rows convert losslessly (labels exist); prose rows — extract only what's stated, flag blanks for Randy, do NOT fabricate. 3) Collapse Alternate-Names separators to one style. 4) Strip citation markers / Unicode separators from source. 5) Regenerate + spot-check.

---

### B6. Multiple photos per species (aspect photos) — LOGGED, deferred
- **Issue:** Currently **one species = one photo** (a single hero). But a species genuinely has many meaningful views — leaf, flower, fruit, bark, seedling — and for butterfly host/nectar plants, life-cycle stages (egg, caterpillar, chrysalis, adult). One photo can't carry that. Want eventually: per-species **aspect photos**, each labeled by role, each with its own credit.
- **The pattern (note for whoever builds it):** this is the **third "1-vs-many" tension** in the project, same shape as B4 (species→instances) and species→observations. Same guardrail: **PSBP species ID stays the anchor; the many things hang off it as children.** Don't deepen the single-item assumption. Target data shape: a `photos` **array** (not one `photo` field), each entry carrying a **role** (`leaf` / `flower` / `fruit` / `bark` / `caterpillar` / `adult` / …) + its own attribution.
- **Compounds with the credits pipeline:** each aspect photo needs its own credit → the photo-credits CSV gains a **photo-role** dimension (keyed by species *and* aspect), and `generate_plant_pages.py` would render a small labeled gallery instead of a single hero.
- **Naming extends cleanly:** the hyphenated convention has room for a role suffix, e.g. `PSBP-00047-Staghorn-Fern-leaf.jpg`, `-fruit.jpg`.
- **Criticality:** Low / deferred. Single hero is fine for the sign rollout. **Content can accumulate before display exists** — volunteers shooting leaves/flowers/caterpillars (post-June-17) gather the raw material regardless; wire up the gallery when ready.
- **Effort:** Medium–High when built (data shape + credits schema + generator + a page gallery UI). None now.

### B5. Harden Google Sheet tabs against structural breakage (prevention + resilience)
- **Issue:** Live-tab feeds break if the sheet's **structure** shifts — not its content. Real incident (2026-06-14): the News range got wrapped in a Google Sheets **"Table" (`Table1`)**, which injected a structural row, pushed the header/data down, and the whole news feed went dark ("come back shortly") because `fetchTab()` expects the header on a fixed row. Editing cell *values* is safe; inserting rows above the data, deleting the header row, or converting to a Table is what breaks it.
- **Criticality:** Medium — silent, total-feed failure mode; invisible until a feed goes dark. Affects every live tab (events/classes/announcements/volunteer/newsletters/news).
- **Effort:** Low–Medium (split across two fixes).
- **Two layers:**
  - **Prevention (in the Sheet):** (a) Remove the `Table1` Table wrapper — revert to a plain range (Tables are more fragile for CSV-export fetch). (b) **Protected ranges** (Data → Protect sheets and ranges) on rows 1–3 (title + header) so they can't be edited/deleted. (c) Document the rule for Bev: *edit cell values freely; never insert/delete rows above the data, never touch the header row, never convert to a Table.* Intended layout: rows 1–3 fixed (title/header), **data starts row 4**.
  - **Resilience (in code — the better fix):** make `fetchTab()` **find the header row by detecting known column names** (`display`, `date`, `headline`, …) instead of assuming a fixed row index. Then a shifted/inserted row self-corrects instead of killing the feed. One change protects all tabs.
- **Note:** This is also strong evidence for **B2** (nightly JSON bake + fallback) — with a snapshot floor, this incident would've shown slightly stale news instead of an empty feed. And the Bev-facing rule belongs in the CONTENT-GUIDE rewrite.

### B4. Species vs. instance data model + iNaturalist linkage (LOGGED — deferred, architecture already in place)
- **Issue:** One HTML page = one *species* profile, but a species can have **multiple physical instances** in the park (e.g. 4 Staghorn Ferns). Each instance gets its own QR sign, so instance-awareness matters for the eventual map/wayfinding layer.
- **GOOD NEWS — the architecture already exists.** The master signage workbook has a **`Placements` tab** (76 rows) with: `Placement ID` (PLC-0001…, the stable per-instance anchor) · `PSBP Species ID` (FK to the species page) · Common Name · Area of Park · Latitude · Longitude · Status · Notes. This is exactly the child-of-species pattern: instances hang off the species ID, species page stays canonical. Currently 1:1 (no multi-instance yet) but **schema is already multi-instance-ready** — adding 4 Staghorn instances = just 4 new PLC rows sharing `PSBP-00047`. No schema change needed.
- **Location source = Google Earth, NOT iNat.** Placement Lat/Long are placed deliberately on the Google Earth/KML map (precise, hand-dropped) — that is the **master location**. iNaturalist GPS is sloppy (bad signal, many yards off) and is **deliberately not used** for sign placement. This is settled by design.
- **Per-instance observation linkage (the deferred hard part):** Do NOT try to map observations to instances via GPS — GPS error can exceed the distance between instances, so coordinate-matching is a dead end *by design*. The documented future path: create an iNaturalist **Observation Field "PSBP Placement"** and have observers enter the Placement ID (`PLC-0124`) at capture time — human-asserted, exact, GPS-independent. This is also what enables future per-instance phenology ("pond fern leafing differently than cactus-garden fern").
- **Criticality:** Low / deferred. Species-level is the correct unit for the sign rollout; the Placements tab covers physical sign locations already. Per-instance observation linkage is a future enhancement, not a debt.
- **Effort:** None now. Later: tag-at-capture setup (Low, one iNat observation field) → optional map/wayfinding display (Medium) → per-instance phenology (High, only if ever wanted).
- **For now:** put it to bed. Signs point at species pages; placements supply hand-placed Google Earth coordinates. Done.

---

## 🟡 Medium — correctness & content

### ✅ C4. Merge About page into Contact — COMPLETE (2026-06-14)
- Folded rescued WordPress "About" content into `contact.html` → one "About & Contact" page: full history (Timucuan/Spanish heritage, Bradenton Herald, Galleria + Baden buildings, frost-free micro-climate, 2008 Rare Fruit Council), Mission + 3 pillars, Staff (Beverly, Jennifer), mailing address (P.O. Box 14214), recognition block. Board roster intentionally omitted (volatile). Hero swapped off invasive Nandina → native Ficus aurea.
- **Follow-ups:** (a) partner **logos** still need migrating into `images/` (currently a text placeholder — don't hotlink palmasolabp.org). (b) Consider updating nav/footer label in `site.js` from "Contact" → "About" / "About & Contact" to match the page.

### C5. Migrate "Mark Boehmig" park video off legacy pages → News tab + pinning
- **Issue:** A YouTube video about the park (`youtube.com/watch?v=f3zfcUHm0k4`) sits hardcoded at the bottom of the legacy WordPress About/Contact pages. It should become a **News row** in the Google Sheet (link to the video), not live in page HTML. Raises a real feature need: `news.html` sorts newest-first by date, so an evergreen 2023 video would sink forever.
- **Criticality:** Low–Medium — content migration + a small useful feature.
- **Effort:** Low–Medium.
- **Steps:** 1) Randy adds a News tab row for the video. 2) Add a **`pinned`** column to the News tab. 3) Update `news.html` sort so pinned rows surface to the top regardless of date. 4) (Same pinning mechanism is reusable for any evergreen news item.)

### C6. Working "Contact us" form on the merged contact page
- **Issue:** The legacy WordPress contact page had a "Drop us a line" form (Name / Email / Message) that did NOT migrate. ReworkDemo is a static GitHub Pages site with **no backend**, so it can't send email on its own. To have a working form, route it through a no-backend form service (e.g. Formspree, Basin, or a Google Form embed) that emails the park on submit.
- **Criticality:** Low–Medium — nice-to-have; phone/email already work as direct contact.
- **Effort:** Low — pick a service, drop in the form HTML pointing at the service endpoint, test delivery to info@palmasolabp.org.
- **Note:** This is the "email add-on (a)" flavor. The other flavor — an AI tool that drafts/sends email via a Gmail connector — is a separate utility, NOT part of the park site.

### C1. Real-photo wishlist (replaces old "missing images" item)
  - License-blocked, need replacement: **00015 Coral Bean** (all-rights-reserved), **00114 Pink Orchid Tree** (license check).
  - On green placeholder pending real photos: the cluster of 67 KB plant JPGs (e.g. Paurotis Palm, Umbrella Tree, Dollarweed, Four-o-clock, etc.).
- **Criticality:** Medium — cosmetic on the live site, but it's the natural **volunteer photo target list** for the June 17 training onward.
- **Effort:** Low to *produce the list*; ongoing to *fill* it.
- **Steps:** 1) Generate the wishlist (find placeholder-sized files / cross-ref). 2) Hand to volunteers post-training as "help us shoot these." 3) Replace placeholders one upload at a time; re-bake `plants.json`/`wildlife.json` as reals land.

### C2. Promote architectural principle into README
- **Issue:** Hard-won lesson worth codifying: *derive filter/data flags from the MASTER columns / category — never scrape rendered badge text.* Every past filter bug traced to HTML regex scraping. This is the same single-source-of-truth philosophy behind the JSON-driven idea.
- **Criticality:** Medium — prevents a recurring class of bugs.
- **Effort:** Low — a paragraph in the README architecture notes.
- **Steps:** 1) Add to README. 2) Treat as a rule for any future generator/filter work.

### ✅ C3. Small naming / data verifications — COMPLETE (2026-06-14)
- 00049 "Spath Lilly" typo: resolved (page renamed to Peace Lily; typo gone as a side effect).
- 00121 Amazon Lily: confirmed rendering correctly with photo; consistent with generator output.
- Observation-URL back-fill: NOT a 00121 nit — relocated to **B4** (catalog-wide schema decision tied to signage).

---

## 🟢 Low — polish & design decisions (whenever)

### D9. Events & Classes page — mobile layout + too block-heavy
- **Issue:** `events.html` doesn't lay out well on phone, and it's too "blocky" — too many cards/boxes, not enough flowing text. Two problems bundled: **(a) mobile rendering is broken** (higher priority — most QR-sign visitors are on phones), **(b)** the design is too dense/card-heavy and reads as stiff rather than inviting.
- **Criticality:** Low–**Medium for the mobile half** — a page that breaks on phones matters for the sign-scanning audience.
- **Effort:** Medium — responsive pass on the events/classes grid + a copy/density rework toward more prose, fewer boxes.
- **Steps:** 1) Fix the responsive breakpoints (the events list + classes sidebar grid). 2) Reduce block density — convert some cards to flowing text. 3) Test on a real phone width.

### D10. News article hero images
- **Issue:** Each News article should show a **hero image at the top, slightly large**. The `news.html` reader pane already has a `hero_image` field in the data shape — this may be mostly a styling tweak to render it bigger/more prominent rather than net-new structure.
- **Criticality:** Low — visual polish.
- **Effort:** Low — adjust the reader-pane hero CSS; confirm the `hero_image` column is populated in the News tab.

### D11. About content → Sheet-managed tab (persistent "News"-style)
- **Issue:** About content (history, mission, staff, eventually **Board of Directors**) is currently **hardcoded** in `contact.html` (merged there 2026-06-14 — the right step 1). Phase 2: make it **Sheet-driven** like News, but for *evergreen* content — a reader-pane layout (right-side clickable items, left-side text, reader picks what to read). Reuse the existing `news.html` reader+squares pattern. Lets Bev edit About content (and add Board members) without touching code.
- **Criticality:** Low — current hardcoded version works fine; this is a maintainability upgrade for when Bev self-manages.
- **Effort:** Medium — new Sheet tab + GID, adapt the news.html reader-pane component, wire into contact/about page.
- **Note:** Pairs naturally with the B1 Google account migration (new tab gets created in the park-owned sheet).

### D1. Filter / search UI revamp
- **Issue:** Agreed direction (2026-06-08): a **category dropdown** on top (11 categories, already in `plants.json` as `cat`) + a single **row of attribute buttons** under it (Native, Edible, Toxic, Butterfly). Drop Wetland/Invasive from the row (they're categories). Consider broadening Butterfly → Pollinator.
- **Criticality:** Low — current filter works; this is UX refinement.
- **Effort:** Medium — UI rebuild in `site.js` + flags sourced from master/category (not scraped — see C2).

### D2. Card badge restyle (off-brand pills)
- **Issue:** Search-result card pills (`.tag-*` in `site.css`) use a generic blue/purple/red/saturated-yellow palette that clashes with the moss/gold/cream brand; Native reads red while Non-native reads blue (feels crossed); louder than the elegant detail-page badges.
- **Criticality:** Low — cosmetic.
- **Effort:** Low–Medium — retune `.tag-*` to brand earth-tones; match detail-page badge style. Needs `site.css`.

### D3. Curated hero images
- **Issue:** Page-hero backgrounds in `images/` were an arbitrary grab (e.g. Nandina — an invasive — on the contact hero). Replace with a deliberate set of park-meaningful, photogenic, signature species; standardize naming.
- **Criticality:** Low — quality/brand polish.
- **Effort:** Low–Medium — pick ~8–12 hero specimens, swap, update page CSS refs.

### D4. Announcements-bar consistency
- **Issue:** The announcements bar appears on index/nature/members/visit/events but not news/newsletters/venue/volunteer/contact/get-started. Decide if intentional and standardize.
- **Criticality:** Low — a deliberate decision, not a bug.
- **Effort:** Low.

### D5. `get-started.html` heft
- **Issue:** ~105 KB — the heaviest hand-built page; lots of inline content. Not wrong, just the most unwieldy to maintain by hand.
- **Criticality:** Low.
- **Effort:** Medium if ever refactored (e.g. move repeated content to shared CSS/partials).

### D6. Deferred style decisions
- **Issue:** (a) Quick Hits bolding — generator output is unbolded; decide whether to auto-bold. (b) Own-photo credit style — `OWN_PHOTO_PLAIN` flag for a plain "Photo by Randall Carter" credit.
- **Criticality:** Low.
- **Effort:** Low each.

### D7. `venue_mockup.html` → archive
- **Issue:** Superseded by live `venue.html`, but left in place so Bev/Jenny's review-email link still works.
- **Criticality:** Low — housekeeping.
- **Effort:** Low — archive *after* they reply (and point them at the live page going forward).

### D8. Nav/footer label: "Contact" → "About" or "About & Contact"
- **Issue:** `contact.html` now leads with About content, but the nav/footer label (injected from `site.js`) still says "Contact." Update `NAV_HTML`/`FOOTER_HTML` in `site.js` so the menu matches the page. Filename stays `contact.html` (don't break links).
- **Criticality:** Low — cosmetic; link works either way.
- **Effort:** Low — one or two string edits in `site.js`.

---

## Standing habits (keep doing)

- **Post-deploy duplicate check:**
  `ls plants/ | sed -E 's/(PSBP-[0-9]+).*/\1/' | sort | uniq -d` → should print nothing.
- **Catalog reconciliation** (pages ↔ photos): the `comm` diff of `PSBP-*` IDs across `plants/`+`wildlife/` vs `photos/` should return two empty lists.
- **Scripts live only in `data/scripts/`** — never in asset or page folders.
- **Single source of truth:** derive everything from the master sheet / JSON; never scrape rendered HTML.
- **PDFs that render in-site must be same-origin or a published Google Doc.** `viewer.html` uses PDF.js, which *fetches* the file with JS — subject to CORS. Third-party hosts (Mailchimp `mcusercontent.com`, random file hosts) serve for direct download but block cross-origin JS reads, so they render blank in-site even though the raw link works. Fix: host embeddable PDFs in the repo (e.g. `docs/news/`) or use a published Google Doc. (Incident 2026-06-14: a Mailchimp-hosted Horticulture PDF wouldn't embed; rehosted into the repo, fixed.)

---

## Sequence suggestion

1. **Now:** A1 (regenerate JSON), A2 (stray script check).
2. **Next focused session:** B1 (Google account migration) — absorbs the display.html + CONTENT-GUIDE fixes.
3. **If going JSON-exclusive:** B3 (clean master) is step one; then B2 (nightly bake + fallback) extends the pattern to all tabs.
4. **Ongoing:** C1 wishlist after June 17 training.
5. **Whenever:** the D-tier polish, in any order.
