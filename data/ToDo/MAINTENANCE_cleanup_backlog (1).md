# PSBP — Maintenance & Cleanup Backlog

Refreshed running list for the ReworkDemo site + plant/wildlife catalog.
Supersedes the 2026-06-08 version. Items ranked by **Criticality** (do-it-now → polish)
and tagged with **Effort** (Low / Medium / High) plus high-level steps.

**Last updated: 2026-06-16 (rev 15)**

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

### B6. Multiple photos per species (aspect photos) — LOGGED, deferred
- **Issue:** Currently **one species = one photo** (a single hero). But a species genuinely has many meaningful views — leaf, flower, fruit, bark, seedling — and for butterfly host/nectar plants, life-cycle stages (egg, caterpillar, chrysalis, adult). One photo can't carry that. Want eventually: per-species **aspect photos**, each labeled by role, each with its own credit.
- **The pattern (note for whoever builds it):** this is the **third "1-vs-many" tension** in the project, same shape as B4 (species→instances) and species→observations. Same guardrail: **PSBP species ID stays the anchor; the many things hang off it as children.** Don't deepen the single-item assumption. Target data shape: a `photos` **array** (not one `photo` field), each entry carrying a **role** (`leaf` / `flower` / `fruit` / `bark` / `caterpillar` / `adult` / …) + its own attribution.
- **Compounds with the credits pipeline:** each aspect photo needs its own credit → the photo-credits CSV gains a **photo-role** dimension (keyed by species *and* aspect), and `generate_plant_pages.py` would render a small labeled gallery instead of a single hero.
- **Naming extends cleanly:** the hyphenated convention has room for a role suffix, e.g. `PSBP-00047-Staghorn-Fern-leaf.jpg`, `-fruit.jpg`.
- **Criticality:** Low / deferred. Single hero is fine for the sign rollout. **Content can accumulate before display exists** — volunteers shooting leaves/flowers/caterpillars (post-June-17) gather the raw material regardless; wire up the gallery when ready.
- **Effort:** Medium–High when built (data shape + credits schema + generator + a page gallery UI). None now.

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


### C7. Edibility badge — separate from toxicity
- **Issue:** The safety badge currently answers "is it dangerous?" (Non-Toxic / Mild Caution / Toxic) but park visitors frequently ask "can I eat this?" — a different question entirely. Plants like Beach Sunflower (edible seeds, edible flowers, historically used by Native Americans) show "✅ Non-Toxic" but deserve an edibility callout that connects visitors to the plant's food history. The detailed text in the Edibility & Toxicity section body is accurate, but there's no quick visual badge for "this one has edible parts."
- **Complexity:** Not a binary. Some plants have edible flowers but toxic sap, edible roots only after preparation, or "technically edible but not a food plant." A simple Green/Yellow/Red color code can't capture this — the old logic proved that. Needs a plant-by-plant judgment call.
- **Recommended approach:** Handle during the 5-at-a-time Gemini validation passes. For each plant, Gemini reads the full page in context and flags whether an edibility badge is warranted and what it should say. Options: "🌿 Edible Parts" / "🍽️ Historically Edible" / "🌱 Edible with Prep" / no badge. Build a new column in the spreadsheet (e.g., "Edibility Badge Text") that the generator reads — if non-empty, render it as a fourth badge. Keeps the judgment human/AI-reviewed, not regex-driven.
- **Criticality:** Medium — park visitors actively ask about edibles; this is a real engagement opportunity.
- **Effort:** Medium — generator change is small (read column, render badge); the content judgment across 122 plants is the real work, but it folds into the existing validation workflow.
### C8. Plant card chips — strip Non-native (and reconsider Toxic/Edible) from cards
- **Issue:** Filter toolbar is now down to just **🏷️ Category dropdown + 🦋 Butterfly** (Native chip was redundant inside categories; Edible/Wetland/Toxic deferred until the underlying data is trustworthy — see C9). But the **card-body** still renders a "Non-native" pill on every non-native plant. With 81 of 122 plants non-native, it's the most-shown tag in the catalog — visual noise rather than information. **🌿 Native should remain on the cards** as the rarer, meaningful signal. Edible and ⚠️ Toxic card pills should also come off the cards until C9 lands (they're loud, frequent, and as currently labeled they actively mislead — see C9 for the *why*).
- **Where it lives:** card-tag row is rendered in **`generate_plant_pages.py`** — *not* `site.js`. Requires a generator edit + a regenerate-all-pages run.
- **Criticality:** Medium — directly visible to every Nature-page visitor; same "less noise, less misleading" instinct that simplified the filter toolbar.
- **Effort:** Low — small generator edit, then re-run `generate_plant_pages.py` and rebake `plants.json`. Spot-check a handful of cards.
- **Steps:** 1) In `generate_plant_pages.py`, in the card-tag emit block, drop the Non-native, Edible, and Toxic branches. Keep 🌿 Native and 🦋 Butterfly (+ 💧 Wetland if it stays — low-noise and accurate). 2) Regenerate all 122 plant pages + rebake `plants.json`. 3) Verify Nature page cards look clean across categories. 4) When C9 is done, *put Edible and Toxic back* on the cards based on the cleaner data — and only then reintroduce them to the filter toolbar.

### C9. Edibility & toxicity data model — fix the underlying confusion *before* surfacing badges/filters
- **Issue:** The current `edible` and `toxic` flags conflate part-of-plant distinctions that visitors actually care about, and the result is genuinely confusing. Two failure modes observed:
  - **False edibles:** plants surface as 🍃 Edible just because they're *not toxic*, not because anyone would actually eat them. Visitors browsing "edible" want true edibles (Beach Sunflower seeds, Rare Fruit Collection species, traditional food plants) — not "this won't kill you."
  - **Edible + Toxic on the same plant:** real with many plants (edible fruit, toxic seed; edible flower, toxic sap), but rendered as conflicting badges visitors read as "you're lying to me." Either it's safe or it isn't — that's the visitor's mental model, and a single 🍃/⚠️ pill can't carry a part-and-preparation story.
- **Why this is C9 and not just "fix the flags":** the fields as currently encoded can't express the truth. This is a *data model* change, not a labeling cleanup. It probably needs per-part assertions — something like `edible_parts` ("flowers", "young leaves cooked", "ripe fruit only") and `toxic_parts` ("seeds", "sap", "raw leaves") rather than booleans — which then drive both the badge logic and the on-page Edibility & Toxicity section. C7 already noted this for the *edibility badge specifically*; C9 generalizes it into a single coherent treatment.
- **Until C9 lands:** Edible and Toxic are **not exposed as filters** (done 2026-06-16) and **not shown as card pills** (covered by C8). They still appear in the detail-page Edibility & Toxicity section body — that text is the only place currently nuanced enough to be honest.
- **Criticality:** Medium — blocks a real visitor-engagement opportunity (rare fruits, edible natives), and the current confused state is worse than no badge.
- **Effort:** Medium–High — schema design + spreadsheet column additions + Gemini-assisted per-plant validation pass (folds into the workflow already used for C7) + generator update to render the new structure + filter logic that respects "edible parts" semantics. Pairs naturally with C7 (same content workflow, same review pass).
- **Steps:** 1) Settle the schema (e.g. `edible_parts` / `toxic_parts` text columns + a top-level summary "true edible? Y/N/with-prep"). 2) Gemini-assisted pass across 122 plants. 3) Generator emits a richer Edibility section + a clean true/false summary for the badge & filter. 4) Reintroduce Edible and Toxic to the cards (and optionally to the filter toolbar — separately decided).

---

## 🟢 Low — polish & design decisions (whenever)

### D9. Events & Classes page — mobile layout + too block-heavy
- **Issue:** `events.html` doesn't lay out well on phone, and it's too "blocky" — too many cards/boxes, not enough flowing text. Two problems bundled: **(a) mobile rendering is broken** (higher priority — most QR-sign visitors are on phones), **(b)** the design is too dense/card-heavy and reads as stiff rather than inviting.
- **Criticality:** Low–**Medium for the mobile half** — a page that breaks on phones matters for the sign-scanning audience.
- **Effort:** Medium — responsive pass on the events/classes grid + a copy/density rework toward more prose, fewer boxes.
- **Steps:** 1) Fix the responsive breakpoints (the events list + classes sidebar grid). 2) Reduce block density — convert some cards to flowing text. 3) Test on a real phone width.

### D11. About content → Sheet-managed tab (persistent "News"-style)
- **Issue:** About content (history, mission, staff, eventually **Board of Directors**) is currently **hardcoded** in `contact.html` (merged there 2026-06-14 — the right step 1). Phase 2: make it **Sheet-driven** like News, but for *evergreen* content — a reader-pane layout (right-side clickable items, left-side text, reader picks what to read). Reuse the existing `news.html` reader+squares pattern. Lets Bev edit About content (and add Board members) without touching code.
- **Criticality:** Low — current hardcoded version works fine; this is a maintainability upgrade for when Bev self-manages.
- **Effort:** Medium — new Sheet tab + GID, adapt the news.html reader-pane component, wire into contact/about page.
- **Note:** Pairs naturally with the B1 Google account migration (new tab gets created in the park-owned sheet).

### ~~D1. Filter / search UI revamp~~ — DONE 2026-06-16 (see Completed)

### D2. Badge restyle — plants DONE, wildlife outstanding
- **Issue (original):** Card pills (`.tag-*`) clashed (Native red, Non-native blue); plant detail `.badge-native` was blue; pages drifted from brand tokens.
- **Done (2026-06-14):** `site.css` `.tag-*` retuned to brand earth-tones. Buccaneer reference `.badge-*` block fixed (native = green). All 122 plant pages regenerated with corrected badges. Generator patched with sanitization layer, `parse_repro` dash/lead-text fixes, and block-count validation.
- **Remaining:** Wildlife detail pages still show the off-brand blue "Native to Florida" badge (`#d0e8ff`). No wildlife generator exists — hand-built pages. Upload one wildlife page to fix. Wildlife card tags (`.tag-bird/reptile/insect`) could also be aligned to the page themes (birds=blue, mammals=brown, butterflies=magenta).
- **Criticality:** Low — cosmetic.

### D3. Curated hero images
- **Issue:** Page-hero backgrounds in `images/` were an arbitrary grab (e.g. Nandina — an invasive — on the contact hero). Replace with a deliberate set of park-meaningful, photogenic, signature species; standardize naming.
- **Criticality:** Low — quality/brand polish.
- **Effort:** Low–Medium — pick ~8–12 hero specimens, swap, update page CSS refs.

### D4. Announcements-bar consistency
- **Issue:** The announcements bar appears on index/nature/members/visit/events but not news/newsletters/venue/volunteer/contact/get-started. Decide if intentional and standardize.
- **Criticality:** Low — a deliberate decision, not a bug.
- **Effort:** Low.

### D6. Deferred style decisions
- **Issue:** (a) Quick Hits bolding — generator output is unbolded; decide whether to auto-bold. (b) Own-photo credit style — `OWN_PHOTO_PLAIN` flag for a plain "Photo by Randall Carter" credit.
- **Criticality:** Low.
- **Effort:** Low each.

### D7. `venue_mockup.html` → archive
- **Issue:** Superseded by live `venue.html`, but left in place so Bev/Jenny's review-email link still works.
- **Criticality:** Low — housekeeping.
- **Effort:** Low — archive *after* they reply (and point them at the live page going forward).

---

### C1. Real-photo wishlist (replaces old "missing images" item)
  - License-blocked, need replacement: **00015 Coral Bean** (all-rights-reserved), **00114 Pink Orchid Tree** (license check).
  - On green placeholder pending real photos: the cluster of 67 KB plant JPGs (e.g. Paurotis Palm, Umbrella Tree, Dollarweed, Four-o-clock, etc.).
- **Criticality:** Low — photos will fill organically as volunteers and visitors contribute over time. Generate a formal wishlist only after months if gaps persist.
- **Effort:** Low to *produce the list*; ongoing to *fill* it.
- **Steps:** 1) Generate the wishlist (find placeholder-sized files / cross-ref). 2) Hand to volunteers post-training as "help us shoot these." 3) Replace placeholders one upload at a time; re-bake `plants.json`/`wildlife.json` as reals land.



---

## Standing habits (keep doing)

- **Post-deploy duplicate check:**
  `ls plants/ | sed -E 's/(PSBP-[0-9]+).*/\1/' | sort | uniq -d` → should print nothing.
- **Catalog reconciliation** (pages ↔ photos): the `comm` diff of `PSBP-*` IDs across `plants/`+`wildlife/` vs `photos/` should return two empty lists.
- **Scripts live only in `data/scripts/`** — never in asset or page folders.
- **Single source of truth:** derive everything from the master sheet / JSON; never scrape rendered HTML.
- **PDFs that render in-site must be same-origin or a published Google Doc.** `viewer.html` uses PDF.js, which *fetches* the file with JS — subject to CORS. Third-party hosts (Mailchimp `mcusercontent.com`, random file hosts) serve for direct download but block cross-origin JS reads, so they render blank in-site even though the raw link works. Fix: host embeddable PDFs in the repo (e.g. `docs/news/`) or use a published Google Doc. (Incident 2026-06-14: a Mailchimp-hosted Horticulture PDF wouldn't embed; rehosted into the repo, fixed.)
- **`news.html` carries intentional page-specific hero overrides — by design, not drift.** Its `<style>` block deliberately overrides the shared `site.css` hero for News only: a more compact `.page-hero` (smaller padding/min-height), a bigger/brighter orange article date (`#ffb02e`), and a shorter `.news-reader-hero` article image band (165px). These are deliberate tuning for News's editorial layout — **do NOT "standardize" them to match other pages or assume they're a mistake.** (The shared hero height across the *other* pages was already reconciled 2026-06-14 by removing rogue inline overrides on events/contact.)

---

## ✅ Completed

*Newest work folded in here; tap a tier above for what's still open.*

### ✅ D1. Filter / search UI revamp — COMPLETE (2026-06-16)
- **Plants panel filter row** rebuilt to a minimalist toolbar: 🏷️ **category dropdown** (reads `cat` from `plants.json` — 10 surfaced options; "Plants to Watch & Invasive Awareness" hidden from the dropdown by design) + 🌿 **Native** chip + 🦋 **Butterfly** chip + Clear.
- **Why Native stayed despite being redundant inside a category:** at the default "All categories" landing state, Native is meaningful (41 of 122 plants) and gives visitors a one-tap path to "show me the plants that belong here." Inside a specific category it's a no-op — categories are either all-native or near-100% one-way — but that's a harmless click, and the chip earns its keep on the default view. The search bar handles specific-plant lookups; Native handles the curiosity question.
- **Why Butterfly stayed:** low-frequency, accurate, and the chip connects directly to the pollinator story the park tells.
- **Chips dropped from the toolbar:** Toxic (alarmist as a browse filter), Invasive (too tricky to surface as user-controllable), **Edible** (current flag means "not toxic" rather than "truly edible" — misleading until C9), **Wetland** (covered by the "Native Wetland & Pond Edge" category — the dropdown does this job better). Pages and search still cover all of them. Edible & Toxic will return to both cards and toolbar once C9 fixes the underlying data model.
- **Intro compaction:** the two-column "what we have / how we got it" intro on both Plants and Wildlife panels collapsed into a single community-first line ("Every plant below was found by someone walking this park — phone in hand, photo posted to iNaturalist, identified by the community…"). Drops the green callout box; pulls search above the fold.
- **Dropdown styling:** custom-arrow `<select>` styled as a sibling chip — focus ring suppressed, width auto-sized to current option, color/weight matched to chip vocabulary.
- **Files touched:** `nature.html`, `site.css`, `site.js`. Generator (`generate_plant_pages.py`) NOT touched — the in-card "Non-native" pill cleanup is now logged as **C8**.

### ✅ A1. Regenerate `plants.json` / `wildlife.json` — COMPLETE (2026-06-14)
Both JSONs regenerated after the duplicate-page deletes; catalog reconciles clean.

### ✅ A2. Confirm `photos/` has no stray script — COMPLETE (2026-06-14)
`photos/` is JPG-only.

### ✅ B5. Harden Google Sheet tabs against structural breakage — COMPLETE (2026-06-14)
- **Code:** `fetchTab()` now locates the header row by detecting known column names (with a fallback to the documented layout) and reads data two rows below it — a shifted/inserted row self-corrects instead of killing the feed. Covers all live tabs; verified vs News (normal + row-injected), Wedding, Volunteer shapes.
- **Sheet:** protected ranges applied on rows 1–3 (restricted to Randy) across the live tabs. (Protection blocks editing those cells but not row-insert / "Convert to table" — code fix is the backstop.)
- **Carryover for CONTENT-GUIDE:** *edit cell values freely; never insert/delete rows above the data; never convert a range to a Table.*

### ✅ C3. Small naming / data verifications — COMPLETE (2026-06-14)
- 00049 "Spath Lilly" typo: resolved (page renamed to Peace Lily; typo gone as a side effect).
- 00121 Amazon Lily: confirmed rendering correctly with photo; consistent with generator output.
- Observation-URL back-fill: NOT a 00121 nit — relocated to **B4** (catalog-wide schema decision tied to signage).

### ✅ C4. Merge About page into Contact — COMPLETE (2026-06-14)
- Folded rescued WordPress "About" content into `contact.html` → one "About & Contact" page: full history (Timucuan/Spanish heritage, Bradenton Herald, Galleria + Baden buildings, frost-free micro-climate, 2008 Rare Fruit Council), Mission + 3 pillars, Staff (Beverly, Jennifer), mailing address (P.O. Box 14214), recognition block. Board roster intentionally omitted (volatile). Hero swapped off invasive Nandina → native Ficus aurea.
- **Follow-ups:** (a) partner **logos** still need migrating into `images/` (currently a text placeholder — don't hotlink palmasolabp.org). (b) Consider updating nav/footer label in `site.js` from "Contact" → "About" / "About & Contact" to match the page.

### ✅ D5. `get-started.html` — reworked; "heft" was a false alarm (2026-06-14)
- Layout + copy pass (icon balance, floated quote/payoff, punchier identifier intro, step-1 project-link + Join guidance, "fun"→"rewarding"). Measured ~104 KB but ~90 KB (86%) is just 3 base64 images; only ~14 KB is real content — no perf issue. Optional housekeeping: extract the 3 images to `images/`.

### ✅ D8. Nav/footer label: "Contact" → "About" — COMPLETE (2026-06-14)
- Renamed in `site.js` nav (desktop + mobile) and footer, plus `contact.html` `<title>`. Filename unchanged.

### ✅ C2. Promote architectural principle into README — COMPLETE (2026-06-14)
- Principle already codified in README Architecture philosophy §1 and Maintenance habits. Added Claude-session build note to the Content build pipeline section.

### ✅ D10. News article hero images — COMPLETE (2026-06-14)
- Reader-pane article hero enlarged in `news.html`.

**Earlier (prior session):**

- Duplicate plant pages (renamed-file orphans) deleted: 00010, 00087, 00096, 00103, 00107, 00116. **Catalog reconciled and verified** — `comm` diff of pages vs photos returns zero mismatches end to end.
- Dead iNaturalist bar markup + wasted `loadINat()` removed from `events.html` and `viewer.html`.
- `data/` folder restructured into `sources/ scripts/ archive/`; scattered duplicate scripts (`restyle_plants.py` ×3, `check_wildlife_photos.py`) consolidated/removed.
- `plants/`, `wildlife/`, `photos/` swept to pure content (HTML pages / HTML pages / JPGs only).
- Legacy hardcoded gallery (`plants/index.html`) + stale `output/` folder retired to archive.
- Placeholder masters established: `PLACEHOLDER-plant-green.jpg` + `PLACEHOLDER-bird-blue.jpg`; convention documented.
- `newsletters.html` consolidated into `news.html` (archive scroll); old file archived.
- Dev `README.md` written (architecture + sheet ID/GID migration checklist + placeholder convention).
