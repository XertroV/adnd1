import test from 'node:test';import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{checkRequiredContextExtent}from'../tools/monetary-context-extent-contract.mjs';
import{loadMonetaryRowIdentityAudit}from'../tools/monetary-row-identity-audit.mjs';
const contract=JSON.parse(readFileSync(new URL('../research/source-audit-batch5-phb29-assassination-context-required-extent-v2.json',import.meta.url))),before=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/monetary-source-phbdmg-179-before.json.gz',import.meta.url)))),metadata=before.review.evidenceCrops.find(c=>c.cropId===contract.oldActiveContext.cropId);
const evidence=m=>({status:'declared-context-crop-metadata-linked',sourceFrame:{book:'PHB',printedPage:29,pdfPage:30,sourcePdfSha256:contract.sourceFrame.sourcePdfSha256},crops:[{cropId:m.cropId,metadata:m}]});
test('actual glyph-clean old fee table crop fails the required GP-unit caption beyond word-edge detection',()=>{
 const r=checkRequiredContextExtent(evidence(metadata),contract);assert.equal(r.complete,false);assert.equal(r.semanticPass,false);assert.deepEqual(r.rectResults.map(r=>[r.id,r.coveredByCropIds.length>0]),[['gold-piece-unit-caption',false],['table-heading-columns-and-all15-rows',true],['complete-important-popular-noble-footnote',true]]);
 assert.equal(contract.oldActiveContext.contextWordBoundaryCandidates,0);assert.equal(contract.requiredRects.find(r=>r.id==='table-heading-columns-and-all15-rows').physicalLevelRowsIndependentlyInspected,15);
});
test('synthetic full containment is only a numeric positive control and grants no source approval',()=>{
 const m={...metadata,cropBoundsPixelsLTRB:[25,1025,1175,1600],cropDimensionsPx:[1150,575]},r=checkRequiredContextExtent(evidence(m),contract);assert.equal(r.complete,true);assert.equal(r.semanticPass,false);assert.equal(r.status,'required-context-extent-contained');
});
test('a similarly sized crop on another source page/render cannot satisfy a required source extent',()=>{
 const m={...metadata,cropBoundsPixelsLTRB:[25,1025,1175,1600],cropDimensionsPx:[1150,575]};
 const wrongPage=evidence(m);wrongPage.sourceFrame.pdfPage=31;assert.equal(checkRequiredContextExtent(wrongPage,contract).status,'source-frame-mismatch');
 assert.equal(checkRequiredContextExtent(evidence({...m,sourceRenderSha256:'0'.repeat(64)}),contract).complete,false);
 assert.equal(checkRequiredContextExtent(evidence({...m,cropDimensionsPx:[1,1]}),contract).status,'invalid-matching-source-crop-frame');
});
test('missing context, malformed rectangles, and lost footnotes cannot be waived by numerical area',()=>{
 assert.equal(checkRequiredContextExtent(null,contract).complete,false);assert.equal(checkRequiredContextExtent(evidence(metadata),{...contract,requiredRects:[]}).status,'invalid-required-context-contract');
 const m={...metadata,cropBoundsPixelsLTRB:[25,1025,1175,1470],cropDimensionsPx:[1150,445]},r=checkRequiredContextExtent(evidence(m),contract);assert.equal(r.complete,false);assert.equal(r.rectResults.find(r=>r.id==='complete-important-popular-noble-footnote').coveredByCropIds.length,0);
});

test('null entries, fractional raster bounds, and incomplete source frames return explicit invalid results',()=>{
 assert.equal(checkRequiredContextExtent(evidence(metadata),{...contract,requiredRects:[null]}).status,'invalid-required-context-contract');
 assert.equal(checkRequiredContextExtent(evidence(metadata),{...contract,sourceFrame:{...contract.sourceFrame,pdfPage:0}}).status,'invalid-required-context-contract');
 assert.equal(checkRequiredContextExtent(evidence(metadata),{...contract,sourceFrame:{...contract.sourceFrame,book:''}}).status,'invalid-required-context-contract');
 const m={...metadata,cropBoundsPixelsLTRB:[25.5,1025,1175,1600],cropDimensionsPx:[1149.5,575]};assert.equal(checkRequiredContextExtent(evidence(m),contract).status,'invalid-matching-source-crop-frame');
 const invalidList=evidence(metadata);invalidList.crops=[null];assert.equal(checkRequiredContextExtent(invalidList,contract).status,'invalid-context-crop-list');
});

const sourceRenderPageSpace='original source-render page pixels; top-left origin; [left,top,right,bottom] half-open';
const sourcePageGlobalSpace='source-page-global source-render pixels; top-left origin; [left,top,right,bottom] half-open';
const targetSource={book:contract.sourceFrame.book,printedPage:contract.sourceFrame.printedPage,pdfPage:contract.sourceFrame.pdfPage,sourcePdfSha256:contract.sourceFrame.sourcePdfSha256};
const otherSource={book:'DMG',printedPage:33,pdfPage:34,sourcePdfSha256:'b'.repeat(64)};
function orderedPart({partId,order,source,renderSha,dims=contract.sourceFrame.sourceRenderDimensionsPx,bounds=[0,0,...dims],cropId=`crop-${partId}`,role='context-part'}){
 const sourceRender={sourceRenderId:`render-${partId}`,sourceRenderSha256:renderSha,sourceRenderDimensionsPx:[...dims],renderDpi:150,coordinateSpace:sourceRenderPageSpace};
 const crop={sourcePdfSha256:source.sourcePdfSha256,sourceRenderSha256:renderSha,sourceRenderDimensionsPx:[...dims],cropBoundsPixelsLTRB:[...bounds],cropBoundsPixelsCoordinateSpace:sourcePageGlobalSpace,cropDimensionsPx:[bounds[2]-bounds[0],bounds[3]-bounds[1]],cropSha256:(String(order)).repeat(64).slice(0,64),renderDpi:150,coordinateSpace:sourcePageGlobalSpace};
 return {partId,order,role,cropId,source:{...source},sourceRender,crop};
}
function orderedEvidence(parts,{version='ordered-source-context-parts-v2',includeCropProjection=true,sourceFrame=otherSource}={}){
 const value={schemaVersion:1,fingerprintVersion:version,status:'declared-source-context-parts-linked',sourceFrame:{...sourceFrame},declaredLinks:parts.map((part,i)=>({field:`sourceContextParts/${i}`,cropId:part.cropId,order:part.order})),sourceContextParts:parts};
 if(includeCropProjection)value.crops=parts.map(part=>({cropId:part.cropId,order:part.order,role:part.role,metadata:part.crop,sourceRender:part.sourceRender}));
 return value;
}
const fullTargetPart=()=>orderedPart({partId:'expected-frame',order:2,source:targetSource,renderSha:contract.sourceFrame.sourceRenderSha256});
const fullOtherPart=()=>orderedPart({partId:'other-frame',order:1,source:otherSource,renderSha:'c'.repeat(64)});

test('ordered source-context parts v1 and v2 satisfy only their exact source/render frame',()=>{
 for(const version of ['ordered-source-context-parts-v1','ordered-source-context-parts-v2']){
  const parts=[fullOtherPart(),fullTargetPart()],value=orderedEvidence(parts,{version,includeCropProjection:version.endsWith('-v2')});
  const r=checkRequiredContextExtent(value,contract);assert.equal(r.complete,true,version);assert.equal(r.semanticPass,false);assert.deepEqual(r.rectResults.map(rect=>rect.coveredByCropIds),[['crop-expected-frame'],['crop-expected-frame'],['crop-expected-frame']]);
 }
});

test('well-formed other-page parts remain allowed but cannot cover expected-frame rectangles',()=>{
 const other=fullOtherPart(),value=orderedEvidence([other],{sourceFrame:otherSource});
 const r=checkRequiredContextExtent(value,contract);assert.equal(r.status,'required-context-extent-missing');assert.ok(r.rectResults.every(rect=>rect.coveredByCropIds.length===0));
 const malformed=structuredClone(value);malformed.sourceContextParts[0].crop.sourcePdfSha256='d'.repeat(64);malformed.crops[0].metadata.sourcePdfSha256='d'.repeat(64);
 assert.equal(checkRequiredContextExtent(malformed,contract).status,'invalid-ordered-context-part-list','foreign-page metadata must still be internally consistent');
});

test('ordered evidence rejects missing links, malformed matching crops, and a different render of the expected page',()=>{
 const value=orderedEvidence([fullOtherPart(),fullTargetPart()]);
 const missingLinks=structuredClone(value);missingLinks.declaredLinks.pop();assert.equal(checkRequiredContextExtent(missingLinks,contract).status,'invalid-ordered-context-part-list');
 const malformed=structuredClone(value);malformed.sourceContextParts[1].crop.cropSha256='bad';malformed.crops[1].metadata.cropSha256='bad';assert.equal(checkRequiredContextExtent(malformed,contract).status,'invalid-ordered-context-part-list');
 const wrongRenderPart=orderedPart({partId:'expected-frame',order:2,source:targetSource,renderSha:'e'.repeat(64)}),wrongRender=orderedEvidence([fullOtherPart(),wrongRenderPart]);
 assert.equal(checkRequiredContextExtent(wrongRender,contract).status,'invalid-matching-source-crop-frame');
});

test('separate crop fragments are not unioned to satisfy one required rectangle',()=>{
 const parts=[
  orderedPart({partId:'left-half',order:1,source:targetSource,renderSha:contract.sourceFrame.sourceRenderSha256,bounds:[0,0,600,100]}),
  orderedPart({partId:'right-half',order:2,source:targetSource,renderSha:contract.sourceFrame.sourceRenderSha256,bounds:[600,0,1201,100]})
 ];
 const oneRect={...contract,requiredRects:[{id:'spans-fragment-boundary',bounds:[500,10,700,90]}]};
 const r=checkRequiredContextExtent(orderedEvidence(parts),oneRect);assert.equal(r.complete,false);assert.equal(r.status,'required-context-extent-missing');assert.deepEqual(r.rectResults[0].coveredByCropIds,[]);
});

test('all 28 frozen extent-contract rows retain their positives and resolve the six ordered sage rows',()=>{
 const registration=JSON.parse(readFileSync(new URL('../research/source-audit-batch5-final-registration-before-denominators.json',import.meta.url)));
 const contracts=registration.requiredContextExtent.contracts;
 const sage=contracts.find(item=>item.findingId==='sage-six-left-table-right-note-context-dependencies');assert.ok(sage);assert.equal(sage.recordUids.length,6);
 const current=loadMonetaryRowIdentityAudit({findingsPath:null,baselinePath:null,reviewsPath:null});
 const byUid=new Map(current.records.map(record=>[record.uid,record]));
 let outcomes=0;
 for(const finding of contracts)for(const uid of finding.recordUids){
  const record=byUid.get(uid);assert.ok(record?.contextEvidence,uid);
  const r=checkRequiredContextExtent(record.contextEvidence,finding.requiredContextExtent);assert.equal(r.complete,true,`${finding.findingId}: ${uid}`);assert.equal(r.semanticPass,false,uid);
  assert.ok(r.rectResults.every(rect=>rect.coveredByCropIds.length>0),uid);outcomes++;
 }
 assert.equal(outcomes,28);
});
