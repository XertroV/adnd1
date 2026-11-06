# Equipment completeness review

The value-level log covers the currently extracted fields of all 88 equipment records. This supplemental review records which source areas were searched for omitted mechanics; the field percentage alone cannot establish whole-book completeness.

| Source scope | Completed extraction/review |
| --- | --- |
| PHB 35–38; UA 26–28 | Purchase prices, weapon encumbrance, damage, length, space, speed and separately labeled PHB/UA armor-class adjustments. Staff-sling ammunition is separately qualified. |
| PHB 36, 101–102 | Existing shields and supplies: shield coverage, rope length, quiver capacities, torch/lantern illumination and duration. The plate-armor load example is an overall load category, not an individual item weight. |
| UA 75–76, 107 | Existing armor/shield weights, bulk and movement; bronze/field/full plate special rules; buckler use and pummeling. Human-size qualification and unexplained printed plus signs are retained. |
| DMG 27, 225 | Existing armor movement and adjusted encumbrance; matched supplies and ammunition. Gold-piece encumbrance is distinct from purchase currency. Generic-container rows are not silently converted to item-specific quantities. |
| DMG 64–65 | Oil and holy-water grenade assumptions, effects, ignition and target restrictions, without asserting general fuel duration or bottle capacity. |

Every source-backed addition has an exact field source and a matching public excerpt. Suggested prices are editorial; their excerpts document comparator prices only, not prices for the four suggested items. Independent review snapshots are preserved in the equipment regression fixtures, and the durable mechanics log records current values, source PDF hashes and source pages. Whole-record `incomplete` flags remain: checking these assertions does not establish that no other rule applies.

## Remaining evidence limits

- No numeric purchase price was found for the bo stick, club, quarterstaff or sling stone in the bounded search of supplied PHB/UA/DMG text and visually inspected PHB 35/123 and UA 26 cost tables. See [the price investigation](../tests/ua-missing-weapon-prices-investigation.md). Each card now offers a separately labeled editorial suggestion; the printed price remains unknown and no free price is inferred.
- Staff-sling missile rows have no short-range band while the shared adjustment note uses a short-range baseline. The printed numbers and the interpretation gap remain separate.
- Some armor weight rows include an unexplained plus sign. The human-size, bulk and source-book qualifiers are preserved.
- Generic quiver, lantern, mirror and flask encumbrance rows do not establish every named variant's exact weight or contents. The DMG rations row does not identify a period; no weekly quantity is inferred.
- The additional-mechanics search is bounded to the listed source areas and relevant indexed passages. It is not an exhaustive assertion that every mention of each object throughout all books has been extracted. Any future additions expand the tracked-field denominator and require their own review.

DMG printed p.175 remains absent from the original PDF. A separate private image visibly provides that page and fits the neighboring Appendix C context, but its exact printing is unestablished; it did not produce any accepted equipment addition or public excerpt. The uncertain end matter remains separately documented in the [source-question review](../tests/source-question-review.md).
