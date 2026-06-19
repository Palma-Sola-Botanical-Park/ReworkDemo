#!/usr/bin/env python3
"""
psbp_photo_license_audit.py
===========================
Audit how many usable photos exist in the **Palma Sola Botanical Park**
iNaturalist project for every species on the master signage sheets, broken
down by copyright (license) type.

For each PSBP species (plants PSBP-000xx, animals PSBP-999xx) it reports:
  * how many observations of that taxon are IN the project
  * how many photos total
  * a count for each Creative Commons license + All-Rights-Reserved
  * a "usable" total (anything that isn't All-Rights-Reserved)
  * a "usable, no-ND" total (drops CC-*-ND, since cropping/resizing a photo
    for signage is a derivative work that ND licenses forbid)

It does NOT download anything. It's a pure inventory pass so you can see, before
committing to harvest, where the photo coverage is strong, thin, or zero.

What "usable" means here is copyright only — NOT photo quality. Judging which
shots are actually good is the separate vision pass.

Setup (one time)
----------------
    pip3 install requests pandas openpyxl

Run
---
    python3 psbp_photo_license_audit.py \
        --plants  "/Users/fiona/Documents/PSBP_Master_Plant_Signage-2026Jun18.xlsx" \
        --animals "/Users/fiona/Documents/PSBP_Master_Animal_Signage.xlsx"

Options
-------
    --group plants|animals|both   default both
    --out  ./audit                folder for the CSV (default: current dir)

Notes
-----
* Plants are resolved from botanical name -> iNat taxon id (cached to
  taxon_cache.json so re-runs are fast). Any name that won't resolve is listed
  so you can fix it.
* Animals use the iNat Taxon ID already in the sheet; blanks fall back to name.
* Matching rolls subspecies/finer observations up to your species (and species
  up to a genus-level PSBP entry like Sea Fig) via the observation taxon's
  ancestry, so nothing slips through on a rank mismatch.
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from collections import defaultdict

try:
    import requests
except ImportError:
    sys.exit("Missing dependency. Run:  pip3 install requests pandas openpyxl")

# --------------------------------------------------------------------------- #
PROJECT_SLUG  = "palma-sola-botanical-park"
API_BASE      = "https://api.inaturalist.org/v1"
PER_PAGE      = 200
REQUEST_PAUSE = 1.0
USER_AGENT    = "PSBP-license-audit/1.0 (Palma Sola Botanical Park)"
CACHE_FILE    = "taxon_cache.json"

# Sheet layout (tab name + the columns we need from each)
PLANT_TAB,  PLANT_ID,  PLANT_SCI,  PLANT_COMMON,  PLANT_RANK  = \
    "PSBP_Plants",  "PSBP Species ID", "Botanical Name",  "Common Name", "Sign Level"
ANIMAL_TAB, ANIMAL_ID, ANIMAL_SCI, ANIMAL_COMMON, ANIMAL_RANK, ANIMAL_TAXON = \
    "PSBP_Animals", "PSBP Animal ID", "Scientific Name", "Common Name", "Sign Level", "iNat Taxon ID"

# License columns, in report order. None == All Rights Reserved.
LICENSE_ORDER = ["cc0", "cc-by", "cc-by-nc", "cc-by-sa",
                 "cc-by-nd", "cc-by-nc-sa", "cc-by-nc-nd", "all-rights-reserved"]
ND_LICENSES = {"cc-by-nd", "cc-by-nc-nd"}
USABLE = {"cc0", "cc-by", "cc-by-nc", "cc-by-sa", "cc-by-nd", "cc-by-nc-sa", "cc-by-nc-nd"}

CSV_FIELDS = (["psbp_id", "scientific_name", "common_name", "group",
               "resolved_taxon_id", "observations_in_project", "photos_total"]
              + [c.replace("-", "_") for c in LICENSE_ORDER]
              + ["usable_total", "usable_no_nd", "note"])


# --------------------------------------------------------------------------- #
def normalize(s):
    return re.sub(r"\s+", " ", str(s).strip().lower())


def get_json(session, url, params=None):
    for attempt in range(1, 4):
        try:
            r = session.get(url, params=params, timeout=60)
            if r.status_code == 200:
                time.sleep(REQUEST_PAUSE)
                return r.json()
            print(f"  HTTP {r.status_code} on {url} (try {attempt}/3)")
        except requests.RequestException as e:
            print(f"  Request error: {e} (try {attempt}/3)")
        time.sleep(2 * attempt)
    return None


def load_species(path, tab, id_col, sci_col, common_col, rank_col, group, taxon_col=None):
    import pandas as pd
    if not os.path.isfile(path):
        sys.exit(f"File not found: {path}")
    df = pd.read_excel(path, sheet_name=tab)
    out = []
    for _, row in df.iterrows():
        psbp_id = str(row.get(id_col, "")).strip()
        sci = str(row.get(sci_col, "")).strip()
        if not psbp_id or psbp_id.lower() == "nan" or not sci or sci.lower() == "nan":
            continue
        taxon_id = None
        if taxon_col and taxon_col in df.columns:
            raw = row.get(taxon_col)
            if raw is not None and str(raw).strip() and str(raw).lower() != "nan":
                try:
                    taxon_id = int(float(raw))
                except (ValueError, TypeError):
                    taxon_id = None
        rank = str(row.get(rank_col, "")).strip().lower()
        out.append({
            "psbp_id": psbp_id, "scientific_name": sci,
            "common_name": str(row.get(common_col, "")).strip(),
            "group": group, "taxon_id": taxon_id,
            "rank_hint": rank if rank in ("species", "genus") else None,
        })
    return out


def resolve_taxon_id(session, name, rank_hint, cache):
    key = normalize(name)
    if key in cache:
        return cache[key]
    params = {"q": name, "is_active": "true", "per_page": 10}
    if rank_hint:
        params["rank"] = rank_hint
    data = get_json(session, f"{API_BASE}/taxa", params=params)
    if (not data or not data.get("results")) and rank_hint:
        data = get_json(session, f"{API_BASE}/taxa",
                        params={"q": name, "is_active": "true", "per_page": 10})
    tid = None
    if data and data.get("results"):
        results = data["results"]
        exact = [r for r in results if normalize(r.get("name", "")) == key]
        pick = exact[0] if exact else results[0]
        tid = pick.get("id")
    cache[key] = tid
    return tid


def fetch_all_observations(session):
    """Cursor-paginate every observation in the project (robust past 10k)."""
    all_obs, last_id = [], 0
    print(f"\nFetching observations from project '{PROJECT_SLUG}'...")
    while True:
        data = get_json(session, f"{API_BASE}/observations", params={
            "project_id": PROJECT_SLUG, "per_page": PER_PAGE,
            "order_by": "id", "order": "asc", "id_above": last_id,
        })
        if not data:
            print("  Stopping: no data returned.")
            break
        results = data.get("results", [])
        if not results:
            break
        all_obs.extend(results)
        last_id = results[-1]["id"]
        total = data.get("total_results", 0)
        print(f"  +{len(results)} (have {len(all_obs)} of {total})")
        if len(results) < PER_PAGE:
            break
    return all_obs


def main():
    ap = argparse.ArgumentParser(description="Audit PSBP iNat photo licenses per species.")
    ap.add_argument("--plants",  default="PSBP_Master_Plant_Signage-2026Jun18.xlsx")
    ap.add_argument("--animals", default="PSBP_Master_Animal_Signage.xlsx")
    ap.add_argument("--group", default="both", choices=["both", "plants", "animals"])
    ap.add_argument("--out", default=".")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    species = []
    if args.group in ("both", "plants"):
        species += load_species(args.plants, PLANT_TAB, PLANT_ID, PLANT_SCI,
                                 PLANT_COMMON, PLANT_RANK, "plant")
    if args.group in ("both", "animals"):
        species += load_species(args.animals, ANIMAL_TAB, ANIMAL_ID, ANIMAL_SCI,
                                 ANIMAL_COMMON, ANIMAL_RANK, "animal", ANIMAL_TAXON)
    if not species:
        sys.exit("No species loaded.")
    print(f"Loaded {len(species)} species "
          f"({sum(s['group']=='plant' for s in species)} plants, "
          f"{sum(s['group']=='animal' for s in species)} animals).")

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    # Resolve taxon ids (animals mostly pre-filled; plants by name, cached).
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            cache = json.load(open(CACHE_FILE))
        except Exception:
            cache = {}
    unresolved = []
    need = [s for s in species if not s["taxon_id"]]
    if need:
        print(f"\nResolving {len(need)} taxon id(s) by name (cached after first run)...")
    for s in need:
        s["taxon_id"] = resolve_taxon_id(session, s["scientific_name"],
                                         s["rank_hint"], cache)
        if not s["taxon_id"]:
            unresolved.append(s)
    json.dump(cache, open(CACHE_FILE, "w"), indent=0)

    # Map every resolved target taxon id -> its species record(s).
    id_to_species = defaultdict(list)
    target_ids = set()
    for s in species:
        if s["taxon_id"]:
            id_to_species[s["taxon_id"]].append(s)
            target_ids.add(s["taxon_id"])

    observations = fetch_all_observations(session)
    if not observations:
        sys.exit("No observations retrieved — check the project slug or your connection.")

    # Per-species license tallies.
    tally = {s["psbp_id"]: defaultdict(int) for s in species}
    obs_count = defaultdict(set)   # psbp_id -> set of observation ids (dedupe)

    for obs in observations:
        taxon = obs.get("taxon") or {}
        if not taxon:
            continue
        cand_ids = {taxon.get("id")} | set(taxon.get("ancestor_ids") or [])
        hits = cand_ids & target_ids
        if not hits:
            continue
        # license counts for this observation's photos
        photo_lics = []
        for ph in obs.get("photos", []):
            lic = ph.get("license_code")
            photo_lics.append(lic if lic in USABLE else "all-rights-reserved")
        for tid in hits:
            for s in id_to_species[tid]:
                pid = s["psbp_id"]
                obs_count[pid].add(obs.get("id"))
                for lic in photo_lics:
                    tally[pid][lic] += 1

    # Build rows.
    rows = []
    for s in species:
        pid = s["psbp_id"]
        t = tally[pid]
        photos_total = sum(t.values())
        usable_total = sum(t[l] for l in USABLE)
        usable_no_nd = sum(t[l] for l in USABLE if l not in ND_LICENSES)
        note = ""
        if not s["taxon_id"]:
            note = "taxon not resolved — check botanical name"
        elif len(obs_count[pid]) == 0:
            note = "no observations of this taxon in project"
        if s["rank_hint"] == "genus":
            note = (note + "; " if note else "") + "genus-level entry"
        row = {
            "psbp_id": pid, "scientific_name": s["scientific_name"],
            "common_name": s["common_name"], "group": s["group"],
            "resolved_taxon_id": s["taxon_id"] or "",
            "observations_in_project": len(obs_count[pid]),
            "photos_total": photos_total,
            "usable_total": usable_total, "usable_no_nd": usable_no_nd, "note": note,
        }
        for lic in LICENSE_ORDER:
            row[lic.replace("-", "_")] = t[lic]
        rows.append(row)

    rows.sort(key=lambda r: r["psbp_id"])
    out_csv = os.path.join(args.out, "psbp_photo_license_audit.csv")
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        w.writerows(rows)

    # Console summary + gap lists.
    have_usable = [r for r in rows if r["usable_total"] > 0]
    license_gap = [r for r in rows
                   if r["observations_in_project"] > 0 and r["usable_total"] == 0]
    coverage_gap = [r for r in rows
                    if r["observations_in_project"] == 0 and r["resolved_taxon_id"]]

    print("\n" + "=" * 60)
    print(f"Audited {len(rows)} species | {len(observations)} project observations")
    print(f"Total photos seen: {sum(r['photos_total'] for r in rows)}  "
          f"(usable: {sum(r['usable_total'] for r in rows)}, "
          f"usable no-ND: {sum(r['usable_no_nd'] for r in rows)})")
    print(f"Species with >=1 usable photo: {len(have_usable)}")
    print(f"License gap (has obs, 0 usable): {len(license_gap)}")
    print(f"Coverage gap (resolved, 0 obs in project): {len(coverage_gap)}")
    if unresolved:
        print(f"Unresolved names ({len(unresolved)}): "
              + ", ".join(f"{s['psbp_id']} {s['scientific_name']}" for s in unresolved))
    print(f"\nFull report: {out_csv}")

    def dump(label, items):
        if items:
            print(f"\n--- {label} ---")
            for r in items:
                print(f"  {r['psbp_id']}  {r['scientific_name']} ({r['common_name']})")

    dump("LICENSE GAP: observed but nothing usable", license_gap)
    dump("COVERAGE GAP: in sheet, not observed in project", coverage_gap)


if __name__ == "__main__":
    main()
