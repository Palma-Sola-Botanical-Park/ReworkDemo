# Species Data Architecture

**Status:** ACTIVE — this is the governing document for how species content flows through the PSBP site.
**Supersedes:** the xlsx-based pipeline described in the README's "Content build pipeline" section. The README should eventually point here; until then, this document wins on any conflict.
**Last updated:** 2026-06-20 (added §3 "Consuming the registry" — the site-side `photo-credits.js`/`.css` consumer and the standardized credit block; §9/§10 entries. JSON schema unchanged.)

---

## 1. The core idea: four JSON masters, everything derived

All species content — plants, wildlife, photos, physical sign locations — lives in four JSON files in `data/sources/`. Every page, search index, and future map layer is derived from these masters by scripts. Nothing is hand-edited downstream; nothing is scraped from rendered HTML.

### Master files (in `data/sources/`)

| File | Grain | Records | Key | Purpose |
|------|-------|---------|-----|---------|
| `plant_signage.json` | one plant species | 156 | `PSBP-000xx` | All content for plant field-guide pages and signs |
| `wildlife_signage.json` | one animal species | 78 | `PSBP-999xx` | **Authoritative master** (v1.4) — species profiles, seasonality, similar_species, cross-links, observation stats |
| `photo_credits.json` | one photo | ~152+ | `PSBP ID` + `role` | Photo registry — licensing, attribution, filenames, both kingdoms |
| `placements.json` | one physical sign | 76 | `PLC-####` → FK to species | GPS coordinates and area for each sign installation |

### Derived files (in repo root, browser-fetched)

| File | Built from | Purpose |
|------|-----------|---------|
| `plant_search.json` | `plant_signage.json` + `photo_credits.json` | Lean search/filter index for the Nature grid (was `plants.json`) |
| `wildlife_search.json` | `wildlife_signage.json` + `photo_credits.json` | Same, for wildlife (was `wildlife.json`) |

### Derived files (in `plants/` and `wildlife/`)

| Output | Built from | Purpose |
|--------|-----------|---------|
| `plants/PSBP-*.html` | `plant_signage.json` + `photo_credits.json` | Static field-guide pages, one per species |
| `wildlife/PSBP-*.html` | `wildlife_signage.json` + `photo_credits.json` | Same, for wildlife |

### The dependency graph

```
plant_signage.json ──┬──► generate_plant_pages.py ──► plants/*.html
                     │
                     ├──► generate_plant_search.py ─► plant_search.json
                     │         (also reads photo_credits.json for hero image)
                     │
photo_credits.json ──┤
                     │
wildlife_signage.json┬──► generate_wildlife_pages.py ► wildlife/*.html
                     │
                     └──► generate_wildlife_search.py► wildlife_search.json
                               (also reads photo_credits.json for hero image)

placements.json ─────────► (future map/wayfinding layer)
```

Both children of each master read the same parent. Neither child is downstream of the other. Regenerate either independently — they cannot drift.

---

## 2. Species lifecycle: the three statuses

Every species record carries a `status` field that gates what happens to it downstream.

```
research ──► spotted ──► html
```

| Status | Meaning | What triggers the transition | Search index? | HTML page? |
|--------|---------|------------------------------|---------------|------------|
| `research` | Content written, species not yet confirmed at PSBP | iNaturalist observation confirms presence | No | No |
| `spotted` | Confirmed in park via iNat, but no licensed photo or HTML page yet | Licensed photo acquired + HTML page built | No | No |
| `html` | HTML page live on site, searchable in the Nature grid | *(terminal state for species)* | Yes | Yes |

**Key rules:**

- The search index generators emit **only** `html` records. Everything else is invisible to site visitors.
- The page generators build pages **only** for `html` records.
- `research` species sit in the master JSON accumulating content. Think of this as pre-writing obituaries — the research is the slow, expensive part. Flipping a status and running the build is cheap.
- A script can cross-reference `plant_signage.json` against a fresh iNaturalist export CSV (joined on `inat_taxon_id`) and flag any `research` species that now has an observation → candidate for `spotted`.
- The `has_sign` field is **deprecated** — signing is tracked per-placement, not per-species (see below).

### Physical signs are per-placement, not per-species

A species can have multiple physical instances in the park (e.g. 4 Staghorn Ferns). Some might get signs while others don't (the ones twenty feet up a tree can wait). So "is this species signed?" is not a yes/no on the species record — it's a **join** against `placements.json`.

The placement lifecycle is tracked per PLC record in `placements.json`:

```
not_started ──► installed ──► removed / damaged
```

| Status | Meaning |
|--------|---------|
| `not_started` | Sign location identified, no sign installed yet |
| `installed` | Physical sign with QR code is in the ground |
| `removed` | Sign removed (plant died, relocated, etc.) |
| `damaged` | Sign needs replacement |

To answer "which species have at least one sign up?" — query placements grouped by `species_id`, check for any `installed`. Derivable, not stored.

---

## 3. Photo architecture: subfolders, roles, and the collection model

Photos are moving from a flat one-per-species layout to subfolders holding **every** usable photo of each species — not just one per role, but every volunteer's contribution. The registry captures licensing for all of them so future apps (gallery pages, office screen slideshows, curated collections) can draw from the full pool without re-clearing rights.

### Folder structure

One flat folder per species. No sub-subfolders, no naming convention. Files keep whatever name they came in with — the JSON row gives each photo its meaning, not the filename.

```
photos/
  PSBP-00004/
    IMG_3847.jpg
    silk_floss_bloom_rob.jpg
    20231015_094522.jpg
    cleamon_trunk_detail.jpg
  PSBP-00013/
    sunshine_mimosa.jpg
    christine_closeup.jpg
  ...
```

**The only rule:** no duplicate filenames within the same species folder.

### Photo roles (controlled vocabulary — extensible)

A single photo can serve **multiple roles** — a shot of a fruiting branch shows leaves and fruit, and might also be the hero. Roles are open-vocabulary strings stored in an array. **Add new roles freely; document them here when you do.** A role only does something when a generator or app specifically queries for it — undocumented roles are harmless but useless.

`gallery` is special: it's the catch-all for beautiful shots worth surfacing beyond their specific role. Every keeper gets `gallery` even if it also has a specific role. "Show me all the good photos" is always `role contains gallery`.

**Plants:** `whole` · `leaf` · `flower` · `fruit` · `bark` · `gallery` (extend: `seed`, `root`, `cone`, `frond`, `habitat`)

**Wildlife — birds:** `whole` · `portrait` · `flight` · `feeding` · `juvenile` · `display` · `habitat` · `gallery` (extend as needed)

**Wildlife — butterflies/moths:** `adult` · `caterpillar` · `gallery` (extend: `chrysalis`, `egg`)

**Wildlife — other:** `whole` · `gallery` (extend as needed per animal group)

| Role | What it means |
|------|--------------|
| `whole` | Full body, standard ID view |
| `portrait` | Head/face close-up — bill detail, eye color, crest |
| `flight` | In the air, wings visible |
| `feeding` | Actively hunting or eating |
| `juvenile` | Immature plumage/form (critical for species where juveniles look different) |
| `display` | Breeding plumage or behavior — dewlap flash, wing spread, plume show |
| `habitat` | The subject in its environment, wider context shot |
| `adult` | Adult form (butterflies/moths — distinguishes from caterpillar) |
| `caterpillar` | Larval stage (butterflies/moths) |
| `leaf` / `flower` / `fruit` / `bark` | Plant parts |
| `gallery` | Beautiful shot, worth surfacing — the universal "keeper" tag |

### Photo credits registry (`photo_credits.json`)

One record per photo file. Every photo in every subfolder gets a row — the registry is a **complete collection**, not a one-per-role catalog. Flags tell generators which photos to grab for specific purposes; everything else sits licensed and ready.

```json
{
  "psbp_id": "PSBP-00004",
  "type": "Plant",
  "common_name": "Silk Floss Tree",
  "scientific_name": "Ceiba speciosa",
  "role": ["leaf", "fruit", "gallery"],
  "primary_for": ["leaf", "fruit"],
  "hero": true,
  "focus": "43% 57%",
  "photographer": "cleamon",
  "license": "cc-by-nc",
  "publish_ok": true,
  "status": "OK",
  "credit_line": "© cleamon / iNaturalist (CC-BY-NC)",
  "photo_url": "https://inaturalist-open-data.s3.amazonaws.com/...",
  "source_url": "https://www.inaturalist.org/observations/143209347",
  "observation_id": "143209347",
  "photo_id": "245580589",
  "filename": "cleamon_trunk_detail.jpg",
  "tags": [],
  "used_by": []
}
```

### Photo flags and fields

| Field | Type | Rule | Purpose |
|-------|------|------|---------|
| `role` | array of strings | Every photo gets at least one | What the photo shows — can be multiple. Extensible vocabulary, documented above. |
| `primary_for` | array of strings | At most one photo per species per role | The chosen image for that role — generators grab these |
| `hero` | boolean | Exactly one per species | The card image, the sign image, the search index thumbnail |
| `focus` | string or null | Only meaningful on hero photos | CSS `object-position` / `background-position` value (e.g., `"43% 57%"`). Tells the browser where to anchor the crop when the hero is squeezed into a banner or card. Without it, the crop centers at 50% 50% and you may be staring at mud instead of the turtle. Set by clicking on the subject during hero review. `null` for non-hero photos. |
| `photo_id` | string or null | Unique per photo | The iNaturalist photo ID. Used as the filename for iNat-sourced photos (`<photo_id>.jpg`). Prevents re-downloading. `null` for non-iNat photos. |
| `observation_id` | string or null | For iNat-sourced photos | The iNaturalist observation ID — enables deep-linking to the observation without parsing `source_url`. `null` for non-iNat photos. |

**Validation rules:**
- Every species with `status` of `html` must have exactly one `hero: true` photo.
- Every `hero: true` photo should have a `focus` value (not null). Default `"50% 50%"` if not explicitly set.
- A `primary_for` role should not appear on more than one photo per species.
- A photo can be hero AND primary for multiple roles — one file, many jobs.
- `gallery` as a role serves double duty: it marks shots for species-page galleries, office screen slideshows, and any future "best of" features.
- `photo_id` must be unique across the entire registry (no duplicate downloads).
- `observation_id` is populated automatically by the download script; for manually ingested iNat photos, extract it from the observation URL.

### Park and site photos (non-species)

The photo registry covers the entire site, not just species. Venue photos, page-hero backgrounds, volunteer shots, grounds, events — anything that's a *photograph* gets a row. The `type` field expands to `"Plant" | "Wildlife" | "Park"`, and `psbp_id` is null for park photos. Tags carry the searchability.

```json
{
  "psbp_id": null,
  "type": "Park",
  "tags": ["galleria", "interior", "wedding-setup"],
  "role": ["gallery"],
  "primary_for": [],
  "hero": false,
  "photographer": "Randy Carter",
  "license": "owned",
  "publish_ok": true,
  "status": "OK",
  "filename": "galleria_evening_lights.jpg",
  "used_by": ["venue.html"]
}
```

**Storage:** `photos/park/` — one flat folder, same shoebox principle as species folders. Tags are the filing system, not subfolders.

**`used_by`:** an array of pages or features currently referencing this photo (`["venue.html", "page-hero"]`). This is the check-in/check-out layer — before deleting or replacing a file, the registry tells you what breaks.

**What does NOT go in the registry:** logos and brand assets (PSBP logo variants, partner logos). These are site chrome, not attributed photographs. They stay in `images/` (or `images/logos/`).

**File layout after cleanup:**

```
images/                  ← logos and brand assets only
  logos/                 ← PSBP logo variants (PNG, SVG, inverted, etc.)
  partners/              ← partner logos (drives contact.html)

photos/                  ← ALL photographs, species and park
  PSBP-00001/            ← species subfolders
  PSBP-00004/
  ...
  park/                  ← venue, grounds, heroes, events, volunteers
```

### Consuming the registry — site rendering & the credit block (`photo-credits.js` / `.css`)

*Added 2026-06-20.* The registry isn't only storage — the site reads it directly to render imagery and to credit photographers consistently. Two paired runtime files do this:

- **`js/photo-credits.js`** — loads `photo_credits.json`, builds the hero image pool, resolves each image to a working URL, and emits attribution markup.
- **`css/photo-credits.css`** — styles that markup.

**The pair travels together.** Any page that includes both gets identical attribution — same gold byline, same Creative Commons badge — with no per-page credit markup to drift out of sync. (This mirrors the "`site.js` is the brain" principle: define the credit block once, reuse everywhere.) Include them after `site.css` / `site.js`. The home page is the first consumer; Nature grid, species pages, and venue galleries can adopt the same builders.

**The hero pool.** Photos flagged `hero: true` + `publish_ok: true` + `status` starting `OK`, across **both kingdoms**, form a shuffled pool with plants and wildlife interleaved (~180 photos today). The home page draws from it for the rotating hero and the "Ten acres" tiles.

**Image resolution — local first, remote fallback, never broken.** For each photo the consumer tries, in order:

| # | Candidate | Why |
|---|-----------|-----|
| 1 | `photos/<psbp_id>/<filename>` | the subfolder collection model (this section) |
| 2 | `photos/<filename>` (flat, `_`→`-`) | the **current flat layout, mid-migration** |
| 3 | `photo_url` | the iNaturalist CDN — always present in the registry |

The first that loads wins; the remote URL guarantees an image even if a local file is missing or renamed. This is why the front-end keeps working **across the `photos/` flat→subfolder migration with no code change**. Note the filename quirk this bridges: the registry's `filename` uses **underscores** (`PSBP-00004_Silk_Floss_Tree.jpg`), while the current flat on-disk files use **hyphens** (`PSBP-00004-Silk-Floss-Tree.jpg`, per the README naming rule) — step 2 converts `_`→`-` to match.

**Crop anchor.** Hero and tile crops honor the `focus` field (e.g. `"65% 66%"`) as `background-position`, defaulting to `50% 50%` when null — keeping the subject in frame when a hero is squeezed into a banner or card.

**The standardized credit block.** Four render shapes, all from the same builders, so credit looks identical site-wide:

| Builder (JS) | Emits (CSS) | Use |
|---|---|---|
| `PSBPPhotos.attribution()` | `.photo-attr` | Combined overlay (name + photographer + date + CC badge) on a large image — hero, tiles |
| `PSBPPhotos.speciesTag()` | `.species-tag` | Just the species name, pinned **inside** a photo |
| `PSBPPhotos.creditPlate()` | `.credit-plate` | Photographer byline **below** a photo — "PHOTOGRAPH BY" eyebrow + name + date + badge |
| `PSBPPhotos.ccBadge()` | `.cc-badge` | The Creative Commons pill on its own |

**Design intent: credit is a feature, not fine print.** The photographer's name is the visually featured element (brand gold), shown at readable size beside a CC badge that echoes the one iNaturalist displays. This is recognition of and solidarity with the volunteer photographers who built the collection — deliberately *not* a hidden legal line. The badge normalizes the registry's inconsistent `license` values (`cc-by-nc`, `CC-BY-NC`, `nan`, `CC-BY-ND`, `CC-BY-NC-SA`, …) into the correct rights tokens (BY / NC / ND / SA).

**Dates.** The registry currently has **no observed-on/date field** (only `observation_id` / `source_url`). The credit builders read `observed_on` / `date` when present and **omit the date cleanly when absent** — so dates light up automatically once the import pipeline writes one (see §10; the watermark model already lists "date" among fields captured at import). Recommended field name: **`observed_on`** (iNat's own), with optional `time_observed_at`.

**"What's been seen lately" shows the SHARE date, not the capture date.** That home-page mosaic is fed **live from the iNaturalist API** (not the registry) and deliberately shows each observation's **submission** date (`created_at`) — when it was *shared* — rather than `observed_on` (when the shutter clicked). A photo taken in 2025 but uploaded yesterday should read as fresh; showing the observed date made a feed titled "lately" look stale.

**Performance — no practical cap on the hero series.** The rotating hero uses a two-layer recycling crossfade: it paints the next image just-in-time and pre-loads one ahead, so **only ~2 images are ever in memory** regardless of run length. The sequence walks the entire hero pool without repeating, then reshuffles — long non-repeating runs at flat memory and bandwidth. (The earlier "build every slide up front" approach capped realistically at ~12–20 before load/decoded-memory cost showed.)

**House copy.** A standing line sits over the rotating hero, setting the tone for the whole site: *"Every nature photo here was taken by our community — regular people, honoring a place they love."* It's persistent (not per-slide); each slide's own photographer credit rides at the bottom.

---

## 4. Plant signage schema (v1.1)

Each record in `plant_signage.json` under `"species": [...]`:

### Identity and classification

| Field | Type | Example |
|-------|------|---------|
| `id` | string | `"PSBP-00004"` |
| `common_name` | string | `"Silk Floss Tree"` |
| `botanical_name` | string | `"Ceiba speciosa"` |
| `inat_taxon_id` | int or null | `154290` |
| `sign_level` | string | `"Species"` |
| `taxonomy` | object | `{family, genus, species, cultivar?}` |
| `category` | string | `"Tropical Specimen Trees"` |
| `feature_tier` | string | `"Feature"` or `"Standard"` |
| `has_sign` | bool | *(deprecated — use status)* |
| `status` | string | `"research"` / `"spotted"` / `"html"` / `"signed"` |
| `native` | bool or null | `false` |
| `butterfly_host` | bool, array, or null | `null` (to be populated) |
| `alternate_names` | array of strings | `["Floss Silk Tree", "Palo Borracho"]` |

### Content blocks

| Field | Type | Notes |
|-------|------|-------|
| `quick_hits` | array of strings | Typically 3–5 paragraphs. Lead with the park hook. |
| `origin` | string | Geographic provenance, one paragraph. |
| `more_information` | array of strings | Deeper narrative, typically 3–5 paragraphs. |
| `wildlife_value` | array of strings | Ecological role, pollinator connections. |
| `reproduction` | object | See "Labeled block arrays" below. |
| `seasonality` | object | See "Seasonality" below. |

### Labeled block arrays (reproduction)

```json
"reproduction": {
  "blocks": [
    {"label": "Flowers", "text": "Large, showy, hibiscus-like..."},
    {"label": "Fruit", "text": "Large football-shaped capsules..."},
    {"label": "Trunk", "text": "Bottle-shaped, studded with spines..."}
  ],
  "what_to_look_for": "The spiny bottle-shaped trunk is unmistakable..."
}
```

- `blocks` is an ordered array of `{label, text}` objects. Labels are open-vocabulary (60+ distinct across the collection) — not a fixed enum.
- `what_to_look_for` is promoted to its own field (present in 153 of 156 species). The HTML generator can style it distinctly (boxed, icon, different font).
- Every block has a label. The 18 that lacked headers in the original spreadsheet were assigned labels by human review during the initial conversion.

### Seasonality (new in v1.1 — being populated)

```json
"seasonality": {
  "bloom_months": [10, 11, 12],
  "bloom_description": "October through December in Florida",
  "leaf_behavior": "deciduous",
  "fruiting_months": [1, 2, 3],
  "notes": "Flowers on bare branches before leaves return"
}
```

- `bloom_months`: array of month numbers (1–12), enables "What's blooming now?" filtering.
- `leaf_behavior`: `"evergreen"` / `"deciduous"` / `"semi-evergreen"` / null.
- All fields nullable — will be populated over time via research passes.

### Structured key-value fields (size, growing_conditions)

```json
"size": {
  "height": "30 to 60 feet",
  "spread": "20 to 50 feet",
  "habit": "upright with spreading crown, bottle-shaped trunk",
  "growth_rate": "fast when water is abundant",
  "texture": "coarse"
}
```

Keys are snake_cased from the original labels. The common keys are `height`, `spread`, `habit`, `growth_rate`, `texture` (size) and `light`, `soil_tolerances`, `drought_tolerance`, `salt_tolerance`, `cold_tolerance`, `note` (growing conditions), but uncommon keys from the long tail are preserved as-is.

### Safety flags (traffic-light pattern)

```json
"edibility":  {"level": "Yellow", "detail": "Flowers can be steeped..."},
"toxicity":   {"level": "Red", "people": "Toxic if ingested...", "dogs_level": "Red", "dogs": "Toxic to dogs..."},
"invasive":   {"level": "Green", "notes": "Not invasive in Florida."}
```

`level` is the traffic-light color from the spreadsheet (Green/Yellow/Red). The prose field carries the explanation.

---

## 5. Wildlife signage schema (v1.4)

`wildlife_signage.json` is the **authoritative master** for all wildlife content — no upstream spreadsheet. Schema v1.4 (2026-06-19).

Parallels the plant schema with these differences:

| Difference | Plants | Wildlife |
|------------|--------|----------|
| Name field | `botanical_name` | `scientific_name` |
| ID field source | `PSBP Species ID` | `PSBP Animal ID` |
| ID numbering | ascending from `00001` | descending from `99999` |
| Group | *(category serves this role)* | `animal_group` (Bird, Lizard, Butterfly, Dragonfly, Moth, True Bug, Beetle, Crustacean, Mammal, Grasshopper...) |
| Labeled blocks | `reproduction` | `identification` (same `{blocks, what_to_look_for}` shape) |
| Seasonality | `seasonality` object (bloom/fruit months) | `seasonality` object (presence/reliability/months) — see below |
| Safety | `edibility`, `toxicity` | `danger`, `interaction` |
| Conservation | *(not tracked)* | `conservation` with traffic-light |
| Observation data | *(not in signage)* | `observation_stats` with counts and dates |
| Tags | *(not used)* | `tags` array |
| Alt names | `alternate_names` | `also_known_as` |

### Subspecies convention

**Always key to the species level.** The `scientific_name` is the binomial (e.g., `Megascops asio`, not `Megascops asio floridanus`), and `inat_taxon_id` points to the species-level taxon on iNaturalist so observation counts roll up correctly. The Florida race or subspecies name is preserved in `also_known_as` and noted in the body text. This was established 2026-06-19 after discovering that subspecies-keyed records systematically undercounted observations.

### Seasonality (structured — v1.3+)

```json
"seasonality": {
  "presence": "year-round",
  "reliability": "reliable",
  "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  "peak": "Spring and summer breeding season",
  "note": "Quieter and more stealthy in winter."
}
```

| Field | Type | Values |
|-------|------|--------|
| `presence` | string | `"year-round"` or `"seasonal"` |
| `reliability` | string | `"reliable"` / `"occasional"` / `"rare"` — how likely a visitor will actually see it |
| `months` | array of ints (1–12) | Which months the species is present; drives "what's here in June?" filters |
| `peak` | string or null | When it's most visible/numerous |
| `note` | string or null | Extra nuance (e.g., "Nocturnal; detected mainly by voice") |

This shape is intentionally parallel to the plant `seasonality` — both use month arrays for machine-queryable presence. Plants add `bloom_months`/`fruit_months` alongside; wildlife uses `presence`/`reliability` instead.

### Similar species (v1.3+)

```json
"similar_species": [
  {
    "common_name": "Double-crested Cormorant",
    "psbp_id": "PSBP-99989",
    "how_to_tell_apart": "The cormorant has a hook-tipped bill and a shorter tail; the anhinga's bill is straight and dagger-like."
  }
]
```

Cross-links to look-alikes. `psbp_id` is populated when the look-alike is one of our species (enables auto-linking on pages), `null` when it's a species we don't carry (e.g., gallinule vs. American coot).

### Cross-reference and provenance fields (v1.4+ — stubs, to be populated)

| Field | Type | Purpose |
|-------|------|---------|
| `plant_links` | array of `{plant_id, common_name, relationship}` | Host-plant cross-refs by PSBP plant ID; `relationship` ∈ host / nectar / food / shelter |
| `last_reviewed` | ISO date string or null | When a human last fact-checked this record |
| `sources` | array of `{label, url}` | Attribution/provenance for the content (FWC, Audubon, etc.) |

These fields are identical in shape to their plant-side counterparts so one tool can fill both.

### Additional wildlife-specific fields

| Field | Type | Notes |
|-------|------|-------|
| `diet` | string | What it eats |
| `behavior` | string | Key behaviors visitors might observe |
| `sounds` | string | Vocalizations or "Silent" |
| `ecological_role` | string | Role in the ecosystem |
| `plant_connections` | string or null | Prose description of plant relationships (complements structured `plant_links`) |
| `habitat` | string | Preferred habitat types |
| `where_to_look` | string | Park-specific guidance for spotting |
| `when_to_see` | string | Prose seasonality (retained alongside structured `seasonality`) |
| `danger` | object | `{people_level, people, pets_level, pets}` — traffic-light |
| `interaction` | object | `{level, guidance}` — traffic-light |
| `invasive` | object | `{level, notes}` — traffic-light |
| `conservation` | object | `{level, status}` — traffic-light (prose, not structured) |
| `observation_stats` | object | `{psbp_observations, distinct_observers, first_observed, last_observed}` |
| `internal_notes` | string | Maintenance notes, not visitor-facing |

The `identification` field uses the same `{blocks: [{label, text}], what_to_look_for}` shape as plant `reproduction`.

---

## 6. Search index schemas (lean projections)

`plant_search.json` and `wildlife_search.json` carry only the fields needed for the Nature grid: searching, filtering, and rendering a card. They are deliberately lean — a few hundred bytes per species vs. several KB in the signage master.

**Projected fields (approximate — finalize when building the generator):**

| Field | Purpose |
|-------|---------|
| `id` | Links to the HTML page |
| `common_name`, `scientific_name` | Display + search |
| `category` | Filter dropdown |
| `native` | 🌿 Native filter chip |
| `butterfly_host` | 🦋 Butterfly filter chip |
| `photo` | Hero image path (from `photo_credits.json`, primary=true) |
| `page_url` | Path to HTML page |
| `quick_hit` | First quick_hits paragraph, for the card preview |

**Filter rule:** only `status === "html"` records are included.

---

## 7. Placements (physical sign locations)

`placements.json` is a flat array keyed by `PLC-####`, each carrying a foreign key to a species ID.

```json
{
  "placement_id": "PLC-0001",
  "species_id": "PSBP-00001",
  "common_name": "Tree Crinum",
  "area": "Front Island near Fountain",
  "latitude": 27.5141042,
  "longitude": -82.6597178,
  "status": "not_started",
  "notes": null
}
```

- **Placement status vocabulary:** `not_started` → `installed` → `removed` / `damaged`. This is the sign lifecycle, independent of the species content lifecycle.

- **Multi-instance ready:** multiple PLC rows can share one species ID (e.g. 4 Staghorn Ferns = 4 PLC records, one PSBP species page).
- **Location source is Google Earth / KML** — hand-placed, precise. iNaturalist GPS is deliberately not used (too sloppy for sign placement).
- **Future per-instance observation linkage:** via an iNaturalist Observation Field "PSBP Placement" filled at capture time, not GPS matching.

---

## 8. Migration notes

### What this replaces

The original pipeline was: xlsx spreadsheet (edit surface) → `generate_plant_pages.py` (reads xlsx + CSV) → HTML pages → `generate_plants_json.py` (reads HTML) → `plants.json`. This had two problems: the search index was downstream of the pages (two-hop chain, stale-if-not-rebuilt), and every build required uploading the xlsx into a Claude session.

The new pipeline is: JSON masters (edit surface) → generators read JSON directly → HTML pages and search indexes are sibling outputs of the same parent. Neither is downstream of the other.

### What happened to the spreadsheets

The xlsx and CSV files in `data/sources/` are retained as historical artifacts. The initial JSON masters were converted from them by `convert_plant_signage.py` and `convert_wildlife_signage.py` (also in `data/sources/`). Those converter scripts are one-time tools, not ongoing infrastructure.

### The B3 cleanup

The backlog item B3 (messy Size/Growing Conditions cells mixing clean key-value lines with run-on prose, stray U+2028 Unicode separators) was resolved during the JSON conversion. The converters normalize all separators and parse key-value lines into structured objects. The mess is frozen into clean structure; no downstream parser will encounter it again.

---

## 9. Decision log

- **Four JSON masters, not one.** Plants and wildlife have different schemas (~half the columns differ). Photos and placements are different grains (one-to-many children of species). Combining any of these would produce a sparse, hard-to-diff file. Separate where schemas diverge; combine where they're identical (photos span both kingdoms in one registry).
- **Static HTML, not client-side rendering.** QR-driven park visitors scan on phones with poor signal. A baked HTML page is one request. A fetch-JSON-then-render template is slower and fragile where it's used most. Static also indexes for SEO.
- **`status` replaces `has_sign`; signing is per-placement.** Three species statuses (research → spotted → html) track the content lifecycle. Physical sign installation is tracked per-placement in `placements.json` (not_started → installed → removed/damaged) because a species can have multiple physical instances, some signed and some not. "Is this species signed?" is a join, not a flag — a lesson learned when we realized two Staghorn Ferns might get signs while two others are twenty feet up a tree.
- **Labeled block arrays, not fixed subfields.** Plant reproduction has 60+ distinct header labels across the collection. Fixed named fields would lose the long tail (Knees, Crownshaft, Male cones). An ordered array of `{label, text}` preserves every label while keeping a uniform structure for the generator.
- **Arrays of strings for unlabeled multi-paragraph fields.** Quick Hits, More Information, Wildlife Value — these are N paragraphs with no headers. An array is the natural structure; the generator iterates however many exist. No max, no empty numbered slots.
- **`what_to_look_for` promoted out of the block array.** It appears in 153/156 plants and 47/47 animals. It's semantically special (the field-ID hook for visitors) and deserves its own styling. Promoting it to a named field lets the generator treat it differently without scanning the array.
- **Seasonality as a structured field, not prose extraction.** Bloom timing was buried across Quick Hits, Reproduction, and Wildlife Value. A dedicated `seasonality` object with month arrays enables "What's blooming now?" — a question visitors and staff ask constantly.
- **Photo subfolders as a collection, not a card catalog.** Every usable volunteer photo goes in the subfolder and gets a `photo_credits.json` row with full licensing. `role` is an array (a single shot can show leaf + fruit + be gallery-worthy). `primary_for` flags the chosen image per role; `hero` flags the one card/sign image; `gallery` as a role marks shots for future slideshows, galleries, and office screens. Capturing licensing now is what makes future apps possible — storage is cheap, re-clearing rights later is not.
- **One photo registry for the whole site.** Species photos, venue shots, page heroes, volunteer pics — all in `photo_credits.json`. The alternative (separate tracking for "site images") fragments licensing and makes searching impossible. `type` and `tags` distinguish species from park photos; `used_by` tracks what's referenced where.
- **Subspecies always folded to species (2026-06-19).** Wildlife records are keyed to the species-level iNat taxon, never the subspecies. The Florida race name goes in `also_known_as` and the body text. This prevents observation undercounting — iNat users ID at different taxonomic levels, and a subspecies-keyed record misses anyone who labeled at species level. Three records were folded during the initial audit: Eastern Screech-Owl (from *M. a. floridanus*), Zebra Longwing (from *H. c. tuckeri*), Mangrove Skipper (from *P. b. okeechobee*).
- **Structured seasonality on wildlife, parallel to plants (2026-06-19).** Wildlife `seasonality` uses `presence`/`reliability`/`months` (month array) instead of plant-side `bloom_months`/`fruit_months`, but both share the month-array pattern for machine-queryable "what's here now?" filtering. The prose `when_to_see` field is retained alongside for human reading.
- **`similar_species` as structured cross-links (2026-06-19).** Look-alike pairs (anhinga/cormorant, green/brown anole, the three cooters/sliders) are wired by PSBP ID, enabling auto-generated "Confused with?" cards on species pages. `psbp_id` is null when the look-alike isn't one of ours.
- **Conservation status kept as prose, not structured (2026-06-19).** Considered `{federal, state, iucn}` object fields but decided the maintenance cost outweighs the benefit — conservation statuses change rarely and are best verified by a human when they do (cf. wood stork ESA delisting, March 2026). The traffic-light `level` (Green/Yellow/Red) is sufficient for filtering.
- **`wildlife_signage.json` is authoritative — no upstream spreadsheet (2026-06-19).** The `meta.source` field was updated to reflect this. The xlsx is retained as a historical artifact only. All edits happen in the JSON master.
- **Credit is a feature, not fine print (2026-06-20).** Photographer attribution on the site is rendered prominently — name in brand gold at readable size, beside a Creative Commons badge that mirrors iNaturalist's. The collection is built by volunteers; the site recognizes them out loud rather than hiding a legal line. See §3 "Consuming the registry."
- **One credit block, shared CSS + JS (2026-06-20).** `js/photo-credits.js` + `css/photo-credits.css` are a pair: the JS emits the classes, the CSS styles them, and any page including both renders identical attribution. Chosen over per-page credit markup (which drifts) — same reasoning as keeping nav/footer in `site.js`. Builders: `attribution()` (combined overlay), `speciesTag()` (name inside a photo), `creditPlate()` (byline below a photo), `ccBadge()` (the CC pill alone).
- **Site reads the registry directly, with a remote fallback (2026-06-20).** The consumer resolves each image local-subfolder → local-flat → `photo_url` (iNat CDN). The always-present remote URL guarantees no broken image and lets the front-end survive the `photos/` flat→subfolder migration with no code change. The hero pool is `hero && publish_ok && status~OK` across both kingdoms, interleaved.
- **"Lately" shows the share date, not the capture date (2026-06-20).** The home "What's been seen lately" mosaic reads live from the iNat API and displays `created_at` (when shared), not `observed_on` (when shot). A recently-uploaded older photo should read as fresh; the observed date made the feed look stale.
- **Hero slideshow recycles two layers (2026-06-20).** Just-in-time paint + one-ahead preload keeps ~2 images in memory no matter how long it runs, so the hero walks the whole pool non-repeating and reshuffles — no realistic cap, flat memory/bandwidth. Replaced an eager "load all slides up front" approach that capped near 12–20.

---

## 10. Migration TODO

Tasks to fully realize this architecture, roughly in dependency order.

### Phase 1 — Foundation (do first)

**T1. Build `photo_credits.json` from existing CSV.**
Convert `Plants_and_Wildlife_Photo_Credits.csv` into the new JSON schema (arrays for `role`, `primary_for`; `hero` flag; `type` field). Initial load: all existing photos get `role: ["whole"]`, `primary_for: ["whole"]`, `hero: true` (they're the only photo per species today).

**T2. Build `placements.json` from the Placements tab.**
Convert the xlsx Placements tab to JSON. Straightforward — 76 rows, clean schema.

**T3. Decide final file locations for `images/` cleanup.**
Audit everything in `images/`. For each file, decide: logo/brand asset (stays in `images/logos/`), partner logo (stays in `images/partners/`), or photograph (moves to `photos/park/`, gets a registry row). Script the moves so nothing breaks silently — check every HTML/CSS reference before deleting the old path.

**T4. Run an unused-photo sweep.**
After T3, script a diff: every file in `photos/` and `images/` that has NO reference in `photo_credits.json`, no CSS/HTML `src` or `url()` pointing to it, and no `used_by` entry → candidate for removal. Review the list manually before deleting. Re-run after any major reorganization.

### Phase 2 — Generators (enables the new pipeline)

**T5. Build `generate_plant_search.py`.**
Reads `plant_signage.json` + `photo_credits.json` → emits `plant_search.json`. Filters on `status in ("html", "signed")`. Projects only the fields the Nature grid needs. Replaces the current `generate_plants_json.py` (which reads HTML).

**T6. Build `generate_wildlife_search.py`.**
Same pattern for wildlife. Replaces `generate_wildlife_json.py`.

**T7. Update `generate_plant_pages.py` to read JSON.**
Currently reads the xlsx + CSV. Rewrite to read `plant_signage.json` + `photo_credits.json`. The page template and CSS stay the same; only the input source changes.

**T8. Build `generate_wildlife_pages.py`.**
Does not exist today (wildlife pages were hand-built). Now that `wildlife_signage.json` is structured identically to the plant master, building this generator is straightforward.

### Phase 3 — Enrichment (do anytime, no dependencies)

**T9. Populate `seasonality` on plant records.**
Research pass to fill `bloom_months`, `leaf_behavior`, `fruiting_months`. Can be AI-assisted (the data is often already in the reproduction Flowers block — just needs extraction into structured fields). Enables "What's blooming now?" filtering.

**T10. Populate `butterfly_host` on plant records.**
Tag the known host plants. Short list — maybe 15–20 species. Gives the 🦋 filter chip a clean data source in the search index.

**T11. Cross-reference signage JSONs against iNat export.**
Script: read `plant_signage.json`, read fresh iNat CSV, join on `inat_taxon_id`. Any `"research"` species with a matching observation → flag as `"spotted"`. That's your punch list of species needing a licensed photo and HTML page.

**T12. Ingest Rob's / Christine's / volunteer photos.** ✅ TOOLING BUILT (2026-06-19)
`download_species_photos.py` automates the iNat photo pipeline: queries all observations for a species, filters for CC-licensed photos, downloads originals to `photos/PSBP-xxxxx/` subfolders (one flat folder per species, filenames are iNat photo IDs), and appends `photo_credits.json` entries with full attribution. New photos enter as `role: ["gallery"], hero: false`; hero promotion is manual. Supports single-species, batch, and `--all` modes with `--dry-run`. Companion script `tag_inat_observations.py` writes PSBP IDs to the iNat "Unique ID" observation field (78 species tagged as of 2026-06-19).

### Ongoing process: checking in a non-iNat photo

When someone hands you a photo that didn't come through iNaturalist:

1. **Get the rights clear.** Who took it? What license are they granting? If unclear, ask before using. Record the answer — that's what goes in the registry.
2. **Drop the file** into the species subfolder (`photos/PSBP-xxxxx/`) or `photos/park/` for non-species shots. Filename doesn't matter — whatever it came in as.
3. **Add a row to `photo_credits.json`** with: photographer, license, `publish_ok`, `status`, `filename`, `role` array, and `primary_for` / `hero` flags if it's being promoted. For park photos, set `tags` and `used_by`.
4. **If it changes a hero or primary:** update the old photo's flags (demote it) so the one-hero-per-species and one-primary-per-role rules hold.
5. **Rebuild as needed:** if the photo is a new hero or the species status is advancing, re-run the relevant generators.

### Ongoing process: checking in an iNat photo

1. **Verify the license** on the iNaturalist observation page (CC-BY-NC or more permissive).
2. **Download** the photo from the iNat CDN URL.
3. **Drop + register** — same as steps 2–5 above, but `source_url` points to the iNat observation, `observation_id` carries the numeric ID, and `photo_url` points to the CDN link.

### Migration: `photo_focus.json` → `focus` field (2026-06-19)

The standalone `photo_focus.json` file (25 entries mapping PSBP IDs to CSS `object-position` values) is superseded by the `focus` field on hero photos in `photo_credits.json`. During the next photo review pass, migrate each value into the corresponding hero photo's `focus` field, then retire the standalone file. The review tool handles this automatically for new hero assignments.

### Ongoing photo import pipeline (watermark model, planned)

**Problem:** The park's iNat project grows continuously. A "pull everything, reject what's bad" model scales poorly — at 2000+ photos, most curation time is spent rejecting. Blocklists grow forever.

**Solution: watermark-based incremental import.** Track the newest observation date already reviewed. Each scan only surfaces what's arrived *since then*. No re-reviewing, no blocklist needed, no need to account for every photo on iNat.

**Pipeline stages:**

1. **Scan** (automated, on-demand or scheduled)
   Query iNat API for observations in the project newer than the watermark. Produce a *review manifest* — lightweight summary with iNat thumbnail URLs, observer, species, license, date. No downloads yet. Output: "14 new observations, 23 photos since last scan."

2. **Curate** (human, ~10 minutes)
   Open the manifest in a review tool showing iNat thumbnails (not local files). For each photo: tap "import" or skip. Skipping is not blocklisting — the photo stays on iNat, ignored. You're picking winners, not cataloging losers. Typical accept rate: 15–25% of photos.

3. **Import** (automated)
   Download only the accepted photos into `photos/PSBP-xxxxx/` subfolders, add `photo_credits.json` entries with full attribution (photographer name, date, license, observation_id, focus default). Typically 3–8 photos per scan.

4. **Advance watermark**
   The scan timestamp moves forward. Next scan starts from here. Previous photos are never re-surfaced.

5. **Hero refresh** (separate, lower-frequency pass — monthly or event-driven)
   Review tool for comparing current hero against new imports. "Rob just uploaded a stunning flight shot of the osprey — swap the hero?" Not part of the weekly import; a distinct curation task.

**Watermark storage:** A single `last_scan_date` field in `photo_credits.json` meta block, or a standalone `.last_scan` file. The scan script reads it, queries iNat for `created_d1={date}`, and writes the new date on completion.

**Volume math:** The one-time backfill (June 2026) processes ~2000 photos retroactively. After that, the incremental rate is ~10–30 observations per week during active season (spring–fall), near zero in winter. A weekly scan surfacing 10–30 photos for quick yes/no is completely manageable — under 10 minutes.

**What this model explicitly does NOT do:**
- Account for every photo on iNat (only winners are imported)
- Maintain a blocklist (the watermark replaces it; skipped photos are simply not imported)
- Automate quality judgment (humans are faster and better for small batches)
- Require a fixed cadence (run the scan whenever — weekly, after a volunteer event, when an observer uploads a batch)

### Wiring dates into the credit block (when the import pipeline lands)

The site-side credit block (§3 "Consuming the registry") already reads a date field and displays it — but only on the hero and "Ten acres" tiles, and only if the field exists. Today it doesn't, so those blocks show photographer + license without a date. Two small follow-ups close the loop:

- **Write `observed_on` (and optional `time_observed_at`) at import.** The import step already lists "date" among the attribution fields it captures; pin the field name to **`observed_on`** (iNat's own) so the consumer picks it up with zero front-end change. It reads `observed_on || date`, so either name works, but standardize on one.
- **The live "lately" mosaic needs nothing** — it gets `created_at` straight from the API. This note is only about the registry-driven blocks.

### Optional: a lean `hero_photos.json` projection (when the registry grows)

The home page currently fetches the **full** `photo_credits.json` master client-side to build the hero pool. That's fine at today's size, but it runs against the "browser gets lean projections, not masters" principle (§6). When the registry reaches the thousands, add a generator that emits a root-level **`hero_photos.json`** — only `hero: true` rows, carrying the few fields the credit block needs (`psbp_id`, `filename`, `photo_url`, `focus`, `photographer`, `license`, `type`, and `observed_on` once it exists). The consumer would fetch that instead. Parallel to `plant_search.json` / `wildlife_search.json`; not needed yet.
