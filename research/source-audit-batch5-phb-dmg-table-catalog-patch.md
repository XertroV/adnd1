# Batch 5 PHB/DMG table catalog repair proposal

This artifact provides source-row target region recipes and page citation proposals for five visually enumerated tables, without editing shared catalog data, central citation contracts, citation overrides, or review ledgers. It is bound to baseline commit `679b15d1c580172e54314829c1c3c86dc78b65f3` and `dist/data.json` SHA-256 `47908c8ddc8b68c09e11f600ed0d0dc24b2a3749f8e3f452e245c7ee6635053b`.

The bounded denominator is 182 printed rows across 5 tables. 156 confirmed row-to-item target bindings were reviewed; 53 lacked page references, deduped to 50 owner/page citation additions. 80 existing stable row regions were repaired in place and 76 new row regions were added across 90 catalogs. The 20 uncertain mappings and 21 unrepresented rows, including the non-equipment Fist/Open Hand row, remain open and do not count as mapping or citation passes.

| Source table | Confirmed rows with target | Confirmed bindings | Stable regions replaced | New row regions |
|---|---:|---:|---:|---:|
| batch5-phb36-armor-class | 9 | 18 | 9 | 9 |
| batch5-phb37-weapon-weight-damage | 46 | 46 | 27 | 19 |
| batch5-phb38-handheld | 39 | 39 | 10 | 29 |
| batch5-phb38-hurled | 15 | 15 | 9 | 6 |
| batch5-dmg225-encumbrance | 32 | 38 | 25 | 13 |

The JSON receipt records every catalog before/after hash, superseded region recipe and image hash, complete table-image SHA-256 required for each row target, focus rectangles, exact sourceTableId, page-reference additions, and field-binding candidates. Field-binding proposals do not promote semantic or extraction grades. The DMG p.225 explanation/exclusion-list crop is listed separately as optional companion context, not as a required table-image region. It begins mid-list at “material components (unless large and bulky),” so its preceding lead-in remains unavailable within this excerpt.

The same-page wrong-table Spear defect is documented from the 679 baseline. The old required region `phb-38-81fb44d169458fe2` is a 1142×24 Hand Held Spear crop (image SHA-256 `81fb44d169458fe206d33bfeba35ad0deede44f72ab6d0ff1f31d1323d6978ca`) and is not the Hurled Weapons and Missiles row. The corrected region `batch5-phb38-missile-phb-spear-015` is bound to table image SHA-256 `a3662691c2417e557f8530c84cda1c77df67d7140fd934aa4de7a013bdafad32`, with explicit sourceTableId. Page/book/hash and required-region presence alone would accept the wrong same-page table; root has added the actual 679 fixture and table-image detector.

Visual validation covered all six limited source images and temporary row-focus overlays. Structural replay checked 156 target recipes, 90 catalog hashes, table-image identities, explicit sourceTableIds, source identities, required row regions, 235 non-sentinel normalized rectangles, and DMG context separation; it reported 0 errors.

No commits or remote writes were made. Root must apply the proposed central citation contracts/page references and review-ledger supersession.
