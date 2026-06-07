#!/usr/bin/env python3
"""
restyle_plants.py
=================
Converts all original PSBP plant pages to the new site-integrated template.

USAGE
-----
1. Place this script in the SAME folder as your plant HTML files
   (i.e. inside the /plants/ directory of your repo).

2. Run:
       python3 restyle_plants.py

3. It writes restyled files to a subfolder called  output/
   inside the same directory.  Review them, then copy them
   back over the originals when you're happy.

WHAT IT DOES
------------
For each  PSBP-*.html  file it finds:
  - Strips the original <head> and replaces it with the new one
    (site.css link + plant.css inline styles)
  - Replaces the old logo-bar header with <div id="nav-placeholder">
  - Renames CSS classes to the new plant-prefixed versions
  - Removes the outbound iNaturalist link
  - Replaces the old "See All Plants" link with "Explore More Plants"
    pointing to ../nature.html
  - Adds the footer placeholder, site.js script, and injectShared() call
  - Leaves all actual content (text, images, badges, sections) untouched
"""

import os
import re
import glob

# ── Inline CSS to inject into every plant page ───────────────────────────────
PLANT_CSS = """
  /* ── Plant page layout ─────────────────────────────────── */
  .plant-wrap {
    max-width: 430px;
    margin: 2rem auto;
    background: #e8e3d8;
    min-height: 80vh;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 32px rgba(26,46,26,0.13);
  }
  /* On phone, fill the screen naturally */
  @media (max-width: 480px) {
    .plant-wrap {
      margin: 0;
      border-radius: 0;
      box-shadow: none;
      min-height: 100vh;
    }
  }

  /* ── Hero ──────────────────────────────────────────────── */
  .plant-hero { position: relative; height: 310px; overflow: hidden; }
  .plant-hero img { width:100%;height:100%;object-fit:cover;object-position:center 35%;display:block; }
  .plant-hero-overlay {
    position: absolute; bottom:0; left:0; right:0;
    background: linear-gradient(transparent 0%, rgba(10,25,10,0.70) 40%, rgba(10,25,10,0.92) 100%);
    padding: 60px 18px 0;
  }
  .plant-hero-category { font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold-light,#d4aa40);margin-bottom:5px; }
  .plant-hero-name { font-family:'Playfair Display',Georgia,serif;font-size:38px;font-weight:700;color:#fff;line-height:1.05;margin-bottom:12px; }

  /* ── Scientific band ───────────────────────────────────── */
  .plant-sci-band { background:var(--moss,#2d4a2d);padding:11px 18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:2px solid var(--gold,#b8942a); }
  .plant-sci-name { font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:19px;color:#fff;flex:1;text-shadow:0 1px 3px rgba(0,0,0,0.3); }
  .plant-family-tag { font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--forest,#1a2e1a);background:var(--gold-light,#d4aa40);padding:5px 12px;border-radius:4px;text-decoration:none;transition:background .2s; }
  .plant-family-tag:hover { background:#c49a20; }

  /* ── Content area ──────────────────────────────────────── */
  .plant-content { padding: 12px 0 48px; }

  /* ── Status badges ─────────────────────────────────────── */
  .plant-status-row { display:flex;gap:7px;padding:12px 14px;flex-wrap:wrap;background:var(--cream,#f5f0e8);border-bottom:1px solid rgba(90,122,74,0.15); }
  .badge { font-size:12px;font-weight:700;padding:5px 13px;border-radius:20px;letter-spacing:0.3px; }
  .badge-neutral  { background:var(--parchment,#e8dfc8);color:var(--text-mid,#2e2e1e);border:1.5px solid rgba(90,122,74,0.3); }
  .badge-green    { background:#d8eed8;color:#1a4a1a;border:1.5px solid rgba(45,74,45,0.35); }
  .badge-native   { background:#d0e8ff;color:#0a2a5a;border:1.5px solid rgba(10,42,90,0.3); }
  .badge-safe     { background:var(--safe-light,#edf7ed);color:var(--safe-dark,#1a5c1a);border:1.5px solid rgba(26,92,26,0.3); }
  .badge-warn     { background:#fff3d8;color:#6a3a00;border:1.5px solid rgba(180,120,0,0.3); }
  .badge-danger   { background:var(--danger-light,#fff0f0);color:var(--danger,#8b2020);border:1.5px solid rgba(139,32,32,0.3); }

  /* ── Cards / sections ──────────────────────────────────── */
  .plant-section { margin:12px 12px 0;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(26,46,26,0.10);border:1px solid rgba(90,122,74,0.1); }
  .plant-section-header { background:var(--moss,#2d4a2d);padding:12px 16px;display:flex;align-items:center;gap:10px; }
  .plant-section-icon  { font-size:18px;line-height:1; }
  .plant-section-title { font-size:12px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#fff; }
  .plant-section-body  { padding:16px; }
  .plant-section-body p { font-size:17px;line-height:1.7;color:var(--text-mid,#2e2e1e); }
  .plant-section-body p + p { margin-top:10px; }

  /* ── Quick hits ────────────────────────────────────────── */
  .quick-hits-list { list-style:none;padding:14px 16px; }
  .quick-hits-list li { font-size:17px;line-height:1.6;color:var(--text-mid,#2e2e1e);padding:10px 0 10px 22px;position:relative;border-bottom:1px solid rgba(90,122,74,0.1); }
  .quick-hits-list li:last-child { border-bottom:none; }
  .quick-hits-list li::before { content:'';position:absolute;left:0;top:19px;width:8px;height:8px;background:var(--gold,#b8942a);border-radius:50%; }

  /* ── More info (dark card) ─────────────────────────────── */
  .plant-more-info { margin:12px 12px 0;background:var(--forest,#1a2e1a);border-radius:10px;overflow:hidden;box-shadow:0 3px 12px rgba(26,46,26,0.25); }
  .plant-more-info .plant-section-header { background:rgba(255,255,255,0.07);border-bottom:2px solid var(--gold,#b8942a); }
  .plant-more-info .plant-section-title  { color:var(--gold-light,#d4aa40); }
  .more-info-list { list-style:none;padding:0; }
  .more-info-list li { font-size:17px;line-height:1.7;color:rgba(245,240,232,0.92);padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08); }
  .more-info-list li:last-child { border-bottom:none; }

  /* ── Toxicity / safety cards ───────────────────────────── */
  .plant-toxic-section   { margin:12px 12px 0;background:var(--danger-light,#fff0f0);border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(26,46,26,0.10);border:1.5px solid rgba(139,32,32,0.25); }
  .plant-toxic-section   .plant-section-header { background:var(--danger,#8b2020); }
  .plant-toxic-section   .plant-section-body p { font-size:17px;line-height:1.7;color:#4a0a0a;font-weight:500; }
  .plant-safe-section    { margin:12px 12px 0;background:var(--safe-light,#edf7ed);border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(26,46,26,0.10);border:1.5px solid rgba(26,92,26,0.2); }
  .plant-safe-section    .plant-section-header { background:var(--safe-dark,#1a5c1a); }
  .plant-safe-section    .plant-section-body p { font-size:17px;line-height:1.7;color:#0a2a0a; }
  .plant-caution-section { margin:12px 12px 0;background:#fffbf0;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(26,46,26,0.10);border:1.5px solid rgba(180,120,0,0.25); }
  .plant-caution-section .plant-section-header { background:#7a5000; }
  .plant-caution-section .plant-section-body p { font-size:17px;line-height:1.7;color:#3a2000; }

  /* ── Data grid ─────────────────────────────────────────── */
  .data-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px; }
  .data-item { background:var(--parchment,#e8dfc8);border-radius:8px;padding:11px 13px;border:1px solid rgba(90,122,74,0.15); }
  .data-label { font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--sage,#4a6a3a);margin-bottom:4px; }
  .data-value { font-size:15px;color:var(--text-dark,#1a1a14);font-weight:600;line-height:1.4; }
  .data-item.full-width { grid-column:1/-1; }

  /* ── Reproduction list ─────────────────────────────────── */
  .repro-list { padding:14px 16px; }
  .repro-item { padding:10px 0;border-bottom:1px solid rgba(90,122,74,0.1); }
  .repro-item:last-child { border-bottom:none;padding-bottom:0; }
  .repro-label { font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sage,#4a6a3a);margin-bottom:4px; }
  .repro-item p { font-size:16px;line-height:1.65;color:var(--text-mid,#2e2e1e); }

  /* ── Also known as / wildlife tags ────────────────────── */
  .alias-list { display:flex;flex-wrap:wrap;gap:8px;padding:14px 16px; }
  .alias-tag { background:var(--parchment,#e8dfc8);border:1.5px solid rgba(90,122,74,0.25);border-radius:6px;padding:6px 14px;font-size:15px;color:var(--text-mid,#2e2e1e);font-style:italic;font-weight:500; }
  .wildlife-tags { display:flex;flex-wrap:wrap;gap:8px;margin-top:14px; }
  .wildlife-tag { background:rgba(74,106,58,0.12);border:1.5px solid rgba(74,106,58,0.3);border-radius:6px;padding:6px 13px;font-size:14px;color:var(--moss,#2d4a2d);font-weight:600; }

  /* ── Back to plants link ───────────────────────────────── */
  .all-plants-link { margin:10px 12px 0;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--parchment,#e8dfc8);border-radius:10px;padding:14px 18px;text-decoration:none;border:1.5px solid rgba(90,122,74,0.25);color:var(--moss,#2d4a2d);font-weight:700;font-size:15px;transition:background 0.4s ease; }
  .all-plants-link:hover { background:var(--cream,#f5f0e8); }

  /* ── Fade-in animation ─────────────────────────────────── */
  .plant-section,.plant-more-info,.plant-toxic-section,.plant-safe-section,.plant-caution-section,.all-plants-link { animation:plantFadeUp 0.6s ease both; }
  .plant-section:nth-child(1)  { animation-delay:0.05s; }
  .plant-section:nth-child(2)  { animation-delay:0.10s; }
  .plant-section:nth-child(3)  { animation-delay:0.15s; }
  .plant-section:nth-child(4)  { animation-delay:0.20s; }
  .plant-section:nth-child(5)  { animation-delay:0.25s; }
  .plant-section:nth-child(6)  { animation-delay:0.30s; }
  .plant-section:nth-child(7)  { animation-delay:0.35s; }
  .plant-more-info             { animation-delay:0.22s; }
  .plant-safe-section,.plant-toxic-section,.plant-caution-section { animation-delay:0.38s; }
  .all-plants-link             { animation-delay:0.42s; }
  @keyframes plantFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @media (prefers-reduced-motion:reduce) {
    .plant-section,.plant-more-info,.plant-toxic-section,.plant-safe-section,.plant-caution-section,.all-plants-link { animation:none; }
  }
"""

# ── New <head> template ───────────────────────────────────────────────────────
HEAD_TEMPLATE = """<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="stylesheet" href="../css/site.css">
<style>{css}</style>
</head>"""

# ── Closing template (footer + scripts) ──────────────────────────────────────
CLOSING = """
<div id="footer-placeholder"></div>
<script src="../js/site.js"></script>
<script>
injectShared({ inatBar: false });
</script>
</body>
</html>"""


def restyle(html: str) -> str:
    # 1. Extract <title>
    title_match = re.search(r'<title>(.*?)</title>', html, re.DOTALL)
    title = title_match.group(1).strip() if title_match else 'Plant · Palma Sola Botanical Park'

    # 2. Extract everything inside <body>...</body>
    body_match = re.search(r'<body>(.*?)</body>', html, re.DOTALL)
    if not body_match:
        print("  WARNING: no <body> tag found, skipping")
        return html
    body = body_match.group(1)

    # 3. Remove the old <header> block (logo bar)
    body = re.sub(r'<header[^>]*>.*?</header>', '', body, flags=re.DOTALL)

    # 4. Remove the old <footer> block
    body = re.sub(r'<footer[^>]*>.*?</footer>', '', body, flags=re.DOTALL)

    # 5. Remove the outbound iNaturalist link entirely
    body = re.sub(r'<a\s+class="inat-link"[^>]*>.*?</a>', '', body, flags=re.DOTALL)

    # 6. Replace "See All Plants" link with "Explore More Plants"
    body = re.sub(
        r'<a\s+class="all-plants-link"[^>]*>.*?</a>',
        '<a class="all-plants-link" href="../nature.html">🌿 Explore More Plants</a>',
        body, flags=re.DOTALL
    )

    # 7. Rename CSS classes: old → new
    class_map = {
        'class="hero"':              'class="plant-hero"',
        'class="hero-overlay"':      'class="plant-hero-overlay"',
        'class="hero-category"':     'class="plant-hero-category"',
        'class="hero-common-name"':  'class="plant-hero-name"',
        'class="scientific-band"':   'class="plant-sci-band"',
        'class="scientific-name"':   'class="plant-sci-name"',
        'class="family-tag"':        'class="plant-family-tag"',
        'class="content"':           'class="plant-content"',
        'class="status-row"':        'class="plant-status-row"',
        'class="section"':           'class="plant-section"',
        'class="more-info-section"': 'class="plant-more-info"',
        'class="toxic-section"':     'class="plant-toxic-section"',
        'class="safe-section"':      'class="plant-safe-section"',
        'class="caution-section"':   'class="plant-caution-section"',
        'class="section-header"':    'class="plant-section-header"',
        'class="section-icon"':      'class="plant-section-icon"',
        'class="section-title"':     'class="plant-section-title"',
        'class="section-body"':      'class="plant-section-body"',
    }
    for old, new in class_map.items():
        body = body.replace(old, new)

    # 8. Convert family tag span into a link to nature.html?family=FAMILYNAME
    body = re.sub(
        r'<span class="plant-family-tag">([^<]+)</span>',
        lambda m: f'<a class="plant-family-tag" href="../nature.html?family={m.group(1).strip()}">{m.group(1)}</a>',
        body
    )

    # 9. Wrap body content in .plant-wrap if not already present
    body = body.strip()
    if 'class="plant-wrap"' not in body:
        body = f'<div class="plant-wrap">\n{body}\n</div><!-- /.plant-wrap -->'

    # 9. Build final document
    head = HEAD_TEMPLATE.format(title=title, css=PLANT_CSS)
    doc = f"""<!DOCTYPE html>
<html lang="en">
{head}
<body>
<div id="nav-placeholder"></div>

{body}
{CLOSING}"""

    return doc


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Look for PSBP files — could be in same dir or in plants/ subfolder
    pattern = os.path.join(script_dir, 'PSBP-*.html')
    files = sorted(glob.glob(pattern))

    # If not found locally, try plants/ subfolder
    if not files:
        plants_dir = os.path.join(script_dir, 'plants')
        pattern = os.path.join(plants_dir, 'PSBP-*.html')
        files = sorted(glob.glob(pattern))
        if files:
            script_dir = plants_dir

    if not files:
        print("No PSBP-*.html files found.")
        print(f"Looked in: {script_dir} and {os.path.join(script_dir, 'plants')}")
        return

    out_dir = os.path.join(script_dir, 'output')
    os.makedirs(out_dir, exist_ok=True)

    print(f"Found {len(files)} plant pages. Writing restyled versions to: {out_dir}/\n")

    ok = 0
    for path in files:
        fname = os.path.basename(path)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                html = f.read()
            result = restyle(html)
            out_path = os.path.join(out_dir, fname)
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(result)
            print(f"  ✓ {fname}")
            ok += 1
        except Exception as e:
            print(f"  ✗ {fname}  ERROR: {e}")

    print(f"\nDone. {ok}/{len(files)} files converted.")
    print(f"\nNext steps:")
    print(f"  1. Open a few files from {out_dir}/ and spot-check them")
    print(f"  2. When happy, copy them back over the originals:")
    print(f"       cp output/*.html .")
    print(f"  3. Commit and push to GitHub")


if __name__ == '__main__':
    main()
