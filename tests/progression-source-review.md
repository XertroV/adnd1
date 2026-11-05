# Progression labels: bounded source review

This review adds classification metadata for the existing sixteen class guides. It does not change class mechanics, XP data, class eligibility, or character-generation procedures. The baseline `classes.json` contains 1,040 level-change groups and 114 sparse XP rows; its SHA-256 before this work is `b8937bafaaabdea2d3e1d01924b64a17f0e7df3a19bcefb2ab61970e85dd5932`.

## Source evidence

The authoritative PHB is the sixth printing, January 1980; the UA source is the original 1985 book. Library text was read at these printed/PDF locations:

| Printed source | PDF pages | Relevant wording or rule |
| --- | --- | --- |
| PHB 32–33 | 33–34 | Separately presents concurrent, race-qualified multi-class combinations and the human profession-change procedure. |
| PHB 117–118 | 118–119 | Bard qualifications, fighter-to-thief-to-bard sequence, separate bard XP, and retained earlier abilities. |
| UA 23 | 24 | Thief-acrobat is described as a “split-class” specialist after five thief levels; sixth-level qualification and six weeks of training under a level-10+ specialist. |
| UA 25 | 26 | Except for its stated changes, thief-acrobat is treated as a thief, including followers and other special abilities. |
| UA 16–17 | 17–18 | Paladin becomes a cavalier subclass; Grand Druid can abdicate into the advanced Hierophant category with an XP reset. |

This is OCR-only evidence. Source page images remain unavailable through the current native image-pointer/transfer route. No numeric monster statistics, PDF transfers, or visual-verification claims are added.

## Classification decisions

- Twelve regular guides receive **Class track**. This describes a guide's progression table and makes no finding about whether a race may include the class in a permitted combination.
- **Bard: Special sequential progression.** The appendix gives a fighter → thief → bard sequence, permits humans or half-elves, and counts bard XP separately. Druidic tutelage is bard study, rather than an inserted additional druid-class stage.
- **Thief-acrobat: Thief specialist path.** The metadata retains UA's specialist terminology and the specific thief-level transition; it does not turn that term into an ordinary concurrent combination.
- **UA druid: Advanced XP reset track.** The Hierophant category continues druid progression on a new XP scale after the stated Grand Druid transition.
- **UA paladin: UA subclass revision.** The PHB paladin progression remains, with UA's changed parent subclass and additional cavalier abilities.

The explainer uses *dual-class* as an editorial navigation gloss. The PHB p. 33 heading is *The Character With Two Classes*. That procedure requires a human, stops original-class advancement, and applies the principal-attribute and former-function restrictions. PHB pp. 32–33 instead describes permitted non-human/semi-human combinations operated concurrently. These passages do not establish a general third-class policy.

## Legacy Bard wording requiring root integration

The exact item is `classes[id="bard"].guidance[1]`, currently at `classes.json:8651`; the assembled copy is at `dist/data.json:35042`:

> Begin as a fighter; change to thief after level 5 and before level 8, then enter bard study after thief levels 5–8.

PHB printed p. 117 / PDF p. 118 permits the first change after reaching at least fifth level and before attaining eighth. It describes the later thief-stage change as “between 5th and 9th”; the available passage does not explicitly resolve that boundary convention. The legacy range therefore states more than this source review can establish, and “after level 5” can also imply an unintended sixth-level minimum.

Proposed conservative replacement, for root to apply after source review:

> After reaching fighter level 5 and before attaining level 8, change to thief; the thief-stage transition is described as “between 5th and 9th” (boundary convention not resolved here).

The new Bard classification already uses this conservative boundary wording. This agent does not edit `classes.json` or the assembled data.

The PHB p. 33 human-only general profession-change rule and the appendix's half-elf Bard permission have different stated scopes. The metadata does not automatically impose the general procedure on the Bard's special sequence. UA's “split-class” term is also preserved as book vocabulary, rather than silently normalized to an ordinary multiclass badge.

## Validation

Run `node --test tests/progression.test.mjs`. The tests require all sixteen existing IDs, restrict overrides to icon/progression fields, validate printed-page references and OCR-only status, and guard the four special classifications and race-qualified explainer. Source spot-review by the independent helper confirmed the PHB distinction, all four special labels, their stated qualifications, and the conservative Bard transition wording.

Executed successfully: **9 tests passed, 0 failed**. The post-test `classes.json` hash matches the baseline above.

The class-mechanics file hash must remain unchanged for this metadata-only task. Existing monk attack-table conflict notes, the UA druid reset tracks, and the assassin level-2 XP gap are preserved. Root owns assembly and deployment; no application, assembled-data, Git, or hosting changes are made here.

Root integration: the conservative Bard guidance replacement above was subsequently applied as a single-line correction in `classes.json`. The earlier byte-identical hash describes the metadata agent's handoff, not the integrated release. XP rows, level-change groups, reset tracks, source conflicts and unreadable mechanics were retained.
