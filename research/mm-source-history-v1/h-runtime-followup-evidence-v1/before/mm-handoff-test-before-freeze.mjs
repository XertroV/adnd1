import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {assertCurrentMmSourceEpoch} from '../tools/mm-current-source-gate-v1.mjs';
import {
  createMmCurrentMonetaryQuestionSuccessor,
  currentSourceQuestionRegistryPath,
  historicalProjectionBaselinePath,
  researchContractSha256,
} from '../research/mm-current-cli-successors-v1/native-monetary-source-questions-kernel-mm-v1.mjs';
import {
  loadJoCurrentSuccessor,
  loadSourceHandoffTransition,
  sourceHandoffContextMatches,
  sourceHandoffTransitionReference,
  isQualifiedSourceHistoricalChange,
  sourceHistoricalCaution,
} from '../tools/dmg175-current-successors-mm-v1.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readBytes = path => readFileSync(resolve(repoRoot, path));
const readJson = path => JSON.parse(readBytes(path).toString('utf8'));

test('current-MM monetary question CLI reports the guarded source epoch and nine scoped questions', () => {
  const output = execFileSync(process.execPath, ['tools/dmg175-current-monetary-source-questions-mm-v1.mjs', '--check'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const result = JSON.parse(output);
  assert.equal(result.status, 'current-MM-source-question-projection-valid-awaiting-review');
  assert.equal(result.sourceEpoch.sourceCommit, '0f2d70a135e3ad486152bf00f21387d60a1a97ef');
  assert.equal(result.sourceEpoch.sourceTree, '08010faf457df22cdb0a5ec35d2dcf79e622ade9');
  assert.equal(result.cohort.owners, 1064);
  assert.equal(result.cohort.retainedCanonicalBindings, 5655);
  assert.equal(result.cohort.addedCanonicalBindings, 76);
  assert.equal(result.currentDataSha256, '2ab84cfe5e4234e5d0303b2062f941f7d8e1b93d798a7402c16e78d6d2e4672c');
  assert.deepEqual(result.questionCounts, {
    currentInterpretationQuestions: 7,
    independentSourceScopeQuestions: 2,
    distinctScopeRows: 9,
    currentUnresolvedQuestions: 9,
  });
  assert.equal(result.semanticPass, false);
  assert.equal(result.generalSourceReviewPending, true);
});

test('current-MM monetary factory cannot caller-repin its contract and preflights caller JSON without getters', () => {
  const contractBytes = readBytes(currentSourceQuestionRegistryPath);
  const baselineBytes = readBytes(historicalProjectionBaselinePath);
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const baseline = JSON.parse(baselineBytes.toString('utf8'));
  const factoryOptions = {
    repoRoot,
    contract,
    contractBytes,
    baseline,
    baselineBytes,
    loadAudit: () => { throw new Error('constructor must not load the audit'); },
    assertSourceEpoch: () => { throw new Error('constructor must not enter the source guard'); },
    expectedContractSha256: researchContractSha256,
  };

  const repinnedContract = {...contract, status: 'caller-repinned'};
  const repinnedBytes = Buffer.from(JSON.stringify(repinnedContract));
  assert.notEqual(sha256(repinnedBytes), researchContractSha256);
  assert.throws(() => createMmCurrentMonetaryQuestionSuccessor({
    ...factoryOptions,
    contract: repinnedContract,
    contractBytes: repinnedBytes,
    expectedContractSha256: sha256(repinnedBytes),
  }), /repository-pinned current-MM contract digest/);

  let contractGetterCalls = 0;
  const accessorContract = structuredClone(contract);
  Object.defineProperty(accessorContract, 'status', {
    enumerable: true,
    configurable: true,
    get() { contractGetterCalls += 1; return contract.status; },
  });
  assert.throws(() => createMmCurrentMonetaryQuestionSuccessor({...factoryOptions, contract: accessorContract}), /Invalid current-MM JSON input/);
  assert.equal(contractGetterCalls, 0);

  let baselineGetterCalls = 0;
  const accessorBaseline = structuredClone(baseline);
  Object.defineProperty(accessorBaseline, 'status', {
    enumerable: true,
    configurable: true,
    get() { baselineGetterCalls += 1; return baseline.status; },
  });
  assert.throws(() => createMmCurrentMonetaryQuestionSuccessor({...factoryOptions, baseline: accessorBaseline}), /Invalid current-MM JSON input/);
  assert.equal(baselineGetterCalls, 0);
});

test('current-MM Jo CLI preserves the exact unextracted source-unknown price gap', () => {
  const output = execFileSync(process.execPath, ['tools/dmg175-current-jo-source-gap-mm-v1.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  const result = JSON.parse(output);
  assert.equal(result.status, 'current-MM-Jo-gap-preserved');
  assert.equal(result.sourceCommit, '0f2d70a135e3ad486152bf00f21387d60a1a97ef');
  assert.equal(result.sourceTree, '08010faf457df22cdb0a5ec35d2dcf79e622ade9');
  assert.equal(result.itemId, 'ua-jo-stick');
  assert.equal(result.priceState, 'unextracted');
  assert.equal(result.price, null);
  assert.equal(result.sourceAbsenceReviewed, false);
  assert.equal(result.valueReviewed, false);
  assert.ok(result.inputRefs >= 17);
});

test('current-MM Jo adapter rejects accessor-bearing caller data before hashing without invoking getters', () => {
  const {inputs} = assertCurrentMmSourceEpoch(repoRoot);
  let dataGetterCalls = 0;
  const accessorData = structuredClone(inputs.data);
  Object.defineProperty(accessorData, 'getterCanary', {
    enumerable: true,
    configurable: true,
    get() { dataGetterCalls += 1; return 'must not run'; },
  });
  assert.throws(() => loadJoCurrentSuccessor({repoRoot, data: accessorData, inventory: inputs.inventory}), /ordinary JSON/);
  assert.equal(dataGetterCalls, 0);

  let inventoryGetterCalls = 0;
  const accessorInventory = structuredClone(inputs.inventory);
  Object.defineProperty(accessorInventory, 'getterCanary', {
    enumerable: true,
    configurable: true,
    get() { inventoryGetterCalls += 1; return 'must not run'; },
  });
  assert.throws(() => loadJoCurrentSuccessor({repoRoot, data: inputs.data, inventory: accessorInventory}), /ordinary JSON/);
  assert.equal(inventoryGetterCalls, 0);
});

test('current-MM source-handoff wrapper binds the exact historical target without grading it', () => {
  const {inputs} = assertCurrentMmSourceEpoch(repoRoot);
  const baselineData = JSON.parse(execFileSync('git', ['show', '679b15d1c580172e54314829c1c3c86dc78b65f3:dist/data.json'], {
    cwd: repoRoot,
    maxBuffer: 32 * 1024 * 1024,
  }));
  const conflictReceipt = readJson('research/source-audit-batch5-conflict-integration.json');
  let baselineGetterCalls = 0;
  const accessorBaseline = {};
  Object.defineProperty(accessorBaseline, 'getterCanary', {
    enumerable: true,
    configurable: true,
    get() { baselineGetterCalls += 1; return 'must not run'; },
  });
  assert.throws(() => loadSourceHandoffTransition({
    read: readJson,
    hashFile: path => sha256(readBytes(path)),
    baselineData: accessorBaseline,
    currentData: inputs.data,
    mechanics: inputs.mechanics,
    conflictReceipt,
    repoRoot,
  }), /JSON context and read\/hash functions are required/);
  assert.equal(baselineGetterCalls, 0);
  const receipt = loadSourceHandoffTransition({
    read: readJson,
    hashFile: path => sha256(readBytes(path)),
    baselineData,
    currentData: inputs.data,
    mechanics: inputs.mechanics,
    conflictReceipt,
    repoRoot,
  });
  const context = {baselineData, currentData: inputs.data, conflictReceipt};
  assert.equal(sourceHandoffContextMatches(receipt, context), true);
  assert.equal(isQualifiedSourceHistoricalChange(receipt, receipt.originalConflictReceipt.change), true);
  assert.deepEqual(sourceHandoffTransitionReference(receipt), {
    path: 'research/mm-current-cli-successors-v1/source-body-handoff-transition-mm-v1.json',
    sha256: '66d18297f999a12b76c47e0a66e2758be902a6d4eb1d65d5031d7a97e93a1be7',
  });
  assert.deepEqual([receipt.qualifiedTarget.collection, receipt.qualifiedTarget.itemId, receipt.qualifiedTarget.pointer],
    ['spells', 'ua-druid-ceremony', '/exceptions/0']);
  assert.equal(receipt.qualifiedTarget.currentMechanicsField.status, 'unchecked');
  assert.equal(receipt.qualifiedTarget.currentMechanicsField.inspected, false);
  const caution = sourceHistoricalCaution(receipt, receipt.curatedHistoricalCaution.note, 70);
  assert.ok(caution);
  assert.equal(caution.nativeSourceQualification.sourceCommit, '0f2d70a135e3ad486152bf00f21387d60a1a97ef');
  assert.equal(caution.nativeSourceQualification.sourceTree, '08010faf457df22cdb0a5ec35d2dcf79e622ade9');

  const qualifiedChange = receipt.originalConflictReceipt.change;
  const unchangedReceipt = structuredClone(receipt);
  receipt.unapprovedChange = {field: '/unreviewed'};
  assert.equal(sourceHandoffContextMatches(receipt, context), false);
  assert.equal(isQualifiedSourceHistoricalChange(receipt, qualifiedChange), false);
  assert.equal(sourceHistoricalCaution(receipt, unchangedReceipt.curatedHistoricalCaution.note, 70), null);
});
