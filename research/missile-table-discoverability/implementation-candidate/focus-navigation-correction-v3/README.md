# Missile table production metadata successor V3

This package is a research-only successor to the frozen V2 candidate. It changes the two complete table-context roles from `context` to `table`, cleans stale workflow descriptions on the reviewed PHB p.38 / UA p.28 candidate regions, refreshes derived region-evidence content hashes, and binds two proposed whole-lookup/default reviews to complete ordered page groups.

It does not activate `sourceExcerpts`, edit the active review ledger, alter compiled data, source images, row values, source text, focus rectangles, IDs, or unresolved field/source-value status. The 555 literal cells, all 50 field-target-pending bindings, and all 50 `not-assessed-by-field-target-review` source-value statuses remain unchanged.

Run `node research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v3/build-candidate.mjs` to reproduce the files. Run `node research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v3/validate-candidate.mjs` for the focused structural and preservation checks.

The exact leaf diff from frozen V2 is in `exact-leaf-diff-v2-to-v3.json`; the complete page-group/default hashes and unapproved review proposals are in `whole-lookup-review-proposals.json`. Root final review of these exact V3 objects remains required.
