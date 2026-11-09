# Missile-table implementation candidate

This folder contains a research-only implementation candidate on the `ae7f02c6a5aac9ac8da1f7bc5cf5152e422fcd58` base. No active `rules`, citation override, source-continuation, or grade data has been changed. The candidate catalogs and records are not registered for source viewing or release.

## Table records

The candidate adds separate typed tables for PHB p.38/PDF39 and UA p.28/PDF29. The PHB table has 15 physical rows and AC columns 2–10. UA has 24 rows and AC columns 0–10: it adds nine rows and two lower AC columns. All 555 rate, range, and adjustment cells reconcile to the independent source-cell receipt at `research/missile-table-discoverability/root-source-cell-review-v1.json` (SHA-256 `7a9866ca04dbc71138b260ede3936ae4c99a8db10b685435c7ac424f1517f7c3`). All 15 shared rows agree across both tables at rate, ranges, and AC 2–10. The PHB and UA records remain separate and cite their own book and page.

UA keeps the Aklys `1*` range marker with its printed “10-foot range only, not 10 yards” footnote. The staff-sling range cell retains the source’s `3–6` en dash. Each table has its own printed rate/range notes. The optional “Armor Class column key” is an editorial note with PHB p.36 row references, separate from the printed notes and the UA footnote; it maps leather or padded armor to AC 8, plate mail to AC 3, and plate mail with shield to AC 2. It does not convert armor type adjustments into effective AC or mix in medium/long range modifiers.

The source row bindings use unique PHB/UA row IDs, owner-scoped `/table/rows/N` pointers, one matching source region per row, and exact page/PDF mappings. Three PHB p.36 armor-class region objects are copied byte-for-byte from the existing `rules:armor-class` catalog for the editorial key. Every new target remains `field-target-pending`; the records contain no active visual or value grade. The final focus overlays and source-note/armor-key bindings still need root’s independent exact-object review.

The “Source notes and Armor Class column key” section is rendered through additive `table.sourceNotesTitle`/`table.sourceNotes` support and indexed from the actual authored note text. Ordinary table output without source notes remains byte-identical to the captured renderer. The candidate search test uses the complete current app search-index collections and verifies direct ranking for “hurled weapons”, “hurled weapons and missiles”, “missile weapon versus armor/armour”, “bow leather plate”, and source-specific PHB 38 and UA 28 queries. A browser fixture checks desktop/mobile table routes, Show all, 15/24 rows, separate PHB36 notes, and the UA footnote.

## DMG p.28 citation

The candidate DMG catalog retains the original region and PNG, adds a separate precise opening focus, and appends a bounded top-right continuation crop. A pending two-segment group joins bottom-left opening → top-right continuation on printed p.28/PDF29. Existing rule text already records the unarmored-monster and natural-armor exceptions; this candidate repairs its cited extent without changing that text. The group and proposed `sourceExcerpts` override remain unregistered until the final image, focus, owner, and ordered-group review is complete.

## Before-state and review controls

`renderer-before.json` and `search-before.json` preserve the exact pre-addition renderer and search function. The original error case is preserved in `before-ua-column-alignment/`; it has 30 candidate cell mismatches and 39 undefined row targets according to the root’s independent negative-control record. The candidate now passes the 555-cell source receipt, unique row-target checks, owner/pointer checks, citation helper checks, and the official scan-catalog validator. The reconciliation report is still research evidence, not an active source grade.

The author’s `search-ranking.browser.mjs` replay stopped at the existing Cleric citation-owner assertion on line 175, before any new source-note assertion. The separate missile candidate browser test passed all 15 desktop/mobile checks. The focused Node suite passed 19/19 tests and `git diff --check` passed. Full integration, application assembly, release metadata, publication, commit, and push were not run.

`candidate-manifest.json` pins the source PDFs, exact table excerpts, DMG continuation crop, independent source-cell/negative-control inputs, candidate code, and tests. Pending row focus/source review, armor-key reuse review, DMG continuation group review, and root’s final artifact review are remaining gates.
