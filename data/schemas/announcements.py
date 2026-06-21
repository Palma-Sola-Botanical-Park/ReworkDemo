"""
data/schemas/announcements.py  —  validation rules for the `announcements` tab.

Homepage + in-park-screen messages. Structural columns are display + title (the
headline a card can't render without). body/link are content: a rename degrades
to a thinner card, never blocks the feed.

Columns: emoji | title | body | link_text | link_url | display

NOTE: link_url is intentionally NOT format-checked. Bev's links are often
in-site relative paths ("news.html?story=Bishop", "/docs/news/...pdf"), which a
URL check would falsely flag amber. Same call we made for volunteer's local photo
path — the link still works; the board stays honest.

Gate recap: quarantine ONLY on severity:"error" + scope:"row"; file-level block
ONLY from required_headers. See events.py / SHEET_SYNC_ARCHITECTURE.md section 3.
"""

DISPLAY_VALUES = ["web", "both", "screen", "off"]

SCHEMA = {
    "tab": "announcements",

    "identity": ["title"],

    "required_headers": ["display", "title"],

    "drop_when_display": ["off", ""],

    "autofix_trim": True,

    "rules": [
        # --- row-fatal: an announcement with no headline is broken -----------
        {"field": "title",   "check": "required", "severity": "error", "scope": "row"},

        # --- controlled vocab (warn) -----------------------------------------
        {"field": "display", "check": "in_vocab", "arg": DISPLAY_VALUES,
         "severity": "warn", "scope": "field",
         "msg": "unknown display value — a typo here hides the row from everyone"},
    ],
}
