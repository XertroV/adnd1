// Additive Source2 family successor; original case and historical-role assertions are preserved.
// Current Source2 admission remains a separate genuine zero-argument identity case.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {
  assertHistoricalHPreimage,
  isVersion29HistoricalPath,
  normalizeVersion29HistoricalBytes,
  normalizeVersion29HistoricalJson,
  readExactHistoricalHPreimageFile,
  readVersion29HistoricalFile,
} from "../research/class-mapping-history-v1/closed-version29-reader-class-mapping-source2-v2.mjs";

const root=resolve(import.meta.dirname,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(commit,path)=>execFileSync('git',['show',commit+':'+path],{cwd:root,maxBuffer:128*1024*1024});

test('strict current-MM and exact historical-H proofs are separate and explicit',()=>{
  const proof=assertHistoricalHPreimage();
  assert.equal(proof.status,'verified-exact-historical-H-preimage; not current-MM data');
  assert.equal(proof.historicalHSourceTree,'e6bc420f70656825a926297b959bc6d98758bfcd');
  assert.deepEqual({
    sourceCommit:proof.currentMmSummary.sourceCommit,sourceTree:proof.currentMmSummary.sourceTree,
    owners:proof.currentMmSummary.owners,addedOwners:proof.currentMmSummary.addedOwners,
    canonicalBindings:proof.currentMmSummary.canonicalBindings,
    retainedCanonicalBindings:proof.currentMmSummary.retainedCanonicalBindings,
    addedCanonicalBindings:proof.currentMmSummary.addedCanonicalBindings,
    manualBindings:proof.currentMmSummary.manualBindings,addedManualBindings:proof.currentMmSummary.addedManualBindings,
  },{
    sourceCommit:'0f2d70a135e3ad486152bf00f21387d60a1a97ef',sourceTree:'08010faf457df22cdb0a5ec35d2dcf79e622ade9',
    owners:1064,addedOwners:2,canonicalBindings:5731,retainedCanonicalBindings:5655,
    addedCanonicalBindings:76,manualBindings:1293,addedManualBindings:42,
  });
  assert.deepEqual(proof.historicalHSummary,{
    sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',owners:1062,
    canonicalBindings:5655,priorWholeBindings:4931,addedBindings:724,manualAdditions:321,
    newRules:48,sourceTableRows:244,sourceCells:343,historicalMechanicsReviews:1215,
  });
});

test('returned H/current proof summaries are detached frozen snapshots',()=>{
  const first=assertHistoricalHPreimage();
  const second=assertHistoricalHPreimage();
  assert.equal(Object.isFrozen(first),true);
  assert.equal(Object.isFrozen(first.historicalHSummary),true);
  assert.equal(Object.isFrozen(first.currentMmSummary),true);
  assert.notStrictEqual(first.historicalHSummary,second.historicalHSummary);
  assert.notStrictEqual(first.currentMmSummary,second.currentMmSummary);
  assert.equal(Reflect.set(first.historicalHSummary,'owners',101062),false);
  assert.equal(Reflect.set(first.currentMmSummary,'owners',100000),false);
  assert.equal(second.historicalHSummary.owners,1062);
  assert.equal(second.currentMmSummary.owners,1064);
});

test('current MM data is bound to exact H M1 before the unchanged Version29 inverse',()=>{
  const path='dist/data.json';
  const exactH=readExactHistoricalHPreimageFile(path);
  assert.equal(sha(exactH),sha(git('5c6a57386af372c7c0d89e342003a7edf68ca0dd',path)));
  assert.equal(sha(exactH),'2cddb11a82ecc3b9d77cb3fa2ae49eef5623a5470ac85a540d1baf483e096a95');
  assert.equal(assertHistoricalHPreimage().historicalHPreimageCommit,'5c6a57386af372c7c0d89e342003a7edf68ca0dd');
  const v29=readVersion29HistoricalFile(path);
  assert.equal(sha(v29),sha(git('1f79d909344ebe7d41a432d8673f3eedb491fa3b',path)));
  assert.equal(sha(v29),'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d');
});

test('large current-MM Buffer normalization copies native bytes without hooks and rejects a tampered file-sized buffer',()=>{
  const path='dist/data.json';
  const current=readFileSync(resolve(root,path));
  let hookCalls=0;
  Object.defineProperty(current,'length',{configurable:true,get(){hookCalls++;throw new Error('length getter ran');}});
  Object.defineProperty(current,'constructor',{configurable:true,get(){hookCalls++;throw new Error('constructor getter ran');}});
  Object.defineProperty(current,Symbol.iterator,{configurable:true,get(){hookCalls++;throw new Error('iterator getter ran');}});
  Object.defineProperty(current,'toJSON',{configurable:true,get(){hookCalls++;throw new Error('toJSON getter ran');}});
  const projected=normalizeVersion29HistoricalBytes(path,current);
  const expected=git('1f79d909344ebe7d41a432d8673f3eedb491fa3b',path);
  assert.equal(sha(projected),sha(expected));
  assert.equal(hookCalls,0);

  const altered=Buffer.from(readFileSync(resolve(root,path)));
  altered[Math.floor(altered.length/2)]^=1;
  assert.throws(()=>normalizeVersion29HistoricalBytes(path,altered),/unknown MM\/H\/Version29 byte state/);
});

test('current-MM JSON maps through exact H state to the full Version29 object',()=>{
  const path='citation-overrides.json';
  const contract=JSON.parse(readFileSync(resolve(root,'research/mm-source-history-v1/mm-to-historical-h-v1.json')));
  const row=contract.mappingPolicy.orderedFiles.find(candidate=>candidate.path===path);
  const current=JSON.parse(readFileSync(resolve(root,path),'utf8'));
  const projected=normalizeVersion29HistoricalJson(path,current);
  const expected=JSON.parse(git('1f79d909344ebe7d41a432d8673f3eedb491fa3b',path).toString('utf8'));
  const objectSha=value=>sha(Buffer.from(JSON.stringify(value)));
  assert.equal(objectSha(projected),row.version29Baseline.objectSha256);
  assert.equal(objectSha(projected),objectSha(expected));
});

test('mapped file reads preserve supported encoding forms and reject option getters',()=>{
  const bytes=readVersion29HistoricalFile('dist/books.js');
  const stringOption=readVersion29HistoricalFile('dist/books.js','utf8');
  const objectOption=readVersion29HistoricalFile('dist/books.js',{encoding:'utf8'});
  const exactH=readExactHistoricalHPreimageFile('dist/books.js','utf8');
  const exactHObjectOption=readExactHistoricalHPreimageFile('dist/books.js',{encoding:'utf8'});
  assert.equal(sha(bytes),sha(git('1f79d909344ebe7d41a432d8673f3eedb491fa3b','dist/books.js')));
  assert.equal(stringOption,bytes.toString('utf8'));
  assert.equal(objectOption,bytes.toString('utf8'));
  assert.equal(exactH,readFileSync(resolve(root,'dist/books.js'),'utf8'));
  assert.equal(exactHObjectOption,exactH);
  let getterCalls=0;const unsafeOptions={};
  Object.defineProperty(unsafeOptions,'encoding',{enumerable:true,get(){getterCalls++;return'utf8';}});
  assert.throws(()=>readVersion29HistoricalFile('dist/books.js',unsafeOptions),/own enumerable data string/);
  assert.equal(getterCalls,0);
});

test('JSON and raw caller inputs reject hooks, unknown states, and unknown paths',()=>{
  let getterCalls=0;const accessor={};
  Object.defineProperty(accessor,'field',{enumerable:true,configurable:true,get(){getterCalls++;return 1;}});
  assert.throws(()=>normalizeVersion29HistoricalJson('dist/data.json',accessor),/accessor/);
  assert.equal(getterCalls,0);
  let prototypeHookCalls=0;const inherited=Object.create({toJSON(){prototypeHookCalls++;return{};}});
  inherited.field=1;
  assert.throws(()=>normalizeVersion29HistoricalJson('dist/data.json',inherited),/prototype/);
  assert.equal(prototypeHookCalls,0);
  assert.throws(()=>normalizeVersion29HistoricalBytes('dist/data.json',Buffer.from('unknown')),/unknown MM\/H\/Version29 byte state/);
  assert.throws(()=>normalizeVersion29HistoricalBytes('dist/data.json',new Proxy(Buffer.from('x'),{})),/raw byte input/);
  assert.throws(()=>normalizeVersion29HistoricalBytes('not-in-the-22-path-contract',Buffer.from('x')),/outside the closed 22-path/);
  assert.throws(()=>normalizeVersion29HistoricalJson('not-in-the-22-path-contract',{}),/outside the closed 22-path/);
  let pathHookCalls=0;const unsafePath={[Symbol.toPrimitive](){pathHookCalls++;throw Error('path coercion ran');}};
  assert.throws(()=>normalizeVersion29HistoricalBytes(unsafePath,Buffer.from('x')),/expected a string/);
  assert.throws(()=>normalizeVersion29HistoricalJson(unsafePath,{}),/expected a string/);
  assert.throws(()=>readExactHistoricalHPreimageFile(unsafePath),/expected a string/);
  assert.equal(pathHookCalls,0);
  assert.equal(isVersion29HistoricalPath('dist/data.json'),true);
  assert.equal(isVersion29HistoricalPath('dist/not-a-source.json'),false);
});



// Regression for old exact current-MM candidates versus actual Source2 physical inputs.
// The raw old candidates stay fixed at 4be2; the current physical values stay separate.
import {
  isExactLegacyFacadeLiteral,
  normalizeHistoricalMmBytes,
  normalizeHistoricalMmJson,
  readExactHistoricalMmPreimageFile,
} from '../research/class-mapping-source-epoch-v2/closed-historical-reader-source2-v2.mjs';

const source2CandidateNextCommit='4be2cf6058eca14578947fcea2f1bb662f46531e';
const source2CandidateRoles=Object.freeze({
  'dist/app.js':Object.freeze({candidateSha256:'876df077e57041e77732ea56cc47123dc1f459ba6badac0ce98d3254345106d6',candidateSizeBytes:197475,source2Sha256:'57eae6b440f2b75294ca6021adbcd9e29a43646a7a6177cc6800973b94f0b8c1',source2SizeBytes:197876}),
  'dist/coverage-gaps.json':Object.freeze({candidateSha256:'49de386f7ca79844e380fe30c37ee3b38a2f6cf4073828b7dc4cfdbd90d100f9',candidateSizeBytes:179737,source2Sha256:'84ac2248c41c49db8d34725725806d94492c61af5256b903c20ba2d4b767b263',source2SizeBytes:179737}),
});
const source2CandidateCache=new Map();
function source2CandidateInputs(relativePath){
  assert.ok(Object.hasOwn(source2CandidateRoles,relativePath),'only the two pinned historical candidates are covered');
  if(!source2CandidateCache.has(relativePath)){
    const pin=source2CandidateRoles[relativePath];
    const candidate=git(source2CandidateNextCommit,relativePath);
    const source2=readFileSync(resolve(root,relativePath));
    assert.equal(candidate.length,pin.candidateSizeBytes,relativePath+' exact 4be2 candidate size');
    assert.equal(sha(candidate),pin.candidateSha256,relativePath+' exact 4be2 candidate SHA');
    assert.equal(source2.length,pin.source2SizeBytes,relativePath+' exact current Source2 size');
    assert.equal(sha(source2),pin.source2Sha256,relativePath+' exact current Source2 SHA');
    const expectedMm=readExactHistoricalMmPreimageFile(relativePath);
    const expectedV29=readVersion29HistoricalFile(relativePath);
    source2CandidateCache.set(relativePath,{candidate,source2,expectedMm,expectedV29});
  }
  const value=source2CandidateCache.get(relativePath);
  return {candidate:Buffer.from(value.candidate),source2:Buffer.from(value.source2),expectedMm:Buffer.from(value.expectedMm),expectedV29:Buffer.from(value.expectedV29)};
}
function assertSource2StateRejected(operation,relativePath,stage,kind){
  let error=null;
  try{operation();}catch(caught){error=caught;}
  assert.ok(error instanceof Error,relativePath+': physical Source2 state unexpectedly accepted');
  const expected=relativePath+': unknown '+stage+' '+kind+' state';
  assert.ok(String(error.message).includes(expected),relativePath+': expected exact unchanged projection-kernel diagnostic '+expected+'; got '+error.message);
}

test('old exact app candidate projects to MM bytes',()=>{
  const relativePath='dist/app.js',value=source2CandidateInputs(relativePath);
  assert.deepEqual(normalizeHistoricalMmBytes(relativePath,value.candidate),value.expectedMm);
});
test('old exact app candidate projects to Version29 bytes',()=>{
  const relativePath='dist/app.js',value=source2CandidateInputs(relativePath);
  assert.deepEqual(normalizeVersion29HistoricalBytes(relativePath,value.candidate),value.expectedV29);
});
test('physical Source2 app bytes reject in the MM byte kernel',()=>{
  const relativePath='dist/app.js',value=source2CandidateInputs(relativePath);
  assertSource2StateRejected(()=>normalizeHistoricalMmBytes(relativePath,value.source2),relativePath,'next/MM','byte');
});
test('physical Source2 app bytes reject in the Version29 byte kernel',()=>{
  const relativePath='dist/app.js',value=source2CandidateInputs(relativePath);
  assertSource2StateRejected(()=>normalizeVersion29HistoricalBytes(relativePath,value.source2),relativePath,'MM/H/Version29','byte');
});
test('old exact coverage candidate projects to MM bytes',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  assert.deepEqual(normalizeHistoricalMmBytes(relativePath,value.candidate),value.expectedMm);
});
test('old exact coverage candidate projects to Version29 bytes',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  assert.deepEqual(normalizeVersion29HistoricalBytes(relativePath,value.candidate),value.expectedV29);
});
test('physical Source2 coverage bytes reject in the MM byte kernel',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  assertSource2StateRejected(()=>normalizeHistoricalMmBytes(relativePath,value.source2),relativePath,'next/MM','byte');
});
test('physical Source2 coverage bytes reject in the Version29 byte kernel',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  assertSource2StateRejected(()=>normalizeVersion29HistoricalBytes(relativePath,value.source2),relativePath,'MM/H/Version29','byte');
});
test('old exact coverage object projects to the MM object',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  const candidate=JSON.parse(value.candidate.toString('utf8'));
  const expected=JSON.parse(value.expectedMm.toString('utf8'));
  assert.deepStrictEqual(normalizeHistoricalMmJson(relativePath,candidate),expected);
});
test('old exact coverage object projects to the Version29 object',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  const candidate=JSON.parse(value.candidate.toString('utf8'));
  const expected=JSON.parse(value.expectedV29.toString('utf8'));
  assert.deepStrictEqual(normalizeVersion29HistoricalJson(relativePath,candidate),expected);
});
test('old exact coverage object is not a legacy facade literal',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  assert.equal(isExactLegacyFacadeLiteral(relativePath,JSON.parse(value.candidate.toString('utf8'))),false);
});
test('physical Source2 coverage object rejects in the MM object kernel',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  assertSource2StateRejected(()=>normalizeHistoricalMmJson(relativePath,JSON.parse(value.source2.toString('utf8'))),relativePath,'next/MM','object');
});
test('physical Source2 coverage object rejects in the Version29 object kernel',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  assertSource2StateRejected(()=>normalizeVersion29HistoricalJson(relativePath,JSON.parse(value.source2.toString('utf8'))),relativePath,'MM/H/Version29','object');
});
test('physical Source2 coverage object is not a legacy facade literal',()=>{
  const relativePath='dist/coverage-gaps.json',value=source2CandidateInputs(relativePath);
  assert.equal(isExactLegacyFacadeLiteral(relativePath,JSON.parse(value.source2.toString('utf8'))),false);
});
// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
