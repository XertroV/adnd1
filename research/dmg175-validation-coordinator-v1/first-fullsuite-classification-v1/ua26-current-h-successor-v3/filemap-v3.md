# V3 file map

- `proposed/tests/ua26-catalog-context.test.mjs` — proposed single-branch Caltrop pairing fix, copied from the root-installed V2 test.
- `preimage-v3.json` — current HEAD and SHA-256/size pins for the active V2 test and H-helper/fixture inputs used by the isolated replay.
- `patches/ua26-caltrop-live-check-v3.patch` — minimal patch for that one active test file; `git apply --check` passed against the current root-installed V2 test.
- `tools/run-root-layout-probes-v3.mjs` — stages isolated test inputs, first reproduces the V2 production-root history projection failure, then reruns the focused suite with the V3 proposed test.
- `validation/root-layout-probes-v3.json` — structured evidence with baseline hashes, V2 staging explanation, test output, and cleanup status.
- `before-projection-reproduction-v3.log` — exact failing baseline test output, including the projected and expected current hashes.
- `after-focused-probes-v3.log` — V3 root-layout focused output; 17 passed, 0 failed, including the fourth-transition negative.
- `proposed/tests/ua26-note-marker-correction.test.mjs` and `proposed/tests/ua26-note-marker-dmg175-v2.test.mjs` — unchanged copies used by the focused staged replay.

No active source, test, tool, workflow, metadata, Git, or seal files were edited for V3. The only candidate patch is the catalog-context test change described above. The full native-H tool/helper/fixture/mechanics inputs are copied or staged as required by the V2 production-root probe; all other unrelated inputs use path-addressed read-only symlinks.
