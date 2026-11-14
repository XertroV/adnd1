// Research-only additive facade for historical call sites in the captured
// DMG175 first-fullsuite history lane. The existing 37-kernel/UA helpers and
// their contracts remain byte-for-byte unchanged.
import assert from 'node:assert/strict';
import {createHistoricalControlledGit} from '../historical-controlled-git-v1.mjs';
import {createHash} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {readVersion29HistoricalFile, normalizeVersion29HistoricalBytes, normalizeVersion29HistoricalJson, isVersion29HistoricalPath} from '../closed-version29-reader-class-mapping-v1.mjs';
const readFileSync=readVersion29HistoricalFile;
import {resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import * as old from '../../../tests/helpers/pass8-ua-source-history.mjs';

export {
  decodePass8CharacterReferenceHistory,
  decodePass8CitationTargetCropHistory,
  decodePass8PhbSourceHistory,
  decodePass8UaSourceHistory,
  decodePass8WeaponSourceHistory,
  decodePass8XpContinuationHistory,
} from '../../../tests/helpers/pass8-ua-source-history.mjs';

const here = realpathSync(fileURLToPath(new URL('.', import.meta.url)));
const root = realpathSync(resolve(here, '../../..'));
const sourceCommit = '987a25d3ba2dcac0940569a2afab73f775e38028';
const sourceTree = 'd7ac09ce9abe4ef94ae355a44b8e0c5ca6f74ea3';
const baselineCommit = '386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
const baselineTree = '2611405f3c8ab151936cb0f83ed57334141e1146';
const sourceContractPath = resolve(root, 'research/mm-source-history-v1/history-epoch-proposal-v1/history-epoch-proposal-987-final-v1.json');
const metadataContractPath = resolve(root, 'research/mm-source-history-v1/source-postmetadata-facade-v1/closed-metadata-contract-v1.json');
const runtimeContractPath = resolve(root, 'research/mm-source-history-v1/source-postmetadata-facade-v1/closed-runtime-source-viewer-contract-v1.json');
const runtimeEvidencePath = resolve(root, 'research/mm-source-history-v1/source-postmetadata-facade-v1/closed-runtime-viewer-contract-v1.json');
const sourceContractSha256 = '6eaa68018b064c1209ce81656b915aa0ed7b02f4fc7b59a149b6571aad0ff7f5';
const metadataContractSha256 = '21800d8e6ac4727d559ebe34e1f2033a8407a1f80189c5ba1d929e16096aba1d';
const runtimeContractSha256 = 'be0a128238bfb4d1ba6e34598b3a06982ee6149ed2512e73c6d63be9bdba9714';
const runtimeEvidenceSha256 = '6c6f1da8faa508212728168cf619fbb66b0b4dca47c1cf8217ee6c0d0ce22728';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const {git,spawnGit}=createHistoricalControlledGit(root);
const gitBlob = (commit, path) => git(['show', `${commit}:${path}`]);

const sourceContractBytes = readFileSync(sourceContractPath);
assert.equal(sha(sourceContractBytes), sourceContractSha256, 'exact closed SOURCE11 contract bytes required');
const sourceContract = JSON.parse(sourceContractBytes);
assert.equal(sourceContract.status, 'proposal; not activated; no existing adapters or assertions changed');
assert.equal(sourceContract.sourcePhase.commit, sourceCommit);
assert.equal(sourceContract.sourcePhase.tree, sourceTree);
assert.equal(sourceContract.baseline.commit, baselineCommit);
assert.equal(sourceContract.baseline.tree, baselineTree);

const metadataContractBytes = readFileSync(metadataContractPath);
assert.equal(sha(metadataContractBytes), metadataContractSha256, 'exact closed post-SOURCE metadata contract bytes required');
const metadataContract = JSON.parse(metadataContractBytes);
assert.equal(metadataContract.status, 'research proposal; actual root native validation endpoint; not an approval to project current tests');
assert.equal(metadataContract.sourceCommit, sourceCommit);
assert.equal(metadataContract.sourceTree, sourceTree);
assert.equal(metadataContract.baselineCommit, baselineCommit);
assert.equal(metadataContract.baselineTree, baselineTree);
assert.equal(metadataContract.files.length, 8, 'exactly eight post-SOURCE metadata paths are declared');
assert.equal(metadataContract.qualificationPins.length, 14, 'the complete raw source/metadata qualification set is closed');

const runtimeContractBytes = readFileSync(runtimeContractPath);
assert.equal(sha(runtimeContractBytes), runtimeContractSha256, 'exact one-file runtime inverse contract bytes required');
const runtimeContract = JSON.parse(runtimeContractBytes);
assert.equal(runtimeContract.path, 'dist/source-viewer.js');
assert.equal(runtimeContract.sourceCommit, sourceCommit);
assert.equal(runtimeContract.sourceTree, sourceTree);
assert.equal(runtimeContract.baselineCommit, baselineCommit);
assert.equal(runtimeContract.baselineTree, baselineTree);
assert.deepEqual(runtimeContract.sourceContract, {
  path: 'research/dmg175-validation-coordinator-v1/history-epoch-proposal-v1/history-epoch-proposal-987-final-v1.json',
  sha256: sourceContractSha256,
});
assert.deepEqual(runtimeContract.metadataContract, {
  path: 'research/dmg175-validation-coordinator-v1/source-postmetadata-facade-v1/closed-metadata-contract-v1.json',
  sha256: metadataContractSha256,
});
const runtimeEvidenceBytes = readFileSync(runtimeEvidencePath);
assert.equal(sha(runtimeEvidenceBytes), runtimeEvidenceSha256, 'exact root runtime/browser qualification contract bytes required');
const runtimeEvidence = JSON.parse(runtimeEvidenceBytes);
assert.equal(runtimeEvidence.path, runtimeContract.path);
assert.equal(runtimeEvidence.sourceCommit, sourceCommit);
assert.equal(runtimeEvidence.sourceTree, sourceTree);
assert.deepEqual(runtimeEvidence.currentRuntime, runtimeContract.currentPostSourceRuntime);
assert.deepEqual(runtimeEvidence.sourceEpoch, runtimeContract.sourceEpoch);
assert.equal(runtimeEvidence.separateMetadataContract.path, runtimeContract.metadataContract.path);
assert.equal(runtimeEvidence.separateMetadataContract.sha256, runtimeContract.metadataContract.sha256);
assert.equal(runtimeEvidence.separateMetadataContract.changed, false);
for (const reference of runtimeEvidence.rootEvidence) {
  const bytes = readFileSync(resolve(root, reference.path));
  assert.equal(sha(bytes), reference.sha256, `${reference.path}: exact root runtime qualification evidence`);
  assert.equal(bytes.length, reference.sizeBytes, `${reference.path}: exact root runtime qualification evidence length`);
}

assert.equal(git(['rev-parse', `${sourceCommit}^{tree}`], {encoding: 'utf8'}).trim(), sourceTree,
  'the immutable SOURCE commit must resolve to its exact tree');
assert.equal(git(['rev-parse', `${baselineCommit}^{tree}`], {encoding: 'utf8'}).trim(), baselineTree,
  'the exact V28 baseline tree is required');
assert.equal(spawnGit(['merge-base', '--is-ancestor', sourceCommit, 'HEAD']).status, 0,
  'the exact SOURCE commit must be an ancestor; metadata-only descendants are allowed');

const sourcePaths = new Map(sourceContract.projectedFiles.map(row => [row.path, row]));
assert.equal(sourcePaths.size, 11, 'the outer source phase is exactly eleven paths');
assert.equal(sourcePaths.get(runtimeContract.path)?.kind, 'raw-bytes', 'the viewer is the exact SOURCE raw-only stage member');
assert.equal(sourcePaths.get(runtimeContract.path)?.current.rawSha256, runtimeContract.sourceEpoch.sha256,
  'the runtime inverse output must be the closed SOURCE11 viewer blob');
assert.equal(sourcePaths.get(runtimeContract.path)?.current.sizeBytes, runtimeContract.sourceEpoch.sizeBytes,
  'the runtime inverse output length must match SOURCE11');
const runtimeSourceBytes = gitBlob(sourceCommit, runtimeContract.path);
const runtimeCurrentBytes = readFileSync(resolve(root, runtimeContract.path));
assert.equal(sha(runtimeSourceBytes), runtimeContract.sourceEpoch.sha256, 'exact immutable SOURCE viewer bytes required');
assert.equal(runtimeSourceBytes.length, runtimeContract.sourceEpoch.sizeBytes, 'exact SOURCE viewer byte length');
assert.equal(sha(runtimeCurrentBytes), runtimeContract.currentPostSourceRuntime.sha256, 'exact live post-SOURCE viewer runtime required');
assert.equal(runtimeCurrentBytes.length, runtimeContract.currentPostSourceRuntime.sizeBytes, 'exact live post-SOURCE viewer byte length');
const runtimeStage = new Map([[runtimeContract.path, {
  currentSha256: runtimeContract.currentPostSourceRuntime.sha256,
  sourceSha256: runtimeContract.sourceEpoch.sha256,
  sourceBytes: runtimeSourceBytes,
}]]);
const sourceStageBytes = new Map();
for (const [path, stage] of sourcePaths) {
  const sourceBytes = gitBlob(sourceCommit, path);
  const baselineBytes = gitBlob(baselineCommit, path);
  assert.equal(sha(sourceBytes), stage.current.rawSha256, `${path}: exact SOURCE raw hash in the closed source contract`);
  assert.equal(sourceBytes.length, stage.current.sizeBytes, `${path}: exact SOURCE byte length`);
  assert.equal(sha(baselineBytes), stage.before.rawSha256, `${path}: exact complete V28 raw hash in the closed source contract`);
  assert.equal(baselineBytes.length, stage.before.sizeBytes, `${path}: exact V28 byte length`);
  if (path !== runtimeContract.path) {
    assert.equal(sha(readFileSync(resolve(root, path))), stage.current.rawSha256, `${path}: live input must remain the exact SOURCE blob`);
  }
  sourceStageBytes.set(path, {sourceBytes, baselineBytes});
}

const metadataPaths = new Map(metadataContract.files.map(row => [row.path, row]));
const metadataStageBytes = new Map();
for (const [path, stage] of metadataPaths) {
  assert.equal(stage.sourceEqualsV28, true, `${path}: only a verified identical SOURCE/V28 predecessor is accepted`);
  const sourceBytes = gitBlob(sourceCommit, path);
  const baselineBytes = gitBlob(baselineCommit, path);
  assert.equal(sha(sourceBytes), stage.sourceEpoch.sha256, `${path}: exact SOURCE metadata predecessor hash`);
  assert.equal(sourceBytes.length, stage.sourceEpoch.sizeBytes, `${path}: exact SOURCE metadata predecessor length`);
  assert.equal(sha(baselineBytes), stage.v28Baseline.sha256, `${path}: exact V28 metadata predecessor hash`);
  assert.equal(baselineBytes.length, stage.v28Baseline.sizeBytes, `${path}: exact V28 metadata predecessor length`);
  assert.deepEqual(sourceBytes, baselineBytes, `${path}: SOURCE and V28 raw predecessor bytes must be identical`);
  const currentBytes = readFileSync(resolve(root, path));
  assert.equal(sha(currentBytes), stage.currentMetadata.sha256, `${path}: exact current metadata endpoint`);
  assert.equal(currentBytes.length, stage.currentMetadata.sizeBytes, `${path}: current metadata byte length`);
  metadataStageBytes.set(path, {sourceBytes, baselineBytes, currentBytes, currentSha256: stage.currentMetadata.sha256});
}

for (const pin of metadataContract.qualificationPins) {
  const bytes = readFileSync(resolve(root, pin.path));
  assert.equal(sha(bytes), pin.sha256, `${pin.path}: exact qualification-only raw bytes`);
  assert.equal(bytes.length, pin.sizeBytes, `${pin.path}: exact qualification-only byte length`);
}
assert.equal(metadataContract.nativeEndpointReceipt.path, 'research/dmg175-source-metadata-v1/native-current-metadata-validation-v2.json');
assert.equal(metadataContract.qualificationPins.find(pin => pin.path === metadataContract.nativeEndpointReceipt.path)?.sha256,
  metadataContract.nativeEndpointReceipt.sha256, 'the pinned native metadata endpoint is part of the closed qualification set');
assert.equal(sha(readFileSync(resolve(root, metadataContract.nativeEndpointReceipt.path))), metadataContract.nativeEndpointReceipt.sha256,
  'the native metadata endpoint receipt remains exact');

function assertJsonTree(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value) && !Object.is(value, -0), 'historical JSON inputs require exact JSON numbers');
    return;
  }
  assert.equal(typeof value, 'object', 'historical JSON inputs reject non-JSON values');
  assert.ok(!types.isProxy(value), 'historical JSON inputs reject proxies');
  assert.equal(Object.getPrototypeOf(Object.prototype), null, 'historical JSON inputs require the plain Object prototype chain');
  assert.equal(Object.getPrototypeOf(Array.prototype), Object.prototype, 'historical JSON inputs require the plain Array prototype chain');
  assert.ok(!Object.hasOwn(Object.prototype, 'toJSON') && !Object.hasOwn(Array.prototype, 'toJSON'),
    'historical JSON inputs reject inherited serialization hooks');
  assert.ok(!ancestors.has(value), 'historical JSON inputs reject cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length, 0, 'historical JSON inputs reject symbols');
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    assert.equal(Object.getPrototypeOf(value), Array.prototype, 'historical JSON arrays must be plain arrays');
    assert.deepEqual(keys, Array.from({length: value.length}, (_, index) => String(index)), 'historical JSON arrays must be dense');
    assert.deepEqual(Object.getOwnPropertyNames(value), [...keys, 'length'], 'historical JSON arrays reject hidden properties');
  } else {
    assert.equal(Object.getPrototypeOf(value), Object.prototype, 'historical JSON objects must be plain objects');
    assert.deepEqual(Object.getOwnPropertyNames(value), keys, 'historical JSON objects reject hidden properties');
  }
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(Object.hasOwn(descriptor, 'value'), 'historical JSON inputs reject accessors');
    assertJsonTree(descriptor.value, ancestors);
  }
  ancestors.delete(value);
}

const objectSha = value => {
  assertJsonTree(value);
  return sha(JSON.stringify(value));
};
const sourceObjectSha = new Map();
const metadataObjectSha = new Map();

function objectStages(path) {
  if (sourcePaths.has(path)) {
    const row = sourcePaths.get(path);
    if (row.kind !== 'json') return null;
    return {
      currentSha256: row.current.canonicalObjectSha256,
      baselineSha256: row.before.canonicalObjectSha256,
    };
  }
  const row = metadataPaths.get(path);
  if (!row) return null;
  if (!metadataObjectSha.has(path)) {
    const currentValue = JSON.parse(metadataStageBytes.get(path).currentBytes);
    const predecessorValue = JSON.parse(metadataStageBytes.get(path).sourceBytes);
    metadataObjectSha.set(path, {
      currentSha256: objectSha(currentValue),
      predecessorSha256: objectSha(predecessorValue),
    });
  }
  return metadataObjectSha.get(path);
}

function isExactUnsupportedBridgeLiteral(error, path, kind) {
  return error instanceof Error
    && error.message === `Invalid class-mapping historical projection: ${path}: unknown MM/H/Version29 ${kind} state`;
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

function normalizeBytes(path, bytes, oldScope, oldProject) {
  if (isVersion29HistoricalPath(path)) {
    const supplied = copyRawBytesForDispatch(bytes, path);
    try {
      bytes = normalizeVersion29HistoricalBytes(path, supplied);
    } catch (error) {
      if (!oldScope || !isExactUnsupportedBridgeLiteral(error, path, 'byte')) throw error;
      // Only the exact strict-reader unsupported-state error can reach this
      // branch; the owner kernel sees the independent native-byte snapshot.
      const accepted = oldProject(path, supplied);
      return copyRawBytesForDispatch(accepted, `${path} accepted historical projection`);
    }
  }
  const runtime = runtimeStage.get(path);
  if (runtime) {
    const fingerprint = sha(bytes);
    if (fingerprint === runtime.currentSha256) bytes = runtime.sourceBytes;
    else if (fingerprint !== runtime.sourceSha256 && !oldScope) assert.fail(`${path}: exact post-SOURCE runtime or SOURCE raw bytes required`);
  }
  const metadata = metadataStageBytes.get(path);
  if (metadata) {
    const fingerprint = sha(bytes);
    if (fingerprint === metadata.currentSha256) bytes = metadata.sourceBytes;
    else if (fingerprint === sha(metadata.sourceBytes)) return Buffer.from(bytes);
    else if (!oldScope) assert.fail(`${path}: exact current-metadata, SOURCE, or V28 raw bytes required`);
  }
  const source = sourceStageBytes.get(path);
  if (source) {
    const fingerprint = sha(bytes);
    const row = sourcePaths.get(path);
    if (fingerprint === row.current.rawSha256) bytes = source.baselineBytes;
    else if (fingerprint === row.before.rawSha256) return Buffer.from(bytes);
    else if (!oldScope) assert.fail(`${path}: exact SOURCE or V28 raw bytes required`);
  }
  return Buffer.from(bytes);
}

function normalizeJson(path, value, oldScope, oldProject) {
  if (isVersion29HistoricalPath(path)) {
    assertJsonTree(value);
    const supplied = structuredClone(value);
    try {
      value = normalizeVersion29HistoricalJson(path, supplied);
    } catch (error) {
      if (!oldScope || !isExactUnsupportedBridgeLiteral(error, path, 'object')) throw error;
      // Keep zero-hook preflight and require the exact preserved owner kernel to accept it.
      const accepted = oldProject(path, supplied);
      assertJsonTree(accepted);
      return structuredClone(accepted);
    }
  }
  const metadata = metadataObjectSha.has(path) || metadataPaths.has(path) ? objectStages(path) : null;
  if (metadata) {
    const fingerprint = objectSha(value);
    if (fingerprint === metadata.currentSha256) value = JSON.parse(metadataStageBytes.get(path).sourceBytes);
    else if (fingerprint === metadata.predecessorSha256) return structuredClone(value);
    else if (!oldScope) assert.fail(`${path}: exact current-metadata, SOURCE, or V28 JSON object required`);
  }
  const source = objectStages(path);
  if (source) {
    const fingerprint = objectSha(value);
    if (fingerprint === source.currentSha256) {
      value = JSON.parse(sourceStageBytes.get(path).baselineBytes);
    } else if (fingerprint === source.baselineSha256) {
      return structuredClone(value);
    } else if (!oldScope) {
      assert.fail(`${path}: exact SOURCE or V28 JSON object required`);
    }
  }
  return value;
}

function projectBytes(path, bytes, oldScope, oldProject) {
  if (typeof path !== 'string' || !oldScope(path)) return oldProject(path, bytes);
  const local = String(path).replaceAll('\\', '/');
  const normalized = normalizeBytes(local, bytes, oldScope(local), oldProject);
  return oldProject(local, normalized);
}

function projectJson(path, value, oldScope, oldProject) {
  if (typeof path !== 'string' || !oldScope(path)) return oldProject(path, value);
  const local = String(path).replaceAll('\\', '/');
  const normalized = normalizeJson(local, value, oldScope(local), oldProject);
  return oldProject(local, normalized);
}

function canonicalPath(path) {
  if (typeof path === 'number') return null;
  let absolute;
  try {
    absolute = path instanceof URL ? fileURLToPath(path) : resolve(String(path));
    absolute = realpathSync(absolute);
  } catch {
    return null;
  }
  const local = relative(root, absolute).replaceAll('\\', '/');
  if (!local || local === '..' || local.startsWith('../') || local.startsWith('/') || isAbsolute(local)) return null;
  return local;
}

function readHistorical(path, options, oldRead, oldProject, oldScope) {
  if (typeof path === 'number') return oldRead(path, options);
  const local = canonicalPath(path);
  if (local === null || !oldScope(local)) return oldRead(path, options);
  const bytes = normalizeBytes(local, readFileSync(path), oldScope(local), oldProject);
  const projected = oldProject(local, bytes);
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? projected.toString(encoding) : projected;
}

const oldScopes = {
  ua: old.isPass8UaSourceHistoryPath,
  weapon: old.isPass8WeaponSourceHistoryPath,
  crop: old.isPass8CitationTargetCropHistoryPath,
  phb: old.isPass8PhbSourceHistoryPath,
  xp: old.isPass8XpContinuationHistoryPath,
  character: path => old.isPass8XpContinuationHistoryPath(path) ||
    ['rules.json', 'phb-spell-index.json', 'phb-magic-user-extra.json', 'dist/data.json', 'research/price-source-inventory.json'].includes(path),
};
export const isPass8UaSourceHistoryPath = old.isPass8UaSourceHistoryPath;
export const isPass8WeaponSourceHistoryPath = old.isPass8WeaponSourceHistoryPath;
export const isPass8CitationTargetCropHistoryPath = old.isPass8CitationTargetCropHistoryPath;
export const isPass8PhbSourceHistoryPath = old.isPass8PhbSourceHistoryPath;
export const isPass8XpContinuationHistoryPath = old.isPass8XpContinuationHistoryPath;
export const isPass8CharacterReferenceHistoryPath = oldScopes.character;

export const projectPass8UaSourceJson = (path, value) => projectJson(path, value, oldScopes.ua, old.projectPass8UaSourceJson);
export const projectPass8UaSourceBytes = (path, bytes) => projectBytes(path, bytes, oldScopes.ua, old.projectPass8UaSourceBytes);
export const projectPass8WeaponSourceJson = (path, value) => projectJson(path, value, oldScopes.weapon, old.projectPass8WeaponSourceJson);
export const projectPass8WeaponSourceBytes = (path, bytes) => projectBytes(path, bytes, oldScopes.weapon, old.projectPass8WeaponSourceBytes);
export const projectPass8CitationTargetCropJson = (path, value) => projectJson(path, value, oldScopes.crop, old.projectPass8CitationTargetCropJson);
export const projectPass8CitationTargetCropBytes = (path, bytes) => projectBytes(path, bytes, oldScopes.crop, old.projectPass8CitationTargetCropBytes);
export const projectPass8PhbSourceJson = (path, value) => projectJson(path, value, oldScopes.phb, old.projectPass8PhbSourceJson);
export const projectPass8PhbSourceBytes = (path, bytes) => projectBytes(path, bytes, oldScopes.phb, old.projectPass8PhbSourceBytes);
export const projectPass8XpContinuationJson = (path, value) => projectJson(path, value, oldScopes.xp, old.projectPass8XpContinuationJson);
export const projectPass8XpContinuationBytes = (path, bytes) => projectBytes(path, bytes, oldScopes.xp, old.projectPass8XpContinuationBytes);
export const projectPass8CharacterReferenceJson = (path, value) => projectJson(path, value, oldScopes.character, old.projectPass8CharacterReferenceJson);
export const projectPass8CharacterReferenceBytes = (path, bytes) => projectBytes(path, bytes, oldScopes.character, old.projectPass8CharacterReferenceBytes);

export const readBeforePass8UaSourceFile = (path, options) => readHistorical(path, options, old.readBeforePass8UaSourceFile, projectPass8UaSourceBytes, oldScopes.ua);
export const readBeforePass8WeaponSourceFile = (path, options) => readHistorical(path, options, old.readBeforePass8WeaponSourceFile, projectPass8WeaponSourceBytes, oldScopes.weapon);
export const readBeforePass8CitationTargetCropFile = (path, options) => readHistorical(path, options, old.readBeforePass8CitationTargetCropFile, projectPass8CitationTargetCropBytes, oldScopes.crop);
export const readBeforePass8PhbSourceFile = (path, options) => readHistorical(path, options, old.readBeforePass8PhbSourceFile, projectPass8PhbSourceBytes, oldScopes.phb);
export const readBeforePass8XpContinuationFile = (path, options) => readHistorical(path, options, old.readBeforePass8XpContinuationFile, projectPass8XpContinuationBytes, oldScopes.xp);
export const readBeforePass8CharacterReferenceFile = (path, options) => readHistorical(path, options, old.readBeforePass8CharacterReferenceFile, projectPass8CharacterReferenceBytes, oldScopes.character);
