// Bounded read-only proof for the proposed DMG175 successor registry/helper.
// --write-proposal can create only new files beside this script; it never writes active inputs.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildMonetarySourceIndex} from '../../../../tools/monetary-source-inventory.mjs';
import {validatePriceSourceInventory} from '../../../../tools/price-source-inventory.mjs';
import {monetarySourceRenderFrameRegistry} from '../../../../tools/monetary-source-render-frames.mjs';
import {
  EXPECTED_INTERPRETATION_IDS,
  EXPECTED_SCOPE_ROWS,
  HISTORICAL_REGISTER_PATH,
  HISTORICAL_REGISTER_SHA256,
  OLD_LOADER_PATH,
  OLD_LOADER_SHA256,
  PREDECESSOR_REGISTRY_PATH,
  PREDECESSOR_REGISTRY_SHA256,
  PROOF_PATH,
  SOURCE_INPUT_COMMIT,
  SOURCE_INPUT_TREE,
  SCOPE_INTERPRETATION_PATH,
  SCOPE_INTERPRETATION_SHA256,
  buildCurrentMonetarySourceQuestionProjection,
  validateCurrentMonetaryIndexDependencies,
  validateCurrentMonetarySourceQuestionProjection,
} from './dmg175-current-monetary-source-questions-research-v1.mjs';

const proposalDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(proposalDir, '../../../..');
const PREDECESSOR_SOURCE_COMMIT = '7314165d4e5b09772d2e4dee9a17e000ebc96c5b';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(resolve(root, path));
const json = path => JSON.parse(read(path));
const git = path => execFileSync('git', ['show', `${SOURCE_INPUT_COMMIT}:${path}`], {cwd: root, maxBuffer: 90 * 1024 * 1024});
const eq = (a, b, message) => assert.deepStrictEqual(a, b, message);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = message => { throw new Error(`DMG175 monetary provenance proof failed: ${message}`); };
const EXPECTED_VALIDATION_CHANGES = Object.freeze([
  'citation-overrides.json',
  'dist/books.js',
  'dist/data.json',
  'dist/scans/verified/equipment-phb-hammer.json',
  'dist/scans/verified/equipment-phb-javelin.json',
  'dist/scans/verified/equipment-ua-harpoon.json',
  'dist/scans/verified/rules-encounter-types.json',
  'equipment.json',
  'research/field-evidence-bindings.json',
]);
const EXPECTED_NEW_VALIDATION_PATHS = Object.freeze([
  'dist/scans/verified/rules-appendix-c-character-guidance.json',
  'dist/scans/verified/rules-appendix-c-character-levels.json',
  'dist/scans/verified/rules-appendix-c-character-subtable.json',
  'dist/scans/verified/rules-appendix-c-henchmen.json',
  'dist/scans/verified/rules-appendix-c-magic-item-notes.json',
  'dist/scans/verified/rules-appendix-c-magic-table-i.json',
  'dist/scans/verified/rules-appendix-c-magic-table-ii.json',
  'dist/scans/verified/rules-appendix-c-magic-table-iii.json',
  'dist/scans/verified/rules-appendix-c-magic-table-iv.json',
  'dist/scans/verified/rules-appendix-c-party-magic-distribution.json',
  'dist/scans/verified/rules-appendix-c-party-size.json',
]);
const sourceInputs = Object.freeze({
  canonical: 'research/price-source-inventory.json',
  equipment: 'equipment.json',
  equipmentBindings: 'research/equipment-source-row-bindings.json',
  uaSupplement: 'research/source-audit-batch5-ua-additional-prices.json',
  uaDescriptionSupplement: 'research/source-audit-batch5-price-description-records.json',
  phbDmgSupplement: 'research/source-audit-batch5-phb-dmg-additional-prices.json',
  priceDiscoverySupplement: 'research/source-audit-batch5-price-discovery-reconciliation.json',
  phbDmgPricePassageSupplement: 'research/source-audit-batch5-phb-dmg-price-passage-records.json',
});

function loadArtifact(path) {
  const bytes = read(path);
  return {path, sha256: sha(bytes), data: JSON.parse(bytes)};
}

function currentValidationArtifacts() {
  const paths = new Set([
    'dist/data.json', 'dist/books.js', 'equipment.json',
    'research/equipment-source-row-bindings.json', 'research/field-evidence-bindings.json',
    'citation-overrides.json', 'tools/monetary-source-render-frames.mjs',
    monetarySourceRenderFrameRegistry.path,
  ]);
  const scan = directory => {
    for (const entry of readdirSync(resolve(root, directory), {withFileTypes: true})) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) scan(path);
      else if (entry.isFile() && entry.name.endsWith('.json')) paths.add(path);
    }
  };
  scan('dist/scans');
  return [...paths].filter(path => existsSync(resolve(root, path))).sort().map(path => ({path, sha256: sha(read(path))}));
}

function makeInMemoryIndex() {
  const input = Object.fromEntries(Object.entries(sourceInputs).map(([key, path]) => [key, loadArtifact(path)]));
  const assembled = loadArtifact('dist/data.json');
  validatePriceSourceInventory(input.canonical.data, {data: assembled.data});
  input.validationArtifacts = currentValidationArtifacts();
  input.validationResult = {validator: 'validatePriceSourceInventory', status: 'passed'};
  const index = buildMonetarySourceIndex(input);
  return {index, bytes: Buffer.from(`${JSON.stringify(index, null, 2)}\n`)};
}

function exactObjectPayloadDelta(before, after, {canonicalSha, equipmentSha}) {
  const expected = structuredClone(before);
  const roots = new Map([
    ['research/price-source-inventory.json', canonicalSha],
    ['equipment.json', equipmentSha],
  ]);
  let rootChanges = 0, canonicalOccurrenceRefs = 0, canonicalClaimRefs = 0, equipmentClaimRefs = 0;
  for (const entry of expected.inputArtifacts) {
    if (!roots.has(entry.path)) continue;
    entry.sha256 = roots.get(entry.path);
    rootChanges++;
  }
  assert.equal(rootChanges, 2, 'only the canonical and equipment root input hashes may change');
  for (const [collection, rows] of [['sourceOccurrences', expected.sourceOccurrences], ['claims', expected.claims]]) {
    for (const row of rows) {
      const inputArtifact = row.provenance?.inputArtifact;
      if (!inputArtifact || !roots.has(inputArtifact.path)) continue;
      inputArtifact.sha256 = roots.get(inputArtifact.path);
      if (collection === 'sourceOccurrences' && inputArtifact.path === 'research/price-source-inventory.json') canonicalOccurrenceRefs++;
      if (collection === 'claims' && inputArtifact.path === 'research/price-source-inventory.json') canonicalClaimRefs++;
      if (collection === 'claims' && inputArtifact.path === 'equipment.json') equipmentClaimRefs++;
    }
  }
  const previousValidation = new Map(before.currentInputValidation.validationArtifacts.map(row => [row.path, row.sha256]));
  const nextValidation = new Map(after.currentInputValidation.validationArtifacts.map(row => [row.path, row.sha256]));
  const changedPaths = [...nextValidation].filter(([path, hash]) => previousValidation.has(path) && previousValidation.get(path) !== hash).map(([path]) => path).sort();
  const newPaths = [...nextValidation.keys()].filter(path => !previousValidation.has(path)).sort();
  const removedPaths = [...previousValidation.keys()].filter(path => !nextValidation.has(path)).sort();
  eq(changedPaths, [...EXPECTED_VALIDATION_CHANGES].sort(), 'changed validation artifact set');
  eq(newPaths, [...EXPECTED_NEW_VALIDATION_PATHS].sort(), 'new validation catalog set');
  eq(removedPaths, [], 'no validation artifacts removed');
  assert.equal(previousValidation.size, 1031);
  assert.equal(nextValidation.size, 1042);
  for (const [path, oldHash] of previousValidation) {
    const currentBytesHash = sha(read(path));
    assert.equal(nextValidation.get(path), currentBytesHash, `current validation artifact hash ${path}`);
    if (!EXPECTED_VALIDATION_CHANGES.includes(path)) assert.equal(oldHash, currentBytesHash, `unapproved validation artifact hash change ${path}`);
  }
  for (const path of newPaths) assert.equal(nextValidation.get(path), sha(read(path)), `new current validation catalog ${path}`);
  const allowedValidationHashes = new Set(EXPECTED_VALIDATION_CHANGES);
  const nextValidationByPath = new Map(after.currentInputValidation.validationArtifacts.map(row => [row.path, row]));
  const exactValidationArtifacts = expected.currentInputValidation.validationArtifacts.map(row => {
    const next = nextValidationByPath.get(row.path);
    return allowedValidationHashes.has(row.path) ? {path: row.path, sha256: next.sha256} : structuredClone(row);
  });
  for (const path of EXPECTED_NEW_VALIDATION_PATHS) {
    const next = nextValidationByPath.get(path);
    exactValidationArtifacts.push({path, sha256: next.sha256});
  }
  exactValidationArtifacts.sort((left, right) => left.path.localeCompare(right.path));
  expected.currentInputValidation.validationArtifacts = exactValidationArtifacts;
  assert.equal(canonicalOccurrenceRefs, 710);
  assert.equal(canonicalClaimRefs, 728);
  assert.equal(equipmentClaimRefs, 187);
  assert.equal(expected.sourceOccurrences.length, 1871);
  assert.equal(expected.claims.length, 2317);
  eq(after, expected, 'whole monetary index payload differs outside the provenance allowlist');
  eq(after.counts, before.counts, 'monetary claim counts changed');
  eq(after.denominators, before.denominators, 'monetary denominators changed');
  return {
    rootInputArtifactHashChanges: rootChanges,
    canonicalOccurrenceProvenanceHashChanges: canonicalOccurrenceRefs,
    canonicalClaimProvenanceHashChanges: canonicalClaimRefs,
    equipmentClaimProvenanceHashChanges: equipmentClaimRefs,
    validationArtifactCounts: {before: previousValidation.size, after: nextValidation.size},
    existingValidationArtifactHashChanges: changedPaths.map(path => ({path, before: previousValidation.get(path), after: nextValidation.get(path)})),
    newValidationCatalogs: newPaths.map(path => ({path, sha256: nextValidation.get(path)})),
    removedValidationArtifacts: removedPaths,
    wholePayloadDifferencesOutsideProvenance: 0,
  };
}

function frozenPredecessorRoot() {
  const frozenRoot = mkdtempSync(join(tmpdir(), 'dmg175-monetary-predecessor-'));
  const predecessorGit = path => execFileSync('git', ['show', `${PREDECESSOR_SOURCE_COMMIT}:${path}`], {cwd: root, maxBuffer: 90 * 1024 * 1024});
  const linkTree = (source, target) => {
    mkdirSync(target, {recursive: true});
    for (const entry of readdirSync(source, {withFileTypes: true})) {
      const from = resolve(source, entry.name), to = resolve(target, entry.name);
      if (entry.isDirectory()) linkTree(from, to);
      else symlinkSync(from, to, entry.isDirectory() ? 'dir' : 'file');
    }
  };
  for (const entry of readdirSync(root, {withFileTypes: true})) {
    if (['.git', 'research', 'tools'].includes(entry.name)) continue;
    symlinkSync(resolve(root, entry.name), resolve(frozenRoot, entry.name), entry.isDirectory() ? 'dir' : 'file');
  }
  linkTree(resolve(root, 'research'), resolve(frozenRoot, 'research'));
  const oldRegistry = JSON.parse(predecessorGit(PREDECESSOR_REGISTRY_PATH));
  const auditManifestBytes = predecessorGit('research/monetary-row-identity-findings.json');
  const auditManifest = JSON.parse(auditManifestBytes);
  const replacements = new Set([
    PREDECESSOR_REGISTRY_PATH,
    'research/monetary-row-identity-findings.json',
    'research/monetary-row-identity-reviews.json',
    'research/price-source-inventory.json',
    'research/monetary-source-inventory.json',
    ...Object.values(oldRegistry.currentInputs).map(ref => ref.path),
    oldRegistry.historicalRegister.path,
    oldRegistry.beforeFixture.path,
    oldRegistry.beforeQuestionRecords.path,
    oldRegistry.detectorClarification.path,
    oldRegistry.integrationReview.path,
    ...oldRegistry.sourceProofs.map(ref => ref.path),
    auditManifest.baseline.path,
    ...(auditManifest.extensions ?? []).map(ref => ref.path),
    ...(auditManifest.retainedUncertainties ? [auditManifest.retainedUncertainties.path] : []),
    ...(auditManifest.contextMigrationBridge ? [auditManifest.contextMigrationBridge.path] : []),
  ]);
  const oldReviews = JSON.parse(predecessorGit('research/monetary-row-identity-reviews.json'));
  for (const review of oldReviews.reviews ?? []) if (review.evidence?.path) replacements.add(review.evidence.path);
  const auditSource = predecessorGit('tools/monetary-row-identity-audit.mjs').toString('utf8');
  for (const match of auditSource.matchAll(/\['(?:canonical|ua|phbDmg|passages|descriptions|receipts|phbDmgCensus|uaCensus|monsterCensus)','(research\/[^']+)'\]/g)) replacements.add(match[1]);
  const replaceFromGit = path => {
    const target = resolve(frozenRoot, path);
    mkdirSync(dirname(target), {recursive: true});
    if (existsSync(target) || (() => { try { lstatSync(target); return true; } catch { return false; } })()) unlinkSync(target);
    writeFileSync(target, predecessorGit(path));
  };
  for (const path of replacements) replaceFromGit(path);
  const toolsArchive = execFileSync('git', ['archive', '--format=tar', PREDECESSOR_SOURCE_COMMIT, 'tools'], {cwd: root, maxBuffer: 32 * 1024 * 1024});
  execFileSync('tar', ['-x', '-C', frozenRoot], {input: toolsArchive, maxBuffer: 8 * 1024 * 1024});
  return frozenRoot;
}

async function compareLegacyProjectionToFrozenPredecessor(projection) {
  const frozenRoot = frozenPredecessorRoot();
  try {
    const oldModulePath = resolve(frozenRoot, OLD_LOADER_PATH);
    const oldBytes = readFileSync(oldModulePath);
    assert.equal(sha(oldBytes), OLD_LOADER_SHA256, 'frozen predecessor loader identity');
    const {loadCurrentMonetarySourceQuestions} = await awaitImport(oldModulePath);
    const previous = loadCurrentMonetarySourceQuestions({repoRoot: frozenRoot});
    const currentPayload = structuredClone(projection);
    const previousPayload = structuredClone(previous);
    const currentInputs = currentPayload.inputs;
    const previousInputs = previousPayload.inputs;
    delete currentPayload.registry;
    delete previousPayload.registry;
    delete currentPayload.inputs;
    delete previousPayload.inputs;
    delete currentPayload.sourceQuestions;
    delete currentPayload.questionCounts;
    eq(currentPayload, previousPayload, 'successor legacy eight-record projection payload must match frozen predecessor output');
    assert.equal(currentInputs.length, previousInputs.length + 2, 'new scope/proof references must be additive inputs');
    const replaceable = new Map([
      ['research/price-source-inventory.json', projection.inputs.find(ref => ref.path === 'research/price-source-inventory.json')],
      ['research/monetary-source-inventory.json', projection.inputs.find(ref => ref.path === 'research/monetary-source-inventory.json')],
    ]);
    assert.equal(currentInputs[0].path, 'research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json');
    assert.equal(currentInputs[0].sha256, projection.registry.sha256);
    for (let index = 1; index < previousInputs.length; index++) {
      const oldRef = previousInputs[index], newRef = currentInputs[index];
      if (replaceable.has(oldRef.path)) eq(newRef, replaceable.get(oldRef.path), `only migrated current-input hash may change: ${oldRef.path}`);
      else eq(newRef, oldRef, `legacy input reference must remain exact: ${oldRef.path}`);
    }
    eq(currentInputs.slice(previousInputs.length), [
      {path: SCOPE_INTERPRETATION_PATH, sha256: SCOPE_INTERPRETATION_SHA256},
      {path: PROOF_PATH, sha256: projection.inputs.at(-1).sha256},
    ], 'the two additive references are the unresolved scope interpretation and migration proof');
    return {legacyProjectionPayloadExact: true, oldInputPrefixExactExceptRegistryAndTwoCurrentHashRefs: true, predecessorInputs: previousInputs.length, additiveInputs: 2};
  } finally {
    rmSync(frozenRoot, {recursive: true, force: true});
  }
}

function awaitImport(path) { return import(pathToFileURL(path).href); }

async function runProductionLoaderReplay(registryBytes, proofBytes) {
  const testRoot = mkdtempSync(join(tmpdir(), 'dmg175-monetary-production-'));
  const linkTree = (source, target) => {
    mkdirSync(target, {recursive: true});
    for (const entry of readdirSync(source, {withFileTypes: true})) {
      const from = resolve(source, entry.name), to = resolve(target, entry.name);
      if (entry.isDirectory()) linkTree(from, to);
      else symlinkSync(from, to, 'file');
    }
  };
  try {
    for (const entry of readdirSync(root, {withFileTypes: true})) {
      if (['.git', 'research', 'tools'].includes(entry.name)) continue;
      symlinkSync(resolve(root, entry.name), resolve(testRoot, entry.name), entry.isDirectory() ? 'dir' : 'file');
    }
    linkTree(resolve(root, 'research'), resolve(testRoot, 'research'));
    linkTree(resolve(root, 'tools'), resolve(testRoot, 'tools'));
    const installFile = (target, bytes) => {
      mkdirSync(dirname(target), {recursive: true});
      try { unlinkSync(target); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
      writeFileSync(target, bytes);
    };
    const registryTarget = resolve(testRoot, 'research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json');
    installFile(registryTarget, registryBytes);
    const proofTarget = resolve(testRoot, PROOF_PATH);
    installFile(proofTarget, proofBytes);
    const helperPath = resolve(testRoot, 'tools/dmg175-current-monetary-source-questions-v1.mjs');
    installFile(helperPath, readFileSync(resolve(proposalDir, 'dmg175-current-monetary-source-questions-v1.mjs')));
    const {loadCurrentMonetarySourceQuestions} = await awaitImport(helperPath);
    const projection = loadCurrentMonetarySourceQuestions({repoRoot: testRoot});
    assert.equal(typeof projection?.then, 'undefined', 'production loader public API must stay synchronous');
    assert.equal(projection.records.length, 8);
    assert.equal(projection.counts.currentUnresolvedQuestions, 7);
    assert.equal(projection.sourceQuestions.length, 9);
    assert.deepStrictEqual(projection.questionCounts, {
      currentInterpretationQuestions: 7,
      independentSourceScopeQuestions: 2,
      distinctScopeRows: 9,
      currentUnresolvedQuestions: 9,
    });
    const outputDirectory = mkdtempSync(join(testRoot, 'isolated-cli-output-'));
    const outputPath = resolve(outputDirectory, 'current-source-questions.json');
    mkdirSync(dirname(outputPath), {recursive: true});
    const cliSummary = execFileSync(process.execPath, [helperPath, '--check', '--output', outputPath], {cwd: testRoot, encoding: 'utf8'});
    assert.deepStrictEqual(readFileSync(outputPath), Buffer.from(`${JSON.stringify(projection, null, 2)}\n`), 'CLI --output must write the complete projection');
    assert.match(cliSummary, /"currentUnresolvedQuestions":9/);
    return {status: 'passed', publicApi: 'synchronous', projectionRecords: 8, sourceQuestions: 9, scopeRows: 9, cliOutputPath: 'isolated temporary directory', completeProjectionWritten: true};
  } finally {
    rmSync(testRoot, {recursive: true, force: true});
  }
}

function expectReject(name, action, expectedError, controls) {
  let error = null;
  try { action(); } catch (caught) { error = caught; }
  if (!error || !String(error.message).includes(expectedError)) fail(`negative control did not reach its expected guard: ${name}; observed=${error?.message ?? 'no error'}`);
  controls.push({name, mutatedExistingField: true, rejected: true, expectedError});
}

async function runProjectionCanaries(projection, registry, audit) {
  const controls = [];
  const asyncMutation = async (name, mutation) => {
    let error = null, expectedError = '';
    try {
      const candidate = structuredClone(projection);
      expectedError = mutation(candidate);
      await validateCurrentMonetarySourceQuestionProjection(candidate, {repoRoot: root, registry, audit});
    } catch (caught) { error = caught; }
    if (!error || !String(error.message).includes(expectedError)) fail(`question/scope canary missed its expected semantic guard: ${name}; observed=${error?.message ?? 'no error'}`);
    controls.push({name, mutatedExistingField: true, rejected: true, expectedError});
  };
  await asyncMutation('question-id-mutation', candidate => { assert.equal(candidate.sourceQuestions[0].id, EXPECTED_INTERPRETATION_IDS[0]); candidate.sourceQuestions[0].id = 'mutated-question-id'; return 'all nine current question IDs and their order'; });
  await asyncMutation('question-order-mutation', candidate => { assert.deepStrictEqual(candidate.sourceQuestions.slice(0, 2).map(row => row.id), EXPECTED_INTERPRETATION_IDS.slice(0, 2)); [candidate.sourceQuestions[0], candidate.sourceQuestions[1]] = [candidate.sourceQuestions[1], candidate.sourceQuestions[0]]; return 'all nine current question IDs and their order'; });
  await asyncMutation('question-interpretation-mutation', candidate => { assert.equal(candidate.sourceQuestions[0].historicalQuestion.typedClaim.printedValue, 'no fixed gp amount'); candidate.sourceQuestions[0].historicalQuestion.typedClaim.printedValue = 'tampered interpretation'; return 'original question identities or unchanged current unresolved records'; });
  await asyncMutation('question-drop', candidate => { assert.equal(candidate.sourceQuestions.length, 9); candidate.sourceQuestions.pop(); return 'all nine current question IDs and their order'; });
  await asyncMutation('scope-id-mutation', candidate => { assert.equal(candidate.sourceQuestions[7].id, EXPECTED_SCOPE_ROWS[0].id); candidate.sourceQuestions[7].id = 'mutated-scope-id'; return 'all nine current question IDs and their order'; });
  await asyncMutation('scope-row-drop', candidate => { assert.equal(candidate.sourceQuestions[7].affectedAuditRows.length, 8); candidate.sourceQuestions[7].affectedAuditRows.pop(); return 'source scope question or affected row set changed'; });
  return controls;
}

async function runRegistryHashCanaries(helper, registry, afterIndex, indexBytes, audit) {
  const controls = [];
  const check = async (name, candidateRegistry) => {
    let error = null;
    try {
      await helper.buildCurrentMonetarySourceQuestionProjection({
        repoRoot: root, registry: candidateRegistry,
        registryBytes: Buffer.from(`${JSON.stringify(candidateRegistry, null, 2)}\n`),
        index: afterIndex, indexBytes, audit, researchOnly: true,
      });
    } catch (caught) { error = caught; }
    const expectedError = name === 'missing-successor-input-hash' ? 'current input identity or hash schema changed' : 'in-memory monetary index or canonical input hash is missing/stale';
    if (!error || !String(error.message).includes(expectedError)) fail(`registry canary missed its expected input-hash guard: ${name}; observed=${error?.message ?? 'no error'}`);
    controls.push({name, mutatedExistingField: true, rejected: true, expectedError});
  };
  const missing = structuredClone(registry);
  assert.match(missing.currentInputs.canonical.sha256, /^[a-f0-9]{64}$/);
  delete missing.currentInputs.canonical.sha256;
  await check('missing-successor-input-hash', missing);
  const stale = structuredClone(registry);
  assert.equal(stale.currentInputs.monetaryIndex.sha256, '563058d3fff815621cb00f5c38e6c6c1abde40b83a9148795b8989abfbbd1f53');
  stale.currentInputs.monetaryIndex.sha256 = '0'.repeat(64);
  await check('stale-successor-input-hash', stale);
  return controls;
}

function runIndexCanaries(beforeIndex, afterIndex, context) {
  const controls = [];
  const candidate = mutation => {
    const copy = structuredClone(afterIndex);
    mutation(copy);
    return copy;
  };
  for (const [name, mutation] of [
    ['monetary-value-mutation', index => { assert.equal(index.claims[0].valueSemantics.amount, 90); index.claims[0].valueSemantics.amount = 91; }],
    ['monetary-unit-mutation', index => { assert.equal(index.claims[0].valueSemantics.unit, 'as named'); index.claims[0].valueSemantics.unit = 'tampered-unit'; }],
    ['source-mapping-mutation', index => { assert.equal(index.claims[0].siteMapping.itemId, 'phb-banded-mail'); index.claims[0].siteMapping.itemId = 'tampered-source-mapping'; }],
    ['review-status-mutation', index => { assert.equal(index.claims[0].reviewStatus.independentSemanticReview, 'not-assessed-by-index'); index.claims[0].reviewStatus.independentSemanticReview = 'reviewed'; }],
  ]) {
    expectReject(name, () => exactObjectPayloadDelta(beforeIndex, candidate(mutation), context), 'whole monetary index payload differs outside the provenance allowlist', controls);
  }
  expectReject('duplicate-validation-artifact-row', () => exactObjectPayloadDelta(beforeIndex, candidate(index => { const row = index.currentInputValidation.validationArtifacts[0]; index.currentInputValidation.validationArtifacts.push(structuredClone(row)); }), context), 'whole monetary index payload differs outside the provenance allowlist', controls);
  expectReject('extra-validation-artifact-property', () => exactObjectPayloadDelta(beforeIndex, candidate(index => { const row = index.currentInputValidation.validationArtifacts[0]; assert.equal(Object.keys(row).sort().join(','), 'path,sha256'); row.unreviewed = true; }), context), 'whole monetary index payload differs outside the provenance allowlist', controls);
  const missing = structuredClone(afterIndex);
  assert.match(missing.inputArtifacts[0].sha256, /^[a-f0-9]{64}$/);
  delete missing.inputArtifacts[0].sha256;
  expectReject('missing-index-input-hash', () => validateCurrentMonetaryIndexDependencies(root, missing), 'missing or stale monetary index input hash', controls);
  const stale = structuredClone(afterIndex);
  assert.match(stale.currentInputValidation.validationArtifacts[0].sha256, /^[a-f0-9]{64}$/);
  stale.currentInputValidation.validationArtifacts[0].sha256 = '0'.repeat(64);
  expectReject('stale-index-input-hash', () => validateCurrentMonetaryIndexDependencies(root, stale), 'missing or stale monetary index input hash', controls);
  return controls;
}

function registrySuccessor(predecessor, canonicalSha, indexSha, proofSha = '0'.repeat(64)) {
  const registry = structuredClone(predecessor);
  registry.currentInputs.canonical.sha256 = canonicalSha;
  registry.currentInputs.monetaryIndex.sha256 = indexSha;
  registry.dmg175SourceInputMigration = {
    artifactType: 'bounded-DMG175 source current-input provenance migration',
    sourceInputCommit: SOURCE_INPUT_COMMIT,
    sourceInputTree: SOURCE_INPUT_TREE,
    predecessor: {path: PREDECESSOR_REGISTRY_PATH, sha256: PREDECESSOR_REGISTRY_SHA256},
    beforeCanonicalSha256: predecessor.currentInputs.canonical.sha256,
    afterCanonicalSha256: canonicalSha,
    beforeMonetaryIndexSha256: predecessor.currentInputs.monetaryIndex.sha256,
    afterMonetaryIndexSha256: indexSha,
    proof: {path: PROOF_PATH, sha256: proofSha},
    scope: 'Only the canonical and equipment input provenance references and enumerated current validation artifact hashes change. Historical questions, derived interpretation, source proofs, source values, units, source mappings, row identities and review states remain exact.',
  };
  return registry;
}

async function run() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const tree = execFileSync('git', ['rev-parse', `${SOURCE_INPUT_COMMIT}^{tree}`], {cwd: root, encoding: 'utf8'}).trim();
  assert.equal(tree, SOURCE_INPUT_TREE, 'source tree identity');
  execFileSync('git', ['merge-base', '--is-ancestor', SOURCE_INPUT_COMMIT, head], {cwd: root, stdio: 'ignore'});

  const built = makeInMemoryIndex();
  const activeIndexBytes = read('research/monetary-source-inventory.json');
  assert.deepStrictEqual(activeIndexBytes, built.bytes, 'root-generated active monetary index must equal the read-only in-memory build');
  const afterIndex = JSON.parse(built.bytes);
  const beforeIndexBytes = git('research/monetary-source-inventory.json');
  const beforeIndex = JSON.parse(beforeIndexBytes);
  const oldRegistryBytes = git(PREDECESSOR_REGISTRY_PATH);
  const predecessorBytes = read(PREDECESSOR_REGISTRY_PATH);
  assert.deepStrictEqual(predecessorBytes, oldRegistryBytes, 'predecessor registry current bytes differ from the exact source commit');
  assert.equal(sha(predecessorBytes), PREDECESSOR_REGISTRY_SHA256);
  assert.equal(sha(beforeIndexBytes), 'ecd93e4f6daa54e0f60676c0bc8b53985d815a14641365a118e2a8998997468f');
  assert.equal(sha(activeIndexBytes), '563058d3fff815621cb00f5c38e6c6c1abde40b83a9148795b8989abfbbd1f53');
  const canonicalSha = sha(read('research/price-source-inventory.json'));
  const equipmentSha = sha(read('equipment.json'));
  assert.equal(canonicalSha, '678e1bd62bedc4523b21958825e4d9a205eaa333521ce28ebc506d3983ba96b8');
  assert.equal(equipmentSha, '714d40b9ed9908a069fddc08525d43437c9e974b984572eb1c505c37ee8cae95');
  const indexDelta = exactObjectPayloadDelta(beforeIndex, afterIndex, {canonicalSha, equipmentSha});
  assert.equal(afterIndex.sourceOccurrences.length, 1871);
  assert.equal(afterIndex.claims.length, 2317);

  const predecessor = JSON.parse(predecessorBytes);
  const provisional = registrySuccessor(predecessor, canonicalSha, sha(activeIndexBytes));
  const helper = await import(pathToFileURL(resolve(proposalDir, 'dmg175-current-monetary-source-questions-research-v1.mjs')).href);
  const {loadMonetaryRowIdentityAudit} = await import(pathToFileURL(resolve(root, 'tools/monetary-row-identity-audit.mjs')).href);
  const audit = loadMonetaryRowIdentityAudit({repoRoot: root});
  const provisionalBytes = Buffer.from(`${JSON.stringify(provisional, null, 2)}\n`);
  const projection = await helper.buildCurrentMonetarySourceQuestionProjection({
    repoRoot: root, registry: provisional, registryBytes: provisionalBytes,
    index: afterIndex, indexBytes: activeIndexBytes, audit, researchOnly: true,
  });
  const legacyCompatibility = await compareLegacyProjectionToFrozenPredecessor(projection);
  const questionControls = await runProjectionCanaries(projection, provisional, audit);
  const indexControls = runIndexCanaries(beforeIndex, afterIndex, {canonicalSha, equipmentSha});
  const registryControls = await runRegistryHashCanaries(helper, provisional, afterIndex, activeIndexBytes, audit);
  const scopeRows = projection.sourceQuestions.slice(7).map(question => ({
    id: question.id,
    status: question.status,
    interpretation: question.interpretation,
    extractionRepresentation: question.extractionRepresentation,
    affectedRows: question.affectedAuditRows.map(row => row.uid),
  }));
  const currentQuestionCounts = {
    historicalRegisteredQuestions: projection.counts.historicalRegisteredQuestions,
    currentInterpretationQuestions: projection.questionCounts.currentInterpretationQuestions,
    independentSourceScopeQuestions: projection.questionCounts.independentSourceScopeQuestions,
    derivedAdjudications: projection.counts.derivedAdjudications,
    sourceScopeRows: projection.questionCounts.distinctScopeRows,
    currentUnresolvedQuestions: projection.questionCounts.currentUnresolvedQuestions,
  };
  assert.deepStrictEqual(currentQuestionCounts, {
    historicalRegisteredQuestions: 8,
    currentInterpretationQuestions: 7,
    independentSourceScopeQuestions: 2,
    derivedAdjudications: 1,
    sourceScopeRows: 9,
    currentUnresolvedQuestions: 9,
  });
  assert.deepStrictEqual(projection.sourceQuestions.map(question => question.id), [
    ...EXPECTED_INTERPRETATION_IDS,
    ...EXPECTED_SCOPE_ROWS.map(row => row.id),
  ]);
  assert.deepStrictEqual(scopeRows.map(question => question.affectedRows), EXPECTED_SCOPE_ROWS.map(row => [...row.uids]));

  const rootProof = json('research/source-audit-pass8-dmg175-actual-mechanics-scan-replay-v1.json');
  const rootProofBytes = read('research/source-audit-pass8-dmg175-actual-mechanics-scan-replay-v1.json');
  assert.equal(sha(rootProofBytes), '52d387687727e8dd9916e291a023780e3b59eacea2ce9c9441201dde98b81785');
  assert.equal(rootProof.mechanics.sha256, '0fe09edf9fe2b37874f3acb4488b439bf5efca2dd2f355107eadb218373c84c6');
  assert.equal(rootProof.sourceScan.sha256, '5e3da176c59258d3e4440112eecd5009bbb459f70fd6b38f1e2f8738cda57a26');
  const manualTargetBytes = read('research/source-audit-pass8-dmg175-manual-target-denominators-v1.json');
  assert.equal(sha(manualTargetBytes), '18bd91fdab975ab8957e3ecdd66f8433ae03ac9325d0d43da8deed3fbbe164e0');
  const manualTarget = JSON.parse(manualTargetBytes);
  assert.equal(manualTarget.proseTargetBindings, 33);
  assert.equal(manualTarget.proseDistinctOwnerFields, 21);
  assert.equal(manualTarget.newAppendixCCardProse.distinctOwnerBulletFields, 19);
  assert.equal(manualTarget.existingEncounterCardProse.distinctOwnerBulletFields, 2);

  const report = {
    schemaVersion: 1,
    artifactType: 'bounded DMG175 monetary current-input provenance migration proof',
    status: 'research-only successor; exact source commit and in-memory monetary payload checked',
    semanticPass: false,
    generalSourceReviewPending: true,
    wholePayloadProvenanceOnly: true,
    sourceInputCommit: SOURCE_INPUT_COMMIT,
    sourceInputTree: SOURCE_INPUT_TREE,
    sourceArtifacts: {
      rawDataSha256: sha(read('dist/data.json')),
      parsedDataSha256: sha(Buffer.from(JSON.stringify(JSON.parse(read('dist/data.json'))))),
      booksSha256: sha(read('dist/books.js')),
      canonicalInventorySha256: canonicalSha,
      equipmentSha256: equipmentSha,
      mechanicsScanReplay: {path: 'research/source-audit-pass8-dmg175-actual-mechanics-scan-replay-v1.json', sha256: sha(rootProofBytes), mechanicsSha256: rootProof.mechanics.sha256, sourceScanSha256: rootProof.sourceScan.sha256},
      manualTargetDenominators: {path: 'research/source-audit-pass8-dmg175-manual-target-denominators-v1.json', sha256: sha(manualTargetBytes), proseBindings: manualTarget.proseTargetBindings, distinctProseFields: manualTarget.proseDistinctOwnerFields, newAppendixCFields: manualTarget.newAppendixCCardProse.distinctOwnerBulletFields, existingEncounterFields: manualTarget.existingEncounterCardProse.distinctOwnerBulletFields},
    },
    predecessorRegistry: {path: PREDECESSOR_REGISTRY_PATH, sha256: sha(predecessorBytes)},
    successorRegistry: {
      path: 'research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json',
      allowedPayloadDelta: [
        '/currentInputs/canonical/sha256',
        '/currentInputs/monetaryIndex/sha256',
        '/dmg175SourceInputMigration',
      ],
      allOtherCompleteRegistryPayloadExact: true,
      originalEightDispositionsExact: same(provisional.dispositions, predecessor.dispositions),
      sourceProofsAndIndependentReviewExact: same(provisional.sourceProofs, predecessor.sourceProofs) && same(provisional.integrationReview, predecessor.integrationReview),
      canonicalSha256: canonicalSha,
      monetaryIndexSha256: sha(activeIndexBytes),
    },
    beforeIndex: {path: 'research/monetary-source-inventory.json', sourceCommit: SOURCE_INPUT_COMMIT, sha256: sha(beforeIndexBytes)},
    afterIndex: {path: 'research/monetary-source-inventory.json', sha256: sha(activeIndexBytes)},
    afterCanonical: {path: 'research/price-source-inventory.json', sha256: canonicalSha},
    inMemoryBuild: {
      method: 'buildMonetarySourceIndex plus read-only validatePriceSourceInventory; serialized bytes compared against the root-generated active index',
      serializedIndexMatchesActiveBytes: true,
      sourceOccurrences: afterIndex.sourceOccurrences.length,
      claims: afterIndex.claims.length,
      monetaryAmountClaims: afterIndex.counts.monetaryAmountClaims,
      monetaryClaimRecords: afterIndex.counts.monetaryClaimRecords,
      denominatorsExact: same(afterIndex.denominators, beforeIndex.denominators),
      ...indexDelta,
    },
    currentQuestionCounts,
    legacyCompatibility,
    currentQuestionIdsInOrder: projection.sourceQuestions.map(question => question.id),
    sourceScopeQuestions: scopeRows,
    questionInterpretationsExact: true,
    sourceScopeIdsAndNineAffectedRowsExact: true,
    derivedMammothAdjudication: {
      id: 'relative-monetary-reading-mm-mammoth-tusks-relative',
      value: projection.records.find(row => row.currentDisposition === 'source-backed-derived-valuation').derivedValue,
      sourcePrintedValuePass: false,
      independentIntegrationReview: 'confirmed',
      remainsOutsideNineOpenQuestionRows: true,
    },
    negativeControls: {
      wholePayload: indexControls,
      questionAndScope: questionControls,
      registryInputs: registryControls,
      allPassed: [...indexControls, ...questionControls, ...registryControls].every(row => row.rejected),
    },
    acceptanceBoundary: {
      proposedHelperProjectionValidatedAgainstCurrentIndex: true,
      productionRegistryInstalledAtTargetPath: false,
      productionCallerImportApplied: false,
      fullNodeSuiteRun: false,
      workflow24BlocksRun: false,
      newMonetaryOrSourceValueGrades: 0,
      semanticPass: false,
      generalSourceReviewPending: true,
      wholePayloadProvenanceOnly: true,
    },
  };
  if (!report.negativeControls.allPassed) fail('negative control set is incomplete');
  const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  const reportSha = sha(reportBytes);
  const successor = registrySuccessor(predecessor, canonicalSha, sha(activeIndexBytes), reportSha);
  const successorBytes = Buffer.from(`${JSON.stringify(successor, null, 2)}\n`);
  const productionReplay = await runProductionLoaderReplay(successorBytes, reportBytes);
  const finalProjection = await helper.buildCurrentMonetarySourceQuestionProjection({
    repoRoot: root, registry: successor, registryBytes: successorBytes,
    index: afterIndex, indexBytes: activeIndexBytes, audit, proofBytes: reportBytes, researchOnly: true,
  });
  await validateCurrentMonetarySourceQuestionProjection(finalProjection, {repoRoot: root, registry: successor, audit});
  const canarySummary = {
    schemaVersion: 1,
    artifactType: 'DMG175 monetary proposal negative control results',
    sourceInputCommit: SOURCE_INPUT_COMMIT,
    wholePayload: indexControls,
    questionAndScope: questionControls,
    registryInputs: registryControls,
    productionHelperReplay: productionReplay,
    inputHashControls: [...indexControls, ...registryControls].filter(row => row.name.includes('input-hash')),
    allPassed: [...indexControls, ...questionControls, ...registryControls].every(row => row.rejected),
    semanticPass: false,
  };
  assert.equal(successor.dmg175SourceInputMigration.proof.sha256, reportSha);

  const outputs = [
    ['monetary-provenance-migration-proof-v1.json', reportBytes],
    ['source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json', successorBytes],
    ['negative-controls-v1.json', Buffer.from(`${JSON.stringify(canarySummary, null, 2)}\n`)],
  ];
  if (process.argv.includes('--write-proposal')) {
    for (const [name, bytes] of outputs) writeFileSync(resolve(proposalDir, name), bytes, {flag: 'wx'});
  } else {
    for (const [name, expected] of outputs) {
      const actual = readFileSync(resolve(proposalDir, name));
      assert.deepStrictEqual(actual, expected, `proposal output differs: ${name}`);
    }
  }
  process.stdout.write(`${JSON.stringify({status: 'bounded-proposal-proof-passed', sourceInputCommit: SOURCE_INPUT_COMMIT, indexSha256: sha(activeIndexBytes), occurrences: afterIndex.sourceOccurrences.length, claims: afterIndex.claims.length, validationHashChanges: indexDelta.existingValidationArtifactHashChanges.length, newValidationCatalogs: indexDelta.newValidationCatalogs.length, currentQuestionCounts, negativeControlsPassed: indexControls.length + questionControls.length + registryControls.length, productionHelperReplay: productionReplay, outputMode: process.argv.includes('--write-proposal') ? 'proposal-artifacts-created' : 'proposal-artifacts-reproduced'}, null, 2)}\n`);
}

run().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
