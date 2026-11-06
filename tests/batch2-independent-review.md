# Research batch 2 independent review

Reviewed 2026-11-06 in the isolated `research/scan-batch-2` worktree. This is a local research checkpoint, not a publication or merge approval. No application, equipment, spell, matrix, or viewer source files were edited by this reviewer.

## Result

No blocking discrepancy found in the reviewed batch. Independent data tests passed **7/7**. Independent integrated browser tests passed **153/153**, with **zero uncaught page errors** and **zero axe WCAG A/AA violations in four scans** at 320, 390, 491, and 1440 CSS pixels.

The batch contains eight equipment catalogs, **27 unique reviewed regions**, **28 item-specific catalog entries**, and **seven unchanged physical PNGs**. The UA missile-notes region is intentionally shared by Dagger and Hand Axe; it counts once as a unique region and twice as scoped entries. Prices are now present on 51 equipment entries and unextracted on 29.

## Equipment evidence

I inspected the actual supplied PNG pixels and compared all 20 new target rows, their text, and normalized focus rectangles with the proposed audit. The following selected facts agree:

| Item | Visible PHB purchase price | PHB weight in gp-weight | PHB speed | PHB damage S/M; L |
| --- | --- | --- | --- | --- |
| Battle Axe | 5 gp | 75 | 7 | 1–8; 1–8 |
| Hand or Throwing Axe | 1 gp | 50 | 4 | 1–6; 1–4 |
| Bardiche | 7 gp | 125 | 9 | 2–8; 3–12 |
| Bec de Corbin | 6 gp | 100 | 9 | 1–8; 1–6 |
| Bill-Guisarme | 6 gp | 150 | 10 | 2–8; 1–10 |
| Bo Stick | Not visible | 15 | 3 | 1–6; 1–3 |
| Club | Not visible | 30 | 4 | 1–6; 1–3 |

Purchase prices are PHB printed p.35, weight/damage p.37, and speed p.38. Hand Axe's UA printed p.28 row shows fire rate 1 and numeric range bands 1 / 2 / 3. Its timing qualification is retained; numeric bands do not establish an inches conversion. Bo Stick and Club purchase prices remain null and `unextracted`, rather than inferred from other evidence.

Battle Axe and Hand Axe displayed damage fields still cite **UA p.26**, whose pixels are unavailable in this batch. Those fields and their source statuses remain exactly OCR checked with visual verification pending. Matching PHB p.37 values appear only as PHB crop-caption evidence. No UA p.26 catalog region exists.

All seven PNG SHA-256 digests and dimensions match the v9 baseline. Catalogs contain no Library identifiers, private workspace paths, source PDFs, ZIPs, or handoff scripts. Full-PDF hashes remain explicitly `supplied-handoff`; I did not recompute them from full-PDF bytes or verify full pages/books.

## Spell citation review

I independently read actual Library OCR source passages for the 20 proposed UA spell lookups and checked the referenced PHB/DMG locations. These are **OCR-only contextual references**, not visual spell verification or new mechanics. The final integration adds 22 book/page pairs across those 20 cards.

Two precision findings were incorporated before testing:

- UA p.65 Mordenkainen's Disjunction names Dispel Magic without specifying a cleric version. PHB p.73 provides the Magic-user heading and points to the inherited cleric procedure on PHB p.47. Both lookup locations are now present, without changing the existing spell mechanics.
- UA p.57 Leomund's Secure Shelter explicitly calls Unseen Servant as well as Wizard Lock. PHB p.69 and p.72 are both justified references.

UA p.38 Spike Growth and p.40 Spike Stones compare attack chance to the caster attacking. DMG p.74 is labeled as cleric/druid matrix **lookup context**. No universal attack rule or new matrix cells are inferred from that reference. Three base spell locations already covered by the relevant cards' UA pages were not appended again. Existing class, spell-level, and source conflicts remain unchanged.

Pinned semantic comparisons confirm that all 638 spell entries are identical to v9 after excluding structured `references`. Rules, class data, and attack matrices are unchanged. The other 72 equipment entries and Dagger are also identical to their v9 semantic baseline.

## Integrated browser checks

The test uses actual app footers and field-source controls, not only a standalone viewer harness. It traversed all 28 scoped catalog records and checked displayed values, image dimensions, alt text, and focus-overlay geometry. It also checked:

- Eight item contexts stay separate while sharing image bytes; Hand Axe receives its own row rather than Dagger's row.
- UA p.26 field buttons remain scoped to that one page and offer the private PDF path with verified excerpts disabled.
- Hand Axe UA p.28 field buttons retain only their exact cited page and two relevant regions.
- Bo Stick and Club PHB p.35 have no unrelated price image; uncatalogued Light Crossbow gets no weapon excerpt.
- All displayed gear facts remain static and complete; source controls restore focus after Escape.
- Narrow price images fit; single-region selectors stay hidden, multi-region selectors remain usable, zoom and highlights work by touch, and actual-size wide tables pan by keyboard.
- The modal does not expand document width at the four tested sizes. Narrow screens require scrolling through the existing modal controls to reach the full table; zoom/pan remain available. Desktop and mobile screenshots were visually inspected.
- Wrong-item catalogs, external image paths, and out-of-bounds focus rectangles fail into the private PDF route before any PNG/external request.
- Late catalog and image responses cannot replace a newly selected item's image, checked values, or focus context.
- Observed app requests were same-origin GETs; there were no source-PDF uploads or ZIP requests.

The final browser run waits for completed viewport rerenders before asserting keyboard pan. Earlier harness failures came from assuming Bo/Club's first cited price page had an image, a nonexistent source-view selector, and testing pan during a scheduled resize rerender. These were corrected in the tests; no application fix was needed.

The viewer owner's separately reported suites passed 117 batch-specific checks, 71 existing Dagger checks, and 32 generated local-PDF fixture checks. Those counts are supporting team evidence, not additional independent executions by this reviewer. No broad legacy suite was repeated after the relevant independent checks passed.

## Deliverables and boundaries

- `tests/batch2-independent.test.mjs`: catalog integrity, source grade, prices, data preservation, and citation-only regression tests.
- `tests/fixtures/batch2-reviewed-rows.json`: sanitized expectations for the 20 pixel-reviewed rows; contains no private provenance.
- `tests/batch2-independent-browser.cjs`: actual app scoping, all catalog records, fallback, geometry, touch/keyboard, accessibility, malformed metadata, and race regressions.
- Ignored `test-results/batch2-independent-browser.json` and four viewport screenshots contain local test evidence.

Production remained clean at `6c646a6ccb35da7b4739ad30ef8eaaeae39f6d02` at the final read-only check. This reviewer performed no commit, push, deployment, merge, formal review, or external write. Full source PDFs remain unavailable for independent hash recomputation; spell pages and UA p.26 weapon damage remain visually unverified. No additional blocker remains within the local batch scope.
