import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {canonical,regionHashes} from '../../../../tools/source-visual-coverage.mjs';
import {validateScanCatalog} from '../../../../tools/scan-catalog.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../'),require=createRequire(import.meta.url),books=require('../../../../dist/books.js');
const V2='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v2';
const OUT='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v3';
const sha=b=>createHash('sha256').update(b).digest('hex');const read=p=>readFileSync(path.join(root,p));const json=p=>JSON.parse(read(p));const assert=(x,m)=>{if(!x)throw Error(m)};
const v2=json(`${V2}/rules-records-candidate-corrected.json`),v3=json(`${OUT}/rules-records-candidate-corrected.json`),manifest=json(`${OUT}/production-metadata-manifest.json`),proposals=json(`${OUT}/whole-lookup-review-proposals.json`);
assert(manifest.status.includes('research-only'),'candidate is not research-only');
assert(v2.records.length===2&&v3.records.length===2,'owner count changed');
let cells=0,bindings=0,unassessed=0,pending=0,updatedContent=0;
for(const prior of v2.records){
 const record=v3.records.find(x=>x.id===prior.id);assert(record,'owner missing');
 assert(record.table.rows.length===prior.table.rows.length,'row count changed');
 for(let i=0;i<prior.table.rows.length;i++){
  const a=prior.table.rows[i],b=record.table.rows[i];
  assert(a.id===b.id&&a.label===b.label&&a.printedLabel===b.printedLabel&&isDeepStrictEqual(a.markers,b.markers),'row identity/label/marker changed');
  assert(isDeepStrictEqual(a.cells,b.cells),'literal cells changed');cells+=a.cells.length;
 }
 for(const entry of record.table.rows.map(r=>r.sourceReference).concat((record.table.sourceNotes||[]).map(n=>n.sourceReference),(record.table.footnotes||[]).map(n=>n.sourceReference))){
  for(const binding of entry?.evidenceBindings||[]){bindings++;assert(binding.sourceValueStatus==='not-assessed-by-field-target-review','sourceValueStatus changed');unassessed++;assert(binding.reviewStatus==='field-target-pending','field target status changed');pending++;}
 }
 assert(isDeepStrictEqual(record.table.columns,prior.table.columns),'column data changed');
 assert(isDeepStrictEqual(record.table.sourceContext,prior.table.sourceContext),'explicit context route changed');
 assert(isDeepStrictEqual(record.table.sourceNotes?.map(n=>({id:n.id,label:n.label,text:n.text})),prior.table.sourceNotes?.map(n=>({id:n.id,label:n.label,text:n.text}))), 'note wording changed');
 assert(isDeepStrictEqual(record.table.footnotes?.map(n=>({id:n.id,label:n.label,text:n.text})),prior.table.footnotes?.map(n=>({id:n.id,label:n.label,text:n.text}))), 'footnote wording changed');
}
assert(cells===555,'literal-cell count differs from 555');assert(bindings===50&&unassessed===50&&pending===50,'binding status counts differ');
for(const itemId of ['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table']){
 const record=v3.records.find(r=>r.id===itemId),catalog=json(`${OUT}/catalogs/rules-${itemId}.json`),oldCatalog=json(`${V2}/catalogs/rules-${itemId}.json`);
 const check={collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${itemId}.json`,regionCount:catalog.regions.length};
 validateScanCatalog(catalog,{id:itemId},books,check);
 assert(catalog.regions.length===oldCatalog.regions.length,'region count changed');
 const permittedRegionMetadata=new Set(['role','candidateStatus','summary','checkedOn','checkedFields']);
 let roleChanges=0;
 for(let i=0;i<catalog.regions.length;i++){
  const region=catalog.regions[i],old=oldCatalog.regions[i];
  assert(region.id===old.id,'region order or ID changed');
  if(region.role!==old.role){roleChanges++;assert((region.id==='phb38-table-context'||region.id==='ua28-table-context')&&old.role==='context'&&region.role==='table','unexpected role change');}
  const keys=new Set([...Object.keys(region),...Object.keys(old)]);
  for(const key of keys){if(permittedRegionMetadata.has(key))continue;assert(isDeepStrictEqual(region[key],old[key]),`${itemId}/${region.id} nonmetadata region field changed: ${key}`);}
  assert(regionHashes(region).focusSha256===regionHashes(old).focusSha256,`${itemId}/${region.id} focus changed`);
 }
 assert(roleChanges===(itemId.startsWith('phb-')?1:1),'unexpected number of table-role changes');
 const topNormalize=value=>{const out=structuredClone(value);delete out.candidateStatus;delete out.scope;delete out.regions;for(const reuse of out.reusedRegions||[])delete reuse.policy;return out;};
 assert(isDeepStrictEqual(topNormalize(catalog),topNormalize(oldCatalog)),`${itemId} has catalog changes outside approved descriptive metadata`);
 for(const region of catalog.regions){assert(books.resolveRegionSourceIdentity(catalog,region).valid,`${itemId}/${region.id} invalid source identity`);assert(sha(read(`dist/scans/verified/${region.image}`))===region.sha256,`${itemId}/${region.id} image hash mismatch`);}
 for(const target of [...record.table.rows.map(r=>r.sourceReference),...(record.table.sourceNotes||[]).map(n=>n.sourceReference),...(record.table.footnotes||[]).map(n=>n.sourceReference)])
  for(const binding of target?.evidenceBindings||[])
   for(const evidence of binding.regionEvidence||[]){
    const region=catalog.regions.find(r=>r.id===evidence.regionId);if(!region)continue;
    assert(evidence.contentSha256===regionHashes(region).contentSha256,`${itemId}/${region.id} stale region content hash`);
    assert(evidence.focusSha256===regionHashes(region).focusSha256,`${itemId}/${region.id} focus hash changed`);
    updatedContent++;
   }
}
assert(proposals.proposals.length===2&&proposals.proposals.every(p=>p.reviewStatus==='pending-root-final-object-review'&&p.reviewRecordTemplate.reviewer===null),'whole lookup proposals are falsely approved');
assert(proposals.proposals.every(p=>p.lookup.focusRects.length===0&&p.lookup.role==='table'&&p.scopeProposal.lookupScope==='whole-table'&&p.scopeProposal.unmarked===true),'whole-table entries are not documented unmarked table scopes');
assert(proposals.proposals.every(p=>isDeepStrictEqual(Object.keys(p.reviewRecordTemplate.assessments).sort(),['context','default'])),'proposal uses an unsupported assessment slot');
assert(proposals.proposals.every(p=>p.reviewRecordTemplate.assessments.context.status===null&&p.reviewRecordTemplate.assessments.default.status===null&&p.reviewRecordTemplate.assessments.context.independent===null&&p.reviewRecordTemplate.assessments.default.independent===null),'unreviewed templates must not claim an assessment');
assert(proposals.proposals.every(p=>p.exactOrderedPageGroup.defaultOrderSha256===p.reviewRecordTemplate.defaultOrderSha256),'default group pin mismatch');
assert(!JSON.stringify(proposals).includes('whole-table-unmarked')&&!JSON.stringify(proposals).includes('"kind"')&&!JSON.stringify(proposals).includes('"highlight"'),'proposal contains unsupported review kind or highlight assessment');
const orderHashes=proposals.proposals.map(p=>p.exactOrderedPageGroup.defaultOrderSha256);
assert(orderHashes.every(x=>/^[a-f0-9]{64}$/.test(x)),'default group hash missing');
for(const p of proposals.proposals){
 const catalog=json(`${OUT}/catalogs/rules-${p.lookup.itemId}.json`),record=v3.records.find(r=>r.id===p.lookup.itemId),region=catalog.regions.find(r=>r.id===p.lookup.tableRegionId);
 assert(region&&region.role==='table'&&region.focusRects.length===0,'whole-table region changed or is not unmarked');
 assert(isDeepStrictEqual(p.scopeProposal.explicitSourceContext,record.table.sourceContext),'scope proposal is detached from the explicit whole-table source route');
 assert(p.lookup.imageSha256===region.sha256&&p.lookup.focusSha256===regionHashes(region).focusSha256&&p.lookup.contentSha256===regionHashes(region).contentSha256,'scope hashes do not match catalog region');
 const entries=p.exactOrderedPageGroup.orderedRegions.map(({id,role,imageSha256,focusSha256,contentSha256})=>({id,role,imageSha256,focusSha256,contentSha256}));
 assert(sha(canonical(entries))===p.exactOrderedPageGroup.defaultOrderSha256,'full ordered default group hash mismatch');
 const manifestGroup=manifest.pageGroups.find(g=>g.itemId===p.lookup.itemId);
 assert(manifestGroup&&manifestGroup.defaultOrderSha256===p.exactOrderedPageGroup.defaultOrderSha256&&isDeepStrictEqual(manifestGroup.orderedRegions,p.exactOrderedPageGroup.orderedRegions),'proposal and manifest page-group pins disagree');
}
console.log(JSON.stringify({valid:true,catalogs:2,validateScanCatalog:'passed',regions:manifest.outputs.filter(o=>o.path.includes('/catalogs/')).length,literalCells:cells,evidenceBindings:bindings,fieldTargetsPending:pending,sourceValuesNotAssessed:unassessed,regionEvidenceContentHashesChecked:updatedContent,wholeLookupContextDefaultProposals:proposals.proposals.length,defaultOrderSha256:orderHashes},null,2));
