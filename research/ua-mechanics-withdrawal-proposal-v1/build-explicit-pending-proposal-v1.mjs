// This only writes separately named prospective receipts in this research folder.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {isDeepStrictEqual as same} from 'node:util';
import {buildLedger,validateLedger} from '../../tools/mechanics-audit.mjs';
const root=path.resolve(import.meta.dirname,'../..'),out=import.meta.dirname;
const sha=b=>createHash('sha256').update(b).digest('hex'),hash=v=>sha(JSON.stringify(v));
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p));
const prefix='research/ua-mechanics-withdrawal-proposal-v1/';
const inputRefs=['exact-checked-field-overlap-inventory-v1.json','exact-withdrawal-registration-candidate-v1.json','in-memory-replay-receipt-v1.json'].map(name=>({path:prefix+name,sha256:sha(read(prefix+name))}));
const inventory=json(inputRefs[0].path),transition=json(inputRefs[1].path),data=json('dist/data.json'),saved=json('research/mechanics-audit-progress.json');
assert.equal(sha(read('research/mechanics-audit-progress.json')),'ba9fe216487c80100cd58e6287d8e9079af5fc5eff1af11f03125a4f44492be1');
assert.equal(sha(read('dist/data.json')),'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3');
const active=structuredClone(saved.reviewRecords);
for(const r of transition.registrations){assert.equal(hash(active[r.reviewRecordIndex]),r.beforeReviewRecordSha256);active[r.reviewRecordIndex]=r.proposedActiveReviewRecord;}
const sixOnly=buildLedger(data,active,{alreadyNormalized:true});assert.deepEqual(validateLedger(sixOnly,data),[]);
const pendingChecker='mechanics-ua-source-body-transition-pending-v1';
const pending=Array.from(new Set(inventory.changedBodyLeaves.map(c=>c.id)),id=>({
 checker:pendingChecker,collection:'spells',id,checkedPaths:[],checkedValues:{},reviewedPaths:[],sources:[],
 unresolved:inventory.changedBodyLeaves.filter(c=>c.id===id&&c.afterPresent).map(c=>({path:c.path,reason:'Pending separate mechanics-field review after the source-only UA body expansion; no source-value or field-target approval is recorded for this revised assertion.'})),changes:[],
}));
assert.equal(pending.length,5);assert.equal(pending.flatMap(r=>r.unresolved).length,41);
const candidate=buildLedger(data,[...active,...pending],{alreadyNormalized:true});assert.deepEqual(validateLedger(candidate,data),[]);
assert.deepEqual(candidate.counts,sixOnly.counts);
const fields=l=>new Map(l.records.flatMap(r=>r.fields.map(f=>[`${r.collection}:${r.id}:${f.path}`,f])));
const previous=fields(sixOnly),current=fields(candidate),changedFields=[];
const allowed=new Set(inventory.changedBodyLeaves.filter(c=>c.afterPresent).map(c=>`spells:${c.id}:${c.path}`));
for(const [key,before] of previous){const after=current.get(key);if(!same(before,after)){assert(allowed.has(key));assert.equal(before.status,'unchecked');assert.equal(after.status,'unchecked');assert.equal(after.inspected,false);assert.deepEqual(after.checkers,[pendingChecker]);changedFields.push({key,before,after});}}
assert.equal(changedFields.length,41);
// Negative: appending broad parent unresolved paths would demote a retained check.
const broad=pending.map(p=>({...p,unresolved:[...new Set(p.unresolved.map(u=>'/'+u.path.split('/')[1]))].map(path=>({path,reason:'Pending separate mechanics-field review.'}))}));
assert.equal(broad.flatMap(p=>p.unresolved).length,12);
const broadLedger=buildLedger(data,[...active,...broad],{alreadyNormalized:true});
const retainedBindKey='spells:ua-magic-user-bind:/effect/0';
assert.equal(previous.get(retainedBindKey).status,'source-checked');
assert.equal(fields(broadLedger).get(retainedBindKey).status,'unchecked');
// Negative: adding an unchecked note does not retire old checked values or changes.
const noteOnly=buildLedger(data,[...saved.reviewRecords,...pending],{alreadyNormalized:true});
assert.equal(noteOnly.counts.staleProposalFields,22);assert.equal(noteOnly.validation.staleChanges.length,4);
// Reproduce normalization of original raw proposals entirely in memory. No CLI writes.
const originalProposals=Array.from(new Set(saved.reviewRecords.map(r=>r.checker)),checker=>({checker,records:saved.reviewRecords.filter(r=>r.checker===checker)}));
const oldProposalReplay=buildLedger(data,originalProposals,{previousReviews:[...active,...pending]});
assert.equal(oldProposalReplay.validation.staleChanges.length,4);assert(validateLedger(oldProposalReplay,data).length>0);
const localProposalFiles=fs.readdirSync(path.join(root,'research')).filter(x=>/^mechanics-.*\.json$/.test(x)&&x!=='mechanics-audit-progress.json').sort();
assert.deepEqual(localProposalFiles,[]);
const doc={
 schemaVersion:1,artifactType:'off-ledger-UA-mechanics-withdrawal-with-explicit-pending-records-candidate',status:'PROPOSAL ONLY; no active ledger, source or metadata writes',inputs:inputRefs,baseCommit:transition.baseCommit,actualMergedWeaponDependency:transition.actualMergedWeaponDependency,
 originalHistoricalReviewRecords:1210,activeRecordReplacements:transition.registrations.map(r=>({index:r.reviewRecordIndex,beforeReviewRecordSha256:r.beforeReviewRecordSha256,afterReviewRecordSha256:r.afterReviewRecordSha256})),original1204OtherActiveRecordsExact:true,appendedPendingReviewRecords:pending,proposedActiveReviewRecordCount:1215,proposedActiveReviewRecordsCanonicalSha256:hash(candidate.reviewRecords),
 counts:candidate.counts,validationErrors:validateLedger(candidate,data),currentChangedBodyLeavesExplicitlyUnchecked:41,unchangedFieldsWholeObjectsPreserved:true,retainedUnchangedBindEffect0:current.get(retainedBindKey),
 negativeControls:{
  broad12PropertyUnresolvedRecords:{rejected:true,reason:'Unresolved matching precedes old source-checked status and demotes unchanged Bind/effect/0.',retainedFieldBefore:previous.get(retainedBindKey),incorrectBroadFieldAfter:fields(broadLedger).get(retainedBindKey)},
  appendPendingWithoutWithdrawal:{rejected:true,counts:noteOnly.counts,validationErrors:validateLedger(noteOnly,data)},
  originalRawProposalRegeneration:{rejected:true,oldNormalizedRecords:1210,proposalGroups:originalProposals.length,counts:oldProposalReplay.counts,validationErrors:validateLedger(oldProposalReplay,data),staleChanges:oldProposalReplay.validation.staleChanges,
   warning:'Re-importing historical raw checkedPaths after withdrawal would refill missing checkedValues from current data during normalization; four stale old corrections still make the result invalid. Never treat this invalid intermediate output as an approved ledger. Required integration path is --from-log from the six qualified records plus five explicit pending records. The current CLI writes non-check output before a separate validation, so do not probe this route against active files.'},
 },
 currentDefaultCliMode:{localMechanicsProposalFiles:localProposalFiles,actualBranch:'No raw proposal files present: both --from-log and no-proposals default use alreadyNormalized saved reviewRecords. --from-log remains the required explicit provenance-preserving invocation.'},
 currentChangedFieldPendingAnnotations:changedFields,
 scope:'Six exact active withdrawals preserve all old1210 records in compressed historical evidence,48 retained checked paths and5 retained corrections. Five empty-check records annotate41 current changed leaves spanning12 changed body properties. No mechanics approval, field-target activation, citation/raster/monetary refresh or historical-helper edit.',
};
const bytes=Buffer.from(JSON.stringify(doc,null,2)+'\n'),name='explicit-pending-registration-and-replay-v1.json';fs.writeFileSync(path.join(out,name),bytes);
for(const ref of inputRefs)assert.equal(sha(read(ref.path)),ref.sha256);assert.equal(sha(read('research/mechanics-audit-progress.json')),'ba9fe216487c80100cd58e6287d8e9079af5fc5eff1af11f03125a4f44492be1');
console.log(JSON.stringify({path:prefix+name,sha256:sha(bytes),bytes:bytes.length,counts:candidate.counts,pendingRecords:5,pendingLeaves:41,oldRawProposalReplayErrors:validateLedger(oldProposalReplay,data)}));
