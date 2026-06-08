#!/usr/bin/env python3
"""
fix_wildlife_float.py
=====================
Fixes the floating "🦜 All Wildlife" back button on every wildlife page.

THE BUG
-------
The button is styled with `background:var(--theme)`, but the --theme color
variable is declared on `.wild-wrap` (via the theme-bird / theme-butterfly /
… class). The button sits OUTSIDE .wild-wrap, so the variable doesn't reach
it — the background resolves to nothing (transparent) and the white text
disappears. Only the emoji shows.

THE FIX
-------
Bake each page's actual category color straight into the float-button rule,
so it no longer depends on the out-of-scope variable. The button keeps its
per-category color (blue for birds, magenta for butterflies, etc.) and is
solid + readable on every page. Idempotent — safe to run more than once.

USAGE
-----
Place in the ROOT of ReworkDemo (same level as index.html) and run:
    python3 fix_wildlife_float.py
"""

import os
import re
import glob

# theme  →  (--theme,   --theme-dark)   — matched to the per-page CSS
THEME_COLORS = {
    'bird':      ('#235e86', '#143b54'),
    'butterfly': ('#a23a6e', '#6b2247'),
    'reptile':   ('#9c5a33', '#5e3318'),
    'mammal':    ('#6b4a2b', '#3f2c19'),
    'amphibian': ('#3d7a52', '#234a30'),
}

# Unique anchors inside the float-button rules (and nowhere else on the page)
BG_OLD    = 'background:var(--theme);color:#fff;font-size:15px'
HOVER_OLD = '.wild-float-back:hover{ background:var(--theme-dark);'


def main():
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    wildlife_dir = os.path.join(script_dir, 'wildlife')

    if not os.path.isdir(wildlife_dir):
        print(f"ERROR: No /wildlife/ folder found at {wildlife_dir}")
        return

    files = sorted(glob.glob(os.path.join(wildlife_dir, 'PSBP-*.html')))
    if not files:
        print(f"No PSBP-*.html files found in {wildlife_dir}")
        return

    fixed, already, skipped = 0, 0, []

    for path in files:
        name = os.path.basename(path)
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            html = f.read()

        theme_m = re.search(r'class="wild-wrap\s+theme-([a-z]+)"', html)
        if not theme_m or theme_m.group(1) not in THEME_COLORS:
            skipped.append(f"{name} (no recognized theme-* class)")
            continue
        theme = theme_m.group(1)
        color, dark = THEME_COLORS[theme]

        if BG_OLD not in html and HOVER_OLD not in html:
            already += 1
            print(f"  • {name}  already fixed [{theme}]")
            continue

        new = html
        new = new.replace(BG_OLD, f'background:{color};color:#fff;font-size:15px')
        new = new.replace(HOVER_OLD, f'.wild-float-back:hover{{ background:{dark};')

        if new != html:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new)
            fixed += 1
            print(f"  ✓ {name}  → {color} [{theme}]")
        else:
            skipped.append(f"{name} (float rule not matched)")

    print(f"\n✅ Done. {fixed} fixed, {already} already correct.")
    if skipped:
        print(f"⚠️  {len(skipped)} skipped:")
        for s in skipped:
            print(f"     {s}")


if __name__ == '__main__':
    main()
