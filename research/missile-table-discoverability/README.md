# Missile tables and continuation citation review

This is a source-first, research-only package pinned to Git `236818f2026f61eb0cb696ffb0ea9ff166a491ff`. It makes no changes to active rules, equipment, citations, grades, metadata, or the continuation producer.

The PHB p.38 and UA p.28 pixels show two separate, complete tables. PHB p.38 has 15 physical rows and AC columns 2–10. UA p.28 has the same 15 common rows plus nine UA rows, AC columns 0–10, and an Aklys `1*` footnote that specifies 10 feet only. The 15 shared rows have the same rate/range cells and matching overlapping AC 2–10 cells; UA adds AC 0 and 1. Both tables print the turn/round and short/medium/long range notes. Keep the editions separate and do not infer the PHB p.39 range scale from the labels.

Both complete table images already exist in `dist/scans/verified/` and appear in equipment citations. The search index has no standalone table record: “hurled weapons” currently returns 17 global hits headed by the UA specialization rule; “hurled weapons and missiles” returns only that rule; both armor/armour query variants and “bow leather plate” return no current hit. Extraction is partial: PHB equipment holds fire-rate/range values for 4/15 rows and no missile-table AC arrays; UA equipment has AC arrays for 21/24 rows (17 generic and four ammunition-specific), fire-rate fields for 9/24, and range fields for 10/24. Hammer, Harpoon, and Javelin do not have UA AC arrays. The existing bow AC arrays are explicitly sourced to UA p.28.

The proposal is two separately titled, source-specific typed rule-table documents, each pointing directly to its own existing full-table PNG. Their row-value transcriptions and row/footnote foci are deliberately not supplied or graded here; those require exact cell transcription and independent overlay review before activation. The synthetic search fixture checks only whether the proposed titles and aliases rank in the current search engine.

The current DMG p.28 armor note is present in the rule summary, including its monster exceptions, but its rules catalog contains only the bottom-left opening crop. Pixels confirm that the sentence continues at top-right. A bounded top-right crop was rendered privately and reviewed for edge completeness; `dmg28-continuation-proposal.json` records its hash, crop/focus geometry, and proposed ordered opening/continuation group. Preserve the old image and region ID and append the new continuation; keep prior review evidence in history.

The generic continuation baseline was generated across the whole exposed catalog and property universe, not just these two examples. It retains every source page and all missing/invalid coordinate cases. It identifies the DMG p.28 same-page candidate and PHB p.99 Demi-Shadow Magic positive control. There are 190 source-page flow candidates and 1411 region assessments with no implemented signal; those are discovery counts, not confirmed defects or semantic passes. The current reviewed frame bridge does not include DMG p.28, PHB p.99, PHB p.38, or UA p.28. Heuristic negatives remain unknown.

## Evidence and reproduction

- `source-inventory.json` pins the exact source PDFs, page images, physical rows/columns/notes, current extraction coverage, and selected pixel-checked examples.
- `table-record-proposal.json` defines separate rule-record IDs, columns, search vocabulary, and citation/focus requirements. It leaves cell transcription pending.
- `dmg28-continuation-proposal.json` records the source-confirmed DMG same-page continuation and a new private crop; existing catalog assets remain unchanged.
- `continuation-candidate-full-236818f.json.gz` and its JSON/Markdown summaries preserve the generic full-universe detector output, with a separate source-frame and false-positive inventory.
- `global-search-regression.mjs` rebuilds the actual global index collection order from `dist/app.js`, then uses `dist/search.js` scoring over all exposed collections. Run `node research/missile-table-discoverability/global-search-regression.mjs`.
- `synthetic-ui-smoke.cjs` injects candidate data and a temporary catalog only in the browser. Run it with the repository `dist/` server at port 8766 and the bundled Playwright/Chromium environment. It passed 18 checks across 1440×1000 desktop and 390×844 mobile for direct routes, both source chips, ranking, and “Show all”. This is route plumbing evidence only; the synthetic focus-free catalogs are not citation review.
- The parent’s actual-live current-site browser baseline is preserved privately at `/workspace/vault-audit-private/pass8/root/missile-table-discoverability/live-before.json` (SHA-256 `5a750f3085037d46dab0f1dd534fe21b9f2ae4d8b34ab4fb863010f31e99dced`). It records desktop/mobile current baseline and the 17-hit/one-hit/no-hit query results.

## Review scope and remaining work

Source pixels were visually checked for PHB p.38, UA p.28, DMG p.28, and PHB p.99. The exact private PDFs are hash-pinned in the JSON artifacts; rendered full pages and the candidate DMG crop remain under `/workspace/vault-audit-private/pass8/missile-table-discoverability/` and are not published here.

Passed: source-page table boundary/row inventory; current global-search baseline reproduction; synthetic candidate ranking; synthetic desktop/mobile route and show-all smoke; generic continuation discovery over the complete exposed catalog universe; pixel confirmation that DMG p.28 is a same-page continuation and PHB p.99 is a positive control.

Not run: active data/catalog changes; structured table-cell transcription; all-row focus overlays for PHB/UA; independent final review of the proposed rule records, hashes, foci, and page groups; integration/full-site test suite; assembly, publishing, commit, or push. The package is ready for root review before any mutation on the separate implementation branch.
