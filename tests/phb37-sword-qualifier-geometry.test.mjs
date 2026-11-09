import {readBeforeJoFile} from './helpers/ua-source-batch6-jo-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateDeclaredGeometry,
  loadCurrentRegions,
  loadPreservedBeforeRegions,
  loadRepairPlan,
} from '../tools/phb37-sword-qualifier-geometry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = path.join(ROOT, 'research/source-audit-batch5-phb37-sword-qualifier-review.json');
const CONTRACT_PATH = path.join(ROOT, 'research/source-table-citation-contracts.json');
const LONG_PATH = path.join(ROOT, 'dist/scans/verified/equipment-phb-long-sword.json');
const SHORT_PATH = path.join(ROOT, 'dist/scans/verified/equipment-phb-short-sword.json');
const EQUIPMENT_PATH = path.join(ROOT, 'equipment.json');
const REGION_IMAGE_PATH = path.join(ROOT, 'dist/scans/verified/phb-37-a0447e9e609ad119.png');
const REPORT = JSON.parse(readBeforeJoFile(REPORT_PATH, 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJson(value[key])]));
  }
  return value;
}
const canonicalSha = (value) => sha256(Buffer.from(JSON.stringify(stableJson(value))));

function findRegion(file, id) {
  const doc = JSON.parse(readBeforeJoFile(file, 'utf8'));
  return doc.regions.find((region) => region.id === id);
}

function withoutFocusCopyText(region) {
  const copy = structuredClone(region);
  delete copy.focusRects;
  delete copy.alt;
  delete copy.summary;
  return copy;
}

test('preserved original Long and Short annotation failures are detected', () => {
  const before = loadPreservedBeforeRegions();
  assert.deepEqual(
    evaluateDeclaredGeometry(before.long, before.short, loadRepairPlan()),
    [
      'long-focus-overlaps-forbidden-short-qualifier',
      'short-focus-misses-complete-wrapped-row-and-qualifier',
    ],
  );
  assert.deepEqual(before.long.focusRects, REPORT.failingFixturesCapturedBeforeRepair.long.focusRects);
  assert.deepEqual(before.short.focusRects, REPORT.failingFixturesCapturedBeforeRepair.short.focusRects);
});

test('current sword regions satisfy only the declared PHB37 row/qualifier geometry', () => {
  const current = loadCurrentRegions();
  assert.deepEqual(evaluateDeclaredGeometry(current.long, current.short, loadRepairPlan()), []);

  const longRegion = findRegion(LONG_PATH, 'phb-37-2b2447ac14bb294c');
  const shortRegion = findRegion(SHORT_PATH, 'phb-37-c9406fdb229bfe86');
  assert.deepEqual(longRegion.focusRects, [REPORT.failingFixturesCapturedBeforeRepair.long.focusRects[0]]);
  assert.deepEqual(shortRegion.focusRects, [REPORT.repairPlan.short.normalizedFocusRect]);
  const [x, y, width, height] = shortRegion.focusRects[0];
  const [actualLeft, actualTop, actualRight, actualBottom] = [x * 1114, y * 1136, (x + width) * 1114, (y + height) * 1136];
  for (const [actual, expected] of [[actualLeft, 3], [actualTop, 908], [actualRight, 1110], [actualBottom, 943]]) {
    assert.ok(Math.abs(actual - expected) < 1e-6, `normalized focus maps to ${actual}, expected ${expected}`);
  }
  assert.doesNotMatch(longRegion.alt + ' ' + longRegion.summary, /qualifier also focused|applicable printed qualifier/iu);
  assert.match(shortRegion.alt + ' ' + shortRegion.summary, /wrapped blade-length qualifier|wrapped note/u);
});

test('region IDs, source image and field grades remain fixed while separate source-condition repairs stay explicit', () => {
  const longRegion = findRegion(LONG_PATH, 'phb-37-2b2447ac14bb294c');
  const shortRegion = findRegion(SHORT_PATH, 'phb-37-c9406fdb229bfe86');
  const before = REPORT.currentCatalogStateBeforeRepair;
  for (const [region, snapshot] of [
    [longRegion, before.targetRegionFiles.find((x) => x.region.id === longRegion.id).region],
    [shortRegion, before.targetRegionFiles.find((x) => x.region.id === shortRegion.id).region],
  ]) {
    assert.equal(region.id, snapshot.id);
    assert.equal(region.image, snapshot.image);
    assert.equal(region.sha256, snapshot.sha256);
    assert.equal(region.width, snapshot.width);
    assert.equal(region.height, snapshot.height);
    assert.equal(region.normalizedPageRect.x, snapshot.normalizedPageRect.x);
    assert.deepEqual(region.boundsPdfPoints, snapshot.boundsPdfPoints);
    assert.deepEqual(region.checkedFields, snapshot.checkedFields);
    assert.deepEqual(withoutFocusCopyText(region), withoutFocusCopyText(snapshot));
  }
  assert.equal(sha256(readBeforeJoFile(REGION_IMAGE_PATH)), REPORT.sourcePixelEvidence.regionImage.expectedImageSha256);
  assert.equal(REPORT.baseline.sourceTableContractsSha256,'da3c6b801322876aac8c91a0963b69e71072c329335e70b95c4a1dc5e5253040');
  const contracts=JSON.parse(readBeforeJoFile(CONTRACT_PATH,'utf8'));
  const swordConditions=JSON.parse(readBeforeJoFile(path.join(ROOT,'research/source-audit-batch5-source-condition-integration.json'),'utf8'));
  const italicConditions=JSON.parse(readBeforeJoFile(path.join(ROOT,'research/source-audit-batch5-phb37-italic-integration.json'),'utf8'));
  assert.equal(swordConditions.sourceValueGradesChanged,false);
  for(const previous of REPORT.sourceTableAnnotationInventory.rows){
    const current=contracts.tables.find(table=>table.id===previous.tableId)?.rows.find(row=>row.id===previous.rowId);
    assert.ok(current,previous.rowId);
    const sword=swordConditions.after.find(row=>row.id===previous.rowId);
    const italic=italicConditions.conditionChanges.find(change=>change.rowId===previous.rowId);
    assert.equal(current.sourceConditions??'',sword?.sourceConditions??italic?.after??previous.sourceConditions,previous.rowId);
  }

  const equipment = JSON.parse(readBeforeJoFile(EQUIPMENT_PATH, 'utf8'));
  for (const snapshot of before.targetBodies) {
    const current = equipment.equipment.find((entry) => entry.id === snapshot.itemId);
    assert.ok(current);
    assert.equal(canonicalSha(current), snapshot.canonicalBodySha256);
  }
});

test('whole source-condition and availability inventories remain unresolved outside named cases', () => {
  assert.equal(REPORT.sourceTableAnnotationInventory.explicitRowCount, 266);
  assert.equal(REPORT.sourceTableAnnotationInventory.sourceConditionsNonempty, 94);
  assert.equal(REPORT.sourceTableAnnotationInventory.sourceConditionsEmpty, 172);
  assert.equal(REPORT.sourceTableAnnotationInventory.rows.length, 266);
  assert.equal(REPORT.wholeCurrentCatalogAvailabilityCandidateScan.fileCount, 1027);
  assert.equal(REPORT.wholeCurrentCatalogAvailabilityCandidateScan.matchedTermOccurrences, 15);
  assert.equal(REPORT.wholeCurrentCatalogAvailabilityCandidateScan.matchedJsonFields, 14);
  assert.equal(REPORT.otherQualifierReviewCandidate.rowId, 'batch5-phb37-weapon-weight-damage-023');
  assert.match(REPORT.otherQualifierReviewCandidate.status, /pending/u);
  assert.deepEqual(REPORT.afterRepair.geometryDetector.postRepairFindings, []);
  assert.equal(REPORT.afterRepair.geometryDetector.postRepairPass, true);
  assert.equal(REPORT.afterRepair.changedCurrentCatalogBodyFileCount, 2);
  assert.ok(REPORT.afterRepair.onlyChangedCurrentCatalogBodyFiles.every((entry) => entry.ownedByThisRepair));
});
