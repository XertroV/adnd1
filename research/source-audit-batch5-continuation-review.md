# Batch 5 continuation source-pixel review

Frozen baseline: `679b15d1c580172e54314829c1c3c86dc78b65f3`; numeric summary SHA-256 `bef82bbff53ae7924f4dc6e169d3700a145aca9bfb41dd75103b0632d286b65e`; compressed numeric evidence SHA-256 `9bda77ce4816f6c6b4f57bc8ea5afaa9469e8411c21a7411a6ac3f05644cca38`.

The review uses source-page pixels, catalog crop images, crop bounds, and page reading order. It stores no source passage text or OCR transcript. Geometry is a candidate signal, not proof; rows without a structural signal are not a semantic pass.

## Baseline exposed catalog and property universe

| Inventory | Count / classification |
|---|---:|
| Catalog JSON files under scans | 1,013 |
| Unique catalog files referenced by exposed records | 1,013 |
| Record-to-catalog binding usages | 1,013 |
| Source-excerpt catalog bindings | 993 |
| Scan-verification catalog bindings | 20 |
| Catalog-region binding usages | 2,742 |
| Source-excerpt region uses | 2,666 |
| Scan-verification region uses | 76 |
| Unique catalog source pages | 229 |
| Geometry-assessable region rows | 2,493 |
| Invalid/missing crop geometry rows | 249 |
| Rows with any crop-boundary signal | 2,383 |
| Rows with a word-box crossing signal | 2,257 |
| Source-page flow candidates | 190 |
| Same-catalog crop pair rows | 42 |
| Generic unlinked pair rows | 41 |
| Property pointers, including citation/provenance metadata | 169,061 |
| Mechanics-audit field leaves (`fieldsFor` denominator) | 13,418 |

The exposed record catalog universe has 993 owners across rules, spells, equipment, matrices, classes, progressionExplainer. Property-category counts: `{"citation-or-provenance": 67563, "mechanics-or-source-fact": 5529, "metadata-or-prose": 14948, "other-exposed-property": 81021}`. Property source-linkage counts: `{"direct-field-binding": 69150, "nested-source-page-context": 7399, "no-explicit-source-page": 116, "record-page-context": 92396}`. The 13,418 mechanics-field denominator is the `tools/mechanics-audit.mjs fieldsFor(collection, item)` leaf count; it excludes generated citation/provenance metadata. The property-pointer total is not that denominator.

Structural signal counts overlap: `word-crosses-crop-boundary` 2,257, `open-unpunctuated-at-crop-bottom` 993, `lowercase-text-at-crop-top` 354, `open-dangling-connector-at-crop-bottom` 154, `open-hyphenated-fragment-at-crop-bottom` 47. The detector explicitly treats no signal as “not emitted by implemented rules,” never as semantic completeness.

## Source-review dispositions

| Category | Count |
|---|---:|
| New elevated page groups source-reviewed | 73 |
| Elevated pages with a source-confirmed present-but-unlinked owner pair | 20 |
| Elevated pages still uncertain at owner level | 53 |
| Distinct source-confirmed present-but-unlinked crop pairs | 32 |
| Owner-catalog pair rows (including shared consumers) | 44 |
| Source-reviewed candidate owner-region rows in elevated census | 887 |
| Candidate region rows now source-confirmed present-but-unlinked | 58 |
| Candidate region rows still uncertain | 829 |
| Confirmed missing source passage pixels | 0 |
| Source pages unavailable for review | 0 |
| Invalid/missing crop geometry rows | 249 |
| Deferred weak-shape-only pages / word-box-only pages | 123 / 11 |
| Additional companion source pages outside the 73-page elevated census | 0 |
| Generic paired-crop output misses confirmed by source review | 3 |
| Proposed additional source-linked groups (review only) | 2 |

These dispositions answer passage continuity and crop linkage only. No mechanics, spell values, prices, or owner-specific field semantics were re-reviewed.

## All 73 elevated page groups

| Source page | Disposition | Generic flow cues | Owner crop rows | Source review finding |
|---|---|---:|---:|---|
| DMG p.12 (PDF 13) | uncertain | 2 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| DMG p.28 (PDF 29) | uncertain | 1 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| DMG p.47 (PDF 48) | uncertain | 1 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| DMG p.51 (PDF 52) | uncertain | 1 | 2 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| DMG p.52 (PDF 53) | uncertain | 1 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| DMG p.55 (PDF 56) | uncertain | 1 | 0 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| DMG p.64 (PDF 65) | uncertain | 1 | 6 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| DMG p.225 (PDF 225) | present-but-unlinked | 1 | 45 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| MM p.11 (PDF 12) | uncertain | 1 | 0 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| MM p.38 (PDF 39) | uncertain | 1 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| MM p.80 (PDF 81) | uncertain | 1 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| MM p.86 (PDF 87) | uncertain | 1 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| MM p.96 (PDF 97) | uncertain | 2 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| MM p.99 (PDF 100) | uncertain | 1 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.17 (PDF 18) | uncertain | 1 | 12 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.20 (PDF 21) | uncertain | 1 | 2 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.34 (PDF 35) | uncertain | 2 | 3 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.45 (PDF 46) | present-but-unlinked | 1 | 10 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.47 (PDF 48) | uncertain | 1 | 25 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.51 (PDF 52) | present-but-unlinked | 2 | 13 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.52 (PDF 53) | uncertain | 2 | 17 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.53 (PDF 54) | present-but-unlinked | 1 | 10 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.65 (PDF 66) | uncertain | 1 | 9 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.67 (PDF 68) | present-but-unlinked | 2 | 15 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.69 (PDF 70) | uncertain | 1 | 15 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.70 (PDF 71) | present-but-unlinked | 1 | 19 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.73 (PDF 74) | present-but-unlinked | 2 | 21 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.76 (PDF 77) | present-but-unlinked | 2 | 20 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.77 (PDF 78) | present-but-unlinked | 2 | 18 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.79 (PDF 80) | uncertain | 1 | 16 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.85 (PDF 86) | present-but-unlinked | 2 | 12 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| PHB p.87 (PDF 88) | uncertain | 1 | 5 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.97 (PDF 98) | uncertain | 1 | 18 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.100 (PDF 101) | uncertain | 2 | 12 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.101 (PDF 102) | uncertain | 2 | 3 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.103 (PDF 104) | uncertain | 2 | 2 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| PHB p.117 (PDF 118) | uncertain | 2 | 3 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.10 (PDF 11) | present-but-unlinked | 1 | 9 | Source pixels confirm two owner-crop pairs in the same elven-subrace passage. The pairs overlap as alternate crop extents; a wider two-segment pair is proposed once. Other owner crop cases on this page remain uncertain. |
| UA p.11 (PDF 12) | uncertain | 2 | 12 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.16 (PDF 17) | uncertain | 2 | 4 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.20 (PDF 21) | uncertain | 1 | 1 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.21 (PDF 22) | uncertain | 1 | 2 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.22 (PDF 23) | uncertain | 2 | 4 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.25 (PDF 26) | uncertain | 0 | 2 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.27 (PDF 28) | uncertain | 0 | 56 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.28 (PDF 29) | uncertain | 0 | 49 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.32 (PDF 33) | uncertain | 1 | 7 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.33 (PDF 34) | uncertain | 1 | 5 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.36 (PDF 37) | uncertain | 1 | 8 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.39 (PDF 40) | present-but-unlinked | 1 | 6 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| UA p.40 (PDF 41) | uncertain | 1 | 5 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.41 (PDF 42) | present-but-unlinked | 2 | 9 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| UA p.44 (PDF 45) | uncertain | 1 | 5 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.45 (PDF 46) | uncertain | 1 | 142 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.46 (PDF 47) | uncertain | 1 | 14 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.47 (PDF 48) | present-but-unlinked | 1 | 12 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| UA p.52 (PDF 53) | present-but-unlinked | 1 | 8 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| UA p.53 (PDF 54) | present-but-unlinked | 1 | 7 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| UA p.54 (PDF 55) | uncertain | 2 | 7 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.56 (PDF 57) | uncertain | 2 | 6 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.58 (PDF 59) | uncertain | 2 | 6 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.59 (PDF 60) | present-but-unlinked | 1 | 5 | Source pixels confirm the Magic-User Contingency description crosses from the final passage block on this page to its continuation on printed p.60. The adjacent-page crop pair is unlinked in the baseline. Other owner cases on this page remain uncertain. |
| UA p.60 (PDF 61) | present-but-unlinked | 3 | 3 | Source pixels confirm the top-left Magic-User Contingency crop continues the prior page’s passage. The adjacent-page owner crop pair is unlinked in the baseline; other crop cases on this page remain uncertain. |
| UA p.63 (PDF 64) | uncertain | 2 | 4 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.64 (PDF 65) | uncertain | 1 | 4 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.65 (PDF 66) | present-but-unlinked | 1 | 78 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| UA p.67 (PDF 68) | present-but-unlinked | 2 | 7 | At least one source-reviewed owner crop pair is present in the current catalog but lacks a linked continuation group. Other flows/owners on this page remain independent candidates. |
| UA p.68 (PDF 69) | uncertain | 1 | 6 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.70 (PDF 71) | uncertain | 1 | 4 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.76 (PDF 77) | uncertain | 1 | 4 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.81 (PDF 82) | uncertain | 0 | 33 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.82 (PDF 83) | uncertain | 0 | 8 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |
| UA p.107 (PDF 108) | uncertain | 1 | 3 | Page-level source flow was inspected; no exact owner-to-crop continuation relationship was established from this generic cue set. |

Each `flowCueReviews` entry in the JSON has its own disposition. For example, the PHB p.34 same-page shape cue is explicitly marked `sufficient-existing-context-or-false-cue`; its separate adjacent-page cue remains uncertain. A page with one confirmed pair does not promote its other owner crops.

## Source-confirmed owner crop pairs

The first 29 pairs were emitted by the generic same-page crop-pair inventory and then visually reviewed. Three additional pairs were confirmed in source review despite not appearing in that generic pair output. All source pair rows include crop hashes, source hashes, owner references, and page geometry; source text is omitted.

| Source order | Pair | Owner catalogs | Detector status | Disposition |
|---|---|---|---|---|
| lower-left opening precedes upper-right continuation on the same printed page | `dmg-225-e8ddcda7bb0d9586` → `dmg-225-90b02a4c3e47a923` (DMG p.225) | equipment:phb-thieves-tools | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-45-41097b70770c8ae7` → `phb-45-dacaab7bfdf68a5d` (PHB p.45) | spells:phb-cleric-hold-person, spells:phb-druid-charm-person-or-mammal, spells:phb-magic-user-hold-person | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-46-a6bc225e369e38de` → `phb-46-fbc496a1bdbd4908` (PHB p.46) | spells:phb-cleric-spiritual-hammer | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-48-ac16c83e25c1d891` → `phb-48-f0d6cbae9fb53c37` (PHB p.48) | spells:phb-cleric-divination | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-51-6406ecad46fd5fd3` → `phb-51-5d2d60d9bf87390d` (PHB p.51) | spells:phb-cleric-conjure-animals, spells:phb-illusionist-conjure-animals | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-53-8154ad45a836386c` → `phb-53-4d301b482927bff8` (PHB p.53) | spells:phb-cleric-regenerate | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-58-0d9ee6c7bc471cff` → `phb-58-09d6611fbc029d83` (PHB p.58) | spells:phb-druid-snare | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-59-00a420963eaac9d7` → `phb-59-f5640126ab63de10` (PHB p.59) | spells:phb-druid-control-temperature-10-radius | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-67-673b68f8fb7f3c55` → `phb-67-675b6d57b325748e` (PHB p.67) | spells:phb-illusionist-shadow-magic, spells:phb-magic-user-magic-missile | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-70-bebc3ac3e6bdc455` → `phb-70-16f42449b4d7283c` (PHB p.70) | spells:phb-illusionist-improved-invisibility, spells:phb-illusionist-invisibility-10-radius, spells:phb-illusionist-invisibility, spells:phb-magic-user-invisibility-10-radius, spells:phb-magic-user-invisibility, spells:phb-magic-user-mass-invisibility | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-73-11c2d1c4b5a5dc5c` → `phb-73-7cab504b7db0dbf9` (PHB p.73) | spells:phb-cleric-feign-death, spells:phb-druid-feign-death, spells:phb-magic-user-feign-death | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-76-c68e94613dac8220` → `phb-76-66d3f3a21136f4ff` (PHB p.76) | spells:phb-magic-user-dimension-door | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-77-1b2cc8621d6dd7f4` → `phb-77-0755ed14aa8b24d1` (PHB p.77) | spells:phb-magic-user-fumble | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-80-f8ae68d885842af2` → `phb-80-8c9899d4d18c0a7c` (PHB p.80) | spells:phb-magic-user-distance-distortion | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-85-934b24195e975fe0` → `phb-85-06bdac74165d188c` (PHB p.85) | spells:phb-magic-user-otiluke-s-freezing-sphere | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-88-3fdc6fa9dc2ab30e` → `phb-88-fe7c9fa0206d395f` (PHB p.88) | spells:phb-magic-user-mordenkainen-s-sword | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-89-c05710f9f7662845` → `phb-89-e1449afa33f0123d` (PHB p.89) | spells:phb-magic-user-antipathy-sympathy | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `phb-91-c112f87585b507b9` → `phb-91-1e9c44bb988e4742` (PHB p.91) | spells:phb-magic-user-power-word-blind | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-39-f6cbd1cf71709a59` → `ua-39-1f9e5c24696085d3` (UA p.39) | spells:ua-cleric-golem | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-41-1b1a6e0ea2cc258f` → `ua-41-299a05cb8670b83b` (UA p.41) | spells:ua-cleric-succor, spells:ua-magic-user-succor | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-47-f3317fa5b7b97f98` → `ua-47-c64ff68537df8507` (UA p.47) | spells:ua-magic-user-dusty | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-52-049ee90d0c5fab54` → `ua-52-3ecff922729c0daf` (UA p.52) | spells:ua-magic-user-melt | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-53-f9723ec2f3601c3c` → `ua-53-cc7491d177fcc2a9` (UA p.53) | spells:ua-magic-user-bind | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-57-a42094b45554ed19` → `ua-57-c8ffb42aad13ea1a` (UA p.57) | spells:ua-magic-user-otilukes-resilient-sphere | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-65-c0ab3c87dfa23f97` → `ua-65-842073055820a7d9` (UA p.65) | spells:ua-magic-user-mordenkainens-disjunction | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-67-034b33672c601d94` → `ua-67-7c0fa4b71a02629b` (UA p.67) | spells:ua-illusionist-phantom-armor | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-69-29065a55e88e8ad4` → `ua-69-7ceb51358e10f81e` (UA p.69) | spells:ua-illusionist-death-fog | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-69-29065a55e88e8ad4` → `ua-69-b8b05ef9807ad0f8` (UA p.69) | spells:ua-illusionist-death-fog | generic pair output | present-but-unlinked |
| lower-left opening precedes upper-right continuation on the same printed page | `ua-69-f499dfef2e7e7aa9` → `ua-69-b8b05ef9807ad0f8` (UA p.69) | spells:ua-illusionist-solid-fog | generic pair output | present-but-unlinked |
| same-page lower-left to upper-right passage; focused alternate crop pair | `ua-10-d3cdc07db7c18a50` → `ua-10-46ba4e69b0474ea1` (UA p.10) | rules:ua-elven-subrace-adjustments | manual-source-review-addition-not-emitted-as-a-pair-by-the-generic-pair-output | present-but-unlinked |
| same-page lower-left to upper-right passage; wider contextual crop pair | `ua-10-391dc1287b053d98` → `ua-10-0f52a85b943013cf` (UA p.10) | rules:ua-elven-subrace-adjustments | manual-source-review-addition-not-emitted-as-a-pair-by-the-generic-pair-output | present-but-unlinked |
| adjacent printed pages p.59 to p.60; final paragraph line to its next-page completion | `ua-59-fa6e239da74db6dd` → `ua-60-b42c889225a311fa` (UA p.59) | spells:ua-magic-user-contingency | manual-source-review-addition-not-emitted-as-a-pair-by-the-generic-pair-output | present-but-unlinked |

### Per-region owner dispositions

One row per reviewed owner-catalog region. These are the flagged/elevated review subset, not every region in the universe; the hash-bound numeric report inventories all 2,742 binding uses. The report keeps 249 geometry-invalid rows separately as not assessable.

| Page | Owner | Region ID | Structural cues | Disposition | Pair reference(s) |
|---|---|---|---|---|---|
| DMG p.12 | rules:secondary-skills | `dmg-12-4d67cbcddf22a20f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.28 | rules:standard-hireling-terms | `dmg-28-ecbd7bdf2aeb1849` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.47 | rules:wilderness-encounter-frequency | `dmg-47-23e0cbc4caf62e76` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.51 | rules:aerial-climbing-diving | `dmg-50-cd1e86900a12538e` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.51 | rules:aerial-missile-penalties | `dmg-51-ee15928a9331f7fa` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.52 | rules:aerial-missile-penalties | `dmg-52-a91de37286b88b70` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.64 | equipment:phb-holy-water | `dmg-64-04a3d1f41d402b2c` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.64 | equipment:phb-holy-water | `dmg-64-1d23e54532a531b9` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.64 | equipment:phb-holy-water | `dmg-64-25877874d07b7f9b` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.64 | equipment:phb-oil-flask | `dmg-64-04a3d1f41d402b2c` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.64 | equipment:phb-oil-flask | `dmg-64-1d23e54532a531b9` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.64 | equipment:phb-oil-flask | `dmg-64-25877874d07b7f9b` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-arrow-quiver-12 | `dmg-225-347a30af2c2d9db9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-arrow-quiver-20 | `dmg-225-347a30af2c2d9db9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-bolt-quiver-20 | `dmg-225-347a30af2c2d9db9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-bolt-quiver-40 | `dmg-225-347a30af2c2d9db9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-bone-case | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-bone-case | `dmg-225-f501fc38522a43e8` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-bullseye-lantern | `dmg-225-347a30af2c2d9db9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-composite-long-bow | `dmg-225-d50183d9a0cbcfbb` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-composite-short-bow | `dmg-225-d50183d9a0cbcfbb` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-heavy-crossbow | `dmg-225-d50183d9a0cbcfbb` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-holy-water | `dmg-225-3409d33f0a5910f4` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-holy-water | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-iron-spike | `dmg-225-3080a335d0c53ba1` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-iron-spike | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-large-chest | `dmg-225-0b1712757a4c794f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-large-chest | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-large-sack | `dmg-225-5c2a8dc82c470065` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-large-sack | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-leather-case | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-leather-case | `dmg-225-f501fc38522a43e8` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-light-crossbow | `dmg-225-d50183d9a0cbcfbb` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-long-bow | `dmg-225-d50183d9a0cbcfbb` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-oil-flask | `dmg-225-804ba69062a86968` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-oil-flask | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-rope-50 | `dmg-225-5c2a8dc82c470065` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-rope-50 | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-short-bow | `dmg-225-d50183d9a0cbcfbb` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-silver-mirror | `dmg-225-347a30af2c2d9db9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-small-chest | `dmg-225-0b1712757a4c794f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-small-chest | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-small-sack | `dmg-225-5c2a8dc82c470065` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-small-sack | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-standard-rations | `dmg-225-347a30af2c2d9db9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-tallow-candle | `dmg-225-0586883e8b690c5b` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-tallow-candle | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-thieves-tools | `dmg-225-90b02a4c3e47a923` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `DMG-p225-dmg-225-e8ddcda7bb0d9586-dmg-225-90b02a4c3e47a923` |
| DMG p.225 | equipment:phb-thieves-tools | `dmg-225-e8ddcda7bb0d9586` | lowercase-text-at-crop-top, open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `DMG-p225-dmg-225-e8ddcda7bb0d9586-dmg-225-90b02a4c3e47a923` |
| DMG p.225 | equipment:phb-tinder-box | `dmg-225-54f47a8e2e51d2e9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-tinder-box | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-torch | `dmg-225-54f47a8e2e51d2e9` | word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-torch | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-waterskin | `dmg-225-51c9c8bd7047f4da` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-waterskin | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-wax-candle | `dmg-225-0586883e8b690c5b` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| DMG p.225 | equipment:phb-wax-candle | `dmg-225-daa427afc5c9c4c7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| MM p.38 | spells:phb-magic-user-conjure-elemental | `mm-38-a93ca50ec7f68452` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| MM p.80 | spells:phb-magic-user-find-familiar | `mm-80-4763c4488f1f89f8` | word-crosses-crop-boundary | uncertain | `—` |
| MM p.86 | spells:phb-illusionist-summon-shadow | `mm-86-8dd30b53cd539fb4` | word-crosses-crop-boundary | uncertain | `—` |
| MM p.96 | spells:ua-druid-liveoak | `mm-96-bee2f053d301a800` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| MM p.99 | spells:ua-cleric-giant-insect | `mm-99-29523cd2ad745874` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:elven-door-detection | `phb-17-bf6470ab475b20f1` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:gnome-defenses | `phb-17-8afd58672532ae0a` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:gnome-stonework | `phb-17-d5a14f614541ac94` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:half-elf-traits | `phb-17-dc382126b5a48406` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:half-orc-traits | `phb-17-630056781eed94fb` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:halfling-resistance | `phb-17-26ff7f06742299d8` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:halfling-silent-approach | `phb-17-1bbec8bdd7d87da6` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:human-class-advancement | `phb-17-174fd2f6c66f0ce5` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:multiclass-xp-sharing | `phb-17-1eb8b003200ebf18` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:multiclass-xp-sharing | `phb-17-56dfbd4a02ddc304` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:multiclass-xp-sharing | `phb-17-ce0453e65d1548bf` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.17 | rules:multiclass-xp-sharing | `phb-17-e8aab44c1dab20cf` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.20 | classes:cleric | `phb-20-3f0ea61e7d8fb26c` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.20 | classes:druid | `phb-20-db8a35457e7d7ac4` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.34 | rules:alignment-change | `phb-34-05a547b95ef7650c` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.34 | rules:hit-points-meaning | `phb-34-07abd7c10343c944` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.34 | rules:learning-languages | `phb-34-7cff5d7e2835196a` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:phb-cleric-augury | `phb-45-70f936c31e9f094c` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:phb-cleric-chant | `phb-45-660ab3925c59d552` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:phb-cleric-detect-charm | `phb-45-fb05a3484e9a4312` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:phb-cleric-find-traps | `phb-45-9314811a5fc62dc9` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:phb-cleric-know-alignment | `phb-45-c13be3a0c6b253bc` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:phb-cleric-prayer | `phb-45-660ab3925c59d552` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:phb-cleric-resist-fire | `phb-45-7aa56111e15af627` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:phb-cleric-silence-15-radius | `phb-45-6c6b8b11bb1d9f63` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:ua-druid-know-alignment | `phb-45-c13be3a0c6b253bc` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.45 | spells:ua-magic-user-know-alignment | `phb-45-c13be3a0c6b253bc` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-animate-dead | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-astral-spell | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-cure-disease | `phb-47-924c18295a4678bc` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-dispel-magic | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-feign-death | `phb-47-666657233e53b016` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-glyph-of-warding | `phb-47-49ffeb9b2a9f3125` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-glyph-of-warding | `phb-47-66193a463a7c4ae7` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-insect-plague | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-locate-object | `phb-47-8e406830c6859da2` | lowercase-text-at-crop-top | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-prayer | `phb-47-43ba868b90cda100` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-cleric-remove-curse | `phb-47-86ad38aa6507e293` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-druid-charm-person-or-mammal | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-druid-cure-disease | `phb-47-217713dd87aad04f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-druid-dispel-magic | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-druid-plant-growth | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-illusionist-dispel-illusion | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-magic-user-dispel-magic | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-magic-user-hold-portal | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:phb-magic-user-locate-object | `phb-47-8e406830c6859da2` | lowercase-text-at-crop-top | uncertain | `—` |
| PHB p.47 | spells:phb-magic-user-remove-curse | `phb-47-86ad38aa6507e293` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:ua-cleric-abjure | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:ua-cleric-golem | `phb-47-43ba868b90cda100` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:ua-illusionist-dispel-magic | `phb-47-181bb1496ea6ef1d` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:ua-illusionist-dispel-magic | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.47 | spells:ua-magic-user-mordenkainens-disjunction | `phb-47-fa66266da842805d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-cleric-aerial-servant | `phb-51-3b31380b85a4a623` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-cleric-animate-object | `phb-51-5f5f86d3cf71f766` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-cleric-blade-barrier | `phb-51-51b7d0743a8499e7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-cleric-conjure-animals | `phb-51-5d2d60d9bf87390d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p51-phb-51-6406ecad46fd5fd3-phb-51-5d2d60d9bf87390d` |
| PHB p.51 | spells:phb-cleric-conjure-animals | `phb-51-6406ecad46fd5fd3` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p51-phb-51-6406ecad46fd5fd3-phb-51-5d2d60d9bf87390d` |
| PHB p.51 | spells:phb-cleric-find-the-path | `phb-51-917997fb9d12f133` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-cleric-heal | `phb-51-87060b71e4b8c7e2` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-cleric-part-water | `phb-51-68b4f9e5747cb766` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-cleric-speak-with-monsters | `phb-51-2c30577ae62313fb` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-druid-animate-rock | `phb-51-5f5f86d3cf71f766` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.51 | spells:phb-illusionist-conjure-animals | `phb-51-5d2d60d9bf87390d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p51-phb-51-6406ecad46fd5fd3-phb-51-5d2d60d9bf87390d` |
| PHB p.51 | spells:phb-illusionist-conjure-animals | `phb-51-6406ecad46fd5fd3` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p51-phb-51-6406ecad46fd5fd3-phb-51-5d2d60d9bf87390d` |
| PHB p.51 | spells:phb-magic-user-part-water | `phb-51-68b4f9e5747cb766` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-cleric-astral-spell | `phb-52-9b031acec03e27c1` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-cleric-astral-spell | `phb-52-d7f2d787d182fe8e` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-cleric-control-weather | `phb-52-5128efa092989c35` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-cleric-control-weather | `phb-52-e0ace45634b6087f` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-cleric-earthquake | `phb-52-44b100c20d52078e` | lowercase-text-at-crop-top, open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-cleric-speak-with-monsters | `phb-52-ce382101466c9ac5` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-cleric-stone-tell | `phb-52-3714dc95913f5354` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-cleric-word-of-recall | `phb-52-3d19d41371322435` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-druid-control-weather | `phb-52-5128efa092989c35` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-druid-control-weather | `phb-52-e0ace45634b6087f` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-druid-weather-summoning | `phb-52-e0ace45634b6087f` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-illusionist-astral-spell | `phb-52-9b031acec03e27c1` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-illusionist-astral-spell | `phb-52-d7f2d787d182fe8e` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-magic-user-astral-spell | `phb-52-9b031acec03e27c1` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-magic-user-astral-spell | `phb-52-d7f2d787d182fe8e` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:phb-magic-user-control-weather | `phb-52-e0ace45634b6087f` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.52 | spells:ua-cleric-succor | `phb-52-3d19d41371322435` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.53 | spells:phb-cleric-earthquake | `phb-53-b1b7f0362e2c60db` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.53 | spells:phb-cleric-gate | `phb-53-f33882a16bc5adad` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.53 | spells:phb-cleric-holy-unholy-word | `phb-53-43c2fac784298483` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.53 | spells:phb-cleric-regenerate | `phb-53-4d301b482927bff8` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p53-phb-53-8154ad45a836386c-phb-53-4d301b482927bff8` |
| PHB p.53 | spells:phb-cleric-regenerate | `phb-53-8154ad45a836386c` | lowercase-text-at-crop-top, open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p53-phb-53-8154ad45a836386c-phb-53-4d301b482927bff8` |
| PHB p.53 | spells:phb-cleric-restoration | `phb-53-fa92f55719534308` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.53 | spells:phb-cleric-resurrection | `phb-53-e58c81ad34915ee2` | lowercase-text-at-crop-top, open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.53 | spells:phb-cleric-symbol | `phb-53-3bb26efa633bcab5` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.53 | spells:phb-illusionist-emotion | `phb-53-27f9b6c5817a34ea` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.53 | spells:phb-magic-user-gate | `phb-53-f33882a16bc5adad` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:phb-illusionist-detect-magic | `phb-65-348390f4b5367ed0` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:phb-magic-user-burning-hands | `phb-65-76ce5d64f3ef245d` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:phb-magic-user-charm-monster | `phb-65-72c3246b7159c458` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:phb-magic-user-charm-person | `phb-65-72c3246b7159c458` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:phb-magic-user-comprehend-languages | `phb-65-b1cb13c83e03fffd` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:phb-magic-user-detect-magic | `phb-65-348390f4b5367ed0` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:phb-magic-user-mass-charm | `phb-65-72c3246b7159c458` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:phb-magic-user-mass-charm | `phb-65-bf40a5e48ec844c0` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.65 | spells:ua-magic-user-eyebite | `phb-65-72c3246b7159c458` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-illusionist-light | `phb-67-5f31d9867b5bd1a5` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-illusionist-shadow-magic | `phb-67-673b68f8fb7f3c55` | open-unpunctuated-at-crop-bottom | present-but-unlinked | `PHB-p67-phb-67-673b68f8fb7f3c55-phb-67-675b6d57b325748e` |
| PHB p.67 | spells:phb-illusionist-shadow-magic | `phb-67-675b6d57b325748e` | open-dangling-connector-at-crop-bottom | present-but-unlinked | `PHB-p67-phb-67-673b68f8fb7f3c55-phb-67-675b6d57b325748e` |
| PHB p.67 | spells:phb-magic-user-affect-normal-fires | `phb-67-5f31d9867b5bd1a5` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-identify | `phb-67-3c2f58c899e737eb` | open-dangling-connector-at-crop-bottom | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-jump | `phb-67-1b6a8d93af7072e8` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-light | `phb-67-5f31d9867b5bd1a5` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-magic-missile | `phb-67-673b68f8fb7f3c55` | open-unpunctuated-at-crop-bottom | present-but-unlinked | `PHB-p67-phb-67-673b68f8fb7f3c55-phb-67-675b6d57b325748e` |
| PHB p.67 | spells:phb-magic-user-magic-missile | `phb-67-675b6d57b325748e` | open-dangling-connector-at-crop-bottom | present-but-unlinked | `PHB-p67-phb-67-673b68f8fb7f3c55-phb-67-675b6d57b325748e` |
| PHB p.67 | spells:phb-magic-user-mending | `phb-67-31440ab7b27bc7f7` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-message | `phb-67-02837409b551b54d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-nystul-s-magic-aura | `phb-67-d14e6928f7c225e8` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-protection-from-evil | `phb-67-18a6fed5ff9bcfce` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-protection-from-evil-10-radius | `phb-67-18a6fed5ff9bcfce` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.67 | spells:phb-magic-user-push | `phb-67-05678ef87e373931` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-illusionist-audible-glamer | `phb-69-d81d1d54a29abf3c` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-illusionist-continual-darkness | `phb-69-a99a2093c0e6527f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-illusionist-darkness | `phb-69-a99a2093c0e6527f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-illusionist-detect-invisibility | `phb-69-a19106bd5c5418ae` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-illusionist-ventriloquism | `phb-69-bf1484f58c9102bc` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-audible-glamer | `phb-69-d81d1d54a29abf3c` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-continual-light | `phb-69-df07163039a4b69c` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-darkness-15-radius | `phb-69-a99a2093c0e6527f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-detect-evil | `phb-69-2bb098bdb9f5d57f` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-detect-invisibility | `phb-69-a19106bd5c5418ae` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-tenser-s-floating-disc | `phb-69-bf3bd2c1858a9e12` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-unseen-servant | `phb-69-78f8b5ff0d92a9f8` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-ventriloquism | `phb-69-bf1484f58c9102bc` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:phb-magic-user-write | `phb-69-f087bda910dd4536` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.69 | spells:ua-magic-user-leomunds-secure-shelter | `phb-69-78f8b5ff0d92a9f8` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.70 | spells:phb-illusionist-improved-invisibility | `phb-70-16f42449b4d7283c` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-illusionist-improved-invisibility | `phb-70-bebc3ac3e6bdc455` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-illusionist-invisibility | `phb-70-16f42449b4d7283c` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-illusionist-invisibility | `phb-70-bebc3ac3e6bdc455` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-illusionist-invisibility-10-radius | `phb-70-16f42449b4d7283c` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-illusionist-invisibility-10-radius | `phb-70-bebc3ac3e6bdc455` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-magic-user-esp | `phb-70-2676d5fbb45576ff` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.70 | spells:phb-magic-user-fool-s-gold | `phb-70-1af8327f16eafddb` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.70 | spells:phb-magic-user-forget | `phb-70-86fd3769b1c9ea77` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.70 | spells:phb-magic-user-hold-portal | `phb-70-fa84151177eac9ac` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.70 | spells:phb-magic-user-invisibility | `phb-70-16f42449b4d7283c` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-magic-user-invisibility | `phb-70-bebc3ac3e6bdc455` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-magic-user-invisibility-10-radius | `phb-70-16f42449b4d7283c` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-magic-user-invisibility-10-radius | `phb-70-bebc3ac3e6bdc455` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-magic-user-knock | `phb-70-fa84151177eac9ac` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.70 | spells:phb-magic-user-leomund-s-trap | `phb-70-e45afe6fb93c4099` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.70 | spells:phb-magic-user-levitate | `phb-70-f894b41b2bbc0703` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.70 | spells:phb-magic-user-mass-invisibility | `phb-70-16f42449b4d7283c` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.70 | spells:phb-magic-user-mass-invisibility | `phb-70-bebc3ac3e6bdc455` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `PHB-p70-phb-70-bebc3ac3e6bdc455-phb-70-16f42449b4d7283c` |
| PHB p.73 | spells:phb-cleric-feign-death | `phb-73-11c2d1c4b5a5dc5c` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p73-phb-73-11c2d1c4b5a5dc5c-phb-73-7cab504b7db0dbf9` |
| PHB p.73 | spells:phb-cleric-feign-death | `phb-73-7cab504b7db0dbf9` | open-unpunctuated-at-crop-bottom | present-but-unlinked | `PHB-p73-phb-73-11c2d1c4b5a5dc5c-phb-73-7cab504b7db0dbf9` |
| PHB p.73 | spells:phb-druid-feign-death | `phb-73-11c2d1c4b5a5dc5c` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p73-phb-73-11c2d1c4b5a5dc5c-phb-73-7cab504b7db0dbf9` |
| PHB p.73 | spells:phb-druid-feign-death | `phb-73-7cab504b7db0dbf9` | open-unpunctuated-at-crop-bottom | present-but-unlinked | `PHB-p73-phb-73-11c2d1c4b5a5dc5c-phb-73-7cab504b7db0dbf9` |
| PHB p.73 | spells:phb-illusionist-dispel-illusion | `phb-73-98eecbf4002bcd76` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-illusionist-shadow-magic | `phb-73-98d1b9198302b818` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-clairaudience | `phb-73-22dd3feb371df612` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-clairvoyance | `phb-73-395450761ec3b225` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-delayed-blast-fire-ball | `phb-73-98d1b9198302b818` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-dispel-magic | `phb-73-98eecbf4002bcd76` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-erase | `phb-73-61b57b7fc1170135` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-explosive-runes | `phb-73-61b57b7fc1170135` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-feign-death | `phb-73-11c2d1c4b5a5dc5c` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p73-phb-73-11c2d1c4b5a5dc5c-phb-73-7cab504b7db0dbf9` |
| PHB p.73 | spells:phb-magic-user-feign-death | `phb-73-7cab504b7db0dbf9` | open-unpunctuated-at-crop-bottom | present-but-unlinked | `PHB-p73-phb-73-11c2d1c4b5a5dc5c-phb-73-7cab504b7db0dbf9` |
| PHB p.73 | spells:phb-magic-user-fireball | `phb-73-98d1b9198302b818` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-flame-arrow | `phb-73-84514249cb2eaeae` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-fly | `phb-73-d2887b0accad0f0d` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-gust-of-wind | `phb-73-5cd47d2fad8d20af` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-hold-portal | `phb-73-98eecbf4002bcd76` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.73 | spells:phb-magic-user-meteor-swarm | `phb-73-98d1b9198302b818` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.73 | spells:ua-magic-user-mordenkainens-disjunction | `phb-73-98eecbf4002bcd76` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-illusionist-confusion | `phb-76-cafae124d650d072` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-illusionist-fear | `phb-76-02c912d50f8cb1f8` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-illusionist-illusionary-script | `phb-76-cafae124d650d072` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-charm-monster | `phb-76-2714211a5cbbaca6` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-confusion | `phb-76-cafae124d650d072` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-dig | `phb-76-694d2f957f65001d` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-dimension-door | `phb-76-66d3f3a21136f4ff` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p76-phb-76-c68e94613dac8220-phb-76-66d3f3a21136f4ff` |
| PHB p.76 | spells:phb-magic-user-dimension-door | `phb-76-c68e94613dac8220` | word-crosses-crop-boundary | present-but-unlinked | `PHB-p76-phb-76-c68e94613dac8220-phb-76-66d3f3a21136f4ff` |
| PHB p.76 | spells:phb-magic-user-enchanted-weapon | `phb-76-de4338b8a813a25d` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-extension-i | `phb-76-990133d3ec941cae` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-extension-ii | `phb-76-990133d3ec941cae` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-extension-iii | `phb-76-990133d3ec941cae` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-fear | `phb-76-02c912d50f8cb1f8` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-fire-charm | `phb-76-79216a190fde1ac3` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-mass-charm | `phb-76-2714211a5cbbaca6` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-mass-charm | `phb-76-27e3046c5786738f` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:phb-magic-user-symbol | `phb-76-cafae124d650d072` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:ua-cleric-cloak-of-fear | `phb-76-02c912d50f8cb1f8` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:ua-magic-user-eyebite | `phb-76-02c912d50f8cb1f8` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.76 | spells:ua-magic-user-eyebite | `phb-76-2714211a5cbbaca6` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-druid-fire-trap | `phb-77-788c6ace2a2ff632` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-druid-heat-metal | `phb-77-ac5e58b99c38af1f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-illusionist-hallucinatory-terrain | `phb-77-3f44ddf78d284cf3` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-illusionist-massmorph | `phb-77-85852837cfb0e41b` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-illusionist-veil | `phb-77-3f44ddf78d284cf3` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-fire-charm | `phb-77-8d84de2eb2b9526f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-fire-shield | `phb-77-4442940e7e516235` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-fire-trap | `phb-77-788c6ace2a2ff632` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-fumble | `phb-77-0755ed14aa8b24d1` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p77-phb-77-1b2cc8621d6dd7f4-phb-77-0755ed14aa8b24d1` |
| PHB p.77 | spells:phb-magic-user-fumble | `phb-77-1b2cc8621d6dd7f4` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p77-phb-77-1b2cc8621d6dd7f4-phb-77-0755ed14aa8b24d1` |
| PHB p.77 | spells:phb-magic-user-globe-of-invulnerability | `phb-77-cd253d8726ea6bbd` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-hallucinatory-terrain | `phb-77-3f44ddf78d284cf3` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-hallucinatory-terrain | `phb-77-e9e27c68366e569d` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-ice-storm | `phb-77-ac5e58b99c38af1f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-massmorph | `phb-77-24c3d3cd343e720a` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-massmorph | `phb-77-85852837cfb0e41b` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-minor-globe-of-invulnerability | `phb-77-cd253d8726ea6bbd` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.77 | spells:phb-magic-user-wall-of-ice | `phb-77-ac5e58b99c38af1f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-illusionist-demi-shadow-magic | `phb-79-b0f7d9277f496ffa` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-illusionist-shadow-magic | `phb-79-ed93e911b042a650` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-airy-water | `phb-79-bc70cc35621f0239` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-animal-growth | `phb-79-79f670b40253907e` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-animate-dead | `phb-79-fd21dc88c4d0bdb7` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-bigby-s-forceful-hand | `phb-79-830f2c3a6eb4847e` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-bigby-s-forceful-hand | `phb-79-ff78fcee663366bc` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-bigby-s-grasping-hand | `phb-79-830f2c3a6eb4847e` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-bigby-s-grasping-hand | `phb-79-ff78fcee663366bc` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-bigby-s-interposing-hand | `phb-79-830f2c3a6eb4847e` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-bigby-s-interposing-hand | `phb-79-ff78fcee663366bc` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-cloudkill | `phb-79-6b06633b719af9d9` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-cone-of-cold | `phb-79-ed93e911b042a650` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-conjure-elemental | `phb-79-2d54efc29e2bf6bd` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-wall-of-ice | `phb-79-b0f7d9277f496ffa` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.79 | spells:phb-magic-user-wizard-eye | `phb-79-f617eecbf5c34fb1` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-druid-reincarnate | `phb-85-5c2728f03bc76bc3` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-druid-reincarnate | `phb-85-704a162a8b700892` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-illusionist-projected-image | `phb-85-d871bc84dbc26963` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-magic-user-legend-lore | `phb-85-d297f0e93f3cd7f6` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-magic-user-lower-water | `phb-85-fb20280472119985` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-magic-user-monster-summoning-iv | `phb-85-42e116063f13f24b` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-magic-user-move-earth | `phb-85-be8d11c31f4546db` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-magic-user-otiluke-s-freezing-sphere | `phb-85-06bdac74165d188c` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p85-phb-85-934b24195e975fe0-phb-85-06bdac74165d188c` |
| PHB p.85 | spells:phb-magic-user-otiluke-s-freezing-sphere | `phb-85-934b24195e975fe0` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `PHB-p85-phb-85-934b24195e975fe0-phb-85-06bdac74165d188c` |
| PHB p.85 | spells:phb-magic-user-part-water | `phb-85-66126215366bbd87` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-magic-user-project-image | `phb-85-d871bc84dbc26963` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.85 | spells:phb-magic-user-reincarnation | `phb-85-5c2728f03bc76bc3` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.87 | spells:phb-magic-user-cacodemon | `phb-87-e680e224d279cf73` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.87 | spells:phb-magic-user-charm-plants | `phb-87-8ae8ffbe14bbf638` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.87 | spells:phb-magic-user-delayed-blast-fire-ball | `phb-87-c9330ad5e4d696a3` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.87 | spells:phb-magic-user-drawmij-s-instant-summons | `phb-87-3fe2bbdac7c57f9b` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.87 | spells:phb-magic-user-duo-dimension | `phb-87-3a23a5bcedf4f2bc` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-confusion | `phb-97-49e30283c1665d1d` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-dispel-exhaustion | `phb-97-ebb512adcc598b87` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-emotion | `phb-97-526e814a7911cda7` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-emotion | `phb-97-ae8878a6e74a62d2` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-improved-invisibility | `phb-97-f0e7940d16a5f595` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-mass-suggestion | `phb-97-f4882a42538b5273` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-massmorph | `phb-97-28212f933452c716` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-non-detection | `phb-97-2f7d5a61a66cae9d` | open-dangling-connector-at-crop-bottom | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-paralyzation | `phb-97-bae60802f643b688` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-permanent-illusion | `phb-97-c5dced90b4af2b19` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-programmed-illusion | `phb-97-c5dced90b4af2b19` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-rope-trick | `phb-97-01b348582e1299d6` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-spectral-force | `phb-97-c5dced90b4af2b19` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:phb-illusionist-suggestion | `phb-97-f4882a42538b5273` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:ua-illusionist-advanced-illusion | `phb-97-c5dced90b4af2b19` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:ua-illusionist-mislead | `phb-97-5d9a63cc0207d42d` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:ua-illusionist-mislead | `phb-97-f0e7940d16a5f595` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.97 | spells:ua-illusionist-phantasmagoria | `phb-97-c5dced90b4af2b19` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | rules:scroll-casting | `phb-100-dd9e72c0ef92a972` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | rules:scroll-casting | `phb-100-effad17565d73c3f` | lowercase-text-at-crop-top, open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | rules:spell-components | `phb-100-34c904a0d255a3e3` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | rules:spell-memory | `phb-100-1befc4874c87127d` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | spells:phb-illusionist-alter-reality | `phb-100-6469aa018cf01d23` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | spells:phb-illusionist-astral-spell | `phb-100-b61d2fce50b95014` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | spells:phb-illusionist-first-level-magic-user-spells | `phb-100-a378bac27cc63057` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | spells:phb-illusionist-first-level-magic-user-spells | `phb-100-d887d589689ce363` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | spells:phb-illusionist-prismatic-spray | `phb-100-c2931cc28a026844` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | spells:phb-illusionist-prismatic-wall | `phb-100-345783e832fc789a` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | spells:phb-illusionist-veil | `phb-100-956bd8d706c2fd7f` | lowercase-text-at-crop-top, open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.100 | spells:phb-illusionist-vision | `phb-100-967b3ce4dfc8726c` | word-crosses-crop-boundary | uncertain | `—` |
| PHB p.101 | rules:dungeon-expedition | `phb-101-d728c40a07fa85a6` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.101 | rules:encumbrance | `phb-101-98bddce6e36c7aa1` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.101 | rules:scroll-casting | `phb-101-9c874e3123a787f4` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.103 | rules:encounter-types | `phb-103-88b75c9a9b61cf3f` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.103 | rules:surprise | `phb-103-7386febe0b3acb7f` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.117 | classes:bard | `phb-117-32682302d43f82b9` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.117 | classes:bard | `phb-117-a345fbee29bf7cc8` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| PHB p.117 | progressionExplainer:progression-explainer | `phb-117-a345fbee29bf7cc8` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.10 | rules:ua-drow-pc-exceptions | `ua-10-2793e2e991707128` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.10 | rules:ua-drow-pc-exceptions | `ua-10-f468dd14a8ecbf82` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.10 | rules:ua-duergar-defenses | `ua-10-64bd5235e2b762cc` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.10 | rules:ua-duergar-defenses | `ua-10-cb52b65dbb8ddab7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.10 | rules:ua-duergar-light | `ua-10-4e64d22c23d436ab` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.10 | rules:ua-elven-subrace-adjustments | `ua-10-0f52a85b943013cf` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p10-ua-10-391dc1287b053d98-ua-10-0f52a85b943013cf` |
| UA p.10 | rules:ua-elven-subrace-adjustments | `ua-10-391dc1287b053d98` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p10-ua-10-391dc1287b053d98-ua-10-0f52a85b943013cf` |
| UA p.10 | rules:ua-elven-subrace-adjustments | `ua-10-46ba4e69b0474ea1` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p10-ua-10-d3cdc07db7c18a50-ua-10-46ba4e69b0474ea1` |
| UA p.10 | rules:ua-elven-subrace-adjustments | `ua-10-d3cdc07db7c18a50` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p10-ua-10-d3cdc07db7c18a50-ua-10-46ba4e69b0474ea1` |
| UA p.11 | rules:ua-deep-gnome-pc-exceptions | `ua-11-397ffe7138302839` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-deep-gnome-pc-exceptions | `ua-11-55b70f2a7155ee5c` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-deep-gnome-pc-exceptions | `ua-11-6ac27aa06831529c` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-deep-gnome-pc-exceptions | `ua-11-781ac97ee1e7f6b8` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-deep-gnome-pc-exceptions | `ua-11-969c65949c7677c5` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-deep-gnome-pc-exceptions | `ua-11-c5cb3d44c488a151` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-deep-gnome-pc-exceptions | `ua-11-cdea0eeb61b12851` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-drow-innate-magic | `ua-11-7329d337f0ecccba` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-drow-innate-magic | `ua-11-d7974fdb9649b29e` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-drow-pc-exceptions | `ua-11-0735b79ce8937fb8` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-drow-pc-exceptions | `ua-11-7ff12a90ef48bf49` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.11 | rules:ua-half-elf-ancestry | `ua-11-4207ce7d849dc10a` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.16 | classes:ua-cavalier | `ua-16-837c63c082c49285` | lowercase-text-at-crop-top, open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.16 | classes:ua-druid | `ua-16-7354215a4bdb46ab` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.16 | classes:ua-paladin | `ua-16-73a314c55d8d5fee` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.16 | progressionExplainer:progression-explainer | `ua-16-7354215a4bdb46ab` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.20 | classes:ua-barbarian | `ua-20-33eedb8c914e5be6` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.21 | classes:ranger | `ua-21-66c1eb3c07abb86e` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.21 | classes:ua-barbarian | `ua-21-fa96c3c30d3e2128` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.22 | classes:fighter | `ua-22-d3911bf75675c6dc` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.22 | classes:ranger | `ua-22-1af50f90513a4489` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.22 | classes:ua-barbarian | `ua-22-d3911bf75675c6dc` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.22 | classes:ua-cavalier | `ua-22-d3911bf75675c6dc` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.25 | classes:ua-thief-acrobat | `ua-25-d9408cd939faafb7` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.25 | progressionExplainer:progression-explainer | `ua-25-b608e83c8d71622f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-bardiche | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-bardiche | `ua-27-b5a55b3ca3af3fa8` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-bastard-sword | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-bastard-sword | `ua-27-9a9b44f53e17f270` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-battle-axe | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-battle-axe | `ua-27-921b0def4dabfd3f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-bec-de-corbin | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-bec-de-corbin | `ua-27-331d9488424a8a2a` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-bill-guisarme | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-bill-guisarme | `ua-27-87e6903f99192b1b` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-bo-stick | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-bo-stick | `ua-27-c192b1b28663cbb4` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-club | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-club | `ua-27-3ea722e3e9c2c724` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-dagger | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-dagger | `ua-27-9f86881bd4f284aa` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-footmans-mace | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-footmans-mace | `ua-27-eaa7d73a556248fc` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-hand-axe | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-hand-axe | `ua-27-eb29f7a510c22b16` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-horsemans-mace | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-horsemans-mace | `ua-27-fc9efb0f948c7ea8` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-morning-star | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-morning-star | `ua-27-ef6755a59aaa4627` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-partisan | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-partisan | `ua-27-e7b051f2a37125d4` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-quarterstaff | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-quarterstaff | `ua-27-ae8993a7c5d1198f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-ranseur | `ua-27-1beaaf66982084fb` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-ranseur | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-scimitar | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-scimitar | `ua-27-4200d22247dd06ab` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-short-sword | `ua-27-1c66182c93d9b793` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-short-sword | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-spear | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-spear | `ua-27-52d9b6a64f857e25` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-trident | `ua-27-26f8877d60af7a54` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:phb-trident | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-two-handed-sword | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:phb-two-handed-sword | `ua-27-e61b87feb138b7ef` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:ua-falchion | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-falchion | `ua-27-d9092fbcd0d2049a` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:ua-khopesh | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-khopesh | `ua-27-e9000bebb30664bb` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:ua-knife | `ua-27-27c9dd6fbfabfd8a` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:ua-knife | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-lasso | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-lasso | `ua-27-d365279a5d92c7f7` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:ua-man-catcher | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-man-catcher | `ua-27-7314eeda0229671d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:ua-sap | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-spiked-buckler | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-spiked-buckler | `ua-27-60f991e43b511f9d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.27 | equipment:ua-staff-sling | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-whip | `ua-27-2c829644bd303eb8` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.27 | equipment:ua-whip | `ua-27-3e92cd05634cd3d9` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-club | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-club | `ua-28-5749c907ea909589` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-club | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-composite-long-bow | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-composite-long-bow | `ua-28-2d37ba236364b634` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-composite-long-bow | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-composite-short-bow | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-composite-short-bow | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-composite-short-bow | `ua-28-e2fcbfe7b1759497` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-dagger | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-dagger | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-dagger | `ua-28-f2747c70d6bcbe68` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-dart | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-dart | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-dart | `ua-28-c47f44ce83a18746` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-hand-axe | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-hand-axe | `ua-28-66d5b1b042a9d40f` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-hand-axe | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-heavy-crossbow | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-heavy-crossbow | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-heavy-crossbow | `ua-28-da3f6a732e5dad03` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-light-crossbow | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-light-crossbow | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-light-crossbow | `ua-28-e0adc0e303fc0fe6` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-long-bow | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-long-bow | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-long-bow | `ua-28-eae68106547df3f9` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-short-bow | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-short-bow | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:phb-sling-bullet | `ua-28-73a3e8aed178e52a` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-sling-stone | `ua-28-607d1b22ce3047f9` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-sling-stone | `ua-28-73a3e8aed178e52a` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-spear | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-spear | `ua-28-91faf8f2c4c88922` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:phb-spear | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:ua-atlatl-javelin | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-atlatl-javelin | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:ua-blowgun-needle | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-blowgun-needle | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:ua-blowgun-needle | `ua-28-ba270fa43df6a9e1` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-hand-crossbow | `ua-28-228f2ae47823d82d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-hand-crossbow | `ua-28-26806da269f6f9ce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-hand-crossbow | `ua-28-a4aceb548ae4a6c6` | open-hyphenated-fragment-at-crop-bottom | uncertain | `—` |
| UA p.28 | equipment:ua-knife | `ua-28-0703212be457ca70` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-knife | `ua-28-73a3e8aed178e52a` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-lasso | `ua-28-73a3e8aed178e52a` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-lasso | `ua-28-9f41c065eb8b505e` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-staff-sling | `ua-28-437621b66931c435` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.28 | equipment:ua-staff-sling | `ua-28-73a3e8aed178e52a` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.32 | spells:ua-cleric-ceremony | `ua-32-095f8c7edea67911` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.32 | spells:ua-cleric-ceremony | `ua-32-5a622091a8d67584` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.32 | spells:ua-cleric-combine | `ua-32-a956c19a9915b04a` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.32 | spells:ua-cleric-forbiddance | `ua-32-27d1632c9513546a` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.32 | spells:ua-cleric-magical-vestment | `ua-32-27d1632c9513546a` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.32 | spells:ua-druid-ceremony | `ua-32-095f8c7edea67911` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.32 | spells:ua-druid-ceremony | `ua-32-5a622091a8d67584` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.33 | spells:ua-cleric-combine | `ua-33-3321ed87c64a665e` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.33 | spells:ua-cleric-invisibility-to-undead | `ua-33-3179d43cb8df9042` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.33 | spells:ua-cleric-magic-stone | `ua-33-f2c324339c5b8e94` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.33 | spells:ua-cleric-penetrate-disguise | `ua-33-731c0105e88a3403` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.33 | spells:ua-cleric-portent | `ua-33-fd3abfeef08eba91` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.36 | spells:ua-cleric-cloudburst | `ua-36-d3cbd61a1c1570f0` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.36 | spells:ua-cleric-deaths-door | `ua-36-20cdd841e8c96afa` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.36 | spells:ua-cleric-flame-walk | `ua-36-5affde85ccd4831a` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.36 | spells:ua-cleric-magical-vestment | `ua-36-f4839a4016f68897` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.36 | spells:ua-cleric-meld-into-stone | `ua-36-83d717c01e0386df` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.36 | spells:ua-cleric-negative-plane-protection | `ua-36-216a490b743de56e` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.36 | spells:ua-druid-cloudburst | `ua-36-d3cbd61a1c1570f0` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.36 | spells:ua-magic-user-cloudburst | `ua-36-d3cbd61a1c1570f0` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.39 | spells:ua-cleric-air-walk | `ua-39-09d2929e70a5e3b7` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.39 | spells:ua-cleric-animate-dead-monsters | `ua-39-7ec38d9160db319f` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.39 | spells:ua-cleric-golem | `ua-39-1f9e5c24696085d3` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p39-ua-39-f6cbd1cf71709a59-ua-39-1f9e5c24696085d3` |
| UA p.39 | spells:ua-cleric-golem | `ua-39-f6cbd1cf71709a59` | word-crosses-crop-boundary | present-but-unlinked | `UA-p39-ua-39-f6cbd1cf71709a59-ua-39-1f9e5c24696085d3` |
| UA p.39 | spells:ua-cleric-magic-font | `ua-39-6e7565daf60fcb57` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.39 | spells:ua-cleric-rainbow | `ua-39-ba027051c685e367` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.40 | spells:ua-cleric-forbiddance | `ua-40-4c1ac21e705d4aff` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.40 | spells:ua-cleric-heroes-feast | `ua-40-a64d4c93e3581497` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.40 | spells:ua-cleric-rainbow | `ua-40-6b3cf3453b690aca` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.40 | spells:ua-cleric-spike-stones | `ua-40-8ae5c403ad4eab7f` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.40 | spells:ua-druid-spike-stones | `ua-40-8ae5c403ad4eab7f` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.41 | spells:ua-cleric-exaction | `ua-41-8751ddc2b583b327` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.41 | spells:ua-cleric-heroes-feast | `ua-41-35f2137a704a4da5` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.41 | spells:ua-cleric-heroes-feast | `ua-41-cbcf83d6091dfd73` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.41 | spells:ua-cleric-succor | `ua-41-1b1a6e0ea2cc258f` | open-dangling-connector-at-crop-bottom | present-but-unlinked | `UA-p41-ua-41-1b1a6e0ea2cc258f-ua-41-299a05cb8670b83b` |
| UA p.41 | spells:ua-cleric-succor | `ua-41-299a05cb8670b83b` | word-crosses-crop-boundary | present-but-unlinked | `UA-p41-ua-41-1b1a6e0ea2cc258f-ua-41-299a05cb8670b83b` |
| UA p.41 | spells:ua-druid-ceremony | `ua-41-4557287ffcf6430b` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.41 | spells:ua-druid-ceremony | `ua-41-f78b993657f073f4` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.41 | spells:ua-magic-user-succor | `ua-41-1b1a6e0ea2cc258f` | open-dangling-connector-at-crop-bottom | present-but-unlinked | `UA-p41-ua-41-1b1a6e0ea2cc258f-ua-41-299a05cb8670b83b` |
| UA p.41 | spells:ua-magic-user-succor | `ua-41-299a05cb8670b83b` | word-crosses-crop-boundary | present-but-unlinked | `UA-p41-ua-41-1b1a6e0ea2cc258f-ua-41-299a05cb8670b83b` |
| UA p.44 | spells:ua-druid-changestaff | `ua-44-b5f334544790fddf` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.44 | spells:ua-druid-liveoak | `ua-44-a1612e4699e1d22e` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.44 | spells:ua-druid-moonbeam | `ua-44-266b85e29c05096f` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.44 | spells:ua-druid-transmute-water-to-dust | `ua-44-e19792bee943749d` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.44 | spells:ua-magic-user-transmute-water-to-dust | `ua-44-e19792bee943749d` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-druid-sunray | `ua-45-5cea5992cae35db7` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-colored-lights | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-colored-lights | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-dim | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-dim | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-haze | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-haze | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-mask | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-mask | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-mirage | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-mirage | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-noise | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-noise | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-rainbow | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-rainbow | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-two-dlusion | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-illusionist-two-dlusion | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-bee | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-bee | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-belch | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-belch | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-blink | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-blink | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-bluelight | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-bluelight | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-bug | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-bug | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-change | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-change | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-chill | `ua-45-06dec7b55ced6ee5` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-clean | `ua-45-2a00aed7506b7b48` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-cough | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-cough | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-creak | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-creak | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-curdle | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-curdle | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-dampen | `ua-45-d91e23be6f84e15b` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-dirty | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-dirty | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-distract | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-distract | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-dry | `ua-45-80a7af0169a50490` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-dust | `ua-45-adaef0d895a2368a` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-dusty | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-dusty | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-exterminate | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-exterminate | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-firefinger | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-firefinger | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-flavor | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-flavor | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-footfall | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-footfall | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-freshen | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-freshen | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-gather | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-gather | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-giggle | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-giggle | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-gnats | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-gnats | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-groan | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-groan | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-hairy | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-hairy | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-hide | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-hide | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-knot | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-knot | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-moan | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-moan | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-mouse | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-mouse | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-mute | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-mute | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-nod | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-nod | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-palm | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-palm | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-polish | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-polish | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-present | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-present | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-rattle | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-rattle | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-ravel | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-ravel | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-salt | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-salt | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-scratch | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-scratch | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-shine | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-shine | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-smokepuff | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-smokepuff | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-sneeze | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-sneeze | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-sour | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-sour | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-spice | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-spice | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-spider | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-spider | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-spill | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-spill | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-sprout | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-sprout | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-stitch | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-stitch | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-sweeten | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-sweeten | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tangle | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tangle | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tap | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tap | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tarnish | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tarnish | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-thump | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-thump | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tie | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tie | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tweak | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-tweak | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-twitch | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-twitch | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-unlock | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-unlock | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-untie | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-untie | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-warm | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-warm | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-whistle | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-whistle | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-wilt | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-wilt | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-wink | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-wink | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-wrap | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-wrap | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-yawn | `ua-45-3a23a8941d028764` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.45 | spells:ua-magic-user-yawn | `ua-45-965c1d488b10f161` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-curdle | `ua-46-1d0bf9b64f58cae4` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-dust | `ua-46-4374f08dbe63db45` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-exterminate | `ua-46-21107d7790f81ef7` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-flavor | `ua-46-997ed91a3bdfe0ac` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-freshen | `ua-46-4ec92a6b2c9d48f0` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-gather | `ua-46-45b523c886bd2865` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-polish | `ua-46-672efc1c49b4395a` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-ravel | `ua-46-0065190ff703b8f8` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-salt | `ua-46-56fa0f572e2f4207` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-shine | `ua-46-0b387ee8853bcb4c` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-spice | `ua-46-06a44800e2814619` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-sweeten | `ua-46-7f71b4973b7d3643` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-tarnish | `ua-46-4b71f710589ca05b` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.46 | spells:ua-magic-user-wilt | `ua-46-1d0bf9b64f58cae4` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-curdle | `ua-47-2f690b30741954d1` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-dirty | `ua-47-fe0286f31330d23d` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-dusty | `ua-47-c64ff68537df8507` | lowercase-text-at-crop-top | present-but-unlinked | `UA-p47-ua-47-f3317fa5b7b97f98-ua-47-c64ff68537df8507` |
| UA p.47 | spells:ua-magic-user-dusty | `ua-47-f3317fa5b7b97f98` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p47-ua-47-f3317fa5b7b97f98-ua-47-c64ff68537df8507` |
| UA p.47 | spells:ua-magic-user-hairy | `ua-47-335b2d077c6c881d` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-knot | `ua-47-37dd20fe31a0f3f6` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-ravel | `ua-47-8fdd047da960a4cf` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-sour | `ua-47-14358eda5863a128` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-spill | `ua-47-394c7835fae211f3` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-sweeten | `ua-47-8e16a504a57ad24c` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-warm | `ua-47-3ad0b8b57eb02dce` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.47 | spells:ua-magic-user-wrap | `ua-47-316f02afac46789c` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.52 | spells:ua-magic-user-armor | `ua-52-0ddbdc75902e3cf0` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.52 | spells:ua-magic-user-firewater | `ua-52-7ea756c7e41fec4a` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.52 | spells:ua-magic-user-grease | `ua-52-867ab4afc7420918` | open-unpunctuated-at-crop-bottom | uncertain | `—` |
| UA p.52 | spells:ua-magic-user-melt | `ua-52-049ee90d0c5fab54` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p52-ua-52-049ee90d0c5fab54-ua-52-3ecff922729c0daf` |
| UA p.52 | spells:ua-magic-user-melt | `ua-52-3ecff922729c0daf` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `UA-p52-ua-52-049ee90d0c5fab54-ua-52-3ecff922729c0daf` |
| UA p.52 | spells:ua-magic-user-mount | `ua-52-afa974f15e57e5d4` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.52 | spells:ua-magic-user-precipitation | `ua-52-499e8fd308529d99` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.52 | spells:ua-magic-user-run | `ua-52-99dbc052cff5dd5d` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.53 | spells:ua-magic-user-bind | `ua-53-cc7491d177fcc2a9` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p53-ua-53-f9723ec2f3601c3c-ua-53-cc7491d177fcc2a9` |
| UA p.53 | spells:ua-magic-user-bind | `ua-53-f9723ec2f3601c3c` | word-crosses-crop-boundary | present-but-unlinked | `UA-p53-ua-53-f9723ec2f3601c3c-ua-53-cc7491d177fcc2a9` |
| UA p.53 | spells:ua-magic-user-deeppockets | `ua-53-a561721856c26a3a` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.53 | spells:ua-magic-user-flaming-sphere | `ua-53-5f9743d07a42b328` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.53 | spells:ua-magic-user-irritation | `ua-53-5406713df7c67f94` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.53 | spells:ua-magic-user-taunt | `ua-53-be2ddaa4ed75e643` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.53 | spells:ua-magic-user-wizard-mark | `ua-53-76c68881c4704f7b` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.54 | spells:ua-magic-user-irritation | `ua-54-bcbd104618a8bc03` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.54 | spells:ua-magic-user-know-alignment | `ua-54-da3bb2d50dc56b8e` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.54 | spells:ua-magic-user-melfs-acid-arrow | `ua-54-00770a5a2ac01e36` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.54 | spells:ua-magic-user-melfs-acid-arrow | `ua-54-a982607637944c03` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.54 | spells:ua-magic-user-preserve | `ua-54-66470cbea5867652` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.54 | spells:ua-magic-user-tashas-uncontrollable-hideous-laughter | `ua-54-00fe8713e9506547` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.54 | spells:ua-magic-user-vocalize | `ua-54-3c2b93fbe37000bb` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.56 | spells:ua-magic-user-dispel-illusion | `ua-56-5f7b24d0df6c8df7` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.56 | spells:ua-magic-user-evards-black-tentacles | `ua-56-06c3e557c995de58` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.56 | spells:ua-magic-user-melfs-minute-meteors | `ua-56-e67cb01f3aaedaca` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.56 | spells:ua-magic-user-secret-page | `ua-56-2bd13c9775a6d2ed` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.56 | spells:ua-magic-user-sepia-snake-sigil | `ua-56-4629a448408d4e27` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.56 | spells:ua-magic-user-wind-wall | `ua-56-570795d3460bed55` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.58 | spells:ua-illusionist-ultravision | `ua-58-6a839b9d9141f495` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.58 | spells:ua-magic-user-avoidance | `ua-58-20ec9455da7c9b9a` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.58 | spells:ua-magic-user-dismissal | `ua-58-3856f926973d9fba` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.58 | spells:ua-magic-user-dolor | `ua-58-849ff07c84fb3cc1` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.58 | spells:ua-magic-user-fabricate | `ua-58-82353a2fdf1b7541` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.58 | spells:ua-magic-user-ultravision | `ua-58-6a839b9d9141f495` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.59 | spells:ua-magic-user-chain-lightning | `ua-59-5c8d3debddd6db06` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.59 | spells:ua-magic-user-contingency | `ua-59-fa6e239da74db6dd` | open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | present-but-unlinked | `UA-p59-ua-59-fa6e239da74db6dd-ua-60-b42c889225a311fa` |
| UA p.59 | spells:ua-magic-user-demand | `ua-59-1e92c9e4a84c1098` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.59 | spells:ua-magic-user-leomunds-lamentable-belabourment | `ua-59-0eb879ff07d5c70f` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.59 | spells:ua-magic-user-sending | `ua-59-bf31723c3c29bdf0` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.60 | spells:ua-magic-user-contingency | `ua-60-b42c889225a311fa` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `UA-p59-ua-59-fa6e239da74db6dd-ua-60-b42c889225a311fa` |
| UA p.60 | spells:ua-magic-user-ensnarement | `ua-60-d352afb451fcc48c` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.60 | spells:ua-magic-user-eyebite | `ua-60-501c1ac33ec87cd7` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.63 | spells:ua-magic-user-binding | `ua-63-b0d4ae3c131da5c0` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.63 | spells:ua-magic-user-torment | `ua-63-f5a4ac514aac21fb` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.63 | spells:ua-magic-user-truename | `ua-63-6a84d35af1c8ca86` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.63 | spells:ua-magic-user-volley | `ua-63-531186bb675f5ad0` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.64 | spells:ua-magic-user-binding | `ua-64-31918b1ea405534d` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.64 | spells:ua-magic-user-demand | `ua-64-af340a009ead1373` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.64 | spells:ua-magic-user-otilukes-telekinetic-sphere | `ua-64-56ee6ee531fa16cd` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.64 | spells:ua-magic-user-sink | `ua-64-08e0d3f701b31eb2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-illusionist-colored-lights | `ua-65-18fb3a34be91ee14` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-illusionist-dim | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-illusionist-haze | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-illusionist-mask | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-illusionist-mirage | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-illusionist-noise | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-illusionist-two-dlusion | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-bee | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-belch | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-blink | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-bluelight | `ua-65-3542788f25d1b0e3` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-bug | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-change | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-chill | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-clean | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-color | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-cough | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-creak | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-crystalbrittle | `ua-65-8a05afab384ec11d` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-curdle | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-dampen | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-dirty | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-distract | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-dry | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-dust | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-dusty | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-energy-drain | `ua-65-382d6fd5f491112e` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-exterminate | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-firefinger | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-flavor | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-footfall | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-freshen | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-gather | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-giggle | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-gnats | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-groan | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-hairy | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-hide | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-knot | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-moan | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-mordenkainens-disjunction | `ua-65-842073055820a7d9` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `UA-p65-ua-65-c0ab3c87dfa23f97-ua-65-842073055820a7d9` |
| UA p.65 | spells:ua-magic-user-mordenkainens-disjunction | `ua-65-c0ab3c87dfa23f97` | word-crosses-crop-boundary | present-but-unlinked | `UA-p65-ua-65-c0ab3c87dfa23f97-ua-65-842073055820a7d9` |
| UA p.65 | spells:ua-magic-user-mouse | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-mute | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-nod | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-palm | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-polish | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-present | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-rattle | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-ravel | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-salt | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-scratch | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-shine | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-smokepuff | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-sneeze | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-sour | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-spice | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-spider | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-spill | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-sprout | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-stitch | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-succor | `ua-65-b8dead3c491aedf8` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-sweeten | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-tangle | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-tap | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-tarnish | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-thump | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-tie | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-tweak | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-twitch | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-unlock | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-untie | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-warm | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-whistle | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-wilt | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-wink | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-wrap | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.65 | spells:ua-magic-user-yawn | `ua-65-30f3ebfd86b540c2` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.67 | spells:ua-illusionist-alter-self | `ua-67-2169fb41ba20d76d` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.67 | spells:ua-illusionist-chromatic-orb | `ua-67-785f3646c91cc52a` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.67 | spells:ua-illusionist-fascinate | `ua-67-0e06e0b5a8df7d28` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.67 | spells:ua-illusionist-phantom-armor | `ua-67-034b33672c601d94` | word-crosses-crop-boundary | present-but-unlinked | `UA-p67-ua-67-034b33672c601d94-ua-67-7c0fa4b71a02629b` |
| UA p.67 | spells:ua-illusionist-phantom-armor | `ua-67-7c0fa4b71a02629b` | lowercase-text-at-crop-top, word-crosses-crop-boundary | present-but-unlinked | `UA-p67-ua-67-034b33672c601d94-ua-67-7c0fa4b71a02629b` |
| UA p.67 | spells:ua-illusionist-read-illusionist-magic | `ua-67-ae6d790c398e5791` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.67 | spells:ua-illusionist-spook | `ua-67-b1b590b97742100d` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.68 | spells:ua-illusionist-delude | `ua-68-e97c1518c4e18994` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.68 | spells:ua-illusionist-fascinate | `ua-68-5b65a6abc44aa08f` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.68 | spells:ua-illusionist-phantom-steed | `ua-68-6868a636a97c51b6` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.68 | spells:ua-illusionist-phantom-wind | `ua-68-1da73422b9bd4c2f` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.68 | spells:ua-illusionist-ultravision | `ua-68-5bba115e88b7dfdf` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.68 | spells:ua-illusionist-whispering-wind | `ua-68-4259b638aad277cf` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.70 | spells:ua-illusionist-death-fog | `ua-70-ede10f74b4966bf1` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.70 | spells:ua-illusionist-dream | `ua-70-74eb635e2b9a5682` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.70 | spells:ua-illusionist-mislead | `ua-70-9456955b22439996` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.70 | spells:ua-illusionist-phantasmagoria | `ua-70-ae2e72a1695963a1` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.76 | equipment:ua-buckler | `ua-76-b792249887a1a798` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.76 | equipment:ua-full-plate | `ua-76-b792249887a1a798` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.76 | rules:ua-buckler | `ua-76-eba3afe157c01f6e` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.76 | rules:ua-full-plate | `ua-76-a92129691128e4a5` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-air-walk | `ua-81-75055fe9729c1838` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-cloudburst | `ua-81-1471a1ad596bfcf4` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-cloudburst | `ua-81-6fc0f4940e701c84` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-dust-devil | `ua-81-1471a1ad596bfcf4` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-dust-devil | `ua-81-6fc0f4940e701c84` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-magic-font | `ua-81-bf5f2a8b85c03c95` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-precipitation | `ua-81-1471a1ad596bfcf4` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-precipitation | `ua-81-6fc0f4940e701c84` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-cleric-water-walk | `ua-81-b74f20c05eae25c8` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-cloudburst | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-cloudburst | `ua-81-f41ba3b7fce499f0` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-flame-blade | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-flame-blade | `ua-81-f41ba3b7fce499f0` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-liveoak | `ua-81-890ff888cc3a67b9` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-precipitation | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-precipitation | `ua-81-f41ba3b7fce499f0` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-reflecting-pool | `ua-81-4b853a8d496237db` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-druid-transmute-water-to-dust | `ua-81-131c668b419f2d2d` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-illusionist-death-fog | `ua-81-e9cf7849aae6f84e` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-illusionist-phantom-wind | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-illusionist-phantom-wind | `ua-81-95a8fc1d37dee6ac` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-illusionist-solid-fog | `ua-81-21b08e23a072e36e` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-illusionist-whispering-wind | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-illusionist-whispering-wind | `ua-81-95a8fc1d37dee6ac` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-cloudburst | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-flaming-sphere | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-forcecage | `ua-81-a3538383ce0bd47d` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-melfs-minute-meteors | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-mount | `ua-81-a3c43c58420b8931` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-precipitation | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-shout | `ua-81-42711387f0de4468` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-transmute-water-to-dust | `ua-81-131c668b419f2d2d` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.81 | spells:ua-magic-user-wind-wall | `ua-81-30a5ef95c74267be` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.82 | spells:ua-illusionist-phantom-steed | `ua-82-cce56ee92da9d690` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.82 | spells:ua-magic-user-chain-lightning | `ua-82-a33d9e25f1e2cffe` | lowercase-text-at-crop-top, open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.82 | spells:ua-magic-user-firewater | `ua-82-c6f8d910f3c6a857` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.82 | spells:ua-magic-user-melfs-acid-arrow | `ua-82-ca885e349bd84dcb` | lowercase-text-at-crop-top, open-hyphenated-fragment-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.82 | spells:ua-magic-user-mordenkainens-magnificent-mansion | `ua-82-a7784fd6f2769d10` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.82 | spells:ua-magic-user-salt | `ua-82-e5a478c7bb7f69dc` | open-dangling-connector-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.82 | spells:ua-magic-user-sink | `ua-82-912ff05f89d60e66` | open-unpunctuated-at-crop-bottom, word-crosses-crop-boundary | uncertain | `—` |
| UA p.82 | spells:ua-magic-user-transmute-water-to-dust | `ua-82-474f20df63a479b5` | word-crosses-crop-boundary | uncertain | `—` |
| UA p.107 | equipment:ua-buckler | `ua-107-d62c70292c45a24b` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.107 | equipment:ua-field-plate | `ua-107-d62c70292c45a24b` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |
| UA p.107 | equipment:ua-full-plate | `ua-107-d62c70292c45a24b` | lowercase-text-at-crop-top, word-crosses-crop-boundary | uncertain | `—` |

## PHB p.70 Invisibility proposal

Source PDF p.71 / printed p.70 visually confirms that the lower-left Invisibility description flows to the upper-right continuation and ends before the next spell heading. Both source crops already exist; the frozen baseline manifest has no linked group. All six exposed owners share this exact source pair:

- `spells:phb-illusionist-improved-invisibility` — `scans/verified/spells-phb-illusionist-improved-invisibility.json`
- `spells:phb-illusionist-invisibility` — `scans/verified/spells-phb-illusionist-invisibility.json`
- `spells:phb-illusionist-invisibility-10-radius` — `scans/verified/spells-phb-illusionist-invisibility-10-radius.json`
- `spells:phb-magic-user-invisibility` — `scans/verified/spells-phb-magic-user-invisibility.json`
- `spells:phb-magic-user-invisibility-10-radius` — `scans/verified/spells-phb-magic-user-invisibility-10-radius.json`
- `spells:phb-magic-user-mass-invisibility` — `scans/verified/spells-phb-magic-user-mass-invisibility.json`

The six proposal objects in the JSON are review-only. They preserve source/image hashes and segment order; no shared catalog or continuation manifest was edited.

## Additional source-confirmed detector misses

- **UA p.10 elven subraces:** the lower-left segment continues into the upper-right column in the same printed passage. Two overlapping crop pairs in `rules:ua-elven-subrace-adjustments` show the same sequence. The wider contextual pair (`ua-10-391dc1287b053d98` → `ua-10-0f52a85b943013cf`) is the single proposed group; the narrower pair is retained as reviewed-but-not-proposed-separately to avoid duplicate display.
- **UA p.59–60 Magic-User Contingency:** the page-bottom segment continues at the beginning of p.60. The two owner crop images are already present in `spells:ua-magic-user-contingency`; the baseline has no group. A cross-page proposal is included in the JSON.
- **UA p.60:** it is itself one of the 73 elevated page groups. The same-page crop-candidate detector did not emit the p.59→p.60 continuation pair; source-page review verified both ends.

## Deferred queues and limits

The baseline has 123 weak-shape-only pages, 11 word-box-geometry-only pages, and 249 catalog-region rows with invalid/missing crop geometry. These remain uncertain/not assessable. The review found zero confirmed missing source-passage pixels and zero unavailable source pages; the confirmed issues are metadata-link gaps where both crop images are already present.

CI has no private source PDFs. The validator checks hash-bound numeric evidence and current-tree freshness, and reports source-PDF regeneration as unavailable rather than claiming a fresh source comparison. Local source review used private PDFs whose hashes match the frozen catalog source hashes.
