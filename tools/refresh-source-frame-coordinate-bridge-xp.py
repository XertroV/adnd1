#!/usr/bin/env python3
"""Refresh only the reviewed XP append drift in the bounded frame bridge.

The base-777 registry is immutable input. This tool verifies that its old 102
region records remain byte/value-identical, verifies the exact 13 reviewed XP
catalog appends and their 11 owner-link deltas, then updates only current
catalog/owner-link identity hashes. It does not frame-approve the 13 appends.
"""
from __future__ import annotations
import argparse, hashlib, importlib.util, json, subprocess
from pathlib import Path
import fitz

ROOT=Path(__file__).resolve().parents[1]
BASE_COMMIT='77712b831fac3256baf97da385c1dd56b6d82e88'
CURRENT_COMMIT='a46eddc41ac6f712d5ad1498195df6a49810aae1'
BASE_BRIDGE=ROOT/'research/source-frame-coordinate-bridge-base777.json'
BASE_BRIDGE_SHA='dec13c8419afae87d00551718a56d9dc232cec59ffe9760627e7b0d5037b309e'
EXPECTED_DATA_SHA='a4225fbd2015c5ba7d225738ec1a9bf4658f4a9a9700e340a37dde79317119f3'
XP_SOURCE_REVIEW='research/source-audit-pass8-xp-continuation-independent-review.json'
XP_SOURCE_REVIEW_SHA='52409845b9f8da1f27d1c7eb5a2c44ca8980db0ccad4d5634ba6eac01fe0b319'
XP_INTEGRATION_REVIEW='research/source-audit-pass8-xp-continuation-current-integration-independent-review.json'
XP_INTEGRATION_REVIEW_SHA='5779110afafbf493dd7a237e2fe9adfc23a4fc400f71b158f84fddf6b77f0a8e'
XP_APPEND_ROWS={
  'pass8-cleric-xp-continuation-rule':('classes-cleric.json','cleric','PHB',20,21),
  'pass8-fighter-xp-continuation-rule':('classes-fighter.json','fighter','PHB',22,23),
  'pass8-paladin-xp-continuation-rule':('classes-paladin.json','paladin','PHB',24,25),
  'pass8-ranger-xp-continuation-rule':('classes-ranger.json','ranger','PHB',25,26),
  'pass8-magic-user-xp-continuation-table-opening':('classes-magic-user.json','magic-user','PHB',25,26),
  'pass8-magic-user-xp-continuation-rule':('classes-magic-user.json','magic-user','PHB',26,27),
  'pass8-illusionist-xp-continuation-rule':('classes-illusionist.json','illusionist','PHB',26,27),
  'pass8-thief-xp-continuation-rule':('classes-thief.json','thief','PHB',27,28),
  'pass8-ua-cavalier-xp-continuation-rule':('classes-ua-cavalier.json','ua-cavalier','UA',15,16),
  'pass8-ua-barbarian-xp-continuation-rule':('classes-ua-barbarian.json','ua-barbarian','UA',19,20),
  'pass8-ua-thief-acrobat-xp-continuation-rule':('classes-ua-thief-acrobat.json','ua-thief-acrobat','UA',23,24),
  'pass8-ua-paladin-xp-continuation-rule':('classes-ua-paladin.json','ua-paladin','PHB',24,25),
  'pass8-ua-paladin-phb-advancement-context':('classes-ua-paladin.json','ua-paladin','UA',16,17),
}
EXPECTED_OWNERS={spec[1] for spec in XP_APPEND_ROWS.values()}
PDFS={
 'DMG':('DMG_1stEd.pdf','7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'),
 'PHB':('tsr2010-players-handbook.pdf','e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095'),
 'UA':('Unearthed Arcana.pdf','e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4'),
 'MM':('Monster_Manual.pdf','c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81'),
 'MM2':('Monster Manual II.pdf','b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24'),
}

spec=importlib.util.spec_from_file_location('source_frame_coordinate_bridge',ROOT/'research/source_frame_coordinate_bridge.py')
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)

def sha_bytes(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def sha_file(path:Path)->str:return sha_bytes(Path(path).read_bytes())
def canonical(x)->str:return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)
def git_json(commit,path):return json.loads(subprocess.check_output(['git','show',f'{commit}:{path}'],cwd=ROOT))
def item_map(data,collection):return {x.get('id'):x for x in data.get(collection,[]) if isinstance(x,dict)}
def pdf_boxes(page):return {'pageRect':[float(x) for x in page.rect],'cropBox':[float(x) for x in page.cropbox],'mediaBox':[float(x) for x in page.mediabox],'cropBoxPosition':[float(x) for x in page.cropbox_position],'rotationDegrees':int(page.rotation)}

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--source-dir',required=True,help='Private directory containing the five source PDFs')
 p.add_argument('--output',type=Path,default=ROOT/'research/source-frame-coordinate-bridge.json')
 a=p.parse_args()
 if subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()!=CURRENT_COMMIT:
  raise SystemExit('current implementation commit differs from the reviewed XP append base')
 if sha_file(BASE_BRIDGE)!=BASE_BRIDGE_SHA:raise SystemExit('immutable base-777 bridge hash mismatch')
 base=bridge.load_registry(BASE_BRIDGE,BASE_BRIDGE_SHA)['registry']
 current_data_path=ROOT/'dist/data.json';current_data=json.loads(current_data_path.read_text());current_data_sha=sha_file(current_data_path)
 if current_data_sha!=EXPECTED_DATA_SHA:raise SystemExit('current reviewed XP distribution data hash mismatch')
 for path,want in ((ROOT/XP_SOURCE_REVIEW,XP_SOURCE_REVIEW_SHA),(ROOT/XP_INTEGRATION_REVIEW,XP_INTEGRATION_REVIEW_SHA)):
  if not path.is_file() or sha_file(path)!=want:raise SystemExit(f'review receipt hash mismatch: {path.name}')
 source_review=json.loads((ROOT/XP_SOURCE_REVIEW).read_text())
 if source_review.get('status')!='all11-proposed-mappings-and13-final-region-components-accepted-at-bounded-location-scope; activation-and-group-routing-pending':
  raise SystemExit('XP source review is not the approved bounded 13-region review')
 baseline_data=git_json(BASE_COMMIT,'dist/data.json')
 if sha_bytes(subprocess.check_output(['git','show',f'{BASE_COMMIT}:dist/data.json'],cwd=ROOT))!='568d04bd9fb5f43a3c26d5fc5d54d30f803e11c3b74aca5561a11479cf2d11a9':
  raise SystemExit('base-777 data source hash mismatch')
 before_classes=item_map(baseline_data,'classes');current_classes=item_map(current_data,'classes')
 if set(before_classes)!=set(current_classes):raise SystemExit('XP merge unexpectedly added or removed class owners')
 changed_collections=[]
 for collection in ('rules','spells','equipment','matrices','classes'):
  before=item_map(baseline_data,collection);after=item_map(current_data,collection)
  if before!=after:changed_collections.append(collection)
 if changed_collections!=['classes']:raise SystemExit(f'unexpected owner data delta outside class XP batch: {changed_collections}')
 changed_class_ids={k for k in before_classes if before_classes[k]!=current_classes[k]}
 if changed_class_ids!=EXPECTED_OWNERS:raise SystemExit(f'unexpected changed class owners: {sorted(changed_class_ids)}')
 for owner_id in EXPECTED_OWNERS:
  before_item=before_classes[owner_id];current_item=current_classes[owner_id]
  changed_fields={field for field in set(before_item)|set(current_item) if before_item.get(field)!=current_item.get(field)}
  old_xp=before_item.get('xpContinuation');new_xp=current_item.get('xpContinuation')
  if changed_fields!={'sourceExcerpts','xpContinuation'} or not isinstance(old_xp,dict) or not isinstance(new_xp,dict):
   raise SystemExit(f'class owner changed outside the reviewed XP tuple/source-link fields: {owner_id}/{sorted(changed_fields)}')
  old_xp_without_evidence=dict(old_xp);new_xp_without_evidence=dict(new_xp)
  old_xp_without_evidence.pop('evidenceBindings',None);new_xp_without_evidence.pop('evidenceBindings',None)
  if old_xp_without_evidence!=new_xp_without_evidence:
   raise SystemExit(f'XP tuple/value fields changed along with evidence bindings: {owner_id}')
 # Every old region in all eleven affected catalogs is an exact existing object;
 # the only catalog delta is the exact reviewed 13-row append set.
 expected_by_catalog={}
 for rid,(filename,owner,book,printed,pdfno) in XP_APPEND_ROWS.items():
  cat=f'scans/verified/{filename}';expected_by_catalog.setdefault(cat,[]).append(rid)
 appended=[];current_catalogs={}
 for catpath in sorted(set(row['catalog'] for frame in base['frames'] for row in frame['regions'])|set(expected_by_catalog)):
  before_cat=git_json(BASE_COMMIT,'dist/'+catpath)
  path=ROOT/'dist'/catpath
  if not path.is_file():raise SystemExit(f'current catalog missing: {catpath}')
  after_cat=json.loads(path.read_text());current_catalogs[catpath]=after_cat
  if {k:v for k,v in before_cat.items() if k!='regions'}!={k:v for k,v in after_cat.items() if k!='regions'}:
   raise SystemExit(f'non-region catalog metadata changed: {catpath}')
  old_regions=before_cat.get('regions',[]);new_regions=after_cat.get('regions',[])
  if len(new_regions)<len(old_regions) or new_regions[:len(old_regions)]!=old_regions:
   raise SystemExit(f'an existing source region was modified or reordered: {catpath}')
  extra=new_regions[len(old_regions):]
  got=[r.get('id') for r in extra]
  want=sorted(expected_by_catalog.get(catpath,[]))
  if sorted(got)!=want or len(got)!=len(set(got)):
   raise SystemExit(f'catalog append set mismatch for {catpath}: got={got} expected={want}')
  for region in extra:
   spec=XP_APPEND_ROWS[region['id']]
   _,owner,book,printed,pdfno=spec
   if (region.get('book'),region.get('printedPage'),region.get('pdfPage'))!=(book,printed,pdfno):
    raise SystemExit(f'XP append source identity mismatch: {region["id"]}')
   image_path=path.parent/str(region.get('image',''))
   if not image_path.is_file() or sha_file(image_path)!=region.get('sha256'):
    raise SystemExit(f'XP append image identity mismatch: {region["id"]}')
   focus_sha,content_sha=bridge.region_hashes(region)
   append={'catalog':catpath,'regionId':region['id'],'owner':{'collection':'classes','itemId':owner,'binding':'sourceExcerpts'},'book':book,'printedPage':printed,'pdfPage':pdfno,'sourcePdfSha256':after_cat.get('sources',{}).get(book,{}).get('sha256'),'image':region.get('image'),'imageSha256':region.get('sha256'),'imageDimensionsPx':[region.get('width'),region.get('height')],'normalizedPageRect':region.get('normalizedPageRect'),'boundsPdfPoints':region.get('boundsPdfPoints'),'focusSha256':focus_sha,'contentSha256':content_sha,'correctionRegistryMembership':'outside-this-bounded-correction-registry','frameDecision':'not added to the 102 existing joins by this append-only refresh'}
   appended.append(append)
 if {r['regionId'] for r in appended}!=set(XP_APPEND_ROWS) or len(appended)!=13:raise SystemExit('exact reviewed 13 append denominator did not reconcile')
 accepted={}
 for collection in ('cases','contextCases'):
  for case in source_review.get(collection,[]):
   values=case.get('acceptedRegionEvidence',[])
   if isinstance(values,dict):values=[values]
   for evidence in values:
    if evidence.get('regionId') in accepted and accepted[evidence.get('regionId')]!=evidence:
     raise SystemExit(f'conflicting accepted XP region evidence: {evidence.get("regionId")}')
    accepted[evidence.get('regionId')]=evidence
 if set(accepted)!=set(XP_APPEND_ROWS):raise SystemExit('source review receipt does not exactly cover the 13 new catalog regions')
 for row in appended:
  evidence=accepted[row['regionId']]
  keys=('book','printedPage','pdfPage','sourceSha256','image','imageSha256','width','height','focusSha256','contentSha256')
  expected=(row['book'],row['printedPage'],row['pdfPage'],row['sourcePdfSha256'],row['image'],row['imageSha256'],row['imageDimensionsPx'][0],row['imageDimensionsPx'][1],row['focusSha256'],row['contentSha256'])
  if tuple(evidence.get(k) for k in keys)!=expected:raise SystemExit(f'XP source-review evidence does not match appended region: {row["regionId"]}')
 # Owner links may grow only by the named XP region reviews, and their old
 # review hash/grade content is carried unchanged except for the one explicit
 # UA paladin heading-scope metadata annotation in the merged reviewed batch.
 old_owner_link_hashes={};new_owner_link_hashes={};owner_link_changes=[];old_review_metadata_changes=[]
 for owner_id in sorted(EXPECTED_OWNERS):
  before=before_classes[owner_id]['sourceExcerpts'];after=current_classes[owner_id]['sourceExcerpts']
  if before.get('catalog')!=after.get('catalog'):raise SystemExit(f'owner catalog changed: {owner_id}')
  if {k:v for k,v in before.items() if k not in ('regionCount','regionReviews')}!={k:v for k,v in after.items() if k not in ('regionCount','regionReviews')}:
   raise SystemExit(f'owner link field outside XP append changed: {owner_id}')
  old_reviews={r['regionId']:r for r in before.get('regionReviews',[])};new_reviews={r['regionId']:r for r in after.get('regionReviews',[])}
  append_ids={x['regionId'] for x in appended if x['owner']['itemId']==owner_id}
  if not set(old_reviews).issubset(new_reviews) or set(new_reviews)-set(old_reviews)!=append_ids:
   raise SystemExit(f'owner region-review delta is not the exact append set: {owner_id}')
  for rid,old_review in old_reviews.items():
   new_review=new_reviews[rid]
   if old_review==new_review:continue
   if owner_id!='ua-paladin' or rid!='ua-16-73a314c55d8d5fee':raise SystemExit(f'unexpected existing owner review metadata changed: {owner_id}/{rid}')
   old_no_scope=dict(old_review);new_no_scope=dict(new_review)
   old_record=old_no_scope.pop('recordedReview',None);new_record=new_no_scope.pop('recordedReview',None)
   if old_no_scope!=new_no_scope or old_record is not None or new_record!={'status':None,'independent':False,'evidence':None,'hashesMatch':True,'scope':'Old UA16 context heading crop only; new continuation field selects the separately reviewed replacement.'}:
    raise SystemExit('unexpected UA paladin heading metadata adjustment')
   old_review_metadata_changes.append({'owner':'ua-paladin','regionId':rid,'change':'recordedReview scope annotation only; review grade/hash tuple unchanged'})
  catalog=current_catalogs[after['catalog']]
  if after.get('regionCount')!=len(catalog.get('regions',[])) or len(after.get('regionReviews',[]))!=len(catalog.get('regions',[])):
   raise SystemExit(f'owner catalog denominator mismatch: {owner_id}')
  old_owner_link_hashes[owner_id]=bridge.canonical_sha(before)
  new_owner_link_hashes[owner_id]=bridge.canonical_sha(after)
  owner_link_changes.append({'collection':'classes','itemId':owner_id,'binding':'sourceExcerpts','catalog':after['catalog'],'oldRegionCount':before['regionCount'],'currentRegionCount':after['regionCount'],'appendedRegionIds':sorted(append_ids),'oldOwnerSourceLinkSha256':old_owner_link_hashes[owner_id],'currentOwnerSourceLinkSha256':new_owner_link_hashes[owner_id]})
 # Verify every source PDF and the exact old page boxes remain valid.
 source_dir=Path(a.source_dir);pdfs={};source_hashes={}
 for book,(filename,expected_sha) in PDFS.items():
  path=source_dir/filename
  if not path.is_file() or sha_file(path)!=expected_sha:raise SystemExit(f'source PDF hash mismatch: {book}')
  source_hashes[book]=expected_sha;pdfs[book]=fitz.open(path)
 out=json.loads(BASE_BRIDGE.read_text());regions_checked=0
 for frame in out['frames']:
  if frame['sourcePdfSha256']!=source_hashes[frame['book']]:raise SystemExit('base source PDF pin mismatch')
  page=pdfs[frame['book']][frame['pdfPage']-1]
  if pdf_boxes(page)!=frame['pdfBoxesPoints']:raise SystemExit(f'PDF page boxes changed: {frame["frameId"]}')
  for row in frame['regions']:
   catpath=row['catalog'];catalog=current_catalogs.get(catpath)
   if catalog is None:catalog=json.loads((ROOT/'dist'/catpath).read_text());current_catalogs[catpath]=catalog
   matches=[r for r in catalog.get('regions',[]) if r.get('id')==row['regionId']]
   if len(matches)!=1:raise SystemExit(f'old source region absent/ambiguous: {catpath}#{row["regionId"]}')
   region=matches[0]
   old_cat=git_json(BASE_COMMIT,'dist/'+catpath)
   old_matches=[r for r in old_cat['regions'] if r.get('id')==row['regionId']]
   if len(old_matches)!=1 or region!=old_matches[0]:raise SystemExit(f'old source region content changed: {catpath}#{row["regionId"]}')
   focus_sha,content_sha=bridge.region_hashes(region)
   image_path=ROOT/'dist'/catpath
   image_path=image_path.parent/str(region.get('image',''))
   if not image_path.is_file() or sha_file(image_path)!=row['imageSha256']:raise SystemExit(f'old source image bytes changed: {row["regionId"]}')
   if [region.get('width'),region.get('height')]!=row['imageDimensionsPx']:raise SystemExit(f'old source image dimensions changed: {row["regionId"]}')
   if (focus_sha,content_sha,region.get('normalizedPageRect'),region.get('book'),region.get('printedPage'),region.get('pdfPage'),region.get('sha256'))!=(row['focusSha256'],row['contentSha256'],row['normalizedPageRect'],row['book'],row['printedPage'],row['pdfPage'],row['imageSha256']):
    raise SystemExit(f'old focus/content/geometry/source identity changed: {row["regionId"]}')
   owner=row['owner']
   if owner['collection']=='classes':current_item=current_classes.get(owner['itemId'])
   elif owner['collection']=='progressionExplainer' and owner['itemId']=='progression-explainer':current_item=current_data.get('progressionExplainer')
   else:current_item=item_map(current_data,owner['collection']).get(owner['itemId'])
   if current_item is None:raise SystemExit(f'old owner missing: {owner}')
   link=current_item.get(owner['binding'])
   if not isinstance(link,dict) or link.get('catalog')!=catpath:raise SystemExit(f'old owner/catalog binding changed: {owner}')
   row['catalogSha256']=sha_file(ROOT/'dist'/catpath)
   row['ownerSourceLinkSha256']=bridge.canonical_sha(link)
   if (row['reviewHashBinding'],row['reviewAssessments'])!=(next(x for f in base['frames'] for x in f['regions'] if x['owner']==owner and x['regionId']==row['regionId'])['reviewHashBinding'],next(x for f in base['frames'] for x in f['regions'] if x['owner']==owner and x['regionId']==row['regionId'])['reviewAssessments']):
    raise SystemExit('review pins altered while refreshing source links')
   regions_checked+=1
 out['provenance']['implementationBaseCommit']=CURRENT_COMMIT
 out['provenance']['dataSha256AtRegistryBuild']=current_data_sha
 out['provenance']['catalogHashes']={cat:sha_file(ROOT/'dist'/cat) for cat in sorted(current_catalogs)}
 out['provenance']['refreshFromBase777']={
  'baseRegistryPath':'research/source-frame-coordinate-bridge-base777.json','baseRegistrySha256':BASE_BRIDGE_SHA,
  'baseCommit':BASE_COMMIT,'currentCommit':CURRENT_COMMIT,
  'xpSourceReviewPath':XP_SOURCE_REVIEW,'xpSourceReviewSha256':XP_SOURCE_REVIEW_SHA,
  'xpCurrentIntegrationReviewPath':XP_INTEGRATION_REVIEW,'xpCurrentIntegrationReviewSha256':XP_INTEGRATION_REVIEW_SHA,
  'oldRegionObjectsAndImageBytesUnchanged':regions_checked==102,'oldRegionSourceFocusContentGeometryPinsUnchanged':regions_checked==102,
  'oldManualReviewHashAndAssessmentPinsUnchanged':True,
  'appendedCatalogRegions':sorted(appended,key=lambda x:(x['catalog'],x['regionId'])),
  'changedOwnerLinks':owner_link_changes,'existingReviewMetadataChanges':old_review_metadata_changes,
  'frameDecision':'The 13 appended XP regions stay outside the existing 102 joins. A separately proved cropbox/pageRect frame candidate for PHB p.27 thief is proposed in the resolution report and is not active until independent approval.',
 }
 # The current total catalog hashes are the exact frame-catalog footprint only;
 # append metadata is separately pinned above and never becomes a frame join.
 a.output.parent.mkdir(parents=True,exist_ok=True)
 a.output.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 actual_sha=sha_file(a.output)
 print(json.dumps({'output':str(a.output),'sha256':actual_sha,'currentCommit':CURRENT_COMMIT,'currentDataSha256':current_data_sha,'frameGroups':len(out['frames']),'physicalPdfPages':out['counts']['physicalPdfPages'],'oldRegionJoinPinsRefreshed':regions_checked,'appendedCatalogRegions':len(appended),'changedOwnerLinks':len(owner_link_changes),'existingReviewMetadataChanges':len(old_review_metadata_changes)},indent=2))

if __name__=='__main__':main()
