import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import {buildUaSourceContextObligationsReport} from '../tools/ua-source-context-obligations-cli.mjs';

const beforePath = new URL('../research/source-audit-batch5-ua-context-obligations-before-v3.json.gz', import.meta.url);
const beforeSha256 = 'ee30b00f77d85a4b5dcf8878ddd97e7630777857cb6ba7b947dd4a03e4933c6b';
const sourcePdfSha256 = 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4';
const before = JSON.parse(gunzipSync(readFileSync(beforePath)).toString('utf8'));

test('CI report keeps the pinned full denominator when current rows or context links are missing', () => {
  const report = buildUaSourceContextObligationsReport({
    data: {source: {book: 'Unearthed Arcana', sha256: sourcePdfSha256}, groupReviews: [], rowRecords: []},
    before,
    beforeArtifactSha256: beforeSha256,
  });

  assert.equal(report.status, 'structural-fail-source-review-still-required');
  assert.equal(report.checks.pinnedBeforeHash.status, 'pass');
  assert.equal(report.checks.immutableSourceIdentity.status, 'pass');
  assert.equal(report.checks.activeDenominator.status, 'fail');
  assert.equal(report.checks.activeDenominator.expected.rows, 583);
  assert.equal(report.checks.activeDenominator.expected.declaredContexts, 43);
  assert.equal(report.checks.independentRowDefinitionLinksAndExtents.assessed, 0);
  assert.equal(report.checks.independentRowDefinitionLinksAndExtents.status, 'fail');
  assert.equal(report.checks.measuredContentExtents.assessed, 6);
  assert.equal(report.checks.measuredContentExtents.status, 'fail');
  assert.equal(report.interpretation.semanticPass, false);
  assert.equal(report.interpretation.all103ApplicabilityUncertain, false);
});

test('CI report refuses a different full-before capture', () => {
  assert.throws(() => buildUaSourceContextObligationsReport({
    data: {source: {book: 'Unearthed Arcana', sha256: sourcePdfSha256}, groupReviews: [], rowRecords: []},
    before,
    beforeArtifactSha256: '0'.repeat(64),
  }), /not the pinned immutable full-context capture/);
});
