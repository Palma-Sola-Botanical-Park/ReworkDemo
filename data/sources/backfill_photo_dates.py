#!/usr/bin/env python3
"""
backfill_photo_dates.py
=======================
ONE-TIME enrichment of photo_credits.json. For every photo that came from an
iNaturalist observation, it re-hits the iNat API once per observation and adds:

  - photographer_name : the observer's REAL name (user.name) when they set one,
                        else their handle (user.login). "Maria Alvarez", not
                        "mariaaz623". The existing `photographer` (handle) is
                        left untouched — it's still the matching/dedup key.
  - observed_on       : date the photo was taken          (YYYY-MM-DD)
  - shared_on         : date the observation was uploaded  (YYYY-MM-DD)
  - credit_line       : REGENERATED to use the real name + license, in one
                        consistent format (normalizes the two styles currently
                        in the file). Only rewritten when we got a real name.

NON-DESTRUCTIVE: reads photo_credits.json, writes photo_credits.enriched.json.
Your original is never touched. Review/diff the enriched file, then rename it
to photo_credits.json when you're happy.

RESUMABLE: every observation we fetch is cached in .obs_cache.json. Re-running
(after an interrupt, or next month) skips anything already cached and only
calls the API for observations it hasn't seen.

USAGE
-----
  # Safe peek — fetch 5 observations, print what WOULD be written, write nothing:
  python3 backfill_photo_dates.py --dry-run --limit 5

  # Real run, all observations:
  python3 backfill_photo_dates.py

  # Re-fill even records that already have the fields:
  python3 backfill_photo_dates.py --force

OBSCURED SPECIES (Buccaneer Palm, Coontie, Mahogany): the public API may coarsen
observed_on to the month. Set INAT_TOKEN in your environment to fetch precise
data for your own / project-trusted observations. Optional; the script runs fine
without it (those few just get whatever the public API returns).
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
PHOTO_CREDITS_JSON = "photo_credits.json"
OUTPUT_JSON        = "photo_credits.enriched.json"
CACHE_JSON         = ".obs_cache.json"

API_DELAY = 1.0   # seconds between API calls (iNat asks for <= 60/min)

# Optional: hand-fix display names for contributors who never set an iNat name
# but whom you know. Applied AFTER the API name, so it always wins. Keyed by
# handle (lowercase). Leave empty to rely purely on iNat's user.name.
NAME_OVERRIDES = {
    # "robcarr52": "Rob Carr",
}

OBS_RE = re.compile(r"observations/(\d+)")


# ---------------------------------------------------------------------------
# PURE HELPERS (no network — these are what we unit-test offline)
# ---------------------------------------------------------------------------

def resolve_obs_id(record):
    """Return the iNat observation id for a record, or None if it isn't an
    iNat-sourced photo. Prefers the explicit field, falls back to source_url."""
    oid = record.get("observation_id")
    if oid:
        return str(oid).strip()
    m = OBS_RE.search(record.get("source_url") or "")
    return m.group(1) if m else None


def display_name(login, name):
    """Real name when present, else the handle. NAME_OVERRIDES wins over both."""
    ov = NAME_OVERRIDES.get((login or "").lower())
    if ov:
        return ov
    name = (name or "").strip()
    return name if name else (login or "")


def build_credit_line(name, license_code):
    """One consistent format: '© Name (LICENSE), via iNaturalist'."""
    lic = (license_code or "").strip()
    if lic and lic.lower() != "nan":
        return f"© {name} ({lic.upper()}), via iNaturalist"
    return f"© {name}, via iNaturalist"


def apply_meta(record, meta, force=False, rewrite_credit=True):
    """Patch a record in place from an observation-meta dict. Returns the list
    of field names actually changed (so the run can be summarized)."""
    changed = []

    def set_if(field, value):
        if value in (None, ""):
            return
        if force or not record.get(field):
            if record.get(field) != value:
                record[field] = value
                changed.append(field)

    name = display_name(meta.get("login"), meta.get("name"))
    set_if("photographer_name", name)
    set_if("observed_on", meta.get("observed_on"))
    set_if("shared_on", meta.get("shared_on"))

    # Regenerate credit_line only when we actually have a real display name.
    if rewrite_credit and name:
        new_line = build_credit_line(name, record.get("license"))
        if record.get("credit_line") != new_line:
            record["credit_line"] = new_line
            if "credit_line" not in changed:
                changed.append("credit_line")
    return changed


# ---------------------------------------------------------------------------
# NETWORK
# ---------------------------------------------------------------------------

def inat_get(url):
    headers = {
        "Accept": "application/json",
        "User-Agent": "PSBP-PhotoBackfill/1.0 (palmasolabp.org)",
    }
    token = os.environ.get("INAT_TOKEN")
    if token:
        headers["Authorization"] = token
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code} for {url}")
        return None
    except Exception as e:
        print(f"    request failed: {e}")
        return None


def fetch_obs_meta(obs_id):
    """Return {login, name, observed_on, shared_on} for an observation, or None."""
    data = inat_get(f"https://api.inaturalist.org/v1/observations/{obs_id}")
    if not data or not data.get("results"):
        return None
    obs = data["results"][0]
    user = obs.get("user") or {}
    observed_on = obs.get("observed_on") or (obs.get("time_observed_at") or "")[:10] or None
    created_at = (obs.get("created_at") or "")[:10] or None
    return {
        "login": user.get("login") or "",
        "name": (user.get("name") or "").strip(),
        "observed_on": observed_on,
        "shared_on": created_at,
    }


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Backfill names + dates into photo_credits.json")
    ap.add_argument("--dry-run", action="store_true", help="fetch + preview, write nothing")
    ap.add_argument("--limit", type=int, default=0, help="only process the first N observations")
    ap.add_argument("--force", action="store_true", help="overwrite fields that are already set")
    ap.add_argument("--delay", type=float, default=API_DELAY, help="seconds between API calls")
    ap.add_argument("--no-rewrite-credit", action="store_true", help="leave credit_line as-is")
    args = ap.parse_args()

    pc_data = json.load(open(PHOTO_CREDITS_JSON, encoding="utf-8"))
    photos = pc_data["photos"]

    # Group record indices by observation id.
    obs_to_idx = {}
    no_obs = 0
    for i, rec in enumerate(photos):
        oid = resolve_obs_id(rec)
        if oid:
            obs_to_idx.setdefault(oid, []).append(i)
        else:
            no_obs += 1

    # Cache (resume / monthly re-run support).
    cache = {}
    if os.path.exists(CACHE_JSON):
        try:
            cache = json.load(open(CACHE_JSON, encoding="utf-8"))
        except Exception:
            cache = {}

    obs_ids = sorted(obs_to_idx, key=int)
    if args.limit:
        obs_ids = obs_ids[:args.limit]

    print("=" * 68)
    print(f"photo_credits backfill — {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"  photos in registry:        {len(photos)}")
    print(f"  resolvable to an obs:      {len(photos) - no_obs}")
    print(f"  not iNat-sourced (skip):   {no_obs}")
    print(f"  unique observations:       {len(obs_to_idx)}"
          f"{'  (limited to %d)' % len(obs_ids) if args.limit else ''}")
    print(f"  already cached:            {sum(1 for o in obs_ids if o in cache)}")
    print("=" * 68)

    fetched = failed = 0
    field_counts = {"photographer_name": 0, "observed_on": 0, "shared_on": 0, "credit_line": 0}
    records_touched = set()

    try:
        for n, oid in enumerate(obs_ids, 1):
            meta = cache.get(oid)
            if meta is None:
                print(f"[{n}/{len(obs_ids)}] obs #{oid} — fetching...", end=" ")
                meta = fetch_obs_meta(oid)
                time.sleep(args.delay)
                if meta is None:
                    failed += 1
                    print("FAILED (kept as-is)")
                    continue
                cache[oid] = meta
                fetched += 1
                print(f"{display_name(meta['login'], meta['name'])} | "
                      f"taken {meta['observed_on']} | shared {meta['shared_on']}")

            for idx in obs_to_idx[oid]:
                changed = apply_meta(photos[idx], meta,
                                     force=args.force,
                                     rewrite_credit=not args.no_rewrite_credit)
                if changed:
                    records_touched.add(idx)
                    for f in changed:
                        field_counts[f] = field_counts.get(f, 0) + 1

            # checkpoint the cache every 25 fetches so an interrupt loses little
            if fetched and fetched % 25 == 0 and not args.dry_run:
                json.dump(cache, open(CACHE_JSON, "w", encoding="utf-8"), indent=2)
    finally:
        if not args.dry_run:
            json.dump(cache, open(CACHE_JSON, "w", encoding="utf-8"), indent=2)

    print("=" * 68)
    print(f"  observations fetched:      {fetched}")
    print(f"  observations failed:       {failed}")
    print(f"  records changed:           {len(records_touched)}")
    for f, c in field_counts.items():
        print(f"    {f:20s} set on {c}")
    print("=" * 68)

    if args.dry_run:
        print("DRY RUN — nothing written. Sample of patched records:")
        for idx in list(records_touched)[:5]:
            r = photos[idx]
            print(f"  {r.get('psbp_id')} {r.get('common_name')!r}: "
                  f"name={r.get('photographer_name')!r} "
                  f"taken={r.get('observed_on')} shared={r.get('shared_on')}")
            print(f"      credit: {r.get('credit_line')}")
        return

    pc_data["photos"] = photos
    pc_data.setdefault("meta", {})["schema_version"] = "1.1"
    json.dump(pc_data, open(OUTPUT_JSON, "w", encoding="utf-8"),
              indent=2, ensure_ascii=False)
    print(f"Wrote {OUTPUT_JSON} (original untouched).")
    print("Review / diff it, then rename to photo_credits.json when happy:")
    print(f"  mv {OUTPUT_JSON} {PHOTO_CREDITS_JSON}")


if __name__ == "__main__":
    main()
