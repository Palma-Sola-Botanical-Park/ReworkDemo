"""
data/schemas/news.py  —  validation rules for the `news` tab.

Park news stories. Feeds the reader pane + "More stories" squares on news.html.
Rich row: a story is headline + date plus a stack of optional content fields
(subhead, blurb, hero_image, intro, image1 + caption, aside, body2, link_url).
The page renders whatever is present (`if (n.intro)`, `if (n.image1)`, ...), so
only headline + date are load-bearing; everything else degrades gracefully.

Same engine as events.py; only the rule list differs. (Gate semantics: see
events.py's header or SHEET_SYNC_ARCHITECTURE.md §3 "As-built schema contract".)

Image fields (hero_image, image1) and link_url are intentionally NOT URL-checked:
they're local /ReworkDemo/... and /docs/... paths, which url_or_blank
(http[s]-only) would falsely flag amber. A missing image hides its own figure
on the page (onerror), so it's cosmetic, never fatal.
"""

DISPLAY_VALUES = ["web", "both", "screen", "off"]

SCHEMA = {
    "tab": "news",

    # Newest-first reader keyed on the story; date+headline is a stable identity.
    "identity": ["date", "headline"],

    # STRUCTURAL only: display + the date (sort) + headline (the page filters on
    # it: rows without a headline are dropped by the page anyway). Content
    # columns (subhead/blurb/intro/body2/images) are NOT required — a rename
    # degrades to a thinner story, never blocks the feed.
    "required_headers": ["display", "date", "headline"],

    # off / blank display rows never reach any page.
    "drop_when_display": ["off", ""],

    "autofix_trim": True,

    "rules": [
        # --- row-fatal: the two fields the page can't render a story without --
        {"field": "date",     "check": "required", "severity": "error", "scope": "row"},
        {"field": "date",     "check": "iso_date", "severity": "error", "scope": "row"},
        {"field": "headline", "check": "required", "severity": "error", "scope": "row"},

        # --- controlled vocab (warn) ------------------------------------------
        {"field": "display", "check": "in_vocab", "arg": DISPLAY_VALUES,
         "severity": "warn", "scope": "field",
         "msg": "unknown display value — a typo here hides the row from everyone"},

        # NB: hero_image / image1 / link_url are NOT url-checked — they're local
        # /ReworkDemo/... and /docs/... paths that url_or_blank would falsely flag.
    ],
}
