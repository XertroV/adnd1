# Source visual audit baseline

The inventory covers every `sourceExcerpts` and `scanVerification` catalog referenced by the assembled `dist/data.json`. Input SHA-256: `a52f981098d4a0e437ff44b06fad9886e4f8b69f200a2173d11bb3d903a713cc`. It is a snapshot: re-run the tool after source data or catalogs change. The separately supplied private DMG 175 image is not a published excerpt and is excluded.

The `[0, 0, 1, 1]` focus rectangle is a legacy blanket-focus sentinel; its presence is not semantic verification. Context labels are only heuristics and may describe a mixed heading-and-row crop. For each catalog binding, a page ordinal is computed within the item/book/printed-page group; viewer ordinal applies the current context-last role ordering and selected catalog. Other navigation and deep links can select another region.

Crop-edge candidates are word-box intersections from the PDF text layer, using only original PDF geometry and hashes. A candidate is not a defect: OCR alignment, intentional partial context and neighboring columns can produce false positives. Text-layer misses do not establish safety. Review actual image pixels and source pages.

## Counts

```json
{
  "regionUsages": 2569,
  "uniqueImageHashes": 1452,
  "uniqueImageGeometryBindings": 1452,
  "sentinelUsages": 2417,
  "partialFocusUsages": 152,
  "knownHeadingOnlyUsages": 45,
  "knownHeadingOnlyFirstInPageGroup": 20,
  "knownHeadingOnlyFirstWithSibling": 20,
  "knownHeadingOnlyViewerDefault": 20,
  "defaultContextLabelCandidates": 209,
  "viewerDefaultContextLabelCandidates": 207,
  "sentinelUsagesByCollection": {
    "classes": 139,
    "equipment": 585,
    "matrices": 3,
    "rules": 258,
    "spells": 1432
  },
  "candidateImageGeometryBindings": 690,
  "candidateUniqueImages": 690,
  "candidateLinkedUsages": 1207,
  "usagesByBook": {
    "DMG": 215,
    "MM": 15,
    "MM2": 2,
    "PHB": 1439,
    "UA": 898
  },
  "usagesByCollection": {
    "classes": 139,
    "equipment": 737,
    "matrices": 3,
    "rules": 258,
    "spells": 1432
  },
  "sentinelUsagesByBook": {
    "DMG": 215,
    "MM": 15,
    "MM2": 2,
    "PHB": 1339,
    "UA": 846
  },
  "boundsTypes": {
    "boundsPdfPoints": 152,
    "flat": 831,
    "nested": 125,
    "object": 1461
  },
  "candidateBindingsByBook": {
    "DMG": 110,
    "MM": 10,
    "PHB": 341,
    "UA": 229
  },
  "candidateUsagesByCollection": {
    "classes": 93,
    "equipment": 563,
    "matrices": 2,
    "rules": 180,
    "spells": 369
  }
}
```

No image or source PDF hash mismatches or unmappable region bounds were found.

The confirmed heading-only PHB p.35 image has 45 linked usages; 20 are first in their same-catalog page group, and 20 are the current viewer default after role ordering. Every first occurrence has a sibling on that page. This exact-image finding does not establish semantic roles for other crops.

## Review queues

- `source-visual-audit-queue-phb-equipment.json`: 137 unique image/geometry candidates; 361 linked usages.
- `source-visual-audit-queue-nonphb-equipment.json`: 96 unique image/geometry candidates; 202 linked usages.
- `source-visual-audit-queue-other-records.json`: 458 unique image/geometry candidates; 644 linked usages.

## Highest-linked candidates

| Candidate | Book/page | Linked usages | Text boxes crossing edge |
| --- | --- | ---: | ---: |
| `edge-f09fac56f32c3641` | PHB 54 | 52 | 2 |
| `edge-f99634b466eb4983` | PHB 35 | 45 | 1 |
| `edge-4a531efb36a3df59` | PHB 35 | 30 | 1 |
| `edge-2b2f73ba5c620955` | PHB 37 | 27 | 5 |
| `edge-a1745cee8e9810b0` | UA 28 | 26 | 16 |
| `edge-ee616abc801e4910` | PHB 36 | 20 | 8 |
| `edge-570f5df04b8c9bf5` | PHB 39 | 18 | 7 |
| `edge-d6f4ee7c456ed016` | PHB 37 | 18 | 4 |
| `edge-4687e4476ca9d4bf` | PHB 38 | 18 | 2 |
| `edge-c369921a1b27fca2` | PHB 38 | 16 | 9 |

Stable candidate IDs bind image hash, source book/PDF page and normalized PDF-point bounds. Shared images can occur in multiple queues. Coordinates and all linked usages are in the baseline JSON; private PDF paths and full source text are not included.
