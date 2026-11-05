# Phase 1 spell source audit

Audited 2026-11-04 against the user-provided **Players Handbook, AD&D first edition, sixth printing (January 1980)**. Printed page N is PDF page N+1. Source access was Library page text, including complete cross-page paragraphs and relevant general notes. This is an independent **OCR-to-card audit**, not visual table verification. No source PDF, source image, or wholesale book text is included here.

The sample is eight cards in `phb-spells.json` (257 cards at audit start) and two in `phb-magic-user-extra.json` (113 cards). Author JSON was not edited by this audit.

## Findings to fix

1. **Heat Metal — missing partial marker and material citation.** The card gives the seven-round heat damage profile accurately, but withholds the disability periods and the reverse Chill Metal damage/disability table. Set `incomplete: true` and explicitly identify those missing tables. Add printed p.54 to support its general mistletoe requirement; its spell and tables are on p.56. Do not turn an omitted table into a claim that the spell is fully extracted.
2. **Magic Jar — critical table still needs visual confirmation.** All eight save-modifier bands and the retry intervals match the readable OCR on p.81. The card nevertheless needs `incomplete: true` and an explicit note that the critical modifier table has not been visually checked. Its general “visual review pending” status alone does not distinguish this table dependency.
3. **Druid Reincarnate — extend the fallback reference.** The druid outcome table is on p.64. Its magic-user fallback starts on p.85 and continues on p.86 (kobold through troll plus the alignment restriction and materials). Add p.86 and update the note that currently says to consult only pp.64 and 85.

These findings were sent to root and `phb_spells`; root can route the MU-extra marker fix to its separate author if applicable. They are corrections to completeness/citation metadata, rather than newly discovered numeric rule errors.

## Ten-card sample

| Card | Printed pages checked | PDF pages checked | Checks and result |
|---|---|---|---|
| Druid Heat Metal | 54, 56 | 55, 57 | Seven rounds; warm on 1/7, 1d4 on 2/6, 2d4 on 3–5; one human-sized creature's metal or 500 gp weight per caster level; fire/water/cold counters. Core values match. Disability/reverse-table coverage is partial and needs the marker described above. |
| Druid Call Lightning | 54, 57 | 55, 58 | (Caster level + 2)d8; one bolt per ten rounds; up to 36″ from caster; 1″ near path/impact; appropriate weather and ordinarily outdoors. The unusual save halves the **number of dice**, as the card says. Matches. |
| Druid Fire Seeds | 62 | 63 | Up to four acorns or eight holly berries; acorn 2d8 and 1″ burst diameter; berry 1d8; berry toss 6 feet and command range 4″; potency one turn/level; one round per seed; no mistletoe beyond actual seeds. Direct-hit versus surrounding-save distinction matches. Unclear berry diameter is correctly withheld and marked partial. |
| Druid Reincarnate | 54, 64, 85–86 | 55, 65, 86–87 | Druid deadline is one week; replacement appears in 1–6 turns; memories mostly remain but class/abilities/speech may change. Does not silently import the magic-user's different death deadline. Partial-table status is present. Extend its fallback citation through p.86. |
| Illusionist Color Spray | 94 | 95 | 1–6 creatures; relative-level unconsciousness/blindness/stun results and 2d4-round/1d4-round/2d4-segment durations; saves above caster level or at 6+ HD/levels; three colored powders. Matches. Wedge and source capacity interaction remain transparently partial. |
| Illusionist Phantasmal Killer | 98 | 99 | Apparition attacks as 4 HD and a hit kills; one 3d6 disbelief attempt against Intelligence; listed surprise/history/illusionist/helm modifiers; magic resistance first, racial/Wisdom adjustments, reflection by successful helm wearer. Matches. Range is already withheld and marked partial. |
| Illusionist Shadow Monsters | 98 | 99 | Normal-HD total limited by caster level; same-kind restriction; 20% rolled hp; believers face normal AC/attacks, disbelievers AC10 and 20% melee damage. Matches. The unusual 0.4 rounding rule is explicitly not fully extracted and already marked partial. |
| Illusionist Prismatic Spray | 93, 100 | 94, 101 | d8 ray selection, 8 giving two rays with further 8s ignored; red/orange/yellow 10/20/40 damage with no saves; remaining colors use their specified poison/petrification/wand/magic saves. Matches first-edition source, without importing later-edition damage dice. Widths are already withheld and marked partial. Color tables still await visual verification. |
| MU Polymorph Self | 78 | 79 | Wren through hippopotamus sizes; locomotion only, without attack/magic/senses/defenses; repeat changes take five segments; no system-shock/personality check; returning restores 1d12 hp. Matches. No later-edition stat-block replacement was introduced. |
| MU Magic Jar | 81 | 82 | One-round possession attempts; caster-minus-victim Intelligence+Wisdom comparison (source's Intelligence-only exception retained); all eight modifier bands; retry each round/turn/day/week by difference; host spell/language restriction; jar/body destruction and return constraints. Matches OCR. Needs explicit critical-table partial marker pending visual check. |

## Scope and remaining limits

- This review covers only the ten named cards and their cited supporting paragraphs/tables; it does not certify the other PHB cards or full spell coverage.
- No table is claimed visually verified. A matching OCR value can still conceal a scan/OCR error.
- General druid p.54 notes distinguish properly gathered greater mistletoe from lesser/borrowed mistletoe, holly and oak leaves. The numeric headers audited here should not be presented as proving all substitute components work identically; preserve that general source context.
- No author JSON was modified. Follow-up verification should inspect the resulting author edits and ordinary data tests before publication.

## Audited input snapshots

- `phb-spells.json`: `19a251993f35ea961a3304d6bb34ec918269b14e3d23eb5b6e3b2826459c1fe7`
- `phb-magic-user-extra.json`: `797c34e9d144fa5d192794a5d37f7c42e50eb8e39b427ef4b825a7e7947aba33`

