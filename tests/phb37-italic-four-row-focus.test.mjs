import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = path.join(ROOT, 'research/source-audit-batch5-phb37-italic-review.json');
const BEFORE_PATH = path.join(ROOT, 'tests/fixtures/phb37-italic-four-row-before.json');
const CATALOGS = {
  'phb-fork-military': 'dist/scans/verified/equipment-phb-fork-military.json',
  'phb-glaive-guisarme': 'dist/scans/verified/equipment-phb-glaive-guisarme.json',
  'phb-javelin': 'dist/scans/verified/equipment-phb-javelin.json',
  'phb-spear': 'dist/scans/verified/equipment-phb-spear.json',
};
const REPORT = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const BEFORE = JSON.parse(fs.readFileSync(BEFORE_PATH, 'utf8'));
const NOTE_FOCUS = [0.003590664, 0.891725352, 0.991921005, 0.036971831];
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function containsExactFocus(region, focus) {
  return region.focusRects?.some((rect) => rect.length === focus.length && rect.every((x, i) => x === focus[i])) ?? false;
}
function findRegion(catalog, id) { return catalog.regions.find((region) => region.id === id); }
function withoutAnnotationTextChanges(region) {
  const copy = structuredClone(region);
  delete copy.focusRects;
  delete copy.alt;
  delete copy.summary;
  return copy;
}
function beforeRegion(entry) {
  return entry.itemId === 'phb-javelin' ? entry.regionBeforeFirstRepair : entry.regionBeforeFollowup;
}

const cohort = BEFORE.regions.map((entry) => {
  const repair = REPORT.cohortRepairPlan.rows.find((row) => row.itemId === entry.itemId);
  return { entry, repair, previousRegion: beforeRegion(entry) };
});

test('preserved four-row before snapshots distinguish existing and missing italic-note foci', () => {
  assert.equal(BEFORE.capturedBeforeNewGlaiveOrSpearFocusWrites, true);
  assert.deepEqual(cohort.map(({ entry }) => entry.itemId), [
    'phb-fork-military', 'phb-glaive-guisarme', 'phb-javelin', 'phb-spear',
  ]);
  for (const { entry, previousRegion } of cohort) {
    const hadFocus = containsExactFocus(previousRegion, NOTE_FOCUS);
    assert.equal(hadFocus, entry.focusBeforeStatus === 'present');
  }
  assert.equal(cohort.find(({ entry }) => entry.itemId === 'phb-glaive-guisarme').entry.focusBeforeStatus, 'missing');
  assert.match(cohort.find(({ entry }) => entry.itemId === 'phb-spear').entry.focusBeforeStatus, /missing/u);
});

test('all four current italic source-row regions focus the complete shared note and preserve prior foci', {
  skip: REPORT.afterRepair.cohortProgress?.awaitingSpearCatalogWrite ? 'Awaiting continuation_detection to finish the UA28 Spear catalog write before the PHB37-only focus patch.' : false,
}, () => {
  for (const { entry, repair, previousRegion } of cohort) {
    const catalogPath = path.join(ROOT, CATALOGS[entry.itemId]);
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const region = findRegion(catalog, repair.regionId);
    assert.ok(region, `missing region ${repair.regionId}`);
    assert.equal(containsExactFocus(region, NOTE_FOCUS), true, `${entry.itemId} lacks complete italic-note focus`);
    for (const priorFocus of previousRegion.focusRects) {
      assert.ok(containsExactFocus(region, priorFocus), `${entry.itemId} lost prior focus ${JSON.stringify(priorFocus)}`);
    }
    assert.equal(region.image, previousRegion.image);
    assert.equal(region.sha256, previousRegion.sha256);
    assert.deepEqual(withoutAnnotationTextChanges(region), withoutAnnotationTextChanges(previousRegion));
    assert.equal(region.verificationScope, 'source-excerpt');
    assert.match(region.alt + ' ' + region.summary, /qualifier/iu);
    const [x, y, w, h] = NOTE_FOCUS;
    const pixels = [x * region.width, y * region.height, (x + w) * region.width, (y + h) * region.height];
    [4, 1013, 1109, 1055].forEach((expected, index) => assert.ok(Math.abs(pixels[index] - expected) < 1e-6));
    const imagePath = path.join(ROOT, 'dist/scans/verified', region.image);
    assert.equal(sha256(fs.readFileSync(imagePath)), region.sha256);
  }
});

test('the 50-row typography census and four sourceConditions proposals stay explicit', () => {
  assert.equal(REPORT.typographyReview.rows.length, 50);
  assert.deepEqual(REPORT.typographyReview.classificationCounts, {
    italic: 4, upright: 46, uncertain: 0, unrepresented: 0,
  });
  assert.deepEqual(REPORT.typographyReview.rows.filter((row) => row.sourcePixelTypography === 'italic').map((row) => row.ordinal), [15, 17, 23, 41]);
  assert.deepEqual(REPORT.typographyReview.classificationHistory.firstPassBeforeCatalogRepair, {
    italic: 3, upright: 47, uncertain: 0, unrepresented: 0, missedRowOrdinal: 17,
    initialReading: 'Glaive — Guisarme appeared upright in the first review',
  });
  const proposals = REPORT.proposalsForRoot.sourceConditionsDeltasForAllFourItalicRows;
  assert.equal(proposals.length, 4);
  assert.deepEqual(proposals.map((proposal) => proposal.ordinal), [15, 17, 23, 41]);
  assert.ok(proposals.every((proposal) => proposal.notAppliedByThisTask));
  assert.ok(proposals.every((proposal) => proposal.basePrintedDamageCellsUnchanged.damage_size_L));
});
