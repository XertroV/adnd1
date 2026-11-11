# Independent review: exact A65 released XP no-op dispatch

## Artifact identity and scope

The packet patch SHA-256 is `b4ead309499e19166cb4a1255743355f5807796b9097cb5dfb90e17dafbda75c`; its manifest hash is `bce2ee5031f8c220d6e7b5e882d67f06c329de106e567bd48811fb4885cafa86`. The candidate source hash is `45a3b30033a596a307f755b93a9e3db949a311fed31dd60434356e5268cd7ba8`; its preserved before-source hash is `0da791259c585883e174ec4c0b4c286cbf4e26b43a2c5bf024c388cd951f1019`.

The source diff adds one `dist/data.json` object-digest branch after the existing exact DMG175 predecessor branch and before the preserved-owner fallback. The candidate patch also adds one focused test. No active repository file was edited during this review; no heavy tests or full suite were run.

## State proof and accepted interface

I independently read the A65 Git blob and parsed it. Its raw SHA-256 is `31c86654df9e3abb03a65466356a4e39d9364f93312ec48eebddb40fa91948e2`, and its order-sensitive `SHA256(JSON.stringify(parsed))` is `fac1edee2865650e938833bf1c30a6b456bb8122fe3ae0a79fe6c9ff8d4840d9`. Both match the closed XP projection fixture and the new branch. The proof artifact [a65-release-state-proof-v1.json](/workspace/research/mm-ci111-released-xp-noop-v2/evidence/a65-release-state-proof-v1.json), SHA-256 `a3b427680e0ed2ef09d09fb0b1fc2aede57f0d98df1e8091c8636b0a3d8a3212`, records reconstruction of the exact merged state, reversal to the A65 object, 17 exact released-record matches, 980 unchanged-record hashes, and all five DMG175 input path pairs.

The dispatch remains path and state specific. `normalizeOrDispatchOlderJson` first validates and clones caller JSON, asks the current MM/H/Version29 reader to qualify it, and enters this branch only on the exact unsupported-bridge-object error. It recognizes only `dist/data.json` with the A65 digest and returns it as an `olderLiteral`. The existing current-state predicate therefore returns `false`, and the unchanged XP owner kernel handles the released state. That kernel’s identity path requires all 17 released record hashes and exact released release metadata before returning the input object unchanged. Other unsupported objects continue through the existing preserved-owner matcher; no other DMG175 path gains a state.

The pre-fix evidence identifies the remaining CI failure as the second call on that exact released XP result. The fixed digest is derived from the complete A65 `dist/data.json` Git object, rather than from a partial record or caller-controlled source. The existing DMG175 before-state digest `00c7794…` remains in place ahead of the new A65 state.

## Focused test and remaining verification

The new test [mm-dmg175-released-xp-noop-v2.test.mjs](/workspace/research/mm-ci111-released-xp-noop-v2/tests/mm-dmg175-released-xp-noop-v2.test.mjs), SHA-256 `90b024cf13c59b75781b04b64177fd6313703242d662a8abbda0d51ee6aa8cba`, imports the proposed facade through the correct `../research/...` path and uses Node 24’s `import.meta.dirname`. It checks the A65 Git/fixture identity, current-to-released equality with the full A65 object, the same-instance second-call no-op, and seven existing current-data mutation negatives. Candidate, focused test, and derivation script all pass `node --check`.

The focused test and new branch have not been executed in the active checkout. The recorded prior five-module run reports the released-state no-op as its sole remaining failure; root reports the earlier reader/facade repairs passing their affected modules. The active worktree currently contains those earlier root-owned reader, facade, and portable-test changes; its `dist/data.json` hash remains `2ab84cfe…` and `dist/app.js` remains `f4381ff2…`. Root should install this narrow branch and focused test, run the six requested post-CI modules, assemble at the planned quiescent window, and require full CI before merge.
