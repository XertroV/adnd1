# Batch 5 class context repair

This is the source-context repair record for the 50 pending class fact-focus proposals. The preserved failing baseline is [source-audit-batch5-class-context-baseline.json](source-audit-batch5-class-context-baseline.json). No shared field ledger, manual field bindings, assembled data, or shared review ledger was changed. Current image/catalog hashes below need root review; approval for earlier hashes does not transfer.

## Scope and disposition

- 50 proposals: 50 confirmed by assigned source review, 50 catalog context/focus repairs applied, 0 rejected, and 0 source-content cases unresolved.
- All 50 changed current hashes await root independent review. The 49 p. 37 transition values were confirmed in the earlier source/value review; the current combined crop/foci are changed evidence and need review.
- The Assassin target now has complete evidence excerpts for PHB pp. 19, 27, and 29. The p. 27 and p. 29 crop/focus replacements are applied; the source-supported inference is recorded below.
- The current full universe remains 16 classes and 1807 source-field bindings; all remain `field-target-pending`, with zero field-level bindings changed. The six out-of-scope classes are named in the universe table.

## Shared PHB p. 37 excerpt

The replacement image is [`phb-37-weapons-proficiency-context-034b106d1a55aaa0.png`](../dist/scans/verified/phb-37-weapons-proficiency-context-034b106d1a55aaa0.png), SHA-256 `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1`, dimensions 1160 × 303. It comes from PHB printed p. 37 / PDF p. 38, source render 1215 × 1638, crop pixels `[42, 57, 1202, 360]` and normalized page bounds `{'x': 0.0345679012345679, 'y': 0.0347985347985348, 'width': 0.9547325102880658, 'height': 0.184981684981685}`.

The crop contains the complete weapon-proficiency table and all three explanatory paragraphs at upper right. It excludes the lower “Weight and Damage by Weapon Type” table and its heading. Every class row region retains its prior stable ID and three cell foci, transformed through page coordinates to the new crop; two additional rectangles cover the general levels-above-first definition sentence over its three wrapped lines. Source pixels were inspected against the supplied original PDF.

The previous left-column crop and separate last-paragraph-only excerpt, including their SHA-256 hashes and bounds, remain documented in the pre-repair baseline. The new table image is one shared asset referenced by all ten in-scope class catalogs. Their exact current region and catalog hashes are:

| Class | Field pointers | Region ID | Catalog SHA-256 | Shared image SHA-256 |
|---|---|---|---|---|
| cleric | `/levelChanges/9, /levelChanges/21, /levelChanges/29, /levelChanges/36, /levelChanges/42, /levelChanges/49, /levelChanges/58` | `phb-37-947ed4b02bc5aed3` | `3d3381d7fd72bb4311b7410d6d80a98e1073ebfb5971dd17f032e24916a3057c` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| druid | `/levelChanges/13, /levelChanges/29` | `phb-37-1e3e2abf64aba374` | `72a79f3670acec3b35c32faee6cea5df48bad3765b7edb016f0a7f59a3121269` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| fighter | `/levelChanges/5, /levelChanges/13, /levelChanges/21, /levelChanges/28, /levelChanges/36, /levelChanges/42` | `phb-37-f700eca9387736c6` | `4727dcc864c0e01096d3fd3e4f8ac70344ceca5f9a0b85e053ae0909ae403887` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| paladin | `/levelChanges/10, /levelChanges/24, /levelChanges/36, /levelChanges/49, /levelChanges/61, /levelChanges/72` | `phb-37-9106ad0ba141326d` | `0a5fed2a0ab2ac9564d7601e06d9b462fe9d2b8285407b8be1cb0d889825e229` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| ranger | `/levelChanges/10, /levelChanges/24, /levelChanges/41, /levelChanges/50, /levelChanges/58, /levelChanges/64` | `phb-37-0119fdbdadda1bfc` | `4e6c6284cb6e6b7c819de182e14e7d4d0f7c88f249e79ec4deb232c19f029a6e` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| magic-user | `/levelChanges/7, /levelChanges/21, /levelChanges/28` | `phb-37-9c3d841088eb857a` | `cb9fb4b5d238b0531193b3968b1f55ad6ecfffcb6fc5d40fda3390496dfc64e0` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| illusionist | `/levelChanges/11, /levelChanges/21, /levelChanges/28` | `phb-37-1b62533798f9d154` | `e78d1b636b59754992beb13823a29f6af104f03ed24b225e74fd628cf86e782c` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| thief | `/levelChanges/11, /levelChanges/22, /levelChanges/34, /levelChanges/43` | `phb-37-b8e9b30fddb28ae1` | `aa2f9847922f674ec3498dc35ee565526a6ebbfdb50422e2fe0fdb28fb9bb38e` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| assassin | `/levelChanges/11, /levelChanges/27, /levelChanges/44, /levelChanges/50` | `phb-37-911fe149fbfab8dd` | `65870ea210206565c5a367fb8d54512a95fd38d387ff901843feeb9fda28a9b3` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |
| monk | `/levelChanges/8, /levelChanges/21, /levelChanges/36, /levelChanges/57, /levelChanges/83, /levelChanges/110, /levelChanges/134, /levelChanges/160` | `phb-37-e9ab4e8854da5c1b` | `a6136a4c9f8f74e0b83ca0e5225e505b5e715b1029590c474c8f982bef9e6c9e` | `034b106d1a55aaa0053dd112b8c24148f47198e035abea9ce41be947eb2d88b1` |

## The 49 proficiency targets

Each listed pointer remains a proposal, not a manually applied field binding. The current catalog field-to-region/hash detail and all five focus rectangles per row are in the JSON report.

- **cleric:** `/levelChanges/9` (level 5), `/levelChanges/21` (level 9), `/levelChanges/29` (level 13), `/levelChanges/36` (level 17), `/levelChanges/42` (level 21), `/levelChanges/49` (level 25), `/levelChanges/58` (level 29).
- **druid:** `/levelChanges/13` (level 6), `/levelChanges/29` (level 11).
- **fighter:** `/levelChanges/5` (level 4), `/levelChanges/13` (level 7), `/levelChanges/21` (level 10), `/levelChanges/28` (level 13), `/levelChanges/36` (level 16), `/levelChanges/42` (level 19).
- **paladin:** `/levelChanges/10` (level 4), `/levelChanges/24` (level 7), `/levelChanges/36` (level 10), `/levelChanges/49` (level 13), `/levelChanges/61` (level 16), `/levelChanges/72` (level 19).
- **ranger:** `/levelChanges/10` (level 4), `/levelChanges/24` (level 7), `/levelChanges/41` (level 10), `/levelChanges/50` (level 13), `/levelChanges/58` (level 16), `/levelChanges/64` (level 19).
- **magic-user:** `/levelChanges/7` (level 7), `/levelChanges/21` (level 13), `/levelChanges/28` (level 19).
- **illusionist:** `/levelChanges/11` (level 7), `/levelChanges/21` (level 13), `/levelChanges/28` (level 19).
- **thief:** `/levelChanges/11` (level 5), `/levelChanges/22` (level 9), `/levelChanges/34` (level 13), `/levelChanges/43` (level 17).
- **assassin:** `/levelChanges/11` (level 5), `/levelChanges/27` (level 9), `/levelChanges/44` (level 13), `/levelChanges/50` (level 17).
- **monk:** `/levelChanges/8` (level 3), `/levelChanges/21` (level 5), `/levelChanges/36` (level 7), `/levelChanges/57` (level 9), `/levelChanges/83` (level 11), `/levelChanges/110` (level 13), `/levelChanges/134` (level 15), `/levelChanges/160` (level 17).

## Assassin scroll-reading target

Target: `classes:assassin /levelChanges/35` (level 12). Three distinct source regions are preserved in the Assassin catalog:

- **PHB p. 19 / PDF p. 20**, `phb-19-00ed6d9c8e0545a0`: `phb-19-00ed6d9c8e0545a0.png` (SHA-256 `00ed6d9c8e0545a0b8a43ae8459bd50e7b06ac6e71230d8c28b2a779ff187331`), bounds `{'x': 0.036042, 'y': 0.28825, 'width': 0.8117, 'height': 0.02286}`. Focus: `[[0.006336, 0.162162, 0.977825, 0.648649]]`.
- **PHB p. 27 / PDF p. 28**, `phb-27-a0862452b397bc19`: `phb-27-assassin-scroll-reading-context-7740a09429da1d98.png` (SHA-256 `7740a09429da1d98b578e37d4fe3e9215da265c639f9b0e6f85a09572a0bf7b3`), bounds `{'x': 0.5066445182724253, 'y': 0.02127659574468085, 'width': 0.473421926910299, 'height': 0.19148936170212766}`. Focus: `[[0.164768, 0.497981, 0.804749, 0.187021], [0.165864, 0.673906, 0.801127, 0.07128], [0.164768, 0.732293, 0.632994, 0.071755]]`.
- **PHB p. 29 / PDF p. 30**, `phb-29-249e19f022897253`: `phb-29-assassin-thief-level-context-65ae5d32dfb0cbc9.png` (SHA-256 `65ae5d32dfb0cbc999b74fd29a833db0a07397e280c07974dcd8fd9562644651`), bounds `{'x': 0.507910074937552, 'y': 0.463980463980464, 'width': 0.4829308909242298, 'height': 0.10378510378510379}`. Focus: `[[0.022559, 0.375428, 0.939513, 0.567129]]`.

The p. 19 footnote directly names the Assassin’s 12th-level scroll-reading trigger and magic-user/illusionist scroll spells. The p. 27 thief paragraph directly states the 10th-level scroll rules, including excluded clerical (but not druidic) scrolls and the 25% misunderstanding chance. The p. 29 paragraph directly states that assassins use thief abilities and functions two levels below their assassin level. Thus, “effective thief level 10” for a 12th-level Assassin and applying the p. 27 qualifiers to that inherited ability are a source-supported synthesis across three pages, not a claim established by p. 19 alone. The reversed-scroll mispronunciation caveat remains visible in p. 27 context outside the precise focus.

## Full class universe

| Class | Evidence field bindings | Contract status | Current catalog SHA-256 |
|---|---:|---|---|
| Cleric (`cleric`) | 91 | in bounded contract | `3d3381d7fd72bb4311b7410d6d80a98e1073ebfb5971dd17f032e24916a3057c` |
| Druid (`druid`) | 88 | in bounded contract | `72a79f3670acec3b35c32faee6cea5df48bad3765b7edb016f0a7f59a3121269` |
| Fighter (`fighter`) | 79 | in bounded contract | `4727dcc864c0e01096d3fd3e4f8ac70344ceca5f9a0b85e053ae0909ae403887` |
| Paladin (`paladin`) | 111 | in bounded contract | `0a5fed2a0ab2ac9564d7601e06d9b462fe9d2b8285407b8be1cb0d889825e229` |
| Ranger (`ranger`) | 106 | in bounded contract | `4e6c6284cb6e6b7c819de182e14e7d4d0f7c88f249e79ec4deb232c19f029a6e` |
| Magic-user (`magic-user`) | 75 | in bounded contract | `cb9fb4b5d238b0531193b3968b1f55ad6ecfffcb6fc5d40fda3390496dfc64e0` |
| Illusionist (`illusionist`) | 65 | in bounded contract | `e78d1b636b59754992beb13823a29f6af104f03ed24b225e74fd628cf86e782c` |
| Thief (`thief`) | 86 | in bounded contract | `aa2f9847922f674ec3498dc35ee565526a6ebbfdb50422e2fe0fdb28fb9bb38e` |
| Assassin (`assassin`) | 121 | in bounded contract | `65870ea210206565c5a367fb8d54512a95fd38d387ff901843feeb9fda28a9b3` |
| Monk (`monk`) | 232 | in bounded contract | `a6136a4c9f8f74e0b83ca0e5225e505b5e715b1029590c474c8f982bef9e6c9e` |
| Bard (`bard`) | 99 | out of scope | `c815c6aa2d4a63929dc540e817695d40aec5118d0ed8c2e4d590d047ab2c4fbe` |
| Cavalier (`ua-cavalier`) | 109 | out of scope | `7f598064b0f5257bbc8451bd5a0c705c9de145a79068ebb5ea860b301b90dcb6` |
| Barbarian (`ua-barbarian`) | 196 | out of scope | `a7897f4a0bb4d39c45615ebbdd21201993de8c55eb3c2ae48fa264d05c277e54` |
| Thief-acrobat (`ua-thief-acrobat`) | 111 | out of scope | `c2f557dd6a8f128f6902bbd50284d8034b09437cfe56e0b6344eaa84b267690c` |
| Paladin · UA revision (`ua-paladin`) | 215 | out of scope | `2c7a71c8617e77d97799e49f0335d4c8d1bdb3bcc5524d8eec26d353b2979827` |
| Druid · UA high levels (`ua-druid`) | 23 | out of scope | `87f4a0fa6de5062add4c0acf943ca5acb2a7d16340aa6e73b90b746de46be226` |

The bounded contract covers Cleric, Druid, Fighter, Paladin, Ranger, Magic-user, Illusionist, Thief, Assassin, and Monk. Bard, Cavalier (UA), Barbarian (UA), Thief-acrobat (UA), Paladin (UA revision), and Druid (UA high levels) remain explicitly out of scope.

## Current review status

The earlier independent assessment covers the prior image/content hashes only. The combined p. 37 crop and the new Assassin p. 27 and p. 29 images, catalog hashes, focus geometry, and region content require root independent review before any review-ledger updates or field-binding promotion. Current `dist/data.json` contains 1,807 class evidence bindings: all remain `field-target-pending` and `context-not-assessed`, with zero region IDs/evidence. The 50 proposals remain unapplied to product field bindings. No assembly was run.

## Validation

Custom structural checks passed for all 50 targets, the 16/1,807 live class universe, stable IDs, focus transforms, image hashes/dimensions, and Assassin source regions. `git diff --check` passed. The global source-visual coverage run found zero context-contract violations (35 checked) and a valid continuation manifest; it exited on a separate equipment inventory mismatch (189 price claims vs 191 equipment records after the two pending offers). Its output was written under `/tmp`. `dist/data.json` remains byte-identical to the pinned baseline.
