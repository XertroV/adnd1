# Mechanics audit progress

Snapshot of **1003 records / 13,995 tracked mechanics fields**.

**90.98% source-checked**; **95.17% inspected**. Inspection includes pending corrections and editorial review. Neither percentage measures whole-book coverage or implies every rule is complete.

| Collection | Fields | Source-checked | Corrections pending | Unchecked |
| --- | ---: | ---: | ---: | ---: |
| spells | 8134 | 7858 | 0 | 17 |
| equipment | 1179 | 976 | 0 | 124 |
| rules | 696 | 664 | 0 | 9 |
| classes | 3199 | 2952 | 0 | 24 |
| matrices | 778 | 276 | 0 | 494 |
| progressionExplainer | 9 | 7 | 0 | 0 |

Other dispositions: 14 unextracted fields; 22 explicit field-level source conflicts; 558 editorial/advisory fields reviewed separately. Additional unresolved qualifications are retained in the per-record notes.

The [full field log](mechanics-audit-progress.json) preserves values, checkers, source pages/file hashes, pending old/new corrections and unchecked work. See the [log guide](README.md) for definitions and regeneration.

Assembled-data SHA-256: `84d7d81a0092a3fb4378ef5f8133d6fecdab968c9c63a353e99b1b9e2cc070be`.

This is a saved checkpoint, not a live estimate. Run `node tools/mechanics-audit.mjs --check` to verify it.
