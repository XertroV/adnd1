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

## Third repair batch and frozen handoff

Added 28 printed-price entries (11 clothing, nine provisions, eight livestock), bringing the site to 116 equipment entries. The new excerpts show complete labeled section tables with precise item/price-row highlights. Original region IDs are retained. Only the 28 prices and nine explicitly printed units are source-checked; other mechanics remain unextracted, and 28 generic summaries remain unchecked in the extracted-field ledger. Historical equipment assertions are preserved with an exact reversible fixture.

Further PHB and UA crops were corrected, including same-page Abjure/Aid continuations and both bindings of Animate Object. The latter supersedes an earlier incorrect valid-context crop assessment; the original and superseding evidence are retained. Highlight exceptions are independently scoped to their actual prose or whole-table use, and default selection has its own ordered-page evidence.

`AGENTS.md` now points to `agent-docs/citation-images-and-verification.md`. The rules require contextual complete tables, precise relevant row/cell highlights, intact text, source provenance and reproducible coverage. Existing excerpts are not certified by this instruction file.

Validation: 179 Node tests pass; representative new equipment prices, images and highlighted dialogs render at desktop 1440px and mobile 390px. The source PDFs and private page uploads are not included.

Remaining work, explicitly outside this merged batch:

- Of the 101 source-table objects previously confirmed absent, 73 remain after these 28 additions: 68 PHB and five UA items. Two distinct package offers and one unresolved hand-crossbow-quarrel row are separate. Prepared price-only proposals are not completed equipment records; their provisional narrow crops must be replaced with contextual full-table images and independently reviewed before application. New equipment mechanics beyond price still need extraction where supported.
- UA candidate audit (excluding UA81): 132 candidate images / 145 linked usages; 37 repaired, two comparison-label corrections, 16 visually valid excerpts, seven known pending defects, 70 unreviewed. The UA10 source fold obscures some characters; do not invent them.
- PHB45–55 highlight scope: 211 original sentinel bindings; 147 independently approved (146 exceptions and one precise Locate Object highlight), 64 unreviewed. Repaired Animate Object/Animate Rock highlights remain unreviewed. Other books/pages are separate scope.
- DMG11 retains two crop-defect bindings caused by source-edge loss. Three previously documented source-rule ambiguities remain interpretive. Printed DMG175 is privately supplied but not publicly reproduced; alleged numbered239–240 are not established missing pages.
- The Aklys citation selection and contextual-table report is assigned to a separate follow-up; this batch does not claim to fix it.

Third-batch report snapshot: 1,885 cited record/page pairs, 2,640 region usages (including legacy bindings), 1,451 unique images. Highlight reviews: 404; full-image suspects: 2,084; explicit exceptions: 152. Crop reviews: 623, including two defects. Default reviews: 53 / 1,884. The generated CI artifact remains the reproducible source of current counts. These are not whole-book completeness percentages.

Separate read-only dogfood reports are recorded in `source-viewer-dogfood-findings.json`: Charging melee DMG66 lacks its p.67 continuation; Fireball/Sleep source-stage viewport framing needs diagnosis without assuming PNG clipping; search can change the selected equipment/spell card without updating its entry URL, so reload restores the old item. The navigation report is an application finding outside citation-region denominators. Abjure's UA37 continuation is added in this batch and awaits the deployment check. These reports do not certify a new independent review.

The subsequent contextual review is a separate dimension: 29 bindings are manually confirmed adequate (28 new complete price tables and the current Assassin proficiency table), five Arrow/Long Sword narrow excerpts have confirmed context defects, and other bindings are unreviewed for context. Prior relevance or legibility approvals were not promoted. Whole-spell excerpts may be shown without highlighting; individual facts require precise focus and sufficient context, including column/page continuations. The inefficient spell-filter layout and lost separator after green-notice dismissal are explicitly logged as application findings.

The release geometry snapshot has been refreshed against every current catalog and original PDF hash. It contains 552 unique image candidates / 1,051 bound usages, with zero stale geometry bindings at this checkpoint. These are heuristic intersections, not 552 confirmed defects. CI now includes calibrated numeric boundary regressions for the old/repaired Animate Object example and false-positive/missing-text-layer limits. See `agent-docs/citation-checks.md` for implemented checks and concrete follow-up contracts.
