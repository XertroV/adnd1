# Source visual audit batch6-jo-master-v1 snapshot

The inventory covers every `sourceExcerpts` and `scanVerification` catalog referenced by the assembled `dist/data.json`. Input SHA-256: `774207ffe87fa91c4ba19d632e876d6831b73fe471dabd555103c290ffaf71c0`. It is a snapshot: re-run the tool after source data or catalogs change. The separately supplied private DMG 175 image is not a published excerpt and is excluded.

The `[0, 0, 1, 1]` focus rectangle is a suspected overhighlight pending per-region review; hiding the overlay is not semantic verification. Context labels are only heuristics and may describe a mixed heading-and-row crop. For each catalog binding, a page ordinal is computed within the item/book/printed-page group; viewer ordinal applies the current context-last role ordering and selected catalog. Other navigation and deep links can select another region.

Crop-edge candidates are word-box intersections from the PDF text layer, using only original PDF geometry and hashes. A candidate is not a defect: OCR alignment, intentional partial context and neighboring columns can produce false positives. Text-layer misses do not establish safety. Review actual image pixels and source pages.

## Counts

```json
{
  "regionUsages": 3076,
  "uniqueImageHashes": 1284,
  "uniqueImageGeometryBindings": 1284,
  "sentinelUsages": 2151,
  "partialFocusUsages": 872,
  "knownHeadingOnlyUsages": 43,
  "knownHeadingOnlyFirstInPageGroup": 0,
  "knownHeadingOnlyFirstWithSibling": 0,
  "knownHeadingOnlyViewerDefault": 0,
  "defaultContextLabelCandidates": 232,
  "viewerDefaultContextLabelCandidates": 229,
  "sentinelUsagesByCollection": {
    "classes": 147,
    "equipment": 317,
    "matrices": 3,
    "progressionExplainer": 9,
    "rules": 246,
    "spells": 1429
  },
  "candidateImageGeometryBindings": 368,
  "candidateUniqueImages": 368,
  "candidateLinkedUsages": 859,
  "usagesByBook": {
    "DMG": 269,
    "MM": 15,
    "MM2": 2,
    "PHB": 1660,
    "UA": 1130
  },
  "usagesByCollection": {
    "classes": 160,
    "equipment": 1196,
    "matrices": 3,
    "progressionExplainer": 9,
    "rules": 269,
    "spells": 1439
  },
  "sentinelUsagesByBook": {
    "DMG": 159,
    "MM": 15,
    "MM2": 2,
    "PHB": 1257,
    "UA": 718
  },
  "boundsTypes": {
    "boundsPdfPoints": 74,
    "flat": 741,
    "nested": 114,
    "object": 2147
  },
  "candidateBindingsByBook": {
    "DMG": 56,
    "MM": 3,
    "PHB": 181,
    "UA": 128
  },
  "candidateUsagesByCollection": {
    "classes": 42,
    "equipment": 415,
    "progressionExplainer": 4,
    "rules": 100,
    "spells": 298
  },
  "cropEdgeAssessments": {
    "assessed-text-layer": 2217,
    "candidate-text-box-crossing": 859
  }
}
```

No image or source PDF hash mismatches or unmappable region bounds were found.

The confirmed heading-only PHB p.35 image has 43 linked usages; 0 are first in their same-catalog page group, and 0 are the current viewer default after role ordering. Every first occurrence has a sibling on that page. This exact-image finding does not establish semantic roles for other crops.

## Review queues

- `source-visual-audit-batch6-jo-master-v1-queue-phb-equipment.json`: 49 unique image/geometry candidates; 231 linked usages.
- `source-visual-audit-batch6-jo-master-v1-queue-nonphb-equipment.json`: 15 unique image/geometry candidates; 184 linked usages.
- `source-visual-audit-batch6-jo-master-v1-queue-other-records.json`: 305 unique image/geometry candidates; 444 linked usages.

## Highest-linked candidates

| Candidate | Book/page | Linked usages | Text boxes crossing edge |
| --- | --- | ---: | ---: |
| `edge-00cd38cc1d441ffb` | UA 27 | 69 | 16 |
| `edge-f09fac56f32c3641` | PHB 54 | 52 | 2 |
| `edge-f99634b466eb4983` | PHB 35 | 43 | 1 |
| `edge-aa406989650e9ff9` | DMG 225 | 39 | 1 |
| `edge-2b2f73ba5c620955` | PHB 37 | 25 | 5 |
| `edge-ee616abc801e4910` | PHB 36 | 20 | 8 |
| `edge-570f5df04b8c9bf5` | PHB 39 | 18 | 7 |
| `edge-132fc2e44ed2e040` | UA 75 | 16 | 5 |
| `edge-12a7545d00c0a7ba` | PHB 12 | 15 | 7 |
| `edge-1bbd5111fd66e96c` | DMG 225 | 15 | 1 |

Stable candidate IDs bind image hash, source book/PDF page and normalized PDF-point bounds. Shared images can occur in multiple queues. Coordinates and all linked usages are in the baseline JSON; private PDF paths and full source text are not included.
