#!/usr/bin/env python3
"""
fix_plant_footers.py
====================
Removes duplicate footer/script blocks from all plant HTML pages.
Run from the /plants/ folder or from the repo root.

Usage:
    python3 fix_plant_footers.py
"""
import os, re, glob

# Find plants folder
script_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(script_dir) == 'plants':
    plants_dir = script_dir
else:
    plants_dir = os.path.join(script_dir, 'plants')

files = sorted(glob.glob(os.path.join(plants_dir, 'PSBP-*.html')))
if not files:
    print(f"No PSBP-*.html files found in {plants_dir}")
    exit(1)

print(f"Found {len(files)} plant pages. Cleaning up duplicates...\n")

CLOSING = '''\n<a class="plant-float-back" href="../nature.html#plants">
  🌿 All Plants
</a>

<div id="footer-placeholder"></div>
<script src="../js/site.js"></script>
<script>
injectShared({ inatBar: false });
</script>
</body>
</html>'''

fixed = 0
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    before = html.count('footer-placeholder')

    # Strip everything from the first footer-placeholder onward
    # Then re-add one clean closing block
    cut = re.search(r'\n*<!--[^>]*iNaturalist[^>]*-->.*?<a class="plant-float-back".*?</a>\s*\n*<div id="footer-placeholder', html, re.DOTALL)
    if not cut:
        cut = re.search(r'\n*<a class="plant-float-back".*?</a>\s*\n*<div id="footer-placeholder', html, re.DOTALL)
    if not cut:
        cut = re.search(r'\n*<div id="footer-placeholder"', html, re.DOTALL)

    if cut:
        html = html[:cut.start()].rstrip() + CLOSING
    
    after = html.count('footer-placeholder')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

    if before != after:
        print(f"  ✓ {os.path.basename(path)} — {before} → {after} footer(s)")
        fixed += 1
    else:
        print(f"  · {os.path.basename(path)} — already clean ({after})")

print(f"\nDone. Fixed {fixed}/{len(files)} files.")
print("\nVerify with:")
print(f'  grep -c "footer-placeholder" {os.path.join(plants_dir, "PSBP-00002-Weeping-Bottlebrush.html")}')
print("Should show: 1")
