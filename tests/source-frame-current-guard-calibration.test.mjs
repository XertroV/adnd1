import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {buildHistoricalSourceRasterCoverage} from '../tools/source-raster-coverage.mjs';

const root = new URL('../', import.meta.url);
const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-frame-current-guard-before-code.json.gz', import.meta.url))));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('portable before evidence pins the exact executed mutations and preserved consumers', () => {
  assert.equal(fixture.inputCommit,'a46eddc41ac6f712d5ad1498195df6a49810aae1');
  assert.equal(fixture.actualMapRawSha256,'a6cbd6f500c2f02c6c0d94eaceb39f3e98c34ffe88001e5de45a65021c36b47b');
  assert.equal(fixture.beforeCode.pythonRaster.sha256,'ae6c4fbb96e02812c16cf5289d0af0a18eec646b2ff1ab13c5179ac5e1b8eea9');
  assert.equal(fixture.beforeCode.pythonBridge.sha256,'1a1e1ec2b35f586471f141f972ad16725285f4b9310a79cc16ffe16386ffe276');
  assert.equal(fixture.beforeCode.nodeHistoricalRaster.sha256,'214bef56afd9c5b4e70a136a334885590dfed6a0d16c34de63319c34bfb873b5');
  assert.equal(fixture.classification.startsWith('Executed prospective mutations'), true);
  assert.deepEqual(fixture.counts, {regionUsages:3412,catalogs:1020,frameGroups:9,registeredOwnerJoins:102,registeredReprojectedRows:102,registeredChangedBounds:11,supplementalNARows:2});
  for (const saved of Object.values(fixture.fixtures)) {
    const bytes = readFileSync(new URL(saved.path, root));
    assert.equal(sha(bytes), saved.sha256);
    assert.equal(bytes.length, saved.sizeBytes);
  }
  for (const saved of Object.values(fixture.beforeCode)) assert.equal(sha(saved.utf8), saved.sha256);
  const bytes = gunzipSync(readFileSync(new URL('./fixtures/source-frame-accepted-downgrade-before.json.gz', import.meta.url)));
  assert.equal(sha(bytes), fixture.actualMapRawSha256);
  const map = JSON.parse(bytes);
  const actualBefore=JSON.parse(readFileSync(new URL('./fixtures/source-frame-downgrade-actual-before-result.json',import.meta.url)));
  assert.equal(actualBefore.downgradedMapSha256,fixture.actualMapRawSha256);
  assert.equal(actualBefore.validatorOutcome.status,'accepted-by-legacy-compatibility-path');
  assert.equal(actualBefore.mutation.matchedRowsReprojectedToLegacyPageRect,102);
  assert.equal(actualBefore.mutation.matchedRowsWhoseBoundsChanged,11);
  assert.equal(Object.hasOwn(map, 'sourceFrameCoordinateBridge'), false);
  assert.equal(map.usages.filter(row => Object.hasOwn(row, 'coordinateFrameResolution')).length, 0);
});

test('the exact a46 current mutant passes preserved reconciliation and fails the current guard', () => {
  const result = spawnSync('python3', [new URL('./source-frame-current-guard-calibration.py', import.meta.url).pathname], {encoding:'utf8', maxBuffer:4 * 1024 * 1024});
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  const replay = JSON.parse(result.stdout);
  assert.equal(replay.beforeAcceptedCatalogs, 1020);
  assert.equal(replay.usageCount, 3412);
  assert.equal(replay.registeredJoins, 102);
  assert.equal(replay.knownWrongLegacyWindows, 11);
  assert.match(replay.currentRejectedReason, /missing the active source-frame bridge declaration/);
  assert.equal(replay.sourcePixelsOrSemanticReviewPerformed, false);
});

test('the exact self-sealed historical mutant passes its preserved consumer and is rejected by trusted seals', async t => {
  const sandbox = mkdtempSync(join(tmpdir(), 'source-frame-history-before-'));
  t.after(() => rmSync(sandbox, {recursive:true, force:true}));
  for (const directory of ['tools','dist','research','tests/fixtures']) mkdirSync(join(sandbox,directory), {recursive:true});
  writeFileSync(join(sandbox,'tools/source-raster-coverage.mjs'), fixture.beforeCode.nodeHistoricalRaster.utf8);
  writeFileSync(join(sandbox,'tools/source-frame-coordinate-bridge.mjs'), fixture.beforeCode.nodeBridgeDependency.utf8);
  writeFileSync(join(sandbox,'dist/books.js'), execFileSync('git', ['show', `${fixture.inputCommit}:dist/books.js`], {cwd:root}));
  const snapshot = readFileSync(new URL('./fixtures/source-frame-forged-history-snapshot-before.json.gz', import.meta.url));
  const live = readFileSync(new URL('./fixtures/source-raster-live-b90d317-before.json.gz', import.meta.url));
  const snapshotPath = 'research/source-raster-boundary-forged.json.gz', livePath = 'tests/fixtures/source-raster-live-forged.json.gz';
  writeFileSync(join(sandbox,snapshotPath), snapshot);
  writeFileSync(join(sandbox,livePath), live);
  writeFileSync(join(sandbox,'research/citation-evidence-seals.json'), JSON.stringify({seals:[{path:snapshotPath,sha256:sha(snapshot)},{path:livePath,sha256:sha(live)}]}));
  const before = await import(pathToFileURL(join(sandbox,'tools/source-raster-coverage.mjs')).href);
  const accepted = before.buildHistoricalSourceRasterCoverage({repoRoot:sandbox,snapshotPath,livePath});
  assert.equal(accepted.validation.valid, true);
  assert.equal(accepted.runMode.status, 'historical-sealed-diagnostics-only');
  assert.equal(accepted.semanticPass, false);
  assert.equal(accepted.runMode.snapshotSeal.sha256, sha(snapshot));
  assert.throws(() => buildHistoricalSourceRasterCoverage({repoRoot:sandbox,snapshotPath:join(sandbox,snapshotPath),livePath:join(sandbox,livePath)}), /not byte-identical to a sealed repository artifact/);
});
