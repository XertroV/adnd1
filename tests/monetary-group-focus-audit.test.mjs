import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync,writeFileSync,mkdtempSync,rmSync}from'node:fs';
import{gunzipSync}from'node:zlib';
import{createHash}from'node:crypto';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{pathToFileURL}from'node:url';
import{auditMonetaryGroupFocus,canonical}from'../tools/monetary-group-focus-audit.mjs';
const gzip=readFileSync(new URL('./fixtures/monetary-phbdmg-v4-group-focus-before.json.gz',import.meta.url)),raw=gunzipSync(gzip),fixture=JSON.parse(raw),sha=value=>createHash('sha256').update(value).digest('hex');
const set=(data,pointer,value)=>{const parts=pointer.slice(1).split('/').map(p=>p.replaceAll('~1','/').replaceAll('~0','~'));let parent=data;for(const key of parts.slice(0,-1))parent=parent[key];parent[parts.at(-1)]=structuredClone(value);};
function alignedCopy(){const data=structuredClone(fixture);for(const d of auditMonetaryGroupFocus(data).duplicates){assert.ok(d.mainFocusPointer);set(data,d.groupFocusPointer,d.mainFocus);}return data;}
test('entire frozen V4 body exposes all215 authored focus declarations and the nine stale grouped poison targets',()=>{
 assert.equal(sha(gzip),'d9ff7373f6055a7d96af2f171c995a3473a62b4e20bf5a228ff8fd3753b3f802');
 assert.equal(sha(raw),'299c1a3eb5c2f5be7866ed2304038698f1a4e092b09f6e24132655227b03119b');
 const report=auditMonetaryGroupFocus(fixture);
 assert.equal(report.counts.primaryRows,179);assert.equal(report.counts.groups,18);assert.equal(report.counts.declaredFocusGeometryFields,215);
 assert.deepEqual(report.counts.declarationsByScope,{'grouped-row':24,'primary-row':179,'ordered-part':11,'reference-comparator':1});
 assert.deepEqual(report.counts.byCategory,{differing:24});
 assert.deepEqual(report.counts.bySourceGeometryCategory,{matching:15,differing:9});
 assert.equal(report.counts.metadataOnlyDifferences,15);assert.equal(report.validation.consistent,false);assert.equal(report.validation.semanticCompleteness,false);
 const bad=report.duplicates.filter(d=>d.sourceGeometryCategory==='differing');
 assert.deepEqual(bad.map(d=>d.mainRowId),['dmg-poison-ingestive-a','dmg-poison-ingestive-b','dmg-poison-ingestive-c','dmg-poison-ingestive-d','dmg-poison-ingestive-e','dmg-poison-insinuative-a','dmg-poison-insinuative-b','dmg-poison-insinuative-c','dmg-poison-insinuative-d']);
 assert.deepEqual(bad[0].groupFocus.focusBoundsCropPixelsLTRB,[8,72,602,90]);assert.deepEqual(bad[0].mainFocus.focusBoundsCropPixelsLTRB,[10,117,535,136]);
 assert.ok(report.duplicates.every(d=>d.allAuthoredFocusFieldDifferences.some(x=>x.path==='/status')));
});
test('exact primary recipe clones repair duplicate consistency without changing any source facts',()=>{
 const data=alignedCopy(),report=auditMonetaryGroupFocus(data);
 assert.equal(report.validation.consistent,true);assert.deepEqual(report.counts.byCategory,{matching:24});assert.deepEqual(report.counts.bySourceGeometryCategory,{matching:24});
 assert.equal(canonical(data.review.sourceRowsOrClaims),canonical(fixture.review.sourceRowsOrClaims));
 for(const duplicate of report.duplicates){assert.equal(duplicate.fullFocusObjectEqual,true);assert.equal(duplicate.sourcePixelCorrectness,'unassessed-by-duplicate-consistency-audit');}
});
test('unknown identities, duplicate printed labels, absent source frames and conflicting declarations fail closed',()=>{
 const base=alignedCopy();
 const unknown=structuredClone(base);unknown.review.groups.push({recordId:'future-table',source:base.review.groups[0].source,tableRows:[{focus:base.review.groups[0].tableRows[0].focus}]});assert.equal(auditMonetaryGroupFocus(unknown).counts.byCategory['cannot-align'],1);
 const ambiguous=structuredClone(base),row=structuredClone(ambiguous.review.sourceRowsOrClaims[0]);row.sourceRowOrClaimId+='-duplicate';ambiguous.review.sourceRowsOrClaims.push(row);assert.equal(auditMonetaryGroupFocus(ambiguous).counts.byCategory['cannot-align'],1);
 const missing=structuredClone(base);delete missing.review.evidenceCrops.find(c=>c.cropId===missing.review.groups[1].tableRows[0].focus.contextCropId).sourceRenderSha256;assert.equal(auditMonetaryGroupFocus(missing).counts.byCategory['cannot-align'],9);
 const metadata=structuredClone(base);metadata.review.groups[0].tableRows[0].focus.status='unexpected approval claim';const report=auditMonetaryGroupFocus(metadata);assert.equal(report.validation.consistent,false);assert.equal(report.counts.metadataOnlyDifferences,1);assert.deepEqual(report.duplicates[0].allAuthoredFocusFieldDifferences.map(x=>x.path),['/status']);
 const badSource=structuredClone(base);badSource.review.groups[0].source.pdfPage+=1;assert.equal(auditMonetaryGroupFocus(badSource).counts.bySourceGeometryCategory.differing,15);
});
test('precise poison variant labels and printed levels determine ownership, never a first substring or index',()=>{
 const data=alignedCopy();data.review.sourceRowsOrClaims.reverse();const report=auditMonetaryGroupFocus(data);assert.equal(report.validation.consistent,true);
 const poison=data.review.groups.find(g=>g.recordId==='dmg-poison-dose-and-manufacture');poison.tableRows[0].poisonClass='A';const noMarker=auditMonetaryGroupFocus(data);assert.equal(noMarker.counts.byCategory['cannot-align'],1);
});
test('preserved d47 orphan declarations cannot inherit a known scope from an ancestor path',async()=>{
 const before=JSON.parse(readFileSync(new URL('../research/source-audit-batch5-group-focus-orphan-guard-before.json',import.meta.url)));
 assert.equal(sha(readFileSync(new URL('../research/source-audit-batch5-group-focus-orphan-guard-before.json',import.meta.url))),'d862729c27590fe3b9e7e7fe1403ad080e5a68185a2908a7168255768ec23422');
 const gzip=readFileSync(new URL('./fixtures/monetary-group-focus-audit-d47-before-orphan-guard.mjs.gz',import.meta.url));assert.equal(sha(gzip),'9529c102faa5dc10788e1badc4ffcdc119ca5986ec8aa28d4161cf868fad6845');const old=gunzipSync(gzip);assert.equal(sha(old),'d47d383e35e63ce4cf4f5d0ab397a35dbbff48a0902c19df36baa557c1e2cc1d');
 const temp=mkdtempSync(join(tmpdir(),'group-focus-old-')),path=join(temp,'old.mjs');writeFileSync(path,old);
 try{
  const legacy=await import(pathToFileURL(path).href);
  for(const entry of before.cases){
   const data=alignedCopy();set(data,entry.path,entry.value);const oldReport=legacy.auditMonetaryGroupFocus(data);assert.equal(oldReport.validation.consistent,true,entry.id);assert.equal(oldReport.counts.unclassifiedDeclarations,0,entry.id);
   const current=auditMonetaryGroupFocus(data);assert.equal(current.validation.consistent,false,entry.id);assert.equal(current.counts.declaredFocusGeometryFields,216,entry.id);assert.equal(current.counts.unclassifiedDeclarations,1,entry.id);
   const unmapped=current.inventory.filter(row=>row.mappingStatus==='unmapped-declaration-slot');assert.equal(unmapped.length,1,entry.id);assert.ok(unmapped[0].pointer.startsWith(entry.path+'/'),entry.id);assert.equal(current.validation.semanticCompleteness,false);
   if(entry.id==='unsupported-group-parent-with-valid-identity')assert.equal(current.duplicates.find(row=>row.groupFocusPointer==='/review/groups/0/extra/focus').alignment,'unsupported-group-focus-container');
  }
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('coordinated nested or competing focus encodings remain unclassified in every supported scope',()=>{
 const geometry={focusBoundsCropPixelsLTRB:[1,1,3,3]},data=alignedCopy(),group=data.review.groups[0].tableRows[0];group.focus.extraFocus=structuredClone(geometry);data.review.sourceRowsOrClaims[0].focus.extraFocus=structuredClone(geometry);
 let report=auditMonetaryGroupFocus(data);assert.equal(report.counts.unclassifiedDeclarations,2);assert.equal(report.validation.consistent,false);assert.equal(report.duplicates[0].fullFocusObjectEqual,true,'matching duplicated parent objects cannot swallow nested orphan declarations');
 const primary=alignedCopy();primary.review.sourceRowsOrClaims[90].focus.focusRectsCropPixelsLTRB=[[1,1,3,3],[4,4,6,6]];report=auditMonetaryGroupFocus(primary);assert.equal(report.counts.unclassifiedDeclarations,2);assert.equal(report.validation.consistent,false);
 const part=alignedCopy().review.sourceRowsOrClaims.find(row=>row.sourceContextParts?.some(part=>part.focusBoundsCropPixelsLTRB));const partData=alignedCopy(),target=partData.review.sourceRowsOrClaims.find(row=>row.sourceRowOrClaimId===part.sourceRowOrClaimId).sourceContextParts.find(part=>part.focusBoundsCropPixelsLTRB);target.focus=structuredClone(geometry);report=auditMonetaryGroupFocus(partData);assert.equal(report.counts.unclassifiedDeclarations,2);assert.equal(report.validation.consistent,false);
 const comparator=alignedCopy();comparator.additionalReferenceSheetReview.unholyWaterVariantOfferReview.focus.focusRectsCropPixelsLTRB=[[1,1,3,3],[4,4,6,6]];report=auditMonetaryGroupFocus(comparator);assert.equal(report.counts.unclassifiedDeclarations,2);assert.equal(report.validation.consistent,false);
});
test('exact primary, ordered-part and comparator slots remain recognized without a source-semantic grade',()=>{
 const data=alignedCopy(),part=data.review.sourceRowsOrClaims.find(row=>row.sourceContextParts?.some(part=>part.focusBoundsCropPixelsLTRB)).sourceContextParts.find(part=>part.focusBoundsCropPixelsLTRB);part.focus={focusBoundsCropPixelsLTRB:part.focusBoundsCropPixelsLTRB};delete part.focusBoundsCropPixelsLTRB;
 const report=auditMonetaryGroupFocus(data);assert.equal(report.counts.declaredFocusGeometryFields,215);assert.equal(report.counts.unclassifiedDeclarations,0);assert.equal(report.validation.consistent,true);assert.equal(report.validation.semanticCompleteness,false);
});
test('a repeated grouped printed row cannot inflate the inventory by reusing a primary focus',()=>{
 const data=alignedCopy();data.review.groups[0].tableRows.push(structuredClone(data.review.groups[0].tableRows[0]));const report=auditMonetaryGroupFocus(data);assert.equal(report.counts.groupedFocusDuplicates,25);assert.equal(report.counts.unclassifiedDeclarations,0);assert.equal(report.counts.byCategory['cannot-align'],2);assert.equal(report.validation.consistent,false);
 const repeated=report.duplicates.filter(row=>row.alignment==='multiple-grouped-declarations-for-primary-row');assert.equal(repeated.length,2);assert.ok(repeated.every(row=>row.competingGroupedFocusPointers.length===2));
 const duplicateGroup=alignedCopy();duplicateGroup.review.groups.push(structuredClone(duplicateGroup.review.groups[0]));assert.throws(()=>auditMonetaryGroupFocus(duplicateGroup),/Duplicate or missing monetary group identity/);
});
