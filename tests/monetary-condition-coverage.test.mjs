import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {buildMonetaryConditionCoverage} from '../tools/monetary-condition-coverage.mjs';

const hash = 'a'.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const HISTORICAL_INDEX_PATH = 'artifacts/monetary-source-inventory-before-source-corrections/index.json';
const HISTORICAL_INDEX_SHA256 = '472771cc6925c176ebf4eaed5030dc35c1764d53db164a7eda2f9f86e46a004a';
const HISTORICAL_INDEX_FIXTURE_GZIP_SHA256 = 'c0170d73f59a3379fabd68444a9594a277a8d6f36503dc9296741cd24923d57c';
const HISTORICAL_AUDIT_PATH = 'research/source-audit-batch5-monetary-context-migration-before-v3.json';
const HISTORICAL_AUDIT_SHA256 = 'bee94a49f34c33ef1d0c1a77da2a13e4ed56f38880fba55d352c8d42c53fef0b';
const HISTORICAL_CONTRACT_PATH = 'research/source-audit-batch5-monetary-condition-contract-before-info4-v2.json';
const HISTORICAL_CONTRACT_SHA256 = '935cbe0d33613a29cf359e334a4886ac1dc522d4a7daf823c3b6d46fee72e1cd';
const sourceRef = {path: 'source.json', sha256: hash, jsonPointer: '/rows/0'};
function inputs() {
  return {
    index: {
      artifactType: 'bounded-monetary-source-inventory',
      inputArtifacts: [{path: 'source.json', sha256: hash}],
      sourceOccurrences: [
        {sourceOccurrenceId: 'row-0', occurrenceKind: 'source-row', object: 'Item A', purpose: 'purchase', source: {book: 'Test', printedPage: 3}, conditions: null, qualifiers: [], sourceRecord: {typedValue: {condition: 'minimum amount'}}, provenance: {inputArtifact: structuredClone(sourceRef), sourceValueJsonPointer: '/rows/0/value'}},
        {sourceOccurrenceId: 'row-1', occurrenceKind: 'source-row', object: 'Item B', purpose: 'wage', source: {book: 'Test', printedPage: 4}, conditions: {printed: 'once per month'}, qualifiers: ['unless housed'], provenance: {inputArtifact: {...sourceRef, jsonPointer: '/rows/1'}, sourceValueJsonPointer: '/rows/1/value'}},
      ],
      claims: [
        {claimId: 'row-0#/value', sourceOccurrenceId: 'row-0', conditions: null, qualifiers: [], valueSemantics: {condition: 'minimum amount'}, provenance: {inputArtifact: structuredClone(sourceRef), sourceValueJsonPointer: '/rows/0/value'}},
        {claimId: 'row-1#/value', sourceOccurrenceId: 'row-1', conditions: {printed: 'once per month'}, qualifiers: ['unless housed'], valueSemantics: {condition: 'minimum amount'}, provenance: {inputArtifact: {...sourceRef, jsonPointer: '/rows/1'}, sourceValueJsonPointer: '/rows/1/value'}},
      ],
    },
    audit: {
      records: [
        {uid: 'audit-row-0', surface: 'source-row', input: 'source.json', inputSha256: hash, pointer: '/rows/0', identity: {sourceRowId: 'row-0'}, annotations: {'/conditions': null, '/qualifiers': [], '/sourceRecord/typedValue/condition': 'minimum amount'}, sourceValueSha256ByPointer: {'/conditions': hash}},
        {uid: 'audit-row-1', surface: 'source-row', input: 'source.json', inputSha256: hash, pointer: '/rows/other', identity: {sourceRowId: 'unmatched'}, annotations: {'/conditions': '', '/sourceRecord/qualifier': 'only on holidays'}, sourceValueSha256ByPointer: {'/conditions': hash}},
      ],
    },
  };
}

test('all indexed occurrences and claims preserve exact condition/qualifier field states and contents', () => {
  const report = buildMonetaryConditionCoverage(inputs());
  assert.equal(report.denominators.indexedSourceOccurrences, 2);
  assert.equal(report.denominators.indexedValueClaims, 2);
  assert.equal(report.sourceOccurrences[0].directFieldSnapshots.conditions.state, 'null');
  assert.equal(report.sourceOccurrences[0].directFieldSnapshots.qualifiers.state, 'empty-array');
  assert.deepEqual(report.sourceOccurrences[1].directFieldSnapshots.conditions.value, {printed: 'once per month'});
  assert.deepEqual(report.sourceOccurrences[1].directFieldSnapshots.qualifiers.value, ['unless housed']);
  assert.equal(report.claims[0].directFieldSnapshots.conditions.state, 'null');
  assert.equal(report.claims[1].directFieldSnapshots.conditions.value.printed, 'once per month');
  assert.equal(report.sourceOccurrences[0].nestedConditionQualifierFields.find(x => x.pointer.endsWith('/typedValue/condition')).value, 'minimum amount');
  assert.match(report.sourceSemanticCompleteness, /unassessed/);
});

test('exact source path, hash, and pointer joins produce a distinct 1:1 no-index queue without treating empty fields as source absence', () => {
  const report = buildMonetaryConditionCoverage(inputs());
  assert.equal(report.denominators.auditRowsWithExactIndexedOccurrence, 1);
  assert.equal(report.denominators.auditRowsWithoutExactIndexedOccurrence, 1);
  assert.equal(report.explicitNoCorrespondingIndexQueue[0].uid, 'audit-row-1');
  assert.equal(report.explicitNoCorrespondingIndexQueue[0].disposition, 'no-exact-indexed-source-occurrence; source-semantic-absence-unassessed');
  assert.deepEqual(report.explicitNoCorrespondingIndexQueue[0].exactSourceArtifactPointer, {path: 'source.json', sha256: hash, jsonPointer: '/rows/other'});
  const queued = report.explicitNoCorrespondingIndexQueue[0];
  const full = report.fullRowAuditRecords.find(row => row.uid === queued.uid);
  assert.equal(full.recordedConditionQualifierAnnotations.find(x => x.sourceFieldPointer === '/conditions').state, 'empty-string');
  assert.equal(queued.rowAuditPointer, full.rowAuditPointer);
  assert.match(full.sourceSemanticReview, /not evidence/);
  assert.equal(report.sourceOccurrences[0].exactAuditJoin.status, 'exact-path-hash-row-pointer-match');
  assert.equal(report.denominators.indexOccurrencesWithoutExactAuditRow, 1);
  assert.equal(report.explicitIndexOccurrencesWithoutExactAuditQueue[0].sourceOccurrenceId, 'row-1');
});

test('field hash pointers do not substitute for exposed source content; dangling claims and duplicate IDs are rejected', () => {
  const x = inputs();
  const report = buildMonetaryConditionCoverage(x);
  const row0 = report.fullRowAuditRecords.find(row => row.uid === 'audit-row-0');
  assert.deepEqual(row0.sourceFieldContentHashes, [{sourceFieldPointer: '/conditions', valueSha256: hash, contentStatus: 'hash-only; source text/value content not exposed here'}]);
  assert.equal(row0.recordedConditionQualifierAnnotations[0].contentStatus, 'exact-row-audit-annotation-content; not independently source-validated or authorship-certified');
  x.index.claims[0].sourceOccurrenceId = 'missing';
  assert.throws(() => buildMonetaryConditionCoverage(x), /dangling/);
  x.index.claims[0].sourceOccurrenceId = 'row-0';
  x.index.claims[1].claimId = 'row-0#/value';
  assert.throws(() => buildMonetaryConditionCoverage(x), /Duplicate claim/);
});

test('a declared source contract stays a manual known-failure fixture, not an automatic semantic detector', () => {
  const x = inputs();
  const contract = {
    contractId: 'source-condition-known-failure',
    reviewStatus: 'confirmed-source-condition-omission-before-repair',
    expectedSourceFieldPointer: '/conditions',
    rows: [{
      recordId: 'row-0',
      sourceInput: {path: 'source.json', sha256: hash, jsonPointer: '/rows/0'},
      sourceRowAudit: {uid: 'audit-row-0', input: 'source.json', inputSha256: hash, jsonPointer: '/rows/0', rowAuditIndex: 0},
      indexedOccurrence: {sourceOccurrenceId: 'row-0', inventoryPointer: '/sourceOccurrences/0', conditions: null},
    }],
  };
  const report = buildMonetaryConditionCoverage({index: x.index, audit: x.audit, declaredSourceContracts: [contract]});
  const finding = report.declaredSourceConditionContracts[0];
  assert.equal(finding.contractId, contract.contractId);
  assert.equal(finding.contractStatus, contract.reviewStatus);
  assert.equal(finding.exactIndexBindings[0].status, 'exact-pointer-hash-row-audit-uid-and-before-value-match');
  assert.equal(finding.exactIndexBindings[0].semanticConditionPass, false);
  assert.match(finding.sourceReviewStatus, /does not independently evaluate/);
});

test('declared before-contract binding rejects path, SHA, or pointer drift in sourceInput', () => {
  const original = inputs();
  const contract = {
    contractId: 'source-condition-reference-controls',
    reviewStatus: 'confirmed-source-condition-omission-before-repair',
    expectedSourceFieldPointer: '/conditions',
    rows: [{
      recordId: 'row-0',
      sourceInput: {path: 'source.json', sha256: hash, jsonPointer: '/rows/0'},
      sourceRowAudit: {uid: 'audit-row-0', input: 'source.json', inputSha256: hash, jsonPointer: '/rows/0', rowAuditIndex: 0},
      indexedOccurrence: {sourceOccurrenceId: 'row-0', inventoryPointer: '/sourceOccurrences/0', conditions: null},
    }],
  };
  for (const [field, value] of [['path', 'other.json'], ['sha256', 'b'.repeat(64)], ['jsonPointer', '/rows/other']]) {
    const changed = structuredClone(contract);
    changed.rows[0].sourceInput[field] = value;
    const binding = buildMonetaryConditionCoverage({...original, declaredSourceContracts: [changed]}).declaredSourceConditionContracts[0].exactIndexBindings[0];
    assert.notEqual(binding.status, 'exact-pointer-hash-row-audit-uid-and-before-value-match', `${field} drift must never produce an exact binding`);
  }
});

test('declared before-contract binding requires its explicit row-audit UID and declared audit triple', () => {
  const original = inputs();
  const contract = {
    contractId: 'source-condition-audit-controls',
    reviewStatus: 'confirmed-source-condition-omission-before-repair',
    expectedSourceFieldPointer: '/conditions',
    rows: [{
      recordId: 'row-0',
      sourceInput: {path: 'source.json', sha256: hash, jsonPointer: '/rows/0'},
      sourceRowAudit: {uid: 'audit-row-0', input: 'source.json', inputSha256: hash, jsonPointer: '/rows/0', rowAuditIndex: 0},
      indexedOccurrence: {sourceOccurrenceId: 'row-0', inventoryPointer: '/sourceOccurrences/0', conditions: null},
    }],
  };
  const controls = [
    row => { row.sourceRowAudit.uid = 'missing-audit-row'; },
    row => { row.sourceRowAudit.input = 'other.json'; },
    row => { row.sourceRowAudit.inputSha256 = 'b'.repeat(64); },
    row => { row.sourceRowAudit.jsonPointer = '/rows/other'; },
    row => { row.sourceRowAudit.rowAuditIndex = 1; },
  ];
  controls.forEach((mutate, index) => {
    const changed = structuredClone(contract);
    mutate(changed.rows[0]);
    const binding = buildMonetaryConditionCoverage({...original, declaredSourceContracts: [changed]}).declaredSourceConditionContracts[0].exactIndexBindings[0];
    assert.notEqual(binding.status, 'exact-pointer-hash-row-audit-uid-and-before-value-match', `row-audit control ${index} must never produce an exact binding`);
  });
  for (const [field, value] of [['input', 'other.json'], ['inputSha256', 'b'.repeat(64)], ['pointer', '/rows/other']]) {
    const changedInputs = inputs();
    changedInputs.audit.records[0][field] = value;
    const binding = buildMonetaryConditionCoverage({...changedInputs, declaredSourceContracts: [contract]}).declaredSourceConditionContracts[0].exactIndexBindings[0];
    assert.notEqual(binding.status, 'exact-pointer-hash-row-audit-uid-and-before-value-match', `actual row-audit ${field} drift must never produce an exact binding`);
  }
});

test('current condition and source-hash changes require independent review and keep row-audit findings separate', async () => {
  const {runMonetaryConditionCoverage} = await import('../tools/monetary-condition-coverage.mjs');
  const temp = mkdtempSync(join(tmpdir(), 'monetary-condition-current-'));
  try {
    const paths = ['research', 'artifacts/monetary-condition-coverage'];
    for (const path of paths) mkdirSync(join(temp, path), {recursive: true});
    const sourceContracts = {
      artifactType: 'manual-source-condition-contracts-before-correction',
      contracts: [{
        contractId: 'source-condition-current-mode',
        reviewStatus: 'confirmed-source-condition-omission-before-repair',
        expectedSourceFieldPointer: '/conditions',
        rows: [{
          recordId: 'row-0',
          sourceInput: {path: 'source.json', sha256: hash, jsonPointer: '/rows/0'},
          sourceRowAudit: {uid: 'audit-row-0', input: 'source.json', inputSha256: hash, jsonPointer: '/rows/0', rowAuditIndex: 0},
          indexedOccurrence: {sourceOccurrenceId: 'row-0', inventoryPointer: '/sourceOccurrences/0', conditions: null},
        }],
      }],
    };
    const currentIndex = inputs().index;
    currentIndex.sourceOccurrences[0].conditions = 'a changed source condition';
    currentIndex.sourceOccurrences[0].provenance.inputArtifact.sha256 = 'b'.repeat(64);
    currentIndex.claims[0].conditions = 'a changed source condition';
    const currentAudit = inputs().audit;
    currentAudit.records[0].inputSha256 = 'b'.repeat(64);
    currentAudit.knownFindings = [{
      id: 'typed-condition-finding', kind: 'typed-content-mismatch', status: 'confirmed-typed-content-mismatch',
      records: [{uid: 'audit-row-0'}],
    }];
    currentAudit.reviewResults = [{id: 'separate-focus-review', status: 'explicit-source-reviewed-repair', records: [{uid: 'audit-row-0'}]}];
    writeFileSync(join(temp, 'research/monetary-source-inventory.json'), JSON.stringify(currentIndex));
    writeFileSync(join(temp, 'research/source-audit-batch5-monetary-condition-contract-before-info4-v2.json'), JSON.stringify(sourceContracts));
    const argsSeen = [];
    const result = await runMonetaryConditionCoverage([], {
      repoRoot: temp,
      validateCurrentIndex: async args => { argsSeen.push(args); return {status: 'ok'}; },
      loadLiveAudit: () => currentAudit,
    });
    const report = JSON.parse(readFileSync(join(temp, result.output)));
    const binding = report.declaredSourceConditionContracts[0].exactIndexBindings[0];
    assert.deepEqual(argsSeen, [['--check', 'research/monetary-source-inventory.json']]);
    assert.equal(result.mode, 'current');
    assert.equal(report.artifactType, 'monetary-condition-and-qualifier-coverage-current');
    assert.equal(binding.status, 'condition-and-source-hash-changed-needs-independent-review');
    assert.equal(binding.contractStatus, 'confirmed-source-condition-omission-before-repair');
    assert.equal(binding.currentRowAuditKnownFindingOutcomes[0].id, 'typed-condition-finding');
    assert.equal(binding.currentRowAuditKnownFindingOutcomes[0].status, 'confirmed-typed-content-mismatch');
    assert.equal(binding.currentRowAuditReviewOutcomes[0].id, 'separate-focus-review');
    assert.deepEqual(report.currentRowAuditKnownFindings, currentAudit.knownFindings);
    assert.equal(report.sourceSemanticPass, false);
    assert.match(report.sourceSemanticCompleteness, /unassessed/);
    assert.equal(existsSync(join(temp, 'research/source-audit-batch5-monetary-condition-coverage-before-source-corrections-v2.json')), false);

    const hashOnly = inputs();
    hashOnly.index.sourceOccurrences[0].provenance.inputArtifact.sha256 = 'b'.repeat(64);
    hashOnly.audit.records[0].inputSha256 = 'b'.repeat(64);
    const unchangedCondition = structuredClone(sourceContracts.contracts[0]);
    unchangedCondition.rows[0].indexedOccurrence.conditions = null;
    const hashOnlyBinding = buildMonetaryConditionCoverage({
      index: hashOnly.index, audit: hashOnly.audit, mode: 'current', declaredSourceContracts: [unchangedCondition],
    }).declaredSourceConditionContracts[0].exactIndexBindings[0];
    assert.equal(hashOnlyBinding.status, 'source-hash-changed-needs-independent-review');
    assert.equal(hashOnlyBinding.currentIndexAndAuditTriplesMatch, true);
    assert.equal(hashOnlyBinding.contractStatus, 'confirmed-source-condition-omission-before-repair');
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
});

test('current mode associates a contract only by its explicit row-audit UID and exact live index-to-audit triple', async () => {
  const {buildMonetaryConditionCoverage} = await import('../tools/monetary-condition-coverage.mjs');
  const x = inputs();
  x.index.sourceOccurrences[0].conditions = 'changed';
  const contract = {
    contractId: 'source-condition-current-uid-join',
    reviewStatus: 'confirmed-source-condition-omission-before-repair',
    rows: [{
      recordId: 'row-0',
      sourceInput: {path: 'source.json', sha256: hash, jsonPointer: '/rows/0'},
      sourceRowAudit: {uid: 'audit-row-0', input: 'source.json', inputSha256: hash, jsonPointer: '/rows/0', rowAuditIndex: 0},
      indexedOccurrence: {sourceOccurrenceId: 'row-0', inventoryPointer: '/sourceOccurrences/0', conditions: null},
    }],
  };
  x.audit.knownFindings = [];
  x.audit.reviewResults = [];
  const missingUid = structuredClone(contract);
  missingUid.rows[0].sourceRowAudit.uid = 'audit-row-1';
  const report = buildMonetaryConditionCoverage({...x, mode: 'current', declaredSourceContracts: [missingUid]});
  const binding = report.declaredSourceConditionContracts[0].exactIndexBindings[0];
  assert.equal(binding.status, 'current-row-audit-uid-or-reference-mismatch-needs-independent-review');
  assert.equal(binding.currentRowAuditUid, 'audit-row-1');
  assert.deepEqual(binding.currentRowAuditKnownFindingOutcomes, []);
  assert.equal(binding.contractStatus, 'confirmed-source-condition-omission-before-repair');

  const changedLiveReference = inputs();
  changedLiveReference.index.sourceOccurrences[0].provenance.inputArtifact.jsonPointer = '/rows/changed';
  changedLiveReference.audit.records[0].pointer = '/rows/changed';
  const pathMismatch = buildMonetaryConditionCoverage({
    ...changedLiveReference, mode: 'current', declaredSourceContracts: [contract],
  }).declaredSourceConditionContracts[0].exactIndexBindings[0];
  assert.equal(pathMismatch.status, 'current-row-audit-uid-or-reference-mismatch-needs-independent-review');
  assert.equal(pathMismatch.currentIndexAndAuditTriplesMatch, true);
  assert.equal(pathMismatch.currentPathAndPointerMatchFrozenContract, false);
});

test('current null, deleted, and rephrased contract conditions all remain needs-review', async () => {
  const {buildMonetaryConditionCoverage} = await import('../tools/monetary-condition-coverage.mjs');
  const original = inputs();
  const contract = {
    contractId: 'source-condition-current-change-controls',
    reviewStatus: 'confirmed-source-condition-omission-before-repair',
    rows: [{
      recordId: 'row-0',
      sourceInput: {path: 'source.json', sha256: hash, jsonPointer: '/rows/0'},
      sourceRowAudit: {uid: 'audit-row-0', input: 'source.json', inputSha256: hash, jsonPointer: '/rows/0', rowAuditIndex: 0},
      indexedOccurrence: {sourceOccurrenceId: 'row-0', inventoryPointer: '/sourceOccurrences/0', conditions: 'before text'},
    }],
  };
  for (const [label, change] of [
    ['null', record => { record.conditions = null; }],
    ['deleted', record => { delete record.conditions; }],
    ['rephrased', record => { record.conditions = 'different words'; }],
  ]) {
    const data = structuredClone(original);
    change(data.index.sourceOccurrences[0]);
    change(data.index.claims[0]);
    const report = buildMonetaryConditionCoverage({...data, mode: 'current', declaredSourceContracts: [contract]});
    const binding = report.declaredSourceConditionContracts[0].exactIndexBindings[0];
    assert.equal(binding.status, 'condition-changed-needs-independent-review', `${label} must remain unresolved: ${JSON.stringify(binding)}`);
    assert.equal(binding.contractStatus, 'confirmed-source-condition-omission-before-repair');
    assert.equal(binding.semanticConditionPass, false);
    assert.equal(report.sourceSemanticPass, false);
  }
});

test('historical before mode requires a fresh output path and never overwrites the frozen report', async () => {
  const {runMonetaryConditionCoverage} = await import('../tools/monetary-condition-coverage.mjs');
  const temp = mkdtempSync(join(tmpdir(), 'monetary-condition-before-'));
  try {
    const beforeIndex = inputs().index;
    const beforeAudit = inputs().audit;
    const contracts = {artifactType: 'manual-source-condition-contracts-before-correction', contracts: []};
    mkdirSync(join(temp, 'artifacts'), {recursive: true});
    mkdirSync(join(temp, 'research'), {recursive: true});
    writeFileSync(join(temp, 'artifacts/index.json'), JSON.stringify(beforeIndex));
    writeFileSync(join(temp, 'research/audit.json'), JSON.stringify(beforeAudit));
    writeFileSync(join(temp, 'research/contracts.json'), JSON.stringify(contracts));
    const archivedPath = join(temp, 'research/frozen-before.json');
    writeFileSync(archivedPath, 'frozen');
    await assert.rejects(runMonetaryConditionCoverage([
      '--before', '--index', 'artifacts/index.json', '--row-audit', 'research/audit.json',
      '--source-contracts', 'research/contracts.json', '--output', 'research/frozen-before.json',
    ], {repoRoot: temp}), /refusing to overwrite/);
    assert.equal(readFileSync(archivedPath, 'utf8'), 'frozen');
    await assert.rejects(runMonetaryConditionCoverage([
      '--before', '--index', 'artifacts/index.json', '--row-audit', 'research/audit.json', '--source-contracts', 'research/contracts.json',
    ], {repoRoot: temp}), /requires an explicit --output/);
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
});

test('historical before CLI reproduces all four frozen source bindings to a new output', async () => {
  const {runMonetaryConditionCoverage} = await import('../tools/monetary-condition-coverage.mjs');
  const temp = mkdtempSync(join(tmpdir(), 'monetary-condition-frozen-report-'));
  const output = 'artifacts/monetary-condition-coverage/before-review.json';
  const frozenReport = new URL('../research/source-audit-batch5-monetary-condition-coverage-before-source-corrections-v2.json', import.meta.url);
  const frozenBytesBefore = readFileSync(frozenReport);
  try {
    const fixturePath = new URL('../tests/fixtures/monetary-condition-frozen-index-before.json.gz', import.meta.url);
    const compressedIndexBytes = readFileSync(fixturePath);
    assert.equal(sha256(compressedIndexBytes), HISTORICAL_INDEX_FIXTURE_GZIP_SHA256, 'the frozen original index fixture is immutable');
    const indexBytes = gunzipSync(compressedIndexBytes);
    assert.equal(sha256(indexBytes), HISTORICAL_INDEX_SHA256, 'the decompressed fixture is the exact historical index byte stream');

    const auditBytes = readFileSync(new URL('../research/source-audit-batch5-monetary-context-migration-before-v3.json', import.meta.url));
    const contractBytes = readFileSync(new URL('../research/source-audit-batch5-monetary-condition-contract-before-info4-v2.json', import.meta.url));
    assert.equal(sha256(auditBytes), HISTORICAL_AUDIT_SHA256);
    assert.equal(sha256(contractBytes), HISTORICAL_CONTRACT_SHA256);
    const contractDoc = JSON.parse(contractBytes);
    assert.equal(contractDoc.inputs.index.path, HISTORICAL_INDEX_PATH);
    assert.equal(contractDoc.inputs.index.sha256, HISTORICAL_INDEX_SHA256);
    assert.equal(contractDoc.inputs.fullRowAudit.path, HISTORICAL_AUDIT_PATH);
    assert.equal(contractDoc.inputs.fullRowAudit.sha256, HISTORICAL_AUDIT_SHA256);

    const frozenIndex = JSON.parse(indexBytes);
    assert.equal(frozenIndex.denominators.sourceOccurrences, 1871);
    assert.equal(frozenIndex.denominators.sourceValueClaims, 2318);
    mkdirSync(join(temp, 'artifacts/monetary-source-inventory-before-source-corrections'), {recursive: true});
    mkdirSync(join(temp, 'research'), {recursive: true});
    writeFileSync(join(temp, HISTORICAL_INDEX_PATH), indexBytes);
    writeFileSync(join(temp, HISTORICAL_AUDIT_PATH), auditBytes);
    writeFileSync(join(temp, HISTORICAL_CONTRACT_PATH), contractBytes);

    // This isolated repository intentionally contains no live index, source inputs, or assembled app data.
    assert.equal(existsSync(join(temp, 'research/monetary-source-inventory.json')), false);
    assert.equal(existsSync(join(temp, 'research/source-audit-batch5-phb-dmg-additional-prices.json')), false);
    assert.equal(existsSync(join(temp, 'dist/data.json')), false);
    const result = await runMonetaryConditionCoverage(['--before', '--output', output], {repoRoot: temp});
    const report = JSON.parse(readFileSync(join(temp, output)));
    assert.equal(result.mode, 'before');
    assert.equal(report.executionMode, 'before');
    assert.equal(report.denominators.indexedSourceOccurrences, 1871);
    assert.equal(report.denominators.indexedValueClaims, 2318);
    assert.equal(report.denominators.fullRowAuditRecords, 2161);
    assert.equal(report.declaredSourceConditionContracts[0].exactIndexBindings.length, 4);
    assert.ok(report.declaredSourceConditionContracts[0].exactIndexBindings.every(binding => binding.status === 'exact-pointer-hash-row-audit-uid-and-before-value-match'));
    assert.equal(report.inputArtifacts.indexedInventory.path, HISTORICAL_INDEX_PATH);
    assert.equal(report.inputArtifacts.indexedInventory.sha256, HISTORICAL_INDEX_SHA256);
    assert.equal(report.inputArtifacts.fullRowAudit.path, HISTORICAL_AUDIT_PATH);
    assert.equal(report.inputArtifacts.fullRowAudit.sha256, HISTORICAL_AUDIT_SHA256);
    assert.equal(readFileSync(frozenReport).compare(frozenBytesBefore), 0, 'the frozen V2 report must remain byte-identical');
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
});

test('current CLI refuses a normalized frozen before-report output path', async () => {
  const {runMonetaryConditionCoverage} = await import('../tools/monetary-condition-coverage.mjs');
  const temp = mkdtempSync(join(tmpdir(), 'monetary-condition-output-guard-'));
  try {
    let validationCalled = false;
    await assert.rejects(runMonetaryConditionCoverage([
      '--output', './research/source-audit-batch5-monetary-condition-coverage-before-source-corrections-v2.json',
    ], {
      repoRoot: temp,
      validateCurrentIndex: async () => { validationCalled = true; },
    }), /reserved for a frozen before-correction report/);
    assert.equal(validationCalled, false);
    assert.equal(existsSync(join(temp, 'research/source-audit-batch5-monetary-condition-coverage-before-source-corrections-v2.json')), false);
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
});

test('the four DMG p.33 Info condition omissions remain pinned to the original source and exact indexed rows', () => {
  const before = JSON.parse(readFileSync(new URL('../research/source-audit-batch5-monetary-condition-coverage-before-source-corrections-v2.json', import.meta.url)));
  const contractDoc = JSON.parse(readFileSync(new URL('../research/source-audit-batch5-monetary-condition-contract-before-info4-v2.json', import.meta.url)));
  const contract = contractDoc.contracts[0];
  assert.equal(contract.reviewStatus, 'confirmed-source-condition-omission-before-repair');
  assert.equal(contract.expectedSourceFieldPointer, '/conditions');
  assert.equal(contract.source.printedPage, 33);
  assert.equal(contract.source.pdfPage, 34);
  assert.equal(contract.rows.length, 4);
  assert.equal(before.denominators.indexedSourceOccurrences, 1871);
  assert.equal(before.denominators.indexedValueClaims, 2318);
  assert.equal(before.denominators.fullRowAuditRecords, 2161);
  assert.equal(before.denominators.auditRowsWithoutExactIndexedOccurrence, 436);
  assert.equal(before.explicitNoCorrespondingIndexQueue.length, 436);
  assert.equal(new Set(before.explicitNoCorrespondingIndexQueue.map(row => row.uid)).size, 436);
  assert.equal(before.denominators.indexOccurrencesWithoutExactAuditRow, 146);
  assert.equal(before.explicitIndexOccurrencesWithoutExactAuditQueue.length, 146);
  for (const row of contract.rows) {
    const occurrence = before.sourceOccurrences.find(item => item.sourceOccurrenceId === row.indexedOccurrence.sourceOccurrenceId);
    assert.ok(occurrence, row.recordId);
    assert.equal(occurrence.inventoryPointer, row.indexedOccurrence.inventoryPointer);
    assert.equal(occurrence.directFieldSnapshots.conditions.value, row.indexedOccurrence.conditions);
    assert.equal(occurrence.directFieldSnapshots.conditions.value, 'table time units: r rounds, h hours, d days; exact out-of-field cell is dash');
    assert.deepEqual(occurrence.directFieldSnapshots.qualifiers.value, []);
    assert.equal(occurrence.sourceArtifactPointers.inputArtifact.jsonPointer, row.sourceInput.jsonPointer);
    assert.equal(occurrence.sourceSemanticReview.startsWith('unassessed'), true);
  }
  assert.match(contract.automaticDetection, /none/);
  assert.match(before.sourceSemanticCompleteness, /no null, empty or absent field is an automatic negative pass/);
});
