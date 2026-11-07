# Source visual audit progress

This is a bounded repair checkpoint. The CI-generated `source-visual-coverage` artifact is the reproducible current report; its JSON lists individual catalog bindings and source permalinks. The checked-in review ledger binds each accepted assessment to the current source PDF identity, public image bytes, rectangle and region content. A changed binding invalidates the assessment. Review of an image does not verify every game mechanic or whole-book coverage.

## Findings and repairs

- Generic quiver encumbrance is correctly 30 gp-weight on DMG p.225. Its old overlay covered the full Appendix O table. Forty-five independently checked DMG p.225 binding highlights now identify the applicable item/value or explicit units/exclusion context.
- Banded Mail's PHB p.35 purchase-price default was a heading-only image. Confirmed heading-only regions now sort after relevant same-page passages. Its PHB p.36 armor table clipped the left side; the replacement restores the complete table and marks the entire shared AC 4 row, including its continuation. The shared armor and shield crops were repaired as a batch.
- Additional reviewed repairs include Ranseur's final row note, a UA Whip row, nine Monster Manual crops, and shared class/spell table and continuation crops. Original region IDs are retained for existing links.
- The aerial maneuverability class C–E crop was mislabeled DMG p.50; it is from printed p.51. The citation and provenance now agree. Underwater Lightning Bolt previously displayed an unrelated spell; its replacement shows the correct DMG p.57 passage.
- Bone map/scroll case price is 5 gp on PHB p.36, not the site's previous 5 sp. The correction retains the prior value and reviewed correction in audit history.
- Source permalinks preserve entry, actual source owner, page and excerpt, including comparison items and nested class references. Normal source navigation participates in Back/Forward history. Full-image sentinel overlays are suppressed in the viewer but remain suspected over-highlighting in the audit until expressly reviewed.

## Scope and outstanding work

The first integrated snapshot has 1,857 cited record/page pairs, 2,577 catalog-region usages (including legacy bindings), and 1,454 unique images. Independent assessments cover 145 highlight bindings and 49 crop bindings. No complete default-selection assessments have yet been promoted into the CI ledger. There are 2,280 full-image sentinel bindings still suspected; partial bounds are also unreviewed unless explicitly checked. These categories overlap and must not be added as a count of unique errors.

The corrected offline geometry snapshot contains 693 unique image candidates. Geometry is a triage aid: some crossings are unrelated neighboring rows or text-layer misalignment; other real defects escape that check. Historical snapshot omissions and timing are documented in `source-visual-audit-baseline-revision.md`. Per-image triage logs retain confirmed issues, suspected issues, scoped valid contexts and pending comparisons. Known defects not included in this repair batch remain work, not completed reviews.

The source-first price work has transcribed bounded PHB p.35/p.36 and UA p.26 tables, plus DMG p.28 hireling rates. `price-source-inventory-method.md` documents each denominator, incomplete site matching, provisional coordinates and unreviewed books/sections. It is not an inventory of all book prices. Source-first inventories for further categories must likewise establish their source scope before assigning completion percentages.

## Validation

The first integration passed 174 Node tests, desktop/mobile source permalink and focus tests, and a real-browser sweep of 1,784 item/viewport combinations and 5,002 region/viewport checks with zero failures. Browser rendering checks do not establish semantic correctness of source crops. Private PDFs and the separately supplied DMG p.175 image are not published by this work.

## Second repair batch

The next batch replaces additional DMG, PHB and UA crops after comparison with the original supplied pages. It restores split-column Succor context and preserves original region IDs. DMG p.11 has an intrinsic source-edge defect in two bindings: recropping cannot restore missing pixels, and the ledger continues to call these defects. Page-bound excerpts with continuations are reviewed only within their declared scope.

Seventy-two independently reviewed PHB equipment price highlights now identify item/value rows across 67 catalogs. Repaired whole-image crops retain their sentinel until separate focus review; no cosmetic inset or empty rectangle is used to reduce the suspected count. CI now includes the later PHB/UA triage logs, respects exact reported bindings, and reports orphaned review keys.

The price inventory now includes an independently reviewed transcription of 373 DMG magic-item sale rows and two scroll formulas on printed pp.121–125, plus 101 service/construction rows and seven condition groups. Dust of Sneezing and Choking was corrected in the draft inventory to the printed 1,000 gp sale value. These are bounded table inventories, not whole-book completeness. Price-row bounds and semantic site matching remain separate pending work.

Validation for this batch: 176 Node tests and desktop/mobile permalink, copy-link, history and focus tests pass. The CI artifact is the authoritative current count; old geometry candidates are explicitly stale when source/catalog/image hashes no longer match. Confirmed crop reviews do not establish mechanic correctness or default-selection quality.
