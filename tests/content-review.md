# Independent content review — 4 November 2026

Reviewer: independent agent, separate from the extraction and interface authors.

## Evidence and scope

Compared 15 high-risk PHB spell cards against Library OCR on printed pages 43–45, 64–68, and 94–95: Command, Cure Light Wounds, Protection from Evil, Hold Person, Silence 15-foot Radius, Burning Hands, Feather Fall, Magic Missile, Sleep, Spider Climb, Color Spray, Hypnotism, Blindness, Blur, and Shield. Checked numeric fields, target restrictions, saves, material requirements, and limitations.

Compared UA quick-reference samples for Phantom Armor, Spook, Whispering Wind, Phantom Steed, Flaming Sphere, Protection from Cantrips, Tasha’s Uncontrollable Hideous Laughter, and Melf’s Acid Arrow against printed pages 53–54 and 67–68. Cross-checked UA cantrip availability using printed pages 45 and 65. Reviewed cleric and magic-user XP thresholds against PHB printed pages 20 and 25.

After the PHB detailed-card expansion, additionally compared Web, Fireball, Haste, Lightning Bolt, and both class versions of Dispel Magic with PHB printed pages 47 and 72–74. Readable numeric attributes and conditions match the OCR. The Fireball component-header/prose mismatch, Web fractional range and reduced-strength ambiguity, and Lightning Bolt single-stroke width remain explicitly unresolved rather than inferred. Haste correctly states that spell casting is not accelerated and that recipients age; no unsupported aging number is supplied.

This is a sampled OCR comparison, not a complete content audit. No visual PDF verification occurred: local transfer to the two authoritative PDF hosts is blocked by the environment proxy with HTTP 403. Numeric tables remain labeled pending visual review.

## Findings and fixes

1. **Fixed by class author:** magic-user guidance conflated level-11 item enchanting/scroll scribing with level-12 stronghold eligibility. PHB p.25 distinguishes these thresholds. Guidance now separates them.
2. **Fixed by spell author:** Illusionist filtering would have omitted the 66 shared magic-user cantrips. UA p.65 explicitly permits illusionists to use these. Index entries now include `classes: ["Magic-user", "Illusionist"]` and the supporting access citation. The interface must apply this array when filtering.
3. The sampled detailed spell values match the available OCR. Ambiguous Color Spray dimensions, Sleep affected-number table, and Melf’s Acid Arrow duration progression are withheld or explicitly marked unresolved. These omissions are preferable to guessed values.
4. Cleric and initial magic-user cumulative XP thresholds match the readable OCR. Several class tables remain absent because OCR rows are damaged. The site must describe this as partial progression and never extrapolate into missing levels.

## Coverage and copyright

The data contains concise, original paraphrases and factual values. Detailed cards and heading-only index entries must remain visibly distinct. Neither PDFs nor full OCR text belong in the deployed tree. A broad name index does not establish complete spell-description or rules coverage.

## Independent browser review

Tested Chromium 154 through Playwright against the local static preview at 390 × 844 and 1280 × 900.

- Mobile document width equals viewport width; no horizontal overflow or JavaScript errors observed.
- Illusionist + UA + level 0 returns all 74 available cantrips, including the 66 shared cantrips; Chill remains findable.
- Command-palette arrow and Enter navigation routes to the selected Death Spell reference.
- Cleric cumulative XP 1,500 remains at the level-1 threshold; 1,501 reaches level 2. PHB printed p.20 maps to supplied PDF p.21.
- An XP-row annotation survives reload, links back to the class, and displays literal script markup safely.
- Heading-only source labels accurately distinguish indexed headings from completed cards. Filtered counts now show matching detailed cards rather than an ambiguous global total.
- Annotation-save keyboard focus is restored to the exact originating XP-row button. The command input now has an explicit accessible name.
- The 5,000-note capacity guard preserves existing data, keeps the attempted extra note’s editor open, and survives reload with all 5,000 saved notes intact.

The interface author fixed the inaccurate pending-citation copy, filtered-card count, combobox name, annotation-focus restoration, and notebook limit issue found in review. These paths were retested after fixes. This review supplements the owner’s broader automated browser regression; it does not establish full accessibility conformance.

## Remaining verification

Full numeric and source-page visual checks require approved PDF-host access. Every rule and spell outside the reviewed sample still needs its own source check. The 636 indexed entries include repeated spell names across classes and are not 636 distinct spell names. Only five of the sixteen class/variant guides currently contain any numeric XP rows, and all five tables are partial.
