import {historicalMmTestRoot} from '../mm-replay-fs-v1.mjs';
import {pathToFileURL as historicalSourceUrl} from 'node:url';
const historicalOriginalUrl=historicalSourceUrl(historicalMmTestRoot+'/'+"tests/helpers/pass8-citation-target-crop-history.mjs").href;
// Explicit historical-test boundary only. Current audits/UI never import this.
import assert from 'node:assert/strict';
import {execFileSync} from '../mm-replay-child-process-v1.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from '../mm-replay-fs-v1.mjs';
import {relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {gunzipSync} from 'node:zlib';
import * as prior from './pass8-phb-source-history.mjs';
export {decodePass8PhbSourceHistory,decodePass8XpContinuationHistory,decodePass8CharacterReferenceHistory} from './pass8-phb-source-history.mjs';
const root = new URL('../../',historicalOriginalUrl);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const contractPath = 'tests/fixtures/pass8-citation-target-crop-history-v1.json.gz';
const sourcePaths = ["citation-overrides.json", "dist/data.json", "dist/scans/verified/equipment-phb-bullseye-lantern.json", "dist/scans/verified/equipment-phb-iron-spike.json", "dist/scans/verified/equipment-phb-silver-mirror.json", "dist/scans/verified/equipment-phb-thieves-tools.json", "dist/scans/verified/spells-phb-illusionist-demi-shadow-magic.json", "dist/scans/verified/spells-phb-illusionist-shadow-magic.json", "dist/scans/verified/spells-phb-illusionist-veil.json", "dist/scans/verified/spells-ua-illusionist-ultravision.json", "dist/scans/verified/spells-ua-magic-user-dust.json", "dist/scans/verified/spells-ua-magic-user-ultravision.json", "dist/scans/verified/spells-ua-magic-user-vocalize.json", "dist/source-continuations.json", "research/citation-continuations.json", "research/field-evidence-bindings.json", "research/mechanics-audit-progress.json", "research/price-source-inventory.json", "research/source-visual-reviews.json", "tests/fixtures/source-scan-inventory.json"];
const metadataPaths = ["research/current-source-raster-snapshot.json", "research/current-continuation-candidate-snapshot.json", "research/gaps-limitations-next-task.json", "dist/coverage-gaps.json", "research/monetary-source-inventory.json"];
const characterPaths = new Set(['rules.json','phb-spell-index.json','phb-magic-user-extra.json','dist/data.json','research/price-source-inventory.json']);

export function decodePass8CitationTargetCropHistory(bytes) {
  assert.equal(sha(bytes),'26f1aadb110934ff1b6ce3f7aa334206e65183608d8f13f0248eaf13b1e2987a','exact closed citation-target/crop history contract bytes');
  const document = JSON.parse(gunzipSync(bytes));
  assert.equal(document.artifactType,'exact-pass8-citation-target-crop-historical-projection');
  assert.equal(document.beforeCommit,'4aa977788085f67a28a24d40965edf987bc7242b');
  assert.equal(document.sourceCommit,'9f445e32b079a3339b26a345776f8fb34b81f376');
  assert.deepEqual(document.sourcePaths,sourcePaths);
  assert.deepEqual(document.metadataPaths,metadataPaths);
  assert.deepEqual(Object.keys(document.files),[...sourcePaths,...metadataPaths]);
  assert.deepEqual(document.rawPaths,[]);
  assert.deepEqual(Object.keys(document.rawFiles),document.rawPaths);
  return document;
}
const contract = decodePass8CitationTargetCropHistory(readFileSync(new URL(contractPath,root)));
for (const ref of contract.proofs) {
  const bytes = readFileSync(new URL(ref.path,root));
  assert.equal(sha(bytes),ref.sha256,`${ref.path}: preserved citation-target/crop proof`);
  assert.equal(bytes.length,ref.sizeBytes);
}
function assertJsonTree(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {assert.ok(Number.isFinite(value) && !Object.is(value,-0),'citation-target/crop history requires exact JSON numbers');return;}
  assert.equal(typeof value,'object','citation-target/crop history rejects non-JSON values');
  assert.ok(!types.isProxy(value),'citation-target/crop history rejects proxies');
  assert.ok(!ancestors.has(value),'citation-target/crop history rejects cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length,0,'citation-target/crop history rejects symbols');
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    assert.deepEqual(keys,Array.from({length:value.length},(_,i)=>String(i)),'citation-target/crop history requires dense arrays');
    assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'citation-target/crop history rejects hidden array properties');
  } else {
    assert.equal(Object.getPrototypeOf(value),Object.prototype,'citation-target/crop history requires plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value),keys,'citation-target/crop history rejects hidden properties');
  }
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value,key);
    assert.ok(Object.hasOwn(descriptor,'value'),'citation-target/crop history rejects accessors');
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
    assert.equal(sha(bytes),stage.beforeRawSha256,`${path}: complete Git-bound citation-target/crop predecessor bytes`);
    const value = Object.hasOwn(contract.files,path)?JSON.parse(bytes):null;
    if (value!==null) assert.equal(objectSha(value),stage.beforeObjectSha256,`${path}: complete citation-target/crop predecessor object`);
    beforeBytes.set(path,bytes); beforeObjects.set(path,value);
  }
  return {bytes:beforeBytes.get(path),value:beforeObjects.get(path)};
}
export const isPass8CitationTargetCropHistoryPath = path => Object.hasOwn(contract.files,path)||Object.hasOwn(contract.rawFiles,path);
export function projectPass8CitationTargetCropJson(path,value) {
  const stage = contract.files[path];assert.ok(stage,`${path}: no citation-target/crop history projection is authorized`);
  const fingerprint = objectSha(value);
  assert.ok([stage.beforeObjectSha256,stage.afterObjectSha256].includes(fingerprint),`${path}: exact complete citation-target/crop before/after object required`);
  return structuredClone(capturedBefore(path).value);
}
export function projectPass8CitationTargetCropBytes(path,bytes) {
  const stage = contract.files[path] || contract.rawFiles[path];if (!stage) return Buffer.from(bytes);
  assert.ok([stage.beforeRawSha256,stage.afterRawSha256].includes(sha(bytes)),`${path}: exact citation-target/crop before/after raw bytes required`);
  return Buffer.from(capturedBefore(path).bytes);
}
// Earlier literal states enter only their original closed adapters. There is no
// catch-and-fallback and no caller policy; unknown scoped states always reject.
function outerJson(path,value,allowsPrior) {
  assert.ok(!Object.hasOwn(contract.rawFiles,path),`${path}: raw-only citation-target/crop history stage`);
  const stage=contract.files[path];if (!stage) return value;
  const fingerprint=objectSha(value);
  if ([stage.beforeObjectSha256,stage.afterObjectSha256].includes(fingerprint)) return projectPass8CitationTargetCropJson(path,value);
  assert.ok(allowsPrior,`${path}: exact complete citation-target/crop before/after object required`);
  return value;
}
function outerBytes(path,bytes,allowsPrior) {
  const stage=contract.files[path] || contract.rawFiles[path];if (!stage) return bytes;
  if ([stage.beforeRawSha256,stage.afterRawSha256].includes(sha(bytes))) return projectPass8CitationTargetCropBytes(path,bytes);
  assert.ok(allowsPrior,`${path}: exact citation-target/crop before/after raw bytes required`);
  return bytes;
}
export const isPass8XpContinuationHistoryPath = path => isPass8CitationTargetCropHistoryPath(path) || prior.isPass8XpContinuationHistoryPath(path);
export function projectPass8XpContinuationJson(path,value) {
  value=outerJson(path,value,prior.isPass8XpContinuationHistoryPath(path));
  if (prior.isPass8XpContinuationHistoryPath(path)) return prior.projectPass8XpContinuationJson(path,value);
  assert.ok(isPass8CitationTargetCropHistoryPath(path),`${path}: no XP continuation history projection is authorized`);
  return structuredClone(value);
}
export function projectPass8XpContinuationBytes(path,bytes) {
  bytes=outerBytes(path,bytes,prior.isPass8XpContinuationHistoryPath(path));
  return prior.isPass8XpContinuationHistoryPath(path)?prior.projectPass8XpContinuationBytes(path,bytes):Buffer.from(bytes);
}
export function projectPass8CharacterReferenceJson(path,value) {
  value=outerJson(path,value,prior.isPass8XpContinuationHistoryPath(path)||characterPaths.has(path));
  if (prior.isPass8XpContinuationHistoryPath(path)||characterPaths.has(path)) return prior.projectPass8CharacterReferenceJson(path,value);
  assert.ok(isPass8CitationTargetCropHistoryPath(path),`${path}: no citation-target/crop/character history projection is authorized`);
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
export const readBeforePass8CitationTargetCropFile=(path,options)=>historicalRead(path,options,projectPass8CitationTargetCropBytes,isPass8CitationTargetCropHistoryPath);
export const readBeforePass8XpContinuationFile=(path,options)=>historicalRead(path,options,projectPass8XpContinuationBytes,isPass8XpContinuationHistoryPath);
export const readBeforePass8CharacterReferenceFile=(path,options)=>historicalRead(path,options,projectPass8CharacterReferenceBytes,path=>isPass8XpContinuationHistoryPath(path)||characterPaths.has(path));

export const isPass8PhbSourceHistoryPath=path=>isPass8CitationTargetCropHistoryPath(path)||prior.isPass8PhbSourceHistoryPath(path);
export function projectPass8PhbSourceJson(path,value){value=outerJson(path,value,prior.isPass8PhbSourceHistoryPath(path));if(prior.isPass8PhbSourceHistoryPath(path))return prior.projectPass8PhbSourceJson(path,value);assert.ok(isPass8CitationTargetCropHistoryPath(path),`${path}: no citation/PHB projection authorized`);return structuredClone(value);}
export function projectPass8PhbSourceBytes(path,bytes){bytes=outerBytes(path,bytes,prior.isPass8PhbSourceHistoryPath(path));return prior.isPass8PhbSourceHistoryPath(path)?prior.projectPass8PhbSourceBytes(path,bytes):Buffer.from(bytes);}
export const readBeforePass8PhbSourceFile=(path,options)=>historicalRead(path,options,projectPass8PhbSourceBytes,isPass8PhbSourceHistoryPath);
