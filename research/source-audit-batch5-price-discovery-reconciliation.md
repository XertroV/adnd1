# Price discovery claim reconciliation

This report gives an explicit receipt for every source-page census claim and links only by stable source row/passage identity plus typed values. It does not treat page-number coincidence as proof and does not use current catalog counts as the completeness denominator.

Input commit: `679b15d1c580172e54314829c1c3c86dc78b65f3`.

## Bounded denominators

| Universe | Count |
|---|---:|
| PHB/DMG page-census records | 52 |
| UA page-census records | 65 |
| MM/MMII census claims | 63 |
| Total census claim receipts | 180 |
| Original source inventory rows | 710 |
| Supplemental UA groups / rows | 15 / 583 |
| Supplemental PHB/DMG groups / source rows or claims | 18 / 179 |
| PHB p.123 reference comparison rows | 165 (123 is the printed page number) |

The 179 PHB/DMG rows or claims are distributed across 18 exact source-group IDs. Those IDs exactly match 18 PHB/DMG census records; the other 34 PHB/DMG records are retained as separate receipts and are not page-matched into a pass. The p.123 reference sheet independently compares 165 source rows: 80 against PHB p.35 and 85 against p.36.

## Reconciliation status

| Receipt status | Claims |
|---|---:|
| `cross-reference-no-new-claim-row` | 2 |
| `direct-typed-census-claim` | 62 |
| `direct-typed-census-passage-no-583-row` | 1 |
| `direct-typed-census-passage-no-exact-583-row` | 47 |
| `duplicate-occurrence-unassessable-source-printing` | 1 |
| `exact-linked-UA-supplement-group` | 15 |
| `exact-linked-new-source-description` | 2 |
| `exact-linked-source-group` | 18 |
| `explicit-treasure-quantity-not-price` | 1 |
| `partially-linked-qualifier-records-untranscribed-tables` | 1 |
| `partially-linked-source-rows-remainder-unknown` | 1 |
| `structurally-untranscribed-source-passage` | 28 |
| `typed-relative-formula-unit-unresolved` | 1 |

Every claim receipt carries its source artifact JSON pointer, passage identity, printed/PDF page where available, source hash, exact linked row IDs/typed values when available, and the remaining unresolved work. See the JSON for the per-claim ledger.

## Post-remediation receipt ledger

The original `receiptStatus` field remains unchanged for all 180 records and is duplicated as `baselineReceiptStatus`. The baseline file hash before post-remediation annotations is recorded in the JSON. Each receipt now also has a `postRemediation` object with its stable index occurrence and claim IDs, exact linked source-occurrence/claim IDs, passage record, source-review state and separate pending geometry/overlay status. The adapter emits 180 receipt occurrences from the 180 bounded census receipts and 199 indexed value-claim records. Its relationship counts are 140 direct typed census claims and 40 receipts linked to existing structured rows, descriptions or duplicate occurrences; six non-price/quantity classifications and one duplicate receipt are overlapping disposition flags, not additional receipt counts.

| Post-remediation receipt disposition | Claims |
|---|---:|
| `source-passage values typed and indexed with bounded page/passage evidence` | 30 |
| `exact linked typed source rows retained; no page-only mapping` | 33 |
| `typed census claim indexed with source artifact pointer and named passage identity` | 93 |
| `explicit nonprice/quantity/XP/duration reference; excluded from monetary amount` | 15 |
| `exact description-linked receipt; table pointer amount remains unresolved` | 2 |
| `cross-reference retained; no new standalone price claim` | 2 |
| `three named rows linked; broader source census remainder remains unknown` | 1 |
| `duplicate-occurrence rows compared; publication-printing identity unresolved` | 1 |
| `currency-bearing relative/ambiguous reading retained unassessable` | 3 |

The three remaining relative/ambiguous readings are UA census records 006 and 038 and the MM mammoth-tusks relative valuation. They remain unassessable; no scalar amount is inferred. UA census record 031’s weeks-long transcription duration is an explicit non-price reference. The removable DMG reference sheet has 43 row comparisons linked to exact original typed rows in the supplied scan; the publication printing is unknown. This is not evidence that it matches the unavailable DMG p.175 printing.

## Eight UA table pointers

Before description records were added, the eight GP cells were captured as known failing `amount unresolved by table` cases in [the pointer baseline fixture](../tests/fixtures/price-discovery-ua-description-pointer-baseline.json). Six point to exact description rows already present in the 583-row UA supplement. Axe of Hurling and Dagger of Throwing now have separately linked source-description records in [the UA description records](source-audit-batch5-price-description-records.json), with separate PDF crop and highlight coordinate spaces, printed/PDF source pages, source hash, XP kept separate from GP, and formula ranges derived from the adjacent bonus tables. The table cells remain pointers. Independent overlay review is pending.

## Qualifier and footnote sweep

A pre-addition scan preserves 94 currency/XP text occurrences found in the selected free-text qualifier, footnote and prose fields of the six supplied inventory artifacts, in [the untyped candidate baseline fixture](../tests/fixtures/price-discovery-untyped-money-baseline.json). The UA supplement denominator is 583 rows; 86 rows have 91 footnote-condition entries, 15 rows have quantity conditions, and two conditional footnote values are already typed. The Bracers of Defense AC 6 example links to the typed per-step rates (2,000 XP and 12,000 gp if sold); the Eyes of Petrification reversal condition is already recorded as conditional values (12,500 XP and 50,000 gp), with the printed table cells still dashes. Both remain type-separated. Per-path adjudications are recorded for all 94 occurrences: exact typed census/group links, exact row qualifiers, source-condition context, one page-reference false positive, explicit exclusions, quantity/weight cases, and retained unresolved readings/formula units. Candidate detection alone is not a pass.

## Unresolved boundaries

The pure monetary index builder and targeted adapter tests pass against pinned historical inputs, but no final monetary index output is generated here. The historical canonical fixture has 187 authored equipment prices; current assembled counts are a separate, changing integration state and are not used as the census denominator. Source pages outside the bounded censuses, unreviewed/no-cue pages, the unavailable matching DMG p.175 printing, and unavailable Fiend Folio originals remain unknown or unassessable, not passes. Independent semantic and overlay review is pending for the new typed passage records and the mapped occurrences.

## Unstructured candidate outcomes

| Outcome | Occurrences |
|---|---:|
| `existing-unstructured-hireling-condition-needs-exact-row-review` | 4 |
| `existing-unstructured-source-condition-context-linked` | 3 |
| `explicit-nonprice-or-treasure-quantity-exclusion` | 4 |
| `explicit-nonprice-size-or-weight` | 4 |
| `explicit-scope-exclusion-and-cross-reference` | 2 |
| `explicit-scope-exclusion-or-not-price` | 2 |
| `genuine-source-reading-unresolved` | 1 |
| `group-scope-note-linked-to-row-claims` | 5 |
| `page-reference-false-positive-explicit-nonprice` | 1 |
| `relative-formula-unit-unresolved` | 2 |
| `typed-census-passage-linked` | 48 |
| `typed-footnote-example-linked-to-rate-row` | 1 |
| `typed-group-summary-linked-to-exact-source-rows` | 2 |
| `typed-quantity-or-scale-qualifier` | 6 |
| `typed-reference-sheet-qualifier-linked` | 1 |
| `typed-row-qualifier-linked` | 8 |

The source-first reader must keep census claim counts, source row counts, text candidate occurrences, table pointers and XP references distinct.
