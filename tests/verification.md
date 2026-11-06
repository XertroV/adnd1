# Release verification — 4 November 2026

Site: https://first-edition-vault.maxkaye.chatgpt.site. The first release was owner-private; the user subsequently requested public access. Public access was read back before the continuing deployments. Source PDFs and private OCR working files are excluded from the Site repository and archive.

## Current reviewed coverage

- 638 class-specific spell entries: 414 PHB and 224 original UA. A name may appear in multiple classes; this is not a distinct-name count.
- 594 detailed spell cards, extracting legible casting fields, materials, conditions and exceptions into concise original paraphrases.
- 148 curated rule summaries.
- 16 class/variant guides with 114 exact source XP rows, 11 explicit continuation rules and 645 level/source change groups. All level-up groups explicitly remain incomplete. Sparse rows retain their true levels; missing early thresholds are withheld.
- Class and target-level selectors show previous-to-target XP differences only within the same XP track. Derived thresholds require an explicit source anchor and continuation rule. UA Hierophant XP resets are never subtracted from Grand Druid office XP.
- Optional UA weapon specialization is labeled separately. Source-backed class caps are distinguished from the selector's display range.

Coverage continues to expand; this is not a claim of complete rules, spell-card or class-mechanics coverage. All OCR-derived mechanics await visual verification.

## Verified search correction

Cure Light Wounds already existed for Cleric 1 (PHB p.43) and Druid 2 (PHB p.56). The failed CLW lookup was caused by substring-only search. A shared matcher now supports title initials, source-attested name aliases, common shorthand, and dotted/spaced acronym forms in both the spell browser and command palette. Exact spell aliases rank ahead of ordinary paragraph matches; short aliases do not simply match book-code substrings. A populated search input also now closes the palette on Escape.

## Validation evidence

- 41 Node test groups pass across data integrity, abbreviation search and production advancement functions.
- 24 general Chromium workflow checks pass, including source mapping, XP boundaries, shared cantrips, escaped annotations, persistence, notebook import/export and data-load failure.
- 24 dedicated browser search checks pass: CLW, C.L.W., c l w, MM, DM, PFE, CSW, CCW, FB, shorthand phrases, class filters and keyboard card selection.
- 21 dedicated advancement browser checks pass, including Fighter levels 2/7/9/10/12, specific XP deltas, sparse-row warnings, the UA druid reset, source caps, keyboard focus, and narrow mobile layout.
- axe-core WCAG 2 A/AA and 2.1 A/AA checks report zero violations in nine views/dialogs. Independent narrow-layout checks also passed at 320, 360, 390 and 1440 pixels; wide XP tables scroll internally. Automated results do not replace an assistive-technology audit.
- Independent source and browser reviews: `content-review.md`, `search-review.md`, `planner-review.md`.

## Remaining source-access blocker

Original materialization attempts for the PHB, UA and DMG failed because the environment proxy denies HTTPS tunnels to `sdmntprcentralus.oaiusercontent.com` and `sdmntpraustraliaeast.oaiusercontent.com` with HTTP 403. No readable local PDF was produced. Library extracted-text reads succeed. Native Library page-image reads currently return only sediment image-pointer metadata, not pixels; no supported pointer resolver is exposed. The network policy remains restricted and no policy-mutation tool is exposed.

Required supported setup: enable the exact Library transfer hosts through the environment configuration workflow, or restore native Library image hydration/direct authorized local materialization. No proxy bypass or denied download retry was performed during the follow-up. The earlier assessment treated DMG pp.175 and 240 as missing; subsequent inspection confirms p.175 missing and leaves pp.239–240 unverified (see dmg-missing-pages-investigation.md).

Monster Manual and Monster Manual II were subsequently supplied for a later expansion. Their name/page indexing is in progress; numerical monster statistics will be withheld until visual checks are possible. No source PDF is published.

## Provenance

Workspace: `/workspace/sites/first-edition-vault`; unrelated XPP repositories were not modified, committed or pushed. The current Library transfer helpers were obtained for the original materialization attempt. Missing Sites helper scripts were handled with a stdin-only credential fallback for source push and static packaging; native Sites tools own saving/deployment.

Confirmed Codex thread ID: `01a1a62e-7e95-709a-8e43-7417406470ca`. No navigable thread URL was exposed, so none was guessed.

## Mobile spell filters

Class buttons and multi-select level buttons use 44px touch targets. All means no level restriction; the first individual click isolates a level, subsequent clicks add/remove, and removing the final choice or selecting every available level returns to All. Class changes retain valid selected levels or reset to All. Nine model tests and 18 browser checks pass, with independent checks at 320/360/390/1440px and zero axe AA violations. Known partial spell cards carry a visible Partial extraction label.
