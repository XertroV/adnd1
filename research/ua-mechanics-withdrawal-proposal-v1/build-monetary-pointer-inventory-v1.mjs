// Read existing inventories and run the existing scanner in memory; no active outputs.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {buildSystemicInventory} from '../../tools/citation-systemic-inventory.mjs';
const root=path.resolve(import.meta.dirname,'../..'),out=import.meta.dirname,base='9b77aeb620b1d671ff1d59b0e14790206523b327';
const sha=b=>createHash('sha256').update(b).digest('hex'),hash=v=>sha(JSON.stringify(v));
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p));
const gitCache=new Map();const git=p=>{if(!gitCache.has(p))gitCache.set(p,execFileSync('git',['show',`${base}:${p}`],{cwd:root,maxBuffer:70*1024*1024}));return gitCache.get(p);};
const currentBytes=read('dist/data.json');assert.equal(sha(currentBytes),'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3');
const data=JSON.parse(currentBytes),oldData=JSON.parse(git('dist/data.json'));
const inputs=['tools/citation-systemic-inventory.mjs','dist/data.json','research/price-source-inventory.json','research/monetary-source-inventory.json','research/source-audit-batch5-price-discovery-reconciliation.json','research/price-source-inventory-ua-other.json'].map(p=>({path:p,sha256:sha(read(p)),bytes:read(p).length}));
const current=buildSystemicInventory(data,read,{source:'off-ledger-UA-source-candidate',rawDataFileSha256:sha(currentBytes),includeVisual:false});
const prior=buildSystemicInventory(oldData,git,{source:'exact-9b-source-predecessor',commit:base,rawDataFileSha256:sha(git('dist/data.json')),includeVisual:false});
const claims=l=>l.moneyLikeProperties.claims;
const ids=['ua-cleric-ceremony','ua-cleric-rainbow'];
const selected=claims(current).filter(c=>c.collection==='spells'&&ids.includes(c.itemId));assert.equal(selected.length,2);
const before=claims(prior).filter(c=>c.collection==='spells'&&ids.includes(c.itemId));assert.equal(before.length,1);assert.equal(before[0].itemId,'ua-cleric-rainbow');
const existing=json('research/monetary-source-inventory.json'),receipts=json('research/source-audit-batch5-price-discovery-reconciliation.json');
const mapping=[{itemId:ids[0],fieldPointer:'/exceptions/0',receiptIndex:52,receiptId:'ua-census-record-001',occurrenceIndex:1743,occurrenceId:'price-discovery:ua-census-record-001',printedPage:32},{itemId:ids[1],fieldPointer:'/conditions/0',receiptIndex:54,receiptId:'ua-census-record-003',occurrenceIndex:1745,occurrenceId:'price-discovery:ua-census-record-003',printedPage:40}];
const proposedReconciliations=mapping.map(m=>{
 const claim=selected.find(c=>c.itemId===m.itemId),old=before.find(c=>c.itemId===m.itemId),r=receipts.claimReceipts[m.receiptIndex],o=existing.sourceOccurrences[m.occurrenceIndex];
 assert.equal(r.receiptId,m.receiptId);assert.equal(o.sourceOccurrenceId,m.occurrenceId);assert.equal(o.source.printedPage,m.printedPage);assert.equal(o.siteMapping.status,'unmapped');assert.equal(o.reviewStatus.independentSemanticReview,'pending-independent-review');assert.equal(o.reviewStatus.independentOverlayReview,'pending-independent-review');
 assert.equal(claim.auditClass,'candidate');assert.equal(claim.valueReviewStatus,'no-independent-source-value-status');assert.equal(claim.targetRelation,'not-bound');
 return {collection:'spells',itemId:m.itemId,fieldPointer:m.fieldPointer,delta:old?'revised raw prose at an existing money-like pointer; old1000gp threshold already present':'new money-like body pointer; underlying source census occurrence already inventoried',currentScannerClaim:claim,beforeScannerClaim:old??null,
  existingReceipt:{artifact:'research/source-audit-batch5-price-discovery-reconciliation.json',jsonPointer:`/claimReceipts/${m.receiptIndex}`,sha256:hash(r),record:r},
  existingSourceOccurrence:{artifact:'research/monetary-source-inventory.json',jsonPointer:`/sourceOccurrences/${m.occurrenceIndex}`,sha256:hash(o),record:o},
  proposedSitePointerRegistration:{status:'candidate exact owner-pointer reconciliation pending independent disposition',sourceOccurrenceId:m.occurrenceId,currentSitePointer:claim.pointer,collection:'spells',itemId:m.itemId,fieldPointer:m.fieldPointer,expectedCurrentRawValueSha256:hash(claim.rawValue),independentSemanticReview:'pending-independent-review',independentOverlayReview:'pending-independent-review',sourceValueGrade:'NOT PROMOTED',newSourceRows:0,newSourceOccurrences:0,newCanonicalEquipmentPriceBindings:0},
 };
});
const targetRows=json('research/price-source-inventory.json').fieldEvidenceBindings.filter(b=>ids.includes(b.itemId));
assert(targetRows.every(b=>b.reviewStatus==='field-target-pending'&&b.targetReview===null));
const doc={schemaVersion:1,artifactType:'read-only-UA-revised-body-monetary-source-pointer-reconciliation-candidate',status:'PROPOSAL ONLY; scanner observations and existing source records, no semantic/site mapping activation',baseCommit:base,actualMergedWeaponDependency:'6717c6f22bbf2f2b421327e4c8561b1d81df00d4',inputs,
 scanner:{api:'buildSystemicInventory(data,reader,{includeVisual:false})',artifact:'tools/citation-systemic-inventory.mjs',beforeAllMoneyLikePropertyCount:prior.moneyLikeProperties.denominator,currentAllMoneyLikePropertyCount:current.moneyLikeProperties.denominator,selectedBeforeClaims:before.length,selectedCurrentClaims:selected.length,newSelectedMoneyLikePointers:1,revisedSelectedExistingMoneyLikePointers:1,reviewPolicy:'Scanner classification and parsed1000gp value establish no independent source-value review. Exact existing occurrences remain unmapped with independent semantic/overlay pending.'},
 proposedReconciliations,
 limitations:['Source pages were not newly reviewed in this reconciliation; exact existing source receipts and current scanner results are inventoried.','The canonical price inventory covers its declared source rows, equipment claims and evidence bindings. Unchanged canonical amounts and old binding objects do not independently review revised arbitrary spell prose.','The two source occurrences already exist and must not be counted again. Any future owner-pointer mapping must cite these exact occurrence/receipt identities and current prose hashes, with pending semantic/overlay grades retained until independently reviewed.','Existing page references and owner catalogs are not body-field target approvals. Current scanner says not-bound/no-independent-source-value-status for both pointers; no fallback sourceContext claim is made.'],
 activeOutputFilesWritten:0};
for(const ref of inputs)assert.equal(sha(read(ref.path)),ref.sha256);
const bytes=Buffer.from(JSON.stringify(doc,null,2)+'\n'),name='monetary-source-pointer-reconciliation-candidate-v1.json';fs.writeFileSync(path.join(out,name),bytes);console.log(JSON.stringify({path:`research/ua-mechanics-withdrawal-proposal-v1/${name}`,sha256:sha(bytes),bytes:bytes.length,scanner:doc.scanner}));
