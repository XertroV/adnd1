// Candidate inventory only. Never writes an active ledger, source file or metadata snapshot.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {isDeepStrictEqual as same} from 'node:util';
import {buildLedger,validateLedger,fieldsFor,getPointer} from '../../tools/mechanics-audit.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const output=import.meta.dirname;
const base='9b77aeb620b1d671ff1d59b0e14790206523b327';
const actualMergedDependency='6717c6f22bbf2f2b421327e4c8561b1d81df00d4';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=v=>sha(JSON.stringify(v));
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const git=p=>execFileSync('git',['show',`${base}:${p}`],{cwd:root,maxBuffer:70*1024*1024});
const write=(name,value)=>{const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(path.join(output,name),bytes);return {path:`research/ua-mechanics-withdrawal-proposal-v1/${name}`,sha256:sha(bytes),bytes:bytes.length};};
const pins={
  'research/mechanics-audit-progress.json':'ba9fe216487c80100cd58e6287d8e9079af5fc5eff1af11f03125a4f44492be1',
  'dist/data.json':'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3',
  'research/price-source-inventory.json':'2d050385af4b5ce68152ed1cef9c7f1cc7774612a291db910c5e44d26509d210',
  'research/field-evidence-bindings.json':'6422b17cf193470a01da432f77ba61d61abe0e69653ceb493048616b4da448b9',
  'tools/mechanics-audit.mjs':'f359b684310ef02f25d09034ac83346f64e7029b52d79081a18911f0bb0b66f3',
  'research/ua-source-native-integration-v1/source-phase-manifest-v1.json':'bc70496d8f4acbef7c9f2cc26427e6a0618605aa58099d41a819c85c34270154',
  'research/ua-source-native-integration-v1/source-phase-integration-receipt-v1.json':'69478559c7ac44580dffd17d51a877ca4b2c7ead6d9e02fe28efd09f9dab166b',
};
for(const [p,h] of Object.entries(pins))assert.equal(sha(read(p)),h,p);
const ledgerRaw=read('research/mechanics-audit-progress.json');
assert.deepEqual(ledgerRaw,git('research/mechanics-audit-progress.json'));
const ledger=JSON.parse(ledgerRaw),data=json('dist/data.json'),beforeData=JSON.parse(git('dist/data.json'));
assert.equal(ledger.reviewRecords.length,1210);
const beforeFixture=gzipSync(ledgerRaw,{level:9,mtime:0});
assert.deepEqual(gunzipSync(beforeFixture),ledgerRaw);
fs.writeFileSync(path.join(output,'exact-before-mechanics-ledger-v1.json.gz'),beforeFixture);
const beforeFixtureRef={path:'research/ua-mechanics-withdrawal-proposal-v1/exact-before-mechanics-ledger-v1.json.gz',sha256:sha(beforeFixture),rawSha256:sha(ledgerRaw),bytes:beforeFixture.length,rawBytes:ledgerRaw.length};
const specs=[
 {index:806,id:'ua-cleric-ceremony',checker:'mechanics-ua-spells',paths:['/effect/0','/effect/1','/effect/2','/conditions/0','/conditions/1','/exceptions/0','/exceptions/1'],changeIndexes:[]},
 {index:829,id:'ua-cleric-rainbow',checker:'mechanics-ua-spells',paths:['/effect/0','/effect/1','/effect/2','/effect/3','/conditions/0','/exceptions/0'],changeIndexes:[1]},
 {index:833,id:'ua-druid-ceremony',checker:'mechanics-ua-spells',paths:['/effect/0','/effect/1','/effect/2','/conditions/0','/conditions/1','/exceptions/0','/exceptions/1'],changeIndexes:[1]},
 {index:848,id:'ua-illusionist-chromatic-orb',checker:'mechanics-ua-spells',paths:['/effect/0','/effect/1','/exceptions/0'],changeIndexes:[2]},
 {index:933,id:'ua-magic-user-bind',checker:'mechanics-ua-spells',paths:['/effect/1'],changeIndexes:[]},
 {index:1198,id:'ua-druid-ceremony',checker:'mechanics-source-adjudication-batch5',paths:['/exceptions/0'],changeIndexes:[0]},
];
const ids=[...new Set(specs.map(s=>s.id))];
const oldItem=id=>beforeData.spells.find(s=>s.id===id),item=id=>data.spells.find(s=>s.id===id);
const changed=[];
for(const id of ids){
 const a=new Map(fieldsFor('spells',oldItem(id)).filter(f=>/^\/(effect|conditions|exceptions)(\/|$)/.test(f.path)).map(f=>[f.path,f.value]));
 const b=new Map(fieldsFor('spells',item(id)).filter(f=>/^\/(effect|conditions|exceptions)(\/|$)/.test(f.path)).map(f=>[f.path,f.value]));
 for(const p of new Set([...a.keys(),...b.keys()]))if(!same(a.get(p),b.get(p)))changed.push({collection:'spells',id,path:p,beforePresent:a.has(p),...(a.has(p)?{beforeValue:a.get(p)}:{}),afterPresent:b.has(p),...(b.has(p)?{afterValue:b.get(p)}:{})});
}
assert.equal(changed.length,44);
const proposedReviews=structuredClone(ledger.reviewRecords),registrations=[];
for(const s of specs){
 const before=ledger.reviewRecords[s.index];
 assert.equal(before.id,s.id);assert.equal(before.collection,'spells');assert.equal(before.checker,s.checker);
 const beforePaths=before.checkedPaths.filter(p=>s.paths.includes(p));assert.equal(beforePaths.length,s.paths.length);
 const withdrawnChecks=s.paths.map(p=>{
  assert(Object.hasOwn(before.checkedValues,p));assert(same(before.checkedValues[p],getPointer(oldItem(s.id),p)));
  assert(!same(before.checkedValues[p],getPointer(item(s.id),p)));
  const current=getPointer(item(s.id),p);
  return {path:p,oldCheckedValue:before.checkedValues[p],oldCheckedValueSha256:hash(before.checkedValues[p]),currentPresent:current!==undefined,...(current!==undefined?{currentValue:current,currentValueSha256:hash(current)}:{})};
 });
 const after=structuredClone(before);
 after.checkedPaths=before.checkedPaths.filter(p=>!s.paths.includes(p));
 for(const p of s.paths)delete after.checkedValues[p];
 const withdrawnChanges=s.changeIndexes.map(index=>({index,sha256:hash(before.changes[index]),change:before.changes[index]}));
 after.changes=before.changes.filter((_,index)=>!s.changeIndexes.includes(index));
 assert.equal(after.checkedPaths.length,before.checkedPaths.length-s.paths.length);
 for(const k of Object.keys(before))if(!['checkedPaths','checkedValues','changes'].includes(k))assert.deepEqual(after[k],before[k]);
 for(const p of after.checkedPaths)assert.deepEqual(after.checkedValues[p],before.checkedValues[p]);
 proposedReviews[s.index]=after;
 registrations.push({reviewRecordIndex:s.index,collection:'spells',id:s.id,checker:s.checker,disposition:'withdraw-obsolete-current-application-only; current body remains unchecked',beforeReviewRecordSha256:hash(before),afterReviewRecordSha256:hash(after),withdrawnChecks,withdrawnChanges,retainedCheckedPaths:after.checkedPaths,retainedChanges:after.changes,beforeReviewRecord:before,proposedActiveReviewRecord:after});
}
assert.equal(registrations.flatMap(r=>r.withdrawnChecks).length,25);
assert.equal(registrations.flatMap(r=>r.withdrawnChanges).length,4);
assert.equal(new Set(registrations.flatMap(r=>r.withdrawnChecks.map(p=>`${r.id}:${p.path}`))).size,24);
for(let i=0;i<1210;i++)if(!specs.some(s=>s.index===i))assert.deepEqual(proposedReviews[i],ledger.reviewRecords[i]);
const beforeRebuild=buildLedger(data,ledger.reviewRecords,{alreadyNormalized:true});
const candidate=buildLedger(data,proposedReviews,{alreadyNormalized:true});
assert.equal(beforeRebuild.validation.staleChanges.length,4);assert.equal(beforeRebuild.counts.staleProposalFields,22);
assert.deepEqual(validateLedger(candidate,data),[]);
const fieldMap=l=>new Map(l.records.flatMap(r=>r.fields.map(f=>[`${r.collection}:${r.id}:${f.path}`,f])));
const a=fieldMap(beforeRebuild),b=fieldMap(candidate),statusChanges=[];
for(const [key,before] of a){const after=b.get(key);assert(after);if(!same(before,after)){assert.equal(before.status,'stale-proposal');assert.equal(after.status,'unchecked');assert.equal(after.inspected,false);assert.deepEqual(after.checkers,[]);assert.deepEqual(before.value,after.value);statusChanges.push({key,before,after});}}
assert.equal(statusChanges.length,22);
const baseRebuild=buildLedger(beforeData,ledger.reviewRecords,{alreadyNormalized:true});
const baseFields=fieldMap(baseRebuild),unchangedFieldChanges=[];
for(const [key,field] of b){const old=baseFields.get(key);if(old&&same(old.value,field.value)&&!same(old,field))unchangedFieldChanges.push({key,before:old,after:field});}
assert.deepEqual(unchangedFieldChanges,[]);
const changedPresent=changed.filter(c=>c.afterPresent);
for(const c of changedPresent)assert.equal(b.get(`spells:${c.id}:${c.path}`).status,'unchecked');
const manual=json('research/field-evidence-bindings.json'),canonical=json('research/price-source-inventory.json'),baseCanonical=JSON.parse(git('research/price-source-inventory.json'));
const overlaps=(p,id)=>typeof p==='string'&&p!==''&&changed.some(c=>c.id===id&&(p===c.path||p.startsWith(c.path+'/')||c.path.startsWith(p+'/')));
const relevant=canonical.fieldEvidenceBindings.map((binding,index)=>({index,binding})).filter(({binding})=>binding.collection==='spells'&&ids.includes(binding.itemId));
const manualRelevant=manual.bindings.filter(binding=>binding.collection==='spells'&&ids.includes(binding.itemId));
assert.equal(manual.bindings.length,807);assert.equal(baseCanonical.fieldEvidenceBindings.length,4681);assert.equal(canonical.fieldEvidenceBindings.length,4705);assert.equal(relevant.length,12);assert.equal(manualRelevant.length,0);
assert.deepEqual(relevant.filter(({binding:b})=>overlaps(b.fieldPointer,b.itemId)||overlaps(b.sourceObjectPointer,b.itemId)),[]);
for(const {binding} of relevant){assert.equal(binding.reviewStatus,'field-target-pending');assert.equal(binding.targetReview,null);assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');assert(baseCanonical.fieldEvidenceBindings.some(old=>same(old,binding)));}
const inventory=write('exact-checked-field-overlap-inventory-v1.json',{
 schemaVersion:1,artifactType:'read-only-UA-source-mechanics-overlap-inventory',status:'candidate inventory; no active ledger changes',baseCommit:base,actualMergedWeaponDependency:actualMergedDependency,inputs:pins,
 counts:{historicalReviewRecords:1210,changedBodyLeafPointers:44,changedCurrentBodyLeafPointers:changedPresent.length,affectedReviewRecords:6,withdrawnCheckedRecordPointerPairs:25,distinctWithdrawnCheckedPointers:24,obsoleteProposedChanges:4,currentStaleFields:22,manualDeclarations:807,manualOwnerDeclarations:0,baseCanonicalBindings:4681,currentCanonicalBindings:4705,pendingOwnerBindings:12,nonemptyReferenceBindings:relevant.filter(x=>x.binding.fieldPointer!=='').length,bodyTargetOverlaps:0},
 changedBodyLeaves:changed,checkedRecordPointerPairs:registrations.flatMap(r=>r.withdrawnChecks.map(p=>({reviewRecordIndex:r.reviewRecordIndex,checker:r.checker,id:r.id,...p}))),obsoleteChanges:registrations.flatMap(r=>r.withdrawnChanges.map(c=>({reviewRecordIndex:r.reviewRecordIndex,checker:r.checker,id:r.id,...c}))),bindingInventory:relevant,
 sourceOnlyContentReview:{path:'research/source-audit-pass8-ua-content-phb-join-independent-review-v1.json',sha256:sha(read('research/source-audit-pass8-ua-content-phb-join-independent-review-v1.json')),status:'explicitly does not approve source-value or mechanics grades; cannot authorize corrected-and-checked records'},
});
const transition=write('exact-withdrawal-registration-candidate-v1.json',{
 schemaVersion:1,artifactType:'off-ledger-exact-UA-mechanics-withdrawal-registration-candidate',status:'PROPOSAL ONLY; NOT LOADED BY ANY PRODUCTION API',baseCommit:base,actualMergedWeaponDependency:actualMergedDependency,beforeFixture:beforeFixtureRef,originalReviewRecordCount:1210,originalReviewRecordsCanonicalSha256:hash(ledger.reviewRecords),proposedActiveReviewRecordsCanonicalSha256:hash(proposedReviews),
 policy:{oldRecords:'All1210 original records preserved exactly in immutable compressed historical evidence;1204 active records and order remain exact; only six declared active application records have bounded withdrawals.',activePrefixCaveat:'This existing-API option preserves the old1210 historically. It does not keep all1210 active reviewRecords byte-identical. If active-prefix immutability is required, the current producer has no retirement API and a separately reviewed exact evaluation overlay is needed.',sourceValueGrade:'NOT PROMOTED',defaultNewBodyStatus:'unchecked',noSourceValueApprovalAdded:true,noUnchangedChecksWithdrawn:true},
 registrations,
});
const dryRun=write('in-memory-replay-receipt-v1.json',{
 schemaVersion:1,artifactType:'read-only-in-memory-existing-mechanics-API-replay',status:'existing API candidate replay succeeds; active ledger remains unchanged',inventory,transition,beforeFixture:beforeFixtureRef,existingApi:'buildLedger(data, proposedReviews, {alreadyNormalized:true}); validateLedger(result,data)',
 priorSavedCounts:ledger.counts,baseRegeneratedCounts:baseRebuild.counts,currentUnmodifiedEvidenceCounts:beforeRebuild.counts,currentUnmodifiedEvidenceErrors:validateLedger(beforeRebuild,data),candidateCounts:candidate.counts,candidateValidationErrors:validateLedger(candidate,data),
 checks:{old1210ReviewRecordsPreservedInBeforeFixture:true,other1204ActiveRecordsExact:true,sixRecordOtherPropertiesExact:true,retainedCheckedPaths:registrations.reduce((n,r)=>n+r.retainedCheckedPaths.length,0),retainedProposedChanges:registrations.reduce((n,r)=>n+r.retainedChanges.length,0),unchangedValueFieldDispositionChanges:unchangedFieldChanges.length,currentChangedBodyLeavesAllUnchecked:changedPresent.length,onlyCurrentStatusChanges:statusChanges.length,allStatusChanges:'stale-proposal to unchecked; inspected false and no checkers',allUnchangedBodyAndOtherChecksExact:true,sourceOrMetadataFilesWritten:0},statusChanges,
});
for(const [p,h] of Object.entries(pins))assert.equal(sha(read(p)),h,`changed protected input ${p}`);
console.log(JSON.stringify({inventory,transition,dryRun,beforeFixture:beforeFixtureRef,counts:inventory&&{pairs:25,changes:4,currentStatusWithdrawals:22,retainedCheckedPaths:48,retainedChanges:5},candidateCounts:candidate.counts}));
