# DMG p.175 availability projection V5 production-path test

This research-only test imports the actual `tools/dmg175-availability-projection.mjs` module. It reads the candidate `dist/data.json`, target-plan manifest, and 12 source catalogs once. It obtains the immutable baseline data and handoff directly from commit `386b08a4678ee033d6daabc0ffa2cc17265a7c1f` with `git show`, rather than reading another worktree or storing large snapshots.

The historical V1 and V2 production-module sources are retained byte-for-byte under `fixtures/`. At test time, a bounded adapter replaces only the V2 module’s single `../dist/books.js` import with the current worktree Books URL. V1 has no Books import. The tests reproduce the historical forged-region-ID and region-owner-swap acceptances, then confirm V5 rejects them.

The production module passes the positive 8-crop / 34-region / 120-pending-target check, six altered native-crop tuple negatives, three published-evidence negatives, canonical JSON object-key reordering, and exact preservation of the legacy monetary-source screen. The test is read-only and does not run full assembly or modify production files.

Run from the repository root:

```sh
node --test research/dmg175-current-content-projection-v5-production-test/dmg175-availability-projection-production-v5.test.mjs
```
