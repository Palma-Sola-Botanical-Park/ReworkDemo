"""
data/schemas/events.py  —  the validation rules for the `events` tab.

A schema is plain data. validate_promote.py's engine interprets it, so adding a
new tab later = writing a new schema file like this one; the engine is shared.

Rule anatomy:
    {"field", "check", "severity", "scope", optional "arg", optional "msg"}

  severity: "error" | "warn"
  scope:    "file"  -> a failure blocks the WHOLE tab (keep last-known-good)
            "row"   -> a failure QUARANTINES just that row (publish the rest)
            "field" -> a failure is a WARNING on that row (publish, log it)

Severity + scope together are the gate. The whole point: a broken column and a
single typo must NOT behave the same.
"""

# Controlled vocab (EVENTS_DATA_MODEL.md §2). Type these exactly in the sheet.
CATEGORIES = [
    "Fitness & Wellness", "Talks & Learning", "Workshops", "Family & Kids",
    "Arts & Music", "Community", "Volunteer", "Private",
]
# display: web/both/screen all PUBLISH; off is dropped at promote; anything else
# is a typo that would silently hide a row -> warn. (screen is not-for-web, not
# dead — the in-park screen pages need it.)
DISPLAY_VALUES = ["web", "both", "screen", "off"]
YES_NO_BLANK = ["yes", "no", "", "Yes", "No"]  # secondary flags (sheet dropdowns are capitalized)

SCHEMA = {
    "tab": "events",

    # Identity used for diffing staging vs prior (the dashboard's edit counts).
    # A multi-day run is ONE row (date + date_end), so date+title is stable.
    "identity": ["date", "title"],

    # Missing any of these column HEADERS = the tab is untrustworthy -> block,
    # serve last-known-good. (This is the 2026-06-14 News-went-dark catch.)
    "required_headers": ["display", "date", "title"],

    # Promote drops rows whose display is off or blank (both mean "not live").
    # web / both / screen all publish; the page does the web-vs-screen split.
    "drop_when_display": ["off", ""],

    # Autofixes applied to a working copy before checks (staging stays raw).
    "autofix_trim": True,  # strip surrounding whitespace on every cell

    "rules": [
        # --- structural / row-fatal -------------------------------------------
        {"field": "date",  "check": "required",          "severity": "error", "scope": "row"},
        {"field": "date",  "check": "iso_date",          "severity": "error", "scope": "row"},
        {"field": "title", "check": "required",          "severity": "error", "scope": "row"},

        # --- multi-day events (date_end) --------------------------------------
        # Blank = ordinary one-day event. If set, must be a real date >= date.
        {"field": "date_end", "check": "iso_date_or_blank", "severity": "error", "scope": "row"},
        {"field": "date_end", "check": "ge_field", "arg": "date",
         "severity": "error", "scope": "row",
         "msg": "date_end is before date — a backwards span would smear across the calendar"},

        # --- controlled vocab (warn: show it rather than hide it) -------------
        {"field": "category", "check": "in_vocab", "arg": CATEGORIES,
         "severity": "warn", "scope": "field"},
        {"field": "display",  "check": "in_vocab", "arg": DISPLAY_VALUES,
         "severity": "warn", "scope": "field",
         "msg": "unknown display value — a typo here hides the row from everyone"},

        # --- secondary flags (must be yes/no/blank) ---------------------------
        {"field": "kid_friendly",  "check": "in_vocab", "arg": YES_NO_BLANK, "severity": "warn", "scope": "field"},
        {"field": "save_the_date", "check": "in_vocab", "arg": YES_NO_BLANK, "severity": "warn", "scope": "field"},
        {"field": "fundraiser",    "check": "in_vocab", "arg": YES_NO_BLANK, "severity": "warn", "scope": "field"},
        {"field": "closes_park",   "check": "in_vocab", "arg": YES_NO_BLANK, "severity": "warn", "scope": "field"},

        # --- referential integrity (cross-tab) --------------------------------
        # Every non-blank series must match a name in the series tab. Orphan =
        # warn (the "Part of … series →" link just won't resolve). Trimmed first.
        {"field": "series", "check": "fk", "arg": ["series", "name"],
         "severity": "warn", "scope": "field",
         "msg": "series name doesn't match any row in the series tab"},

        # --- format (warn) ----------------------------------------------------
        {"field": "registration_url", "check": "url_or_blank", "severity": "warn", "scope": "field"},
        {"field": "link_url",         "check": "url_or_blank", "severity": "warn", "scope": "field"},
    ],
}
