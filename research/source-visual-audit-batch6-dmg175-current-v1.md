# Current source visual audit: DMG p.175 supplement and current PDF geometry

The inventory covers every `sourceExcerpts` and `scanVerification` catalog referenced by the assembled `dist/data.json`. Input SHA-256: `36483b8ecadeedb306d6fecd758c162c1da033757f9934bc599e281e62cf0a1d`. It is a snapshot: re-run the tool after source data or catalogs change. The canonical DMG PDF omits printed page 175. A user-confirmed supplemental source image is separately hash-identified; the current repository build includes only two reviewed limited excerpt PNG assets; no external release is claimed. Those two region usages are retained in this inventory but are not assessed as PDF-raster geometry.

The `[0, 0, 1, 1]` focus rectangle is a suspected overhighlight pending per-region review; hiding the overlay is not semantic verification. Context labels are only heuristics and may describe a mixed heading-and-row crop. For each catalog binding, a page ordinal is computed within the item/book/printed-page group; viewer ordinal applies the current context-last role ordering and selected catalog. Other navigation and deep links can select another region.

Crop-edge candidates are word-box intersections from the PDF text layer, using only original PDF geometry and hashes. A candidate is not a defect: OCR alignment, intentional partial context and neighboring columns can produce false positives. Text-layer misses do not establish safety. Review actual image pixels and source pages.

## Counts

```json
{
  "regionUsages": 3396,
  "uniqueImageHashes": 1293,
  "uniqueImageGeometryBindings": 1291,
  "sentinelUsages": 2192,
  "partialFocusUsages": 1151,
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
    "DMG": 332,
    "MM": 15,
    "MM2": 2,
    "PHB": 1845,
    "UA": 1202
  },
  "usagesByCollection": {
    "classes": 416,
    "equipment": 1196,
    "matrices": 3,
    "progressionExplainer": 10,
    "rules": 332,
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
    "boundsPdfPoints": 99,
    "flat": 842,
    "missing": 2,
    "nested": 114,
    "object": 2339
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
    "assessed-text-layer": 2474,
    "candidate-text-box-crossing": 920,
    "not-assessable-page-unavailable": 2
  }
}
```

Warnings: 0. The two p.175 supplemental image rows are explicitly not assessable for PDF-raster geometry, rather than missing bounds in a PDF page.

The confirmed heading-only PHB p.35 image has 43 linked usages; 0 are first in their same-catalog page group, and 0 are the current viewer default after role ordering. Every first occurrence has a sibling on that page. This exact-image finding does not establish semantic roles for other crops.

## Supplemental image rows outside PDF geometry

The canonical DMG PDF hash remains `7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669`; it does not contain p.175. The separately identified user-confirmed image has SHA-256 `e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7` and dimensions 1329×1796. Its two published excerpt crops are retained as source-image usages, not mapped to a PDF page or scanned against a PDF raster.

| Region | Current-build crop PNG SHA-256 | Native image crop bounds | PDF geometry status |
|---|---|---|---|
| `dmg-175-party-table-context-78c4c383c38c7d10` | `78c4c383c38c7d100a9e66bec4f36de1fdb9453d6e44d1eec53120e849a36e89` | `[0,1145,635,1635]` | not assessable as PDF raster |
| `dmg-175-level-others-context-5aa02e91e35c4c28` | `5aa02e91e35c4c28152caccd947096943b74889b8596376cb0c7170291b8` | `[670,120,1329,492]` | not assessable as PDF raster |

This does not transcribe the Character Subtable or establish whole-page semantic completeness.

## Review queues

- `source-visual-audit-batch6-dmg175-current-v1-queue-phb-equipment.json`: 49 unique image/geometry candidates; 231 linked usages.
- `source-visual-audit-batch6-dmg175-current-v1-queue-nonphb-equipment.json`: 15 unique image/geometry candidates; 184 linked usages.
- `source-visual-audit-batch6-dmg175-current-v1-queue-other-records.json`: 304 unique image/geometry candidates; 505 linked usages.

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
