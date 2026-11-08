import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildPublishedContinuations} from '../tools/published-continuations.mjs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const manifest = read('research/citation-continuations.json');
const data = read('dist/data.json');

test('browser continuation projection includes every declared ordered part and no private review content', () => {
  const input = structuredClone(manifest);
  input.privateFiles = ['/private/full-book.pdf'];
  input.groups[0].sourceComparison.privateNote = 'DO_NOT_PUBLISH_PRIVATE_REVIEW';
  const output = buildPublishedContinuations({manifest: input, data, catalogRoot: resolve('dist')});
  const segmentCount=manifest.groups.reduce((count,group)=>count+group.segments.length,0);
  const blockedCount=manifest.groups.flatMap(group=>group.segments).filter(segment=>segment.state==='blocked-source-unavailable').length;
  assert.deepEqual(output.counts, {
    groups: manifest.groups.length,
    segments: segmentCount,
    present: segmentCount-blockedCount,
    blocked: blockedCount,
  });
  assert.deepEqual(output.groups.map(group => group.id), manifest.groups.map(group => group.id));
  for (const group of output.groups) {
    const original = manifest.groups.find(candidate => candidate.id === group.id);
    assert.deepEqual(group.segments.map(segment => segment.regionId), original.segments.map(segment => segment.regionId));
    assert.ok(original.segments.length > 0, `${group.id} declares at least one segment`);
    assert.deepEqual(group.segments.map(segment => segment.order), original.segments.map((_, index) => index + 1));
    assert.deepEqual(group.segments.map(segment => segment.role), original.segments.map(segment => segment.role));
    assert.equal(group.catalog, original.catalog);
  }
  assert.doesNotMatch(JSON.stringify(output), /full-book\.pdf|DO_NOT_PUBLISH_PRIVATE_REVIEW|sourceComparison|privateFiles/);
});

test('the published continuation asset cannot bypass source/catalog validation', () => {
  const stale = structuredClone(manifest);
  stale.groups[0].segments[1].imageSha256 = '0'.repeat(64);
  assert.throws(() => buildPublishedContinuations({manifest: stale, data, catalogRoot: resolve('dist')}), /binding|image/i);
});
