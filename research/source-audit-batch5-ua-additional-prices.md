# UA additional-price rows: source-first audit

This audit normalizes the 15 previously discovered UA groups into **583 source-row records**, **583 GP monetary cells** (17 mundane purchase-cost cells and 566 magic-item sale/value cells), and **566 separate XP reference-value cells**. XP is not money and is not converted to GP. The original UA PDF SHA-256 is `e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4`. Each row has a stable row ID, source table/row identity, printed and PDF page, source-page image hash, table-crop bounds, and row-highlight bounds.

The pre-normalization raw transcript was preserved unchanged outside the repository at `/workspace/scratch/batch5-prices/ua-additional-raw-review.json` (SHA-256 `621ae0c3d5627296aaa7e17b8370b1215953de24bef45449428d694174999356`). The public JSON contains structured rows and compact evidence metadata only; it excludes full-page OCR, unrelated prose and crop pixels.

| Group | Source table or passage | Rows | GP monetary cells | XP reference cells |
|---|---|---:|---:|---:|
| ua-other-001 | Expanded armor/weapon costs | 17 | 17 | 0 |
| ua-other-002 | Potions III.A.1 and III.A.2 (GP Sale Value columns) | 54 | 54 | 54 |
| ua-other-003 | Rings III.C.1 and III.C.2 | 37 | 37 | 37 |
| ua-other-004 | Rods, Staves, Wands III.D.1 and III.D.2 | 53 | 53 | 53 |
| ua-other-005 | Miscellaneous Magic III.E.1–III.E.7 | 225 | 225 | 225 |
| ua-other-006 | Armor and Shields III.F.1 and III.F.2 | 52 | 52 | 52 |
| ua-other-007 | Swords III.G.1 and III.G.2 | 33 | 33 | 33 |
| ua-other-008 | Miscellaneous Weapons III.H.1 and III.H.2 | 75 | 75 | 75 |
| ua-other-009 | Staff-spear sale values | 6 | 6 | 6 |
| ua-other-010 | Golden Eggs of Desire | 5 | 5 | 5 |
| ua-other-011 | Scarab Versus Golems | 6 | 6 | 6 |
| ua-other-012 | Hornblade | 6 | 6 | 6 |
| ua-other-013 | Knife, Buckle | 4 | 4 | 4 |
| ua-other-014 | Magic Quarterstaff | 5 | 5 | 5 |
| ua-other-015 | Scimitar of Speed | 5 | 5 | 5 |

The seven broad treasure groups enumerate all table rows across columns and continuations: potion tables (54); ring tables (37); rods/staves/wands (53); miscellaneous magic E.1–E.7 (225); armor/shields (52); swords (33); miscellaneous weapons (75). The remaining groups enumerate the armor purchase table (17), item-specific tables (23), one prose value list (5), and the Scarab embedded table (6). Total: 583 rows.

Printed dashes and blank cells are typed as unavailable; conditional footnote values remain separate from the printed cells. Asterisked item-description pointers link to detailed values where present in this 15-group scope. The two H.2 pointers for Axe of Hurling and Dagger of Throwing have additional value formulas in item descriptions on printed p.105/PDF p.106; those description formulas are explicitly queued for the next bounded audit and are not assigned to the H.2 cells. Variable amounts are represented as ranges, alternatives or rate/quantity formulas. The row denominator includes pointer rows; continuation rows are enumerated once.

The H/H.2 locator remains a pinned before/after finding: the old inventory points to printed p.90/PDF p.91, while the original table is on printed p.89/PDF p.90. PDF p.91 contains potion-description material. The historical inventory is unchanged pending independent review.

The geometry regression fixture preserves the prior 583-row containment scan and its three actual crop failures. The table crops now include each full row boundary without clipping the focus: Banded on PDF p.76, the final E.1 Bowl row, and Bucknard’s Everfull Purse on PDF p.87. The Bucknard crop also includes its printed footnote and the following E.2 table heading/column labels. These boundaries were checked against the original page pixels. A strict zero-tolerance check now contains all 583 highlights (0 outside; 0 not assessable). The reusable validator test checks all current rows plus the three before/after regressions; containment does not approve highlight alignment.

The full relevant table or passage is referenced by its source-page hash and table crop bounds. Row highlights are unions of original PDF text-layer word rectangles, mapped to rendered page pixels. Pixel contents and row values were reviewed against the source; independent overlay geometry review remains pending. No private page or crop image is included.
