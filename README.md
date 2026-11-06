# First Edition — The Adventurer’s Reference

Public, buildless reference for Advanced Dungeons & Dragons first edition and original Unearthed Arcana. Source PDFs remain outside this repository and are never deployed.

## Coverage and evidence

The application distinguishes indexed spell names, extracted quick-reference cards, and curated rule summaries. It does not represent complete rules coverage. Most OCR-derived values are labeled pending visual verification. This local research branch checks selected rows for twenty equipment entries within seven existing supplied images. There are 56 unique checked regions and 76 item-specific region entries because shared missile notes are reused. Verification is limited to each card's stated fields; distance-scale interpretation and unextracted mechanics are outside that image review. Phase 1 uses PHB sixth printing January 1980, original UA 1985, and DMG revised December 1979. Monster Manual source indexing is prepared for a later expansion. DMG printed pages 175 and 240 are absent.

Printed-to-PDF mapping: PHB/UA page N is PDF page N+1; DMG pages 1–174 are PDF N+1, pages 176–239 are PDF N. Missing pages are never treated as available.

## Run and verify

Serve `dist` using a static HTTP server. Run `node --test tests/*.test.mjs` for data and rule-helper integrity, `node tests/browser.mjs` for general browser workflows, and `node tests/attribute-layout-browser.cjs` for dense attributes, layout switching, and source-reference regressions. Browser tests require Playwright and Chromium; set `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, and `TEST_URL` for your installation. Set `AXE_PATH` to axe-core's local `axe.min.js` for accessibility checks. Browser notes are local to the origin and device. Export backups from Notebook. No backend stores notes.

## Publication

`.openai/hosting.json` preserves Site identity. The environment did not include the Sites source helper, so `tools/package-source.py` safely performs the documented source push and static archive preparation using a short-lived credential read only through hidden stdin. Native Sites tools perform deployment while preserving the requested audience. The first release was owner-private; the user subsequently requested public access.

## Current scope

The public Site includes spells, rules, class-and-level guidance, equipment, source references and local annotations. Known unreadable prices, matrix cells and other mechanics remain explicit gaps. Character generation is deferred to phase 2.

The initial 39-file v5 GitHub snapshot is recorded at https://github.com/XertroV/adnd1/commit/e1b5041961b33c3de81a1c0a37933ae953d9767f . Subsequent reviewed source updates use a branch and pull request while preserving that history. GitHub source synchronization does not enable GitHub Pages or move the existing Sites publication.

## Original-source reader

Citation chips open exact cited printed pages and their matching PDF page locations. The aggregate reader collects primary, per-field, price, progression and secondary references without changing book identity. Dagger has seven checked excerpts across PHB pp.35,37–38 and UA p.28. Local batch 2 adds 20 checked row regions for Battle Axe, Hand or Throwing Axe, Bardiche, Bec de Corbin, Bill-Guisarme, Bo Stick and Club. The following equipment batches add 29 more regions, including eight new entries, using those same image bytes with item-specific focus overlays. Entries or cited pages without their own checked regions use the local PDF reader. Open a matching local PHB, UA, DMG, Monster Manual or Monster Manual II PDF; it is processed only in the browser tab, never uploaded or saved by the application. Use Forget PDF or close the tab to release it. A filename and page count cannot verify the edition.

The dagger crop ZIP arrived through a supported local attachment. All seven PNGs were visually inspected; their hashes and dimensions were independently checked and are recorded in the sanitized public catalog. The source PDF hashes are supplied handoff provenance, not hashes recomputed by this executor. Full source PDFs remain unavailable to this build and are never deployed. Broader source-image coverage remains incomplete. Generated PDF fixtures validate local-reader mechanics, not original-book contents.

Compact spell and equipment attributes show every extracted value as static, wrapping text. Compact/Table controls choose one layout at a time. A Field sources disclosure appears only when it adds field-to-page information. Missing prices are explicitly extraction gaps; no missing source amount is replaced by an estimate. Class badges distinguish a single advancement guide from concurrent multiclass, sequential class changes, and special published paths.

## Research source and site deployment status

This research is prepared from v9 source commit `6c646a6ccb35da7b4739ad30ef8eaaeae39f6d02` and is being submitted to GitHub as a draft pull request for review and continued development. The public v9 site remains separate; a new site deployment requires specific approval. See the [batch-2 report](tests/batch2-engineering-review.md) and [remaining-batches report](tests/remaining-batches-engineering-review.md) for exact evidence scope, tests, and remaining source-access limitations.

The current local catalogue contains 88 equipment entries, 59 extracted prices and 29 price extraction gaps. The following text-citation pass covers the 638 existing spell cards in 35 batches; it adds 102 structured reference objects covering 113 additional book/page pairs on 80 cards. These citations remain OCR checked with visual review pending, and spell mechanics are unchanged. Explicit monster dependencies now link to MM/MM2; this does not establish a searchable monster catalogue or visual verification of those books.
