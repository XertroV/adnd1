// Explicit historical-test boundary only; native current assertions never import this.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {gunzipSync} from 'node:zlib';
import * as prior from './pass8-weapon-source-history.mjs';
export {decodePass8WeaponSourceHistory,decodePass8CitationTargetCropHistory,decodePass8PhbSourceHistory,decodePass8XpContinuationHistory,decodePass8CharacterReferenceHistory} from './pass8-weapon-source-history.mjs';
const root=new URL('../../',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function decodePass8UaSourceHistory(bytes){
 assert.equal(sha(bytes),'8d4d781dfa364b677d279753991dbe5cb14f3fee0e7ead08538a54d7ca89d89a','exact closed UA-source history contract bytes');
 const document=JSON.parse(gunzipSync(bytes));
 assert.equal(document.artifactType,'exact-pass8-ua-source-historical-projection');
 assert.equal(document.beforeCommit,'6717c6f22bbf2f2b421327e4c8561b1d81df00d4');
 assert.equal(document.sourceCommit,'6b3cfc8cb421a2c1fc2379c38abebe2075634981');
 assert.equal(document.metadataCommit,'7314165d4e5b09772d2e4dee9a17e000ebc96c5b');
 assert.equal(document.sourcePaths.length,17);assert.equal(document.metadataPaths.length,8);
 assert.deepEqual(Object.keys(document.files),[...document.sourcePaths,...document.metadataPaths]);
 assert.deepEqual(document.rawPaths,[]);
 return document;
}
const contract=decodePass8UaSourceHistory(readFileSync(new URL('tests/fixtures/pass8-ua-source-history-v1.json.gz',root)));
for(const ref of contract.proofs){const bytes=readFileSync(new URL(ref.path,root));assert.equal(sha(bytes),ref.sha256,`${ref.path}: preserved UA-source proof`);assert.equal(bytes.length,ref.sizeBytes);}
function assertJsonTree(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {assert.ok(Number.isFinite(value) && !Object.is(value,-0),'UA-source history requires exact JSON numbers');return;}
  assert.equal(typeof value,'object','UA-source history rejects non-JSON values');
  assert.ok(!types.isProxy(value),'UA-source history rejects proxies');
  assert.equal(Object.getPrototypeOf(Object.prototype),null,'UA-source history requires the plain Object prototype chain');
  assert.equal(Object.getPrototypeOf(Array.prototype),Object.prototype,'UA-source history requires the plain Array prototype chain');
  assert.ok(!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'UA-source history rejects inherited serialization hooks');
  assert.ok(!ancestors.has(value),'UA-source history rejects cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length,0,'UA-source history rejects symbols');
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    assert.equal(Object.getPrototypeOf(value),Array.prototype,'UA-source history requires plain JSON arrays');
    assert.deepEqual(keys,Array.from({length:value.length},(_,i)=>String(i)),'UA-source history requires dense arrays');
    assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'UA-source history rejects hidden array properties');
  } else {
    assert.equal(Object.getPrototypeOf(value),Object.prototype,'UA-source history requires plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value),keys,'UA-source history rejects hidden properties');
  }
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value,key);
    assert.ok(Object.hasOwn(descriptor,'value'),'UA-source history rejects accessors');
    assertJsonTree(descriptor.value,ancestors);
  }
  ancestors.delete(value);
}
const objectSha = value => {assertJsonTree(value);return sha(JSON.stringify(value));};
const beforeBytes=new Map(),beforeObjects=new Map();
function capturedBefore(path){
 if(!beforeBytes.has(path)){
  const stage=contract.files[path];
  const bytes=execFileSync('git',['show',`${contract.beforeCommit}:${path}`],{cwd:root,maxBuffer:100*1024*1024});
  assert.equal(sha(bytes),stage.beforeRawSha256,`${path}: complete actual merged V27 predecessor bytes`);
  const value=JSON.parse(bytes);assert.equal(objectSha(value),stage.beforeObjectSha256,`${path}: complete actual merged V27 predecessor object`);
  beforeBytes.set(path,bytes);beforeObjects.set(path,value);
 }
 return{bytes:beforeBytes.get(path),value:beforeObjects.get(path)};
}
export const isPass8UaSourceHistoryPath=path=>Object.hasOwn(contract.files,path);
export function projectPass8UaSourceJson(path,value){
 const stage=contract.files[path];assert.ok(stage,`${path}: no UA-source history projection is authorized`);
 assert.ok([stage.beforeObjectSha256,stage.afterObjectSha256].includes(objectSha(value)),`${path}: exact complete UA-source before/after object required`);
 return structuredClone(capturedBefore(path).value);
}
export function projectPass8UaSourceBytes(path,bytes){
 const stage=contract.files[path];if(!stage)return Buffer.from(bytes);
 assert.ok([stage.beforeRawSha256,stage.afterRawSha256].includes(sha(bytes)),`${path}: exact UA-source before/after raw bytes required`);
 return Buffer.from(capturedBefore(path).bytes);
}
// Unknown states may enter an older adapter only when that adapter explicitly
// owns the path. Its unchanged whole-state validation then accepts or rejects.
function outerJson(path,value,allowsPrior){
 const stage=contract.files[path];if(!stage){assertJsonTree(value);return value;}
 const fingerprint=objectSha(value);
 if([stage.beforeObjectSha256,stage.afterObjectSha256].includes(fingerprint))return projectPass8UaSourceJson(path,value);
 assert.ok(allowsPrior,`${path}: exact complete UA-source before/after object required`);
 return value;
}
function outerBytes(path,bytes,allowsPrior){
 const stage=contract.files[path];if(!stage)return bytes;
 if([stage.beforeRawSha256,stage.afterRawSha256].includes(sha(bytes)))return projectPass8UaSourceBytes(path,bytes);
 assert.ok(allowsPrior,`${path}: exact UA-source before/after raw bytes required`);
 return bytes;
}
function composeJson(path,value,scope,project){
 value=outerJson(path,value,scope(path));
 if(scope(path))return project(path,value);
 assert.ok(isPass8UaSourceHistoryPath(path),`${path}: no UA-source or prior history projection is authorized`);
 return structuredClone(value);
}
function composeBytes(path,bytes,scope,project){bytes=outerBytes(path,bytes,scope(path));return scope(path)?project(path,bytes):Buffer.from(bytes);}
function historicalRead(path,options,project,scoped){
 if(typeof path==='number')return readFileSync(path,options);
 const absolute=path instanceof URL?fileURLToPath(path):resolve(String(path));
 const local=relative(fileURLToPath(root),absolute).replaceAll('\\','/');
 if(!scoped(local))return readFileSync(path,options);
 const bytes=project(local,readFileSync(path));const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):bytes;
}
export const readBeforePass8UaSourceFile=(path,options)=>historicalRead(path,options,projectPass8UaSourceBytes,isPass8UaSourceHistoryPath);
export const isPass8WeaponSourceHistoryPath=path=>isPass8UaSourceHistoryPath(path)||prior.isPass8WeaponSourceHistoryPath(path);
export const projectPass8WeaponSourceJson=(path,value)=>!isPass8UaSourceHistoryPath(path)?prior.projectPass8WeaponSourceJson(path,value):composeJson(path,value,prior.isPass8WeaponSourceHistoryPath,prior.projectPass8WeaponSourceJson);
export const projectPass8WeaponSourceBytes=(path,bytes)=>composeBytes(path,bytes,prior.isPass8WeaponSourceHistoryPath,prior.projectPass8WeaponSourceBytes);
export const readBeforePass8WeaponSourceFile=(path,options)=>historicalRead(path,options,projectPass8WeaponSourceBytes,isPass8WeaponSourceHistoryPath);
export const isPass8CitationTargetCropHistoryPath=path=>isPass8UaSourceHistoryPath(path)||prior.isPass8CitationTargetCropHistoryPath(path);
export const projectPass8CitationTargetCropJson=(path,value)=>composeJson(path,value,prior.isPass8CitationTargetCropHistoryPath,prior.projectPass8CitationTargetCropJson);
export const projectPass8CitationTargetCropBytes=(path,bytes)=>composeBytes(path,bytes,prior.isPass8CitationTargetCropHistoryPath,prior.projectPass8CitationTargetCropBytes);
export const readBeforePass8CitationTargetCropFile=(path,options)=>historicalRead(path,options,projectPass8CitationTargetCropBytes,isPass8CitationTargetCropHistoryPath);
export const isPass8PhbSourceHistoryPath=path=>isPass8UaSourceHistoryPath(path)||prior.isPass8PhbSourceHistoryPath(path);
export const projectPass8PhbSourceJson=(path,value)=>composeJson(path,value,prior.isPass8PhbSourceHistoryPath,prior.projectPass8PhbSourceJson);
export const projectPass8PhbSourceBytes=(path,bytes)=>composeBytes(path,bytes,prior.isPass8PhbSourceHistoryPath,prior.projectPass8PhbSourceBytes);
export const readBeforePass8PhbSourceFile=(path,options)=>historicalRead(path,options,projectPass8PhbSourceBytes,isPass8PhbSourceHistoryPath);
export const isPass8XpContinuationHistoryPath=path=>isPass8UaSourceHistoryPath(path)||prior.isPass8XpContinuationHistoryPath(path);
export const projectPass8XpContinuationJson=(path,value)=>composeJson(path,value,prior.isPass8XpContinuationHistoryPath,prior.projectPass8XpContinuationJson);
export const projectPass8XpContinuationBytes=(path,bytes)=>composeBytes(path,bytes,prior.isPass8XpContinuationHistoryPath,prior.projectPass8XpContinuationBytes);
export const readBeforePass8XpContinuationFile=(path,options)=>historicalRead(path,options,projectPass8XpContinuationBytes,isPass8XpContinuationHistoryPath);
const characterPaths=new Set(['rules.json','phb-spell-index.json','phb-magic-user-extra.json','dist/data.json','research/price-source-inventory.json']);
const priorCharacterScope=path=>prior.isPass8XpContinuationHistoryPath(path)||characterPaths.has(path);
export const projectPass8CharacterReferenceJson=(path,value)=>composeJson(path,value,priorCharacterScope,prior.projectPass8CharacterReferenceJson);
export const projectPass8CharacterReferenceBytes=(path,bytes)=>composeBytes(path,bytes,priorCharacterScope,prior.projectPass8CharacterReferenceBytes);
export const readBeforePass8CharacterReferenceFile=(path,options)=>historicalRead(path,options,projectPass8CharacterReferenceBytes,path=>isPass8UaSourceHistoryPath(path)||priorCharacterScope(path));
