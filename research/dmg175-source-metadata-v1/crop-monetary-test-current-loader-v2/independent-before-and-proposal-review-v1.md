# Monetary historical loader test proposal

Scope: one-test proposal for `tests/pass8-citation-target-crop-history.test.mjs`. No active test, helper, or source file was changed. Candidate patch: [proposed-test-only.patch](./proposed-test-only.patch).

## Observations

- Focused pre-change command: `node --test --test-name-pattern='monetary successor changes provenance only and retains all8/7/1 question boundaries' tests/pass8-citation-target-crop-history.test.mjs`.
- It reaches the old loader call and fails with `Invalid current monetary source questions: stale input research/price-source-inventory.json` at line 61. The failure is the expected old-input boundary after current canonical input provenance moved.
- V28 is commit `386b08a4678ee033d6daabc0ffa2cc17265a7c1f`. Its historical loader SHA-256 is `72c9d2b1992ac0960cea8c3e8855a141339142b0ed32bfe194c933491948bc9e`; its UA question registry SHA-256 is `864ae05ad5eab345e299a128b6b43c9a364bec7f9fee113ea409078c9afd4b0c`. Both active files match those exact V28 Git blobs.
- The whole V28 registry's eight `dispositions` are identical to the test's PHB predecessor dispositions: seven `unresolved-source-question`, one `source-backed-derived-valuation`. The test's actual successor also has that 8/7/1 split. Its limits preserve that the general source review is pending and the derived value is not a source-printed range or printed-value pass.
- The existing full-object normalization/restoration assertion passes in a read-only rehearsal: deleting only `citationTargetCropInputMigration` and restoring the two migrated current input refs returns the successor JSON exactly to the predecessor JSON.
- A read-only inline rehearsal of the candidate assertions passed, including the old loader's stale-input rejection. The target test itself was not edited or re-run with the candidate patch.

## Proposal

Retain the loader import and invocation as an explicit negative boundary. Pin the original V28 loader and whole V28 registry bytes, compare the complete historical dispositions with the predecessor, count the 8/7/1 categories from the V28/predecessor/successor registries, check the review-limit statements, then assert the active V28-bound loader rejects current inputs at the canonical inventory pin. This avoids treating that old-input loader as a fresh positive check on post-V28 source inputs; current-producer positives remain separately covered.

I did not rerun the V28 loader positively against a historical thin root. Its audit closure traverses monetary identity audit, findings/review extensions, context-migration bridge, render-frame evidence, and fixture references. A strictly Git-only thin-root probe stopped at `tests/fixtures/monetary-source-ua-583-before.json.gz` (and the automatically referenced extension set includes non-Git/private/external paths). Materializing that closure would exceed this proposal's narrow scope; no full archive or repository copy was made.

## Review status

`git apply --check` succeeds for the proposal against the current worktree. Patch SHA-256: `9a74a26014b764797ef1348186ac290b92405e8501e32a23177687742f806d80`. This is a reviewable proposal only; no active code change is claimed.
