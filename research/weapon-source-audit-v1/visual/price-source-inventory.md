# Equipment price and source-field inventory

Bounded source-first inventory assembled from named reviewed tables, surveys and current site equipment claims. It is not an exhaustive inventory of price-bearing content in any book and does not certify whole-book coverage. The JSON companion contains every bounded source row and field binding. This report has separate source-table, site-object and citation-field denominators; it does not assert whole-book price completeness.

Site equipment objects: **192** · printed prices: **187** · price gaps: **5** · editorial estimates: **4** (4 overlap price-gap objects; counts are not additive). Field evidence bindings: **4681**.

Source-page census: **776 PDF pages** across **3 named source censuses**. Page screening/visual-review counts have their own denominators; they do not certify that no other page contains a monetary claim.

## Named source-table denominators

| Source inventory | Category | Source rows | Additional denominator units | Status counts |
|---|---|---:|---|---|
| phb35-equipment-purchase | equipment-purchase-price | 80 | source-table-row: 80 | price matches: 42; reviewed-source-row-binding: 37; no exact current equipment record identified; needs semantic review: 1 |
| phb36-equipment-supplies | equipment-purchase-price | 85 | source-table-row: 85 | reviewed-source-row-binding: 60; price matches: 24; corrected locally; prior mismatch retained: 1 |
| ua26-equipment-supplies | equipment-purchase-price | 23 | source-table-row: 23 | price matches: 17; reviewed-source-row-binding: 6 |
| dmg28-standard-hireling-rates | hireling-wage | 10 | source-occupation-row: 10; printed-rate-cell: 20 | represented in rule table; no separate purchasable equipment item: 10 |
| dmg29-expert-hireling-rates | hireling-wage | 33 | source-occupation-row: 33; numeric-source-row: 25; special-fee-source-row: 8; contextual-condition-group: 15 | not yet compared: 33 |
| dmg-services-construction | service-fee-construction-cost-suggested-material-cost | 101 | source-table-row: 101; contextual-condition-group: 7 | source-value-independently-confirmed: 101 |
| dmg-magic-item-sale-values | magic-item-sale-value | 373 | source-table-row: 373; printed-formula: 2; source-qualifier: 11 | source-value-independently-confirmed: 373 |
| dmg-post125-screening | market-valuation-or-screening-finding | 5 | recorded-screening-finding: 5 | source-row-transcribed-bounds-provisional: 5 |

Site claim states (192 site objects): field-target-reviewed: 187; unextracted-gap: 5. Site-claim target-evidence bindings: **187**; target-review statuses: field-target-reviewed: 187. Printed-price evidence-binding denominator: **187**; source-value statuses: source-value-independently-confirmed: 187. Target-location review does not imply source-value confirmation.


## Source-page census

Every page listed below belongs to its source PDF-page denominator. Cue and visual-review states document screening scope; they do not assert that an unflagged or unreviewed page contains no monetary claim, and they do not make the source-row inventory exhaustive.

| Census | PDF-page denominator | Pages recorded | Text-screened | Broad cue candidates | Candidate pages visually reviewed | Candidate pages still pending | Claims | Table groups | Exclusions | Unresolved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| phb-dmg-other | 370 | 370 | 370 | 223 | 66 | 157 | 52 | 18 | 9 | 6 |
| ua-other | 130 | 130 | 0 | 0 | 0 | 0 | 65 | 15 | 13 | 2 |
| monster-books | 276 | 276 | 276 | 183 | 52 | 131 | 63 | 0 | 14 | 4 |

### phb-dmg-other

[object Object] Source files: research/price-source-inventory-phb-dmg-other.json. Source identity: PHB SHA256 e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095; DMG SHA256 7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669. Review-status counts: not-visually-reviewed: 145; candidate-not-visually-reviewed: 152; rendered-contact-sheet-thumbnail-viewed: 67; covered-by-separate-existing-inventory: 5; original-source-page-rendered-and-viewed: 1.

| Page reference | Text characters | Text layer | Screen/candidate state | Cue summary | Visual review status |
|---|---:|---|---|---|---|
| Player's Handbook / PDF 1 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.1 / PDF 2 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.2 / PDF 3 | 4713 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.3 / PDF 4 | 6288 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.4 / PDF 5 | 6161 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.5 / PDF 6 | 5133 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.6 / PDF 7 | 4691 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.7 / PDF 8 | 9648 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.8 / PDF 9 | 9397 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.9 / PDF 10 | 6207 | text-present | screened-candidate | currencyToken:4 | candidate-not-visually-reviewed |
| Player's Handbook p.10 / PDF 11 | 5604 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.11 / PDF 12 | 4800 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.12 / PDF 13 | 4863 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.13 / PDF 14 | 4880 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.14 / PDF 15 | 2931 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.15 / PDF 16 | 4965 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.16 / PDF 17 | 7880 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.17 / PDF 18 | 8683 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.18 / PDF 19 | 4487 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.19 / PDF 20 | 4006 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Player's Handbook p.20 / PDF 21 | 7029 | text-present | screened-candidate | transactionLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.21 / PDF 22 | 6540 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.22 / PDF 23 | 6614 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.23 / PDF 24 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.24 / PDF 25 | 5608 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.25 / PDF 26 | 6094 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.26 / PDF 27 | 4067 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.27 / PDF 28 | 5989 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.28 / PDF 29 | 5993 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.29 / PDF 30 | 6711 | text-present | screened-candidate | currencyToken:1, transactionLanguage:5 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.30 / PDF 31 | 8670 | text-present | screened-candidate | currencyToken:1, transactionLanguage:3 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.31 / PDF 32 | 4153 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.32 / PDF 33 | 8121 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.33 / PDF 34 | 8862 | text-present | screened-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Player's Handbook p.34 / PDF 35 | 8837 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.35 / PDF 36 | 5616 | text-present | screened-candidate | currencyToken:18, transactionLanguage:14, valuationLanguage:6, gemLanguage:4 | covered-by-separate-existing-inventory |
| Player's Handbook p.36 / PDF 37 | 5911 | text-present | screened-candidate | transactionLanguage:2 | covered-by-separate-existing-inventory |
| Player's Handbook p.37 / PDF 38 | 3219 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.38 / PDF 39 | 2324 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.39 / PDF 40 | 8474 | text-present | screened-candidate | transactionLanguage:7 | candidate-not-visually-reviewed |
| Player's Handbook p.40 / PDF 41 | 5659 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.41 / PDF 42 | 2024 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.42 / PDF 43 | 2204 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.43 / PDF 44 | 6793 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.44 / PDF 45 | 7692 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.45 / PDF 46 | 7419 | text-present | screened-candidate | gemLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.46 / PDF 47 | 8057 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.47 / PDF 48 | 7219 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.48 / PDF 49 | 7708 | text-present | screened-candidate | gemLanguage:2 | candidate-not-visually-reviewed |
| Player's Handbook p.49 / PDF 50 | 7579 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.50 / PDF 51 | 8544 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.51 / PDF 52 | 8655 | text-present | screened-candidate | transactionLanguage:1, gemLanguage:2 | candidate-not-visually-reviewed |
| Player's Handbook p.52 / PDF 53 | 7251 | text-present | screened-candidate | currencyToken:2, transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.53 / PDF 54 | 6579 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.54 / PDF 55 | 6844 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.55 / PDF 56 | 6529 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.56 / PDF 57 | 4806 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Player's Handbook p.57 / PDF 58 | 7590 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.58 / PDF 59 | 8255 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.59 / PDF 60 | 7545 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.60 / PDF 61 | 7182 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.61 / PDF 62 | 6989 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.62 / PDF 63 | 8440 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.63 / PDF 64 | 8010 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.64 / PDF 65 | 6118 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Player's Handbook p.65 / PDF 66 | 6053 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.66 / PDF 67 | 7319 | text-present | screened-candidate | currencyToken:3, transactionLanguage:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.67 / PDF 68 | 7900 | text-present | screened-candidate | transactionLanguage:2, valuationLanguage:1, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.68 / PDF 69 | 6792 | text-present | screened-candidate | transactionLanguage:2 | candidate-not-visually-reviewed |
| Player's Handbook p.69 / PDF 70 | 7626 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.70 / PDF 71 | 8361 | text-present | screened-candidate | currencyToken:3 | candidate-not-visually-reviewed |
| Player's Handbook p.71 / PDF 72 | 7123 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.72 / PDF 73 | 7700 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Player's Handbook p.73 / PDF 74 | 8021 | text-present | screened-candidate | valuationLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.74 / PDF 75 | 8190 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.75 / PDF 76 | 7703 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.76 / PDF 77 | 7453 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Player's Handbook p.77 / PDF 78 | 7920 | text-present | screened-candidate | currencyToken:1, transactionLanguage:2 | candidate-not-visually-reviewed |
| Player's Handbook p.78 / PDF 79 | 7676 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.79 / PDF 80 | 7647 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.80 / PDF 81 | 7177 | text-present | screened-candidate | transactionLanguage:1, gemLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.81 / PDF 82 | 7185 | text-present | screened-candidate | gemLanguage:2 | candidate-not-visually-reviewed |
| Player's Handbook p.82 / PDF 83 | 7616 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.83 / PDF 84 | 7108 | text-present | screened-candidate | transactionLanguage:2, valuationLanguage:2, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.84 / PDF 85 | 7113 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.85 / PDF 86 | 7542 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.86 / PDF 87 | 8042 | text-present | screened-candidate | transactionLanguage:3, valuationLanguage:1, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.87 / PDF 88 | 8661 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:3 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.88 / PDF 89 | 7984 | text-present | screened-candidate | transactionLanguage:2, gemLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.89 / PDF 90 | 8347 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.90 / PDF 91 | 6747 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.91 / PDF 92 | 6996 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.92 / PDF 93 | 6977 | text-present | screened-candidate | valuationLanguage:3, gemLanguage:8 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.93 / PDF 94 | 6642 | text-present | screened-candidate | valuationLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.94 / PDF 95 | 6647 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.95 / PDF 96 | 6389 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.96 / PDF 97 | 5767 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.97 / PDF 98 | 5229 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.98 / PDF 99 | 6621 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.99 / PDF 100 | 6190 | text-present | screened-candidate | gemLanguage:2 | candidate-not-visually-reviewed |
| Player's Handbook p.100 / PDF 101 | 6931 | text-present | screened-candidate | transactionLanguage:3, valuationLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.101 / PDF 102 | 6253 | text-present | screened-candidate | transactionLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.102 / PDF 103 | 6469 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Player's Handbook p.103 / PDF 104 | 9160 | text-present | screened-candidate | currencyToken:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.104 / PDF 105 | 8848 | text-present | screened-candidate | transactionLanguage:3, valuationLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.105 / PDF 106 | 8670 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.106 / PDF 107 | 9040 | text-present | screened-candidate | currencyToken:8, transactionLanguage:5, valuationLanguage:3, gemLanguage:2 | candidate-not-visually-reviewed |
| Player's Handbook p.107 / PDF 108 | 9144 | text-present | screened-candidate | gemLanguage:1 | candidate-not-visually-reviewed |
| Player's Handbook p.108 / PDF 109 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.109 / PDF 110 | 9379 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:2 | candidate-not-visually-reviewed |
| Player's Handbook p.110 / PDF 111 | 6355 | text-present | screened-candidate | transactionLanguage:4 | candidate-not-visually-reviewed |
| Player's Handbook p.111 / PDF 112 | 4907 | text-present | screened-candidate | transactionLanguage:5 | candidate-not-visually-reviewed |
| Player's Handbook p.112 / PDF 113 | 5882 | text-present | screened-candidate | transactionLanguage:12 | candidate-not-visually-reviewed |
| Player's Handbook p.113 / PDF 114 | 7301 | text-present | screened-candidate | transactionLanguage:9 | candidate-not-visually-reviewed |
| Player's Handbook p.114 / PDF 115 | 6738 | text-present | screened-candidate | transactionLanguage:15 | candidate-not-visually-reviewed |
| Player's Handbook p.115 / PDF 116 | 6854 | text-present | screened-candidate | currencyToken:2, transactionLanguage:8 | candidate-not-visually-reviewed |
| Player's Handbook p.116 / PDF 117 | 7927 | text-present | screened-candidate | transactionLanguage:16 | candidate-not-visually-reviewed |
| Player's Handbook p.117 / PDF 118 | 5439 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.118 / PDF 119 | 6823 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.119 / PDF 120 | 1113 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.120 / PDF 121 | 6306 | text-present | screened-noncandidate | — | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.121 / PDF 122 | 136 | text-present | screened-noncandidate | — | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.122 / PDF 123 | 3041 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.123 / PDF 124 | 2166 | text-present | screened-candidate | currencyToken:9, transactionLanguage:1, valuationLanguage:1, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.124 / PDF 125 | 2363 | text-present | screened-candidate | currencyToken:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook p.125 / PDF 126 | 2473 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.126 / PDF 127 | 1584 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.127 / PDF 128 | 3869 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Player's Handbook p.128 / PDF 129 | 2759 | text-present | screened-candidate | currencyToken:1 | rendered-contact-sheet-thumbnail-viewed |
| Player's Handbook / PDF 130 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide / PDF 1 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.1 / PDF 2 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.2 / PDF 3 | 2842 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.3 / PDF 4 | 6975 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.4 / PDF 5 | 6601 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.5 / PDF 6 | 3835 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.6 / PDF 7 | 15224 | text-present | screened-candidate | transactionLanguage:8, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.7 / PDF 8 | 5949 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.8 / PDF 9 | 3687 | text-present | screened-candidate | transactionLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.9 / PDF 10 | 9865 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.10 / PDF 11 | 7781 | text-present | screened-candidate | transactionLanguage:2, valuationLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.11 / PDF 12 | 8067 | text-present | screened-candidate | transactionLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.12 / PDF 13 | 7636 | text-present | screened-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.13 / PDF 14 | 6316 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.14 / PDF 15 | 5959 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.15 / PDF 16 | 7745 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.16 / PDF 17 | 7766 | text-present | screened-candidate | gemLanguage:4 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.17 / PDF 18 | 3992 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.18 / PDF 19 | 7798 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.19 / PDF 20 | 6500 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.20 / PDF 21 | 8621 | text-present | screened-candidate | transactionLanguage:9 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.21 / PDF 22 | 7361 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.22 / PDF 23 | 10219 | text-present | screened-candidate | transactionLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.23 / PDF 24 | 8115 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.24 / PDF 25 | 8625 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.25 / PDF 26 | 7846 | text-present | screened-candidate | transactionLanguage:10, valuationLanguage:6, gemLanguage:11 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.26 / PDF 27 | 6671 | text-present | screened-candidate | currencyToken:13, valuationLanguage:32, gemLanguage:25 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.27 / PDF 28 | 5852 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:1, gemLanguage:6 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.28 / PDF 29 | 6944 | text-present | screened-candidate | transactionLanguage:5 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.29 / PDF 30 | 6636 | text-present | screened-candidate | currencyToken:3, transactionLanguage:15 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.30 / PDF 31 | 8102 | text-present | screened-candidate | currencyToken:3, transactionLanguage:12, valuationLanguage:3, gemLanguage:5 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.31 / PDF 32 | 7580 | text-present | screened-candidate | currencyToken:2, transactionLanguage:5 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.32 / PDF 33 | 7490 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.33 / PDF 34 | 9331 | text-present | screened-candidate | transactionLanguage:22 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.34 / PDF 35 | 8125 | text-present | screened-candidate | transactionLanguage:12 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.35 / PDF 36 | 7441 | text-present | screened-candidate | currencyToken:3, transactionLanguage:8 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.36 / PDF 37 | 5512 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.37 / PDF 38 | 7690 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.38 / PDF 39 | 9752 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.39 / PDF 40 | 9486 | text-present | screened-candidate | transactionLanguage:7, valuationLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.40 / PDF 41 | 7032 | text-present | screened-candidate | transactionLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.41 / PDF 42 | 7751 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.42 / PDF 43 | 8305 | text-present | screened-candidate | currencyToken:3, transactionLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.43 / PDF 44 | 8296 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.44 / PDF 45 | 6590 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.45 / PDF 46 | 6935 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.46 / PDF 47 | 6879 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:1, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.47 / PDF 48 | 6225 | text-present | screened-candidate | transactionLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.48 / PDF 49 | 72 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.49 / PDF 50 | 8053 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.50 / PDF 51 | 8794 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.51 / PDF 52 | 7732 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.52 / PDF 53 | 6396 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.53 / PDF 54 | 8850 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.54 / PDF 55 | 5377 | text-present | screened-candidate | transactionLanguage:2, valuationLanguage:5 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.55 / PDF 56 | 7664 | text-present | screened-candidate | transactionLanguage:2, valuationLanguage:2, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.56 / PDF 57 | 9314 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.57 / PDF 58 | 5586 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.58 / PDF 59 | 7172 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.59 / PDF 60 | 4719 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.60 / PDF 61 | 8376 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.61 / PDF 62 | 8941 | text-present | screened-candidate | transactionLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.62 / PDF 63 | 9107 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.63 / PDF 64 | 8571 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.64 / PDF 65 | 7335 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.65 / PDF 66 | 8922 | text-present | screened-candidate | transactionLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.66 / PDF 67 | 9403 | text-present | screened-candidate | transactionLanguage:10 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.67 / PDF 68 | 6676 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.68 / PDF 69 | 6791 | text-present | screened-candidate | currencyToken:1, valuationLanguage:5, gemLanguage:4 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.69 / PDF 70 | 6197 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.70 / PDF 71 | 7652 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.71 / PDF 72 | 9779 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.72 / PDF 73 | 6557 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.73 / PDF 74 | 6445 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.74 / PDF 75 | 3136 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.75 / PDF 76 | 2994 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.76 / PDF 77 | 5111 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.77 / PDF 78 | 3499 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.78 / PDF 79 | 4486 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.79 / PDF 80 | 3684 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.80 / PDF 81 | 6834 | text-present | screened-candidate | gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.81 / PDF 82 | 7844 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.82 / PDF 83 | 8553 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.83 / PDF 84 | 7974 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.84 / PDF 85 | 9433 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.85 / PDF 86 | 6760 | text-present | screened-candidate | currencyToken:5, transactionLanguage:3, valuationLanguage:7, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.86 / PDF 87 | 8633 | text-present | screened-candidate | currencyToken:1, transactionLanguage:5, valuationLanguage:1, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.87 / PDF 88 | 10235 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.88 / PDF 89 | 9761 | text-present | screened-candidate | currencyToken:2, transactionLanguage:2, valuationLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.89 / PDF 90 | 4703 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.90 / PDF 91 | 10091 | text-present | screened-candidate | currencyToken:10, transactionLanguage:33, valuationLanguage:5, gemLanguage:4 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.91 / PDF 92 | 10136 | text-present | screened-candidate | currencyToken:1, transactionLanguage:2, valuationLanguage:1, gemLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.92 / PDF 93 | 10391 | text-present | screened-candidate | currencyToken:12, transactionLanguage:1, valuationLanguage:12, gemLanguage:6 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.93 / PDF 94 | 9695 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.94 / PDF 95 | 8311 | text-present | screened-candidate | currencyToken:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.95 / PDF 96 | 70 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.96 / PDF 97 | 9606 | text-present | screened-candidate | transactionLanguage:1, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.97 / PDF 98 | 8893 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.98 / PDF 99 | 7795 | text-present | screened-candidate | currencyToken:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.99 / PDF 100 | 7944 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.100 / PDF 101 | 6256 | text-present | screened-candidate | gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.101 / PDF 102 | 4670 | text-present | screened-candidate | currencyToken:1, gemLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.102 / PDF 103 | 5642 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.103 / PDF 104 | 9444 | text-present | screened-candidate | currencyToken:1, transactionLanguage:11 | covered-by-separate-existing-inventory |
| Dungeon Masters Guide p.104 / PDF 105 | 8591 | text-present | screened-candidate | currencyToken:1, transactionLanguage:10, valuationLanguage:1 | covered-by-separate-existing-inventory |
| Dungeon Masters Guide p.105 / PDF 106 | 9473 | text-present | screened-candidate | transactionLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.106 / PDF 107 | 7504 | text-present | screened-candidate | transactionLanguage:5 | covered-by-separate-existing-inventory |
| Dungeon Masters Guide p.107 / PDF 108 | 7103 | text-present | screened-candidate | currencyToken:1, transactionLanguage:13, valuationLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.108 / PDF 109 | 6620 | text-present | screened-candidate | currencyToken:1, transactionLanguage:6 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.109 / PDF 110 | 6099 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.110 / PDF 111 | 7435 | text-present | screened-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.111 / PDF 112 | 8748 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.112 / PDF 113 | 7968 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.113 / PDF 114 | 4872 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.114 / PDF 115 | 7406 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.115 / PDF 116 | 9468 | text-present | screened-candidate | currencyToken:4, transactionLanguage:10, valuationLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.116 / PDF 117 | 9391 | text-present | screened-candidate | currencyToken:4, transactionLanguage:11 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.117 / PDF 118 | 7728 | text-present | screened-candidate | transactionLanguage:3, gemLanguage:3 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.118 / PDF 119 | 8930 | text-present | screened-candidate | transactionLanguage:5, valuationLanguage:3, gemLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.119 / PDF 120 | 8348 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.120 / PDF 121 | 6513 | text-present | screened-candidate | currencyToken:5, valuationLanguage:3, gemLanguage:5 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.121 / PDF 122 | 5913 | text-present | screened-candidate | currencyToken:2, transactionLanguage:8, valuationLanguage:7 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.122 / PDF 123 | 4919 | text-present | screened-candidate | currencyToken:7, transactionLanguage:6, valuationLanguage:7 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.123 / PDF 124 | 4622 | text-present | screened-candidate | transactionLanguage:3, valuationLanguage:5, gemLanguage:5 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.124 / PDF 125 | 5518 | text-present | screened-candidate | transactionLanguage:4, valuationLanguage:7 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.125 / PDF 126 | 6584 | text-present | screened-candidate | transactionLanguage:2, valuationLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.126 / PDF 127 | 7941 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.127 / PDF 128 | 8320 | text-present | screened-candidate | currencyToken:1, gemLanguage:5 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.128 / PDF 129 | 8687 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.129 / PDF 130 | 8079 | text-present | screened-candidate | currencyToken:3, transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.130 / PDF 131 | 7807 | text-present | screened-candidate | currencyToken:3, valuationLanguage:4 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.131 / PDF 132 | 8185 | text-present | screened-candidate | currencyToken:1, transactionLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.132 / PDF 133 | 8962 | text-present | screened-candidate | transactionLanguage:6, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.133 / PDF 134 | 6731 | text-present | screened-candidate | transactionLanguage:11 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.134 / PDF 135 | 6917 | text-present | screened-candidate | transactionLanguage:20 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.135 / PDF 136 | 8125 | text-present | screened-candidate | transactionLanguage:29 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.136 / PDF 137 | 8600 | text-present | screened-candidate | transactionLanguage:11, valuationLanguage:1, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.137 / PDF 138 | 7359 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.138 / PDF 139 | 8467 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.139 / PDF 140 | 9516 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.140 / PDF 141 | 9379 | text-present | screened-candidate | currencyToken:3, transactionLanguage:1, gemLanguage:4 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.141 / PDF 142 | 7939 | text-present | screened-candidate | currencyToken:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.142 / PDF 143 | 8756 | text-present | screened-candidate | transactionLanguage:5, gemLanguage:6 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.143 / PDF 144 | 8831 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:2, gemLanguage:6 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.144 / PDF 145 | 8568 | text-present | screened-candidate | gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.145 / PDF 146 | 9557 | text-present | screened-candidate | transactionLanguage:5, valuationLanguage:1, gemLanguage:14 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.146 / PDF 147 | 9090 | text-present | screened-candidate | transactionLanguage:1, gemLanguage:8 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.147 / PDF 148 | 7972 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.148 / PDF 149 | 5808 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.149 / PDF 150 | 9694 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:3, gemLanguage:11 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.150 / PDF 151 | 8863 | text-present | screened-candidate | gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.151 / PDF 152 | 8458 | text-present | screened-candidate | valuationLanguage:3, gemLanguage:24 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.152 / PDF 153 | 9397 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.153 / PDF 154 | 9228 | text-present | screened-candidate | currencyToken:2, transactionLanguage:1, valuationLanguage:2, gemLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.154 / PDF 155 | 7089 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.155 / PDF 156 | 9936 | text-present | screened-candidate | transactionLanguage:8, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.156 / PDF 157 | 8843 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.157 / PDF 158 | 6280 | text-present | screened-candidate | currencyToken:2, transactionLanguage:2, valuationLanguage:2, gemLanguage:5 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.158 / PDF 159 | 7066 | text-present | screened-candidate | gemLanguage:4 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.159 / PDF 160 | 6674 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.160 / PDF 161 | 7367 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:1, gemLanguage:7 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.161 / PDF 162 | 6311 | text-present | screened-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:1, gemLanguage:3 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.162 / PDF 163 | 6046 | text-present | screened-candidate | currencyToken:2, valuationLanguage:1, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.163 / PDF 164 | 7316 | text-present | screened-candidate | valuationLanguage:1, gemLanguage:2 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.164 / PDF 165 | 8407 | text-present | screened-candidate | gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.165 / PDF 166 | 9063 | text-present | screened-candidate | transactionLanguage:4 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.166 / PDF 167 | 6857 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.167 / PDF 168 | 5715 | text-present | screened-candidate | currencyToken:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.168 / PDF 169 | 8291 | text-present | screened-candidate | transactionLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.169 / PDF 170 | 5901 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.170 / PDF 171 | 4927 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.171 / PDF 172 | 4025 | text-present | screened-candidate | currencyToken:4, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.172 / PDF 173 | 5469 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.173 / PDF 174 | 3920 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.174 / PDF 175 | 5804 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.176 / PDF 176 | 5835 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.177 / PDF 177 | 2901 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.178 / PDF 178 | 2654 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.179 / PDF 179 | 4275 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.180 / PDF 180 | 1951 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.181 / PDF 181 | 5152 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.182 / PDF 182 | 6137 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.183 / PDF 183 | 4794 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.184 / PDF 184 | 2009 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.185 / PDF 185 | 2174 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.186 / PDF 186 | 2327 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.187 / PDF 187 | 2080 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.188 / PDF 188 | 2288 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.189 / PDF 189 | 1835 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.190 / PDF 190 | 4421 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.191 / PDF 191 | 6784 | text-present | screened-candidate | transactionLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.192 / PDF 192 | 8529 | text-present | screened-candidate | transactionLanguage:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.193 / PDF 193 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.194 / PDF 194 | 5355 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.195 / PDF 195 | 5604 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.196 / PDF 196 | 126 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.197 / PDF 197 | 251 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.198 / PDF 198 | 1096 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.199 / PDF 199 | 1177 | text-present | screened-candidate | currencyToken:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.200 / PDF 200 | 137 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.201 / PDF 201 | 93 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.202 / PDF 202 | 89 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.203 / PDF 203 | 493 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.204 / PDF 204 | 697 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.205 / PDF 205 | 673 | text-present | screened-candidate | currencyToken:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.206 / PDF 206 | 390 | text-present | screened-candidate | currencyToken:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.207 / PDF 207 | 89 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.208 / PDF 208 | 635 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.209 / PDF 209 | 678 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.210 / PDF 210 | 361 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.211 / PDF 211 | 1231 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.212 / PDF 212 | 430 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.213 / PDF 213 | 478 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.214 / PDF 214 | 360 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.215 / PDF 215 | 3506 | text-present | screened-candidate | transactionLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.216 / PDF 216 | 6388 | text-present | screened-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.217 / PDF 217 | 6562 | text-present | screened-candidate | currencyToken:2, valuationLanguage:2, gemLanguage:1 | rendered-contact-sheet-thumbnail-viewed |
| Dungeon Masters Guide p.218 / PDF 218 | 4694 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.219 / PDF 219 | 4271 | text-present | screened-candidate | gemLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.220 / PDF 220 | 5708 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.221 / PDF 221 | 5415 | text-present | screened-candidate | gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.222 / PDF 222 | 3513 | text-present | screened-candidate | transactionLanguage:2, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.223 / PDF 223 | 2384 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.224 / PDF 224 | 5082 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.225 / PDF 225 | 6002 | text-present | screened-candidate | currencyToken:9, transactionLanguage:1, gemLanguage:4 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.226 / PDF 226 | 5100 | text-present | screened-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.227 / PDF 227 | 4534 | text-present | screened-candidate | currencyToken:3, valuationLanguage:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.228 / PDF 228 | 4730 | text-present | screened-candidate | currencyToken:2, valuationLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.229 / PDF 229 | 3815 | text-present | screened-candidate | currencyToken:4, valuationLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.230 / PDF 230 | 1906 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.231 / PDF 231 | 6339 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.232 / PDF 232 | 3305 | text-present | screened-candidate | valuationLanguage:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.233 / PDF 233 | 3675 | text-present | screened-candidate | valuationLanguage:3, gemLanguage:3 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.234 / PDF 234 | 3224 | text-present | screened-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Dungeon Masters Guide p.235 / PDF 235 | 4133 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.236 / PDF 236 | 2035 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.237 / PDF 237 | 4297 | text-present | screened-noncandidate | — | not-visually-reviewed |
| Dungeon Masters Guide p.238 / PDF 238 | 4476 | text-present | screened-candidate | currencyToken:1, gemLanguage:2 | candidate-not-visually-reviewed |
| Dungeon Masters Guide / PDF 239 | 3431 | text-present | screened-candidate | currencyToken:4, transactionLanguage:10, gemLanguage:3 | original-source-page-rendered-and-viewed |
| Dungeon Masters Guide / PDF 240 | 0 | empty-or-unextractable | screened-noncandidate | — | not-visually-reviewed |

Monetary and valuation claims documented in this census:

| Source object or passage | Claim type | Amount/formula | Currency | Unit | Source location | Review/interpretation status |
|---|---|---|---|---|---|---|
| Cleric territorial income | unspecified | 9 sp per inhabitant/month | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Fighter freehold income | unspecified | 7 sp per inhabitant/month | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Magic-user territory income | unspecified | 5 sp per inhabitant/month | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Minimum Fees for Assassination | unspecified | multiple gp values | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Thieves guild leader succession | unspecified | 1,000 gp per follower experience level, plus unpriced rebuilding | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Monk stronghold/retreat | unspecified | up to 250,000 gp in treasure | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Crushed pearl spell component | unspecified | at least 100 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Glyph of Warding material component | unspecified | at least 2,000 gp; area greater than 50 sq ft | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Pearl spell component | unspecified | at least 100 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Silver horn material component | unspecified | at least 100 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Ivory plaque material component | unspecified | at least 100 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Specially constructed chest | unspecified | at least 5,000 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Raw materials for item preparation | unspecified | generally more than 100 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Document preparation materials | unspecified | 1,000 gp plus powdered rubies at 5,000 gp minimum per document | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Gem spell component | unspecified | not less than 5,000 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Specially made ivory likeness | unspecified | 5,000-10,000 gp average | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Special sword | unspecified | 500 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Black opal, diamond dust and gem components | unspecified | at least 5,000 gp each; 1,000 gp per Hit Die | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Jade circlet material component | unspecified | at least 5,000 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Mail-order advertisement | unspecified | $1 | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Poison cost/dose table and poison manufacture | unspecified | table values range from sp to 1,500 gp; 200-1,200 gp manufacture outlay | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Player-character, henchmen and stronghold maintenance | unspecified | 100 gp per character level/month; 100 gp per henchman level/month; 1% of stronghold cost/month | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Treasure sacrifice for level advancement | unspecified | at least 10,000 gp per character level | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Gemstone base-value category table | unspecified | categories include 10, 50, 100, 500, 1,000 and 5,000 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Gem value progression above base value | unspecified | 10,000 through 1,000,000 gp maximum | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Furs, clothing and rare commodities | unspecified | multiple gp/sp values | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Expert-hireling qualifications and ancillary costs | unspecified | 10-100 gp bonus; 310-400 gp workroom/forge; 10% usual cost of items handled or made | — | — | — | cross-reference to a scoped existing inventory; no new claim rows asserted |
| Expert hireling and mercenary costs | unspecified | 100 gp per level/month for captain; table and profession values not transcribed | — | — | — | cross-reference to a scoped existing inventory; no new claim rows asserted |
| Support, research grants/materials and information discovery | unspecified | multiple gp/month, grant and discovery costs; table not transcribed | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Leadership hiring and search fees | unspecified | 100 gp/month/level; 100 to 10,000+ gp task/search fees | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Locating prospective henchmen | unspecified | examples include 50 gp public notices and 300 gp agents | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Magic-user scroll ink | unspecified | 200-500 gp | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Illusionary Script special ink | unspecified | 100-400 gp ink plus 100 gp alchemist profit | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Aerial mount care and support | unspecified | 300-600 gp/month | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Property-owner tax | unspecified | minimum 10 gp/year | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Town entry, citizenship/class fees, taxes and fines | unspecified | multiple fee/tax amounts | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Placement of monetary treasure | unspecified | coin denominations and gem/jewelry groups | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Worked sample-dungeon treasure | unspecified | 19 sp and a 50 gp garnet in the example | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Research and material-cost passages | unspecified | multiple gp formulas | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Research and material-cost continuation | unspecified | multiple gp formulas | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Scroll writing materials per sheet | unspecified | papyrus 2 gp+; parchment 4 gp+; vellum 8 gp+ | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Magic-item fabrication and ring creation | unspecified | example 5,000 gp; formula costs tied to item xp value | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Monetary treasure | unspecified | coin quantities by denomination | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Gem and magic-treasure base values | unspecified | includes 1 gp gem base value and 100/500 gp magic-berry gem values | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Gem values in magic containers/items | unspecified | 10-100 gp values | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| High-value gem values | unspecified | 1,000 gp base value | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Random treasure contents | unspecified | examples: 100 gp bag value, 500 gp coffer value, 100 gp gems | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Artifact market valuations | unspecified | multiple market valuations; partially inventoried | — | — | — | cross-reference to a scoped existing inventory; no new claim rows asserted |
| Artifact activation sacrifice | unspecified | 10,000-60,000 gp worth of gems/jewelry | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Treasure by level | unspecified | currency and treasure quantities | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |
| Appendix H tricks: obsidian vase | unspecified | 5,000 gp | — | — | — | cross-reference to a scoped existing inventory; no new claim rows asserted |
| Unnumbered removable reference sheet | unspecified | hireling rates repeated; gp-weight values are not prices | — | — | — | page-or-group discovery only; verify exact wording, units, conditions and bounds at source scale before normalizing |

Table/group scope:

| Table group | Denominator / rows | Status or note |
|---|---:|---|
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |
| unnamed | — | discovery-only; rows not transcribed |

Exclusions and unresolved readings:

| Record | Source location | Disposition | Status |
|---|---|---|---|
| unspecified |  p.? | Initial character wealth is not an item/service price; excluded from new monetary-claim records. | unspecified |
| unspecified |  p.? | Conversion/financial-system terms are not ordinary purchase-price evidence; separate from equipment tables. | unspecified |
| unspecified |  p.? | Already separately inventoried in price-source-inventory-phb35.json and price-source-inventory-phb36.json; not duplicated here. | unspecified |
| unspecified |  p.? | Gp used as a weight unit is not monetary value. | unspecified |
| unspecified |  p.? | Starting wealth is not an item/service price; excluded from new monetary-claim records. | unspecified |
| unspecified |  p.? | XP values and gp-weight values are not monetary prices; the p.239 encumbrance table is specifically weight. | unspecified |
| unspecified |  p.101 | The contact-sheet page screen showed category headings but no listed monetary prices; treat as a visual-screened false positive only, not a page-wide absence guarantee. | unspecified |
| unspecified |  p.? | Coin conversion rules and generated treasure quantities are kept distinct from purchase/sale prices; treasure groups are labeled as generation/valuation where observed. | unspecified |
| unspecified |  p.? | These have separate scoped inventories listed in relatedInventories; this census references rather than re-transcribes those sources. | unspecified |
| unspecified |  p.? | — | unspecified |
| unspecified |  p.? | — | unspecified |
| unspecified |  p.? | — | unspecified |
| unspecified |  p.? | — | unspecified |
| unspecified |  p.? | — | unspecified |
| unspecified |  p.? | — | unspecified |

### ua-other

Additional source-first UA monetary-claims discovery census beyond the already separately inventoried printed p.26 Basic Equipment and Supplies Costs. All 130 PDF text layers were screened as a queue aid. Candidate pages and selected controls were visually inspected in the verified original. This is not a whole-book visual completeness claim: noncandidate pages are text-screen-only; magic-item sale-value tables are recorded at table level but not fully row-transcribed. Source files: research/price-source-inventory-ua-other.json. Source identity: UA SHA256 e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4. Review-status counts: unspecified: 130.

| Page reference | Text characters | Text layer | Screen/candidate state | Cue summary | Visual review status |
|---|---:|---|---|---|---|
| book unspecified / PDF 1 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.1 / PDF 2 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.2 / PDF 3 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.3 / PDF 4 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.4 / PDF 5 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.5 / PDF 6 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.6 / PDF 7 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.7 / PDF 8 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.8 / PDF 9 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.9 / PDF 10 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.10 / PDF 11 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.11 / PDF 12 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.12 / PDF 13 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.13 / PDF 14 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.14 / PDF 15 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.15 / PDF 16 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.16 / PDF 17 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.17 / PDF 18 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.18 / PDF 19 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.19 / PDF 20 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.20 / PDF 21 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.21 / PDF 22 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.22 / PDF 23 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.23 / PDF 24 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.24 / PDF 25 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.25 / PDF 26 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.26 / PDF 27 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.27 / PDF 28 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.28 / PDF 29 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.29 / PDF 30 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.30 / PDF 31 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.31 / PDF 32 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.32 / PDF 33 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.33 / PDF 34 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.34 / PDF 35 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.35 / PDF 36 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.36 / PDF 37 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.37 / PDF 38 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.38 / PDF 39 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.39 / PDF 40 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.40 / PDF 41 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.41 / PDF 42 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.42 / PDF 43 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.43 / PDF 44 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.44 / PDF 45 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.45 / PDF 46 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.46 / PDF 47 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.47 / PDF 48 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.48 / PDF 49 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.49 / PDF 50 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.50 / PDF 51 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.51 / PDF 52 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.52 / PDF 53 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.53 / PDF 54 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.54 / PDF 55 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.55 / PDF 56 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.56 / PDF 57 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.57 / PDF 58 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.58 / PDF 59 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.59 / PDF 60 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.60 / PDF 61 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.61 / PDF 62 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.62 / PDF 63 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.63 / PDF 64 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.64 / PDF 65 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.65 / PDF 66 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.66 / PDF 67 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.67 / PDF 68 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.68 / PDF 69 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.69 / PDF 70 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.70 / PDF 71 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.71 / PDF 72 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.72 / PDF 73 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.73 / PDF 74 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.74 / PDF 75 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.75 / PDF 76 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.76 / PDF 77 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.77 / PDF 78 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.78 / PDF 79 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.79 / PDF 80 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.80 / PDF 81 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.81 / PDF 82 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.82 / PDF 83 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.83 / PDF 84 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.84 / PDF 85 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.85 / PDF 86 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.86 / PDF 87 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.87 / PDF 88 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.88 / PDF 89 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.89 / PDF 90 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.90 / PDF 91 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.91 / PDF 92 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.92 / PDF 93 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.93 / PDF 94 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.94 / PDF 95 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.95 / PDF 96 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.96 / PDF 97 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.97 / PDF 98 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.98 / PDF 99 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.99 / PDF 100 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.100 / PDF 101 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.101 / PDF 102 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.102 / PDF 103 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.103 / PDF 104 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.104 / PDF 105 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.105 / PDF 106 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.106 / PDF 107 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.107 / PDF 108 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.108 / PDF 109 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.109 / PDF 110 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.110 / PDF 111 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.111 / PDF 112 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.112 / PDF 113 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.113 / PDF 114 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.114 / PDF 115 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.115 / PDF 116 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.116 / PDF 117 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.117 / PDF 118 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.118 / PDF 119 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.119 / PDF 120 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.120 / PDF 121 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.121 / PDF 122 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.122 / PDF 123 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.123 / PDF 124 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.124 / PDF 125 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.125 / PDF 126 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.126 / PDF 127 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.127 / PDF 128 | — | unspecified | unspecified | — | unspecified |
| book unspecified p.128 / PDF 129 | — | unspecified | unspecified | — | unspecified |
| book unspecified / PDF 130 | — | unspecified | unspecified | — | unspecified |

Monetary and valuation claims documented in this census:

| Source object or passage | Claim type | Amount/formula | Currency | Unit | Source location | Review/interpretation status |
|---|---|---|---|---|---|---|
| Clerical ceremony fees | unspecified | 5–15 sp (coming of age); 5–50 gp (burial); 1–20 gp (marriage); 1–10 sp or free (dedication); 1–100 gp or free (investiture); usually free (item consecration); usually free, possibly 200 gp (ordination); 1–100 gp or free (special vows); 100–600 gp (consecrate ground); no charge (anathematize). | gp | per service | — | discovery-only-not-source-value-reviewed |
| Flame Walk material component | unspecified | at least 500 gp | gp | component | — | discovery-only-not-source-value-reviewed |
| Rainbow substitute material component | unspecified | at least 1,000 gp | gp | diamond value | — | discovery-only-not-source-value-reviewed |
| Clerical Succor special item | unspecified | 2,000–5,000 gp | gp | special item | — | discovery-only-not-source-value-reviewed |
| Transmute Water to Dust component | unspecified | at least 500 gp | gp | diamond dust | — | discovery-only-not-source-value-reviewed |
| Shine cantrip revaluation | unspecified | no fixed gp amount | — | revaluation | — | discovery-only-not-source-value-reviewed |
| Wizard Mark component | unspecified | about 50 gp | gp | diamond dust | — | discovery-only-not-source-value-reviewed |
| Deeppockets garment | unspecified | at least 300 gp garment value; at least 1,000 gp for 100+ pockets | gp | garment | — | discovery-only-not-source-value-reviewed |
| Melf’s Minute Meteors component | unspecified | at least 1,000 gp | gp | tube | — | discovery-only-not-source-value-reviewed |
| Secret Page component | unspecified | 100 gp | gp | powdered amber | — | discovery-only-not-source-value-reviewed |
| Magic Mirror | unspecified | at least 1,000 gp | gp | mirror | — | discovery-only-not-source-value-reviewed |
| Ultravision component | unspecified | at least 500 gp | gp | crushed amethyst | — | discovery-only-not-source-value-reviewed |
| Contingency component | unspecified | 100 gp | gp | quicksilver | — | discovery-only-not-source-value-reviewed |
| Ensnarement special pigments | unspecified | 1,000 gp per turn | gp | turn | — | discovery-only-not-source-value-reviewed |
| Ensnarement protective stonework | unspecified | at least 50,000 gp; at least one month | gp | protected stone area | — | discovery-only-not-source-value-reviewed |
| Forcecage study component | unspecified | at least 1,000 gp | gp | powdered diamond | — | discovery-only-not-source-value-reviewed |
| Trap the Soul inks | unspecified | at least 1,000 gp per target HD | gp | target Hit Die | — | discovery-only-not-source-value-reviewed |
| Binding component | unspecified | at least 1,000 gp per subject HD | gp | subject Hit Die | — | discovery-only-not-source-value-reviewed |
| Magic-user Succor gem material | unspecified | at least 5,000 gp | gp | gem material | — | discovery-only-not-source-value-reviewed |
| Phantom Armor mithral plate | unspecified | 10 gp | gp | mithral plate | — | discovery-only-not-source-value-reviewed |
| Chromatic Orb gem | unspecified | at least 50 gp | gp | gem | — | discovery-only-not-source-value-reviewed |
| Vacancy black silk | unspecified | at least 100 gp | gp | square of silk | — | discovery-only-not-source-value-reviewed |
| Expanded armor/weapon costs | unspecified | table contains values including 1 sp, 75 sp, 90 gp, 2,000 gp, and 4,000 gp | gp | varies | — | discovery-only-not-source-value-reviewed |
| Field plate repair | unspecified | 100 gp + 1 day per point | gp | repair | — | discovery-only-not-source-value-reviewed |
| Full plate repair | unspecified | 200 gp + 2 days per point | gp | repair | — | discovery-only-not-source-value-reviewed |
| Magical barding value | unspecified | at least 5× comparable armor cost | gp | armor valuation | — | discovery-only-not-source-value-reviewed |
| Hand-held crossbow | unspecified | 300 gp; as little as 30 gp | gp | crossbow | — | discovery-only-not-source-value-reviewed |
| Hand-crossbow special quarrels | unspecified | 10 gp each | gp | quarrel | — | discovery-only-not-source-value-reviewed |
| Standard spellbook creation materials | unspecified | 1,000 gp + 100 gp per total spell level | gp | spellbook | — | discovery-only-not-source-value-reviewed |
| Traveling spellbook creation materials | unspecified | 500 gp + 100 gp per total spell level | gp | traveling spellbook | — | discovery-only-not-source-value-reviewed |
| Spell transcription time | unspecified | 4–7 weeks | — | book composition | — | discovery-only-not-source-value-reviewed |
| Standard spellbook sale value | unspecified | 1,000 gp per spell level | gp | spell level | — | discovery-only-not-source-value-reviewed |
| Hire a willing MU/illusionist | unspecified | 200 gp per spell level plus component multiplier | gp | spell level | — | discovery-only-not-source-value-reviewed |
| Ordinary spellcasting components surcharge | unspecified | max(10% of fee, 3× component value) | gp | casting | — | discovery-only-not-source-value-reviewed |
| Extraordinary spellcasting components surcharge | unspecified | max(100% of casting fee, 3× component value) | gp | casting | — | discovery-only-not-source-value-reviewed |
| Dangerous spell casting | unspecified | at least 2× normal fee; up to 10× normal for aging-effect spells | gp | casting | — | discovery-only-not-source-value-reviewed |
| Hostile spellcaster | unspecified | at least 2× fee or refusal | gp | casting | — | discovery-only-not-source-value-reviewed |
| Magic-item barter adjustment | unspecified | below sale value | — | magic item | — | discovery-only-not-source-value-reviewed |
| Potions III.A.1 and III.A.2 (GP Sale Value columns) | unspecified | multiple tabular values | gp | magic item | — | discovery-only-not-source-value-reviewed |
| Rings III.C.1 and III.C.2 | unspecified | multiple tabular values | gp | magic item | — | discovery-only-not-source-value-reviewed |
| Rods, Staves, Wands III.D.1 and III.D.2 | unspecified | multiple tabular values | gp | magic item | — | discovery-only-not-source-value-reviewed |
| Miscellaneous Magic III.E.1–III.E.7 | unspecified | multiple tabular values | gp | magic item | — | discovery-only-not-source-value-reviewed |
| Armor and Shields III.F.1 and III.F.2 | unspecified | multiple tabular values | gp | magic item | — | discovery-only-not-source-value-reviewed |
| Swords III.G.1 and III.G.2 | unspecified | multiple tabular values | gp | magic item | — | discovery-only-not-source-value-reviewed |
| Miscellaneous Weapons III.H.1 and III.H.2 | unspecified | multiple tabular values | gp | magic item | — | discovery-only-not-source-value-reviewed |
| Anything Ring residual jewelry | unspecified | 100–600 gp | gp | residual jewelry | — | discovery-only-not-source-value-reviewed |
| Rod of Splendor garb | unspecified | 7,000–10,000 gp total | gp | garb | — | discovery-only-not-source-value-reviewed |
| Staff-spear sale values | unspecified | 5,000–25,000 gp by form/bonus | gp | staff-spear | — | discovery-only-not-source-value-reviewed |
| Unidentified item at page break | unspecified | 1,000 gp per effective cleric level | gp | effective cleric level | — | discovery-only-not-source-value-reviewed |
| Golden Eggs of Desire | unspecified | 3,500–10,000 gp by egg type | gp | egg | — | discovery-only-not-source-value-reviewed |
| Gem of Insight | unspecified | at least 5,000 gp | gp | gem | — | discovery-only-not-source-value-reviewed |
| Pearl of the Sirines | unspecified | at least 1,000 gp | gp | pearl | — | discovery-only-not-source-value-reviewed |
| Scarab Versus Golems | unspecified | 3,200–12,500 gp by golem type | gp | scarab | — | discovery-only-not-source-value-reviewed |
| Zagyg’s Spell Component Case | unspecified | 2,000–7,000 gp | gp | case | — | discovery-only-not-source-value-reviewed |
| Final Word pommel gem | unspecified | 10,000 gp each | gp | pommel gem | — | discovery-only-not-source-value-reviewed |
| Axe of Hurling | unspecified | 15,000–75,000 gp | gp | axe | — | discovery-only-not-source-value-reviewed |
| Dagger of Throwing | unspecified | 2,500–5,500 gp | gp | dagger | — | discovery-only-not-source-value-reviewed |
| Hornblade | unspecified | 1,500–9,000 gp by form/bonus | gp | weapon form | — | discovery-only-not-source-value-reviewed |
| Knife, Buckle | unspecified | 1,000–4,000 gp | gp | knife | — | discovery-only-not-source-value-reviewed |
| Magic Quarterstaff | unspecified | 1,500–7,500 gp | gp | quarterstaff | — | discovery-only-not-source-value-reviewed |
| Scimitar of Speed | unspecified | 9,000–21,000 gp | gp | scimitar | — | discovery-only-not-source-value-reviewed |
| Vanquishing combat prize | unspecified | ≤ 1,000 gp × loser HD/level + one equipment item | gp | combat prize | — | discovery-only-not-source-value-reviewed |
| Dumathoin gemstone offering | unspecified | 10 gp | gp | gemstone offering | — | discovery-only-not-source-value-reviewed |
| Abbathor treasure threshold | unspecified | more than 1,000 gp threshold; 50% behavior chance | gp | encounter threshold | — | discovery-only-not-source-value-reviewed |
| Berronar golden braid gift | unspecified | 10,000–40,000 gp | gp | braid | — | discovery-only-not-source-value-reviewed |

Table/group scope:

| Table group | Denominator / rows | Status or note |
|---|---:|---|
| Expanded armor/weapon costs | — | — |
| Potions III.A.1 and III.A.2 (GP Sale Value columns) | — | — |
| Rings III.C.1 and III.C.2 | — | — |
| Rods, Staves, Wands III.D.1 and III.D.2 | — | — |
| Miscellaneous Magic III.E.1–III.E.7 | — | — |
| Armor and Shields III.F.1 and III.F.2 | — | — |
| Swords III.G.1 and III.G.2 | — | — |
| Miscellaneous Weapons III.H.1 and III.H.2 | — | — |
| Staff-spear sale values | — | — |
| Golden Eggs of Desire | — | — |
| Scarab Versus Golems | — | — |
| Hornblade | — | — |
| Knife, Buckle | — | — |
| Magic Quarterstaff | — | — |
| Scimitar of Speed | — | — |

Exclusions and unresolved readings:

| Record | Source location | Disposition | Status |
|---|---|---|---|
| unspecified |  p.12 | GP-like tokens are table codes, not currency amounts; visually checked. | unspecified |
| unspecified |  p.13 | 200 gp is weight/encumbrance, not a price; visually checked. | unspecified |
| unspecified |  p.24 | Item subtotals/maxima are weight or capacity measures in gp-weight, not prices; visually checked. | unspecified |
| unspecified |  p.25 | Cavalier starting-money ranges are starting wealth rather than item prices; nearby gp-weight item/encumbrance expressions are weight; visually checked. | unspecified |
| unspecified |  p.26 | Existing p.26 source-first inventory is research/price-source-inventory-ua26.json; deliberately excluded from this additional census. | unspecified |
| unspecified |  p.30 | Title is not a monetary value. | unspecified |
| unspecified |  p.79 | 150 gold pieces and other gp figures in encumbrance discussion are weight/capacity, not prices. | unspecified |
| unspecified |  p.84 | Adjacent tables give spell level/XP rather than GP sale value; excluded after visual check. | unspecified |
| unspecified |  p.96 | 10–60 gp weight and 600 gp weight capacity refer to physical weight/capacity, not price; visual check. | unspecified |
| unspecified |  p.98 | 30–40 gold pieces is weight, not valuation; visual check. | unspecified |
| unspecified |  p.100 | Gp expressions refer to capacity/weight, not prices; visual check. | unspecified |
| unspecified |  p.? | Gold-piece symbol/qualitative wealth phrases excluded; separately recorded numeric 10 gp offering and >1,000 gp behavioral threshold. | unspecified |
| unspecified |  p.? | No monetary amount or market-valuation claim identified in the visually sampled pages. | unspecified |
| unspecified |  p.97 | — | unspecified |
| unspecified |  p.? | — | unspecified |

### monster-books

[object Object] Source files: research/price-source-inventory-monster-books.json. Source identity: MM SHA256 c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81; MM2 SHA256 b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24. Review-status counts: not-visually-reviewed: 92; candidate-not-visually-reviewed: 131; original-page-viewed: 53.

| Page reference | Text characters | Text layer | Screen/candidate state | Cue summary | Visual review status |
|---|---:|---|---|---|---|
| Monster Manual / PDF 1 | 0 | empty-image-only-or-unextractable | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 2 | 690 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 3 | 3726 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual / PDF 4 | 2582 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 5 | 1840 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 6 | 6468 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.6 / PDF 7 | 5236 | text-present | broad-text-candidate | currencyToken:1 | original-page-viewed |
| Monster Manual p.7 / PDF 8 | 3301 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:1 | original-page-viewed |
| Monster Manual p.8 / PDF 9 | 4246 | text-present | broad-text-candidate | transactionLanguage:2 | original-page-viewed |
| Monster Manual p.9 / PDF 10 | 6620 | text-present | broad-text-candidate | currencyToken:3, transactionLanguage:2, valuationLanguage:1 | original-page-viewed |
| Monster Manual p.10 / PDF 11 | 6828 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:1 | original-page-viewed |
| Monster Manual p.11 / PDF 12 | 6317 | text-present | broad-text-candidate | transactionLanguage:2, valuationLanguage:1 | original-page-viewed |
| Monster Manual / PDF 13 | 6021 | text-present | broad-text-candidate | transactionLanguage:4, valuationLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 14 | 5583 | text-present | broad-text-candidate | currencyToken:2 | candidate-not-visually-reviewed |
| Monster Manual / PDF 15 | 5296 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 16 | 4468 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 17 | 7536 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 18 | 7207 | text-present | broad-text-candidate | currencyToken:2 | candidate-not-visually-reviewed |
| Monster Manual / PDF 19 | 5453 | text-present | broad-text-candidate | currencyToken:2 | candidate-not-visually-reviewed |
| Monster Manual / PDF 20 | 6262 | text-present | broad-text-candidate | currencyToken:2 | candidate-not-visually-reviewed |
| Monster Manual / PDF 21 | 7716 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual p.21 / PDF 22 | 5990 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:1, gemLanguage:1 | original-page-viewed |
| Monster Manual / PDF 23 | 5932 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 24 | 5902 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 25 | 3484 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 26 | 3447 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 27 | 3756 | text-present | broad-text-candidate | transactionLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 28 | 4444 | text-present | broad-text-candidate | transactionLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual / PDF 29 | 5348 | text-present | broad-text-candidate | currencyToken:2, transactionLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 30 | 5973 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual p.30 / PDF 31 | 9297 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:7, valuationLanguage:1 | original-page-viewed |
| Monster Manual / PDF 32 | 6027 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 33 | 5973 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 34 | 5551 | text-present | broad-text-candidate | gemLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual / PDF 35 | 5204 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 36 | 6352 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.36 / PDF 37 | 5584 | text-present | broad-text-candidate | currencyToken:3, transactionLanguage:2, gemLanguage:1 | original-page-viewed |
| Monster Manual / PDF 38 | 7506 | text-present | broad-text-candidate | currencyToken:2 | candidate-not-visually-reviewed |
| Monster Manual p.38 / PDF 39 | 5093 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3 | original-page-viewed |
| Monster Manual / PDF 40 | 8148 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 41 | 2949 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 42 | 5776 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 43 | 4340 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 44 | 5743 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 45 | 5980 | text-present | broad-text-candidate | currencyToken:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 46 | 6082 | text-present | broad-text-candidate | currencyToken:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 47 | 7078 | text-present | broad-text-candidate | gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual p.47 / PDF 48 | 6000 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:3 | original-page-viewed |
| Monster Manual p.48 / PDF 49 | 5708 | text-present | broad-text-candidate | currencyToken:3, transactionLanguage:3 | original-page-viewed |
| Monster Manual / PDF 50 | 4182 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.50 / PDF 51 | 5447 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:2 | original-page-viewed |
| Monster Manual / PDF 52 | 4851 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.52 / PDF 53 | 4838 | text-present | broad-text-candidate | currencyToken:2, transactionLanguage:1, valuationLanguage:1 | original-page-viewed |
| Monster Manual p.53 / PDF 54 | 5897 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:1 | original-page-viewed |
| Monster Manual p.54 / PDF 55 | 6266 | text-present | no-configured-cue-detected | — | original-page-viewed |
| Monster Manual / PDF 56 | 6716 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 57 | 2423 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.57 / PDF 58 | 4526 | text-present | broad-text-candidate | currencyToken:2, valuationLanguage:1 | original-page-viewed |
| Monster Manual / PDF 59 | 20 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 60 | 4455 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 61 | 4597 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.61 / PDF 62 | 6997 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:1, gemLanguage:1 | original-page-viewed |
| Monster Manual / PDF 63 | 5664 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 64 | 3474 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 65 | 2305 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.65 / PDF 66 | 3684 | text-present | broad-text-candidate | valuationLanguage:2 | original-page-viewed |
| Monster Manual / PDF 67 | 6188 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 68 | 4878 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.68 / PDF 69 | 6763 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:2, gemLanguage:4 | original-page-viewed |
| Monster Manual p.69 / PDF 70 | 5147 | text-present | broad-text-candidate | currencyToken:4, transactionLanguage:1, valuationLanguage:2, gemLanguage:1 | original-page-viewed |
| Monster Manual / PDF 71 | 5536 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 72 | 6817 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 73 | 4645 | text-present | broad-text-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 74 | 5464 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 75 | 5087 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 76 | 5957 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.76 / PDF 77 | 7211 | text-present | broad-text-candidate | currencyToken:2, transactionLanguage:1, valuationLanguage:2, gemLanguage:1 | original-page-viewed |
| Monster Manual p.77 / PDF 78 | 5795 | text-present | broad-text-candidate | currencyToken:3, transactionLanguage:4, valuationLanguage:3, gemLanguage:1 | original-page-viewed |
| Monster Manual p.78 / PDF 79 | 4373 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:1 | original-page-viewed |
| Monster Manual / PDF 80 | 5980 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 81 | 6146 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 82 | 5603 | text-present | broad-text-candidate | transactionLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual p.82 / PDF 83 | 4948 | text-present | broad-text-candidate | transactionLanguage:3, valuationLanguage:2 | original-page-viewed |
| Monster Manual p.83 / PDF 84 | 3658 | text-present | broad-text-candidate | gemLanguage:1 | original-page-viewed |
| Monster Manual / PDF 85 | 7597 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 86 | 6087 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 87 | 4071 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 88 | 5617 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 89 | 6287 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 90 | 5801 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 91 | 5689 | text-present | broad-text-candidate | transactionLanguage:3, valuationLanguage:1, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 92 | 0 | empty-image-only-or-unextractable | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 93 | 5875 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 94 | 4475 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual / PDF 95 | 5666 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 96 | 5794 | text-present | broad-text-candidate | transactionLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual / PDF 97 | 5583 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 98 | 5225 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 99 | 2894 | text-present | broad-text-candidate | transactionLanguage:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 100 | 5946 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.100 / PDF 101 | 5943 | text-present | broad-text-candidate | currencyToken:5, transactionLanguage:2, valuationLanguage:1, gemLanguage:5 | original-page-viewed |
| Monster Manual p.101 / PDF 102 | 6147 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:1 | original-page-viewed |
| Monster Manual / PDF 103 | 5191 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 104 | 2797 | text-present | broad-text-candidate | gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual / PDF 105 | 0 | empty-image-only-or-unextractable | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.105 / PDF 106 | 2212 | text-present | broad-text-candidate | gemLanguage:2 | original-page-viewed |
| Monster Manual / PDF 107 | 2381 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 108 | 3902 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 109 | 6059 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 110 | 5003 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 111 | 5 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual / PDF 112 | 3839 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual p.112 / PDF 113 | 2761 | text-present | broad-text-candidate | currencyToken:1 | original-page-viewed |
| Monster Manual / PDF 114 | 0 | empty-image-only-or-unextractable | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 1 | 0 | empty-image-only-or-unextractable | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 2 | 314 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 3 | 840 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 4 | 0 | empty-image-only-or-unextractable | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 5 | 0 | empty-image-only-or-unextractable | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 6 | 7342 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 7 | 7106 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 8 | 4959 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 9 | 5400 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 10 | 6710 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.10 / PDF 11 | 5648 | text-present | broad-text-candidate | currencyToken:2, valuationLanguage:3, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 12 | 6300 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.12 / PDF 13 | 5628 | text-present | broad-text-candidate | currencyToken:2, valuationLanguage:2, gemLanguage:2 | original-page-viewed |
| Monster Manual II / PDF 14 | 6005 | text-present | broad-text-candidate | valuationLanguage:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 15 | 7374 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 16 | 5384 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 17 | 6260 | text-present | broad-text-candidate | valuationLanguage:3, gemLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.17 / PDF 18 | 4627 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:3 | original-page-viewed |
| Monster Manual II / PDF 19 | 5163 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:4, gemLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 20 | 5749 | text-present | broad-text-candidate | valuationLanguage:4 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 21 | 5802 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.21 / PDF 22 | 5605 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:4, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 23 | 3748 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 24 | 5918 | text-present | broad-text-candidate | valuationLanguage:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 25 | 4183 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 26 | 5822 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 27 | 5877 | text-present | broad-text-candidate | valuationLanguage:3, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 28 | 5249 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.28 / PDF 29 | 6809 | text-present | broad-text-candidate | currencyToken:3, transactionLanguage:2, valuationLanguage:3, gemLanguage:1 | original-page-viewed |
| Monster Manual II p.29 / PDF 30 | 4516 | text-present | broad-text-candidate | currencyToken:2, transactionLanguage:3, valuationLanguage:3, gemLanguage:2 | original-page-viewed |
| Monster Manual II / PDF 31 | 5557 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 32 | 4716 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 33 | 6181 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 34 | 7131 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:1, gemLanguage:14 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 35 | 5033 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 36 | 6742 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 37 | 6103 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 38 | 5379 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 39 | 3530 | text-present | broad-text-candidate | currencyToken:2, valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 40 | 6324 | text-present | broad-text-candidate | currencyToken:2, valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 41 | 6106 | text-present | broad-text-candidate | valuationLanguage:2, gemLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 42 | 7238 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 43 | 7738 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 44 | 4611 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 45 | 6736 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 46 | 4783 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 47 | 5598 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 48 | 4869 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 49 | 4589 | text-present | broad-text-candidate | transactionLanguage:3, valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 50 | 5542 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 51 | 5831 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 52 | 3139 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 53 | 2886 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 54 | 2481 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 55 | 3018 | text-present | broad-text-candidate | valuationLanguage:4 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 56 | 4367 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 57 | 6557 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 58 | 6327 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 59 | 5583 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.59 / PDF 60 | 6195 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:2, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 61 | 6002 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 62 | 5265 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.62 / PDF 63 | 5159 | text-present | broad-text-candidate | transactionLanguage:2, valuationLanguage:3, gemLanguage:2 | original-page-viewed |
| Monster Manual II / PDF 64 | 4407 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 65 | 5355 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 66 | 4753 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 67 | 6631 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 68 | 6022 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 69 | 4908 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 70 | 6664 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.70 / PDF 71 | 5526 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:2, valuationLanguage:4, gemLanguage:2 | original-page-viewed |
| Monster Manual II / PDF 72 | 4802 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 73 | 6369 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 74 | 5095 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 75 | 6624 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 76 | 6569 | text-present | broad-text-candidate | valuationLanguage:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 77 | 4661 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 78 | 6191 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.78 / PDF 79 | 4541 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:4 | original-page-viewed |
| Monster Manual II / PDF 80 | 5488 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 81 | 5890 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 82 | 5703 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 83 | 4874 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II p.84 / PDF 84 | 5167 | text-present | broad-text-candidate | currencyToken:4, transactionLanguage:1, valuationLanguage:3 | original-page-viewed |
| Monster Manual II / PDF 85 | 5896 | text-present | broad-text-candidate | transactionLanguage:2, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II p.86 / PDF 86 | 4823 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:2 | original-page-viewed |
| Monster Manual II / PDF 87 | 6194 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 88 | 4604 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 89 | 5080 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:4 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 90 | 4730 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 91 | 4865 | text-present | broad-text-candidate | valuationLanguage:4 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 92 | 5461 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 93 | 6789 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 94 | 6696 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 95 | 7977 | text-present | broad-text-candidate | transactionLanguage:2, valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 96 | 5173 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.96 / PDF 97 | 5334 | text-present | broad-text-candidate | currencyToken:2, transactionLanguage:1, valuationLanguage:6, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 98 | 5131 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:5 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 99 | 5459 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II p.99 / PDF 100 | 4318 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:4, gemLanguage:2 | original-page-viewed |
| Monster Manual II p.100 / PDF 101 | 5040 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 102 | 7376 | text-present | broad-text-candidate | valuationLanguage:2, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 103 | 6201 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 104 | 6196 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 105 | 5645 | text-present | broad-text-candidate | transactionLanguage:3, valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 106 | 5730 | text-present | broad-text-candidate | valuationLanguage:5, gemLanguage:4 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 107 | 4861 | text-present | broad-text-candidate | valuationLanguage:3, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II p.107 / PDF 108 | 5094 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:3, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 109 | 6752 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 110 | 5500 | text-present | broad-text-candidate | currencyToken:1, transactionLanguage:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 111 | 5291 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 112 | 4926 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II p.112 / PDF 113 | 6706 | text-present | broad-text-candidate | currencyToken:4, valuationLanguage:5, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 114 | 5577 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II p.114 / PDF 115 | 5520 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:4, gemLanguage:3 | original-page-viewed |
| Monster Manual II / PDF 116 | 5710 | text-present | broad-text-candidate | transactionLanguage:1, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 117 | 6320 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 118 | 5425 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II p.118 / PDF 119 | 6730 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 120 | 5197 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 121 | 6190 | text-present | broad-text-candidate | transactionLanguage:2, valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 122 | 4961 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II p.122 / PDF 123 | 4805 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:4, gemLanguage:3 | original-page-viewed |
| Monster Manual II p.123 / PDF 124 | 4428 | text-present | broad-text-candidate | valuationLanguage:3, gemLanguage:3 | original-page-viewed |
| Monster Manual II / PDF 125 | 5587 | text-present | broad-text-candidate | valuationLanguage:3, gemLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 126 | 4793 | text-present | broad-text-candidate | valuationLanguage:4 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 127 | 6287 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 128 | 5119 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II p.128 / PDF 129 | 6006 | text-present | broad-text-candidate | currencyToken:1, valuationLanguage:3, gemLanguage:1 | original-page-viewed |
| Monster Manual II p.129 / PDF 130 | 6244 | text-present | broad-text-candidate | currencyToken:3, valuationLanguage:4, gemLanguage:1 | original-page-viewed |
| Monster Manual II / PDF 131 | 6039 | text-present | broad-text-candidate | valuationLanguage:2 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 132 | 4499 | text-present | broad-text-candidate | valuationLanguage:3 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 133 | 2218 | text-present | broad-text-candidate | valuationLanguage:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 134 | 4549 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 135 | 2417 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 136 | 7017 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 137 | 5757 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 138 | 7477 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 139 | 3910 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 140 | 6135 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 141 | 6307 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 142 | 5650 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 143 | 5973 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 144 | 5901 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 145 | 5905 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 146 | 6006 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 147 | 6158 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 148 | 6194 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 149 | 5986 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 150 | 5921 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 151 | 6547 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 152 | 6684 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 153 | 6861 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 154 | 6393 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 155 | 6140 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 156 | 5623 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 157 | 6872 | text-present | broad-text-candidate | currencyToken:1 | candidate-not-visually-reviewed |
| Monster Manual II / PDF 158 | 7499 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 159 | 7244 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 160 | 7754 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 161 | 1280 | text-present | no-configured-cue-detected | — | not-visually-reviewed |
| Monster Manual II / PDF 162 | 380 | text-present | no-configured-cue-detected | — | not-visually-reviewed |

Monetary and valuation claims documented in this census:

| Source object or passage | Claim type | Amount/formula | Currency | Unit | Source location | Review/interpretation status |
|---|---|---|---|---|---|---|
| Badger pelt | unspecified | 10–30 | gp | per pelt | — | source-value-visually-confirmed |
| Giant beaver hide | unspecified | 500–2,000 | gp | each | — | source-value-visually-confirmed |
| Giant beaver kit | unspecified | 100–200 | gp | per hit point | — | source-value-visually-confirmed |
| Ruby instrument carried by Asmodeus | unspecified | 1,000,000 | gp | whole instrument | — | source-value-visually-confirmed |
| Subdued dragon | unspecified | 100–800 | gp | per hit point | — | source-value-visually-confirmed |
| Giant eagle eggs | unspecified | 500–800 | gp | each | — | source-value-visually-confirmed |
| Elephant tusks | unspecified | 100–600 | gp | each | — | source-value-visually-confirmed |
| Clay golem creation spell materials | unspecified | 20,000 | gp | per creation | — | source-value-visually-confirmed |
| Clay golem ritual vestments | unspecified | 30,000 minimum | gp | per creation | — | source-value-visually-confirmed |
| Flesh golem creation materials | unspecified | 1,000 | gp | per hit point | — | source-value-visually-confirmed |
| Iron golem creation materials | unspecified | 1,000 | gp | per hit point | — | source-value-visually-confirmed |
| Stone golem creation materials | unspecified | 1,000 | gp | per hit point | — | source-value-visually-confirmed |
| Griffon fledgling | unspecified | 5,000 | gp | each | — | source-value-visually-confirmed |
| Griffon egg | unspecified | 2,000 | gp | each | — | source-value-visually-confirmed |
| Hippogriff egg | unspecified | 1,000 | gp | each | — | source-value-visually-confirmed |
| Hippogriff fledgling | unspecified | 2,000–3,000 | gp | each | — | source-value-visually-confirmed |
| Homunculus creation fluids | unspecified | 500–2,000 plus 1 pint of creator’s blood | gp plus blood | per creation | — | source-value-visually-confirmed |
| Ki-Rin skin | unspecified | 25,000 | gp | whole skin | — | source-value-visually-confirmed |
| Mammoth tusks | unspecified | (100–600 gp per elephant tusk) × 1.5 = 150–900 gp per mammoth tusk (derived) | gp | per tusk | — | source-relation-and-baseline-visually-confirmed |
| Ivory tusks in cavemen treasure | unspecified | 1,000 | gp | per tusk | — | source-value-visually-confirmed |
| Uncut gems in cavemen treasure | unspecified | base value 10 | gp | per gem | — | source-value-visually-confirmed |
| Merchant caravan pay chest | unspecified | 2,000–4,000 | gp | per pay chest | — | source-value-visually-confirmed |
| Merchant caravan pay chest | unspecified | 100–400 | pp | per pay chest | — | source-value-visually-confirmed |
| Merchant caravan pay chest gems | unspecified | base value 100 | gp | per gem; 4–16 gems | — | source-value-visually-confirmed |
| Merchant caravan merchandise | unspecified | 10,000–60,000 | gp | total merchandise | — | source-value-visually-confirmed |
| Goods carried by carts in orc slave train | unspecified | 10–1,000 | gp | per cart | — | source-value-visually-confirmed |
| Goods carried by each slave in orc slave train | unspecified | 5–30 | gp | per slave | — | source-value-visually-confirmed |
| Giant owl eggs | unspecified | 1,000 | gp | each | — | source-value-visually-confirmed |
| Giant owl young | unspecified | 2,000 | gp | each | — | source-value-visually-confirmed |
| Giant otter pelts | unspecified | 1,000–4,000 | gp | per pelt | — | source-value-visually-confirmed |
| Owlbear eggs | unspecified | 2,000 | gp | each | — | source-value-visually-confirmed |
| Owlbear young | unspecified | 5,000 | gp | each | — | source-value-visually-confirmed |
| Pegasus eggs | unspecified | 3,000 | gp | each | — | source-value-visually-confirmed |
| Pegasus young | unspecified | 5,000 | gp | each | — | source-value-visually-confirmed |
| Remorhaz eggs | unspecified | 5,000 | gp | each | — | source-value-visually-confirmed |
| Giant weasel pelts | unspecified | 1,000–6,000 | gp | per pelt | — | source-value-visually-confirmed |
| Ambergris from sick whales | unspecified | 1,000–20,000 | gp | — | — | source-value-visually-confirmed |
| Whale carcass | unspecified | 100 | gp | per hit die of size | — | source-value-visually-confirmed |
| Winter wolf pelt | unspecified | 5,000 | gp | per pelt | — | source-value-visually-confirmed |
| TSR mail-order postage and handling | unspecified | $1.00 | USD | per order | — | source-value-visually-confirmed |
| Gems carried by azers | unspecified | 10 / 50 / 100 / 500 | gp | per gem; mapped to strength tiers in source | — | source-value-visually-confirmed |
| Unguent jar made from giant-bee royal jelly | unspecified | 3,000–8,000 | gp | per jar | — | source-value-visually-confirmed |
| Bowler central beryl gem | unspecified | 10 | gp | per gem | — | source-value-visually-confirmed |
| Charon passage fare | unspecified | one magic item OR a silk bag of 100 pp OR two gems worth 500+ gp | gp / pp / item | per passenger passage | — | source-value-visually-confirmed |
| Gems in Derghodaemon treasure | unspecified | base value 100 | gp | per gem; 0–3 gems | — | source-value-visually-confirmed |
| Charonadaemon passenger fare | unspecified | one magic item OR a bag of 10 platinum coins OR two gems worth 50+ gp | gp / coins / item | per passenger | — | source-value-visually-confirmed |
| Eagle eggs or eaglets | unspecified | 60–100 | gp | for viable egg or eaglet (grouped in source) | — | source-value-visually-confirmed |
| Gloomwing ivory mandibles | unspecified | 25 | gp | per gloomwing | — | source-value-visually-confirmed |
| Items in Korred pouch | unspecified | 50–200 | gp | total pouch contents (unit ambiguous) | — | source-value-visually-confirmed |
| Shadow mastiff whelps | unspecified | 200–500 | gp | each | — | source-value-visually-confirmed |
| Items in a Minimal lair | unspecified | unlikely to be 5,000 or more; cumulative value unlikely to reach twice that amount | gp | per item / cumulative set | — | source-value-visually-confirmed |
| Oliphant tusks | unspecified | 100–400 | gp | each tusk | — | source-value-visually-confirmed |
| Oliphant ivory | unspecified | 4 | gp | per pound | — | source-value-visually-confirmed |
| Phoenix feather | unspecified | 50 | gp | each feather | — | source-value-visually-confirmed |
| Phoenix beak, talons, and eyes | unspecified | 100 × average feather value | relative to gp | unit/basis ambiguous | — | source-value-visually-confirmed |
| Spectator guarded treasure | unspecified | at least 15,000 | gp | per treasure/hoard | — | source-value-visually-confirmed |
| Gems in Spectator incidental treasure | unspecified | base value 50 | gp | per gem; 1–6 gems | — | source-value-visually-confirmed |
| Miscellaneous Spectator magic item | unspecified | under 10,000 | gp | per item | — | source-value-visually-confirmed |
| Diamonds extracted from Tarrasque carapace | unspecified | 1,000 | gp | per diamond; 10–100 diamonds | — | source-value-visually-confirmed |
| Land urchin pearls | unspecified | 100–600 | gp | each | — | source-value-visually-confirmed |
| Tenebrous worm mother-of-pearl plates | unspecified | 1,000–3,000 | gp | per set | — | source-value-visually-confirmed |
| Gems in Xaren hoard | unspecified | base value 10 | gp | per gem; 1–8 gems | — | source-value-visually-confirmed |
| Nonmetal magic items in Xaren hoard | unspecified | under 10,000 | gp | per item | — | source-value-visually-confirmed |

Exclusions and unresolved readings:

| Record | Source location | Disposition | Status |
|---|---|---|---|
| Aerial servant carrying capacity | Monster Manual p.6 / PDF 7 | “10,000 gold pieces” is explicitly weight/carrying capacity, not price or value. | original-page-viewed-confirmed-exclusion |
| Beholder telekinesis capacity | Monster Manual p.10 / PDF 11 | “2,500 GP wt.” is a weight limit, not a monetary amount. | original-page-viewed-confirmed-exclusion |
| Camel carrying capacity | Monster Manual p.? / PDF 14 | Gold-piece units describe carried weight/load, not prices. | text-screened-not-visually-reviewed-candidate-pending |
| Efreet carrying capacity | Monster Manual p.? / PDF 38 | Gold-piece units describe weight/carrying capacity. | text-screened-not-visually-reviewed-candidate-pending |
| Djinni carrying capacity | Monster Manual p.38 / PDF 39 | Gold-piece units describe weight/carrying capacity. | text-screened-not-visually-reviewed-candidate-pending |
| Treasure Type table | Monster Manual p.105 / PDF 106 | Treasure-category codes/probability tables and coin quantities are not prices; page reviewed visually. | original-page-viewed-confirmed-exclusion |
| Roper gizzard contents | Monster Manual p.83 / PDF 84 | Randomly generated 3–18 platinum pieces and 5–20 gems have no stated monetary valuation; not price claims. | original-page-viewed-confirmed-exclusion |
| Ant lion incidental lair treasure | Monster Manual II p.10 / PDF 11 | Random treasure quantities (10–40 gp, 5–20 pp) are treasure-generation results, not prices or valuations. | original-page-viewed-confirmed-exclusion |
| Shadow dragon subdual/sale | Monster Manual II p.59 / PDF 60 | Negative sale statement: the source says shadow dragons cannot be subdued and sold; no price is stated. | original-page-viewed-confirmed-exclusion |
| Selkie trade/purchase behavior | Monster Manual II p.107 / PDF 108 | Trade or purchase is mentioned without an amount or specific monetary value. | original-page-viewed-confirmed-exclusion |
| Flying squirrel incidental treasure reference | Monster Manual II p.114 / PDF 115 | No monetary amount or value stated in visually inspected passage. | original-page-viewed-confirmed-exclusion |
| Vargouille lair items | Monster Manual II p.123 / PDF 124 | Generic “items of value” with no monetary amount. | original-page-viewed-confirmed-exclusion |
| Spectator treasure-generation coin distributions | Monster Manual II p.112 / PDF 113 | Random coin counts/odds and probabilities are excluded as treasure-generation quantities; listed gem and item value thresholds are recorded as separate claims. | original-page-viewed-confirmed-exclusion |
| Xaren hoard coin counts | Monster Manual II p.129 / PDF 130 | Coin-type/count probabilities are treasure-generation quantities, not monetary price claims; gem base value and magic-item ceiling are recorded separately. | original-page-viewed-confirmed-exclusion |
| Fire lizard eggs | Monster Manual p.61 / PDF 62 | Do not treat as verified monetary claim; the corresponding wording/value was not visible on the inspected source page. Preserve as OCR/text-layer mismatch for follow-up. | original-page-viewed-not-corroborated |
| Gold nuggets in cavemen treasure | Monster Manual p.68 / PDF 69 | Do not interpret “5 gold pieces” as monetary value; source wording may describe physical size/weight. | original-page-viewed-ambiguous |
| Jewelry in Pech lair | Monster Manual II p.99 / PDF 100 | Do not treat 150 gp as a monetary value; the source explicitly labels it average weight. The low-base-worth wording gives no numeric price. | original-page-viewed-ambiguous |
| Phoenix beak, talons, and eyes | Monster Manual II p.100 / PDF 101 | Retained as relative formula; do not infer a separate 5,000 gp price for each part because the unit scope is not explicit. | original-page-viewed-interpretation-pending |

## Site equipment claims and evidence bindings

Every equipment object appears once. A missing price, estimate, unbound excerpt, or unreviewed field remains explicit. Target-location status and source-value status are separate; estimates do not become printed prices. Coordinates are copied from the source inventory and retain their declared coordinate spaces.

| Object | Claim | Value | Source pages | Target review status | Source-value status | Catalog regions | Crop coordinates | Highlight coordinates | Context status |
|---|---|---|---|---|---|---|---|---|---|---|
| Banded Mail (phb-banded-mail) | /price | 90 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-aace59b02b33236d](https://xertrov.github.io/adnd1/#equipment/phb-banded-mail?source=PHB%3A35&region=phb-35-aace59b02b33236d) | phb-35-aace59b02b33236d: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-aace59b02b33236d: excerpt-image-normalized-top-left-xywh [[0.0139108,0.3014072,0.4464407,0.1049077]] | complete-named-section-independently-reviewed |
| Chain Mail (phb-chain-mail) | /price | 75 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-d84f0af934b8a9ee](https://xertrov.github.io/adnd1/#equipment/phb-chain-mail?source=PHB%3A35&region=phb-35-d84f0af934b8a9ee) | phb-35-d84f0af934b8a9ee: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-d84f0af934b8a9ee: excerpt-image-normalized-top-left-xywh [[0.0139108,0.3950721,0.4464407,0.1049077]] | complete-named-section-independently-reviewed |
| Leather Armor (phb-leather-armor) | /price | 5 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-f5ab4e7e5348e9a6](https://xertrov.github.io/adnd1/#equipment/phb-leather-armor?source=PHB%3A35&region=phb-35-f5ab4e7e5348e9a6) | phb-35-f5ab4e7e5348e9a6: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-f5ab4e7e5348e9a6: excerpt-image-normalized-top-left-xywh [[0.0139108,0.6760671,0.4464407,0.1049077]] | complete-named-section-independently-reviewed |
| Padded Armor (phb-padded-armor) | /price | 4 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-865f8f7b109af773](https://xertrov.github.io/adnd1/#equipment/phb-padded-armor?source=PHB%3A35&region=phb-35-865f8f7b109af773) | phb-35-865f8f7b109af773: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-865f8f7b109af773: excerpt-image-normalized-top-left-xywh [[0.0139108,0.7697321,0.4464407,0.1049077]] | complete-named-section-independently-reviewed |
| Plate Mail (phb-plate-mail) | /price | 400 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-99def3c650df94fc](https://xertrov.github.io/adnd1/#equipment/phb-plate-mail?source=PHB%3A35&region=phb-35-99def3c650df94fc) | phb-35-99def3c650df94fc: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-99def3c650df94fc: excerpt-image-normalized-top-left-xywh [[0.0139108,0.863397,0.4464407,0.1049077]] | complete-named-section-independently-reviewed |
| Ring Mail (phb-ring-mail) | /price | 30 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-b1f6e910536c2e81](https://xertrov.github.io/adnd1/#equipment/phb-ring-mail?source=PHB%3A35&region=phb-35-b1f6e910536c2e81) | phb-35-b1f6e910536c2e81: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-b1f6e910536c2e81: excerpt-image-normalized-top-left-xywh [[0.5325694,0.3014072,0.4451263,0.1049077]] | complete-named-section-independently-reviewed |
| Scale Mail (phb-scale-mail) | /price | 45 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-20b345cc7c7238f1](https://xertrov.github.io/adnd1/#equipment/phb-scale-mail?source=PHB%3A35&region=phb-35-20b345cc7c7238f1) | phb-35-20b345cc7c7238f1: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-20b345cc7c7238f1: excerpt-image-normalized-top-left-xywh [[0.5325694,0.3950721,0.4451263,0.1049077]] | complete-named-section-independently-reviewed |
| Large Shield (phb-large-shield) | /price | 15 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-f011eca09c7a5775](https://xertrov.github.io/adnd1/#equipment/phb-large-shield?source=PHB%3A35&region=phb-35-f011eca09c7a5775) | phb-35-f011eca09c7a5775: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-f011eca09c7a5775: excerpt-image-normalized-top-left-xywh [[0.5325694,0.4887371,0.4451263,0.1049077]] | complete-named-section-independently-reviewed |
| Small Shield (phb-small-shield) | /price | 10 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-23d72cec894afe24](https://xertrov.github.io/adnd1/#equipment/phb-small-shield?source=PHB%3A35&region=phb-35-23d72cec894afe24) | phb-35-23d72cec894afe24: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-23d72cec894afe24: excerpt-image-normalized-top-left-xywh [[0.5325694,0.5824021,0.4451263,0.1049077]] | complete-named-section-independently-reviewed |
| Small Wooden Shield (phb-small-wooden-shield) | /price | 1 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-2614f06d389a1467](https://xertrov.github.io/adnd1/#equipment/phb-small-wooden-shield?source=PHB%3A35&region=phb-35-2614f06d389a1467) | phb-35-2614f06d389a1467: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-2614f06d389a1467: excerpt-image-normalized-top-left-xywh [[0.5325694,0.6760671,0.4451263,0.1049077]] | complete-named-section-independently-reviewed |
| Splint Mail (phb-splint-mail) | /price | 80 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-42b97762fe1ed2b3](https://xertrov.github.io/adnd1/#equipment/phb-splint-mail?source=PHB%3A35&region=phb-35-42b97762fe1ed2b3) | phb-35-42b97762fe1ed2b3: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-42b97762fe1ed2b3: excerpt-image-normalized-top-left-xywh [[0.5325694,0.7697321,0.4451263,0.1049077]] | complete-named-section-independently-reviewed |
| Studded Leather Armor (phb-studded-leather) | /price | 15 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-64098b8281f9246f](https://xertrov.github.io/adnd1/#equipment/phb-studded-leather?source=PHB%3A35&region=phb-35-64098b8281f9246f) | phb-35-64098b8281f9246f: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | phb-35-64098b8281f9246f: excerpt-image-normalized-top-left-xywh [[0.5325694,0.863397,0.4451263,0.1049077]] | complete-named-section-independently-reviewed |
| Bronze Plate Mail (ua-bronze-plate) | /price | 100 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-6a5eef0f79f3086c](https://xertrov.github.io/adnd1/#equipment/ua-bronze-plate?source=UA%3A26&region=ua-26-6a5eef0f79f3086c) | ua-26-6a5eef0f79f3086c: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-6a5eef0f79f3086c: excerpt-image-normalized-top-left-xywh [[0.0131805,0.1872964,0.4489378,0.07447]] | complete-named-section-independently-reviewed |
| Field Plate Armor (ua-field-plate) | /price | 2000 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-d214e2076fba1915](https://xertrov.github.io/adnd1/#equipment/ua-field-plate?source=UA%3A26&region=ua-26-d214e2076fba1915) | ua-26-d214e2076fba1915: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-d214e2076fba1915: excerpt-image-normalized-top-left-xywh [[0.0131805,0.245218,0.4489378,0.072402]] | complete-named-section-independently-reviewed |
| Full Plate Armor (ua-full-plate) | /price | 4000 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-bf37c8502acdf9cf](https://xertrov.github.io/adnd1/#equipment/ua-full-plate?source=UA%3A26&region=ua-26-bf37c8502acdf9cf) | ua-26-bf37c8502acdf9cf: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-bf37c8502acdf9cf: excerpt-image-normalized-top-left-xywh [[0.5124289,0.1872964,0.4489378,0.07447]] | complete-named-section-independently-reviewed |
| Buckler (ua-buckler) | /price | 5 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-9dcac2a5402268a6](https://xertrov.github.io/adnd1/#equipment/ua-buckler?source=UA%3A26&region=ua-26-9dcac2a5402268a6) | ua-26-9dcac2a5402268a6: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-9dcac2a5402268a6: excerpt-image-normalized-top-left-xywh [[0.5124289,0.245218,0.4489378,0.072402]] | complete-named-section-independently-reviewed |
| Light Crossbow (phb-light-crossbow) | /price | 12 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-light-crossbow-phb35-5](https://xertrov.github.io/adnd1/#equipment/phb-light-crossbow?source=PHB%3A35&region=phb-light-crossbow-phb35-5) | phb-light-crossbow-phb35-5: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-light-crossbow-phb35-5: excerpt-image-normalized-top-left-xywh [[0.0139108,0.4721445,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Heavy Crossbow (phb-heavy-crossbow) | /price | 20 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-heavy-crossbow-phb35-4](https://xertrov.github.io/adnd1/#equipment/phb-heavy-crossbow?source=PHB%3A35&region=phb-heavy-crossbow-phb35-4) | phb-heavy-crossbow-phb35-4: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-heavy-crossbow-phb35-4: excerpt-image-normalized-top-left-xywh [[0.0139108,0.4392074,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Hand Crossbow (ua-hand-crossbow) | /price | 300 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-2050405f1a0b904b](https://xertrov.github.io/adnd1/#equipment/ua-hand-crossbow?source=UA%3A26&region=ua-26-2050405f1a0b904b) | ua-26-2050405f1a0b904b: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-2050405f1a0b904b: excerpt-image-normalized-top-left-xywh [[0.0131805,0.6817023,0.4489378,0.068266]] | complete-named-section-independently-reviewed |
| Quarrels for same (ua-quarrels-for-same) | /price | 100 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua26-quarrels-for-same-price](https://xertrov.github.io/adnd1/#equipment/ua-quarrels-for-same?source=UA%3A26&region=ua26-quarrels-for-same-price) | ua26-quarrels-for-same-price: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua26-quarrels-for-same-price: excerpt-image-normalized-top-left-xywh [[0.0131804998,0.735487923,0.4489378263,0.0703339865]] | complete-named-section-independently-reviewed |
| Battle Axe (phb-battle-axe) | /price | 5 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [battle-axe-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-battle-axe?source=PHB%3A35&region=battle-axe-phb35-price) | battle-axe-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | battle-axe-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.142776,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Hand or Throwing Axe (phb-hand-axe) | /price | 1 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [hand-axe-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-hand-axe?source=PHB%3A35&region=hand-axe-phb35-price) | hand-axe-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | hand-axe-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.1757132,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Bardiche (phb-bardiche) | /price | 7 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [bardiche-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-bardiche?source=PHB%3A35&region=bardiche-phb35-price) | bardiche-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | bardiche-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.2086503,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Bec de Corbin (phb-bec-de-corbin) | /price | 6 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [bec-de-corbin-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-bec-de-corbin?source=PHB%3A35&region=bec-de-corbin-phb35-price) | bec-de-corbin-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | bec-de-corbin-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.2415874,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Bill-Guisarme (phb-bill-guisarme) | /price | 6 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [bill-guisarme-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-bill-guisarme?source=PHB%3A35&region=bill-guisarme-phb35-price) | bill-guisarme-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | bill-guisarme-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.2745217,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Bo Stick (phb-bo-stick) | /price | 5 sp (editorial estimate) | — | no-target-binding | no-independent-source-value-status | — | — | — | context-not-assessed |
| Club (phb-club) | /price | 2 sp (editorial estimate) | — | no-target-binding | no-independent-source-value-status | — | — | — | context-not-assessed |
| Dagger (phb-dagger) | /price | 2 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb35-dagger-price](https://xertrov.github.io/adnd1/#equipment/phb-dagger?source=PHB%3A35&region=phb35-dagger-price) | phb35-dagger-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb35-dagger-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.5050816,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Dart (phb-dart) | /price | 5 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-39a7f4b2bff87523](https://xertrov.github.io/adnd1/#equipment/phb-dart?source=PHB%3A35&region=phb-35-39a7f4b2bff87523) | phb-35-39a7f4b2bff87523: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-39a7f4b2bff87523: excerpt-image-normalized-top-left-xywh [[0.0139108,0.5380159,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Footman's Mace (phb-footmans-mace) | /price | 8 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-1bb9ca6d0427b730](https://xertrov.github.io/adnd1/#equipment/phb-footmans-mace?source=PHB%3A35&region=phb-35-1bb9ca6d0427b730) | phb-35-1bb9ca6d0427b730: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-1bb9ca6d0427b730: excerpt-image-normalized-top-left-xywh [[0.5325694,0.1098389,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Horseman's Mace (phb-horsemans-mace) | /price | 4 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-4f2b2854a732ee50](https://xertrov.github.io/adnd1/#equipment/phb-horsemans-mace?source=PHB%3A35&region=phb-35-4f2b2854a732ee50) | phb-35-4f2b2854a732ee50: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-4f2b2854a732ee50: excerpt-image-normalized-top-left-xywh [[0.5325694,0.142776,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Morning Star (phb-morning-star) | /price | 5 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-b0adaf70349ce316](https://xertrov.github.io/adnd1/#equipment/phb-morning-star?source=PHB%3A35&region=phb-35-b0adaf70349ce316) | phb-35-b0adaf70349ce316: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-b0adaf70349ce316: excerpt-image-normalized-top-left-xywh [[0.5325694,0.1757132,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Partisan (phb-partisan) | /price | 10 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-5cab6cf8814c983e](https://xertrov.github.io/adnd1/#equipment/phb-partisan?source=PHB%3A35&region=phb-35-5cab6cf8814c983e) | phb-35-5cab6cf8814c983e: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-5cab6cf8814c983e: excerpt-image-normalized-top-left-xywh [[0.5325694,0.2086503,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Ranseur (phb-ranseur) | /price | 4 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-913f04e59cc371e4](https://xertrov.github.io/adnd1/#equipment/phb-ranseur?source=PHB%3A35&region=phb-35-913f04e59cc371e4) | phb-35-913f04e59cc371e4: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-913f04e59cc371e4: excerpt-image-normalized-top-left-xywh [[0.5325694,0.4721445,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Scimitar (phb-scimitar) | /price | 15 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-4fc67731e01e6918](https://xertrov.github.io/adnd1/#equipment/phb-scimitar?source=PHB%3A35&region=phb-35-4fc67731e01e6918) | phb-35-4fc67731e01e6918: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-4fc67731e01e6918: excerpt-image-normalized-top-left-xywh [[0.5325694,0.5050816,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Spear (phb-spear) | /price | 1 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-284953272c29bf7c](https://xertrov.github.io/adnd1/#equipment/phb-spear?source=PHB%3A35&region=phb-35-284953272c29bf7c) | phb-35-284953272c29bf7c: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-284953272c29bf7c: excerpt-image-normalized-top-left-xywh [[0.5325694,0.6038902,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Long Sword (phb-long-sword) | /price | 15 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-long-sword-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-long-sword?source=PHB%3A35&region=phb-long-sword-phb35-price) | phb-long-sword-phb35-price: catalog-bounds-pdf-points-as-recorded [303,213,576,603] | phb-long-sword-phb35-price: excerpt-image-normalized-top-left-xywh [[0.5384615384615384,0.8528205128205129,0.4542124542124542,0.023589743589743414]] | complete-named-table-independently-reviewed |
| Short Sword (phb-short-sword) | /price | 8 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-17a26604e3e44609](https://xertrov.github.io/adnd1/#equipment/phb-short-sword?source=PHB%3A35&region=phb-35-17a26604e3e44609) | phb-35-17a26604e3e44609: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-17a26604e3e44609: excerpt-image-normalized-top-left-xywh [[0.5325694,0.801513,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Two-Handed Sword (phb-two-handed-sword) | /price | 30 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-982a00ff8007c043](https://xertrov.github.io/adnd1/#equipment/phb-two-handed-sword?source=PHB%3A35&region=phb-35-982a00ff8007c043) | phb-35-982a00ff8007c043: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-982a00ff8007c043: excerpt-image-normalized-top-left-xywh [[0.5325694,0.8344472,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Trident (phb-trident) | /price | 4 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-1cf0bb92e8a805c2](https://xertrov.github.io/adnd1/#equipment/phb-trident?source=PHB%3A35&region=phb-35-1cf0bb92e8a805c2) | phb-35-1cf0bb92e8a805c2: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-1cf0bb92e8a805c2: excerpt-image-normalized-top-left-xywh [[0.5325694,0.8673844,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Quarterstaff (phb-quarterstaff) | /price | 5 sp (editorial estimate) | — | no-target-binding | no-independent-source-value-status | — | — | — | context-not-assessed |
| Bastard Sword (phb-bastard-sword) | /price | 25 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-1314b314838b1c3f](https://xertrov.github.io/adnd1/#equipment/phb-bastard-sword?source=PHB%3A35&region=phb-35-1314b314838b1c3f) | phb-35-1314b314838b1c3f: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-1314b314838b1c3f: excerpt-image-normalized-top-left-xywh [[0.5325694,0.6697644,0.4451263,0.0698249]] | complete-named-section-independently-reviewed |
| Arrow (phb-arrow) | /price | 2 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-arrow-phb35-1](https://xertrov.github.io/adnd1/#equipment/phb-arrow?source=PHB%3A35&region=phb-arrow-phb35-1) | phb-arrow-phb35-1: catalog-bounds-pdf-points-as-recorded [303,213,576,603] | phb-arrow-phb35-1: excerpt-image-normalized-top-left-xywh [[0.013919413919413962,0.34461538461538455,0.43772893772893773,0.02282051282051291]] | complete-named-table-independently-reviewed |
| Light Crossbow Bolt (phb-light-bolt) | /price | 1 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-d8da99751ede822c](https://xertrov.github.io/adnd1/#equipment/phb-light-bolt?source=PHB%3A35&region=phb-35-d8da99751ede822c) | phb-35-d8da99751ede822c: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-d8da99751ede822c: excerpt-image-normalized-top-left-xywh [[0.5325694,0.340396,0.4451263,0.0698249]] | complete-named-section-independently-reviewed |
| Heavy Crossbow Bolt (phb-heavy-bolt) | /price | 2 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-c90ca0676ea28398](https://xertrov.github.io/adnd1/#equipment/phb-heavy-bolt?source=PHB%3A35&region=phb-35-c90ca0676ea28398) | phb-35-c90ca0676ea28398: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-c90ca0676ea28398: excerpt-image-normalized-top-left-xywh [[0.5325694,0.4062702,0.4451263,0.0698249]] | complete-named-section-independently-reviewed |
| Sling & Bullets, dozen (phb-sling-bullets-dozen) | /price | 15 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb35-sling-bullets-dozen-price](https://xertrov.github.io/adnd1/#equipment/phb-sling-bullets-dozen?source=PHB%3A35&region=phb35-sling-bullets-dozen-price) | phb35-sling-bullets-dozen-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb35-sling-bullets-dozen-price: excerpt-image-normalized-top-left-xywh [[0.5325693621,0.5380158862,0.4451262783,0.0368906272]] | complete-named-section-independently-reviewed |
| Sling Bullet (phb-sling-bullet) | /price | 10 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-e26aa3a231ae45fc](https://xertrov.github.io/adnd1/#equipment/phb-sling-bullet?source=PHB%3A35&region=phb-35-e26aa3a231ae45fc) | phb-35-e26aa3a231ae45fc: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-35-e26aa3a231ae45fc: excerpt-image-normalized-top-left-xywh [[0.5325694,0.570953,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Sling Stone (phb-sling-stone) | /price | 1 sp (editorial estimate) | — | no-target-binding | no-independent-source-value-status | — | — | — | context-not-assessed |
| Rope, 50 Feet (phb-rope-50) | /price | 4 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-d30bd2bcea71dd25](https://xertrov.github.io/adnd1/#equipment/phb-rope-50?source=PHB%3A36&region=phb-36-d30bd2bcea71dd25) | phb-36-d30bd2bcea71dd25: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-d30bd2bcea71dd25: excerpt-image-normalized-top-left-xywh [[0.5335126,0.4605016,0.4559068,0.052928]] | complete-named-section-independently-reviewed |
| Torch (phb-torch) | /price | 1 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-4e708dd824f85baa](https://xertrov.github.io/adnd1/#equipment/phb-torch?source=PHB%3A36&region=phb-36-4e708dd824f85baa) | phb-36-4e708dd824f85baa: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-4e708dd824f85baa: excerpt-image-normalized-top-left-xywh [[0.5335126,0.8777242,0.4559068,0.052928]] | complete-named-section-independently-reviewed |
| Tinder Box with Flint and Steel (phb-tinder-box) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-5622e89b3bb6c9f9](https://xertrov.github.io/adnd1/#equipment/phb-tinder-box?source=PHB%3A36&region=phb-36-5622e89b3bb6c9f9) | phb-36-5622e89b3bb6c9f9: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-5622e89b3bb6c9f9: excerpt-image-normalized-top-left-xywh [[0.5335126,0.818121,0.4559068,0.0553128]] | complete-named-section-independently-reviewed |
| Thieves' Picks and Tools (phb-thieves-tools) | /price | 30 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-37c712ea2891ef8b](https://xertrov.github.io/adnd1/#equipment/phb-thieves-tools?source=PHB%3A36&region=phb-36-37c712ea2891ef8b) | phb-36-37c712ea2891ef8b: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-37c712ea2891ef8b: excerpt-image-normalized-top-left-xywh [[0.5335126,0.7585177,0.4559068,0.0624618]] | complete-named-section-independently-reviewed |
| Oil Flask (phb-oil-flask) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-f2e8b3dd11128e89](https://xertrov.github.io/adnd1/#equipment/phb-oil-flask?source=PHB%3A36&region=phb-36-f2e8b3dd11128e89) | phb-36-f2e8b3dd11128e89: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-f2e8b3dd11128e89: excerpt-image-normalized-top-left-xywh [[0.009619,0.8753395,0.4532402,0.052928]] | complete-named-section-independently-reviewed |
| Bullseye Lantern (phb-bullseye-lantern) | /price | 12 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-4207bf75234aa527](https://xertrov.github.io/adnd1/#equipment/phb-bullseye-lantern?source=PHB%3A36&region=phb-36-4207bf75234aa527) | phb-36-4207bf75234aa527: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-4207bf75234aa527: excerpt-image-normalized-top-left-xywh [[0.009619,0.641696,0.4532402,0.0481585]] | complete-named-section-independently-reviewed |
| Small Silver Mirror (phb-silver-mirror) | /price | 20 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-8024b0e2e0ea9824](https://xertrov.github.io/adnd1/#equipment/phb-silver-mirror?source=PHB%3A36&region=phb-36-8024b0e2e0ea9824) | phb-36-8024b0e2e0ea9824: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-8024b0e2e0ea9824: excerpt-image-normalized-top-left-xywh [[0.009619,0.818121,0.4532402,0.052928]] | complete-named-section-independently-reviewed |
| Large Sack (phb-large-sack) | /price | 16 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-6005301cb4e9c414](https://xertrov.github.io/adnd1/#equipment/phb-large-sack?source=PHB%3A36&region=phb-36-6005301cb4e9c414) | phb-36-6005301cb4e9c414: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-6005301cb4e9c414: excerpt-image-normalized-top-left-xywh [[0.5335126,0.5201048,0.4559068,0.0600771]] | complete-named-section-independently-reviewed |
| Small Sack (phb-small-sack) | /price | 10 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-a6df005be07bd6fb](https://xertrov.github.io/adnd1/#equipment/phb-small-sack?source=PHB%3A36&region=phb-36-a6df005be07bd6fb) | phb-36-a6df005be07bd6fb: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-a6df005be07bd6fb: excerpt-image-normalized-top-left-xywh [[0.5335126,0.5797081,0.4559068,0.0505432]] | complete-named-section-independently-reviewed |
| Bone Map or Scroll Case (phb-bone-case) | /price | 5 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-d3d596c3f9310d33](https://xertrov.github.io/adnd1/#equipment/phb-bone-case?source=PHB%3A36&region=phb-36-d3d596c3f9310d33) | phb-36-d3d596c3f9310d33: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-d3d596c3f9310d33: excerpt-image-normalized-top-left-xywh [[0.009619,0.3985188,0.4532402,0.0553128]] | complete-named-section-independently-reviewed |
| Leather Map or Scroll Case (phb-leather-case) | /price | 15 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-db02eda60d939f5b](https://xertrov.github.io/adnd1/#equipment/phb-leather-case?source=PHB%3A36&region=phb-36-db02eda60d939f5b) | phb-36-db02eda60d939f5b: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-db02eda60d939f5b: excerpt-image-normalized-top-left-xywh [[0.009619,0.4581168,0.4532402,0.0553128]] | complete-named-section-independently-reviewed |
| Large Wooden Chest (phb-large-chest) | /price | 17 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-4025bbdca977ee3d](https://xertrov.github.io/adnd1/#equipment/phb-large-chest?source=PHB%3A36&region=phb-36-4025bbdca977ee3d) | phb-36-4025bbdca977ee3d: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-4025bbdca977ee3d: excerpt-image-normalized-top-left-xywh [[0.009619,0.5177201,0.4532402,0.052928]] | complete-named-section-independently-reviewed |
| Small Wooden Chest (phb-small-chest) | /price | 8 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-d649c545da24eb5e](https://xertrov.github.io/adnd1/#equipment/phb-small-chest?source=PHB%3A36&region=phb-36-d649c545da24eb5e) | phb-36-d649c545da24eb5e: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-d649c545da24eb5e: excerpt-image-normalized-top-left-xywh [[0.009619,0.5773233,0.4532402,0.052928]] | complete-named-section-independently-reviewed |
| Skin for Water or Wine (phb-waterskin) | /price | 15 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-2706dbee6278bfa0](https://xertrov.github.io/adnd1/#equipment/phb-waterskin?source=PHB%3A36&region=phb-36-2706dbee6278bfa0) | phb-36-2706dbee6278bfa0: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-2706dbee6278bfa0: excerpt-image-normalized-top-left-xywh [[0.5335126,0.6393113,0.4559068,0.0505432]] | complete-named-section-independently-reviewed |
| Large Iron Spike (phb-iron-spike) | /price | 1 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-7decb826cf76a4c3](https://xertrov.github.io/adnd1/#equipment/phb-iron-spike?source=PHB%3A36&region=phb-36-7decb826cf76a4c3) | phb-36-7decb826cf76a4c3: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-7decb826cf76a4c3: excerpt-image-normalized-top-left-xywh [[0.5335126,0.6989145,0.4559068,0.052928]] | complete-named-section-independently-reviewed |
| Arrow Quiver, Dozen Capacity (phb-arrow-quiver-12) | /price | 8 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-247acc3d968cfb3f](https://xertrov.github.io/adnd1/#equipment/phb-arrow-quiver-12?source=PHB%3A36&region=phb-36-247acc3d968cfb3f) | phb-36-247acc3d968cfb3f: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-247acc3d968cfb3f: excerpt-image-normalized-top-left-xywh [[0.5335126,0.2268634,0.4559068,0.0481585]] | complete-named-section-independently-reviewed |
| Arrow Quiver, Score Capacity (phb-arrow-quiver-20) | /price | 12 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-f425970a3ac050cd](https://xertrov.github.io/adnd1/#equipment/phb-arrow-quiver-20?source=PHB%3A36&region=phb-36-f425970a3ac050cd) | phb-36-f425970a3ac050cd: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-f425970a3ac050cd: excerpt-image-normalized-top-left-xywh [[0.5335126,0.2816971,0.4559068,0.052928]] | complete-named-section-independently-reviewed |
| Bolt Quiver, Score Capacity (phb-bolt-quiver-20) | /price | 15 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-e82ed8b9ff17486a](https://xertrov.github.io/adnd1/#equipment/phb-bolt-quiver-20?source=PHB%3A36&region=phb-36-e82ed8b9ff17486a) | phb-36-e82ed8b9ff17486a: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-e82ed8b9ff17486a: excerpt-image-normalized-top-left-xywh [[0.5335126,0.3413003,0.4559068,0.052928]] | complete-named-section-independently-reviewed |
| Bolt Quiver, Two-Score Capacity (phb-bolt-quiver-40) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-c492bdc4ea6c0ca9](https://xertrov.github.io/adnd1/#equipment/phb-bolt-quiver-40?source=PHB%3A36&region=phb-36-c492bdc4ea6c0ca9) | phb-36-c492bdc4ea6c0ca9: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-c492bdc4ea6c0ca9: excerpt-image-normalized-top-left-xywh [[0.5335126,0.4008984,0.4559068,0.0600771]] | complete-named-section-independently-reviewed |
| Tallow Candle (phb-tallow-candle) | /price | 1 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-601bb95371105f4c](https://xertrov.github.io/adnd1/#equipment/phb-tallow-candle?source=PHB%3A36&region=phb-36-601bb95371105f4c) | phb-36-601bb95371105f4c: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-601bb95371105f4c: excerpt-image-normalized-top-left-xywh [[0.009619,0.2793124,0.4532402,0.052928]] | complete-named-section-independently-reviewed |
| Wax Candle (phb-wax-candle) | /price | 1 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-f035d8e24327536a](https://xertrov.github.io/adnd1/#equipment/phb-wax-candle?source=PHB%3A36&region=phb-36-f035d8e24327536a) | phb-36-f035d8e24327536a: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | phb-36-f035d8e24327536a: excerpt-image-normalized-top-left-xywh [[0.009619,0.3389156,0.4532402,0.052928]] | complete-named-section-independently-reviewed |
| Prayer Beads (phb-prayer-beads) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-09102f201fc4e17f](https://xertrov.github.io/adnd1/#equipment/phb-prayer-beads?source=PHB%3A36&region=phb-36-09102f201fc4e17f) | phb-36-09102f201fc4e17f: catalog-bounds-pdf-points-as-recorded [10,434,280,492] | phb-36-09102f201fc4e17f: excerpt-image-normalized-top-left-xywh [[0.009619,0.2361377,0.4532402,0.1688247]] | complete-named-section-independently-reviewed |
| Incense Stick (phb-incense) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-e4468a285b12ac22](https://xertrov.github.io/adnd1/#equipment/phb-incense?source=PHB%3A36&region=phb-36-e4468a285b12ac22) | phb-36-e4468a285b12ac22: catalog-bounds-pdf-points-as-recorded [10,434,280,492] | phb-36-e4468a285b12ac22: excerpt-image-normalized-top-left-xywh [[0.009619,0.4099239,0.4532402,0.1377953]] | complete-named-section-independently-reviewed |
| Holy Water (phb-holy-water) | /price | 25 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-d9da603a48a956f7](https://xertrov.github.io/adnd1/#equipment/phb-holy-water?source=PHB%3A36&region=phb-36-d9da603a48a956f7) | phb-36-d9da603a48a956f7: catalog-bounds-pdf-points-as-recorded [10,434,280,492] | phb-36-d9da603a48a956f7: excerpt-image-normalized-top-left-xywh [[0.5335126,0.4099239,0.4559068,0.1564075],[0.5654444,0.5517241,0.1505926,0.1667241]] | complete-named-section-independently-reviewed |
| Standard Rations, One Week (phb-standard-rations) | /price | 3 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-5983bc19509a5109](https://xertrov.github.io/adnd1/#equipment/phb-standard-rations?source=PHB%3A36&region=phb-36-5983bc19509a5109) | phb-36-5983bc19509a5109: catalog-bounds-pdf-points-as-recorded [9.999999999999998,347,280,410] | phb-36-5983bc19509a5109: excerpt-image-normalized-top-left-xywh [[0.5335126,0.5126391,0.4559068,0.1497101]] | complete-named-section-independently-reviewed |
| Knife and Scabbard (ua-knife) | /price | 1 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-ff2f89f868f6e0c2](https://xertrov.github.io/adnd1/#equipment/ua-knife?source=UA%3A26&region=ua-26-ff2f89f868f6e0c2) | ua-26-ff2f89f868f6e0c2: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-ff2f89f868f6e0c2: excerpt-image-normalized-top-left-xywh [[0.5124289,0.3962304,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Lasso (ua-lasso) | /price | 5 sp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-c99aac289249cfc2](https://xertrov.github.io/adnd1/#equipment/ua-lasso?source=UA%3A26&region=ua-26-c99aac289249cfc2) | ua-26-c99aac289249cfc2: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-c99aac289249cfc2: excerpt-image-normalized-top-left-xywh [[0.5124289,0.454152,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Man Catcher (ua-man-catcher) | /price | 25 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-b4ab5a1f34aa6c76](https://xertrov.github.io/adnd1/#equipment/ua-man-catcher?source=UA%3A26&region=ua-26-b4ab5a1f34aa6c76) | ua-26-b4ab5a1f34aa6c76: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-b4ab5a1f34aa6c76: excerpt-image-normalized-top-left-xywh [[0.5124289,0.5120736,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Sap (ua-sap) | /price | 1 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-45b451becb37089c](https://xertrov.github.io/adnd1/#equipment/ua-sap?source=UA%3A26&region=ua-26-45b451becb37089c) | ua-26-45b451becb37089c: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-45b451becb37089c: excerpt-image-normalized-top-left-xywh [[0.5124289,0.5699952,0.4489378,0.066198]] | complete-named-section-independently-reviewed |
| Staff Sling (ua-staff-sling) | /price | 2 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-5ac322373a4286b1](https://xertrov.github.io/adnd1/#equipment/ua-staff-sling?source=UA%3A26&region=ua-26-5ac322373a4286b1) | ua-26-5ac322373a4286b1: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-5ac322373a4286b1: excerpt-image-normalized-top-left-xywh [[0.5124289,0.6817023,0.4489378,0.068266]] | complete-named-section-independently-reviewed |
| Falchion and Scabbard (ua-falchion) | /price | 10 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-88c44f746d073716](https://xertrov.github.io/adnd1/#equipment/ua-falchion?source=UA%3A26&region=ua-26-88c44f746d073716) | ua-26-88c44f746d073716: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-88c44f746d073716: excerpt-image-normalized-top-left-xywh [[0.5124289,0.7354879,0.4489378,0.1261876]] | complete-named-section-independently-reviewed |
| Khopesh Sword (ua-khopesh) | /price | 10 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-15cc303fc8a3236a](https://xertrov.github.io/adnd1/#equipment/ua-khopesh?source=UA%3A26&region=ua-26-15cc303fc8a3236a) | ua-26-15cc303fc8a3236a: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-15cc303fc8a3236a: excerpt-image-normalized-top-left-xywh [[0.5124289,0.8492631,0.4489378,0.06413]] | complete-named-section-independently-reviewed |
| Whip (ua-whip) | /price | 3 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-ac683f167585c121](https://xertrov.github.io/adnd1/#equipment/ua-whip?source=UA%3A26&region=ua-26-ac683f167585c121) | ua-26-ac683f167585c121: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-ac683f167585c121: excerpt-image-normalized-top-left-xywh [[0.5124289,0.9009763,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Spiked Buckler (ua-spiked-buckler) | /price | 10 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-26-e1f91b5131440b9a](https://xertrov.github.io/adnd1/#equipment/ua-spiked-buckler?source=UA%3A26&region=ua-26-e1f91b5131440b9a) | ua-26-e1f91b5131440b9a: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-26-e1f91b5131440b9a: excerpt-image-normalized-top-left-xywh [[0.5124289,0.6237807,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Composite Long Bow (phb-composite-long-bow) | /price | 100 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-composite-long-bow-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-composite-long-bow?source=PHB%3A35&region=phb-composite-long-bow-phb35-price) | phb-composite-long-bow-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-composite-long-bow-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.340396,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Composite Short Bow (phb-composite-short-bow) | /price | 75 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-composite-short-bow-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-composite-short-bow?source=PHB%3A35&region=phb-composite-short-bow-phb35-price) | phb-composite-short-bow-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-composite-short-bow-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.3074588,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Long Bow (phb-long-bow) | /price | 60 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-long-bow-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-long-bow?source=PHB%3A35&region=phb-long-bow-phb35-price) | phb-long-bow-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-long-bow-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.3733331,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Short Bow (phb-short-bow) | /price | 15 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-short-bow-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-short-bow?source=PHB%3A35&region=phb-short-bow-phb35-price) | phb-short-bow-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-short-bow-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.4062702,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Silver Arrow (phb-silver-arrow) | /price | 1 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-silver-arrow-phb35-price](https://xertrov.github.io/adnd1/#equipment/phb-silver-arrow?source=PHB%3A35&region=phb-silver-arrow-phb35-price) | phb-silver-arrow-phb35-price: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | phb-silver-arrow-phb35-price: excerpt-image-normalized-top-left-xywh [[0.0139108,0.1098389,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Aklys (hurled) (ua-aklys-hurled) | /price | 2 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-equipment-price-table](https://xertrov.github.io/adnd1/#equipment/ua-aklys-hurled?source=UA%3A26&region=ua-equipment-price-table) | ua-equipment-price-table: catalog-bounds-pdf-points-as-recorded [14,17,283,206] | ua-equipment-price-table: excerpt-image-normalized-top-left-xywh [[0.007434944237918215,0.47195767195767196,0.46096654275092935,0.05608465608465606]] | complete-named-table-independently-reviewed |
| Atlatl (javelin) (ua-atlatl-javelin) | /price | 1 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-equipment-price-table](https://xertrov.github.io/adnd1/#equipment/ua-atlatl-javelin?source=UA%3A26&region=ua-equipment-price-table) | ua-equipment-price-table: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-equipment-price-table: excerpt-image-normalized-top-left-xywh [[0.0131805,0.454152,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Blowgun Needle (ua-blowgun-needle) | /price | 1 sp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [ua-equipment-price-table](https://xertrov.github.io/adnd1/#equipment/ua-blowgun-needle?source=UA%3A26&region=ua-equipment-price-table) | ua-equipment-price-table: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | ua-equipment-price-table: excerpt-image-normalized-top-left-xywh [[0.0131805,0.5699952,0.4489378,0.066198]] | complete-named-section-independently-reviewed |
| Belt (phb-belt) | /price | 3 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-dfb67431855cb9f7](https://xertrov.github.io/adnd1/#equipment/phb-belt?source=PHB%3A35&region=phb-35-dfb67431855cb9f7) | phb-35-dfb67431855cb9f7: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-dfb67431855cb9f7: excerpt-image-normalized-top-left-xywh [[0.010299,0.174059,0.448076,0.134282]] | complete-named-section-independently-reviewed |
| Boots, high, hard (phb-boots-high-hard) | /price | 2 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-8a27bc1c8547b582](https://xertrov.github.io/adnd1/#equipment/phb-boots-high-hard?source=PHB%3A35&region=phb-35-8a27bc1c8547b582) | phb-35-8a27bc1c8547b582: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-8a27bc1c8547b582: excerpt-image-normalized-top-left-xywh [[0.010299,0.29395,0.448076,0.134282]] | complete-named-section-independently-reviewed |
| Boots, high, soft (phb-boots-high-soft) | /price | 1 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-5cf25576b2c95952](https://xertrov.github.io/adnd1/#equipment/phb-boots-high-soft?source=PHB%3A35&region=phb-35-5cf25576b2c95952) | phb-35-5cf25576b2c95952: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-5cf25576b2c95952: excerpt-image-normalized-top-left-xywh [[0.010299,0.413842,0.448076,0.134282]] | complete-named-section-independently-reviewed |
| Boots, low, hard (phb-boots-low-hard) | /price | 1 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-e6cd539e4ddc5e24](https://xertrov.github.io/adnd1/#equipment/phb-boots-low-hard?source=PHB%3A35&region=phb-35-e6cd539e4ddc5e24) | phb-35-e6cd539e4ddc5e24: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-e6cd539e4ddc5e24: excerpt-image-normalized-top-left-xywh [[0.010299,0.533733,0.448076,0.134282]] | complete-named-section-independently-reviewed |
| Boots, low, soft (phb-boots-low-soft) | /price | 8 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-2802a096ca5731f5](https://xertrov.github.io/adnd1/#equipment/phb-boots-low-soft?source=PHB%3A35&region=phb-35-2802a096ca5731f5) | phb-35-2802a096ca5731f5: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-2802a096ca5731f5: excerpt-image-normalized-top-left-xywh [[0.010299,0.653624,0.448076,0.134282]] | complete-named-section-independently-reviewed |
| Cap (phb-cap) | /price | 1 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-82b0add80035d052](https://xertrov.github.io/adnd1/#equipment/phb-cap?source=PHB%3A35&region=phb-35-82b0add80035d052) | phb-35-82b0add80035d052: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-82b0add80035d052: excerpt-image-normalized-top-left-xywh [[0.010299,0.773505,0.448076,0.134282]] | complete-named-section-independently-reviewed |
| Cloak (phb-cloak) | /price | 5 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-55db93faf8aed753](https://xertrov.github.io/adnd1/#equipment/phb-cloak?source=PHB%3A35&region=phb-35-55db93faf8aed753) | phb-35-55db93faf8aed753: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-55db93faf8aed753: excerpt-image-normalized-top-left-xywh [[0.530857,0.224332,0.446757,0.134282]] | complete-named-section-independently-reviewed |
| Girdle, broad (phb-girdle-broad) | /price | 2 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-9f080384ef47e10d](https://xertrov.github.io/adnd1/#equipment/phb-girdle-broad?source=PHB%3A35&region=phb-35-9f080384ef47e10d) | phb-35-9f080384ef47e10d: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-9f080384ef47e10d: excerpt-image-normalized-top-left-xywh [[0.530857,0.344224,0.446757,0.134282]] | complete-named-section-independently-reviewed |
| Girdle, normal (phb-girdle-normal) | /price | 10 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-f322300291c189c8](https://xertrov.github.io/adnd1/#equipment/phb-girdle-normal?source=PHB%3A35&region=phb-35-f322300291c189c8) | phb-35-f322300291c189c8: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-f322300291c189c8: excerpt-image-normalized-top-left-xywh [[0.530857,0.464115,0.446757,0.134282]] | complete-named-section-independently-reviewed |
| Hat (phb-hat) | /price | 7 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-3e7f5f6d11486c02](https://xertrov.github.io/adnd1/#equipment/phb-hat?source=PHB%3A35&region=phb-35-3e7f5f6d11486c02) | phb-35-3e7f5f6d11486c02: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-3e7f5f6d11486c02: excerpt-image-normalized-top-left-xywh [[0.530857,0.584006,0.446757,0.134282]] | complete-named-section-independently-reviewed |
| Robe (phb-robe) | /price | 6 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-35-6ac8d1f712f64938](https://xertrov.github.io/adnd1/#equipment/phb-robe?source=PHB%3A35&region=phb-35-6ac8d1f712f64938) | phb-35-6ac8d1f712f64938: rendered-source-page-normalized-top-left-xywh [0.5182679635392394,0.7956521340493581,0.46695430378287905,0.09547825608592297] | phb-35-6ac8d1f712f64938: excerpt-image-normalized-top-left-xywh [[0.530857,0.703897,0.446757,0.134282]] | complete-named-section-independently-reviewed |
| Ale, pint (phb-ale-pint) | /price | 1 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-a78d79355bbab393](https://xertrov.github.io/adnd1/#equipment/phb-ale-pint?source=PHB%3A36&region=phb-36-a78d79355bbab393) | phb-36-a78d79355bbab393: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-a78d79355bbab393: excerpt-image-normalized-top-left-xywh [[0.009619,0.221206,0.45324,0.121143]] | complete-named-section-independently-reviewed |
| Beer, small, pint (phb-beer-small-pint) | /price | 5 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-a6c3f0941b904a9b](https://xertrov.github.io/adnd1/#equipment/phb-beer-small-pint?source=PHB%3A36&region=phb-36-a6c3f0941b904a9b) | phb-36-a6c3f0941b904a9b: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-a6c3f0941b904a9b: excerpt-image-normalized-top-left-xywh [[0.009619,0.369781,0.45324,0.115428]] | complete-named-section-independently-reviewed |
| Food, merchant’s meal (phb-food-merchant-s-meal) | /price | 1 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-fc5ab09379c53fdc](https://xertrov.github.io/adnd1/#equipment/phb-food-merchant-s-meal?source=PHB%3A36&region=phb-36-fc5ab09379c53fdc) | phb-36-fc5ab09379c53fdc: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-fc5ab09379c53fdc: excerpt-image-normalized-top-left-xywh [[0.009619,0.501207,0.45324,0.121143]] | complete-named-section-independently-reviewed |
| Food, rich meal (phb-food-rich-meal) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-327119801d96f63f](https://xertrov.github.io/adnd1/#equipment/phb-food-rich-meal?source=PHB%3A36&region=phb-36-327119801d96f63f) | phb-36-327119801d96f63f: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-327119801d96f63f: excerpt-image-normalized-top-left-xywh [[0.009619,0.655485,0.45324,0.121143]] | complete-named-section-independently-reviewed |
| Grain, horse meal, 1 day (phb-grain-horse-meal-1-day) | /price | 1 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-5774fbbb98dea4cb](https://xertrov.github.io/adnd1/#equipment/phb-grain-horse-meal-1-day?source=PHB%3A36&region=phb-36-5774fbbb98dea4cb) | phb-36-5774fbbb98dea4cb: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-5774fbbb98dea4cb: excerpt-image-normalized-top-left-xywh [[0.009619,0.786925,0.45324,0.138291]] | complete-named-section-independently-reviewed |
| Mead, pint (phb-mead-pint) | /price | 5 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-96720844df9b89c7](https://xertrov.github.io/adnd1/#equipment/phb-mead-pint?source=PHB%3A36&region=phb-36-96720844df9b89c7) | phb-36-96720844df9b89c7: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-96720844df9b89c7: excerpt-image-normalized-top-left-xywh [[0.533513,0.232638,0.455907,0.121143]] | complete-named-section-independently-reviewed |
| Rations, iron, 1 week (phb-rations-iron-1-week) | /price | 5 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-f2273b0787a54e56](https://xertrov.github.io/adnd1/#equipment/phb-rations-iron-1-week?source=PHB%3A36&region=phb-36-f2273b0787a54e56) | phb-36-f2273b0787a54e56: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-f2273b0787a54e56: excerpt-image-normalized-top-left-xywh [[0.533513,0.369781,0.455907,0.14971]] | complete-named-section-independently-reviewed |
| Wine, pint, good (phb-wine-pint-good) | /price | 10 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-5b46c3228f7756c0](https://xertrov.github.io/adnd1/#equipment/phb-wine-pint-good?source=PHB%3A36&region=phb-36-5b46c3228f7756c0) | phb-36-5b46c3228f7756c0: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-5b46c3228f7756c0: excerpt-image-normalized-top-left-xywh [[0.533513,0.661201,0.455907,0.138291]] | complete-named-section-independently-reviewed |
| Wine, pint, watered (phb-wine-pint-watered) | /price | 5 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-29f3e5a57c529ced](https://xertrov.github.io/adnd1/#equipment/phb-wine-pint-watered?source=PHB%3A36&region=phb-36-29f3e5a57c529ced) | phb-36-29f3e5a57c529ced: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.4413411403447077,0.4616338260983902,0.08012821856402474] | phb-36-29f3e5a57c529ced: excerpt-image-normalized-top-left-xywh [[0.533513,0.809775,0.455907,0.121143]] | complete-named-section-independently-reviewed |
| Chicken (phb-chicken) | /price | 3 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-67908ef7f91abb66](https://xertrov.github.io/adnd1/#equipment/phb-chicken?source=PHB%3A36&region=phb-36-67908ef7f91abb66) | phb-36-67908ef7f91abb66: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.035612541584011,0.4616338260983902,0.14880954876176025] | phb-36-67908ef7f91abb66: excerpt-image-normalized-top-left-xywh [[0.009619,0.119451,0.45324,0.071387]] | complete-named-section-independently-reviewed |
| Cow (phb-cow) | /price | 10 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-09dda379ec17c9e8](https://xertrov.github.io/adnd1/#equipment/phb-cow?source=PHB%3A36&region=phb-36-09dda379ec17c9e8) | phb-36-09dda379ec17c9e8: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.035612541584011,0.4616338260983902,0.14880954876176025] | phb-36-09dda379ec17c9e8: excerpt-image-normalized-top-left-xywh [[0.009619,0.196375,0.45324,0.071387]] | complete-named-section-independently-reviewed |
| Dog, guard (phb-dog-guard) | /price | 25 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-890116f1ed9abd9e](https://xertrov.github.io/adnd1/#equipment/phb-dog-guard?source=PHB%3A36&region=phb-36-890116f1ed9abd9e) | phb-36-890116f1ed9abd9e: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.035612541584011,0.4616338260983902,0.14880954876176025] | phb-36-890116f1ed9abd9e: excerpt-image-normalized-top-left-xywh [[0.009619,0.276376,0.45324,0.074464]] | complete-named-section-independently-reviewed |
| Dog, hunting (phb-dog-hunting) | /price | 17 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-a58defb87bb78a4f](https://xertrov.github.io/adnd1/#equipment/phb-dog-hunting?source=PHB%3A36&region=phb-36-a58defb87bb78a4f) | phb-36-a58defb87bb78a4f: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.035612541584011,0.4616338260983902,0.14880954876176025] | phb-36-a58defb87bb78a4f: excerpt-image-normalized-top-left-xywh [[0.009619,0.3533,0.45324,0.077535]] | complete-named-section-independently-reviewed |
| Donkey (phb-donkey) | /price | 8 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-82995ed13162bf21](https://xertrov.github.io/adnd1/#equipment/phb-donkey?source=PHB%3A36&region=phb-36-82995ed13162bf21) | phb-36-82995ed13162bf21: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.035612541584011,0.4616338260983902,0.14880954876176025] | phb-36-82995ed13162bf21: excerpt-image-normalized-top-left-xywh [[0.009619,0.430224,0.45324,0.071387]] | complete-named-section-independently-reviewed |
| Goat (phb-goat) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-9fffca2651b93bed](https://xertrov.github.io/adnd1/#equipment/phb-goat?source=PHB%3A36&region=phb-36-9fffca2651b93bed) | phb-36-9fffca2651b93bed: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.035612541584011,0.4616338260983902,0.14880954876176025] | phb-36-9fffca2651b93bed: excerpt-image-normalized-top-left-xywh [[0.009619,0.50407,0.45324,0.074464]] | complete-named-section-independently-reviewed |
| Hawk, large (phb-hawk-large) | /price | 40 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-67664696dea90d37](https://xertrov.github.io/adnd1/#equipment/phb-hawk-large?source=PHB%3A36&region=phb-36-67664696dea90d37) | phb-36-67664696dea90d37: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.035612541584011,0.4616338260983902,0.14880954876176025] | phb-36-67664696dea90d37: excerpt-image-normalized-top-left-xywh [[0.009619,0.584065,0.45324,0.080613]] | complete-named-section-independently-reviewed |
| Hawk, small (phb-hawk-small) | /price | 18 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [phb-36-273d5fad275e30e3](https://xertrov.github.io/adnd1/#equipment/phb-hawk-small?source=PHB%3A36&region=phb-36-273d5fad275e30e3) | phb-36-273d5fad275e30e3: rendered-source-page-normalized-top-left-xywh [0.01709754911475519,0.035612541584011,0.4616338260983902,0.14880954876176025] | phb-36-273d5fad275e30e3: excerpt-image-normalized-top-left-xywh [[0.009619,0.664067,0.45324,0.065231]] | complete-named-section-independently-reviewed |
| Horse, draft (phb-horse-draft) | /price | 30 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-horse-draft-phb36](https://xertrov.github.io/adnd1/#equipment/phb-horse-draft?source=PHB%3A36&region=price-context-phb-horse-draft-phb36) | price-context-phb-horse-draft-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-horse-draft-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.7409905,0.4532402,0.0775353]] | complete-named-section-independently-reviewed |
| Horse, heavy war (phb-horse-heavy-war) | /price | 300 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-horse-heavy-war-phb36](https://xertrov.github.io/adnd1/#equipment/phb-horse-heavy-war?source=PHB%3A36&region=price-context-phb-horse-heavy-war-phb36) | price-context-phb-horse-heavy-war-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-horse-heavy-war-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.8179143,0.4532402,0.0775353]] | complete-named-section-independently-reviewed |
| Horse, light war (phb-horse-light-war) | /price | 150 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-horse-light-war-phb36](https://xertrov.github.io/adnd1/#equipment/phb-horse-light-war?source=PHB%3A36&region=price-context-phb-horse-light-war-phb36) | price-context-phb-horse-light-war-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-horse-light-war-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.8948381,0.4532402,0.0775353]] | complete-named-section-independently-reviewed |
| Horse, medium war (phb-horse-medium-war) | /price | 225 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-horse-medium-war-phb36](https://xertrov.github.io/adnd1/#equipment/phb-horse-medium-war?source=PHB%3A36&region=price-context-phb-horse-medium-war-phb36) | price-context-phb-horse-medium-war-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-horse-medium-war-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.1286843,0.4559068,0.0621533]] | complete-named-section-independently-reviewed |
| Horse, riding (light) (phb-horse-riding-light) | /price | 25 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-horse-riding-light-phb36](https://xertrov.github.io/adnd1/#equipment/phb-horse-riding-light?source=PHB%3A36&region=price-context-phb-horse-riding-light-phb36) | price-context-phb-horse-riding-light-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-horse-riding-light-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.2056082,0.4559068,0.0744643]] | complete-named-section-independently-reviewed |
| Mule (phb-mule) | /price | 20 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-mule-phb36](https://xertrov.github.io/adnd1/#equipment/phb-mule?source=PHB%3A36&region=price-context-phb-mule-phb36) | price-context-phb-mule-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-mule-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.282532,0.4559068,0.0621533]] | complete-named-section-independently-reviewed |
| Ox (phb-ox) | /price | 15 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-ox-phb36](https://xertrov.github.io/adnd1/#equipment/phb-ox?source=PHB%3A36&region=price-context-phb-ox-phb36) | price-context-phb-ox-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-ox-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.3563781,0.4559068,0.065231]] | complete-named-section-independently-reviewed |
| Pigeon (phb-pigeon) | /price | 2 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pigeon-phb36](https://xertrov.github.io/adnd1/#equipment/phb-pigeon?source=PHB%3A36&region=price-context-phb-pigeon-phb36) | price-context-phb-pigeon-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-pigeon-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.4333019,0.4559068,0.0744643]] | complete-named-section-independently-reviewed |
| Piglet (phb-piglet) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-piglet-phb36](https://xertrov.github.io/adnd1/#equipment/phb-piglet?source=PHB%3A36&region=price-context-phb-piglet-phb36) | price-context-phb-piglet-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-piglet-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.510219,0.4559068,0.0775353]] | complete-named-section-independently-reviewed |
| Pig (phb-pig) | /price | 3 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pig-phb36](https://xertrov.github.io/adnd1/#equipment/phb-pig?source=PHB%3A36&region=price-context-phb-pig-phb36) | price-context-phb-pig-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-pig-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.5871428,0.4559068,0.0775353]] | complete-named-section-independently-reviewed |
| Pony (phb-pony) | /price | 15 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pony-phb36](https://xertrov.github.io/adnd1/#equipment/phb-pony?source=PHB%3A36&region=price-context-phb-pony-phb36) | price-context-phb-pony-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-pony-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.6640666,0.4559068,0.0806131]] | complete-named-section-independently-reviewed |
| Sheep (phb-sheep) | /price | 2 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-sheep-phb36](https://xertrov.github.io/adnd1/#equipment/phb-sheep?source=PHB%3A36&region=price-context-phb-sheep-phb36) | price-context-phb-sheep-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-sheep-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.7409905,0.4559068,0.0775353]] | complete-named-section-independently-reviewed |
| Songbird (phb-songbird) | /price | 4 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-songbird-phb36](https://xertrov.github.io/adnd1/#equipment/phb-songbird?source=PHB%3A36&region=price-context-phb-songbird-phb36) | price-context-phb-songbird-phb36: catalog-bounds-pdf-points-as-recorded [9.999999999999998,28,280,145.00000000000003] | price-context-phb-songbird-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.8179143,0.4559068,0.0775353]] | complete-named-section-independently-reviewed |
| Backpack, leather (phb-backpack-leather) | /price | 2 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-backpack-leather-phb36](https://xertrov.github.io/adnd1/#equipment/phb-backpack-leather?source=PHB%3A36&region=price-context-phb-backpack-leather-phb36) | price-context-phb-backpack-leather-phb36: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | price-context-phb-backpack-leather-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.1005027,0.4532402,0.0624618]] | complete-named-section-independently-reviewed |
| Box, iron, large (phb-box-iron-large) | /price | 28 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-box-iron-large-phb36](https://xertrov.github.io/adnd1/#equipment/phb-box-iron-large?source=PHB%3A36&region=price-context-phb-box-iron-large-phb36) | price-context-phb-box-iron-large-phb36: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | price-context-phb-box-iron-large-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.1601059,0.4532402,0.0600771]] | complete-named-section-independently-reviewed |
| Box, iron, small (phb-box-iron-small) | /price | 9 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-box-iron-small-phb36](https://xertrov.github.io/adnd1/#equipment/phb-box-iron-small?source=PHB%3A36&region=price-context-phb-box-iron-small-phb36) | price-context-phb-box-iron-small-phb36: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | price-context-phb-box-iron-small-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.2197091,0.4532402,0.0624618]] | complete-named-section-independently-reviewed |
| Lantern, hooded (phb-lantern-hooded) | /price | 7 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-lantern-hooded-phb36](https://xertrov.github.io/adnd1/#equipment/phb-lantern-hooded?source=PHB%3A36&region=price-context-phb-lantern-hooded-phb36) | price-context-phb-lantern-hooded-phb36: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | price-context-phb-lantern-hooded-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.7012993,0.4532402,0.0576975]] | complete-named-section-independently-reviewed |
| Mirror, large metal (phb-mirror-large-metal) | /price | 10 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-mirror-large-metal-phb36](https://xertrov.github.io/adnd1/#equipment/phb-mirror-large-metal?source=PHB%3A36&region=price-context-phb-mirror-large-metal-phb36) | price-context-phb-mirror-large-metal-phb36: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | price-context-phb-mirror-large-metal-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.7585177,0.4532402,0.052928]] | complete-named-section-independently-reviewed |
| Pole, 10′ (phb-pole-10) | /price | 3 cp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pole-10-phb36](https://xertrov.github.io/adnd1/#equipment/phb-pole-10?source=PHB%3A36&region=price-context-phb-pole-10-phb36) | price-context-phb-pole-10-phb36: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | price-context-phb-pole-10-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.9349427,0.4532402,0.052928]] | complete-named-section-independently-reviewed |
| Pouch, belt, large (phb-pouch-belt-large) | /price | 1 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pouch-belt-large-phb36](https://xertrov.github.io/adnd1/#equipment/phb-pouch-belt-large?source=PHB%3A36&region=price-context-phb-pouch-belt-large-phb36) | price-context-phb-pouch-belt-large-phb36: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | price-context-phb-pouch-belt-large-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.1052722,0.4559068,0.0600771]] | complete-named-section-independently-reviewed |
| Pouch, belt, small (phb-pouch-belt-small) | /price | 15 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pouch-belt-small-phb36](https://xertrov.github.io/adnd1/#equipment/phb-pouch-belt-small?source=PHB%3A36&region=price-context-phb-pouch-belt-small-phb36) | price-context-phb-pouch-belt-small-phb36: catalog-bounds-pdf-points-as-recorded [10,169,280,320] | price-context-phb-pouch-belt-small-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.1648754,0.4559068,0.0481585]] | complete-named-section-independently-reviewed |
| Helmet, great (phb-helmet-great) | /price | 15 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-helmet-great-phb35](https://xertrov.github.io/adnd1/#equipment/phb-helmet-great?source=PHB%3A35&region=price-context-phb-helmet-great-phb35) | price-context-phb-helmet-great-phb35: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | price-context-phb-helmet-great-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.4887371,0.4464407,0.1049077]] | complete-named-section-independently-reviewed |
| Helmet, small (phb-helmet-small) | /price | 10 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-helmet-small-phb35](https://xertrov.github.io/adnd1/#equipment/phb-helmet-small?source=PHB%3A35&region=price-context-phb-helmet-small-phb35) | price-context-phb-helmet-small-phb35: catalog-bounds-pdf-points-as-recorded [302,216,576,312] | price-context-phb-helmet-small-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.5824021,0.4464407,0.1049077]] | complete-named-section-independently-reviewed |
| Fauchard (phb-fauchard) | /price | 3 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-fauchard-phb35](https://xertrov.github.io/adnd1/#equipment/phb-fauchard?source=PHB%3A35&region=price-context-phb-fauchard-phb35) | price-context-phb-fauchard-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-fauchard-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.570953,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Fauchard - Fork (phb-fauchard-fork) | /price | 8 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-fauchard-fork-phb35](https://xertrov.github.io/adnd1/#equipment/phb-fauchard-fork?source=PHB%3A35&region=price-context-phb-fauchard-fork-phb35) | price-context-phb-fauchard-fork-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-fauchard-fork-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.6038902,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Flail, footman’s (phb-flail-footman-s) | /price | 3 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-flail-footman-s-phb35](https://xertrov.github.io/adnd1/#equipment/phb-flail-footman-s?source=PHB%3A35&region=price-context-phb-flail-footman-s-phb35) | price-context-phb-flail-footman-s-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-flail-footman-s-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.6368273,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Flail, horseman’s (phb-flail-horseman-s) | /price | 8 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-flail-horseman-s-phb35](https://xertrov.github.io/adnd1/#equipment/phb-flail-horseman-s?source=PHB%3A35&region=price-context-phb-flail-horseman-s-phb35) | price-context-phb-flail-horseman-s-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-flail-horseman-s-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.6697644,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Fork, Military (phb-fork-military) | /price | 4 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-fork-military-phb35](https://xertrov.github.io/adnd1/#equipment/phb-fork-military?source=PHB%3A35&region=price-context-phb-fork-military-phb35) | price-context-phb-fork-military-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-fork-military-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.7027016,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Glaive (phb-glaive) | /price | 6 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-glaive-phb35](https://xertrov.github.io/adnd1/#equipment/phb-glaive?source=PHB%3A35&region=price-context-phb-glaive-phb35) | price-context-phb-glaive-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-glaive-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.7356387,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Glaive-Guisarme (phb-glaive-guisarme) | /price | 10 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-glaive-guisarme-phb35](https://xertrov.github.io/adnd1/#equipment/phb-glaive-guisarme?source=PHB%3A35&region=price-context-phb-glaive-guisarme-phb35) | price-context-phb-glaive-guisarme-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-glaive-guisarme-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.7685758,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Guisarme (phb-guisarme) | /price | 5 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-guisarme-phb35](https://xertrov.github.io/adnd1/#equipment/phb-guisarme?source=PHB%3A35&region=price-context-phb-guisarme-phb35) | price-context-phb-guisarme-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-guisarme-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.801513,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Guisarme - Voulge (phb-guisarme-voulge) | /price | 7 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-guisarme-voulge-phb35](https://xertrov.github.io/adnd1/#equipment/phb-guisarme-voulge?source=PHB%3A35&region=price-context-phb-guisarme-voulge-phb35) | price-context-phb-guisarme-voulge-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-guisarme-voulge-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.8344472,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Halberd (phb-halberd) | /price | 9 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-halberd-phb35](https://xertrov.github.io/adnd1/#equipment/phb-halberd?source=PHB%3A35&region=price-context-phb-halberd-phb35) | price-context-phb-halberd-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-halberd-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.8673844,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Hammer, Lucern (phb-hammer-lucern) | /price | 7 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-hammer-lucern-phb35](https://xertrov.github.io/adnd1/#equipment/phb-hammer-lucern?source=PHB%3A35&region=price-context-phb-hammer-lucern-phb35) | price-context-phb-hammer-lucern-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-hammer-lucern-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.9003215,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Hammer (phb-hammer) | /price | 1 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-hammer-phb35](https://xertrov.github.io/adnd1/#equipment/phb-hammer?source=PHB%3A35&region=price-context-phb-hammer-phb35) | price-context-phb-hammer-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-hammer-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.9332586,0.4464407,0.0368906]] | complete-named-section-independently-reviewed |
| Javelin (phb-javelin) | /price | 10 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-javelin-phb35](https://xertrov.github.io/adnd1/#equipment/phb-javelin?source=PHB%3A35&region=price-context-phb-javelin-phb35) | price-context-phb-javelin-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-javelin-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.0439646,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Lance (phb-lance) | /price | 6 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-lance-phb35](https://xertrov.github.io/adnd1/#equipment/phb-lance?source=PHB%3A35&region=price-context-phb-lance-phb35) | price-context-phb-lance-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-lance-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.0769017,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Pick, Military, footman’s (phb-pick-military-footman-s) | /price | 8 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pick-military-footman-s-phb35](https://xertrov.github.io/adnd1/#equipment/phb-pick-military-footman-s?source=PHB%3A35&region=price-context-phb-pick-military-footman-s-phb35) | price-context-phb-pick-military-footman-s-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-pick-military-footman-s-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.2415874,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Pick, Military, horseman’s (phb-pick-military-horseman-s) | /price | 5 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pick-military-horseman-s-phb35](https://xertrov.github.io/adnd1/#equipment/phb-pick-military-horseman-s?source=PHB%3A35&region=price-context-phb-pick-military-horseman-s-phb35) | price-context-phb-pick-military-horseman-s-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-pick-military-horseman-s-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.2745217,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Pike, awl (phb-pike-awl) | /price | 3 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-pike-awl-phb35](https://xertrov.github.io/adnd1/#equipment/phb-pike-awl?source=PHB%3A35&region=price-context-phb-pike-awl-phb35) | price-context-phb-pike-awl-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-pike-awl-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.3074588,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Spetum (phb-spetum) | /price | 3 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-spetum-phb35](https://xertrov.github.io/adnd1/#equipment/phb-spetum?source=PHB%3A35&region=price-context-phb-spetum-phb35) | price-context-phb-spetum-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-spetum-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.6368273,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Sword, broad, & scabbard (phb-sword-broad-scabbard) | /price | 10 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-sword-broad-scabbard-phb35](https://xertrov.github.io/adnd1/#equipment/phb-sword-broad-scabbard?source=PHB%3A35&region=price-context-phb-sword-broad-scabbard-phb35) | price-context-phb-sword-broad-scabbard-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-sword-broad-scabbard-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.7356387,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Voulge (phb-voulge) | /price | 2 gp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-voulge-phb35](https://xertrov.github.io/adnd1/#equipment/phb-voulge?source=PHB%3A35&region=price-context-phb-voulge-phb35) | price-context-phb-voulge-phb35: catalog-bounds-pdf-points-as-recorded [302,334,576,607] | price-context-phb-voulge-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.9003215,0.4451263,0.0368906]] | complete-named-section-independently-reviewed |
| Belladonna, sprig (phb-belladonna-sprig) | /price | 4 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-belladonna-sprig-phb35](https://xertrov.github.io/adnd1/#equipment/phb-belladonna-sprig?source=PHB%3A35&region=price-context-phb-belladonna-sprig-phb35) | price-context-phb-belladonna-sprig-phb35: catalog-bounds-pdf-points-as-recorded [302,711,576,748] | price-context-phb-belladonna-sprig-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.3420433,0.4464407,0.272193]] | complete-named-section-independently-reviewed |
| Garlic, bud (phb-garlic-bud) | /price | 5 cp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-garlic-bud-phb35](https://xertrov.github.io/adnd1/#equipment/phb-garlic-bud?source=PHB%3A35&region=price-context-phb-garlic-bud-phb35) | price-context-phb-garlic-bud-phb35: catalog-bounds-pdf-points-as-recorded [302,711,576,748] | price-context-phb-garlic-bud-phb35: excerpt-image-normalized-top-left-xywh [[0.0139108,0.585066,0.4464407,0.272193]] | complete-named-section-independently-reviewed |
| Wolvesbane, sprig (phb-wolvesbane-sprig) | /price | 10 sp | PHB printed p.35 / PDF p.36; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-wolvesbane-sprig-phb35](https://xertrov.github.io/adnd1/#equipment/phb-wolvesbane-sprig?source=PHB%3A35&region=price-context-phb-wolvesbane-sprig-phb35) | price-context-phb-wolvesbane-sprig-phb35: catalog-bounds-pdf-points-as-recorded [302,711,576,748] | price-context-phb-wolvesbane-sprig-phb35: excerpt-image-normalized-top-left-xywh [[0.5325694,0.3420433,0.4451263,0.272193]] | complete-named-section-independently-reviewed |
| Symbol, Holy, iron (phb-symbol-holy-iron) | /price | 2 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-symbol-holy-iron-phb36](https://xertrov.github.io/adnd1/#equipment/phb-symbol-holy-iron?source=PHB%3A36&region=price-context-phb-symbol-holy-iron-phb36) | price-context-phb-symbol-holy-iron-phb36: catalog-bounds-pdf-points-as-recorded [10,434,280,492] | price-context-phb-symbol-holy-iron-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.5464856,0.4532402,0.1502125],[0.5654444,0.5517241,0.1505926,0.1667241]] | complete-named-section-independently-reviewed |
| Symbol, Holy, silver (phb-symbol-holy-silver) | /price | 50 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-symbol-holy-silver-phb36](https://xertrov.github.io/adnd1/#equipment/phb-symbol-holy-silver?source=PHB%3A36&region=price-context-phb-symbol-holy-silver-phb36) | price-context-phb-symbol-holy-silver-phb36: catalog-bounds-pdf-points-as-recorded [10,434,280,492] | price-context-phb-symbol-holy-silver-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.7016595,0.4532402,0.1502125],[0.5654444,0.5517241,0.1505926,0.1667241]] | complete-named-section-independently-reviewed |
| Symbol, Holy, wooden (phb-symbol-holy-wooden) | /price | 7 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-symbol-holy-wooden-phb36](https://xertrov.github.io/adnd1/#equipment/phb-symbol-holy-wooden?source=PHB%3A36&region=price-context-phb-symbol-holy-wooden-phb36) | price-context-phb-symbol-holy-wooden-phb36: catalog-bounds-pdf-points-as-recorded [10,434,280,492] | price-context-phb-symbol-holy-wooden-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.2485549,0.4559068,0.1377953],[0.5654444,0.5517241,0.1505926,0.1667241]] | complete-named-section-independently-reviewed |
| Barding, chain (phb-barding-chain) | /price | 250 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-barding-chain-phb36](https://xertrov.github.io/adnd1/#equipment/phb-barding-chain?source=PHB%3A36&region=price-context-phb-barding-chain-phb36) | price-context-phb-barding-chain-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-barding-chain-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.2302666,0.4532402,0.1452054]] | complete-named-section-independently-reviewed |
| Barding, leather (phb-barding-leather) | /price | 100 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-barding-leather-phb36](https://xertrov.github.io/adnd1/#equipment/phb-barding-leather?source=PHB%3A36&region=price-context-phb-barding-leather-phb36) | price-context-phb-barding-leather-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-barding-leather-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.3802681,0.4532402,0.1511939]] | complete-named-section-independently-reviewed |
| Barding, plate (phb-barding-plate) | /price | 500 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-barding-plate-phb36](https://xertrov.github.io/adnd1/#equipment/phb-barding-plate?source=PHB%3A36&region=price-context-phb-barding-plate-phb36) | price-context-phb-barding-plate-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-barding-plate-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.5302695,0.4532402,0.1511939]] | complete-named-section-independently-reviewed |
| Bit and Bridle (phb-bit-and-bridle) | /price | 15 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-bit-and-bridle-phb36](https://xertrov.github.io/adnd1/#equipment/phb-bit-and-bridle?source=PHB%3A36&region=price-context-phb-bit-and-bridle-phb36) | price-context-phb-bit-and-bridle-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-bit-and-bridle-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.680271,0.4532402,0.1272005]] | complete-named-section-independently-reviewed |
| Harness (phb-harness) | /price | 12 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-harness-phb36](https://xertrov.github.io/adnd1/#equipment/phb-harness?source=PHB%3A36&region=price-context-phb-harness-phb36) | price-context-phb-harness-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-harness-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.836261,0.4532402,0.1211989]] | complete-named-section-independently-reviewed |
| Saddle (phb-saddle) | /price | 10 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-saddle-phb36](https://xertrov.github.io/adnd1/#equipment/phb-saddle?source=PHB%3A36&region=price-context-phb-saddle-phb36) | price-context-phb-saddle-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-saddle-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.2302666,0.4559068,0.1392038]] | complete-named-section-independently-reviewed |
| Saddle Bags, large (phb-saddle-bags-large) | /price | 4 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-saddle-bags-large-phb36](https://xertrov.github.io/adnd1/#equipment/phb-saddle-bags-large?source=PHB%3A36&region=price-context-phb-saddle-bags-large-phb36) | price-context-phb-saddle-bags-large-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-saddle-bags-large-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.3802681,0.4559068,0.1631972]] | complete-named-section-independently-reviewed |
| Saddle Bags, small (phb-saddle-bags-small) | /price | 3 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-saddle-bags-small-phb36](https://xertrov.github.io/adnd1/#equipment/phb-saddle-bags-small?source=PHB%3A36&region=price-context-phb-saddle-bags-small-phb36) | price-context-phb-saddle-bags-small-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-saddle-bags-small-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.5302695,0.4559068,0.1571956]] | complete-named-section-independently-reviewed |
| Saddle Blanket (phb-saddle-blanket) | /price | 3 sp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-saddle-blanket-phb36](https://xertrov.github.io/adnd1/#equipment/phb-saddle-blanket?source=PHB%3A36&region=price-context-phb-saddle-blanket-phb36) | price-context-phb-saddle-blanket-phb36: catalog-bounds-pdf-points-as-recorded [10,512,280,572] | price-context-phb-saddle-blanket-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.6862595,0.4559068,0.1332021]] | complete-named-section-independently-reviewed |
| Barge (or Raft), small (phb-barge-or-raft-small) | /price | 50 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-barge-or-raft-small-phb36](https://xertrov.github.io/adnd1/#equipment/phb-barge-or-raft-small?source=PHB%3A36&region=price-context-phb-barge-or-raft-small-phb36) | price-context-phb-barge-or-raft-small-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-barge-or-raft-small-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.2233766,0.4532402,0.1417443]] | complete-named-section-independently-reviewed |
| Boat, small (phb-boat-small) | /price | 75 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-boat-small-phb36](https://xertrov.github.io/adnd1/#equipment/phb-boat-small?source=PHB%3A36&region=price-context-phb-boat-small-phb36) | price-context-phb-boat-small-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-boat-small-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.3640029,0.4532402,0.124877]] | complete-named-section-independently-reviewed |
| Boat, long (phb-boat-long) | /price | 150 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-boat-long-phb36](https://xertrov.github.io/adnd1/#equipment/phb-boat-long?source=PHB%3A36&region=price-context-phb-boat-long-phb36) | price-context-phb-boat-long-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-boat-long-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.5046293,0.4532402,0.1417443]] | complete-named-section-independently-reviewed |
| Cart (phb-cart) | /price | 50 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-cart-phb36](https://xertrov.github.io/adnd1/#equipment/phb-cart?source=PHB%3A36&region=price-context-phb-cart-phb36) | price-context-phb-cart-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-cart-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.6452434,0.4532402,0.1473708]] | complete-named-section-independently-reviewed |
| Galley, large (phb-galley-large) | /price | 25000 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-galley-large-phb36](https://xertrov.github.io/adnd1/#equipment/phb-galley-large?source=PHB%3A36&region=price-context-phb-galley-large-phb36) | price-context-phb-galley-large-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-galley-large-phb36: excerpt-image-normalized-top-left-xywh [[0.009619,0.7802432,0.4532402,0.1473708]] | complete-named-section-independently-reviewed |
| Galley, small (phb-galley-small) | /price | 10000 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-galley-small-phb36](https://xertrov.github.io/adnd1/#equipment/phb-galley-small?source=PHB%3A36&region=price-context-phb-galley-small-phb36) | price-context-phb-galley-small-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-galley-small-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.2346296,0.4559068,0.1417443]] | complete-named-section-independently-reviewed |
| Ship, merchant, large (phb-ship-merchant-large) | /price | 15000 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-ship-merchant-large-phb36](https://xertrov.github.io/adnd1/#equipment/phb-ship-merchant-large?source=PHB%3A36&region=price-context-phb-ship-merchant-large-phb36) | price-context-phb-ship-merchant-large-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-ship-merchant-large-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.3752437,0.4559068,0.1417443]] | complete-named-section-independently-reviewed |
| Ship, merchant, small (phb-ship-merchant-small) | /price | 5000 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-ship-merchant-small-phb36](https://xertrov.github.io/adnd1/#equipment/phb-ship-merchant-small?source=PHB%3A36&region=price-context-phb-ship-merchant-small-phb36) | price-context-phb-ship-merchant-small-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-ship-merchant-small-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.5158701,0.4559068,0.1361301]] | complete-named-section-independently-reviewed |
| Ship, war (phb-ship-war) | /price | 20000 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-ship-war-phb36](https://xertrov.github.io/adnd1/#equipment/phb-ship-war?source=PHB%3A36&region=price-context-phb-ship-war-phb36) | price-context-phb-ship-war-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-ship-war-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.6564965,0.4559068,0.1361301]] | complete-named-section-independently-reviewed |
| Wagon (phb-wagon) | /price | 150 gp | PHB printed p.36 / PDF p.37; source sha256:e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095 | field-target-reviewed | source-value-independently-confirmed | [price-context-phb-wagon-phb36](https://xertrov.github.io/adnd1/#equipment/phb-wagon?source=PHB%3A36&region=price-context-phb-wagon-phb36) | price-context-phb-wagon-phb36: catalog-bounds-pdf-points-as-recorded [10,590,280,654] | price-context-phb-wagon-phb36: excerpt-image-normalized-top-left-xywh [[0.5335126,0.7971228,0.4559068,0.1417443]] | complete-named-section-independently-reviewed |
| Blowgun (ua-blowgun) | /price | 20 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [price-context-ua-blowgun-ua26](https://xertrov.github.io/adnd1/#equipment/ua-blowgun?source=UA%3A26&region=price-context-ua-blowgun-ua26) | price-context-ua-blowgun-ua26: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | price-context-ua-blowgun-ua26: excerpt-image-normalized-top-left-xywh [[0.0131805,0.5120736,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Caltrop (ua-caltrop) | /price | 2 sp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [price-context-ua-caltrop-ua26](https://xertrov.github.io/adnd1/#equipment/ua-caltrop?source=UA%3A26&region=price-context-ua-caltrop-ua26) | price-context-ua-caltrop-ua26: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | price-context-ua-caltrop-ua26: excerpt-image-normalized-top-left-xywh [[0.0131805,0.6237807,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Garrot (ua-garrot) | /price | 1 ep | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [price-context-ua-garrot-ua26](https://xertrov.github.io/adnd1/#equipment/ua-garrot?source=UA%3A26&region=price-context-ua-garrot-ua26) | price-context-ua-garrot-ua26: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | price-context-ua-garrot-ua26: excerpt-image-normalized-top-left-xywh [[0.0131805,0.7934095,0.4489378,0.068266]] | complete-named-section-independently-reviewed |
| Harpoon (ua-harpoon) | /price | 5 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [price-context-ua-harpoon-ua26](https://xertrov.github.io/adnd1/#equipment/ua-harpoon?source=UA%3A26&region=price-context-ua-harpoon-ua26) | price-context-ua-harpoon-ua26: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | price-context-ua-harpoon-ua26: excerpt-image-normalized-top-left-xywh [[0.0131805,0.8492631,0.4489378,0.06413]] | complete-named-section-independently-reviewed |
| Hook Fauchard (ua-hook-fauchard) | /price | 6 gp | UA printed p.26 / PDF p.27; source sha256:e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4 | field-target-reviewed | source-value-independently-confirmed | [price-context-ua-hook-fauchard-ua26](https://xertrov.github.io/adnd1/#equipment/ua-hook-fauchard?source=UA%3A26&region=price-context-ua-hook-fauchard-ua26) | price-context-ua-hook-fauchard-ua26: catalog-bounds-pdf-points-as-recorded [10,34,289,208] | price-context-ua-hook-fauchard-ua26: excerpt-image-normalized-top-left-xywh [[0.0131805,0.9009763,0.4489378,0.070334]] | complete-named-section-independently-reviewed |
| Jo Stick (ua-jo-stick) | /price | — (price gap) | — | no-target-binding | no-independent-source-value-status | — | — | — | context-not-assessed |

## Source-page discovery

Broad text-layer keyword discovery only; candidate counts are not total price-bearing pages and no absence claim is made for unflagged pages. Printed page numbers require visual confirmation. Automated candidate pages are explicitly non-exhaustive and unreviewed.
