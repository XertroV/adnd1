# Mechanics audit progress

Snapshot of **1000 records / 13,946 tracked mechanics fields**.

**91.3% source-checked**; **95.5% inspected**. Inspection includes pending corrections and editorial review. Neither percentage measures whole-book coverage or implies every rule is complete.

| Collection | Fields | Source-checked | Corrections pending | Unchecked |
| --- | ---: | ---: | ---: | ---: |
| spells | 8117 | 7858 | 0 | 0 |
| equipment | 1179 | 976 | 0 | 124 |
| rules | 688 | 664 | 0 | 1 |
| classes | 3175 | 2952 | 0 | 0 |
| matrices | 778 | 276 | 0 | 494 |
| progressionExplainer | 9 | 7 | 0 | 0 |

Other dispositions: 14 unextracted fields; 22 explicit field-level source conflicts; 558 editorial/advisory fields reviewed separately. Additional unresolved qualifications are retained in the per-record notes.

The [full field log](mechanics-audit-progress.json) preserves values, checkers, source pages/file hashes, pending old/new corrections and unchecked work. See the [log guide](README.md) for definitions and regeneration.

Assembled-data SHA-256: `2dfeeaaf04dc9467d8a112b3c0e46a33426180be775f116fa2c479c94440e578`.

This is a saved checkpoint, not a live estimate. Run `node tools/mechanics-audit.mjs --check` to verify it.
