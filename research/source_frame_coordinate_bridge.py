"""Hash-bound, deliberately narrow source-frame coordinate bridge.

The registry identifies exact current catalog/owner joins; it is not a generic
page-mapping heuristic and never upgrades semantic or highlight review.
"""
from __future__ import annotations
import hashlib, json, math, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_RELATIVE_PATH = 'research/source-frame-coordinate-bridge-ua-source-v1.json'
REGISTRY_PATH = ROOT / REGISTRY_RELATIVE_PATH
REGISTRY_SHA256 = '1013eb540a2bc9034963472b3b48a9a1ea61af224392806386db1091c5b35a65'
_ALLOWED_BASIS = {
    'cropbox-pageRect-normalized',
    'mediabox-normalized',
    'coincident-cropbox-mediabox-pageRect-normalized',
}
_registry_cache = None
_pdf_hash_cache = {}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h=hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()


def canonical(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def canonical_sha(value) -> str:
    return sha256_bytes(canonical(value).encode('utf-8'))


def region_hashes(region):
    return canonical_sha(region.get('focusRects', [])), canonical_sha({key:value for key,value in region.items() if key!='focusRects'})


def png_dimensions(path: Path):
    with Path(path).open('rb') as stream:
        header=stream.read(24)
    if len(header)<24 or header[:8]!=b'\x89PNG\r\n\x1a\n' or header[12:16]!=b'IHDR':
        return None
    return list(struct.unpack('>II',header[16:24]))


def load_registry(path: Path | None = None, expected_sha256: str | None = None):
    global _registry_cache
    registry_path=Path(path) if path is not None else REGISTRY_PATH
    expected=expected_sha256 if expected_sha256 is not None else REGISTRY_SHA256
    if path is None and _registry_cache is not None:
        return _registry_cache
    raw=registry_path.read_bytes()
    actual=sha256_bytes(raw)
    if actual!=expected:
        raise ValueError('source-frame coordinate bridge registry hash mismatch')
    registry=json.loads(raw)
    if (registry.get('schemaVersion')!=1
        or registry.get('artifactType')!='hash-bound-current-source-frame-coordinate-bridge'
        or registry.get('status')!='scoped-geometric-provenance-only'
        or registry.get('counts')!={'frameGroups':9,'physicalPdfPages':7,'regionBindings':102,'ownerBindings':102}
        or len(registry.get('frames',[]))!=9):
        raise ValueError('invalid bounded source-frame coordinate bridge registry')
    owners={}
    owner_partial={}
    catalog_regions={}
    owner_entities={}
    frame_keys=set()
    for frame in registry['frames']:
        key=(frame.get('frameId'),frame.get('book'),frame.get('printedPage'),frame.get('pdfPage'),frame.get('sourcePdfSha256'))
        if key in frame_keys or frame.get('coordinateSpace') not in _ALLOWED_BASIS:
            raise ValueError('duplicate or invalid source-frame bridge frame')
        frame_keys.add(key)
        if frame.get('pdfBoxesPoints',{}).get('rotationDegrees')!=0:
            raise ValueError('registered frame rotation is unsupported')
        for row in frame.get('regions',[]):
            owner=row.get('owner',{})
            owner_key=(owner.get('collection'),owner.get('itemId'),owner.get('binding'),row.get('catalog'),row.get('regionId'))
            if owner_key in owners:
                raise ValueError('duplicate source-frame owner/region binding')
            if row.get('sourceFrameId')!=frame.get('frameId') or row.get('coordinateSpace')!=frame.get('coordinateSpace'):
                raise ValueError('source-frame join points to conflicting frame')
            owners[owner_key]=(frame,row)
            owner_partial.setdefault((owner.get('collection'),owner.get('itemId'),owner.get('binding'),row.get('regionId')),[]).append((frame,row))
            catalog_regions.setdefault((row.get('catalog'),row.get('regionId')),[]).append((frame,row))
            owner_entities.setdefault((owner.get('collection'),owner.get('itemId'),owner.get('binding')),[]).append((frame,row))
    if len(owners)!=102:
        raise ValueError('source-frame registry must contain 102 unique owner joins')
    indexed={'registry':registry,'owners':owners,'ownerPartial':owner_partial,'catalogRegions':catalog_regions,'ownerEntities':owner_entities,'frames':registry['frames']}
    if path is None:
        _registry_cache=indexed
    return indexed


def owner_key(collection, item_id, binding, catalog_path, region_id):
    return (collection,item_id,binding,catalog_path,region_id)


def resolve_owner_join(registry, key, observed):
    """Pure fail-closed identity check, useful to offline consumers and tests."""
    key=tuple(key)
    expected=registry['owners'].get(key)
    if expected is None:
        near=registry['ownerPartial'].get((key[0],key[1],key[2],key[4])) or registry['catalogRegions'].get((key[3],key[4]))
        if near:
            ids=sorted({frame['frameId'] for frame,_ in near})
            return {'status':'conflicting-frame-identity','basis':'unassessable','frameId':ids[0] if len(ids)==1 else None,'mismatchedFields':['ownerBinding'] if key[0:3]==tuple(near[0][1]['ownerBindingKey'][0:3]) else ['ownerBindingKey']}
        # If the owner remains the same but the region ID changed, only treat it
        # as a conflict when the current source/page/image/geometry still exactly
        # resembles one registered join; otherwise it is outside this bounded
        # correction registry (which makes no claim about other frame evidence).
        owner_candidates=registry['ownerEntities'].get(key[0:3],[])
        for frame,row in owner_candidates:
            same_source=(observed.get('book'),observed.get('printedPage'),observed.get('pdfPage'),observed.get('sourcePdfSha256'))==(frame['book'],frame['printedPage'],frame['pdfPage'],frame['sourcePdfSha256'])
            same_crop=(observed.get('imageSha256'),canonical(observed.get('normalizedPageRect')))==(row['imageSha256'],canonical(row['normalizedPageRect']))
            if same_source and same_crop:
                return {'status':'conflicting-frame-identity','basis':'unassessable','frameId':frame['frameId'],'mismatchedFields':['regionId']}
        return {
            'status':'outside-bounded-correction-registry',
            'basis':'legacy-diagnostic-projection-retained',
            'correctionRegistryMembership':'outside-this-bounded-correction-registry',
            'resolutionStatus':'legacy-diagnostic-projection-retained; no new frame approval by this registry',
            'reason':'No exact owner/region binding is present in this bounded correction registry; this does not make a claim about separate frame evidence.',
        }
    frame,row=expected
    fields=(
        ('book',frame['book']),('printedPage',frame['printedPage']),('pdfPage',frame['pdfPage']),
        ('sourcePdfSha256',frame['sourcePdfSha256']),('catalogSha256',row['catalogSha256']),
        ('imageSha256',row['imageSha256']),('imageDimensionsPx',row['imageDimensionsPx']),
        ('normalizedPageRect',row['normalizedPageRect']),('focusSha256',row['focusSha256']),
        ('contentSha256',row['contentSha256']),('ownerSourceLinkSha256',row['ownerSourceLinkSha256']),
    )
    mismatched=[]
    for field,want in fields:
        if canonical(observed.get(field))!=canonical(want):
            mismatched.append(field)
    return ({'status':'conflicting-frame-identity','basis':'unassessable','frameId':frame['frameId'],'mismatchedFields':mismatched}
            if mismatched else
            {'status':'matched','basis':frame['coordinateSpace'],'frameId':frame['frameId'],'frame':frame,'region':row})


def current_observation(*, collection, item_id, binding, catalog_path, catalog_hash,
                        catalog, region, owner_link, image_path, book, printed_page,
                        pdf_page, source_pdf_sha256, page):
    """Resolve and validate one exact live catalog/owner/source-page binding.

    Returns an outside-registry result for unregistered uses,
    ``conflicting-frame-identity`` for a near-match with stale inputs, and
    ``matched`` only when all current pins (including PDF page boxes) remain
    byte/value exact.
    """
    registry=load_registry()
    key=owner_key(collection,item_id,binding,catalog_path,region.get('id'))
    focus_sha,content_sha=region_hashes(region)
    actual_image_sha=sha256_file(image_path) if Path(image_path).is_file() else None
    actual_dimensions=png_dimensions(image_path) if Path(image_path).is_file() else None
    link_sha=canonical_sha(owner_link)
    observed={
      'book':book,'printedPage':printed_page,'pdfPage':pdf_page,
      'sourcePdfSha256':source_pdf_sha256,'catalogSha256':catalog_hash,
      'imageSha256':actual_image_sha,'imageDimensionsPx':actual_dimensions,
      'normalizedPageRect':region.get('normalizedPageRect'),
      'focusSha256':focus_sha,'contentSha256':content_sha,
      'ownerSourceLinkSha256':link_sha,
    }
    checked=resolve_owner_join(registry,key,observed)
    if checked['status']!='matched':
        return checked
    frame,row=registry['owners'][key]
    if page is None:
        if (region.get('book')!=book or region.get('printedPage')!=printed_page or region.get('pdfPage')!=pdf_page
            or region.get('image')!=row.get('image') or region.get('sha256')!=row.get('imageSha256')
            or region.get('width')!=row.get('imageDimensionsPx',[None,None])[0]
            or region.get('height')!=row.get('imageDimensionsPx',[None,None])[1]
            or catalog.get('sources',{}).get(book,{}).get('sha256')!=frame['sourcePdfSha256']):
            return {'status':'conflicting-frame-identity','basis':'unassessable','frameId':frame['frameId'],
                    'mismatchedFields':['regionSourceOrPdfPageBoxes']}
        if Path(image_path).is_file() is False or actual_image_sha!=row['imageSha256']:
            return {'status':'conflicting-frame-identity','basis':'unassessable','frameId':frame['frameId'],
                    'mismatchedFields':['imageBytes']}
        return checked
    expected_boxes=frame['pdfBoxesPoints']
    actual_boxes={
      'pageRect':[float(v) for v in page.rect],
      'cropBox':[float(v) for v in page.cropbox],
      'mediaBox':[float(v) for v in page.mediabox],
      'cropBoxPosition':[float(v) for v in page.cropbox_position],
      'rotationDegrees':int(page.rotation),
    }
    box_match=all(len(actual_boxes[k])==len(expected_boxes[k]) and all(abs(float(a)-float(b))<=0.0002 for a,b in zip(actual_boxes[k],expected_boxes[k])) for k in ('pageRect','cropBox','mediaBox','cropBoxPosition')) and actual_boxes['rotationDegrees']==expected_boxes['rotationDegrees']
    if (region.get('book')!=book or region.get('printedPage')!=printed_page or region.get('pdfPage')!=pdf_page
        or region.get('image')!=row.get('image') or region.get('sha256')!=row.get('imageSha256')
        or region.get('width')!=row.get('imageDimensionsPx',[None,None])[0]
        or region.get('height')!=row.get('imageDimensionsPx',[None,None])[1]
        or catalog.get('sources',{}).get(book,{}).get('sha256')!=frame['sourcePdfSha256']
        or not box_match):
        return {'status':'conflicting-frame-identity','basis':'unassessable','frameId':frame['frameId'],
                'mismatchedFields':['regionSourceOrPdfPageBoxes']}
    if Path(image_path).is_file() is False or actual_image_sha!=row['imageSha256']:
        return {'status':'conflicting-frame-identity','basis':'unassessable','frameId':frame['frameId'],
                'mismatchedFields':['imageBytes']}
    return checked


def normalized_rect_to_page_points(normalized_rect, coordinate_space, page_rect, crop_box, media_box):
    """Map a normalized crop to PyMuPDF page.rect-local point coordinates."""
    if isinstance(normalized_rect,dict):
        values=(normalized_rect.get('x'),normalized_rect.get('y'),normalized_rect.get('width',normalized_rect.get('w')),normalized_rect.get('height',normalized_rect.get('h')))
    elif isinstance(normalized_rect,list) and len(normalized_rect)==1 and isinstance(normalized_rect[0],list):
        values=normalized_rect[0]
    elif isinstance(normalized_rect,list) and len(normalized_rect)==4:
        values=normalized_rect
    else:
        return None,'invalid'
    try:
        x,y,width,height=map(float,values)
    except (TypeError,ValueError):
        return None,'invalid'
    if (not all(math.isfinite(v) for v in (x,y,width,height)) or x<0 or y<0 or width<=0 or height<=0
        or x+width>1.000002 or y+height>1.000002):
        return None,'invalid'
    px0,py0,px1,py1=map(float,page_rect)
    cx0,cy0,cx1,cy1=map(float,crop_box)
    mx0,my0,mx1,my1=map(float,media_box)
    if coordinate_space in ('cropbox-pageRect-normalized','coincident-cropbox-mediabox-pageRect-normalized'):
        if coordinate_space.startswith('coincident') and any(abs(a-b)>0.0002 for a,b in zip((cx0,cy0,cx1,cy1),(mx0,my0,mx1,my1))):
            return None,'frame-box-conflict'
        out=[x*(px1-px0),y*(py1-py0),(x+width)*(px1-px0),(y+height)*(py1-py0)]
    elif coordinate_space=='mediabox-normalized':
        mw=mx1-mx0; mh=my1-my0
        if mw<=0 or mh<=0:return None,'frame-box-invalid'
        # Normalized media coordinates use a top-left origin; page.rect starts
        # at the CropBox's top-left. Convert by the observed box offsets.
        left=mx0+x*mw-cx0
        right=mx0+(x+width)*mw-cx0
        media_top_offset=my1-cy1
        top=y*mh-media_top_offset
        bottom=(y+height)*mh-media_top_offset
        out=[left,top,right,bottom]
    else:
        return None,'unknown-coordinate-space'
    if out[0]<-0.002 or out[1]<-0.002 or out[2]>(px1-px0)+0.002 or out[3]>(py1-py0)+0.002 or out[2]<=out[0] or out[3]<=out[1]:
        return None,'out-of-page-geometry'
    return [round(v,4) for v in out],'assessable'


def public_resolution(result):
    """Return the bounded public summary, never the full registry record."""
    keys=('status','basis','frameId','mismatchedFields','reason','correctionRegistryMembership','resolutionStatus')
    return {key:result[key] for key in keys if key in result}


def validate_live_registry(data, data_root, source_hashes=None, pdfs=None):
    """Check that all 102 pinned region/owner joins remain live and exact.

    Mismatches are reported as unassessable registry drift; they are not silently
    removed from the cohort or transferred to a new owner/geometry.
    """
    loaded=load_registry(); registry=loaded['registry']; owners_by_key={}
    for collection in ('rules','spells','equipment','matrices','classes'):
        for item in data.get(collection,[]):
            if isinstance(item,dict): owners_by_key[(collection,item.get('id'))]=item
    if isinstance(data.get('progressionExplainer'),dict):
        item=dict(data['progressionExplainer'],id='progression-explainer')
        owners_by_key[('progressionExplainer',item['id'])]=item
    catalog_cache={}; mismatch_records=[]; validated=0
    books_path=Path(data_root)/'books.js'
    expected_books_sha=registry['provenance'].get('booksJsSha256')
    if not books_path.is_file() or sha256_file(books_path)!=expected_books_sha:
        mismatch_records.append({'frameId':None,'fields':['booksJsSha256']})
    for frame in registry['frames']:
        if source_hashes is not None and source_hashes.get(frame['book'])!=frame['sourcePdfSha256']:
            mismatch_records.append({'frameId':frame['frameId'],'fields':['sourcePdfSha256']})
        page=None
        if pdfs is not None:
            if frame['book'] not in pdfs or frame['pdfPage']<1 or frame['pdfPage']>len(pdfs[frame['book']]):
                mismatch_records.append({'frameId':frame['frameId'],'fields':['pdfPageUnavailable']})
            else:
                page=pdfs[frame['book']][frame['pdfPage']-1]
                boxes=frame['pdfBoxesPoints']
                current={'pageRect':[float(v) for v in page.rect],'cropBox':[float(v) for v in page.cropbox],'mediaBox':[float(v) for v in page.mediabox],'cropBoxPosition':[float(v) for v in page.cropbox_position],'rotationDegrees':int(page.rotation)}
                names=('pageRect','cropBox','mediaBox','cropBoxPosition')
                if any(len(current[n])!=len(boxes[n]) or any(abs(float(a)-float(b))>0.0002 for a,b in zip(current[n],boxes[n])) for n in names) or current['rotationDegrees']!=boxes['rotationDegrees']:
                    mismatch_records.append({'frameId':frame['frameId'],'fields':['pdfPageBoxes']})
        for row in frame['regions']:
            fields=[]
            owner=row['owner']; item=owners_by_key.get((owner['collection'],owner['itemId']))
            if item is None:
                fields.append('ownerMissing')
                link=None
            else:
                link=item.get(owner['binding'])
                if not isinstance(link,dict) or link.get('catalog')!=row['catalog']:
                    fields.append('ownerBinding')
                elif canonical_sha(link)!=row['ownerSourceLinkSha256']:
                    fields.append('ownerSourceLinkSha256')
            catalog_path=Path(data_root)/row['catalog']
            if row['catalog'] not in catalog_cache:
                if not catalog_path.is_file():
                    catalog_cache[row['catalog']]=None
                else:
                    try: catalog_cache[row['catalog']]=json.loads(catalog_path.read_text())
                    except (OSError,json.JSONDecodeError): catalog_cache[row['catalog']]=None
            catalog=catalog_cache[row['catalog']]
            if catalog is None:
                fields.append('catalogUnavailable')
                region=None
            else:
                if sha256_file(catalog_path)!=row['catalogSha256']:
                    fields.append('catalogSha256')
                found=[candidate for candidate in catalog.get('regions',[]) if isinstance(candidate,dict) and candidate.get('id')==row['regionId']]
                if len(found)!=1:
                    fields.append('regionMissingOrAmbiguous');region=None
                else:
                    region=found[0]
                    focus_sha,content_sha=region_hashes(region)
                    expected_dims=row['imageDimensionsPx']
                    image_path=catalog_path.parent/str(region.get('image',''))
                    image_sha=sha256_file(image_path) if image_path.is_file() else None
                    dimensions=png_dimensions(image_path) if image_path.is_file() else None
                    checks=(
                      ('sourceIdentity',(region.get('book'),region.get('printedPage'),region.get('pdfPage')),(row['book'],row['printedPage'],row['pdfPage'])),
                      ('imageIdentity',(region.get('image'),region.get('sha256'),region.get('width'),region.get('height')),(row['image'],row['imageSha256'],expected_dims[0],expected_dims[1])),
                      ('normalizedPageRect',canonical(region.get('normalizedPageRect')),canonical(row['normalizedPageRect'])),
                      ('sourcePdfInCatalog',(catalog.get('sources',{}).get(row['book']) or {}).get('sha256'),row['sourcePdfSha256']),
                      ('focusSha256',focus_sha,row['focusSha256']),('contentSha256',content_sha,row['contentSha256']),
                      ('imageBytes',(image_sha,dimensions),(row['imageSha256'],expected_dims)),
                    )
                    for name,actual,expected in checks:
                        if actual!=expected:fields.append(name)
            validated+=1
            if fields:
                mismatch_records.append({'frameId':frame['frameId'],'ownerBindingKey':row['ownerBindingKey'],'fields':sorted(set(fields))})
    return {
      'status':'current-pins-match' if not mismatch_records and validated==102 else 'current-pins-conflict',
      'frameGroups':len(registry['frames']),'ownerJoinsValidated':validated,
      'mismatchCount':len(mismatch_records),'mismatches':mismatch_records,
    }


def source_frame_dpi_for_render(registry_record, source_render_sha256=None):
    """No DPI is inferred from this registry; hashes here prove crop position only."""
    if source_render_sha256 and registry_record and registry_record.get('observedRender',{}).get('fullPageRawRgbSha256')==source_render_sha256:
        return {'status':'render-hash-matched-but-historical-dpi-unassessed','renderDpi':None}
    return {'status':'unassessable-no-dpi-binding','renderDpi':None}
