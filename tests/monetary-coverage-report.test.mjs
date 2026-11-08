import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMonetaryCoverageReport} from '../tools/monetary-coverage-report.mjs';

const digest = 'a'.repeat(64);
function fixture() {
  return {
    index: {artifactType: 'bounded-monetary-source-inventory', sourceGroupDenominators: {boundedRows: 1}, sourceOccurrences: [{sourceOccurrenceId: 'offer', provenance: {inputArtifact: {path: 'source.json', sha256: digest, jsonPointer: '/rows/0'}}, reviewStatus: 'author pending'}], claims: [{claimId: 'price', sourceOccurrenceId: 'offer'}]},
    audit: {generatedBy: 'tools/monetary-row-identity-audit.mjs', records: [{uid: 'row', input: 'source.json', inputSha256: digest, pointer: '/rows/0', rowIdentitySha256: digest, focusGeometrySha256: digest, physicalRowIdentityReview: 'unassessed-by-programmatic-inventory'}], knownFindings: [{id: 'focus', kind: 'wrong-row-focus-independent-source-review', records: [{uid: 'row'}], status: 'explicit-source-reviewed-repair'}], reviewResults: [{status: 'current-explicit-review'}], validation: {valid: true}},
  };
}

test('a current finding disposition remains separate from author status and semantic completeness', () => {
  const report = buildMonetaryCoverageReport(fixture());
  assert.equal(report.claims.length, 1);
  assert.deepEqual(report.claims[0].auditRowUids, ['row']);
  assert.equal(report.sourceOccurrences[0].upstreamReviewStatus, 'author pending');
  assert.equal(report.sourceOccurrences[0].auditRows[0].knownFindingOutcomes[0].status, 'explicit-source-reviewed-repair');
  assert.equal(report.sourceOccurrences[0].semanticPass, false);
});

test('a stale hash, different pointer or different input cannot borrow a review', () => {
  for (const change of [{sha256: 'b'.repeat(64)}, {jsonPointer: '/rows/1'}, {path: 'other.json'}]) {
    const inputs = fixture();
    Object.assign(inputs.index.sourceOccurrences[0].provenance.inputArtifact, change);
    const report = buildMonetaryCoverageReport(inputs);
    assert.equal(report.sourceOccurrences[0].joinStatus, 'no-exact-audit-row-match');
    assert.deepEqual(report.claims[0].auditRowUids, []);
    assert.equal(report.denominators.indexedSourceOccurrences, 1);
  }
});

test('ambiguous exact rows remain individually visible; dangling claims and duplicate records fail', () => {
  const inputs = fixture();
  inputs.audit.records.push({...inputs.audit.records[0], uid: 'mirror'});
  assert.deepEqual(buildMonetaryCoverageReport(inputs).claims[0].auditRowUids, ['row', 'mirror']);
  inputs.index.claims[0].sourceOccurrenceId = 'missing';
  assert.throws(() => buildMonetaryCoverageReport(inputs), /dangling/);
  inputs.index.claims[0].sourceOccurrenceId = 'offer';
  inputs.audit.records.push({...inputs.audit.records[0]});
  assert.throws(() => buildMonetaryCoverageReport(inputs), /duplicate audit/);
});

test('audit-only records, findings and explicit reviews remain exposed without borrowing an indexed join', () => {
  const inputs = fixture();
  inputs.audit.records.push({...inputs.audit.records[0], uid: 'unindexed-unit', input: 'census.json', pointer: '/claims/36'});
  inputs.audit.knownFindings.push({id: 'unit', kind: 'typed-content-mismatch', records: [{uid: 'unindexed-unit'}], status: 'explicit-source-reviewed-repair'});
  const report = buildMonetaryCoverageReport(inputs);
  assert.equal(report.denominators.matchedAuditRecords, 1);
  assert.equal(report.denominators.auditOnlyRecords, 1);
  assert.equal(report.auditOnlyRows[0].uid, 'unindexed-unit');
  assert.deepEqual(report.auditOnlyRows[0].inputReference, {path: 'census.json', sha256: digest, jsonPointer: '/claims/36'});
  assert.deepEqual(report.sourceOccurrences[0].auditRows[0].inputReference, inputs.index.sourceOccurrences[0].provenance.inputArtifact);
  assert.deepEqual(report.knownFindings, inputs.audit.knownFindings);
  assert.deepEqual(report.reviewResults, inputs.audit.reviewResults);
  assert.deepEqual(report.findingIndexCoverage.find(row => row.findingId === 'unit'), {
    findingId: 'unit', status: 'audit-only', indexedAuditRowUids: [], auditOnlyRowUids: ['unindexed-unit'],
  });
  assert.deepEqual(report.claims[0].auditRowUids, ['row']);
});
