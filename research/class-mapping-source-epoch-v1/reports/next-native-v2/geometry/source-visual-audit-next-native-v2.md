# Source visual audit next-native-v2 snapshot

The inventory covers every `sourceExcerpts` and `scanVerification` catalog referenced by the assembled `dist/data.json`. Input SHA-256: `16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573`. It is a snapshot: re-run the tool after source data or catalogs change. The complete separately supplied DMG p.175 image stays private. The user confirmed the correct edition; its cataloged limited crops retain a separate source-artifact identity and have no canonical-PDF page ordinal. PDF-only word-box analysis cannot assess their source geometry or semantic completeness.

The `[0, 0, 1, 1]` focus rectangle is a suspected overhighlight pending per-region review; hiding the overlay is not semantic verification. Context labels are only heuristics and may describe a mixed heading-and-row crop. For each catalog binding, a page ordinal is computed within the item/book/printed-page group; viewer ordinal applies the current context-last role ordering and selected catalog. Other navigation and deep links can select another region.

Crop-edge candidates are word-box intersections from the PDF text layer, using only original PDF geometry and hashes. A candidate is not a defect: OCR alignment, intentional partial context and neighboring columns can produce false positives. Text-layer misses do not establish safety. Review actual image pixels and source pages.

## Counts

```json
{
  "regionUsages": 4216,
  "uniqueImageHashes": 1415,
  "uniqueImageGeometryBindings": 1409,
  "sentinelUsages": 2185,
  "partialFocusUsages": 1882,
  "knownHeadingOnlyUsages": 43,
  "knownHeadingOnlyFirstInPageGroup": 0,
  "knownHeadingOnlyFirstWithSibling": 0,
  "knownHeadingOnlyViewerDefault": 0,
  "defaultContextLabelCandidates": 313,
  "viewerDefaultContextLabelCandidates": 310,
  "sentinelUsagesByCollection": {
    "classes": 187,
    "equipment": 317,
    "matrices": 3,
    "progressionExplainer": 10,
    "rules": 246,
    "spells": 1422
  },
  "candidateImageGeometryBindings": 378,
  "candidateUniqueImages": 378,
  "candidateLinkedUsages": 1102,
  "usagesByBook": {
    "DMG": 905,
    "MM": 57,
    "MM2": 2,
    "PHB": 1952,
    "UA": 1300
  },
  "usagesByCollection": {
    "classes": 471,
    "equipment": 1210,
    "matrices": 6,
    "progressionExplainer": 10,
    "rules": 1079,
    "spells": 1440
  },
  "sentinelUsagesByBook": {
    "DMG": 159,
    "MM": 15,
    "MM2": 2,
    "PHB": 1272,
    "UA": 737
  },
  "boundsTypes": {
    "boundsPdfPoints": 155,
    "flat": 902,
    "nested": 118,
    "object": 3041
  },
  "candidateBindingsByBook": {
    "DMG": 62,
    "MM": 3,
    "PHB": 188,
    "UA": 125
  },
  "candidateUsagesByCollection": {
    "classes": 106,
    "equipment": 418,
    "progressionExplainer": 3,
    "rules": 282,
    "spells": 293
  },
  "cropEdgeAssessments": {
    "assessed-text-layer": 3069,
    "candidate-text-box-crossing": 1102,
    "not-assessable-supplemental-image-format": 45
  }
}
```

No image or source PDF hash mismatches or unmappable region bounds were found.

The confirmed heading-only PHB p.35 image has 43 linked usages; 0 are first in their same-catalog page group, and 0 are the current viewer default after role ordering. Every first occurrence has a sibling on that page. This exact-image finding does not establish semantic roles for other crops.

## Review queues

- `source-visual-audit-next-native-v2-queue-phb-equipment.json`: 49 unique image/geometry candidates; 231 linked usages.
- `source-visual-audit-next-native-v2-queue-nonphb-equipment.json`: 15 unique image/geometry candidates; 187 linked usages.
- `source-visual-audit-next-native-v2-queue-other-records.json`: 315 unique image/geometry candidates; 684 linked usages.

## Highest-linked candidates

| Candidate | Book/page | Linked usages | Text boxes crossing edge |
| --- | --- | ---: | ---: |
| `edge-00cd38cc1d441ffb` | UA 27 | 69 | 16 |
| `edge-b12f295785e3abba` | DMG 36 | 60 | 1 |
| `edge-aad2d197c53781d5` | DMG 37 | 57 | 2 |
| `edge-f09fac56f32c3641` | PHB 54 | 52 | 2 |
| `edge-f99634b466eb4983` | PHB 35 | 43 | 1 |
| `edge-aa406989650e9ff9` | DMG 225 | 42 | 1 |
| `edge-3ca156f88979ec8d` | UA 15 | 40 | 1 |
| `edge-fb144d5ca640ae71` | DMG 36 | 26 | 1 |
| `edge-2b2f73ba5c620955` | PHB 37 | 25 | 5 |
| `edge-3d97de711795ed50` | PHB 117 | 24 | 4 |

Stable candidate IDs bind image hash, source book/PDF page and normalized PDF-point bounds. Shared images can occur in multiple queues. Coordinates and all linked usages are in the baseline JSON; private PDF paths and full source text are not included.
