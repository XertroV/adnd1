// Mandatory zero-argument S2 trust boundary. This module depends only on the
// native S1 gate, the shared controlled raw-Git helper, and local file/crypto
// primitives. It never imports the adapter runtime or report binder.
import {assertClassMappingCurrentSourceEpoch} from './class-mapping-current-source-gate-v1.mjs';
import {createRawGitReader, verifyRawCommit} from './class-mapping-raw-git-v1.mjs';
import {parseRawHeadCommitBytes} from './class-mapping-current-head-commit-v1.mjs';
import {constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = realpathSync(resolve(fileURLToPath(new URL('..', import.meta.url))));
const rawGit = createRawGitReader(repoRoot);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const codeStageSealPath = 'research/class-mapping-current-adapters-v1/current-consumer-code-stage-seal-v1.json';
const finalSealPath = 'research/class-mapping-current-adapters-v1/current-consumer-s2-seal-v1.json';
const codeStagePinsPath = 'research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.mjs';
const finalPinsPath = 'research/class-mapping-current-adapters-v1/current-consumer-pins-v1.mjs';
const transitionReceiptPath = 'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json';
const qccPinsStubSha256 = '53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385';
const codeStageStatus = 'code-stage-pins-sealed-before-handoff-receipt-generation';
const finalStatus = 'materialized-pins-and-handoff-receipt-sealed-before-current-consumers';
const fail = message => { throw new Error(`Invalid next-native current-consumer seal: ${message}`); };
function assertNativeObjectPrototypes() {
  if (Object.getPrototypeOf(Object.prototype) !== null || Object.getPrototypeOf(Array.prototype) !== Object.prototype
      || Object.hasOwn(Object.prototype, 'toJSON') || Object.hasOwn(Array.prototype, 'toJSON')) {
    fail('global prototype hooks are not permitted during seal verification');
  }
}

function safePath(path) {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('-'))) {
    fail(`unsafe fixed repository path ${String(path)}`);
  }
}
function readPhysical(path) {
  safePath(path);
  const absolute = resolve(repoRoot, path);
  let stat;
  try { stat = lstatSync(absolute); } catch { fail(`required S2 seal input is missing: ${path}`); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`S2 seal input must be a physical regular file: ${path}`);
  let physical;
  try { physical = realpathSync(absolute); } catch { fail(`cannot resolve S2 seal input: ${path}`); }
  if (physical !== absolute) fail(`S2 seal input resolves through a symlink: ${path}`);
  let fd;
  try { fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW); }
  catch { fail(`cannot open S2 seal input without following a symlink: ${path}`); }
  try {
    if (!fstatSync(fd).isFile()) fail(`opened S2 seal input is not a regular file: ${path}`);
    const bytes = readFileSync(fd);
    if (realpathSync(absolute) !== absolute) fail(`S2 seal input changed to a symlink while reading: ${path}`);
    return bytes;
  } finally { closeSync(fd); }
}
function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label}: exact key set`);
  const actual = Object.keys(value).sort(), wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(`${label}: exact key set`);
}
function parseSeal(path, expectedType, expectedStatus, keys) {
  const bytes = readPhysical(path);
  let seal;
  try { seal = JSON.parse(bytes.toString('utf8')); } catch { fail(`${path}: invalid JSON`); }
  exactKeys(seal, keys, path);
  if (seal.schemaVersion !== 1 || seal.artifactType !== expectedType || seal.status !== expectedStatus) fail(`${path}: fixed seal schema/type/status`);
  return {seal, bytes, digest: sha256(bytes)};
}
function assertNativeIdentity() {
  const proof = assertClassMappingCurrentSourceEpoch();
  const summary = proof?.summary;
  if (summary?.stage !== 's1-body-native' || summary.sourceCommit !== '2d35138027f00c0740975e519dbb3a2b6df76d14'
      || summary.sourceTree !== '40ecb15130b339658522794db6d9e1bc58f43b50'
      || summary.fixture?.path !== 'research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json'
      || !/^[a-f0-9]{64}$/.test(summary.fixture?.sha256 || '')) fail('actual native S1 body and closed fixture required');
  return summary;
}
function verifyCommit(commit, tree, parent) {
  if (!/^[a-f0-9]{40}$/.test(commit || '') || !/^[a-f0-9]{40}$/.test(tree || '') || !/^[a-f0-9]{40}$/.test(parent || '')) fail('exact QCC tree/single-parent identities are required');
  if (rawGit.git('rev-parse', '--verify', `${commit}^{commit}`).toString('utf8').trim() !== commit
      || rawGit.git('rev-parse', '--verify', `${commit}^{tree}`).toString('utf8').trim() !== tree) fail('QCC commit/tree object identity');
  verifyRawCommit(rawGit.git('cat-file', 'commit', commit), commit, tree, parent);
}
function rawHead() {
  const head = rawGit.git('rev-parse', '--verify', 'HEAD^{commit}').toString('utf8').trim();
  if (!/^[a-f0-9]{40}$/.test(head || '') || rawGit.git('rev-parse', '--verify', `${head}^{commit}`).toString('utf8').trim() !== head) fail('actual HEAD commit identity');
  const raw = rawGit.git('cat-file', 'commit', head);
  const {tree, parents} = parseRawHeadCommitBytes(raw, head);
  for (const parent of parents) {
    if (rawGit.git('rev-parse', '--verify', `${parent}^{commit}`).toString('utf8').trim() !== parent) fail('HEAD raw parent object identity');
  }
  if (rawGit.git('rev-parse', '--verify', `${head}^{tree}`).toString('utf8').trim() !== tree) fail('HEAD raw tree identity');
  return {head, tree, parents};
}
function assertBlobAtHead(path, head, physicalBytes, label) {
  const committed = rawGit.git('show', `${head}:${path}`);
  if (!committed.equals(physicalBytes)) fail(`${label} physical bytes differ from exact raw HEAD blob: ${path}`);
}
function assertSourceAndQcc(seal, summary, head) {
  exactKeys(seal.sourceEpoch, ['sourceCommit','sourceTree','fixture'], 'sourceEpoch');
  exactKeys(seal.sourceEpoch.fixture, ['path','sha256'], 'sourceEpoch.fixture');
  if (seal.sourceEpoch.sourceCommit !== summary.sourceCommit || seal.sourceEpoch.sourceTree !== summary.sourceTree
      || seal.sourceEpoch.fixture.path !== summary.fixture.path || seal.sourceEpoch.fixture.sha256 !== summary.fixture.sha256) fail('seal does not bind the live native S1 fixture');
  exactKeys(seal.qualifierCode, ['commit','tree','parent'], 'qualifierCode');
  const {commit,tree,parent} = seal.qualifierCode;
  verifyCommit(commit, tree, parent);
  try {
    rawGit.git('merge-base', '--is-ancestor', summary.sourceCommit, commit);
    rawGit.git('merge-base', '--is-ancestor', commit, head);
  } catch { fail('native S1 → QCC → raw HEAD ancestry'); }
}

export function verifyCurrentConsumerCodeStageSeal(...args) {
  if (args.length) fail('code-stage seal verifier accepts no caller inputs');
  assertNativeObjectPrototypes();
  rawGit.assertView();
  const summary = assertNativeIdentity();
  const {head} = rawHead();
  const {seal,bytes,digest} = parseSeal(codeStageSealPath,
    'S2 next-native current-consumer code-stage seal', codeStageStatus,
    ['schemaVersion','artifactType','status','sourceEpoch','qualifierCode','currentConsumerPinModule','transitionReceipt']);
  assertSourceAndQcc(seal, summary, head);
  exactKeys(seal.currentConsumerPinModule, ['path','sha256'], 'currentConsumerPinModule');
  if (seal.currentConsumerPinModule.path !== codeStagePinsPath) fail('code-stage pin module path');
  const codePinsBytes = readPhysical(codeStagePinsPath);
  if (sha256(codePinsBytes) !== seal.currentConsumerPinModule.sha256) fail('code-stage pin module hash differs from seal');
  assertBlobAtHead(codeStageSealPath, head, bytes, 'code-stage seal');
  assertBlobAtHead(codeStagePinsPath, head, codePinsBytes, 'immutable code-stage pin module');
  exactKeys(seal.transitionReceipt, ['path','sha256'], 'transitionReceipt');
  if (seal.transitionReceipt.path !== transitionReceiptPath || seal.transitionReceipt.sha256 !== null) fail('code stage must precede the generated transition receipt');
  const qccStub = rawGit.git('show', `${seal.qualifierCode.commit}:${finalPinsPath}`);
  if (sha256(qccStub) !== qccPinsStubSha256) fail('QCC must retain the exact null-pin final module stub');
  rawGit.assertView();
  return {sourceEpoch: seal.sourceEpoch, qualifierCode: seal.qualifierCode, codeStageSeal:{path:codeStageSealPath,sha256:digest}, head};
}

export function verifyCurrentConsumerMaterializedStageSeal(...args) {
  if (args.length) fail('materialized-stage seal verifier accepts no caller inputs');
  assertNativeObjectPrototypes();
  const codeStage = verifyCurrentConsumerCodeStageSeal();
  rawGit.assertView();
  const summary = assertNativeIdentity();
  const {head} = rawHead();
  const {seal,bytes,digest} = parseSeal(finalSealPath,
    'S2 next-native current-consumer materialized-stage seal', finalStatus,
    ['schemaVersion','artifactType','status','sourceEpoch','qualifierCode','currentConsumerPinModule','codeStagePinModule','codeStageSeal','transitionReceipt']);
  assertSourceAndQcc(seal, summary, head);
  if (seal.sourceEpoch.sourceCommit !== codeStage.sourceEpoch.sourceCommit
      || seal.sourceEpoch.sourceTree !== codeStage.sourceEpoch.sourceTree
      || seal.sourceEpoch.fixture.path !== codeStage.sourceEpoch.fixture.path
      || seal.sourceEpoch.fixture.sha256 !== codeStage.sourceEpoch.fixture.sha256
      || seal.qualifierCode.commit !== codeStage.qualifierCode.commit
      || seal.qualifierCode.tree !== codeStage.qualifierCode.tree
      || seal.qualifierCode.parent !== codeStage.qualifierCode.parent) fail('final seal differs from the code-stage S1/QCC identity');
  exactKeys(seal.currentConsumerPinModule, ['path','sha256'], 'currentConsumerPinModule');
  exactKeys(seal.codeStagePinModule, ['path','sha256'], 'codeStagePinModule');
  exactKeys(seal.codeStageSeal, ['path','sha256'], 'codeStageSeal');
  exactKeys(seal.transitionReceipt, ['path','sha256'], 'transitionReceipt');
  if (seal.currentConsumerPinModule.path !== finalPinsPath || seal.codeStagePinModule.path !== codeStagePinsPath
      || seal.codeStagePinModule.sha256 !== sha256(readPhysical(codeStagePinsPath))
      || seal.codeStageSeal.path !== codeStageSealPath || seal.codeStageSeal.sha256 !== codeStage.codeStageSeal.sha256
      || seal.transitionReceipt.path !== transitionReceiptPath || !/^[a-f0-9]{64}$/.test(seal.transitionReceipt.sha256 || '')) {
    fail('final materialized seal must bind immutable code-stage pins, code-stage seal, final pins and transition receipt');
  }
  const finalPinsBytes = readPhysical(finalPinsPath);
  const receiptBytes = readPhysical(transitionReceiptPath);
  const codePinsBytes = readPhysical(codeStagePinsPath);
  if (sha256(finalPinsBytes) !== seal.currentConsumerPinModule.sha256
      || sha256(receiptBytes) !== seal.transitionReceipt.sha256) fail('final pin/receipt physical hashes differ from seal');
  assertBlobAtHead(finalSealPath, head, bytes, 'final S2 seal');
  assertBlobAtHead(finalPinsPath, head, finalPinsBytes, 'final consumer pin module');
  assertBlobAtHead(codeStagePinsPath, head, codePinsBytes, 'immutable code-stage pin module');
  assertBlobAtHead(codeStageSealPath, head, readPhysical(codeStageSealPath), 'code-stage seal');
  assertBlobAtHead(transitionReceiptPath, head, receiptBytes, 'transition receipt');
  rawGit.assertView();
  return {sourceEpoch: seal.sourceEpoch, qualifierCode: seal.qualifierCode,
    currentConsumerPinModule:{path:finalPinsPath,sha256:seal.currentConsumerPinModule.sha256},
    transitionReceipt:seal.transitionReceipt, seal:{path:finalSealPath,sha256:digest}, head};
}
