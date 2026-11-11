import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

function ancestors(start) {
  const output=[];
  let current=path.resolve(start);
  while(true){output.push(current);const parent=path.dirname(current);if(parent===current)break;current=parent;}
  return output;
}
const repoRoot=ancestors(process.cwd()).find(candidate=>
  fs.existsSync(path.join(candidate,'tools/mechanics-audit.mjs')) &&
  fs.existsSync(path.join(candidate,'dist/data.json')) &&
  fs.existsSync(path.join(candidate,'research/mechanics-audit-progress.json')) &&
  fs.existsSync(path.join(candidate,'research/s1-mechanics-append-review-preservation-v1/source-receipt-v1.json'))
);
if(!repoRoot)throw new Error('Run this test from the repository root; it reads the checked-out mechanics tool, body, log, and receipt.');
const audit=await import(pathToFileURL(path.join(repoRoot,'tools/mechanics-audit.mjs')).href);
const data=JSON.parse(fs.readFileSync(path.join(repoRoot,'dist/data.json'),'utf8'));
const saved=JSON.parse(fs.readFileSync(path.join(repoRoot,'research/mechanics-audit-progress.json'),'utf8'));
const reviewRecords=saved.reviewRecords;
const receiptBytes=fs.readFileSync(path.join(repoRoot,'research/s1-mechanics-append-review-preservation-v1/source-receipt-v1.json'));
const receipt=JSON.parse(receiptBytes.toString('utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const canonicalSha=value=>sha(Buffer.from(canonical(value)));
const targetRecord=ledger=>ledger.records.find(record=>record.collection==='rules'&&record.id==='intelligence-learning');
const bullets=ledger=>targetRecord(ledger).fields.filter(field=>field.path.startsWith('/bullets/'));
const run=(candidateData=data,candidateReviews=reviewRecords)=>audit.buildLedger(candidateData,candidateReviews,{alreadyNormalized:true});
const hasTransfer=ledger=>(ledger.appendOnlyReviewTransfers||[]).length===1;

assert.equal(sha(receiptBytes),'27bd1ef8ab5df182b3d1b71518ef283b97c18ce605e3d708deb354528606760c');
assert.equal(canonicalSha(receipt),'96b10efbf71a9376e868c10cac6e54980a5c0e1fe8dcc2c9fc95f1ed91111c7c');
assert.equal(sha(fs.readFileSync(path.join(repoRoot,'dist/data.json'))),receipt.currentBody.rawSha256);
assert.equal(audit.dataHash(data),receipt.currentBody.mechanicsOnlySha256);
assert.equal(reviewRecords.length,receipt.scope.oldReviewCount);
assert.equal(canonicalSha(reviewRecords),receipt.scope.completeOrderedReviewRecordsCanonicalSha256);
assert.equal(saved.input.sha256,audit.dataHash(data));

test('preserves the exact six reviewed leaves and leaves the two appended leaves unchecked',()=>{
  const ledger=run();
  assert.equal(hasTransfer(ledger),true);
  assert.deepEqual(ledger.reviewRecords,reviewRecords);
  assert.deepEqual(audit.validateLedger(ledger,data),[]);
  assert.equal(ledger.validation.staleChanges.length,0);
  assert.equal(ledger.counts.staleProposalFields,0);
  const fields=bullets(ledger);
  assert.equal(fields.length,8);
  assert.deepEqual(fields.slice(0,6).map(field=>field.status),Array(6).fill('corrected-and-checked'));
  assert.deepEqual(fields.slice(6).map(field=>field.status),['unchecked','unchecked']);
  assert.deepEqual(fields.slice(6).map(field=>[field.inspected,field.checkers,field.changePaths]),[[false,[],undefined],[false,[],undefined]]);
  assert.deepEqual(ledger.appendOnlyReviewTransfers[0].reviewedPrefixPaths,Array.from({length:6},(_,index)=>`/bullets/${index}`));
  assert.deepEqual(ledger.appendOnlyReviewTransfers[0].uncheckedAppendedPaths,['/bullets/6','/bullets/7']);
  assert.equal(ledger.counts.totalFields,14241);
  assert.equal(ledger.counts.uncheckedFields,939);
});

test('rejects a changed reviewed prefix',()=>{
  const changed=structuredClone(data);
  changed.rules.find(item=>item.id==='intelligence-learning').bullets[0]+=' changed';
  const ledger=run(changed);
  assert.equal(hasTransfer(ledger),false);
  assert.equal(ledger.validation.staleChanges.length,1);
  assert.deepEqual(bullets(ledger).slice(0,6).map(field=>field.status),Array(6).fill('stale-proposal'));
});

test('rejects a changed appended suffix',()=>{
  const changed=structuredClone(data);
  changed.rules.find(item=>item.id==='intelligence-learning').bullets[7]+=' changed';
  const ledger=run(changed);
  assert.equal(hasTransfer(ledger),false);
  assert.equal(ledger.validation.staleChanges.length,1);
});

test('rejects an extra appended suffix value',()=>{
  const changed=structuredClone(data);
  changed.rules.find(item=>item.id==='intelligence-learning').bullets.push('arbitrary ninth bullet');
  const ledger=run(changed);
  assert.equal(hasTransfer(ledger),false);
  assert.equal(ledger.validation.staleChanges.length,1);
});

test('rejects a changed review owner',()=>{
  const changed=structuredClone(reviewRecords);
  changed[receipt.scope.oldReviewIndex].id='intelligence-learning-other';
  const ledger=run(data,changed);
  assert.equal(hasTransfer(ledger),false);
  assert.equal(ledger.validation.orphanReviews.length,1);
});

test('rejects reordered review records',()=>{
  const changed=structuredClone(reviewRecords);
  [changed[0],changed[1]]=[changed[1],changed[0]];
  const ledger=run(data,changed);
  assert.equal(hasTransfer(ledger),false);
  assert.equal(ledger.validation.staleChanges.length,1);
});

test('rejects caller-supplied review values',()=>{
  const changed=structuredClone(reviewRecords);
  changed[receipt.scope.oldReviewIndex].changes[0].newValue[0]+=' caller supplied';
  const ledger=run(data,changed);
  assert.equal(hasTransfer(ledger),false);
  assert.equal(ledger.validation.staleChanges.length,1);
});
