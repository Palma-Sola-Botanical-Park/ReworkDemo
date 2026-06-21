"""
data/schemas/wedding_gallery.py  —  validation rules for the `wedding_gallery` tab.

The venue page's photo strip. NO `display` column — nothing is dropped on display.
A gallery row is nothing but its image, so a row with a blank `image` is pointless
and gets quarantined; order/caption renames just degrade (unsorted, or no caption).

Columns: order | image | caption

`image` is NOT URL-checked — the paths are in-repo relative
("images/venue/wedding1.jpg"), which a URL check would falsely flag. The required
row-check below catches the only failure that matters: an empty image.

Gate recap: quarantine ONLY on severity:"error" + scope:"row"; file-level block
ONLY from required_headers. See events.py / SHEET_SYNC_ARCHITECTURE.md section 3.
"""

SCHEMA = {
    "tab": "wedding_gallery",

    "identity": ["image"],

    "required_headers": ["image"],

    "drop_when_display": [],          # no display column — drop nothing.

    "autofix_trim": True,

    "rules": [
        # --- row-fatal: a gallery row with no image is an empty frame --------
        {"field": "image", "check": "required", "severity": "error", "scope": "row"},
    ],
}
