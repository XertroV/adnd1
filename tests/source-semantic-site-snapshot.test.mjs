import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  aggregateFieldCoverage,
  assertFreshOutputs,
  enumerateLeaves,
  fieldProjection,
  instrumentApp,
  literalPresence,
  ownerRecords,
  writeVersionedCheckpoint,
} from '../tools/source-semantic-site-snapshot.mjs';

test('capture checkpoints preserve prior exact bytes and reject reused run destinations', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'source-snapshot-durability-'));
  try {
    const output = path.join(directory, 'private-capture.json.gz');
    const summary = path.join(directory, 'summary.json');
    assert.doesNotThrow(() => assertFreshOutputs([output, summary]));
    const firstBytes = Buffer.from('first observed capture bytes');
    const secondBytes = Buffer.from('later projection bytes');
    const first = await writeVersionedCheckpoint(output, firstBytes);
    const second = await writeVersionedCheckpoint(output, secondBytes);
    assert.notEqual(first.path, second.path);
    assert.deepEqual(fs.readFileSync(first.path), firstBytes);
    assert.deepEqual(fs.readFileSync(second.path), secondBytes);
    assert.deepEqual(fs.readFileSync(output), secondBytes);
    assert.throws(() => assertFreshOutputs([output, summary]), /Refusing to overwrite an existing capture/);
    const repeated = await writeVersionedCheckpoint(output, secondBytes);
    assert.equal(repeated.path, second.path);
    fs.writeFileSync(first.path, 'corrupt preserved evidence');
    await assert.rejects(writeVersionedCheckpoint(output, firstBytes), /EEXIST/);
    assert.deepEqual(fs.readFileSync(output), secondBytes);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('the actual frozen PR40 input has the pinned 1,000 direct record owners', () => {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const input = execFileSync('git', ['show', '6d330af372ac809d11ed6029ed8695d0d8dc0909:dist/data.json'], {cwd: repo, maxBuffer: 32 * 1024 * 1024});
  assert.equal(createHash('sha256').update(input).digest('hex'), 'ceb7c8b9a8fe32b676e57c8d007f124a4490684d54558479e555d504075ba4f3');
  const data = JSON.parse(input);
  const owners = ownerRecords(data);
  assert.equal(owners.length, 1000);
  assert.deepEqual(owners.reduce((counts, owner) => ({...counts, [owner.collection]: (counts[owner.collection] || 0) + 1}), {}), {
    classes: 16, rules: 149, matrices: 4, progressionExplainer: 1, spells: 638, equipment: 192,
  });
  assert.equal(new Set(owners.map(owner => `${owner.collection}:${owner.id}`)).size, owners.length);
});

test('owner enumeration uses collection-qualified identities and includes progression', () => {
  const owners = ownerRecords({
    rules: [{id: 'shared', title: 'Rule'}],
    spells: [{id: 'spell', name: 'Spell'}],
    equipment: [{id: 'shared', name: 'Gear'}],
    classes: [{id: 'class', name: 'Class'}],
    matrices: [{id: 'matrix', title: 'Matrix'}],
    progressionExplainer: {id: 'progression-explainer', title: 'Progression'},
    sources: [{id: 'PHB'}],
  });
  assert.deepEqual(owners.map(({collection, id}) => `${collection}:${id}`), [
    'classes:class', 'rules:shared', 'matrices:matrix', 'progressionExplainer:progression-explainer', 'spells:spell', 'equipment:shared',
  ]);
  assert.equal(owners.some(owner => owner.collection === 'sources'), false);
});

test('leaf enumeration preserves exact pointers and array-pattern pointers', () => {
  const leaves = enumerateLeaves({notes: ['first', 'second'], empty: [], nil: null});
  assert.deepEqual(leaves.map(({pointer, valueType}) => [pointer, valueType]), [
    ['/notes/0', 'string'], ['/notes/1', 'string'], ['/empty', 'empty-array'], ['/nil', 'null'],
  ]);
});

test('field projection separates visible text, DOM-only text, search-only text, and absent literals', () => {
  const result = fieldProjection({
    rendered: 'A sufficiently distinctive rendered note.',
    hidden: 'A hidden note not indexed anywhere.',
    indexed: 'Only indexed searchable wording.',
    absent: 'An authored phrase absent from both outputs.',
    marker: '*',
  }, {
    visibleText: 'A sufficiently distinctive rendered note.',
    textContent: 'A sufficiently distinctive rendered note. A hidden note not indexed anywhere.',
  }, 'Only indexed searchable wording.', 'source control metadata');
  const byPointer = Object.fromEntries(result.map(row => [row.pointer, row]));
  assert.equal(byPointer['/rendered'].classification, 'visible-text-literal-present');
  assert.equal(byPointer['/hidden'].classification, 'dom-text-only-or-not-visible');
  assert.equal(byPointer['/indexed'].classification, 'search-index-only-literal');
  assert.equal(byPointer['/absent'].classification, 'literal-value-not-found-in-rendered-text-or-search');
  assert.equal(byPointer['/marker'].assessable, false);
});

test('empty structured fields retain field patterns for aggregation', () => {
  const rows = fieldProjection({emptyList: [], emptyObject: {}, nullable: null}, {visibleText: '', textContent: ''}, '', '');
  assert.deepEqual(rows.map(row => row.fieldPattern), ['/emptyList', '/emptyObject', '/nullable']);
  const grouped = aggregateFieldCoverage(rows.map(row => ({collection: 'rules', ...row})));
  assert.equal(grouped.length, 3);
  assert.ok(grouped.every(field => field.occurrences === 1));
});

test('literal audit uses whole normalized token sequences and retains punctuation markers', () => {
  assert.equal(literalPresence('attack table', 'Attack-table notes are visible.').matched, true);
  assert.equal(literalPresence('cat', 'concatenate').matched, false);
  assert.deepEqual(literalPresence('*', 'Missiles * -5 at long range.'), {assessable: true, matched: true, method: 'literal-symbol'});
  assert.deepEqual(literalPresence('A hidden note not indexed anywhere.', 'prefixA hidden note not indexed anywhere.suffix'), {assessable: true, matched: true, method: 'literal-exact'});
});

test('capture instrumentation requires one narrow exact initialization anchor', () => {
  const anchor = 'buildIndex();updateCounts();route({force:true});revealInitialReference();';
  const modified = instrumentApp(`before;${anchor}after`);
  assert.match(modified, /__sourceSemanticSnapshotCapture/);
  assert.throws(() => instrumentApp(`before;${anchor}${anchor}after`), /Expected one exact app initialization anchor/);
  assert.throws(() => instrumentApp('changed app entry point'), /Expected one exact app initialization anchor/);
});

test('field aggregation reports property paths as counts without carrying source values', () => {
  const rows = [
    {collection: 'classes', fieldPattern: '/attackTableNote', assessable: true, visibleText: true, domText: true, searchText: true, sourceControlAttributes: false, classification: 'visible-text-literal-present'},
    {collection: 'classes', fieldPattern: '/attackTableNote', assessable: true, visibleText: false, domText: false, searchText: false, sourceControlAttributes: false, classification: 'literal-value-not-found-in-rendered-text-or-search'},
  ];
  const [coverage] = aggregateFieldCoverage(rows);
  assert.deepEqual({fieldPattern: coverage.fieldPattern, occurrences: coverage.occurrences, absent: coverage.literalAbsentFromVisibleAndSearch}, {
    fieldPattern: '/attackTableNote', occurrences: 2, absent: 1,
  });
  assert.equal(Object.hasOwn(coverage, 'value'), false);
});
