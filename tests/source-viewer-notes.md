# Local source reader

`FirstEditionSourceViewer.open({item, references, contextItemId})` accepts grouped references:

```js
[{book: 'PHB', pages: [35, 37, 38], labels: ['Weapon tables']}]
```

Optional `contexts: [{page, label}]` supplies page-specific labels from the citation collector. `item.name` or `item.title` supplies the modal subtitle. The existing `FirstEditionBooks` module supplies printed-page mappings. PHB, original UA, and revised December 1979 DMG are supported; the DMG's missing printed pages 175 and 240 display explicit gaps.

Callers pass the actual card as `item` and its real ID as `contextItemId`, while `references` retains the exact clicked field/header/footer subset. Dagger excerpts require the resolved context ID `phb-dagger`; an explicit conflicting `item.id` rejects excerpt mode. Thus a UA page 28 field on the dagger card offers only its two UA regions, and unrelated items citing those pages receive the local-PDF reader only.

Load `source-viewer.css` and deferred `source-viewer.js` after `books.js` and before callers. The viewer creates a native modal on first use. PDF.js is imported only after a user selects a local file. Full PDF bytes enter PDF.js through `File.arrayBuffer()` and its `data` option. No PDF URL, upload, external CDN, Library identifier, local-storage PDF, or full source document is included. A loaded document remains in tab memory until Forget, replacement, or refresh. File names and lengths do not establish book identity; the interface asks readers to match the stated edition and page order. Too-short PDFs are rejected because they cannot satisfy that mapping.

PDF.js is pinned to official `pdfjs-dist@6.5.438`; `dist/vendor/pdfjs/version.json` records the registry URL and integrity. Minified legacy display/worker/renderer files and the package's bundled CMaps, standard fonts, WASM, ICC assets, and their licenses are vendored for same-origin use. The renderer module is included for compatibility but is not enabled as a separate renderer worker. PDF scripting and XFA are not enabled by the reader. Module usage follows [Mozilla's example](https://mozilla.github.io/pdf.js/examples/) and [API documentation](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html).

Run `node tests/source-viewer.browser.mjs` with Playwright and Chromium installed. It makes original text-only PDF fixtures in `/tmp`, serves only the public renderer files and a test harness, and checks printed/PDF mapping, both DMG gaps, invalid and too-short files, zoom, touch and keyboard navigation, modal focus/Escape, mobile widths, document forgetting, and network requests. Screenshots and fixtures stay in that temporary directory for review. These fixtures test the reader; they do not verify any AD&D wording, page content, or scan region.

The dagger entry (`phb-dagger`) also offers seven approved, visually checked excerpt images from PHB printed pages 35, 37, and 38 and UA printed page 28. The viewer fetches `scans/dagger/manifest.json` lazily only for that exact item context; conflicting explicit item IDs are rejected. Field citations retain their exact page subset. The catalog is restricted to seven known PNG names and exact printed/PDF page mappings. Supplied normalized focus rectangles overlay the unchanged PNGs. Only selected dagger values and shared missile notes have been checked; table context, full pages, other equipment, and entire books do not inherit that verification.

Excerpt mode uses same-origin public assets, readable table sizing, fit-width and actual-size controls, zoom through 400%, and keyboard/touch panning. The local-PDF mode keeps the earlier private-file behavior. Catalog and image failures have bounded loading deadlines, show the local-PDF fallback, and expose an explicit retry button. Source PDF fingerprints are labelled as supplied with the handoff; the PNG fingerprints were computed for the reviewed crop files. No source PDF was transferred or hosted by this integration.

Narrow images (up to 640 pixels wide) fit the available width by default so the price column remains visible on mobile. Wide tables retain a readable initial width and horizontal pan. Pages with only one excerpt hide the redundant region selector while retaining the highlight toggle and accessible caption; PHB page 38 and UA page 28 retain their multi-region selectors.

Run `node tests/dagger-source-viewer.browser.mjs` to exercise all seven approved images, normalized rectangle geometry, four cited pages and their 1/1/3/2 excerpt choices, exact UA field scoping, non-dagger exclusions, desktop and 491/390/320-pixel layouts, image zoom/panning, modal focus, local-PDF switching, catalog/image failures with explicit retries, and late-manifest races. Those image checks concern only the bounded dagger excerpts. For all other entries, the reader still shows the complete cited page from the user's local PDF and explicitly says focused regions are not yet verified.
