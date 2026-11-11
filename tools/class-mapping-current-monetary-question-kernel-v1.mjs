// Additive next-native monetary question kernel. Fixed MM/V29 artifacts remain historical inputs.
// All current source identity comes only from the no-argument native class-source gate.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {currentConsumerRepoRoot, qualifyCurrentConsumerStage} from './class-mapping-current-consumer-runtime-v1.mjs';
import {loadMonetaryRowIdentityAudit} from './monetary-row-identity-audit.mjs';

export const currentSourceQuestionRegistryPath = 'research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json';
export const historicalProjectionBaselinePath = 'research/hirelings-current-next-batch-v1/native-monetary-successor-v2/version29-monetary-questions-actual-projection-baseline-v2.json';
export const historicalBaselineSha256 = 'c220e9a5d4ef6d53d671df0ecf947fc7f8150a0c71b2dafc610f590e70b3eda6';
export const researchContractSha256 = '525b4b6d7daa9274db6a108f25e7bef9f397138899468c4fe01f09d1603f9313';


const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const hashValue = value => sha(Buffer.from(canonical(value)));
const same = (left, right) => canonical(left) === canonical(right);
const fail = message => { throw new Error(`Invalid next-native monetary source-question projection: ${message}`); };

function assertNativeCurrentMonetaryIndexDependencies(repoRoot, index) {
  if (!Array.isArray(index?.inputArtifacts) || !Array.isArray(index?.currentInputValidation?.validationArtifacts)) fail('actual current monetary index dependency arrays are missing');
  for (const ref of [...index.inputArtifacts, ...index.currentInputValidation.validationArtifacts]) {
    safeRepoPath(ref?.path);
    const bytes = readBytes(resolve(repoRoot), ref.path);
    if (!/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') || sha(bytes) !== ref.sha256) fail(`actual current monetary index dependency arrays contain a missing/stale pin for ${ref.path}`);
  }
  return true;
}

function safeRepoPath(path) {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) fail(`unsafe repository path ${path}`);
  return path;
}

function readBytes(repoRoot, path) {
  safeRepoPath(path);
  return readFileSync(resolve(repoRoot, path));
}

function readJson(repoRoot, path) {
  const bytes = readBytes(repoRoot, path);
  try { return {bytes, data: JSON.parse(bytes.toString('utf8'))}; }
  catch { fail(`invalid JSON ${path}`); }
}

function pointerValue(value, pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) fail('current audit target has no JSON pointer');
  return pointer.split('/').slice(1).reduce((node, rawPart) => {
    const part = rawPart.replaceAll('~1', '/').replaceAll('~0', '~');
    return node === null || node === undefined ? undefined : node[part];
  }, value);
}

function semanticProjection(uid, raw) {
  const pick = keys => Object.fromEntries(keys.map(key => [key, Object.hasOwn(raw, key) ? raw[key] : null]));
  if (uid === 'source-census-claim:mm-mammoth-tusks-relative') {
    const derivation = raw.valuationDerivation ?? {};
    return {
      id: raw.id ?? null,
      sourceObjectOrPassage: raw.sourceObjectOrPassage ?? null,
      passageIdentity: raw.passageIdentity ?? null,
      claimType: raw.claimType ?? null,
      amountOrFormula: raw.amountOrFormula ?? null,
      currency: raw.currency ?? null,
      unit: raw.unit ?? null,
      conditions: raw.conditions ?? null,
      sourceReviewStatus: raw.sourceReviewStatus ?? null,
      interpretationStatus: raw.interpretationStatus ?? null,
      notes: raw.notes ?? null,
      valuationDerivation: {
        kind: derivation.kind ?? null,
        factor: derivation.factor ?? null,
        increasePercentage: derivation.increasePercentage ?? null,
        relation: derivation.relation ?? null,
        baseline: derivation.baseline ?? null,
        derivedRange: derivation.derivedRange ?? null,
        formula: derivation.formula ?? null,
        printedAsRange: derivation.printedAsRange ?? null,
        isSourcePrinted: derivation.isSourcePrinted ?? null,
        sourceDependencies: (derivation.sourceDependencies ?? []).map(row => ({book: row.book, printedPage: row.printedPage, pdfPage: row.pdfPage, sourcePdfSha256: row.sourcePdfSha256 ?? row.sourceSha256 ?? null, role: row.role})),
        sourceProofs: derivation.sourceProofs ?? [],
      },
    };
  }
  if (uid.startsWith('source-census-claim:')) {
    return pick(['sourceObject', 'claimType', 'printedValue', 'formula', 'currency', 'unit', 'conditions', 'sourcePassage', 'notes']);
  }
  if (uid.startsWith('ua-supplement-row:')) {
    return {
      ...pick(['recordId', 'object', 'variant', 'classification', 'values', 'quantityCondition', 'footnoteMarkers', 'sourceRowIdentity', 'footnoteConditions']),
      sourceNoteDefinitionLinks: (raw.sourceNoteDefinitionLinks ?? []).map(link => ({
        definitionId: link.definitionId,
        marker: link.marker,
        kind: link.kind,
        sourceSegmentId: link.sourceSegmentId,
        rowMarkerJoin: link.rowMarkerJoin ?? null,
      })),
      sourceNoteDefinitionJoinStatus: raw.sourceNoteDefinitionJoinStatus ?? null,
    };
  }
  if (uid.startsWith('phb-dmg-supplement-row:')) {
    return pick(['sourceRowOrClaimId', 'groupId', 'sourceKind', 'objectOrSubject', 'typedValue', 'purpose', 'quantityOrScale', 'conditions', 'rowOrPassageIdentity']);
  }
  fail(`no bounded semantic projection for ${uid}`);
}

function questionIdForUid(contract, uid) {
  const historical = contract.historicalBoundary.questionRecords.find(row => row.uid === uid);
  if (historical) return historical.id;
  for (const question of contract.scopeBoundary.questions) if (question.uids.includes(uid)) return question.id;
  fail(`unexpected question target ${uid}`);
}

function assertTargetSourceProvenance(row, expected) {
  if (!same(row?.source, expected?.sourceProvenance)) fail(`${expected?.uid}: exact source provenance (including source SHA) changed`);
  if (!same({book: row.source?.book, printedPage: row.source?.printedPage, pdfPage: row.source?.pdfPage}, expected.source)) fail(`${expected.uid}: source locator changed`);
  return true;
}

function assertTargetSemanticProjection(uid, raw, expected) {
  const semantics = semanticProjection(uid, raw);
  const semanticSha256 = hashValue(semantics);
  if (!same(semantics, expected.semanticProjection) || semanticSha256 !== expected.semanticSha256) fail(`${uid}: question-related typed/context/source identity semantics changed`);
  return {semantics, semanticSha256};
}

function auditTarget(repoRoot, audit, expected, nativeRefs) {
  if (typeof expected.inputPath !== 'string' || typeof expected.pointer !== 'string'
      || !expected.pointer.startsWith('/') || !expected.inputPath || expected.inputPath.startsWith('/')
      || expected.inputPath.includes('\\') || expected.inputPath.split('/').some(part => !part || part === '.' || part === '..')) {
    fail(`${expected.uid}: exact contract source path/pointer are missing or unsafe`);
  }
  const matches = audit.records.filter(row => row.uid === expected.uid);
  if (matches.length !== 1) fail(`${expected.uid}: expected one current audit target, received ${matches.length}`);
  const row = matches[0];
  if (row.surface !== expected.surface || row.label !== expected.label || row.input !== expected.inputPath
      || row.pointer !== expected.pointer || !same(row.identity, expected.identity)) {
    fail(`${expected.uid}: current audit row identity or source locator changed`);
  }
  assertTargetSourceProvenance(row, expected);
  const inputBytes = readBytes(repoRoot, row.input);
  const inputSha256 = sha(inputBytes);
  if (inputSha256 !== row.inputSha256) fail(`${expected.uid}: current audit input hash is stale`);
  const raw = pointerValue(JSON.parse(inputBytes.toString('utf8')), row.pointer);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || hashValue(raw) !== row.recordSha256) fail(`${expected.uid}: current audit pointer does not resolve to its exact record`);
  const {semantics, semanticSha256} = assertTargetSemanticProjection(row.uid, raw, expected);
  if (hashValue({source: row.source, identity: row.identity}) !== row.rowIdentitySha256) fail(`${expected.uid}: current audit row-identity fingerprint is internally inconsistent`);
  nativeRefs.set(row.input, {path: row.input, sha256: inputSha256});
  return {
    row,
    raw,
    targetRef: {uid: row.uid, path: row.input, sha256: inputSha256, pointer: row.pointer, recordSha256: row.recordSha256, rowIdentitySha256: row.rowIdentitySha256, label: row.label, sourceProvenance: row.source, identity: row.identity, semanticSha256},
  };
}

function assertQuestionContractInheritance(repoRoot, contract) {
  const parentRef = contract.semanticParent;
  if (parentRef?.path !== 'research/mm-current-cli-successors-v1/native-monetary-question-contract-mm-v1.json'
      || parentRef.sha256 !== 'ea2d5e14901c2a9c91265bc8093f786bd434e898c9da8257887719ae01f5452d') {
    fail('fixed MM source-question semantic parent reference changed');
  }
  const bytes = readBytes(repoRoot, parentRef.path);
  if (sha(bytes) !== parentRef.sha256) fail('fixed MM question semantic parent bytes changed');
  const parent = JSON.parse(bytes.toString('utf8'));
  for (const key of ['baseline','historicalBoundary','scopeBoundary','targetSemanticContract',
    'sealedHistoricalArtifacts','dispositions','historicalRegister']) {
    if (!same(contract[key], parent[key])) fail(`next-native source-question contract changed inherited ${key}`);
  }
}

function assertSealedHistoricalArtifacts(repoRoot, contract) {
  if (!Array.isArray(contract.sealedHistoricalArtifacts) || contract.sealedHistoricalArtifacts.length !== 13) fail('closed historical artifact pins are missing');
  for (const ref of contract.sealedHistoricalArtifacts) {
    if (!/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') || sha(readBytes(repoRoot, ref.path)) !== ref.sha256) fail(`closed historical artifact changed: ${ref.path}`);
  }
  const oldRegistry = readJson(repoRoot, 'research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json').data;
  if (!same(contract.dispositions, oldRegistry.dispositions) || !same(contract.historicalRegister, oldRegistry.historicalRegister)) fail('additive registry does not preserve the exact closed disposition payload and history reference');
}

function assertBaseline(baseline, contract, baselineBytes) {
  if (sha(baselineBytes) !== contract.baseline.sha256 || sha(baselineBytes) !== historicalBaselineSha256) fail('V29 actual producer baseline bytes changed');
  if (baseline.schemaVersion !== 1 || baseline.baselineCommit !== contract.baseline.baselineCommit
      || baseline.status !== 'Actual released Version29 producer output before new source/metadata activation'
      || baseline.value?.artifactType !== 'current-monetary-source-question-projection'
      || baseline.value?.semanticPass !== false || baseline.value?.generalSourceReviewPending !== true) fail('historical V29 projection is not the declared semantic baseline');
  if (!same(baseline.value.records.map(row => ({id: row.id, uid: row.uid, currentDisposition: row.currentDisposition, questionSha256: hashValue(row.historicalQuestion)})), contract.historicalBoundary.questionRecords)) fail('historical question identity/order changed');
  if (!same(baseline.value.sourceQuestions.slice(0, 7).map(row => row.id), contract.historicalBoundary.unresolvedInterpretationQuestionIds)) fail('historical unresolved interpretation boundary changed');
  if (!same(baseline.value.sourceQuestions.slice(7).map(row => row.id), contract.scopeBoundary.questions.map(row => row.id))) fail('independent scope-question boundary changed');
}

function actualInputRefs(repoRoot, audit, targets, epochReceipt) {
  const refs = new Map();
  for (const row of audit.inputManifest ?? []) {
    const bytes = readBytes(repoRoot, row.path), actualSha = sha(bytes);
    if (actualSha !== row.sha256) fail(`current audit input manifest is stale: ${row.path}`);
    refs.set(row.path, {path: row.path, sha256: actualSha});
  }
  for (const path of ['research/price-source-inventory.json', 'research/monetary-source-inventory.json']) {
    const bytes = readBytes(repoRoot, path);
    refs.set(path, {path, sha256: sha(bytes)});
  }
  for (const [path, expectedSha] of Object.entries(epochReceipt.sourceRawInputs)) {
    const bytes = readBytes(repoRoot, path);
    if (sha(bytes) !== expectedSha) fail(`native source-body input changed after qualification: ${path}`);
    refs.set(path, {path, sha256: expectedSha});
  }
  for (const target of targets) refs.set(target.path, {path: target.path, sha256: target.sha256});
  return [...refs.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function assertNextNativeSourceEpoch(assertSourceEpoch) {
  if (typeof assertSourceEpoch !== 'function') fail('no-argument native class-source epoch gate is required');
  const checked = assertSourceEpoch();
  const summary = checked?.summary, inputs = checked?.inputs, hashes = checked?.inputHashes;
  const bodyPins = hashes?.sourceBody;
  if (!summary || summary.stage !== 's1-body-native' || !summary.sourceCommit || !summary.sourceTree
      || !inputs || !inputs.data || !inputs.inventory || !inputs.manual || !inputs.mechanics
      || !bodyPins || !Object.keys(bodyPins).length
      || Object.entries(bodyPins).some(([path, digest]) => !/^[a-f0-9]{64}$/.test(digest || '') || !path)) {
    fail('closed, physically fresh native S1 current source-body cohort is required');
  }
  return {
    status: 'qualified-native-class-source-body-epoch',
    sourceCommit: summary.sourceCommit,
    sourceTree: summary.sourceTree,
    baselineCommit: null,
    baselineAncestorOfSource: null,
    sourceAncestorOfCurrentHead: null,
    requiredSourceRawPaths: Object.keys(bodyPins).sort(),
    cohortContract: summary.fixture,
    sourceRawInputs: Object.fromEntries(Object.entries(bodyPins).sort(([a], [b]) => a.localeCompare(b))),
    selectedAdditionalInputs: hashes.qualificationMetadata || {},
    cohortSummary: summary,
  };
}

function assertPlainJson(value, label) {
  const active = new Set();
  function visit(node) {
    if (node === null || typeof node === 'string' || typeof node === 'boolean') return true;
    if (typeof node === 'number') return Number.isFinite(node) && !Object.is(node, -0);
    if (typeof node !== 'object' || types.isProxy(node) || active.has(node)) return false;
    const array = Array.isArray(node), prototype = Object.getPrototypeOf(node);
    if (prototype !== (array ? Array.prototype : Object.prototype)
        || Object.getPrototypeOf(Object.prototype) !== null
        || Object.hasOwn(Object.prototype, 'toJSON') || Object.hasOwn(Array.prototype, 'toJSON')) return false;
    active.add(node);
    const keys = Reflect.ownKeys(node);
    if (array && (keys.length !== node.length + 1 || !keys.includes('length'))) return false;
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
}

function buildProjection({repoRoot, contract, baseline, baselineBytes, contractBytes, loadAudit, audit: suppliedAudit, assertSourceEpoch}) {
  const qualifiedStage = assertSourceEpoch();
  const epochReceipt = assertNextNativeSourceEpoch(() => qualifiedStage);
  assertQuestionContractInheritance(repoRoot, contract);
  const binding = contract.nativeSourceEpochBinding;
  const s2RegistryPin = qualifiedStage.consumerPins?.contractPins?.[currentSourceQuestionRegistryPath];
  if (s2RegistryPin !== sha(contractBytes) || contract.artifactType !== 'Native class-source epoch monetary source-question contract (semantic successor of MM contract)'
      || contract.activationEligible !== true || contract.status !== 'qualified native S1 source-question targets; awaiting general source review'
      || binding?.materialized !== true || binding.sourceCommit !== epochReceipt.sourceCommit
      || binding.sourceTree !== epochReceipt.sourceTree || binding.fixturePath !== epochReceipt.cohortContract?.path
      || binding.fixtureSha256 !== epochReceipt.cohortContract?.sha256) {
    fail('next-native question contract must be S2-pinned to this exact qualified S1 body and fixture');
  }
  assertBaseline(baseline, contract, baselineBytes);
  assertSealedHistoricalArtifacts(repoRoot, contract);
  const audit = suppliedAudit ?? loadAudit({repoRoot});
  if (!audit || !Array.isArray(audit.records) || !Array.isArray(audit.knownFindings) || !Array.isArray(audit.retainedUncertainties)) fail('actual current monetary row audit is required');
  if (audit.validation?.semanticRowIdentityComplete !== false) fail('row audit policy flags changed');
  if (audit.retainedUncertainties.length !== 8 || !same(audit.retainedUncertainties.map(row => row.id), contract.historicalBoundary.questionRecords.map(row => row.id))) fail('current audit must retain the exact eight historical monetary uncertainties');
  const retainedById = new Map(audit.retainedUncertainties.map(row => [row.id, row]));
  const targetRefs = new Map(), nativeRefs = new Map(), targetsByUid = new Map();
  for (const target of contract.targetSemanticContract.targets) {
    const current = auditTarget(repoRoot, audit, target, nativeRefs);
    targetRefs.set(target.uid, current.targetRef);
    targetsByUid.set(target.uid, current);
  }
  for (const history of contract.historicalBoundary.questionRecords) {
    const retained = retainedById.get(history.id);
    if (!retained || retained.uid !== history.uid || !['retained-unresolved-source-question', 'record-changed-question-remains-unresolved'].includes(retained.status)) fail(`${history.id}: current audit no longer records this question as unresolved`);
  }
  const scopeFindings = new Map();
  for (const scope of contract.scopeBoundary.questions) {
    const matches = audit.knownFindings.filter(row => row.id === scope.id && row.kind === 'unresolved-source-scope');
    if (matches.length !== 1) fail(`${scope.id}: current audit does not contain exactly one unresolved source-scope target`);
    const finding = matches[0];
    if (finding.semanticPass !== false || finding.underlyingSourceQuestion?.status !== 'unresolved'
        || !same(finding.records?.map(row => row.uid), scope.uids)) fail(`${scope.id}: source-scope question or affected row boundary changed`);
    scopeFindings.set(scope.id, finding);
  }
  const raw = readJson(repoRoot, 'research/price-source-inventory-monster-books.json').data;
  const receipts = readJson(repoRoot, 'research/source-audit-batch5-price-discovery-reconciliation.json').data;
  const canonicalInventory = readJson(repoRoot, 'research/price-source-inventory.json').data;
  const index = readJson(repoRoot, 'research/monetary-source-inventory.json').data;
  assertNativeCurrentMonetaryIndexDependencies(repoRoot, index);
  const mammothTarget = targetsByUid.get('source-census-claim:mm-mammoth-tusks-relative');
  const mammothClaim = index.claims?.find(row => row.claimId === 'price-discovery:mm-mammoth-tusks-relative#/typedClaim');
  const expectedMammoth = baseline.value.records.find(row => row.id === 'relative-monetary-reading-mm-mammoth-tusks-relative');
  if (!mammothTarget || !mammothClaim?.valueSemantics || !same(mammothClaim.valueSemantics, expectedMammoth.derivedValue)
      || mammothClaim.valueSemantics.kind !== 'range' || mammothClaim.valueSemantics.minimumAmount !== 150
      || mammothClaim.valueSemantics.maximumAmount !== 900 || mammothClaim.valueSemantics.currency !== 'gp'
      || mammothClaim.valueSemantics.unit !== 'per tusk' || mammothClaim.valueSemantics.isSourcePrinted !== false
      || mammothClaim.valueSemantics.printedAsRange !== false || mammothClaim.valueSemantics.derivation?.factor !== 1.5
      || mammothClaim.valueSemantics.derivationStatus !== 'source-backed-derived-interpretation') fail('current monetary index no longer has the bounded Mammoth derived valuation');
  const mammothRaw = raw.claims?.[18];
  const receipt = receipts.claimReceipts?.find(row => row.receiptId === 'mm-mammoth-tusks-relative');
  const currentMammothTypedClaim = Object.fromEntries(['amountOrFormula', 'currency', 'unit', 'conditions', 'valuationDerivation'].map(key => [key, mammothRaw?.[key]]));
  const canonicalMammoth = canonicalInventory.sourcePageCensuses?.find(row => row.id === 'monster-books')?.sourceArtifact;
  if (mammothTarget.row.pointer !== '/claims/18' || mammothTarget.row.input !== 'research/price-source-inventory-monster-books.json'
      || !same(canonicalMammoth, raw) || !same(receipt?.typedClaim, currentMammothTypedClaim)) fail('current Mammoth raw/canonical/receipt mirror changed');
  const mammothReview = baseline.value.records.find(row => row.id === 'relative-monetary-reading-mm-mammoth-tusks-relative')?.integrationReview;
  if (!mammothReview || sha(readBytes(repoRoot, mammothReview.path)) !== mammothReview.sha256) fail('bounded independent Mammoth integration review is stale');
  const allTargetRefs = [...targetRefs.values()].sort((a, b) => a.uid.localeCompare(b.uid));
  if (allTargetRefs.length !== 17) fail('all eight historical and nine scope audit targets are required');
  const currentInputs = actualInputRefs(repoRoot, audit, allTargetRefs, epochReceipt);
  const canonicalRef = currentInputs.find(ref => ref.path === 'research/price-source-inventory.json');
  const indexRef = currentInputs.find(ref => ref.path === 'research/monetary-source-inventory.json');
  if (!canonicalRef || !indexRef) fail('current canonical and monetary index refs are missing');
  const auditRefs = (audit.inputManifest ?? []).map(ref => ({path: ref.path, sha256: ref.sha256}));
  const nextRecords = baseline.value.records.map(old => {
    const target = targetsByUid.get(old.uid), retained = retainedById.get(old.id);
    if (!target || !retained || old.historicalQuestionSha256 !== hashValue(old.historicalQuestion)) fail(`${old.id}: historical question record mismatch`);
    if (old.currentDisposition === 'unresolved-source-question' && retained.status === 'retained-unresolved-source-question'
        && target.row.recordSha256 !== old.currentRecordSha256 && target.row.recordSha256 === old.beforeRecordSha256) fail(`${old.id}: unexpected audit rollback to the original before-record`);
    return {
      ...structuredClone(old),
      currentRecordSha256: target.row.recordSha256,
      currentRowIdentitySha256: target.row.rowIdentitySha256,
      legacyAdapterStatus: retained.status,
      currentTargetRef: targetRefs.get(old.uid),
      semanticPass: false,
      ...(old.id === expectedMammoth.id ? {derivedValue: mammothClaim.valueSemantics, printedValuePass: false} : {}),
    };
  });
  const sourceQuestions = baseline.value.sourceQuestions.slice(0, 7).map(old => {
    const target = targetsByUid.get(old.uid), currentRef = targetRefs.get(old.uid);
    if (!target || old.status !== 'unresolved' || old.semanticPass !== false || old.currentDisposition !== 'unresolved-source-question') fail(`${old.id}: interpretation question changed`);
    return {...structuredClone(old), currentRecordSha256: target.row.recordSha256, currentRowIdentitySha256: target.row.rowIdentitySha256, currentTargetRef: currentRef};
  });
  for (const old of baseline.value.sourceQuestions.slice(7)) {
    const scope = contract.scopeBoundary.questions.find(row => row.id === old.id), finding = scopeFindings.get(old.id);
    const affectedAuditRows = finding.records.map(row => {
      const target = targetsByUid.get(row.uid);
      if (!target) fail(`${old.id}: audit finding refers to an unregistered current target ${row.uid}`);
      return {uid: row.uid, recordSha256: target.row.recordSha256, rowIdentitySha256: target.row.rowIdentitySha256};
    });
    if (!scope || old.status !== 'unresolved' || old.semanticPass !== false || !same(affectedAuditRows.map(row => row.uid), scope.uids)) fail(`${old.id}: source-scope question changed`);
    sourceQuestions.push({...structuredClone(old), affectedAuditRows, currentTargetRefs: scope.uids.map(uid => targetRefs.get(uid))});
  }
  const baselineRef = {path: historicalProjectionBaselinePath, sha256: contract.baseline.sha256};
  const contractRef = {path: currentSourceQuestionRegistryPath, sha256: sha(contractBytes)};
  const historicalRefs = [...contract.sealedHistoricalArtifacts.map(ref => ({path: ref.path, sha256: ref.sha256})), ...auditRefs, ...currentInputs, baselineRef, contractRef];
  const inputMap = new Map(historicalRefs.map(ref => [ref.path, ref]));
  inputMap.set(epochReceipt.cohortContract.path, epochReceipt.cohortContract);
  const projection = {
    ...structuredClone(baseline.value),
    registry: contractRef,
    sourceQuestions,
    records: nextRecords,
    currentInputs: {
      canonical: canonicalRef,
      monetaryIndex: indexRef,
      rowAudit: {generatedBy: audit.generatedBy, inputManifest: auditRefs, currentTargetRefs: allTargetRefs},
      nativeSourceEpoch: epochReceipt,
    },
    inputs: [...inputMap.values()].sort((a, b) => a.path.localeCompare(b.path)),
    semanticPass: false,
    generalSourceReviewPending: true,
    questionCounts: {currentInterpretationQuestions: 7, independentSourceScopeQuestions: 2, distinctScopeRows: 9, currentUnresolvedQuestions: 9},
  };
  if (!same(projection.sourceQuestions.map(row => row.id), [...contract.historicalBoundary.unresolvedInterpretationQuestionIds, ...contract.scopeBoundary.questions.map(row => row.id)])
      || !same(projection.records.map(row => row.id), contract.historicalBoundary.questionRecords.map(row => row.id))
      || projection.semanticPass !== false || projection.generalSourceReviewPending !== true) fail('current successor output boundary changed');
  return projection;
}

function createNextNativeMonetaryQuestionSuccessor({repoRoot, contract, contractBytes, baseline, baselineBytes, loadAudit, assertSourceEpoch, expectedContractSha256 = researchContractSha256} = {}) {
  if (!repoRoot || !contract || !baseline || typeof loadAudit !== 'function'
      || typeof assertSourceEpoch !== 'function' || !Buffer.isBuffer(contractBytes) || types.isProxy(contractBytes)
      || !Buffer.isBuffer(baselineBytes) || types.isProxy(baselineBytes)) fail('factory requires the exact next-native registry and historical baseline bytes, audit loader, and no-argument native gate');
  assertPlainJson(contract, 'factory contract');
  assertPlainJson(baseline, 'factory baseline');
  if (expectedContractSha256 !== researchContractSha256 || sha(contractBytes) !== researchContractSha256) {
    fail('factory requires the repository-pinned next-native contract digest');
  }
  const contractCopy = Buffer.from(contractBytes), baselineCopy = Buffer.from(baselineBytes);
  const pinnedContract = JSON.parse(contractCopy.toString('utf8'));
  const pinnedBaseline = JSON.parse(baselineCopy.toString('utf8'));
  if (!same(contract, pinnedContract) || !same(baseline, pinnedBaseline) || sha(baselineCopy) !== historicalBaselineSha256) fail('supplied next-native registry or historical baseline differs from its pinned bytes');
  const root = resolve(repoRoot);
  function loadCurrentMonetarySourceQuestions(...args) {
    if (args.length) fail('installed next-native question adapter accepts no caller overrides');
    return buildProjection({repoRoot: root, contract: pinnedContract, contractBytes: contractCopy,
      baseline: pinnedBaseline, baselineBytes: baselineCopy, loadAudit, assertSourceEpoch});
  }
  function validateCurrentMonetarySourceQuestionProjection(...args) {
    if (args.length !== 1) fail('projection validation accepts exactly one projection');
    const [projection] = args;
    assertPlainJson(projection, 'caller projection');
    const expected = loadCurrentMonetarySourceQuestions();
    if (!same(projection, expected)) fail('projection does not equal the exact next-native question targets, source epoch, and refs');
    return true;
  }
  function buildNextNativeMigrationProof(...args) {
    if (args.length !== 1) fail('migration proof requires one freshly built next-native projection');
    assertPlainJson(args[0], 'migration proof options');
    if (!Object.hasOwn(args[0], 'projection')) fail('migration proof requires one freshly built next-native projection');
    const {projection} = args[0];
    assertPlainJson(projection, 'migration proof projection');
    const rebuilt = loadCurrentMonetarySourceQuestions();
    if (!same(projection, rebuilt)) fail('migration proof must bind the freshly validated next-native projection');
    return {
      schemaVersion: 1,
      artifactType: 'next-native monetary-question provenance and target-preservation proof',
      status: 'native-source-body-question-projection-validated-awaiting-general-review',
      sourceInputCommit: projection.currentInputs.nativeSourceEpoch.sourceCommit,
      sourceInputTree: projection.currentInputs.nativeSourceEpoch.sourceTree,
      successorRegistry: projection.registry,
      sourceEpoch: projection.currentInputs.nativeSourceEpoch,
      historicalBaseline: {path: historicalProjectionBaselinePath, sha256: pinnedContract.baseline.sha256, baselineCommit: pinnedContract.baseline.baselineCommit},
      historicalRegistry: pinnedContract.baseline.exactProjectionRegistry,
      sealedHistoricalArtifacts: pinnedContract.sealedHistoricalArtifacts,
      currentInputs: projection.currentInputs,
      currentTargetRefs: projection.currentInputs.rowAudit.currentTargetRefs,
      targetSemanticSha256: pinnedContract.targetSemanticContract.targets.map(row => ({uid: row.uid, sha256: row.semanticSha256})),
      dispositions: {historicalRegisteredQuestions: 8, unresolvedHistoricalInterpretationQuestions: 7, sourceBackedDerivedInterpretations: 1, independentUnresolvedScopeQuestions: 2, unresolvedScopeRows: 9, semanticPass: false, generalSourceReviewPending: true},
      proofBoundary: {questionTargetSemanticsPreserved: true, wholeInventorySemanticsCertified: false, sourceValuesApproved: false, sourceScopeQuestionsResolved: false, sourceQuestionTargetChangesAllowed: false},
      blockers: [],
    };
  }
  return {currentSourceQuestionRegistryPath, loadCurrentMonetarySourceQuestions, validateCurrentMonetarySourceQuestionProjection, buildNextNativeMigrationProof};
}

// The installed public factory has no root, audit-loader, or gate injection
// points. Its private semantic factory above is bound to the installed repo,
// real audit producer, and zero-argument S2/native qualification stage.
export function createCurrentNativeMonetaryQuestionSuccessor(...args) {
  if (args.length) fail('installed next-native question factory accepts no caller overrides');
  const repoRoot = currentConsumerRepoRoot;
  const contractBytes = readBytes(repoRoot, currentSourceQuestionRegistryPath);
  const baselineBytes = readBytes(repoRoot, historicalProjectionBaselinePath);
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const baseline = JSON.parse(baselineBytes.toString('utf8'));
  return createNextNativeMonetaryQuestionSuccessor({
    repoRoot, contract, contractBytes, baseline, baselineBytes,
    loadAudit: () => loadMonetaryRowIdentityAudit({repoRoot}),
    assertSourceEpoch: qualifyCurrentConsumerStage,
    expectedContractSha256: researchContractSha256,
  });
}
