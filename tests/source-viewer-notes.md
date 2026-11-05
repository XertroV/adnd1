# Local source reader

`FirstEditionSourceViewer.open({item, references})` accepts grouped references:

```js
[{book: 'PHB', pages: [35, 37, 38], labels: ['Weapon tables']}]
```

Optional `contexts: [{page, label}]` supplies page-specific labels from the citation collector. `item.name` or `item.title` supplies the modal subtitle. The existing `FirstEditionBooks` module supplies printed-page mappings. PHB, original UA, and revised December 1979 DMG are supported; the DMG's missing printed pages 175 and 240 display explicit gaps.

Load `source-viewer.css` and deferred `source-viewer.js` after `books.js` and before callers. The viewer creates a native modal on first use. PDF.js is imported only after a user selects a local file. Source bytes enter PDF.js through `File.arrayBuffer()` and its `data` option. No PDF URL, upload, external CDN, Library identifier, local-storage PDF, or source file is included. A loaded document remains in tab memory until Forget, replacement, or refresh. File names and lengths do not establish book identity; the interface asks readers to match the stated edition and page order. Too-short PDFs are rejected because they cannot satisfy that mapping.

PDF.js is pinned to official `pdfjs-dist@6.5.438`; `dist/vendor/pdfjs/version.json` records the registry URL and integrity. Minified legacy display/worker/renderer files and the package's bundled CMaps, standard fonts, WASM, ICC assets, and their licenses are vendored for same-origin use. The renderer module is included for compatibility but is not enabled as a separate renderer worker. PDF scripting and XFA are not enabled by the reader. Module usage follows [Mozilla's example](https://mozilla.github.io/pdf.js/examples/) and [API documentation](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html).

Run `node tests/source-viewer.browser.mjs` with Playwright and Chromium installed. It makes original text-only PDF fixtures in `/tmp`, serves only the public renderer files and a test harness, and checks printed/PDF mapping, both DMG gaps, invalid and too-short files, zoom, touch and keyboard navigation, modal focus/Escape, mobile widths, document forgetting, and network requests. Screenshots and fixtures stay in that temporary directory for review. These fixtures test the reader; they do not verify any AD&D wording, page content, or scan region.

No source-book regions have been visually verified in this environment. The reader therefore shows the whole cited local page and explicitly says focused regions are not yet verified. It contains no invented bounding boxes or highlights. Shared cropped source images remain unimplemented while source materialization is blocked by the supported environment access setup.
