# Original attack matrix source review — 4 November 2026

## Deliverable and coverage

`attack-matrices.json` contains a source-grounded **partial** transcription of DMG matrix I.B on printed p.74 (supplied PDF p.75), plus separately cited explanatory notes. The source is the user-provided revised December 1979 DMG. No source PDF or wholesale OCR is included.

The schema preserves all 10 attacker-level bands, including the source's separate 0-level halfling/human column, and all 21 defender AC columns from 10 down to −10. Only completely legible rows with explicit AC labels were transcribed: AC 7, 6, 5, 1, 0, −1, and −6. This yields 70 numeric cells and 140 null cells. Null means unreadable or unlocated in the current OCR, not an impossible hit or a zero target.

The OCR loses numerous row labels and cells elsewhere. Even apparently predictable sequences were not reconstructed. A full-table claim is therefore unsupported until visual source access is available. The Library image route currently exposes only image-pointer metadata; PDF transfers remain proxy-denied.

## Original matrix versus simple THAC0

The legible AC-zero row supports the existing quick-reference progression, including target 18 for fighter levels 3–4 and 16 for levels 5–6. This quick reference should remain useful to the user's group.

A simple subtraction from that AC-zero target does not reproduce every original table cell. Two directly legible examples, without other adjustments in the illustration:

- Fighter levels 1–2: AC zero target 20; against AC −1, simple subtraction gives 21 while the matrix cell remains 20.
- Fighter levels 3–4: AC zero target 18; against AC −6, simple subtraction gives 24 while the matrix cell is 20.

These examples illustrate the printed matrix's repeated 20s. They do not authorize filling missing cells with a formula, do not change the group's existing convention, and do not settle every modifier or special-defense case.

## Source qualifications

- **DMG p.70:** the listed kinds of spell adjustments, including curse, prayer, and protection from evil, are applied through the relevant armor class rather than by reducing the attack die result. The source explains why the nonlinear table makes that distinction matter. This is not a blanket statement that every attack modifier changes AC.
- **DMG p.74:** missile adjustments are −2 at medium range and −5 at long range. The source also separately offers optional per-level fighter advancement: +1 to hit at the second level of each two-level band. The ordinary table's bands remain distinct from that option.
- **DMG p.82:** after explaining repeated 20s, the source offers an optional amendment requiring natural 20s for the second and subsequent repeated-20 entries, and natural 20 plus sufficient bonus for targets above 20. Its initial 20 entry can be achieved by die result plus bonuses. This optional amendment must not be presented as an unconditional baseline rule.
- **DMG p.74:** bards use their highest attained fighter level on this matrix. The level-0 column is not a generic level-0 fighter advancement row.

## Validation

Integrity checks passed: 10 bands × 21 targets, exactly 70 populated cells and 140 nulls, and both comparison examples agree with the stored AC-zero and target-AC cells. Every known value remains OCR-checked and visually unverified. No application or interface files were edited by this reviewer.
