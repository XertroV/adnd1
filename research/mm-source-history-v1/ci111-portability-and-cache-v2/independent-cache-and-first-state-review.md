# Independent review: proof-cache v4 and CI 111 facade correction

## V4 candidate and actual-root freshness proof

The frozen v4 hashes match the root-supplied values: candidate `264940614c88ea0fdb625a0b19f26322429590d68679c09de5521d8c82b1b84b`, probe `fd1e0d3bdf17d41b309f21636e31e9484b68209ab63c05d36c3496efc5dc3f79`, and manifest `c2da93a620e4a845d7d08edeb9e51df3d6fd4a1851903e06907eda7a76dd707e`. The v3-to-v4 candidate diff contains only the two comment lines that now describe the pure path-membership predicate accurately; no functional changes were made.

The actual-root record [physical-freshness-after-v4.json](/workspace/vault-audit-private/pass8/root/mm-cache-physical-freshness-after-v4/physical-freshness-after-v4.json), SHA-256 `bca478cab5091bef8aca87c0e975f577ab7526e51bcc2f9d704cfad0c2218146`, records 39/39 candidate rejections: raw inputs 9/9, additional inputs 12/12, guard code 3/3, bridge/H contract/H fixture 3/3, remaining mapped paths 11/11, and the native MM cohort fixture 1/1. Every target restored its exact bytes and inode, and a post-restore positive read succeeded. The before/after records match for all 40 listed identities, including hash, size, inode, and mode.

Tracked Git status is `M tests/mm-treasure-current-m1-cohort-v2.test.mjs`, the root-owned portable-root test fix. Its receipt binds the prior and current test hashes and reports 19 passed, 0 failed; the current file hash matches the receipt. The active reader remains `493f7959…`, and the bridge remains `23afdc77…`. The native fixture case now rejects in v4 with `current-MM cohort fixture identity`; the baseline reader v1 accepts that same mutation, as recorded in the prior before-run. This is the intended v4 behavior change. I made no active checkout changes and ran no full suite.

## Narrow CI 111 facade correction

The packet’s patch hash is `216e03944165d8e8a0f2c5bdf7e580fb41ac5345b7e8989c86f1cc7ba0c352fd`. Its candidate facade has SHA-256 `0da791259c585883e174ec4c0b4c286cbf4e26b43a2c5bf024c388cd951f1019` and differs from the preserved preimage only by the seven-line `dist/data.json` predecessor branch. The active facade still matches the preimage hash; the change is research-only pending root installation.

I independently read the immutable DMG history contract through `tests/helpers/batch6-dmg175-source-history.mjs`. The compressed fixture hash is `31f3410033b3a2a362cf51e556be55d7d8d6bf7bea66fd47c2b0c5561e6b9d42`. Calling the unchanged `projectDmg175Json('dist/data.json', pair.current)` returns `pair.before`; the resulting canonical object hash is exactly `00c7794cc7a8e888cfdc524291da7269226d98bfc216c4d9c8bcd5ac0c7e3250`, as required by the patch. The helper also binds the uncompressed fixture hash and validates its proof files.

The branch runs only after the facade’s plain-JSON validation and a precise `unknown MM/H/Version29 object state` error for the mapped path. It accepts only the exact `dist/data.json` object digest and marks it `olderLiteral`. The existing `isExactCurrentDmg175Json` then returns false for that literal, while `projectKnownDmg175OuterJson` returns the detached exact literal to the unchanged owner kernel. Every other unsupported object continues through `validateWithPreservedOwner`; the changed-field negative therefore remains rejected. The pre-fix logs show the same unknown-state error in the reproduced Batch 2 module-load failure and the Jo test failure. The edit is narrow to the missing predecessor state.

The corrected focused test copy, `install-exact-predecessor-test-v1.mjs` (SHA-256 `e64815df9797ddd634b9afd1eb521715d43ad212754bea5b791e178511c1105b`), differs from the original proposed test only by changing the facade import from `../../research/...` to `../research/...`, which is correct when the test is placed under repository `tests/`. The earlier proposed test hash `2cabc33a…` still has the incorrect import. The corrected copy has not been run against an installed candidate; the full suite was not run.

## Installation blocker in the prepared reader copy

The currently prepared reader target copy is `/workspace/vault-audit-private/pass8/root/pr52-ci111-controlled-fix-install-v1/install-reader-v1.mjs`, SHA-256 `d7f9d64daee497e614cdd6090d8bf283bf2b8006ac7744d89a7d135456ef6382a`. It contains the raw, uncommented line `import and repository-root binding.` at line 4. `node --check` fails with `SyntaxError: Unexpected identifier 'repository'`, so this copy is not installable as written.

The preinstall manifest reports functional suffix hash `01c44e4d725f441980205e57e994904a62fa590547d1f4c8a9d683dac43153d5`; that hash exactly fingerprints the suffix starting at the malformed line. The actual JavaScript body beginning at the first JS import is byte-identical to the frozen v4 candidate body, with SHA-256 `e728235a0cc8e1e3979c71820c959cb02f56b597bf77421fc92464f8ec44dcbf`. The header must be corrected and the manifest regenerated before installation. The prepared corrected test import is suitable, but it still needs the focused actual-root run after installation.

## Review disposition

The v4 cache logic is supported by the 39-case physical freshness result. The CI facade branch is narrowly pinned to the exact predecessor and preserves fail-closed handling for unknown objects.

### Final prepared-copy recheck

Root preserved the malformed v1 reader copy and prepared `install-reader-v2.mjs`. Its SHA-256 is `ec10ff4249dd1fddf47088012a68bde78157c1dd2ce7368419f6b7f06f88883e`; it passes `node --check`. I independently compared the bytes from its first column-zero JavaScript import through end against the frozen v4 candidate: they are byte-identical, and both suffixes hash to `e728235a0cc8e1e3979c71820c959cb02f56b597bf77421fc92464f8ec44dcbf`. Only the initial three comment lines differ.

The corrected focused test copy at `install-exact-predecessor-test-v1.mjs` matches SHA-256 `e64815df9797ddd634b9afd1eb521715d43ad212754bea5b791e178511c1105b`, passes `node --check`, and changes only the facade import to the correct `../research/...` path for a file under `tests/`. The revised preinstall manifest [preinstall-manifest-v2.json](/workspace/vault-audit-private/pass8/root/pr52-ci111-controlled-fix-install-v1/preinstall-manifest-v2.json), SHA-256 `f77f44d67eebe83003b126660ecec305cd1187f8d19a192300649440dd46f837`, binds these hashes and the unchanged preinstall state. The old v1 manifest and syntax-failing copy remain preserved.

I found no remaining static blocker in the prepared reader, narrow facade branch, or corrected test path. Root can adopt the reader, facade patch, portable-root test repair, and focused test, then run the planned actual-root regressions. Those post-install regressions have not been run as part of this review; I made no active checkout changes and ran no full suite.
