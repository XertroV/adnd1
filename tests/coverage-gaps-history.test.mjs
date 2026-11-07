import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';

const fixture = JSON.parse(readFileSync('research/gaps-page-baseline.json', 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('the preceding Sources page and missing-offer baseline remain tied to immutable Git inputs', () => {
  for (const [file, key] of [['dist/app.js', 'app'], ['dist/data.json', 'rawCoreData'], ['research/gaps-limitations-next-task.json', 'handoff']]) {
    const bytes = execFileSync('git', ['show', `${fixture.baselineCommit}:${file}`], {maxBuffer: 32 * 1024 * 1024});
    assert.equal(sha(bytes), fixture.inputHashes[key], file);
  }
  assert.notEqual(spawnSync('git', ['cat-file', '-e', `${fixture.baselineCommit}:dist/coverage-gaps.json`]).status, 0);
  assert.equal(fixture.observedBefore.gapEntries, 0);
  assert.equal(fixture.observedBefore.slingPackagePresent, false);
  assert.equal(fixture.observedBefore.quarrelsOfferPresent, false);
  assert.equal(fixture.observedBefore.missing175Disclosed, true);
  assert.equal(fixture.observedBefore.unverified239And240Disclosed, true);
});

test('the historical coverage receipt keeps distinct known failure categories', () => {
  const categories = fixture.implementationRegressions.map(item => item.category);
  assert.equal(new Set(categories).size, 5);
  const targets = fixture.implementationRegressions.find(item => item.category === 'input-to-output-topic-targets');
  assert.deepEqual(targets.missingBefore, ['#spells/ua-illusionist-magic-mirror']);
  const pointers = fixture.implementationRegressions.find(item => item.category === 'output-provenance-pointers');
  assert.equal(pointers.denominatorBefore, 138);
  assert.equal(pointers.unresolvedBefore, 34);
});
