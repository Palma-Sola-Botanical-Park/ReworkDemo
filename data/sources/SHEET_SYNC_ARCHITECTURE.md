# Sheet → JSON Sync — Data Architecture

**Status:** APPROVED, not yet built. Governing document for how the director's Google Sheet becomes the static JSON the site reads. Companion to `EVENTS_DATA_MODEL.md` (which defines *what* the tabs mean); this doc defines *how* the tab data gets safely onto the site.
**Supersedes:** the live client-side `fetchTab()` CSV path in `site.js` *in normal operation*. Once this is built, the browser fetches validated static JSON instead of the sheet — but the old live path is kept dormant as a break-glass fallback (see §6), not deleted.
**Last updated:** 2026-06-18 (evening, rev 4 — recorded the dashboard as intentionally unlinked/bookmark-only; rev 3 added §1 Consumers, the promote/visibility rule and closures-from-flag in §3, dual-mode venues + gallery existence check + screens in the decision log, and reordered the template build with venues last)

---

## 1. The core idea: move the fragile parse out of the browser

Today every visitor's browser fetches the sheet as CSV and parses it live — finding the header row, skipping the hint row, coping with inserted blanks — with no safety net. That untested client-side parse is what took the News feed dark on 2026-06-14: a structural change in the sheet, failing silently in every browser at once.

This pipeline moves that parse into CI, where it runs **once**, **under test**, and **fails loudly with a last-known-good fallback**. The site never again renders directly off a live sheet. It renders off a static JSON file that a GitHub Action keeps fresh — and only ever overwrites when the data passes validation.

The philosophy is the same one already governing the species side (`DATA_ARCHITECTURE.md`): a controlled source of truth, scripts that derive everything downstream, and nothing fragile in the hot path. The difference is the source of truth here stays the Google Sheet (Bev's edit surface — that's non-negotiable and good), so we need a reliable bridge from sheet to JSON.

**Consumers — two audiences, one set of files.** `data/published/*.json` feeds *both* the public website and the in-park TV-screen pages (hidden HTML on the office/galleria displays, not reachable from the public nav). They read the same files. The pipeline does **no** audience filtering — that happens at the HTML page: web pages render `web` + `both` and ignore `screen`; screen pages render `screen` + `both` and ignore `web` (mirror of today's `isWebVisible`). So an office-only "brochures are under the TV" announcement lives in the JSON as `screen` and simply never appears on the web. The break-glass `DATA_SOURCE` toggle (§6) applies to the screen pages identically — same files, same fallback.

---

## 2. The pipeline: three stages, a hard gate

```
Google Sheet (Bev edits, unchanged)
      │  export?format=csv&gid=…   ← same public URL the browser hits today; NO auth needed
      ▼
[1] fetch_sheets.py  ──►  data/staging/*.json      raw, faithful, ZERO validation
      │                                             "what the sheet literally said at fetch time"
      ▼
[2] validate_promote.py
      │   per-tab schema + rules → classify every problem (error / warning)
      │   diff staging vs previous → per-tab change counts
      │
      ├─ clean rows ─► data/published/*.json        the browser fetches THESE
      ├─ health ─────► data/published/_health.json  current state of every feed
      └─ run entry ──► data/published/_runlog.json  rolling history of runs (last ~30)
      ▼
[3] publish gate
      • file-level error → DON'T overwrite published → site keeps last-known-good
      • row-level error  → drop that row, publish the rest
      • warning          → publish, log it
      ▼
git commit (staging + published) ──► GitHub Pages redeploys ──► site shows fresh data
```

Stage 1 is a dumb, honest dump — your staging instinct intact. Stage 2 is where we process the crap out of it. Stage 3 is the guarantee.

---

## 3. The gate: why no bad data reaches a page

The key is **two granularities of failure**, not one. A broken column shouldn't behave like a single typo, and a single typo shouldn't dark a whole feed.

| Severity | Scope | Action | Site effect |
|---|---|---|---|
| ERROR | **file** — required column missing, sheet unfetchable, header row not found | Block: keep last-known-good for that tab | Serves yesterday's good data |
| ERROR | **row** — missing required cell, unparseable date | Quarantine: drop the row, publish the rest | The one bad row vanishes; feed otherwise fine |
| WARN | field — bad vocab, orphan reference, odd URL | Publish + log (optional autofix) | Renders; maybe a missing badge or link |

"No bad data reaches a page" is therefore guaranteed two ways: a structurally broken tab **never overwrites** its good copy, and a single bad row is **dropped before publish**. The whole-feed blackout (News, 6/14) and the single-typo blackout are both impossible.

### Rule model

Each tab has a rule list in `data/schemas/<tab>.py`. A rule is `{field, check, severity, scope, action}`. Examples drawn from the live model (`EVENTS_DATA_MODEL.md`):

- **Header presence** — `events` must carry `date`,`title`; `classes` must carry `weekday`. Missing → file ERROR. *(This is the 6/14 catch.)*
- **Required cells** — `events.date` empty or unparseable → row ERROR. An event with no valid date breaks the 2-week date math; quarantine it.
- **Controlled vocab** — `category` ∈ the 8 approved values; `display` ∈ {web, both, screen, off}; flags ∈ {yes, blank, no}; `weekday` matches `^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(,(Mon|…|Sun))*$` with no spaces → WARN (show the event uncategorized rather than hide it).
- **Visibility (promote filter)** — staging mirrors every row, `off` included. Promote publishes everything **except** `off` (which means "hidden everywhere, saved for later"). `web`, `both`, and `screen` all publish — `screen` is not dead content, it's *not-for-web* content the in-park screens need. Audience filtering is the page's job, never the pipeline's (see §1 Consumers). A `display` value outside the four legal ones → WARN, because a typo'd `display` silently hides a row from *everyone* — exactly the failure we want amber on the board, not invisible.
- **Type / format** — dates parse as ISO `YYYY-MM-DD`; URLs look like URLs; times parse.
- **Referential integrity** — every `events.series` resolves to a real `series.name` → WARN (the "Part of … series →" line just won't link; the event itself still shows). It's a raw string join, so a trailing space or "&"-vs-"and" silently orphans it — **trim whitespace before matching is a clean autofix**. A series with no matching events is fine, never an error (it can sit in the rail on its flyer alone).
- **Cross-tab** — `closes_park` rows deduped by date across `events` + `wedding_calendar`; `public_note` default ("Private event") applied here, in Python, once — not re-derived in the browser. Closure fires from the **flag alone**, never inferred from description prose: a row whose text reads "Park closed for private event" but is *not* flagged (e.g. Winter Nights, a ticketed marquee card) is correctly left open. Trust the flag, ignore the words.

Severity and scope are per-rule, so tuning a check's harshness is a one-line edit. New tabs add a new schema file; the engine is shared.

---

## 4. The dashboard (first-class deliverable, not optional)

Every run emits `_health.json` (current state) and appends to `_runlog.json` (history). One data model, rendered on **two surfaces**, backed by GitHub's native failure email.

**Per-feed status** uses three colors that map straight to the gate:

- **green** — clean. Either changed (with an edit count) or unchanged ("No changes").
- **amber** — published, but with warnings or quarantined rows ("2 edits · 1 row quarantined").
- **red** — blocked. Serving last-known-good ("Missing field 'headline' · serving last-good from 2:32 PM").

**Change counts** ("1 event edit, 2 series edits, 3 announcements, 4 news") come from diffing new staging against the previous, keyed by a stable per-tab identity (events: date+title; series: name; classes: title+weekday+**time**; announcements/news: headline+date; etc.). Counts split into added / changed / removed. This is the payoff for committing staging — the prior is always on hand to diff against. *(Class identity must include time: the weekday rule only collapses same-time multi-day classes like `Tue,Thu` into one row, so Basic Hatha Yoga is legitimately two rows — Mon 4PM and Wed 9AM — and title alone would misread them as a duplicate.)*

**Surface A — `data-health.html`** on the live site. Fetches `_health.json` + `_runlog.json`, renders the board. **Intentionally unlinked from site nav/footer** (decided 2026-06-18) — Randy and Bev bookmark it; it's an ops glance, not public content. The "is everything healthy right now" view.

**Surface B — the GitHub run page.** The workflow writes the same board into `$GITHUB_STEP_SUMMARY`, so every run in the Actions tab shows green/amber/red inline. The "what happened on this specific run" view, and the one tied to how you manage the Action.

**Surface C — email.** A red run fails the workflow; GitHub emails you on failure automatically. No extra wiring.

A red feed now turns into a *visible red light plus an email*, where 6/14 was silence.

---

## 5. Trigger & orchestration (GitHub Actions)

**Triggers (`on:`):**
- `schedule: cron` — every 10 minutes, best-effort (GitHub's scheduler can lag under load; 5 min is the floor).
- `workflow_dispatch` — the manual "Run workflow" button ("force now"). Runs the sync on demand.
- *(Later, drop-in:)* a Google Apps Script `repository_dispatch` ping on sheet edit, for near-instant sync. Designed for but not built now (it requires storing a PAT in Apps Script).

**No-op short-circuit.** Each run hashes the fetched CSVs. If nothing changed since last run, it exits before committing — a commit means a *real* sheet edit, keeping history meaningful and minutes near-zero.

**Auth.** None. The CSV export is already public (the browser uses it today). Same-repo commits use the built-in `GITHUB_TOKEN` with `permissions: contents: write`. No secrets in play for the base build.

**Loop guard.** The workflow commits into `data/`, which would otherwise retrigger itself. Guarded by `paths-ignore` on the push trigger (the sync isn't push-triggered anyway) and a `concurrency` group so overlapping runs can't race.

**Gotcha (designed around):** GitHub pauses scheduled workflows after 60 days of *zero* repo activity. Our sync commits whenever the sheet changes, which counts as activity and keeps it warm; a fully dead stretch could pause it, and the manual button wakes it instantly. Noted so it never surprises us.

### How a runner works (the one-paragraph mental model)

A workflow is a YAML file in `.github/workflows/`. On a trigger, GitHub boots a throwaway Linux VM, checks out the repo, runs the steps (our Python), commits results back, and discards the VM. Stateless and disposable — a container that boots, does one job, dies. You watch and manage every run in the repo's **Actions** tab: green/red list, click-in logs, the summary board, and a re-run button. *(Full management primer — editing the schedule, reading logs, debugging a stuck run, costs — on request.)*

---

## 6. Failure modes & break-glass

This section is the runbook for when the parts we *don't* control misbehave. The headline, and the reason this design is worth the effort: **an Actions outage degrades to staleness, not breakage.**

### What can go wrong, and what happens

| Failure | Likelihood | Effect on the site | How you'd know |
|---|---|---|---|
| Cron run delayed or silently skipped | Common — cron is explicitly *best-effort*; GitHub delays/skips under platform load | None. Site serves the last committed JSON. Data just refreshes late. | Dashboard "last run" clock stops advancing |
| Actions down for hours–days | Rare, but possible | None to rendering. Site keeps serving last-known-good off Pages (a *separate* system from Actions). Data freezes until Actions returns. | Stale "last run" clock; `githubstatus.com` red |
| 60-day inactivity pause | Only after a fully dead stretch | Scheduled sync pauses | No new runs at all; the manual button wakes it instantly |
| Google Sheets unreachable at fetch time | Occasional | None. `fetch_sheets.py` fails → no new staging → publish unchanged → last-good holds | Run logs a fetch error; feed shows unchanged |
| **GitHub Pages itself down** | Rare | **Whole site down**, regardless of data source | Site unreachable |

Only the last one actually takes the site down — and it does so no matter how the data is fetched, so it's a pre-existing condition of hosting on Pages, not a risk this design adds. Actions and Pages don't usually fail together.

### The counterintuitive win

**This design is *more* resilient to GitHub problems than today's site, not less.** Today, every single page load depends on Google Sheets being up and correctly-shaped at that instant. The new model removes Google from the render path entirely — a page load needs only the static files already committed in the repo. Actions is just a background refresher; if it stalls, the site doesn't notice. We traded a fragile dependency on every request for a non-fragile dependency on a background job.

**The dashboard is the outage detector.** If the "last run" clock stops advancing — say it's six hours stale — that's the tell that Actions is having a bad day, before anyone goes hunting on the status page.

### Break-glass: the `DATA_SOURCE` toggle

For an *extended* Actions outage, there's a manual escape hatch that bypasses the pipeline and points the browser straight back at the live sheet with a one-character commit. We get it almost free by **demoting** the old CSV path to a dormant `fetchTabLive` instead of deleting it, and gating `fetchTab` on a flag at the top of `site.js`:

```js
const DATA_SOURCE = 'published';   // 'published' (default)  |  'live' ← break-glass

async function fetchTab(name){
  if (DATA_SOURCE === 'live') return fetchTabLive(TAB[name]);   // old CSV path, kept dormant
  const r = await fetch(`data/published/${name}.json`, { cache: 'no-store' });
  return r.ok ? r.json() : [];     // the gate guarantees this is clean
}
```

Flip `'published'` → `'live'`, commit one character, Pages redeploys in ~1 minute, and the whole site runs off the live sheet again — bypassing the broken pipeline completely. This is *why the `TAB` gid map is retained* after the browser no longer needs gids in normal operation.

**Flip it with eyes open:**

- **Live mode is the *less safe* path.** It reintroduces exactly what the gate exists to remove — the unguarded client-side parse that breaks on a bad edit. It is a deliberate **break-glass switch, not automatic failover.** Throw it knowingly during an extended outage; flip it back the moment Actions recovers.
- **Do not wire it to auto-switch on stale data.** A quiet week with no sheet edits looks identical to an outage. Auto-failover would silently disarm the gate on a false alarm. Keep the flip manual and deliberate.
- The toggle can't save you from a Pages outage — but that's a whole-site event independent of data source.

---

## 7. What changes in `site.js`: one function

`fetchTab(gid)` stops fetching CSV in normal operation and parses nothing. It reads the validated static file, behind the break-glass flag from §6:

```js
const DATA_SOURCE = 'published';   // 'published' (default) | 'live' (break-glass, see §6)

async function fetchTab(name){
  if (DATA_SOURCE === 'live') return fetchTabLive(TAB[name]);
  const r = await fetch(`data/published/${name}.json`, { cache: 'no-store' });
  return r.ok ? r.json() : [];   // the gate guarantees this is clean
}
```

Every downstream caller — `loadEventsPage`, the class expander, closure merge/dedup/preemption, the filters, save-the-date — is **untouched**. All the CSV brittleness (`KNOWN_HEADERS`, header-row detection, hint-row skipping, `parseCSVLine`) is **demoted to a dormant `fetchTabLive`** — kept as the break-glass fallback (§6), not deleted, and never on the hot path while `DATA_SOURCE` is `'published'`. One flag flips the whole site between validated-JSON and live-sheet.

The `TAB` gid map stays — `fetch_sheets.py` uses it to know which tabs to pull, and `fetchTabLive` needs it for the break-glass path. The browser just no longer needs gids in normal operation.

---

## 8. Repo layout (matches the `data/sources/` convention)

```
data/
  staging/        events.json …        committed: git-diffable audit log of what the sheet said
  published/      events.json …        browser-fetched, validated
                  _health.json         current state of every feed
                  _runlog.json         rolling run history (~30)
  schemas/        events.py …          per-tab rule lists
scripts/
  fetch_sheets.py                      stage 1: CSV → staging JSON
  validate_promote.py                  stages 2–3: validate, diff, gate, emit health/runlog
.github/workflows/
  sync-sheet.yml                       cron + manual button + commit-back
data-health.html                       public dashboard
```

Staging is **committed** (not just an artifact). Cheap on a low-write repo, and gold for forensics: when something goes dark, `git log data/staging/<tab>.json` shows the exact sync where a column vanished. Black-box recorder.

---

## 9. Decision log — why it's built this way (don't re-engineer)

- **The brittle parse moves server-side.** Client-side CSV parsing fails silently in every browser at once. Server-side it fails once, loudly, with last-known-good. The 6/14 News blackout is the case study.
- **Two failure granularities, not one.** File-level errors keep last-known-good; row-level errors quarantine the row and publish the rest. A broken column and a single typo must not behave the same.
- **Last-known-good is the default safe state.** Publish only overwrites on a clean file. A bad sync is a no-op against the live data, not a corruption of it. (Data-center feed-reliability instinct, applied directly.)
- **An Actions outage is staleness, not breakage.** GitHub Pages serves the committed last-good JSON independent of Actions, so the site keeps rendering even if Actions is down for days — it just stops refreshing. This makes the JSON model *more* resilient to GitHub problems than today's live-sheet site, because Google is no longer in the render path (§6).
- **Break-glass, not auto-failover.** The old live CSV path is kept as a dormant `fetchTabLive` behind a `DATA_SOURCE` flag. The flip is manual and deliberate — used only during an extended outage — because auto-switching on stale data would disarm the gate on a false alarm (a quiet week with no edits looks identical to an outage). This is why the `TAB` gid map is retained (§6).
- **Staging is committed, not ephemeral.** The diff against the prior is what produces the dashboard's edit counts, and the commit history is the forensic log. Both pay for the storage many times over.
- **No-op runs short-circuit.** A commit means a real edit. History stays meaningful; minutes stay near-zero.
- **No auth in the base build.** The CSV export is already public; same-repo commits use the built-in token. Don't add a service account until/unless the sheet is locked down.
- **Runtime fetch, not build-time bake (for these feeds).** Events render "next 2 weeks from *today*" — date math that must run at view time. So the browser still renders client-side, just off validated static JSON. (The species side bakes to HTML because it's static reference content; different problem, different answer.)
- **One health model, rendered twice + email.** `_health.json` drives both the public board and the GitHub run summary; GitHub's failure email is free. No separate alerting to maintain.
- **Pilot one tab, then template.** Prove the gate and last-known-good behavior end-to-end on `events` (richest tab, exercises every rule type) before the machinery is load-bearing for all the feeds.
- **Screens are a first-class consumer, filtered at the page.** The in-park TV-screen pages read the same `published/*.json` as the website; `screen` is a valid `display` value, not dead content. The pipeline publishes everything except `off` and does no audience filtering — each page (web or screen) applies its own visibility filter. One file set, two audiences. (§1, §3)
- **All ten data tabs are live.** Confirmed by Randy — none are dormant. The template phase covers all ten; no consumer-tracing step needed.
- **Venues is the one dual-mode tab.** Today it's a clean rigid matrix (6 venue rows × a fixed seasonal price grid), but Bev is expanding it toward per-venue add-ons ("a few things, somewhat different per option") to stop nickel-and-diming customers. So the venues schema is built dual-mode: **fixed named fields** for the shared structure (the six day×season price cells — bare numbers, strip `$`/commas as autofix — plus deposit, capacity, scope) and an **open-ended `add_ons` block** of ordered `{label, value, kind}` line items for per-venue extras (the plant-reproduction array pattern). This is why the rigid-vs-flexible distinction survives *inside* venues rather than across tabs: strict-and-typed on the matrix, flexible-but-typed on the add-ons (every line needs a label; currency lines parse or are a sentinel like "Included"/"Inquire"). `manager`/`insurance` are deliberately free text + `—` sentinel, not currency. `photo` is a remote WordPress URL → validate shape only, not on-disk existence.
- **Venues is built last, not first.** Its shape is still in motion (Bev updates it at platform-switch, since the current dev won't). Locking it early would mean rebuilding; the migration *is* the redesign moment. So venues is the template finale, wired to today's matrix as v1 with the `add_ons` block designed-in and dormant until her real pricing lands.
- **Wedding gallery gets an on-disk existence check.** It's a flat `{title, caption, image}` mirror, but because its `image` paths are *local* (`/images/…`), the validator confirms each file exists in the repo → a missing/renamed file is a quarantined row on the board, not a broken `<img>` on venue.html. (Venues' remote `photo` URLs can't get this check — shape only.)

---

## 10. Build order

**Pilot (`events` end-to-end) — do first:**

1. **`fetch_sheets.py`** — pull `events` CSV → `data/staging/events.json`. Port the header-detection / hint-row logic out of `site.js`.
2. **`data/schemas/events.py`** — the rule list (headers, required cells, vocab, dates, series refs).
3. **`validate_promote.py`** — validate, diff vs prior, gate, write `data/published/events.json` + `_health.json` + `_runlog.json`.
4. **`sync-sheet.yml`** — cron + `workflow_dispatch` + no-op short-circuit + commit-back + `$GITHUB_STEP_SUMMARY`.
5. **`data-health.html`** — render the board from `_health.json` + `_runlog.json`.
6. **`fetchTab` shim** in `site.js` — add the `DATA_SOURCE` flag, **demote** the existing CSV path to `fetchTabLive` (don't delete it — it's the break-glass fallback, §6), point `events` at the published JSON, and confirm the page renders identically in `'published'` mode.
7. **Prove both safety nets** — (a) break a column in a sheet copy, confirm the feed holds last-known-good and the board goes red; (b) flip `DATA_SOURCE` to `'live'`, confirm the site still renders off the sheet, then flip back.

**Template (after the pilot proves out):**

8. Add schemas for the rest in roughly this order — `classes`, `series` (share the events model, near-zero guesswork), then `announcements`, `volunteer`, `wedding_calendar`, `newsletters`, `news`, `wedding_gallery` (flat mirror + local-image existence check) — pointing each `fetchTab` call at its published file. Same engine, one schema file per tab. All ten tabs are confirmed live, so none are skipped.
9. **`venues` last** — its dual-mode schema (fixed seasonal matrix + open-ended `add_ons` block) is built only once Bev's expanded pricing is in hand. Wire today's 6×6 matrix as v1 with `add_ons` designed-in and dormant. (Decision log: "Venues is built last.")

**Later (designed-for, not now):**

- Apps Script `repository_dispatch` for near-instant sync.
- Autofix actions for common warnings (trim, case-normalize vocab).
