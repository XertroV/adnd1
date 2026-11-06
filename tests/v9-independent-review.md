# V9 independent dagger-excerpt review

Final local review completed 5 November 2026. No blocking issue remains in the reviewed scope. This batch establishes selected dagger evidence, not full-page or full-book verification.

## Actual image inspection

Independently viewed all seven supplied PNGs and their visible dagger rows/shared missile notes. They support:

- PHB p. 35: dagger and scabbard cost **2 gp**.
- PHB p. 37: dagger encumbrance is **10 gold-piece weight**, with damage **1–4** against S/M and **1–3** against Large opponents. Weight is not purchase currency.
- PHB p. 38: dagger melee speed factor **2**; the thrown row gives fire rate **2** and S/M/L numeric bands **1/2/3**.
- UA p. 28: the revised thrown row also gives **2** and **1/2/3**. PHB and UA armor-class headings differ; no new attack-matrix mechanics were added from these images.
- Shared missile notes define S/M/L, distinguish tabletop-miniature turn from melee-round timing, and state the short-range baseline with medium −2 and long −5 adjustments.

The supplied normalized focus rectangles point to the actual dagger rows or shared notes within the PNGs. The range crops verify numeric bands, not the broader distance-scale interpretation; the data records that limit explicitly. Adjacent weapon rows remain contextual image content, not newly audited equipment records.

## Integrity and data scope

`node --test tests/dagger-independent.test.mjs`: **3/3 passed**. Independently recomputed every PNG SHA-256 and decoded its dimensions; all seven public assets exactly match the inspected handoff bytes. Checked focus coordinates, the four-page/seven-region grouping, sanitized catalog contents, and absence of PDFs, scripts, raw Library identifiers and private paths in the public dagger asset directory/metadata.

Only `phb-dagger` changed in the equipment comparison. Its price is 2 gp for the dagger-and-scabbard listing, and the six existing displayed fields receive limited evidence grades. The reference remains incomplete. There are **46 known prices and 34 extraction gaps**. Pinned semantic comparisons preserve all other 79 equipment records and the attack matrix. Spell and class data also compared unchanged at this checkpoint.

Full-PDF hashes are labeled `supplied-handoff`. The original PDFs were unavailable here, so those full-file digests and the crops' original PDF coordinate placement were not independently recomputed. PNG integrity, visible crop content and overlay position within each PNG were independently checked.

## Browser checks and fixes

`tests/dagger-scan-browser.cjs` initially completed 180 assertions: **176 functional checks passed**, with four axe scans exposing the same Highlights accessible-name mismatch. The owner corrected that name. Two requested usability fixes also landed: narrow price crops fit the mobile stage, and one-option region selectors are hidden while meaningful Highlights/caption controls remain.

`node tests/dagger-scan-browser.cjs --targeted` then passed **40/40 assertions**, including **four clean axe scans** at 320, 390, 491 and 1440 pixels. The targeted run verified the changed behaviors and preserved price focus geometry. Passed broad behavior was not needlessly repeated.

The integrated coverage includes:

- Default verified excerpts for exact Dagger context; four source-page choices containing 1/1/3/2 distinct regions. Traversed and checked all seven images and normalized overlay geometry at every width.
- Exact UA p. 28 field scope with two regions; footer union of PHB pp. 35, 37–38 and UA p. 28. An unrelated crossbow citing the same page never receives dagger excerpts.
- Readable wide-table default scaling, horizontal keyboard panning, zoom, Fit width, Actual size, highlight toggling, meaningful alt/caption values, keyboard trap, Escape focus restoration and mobile controls.
- Explicit broken-image fallback to Your PDF, successful deliberate retry, and delayed-image races that cannot replace a later page or an unrelated item session.
- Existing dense properties remain static, preserve the six dagger fields plus price, and retain genuine field-source controls.

Inspected generated mobile and desktop viewer screenshots, including the final narrow price views at 320 and 390 pixels. The complete price row and 2 gp value now fit with their focus border.

`node tests/source-viewer.browser.mjs` independently passed **32/32 original generated-PDF fixture checks**, covering the retained browser-local PDF path, page mapping/gaps, Forget cleanup, focus and same-origin/no-PDF-upload behavior. No source-book PDF was used or deployed by those tests.

## Deliverables and limits

Regression sources are `tests/dagger-independent.test.mjs` and `tests/dagger-scan-browser.cjs`. Ignored `test-results/dagger-scan-browser.json`, `dagger-targeted-browser.json`, and `dagger-*.png` hold local evidence. The complete browser regression was updated for the corrected accessible name, narrow-image scaling and hidden single-region selector.

This review does not establish whole-page/book coverage, verify other weapon prices, add matrix rules, or authenticate full PDFs from supplied digests. No application data/code, Git commit, GitHub action or deployment was changed by this reviewer. Root owns publication and repository actions.
