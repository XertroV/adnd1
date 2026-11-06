# Mechanics audit progress

Snapshot of **892 records / 12,104 tracked mechanics fields**.

**53.35% source-checked**; **58.92% inspected**. Inspection includes pending corrections and editorial review. Neither percentage measures whole-book coverage or implies every rule is complete.

| Collection | Fields | Source-checked | Corrections pending | Unchecked |
| --- | ---: | ---: | ---: | ---: |
| spells | 8060 | 5311 | 187 | 2542 |
| equipment | 462 | 360 | 0 | 98 |
| rules | 509 | 485 | 1 | 0 |
| classes | 2783 | 162 | 313 | 2308 |
| matrices | 281 | 134 | 141 | 5 |
| progressionExplainer | 9 | 6 | 0 | 3 |

Other dispositions: 20 unextracted fields; 4 explicit field-level source conflicts; 24 editorial/advisory fields reviewed separately. Additional unresolved qualifications are retained in the per-record notes.

The [full field log](mechanics-audit-progress.json) preserves values, checkers, source pages/file hashes, pending old/new corrections and unchecked work. See the [log guide](README.md) for definitions and regeneration.

Assembled-data SHA-256: `1858594b457b91d48b7e55d71931e5bd9d2acf45c53045044493f05002b45bb4`.

This is a saved checkpoint, not a live estimate. Run `node tools/mechanics-audit.mjs --check` to verify it.
