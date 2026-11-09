# Focus correction V2 candidate

This research-only delta preserves the complete V1 source values, row joins, citations, table groups, marker, and note foci. It changes only the PHB p. 38 Axe, hand and Hammer left-band upper bounds after the independent V1 review found clipped upper glyph strokes. Axe now begins at source-crop y=60; Hammer begins at y=332. Their right Armor Class bands and the other thirteen PHB rows retain V1 geometry.

The UA p. 28 Aklys footnote marker and focus are carried from V1, which the root accepted for the bounded source/focus scope in `research/missile-table-discoverability/root-corrected-focus-partial-review-v2.json`. The remaining PHB row focus geometry is still pending independent review. Both table source-context defaults remain pending; no active excerpt registration, source-value grade, mechanics grade, or publication is claimed.

`focus-correction-proposal.json` and `focus-correction-manifest.json` pin V1, the independent root correction review, inputs, outputs, implementation file hashes, and the V2 private overlay manifest. The overlays under `/workspace/vault-audit-private/pass8/missile-table-discoverability/focus-correction-v2/` are private review artifacts; they are not source pages or focus approval.

Run the focused geometry/value checks with:

```sh
node --test tests/missile-table-focus-correction-v2.test.mjs
```
