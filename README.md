# First Edition — The Adventurer’s Reference

Public, buildless reference for Advanced Dungeons & Dragons first edition and original Unearthed Arcana. Source PDFs remain outside this repository and are never deployed.

## Coverage and evidence

The application distinguishes indexed spell names, extracted quick-reference cards, and curated rule summaries. It does not represent complete rules coverage. The original selected-value image pass covered twenty equipment entries; later passes checked source passage locations across all reference-bearing records and reviewed individual mechanics against the supplied books. These are different scopes: an excerpt does not verify every field or all rules on a page. See the [field-level audit](research/mechanics-audit-progress.md) and [source inventory](tests/fixtures/source-scan-inventory.json) for current counts and unresolved items.

The original DMG PDF omits printed p.175. A separately supplied private image visibly bears p.175 and fits the adjacent Appendix C context, though its exact printing is not established. Printed end matter pp.239–240 remains unverified. Printed-to-PDF mapping for the original PDFs is PHB/UA page N = PDF page N+1; DMG pages 1–174 = PDF N+1 and pages 176–238 = PDF N. The separate image is not part of that PDF mapping.

## Run and verify

Serve `dist` using a static HTTP server. Run `node --test tests/*.test.mjs` for data and rule-helper integrity, `node tests/browser.mjs` for general browser workflows, and `node tests/attribute-layout-browser.cjs` for dense attributes, layout switching, and source-reference regressions. Browser tests require Playwright and Chromium; set `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, and `TEST_URL` for your installation. Set `AXE_PATH` to axe-core's local `axe.min.js` for accessibility checks. Browser notes are local to the origin and device. Export backups from Notebook. No backend stores notes.

## Publication

### GitHub Pages

GitHub Pages publishes `dist` at https://xertrov.github.io/adnd1/ using
`.github/workflows/pages.yml`. Set Settings → Pages → Source to **GitHub Actions**.
The workflow deploys only pushes to `master` (or a manual run on `master`);
pull requests run integrity and reproducible-output checks without deploying.
It runs `node tools/assemble.mjs` and rejects stale committed output. Update
`dist/data.json` with that command when changing source data.

For a Pages deployment, the workflow stamps the sidebar with the commit,
UTC build time and an increasing deployment version. A dedicated
`pages-deployment-version` branch stores the counter. The deployment job has
repository contents write permission to reserve the next version using a
non-force, atomic Git ref update; it fails closed if the branch or reservation
is unavailable. Every attempt reserves a number, so failed attempts may leave
gaps. Build time refers to the original verified build, including on a
deploy-only retry. Local or other unstamped builds say details are unavailable.
The stamp is added after the committed-output check and is not committed to
`master`.

The monotonic guarantee applies to deployments through this updated workflow
and assumes no other writer resets the counter. Historical workflow runs retain
their old definitions and can redeploy without reserving a version; do not
rerun pre-counter workflows. Other publication systems, including the separate
ChatGPT Site, do not use this counter. Do not delete or reset the version-state
branch: the workflow intentionally stops instead of restarting its sequence.


The branch-publishing dropdown cannot publish `/dist`: GitHub permits only `/`
or `/docs`. The master-triggered workflow uploads only `dist`, without copying
the scan library or exposing repository tooling as website files. All app,
scan, and PDF worker URLs are relative and support the `/adnd1/` project path.
No custom domain, source PDFs, secrets, or existing Site settings are changed.

To smoke-test the project path, serve `dist` mounted at `/adnd1/`, then run
`PLAYWRIGHT_MODULE=/path/to/playwright TEST_URL=http://localhost:8766/adnd1 node tests/pages-browser.mjs`.
The same test accepts the live Pages URL and checks desktop/mobile excerpts
from all five books, asset paths, and a real PDF worker with an original fixture.
Use `BROWSER_PROXY` only when your environment requires an HTTP proxy.

Notebook storage belongs to the browser origin. The existing Site and GitHub
Pages have separate notes: use **Notebook → Export backup** on the old site,
then **Notebook → Import** on the new site. They do not synchronize. Browser
storage is shared with any other apps on the same `xertrov.github.io` origin,
not isolated by the `/adnd1/` path.

### Existing Site

`.openai/hosting.json` preserves Site identity. The environment did not include the Sites source helper, so `tools/package-source.py` safely performs the documented source push and static archive preparation using a short-lived credential read only through hidden stdin. Native Sites tools perform deployment while preserving the requested audience. The first release was owner-private; the user subsequently requested public access.

## Current scope

The public Site includes spells, rules, class-and-level guidance, equipment, source references and local annotations. Known unreadable prices, matrix cells and other mechanics remain explicit gaps. Character generation is deferred to phase 2.

The initial 39-file v5 GitHub snapshot is recorded at https://github.com/XertroV/adnd1/commit/e1b5041961b33c3de81a1c0a37933ae953d9767f . Subsequent reviewed source updates use a branch and pull request while preserving that history. GitHub source synchronization does not enable GitHub Pages or move the existing Sites publication.

## Original-source reader

Citation chips open exact cited printed pages and their matching PDF page locations. The aggregate reader collects primary, per-field, price, progression and secondary references without changing book identity. Dagger has seven checked excerpts across PHB pp.35,37–38 and UA p.28. Local batch 2 adds 20 checked row regions for Battle Axe, Hand or Throwing Axe, Bardiche, Bec de Corbin, Bill-Guisarme, Bo Stick and Club. The following equipment batches add 29 more regions, including eight new entries, using those same image bytes with item-specific focus overlays. Entries or cited pages without their own checked regions use the local PDF reader. Open a matching local PHB, UA, DMG, Monster Manual or Monster Manual II PDF; it is processed only in the browser tab, never uploaded or saved by the application. Use Forget PDF or close the tab to release it. A filename and page count cannot verify the edition.

The dagger crop ZIP arrived through a supported local attachment. All seven PNGs were visually inspected; their hashes and dimensions were independently checked and are recorded in the sanitized public catalog. The original dagger catalogs retain their supplied-handoff provenance. The later uploaded-source catalogs record hashes recomputed from the privately supplied PDFs. Full source PDFs are available privately for review and are never deployed. A source excerpt checks passage location and legibility, not every extracted mechanic or the full page. Generated PDF fixtures validate local-reader mechanics, not original-book contents.

Compact spell and equipment attributes show every extracted value as static, wrapping text. Compact/Table controls choose one layout at a time. A Field sources disclosure appears only when it adds field-to-page information. Missing prices are explicitly extraction gaps; no missing source amount is replaced by an estimate. Class badges distinguish a single advancement guide from concurrent multiclass, sequential class changes, and special published paths.

## Research source and site deployment status

The earlier source-citation batches and private review tooling were merged in PRs #3 and #4. The uploaded-source image pass builds on those checkpoints. The public ChatGPT Site was deployed through PR #6 as version 11; subsequent repository changes are separate. GitHub Pages deploys master automatically. A new ChatGPT Site deployment requires specific approval. See the [batch-2 report](tests/batch2-engineering-review.md) and [remaining-batches report](tests/remaining-batches-engineering-review.md) for exact evidence scope, tests, and remaining source-access limitations.

The current local catalogue contains 88 equipment entries, 84 extracted prices and 4 printed-price gaps. Each gap has a separately labeled editorial estimate; the source price remains unknown. A historical text-citation pass covered the 638 existing spell cards in 35 batches and added structured references; subsequent source and mechanics reviews corrected or expanded selected cards. Explicit monster dependencies now link to MM/MM2; this does not establish a searchable monster catalogue or visual verification of those books.

## Remaining scan review workflow

Run `node tools/source-scan-inventory.mjs` to regenerate the structured citation inventory and its queue in [source-scan-inventory.json](tests/fixtures/source-scan-inventory.json). Available cited record/page pairs have scoped source excerpts; those excerpts may cover only a passage or shared context. The inventory reports current coverage and remaining unavailable or unverified pages. The [field-level audit](research/mechanics-audit-progress.md) separately records which mechanics were checked, corrected, or remain unresolved.

The [private batch preparation guide](tools/prepare-source-batch.md) explains how to render locally supplied PDFs, prepare crops and highlights, record hashes, and hand off pending evidence for independent visual review and desktop/mobile QA. Generated source material stays private and is never automatically added to the site. The tool's mappings must be checked against the supplied edition and scan order before accepting source facts.

The uploaded-source pass used the privately supplied PHB sixth printing (January 1980), original UA (1985), revised DMG (December 1979), original Monster Manual, and Monster Manual II scans. See the [uploaded-source review](tests/uploaded-source-review.md) for the scope of that historical pass, corrected facts and citations. The [provenance record](tests/uploaded-source-provenance.md) gives source hashes and scan mappings. Earlier batch reports describe their historical checkpoints, including source-access limitations that the later upload resolved.

## Value-level audit progress

The [progress summary](research/mechanics-audit-progress.md) gives the saved percentages and per-collection counts. The [durable field log](research/mechanics-audit-progress.json) inventories every tracked mechanics field, including unchecked values and pending corrections. The [log guide](research/README.md) explains its denominator, source-file hashes, verification states and regeneration checks. Source-image coverage is not a value-level completion percentage.

### Source visual coverage

`node tools/source-visual-coverage.mjs` writes public-data-only JSON and Markdown
reports to `artifacts/source-visual-coverage/`; pass an output directory to write
elsewhere. CI publishes the reports as a workflow artifact and summarizes them
in the job output. Counts distinguish cited record/page pairs, catalog-region
usages (including legacy bindings), and unique images. Default-selection review
applies only to the region initially shown for each page in the active catalog.

`research/source-visual-reviews.json` holds binding-specific independent review
verdicts for highlight, crop and default selection. Each verdict must include
`independent: true` and evidence, and is accepted only while the actual public image bytes, source PDF identity, focus rectangle and region-content SHA-256 values match. Default-selection verdicts also bind the complete region ordering for the cited page. Full-image rectangles remain
suspected unless an independently justified exception is recorded; unreviewed
partial rectangles are not presumed correct. Geometry-derived edge candidates
are advisory, never semantic proof, and are used only when the binding’s source, catalog and public-image hashes match. A whole-data hash mismatch is reported separately; candidates whose binding hashes changed remain visible as stale. No private source PDF or
private image is used to generate these reports.

### Known gaps and limitations

The Sources & coverage page lists recorded equipment offers, unresolved fields,
conflicting readings, missing references and excerpt-review limitations. Its
separate `dist/coverage-gaps.json` projection is generated during assembly from
the hash-bound handoff and current evidence. These categories overlap and do
not form an overall error count or a whole-book completeness percentage. See
[the maintenance rules](agent-docs/gaps-and-limitations.md) for regeneration,
status distinctions and checks.

