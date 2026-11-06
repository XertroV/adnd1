# First Edition — The Adventurer’s Reference

Public, buildless reference for Advanced Dungeons & Dragons first edition and original Unearthed Arcana. Source PDFs remain outside this repository and are never deployed.

## Coverage and evidence

The application distinguishes indexed spell names, extracted quick-reference cards, and curated rule summaries. It does not represent complete rules coverage. Most OCR-derived values are labeled pending visual verification. The original selected-value pass checks rows for twenty equipment entries within seven supplied images. The uploaded-source pass adds checked passage locations for all 892 reference-bearing records, without promoting their remaining mechanics to fully verified. There are 56 unique checked regions and 76 item-specific region entries because shared missile notes are reused. Verification is limited to each card's stated fields; distance-scale interpretation and unextracted mechanics are outside that image review. Phase 1 uses PHB sixth printing January 1980, original UA 1985, and DMG revised December 1979. Monster Manual source indexing is prepared for a later expansion. DMG printed page 175 is absent; printed pages 239 and 240 remain unverified end matter.

Printed-to-PDF mapping: PHB/UA page N is PDF page N+1; DMG pages 1–174 are PDF N+1, pages 176–238 are PDF N. Page 175 is missing; the identity of pages 239–240 remains unverified and they are not mapped.

## Run and verify

Serve `dist` using a static HTTP server. Run `node --test tests/*.test.mjs` for data and rule-helper integrity, `node tests/browser.mjs` for general browser workflows, and `node tests/attribute-layout-browser.cjs` for dense attributes, layout switching, and source-reference regressions. Browser tests require Playwright and Chromium; set `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, and `TEST_URL` for your installation. Set `AXE_PATH` to axe-core's local `axe.min.js` for accessibility checks. Browser notes are local to the origin and device. Export backups from Notebook. No backend stores notes.

## Publication

`.openai/hosting.json` preserves Site identity. The environment did not include the Sites source helper, so `tools/package-source.py` safely performs the documented source push and static archive preparation using a short-lived credential read only through hidden stdin. Native Sites tools perform deployment while preserving the requested audience. The first release was owner-private; the user subsequently requested public access.

## Current scope

The public Site includes spells, rules, class-and-level guidance, equipment, source references and local annotations. Known unreadable prices, matrix cells and other mechanics remain explicit gaps. Character generation is deferred to phase 2.

The initial 39-file v5 GitHub snapshot is recorded at https://github.com/XertroV/adnd1/commit/e1b5041961b33c3de81a1c0a37933ae953d9767f . Subsequent reviewed source updates use a branch and pull request while preserving that history. GitHub source synchronization does not enable GitHub Pages or move the existing Sites publication.

## Original-source reader

Citation chips open exact cited printed pages and their matching PDF page locations. The aggregate reader collects primary, per-field, price, progression and secondary references without changing book identity. Dagger has seven checked excerpts across PHB pp.35,37–38 and UA p.28. Local batch 2 adds 20 checked row regions for Battle Axe, Hand or Throwing Axe, Bardiche, Bec de Corbin, Bill-Guisarme, Bo Stick and Club. The following equipment batches add 29 more regions, including eight new entries, using those same image bytes with item-specific focus overlays. Entries or cited pages without their own checked regions use the local PDF reader. Open a matching local PHB, UA, DMG, Monster Manual or Monster Manual II PDF; it is processed only in the browser tab, never uploaded or saved by the application. Use Forget PDF or close the tab to release it. A filename and page count cannot verify the edition.

The dagger crop ZIP arrived through a supported local attachment. All seven PNGs were visually inspected; their hashes and dimensions were independently checked and are recorded in the sanitized public catalog. The original dagger catalogs retain their supplied-handoff provenance. The later uploaded-source catalogs record hashes recomputed from the privately supplied PDFs. Full source PDFs are available privately for review and are never deployed. A source excerpt checks passage location and legibility, not every extracted mechanic or the full page. Generated PDF fixtures validate local-reader mechanics, not original-book contents.

Compact spell and equipment attributes show every extracted value as static, wrapping text. Compact/Table controls choose one layout at a time. A Field sources disclosure appears only when it adds field-to-page information. Missing prices are explicitly extraction gaps; no missing source amount is replaced by an estimate. Class badges distinguish a single advancement guide from concurrent multiclass, sequential class changes, and special published paths.

## Research source and site deployment status

The earlier source-citation batches and private review tooling were merged in PRs #3 and #4. The uploaded-source image pass builds on those checkpoints. The public v9 site remains separate; a new site deployment requires specific approval. See the [batch-2 report](tests/batch2-engineering-review.md) and [remaining-batches report](tests/remaining-batches-engineering-review.md) for exact evidence scope, tests, and remaining source-access limitations.

The current local catalogue contains 88 equipment entries, 61 extracted prices and 27 price extraction gaps. The following text-citation pass covers the 638 existing spell cards in 35 batches; it adds 102 structured reference objects covering 113 additional book/page pairs on 80 cards. These citations remain OCR checked with visual review pending, and spell mechanics are unchanged. Explicit monster dependencies now link to MM/MM2; this does not establish a searchable monster catalogue or visual verification of those books.

## Remaining scan review workflow

Run `node tools/source-scan-inventory.mjs` to regenerate the structured citation inventory and its queue in `tests/fixtures/source-scan-inventory.json`. The current inventory covers 892 reference-bearing records, 1,704 record/page pairs and 216 distinct cited pages. Every cited record/page pair now has a checked source excerpt. The excerpt catalogs contain 1,297 unique regions and 2,136 item-specific region entries, including retained selected-value evidence. There are 1,248 PNGs in the newer excerpt directory plus the seven original equipment images. Excerpts may be partial passages or shared context; they never verify a whole page or every extracted mechanic. The 24 bounded batches remain available for further value-level review. DMG page 175 and unverified end matter at pages 239–240 remain separately blocked.

The [private batch preparation guide](tools/prepare-source-batch.md) explains how to render locally supplied PDFs, prepare crops and highlights, record hashes, and hand off pending evidence for independent visual review and desktop/mobile QA. Generated source material stays private and is never automatically added to the site. The tool's mappings must be checked against the supplied edition and scan order before accepting source facts.

The uploaded-source pass used the privately supplied PHB sixth printing (January 1980), original UA (1985), revised DMG (December 1979), original Monster Manual, and Monster Manual II scans. See the [uploaded-source review](tests/uploaded-source-review.md) for exact scope, corrected facts and citations, and the three remaining source ambiguities. The [provenance record](tests/uploaded-source-provenance.md) gives source hashes and scan mappings. Earlier batch reports describe their historical checkpoints, including source-access limitations that the later upload resolved.
