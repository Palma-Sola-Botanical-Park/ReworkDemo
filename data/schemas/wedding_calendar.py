"""
data/schemas/wedding_calendar.py  —  validation rules for the `wedding_calendar` tab.

Lists ONLY the not-open dates (private rentals / closures). NO `display` column —
every row is a real calendar fact, so nothing is dropped on display. `date` is the
spine: it's how the row lands on the calendar and how venue.html / events.html
compute closures, so a blank/garbled date is row-fatal.

Columns: date | status | note | closes_park | close_time

NOTE: the public-facing reason column is `note` (NOT `public_note`). If the queued
events.html closure-label task is reading `public_note`, point it at `note`.

`close_time` is free text ("5pm", or blank = closed all day) — left unchecked on
purpose. `status` and `closes_park` are warn-only vocab (engine is case-insensitive,
so "Booked"/"No" pass fine).

Gate recap: quarantine ONLY on severity:"error" + scope:"row"; file-level block
ONLY from required_headers. See events.py / SHEET_SYNC_ARCHITECTURE.md section 3.
"""

STATUS_VALUES = ["possible", "booked"]
YES_NO_BLANK  = ["yes", "no", ""]   # in_vocab is case-insensitive in the engine

SCHEMA = {
    "tab": "wedding_calendar",

    # one row per closed date.
    "identity": ["date"],

    # the date column is the only thing the calendar truly can't work without.
    "required_headers": ["date"],

    "drop_when_display": [],          # no display column — drop nothing.

    "autofix_trim": True,

    "rules": [
        # --- row-fatal: every closure must land on a real date ---------------
        {"field": "date", "check": "iso_date", "severity": "error", "scope": "row"},

        # --- controlled vocab (warn) -----------------------------------------
        {"field": "status",      "check": "in_vocab", "arg": STATUS_VALUES,
         "severity": "warn", "scope": "field"},
        {"field": "closes_park", "check": "in_vocab", "arg": YES_NO_BLANK,
         "severity": "warn", "scope": "field"},
    ],
}
