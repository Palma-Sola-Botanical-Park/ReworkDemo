# PSBP Premium Pages — Maintenance & Cleanup Backlog

Running list of items to address in the **post-build maintenance pass** (after all
~121 pages are generated). Plan: clean the master spreadsheet first, then regenerate
HTML from the cleaned master in one batch. Append to this as new items surface.

Last updated: 2026-06-08

---

## 1. Master data hygiene (the big one)

### 1a. Columns N (Size) & O (Growing Conditions) — format inconsistency
A prior content session changed the writing style mid-sheet. Rows 1–46 use the
canonical **one-field-per-line** style; rows ~47–74 (plus 00106, 00111) switched to
inline run-on or pure prose.

- Column O (Growing Conditions): 95 line-per-key, 13 inline, 14 prose.
- Column N (Size): 97 line-per-key, 12 inline, 13 prose.
- Divergent block starts at **PSBP-00047 (Staghorn Fern)**.
- Inline rows are losslessly convertible (labels exist, just run together).
- Prose rows have no labels and often omit fields — extract what's stated,
  do NOT fabricate missing Light/Soil/Water values; flag blanks for Randy.
- Render impact: **none** — generator parser already handles all three styles.
  This is cosmetic source-data tidiness only.

### 1b. Label drift in N/O
Normalize to the canonical early-sheet labels:
`Light`, `Soil tolerances`, `Drought tolerance`, `Salt tolerance`, `Wind tolerance`,
`Cold tolerance`, `USDA zones` (+ optional `Note`).
Drifted variants to map: `Light requirement`→`Light`, `Soil`→`Soil tolerances`,
`Cold tolerant`→`Cold tolerance`, `Salt tolerant`→`Salt tolerance`. A few mangled
"labels" exist where prose was mis-split (e.g. `Full sun. Drought tolerance:`).

### 1c. Citation markers & Unicode separators in source
- `[1]`, `[2]` citation markers in some fields (e.g. Royal Palm 00035 More Info).
  Parser strips them at render; clean from master for tidiness.
- `\u2028` / `\u2029` Unicode line separators in ~5 fields. Render-normalized but
  messy in source; replace with normal line breaks.

---

## 2. Names & casing (verify in Google Sheet source so fixes don't regress)

- **00010 Geiger Tree** — fixed in working master (was "Geiger tree"; Scarlet Cordia
  alias removed). Confirm the Google Sheet reflects both.
- **00049 "Spath Lilly"** — double-L typo seen in plants.json; should be "Spath Lily".
- Watch for clean-name changes that orphan old page files (see §4).

---

## 3. Photos needed (blocks page generation or leaves blank hero)

### Feature tier — 3 still blocked
- **00015 Coral Bean** — current photo all-rights-reserved; needs replacement.
- **00017 Paurotis Palm** — no photo on file.
- **00114 Pink Orchid Tree** — license needs checking before use.

### Missing images on existing pages (from generate_plants_json.py run)
- 00049 Spath Lily, 00087 Mexican Plumeria (was Frangipani), 00096 Acerola,
  00103 Whorled Pennywort, 00104 Shiny-leaved Wild Coffee, 00107 Trailing Daisy,
  00116 Groundsel Tree. Source/add publish-OK images.

---

## 4. Deploy hygiene — duplicate pages from renamed files
When a master common name differs from an older page's filename, regenerating
creates a NEW file and leaves the OLD one behind → duplicate cards in plants.json.

- Resolved: Dragon Fruit (was Night-blooming-Cereus), Moringa (was Moringa-Drumstick-Tree).
- To delete on next deploy: `PSBP-00010-Geiger-tree.html`, `PSBP-00087-Frangipani.html`.
- **Standing check after every deploy:**
  `ls plants/ | sed -E 's/(PSBP-[0-9]+).*/\1/' | sort | uniq -d`  → should print nothing.

---

## 5. Deferred style decisions (not bugs — confirm preference, then apply in regen)

- **Quick Hits bolding** — original hand-built pages bolded key phrases; generator
  output is unbolded. Decide: add a light auto-bold pass, or leave plain.
- **Own-photo credit style** — currently `Randall Carter · CC BY-NC · via iNaturalist`.
  Set `OWN_PHOTO_PLAIN = True` in the generator for plain `Photo by Randall Carter`.
- **00121 Amazon Lily** — Feature page built earlier (not via generator); still needs
  photo/obs URL back-filled into its credits row. Regenerate through the pipeline once
  its CSV row is complete, for consistency with the rest of the tier.

---

## Build status snapshot (2026-06-08)
- Feature tier: 36 / 39 built (3 photo-blocked above).
- Total premium pages built: 43 / 122.
- Remaining to build: Standard tier (67) + Background tier (16).
