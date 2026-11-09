# Mechanics audit progress

Snapshot of **1001 records / 13,993 tracked mechanics fields**.

**91% source-checked**; **95.18% inspected**. Inspection includes pending corrections and editorial review. Neither percentage measures whole-book coverage or implies every rule is complete.

| Collection | Fields | Source-checked | Corrections pending | Unchecked |
| --- | ---: | ---: | ---: | ---: |
| spells | 8134 | 7858 | 0 | 17 |
| equipment | 1179 | 976 | 0 | 124 |
| rules | 694 | 664 | 0 | 7 |
| classes | 3199 | 2952 | 0 | 24 |
| matrices | 778 | 276 | 0 | 494 |
| progressionExplainer | 9 | 7 | 0 | 0 |

Other dispositions: 14 unextracted fields; 22 explicit field-level source conflicts; 558 editorial/advisory fields reviewed separately. Additional unresolved qualifications are retained in the per-record notes.

The [full field log](mechanics-audit-progress.json) preserves values, checkers, source pages/file hashes, pending old/new corrections and unchecked work. See the [log guide](README.md) for definitions and regeneration.

Assembled-data SHA-256: `f923fa58373d6d46be0444bb1d6ffb1f2d4ae41b58d003f6b8abaac2b283ff96`.

This is a saved checkpoint, not a live estimate. Run `node tools/mechanics-audit.mjs --check` to verify it.
