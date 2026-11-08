# UA p.28 field-selector adjudication

## Frozen scope and result

The report preserves all 69 original field selectors and proposals before the note-region writes. It corrects 47 new row-primary selectors and 19 new passage-primary selectors. It preserves the existing 3 Aklys review targets. The 69-selector universe is tied to the proposal SHA `81f0ec41e8da09388c0bd3b7703d7f3e0929e66a48231af88aee9c8f55592095`; the field-region role inventory remains frozen at 4328 bindings.

| Cohort | Before | Corrected selector |
|---|---|---|
| 12 heading-as-row targets | The proposal selected the table heading for Sling (bullet), Sling (stone), Knife, and Lasso fields. The full before records are retained. | The four owner groups now point to their separately reviewed row regions; this corrects all 12 field selectors while retaining the heading regions as historical context. |
| 19 Additional missile range adjustments fields | Proposal-only primary targets were weapon rows, although the literal field purpose is the shared Armor Class adjustment paragraph. Each original row target and purpose are preserved in `preCreationMisselectors`, captured before any new note existed. | A focused per-owner note region is first and primary (`role: note`, passage evidence); each correct owner row follows as context. |
| 47 other new fields | Candidate source rows are retained. | The first region is a row (`requiresRowEvidence`); current selector role checks pass. |
| 3 Aklys fields | Existing reviewed row targets. | Preserved unchanged. |

## Note geometry

Each new note reuses the owner catalog's UA p.28 full-table image `ua-28-f9e1d616b1cec48a.png` (SHA-256 `f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b`). It copies the owner’s current Table-notes region’s second focus rectangle exactly; that rectangle matches the independent Armor Class adjustment focus within only the stored-coordinate rounding tolerance. The separate first rate-of-fire/range-label paragraph is excluded. Old notes regions, IDs, image bytes, focus rectangles, and hashes remain in place.

New note regions have `role: "note"`, `verificationScope: "source-excerpt"`, and only a source-location checked field. They do not promote field-value grades. The report records per-owner catalog, source, image, focus, and content hashes for independent review.

## Validation

`tests/ua28-field-selector-adjudication.test.mjs` validates the historical proposal cohort, the 4,328-binding pre-change role baseline, all 12 historical heading errors and corrected row IDs, all 19 wrong-purpose originals and new note-first order, the exact second-paragraph geometry, row/passage role gates, preserved old notes regions, and the unchanged Aklys selectors.

Full corrected JSON report: [source-audit-batch5-ua28-field-selector-adjudication.json](source-audit-batch5-ua28-field-selector-adjudication.json).
