# PSBP — Maintenance & Cleanup Backlog

Refreshed running list for the ReworkDemo site + plant/wildlife catalog.
Supersedes the 2026-06-08 version. Items ranked by **Criticality** (do-it-now → polish)
and tagged with **Effort** (Low / Medium / High) plus high-level steps.

**Last updated: 2026-06-14 (rev 2)**

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

### A1. Regenerate `plants.json` after the duplicate-page deletes
- **Issue:** Five+ duplicate pages were deleted, but `plants.json` may still carry stale entries (e.g. old Frangipani) and an inflated species count until regenerated.
- **Criticality:** High — the live Plants tab reads this file; counts/cards are wrong until rebuilt.
- **Effort:** Low — one command + push.
- **Steps:** 1) `python3 data/scripts/generate_plants_json.py`  2) eyeball the new count  3) commit + push.

### A2. Confirm `photos/` has no stray script
- **Issue:** `restyle_plants.py` may still be sitting in `photos/` (the `PSBP-*` diff wouldn't catch it).
- **Criticality:** Medium — harmless to live site, but breaks the "scripts live only in `data/scripts/`" rule.
- **Effort:** Low.
- **Steps:** 1) `ls photos/*.py` → if found, `rm photos/restyle_plants.py`.

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

---

## Standing habits (keep doing)

- **Post-deploy duplicate check:**
  `ls plants/ | sed -E 's/(PSBP-[0-9]+).*/\1/' | sort | uniq -d` → should print nothing.
- **Catalog reconciliation** (pages ↔ photos): the `comm` diff of `PSBP-*` IDs across `plants/`+`wildlife/` vs `photos/` should return two empty lists.
- **Scripts live only in `data/scripts/`** — never in asset or page folders.
- **Single source of truth:** derive everything from the master sheet / JSON; never scrape rendered HTML.

---

## Sequence suggestion

1. **Now:** A1 (regenerate JSON), A2 (stray script check).
2. **Next focused session:** B1 (Google account migration) — absorbs the display.html + CONTENT-GUIDE fixes.
3. **If going JSON-exclusive:** B3 (clean master) is step one; then B2 (nightly bake + fallback) extends the pattern to all tabs.
4. **Ongoing:** C1 wishlist after June 17 training.
5. **Whenever:** the D-tier polish, in any order.
