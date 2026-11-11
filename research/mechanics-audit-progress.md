# Mechanics audit progress

Snapshot of **1070 records / 14,241 tracked mechanics fields**.

**89.24% source-checked**; **93.35% inspected**. Inspection includes pending corrections and editorial review. Neither percentage measures whole-book coverage or implies every rule is complete.

| Collection | Fields | Source-checked | Corrections pending | Unchecked |
| --- | ---: | ---: | ---: | ---: |
| spells | 8150 | 7833 | 0 | 58 |
| equipment | 1182 | 976 | 0 | 127 |
| rules | 881 | 664 | 0 | 194 |
| classes | 3241 | 2952 | 0 | 66 |
| matrices | 778 | 276 | 0 | 494 |
| progressionExplainer | 9 | 7 | 0 | 0 |

Other dispositions: 14 unextracted fields; 22 explicit field-level source conflicts; 558 editorial/advisory fields reviewed separately. Additional unresolved qualifications are retained in the per-record notes.

The [full field log](mechanics-audit-progress.json) preserves values, checkers, source pages/file hashes, pending old/new corrections and unchecked work. See the [log guide](README.md) for definitions and regeneration.

Assembled-data SHA-256: `abb0be1209951d4610bdc663f77ee36107ce6c2fb50333c7ded0aa3937c292ac`.

This is a saved checkpoint, not a live estimate. Run `node tools/mechanics-audit.mjs --check` to verify it.
