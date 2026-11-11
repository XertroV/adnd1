// Shared S2 current-consumer boundary. The body-only native gate knows nothing
// about S2 reports, adapter contracts, or handoff receipts.
import {assertClassMappingCurrentSourceEpoch, assertClassMappingCurrentSnapshot} from './class-mapping-current-source-gate-v1.mjs';
import {createRawGitReader, verifyRawCommit} from './class-mapping-raw-git-v1.mjs';
import {verifyCurrentConsumerCodeStageSeal, verifyCurrentConsumerMaterializedStageSeal} from './class-mapping-current-consumer-seal-verifier-v1.mjs';
import {currentConsumerCodeStagePins} from '../research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.mjs';
import {currentConsumerPins} from '../research/class-mapping-current-adapters-v1/current-consumer-pins-v1.mjs';
import {createHash} from 'node:crypto';
import {constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync} from 'node:fs';
import {isDeepStrictEqual, types} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const currentConsumerRepoRoot = realpathSync(resolve(fileURLToPath(new URL('..', import.meta.url))));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Invalid next-native current consumer input: ${message}`); };
const requiredCodePaths = [
  'tools/class-mapping-raw-git-v1.mjs',
  'tools/class-mapping-current-head-commit-v1.mjs',
  'tools/class-mapping-current-consumer-seal-verifier-v1.mjs',
  'tools/class-mapping-current-consumer-runtime-v1.mjs',
  'tools/class-mapping-current-monetary-question-kernel-v1.mjs',
  'tools/class-mapping-current-monetary-questions-v1.mjs',
  'tools/class-mapping-current-jo-gap-v1.mjs',
  'tools/class-mapping-current-source-handoff-v1.mjs',
  'tools/class-mapping-current-ua26-marker-v1.mjs',
  'tools/class-mapping-current-successors-v1.mjs',
  'tools/coverage-gaps-class-mapping-v1.mjs',
  'tools/monetary-row-identity-audit.mjs',
  'tools/monetary-context-extent-contract.mjs',
  'tools/monetary-source-render-frames.mjs',
  'tools/jo-unextracted-price-registration.mjs',
  'tools/ua-source-handoff-transition.mjs',
  'tools/ua26-note-marker-audit.mjs',
  'tools/dmg175-availability-projection.mjs',
  'dist/books.js',
];
const frozenDependencyHashes = Object.freeze({
  'tools/monetary-row-identity-audit.mjs': '75dd1b6b1177c848c85b148bb806e6653ab6517979d3c7a3a1946f1021b63276',
  'tools/monetary-context-extent-contract.mjs': '64838c56e5303a6a63f4ff0e33c3ee2bb15cd445c4fca50c276dc2906af3074d',
  'tools/monetary-source-render-frames.mjs': '44dc5c4d5233fdf2a8b1a36742712f1b36f69ebcc8d2b6d8208303cdb9b41a39',
  'tools/jo-unextracted-price-registration.mjs': 'dc939de98ff9f796f6a1ec910aa8f0fc287508d6fbe5729c824af1ed4046f7c2',
  'tools/ua-source-handoff-transition.mjs': '3adfe83ac23945e103c00c0c860d4d741b2ee0af4015db3bb91925d34e544cc2',
  'tools/ua26-note-marker-audit.mjs': '4cd3e158451d842c4b097a0ddc726b5c248dfe2b0428cae719f1e4b27a85c49c',
  'tools/dmg175-availability-projection.mjs': '43d711afd6f086caeef99a907901759ce79fb3123060674426da7a303a6c9689',
  'dist/books.js': '99928f8e954ef213a51c70dc97d8f63b16a7b5eea9f1cba10b76b527ec17f811',
});
const requiredContracts = [
  'research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json',
  'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json',
  'research/class-mapping-current-adapters-v1/source-handoff-current-contract-v1.json',
  'research/class-mapping-current-adapters-v1/ua26-marker-current-contract-v1.json',
  'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.template.json',
];
const requiredReceipts = ['research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json'];
const requiredSourceBodyPaths = [
  'dist/data.json',
  'research/price-source-inventory.json',
  'research/field-evidence-bindings.json',
  'research/mechanics-audit-progress.json',
];
const codeStagePinsModulePath = 'research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.mjs';
const pinsModulePath = 'research/class-mapping-current-adapters-v1/current-consumer-pins-v1.mjs';
const qccPinsStubSha256 = '5f2d6cb231f77b61e2024f52efa7df132703462a53b1b690af9011794edc38d9';
const rawGit = createRawGitReader(currentConsumerRepoRoot);
const qualifiedStages = new WeakMap();

function readRegularFile(path) {
  const absolute = resolve(currentConsumerRepoRoot, path);
  let stat;
  try { stat = lstatSync(absolute); } catch { fail(`required file is missing: ${path}`); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`required path is not a regular non-symlink file: ${path}`);
  let physical;
  try { physical = realpathSync(absolute); } catch { fail(`required path cannot be resolved physically: ${path}`); }
  if (physical !== absolute) fail(`required path resolves through a symlink: ${path}`);
  let fd;
  try { fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW); }
  catch { fail(`required path cannot be opened without following a symlink: ${path}`); }
  try {
    if (!fstatSync(fd).isFile()) fail(`opened path is not a regular file: ${path}`);
    const bytes = readFileSync(fd);
    if (realpathSync(absolute) !== absolute) fail(`required path changed to a symlink while reading: ${path}`);
    return bytes;
  } finally { closeSync(fd); }
}
function assertSafeRepoPath(path) {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) fail(`unsafe repository path ${path}`);
}
function currentFile(path) { assertSafeRepoPath(path); return readRegularFile(path); }

// Node caches imported modules. Keep the exact bytes used by each static import
// and check them on every public stage; the verifier separately matches these
// bytes to the committed code-stage/final seal at raw Git HEAD.
const importedCodeStagePinsModuleSha256 = sha256(readRegularFile(codeStagePinsModulePath));
const importedFinalPinsModuleSha256 = sha256(readRegularFile(pinsModulePath));
const qccRawClosureProofs = new Set();
function assertPinsModuleUnchanged(kind) {
  const path = kind === 'code' ? codeStagePinsModulePath : pinsModulePath;
  const expected = kind === 'code' ? importedCodeStagePinsModuleSha256 : importedFinalPinsModuleSha256;
  const current = readRegularFile(path);
  if (sha256(current) !== expected) fail(`S2 ${kind} pin module changed after installation`);
  return expected;
}

function readCommittedBlob(commit, path) {
  assertSafeRepoPath(path);
  return rawGit.git('show', `${commit}:${path}`);
}

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort());
}

function assertNativeBodyProof(proof, pins, pinModuleKind) {
  const {summary, inputs, inputHashes} = proof || {};
  if (summary?.stage !== 's1-body-native' || !summary.sourceCommit || !summary.sourceTree
      || !inputs?.data || !inputs?.inventory || !inputs?.manual || !inputs?.mechanics
      || !inputHashes?.sourceBody) fail('fully qualified current S1 body and exact source-body hash map are required');
  if (!exactKeys(pins.sourceBodyInputHashes, requiredSourceBodyPaths)
      || !inputHashes.sourceBody || typeof inputHashes.sourceBody !== 'object' || Array.isArray(inputHashes.sourceBody)) {
    fail('S2 primary body pins or native full source-input hash map are incomplete');
  }
  const expectedPinType = pinModuleKind === 'code' ? 'S2 next-native current-consumer code-stage pins' : 'S2 next-native current-consumer closure pins';
  if (pins.schemaVersion !== 1 || pins.artifactType !== expectedPinType
      || pins.materialized !== true || pins.sourceEpoch?.sourceCommit !== summary.sourceCommit
      || pins.sourceEpoch?.sourceTree !== summary.sourceTree || pins.sourceEpoch?.fixturePath !== summary.fixture?.path
      || pins.sourceEpoch?.fixtureSha256 !== summary.fixture?.sha256
      || !/^[a-f0-9]{40}$/.test(pins.qualifierCodeCommit || '')
      || !/^[a-f0-9]{40}$/.test(pins.qualifierCodeTree || '')
      || !/^[a-f0-9]{40}$/.test(pins.qualifierCodeParent || '')) {
    fail('S2 consumer pins are not materialized against the exact native S1 fixture and qualifier code commit/tree/parent');
  }
  if (!exactKeys(pins.codePins, requiredCodePaths) || !exactKeys(pins.contractPins, requiredContracts)
      || !exactKeys(pins.receiptPins, requiredReceipts)) fail('S2 code, contract and receipt closure sets are incomplete or broadened');
  for (const path of requiredSourceBodyPaths) {
    const expected = pins.sourceBodyInputHashes[path];
    if (!/^[a-f0-9]{64}$/.test(expected || '') || inputHashes.sourceBody[path] !== expected
        || sha256(currentFile(path)) !== expected) fail(`S2 source-body pin differs from native body closure: ${path}`);
  }
  for (const [path, digest] of Object.entries(inputHashes.sourceBody)) {
    assertSafeRepoPath(path);
    if (!/^[a-f0-9]{64}$/.test(digest || '')) fail(`native source-body hash is malformed: ${path}`);
  }
  return {summary, inputs, inputHashes};
}

function freezeTree(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}
function rememberStage(kind, stage) {
  assertPlainJson(stage.summary, 'native stage summary');
  assertPlainJson(stage.inputs, 'native stage inputs');
  assertPlainJson(stage.inputHashes, 'native stage input hashes');
  freezeTree(stage.summary); freezeTree(stage.inputs); freezeTree(stage.inputHashes);
  const frozen = Object.freeze(stage);
  qualifiedStages.set(frozen, kind);
  return frozen;
}
function finishSuccessfulStage(kind, pendingStage) {
  const {qccCacheProof, ...stageData} = pendingStage;
  const stage = rememberStage(kind, stageData);
  if (!qccCacheProof.cacheHit) qccRawClosureProofs.add(qccCacheProof.cacheKey);
  return stage;
}
function refreshStage(stage, minimumKind = 'code') {
  const kind = stage && typeof stage === 'object' ? qualifiedStages.get(stage) : undefined;
  if (!kind || (minimumKind === 'full' && kind !== 'full')) fail('stage token must be returned by the matching installed qualification call');
  return kind === 'full' ? qualifyCurrentConsumerStage() : qualifyCurrentConsumerCodeStage();
}

function qccProofKey(summary, pins, inputHashes, pinModuleKind, pinModuleSha256) {
  const entries = object => Object.entries(object).sort(([a], [b]) => a.localeCompare(b)).flatMap(([path, digest]) => [path, digest]);
  const fields = [
    'immutable-qcc-raw-closure-v1', pinModuleKind, pinModuleSha256,
    summary.sourceCommit, summary.sourceTree, summary.fixture.path, summary.fixture.sha256,
    pins.qualifierCodeCommit, pins.qualifierCodeTree, pins.qualifierCodeParent,
    qccPinsStubSha256,
    ...entries(inputHashes.sourceBody),
    ...entries(pins.sourceBodyInputHashes),
    ...entries(pins.codePins),
    ...entries(pins.contractPins),
  ];
  return sha256(Buffer.from(fields.join('\0'), 'utf8'));
}

function assertPhysicalCodeAndContracts(pins) {
  for (const path of requiredCodePaths) {
    const expected = pins.codePins[path];
    const frozenExpected = frozenDependencyHashes[path];
    if (!/^[a-f0-9]{64}$/.test(expected || '') || (frozenExpected && expected !== frozenExpected)
        || sha256(currentFile(path)) !== expected) fail(`S2 installed adapter code pin differs: ${path}`);
  }
  for (const path of requiredContracts) {
    const expected = pins.contractPins[path];
    if (!/^[a-f0-9]{64}$/.test(expected || '') || sha256(currentFile(path)) !== expected) {
      fail(`S2 adapter contract pin differs: ${path}`);
    }
  }
}

function runQualifiedCodeStage(pins, pinModuleKind, sealedIdentity) {
  const pinModuleSha256 = assertPinsModuleUnchanged(pinModuleKind);
  rawGit.assertView();
  const proof = assertClassMappingCurrentSourceEpoch();
  const {summary, inputs, inputHashes} = assertNativeBodyProof(proof, pins, pinModuleKind);
  if (sealedIdentity?.sourceEpoch?.sourceCommit !== summary.sourceCommit
      || sealedIdentity?.sourceEpoch?.sourceTree !== summary.sourceTree
      || sealedIdentity?.sourceEpoch?.fixture?.path !== summary.fixture?.path
      || sealedIdentity?.sourceEpoch?.fixture?.sha256 !== summary.fixture?.sha256
      || sealedIdentity?.qualifierCode?.commit !== pins.qualifierCodeCommit
      || sealedIdentity?.qualifierCode?.tree !== pins.qualifierCodeTree
      || sealedIdentity?.qualifierCode?.parent !== pins.qualifierCodeParent) {
    fail('seal S1/QCC identity differs from the exact source and qualifier identities in the S2 pin module');
  }
  const qualifier = pins.qualifierCodeCommit;
  if (rawGit.git('rev-parse', '--verify', `${qualifier}^{commit}`).toString('utf8').trim() !== qualifier) {
    fail('QUALIFIER_CODE_COMMIT object identity');
  }
  try {
    rawGit.git('merge-base', '--is-ancestor', summary.sourceCommit, qualifier);
    rawGit.git('merge-base', '--is-ancestor', qualifier, 'HEAD');
  } catch { fail('S1 body / QUALIFIER_CODE_COMMIT raw ancestry'); }
  // Physical files, seals, native source and current ancestry stay live on
  // every call. Only immutable QCC object reads are memoized, and only after
  // this exact source/QCC/pin key completes the entire public-stage proof.
  assertPhysicalCodeAndContracts(pins);
  const cacheKey = qccProofKey(summary, pins, inputHashes, pinModuleKind, pinModuleSha256);
  const cacheHit = qccRawClosureProofs.has(cacheKey);
  if (!cacheHit) {
    const rawCommit = rawGit.git('cat-file', 'commit', qualifier);
    verifyRawCommit(rawCommit, qualifier, pins.qualifierCodeTree, pins.qualifierCodeParent);
    for (const [path, expected] of Object.entries(inputHashes.sourceBody)) {
      if (sha256(readCommittedBlob(qualifier, path)) !== expected) {
        fail(`QUALIFIER_CODE_COMMIT changes the S1 source-body input: ${path}`);
      }
    }
    if (sha256(readCommittedBlob(qualifier, pinsModulePath)) !== qccPinsStubSha256) {
      fail('QUALIFIER_CODE_COMMIT does not contain the exact unmaterialized current-consumer pins stub');
    }
    for (const path of requiredCodePaths) {
      if (sha256(readCommittedBlob(qualifier, path)) !== pins.codePins[path]) {
        fail(`QUALIFIER_CODE_COMMIT code pin differs: ${path}`);
      }
    }
    for (const path of requiredContracts) {
      if (sha256(readCommittedBlob(qualifier, path)) !== pins.contractPins[path]) {
        fail(`QUALIFIER_CODE_COMMIT contract pin differs: ${path}`);
      }
    }
  }
  const checkedSummary = assertClassMappingCurrentSnapshot(inputs);
  if (checkedSummary?.sourceCommit !== summary.sourceCommit || checkedSummary?.sourceTree !== summary.sourceTree) {
    fail('current body changed between native qualification and consumer use');
  }
  rawGit.assertView();
  return {summary, inputs, inputHashes, consumerPins:pins, qccCacheProof:{cacheKey,cacheHit}};
}

export function qualifyCurrentConsumerCodeStage(...args) {
  if (args.length) fail('code-stage qualification accepts no caller overrides');
  const sealedIdentity = verifyCurrentConsumerCodeStageSeal();
  // The handoff producer runs before final receipt materialization. Require
  // the separate final module to remain the exact QCC stub in this stage.
  assertPinsModuleUnchanged('final');
  if (sha256(readRegularFile(pinsModulePath)) !== qccPinsStubSha256) {
    fail('code-only stage requires the unchanged QCC final-pin stub');
  }
  return finishSuccessfulStage('code', runQualifiedCodeStage(currentConsumerCodeStagePins, 'code', sealedIdentity));
}

// Receipt-consuming reports use the full stage. The handoff receipt producer
// uses the code-only stage above, so generating the receipt does not form a
// prerequisite cycle with its own post-QCC metadata pin.
export function qualifyCurrentConsumerStage(...args) {
  if (args.length) fail('materialized consumer-stage qualification accepts no caller overrides');
  const sealedIdentity = verifyCurrentConsumerMaterializedStageSeal();
  const stage = runQualifiedCodeStage(currentConsumerPins, 'final', sealedIdentity);
  for (const path of requiredReceipts) {
    const expected = currentConsumerPins.receiptPins[path];
    if (!/^[a-f0-9]{64}$/.test(expected || '') || sha256(currentFile(path)) !== expected) {
      fail(`S2 report receipt is not closed or differs from its physical pin: ${path}`);
    }
  }
  return finishSuccessfulStage('full', stage);
}

export function requireQualificationArtifact(stage, relativePath) {
  const current = refreshStage(stage, 'code');
  const expected = current.consumerPins.contractPins?.[relativePath];
  if (!/^[a-f0-9]{64}$/.test(expected || '')) fail(`current consumer contract is not S2-pinned: ${relativePath}`);
  const bytes = currentFile(relativePath);
  if (sha256(bytes) !== expected) fail(`current consumer contract is stale: ${relativePath}`);
  return {bytes, sha256: expected};
}

export function requireConsumerReceipt(stage, relativePath) {
  const current = refreshStage(stage, 'full');
  const expected = current.consumerPins.receiptPins?.[relativePath];
  if (!/^[a-f0-9]{64}$/.test(expected || '')) fail(`current consumer receipt is not S2-pinned: ${relativePath}`);
  const bytes = currentFile(relativePath);
  if (sha256(bytes) !== expected) fail(`current consumer receipt is stale: ${relativePath}`);
  return {bytes, sha256: expected};
}

export function sourceBodyReference(stage, relativePath) {
  const current = refreshStage(stage, 'code');
  const expected = current.inputHashes.sourceBody?.[relativePath];
  if (!/^[a-f0-9]{64}$/.test(expected || '')) fail(`source body input is not included in native closure: ${relativePath}`);
  const bytes = currentFile(relativePath);
  if (sha256(bytes) !== expected) fail(`source body input changed after qualification: ${relativePath}`);
  return {path: relativePath, sha256: expected};
}

export function assertPlainJson(value, label = 'caller value') {
  if (Object.getPrototypeOf(Object.prototype) !== null || Object.getPrototypeOf(Array.prototype) !== Object.prototype
      || Object.hasOwn(Object.prototype, 'toJSON') || Object.hasOwn(Array.prototype, 'toJSON')) {
    fail(`${label} is subject to inherited serialization hooks or modified global prototypes`);
  }
  const active = new Set();
  function visit(node) {
    if (node === null || typeof node === 'string' || typeof node === 'boolean') return true;
    if (typeof node === 'number') return Number.isFinite(node) && !Object.is(node, -0);
    if (typeof node !== 'object' || types.isProxy(node) || active.has(node)) return false;
    const array = Array.isArray(node);
    const prototype = Object.getPrototypeOf(node);
    if (prototype !== (array ? Array.prototype : Object.prototype)) return false;
    const keys = Reflect.ownKeys(node);
    if (array && (keys.length !== node.length + 1 || !keys.includes('length'))) return false;
    active.add(node);
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string' || (array && !/^(0|[1-9]\d*)$/.test(key))) return false;
      const descriptor = Object.getOwnPropertyDescriptor(node, key);
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value') || !visit(descriptor.value)) return false;
    }
    active.delete(node);
    return true;
  }
  if (!visit(value)) fail(`${label} is not inert ordinary JSON`);
  return true;
}

export function assertCurrentBodyValue(stage, candidate, key) {
  const current = refreshStage(stage, 'code');
  assertPlainJson(candidate, `caller-supplied ${key}`);
  if (!Object.hasOwn(current.inputs, key) || !isDeepStrictEqual(candidate, current.inputs[key])) {
    fail(`caller-supplied ${key} is not the current native body snapshot`);
  }
  return true;
}
