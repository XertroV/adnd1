// Explicit historical-test boundary only. Current audits/UI never import this.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {gunzipSync} from 'node:zlib';
import * as prior from './pass8-citation-target-crop-history.mjs';
export {decodePass8CitationTargetCropHistory,decodePass8PhbSourceHistory,decodePass8XpContinuationHistory,decodePass8CharacterReferenceHistory} from './pass8-citation-target-crop-history.mjs';
const root = new URL('../../',import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const contractPath = 'tests/fixtures/pass8-weapon-source-history-v1.json.gz';
const sourcePaths = ["citation-overrides.json","dist/data.json","dist/scans/verified/rules-weapon-versus-armor-adjustments.json","dist/source-continuations.json","research/citation-continuations.json","research/current-source-audit-status.json","research/field-evidence-bindings.json","research/mechanics-audit-progress.json","research/price-source-inventory.json","research/source-visual-reviews.json","rules.json","tests/fixtures/source-scan-inventory.json"];
const metadataPaths = ["dist/coverage-gaps.json","research/current-continuation-candidate-snapshot.json","research/current-source-raster-snapshot.json","research/gaps-limitations-next-task.json","research/monetary-source-inventory.json"];
const characterPaths = new Set(['rules.json','phb-spell-index.json','phb-magic-user-extra.json','dist/data.json','research/price-source-inventory.json']);

export function decodePass8WeaponSourceHistory(bytes) {
  assert.equal(sha(bytes),'049924ffd08e0fd88839ddea635f34300bab9800a4299c39cb41cb77abafb1f8','exact closed weapon-source history contract bytes');
  const document = JSON.parse(gunzipSync(bytes));
  assert.equal(document.artifactType,'exact-pass8-weapon-source-historical-projection');
  assert.equal(document.beforeCommit,'cc9509047746d5e27a71cb5b1e0cfcb739a688c9');
  assert.equal(document.sourceCommit,'9ee2550e9793e6aae9a7ac8fd71525704894950f');
  assert.equal(document.metadataCommit,'0e2de01bf181ad113a0703c9c52375cb42de986c');
  assert.deepEqual(document.sourcePaths,sourcePaths);
  assert.deepEqual(document.metadataPaths,metadataPaths);
  assert.deepEqual(Object.keys(document.files),[...sourcePaths,...metadataPaths]);
  assert.deepEqual(document.rawPaths,["dist/source-viewer.js"]);
  assert.deepEqual(Object.keys(document.rawFiles),document.rawPaths);
  return document;
}
const contract = decodePass8WeaponSourceHistory(readFileSync(new URL(contractPath,root)));
for (const ref of contract.proofs) {
  const bytes = readFileSync(new URL(ref.path,root));
  assert.equal(sha(bytes),ref.sha256,`${ref.path}: preserved weapon-source proof`);
  assert.equal(bytes.length,ref.sizeBytes);
}
function assertJsonTree(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {assert.ok(Number.isFinite(value) && !Object.is(value,-0),'weapon-source history requires exact JSON numbers');return;}
  assert.equal(typeof value,'object','weapon-source history rejects non-JSON values');
  assert.ok(!types.isProxy(value),'weapon-source history rejects proxies');
  assert.equal(Object.getPrototypeOf(Object.prototype),null,'weapon-source history requires the plain Object prototype chain');
  assert.equal(Object.getPrototypeOf(Array.prototype),Object.prototype,'weapon-source history requires the plain Array prototype chain');
  assert.ok(!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'weapon-source history rejects inherited serialization hooks');
  assert.ok(!ancestors.has(value),'weapon-source history rejects cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length,0,'weapon-source history rejects symbols');
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    assert.equal(Object.getPrototypeOf(value),Array.prototype,'weapon-source history requires plain JSON arrays');
    assert.deepEqual(keys,Array.from({length:value.length},(_,i)=>String(i)),'weapon-source history requires dense arrays');
    assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'weapon-source history rejects hidden array properties');
  } else {
    assert.equal(Object.getPrototypeOf(value),Object.prototype,'weapon-source history requires plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value),keys,'weapon-source history rejects hidden properties');
  }
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value,key);
    assert.ok(Object.hasOwn(descriptor,'value'),'weapon-source history rejects accessors');
    assertJsonTree(descriptor.value,ancestors);
  }
  ancestors.delete(value);
}
const objectSha = value => {assertJsonTree(value);return sha(JSON.stringify(value));};
const beforeBytes = new Map(), beforeObjects = new Map();
function capturedBefore(path) {
  if (!beforeBytes.has(path)) {
    const stage = contract.files[path] || contract.rawFiles[path];
    const bytes = execFileSync('git',['show',`${contract.beforeCommit}:${path}`],{cwd:root,maxBuffer:100*1024*1024});
    assert.equal(sha(bytes),stage.beforeRawSha256,`${path}: complete Git-bound weapon-source predecessor bytes`);
    const value = Object.hasOwn(contract.files,path)?JSON.parse(bytes):null;
    if (value!==null) assert.equal(objectSha(value),stage.beforeObjectSha256,`${path}: complete weapon-source predecessor object`);
    beforeBytes.set(path,bytes); beforeObjects.set(path,value);
  }
  return {bytes:beforeBytes.get(path),value:beforeObjects.get(path)};
}
export const isPass8WeaponSourceHistoryPath = path => Object.hasOwn(contract.files,path)||Object.hasOwn(contract.rawFiles,path);
export function projectPass8WeaponSourceJson(path,value) {
  const stage = contract.files[path];assert.ok(stage,`${path}: no weapon-source history projection is authorized`);
  const fingerprint = objectSha(value);
  assert.ok([stage.beforeObjectSha256,stage.afterObjectSha256].includes(fingerprint),`${path}: exact complete weapon-source before/after object required`);
  return structuredClone(capturedBefore(path).value);
}
export function projectPass8WeaponSourceBytes(path,bytes) {
  const stage = contract.files[path] || contract.rawFiles[path];if (!stage) return Buffer.from(bytes);
  assert.ok([stage.beforeRawSha256,stage.afterRawSha256].includes(sha(bytes)),`${path}: exact weapon-source before/after raw bytes required`);
  return Buffer.from(capturedBefore(path).bytes);
}
// Earlier literal states enter only their original closed adapters. There is no
// catch-and-fallback and no caller policy; unknown scoped states always reject.
function outerJson(path,value,allowsPrior) {
  assert.ok(!Object.hasOwn(contract.rawFiles,path),`${path}: raw-only weapon-source history stage`);
  const stage=contract.files[path];if (!stage) {assertJsonTree(value);return value;}
  const fingerprint=objectSha(value);
  if ([stage.beforeObjectSha256,stage.afterObjectSha256].includes(fingerprint)) return projectPass8WeaponSourceJson(path,value);
  assert.ok(allowsPrior,`${path}: exact complete weapon-source before/after object required`);
  return value;
}
function outerBytes(path,bytes,allowsPrior) {
  const stage=contract.files[path] || contract.rawFiles[path];if (!stage) return bytes;
  if ([stage.beforeRawSha256,stage.afterRawSha256].includes(sha(bytes))) return projectPass8WeaponSourceBytes(path,bytes);
  assert.ok(allowsPrior,`${path}: exact weapon-source before/after raw bytes required`);
  return bytes;
}
export const isPass8XpContinuationHistoryPath = path => isPass8WeaponSourceHistoryPath(path) || prior.isPass8XpContinuationHistoryPath(path);
export function projectPass8XpContinuationJson(path,value) {
  value=outerJson(path,value,prior.isPass8XpContinuationHistoryPath(path));
  if (prior.isPass8XpContinuationHistoryPath(path)) return prior.projectPass8XpContinuationJson(path,value);
  assert.ok(isPass8WeaponSourceHistoryPath(path),`${path}: no XP continuation history projection is authorized`);
  return structuredClone(value);
}
export function projectPass8XpContinuationBytes(path,bytes) {
  bytes=outerBytes(path,bytes,prior.isPass8XpContinuationHistoryPath(path));
  return prior.isPass8XpContinuationHistoryPath(path)?prior.projectPass8XpContinuationBytes(path,bytes):Buffer.from(bytes);
}
export function projectPass8CharacterReferenceJson(path,value) {
  value=outerJson(path,value,prior.isPass8XpContinuationHistoryPath(path)||characterPaths.has(path));
  if (prior.isPass8XpContinuationHistoryPath(path)||characterPaths.has(path)) return prior.projectPass8CharacterReferenceJson(path,value);
  assert.ok(isPass8WeaponSourceHistoryPath(path),`${path}: no weapon-source/character history projection is authorized`);
  return structuredClone(value);
}
export function projectPass8CharacterReferenceBytes(path,bytes) {
  bytes=outerBytes(path,bytes,prior.isPass8XpContinuationHistoryPath(path)||characterPaths.has(path));
  return prior.projectPass8CharacterReferenceBytes(path,bytes);
}
function historicalRead(path,options,project,scoped) {
  if (typeof path === 'number') return readFileSync(path,options);
  const absolute=path instanceof URL?fileURLToPath(path):resolve(String(path));
  const local=relative(fileURLToPath(root),absolute).replaceAll('\\','/');
  if (!scoped(local)) return readFileSync(path,options);
  const bytes=project(local,readFileSync(path));
  const encoding=typeof options==='string'?options:options?.encoding;
  return encoding?bytes.toString(encoding):bytes;
}
export const readBeforePass8WeaponSourceFile=(path,options)=>historicalRead(path,options,projectPass8WeaponSourceBytes,isPass8WeaponSourceHistoryPath);
export const readBeforePass8XpContinuationFile=(path,options)=>historicalRead(path,options,projectPass8XpContinuationBytes,isPass8XpContinuationHistoryPath);
export const readBeforePass8CharacterReferenceFile=(path,options)=>historicalRead(path,options,projectPass8CharacterReferenceBytes,path=>isPass8XpContinuationHistoryPath(path)||characterPaths.has(path));

export const isPass8PhbSourceHistoryPath=path=>isPass8WeaponSourceHistoryPath(path)||prior.isPass8PhbSourceHistoryPath(path);
export function projectPass8PhbSourceJson(path,value){value=outerJson(path,value,prior.isPass8PhbSourceHistoryPath(path));if(prior.isPass8PhbSourceHistoryPath(path))return prior.projectPass8PhbSourceJson(path,value);assert.ok(isPass8WeaponSourceHistoryPath(path),`${path}: no citation/PHB projection authorized`);return structuredClone(value);}
export function projectPass8PhbSourceBytes(path,bytes){bytes=outerBytes(path,bytes,prior.isPass8PhbSourceHistoryPath(path));return prior.isPass8PhbSourceHistoryPath(path)?prior.projectPass8PhbSourceBytes(path,bytes):Buffer.from(bytes);}
export const readBeforePass8PhbSourceFile=(path,options)=>historicalRead(path,options,projectPass8PhbSourceBytes,isPass8PhbSourceHistoryPath);

// Restore the weapon predecessor before entering the unchanged citation stage.
export const isPass8CitationTargetCropHistoryPath=path=>isPass8WeaponSourceHistoryPath(path)||prior.isPass8CitationTargetCropHistoryPath(path);
export function projectPass8CitationTargetCropJson(path,value){value=outerJson(path,value,prior.isPass8CitationTargetCropHistoryPath(path));if(prior.isPass8CitationTargetCropHistoryPath(path))return prior.projectPass8CitationTargetCropJson(path,value);assert.ok(isPass8WeaponSourceHistoryPath(path),`${path}: no weapon/citation projection authorized`);return structuredClone(value);}
export function projectPass8CitationTargetCropBytes(path,bytes){bytes=outerBytes(path,bytes,prior.isPass8CitationTargetCropHistoryPath(path));return prior.isPass8CitationTargetCropHistoryPath(path)?prior.projectPass8CitationTargetCropBytes(path,bytes):Buffer.from(bytes);}
export const readBeforePass8CitationTargetCropFile=(path,options)=>historicalRead(path,options,projectPass8CitationTargetCropBytes,isPass8CitationTargetCropHistoryPath);
