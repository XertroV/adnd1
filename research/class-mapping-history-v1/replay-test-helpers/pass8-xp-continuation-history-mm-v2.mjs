import {historicalMmTestRoot} from '../mm-replay-fs-v2.mjs';
import {pathToFileURL as historicalSourceUrl} from 'node:url';
const historicalOriginalUrl=historicalSourceUrl(historicalMmTestRoot+'/'+"tests/helpers/pass8-xp-continuation-history.mjs").href;
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from '../mm-replay-fs-v2.mjs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {relative, resolve} from 'node:path';
import {
  projectPass8CharacterReferenceJson as priorCharacterJson,
  projectPass8CharacterReferenceBytes as priorCharacterBytes,
} from './pass8-character-reference-history-mm-v2.mjs';
export {decodePass8CharacterReferenceHistory} from './pass8-character-reference-history-mm-v2.mjs';

const root = new URL('../../', historicalOriginalUrl);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const contractPath = 'tests/fixtures/pass8-xp-continuation-history-v1.json.gz';
const characterPaths = new Set(['rules.json', 'phb-spell-index.json', 'phb-magic-user-extra.json', 'dist/data.json', 'research/price-source-inventory.json']);

function assertJsonTree(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value) && !Object.is(value, -0), 'XP history accepts only exact JSON numbers');
    return;
  }
  assert.equal(typeof value, 'object', 'XP history cannot hide non-JSON values');
  assert.equal(Object.getOwnPropertySymbols(value).length, 0, 'XP history cannot hide symbols');
  if (Array.isArray(value)) {
    assert.deepEqual(Object.keys(value), Array.from({length: value.length}, (_, i) => String(i)), 'XP history arrays are dense');
    assert.deepEqual(Object.getOwnPropertyNames(value), [...Object.keys(value), 'length'], 'XP history arrays cannot hide properties');
  } else {
    assert.equal(Object.getPrototypeOf(value), Object.prototype, 'XP history uses plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value), Object.keys(value), 'XP history cannot hide properties');
  }
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(Object.hasOwn(descriptor, 'value'), 'XP history cannot hide accessors');
    assertJsonTree(descriptor.value);
  }
}
const objectSha = value => { assertJsonTree(value); return sha(JSON.stringify(value)); };

export function decodePass8XpContinuationHistory(bytes) {
  assert.equal(sha(bytes), '80b01d52c5a80dc98f09a506555e224c1cbf1da94b83b082e9fa9a6260e9b83c', 'exact XP history contract bytes');
  const raw = gunzipSync(bytes);
  assert.equal(sha(raw), 'd0d9fccc38e3699ecc984c62d66c8a69b4e17f1addf1fb2ec7a0fd96213eeeeb');
  const document = JSON.parse(raw);
  assert.equal(document.baseCommit, '77712b831fac3256baf97da385c1dd56b6d82e88');
  assert.equal(Object.keys(document.files).length, 24);
  assert.deepEqual(document.scope.reviewedOwnerIds, ['cleric', 'fighter', 'paladin', 'ranger', 'magic-user', 'illusionist', 'thief', 'ua-cavalier', 'ua-barbarian', 'ua-thief-acrobat', 'ua-paladin']);
  assert.deepEqual(Object.entries(document.files).filter(([path]) => path.startsWith('dist/scans/verified/')).map(([, stage]) => stage.operations.flatMap(op => op.currentSuffix || []).length).sort(), [1,1,1,1,1,1,1,1,1,2,2]);
  const manual = document.files['research/field-evidence-bindings.json'].operations;
  assert.equal(manual.length, 1);
  assert.equal(manual[0].kind, 'appended-array');
  assert.deepEqual(manual[0].path, ['bindings']);
  assert.equal(manual[0].beforeLength, 717);
  assert.equal(manual[0].currentLength, 728);
  assert.deepEqual(manual[0].currentSuffix.map(b => b.itemId), document.scope.reviewedOwnerIds);
  const groups = document.files['research/citation-continuations.json'].operations;
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].path, ['groups']);
  assert.equal(groups[0].beforeLength, 250);
  assert.equal(groups[0].currentLength, 252);
  assert.deepEqual(groups[0].currentSuffix.map(g => g.id), ['pass8-magic-user-xp-continuation-context', 'pass8-ua-paladin-xp-continuation-context']);
  return document;
}

const contract = decodePass8XpContinuationHistory(readFileSync(new URL(contractPath, root)));
for (const reference of [...contract.archives, ...contract.sourceProofs, contract.actualFailedFullRun.inputs, contract.actualFailedFullRun.log]) {
  const bytes = readFileSync(new URL(reference.path, root));
  assert.equal(sha(bytes), reference.sha256, `${reference.path}: preserved source/application/failure evidence`);
  assert.equal(bytes.length, reference.sizeBytes);
}
export const isPass8XpContinuationHistoryPath = path => Object.hasOwn(contract.files, path);

function at(value, parts) {
  for (const part of parts) {
    assert.ok(value !== null && typeof value === 'object' && Object.hasOwn(value, part), 'XP history path must resolve exactly');
    value = value[part];
  }
  return value;
}
function put(value, parts, replacement) {
  if (!parts.length) return replacement;
  const parent = at(value, parts.slice(0, -1));
  Object.defineProperty(parent, parts.at(-1), {value: replacement, writable: true, configurable: true, enumerable: true});
  return value;
}
const restoredObjects = new Map(), restoredBytes = new Map();

// Exactly two full states enter this outer stage. Captured operations preserve
// all literal values and ordering; no count-only masking or field-name stripping.
export function projectPass8XpContinuationJson(path, value) {
  const stage = contract.files[path];
  assert.ok(stage, `${path}: no XP continuation history projection is authorized`);
  const actual = objectSha(value);
  if (actual === stage.beforeObjectSha256) return structuredClone(value);
  assert.equal(actual, stage.currentObjectSha256, `${path}: only the exact approved current or complete before state may enter XP history`);
  if (restoredObjects.has(path)) return structuredClone(restoredObjects.get(path));
  let copy = structuredClone(value);
  for (const operation of stage.operations) {
    if (operation.kind === 'appended-array') {
      const array = at(copy, operation.path);
      assert.equal(array.length, operation.currentLength);
      assert.deepEqual(array.slice(operation.beforeLength), operation.currentSuffix);
      array.splice(operation.beforeLength);
    } else if (operation.kind === 'replace') {
      assert.deepEqual(at(copy, operation.path), operation.current);
      copy = put(copy, operation.path, structuredClone(operation.before));
    } else {
      assert.equal(operation.kind, 'property');
      const parent = at(copy, operation.path.slice(0, -1)), key = operation.path.at(-1);
      assert.equal(Object.hasOwn(parent, key), operation.currentPresent);
      if (operation.currentPresent) assert.deepEqual(parent[key], operation.current);
      if (operation.beforePresent) copy = put(copy, operation.path, structuredClone(operation.before));
      else delete parent[key];
    }
  }
  for (const order of [...stage.objectOrders].sort((a, b) => b.path.length - a.path.length)) {
    const object = at(copy, order.path);
    assert.deepEqual(Object.keys(object).sort(), [...order.before].sort());
    copy = put(copy, order.path, Object.fromEntries(order.before.map(key => [key, object[key]])));
  }
  assert.equal(objectSha(copy), stage.beforeObjectSha256, `${path}: entire exact predecessor object restored`);
  const raw = Buffer.from(stage.beforeRawUtf8 ?? JSON.stringify(copy, null, 2) + '\n');
  assert.equal(sha(raw), stage.beforeRawSha256, `${path}: entire exact predecessor raw bytes restored`);
  restoredObjects.set(path, structuredClone(copy));
  restoredBytes.set(path, raw);
  return copy;
}

export function projectPass8XpContinuationBytes(path, bytes) {
  const stage = contract.files[path];
  if (!stage) return bytes;
  const actual = sha(bytes);
  assert.ok([stage.beforeRawSha256, stage.currentRawSha256].includes(actual), `${path}: exact XP before/current raw input bytes`);
  if (actual === stage.beforeRawSha256) return Buffer.from(bytes);
  if (!restoredBytes.has(path)) projectPass8XpContinuationJson(path, JSON.parse(bytes));
  return Buffer.from(restoredBytes.get(path));
}

// Compose around the original character-reference adapter without changing its
// code, sealed proof, rejection checks or accepted literal earlier states.
export function projectPass8CharacterReferenceJson(path, value) {
  const stage = contract.files[path], fingerprint = stage ? sha(JSON.stringify(value)) : null;
  if (stage && (!characterPaths.has(path) || [stage.currentObjectSha256, stage.beforeObjectSha256].includes(fingerprint))) value = projectPass8XpContinuationJson(path, value);
  return priorCharacterJson(path, value);
}
export function projectPass8CharacterReferenceBytes(path, bytes) {
  const stage = contract.files[path], fingerprint = stage ? sha(bytes) : null;
  if (stage && (!characterPaths.has(path) || [stage.currentRawSha256, stage.beforeRawSha256].includes(fingerprint))) bytes = projectPass8XpContinuationBytes(path, bytes);
  return priorCharacterBytes(path, bytes);
}
function historicalRead(path, options, project) {
  if (typeof path === 'number') return readFileSync(path, options);
  const absolute = path instanceof URL ? fileURLToPath(path) : resolve(String(path));
  const local = relative(fileURLToPath(root), absolute).replaceAll('\\', '/');
  if (!isPass8XpContinuationHistoryPath(local) && !(project === projectPass8CharacterReferenceBytes && characterPaths.has(local))) return readFileSync(path, options);
  const bytes = project(local, readFileSync(path));
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : bytes;
}
export const readBeforePass8XpContinuationFile = (path, options) => historicalRead(path, options, projectPass8XpContinuationBytes);
export const readBeforePass8CharacterReferenceFile = (path, options) => historicalRead(path, options, projectPass8CharacterReferenceBytes);
