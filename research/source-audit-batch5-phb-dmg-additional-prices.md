# Batch 5 PHB/DMG additional monetary source audit

This source-first extraction resolves all 18 pre-discovered PHB/DMG monetary groups. It preserves table rows, prose claims, table outcomes, numeric cells, and non-price outcomes as distinct units; it does not create missing tables from prose or infer unspecified prices. Every source page and included crop was checked against original PDF pixels. The machine-readable report contains typed values, exact row/claim IDs, source provenance, conditions, and crop-local focus coordinates.

## Baseline and scope

- Pinned input commit: `679b15d1c580172e54314829c1c3c86dc78b65f3`.
- Census baseline: `research/price-source-inventory-phb-dmg-other.json`, SHA-256 `a6e653a0ee4854e2d28b2cbc8049c60f038d4e8eabbcc822b10b730ef496ae79`.
- Price inventory baseline: `research/price-source-inventory.json`, SHA-256 `f2a02d1e990cf9bd30135f7dc2fcd2f10f9e1f2e172ee594e396677c32fb3852`.
- Frozen pre-extraction denominator: 18 discovered groups; 0 groups had row transcription at baseline.
- Source PDFs: PHB SHA-256 `e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095`; DMG SHA-256 `7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669`.
- Completed: 18/18 groups visually reviewed; 18/18 typed outputs; 0 unreviewed. Group classification: 7 table-only, 7 table-plus-prose, 4 prose-only; 14 groups contain actual tables.
- The group denominators enumerate 201 source table/list/outcome units reviewed. The report contains 179 stable, unique structured source-row/claim records. These counts intentionally differ: one structured record can preserve a grouped source list, and a table row may contain multiple price cells. The record total is not an amount-cell total.
- The 18 group primary locators cover 18 PDF pages; one directly relevant continuation page (DMG printed p.115 / PDF p.116) was also reviewed. PHB p.123 is documented separately below.

## Group dispositions and denominators

| Source group | Source page | Disposition | Source-first denominator and reviewed units | Structured records |
|---|---:|---|---|---:|
| `phb-assassination-fees` — Minimum Fees for Assassination | PHB p.29 / PDF 30 | Table only | 15 assassin-level rows; 120 victim-band cells; 112 numeric fees and 8 printed dashes. | 15 |
| `dmg-poison-dose-and-manufacture` — Poison cost/dose table and poison manufacture | DMG p.20 / PDF 21 | Table + prose | 9 poison purchase rows; 2 quantified manufacture/training claims; 1 qualitative cost modifier. | 11 |
| `dmg-gem-base-value-categories` — Gemstone base-value category table | DMG p.25 / PDF 26 | Table only | 6 base-value categories; 6 valuation cells. | 6 |
| `dmg-gem-value-progression` — Gem value progression above base value | DMG p.26 / PDF 27 | Table/list + prose | 6 progression rows; 53 gem-type rows; 7 jewelry-value bands; 4 quantified rules; 10 unpriced gem-type entries retained. | 15 |
| `dmg-furs-clothing-rare-commodities` — Furs, clothing and rare commodities | DMG p.27 / PDF 28 | Table/list + prose | 8 fur price rows × 4 cells; 7 adjustment outcomes; 8 commodity rates. | 17 |
| `dmg-support-research-and-information-costs` — Support, research grants/materials and information discovery | DMG p.33 / PDF 34 | Table + prose | 3 salary/grant rows; 4 information-discovery rate rows; 9 quantified prose cost claims; 1 unpriced search condition. | 18 |
| `dmg-henchman-prospect-search-table` — Locating prospective henchmen | DMG p.35 / PDF 36 | Table + prose | 4 search-method rows; 2 search-fee rules; 1 worked example; 2 offer rules and 2 nonmonetary offer terms. | 10 |
| `dmg-town-entry-and-citizenship-fees` — Town entry, citizenship/class fees, taxes and fines | DMG p.90 / PDF 91 | Prose only | 12 quantified monetary claims; 2 qualitative revenue rules. | 12 |
| `dmg-monetary-treasure-distribution` — Placement of monetary treasure | DMG p.92 / PDF 93 | Prose only | 11 quantified placement examples; 3 nonquantified composition passages. | 11 |
| `dmg-research-costs` — Research and material-cost passages | DMG pp.114–115 / PDF pp.115–116 | Table + prose | Printed pp.114–115 (PDF pp.115–116): 5 receptacle-price rows and 10 quantified prose claims; row-level source page is preserved. | 15 |
| `dmg-research-costs-continuation` — Research and material-cost continuation | DMG p.116 / PDF 117 | Prose only | 4 spell-research success-cost thresholds and 4 potion-manufacture cost rules; time/XP remain separate. | 8 |
| `dmg-scroll-material-per-sheet` — Scroll writing materials per sheet | DMG p.117 / PDF 118 | Table only | 3 scroll-material rows; purchase cost and failure-chance adjustment. | 3 |
| `dmg-monetary-treasure-tables` — Monetary treasure | DMG p.120 / PDF 121 | Table only | 9 monetary table rows; 10 combined-hoard rows; 4 map-table rows reviewed, with 1 monetary-table reference relevant here. | 20 |
| `dmg-gem-and-magic-treasure-valuations` — Gem and magic-treasure base values | DMG p.136 / PDF 137 | Table only | 19 Wand of Wonder outcomes reviewed; 1 monetary row and 18 nonmonetary outcomes. No separate gem-valuation table. | 1 |
| `dmg-gem-values-by-object` — Gem values in magic containers/items | DMG p.140 / PDF 141 | Table + footnote | 3 Bucknard purse generation rows; 9 positive denomination cells, 9 printed dashes, and 1 gem-value footnote. | 4 |
| `dmg-high-value-gems` — High-value gem values | DMG p.143 / PDF 144 | Prose only | 1 quantified Gem-card claim; gold jewelry and gems at 1,000 gp base value each, with gem count unspecified. | 1 |
| `dmg-random-treasure-values` — Random treasure contents | DMG p.153 / PDF 154 | Table only | 13 Robe of Useful Items outcomes reviewed; 3 monetary outcomes and 10 nonmonetary rows. | 3 |
| `dmg-treasure-per-level-table` — Treasure by level | DMG p.171 / PDF 172 | Table + modifier | 8 table rows: 5 currency amounts, 2 gem/jewelry quantity outcomes, 1 magic-item reference; 1 separate quantified modifier. | 9 |

The matching structured records retain per-row/per-claim currency, amount, range/formula, unit, purpose, quantity, conditions, source page, table/passage identity, and crop/focus coordinates. Full table context remains available in source crops; row and cell foci remain separate from the context crop. The report keeps nonmonetary treasure outcomes, printed dashes, duration and XP out of price values while recording them where needed to define table scope.

## PHB p.123 reference-sheet reconciliation

PHB p.123 was present in the source census as a text candidate with thumbnail-scale visual review only. The baseline’s separate-inventory exclusion covered PHB pp.35–36 but not this reference sheet, and no row-by-row p.123 reconciliation existed. I compared the p.123 table pixels to the existing PHB p.35 and p.36 inventories, without modifying them.

- 80 p.35-equivalent rows and 85 p.36-equivalent rows were compared: 165/165 row labels and amount/currency cells matched; no numeric amount or currency discrepancies were found.
- One variant qualifier differs: p.123 prints “Water, Holy*, vial — 25 g.p.” followed by “* or Unholy”; the p.36 inventory row only names the holy-water vial. This is a source qualifier difference, not a numeric price difference.
- The p.123 table’s five class starting-money rows and four currency-conversion equivalences were recorded separately as excluded content, not added to purchase-row totals.
- The p.35 and p.36 comparison inventories are pinned in the JSON by file hash. Private crop bounds/hashes are included there: p.35 crop `phb123-previous-p35-equipment-tables` ([20,650,625,1590], SHA-256 `0feb3138729ae353961abb1c69e6a4e10ebc4b03e9191cc2c18c113403c2654e`) and p.36 crop `phb123-previous-p36-equipment-tables` ([615,30,1195,1570], SHA-256 `39fe35c1ed7b4f1a985b7de04917fd085a8fe0023e7f6552e5e0358b2251a4be`). Source render: 1201×1642 px, SHA-256 `17f4278e8d4ee19257f23ce51972e478408c47ed25c7cafd46f7bd19accf0ffa`.

### Unholy-water price offer follow-up

The p.123 footnote explicitly extends the 25 gp/vial price to unholy water. The equipment catalog check found no distinct Unholy Water item; `unholy water` exists as an alias on item `phb-holy-water` (“Holy Water”). The source verifies a shared price offer only. It does not establish any unholy-water use rules or mechanics, and this report does not merge those mechanics. The structured `unholyWaterVariantOfferReview` records this as a verified price-offer/variant-representation gap outside the original 188-row purchase inventory and 165-row p.35/36 reconciliation. Its focus box `[300,1117,575,1167]` in the p.36 context crop includes the Water row, 25 g.p. cell, and “* or Unholy” footnote. No catalog/offer mutation was made.

## Review boundaries and validation

- The original 18 groups were individually reclassified from source content. For example, DMG p.92 is quantified monetary prose; p.136 has one Wand of Wonder monetary result; p.140 contains Bucknard’s Everfull Purse generation rows; p.143 has a Gem-card prose claim; and p.153 has three monetary outcomes inside the Robe of Useful Items table. No absent value table was invented.
- Record IDs are unique and each group’s declared `rowOrClaimIds` exactly matches its actual records. All 179 focus rectangles fall within their named context-crop dimensions; all 32 crop byte hashes and dimensions match the private render manifest. Record-level provenance uses the exact page where a claim appears, including p.115/PDF116 continuation claims within the p.114 research group.
- PDF source hashes match the frozen census. Limited source renders/crops remain only in `/workspace/scratch/batch5-phb-dmg-prices/`; no source-page images or full-page OCR were added to repository deliverables.
- XP, encumbrance/weight, nonmonetary outcomes, unpriced items, and spillover passages are kept separate or explicitly excluded. The audit is limited to the 18 discovered groups and the bounded PHB p.123 row comparison; it is not a whole-book or price-catalog completeness claim.
- Status: source-verified extraction complete; root independent review pending. No shared ledger, census, source binding, catalog, tool, handoff, or distribution file was changed by this work.

## Deliverables

- Structured report: `research/source-audit-batch5-phb-dmg-additional-prices.json`.
- This summary: `research/source-audit-batch5-phb-dmg-additional-prices.md`.
