# Batch 5 continuation proposal bundle

The original source audit remains frozen at Git `679b15d1c580172e54314829c1c3c86dc78b65f3`: **32 source-reviewed same-page pairs / 44 owner-pair rows**, with 29 direct owner-passage uses, 14 related-context uses, and one field-source passage. Within those 44 rows, eight are already linked, three are covered by another complete reviewed proposal, and 33 need new owner-pair groups. The complete per-pair and per-owner reasons remain in `research/source-audit-batch5-continuation-reconciliation.json`; the fixed denominator was not rewritten when later repository integrations changed the current manifest.

The manifest subsequently grew from its frozen 60-group base to 151 groups and 278 segments after root integrated the separate UA26 batch. The current file still preserves the original 60-group prefix. `research/source-audit-batch5-continuation-final-proposal.json` pins this current manifest at SHA-256 `962b1447608f75390b5e798b333175443967913719a6d24440980fa01fdbac3b`.

The final bundle contains 36 proposed new groups: 34 from the 32/44 same-page reconciliation (33 owner-pair groups plus one related Solid Fog passage for Death Fog), one additional Druid Charm Person or Mammal p.55–56 own-passage continuation, and one separate UA p.10 Elven group for existing stable region IDs. It also contains five exact replacement objects that add relationship metadata to current PHB p.70 Invisibility groups while preserving their existing opening/continuation roles, segment order, and region IDs. Applying all 36 new groups to the current base would project 187 groups and 350 segments; the five metadata-only replacements add no segments.

The PHB p.55–56 Druid group is additional evidence outside the frozen same-page denominator. The UA p.10 legacy group is required because continuation matching is keyed to exact region IDs: its `ua-10-d3cdc07db7c18a50` and `ua-10-46ba4e69b0474ea1` IDs now point to byte-identical complete recipes used by the separate canonical pair. The Death Fog related Solid Fog group likewise uses the two existing Death Fog owner-catalog IDs after their crop recipes were corrected. It does not call Solid Fog text a Death Fog continuation and does not transfer or grade fields.

All 36 new groups and five relationship replacement objects pass `validateContinuationManifest` against the current catalog/data. The independent in-memory activation proof is `/tmp/batch5-independent-continuation-review/final-bundle-independent-review.json` (SHA-256 `c0f62d40df7cc080fb32dad5b146ff824fc34aaf03f6ebff401d50bad177fd9f`): it validates 151/278 to 187/350, 41 group recipes and 82 exact segment bindings with zero structural errors. These remain proposals: neither the new groups nor the five replacements were added to the shared manifest in this task. Fresh independent review of the four exact stable-ID recipes passed crop completeness, context and relevance with zero confirmed ink clipping. The full-image highlight sentinel remains unassessed; no value, default or exception was promoted.

The bundle also records separate inventories and exclusions. The same-page flow report contains 190 adjacent-column cues across 229 source-page records and 42 owner rows; 162 cues remain unassessed. The geometry-only consecutive-page snapshot covers 798 pairings and remains separate from the 32/44 source-reviewed set. Only the positive Druid p.55–56 case was source-reviewed and proposed here; no blanket status is inferred for the rest.

Deliverables:

- Machine-readable bundle: `research/source-audit-batch5-continuation-final-proposal.json`
- Full 32/44 reconciliation: `research/source-audit-batch5-continuation-reconciliation.json` and `.md`
- Separate Druid cross-page record: `research/source-audit-batch5-continuation-phb55-56.json` and `/workspace/scratch/batch5-continuation-druid-phb55-56-proposal.json`
- Elven stable-link group: `research/source-audit-batch5-ua10-legacy-group-proposal.json`
- Crop recipe receipt: `research/source-audit-batch5-ua10-ua69-crop-repair.json` and `.md`
