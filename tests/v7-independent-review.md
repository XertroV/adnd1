# V7 independent review

Final independent review completed 5 November 2026 against the local assembled site at `http://127.0.0.1:8765`. No live-data requests were intercepted in the two final browser suites. This is application/source-preservation verification, not a deployment or a visually verified source-table claim.

## Preflight evidence

- The v6 baseline contains 638 spell cards, 148 rules, 16 class guides and 80 equipment entries. There are 275 singular `Material` fields and 105 plural `Materials` fields; no current card has both. Both authored variants must remain available in the complete attribute table.
- All 80 price-state records agree with purchase-price presence: 45 `source_listed`, 35 `unextracted`. No current gap is established as a price absent from the source; no estimate was justified by this review.
- Independently read PHB pp. 45, 94 and 96; UA pp. 26 and 46; and DMG p. 26 through Library OCR. These are the expected base rules, alternative Partisan damage and gem-value table behind the six added citation overrides. UA p. 26 explicitly lists Partisan Large-target damage as 2–7; the PHB-specific value must remain separate. This is an OCR check, not a scan-image verification.
- Captured a fixed desktop baseline from local commit `6ff7830b3bb5ab881c5345efb513f9dcfa0ae413` using request interception of that commit's static assets. At 1440×1000, Bless's attribute grid is 233 px high and Web's is 175 px; Dagger's is 334 px and Partisan's is 223 px. Complete card heights are recorded in ignored `test-results/v7-baseline.json`. This fixture is a layout comparison baseline, not a live release check.

## Final checks

- `node tests/v7-independent-browser.cjs`: **968/968 checks passed**, no JavaScript page errors. Compared the DOM full-attribute tables against every authored field in all 638 spell and 80 equipment records, including both authored Material/Materials variants, uncommon field labels, exact damage ranges, and all price amounts/units. No damage dice were inferred. At 320, 390, 491 and 1440 pixels, native disclosures supported Enter, Space, touch where applicable, and Escape with focus restoration; tables did not overflow the document, and disclosure targets were at least 44 px high. Eight selected axe scans had zero violations for WCAG 2 A/AA and 2.1 A/AA rules.
- `node tests/v7-source-independent.cjs`: **84/84 integrated checks passed**, no JavaScript page errors. Dagger's header contains PHB pp. 35, 37–38 and UA p. 28; its footer opens exactly those four pages, while the specific UA field chip opens only UA p. 28. Tested all six cross-book overrides, the bard's special sequential label, thief-acrobat's specialist-path label, and the separate multiclass/class-change explainer. Four source-reader axe scans had zero selected-rule violations.
- The source-reader suite uses only original generated 241-page PDF fixtures; no source-book PDF is deployed or fetched by HTTP. Observed 13 same-origin GET requests, with no PDF HTTP request, upload, request body or external asset request. Tested PHB/UA mapping, DMG p. 174→PDF 175 and p. 176→PDF 176, and the p. 175/240 gaps without substitute pages. Forget clears the current bitmap and selectable text. The UI states local-only handling, the need for a matching edition, and that focused regions remain unverified. These fixtures establish rendering behavior, not original-book accuracy or edition identity.
- Fresh explicit mobile bookmarks now reveal and focus the selected heading exactly once. Same-view and cross-view command-palette selections also reveal once. Ordinary and invalid initial routes do not force card focus. Verified these behaviors at 320, 390 and 491 pixels.
- `node --test tests/citations.test.mjs`: **6/6 passed**, including Dagger's source union, missing-page mapping and the new regression separating verification status by printed page.

## Visual result and fixes

Inspected generated screenshots of the compact interface and original test-fixture reader, including 320- and 390-pixel reader states. Relative to the fixed v6 desktop baseline, final closed-card heights were approximately Bless 805→685 px (15% shorter), Dagger 1,163→713 px (39% shorter), and Partisan 991→628 px (37% shorter). Complete attributes remain one disclosure away. The five editorial polearm silhouettes have distinct keys and remain decorative rather than claiming source-accurate illustrations.

Reported and retested fixes: the Components label's mid-word wrap, missing mobile initial-bookmark reveal, per-page citation status leaking across pages in one book, and stale page pixels/text remaining after Forget. All were resolved in the reviewed checkpoint. No remaining blocker was found in the tested scope.

## Evidence and limits

Ignored `test-results/` contains `v7-independent-browser.json`, `v7-source-independent.json`, layout measurements and screenshots named `v7-*.png`. The committed regression scripts generate or consume only original test fixtures; source books remain private. No author data, application files, hosting identity, GitHub push or deployment was changed by this reviewer.

Source PDFs still could not be materialized through the supported transfer path because the signed download hosts returned HTTP 403. Important source tables, source regions/crops and original scan pixels remain unverified. The review does not establish complete rules coverage, PDF edition recognition, exhaustive accessibility, malicious-PDF robustness, performance with very large scans, or compatibility beyond the tested Chromium environment. Publication and hosting/access verification remain root-owned.
