#!/usr/bin/env python3
"""Recreate the bounded source-frame bridge at its frozen base-777 snapshot.

This writes metadata only. It does not edit catalogs, citations, focus rectangles,
review grades, PDFs, or published images. Its default output is the immutable
base fixture; current XP append refreshes use refresh-source-frame-coordinate-bridge-xp.py.
"""
from __future__ import annotations
import argparse, hashlib, json, struct
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parent.parent
PROPOSAL = ROOT / 'research/source-audit-pass8-exact-frame-adjudication-proposal.json'
INDEPENDENT = ROOT / 'research/source-audit-pass8-frame-candidate-independent-review.json'
OUT = ROOT / 'research/source-frame-coordinate-bridge-base777.json'
EXPECTED_PROPOSAL_SHA = '1a8078c14e1c73c2597bf837a8e2d8c9a2c28beea3f51aef4bda0484197449cc'
EXPECTED_INDEPENDENT_SHA = '5734f710cf12bca2eb9dc316a077dd6f880abd8338c92a61329501258cbbcc4c'
PDFS = {
    'DMG': ('DMG_1stEd.pdf', '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'),
    'PHB': ('tsr2010-players-handbook.pdf', 'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095'),
    'UA': ('Unearthed Arcana.pdf', 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4'),
    'MM': ('Monster_Manual.pdf', 'c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81'),
    'MM2': ('Monster Manual II.pdf', 'b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24'),
}
EXPECTED_BASE_DATA_SHA = '568d04bd9fb5f43a3c26d5fc5d54d30f803e11c3b74aca5561a11479cf2d11a9'
BASIS_TAGS = {
    'CropBox/page.rect normalized; page offset translated into Poppler MediaBox raster': 'cropbox-pageRect-normalized',
    'MediaBox normalized; page rect/CropBox is 3.6 pt narrower in X': 'mediabox-normalized',
    'CropBox and MediaBox coincide; page.rect normalization is unambiguous for this page': 'coincident-cropbox-mediabox-pageRect-normalized',
}

def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()

def sha_file(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()

def canonical(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)

def region_hashes(region):
    focus=region.get('focusRects', [])
    content={key:value for key,value in region.items() if key!='focusRects'}
    return sha_bytes(canonical(focus).encode()), sha_bytes(canonical(content).encode())

def items_for(data, collection):
    value=data.get(collection, [])
    if collection=='progressionExplainer' and isinstance(value, dict):
        return [dict(value, id='progression-explainer')]
    return value if isinstance(value, list) else []

def box(page_box):
    return [float(x) for x in page_box]

def close_box(actual, expected, tolerance=0.0002):
    return len(actual)==4 and len(expected)==4 and all(abs(float(a)-float(b))<=tolerance for a,b in zip(actual,expected))

def png_dimensions(path: Path):
    data=path.read_bytes()
    if len(data)<24 or data[:8]!=b'\x89PNG\r\n\x1a\n' or data[12:16]!=b'IHDR':
        raise ValueError(f'not a PNG with IHDR: {path}')
    return list(struct.unpack('>II', data[16:24]))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', required=True, help='Directory containing the five pinned original PDFs')
    parser.add_argument('--output', type=Path, default=OUT)
    args=parser.parse_args()
    proposal_bytes=PROPOSAL.read_bytes(); independent_bytes=INDEPENDENT.read_bytes()
    proposal_sha=sha_bytes(proposal_bytes); independent_sha=sha_bytes(independent_bytes)
    if proposal_sha!=EXPECTED_PROPOSAL_SHA: raise SystemExit('frozen exact-frame proposal SHA mismatch')
    if independent_sha!=EXPECTED_INDEPENDENT_SHA: raise SystemExit('frozen independent-review SHA mismatch')
    proposal=json.loads(proposal_bytes)
    if proposal.get('schemaVersion')!=1 or not str(proposal.get('status','')).startswith('proposal;'):
        raise SystemExit('unsupported exact-frame proposal identity')
    typed=proposal.get('typedFrameSidecarProposal') or {}
    groups=typed.get('records')
    if typed.get('status')!='proposed-only-no-active-metadata-mutated' or len(groups or [])!=9:
        raise SystemExit('typed proposal does not contain the approved nine frame groups')
    data_path=ROOT/'dist/data.json'; data=json.loads(data_path.read_text())
    data_sha=sha_file(data_path)
    if data_sha!=EXPECTED_BASE_DATA_SHA: raise SystemExit('base-777 data hash mismatch; use the append-only current refresh tool after the XP merge')
    catalogs={}; pdf_paths={}; pdfs={}
    for book,(filename,expected_sha) in PDFS.items():
        path=Path(args.source_dir)/filename
        if not path.is_file() or sha_file(path)!=expected_sha: raise SystemExit(f'source PDF identity mismatch for {book}')
        pdf_paths[book]=path; pdfs[book]=fitz.open(path)
    registry_groups=[]; joins_seen=set(); total_joins=0
    for group in groups:
        book=group['book']; pdf_page=group['pdfOrdinal']; printed=group['observedPrintedFolio']
        if book not in pdfs or not isinstance(pdf_page,int) or not 1<=pdf_page<=len(pdfs[book]): raise SystemExit('invalid source page in proposal')
        page=pdfs[book][pdf_page-1]
        actual_boxes={
            'pageRect':box(page.rect), 'cropBox':box(page.cropbox), 'mediaBox':box(page.mediabox),
            'cropBoxPosition':[float(x) for x in page.cropbox_position], 'rotationDegrees':int(page.rotation),
        }
        claimed=group['pdfBoxesPoints']
        for key in ('pageRect','cropBox','mediaBox'):
            if not close_box(actual_boxes[key],claimed[key]): raise SystemExit(f'PDF page box changed: {book} PDF {pdf_page} {key}')
        if actual_boxes['rotationDegrees']!=claimed['rotationDegrees']:
            raise SystemExit(f'PDF page rotation changed: {book} PDF {pdf_page}')
        catalog_regions=[]
        for join in group['regionOwnerJoins']:
            catpath=ROOT/'dist'/join['catalog']
            if not catpath.is_file(): raise SystemExit(f'catalog missing: {join["catalog"]}')
            catsha=sha_file(catpath)
            if catsha!=join['catalogSha256']: raise SystemExit(f'catalog hash mismatch: {join["catalog"]}')
            if join['catalog'] not in catalogs: catalogs[join['catalog']]=json.loads(catpath.read_text())
            catalog=catalogs[join['catalog']]
            regions=[r for r in catalog.get('regions',[]) if isinstance(r,dict) and r.get('id')==join['regionId']]
            if len(regions)!=1: raise SystemExit(f'catalog region missing/ambiguous: {join["catalog"]}#{join["regionId"]}')
            region=regions[0]
            focus_hash,content_hash=region_hashes(region)
            image_path=catpath.parent/str(region.get('image',''))
            image_sha=sha_file(image_path) if image_path.is_file() else None
            dims=png_dimensions(image_path) if image_path.is_file() else None
            if (focus_hash,content_hash,image_sha,dims)!=(join['focusSha256'],join['contentSha256'],join['imageSha256'],join['imageDimensions']):
                raise SystemExit(f'current catalog region/image pin mismatch: {join["catalog"]}#{join["regionId"]}')
            if (region.get('book'),region.get('printedPage'),region.get('pdfPage'),region.get('image'),region.get('sha256'))!=(book,printed,pdf_page,join['image'],join['imageSha256']):
                raise SystemExit(f'current region source identity mismatch: {join["catalog"]}#{join["regionId"]}')
            if canonical(region.get('normalizedPageRect'))!=canonical(join['normalizedPageRect']):
                raise SystemExit(f'current source geometry changed: {join["catalog"]}#{join["regionId"]}')
            owner=join['owner']; owner_key=(owner['collection'],owner['itemId'],owner['binding'],join['catalog'],join['regionId'])
            if owner_key in joins_seen: raise SystemExit(f'duplicate owner/region join: {owner_key}')
            joins_seen.add(owner_key)
            items=items_for(data,owner['collection'])
            matched=[item for item in items if item.get('id')==owner['itemId']]
            if len(matched)!=1: raise SystemExit(f'current owner missing/ambiguous: {owner_key}')
            link=matched[0].get(owner['binding'])
            if not isinstance(link,dict) or link.get('catalog')!=join['catalog']:
                raise SystemExit(f'current owner binding changed: {owner_key}')
            link_sha=sha_bytes(canonical(link).encode())
            # Only this owner's source link is pinned; unrelated data.json edits do not stale frame evidence.
            catalog_regions.append({
                'owner':owner,'ownerBindingKey':list(owner_key),
                'ownerSourceLinkSha256':link_sha,
                'catalog':join['catalog'],'catalogSha256':catsha,'regionId':join['regionId'],
                'book':book,'printedPage':printed,'pdfPage':pdf_page,
                'sourcePdfSha256':group['sourcePdfSha256'],
                'image':join['image'],'imageSha256':image_sha,'imageDimensionsPx':dims,
                'normalizedPageRect':join['normalizedPageRect'],
                'coordinateSpace':group['coordinateSpace'],
                'focusSha256':focus_hash,'contentSha256':content_hash,
                'reviewHashBinding':join['currentReviewHashBinding'],
                'reviewAssessments':join['currentReviewAssessments'],
                'sourceFrameId':group['frameId'],
            })
            total_joins+=1
        registry_groups.append({
            'frameId':group['frameId'],'book':book,'printedPage':printed,'pdfPage':pdf_page,
            'sourcePdfSha256':group['sourcePdfSha256'],'sourceTableOrExcerptLabel':group['sourceTableOrExcerptLabel'],
            'coordinateSpace':group['coordinateSpace'],'pdfBoxesPoints':actual_boxes,
            'observedRender':group['observedRender'],'targetImage':group['targetImage'],
            'regions':catalog_regions,
        })
    if len(joins_seen)!=102 or total_joins!=102: raise SystemExit(f'expected 102 unique region/owner joins; got {total_joins}/{len(joins_seen)}')
    books_js_path=ROOT/'dist/books.js'
    books_js_sha=sha_file(books_js_path)
    expected_books_sha=proposal['inputPins']['currentSourceViewerConsumers']['distBooksJsSha256']
    if books_js_sha!=expected_books_sha: raise SystemExit('current page-mapping code does not match the reviewed proposal pin')
    registry={
      'schemaVersion':1,
      'artifactType':'hash-bound-current-source-frame-coordinate-bridge',
      'status':'scoped-geometric-provenance-only',
      'scope':'Nine exact current source-frame geometries and their 102 exact catalog-region/owner bindings. Resolves only source-frame coordinates for the two offline geometric audit consumers; does not approve semantic crop completeness, context, highlight, default, or content.',
      'provenance':{
        'proposalPath':'research/source-audit-pass8-exact-frame-adjudication-proposal.json','proposalSha256':proposal_sha,
        'independentReviewPath':'research/source-audit-pass8-frame-candidate-independent-review.json','independentReviewSha256':independent_sha,
        'proposalInputCommit':proposal['inputCommit'],'implementationBaseCommit':'77712b831fac3256baf97da385c1dd56b6d82e88',
        'dataSha256AtRegistryBuild':data_sha,'booksJsSha256':books_js_sha,
        'catalogHashes':{k:sha_file(ROOT/'dist'/k) for k in sorted(catalogs)},
        'sourcePdfs':{book:{'fileName':filename,'sha256':sha_file(pdf_paths[book])} for book,(filename,_) in sorted(PDFS.items())},
      },
      'counts':{'frameGroups':9,'physicalPdfPages':len({(g['book'],g['pdfPage']) for g in registry_groups}),'regionBindings':102,'ownerBindings':102},
      'coordinateSpaceTags':typed['coordinateSpaceTags'],
      'limits':[
        'Frame positions are exact current replay evidence; the historical authoring renderer/DPI recipe remains unknown.',
        'A matching frame does not approve excerpt completeness, context, highlight relevance, default selection, or source meaning.',
        'Unregistered or mismatched source-frame identities never gain a guessed DPI or coordinate basis.',
        'The full data.json hash is recorded as provenance; runtime fail-closed identity is the exact current owner source-link hash plus catalog, region, image, PDF, page mapping, and frame boxes.'
      ],
      'frames':registry_groups,
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'output':str(args.output),'sha256':sha_file(args.output),'frames':9,'regionBindings':102,'ownerBindings':102,'inputDataSha256':data_sha},indent=2))

if __name__=='__main__': main()
