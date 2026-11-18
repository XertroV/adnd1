import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {
  assertHistoricalSearchCjsTransportSource2,
  MM_SEARCH_CJS_SOURCE2_STATES,
} from '../research/class-mapping-history-v1/mm-search-cjs-transport-source2-v2.mjs';

// Run this test with cwd at the actual Source2 checkout. These are raw Git
// buffers from three fixed commits plus the physical current file; no fixture
// mirror or substituted copies provide the accepted byte roles.
const repo=process.cwd();
const states=MM_SEARCH_CJS_SOURCE2_STATES;
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:null,stdio:['ignore','pipe','pipe']});
const manifestPath='research/class-mapping-history-v1/mm-test-input-manifest-v6.json';
const manifestBytes=readFileSync(path.join(repo,manifestPath));
const manifest=JSON.parse(manifestBytes.toString('utf8'));
const historicalManifestPin=manifest.files.find(row=>row.path===states.historical.path);
const historicalGitBlob=git('show',`${states.historical.commit}:${states.historical.path}`);
const historicalS1GitBlob=git('show',`${states.historicalS1.sourceCommit}:${states.historicalS1.path}`);
const source2GitBlob=git('show',`${states.currentSource2.sourceCommit}:${states.currentSource2.path}`);
const physicalCurrentBytes=readFileSync(path.join(repo,states.currentSource2.path));
const treeFor=commit=>git('rev-parse','--verify',`${commit}^{tree}`).toString('utf8').trim();
const currentSource2Summary={
  stage:states.currentSource2.stage,
  sourceCommit:states.currentSource2.sourceCommit,
  sourceTree:treeFor(states.currentSource2.sourceCommit),
};
const run=overrides=>assertHistoricalSearchCjsTransportSource2({
  currentSource2Summary,historicalManifestPin,historicalGitBlob,historicalS1GitBlob,
  source2GitBlob,physicalCurrentBytes,...overrides,
});

test('validates three actual Git states and reports S1 bridge separately from current Source2',()=>{
  assert.equal(treeFor(states.historical.commit),states.historical.tree);
  assert.equal(treeFor(states.historicalS1.sourceCommit),states.historicalS1.sourceTree);
  assert.equal(treeFor(states.currentSource2.sourceCommit),states.currentSource2.sourceTree);
  assert.equal(manifestBytes.length,851530);
  assert.equal(createSha(manifestBytes),'a063dd1910847d94e363f1cee502dfa34fd283ccf2c79f1370bcffe00f886070');
  assert.equal(historicalGitBlob.length,10876);
  assert.equal(historicalS1GitBlob.length,11218);
  assert.equal(source2GitBlob.length,11218);
  assert.deepEqual(historicalS1GitBlob,source2GitBlob);
  assert.deepEqual(physicalCurrentBytes,source2GitBlob);
  const result=run();
  assert.deepEqual(result.historical,states.historical);
  assert.deepEqual(result.historicalS1,states.historicalS1);
  assert.deepEqual(result.currentSource2Summary,currentSource2Summary);
  assert.deepEqual(result.currentSource2Search,{path:'dist/search.js',sha256:states.currentSource2.sha256,sizeBytes:11218});
  assert.equal(result.source2Status,'source2-search-transport-verified');
  assert.equal(Object.hasOwn(result,'currentS1'),false);
  assert.equal(Object.hasOwn(result,'currentS1Summary'),false);
});

test('rejects any wrong current Source2 stage, commit, or tree',()=>{
  assert.throws(()=>run({currentSource2Summary:{...currentSource2Summary,stage:'source1-current'}}),/exact current Source2 stage, source commit, and source tree/);
  assert.throws(()=>run({currentSource2Summary:{...currentSource2Summary,sourceCommit:'f'.repeat(40)}}),/exact current Source2 stage, source commit, and source tree/);
  assert.throws(()=>run({currentSource2Summary:{...currentSource2Summary,sourceTree:'e'.repeat(40)}}),/exact current Source2 stage, source commit, and source tree/);
});

test('preserves the immutable a29 manifest pin and historical Git blob checks',()=>{
  assert.throws(()=>run({historicalManifestPin:{...historicalManifestPin,path:'dist/other.js'}}),/immutable a29 manifest pin/);
  assert.throws(()=>run({historicalManifestPin:{...historicalManifestPin,sha256:'0'.repeat(64)}}),/immutable a29 manifest pin/);
  assert.throws(()=>run({historicalManifestPin:{...historicalManifestPin,sizeBytes:10875}}),/immutable a29 manifest pin/);
  const changed=Buffer.from(historicalGitBlob);changed[0]^=1;
  assert.throws(()=>run({historicalGitBlob:changed}),/a29 historical search bytes do not match/);
  assert.throws(()=>run({historicalGitBlob:historicalS1GitBlob}),/a29 historical search bytes do not match/);
});

test('rejects a substituted raw S1 Git blob independently of Source2 and physical bytes',()=>{
  const changed=Buffer.from(historicalS1GitBlob);changed[0]^=1;
  assert.throws(()=>run({historicalS1GitBlob:changed}),/historical S1 search bytes do not match/);
  assert.throws(()=>run({historicalS1GitBlob:historicalGitBlob}),/historical S1 search bytes do not match/);
});

test('rejects a substituted current Source2 Git blob when physical bytes remain unchanged',()=>{
  const changed=Buffer.from(source2GitBlob);changed[0]^=1;
  assert.throws(()=>run({source2GitBlob:changed}),/current Source2 Git search bytes do not match/);
  assert.throws(()=>run({source2GitBlob:historicalGitBlob}),/current Source2 Git search bytes do not match/);
});

test('rejects a changed physical Source2 file or historical a29 bytes in its role',()=>{
  const changed=Buffer.from(physicalCurrentBytes);changed[0]^=1;
  assert.throws(()=>run({physicalCurrentBytes:changed}),/physical current Source2 search bytes do not match/);
  assert.throws(()=>run({physicalCurrentBytes:historicalGitBlob}),/physical current Source2 search bytes do not match/);
});

test('requires actual Buffer values for each byte role',()=>{
  for(const key of ['historicalGitBlob','historicalS1GitBlob','source2GitBlob','physicalCurrentBytes']){
    assert.throws(()=>run({[key]:physicalCurrentBytes.toString('utf8')}),/bytes do not match the fixed Git object/);
  }
});

function createSha(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}
