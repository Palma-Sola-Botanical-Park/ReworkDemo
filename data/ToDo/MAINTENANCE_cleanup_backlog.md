# PSBP Premium Pages — Maintenance & Cleanup Backlog

Running list for the **post-build maintenance pass** (after all ~121 pages are
generated). Plan: clean the master, regenerate HTML in one batch, redeploy.

Last updated: 2026-06-08 (evening)

---

## 1. Master data hygiene

### 1a. Columns N (Size) & O (Growing Conditions) — format inconsistency
Rows 1–46 use canonical one-field-per-line; rows ~47–74 (plus 00106, 00111)
switched to inline run-on or pure prose. 27 divergent rows in O, 25 in N.
- Inline rows: losslessly convertible (labels exist).
- Prose rows: no labels, often omit fields — extract what's stated, do NOT
  fabricate; flag blanks for Randy.
- Render impact: none — generator parser handles all styles. Cosmetic only.

### 1b. Label drift in N/O
Normalize to: Light, Soil tolerances, Drought tolerance, Salt tolerance,
Wind tolerance, Cold tolerance, USDA zones (+ Note).

### 1c. Alternate Names separator inconsistency
34 rows use middle-dot, 38 use line breaks, 22 single. Generator now normalizes
all separators into one box, so render is consistent — source still mixed.

### 1d. Citation markers & Unicode separators in source
[1]/[2] markers and U+2028/U+2029 separators in some fields. Parser strips/
normalizes at render; clean from master for tidiness.

---

## 2. Names & casing (verify in Google Sheet source)
- 00010 Geiger Tree — fixed (was "Geiger tree"; Scarlet Cordia alias removed).
- 00012 Dwarf Poinciana — renamed from "Peacock Flower" (now an alias). DONE live.
- 00049 "Spath Lilly" — double-L typo; should be "Spath Lily".

---

## 3. Photos needed (page can't be built / blank hero)
### Photo-blocked, not yet built
- 00015 Coral Bean (all-rights-reserved — replace)
- 00017 Paurotis Palm (no photo)
- 00037 Umbrella Tree (no photo)
- 00114 Pink Orchid Tree (license check)
### Missing images on existing pages
- 00049 Spath Lily, 00087 Mexican Plumeria, 00096 Acerola, 00103 Whorled
  Pennywort, 00104 Shiny-leaved Wild Coffee, 00107 Trailing Daisy, 00116 Groundsel Tree.

---

## 4. Deploy hygiene — duplicate pages from renamed files
Standing check after every deploy:
  ls plants/ | sed -E 's/(PSBP-[0-9]+).*/\1/' | sort | uniq -d   -> should print nothing.
- Resolved: Dragon Fruit, Moringa, Dwarf Poinciana.
- Delete on next deploy: PSBP-00010-Geiger-tree.html, PSBP-00087-Frangipani.html.

---

## 5. Filter / search UI revamp  <- NEW (design agreed 2026-06-08)
Direction: CATEGORY DROPDOWN on top + a single ROW OF ATTRIBUTE BUTTONS under it.
- Category dropdown: 11 categories from master Category (already in plants.json as `cat`).
  Saves space vs chips; mobile-friendly native picker.
- Attribute button row — keep cross-cutting, high-value: Native, Edible, Toxic, Butterfly.
- Remove from the row (they're really categories): Wetland, Invasive.
- Consider: broaden Butterfly -> Pollinator (butterflies + bees + hummingbirds).
- PRINCIPLE: derive filter flags from the MASTER columns / category, NOT by scraping
  rendered badge text. Every filter bug traced to HTML regex scraping.
- Flag-source bugs FIXED this session in generate_plants_json (stopgap until revamp):
  - Wetland: now derived from Category "Native Wetland & Pond Edge".
  - Invasive: was matching "Not Invasive"; now excluded (dropped from ~all to ~5).

## 6. Card badge restyle (off-brand)  <- NEW
Search-result card pills (.tag-native, .tag-nonnative, .tag-toxic, .tag-edible,
.tag-invasive, .tag-butterfly, .tag-wetland in site.css) use a generic semantic
palette (blue/purple/red/saturated-yellow) that clashes with the site's moss/gold/
cream botanical brand.
- Issues: Non-native=blue & Native=red feels crossed (native should read warm/green);
  pills louder than the elegant detail-page badges.
- Fix: retune .tag-* to brand earth-tones; match detail-page badge style so grid and
  pages feel unified. Need css/site.css for this.

---

## 7. Deferred style decisions
- Quick Hits bolding — generator output unbolded; decide whether to add auto-bold.
- Own-photo credit style — OWN_PHOTO_PLAIN flag for plain "Photo by Randall Carter".
- 00121 Amazon Lily — built earlier (not via generator); needs photo/obs URL back-filled.

---

## Build status snapshot (2026-06-08 evening)
- Feature tier: 36/39 built (3 photo-blocked).
- Standard tier: 24/67 built.
- Total premium pages built: 60/122.
- Remaining: ~43 Standard + Background tier (16), minus photo-blocked.
