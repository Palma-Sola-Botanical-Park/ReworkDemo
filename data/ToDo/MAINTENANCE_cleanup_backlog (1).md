# PSBP — Maintenance & Cleanup Backlog

Refreshed running list for the ReworkDemo site + plant/wildlife catalog.
Supersedes the 2026-06-08 version. Items ranked by **Criticality** (do-it-now → polish)
and tagged with **Effort** (Low / Medium / High) plus high-level steps.

**Last updated: 2026-06-19 (rev 18 — photo gallery pipeline built; credit redesign + schema enhancements logged: C14–C15, D12–D14)**

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

### B3. ~~Master spreadsheet data hygiene~~ — **RESOLVED by JSON migration (2026-06-18)**
- **Resolution:** The JSON conversion (`convert_plant_signage.py`) normalizes all separators, parses key-value lines into structured objects, and freezes the mess into clean structure. U+2028/2029 separators, mixed alternate-name separators, label drift — all handled in the one-time parse. No downstream parser will encounter any of it again. See `DATA_ARCHITECTURE.md` §8 "The B3 cleanup."

### B6. ~~Multiple photos per species~~ — **SUPERSEDED by photo architecture (2026-06-18)**
- **Resolution:** The new `photo_credits.json` registry and species-subfolder model fully replace this item. Photos get `role` arrays (leaf, flower, fruit, bark, gallery, etc.), `primary_for` flags per role, and a single `hero` flag. No naming convention — files keep whatever name they came in with. The registry is the brains; the folder is the shoebox. See `DATA_ARCHITECTURE.md` §3 for the full spec, and **B7** below for the migration tasks.

### B7. Photo registry build + `images/` cleanup + check-in process
- **Issue:** Photos and brand assets are jumbled together in `images/` — page-hero backgrounds (scientific-name JPGs), PSBP logo variants (8+ files), partner logos, venue photos, all flat in one folder. No central registry tracks who took what, what license applies, or which pages reference which file. The new `photo_credits.json` registry (see `DATA_ARCHITECTURE.md` §3) solves this, but the migration work is real.
- **Criticality:** High — this is the foundation for multi-photo species pages, gallery features, office screen apps, and the volunteer photo intake pipeline. Nothing else in the photo architecture works until the registry exists and files are in their final locations.
- **Effort:** Medium — mostly careful file auditing and moves, not code.
- **Steps:**

  **Step 1: Build `photo_credits.json` from existing CSV.**
  Convert `Plants_and_Wildlife_Photo_Credits.csv` → JSON with the new schema (`role` as array, `primary_for`, `hero` flag, `type` field). Initial load: every existing species photo gets `role: ["whole"]`, `primary_for: ["whole"]`, `hero: true`. Output goes to `data/sources/photo_credits.json`.

  **Step 2: Audit `images/` and decide final locations.**
  For each file currently in `images/`, classify it:
  - **Logo / brand asset** → stays in `images/logos/` (no registry row)
  - **Partner logo** → stays in `images/partners/` (no registry row)
  - **Photograph** (page hero, venue shot, etc.) → moves to `photos/park/`, gets a `photo_credits.json` row with `type: "Park"`, `tags`, `used_by`, and attribution

  **Step 3: Script the moves.**
  Before moving any file, grep every HTML/CSS/JS file for references to the old path. Update references first, then move. Do NOT delete old files until all references are confirmed updated — a broken hero image on a live page is worse than a messy folder.

  **Step 4: Run an unused-photo sweep.**
  Script a diff: every file under `photos/` and `images/` that has NO `photo_credits.json` row, no CSS/HTML `src` or `url()` pointing to it, and no `used_by` entry → candidate for removal. Review the candidate list manually before deleting anything.

  **Step 5: Create species subfolders and migrate existing species photos.**
  Move each species photo from `photos/PSBP-xxxxx-Name.jpg` into `photos/PSBP-xxxxx/filename.jpg`. Update `photo_credits.json` paths. Update any HTML/CSS references.

  **Step 6: Establish the ongoing check-in process.**
  Document and follow for every new photo going forward:
  - **iNat photos:** verify license on the observation page → download from CDN → drop in species subfolder → add registry row with `source_url` pointing to iNat observation.
  - **Non-iNat photos:** get explicit permission from photographer, record the license granted → drop in species subfolder or `photos/park/` → add registry row.
  - **Before changing a hero or primary:** update the old photo's flags so one-hero-per-species and one-primary-per-role rules hold.
  - **Before deleting any photo:** check `used_by` and grep for references.

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

### C10. Wildlife signage JSON — populate the new stub fields (data pass)
- **Issue:** `wildlife_signage.json` is now the **authoritative wildlife source** (no spreadsheet upstream — `meta.source` updated 2026-06-19, schema `1.4`). On 2026-06-19 it gained three structured fields that are currently **empty stubs across all 46 records**: `plant_links` (host-plant cross-refs by PSBP plant ID), `last_reviewed` (ISO fact-check date), and `sources` (`{label, url}` attribution). Added as schema now; to be filled in a dedicated pass.
- **Criticality:** Medium — `plant_links` unlocks auto-linking species ↔ host-plant pages (e.g. Passionflower → Zebra Longwing & Gulf Fritillary); `last_reviewed`/`sources` underpin the "accurate, sourced" promise.
- **Effort:** Medium — mostly content/research, not code.
- **Steps:** 1) `plant_links`: needs `plant_signage.json` (or an ID↔name map) in hand; wire host/nectar plants to plant PSBP IDs — element shape `{plant_id, common_name, relationship}`, relationship ∈ host / nectar / food / shelter. 2) `sources`: add `{label, url}` rows per record during fact-check (FWC, iNat, Audubon, etc.). 3) `last_reviewed`: stamp the ISO date as each record is verified. 4) Keep `sources`/`last_reviewed` identical to the plant-side fields (same shape being added there) so one tool can fill both.

### C11. Wildlife photos — rename files for the 2026-06-19 subspecies→species folds
- **Issue:** Three wildlife records were folded from subspecies to their parent species: **Florida Screech-Owl → Eastern Screech-Owl**, **Florida Zebra Longwing → Zebra Longwing**, **Florida Mangrove Skipper → Mangrove Skipper**. Photo **filenames are derived from the common name**, so the existing files in `photos/` for these three still carry the old "Florida …" names and no longer match the records.
- **Criticality:** Low–Medium — consistency now; becomes a broken/mismatched reference once HTML is regenerated from the new common names.
- **Effort:** Low — scripted rename (do alongside the next automated photo pass / HTML regen).
- **Steps:** 1) Identify the affected files (old common-name basenames for the three species). 2) Rename to the new species common name — or, once B7's subfolder model lands, move into the species subfolder instead (**see B7 Step 5**). 3) Update any `photo_credits.json` rows + HTML/CSS references. 4) Pair this with the common-name-driven HTML regeneration so both are caught together. **Cross-ref B7.**

### C12. Wildlife species expansion — iNaturalist June import (Rob's upload)
- **Issue:** A large iNat upload (robcarr52, ~198 observations on 2026-06-18) added many species to the park project. The master currently holds 46 species; an unknown number of new-to-signage candidates remain to be brought in.
- **Criticality:** Medium — grows the catalog visitors actually see; rides the momentum of the iNat program.
- **Effort:** Medium — dedupe + triage + drafting.
- **Steps:** 1) Export the project `species_counts` (fetch-script CSV or iNat API JSON). 2) Dedupe against the 46 existing `inat_taxon_id`s. 3) Triage into tiers (document-now / next / hold — vertebrates & charismatic inverts first). 4) Assign PSBP IDs continuing **downward from 99952** (wildlife descending scheme; note **99964 is now an open slot** from the hybrid removal — backfill candidate). 5) Draft keepers in house voice with all current fields (incl. `seasonality`, `similar_species`).
- **Decision needed (blocks the import):** Do new species get a provisional PSBP ID immediately at `research` status (like the 99953–99969 batch), or stay ID-less until promoted to `html`?

### C13. Promote research-status wildlife entries → html (photo + license collection)
- **Issue:** 17 records sit at `status: "research"` — content drafted and ready ("obituary on file"), but **no iNat photos collected and no licensing confirmed**. Per the lifecycle, promotion to `html` is gated on fetching photos + verifying license, after which the record goes live on the web.
- **Criticality:** Medium — publish-ready except for imagery; clearing them is high-yield.
- **Effort:** Medium — per-species photo sourcing + license check (folds into **B7 Step 6** check-in process).
- **Steps:** 1) For each research record, pull a suitable iNat photo, verify the observation's license, download from the CDN. 2) Add a `photo_credits.json` row with `source_url`. 3) Confirm/assign the final PSBP ID. 4) Flip `status` research → html. 5) Rebake the search JSON (`wildlife.json`, soon to be renamed `wildlife_search.json`).

### C14. Photo credits schema — add `photographer_name`, `observed_on`, rebuild `credit_line`
- **Issue:** Current photo credits use iNat login handles ("robcarr52", "mariaaaz") instead of real names, and have no observation date. The credit line reads like a legal footnote ("© robcarr52 (CC-BY-NC), via iNaturalist") instead of celebrating the contributor. Three new fields needed in `photo_credits.json`:
  - `photographer_name` — display name from iNat (`user.name`), falls back to login if blank
  - `observed_on` — ISO date from the iNat observation (`observed_on`), enables "Photographed May 17, 2025"
  - Rebuilt `credit_line` — leads with the park: "Photographed at Palma Sola Botanical Park by Rob Carr · May 17, 2025"
- **Criticality:** Medium — these photos are the park's story, not stock; the credits should say so. Dates also signal "this is current, not stale."
- **Effort:** Low — the data is already in the iNat API response; the download script just isn't saving it.
- **Steps:** 1) Add `photographer_name` and `observed_on` to `download_species_photos.py` (capture from `user.name` and `observed_on` in the API response). 2) Update `photo_credits.json` schema in DATA_ARCHITECTURE.md. 3) Run C15 backfill for existing downloads. 4) Update `generate_wildlife_pages.py` credit template to prefer name over login and include date.

### C15. Backfill photo metadata for existing downloaded photos
- **Issue:** The 52 photos already downloaded (6 species, 2026-06-19 batch) lack `photographer_name` and `observed_on` — those fields didn't exist when the download script ran. Each photo has `observation_id` (or can derive it from `source_url`), so a one-pass API script can fill them in.
- **Criticality:** Medium — blocks the credit redesign (D12) for existing photos.
- **Effort:** Low — ~52 API calls, one script, one JSON update.
- **Steps:** 1) For each photo in `photo_credits.json` that has `observation_id` but no `photographer_name`/`observed_on`, hit the iNat observation API. 2) Write `user.name` → `photographer_name`, `observed_on` → `observed_on`. 3) Rebuild `credit_line`. 4) Save.

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

### D12. Photo credit redesign — celebration, not footnote
- **Issue:** Photo credits currently read like legal compliance ("© robcarr52 (CC-BY-NC), via iNaturalist") in 12px italic gray — invisible and impersonal. These photos were taken *at the park* by *real visitors*, and the credit should celebrate that, not minimize it. The goal: every visitor who contributes a photo sees their name displayed proudly, which keeps the contribution loop alive.
- **Design direction (not final):** Hero credit as a readable byline at 15–16px in the gold/cream palette: "Photographed at Palma Sola Botanical Park by Rob Carr · May 17, 2025". Lightbox credits with "Observed at Palma Sola Botanical Park." Gallery section header: "Spotted at the park" or "Seen here — photographed by our visitors." License details in a tooltip or secondary line, not the headline.
- **Criticality:** Low — current credits work fine legally; this is brand + community building.
- **Effort:** Medium — design pass on hero credit band, lightbox credit, gallery header. CSS + generator template changes.
- **Depends on:** C14 (schema fields) and C15 (backfill) for real names and dates.

### D13. GitHub Actions — auto-scan for new iNat photos
- **Issue:** Currently, ingesting new photos requires manually exporting observations, running the download script, curating in the review tool, and committing. A GitHub Actions workflow could periodically check the iNat project for new observations, flag new species or new photos for existing species, and either auto-download or notify. This is the "always fresh" goal — a visitor uploads a photo Tuesday, it's on the website by Friday.
- **Criticality:** Low — the manual pipeline works; automation is a scale play.
- **Effort:** High — needs iNat API integration in CI, license checking, photo storage in the repo (LFS?), and a review/approval gate so junk doesn't auto-publish.
- **Steps:** 1) Design the trigger (cron? webhook?). 2) Query the iNat API for new observations since last run. 3) Filter for CC-licensed photos. 4) Download to a staging branch or PR. 5) Human reviews and merges. 6) Generator rebuilds affected pages.

### D14. Retire `photo_focus.json` → migrate focus values into `photo_credits.json`
- **Issue:** The standalone `photo_focus.json` (25 entries mapping PSBP IDs to CSS `object-position` values) is superseded by the `focus` field on hero photos in `photo_credits.json`. During the next full photo review pass, migrate each value into the corresponding hero photo's `focus` field, then delete the standalone file. The 6 species rebuilt on 2026-06-19 already have `focus` in `photo_credits.json`; the remaining ~19 do not.
- **Criticality:** Low — both systems work in parallel; the standalone file is just redundant.
- **Effort:** Low — one script pass + delete.
- **Steps:** 1) For each entry in `photo_focus.json`, find the hero photo in `photo_credits.json` with the matching `psbp_id`. 2) Set `focus` to the value. 3) Verify all 25 migrated. 4) Delete `photo_focus.json`. 5) Remove any references to it in generators/templates.

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
