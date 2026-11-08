import {readBeforeJoFile as readFileSync} from './helpers/batch6-jo-fixture.mjs';
import {frozenDmgBeforeManifest,dmgContextBefore} from './helpers/dmg-context-frozen-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {edgeGeometry, normalizeSourcePageRect, buildSourceReportCueUniverse} from '../tools/cross-page-catalog-candidates.mjs';

const root = new URL('../', import.meta.url);
const read = relative => readFileSync(new URL(relative, root));
const json = relative => JSON.parse(read(relative));

test('source page rectangles normalize supported forms and report missing bounds as unassessable', () => {
  assert.deepEqual(normalizeSourcePageRect({normalizedPageRect: {x: .1, y: .2, w: .3, h: .4}}), {status: 'assessable', rect: {x: .1, y: .2, w: .3, h: .4}});
  assert.deepEqual(normalizeSourcePageRect({normalizedPageRect: {x: .1, y: .2, width: .3, height: .4}}), {status: 'assessable', rect: {x: .1, y: .2, w: .3, h: .4}});
  assert.deepEqual(normalizeSourcePageRect({normalizedPageRect: [.1, .2, .3, .4]}), {status: 'assessable', rect: {x: .1, y: .2, w: .3, h: .4}});
  assert.equal(normalizeSourcePageRect({}).status, 'unassessable-missing-source-page-bounds');
  assert.equal(normalizeSourcePageRect({normalizedPageRect: {x: .9, y: .9, w: .2, h: .2}}).status, 'unassessable-invalid-source-page-bounds');
});

test('geometry-only page-edge discovery does not depend on horizontal overlap or text endpoints', () => {
  const pair = edgeGeometry(
    {normalizedPageRect: {x: .5, y: .5558942267560164, w: .49, h: .39410577324398355}},
    {normalizedPageRect: {x: .01, y: .035, w: .49, h: .1}}
  );
  assert.equal(pair.class, 'elevated-geometry-edge-pair');
  assert.equal(pair.horizontalOverlap, 0);
  assert.equal(pair.firstNearBottom, true);
  assert.equal(pair.secondNearTop, true);
  assert.match(pair.coordinateBasis, /physical-source-PDF-page-bounds-not-present-or-inferred/);
  assert.equal(edgeGeometry({normalizedPageRect: [.1, .2, .3, .4]}, {}).class, 'unassessable');
  assert.equal(edgeGeometry({normalizedPageRect: [.1, .1, .3, .85]}, {normalizedPageRect: [.1, .2, .3, .4]}).class, 'weak-geometry-single-edge-cue');
  assert.equal(edgeGeometry({normalizedPageRect: [.1, .2, .3, .4]}, {normalizedPageRect: [.1, .2, .3, .4]}).class, 'assessable-no-page-edge-cue');
});

test('pinned text-shape source report preserves its 99 cue universe and 62/37 confidence split', () => {
  const summary = json('research/source-audit-batch5-continuation.json');
  const full = JSON.parse(gunzipSync(read(`research/${summary.fullEvidence.path}`)).toString('utf8'));
  const cues = buildSourceReportCueUniverse(full);
  assert.equal(cues.length, 99);
  assert.deepEqual(cues.reduce((counts, cue) => { counts[cue.confidence] = (counts[cue.confidence] || 0) + 1; return counts; }, {}), {
    'weak-geometry-plus-text-shape': 62,
    'elevated-geometry-plus-endpoint-cue': 37
  });
  assert.ok(cues.every(cue => cue.fromPdfPage + 1 === cue.toPdfPage));
  assert.ok(cues.every(cue => !Object.hasOwn(cue, 'text')), 'cue inventory carries numeric geometry and endpoint classes, not OCR passages');
});

test('frozen Git 679 baseline preserves all owner-binding consecutive-page pairs and the uncued Druid pair', () => {
  const snapshot = json('research/source-audit-batch5-cross-page-pairs-baseline.json');
  assert.equal(snapshot.input.gitCommit, '679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.equal(snapshot.input.continuationGroupCount, 14);
  assert.equal(snapshot.input.continuationManifestSha256, '9504a11f432fd7531f95d0bea4b81a8f50c67e9607c6bfc6faf4aa67b3ef5001');
  assert.equal(snapshot.summary.allConsecutivePagePairUsages, snapshot.pairs.length);
  const c = snapshot.knownHistoricalControl;
  assert.equal(c.pairFound, true);
  assert.equal(c.pinnedManifestDeclaresPair, false);
  assert.deepEqual(c.regionIds, ['phb-55-1ed1d4a06d478c09', 'phb-56-52c28faceedb3b01']);
  assert.equal(c.pair.geometry.class, 'elevated-geometry-edge-pair');
  assert.equal(c.pair.geometry.horizontalOverlap, 0);
  assert.equal(c.pair.sourcePdfPageHasAnyFlowCue, false);
  assert.equal(c.expectedSourceReportCueStatus, 'no-adjacent-PDF-flow-cue-on-first-PDF-page');
});

test('preserved Batch5 current-tree snapshot retains its exact190-group lineage and historical Druid control', () => {
  const snapshot = json('research/source-audit-batch5-cross-page-pairs-current.json');
  assert.equal(snapshot.input.treeSelection, 'current-worktree');
  assert.equal(snapshot.input.continuationGroupCount, frozenDmgBeforeManifest.groups.length);
  assert.equal(snapshot.input.continuationManifestSha256, dmgContextBefore.files['research/citation-continuations.json'].sha256);
  assert.equal(snapshot.universe.bindingResolutionIssueCount, 0);
  assert.equal(snapshot.summary.allConsecutivePagePairUsages, snapshot.pairs.length);
  assert.deepEqual(snapshot.summary.geometryClasses, {
    unassessable: 68,
    'weak-geometry-single-edge-cue': 354,
    'elevated-geometry-edge-pair': 429,
    'assessable-no-page-edge-cue': 220
  });
  assert.equal(snapshot.universe.sourceReportFlowCueUniverse.count, 99);
  const c = snapshot.knownHistoricalControl;
  assert.equal(c.currentPairFound, true);
  assert.equal(c.currentManifestDeclaresPair, true);
  assert.equal(c.currentPair.sourcePdfPageHasAnyFlowCue, false);
  assert.equal(c.currentPair.geometry.class, 'elevated-geometry-edge-pair');
  assert.equal(c.currentPair.geometry.horizontalOverlap, 0);
  assert.ok(snapshot.pairs.every(pair => pair.geometry.class !== 'semantic-pass'));
  assert.match(snapshot.summary.semanticReviewDisposition, /semantic negative/);
});
