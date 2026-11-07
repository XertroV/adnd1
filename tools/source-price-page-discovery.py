#!/usr/bin/env python3
"""Offline broad-cue discovery for source-price passages in five local PDFs.

This tool inventories every PDF page and emits candidate text-line spans with
source-PDF point bounds. Candidates are not source-value transcriptions or
semantic confirmations. Output contains limited source text; keep it private.
Requires PyMuPDF only for PDF reading. The cue/fixture functions use stdlib.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import platform
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DETECTOR_VERSION = 1
PDF_FILES = {
    'PHB': 'tsr2010-players-handbook.pdf',
    'DMG': 'DMG_1stEd.pdf',
    'UA': 'Unearthed Arcana.pdf',
    'MM': 'Monster_Manual.pdf',
    'MM2': 'Monster Manual II.pdf',
}
FLAGS = re.IGNORECASE | re.UNICODE
NUMBER = r'(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?'
ABBREV = r'(?:g\.?\s*p\.?|s\.?\s*p\.?|c\.?\s*p\.?|e\.?\s*p\.?|p\.?\s*p\.?)'
WRITTEN_DENOMINATION = r'(?:gold|silver|copper|electrum|platinum)\s+pieces?'
CUE_PATTERNS = [
    {'id': 'currency-abbreviation', 'kind': 'currency', 'pattern': r'(?<![A-Za-z])' + ABBREV + r'(?![A-Za-z])'},
    {'id': 'written-denomination', 'kind': 'currency', 'pattern': r'\b' + WRITTEN_DENOMINATION + r'\b'},
    {'id': 'dollar-sign', 'kind': 'currency', 'pattern': r'\$'},
    {'id': 'transaction-language', 'kind': 'transaction', 'pattern': r'\b(?:buy|buys|buying|bought|purchase\w*|price\w*|cost\w*|spend\w*|spent|sell\w*|sold|sale\w*|market\w*|charge\w*|fee\w*|hire\w*|service\w*|rent\w*|wage\w*|salary|salaries|toll\w*|commission\w*|tax\w*|barter\w*|trade\w*)\b'},
    {'id': 'valuation-language', 'kind': 'valuation', 'pattern': r'\b(?:value\w*|worth|apprais\w*|valuation\w*|valued|valuables?)\b'},
    {'id': 'wealth-language', 'kind': 'wealth', 'pattern': r'\b(?:treasure\w*|hoard\w*|wealth|coin\w*|loot|jewel\w*|gem\w*|rich\w*|poor\w*|savings?)\b'},
    {'id': 'weight-unit', 'kind': 'weight', 'pattern': r'(?<![A-Za-z])' + NUMBER + r'\s*(?:lb\.?s?|oz\.?)\b|\b(?:weight|weighs?|weighed)\b.{0,24}(?<![A-Za-z])' + NUMBER + r'\s*(?:pounds?|ounces?)\b|(?<![A-Za-z])' + NUMBER + r'\s*(?:pounds?|ounces?)\b.{0,24}\b(?:weight|weighs?|weighed)\b'},
    {'id': 'experience-points', 'kind': 'xp', 'pattern': r'(?<![A-Za-z])' + NUMBER + r'\s*(?:x\.?p\.?|experience\s+points?)\b'},
]
MONEY_PATTERNS = [
    {'id': 'numeric-abbreviated-currency', 'pattern': r'(?<![\w.])(?P<amount>' + NUMBER + r')\s*(?P<currency>' + ABBREV + r')(?![A-Za-z])'},
    {'id': 'numeric-written-currency', 'pattern': r'(?<![\w.])(?P<amount>' + NUMBER + r')\s+(?P<currency>' + WRITTEN_DENOMINATION + r')\b'},
    {'id': 'numeric-dollar-value', 'pattern': r'\$\s*(?P<amount>' + NUMBER + r')'},
]
FORMULA_PATTERN = re.compile(r'(?:\bper\b|\beach\b|\btimes?\b|\bdivided\b|\bmultiplied\b|[+×*÷/]\s*' + NUMBER + r'|\s+x\s+|\b\d*d\d+\b)', FLAGS)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def detector_config() -> dict:
    return {
        'version': DETECTOR_VERSION,
        'engine': 'Python standard-library re',
        'flags': ['IGNORECASE', 'UNICODE'],
        'numberPattern': NUMBER,
        'cuePatterns': CUE_PATTERNS,
        'moneyPatterns': MONEY_PATTERNS,
        'formulaPattern': FORMULA_PATTERN.pattern,
        'weightAndXpPolicy': 'Only lines with explicit weight units or XP units and no monetary, transaction, or valuation cue are marked as syntactically explicit non-price candidates; they do not clear the rest of a page.',
        'negativePolicy': 'No configured cue, an empty text layer, or an extraction problem is never an absence pass.',
        'semanticPolicy': 'No match or classification confirms a source price, formula, rule, page identity, or completeness.',
    }


def cue_matches(text: str) -> list[dict]:
    matches = []
    for cue in CUE_PATTERNS:
        for match in re.finditer(cue['pattern'], text, FLAGS):
            matches.append({
                'cueId': cue['id'], 'cueKind': cue['kind'], 'matchedText': match.group(0),
                'characterStart': match.start(), 'characterEnd': match.end(),
            })
    return sorted(matches, key=lambda match: (match['characterStart'], match['characterEnd'], match['cueId']))


def money_matches(text: str) -> list[dict]:
    matches = []
    for pattern in MONEY_PATTERNS:
        for match in re.finditer(pattern['pattern'], text, FLAGS):
            currency = match.groupdict().get('currency') or 'USD'
            matches.append({
                'patternId': pattern['id'], 'amountText': match.group('amount'),
                'currencyText': currency.strip(), 'matchedText': match.group(0),
                'characterStart': match.start(), 'characterEnd': match.end(),
            })
    return sorted(matches, key=lambda match: (match['characterStart'], match['characterEnd'], match['patternId']))


def line_classification(text: str, cues: list[dict], values: list[dict]) -> tuple[str | None, str | None]:
    kinds = {cue['cueKind'] for cue in cues}
    if values:
        if FORMULA_PATTERN.search(text):
            return 'formula-candidate', 'formula cue overlaps a numeric-money candidate; inspect source context'
        if 'wealth' in kinds:
            return 'wealth-or-treasure-value-candidate', 'wealth cue and numeric-money candidate; inspect source context'
        return 'direct-money-value-candidate', 'numeric-money pattern only; inspect printed unit and qualifier'
    if 'transaction' in kinds or 'valuation' in kinds:
        return 'transaction-or-valuation-cue-candidate', 'broad language cue without a parsed numeric-money value'
    if 'wealth' in kinds:
        return 'wealth-language-cue-candidate', 'wealth or treasure cue without a parsed numeric-money value'
    if 'currency' in kinds:
        return 'currency-denomination-cue-candidate', 'currency token or denomination without a parsed numeric-money value'
    if 'xp' in kinds:
        return 'known-exclusion-xp-only', 'explicit XP unit and no monetary, transaction, or valuation cue on this line'
    if 'weight' in kinds:
        return 'known-exclusion-weight-only', 'explicit mass unit and no monetary, transaction, or valuation cue on this line'
    return None, None


def union_bounds(boxes: list[list[float]]) -> list[float] | None:
    valid = [box for box in boxes if isinstance(box, (list, tuple)) and len(box) == 4]
    if not valid:
        return None
    return [min(float(box[0]) for box in valid), min(float(box[1]) for box in valid),
            max(float(box[2]) for box in valid), max(float(box[3]) for box in valid)]


def candidate_lines(lines: list[dict], book: str, pdf_page: int) -> list[dict]:
    candidates = []
    for line_index, line in enumerate(lines):
        text = line.get('text', '')
        if not text.strip():
            continue
        cues = cue_matches(text)
        values = money_matches(text)
        classification, basis = line_classification(text, cues, values)
        if classification is None:
            continue
        box = line.get('boundsPdfPoints')
        seed = json.dumps([book, pdf_page, line.get('blockIndex'), line_index, text, classification], ensure_ascii=False, separators=(',', ':'))
        candidate_id = hashlib.sha256(seed.encode('utf-8')).hexdigest()[:20]
        candidates.append({
            'candidateId': f'spc-{candidate_id}', 'book': book, 'pdfPage': pdf_page,
            'blockIndex': line.get('blockIndex'), 'lineIndex': line_index,
            'classification': classification, 'classificationBasis': basis,
            'reviewStatus': 'pending-source-review', 'semanticStatus': 'not-assessed',
            'text': text.strip(), 'cueMatches': cues, 'moneyValueCandidates': values,
            'sourcePdfPointBounds': {
                'coordinateSpace': 'source-pdf-points-top-left-origin',
                'format': 'x0-y0-x1-y1', 'precision': 'union-of-text-span-boxes-for-line',
                'rect': [round(value, 3) for value in box] if box else None,
            },
            'boundsStatus': 'candidate-line-bounds-available' if box else 'not-assessable-no-text-span-bounds',
        })
    return candidates


def analyze_page_text(blocks: list[dict], book: str, pdf_page: int) -> dict:
    lines = []
    char_count = 0
    for block_index, block in enumerate(blocks):
        for local_line_index, line in enumerate(block.get('lines', [])):
            spans = [span for span in line.get('spans', []) if isinstance(span.get('text'), str)]
            text = ''.join(span['text'] for span in spans).strip()
            if not text:
                continue
            char_count += len(text)
            bounds = union_bounds([span.get('bbox') for span in spans])
            lines.append({'blockIndex': block_index, 'lineIndexWithinBlock': local_line_index, 'text': text, 'boundsPdfPoints': bounds})
    candidates = candidate_lines(lines, book, pdf_page)
    explicit_exclusions = sum(candidate['classification'].startswith('known-exclusion-') for candidate in candidates)
    active_candidates = len(candidates) - explicit_exclusions
    if char_count == 0:
        status = 'not-assessable-empty-text-layer'
    elif active_candidates:
        status = 'broad-cue-candidates-pending-review'
    elif explicit_exclusions:
        status = 'only-explicit-weight-or-xp-line-candidates; rest-not-assessed'
    else:
        status = 'screened-no-configured-cue-not-absence'
    return {
        'pdfPage': pdf_page, 'textLayer': {'status': 'text-present' if char_count else 'empty-or-unextractable', 'characterCount': char_count},
        'screenStatus': status, 'candidateCount': active_candidates,
        'explicitExclusionCandidateCount': explicit_exclusions,
        'reviewStatus': 'not-reviewed', 'candidates': candidates,
    }


def page_lines_from_dict(page_dict: dict) -> list[dict]:
    """Pure adapter for PyMuPDF text-dict block data; exported for stdlib fixtures."""
    blocks = page_dict.get('blocks', [])
    return blocks


def discover_pdf(path: Path, book: str, fitz_module) -> tuple[dict, list[dict]]:
    digest = sha256_file(path)
    doc = fitz_module.open(path)
    try:
        pages = []
        for page_number in range(doc.page_count):
            try:
                page = doc.load_page(page_number)
                rect = page.rect
                report = analyze_page_text(page_lines_from_dict(page.get_text('dict')), book, page_number + 1)
                report['pageGeometryPdfPoints'] = {
                    'coordinateSpace': 'source-pdf-points-top-left-origin', 'format': 'width-height',
                    'width': round(float(rect.width), 3), 'height': round(float(rect.height), 3),
                    'rotationDegrees': int(page.rotation),
                }
                report['extractionError'] = None
            except Exception as exc:  # Retain the PDF page in the denominator.
                report = {
                    'pdfPage': page_number + 1,
                    'textLayer': {'status': 'extraction-error', 'characterCount': None},
                    'screenStatus': 'not-assessable-extraction-error', 'candidateCount': 0,
                    'explicitExclusionCandidateCount': 0, 'reviewStatus': 'not-reviewed',
                    'candidates': [], 'pageGeometryPdfPoints': None,
                    'extractionError': type(exc).__name__,
                }
            pages.append(report)
        source = {
            'book': book, 'fileName': path.name, 'sourceSha256': digest,
            'pdfPageCount': doc.page_count, 'pageCountMatchesPdf': len(pages) == doc.page_count,
        }
        return source, pages
    finally:
        doc.close()


def validate_paths(source_dir: Path, output_dir: Path) -> dict[str, Path]:
    source_dir = source_dir.resolve()
    output_dir = output_dir.resolve()
    if output_dir.exists():
        raise ValueError(f'output directory already exists; choose a new --output-dir: {output_dir}')
    if output_dir == ROOT or ROOT in output_dir.parents:
        raise ValueError('output must be outside the repository so extracted source text stays private')
    if output_dir == source_dir or source_dir in output_dir.parents:
        raise ValueError('output directory cannot be inside the source PDF directory')
    if output_dir in source_dir.parents:
        raise ValueError('output directory cannot contain the source PDF directory')
    paths = {book: source_dir / file_name for book, file_name in PDF_FILES.items()}
    missing = [str(path.name) for path in paths.values() if not path.is_file()]
    if missing:
        raise ValueError('missing required source PDFs: ' + ', '.join(missing))
    return paths


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', required=True, type=Path, help='directory containing the five exact local PDFs')
    parser.add_argument('--output-dir', required=True, type=Path, help='new output directory outside the repository; it must not already exist')
    args = parser.parse_args(argv)
    try:
        paths = validate_paths(args.source_dir, args.output_dir)
        import fitz  # PyMuPDF is deliberately not needed for stdlib cue tests.
        sources, pages_by_book = [], {}
        for book, path in paths.items():
            source, pages = discover_pdf(path, book, fitz)
            sources.append(source)
            pages_by_book[book] = pages
        config = detector_config()
        config_json = json.dumps(config, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
        report = {
            'schemaVersion': 1,
            'generatedBy': 'tools/source-price-page-discovery.py',
            'detectorVersion': DETECTOR_VERSION,
            'scope': 'Discovery aid only: every PDF page is inventoried, and configured text-layer cues produce pending candidates. This is not a complete price transcription, visual source review, semantic confirmation, or proof of absence.',
            'limits': [
                'Text-layer matches can be false positives; OCR or PDF text layers can miss visible content.',
                'Pages without configured cues are not absence-checked and remain semantically unreviewed.',
                'Line boxes are candidate locations, not exact glyph bounds or validated source regions.',
                'No candidate is automatically confirmed as a price, formula, wealth rule, weight, XP rule, or exclusion.',
            ],
            'runtime': {'python': platform.python_version(), 'regexEngine': 'stdlib re', 'pymupdf': getattr(fitz, 'VersionBind', None)},
            'cueConfiguration': config,
            'cueConfigurationSha256': hashlib.sha256(config_json.encode('utf-8')).hexdigest(),
            'sources': sources,
            'denominators': {'sourcePdfs': len(sources), 'pdfPages': sum(source['pdfPageCount'] for source in sources)},
            'counts': {},
            'pagesByBook': pages_by_book,
        }
        all_candidates = [candidate for pages in pages_by_book.values() for page in pages for candidate in page['candidates']]
        by_status = {}
        by_book = {}
        for book, pages in pages_by_book.items():
            by_book[book] = {
                'pdfPages': len(pages),
                'textPresent': sum(page['textLayer']['status'] == 'text-present' for page in pages),
                'emptyOrUnextractable': sum(page['textLayer']['status'] == 'empty-or-unextractable' for page in pages),
                'candidates': sum(page['candidateCount'] for page in pages),
                'explicitExclusionCandidates': sum(page['explicitExclusionCandidateCount'] for page in pages),
            }
            for page in pages:
                by_status[page['screenStatus']] = by_status.get(page['screenStatus'], 0) + 1
        report['counts'] = {
            'pagesByBook': by_book, 'pageScreenStatuses': by_status,
            'candidateLines': len(all_candidates),
            'candidateKinds': {kind: sum(candidate['classification'] == kind for candidate in all_candidates) for kind in sorted({candidate['classification'] for candidate in all_candidates})},
            'matchedCueSpans': sum(len(candidate['cueMatches']) for candidate in all_candidates),
            'numericMoneyValueCandidates': sum(len(candidate['moneyValueCandidates']) for candidate in all_candidates),
        }
        queue = {
            'schemaVersion': 1,
            'scope': 'Every text-line candidate emitted by the broad cue detector, including explicit weight/XP-only candidates. All entries remain pending and unconfirmed.',
            'cueConfigurationSha256': report['cueConfigurationSha256'],
            'candidateCount': len(all_candidates), 'candidates': all_candidates,
        }
        out = args.output_dir.resolve()
        out.mkdir(parents=True, exist_ok=False)
        (out / 'source-price-page-discovery.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        (out / 'source-price-candidate-queue.json').write_text(json.dumps(queue, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        summary = [
            '# Offline source-price page discovery', '',
            report['scope'], '',
            'This tool reads the five local PDFs and writes metadata/candidates only. It never copies the PDFs. Output contains short source-line text and must remain private.', '',
            f"PDF-page denominator: **{report['denominators']['pdfPages']}** across **{report['denominators']['sourcePdfs']} PDFs**.",
            f"Candidate lines: **{len(all_candidates)}**. Numeric-money patterns: **{report['counts']['numericMoneyValueCandidates']}**. Cue configuration SHA-256: `{report['cueConfigurationSha256']}`.", '',
            'Pages with no text-layer cues and pages with empty text layers are not treated as passes. No source value or absence is automatically confirmed.', '',
            '| Book | PDF pages | Text-present | Empty/unextractable | Candidate lines | Explicit weight/XP-only lines |',
            '|---|---:|---:|---:|---:|---:|',
        ]
        for book, counts in by_book.items():
            summary.append(f"| {book} | {counts['pdfPages']} | {counts['textPresent']} | {counts['emptyOrUnextractable']} | {counts['candidates']} | {counts['explicitExclusionCandidates']} |")
        summary.extend(['', 'Files:', '', '- `source-price-page-discovery.json`: complete per-page metadata and cue candidates.', '- `source-price-candidate-queue.json`: candidate line queue with typed source-PDF point bounds.', '', 'No PDFs, page images, catalog excerpts, or review records were modified or copied.'])
        (out / 'README.md').write_text('\n'.join(summary) + '\n', encoding='utf-8')
        print(json.dumps({'outputDir': str(out), 'denominators': report['denominators'], 'counts': report['counts']}, indent=2))
        return 0
    except (OSError, ValueError, RuntimeError) as exc:
        parser.exit(2, f'error: {exc}\n')


if __name__ == '__main__':
    raise SystemExit(main())
