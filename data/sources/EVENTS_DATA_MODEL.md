# Events, Classes & Series — Data Model

**Status:** agreed design, 2026-06-15. Source of truth for how `events.html` + `loadEvents`/`loadClasses` in `site.js` read the Google Sheet.
**v2 (2026-06-15) reconciled against the real sheet:** links pair globally (`link_url`+`link_text`, `flyer_url`+`flyer_text`); `registration_url` uses a hardcoded "Register →" (no text column); `type→category` confirmed events-only; column order is free (read by header name); `display` value behavior spelled out (only `web`/`both` show); added the **class-vs-series rule of thumb** (§1) and the multi-day `weekday` format (`Tue,Thu`).
**Read this before changing the events/classes tabs or their rendering.** These decisions were made deliberately to end the "everything is a Class" mess. Don't undo them without reading the rationale at the bottom.

---

## 1. The core idea — 3 kinds of content, 3 views

There are **three genuinely different kinds** of thing the park puts on. They are not "classes vs events." They are:

| Kind | What it is | Lives in | Example |
|---|---|---|---|
| **One-off event** | A single dated happening | `events` tab | Rock Painting, Garden Party, a plant sale |
| **Standing class** | A *rule*: same weekday + time + instructor, repeating | `classes` tab | Zumba (Mondays 9:30), the 3 yogas |
| **Series** | A *named bundle* of individually-scheduled sessions that share a flyer/blurb | `series` tab + sessions in `events` | Adult Park Workdays, UF/IFAS Horticultural, Summer Fun Nature |

**The golden rule:** a *class* is a **rule** (expanded into dated instances only inside a short window). A *series* is a **label** that ties together dated sessions which each live once in `events`. **Nothing is ever entered twice.** A series is never a "class," and a class instance is never hand-typed as an event.

**Rule of thumb — class or series?**

> **Same weekday, same time, every week** (Zumba, the yogas) → **class** (one row + a `weekday` rule; the expander generates instances).
> **Monthly, irregular, seasonal, or "it varies"** (Adult Park Workdays, UF/IFAS sessions, the nursery's sale days) → **a series**: one row in the `series` tab for the banner/flyer, and each actual occurrence hand-placed as its own dated row in `events` with the matching `series` name.

The expander **only** handles clean weekly rules. If you can't write the schedule as "every {weekday} at {time}," it is *not* a class — make it a series of dated events. (This is why a "monthly volunteer day" is a series, not a class: there's no weekly rule to compute, and each one differs.)

### The three views on events.html

1. **Next two weeks** — one merged, chronological agenda: one-off events + series sessions + *class instances expanded inside the window*. This is where the **category filter** lives. Park **closures preempt** everything in their window.
2. **Further ahead** — dated one-offs + series sessions beyond the window. **No expanded class instances** (that's what kept the old calendar spamming "Zumba" to infinity).
3. **The rhythm rail** (sidebar) — the standing **weekly schedule** (each class shown *once*) + a **"This season's series"** index (each series shown *once*, linking to Bev's flyer).

So a standing class appears as a **dated row** in view 1, a **schedule line** in view 3, and **never** in view 2. No duplication, no infinity.

---

## 2. Categories & flags

### Primary category (one per item — drives the badge *and* the filter buttons)

Controlled vocabulary. Type these **exactly** (use a Sheets dropdown / Data Validation to prevent typos):

`Fitness & Wellness` · `Talks & Learning` · `Workshops` · `Family & Kids` · `Arts & Music` · `Community` · `Volunteer` · `Private`

### Secondary flags (cut across categories — badges, not filter buckets)

- **cost** — free text shown as a badge: `Free`, `$15`, `$45`, etc.
- **registration_url** — if present, the card shows a **Register →** button.
- **fundraiser** — `yes` adds a "Fundraiser" badge (a gala is *Community + Fundraiser*).
- **closes_park** — `yes` turns this row into a **closure notice** (see §3).

> Why two tiers: a thing's *kind* (Workshop) is stable and filterable; whether it costs money, needs signup, or benefits the park is orthogonal. Zumba = `Fitness & Wellness` + `$15`. A workday = `Volunteer` + `Free`. A gala = `Community` + fundraiser + `$`.

---

## 3. Park closures (the "anti-event")

A full-park wedding is **not** something to invite the public to — it's an announcement that the park is **closed**, and it can **cancel** overlapping programming.

Model it as a **`Private`** event with **`closes_park = yes`**. That flag does two jobs:
1. Renders as a **"🔒 Park closed [date] — private event"** notice (no couple's names), so day-trippers see it early.
2. **Suppresses** any class instances / sessions that fall inside its window when the two-week agenda is built. The closure wins.

This is the heavyweight version of the future **overrides** idea (a sick instructor cancels *one* class; a closure closes *everything*). Closures ship now; per-class overrides come later (§5).

---

## 4. Sheet schema — BUILD THIS NOW

**Tab layout convention (all tabs):** Row 1 = section title · Row 2 = column headers · Row 3 = hint row (human notes, skipped by code) · Row 4+ = data. Headers are lowercase, spaces become underscores. Keep the hint row filled when you add a column — it's where you remind yourself what the column is for.

**Visibility:** every tab uses a **`display`** column. **Only `web` or `both` show on the site.** `screen`, `off`, `print`, and blank all read as *hidden* — `screen` is for the in-park kiosk/print path, **not** the website. ⚠️ A park-closure row must therefore be `display = web` (or `both`) so the closure notice actually appears; `off` hides it entirely and defeats the purpose.

**Column order doesn't matter.** The parser reads each tab **by header name, not by position** (`obj[header] = value`). Reorder columns however is easiest to scan — recommended ergonomic order is `display`, `date`, `time`, `title`, … then the rest. Only the header *spelling* matters.

**Links travel in pairs (standard across all tabs).** A content link is two columns side by side: the URL (`link_url`, or the semantic `flyer_url` on the series tab) **plus** a label column (`link_text` / `flyer_text`). Blank label → the code picks a sensible default ("Read More" / "Details"); filled → your exact wording ("See the flyer →", "RSVP →"). The adjacency is for *your* eyes only; the code finds them by name. A `.pdf` or published Google Doc opens framed in `viewer.html`; other URLs open normally.

**Exception — action buttons have no label column.** `registration_url` is an *action*, not a content link, so its button label is **hardcoded "Register →"**. Don't add a `registration_url_text` column. (Same would apply to any future fixed-action button.)

### 4a. `events` tab — ADAPT (add columns)

Keep what's there (`display`, `date`, `time`, `title`, `description`, `link_url`, `link_text`, etc.). Changes:

| Column | Status | Required | Purpose | Example |
|---|---|---|---|---|
| `category` | **rename from `type`** | yes | Controlled vocabulary (§2). `type` is read in exactly one place (events); every other tab already uses `category`, so this rename *removes* the system's one inconsistency. Migrate the old `education/social/event/wedding` values to the 8 terms. Code reads `category` with a quiet fallback to `type` during migration. | `Workshops` |
| `series` | **NEW** | no | Series name. **Must match a `name` in the `series` tab.** Blank for true one-offs. | `Adult Park Workdays` |
| `registration_url` | **NEW** | no | If set, card shows **Register →**. | `https://…` |
| `cost` | **NEW** | no | Cost badge; blank or `Free` if none. | `$5/rock` |
| `fundraiser` | **NEW** | no | `yes` adds a Fundraiser badge. | `yes` |
| `closes_park` | **NEW** | no | `yes` → closure notice + preempts the window (§3). Pair with `category = Private`. | `yes` |

### 4b. `classes` tab — ADAPT (add columns), and REMOVE the fake series

**First: move the series rows OUT.** UF/IFAS, Summer Fun Nature, and any other "bundle" currently sitting in `classes` are **series**, not classes. Their sessions become dated rows in `events` (with `series` set); the series itself gets one row in the new `series` tab. After this, `classes` holds **only the true weeklies** — your 3 yogas + Zumba.

| Column | Status | Required | Purpose | Example |
|---|---|---|---|---|
| `weekday` | **NEW** | yes | Machine-readable day(s) that drive the in-window expander. Three-letter codes, **comma-separated, no spaces**, no "s": `Mon`, or `Tue,Thu` for a class that meets twice a week (still **one row**). **This is the source of truth** — not the free-text `day`. | `Mon` · `Tue,Thu` |
| `category` | **NEW** | yes | Controlled vocabulary (§2). | `Fitness & Wellness` |
| `cost` | **NEW** | no | Cost badge. | `$15 drop-in` |
| `active_from` | **NEW** | no | Season start; expander won't generate instances before this. Blank = always. | `2026-06-01` |
| `active_to` | **NEW** | no | Season end. Blank = always. | `2026-08-31` |
| `day` | keep (optional) | no | Pretty display override (e.g. `Tue & Thu`). If blank, the code formats `weekday` for you. | `Mondays` |

Existing `time`, `title`, `instructor`, `description`, `link_url`/`link_text`, `registration_url` stay as-is.

### 4c. `series` tab — NEW (build this one)

One row per series. This is where Bev's bundled flyers/infographics finally live (instead of being faked as classes).

| Column | Required | Purpose | Example |
|---|---|---|---|
| `display` | yes | `web`/`both` to show, else hidden. | `both` |
| `name` | yes | The series name. **Event rows reference this exact string in their `series` column.** | `Adult Park Workdays` |
| `blurb` | yes | One- or two-sentence description for the index card. | `Volunteer days to keep the park beautiful — sometimes with donuts, sometimes a lunch with prizes.` |
| `flyer_url` | no | Bev's infographic / PDF / published doc. Frames in `viewer.html` if it's a PDF/Doc. | `https://…` |
| `flyer_text` | no | Label for the flyer link (pairs with `flyer_url`). Blank → default wording. | `See the series flyer →` |
| `category` | no | Optional badge for the series index card. | `Volunteer` |
| `active` | yes | `yes` while running; set blank/`no` to retire without deleting. | `yes` |

> **Convention note (intentional):** `series` uses `active` (yes/retired) rather than the `print/web` meaning of `display`. A series is on or off, not web-vs-print. `display` is still there for the standard visibility filter; `active` is the "is this series currently happening" switch. Documented here so it's not "fixed" later.

### 4d. `overrides` tab — DO **NOT** build yet (planned)

Future home for one-off exceptions (a cancelled session, a moved class). When we build it: `date`, `scope` (a class title or `park`), `status` (`cancelled`/`closed`/`moved`), `note`. Listed here only so the column names are reserved and consistent. **Skip for now.**

---

## 5. Build order

1. **Sheet (Randy + Bev):** rename `events.type → category`; add the new `events` columns; pull series out of `classes` and add the class columns; create the `series` tab. Add Data-Validation dropdowns for `category` and `weekday` to prevent typos.
2. **`site.js` (Claude):** rewrite `loadEvents`/`loadClasses` into the three views — window expander (bounded, never infinite), closure preemption, badges, series index, and the category filter (built from categories actually present, mirroring the `nature.html` wildlife-theme filter).
3. **Later:** the `overrides` tab + sick-instructor / moved-session handling.

Code is written defensively: missing new columns degrade gracefully, so the site keeps working while the sheet is mid-migration.

---

## 6. Decision log — why it's built this way (don't re-engineer)

- **"Class vs Event" was the wrong axis.** The real axes are *rhythm* (rule-based recurrence vs individually-scheduled) and *commitment* (free/drop-in vs register/fee). Categories + flags capture that; two rigid columns didn't.
- **A series is a label, not a class.** Putting series in `classes` forced every session to be typed twice (once as the "class," once as the event). The `series` tab + a `series` reference on each event fixes it with zero duplication.
- **Classes are rules expanded only in a 2-week window.** Long-range expansion is calendar spam. Near-term, a real dated instance is genuinely useful. Same row, two renderings, bounded generation = no infinity.
- **Closures are `Private` + `closes_park`, not events.** They announce *absence* and *preempt* programming. Same machinery as future per-class overrides; closures are just the whole-park version.
- **Controlled vocabulary for `category`.** The badge set = the filter set = the sheet values. Define once; a dropdown keeps them clean.
