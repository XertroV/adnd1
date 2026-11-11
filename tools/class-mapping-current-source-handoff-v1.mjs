// Additive next-native successor for the exact H -> MM source-body handoff.
// It requires a newly reviewed S1 receipt, preserves old H/MM lineage and never
// promotes a current value/context grade. The old handoff modules remain frozen.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {resolve} from 'node:path';
import {uaSourceHistoricalCaution} from './ua-source-handoff-transition.mjs';
import {qualifyCurrentConsumerCodeStage, qualifyCurrentConsumerStage, currentConsumerRepoRoot,
  requireQualificationArtifact, requireConsumerReceipt, sourceBodyReference, assertPlainJson} from './class-mapping-current-consumer-runtime-v1.mjs';

export const sourceHandoffTransitionPath = 'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json';
const contractPath = 'research/class-mapping-current-adapters-v1/source-handoff-current-contract-v1.json';
const templatePath = 'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.template.json';
const priorMmPath = 'research/mm-current-cli-successors-v1/source-body-handoff-transition-mm-v1.json';
const priorMmSha = '66d18297f999a12b76c47e0a66e2758be902a6d4eb1d65d5031d7a97e93a1be7';
const priorHPath = 'research/hirelings-native-h-v1/source-body-handoff-transition-v1.json';
const priorHSha = '644992717168c73584a4d30084237aa253fcc5f9143b288a41f1ca6ba8bc4575';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonHash = value => sha(Buffer.from(JSON.stringify(value)));
const read = rel => readFileSync(resolve(currentConsumerRepoRoot, rel));
const parse = rel => JSON.parse(read(rel).toString('utf8'));
const fail = message => { throw new Error(`Invalid next-native source-body handoff: ${message}`); };
const validated = new WeakMap();

function freezeJson(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeJson(child);
    Object.freeze(value);
  }
  return value;
}
function qualify(receipt) {
  try {
    assertPlainJson(receipt, 'validated handoff receipt');
    const pin = validated.get(receipt);
    if (!pin || !isDeepStrictEqual(receipt, pin.receipt)) return null;
    const fresh = qualifyCurrentConsumerStage();
    if (fresh.summary.sourceCommit !== pin.receipt.sourceEpoch?.sourceCommit
        || fresh.summary.sourceTree !== pin.receipt.sourceEpoch?.sourceTree
        || fresh.summary.fixture?.sha256 !== pin.receipt.sourceEpoch?.fixture?.sha256) return null;
    return pin;
  } catch { return null; }
}
function loadContract(stage) {
  const pinned = requireQualificationArtifact(stage, contractPath);
  const contract = JSON.parse(pinned.bytes.toString('utf8'));
  const binding = contract.nativeSourceEpochBinding;
  if (contract.schemaVersion !== 1 || contract.artifactType !== 'Next-native source-body handoff transition contract'
      || contract.status !== 'qualified S1 source-body handoff; current value grade remains unpromoted'
      || contract.materialized !== true || binding?.sourceCommit !== stage.summary.sourceCommit
      || binding?.sourceTree !== stage.summary.sourceTree || binding?.fixturePath !== stage.summary.fixture.path
      || binding?.fixtureSha256 !== stage.summary.fixture.sha256
      || contract.historicalParent?.path !== priorMmPath || contract.historicalParent?.sha256 !== priorMmSha
      || contract.historicalHandoff?.path !== priorHPath || contract.historicalHandoff?.sha256 !== priorHSha
      || contract.historicalBaseline?.valueSha256 !== 'b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6'
      || contract.historicalConflictReceipt?.valueSha256 !== '7a61d692cd1cfe6bb08ab337d113c35041a5b47d0c97a18219eb25ead40ecc9e'
      || contract.qualifiedTargetIdentity?.collection !== 'spells' || contract.qualifiedTargetIdentity?.itemId !== 'ua-druid-ceremony'
      || contract.qualifiedTargetIdentity?.pointer !== '/exceptions/0'
      || contract.currentTransition?.path !== sourceHandoffTransitionPath
      || contract.currentTransition?.sha256 !== null) fail('current handoff contract must be pinned to S1 while leaving its post-qualifier receipt hash dynamic');
  const receiptPin = requireConsumerReceipt(stage, contract.currentTransition.path);
  return {contract, receiptBytes: receiptPin.bytes, receiptRef: {path: contract.currentTransition.path, sha256: receiptPin.sha256}};
}

function currentHandoffContract(stage) {
  const pinned = requireQualificationArtifact(stage, contractPath);
  const contract = JSON.parse(pinned.bytes.toString('utf8'));
  const binding = contract.nativeSourceEpochBinding;
  if (contract.schemaVersion !== 1 || contract.artifactType !== 'Next-native source-body handoff transition contract'
      || contract.status !== 'qualified S1 source-body handoff; current value grade remains unpromoted'
      || contract.materialized !== true || binding?.sourceCommit !== stage.summary.sourceCommit
      || binding?.sourceTree !== stage.summary.sourceTree || binding?.fixturePath !== stage.summary.fixture.path
      || binding?.fixtureSha256 !== stage.summary.fixture.sha256
      || contract.historicalParent?.path !== priorMmPath || contract.historicalParent?.sha256 !== priorMmSha
      || contract.historicalHandoff?.path !== priorHPath || contract.historicalHandoff?.sha256 !== priorHSha
      || contract.qualifiedTargetIdentity?.collection !== 'spells' || contract.qualifiedTargetIdentity?.itemId !== 'ua-druid-ceremony'
      || contract.qualifiedTargetIdentity?.pointer !== '/exceptions/0'
      || contract.currentTransition?.path !== sourceHandoffTransitionPath || contract.currentTransition?.sha256 !== null) {
    fail('current handoff contract must be pinned to S1 while keeping its separately generated receipt unpinned here');
  }
  return contract;
}

// Build bytes only. A caller such as the S2 report binder may write these bytes
// and then add their digest to currentConsumerPins; the body gate is never made
// dependent on this post-QCC receipt.
export function buildNextNativeSourceHandoffTransitionReceipt(...args) {
  if (args.length) fail('handoff receipt generation accepts no caller overrides');
  const stage = qualifyCurrentConsumerCodeStage();
  const contract = currentHandoffContract(stage);
  const templatePin = requireQualificationArtifact(stage, templatePath);
  const template = JSON.parse(templatePin.bytes.toString('utf8'));
  const binding = template.sourceEpoch;
  if (template.schemaVersion !== 1 || template.artifactType !== 'next-native source-body historical transition qualification'
      || template.status !== 'unmaterialized S1 receipt template; actual body/code/reference values must be measured after commit'
      || template.semanticPass !== false || template.currentSourceValueGrade !== 'NOT PROMOTED'
      || binding?.sourceCommit !== stage.summary.sourceCommit || binding?.sourceTree !== stage.summary.sourceTree
      || binding?.fixture?.path !== stage.summary.fixture.path || binding?.fixture?.sha256 !== null
      || !isDeepStrictEqual(contract.historicalChangeQualification, template.originalConflictReceipt.change)
      || !isDeepStrictEqual(contract.curatedHistoricalCaution, template.curatedHistoricalCaution)) {
    fail('fixed receipt template, historical conflict/caution lineage or grade boundary changed');
  }
  const priorMmBytes = read(priorMmPath);
  if (sha(priorMmBytes) !== priorMmSha) fail('frozen MM handoff transition bytes changed');
  const priorHBytes = read(priorHPath);
  if (sha(priorHBytes) !== priorHSha) fail('frozen H handoff transition bytes changed');
  const priorMm = JSON.parse(priorMmBytes.toString('utf8'));
  const priorH = JSON.parse(priorHBytes.toString('utf8'));
  const data = stage.inputs.data;
  const mechanics = stage.inputs.mechanics;
  const owner = data.spells?.find(row => row.id === 'ua-druid-ceremony');
  const field = mechanics.records?.find(row => row.collection === 'spells' && row.id === 'ua-druid-ceremony')
    ?.fields?.find(row => row.path === '/exceptions/0');
  if (!owner || !field || field.status !== 'unchecked' || field.inspected !== false
      || !Array.isArray(owner.exceptions) || owner.exceptions.length < 1) {
    fail('the qualified current target and mechanics field must exist and remain uninspected');
  }
  const currentDataRef = sourceBodyReference(stage, 'dist/data.json');
  const mechanicsRef = sourceBodyReference(stage, 'research/mechanics-audit-progress.json');
  const currentReviewRecords = mechanics.reviewRecords || [];
  const receipt = structuredClone(template);
  receipt.status = 'historical-correction-qualified-next-native-body-value-unchecked';
  receipt.sourceEpoch.fixture.sha256 = stage.summary.fixture.sha256;
  receipt.qualifiedTarget.wholeCurrentOwnerSha256 = jsonHash(owner);
  receipt.qualifiedTarget.currentValue = owner.exceptions[0];
  receipt.qualifiedTarget.currentMechanicsField = structuredClone(field);
  receipt.currentSourceData.parsedSha256 = jsonHash(data);
  receipt.currentMechanics.parsedSha256 = jsonHash(mechanics);
  receipt.currentMechanics.reviewRecords = currentReviewRecords.length;
  receipt.currentMechanics.reviewRecordsSha256 = jsonHash(currentReviewRecords);
  receipt.provenance.qualifierCodeCommit = stage.consumerPins.qualifierCodeCommit;
  // The receipt never contains its own digest. The separate post-QCC S2 pin
  // module closes the generated bytes after the binder writes them.
  receipt.provenance.receiptSha256 = null;
  receipt.currentSourceData.path = currentDataRef.path;
  receipt.currentSourceData.rawSha256 = currentDataRef.sha256;
  receipt.currentMechanics.path = mechanicsRef.path;
  receipt.currentMechanics.rawSha256 = mechanicsRef.sha256;
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return {path: sourceHandoffTransitionPath, receipt, bytes, sha256: sha(bytes), semanticPass: false,
    currentSourceValueGrade: 'NOT PROMOTED', contextualAdequacy: 'NOT ASSESSED'};
}

export function loadSourceHandoffTransition(...args) {
  if (args.length !== 1) fail('handoff loader accepts exactly one historical/current context object');
  assertPlainJson(args[0], 'handoff loader options');
  const {baselineData, currentData, mechanics, conflictReceipt} = args[0];
  assertPlainJson(baselineData, 'historical baseline');
  assertPlainJson(currentData, 'current data');
  assertPlainJson(mechanics, 'current mechanics');
  assertPlainJson(conflictReceipt, 'historical conflict receipt');
  const stage = qualifyCurrentConsumerStage();
  if (!isDeepStrictEqual(currentData, stage.inputs.data) || !isDeepStrictEqual(mechanics, stage.inputs.mechanics)) {
    fail('passed current data/mechanics are not the exact qualified native snapshot');
  }
  if (jsonHash(baselineData) !== 'b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6'
      || jsonHash(conflictReceipt) !== '7a61d692cd1cfe6bb08ab337d113c35041a5b47d0c97a18219eb25ead40ecc9e') {
    fail('exact historical V29 baseline or conflict receipt changed');
  }
  const {contract, receiptBytes, receiptRef} = loadContract(stage);
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  if (receipt.provenance?.qualifierCodeCommit !== stage.consumerPins.qualifierCodeCommit) {
    fail('handoff receipt does not bind the S2-pinned QUALIFIER_CODE_COMMIT');
  }
  const priorBytes = read(priorMmPath);
  if (sha(priorBytes) !== priorMmSha) fail('frozen MM handoff transition bytes changed');
  const priorMm = JSON.parse(priorBytes.toString('utf8'));
  const priorHBytes = read(priorHPath);
  if (sha(priorHBytes) !== priorHSha) fail('frozen H handoff transition bytes changed');
  const priorH = JSON.parse(priorHBytes.toString('utf8'));
  const currentDataRef = sourceBodyReference(stage, 'dist/data.json');
  const mechanicsRef = sourceBodyReference(stage, 'research/mechanics-audit-progress.json');
  const currentReviewRecords = stage.inputs.mechanics.reviewRecords || [];
  const expectedMechanicsRef = {path: mechanicsRef.path, rawSha256: mechanicsRef.sha256,
    parsedSha256: jsonHash(stage.inputs.mechanics), mechanicsInputSha256: stage.inputs.mechanics.input?.sha256 ?? null,
    reviewRecords: currentReviewRecords.length, reviewRecordsSha256: jsonHash(currentReviewRecords)};
  const target = receipt.qualifiedTarget;
  const owner = stage.inputs.data.spells?.find(row => row.id === 'ua-druid-ceremony');
  const field = stage.inputs.mechanics.records?.find(row => row.collection === 'spells' && row.id === 'ua-druid-ceremony')?.fields?.find(row => row.path === '/exceptions/0');
  const expectedPrior = {path: priorMmPath, sha256: priorMmSha, valueSha256: jsonHash(priorMm)};
  if (receipt.schemaVersion !== 1 || receipt.artifactType !== 'next-native source-body historical transition qualification'
      || receipt.status !== 'historical-correction-qualified-next-native-body-value-unchecked'
      || receipt.semanticPass !== false || receipt.currentSourceValueGrade !== 'NOT PROMOTED'
      || !isDeepStrictEqual(receipt.sourceEpoch, {sourceCommit: stage.summary.sourceCommit, sourceTree: stage.summary.sourceTree,
        fixture: stage.summary.fixture})
      || !isDeepStrictEqual(receipt.priorTransition, expectedPrior)
      || !isDeepStrictEqual(receipt.originalConflictReceipt, priorH.originalConflictReceipt)
      || !isDeepStrictEqual(receipt.curatedHistoricalCaution, priorH.curatedHistoricalCaution)
      || !isDeepStrictEqual(receipt.priorHandoffDisposition, priorH.priorHandoffDisposition)
      || !isDeepStrictEqual(receipt.inheritedHistoricalQualification, priorH.inheritedHistoricalQualification)
      || !isDeepStrictEqual(contract.historicalChangeQualification, priorH.originalConflictReceipt.change)
      || !isDeepStrictEqual(contract.curatedHistoricalCaution, priorH.curatedHistoricalCaution)
      || target?.collection !== 'spells' || target?.itemId !== 'ua-druid-ceremony' || target?.pointer !== '/exceptions/0'
      || !owner || target.wholeCurrentOwnerSha256 !== jsonHash(owner) || owner.exceptions?.[0] !== target.currentValue
      || !field || !isDeepStrictEqual(field, target.currentMechanicsField) || field.status !== 'unchecked' || field.inspected !== false
      || !isDeepStrictEqual(receipt.currentSourceData, {path: currentDataRef.path, rawSha256: currentDataRef.sha256, parsedSha256: jsonHash(stage.inputs.data)})
      || !isDeepStrictEqual(receipt.currentMechanics, expectedMechanicsRef)
      || contract.gradeBoundary?.semanticPass !== false || contract.gradeBoundary?.currentSourceValueGrade !== 'NOT PROMOTED'
      || contract.gradeBoundary?.sourceValueApproval !== false || contract.gradeBoundary?.contextualAdequacy !== 'NOT ASSESSED') {
    fail('new S1 handoff receipt must preserve exact H conflict/caution lineage and leave the target field unchecked');
  }
  const frozen = freezeJson(receipt);
  validated.set(frozen, {receipt: frozen, receiptRef, baselineHash: jsonHash(baselineData), currentDataHash: jsonHash(currentData), conflictHash: jsonHash(conflictReceipt), root: currentConsumerRepoRoot});
  if (!sourceHandoffContextMatches(frozen, {baselineData, currentData, conflictReceipt})) fail('S1 receipt did not bind the supplied historical/current context');
  return frozen;
}

export function sourceHandoffContextMatches(receipt, ...args) {
  if (args.length !== 1) return false;
  try { assertPlainJson(args[0], 'handoff context options'); } catch { return false; }
  const {baselineData, currentData, conflictReceipt} = args[0];
  try {
    assertPlainJson(baselineData, 'historical baseline');
    assertPlainJson(currentData, 'current data');
    assertPlainJson(conflictReceipt, 'historical conflict receipt');
  } catch { return false; }
  const pin = qualify(receipt);
  if (!pin) return false;
  try {
    return jsonHash(baselineData) === pin.baselineHash && jsonHash(currentData) === pin.currentDataHash
      && jsonHash(conflictReceipt) === pin.conflictHash;
  } catch { return false; }
}
export function isQualifiedSourceHistoricalChange(receipt, change) {
  try { assertPlainJson(change, 'historical change'); } catch { return false; }
  const pin = qualify(receipt);
  return Boolean(pin && isDeepStrictEqual(change, pin.receipt.originalConflictReceipt.change));
}
export function sourceHistoricalCaution(receipt, note, baselineIndex) {
  try { assertPlainJson(note, 'historical caution note'); } catch { return null; }
  const pin = qualify(receipt);
  if (!pin || baselineIndex !== pin.receipt.curatedHistoricalCaution.baselineIndex
      || !isDeepStrictEqual(note, pin.receipt.curatedHistoricalCaution.note)) return null;
  const inherited = pin.receipt.inheritedHistoricalQualification;
  const bytes = read(inherited.path);
  if (sha(bytes) !== inherited.sha256) return null;
  const result = uaSourceHistoricalCaution(JSON.parse(bytes.toString('utf8')), structuredClone(note), baselineIndex);
  if (!result) return null;
  return {...result, disposition:'historical-reviewed-correction-replaced-by-pending-native-source-body',
    receipt:pin.receiptRef.path, receiptSha256:pin.receiptRef.sha256, currentFieldStatus:'unchecked', sourceValueGrade:'NOT PROMOTED'};
}
export function sourceHandoffTransitionReference(receipt) {
  const pin = qualify(receipt);
  if (!pin) fail('receipt reference requires an unchanged, validated next-native receipt');
  return {...pin.receiptRef};
}
