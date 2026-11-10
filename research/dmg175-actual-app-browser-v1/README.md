# DMG p.175 actual-app browser harness

This package freezes expected source-control tuples before the actual compiled-app browser run. It is research-only. The harness does not start a server, inject data, intercept browser requests, or modify product files.

`expected-controls-v1.json` was generated from the authored rules, citation overrides, field-evidence declarations, continuation manifest, and current bounded scan catalogs and images. It contains 120 newly pending controls: 87 table rows and 33 bullet targets across the eleven Appendix C cards and the existing `encounter-types` owner. The source-side locator filter also finds one older, already-reviewed `encounter-types` `/references/0` locator; the fixture records and excludes it. It is not counted among the 120 pending controls.

The fixture includes 12 catalog hashes and two continuation contracts. The 120 pending targets and two groups select 14 unique p.175/176 image files. The catalogs contain 15 unique image files total; the additional image is legacy PHB p.103 context and is not counted as a DMG test image. Character Levels has two ordered physical p.175 image crops. Party Magic Items has two physical parts: one p.175 image with 12 row-focus aliases, followed by p.176/PDF 176 with a separate advice alias. The p.175 image is accepted as correct-edition source evidence; printing is not specified and the canonical supplied PDF has no p.175 leaf. The fixture makes no source-value, mechanics, or broad-context grade claim.

`build-expected-fixture.py` is the deterministic, source-side fixture builder. It does not read `dist/data.json`, query the app, or inspect a browser. Its assertions verify the exact owner and JSON pointers, source page identity, pending statuses, catalog regions, image bytes, and physical continuation parts before writing the fixture. The frozen result SHA-256 is `ed18ac3efa7bca3f7e845dda5f16eb32fc11224048f16ac5474330ffd3905d3e`.

## Execution gate

The browser run is deliberately blocked until the root supplies a final assembled-dist gate. The current generated `dist` is not a valid runtime baseline. Do not start a server or capture screenshots before that gate is ready.

The root should copy `run-gate-template-v1.json` to a separate gate file and fill it only after final assembly and hash verification. Set `status` to `ready`, preserve `expectedFixtureSha256`, identify the assembly receipt, and provide a `distAssets` map containing SHA-256 hashes for these relative paths:

`index.html`, `styles.css`, `source-viewer.css`, `app.js`, `books.js`, `citations.js`, `search.js`, `source-viewer.js`, `data.json`, `source-continuations.json`, all twelve `scans/verified/rules-*.json` catalogs pinned in the fixture, and all fifteen unique `scans/verified/*.png` images referenced by those catalogs. The fixture separately labels the fourteen selected DMG test images from the full catalog-image denominator.

Once the root sends the exact ready gate path and confirms the final runtime hashes, serve the actual `dist` directory with an ordinary local static server. Then run:

```sh
DMG175_RUN_GATE_PATH=/path/to/root-ready-gate.json \
TEST_URL=http://127.0.0.1:8778 \
node research/dmg175-actual-app-browser-v1/dmg175-actual-app.browser.mjs
```

The runner verifies each HTTP asset against both the root gate and the local `dist` bytes before opening Chromium. It checks the compiled data object pointers before browser interaction, then direct-loads and searches every listed owner on desktop and mobile, verifies all 120 row/bullet controls through their pending source routes, checks no pending field route selects a region, checks the p.175 supplement wording, exercises both continuations and their aliases, and tests copy/reload/Back/Forward/close/focus. Screenshots are written only beneath the private vault evidence directory. The test does not assign source-value, mechanics, or context grades.

## Authored checks so far

The expectation builder completed with 120 controls (87 rows, 33 bullets), 12 catalogs, 14 selected test images, 15 total catalog images, and two continuation groups. `node --check` and `python3 -m py_compile` both passed; the temporary Python bytecode cache was removed. The actual browser run remains **not run / waiting for the root gate**.
