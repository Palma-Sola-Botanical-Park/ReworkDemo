# Handoff Brief — Feed Monitoring Engine

**Purpose:** Bolt a real monitoring/observability layer onto the existing Sheet→JSON
sync pipeline. This brief is self-contained: paste it into a fresh chat to start at
full speed. All decisions below are LOCKED (already debated and settled).

---

## How to start the new chat

Open with: *"Build the feed monitoring engine. Locked contract is in this brief.
Here are the current files."* Then attach the file list in the last section.

Build it as ONE big rollout (not staged) — the pieces share a data contract, so
half-states aren't worth babysitting.

---

## Context: what already exists (don't rebuild)

A working Sheet→JSON pipeline (`SHEET_SYNC_ARCHITECTURE.md` governs it):
- `fetch_sheets.py` (stage 1) pulls each tab's CSV → `data/staging/<tab>.json` (raw, faithful).
- `validate_promote.py` (stage 2) validates against `data/schemas/<tab>.py`, gates, and writes
  `data/published/<tab>.json` + `_health.json` + `_runlog.json`.
- Five feeds live: events, classes, volunteer, news, newsletters.
- The browser reads validated JSON via `fetchTab()` in `site.js` (tabs in the `MIGRATED` set).
- `data-health.html` is the current (basic) dashboard. `.nojekyll` at repo root is REQUIRED
  (Pages runs Jekyll, which 404s `_`-prefixed files).

### The current gate has exactly two failure scopes (this is the gap we're filling)
- **file-level**: a required *column* (header) is missing → block the whole tab, serve last-known-good.
- **row-level**: a row is malformed → quarantine (drop) that row, publish the rest.
- A rule with `severity:"error"` + `scope:"row"` is the ONLY combination that quarantines.
  Everything else is a warning. File-blocking comes ONLY from `required_headers`, never a rule.
- **THE GAP:** nothing looks at the feed *as a whole*. If 25 rows become 3, every surviving
  row is individually valid, so it sails through GREEN with 22 rows silently gone. No guard
  catches mass loss.

---

## The build: three things woven together

### 1. Per-rule instrumentation (rules become observable objects)
The engine already runs each rule against each row but throws away the tally — it only keeps
failures as message strings. Change the rule loop to COUNT, per rule, per run:
- rows evaluated, rows passed, rows flagged, + a few example violations
- each rule gets a stable ID and a live status: green (all passed) / amber (some flagged) /
  gray (dormant — its column isn't in the sheet)
- persist a violation history so the detail page can show each check's status + trend

### 2. Plain-language `why` on every rule + `human` summary per schema
This is the hard CONTENT layer, and the rule below is FINAL:
- `why` is MINIMAL, PAGE-AGNOSTIC, LITERAL. It restates what the rule checks in plain English —
  NOT a downstream-consequence essay. Examples:
  - date/required → "Can't be blank."
  - date/iso_date → "Must be a real date (YYYY-MM-DD)."
  - weekday/in_vocab → "Must be one of Mon, Tue, Wed, Thu, Fri, Sat, Sun."
  - category/in_vocab → "Must be one of the 8 approved categories."
  - display/in_vocab → "Must be web, both, screen, or off — a typo hides the row from everyone."
  - date_end/ge_field → "If set, can't be earlier than the start date."
- The engine IGNORES `why` (like the inert `tab` key); it's written into `health/<tab>.json`
  so the detail page renders rule + status + reason side by side.
- Each schema also gets a one-line `human` summary (e.g. "Park news stories — one row per story").
- **Division of labor:** Claude drafts ALL ~40 `why` lines across the 5 schemas from the code,
  and hands them back as a REVIEW pass (not a blank page). Randy fact-checks the handful that
  are wrong. (Doing them from scratch is brutal; this is the humane way.)

### 3. One volume guard (fills the gap) — minimal by design
- Rule: **zero rows → BLOCK** (serve last-known-good; an empty feed almost always = broken fetch,
  not a real edit). **Every other delete passes**, including big ones.
- Rationale (LOCKED): the Google Sheet is the one source of truth and the pipeline only flows
  ONE WAY (never pushes back to the sheet). Blocking a legitimate big delete would just serve
  stale JSON until the next sync erases it anyway — it buys nothing but a window of lying.
  Only total wipeout is non-recoverable-by-next-sync, so that's the only hard guard.
- Implemented as a per-schema constant (a new check scope), default "block only on empty,"
  editable in the `.py` if a stricter threshold is ever wanted on one feed. NO admin UI, NO toggle.

---

## Persistence — three layers, split by READ PATTERN + retention

| File | Scope | Retention | Read by | Holds |
|---|---|---|---|---|
| `_health.json` | all feeds, snapshot | current only | summary page | status, live/staged/dropped row counts, last_changed_at, display_breakdown, open warning/quarantine COUNTS, schema meta, sheet deep-link |
| `_history.json` | all feeds, time series | ~6 months | summary page | one compact record per feed per meaningful run: {at, status, rows, added, changed, removed}. Powers sparklines, uptime%, churn, "oldest feed" |
| `health/<tab>.json` | ONE feed, deep detail | ~2 weeks | drill-down page | full per-rule detail (status + counts + examples + the `why` text), volume-guard result, dropped-row reasons, edit timeline, rendered schema |

- Prune at WRITE time in `validate_promote.py` (same discipline as runlog's 30-cap). No cleanup job.
- Granularity (LOCKED): per-RULE detail lives in the 2-week `health/<tab>.json`; the 6-month
  `_history.json` keeps per-FEED status only (keeps the long file small).
- Inventory (LOCKED lean): `health/<tab>.json` carries only EXCEPTIONS (dropped rows, warnings,
  timeline) — NOT a copy of published rows. The detail page loads `published/<tab>.json`
  alongside and joins, to avoid duplicating data.
- `.nojekyll` already covers these new `_` and subfolder paths.

---

## Pages

- `data-health.html` — the hot ONE-SCREEN summary. Reads `_health.json` + `_history.json`.
  Left rail: health counts + pipeline pulse (last sync, last edit, total rows, quarantined) +
  compact recent-syncs strip. Right: dense per-feed TABLE (status · live rows · last changed ·
  added/edited/removed in plain words · activity sparkline · link to sheet + detail page).
  Must stay one screen as feeds grow (table rows, not stacked cards). Fleet rollups up top.
  A design mockup was already prototyped and approved in the originating chat — match that feel:
  clean/dense ops board, green/amber/red, the brand palette.
- `feed.html?tab=<name>` — the deep drill-down. Reads `health/<tab>.json` (+ `published/<tab>.json`).
  Shows: every rule with its `why` + live green/amber/gray status + violation count/examples;
  the volume-guard result; dropped rows WITH reasons; field-level validation; edit timeline
  (2wk); the rendered schema (self-documenting — a volunteer understands the checks without
  opening the .py). Deep links to Bev's sheet tab, published JSON, last commit, consuming page.

---

## Governing principles (hold these throughout)

- **The script records FACTS; the pages SUMMARIZE them.** Script persists what happened
  (rows, edits, drops, timestamps, reasons, per-rule pass/flag). Uptime%, churn, "oldest feed,"
  sparkline shapes, mean-time-between-edits → computed AT RENDER in the page (cheap JS), from
  `_history.json`. Keeps the pipeline dumb/durable, cleverness in the easy-to-change pages.
- **The sheet is the one source of truth; the pipeline only flows downstream.** Never push back.
- **Rules carry their own plain-English purpose** (`why`), so the validation is legible to
  non-technical humans (Bev, the next volunteer).
- **Retention pruned at write**, never a separate job.
- **As-built doc discipline:** the architecture doc points AT the code, never duplicates its
  logic. Add a new section documenting the monitoring layer as-built. Bump the rev line.

---

## All decisions LOCKED (don't re-litigate)
1. One big rollout, not staged.
2. Volume guard: zero-rows blocks; every other delete passes; per-schema constant; no UI.
3. `why` text: minimal, page-agnostic, literal restatement of the rule. Claude drafts all ~40,
   Randy reviews.
4. Granularity: per-rule detail in 2-week file; per-feed status in 6-month history.
5. Detail file holds exceptions only; joins `published/<tab>.json` for full inventory.
6. Uptime/churn computed in-page from history, not frozen in JSON.
7. Drill-down is a separate `feed.html?tab=` page (not an in-page panel).
8. Retention: 6mo summary-grain, 2wk detail-grain, pruned at write.

---

## Files to bring to the new chat
From the repo (`/Users/fiona/Documents/GitHub/ReworkDemo/`):
- `data/scripts/validate_promote.py`   ← the engine being extended (CORE)
- `data/scripts/fetch_sheets.py`
- `data/schemas/events.py`, `classes.py`, `volunteer.py`, `news.py`, `newsletters.py`  ← the 5 schemas (get `why`/guard added)
- `data/published/_health.json`, `_runlog.json`   ← current shapes to extend
- `data-health.html`   ← current dashboard to replace
- `js/site.js`   ← only if the new pages need shared helpers (rowLink, linkTag, etc.)
- `SHEET_SYNC_ARCHITECTURE.md`   ← gets the new as-built section
- (optional) a couple of `data/published/<tab>.json` so the detail page's join can be tested

## Build order (suggested, in the new chat)
1. Extend `validate_promote.py`: per-rule instrumentation + the volume-guard scope + writing
   the 3 persistence layers + retention pruning.
2. Add `why`/`human`/guard-constant to all 5 schemas (Claude drafts, Randy reviews the `why` lines).
3. Build `data-health.html` (summary) reading real `_health.json` + `_history.json`.
4. Build `feed.html?tab=` (drill-down) reading `health/<tab>.json` + `published/<tab>.json`.
5. New as-built section in `SHEET_SYNC_ARCHITECTURE.md`; bump rev line.
6. Verify end-to-end; confirm `.nojekyll` covers the new paths.
