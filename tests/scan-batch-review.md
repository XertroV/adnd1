# Independent scan-batch review

The assembled structured citations contain 892 reference-bearing records, 1,703 record-page pairs, and 216 distinct cited pages. An independent recursive traversal reproduced those counts. Four cited pages have some supplied crop pixels; 212 do not. The inventory schedules available cited pages in 24 batches and separately records the two known DMG scan gaps, pages 175 and 240. Supplied crops and scoped checks do not establish full-page verification.

The preparation tool's page mapping was checked against the viewer mapping for every valid printed page, including the DMG gaps and the MM2 page-order exception. Synthetic PDF tests exercised mapping, output hashes and crop dimensions, and rejection of missing pages and invalid rectangles. The previously identified cleanup race was addressed by removing output only after this process successfully creates the directory. The tool limits manifests to 20 entries and marks output as pending independent visual verification.

Validation run: `node --test tests/source-scan-inventory.test.mjs` (5 passed); `python3 tests/test-prepare-source-batch.py` (3 passed).

Original PDFs were unavailable: the supported Library transfer failed with HTTP 401. Consequently the source edition, actual scan mappings, crops, and values remain unverified. No desktop or mobile viewer QA was performed as part of this review.
