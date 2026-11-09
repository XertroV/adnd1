import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builder = path.join(root, 'tools/source-audit-pass8-original-unit-join-v2.py');
const reportPath = path.join(root, 'research/source-audit-pass8-original-unit-join-review-v2.json');
const python = process.env.PYTHON || 'python3';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

function digestFile(relPath) {
  return createHash('sha256').update(readFileSync(path.join(root, relPath))).digest('hex');
}

function validateCandidate(candidate) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'unit-join-v2-'));
  const candidatePath = path.join(tempDir, 'candidate.json');
  try {
    writeFileSync(candidatePath, JSON.stringify(candidate));
    const result = spawnSync(python, [builder, '--validate-json', candidatePath], { encoding: 'utf8' });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function publicRelativePath(reportPath) {
  const aliases = new Map([
    ['/workspace/adnd1-phb-spell-guidance-repair/research/source-audit-pass8-phb-spell-guidance-author-proposal.json', 'research/source-audit-pass8-phb-spell-guidance-author-proposal.json'],
    ['research/source-completeness-coverage.json', 'research/source-audit-pass8-unit-census-input-ae36f43b.json'],
  ]);
  if (path.isAbsolute(reportPath)) {
    assert.ok(aliases.has(reportPath), `only exact documented absolute public paths are relocatable: ${reportPath}`);
    return aliases.get(reportPath);
  }
  return aliases.get(reportPath) ?? reportPath;
}

function makePublicOnlyCheckout(tempRoot) {
  assert.equal(report.reportRegistry.length, 37, 'isolated public check contains every pinned public report input');
  const included = new Set([
    'research/source-audit-pass8-original-unit-join-review.json',
    'research/source-audit-pass8-original-unit-join-review-v2.json',
    'tools/source-audit-pass8-original-unit-join-v2.py',
    ...report.reportRegistry.map(item => publicRelativePath(item.path)),
  ]);
  assert.ok(included.has('research/source-audit-pass8-unit-census-input-ae36f43b.json'));
  assert.equal(included.has('research/source-completeness-coverage.json'), false,
    'the historical census pin is materialized from its frozen alias, never the mutable path');
  for (const relPath of included) {
    const target = path.join(tempRoot, relPath);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(root, relPath), target);
  }
  return included;
}

test('v2 rebuild is byte-for-byte reproducible from pinned reports', () => {
  const unavailablePrivateSnapshot = path.join(os.tmpdir(), 'pass8-private-snapshot-deliberately-unavailable.gz');
  execFileSync(python, [builder, '--check'], {
    cwd: root,
    stdio: 'pipe',
    env: { ...process.env, PASS8_PRIVATE_SNAPSHOT_PATH: unavailablePrivateSnapshot },
  });
  assert.equal(digestFile('research/source-audit-pass8-original-unit-join-review.json'), report.priorReport.sha256);
  assert.equal(report.priorReport.sha256, '425bcf69ce1d44da3ffaecdc8da2993432251f51a36d2245011ae704e2de4865');
  assert.equal(digestFile('research/source-audit-pass8-mm-table-last14-assessments.json'), 'c16645e347a2e28de3d9c564734706accfb7f1dfc5cc92784ea5d8be693b686d');
  assert.equal(digestFile('research/source-audit-pass8-mm-first14-mixed-scope-independent-review-correction.json'), '94ec57094f21ca42a6877c4c185868b99a86986f16ec495bd9e6e4d2f7687082');
  assert.equal(digestFile('research/source-audit-pass8-phb-spell-guidance-author-proposal-v2.json'), '228890f8e00385f9145d2e853579755745f3ec511ad8c8afe095bd1faefd60e7');
});

test('default public check reproduces in an isolated checkout with all 37 report inputs only', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'unit-join-v2-public-only-'));
  const unavailablePrivateSnapshot = path.join(tempRoot, 'private-snapshot-not-in-checkout.gz');
  try {
    const included = makePublicOnlyCheckout(tempRoot);
    const result = spawnSync(python, [path.join(tempRoot, 'tools/source-audit-pass8-original-unit-join-v2.py'), '--check'], {
      cwd: tempRoot,
      encoding: 'utf8',
      env: { ...process.env, PASS8_PRIVATE_SNAPSHOT_PATH: unavailablePrivateSnapshot },
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.privateSnapshotVerification.status, 'not-run');
    assert.deepEqual(output.publicInputLocators.map(row => ({ requestedPath: row.requestedPath, resolvedPath: row.resolvedPath, sha256: row.sha256 })), [
      {
        requestedPath: '/workspace/adnd1-phb-spell-guidance-repair/research/source-audit-pass8-phb-spell-guidance-author-proposal.json',
        resolvedPath: 'research/source-audit-pass8-phb-spell-guidance-author-proposal.json',
        sha256: '1a3ed99095ff9d93c0f1f84d89c27cd239f02430ffb6db81c10b7ac126af423d',
      },
      {
        requestedPath: 'research/source-completeness-coverage.json',
        resolvedPath: 'research/source-audit-pass8-unit-census-input-ae36f43b.json',
        sha256: 'ae36f43b2e6ba63643d2c4a5a4fea34ddc494f3f10337a28a53040dfe8a9401d',
      },
    ]);
    assert.equal(included.size, 40, '37 registry reports plus the v1 input, v2 output, and builder');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('559 book-prefixed joins and bounded disposition categories reconcile', () => {
  assert.equal(report.unitJoins.length, 559);
  assert.equal(new Set(report.unitJoins.map(unit => unit.unitKey)).size, 559);
  assert.deepEqual(report.summary.unitsByBook, { PHB: 105, DMG: 60, UA: 36, MM: 317, MM2: 41 });
  assert.deepEqual(report.summary.overallDispositionCategoryCounts, {
    missing: 29,
    partial: 242,
    present: 6,
    citationonly: 6,
    excluded: 275,
    unassessable: 1,
  });
  assert.equal(report.census.completeSemanticSourceUnitCount, null);
  assert.equal(report.summary.semanticallyCompleteBooks, 0);
  assert.equal(report.summary.notACompletenessClaim, true);
});

test('review-state summaries equal all unit rows and keep source/search labels distinct', () => {
  for (const book of ['PHB', 'DMG', 'UA', 'MM', 'MM2']) {
    const counts = {};
    for (const unit of report.unitJoins.filter(row => row.book === book)) {
      counts[unit.reviewState] = (counts[unit.reviewState] || 0) + 1;
    }
    assert.deepEqual(report.summary.reviewStateCountsByBook[book], counts);
  }
  const phb = report.summary.reviewStateCountsByBook.PHB;
  assert.equal(phb['bounded review has an explicitly unassessable source reading'] || 0, 0);
  assert.equal(phb['bounded source assertions classified; live public-search findability unassessed'], 18);
  assert.deepEqual(report.summary.mmReviewStateBridge, {
    pendingBroaderAssertionWork: 57,
    queueScopeClosedButBroaderContentUnassessed: 14,
    combinedBroaderUnassessedOrPending: 71,
    meaning: 'Queue closure does not erase broader MM source assertion work; this derived sum keeps pending workflow and closed table/list work with broader content still unassessed distinct.',
  });
});

test('default public check works without private snapshot bytes; explicit offline verification fails closed', () => {
  const unavailablePath = path.join(os.tmpdir(), 'pass8-private-snapshot-deliberately-unavailable.gz');
  const env = { ...process.env, PASS8_PRIVATE_SNAPSHOT_PATH: unavailablePath };
  const missing = spawnSync(python, [builder, '--check', '--verify-private-snapshot'], { cwd: root, env, encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
  assert.match(`${missing.stdout}${missing.stderr}`, /cannot read|No such file|not found/i);

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'unit-join-private-snapshot-'));
  const wrongPath = path.join(tempDir, 'wrong.gz');
  try {
    writeFileSync(wrongPath, 'not the pinned private snapshot');
    const wrong = spawnSync(python, [builder, '--check', '--verify-private-snapshot', '--snapshot-path', wrongPath], { cwd: root, encoding: 'utf8' });
    assert.notEqual(wrong.status, 0);
    assert.match(`${wrong.stdout}${wrong.stderr}`, /private snapshot gzip bytes do not match/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('public search and source-image legibility remain separate dimensions', () => {
  const phbRows = report.unitJoins.filter(unit => unit.publicSearchDimension?.reportId === 'phb-ability-race');
  assert.equal(phbRows.length, 18);
  assert.ok(phbRows.every(unit => unit.publicSearchDimension.status === 'unassessable'));
  assert.ok(phbRows.every(unit => unit.sourceReadingDimension.status === 'no-explicit-unassessable-reading-recorded'));
  assert.equal(report.dimensionalSummary.sourceReading.phbAbilityRaceExplicitlyUnassessableReadings, 0);
  assert.deepEqual(report.dimensionalSummary.sourceReading.actualUnassessableSourceReadingCountsByBook, {
    PHB: 0, DMG: 1, UA: 1, MM: 0, MM2: 0,
  });
  assert.ok(report.unitJoins.find(unit => unit.unitKey === 'DMG:dmg-p11-edge-limited-glyphs').sourceReadingDimension.status === 'unassessable');
  assert.ok(report.unitJoins.find(unit => unit.unitKey === 'UA:ua-race-rules').sourceReadingDimension.status === 'unassessable');
});

test('MM table/profile closures retain separate operative child scopes', () => {
  assert.equal(report.closureSummary.mmTableQueue.candidateCount, 28);
  assert.equal(report.closureSummary.mmTableQueue.pendingAfterBoundedReview, 0);
  const scopes = report.boundedMMOperativeScopeDispositions;
  assert.deepEqual(new Set(scopes.horse.scopedDispositions.map(row => row.disposition)), new Set(['excluded', 'missing']));
  assert.deepEqual(new Set(scopes.dragon.scopedDispositions.map(row => row.disposition)), new Set(['excluded', 'missing', 'unassessable']));
  assert.deepEqual(new Set(scopes.elf.scopedDispositions.map(row => row.disposition)), new Set(['excluded', 'missing']));
  assert.deepEqual(new Set(scopes.golem.scopedDispositions.map(row => row.disposition)), new Set(['excluded', 'missing']));
  assert.equal(scopes['men-professions'].siteDisposition, 'absent');
  assert.equal(scopes['men-professions'].scopedDispositions[0].category, 'missing');
  assert.equal(scopes['men-professions'].scopedDispositions[1].category, 'unassessable');
  assert.equal(report.correctedMixedScopeDispositions.counts.missing, 6);
  assert.equal(report.correctedMixedScopeDispositions.counts.excluded, 4);
  assert.equal(report.correctedMixedScopeDispositions.counts.unassessable, 2);
});

test('PHB spell child adjudication rejects one false positive and preserves one Druid absence', () => {
  const adjudication = report.phbSpellGuidanceAdjudication;
  assert.deepEqual([
    adjudication.historicalPHBSpellCandidateCount,
    adjudication.sourceSupportedRepairProposalCount,
    adjudication.rejectedFalsePositiveCount,
    adjudication.newDruidSharedRuleProposalCount,
  ], [11, 10, 1, 1]);
  assert.equal(adjudication.sourceSupportedProposalIds.length, 10);
  assert.ok(!adjudication.sourceSupportedProposalIds.includes('word-of-recall-source-internal-weight-conflict'));
  assert.equal(adjudication.wordOfRecall.disposition, 'rejected-audit-false-positive');
  assert.equal(adjudication.wordOfRecall.noContentChange, true);
  assert.equal(adjudication.druidAbsentChild.disposition, 'absent');
  assert.equal(adjudication.druidAbsentChild.category, 'missing');
  assert.equal(adjudication.druidAbsentChild.currentDedicatedOwnerMatches, 0);
  assert.ok(adjudication.coarseSourceUnitStatuses.every(unit => unit.disposition === 'partial'));
});

test('negative control: an unqualified book ID is rejected', () => {
  const changed = structuredClone(report);
  changed.unitJoins[0].unitKey = changed.unitJoins[0].originalUnitId;
  const result = validateCandidate(changed);
  assert.notEqual(result.status, 0);
  assert.match(result.output, /unqualified\/misjoined ID/);
});

test('negative control: a missing primary report hash is rejected', () => {
  const changed = structuredClone(report);
  changed.unitJoins[0].primaryReportSha256 = null;
  const result = validateCandidate(changed);
  assert.notEqual(result.status, 0);
  assert.match(result.output, /primaryReportSha256 mismatch/);
});

test('negative control: promoting an unassessable PHB search result is rejected', () => {
  const changed = structuredClone(report);
  changed.unitJoins.find(unit => unit.unitKey === 'PHB:abilities-overview').publicSearchDimension.status = 'present';
  const result = validateCandidate(changed);
  assert.notEqual(result.status, 0);
  assert.match(result.output, /PHB public-search status was promoted or lost/);
});

test('negative control: erasing the corrected horse-load child status is rejected', () => {
  const changed = structuredClone(report);
  const load = changed.boundedMMOperativeScopeDispositions.horse.scopedDispositions.find(row => row.scope.includes('load'));
  load.disposition = 'excluded';
  load.category = 'excluded';
  const result = validateCandidate(changed);
  assert.notEqual(result.status, 0);
  assert.match(result.output, /horse profile exclusion and missing carrying-load table are not separated/);
});

test('negative control: stale PHB and MM review-state totals are rejected', () => {
  const stalePhb = structuredClone(report);
  stalePhb.summary.reviewStateCountsByBook.PHB['bounded review has an explicitly unassessable source reading'] = 18;
  const phbResult = validateCandidate(stalePhb);
  assert.notEqual(phbResult.status, 0);
  assert.match(phbResult.output, /review-state summary differs from actual per-unit rows/);

  const staleMm = structuredClone(report);
  staleMm.summary.reviewStateCountsByBook.MM['pending source or site assertion work remains in the referenced scope'] = 71;
  const mmResult = validateCandidate(staleMm);
  assert.notEqual(mmResult.status, 0);
  assert.match(mmResult.output, /review-state summary differs from actual per-unit rows/);
});
