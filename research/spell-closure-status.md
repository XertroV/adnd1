# Remaining spell-source questions

This is an inventory of the explicit caveats in the current assembled spell cards, not a new complete mechanics audit. The generic historical notes that other numeric mechanics and cross-references remain to be checked are scope limits, not identified failures of existing assertions. They also mean additional omissions may remain: this inventory does not establish their absence. The pages listed below identify where the cards or earlier audits locate the issue. In this follow-up, the original PHB print was visually rechecked for Mass Charm (pp. 55, 65, 76, 90), ESP (70), Mirror Image (71), Enchanted Weapon (76), Hallucinatory Terrain and Massmorph (77), Animal Growth (79), Repulsion (86), Mass Invisibility and Reverse Gravity (88), and Permanency (91). Earlier source reviews supplied the remaining page references; they have not all been independently re-read in this follow-up. Page numbers are printed pages.

## Resolved dependency

- **Mass Charm**: PHB p. 90 incorporates Charm Person and Charm Monster, with distinct break schedules on pp. 55, 65, and 76. The two schedules are now present in the assembled card; the durable reviewed correction is recorded in [the closure correction fixture](../tests/fixtures/mechanics-closure-corrections.json). Whether a particular borderline creature is treated as a person or monster is not newly decided by this proposal.

## PHB source ambiguities and cross-references

- **ESP, p. 70**: the entry uses one-creature-per-turn and round-to-round probe language. A clarification in an authoritative correction or a referee's timing ruling is needed.
- **Mirror Image, p. 71**: printed bands 51–75 and 75-or-more overlap. An authoritative correction or a referee's choice for a 75 is needed.
- **Enchanted Weapon, p. 76**: the header calls the spell reversible but the paragraph does not explain the reverse. An authoritative description of that reverse or referee ruling is needed; the reverse's mechanics cannot be supplied from that paragraph.
- **Hallucinatory Terrain, p. 77**: the printed area header and the stated 10th- and 12th-level square examples support different scaling. An authoritative clarification or referee ruling is needed.
- **Massmorph, p. 77**: the header appears to print 11′ × 1″ square per level. Its unusual dimensions require clarification or referee ruling.
- **Plant Growth, pp. 57–58 and 78**: the inherited area header and druid examples differ in their apparent scaling. A source correction or referee ruling is needed.
- **Animal Growth, p. 79**: the header says V, S while the description requires powdered bone. The component list must remain a source conflict unless a correction or referee resolves it.
- **Repulsion, p. 86**: the description states 3″ per round or the subject's motive speed, without specifying a universal selection rule. A referee must decide the application absent a clearer authoritative source.
- **Mass Invisibility, pp. 70 and 88**: the entry imports Invisibility but does not separately spell out whether one recipient's attack ends the whole group effect. A referee ruling or authoritative clarification is needed.
- **Reverse Gravity, p. 88 (class list p. 42)**: header says one segment; description says one second, explicitly one-sixth segment. A source correction or referee ruling is required.
- **Permanency, p. 91**: the header lists a material component but the entry names none. Do not invent one; an authoritative source or referee must specify any required material.
- **Wind Walk, p. 54**: the passenger statements conflict. A correction or referee ruling is needed.
- **Wall of Thorns, p. 62**: printed volume statements and examples conflict. A correction or referee ruling is needed.
- **Programmed Illusion, pp. 95, 97 and 99**: a material item is not named in the entry. Source clarification or referee specification is needed; the omission alone does not identify an item.
- **First-level magic-user spells for illusionists, pp. 94 and 100**: the introductory broad statement and the named 20-spell list differ. A referee must choose how to apply them, or an authoritative clarification must resolve them.
- **Find Familiar, p. 66**: special-familiar powers are intentionally cross-referenced to the Monster Manual. The card now contains a reviewed, bounded summary of the four familiars’ benefits; the exact source-bound changes are in [the dependency correction fixture](../tests/fixtures/mechanics-dependency-corrections.json). It does not transcribe full monster stat blocks or resolve how the PHB familiar-death HP loss interacts with the imp/quasit level-loss rule.

## UA caveats and referenced rules

The following are preserved as recorded by the prior UA review, rather than newly verified in this follow-up:

- **Withdraw p. 35**: formula and example conflict; authoritative correction or referee ruling required.
- **Abjure p. 37**: header and paragraph give different save/procedure wording; referee or authoritative clarification required.
- **Ceremony p. 41**: the printed rank wording conflicts with the hierarchy implied by the examples; referee or authoritative clarification required.
- **Melf's Acid Arrow p. 54**: duration rule and example conflict; referee or authoritative clarification required.
- **Zephyr p. 55**: the pin-material phrase is ambiguous; authoritative clarification or referee choice required.
- **Forcecage pp. 61–62**: the card now summarizes the DMG Cube of Force screens and preserves the unresolved question of how its controls, charges, movement rates and methods of defeat apply to Forcecube. See [the dependency correction fixture](../tests/fixtures/mechanics-dependency-corrections.json).
- **Teleport Without Error p. 62**: inherited PHB p. 82 table is already present on the card; the caveat accurately distinguishes the UA entry from the referenced PHB rule, so no unresolved table extraction remains.
- **Illusionist Dispel Magic p. 69**: the underlying cleric dispelling procedure is now summarized in the card, with the two-level reduction retained. See [the dependency correction fixture](../tests/fixtures/mechanics-dependency-corrections.json).
- **Illusionist and magic-user Magic Mirror, UA pp. 57 and 70; DMG detection rules**: both cards now include the referenced detection procedure and table. The DMG Intelligence 12+ threshold conflicts with lower-Intelligence spell-user table entries, and its application remains unresolved. See [the dependency correction fixture](../tests/fixtures/mechanics-dependency-corrections.json).
