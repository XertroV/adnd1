# Remaining batches browser review

Local review against `http://127.0.0.1:8767` on 2026-11-06. Browser tests use the assembled site and supplied crop catalogs; screenshots and JSON reports are local test artifacts. They do not validate unsupplied source pixels.

| Test | Result | Accessibility |
| --- | --- | --- |
| `remaining-batches-browser.cjs` | 631/631 | Four axe scans, zero violations |
| `batch2-independent-browser.cjs` | 311/311 | Four axe scans, zero violations |
| `gear-matrix-browser.cjs` | 66/66 | Four axe scans, zero violations |
| `attribute-layout-browser.cjs` | 120/120; 1,452 fidelity cases | Five axe scans, zero violations |
| `source-viewer.browser.mjs` | 44/44 | Generated PDF rendering and mapping |

No uncaught browser errors. The new test visits all 20 actual equipment catalogs at each of 320, 390, 491 and 1440 CSS pixels. It checks all 76 item-scoped regions, image dimensions, normalized focus rectangles, checked captions, scoped region choices and restored focus. It exercises equipment aliases, arrow prices and package quantities, silver-arrow separation, the Atlatl qualifier and Aklys asterisk, and one canonical rate/range pair per bow or crossbow with applicable corroborating references retained. The PHB p.39 crossbow reference falls back to the private source viewer, while the earlier UA p.26 axe fallback and same-page isolation regressions remain covered.

The original browser tests were updated for 88 equipment entries, 59 known prices, 29 unknown prices, and 56 unique / 76 scoped checked regions in seven images. The generic crossbow search still returns three entries. A previously uncatalogued-crossbow check now uses uncatalogued Partisan. Caption comparisons format adjustment arrays as displayed. All browsers close in `finally` blocks.

After enabling MM and MM2 in the viewer, actual spell chips for Aerial Servant, Animate Dead Monsters and Freshen opened the precise cited page in the private PDF path, with focus restored on close. Generated, original test PDFs then verified actual page rendering for MM 6 and 112 and MM2 83, 84, 91, 92, 131 and 160, including MM2's displaced p.83. The viewer rejected 112-page MM and 160-page MM2 fixtures, accepted the 113- and 161-page fixtures, and kept each selected book separate. These fixtures contain only synthetic page labels.
