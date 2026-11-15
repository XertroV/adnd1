// Historical-MM replay copy of the exact a29 consumer; S1 companions remain separate.
// Current-MM successor for the one exact historical UA source-body transition.
// The old H receipt/tool remains immutable history; this adapter validates the
// actual MM epoch first, then carries forward only the same pending target and
// the same single conflict/caution qualification.
import crypto from 'node:crypto';
import fs from '../mm-replay-fs-v1.mjs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {assertCurrentMmSourceEpoch} from '../../../tests/helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {uaSourceHistoricalCaution} from './ua-source-handoff-transition.mjs';
import {assertCurrentMmPlainJson} from './mm-current-safe-json-v1.mjs';
import {
  addNativeSourceQualificationFromValidatedSnapshot,
  snapshotNativeHandoffReceiptBytes,
  assertNativeHandoffCallerReceiptMatchesSnapshot,
} from './dmg175-hired-native-source-handoff-v2.mjs';

import {historicalMmTestRoot} from '../mm-replay-fs-v1.mjs';
const root = historicalMmTestRoot;
export const mmSourceHandoffTransitionPath = 'research/mm-current-cli-successors-v1/source-body-handoff-transition-mm-v1.json';
export const mmSourceHandoffTransitionSha256 = '66d18297f999a12b76c47e0a66e2758be902a6d4eb1d65d5031d7a97e93a1be7';
const priorHandoffPath = 'research/hirelings-native-h-v1/source-body-handoff-transition-v1.json';
const priorHandoffSha256 = '644992717168c73584a4d30084237aa253fcc5f9143b288a41f1ca6ba8bc4575';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const valueHash = value => sha256(Buffer.from(JSON.stringify(value)));
const fail = message => { throw new Error(`Invalid current-MM source-body handoff transition: ${message}`); };
const readBytes = (repoRoot, rel) => fs.readFileSync(path.resolve(repoRoot, rel));
const readJson = (repoRoot, rel) => JSON.parse(readBytes(repoRoot, rel).toString('utf8'));
function plainJson(value, label = 'context value') {
  try { assertCurrentMmPlainJson(value, label); return true; }
  catch { return false; }
}
const validated = new WeakMap();

function deepFreezeJson(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreezeJson(value[key]);
  return Object.freeze(value);
}

function receiptMatchesSnapshot(receipt, pin) {
  if (!pin) return false;
  try {
    assertNativeHandoffCallerReceiptMatchesSnapshot(receipt, pin.receiptSnapshot);
    return true;
  } catch {
    return false;
  }
}

function exactFile(repoRoot, rel, expectedSha, hashFile) {
  const bytes = readBytes(repoRoot, rel);
  if (sha256(bytes) !== expectedSha || hashFile(rel) !== expectedSha) fail(`exact bytes changed: ${rel}`);
  return bytes;
}

export function loadSourceHandoffTransition({read, hashFile, baselineData, currentData, mechanics, conflictReceipt, repoRoot = root} = {}) {
  if (typeof read !== 'function' || typeof hashFile !== 'function'
      || ![baselineData, currentData, mechanics, conflictReceipt].every(plainJson)) fail('JSON context and read/hash functions are required');
  const currentRoot = path.resolve(repoRoot);
  const {inputs, summary} = assertCurrentMmSourceEpoch(currentRoot);
  if (summary.sourceCommit !== '0f2d70a135e3ad486152bf00f21387d60a1a97ef'
      || summary.sourceTree !== '08010faf457df22cdb0a5ec35d2dcf79e622ade9'
      || valueHash(currentData) !== '40ec040a637ad840bea8f7c93b6fde30f2300969df17c7236642be0749cfee21'
      || !isDeepStrictEqual(currentData, inputs.data)
      || !isDeepStrictEqual(mechanics, inputs.mechanics)
      || valueHash(baselineData) !== 'b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6'
      || valueHash(conflictReceipt) !== '7a61d692cd1cfe6bb08ab337d113c35041a5b47d0c97a18219eb25ead40ecc9e') fail('actual MM data, mechanics, historical baseline, or conflict receipt differs');

  const receiptBytes = exactFile(currentRoot, mmSourceHandoffTransitionPath, mmSourceHandoffTransitionSha256, hashFile);
  const receiptSnapshot = snapshotNativeHandoffReceiptBytes(receiptBytes, mmSourceHandoffTransitionSha256);
  const callerReceipt = read(mmSourceHandoffTransitionPath);
  assertNativeHandoffCallerReceiptMatchesSnapshot(callerReceipt, receiptSnapshot);
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  if (!isDeepStrictEqual(receipt, receiptSnapshot)) fail('mutable transition view differs from its frozen byte snapshot');
  const priorBytes = exactFile(currentRoot, priorHandoffPath, priorHandoffSha256, hashFile);
  const prior = JSON.parse(priorBytes.toString('utf8'));
  if (!isDeepStrictEqual(receipt.priorTransition, {path: priorHandoffPath, sha256: priorHandoffSha256, valueSha256: valueHash(prior)})) fail('exact H historical transition lineage');

  const cohortRef = {path: 'tests/fixtures/mm-treasure-current-m1-cohort-v1.json', sha256: '7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550'};
  const expectedRaw = Object.entries(inputs.rawInputs).map(([path, sha256Value]) => ({path, sha256: sha256Value}));
  if (receipt.schemaVersion !== 1
      || receipt.artifactType !== 'exact-current-MM-native-source-body historical transition qualification'
      || receipt.status !== 'historical-correction-qualified-current-body-unchecked'
      || receipt.semanticPass !== false || receipt.currentSourceValueGrade !== 'NOT PROMOTED'
      || !isDeepStrictEqual(receipt.sourceEpoch.contract, cohortRef)
      || receipt.sourceEpoch.sourceCommit !== summary.sourceCommit || receipt.sourceEpoch.sourceTree !== summary.sourceTree
      || receipt.sourceEpoch.baselineCommit !== '1f79d909344ebe7d41a432d8673f3eedb491fa3b'
      || receipt.sourceEpoch.baselineAncestorOfSource !== true || receipt.sourceEpoch.sourceAncestorOfCurrentHead !== true
      || !isDeepStrictEqual(receipt.sourceEpoch.sourceRawInputs, expectedRaw)
      || !isDeepStrictEqual(receipt.sourceEpoch.selectedAdditionalInputs, inputs.additionalInputs)
      || !isDeepStrictEqual(receipt.currentSourceCohort, summary)) fail('closed source epoch or full current-MM cohort proof');
  for (const ref of receipt.evidence || []) exactFile(currentRoot, ref.path, ref.sha256, hashFile);
  if (!isDeepStrictEqual(receipt.originalConflictReceipt, prior.originalConflictReceipt)
      || !isDeepStrictEqual(receipt.qualifiedTarget, prior.qualifiedTarget)
      || !isDeepStrictEqual(receipt.curatedHistoricalCaution, prior.curatedHistoricalCaution)
      || !isDeepStrictEqual(receipt.priorHandoffDisposition, prior.priorHandoffDisposition)
      || !isDeepStrictEqual(receipt.inheritedHistoricalQualification, prior.inheritedHistoricalQualification)) fail('H target or historical caution/conflict payload was changed');
  if (!isDeepStrictEqual(receipt.currentSourceData, {
    path: 'dist/data.json', rawSha256: inputs.rawInputs['dist/data.json'],
    parsedSha256: valueHash(currentData),
  })) fail('actual current data raw and parsed hashes');
  const reviewSha = valueHash(mechanics.reviewRecords);
  if (!isDeepStrictEqual(receipt.currentMechanics, {
    path: 'research/mechanics-audit-progress.json', rawSha256: inputs.rawInputs['research/mechanics-audit-progress.json'],
    parsedSha256: valueHash(mechanics), mechanicsInputSha256: mechanics.input?.sha256,
    reviewRecords: 1215, reviewRecordsSha256: reviewSha,
  }) || mechanics.reviewRecords?.length !== 1215 || reviewSha !== 'cfad75c6e4385af44edc85fe655d5913e2851aa2b948b7dfaf13e6ff01c6065e') fail('actual MM mechanics bytes or 1,215 historical review records');
  if (hashFile(receipt.originalConflictReceipt.path) !== receipt.originalConflictReceipt.sha256) fail('exact historical conflict receipt bytes');

  const target = receipt.qualifiedTarget;
  const owner = currentData.spells.find(row => row.id === target.itemId);
  const field = mechanics.records.find(row => row.collection === target.collection && row.id === target.itemId)?.fields.find(row => row.path === target.pointer);
  if (target.collection !== 'spells' || target.itemId !== 'ua-druid-ceremony' || target.pointer !== '/exceptions/0'
      || valueHash(owner) !== target.wholeCurrentOwnerSha256 || owner.exceptions?.[0] !== target.currentValue
      || !isDeepStrictEqual(field, target.currentMechanicsField) || field.status !== 'unchecked' || field.inspected !== false) fail('exact retained target and pending mechanics field');
  const pin = Object.freeze({receiptSnapshot, receiptPath: mmSourceHandoffTransitionPath,
    receiptSha256: mmSourceHandoffTransitionSha256, sourceCommit: summary.sourceCommit, sourceTree: summary.sourceTree, repoRoot: currentRoot,
    baselineHash: valueHash(baselineData), currentDataHash: valueHash(currentData), conflictHash: valueHash(conflictReceipt)});
  validated.set(receipt, pin);
  if (!sourceHandoffContextMatches(receipt, {baselineData, currentData, conflictReceipt})) fail('source transition context was not bound');
  return deepFreezeJson(receipt);
}

export function sourceHandoffContextMatches(receipt, {baselineData, currentData, conflictReceipt} = {}) {
  const pin = validated.get(receipt);
  if (!receiptMatchesSnapshot(receipt, pin)
      || ![baselineData, currentData, conflictReceipt].every(value => plainJson(value))) return false;
  return Boolean(pin && isDeepStrictEqual(receipt, pin.receiptSnapshot)
    && valueHash(baselineData) === pin.baselineHash && valueHash(currentData) === pin.currentDataHash
    && valueHash(conflictReceipt) === pin.conflictHash);
}

export function isQualifiedSourceHistoricalChange(receipt, change) {
  const pin = validated.get(receipt);
  if (!receiptMatchesSnapshot(receipt, pin)) return false;
  const trustedReceiptValue = change === receipt.originalConflictReceipt.change;
  return Boolean((trustedReceiptValue || plainJson(change))
    && isDeepStrictEqual(change, pin.receiptSnapshot.originalConflictReceipt.change));
}

export function sourceHistoricalCaution(receipt, note, baselineIndex) {
  const pin = validated.get(receipt);
  if (!receiptMatchesSnapshot(receipt, pin)) return null;
  const trustedReceiptValue = note === receipt.curatedHistoricalCaution.note;
  if ((!trustedReceiptValue && !plainJson(note)) || baselineIndex !== 70
      || baselineIndex !== pin.receiptSnapshot.curatedHistoricalCaution.baselineIndex
      || !isDeepStrictEqual(note, pin.receiptSnapshot.curatedHistoricalCaution.note)) return null;
  const inheritedPath = pin.receiptSnapshot.inheritedHistoricalQualification.path;
  const inheritedBytes = readBytes(pin.repoRoot, inheritedPath);
  const inherited = JSON.parse(inheritedBytes.toString('utf8'));
  if (sha256(inheritedBytes) !== pin.receiptSnapshot.inheritedHistoricalQualification.sha256) return null;
  // Pass a detached mutable copy of the already verified pinned note to the
  // legacy pure projector; never thaw or expose caller-owned frozen evidence.
  const caution = uaSourceHistoricalCaution(inherited,
    structuredClone(pin.receiptSnapshot.curatedHistoricalCaution.note), baselineIndex);
  if (!caution) return null;
  return addNativeSourceQualificationFromValidatedSnapshot(caution, {
    receiptSnapshot: pin.receiptSnapshot,
    receiptPath: pin.receiptPath,
    receiptSha256: pin.receiptSha256,
    sourceCommit: pin.sourceCommit,
    sourceTree: pin.sourceTree,
  });
}

export function sourceHandoffTransitionReference(receipt) {
  const pin = validated.get(receipt);
  if (!receiptMatchesSnapshot(receipt, pin)) fail('transition reference requires an unchanged validated current-MM receipt');
  return {path: pin.receiptPath, sha256: pin.receiptSha256};
}
