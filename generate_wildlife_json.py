#!/usr/bin/env python3
"""
generate_wildlife_json.py
=========================
Generates wildlife.json (the search/grid index for nature.html) directly
from the two authoritative JSON masters:

  - wildlife_signage.json   (content)
  - photo_credits.json      (hero photo, credit, focus)

Replaces the old HTML-scraping version. Same output shape — nature.html
doesn't need to change.

USAGE:
    cd /path/to/ReworkDemo
    python3 generate_wildlife_json.py

    It writes wildlife.json to the repo root.
    Commit wildlife.json to the repo.

Re-run any time wildlife_signage.json or photo_credits.json changes
(new species, new heroes, updated content).

OUTPUT SHAPE (per species):
    {
      "id": "PSBP-99998",
      "common": "Anhinga",
      "sci": "Anhinga anhinga",
      "family": "Anhingidae",
      "theme": "bird",
      "category": "Waterbirds & Waterfowl",
      "native": true,
      "quick": "Watch the water for a slim black bird...",
      "aliases": ["Snakebird", "Water Turkey"],
      "tags": ["Bird", "Waterbird", "Native"],
      "credit": "robcarr52",
      "photo": "photos/PSBP-99998/681678800.jpg",
      "focus": "54% 51%",
      "page": "wildlife/PSBP-99998-Anhinga.html"
    }
"""

import os
import re
import json

# Paths — edit these if your layout differs
WILDLIFE_JSON = "data/sources/wildlife_signage.json"
PHOTO_CREDITS_JSON = "data/sources/photo_credits.json"
OUTPUT = "wildlife.json"

# Only include species at these statuses in the search index
PUBLISHABLE_STATUSES = {"html", "spotted"}

THEME_MAP = {
    "Bird": "bird",
    "Butterfly": "butterfly",
    "Moth": "butterfly",
    "Lizard": "reptile",
    "Turtle": "reptile",
    "Snake": "reptile",
    "Mammal": "mammal",
    "Dragonfly": "amphibian",
    "Grasshopper": "amphibian",
    "True Bug": "amphibian",
    "Beetle": "amphibian",
    "Crustacean": "amphibian",
}


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    ws_path = os.path.join(script_dir, WILDLIFE_JSON)
    pc_path = os.path.join(script_dir, PHOTO_CREDITS_JSON)

    if not os.path.isfile(ws_path):
        print(f"ERROR: {WILDLIFE_JSON} not found")
        return
    if not os.path.isfile(pc_path):
        print(f"ERROR: {PHOTO_CREDITS_JSON} not found")
        return

    ws = json.load(open(ws_path, encoding="utf-8"))
    pc = json.load(open(pc_path, encoding="utf-8"))

    # Build hero lookup from photo_credits
    heroes = {}
    for p in pc["photos"]:
        if p.get("hero") and p.get("psbp_id"):
            heroes[p["psbp_id"]] = p

    animals = []
    skipped = 0

    for s in ws["species"]:
        # Only publishable species
        if s.get("status") not in PUBLISHABLE_STATUSES:
            skipped += 1
            continue

        sid = s["id"]
        name = s["common_name"]
        group = s.get("animal_group", "Bird")
        family = s.get("taxonomy", {}).get("family", "")

        # Hero photo
        hero = heroes.get(sid)
        if hero:
            fn = hero.get("filename", "")
            # Subfolder model: photos/PSBP-XXXXX/filename.jpg
            if fn and not fn.startswith("PSBP-"):
                photo_path = f"photos/{sid}/{fn}"
            else:
                photo_path = f"photos/{fn}"
            credit = hero.get("photographer", "")
            focus = hero.get("focus", "50% 50%")
        else:
            photo_path = ""
            credit = ""
            focus = "50% 50%"

        # Quick hit — first one
        qh = s.get("quick_hits", [])
        quick = qh[0] if qh else ""

        # Page path
        slug = name.replace(" ", "-").replace("'", "")
        page_path = f"wildlife/{sid}-{slug}.html"

        entry = {
            "id": sid,
            "common": name,
            "sci": s.get("scientific_name", ""),
            "family": family,
            "theme": THEME_MAP.get(group, "bird"),
            "category": s.get("category", ""),
            "native": s.get("native", True),
            "quick": quick,
            "aliases": s.get("also_known_as", []),
            "tags": s.get("tags", []),
            "credit": credit,
            "photo": photo_path,
            "focus": focus,
            "page": page_path,
        }
        animals.append(entry)
        print(f"  ✓ {sid}  {name:30}  [{THEME_MAP.get(group, 'bird')}]")

    # Sort by PSBP ID number
    animals.sort(key=lambda a: int(re.search(r'\d+', a['id']).group()))

    out_path = os.path.join(script_dir, OUTPUT)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(animals, f, indent=2, ensure_ascii=False)

    # Summary
    by_theme = {}
    for a in animals:
        by_theme[a["theme"]] = by_theme.get(a["theme"], 0) + 1

    missing_photos = [a for a in animals if not a["photo"] or not os.path.exists(os.path.join(script_dir, a["photo"]))]

    print(f"\n✅ Done. {len(animals)} species written to {OUTPUT}")
    print(f"   Skipped {skipped} species (not at html/spotted status)")
    print("   Categories: " + ", ".join(f"{k} ({v})" for k, v in sorted(by_theme.items())))
    if missing_photos:
        print(f"⚠️  {len(missing_photos)} species with missing hero photos:")
        for a in missing_photos:
            print(f"     {a['id']} {a['common']} → {a['photo'] or '(none)'}")
    print("\nNext step: commit wildlife.json to your repo.")


if __name__ == "__main__":
    main()
