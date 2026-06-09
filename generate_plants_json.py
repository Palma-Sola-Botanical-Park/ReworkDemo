#!/usr/bin/env python3
"""
generate_plants_json.py
=======================
Reads all PSBP-*.html plant pages and generates a plants.json file
that the Nature page can fetch instead of using the hardcoded PLANTS array.

USAGE
-----
Place this script in the ROOT of your ReworkDemo repo (same level as index.html)
and run:
    python3 generate_plants_json.py

It writes plants.json to the same directory.
Commit plants.json to the repo -- the Nature page will fetch it automatically.

Re-run this script any time you add new plant pages.

SEARCHABLE FIELDS
-----------------
The Nature page search bar should index: common, sci, family, aliases, quick.
This covers common name, scientific name, family, alternate names, and the
first Quick Hits bullet (used as a teaser).
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


def extract_plant(html_path):
    filename = os.path.basename(html_path)

    # Extract PSBP ID and slug from filename
    # e.g. PSBP-00002-Weeping-Bottlebrush.html
    m = re.match(r'(PSBP-\d+)-(.+)\.html', filename)
    if not m:
        return None

    psbp_id   = m.group(1)
    name_slug = m.group(2)
    common    = name_slug.replace('-', ' ')

    with open(html_path, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()

    # -- Common name from hero (more reliable than filename) --------
    hero_m = re.search(r'class="plant-hero-name"[^>]*>(.*?)</div>', html, re.DOTALL)
    if hero_m:
        hero_name = clean(hero_m.group(1))
        if hero_name:
            common = hero_name

    # -- Scientific name --------------------------------------------
    sci = ''
    sci_m = re.search(r'class="plant-sci-name"[^>]*>(.*?)</span>', html, re.DOTALL)
    if sci_m:
        sci = clean(sci_m.group(1))

    # -- Family -----------------------------------------------------
    family = ''
    fam_m = re.search(r'class="plant-family-tag"[^>]*>(.*?)</a>', html, re.DOTALL)
    if fam_m:
        family = clean(fam_m.group(1))

    # -- Category (hero kicker) -------------------------------------
    cat = ''
    cat_m = re.search(r'class="plant-hero-category"[^>]*>(.*?)</div>', html, re.DOTALL)
    if cat_m:
        cat = clean(cat_m.group(1))

    # -- Status badges ----------------------------------------------
    native    = False
    invasive  = False
    toxic     = False
    edible    = False
    wetland   = False
    butterfly = False

    badge_m = re.search(r'class="plant-status-row"[^>]*>(.*?)</div>', html, re.DOTALL)
    if badge_m:
        badge_html = badge_m.group(1)
        # Native: look for "Florida Native" badge, NOT "Non-native"
        native    = bool(re.search(r'Florida Native', badge_html))
        invasive  = ('🚫' in badge_html) or ('Watch List' in badge_html) or bool(re.search(r'(?<!Not )Invasive', badge_html))
        toxic     = bool(re.search(r'[Tt]oxic|[Hh]andle with [Cc]are|[Cc]aution', badge_html))
        edible    = bool(re.search(r'[Ee]dible', badge_html))
        wetland   = bool(re.search(r'[Ww]etland', badge_html))

    # Fallback: derive wetland from the plant's Category (authoritative signal)
    if not wetland and 'wetland' in (cat or '').lower():
        wetland = True

    # Check full page for butterfly references
    butterfly = bool(re.search(r'[Bb]utterfl', html))

    # -- Quick hits -- first bullet point ---------------------------
    quick = ''
    qh_section = re.search(r'class="quick-hits-list"[^>]*>(.*?)</ul>', html, re.DOTALL)
    if qh_section:
        first_li = re.search(r'<li[^>]*>(.*?)</li>', qh_section.group(1), re.DOTALL)
        if first_li:
            quick = clean(first_li.group(1))

    # -- Origin label -----------------------------------------------
    origin = 'Native' if native else 'Non-native'

    # -- Also Known As (aliases) ------------------------------------
    aliases = []
    alias_tags = re.findall(r'class="alias-tag"[^>]*>(.*?)</span>', html, re.DOTALL)
    if alias_tags:
        aliases = [clean(a) for a in alias_tags if clean(a)]

    # -- Photo & page paths (all-dashes, photos/ folder) ------------
    jpg_name = filename.replace('.html', '.jpg')

    return {
        'id':        psbp_id,
        'common':    common,
        'sci':       sci,
        'family':    family,
        'aliases':   aliases,
        'cat':       cat,
        'origin':    origin,
        'native':    native,
        'butterfly': butterfly,
        'toxic':     toxic,
        'edible':    edible,
        'invasive':  invasive,
        'wetland':   wetland,
        'photo':     f"photos/{jpg_name}",
        'page':      f"plants/{filename}",
        'quick':     quick,
    }


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    plants_dir = os.path.join(script_dir, 'plants')

    if not os.path.isdir(plants_dir):
        print(f"ERROR: No /plants/ folder found at {plants_dir}")
        return

    pattern = os.path.join(plants_dir, 'PSBP-*.html')
    files   = sorted(glob.glob(pattern))

    if not files:
        print(f"No PSBP-*.html files found in {plants_dir}")
        return

    print(f"Found {len(files)} plant pages. Extracting data...\n")

    plants = []
    errors = []
    missing_photos = []

    for path in files:
        try:
            p = extract_plant(path)
            if p:
                plants.append(p)
                photo_path = os.path.join(script_dir, p['photo'])
                if not os.path.exists(photo_path):
                    missing_photos.append(p['photo'])
                aka = f"  aka: {', '.join(p['aliases'])}" if p['aliases'] else ''
                print(f"  + {p['id']}  {p['common']:<30} {p['sci']:<35} {p['family']}{aka}")
            else:
                errors.append(os.path.basename(path))
        except Exception as e:
            errors.append(f"{os.path.basename(path)}: {e}")
            print(f"  x {os.path.basename(path)}  ERROR: {e}")

    plants.sort(key=lambda p: int(re.search(r'\d+', p['id']).group()))

    out_path = os.path.join(script_dir, 'plants.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(plants, f, indent=2, ensure_ascii=False)

    n_aliases = sum(1 for p in plants if p['aliases'])
    n_native  = sum(1 for p in plants if p['native'])
    print(f"\nDone. {len(plants)} plants written to plants.json")
    print(f"   {n_native} native, {n_aliases} with aliases")
    print(f"   Searchable fields: common, sci, family, aliases, quick")
    if missing_photos:
        print(f"\n   {len(missing_photos)} photos not found:")
        for p in missing_photos:
            print(f"     {p}")
    if errors:
        print(f"\n   {len(errors)} errors: {errors}")
    print(f"\nNext step: commit plants.json to your repo.")


if __name__ == '__main__':
    main()
