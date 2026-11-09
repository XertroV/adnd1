#!/usr/bin/env python3
"""Inventory published source-region bindings and flag PDF text boxes crossing crop edges.

Read-only for catalog/image/PDF inputs. Output is metadata, not semantic verification.
Run from any directory; requires PyMuPDF and the separately supplied source PDFs.
"""
import argparse,collections,hashlib,importlib.util,json,math,os,sys
from pathlib import Path
import fitz
from crop_geometry import crosses
ROOT=Path(__file__).resolve().parent.parent; DIST=ROOT/'dist'; OUT=ROOT/'research'
_frame_spec=importlib.util.spec_from_file_location('source_frame_coordinate_bridge',ROOT/'research'/'source_frame_coordinate_bridge.py')
_frame_bridge=importlib.util.module_from_spec(_frame_spec);_frame_spec.loader.exec_module(_frame_bridge)
current_observation=_frame_bridge.current_observation
normalized_rect_to_page_points=_frame_bridge.normalized_rect_to_page_points
load_registry=_frame_bridge.load_registry
public_resolution=_frame_bridge.public_resolution
validate_live_registry=_frame_bridge.validate_live_registry
REGISTRY_SHA256=_frame_bridge.REGISTRY_SHA256
PDF_FILENAMES={'PHB':'tsr2010-players-handbook.pdf','DMG':'DMG_1stEd.pdf','UA':'Unearthed Arcana.pdf','MM':'Monster_Manual.pdf','MM2':'Monster Manual II.pdf'}
SUPPLEMENTAL_IMAGE_FILENAMES={'dmg175-user-confirmed-supplement':'dmg175.jpg'}
SUPPLEMENTAL_NA_REASON='Supplemental source-image frame is retained in the usage denominator but is not part of the current PDF-raster geometry assessment.'

_continuation_spec=importlib.util.spec_from_file_location('continuation_candidates',ROOT/'tools'/'continuation-candidates.py')
_continuation=importlib.util.module_from_spec(_continuation_spec);_continuation_spec.loader.exec_module(_continuation)
supplemental_region_identity=_continuation.supplemental_region_identity

def sha(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
 return h.hexdigest()
def normalized(v):
 if isinstance(v,dict):return [v.get('x'),v.get('y'),v.get('width',v.get('w')),v.get('height',v.get('h'))],'object'
 if isinstance(v,list) and len(v)==1 and isinstance(v[0],list):return v[0],'nested'
 if isinstance(v,list) and len(v)==4:return v,'flat'
 return None,'none'
def rect_for(r,p,coordinate_space=None):
 a,shape=normalized(r.get('normalizedPageRect'))
 if coordinate_space is not None:
  bounds,status=normalized_rect_to_page_points(r.get('normalizedPageRect'),coordinate_space,p.rect,p.cropbox,p.mediabox)
  return (bounds,shape) if status=='assessable' else (None,status)
 if a is not None:
  try:x,y,w,h=map(float,a)
  except (TypeError,ValueError):return None,'invalid'
  if not all(math.isfinite(v) for v in (x,y,w,h)) or x<0 or y<0 or w<=0 or h<=0 or x+w>1.000002 or y+h>1.000002:return None,'invalid'
  return [x*p.width,y*p.height,(x+w)*p.width,(y+h)*p.height],shape
 b=r.get('boundsPdfPoints')
 if isinstance(b,list) and len(b)==4:
  try:b=list(map(float,b))
  except (TypeError,ValueError):return None,'invalid'
  if not all(math.isfinite(v) for v in b) or b[0]<0 or b[1]<0 or b[2]<=b[0] or b[3]<=b[1] or b[2]>p.width+.002 or b[3]>p.height+.002:return None,'invalid'
  return b,'boundsPdfPoints'
 return None,'missing'

def validate_supplemental_region(cat,r,source_dir,image_path,canonical_pdf_sha):
 """Validate the closed p.175 image artifact without mapping it into PDF space."""
 identity=supplemental_region_identity(cat,r)
 if identity is None:return None
 artifact_id=r.get('sourceArtifactId');dimensions=identity.get('sourceDimensionsPx');crop=identity.get('sourceCropBoundsPx')
 raw,shape=normalized(r.get('normalizedPageRect'));coordinate_match=False
 if identity.get('valid') and raw is not None and dimensions and crop:
  try:
   values=list(map(float,raw));left,top,right,bottom=crop;width,height=dimensions
   expected=[left/width,top/height,(right-left)/width,(bottom-top)/height]
   coordinate_match=(shape=='object' and len(values)==4 and all(math.isfinite(v) for v in values)
                     and all(abs(a-b)<=0.000002 for a,b in zip(values,expected)))
  except (TypeError,ValueError):coordinate_match=False
 filename=SUPPLEMENTAL_IMAGE_FILENAMES.get(artifact_id) if isinstance(artifact_id,str) else None
 source_path=Path(source_dir)/filename if filename else None
 observed_source_sha=sha(source_path) if source_path and source_path.is_file() else None
 image_sha=sha(image_path) if image_path.is_file() else None
 catalog_pdf_sha=(cat.get('sources',{}).get(r.get('book')) or {}).get('sha256')
 source_match=bool(identity.get('valid') and canonical_pdf_sha==identity.get('canonicalPdfSha256')==catalog_pdf_sha)
 artifact_match=bool(identity.get('valid') and observed_source_sha==identity.get('sourceSha256'))
 crop_match=image_sha==r.get('sha256')
 return {**identity,'valid':bool(identity.get('valid') and coordinate_match and source_match and artifact_match and crop_match),
         'sourceKind':'supplemental-image' if identity.get('valid') else 'invalid-source-identity',
         'sourceArtifactHashMatches':artifact_match,'normalizedImageRectMatches':coordinate_match,
         'imageHashMatches':crop_match,'sourceSha256':identity.get('sourceSha256'),
         'canonicalPdfSha256':identity.get('canonicalPdfSha256'),'sourcePdfSha256':identity.get('canonicalPdfSha256'),
         'canonicalPdfContainsPrintedPage':False,'notAssessableReason':SUPPLEMENTAL_NA_REASON}
def main():
 global DIST,OUT
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source-dir',default=os.environ.get('ADND_SOURCE_DIR'),help='Directory containing the five original source PDFs; or set ADND_SOURCE_DIR');parser.add_argument('--output-prefix',default='current',help='Snapshot suffix; baseline is reserved and immutable');parser.add_argument('--data-root',type=Path,default=DIST,help='Read data.json and catalogs from this dist directory; permits immutable Git snapshots');parser.add_argument('--output-dir',type=Path,default=OUT,help='Write metadata reports here without modifying input catalogs');args=parser.parse_args()
 DIST=args.data_root.resolve();OUT=args.output_dir.resolve();OUT.mkdir(parents=True,exist_ok=True)
 if not args.source_dir:parser.error('--source-dir or ADND_SOURCE_DIR is required')
 if not args.output_prefix.replace('-','').replace('_','').isalnum() or args.output_prefix in ('baseline','corrected'):parser.error('invalid or reserved output prefix')
 output_stem='source-visual-audit-'+args.output_prefix;pdfpaths={k:Path(args.source_dir)/v for k,v in PDF_FILENAMES.items()}
 data=json.loads((DIST/'data.json').read_text());pdfs={k:fitz.open(v) for k,v in pdfpaths.items()}; hashes={k:sha(v) for k,v in pdfpaths.items()};usage=[]; scans={}; warnings=[]; page_cache={}; catalog_hashes={};frame_resolution_counts=collections.Counter()
 bridge=load_registry()
 registry_validation=validate_live_registry(data,DIST,hashes,pdfs)
 if registry_validation.get('status')!='current-pins-match':
  raise ValueError('active source-frame bridge no longer matches current data/catalog/PDF pins')
 for col in ('rules','spells','equipment','matrices','classes','progressionExplainer'):
  items=[dict(data['progressionExplainer'],id='progression-explainer')] if col=='progressionExplainer' and data.get(col) else data.get(col,[])
  for item in items:
   for source_type in ('sourceExcerpts','scanVerification'):
    link=item.get(source_type)
    if not isinstance(link,dict) or not link.get('catalog'):continue
    catpath=DIST/link['catalog'];cat=json.loads(catpath.read_text());catalog_hashes[link['catalog']]=sha(catpath)
    for r in cat.get('regions',[]):
     book=r.get('book'); page=r.get('pdfPage'); image=catpath.parent/r.get('image',''); focuses=r.get('focusRects',[]); full=sum(1 for v in focuses if v==[0,0,1,1]); partial=len(focuses)-full
     expected=(cat.get('sources',{}).get(book,{}) or {}).get('sha256'); source_match=bool(book in hashes and expected==hashes[book]); bounds=None; btype='missing';words=[];assessment='not-assessable-source-mismatch';frame_resolution={'status':'not-assessable-source-mismatch','basis':'unassessable'}
     image_sha=sha(image) if image.is_file() else None
     supplemental=validate_supplemental_region(cat,r,args.source_dir,image,hashes.get(book)) if 'sourceArtifactId' in r else None
     if supplemental is not None:
      _,btype=normalized(r.get('normalizedPageRect'))
      frame_resolution={'status':'not-applicable-supplemental-image-frame','basis':'unassessable'}
      assessment='not-assessable-supplemental-image-format' if supplemental['valid'] else 'not-assessable-source-artifact-mismatch'
     elif source_match and isinstance(page,int) and 1<=page<=len(pdfs[book]):
      pdfpage=pdfs[book][page-1]
      frame_resolution=current_observation(collection=col,item_id=item.get('id'),binding=source_type,catalog_path=link['catalog'],catalog_hash=catalog_hashes[link['catalog']],catalog=cat,region=r,owner_link=link,image_path=image,book=book,printed_page=r.get('printedPage'),pdf_page=page,source_pdf_sha256=hashes[book],page=pdfpage)
      if frame_resolution.get('status')=='matched':bounds,btype=rect_for(r,pdfpage,frame_resolution['basis'])
      elif frame_resolution.get('status')=='conflicting-frame-identity':bounds,btype=None,'source-frame-mismatch'
      else:bounds,btype=rect_for(r,pdfpage.rect)
      if bounds:
       key=(book,page)
       if key not in page_cache:page_cache[key]=pdfpage.get_text('words')
       words=page_cache[key];assessment='assessed-text-layer' if words else 'not-assessable-empty-text-layer'
      elif frame_resolution.get('status')=='conflicting-frame-identity':assessment='not-assessable-source-frame-mismatch'
      else:assessment='not-assessable-missing-bounds'
     elif supplemental is None and source_match:
      frame_resolution={'status':'not-assessable-page-unavailable','basis':'unassessable'};assessment='not-assessable-page-unavailable'
     u={'collection':col,'itemId':item.get('id'),'binding':source_type,'catalog':link['catalog'],'regionId':r.get('id'),'book':book,'printedPage':r.get('printedPage'),'pdfPage':page,'image':str(image.relative_to(DIST)),'imageSha256':r.get('sha256'),'imageHashMatches':image_sha==r.get('sha256'),'focusSentinelCount':full,'focusPartialCount':partial,'boundsType':btype,'pdfBounds':[round(x,4) for x in bounds] if bounds else None,'sourceHashMatches':source_match,'viewerSelectedBinding':source_type==('sourceExcerpts' if item.get('sourceExcerpts') else 'scanVerification'),'role':r.get('role'),'regionTitle':r.get('title',''),'regionSummary':r.get('summary',''),'coordinateFrameResolution':public_resolution(frame_resolution)}
     frame_resolution_counts[frame_resolution.get('status','unknown')]+=1
     if supplemental is not None:
      u.update({'sourceKind':supplemental['sourceKind'],'sourceArtifactId':supplemental.get('sourceArtifactId'),
                'sourceSha256':supplemental.get('sourceSha256'),'sourceArtifactSha256':supplemental.get('sourceSha256'),
                'canonicalPdfSha256':supplemental.get('canonicalPdfSha256'),'sourcePdfSha256':supplemental.get('sourcePdfSha256'),
                'canonicalPdfContainsPrintedPage':False,'sourceFrameDimensionsPx':supplemental.get('sourceDimensionsPx'),
                'sourceCropBoundsPx':supplemental.get('sourceCropBoundsPx'),'sourceCoordinateSpace':supplemental.get('sourceCoordinateSpace'),
                'sourceArtifactHashMatches':supplemental.get('sourceArtifactHashMatches'),
                'normalizedImageRectMatches':supplemental.get('normalizedImageRectMatches'),
                'sourceHashMeaning':'sourceHashMatches refers only to the canonical PDF; sourceArtifactSha256 identifies the separate source image.',
                'notAssessableReason':supplemental.get('notAssessableReason')})
     u['cropEdgeAssessment']=assessment;u['sourcePageWordBoxCount']=None if supplemental is not None else len(words);u['semanticContextAssessment']='unresolved-requires-source-review';u['continuationAssessment']='unresolved-requires-source-review';u['focusRelevanceAssessment']='unresolved-requires-fact-review'
     usage.append(u)
     if image_sha!=r.get('sha256'):warnings.append({'kind':'image-hash-mismatch','image':u['image']})
     if not source_match:warnings.append({'kind':'source-hash-missing-or-mismatch','catalog':u['catalog'],'book':book})
     if supplemental is not None and not supplemental['valid']:
      warnings.append({'kind':'supplemental-source-artifact-mismatch','catalog':u['catalog'],'regionId':u['regionId']})
     if bounds:
      geom=json.dumps([book,page,[round(v,4) for v in bounds]],separators=(',',':'));cid='edge-'+hashlib.sha256((str(image_sha)+geom).encode()).hexdigest()[:16]
      entry=scans.setdefault(cid,{'candidateId':cid,'book':book,'printedPage':r.get('printedPage'),'pdfPage':page,'image':u['image'],'imageSha256':image_sha,'boundsPdfPoints':[round(x,4) for x in bounds],'edgeCrossings':[],'usages':[]})
      if not entry['edgeCrossings']:
       for w in words:
        edges=crosses(w,bounds)
        if edges:entry['edgeCrossings'].append({'wordBoundsPdfPoints':[round(v,2) for v in w[:4]],'edges':edges})
      entry['usages'].append({'collection':col,'itemId':item.get('id'),'binding':source_type,'regionId':r.get('id'),'catalog':link['catalog']})
      u['cropEdgeCandidateId']=cid if entry['edgeCrossings'] else None
      u['cropEdgeAssessment']='candidate-text-box-crossing' if entry['edgeCrossings'] else assessment
     elif supplemental is None:warnings.append({'kind':'no-mappable-bounds','catalog':u['catalog'],'regionId':u['regionId']})
 groups=collections.defaultdict(list)
 for u in usage:groups[(u['collection'],u['itemId'],u['binding'],u['book'],u['printedPage'])].append(u)
 for members in groups.values():
  viewer_members=sorted(members,key=lambda v:v['role']=='context')
  for i,u in enumerate(viewer_members):u['viewerOrdinal']=i+1
  for i,u in enumerate(members):
   u['pageOrdinal']=i+1;u['samePageRegionCount']=len(members)
   u['knownHeadingOnly']=u['imageSha256'].startswith('11d89f055598d8a4') if isinstance(u['imageSha256'],str) else False
   label=(u['regionTitle']+' '+u['regionSummary']).lower()
   u['contextLabelCandidate']=any(x in label for x in ('heading','header','context'))
   u['defaultContextCandidate']=i==0 and len(members)>1 and (u['knownHeadingOnly'] or u['contextLabelCandidate'])
 candidates=[x for x in scans.values() if x['edgeCrossings']]; candidates.sort(key=lambda x:(x['book'] or '',x['pdfPage'] or 0,x['candidateId']))
 for e in candidates:
  e['crossingCount']=len(e['edgeCrossings']);e['edgeCrossings']=e['edgeCrossings'][:20];e['edgeCrossingsTruncated']=e['crossingCount']>20
 bybook=collections.Counter(u['book'] for u in usage);bycollection=collections.Counter(u['collection'] for u in usage);sentinel=collections.Counter(u['book'] for u in usage if u['focusSentinelCount']);bounds=collections.Counter(u['boundsType'] for u in usage);candbooks=collections.Counter(c['book'] for c in candidates);candcols=collections.Counter(u['collection'] for c in candidates for u in c['usages']); uniqueimages=len({u['imageSha256'] for u in usage});unique_candidates=len({c['imageSha256'] for c in candidates})
 out={'schemaVersion':1,'sourceFrameCoordinateBridge':{'path':'research/source-frame-coordinate-bridge.json','sha256':REGISTRY_SHA256,'status':'scoped-geometric-provenance-only','resolutionCounts':dict(sorted(frame_resolution_counts.items())),'registryValidation':registry_validation},'scope':'All sourceExcerpts and scanVerification catalogs linked from dist/data.json. Edge candidates are text-layer geometry intersections, not verified defects. Full-image focus is a suspected overhighlight pending per-region review, not semantic verification. The separately supplied full DMG p.175 source image remains private; its two published crops are retained as supplemental-image usages with no canonical-PDF page ordinal and are excluded from PDF word-box geometry.','inputDataSha256':sha(DIST/'data.json'),'sourcePdfSha256':hashes,'catalogSha256':dict(sorted(catalog_hashes.items())),'catalogSnapshotSha256':hashlib.sha256(json.dumps(dict(sorted(catalog_hashes.items())),separators=(',',':'),ensure_ascii=False).encode()).hexdigest(),'counts':{'regionUsages':len(usage),'uniqueImageHashes':uniqueimages,'uniqueImageGeometryBindings':len(scans),'sentinelUsages':sum(bool(u['focusSentinelCount']) for u in usage),'partialFocusUsages':sum(bool(u['focusPartialCount']) for u in usage),'knownHeadingOnlyUsages':sum(u['knownHeadingOnly'] for u in usage),'knownHeadingOnlyFirstInPageGroup':sum(u['knownHeadingOnly'] and u['pageOrdinal']==1 for u in usage),'knownHeadingOnlyFirstWithSibling':sum(u['knownHeadingOnly'] and u['pageOrdinal']==1 and u['samePageRegionCount']>1 for u in usage),'knownHeadingOnlyViewerDefault':sum(u['knownHeadingOnly'] and u['viewerSelectedBinding'] and u['viewerOrdinal']==1 for u in usage),'defaultContextLabelCandidates':sum(u['defaultContextCandidate'] for u in usage),'viewerDefaultContextLabelCandidates':sum(u['contextLabelCandidate'] and u['viewerSelectedBinding'] and u['viewerOrdinal']==1 and u['samePageRegionCount']>1 for u in usage),'sentinelUsagesByCollection':dict(sorted(collections.Counter(u['collection'] for u in usage if u['focusSentinelCount']).items())),'candidateImageGeometryBindings':len(candidates),'candidateUniqueImages':unique_candidates,'candidateLinkedUsages':sum(len(c['usages']) for c in candidates),'usagesByBook':dict(sorted(bybook.items())),'usagesByCollection':dict(sorted(bycollection.items())),'sentinelUsagesByBook':dict(sorted(sentinel.items())),'boundsTypes':dict(sorted(bounds.items())),'candidateBindingsByBook':dict(sorted(candbooks.items())),'candidateUsagesByCollection':dict(sorted(candcols.items()))},'warnings':warnings,'usages':usage,'candidates':candidates}
 out['counts']['cropEdgeAssessments']=dict(sorted(collections.Counter(u['cropEdgeAssessment'] for u in usage).items()))
 out['assessmentPolicy']={'candidate-text-box-crossing':'Uncertain clipping candidate; inspect source pixels.','assessed-text-layer':'No word-box crossing found; raster clipping and semantic omissions remain unresolved.','not-assessable':'Missing, invalid or unavailable inputs never become clean results.','semanticDimensions':'Every usage remains unresolved for context, continuation and fact-focus relevance until separately joined to exact source-bound review evidence.'}
 (OUT/(output_stem+'.json')).write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
 queues={'phb-equipment':[],'nonphb-equipment':[],'other-records':[]}
 for entry in candidates:
  tests={'phb-equipment':lambda u: u['collection']=='equipment' and entry['book']=='PHB','nonphb-equipment':lambda u: u['collection']=='equipment' and entry['book']!='PHB','other-records':lambda u: u['collection']!='equipment'}
  for name,test in tests.items():
   selected=[u for u in entry['usages'] if test(u)]
   if selected:queues[name].append({k:entry[k] for k in ('candidateId','book','printedPage','pdfPage','image','imageSha256','crossingCount')} | {'usages':selected})
 for name,entries in queues.items():
  q={'scope':'Text-layer crop-edge intersection candidates only; not proof of clipping. Images may occur in more than one queue when shared across collections.','baselineInputSha256':out['inputDataSha256'],'candidateCount':len(entries),'linkedUsages':sum(len(e['usages']) for e in entries),'candidates':entries}
  (OUT/(output_stem+'-queue-'+name+'.json')).write_text(json.dumps(q,indent=2,ensure_ascii=False)+'\n')
 lines=['# Source visual audit '+args.output_prefix+' snapshot','', 'The inventory covers every `sourceExcerpts` and `scanVerification` catalog referenced by the assembled `dist/data.json`. Input SHA-256: `'+out['inputDataSha256']+'`. It is a snapshot: re-run the tool after source data or catalogs change. The complete separately supplied DMG p.175 image stays private. The user confirmed the correct edition; its two published limited excerpts retain a separate source-artifact identity and have no canonical-PDF page ordinal. PDF-only word-box analysis cannot assess their source geometry.','', 'The `[0, 0, 1, 1]` focus rectangle is a suspected overhighlight pending per-region review; hiding the overlay is not semantic verification. Context labels are only heuristics and may describe a mixed heading-and-row crop. For each catalog binding, a page ordinal is computed within the item/book/printed-page group; viewer ordinal applies the current context-last role ordering and selected catalog. Other navigation and deep links can select another region.','', 'Crop-edge candidates are word-box intersections from the PDF text layer, using only original PDF geometry and hashes. A candidate is not a defect: OCR alignment, intentional partial context and neighboring columns can produce false positives. Text-layer misses do not establish safety. Review actual image pixels and source pages.','', '## Counts','', '```json',json.dumps(out['counts'],indent=2),'```','', 'No image or source PDF hash mismatches or unmappable region bounds were found.' if not warnings else 'Warnings: '+str(len(warnings)), '', 'The confirmed heading-only PHB p.35 image has '+str(out['counts']['knownHeadingOnlyUsages'])+' linked usages; '+str(out['counts']['knownHeadingOnlyFirstInPageGroup'])+' are first in their same-catalog page group, and '+str(out['counts']['knownHeadingOnlyViewerDefault'])+' are the current viewer default after role ordering. Every first occurrence has a sibling on that page. This exact-image finding does not establish semantic roles for other crops.','', '## Review queues','']
 for name,entries in queues.items():lines.append('- `'+output_stem+'-queue-'+name+'.json`: '+str(len(entries))+' unique image/geometry candidates; '+str(sum(len(e['usages']) for e in entries))+' linked usages.')
 lines+=['','## Highest-linked candidates','', '| Candidate | Book/page | Linked usages | Text boxes crossing edge |','| --- | --- | ---: | ---: |']
 for e in sorted(candidates,key=lambda v:(-len(v['usages']),-v['crossingCount'],v['candidateId']))[:10]:lines.append('| `'+e['candidateId']+'` | '+str(e['book'])+' '+str(e['printedPage'])+' | '+str(len(e['usages']))+' | '+str(e['crossingCount'])+' |')
 lines+=['','Stable candidate IDs bind image hash, source book/PDF page and normalized PDF-point bounds. Shared images can occur in multiple queues. Coordinates and all linked usages are in the baseline JSON; private PDF paths and full source text are not included.']
 (OUT/(output_stem+'.md')).write_text('\n'.join(lines)+'\n')
 print(json.dumps(out['counts'],indent=2));print('warnings',len(warnings))
if __name__=='__main__':main()
