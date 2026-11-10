// Bounded temporary-install check for the v2 exact-registry-byte loader closure.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';

const proposalDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(proposalDir, '../../../..');
const sourceDir = resolve(proposalDir, '../source-987a25d3ba2d');
const registryPath = 'research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json';
const proofPath = 'research/dmg175-source-metadata-v1/monetary-provenance-migration-proof-v1.json';
const reviewedRegistrySha = '56cd03c646e971adcd5f5240849b17606b9d07e2cc6b397a75cb75f7495efbe3';
const reviewedProofSha = '2a23bd6d7d9084e5b6f6ee61fd525b8d96ddae97499dac83d1e7252cad6f2a92';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const failMessage = 'Invalid DMG175 current monetary questions: successor registry raw bytes do not match the reviewed exact artifact';
const registryBytes = readFileSync(resolve(sourceDir, 'source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json'));
const proofBytes = readFileSync(resolve(sourceDir, 'monetary-provenance-migration-proof-v1.json'));
assert.equal(sha(registryBytes), reviewedRegistrySha, 'reviewed successor registry SHA');
assert.equal(sha(proofBytes), reviewedProofSha, 'reviewed migration proof SHA');

function linkTree(source, target) {
  mkdirSync(target, {recursive: true});
  for (const entry of readdirSync(source, {withFileTypes: true})) {
    const from = resolve(source, entry.name), to = resolve(target, entry.name);
    if (entry.isDirectory()) linkTree(from, to);
    else symlinkSync(from, to, 'file');
  }
}

const testRoot = mkdtempSync(join(tmpdir(), 'dmg175-exact-registry-v2-'));
const replaceTempFile = (target, bytes) => {
  mkdirSync(dirname(target), {recursive: true});
  try { unlinkSync(target); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  writeFileSync(target, bytes);
};
let result;
try {
  for (const entry of readdirSync(repoRoot, {withFileTypes: true})) {
    if (['.git', 'research', 'tools'].includes(entry.name)) continue;
    symlinkSync(resolve(repoRoot, entry.name), resolve(testRoot, entry.name), entry.isDirectory() ? 'dir' : 'file');
  }
  linkTree(resolve(repoRoot, 'research'), resolve(testRoot, 'research'));
  linkTree(resolve(repoRoot, 'tools'), resolve(testRoot, 'tools'));
  const tempRegistryPath = resolve(testRoot, registryPath);
  const tempProofPath = resolve(testRoot, proofPath);
  const tempHelperPath = resolve(testRoot, 'tools/dmg175-current-monetary-source-questions-v2.mjs');
  replaceTempFile(tempRegistryPath, registryBytes);
  replaceTempFile(tempProofPath, proofBytes);
  replaceTempFile(tempHelperPath, readFileSync(resolve(proposalDir, 'dmg175-current-monetary-source-questions-v2.mjs')));
  const {loadCurrentMonetarySourceQuestions} = await import(pathToFileURL(tempHelperPath).href);
  const baseline = loadCurrentMonetarySourceQuestions({repoRoot: testRoot});
  assert.equal(baseline.records.length, 8);
  assert.equal(baseline.sourceQuestions.length, 9);
  assert.equal(baseline.questionCounts.currentUnresolvedQuestions, 9);

  const originalRegistry = JSON.parse(registryBytes);
  const mutations = [
    ['migration-scope-mutation', candidate => {
      assert.equal(candidate.dmg175SourceInputMigration.scope, originalRegistry.dmg175SourceInputMigration.scope);
      candidate.dmg175SourceInputMigration.scope = 'tampered migration scope';
    }],
    ['migration-source-tree-mutation', candidate => {
      assert.equal(candidate.dmg175SourceInputMigration.sourceInputTree, 'd7ac09ce9abe4ef94ae355a44b8e0c5ca6f74ea3');
      candidate.dmg175SourceInputMigration.sourceInputTree = '0'.repeat(40);
    }],
    ['unexpected-registry-property', candidate => {
      assert.equal(Object.hasOwn(candidate, 'unreviewedProposalProperty'), false);
      candidate.unreviewedProposalProperty = {status: 'unreviewed'};
    }],
  ];
  const controls = [];
  for (const [name, mutate] of mutations) {
    const candidate = structuredClone(originalRegistry);
    mutate(candidate);
    const mutatedBytes = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`);
    replaceTempFile(tempRegistryPath, mutatedBytes);
    let caught = null;
    try { loadCurrentMonetarySourceQuestions({repoRoot: testRoot}); } catch (error) { caught = error; }
    assert.ok(caught, `${name} must reject`);
    assert.equal(caught.message, failMessage, `${name} must hit the exact raw-registry closure guard`);
    controls.push({name, existingFieldMutation: name !== 'unexpected-registry-property', rejected: true, exactError: caught.message});
    replaceTempFile(tempRegistryPath, registryBytes);
  }
  const helperBytes = readFileSync(resolve(proposalDir, 'dmg175-current-monetary-source-questions-v2.mjs'));
  result = {
    schemaVersion: 1,
    artifactType: 'bounded DMG175 exact successor registry loader v2 replay',
    status: 'passed',
    sourceInputCommit: '987a25d3ba2dcac0940569a2afab73f775e38028',
    successorRegistrySha256: reviewedRegistrySha,
    migrationProofSha256: reviewedProofSha,
    helperSha256: sha(helperBytes),
    temporaryInstall: {records: baseline.records.length, sourceQuestions: baseline.sourceQuestions.length, unresolvedQuestions: baseline.questionCounts.currentUnresolvedQuestions, noLiveOutputWrites: true},
    rawRegistryNegativeControls: controls,
    allControlsPassed: controls.length === 3 && controls.every(control => control.rejected && control.exactError === failMessage),
  };
  assert.equal(result.allControlsPassed, true);
} finally {
  rmSync(testRoot, {recursive: true, force: true});
}

const outputPath = resolve(proposalDir, 'exact-registry-loader-v2-replay-v1.json');
const reportBytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
if (process.argv.includes('--write-report')) writeFileSync(outputPath, reportBytes, {flag: 'wx'});
else assert.deepStrictEqual(readFileSync(outputPath), reportBytes, 'replay report must reproduce exactly');
process.stdout.write(`${JSON.stringify({status: result.status, helperSha256: result.helperSha256, registrySha256: result.successorRegistrySha256, baselineQuestions: result.temporaryInstall.sourceQuestions, negativeControls: result.rawRegistryNegativeControls.length, allControlsPassed: result.allControlsPassed}, null, 2)}\n`);
