# Events, Classes & Series — Data Model

**Status:** BUILT & DEPLOYED on `events.html` (live). Source of truth for how `events.html` + `loadEventsPage`/`loadEvents` in `site.js` read the Google Sheet.
**v4 (2026-06-18) — two opt-in columns added to the sheet ahead of the JSON migration; rendering pending (backlog D12 / D13):**
- **`date_end` on `events`** — a multi-day event is now **one row** (start `date` + last-day `date_end`), not N separate day-rows. Kills the multi-pin Save-the-Date bug. See §4a "Multi-day events." *Per-day calendar fan-out + one grouped agenda card is backlog **D12** — not yet rendered.*
- **`close_time` on `wedding_calendar`** — **partial** park closures. Bev's new policy keeps the park open until X hours before a wedding, so the public notice can read "🔒 Park closes at {close_time}" instead of all-day "🔒 Park closed." Bride-facing red (`status`) is unchanged. See §3 and §4d. *Wording change is backlog **D13** — not yet rendered.*
- Both columns are **non-breaking and opt-in** (blank = today's behavior) and both feed the forthcoming JSON events / wedding_calendar feeds (see `SHEET_SYNC_ARCHITECTURE.md`).

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

> **Optional `close_time` on `wedding_calendar` (partial closure — v4):** Bev's policy now keeps the park open until X hours before a wedding rather than all day. If `close_time` is filled on a `closes_park = yes` row, the public notice reads **"🔒 Park closes at {close_time} — {reason}"** instead of all-day "🔒 Park closed." Blank → all-day closure (today's behavior). Free text (e.g. `2PM`) — **no validation**; a typo just shows an odd label for one day. Wedding day-of only — leave blank on setup days and full-day blocks. **Public-side only:** the bride-facing `status` (booked/possible) on venue.html is unchanged, so the date stays red for other weddings. Rendering is backlog **D13**.

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
| `date_end` | **NEW (v4)** | no | **Last day of a multi-day event** (the start is `date`). Blank = a normal one-day event. When set, this **one row** is the whole run — one identity, one flyer, one Save-the-Date pin — fanned out to a calendar entry per day. Must parse as a date and be **≥ `date`**. See "Multi-day events" below. *Rendering: backlog D12.* | `2026-12-22` |
| `registration_url` | **NEW** | no | If set, card shows **Register →**. | `https://…` |
| `cost` | **NEW** | no | Cost badge; blank or `Free` if none. | `$5/rock` |
| `fundraiser` | **NEW** | no | `yes` adds a Fundraiser badge. | `yes` |
| `kid_friendly` | **NEW** | no | `yes` adds a "👪 Kid-friendly" badge. A *flag*, not a category — a Workshop can be kid-friendly without being "Family & Kids" (which means aimed AT kids). | `yes` |
| `save_the_date` | **NEW** | no | `yes` pins this event to the **Save the Date** rail (marquee events like Holiday Nights / the gala). For a multi-day run, this now sits on the **single `date_end` row** (no more flag-the-first-of-N; a run is one row). The rail dedupes by title and shows at most 2. | `yes` |
| `closes_park` | **NEW** | no | `yes` → closure notice + preempts the day (§3). Pair with `category = Private`. Also available on `wedding_calendar` (§4d); the two are deduped by date. | `yes` |

**Multi-day events (`date_end`).** A happening that spans consecutive days — *Winter Nights under the Lights* (Thu–Sun) — is **one events row**, not four. Set `date` to the first day and `date_end` to the last. That single row owns the event's identity: one title, one flyer, one Save-the-Date pin — which kills the old "four pins for four nights" bug (that was a title-dedupe papering over four real rows). Rendering fans the span into a calendar dot on **each** day across both the 2-week agenda and the full-calendar list — the same expansion the class expander already does for a weekly rule, just over an explicit start–end. In the 2-week agenda it shows as **one grouped card** ("Thu–Sun, Dec 19–22"), not a card per night. Closures and Save-the-Date read the single row once.

- **Validation:** `date_end` must parse as a date and be **≥ `date`** — a backwards or fat-fingered end date is a quarantined row, never a months-long band smeared across the calendar. This is the one validated rule the new column adds.
- **Same-hours assumption:** every day of a run shares the **same hours** (the park's actual usage). A run with one odd-time day (3 nights 8–12, a 7–9 finale) is **split into same-time spans** — a `date_end` row for the uniform block plus a separate single-day row for the odd night, both sharing the title — not forced into one row. The rule is "one row per same-time span"; a perfectly uniform run is just the happy case where the span is the whole thing.
- **Why not a shared `group_id` key (considered, rejected):** a sibling-key model would let every day differ freely (times, descriptions), but it's too abstract for non-technical editors. "Last day of the event" is self-explanatory; an invisible shared key is not. Match the model to the human editing it — an editor who second-guesses a column produces exactly the silent bad data the system is built to avoid.
- **Rendering status:** the per-day fan-out + grouped card is **backlog D12** — the column exists in the sheet and is captured here; the display work is pending.

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

### 4d. `wedding_calendar` tab — ADD COLUMNS (already drives venue.html)

This tab already exists and powers the availability calendar on `venue.html` (columns `date`, `status` = open/possible/booked, `note`). `events.html` now **also reads it** for park closures. Columns to add:

| Column | Status | Required | Purpose | Example |
|---|---|---|---|---|
| `closes_park` | **NEW** | no | `yes` → the public Events calendar shows a **generic** "🔒 Park closed" for this date (no `note`/couple name). Flag only **whole-park** dates (weddings, holidays, Winter Nights setup); leave Galleria-/pavilion-only bookings blank so the park reads open. Deduped against the `events` tab by date. | `yes` |
| `public_note` | optional | no | A public-safe label shown on the closure ("🔒 Park closed — Thanksgiving"). Blank → generic "private event". Never auto-pulled from `note`. | `Thanksgiving` |
| `close_time` | **NEW (v4)** | no | **Partial closure.** Free-text time the park closes to visitors. On a `closes_park = yes` row, makes the notice read "🔒 Park closes at {close_time}" instead of the all-day "🔒 Park closed." Blank = all-day closure. Wedding **day-of only** (blank on setup days / full-day blocks). **Public-side only** — does not touch `status`/availability, so the date stays red for other weddings. No validation. *Rendering: backlog D13.* | `2PM` |

> `status` (open/possible/booked) is for **wedding customers** on venue.html and is independent of `closes_park`, which is for **general visitors** on events.html. A date can be `booked` (wedding customer can't have it) yet unflagged for closure (Galleria-only — park still open to visitors).

### 4e. `overrides` tab — DO **NOT** build yet (planned)

Future home for one-off exceptions (a cancelled session, a moved class). When we build it: `date`, `scope` (a class title or `park`), `status` (`cancelled`/`closed`/`moved`), `note`. Listed here only so the column names are reserved and consistent. **Skip for now.**

---

## 5. Build status

**Done & live (v3):** the `events`/`classes`/`series` tabs, the two-view events.html (2-week cards + full-calendar list, toggle, filters), weekday colors, Save the Date, kid-friendly flag/filter, and `wedding_calendar` `closes_park` closures. The engine lives in `site.js` (`loadEventsPage` orchestrator; `injectEventStyles` for all CSS; expander, closure merge/dedup/preemption, filters, save-the-date). Tested via Node harnesses (`/tmp/*_test.js`): expander, date math, closure suppression, calendar grouping, save-the-date dedup, wedding-closure merge + privacy.

**Still on the sheet side (Randy):** keep `category`/`weekday` Data-Validation dropdowns clean; add `closes_park` to `wedding_calendar` and flag the whole-park dates.

**New columns added to the sheet (2026-06-18, v4) — rendering pending:** `date_end` on `events` (multi-day → one row; backlog **D12**) and `close_time` on `wedding_calendar` (partial closure wording; backlog **D13**). Both are non-breaking and opt-in (blank = current behavior). The JSON migration's `events` and `wedding_calendar` schemas must carry them, and the events schema enforces `date_end ≥ date` (see `SHEET_SYNC_ARCHITECTURE.md`).

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
- **Multi-day events are one row (`date_end`), not N rows or a `group_id` (v4).** A run spanning days (Winter Nights, Thu–Sun) is a single `events` row with a start `date` and a last-day `date_end`, fanned out to per-day calendar entries at render — one identity, one Save-the-Date pin, no duplication. The four-rows approach caused the multi-pin bug; a shared `group_id` sibling-key was considered (it handles ragged per-day times natively) but rejected as too abstract for non-technical editors. `date_end` is self-explanatory; odd-time days are handled by splitting a run into same-time spans. The one validated rule: `date_end ≥ date`. (Rendering is backlog D12.)
- **Partial closures via `close_time` are public-side-only free text (v4).** Bev's policy keeps the park open until X hours before a wedding. `close_time` on a `closes_park = yes` row changes the public notice to "🔒 Park closes at {close_time}"; blank keeps the all-day closure. It never touches the bride-facing `status`/availability, so the date stays red for other weddings. It's deliberately free text with no validation — a cosmetic label where a typo costs nothing, so over-validating it would solve a problem that doesn't exist. (Rendering is backlog D13.)
