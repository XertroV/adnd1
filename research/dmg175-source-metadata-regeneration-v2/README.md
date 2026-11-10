# D175 source metadata regeneration V2

This is a research-only helper and patch set for the next committed D175 source phase. It keeps the separately supplied p.175 JPEG in image-pixel coordinates and outside every PDF-frame/raster calculation. The crop registry records source identity and bounds only; it makes no semantic, source-value, focus-grade, context, or completeness determination.

The input is the 12-catalog D175 set captured from source draft tree `386b08a4678ee033d6daabc0ffa2cc17265a7c1f`, with the final character-levels catalog overlay pinned at SHA-256 `f7f2c6b0e3272ee9c078686ce03b065160bde6b0f1218a9c8d9e9efdd51e66ff`. The source-phase draft data, Books, and continuation outputs are pinned in `inputs/catalog-source-pins-v1.json`; the final source commit is still pending. Rebuild as a new version if the committed catalogs or final `dist/books.js` hash differ.

The closed crop registry has 34 unique p.175 region IDs across 8 crop-image hashes and preserves the exact two legacy crop tuples. The stable left-column region ID maps to the accepted fd13 crop bounds `[0,1625,650,1760]` and image hash `fd13f5d51d4f527d8887c31627d39ce224c33ccd810a78bd8b01ba204f8aa3fc`. The separate source artifact remains the user-confirmed-correct-edition JPEG, with printing unspecified and no canonical-PDF page ordinal. The bridge successor keeps all 9 old frames, 7 physical PDF pages, and 102 owner joins exact; its only data change is `provenance.booksJsSha256`. Proposed Python and JavaScript bridge consumers point to `research/source-frame-coordinate-bridge-dmg175-source-v1.json`.

V1 is preserved unchanged. Its manifest listed 37 files, including two `__pycache__` bytecode files whose current bytes no longer match the frozen hashes. V2 records that limitation as a historical input and hashes 35 source/artifact files while excluding `__pycache__` directories and `.pyc` files.

## Research-only generation and checks

Run these from the repository root, currently `/workspace/adnd1-next-source-native`:

```sh
node research/dmg175-source-metadata-regeneration-v2/build-registry-v2.mjs
node --test research/dmg175-source-metadata-regeneration-v2/tests/source-registry-v2.test.mjs
python3 research/dmg175-source-metadata-regeneration-v2/tests/test_supplemental_identity_map_v2.py
python3 -m py_compile research/dmg175-source-metadata-regeneration-v2/outputs/continuation-candidates-dmg175-v2.py research/dmg175-source-metadata-regeneration-v2/outputs/source_frame_coordinate_bridge-dmg175-v2.py
for p in research/dmg175-source-metadata-regeneration-v2/patches/*.patch; do git apply --check "$p" || exit 1; done
```

The proposed continuation helper recognizes only the closed 34-ID source map and retains the existing artifact/JPEG/PDF identity guards. The source-visual patch replaces stale two-excerpt wording. The bridge patch points the Python and JavaScript consumers to the canonical versioned bridge path without changing the 9-frame/102-join data. These are proposal outputs only; no active tools, registries, pointers, source records, or sealed artifacts were changed.

## After the exact source-phase commit

Do not regenerate geometry from the dirty intermediate assembly or run `bind-citation-source-audit-input-commit.mjs`; that binder is scoped to a different hard-coded data/Books hash and fixed artifacts. After root provides the exact clean source-phase SHA, first confirm it contains the pinned final 12 catalogs, final Books file hash, 9/102 bridge successor, and D175 closed-crop helper. Then run each producer sequentially against that commit and the private source directory, using new unique paths with the commit prefix:

```sh
python3 research/source-visual-audit.py \
  --source-dir /workspace/vault-audit-private/sources \
  --output-prefix dmg175-source-<commit12> \
  --data-root dist --output-dir research

python3 research/source-raster-boundary-audit.py \
  --source-dir /workspace/vault-audit-private/sources \
  --source-usage-map research/source-visual-audit-dmg175-source-<commit12>.json \
  --data-root dist --dpi 300 --band-px 8 \
  --output research/source-raster-boundary-dmg175-source-<commit12>.json.gz

python3 tools/continuation-candidates.py \
  --root /workspace/adnd1-next-source-native \
  --source-dir /workspace/vault-audit-private/sources \
  --output research/source-audit-pass8-dmg175-continuation-<commit12>-full.json.gz \
  --summary research/source-audit-pass8-dmg175-continuation-<commit12>.json \
  --markdown research/source-audit-pass8-dmg175-continuation-<commit12>.md \
  --commit <full-commit-sha>
```

The visual report counts current `sourceExcerpts` and `scanVerification` uses and records the active source-frame result. The raster report references the exact visual-map hash, verifies the five canonical PDFs and supplemental JPEG identity, and reports the valid JPEG crops as non-PDF/not-assessable raster uses. The continuation report measures unique catalog-region rows, per-binding region uses, property pointers, and candidate source-page flows separately. These denominators are distinct; zero geometry candidates are not a semantic pass.

After independently checking the generated hashes and counts, update only the two mutable current pointers with repository-relative paths: `research/current-source-raster-snapshot.json` must pair the new raster gzip with the exact source-visual JSON hash; `research/current-continuation-candidate-snapshot.json` must pair the new continuation summary and full gzip. Preserve the old `source-visual-audit-ua-source-v1.json` and `source-raster-boundary-ua-source-v1.json.gz`. Validate with `node tools/source-raster-coverage.mjs --check --output artifacts/source-raster-coverage-dmg175-<commit12>.json` and `node tools/continuation-candidates-validate.mjs --repo-root /workspace/adnd1-next-source-native --force-current-tree --current-snapshot --output-dir artifacts/continuation-validation-dmg175-<commit12>`. Only then bind the exact source commit in a separate metadata-phase receipt/commit. Keep the 1881 prior visual-review rows and 1215 mechanics grades as an unchanged prefix; the separately authorized fd13 crop/highlight note is the only permitted review append in this phase. Other new regions and geometry/raster outputs remain semantically unresolved.
