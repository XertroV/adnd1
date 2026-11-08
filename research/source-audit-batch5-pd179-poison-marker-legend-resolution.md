# DMG poison-table marker legend source review

Append-only source-pixel supplement to the frozen PD179 first-90 review. This resolves the four source-semantic uncertainties for the printed `***` and `****` rows without changing or reapproving the candidate, row values, or row-focus geometry. The exact row/crop/focus/overlay hashes and nine row identities are recorded in the companion JSON.

| Marker in row | Legend meaning | Association | Rows |
|---|---|---|---|
| `*` | Save adjustment +4; detection chance 80% | First table note is a filled round bullet, not a visually identical asterisk; linked by ordered placement | Ingestive A; insinuative A |
| `**` | Save adjustment +3; detection chance 65% | Direct printed marker match | Ingestive B; insinuative B |
| `***` | Save adjustment +2; detection chance 40% | Direct printed marker match | Ingestive C; insinuative C |
| `****` | Save adjustment +1; detection chance 15% | Direct printed marker match | Ingestive D; insinuative D |
| none | No marker legend applies | Source table prints E without a marker | Ingestive E |

Original DMG 1st Edition source PDF SHA-256: `7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669`. The table and first two notes are on printed p. 20 (PDF p. 21); the `***` and `****` notes continue on printed p. 21 (PDF p. 22). Both pages were rendered at 300 dpi from the original PDF and visually reviewed. The table crop SHA is `4630607e4dc6036acb0c042071d9f040200fee1222c2998e137f6176170ddd2c`; the continuation crop SHA is `05fadc90eb4399ff436fabbf9e319b4ffee986e06e7011fc160544f9d2c97b21`.

The p. 21 continuation also has a separate character-type efficiency rule for poisons outside those listed in the table and points back to “Assassins’ Use of Poisons” on p. 20. Its +1/+2 adjustments concern assassin/non-assassin use of other poisons; they are distinct from the table footnote tiers. The p. 64 ingestive-orifice passage is also a separate splash-delivery mechanic, not a marker definition. A full-document text search was used only to locate candidate passages; the poison table and both note pages were visually checked against original raster pixels.

Previously uncertain rows now resolved: `dmg-poison-ingestive-c`, `dmg-poison-ingestive-d`, `dmg-poison-insinuative-c`, and `dmg-poison-insinuative-d`. Their old uncertainty assessments remain untouched in the historical review.

No source/catalog/data artifacts changed. The frozen proposal remains pending its own integration review; this supplement is not a candidate approval.
