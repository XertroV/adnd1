import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {P175_HISTORICAL_MODULE as pin,assertHistoricalP175ModuleInputs} from '../research/class-mapping-history-v1/p175-historical-module-contract-v1.mjs';

const git=(...args)=>execFileSync('/usr/bin/git',args,{maxBuffer:128*1024*1024});
const input={currentSummary:{sourceCommit:pin.currentSourceCommit,sourceTree:git('rev-parse',`${pin.currentSourceCommit}^{tree}`).toString('utf8').trim()},historicalTree:git('rev-parse',`${pin.commit}^{tree}`).toString('utf8').trim(),moduleBytes:git('show',`${pin.commit}:${pin.path}`),historicalBooksBytes:git('show',`${pin.commit}:${pin.booksPath}`),currentBooksBytes:readFileSync(resolve(pin.booksPath))};
const run=changes=>assertHistoricalP175ModuleInputs({...input,...changes});
const changed=bytes=>{const copy=Buffer.from(bytes);copy[0]^=1;return copy;};
test('exact H module bytes and identical current Books pass the fixed transport contract',()=>{
  const result=run();assert.equal(result.historicalModuleSha256,pin.sha256);assert.equal(result.currentSourceCommit,pin.currentSourceCommit);
});
test('a current S1 projector cannot masquerade as the historical H module',()=>{
  assert.throws(()=>run({moduleBytes:readFileSync(resolve(pin.path))}),/historical module raw bytes changed/);
});
test('changed H source and historical Books bytes reject',()=>{
  assert.throws(()=>run({moduleBytes:changed(input.moduleBytes)}),/historical module raw bytes changed/);
  assert.throws(()=>run({historicalBooksBytes:changed(input.historicalBooksBytes)}),/historical Books raw bytes changed/);
});
test('changed physical Books bytes reject even if the module bytes remain exact',()=>{
  assert.throws(()=>run({currentBooksBytes:changed(input.currentBooksBytes)}),/physical current Books raw bytes changed/);
});
test('wrong current source commit or tree rejects',()=>{
  assert.throws(()=>run({currentSummary:{...input.currentSummary,sourceCommit:'0'.repeat(40)}}),/actual fixed current source/);
  assert.throws(()=>run({currentSummary:{...input.currentSummary,sourceTree:'f'.repeat(40)}}),/actual fixed current source/);
});
test('wrong historical tree and absent raw bytes reject',()=>{
  assert.throws(()=>run({historicalTree:'0'.repeat(40)}),/exact historical module commit tree/);
  assert.throws(()=>run({moduleBytes:null}),/historical module raw bytes changed/);
});
