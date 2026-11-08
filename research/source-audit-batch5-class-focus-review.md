# Batch 5 class fact-focus review

Assigned source check for all 50 entries in the pending class-focus proposal. Catalog focuses are applied in 11 class catalog region usages. This report records the assigned source review; it is not an independent review. No product field values, field-region bindings, or shared review ledger were changed.

Input commit: 679b15d1c580172e54314829c1c3c86dc78b65f3
Proposal SHA-256: b1ff3be2b72f31a0d6956f3f803654552d7a029805ec9dade1b00c382fd1f5f8
Original PHB source SHA-256: e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095

## Results

All 50 fact-focus proposals were confirmed and applied at the catalog level: 49 class proficiency progression facts and one Assassin scroll-reading fact. Each p.37 focus marks the target class name, its initial weapon count, and the “1/N levels” rate. The complete table title, column headings, all class rows, and the separate Added Proficiency paragraph remain available as context. The non-proficiency penalty cell is not highlighted.

The Assassin candidates needed correction. PHB p.19 footnote directly states that thieves gain scroll reading at 10th level and assassins at 12th, including the spell-user classes. The nearby class limit table is retained as lookup context. The proposed p.27 “scroll-reading table” is actually the thief primary and secondary function passage and excludes the later additional abilities section. The p.29 candidate shows poison and attack prose. Those two candidates were rejected as direct fact targets and retained as context.

## Progression rows

| Class | Region | Starting weapons | Added rate | Proposed events |
|---|---|---:|---|---|
| cleric | phb-37-947ed4b02bc5aed3 | 2 | 1/4 levels | L5, L9, L13, L17, L21, L25, L29 |
| druid | phb-37-1e3e2abf64aba374 | 2 | 1/5 levels | L6, L11 |
| fighter | phb-37-f700eca9387736c6 | 4 | 1/3 levels | L4, L7, L10, L13, L16, L19 |
| paladin | phb-37-9106ad0ba141326d | 3 | 1/3 levels | L4, L7, L10, L13, L16, L19 |
| ranger | phb-37-0119fdbdadda1bfc | 3 | 1/3 levels | L4, L7, L10, L13, L16, L19 |
| magic-user | phb-37-9c3d841088eb857a | 1 | 1/6 levels | L7, L13, L19 |
| illusionist | phb-37-1b62533798f9d154 | 1 | 1/6 levels | L7, L13, L19 |
| thief | phb-37-b8e9b30fddb28ae1 | 2 | 1/4 levels | L5, L9, L13, L17 |
| assassin | phb-37-911fe149fbfab8dd | 3 | 1/4 levels | L5, L9, L13, L17 |
| monk | phb-37-e9ab4e8854da5c1b | 1 | 1/2 levels | L3, L5, L7, L9, L11, L13, L15, L17 |

Every listed event level and transition matches the class row’s starting count and rate, using the PHB note’s levels-above-first convention. The JSON records the exact transition check for each of the 49 fields. This check does not change or independently verify other class fields.

## Complete class baseline and remainder

The pre-change snapshot in source-audit-batch5-class-focus-baseline.json inventories all 16 class catalogs, 160 region usages, 71 unique region IDs, all catalog focus properties, and all 1,807 current class evidence bindings. Before changes, every class region usage had the full-image sentinel; every class evidence binding was pending with no region IDs or region evidence.

After the 11 focuses, 11 of 160 class region usages have precise focus rectangles and 149 still have full-image sentinels. All 1,807 class field evidence bindings remain pending and unlinked. The 50 proposals are part of that queue; the remaining 1,757 unproposed bindings are enumerated by class in the JSON. This describes the full current class evidence-binding universe, not complete source verification of class mechanics.

## Source comparison and limitations

The authorized PHB sixth-printing PDF was rendered at 150 dpi. Original page pixels for printed pp.19, 27, 29, and 37 were cropped using the catalog normalized page rectangles and visually compared with catalog crops. Crop dimensions and hashes are in the JSON. The p.19 sentence does not establish the 25% misunderstanding chance, excluded scroll types, or all Assassin/thief mechanics.

The 149 remaining full-image class catalog regions, including context-only table and passage images, remain unresolved under the existing sentinel policy. No whole-image exceptions were added.

## Root ledger handoff

/workspace/scratch/batch5-class-focus/proposed-review-ledger-updates.json contains 11 exact hash bundles for the changed sourceExcerpts usages. It contains no review assessment or independent-review claim. Root should inspect the final focus and source crop before authoring ledger assessments.

## Per-proposal disposition

| # | Class field | Focus region | Review | Application | Field binding |
|---:|---|---|---|---|---|
| 1 | assassin /levelChanges/35 | phb-19-00ed6d9c8e0545a0 | confirmed | applied | unchanged; pending |
| 2 | cleric /levelChanges/9 | phb-37-947ed4b02bc5aed3 | confirmed | applied | unchanged; pending |
| 3 | cleric /levelChanges/21 | phb-37-947ed4b02bc5aed3 | confirmed | applied | unchanged; pending |
| 4 | cleric /levelChanges/29 | phb-37-947ed4b02bc5aed3 | confirmed | applied | unchanged; pending |
| 5 | cleric /levelChanges/36 | phb-37-947ed4b02bc5aed3 | confirmed | applied | unchanged; pending |
| 6 | cleric /levelChanges/42 | phb-37-947ed4b02bc5aed3 | confirmed | applied | unchanged; pending |
| 7 | cleric /levelChanges/49 | phb-37-947ed4b02bc5aed3 | confirmed | applied | unchanged; pending |
| 8 | cleric /levelChanges/58 | phb-37-947ed4b02bc5aed3 | confirmed | applied | unchanged; pending |
| 9 | druid /levelChanges/13 | phb-37-1e3e2abf64aba374 | confirmed | applied | unchanged; pending |
| 10 | druid /levelChanges/29 | phb-37-1e3e2abf64aba374 | confirmed | applied | unchanged; pending |
| 11 | fighter /levelChanges/5 | phb-37-f700eca9387736c6 | confirmed | applied | unchanged; pending |
| 12 | fighter /levelChanges/13 | phb-37-f700eca9387736c6 | confirmed | applied | unchanged; pending |
| 13 | fighter /levelChanges/21 | phb-37-f700eca9387736c6 | confirmed | applied | unchanged; pending |
| 14 | fighter /levelChanges/28 | phb-37-f700eca9387736c6 | confirmed | applied | unchanged; pending |
| 15 | fighter /levelChanges/36 | phb-37-f700eca9387736c6 | confirmed | applied | unchanged; pending |
| 16 | fighter /levelChanges/42 | phb-37-f700eca9387736c6 | confirmed | applied | unchanged; pending |
| 17 | paladin /levelChanges/10 | phb-37-9106ad0ba141326d | confirmed | applied | unchanged; pending |
| 18 | paladin /levelChanges/24 | phb-37-9106ad0ba141326d | confirmed | applied | unchanged; pending |
| 19 | paladin /levelChanges/36 | phb-37-9106ad0ba141326d | confirmed | applied | unchanged; pending |
| 20 | paladin /levelChanges/49 | phb-37-9106ad0ba141326d | confirmed | applied | unchanged; pending |
| 21 | paladin /levelChanges/61 | phb-37-9106ad0ba141326d | confirmed | applied | unchanged; pending |
| 22 | paladin /levelChanges/72 | phb-37-9106ad0ba141326d | confirmed | applied | unchanged; pending |
| 23 | ranger /levelChanges/10 | phb-37-0119fdbdadda1bfc | confirmed | applied | unchanged; pending |
| 24 | ranger /levelChanges/24 | phb-37-0119fdbdadda1bfc | confirmed | applied | unchanged; pending |
| 25 | ranger /levelChanges/41 | phb-37-0119fdbdadda1bfc | confirmed | applied | unchanged; pending |
| 26 | ranger /levelChanges/50 | phb-37-0119fdbdadda1bfc | confirmed | applied | unchanged; pending |
| 27 | ranger /levelChanges/58 | phb-37-0119fdbdadda1bfc | confirmed | applied | unchanged; pending |
| 28 | ranger /levelChanges/64 | phb-37-0119fdbdadda1bfc | confirmed | applied | unchanged; pending |
| 29 | magic-user /levelChanges/7 | phb-37-9c3d841088eb857a | confirmed | applied | unchanged; pending |
| 30 | magic-user /levelChanges/21 | phb-37-9c3d841088eb857a | confirmed | applied | unchanged; pending |
| 31 | magic-user /levelChanges/28 | phb-37-9c3d841088eb857a | confirmed | applied | unchanged; pending |
| 32 | illusionist /levelChanges/11 | phb-37-1b62533798f9d154 | confirmed | applied | unchanged; pending |
| 33 | illusionist /levelChanges/21 | phb-37-1b62533798f9d154 | confirmed | applied | unchanged; pending |
| 34 | illusionist /levelChanges/28 | phb-37-1b62533798f9d154 | confirmed | applied | unchanged; pending |
| 35 | thief /levelChanges/11 | phb-37-b8e9b30fddb28ae1 | confirmed | applied | unchanged; pending |
| 36 | thief /levelChanges/22 | phb-37-b8e9b30fddb28ae1 | confirmed | applied | unchanged; pending |
| 37 | thief /levelChanges/34 | phb-37-b8e9b30fddb28ae1 | confirmed | applied | unchanged; pending |
| 38 | thief /levelChanges/43 | phb-37-b8e9b30fddb28ae1 | confirmed | applied | unchanged; pending |
| 39 | assassin /levelChanges/11 | phb-37-911fe149fbfab8dd | confirmed | applied | unchanged; pending |
| 40 | assassin /levelChanges/27 | phb-37-911fe149fbfab8dd | confirmed | applied | unchanged; pending |
| 41 | assassin /levelChanges/44 | phb-37-911fe149fbfab8dd | confirmed | applied | unchanged; pending |
| 42 | assassin /levelChanges/50 | phb-37-911fe149fbfab8dd | confirmed | applied | unchanged; pending |
| 43 | monk /levelChanges/8 | phb-37-e9ab4e8854da5c1b | confirmed | applied | unchanged; pending |
| 44 | monk /levelChanges/21 | phb-37-e9ab4e8854da5c1b | confirmed | applied | unchanged; pending |
| 45 | monk /levelChanges/36 | phb-37-e9ab4e8854da5c1b | confirmed | applied | unchanged; pending |
| 46 | monk /levelChanges/57 | phb-37-e9ab4e8854da5c1b | confirmed | applied | unchanged; pending |
| 47 | monk /levelChanges/83 | phb-37-e9ab4e8854da5c1b | confirmed | applied | unchanged; pending |
| 48 | monk /levelChanges/110 | phb-37-e9ab4e8854da5c1b | confirmed | applied | unchanged; pending |
| 49 | monk /levelChanges/134 | phb-37-e9ab4e8854da5c1b | confirmed | applied | unchanged; pending |
| 50 | monk /levelChanges/160 | phb-37-e9ab4e8854da5c1b | confirmed | applied | unchanged; pending |


At final inspection, the shared review ledger contained 11 pre-change hash-only records for the changed regions. Their focus hashes are stale (and the Assassin footnote content hash also changed); no assessment was added. The root-owned independent review can replace them using the current scratch hash bundles.
