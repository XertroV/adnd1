import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('the actual unpublished v2 draft with stale PHB/MM summaries is preserved and rejected',()=>{
 const zipped=readFileSync(path.join(root,'tests/fixtures/source-audit-pass8-unit-join-v2-unpublished-draft-before-summary-fix.json.gz'));
 assert.equal(sha(zipped),'aae7e406d687c320240116250713a8750aea9a230a350846962648177aea6645');
 const raw=gunzipSync(zipped);assert.equal(sha(raw),'035932e8b7bd3757b7052200401709a368c9cb711b9e7b06c31ab898ebe8baba');assert.equal(raw.length,6949123);
 const before=JSON.parse(raw);assert.equal(before.unitJoins.length,559);
 assert.equal(before.summary.reviewStateCountsByBook.PHB['bounded review has an explicitly unassessable source reading'],18);
 const temp=mkdtempSync(path.join(os.tmpdir(),'vault-unit-draft-'));
 try{
  const input=path.join(temp,'actual-unpublished-draft.json');writeFileSync(input,raw);
  const result=spawnSync(process.env.PYTHON||'python3',[path.join(root,'tools/source-audit-pass8-original-unit-join-v2.py'),'--validate-json',input],{encoding:'utf8'});
  assert.equal(result.status,1);assert.match(result.stderr,/review.state|summary/i);assert.match(result.stderr,/PHB|MM/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
