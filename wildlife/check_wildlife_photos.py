#!/usr/bin/env python3
"""
check_wildlife_photos.py
========================
Point this at your wildlife/ folder and it tells you which pages will show a
broken image once they're live — BEFORE you push.

Layout-agnostic: it reads whatever path each page actually uses (photos in the
same folder, or in a photos/ subfolder — either works) and checks the file is
really there, with the exact name.

Catches the three things that actually go wrong:
  1. MISSING   — the page asks for a photo that isn't there at all.
  2. CASE/NAME — a photo exists but the name differs (usually capitalization).
                 The sneaky one: macOS ignores case, so it looks fine on your Mac,
                 then 404s on GitHub Pages, which is case-SENSITIVE.
  3. ORPHANS   — image files that no page references (just FYI).

USAGE:
    python3 check_wildlife_photos.py                 # run inside wildlife/
    python3 check_wildlife_photos.py path/to/wildlife

No third-party packages. Exits non-zero if any page would break.
"""

import os, re, sys, argparse

IMG = re.compile(r'<img[^>]+src="([^"]+)"', re.I)

def listdir_lower(folder):
    m = {}
    if os.path.isdir(folder):
        for f in os.listdir(folder):
            if not f.startswith("."):
                m.setdefault(f.lower(), []).append(f)
    return m

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", nargs="?", default=".")
    root = os.path.abspath(ap.parse_args().folder)
    if not os.path.isdir(root):
        sys.exit(f"Folder not found: {root}")
    pages = sorted(f for f in os.listdir(root) if f.endswith(".html"))
    if not pages:
        sys.exit(f"No .html pages found in {root}")

    dir_cache = {}
    referenced = set()
    ok, missing, mismatch = [], [], []

    for page in pages:
        text = open(os.path.join(root, page), encoding="utf-8").read()
        srcs = [s for s in IMG.findall(text) if not s.lower().startswith(("http", "data:"))]
        if not srcs:
            missing.append((page, "(no local hero <img> found)"))
            continue
        for src in srcs:
            target = os.path.normpath(os.path.join(root, src))
            folder, name = os.path.split(target)
            referenced.add(target)
            if os.path.isfile(target):
                ok.append((page, src)); continue
            lower = dir_cache.setdefault(folder, listdir_lower(folder))
            if name.lower() in lower:
                mismatch.append((page, src, ", ".join(lower[name.lower()])))
            else:
                missing.append((page, src))

    all_imgs = set()
    for folder in {root, os.path.join(root, "photos")}:
        if os.path.isdir(folder):
            for f in os.listdir(folder):
                if f.lower().endswith((".jpg", ".jpeg", ".png")) and not f.startswith("placeholder-"):
                    all_imgs.add(os.path.normpath(os.path.join(folder, f)))
    orphans = sorted(os.path.relpath(p, root) for p in all_imgs - referenced)

    print(f"\nChecked {len(pages)} pages in {root}\n")
    print(f"  OK (photo present)        : {len(ok)}")
    print(f"  MISSING                   : {len(missing)}")
    print(f"  CASE / NAME MISMATCH      : {len(mismatch)}")
    print(f"  Orphan images (unused)    : {len(orphans)}")

    if missing:
        print("\n--- MISSING (page will show a broken image) ---")
        for item in missing:
            print(f"  {item[0]:<42} needs  {item[1]}")
    if mismatch:
        print("\n--- CASE / NAME MISMATCH (works on Mac, BREAKS on the live server) ---")
        for page, want, actual in mismatch:
            print(f"  {page}")
            print(f"      page asks for : {want}")
            print(f"      file on disk  : {actual}")
            print(f"      -> rename the file to exactly: {os.path.basename(want)}")
    if orphans:
        print("\n--- ORPHANS (present but no page uses them — just FYI) ---")
        for f in orphans: print(f"  {f}")

    problems = len(missing) + len(mismatch)
    if problems == 0:
        print("\nAll pages have their photo. Safe to push. \u2705"); sys.exit(0)
    print(f"\n{problems} page(s) would break. Fix the names/files above, then re-run. \u274c")
    sys.exit(1)

if __name__ == "__main__":
    main()
