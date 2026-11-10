import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {
  assertHirelingsCurrentSourceCohort,
  readHirelingsCurrentSourceInputs,
} from './helpers/hirelings-source-current-cohort.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const actualInputs = readHirelingsCurrentSourceInputs(repoRoot);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function assertMutationRejected(mutate, expectedError) {
  const candidate = structuredClone(actualInputs);
  mutate(candidate);
  assert.throws(() => assertHirelingsCurrentSourceCohort(candidate), expectedError);
}

test('actual current source identity passes the structural cohort guard', () => {
  assert.deepEqual(assertHirelingsCurrentSourceCohort(actualInputs), {
    sourceCommit: 'bc819621e49788260bb34ea47c1f7a8b35af6edf',
    owners: 1062,
    canonicalBindings: 5655,
    priorWholeBindings: 4931,
    addedBindings: 724,
    manualAdditions: 321,
    newRules: 48,
    sourceTableRows: 244,
    sourceCells: 343,
    historicalMechanicsReviews: 1215,
  });
});

test('new source row cells reject foreign binding metadata', () => {
  assertMutationRejected(candidate => {
    const rule = candidate.data.rules.find(item => item.id === 'dmg-hireling-table-t01');
    rule.table.rows[0].cells[0].evidenceBindings = [{
      collection: 'rules',
      itemId: 'dmg-hireling-table-t02',
      fieldPointer: '/table/rows/0/cells/0',
    }];
  }, /dmg-hireling-table-t01: whole new owner exact/);
});

test('new source notes reject unregistered metadata', () => {
  assertMutationRejected(candidate => {
    const rule = candidate.data.rules.find(item => item.id === 'dmg-hireling-table-t01');
    rule.table.sourceNotes[0].unregisteredReviewMetadata = {
      reviewStatus: 'field-target-reviewed',
      sourceValueStatus: 'source-value-independently-confirmed',
    };
  }, /dmg-hireling-table-t01: whole new owner exact/);
});

test('manual field review and source value cannot be promoted implicitly', () => {
  for (const [field, value, expectedError] of [
    ['reviewStatus', 'field-target-reviewed', /new field review remains pending/],
    ['sourceValueStatus', 'source-value-independently-confirmed', /new source values remain unassessed/],
  ]) {
    assertMutationRejected(candidate => {
      candidate.manual.bindings[930][field] = value;
    }, expectedError);
  }
});

test('original whole bindings cannot be duplicated or mutated', () => {
  assertMutationRejected(candidate => {
    candidate.inventory.fieldEvidenceBindings[4931] = structuredClone(
      candidate.inventory.fieldEvidenceBindings[0],
    );
  }, /all4931 original whole bindings preserved in relative order/);

  assertMutationRejected(candidate => {
    candidate.inventory.fieldEvidenceBindings[0].reviewStatus = 'field-target-pending';
  }, /all4931 original whole bindings preserved in relative order/);
});

test('installed portable CI caller preserves the current source-identity closure', () => {
  const fixturePath = 'research/source-cohort-ci/s2-native-source-cohort-fixture.json';
  const fixtureSha256 = 'a177714460e396c323feea8d202f6eede3d9321471edd9570e38d36254fff796';
  const targetManifestPath = 'research/source-cohort-ci/s2-target-asset-manifest-v1.json';
  const targetManifestSha256 = '653835d642d422609632b6f202d47e8c7b11eea85475201a810b3cd5af33bc67';
  const callerPath = 'tools/verify-installed-native-source-cohort-s2-v2.mjs';

  const fixtureBytes = readFileSync(resolve(repoRoot, fixturePath));
  const targetManifestBytes = readFileSync(resolve(repoRoot, targetManifestPath));
  assert.equal(sha256(fixtureBytes), fixtureSha256, 'exact reviewed portable fixture bytes');
  assert.equal(sha256(targetManifestBytes), targetManifestSha256, 'fixture-transitively-pinned target plan bytes');
  assert.equal(
    JSON.parse(fixtureBytes).sourceCohort.assetCopyPlan.sha256,
    targetManifestSha256,
    'the caller-pinned fixture transitively pins the portable target plan',
  );

  // The verifier accepts only checkout-relative outputs. Keep this receipt
  // mutable and outside the pinned inputs, then remove it after inspection.
  mkdirSync(resolve(repoRoot, 'artifacts/hirelings-source-cohort'), {recursive: true});
  const outputPath = `artifacts/hirelings-source-cohort/verification-${process.pid}-${randomUUID()}.json`;
  const absoluteOutputPath = resolve(repoRoot, outputPath);
  assert.equal(existsSync(absoluteOutputPath), false, 'new unique output path must not replace existing evidence');
  let verificationPassed = false;
  try {
    const stdout = execFileSync(process.execPath, [
      callerPath,
      '.',
      fixturePath,
      fixtureSha256,
      targetManifestPath,
      outputPath,
    ], {cwd: repoRoot, encoding: 'utf8'});
    const result = JSON.parse(readFileSync(absoluteOutputPath, 'utf8'));
    assert.equal(JSON.parse(stdout).status, 'pass');
    assert.equal(result.status, 'pass');
    assert.equal(result.activeInputsChanged, false);
    assert.equal(result.fixture.sha256, fixtureSha256);
    assert.equal(result.targetManifest.sha256, targetManifestSha256);
    assert.equal(result.nativeClosure.counts.owners, 48);
    assert.equal(result.nativeClosure.counts.allOwners, 1062);
    assert.equal(result.nativeClosure.counts.canonicalBindings, 5655);
    verificationPassed = true;
  } finally {
    if (verificationPassed) rmSync(absoluteOutputPath, {force: true});
  }
});
