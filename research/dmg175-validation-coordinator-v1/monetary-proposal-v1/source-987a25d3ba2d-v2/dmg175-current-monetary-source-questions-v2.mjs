// Proposed additive successor. The existing UA loader and sealed registry remain unchanged and closed.
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadMonetaryRowIdentityAudit, hash} from './monetary-row-identity-audit.mjs';
import {validateCurrentMonetarySourceQuestionProjection as validateLegacyProjection} from './monetary-current-source-questions.mjs';

export const currentSourceQuestionRegistryPath = 'research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json';
export const SUCCESSOR_REGISTRY_SHA256 = '56cd03c646e971adcd5f5240849b17606b9d07e2cc6b397a75cb75f7495efbe3';
export const SOURCE_INPUT_COMMIT = '987a25d3ba2dcac0940569a2afab73f775e38028';
export const SOURCE_INPUT_TREE = 'd7ac09ce9abe4ef94ae355a44b8e0c5ca6f74ea3';
export const PREDECESSOR_REGISTRY_PATH = 'research/source-audit-pass8-ua-source-current-monetary-source-questions-v1.json';
export const PREDECESSOR_REGISTRY_SHA256 = '864ae05ad5eab345e299a128b6b43c9a364bec7f9fee113ea409078c9afd4b0c';
export const OLD_LOADER_PATH = 'tools/monetary-current-source-questions.mjs';
export const OLD_LOADER_SHA256 = '72c9d2b1992ac0960cea8c3e8855a141339142b0ed32bfe194c933491948bc9e';
export const HISTORICAL_REGISTER_PATH = 'research/source-audit-batch5-monetary-retained-uncertainties.json';
export const HISTORICAL_REGISTER_SHA256 = '93c9547479b8632bc8631c83a5e5496118b3580f516aa2c4cbb2a5515d19ee00';
export const SCOPE_INTERPRETATION_PATH = 'research/source-audit-batch5-underlying-source-question-interpretation.json';
export const SCOPE_INTERPRETATION_SHA256 = '6afe2f5fcfade1febf0e1b85baeaea6583475accde94f26b53d4f8612650dbde';
export const PROOF_PATH = 'research/dmg175-source-metadata-v1/monetary-provenance-migration-proof-v1.json';
export const PROOF_SHA256 = '2a23bd6d7d9084e5b6f6ee61fd525b8d96ddae97499dac83d1e7252cad6f2a92';
export const EXPECTED_INTERPRETATION_IDS = Object.freeze([
  'relative-monetary-reading-ua-census-record-006',
  'relative-monetary-reading-ua-census-record-038',
  'uncertain-scimitar-marker-ua-other-008-H1-cont-r030',
  'uncertain-scimitar-marker-ua-other-008-H2-r070',
  'uncertain-scimitar-marker-ua-other-008-H2-r071',
  'uncertain-scimitar-marker-ua-other-008-H2-r072',
  'uncertain-scimitar-marker-ua-other-008-H2-r073',
]);
export const EXPECTED_SCOPE_ROWS = Object.freeze([
  {
    id: 'phb-dmg-commodity-adjustment-scope',
    interpretationKey: 'commodity',
    uids: Object.freeze([
      'phb-dmg-supplement-row:dmg-commodity-01',
      'phb-dmg-supplement-row:dmg-commodity-02',
      'phb-dmg-supplement-row:dmg-commodity-03',
      'phb-dmg-supplement-row:dmg-commodity-04',
      'phb-dmg-supplement-row:dmg-commodity-05',
      'phb-dmg-supplement-row:dmg-commodity-06',
      'phb-dmg-supplement-row:dmg-commodity-07',
      'phb-dmg-supplement-row:dmg-commodity-08',
    ]),
  },
  {
    id: 'phb-dmg-alchemist-discount-scope',
    interpretationKey: 'alchemist',
    uids: Object.freeze(['phb-dmg-supplement-row:dmg-potion-alchemist-discount']),
  },
]);
const OLD_HISTORICAL_IDS = Object.freeze([
  EXPECTED_INTERPRETATION_IDS[0], EXPECTED_INTERPRETATION_IDS[1],
  'relative-monetary-reading-mm-mammoth-tusks-relative',
  ...EXPECTED_INTERPRETATION_IDS.slice(2),
]);
const DEFAULT_ROOT = resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = message => { throw new Error(`Invalid DMG175 current monetary questions: ${message}`); };

function safeRepoPath(path) {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) fail('non-repository dependency path');
  return path;
}

function readRef(repoRoot, ref) {
  safeRepoPath(ref?.path);
  const bytes = readFileSync(resolve(repoRoot, ref.path));
  const actualSha = sha(bytes);
  if (actualSha !== ref.sha256) fail(`missing or stale input hash ${ref.path}`);
  return {bytes, data: JSON.parse(bytes), ref: {path: ref.path, sha256: actualSha}};
}

export function validateCurrentMonetaryIndexDependencies(repoRoot, index) {
  if (!Array.isArray(index?.inputArtifacts) || !Array.isArray(index?.currentInputValidation?.validationArtifacts)) fail('monetary index dependency arrays are missing');
  for (const ref of [...index.inputArtifacts, ...index.currentInputValidation.validationArtifacts]) {
    safeRepoPath(ref?.path);
    const bytes = readFileSync(resolve(repoRoot, ref.path));
    if (!/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') || sha(bytes) !== ref.sha256) fail(`missing or stale monetary index input hash ${ref.path}`);
  }
  return true;
}

function proofMatches(proof, registry) {
  const migration = registry.dmg175SourceInputMigration;
  if (proof?.schemaVersion !== 1
      || proof.artifactType !== 'bounded DMG175 monetary current-input provenance migration proof'
      || proof.sourceInputCommit !== SOURCE_INPUT_COMMIT
      || proof.sourceInputTree !== SOURCE_INPUT_TREE
      || proof.predecessorRegistry?.path !== PREDECESSOR_REGISTRY_PATH
      || proof.predecessorRegistry?.sha256 !== PREDECESSOR_REGISTRY_SHA256
      || proof.afterIndex?.sha256 !== registry.currentInputs.monetaryIndex.sha256
      || proof.afterCanonical?.sha256 !== registry.currentInputs.canonical.sha256
      || migration?.sourceInputCommit !== SOURCE_INPUT_COMMIT
      || proof.semanticPass !== false
      || proof.generalSourceReviewPending !== true
      || proof.wholePayloadProvenanceOnly !== true
      || proof.negativeControls?.allPassed !== true) fail('migration proof does not qualify this exact successor registry');
  return true;
}

function legacyProjection({repoRoot, registry, registryRef, detectorRef, historicalRef, beforeFixtureRef, beforeQuestionsRef, raw, receipts, canonical, index, integrationReviewRef, sourceProofRefs, legacyInputRefs, audit, proofRef, scopeRef}) {
  if (sha(readFileSync(resolve(repoRoot, OLD_LOADER_PATH))) !== OLD_LOADER_SHA256) fail('closed old monetary question loader changed');
  const historical = historicalRef.data;
  const before = beforeFixtureRef.data;
  const beforeQuestions = beforeQuestionsRef.data;
  if (historical.uncertainties?.length !== 8 || registry.dispositions?.length !== 8
      || !same(registry.dispositions.map(row => row.id), historical.uncertainties.map(row => row.id))
      || !same(historical.uncertainties.map(row => row.id), OLD_HISTORICAL_IDS)) fail('all eight historical questions must retain exact order and identities');
  if (audit.retainedUncertainties?.length !== 8 || beforeQuestions.records?.length !== 8
      || !same(beforeQuestions.records.map(row => row.uid), historical.uncertainties.map(row => row.uid))) fail('historical record inventory changed');

  const valueClaim = raw.claims?.[18];
  const mammothId = 'relative-monetary-reading-mm-mammoth-tusks-relative';
  if (valueClaim?.id !== 'mm-mammoth-tusks-relative'
      || hash(before.claim) !== historical.uncertainties.find(row => row.id === mammothId)?.recordSha256
      || before.rawInput?.sha256 !== '5b18323c4817c7c99a38cd058015f862bbc588237b655ec6c7e8375f60f8248f') fail('exact original mammoth claim history');
  const mammothClaim = index.claims.find(row => row.claimId === 'price-discovery:mm-mammoth-tusks-relative#/typedClaim');
  const derivedValue = mammothClaim?.valueSemantics;
  if (!derivedValue || derivedValue.kind !== 'range' || derivedValue.currency !== 'gp'
      || derivedValue.minimumAmount !== 150 || derivedValue.maximumAmount !== 900
      || derivedValue.unit !== 'per tusk' || derivedValue.isSourcePrinted !== false
      || derivedValue.printedAsRange !== false || derivedValue.derivation?.factor !== 1.5
      || derivedValue.derivationStatus !== 'source-backed-derived-interpretation') fail('mammoth derived valuation must retain its exact interpretation');
  const mammoth = registry.dispositions.find(row => row.id === mammothId);
  const review = registry.integrationReview && readRef(repoRoot, registry.integrationReview).data;
  if (!review || review.schemaVersion !== 1
      || review.artifactType !== 'independent-mammoth-derived-valuation-integration-review'
      || review.status !== 'confirmed-bounded-source-and-integration-review'
      || review.independentOfSourceAuthor !== true || review.independentOfImplementationAuthor !== true
      || review.questionId !== mammothId || review.beforeRecordSha256 !== mammoth?.beforeRecordSha256
      || review.currentRecordSha256 !== mammoth?.currentRecordSha256
      || !same(review.derivedRange, {minimumAmount: 150, maximumAmount: 900, currency: 'gp', unit: 'per tusk', factor: 1.5, printedAsRange: false, isSourcePrinted: false})
      || review.reviewBoundary?.semanticPass !== false || review.reviewBoundary?.printedValuePass !== false
      || review.reviewBoundary?.generalSourceReviewPending !== true) fail('bounded mammoth review changed or is stale');
  if (!same(canonical.data.sourcePageCensuses?.find(row => row.id === 'monster-books')?.sourceArtifact, raw)
      || !same(receipts.claimReceipts?.find(row => row.receiptId === 'mm-mammoth-tusks-relative')?.typedClaim,
        Object.fromEntries(['amountOrFormula', 'currency', 'unit', 'conditions', 'valuationDerivation'].map(key => [key, valueClaim[key]])))) fail('mammoth source/canonical/receipt mirror changed');
  for (const proof of registry.sourceProofs ?? []) readRef(repoRoot, proof);
  const records = registry.dispositions.map((row, index) => {
    const old = historical.uncertainties[index], beforeRow = beforeQuestions.records[index];
    const current = audit.records.find(record => record.uid === old.uid);
    const isMammoth = old.id === mammothId;
    if (row.uid !== old.uid || row.historicalQuestionSha256 !== hash(old)
        || row.beforeRecordSha256 !== beforeRow.recordSha256
        || row.currentRecordSha256 !== current?.recordSha256
        || row.currentRowIdentitySha256 !== current?.rowIdentitySha256
        || row.currentDisposition !== (isMammoth ? 'source-backed-derived-valuation' : 'unresolved-source-question')) fail(`record-bound historical disposition ${old.id}`);
    if (!isMammoth && current.recordSha256 !== beforeRow.recordSha256) fail(`changed unresolved historical record ${old.id}`);
    return {
      ...row,
      historicalQuestion: old,
      legacyAdapterStatus: audit.retainedUncertainties.find(item => item.id === old.id)?.status,
      semanticPass: false,
      ...(isMammoth ? {
        derivedValue,
        sourceProofs: registry.sourceProofs,
        printedValuePass: false,
        independentIntegrationReview: 'confirmed',
        integrationReview: registry.integrationReview,
      } : {}),
    };
  });
  const baseProjection = {
    schemaVersion: 1,
    artifactType: 'current-monetary-source-question-projection',
    registry: registryRef,
    historicalRegister: registry.historicalRegister,
    beforeQuestionRecords: registry.beforeQuestionRecords,
    counts: {historicalRegisteredQuestions: 8, currentUnresolvedQuestions: 7, derivedAdjudications: 1},
    records,
    semanticPass: false,
    generalSourceReviewPending: true,
    legacyQuestionPolicy: 'The sealed register and raw row-adapter flags are historical registered questions, not current semantic verdicts. Every original question remains visible beside its current record-bound disposition.',
    inputs: [
      registryRef, detectorRef.ref, historicalRef.ref, beforeFixtureRef.ref, beforeQuestionsRef.ref,
      ...legacyInputRefs, integrationReviewRef, ...sourceProofRefs, scopeRef, proofRef,
    ],
  };
  validateLegacyProjection(baseProjection);
  return baseProjection;
}

const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const hashValue = value => sha(Buffer.from(canonical(value)));

// Compatibility adapter: the historical exported validator only checks the eight-record boundary.
function validateCurrentMonetarySourceQuestionProjection(projection, {repoRoot = DEFAULT_ROOT, registry: registryOverride = null, audit: auditOverride = null} = {}) {
  const currentAudit = auditOverride ?? loadMonetaryRowIdentityAudit({repoRoot});
  const registryBytes = registryOverride ? Buffer.from(`${JSON.stringify(registryOverride, null, 2)}\n`) : readFileSync(resolve(repoRoot, currentSourceQuestionRegistryPath));
  const registry = registryOverride ?? JSON.parse(registryBytes);
  if (!registry || projection.schemaVersion !== 1 || projection.semanticPass !== false
      || projection.generalSourceReviewPending !== true) fail('projection boundary');
  if (projection.registry?.path !== currentSourceQuestionRegistryPath || projection.registry?.sha256 !== sha(registryBytes)) fail('projection registry binding is missing or stale');
  const expectedIds = [...EXPECTED_INTERPRETATION_IDS, ...EXPECTED_SCOPE_ROWS.map(row => row.id)];
  if (!Array.isArray(projection.sourceQuestions) || !same(projection.sourceQuestions.map(row => row.id), expectedIds)
      || projection.sourceQuestions.length !== 9) fail('all nine current question IDs and their order must remain exact');
  const unresolved = projection.records.filter(row => row.currentDisposition === 'unresolved-source-question');
  if (!same(unresolved.map(row => row.id), EXPECTED_INTERPRETATION_IDS)) fail('seven historical interpretation questions changed or disappeared');
  const interpretedQuestions = projection.sourceQuestions.slice(0, 7);
  for (const [index, row] of interpretedQuestions.entries()) {
    const legacy = unresolved[index];
    if (row.questionType !== 'historical-monetary-interpretation' || row.uid !== legacy.uid
        || row.currentDisposition !== 'unresolved-source-question' || row.status !== 'unresolved'
        || row.semanticPass !== false || !same(row.historicalQuestion, legacy.historicalQuestion)
        || row.historicalQuestionSha256 !== legacy.historicalQuestionSha256
        || row.currentRecordSha256 !== legacy.currentRecordSha256) fail(`historical interpretation payload changed: ${row.id}`);
  }
  const scopeRows = projection.sourceQuestions.slice(7);
  if (!same(scopeRows.map(row => row.id), EXPECTED_SCOPE_ROWS.map(row => row.id))) fail('scope question identities changed');
  const scopeDocBytes = readFileSync(resolve(repoRoot, SCOPE_INTERPRETATION_PATH));
  if (sha(scopeDocBytes) !== SCOPE_INTERPRETATION_SHA256) fail('source scope interpretation input is stale');
  const scopeDoc = JSON.parse(scopeDocBytes);
  const sourceScopeFindings = currentAudit.knownFindings.filter(row => row.kind === 'unresolved-source-scope');
  if (sourceScopeFindings.length !== 2 || scopeDoc.sourceScopeFindings?.length !== 2) fail('the two unresolved source scope findings changed');
  const totalUids = new Set();
  for (const [index, expected] of EXPECTED_SCOPE_ROWS.entries()) {
    const question = scopeRows[index];
    const declared = scopeDoc.sourceScopeFindings[index];
    const finding = sourceScopeFindings.find(row => row.id === expected.id);
    if (!finding || declared.id !== expected.id || declared.kind !== 'unresolved-source-scope'
        || !same(declared.uids, expected.uids) || !same(question.affectedAuditRows.map(row => row.uid), expected.uids)
        || question.questionType !== 'source-scope' || question.status !== 'unresolved'
        || question.semanticPass !== false || question.underlyingSourceQuestion?.status !== 'unresolved'
        || question.interpretation !== scopeDoc.interpretation?.[expected.interpretationKey]) fail(`source scope question or affected row set changed: ${expected.id}`);
    if (finding.semanticPass !== false || finding.underlyingSourceQuestion?.status !== 'unresolved'
        || !same(finding.records.map(row => row.uid), expected.uids)
        || !same(question.affectedAuditRows, finding.records.map(({uid, recordSha256, rowIdentitySha256}) => ({uid, recordSha256, rowIdentitySha256})))) fail(`source scope finding records changed: ${expected.id}`);
    for (const uid of expected.uids) {
      if (totalUids.has(uid)) fail(`duplicate source-scope row ${uid}`);
      totalUids.add(uid);
    }
  }
  if (totalUids.size !== 9 || projection.questionCounts?.currentInterpretationQuestions !== 7
      || projection.questionCounts?.independentSourceScopeQuestions !== 2
      || projection.questionCounts?.distinctScopeRows !== 9
      || projection.questionCounts?.currentUnresolvedQuestions !== 9) fail('scope question/row denominators changed');
  if (sha(readFileSync(resolve(repoRoot, OLD_LOADER_PATH))) !== OLD_LOADER_SHA256) fail('closed old loader bytes changed');
  validateLegacyProjection({
    ...projection,
    registry: projection.registry,
    records: projection.records,
    counts: projection.counts,
  });
  return true;
}

function buildCurrentMonetarySourceQuestionProjection({
  repoRoot = DEFAULT_ROOT,
  registry,
  registryBytes,
  index,
  indexBytes,
  audit = null,
  proofBytes,
} = {}) {
  const root = resolve(repoRoot);
  const registryFile = registryBytes ?? Buffer.from(`${JSON.stringify(registry, null, 2)}\n`);
  const actualRegistry = registry ?? JSON.parse(registryFile);
  if (registry && !same(JSON.parse(registryFile), registry)) fail('registry object differs from supplied registry bytes');
  if (!proofBytes) fail('closed migration proof is required');
  const registryRef = {path: currentSourceQuestionRegistryPath, sha256: sha(registryFile)};
  const predecessorBytes = readFileSync(resolve(root, PREDECESSOR_REGISTRY_PATH));
  if (sha(predecessorBytes) !== PREDECESSOR_REGISTRY_SHA256) fail('predecessor registry bytes changed');
  const predecessor = JSON.parse(predecessorBytes);
  const expectedRegistry = structuredClone(predecessor);
  expectedRegistry.currentInputs.canonical.sha256 = actualRegistry.currentInputs?.canonical?.sha256;
  expectedRegistry.currentInputs.monetaryIndex.sha256 = actualRegistry.currentInputs?.monetaryIndex?.sha256;
  expectedRegistry.dmg175SourceInputMigration = actualRegistry.dmg175SourceInputMigration;
  if (!same(actualRegistry, expectedRegistry)) fail('successor registry contains an unapproved payload change');
  if (Object.keys(actualRegistry.currentInputs ?? {}).join(',') !== 'monsterCensus,receipts,canonical,monetaryIndex'
      || actualRegistry.currentInputs.monsterCensus.path !== 'research/price-source-inventory-monster-books.json'
      || actualRegistry.currentInputs.receipts.path !== 'research/source-audit-batch5-price-discovery-reconciliation.json'
      || actualRegistry.currentInputs.canonical.path !== 'research/price-source-inventory.json'
      || actualRegistry.currentInputs.monetaryIndex.path !== 'research/monetary-source-inventory.json'
      || !/^[a-f0-9]{64}$/.test(actualRegistry.currentInputs.canonical.sha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(actualRegistry.currentInputs.monetaryIndex.sha256 ?? '')) fail('current input identity or hash schema changed');
  if (actualRegistry.dmg175SourceInputMigration?.sourceInputCommit !== SOURCE_INPUT_COMMIT
      || actualRegistry.dmg175SourceInputMigration?.predecessor?.path !== PREDECESSOR_REGISTRY_PATH
      || actualRegistry.dmg175SourceInputMigration?.predecessor?.sha256 !== PREDECESSOR_REGISTRY_SHA256
      || actualRegistry.currentInputs?.canonical?.sha256 !== sha(readFileSync(resolve(root, 'research/price-source-inventory.json')))) fail('successor migration identity or canonical input hash');
  const serializedIndex = indexBytes ?? Buffer.from(`${JSON.stringify(index, null, 2)}\n`);
  if (index && !same(JSON.parse(serializedIndex), index)) fail('index object differs from supplied index bytes');
  if (!index || sha(serializedIndex) !== actualRegistry.currentInputs?.monetaryIndex?.sha256
      || sha(readFileSync(resolve(root, 'research/price-source-inventory.json'))) !== actualRegistry.currentInputs?.canonical?.sha256) fail('in-memory monetary index or canonical input hash is missing/stale');
  validateCurrentMonetaryIndexDependencies(root, index);
  const scopeRef = {path: SCOPE_INTERPRETATION_PATH, sha256: SCOPE_INTERPRETATION_SHA256};
  const scopeBytes = readRef(root, scopeRef).bytes;
  const sourceProofRefs = actualRegistry.sourceProofs ?? [];
  for (const ref of sourceProofRefs) readRef(root, ref);
  const detectorRef = readRef(root, actualRegistry.detectorClarification);
  const historicalRef = readRef(root, actualRegistry.historicalRegister);
  const beforeFixtureRef = readRef(root, actualRegistry.beforeFixture);
  const beforeQuestionsRef = readRef(root, actualRegistry.beforeQuestionRecords);
  const currentAudit = audit ?? loadMonetaryRowIdentityAudit({repoRoot: root});
  const proofRef = {path: PROOF_PATH, sha256: actualRegistry.dmg175SourceInputMigration?.proof?.sha256};
  if (sha(proofBytes) !== proofRef.sha256) fail('migration proof hash is missing or stale');
  const rawRef = readRef(root, actualRegistry.currentInputs.monsterCensus);
  const receiptRef = readRef(root, actualRegistry.currentInputs.receipts);
  const canonicalRef = readRef(root, actualRegistry.currentInputs.canonical);
  const indexRef = {path: actualRegistry.currentInputs.monetaryIndex.path, sha256: sha(serializedIndex)};
  const integrationReviewRef = actualRegistry.integrationReview;
  readRef(root, integrationReviewRef);
  const projection = legacyProjection({
    repoRoot: root, registry: actualRegistry, registryRef, detectorRef, historicalRef, beforeFixtureRef,
    beforeQuestionsRef, raw: rawRef.data, receipts: receiptRef.data, canonical: canonicalRef,
    index, integrationReviewRef, sourceProofRefs,
    legacyInputRefs: [rawRef.ref, receiptRef.ref, canonicalRef.ref, indexRef],
    audit: currentAudit, proofRef, scopeRef,
  });
  const legacyUnresolved = projection.records.filter(row => row.currentDisposition === 'unresolved-source-question');
  const sourceQuestions = legacyUnresolved.map(row => ({
    id: row.id,
    uid: row.uid,
    questionType: 'historical-monetary-interpretation',
    currentDisposition: 'unresolved-source-question',
    status: 'unresolved',
    semanticPass: false,
    historicalQuestion: row.historicalQuestion,
    historicalQuestionSha256: row.historicalQuestionSha256,
    beforeRecordSha256: row.beforeRecordSha256,
    currentRecordSha256: row.currentRecordSha256,
  }));
  const scopeDoc = JSON.parse(scopeBytes);
  const scopeFindings = currentAudit.knownFindings.filter(row => row.kind === 'unresolved-source-scope');
  for (const expected of EXPECTED_SCOPE_ROWS) {
    const finding = scopeFindings.find(row => row.id === expected.id);
    if (!finding || !same(finding.records.map(row => row.uid), expected.uids)) fail(`source scope input row set is unavailable: ${expected.id}`);
    sourceQuestions.push({
      id: expected.id,
      questionType: 'source-scope',
      status: 'unresolved',
      semanticPass: false,
      interpretation: scopeDoc.interpretation[expected.interpretationKey],
      underlyingSourceQuestion: {status: 'unresolved'},
      extractionRepresentation: finding.extractionRepresentation,
      affectedAuditRows: finding.records.map(({uid, recordSha256, rowIdentitySha256}) => ({uid, recordSha256, rowIdentitySha256})),
    });
  }
  projection.sourceQuestions = sourceQuestions;
  projection.questionCounts = {
    currentInterpretationQuestions: 7,
    independentSourceScopeQuestions: 2,
    distinctScopeRows: 9,
    currentUnresolvedQuestions: 9,
  };
  projection.inputs = [
    registryRef, detectorRef.ref, historicalRef.ref, beforeFixtureRef.ref, beforeQuestionsRef.ref,
    rawRef.ref, receiptRef.ref, canonicalRef.ref, indexRef, integrationReviewRef,
    ...sourceProofRefs, scopeRef, proofRef,
  ];
  proofMatches(JSON.parse(proofBytes), actualRegistry);
  validateCurrentMonetarySourceQuestionProjection(projection, {repoRoot: root, registry: actualRegistry, audit: currentAudit});
  return projection;
}

export function loadCurrentMonetarySourceQuestions({repoRoot = DEFAULT_ROOT, audit = null} = {}) {
  const root = resolve(repoRoot);
  const registryBytes = readFileSync(resolve(root, currentSourceQuestionRegistryPath));
  if (sha(registryBytes) !== SUCCESSOR_REGISTRY_SHA256) fail('successor registry raw bytes do not match the reviewed exact artifact');
  const registry = JSON.parse(registryBytes);
  if (registry.schemaVersion !== 1 || registry.status !== 'bounded-derived-adjudication-independently-reviewed') fail('successor registry status or schema');
  const proofRef = registry.dmg175SourceInputMigration?.proof;
  if (!proofRef || proofRef.path !== PROOF_PATH || proofRef.sha256 !== PROOF_SHA256) fail('final migration proof binding');
  const proof = readRef(root, proofRef).bytes;
  proofMatches(JSON.parse(proof), registry);
  const canonical = readRef(root, registry.currentInputs.canonical);
  const index = readRef(root, registry.currentInputs.monetaryIndex);
  const currentAudit = audit ?? loadMonetaryRowIdentityAudit({repoRoot: root});
  return buildCurrentMonetarySourceQuestionProjection({
    repoRoot: root, registry, registryBytes, index: index.data, indexBytes: index.bytes,
    audit: currentAudit, proofBytes: proof,
  });
}

export {hashValue as hashCurrentMonetaryQuestion};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg, index) => !['--check', '--output'].includes(arg) && args[index - 1] !== '--output')) throw new Error('Usage: dmg175-current-monetary-source-questions-v1.mjs [--check] [--output path]');
    const projection = loadCurrentMonetarySourceQuestions();
    const outputIndex = args.indexOf('--output');
    if (outputIndex >= 0) {
      const output = args[outputIndex + 1];
      if (!output || output.startsWith('--')) throw new Error('--output requires a path');
      writeFileSync(resolve(output), `${JSON.stringify(projection, null, 2)}\n`);
    }
    process.stdout.write(`${JSON.stringify({
      status: 'record-bound-DMG175-current-projection-valid',
      historicalRegisteredQuestions: projection.counts.historicalRegisteredQuestions,
      currentInterpretationQuestions: projection.questionCounts.currentInterpretationQuestions,
      independentSourceScopeQuestions: projection.questionCounts.independentSourceScopeQuestions,
      sourceScopeRows: projection.questionCounts.distinctScopeRows,
      currentUnresolvedQuestions: projection.questionCounts.currentUnresolvedQuestions,
      derivedAdjudications: projection.counts.derivedAdjudications,
      semanticPass: false,
      generalSourceReviewPending: true,
    })}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
