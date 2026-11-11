// Additive explicit SOURCE/V28 stage functions for the Jo historical I/O
// boundary. The v1 helper family and its six legacy path scopes are re-exported
// byte-for-byte and remain the authority for their own historical contracts.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {readVersion29HistoricalFile, normalizeVersion29HistoricalBytes, normalizeVersion29HistoricalJson, isVersion29HistoricalPath} from '../closed-version29-reader-current-mm-v1.mjs';
const readFileSync=readVersion29HistoricalFile;
import {relative, resolve, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
export * from '../source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs';
import {
  projectPass8UaSourceBytes as legacyUaBytes,
  projectPass8UaSourceJson as legacyUaJson,
  readBeforePass8UaSourceFile as legacyUaRead,
  projectPass8CharacterReferenceBytes as legacyCharacterBytes,
  readBeforePass8CharacterReferenceFile as legacyCharacterRead,
  projectPass8XpContinuationBytes as legacyXpBytes,
  readBeforePass8XpContinuationFile as legacyXpRead,
} from '../source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs';
import {readV28Dmg175EquipmentFile} from '../history-recovery-v1/dmg175-equipment-epoch-outer-v2.proposed.mjs';
import * as preservedPass8Owners from '../../../tests/helpers/pass8-ua-source-history.mjs';

const here = realpathSync(fileURLToPath(new URL('.', import.meta.url)));
const root = realpathSync(resolve(here, '../../..'));
const v1 = resolve(here, '../source-postmetadata-facade-v1');
const sourceCommit = '987a25d3ba2dcac0940569a2afab73f775e38028';
const baselineCommit = '386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
const sourceContractPath = resolve(here, '../history-epoch-proposal-v1/history-epoch-proposal-987-final-v1.json');
const metadataContractPath = resolve(v1, 'closed-metadata-contract-v1.json');
const runtimeContractPath = resolve(v1, 'closed-runtime-source-viewer-contract-v1.json');
const rootRuntimeEvidencePath = resolve(v1, 'closed-runtime-viewer-contract-v1.json');
const coverageContractPath = resolve(here, 'closed-completeness-coverage-contract-v1.json');
const sourceContractSha256 = '6eaa68018b064c1209ce81656b915aa0ed7b02f4fc7b59a149b6571aad0ff7f5';
const metadataContractSha256 = '21800d8e6ac4727d559ebe34e1f2033a8407a1f80189c5ba1d929e16096aba1d';
const runtimeContractSha256 = 'be0a128238bfb4d1ba6e34598b3a06982ee6149ed2512e73c6d63be9bdba9714';
const rootRuntimeEvidenceSha256 = '6c6f1da8faa508212728168cf619fbb66b0b4dca47c1cf8217ee6c0d0ce22728';
const coverageContractSha256 = '1426257cdb61272b14c03deb9bc4c3750368d6c88d6ebe8c0dc6cecf7f1d6818';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (commit, path) => execFileSync('git', ['show', `${commit}:${path}`], {
  cwd: root, maxBuffer: 128 * 1024 * 1024,
});

const sourceContractBytes = readFileSync(sourceContractPath);
assert.equal(sha(sourceContractBytes), sourceContractSha256, 'exact SOURCE11 contract bytes required');
const sourceContract = JSON.parse(sourceContractBytes);
assert.equal(sourceContract.sourcePhase.commit, sourceCommit);
assert.equal(sourceContract.baseline.commit, baselineCommit);
const metadataContractBytes = readFileSync(metadataContractPath);
assert.equal(sha(metadataContractBytes), metadataContractSha256, 'the immutable eight-path metadata contract is required');
const metadataContract = JSON.parse(metadataContractBytes);
const runtimeContractBytes = readFileSync(runtimeContractPath);
assert.equal(sha(runtimeContractBytes), runtimeContractSha256, 'exact runtime stage-zero contract bytes required');
const runtimeContract = JSON.parse(runtimeContractBytes);
const rootRuntimeEvidenceBytes = readFileSync(rootRuntimeEvidencePath);
assert.equal(sha(rootRuntimeEvidenceBytes), rootRuntimeEvidenceSha256, 'exact supplementary root-runtime qualification bytes required');
const rootRuntimeEvidence = JSON.parse(rootRuntimeEvidenceBytes);
assert.equal(runtimeContract.metadataContract.sha256, metadataContractSha256);
assert.equal(rootRuntimeEvidence.separateMetadataContract.sha256, metadataContractSha256);
const coverageContractBytes = readFileSync(coverageContractPath);
assert.equal(sha(coverageContractBytes), coverageContractSha256, 'exact one-file completeness coverage contract required');
const coverageContract = JSON.parse(coverageContractBytes);
assert.equal(coverageContract.path, 'research/source-completeness-coverage.json');
assert.equal(coverageContract.sourceCommit, sourceContract.sourcePhase.commit);
assert.equal(coverageContract.sourceTree, sourceContract.sourcePhase.tree);
assert.equal(coverageContract.baselineCommit, sourceContract.baseline.commit);
assert.equal(coverageContract.baselineTree, sourceContract.baseline.tree);
assert.equal(coverageContract.sourceContract.sha256, sourceContractSha256);
assert.equal(coverageContract.metadataContract.sha256, metadataContractSha256);

const sourceRows = new Map(sourceContract.projectedFiles.map(row => [row.path, row]));
const metadataRows = new Map(metadataContract.files.map(row => [row.path, row]));
const sourceBytesByPath = new Map();
const metadataBytesByPath = new Map();
const sourceObjectHashes = new Map();
const metadataObjectHashes = new Map();
const runtimePath = runtimeContract.path;
const coveragePath = coverageContract.path;
const knownPaths = new Set([...sourceRows.keys(), ...metadataRows.keys(), runtimePath, coveragePath]);
const preservedOwnerContracts = [
  {
    id: 'pass8-ua',
    contract: preservedPass8Owners.decodePass8UaSourceHistory(readFileSync(resolve(root, 'tests/fixtures/pass8-ua-source-history-v1.json.gz'))),
    projectBytes: preservedPass8Owners.projectPass8UaSourceBytes,
    projectJson: preservedPass8Owners.projectPass8UaSourceJson,
  },
  {
    id: 'pass8-weapon',
    contract: preservedPass8Owners.decodePass8WeaponSourceHistory(readFileSync(resolve(root, 'tests/fixtures/pass8-weapon-source-history-v1.json.gz'))),
    projectBytes: preservedPass8Owners.projectPass8WeaponSourceBytes,
    projectJson: preservedPass8Owners.projectPass8WeaponSourceJson,
  },
  {
    id: 'pass8-citation-target-crop',
    contract: preservedPass8Owners.decodePass8CitationTargetCropHistory(readFileSync(resolve(root, 'tests/fixtures/pass8-citation-target-crop-history-v1.json.gz'))),
    projectBytes: preservedPass8Owners.projectPass8CitationTargetCropBytes,
    projectJson: preservedPass8Owners.projectPass8CitationTargetCropJson,
  },
  {
    id: 'pass8-phb',
    contract: preservedPass8Owners.decodePass8PhbSourceHistory(readFileSync(resolve(root, 'tests/fixtures/pass8-phb-source-history-v2.json.gz'))),
    projectBytes: preservedPass8Owners.projectPass8PhbSourceBytes,
    projectJson: preservedPass8Owners.projectPass8PhbSourceJson,
  },
  {
    id: 'pass8-xp-continuation',
    contract: preservedPass8Owners.decodePass8XpContinuationHistory(readFileSync(resolve(root, 'tests/fixtures/pass8-xp-continuation-history-v1.json.gz'))),
    projectBytes: preservedPass8Owners.projectPass8XpContinuationBytes,
    projectJson: preservedPass8Owners.projectPass8XpContinuationJson,
  },
  {
    id: 'pass8-character-reference',
    contract: preservedPass8Owners.decodePass8CharacterReferenceHistory(readFileSync(resolve(root, 'tests/fixtures/pass8-character-reference-history-v1.json.gz'))),
    projectBytes: preservedPass8Owners.projectPass8CharacterReferenceBytes,
    projectJson: preservedPass8Owners.projectPass8CharacterReferenceJson,
  },
];

function isExactUnsupportedBridgeLiteral(error, path, kind) {
  return error instanceof Error
    && error.message === `Invalid MM-to-H historical source reader: ${path}: unknown MM/H/Version29 ${kind} state`;
}

function copyRawBytesForDispatch(value, label) {
  if (types.isProxy(value) || !value || typeof value !== 'object') assert.fail(`${label}: raw bytes required`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Buffer.prototype && prototype !== Uint8Array.prototype) assert.fail(`${label}: Buffer or Uint8Array required`);
  // Copy only typed-array internal bytes. Do not enumerate per-byte keys or read
  // caller-owned decorations such as length, valueOf, iterator, or toJSON.
  const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
  const byteLengthGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteLength').get;
  let byteLength;
  try { byteLength = byteLengthGetter.call(value); }
  catch { assert.fail(`${label}: detached or invalid typed-array view`); }
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) assert.fail(`${label}: invalid typed-array length`);
  const copy = new Uint8Array(byteLength);
  try { Uint8Array.prototype.set.call(copy, value); }
  catch { assert.fail(`${label}: typed-array bytes could not be copied`); }
  if (copy.byteLength !== byteLength) assert.fail(`${label}: typed-array length changed during copy`);
  return Buffer.from(copy.buffer, copy.byteOffset, copy.byteLength);
}

function matchesDeclaredOlderLiteral(path, value, kind) {
  const fingerprint = kind === 'byte' ? sha(value) : objectSha(value);
  const beforeKey = kind === 'byte' ? 'beforeRawSha256' : 'beforeObjectSha256';
  const afterKeys = kind === 'byte' ? ['afterRawSha256', 'currentRawSha256'] : ['afterObjectSha256', 'currentObjectSha256'];
  return preservedOwnerContracts.filter(owner => {
    const stage = owner.contract.files?.[path] || (kind === 'byte' ? owner.contract.rawFiles?.[path] : null);
    if (!stage) return false;
    return [stage[beforeKey], ...afterKeys.map(key => stage[key])].filter(Boolean).includes(fingerprint);
  });
}

function validateWithPreservedOwner(path, value, kind) {
  const owners = matchesDeclaredOlderLiteral(path, value, kind).reverse();
  assert.ok(owners.length, `${path}: value is not an exact state in a preserved older source contract`);
  let lastError;
  for (const owner of owners) {
    try {
      const accepted = kind === 'byte' ? owner.projectBytes(path, value) : owner.projectJson(path, value);
      if (kind === 'byte') return copyRawBytesForDispatch(accepted, `${path} accepted historical projection`);
      assertJsonTree(accepted);
      return structuredClone(accepted);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function normalizeOrDispatchOlderBytes(path, bytes) {
  const supplied = copyRawBytesForDispatch(bytes, path);
  try {
    return {value: normalizeVersion29HistoricalBytes(path, supplied), olderLiteral: false};
  } catch (error) {
    if (!isExactUnsupportedBridgeLiteral(error, path, 'byte')) throw error;
    // The strict guard and mapped-path check have succeeded; only the clean
    // native-byte snapshot may reach a contract-matched preserved owner kernel.
    return {value: validateWithPreservedOwner(path, supplied, 'byte'), olderLiteral: true};
  }
}

function normalizeOrDispatchOlderJson(path, value) {
  assertJsonTree(value);
  const supplied = structuredClone(value);
  try {
    return {value: normalizeVersion29HistoricalJson(path, supplied), olderLiteral: false};
  } catch (error) {
    if (!isExactUnsupportedBridgeLiteral(error, path, 'object')) throw error;
    return {value: validateWithPreservedOwner(path, supplied, 'json'), olderLiteral: true};
  }
}

assert.equal(sourceRows.size, 11);
assert.equal(metadataRows.size, 8);
assert.equal(runtimePath, 'dist/source-viewer.js');
for (const [path, row] of sourceRows) {
  const sourceBytes = git(sourceCommit, path);
  const baselineBytes = git(baselineCommit, path);
  assert.equal(sha(sourceBytes), row.current.rawSha256, `${path}: exact SOURCE raw hash`);
  assert.equal(sha(baselineBytes), row.before.rawSha256, `${path}: exact V28 raw hash`);
  sourceBytesByPath.set(path, {sourceBytes, baselineBytes});
}
for (const [path, row] of metadataRows) {
  const currentBytes = readFileSync(resolve(root, path));
  const sourceBytes = git(sourceCommit, path);
  const baselineBytes = git(baselineCommit, path);
  assert.equal(sha(currentBytes), row.currentMetadata.sha256, `${path}: exact current metadata bytes`);
  assert.equal(sha(sourceBytes), row.sourceEpoch.sha256, `${path}: exact SOURCE metadata bytes`);
  assert.equal(sha(baselineBytes), row.v28Baseline.sha256, `${path}: exact V28 metadata bytes`);
  assert.deepEqual(sourceBytes, baselineBytes, `${path}: metadata predecessor bytes are identical at SOURCE and V28`);
  metadataBytesByPath.set(path, {currentBytes, sourceBytes, baselineBytes});
}
const runtimeCurrentBytes = readFileSync(resolve(root, runtimePath));
const runtimeSourceBytes = git(sourceCommit, runtimePath);
assert.equal(sha(runtimeCurrentBytes), runtimeContract.currentPostSourceRuntime.sha256, 'exact current viewer runtime bytes');
assert.equal(sha(runtimeSourceBytes), runtimeContract.sourceEpoch.sha256, 'exact SOURCE viewer runtime bytes');
const coverageCurrentBytes = readFileSync(resolve(root, coveragePath));
const coverageSourceBytes = git(sourceCommit, coveragePath);
const coverageBaselineBytes = git(baselineCommit, coveragePath);
assert.equal(sha(coverageCurrentBytes), coverageContract.currentMetadata.rawSha256, 'exact current completeness coverage bytes');
assert.equal(coverageCurrentBytes.length, coverageContract.currentMetadata.sizeBytes, 'exact current completeness coverage length');
assert.equal(sha(coverageSourceBytes), coverageContract.sourceV28Predecessor.rawSha256, 'exact SOURCE coverage predecessor bytes');
assert.equal(sha(coverageBaselineBytes), coverageContract.sourceV28Predecessor.rawSha256, 'exact V28 coverage predecessor bytes');
assert.deepEqual(coverageSourceBytes, coverageBaselineBytes, 'the exact coverage SOURCE/V28 predecessor bytes are identical');
for (const pin of metadataContract.qualificationPins) {
  const bytes = readFileSync(resolve(root, pin.path));
  assert.equal(sha(bytes), pin.sha256, `${pin.path}: exact qualification bytes`);
  assert.equal(bytes.length, pin.sizeBytes, `${pin.path}: exact qualification length`);
}
for (const reference of rootRuntimeEvidence.rootEvidence) {
  const bytes = readFileSync(resolve(root, reference.path));
  assert.equal(sha(bytes), reference.sha256, `${reference.path}: exact root runtime evidence`);
  assert.equal(bytes.length, reference.sizeBytes, `${reference.path}: exact root runtime evidence length`);
}

function assertJsonTree(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value) && !Object.is(value, -0), 'known historical JSON must contain exact JSON numbers');
    return;
  }
  assert.equal(typeof value, 'object', 'known historical JSON rejects non-JSON values');
  assert.ok(!types.isProxy(value), 'known historical JSON rejects proxies');
  assert.equal(Object.getPrototypeOf(Object.prototype), null, 'known historical JSON requires the plain Object prototype chain');
  assert.equal(Object.getPrototypeOf(Array.prototype), Object.prototype, 'known historical JSON requires the plain Array prototype chain');
  assert.ok(!Object.hasOwn(Object.prototype, 'toJSON') && !Object.hasOwn(Array.prototype, 'toJSON'),
    'known historical JSON rejects inherited serialization hooks');
  assert.ok(!ancestors.has(value), 'known historical JSON rejects cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length, 0, 'known historical JSON rejects symbol properties');
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    assert.equal(Object.getPrototypeOf(value), Array.prototype, 'known arrays must be plain arrays');
    assert.deepEqual(keys, Array.from({length: value.length}, (_, index) => String(index)), 'known arrays must be dense');
    assert.deepEqual(Object.getOwnPropertyNames(value), [...keys, 'length'], 'known arrays reject hidden properties');
  } else {
    assert.equal(Object.getPrototypeOf(value), Object.prototype, 'known objects must be plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value), keys, 'known objects reject hidden properties');
  }
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(Object.hasOwn(descriptor, 'value'), 'known JSON rejects accessors');
    assertJsonTree(descriptor.value, ancestors);
  }
  ancestors.delete(value);
}
const objectSha = value => { assertJsonTree(value); return sha(JSON.stringify(value)); };
const coverageObjectHashes = {
  current: objectSha(JSON.parse(coverageCurrentBytes)),
  predecessor: objectSha(JSON.parse(coverageSourceBytes)),
};
assert.equal(coverageObjectHashes.current, coverageContract.currentMetadata.canonicalObjectSha256);
assert.equal(coverageObjectHashes.predecessor, coverageContract.sourceV28Predecessor.canonicalObjectSha256);

function sourceObjectState(path) {
  if (!sourceRows.has(path) || sourceRows.get(path).kind !== 'json') return null;
  if (!sourceObjectHashes.has(path)) {
    const row = sourceRows.get(path);
    sourceObjectHashes.set(path, {current: row.current.canonicalObjectSha256, before: row.before.canonicalObjectSha256});
  }
  return sourceObjectHashes.get(path);
}
function metadataObjectState(path) {
  if (!metadataRows.has(path)) return null;
  if (!metadataObjectHashes.has(path)) {
    const bytes = metadataBytesByPath.get(path);
    metadataObjectHashes.set(path, {
      current: objectSha(JSON.parse(bytes.currentBytes)),
      predecessor: objectSha(JSON.parse(bytes.sourceBytes)),
    });
  }
  return metadataObjectHashes.get(path);
}

export const isKnownDmg175OuterPath = path => knownPaths.has(path);

// This exact-path stage is intentionally lower-level than the legacy facade:
// it restores only current runtime/metadata/SOURCE bytes to V28, then leaves
// the caller to run its unchanged historical projector.
export function projectKnownDmg175OuterBytes(path, bytes) {
  assert.ok(typeof path === 'string' && knownPaths.has(path), `${path}: no exact DMG175 outer path is registered`);
  if (isVersion29HistoricalPath(path)) {
    const dispatch = normalizeOrDispatchOlderBytes(path, bytes);
    if (dispatch.olderLiteral) return dispatch.value;
    bytes = dispatch.value;
  }
  assert.ok(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array, `${path}: byte input is required`);
  let value = Buffer.from(bytes);
  if (path === runtimePath) {
    const fingerprint = sha(value);
    if (fingerprint === runtimeContract.currentPostSourceRuntime.sha256) value = Buffer.from(runtimeSourceBytes);
    else if (fingerprint !== runtimeContract.sourceEpoch.sha256 && fingerprint !== sourceRows.get(path).before.rawSha256) {
      assert.fail(`${path}: exact post-runtime, SOURCE, or V28 bytes required`);
    }
  }
  const metadata = metadataBytesByPath.get(path);
  if (metadata) {
    const fingerprint = sha(value);
    const row = metadataRows.get(path);
    if (fingerprint === row.currentMetadata.sha256) value = Buffer.from(metadata.sourceBytes);
    else if (fingerprint !== row.sourceEpoch.sha256 && fingerprint !== row.v28Baseline.sha256) {
      assert.fail(`${path}: exact current metadata, SOURCE, or V28 bytes required`);
    }
  }
  if (path === coveragePath) {
    const fingerprint = sha(value);
    if (fingerprint === coverageContract.currentMetadata.rawSha256) value = Buffer.from(coverageSourceBytes);
    else if (fingerprint !== coverageContract.sourceV28Predecessor.rawSha256) {
      assert.fail(`${path}: exact current coverage, SOURCE, or V28 bytes required`);
    }
  }
  const source = sourceBytesByPath.get(path);
  if (source) {
    const fingerprint = sha(value);
    const row = sourceRows.get(path);
    if (fingerprint === row.current.rawSha256) value = Buffer.from(source.baselineBytes);
    else if (fingerprint !== row.before.rawSha256) assert.fail(`${path}: exact SOURCE or V28 bytes required`);
  }
  return value;
}

// For JSON, only registered JSON stages are allowed. Every current or
// predecessor object is fingerprinted before it is cloned or parsed again.
export function projectKnownDmg175OuterJson(path, value) {
  assert.ok(typeof path === 'string' && knownPaths.has(path), `${path}: no exact DMG175 outer path is registered`);
  if (isVersion29HistoricalPath(path)) {
    const dispatch = normalizeOrDispatchOlderJson(path, value);
    if (dispatch.olderLiteral) return dispatch.value;
    value = dispatch.value;
  }
  assertJsonTree(value);
  let result = structuredClone(value);
  const metadata = metadataObjectState(path);
  if (metadata) {
    const fingerprint = objectSha(result);
    if (fingerprint === metadata.current) result = JSON.parse(metadataBytesByPath.get(path).sourceBytes);
    else if (fingerprint !== metadata.predecessor) assert.fail(`${path}: exact current metadata or SOURCE/V28 JSON object required`);
  }
  if (path === coveragePath) {
    const fingerprint = objectSha(result);
    if (fingerprint === coverageObjectHashes.current) result = JSON.parse(coverageSourceBytes);
    else if (fingerprint !== coverageObjectHashes.predecessor) {
      assert.fail(`${path}: exact current coverage or SOURCE/V28 JSON object required`);
    }
  }
  const source = sourceObjectState(path);
  if (source) {
    const fingerprint = objectSha(result);
    if (fingerprint === source.current) result = JSON.parse(sourceBytesByPath.get(path).baselineBytes);
    else if (fingerprint !== source.before) assert.fail(`${path}: exact SOURCE or V28 JSON object required`);
  } else if (sourceRows.has(path) && sourceRows.get(path).kind !== 'json') {
    assert.fail(`${path}: raw-only outer stage cannot project a JSON value`);
  }
  if (path === runtimePath) assert.fail(`${path}: raw-only runtime stage cannot project a JSON value`);
  return result;
}

// Direct historical kernels call this predicate before deciding whether to
// substitute a current source value. Noncurrent and old literal states are
// then passed unchanged to that kernel for its original strict decision.
export function isExactCurrentDmg175Json(path, value) {
  assert.ok(typeof path === 'string' && knownPaths.has(path), `${path}: no exact DMG175 outer path is registered`);
  if (isVersion29HistoricalPath(path)) {
    const dispatch = normalizeOrDispatchOlderJson(path, value);
    if (dispatch.olderLiteral) return false;
    value = dispatch.value;
  }
  if (path === coveragePath) return objectSha(value) === coverageObjectHashes.current;
  const metadata = metadataObjectState(path);
  if (metadata) return objectSha(value) === metadata.current;
  const source = sourceObjectState(path);
  return source ? objectSha(value) === source.current : false;
}

export function isExactCurrentDmg175Bytes(path, bytes) {
  assert.ok(typeof path === 'string' && knownPaths.has(path), `${path}: no exact DMG175 outer path is registered`);
  if (isVersion29HistoricalPath(path)) {
    const dispatch = normalizeOrDispatchOlderBytes(path, bytes);
    if (dispatch.olderLiteral) return false;
    bytes = dispatch.value;
  }
  if (path === coveragePath) return sha(bytes) === coverageContract.currentMetadata.rawSha256;
  if (path === runtimePath) return sha(bytes) === runtimeContract.currentPostSourceRuntime.sha256;
  if (metadataRows.has(path)) return sha(bytes) === metadataRows.get(path).currentMetadata.sha256;
  if (sourceRows.has(path)) return sha(bytes) === sourceRows.get(path).current.rawSha256;
  return false;
}

function localRepoPath(path) {
  if (typeof path === 'number') return null;
  try {
    const absolute = realpathSync(path instanceof URL ? fileURLToPath(path) : resolve(String(path)));
    const local = relative(root, absolute).replaceAll('\\', '/');
    if (!local || local === '..' || local.startsWith('../') || local.startsWith('/') || isAbsolute(local)) return null;
    return local;
  } catch {
    return null;
  }
}

// Explicit reader for the one closed history test that needs SOURCE11
// normalization even when the unchanged character-reference kernel has no
// legacy predecessor for the registered catalog path. Other paths keep the
// original reader behavior.
export function readBeforeDmg175SourceCharacterReferenceFile(path, options) {
  if (typeof path === 'number') return legacyCharacterRead(path, options);
  const local = localRepoPath(path);
  if (local === null || !knownPaths.has(local)) return legacyCharacterRead(path, options);
  const normalized = projectKnownDmg175OuterBytes(local, readFileSync(path));
  const bytes = legacyCharacterBytes(local, normalized);
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : bytes;
}

// Add the separate coverage inverse only when this exact registered current
// file is supplied, then delegate all outputs to the unchanged UA projector.
export function projectPass8UaSourceBytes(path, bytes) {
  if (path === coveragePath && isExactCurrentDmg175Bytes(path, bytes)) {
    bytes = projectKnownDmg175OuterBytes(path, bytes);
  }
  return legacyUaBytes(path, bytes);
}

export function projectPass8UaSourceJson(path, value) {
  if (path === coveragePath && isExactCurrentDmg175Json(path, value)) {
    value = projectKnownDmg175OuterJson(path, value);
  }
  return legacyUaJson(path, value);
}

export function readBeforePass8UaSourceFile(path, options) {
  const local = localRepoPath(path);
  if (local !== coveragePath) return legacyUaRead(path, options);
  const bytes = projectPass8UaSourceBytes(local, readFileSync(path));
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : bytes;
}

// The explicit current metadata epoch is applied only to this newly closed
// one-file path; all other UA API paths retain the original v1 implementation.

// The Jo-stick mapping cohort has one raw equipment input outside the old XP
// helper scope. Its only added context is the pinned 714d SOURCE→9c831 V28
// file before the original XP reader's unscoped identity behavior.
export function readBeforeJoXpFile(path, options) {
  const local = localRepoPath(path);
  if (local !== 'equipment.json') return legacyXpRead(path, options);
  const v28 = readV28Dmg175EquipmentFile(path);
  const bytes = legacyXpBytes(local, v28);
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : bytes;
}
