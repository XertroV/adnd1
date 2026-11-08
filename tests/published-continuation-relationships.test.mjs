import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildPublishedContinuations} from '../tools/published-continuations.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = read('research/citation-continuations.json');
const data = read('dist/data.json');
const related = {
  kind: 'related-source-rules',
  label: 'Solid Fog',
  reason: 'The owner passage explicitly points to this related rule; no individual fields are transferred.',
  ownerPage: {book: 'UA', printedPage: 70},
};

function onlyAbjureWithRelationship() {
  const input = structuredClone(manifest);
  const group = input.groups.find(candidate => candidate.id === 'ua-cleric-abjure-ua-37');
  assert.ok(group);
  group.relationship = related;
  input.groups = [group];
  return input;
}

test('published continuation projection carries only validated relationship metadata', () => {
  const input = onlyAbjureWithRelationship();
  const [group] = input.groups;
  const output = buildPublishedContinuations({manifest: input, data, catalogRoot: resolve('dist')});
  const projected = output.groups.find(candidate => candidate.id === group.id);
  assert.deepEqual(projected.relationship, related);
  assert.equal(projected.segments.length, group.segments.length);
  assert.equal(JSON.stringify(projected).includes('sourceTextExcerpt'), false);
});

test('malformed relationship metadata is rejected before publication', () => {
  const input = onlyAbjureWithRelationship();
  input.groups[0].relationship.ownerPage = {book: 'PRIVATE', printedPage: 0};
  assert.throws(() => buildPublishedContinuations({manifest: input, data, catalogRoot: resolve('dist')}), /invalid owner-passage relationship/);
});

