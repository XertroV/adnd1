import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const witnessPath = 'research/source-audit-batch5-monetary-row-identity-witness-before.json.gz';
const witnessCompressed = readFileSync(resolve(root, witnessPath));
const witnessBytes = gunzipSync(witnessCompressed);
const witness = JSON.parse(witnessBytes);
const calibration = readJson('research/source-audit-batch5-source-word-witness-calibration.json');

function countBy(values, key) {
  return values.reduce((counts, value) => {
    const valueKey = typeof key === 'function' ? key(value) : value?.[key];
    const normalized = valueKey || 'missing';
    counts[normalized] = (counts[normalized] || 0) + 1;
    return counts;
  }, {});
}

function recountWholeCorpus() {
  const records = witness.records;
  const geometries = records.flatMap(record => record.geometry || []);
  const signalTypes = [...new Set(geometries.flatMap(geometry => geometry.candidates || []))].sort();
  const candidateSignals = Object.fromEntries(signalTypes.map(type => {
    const matching = geometries.filter(geometry => geometry.candidates?.includes(type));
    return [type, {geometryObservations: matching.length, distinctRecords: new Set(matching.map(geometry => records.find(record => record.geometry.includes(geometry))?.uid)).size}];
  }));
  return {
    records: records.length,
    recordsBySurface: countBy(records, 'surface'),
    recordStatus: countBy(records, 'status'),
    geometries: geometries.length,
    geometryMapping: countBy(geometries, geometry => geometry.mapping?.status),
    witnessStatus: countBy(geometries, 'status'),
    geometrySpace: countBy(geometries, 'space'),
    expectedValueRecords: records.filter(record => (record.expectedValues || []).length > 0).length,
    expectedValueExtractionStatus: countBy(records, 'expectedValueExtractionStatus'),
    candidateObservationCount: Object.values(candidateSignals).reduce((sum, row) => sum + row.geometryObservations, 0),
    candidateSignals,
  };
}

test('full-corpus witness denominator and every candidate category are retained', () => {
  assert.equal(sha256(witnessCompressed), calibration.witness.compressedSha256);
  assert.equal(sha256(witnessBytes), calibration.witness.decompressedSha256);
  assert.equal(witness.generatedBy, calibration.witness.generatedBy);
  assert.equal(witness.semanticRowIdentityComplete, false);
  assert.deepEqual(recountWholeCorpus(), calibration.wholeCorpusCounts);
  assert.deepEqual(calibration.wholeCorpusCounts, {
    records: 2161,
    recordsBySurface: {
      'canonical-source-row': 710,
      'site-price-claim': 191,
      'ua-supplement-row': 583,
      'phb-dmg-supplement-row': 179,
      'phb-reference-row-comparison': 165,
      'reference-financial-context': 9,
      'typed-passage': 34,
      'passage-row-comparison': 43,
      'typed-description': 2,
      'description-variant-row': 9,
      'description-pointer-link': 8,
      'source-census-claim': 180,
      'census-adjacent-review-issue': 48,
    },
    recordStatus: {
      'recorded-targets-inventoried': 1775,
      'explicitly-not-applicable': 12,
      'no-recorded-row-focus-or-locator': 374,
    },
    geometries: 3097,
    geometryMapping: {
      mapped: 1522,
      'unsupported-coordinate-space': 565,
      'ambiguous-normalized-page-frame': 34,
      'source-identity-unavailable-or-mismatched': 373,
      'render-frame-metadata-unavailable': 587,
      'ambiguous-pdf-point-frame': 16,
    },
    witnessStatus: {
      'witness-candidates': 1407,
      unassessed: 1575,
      'witness-observed-no-semantic-pass': 115,
    },
    geometrySpace: {
      'source-page-normalized': 710,
      'excerpt-image-normalized': 382,
      'pdf-page-points': 1056,
      'rendered-page-pixels': 766,
      'crop-local-pixels': 179,
      'crop-local-normalized': 4,
    },
    expectedValueRecords: 1302,
    expectedValueExtractionStatus: {
      'supported-explicit-numeric-fields-extracted': 1302,
      'no-supported-explicit-numeric-field-unknown-or-not-applicable': 859,
    },
    candidateObservationCount: 2340,
    candidateSignals: {
      'declared-printed-label-absent-candidate': {geometryObservations: 290, distinctRecords: 179},
      'expected-number-absent-candidate': {geometryObservations: 613, distinctRecords: 448},
      'other-declared-row-label-present-candidate': {geometryObservations: 119, distinctRecords: 118},
      'text-box-crossing-candidate': {geometryObservations: 1318, distinctRecords: 1156},
    },
  });
  assert.equal(Object.values(calibration.wholeCorpusCounts.witnessStatus).reduce((sum, n) => sum + n, 0), 3097);
  assert.equal(Object.values(calibration.wholeCorpusCounts.geometryMapping).reduce((sum, n) => sum + n, 0), 3097);
  assert.equal(Object.values(calibration.wholeCorpusCounts.expectedValueExtractionStatus).reduce((sum, n) => sum + n, 0), 2161);
  assert.equal(calibration.wholeCorpusCounts.candidateObservationCount, 2340);
  assert.equal(calibration.wholeCorpusCounts.candidateSignals['expected-number-absent-candidate'].geometryObservations, 613);
  assert.equal(witness.records.some(record => record.semanticPass === true || record.geometry.some(geometry => geometry.semanticPass === true)), false);
});

test('all 15 assassination, 9 poison, and 16 UA armor false-focus findings are exact witness calibrations', () => {
  const assassination = readJson('research/source-audit-batch5-monetary-assassination-focus-falsepasses-extension.json');
  const poisonBaseline = readJson('research/source-audit-batch5-monetary-row-identity-baseline.json');
  const armor = readJson('research/source-audit-batch5-monetary-row-identity-armor-extension.json');
  const sourceFindings = {
    assassination: assassination.knownFindings,
    poison: poisonBaseline.knownFindings.filter(finding => /^wrong-focus-dmg-poison-(ingestive|insinuative)-/.test(finding.id)),
    armor: armor.knownFindings,
  };
  assert.equal(sha256(readFileSync(resolve(root, 'research/source-audit-batch5-monetary-assassination-focus-falsepasses-extension.json'))), calibration.knownFalsePassCalibrations.assassination.source.sha256);
  assert.equal(sha256(readFileSync(resolve(root, 'research/source-audit-batch5-monetary-row-identity-baseline.json'))), calibration.knownFalsePassCalibrations.poison.source.sha256);
  assert.equal(sha256(readFileSync(resolve(root, 'research/source-audit-batch5-monetary-row-identity-armor-extension.json'))), calibration.knownFalsePassCalibrations.armor.source.sha256);
  const expectedCounts = {
    assassination: {recordCount: 15, candidateGeometryHitsByCategory: {'expected-number-absent-candidate': 15, 'text-box-crossing-candidate': 8}},
    poison: {recordCount: 9, candidateGeometryHitsByCategory: {'expected-number-absent-candidate': 9, 'text-box-crossing-candidate': 9}},
    armor: {recordCount: 16, candidateGeometryHitsByCategory: {'expected-number-absent-candidate': 4, 'other-declared-row-label-present-candidate': 16, 'text-box-crossing-candidate': 16, 'declared-printed-label-absent-candidate': 2}},
  };
  const witnessByUid = new Map(witness.records.map(record => [record.uid, record]));
  for (const [name, findings] of Object.entries(sourceFindings)) {
    const saved = calibration.knownFalsePassCalibrations[name];
    assert.equal(findings.length, expectedCounts[name].recordCount, name);
    assert.equal(saved.recordCount, findings.length, name);
    assert.deepEqual(saved.rows.map(row => row.uid).sort(), findings.map(finding => finding.records[0].uid).sort(), name);
    assert.deepEqual(saved.candidateGeometryHitsByCategory, expectedCounts[name].candidateGeometryHitsByCategory, name);
    for (const finding of findings) {
      assert.equal(finding.kind, 'wrong-row-focus-independent-source-review', name);
      assert.equal(finding.independent, true, `${name}:${finding.id}`);
      const reviewed = finding.records[0];
      const record = witnessByUid.get(reviewed.uid);
      const savedRow = saved.rows.find(row => row.uid === reviewed.uid);
      assert.ok(record, `${name}:${reviewed.uid}`);
      assert.equal(record.rowIdentitySha256, reviewed.rowIdentitySha256, `${name}:${reviewed.uid}`);
      assert.equal(record.focusGeometrySha256, reviewed.focusGeometrySha256, `${name}:${reviewed.uid}`);
      assert.equal(record.semanticPass, false, `${name}:${reviewed.uid}`);
      assert.equal(savedRow.sourceFindingId, finding.id, `${name}:${reviewed.uid}`);
      assert.equal(savedRow.candidateGeometryCount, 1, `${name}:${reviewed.uid}`);
      assert.ok(savedRow.unassessedGeometryCount >= 1, `${name}:${reviewed.uid}`);
    }
  }
  const priorPositive = assassination.all39PriorPositiveFocusAssessments.priorAssessments;
  const currentAssassinationIds = new Set(sourceFindings.assassination.map(finding => finding.records[0].uid));
  assert.equal(assassination.all39PriorPositiveFocusAssessments.count, 39);
  assert.equal(priorPositive.filter(row => currentAssassinationIds.has(`phb-dmg-supplement-row:${row.sourceRowOrClaimId}`) && row.focusDisposition === 'source-focus-reviewed').length, 15);
  const positive = calibration.positiveSourceControl;
  const positiveRecord = witnessByUid.get(positive.uid);
  assert.equal(positive.recordId, armor.positiveSourceObservation.recordId);
  assert.equal(positiveRecord.uid, positive.uid);
  assert.equal(positiveRecord.semanticPass, false);
  assert.deepEqual(positive.candidateCategories, ['text-box-crossing-candidate']);
  assert.equal(positive.expectedNumberPresentSomewhere, true);
});
