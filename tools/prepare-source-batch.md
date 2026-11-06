# Private source batch preparation

`prepare-source-batch.py` renders local, user-supplied PDFs into a private review folder. It requires Python 3, PyMuPDF (`fitz`), and Pillow; it does not download sources. The tool does not establish the edition, page order, accuracy of extracted values, or visual verification. Supply the exact editions and scan order expected by `dist/books.js` and independently check them against the actual scans. Mappings are assumptions until confirmed.

Create a private JSON file such as `private/input.json`:

```json
{
  "sources": {"PHB": "/path/to/local/phb.pdf", "DMG": "/path/to/local/dmg.pdf"},
  "entries": [
    {"id": "sample", "book": "PHB", "printedPage": 35, "rect": [0.1, 0.2, 0.5, 0.3]},
    {"id": "whole-page", "book": "DMG", "printedPage": 174}
  ]
}
```

Paths may be absolute or relative to the manifest. IDs must be unique, using letters, digits, hyphens or underscores. Book codes are `PHB`, `UA`, `DMG`, `MM`, and `MM2`; page numbers are printed page numbers. Rectangles are optional normalized `[x, y, width, height]`, with the origin at the upper left of the rendered page. All components must fit inside the page and width and height must be positive. Use up to 20 entries per batch.

```sh
python3 tools/prepare-source-batch.py private/input.json private/review-batch-01 --dpi 144
python3 tests/test-prepare-source-batch.py
```

The output directory must not exist; choose a fresh location outside this repository or under its ignored `private/` directory. An outside location may itself be public or tracked: choose a genuinely private location, never another site's `dist` directory. The tool validates the entire input before rendering, rejects missing DMG printed page 175 and unverified pages 239–240, out-of-range mappings, and invalid rectangles, and removes its newly created output directory if rendering fails. It does not copy PDFs or extract OCR.

Each entry produces a complete page PNG and, when a rectangle is supplied, a crop and a page with a red outline. `review.json` records the input PDF SHA-256 and page count, printed and mapped PDF pages (PDF pages are 1-based), rectangle, pixel dimensions, output SHA-256 hashes, and pending status. Filenames and hashes identify supplied material; neither confirms its edition or provenance. Do not publish these files automatically. Keep the manifest and generated images private.

For handoff, an independent reviewer should compare the PDF edition and printed page to the mapping, inspect each complete page, highlight and crop for boundaries and cited values, and record their own findings separately. A reviewer should then exercise the relevant source viewer on desktop and mobile, including readability, navigation, zoom and source labels. Only a separate, documented review may establish a verified status; this script never emits the viewer's `visually-checked-crop` label or a publishable catalog.

## Preparing an inventory queue batch

After generating the source inventory with `node tools/source-scan-inventory.mjs`, put your actual local paths in `private/sources.json`. These are example filenames only; compare the edition and page order against the actual PDFs before relying on the mappings:

```json
{"PHB":"/private/PHB.pdf", "UA":"/private/UA.pdf", "DMG":"/private/DMG.pdf", "MM":"/private/MM.pdf", "MM2":"/private/MM2.pdf"}
```

For example, generate the first PHB batch without transcribing its page list. Change `phb-001` to the desired ID from `queue.batches` in `tests/fixtures/source-scan-inventory.json`. The generated entries request complete pages; add rectangles only after inspecting the pages. The output manifest and source paths remain private.

```sh
python3 - phb-001 <<'PY'
import json, sys
from pathlib import Path
inventory = json.loads(Path('tests/fixtures/source-scan-inventory.json').read_text())
sources = json.loads(Path('private/sources.json').read_text())
matches = [b for b in inventory['queue']['batches'] if b['id'] == sys.argv[1]]
if len(matches) != 1:
    raise SystemExit('Unknown or ambiguous batch ID')
batch = matches[0]
book = batch['book']
if book not in sources or not Path(sources[book]).is_absolute():
    raise SystemExit('Provide an absolute private PDF path for this book')
manifest = {'sources': {book: sources[book]}, 'entries': [
    {'id': f'{book.lower()}-{page}', 'book': book, 'printedPage': page}
    for page in batch['pages']
]}
path = Path('private') / (batch['id'] + '-input.json')
with path.open('x') as f:
    json.dump(manifest, f, indent=2)
    f.write('\n')
print(path)
PY
python3 tools/prepare-source-batch.py private/phb-001-input.json private/phb-001-review
```

Blocked pages are not in the queue; they require matching source evidence and separate handling. The tool still rejects the confirmed DMG gap and unverified end matter even if a manifest is edited manually.
