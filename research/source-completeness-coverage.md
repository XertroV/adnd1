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

## PHB

- **phb-class-xp-search-omission**: confirmed-open
- **phb-progression-explainer-search-omission**: confirmed-open
- **phb-monk-attack-table-conflict**: confirmed-source-conflict-pending-source-worker

## DMG

- **dmg-p74-nonfighter-attack-matrices-absent**: confirmed-structural-absence-with-pixel-verified-source-denominator
- **dmg-printed-p175-partial-supplement**: confirmed-partial-source-coverage
- **dmg-p239-visible-content-unmapped**: confirmed-visible-tables-printing-identity-unverified
- **dmg-bookwide-source-unit-denominator-open**: known-scope-limit
- **dmg-p11-source-edge-glyphs**: source-limitation-not-reconstructed
- **dmg-appendix-outline-boundary-corrections**: contents-indexed-outline-candidates-confirmed-by-endpoint-pixel-review

## UA

- **ua-cavalier-zero-level-rows**: See source ledger for exact evidence.
- **ua-druid-level14-row**: See source ledger for exact evidence.
- **ua-class-pending-mechanics**: See source ledger for exact evidence.
- **ua-spell-exact-name-site-inventory**: See source ledger for exact evidence.
- **ua-racial-preferences-findability**: See source ledger for exact evidence.
- **ua-character-generation-scope**: See source ledger for exact evidence.
- **ua-appendix-s-scope**: See source ledger for exact evidence.
- **ua-spellbook-cross-source-candidate**: See source ledger for exact evidence.
- **ua-underwater-commentary-candidate**: See source ledger for exact evidence.
- **ua-combat-appendices-candidates**: See source ledger for exact evidence.
- **ua-treasure-and-polearm-candidates**: See source ledger for exact evidence.

## MM

- **MM-GAP-CENTIPEDE-GIANT-001**: The source TOC and index identify Centipede, Giant as an MM entry, and PDF p.15 visibly contains its printed p.14 article. No MM Centipede record exists in monsters.json at the input commit; the only Centipede name hit is a separate MM2 record.
- **MM-PRODUCT-SCOPE-EXCLUSION-001**: The assembled product has no searchable MM/MM2 bestiary. This is documented product scope, not an unexpected omission from a promised searchable monster catalogue.

## MM2

- **physical-page-and-folio-accounting**: The 162 physical PDF pages are all accounted for by the pageCoverage array: 160 numbered printed pages plus two unnumbered covers.
- **source-section-outline**: Front matter pp.1–7; A–Z monster sequence pp.8–132; Random Encounter Tables pp.133–155; cross-book index pp.156–160.
- **searchable-catalogue-scope**: The assembled product does not expose a searchable monster catalogue, consistent with the README scope statement.
- **no-unexpected-content-gap-confirmed**: No unexpected missing source-to-product case is confirmed by this page-scope review.
- **reader-capability-not-citation-join**: Local PDF reader support does not establish that a source unit is actually cited by an assembled owner.

## Interpretation

- Physical-page accounting is complete for these exact bytes; source-unit semantic completeness is not established.
- A no-candidate OCR/lexical/geometry result is not a source-completeness pass.
- Documented product exclusions, internal-index omissions, incomplete summaries, citation-only links and unassessable source meaning remain separate.
- Present in data, rendered to users and searchable are independent axes. A parent document can be findable while an exact numeric field is omitted from direct search.
- Historical 453 primary-reference occurrences, 2,190 highlight warnings and 3,849 pending/other field-target states are different captured queues, not missing-table or whole-book error counts.
