// Additive Source2 family successor; original case and historical-role assertions are preserved.
// Current Source2 admission remains a separate genuine zero-argument identity case.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforePass8CharacterReferenceFile as readFileSync} from "../research/class-mapping-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-source2-v1.mjs";
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {buildLedger, validateLedger} from '../tools/mechanics-audit.mjs';
import {resolveMechanicsCitationPageTransfer} from '../tools/mechanics-citation-page-transfer.mjs';

const root = resolve(import.meta.dirname, '..');
const read = path => JSON.parse(readFileSync(resolve(root, path)));
const fixture = JSON.parse(gunzipSync(readFileSync(resolve(root, 'tests/fixtures/source-audit-batch6-grand-page-mechanics-stale-before.json.gz'))));
const before = JSON.parse(fixture.ledgerRawUtf8);
const document = read('research/source-audit-batch6-grand-druid-mechanics-citation-page-transfer.json');
const transfer = document.transfers[0];
const original = before.reviewRecords[transfer.beforeFixture.reviewRecordIndex];
const input = () => ({collection: 'classes', id: 'ua-druid', review: structuredClone(original), change: structuredClone(original.changes[0]), currentValue: structuredClone(transfer.afterWholeXpRows)});

test('exact approved page join retains original comparisons and all mechanics grades', () => {
  const data = read('dist/data.json');
  const legacy = structuredClone(data);
  legacy.classes.find(item => item.id === 'ua-druid').xpRows[0].pages = [16];
  const expected = buildLedger(legacy, before.reviewRecords, {alreadyNormalized: true});
  const actual = buildLedger(data, before.reviewRecords, {alreadyNormalized: true});
  assert.deepEqual(actual.reviewRecords, before.reviewRecords);
  assert.deepEqual(actual.counts, expected.counts);
  assert.deepEqual(actual.records.map(r => [r.collection, r.id, r.fields]), expected.records.map(r => [r.collection, r.id, r.fields]));
  assert.equal(actual.validation.staleChanges.length, 0);
  assert.equal(actual.citationPageOnlyTransfers.length, 1);
  assert.equal(actual.citationPageOnlyTransfers[0].originalReviewPreserved, true);
  assert.equal(actual.citationPageOnlyTransfers[0].sourceValueGrade, 'NOT PROMOTED');
  assert.deepEqual(validateLedger(actual, data), []);
  const forged = structuredClone(actual);
  delete forged.citationPageOnlyTransfers;
  assert(validateLedger(forged, data).some(error => error.includes('citation-page-only transfers')));
});

test('numeric, track, status, source and row-structure mutations never use the page transfer', () => {
  const mutations = [
    value => value[0].xp++, value => value[0].level++, value => value[0].track = 'changed',
    value => value[0].book = 'PHB', value => value[0].status = 'source-checked',
    value => value[1].pages = [16, 17], value => value[0].pages = [17],
    value => value[0].pages = [17, 16], value => value[0].pages = [16, 17, 18],
    value => value.reverse(), value => value.pop(), value => value.push(structuredClone(value.at(-1))),
  ];
  for (const mutate of mutations) {
    const candidate = input(); mutate(candidate.currentValue);
    assert.equal(resolveMechanicsCitationPageTransfer(candidate), null);
  }
  const data = read('dist/data.json');
  data.classes.find(item => item.id === 'ua-druid').xpRows[0].xp++;
  const actual = buildLedger(data, before.reviewRecords, {alreadyNormalized: true});
  assert.equal(actual.validation.staleChanges.length, 1);
  assert.equal(actual.citationPageOnlyTransfers, undefined);
  assert(actual.records.find(r => r.collection === 'classes' && r.id === 'ua-druid').fields.some(f => f.status === 'stale-proposal'));
});

test('owner, checker, path and original review/correction changes cannot borrow approval', () => {
  for (const mutate of [
    value => value.id = 'other', value => value.collection = 'rules',
    value => value.review.checker = 'another-reviewer', value => value.change.path = '/xpRows/0',
    value => value.review.checkedValues['/xpRows/0/xp'] = 42,
    value => value.change.oldValue[0].xp++, value => value.change.newValue[0].pages = [16, 17],
  ]) {
    const candidate = input(); mutate(candidate);
    assert.equal(resolveMechanicsCitationPageTransfer(candidate), null);
  }
});

test('altered or missing transfer, before fixture and independent proof fail closed', () => {
  const paths = [
    'research/source-audit-batch6-grand-druid-mechanics-citation-page-transfer.json',
    transfer.beforeFixture.path, transfer.independentSourcePageReview.path,
  ];
  for (const path of paths) {
    assert.throws(() => resolveMechanicsCitationPageTransfer(input(), {readFile: file => {
      const bytes = readFileSync(file);
      return file === resolve(root, path) ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes;
    }}));
    assert.throws(() => resolveMechanicsCitationPageTransfer(input(), {readFile: file => {
      if (file === resolve(root, path)) throw new Error('missing evidence');
      return readFileSync(file);
    }}));
  }
});

test('the retained historical page state uses its existing review without a transfer', () => {
  const data = read('dist/data.json');
  data.classes.find(item => item.id === 'ua-druid').xpRows[0].pages = [16];
  const actual = buildLedger(data, before.reviewRecords, {alreadyNormalized: true});
  assert.equal(actual.citationPageOnlyTransfers, undefined);
  assert.equal(actual.validation.staleChanges.length, 0);
});


// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
