"""
data/schemas/classes.py  —  validation rules for the `classes` tab.

Classes are standing weekly rules (same weekday + time + instructor), NOT dated
events. So: no date/date_end, no series foreign key, no closes_park. The one
field that drives everything is `weekday` — the expander turns it into dated
instances inside the 2-week window — so a blank/bad weekday is a row-fatal error.

Same engine as events.py; only the rule list differs.
"""

CATEGORIES = [
    "Fitness & Wellness", "Talks & Learning", "Workshops", "Family & Kids",
    "Arts & Music", "Community", "Volunteer", "Private",
]
DISPLAY_VALUES = ["web", "both", "screen", "off"]
YES_NO_BLANK = ["yes", "no", ""]   # vocab check is case-insensitive in the engine
# weekday is a single-select dropdown in the sheet — exactly one three-letter
# code per cell (Mon..Sun). No comma-lists, no "Monday" long form.
WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

SCHEMA = {
    "tab": "classes",

    # Two same-titled classes can differ by weekday/time (Basic Hatha is Mon 4PM
    # AND Wed 9AM), so identity must include all three or the diff miscounts.
    "identity": ["title", "weekday", "time"],

    "required_headers": ["display", "weekday", "title"],

    # off / blank display rows never reach any page.
    "drop_when_display": ["off", ""],

    "autofix_trim": True,

    "rules": [
        # --- the scheduling rule (row-fatal: no weekday = can't be placed) ----
        {"field": "weekday", "check": "required",            "severity": "error", "scope": "row"},
        {"field": "weekday", "check": "in_vocab", "arg": WEEKDAYS,
         "severity": "error", "scope": "row",
         "msg": "weekday must be one of Mon..Sun (single code)"},
        {"field": "title",   "check": "required",            "severity": "error", "scope": "row"},

        # --- season window (optional; if set, must be a real date) ------------
        {"field": "active_from", "check": "iso_date_or_blank", "severity": "error", "scope": "row"},
        {"field": "active_to",   "check": "iso_date_or_blank", "severity": "error", "scope": "row"},
        {"field": "active_to",   "check": "ge_field", "arg": "active_from",
         "severity": "error", "scope": "row",
         "msg": "active_to is before active_from"},

        # --- controlled vocab (warn) -----------------------------------------
        {"field": "category", "check": "in_vocab", "arg": CATEGORIES,    "severity": "warn", "scope": "field"},
        {"field": "display",  "check": "in_vocab", "arg": DISPLAY_VALUES, "severity": "warn", "scope": "field",
         "msg": "unknown display value — a typo here hides the row from everyone"},
        {"field": "kid_friendly", "check": "in_vocab", "arg": YES_NO_BLANK, "severity": "warn", "scope": "field"},

        # --- format (warn) ----------------------------------------------------
        {"field": "registration_url", "check": "url_or_blank", "severity": "warn", "scope": "field"},
        {"field": "link_url",         "check": "url_or_blank", "severity": "warn", "scope": "field"},

        # note: `cost`, `time`, `instructor`, `day` are free text — no rules.
    ],
}
