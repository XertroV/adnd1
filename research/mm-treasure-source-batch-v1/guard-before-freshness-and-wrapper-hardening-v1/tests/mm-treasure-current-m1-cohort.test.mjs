// Focused negative controls for the uninstalled successor. The loader and its
// closed candidate fixture are generated only after the source-fix commit is
// independently fixed; this file is intentionally not run against the known
// p.74 crop-defect source commit.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assertMmTreasureCurrentSourceCohort, readMmTreasureCurrentSourceInputs} from './helpers/mm-treasure-current-m1-cohort-v1.mjs';

const repoRoot = '/workspace/adnd1-next-source-native';
const original = readMmTreasureCurrentSourceInputs(repoRoot);
const clone = () => structuredClone(original);
const mustReject = (name, mutate, messagePattern = /exact|preserv|denominator|pending|MM|source|retained|table|byte/) => {
  test(`MM current M1 guard rejects ${name}`, () => {
    const candidate = clone();
    mutate(candidate);
    assert.throws(() => assertMmTreasureCurrentSourceCohort(candidate), messagePattern);
  });
};

test('MM current M1 guard accepts the exact source payload and reports separate denominators', () => {
  const result = assertMmTreasureCurrentSourceCohort(original);
  assert.equal(result.owners, 1064);
  assert.equal(result.addedOwners, 2);
  assert.equal(result.canonicalBindings, 5731);
  assert.equal(result.retainedCanonicalBindings, 5655);
  assert.equal(result.addedCanonicalBindings, 76);
  assert.equal(result.manualBindings, 1293);
  assert.equal(result.addedManualBindings, 42);
  assert.equal(result.tableRows, 26);
  assert.equal(result.tableCells, 208);
  assert.equal(result.historicalMechanicsReviewRecords, 1215);
});

mustReject('an edit to a retained H owner', input => {
  input.data.rules[0].title = `${input.data.rules[0].title} altered`;
});
mustReject('an extra old-owner mutation hidden by appending the MM rules', input => {
  input.data.rules.find(rule => rule.id === 'hirelings').title += ' altered';
});
mustReject('an undeclared source metadata edit alongside the approved MM coverage sentence', input => {
  input.data.sources.find(source => source.id === 'DMG').coverage += ' altered';
});
mustReject('any change to the complete table cell transcription', input => {
  input.data.rules.find(rule => rule.id === 'mm-treasure-types-table').table.rows[0].cells[0].raw += ' altered';
});
mustReject('one missing canonical MM binding', input => {
  input.inventory.fieldEvidenceBindings.pop();
});
mustReject('a changed region-verified helper review status', input => {
  input.inventory.fieldEvidenceBindings.find(binding => binding.itemId === 'mm-treasure-types-table' && binding.reviewStatus === 'region-verified').reviewStatus = 'field-target-pending';
});
mustReject('an edited H manual-prefix declaration', input => {
  input.manual.bindings[0].fieldPointer += '/mutated';
});
mustReject('an MM manual declaration promoted to reviewed', input => {
  input.manual.bindings[1251].reviewStatus = 'field-target-reviewed';
});
mustReject('an edited historical mechanics review record', input => {
  input.mechanics.reviewRecords[0].reviewer = 'changed';
});
mustReject('a new source image or catalog byte change', input => {
  const path = Object.keys(input.additionalInputs)[0];
  input.additionalInputs[path] = '0'.repeat(64);
});
mustReject('a source raw input supplied under a forged hash', input => {
  input.rawInputs['dist/data.json'] = '0'.repeat(64);
});
mustReject('a changed MM rule id or order', input => {
  input.data.rules.reverse();
});

// Exercise shape-hardening separately from the source-content controls.
test('MM current M1 guard rejects proxy input before serialization', () => {
  const candidate = clone();
  candidate.data = new Proxy(candidate.data, {});
  assert.throws(() => assertMmTreasureCurrentSourceCohort(candidate), /proxi/i);
});

test('MM current M1 guard rejects an intermediate inherited toJSON hook without invoking it', () => {
  const candidate = clone();
  let hookCalls = 0;
  const originalParent = Object.getPrototypeOf(Array.prototype);
  const insertedParent = Object.create(Object.prototype);
  Object.defineProperty(insertedParent, 'toJSON', {value() { hookCalls += 1; return 'serialized'; }});
  let thrown;
  try {
    Object.setPrototypeOf(Array.prototype, insertedParent);
    try {
      assertMmTreasureCurrentSourceCohort(candidate);
    } catch (error) {
      thrown = error;
    }
  } finally {
    Object.setPrototypeOf(Array.prototype, originalParent);
  }
  assert.match(String(thrown), /inserted Array\.prototype parents/);
  assert.equal(hookCalls, 0, 'the inherited serialization hook must never run');
});
