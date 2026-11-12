import {historicalMmTestRoot} from '../mm-replay-fs-v1.mjs';
import {pathToFileURL as historicalSourceUrl} from 'node:url';
const historicalOriginalUrl=historicalSourceUrl(historicalMmTestRoot+'/'+"tests/helpers/pass8-character-reference-history.mjs").href;
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from '../mm-replay-fs-v1.mjs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {relative, resolve} from 'node:path';

const root = new URL('../../', historicalOriginalUrl);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function assertJsonTree(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value) && !Object.is(value, -0), 'history inputs contain only exact JSON numbers');
    return;
  }
  assert.equal(typeof value, 'object', 'history inputs cannot contain values hidden by JSON serialization');
  assert.equal(Object.getOwnPropertySymbols(value).length, 0, 'history inputs cannot hide symbol properties');
  if (Array.isArray(value)) {
    assert.deepEqual(Object.keys(value), Array.from({length: value.length}, (_, i) => String(i)), 'history arrays are dense and have no extra properties');
    assert.deepEqual(Object.getOwnPropertyNames(value), [...Object.keys(value), 'length'], 'history arrays cannot hide non-enumerable properties');
  } else {
    assert.equal(Object.getPrototypeOf(value), Object.prototype, 'history inputs are plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value), Object.keys(value), 'history inputs cannot hide non-enumerable properties');
  }
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(Object.hasOwn(descriptor, 'value'), 'history inputs cannot hide accessors');
    assertJsonTree(descriptor.value);
  }
}
const objectSha = value => { assertJsonTree(value); return sha(JSON.stringify(value)); };
const contractPath = 'tests/fixtures/pass8-character-reference-history-v1.json.gz';
const contractSha256 = '6fb9c572179302493e3bc8759e1bcd546915f9775ae887a9b2b5dc78fb208eb5';

export function decodePass8CharacterReferenceHistory(bytes) {
  assert.equal(sha(bytes), contractSha256, 'exact captured pass8 history contract');
  const raw = gunzipSync(bytes);
  assert.equal(sha(raw), '6651e6296358eceaf20ca36218062ee542758573606a28169e450b17b1bebc51');
  const contract = JSON.parse(raw);
  assert.equal(contract.baseCommit, '6d330af372ac809d11ed6029ed8695d0d8dc0909');
  assert.deepEqual(Object.keys(contract.files), [
    'rules.json', 'phb-spell-index.json', 'phb-magic-user-extra.json',
    'dist/data.json', 'research/price-source-inventory.json',
  ]);
  assert.deepEqual(contract.scope.owners, [
    {collection: 'rules', id: 'secondary-skills'},
    {collection: 'rules', id: 'ua-elven-subrace-adjustments'},
    {collection: 'spells', id: 'phb-magic-user-lnfravision'},
  ]);
  for (const prior of contract.beforeFiles) {
    assert.equal(sha(prior.utf8), prior.sha256, `${prior.path}: complete before helper/test bytes`);
    assert.equal(Buffer.byteLength(prior.utf8), prior.sizeBytes);
  }
  return contract;
}

const contract = decodePass8CharacterReferenceHistory(readFileSync(new URL(contractPath, root)));
for (const ref of [...contract.references, contract.sealedBaseline]) {
  const bytes = readFileSync(new URL(ref.path, root));
  assert.equal(sha(bytes), ref.sha256, `${ref.path}: preserved source review or historical evidence`);
  if (ref.sizeBytes !== undefined) assert.equal(bytes.length, ref.sizeBytes);
}

// This is an outer history stage. Old matrix/175/Jo/mechanics guards still run
// afterward, against their unchanged full predecessor objects and goldens.
export function projectPass8CharacterReferenceJson(path, value) {
  const stage = contract.files[path];
  assert.ok(stage, `${path}: no pass8 history projection is authorized`);
  const actual = objectSha(value);
  if (actual === stage.beforeObjectSha256) return structuredClone(value);
  assert.equal(actual, stage.currentObjectSha256, `${path}: only the exact approved current or complete before state may enter pass8 history`);
  const copy = structuredClone(value);
  for (const replacement of stage.replacements) {
    const {collection, id, index, before, current} = replacement;
    const matches = copy[collection].map((row, position) => ({row, position})).filter(({row}) =>
      collection === 'fieldEvidenceBindings'
        ? row.collection === 'spells' && row.itemId === id && row.fieldPointer === ''
        : row.id === id);
    assert.equal(matches.length, 1, `${path}: exactly one approved ${collection}:${id}`);
    assert.equal(matches[0].position, index, `${path}: original owner/binding position`);
    assert.deepEqual(matches[0].row, current, `${path}: complete approved owner/binding`);
    copy[collection][index] = structuredClone(before);
  }
  assert.equal(objectSha(copy), stage.beforeObjectSha256, `${path}: restore the entire exact predecessor, including unrelated fields`);
  return copy;
}

export function projectPass8CharacterReferenceBytes(path, bytes) {
  if (!Object.hasOwn(contract.files, path)) return bytes;
  const stage = contract.files[path];
  assert.ok([stage.beforeRawSha256, stage.currentRawSha256].includes(sha(bytes)), `${path}: exact before/current raw input bytes`);
  const value = projectPass8CharacterReferenceJson(path, JSON.parse(bytes));
  if (sha(bytes) === stage.beforeRawSha256) return Buffer.from(bytes);
  const beforeBytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  assert.equal(sha(beforeBytes), stage.beforeRawSha256, `${path}: complete historical raw bytes restored`);
  return beforeBytes;
}

// Only the five pinned files are projected; all other reads keep native fs
// behavior. This reader is used only by explicit historical test consumers.
export function readBeforePass8CharacterReferenceFile(path, options) {
  if (typeof path === 'number') return readFileSync(path, options);
  const absolute = path instanceof URL ? fileURLToPath(path) : resolve(String(path));
  const local = relative(fileURLToPath(root), absolute).replaceAll('\\', '/');
  if (!Object.hasOwn(contract.files, local)) return readFileSync(path, options);
  const bytes = projectPass8CharacterReferenceBytes(local, readFileSync(path));
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : bytes;
}
