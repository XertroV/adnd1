# PD179 first-90 row source-pixel review

Frozen candidate SHA-256: `e4b6e39315ae1a0615364e0ad6d1f9ced6109067a9601f3d92603b8ff6931b0a`.
Frozen overlay-index SHA-256: `8e6cbdf3afa39e979e94108ae6b92ff169d47db42ed12010f1202974e80951f1`.

Scope: stable-ordered rows 1–90 of 179 across 7 source groups and 13 context crops. The JSON receipt records each row ID, source/crop/focus/overlay hashes, rectangles, source claim and outcome.

Outcome counts: {'confirmed_source_and_focus': 58, 'confirmed_row_focus_with_source_semantics_uncertain': 9, 'context_held_shared_crop_defect': 17, 'context_held_missing_ordered_continuation': 4, 'confirmed_source_data_defect': 1, 'partial_focus_overselect': 1}.

This is a row-level review of the exact frozen V2 evidence; it does not approve the full candidate. A later candidate can inherit a judgment only for rows whose candidate record, crop, focus, image and overlay hashes are proven identical.

## Confirmed issues and holds

- `dmg-henchman-initial-payment`: the candidate says the base offer establishes 5% interest; original DMG p35/PDF36 pixels read 25%. A separate JSON finding proposes only the condition change. The existing focus is relevant and should remain; the following row keeps its distinct additional-100-gp / +10% / 55%-maximum formula.
- `dmg-jewelry-exceptional-gem`: its first focus rectangle also selects the prior exceptional-workmanship sentence tail on the same line. The gem rule itself is present; treat this as a small focus overselect.
- `dmg-furs-clothing-rare-commodities` rows 01–17: focus overlays align to source rows, but the shared crop clips a source descender at the top and omits the Brocade*/Tapestry footnote `* Includes fine carpet and rugs as well`. Hold all 17 contexts until the replacement crop is reviewed.
- `dmg-info-discovery-row-01` through `-04`: row focus rectangles align to their table rows, but the current target selects only left crop02. Its Note is truncated at the lower-80% cost condition; the source continuation appears in the right column/crop03. Hold context approval until the ordered continuation is linked and reviewed.
- Poison source markers `***`/`****` remain without source-provided explanations in the inspected context; do not infer them.

## Counts and artifact

- 58 rows: source/value and focus confirmed in current context.
- 9 rows: source/value and focus confirmed, but source marker meanings remain uncertain.
- 17 rows: focus pixels reviewed, context held for the shared fur crop defect.
- 4 rows: focus pixels reviewed, context held for the omitted Sage-note continuation.
- 1 row: confirmed typed-condition defect (5% vs 25%).
- 1 row: source content confirmed with small overlapping focus selection.

Full machine-readable receipt: `research/source-audit-batch5-pd179-first90-independent-review.json` (SHA-256 `c529f2fb569762f39a0aa54992bd9210ada1f7e18852066a06d1c23289499b39`).
Typed correction finding: `research/source-audit-batch5-pd179-henchman-initial-payment-correction.json` (SHA-256 `7f1800b19b6b0de4eab792eff6aaef6a6f3d7d23eb6adabf599b3ef3789f590d`).
