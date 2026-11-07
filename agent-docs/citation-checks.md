# Deterministic citation checks

Read [Citation images and verification](citation-images-and-verification.md) first. Automated checks generate candidates or enforce recorded contracts; they cannot establish contextual adequacy or whole-book correctness.

## Implemented now

1. `research/source-visual-audit.py` reads the authorized original PDFs with PyMuPDF. It maps every current catalog crop to PDF points, verifies source/image identities, and finds text-layer word boxes that cross each crop boundary. The public output contains numeric bounds and identifiers, not source text or PDFs.
2. `research/crop_geometry.py` supplies the exact boundary-intersection function used by both the offline auditor and CI fixtures. `tests/crop-geometry-fixtures.py`, invoked by the Node test suite, calibrates old versus repaired Animate Object bounds against three original numeric word boxes. It tests all four edges, exact touching, corner intersections, unrelated neighbors, and missing-text-layer limitations. CI needs only Python's standard library for these fixtures, not the private PDFs or PyMuPDF.
3. `tools/source-visual-coverage.mjs` consumes the checked-in release geometry snapshot, falling back to the historical corrected snapshot. It verifies current catalog/source/image hashes before applying candidates. It reports stale candidates when evidence changes. Exact full-image highlights are suspected unless independently excepted. Hash-bound manual assessments keep crop completeness, contextual adequacy, highlight relevance and default selection separate.
4. Existing public scan tests check catalog/image consistency and assembled citation counts. Viewer browser tests cover source permalinks, copy, history and focus. These tests do not verify the meanings of source passages.

Regenerate geometry locally after assembling changed catalogs:

```sh
python research/source-visual-audit.py --source-dir /path/to/authorized/books --output-prefix release
node tools/source-visual-coverage.mjs
node --test tests/*.test.mjs
```

The source directory must contain the five filenames declared in the auditor. Do not upload that directory. Commit the numeric release snapshot and its queues after review; preserve historical baseline/corrected snapshots. CI regenerates the public coverage JSON/Markdown and uploads `source-visual-coverage` without needing the books.

## False positives, false negatives and review

- A word box crossing an edge can be an unrelated neighboring row, a column fragment, or misaligned OCR. It remains a candidate until the actual pixels and source context are checked.
- A boundary merely touching a word box is not an intersection. This numerical convention is not a guarantee that rasterized ink is intact.
- Missing or inaccurate OCR can miss clipped letters. A source fold can destroy letters before cropping. Image margins or a zero-candidate result cannot prove completeness.
- Whole tables can be legible yet contextually inadequate when headings, units, footnotes, wrapped rows or continuations are absent. Small crop size alone is not a semantic verdict.
- Resolve candidates per current binding. Record the exact source/image/rectangle hashes, scope and evidence. Keep confirmed defects, rejected heuristics, explicit exceptions and unreviewed work distinguishable. Retain superseded wrong reviews, as with Animate Object.

## Planned checks for the logged recurring classes

These are concrete follow-up contracts, not implemented assurances:

- **Context extent:** manually annotate complete table extents and required headings/notes in source coordinates; check that each contextual crop contains them, then check that its precise highlight intersects the intended reviewed row/cells. Calibrate with Arrow and Long Sword narrow-row failures and the complete new Clothing/Provisions/Livestock tables. Do not infer table completeness merely from OCR detecting a heading.
- **Continuation graph:** record required source segments and their order for known multi-column/multi-page passages. Check that every required region is present and reachable in the citation list. Use Abjure's left/right split and Charging melee's missing next-page segment as fixtures. End-of-line hyphens and PDF reading order may suggest candidates but cannot establish a continuation by themselves.
- **Raster edge candidates:** compare connected text-like ink components against the crop boundary, calibrated against known clipped glyphs, table rules, page borders and illustrations. Keep these heuristic results separate from word-box candidates; do not automatically classify cut images as confirmed defects.
- **Viewport versus source crop:** fresh-tab browser fixtures for Fireball and Sleep should assert the initial stage framing after image load, independent of source-image bounds. Diagnose viewport scroll before regenerating pixels.
- **Selection/history:** search from Arrow to Long Sword, then reload and use Back/Forward; assert coherent selected entry and canonical URL. Repeat for spells. Preserve source-region copy links.
- **Notice/layout:** dismiss the green notice and check that the intended single separator remains, including repeated openings and reload behavior. Review spell class/level controls on desktop/mobile and with keyboard navigation; geometric tests alone do not establish an efficient layout.

Track these in `research/source-viewer-dogfood-findings.json` and the binding-level context ledger. The separate Aklys diagnosis remains separate work.
