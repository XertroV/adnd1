# Batch 5 PHB/DMG source-first table citation manifest

Baseline commit: `679b15d1c580172e54314829c1c3c86dc78b65f3`; raw `dist/data.json` SHA-256: `47908c8ddc8b68c09e11f600ed0d0dc24b2a3749f8e3f452e245c7ee6635053b`.

Visually transcribed denominator: **182 rows across 5 tables** (before any row-to-item patch).

| Table | Printed page | PDF page | Rows |
|---|---:|---:|---:|
| Armor Class Table | 36 | 37 | 9 |
| Weight and Damage by Weapon Type | 37 | 38 | 50 |
| Hand Held Weapon Types: General Data and “To Hit” Adjustments | 38 | 39 | 44 |
| Hurled Weapons and Missiles | 38 | 39 | 15 |
| Appendix O: Encumbrance of Standard Items | 225 | 225 | 64 |

Full rows/transcriptions, source hashes, current row-region targets, exact crop bounds and unresolved dispositions are in the JSON manifest.

## Current context gaps

- PHB p.36 Armor Class table: complete image exists in `rules-armor-class`; current focus is a whole-image sentinel, so row-level highlighting still needs review.
- PHB p.37 weight/damage and PHB p.38 Hand Held: complete tables exist in Arrow/Long Sword excerpts only; they are not bound to all matched item owners.
- PHB p.38 missile table and DMG p.225 Appendix O: complete source tables were reviewed from authorized source clips; current public catalogs contain only partial row/table excerpts.
- PHB p.37 Jo Stick and PHB p.38 Jo Stick/Fist or Open Hand stay unassigned or uncertain. PHB p.37/38 Lance rows remain variant-uncertain against the generic site Lance item.
- DMG p.225 has `64` rows. Generic/variant rows without exact exposed item matches remain open; its figures are encumbrance gp-weight, not prices.
- Harpoon is outside these pages (UA p.26); do not treat it as missing from the PHB/DMG denominator.

No shared data or citation-contract file was edited. The JSON contains contract-shaped proposals for parent integration.
