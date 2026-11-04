# First Edition — The Adventurer’s Reference

Public, buildless reference for Advanced Dungeons & Dragons first edition and original Unearthed Arcana. Source PDFs remain outside this repository and are never deployed.

## Coverage and evidence

The application distinguishes indexed spell names, extracted quick-reference cards, and curated rule summaries. It does not represent complete rules coverage. OCR-derived values are labeled pending visual verification. PHB sixth printing January 1980, original UA 1985, and DMG revised December 1979 are the only primary sources. DMG printed pages 175 and 240 are absent.

Printed-to-PDF mapping: PHB/UA page N is PDF page N+1; DMG pages 1–174 are PDF N+1, pages 176–239 are PDF N. Missing pages are never treated as available.

## Run and verify

Serve `dist` using a static HTTP server. Run `node --test tests/data.test.mjs` for data integrity and `node tests/browser.mjs` for browser workflows with the installed Chromium and Playwright. Run `node tests/accessibility.mjs` with `AXE_PATH` pointing to axe-core's local `axe.min.js`. Browser notes are local to the origin and device. Export backups from Notebook. No backend stores notes.

## Publication

`.openai/hosting.json` preserves Site identity. The environment did not include the Sites source helper, so `tools/package-source.py` safely performs the documented source push and static archive preparation using a short-lived credential read only through hidden stdin. Native Sites tools perform deployment while preserving the requested audience. The first release was owner-private; the user subsequently requested public access.
