# MM treasure source payload: independent review

**Disposition:** The bounded source content and crop set pass after the p.74 repair. The source work is **not cleared for publication**: required successor-metadata/workflow migration remains pending, and the saved browser pass predates the repaired p.74 asset. This review assigns no formal field-target, value, context, or default-selection grades.

## What passed

I compared the 26 A–Z table rows and all 208 literal cells with the independent physical transcription receipt; every cell matched. The table crop is pixel-identical to a fresh render of printed p.105 / PDF p.106 and contains the Appendix/table headings, labels, all coin-unit scales, wrapped text, and every row. Copper, silver, electrum, and gold retain the printed “1,000’s” headers; platinum retains “100’s.” J–N keep their literal “pieces per individual” quantities. They are not scaled or parsed into numeric values. Prior complete-array overlay evidence reports 26/26 row-focus matches; the table catalog, image, and focus geometry were unchanged by the later p.74 repair.

The ten use claims remain bounded to the three governing paragraphs on printed p.5. Their distinctions remain intact: lair chance versus table-category chance; individual versus lair-only treasure; a lair encounter versus treasure gained by defeating a creature; category rolls that can produce no wealth; mean-number and profile-specific adjustment; the general warning against applying Treasure Types to dungeon-guarded treasure; and parenthesized X 10 versus Type X. The four profile examples remain examples only.

I freshly rendered the six other current source images from the authorized original PDF in memory and compared their RGB pixels. The p.5 prose crops, p.14 Centaur, p.31 Dragon, p.100 Whale, and p.105 table all matched pixel-for-pixel. Visual inspection found no clipped glyphs or cut neighboring rows in those six crops.

## p.74 defect and repair

The previous p.74 crop is rejected. Its actual image clipped the neighboring “% IN LAIR” and “NO. OF ATTACKS” rows at its top and bottom; the preserved detector record lists eight text-box crossings. The cited treasure line itself was complete, so the source fact was not transcribed incorrectly, but the crop violated the no-clipped-glyph/context rule. The failing crop, region, and detector case are preserved under `research/mm-treasure-source-batch-v1/before-mm74-*`.

The committed replacement keeps region ID `mm-074-parenthetical-x10-and-type-x`, expands to a bounded Nymph stat block, and includes the full neighboring lines. I compared it with a fresh PDF render at `[282,184,399,358]` points, 216 dpi: pixels match exactly. The page-space focus is unchanged at `[287.649999966,257.260015866,93.335620105,9.524310306]` and still selects only `TREASURE TYPE: Q (X 10), X`. This is a crop-only acceptance; no source/value/target/context grade was promoted.

## Scope and additive delta

The source-unit addendum joins 33 distinct frozen IDs: six definition/procedure units, the whole-table unit, and 26 row units. These are overlapping granularities, not 33 independently verified rules. The frozen MM inventory hash is unchanged, and full inventory completeness remains unproved. The additive locator correction places generic units 249 and 250 on printed p.5 / PDF p.6; broader units 235, 236, and 248 retain their p.5–p.6 scopes.

Read-only comparison against the M1 data found all 1,062 existing owners exact, the 211-rule prefix exact, and the old 1,251 manual declarations an exact prefix of the current 1,293. The only source-coverage metadata field changed is `rules.json#/sources/3/coverage`; its new wording acknowledges these two bounded MM references, retains the absent searchable profile-catalogue scope, and says coverage remains incomplete. The current source adds two rules and 42 manual declarations. All 42 remain `field-target-pending`, `not-assessed-by-field-target-review`, with no target-review object. The recorded delta adjudication reports 76 new canonical bindings (42 manual, 26 generated region helpers, eight page/context helpers), for 5,731 total from 5,655. I did not rerun the cohort/assembler suite after the p.74 evidence refresh.

## Remaining blockers

The source-batch README still says publication is pending a strict successor metadata migration and completion of the required workflow. The preserved local browser report references old `dist/data.json` and procedure-catalog hashes; the current repaired candidate has new hashes. That old pass is not proof for this final candidate. Run the required migration and fresh focused browser/runtime checks before publication. Formal field-target review, table context/default review, and whole-book profile-modifier completeness also remain pending or unassessed.

No full PDF or page raster was copied or created. Pixel comparisons used in-memory renders only. I did not change repository data, application files, tests, or Git state, and I did not run broad tests. See `evidence.json` for commit, hash, crop-bound, and denominator details.
