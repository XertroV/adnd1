# Source visual audit snapshot correction

The initial `source-visual-audit-baseline.json` and `source-visual-audit-queue-*.json` are retained as historical evidence, but their denominator omitted the synthetic `progressionExplainer` record included by `tests/public-scan-contract.test.mjs`. They must not be used as the sitewide coverage denominator.

The corrected snapshot is `source-visual-audit-corrected.json` and its matching `source-visual-audit-corrected-queue-*.json` files. It includes that record and binds the catalog set through per-catalog hashes and an aggregate catalog snapshot hash. It was taken after some catalog edits, so its sentinel totals should not be compared to the original snapshot as if only the synthetic record changed.

These snapshots are historical; run `python research/source-visual-audit.py --source-dir /path/to/source/books --output-prefix current` to generate a separate current snapshot after further edits. The offline scan requires the authorized local source PDFs and does not upload them. Every full-image focus sentinel is a suspected overhighlight pending per-region review; hiding an overlay does not resolve its semantic focus. Geometric crossing candidates are not verified defects.
