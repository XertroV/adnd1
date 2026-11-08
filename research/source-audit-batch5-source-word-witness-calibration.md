# Whole-corpus source word-witness calibration

This frozen witness inventory was calibrated against40 independently source-reviewed wrong-focus records:15 PHB assassination-fee rows,9 DMG poison-dose rows, and16 UA armor rows. The calibration tests check that the whole-corpus counts remain intact and that the candidate-only signals are present on these exact source-confirmed cases.

The witness input is [research/source-audit-batch5-monetary-row-identity-witness-before.json.gz](./source-audit-batch5-monetary-row-identity-witness-before.json.gz), compressed SHA-256 `df80e0ef061b29a2a3dc2ae0985aad1e9ed8a918e35abb2f89b6c404d456b1d0`; its decompressed JSON SHA-256 is `5b5738802e15140c84b0394b3e40d5c44a0a068a26dc90b6c88a973183ef7ecc`. The report covers 2161 records and 3097 geometry observations.

## Full-corpus denominators

Record surfaces: `canonical-source-row` 710; `site-price-claim` 191; `ua-supplement-row` 583; `phb-dmg-supplement-row` 179; `phb-reference-row-comparison` 165; `reference-financial-context` 9; `typed-passage` 34; `passage-row-comparison` 43; `typed-description` 2; `description-variant-row` 9; `description-pointer-link` 8; `source-census-claim` 180; `census-adjacent-review-issue` 48.

| Geometry state | Count |
|---|---:|
| witness-candidates | 1407 |
| unassessed | 1575 |
| witness-observed-no-semantic-pass | 115 |

Mapping states: `mapped` 1522; `unsupported-coordinate-space` 565; `ambiguous-normalized-page-frame` 34; `source-identity-unavailable-or-mismatched` 373; `render-frame-metadata-unavailable` 587; `ambiguous-pdf-point-frame` 16. Expected-value records: 1302; numeric fields extracted: 1302; value extraction unknown or not applicable: 859.

## Every candidate category across the full corpus

Counts below are per geometry observation and per distinct record, respectively. Categories overlap, so the totals are not unique rows or defects. Across all 3097 geometries, there are 2340 category observations.

| Candidate category | Geometry observations | Distinct records |
|---|---:|---:|
| `declared-printed-label-absent-candidate` | 290 | 179 |
| `expected-number-absent-candidate` | 613 | 448 |
| `other-declared-row-label-present-candidate` | 119 | 118 |
| `text-box-crossing-candidate` | 1318 | 1156 |

## Source-confirmed calibration sets

| Set | Records | Candidate-category geometry hits |
|---|---:|---|
| assassination | 15 | `expected-number-absent-candidate`: 15; `text-box-crossing-candidate`: 8 |
| poison | 9 | `expected-number-absent-candidate`: 9; `text-box-crossing-candidate`: 9 |
| armor | 16 | `expected-number-absent-candidate`: 4; `other-declared-row-label-present-candidate`: 16; `text-box-crossing-candidate`: 16; `declared-printed-label-absent-candidate`: 2 |

**assassination (15)**: `phb-dmg-supplement-row:phb-assassination-fees-row-01`, `phb-dmg-supplement-row:phb-assassination-fees-row-02`, `phb-dmg-supplement-row:phb-assassination-fees-row-03`, `phb-dmg-supplement-row:phb-assassination-fees-row-04`, `phb-dmg-supplement-row:phb-assassination-fees-row-05`, `phb-dmg-supplement-row:phb-assassination-fees-row-06`, `phb-dmg-supplement-row:phb-assassination-fees-row-07`, `phb-dmg-supplement-row:phb-assassination-fees-row-08`, `phb-dmg-supplement-row:phb-assassination-fees-row-09`, `phb-dmg-supplement-row:phb-assassination-fees-row-10`, `phb-dmg-supplement-row:phb-assassination-fees-row-11`, `phb-dmg-supplement-row:phb-assassination-fees-row-12`, `phb-dmg-supplement-row:phb-assassination-fees-row-13`, `phb-dmg-supplement-row:phb-assassination-fees-row-14`, `phb-dmg-supplement-row:phb-assassination-fees-row-15`

**poison (9)**: `phb-dmg-supplement-row:dmg-poison-ingestive-a`, `phb-dmg-supplement-row:dmg-poison-ingestive-b`, `phb-dmg-supplement-row:dmg-poison-ingestive-c`, `phb-dmg-supplement-row:dmg-poison-ingestive-d`, `phb-dmg-supplement-row:dmg-poison-ingestive-e`, `phb-dmg-supplement-row:dmg-poison-insinuative-a`, `phb-dmg-supplement-row:dmg-poison-insinuative-b`, `phb-dmg-supplement-row:dmg-poison-insinuative-c`, `phb-dmg-supplement-row:dmg-poison-insinuative-d`

**armor (16)**: `ua-supplement-row:ua-other-001-armor-r01`, `ua-supplement-row:ua-other-001-armor-r02`, `ua-supplement-row:ua-other-001-armor-r03`, `ua-supplement-row:ua-other-001-armor-r04`, `ua-supplement-row:ua-other-001-armor-r05`, `ua-supplement-row:ua-other-001-armor-r06`, `ua-supplement-row:ua-other-001-armor-r07`, `ua-supplement-row:ua-other-001-armor-r08`, `ua-supplement-row:ua-other-001-armor-r09`, `ua-supplement-row:ua-other-001-armor-r10`, `ua-supplement-row:ua-other-001-armor-r11`, `ua-supplement-row:ua-other-001-armor-r12`, `ua-supplement-row:ua-other-001-armor-r13`, `ua-supplement-row:ua-other-001-armor-r14`, `ua-supplement-row:ua-other-001-armor-r15`, `ua-supplement-row:ua-other-001-armor-r16`

The armor table has one separate source-QA positive control, UA p.75 row17. Its focus was judged isolated. The witness still reports a text-box-crossing candidate while its expected number and label are present; this shows that edge-crossing boxes can arise from font padding and remain unresolved by OCR alone.

No candidate signal grants semantic approval. The witness has `semanticRowIdentityComplete: false`; 1575 geometries are unassessed, 115 have no candidate signal but still have no semantic pass, and 859 records have unknown or not-applicable number extraction. Source and semantic uncertainties remain unresolved.
