#!/usr/bin/env python3
"""
generate_wildlife_json.py
=========================
Reads all PSBP-*.html wildlife pages in /wildlife/ and generates a
wildlife.json file that the Nature page Wildlife tab fetches.

Sibling of generate_plants_json.py — same workflow:

    Place this script in the ROOT of your ReworkDemo repo
    (same level as index.html) and run:
        python3 generate_wildlife_json.py

    It writes wildlife.json to the same directory.
    Commit wildlife.json to the repo.

Re-run any time wildlife pages are added or updated.

WHAT IT EXTRACTS (from the wild-page markup)
--------------------------------------------
  theme     class on .wild-wrap  (theme-bird / theme-butterfly /
            theme-reptile / theme-mammal / theme-amphibian)
            → drives the category filter buttons on nature.html
  category  .wild-hero-category text  (e.g. "Butterflies & Moths")
  common    .wild-hero-name text  (falls back to filename)
  sci       .wild-sci-name
  family    .wild-family-tag
  native    "Native to Florida" badge present
  quick     first <li> in .quick-hits-list  (card teaser + search text)
  aliases   .alias-tag chips  (searchable alternate names)
  tags      .wild-tag chips   (searchable keywords)
  credit    photographer name from .wild-credit
  photo     wildlife/PSBP-XXXXX-Name.jpg  (all-hyphens, matches HTML name)
  page      wildlife/PSBP-XXXXX-Name.html
"""

import os
import re
import json
import glob
import html as htmllib


def clean(text):
    """Strip tags, unescape entities, collapse whitespace."""
    text = re.sub(r'<[^>]+>', '', text)
    text = htmllib.unescape(text)
    return re.sub(r'\s+', ' ', text).strip()


def extract_animal(html_path):
    filename = os.path.basename(html_path)

    # e.g. PSBP-99971-Florida-Zebra-Longwing.html
    m = re.match(r'(PSBP-\d+)-(.+)\.html', filename)
    if not m:
        return None

    psbp_id   = m.group(1)
    name_slug = m.group(2)

    with open(html_path, 'r', encoding='utf-8', errors='replace') as f:
        page_html = f.read()

    # ── Theme (category key) ─────────────────────────────────────
    theme = ''
    t_m = re.search(r'class="wild-wrap\s+theme-([a-z]+)"', page_html)
    if t_m:
        theme = t_m.group(1)

    # ── Hero category label ──────────────────────────────────────
    category = ''
    c_m = re.search(r'class="wild-hero-category"[^>]*>(.*?)</div>', page_html, re.DOTALL)
    if c_m:
        category = clean(c_m.group(1))

    # ── Common name ──────────────────────────────────────────────
    common = name_slug.replace('-', ' ')
    n_m = re.search(r'class="wild-hero-name"[^>]*>(.*?)</div>', page_html, re.DOTALL)
    if n_m:
        common = clean(n_m.group(1))

    # ── Scientific name ──────────────────────────────────────────
    sci = ''
    s_m = re.search(r'class="wild-sci-name"[^>]*>(.*?)</span>', page_html, re.DOTALL)
    if s_m:
        sci = clean(s_m.group(1))

    # ── Family ───────────────────────────────────────────────────
    family = ''
    f_m = re.search(r'class="wild-family-tag"[^>]*>(.*?)</a>', page_html, re.DOTALL)
    if f_m:
        family = clean(f_m.group(1))

    # ── Native badge ─────────────────────────────────────────────
    native = bool(re.search(r'Native to Florida', page_html))

    # ── Quick hits — first bullet ────────────────────────────────
    quick = ''
    qh = re.search(r'class="quick-hits-list"[^>]*>(.*?)</ul>', page_html, re.DOTALL)
    if qh:
        first_li = re.search(r'<li[^>]*>(.*?)</li>', qh.group(1), re.DOTALL)
        if first_li:
            quick = clean(first_li.group(1))

    # ── Aliases & tags ───────────────────────────────────────────
    aliases = [clean(a) for a in re.findall(r'class="alias-tag"[^>]*>(.*?)</span>', page_html, re.DOTALL)]
    tags    = [clean(t) for t in re.findall(r'class="wild-tag"[^>]*>(.*?)</span>', page_html, re.DOTALL)]

    # ── Photo credit ─────────────────────────────────────────────
    credit = ''
    cr_m = re.search(r'class="wild-credit"[^>]*>.*?<strong>(.*?)</strong>', page_html, re.DOTALL)
    if cr_m:
        credit = clean(cr_m.group(1))

    # ── Photo & page paths (all-hyphens, JPG matches HTML name) ──
    jpg_name = filename.replace('.html', '.jpg')

    return {
        'id':       psbp_id,
        'common':   common,
        'sci':      sci,
        'family':   family,
        'theme':    theme,        # bird / butterfly / reptile / mammal / amphibian
        'category': category,     # display label, e.g. "Butterflies & Moths"
        'native':   native,
        'quick':    quick,
        'aliases':  aliases,
        'tags':     tags,
        'credit':   credit,
        'photo':    f"wildlife/{jpg_name}",
        'page':     f"wildlife/{filename}",
    }


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

    print(f"Found {len(files)} wildlife pages. Extracting data…\n")

    animals, errors, missing_photos, missing_theme = [], [], [], []

    for path in files:
        try:
            a = extract_animal(path)
            if a:
                animals.append(a)
                # Sanity checks
                if not os.path.exists(os.path.join(script_dir, a['photo'])):
                    missing_photos.append(a['photo'])
                if not a['theme']:
                    missing_theme.append(a['id'] + ' ' + a['common'])
                print(f"  ✓ {a['id']}  {a['common']}  [{a['theme'] or 'NO THEME'}]")
            else:
                errors.append(os.path.basename(path))
        except Exception as e:
            errors.append(f"{os.path.basename(path)}: {e}")
            print(f"  ✗ {os.path.basename(path)}  ERROR: {e}")

    animals.sort(key=lambda a: int(re.search(r'\d+', a['id']).group()))

    out_path = os.path.join(script_dir, 'wildlife.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(animals, f, indent=2, ensure_ascii=False)

    # Category summary — these drive the filter buttons
    by_theme = {}
    for a in animals:
        by_theme.setdefault(a['theme'] or '(none)', 0)
        by_theme[a['theme'] or '(none)'] += 1

    print(f"\n✅ Done. {len(animals)} animals written to wildlife.json")
    print("   Categories found: " + ', '.join(f"{k} ({v})" for k, v in sorted(by_theme.items())))
    if missing_photos:
        print(f"⚠️  {len(missing_photos)} JPGs not found (check name/capitalization):")
        for p in missing_photos:
            print(f"     {p}")
    if missing_theme:
        print(f"⚠️  Pages missing a theme-* class on .wild-wrap: {missing_theme}")
    if errors:
        print(f"⚠️  {len(errors)} errors: {errors}")
    print("\nNext step: commit wildlife.json to your repo.")


if __name__ == '__main__':
    main()
