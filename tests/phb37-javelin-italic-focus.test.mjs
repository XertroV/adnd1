import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = path.join(ROOT, 'research/source-audit-batch5-phb37-italic-review.json');
const FIXTURE_PATH = path.join(ROOT, 'tests/fixtures/phb37-javelin-italic-before.json');
const CATALOG_PATH = path.join(ROOT, 'dist/scans/verified/equipment-phb-javelin.json');
const IMAGE_PATH = path.join(ROOT, 'dist/scans/verified/phb-37-a0447e9e609ad119.png');
const REPORT = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const FIXTURE = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function detectDeclaredNoteFocus(region, expectedRect) {
  return region.focusRects?.some((rect) =>
    rect.length === expectedRect.length && rect.every((value, index) => value === expectedRect[index]),
  ) ?? false;
}

function pixelLTRB(rect, width, height) {
  const [x, y, w, h] = rect;
  return [x * width, y * height, (x + w) * width, (y + h) * height];
}

function findRegion(catalog, id) {
  return catalog.regions.find((region) => region.id === id);
}

function withoutAllowedAnnotationChanges(region) {
  const copy = structuredClone(region);
  delete copy.focusRects;
  delete copy.alt;
  delete copy.summary;
  return copy;
}

test('preserved pre-repair Javelin region is a red fixture for the missing italic-note focus', () => {
  const expected = FIXTURE.requiredNoteFocusNormalized;
  assert.equal(FIXTURE.capturedBeforeRepair, true);
  assert.equal(FIXTURE.region.id, REPORT.failingFixtureBeforeRepair.regionId);
  assert.deepEqual(FIXTURE.region.focusRects, [[0.002692998, 0.416373239, 0.993716338, 0.016725352]]);
  assert.equal(detectDeclaredNoteFocus(FIXTURE.region, expected), false);
  assert.equal(REPORT.failingFixtureBeforeRepair.result,
    'FAIL: the existing Javelin region focuses only the Javelin row and does not focus the complete printed Italics qualifier.');
});

test('current Javelin region retains row focus and highlights the complete italic note', () => {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const region = findRegion(catalog, REPORT.repairPlan.regionId);
  const expectedNote = REPORT.repairPlan.addNoteFocusNormalized;
  const expectedRow = REPORT.repairPlan.preserveExistingRowFocus;
  assert.ok(region);
  assert.deepEqual(region.focusRects, [expectedRow, expectedNote]);
  assert.equal(detectDeclaredNoteFocus(region, expectedNote), true);
  const mapped = pixelLTRB(expectedNote, region.width, region.height);
  const expectedPixels = REPORT.repairPlan.addNoteFocusPixelLTRB;
  mapped.forEach((value, index) => assert.ok(Math.abs(value - expectedPixels[index]) < 1e-6));
  assert.match(region.alt + ' ' + region.summary, /italic(?:al)?[^.]*qualifier/iu);
  assert.deepEqual(withoutAllowedAnnotationChanges(region), withoutAllowedAnnotationChanges(FIXTURE.region));
  assert.equal(region.verificationScope, 'source-excerpt');
  assert.deepEqual(region.checkedFields, { sourceLocation: 'PHB p.37 · Weight and Damage by Weapon Type, row Javelin' });
});

test('the repaired annotation keeps source image identity and all 50-row review evidence', () => {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const region = findRegion(catalog, REPORT.repairPlan.regionId);
  assert.equal(region.id, REPORT.failingFixtureBeforeRepair.regionId);
  assert.equal(region.image, REPORT.baseline.sharedCrop.path.split('/').at(-1));
  assert.equal(region.sha256, REPORT.baseline.sharedCrop.sha256);
  assert.equal(sha256(fs.readFileSync(IMAGE_PATH)), REPORT.baseline.sharedCrop.sha256);
  assert.equal(REPORT.typographyReview.rows.length, 50);
  assert.deepEqual(REPORT.typographyReview.classificationCounts, {
    italic: 4, upright: 46, uncertain: 0, unrepresented: 0,
  });
  assert.deepEqual(REPORT.typographyReview.rows.filter((row) => row.sourcePixelTypography === 'italic').map((row) => row.ordinal), [15, 17, 23, 41]);
  assert.deepEqual(REPORT.afterRepair.geometryDetector.currentFindings, []);
  assert.match(REPORT.afterRepair.geometryDetector.beforeFixture, /FAIL:.*Javelin.*italic note focus/iu);
});
