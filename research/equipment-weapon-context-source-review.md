# Equipment geometry calibration receipt — v2

This supersedes the geometry proposals in receipt v1 after full-page review. It is still a **read-only calibration**; the parent repair gate remains closed. No catalog or crop was edited.

## Correction history

Receipt v1 is preserved unchanged at `/tmp/adnd1-geom-review/receipt.md` (SHA-256 `067105b795563d5fa0bfae4e71e87e359ea64bf95779bea3cf6024adfb3147fd`) and `/tmp/adnd1-geom-review/receipt.json` (SHA-256 `fc9826eb7cd933e1a2f5c55bfe5e111e7db82965bbebe143aae83be55e13be4e`). It contained these calibration errors:

- Its PHB printed p.38/PDF39 Sword, Long focus `[10.8,420,449,429.2]` stopped before AC 8, AC 9, and AC 10. The source word box for AC 10 `+2` is `[534.5,421.14,544.45,429.89]`; pixel review confirms the preceding focus covered only AC 2–7.
- Its PHB printed p.35/PDF36 normal-arrow price rectangles ended at x=424, before the terminal currency punctuation. Original-page ink extends to x=424.833.
- It omitted the PHB printed p.37/PDF38 Sword, Long weight/damage row.
- It named the PHB p.37 table “Weapon Types, General Data…”; the source heading is **“WEIGHT AND DAMAGE BY WEAPON TYPE.”** The distinct “Hurled Weapons and Missiles” table is on printed p.38/PDF39, not p.37.
- It requested PHB p.37 crop x1=580 although the PDF page ends at x=579.599304 points. PyMuPDF clipped that request at the page edge. The PNG is unchanged, but the effective clipped geometry must be used for normalization.
- The UA p.26 Aklys stats rectangle extended into the following Atlatl row; its bottom is corrected from y=81 to y=78.0. The UA p.26 Aklys price focus is extended to y=116.8 to retain the measured currency ink. The UA p.27 Sword, Long focus is moved down to y=585.5 so it no longer overlaps the preceding Sword, Khopesh row.

The structured corrected bounds, per-field boxes and calibration tests are in [`research/geometry-focus-calibration.json`](/workspace/adnd1/research/geometry-focus-calibration.json) and [`tests/geometry-proposal-focus.test.mjs`](/workspace/adnd1/tests/geometry-proposal-focus.test.mjs).

## Corrected row-focus bounds

Every rectangle below is **absolute source-PDF points** `[x0,y0,x1,y1]`, unrotated page coordinates with top-left origin. Focuses are checked against the actual context crop, then normalized relative to that crop for `focusCoversEvidence`. Full original page overlays in `/tmp/adnd1-geom-review/overlays-v2/` show red context boundaries and green focuses.

| Source and field | Corrected focus bounds | Pixel-reviewed meaning |
|---|---|---|
| PHB printed p.35/PDF36 normal arrow, single | `[306.8,347.4,426.3,356.3]` | Arrow, normal, single — 2 s.p. each. Includes full label and currency punctuation. |
| PHB printed p.35/PDF36 normal arrow, dozen | `[306.8,356.2,426.3,365.15]` | Arrow, normal, dozen — 1 g.p. per dozen. Kept distinct from the single-arrow and adjacent silver-arrow rows. |
| PHB printed p.35/PDF36 Sword, Long price | `[450,545.6,574,554.8]` | “Sword, long & scabbard” — 15 g.p.; includes the scabbard. Current bounds already contain all visible label/value/currency ink with margin. |
| PHB printed p.37/PDF38 Arrow weight/damage | `[24.5,214.6,360,224.1]` | Approximate weight 2 gold pieces of weight; damage 1–6 for S/M and 1–6 for L. The 2 is weight, not price. |
| PHB printed p.37/PDF38 Sword, Long weight/damage | `[25.3,620.8,356,630.9]` | Approximate weight 60 gold pieces of weight; damage 1–8 for S/M and 1–12 for L. Newly recorded ninth case. |
| PHB printed p.38/PDF39 Sword, Long general data | `[9,419.8,547,429.5]` | c.3½ ft. length; 3 ft. space; speed 5; AC 2–10 `−2, −1, 0, 0, 0, 0, 0, +1, +2`. Corrected span includes AC 8–10 through the final `+2` with raster margin. |
| UA printed p.26/PDF27 Aklys purchase price | `[16,106.2,140,116.8]` | 2 gp purchase price; distinct from the stats row. |
| UA printed p.26/PDF27 Aklys weight/damage | `[299,69.9,539,78.0]` | Weight 35 gold pieces; S/M damage 1–6; L damage 1–3. Bottom now ends before Atlatl. |
| UA printed p.27/PDF28 Sword, Long general data | `[14.5,585.5,558,595]` | c.3½ ft. length; 3 ft. space; speed 5; AC 0–10 `−4, −3, −2, −1, 0, 0, 0, 0, +1, +1, +2`. Focus sits between neighboring row ink. |

The UA p.26 Aklys row has no footnote marker. The printed p.26 table points to notes on the facing p.27, which is retained as contextual material, but no numbered p.27 footnote is assigned to Aklys from adjacency alone. The p.27 General Note is global table context, not evidence for Aklys’s price, weight, or damage. Footnote 5 (“Treat this weapon as a long sword if it is used one-handed”) is attached to Sword, Bastard, not Sword, Long.

## Crop geometry and scope corrections

The crop rectangles share the same source-PDF point convention as the focus bounds. PHB p.37 requested `[23,177,580,745]` but its effective crop is `[23,177,579.599304,745]`, because the page width is 579.599304 points. Its candidate PNG remains 1114 × 1136 pixels with unchanged SHA-256 `a0447e9e609ad1191beda38a39a6f3673a0fb11bbfd72472f3f21df7f8445a31`; nominal 2 px/pt plus outward rounding yields those dimensions. The corrected record stores both requested and effective bounds, and tests reject the out-of-page request as normalized geometry.

The PHB p.37 crop is the complete **Weight and Damage by Weapon Type** table, with its heading, columns, weight unit, damage size labels, rows, and notes. It does not cover Arrow range or rate of fire. The separate Hurled Weapons and Missiles table appears on printed p.38/PDF39; the PHB p.38 General Data crop intentionally ends above that next table while retaining the General Data header, all rows, footnotes and General Note.

The complete candidate context crops and their source bounds, dimensions, hashes and page mappings remain in `research/geometry-focus-calibration.json`. Candidate images were not copied into catalogs. Source PDF hashes are unchanged from v1: PHB `e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095`; UA `e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4`.

## Verification and limits

`node --test tests/geometry-proposal-focus.test.mjs` passes all 9 tests. The test demonstrates that `focusCoversEvidence` rejects v1’s PHB p.38 focus for exactly AC 8–10, rejects the old Arrow currency foci, validates the corrected row focus against each annotated field, checks the UA row boundaries/footnote scope, and confirms all six effective crops fit their PDF pages. It does not establish source semantics beyond the visually checked rows, table completeness for other content, or any catalog approval.
