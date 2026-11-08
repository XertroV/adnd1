# UA p.27 full row review and repair proposals

This report transcribes the complete original UA printed p.27 hand-held weapons table and supplies exact full-table row-focus and reference recipes. It is proposal-only: no equipment catalog, equipment values, references, field bindings, shared ledgers, or overrides were edited. The complete image already present in the frozen catalogs is reused; no duplicate image was added.

- Baseline: 679b15d1c580172e54314829c1c3c86dc78b65f3.
- Source: Unearthed Arcana (original 1985 edition), printed p.27 / PDF p.28; SHA-256 e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4.
- Full table image: dist/scans/verified/ua-27-ac5c72afd1d4dae7.png, SHA-256 ac5c72afd1d4dae7712c0d95b0c4004b009f27c366a24208b8a0d924102d1c9f, 1118×1438, source PDF crop points [9, 29, 568, 748].
- The image visibly contains the full title, all column headings and AC 0–10 labels, all 60 rows, all notes and the General Note. It was compared with the authorized original page render.

## Baseline and dispositions

- 60 source rows: 57 confirmed row-to-item mappings (55 distinct equipment records), 2 uncertain mappings (Aklys and Jo Stick), and 1 inapplicable row (Fist or Open Hand).
- 30 confirmed rows already have a p.27 reference; 27 confirmed rows lack a reference, including the corrected Hook Fauchard mapping. The missing rows are: 2 Atlatl, 8 Blowgun, 10 Caltrop, 13 Fauchard, 14 Fauchard-Fork, 16 Flail, Footman’s, 17 Flail, Horseman’s, 18 Fork, Military, 19 Garrot, 20 Glaive, 21 Glaive-Guisarme, 22 Guisarme, 23 Guisarme-Voulge, 24 Halberd, 25 Harpoon, 26 Hammer, Lucern, 27 Hammer, 28 Hook Fauchard, 31 Lance (light horse), 32 Lance (medium horse), 33 Lance (heavy horse), 40 Pick, Military, Footman’s, 41 Pick, Military, Horseman’s, 42 Pike, Awl, 47 Spetum, 52 Sword, Broad, 59 Voulge.
- Preserve all 30 existing row-specific stable region IDs. Replace 29 clipped row excerpts with the full table image and precise row focus, while retaining the existing Sword Long region as is. Append 27 distinct row regions for confirmed missing-reference rows. Keep shared heading region ua-27-2c829644bd303eb8 unchanged.
- Every confirmed row recipe requires the exact table-image hash above and its row-specific region ID. I checked all 57 target bindings against their source row ID and visible row-focus strip; none uses the shared heading/context region as evidence. This makes a different image on the same page fail the contract.
- Three Lance rows link to one generic Lance record only as explicitly labeled variant context. They receive separate region IDs: phb-lance-light-horse-ua27-row, phb-lance-medium-horse-ua27-row, and phb-lance-heavy-horse-ua27-row. Their values are not promoted to generic Lance fields or prices.
- Keep Aklys p.27 versus Aklys (hurled) uncertain; keep Jo Stick distinct from Bo Stick and without an equipment target; do not map Fist or Open Hand to equipment.

## UA p.27 field-target inventory at baseline 679

These counts test only exact UA p.27 field keys on the 57 confirmed source-row mappings. Similar PHB p.38 fields or unqualified speed-factor fields do not count as UA p.27 evidence.
- **Length (UA p.27)**: present in 9/57 confirmed row-target records; 48 extraction-review candidates.
- **Space required (UA p.27)**: present in 9/57 confirmed row-target records; 48 extraction-review candidates.
- **Weapon speed factor (UA p.27)**: present in 9/57 confirmed row-target records; 48 extraction-review candidates.
- **Hand-held AC adjustments (UA p.27)**: present in 30/57 confirmed row-target records; 27 extraction-review candidates.

Missing UA p.27 fields are extraction-review candidates; the report does not add values or claim that a similarly named field from another source proves the column. The 30 existing UA p.27 AC vectors match the row transcription in a normalized cell-by-cell consistency check (30/30); this does not independently grade the table or promote item facts.

## Complete source-cell transcription

The table below preserves the printed Length, Space Required, Speed Factor and eleven AC modifier cells in AC0-to-AC10 order. Prime marks, approximations, ranges, plus signs, n/a and row footnote markers are retained from the pixels. No values have been applied to equipment records.

| # | Weapon row | Length | Space required | Speed factor | AC 0–10 adjustments | Mark |
|---:|---|---|---|---|---|---|
| 1 | Aklys | c. 2′ | 2′ | 4 (+1) | -7, -6, -5, -4, -3, -2, -1, -1, 0, 0, +1 | — |
| 2 | Atlatl | c. 3′ | 1′ | n/a | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 | — |
| 3 | Axe, Battle | c. 4′ | 4′ | 7 | -5, -4, -3, -2, -1, -1, 0, 0, +1, +1, +2 | — |
| 4 | Axe, Hand | c. 1½′ | 1′ | 4 | -5, -4, -3, -2, -2, -1, 0, 0, +1, +1, +1 | — |
| 5 | Bardiche | c. 5′ | 5′ | 9 | -3, -2, -2, -1, 0, 0, +1, +1, +2, +2, +3 | — |
| 6 | Bec de Corbin | c. 6′ | 6′ | 9 | +2, +2, +2, +2, +2, 0, 0, 0, 0, 0, -1 | — |
| 7 | Bill-Guisarme | 8′ + | 2′ | 10 | 0, 0, 0, 0, 0, 0, 0, 0, +1, 0, 0 | — |
| 8 | Blowgun | 4′–7′ | 1′ | n/a | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 | — |
| 9 | Bo Stick | c. 5′ | 3′ | 3 | -13, -11, -9, -7, -5, -3, -1, 0, +1, 0, +3 | — |
| 10 | Caltrop | n/a | n/a | n/a | -8, -7, -6, -5, -4, -3, -2, -1, 0, +1, +2 | — |
| 11 | Club | c. 3′ | 1′–3′ | 4 | -7, -6, -5, -4, -3, -2, -1, -1, 0, 0, +1 | — |
| 12 | Dagger | c. 15″ | 1′ | 2 | -4, -4, -3, -3, -2, -2, 0, 0, +1, +1, +3 | — |
| 13 | Fauchard | 8′ + | 2′ | 8 | -3, -3, -2, -2, -1, -1, 0, 0, 0, -1, -1 | ** |
| 14 | Fauchard-Fork | 8′ | 2′ | 8 | -2, -2, -1, -1, -1, 0, 0, 0, +1, 0, +1 | ** |
| 15 | Fist or Open Hand | 2′ + | n/a | 1 | -9, -8, -7, -5, -3, -1, 0, 0, +2, 0, +4 | — |
| 16 | Flail, Footman’s | c. 4′ | 6′ | 7 | +3, +3, +2, +2, +1, +2, +1, +1, +1, +1, -1 | — |
| 17 | Flail, Horseman’s | c. 2′ | 4′ | 6 | 0, 0, 0, 0, 0, 0, 0, +1, +1, +1, 0 | — |
| 18 | Fork, Military | 7′ + | 1′ | 7 | -3, -3, -2, -2, -1, 0, 0, +1, +1, 0, +1 | ** |
| 19 | Garrot | c. 3′ | 1½′ | 2 | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 | — |
| 20 | Glaive | 8′ + | 1′ | 8 | -2, -2, -1, -1, 0, 0, 0, 0, 0, 0, 0 | — |
| 21 | Glaive-Guisarme | 8′ + | 1′ | 9 | -2, -2, -1, -1, 0, 0, 0, 0, 0, 0, 0 | ** |
| 22 | Guisarme | 6′ + | 2′ | 8 | -3, -3, -2, -2, -1, -1, 0, 0, 0, -1, -1 | ** |
| 23 | Guisarme-Voulge | 7′ + | 2′ | 10 | -2, -2, -1, -1, 0, +1, +1, +1, 0, 0, 0 | ** |
| 24 | Halberd | 5′ + | 5′ | 9 | 0, +1, +1, +1, +1, +2, +2, +2, +1, +1, 0 | — |
| 25 | Harpoon | 6′–8′ | 1½′ | 6 | -3, -2, -2, -1, -1, -1, 0, 0, 0, 0, 0 | — |
| 26 | Hammer, Lucern | 5′ + | 5′ | 9 | 0, +1, +1, +1, +2, +2, +2, +1, +1, 0, 0 | ** |
| 27 | Hammer | c. 1½′ | 2′ | 4 | 0, 0, 0, +1, 0, +1, 0, 0, 0, 0, 0 | — |
| 28 | Hook Fauchard | 8′ + | 2½′ | 9 | -3, -3, -2, -2, -1, -1, 0, 0, 0, 0, -1 | — |
| 29 | Jo Stick | c. 3′ | 2′ | 2 | -10, -9, -8, -6, -4, -2, -1, 0, +1, 0, +2 | — |
| 30 | Knife | c. 1′ | 1′ | 2 | -6, -5, -5, -4, -3, -2, -1, 0, +1, +1, +3 | — |
| 31 | Lance (light horse) | 10′ | 1′ | 7 | -3, -3, -2, -2, -1, 0, 0, 0, 0, 0, 0 | — |
| 32 | Lance (medium horse) | 12′ | 1′ | 6 | -1, 0, 0, +1, +1, +1, +1, 0, 0, 0, 0 | — |
| 33 | Lance (heavy horse) | c. 14′ | 1′ | 8 | +4, +4, +3, +3, +2, +2, +2, +1, +1, 0, 0 | — |
| 34 | Lasso | (10′–20′) | 8′ + | 10 | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 | — |
| 35 | Mace, Footman’s | c. 2½′ | 4′ | 7 | +2, +2, +1, +1, 0, 0, 0, 0, 0, +1, -1 | — |
| 36 | Mace, Horseman’s | c. 1½′ | 2′ | 6 | +2, +2, +1, +1, 0, 0, 0, 0, 0, 0, 0 | — |
| 37 | Man Catcher | 8′ + | 2½′ | 7 | 0, 0, 0, 0, 0, 0, 0, 0, -1, -2, -3 | — |
| 38 | Morning Star | c. 4′ | 5′ | 7 | 0, 0, 0, +1, +1, +1, +1, +1, +1, +2, +2 | — |
| 39 | Partisan | 7′ + | 3′ | 9 | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 | — |
| 40 | Pick, Military, Footman’s | c. 4′ | 4′ | 7 | +3, +3, +2, +2, +1, +1, 0, -1, -1, -1, -2 | — |
| 41 | Pick, Military, Horseman’s | c. 2′ | 2′ | 5 | +2, +2, +1, +1, +1, +1, 0, 0, -1, -1, -1 | — |
| 42 | Pike, Awl | 18′ | 1′ | 13 | -1, -1, -1, 0, 0, 0, 0, 0, 0, -1, -2 | — |
| 43 | Ranseur | 8′ + | 1′ | 8 | -3, -3, -2, -1, -1, 0, 0, 0, 0, 0, +1 | ** |
| 44 | Sap | ½′ | 1′ | 2 | -14, -13, -12, -10, -8, -6, -5, -4, -3, -2, 0 | — |
| 45 | Scimitar | c. 3′ | 2′ | 4 | -4, -3, -3, -2, -2, -1, 0, 0, +1, +1, +3 | — |
| 46 | Spear | 5′–13′ + | 1′ | 6–8 | -2, -2, -2, -1, -1, -1, 0, 0, 0, 0, 0 | — |
| 47 | Spetum | 8′ + | 1′ | 8 | -2, -2, -2, -1, 0, 0, 0, 0, 0, +1, +2 | 4 |
| 48 | Spiked Buckler | 1′ | 2′ | 4 | -7, -6, -5, -4, -3, -2, -1, 0, 0, 0, +2 | — |
| 49 | Staff, Quarter | 6′–8′ | 3′ | 4 | -9, -8, -7, -5, -3, -1, 0, 0, +1, +1, +1 | — |
| 50 | Staff Sling | 5′ | 6′ | 11 | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 | — |
| 51 | Sword, Bastard | c. 4½′ | 4′ + | 6 | 0, 0, 0, 0, +1, +1, +1, +1, +1, +1, 0 | 5 |
| 52 | Sword, Broad | c. 3½′ | 4′ | 5 | -5, -4, -3, -2, -1, 0, 0, +1, +1, +1, +2 | — |
| 53 | Sword, Falchion | c. 3½′ | 3½′ | 5 | -3, -2, -2, -1, 0, +1, +1, +1, +1, 0, 0 | — |
| 54 | Sword, Khopesh | c. 3½′ | 4′ | 9 | -7, -6, -5, -4, -2, -1, 0, 0, +1, +1, +2 | — |
| 55 | Sword, Long | c. 3½′ | 3′ | 5 | -4, -3, -2, -1, 0, 0, 0, 0, 0, +1, +2 | — |
| 56 | Sword, Short | c. 2′ | 1′ | 3 | -5, -4, -3, -2, -1, 0, 0, 0, +1, 0, +2 | — |
| 57 | Sword, Two-handed | c. 6′ | 6′ | 10 | +2, +2, +2, +2, +2, +2, +3, +3, +3, +1, 0 | — |
| 58 | Trident | 4′–8′ + | 1′ | 6–8 | -4, -3, -3, -2, -1, -1, 0, 0, +1, 0, +1 | — |
| 59 | Voulge | 8′ + | 2′ | 10 | -2, -2, -1, -1, 0, +1, +1, +1, 0, 0, 0 | — |
| 60 | Whip | 8′–20′ | 8′–20′ | 5–8 | -14, -12, -10, -8, -6, -4, -2, -1, +1, 0, +3 | — |

## Printed notes and remaining qualifier work

The full table asset contains each printed note. The source marker strings **, 4, and 5 are linked in their row recipes to the visible matching note line. The single-star note and numeric notes 1, 2, 3, and 6 remain in the complete image; row applicability was not inferred where a matching marker could not be established. The full text is preserved in the JSON.

The field inventory and row recipes are candidates for the parent integration after its equipment-table work. No catalog edits or independent review are claimed.
