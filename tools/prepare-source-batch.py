#!/usr/bin/env python3
"""Prepare private, unverified page and region images from locally supplied PDFs."""
import argparse
import hashlib
import json
import math
import re
import shutil
import sys
from pathlib import Path

import fitz
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
LIMITS = {'PHB': 128, 'UA': 128, 'DMG': 240, 'MM': 112, 'MM2': 160}


def pdf_page(book, page):
    if book not in LIMITS or type(page) is not int or not 1 <= page <= LIMITS[book]:
        raise ValueError(f'Invalid book or printed page: {book} {page}')
    if book == 'DMG':
        if page == 175:
            raise ValueError(f'DMG printed page {page} is missing from the supplied scan')
        if page in (239, 240):
            raise ValueError(f'DMG printed page {page} is unverified in the supplied scan')
        return page + 1 if page <= 174 else page
    if book == 'MM2':
        return 92 if page == 83 else page if 84 <= page <= 91 else page + 1
    return page + 1


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def rectangle(value):
    if not isinstance(value, list) or len(value) != 4 or any(type(x) not in (int, float) or not math.isfinite(x) for x in value):
        raise ValueError('rect must be [x, y, width, height] in normalized page coordinates')
    x, y, w, h = value
    if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > 1 or y + h > 1:
        raise ValueError('rect must have positive area and fit within the page')
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path, help='JSON batch manifest; PDF paths are relative to this file')
    parser.add_argument('output', type=Path, help='new private output directory, outside the repository or under private/')
    parser.add_argument('--dpi', type=int, default=144)
    args = parser.parse_args()
    if not 36 <= args.dpi <= 300:
        parser.error('--dpi must be between 36 and 300')
    out = args.output.resolve()
    if out == ROOT or (ROOT in out.parents and not (out == ROOT / 'private' or ROOT / 'private' in out.parents)):
        parser.error('output must be outside the repository or under its ignored private/ directory')
    if out.exists():
        parser.error('output already exists; choose a new directory')
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    sources, entries = manifest['sources'], manifest['entries']
    if not isinstance(sources, dict) or not isinstance(entries, list) or not 1 <= len(entries) <= 20:
        raise ValueError('sources must be an object and entries must contain 1–20 items')
    docs, source_info, prepared, ids = {}, {}, [], set()
    created = False
    try:
        for entry in entries:
            ident, book, printed = entry['id'], entry['book'], entry['printedPage']
            if not isinstance(ident, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', ident) or ident in ids:
                raise ValueError(f'Invalid or duplicate entry id: {ident!r}')
            ids.add(ident)
            page = pdf_page(book, printed)
            rect = rectangle(entry['rect']) if 'rect' in entry else None
            if book not in docs:
                path = (args.manifest.resolve().parent / sources[book]).resolve()
                doc = fitz.open(path)
                if doc.needs_pass:
                    doc.close()
                    raise ValueError(f'{book} PDF requires a password')
                docs[book] = doc
                source_info[book] = {'filename': path.name, 'sha256': digest(path), 'pageCount': doc.page_count}
            if page > docs[book].page_count:
                raise ValueError(f'{book} printed page {printed} maps to PDF page {page}, beyond supplied PDF')
            prepared.append((entry, page, rect))
        # Validate the whole batch before writing any output.
        out.mkdir(parents=True, mode=0o700)
        created = True
        results = []
        for entry, page, rect in prepared:
            ident, book = entry['id'], entry['book']
            pix = docs[book][page - 1].get_pixmap(dpi=args.dpi, alpha=False, colorspace=fitz.csRGB)
            im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
            page_name = f'{ident}-page.png'
            im.save(out / page_name)
            files = {'page': {'file': page_name, 'sha256': digest(out / page_name)}}
            if rect:
                x, y, w, h = rect
                box = (math.floor(x * im.width), math.floor(y * im.height), math.ceil((x + w) * im.width), math.ceil((y + h) * im.height))
                crop_name, marked_name = f'{ident}-crop.png', f'{ident}-highlight.png'
                im.crop(box).save(out / crop_name)
                marked = im.copy()
                ImageDraw.Draw(marked).rectangle((box[0], box[1], box[2] - 1, box[3] - 1), outline='red', width=max(2, args.dpi // 36))
                marked.save(out / marked_name)
                for key, name in [('crop', crop_name), ('highlight', marked_name)]:
                    files[key] = {'file': name, 'sha256': digest(out / name)}
            results.append({'id': ident, 'book': book, 'printedPage': entry['printedPage'], 'pdfPage': page,
                            'rect': rect, 'rectUnits': 'normalized x,y,width,height; origin top-left',
                            'pagePixels': [im.width, im.height], 'files': files,
                            'verification': 'pending-independent-visual-verification'})
        result = {'schemaVersion': 1, 'status': 'pending-independent-visual-verification', 'dpi': args.dpi,
                  'sourceEditionAndMapping': 'unverified; independent visual review required',
                  'sources': source_info, 'entries': results,
                  'handoff': 'Independently inspect the source edition, page mapping, each crop and highlighted area, and values; then perform desktop and mobile viewer QA. Preparation does not verify any source.'}
        (out / 'review.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
        print(f'Prepared {len(results)} entries in {out}; independent visual verification pending.')
    except Exception:
        if created:
            shutil.rmtree(out)
        raise
    finally:
        for doc in docs.values():
            doc.close()


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError, RuntimeError) as exc:
        print(f'error: {exc}', file=sys.stderr)
        sys.exit(1)
