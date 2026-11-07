import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildVisualCoverage,regionHashes,renderMarkdown} from '../tools/source-visual-coverage.mjs';
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
 assert.deepEqual(x.usages.map(u=>u.status.highlight),['suspected','unreviewed','suspected']);assert.equal(x.counts.default.total,2);assert.equal(x.byCategory.progressionExplainer.crop.unreviewed,1);assert.match(renderMarkdown(x),/progression-explainer/);
});
test('review must match image, focus, content, and independent evidence; full bounds need exception',()=>{
 const confirmed={status:'confirmed',independent:true,evidence:'Independent visual review'};
 const exception={status:'exception',independent:true,evidence:'The complete image is the relevant passage'};
 assert.equal(build([review(r1,{highlight:confirmed})]).usages[0].status.highlight,'suspected');
 assert.equal(build([review(r1,{highlight:exception})]).usages[0].status.highlight,'exception');
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
