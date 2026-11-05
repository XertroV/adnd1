# Equipment source extraction and checks — 4 November 2026

## Catalogue and source scope

`equipment.json` contains 80 curated entries: 16 armor/shield entries, three crossbows, 22 other weapons, five ammunition entries, 25 adventuring/provision entries, and nine additional UA equipment entries. It draws only on actual Library reads of PHB printed pp.35–39 and original UA pp.26–28. It is not a complete equipment catalogue.

There are 45 legible OCR prices and 35 explicit null prices. Every entry is marked incomplete and visually unverified. A null price is an extraction gap, not a free item. Source PDFs and raw OCR are not included.

## Crossbow findings

PHB p.35 lists heavy and light crossbows but its arms-price columns are missing in the available OCR. UA p.26 likewise lists the hand crossbow without a legible cost. All three prices remain null, with explicit source notes.

UA p.28 preserves these missile-table values:

| Item | Fire rate per melee round | Short / medium / long range |
| --- | --- | --- |
| Light Crossbow | 1 | 6″ / 12″ / 18″ |
| Heavy Crossbow | ½ | 8″ / 16″ / 24″ |
| Hand Crossbow | 1 | 2″ / 4″ / 6″ |

Range units follow PHB p.39: 1″ is 10 feet indoors and 10 yards outdoors. Cross-source field labels, `fieldSources`, and `references` preserve the distinction between the PHB cost-table location and UA missile statistics. No crossbow weapon weight or missing bolt-damage value was reconstructed.

## Prices, quantities, and statistics

Currency values use `gp`, `sp`, or `cp`. Weapon weights explicitly say **gp-weight**, an encumbrance unit, rather than a purchase cost. Explicit packages and quantities are preserved, including a 50-foot rope length, flask of oil, vial of holy water, stick of incense, and one week of standard rations. Quiver capacity is distinct from purchased ammunition quantity.

Ammunition prices remain null. Source notes preserve the PHB cost table's single light bolt, score of heavy bolts, and separate arrow/bullet package lines. No per-piece price was assumed or derived.

Source differences are retained: PHB and UA show different Large-target Partisan damage and different S/M heavy-bolt damage in the available OCR. UA-sourced values are explicitly labeled and are not silently substituted for PHB values. All numeric fields still require visual checks.

## Validation

Checks passed for 80 unique IDs, source/page presence, allowed currencies, positive known prices, field-level source references, explicit unknown-price notes, and visual-verification labels. The existing shared search core resolves `light crossbow`, `lightcrossbow`, `crossbow light`, `lightxbow`, `light xbow`, `x-bow`, and `xbow` to the Light Crossbow entry; generic crossbow abbreviations also return the other genuine crossbow variants.

These checks establish schema integrity and the tested aliases. They do not claim independent visual verification or exhaustive equipment-mechanics coverage. No application files were changed by the equipment author.

An independent agent additionally reread original UA pp.26 and 28 and confirmed all three crossbow rates/range bands, the null hand-crossbow price, and the four extracted UA armor/shield prices (bronze 100 gp, field 2,000 gp, full 4,000 gp, buckler 5 gp). This was an independent OCR comparison, not a visual check. An initial alias test exposed the missing compact `lightcrossbow` form; compact forms were added for all three variants and the seven-query regression then passed.
