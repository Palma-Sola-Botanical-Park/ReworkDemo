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
Commit plants.json to the repo — the Nature page will fetch it automatically.

Re-run this script any time you add new plant pages.
"""

import os
import re
import json
import glob

def extract_plant(html_path):
    filename = os.path.basename(html_path)
    
    # Extract PSBP ID and slug from filename
    # e.g. PSBP-00002-Weeping-Bottlebrush.html
    m = re.match(r'(PSBP-\d+)-(.+)\.html', filename)
    if not m:
        return None
    
    psbp_id   = m.group(1)
    name_slug = m.group(2)  # e.g. Weeping-Bottlebrush
    common    = name_slug.replace('-', ' ')
    
    with open(html_path, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()
    
    # ── Scientific name ──────────────────────────────────────────
    sci = ''
    sci_m = re.search(r'class="plant-sci-name"[^>]*>([^<]+)<', html)
    if sci_m:
        sci = sci_m.group(1).strip()
    
    # ── Family ───────────────────────────────────────────────────
    family = ''
    fam_m = re.search(r'class="plant-family-tag"[^>]*>([^<]+)<', html)
    if fam_m:
        family = fam_m.group(1).strip()
    
    # ── Category (hero kicker) ───────────────────────────────────
    cat = ''
    cat_m = re.search(r'class="plant-hero-category"[^>]*>([^<]+)<', html)
    if cat_m:
        cat = cat_m.group(1).strip()
    
    # ── Status badges ────────────────────────────────────────────
    native   = bool(re.search(r'Native', html[:2000]))
    invasive = bool(re.search(r'[Ii]nvasive', html[:2000]))
    
    # Look for toxic/safe in badge row
    toxic   = False
    edible  = False
    wetland = False
    butterfly = False
    
    badge_m = re.search(r'class="plant-status-row"[^>]*>(.*?)</div>', html, re.DOTALL)
    if badge_m:
        badge_html = badge_m.group(1)
        toxic     = bool(re.search(r'[Tt]oxic|[Hh]andle with [Cc]are|[Cc]aution', badge_html))
        edible    = bool(re.search(r'[Ee]dible', badge_html))
        wetland   = bool(re.search(r'[Ww]etland', badge_html))
    
    # Check wildlife tags for butterfly
    butterfly = bool(re.search(r'[Bb]utterfl', html))
    
    # ── Quick hits — first bullet point ─────────────────────────
    quick = ''
    qh_section = re.search(r'class="quick-hits-list"[^>]*>(.*?)</ul>', html, re.DOTALL)
    if qh_section:
        first_li = re.search(r'<li[^>]*>(.*?)</li>', qh_section.group(1), re.DOTALL)
        if first_li:
            quick = re.sub(r'<[^>]+>', '', first_li.group(1)).strip()
            quick = re.sub(r'\s+', ' ', quick)
    
    # ── Origin ───────────────────────────────────────────────────
    origin = 'Non-native'
    if native:
        origin = 'Native'
    
    # ── Photo filename ───────────────────────────────────────────
    # Convention: PSBP-00002_Weeping_Bottlebrush.jpg
    name_part = common.replace(' ', '_')
    photo = f"{psbp_id}_{name_part}.jpg"
    
    # ── Page URL ─────────────────────────────────────────────────
    page = f"plants/{filename}"
    
    return {
        'id':        psbp_id,
        'common':    common,
        'sci':       sci,
        'family':    family,
        'cat':       cat,
        'origin':    origin,
        'native':    native,
        'butterfly': butterfly,
        'toxic':     toxic,
        'edible':    edible,
        'invasive':  invasive,
        'wetland':   wetland,
        'photo':     f"plants/{photo}",
        'page':      page,
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
    
    print(f"Found {len(files)} plant pages. Extracting data…\n")
    
    plants = []
    errors = []
    
    for path in files:
        try:
            p = extract_plant(path)
            if p:
                plants.append(p)
                print(f"  ✓ {p['id']}  {p['common']}")
            else:
                errors.append(os.path.basename(path))
        except Exception as e:
            errors.append(f"{os.path.basename(path)}: {e}")
            print(f"  ✗ {os.path.basename(path)}  ERROR: {e}")
    
    # Sort by PSBP ID number
    plants.sort(key=lambda p: int(re.search(r'\d+', p['id']).group()))
    
    out_path = os.path.join(script_dir, 'plants.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(plants, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Done. {len(plants)} plants written to plants.json")
    if errors:
        print(f"⚠️  {len(errors)} errors: {errors}")
    print(f"\nNext step: commit plants.json to your repo.")


if __name__ == '__main__':
    main()
