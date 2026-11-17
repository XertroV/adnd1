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
