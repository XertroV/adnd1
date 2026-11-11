import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = resolve(import.meta.dirname, '..');
const baselineCommit = '679b15d1c580172e54314829c1c3c86dc78b65f3';
const source6bCommit = '6b3cfc8cb421a2c1fc2379c38abebe2075634981';
const legacyReceiptCommit = '386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
const sourceCommit = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
const currentContractSha256 = '7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550';
const currentReceiptSha256 = '66d18297f999a12b76c47e0a66e2758be902a6d4eb1d65d5031d7a97e93a1be7';
const historicalHReceiptPath = 'research/hirelings-native-h-v1/source-body-handoff-transition-v1.json';
const historicalHReceiptSha256 = '644992717168c73584a4d30084237aa253fcc5f9143b288a41f1ca6ba8bc4575';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBytes = (commit, path) => execFileSync('git', ['show', `${commit}:${path}`], {
  cwd: root, maxBuffer: 128 * 1024 * 1024,
});
const gitJson = (commit, path) => JSON.parse(gitBytes(commit, path).toString('utf8'));
const readBytes = path => readFileSync(resolve(root, path));
const readJson = path => JSON.parse(readBytes(path).toString('utf8'));
const hashCurrent = path => sha256(readBytes(path));

const [legacyModule, nativeModule, refreshModule, version29Module, currentGate] = await Promise.all([
  import(pathToFileURL(resolve(root, 'tools/ua-source-handoff-transition.mjs'))),
  import(pathToFileURL(resolve(root, 'tools/dmg175-current-successors-mm-v1.mjs'))),
  import(pathToFileURL(resolve(root, 'tools/refresh-gaps-handoff.mjs'))),
  import(pathToFileURL(resolve(root, 'tests/helpers/version29-native-source-context.mjs'))),
  import(pathToFileURL(resolve(root, 'tools/mm-current-source-gate-v1.mjs'))),
]);

const baselineData = gitJson(baselineCommit, 'dist/data.json');
const baselineHandoff = gitJson(baselineCommit, 'research/gaps-limitations-next-task.json');
const priorHandoff = gitJson(source6bCommit, 'research/gaps-limitations-next-task.json');
const {inputs:strictCurrentInputs,summary:currentMmSummary}=currentGate.assertCurrentMmSourceEpoch(root);
assert.equal(currentMmSummary.sourceCommit,sourceCommit);
assert.equal(currentMmSummary.sourceTree,'08010faf457df22cdb0a5ec35d2dcf79e622ade9');
assert.equal(currentMmSummary.owners,1064);
assert.equal(currentMmSummary.canonicalBindings,5731);
assert.equal(currentMmSummary.retainedCanonicalBindings,5655);
assert.equal(currentMmSummary.addedCanonicalBindings,76);
assert.equal(currentMmSummary.manualBindings,1293);
assert.equal(currentMmSummary.addedManualBindings,42);
assert.equal(currentMmSummary.addedOwners,2);
const currentData = strictCurrentInputs.data;
const currentHandoff = readJson('research/gaps-limitations-next-task.json');
const mechanics = strictCurrentInputs.mechanics;
const conflictReceipt = readJson('research/source-audit-batch5-conflict-integration.json');
const animalReceipt = readJson('research/source-audit-batch5-unextracted.json');
const classRetirementReceipt = readJson('research/source-audit-batch5-class-retired-ledger.json');
const currentContext = {baselineData, currentData, conflictReceipt};
const currentArgs = {...currentContext, mechanics, animalReceipt, classRetirementReceipt};
const loadCurrentTransition = overrides => nativeModule.loadSourceHandoffTransition({
  read: readJson,
  hashFile: hashCurrent,
  baselineData,
  currentData,
  mechanics,
  conflictReceipt,
  repoRoot: root,
  ...overrides,
});
const currentTransition = loadCurrentTransition();

function source6bHistoricalTransition() {
  const historicalCurrentData = gitJson(source6bCommit, 'dist/data.json');
  const historicalMechanics = gitJson(source6bCommit, 'research/mechanics-audit-progress.json');
  const historicalConflict = gitJson(source6bCommit, 'research/source-audit-batch5-conflict-integration.json');
  const readLegacyReceipt = path => gitJson(legacyReceiptCommit, path);
  const hashLegacyInput = path => sha256(gitBytes(legacyReceiptCommit, path));
  return {
    historicalCurrentData,
    historicalMechanics,
    historicalConflict,
    transition: legacyModule.loadUaSourceHandoffTransition({
      read: readLegacyReceipt,
      hashFile: hashLegacyInput,
      baselineData,
      currentData: historicalCurrentData,
      mechanics: historicalMechanics,
      conflictReceipt: historicalConflict,
    }),
  };
}

test('the source6b UA qualification remains an explicitly historical record', () => {
  const version29 = version29Module.readVersion29HistoricalSourceInputs(root);
  const historical = source6bHistoricalTransition();
  const transition = historical.transition;
  assert.ok(transition);
  assert.equal(transition.sourceInputCommit, source6bCommit);
  assert.equal(sha256(gitBytes(source6bCommit, 'dist/data.json')), transition.sourceData.rawSha256);
  assert.equal(legacyModule.uaSourceHandoffContextMatches(transition, {
    baselineData,
    currentData: historical.historicalCurrentData,
    conflictReceipt: historical.historicalConflict,
  }), true);
  assert.equal(legacyModule.isQualifiedUaSourceHistoricalChange(
    transition, historical.historicalConflict.changes[4],
  ), true);
  assert.equal(legacyModule.isQualifiedUaSourceHistoricalChange(
    transition, {...historical.historicalConflict.changes[4], pointer: '/exceptions/1'},
  ), false);

  // Keep the closed Version 29 snapshot available for historical checks only.
  // The current-MM successor below reads actual MM files and a pinned current cohort.
  assert.equal(version29.sourceRawInputs['dist/data.json'], 'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d');
  assert.equal(version29.mechanics.reviewRecords.length, 1215);
  assert.notEqual(version29.sourceRawInputs['dist/data.json'], transition.sourceData.rawSha256);
  assert.notEqual(sha256(Buffer.from(JSON.stringify(version29.data))), sha256(Buffer.from(JSON.stringify(currentData))));
});

test('the current-MM successor preserves the exact H receipt lineage, qualifies one historical change, and leaves the body pending', () => {
  assert.equal(nativeModule.mmSourceHandoffTransitionPath, 'research/mm-current-cli-successors-v1/source-body-handoff-transition-mm-v1.json');
  assert.equal(nativeModule.mmSourceHandoffTransitionSha256, currentReceiptSha256);
  assert.equal(hashCurrent(historicalHReceiptPath),historicalHReceiptSha256,'the exact H receipt remains preserved as an ancestor');
  const historicalHReceipt=readJson(historicalHReceiptPath);
  assert.equal(historicalHReceipt.sourceEpoch.sourceCommit,'bc819621e49788260bb34ea47c1f7a8b35af6edf');
  assert.deepEqual(currentTransition.priorTransition,{path:historicalHReceiptPath,sha256:historicalHReceiptSha256,valueSha256:sha256(Buffer.from(JSON.stringify(historicalHReceipt)))});
  assert.equal(currentTransition.sourceEpoch.sourceCommit, sourceCommit);
  assert.equal(currentTransition.sourceEpoch.contract.sha256, currentContractSha256);
  assert.equal(nativeModule.sourceHandoffContextMatches(currentTransition, currentContext), true);

  assert.throws(() => refreshModule.validateApprovedTransitions(currentArgs), /conflict receipt no longer exactly matches/);
  const transitions = refreshModule.validateApprovedTransitions({...currentArgs, sourceBodyTransition: currentTransition});
  assert.equal(transitions.length, 12);
  const qualified = transitions.filter(row => row.kind === 'historical-source-body-transition-qualified');
  assert.equal(qualified.length, 1);
  assert.deepEqual({
    collection: qualified[0].collection,
    itemId: qualified[0].itemId,
    pointer: qualified[0].pointer,
    currentFieldStatus: qualified[0].currentFieldStatus,
    sourceValueGrade: qualified[0].sourceValueGrade,
    receipt: qualified[0].receipt,
  }, {
    collection: 'spells',
    itemId: 'ua-druid-ceremony',
    pointer: '/exceptions/0',
    currentFieldStatus: 'unchecked',
    sourceValueGrade: 'NOT PROMOTED',
    receipt: {path: nativeModule.mmSourceHandoffTransitionPath, sha256: currentReceiptSha256},
  });
  assert.equal(mechanics.reviewRecords.length, 1215);
  assert.equal(mechanics.counts.staleProposalFields, 0);
  assert.equal(currentTransition.semanticPass, false);
  assert.equal(currentTransition.currentSourceValueGrade, 'NOT PROMOTED');
  const field = mechanics.records.find(row => row.collection === 'spells' && row.id === 'ua-druid-ceremony')
    ?.fields.find(row => row.path === '/exceptions/0');
  assert.equal(field.status, 'unchecked');
  assert.equal(field.inspected, false);
});

test('current-MM qualification rejects changed inputs, copied receipts, and reader drift', () => {
  const copied = structuredClone(currentTransition);
  assert.equal(nativeModule.sourceHandoffContextMatches(copied, currentContext), false);
  assert.throws(() => refreshModule.validateApprovedTransitions({...currentArgs, sourceBodyTransition: copied}), /qualification does not match/);
  assert.equal(nativeModule.sourceHandoffContextMatches(currentTransition, {
    ...currentContext,
    baselineData: {...baselineData, rules: [...baselineData.rules, {id: 'mutated'}]},
  }), false);
  assert.equal(nativeModule.sourceHandoffContextMatches(currentTransition, {
    ...currentContext,
    currentData: {...currentData, rules: [...currentData.rules, {id: 'mutated'}]},
  }), false);
  assert.equal(nativeModule.sourceHandoffContextMatches(currentTransition, {
    ...currentContext,
    conflictReceipt: {...conflictReceipt, changes: [...conflictReceipt.changes, conflictReceipt.changes[0]]},
  }), false);

  const changedMechanics = structuredClone(mechanics);
  changedMechanics.records.find(row => row.id === 'ua-druid-ceremony').fields.find(row => row.path === '/exceptions/0').status = 'source-checked';
  assert.throws(() => loadCurrentTransition({mechanics: changedMechanics}), /actual MM data, mechanics, historical baseline/);
  const changedConflict = structuredClone(conflictReceipt);
  changedConflict.changes[0].newValue += ' changed';
  assert.throws(() => loadCurrentTransition({conflictReceipt: changedConflict}), /actual MM data, mechanics, historical baseline/);
  const alteredCallerReceipt = path => path === nativeModule.mmSourceHandoffTransitionPath
    ? {...readJson(path), status: 'mutated'}
    : readJson(path);
  assert.throws(() => nativeModule.loadSourceHandoffTransition({
    read: alteredCallerReceipt,
    hashFile: hashCurrent,
    baselineData,
    currentData,
    mechanics,
    conflictReceipt,
    repoRoot: root,
  }), /caller receipt reader differs/);

  assert.equal(Object.isFrozen(currentTransition), true);
  assert.equal(Object.isFrozen(currentTransition.qualifiedTarget), true);
  assert.equal(Reflect.set(currentTransition, 'status', 'mutated'), false);
  assert.equal(Reflect.set(currentTransition.qualifiedTarget, 'pointer', '/exceptions/1'), false);
});

test('only caution 70 changes historical disposition; unrelated history stays exact', () => {
  const note = baselineHandoff.mechanicsAudit.specificReviewNoteCandidates.notes[70];
  const options = {
    ...currentArgs,
    currentHandoff,
    curatedNotes: baselineHandoff.mechanicsAudit.specificReviewNoteCandidates.notes,
    conflictReceiptSha256: hashCurrent('research/source-audit-batch5-conflict-integration.json'),
    classRetirementReceiptSha256: hashCurrent('research/source-audit-batch5-class-retired-ledger.json'),
    animalReceiptSha256: hashCurrent('research/source-audit-batch5-unextracted.json'),
  };
  assert.equal(nativeModule.sourceHistoricalCaution(currentTransition, note, 70).nativeSourceQualification.sourceCommit, sourceCommit);
  assert.equal(nativeModule.sourceHistoricalCaution(currentTransition, note, 69), null);
  assert.equal(nativeModule.sourceHistoricalCaution(currentTransition, {...note, reason: note.reason + ' changed'}, 70), null);
  assert.throws(() => refreshModule.reconcileCuratedNotes(options), /unreceipted caution transition/);

  const result = refreshModule.reconcileCuratedNotes({...options, sourceBodyTransition: currentTransition});
  const row = result.history.find(record => record.baselineIndex === 70);
  assert.equal(row.disposition, 'historical-reviewed-correction-replaced-by-pending-source-body');
  assert.equal(row.currentFieldStatus, 'unchecked');
  assert.equal(row.sourceValueGrade, 'NOT PROMOTED');
  assert.equal(row.nativeSourceQualification.sourceCommit, sourceCommit);
  assert.deepEqual(row.priorHandoffDisposition, currentTransition.priorHandoffDisposition);
  assert.deepEqual(
    result.history.filter(record => record.itemId !== 'ua-druid-ceremony'),
    priorHandoff.mechanicsAudit.specificReviewNoteCandidates.history.filter(record => record.itemId !== 'ua-druid-ceremony'),
  );
  assert.deepEqual(
    classRetirementReceipt,
    gitJson(source6bCommit, 'research/source-audit-batch5-class-retired-ledger.json'),
  );

  const changedNotes = structuredClone(options.curatedNotes);
  changedNotes[70].reason += ' changed';
  assert.throws(() => refreshModule.reconcileCuratedNotes({...options, curatedNotes: changedNotes, sourceBodyTransition: currentTransition}), /unreceipted caution transition/);
});


test('legacy source6b guard rejects every original wrong receipt identity and context mutation', () => {
  const historical = source6bHistoricalTransition();
  const context = {
    baselineData,
    currentData: historical.historicalCurrentData,
    conflictReceipt: historical.historicalConflict,
  };
  for (const [label, mutate] of [
    ['wrong source input commit', receipt => { receipt.sourceInputCommit = '6717c6f22bbf2f2b421327e4c8561b1d81df00d4'; }],
    ['wrong source raw digest', receipt => { receipt.sourceData.rawSha256 = '0'.repeat(64); }],
    ['wrong qualified owner', receipt => { receipt.qualifiedTarget.itemId = 'ua-cleric-ceremony'; }],
    ['wrong qualified pointer', receipt => { receipt.qualifiedTarget.pointer = '/exceptions/1'; }],
    ['wrong qualified current value', receipt => { receipt.qualifiedTarget.currentValue += ' changed'; }],
  ]) {
    const candidate = structuredClone(historical.transition);
    mutate(candidate);
    assert.equal(legacyModule.uaSourceHandoffContextMatches(candidate, context), false, label);
  }

  const changedData = structuredClone(historical.historicalCurrentData);
  changedData.rules[0].summary += ' changed';
  assert.equal(legacyModule.uaSourceHandoffContextMatches(historical.transition, {
    ...context, currentData: changedData,
  }), false, 'changed historical source data is rejected');
  const changedConflict = structuredClone(historical.historicalConflict);
  changedConflict.changes[0].newValue = 'unapproved';
  assert.equal(legacyModule.uaSourceHandoffContextMatches(historical.transition, {
    ...context, conflictReceipt: changedConflict,
  }), false, 'changed conflict rows are rejected');
  const duplicateConflict = structuredClone(historical.historicalConflict);
  duplicateConflict.changes.push(structuredClone(duplicateConflict.changes[4]));
  assert.equal(legacyModule.uaSourceHandoffContextMatches(historical.transition, {
    ...context, conflictReceipt: duplicateConflict,
  }), false, 'an additional conflict row is rejected');
});

test('legacy source6b guard preserves all seven forged-value negative controls', () => {
  const historical = source6bHistoricalTransition();
  const context = {
    baselineData,
    currentData: historical.historicalCurrentData,
    conflictReceipt: historical.historicalConflict,
  };
  for (const [label, mutate] of [
    ['own undefined property', receipt => { receipt.hidden = undefined; }],
    ['non-enumerable property', receipt => { Object.defineProperty(receipt, 'hidden', {value: 1}); }],
    ['NaN value', receipt => { receipt.hidden = NaN; }],
    ['negative zero', receipt => { receipt.hidden = -0; }],
    ['function value', receipt => { receipt.hidden = () => 1; }],
    ['Proxy value', receipt => { receipt.hidden = new Proxy({}, {}); }],
    ['toJSON spoof', receipt => { receipt.toJSON = () => historical.transition; }],
  ]) {
    const candidate = structuredClone(historical.transition);
    mutate(candidate);
    assert.equal(legacyModule.uaSourceHandoffContextMatches(candidate, context), false, label);
  }

  const changedMechanics = structuredClone(historical.historicalMechanics);
  changedMechanics.records.find(row => row.id === 'ua-druid-ceremony')
    .fields.find(field => field.path === '/exceptions/0').status = 'source-checked';
  const readLegacyReceipt = path => gitJson(legacyReceiptCommit, path);
  const hashLegacyInput = path => sha256(gitBytes(legacyReceiptCommit, path));
  assert.throws(() => legacyModule.loadUaSourceHandoffTransition({
    read: readLegacyReceipt,
    hashFile: hashLegacyInput,
    baselineData,
    currentData: historical.historicalCurrentData,
    mechanics: changedMechanics,
    conflictReceipt: historical.historicalConflict,
  }), /pending field grade/);
  assert.throws(() => legacyModule.loadUaSourceHandoffTransition({
    read: path => path === legacyModule.uaSourceHandoffTransitionPath
      ? {...readLegacyReceipt(path), sourceInputCommit: 'wrong'}
      : readLegacyReceipt(path),
    hashFile: hashLegacyInput,
    baselineData,
    currentData: historical.historicalCurrentData,
    mechanics: historical.historicalMechanics,
    conflictReceipt: historical.historicalConflict,
  }), /qualification identity/);
});

test('current-MM loader rejects changed baseline, current data, conflict rows, and duplicates', () => {
  const changedBaseline = structuredClone(baselineData);
  changedBaseline.rules[0].summary += ' changed';
  assert.throws(() => loadCurrentTransition({baselineData: changedBaseline}), /actual MM data, mechanics, historical baseline/);

  const changedCurrent = structuredClone(currentData);
  changedCurrent.rules[0].summary += ' changed';
  assert.throws(() => loadCurrentTransition({currentData: changedCurrent}), /actual MM data, mechanics, historical baseline/);

  const changedConflict = structuredClone(conflictReceipt);
  changedConflict.changes[0].newValue = 'unapproved';
  assert.throws(() => loadCurrentTransition({conflictReceipt: changedConflict}), /actual MM data, mechanics, historical baseline/);
  const duplicateConflict = structuredClone(conflictReceipt);
  duplicateConflict.changes.push(structuredClone(duplicateConflict.changes[4]));
  assert.throws(() => loadCurrentTransition({conflictReceipt: duplicateConflict}), /actual MM data, mechanics, historical baseline/);

  const changedMechanics = structuredClone(mechanics);
  changedMechanics.records.find(row => row.id === 'ua-druid-ceremony')
    .fields.find(field => field.path === '/exceptions/0').status = 'source-checked';
  assert.throws(() => loadCurrentTransition({mechanics: changedMechanics}), /actual MM data, mechanics, historical baseline/);
  assert.equal(currentTransition.currentSourceValueGrade, 'NOT PROMOTED');
  assert.equal(currentTransition.qualifiedTarget.currentMechanicsField.status, 'unchecked');
});

test('current-MM caller receipt reader rejects every forged-value form and identity spoof', () => {
  const forgedReceiptMutations = [
    ['own undefined property', receipt => { receipt.hidden = undefined; }],
    ['non-enumerable property', receipt => { Object.defineProperty(receipt, 'hidden', {value: 1}); }],
    ['NaN value', receipt => { receipt.hidden = NaN; }],
    ['negative zero', receipt => { receipt.hidden = -0; }],
    ['function value', receipt => { receipt.hidden = () => 1; }],
    ['Proxy value', receipt => { receipt.hidden = new Proxy({}, {}); }],
    ['toJSON spoof', receipt => { receipt.toJSON = () => currentTransition; }],
    ['source commit spoof', receipt => { receipt.sourceEpoch.sourceCommit = '6717c6f22bbf2f2b421327e4c8561b1d81df00d4'; }],
    ['target owner spoof', receipt => { receipt.qualifiedTarget.itemId = 'ua-cleric-ceremony'; }],
    ['target pointer spoof', receipt => { receipt.qualifiedTarget.pointer = '/exceptions/1'; }],
    ['target value spoof', receipt => { receipt.qualifiedTarget.currentValue += ' changed'; }],
    ['status spoof', receipt => { receipt.status = 'mutated'; }],
  ];
  for (const [label, mutate] of forgedReceiptMutations) {
    assert.throws(() => nativeModule.loadSourceHandoffTransition({
      read: path => {
        const receipt = readJson(path);
        if (path !== nativeModule.mmSourceHandoffTransitionPath) return receipt;
        const candidate = structuredClone(receipt);
        mutate(candidate);
        return candidate;
      },
      hashFile: hashCurrent,
      baselineData,
      currentData,
      mechanics,
      conflictReceipt,
      repoRoot: root,
    }), /caller receipt reader differs/, label);
  }
  assert.equal(currentTransition.semanticPass, false);
  assert.equal(currentTransition.currentSourceValueGrade, 'NOT PROMOTED');
  const field = mechanics.records.find(row => row.collection === 'spells' && row.id === 'ua-druid-ceremony')
    ?.fields.find(row => row.path === '/exceptions/0');
  assert.equal(field.status, 'unchecked');
  assert.equal(field.inspected, false);
});
