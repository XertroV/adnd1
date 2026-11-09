# Continuation candidate frame repair proposal

**Status:** author proposal for independent root review. The work is isolated on `codex/continuation-frame-resolution`, based on `a46eddc41ac6f712d5ad1498195df6a49810aae1`. No commit or push was made.

The continuation candidate producer was using each crop’s `normalizedPageRect` against `page.rect` width and height for every PDF-backed region. That formula produces incorrect PDF text-geometry windows for 11 of the 102 source-frame joins covered by the reviewed registry. The producer now resolves the exact owner, binding, catalog, region, source PDF, image, focus, content and normalized crop pins, then uses the registered frame basis and measured PDF page boxes for those 102 joins. Other rows retain their existing diagnostic projection and receive an explicit outside-registry annotation.

The active correction remains exactly nine frame groups, seven physical PDF pages and 102 owner/region joins:

| Frame group | Printed page / PDF page | Coordinate basis | Joined region-owner rows |
|---|---:|---|---:|
| DMG | 75 / 76 | CropBox/page-rect normalized | 17 |
| DMG | 76 / 77 | CropBox/page-rect normalized | 20 |
| DMG | 76 / 77 | CropBox/page-rect normalized | 24 |
| PHB | 19 / 20 | Coincident CropBox/MediaBox/page-rect normalized | 1 |
| PHB | 27 / 28 | MediaBox normalized | 1 |
| PHB | 28 / 29 | Coincident CropBox/MediaBox/page-rect normalized | 5 |
| PHB | 33 / 34 | Coincident CropBox/MediaBox/page-rect normalized | 12 |
| PHB | 33 / 34 | Coincident CropBox/MediaBox/page-rect normalized | 12 |
| PHB | 37 / 38 | MediaBox normalized | 10 |

The before artifact was produced from the complete a46 data/catalog universe with the original generator and actual authorized PDFs before the code edit. Its preimage receipt pins the original generator and validator hashes and output hashes. The separate negative control computes both the old global `page.rect` projection and exact registered projection for all 102 rows. It identifies 11 differing old windows: one PHB p.27 assassin row and ten PHB p.37 rows. The current report reproduces the registered values for all 102 rows; the other 91 registered windows are numerically unchanged.

The full current candidate snapshot contains 3,409 catalog-region rows and 3,412 binding uses. Its frame-resolution counts are 102 matched, 3,308 outside the bounded registry, and two supplemental image-frame uses that are not applicable to PDF-frame geometry. The outside rows are not thereby unassessable or approved. The two supplemental rows retain their existing explicit not-applicable status.

The complete before/after comparison confirms that all pre-existing assessment fields match after removing only the new frame annotation and crop-bounds fields. Candidate counts, signals, text-geometry statuses, source-page universe, exposed universe, property-pointer inventory, historical controls, paired-crop-flow candidates, review queues and flagged geometry remain exact after removing those same additions. The current counts remain 3,186 assessed regions, 221 missing/invalid crop geometry rows, two supplemental N/A rows, 686 word-box crossings, 1,775 regions with any crop signal, 96 elevated/control pages, 103 weak-shape pages and five word-box-only pages. No semantic grade, warning, review status, catalog crop, highlight or focus rectangle changed; candidate signals remain discovery-only.

The active continuation pointer now selects `research/source-audit-pass8-continuation-frame-current-v1.json` and its compressed full report. Current validation derives the expected bridge from the validator-owning repository root, checks the exact trusted registry and live catalog/owner/image pins, compares the full and summary declarations, requires exact per-use annotations and registered bounds, and rejects a crop window that reverts to the known PHB errors. Pinned-history diagnostics require exact summary and full bytes sealed in the trusted repository manifest. The older unsealed batch-5 report remains measurable but cannot claim valid historical status. The current-snapshot CLI cannot select pinned-history mode.

The regression cases reject removed or missing bridge declarations, removed per-use frame annotations, an untrusted caller-supplied repository root, and all 11 known legacy PHB windows even when the report retains plausible bridge declarations and annotations. The exact sealed historical report remains a positive diagnostics case. The separate PHB p.27 thief candidate is excluded; it remains a proposed calibration item and is not a 103rd active join.

The read-only consumer inventory is preserved at `research/source-frame-consumer-inventory.json` (baseline SHA-256 `be205e93886e231c35a233f521dee699b8c4bfaab356972711b9af25f93f9c64`), with an additive continuation update at `research/source-frame-consumer-inventory-continuation-v1.json`. The monetary row-identity witness has 5,666 geometry targets and zero same-book/PDF-page or exact source-frame page matches; its 22-frame registry also has zero overlap with the active nine frame groups. Monetary code and reports were not changed. The c00-reviewed visual/raster guard files were copied byte-for-byte only after checking every destination against the exact independent-review hashes; `research/source-frame-guard-copy-preimage-v1.json` records each preimage and copied hash.

Key evidence files are `research/source-audit-pass8-continuation-frame-before-v1-preimage.json`, `research/source-audit-pass8-continuation-frame-negative-controls-v1.json`, `research/source-audit-pass8-continuation-frame-comparison-v1.json`, and `research/source-frame-coordinate-current-guard-independent-review.json` (SHA-256 `c00dde753ba9bc58913e128edb687f200569e501d9887298eaf934e4a669567e`). The current full report was regenerated with the authorized private PDFs but publishes only numeric geometry and hashes, not source text or pixels.

Focused checks passed: Python continuation fixtures (9 tests, one source-PDF-only skip), Python frame bridge tests (13), raster boundary tests (15), source-visual input tests (4); Node continuation tests (11), current continuation snapshot tests (12), and raster/visual/current-pointer tests (32). The current continuation `--current-snapshot --force-current-tree` CLI returned `valid:true`. Repository-wide CI and integration remain for root review.
