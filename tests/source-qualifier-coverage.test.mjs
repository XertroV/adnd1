import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sourceQualifierCoverage} from '../tools/source-qualifier-coverage.mjs';
const root=new URL('..',import.meta.url);
const historical=()=>JSON.parse(execFileSync('git',['show','679b15d:dist/data.json'],{cwd:root,maxBuffer:32*1024*1024}));
test('actual historical familiar death statement loses the normal-familiar qualifier',()=>{
  const report=sourceQualifierCoverage(historical());
  assert.equal(report.counts.fields,13418);
  assert.equal(report.contracts[0].status,'missing-required-qualifier');
  assert.ok(report.candidates.some(r=>r.itemId==='phb-magic-user-find-familiar'&&r.path==='/effect/1'&&/normal/i.test(r.value)));
});
test('current authored familiar penalty retains its source scope',()=>{
  const data=historical(),authored=JSON.parse(readFileSync(new URL('../phb-magic-user-extra.json',import.meta.url)));
  data.spells=data.spells.map(s=>authored.spells.find(a=>a.id===s.id)||s);
  assert.equal(sourceQualifierCoverage(data).contracts[0].status,'present');
});
