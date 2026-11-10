# Citation producer coverage proposal (Git 346c)

This is a research-only, read-only proposal for the `citation-navigation-coverage.mjs` failure at Git HEAD `346c7634f8cad08998389ecd1d084b7082fb91a9` (tree `24cd8b1e03b3244aa9fc8caaad749780749ee337`). No active tool, test, app, viewer, source data, or Git bytes were changed. The proposal is not installed.

The exact active CLI failure and inventory-test import failure were captured as raw stdout/stderr bytes in `actual-failure-git346c-cli-{1,2}.*.bin`; `actual-failure-capture-git346c-v1.json` records command, exit code, and hashes. The CLI reports `Unclassified citation chip producer at dist/app.js:1063 in exactPendingPdfHirelingBulletSourceChips`. The inventory test fails during import before its assertions.

## Finite proposal

`proposed/tools/citation-navigation-coverage.mjs` adds the exact function classification `hireling-pending-pdf-bullet-field-reference` for `exactPendingPdfHirelingBulletSourceChips`. It also renames `tableFactSourceChip`'s class from the now-misleading `cleric-turning-table-fact` to `source-table-fact-reference`: that same function has a new pending HIRED source-note branch at app line 1072 and its existing reviewed Cleric table-fact branch at line 1078. The report metadata now describes both bounded branches.

`proposed/tests/citation-navigation-inventory.test.mjs` updates the producer denominator to 22 call sites and 15 classes, checks the helper's unique class, and changes the table-fact count to the two actual call sites. It preserves the synthetic future-producer negative test. New data-backed role checks assert that all 36 HIRED bullet bindings (35 owner-field pointers) and 41 table-note bindings (38 owner-field pointers) map through the actual `FirstEditionCitations.targets()` implementation to their own `rules` field/source owners. All retain their exact category and region metadata, `field-target-pending` / `targetStatus: pending`, `not-assessed-by-field-target-review`, and `context-not-assessed` status; none inherits approval.

The entire current `dist/app.js` producer census is recorded site-by-site, with source line text, in `read-only-producer-guard-proof-v2.json`: 22 call sites, 16 producer functions, and 15 explicit classes. The candidate classifier still throws for an unclassified `futureCitationControl`. Current S2 data has 48 HIRED rule owners; the bullet and note role checks each report zero errors. The H bullet and note source owners and field owners are the same exact rules owner.

## Verification and limits

- The original actual CLI and test-import failures are preserved in raw files; they were not reconstructed.
- The proposal-only guard proof demonstrates the before throw and after census/role checks without writing application files.
- The candidate coverage CLI ran against the unchanged actual `dist` bytes and exited 0; its full JSON is `proposed-coverage-cli-v1.stdout.json`.
- The candidate inventory test passed all 13 tests (`proposed-inventory-test-v5.stdout.bin`, 0 failures) using the proposal files plus read-only symlinks to the actual `dist` and fixture/test files.
- Both proposed JS files and the guard-proof script pass `node --check`; `git apply --check` passes for `citation-navigation-producer-coverage-v1.patch`.
- Active snapshot pins remain app `f4381ff282ea6ff7d245c915ab17fafd4b19e025e2af6c2a496145429285f2c7`, citations `63e1667cd93c773e950bf6c53d8cf56e6beb29490278cecdeeb952cfa2663032`, and data `2cddb11a82ecc3b9d77cb3fa2ae49eef5623a5470ac85a540d1baf483e096a95`.

These checks validate the bounded producer inventory and actual target-role projection. They do not execute the full project suite, validate visual/source adequacy, or constitute a release check. The root agent owns the full suite and any decision to install this proposal.

`read-only-producer-guard-proof-v1.json` was updated in place once during preparation to add all producer-site rows; its earlier intermediate bytes were not retained. The complete current proof is separately versioned as `read-only-producer-guard-proof-v2.json`.
