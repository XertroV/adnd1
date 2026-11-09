import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {canonical,regionHashes} from '../../../../tools/source-visual-coverage.mjs';
import {validateScanCatalog} from '../../../../tools/scan-catalog.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../../');
mkdirSync(path.join(here,'catalogs'),{recursive:true});
const require=createRequire(import.meta.url);
const books=require('../../../../dist/books.js');
const V2='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v2';
const ROOT_RECEIPT='research/missile-table-discoverability/root-final-v2-focus-acceptance-v1.json';
const INDEPENDENT_RECEIPT='research/missile-table-discoverability/focus-navigation-correction-v2-independent-review-v1.json';
const ROOT_CELL_REVIEW='research/missile-table-discoverability/root-source-cell-review-v1.json';
const ROOT_PRIOR_FOCUS='research/missile-table-discoverability/root-source-focus-partial-acceptance-v1.json';
const OUT_REL='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v3';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileBytes=relative=>readFileSync(path.join(root,relative));
const fileText=relative=>fileBytes(relative).toString('utf8');
const readJson=relative=>JSON.parse(fileText(relative));
const writeJson=(filename,value)=>writeFileSync(path.join(here,filename),JSON.stringify(value,null,2)+'\n');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const expectedV2={
 'focus-correction-proposal.json':'1bb16169127830b190addf4d516d3cd24805442a5568142876d1c47b710a4899',
 'rules-records-candidate-corrected.json':'78cdd185d4e9299e1c2c10315cf5e0612e0f730b6fff315d8e1c7b727e75d7cb',
 'catalogs/rules-phb-hurled-weapons-and-missiles-table.json':'30f34ed21b93b6d9b12246bdb60ade343828e65a2e687d87dc572309f7bf5934',
 'catalogs/rules-ua-hurled-weapons-and-missiles-table.json':'7ee89939d6911c400714354acce7c0eda29c4a24879ecf820424bf30f29c7de0',
 'private-review-overlay-manifest.json':'112c6d1ba1fa0d57dedd9c7405127c93ac2cc78edbb03c0d0530565bb5fca18f',
};
for(const [name,expected] of Object.entries(expectedV2))assert(sha(fileBytes(`${V2}/${name}`))===expected,`Frozen V2 input changed: ${name}`);
assert(sha(fileBytes(ROOT_RECEIPT))==='ffb7dbe50f7eed554ca2c6903bdaa8d1677ab1d801fa411ee2d56a93ad4fdf48','Root final V2 focus acceptance changed');
assert(sha(fileBytes(INDEPENDENT_RECEIPT))==='e5a8ee7982062ec5cb646b453dc48e0130daffcb67a1044b4d0c730abdde0b8f','Independent V2 focus review changed');
assert(sha(fileBytes(ROOT_CELL_REVIEW))==='7a9866ca04dbc71138b260ede3936ae4c99a8db10b685435c7ac424f1517f7c3','Root source-cell receipt changed');
assert(sha(fileBytes(ROOT_PRIOR_FOCUS))==='01923b45ab676a72a3811b811f9000e20872efa0d662398fab071ca3895bb6ff','Prior bounded source-focus receipt changed');

const v2Records=readJson(`${V2}/rules-records-candidate-corrected.json`);
const records=structuredClone(v2Records);
const catalogs={
 'phb-hurled-weapons-and-missiles-table':readJson(`${V2}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`),
 'ua-hurled-weapons-and-missiles-table':readJson(`${V2}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`),
};
const v2Catalogs=structuredClone(catalogs);
const rootFocus=readJson(ROOT_RECEIPT);
const independentFocus=readJson(INDEPENDENT_RECEIPT);
const priorFocus=readJson(ROOT_PRIOR_FOCUS);
const cellReview=readJson(ROOT_CELL_REVIEW);
const reviewedRegionIds=new Set([
 ...catalogs['phb-hurled-weapons-and-missiles-table'].regions.filter(r=>r.book==='PHB'&&r.printedPage===38).map(r=>r.id),
 ...catalogs['ua-hurled-weapons-and-missiles-table'].regions.filter(r=>r.book==='UA'&&r.printedPage===28).map(r=>r.id),
]);
const contextIds=new Set(['phb38-table-context','ua28-table-context']);
const rowOrNote=(region)=>region.role==='row'||region.role==='note'||region.role==='footnote';
function setReviewMetadata(region,{book,printedPage,pdfPage,fullTable=false}){
 const page=`${book} printed p. ${printedPage} / supplied PDF p. ${pdfPage}`;
 region.checkedOn='2026-11-09';
 if(fullTable){
  region.candidateStatus='Whole-lookup scope accepted in principle; V3 final catalog/content/default hashes await root review; research-only and unregistered.';
  region.summary='Complete unmarked table excerpt is the primary whole-lookup context for this record. No row highlight is proposed for a whole-table lookup; the exact final default group remains pending root review.';
  region.checkedFields={
   sourceLocation:`${page} source location and image identity are pinned.`,
   wholeLookupScope:'Root accepted the complete table as the lookup scope in principle. V3 role=table is metadata-only; a hash-bound whole-lookup scope and context/default review is proposed but not accepted or active.',
   gradeBoundary:'This context object does not assign numeric-field, source-value, or mechanics grades.'
  };
  return;
 }
 const kind=region.role==='row'?'complete source-row focus':region.role==='note'?'printed table-note focus':'printed footnote focus';
 region.candidateStatus=`Bounded ${kind} review is recorded on V2 pins; V3 metadata changes require exact root hash review. No field/source-value grade is promoted.`;
 region.summary=region.role==='row'
  ?`The complete ${region.sourceRowId||region.title} source row has bounded split-focus acceptance on V2 pins. V3 content hashes changed only with review metadata; exact final object review remains pending. No numeric field or mechanics grade is inferred.`
  :region.role==='note'
   ?`The printed table-note focus has bounded visual acceptance on V2 pins. Note text and source interpretation are unchanged; exact V3 content/default review remains pending and no field-value grade is inferred.`
   :`The printed Aklys footnote focus and visible marker retain bounded visual acceptance on V2 pins. Text and marker are unchanged; exact V3 content/default review remains pending and no field-value grade is inferred.`;
 region.checkedFields={
  sourceLocation:`${page} source location and image identity are pinned.`,
  focusGeometry:`The ${kind} is covered by the prior hash-bound bounded source/focus review; this V3 metadata-only object still awaits exact root hash review.`,
  valueGradeBoundary:'This focus review does not assess extracted values or mechanics; sourceValueStatus remains not-assessed-by-field-target-review.'
 };
}
for(const [itemId,catalog] of Object.entries(catalogs)){
 const src=V2+`/catalogs/rules-${itemId}.json`;
 const isPhb=itemId.startsWith('phb-');
 const pageRegion=isPhb?38:28;
 const book=isPhb?'PHB':'UA';
 catalog.candidateStatus='Research-only metadata successor; bounded source/focus scope is accepted on prior pins, but exact V3 content/default hashes await root review. No active sourceExcerpts registration or field/source-value grade.';
 catalog.scope=isPhb
  ?'Research-only owner-scoped excerpt catalog. PHB p.38 has 15 split row foci, two printed table-note foci, and a complete unmarked whole-lookup table region. The 15 row foci and note foci have prior bounded source/focus acceptance; V3 metadata/content/default hashes await root review. Three PHB p.36 armor-class rows are preserved as exact reused regions. This candidate does not register sourceExcerpts or promote numeric-field, source-value, or mechanics grades.'
  :'Research-only owner-scoped excerpt catalog. UA p.28 has 24 row foci, two printed table-note foci, the Aklys footnote focus, and a complete unmarked whole-lookup table region. These source/focus uses have prior bounded review acceptance; V3 metadata/content/default hashes await root review. Three PHB p.36 armor-class rows are preserved as exact reused regions. This candidate does not register sourceExcerpts or promote numeric-field, source-value, or mechanics grades.';
 for(const reuse of catalog.reusedRegions||[]){
  reuse.policy=`Exact region object copied without modification. The bounded source/focus use was previously accepted for rules:${itemId}; the V3 owner-catalog metadata/default hashes remain a research candidate pending exact root review. Reuse is not a new source-value grade.`;
 }
 for(const region of catalog.regions){
  if(region.book===book&&region.printedPage===pageRegion){
   assert(reviewedRegionIds.has(region.id),`Unexpected in-scope V3 region ${region.id}`);
   if(contextIds.has(region.id)){
    region.role='table';
    setReviewMetadata(region,{book,printedPage:pageRegion,pdfPage:region.pdfPage,fullTable:true});
   }else{
    assert(rowOrNote(region),`Unexpected in-scope role ${region.id}:${region.role}`);
    setReviewMetadata(region,{book,printedPage:pageRegion,pdfPage:region.pdfPage});
   }
  }
 }
 const record=records.records.find(r=>r.id===itemId);
 assert(record,`Missing owner record ${itemId}`);
 record.candidateStatus=`Research-only V3 metadata successor. Source-cell literals remain unchanged and separately reconciled to the 555-cell receipt; bounded row/note/footnote focus acceptance is on V2 pins. V3 metadata changes require root review of exact catalog/content/default hashes. Owner/field-target review remains pending; every sourceValueStatus stays not-assessed-by-field-target-review. No active sourceExcerpts registration or source-value/mechanics grade.`;
}
records.status='Research-only V3 metadata successor for the PHB p.38 and UA p.28 missile-table owners. It preserves the 555 literal cells, field-target-pending state, not-assessed sourceValueStatus values, and all unresolved interpretations. V3 catalog/content/default hashes and whole-lookup context/default proposals await root review; nothing is activated.';

// Update only candidate evidence workflow text and its derived region content hashes.
const regionByOwner=new Map(Object.entries(catalogs).map(([owner,catalog])=>[owner,new Map(catalog.regions.map(region=>[region.id,region]))]));
let bindingMetadataUpdates=0,contentHashUpdates=0;
for(const record of records.records){
 const itemId=record.id;
 const targets=(record.table.rows||[]).map(row=>row.sourceReference).concat((record.table.sourceNotes||[]).map(note=>note.sourceReference),(record.table.footnotes||[]).map(note=>note.sourceReference));
 for(const ref of targets){
  for(const evidenceBinding of ref?.evidenceBindings||[]){
   for(const evidence of evidenceBinding.regionEvidence||[]){
    if(!reviewedRegionIds.has(evidence.regionId))continue;
    const region=regionByOwner.get(itemId)?.get(evidence.regionId);
    assert(region,`Missing reviewed region for ${itemId}/${evidence.regionId}`);
    const prior={sourceValueStatus:evidenceBinding.sourceValueStatus,reviewStatus:evidenceBinding.reviewStatus};
    evidenceBinding.contextStatus='pending-root-final-object-review';
    evidenceBinding.contextLimitations=[
     'The bounded source/focus review is recorded on the V2 pins; V3 review metadata changed region content hashes, so exact final context/default review remains pending.',
     `sourceValueStatus remains ${evidenceBinding.sourceValueStatus||'unrecorded'} and reviewStatus remains ${evidenceBinding.reviewStatus||'unrecorded'}; no numeric-field or mechanics grade is inferred.`
    ];
    assert(evidenceBinding.sourceValueStatus===prior.sourceValueStatus,`sourceValueStatus altered ${itemId}/${evidence.regionId}`);
    assert(evidenceBinding.reviewStatus===prior.reviewStatus,`reviewStatus altered ${itemId}/${evidence.regionId}`);
    bindingMetadataUpdates++;
    const oldContent=evidence.contentSha256;
    evidence.contentSha256=regionHashes(region).contentSha256;
    if(oldContent!==evidence.contentSha256)contentHashUpdates++;
   }
  }
 }
}

const inputV2={
 proposal:`${V2}/focus-correction-proposal.json`,records:`${V2}/rules-records-candidate-corrected.json`,
 phbCatalog:`${V2}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`,
 uaCatalog:`${V2}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`,
 focusManifest:`${V2}/focus-correction-manifest.json`,overlayManifest:`${V2}/private-review-overlay-manifest.json`
};
const rootPins=[ROOT_RECEIPT,INDEPENDENT_RECEIPT,ROOT_CELL_REVIEW,ROOT_PRIOR_FOCUS].map(filename=>({path:filename,sha256:sha(fileBytes(filename))}));
const recordsById=new Map(records.records.map(record=>[record.id,record]));
function orderedPageGroup(itemId,catalog,book,page){
 const selected=catalog.regions.filter(region=>region.book===book&&region.printedPage===page);
 const ordered=selected.sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
 const entries=ordered.map(region=>({id:region.id,role:region.role||null,imageSha256:region.sha256,...regionHashes(region)}));
 const defaultOrderSha256=sha(canonical(entries));
 return {collection:'rules',itemId,binding:'sourceExcerpts',futureCatalogPath:`scans/verified/rules-${itemId}.json`,book,printedPage:page,pdfPage:ordered[0]?.pdfPage??null,regionCount:ordered.length,defaultRegionId:ordered[0]?.id||null,defaultOrderSha256,orderedRegions:entries};
}
const groups=[
 orderedPageGroup('phb-hurled-weapons-and-missiles-table',catalogs['phb-hurled-weapons-and-missiles-table'],'PHB',38),
 orderedPageGroup('ua-hurled-weapons-and-missiles-table',catalogs['ua-hurled-weapons-and-missiles-table'],'UA',28),
];
assert(groups[0].defaultRegionId==='phb38-table-context','PHB p.38 table context is not first');
assert(groups[1].defaultRegionId==='ua28-table-context','UA p.28 table context is not first');
const wholeLookupProposals={schemaVersion:1,artifactType:'whole-lookup-scope-and-context-default-review-proposals',status:'research-only proposed review objects; not independent approvals and not written to source-visual-reviews.json',implementationLimit:'Both table regions already have empty focusRects arrays and contain no full-image sentinel. The separate scope proposal documents whole-table citation intent; the review template uses only the existing context/default assessment slots. No highlight exception, unsupported assessment kind, or global validator change is proposed.',proposals:groups.map(group=>{
 const catalog=catalogs[group.itemId];const region=catalog.regions.find(r=>r.id===group.defaultRegionId);
 const sourcePdfSha256=catalog.sources[group.book].sha256;
 const imagePath=`dist/scans/verified/${region.image}`;
 const hashes=regionHashes(region);
 const lookup={collection:'rules',itemId:group.itemId,binding:'sourceExcerpts',book:group.book,printedPage:group.printedPage,pdfPage:group.pdfPage,sourcePdfSha256,tableRegionId:region.id,tableImagePath:imagePath,imageSha256:region.sha256,focusSha256:hashes.focusSha256,contentSha256:hashes.contentSha256,role:region.role,focusRects:region.focusRects};
 return {
  id:`${group.book.toLowerCase()}-${group.printedPage}-whole-table-scope`,
  reviewStatus:'pending-root-final-object-review',
  scopeProposal:{lookupScope:'whole-table',unmarked:true,scopeEvidence:'The source owner is the complete missile table lookup. The table region contains the heading, rows, adjustment columns, and printed notes. The entry has an explicit table.sourceContext route to this complete table; row-specific value targets retain their separate row foci.',
   explicitSourceContext:recordsById.get(group.itemId).table.sourceContext,focusRects:region.focusRects,
   note:'This is a separate research scope statement, not an assessment kind or a claim that a highlight exception was approved.'},
  lookup,
  reviewRecordTemplate:{collection:'rules',itemId:group.itemId,binding:'sourceExcerpts',regionId:region.id,sourceSha256:sourcePdfSha256,imageSha256:region.sha256,focusSha256:hashes.focusSha256,contentSha256:hashes.contentSha256,
   assessments:{context:{status:null,independent:null,evidence:`Pending independent review of whole-table context for this exact V3 object: ${group.book} printed p. ${group.printedPage}, supplied PDF p. ${group.pdfPage}; full ordered page-group/default pin ${group.defaultOrderSha256}.`},default:{status:null,independent:null,evidence:`Pending independent review that ${region.id} is the correct unqualified whole-table default for the complete ordered page group pinned below.`}},
   defaultOrderSha256:group.defaultOrderSha256,selectedRegionId:region.id,reviewer:null,reviewedAt:null},
  exactOrderedPageGroup:{collection:'rules',itemId:group.itemId,binding:'sourceExcerpts',book:group.book,printedPage:group.printedPage,pdfPage:group.pdfPage,defaultOrderSha256:group.defaultOrderSha256,regionCount:group.regionCount,defaultRegionId:group.defaultRegionId,orderedRegions:group.orderedRegions},
  approval:'Proposal only. Root must review this exact catalog, region image/focus/content hashes, explicit whole-table scope, and complete ordered default-group hash. No assessment, ledger entry, or source-grade change is asserted.'
 };
})};
writeJson('catalogs/rules-phb-hurled-weapons-and-missiles-table.json',catalogs['phb-hurled-weapons-and-missiles-table']);
writeJson('catalogs/rules-ua-hurled-weapons-and-missiles-table.json',catalogs['ua-hurled-weapons-and-missiles-table']);
writeJson('rules-records-candidate-corrected.json',records);
writeJson('whole-lookup-review-proposals.json',wholeLookupProposals);

const proposal={schemaVersion:1,artifactType:'missile-table-production-metadata-successor-candidate',status:'research-only V3 proposal; no activation, no sourceExcerpts override, no source-value/mechanics grade promotion',scope:{metadataOnly:true,sourceAndData:'No source pixels, focus rectangles, image identity, PDF identity, crop bounds, row values, row identities, source text, source interpretations, or source-value status are altered.',acceptedFocus:'Root final V2 receipt accepts all 15 split PHB p.38 row focus pairs; prior accepted source-focus receipt covers the unchanged UA rows/notes/Aklys footnote and PHB p.36 reuse. V3 metadata changes require root review against exact final region content hashes.',wholeLookup:'For two complete unmarked full-table scopes only, role changes from context to table. Page and region IDs, image bytes, empty focus rectangles, explicit table.sourceContext region IDs, and row-specific foci stay fixed.',defaults:'Both complete page groups and their exact official source-visual defaultOrderSha256 values are listed in the V3 manifest and whole-lookup proposal. Root review remains required.',fieldStatus:'All 50 candidate evidenceBindings retain reviewStatus and sourceValueStatus, including not-assessed-by-field-target-review. No row/cell source-value or mechanics grade is proposed.',retainedPages:'All V2 source references remain, including PHB pp.36/38 and UA p.28; no V2 region is deleted. The V2 catalogs contain no DMG p.28 region; active catalogs and compiled data are untouched.'},allowedLeafChanges:['Catalog descriptions, scope and candidate workflow text to distinguish prior bounded focus acceptance from V3 exact-hash review pending.','Two table-context region roles: phb38-table-context and ua28-table-context, context→table.','Catalog summaries/checkedFields/candidateStatus for the reviewed PHB p.38 and UA p.28 source objects, with no numeric claim.','V2-derived evidence-binding context workflow text for the PHB p.38 and UA p.28 regions; reviewStatus/sourceValueStatus/valuePathStatus remain exact.','Derived regionEvidence.contentSha256 values for those metadata-changed regions.','Candidate record wrapper/owner candidateStatus text, root-scoped with no field/source value grade.','Two proposed complete-whole-table context/default review templates, bound to V3 catalog/content/full page-group hashes; no highlight exception is proposed and no review is active.'],proposedNextStep:'Root independently reviews V3 final catalog contents, content hashes, whole-lookup scope and complete ordered defaults. Only after that review can any approved authored-source activation be considered; no data assembly or grade change is part of this package.',inputs:{v2:Object.fromEntries(Object.entries(inputV2).map(([k,v])=>[k,{path:v,sha256:sha(fileBytes(v))}])),rootFinalV2Acceptance:{path:ROOT_RECEIPT,sha256:sha(fileBytes(ROOT_RECEIPT))},independentV2Review:{path:INDEPENDENT_RECEIPT,sha256:sha(fileBytes(INDEPENDENT_RECEIPT))},rootSourceCellReview:{path:ROOT_CELL_REVIEW,sha256:sha(fileBytes(ROOT_CELL_REVIEW))},rootPriorFocusAcceptance:{path:ROOT_PRIOR_FOCUS,sha256:sha(fileBytes(ROOT_PRIOR_FOCUS))}}};
writeJson('production-metadata-proposal.json',proposal);

const preservation={records:records.records.map(record=>({itemId:record.id,rows:record.table.rows.length,cells:record.table.rows.reduce((n,row)=>n+row.cells.length,0),sourceContext:record.table.sourceContext,sourceReferencePages:[...new Map(record.sourceReferences.map(ref=>[`${ref.book}:${ref.printedPage}:${ref.pdfPage}`,{book:ref.book,printedPage:ref.printedPage,pdfPage:ref.pdfPage}])).values()]})),fieldStatusCounts:{reviewStatus:{},sourceValueStatus:{},valuePathStatus:{}},v2CandidatePreserved:Object.fromEntries(Object.entries(inputV2).map(([k,v])=>[k,{path:v,sha256:sha(fileBytes(v))}]))};
for(const record of records.records){
 for(const ref of (record.table.rows||[]).map(row=>row.sourceReference).concat((record.table.sourceNotes||[]).map(note=>note.sourceReference),(record.table.footnotes||[]).map(note=>note.sourceReference))){for(const b of ref?.evidenceBindings||[]){for(const [key,field] of [['reviewStatus','reviewStatus'],['sourceValueStatus','sourceValueStatus'],['valuePathStatus','valuePathStatus']]){const value=String(b[field]??'missing');preservation.fieldStatusCounts[key][value]=(preservation.fieldStatusCounts[key][value]||0)+1;}}}
}
const v2SourceValues=new Map(v2Records.records.map(record=>[record.id,record]));
let literalCellCount=0,exactTablePayload=true;
for(const record of records.records){
 const prior=v2SourceValues.get(record.id);assert(prior,'V2 owner absent');
 const rowValues=record.table.rows.map(row=>({id:row.id,label:row.label,printedLabel:row.printedLabel,markers:row.markers,cells:row.cells}));
 const oldRowValues=prior.table.rows.map(row=>({id:row.id,label:row.label,printedLabel:row.printedLabel,markers:row.markers,cells:row.cells}));
 assert(isDeepStrictEqual(rowValues,oldRowValues),`Source table rows/literal cells changed for ${record.id}`);
 literalCellCount+=record.table.rows.reduce((n,row)=>n+row.cells.length,0);
 const strings=x=>x.map(item=>({id:item.id,label:item.label,text:item.text,marker:item.marker,appliesTo:item.appliesTo}));
 assert(isDeepStrictEqual(strings(record.table.sourceNotes||[]),strings(prior.table.sourceNotes||[])),`Source note text changed ${record.id}`);
 assert(isDeepStrictEqual(strings(record.table.footnotes||[]),strings(prior.table.footnotes||[])),`Source footnote text changed ${record.id}`);
 assert(isDeepStrictEqual(record.table.columns,prior.table.columns),`Source columns changed ${record.id}`);
 assert(isDeepStrictEqual(record.table.sourceContext,prior.table.sourceContext),`Explicit sourceContext changed ${record.id}`);
}
assert(literalCellCount===555,`Expected 555 literal cells, got ${literalCellCount}`);
assert(records.records.every(record=>!record.sourceExcerpts),'No active sourceExcerpts may be present in candidate records');
assert(preservation.fieldStatusCounts.reviewStatus['field-target-pending']===50,'Expected all 50 field targets to remain pending');
assert(preservation.fieldStatusCounts.sourceValueStatus['not-assessed-by-field-target-review']===50,'Expected all 50 sourceValueStatus entries to stay not-assessed');
const rootAcceptanceInputs={
 focus15:rootFocus.counts.phbRows===15&&rootFocus.counts.phbRectangles===30,
 independentReview:independentFocus.counts.phbRowsReviewed===15&&independentFocus.counts.phbRectanglesReviewed===30,
 cellLiteralReview:cellReview.recordedCellCount===555||JSON.stringify(cellReview).includes('555'),
};
assert(rootAcceptanceInputs.focus15&&rootAcceptanceInputs.independentReview,'Root focus acceptance and independent review do not cover exactly 15 rows / 30 rectangles');

const futurePath=owner=>`scans/verified/rules-${owner}.json`;
const validation=[];
for(const record of records.records){
 const catalog=catalogs[record.id];
 const verification={collection:'rules',state:'source-excerpt-checked',catalog:futurePath(record.id),regionCount:catalog.regions.length};
 validateScanCatalog(catalog,{id:record.id},books,verification);
 for(const region of catalog.regions){
  const identity=books.resolveRegionSourceIdentity(catalog,region);
  assert(identity?.valid,`Invalid source identity ${record.id}/${region.id}`);
  const imagePath=path.join(root,'dist/scans/verified',region.image);
  assert(sha(readFileSync(imagePath))===region.sha256,`Image bytes mismatch ${record.id}/${region.id}`);
 }
 const refHashes=new Map();
 for(const ref of (record.table.rows||[]).map(row=>row.sourceReference).concat((record.table.sourceNotes||[]).map(note=>note.sourceReference),(record.table.footnotes||[]).map(note=>note.sourceReference))){
  for(const b of ref?.evidenceBindings||[]){
   for(const evidence of b.regionEvidence||[]){
    const region=catalog.regions.find(r=>r.id===evidence.regionId);if(!region)continue;
    const hashes=regionHashes(region);
    assert(evidence.contentSha256===hashes.contentSha256,`Stale content hash ${record.id}/${region.id}`);
    assert(evidence.focusSha256===hashes.focusSha256,`Focus hash changed ${record.id}/${region.id}`);
    refHashes.set(region.id,hashes);
   }
  }
 }
 validation.push({itemId:record.id,valid:true,regionCount:catalog.regions.length,sourceImagesMatched:true,regionEvidenceContentHashesMatched:refHashes.size,validationFunction:'tools/scan-catalog.mjs validateScanCatalog'});
}
const finalGroups=groups.map(group=>({...group,allSourceAndGroupHashesRecomputedWith:'tools/source-visual-coverage.mjs regionHashes() and canonical()'}));
const rootAcceptedUses=priorFocus.accepted||[];
let unchangedRootFocusUseCount=0;
for(const itemId of Object.keys(catalogs)){
 const cat=catalogs[itemId];
 for(const region of cat.regions){
  if(region.book==='PHB'&&region.printedPage===36||region.book==='PHB'&&region.printedPage===38&&region.role==='note'||region.book==='UA'&&region.printedPage===28){
   const match=rootAcceptedUses.find(entry=>entry.collection==='rules'&&entry.itemId===itemId&&entry.regionId===region.id);
   if(match){
    const hashes=regionHashes(region);
    assert(match.imageSha256===region.sha256,'Previously reviewed image changed');
    assert(match.focusSha256===hashes.focusSha256,'Previously reviewed focus changed');
    // V3 review workflow metadata changes content hashes; prior acceptance remains evidence for the V2 object only.
    unchangedRootFocusUseCount++;
   }
  }
 }
}

const leafDiffInputs=[
 ['records','rules-records-candidate-corrected.json',v2Records,records],
 ['phbCatalog','catalogs/rules-phb-hurled-weapons-and-missiles-table.json',v2Catalogs['phb-hurled-weapons-and-missiles-table'],catalogs['phb-hurled-weapons-and-missiles-table']],
 ['uaCatalog','catalogs/rules-ua-hurled-weapons-and-missiles-table.json',v2Catalogs['ua-hurled-weapons-and-missiles-table'],catalogs['ua-hurled-weapons-and-missiles-table']],
];
function collectLeafDiff(before,after,base=''){
 if(isDeepStrictEqual(before,after))return [];
 if(Array.isArray(before)&&Array.isArray(after)){
  const out=[];for(let i=0;i<Math.max(before.length,after.length);i++){const p=`${base}/${i}`;if(i>=before.length)out.push({path:p,before:{missing:true},after:after[i]});else if(i>=after.length)out.push({path:p,before:before[i],after:{missing:true}});else out.push(...collectLeafDiff(before[i],after[i],p));}return out;
 }
 if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)){
  const out=[];for(const key of [...new Set([...Object.keys(before),...Object.keys(after)])].sort()){const p=`${base}/${key.replaceAll('~','~0').replaceAll('/','~1')}`;if(!(key in before))out.push({path:p,before:{missing:true},after:after[key]});else if(!(key in after))out.push({path:p,before:before[key],after:{missing:true}});else out.push(...collectLeafDiff(before[key],after[key],p));}return out;
 }
 return [{path:base||'/',before,after}];
}
const changeRows=Object.fromEntries(leafDiffInputs.map(([key,,before,after])=>[key,collectLeafDiff(before,after)]));
const diff={schemaVersion:1,artifactType:'exact-leaf-diff-from-frozen-v2-to-v3',status:'Deterministically generated from exact V2 inputs and V3 output objects; no V2 file is edited.',v2Inputs:Object.fromEntries(Object.entries(expectedV2).map(([name,sha256])=>[name,{path:`${V2}/${name}`,sha256}])),changes:changeRows,counts:Object.fromEntries([...Object.entries(changeRows).map(([k,v])=>[k,v.length]),['total',Object.values(changeRows).reduce((n,rows)=>n+rows.length,0)]])};
writeJson('exact-leaf-diff-v2-to-v3.json',diff);

const readme=`# Missile table production metadata successor V3\n\nThis package is a research-only successor to the frozen V2 candidate. It changes the two complete table-context roles from \`context\` to \`table\`, cleans stale workflow descriptions on the reviewed PHB p.38 / UA p.28 candidate regions, refreshes derived region-evidence content hashes, and binds two proposed whole-lookup/default reviews to complete ordered page groups.\n\nIt does not activate \`sourceExcerpts\`, edit the active review ledger, alter compiled data, source images, row values, source text, focus rectangles, IDs, or unresolved field/source-value status. The 555 literal cells, all 50 field-target-pending bindings, and all 50 \`not-assessed-by-field-target-review\` source-value statuses remain unchanged.\n\nRun \`node research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v3/build-candidate.mjs\` to reproduce the files. Run \`node research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v3/validate-candidate.mjs\` for the focused structural and preservation checks.\n\nThe exact leaf diff from frozen V2 is in \`exact-leaf-diff-v2-to-v3.json\`; the complete page-group/default hashes and unapproved review proposals are in \`whole-lookup-review-proposals.json\`. Root final review of these exact V3 objects remains required.\n`;
writeFileSync(path.join(here,'README.md'),readme);

const manifest={schemaVersion:1,artifactType:'missile-table-production-metadata-v3-manifest',status:'research-only exact candidate; no activation/assembly/source grade',inputs:{frozenV2:Object.fromEntries(Object.entries(inputV2).map(([key,rel])=>[key,{path:rel,sha256:sha(fileBytes(rel))}])),rootV2FocusAcceptance:{path:ROOT_RECEIPT,sha256:sha(fileBytes(ROOT_RECEIPT))},independentV2FocusReview:{path:INDEPENDENT_RECEIPT,sha256:sha(fileBytes(INDEPENDENT_RECEIPT))},rootSourceCellReview:{path:ROOT_CELL_REVIEW,sha256:sha(fileBytes(ROOT_CELL_REVIEW))},rootPriorFocusAcceptance:{path:ROOT_PRIOR_FOCUS,sha256:sha(fileBytes(ROOT_PRIOR_FOCUS))}},counts:{catalogs:2,records:2,PHB38rowRegions:15,PHB38noteRegions:2,UA28rowRegions:24,UA28noteRegions:2,UA28footnoteRegions:1,roleChanges:2,fullPageGroups:2,literalCellsUnchanged:literalCellCount,sourceValueStatusPreserved:50,fieldTargetStatusPreserved:50,updatedEvidenceBindingContentHashes:contentHashUpdates,evidenceBindingWorkflowMetadataUpdates:bindingMetadataUpdates,priorFocusUseRegionsFound:unchangedRootFocusUseCount},pageGroups:finalGroups,contentHashes:Object.fromEntries(Object.entries(catalogs).map(([itemId,catalog])=>[itemId,catalog.regions.filter(region=>reviewedRegionIds.has(region.id)).map(region=>({regionId:region.id,role:region.role,imageSha256:region.sha256,...regionHashes(region)}))])),preservation:{literalCellCount,allLiteralRowsUnchanged:true,allSourceNoteAndFootnoteTextUnchanged:true,allSourceValueStatusesNotAssessed:true,allFieldTargetStatusesPending:true,explicitTableContextIdsUnchanged:true,PHB36RegionObjectsUnchanged:true,allV2PagesAndRegionsRetained:true,activeDataAndLedgersUnchanged:true},validation:{validateScanCatalog:validation,sourceImageBytesMatched:true,regionEvidenceHashesMatched:true,deepValueAndInterpretationComparison:true,defaultSelection:{PHB38:groups[0].defaultRegionId,UA28:groups[1].defaultRegionId},wholeLookupReviews:'Proposed only; exact final hashes are pinned, but no root approval or active review status is claimed.'},rootFinalV3Review:{status:'pending',note:'Root must review these exact V3 catalog, region-content, and complete ordered default-group hashes before any authored activation or source-grade promotion.'},outputs:[]};
for(const filename of ['catalogs/rules-phb-hurled-weapons-and-missiles-table.json','catalogs/rules-ua-hurled-weapons-and-missiles-table.json','rules-records-candidate-corrected.json','whole-lookup-review-proposals.json','exact-leaf-diff-v2-to-v3.json','production-metadata-proposal.json','README.md']){
 const rel=`${OUT_REL}/${filename}`,b=readFileSync(path.join(here,filename));manifest.outputs.push({path:rel,size:b.length,sha256:sha(b)});
}
manifest.implementationFiles=['build-candidate.mjs','validate-candidate.mjs'].map(filename=>({path:`${OUT_REL}/${filename}`,size:readFileSync(path.join(here,filename)).length,sha256:sha(readFileSync(path.join(here,filename)))}));
writeJson('production-metadata-manifest.json',manifest);
console.log(JSON.stringify({output:OUT_REL,manifestSha256:sha(readFileSync(path.join(here,'production-metadata-manifest.json'))),counts:manifest.counts,pageGroups:groups.map(g=>({itemId:g.itemId,defaultRegionId:g.defaultRegionId,regionCount:g.regionCount,defaultOrderSha256:g.defaultOrderSha256})),validation},null,2));
