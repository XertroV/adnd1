# UA mechanics evidence withdrawal proposal

This folder is a read-only candidate inventory. The active mechanics ledger, source files, metadata, historical helpers, and frozen source-phase manifest/receipt remain unchanged. The historical source-phase base is `9b77aeb620b1d671ff1d59b0e14790206523b327`. Root subsequently supplied the actual weapon merge dependency `6717c6f22bbf2f2b421327e4c8561b1d81df00d4`; this checkout has not been advanced or committed. A later activation receipt must bind that merge explicitly.

The recommended candidate uses the existing normalized review API. Preserve the exact old ledger in `exact-before-mechanics-ledger-v1.json.gz`; replace only the six declared active review applications; append five empty-check pending records; rebuild with `buildLedger(data, reviews, {alreadyNormalized:true})`; validate the resulting ledger. All original 1,210 records remain exact historical evidence. The other 1,204 active records and their order remain exact. This is a qualification of six active applications, not a claim that all old 1,210 remain identical active approvals.

No active change has been applied. The existing API supports this method without a new producer, constructor, retirement registry, or comparison exception.

## Exact scope

The five spell bodies have 44 changed mechanics-leaf pointers: 41 current leaves and 3 removed leaves. Twenty-four distinct old checked pointers overlap those edits, yielding 25 record-pointer pairs because Druid Ceremony `/exceptions/0` was checked in two records. The old checked values match the exact 9b predecessor. In the current body, 22 overlapping leaves still exist; the other two formerly checked leaves have been removed. Chromatic Orb's removed `/exceptions/1` additionally had an old correction but no checked-path pair.

Four old proposed changes also become stale: Rainbow's whole `/exceptions` array; Druid Ceremony `/exceptions/0` in both old reviews; Chromatic Orb `/exceptions/1`. Withdrawing only checkedPaths/checkedValues would leave stale old correction applications. The candidate withdraws these four whole old correction objects from active application while preserving their exact original objects, including nested superseded history, in the before fixture and withdrawal registration.

The six record indexes are 806, 829, 833, 848, 933, 1198. Each registration names the checker, owner, original whole-record hash, proposed whole-record hash, exact withdrawn pairs and exact old correction indexes. All other properties of those six records remain exact. Forty-eight retained checked paths and five retained corrections are preserved.

Five appended records have empty checkedPaths, checkedValues, reviewedPaths, sources and changes. Their unresolved entries name exactly the 41 current changed leaf pointers, spanning 12 revised body properties, with pending separate mechanics-field-review reasons. These entries approve no values and claim no new source inspection. Old Bind trip/entangle prose moved to a different pointer receives no implicit grade transfer. An unchanged Bind `/effect/0` retains its original source-checked status. A broad `/effect` unresolved note would demote that retained field and is rejected by the recorded negative control.

## Existing code and precedents

- `tools/mechanics-audit.mjs:62` normalizes raw proposals; line 67 preserves prior checkedValues when present, otherwise snapshots current values. Raw normalization is not an evidence-retirement mechanism.
- `tools/mechanics-audit.mjs:71` accepts normalized reviewRecords through `alreadyNormalized:true`. Lines 83–94 evaluate active `changes`; lines 98–114 derive checked/stale/pending status. Stale evidence precedes unresolved pending notes, so appending notes cannot retire an old check or correction.
- `tools/mechanics-audit.mjs:127` validates regenerated fields, counts, statuses and stale corrections. It rejects the original evidence against the current bodies. Line 157 selects saved normalized reviewRecords for `--from-log`, or when no local raw proposal files exist.
- `tools/mechanics-citation-page-transfer.mjs:15` is a single exact Grand Druid XP-array page-metadata comparison transfer. Its owner/checker/change/whole-object guards reject spell bodies; it cannot authorize this withdrawal or any source-value change.
- `research/source-audit-batch5-class-retired-ledger.json:3` preserves the unsupported Assassin level 17 checked pairs and source-grade correction after the active application was removed. The matching progression retirement separately preserves the deleted event and original finding.
- `research/source-audit-pass8-character-reference-mechanics-transition.json:44` preserves an exact old ledger fixture and verbatim superseded whole-array proposals while naming bounded replacement record hashes. `supersededChanges` is retained historical provenance; the mechanics evaluator does not interpret that nested key as a current approval or retirement command.
- `research/source-audit-pass8-phb-spell-guidance-seven-leaf-mechanics-application.json` appends seven exact reviewed corrections using a separately accepted independent review. That precedent requires explicit source-value review; it does not justify promotion of this batch. The reused UA join review `e9de8f99…` expressly excludes source-value and mechanics grades.

## Decision

Goal G1: preserve all original evidence historically and keep every unchanged checked assertion. Goal G2: leave revised assertions pending and retain stale-value rejection for unrelated changes. Goal G3: produce a valid candidate using existing producer APIs. Context: exact six old records, 25 checked pairs, four obsolete corrections, 41 current changed leaves; no new mechanics approval.

| Idea | G1 | G2 | G3 | All |
| --- | --- | --- | --- | --- |
| Retain old active evidence and add pending notes | ✔ | ✘ | ✘ | ✘ |
| Replace old checkedValues with current values | ✘ | ✘ | ✘ | ✘ |
| Delete all six active review records | ✘ | ✔ | ✔ | ✘ |
| Withdraw only the 25 checked pairs | ✔ | ✘ | ✘ | ✘ |
| Exact six bounded withdrawals, immutable before history, five exact-leaf pending records | ✔ | ✔ | ✔ | ✔ |

The first idea still fails on 22 current stale fields and four stale corrections. Replacing checkedValues invents approval of changed assertions and destroys old-value evidence unless separately preserved. Deleting whole records discards 48 unchanged checked paths and five valid corrections. Withdrawing only checked pairs leaves four stale changes. The selected candidate preserves all unchanged evidence and validates without approving any revised assertion.

## Actual in-memory result

The original 1,210 reviewRecords against current source-phase data produce 22 stale-proposal fields and four stale changes. The selected 1,215-record candidate produces zero validation errors, zero stale-proposal fields and 730 unchecked fields. All 41 current changed body leaves are explicitly unchecked and uninspected. Existing source-checked fields total 12,708; no new reviewed field is added. Every unchanged-value mechanics field keeps its original disposition.

The six-only replay was frozen first and remains separate. Its files are immutable references for the combined candidate. `explicit-pending-registration-and-replay-v1.json` records the combined candidate and controls against broad pending parents and append-only pending notes. `complete-raw-proposal-loader-replay-v1.json` probes importing the complete old raw proposal set plus the new pending records: four stale corrections and two current stale fields still prevent validation. No actual raw importer CLI was run against active files.

There are zero matching root-level `research/mechanics-*.json` proposal files in this checkout. Therefore its existing default path already uses saved normalized reviewRecords, as does explicit `--from-log`. The portable new raw pending schema is nested in this folder and is not loaded automatically. The root-level raw importer treats its input files as the complete proposal set; it does not merge absent prior records. Integration must use the qualified 1,215 normalized records and explicit `--from-log` provenance.

## Field targets and monetary prose

All 807 manual declarations remain exact; none belongs to these five spell owners. All old 4,681 canonical bindings remain exact in the 4,705 source-phase inventory. The 12 bindings for these owners remain pending page/reference bindings, with no targetReview and no body-pointer overlap. Three nonempty reference bindings point only to unchanged `/references/0` or `/references/1` objects. Pending page context does not certify a revised body leaf.

The current scanner finds two relevant spell prose candidates: new Cleric Ceremony `/exceptions/0` service fees and revised Rainbow `/conditions/0` diamond-value wording. Rainbow already mentioned 1,000 gp before. Existing source occurrences `price-discovery:ua-census-record-001` (UA32) and `…003` (UA40) preserve these source passages in the 65-record census; both remain unmapped with semantic and overlay review pending. The monetary candidate names the current owner/pointers and raw prose hashes against those exact existing occurrences. It proposes no duplicate source row, occurrence, canonical price binding, or source-value promotion.

The global broad scanner count moves 773→775. The other newly matched pointer is UA Acrobat `/guidance/5`, whose 1,000 gp text is in an explicit carried/body-weight context. A separate actual scanner record preserves that classification without inferring a price. This observation requires its own source-context disposition; this proposal changes no source wording or grade.

## Authorized next step after root and independent review

Verify whole old ledger bytes, source-phase data bytes, all six original record identities and the exact current-body preimages. Build the candidate from the six registered replacements and five exact pending records. Check the combined canonical reviewRecords hash and all retained fields against these receipts before any active write. Save only the authorized normalized ledger through the existing API and regenerate its summary using the existing producer. Run `--from-log` and `--check` afterward, with independent rejection controls for an extra checked pair, changed retained value, extra obsolete-change removal and unlisted source-body mutation.

Metadata refresh, source commit, history projection, final integration checks and publication remain root-owned and outside this read-only task. Frozen source-phase manifest `bc70496d…` and receipt `69478559…` remain unchanged historical prospective evidence.
