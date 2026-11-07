# Source visual audit release snapshot

The inventory covers every `sourceExcerpts` and `scanVerification` catalog referenced by the assembled `dist/data.json`. Input SHA-256: `d63e2bc553be886fd5effa24ab170ace5673d42b4f310d567f0529d786a48ef4`. It is a snapshot: re-run the tool after source data or catalogs change. The separately supplied private DMG 175 image is not a published excerpt and is excluded.

The `[0, 0, 1, 1]` focus rectangle is a suspected overhighlight pending per-region review; hiding the overlay is not semantic verification. Context labels are only heuristics and may describe a mixed heading-and-row crop. For each catalog binding, a page ordinal is computed within the item/book/printed-page group; viewer ordinal applies the current context-last role ordering and selected catalog. Other navigation and deep links can select another region.

Crop-edge candidates are word-box intersections from the PDF text layer, using only original PDF geometry and hashes. A candidate is not a defect: OCR alignment, intentional partial context and neighboring columns can produce false positives. Text-layer misses do not establish safety. Review actual image pixels and source pages.

## Counts

```json
{
  "regionUsages": 2640,
  "uniqueImageHashes": 1451,
  "uniqueImageGeometryBindings": 1451,
  "sentinelUsages": 2236,
  "partialFocusUsages": 404,
  "knownHeadingOnlyUsages": 45,
  "knownHeadingOnlyFirstInPageGroup": 20,
  "knownHeadingOnlyFirstWithSibling": 20,
  "knownHeadingOnlyViewerDefault": 0,
  "defaultContextLabelCandidates": 212,
  "viewerDefaultContextLabelCandidates": 209,
  "sentinelUsagesByCollection": {
    "classes": 139,
    "equipment": 398,
    "matrices": 3,
    "progressionExplainer": 8,
    "rules": 250,
    "spells": 1438
  },
  "candidateImageGeometryBindings": 552,
  "candidateUniqueImages": 552,
  "candidateLinkedUsages": 1051,
  "usagesByBook": {
    "DMG": 215,
    "MM": 15,
    "MM2": 2,
    "PHB": 1499,
    "UA": 909
  },
  "usagesByCollection": {
    "classes": 139,
    "equipment": 793,
    "matrices": 3,
    "progressionExplainer": 8,
    "rules": 258,
    "spells": 1439
  },
  "sentinelUsagesByBook": {
    "DMG": 162,
    "MM": 15,
    "MM2": 2,
    "PHB": 1285,
    "UA": 772
  },
  "boundsTypes": {
    "boundsPdfPoints": 152,
    "flat": 821,
    "nested": 116,
    "object": 1551
  },
  "candidateBindingsByBook": {
    "DMG": 66,
    "MM": 3,
    "PHB": 273,
    "UA": 210
  },
  "candidateUsagesByCollection": {
    "classes": 57,
    "equipment": 582,
    "progressionExplainer": 5,
    "rules": 109,
    "spells": 298
  }
}
```

No image or source PDF hash mismatches or unmappable region bounds were found.

The confirmed heading-only PHB p.35 image has 45 linked usages; 20 are first in their same-catalog page group, and 0 are the current viewer default after role ordering. Every first occurrence has a sibling on that page. This exact-image finding does not establish semantic roles for other crops.

## Review queues

- `source-visual-audit-release-queue-phb-equipment.json`: 138 unique image/geometry candidates; 380 linked usages.
- `source-visual-audit-release-queue-nonphb-equipment.json`: 96 unique image/geometry candidates; 202 linked usages.
- `source-visual-audit-release-queue-other-records.json`: 319 unique image/geometry candidates; 469 linked usages.

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
