# PSBP Field-Guide — Session Handoff (2026-06-11)

## STATUS
- **Built / live: 88 plants** (`Page Built = Yes`).
- **Remaining: 34.**
- Updated master (`PSBP_Master_Plant_Signage.xlsx`) and `tracker.xlsx` are in this output set — **file these to GitHub to start the next session from.**

## WHAT HAPPENED THIS SESSION
13 pages were produced/updated (all delivered as HTML in this output set):

**Newly built (11):** 00061 Yellow Walking Iris · 00062 Candelabra Bush · 00063 Pagoda Flower · 00064 Ixora Maui Yellow · 00065 Heavenly Bamboo · 00066 Lanceleaf Arrowhead · 00067 Madagascar Periwinkle · 00069 Myrtle Oak · 00070 Turk's Turban · 00072 Yellow Trumpet Flower · 00073 King's Mantle.

**Improved (already built; 2):** 00071 Ti Plant · 00074 Firebush.

### Notable corrections (accuracy)
- **00067 Madagascar Periwinkle** — origin was reversed in the master (said "Caribbean/Cuba, not Madagascar"). Corrected: it **is native to Madagascar**; naturalized in the Caribbean. Fixed in all 4 places. Added Eli Lilly serendipity discovery, Vinca→Catharanthus naming note, and the wild-decline conservation story.
- **00066 Lanceleaf Arrowhead** — leaves were wrongly called "strongly arrowhead-shaped (sagittate)." *Sagittaria lancifolia* is the **lance-leaved** species; corrected and reframed (the arrowhead-genus member that isn't arrowhead-shaped).
- **00074 Firebush** — Reproduction section was rendering **completely empty** (prose-format field the parser drops). Restructured into colon segments; all content restored.
- **Edibility badge bug** ("Not an edible plant" → wrongly read 🍴 Edible) fixed on **00063 Pagoda Flower** and **00073 King's Mantle** (→ ✅ Non-Toxic). Pattern: author edibility as "Not edible." not "Not an edible plant."
- **00063 Pagoda Flower** — Quick Hits wrongly listed King's Mantle as a *Clerodendrum* relative (it's *Thunbergia*, Acanthaceae). Replaced with Starburst Bush.

### FISC / invasive changes
- **00062 Candelabra Bush** — FISC corrected **Category II → I** (your confirmation). Plant was removed from front gate ~2025 (storm/removal); page published with a 📝 Notes management note.
- **00065 Heavenly Bamboo** — FISC Cat I confirmed; added Welcome Island field note (contained, no spread here).
- **00070 Turk's Turban** — reclassified **Green → Yellow / Watch List** (your field call: worst spreader in the park, offsets cross walkways ~20 yds). Badge now ⚠️ Watch List; story elevated to Quick Hits + 📝 Notes.

### Formatting standardization
- **All 9 prose-style plants standardized to structured Size/Growing boxes** (00065, 00066, 00068*, 00069, 00070, 00071, 00072, 00073, 00074). *(00068 Florida Strangler Fig not yet built — convert when built.)*
- Leaf **measurements** moved from Size into Reproduction → Leaves (scannability).
- Multiple **Alternate Names** fields cleaned from prose into proper chips; geeky synonym/nomenclature taxonomy moved to Origin/Internal Notes.

## OPEN ITEMS / PENDING
- **00067 Madagascar Periwinkle — IUCN status.** Conservation paragraph uses measured "threatened/declined" language. Confirm the current Red List category (Endangered? Critically Endangered?) to state it precisely. (Flagged in Internal Notes.)
- **00066 KML pin merge** — split duplicate (categorized pin + an "Unobserved / TOUGH TO GROW" copy). Merge in Google Earth (separate from the page).
- **Gone/removed plants this session** (seed for a future "what we lost" story): 00062 Candelabra (front gate, removed), 00063 Pagoda (storm loss, Welcome Island). Both published for now with placeholder/normal heroes.

## GENERATOR / MAINTENANCE-PASS WISHLIST
1. **Cultivar handling** — use **species cards** that list the park's cultivars (photo/content representative, not cultivar-exact). Do NOT append cultivar epithets to sci-names. (Decision made re: 00064 Ixora.)
2. **Edible-to-people / toxic-to-pets badge** — add nuance so a cultural/edible plant that is pet-toxic doesn't carry a blanket ☠️ Toxic skull. (Affects 00071 Ti Plant; currently shows ☠️.)
3. **Empty-Reproduction bug** — the segment parser drops prose-format Reproduction fields. **00050 Chenille Plant** still has this (prose format) and will render empty if built — fix its Reproduction field if/when that decommission candidate is revisited.
4. Carried over from prior brief: renamed-file deploy `git mv`/`git rm` (00049 Spath→Peace Lily; 00010 Geiger lowercase).

## DEPLOY MECHANICS (unchanged)
Drop regenerated pages into `plants/`, then:
```
cd /Users/fiona/Documents/GitHub/ReworkDemo/
python3 generate_plants_json.py
git add plants/ plants.json
git commit -m "..."
```
Push via GitHub Desktop. Photo-blocked plants excluded unless on a deployed placeholder.

## NEXT UP
Next unbuilt real plant in ID order: **PSBP-00076 Great Bougainvillea** (then 00077 Bengal Trumpet [Placeholder], 00078 Swamp Milkweed, 00081 Ball Moss, …). 00050 Chenille is a pending decommission decision.
