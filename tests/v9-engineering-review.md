# V9 dagger excerpts

The user supplied a readable local attachment containing seven focused dagger PNGs, source metadata, and a rendering script. The archive SHA-256 is `3b0720f08b31216517e56cea0ab02b02531388ed9ea109cc58244ac472ad7070`. The archive was inspected and safely extracted outside the repository. Its script was reviewed as data and was not executed. No blocked network transfer was retried.

## Evidence and limits

All seven original PNGs were visually inspected by root and independent reviewers. Their hashes/dimensions were computed independently and are pinned in `tests/dagger-independent.test.mjs`. The public catalog records image hashes, source book/edition, printed and PDF pages, declared PDF-point bounds, and normalized focus overlays. The images remain byte-for-byte unchanged. The declared bound dimensions agree with the PNG sizes at 220 DPI. The full source PDF hashes are supplied handoff provenance; this executor does not have the original PDFs to recompute them.

The four cited pages are PHB printed 35/37/38 → PDF 36/38/39 and original UA printed 28 → PDF 29. The seven regions cover the price row, weight/damage row, PHB melee/missile context and notes, and UA missile context and notes. No full page, book or full table is declared verified. PHB and UA adjustment columns remain separate source contexts; no new combat-matrix statistics were added.

The dagger-and-scabbard purchase price is visibly 2 gp. The existing weight, damage, speed and thrown numeric bands agree with the crops. Range evidence is explicitly limited to the printed 1/2/3 bands; broader distance-scale interpretation remains outside this image check. The catalogue now has 46 known prices and 34 extraction gaps. All other 79 equipment entries and matrix semantics are unchanged.

## Viewer behavior

Dagger citations open the supplied excerpts without a local PDF. Its footer combines four pages and seven regions; individual citations retain their exact book/page scope. Eligibility requires the actual dagger item context, so another weapon citing UA p.28 cannot inherit dagger images. The existing local-PDF mode remains available and keeps user files in tab memory without uploads.

Images have checked-value captions, alternative text, row highlights, Fit width/Actual size controls, zoom, and keyboard/touch panning. Narrow price images fit mobile width by default. A region chooser is hidden when the page has only one excerpt. Manifest/image failures have bounded waits and explicit retry; late requests cannot leak images into another card. The Highlights button uses its visible text as its accessible name. V8's dense property renderer is unchanged.

## Validation

- 84 Node tests passed, including seven-image integrity, sanitization, exact four-page mapping, source-grade limits and pinned semantics for all unaffected equipment/matrices.
- 24 general and 66 gear/matrix browser checks passed, with four zero-violation axe scans.
- Viewer-owner tests passed 71 excerpt checks, 32 original generated local-PDF fixture checks, and nine additional independent race/security checks.
- The independent integrated suite passed its 176 functional checks. Four accessibility label failures were fixed; the final 40 targeted rechecks passed with four zero-violation axe scans and no JavaScript errors. The original local-PDF fixture was also independently rerun successfully.
- Interface context/grade checks passed, including source-specific calls, 46/34 filters, and unchanged Aid geometry. Root inspected actual excerpt screenshots on desktop and mobile, including readable highlighted 2 gp price at 320/390 pixels.

The tests use source PNGs only for this explicitly supplied dagger set. Generated PDF fixtures test renderer mechanics and do not validate AD&D source wording.

## Publication boundaries

Only the seven listed PNGs and sanitized catalog are added as source assets. Full PDFs, the ZIP, raw OCR, the supplied script, private Library identifiers, credentials and browser notes remain outside the repository/deployment. These assets came through the user-provided local attachment, not a GitHub relay around network restrictions. Broader scan coverage remains incomplete.

The user confirmed PR #1 was merged and authorized future repository merges after review/testing. Root verified PR #1's merge commit `50b1326820d6a6bd9de624a5f6d2f06f4a3fa5bd`. This update preserves that history. No formal GitHub approval review is submitted by the agent. Hosting remains the same public Sites project; GitHub Pages is not enabled.
