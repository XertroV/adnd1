import test from 'node:test';
import assert from 'node:assert/strict';
import {continuationValidationGate, reportContinuationOrder} from '../tools/continuation-order-audit.mjs';

test('unavailable or malformed continuation coverage cannot report a passing CI gate', () => {
  for (const error of ['Manifest unavailable', 'Malformed continuation manifest']) {
    const gate = continuationValidationGate({available: false, status: 'not-assessable', error});
    assert.equal(gate.valid, false);
    assert.equal(gate.contractError, error);
  }
  assert.equal(continuationValidationGate({available: true}).valid, false);
});

test('unannotated semantic work does not waive a declared failure or fail a valid known contract', () => {
  const coverage = {available: true, validation: {groups: 14}, ordering: {counts: {'declared-order-consistent': 14, 'not-assessable': 1}}};
  assert.equal(continuationValidationGate(coverage).valid, true);
  const reversed = structuredClone(coverage);
  reversed.ordering.counts['confirmed-order-defect'] = 1;
  assert.equal(continuationValidationGate(reversed).valid, false);
  const unavailable = structuredClone(coverage);
  unavailable.validation = {valid: false, error: 'Required segment is absent'};
  assert.equal(continuationValidationGate(unavailable).valid, false);
});

test('a catalog read error remains an explicit row in the declared denominator', () => {
  const report = reportContinuationOrder({groups: [{id: 'unavailable', catalog: 'scans/unavailable.json'}]}, () => {throw new Error('Catalog unavailable');});
  assert.equal(report.denominator, 1);
  assert.equal(report.counts['not-assessable'], 1);
  assert.equal(report.groups[0].reason, 'Catalog unavailable');
});
