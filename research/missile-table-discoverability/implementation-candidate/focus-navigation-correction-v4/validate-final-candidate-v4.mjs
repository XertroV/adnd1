import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {canonical,regionHashes} from '../../../../tools/source-visual-coverage.mjs';
import {validateScanCatalog} from '../../../../tools/scan-catalog.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../../');
const require=createRequire(import.meta.url);
const books=require('../../../../dist/books.js');
const OUT='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4';
const V3='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v3';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=relative=>readFileSync(path.join(root,relative));
const json=relative=>JSON.parse(read(relative));
const assert=(condition,message)=>{if(!condition)throw Error(message);};

const manifest=json(`${OUT}/production-metadata-v4-manifest.json`);
assert(manifest.base.head==='4aa977788085f67a28a24d40965edf987bc7242b','unexpected current base');
for(const output of manifest.outputs){
 const bytes=read(output.path);
 assert(bytes.length===output.size&&sha(bytes)===output.sha256,`output hash mismatch: ${output.path}`);
}
for(const input of Object.values(manifest.inputs))assert(sha(read(input.path))===input.sha256,`input hash mismatch: ${input.path}`);

const priorRecords=json(`${V3}/rules-records-candidate-corrected.json`);
const records=json(`${OUT}/rules-records-candidate-final-v4.json`);
const proposals=json(`${OUT}/whole-table-scope-and-context-default-proposals.json`);
assert(records.records.length===2&&priorRecords.records.length===2,'owner count changed');
let cells=0,bindings=0,contentUpdates=0;
const normalizeRecord=record=>{
 const value=structuredClone(record);
 delete value.candidateStatus;
 const expectedPrefix=record.id.startsWith('phb-')?'phb38-':'ua28-';
 for(const item of [...(value.table.rows||[]),...(value.table.sourceNotes||[]),...(value.table.footnotes||[])])for(const binding of item.sourceReference?.evidenceBindings||[]){
  if(!(binding.regionEvidence||[]).some(evidence=>evidence.regionId.startsWith(expectedPrefix)))continue;
  binding.contextStatus='__allowed__';binding.contextLimitations=['__allowed__'];
  for(const evidence of binding.regionEvidence||[])if(evidence.regionId.startsWith(expectedPrefix))evidence.contentSha256='__allowed__';
 }
 return value;
};
for(const old of priorRecords.records){
 const current=records.records.find(record=>record.id===old.id);
 assert(current,`missing owner ${old.id}`);
 assert(!Object.hasOwn(current,'candidateStatus'),`${old.id} retains workflow candidate status`);
 assert(isDeepStrictEqual(normalizeRecord(old),normalizeRecord(current)),`${old.id} has non-authorized owner payload changes`);
 for(let index=0;index<old.table.rows.length;index++){
  assert(isDeepStrictEqual(old.table.rows[index].cells,current.table.rows[index].cells),`${old.id} row cells changed`);
  cells+=current.table.rows[index].cells.length;
 }
 const priorRefs=[...old.table.rows.map(row=>row.sourceReference),...(old.table.sourceNotes||[]).map(note=>note.sourceReference),...(old.table.footnotes||[]).map(note=>note.sourceReference)];
 const currentRefs=[...current.table.rows.map(row=>row.sourceReference),...(current.table.sourceNotes||[]).map(note=>note.sourceReference),...(current.table.footnotes||[]).map(note=>note.sourceReference)];
 for(let index=0;index<priorRefs.length;index++){
  const beforeBindings=priorRefs[index]?.evidenceBindings||[],afterBindings=currentRefs[index]?.evidenceBindings||[];
  assert(beforeBindings.length===afterBindings.length,'evidence-binding count changed');
  for(let j=0;j<beforeBindings.length;j++){
   const before=beforeBindings[j],after=afterBindings[j];bindings++;
   assert(before.reviewStatus===after.reviewStatus&&after.reviewStatus==='field-target-pending','field-target status changed');
   assert(before.sourceValueStatus===after.sourceValueStatus&&after.sourceValueStatus==='not-assessed-by-field-target-review','source value status changed');
   assert(before.valuePathStatus===after.valuePathStatus,'value-path status changed');
   const expectedPrefix=old.id.startsWith('phb-')?'phb38-':'ua28-';
   const pageBinding=(before.regionEvidence||[]).some(evidence=>evidence.regionId.startsWith(expectedPrefix));
   if(pageBinding){
    assert(after.contextStatus==='field-target-pending','context status is not neutral pending');
    assert(isDeepStrictEqual(after.contextLimitations,['Target review does not assign numeric, mechanics, or source-value grades.']),'unexpected context limitation');
   }else assert(after.contextStatus===before.contextStatus&&isDeepStrictEqual(after.contextLimitations,before.contextLimitations),'non-page evidence binding metadata changed');
   for(const evidence of after.regionEvidence||[]){
    if(evidence.regionId.startsWith(old.id.startsWith('phb-')?'phb38-':'ua28-')){
     const catalog=json(`${OUT}/catalogs/rules-${old.id}.json`),region=catalog.regions.find(candidate=>candidate.id===evidence.regionId);
     assert(region,'page-region evidence missing');
     assert(evidence.contentSha256===regionHashes(region).contentSha256,'page evidence content hash mismatch');
     assert(evidence.focusSha256===regionHashes(region).focusSha256,'focus evidence changed');
     if(evidence.contentSha256!==beforeBindings[j].regionEvidence.find(item=>item.regionId===evidence.regionId)?.contentSha256)contentUpdates++;
    }
   }
  }
 }
}
assert(cells===555&&bindings===50&&contentUpdates===44,'cell/binding/content-update census differs');

const ids=['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'];
for(const itemId of ids){
 const catalog=json(`${OUT}/catalogs/rules-${itemId}.json`);
 const old=json(`${V3}/catalogs/rules-${itemId}.json`);
 const record=records.records.find(candidate=>candidate.id===itemId);
 validateScanCatalog(catalog,{id:itemId},books,{collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${itemId}.json`,regionCount:catalog.regions.length});
 assert(catalog.regions.length===old.regions.length,'region count changed');
 assert(!Object.hasOwn(catalog,'candidateStatus'),'catalog retains workflow candidate status');
 for(const key of ['schemaVersion','collection','itemId','sources'])assert(isDeepStrictEqual(catalog[key],old[key]),`${itemId}/${key} changed`);
 const priorRegions=new Map(old.regions.map(region=>[region.id,region]));
 for(const region of catalog.regions){
  const prior=priorRegions.get(region.id);assert(prior,`${itemId} region ID changed`);
  assert(!Object.hasOwn(region,'candidateStatus'),`${itemId}/${region.id} retains workflow status`);
  const activeBook=itemId.startsWith('phb-')?'PHB':'UA',activePage=itemId.startsWith('phb-')?38:28;
  if(region.book===activeBook&&region.printedPage===activePage)assert(!Object.hasOwn(region,'checkedOn'),`${itemId}/${region.id} retains stale review date`);
  assert(isDeepStrictEqual(region.focusRects,prior.focusRects),`${itemId}/${region.id} focus geometry changed`);
  for(const key of ['image','width','height','sha256','boundsPdfPoints','book','printedPage','pdfPage','id'])assert(isDeepStrictEqual(region[key],prior[key]),`${itemId}/${region.id} source geometry changed: ${key}`);
  assert(sha(read(`dist/scans/verified/${region.image}`))===region.sha256,`${itemId}/${region.id} image bytes differ`);
  assert(books.resolveRegionSourceIdentity(catalog,region)?.valid,`${itemId}/${region.id} source identity invalid`);
  if(region.book==='PHB'&&region.printedPage===36)assert(isDeepStrictEqual(region,prior),`${itemId}/${region.id} reused PHB36 source region changed`);
  assert(!/await root review|pending root|research.only|unregistered|v3 metadata|v4|candidate/i.test(JSON.stringify({summary:region.summary,checkedFields:region.checkedFields})),'workflow prose remains in production-facing region descriptions');
 }
 assert(catalog.regions.filter(region=>region.role==='table').length===1,'whole-table role missing');
 assert(catalog.regions.find(region=>region.role==='table').focusRects.length===0,'whole-table region is marked');
 assert(record.table.sourceContext.regionId===catalog.regions.find(region=>region.role==='table').id,'explicit table source route changed');
 assert(!/research.only|unregistered|await root review|pending root review|candidate/i.test(catalog.scope),'workflow prose remains in catalog scope');
 for(const reuse of catalog.reusedRegions||[])assert(!/await|pending|research.only|candidate|v[0-9]/i.test(reuse.policy),'workflow prose remains in reuse policy');
}

assert(proposals.proposals.length===2,'whole-table review proposal count changed');
assert(proposals.proposals.every(proposal=>proposal.status==='pending-independent-review'&&proposal.reviewRecordTemplate.reviewer===null),'whole-table templates imply approval');
assert(proposals.proposals.every(proposal=>proposal.scopeProposal.lookupScope==='whole-table'&&proposal.scopeProposal.unmarked===true),'whole-table scope not explicit');
assert(proposals.proposals.every(proposal=>isDeepStrictEqual(Object.keys(proposal.reviewRecordTemplate.assessments).sort(),['context','default'])),'unsupported assessment kind');
for(const proposal of proposals.proposals){
 const group=proposal.exactOrderedPageGroup;
 const entries=group.orderedRegions.map(({id,role,imageSha256,focusSha256,contentSha256})=>({id,role,imageSha256,focusSha256,contentSha256}));
 assert(sha(canonical(entries))===group.defaultOrderSha256,'ordered page-group hash mismatch');
 assert(proposal.reviewRecordTemplate.defaultOrderSha256===group.defaultOrderSha256,'review template group hash mismatch');
 assert(group.defaultRegionId===proposal.reviewRecordTemplate.regionId,'default region and review target differ');
}

const diff=json(`${OUT}/exact-leaf-diff-v3-to-v4.json`);
assert(diff.counts.total===diff.counts.records+diff.counts.phbCatalog+diff.counts.uaCatalog,'exact diff count mismatch');
assert(manifest.counts.removedRegionCandidateStatuses===46&&manifest.counts.removedRegionReviewDates===46,'region workflow-metadata count mismatch');
console.log(JSON.stringify({valid:true,base:manifest.base.head,catalogs:2,validateScanCatalog:'passed',catalogRegions:manifest.counts.exactCurrentCatalogRegionRows,changedPageBindings:manifest.counts.contextWorkflowBindingsNormalized,updatedPageEvidenceContentHashes:manifest.counts.regionEvidenceContentHashesUpdated,literalCells:cells,evidenceBindings:bindings,fieldTargetPending:50,sourceValuesNotAssessed:50,wholeTableGroups:proposals.proposals.length,defaultOrderSha256:proposals.proposals.map(proposal=>({itemId:proposal.exactOrderedPageGroup.itemId,sha256:proposal.exactOrderedPageGroup.defaultOrderSha256})),exactDiffLeafCounts:diff.counts},null,2));
