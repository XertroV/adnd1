#!/usr/bin/env python3
"""Record private-source identity and page denominators, without copying text/pixels.

This is a discovery inventory, never a content-completeness detector. Page mappings
are taken from the application's declared map; book workers review their meaning.
"""
import argparse
import hashlib
import json
import pathlib
import subprocess

import fitz

SOURCES = {
    'PHB': ('tsr2010-players-handbook.pdf', 'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095', 130),
    'DMG': ('DMG_1stEd.pdf', '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669', 240),
    'UA': ('Unearthed Arcana.pdf', 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4', 130),
    'MM': ('Monster_Manual.pdf', 'c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81', 114),
    'MM2': ('Monster Manual II.pdf', 'b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24', 162),
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parent.parent
    # Use the real application map rather than guessing a page+1 offset.
    mapping_script = """const b=require('./dist/books.js');
const result={};for(const [key,book] of Object.entries(b.books)){
result[key]={description:book.mapping,printedPages:[]};
for(let p=1;p<=book.lastPage;p++)result[key].printedPages.push({printedPage:p,pdfPage:b.pdfPage(key,p),availability:b.availability(key,p)});
}process.stdout.write(JSON.stringify(result));"""
    maps = json.loads(subprocess.check_output(['node', '-e', mapping_script], cwd=root))
    data = json.loads((root / 'dist/data.json').read_text())
    books = []
    for code, (name, expected_hash, expected_pages) in SOURCES.items():
        path = args.source_dir / name
        actual_hash = digest(path)
        if actual_hash != expected_hash:
            raise ValueError(f'{code}: unexpected source bytes')
        document = fitz.open(path)
        if len(document) != expected_pages:
            raise ValueError(f'{code}: unexpected PDF page count')
        reverse = {p['pdfPage']: p['printedPage'] for p in maps[code]['printedPages'] if p['pdfPage'] is not None}
        pages = []
        for index, page in enumerate(document):
            text = page.get_text()
            pages.append({
                'pdfPage': index + 1,
                'declaredPrintedPage': reverse.get(index + 1),
                'mappingStatus': 'application-declared-not-new-visual-review' if index + 1 in reverse else 'outside-verified-numbered-page-map',
                'mediaBoxPoints': list(page.mediabox),
                'cropBoxPoints': list(page.cropbox),
                'textLayerCharacters': len(text),
                'textLayerSha256': hashlib.sha256(text.encode()).hexdigest(),
                'sourceUnitDenominator': None,
                'semanticCoverage': 'unassessed-by-page-discovery',
            })
        books.append({'book': code, 'fileName': name, 'sha256': actual_hash,
                      'sizeBytes': path.stat().st_size, 'pdfPages': len(document),
                      'declaredMapping': maps[code], 'pages': pages})
    supplement = args.source_dir / 'dmg175.jpg'
    supplement_hash = digest(supplement)
    if supplement_hash != 'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7':
        raise ValueError('DMG175: unexpected supplemental source bytes')
    pixels = fitz.Pixmap(str(supplement))
    if [pixels.width, pixels.height] != [1329, 1796]:
        raise ValueError('DMG175: unexpected supplemental dimensions')
    result = {
        'schemaVersion': 1,
        'artifactType': 'source-completeness-page-discovery-baseline',
        'inputCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
        'dataSha256': digest(root / 'dist/data.json'),
        'mappingCodeSha256': digest(root / 'dist/books.js'),
        'scope': 'Five exact supplied PDFs and one separate authorized DMG175 image. Every physical PDF page is inventoried; source-unit semantic denominators remain independent and unresolved by this detector.',
        'denominators': {'canonicalPdfs': 5, 'physicalPdfPages': sum(b['pdfPages'] for b in books),
                         'supplementalImages': 1, 'semanticallyCompleteBooks': 0,
                         'completeSourceUnitCount': None,
                         'siteOwners': sum(len(data[k]) for k in ['rules', 'spells', 'equipment', 'matrices', 'classes']) + int(bool(data.get('progressionExplainer')))},
        'books': books,
        'supplement': {'book': 'DMG', 'printedPage': 175, 'pdfPage': None, 'fileName': supplement.name,
                       'sha256': supplement_hash, 'sizeBytes': supplement.stat().st_size,
                       'dimensionsPx': [pixels.width, pixels.height], 'editionStatus': 'user-confirmed-correct-edition',
                       'canonicalPdfPhysicallyContainsPage': False, 'publishedFullImage': False,
                       'semanticCoverage': 'independent-unit-review-required'},
        'limitations': ['Text-layer counts/hashes are discovery metadata; neither text presence nor no lexical candidate is a completeness pass.',
                        'Printed-page maps are application declarations, not new visual approval of every page.',
                        'Tables, rows, procedures, definitions, qualifiers and continuations require separate source-unit inventories.',
                        'No source text, full-page raster or private PDF is included in this artifact.'],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'denominators': result['denominators']}))


if __name__ == '__main__':
    main()
