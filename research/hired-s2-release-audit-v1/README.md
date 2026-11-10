# HIRED S2 release-audit receipt proposal

This is a finite public release-audit packet for the committed HIRED S2 source work. It records the exact source epoch, source inputs, actual audit report map, checked runtime baselines, preservation boundaries, and a candidate PR staging allowlist. It does not claim a V30 release or H deployment.

The last verified live runtime represented here is Version 29 at merge `1f79d909344ebe7d41a432d8673f3eedb491fa3b`, bound to `research/source-audit-pass8-pr50-version29-live-release.json` (SHA-256 `3c16c44b15144d56af25c8cf0161efa67978de7190d05781c7cfd15f0624758e`). All `published: true` statements in the status snapshot are scoped to that receipt and its observation time. The committed S2 source is `bc819621e49788260bb34ea47c1f7a8b35af6edf` (tree `e6bc420f70656825a926297b959bc6d98758bfcd`), source-only and undeployed.

The H scope is 48 owners (38 tables and 10 procedures), 244 rows, 343 cells, 35 procedure bullet fields, 36 page bindings, and 321 new pending controls. Source-unit scan coverage records 47 absent units and partial unit T24. The continuation correction is 9 multi-part flows / 18 segments plus 2 one-part aliases / 2 segments; the viewer renders the nine multi-part flows. The visual, raster, and continuation reports are structural source/hash/geometry inventories, not semantic review. The 25 new location-verified associations and 28 pending primary-location hints remain separate review states.

The receipt distinguishes local evidence from live verification. The local H browser result reports 399 checks; a separate Node VM renderer receipt reports 321 rendered targets and expressly does not run a browser. The later V29 local regression adds four persisted-pending checks for 333 total, alongside a separate 124-check notes/search result. None of those local results is a Pages deployment receipt.

Preservation boundaries remain explicit: the frozen 559-unit census (282 core, 275 excluded, 2 outside-core cases), 0 whole books semantically complete, 726 legacy-frame usages, 2,185 current raw sentinels, 2,183 historical unresolved highlight warnings, 27 unassessable alias parts, glyph limits at UA p.10 and DMG p.11, and 7 monetary plus 2 scope questions affecting 9 rows. These queues are not cleared by the S2 structural reports.

The financial metadata refresh actually failed with `active.has is not a function` (exit code 1). The narrow fix remains pending; this proposal does not claim a financial refresh pass and does not touch monetary-specific `sourceIntegrationDescriptor` fields. The source-completeness report refresh is a separate successful operation (exit code 0); it preserves the frozen baseline and still reports 0 semantically complete whole books.

## Files

- `receipt-proposal-v1.json` — source-bound release and preservation receipt proposal (SHA-256 `ecda6f9375de67d94b9cc145f2f38044c7af182eb709556eea2786dabed175f9`, 14998 bytes).
- `public-private-filelist-v1.json` — exact source-commit path map, candidate public artifacts, and private-only evidence references (SHA-256 `8131143fbcff0d28f210906012e623e8de599646c0957a7342203781f145f9cc`, 50059 bytes).
- `README.md` — this explanation.

The public filelist proposes only the exact S2 source-commit delta, nine bounded source audit reports, seven existing bounded H research artifacts, four source-CI files, and the root-managed current status/pointer/completeness artifacts. It excludes full PDFs, the supplemental image payload, browser screenshots, full private handoff data, and wholesale proposal/history directories. Root final validation must re-pin current metadata artifacts before final staging.

The actual source, independent guard, metadata approval, source-CI4, VM renderer, local browser, old-guard-failure, alias, and failed-financial-refresh records are listed by path and hash in the receipt/filelist. Private payloads and private browser screenshots are referenced but not copied here.
