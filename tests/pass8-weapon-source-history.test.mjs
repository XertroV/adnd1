import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as history from './helpers/pass8-weapon-source-history.mjs';
import * as original from './helpers/pass8-citation-target-crop-history.mjs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const compressed=read('tests/fixtures/pass8-weapon-source-history-v1.json.gz'),contract=history.decodePass8WeaponSourceHistory(compressed),git=(ref,path)=>execFileSync('git',['show',`${ref}:${path}`],{cwd:root,maxBuffer:100*1024*1024});
const project=history.projectPass8WeaponSourceJson,projectBytes=history.projectPass8WeaponSourceBytes;
const composedJson=[history.projectPass8CitationTargetCropJson,history.projectPass8PhbSourceJson,history.projectPass8XpContinuationJson,history.projectPass8CharacterReferenceJson];
const composedBytes=[history.projectPass8CitationTargetCropBytes,history.projectPass8PhbSourceBytes,history.projectPass8XpContinuationBytes,history.projectPass8CharacterReferenceBytes];

test('the weapon contract restores complete exact cc predecessors only from declared Git states',()=>{
 assert.equal(contract.sourcePaths.length,12);assert.equal(contract.metadataPaths.length,5);assert.deepEqual(contract.rawPaths,['dist/source-viewer.js']);
 for(const [path,stage]of Object.entries({...contract.files,...contract.rawFiles})){
  const before=git(contract.beforeCommit,path),after=git(stage.afterCommit,path);
  assert.equal(sha(before),stage.beforeRawSha256);assert.equal(sha(after),stage.afterRawSha256);
  for(const bytes of [before,after]){
   assert.deepEqual(projectBytes(path,bytes),before,path);
   if(contract.files[path])assert.deepEqual(project(path,JSON.parse(bytes)),JSON.parse(before),path);
  }
  assert.deepEqual(history.readBeforePass8WeaponSourceFile(new URL(path,root)),before,path);
 }
 assert.throws(()=>project('equipment.json',{}),/no weapon-source history projection/);
 for(const path of ['dist/scans/verified/rules-phb-hurled-weapons-and-missiles-table.json','dist/scans/verified/rules-ua-hurled-weapons-and-missiles-table.json','research/citation-evidence-seals.json'])assert.equal(history.isPass8WeaponSourceHistoryPath(path),false,'new catalogs and mutable seals have no invented historical predecessor');
});
test('every whole declared JSON and raw state rejects unknown changes and byte whitespace',()=>{
 for(const [path,stage]of Object.entries({...contract.files,...contract.rawFiles}))for(const ref of [contract.beforeCommit,stage.afterCommit]){
  const bytes=git(ref,path);
  for(const fn of [projectBytes,...composedBytes])assert.throws(()=>fn(path,Buffer.concat([bytes,Buffer.from(' ')])),path);
  if(contract.files[path]){
   const bad=JSON.parse(bytes);bad.unapprovedWeaponCanary=true;
   for(const fn of [project,...composedJson])assert.throws(()=>fn(path,bad),path);
  }
 }
 for(const fn of [project,...composedJson])assert.throws(()=>fn('dist/source-viewer.js',{}),'the viewer has a raw-only boundary');
});
test('the outer stage composes with the unchanged citation stage and keeps older literal states closed',()=>{
 const prior=original.decodePass8CitationTargetCropHistory(read('tests/fixtures/pass8-citation-target-crop-history-v1.json.gz'));
 for(const [path,stage]of Object.entries(prior.files))for(const ref of [prior.beforeCommit,stage.afterCommit]){
  const bytes=git(ref,path);
  assert.deepEqual(history.projectPass8CitationTargetCropBytes(path,bytes),original.projectPass8CitationTargetCropBytes(path,bytes),path);
  assert.deepEqual(history.projectPass8CitationTargetCropJson(path,JSON.parse(bytes)),original.projectPass8CitationTargetCropJson(path,JSON.parse(bytes)),path);
 }
 assert.throws(()=>original.projectPass8CitationTargetCropJson('dist/data.json',JSON.parse(read('dist/data.json'))),'the original helper still rejects the weapon successor');
 for(const fn of [history.projectPass8CitationTargetCropJson,history.projectPass8PhbSourceJson,history.projectPass8XpContinuationJson,history.projectPass8CharacterReferenceJson]){
  const expected=fn('dist/data.json',JSON.parse(git(contract.beforeCommit,'dist/data.json')));
  assert.deepEqual(fn('dist/data.json',JSON.parse(git(contract.sourceCommit,'dist/data.json'))),expected);
 }
});
test('source values, pending grades, routing and mixed complete states cannot enter the outer stage',()=>{
 const path='dist/data.json',after=JSON.parse(git(contract.sourceCommit,path)),before=JSON.parse(git(contract.beforeCommit,path));
 const mutations=[value=>value.equipment[0].name+=' changed',value=>value.rules.find(row=>row.id==='phb-hurled-weapons-and-missiles-table').table.rows[0].sourceReference.evidenceBindings[0].reviewStatus='field-target-reviewed',value=>value.rules.find(row=>row.id==='phb-hurled-weapons-and-missiles-table').table.rows[0].sourceReference.evidenceBindings[0].sourceOwner.itemId='weapon-versus-armor-adjustments',value=>value.release=before.release];
 for(const mutate of mutations){const bad=structuredClone(after);mutate(bad);for(const fn of [project,...composedJson])assert.throws(()=>fn(path,bad));}
 const path2='research/field-evidence-bindings.json',bindings=JSON.parse(git(contract.sourceCommit,path2));bindings.bindings.at(-1).reviewStatus='field-target-reviewed';for(const fn of [project,...composedJson])assert.throws(()=>fn(path2,bindings));
});
test('nonJSON, proxies, accessors, hidden values, sparse arrays and cycles reject before hashing',()=>{
 const path='research/field-evidence-bindings.json',clean=JSON.parse(git(contract.sourceCommit,path));let getterCalls=0;
 const mutations=[value=>value.hidden=undefined,value=>value.hidden=NaN,value=>value.hidden=Infinity,value=>value.hidden=-0,value=>value.hidden=1n,value=>value.hidden=()=>1,value=>value.hidden=Symbol('hidden'),value=>value[Symbol('hidden')]=true,value=>Object.defineProperty(value,'hidden',{value:1}),value=>Object.defineProperty(value,'hidden',{get(){getterCalls++;return 1;},enumerable:true}),value=>delete value.bindings[0],value=>Object.defineProperty(value.bindings,'hidden',{value:1}),value=>value.bindings[0]=new Proxy(value.bindings[0],{}),value=>Object.setPrototypeOf(value.bindings[0],{hidden:true}),value=>value.hidden=new Date(),value=>value.self=value];
 for(const mutate of mutations){const bad=structuredClone(clean);mutate(bad);for(const fn of [project,...composedJson])assert.throws(()=>fn(path,bad));}
 for(const fn of [project,...composedJson])assert.throws(()=>fn(path,new Proxy(clean,{ownKeys(){throw Error('proxy trap must not execute');}})));
 assert.equal(getterCalls,0,'validation never invokes hidden accessors');
});
test('returned objects and buffers are isolated from caches and changed caller objects still reject',()=>{
 const path='research/field-evidence-bindings.json',bytes=git(contract.sourceCommit,path),value=JSON.parse(bytes),before=git(contract.beforeCommit,path),expected=JSON.parse(before);
 const first=project(path,value);first.bindings.pop();assert.deepEqual(project(path,value),expected);
 const returned=projectBytes(path,bytes);returned[0]^=1;assert.deepEqual(projectBytes(path,bytes),before);
 value.bindings.pop();assert.throws(()=>project(path,value));
 const composedPath='rules.json',composedInput=git(contract.sourceCommit,composedPath);
 for(const fn of composedJson){const current=JSON.parse(composedInput),one=fn(composedPath,current);one.rules.pop();assert.notDeepEqual(fn(composedPath,current),one);current.rules.pop();assert.throws(()=>fn(composedPath,current));}
});
test('inherited array serializers cannot hide mutations in either the weapon stage or an older stage',()=>{
 let serializerCalls=0;
 for(const [path,arrayKey]of [['research/field-evidence-bindings.json','bindings'],['classes.json','classes']]){
  const clean=JSON.parse(read(path));
  for(const subclass of [false,true]){
   const candidate=structuredClone(clean),forged=structuredClone(candidate[arrayKey]),prototype=subclass?(class extends Array{}).prototype:Object.create(Array.prototype);
   Object.defineProperty(prototype,'toJSON',{value(){serializerCalls++;return forged;}});Object.setPrototypeOf(candidate[arrayKey],prototype);candidate[arrayKey][0].unapprovedReviewCanary=true;
   for(const fn of [project,...composedJson])assert.throws(()=>fn(path,candidate));
  }
 }
 for(const prototype of [Object.prototype,Array.prototype]){
  Object.defineProperty(prototype,'toJSON',{configurable:true,value(){serializerCalls++;return {};}});
  try{for(const fn of [project,...composedJson])assert.throws(()=>fn('rules.json',JSON.parse(read('rules.json'))));}
  finally{delete prototype.toJSON;}
 }
 const arrayParent=Object.getPrototypeOf(Array.prototype),inserted=Object.create(Object.prototype),candidate=JSON.parse(read('research/field-evidence-bindings.json')),cleanBindings=structuredClone(candidate.bindings);
 candidate.bindings[0].unapprovedReviewCanary=true;Object.defineProperty(inserted,'toJSON',{value(){serializerCalls++;return this===candidate.bindings?cleanBindings:this;}});Object.setPrototypeOf(Array.prototype,inserted);
 try{for(const fn of [project,...composedJson])assert.throws(()=>fn('research/field-evidence-bindings.json',candidate));}
 finally{Object.setPrototypeOf(Array.prototype,arrayParent);}
 assert.equal(serializerCalls,0,'no inherited serializer executes before rejection');
});
test('the exact first full failure, caller preimages and immutable earlier kernel remain preserved',()=>{
 const failureBytes=read('tests/fixtures/pass8-weapon-source-first-full-failure-v1.json.gz');assert.equal(sha(failureBytes),'4196153365ffbe1c58a17d7d6ee0098f7057af7ba23f71b51223b29461bdf8dd');
 const failure=JSON.parse(gunzipSync(failureBytes));assert.equal(failure.inputCommit,'7dd7401b28117bccb9b4e90e15310903fc9f4c72');assert.deepEqual([failure.execution.registered,failure.execution.passed,failure.execution.failed,failure.execution.skipped],[927,868,59,0]);assert.equal(sha(failure.actualLog),contract.preservation.firstFullFailure.actualLogSha256);assert.equal(failure.inputManifestSha256,contract.preservation.firstFullFailure.inputManifestSha256);
 const capture=JSON.parse(gunzipSync(read('tests/fixtures/pass8-weapon-source-history-callers-before-v1.json.gz')));assert.equal(capture.files.length,21);for(const row of capture.files){const bytes=git(capture.commit,row.path);assert.equal(sha(bytes),row.sha256);assert.equal(bytes.toString('utf8'),row.utf8);}
 assert.equal(sha(read('tests/helpers/pass8-citation-target-crop-history.mjs')),contract.preservation.oldCitationHelperSha256);assert.equal(sha(read('tests/fixtures/pass8-citation-target-crop-history-v1.json.gz')),contract.preservation.oldCitationContractSha256);
 const changed=Buffer.from(compressed);changed[40]^=1;assert.throws(()=>history.decodePass8WeaponSourceHistory(changed),/exact closed weapon-source/);
 const forgery=JSON.parse(gunzipSync(compressed));forgery.files['dist/data.json'].afterObjectSha256='0'.repeat(64);assert.throws(()=>history.decodePass8WeaponSourceHistory(Buffer.from(JSON.stringify(forgery))),/exact closed weapon-source/);
});
test('the wrapper is confined to explicit historical tests and current audits never import it',()=>{
 const files=execFileSync('git',['ls-files','-z','--','dist','tools'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 const hits=files.filter(path=>read(path).includes('pass8-weapon-source-history'));assert.deepEqual(hits,['tools/build-pass8-weapon-source-history-contract-v1.mjs']);
 const raw=read('dist/books.js');assert.deepEqual(history.readBeforePass8WeaponSourceFile(new URL('dist/books.js',root)),raw,'unscoped native reads preserve exact bytes');
 const expected=git(contract.beforeCommit,'rules.json').toString('utf8');assert.equal(history.readBeforePass8WeaponSourceFile('rules.json','utf8'),expected);assert.equal(history.readBeforePass8WeaponSourceFile(new URL('rules.json',root),{encoding:'utf8'}),expected);
});
