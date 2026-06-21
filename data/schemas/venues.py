"""
data/schemas/venues.py  —  validation rules for the `venues` tab.

Rentable options + the seasonal price grid. NO `display` column — venues are
always-on reference data (the page decides what to show), so nothing is dropped
on display. The canonical key is `id` (weddings/large/medium/small/...); a row
with no id can't be addressed, so that's the one row-fatal check.

Columns: order | id | name | category | scope | duration | capacity | includes |
         sat_season | wknd_season | wkdy_season | sat_off | wknd_off | wkdy_off |
         deposit | manager | insurance | note | photo

Two deliberate NON-checks, to keep the board green and honest:
  * The six price columns (sat_season .. wkdy_off) are NOT validated as numbers —
    the engine has no numeric check today, so a fat-fingered "$3,850" would sail
    through. If you want that guarded it's a one-function add to the engine (a
    `number` check) plus a warn rule per column. Say the word and I'll wire it.
  * `photo` is NOT URL-checked — some photos may be local /ReworkDemo paths,
    which a URL check would falsely flag (same reason we skipped it on volunteer).

Gate recap: quarantine ONLY on severity:"error" + scope:"row"; file-level block
ONLY from required_headers. See events.py / SHEET_SYNC_ARCHITECTURE.md section 3.
"""

CATEGORY_VALUES = ["wedding", "rental"]
SCOPE_VALUES    = ["Whole Park", "Building", "Partial"]

SCHEMA = {
    "tab": "venues",

    # id is the address every price/scope row hangs off; it keys the diff.
    "identity": ["id"],

    # the key + the label a card can't render without.
    "required_headers": ["id", "name"],

    "drop_when_display": [],          # no display column — drop nothing.

    "autofix_trim": True,

    "rules": [
        # --- row-fatal: a venue with no id can't be addressed ----------------
        {"field": "id", "check": "required", "severity": "error", "scope": "row"},

        # --- controlled vocab (warn) -----------------------------------------
        {"field": "category", "check": "in_vocab", "arg": CATEGORY_VALUES,
         "severity": "warn", "scope": "field"},
        {"field": "scope",    "check": "in_vocab", "arg": SCOPE_VALUES,
         "severity": "warn", "scope": "field"},
    ],
}
