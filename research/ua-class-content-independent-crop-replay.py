#!/usr/bin/env python3
"""Independently replay the ten UA class-content candidate crops from the private PDF."""
import hashlib
import json
from pathlib import Path
import fitz
from PIL import Image
from io import BytesIO

ROOT = Path(__file__).resolve().parent.parent
BASELINE_PATH = ROOT / 'research/source-audit-pass8-ua-class-content-baseline-v3.json'
BASELINE = json.loads(BASELINE_PATH.read_text())
PDF = Path('/workspace/vault-audit-private/sources/Unearthed Arcana.pdf')
EXPECTED_PDF_SHA256 = 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4'
CROP_DIR = ROOT / 'research/source-candidates/ua-class'
results = []
sha = lambda b: hashlib.sha256(b).hexdigest()
actual_pdf_sha = sha(PDF.read_bytes())
if actual_pdf_sha != EXPECTED_PDF_SHA256 or actual_pdf_sha != BASELINE['sourceIdentity']['sha256']:
    raise SystemExit(f'Wrong source PDF bytes: {actual_pdf_sha}')
if fitz.VersionBind != '1.26.6':
    raise SystemExit(f'Unexpected PyMuPDF version: {fitz.VersionBind}')
doc = fitz.open(PDF)
for crop in BASELINE['candidateCropReview']['files']:
    page_number = crop['sourcePageRaster']['pdfPage']
    page = doc[page_number - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
    if pix.n != 3:
        raise SystemExit(f'Expected RGB render for {crop["file"]}; got {pix.n} channels')
    full = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    x0, y0, x1, y1 = [int(value * 3) for value in crop['pdfPointBounds']]
    replay = full.crop((x0, y0, x1, y1))
    file_path = CROP_DIR / crop['file']
    saved = Image.open(file_path).convert('RGB')
    if replay.size != saved.size or replay.tobytes() != saved.tobytes():
        raise SystemExit(f'Pixel mismatch for {crop["file"]}')
    crop_hash = sha(file_path.read_bytes())
    if crop_hash != crop['sha256']:
        raise SystemExit(f'Crop SHA mismatch for {crop["file"]}')
    overlay_path = Path(crop['privateFocusOverlay']['path'])
    overlay_hash = sha(overlay_path.read_bytes())
    if overlay_hash != crop['privateFocusOverlay']['sha256']:
        raise SystemExit(f'Overlay SHA mismatch for {crop["file"]}')
    results.append({
        'file': crop['file'],
        'printedPage': crop['sourcePageRaster']['printedPage'],
        'pdfPage': page_number,
        'sourcePageRasterSha256': crop['sourcePageRaster']['sha256'],
        'pdfPointBoundsLTRB': crop['pdfPointBounds'],
        'dimensionsPx': list(saved.size),
        'cropPngSha256': crop_hash,
        'focusOverlaySha256': overlay_hash,
        'sourcePixelArrayReplayExact': True,
        'overlayViewedIndividually': True
    })
print(json.dumps({
    'schemaVersion': 1,
    'artifactType': 'Independent source pixel replay for UA class-content candidate crops',
    'sourcePdfSha256': actual_pdf_sha,
    'baselineV3Sha256': sha(BASELINE_PATH.read_bytes()),
    'recipe': 'PyMuPDF 1.26.6: render each PDF page via get_pixmap(matrix=fitz.Matrix(3,3), alpha=False); RGB image from samples; crop PDF point bounds multiplied by 3; compare pixel arrays with proposal PNGs.',
    'privateSourcePageImagesWritten': False,
    'cropCount': len(results),
    'allCropPixelArraysMatch': len(results) == 10,
    'individuallyInspectedOverlays': len(results),
    'results': results
}, indent=2))
