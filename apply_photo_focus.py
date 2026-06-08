#!/usr/bin/env python3
"""
apply_photo_focus.py
====================
Sets the focal point (CSS object-position) on wildlife hero photos so the
crop lands on the creature instead of a random patch of leaves or water.

WHY
---
Every wildlife hero image is `object-fit:cover` with `object-position:center 35%`.
That fixed crop misses animals that aren't sitting dead-center. This script
writes a per-photo object-position onto the hero <img> so each banner frames
its subject. Idempotent — safe to run repeatedly.

HOW TO GET THE VALUES
---------------------
Open photo-focus.html, choose your /wildlife/ folder, drag each photo until
the creature is framed, then either:
  (a) copy the generated `FOCUS = { … }` block over the one below, OR
  (b) download photo_focus.json into the repo root (this script reads it
      automatically if present, and it overrides the FOCUS block below).

USAGE
-----
Place in the ROOT of ReworkDemo and run:
    python3 apply_photo_focus.py
"""

import os
import re
import json
import glob

# Paste the block from photo-focus.html here (id -> "X% Y%").
# Anything listed here is applied; unlisted photos keep the default crop.
FOCUS = {
    # 'PSBP-99972': '50% 20%',
    # 'PSBP-99983': '40% 30%',
}


def load_focus(script_dir):
    """photo_focus.json in the repo root, if present, overrides the FOCUS dict."""
    jpath = os.path.join(script_dir, 'photo_focus.json')
    if os.path.exists(jpath):
        try:
            with open(jpath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"Using photo_focus.json ({len(data)} entries).\n")
            return data
        except Exception as e:
            print(f"⚠️  Could not read photo_focus.json ({e}); using the FOCUS block instead.\n")
    return FOCUS


def set_object_position(img_tag, value):
    """Return img_tag with object-position set to `value` inside its style attr."""
    style_m = re.search(r'style="([^"]*)"', img_tag)
    if style_m:
        style = style_m.group(1)
        if re.search(r'object-position\s*:', style):
            new_style = re.sub(r'object-position\s*:[^;"]*;?', f'object-position:{value};', style)
        else:
            sep = '' if style.strip().endswith(';') or not style.strip() else ';'
            new_style = f'{style.rstrip()}{sep}object-position:{value};'
        return img_tag.replace(style_m.group(0), f'style="{new_style}"')
    # no style attr yet — add one right after the opening <img
    return re.sub(r'<img\b', f'<img style="object-position:{value};"', img_tag, count=1)


def main():
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    wildlife_dir = os.path.join(script_dir, 'wildlife')

    if not os.path.isdir(wildlife_dir):
        print(f"ERROR: No /wildlife/ folder found at {wildlife_dir}")
        return

    focus = load_focus(script_dir)
    if not focus:
        print("Nothing to apply — FOCUS is empty and no photo_focus.json found.")
        print("Run photo-focus.html first to pick focal points.")
        return

    applied, not_found, unchanged = 0, [], 0

    for psbp_id, value in focus.items():
        matches = glob.glob(os.path.join(wildlife_dir, f'{psbp_id}-*.html'))
        if not matches:
            not_found.append(psbp_id)
            continue
        path = matches[0]
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            html = f.read()

        # The hero <img> is the one whose src is the PSBP-*.jpg photo
        img_m = re.search(r'<img\b[^>]*src="' + re.escape(psbp_id) + r'-[^"]*\.jpg"[^>]*>', html)
        if not img_m:
            not_found.append(f"{psbp_id} (hero img not located)")
            continue

        new_tag = set_object_position(img_m.group(0), value)
        if new_tag == img_m.group(0):
            unchanged += 1
            print(f"  • {os.path.basename(path)}  already {value}")
            continue

        html = html.replace(img_m.group(0), new_tag, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        applied += 1
        print(f"  ✓ {os.path.basename(path)}  → object-position:{value}")

    print(f"\n✅ Done. {applied} updated, {unchanged} already set.")
    if not_found:
        print(f"⚠️  {len(not_found)} not matched: {not_found}")


if __name__ == '__main__':
    main()
