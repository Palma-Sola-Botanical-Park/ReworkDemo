"""
data/schemas/series.py  —  validation rules for the `series` tab.

Series are program umbrellas that events point at BY NAME
(events.series -> series.name is the foreign key build_refs resolves). So the one
row-fatal field here is `name`: a blank name is both a broken card AND an
unresolvable FK target for every event that references it.

Columns: display | active | name | category | blurb | flyer_url | flyer_text

Same engine as events.py; only the rule list differs. Gate recap: quarantine
fires ONLY on severity:"error" + scope:"row"; file-level blocking comes ONLY from
required_headers, never a rule. See events.py header / SHEET_SYNC_ARCHITECTURE.md
section 3 "As-built schema contract".
"""

CATEGORIES = [
    "Fitness & Wellness", "Talks & Learning", "Workshops", "Family & Kids",
    "Arts & Music", "Community", "Volunteer", "Private",
]
DISPLAY_VALUES = ["web", "both", "screen", "off"]
YES_NO_BLANK   = ["yes", "no", ""]   # in_vocab is case-insensitive in the engine

SCHEMA = {
    "tab": "series",

    # Events resolve their series link by name, so name keys the diff too.
    "identity": ["name"],

    # display + the name every event FK and every card depends on.
    "required_headers": ["display", "name"],

    # off / blank display rows never reach any page (matches events/classes).
    "drop_when_display": ["off", ""],

    "autofix_trim": True,

    "rules": [
        # --- row-fatal: a series with no name can't be linked or rendered -----
        {"field": "name", "check": "required", "severity": "error", "scope": "row"},

        # --- controlled vocab (warn: show it rather than hide it) ------------
        {"field": "display",  "check": "in_vocab", "arg": DISPLAY_VALUES,
         "severity": "warn", "scope": "field",
         "msg": "unknown display value — a typo here hides the row from everyone"},
        {"field": "active",   "check": "in_vocab", "arg": YES_NO_BLANK,
         "severity": "warn", "scope": "field"},
        {"field": "category", "check": "in_vocab", "arg": CATEGORIES,
         "severity": "warn", "scope": "field"},

        # --- format (warn) — flyer_url rows are full https Google Doc URLs ----
        {"field": "flyer_url", "check": "url_or_blank", "severity": "warn", "scope": "field"},
    ],
}
