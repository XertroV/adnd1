# Independent review: Appendix C rule-note search projection

**Disposition: candidate is sound for bounded post-release integration, with the duplicate-text behavior below documented.** The source, active `dist/search.js`, candidate data, and replay all match the hashes carried by the frozen artifacts. I found no source-data mutation, owner addition, score/rank change in the historical 12-query corpus, or scope leak in the candidate.

## Frozen inputs and universe

Reviewed `/workspace/adnd1-next-source-native` at HEAD `987a25d3ba2dcac0940569a2afab73f775e38028`. The active runtime search file is SHA-256 `3c21b3e72b9ec5e4e0df004dc45fe1118313a50d3cd88b0a90eb0f22aeb8cd9d`; the candidate is `3a82651aa36e36a0a0697b91f6ce5db31350911ce1aa858e59fb91f2b40c66da`. The frozen data hash is `fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d`. The supplied inventory hash is `dd550c1adb5312444c205b3d064e5581f39f74682531cc321f308b7d3468708a`.

I rebuilt the production app index projection in memory from the current `dist/data.json` and `dist/books.js`, then called the actual frozen `dist/search.js` and the candidate's actual search module in an isolated JS context. The production owner universe is 1,014 unique records: 638 spells, 163 rules, 192 equipment, 16 classes, four matrices, and one progression explainer. There are nine owners with nonempty notes and 18 string note values: five Appendix C rule-note strings plus 13 matrix-note strings. The progression explainer has no `notes` property and is correctly outside that 9-owner count. I regenerated every nonempty note row and compared its owner, pointer, note hash, normalized length, own-document phrase presence, and full-note score against all 18 archived inventory rows; the 18/18 rows and 9/9 owner count match with no field discrepancies.

The current rule-note set exactly matches `research/source-audit-pass8-dmg175-excluded-note-field-count-qualification-v1.json`. That qualification supersedes the earlier informal three-note count while preserving the frozen older receipts: five top-level rule-note fields exist, the formal mechanics enumerator remains limited to summaries/bullets, its recorded field delta is unchanged, and source-value grade changes are zero. This search projection does not alter those enumerator or source-review states.

## Replay findings

Each of the five full-note queries had no match in the current frozen production search and now finds its owner at relevance score 5. Each complete normalized note occurs once in its own prepared search body. The control cases passed: a string note and an array of strings on a rule record are indexed; object-valued note entries, future review fields, and notes on a class record remain unindexed.

All 12 queries in the preserved `tests/fixtures/search-ranking-before-ae5195a.json` corpus were replayed against the current 1,014-owner index with the current production search ordering. Before and candidate result counts, owner order, scores, and visible top-18 lists were identical for all 12 queries. Candidate and before indexes contain the same 1,014 distinct `(view,id)` owners in the same order. The only changed prepared search bodies are the five target rule owners; no source data bytes or field values were changed; a before/after JSON-value hash around both in-memory index preparations is also identical.

The two magic-table notes are identical in the existing source data (same note SHA-256). Consequently the full-note query for either table returns both `appendix-c-magic-table-ii` and `appendix-c-magic-table-iii`. These are two distinct existing rule owners, not a duplicate owner or repeated copy within either prepared body. The draft regression test records this explicitly so the expected two-owner result is not mistaken for accidental duplicate indexing.

The fighter-matrix I.B whole-note query remains unfindable in both versions: the existing query parser combines adjacent single-letter tokens into `ib`, while the indexed note contains separate `i` and `b` words. This is the separately identified normalization issue and is not changed by the bounded candidate.

The candidate source diff from the frozen runtime is exactly two code changes: a `_view === 'rules'` note projector that admits only strings or arrays of strings, and one call to that projector in the search body. It neither changes existing rule content nor indexes arbitrary review/provenance fields.

## Proposed follow-up

`proposed-search-and-test.patch` contains the exact candidate implementation plus a small regression test covering the five reviewed note hashes, full-note discovery, one-copy-per-owner indexing, the two distinct owners sharing identical text, and negative scope/type controls. The patch is a review artifact only; no app, test, or Git files in the worktree were edited.

`production-replay-v1.json` contains hashes, counts, per-note outcomes, every golden-corpus before/after comparison, controls, and the I.B diagnostic. `replay-v1.mjs` reruns that in-memory replay against the same frozen worktree. Browser and global test suites were not run because this task is a read-only search-core review and the release assets are frozen.
