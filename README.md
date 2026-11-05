# First Edition — The Adventurer’s Reference

Public, buildless reference for Advanced Dungeons & Dragons first edition and original Unearthed Arcana. Source PDFs remain outside this repository and are never deployed.

## Coverage and evidence

The application distinguishes indexed spell names, extracted quick-reference cards, and curated rule summaries. It does not represent complete rules coverage. OCR-derived values are labeled pending visual verification. Phase 1 uses PHB sixth printing January 1980, original UA 1985, and DMG revised December 1979. Monster Manual source indexing is prepared for a later expansion. DMG printed pages 175 and 240 are absent.

Printed-to-PDF mapping: PHB/UA page N is PDF page N+1; DMG pages 1–174 are PDF N+1, pages 176–239 are PDF N. Missing pages are never treated as available.

## Run and verify

Serve `dist` using a static HTTP server. Run `node --test tests/*.test.mjs` for data and rule-helper integrity, `node tests/browser.mjs` for general browser workflows, and `node tests/attribute-layout-browser.cjs` for dense attributes, layout switching, and source-reference regressions. Browser tests require Playwright and Chromium; set `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, and `TEST_URL` for your installation. Set `AXE_PATH` to axe-core's local `axe.min.js` for accessibility checks. Browser notes are local to the origin and device. Export backups from Notebook. No backend stores notes.

## Publication

`.openai/hosting.json` preserves Site identity. The environment did not include the Sites source helper, so `tools/package-source.py` safely performs the documented source push and static archive preparation using a short-lived credential read only through hidden stdin. Native Sites tools perform deployment while preserving the requested audience. The first release was owner-private; the user subsequently requested public access.

## Current scope

The public Site includes spells, rules, class-and-level guidance, equipment, source references and local annotations. Known unreadable prices, matrix cells and other mechanics remain explicit gaps. Character generation is deferred to phase 2.

The initial 39-file v5 GitHub snapshot is recorded at https://github.com/XertroV/adnd1/commit/e1b5041961b33c3de81a1c0a37933ae953d9767f . Subsequent reviewed source updates use a branch and pull request while preserving that history. GitHub source synchronization does not enable GitHub Pages or move the existing Sites publication.

## Original-source reader

Citation chips open exact cited printed pages and their matching PDF page locations. The aggregate reader collects primary, per-field, price, progression and secondary references without changing book identity. Open a matching local PHB, UA or DMG PDF in the reader; it is processed only in the browser tab, never uploaded or saved by the application. Use Forget PDF or close the tab to release it. A filename and page count cannot verify the edition.

The managed environment still cannot obtain readable Library PDF images: materialization returns signed URLs outside the enforced transfer allowlist, and native image reads return unresolved image pointers. Therefore this release supplies no verified crops or highlighted original regions. The reader displays complete cited pages from the reader's own copy, with zoom and selectable page text. Generated fixture tests validate page mapping and local-only rendering; they do not validate original-book contents.

Compact spell and equipment attributes show every extracted value as static, wrapping text. Compact/Table controls choose one layout at a time. A Field sources disclosure appears only when it adds field-to-page information. Missing prices are explicitly extraction gaps; no missing source amount is replaced by an estimate. Class badges distinguish a single advancement guide from concurrent multiclass, sequential class changes, and special published paths.
