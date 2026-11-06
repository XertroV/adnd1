# Suggested equipment prices

The user requested usable estimates where no printed purchase price could be verified. Suggestions are discretionary prices for ordinary purchased items, not quotations from the books. The [recorded rationale and comparables](suggested-missing-prices.json) distinguish printed comparison prices from assumptions about materials, preparation and workmanship. These assumptions do not uniquely determine a price; a referee may choose another amount or allow suitable materials to be gathered.

## Record design decision

Context: four existing items have no verified source-listed price; all other equipment and source-verification behavior must remain trustworthy.

| Idea | All | Gives the requested usable suggestion | Preserves unknown printed price | Separates estimates from source checks |
| --- | --- | --- | --- | --- |
| Leave only the unknown price | No | No | Yes | Yes |
| Replace the printed price with an unqualified estimate | No | Yes | No | No |
| Keep `price: null` and add a labeled `suggestedPrice` | Yes | Yes | Yes | Yes |

The first option does not fulfill the request for estimates. The second falsely attributes an editorial amount to the source. The selected representation provides suggestions without either error. Different reasonable suggested amounts can satisfy these goals; the chosen round coin amounts are tentative judgments, not a uniquely derived economic model.

The site labels these amounts **Suggested (estimate)**, displays package units and rationale, and identifies source citations as comparisons. Printed-price counts remain separate. The audit tracks suggested amounts, currencies, units and rationales as editorial review; they do not raise the count of source-checked mechanics. The four original printed-price gaps remain visible in the data even though a usable suggested purchase price is now provided.

Further actionable work is distinct from missing evidence: additional cross-reference extraction and complete level-up calculations are implementation work. Authoritative printed prices, correction of conflicting rules, the optional Fiend Folio generation method, and exact source-printing attribution require the specific evidence described in [remaining audit work](remaining-audit-work.md).
