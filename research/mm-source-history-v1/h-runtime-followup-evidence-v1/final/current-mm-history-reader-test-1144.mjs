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
} from '../research/mm-source-history-v1/closed-version29-reader-current-mm-v1.mjs';

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
