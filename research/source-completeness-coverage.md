# Source completeness inventory

All five supplied books have an explicit physical-page inventory and a source-first named-unit ledger. Actual source-unit semantics, row coverage, qualifiers and unknown continuations remain bounded and explicitly unassessed where not reviewed.

Baseline: `d0d3c0bf55607bdadd956aaa3f72fe9af53618ff`. The denominator is **776 physical PDF pages plus one separate supplemental image**. **No whole book is certified semantically complete.**

| Book | Physical PDF pages | Named units/candidates | Complete semantic unit denominator |
|---|---:|---:|---|
| PHB | 130 | 105 | Not established |
| DMG | 240 | 60 | Not established |
| UA | 130 | 36 | Not established |
| MM | 114 | 317 | Not established |
| MM2 | 162 | 41 | Not established |

Named units overlap by section, table, heading and procedure; they are not additive rule atoms. See the JSON and individual source ledgers for every page, scope, source identity, site disposition, checked-negative boundary, and remaining review item.

## Current repair batches

- **site-findability-and-rendering**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/39), Version 17, merge `db7d10957dd4d50e9bab063cffb3b503a16144c2`.
- **dmg74-nonfighter-matrices**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/40), Version 18, merge `6d330af372ac809d11ed6029ed8695d0d8dc0909`.
- **pass8-character-reference-source-repair**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/41), Version 19, merge `77712b831fac3256baf97da385c1dd56b6d82e88`.
- **all-eleven-xp-continuation-field-mappings**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/42), Version 20, merge `a46eddc41ac6f712d5ad1498195df6a49810aae1`.
- **pass8-source-ledger-checkpoint**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/43), Version 21, merge `ad57b84226cc89446e60d0b7bbaebb379aedc16a`.
- **source-frame-current-guard**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/44), Version 22, merge `236818f2026f61eb0cb696ffb0ea9ff166a491ff`.
- **continuation-source-frame-consumer**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/45), Version 25, merge `ae7f02c6a5aac9ac8da1f7bc5cf5152e422fcd58`.
- **phb-spell-guidance-class-mechanics-source-overview**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/46), Version 25, merge `4aa977788085f67a28a24d40965edf987bc7242b`.
- **dmg225-locations-and-six-replacement-crop-groups**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/47), Version 26, merge `cc9509047746d5e27a71cb5b1e0cfcb739a688c9`.
- **phb38-ua28-hurled-weapons-discoverability-and-dmg28-continuation**: merged-and-live-independently-verified — [PR](https://github.com/XertroV/adnd1/pull/48), Version 27, merge `6717c6f22bbf2f2b421327e4c8561b1d81df00d4`.

The following book findings and disposition counts describe the frozen baseline. They preserve before evidence; use the repair batches above for current publication status.

## PHB

- **phb-class-xp-search-omission** (baseline): confirmed-open
- **phb-progression-explainer-search-omission** (baseline): confirmed-open
- **phb-monk-attack-table-conflict** (baseline): confirmed-source-conflict-pending-source-worker

## DMG

- **dmg-p74-nonfighter-attack-matrices-absent** (baseline): confirmed-structural-absence-with-pixel-verified-source-denominator
- **dmg-printed-p175-partial-supplement** (baseline): confirmed-partial-source-coverage
- **dmg-p239-visible-content-unmapped** (baseline): confirmed-visible-tables-printing-identity-unverified
- **dmg-bookwide-source-unit-denominator-open** (baseline): known-scope-limit
- **dmg-p11-source-edge-glyphs** (baseline): source-limitation-not-reconstructed
- **dmg-appendix-outline-boundary-corrections** (baseline): contents-indexed-outline-candidates-confirmed-by-endpoint-pixel-review

## UA

- **ua-cavalier-zero-level-rows** (baseline): See source ledger for exact evidence.
- **ua-druid-level14-row** (baseline): See source ledger for exact evidence.
- **ua-class-pending-mechanics** (baseline): See source ledger for exact evidence.
- **ua-spell-exact-name-site-inventory** (baseline): See source ledger for exact evidence.
- **ua-racial-preferences-findability** (baseline): See source ledger for exact evidence.
- **ua-character-generation-scope** (baseline): See source ledger for exact evidence.
- **ua-appendix-s-scope** (baseline): See source ledger for exact evidence.
- **ua-spellbook-cross-source-candidate** (baseline): See source ledger for exact evidence.
- **ua-underwater-commentary-candidate** (baseline): See source ledger for exact evidence.
- **ua-combat-appendices-candidates** (baseline): See source ledger for exact evidence.
- **ua-treasure-and-polearm-candidates** (baseline): See source ledger for exact evidence.

## MM

- **MM-GAP-CENTIPEDE-GIANT-001** (baseline): The source TOC and index identify Centipede, Giant as an MM entry, and PDF p.15 visibly contains its printed p.14 article. No MM Centipede record exists in monsters.json at the input commit; the only Centipede name hit is a separate MM2 record.
- **MM-PRODUCT-SCOPE-EXCLUSION-001** (baseline): The assembled product has no searchable MM/MM2 bestiary. This is documented product scope, not an unexpected omission from a promised searchable monster catalogue.

## MM2

- **physical-page-and-folio-accounting** (baseline): The 162 physical PDF pages are all accounted for by the pageCoverage array: 160 numbered printed pages plus two unnumbered covers.
- **source-section-outline** (baseline): Front matter pp.1–7; A–Z monster sequence pp.8–132; Random Encounter Tables pp.133–155; cross-book index pp.156–160.
- **searchable-catalogue-scope** (baseline): The assembled product does not expose a searchable monster catalogue, consistent with the README scope statement.
- **no-unexpected-content-gap-confirmed** (baseline): No unexpected missing source-to-product case is confirmed by this page-scope review.
- **reader-capability-not-citation-join** (baseline): Local PDF reader support does not establish that a source unit is actually cited by an assembled owner.

## Interpretation

- Physical-page accounting is complete for these exact bytes; source-unit semantic completeness is not established.
- Book dispositions and finding records are frozen baseline observations at baselineCommit. Current repair and publication states are recorded separately in repairs; baseline open labels are not current unresolved totals.
- A no-candidate OCR/lexical/geometry result is not a source-completeness pass.
- Documented product exclusions, internal-index omissions, incomplete summaries, citation-only links and unassessable source meaning remain separate.
- Present in data, rendered to users and searchable are independent axes. A parent document can be findable while an exact numeric field is omitted from direct search.
- Historical 453 primary-reference occurrences, 2,190 highlight warnings and 3,849 pending/other field-target states are different captured queues, not missing-table or whole-book error counts.
