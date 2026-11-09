# UA source metadata phase: independent review

**Result:** accepted for the bounded source-metadata scope; current-worktree gates and the extracted step-23 report check pass. This review does not approve field values, numeric claims, mechanics, whole-book completeness, publication, or release.

The review pins the stable 42-file candidate manifest at SHA-256 `4e8605a1863446976a2d5be23408f8427a4edf651227386827af40dde11dfe08`. I recomputed every listed file hash and size; all matched. The source input is commit `6b3cfc8cb421a2c1fc2379c38abebe2075634981`, with `dist/data.json` SHA-256 `c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3` and mechanics progress SHA-256 `ca8d331e1e35c64c214bde313004c2d9a8ae19cdd6c5dd36fc644f061a426fd7`.

## Source metadata review

I compared the old records from `origin/master` with the current metadata inventories. The original 4,681 field-evidence bindings, 1,849 visual reviews, and 261 continuation groups remain in their original relative order. The current inventories add 24 UA class record-reference envelopes, 32 UA class image reviews, and 10 UA continuation groups.

The 24 new envelopes link source regions but leave `sourceValueStatus` as `not-assessed-by-field-target-review` and `targetReview` null. The 32 new image reviews record confirmed context, crop, highlight, and relevance assessments; 22 include a default assessment. The ten added continuation groups remain `segments-present-pending-deployment`. These records accept bounded metadata and context evidence without assigning a field/value grade.

Current inventory totals are 4,705 bindings, 1,881 visual reviews, 271 continuation groups, 3,509 region usages across 1,023 catalogs, and 536 continuation segments. The new geometry report has zero parser warnings, while still listing 2,185 sentinel usages and 366 candidate image bindings linked to 921 usages. The continuation report includes 269 missing or invalid crop geometries and two supplemental-image cases it cannot assess. Those are open review work: zero parser warnings do not imply semantic or highlight correctness.

## Current integration checks

The raster and continuation current-pointer gates are valid with zero errors. Source-frame/geometry validation, systemic structural validation, table validation, report consistency, and the monetary index check pass under their stated structural policies. The monetary check covers 1,871 source occurrences and 2,317 claims. The focused metadata suite passed 32 tests; I independently reran the exact handoff transition tests and got 4/4 passes. The binder’s four recorded invalid-input controls reject without writing their target.

The exact Druid Ceremony transition is narrowly qualified to the historical receipt and current source/mechanics inputs. It updates one historical caution disposition; the current `/exceptions/0` mechanics field remains unchecked and explicitly `NOT PROMOTED`. The ordinary handoff guard still rejects the old conflict receipt without that exact qualification.

The extracted Pages workflow step has an independent reproduction proof at `research/ua-source-metadata-v1/workflow-default-report-reproduction-proof-v1.json` (SHA-256 `e15dbe7075eff3d162a5d21e63fdc974c30d1bf7ef2214b0089069671102e47f`). It reruns the three official default report generators, compares their outputs byte-for-byte with the compressed frozen reports, then runs the default-path handoff `--check`. All comparisons passed; the check exited 0 with 12 reviewed transitions and 76 active cautions. This validates that narrow step, not the full Pages workflow or a release.

Source data and grades match commit `6b3cfc8` across all 18 checked source paths. The 1,450 existing citation seals are unchanged from that commit, with the prior 1,388-seal sequence preserved; this phase adds no seal. The official assembler exited 0, and the only generated data-file change is `dist/coverage-gaps.json`.

## Preserved limits

The monetary migration changes 1,439 canonical provenance entries and 10 source-validation hashes. Apart from those declared provenance/hash paths, all 1,871 occurrence payloads, 2,317 claim payloads, counts, and denominators remain exact. The question register preserves 7 unresolved questions and 1 derived adjudication; 2 scope findings cover 9 rows. UA body occurrences 1743 and 1745 remain unmapped and pending. No monetary or source-value grade was added, broad source review remains pending, and the Acrobat 1,000 gp observation is weight wording rather than a price.

The live report still shows 3,586 empty region targets and 3,948 field targets not reviewed. The UA source phase remains unpublished, and whole-book semantic completion remains zero. The current structural gates do not change those states.

## Principal evidence pins

- Stable input manifest: `research/ua-source-metadata-v1/metadata-review-inputs-v1.json` — `4e8605a1863446976a2d5be23408f8427a4edf651227386827af40dde11dfe08`
- Source preservation and current-gates proof: `research/ua-source-metadata-v1/current-gates-and-source-preservation-v1.json` — `09fcf83adad83da8e9faa86e717b994695cb4760ed24f094e14052ffba1aa07e`
- Workflow step-23 reproduction: `research/ua-source-metadata-v1/workflow-default-report-reproduction-proof-v1.json` — `e15dbe7075eff3d162a5d21e63fdc974c30d1bf7ef2214b0089069671102e47f`
- Geometry report: `research/source-visual-audit-ua-source-v1.json` — `90a62727d0c4892b007c121ea79b32a027b0ac25e7725afe27f98a90daa6fccd`
- Raster report: `research/source-raster-boundary-ua-source-v1.json.gz` — `61f1bb1124d25aeb4906333425fcddacf62a07539b3cd93578d942d1a35b3945`
- Continuation summary and full evidence: `research/source-audit-pass8-ua-source-continuation-v1.json` — `1449825ca788066d75d673cd1672c5d6748bd799ed703712b05c39f305da2014`; compressed full evidence — `1119279eebf467b98eac14d1289fd074cff953bfb8f4d1fb2cfd80e5500bbb5d`
- Monetary provenance migration: `research/ua-source-metadata-v1/monetary-provenance-migration-proof-v1.json` — `f23501876f6e8f6c26e9db8f4bfd80b258c30d3bb1edd192473baf00c9b5e4c7`
- Exact handoff transition receipt: `research/source-audit-pass8-ua-source-body-handoff-transition-v1.json` — `f79f4e38d79eff161748e683461b377508d2feff95f86833ba41853370025c05`

The companion JSON file carries the complete machine-readable scope, counts, limits, and evidence pins. Neither review file contains source images, private full-page scans, or browser pixels.
