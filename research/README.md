# Value-level verification log

`mechanics-audit-progress.json` is the durable audit snapshot. It inventories every included field of all 892 reference-bearing records and identifies the exact assembled-data version by SHA-256. Its denominator is the existing mechanics leaves selected in `tools/mechanics-audit.mjs`, including nulls and empty arrays; it is not a percentage of the books, all possible rules, or source-image coverage. Adding newly extracted fields changes that denominator.

Each field has its current value, status, reviewer identifier, and the record's inspected source pages and source-file hashes. `reviewRecords` preserves the original checked-value snapshots and proposed old/new values. Source-checked means a reviewer compared that assertion with the cited source; it does not certify completeness of the rule or resolve contradictory printing. Independent review of corrections is additionally recorded in each batch's review report.

Statuses separate unchecked values, source-checked assertions, proposed corrections, applied checked corrections, unextracted values, source conflicts, reviewed editorial advice, and stale evidence. An inspected percentage includes proposed corrections and editorial review; the source-checked percentage does not. Counts are not interchangeable.

Run `node tools/mechanics-audit.mjs --check` to validate the committed snapshot. Run `node tools/mechanics-audit.mjs --from-log` to rebuild using its embedded review evidence. During an active audit, running without flags imports the six local batch proposal files when present; those working files are excluded from Git. Newly changed values cannot silently inherit earlier checks: they require a recorded reviewed correction or re-review.

The equipment batch review is in `tests/mechanics-equipment-review.md`. Remaining audits continue in bounded batches; a field without completed evidence stays explicitly unchecked. Source-image availability alone never changes a field's verification status.

The [equipment completeness review](equipment-completeness-review.md) separately records the source areas searched for missing mechanics and remaining evidence limits. Completed value review of the current fields is distinct from exhaustive extraction of all book content. Accepted equipment and spell/class changes retain independent value snapshots in the regression fixtures; local working proposals are excluded from Git once their evidence is embedded in the durable log and fixtures.

Rewording an editorial status note does not make it source-checked mechanics. Likewise, an applied clarification does not clear a still-documented source conflict. The generator preserves those dispositions and rejects unreviewed changes even when a conflict flag is present.
