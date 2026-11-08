import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {validateSourceGeometry, MAX_TOLERANCE_POINTS} from '../tools/monetary-source-geometry.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const audit = read('research/source-audit-batch5-ua-additional-prices.json');
const regression = read('tests/fixtures/ua-additional-prices-geometry-regression.json');
const archivedBytes = gunzipSync(readFileSync('tests/fixtures/monetary-source-ua-583-before.json.gz'));
const archivedAudit = JSON.parse(archivedBytes.toString('utf8'));
const archivedSha256 = createHash('sha256').update(archivedBytes).digest('hex');

test('all 583 normalized UA price rows have strictly contained assessed focus geometry', () => {
  assert.equal(audit.rowRecords.length, 583);
  const results = audit.rowRecords.map(row => [row.recordId, validateSourceGeometry(row)]);
  assert.deepEqual(results.filter(([, result]) => result.status !== 'contained'), []);
  assert.equal(audit.aggregate.currentUnassessableHighlightCount, 0);
  assert.equal(regression.afterAssessment.rowsAssessed, 583);
  assert.equal(regression.afterAssessment.containedCount, 583);
  assert.equal(regression.afterAssessment.outsideCropCount, 0);
});

test('the three original crop failures stay bound to the archived post-cropfix geometry while current focus corrections remain contained', () => {
  assert.equal(archivedSha256, '8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a');
  assert.equal(archivedAudit.rowRecords.length, 583);
  assert.equal(regression.beforeAssessment.rowsAssessed, 583);
  assert.equal(regression.beforeAssessment.outsideCropCount, 3);
  assert.equal(regression.beforeAssessment.notAssessableCount, 0);
  for (const entry of regression.regressions) {
    const priorRow = {
      recordId: entry.recordId,
      evidence: {
        tableCropBounds: {pdfPagePoints: entry.before.tableCropPdfPagePoints},
        rowHighlightBounds: {status: 'precise-row-bounds', pdfPagePoints: entry.before.rowHighlightPdfPagePoints},
      },
    };
    assert.equal(validateSourceGeometry(priorRow).status, 'outside-crop', entry.recordId);

    const archivedRow = archivedAudit.rowRecords.find(row => row.recordId === entry.recordId);
    assert.ok(archivedRow, entry.recordId);
    assert.deepEqual(archivedRow.evidence.tableCropBounds.pdfPagePoints, entry.after.tableCropPdfPagePoints, entry.recordId);
    assert.deepEqual(archivedRow.evidence.rowHighlightBounds.pdfPagePoints, entry.after.rowHighlightPdfPagePoints, entry.recordId);
    assert.equal(validateSourceGeometry(archivedRow).status, 'contained', entry.recordId);

    const current = audit.rowRecords.find(row => row.recordId === entry.recordId);
    assert.ok(current, entry.recordId);
    assert.deepEqual(current.evidence.tableCropBounds.pdfPagePoints, entry.after.tableCropPdfPagePoints, entry.recordId);
    assert.equal(validateSourceGeometry(current).status, 'contained', entry.recordId);
  }
});

test('non-assessable and malformed geometry remain distinct from crop violations', () => {
  const base = {evidence: {tableCropBounds: {pdfPagePoints: [0, 0, 10, 10]}, rowHighlightBounds: {status: 'not-assessable'}}};
  assert.equal(validateSourceGeometry(base).status, 'not-assessable');
  const malformed = {evidence: {tableCropBounds: {pdfPagePoints: [0, 0, 10]}, rowHighlightBounds: {status: 'precise-row-bounds', pdfPagePoints: [1, 1, 2, 2]}}};
  assert.equal(validateSourceGeometry(malformed).status, 'invalid-geometry');
});

test('rounding tolerance is explicit and capped so it cannot waive the captured failures', () => {
  const current = audit.rowRecords.find(row => row.recordId === regression.regressions[0].recordId);
  const barelyOutside = structuredClone(current);
  barelyOutside.evidence.tableCropBounds.pdfPagePoints[2] = barelyOutside.evidence.rowHighlightBounds.pdfPagePoints[2] - 0.1;
  assert.equal(validateSourceGeometry(barelyOutside).status, 'outside-crop');
  assert.equal(validateSourceGeometry(barelyOutside, {tolerancePoints: 0.1}).status, 'contained');
  assert.ok(MAX_TOLERANCE_POINTS <= 0.25);
  assert.throws(() => validateSourceGeometry(barelyOutside, {tolerancePoints: 1}), /between 0 and/);
  for (const entry of regression.regressions) {
    const priorRow = {evidence: {tableCropBounds: {pdfPagePoints: entry.before.tableCropPdfPagePoints}, rowHighlightBounds: {status: 'precise-row-bounds', pdfPagePoints: entry.before.rowHighlightPdfPagePoints}}};
    assert.equal(validateSourceGeometry(priorRow, {tolerancePoints: MAX_TOLERANCE_POINTS}).status, 'outside-crop');
  }
});
