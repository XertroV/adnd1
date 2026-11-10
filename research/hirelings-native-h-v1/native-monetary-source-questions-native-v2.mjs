// Research-only native-HIRED successor kernel. The old V29 loader and all closed
// registries/proofs remain unchanged. The caller injects the live audit loader;
// this kernel never sends V29 projected data to the historical loader.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

export const currentSourceQuestionRegistryPath = 'research/hirelings-native-h-v1/native-monetary-question-contract-v2.json';
export const historicalProjectionBaselinePath = 'research/hirelings-current-next-batch-v1/native-monetary-successor-v2/version29-monetary-questions-actual-projection-baseline-v2.json';
export const historicalBaselineSha256 = 'c220e9a5d4ef6d53d671df0ecf947fc7f8150a0c71b2dafc610f590e70b3eda6';
export const researchContractSha256 = '3524eb99e7721b0df2638765da7eaaabd7fe12e496b3c779082b19476ab0629a';
export const nativeSourceRawPaths = Object.freeze([
  'dist/data.json',
  'research/price-source-inventory.json',
  'research/field-evidence-bindings.json',
  'equipment.json',
  'rules.json',
  'dist/books.js',
  'dist/app.js',
  'dist/source-viewer.js',
]);

const DEVELOPMENT_EPOCH_FIXTURE_PATH = 'research/hirelings-current-next-batch-v1/native-monetary-successor-v2/version29-native-source-epoch-fixture-v2.json';
const DEVELOPMENT_EPOCH_FIXTURE_URL = new URL('../hirelings-current-next-batch-v1/native-monetary-successor-v2/version29-native-source-epoch-fixture-v2.json', import.meta.url);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const hashValue = value => sha(Buffer.from(canonical(value)));
const same = (left, right) => canonical(left) === canonical(right);
const fail = message => { throw new Error(`Invalid native monetary source-question successor: ${message}`); };

export function assertNativeCurrentMonetaryIndexDependencies(repoRoot, index) {
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

export function semanticProjection(uid, raw) {
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

export function assertTargetSourceProvenance(row, expected) {
  if (!same(row?.source, expected?.sourceProvenance)) fail(`${expected?.uid}: exact source provenance (including source SHA) changed`);
  if (!same({book: row.source?.book, printedPage: row.source?.printedPage, pdfPage: row.source?.pdfPage}, expected.source)) fail(`${expected.uid}: source locator changed`);
  return true;
}

export function assertTargetSemanticProjection(uid, raw, expected) {
  const semantics = semanticProjection(uid, raw);
  const semanticSha256 = hashValue(semantics);
  if (!same(semantics, expected.semanticProjection) || semanticSha256 !== expected.semanticSha256) fail(`${uid}: question-related typed/context/source identity semantics changed`);
  return {semantics, semanticSha256};
}

function auditTarget(repoRoot, audit, expected, nativeRefs) {
  const matches = audit.records.filter(row => row.uid === expected.uid);
  if (matches.length !== 1) fail(`${expected.uid}: expected one current audit target, received ${matches.length}`);
  const row = matches[0];
  if (row.surface !== expected.surface || row.label !== expected.label || !same(row.identity, expected.identity)) {
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

function actualInputRefs(repoRoot, audit, targets) {
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
  for (const path of nativeSourceRawPaths) {
    const bytes = readBytes(repoRoot, path);
    refs.set(path, {path, sha256: sha(bytes)});
  }
  for (const target of targets) refs.set(target.path, {path: target.path, sha256: target.sha256});
  return [...refs.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function assertNativeSourceEpoch(repoRoot, epoch, {mode = 'native', gitRepoRoot = repoRoot, cohortBytes = null, execFileSyncImpl = execFileSync, readFileSyncImpl = readFileSync} = {}) {
  const expectedStatus = mode === 'native' ? 'finalized-native-source-epoch' : mode === 'development-parity' ? 'development-parity-only-nonactivating' : null;
  const cohortRef = epoch?.finalNativeCohortReceipt ?? epoch?.cohortContract;
  if (!expectedStatus || !epoch || epoch.status !== expectedStatus
      || !/^[a-f0-9]{40}$/.test(epoch.sourceCommit ?? '')
      || !/^[a-f0-9]{40}$/.test(epoch.sourceTree ?? '')
      || !/^[a-f0-9]{40}$/.test(epoch.baselineCommit ?? '')
      || !same(epoch.requiredSourceRawPaths, nativeSourceRawPaths)
      || !cohortRef || typeof cohortRef.path !== 'string'
      || !/^[a-f0-9]{64}$/.test(cohortRef.sha256 ?? '')) fail('closed native/development source epoch is unavailable or incomplete');
  if (epoch.baselineCommit !== '1f79d909344ebe7d41a432d8673f3eedb491fa3b') fail('source epoch has the wrong released V29 baseline');
  const root = resolve(repoRoot), gitRoot = resolve(gitRepoRoot);
  const gitRaw = (args, options = {}) => execFileSyncImpl('git', ['-C', gitRoot, ...args], {maxBuffer: 64 * 1024 * 1024, ...options});
  const gitText = args => {
    const value = gitRaw(args, {encoding: 'utf8'});
    if (!Buffer.isBuffer(value) && typeof value !== 'string') fail('git text command returned an invalid result');
    return String(value).trim();
  };
  const resolvedSource = gitText(['rev-parse', `${epoch.sourceCommit}^{commit}`]);
  const resolvedTree = gitText(['rev-parse', `${epoch.sourceCommit}^{tree}`]);
  const resolvedBaseline = gitText(['rev-parse', `${epoch.baselineCommit}^{commit}`]);
  const currentHeadForValidationOnly = gitText(['rev-parse', 'HEAD']);
  if (resolvedSource !== epoch.sourceCommit || resolvedTree !== epoch.sourceTree || resolvedBaseline !== epoch.baselineCommit) fail('source commit/tree or released baseline Git object identity');
  try { gitText(['merge-base', '--is-ancestor', epoch.baselineCommit, epoch.sourceCommit]); }
  catch { fail('released V29 baseline is not an ancestor of the source commit'); }
  try { gitText(['merge-base', '--is-ancestor', epoch.sourceCommit, currentHeadForValidationOnly]); }
  catch { fail('pinned source commit is not an ancestor of current HEAD'); }
  const expected = epoch.sourceRawInputs;
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)
      || !same(Object.keys(expected).sort(), [...nativeSourceRawPaths].sort())) fail('source epoch must pin exactly the eight native raw source paths');
  let exactCohortBytes = cohortBytes;
  if (mode === 'native') {
    safeRepoPath(cohortRef.path);
    exactCohortBytes = readFileSyncImpl(resolve(root, cohortRef.path));
  } else if (cohortRef.path !== DEVELOPMENT_EPOCH_FIXTURE_PATH) {
    fail('development mode must use only the closed actual V29 epoch fixture');
  }
  if (!Buffer.isBuffer(exactCohortBytes) || sha(exactCohortBytes) !== cohortRef.sha256) fail('closed native cohort/V29 fixture bytes are stale');
  let cohort;
  try { cohort = JSON.parse(exactCohortBytes.toString('utf8')); } catch { fail('closed cohort/fixture bytes are not JSON'); }
  const cohortBaseline = cohort.baseline?.baselineCommit ?? cohort.baselineCommit;
  if (cohort.sourceCommit !== epoch.sourceCommit || cohort.sourceTree !== epoch.sourceTree
      || cohortBaseline !== epoch.baselineCommit || !same(cohort.sourceRawInputs, expected)) fail('closed cohort/fixture does not bind this exact source epoch');
  const sourceRawInputs = {};
  for (const path of nativeSourceRawPaths) {
    if (!/^[a-f0-9]{64}$/.test(expected[path] ?? '')) fail(`missing source raw pin ${path}`);
    const current = readFileSyncImpl(resolve(root, safeRepoPath(path)));
    const committed = gitRaw(['show', `${epoch.sourceCommit}:${path}`]);
    if (!Buffer.isBuffer(committed)) fail(`Git blob reader did not preserve Buffer bytes for ${path}`);
    if (sha(current) !== expected[path] || sha(committed) !== expected[path]) fail(`raw source bytes differ from the exact closed epoch: ${path}`);
    sourceRawInputs[path] = expected[path];
  }
  // Do not serialize currentHeadForValidationOnly: post-epoch metadata commits
  // must not make an otherwise identical projection nondeterministic.
  return {status: epoch.status, sourceCommit: epoch.sourceCommit, sourceTree: epoch.sourceTree, baselineCommit: epoch.baselineCommit,
    baselineAncestorOfSource: true, sourceAncestorOfCurrentHead: true, requiredSourceRawPaths: [...nativeSourceRawPaths],
    cohortContract: {path: cohortRef.path, sha256: cohortRef.sha256}, sourceRawInputs};
}

export function verifyClosedEpochForResearchMutation({repoRoot, gitRepoRoot, contractBytes, expectedContractSha256 = researchContractSha256, execFileSyncImpl = execFileSync, readFileSyncImpl = readFileSync} = {}) {
  if (!Buffer.isBuffer(contractBytes) || sha(contractBytes) !== expectedContractSha256) fail('research guard mutation test must use exact closed V2 contract bytes');
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const epoch = contract.developmentParity?.developmentEpoch;
  const fixtureBytes = readFileSync(DEVELOPMENT_EPOCH_FIXTURE_URL);
  return assertNativeSourceEpoch(repoRoot, epoch, {mode: 'development-parity', gitRepoRoot, cohortBytes: fixtureBytes, execFileSyncImpl, readFileSyncImpl});
}

function buildProjection({repoRoot, gitRepoRoot, contract, baseline, baselineBytes, contractBytes, loadAudit, audit: suppliedAudit, mode}) {
  assertBaseline(baseline, contract, baselineBytes);
  assertSealedHistoricalArtifacts(repoRoot, contract);
  const historicalRegistryRef = contract.baseline.exactProjectionRegistry;
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
  let epochReceipt;
  if (mode === 'native') {
    if (contract.activationEligible !== true || contract.status !== 'ready-for-native-current-source-question-projection') fail('registry is still a research proposal and is not eligible for native input validation');
    epochReceipt = assertNativeSourceEpoch(repoRoot, contract.nativeSourceEpoch, {mode: 'native', gitRepoRoot});
  } else if (mode === 'development-parity') {
    if (contract.developmentParity?.repositoryStatus !== 'actual Version 29 current development worktree; no HIRED source activation') fail('V29 development parity mode was not explicitly declared');
    if (contract.developmentParity.sourceCommit !== contract.developmentParity.developmentEpoch?.sourceCommit
        || contract.developmentParity.sourceTree !== contract.developmentParity.developmentEpoch?.sourceTree
        || !same(contract.developmentParity.epochFixture, contract.developmentParity.developmentEpoch?.cohortContract)) fail('V29 development parity is not bound to its exact closed source fixture');
    const fixtureBytes = readFileSync(DEVELOPMENT_EPOCH_FIXTURE_URL);
    epochReceipt = assertNativeSourceEpoch(repoRoot, contract.developmentParity.developmentEpoch, {mode: 'development-parity', gitRepoRoot, cohortBytes: fixtureBytes});
    for (const [path, expectedSha] of Object.entries(contract.developmentParity.currentInputHashes)) {
      if (sha(readBytes(repoRoot, path)) !== expectedSha) fail(`development parity input changed since capture: ${path}`);
    }
  } else fail('unknown execution mode');

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
  const currentInputs = actualInputRefs(repoRoot, audit, allTargetRefs);
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

export function createNativeMonetarySourceQuestionSuccessor({repoRoot, contract, contractBytes, baseline, baselineBytes, loadAudit, expectedContractSha256 = researchContractSha256, developmentGitRoot = repoRoot}) {
  if (!repoRoot || !contract || !contractBytes || !baseline || !baselineBytes || typeof loadAudit !== 'function'
      || !/^[a-f0-9]{64}$/.test(expectedContractSha256 ?? '') || sha(contractBytes) !== expectedContractSha256) fail('factory requires repoRoot, exact pinned contract/baseline bytes, and live audit loader');
  const contractCopy = Buffer.from(contractBytes), baselineCopy = Buffer.from(baselineBytes);
  const pinnedContract = JSON.parse(contractCopy.toString('utf8'));
  const pinnedBaseline = JSON.parse(baselineCopy.toString('utf8'));
  if (!same(contract, pinnedContract) || !same(baseline, pinnedBaseline) || sha(baselineCopy) !== historicalBaselineSha256) fail('supplied contract or historical baseline object differs from its pinned bytes');
  const root = resolve(repoRoot), devGitRoot = resolve(developmentGitRoot);
  const build = (mode, options = {}) => {
    if (Object.hasOwn(options, 'epochReceipt')) fail('epochReceipt overrides are forbidden; the registry contract is the sole source-epoch authority');
    return buildProjection({repoRoot: resolve(options.repoRoot ?? root), gitRepoRoot: mode === 'development-parity' ? resolve(options.gitRepoRoot ?? devGitRoot) : root,
      contract: pinnedContract, contractBytes: contractCopy, baseline: pinnedBaseline, baselineBytes: baselineCopy, loadAudit, mode, audit: options.audit});
  };
  function loadCurrentMonetarySourceQuestions(options = {}) {
    return build('native', options);
  }
  function loadVersion29DevelopmentParity(options = {}) {
    return build('development-parity', options);
  }
  function validateCurrentMonetarySourceQuestionProjection(projection, options = {}) {
    const expected = build(options.mode ?? 'native', options);
    if (!same(projection, expected)) fail('projection does not equal the exact current question targets and refs');
    return true;
  }
  function buildNativeMigrationProof({projection, mode = 'native'} = {}) {
    if (!projection) fail('a freshly built projection is required');
    const rebuilt = mode === 'development-parity' ? loadVersion29DevelopmentParity() : loadCurrentMonetarySourceQuestions();
    if (!same(projection, rebuilt)) fail('migration proof must bind the freshly validated projection');
    const targetRefs = projection.currentInputs.rowAudit.currentTargetRefs;
    const inputChanges = contract.developmentParity.currentInputHashes;
    return {
      schemaVersion: 1,
      artifactType: 'native HIRED monetary-question provenance and target-preservation proof',
      status: mode === 'development-parity' ? 'development-parity-only-nonactivating' : 'native-source-question-successor-validated-awaiting-review',
      sourceInputCommit: mode === 'native' ? projection.currentInputs.nativeSourceEpoch.sourceCommit : null,
      sourceInputTree: mode === 'native' ? projection.currentInputs.nativeSourceEpoch.sourceTree : null,
      successorRegistry: projection.registry,
      sourceEpoch: projection.currentInputs.nativeSourceEpoch,
      historicalBaseline: {path: historicalProjectionBaselinePath, sha256: contract.baseline.sha256, baselineCommit: contract.baseline.baselineCommit},
      historicalRegistry: contract.baseline.exactProjectionRegistry,
      sealedHistoricalArtifacts: contract.sealedHistoricalArtifacts,
      currentInputs: projection.currentInputs,
      currentTargetRefs: targetRefs,
      targetSemanticSha256: contract.targetSemanticContract.targets.map(row => ({uid: row.uid, sha256: row.semanticSha256})),
      developmentBeforeInputHashes: inputChanges,
      changedInputComparison: targetRefs.map(ref => {
        const before = contract.targetSemanticContract.targets.find(row => row.uid === ref.uid);
        return {uid: ref.uid, beforePath: before.inputPath, beforeInputSha256: before.inputSha256, currentPath: ref.path, currentInputSha256: ref.sha256, beforeRecordSha256: before.recordSha256, currentRecordSha256: ref.recordSha256, beforeRowIdentitySha256: before.rowIdentitySha256, currentRowIdentitySha256: ref.rowIdentitySha256, beforeSourceProvenance: before.sourceProvenance, currentSourceProvenance: ref.sourceProvenance, sourceProvenanceChanged: !same(before.sourceProvenance, ref.sourceProvenance), semanticBeforeSha256: before.semanticSha256, semanticCurrentSha256: ref.semanticSha256, semanticUnchanged: before.semanticSha256 === ref.semanticSha256};
      }),
      dispositions: {historicalRegisteredQuestions: 8, unresolvedHistoricalInterpretationQuestions: 7, sourceBackedDerivedInterpretations: 1, independentUnresolvedScopeQuestions: 2, unresolvedScopeRows: 9, semanticPass: false, generalSourceReviewPending: true},
      proofBoundary: {questionTargetSemanticsPreserved: true, wholeInventorySemanticsCertified: false, sourceValuesApproved: false, sourceScopeQuestionsResolved: false, sourceQuestionTargetChangesAllowed: false},
      blockers: mode === 'development-parity' ? ['This proof binds Version 29 development inputs only; no final HIRED source commit/tree/raw pins were available.'] : [],
    };
  }
  return {
    currentSourceQuestionRegistryPath,
    loadCurrentMonetarySourceQuestions,
    validateCurrentMonetarySourceQuestionProjection,
    loadVersion29DevelopmentParity,
    buildNativeMigrationProof,
  };
}
