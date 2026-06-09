# 🌿 PSBP Premium Plant Pages — HANDOFF for the Next Claude

**Read this first.** It's the complete state of the project so nothing gets lost
between sessions. Written 2026-06-08 after building 70 of 122 pages with Randy.

---

## TL;DR — where things stand

- **Goal:** generate phone-optimized "premium" HTML pages for every plant in the
  Palma Sola Botanical Park collection, driven by a master spreadsheet + a photo-
  credits CSV, using a reusable Python generator. Hand back in batches of 10.
- **Built so far: 70 / 122.** Feature tier 36/39 (complete bar 3 photo-blocked).
  Standard tier 34/67. Background tier (16) not started.
- **The pipeline works end-to-end and is proven live** (search, photos, renames).
- **Next:** keep building Standard batches → Background tier → then a single
  data-cleanup + UI maintenance pass (see the backlog file).

---

## THE FILES (re-upload these to resume)

1. **PSBP_Master_Plant_Signage.xlsx** — content master, tab `PSBP_Plants`, 122 rows,
   30 cols. THE source of truth for page content. (This copy has two fixes baked in:
   00010 "Geiger Tree" casing + Scarlet Cordia alias removed; 00012 renamed to
   "Dwarf Poinciana" with Peacock Flower as alias.)
2. **Plants_and_Wildlife_Photo_Credits.csv** — Randy's photo credits, PSBP-ID keyed,
   one `Primary == Yes` row per plant. REQUIRED generator input. Unchanged by Claude.
3. **generate_plant_pages.py** — THE GENERATOR (Claude's). Master + CSV → HTML pages.
4. **generate_plants_json.py** — Randy's script. Reads the `plants/` folder → builds
   `plants.json` for the Nature page. (Has 2 flag fixes — see Gotchas.)
5. **PSBP_Premium_Page_Tracker.xlsx** — build progress (Page Built / Date / Notes per ID).
6. **MAINTENANCE_cleanup_backlog.md** — everything deferred to the maintenance pass.
7. **REFERENCE_PSBP-00003-Buccaneer-Palm.html** — the page standard. The generator
   reads its `<style>` head; you need a built page as the style reference to run it.
8. (For the UI maintenance work only) **nature.html**, **site.js**, **css/site.css**.

The 70 built pages live in Randy's repo (`plants/`) and are fully regenerable from
master+CSV+generator — no need to re-upload them.

---

## THE PIPELINE (how it all fits)

```
PSBP_Master_Plant_Signage.xlsx  +  Plants_and_Wildlife_Photo_Credits.csv
        │
        │  generate_plant_pages.py   ← CLAUDE runs this; produces HTML
        ▼
   plants/PSBP-XXXXX-Name.html   (the premium pages)
        │
        │  generate_plants_json.py   ← RANDY runs this in his repo
        ▼
   plants.json   (index: id, common, sci, family, aliases, cat, flags, photo, page, quick)
        │
        ▼
   nature.html + site.js   →  searchable/filterable plant grid
```

**Two scripts, do not confuse them** (this tripped Randy up early):
- `generate_plant_PAGES.py` = Claude's, makes HTML. Claude runs it.
- `generate_plants_JSON.py` = Randy's, makes the index. Randy runs it in the repo
  AFTER new HTML is in `plants/`. It reads the folder, so order matters.

---

## THE GENERATOR (generate_plant_pages.py)

Run: `python3 generate_plant_pages.py PSBP-00045 PSBP-00046 ...`  or  `--tier Standard`.

**Config flags at top:**
- `MASTER`, `CREDITS`, `REF`, `OUTDIR` — paths. NOTE: they point at the Claude
  sandbox (`/mnt/...`, `/home/claude/...`). Edit them for local use, or just let
  Claude run it in-session (Claude generally copies a `master_fixed.xlsx` into
  `/home/claude/work/` and points MASTER there).
- `DISPLAY_NAME = {"randall_carter": "Randall Carter"}` — maps the iNat handle of the
  park's own photographer to his real name in credit lines.
- `OWN_PHOTO_PLAIN = False` — if True, Randall's own photos read "Photo by Randall
  Carter" with no license/iNat tail. Currently the full iNat line is used uniformly.
- `CHUNK_CHARS = 300` — breakless prose longer than this gets sentence-chunked.

**What it handles (hard-won — see Gotchas for the why):**
- Credit line from CSV; `randall_carter` → "Randall Carter"; license code → display
  (cc-by-nc → CC BY-NC); not-publish-OK → "Photo Coming Soon".
- Badges from the master's Green/Yellow/Red columns + Native/Non-native.
- `Quick Hits` / `More Information` / `Origin` / `Wildlife Value`: splits on blank
  lines AND Unicode separators, strips `[1]` citations, parses `Subheading\nbody`
  into bold lead-ins, sentence-chunks long breakless blocks.
- `Size` + `Growing Conditions` data grid: parses ALL THREE master styles —
  line-per-key, inline `Label: val. Label: val.`, and pure prose (renders as
  full-width cells; never an empty grid).
- `Alternate Names`: normalizes every separator style (line breaks, ` · `, spaced
  dashes) into ONE dot-joined "Also Known As" box; drops any alias equal to the name.
- Filenames/slugs: drop apostrophes, non-alnum → hyphen, preserve case.

---

## SETTLED DECISIONS (do not re-litigate)

- **Page standard** = the reference Buccaneer layout (hero, scientific band, credit
  line, badges, stacked sections, floating "All Plants" button, `injectShared({inatBar:false})`).
- **Content = light transforms of master text**, not rewrites. Master prose is clean;
  preserve it. (Don't fabricate — especially don't invent Size/Growing fields that
  prose rows don't state.)
- **Title = the master Common Name** (what the park's signs say / most instructive to
  a FL visitor). iNat's "preferred" name goes in aliases. E.g., Dwarf Poinciana (not
  Peacock Flower) as title; Giant Milkweed (not Crown Flower) as title.
- **Credits uniform from CSV**, iNat-style line, real name for Randall.
- **Aliases render as one dot-separated box** (Randy's aesthetic preference; also
  search-friendly).
- **Hero category** = master Category with " and " → " & ", pass-through.
- **PSBP IDs frozen.** Plants count up from 00001.

---

## GOTCHAS / HARD-WON LESSONS (the expensive ones)

1. **CASE SENSITIVITY.** GitHub Pages is Linux (case-sensitive); Randy's Mac is not.
   A page that points at `Geiger-tree.jpg` works locally but 404s live if the file is
   `Geiger-Tree.jpg`. Slugs come from the master Common Name's casing — keep names
   Title Case. This was the "blank photo" bug.

2. **DUPLICATE PAGES ON RENAME.** When a master name changes, the new file has a new
   name and the OLD file stays in `plants/` → `plants.json` gets TWO cards. Always
   `git rm` the old file. Standing check after every deploy:
   `ls plants/ | sed -E 's/(PSBP-[0-9]+).*/\1/' | sort | uniq -d` → must print nothing.
   (Resolved historically: Dragon Fruit, Moringa, Dwarf Poinciana. Still to delete on
   the relevant deploy: PSBP-00010-Geiger-tree.html, PSBP-00087-Frangipani.html.)

3. **THE CREDITS CSV IS REQUIRED.** Without it, credit lines fall back to "Photo
   Coming Soon" (or, in the old broken pages, literal `[photographer]`). Always have it.

4. **THREE MASTER FORMATS exist in Size/Growing AND in Alternate Names** (a prior
   session changed style mid-sheet, ~row 47+). The generator now absorbs all of them,
   so pages render fine — but the SOURCE DATA is still inconsistent (logged for the
   maintenance pass; it's cosmetic, not functional).

5. **FILTER FLAGS MUST COME FROM THE MASTER, NOT BADGE-SCRAPING.** `generate_plants_json`
   originally derived flags by regex-ing the rendered HTML badges. That caused:
   - Wetland filter dead (no wetland badge existed) → FIXED: derive from Category
     "Native Wetland & Pond Edge".
   - Invasive filter matched "Not Invasive" → returned ~everything → FIXED: exclude it.
   Both fixes are in the current `generate_plants_json.py`. The proper long-term fix
   (maintenance pass) is to derive ALL flags from master columns.

6. **SEARCH DIDN'T INDEX ALIASES.** `filterPlants()` in site.js scored common/sci/
   family/quick but not aliases (the wildlife search did). FIXED: added aliases at +70.
   Also added a load-time **precompute** (lowercase fields once, not per keystroke) for
   scale, and dropped the dead `more` tier. All in the current site.js.

---

## DEPLOY PROCEDURE (Randy does this; give him copy-paste commands)

Randy is on a Mac, uses GitHub Desktop, deploys himself. Repo:
`/Users/fiona/Documents/GitHub/ReworkDemo/`. He likes full-path, copy-paste commands.

Per batch:
1. Download the HTML pages from chat → drop into `plants/`.
2. If any were renamed, `git rm` the old file(s) first.
3. Make sure each photo exists at `photos/PSBP-XXXXX-Name.jpg` (matching case!).
4. `cd /Users/fiona/Documents/GitHub/ReworkDemo`
5. `ls plants/ | sed -E 's/(PSBP-[0-9]+).*/\1/' | sort | uniq -d`  (expect nothing)
6. `python3 generate_plants_json.py`  (watch for "photos not found" warnings)
7. Commit + push in GitHub Desktop. Hard-refresh (Cmd-Shift-R) to dodge cached JS/JSON.

Script/CSS-only changes (site.js, generate_plants_json.py) deploy the same way minus
the page steps.

---

## WHAT'S NEXT (suggested order)

1. **Finish Standard tier** (~33 to go) in batches of 10, photo-vetted, collision-
   checked. Skip photo-blocked; pull the next publish-OK plant to keep batches at 10.
2. **Background tier** (16 plants) the same way.
3. **Photo-blocked plants** — one-liners to generate once images land:
   Coral Bean (00015), Paurotis Palm (00017), Umbrella Tree (00037),
   Chenille Plant (00050), Pink Orchid Tree (00114).
4. **Maintenance pass** (see backlog): clean master data (Size/Growing/Alternate Names
   formats, label drift, citation/Unicode cruft), then regenerate affected HTML in one
   batch; build the filter UI revamp (category dropdown + Native/Edible/Toxic/Butterfly
   row; Wetland/Invasive become categories); restyle card badges to brand earth-tones.

---

## WORKING WITH RANDY (so the next Claude clicks too)

- He deploys everything himself and tests live. Give **exact, copy-paste terminal
  commands with full paths**, and tell him precisely what to verify.
- He **spot-checks** output and catches real issues (the wall-of-text, the off-brand
  badges, the alias search). Take his observations seriously — they've all been right.
- He values **honesty about tradeoffs** and clear teaching (the case-sensitivity and
  precompute explanations landed well). Explain the "why," not just the "what."
- He prefers **momentum**: build, validate, hand back, repeat. But he's happy to pause
  for a real design decision (filter revamp). Don't bolt half-baked UI on mid-build.
- **Content voice:** community-first, instructive for a Florida visitor, no stale
  time-based stats, readable on a phone. Names that teach (Dwarf Poinciana ↔ Royal
  Poinciana) over database-preferred names.
- Validate every batch before handing back: no `[photographer]`/"Coming Soon",
  no `[n]` citations, no >650-char walls, every data grid ≥2 cells, structure intact.

You're inheriting a clean, working pipeline and a great collaborator. Have fun. 🌴
