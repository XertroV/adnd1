import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {createHirelingsNativeCohort} from './helpers/hirelings-source-current-cohort-kernel-v1.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const hFixtureBytes = readFileSync(resolve(repoRoot, 'tests/fixtures/hirelings-source-current-cohort-v1.json'));
const hFixtureSha256 = '62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f';
assert.equal(sha256(hFixtureBytes), hFixtureSha256, 'the historical H fixture remains byte-exact');
const hFixture = JSON.parse(hFixtureBytes);
const hM1Commit = '5c6a57386af372c7c0d89e342003a7edf68ca0dd';
const git = (...args) => execFileSync('git', args, {cwd: repoRoot, maxBuffer: 128 * 1024 * 1024});
const hM1Json = path => JSON.parse(git('show', `${hM1Commit}:${path}`));
const hM1RawInputs = Object.fromEntries(Object.entries(hFixture.sourceRawInputs).map(([path, expected]) => {
  const bytes = git('show', `${hM1Commit}:${path}`);
  assert.equal(sha256(bytes), expected, `${path}: exact H source8 byte at the immutable M1 preimage`);
  const source8Bytes = git('show', `${hFixture.sourceCommit}:${path}`);
  assert.equal(sha256(source8Bytes), expected, `${path}: exact original H source8 commit byte`);
  return [path, sha256(bytes)];
}));
const actualInputs = {
  data: hM1Json('dist/data.json'),
  inventory: hM1Json('research/price-source-inventory.json'),
  manual: hM1Json('research/field-evidence-bindings.json'),
  mechanics: hM1Json('research/mechanics-audit-progress.json'),
  sourceRawInputs: hM1RawInputs,
};
const historicalHKernel = createHirelingsNativeCohort(hFixtureBytes, hFixtureSha256);
const assertHirelingsCurrentSourceCohort = historicalHKernel.assertHirelingsCurrentSourceCohort;

function materializeHirelingsM1View() {
  const viewRoot=resolve(repoRoot,'..',`hirelings-m1-view-${process.pid}-${randomUUID()}`);
  mkdirSync(viewRoot,{recursive:false});
  const fixtureRoot=resolve(repoRoot,'research/source-cohort-ci');
  const portableFixture=JSON.parse(readFileSync(resolve(fixtureRoot,'s2-native-source-cohort-fixture.json'),'utf8'));
  const targetManifest=JSON.parse(readFileSync(resolve(fixtureRoot,'s2-target-asset-manifest-v1.json'),'utf8'));
  const writeGitFile=path=>{
    const target=resolve(viewRoot,path);mkdirSync(resolve(target,'..'),{recursive:true});
    writeFileSync(target,git('show',`${hFixture.sourceCommit}:${path}`));
  };
  for(const path of [
    'rules.json','citation-overrides.json','dist/data.json','dist/source-continuations.json',
    'research/citation-continuations.json','research/citation-evidence-seals.json',
    'research/field-evidence-bindings.json','research/mechanics-audit-progress.json',
    'research/price-source-inventory.json',
    ...portableFixture.baseline.unchangedSourceFiles.map(file=>file.path),
  ])writeGitFile(path);
  symlinkSync(resolve(repoRoot,'tools'),resolve(viewRoot,'tools'),'dir');
  mkdirSync(resolve(viewRoot,'dist/scans'),{recursive:true});
  symlinkSync(resolve(repoRoot,'dist/scans/dagger'),resolve(viewRoot,'dist/scans/dagger'),'dir');
  const liveVerified=resolve(repoRoot,'dist/scans/verified'),viewVerified=resolve(viewRoot,'dist/scans/verified');
  mkdirSync(viewVerified,{recursive:true});
  const targeted=new Set(targetManifest.files.map(file=>file.targetPath));
  for(const entry of readdirSync(liveVerified,{withFileTypes:true})){
    if(entry.isDirectory())continue;
    const relativePath=`dist/scans/verified/${entry.name}`,destination=resolve(viewRoot,relativePath),source=resolve(liveVerified,entry.name);
    if(targeted.has(relativePath))copyFileSync(source,destination);
    else symlinkSync(source,destination,'file');
  }
  mkdirSync(resolve(viewRoot,'research'),{recursive:true});
  symlinkSync(resolve(repoRoot,'research/source-cohort-ci'),resolve(viewRoot,'research/source-cohort-ci'),'dir');
  mkdirSync(resolve(viewRoot,'artifacts/hirelings-source-cohort'),{recursive:true});
  return viewRoot;
}

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
  const hView=materializeHirelingsM1View();
  const outputPath = `artifacts/hirelings-source-cohort/verification-${process.pid}-${randomUUID()}.json`;
  const absoluteOutputPath = resolve(hView, outputPath);
  assert.equal(existsSync(absoluteOutputPath), false, 'new unique output path must not replace existing evidence');
  try {
    const stdout = execFileSync(process.execPath, [
      callerPath,
      hView,
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
  } finally {
    rmSync(hView,{recursive:true,force:true});
  }
});
