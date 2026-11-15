import {historicalMmTestRoot} from '../mm-replay-fs-v1.mjs';
import {pathToFileURL as historicalSourceUrl} from 'node:url';
const historicalOriginalUrl=historicalSourceUrl(historicalMmTestRoot+'/'+"tests/helpers/pass8-phb-source-history.mjs").href;
// Explicit historical-test boundary only. Current audits/UI never import this.
import assert from 'node:assert/strict';
import {execFileSync} from '../mm-replay-child-process-v1.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from '../mm-replay-fs-v1.mjs';
import {relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {gunzipSync} from 'node:zlib';
import * as prior from './pass8-xp-continuation-history.mjs';
export {decodePass8XpContinuationHistory,decodePass8CharacterReferenceHistory} from './pass8-xp-continuation-history.mjs';
const root = new URL('../../',historicalOriginalUrl);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const contractPath = 'tests/fixtures/pass8-phb-source-history-v2.json.gz';
const sourcePaths = ['phb-spells.json','classes.json','rules.json','dist/data.json','citation-overrides.json','research/citation-continuations.json','dist/source-continuations.json','research/source-visual-reviews.json','research/price-source-inventory.json','research/mechanics-audit-progress.json'];
const metadataPaths = ['research/current-source-raster-snapshot.json','research/current-continuation-candidate-snapshot.json','research/gaps-limitations-next-task.json','dist/coverage-gaps.json','research/monetary-source-inventory.json'];
const characterPaths = new Set(['rules.json','phb-spell-index.json','phb-magic-user-extra.json','dist/data.json','research/price-source-inventory.json']);

export function decodePass8PhbSourceHistory(bytes) {
  assert.equal(sha(bytes),'80ef153cc0bf38bab6edf8db71d3efd4e5073fc24a3b1129d1050a26d3c1b672','exact closed PHB history contract bytes');
  const document = JSON.parse(gunzipSync(bytes));
  assert.equal(document.artifactType,'exact-pass8-phb-source-historical-projection');
  assert.equal(document.beforeCommit,'ae7f02c6a5aac9ac8da1f7bc5cf5152e422fcd58');
  assert.equal(document.sourceCommit,'65991ec94579a2f9fc587118e15622313216fa14');
  assert.deepEqual(document.sourcePaths,sourcePaths);
  assert.deepEqual(document.metadataPaths,metadataPaths);
  assert.deepEqual(Object.keys(document.files),[...sourcePaths,...metadataPaths]);
  assert.deepEqual(document.rawPaths,['dist/books.js']);
  assert.deepEqual(Object.keys(document.rawFiles),document.rawPaths);
  return document;
}
const contract = decodePass8PhbSourceHistory(readFileSync(new URL(contractPath,root)));
for (const ref of contract.proofs) {
  const bytes = readFileSync(new URL(ref.path,root));
  assert.equal(sha(bytes),ref.sha256,`${ref.path}: preserved PHB proof`);
  assert.equal(bytes.length,ref.sizeBytes);
}
function assertJsonTree(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {assert.ok(Number.isFinite(value) && !Object.is(value,-0),'PHB history requires exact JSON numbers');return;}
  assert.equal(typeof value,'object','PHB history rejects non-JSON values');
  assert.ok(!types.isProxy(value),'PHB history rejects proxies');
  assert.ok(!ancestors.has(value),'PHB history rejects cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length,0,'PHB history rejects symbols');
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    assert.deepEqual(keys,Array.from({length:value.length},(_,i)=>String(i)),'PHB history requires dense arrays');
    assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'PHB history rejects hidden array properties');
  } else {
    assert.equal(Object.getPrototypeOf(value),Object.prototype,'PHB history requires plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value),keys,'PHB history rejects hidden properties');
  }
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value,key);
    assert.ok(Object.hasOwn(descriptor,'value'),'PHB history rejects accessors');
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
    assert.equal(sha(bytes),stage.beforeRawSha256,`${path}: complete Git-bound PHB predecessor bytes`);
    const value = Object.hasOwn(contract.files,path)?JSON.parse(bytes):null;
    if (value!==null) assert.equal(objectSha(value),stage.beforeObjectSha256,`${path}: complete PHB predecessor object`);
    beforeBytes.set(path,bytes); beforeObjects.set(path,value);
  }
  return {bytes:beforeBytes.get(path),value:beforeObjects.get(path)};
}
export const isPass8PhbSourceHistoryPath = path => Object.hasOwn(contract.files,path)||Object.hasOwn(contract.rawFiles,path);
export function projectPass8PhbSourceJson(path,value) {
  const stage = contract.files[path];assert.ok(stage,`${path}: no PHB history projection is authorized`);
  const fingerprint = objectSha(value);
  assert.ok([stage.beforeObjectSha256,stage.afterObjectSha256].includes(fingerprint),`${path}: exact complete PHB before/after object required`);
  return structuredClone(capturedBefore(path).value);
}
export function projectPass8PhbSourceBytes(path,bytes) {
  const stage = contract.files[path] || contract.rawFiles[path];if (!stage) return Buffer.from(bytes);
  assert.ok([stage.beforeRawSha256,stage.afterRawSha256].includes(sha(bytes)),`${path}: exact PHB before/after raw bytes required`);
  return Buffer.from(capturedBefore(path).bytes);
}
// Earlier literal states enter only their original closed adapters. There is no
// catch-and-fallback and no caller policy; unknown scoped states always reject.
function outerJson(path,value,allowsPrior) {
  assert.ok(!Object.hasOwn(contract.rawFiles,path),`${path}: raw-only PHB history stage`);
  const stage=contract.files[path];if (!stage) return value;
  const fingerprint=objectSha(value);
  if ([stage.beforeObjectSha256,stage.afterObjectSha256].includes(fingerprint)) return projectPass8PhbSourceJson(path,value);
  assert.ok(allowsPrior,`${path}: exact complete PHB before/after object required`);
  return value;
}
function outerBytes(path,bytes,allowsPrior) {
  const stage=contract.files[path] || contract.rawFiles[path];if (!stage) return bytes;
  if ([stage.beforeRawSha256,stage.afterRawSha256].includes(sha(bytes))) return projectPass8PhbSourceBytes(path,bytes);
  assert.ok(allowsPrior,`${path}: exact PHB before/after raw bytes required`);
  return bytes;
}
export const isPass8XpContinuationHistoryPath = path => isPass8PhbSourceHistoryPath(path) || prior.isPass8XpContinuationHistoryPath(path);
export function projectPass8XpContinuationJson(path,value) {
  value=outerJson(path,value,prior.isPass8XpContinuationHistoryPath(path));
  if (prior.isPass8XpContinuationHistoryPath(path)) return prior.projectPass8XpContinuationJson(path,value);
  assert.ok(isPass8PhbSourceHistoryPath(path),`${path}: no XP continuation history projection is authorized`);
  return structuredClone(value);
}
export function projectPass8XpContinuationBytes(path,bytes) {
  bytes=outerBytes(path,bytes,prior.isPass8XpContinuationHistoryPath(path));
  return prior.isPass8XpContinuationHistoryPath(path)?prior.projectPass8XpContinuationBytes(path,bytes):Buffer.from(bytes);
}
export function projectPass8CharacterReferenceJson(path,value) {
  value=outerJson(path,value,prior.isPass8XpContinuationHistoryPath(path)||characterPaths.has(path));
  if (prior.isPass8XpContinuationHistoryPath(path)||characterPaths.has(path)) return prior.projectPass8CharacterReferenceJson(path,value);
  assert.ok(isPass8PhbSourceHistoryPath(path),`${path}: no PHB/character history projection is authorized`);
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
export const readBeforePass8PhbSourceFile=(path,options)=>historicalRead(path,options,projectPass8PhbSourceBytes,isPass8PhbSourceHistoryPath);
export const readBeforePass8XpContinuationFile=(path,options)=>historicalRead(path,options,projectPass8XpContinuationBytes,isPass8XpContinuationHistoryPath);
export const readBeforePass8CharacterReferenceFile=(path,options)=>historicalRead(path,options,projectPass8CharacterReferenceBytes,path=>isPass8XpContinuationHistoryPath(path)||characterPaths.has(path));
