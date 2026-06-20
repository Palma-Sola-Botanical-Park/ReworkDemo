"""
data/schemas/volunteer.py  —  validation rules for the `volunteer` tab.

The volunteer spotlight is a freeform, Bev-managed tab: each row is one
spotlight card (title = name/headline, role, body = the freeform write-up,
optional photo + link). No dates, no foreign keys — the lightest schema in the
set. Same engine as events.py; only the rule list differs.

required_headers is STRUCTURAL only (display + title), matching events/classes.
`body` is deliberately NOT required: it's a content column, so a rename should
degrade to empty cards, never block the whole tab (the two-granularities rule).

photo_url is intentionally NOT URL-checked: spotlight photos are sometimes
local repo paths (e.g. /ReworkDemo/images/...) as well as remote Drive/iNat
URLs, and url_or_blank only accepts http(s) — so checking it would throw a
false amber on a valid local image. A missing/unloadable photo falls back to a
leaf glyph on the page, so it's cosmetic, never fatal.
"""

DISPLAY_VALUES = ["web", "both", "screen", "off"]

SCHEMA = {
    "tab": "volunteer",

    # Spotlight cards key on name + role for the dashboard's edit-count diff.
    "identity": ["title", "role"],

    # STRUCTURAL columns only — display + the card's label. Content columns
    # (body) are NOT required: a rename degrades to empty cards, doesn't block.
    "required_headers": ["display", "title"],

    # off / blank display rows never reach any page (matches events/classes).
    "drop_when_display": ["off", ""],

    "autofix_trim": True,

    "rules": [
        # --- row-fatal: a card with no name is broken -------------------------
        {"field": "title", "check": "required", "severity": "error", "scope": "row"},

        # --- controlled vocab (warn) ------------------------------------------
        {"field": "display", "check": "in_vocab", "arg": DISPLAY_VALUES,
         "severity": "warn", "scope": "field",
         "msg": "unknown display value — a typo here hides the row from everyone"},

        # --- format (warn) — link only; see module docstring re: photo_url ----
        {"field": "link_url", "check": "url_or_blank", "severity": "warn", "scope": "field"},
    ],
}
