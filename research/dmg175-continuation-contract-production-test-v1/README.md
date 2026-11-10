# D175 continuation contract production test

This read-only test exercises the actual `tools/continuation-contract.mjs` production API against the current 273-group, 540-segment continuation manifest and `dist/` catalogs. It obtains the frozen 271-group prefix from commit `386b08a4678ee033d6daabc0ffa2cc17265a7c1f` with `git show` and verifies that the current manifest preserves every group in order before appending the two D175 groups.

Focused cases cover the alias boundary: ordinary groups reject an own `focusAliasRegionIds` property even when its value is `undefined`, `null`, or empty; Character Levels rejects aliases; Party Magic retains exactly 12 p.175 aliases and one p.176 alias, with the p.175 supplemental JPEG identity kept separate from canonical PDF p.176. Reversed or missing parts and the stale clipped old-07fd opening tuple fail validation.

The production API validates all 273 groups and 540 present segments in under a second in the current workspace. Negative cases mutate only in-memory clones. The test does not modify the manifest, catalogs, images, tools, or existing tests.

Run from the repository root:

```sh
node --test research/dmg175-continuation-contract-production-test-v1/continuation-contract-production-v1.test.mjs
```

`proposed-ci-entry-v1.test.mjs` is the small entry file for the parent to copy into `tests/dmg175-continuation-contract-current.test.mjs` before the source commit.
