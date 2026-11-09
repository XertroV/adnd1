import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {auditSourceTableSegments} from '../tools/source-table-segment-audit.mjs';

const review = JSON.parse(fs.readFileSync(new URL('../research/source-audit-pass8-mm2-dungeon-continuation-independent.json', import.meta.url), 'utf8'));
const sourceCensus = review.sourceSegmentCensus;

test('reviewed MM2 source segments account for all ten 2–20 tables across columns and pages', () => {
  const result = auditSourceTableSegments(sourceCensus);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.physicalRows, 190);
  assert.equal(result.missingOutcomes, 0);
  assert.ok(Object.values(result.tableCounts).every(table => table.physicalRows === 19 && table.uniqueRolls === 19));
  assert.equal(result.sourceSemanticApproval, false);
});

test('the actual preserved 163-row/27-gap assessment contradicts the reviewed source segments', () => {
  const result = auditSourceTableSegments(sourceCensus, review.beforeFailure.actualCapturedAssessment.counts);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'IV: declared 3 printed rows, source segments contain 19',
    'IX: declared 8 printed rows, source segments contain 19',
    'Total: declared 163 printed rows, source segments contain 190',
    'Gap claim: declared 27 unprinted outcomes, source segments omit 0',
  ]);
});

test('omitting the two headless adjacent-column continuations recreates the bounded 27-row loss', () => {
  const damaged = structuredClone(sourceCensus);
  damaged.segments = damaged.segments.filter(segment => !['iv-133-right-continuation', 'ix-134-right-continuation'].includes(segment.id));
  const result = auditSourceTableSegments(damaged);
  assert.equal(result.valid, false);
  assert.equal(result.physicalRows, 163);
  assert.equal(result.missingOutcomes, 27);
  assert.deepEqual(result.tableCounts.IV.missing, Array.from({length: 16}, (_, index) => index + 5));
  assert.deepEqual(result.tableCounts.IX.missing, Array.from({length: 11}, (_, index) => index + 10));
});

test('literal VI continuation heading alone cannot override the independently reviewed VII association', () => {
  const damaged = structuredClone(sourceCensus);
  const continuation = damaged.segments.find(segment => segment.id === 'vii-134-left-continuation');
  assert.equal(continuation.literalPrintedHeading, 'MONSTER LEVEL VI cont.');
  assert.match(continuation.associationBasis, /Explicit inference/);
  continuation.tableId = 'VI';
  const result = auditSourceTableSegments(damaged);
  assert.equal(result.valid, false);
  assert.equal(result.tableCounts.VI.duplicates.length, 8);
  assert.equal(result.tableCounts.VII.missing.length, 8);
});
