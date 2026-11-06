# Remaining local source and citation batches

Prepared 6 November 2026 from the reviewed local batch-2 checkpoint on `research/scan-batch-2`. The base production source remains v9 commit `6c646a6ccb35da7b4739ad30ef8eaaeae39f6d02`. This work remains local under the publication hold: no commit, push, merge, deployment, hosting change or access-level change was performed.

## Completed scope

GPT-6.1 Terra agents performed the source research, equipment extraction, independent review and test updates. The text-citation queues contain all 638 existing spell cards in 35 batches of at most 20 cards: 414 PHB and 224 original-UA entries. Supplemental original-MM and MM2 passages resolved specific monster dependencies. These checks address structured source lookups; they do not establish complete spell transcription, full rule accuracy or visual verification.

Independent review accepted 104 proposed reference objects. Two were already covered in part or whole by existing references, so integration adds 102 objects covering 113 new book/page pairs on 80 cards. All 638 spell cards retain their previous non-reference fields. Comparison, counter-effect and exception links preserve the referenced spell's specific limits. PHB and UA class versions remain distinct. Monster lookups do not substitute MM2 for an original-MM rule.

The remaining equipment image pass processed 29 additional row regions in two bounded groups: 13 rows concerning six existing catalogue items, and 16 rows supporting eight additional entries. The added entries are four bows, a single silver arrow, hurled aklys, atlatl (javelin) and blowgun needle. Price, weight and damage facts are applied only where the actual supplied crop establishes them.

Local equipment totals are now 88 entries, 59 extracted prices and 29 unextracted prices. A normal arrow is 2 sp singly, with the distinct 1 gp-per-dozen package retained. Light and heavy crossbows are 12 gp and 20 gp respectively. Silver-arrow damage is not inferred from the generic Arrow row. The aklys range asterisk remains unexplained, and the atlatl retains its javelin qualifier. Missing prices receive no estimate.

The same seven original PNG files now support selected facts on 20 entries: 56 unique regions and 76 item-specific region entries. Shared notes count once globally, while each item retains its exact source binding. No image bytes, original PDFs or raw OCR were added to the site. Supplied full-PDF fingerprints remain handoff provenance rather than independently recomputed hashes.

Identical PHB and UA missile values display as one canonical field pair. The corroborating source remains in structured references and its own highlighted excerpt. Numeric range bands do not verify the separate distance scale. UA p.26 axe damage and PHB p.39 distance interpretation retain their pending visual status.

## Reader fix

Browser checks found that the original-source reader's book allowlist rejected new MM/MM2 citations even though the shared page-mapping module supported them. The reader now accepts both manuals and opens their private-PDF route. It retains the exact MM2 mapping: printed p.83 maps to PDF p.92, pp.84–91 map to the same PDF page number, and pp.92–160 resume the +1 offset. Manual printing identity is not asserted from unavailable full-PDF pixels. No manual scan is hosted.

## Validation

- Node data/reference suites: 97 tests passed, including all 29 new rows, exact baseline-plus-approved spell references, source-grade boundaries, package quantities, unchanged mechanics and unchanged image hashes.
- New actual-app browser suite: 631 checks passed across 320, 390, 491 and 1440 pixels, traversing all 20 catalogues and 76 scoped region entries at each width. Source scoping, aliases, prices, fallback, focus and corroborating references were checked.
- Updated independent actual-app regression: 311 checks passed. Equipment/matrix regression: 66 passed. Dense attributes: 120 checks passed, with 1,452 exact renderer-fidelity cases across both layouts.
- Generated private-PDF fixtures: 44 checks passed, retaining previous PHB/UA/DMG cases and adding real MM/MM2 page rendering, displaced page mappings, minimum-length rejection and separate book-file switching. Fixtures contain no original book text.
- All 17 axe scans found zero violations; no uncaught browser errors were observed. These results cover the tested states and are not an exhaustive accessibility certification.

See [independent review](remaining-independent-review.md), [browser review](remaining-batches-browser.md), and the sanitized fixtures in `tests/fixtures/`. Ignored browser JSON reports and screenshots remain local in `test-results/`.

## Remaining limits and backlog

Full source PDFs remain unavailable through the supported source-access path in this executor; denied transfer routes were not retried. Only seven equipment crops provide readable source pixels. The current reference graph cites 216 distinct printed pages: four have some supplied image pixels, while 212 have no available source image. Having a crop on a page does not verify the whole page. Further visual batches require supported readable source attachments or materialization.

Seven targets from the original 20-target image plan remain unavailable: four Partisan targets, two Ranseur targets, and the PHB p.39 distance-scale text. Other classes, matrices, spells and equipment retain their stated extraction and visual-review gaps. DMG pp.175 and 240 remain missing.

Five source questions remain open rather than guessed: the Endure Cold/Endure Heat threshold in OCR, Mirage Arcane's named comparisons, Speak With Animals' unidentified special reaction chart, a suitable class-wide first-level magic-user spell-index citation, and Emotion's intended symbol class version.

The public v9 publication is unchanged by this work. Character generation remains deferred to phase 2, and no comprehensive monster catalogue is claimed.
