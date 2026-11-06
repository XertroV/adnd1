import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reverseMatrixCellReview} from './fixtures/matrix-baseline.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
const authored = read('attack-matrices.json').matrices;
const before = read('tests/fixtures/matrix-before-cell-review.json').matrices;

test('undoing approved cell additions and their metadata preserves the entire earlier matrix', () => {
 assert.deepEqual(reverseMatrixCellReview(authored), before);
});

test('aerial conversion is limited to the magical devices named in the source', () => {
 const rule=read('rules.json').rules.find(item=>item.id==='aerial-long-distance');
 assert.equal(rule.summary,'For long-distance travel on a flying carpet or similar magical device, every 3 inches of speed corresponds to one mile per hour.');
 assert.deepEqual([rule.book,rule.pages],['DMG',[50]]);
 assert.match(rule.status,/visual review pending/i);
});
