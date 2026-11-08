# PHB p.37 Long/Short qualifier association regression

The source crop for Sword, Long highlighted a qualifier printed on the next row, Sword, Short. The Short row highlight stopped before the qualifier’s second line. I captured both failures before changing the two owned region files, then checked the new boxes against the PHB p.37 source pixels.

## Frozen detection baseline

- Git baseline: `679b15d1c580172e54314829c1c3c86dc78b65f3`.
- Whole-catalog context baseline: 1,015 catalogs / 2,859 regions; report [source-audit-batch5-table-context-baseline.json](/workspace/adnd1/research/source-audit-batch5-table-context-baseline.json) and gzip inventory hash are pinned in the JSON report. The old batch-5 table patch and current source-table contracts are likewise hash-pinned.
- The current source-table contract contains 7 tables and 266 explicit rows. Its `sourceConditions` annotations were fully inventoried before repair: 94 nonempty and 172 empty. Empty strings were treated as unreviewed, never as proof that a row has no qualifier.

| Contract table | Rows | Nonempty `sourceConditions` | Empty/unreviewed |
|---|---:|---:|---:|
| `ua-p27-weapon-table` | 60 | 0 | 60 |
| `ua-p28-weapon-table` | 24 | 0 | 24 |
| `batch5-phb36-armor-class` | 9 | 9 | 0 |
| `batch5-phb37-weapon-weight-damage` | 50 | 16 | 34 |
| `batch5-phb38-handheld` | 44 | 12 | 32 |
| `batch5-phb38-hurled` | 15 | 15 | 0 |
| `batch5-dmg225-encumbrance` | 64 | 42 | 22 |

The complete 266-row annotation inventory, including original labels, exact condition strings, target items, and required region IDs, is in the JSON report. Annotation meaning and applicability for all but the named target cases remain unreviewed.

## Preserved failing fixtures and source proof

- **Long Sword**, region `phb-37-2b2447ac14bb294c`: preserved original foci `[0.002692998, 0.782570423, 0.993716338, 0.016725352]` and `[0.619389587, 0.792253521, 0.375224417, 0.036971831]`. The first covers Long’s row; the second overlaps the next row’s Short Sword note. The detector reported `long-focus-overlaps-forbidden-short-qualifier`.
- **Short Sword**, region `phb-37-c9406fdb229bfe86`: preserved original focus `[0.002692998, 0.799295775, 0.993716338, 0.016725352]`, a 19-pixel-high box. The wrapped row is 35 pixels high, so its second note line was outside focus. The detector reported `short-focus-misses-complete-wrapped-row-and-qualifier`.
- Original PHB PDF SHA-256: `e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095`. Printed p.37 / PDF p.38 render and supplied geometry proofs are hash-pinned in the report. Pixel review shows the note “includes all pointed cutting & thrusting weapons with blade length between 15″ and 24″” aligned to Sword, Short; Sword, Long is the preceding row.

## Repair and regression results

- Long keeps its original first row focus; only the confirmed-unrelated second box is removed. Its alt text and summary no longer say that a qualifier is focused.
- Short now has normalized focus `[0.0026929982, 0.7992957746, 0.9937163375, 0.0308098592]`, pixel bounds `[3,908,1110,943]`, and source-PDF bounds `[24.5,631,578,648.5]`. It covers the label, value cells, and both lines of the qualifier.
- Before/after detector calibration: the preserved baseline returns the two failures above; the repaired current regions return no geometry findings. The checker proves only these declared row and qualifier associations.
- Stable region IDs, source image bytes, printed field-value grades, checked-field scope, and the two `equipment.json` item bodies were preserved. The shared contracts and equipment body were not edited.

## Root-owned source-condition proposal and remaining review

The source table contract currently assigns `includes all pointed cutting & thrusting weapons with blade length 15–24 in.` to row `batch5-phb37-weapon-weight-damage-046` / Long Sword, while Short Sword row `...-047` is blank. The report proposes moving that exact string from Long to Short. The central contract file remains unchanged at SHA-256 `da3c6b801322876aac8c91a0963b69e71072c329335e70b95c4a1dc5e5253040`; root can apply and review this delta independently. The frozen old patch bindings preserve the previous text and mapping.

Javelin row `batch5-phb37-weapon-weight-damage-023` is a separate qualifier-review candidate: its label appears italic in the supplied p.37 image, and the nearby italic note defines an additional damage condition. This remains **qualifier-review-pending**; its empty `sourceConditions` value is not a pass, and no Javelin contract edit was made.

## Current catalog availability-phrase review universe

Before repair, I scanned 1,027 current catalog/body JSON files (12 root catalog/index files and all 1,015 `dist/scans` JSON files) for `unavailable`, `not visible`, `missing`, and `not included`. This found 15 keyword occurrences across 14 fields. The exact strings, JSON pointers, and file hashes are recorded in the report. They are unresolved keyword candidates, not 15 confirmed availability defects; incidental uses remain unclassified. No negative result is treated as a semantic pass. Root separately owns the legacy UA Aklys “unavailable” statement; I did not change it.

| File | JSON field | Matched text cue |
|---|---|---|
| `attack-matrices.json` | `$.matrices[0].comparisonExamples[1].explanation` | missing |
| `attack-matrices.json` | `$.matrices[0].coverage.missingCellsMeaning` | unavailable |
| `dist/scans/dagger/phb-bo-stick.json` | `$.scope` | not visible |
| `dist/scans/dagger/ua-aklys-hurled.json` | `$.scope` | unavailable |
| `dist/scans/verified/rules-ability-generation-methods-one-two.json` | `$.regions[0].summary` | missing |
| `dist/scans/verified/rules-ability-generation-methods-three-four.json` | `$.regions[0].summary` | missing |
| `equipment.json` | `$.equipment[19].scanVerification.scope` | missing |
| `phb-magic-user-extra.json` | `$.spells[4].effect[1]` | missing |
| `phb-spells.json` | `$.spells[74].conditions[0]` | missing, missing |
| `rules.json` | `$.sources[2].mapping` | missing |
| `rules.json` | `$.sources[2].coverage` | Missing |
| `rules.json` | `$.rules[9].bullets[2]` | unavailable |
| `rules.json` | `$.rules[78].summary` | missing |
| `rules.json` | `$.rules[140].bullets[1]` | unavailable |

## Changed artifacts

- Region file hashes: Long `b9a5b3bb987b32248becdbc62772be3330d20a286c4cbb64d4e75ba9f64d4c89`; Short `d9d838f1c9edcc80264fcffdd5f4c4aa7b5f882a00c01f8f5580088a0a286ab3`.
- Main equipment catalog stayed at SHA-256 `2264884d224455b98a58b54dc0096270c4b25c2d1948abd5626e4afc54d2966c`. Source image SHA-256 stayed `a0447e9e609ad1191beda38a39a6f3673a0fb11bbfd72472f3f21df7f8445a31`.
- [Regression report](/workspace/adnd1/research/source-audit-batch5-phb37-sword-qualifier-review.json) contains before/after fixtures, all 266 row annotations, availability candidates, exact geometry and hashes.
- Geometry tool: `tools/phb37-sword-qualifier-geometry.mjs`. Test: `tests/phb37-sword-qualifier-geometry.test.mjs`.
- Status: two region focus associations repaired and geometry tests pass; the Long→Short source-condition contract delta and other semantic annotation candidates await root review.
