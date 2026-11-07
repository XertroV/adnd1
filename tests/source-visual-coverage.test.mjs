import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildVisualCoverage,regionHashes,renderMarkdown,renderPriceInventoryMarkdown,summarizePriceInventory} from '../tools/source-visual-coverage.mjs';
import {buildDispositionManifest,renderDispositionMarkdown,validateDispositionManifest,stableDispositionId} from '../tools/source-visual-dispositions.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const region=(id,focusRects)=>({id,book:'PHB',printedPage:35,pdfPage:36,image:id+'.png',sha256:hash(id),focusRects,title:id});
const item={id:'fixture',book:'PHB',pages:[35],sourceExcerpts:{catalog:'fixture.json'}};
const explainer={book:'PHB',pages:[32],sourceExcerpts:{catalog:'explainer.json'}};
const data={equipment:[item],progressionExplainer:explainer};
const r1=region('full',[[0,0,1,1]]),r2=region('partial',[[.2,.2,.3,.1]]),r3={...region('explainer',[[0,0,1,1]]),printedPage:32,pdfPage:33};
const cats={'fixture.json':{regions:[r1,r2],sources:{PHB:{sha256:'source'}}},'explainer.json':{regions:[r3],sources:{PHB:{sha256:'source'}}}};
const build=(reviews=[])=>buildVisualCoverage(data,p=>cats[p],{reviews},null,{loadImage:(_,image)=>Buffer.from(image.replace(/\.png$/, ''))});
const review=(r,assessments)=>({collection:'equipment',itemId:'fixture',binding:'sourceExcerpts',regionId:r.id,imageSha256:r.sha256,sourceSha256:'source',...regionHashes(r),assessments});
test('unreviewed sentinels are suspected, partials unreviewed, and denominators include the explainer',()=>{
 const x=build();assert.equal(x.totals.citedRecordPagePairs,2);assert.equal(x.totals.regionUsages,3);assert.equal(x.totals.uniqueImages,3);
 assert.equal(x.totals.fullImageSentinelBindings,2);assert.equal(x.totals.sentinelHighlightSuspects,2);assert.equal(x.totals.sentinelIndependentExceptions,0);
 assert.deepEqual(x.usages.map(u=>u.status.highlight),['suspected','unreviewed','suspected']);assert.equal(x.counts.default.total,2);assert.equal(x.byCategory.progressionExplainer.crop.unreviewed,1);assert.match(renderMarkdown(x),/progression-explainer/);
});
test('review must match image, focus, content, and independent evidence; full bounds need exception',()=>{
 const confirmed={status:'confirmed',independent:true,evidence:'Independent visual review'};
 const exception={status:'exception',independent:true,evidence:'The complete image is the relevant passage'};
 assert.equal(build([review(r1,{highlight:confirmed})]).usages[0].status.highlight,'suspected');
 assert.equal(build([review(r1,{highlight:exception})]).usages[0].status.highlight,'exception');
 const excepted=buildVisualCoverage(data,p=>cats[p],{reviews:[review(r1,{highlight:exception})]},null,{loadImage:(_,image)=>Buffer.from(image.replace(/\.png$/,''))});
 assert.equal(excepted.totals.fullImageSentinelBindings,2);assert.equal(excepted.totals.sentinelHighlightSuspects,1);assert.equal(excepted.totals.sentinelIndependentExceptions,1);
 assert.equal(excepted.usages[0].sentinelPolicyStatus,'historical-exception-needs-scope-review');
 assert.equal(excepted.sentinelPolicy.currentExactExceptionsNeedingScopeReview,1);
 assert.equal(excepted.sentinelPolicy.historicalExceptionsNeedingScopeReview,1);
 assert.equal(excepted.sentinelPolicy.explicitWholeSpellExceptions,0);
 const rr=review(r2,{highlight:confirmed,crop:{status:'defect',independent:true,evidence:'Cropped text'}});
 let result=build([rr]);assert.equal(result.usages[1].status.highlight,'confirmed');assert.equal(result.usages[1].status.crop,'defect');
 for(const k of ['imageSha256','sourceSha256','focusSha256','contentSha256']){result=build([{...rr,[k]:'stale'}]);assert.equal(result.usages[1].status.highlight,'unreviewed');assert.equal(result.usages[1].reviewStale,true);}
 assert.equal(build([review(r2,{highlight:{status:'confirmed',evidence:'No independent review'}})]).usages[1].status.highlight,'unreviewed');
});
test('geometry produces only a candidate when data, catalog, source and image hashes agree',async()=>{
 const {createHash}=await import('node:crypto');const digest=x=>createHash('sha256').update(x).digest('hex'),bytes=Buffer.from('synthetic image');
 const r={...region('geo',[[.1,.2,.3,.4]]),sha256:digest(bytes)},cat={regions:[r],sources:{PHB:{sha256:'pdfhash'}}},d={equipment:[item]},catalogHash='cataloghash',dataHash=digest(JSON.stringify(d));
 const u={collection:'equipment',itemId:'fixture',binding:'sourceExcerpts',regionId:'geo',imageSha256:r.sha256,sourceHashMatches:true,imageHashMatches:true};
 const geometry={inputDataSha256:dataHash,catalogSha256:{'fixture.json':catalogHash},sourcePdfSha256:{PHB:'pdfhash'},usages:[u],candidates:[{imageSha256:r.sha256,usages:[u]}]};
 const loader=()=>({catalog:cat,sha256:catalogHash}),options={loadImage:()=>bytes};
 assert.equal(buildVisualCoverage(d,loader,{reviews:[]},geometry,options).usages[0].status.crop,'suspected');
 assert.equal(buildVisualCoverage(d,loader,{reviews:[]},geometry,{loadImage:()=>Buffer.from('changed')}).usages[0].status.crop,'unreviewed');
 assert.equal(buildVisualCoverage(d,loader,{reviews:[]},{...geometry,sourcePdfSha256:{PHB:'different'}},options).usages[0].status.crop,'unreviewed');
 const unchanged=buildVisualCoverage(d,loader,{reviews:[]},{...geometry,inputDataSha256:'stale'},options);assert.equal(unchanged.usages[0].status.crop,'suspected');assert.equal(unchanged.geometrySnapshotDataMatches,false);
 const stale=buildVisualCoverage(d,loader,{reviews:[]},{...geometry,catalogSha256:{'fixture.json':'stale'}},options);assert.equal(stale.usages[0].status.crop,'unreviewed');assert.equal(stale.usages[0].geometryStaleCandidate,true);
});
test('default verdicts bind ordered page group, and image-byte changes stale all review dimensions',()=>{
 const base=build(),first=base.usages[0];const saved={...review(r1,{default:{status:'confirmed',independent:true,evidence:'Default row independently reviewed'}}),defaultOrderSha256:first.defaultOrderSha256};
 assert.equal(build([saved]).usages[0].status.default,'confirmed');
 const reordered={'fixture.json':{...cats['fixture.json'],regions:[{...r1,role:'context'},r2]},'explainer.json':cats['explainer.json']};
 const changed=buildVisualCoverage(data,p=>reordered[p],{reviews:[saved]},null,{loadImage:(_,image)=>Buffer.from(image.replace(/\.png$/,''))});
 assert.equal(changed.usages.find(x=>x.regionId==='partial').status.default,'unreviewed');
 const missing=buildVisualCoverage(data,p=>cats[p],{reviews:[saved]},null,{loadImage:()=>Buffer.from('different')});assert.equal(missing.usages[0].status.default,'unreviewed');assert.equal(missing.usages[0].reviewStale,true);
});
test('reported triage findings match current image bytes, book and page without changing review status',()=>{
 const finding={candidateId:'issue',origin:'research/example.json',status:'confirmed-defect',reason:'Clipped edge',source:{book:'PHB',printedPage:35,sha256:'source'},imageSha256:r2.sha256};
 const opts={knownFindings:[finding],loadImage:(_,image)=>Buffer.from(image.replace(/\.png$/, ''))};
 const report=buildVisualCoverage(data,p=>cats[p],{reviews:[]},null,opts);
 assert.equal(report.totals.reportedFindings,1);assert.equal(report.reportedFindings[0].bindings[0].regionId,'partial');
 assert.equal(report.usages[1].status.crop,'unreviewed');assert.equal(report.counts.crop.defect,0);
 assert.match(renderMarkdown(report),/Clipped edge/);assert.match(renderMarkdown(report),/research\/example.json/);
 for(const changed of [{imageSha256:hash('old')},{source:{book:'PHB',printedPage:36}},{source:{book:'UA',printedPage:35}},{source:{book:'PHB',printedPage:35,sha256:'old'}},{status:'valid-context'}]){
  const x=buildVisualCoverage(data,p=>cats[p],{reviews:[]},null,{...opts,knownFindings:[{...finding,...changed}]});assert.equal(x.reportedFindings.length,0);
 }
 assert.equal(buildVisualCoverage(data,p=>cats[p],{reviews:[]},null,{...opts,loadImage:()=>Buffer.from('changed')}).reportedFindings.length,0);
});
test('pending findings respect exact bindings and generic unreviewed candidates are not defects',()=>{
 const binding={collection:'equipment',itemId:'fixture',binding:'sourceExcerpts',regionId:'partial',catalog:'fixture.json'};
 const pending={candidateId:'pending',category:'viewport-framing',status:'pending-defect',book:'PHB',printedPage:35,imageSha256:r2.sha256,usages:[binding]};
 const opts={knownFindings:[pending,{...pending,candidateId:'ordinary',status:'unreviewed'}],loadImage:(_,image)=>Buffer.from(image.replace(/\.png$/, ''))};
 const report=buildVisualCoverage(data,p=>cats[p],{reviews:[]},null,opts);
 assert.equal(report.reportedFindings.length,1);assert.equal(report.reportedFindings[0].status,'pending-defect');assert.equal(report.reportedFindings[0].category,'viewport-framing');assert.equal(report.counts.crop.defect,0);
 assert.equal(buildVisualCoverage(data,p=>cats[p],{reviews:[]},null,{...opts,knownFindings:[{...pending,usages:[{...binding,itemId:'other'}]}]}).reportedFindings.length,0);
});
test('orphaned review keys remain visible without modifying the ledger',()=>{
 const orphan=review(r2,{crop:{status:'confirmed',independent:true,evidence:'review'}});orphan.collection='equipmnt';const ledger={reviews:[orphan]};
 const report=buildVisualCoverage(data,p=>cats[p],ledger,null,{loadImage:(_,image)=>Buffer.from(image.replace(/\.png$/, ''))});
 assert.equal(report.totals.orphanedReviews,1);assert.equal(report.orphanedReviews[0].collection,'equipmnt');assert.equal(ledger.reviews.length,1);assert.match(renderMarkdown(report),/equipmnt:fixture/);assert.equal(report.usages[1].status.crop,'unreviewed');
});

test('contextual adequacy requires its own manual evidence, independent of crop and highlight reviews',()=>{
 const approved={status:'confirmed',independent:true,evidence:'Complete relevant table with headings, units and notes visually checked'};
 const onlyLegible=build([review(r2,{crop:approved,highlight:approved})]);assert.equal(onlyLegible.usages[1].status.context,'unreviewed');assert.equal(onlyLegible.counts.context.total,3);
 const contextual=review(r2,{context:approved});assert.equal(build([contextual]).usages[1].status.context,'confirmed');
 assert.equal(build([{...contextual,imageSha256:'different'}]).usages[1].status.context,'unreviewed');
 assert.match(renderMarkdown(onlyLegible),/context unreviewed/);
});

test('sentinel policy requires structured whole-spell scope and preserves separate field-focus work',()=>{
 const scoped={...review(r1,{highlight:{status:'exception',independent:true,evidence:'Whole spell is intentionally unmarked.',scope:'whole-spell',kind:'whole-spell-unmarked'}})};
 const inventory={fieldEvidenceBindings:[
  {collection:'equipment',itemId:'fixture',fieldPointer:'/price',catalog:'fixture.json',regionIds:['full'],reviewStatus:'source-row-value-verified-region-pending'},
  {collection:'equipment',itemId:'fixture',fieldPointer:'/fields/armor',catalog:'fixture.json',regionIds:['partial'],reviewStatus:'field-target-reviewed'},
  {collection:'equipment',itemId:'fixture',fieldPointer:'/fields/Armor class without shield',sourceObjectPointer:'/fieldSources/Armor class without shield',catalog:'fixture.json',regionIds:[],reviewStatus:'field-target-pending',valuePathStatus:'value-path-missing'},
 ]};
 const report=buildVisualCoverage(data,p=>cats[p],{reviews:[scoped]},null,{loadImage:(_,image)=>Buffer.from(image.replace(/\.png$/,'')),priceInventory:inventory});
 assert.equal(report.usages[0].status.highlight,'exception');
 assert.equal(report.usages[0].sentinelPolicyStatus,'explicit-whole-spell-unmarked-exception');
 assert.equal(report.sentinelPolicy.rawFullImageSentinelBindings,2);
 assert.equal(report.sentinelPolicy.explicitWholeSpellExceptions,1);
 assert.equal(report.sentinelPolicy.unresolvedHighlightWarnings,1);
 assert.equal(report.sentinelPolicy.historicalExceptionsWithExplicitWholeSpellScope,1);
 assert.equal(report.sentinelPolicy.historicalExceptionsNeedingScopeReview,0);
 assert.equal(report.sentinelPolicy.factFocus.fieldEvidenceBindingDenominator,3);
 assert.equal(report.sentinelPolicy.factFocus.factFocusPending,2);
 assert.equal(report.sentinelPolicy.factFocus.valuePathsMissing,1);
 assert.equal(report.sentinelPolicy.factFocus.sentinelLinkedFieldBindingDenominator,1);
 assert.equal(report.sentinelPolicy.factFocus.sentinelLinkedFactFocusPending,1);
 const dispositions=buildDispositionManifest(report);
 assert.equal(dispositions.structuralValidation.valid,true,dispositions.structuralValidation.errors.join('; '));
 assert.ok(dispositions.currentDispositions.find(item=>item.identity.regionId==='full').attentionDimensions.includes('sentinel-highlight-review')===false);
 assert.equal(dispositions.currentDispositions.find(item=>item.identity.regionId==='full').sentinelPolicyStatus,'explicit-whole-spell-unmarked-exception');
 assert.match(renderMarkdown(report),/Fact-focus pending \| 2/);assert.match(renderMarkdown(report),/Field value paths missing \| 1/);
 assert.match(renderDispositionMarkdown(dispositions),/Historical exceptions needing scope review: \*\*0 \/ 1\*\*/);
});

test('whole-spell exception does not clear a mixed full-image and precise-focus region',()=>{
 const mixedRegion=region('mixed-focus',[[0,0,1,1],[.2,.2,.1,.1]]);
 const mixedCatalog={regions:[mixedRegion],sources:{PHB:{sha256:'source'}}};
 const scopedReview=review(mixedRegion,{highlight:{status:'exception',independent:true,evidence:'Whole spell is intentionally unmarked.',scope:'whole-spell',kind:'whole-spell-unmarked'}});
 const report=buildVisualCoverage(
  {equipment:[{...item,sourceExcerpts:{catalog:'mixed-focus.json'}}]},
  ()=>({catalog:mixedCatalog,sha256:'catalog'}),
  {reviews:[scopedReview]},
  null,
  {loadImage:()=>Buffer.from('mixed-focus')},
 );
 const usage=report.usages[0];
 assert.equal(usage.sentinel,true);
 assert.equal(usage.focusRects.length,2);
 assert.equal(usage.reviewGate.applied,true,'the review is hash-exact but its whole-spell scope cannot waive a region with a separate precise focus');
 assert.equal(usage.status.highlight,'suspected');
 assert.equal(usage.sentinelPolicyStatus,'mixed-focus-sentinel-review-required');
 assert.equal(report.sentinelPolicy.rawFullImageSentinelBindings,1);
 assert.equal(report.sentinelPolicy.mixedFocusSentinelBindings,1);
 assert.equal(report.sentinelPolicy.mixedFocusSentinelExceptionsRejected,1);
 assert.equal(report.sentinelPolicy.explicitWholeSpellExceptions,0);
 assert.equal(report.sentinelPolicy.unresolvedHighlightWarnings,1);
 assert.equal(report.sentinelPolicy.unreviewedOrSuspectedSentinels,1);
 assert.equal(report.totals.sentinelIndependentExceptions,0);
 const dispositions=buildDispositionManifest(report);
 const disposition=dispositions.currentDispositions[0];
 assert.ok(disposition.attentionDimensions.includes('sentinel-highlight-review'));
 assert.equal(disposition.sentinelPolicyStatus,'mixed-focus-sentinel-review-required');
 assert.equal(disposition.status.highlight,'suspected');
 assert.equal(dispositions.structuralValidation.valid,true,dispositions.structuralValidation.errors.join('; '));
 assert.match(renderMarkdown(report),/Mixed-focus sentinel bindings \| 1/);
 assert.match(renderDispositionMarkdown(dispositions),/mixed-focus-sentinel-review-required/);

 const reviewedDefect=review(mixedRegion,{highlight:{status:'defect',independent:true,evidence:'The mixed region improperly combines page-wide and item-specific focus.'}});
 const defectReport=buildVisualCoverage(
  {equipment:[{...item,sourceExcerpts:{catalog:'mixed-focus.json'}}]},
  ()=>({catalog:mixedCatalog,sha256:'catalog'}),
  {reviews:[reviewedDefect]},
  null,
  {loadImage:()=>Buffer.from('mixed-focus')},
 );
 assert.equal(defectReport.usages[0].status.highlight,'defect');
 assert.equal(defectReport.counts.highlight.defect,1);
 assert.equal(defectReport.usages[0].sentinelPolicyStatus,'mixed-focus-sentinel-review-required');
 const defectDispositions=buildDispositionManifest(defectReport);
 assert.equal(defectDispositions.structuralValidation.valid,true,defectDispositions.structuralValidation.errors.join('; '));
 assert.ok(defectDispositions.currentDispositions[0].attentionDimensions.includes('sentinel-highlight-review'));
});

test('zero-focus regions remain visible and unresolved without being counted as whole-image sentinels',()=>{
 const emptyRegion=region('empty-focus',[]);
 const catalog={regions:[emptyRegion],sources:{PHB:{sha256:'source'}}};
 const report=buildVisualCoverage(
  {equipment:[{...item,sourceExcerpts:{catalog:'empty-focus.json'}}]},
  ()=>({catalog,sha256:'catalog'}),
  {reviews:[]},
  null,
  {loadImage:()=>Buffer.from('empty-focus')},
 );
 const usage=report.usages[0];
 assert.deepEqual(usage.focusRects,[]);
 assert.equal(usage.sentinel,false);
 assert.equal(usage.status.highlight,'unreviewed');
 assert.equal(usage.sentinelPolicyStatus,'not-applicable');
 assert.equal(report.counts.highlight.unreviewed,1);
 assert.equal(report.sentinelPolicy.rawFullImageSentinelBindings,0);
 assert.equal(report.sentinelPolicy.explicitWholeSpellExceptions,0);
 assert.match(renderMarkdown(report),/highlight unreviewed/);
});

test('all historical records receive hash-bound dispositions even when stale or identity-incomplete',()=>{
 const knownFindings=[
  {origin:'research/triage-a.json',originSha256:hash('triage-a'),recordIndex:0,sourceSha256:'source',record:{candidateId:'same-image',status:'valid-context',book:'PHB',printedPage:35,imageSha256:r2.sha256,reason:'Checked source image.',usages:[{collection:'equipment',itemId:'fixture',binding:'sourceExcerpts',regionId:'partial',catalog:'fixture.json'}]}},
  {origin:'research/triage-b.json',originSha256:hash('triage-b'),recordIndex:0,record:{candidateId:'missing-source-sha',status:'pending-defect',book:'PHB',printedPage:35,imageSha256:r2.sha256,reason:'Reported viewport issue.',usages:[{collection:'equipment',itemId:'fixture',binding:'sourceExcerpts',regionId:'partial',catalog:'fixture.json'}]}},
  {origin:'research/triage-c.json',originSha256:hash('triage-c'),recordIndex:0,sourceSha256:'stale-source',record:{candidateId:'old-source',status:'fixed',book:'PHB',printedPage:35,imageSha256:r2.sha256,reason:'Old source identity.',usages:[{collection:'equipment',itemId:'fixture',binding:'sourceExcerpts',regionId:'partial',catalog:'fixture.json'}]}},
  {origin:'research/triage-d.json',originSha256:hash('triage-d'),recordIndex:1,record:{candidateId:'unmatched',status:'open',reason:'No current page identity.'}},
 ];
 const report=buildVisualCoverage(data,p=>cats[p],{reviews:[]},null,{loadImage:(_,image)=>Buffer.from(image.replace(/\.png$/,'')),knownFindings});
 assert.equal(report.findingDispositions.length,4);
 assert.deepEqual(report.findingDispositions.map(f=>f.relation),['current-binding','current-image-match-source-hash-missing','binding-present-evidence-changed','identity-incomplete']);
 assert.equal(report.findingDispositions[0].recordedStatus,'valid-context');
 assert.equal(report.findingDispositions[0].matches[0].regionId,'partial');
 assert.equal(report.findingDispositions[1].matches[0].regionId,'partial');
 assert.equal(report.findingDispositions[2].candidateBindings[0].regionId,'partial');
 assert.equal(report.totals.historicalFindingCurrentHashMatches,1);
 assert.equal(report.reportedFindings.length,1);
 const dispositions=buildDispositionManifest(report);
 assert.equal(dispositions.structuralValidation.valid,true,dispositions.structuralValidation.errors.join('; '));
 assert.equal(validateDispositionManifest(dispositions,report).length,0);
 assert.equal(dispositions.historicalFindings.length,4);
 assert.equal(dispositions.currentDispositions.some(item=>item.sentinel&&item.status.highlight==='suspected'),true);
 assert.match(renderDispositionMarkdown(dispositions),/source-hash-missing/);
 const damaged={...dispositions,historicalFindings:dispositions.historicalFindings.slice(1)};
 assert.ok(validateDispositionManifest(damaged,report).some(message=>message.includes('dropped or changed')));
 assert.notEqual(stableDispositionId({candidate:'a',sha256:'one'}),stableDispositionId({candidate:'a',sha256:'two'}));
 assert.match(renderMarkdown(report),/Reported viewport issue\./);
});

test('source price inventory keeps separate table-row and site-claim denominators',()=>{
 const inventory={schemaVersion:1,scope:'Three named source tables; discoveries are incomplete.',sourceInventories:[
  {id:'ua26',category:'UA equipment',denominator:[{kind:'source-table-row',count:2}],rowCount:2,sourceRows:[{reviewStatus:{final:'region-verified'}},{reviewStatus:{final:'unmatched-source-row'}}]},
  {id:'dmg28',category:'DMG rates',denominator:[{kind:'source-occupation-row',count:1},{kind:'printed-rate-cell',count:2}],rowCount:1,sourceRows:[{reviewStatus:{final:'source-excerpt-only'}}]},
 ],siteClaims:[
  {reviewStatus:'region-verified',printedPrice:{amount:2,currency:'gp',evidenceBindings:[{reviewStatus:'field-target-reviewed',sourceValueStatus:'source-value-independently-confirmed'}]}},
  {reviewStatus:'editorial-estimate',estimate:{value:{amount:5,currency:'sp'}}},
  {reviewStatus:'unextracted-gap'},
 ],fieldEvidenceBindings:[{collection:'equipment',reviewStatus:'region-verified'},{collection:'rules',reviewStatus:'source-excerpt-only'}],sourcePageDiscovery:{books:[{candidatePages:[1]},{candidatePages:2,candidates:[{},{}]}]},counts:{siteEquipmentObjects:3,sitePrintedPrices:1,sitePriceGaps:2,editorialEstimates:1}};
 assert.deepEqual(summarizePriceInventory(inventory),{schemaVersion:1,scope:inventory.scope,sourceInventories:[
  {id:'ua26',category:'UA equipment',denominators:[{kind:'source-table-row',count:2}],rowCount:2,statuses:{'region-verified':1,'unmatched-source-row':1},sourceFiles:[]},
  {id:'dmg28',category:'DMG rates',denominators:[{kind:'source-occupation-row',count:1},{kind:'printed-rate-cell',count:2}],rowCount:1,statuses:{'source-excerpt-only':1},sourceFiles:[]},
 ],sourceRowCount:3,sourceTableDenominatorCount:2,sourcePageCensuses:[],pageCensusPageCount:0,siteClaimDenominator:3,siteClaimCount:3,siteClaimStates:{'region-verified':1,'editorial-estimate':1,'unextracted-gap':1},siteClaimTargetBindingDenominator:1,siteClaimTargetStatuses:{'field-target-reviewed':1},printedPriceEvidenceBindingDenominator:1,printedPriceSourceValueStatuses:{'source-value-independently-confirmed':1},estimateOverlap:{editorialEstimateCount:1,editorialEstimatesWithinPriceGapObjects:1,priceGapObjectDenominator:2},fieldEvidenceBindingCount:2,fieldEvidenceBindingStatuses:{'region-verified':1,'source-excerpt-only':1},fieldEvidenceBindingsByCollection:{equipment:{count:1,statuses:{'region-verified':1}},rules:{count:1,statuses:{'source-excerpt-only':1}}},discoveries:3,counts:{siteEquipmentObjects:3,sitePrintedPrices:1,sitePriceGaps:2,editorialEstimates:1},validation:null});
 const md=renderPriceInventoryMarkdown({...inventory,counts:{...inventory.counts,sitePrintedPrices:1,sitePriceGaps:1,editorialEstimates:1}});
 assert.match(md,/Three named source tables/);assert.match(md,/printed-rate-cell: 2/);assert.match(md,/region-verified/);assert.match(md,/— \(price gap\)/);assert.match(md,/Target review status \| Source-value status/);assert.match(md,/1 overlap price-gap objects; counts are not additive/);assert.match(md,/Site-claim target-evidence bindings: \*\*1\*\*/);
});

test('a reviewed target is not counted as a reviewed printed value',()=>{
 const inventory={schemaVersion:1,sourceInventories:[],siteClaims:[
  {itemId:'target-only',reviewStatus:'field-target-reviewed',printedPrice:{amount:2,currency:'gp',evidenceBindings:[{reviewStatus:'field-target-reviewed'}]}},
  {itemId:'value-reviewed',reviewStatus:'field-target-reviewed',printedPrice:{amount:3,currency:'gp',evidenceBindings:[{reviewStatus:'field-target-reviewed',sourceValueStatus:'source-value-independently-confirmed'}]}},
  {itemId:'estimated-gap',reviewStatus:'unextracted-gap',estimate:{value:{amount:5,currency:'sp'}},evidenceBindings:[{fieldPointer:'/suggestedPrice/comparisons/0',reviewStatus:'field-target-reviewed',sourceValueStatus:'source-value-independently-confirmed'}]},
 ],fieldEvidenceBindings:[],counts:{siteEquipmentObjects:3,sitePrintedPrices:2,sitePriceGaps:1,editorialEstimates:1}};
 const summary=summarizePriceInventory(inventory);
 assert.deepEqual(summary.siteClaimStates,{'field-target-reviewed':2,'unextracted-gap':1});
 assert.deepEqual(summary.siteClaimTargetStatuses,{'field-target-reviewed':2});
 assert.equal(summary.siteClaimTargetBindingDenominator,2);
 assert.equal(summary.printedPriceEvidenceBindingDenominator,2);
 assert.deepEqual(summary.printedPriceSourceValueStatuses,{'no-independent-source-value-status':1,'source-value-independently-confirmed':1});
 assert.deepEqual(summary.estimateOverlap,{editorialEstimateCount:1,editorialEstimatesWithinPriceGapObjects:1,priceGapObjectDenominator:1});
 const markdown=renderPriceInventoryMarkdown(inventory);
 assert.match(markdown,/Site claim states \(3 site objects\): field-target-reviewed: 2; unextracted-gap: 1/);
 assert.match(markdown,/Site-claim target-evidence bindings: \*\*2\*\*; target-review statuses: field-target-reviewed: 2/);
 assert.match(markdown,/Printed-price evidence-binding denominator: \*\*2\*\*; source-value statuses: no-independent-source-value-status: 1; source-value-independently-confirmed: 1/);
 assert.match(markdown,/Target review status \| Source-value status/);
 assert.match(markdown,/estimated-gap[\s\S]*no-target-binding[\s\S]*no-independent-source-value-status/);
});

test('source-page censuses preserve every page, independent page denominators, claims, and unresolved statuses',()=>{
 const inventory={schemaVersion:1,scope:'Bounded price inventory.',sourceInventories:[],siteClaims:[],fieldEvidenceBindings:[],sourcePageCensuses:[{
  id:'monster-book-fixture',sourceFiles:['Monster.pdf'],scope:'Text-screened candidate pages only; not a whole-book completeness claim.',
  denominator:[{kind:'PDF-page',count:4}],pageCensus:{denominator:{kind:'PDF-page',count:4},pages:[
   {book:'MM',pdfPage:1,printedPage:null,screened:true,textCharCount:0,textLayerStatus:'empty-image-only-or-unextractable',screenDisposition:'no-configured-cue-detected',visualReviewStatus:'not-visually-reviewed'},
   {book:'MM',pdfPage:2,printedPage:1,screened:true,textCharCount:200,textLayerStatus:'text-present',screenDisposition:'broad-text-candidate',screenCueCounts:{currencyToken:1},visualReviewStatus:'original-page-viewed'},
   {book:'MM',pdfPage:3,printedPage:2,screened:true,textCharCount:150,textLayerStatus:'text-present',screenDisposition:'broad-text-candidate',screenCueCounts:{gemLanguage:2},visualReviewStatus:'candidate-not-visually-reviewed'},
   {book:'MM',pdfPage:4,printedPage:3,screened:true,textCharCount:100,textLayerStatus:'text-present',screenDisposition:'no-configured-cue-detected',visualReviewStatus:'not-visually-reviewed'},
  ]},
  claims:[{sourceObjectOrPassage:'Beaver hide',claimType:'sale-price',amountOrFormula:'500–2,000',currency:'gp',unit:'each',sourcePages:[{book:'MM',printedPage:1,pdfPage:2}],sourceReviewStatus:'source-value-visually-confirmed'}],
  tableGroups:[],exclusions:[{sourceObjectOrPassage:'Treasure code',reason:'Not a price',reviewStatus:'confirmed-exclusion'}],
  unresolved:[{sourceObjectOrPassage:'Ambiguous nugget size',disposition:'Interpretation pending',reviewStatus:'original-page-viewed-ambiguous'}],sourceArtifact:{schemaVersion:1}
 }]};
 const summary=summarizePriceInventory(inventory);
 const census=summary.sourcePageCensuses[0];
 assert.equal(summary.pageCensusPageCount,4);assert.equal(census.pageDenominator,4);assert.equal(census.pages.length,4);
 assert.equal(census.screenedPageCount,4);assert.equal(census.candidatePageCount,2);assert.equal(census.candidatePagesVisuallyReviewed,1);assert.equal(census.candidatePagesUnreviewed,1);
 assert.equal(census.claimCount,1);assert.equal(census.exclusionCount,1);assert.equal(census.unresolvedCount,1);
 const markdown=renderPriceInventoryMarkdown(inventory);
 assert.match(markdown,/PDF-page denominator/);assert.match(markdown,/MM p\.1 \/ PDF 2/);assert.match(markdown,/candidate-not-visually-reviewed/);
 assert.match(markdown,/Source-page census/);assert.match(markdown,/not a whole-book completeness claim/);assert.match(markdown,/Ambiguous nugget size/);
});
