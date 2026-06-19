#!/usr/bin/env python3
"""
diagnose_missing_obs.py
=======================
Figure out WHY certain species show 0 observations in the PSBP project even
though a valid iNaturalist observation exists (per the photo-credits CSV).

The prime suspect: planted botanical-garden specimens get marked "cultivated /
not wild" on iNaturalist, which makes them *casual* grade — and casual/captive
observations are excluded from most project queries.

For each PSBP ID it:
  1. reads the observation id from the credits CSV (Source URL),
  2. fetches that observation and prints its captive flag, quality grade,
     license, taxon, and any traditional-project memberships,
  3. counts the project query two ways — as the audit does, and again with
     casual/captive INCLUDED — so a jump from 0 to N pinpoints the filter.
It also prints the project's own type and search filters.

Setup
-----
    pip3 install requests pandas

Run (from the sources folder)
-----------------------------
    python3 diagnose_missing_obs.py

Options
-------
    --credits PATH   credits csv (default: Plants_and_Wildlife_Photo_Credits.csv)
    --ids  LIST      comma-separated PSBP IDs (default: the 5 coverage-gap ones)
"""

import argparse
import re
import sys
import time

try:
    import requests
    import pandas as pd
except ImportError:
    sys.exit("Missing dependency. Run:  pip3 install requests pandas")

PROJECT_SLUG = "palma-sola-botanical-park"
API_BASE     = "https://api.inaturalist.org/v1"
PAUSE        = 1.0
UA           = "PSBP-obs-diagnostic/1.0 (Palma Sola Botanical Park)"
DEFAULT_IDS  = ["PSBP-00003", "PSBP-00023", "PSBP-00024", "PSBP-00032", "PSBP-00041"]


def get(session, url, params=None):
    for attempt in range(3):
        try:
            r = session.get(url, params=params, timeout=60)
            if r.status_code == 200:
                time.sleep(PAUSE)
                return r.json()
        except requests.RequestException:
            pass
        time.sleep(2 * (attempt + 1))
    return None


def count(session, **params):
    params["per_page"] = 0
    data = get(session, f"{API_BASE}/observations", params=params)
    return data.get("total_results", "?") if data else "ERR"


def obs_id_from_url(url):
    m = re.search(r"/observations/(\d+)", str(url))
    return m.group(1) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--credits", default="Plants_and_Wildlife_Photo_Credits.csv")
    ap.add_argument("--ids", default=",".join(DEFAULT_IDS))
    args = ap.parse_args()

    df = pd.read_csv(args.credits)
    want = [x.strip() for x in args.ids.split(",") if x.strip()]

    session = requests.Session()
    session.headers.update({"User-Agent": UA})

    # ---- project metadata: type + filters (captive? place? quality grade?) ----
    print("=" * 64)
    proj = get(session, f"{API_BASE}/projects/{PROJECT_SLUG}")
    if proj and proj.get("results"):
        p = proj["results"][0]
        print(f"Project: {p.get('title')}  (type: {p.get('project_type') or 'traditional'})")
        rules = p.get("search_parameters") or []
        if rules:
            print("Collection filters:")
            for r in rules:
                print(f"   {r.get('field')} = {r.get('value')}")
        else:
            print("No collection search_parameters (likely a traditional project — "
                  "observations must be added by hand).")
    else:
        print("Could not fetch project metadata.")
    print("=" * 64)

    for pid in want:
        rows = df[df["PSBP ID"].astype(str).str.strip() == pid]
        if rows.empty:
            print(f"\n{pid}: not in credits CSV.")
            continue
        row = rows.iloc[0]
        sci = str(row.get("Scientific Name", "")).strip()
        oid = obs_id_from_url(row.get("Source URL"))
        print(f"\n{pid}  {sci}  ({row.get('Common Name')})")
        if not oid:
            print("   no observation id in credits Source URL.")
            continue

        det = get(session, f"{API_BASE}/observations/{oid}")
        if not det or not det.get("results"):
            print(f"   observation {oid}: could not fetch.")
            continue
        o = det["results"][0]
        taxon = (o.get("taxon") or {})
        tid = taxon.get("id")
        captive = o.get("captive")
        grade = o.get("quality_grade")
        lic = o.get("license_code")
        trad = [po.get("project", {}).get("slug")
                for po in (o.get("project_observations") or [])]

        print(f"   obs {oid}: taxon {tid} ({taxon.get('name')})  "
              f"license={lic}  grade={grade}  captive={captive}")
        print(f"   traditional-project memberships: {trad or 'none'}")

        if tid:
            a = count(session, project_id=PROJECT_SLUG, taxon_id=tid)
            b = count(session, project_id=PROJECT_SLUG, taxon_id=tid, verifiable="any")
            c = count(session, project_id=PROJECT_SLUG, taxon_id=tid, captive="true", verifiable="any")
            print(f"   in project (as audit) ............... {a}")
            print(f"   in project + casual/captive included  {b}")
            print(f"   in project, captive-only ............ {c}")
            if a == 0 and (isinstance(b, int) and b > 0):
                print("   >> VERDICT: observation IS captured by the project once "
                      "casual/captive is included — the audit's filter was hiding it.")
            elif a == 0 and (isinstance(b, int) and b == 0):
                print("   >> VERDICT: not matched by the project query even with "
                      "casual included — likely the observation isn't in the "
                      "collection's place/filters, or the project is traditional "
                      "and it was never added.")

    print("\nDone.")


if __name__ == "__main__":
    main()
