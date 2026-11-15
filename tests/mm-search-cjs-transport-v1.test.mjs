import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {assertHistoricalSearchCjsTransport,MM_SEARCH_CJS_STATES} from '../research/class-mapping-history-v1/mm-search-cjs-transport-v1.mjs';

const repo=process.cwd();
const state=MM_SEARCH_CJS_STATES;
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:null,stdio:['ignore','pipe','pipe']});
const manifest=JSON.parse(readFileSync(path.join(repo,'research/class-mapping-history-v1/mm-test-input-manifest-v6.json'),'utf8'));
const oldPin=manifest.files.find(row=>row.path===state.historical.path);
const oldBlob=git('show',`${state.historical.commit}:${state.historical.path}`);
const currentBlob=git('show',`${state.currentS1.commit}:${state.currentS1.path}`);
const physical=readFileSync(path.join(repo,state.currentS1.path));
const tree=git('rev-parse',`${state.currentS1.commit}^{tree}`).toString().trim();
const currentSummary={sourceCommit:state.currentS1.commit,sourceTree:tree};
const run=overrides=>assertHistoricalSearchCjsTransport({
  currentSummary,historicalManifestPin:oldPin,historicalGitBlob:oldBlob,
  currentS1GitBlob:currentBlob,physicalCurrentBytes:physical,...overrides,
});

test('validates the immutable a29 Git blob while matching physical search to the exact S1 Git blob',()=>{
  assert.equal(tree,state.currentS1.tree);
  const result=run();
  assert.equal(result.status,'historical-a29-and-current-s1-search-identities-verified');
  assert.equal(result.historicalSha256,state.historical.sha256);
  assert.equal(result.currentSha256,state.currentS1.sha256);
});

test('keeps the old exact physical checks for books.js and citations.js',()=>{
  for(const modulePath of ['dist/books.js','dist/citations.js']){
    const pin=manifest.files.find(row=>row.path===modulePath);
    const old=git('show',`${state.historical.commit}:${modulePath}`);
    const present=readFileSync(path.join(repo,modulePath));
    assert.ok(pin,`${modulePath} retains its manifest pin`);
    assert.deepEqual(present,old,`${modulePath} remains byte-identical to a29`);
    assert.equal(present.length,pin.sizeBytes);
  }
});

test('keeps historical a29 bytes distinct from the current physical search module',()=>{
  assert.notDeepEqual(oldBlob,physical);
  assert.throws(()=>run({physicalCurrentBytes:oldBlob}),/physical current search file differs|physical current search bytes/);
});

test('rejects a modified current physical search file',()=>{
  const changed=Buffer.from(physical);changed[0]^=1;
  assert.throws(()=>run({physicalCurrentBytes:changed}),/physical current search bytes do not match/);
});

test('rejects a different S1 source commit or tree',()=>{
  assert.throws(()=>run({currentSummary:{...currentSummary,sourceCommit:'f'.repeat(40)}}),/fixed current S1 source commit and tree/);
  assert.throws(()=>run({currentSummary:{...currentSummary,sourceTree:'e'.repeat(40)}}),/fixed current S1 source commit and tree/);
});

test('rejects a changed historical manifest pin or Git blob',()=>{
  assert.throws(()=>run({historicalManifestPin:{...oldPin,sha256:'0'.repeat(64)}}),/immutable a29 manifest pin/);
  const changed=Buffer.from(oldBlob);changed[0]^=1;
  assert.throws(()=>run({historicalGitBlob:changed}),/a29 historical search bytes do not match/);
});

test('rejects a substituted current S1 Git blob even when the filesystem bytes are unchanged',()=>{
  const changed=Buffer.from(currentBlob);changed[0]^=1;
  assert.throws(()=>run({currentS1GitBlob:changed}),/current S1 Git search bytes do not match/);
});
