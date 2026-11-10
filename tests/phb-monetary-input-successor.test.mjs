import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,symlinkSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadCurrentMonetarySourceQuestions,currentSourceQuestionRegistryPath} from '../tools/dmg175-current-monetary-source-questions-v1.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const fixture=JSON.parse(gunzipSync(read('tests/fixtures/pass8-phb-stale-monetary-input-before.json.gz')));
test('actual old monetary loader rejects PHB input drift; current trusted successor retains8/7/1 questions',()=>{
  assert.equal(fixture.exitCode,1);assert.match(fixture.output,/stale input research\/price-source-inventory.json/);
  assert.equal(sha(fixture.loaderBefore.utf8),fixture.loaderBefore.sha256);assert.equal(sha(fixture.registryBefore.utf8),fixture.registryBefore.sha256);
  const temp=mkdtempSync(join(tmpdir(),'phb-monetary-before-'));
  try{
    for(const name of readdirSync(root))if(name!=='tools')symlinkSync(new URL(name,root),join(temp,name));
    mkdirSync(join(temp,'tools'));
    for(const name of readdirSync(new URL('tools/',root)))if(name!=='monetary-current-source-questions.mjs')symlinkSync(new URL(`tools/${name}`,root),join(temp,'tools',name));
    writeFileSync(join(temp,'tools/monetary-current-source-questions.mjs'),fixture.loaderBefore.utf8);
    const child=spawnSync(process.execPath,['tools/monetary-current-source-questions.mjs','--check'],{cwd:temp,encoding:'utf8'});
    assert.equal(child.status,1);assert.match(child.stderr,/stale input research\/price-source-inventory.json/);
  }finally{rmSync(temp,{recursive:true,force:true});}
  const before=JSON.parse(fixture.registryBefore.utf8),after=JSON.parse(read('research/source-audit-pass8-phb-current-monetary-source-questions-v1.json'));
  const normalized=structuredClone(after);delete normalized.inputMigration;
  for(const key of ['canonical','monetaryIndex'])normalized.currentInputs[key]=before.currentInputs[key];
  assert.deepEqual(normalized,before,'all question/disposition/source evidence remains exact');
  assert.deepEqual(read(fixture.registryBefore.path),Buffer.from(fixture.registryBefore.utf8),'original registry bytes remain frozen');
  const report=loadCurrentMonetarySourceQuestions();
  assert.deepEqual(report.counts,{historicalRegisteredQuestions:8,currentUnresolvedQuestions:7,derivedAdjudications:1});
  assert.equal(report.semanticPass,false);assert.equal(report.generalSourceReviewPending,true);
  assert.deepEqual(report.records.map(r=>r.id),before.dispositions.map(r=>r.id));
  for(const row of report.records){assert.equal(row.semanticPass,false);if(row.derivedValue){assert.equal(row.printedValuePass,false);assert.equal(row.derivedValue.isSourcePrinted,false);}}
});
