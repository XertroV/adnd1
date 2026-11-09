# DMG 175 alias-audit production test successor

This research-only V2 test is the proposed CI successor for a reviewed integration of the V1 source-identity change. It uses the production API names `buildContinuationAliasReport` and `loadContinuationAliasReport`. By default it imports the live `tools/continuation-alias-audit.mjs`; set `DMG175_ALIAS_AUDIT_TARGET=candidate` only to preflight the V1 research implementation before applying it. The CI/default path is the live production module, not the V1 research module.

`continuation-alias-audit-before-v1.mjs` is a byte-for-byte copy of the pre-repair production tool, SHA-256 `8ecfbd80c303d6e9e1db505f930ed64d1a5a889e9ba513f483e06f32c4987911`. `frozen-before-adapter-v2.mjs` verifies that pin, then changes exactly two source strings in a temporary import copy: the relative `sourceRect` import is pointed at the current repository helper, and the repository root is supplied explicitly. It leaves the frozen source untouched and does not rewrite the original CLI guard. Because the temporary module is imported by the test runner, `process.argv[1]` does not name that module, so the preserved CLI guard remains inactive during import. The temp copy is removed after each callback.

The five checks cover (1) exact before-source identity and reproduction of the old forged-alias/mislabel control, (2) whole-live-report parity and the truthful zero-current-DMG175-alias result, (3) strict rejection of malformed supplemental regions, (4) exact ordinary-PDF alias row parity, and (5) distinct JPEG and canonical-PDF identity serialization. The fifth check uses an isolated test resolver adapter solely to exercise serialization; it is not a claim that the live catalogs contain a current DMG 175 alias. Actual malformed-region rejection uses the current `Books.resolveRegionSourceIdentity` implementation.

Run the candidate preflight with:

```sh
DMG175_ALIAS_AUDIT_TARGET=candidate node --test research/dmg175-continuation-alias-audit-v2/test-production-alias-v2.mjs
```

After an approved integration, run the same test without the environment variable. That path imports the active production module and also invokes its original `--check` CLI.
