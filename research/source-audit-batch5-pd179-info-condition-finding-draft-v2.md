# DMG p.33 information-discovery condition finding draft

Status: private source-QA draft complete; root normalization and finding registration/sealing pending. No original source, index, candidate, or registered finding was edited.

Proposed mandatory finding ID: `dmg-p33-information-discovery-note-conditions`.

The four DMG information-discovery rows retain only the original table unit legend and the out-of-fields dash condition. The printed p.33 / PDF p.34 Note adds shared assumptions and a location-dependent choice, row-specific no-cost exceptions, a worked example, and a right-column continuation about accumulated materials, DM judgment, and expenses. This is a typed `/conditions` content omission, separate from the existing finding about missing ordered context crops.

The proposed normalized conditions keep the existing `r` / `h` / `d` units and out-of-fields dash verbatim. For the out-of-fields, minor-field, and major-field rows, the lower 20% of the spread has no cost because materials are on hand. For the special category only, any spread within the lower 80% has no cost. If no town or city is nearby, the source offers two alternatives: double times and costs, or calculate the sojourn expenditure to reach a locale with the needed materials and determine other expenses. This does not support an unconditional 2x multiplier. The source’s 31%-to-40% / 32% / 06% example remains an illustration, separate from general threshold logic.

The left Note ends with a comma that continues in the right column. The proposed condition evidence is therefore ordered as: the existing table crop primary for row labels and values; a focused left Note crop primary for `/conditions`; then the right-column continuation crop as supporting evidence for `/conditions`. The table crop retains its title, headings, four rows and unit legend. The active right-column crop retains the `HIRELINGS (EXPERT HIRELINGS)` running header, while its focus covers the complete continuation through payments, fees, and bribes and excludes the next discretionary-time paragraph.

Affected original audit references, all from immutable input `research/source-audit-batch5-phb-dmg-additional-prices.json` (`b0d46959c44e0d156ef5d40326af48c1f1ce9ee5b282a870c06c41010b94dcc9`):

| Record | Original audit pointer | Existing amount |
| --- | --- | ---: |
| `dmg-info-discovery-row-01` — out of fields | `/review/sourceRowsOrClaims/75` | 100 gp/day |
| `dmg-info-discovery-row-02` — in minor field | `/review/sourceRowsOrClaims/76` | 1,000 gp/day |
| `dmg-info-discovery-row-03` — in major field | `/review/sourceRowsOrClaims/77` | 500 gp/day |
| `dmg-info-discovery-row-04` — in special category | `/review/sourceRowsOrClaims/78` | 200 gp/day |

The draft also binds each source row-audit UID, indexed occurrence, claim pointer, exact original and V4 condition text, and canonical V4 row hash. The old and V4 conditions match for all four rows. The complete 179-row V4 conditions/ordered-parts before capture remains `research/source-audit-batch5-pd179-v4-condition-and-ordered-part-before.json` (`6ddec10bdc96169e82862e384522a95ad062465ea57a55cfe3e05353dbf86a17`). Its source candidate remains `/tmp/batch5-phbdmg-money-corrections-v4/proposal-v4/phb-dmg-additional-prices-correction-candidate-v4.json` (`299c1a3eb5c2f5be7866ed2304038698f1a4e092b09f6e24132655227b03119b`). The original global monetary-row baseline is `research/source-audit-batch5-monetary-row-identity-baseline.json` (`bd4973e1eca69a56b64adf3758ccce3683783815dea38bb8ca6ec9f33e898bb9`); its 2,161-record / 15-finding counts describe that historical baseline, not the current register.

Source crops and focus evidence for root review:

- Full source page render, 600 dpi: `/tmp/batch5-pd179-poison-notes-context/dmg-p34-600dpi.png` — SHA-256 `93247ce41e51eb4b1d5f70020941234d8c02f15ae90e675c7af679fb0e9e2248`.
- Original left Note crop, 600 dpi: `/tmp/batch5-pd179-poison-notes-context/dmg-p34-left-note-600dpi.png` — SHA-256 `5a96915b4b12f91253bfbe565f9b1135273a5880a5ed0084e1c8e3296eef8831`.
- Original right-column continuation crop, 600 dpi: `/tmp/batch5-pd179-poison-notes-context/dmg-p34-right-note-600dpi.png` — SHA-256 `d6faf05aed7e320c999d495597e50b1879e00f19f5462e829a5550d6fce4a41f`.
- Proposed focused left Note crop: `/tmp/batch5-pd179-poison-notes-context/dmg-p34-left-note-focused-crop-150dpi.png` — SHA-256 `a7c1a04122ce450d2cf168309901f69a843fc39838eb129f63c09894fa715376`; overlay: `/tmp/batch5-pd179-poison-notes-context/dmg-p34-left-note-focused-overlay-150dpi.png` — SHA-256 `a438ddacdcb3583e3ca18e7d3c593f51eb6089116efcc0a32357f0f3cf92772f`.
- Active right-column context crop: `/tmp/batch5-private-crop-edge-audit/phbdmg-context-replacements-v6/crop-dmg-support-research-and-information-costs-03-clean-source-v3.png` — SHA-256 `573556e1e4565b09974adb4ba0643083fcde08f635e462ef80cdeace6dfce289`; continuation overlay: `/tmp/batch5-pd179-poison-notes-context/conditions-right-continuation-focus-overlay.png` — SHA-256 `177e260fcbf3452d3b7bc868544ac5519c2dbe4befe26cfa65e642dbf55fbd5c`.
- Existing table primary crop: `/tmp/batch5-private-crop-edge-audit/phbdmg-context-replacements-v6/crop-dmg-support-research-and-information-costs-02-clean-source-v3.png` — SHA-256 `69f757bc11d5ead1dfdec380df84712f6e099804f9fd0cf03062ddedd14108a3`.

The adjacent paragraph about extending time for unusually difficult specific or exacting questions remains outside this finding pending root scope adjudication. This review is limited to these four condition records; it does not grade the whole 179-row dataset or approve a repaired candidate. Root normalization and sealing of this finding must precede the next candidate condition repair.

JSON draft: `research/source-audit-batch5-pd179-info-condition-finding-draft-v2.json` — SHA-256 `c8b598190980cdaf2d2ea90560c2e925c1cbbfdda42da966375c49ab2a70d7fe`.
