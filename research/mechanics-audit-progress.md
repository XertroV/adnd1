# Mechanics audit progress

Snapshot of **1064 records / 14,201 tracked mechanics fields**.

**89.49% source-checked**; **93.61% inspected**. Inspection includes pending corrections and editorial review. Neither percentage measures whole-book coverage or implies every rule is complete.

| Collection | Fields | Source-checked | Corrections pending | Unchecked |
| --- | ---: | ---: | ---: | ---: |
| spells | 8150 | 7833 | 0 | 58 |
| equipment | 1182 | 976 | 0 | 127 |
| rules | 862 | 664 | 0 | 175 |
| classes | 3220 | 2952 | 0 | 45 |
| matrices | 778 | 276 | 0 | 494 |
| progressionExplainer | 9 | 7 | 0 | 0 |

Other dispositions: 14 unextracted fields; 22 explicit field-level source conflicts; 558 editorial/advisory fields reviewed separately. Additional unresolved qualifications are retained in the per-record notes.

The [full field log](mechanics-audit-progress.json) preserves values, checkers, source pages/file hashes, pending old/new corrections and unchecked work. See the [log guide](README.md) for definitions and regeneration.

Assembled-data SHA-256: `2806614989460903361caa2463d42b5c4aba08fee7c7e6781c7b9adb8a9a2e73`.

This is a saved checkpoint, not a live estimate. Run `node tools/mechanics-audit.mjs --check` to verify it.
