import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const data = JSON.parse(fs.readFileSync(new URL('../dist/data.json', import.meta.url), 'utf8'));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url);
const citations = require('../dist/citations.js');
const catalogPath = 'dist/scans/verified/rules-cleric-turning-table.json';
const catalog = readJson(catalogPath);
const candidateReviewPath = 'research/source-audit-batch6-turning-matrix-root-independent-review.json';
const candidateReview = readJson(candidateReviewPath);
const candidateReviewSha = sha256(fs.readFileSync(path.join(root, candidateReviewPath)));
const expectedRows = [
  ['Skeleton', [], ['10', '7', '4', 'T', 'T', 'D', 'D', 'D*', 'D*', 'D*']],
  ['Zombie', [], ['13', '10', '7', 'T', 'T', 'D', 'D', 'D', 'D*', 'D*']],
  ['Ghoul', [], ['16', '13', '10', '4', 'T', 'T', 'D', 'D', 'D', 'D*']],
  ['Shadow', [], ['19', '16', '13', '7', '4', 'T', 'T', 'D', 'D', 'D*']],
  ['Wight', [], ['20', '19', '16', '10', '7', '4', 'T', 'T', 'D', 'D']],
  ['Ghast', [], ['--', '20', '19', '13', '10', '7', '4', 'T', 'T', 'D']],
  ['Wraith', [], ['--', '--', '20', '16', '13', '10', '7', '4', 'T', 'D']],
  ['Mummy', ['a'], ['--', '--', '--', '20', '16', '13', '10', '7', '4', 'T']],
  ['Spectre', ['b'], ['--', '--', '--', '--', '20', '16', '13', '10', '7', 'T']],
  ['Vampire', ['c'], ['--', '--', '--', '--', '--', '20', '16', '13', '10', '4']],
  ['Ghost', ['d'], ['--', '--', '--', '--', '--', '--', '20', '16', '13', '7']],
  ['Lich', ['e'], ['--', '--', '--', '--', '--', '--', '--', '19', '16', '10']],
  ['Special', ['**', 'f'], ['--', '--', '--', '--', '--', '--', '--', '20', '19', '13']],
];

test('Cleric turning table preserves the reviewed 13 × 10 source matrix', () => {
  const item = data.rules.find(record => record.id === 'cleric-turning-table');
  assert.ok(item, 'source-approved DMG p.75–76 table entry must be present');
  assert.equal(item.category, 'Class abilities');
  assert.equal(item.book, 'DMG');
  assert.deepEqual(item.pages, [75, 76]);
  for (const alias of ['turn undead', 'cleric table', 'cleric turning undead matrix']) {
    assert.ok(item.aliases.includes(alias), `search alias missing: ${alias}`);
  }

  const table = item.table;
  assert.equal(table.title, 'III. MATRIX FOR CLERICS AFFECTING UNDEAD, et al.');
  assert.equal(table.rowHeader.label, 'Type of Undead');
  assert.equal(table.columnGroup.label, 'Level of Cleric Attempting to Turn†');
  const columnLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9-13', '14+'];
  assert.deepEqual(table.columns.map(column => column.label), columnLabels);
  assert.equal(table.rows.length, 13);

  for (const [index, [label, markers, rawValues]] of expectedRows.entries()) {
    const row = table.rows[index];
    assert.equal(row.label, label, `row ${index + 1} label`);
    assert.deepEqual(row.markers, markers, `${label} printed marker(s)`);
    assert.equal(row.cells.length, 10, `${label} cell count`);
    assert.deepEqual(row.cells.map(cell => cell.raw), rawValues, `${label} source values`);
    assert.ok(row.cells.every(cell => typeof cell.raw === 'string'), `${label} raw cell values stay literal`);
  }
  assert.equal(table.rows.reduce((total, row) => total + row.cells.length, 0), 130);

  assert.equal(candidateReview.independentOfAuthor, true);
  assert.equal(candidateReview.cellComparison.rows, 13);
  assert.equal(candidateReview.cellComparison.columns, 10);
  assert.equal(candidateReview.cellComparison.dataCells, 130);
  assert.equal(candidateReview.cellComparison.matches, 130);
  assert.deepEqual(candidateReview.cellComparison.mismatches, []);
  assert.deepEqual(candidateReview.cellComparison.approvedRows.map(row => [row.label, row.cells]),
    expectedRows.map(([label, , cells]) => [label, cells.map(cell => cell === '--' ? '—' : cell)]));

  const notes = new Map(table.footnotes.map(note => [note.marker, note.text]));
  for (const marker of ['†', '*', '**', 'a', 'b', 'c', 'd', 'e', 'f']) {
    assert.ok(notes.has(marker), `printed note ${marker} is present`);
  }
  const symbols = new Map(table.symbols.map(symbol => [symbol.symbol, symbol.text]));
  for (const symbol of ['T', 'D', '--', '*', '**']) assert.ok(symbols.has(symbol), `symbol meaning ${symbol} is present`);
  assert.match(table.procedure.find(step => step.step === 'roll')?.text || '', /d20/i);
  assert.match(table.procedure.find(step => step.step === 'roll')?.text || '', /matches or exceeds/i);
  assert.ok(table.progressionNote?.sourceFocusId, 'progression note is tied to a precise source focus');

  const refs = item.sourceReferences;
  assert.deepEqual(refs.map(ref => [ref.book, ref.printedPage, ref.pdfPage]), [
    ['DMG', 75, 76], ['DMG', 76, 77], ['DMG', 76, 77],
  ]);
  const focusById = new Map(refs.flatMap(ref => ref.focusRects.map(focus => [focus.id, { book: ref.book, printedPage: ref.printedPage }])));
  for (const row of table.rows) {
    assert.equal(focusById.get(row.sourceRowFocusId)?.printedPage, 75, `${row.label} focus resolves to DMG p.75`);
    assert.ok(row.cells.every(cell => cell.sourceFocusId === row.sourceRowFocusId), `${row.label} cell focus stays within its own row`);
  }
  for (const focusId of ['number-affected-star', 'special-lower-planes', 'd20-procedure', 'evil-cleric-step', 'good-cleric-step', 'failure-rule', 'symbol-T', 'symbol-D', 'symbol-dash', 'non-even-progression']) {
    assert.equal(focusById.get(focusId)?.printedPage, 76, `continuation focus ${focusId} resolves to DMG p.76`);
  }

  const rowGroups = readJson('research/citation-continuations.json').groups
    .filter(group => group.id.startsWith('cleric-turning-row-context-'));
  assert.equal(rowGroups.length, 13, 'each row has its own ordered continuation group');
  const baseLeft = catalog.regions.find(region => region.id === 'dmg-76-turning-v2-c3301320dd02');
  const baseRight = catalog.regions.find(region => region.id === 'dmg-76-turning-v2-69d73be55834');
  const contextRegionIds = new Set();
  for (const [index, row] of table.rows.entries()) {
    const group = rowGroups.find(candidate => candidate.id === `cleric-turning-row-context-${row.id}-dmg-75-76`);
    assert.ok(group, `${row.label} has a row-specific continuation group`);
    assert.equal(group.collection, 'rules');
    assert.equal(group.itemId, item.id);
    assert.equal(group.catalog, catalogPath.replace(/^dist\//, ''));
    assert.deepEqual(group.segments.map(segment => [segment.order, segment.book, segment.printedPage, segment.pdfPage]), [
      [1, 'DMG', 75, 76], [2, 'DMG', 76, 77], [3, 'DMG', 76, 77],
    ]);
    assert.equal(group.segments[0].regionId, row.sourceReference.verification.regions[0]);
    const left = catalog.regions.find(region => region.id === group.segments[1].regionId);
    const right = catalog.regions.find(region => region.id === group.segments[2].regionId);
    assert.ok(left && right, `${row.label} linked context regions exist`);
    assert.notEqual(left.id, baseLeft.id);
    assert.notEqual(right.id, baseRight.id);
    assert.deepEqual(left.focusRects, baseLeft.focusRects, `${row.label} left context retains every reviewed focus`);
    assert.deepEqual(right.focusRects, baseRight.focusRects, `${row.label} right context retains every reviewed focus`);
    assert.equal(left.sha256, baseLeft.sha256);
    assert.equal(right.sha256, baseRight.sha256);
    assert.equal(contextRegionIds.has(left.id), false, `${row.label} uses a unique left context ID`);
    assert.equal(contextRegionIds.has(right.id), false, `${row.label} uses a unique right context ID`);
    contextRegionIds.add(left.id);
    contextRegionIds.add(right.id);

    const binding = row.sourceReference.evidenceBindings?.[0];
    assert.ok(binding, `${row.label} source chip has an attached exact field binding`);
    assert.equal(binding.collection, 'rules');
    assert.equal(binding.itemId, item.id);
    assert.equal(binding.sourceOwner.collection, 'rules');
    assert.equal(binding.sourceOwner.itemId, item.id);
    assert.equal(binding.fieldPointer, `/table/rows/${index}`);
    assert.equal(binding.sourceObjectPointer, `/table/rows/${index}/sourceReference`);
    assert.equal(binding.reviewStatus, 'field-target-reviewed');
    assert.equal(binding.regionIds.length, 1);
    assert.equal(binding.regionIds[0], row.sourceReference.verification.regions[0]);
    assert.equal(binding.targetReview.evidenceSha256, candidateReviewSha);
    const target = citations.targets(row.sourceReference).find(candidate => candidate.fieldPointer === `/table/rows/${index}`);
    assert.ok(target, `${row.label} source citation resolves to a field target`);
    assert.deepEqual(target.regionIds, [binding.regionIds[0]]);
    assert.deepEqual(target.fieldOwner, { collection: 'rules', itemId: item.id });
    assert.deepEqual(target.sourceOwner, { collection: 'rules', itemId: item.id });
  }
  assert.equal(contextRegionIds.size, 26);

  const nonRowFacts = [
    ['/table/title', '/table/titleSourceReference', item.table.titleSourceReference],
    ['/table/rowHeader/label', '/table/rowHeader/sourceReference', item.table.rowHeader.sourceReference],
    ['/table/columnGroup/label', '/table/columnGroup/sourceReference', item.table.columnGroup.sourceReference],
    ...item.table.symbols.map((fact, index) => [`/table/symbols/${index}`, `/table/symbols/${index}/sourceReference`, fact.sourceReference]),
    ...item.table.procedure.map((fact, index) => [`/table/procedure/${index}`, `/table/procedure/${index}/sourceReference`, fact.sourceReference]),
    ...item.table.footnotes.map((fact, index) => [`/table/footnotes/${index}`, `/table/footnotes/${index}/sourceReference`, fact.sourceReference]),
    ['/table/progressionNote', '/table/progressionNote/sourceReference', item.table.progressionNote.sourceReference],
  ];
  assert.equal(nonRowFacts.length, 22);
  for (const [fieldPointer, sourceObjectPointer, sourceReference] of nonRowFacts) {
    assert.equal(sourceReference.evidenceBindings?.length, 1, `${fieldPointer} has one exact attached source binding`);
    const binding = sourceReference.evidenceBindings[0];
    assert.equal(binding.fieldPointer, fieldPointer);
    assert.equal(binding.sourceObjectPointer, sourceObjectPointer);
    assert.deepEqual(binding.sourceOwner, { collection: 'rules', itemId: item.id });
    assert.equal(binding.regionIds.length, 1);
    assert.equal(binding.targetReview.evidenceSha256, candidateReviewSha);
    const target = citations.targets(sourceReference).find(candidate => candidate.fieldPointer === fieldPointer);
    assert.ok(target, `${fieldPointer} source citation resolves to an exact target`);
    assert.deepEqual(target.regionIds, binding.regionIds);
  }

  assert.equal(catalog.regions.length, 61);
  assert.equal(item.sourceExcerpts.catalog, catalogPath.replace(/^dist\//, ''));
  assert.equal(item.sourceExcerpts.regionCount, 61);
  const visualReviews = readJson('research/source-visual-reviews.json').reviews
    .filter(review => review.collection === 'rules' && review.itemId === item.id && review.binding === 'sourceExcerpts');
  assert.equal(visualReviews.length, 61);
  assert.ok(visualReviews.every(review => review.assessments?.highlight?.status === 'confirmed'
    && review.assessments?.highlight?.independent === true && review.imageSha256));

  const classes = readJson('classes.json').classes;
  const cleric = classes.find(candidate => candidate.id === 'cleric');
  assert.ok(!cleric.pendingMechanics.includes('Complete turn-undead table delta'));
  for (const classId of ['paladin', 'ua-paladin']) {
    assert.ok(classes.find(candidate => candidate.id === classId).pendingMechanics.includes('Complete turn-undead table delta'));
  }
  assert.ok(data.rules.some(record => record.id === 'turning-undead'), 'the separate DMG p.65 mixed-group rule remains intact');
  assert.doesNotMatch(JSON.stringify(item), /\/workspace\/private-adnd|\/tmp\/batch6-/);
});
