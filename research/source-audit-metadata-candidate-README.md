# Source-audit metadata candidates

This RAM-only package contains review candidates for the repository research directory. It is not installed, committed, published, or a request to publish.

## Scope

- The MM2 census and source-to-site join are exact byte-for-byte copies of the current corrected metadata inputs. They contain page/headword records and metadata only; this package contains no PDFs, rendered page images, crops, or absolute private file paths.
- The clean MM2 review summary derives from corrected independent receipt v3, SHA-256 afa8a800a5184f3f8d47da2080870cb5e4ea3f71438a325f63ccfc25de0b69da. It preserves v3's corrected authoritative local snapshot and bounded review scope without private paths or image files.
- The clean skills summary derives from source-first ledger SHA-256 0819e66f656ada378804510ccf44bfc044bacc0cc385e2a17ef30b6d70dfc2b0. It includes DMG p.12 and UA Barbarian pp.19–20 findings, page-bounded system distinctions, and local search comparison without render/crop paths or images.

## MM2 census and join

The source PDF SHA-256 is b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24 (29,693,734 bytes; 162 PDF pages). The current metadata covers PDF pages 9–133 inclusive: 125 distinct pages, 216 main-heading starts, 180 nested headings, and 125 continuation records. It is a merged page-ledger census with recorded corrections, not a fresh independent 125-page reread.

The printed-folio map is PDF 9–83 = PDF page minus one; PDF 84–91 = same printed number; PDF 92 = printed 83; PDF 93–133 = PDF page minus one. PDF 92's printed folio 83 appears after PDF 91/printed 91 and before PDF 93/printed 92.

Reconciliation distinguishes starts from catalog rows: 208 direct normalized name-and-folio starts plus 3 explicit title-rule starts gives 211 source starts with catalog presence; the combined XAG-YA/XEG-YI source start maps to two rows, yielding 212 distinct linked rows. Five main starts have no standalone same-name record. Nine nested label variants remain candidates, not confirmed aliases. Original correction history is preserved in the census.

At the tested site snapshot, the repository catalog has 311 MM2 records, but the deployed app does not load that catalog into its global search index. Five exact live-name queries returned no rows on desktop and mobile; the positive control returned 22. This is a bounded structural/live sample, not a 216-name exhaustive search test. Catalog existence, short descriptions, or page locators do not establish complete article or mechanics coverage.

## Skills source audit

DMG printed p.12/PDF13 contains a 23-row percentile secondary-skills table, assignment guidance, and DM-adjudicated examples. UA Barbarian printed pp.19–20/PDF20–21 describes four class-specific secondary abilities and eight locale/culture-selected tertiary skills, along with familiarity and native-territory limits. These pages do not define a universal nonweapon proficiency catalogue or shared general check procedure; that conclusion is limited to the reviewed pages.

The existing DMG and Barbarian records are locally searchable in their respective Rules and Classes views. The current Barbarian summary makes the labels and broad selection/familiarity rules searchable, but not individual procedures such as first-aid rates, outdoor-only tracking, or tertiary-option details. These were local data/search-library checks, not live browser validation. Existing UI visual-review statuses remain pending.

## Review boundary

Root reviews these candidates and decides whether to install them. No source images, PDFs, absolute private paths, site edits, or publication actions are included in this package. The ADD map lists repo-relative destination names, byte sizes, and SHA-256 digests for the candidate files and this README. Its own digest is in the adjacent .sha256 sidecar.
