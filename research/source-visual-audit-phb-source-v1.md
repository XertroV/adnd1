# Source visual audit phb-source-v1 snapshot

The inventory covers every `sourceExcerpts` and `scanVerification` catalog referenced by the assembled `dist/data.json`. Input SHA-256: `416ebc32862105042904e40280034772a51640d1ccbba298b9b8bf5ccbf709fe`. It is a snapshot: re-run the tool after source data or catalogs change. The complete separately supplied DMG p.175 image stays private. The user confirmed the correct edition; its two published limited excerpts retain a separate source-artifact identity and have no canonical-PDF page ordinal. PDF-only word-box analysis cannot assess their source geometry.

The `[0, 0, 1, 1]` focus rectangle is a suspected overhighlight pending per-region review; hiding the overlay is not semantic verification. Context labels are only heuristics and may describe a mixed heading-and-row crop. For each catalog binding, a page ordinal is computed within the item/book/printed-page group; viewer ordinal applies the current context-last role ordering and selected catalog. Other navigation and deep links can select another region.

Crop-edge candidates are word-box intersections from the PDF text layer, using only original PDF geometry and hashes. A candidate is not a defect: OCR alignment, intentional partial context and neighboring columns can produce false positives. Text-layer misses do not establish safety. Review actual image pixels and source pages.

## Counts

```json
{
  "regionUsages": 3414,
  "uniqueImageHashes": 1303,
  "uniqueImageGeometryBindings": 1301,
  "sentinelUsages": 2192,
  "partialFocusUsages": 1169,
  "knownHeadingOnlyUsages": 43,
  "knownHeadingOnlyFirstInPageGroup": 0,
  "knownHeadingOnlyFirstWithSibling": 0,
  "knownHeadingOnlyViewerDefault": 0,
  "defaultContextLabelCandidates": 237,
  "viewerDefaultContextLabelCandidates": 234,
  "sentinelUsagesByCollection": {
    "classes": 187,
    "equipment": 317,
    "matrices": 3,
    "progressionExplainer": 10,
    "rules": 246,
    "spells": 1429
  },
  "candidateImageGeometryBindings": 367,
  "candidateUniqueImages": 367,
  "candidateLinkedUsages": 920,
  "usagesByBook": {
    "DMG": 335,
    "MM": 15,
    "MM2": 2,
    "PHB": 1856,
    "UA": 1206
  },
  "usagesByCollection": {
    "classes": 429,
    "equipment": 1196,
    "matrices": 6,
    "progressionExplainer": 10,
    "rules": 334,
    "spells": 1439
  },
  "sentinelUsagesByBook": {
    "DMG": 159,
    "MM": 15,
    "MM2": 2,
    "PHB": 1275,
    "UA": 741
  },
  "boundsTypes": {
    "boundsPdfPoints": 104,
    "flat": 844,
    "nested": 117,
    "object": 2349
  },
  "candidateBindingsByBook": {
    "DMG": 56,
    "MM": 3,
    "PHB": 181,
    "UA": 127
  },
  "candidateUsagesByCollection": {
    "classes": 104,
    "equipment": 415,
    "progressionExplainer": 3,
    "rules": 100,
    "spells": 298
  },
  "cropEdgeAssessments": {
    "assessed-text-layer": 2492,
    "candidate-text-box-crossing": 920,
    "not-assessable-supplemental-image-format": 2
  }
}
```

No image or source PDF hash mismatches or unmappable region bounds were found.

The confirmed heading-only PHB p.35 image has 43 linked usages; 0 are first in their same-catalog page group, and 0 are the current viewer default after role ordering. Every first occurrence has a sibling on that page. This exact-image finding does not establish semantic roles for other crops.

## Review queues

- `source-visual-audit-phb-source-v1-queue-phb-equipment.json`: 49 unique image/geometry candidates; 231 linked usages.
- `source-visual-audit-phb-source-v1-queue-nonphb-equipment.json`: 15 unique image/geometry candidates; 184 linked usages.
- `source-visual-audit-phb-source-v1-queue-other-records.json`: 304 unique image/geometry candidates; 505 linked usages.

## Highest-linked candidates

| Candidate | Book/page | Linked usages | Text boxes crossing edge |
| --- | --- | ---: | ---: |
| `edge-00cd38cc1d441ffb` | UA 27 | 69 | 16 |
| `edge-f09fac56f32c3641` | PHB 54 | 52 | 2 |
| `edge-f99634b466eb4983` | PHB 35 | 43 | 1 |
| `edge-aa406989650e9ff9` | DMG 225 | 39 | 1 |
| `edge-2b2f73ba5c620955` | PHB 37 | 25 | 5 |
| `edge-3d97de711795ed50` | PHB 117 | 24 | 4 |
| `edge-3ca156f88979ec8d` | UA 15 | 24 | 1 |
| `edge-ee616abc801e4910` | PHB 36 | 20 | 8 |
| `edge-570f5df04b8c9bf5` | PHB 39 | 18 | 7 |
| `edge-132fc2e44ed2e040` | UA 75 | 16 | 5 |

Stable candidate IDs bind image hash, source book/PDF page and normalized PDF-point bounds. Shared images can occur in multiple queues. Coordinates and all linked usages are in the baseline JSON; private PDF paths and full source text are not included.
