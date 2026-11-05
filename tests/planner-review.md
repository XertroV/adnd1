# Independent target-level planner review — 4 November 2026

## Scope and limits

Reviewed the class planner independently from its interface and data authors, using the assembled corpus with 16 class/variant guides, 114 source-listed XP rows, and 640 partial level-change groups. All source comparisons were against available Library OCR. PDFs remain unreadable locally because Library download hosts are proxy-denied; no visual verification is claimed. Every level-up guide remains incomplete.

## Source checks

- Fighter hit dice and fixed hp: PHB p.22 grants d10 progression and +3 hp per level after ninth. The level-10 card correctly gives fixed +3 hp rather than another die.
- Fighter AC-0 attack targets: DMG p.74 supports the default level bands, including 16 → 14 at level 7 and 14 → 12 at level 9. Cards explicitly direct readers to the full matrix and do not present these as universal attack bonuses.
- Weapon proficiency: PHB p.37 explicitly counts intervals above first level. Fighter allotments increase at levels 4, 7, 10, etc.; initial four proficiencies become five at level 4, six at level 7.
- UA optional specialization: UA p.18 supports melee attacks changing from 3 per 2 rounds to 2 per round at level 7 and the separate optional double-specialization choice. These are explicitly labeled optional rules in the rendered planner.
- Source limits are explicit, not inferred from the last table row: PHB p.19 sets druid 14 and monk 17; PHB p.118 says bard has no level beyond 23; UA p.17 permits Hierophant druid advancement as high as 23.
- UA druid tracks: UA pp.16–17 support Grand Druid level 15 at 3,000,001 XP, entry to level-16 Hierophant after the stated abdication requirements and reset to 1 XP, then level 17 at 500,001 on the new track. Adding the missing source-listed level-15 row allows the UI to show the track discontinuity directly.

## Browser checks

Tested Chromium 154 against the local preview at desktop and 390-pixel mobile widths.

- Fighter target 2 shows its own hp change without later freehold or attack-band changes.
- Fighter target 7 shows hp, AC-0 matrix change, normal attack band, proficiency, and separately labeled UA conditional options.
- Fighter targets 9 and 10 respectively show freehold eligibility and fixed +3 hp.
- Fighter target 12 derives 1,000,001 XP from the explicit level-11 anchor and +250,000 continuation rule; the consecutive-threshold difference is 250,000.
- Fighter input 50,000 XP identifies level 6 only as the highest *listed* threshold and explicitly states that missing intermediate rows prevent determining the actual current level.
- XP-row source dialog maps Fighter printed p.22 to supplied PDF p.23.
- UA druid target 16 displays 1 XP on the named Hierophant track and refuses to subtract it from the Grand Druid track. Target 17 shows the valid 500,000 same-track difference. Selecting target 16 also selects the correct calculator track.
- Bard and monk selectors stop at the source-supported levels 23 and 17. The Fighter selector labels its upper display range as a display bound rather than a class cap.
- Cavalier continuation with a missing anchor does not derive target-level XP or infer a higher current level.
- Native target-level keyboard changes retain selector focus; saving a target-level annotation restores focus to its originating target button.
- No JavaScript errors were observed in the tested workflows.

## Supplemental spell sample

The new Cure Serious Wounds (2d8+1), Cure Critical Wounds (3d8+3), Heal/Harm (the distinct remaining-damage versus remaining-hp wording), and Teleport payload formula match PHB OCR pp.48, 49, 51, and 82. The arrival-probability table remains unverified.

UA Remove Paralysis save bonuses, Stoneskin's single-opponent sequence and soft-attack exception, Evard's header/prose save contradiction, Chain Lightning's separate hit and damage saves, and Shadow Walk's speed and unwilling-target save match OCR pp.37, 56–57, 59, and 71. These are sampled comparisons, not exhaustive validation of the newly expanded spell corpus.

## Mobile fix and independent retest

First review found that the 390-pixel class page expanded the document to 415 pixels because the reference grid retained a child minimum width. The interface author constrained the grid and its children and contained the table's hidden header inside its clipping ancestor. Independent retests at 320 and 390 pixels now show document width equal to viewport width for both Fighter and UA druid pages. XP tables scroll internally rather than widening the page. No review blockers remain for the tested workflows.
