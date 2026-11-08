import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtempSync, rmSync, readdirSync} from 'node:fs';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateContinuationSnapshot} from '../tools/continuation-candidates-validate.mjs';

const root = path.resolve('.');
const summaryPath = path.join(root, 'research/source-audit-batch5-continuation.json');
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const fullPath = path.join(path.dirname(summaryPath), summary.fullEvidence.path);
const full = JSON.parse(gunzipSync(readFileSync(fullPath)).toString('utf8'));

test('source comparison snapshot is hash-bound and CI validation needs no private PDFs', () => {
  const report = validateContinuationSnapshot({root, summaryPath, fullPath, treeSelection: 'pinned-git-commit'});
  assert.equal(report.valid, true, JSON.stringify(report.errors.slice(0, 5)));
  assert.equal(report.requestedValidationMode, 'pinned-git-commit');
  assert.equal(report.validationBase, 'pinned-git-tree');
  assert.match(report.sourcePdfRegeneration, /unavailable-in-CI/);
  assert.equal(report.counts.catalogFiles, 1013);
  assert.equal(report.counts.catalogRegionRows, 2742);
  assert.deepEqual(report.counts.exposedCatalogBindings, {sourceExcerpts: 993, scanVerification: 20});
  assert.deepEqual(report.counts.regionBindingUses, {sourceExcerpts: 2666, scanVerification: 76});
  assert.equal(report.counts.propertyPointers, 169061);
  assert.equal(report.counts.mechanicsFields, 13418);
  assert.equal(summary.input.gitCommit, '679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.equal(summary.input.sourceDirectoryWasPrivateInput, true);
  assert.ok(Object.values(summary.input.sources).every(source => source.hashMatchesCatalogSource === true));
});

test('default and force-current validation never fall back to a historical Git tree', () => {
  const report = validateContinuationSnapshot({root, summaryPath, fullPath});
  assert.equal(report.requestedValidationMode, 'current-worktree');
  assert.equal(report.validationBase, 'current-worktree');
  assert.ok(report.errors.some(error => ['stale-data-input', 'stale-catalog-hash', 'stale-catalog-universe', 'catalog-file-count-stale'].includes(error.code)), 'baseline evidence must be compared to present files, not accepted from its historical commit');

  const outputDir = mkdtempSync(path.join(os.tmpdir(), 'continuation-validation-'));
  try {
    const cli = spawnSync('node', ['tools/continuation-candidates-validate.mjs', '--summary', summaryPath, '--full', fullPath, '--output-dir', outputDir, '--repo-root', root, '--force-current-tree'], {cwd: root, encoding: 'utf8'});
    assert.equal(cli.status, 1, cli.stdout + cli.stderr);
    assert.match(cli.stdout, /"validationBase":"current-worktree"/);
    assert.deepEqual(new Set(readdirSync(outputDir)), new Set(['source-audit-batch5-continuation-full.json.gz', 'source-audit-batch5-continuation.json', 'validation.json', 'validation.md']));
  } finally {
    rmSync(outputDir, {recursive: true, force: true});
  }
});

test('CLI requires an explicit current-tree or historical-tree choice', () => {
  const cli = spawnSync('node', ['tools/continuation-candidates-validate.mjs', '--summary', summaryPath, '--output-dir', os.tmpdir()], {cwd: root, encoding: 'utf8'});
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /Choose exactly one/);
});

test('generic text geometry finds PHB p.70 present-but-unlinked continuation crops across every exposed owner', () => {
  const cases = summary.pairedCropFlowCandidates.filter(candidate => candidate.book === 'PHB' && candidate.printedPage === 70 && candidate.openingRegion.regionId === 'phb-70-bebc3ac3e6bdc455' && candidate.continuationRegion.regionId === 'phb-70-16f42449b4d7283c');
  assert.equal(cases.length, 6, 'all current catalog owners of the pair should be inventoried');
  assert.ok(cases.every(candidate => candidate.groupStatus === 'both-current-regions-present-but-no-declared-linked-group'));
  const owners = new Set(cases.flatMap(candidate => candidate.recordBindingOwners));
  assert.deepEqual([...owners].sort(), [
    'spells:phb-illusionist-improved-invisibility',
    'spells:phb-illusionist-invisibility',
    'spells:phb-illusionist-invisibility-10-radius',
    'spells:phb-magic-user-invisibility',
    'spells:phb-magic-user-invisibility-10-radius',
    'spells:phb-magic-user-mass-invisibility',
  ]);
  assert.ok(cases.every(candidate => candidate.sourceFlowCues.some(cue => cue.kind === 'same-page-column-opening-candidate')));
  assert.equal(full.input.continuationManifestSha256, summary.input.continuationManifestSha256);
  assert.equal(full.pairedCropFlowCandidates.filter(candidate => candidate.book === 'PHB' && candidate.printedPage === 70 && candidate.groupStatus === 'both-current-regions-present-but-no-declared-linked-group').length, 6);
});

test('source-pixel review preserves full elevated queue and detector-missed continuation evidence', () => {
  const reviewPath = path.join(root, 'research/source-audit-batch5-continuation-review.json');
  const reviewBytes = readFileSync(reviewPath);
  const review = JSON.parse(reviewBytes.toString('utf8'));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(review.input.gitCommit, '679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.equal(review.input.baselineSummarySha256, sha(readFileSync(summaryPath)));
  assert.equal(review.input.fullNumericEvidenceSha256, sha(readFileSync(fullPath)));
  assert.equal(review.sourcePageReviews.length, 73, 'the report must retain all elevated page groups');
  assert.equal(review.sourcePageReviews.filter(page => page.disposition === 'present-but-unlinked').length, 20);
  assert.equal(review.sourcePageReviews.filter(page => page.disposition === 'uncertain').length, 53);
  assert.equal(review.regionReviews.length, 887);
  assert.equal(review.regionReviews.filter(region => region.disposition === 'present-but-unlinked').length, 58);
  assert.equal(review.regionReviews.filter(region => region.disposition === 'uncertain').length, 829);
  assert.equal(review.sourcePairReviews.length, 32);
  assert.equal(review.sourcePairReviews.filter(pair => pair.detectionStatus?.startsWith('manual-source-review-addition')).length, 3);
  assert.equal(review.dispositionCounts.confirmedMissingPassageRows, 0);
  assert.equal(review.dispositionCounts.notAssessableCropGeometryRows, 249);
  assert.ok(review.sourcePageReviews.every(page => ['uncertain', 'present-but-unlinked', 'sufficient-existing-context-or-false-cue'].includes(page.disposition)));
  assert.ok(review.regionReviews.every(region => ['uncertain', 'present-but-unlinked', 'sufficient-existing-context-or-false-cue'].includes(region.disposition)));
  assert.ok(review.sourcePairReviews.every(pair => pair.textIncluded === false));

  const invisibilityGroups = review.proposedContinuationGroups.filter(group => group.source?.book === 'PHB' && group.source.printedPage === 70);
  assert.equal(invisibilityGroups.length, 6);
  assert.ok(invisibilityGroups.every(group => group.proposedOnly === true && group.segments.length === 2));
  const elvenPage = review.sourcePageReviews.find(page => page.book === 'UA' && page.printedPage === 10);
  assert.equal(elvenPage.disposition, 'present-but-unlinked');
  assert.equal(review.sourcePageReviews.find(page => page.book === 'UA' && page.printedPage === 60).disposition, 'present-but-unlinked');
  const elvenGroup = review.proposedContinuationGroups.find(group => group.id === 'ua10-elven-subrace-description-continuation');
  assert.deepEqual(elvenGroup.segments.map(segment => segment.regionId), ['ua-10-391dc1287b053d98', 'ua-10-0f52a85b943013cf']);
  const contingency = review.proposedContinuationGroups.find(group => group.id === 'ua59-magic-user-contingency-page-continuation');
  assert.deepEqual(contingency.segments.map(segment => segment.printedPage), [59, 60]);
});

test('historical positives, approved current whole-spell crop, reviewed negative and not-assessable regions remain separate', () => {
  const controls = full.historicalControls.controls;
  const abjure = controls.find(control => control.id === 'ua-cleric-abjure-ua-37' && control.type === 'historical-positive-known-omitted-segment');
  assert.ok(abjure);
  assert.equal(abjure.historicalDetectorCalibration.historicalContinuationManifest, 'absent-at-historical-commit');
  assert.equal(abjure.historicalDetectorCalibration.genericDetectorUsesManifest, false);
  assert.ok(abjure.historicalDetectorCalibration.historicalMissingOrders.includes(2));
  const oldAbjurePage = abjure.historicalDetectorCalibration.sourcePages.find(page => page.book === 'UA' && page.printedPage === 37);
  assert.equal(oldAbjurePage.historicalCatalogRegionCountOnPage, 1, 'the pre-fix catalog exposed only the opening on UA p.37');
  assert.ok(oldAbjurePage.samePageColumnCandidates.some(candidate => candidate.confidence === 'elevated-geometry-plus-endpoint-cue'), 'generic page text/geometry should emit an elevated cue without a manifest');
  assert.equal(abjure.historicalDetectorCalibration.semanticReviewRequired, true);
  assert.ok(controls.some(control => control.id === 'charging-melee-dmg-66' && control.type === 'historical-positive-known-omitted-segment'));
  assert.ok(controls.some(control => control.id === 'animate-object-old-crop-right-edge' && control.expectedOldCrossingEdges?.includes('right') && control.expectedCorrectedCrossingEdges?.length === 0));
  assert.ok(controls.some(control => control.id === 'charging-dmg-page67-hypothesis' && control.type === 'historical-source-reviewed-negative'));
  assert.equal(summary.assessmentCounts.regionTextGeometryStatus['crop-geometry-missing-or-invalid'], 249);
  assert.ok(summary.assessmentCounts.noSignalInterpretation.includes('not a semantic pass'));

  const animate = full.regionAssessments.filter(region => region.book === 'PHB' && region.printedPage === 51 && region.regionId === 'phb-51-5f5f86d3cf71f766');
  assert.equal(animate.length, 2, 'the same source crop is exposed by Animate Object and Animate Rock');
  assert.ok(animate.every(region => !region.signals.includes('open-hyphenated-fragment-at-crop-bottom')));

  const p67 = full.sourcePageUniverse.find(page => page.book === 'DMG' && page.pdfPage === 68 && page.printedPagesBound.includes(67));
  assert.ok(p67, 'the negative-control target page is in the exposed source-page census');
  assert.ok(p67.adjacentPdfPageCandidates.every(candidate => candidate.semanticReviewRequired === true), 'generic adjacent-page shape cues remain candidates, including on a reviewed negative');
});

test('orthogonal detector precision delta is hash-bound and leaves source-pixel review immutable', () => {
  const deltaPath = path.join(root, 'research/source-audit-batch5-continuation-orthogonal-delta.json');
  const deltaBytes = readFileSync(deltaPath);
  const delta = JSON.parse(deltaBytes.toString('utf8'));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(delta.input.gitCommit, '679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.equal(delta.input.inputFilesEqualExceptDetectorCodeHash, true);
  assert.equal(delta.input.legacySummarySha256, sha(readFileSync(summaryPath)));
  assert.equal(delta.input.legacyFullEvidenceSha256, sha(readFileSync(fullPath)));
  assert.equal(delta.input.orthogonalSummarySha256, sha(readFileSync(path.join(root, delta.input.orthogonalSummaryPath))));
  assert.equal(delta.input.orthogonalFullEvidenceSha256, sha(readFileSync(path.join(root, delta.input.orthogonalFullEvidencePath))));
  assert.equal(delta.input.orthogonalDetectorSha256, sha(readFileSync(path.join(root, 'tools/continuation-candidates.py'))));
  assert.equal(delta.universe.reviewedElevatedPages, 73);
  assert.equal(delta.universe.reviewedRegionRows, 887);
  assert.equal(delta.universe.sourceReviewMutated, false);
  assert.deepEqual(delta.counts.regionsWithWordBoxCrossing, {before: 2257, after: 664, removed: 1593, added: 0});
  assert.deepEqual(delta.counts.regionsWithAnyCropSignal, {before: 2383, after: 1617, lostAllSignals: 766, added: 0, lostCrossingButRetainOtherCue: 827});
  assert.deepEqual(delta.ua60HistoricalControl.legacyCrossingEdges.wordBoxEdgeObservations, {left: 68, right: 1, top: 12, bottom: 12});
  assert.deepEqual(delta.ua60HistoricalControl.orthogonalCrossingEdges.wordBoxEdgeObservations, {left: 30, right: 0, top: 0, bottom: 0});
  assert.equal(delta.privateSourceTextIncluded, false);
});

test('CI reports changed data and catalog inputs as stale evidence', () => {
  const cleanData = readFileSync(path.join(root, 'dist/data.json'));
  const staleData = validateContinuationSnapshot({root, summaryPath, fullPath, dataBytesOverride: Buffer.concat([cleanData, Buffer.from(' ' )])});
  assert.equal(staleData.valid, false);
  assert.ok(staleData.errors.some(error => error.code === 'stale-data-input'));

  const catalogPath = 'scans/verified/rules-charging-melee.json';
  const currentCatalog = readFileSync(path.join(root, 'dist', catalogPath));
  const staleCatalog = validateContinuationSnapshot({root, summaryPath, fullPath, catalogBytesOverride: {[catalogPath]: Buffer.concat([currentCatalog, Buffer.from(' ')])}});
  assert.equal(staleCatalog.valid, false);
  assert.ok(staleCatalog.errors.some(error => error.code === 'stale-catalog-hash'));
});

test('numeric source geometry fixtures run without private PDFs', () => {
  const result = spawnSync('python3', ['tests/continuation-candidates-fixtures.py'], {cwd: root, encoding: 'utf8'});
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /Ran 7 tests/);
});
