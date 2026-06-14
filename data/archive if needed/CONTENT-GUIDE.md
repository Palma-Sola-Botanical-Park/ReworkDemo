# Palma Sola Botanical Park · Content Management Guide
## How Bev manages the website and TV screens from Google Sheets

---

## OVERVIEW

One Google Sheet controls:
- The **website** (events, classes, announcements, volunteer of month)
- The **TV screens** in the office and galleria

You never touch the website files. Just edit the sheet and everything updates within seconds.

---

## THE DISPLAY COLUMN

Every row in every tab has one column called **`display`**.
This controls where the content appears:

| Value    | Where it shows |
|----------|----------------|
| `both`   | Website AND TV screens |
| `web`    | Website only |
| `screen` | TV screens only |
| `off`    | Hidden everywhere (saved for later) |

**Tip:** Set up a dropdown in Google Sheets so you pick from a list instead of typing:
1. Click the `display` column header to select the whole column
2. Data → Data validation → List of items
3. Type: `both,web,screen,off`
4. Save

---

## TAB 1: Events (gid=0)

**Column headers (copy these exactly into row 1):**
```
date | title | description | type | time | pdf_url | display
```

**Column explanations:**
- `date` — format as YYYY-MM-DD, e.g. `2026-07-04`
- `title` — the event name
- `description` — one or two sentences, shown on the site
- `type` — use one of: `education` · `social` · `wedding` · `event`
- `time` — e.g. `9:00 AM – 12:00 PM`
- `pdf_url` — paste a Google Docs published URL here (see PDF instructions below)
- `display` — `both`, `web`, `screen`, or `off`

**Example rows:**
```
2026-07-12 | Butterfly Walk | Join Randy for a guided tour of butterfly plants | education | 9:00 AM | https://docs.google.com/... | both
2026-07-19 | Private Wedding | Park closed for private event | wedding | All day | | web
2026-07-26 | Zumba in the Park | Outdoor fitness class, all welcome | social | 9:30 AM | | both
```

**For past events:** leave them in the sheet — the website only shows future dates automatically.

---

## TAB 2: Classes (gid=1)

Recurring classes that run on a schedule (not one-off events).

**Column headers:**
```
day | time | title | instructor | description | pdf_url | registration_url | display
```

**Example rows:**
```
Monday | 9:30 AM | Zumba in the Park | | Outdoor fitness, all welcome | | | both
Saturday | 10:00 AM | Master Gardener Q&A | UF/IFAS | Free plant advice | | | web
```

---

## TAB 3: Volunteer (gid=2)

One row = one Volunteer of the Month. The site shows the first row with display = `web` or `both`.

**Column headers:**
```
name | title | bio | hours | seasons | photo_url | display
```

- `title` — e.g. "Volunteer of the Month" or "Volunteer of the Year 2026"
- `bio` — 2–3 sentences about the volunteer
- `hours` — total volunteer hours (shown as a stat)
- `seasons` — number of years/seasons volunteering
- `photo_url` — optional, a direct image link
- `display` — set to `web` or `both` for the current honoree; set old rows to `off`

**Example:**
```
Randy Carter | Volunteer of the Year 2026 | Randy has documented over 800 plant species at the park and built our iNaturalist collection from scratch. He leads the Bright Futures program and is here nearly every week. | 500 | 3 | | both
```

---

## TAB 4: Announcements (gid=3)

Homepage news items and TV screen announcements.

**Column headers:**
```
emoji | title | body | link_text | link_url | pdf_url | display
```

- `emoji` — optional, e.g. `🎉` or `🌿`
- `title` — bold headline
- `body` — 1–3 sentences
- `link_text` — text for the link button, e.g. "Read the article"
- `link_url` — URL the button goes to
- `pdf_url` — if you have a Google Doc flyer instead of a link
- `display` — `both`, `web`, `screen`, or `off`

**Example:**
```
🎉 | New Deck Completed! | Thanks to the Bishop Parker Foundation, our new composite deck is finished just in time for the holiday lights show. | Read more | https://palmasolabp.org/... | | both
🌿 | Native Plant Week | Join us July 21–27 for guided walks, talks, and our annual native plant celebration. | Event Details | | https://docs.google.com/... | both
```

---

## HOW TO ATTACH A PDF / FLYER TO AN EVENT

You don't need to upload PDFs to the website. Use Google Docs:

1. Write your event flyer or description in **Google Docs**
2. Go to **File → Share → Publish to web**
3. Click **Publish** → copy the URL it gives you
4. Paste that URL into the `pdf_url` column in the sheet

When visitors click "Event Details" on the website, it opens your Google Doc directly. You can edit it anytime and changes appear instantly — the URL stays the same.

---

## MAKING THE SHEET PUBLIC (required)

The website reads your sheet live. For this to work:

1. Click **Share** (top right of the sheet)
2. Under "General access" → change to **"Anyone with the link"**
3. Set permission to **"Viewer"**
4. Click **Done**

The website can now read the sheet. No one can edit it unless you specifically give them edit access.

---

## UPDATING THE TV SCREENS

The TV screens at the office and galleria run a separate page:
`https://palma-sola-botanical-park.github.io/[repo-name]/screen/display.html`

**To put it on a TV:**
1. Open a browser on the TV or connected device
2. Navigate to the screen URL above
3. It will run automatically, rotating through slides every 12 seconds
4. It refreshes itself every 5 minutes to pick up new content from the sheet
5. The page also reloads completely every 5 minutes as a backup

**Content that appears on screen:**
- Any row with `display` = `screen` or `both`
- Live iNaturalist stats (observations, species, this week)
- Live recent photos from iNaturalist
- Clock and date (always shown)

**To show a special announcement only on screens** (not the website):
- Set `display` = `screen`

**To temporarily hide something from screens** without deleting it:
- Change `display` to `web` (stays on website) or `off` (gone everywhere)

---

## QUICK REFERENCE CARD

| I want to... | Do this |
|---|---|
| Add an event | New row in Events tab, set display |
| Attach a flyer to an event | Google Doc → Publish to web → paste URL in pdf_url |
| Change Volunteer of Month | Set old row to `off`, add new row |
| Post a TV-only announcement | Add to Announcements tab, set display = `screen` |
| Hide something temporarily | Change display to `off` |
| Show something everywhere | Set display = `both` |
| Add a recurring class | New row in Classes tab |

---

## NEED HELP?

Contact Randy or the web team. The sheet ID is:
`1bxa4w47DCSgQuENjagORVUpR9qf9o2IYyxM5z_2Azpc`

The website reads tabs by their position (tab 1, 2, 3, 4) — **do not reorder the tabs**.
Tab names can be anything you like; the order is what matters.
