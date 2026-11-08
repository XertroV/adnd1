# Five-book currency and XP text-layer discovery

This is a source-first candidate inventory over the full supplied PDF page universe. It keeps the raw line text and page images in the private local scan directory; the checked-in metadata contains identifiers, counts, source hashes, page numbers, candidate classifications and source-PDF point bounds only.

The scan covered 5 PDFs / 776 pages: PHB 130, DMG 240, UA 130, MM 114 and MMII 162. It emitted 6,137 candidate lines: 6,067 with active broad cues and 70 containing only explicit weight/XP cues. The token inventory records 934 currency-token mentions, 47 explicit XP mentions, 40 weight-unit mentions and 704 numeric money-pattern candidates. Each candidate maps to the exact source PDF hash, PDF page, numeric line candidate ID, and an independent printed-page mapping status. The printed-page labels are derived from the pinned `dist/books.js` availability/page map and are marked `mapping-derivable-not-visually-read`; no footer was inferred from the text-layer candidate. DMG printed p.175 remains a known missing page, while DMG PDF pp.239–240 have unknown/unverified printed identities, including the detached sheet on PDF p.239. The line bounds are unions of text-span boxes for complete candidate lines, not token-level highlights.

| Book | PDF pages | Text present | Empty / unextractable | Active broad-cue lines | Weight / XP-only lines |
|---|---:|---:|---:|---:|---:|
| PHB | 130 | 125 | 5 | 1,322 | 12 |
| DMG | 240 | 236 | 4 | 1,851 | 39 |
| UA | 130 | 128 | 2 | 1,040 | 8 |
| MM | 114 | 110 | 4 | 698 | 4 |
| MMII | 162 | 159 | 3 | 1,156 | 7 |
| **Total** | **776** | **758** | **18** | **6,067** | **70** |

The page screen-status counts are 662 with broad candidates pending review, 1 containing only explicit weight/XP line candidates while the rest of that page remains unassessed, 95 screened with no configured cue, and 18 with empty or unextractable text layers. None of the latter 114 pages is an absence pass.

The checked-in JSON contains per-page metadata, per-line candidate IDs and bounds, per-token currency/XP/weight cue IDs, and per-number money-pattern candidates. Source text, matched phrases and the private candidate queue remain under `/tmp/adnd-source-price-page-discovery-batch5/`. Original PDF SHA-256 hashes and detector/input hashes are pinned in the JSON.

This scan is not a semantic transcription or completeness proof. Text-layer extraction may miss printed material, table values may inherit a currency unit from a separate heading, and numbers beside money cues may be prices, wages, treasure quantities, thresholds, formulas, examples or unrelated values. The 776-page candidate denominator does not replace named table-row inventories, manual source review or the 180 bounded census receipts. Every candidate remains pending source review; pages outside those receipts remain unknown.

The private scan was generated with:

```sh
python tools/source-price-page-discovery.py --source-dir /workspace/private-adnd1-sources --output-dir /tmp/adnd-source-price-page-discovery-batch5
node tools/source-price-token-inventory.mjs --input-discovery /tmp/adnd-source-price-page-discovery-batch5/source-price-page-discovery.json --input-queue /tmp/adnd-source-price-page-discovery-batch5/source-price-candidate-queue.json --output research/source-audit-batch5-fivebook-currency-token-inventory.json
```
