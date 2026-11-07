# Source visual audit release snapshot

The inventory covers every `sourceExcerpts` and `scanVerification` catalog referenced by the assembled `dist/data.json`. Input SHA-256: `47908c8ddc8b68c09e11f600ed0d0dc24b2a3749f8e3f452e245c7ee6635053b`. It is a snapshot: re-run the tool after source data or catalogs change. The separately supplied private DMG 175 image is not a published excerpt and is excluded.

The `[0, 0, 1, 1]` focus rectangle is a suspected overhighlight pending per-region review; hiding the overlay is not semantic verification. Context labels are only heuristics and may describe a mixed heading-and-row crop. For each catalog binding, a page ordinal is computed within the item/book/printed-page group; viewer ordinal applies the current context-last role ordering and selected catalog. Other navigation and deep links can select another region.

Crop-edge candidates are word-box intersections from the PDF text layer, using only original PDF geometry and hashes. A candidate is not a defect: OCR alignment, intentional partial context and neighboring columns can produce false positives. Text-layer misses do not establish safety. Review actual image pixels and source pages.

## Counts

```json
{
  "regionUsages": 2742,
  "uniqueImageHashes": 1383,
  "uniqueImageGeometryBindings": 1383,
  "sentinelUsages": 2245,
  "partialFocusUsages": 485,
  "knownHeadingOnlyUsages": 43,
  "knownHeadingOnlyFirstInPageGroup": 1,
  "knownHeadingOnlyFirstWithSibling": 1,
  "knownHeadingOnlyViewerDefault": 0,
  "defaultContextLabelCandidates": 185,
  "viewerDefaultContextLabelCandidates": 180,
  "sentinelUsagesByCollection": {
    "classes": 160,
    "equipment": 383,
    "matrices": 3,
    "progressionExplainer": 9,
    "rules": 252,
    "spells": 1438
  },
  "candidateImageGeometryBindings": 464,
  "candidateUniqueImages": 464,
  "candidateLinkedUsages": 916,
  "usagesByBook": {
    "DMG": 216,
    "MM": 15,
    "MM2": 2,
    "PHB": 1594,
    "UA": 915
  },
  "usagesByCollection": {
    "classes": 160,
    "equipment": 871,
    "matrices": 3,
    "progressionExplainer": 9,
    "rules": 260,
    "spells": 1439
  },
  "sentinelUsagesByBook": {
    "DMG": 163,
    "MM": 15,
    "MM2": 2,
    "PHB": 1300,
    "UA": 765
  },
  "boundsTypes": {
    "boundsPdfPoints": 134,
    "flat": 806,
    "nested": 115,
    "object": 1687
  },
  "candidateBindingsByBook": {
    "DMG": 66,
    "MM": 3,
    "PHB": 202,
    "UA": 193
  },
  "candidateUsagesByCollection": {
    "classes": 42,
    "equipment": 464,
    "progressionExplainer": 4,
    "rules": 108,
    "spells": 298
  },
  "cropEdgeAssessments": {
    "assessed-text-layer": 1826,
    "candidate-text-box-crossing": 916
  }
}
```

No image or source PDF hash mismatches or unmappable region bounds were found.

The confirmed heading-only PHB p.35 image has 43 linked usages; 1 are first in their same-catalog page group, and 0 are the current viewer default after role ordering. Every first occurrence has a sibling on that page. This exact-image finding does not establish semantic roles for other crops.

## Review queues

- `source-visual-audit-release-queue-phb-equipment.json`: 70 unique image/geometry candidates; 285 linked usages.
- `source-visual-audit-release-queue-nonphb-equipment.json`: 79 unique image/geometry candidates; 179 linked usages.
- `source-visual-audit-release-queue-other-records.json`: 316 unique image/geometry candidates; 452 linked usages.

## Highest-linked candidates

| Candidate | Book/page | Linked usages | Text boxes crossing edge |
| --- | --- | ---: | ---: |
| `edge-f09fac56f32c3641` | PHB 54 | 52 | 2 |
| `edge-f99634b466eb4983` | PHB 35 | 43 | 1 |
| `edge-a1745cee8e9810b0` | UA 28 | 25 | 16 |
| `edge-2b2f73ba5c620955` | PHB 37 | 25 | 5 |
| `edge-ee616abc801e4910` | PHB 36 | 20 | 8 |
| `edge-570f5df04b8c9bf5` | PHB 39 | 18 | 7 |
| `edge-4687e4476ca9d4bf` | PHB 38 | 18 | 2 |
| `edge-d6f4ee7c456ed016` | PHB 37 | 17 | 4 |
| `edge-c369921a1b27fca2` | PHB 38 | 16 | 9 |
| `edge-12a7545d00c0a7ba` | PHB 12 | 15 | 7 |

Stable candidate IDs bind image hash, source book/PDF page and normalized PDF-point bounds. Shared images can occur in multiple queues. Coordinates and all linked usages are in the baseline JSON; private PDF paths and full source text are not included.
