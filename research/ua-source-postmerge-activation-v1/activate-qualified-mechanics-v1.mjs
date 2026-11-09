import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {buildLedger,validateLedger,renderSummary} from '../../tools/mechanics-audit.mjs';

const root=path.resolve(import.meta.dirname,'../..'),out=import.meta.dirname,base='6717c6f22bbf2f2b421327e4c8561b1d81df00d4';
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex'),hash=v=>sha(JSON.stringify(v));
const pins={
 'dist/data.json':'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3',
 'research/mechanics-audit-progress.json':'ba9fe216487c80100cd58e6287d8e9079af5fc5eff1af11f03125a4f44492be1',
 'research/ua-mechanics-withdrawal-proposal-v1/proposal-manifest-v1.json':'27fcfb06afc8e578ebc7d74b0491231a242bb4722ea80c6d50958d375623de94',
 'research/source-audit-pass8-ua-mechanics-withdrawal-monetary-independent-review-v1.json':'3cd06e3227b9b3e89703725cea73c2dfdcafd1eac222e571ffd24820e55b16c6',
 'research/source-audit-pass8-ua-source-native-integration-independent-review-v1.json':'4ebdf3548f6ba33f1d8f95d3cacc6b218196340898815dbdf6abeddd2e3c09b5',
};
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),base);
for(const [p,h] of Object.entries(pins))assert.equal(sha(read(p)),h,p);
const beforeRaw=read('research/mechanics-audit-progress.json'),before=JSON.parse(beforeRaw),data=json('dist/data.json');
const t=json('research/ua-mechanics-withdrawal-proposal-v1/exact-withdrawal-registration-candidate-v1.json'),combined=json('research/ua-mechanics-withdrawal-proposal-v1/explicit-pending-registration-and-replay-v1.json');
assert.deepEqual(gunzipSync(read(t.beforeFixture.path)),beforeRaw);
assert.equal(before.reviewRecords.length,1210);assert.equal(t.registrations.length,6);assert.equal(combined.appendedPendingReviewRecords.length,5);
const reviews=structuredClone(before.reviewRecords);
for(const r of t.registrations){
 assert.equal(hash(reviews[r.reviewRecordIndex]),r.beforeReviewRecordSha256);
 assert.equal(hash(r.proposedActiveReviewRecord),r.afterReviewRecordSha256);
 assert.deepEqual(reviews[r.reviewRecordIndex],r.beforeReviewRecord);
 const expected=structuredClone(r.beforeReviewRecord),paths=r.withdrawnChecks.map(p=>p.path),indexes=r.withdrawnChanges.map(c=>c.index);
 expected.checkedPaths=expected.checkedPaths.filter(p=>!paths.includes(p));for(const p of paths)delete expected.checkedValues[p];expected.changes=expected.changes.filter((_,i)=>!indexes.includes(i));
 assert.deepEqual(r.proposedActiveReviewRecord,expected);
 reviews[r.reviewRecordIndex]=structuredClone(r.proposedActiveReviewRecord);
}
for(let i=0;i<1210;i++)if(!t.registrations.some(r=>r.reviewRecordIndex===i))assert.deepEqual(reviews[i],before.reviewRecords[i]);
for(const r of combined.appendedPendingReviewRecords){assert.deepEqual(r.checkedPaths,[]);assert.deepEqual(r.checkedValues,{});assert.deepEqual(r.reviewedPaths,[]);assert.deepEqual(r.sources,[]);assert.deepEqual(r.changes,[]);assert(r.unresolved.every(u=>/pending/i.test(u.reason)));}
reviews.push(...structuredClone(combined.appendedPendingReviewRecords));assert.equal(reviews.length,1215);
assert.equal(hash(reviews),'cfad75c6e4385af44edc85fe655d5913e2851aa2b948b7dfaf13e6ff01c6065e');
const after=buildLedger(data,reviews,{alreadyNormalized:true});assert.deepEqual(validateLedger(after,data),[]);assert.deepEqual(after.counts,combined.counts);
const f=l=>new Map(l.records.flatMap(r=>r.fields.map(v=>[`${r.collection}:${r.id}:${v.path}`,v]))),oldCurrent=buildLedger(data,before.reviewRecords,{alreadyNormalized:true}),a=f(oldCurrent),b=f(after),statusChanges=[];
for(const [key,v] of a){const n=b.get(key);if(v.status!==n.status){assert.equal(v.status,'stale-proposal');assert.equal(n.status,'unchecked');statusChanges.push({key,before:v,after:n});}}
assert.equal(statusChanges.length,22);assert.equal(b.get('spells:ua-magic-user-bind:/effect/0').status,'source-checked');
const afterBytes=Buffer.from(JSON.stringify(after,null,2)+'\n'),summaryBytes=Buffer.from(renderSummary(after));
// This is the only authorized activation: canonical normalized ledger and its producer summary.
fs.writeFileSync(path.join(root,'research/mechanics-audit-progress.json'),afterBytes);
fs.writeFileSync(path.join(root,'research/mechanics-audit-progress.md'),summaryBytes);
assert.equal(sha(read('dist/data.json')),pins['dist/data.json']);
const receipt={schemaVersion:1,artifactType:'actual-merged-base exact UA mechanics evidence withdrawal activation',baseCommit:base,sourcePhaseOnly:true,approvalEvidence:pins,originalHistoricalReviewRecords:1210,originalReviewRecordsFixture:t.beforeFixture,unchangedOtherActiveRecords:1204,qualifiedActiveRecords:6,withdrawnCheckedRecordPointerPairs:25,withdrawnDistinctCheckedPointers:24,withdrawnObsoleteChanges:4,retainedCheckedPaths:48,retainedCorrections:5,appendedEmptyCheckPendingRecords:5,explicitCurrentChangedPendingLeaves:41,resultingActiveReviewRecords:1215,resultingCanonicalReviewRecordsSha256:hash(reviews),beforeSavedCounts:before.counts,currentBeforeActivationCounts:oldCurrent.counts,afterCounts:after.counts,beforePercentages:before.percentages,afterPercentages:after.percentages,statusChanges,beforeLedgerSha256:sha(beforeRaw),afterLedgerSha256:sha(afterBytes),afterSummarySha256:sha(summaryBytes),validationErrors:validateLedger(after,data),existingProducer:'buildLedger(data,reviews,{alreadyNormalized:true}); renderSummary(after)',newSourceValueApprovals:0,newFieldTargetApprovals:0,noRootMatchingRawProposalFileAdded:true,sourceDataUnchanged:true,metadataRefresh:false,limits:['Old checked snapshots and obsolete corrections remain exact historical evidence; their current application is withdrawn only for the declared changed pointers.','Changed source-only body assertions remain unchecked, including moved Bind assertions; unchanged Bind/effect/0 retains its original checked grade.','Source-review transport acceptance does not approve mechanics values, overlay geometry or monetary meaning.']};
fs.writeFileSync(path.join(out,'mechanics-activation-result-v1.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({reviews:1215,withdrawnPairs:25,withdrawnChanges:4,pendingLeaves:41,statusChanges:22,validationErrors:[],afterLedgerSha256:sha(afterBytes),afterSummarySha256:sha(summaryBytes),counts:after.counts,percentages:after.percentages}));
