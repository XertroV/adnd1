import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {loadUaSourceHandoffTransition,uaSourceHandoffContextMatches,uaSourceHandoffTransitionPath} from '../tools/ua-source-handoff-transition.mjs';
import {validateApprovedTransitions,reconcileCuratedNotes} from '../tools/refresh-gaps-handoff.mjs';

const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p)),json=p=>JSON.parse(read(p)),hashFile=p=>createHash('sha256').update(read(p)).digest('hex');
const baselineData=JSON.parse(execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:dist/data.json'],{cwd:root,maxBuffer:40*1024*1024}));
const baselineHandoff=JSON.parse(execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:research/gaps-limitations-next-task.json'],{cwd:root,maxBuffer:10*1024*1024}));
const priorHandoff=JSON.parse(execFileSync('git',['show','6b3cfc8cb421a2c1fc2379c38abebe2075634981:research/gaps-limitations-next-task.json'],{cwd:root,maxBuffer:10*1024*1024}));
const currentData=json('dist/data.json'),mechanics=json('research/mechanics-audit-progress.json'),conflictReceipt=json('research/source-audit-batch5-conflict-integration.json'),animalReceipt=json('research/source-audit-batch5-unextracted.json'),classRetirementReceipt=json('research/source-audit-batch5-class-retired-ledger.json');
const context={baselineData,currentData,mechanics,conflictReceipt},args={...context,animalReceipt,classRetirementReceipt};
const sourceBodyTransition=loadUaSourceHandoffTransition({...context,read:json,hashFile});

test('exact source6b qualification keeps the old guard and current body pending',()=>{
 assert.throws(()=>validateApprovedTransitions(args),/conflict receipt no longer exactly matches/);
 const transitions=validateApprovedTransitions({...args,sourceBodyTransition});
 assert.equal(transitions.length,12);
 const qualified=transitions.filter(r=>r.kind==='historical-source-body-transition-qualified');assert.equal(qualified.length,1);
 assert.equal(qualified[0].itemId,'ua-druid-ceremony');assert.equal(qualified[0].pointer,'/exceptions/0');assert.equal(qualified[0].currentFieldStatus,'unchecked');assert.equal(qualified[0].sourceValueGrade,'NOT PROMOTED');
 assert.equal(mechanics.reviewRecords.length,1215);assert.equal(mechanics.counts.staleProposalFields,0);
});

test('wrong receipt/source/owner/pointer/value or additional conflict rows fail closed',()=>{
 for(const change of [q=>q.sourceInputCommit='6717c6f22bbf2f2b421327e4c8561b1d81df00d4',q=>q.sourceData.rawSha256='0'.repeat(64),q=>q.qualifiedTarget.itemId='ua-cleric-ceremony',q=>q.qualifiedTarget.pointer='/exceptions/1',q=>q.qualifiedTarget.currentValue+=' changed']){
  const q=structuredClone(sourceBodyTransition);change(q);assert.throws(()=>validateApprovedTransitions({...args,sourceBodyTransition:q}),/qualification does not match/);
 }
 const data=structuredClone(currentData);data.rules[0].summary+=' changed';assert.throws(()=>validateApprovedTransitions({...args,currentData:data,sourceBodyTransition}),/qualification does not match/);
 const receipt=structuredClone(conflictReceipt);receipt.changes[0].newValue='unapproved';assert.throws(()=>validateApprovedTransitions({...args,conflictReceipt:receipt,sourceBodyTransition}),/qualification does not match/);
 const duplicate=structuredClone(conflictReceipt);duplicate.changes.push(structuredClone(duplicate.changes[4]));assert.throws(()=>validateApprovedTransitions({...args,conflictReceipt:duplicate,sourceBodyTransition}),/qualification does not match/);
});

test('qualification rejects hidden/nonJSON/proxy/spoofed values and changed mechanics grade',()=>{
 for(const mutate of [q=>q.hidden=undefined,q=>Object.defineProperty(q,'hidden',{value:1}),q=>q.hidden=NaN,q=>q.hidden=-0,q=>q.hidden=()=>1,q=>q.hidden=new Proxy({},{}),q=>q.toJSON=()=>sourceBodyTransition]){
  const q=structuredClone(sourceBodyTransition);mutate(q);assert.equal(uaSourceHandoffContextMatches(q,context),false);
 }
 const changed=structuredClone(mechanics);changed.records.find(r=>r.id==='ua-druid-ceremony').fields.find(f=>f.path==='/exceptions/0').status='source-checked';
 assert.throws(()=>loadUaSourceHandoffTransition({...context,mechanics:changed,read:json,hashFile}),/pending field grade/);
 assert.throws(()=>loadUaSourceHandoffTransition({...context,read:p=>p===uaSourceHandoffTransitionPath?{...json(p),sourceInputCommit:'wrong'}:json(p),hashFile}),/qualification identity/);
});

test('only the exact historical caution changes history; all unrelated dispositions remain exact',()=>{
 const options={...args,currentHandoff:priorHandoff,curatedNotes:baselineHandoff.mechanicsAudit.specificReviewNoteCandidates.notes,conflictReceiptSha256:hashFile('research/source-audit-batch5-conflict-integration.json'),classRetirementReceiptSha256:hashFile('research/source-audit-batch5-class-retired-ledger.json'),animalReceiptSha256:hashFile('research/source-audit-batch5-unextracted.json')};
 assert.throws(()=>reconcileCuratedNotes(options),/unreceipted caution transition/);
 const result=reconcileCuratedNotes({...options,sourceBodyTransition}),row=result.history.find(r=>r.baselineIndex===70);
 assert.equal(row.disposition,'historical-reviewed-correction-replaced-by-pending-source-body');assert.equal(row.currentFieldStatus,'unchecked');assert.equal(row.sourceValueGrade,'NOT PROMOTED');assert.deepEqual(row.priorHandoffDisposition,sourceBodyTransition.priorHandoffDisposition);
 assert.deepEqual(result.history.filter(r=>r.itemId!=='ua-druid-ceremony'),priorHandoff.mechanicsAudit.specificReviewNoteCandidates.history.filter(r=>r.itemId!=='ua-druid-ceremony'));
 assert.deepEqual(classRetirementReceipt,JSON.parse(execFileSync('git',['show','6b3cfc8cb421a2c1fc2379c38abebe2075634981:research/source-audit-batch5-class-retired-ledger.json'],{cwd:root,encoding:'utf8'})));
 const changed=structuredClone(options.curatedNotes);changed[70].reason+=' changed';assert.throws(()=>reconcileCuratedNotes({...options,curatedNotes:changed,sourceBodyTransition}),/unreceipted caution transition/);
});
