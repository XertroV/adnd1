# DMG p.225 target-proof test repair review

This is a read-only repair proposal for `tests/pass8-dmg225-field-mapping-target-proof.test.mjs`. No application code, test source, helper, source data, catalog, or Git state was changed. The proposed patch is in `proposed-test-repair.patch`.

## What the focused failure showed

The original focused run failed 3 of 5 tests. The A46 fixture check compared the current `equipment.json` against a historical A46 snapshot; the snapshot hash is still exactly present at `a46eddc41ac6f712d5ad1498195df6a49810aae1:equipment.json` (`9c831f…`), while the current file is a later source state (`714d40…`). The test also pinned an older `dist/data.json` hash (`c076e0…`) even though the active current file is now `fd73ee…`.

The exact 29 DMG p.225 proof rows and their grade assertions are unchanged. The test failed before reaching them because it expected 807 manual bindings, while the current ledger has 930. The proposal keeps the published 757-row prefix and the exact prior 50-row declaration interval (757–806); the existing native source guard verifies the later 123 declarations.

Current metadata counts are 1,882 source reviews and 273 continuation groups / 540 segments. The first 1,849 historic review objects and first 261 continuation groups remain checked exactly. The two newer DMG 175 continuation groups are independently constrained by the existing continuation-contract production test.

## Proposed repair

- Compare the A46 equipment fixture with the exact A46 Git blob, rather than today’s equipment file.
- Remove the stale current-data hash assertion from the historical fixture test.
- In the actual-current test, call `readDmg175CurrentSourceInputs` and `assertDmg175CurrentSourceCohort`, then separately assert the exact 24-row prior UA context subcohort with `assertUaSourceContextBindingCohort`.
- Preserve the existing literal 29 proof checks and update current manual/canonical/metadata denominators to the active source state. The existing helpers validate 1,014 owners, 4,931 canonical bindings, 226 canonical additions, 930 manual declarations, and the exact 123 current manual additions without using the sealed old current-data helper.

## Validation and pins

- Proposed patch applies cleanly with `patch --dry-run -p1`.
- Isolated proposed test run: **5 passed, 0 failed**. It ran from `/tmp/dmg225-current-proof-test-repair-v1/` with symlinked read-only inputs; the repository test file was not edited.
- Original target test source SHA-256 (unchanged): `4cd765a20bc9fb03f5aa0f1fc6630e827d5409c1984f84607aa2ab523347e73e`.
- Proposed patch SHA-256: `7892c1e0e1d4b5cfe8f7c2c9b4af0b9c741e720f65d13217b153cf5b6a9d40a9`.
- Current data SHA-256: `fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d`.
- Current canonical inventory SHA-256: `678e1bd62bedc4523b21958825e4d9a205eaa333521ce28ebc506d3983ba96b8`.
- Current manual binding ledger SHA-256: `fe02ce08ca28136b128741a61933f704f161c4860c9ee398c51016d158bb7a3d`.
- Active source-review and continuation manifests: `e38706656b35c2a3a8731728863d89e5d4ab46c499c2b40f791d2dc6b0a9a022` and `f1bfc6cffbfdd625e96bb5398e7f8db16730264a7f46ce4bcc7667ca2ef24cc7`.
- The historical old helper remains unchanged at SHA-256 `a0d307bc81013e06713ecd23a1066dcf9c2a47714a1a1293dc5cafa4138fa32f`.

Private before/after focused logs are under `/workspace/vault-audit-private/pass8/root/dmg225-current-proof-test-repair-v1/`. The recorded full-suite log also has a separate `monetary successor changes provenance only...` failure in `tests/pass8-citation-target-crop-history.test.mjs`; that case is outside this one-file repair proposal and remains unresolved here.
