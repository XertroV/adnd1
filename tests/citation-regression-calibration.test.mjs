import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {containsContext, focusCoversEvidence} from '../tools/citation-context-contract.mjs';
import {buildVisualCoverage, buildVisualCoverageCore} from '../tools/source-visual-coverage.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const manifest = readJson('research/citation-regression-calibration.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceViewer = readFileSync(new URL('../dist/source-viewer.js', import.meta.url), 'utf8');
const pageSize = (book, printedPage) => manifest.sourcePageDimensions[book][String(printedPage)];

function pointCornersToNormalizedXywh(bounds, size) {
  assert.equal(bounds.space, 'source-pdf-page');
  assert.equal(bounds.origin, 'top-left');
  assert.equal(bounds.units, 'points');
  assert.equal(bounds.format, 'x0-y0-x1-y1');
  const [x0, y0, x1, y1] = bounds.values;
  assert.ok(x1 > x0 && y1 > y0);
  return [x0 / size.widthPt, y0 / size.heightPt,
    (x1 - x0) / size.widthPt, (y1 - y0) / size.heightPt];
}

function baselineRect(artifactId) {
  const artifact = manifest.gitBaselineArtifacts.find(item => item.id === artifactId);
  assert.ok(artifact, `missing Git baseline artifact ${artifactId}`);
  const rect = artifact.normalizedPageRectXywh;
  return [rect.x, rect.y, rect.width, rect.height];
}

function candidateRect(candidate, page) {
  if (candidate.source === 'git-baseline-region') return baselineRect(candidate.artifactId);
  const bounds = candidate.bounds;
  assert.ok(bounds, `candidate ${candidate.id} needs explicit bounds`);
  if (bounds.units === 'normalized') {
    assert.equal(bounds.space, 'source-pdf-page');
    assert.equal(bounds.origin, 'top-left');
    assert.equal(bounds.format, 'xywh');
    return bounds.values;
  }
  return pointCornersToNormalizedXywh(bounds, page);
}

function gitShow(commit, path) {
  return execFileSync('git', ['show', `${commit}:${path}`], {cwd: root, maxBuffer: 20 * 1024 * 1024});
}

function hasCommit(commit) {
  return spawnSync('git', ['cat-file', '-e', `${commit}^{commit}`], {cwd: root}).status === 0;
}

test('historical baseline catalogs and PNGs are pinned to their Git objects without publishing old bytes', {
  skip: manifest.gitBaselineArtifacts.every(a => hasCommit(a.commit)) && hasCommit(manifest.sentinelCalibration.baselineViewer.commit)
    ? false
    : 'Historical commit objects are absent in this shallow checkout; local Git-backed proof is retained in the calibration manifest.'
}, () => {
  const catalogCache = new Map();
  for (const artifact of manifest.gitBaselineArtifacts) {
    let catalogBytes = catalogCache.get(`${artifact.commit}:${artifact.catalogPath}`);
    if (!catalogBytes) {
      catalogBytes = gitShow(artifact.commit, artifact.catalogPath);
      catalogCache.set(`${artifact.commit}:${artifact.catalogPath}`, catalogBytes);
    }
    assert.equal(sha256(catalogBytes), artifact.catalogSha256, `${artifact.id} catalog hash`);
    assert.equal(execFileSync('git', ['rev-parse', `${artifact.commit}:${artifact.catalogPath}`], {cwd: root, encoding: 'utf8'}).trim(), artifact.catalogGitBlobOid);
    const catalog = JSON.parse(catalogBytes.toString('utf8'));
    const region = catalog.regions.find(candidate => candidate.id === artifact.regionId);
    assert.ok(region, `${artifact.id} historical region`);
    assert.equal(region.image, artifact.imagePath.split('/').at(-1));
    assert.equal(region.sha256, artifact.imageSha256);
    assert.deepEqual(region.normalizedPageRect, {
      x: artifact.normalizedPageRectXywh.x,
      y: artifact.normalizedPageRectXywh.y,
      ...(Object.hasOwn(region.normalizedPageRect, 'width') ? {width: artifact.normalizedPageRectXywh.width} : {w: artifact.normalizedPageRectXywh.width}),
      ...(Object.hasOwn(region.normalizedPageRect, 'height') ? {height: artifact.normalizedPageRectXywh.height} : {h: artifact.normalizedPageRectXywh.height})
    });
    const imageBytes = gitShow(artifact.commit, artifact.imagePath);
    assert.equal(sha256(imageBytes), artifact.imageSha256, `${artifact.id} historical image hash`);
    assert.equal(execFileSync('git', ['rev-parse', `${artifact.commit}:${artifact.imagePath}`], {cwd: root, encoding: 'utf8'}).trim(), artifact.imageGitBlobOid);
    assert.equal(catalog.sources[artifact.book].sha256, artifact.sourcePdfSha256);
  }

  const baselineViewer = manifest.sentinelCalibration.baselineViewer;
  const viewerBytes = gitShow(baselineViewer.commit, baselineViewer.path);
  assert.equal(sha256(viewerBytes), baselineViewer.sha256, 'baseline viewer hash');
  assert.equal(execFileSync('git', ['rev-parse', `${baselineViewer.commit}:${baselineViewer.path}`], {cwd: root, encoding: 'utf8'}).trim(), baselineViewer.gitBlobOid);
  assert.match(viewerBytes.toString('utf8'), /const firstFocus = region\.focusRects\[0\]/, 'baseline raw-focus scroll behavior');
});

test('manually annotated table extents separate narrow-row failures from sufficient context', () => {
  for (const item of manifest.contextContainmentCases) {
    const artifact = manifest.gitBaselineArtifacts.find(candidate => candidate.id === item.baselineArtifactId);
    const size = pageSize(artifact.book, artifact.printedPage);
    const required = pointCornersToNormalizedXywh(item.requiredContext, size);
    for (const candidate of item.candidates) {
      const actual = containsContext(candidateRect(candidate, size), required);
      assert.equal(actual, candidate.expected === 'contains', `${item.id} / ${candidate.id}`);
    }
  }
});

test('whole-note contracts catch omissions that the edge detector cannot see', () => {
  for (const item of manifest.wholeNoteOmissionCases) {
    const artifact = manifest.gitBaselineArtifacts.find(candidate => candidate.id === item.baselineArtifactId);
    const size = pageSize(artifact.book, artifact.printedPage);
    const required = pointCornersToNormalizedXywh(item.requiredContext, size);
    for (const candidate of item.candidates) {
      const actual = containsContext(candidateRect(candidate, size), required);
      assert.equal(actual, candidate.expected === 'contains', `${item.id} / ${candidate.id}`);
    }
  }
  assert.match(manifest.limitations.join(' '), /wholly outside a crop/i);
  assert.match(manifest.limitations.join(' '), /manually annotated/i);
  assert.match(manifest.limitations.join(' '), /OCR/i);
});

test('Holy Water focus must include its manually annotated qualifier dependency', () => {
  const item = manifest.qualifierFocusCases[0];
  const artifact = manifest.gitBaselineArtifacts.find(candidate => candidate.id === item.baselineArtifactId);
  const crop = [artifact.normalizedPageRectXywh.x, artifact.normalizedPageRectXywh.y,
    artifact.normalizedPageRectXywh.width, artifact.normalizedPageRectXywh.height];
  const required = [item.requiredEvidence.normalizedSourcePageXywh];
  assert.equal(focusCoversEvidence(crop, item.existingRowFocusRectsImageRelativeXywh, required), false);
  assert.equal(focusCoversEvidence(crop,
    [...item.existingRowFocusRectsImageRelativeXywh, ...item.separateQualifierFocus.imageRelativeXywh], required), true);
  assert.match(item.scope, /manually annotated dependency/i);
  assert.match(item.scope, /do not infer/i);
  assert.match(manifest.limitations.join(' '), /does not prove precision/i);
});

test('Git-backed clipping fixtures detect only their recorded word boxes', () => {
  const fixture = fileURLToPath(new URL('./citation-regression-calibration-fixtures.py', import.meta.url));
  const result = spawnSync('python3', [fixture], {cwd: root, encoding: 'utf8'});
  assert.equal(result.status, 0, `geometry fixture failed: ${result.error || result.stderr}`);
});

test('full-image sentinel stays an audit suspect, is hidden from overlays, and does not confer field precision', () => {
  const sentinel = manifest.sentinelCalibration.sentinelRectImageRelativeXywh;
  assert.deepEqual(sentinel, [0, 0, 1, 1]);
  assert.match(manifest.sentinelCalibration.rawAuditInterpretation, /suspect/i);
  assert.match(manifest.sentinelCalibration.individualFieldPolicy, /precise field-specific highlight/i);
  assert.match(manifest.sentinelCalibration.wholeSpellPolicy, /hash-bound independent exception/i);

  const declaration = sourceViewer.match(/function specificFocusRects\(rects\)\s*\{[^}]*\}/)?.[0];
  assert.ok(declaration, 'viewer sentinel filter');
  const context = vm.createContext({visible: null});
  vm.runInContext(`${declaration}; visible = specificFocusRects([[0,0,1,1]]);`, context);
  assert.deepEqual(Array.from(context.visible), []);
  vm.runInContext(`${declaration}; visible = specificFocusRects([[0,0,1,1],[0.1,0.2,0.3,0.1]]);`, context);
  assert.deepEqual(Array.from(context.visible, rect => Array.from(rect)), [[0.1,0.2,0.3,0.1]]);

  const wholeSpellTest = readFileSync(new URL('../tests/source-viewer-review-exceptions.browser.mjs', import.meta.url), 'utf8');
  assert.match(wholeSpellTest, /Unmarked whole-spell view reviewed/);
  assert.match(wholeSpellTest, /pending field status/);
  const bytes=Buffer.from('sentinel-calibration');
  const region={id:'sentinel-calibration',book:'PHB',printedPage:73,pdfPage:74,image:'sentinel.png',sha256:sha256(bytes),focusRects:[sentinel]};
  const item={id:'sentinel-calibration',book:'PHB',pages:[73],sourceExcerpts:{catalog:'sentinel-calibration.json'}};
  const fixtureData={spells:[item]},loadCatalog=()=>({regions:[region],sources:{PHB:{sha256:'fixture-source'}}});
  const audit=buildVisualCoverageCore(fixtureData,loadCatalog,{reviews:[]},null,{loadImage:()=>bytes});
  assert.equal(audit.sourceFrameValidation.valid,false,'the isolated sentinel fixture remains diagnostic');
  assert.equal(audit.usages[0].sentinel,true);
  assert.equal(audit.usages[0].status.highlight,'suspected');
  assert.equal(audit.sentinelPolicy.unresolvedHighlightWarnings,1);
  assert.deepEqual(audit.usages[0].focusRects,[[0,0,1,1]],'raw failing evidence remains intact in the audit');
  const current=buildVisualCoverage(fixtureData,loadCatalog,{reviews:[]},null,{loadImage:()=>bytes});
  assert.equal(current.sourceFrameValidation.valid,false,'the public current wrapper cannot certify the toy input');
  assert.ok(current.sourceFrameValidation.errors.some(error=>error.includes('Caller data differs')));
});

test('historical raw sentinel scroll and current precise-focus scroll stay distinct', () => {
  const baseline = manifest.sentinelCalibration.baselineViewer;
  const present = sourceViewer;
  assert.ok(baseline.sha256 && baseline.path === 'dist/source-viewer.js');
  assert.match(manifest.sentinelCalibration.calibrationSnapshotViewer.meaning, /Identity of the viewer bytes used for this calibration run/);
  assert.match(manifest.sentinelCalibration.historicalScrollInterpretation, /first raw focus rectangle/i);
  assert.match(manifest.sentinelCalibration.visibleOverlayInterpretation, /filters this exact sentinel/i);
  assert.match(present, /const focusRects = specificFocusRects\(region\.focusRects \|\| \[\]\)/);
  assert.match(present, /const firstFocus = focusRects\[0\]/);
  assert.match(manifest.sentinelCalibration.currentBrowserRegressionTests.join(' '), /source-viewer-header\.browser\.mjs/);
});

test('calibration manifest keeps source and coordinate conventions explicit', () => {
  assert.equal(manifest.coordinateConventions.sourceBounds.format, 'x0-y0-x1-y1');
  assert.equal(manifest.coordinateConventions.normalizedSourceRects.format, 'xywh');
  assert.match(manifest.coordinateConventions.normalizationRule, /do not reinterpret corner coordinates as XYWH/i);
  for (const [book, source] of Object.entries(manifest.sourceFiles)) {
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Object.keys(manifest.sourcePageDimensions[book]).length);
  }
});
