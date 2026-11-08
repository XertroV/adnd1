# DMG poison table context dependency review

**Finding:** the frozen V3 poison-row targets do not include all four tier notes. The p.20 crop includes the table and first two notes (`*`, `**`) on PDF p.21. The `***` and `****` notes are on printed p.21/PDF p.22. All nine current row targets point only to the p.20 crop; the applicable notes are missing from the four C/D rows.

This records a context-only dependency. It preserves the p.20 table crop and row foci and requires a separately linked, reviewed p.21 continuation for the C/D rows. It does not approve or change values, foci, defaults, or source grades.

| Rows | Marker | Applicable note | Current target context |
|---|---|---|---|
| Ingestive A; insinuative A | `*` | +4 save adjustment / 80% detection | Present; note glyph is a bullet, linked by ordered placement |
| Ingestive B; insinuative B | `**` | +3 / 65% | Present |
| Ingestive C; insinuative C | `***` | +2 / 40% | Missing; definition is PDF p.22 |
| Ingestive D; insinuative D | `****` | +1 / 15% | Missing; definition is PDF p.22 |
| Ingestive E | none | None | Not applicable |

Candidate V3 SHA-256: `def5f2857a92336391bfce5bf5664958a902db9d17b1ac9392252f173aa2ca83`; overlay-index SHA-256: `007e08dfc93bfd5d7416cc03746e4bfa3e012b4ec5ed2cbd965411b5f6fbb9ab`; p.20 crop SHA-256: `1d53589439baebd36b0d891d1846151fbda01ab2242d0837aebbb72a1e36a5ff`. The b0d input SHA-256 is `b0d46959c44e0d156ef5d40326af48c1f1ce9ee5b282a870c06c41010b94dcc9`; its original crop SHA-256 is `a9321ef9a403af36566a6371fa00fc0dc700629f28706fcb5a2b6d65d7672cde`. The original and V3 crops have different PNG byte hashes but matching decoded pixels (zero pixel differences).

The known-finding extension carries the original b0d record UIDs and record, row-identity, and focus hashes for the four affected rows. Existing poison findings cover row-focus associations; none covers this cross-page note dependency. The p.21 assassin +1/+2 efficiency paragraph is separate from the tier definitions and is explicitly excluded.

No source, catalog, candidate, or production data was edited. Full candidate review remains pending.

