# Events, Classes & Series — Data Model

**Status:** BUILT & DEPLOYED on `events.html` (live). Source of truth for how `events.html` + `loadEventsPage`/`loadEvents` in `site.js` read the Google Sheet.
**v3 (2026-06-15, evening) — shipped a major events.html rework, all live:**
- **Card redesign:** wider **weekday-colored** date block (weekday + month + day + time); title line `**Title**, Instructor` (classes only); badges right-justified on the title row, wrapping below on phones.
- **Weekday color-coding** (muted botanical palette) on cards + calendar, so the eye feels days passing.
- **Two views with a toggle** — "Next 2 weeks" (rich cards) ⇄ "Full calendar" (a spartan grouped month **list**, same on desktop & phone; a month *grid* was tried and dropped). Both have a **category + 👪 Kid-friendly filter**.
- **Save the Date rail** — `save_the_date` flag pins marquee events (Holiday Nights, gala) regardless of how far out.
- **`kid_friendly` flag** → badge + filter.
- **Park closures now also come from the `wedding_calendar` tab** via `closes_park` (see §3) — no re-entering weddings.
- Links render as **prose, not buttons** (only Register is a button). Newsletter box + old "Further ahead" list removed.
- All CSS for the events engine is **injected by `injectEventStyles()` in site.js** (so cards render on any page, incl. the homepage teaser); `events.html`'s own `<style>` only holds page-layout/filter/schedule/series rules.

**v2 (2026-06-15) reconciled against the real sheet:** links pair globally (`link_url`+`link_text`, `flyer_url`+`flyer_text`); `registration_url` uses a hardcoded "Register →"; `type→category` confirmed events-only; column order is free (read by header name); `display` value behavior spelled out (only `web`/`both` show); class-vs-series rule of thumb (§1); multi-day `weekday` format (`Tue,Thu`).
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

### The views on events.html

The main column has a **toggle**: **"Next 2 weeks" ⇄ "Full calendar"** (defaults to 2 weeks).

1. **Next two weeks** — one merged, chronological agenda of rich cards: one-off events + series sessions + *class instances expanded inside the window*. This is where the **category filter** lives. Park **closures preempt** everything in their window. Date blocks are **weekday-colored** (see below).
2. **Full calendar** — the long-range scan: a **grouped, scrolling month list** (works the same on desktop and phone), covering every dated event from the 1st of the current month onward. Deliberately **spartan** rows: a weekday-tinted dot + date + title + a tap to details, **no badges, no descriptions, and NO weekly class instances** (those are a rule, not a calendar entry — they'd spam "Zumba" to infinity). It has **its own category / kid-friendly filter** (same control as the 2-week view), and filtering hides any month header left empty. This replaces the old "Further ahead" card list. (We tried a desktop month *grid* and dropped it — the list scans far better at every width.)
3. **The rhythm rail** (sidebar) — an optional **"Save the Date"** panel up top (marquee events, see below), then the standing **weekly schedule** (each class shown *once*) + the **"Ongoing series"** index (each series shown *once*, linking to Bev's flyer).

So a standing class appears as a **dated card** in the 2-week view, a **schedule line** in the rail, and **never** in the month calendar. No duplication, no infinity.

**Weekday color-coding.** Each weekday has its own muted hue (Mon red-ish, Tue gold-ish … Sun rose), used on the date blocks (2-week cards) and the chips/dots (calendar). Same color down a column = same weekday, so the eye feels the days passing instead of a wall of identical green. The palette is intentionally *muted* so it doesn't fight the park greens.

**Card anatomy (2-week view).** Wider **colored date block** carrying weekday + month + day + time; title line reads `**Title**, Instructor` (instructor for classes only); badges **right-justified** on the title row (they wrap below the title on phones); description with its inline link; the "Part of the … series →" line; and a single **Register →** button when needed.

**Save the Date rail.** A flagged marquee panel for the biggies people ask about months out — Holiday Nights, the gala. Set **`save_the_date = yes`** on the event row (just the *first* row if it's a multi-day run entered as separate days — the rail dedupes by title and shows at most 2, soonest first). Each shows ⭐ title + date + flyer link, and stays pinned no matter how far out it is. The same row still flows into the calendar on its actual date.

---

## 2. Categories & flags

### Primary category (one per item — drives the badge *and* the filter buttons)

Controlled vocabulary. Type these **exactly** (use a Sheets dropdown / Data Validation to prevent typos):

`Fitness & Wellness` · `Talks & Learning` · `Workshops` · `Family & Kids` · `Arts & Music` · `Community` · `Volunteer` · `Private`

### Secondary flags (cut across categories — badges, not filter buckets)

- **cost** — free text shown as a badge: `Free`, `$15`, `$45`, etc.
- **registration_url** — if present, the card shows a **Register →** button (the only button on a card).
- **fundraiser** — `yes` adds a "💛 Fundraiser" badge (a gala is *Community + Fundraiser*).
- **kid_friendly** — `yes` adds a "👪 Kid-friendly" badge *and* surfaces a Kid-friendly filter button (in both views, only when ≥1 kid-friendly event is present). A flag, not a category — a Workshop can be kid-friendly without being "Family & Kids."
- **save_the_date** — `yes` pins the event to the **Save the Date** rail (§1).
- **closes_park** — `yes` turns this row into a **closure notice** (see §3). Present on **two** tabs: `events` and `wedding_calendar`.

> Why two tiers: a thing's *kind* (Workshop) is stable and filterable; whether it costs money, needs signup, benefits the park, or is kid-friendly is orthogonal. Zumba = `Fitness & Wellness` + `$15`. A workday = `Volunteer` + `Free`. A gala = `Community` + fundraiser + `$`.

---

## 3. Park closures (the "anti-event") — TWO sources

A full-park wedding/holiday/private booking is **not** something to invite the public to — it's an announcement that the park is **closed**, and it can **cancel** overlapping programming. A closure does two jobs wherever it comes from:
1. Renders as a **"🔒 Park closed [date] — private event"** notice (a card in the 2-week view, a row in the calendar). **No private names ever** — couple names from the wedding calendar are never shown.
2. **Suppresses** any class instances / events that fall on that day. The closure wins (park's closed → nothing public happens).

Closures are merged from **two tabs**, then **deduped by date** (an events-tab closure wins if a date is flagged in both):

**Source A — `events` tab:** a row with `category = Private` + `closes_park = yes`. Use for one-off public-facing closures you're entering directly.

**Source B — `wedding_calendar` tab (the big one):** this tab already lists every date that blocks a wedding booking (it drives `venue.html`). Flagging a row `closes_park = yes` makes the **public Events calendar** draw a generic closure for that date — **without re-entering the wedding anywhere.** This is the key win: weddings live **once**, in `wedding_calendar`.

**Why a per-row flag and not "every booking closes the park":** the wedding_calendar mixes **whole-park** bookings (weddings, holidays, Winter Nights setup) with **partial** ones (Galleria-only, pavilion-only — note the `(Gal.)` / `(pav.)` hints). Only whole-park dates should close the park to visitors. The flag lets Randy mark exactly those; a Galleria-only baby shower stays unflagged and the park shows **open**.

**The dividing line (which tab gets it):**
- Something the public should **see or attend** (gala people attend, plant sale, Holiday/Winter Nights *nights*) → **`events` tab** as a real event (with description/flyer), plus `closes_park` there if the rest of the park is shut.
- A date that's just **blocked with nothing to promote** (private wedding, holiday, Winter Nights *setup* days) → **`wedding_calendar`**, flag `closes_park`. Generic closure, no name.

> **Optional `public_note` on `wedding_calendar`:** blank → generic "private event"; filled → a public label (e.g. `Thanksgiving` → "🔒 Park closed — Thanksgiving"). Use it for holidays you're happy to name; leave blank for weddings.

This is the heavyweight version of the future **overrides** idea (a sick instructor cancels *one* class; a closure closes *everything*). Closures ship now; per-class overrides come later (§5).

---

## 4. Sheet schema (live)

**Tab layout convention (all tabs):** Row 1 = section title · Row 2 = column headers · Row 3 = hint row (human notes, skipped by code) · Row 4+ = data. Headers are lowercase, spaces become underscores. Keep the hint row filled when you add a column — it's where you remind yourself what the column is for.

**Visibility:** every tab uses a **`display`** column. **Only `web` or `both` show on the site.** `screen`, `off`, `print`, and blank all read as *hidden* — `screen` is for the in-park kiosk/print path, **not** the website. ⚠️ A park-closure row must therefore be `display = web` (or `both`) so the closure notice actually appears; `off` hides it entirely and defeats the purpose.

**Column order doesn't matter.** The parser reads each tab **by header name, not by position** (`obj[header] = value`). Reorder columns however is easiest to scan — recommended ergonomic order is `display`, `date`, `time`, `title`, … then the rest. Only the header *spelling* matters.

**Links travel in pairs (standard across all tabs).** A content link is two columns side by side: the URL (`link_url`, or the semantic `flyer_url` on the series tab) **plus** a label column (`link_text` / `flyer_text`). Blank label → the code picks a sensible default ("Read More" / "Details"); filled → your exact wording ("See the flyer →", "RSVP →"). The adjacency is for *your* eyes only; the code finds them by name. A `.pdf` or published Google Doc opens framed in `viewer.html`; other URLs open normally.

**Links render as prose, not buttons.** On an event card, the link is the words at the **end of the description** (using `link_text`, or a quiet "more →" when blank) — the sentence *is* the link. A **series session** instead shows a "Part of the *{series}* →" line whose series name links the flyer. The **only button** on a card is **Register →**, and only when `registration_url` is set — because registering is an action, not reading. (This keeps cards calm: date chip + badges + a sentence with a link, plus at most one Register button.)

### 4a. `events` tab — ADAPT (add columns)

Keep what's there (`display`, `date`, `time`, `title`, `description`, `link_url`, `link_text`, etc.). Changes:

| Column | Status | Required | Purpose | Example |
|---|---|---|---|---|
| `category` | **rename from `type`** | yes | Controlled vocabulary (§2). `type` is read in exactly one place (events); every other tab already uses `category`, so this rename *removes* the system's one inconsistency. Migrate the old `education/social/event/wedding` values to the 8 terms. Code reads `category` with a quiet fallback to `type` during migration. | `Workshops` |
| `series` | **NEW** | no | Series name. **Must match a `name` in the `series` tab.** Blank for true one-offs. | `Adult Park Workdays` |
| `registration_url` | **NEW** | no | If set, card shows **Register →**. | `https://…` |
| `cost` | **NEW** | no | Cost badge; blank or `Free` if none. | `$5/rock` |
| `fundraiser` | **NEW** | no | `yes` adds a Fundraiser badge. | `yes` |
| `kid_friendly` | **NEW** | no | `yes` adds a "👪 Kid-friendly" badge. A *flag*, not a category — a Workshop can be kid-friendly without being "Family & Kids" (which means aimed AT kids). | `yes` |
| `save_the_date` | **NEW** | no | `yes` pins this event to the **Save the Date** rail (marquee events like Holiday Nights / the gala). For a multi-day run entered as separate day-rows, flag just the **first** row — the rail dedupes by title and shows at most 2. | `yes` |
| `closes_park` | **NEW** | no | `yes` → closure notice + preempts the day (§3). Pair with `category = Private`. Also available on `wedding_calendar` (§4d); the two are deduped by date. | `yes` |

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

### 4d. `wedding_calendar` tab — ADD ONE COLUMN (already drives venue.html)

This tab already exists and powers the availability calendar on `venue.html` (columns `date`, `status` = open/possible/booked, `note`). `events.html` now **also reads it** for park closures. One column to add:

| Column | Status | Required | Purpose | Example |
|---|---|---|---|---|
| `closes_park` | **NEW** | no | `yes` → the public Events calendar shows a **generic** "🔒 Park closed" for this date (no `note`/couple name). Flag only **whole-park** dates (weddings, holidays, Winter Nights setup); leave Galleria-/pavilion-only bookings blank so the park reads open. Deduped against the `events` tab by date. | `yes` |
| `public_note` | optional | no | A public-safe label shown on the closure ("🔒 Park closed — Thanksgiving"). Blank → generic "private event". Never auto-pulled from `note`. | `Thanksgiving` |

> `status` (open/possible/booked) is for **wedding customers** on venue.html and is independent of `closes_park`, which is for **general visitors** on events.html. A date can be `booked` (wedding customer can't have it) yet unflagged for closure (Galleria-only — park still open to visitors).

### 4e. `overrides` tab — DO **NOT** build yet (planned)

Future home for one-off exceptions (a cancelled session, a moved class). When we build it: `date`, `scope` (a class title or `park`), `status` (`cancelled`/`closed`/`moved`), `note`. Listed here only so the column names are reserved and consistent. **Skip for now.**

---

## 5. Build status

**Done & live (v3):** the `events`/`classes`/`series` tabs, the two-view events.html (2-week cards + full-calendar list, toggle, filters), weekday colors, Save the Date, kid-friendly flag/filter, and `wedding_calendar` `closes_park` closures. The engine lives in `site.js` (`loadEventsPage` orchestrator; `injectEventStyles` for all CSS; expander, closure merge/dedup/preemption, filters, save-the-date). Tested via Node harnesses (`/tmp/*_test.js`): expander, date math, closure suppression, calendar grouping, save-the-date dedup, wedding-closure merge + privacy.

**Still on the sheet side (Randy):** keep `category`/`weekday` Data-Validation dropdowns clean; add `closes_park` to `wedding_calendar` and flag the whole-park dates.

**Later:** the `overrides` tab + sick-instructor / moved-session handling.

Code is written defensively: missing columns degrade gracefully, so the site keeps working while the sheet is mid-migration.

---

## 6. Decision log — why it's built this way (don't re-engineer)

- **"Class vs Event" was the wrong axis.** The real axes are *rhythm* (rule-based recurrence vs individually-scheduled) and *commitment* (free/drop-in vs register/fee). Categories + flags capture that; two rigid columns didn't.
- **A series is a label, not a class.** Putting series in `classes` forced every session to be typed twice (once as the "class," once as the event). The `series` tab + a `series` reference on each event fixes it with zero duplication.
- **Classes are rules expanded only in a 2-week window.** Long-range expansion is calendar spam. Near-term, a real dated instance is genuinely useful. Same row, two renderings, bounded generation = no infinity.
- **Closures are `Private` + `closes_park`, not events.** They announce *absence* and *preempt* programming. Same machinery as future per-class overrides; closures are just the whole-park version.
- **Closures have two sources, deduped by date — weddings are never re-entered.** The `wedding_calendar` tab already holds every blocking date (it drives venue.html). A per-row `closes_park` flag there feeds generic closures to the public calendar — solving "do I add every wedding to Events?" with **no double entry** and **no leaked names**. The flag is per-row precisely because the wedding calendar mixes whole-park closures with Galleria-/pavilion-only bookings that *don't* close the park. (A blanket "booked = closed" rule was rejected as wrong for partial bookings.)
- **The month *grid* was tried and dropped.** A 7-column desktop grid read worse than the grouped list at every width; the list is now the full-calendar view everywhere. Don't rebuild the grid.
- **Controlled vocabulary for `category`.** The badge set = the filter set = the sheet values. Define once; a dropdown keeps them clean.
