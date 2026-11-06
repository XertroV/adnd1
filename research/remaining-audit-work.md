# Remaining audit work and evidence limits

This report separates review of existing assertions, additional extraction, unresolved source questions, and application features. The generated [field log](mechanics-audit-progress.md) is the authority for current field counts. Its denominator is selected leaves of the existing data, not every rule in the books. A field can accurately describe an unresolved question without resolving that question.

## Follow-up extraction

The continuation after PR #15 identified these available-source additions. Exact values and independent verdicts belong in the regression fixtures and field log, not in an inferred completeness percentage:

- DMG p.225 encumbrance for six existing bow/crossbow cards, separately labeled from purchase currency.
- PHB p.39 missile-range scale on fourteen existing cards, preserving UA exceptions and the staff-sling range ambiguity.
- Mass Charm's inherited person/monster charm-breaking schedules, PHB pp.55, 65, 76 and 90.
- The existing encounter card's narrow Appendix C random character-party procedure, from the privately supplied DMG p.175 image.
- Replacement of the assassin's stale unreadable-row warning with the actual PHB pp.19/30 level-limit conflict.

The dependency batch adds Find Familiar's transferred special-familiar benefits and omitted neutral alignment; Forcecage's forcecube device comparison; illusionist Dispel Magic's inherited procedure; both Magic Mirror variants' detection rules; and two UA p.11 racial-card omissions (deep-gnome summoning and the frequency of female drow powers). The [exact dependency corrections](../tests/fixtures/mechanics-dependency-corrections.json) preserve independent verdicts and old/new values for these thirteen operations. The earlier twenty-three operations are recorded in [the preceding fixture](../tests/fixtures/mechanics-closure-corrections.json). These identified omissions have been addressed; that does not establish that every potentially relevant passage throughout the books has been extracted.

The final [three racial-card corrections](../tests/fixtures/mechanics-racial-last-corrections.json) complete a bounded visual pass over directly stated UA pp.10–11 traits for the existing duergar, drow and deep-gnome cards. They include surprise, senses, movement, languages and PC-specific qualifications. See [the exact screening scope](ua-closure-scope.md). Referenced surface-race rules, every racial level-limit table, spell/monster mechanics and the optional Fiend Folio ability-generation method are not all reproduced on these cards. Fiend Folio was not among the supplied source books; its optional method cannot be transcribed from the supplied UA passage alone.

The earlier rules screening covers explicit deferred/table language in 148 existing cards; it is not a line-by-line omission audit. See [the screening log](rules-next-screening.json). Historic blanket caveats about additional mechanics and external cross-references are scope limits, not evidence that all such content is missing or that all such work is complete.

## Equipment evidence still missing or ambiguous

The bounded equipment review covers all 88 existing entries and the source areas listed in [the equipment completeness review](equipment-completeness-review.md).

| Item or issue | Evidence checked | What remains needed |
| --- | --- | --- |
| Bo stick, club, quarterstaff, sling stone purchase prices | Supplied PHB/UA/DMG text; visual PHB pp.35/123 and UA p.26 price tables | Printed prices remain unknown. Separately labeled editorial suggestions are available for all four; the DM may adopt or change them. Encumbrance is not price, and absence does not mean free. |
| Staff-sling range adjustments | UA weapon/range tables and notes | A ruling or authoritative clarification of the absent short-range band versus the shared short-range adjustment baseline. |
| Armor weights with printed plus signs | UA armor tables | An applicable explanation of the plus signs; no extra weight is guessed. |
| Generic container weights and ration quantities | DMG p.225 | Item-specific quantities/variant identification where the generic row does not establish them. The rations row does not establish a weekly quantity. |

## Source questions that extraction alone cannot settle

The [spell issue inventory](spell-closure-status.md) identifies printed pages and distinguishes newly rechecked passages from previous reviews. In addition to that inventory, the durable field log records Hold Portal's header/prose range conflict, Spiritwrack's minute/round conflict, illusionist Light and Continual Light saving throws, and Invisibility to Undead's caster/recipient ambiguity.

- Speak With Animals calls for an unidentified special reaction chart (PHB p.46). DMG p.63 is a candidate, not an explicitly identified replacement.
- Emotion does not identify which class's hopelessness Symbol is intended (PHB pp.53, 91, 97).
- The illusionist introduction's “all” first-level magic-user spells conflicts with the specific twenty-spell list (PHB pp.94/100).
- A different printing, authoritative correction, or explicitly labeled referee ruling is needed for the remaining conflicting dimensions, timing, component wording, rank limits and roll boundaries. The supplied text must not be silently rewritten to resolve them.
- Forcecube's device reference does not specify how every selectable face, charge, movement limit or defeat method transfers to the spell. The comparison preserves this distinction. Magic Mirror's detection prose gives an Intelligence threshold while the referenced spell-user table has lower-score entries; the relationship remains unresolved.
- Overland burden categories omit exactly 90 pounds (DMG p.58). Scrying detection's lookup leaves some entries blank/dashed. These do not establish invented boundary values or zero chances.

## Class limits and pending calculator features

| Specific source question | Checked location | Required resolution |
| --- | --- | --- |
| Assassin limit 14 versus level-15 progression | PHB pp.19/30 | Authoritative correction or a campaign decision; neither cap is silently selected. |
| Monk attack table | PHB p.30; DMG p.74 | Thief-table instruction versus cleric/druid/monk matrix requires a source-policy ruling. |
| Cavalier hit dice | UA pp.13–15 | The d12 table heading and d10 introductory text conflict; the project-supplied correction is not an independently verified erratum. |
| Barbarian aide assistants | UA p.21 | Half an odd aide level has no supplied rounding rule. |
| Thief-acrobat retained skills | UA p.23 | Climbing expressly advances; later progression of other retained skills is not explicitly resolved. |
| UA paladin weapon-of-choice attacks | UA pp.14/16/22 | Inherited five-level acceleration interacts with distinct paladin bands, and the printed bands overlap at level 12. |

The classes' generic pending saving-throw, attack, spell-slot, turning, skill and character-specific deltas are unfinished calculator behavior. They are not all missing-source problems: several underlying tables are already extracted and reviewed. Implementing complete level-transition calculations would require explicit handling of class, race, ability, equipment, multiclass and campaign choices, plus behavior tests. The current site does not claim that calculator completeness.

## Private page 175 and end matter

The separate p.175 image was compared with both neighboring pages: its opening continues p.174 and its final character-item sequence continues on p.176. The original PDF still lacks that page. The private image's SHA-256 is recorded in [the source investigation](../tests/dmg-missing-pages-investigation.md); its exact printing remains unestablished. It is available for private verification, not published as a scan or falsely mapped into the original PDF.

The page's NPC equipment examples are not general purchase prices or universal equipment rules. Its remaining character-class and magic-item encounter tables would be a larger encounter-generator expansion; the scoped party note does not claim to implement that generator.

PDF p.239 is an unnumbered reference sheet and PDF p.240 is the back cover. Printed pp.239–240 are not confirmed missing numbered pages. Matching-copy end matter in physical order, and the separate image's imprint/adjacent pages, would establish completeness and printing attribution more firmly.
