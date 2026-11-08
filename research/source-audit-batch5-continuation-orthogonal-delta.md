# Orthogonal crop-edge detector delta

This report compares the historical per-axis word-box test with the corrected orthogonal-overlap test on the frozen `679b15d1c580172e54314829c1c3c86dc78b65f3` tree. Inputs match except for detector-code SHA-256. The existing source-pixel review and its 73-page/887-region judgments remain unchanged.

The old test emitted boundary flags for a word box even when it lay outside the crop on the other axis. The corrected test requires actual positive overlap along the perpendicular axis while preserving the existing 0.5-point edge tolerance.

| Measure | Old | Corrected | Change |
| --- | ---: | ---: | ---: |
| Assessed region rows with any crop signal | 2383 | 1617 | −766 rows lose every cue |
| Rows with word-box edge flag | 2257 | 664 | −1593 |
| Word-box edge observations, L/R/T/B | L 2198, R 2704, T 12556, B 13519 | L 239, R 247, T 1754, B 2776 | −25961 total |
| Word-box-only source pages | 11 | 7 | −4 |
| Invalid/missing crop geometry | 249 | 249 | unchanged |

Of the 1593 region rows that lost the edge flag, 827 retain another endpoint/shape cue and 766 have no remaining implemented cue. That is a geometry precision change only: no no-signal result is a semantic pass. Same-page/adjacent-page flow candidates are unchanged (190 candidate pages, 42 pair candidates, 41 unlinked pairs).

The historical UA p.60 Contingency crop still has a real left-edge issue after correction: 30 source word boxes intersect its crop vertically and cross its left edge. The previous count of 68 included 38 boxes outside the crop’s vertical span. The crop was repaired separately in the current continuation integration with source pixels; this baseline comparison does not incorporate current-catalog changes.

The regenerated numeric summary and compressed full report are hash-bound in `source-audit-batch5-continuation-orthogonal-delta.json`. No source text or private PDFs are included.
