// Install this file at tests/class-mapping-native-source-gate-v1.test.mjs.
// It uses only the installed zero-argument native gate and detached JS values;
// it never writes or mutates the physical checkout.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  assertClassMappingCurrentSourceIdentity,
  assertClassMappingCurrentSnapshot,
  assertClassMappingCurrentSourceEpoch,
} from '../tools/class-mapping-current-source-gate-v1.mjs';

const SOURCE_COMMIT = '2d35138027f00c0740975e519dbb3a2b6df76d14';
const SOURCE_TREE = '40ecb15130b339658522794db6d9e1bc58f43b50';
const FIXTURE_SHA256 = 'c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10';
const SOURCE_HASHES = Object.freeze({
  'dist/data.json': '16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573',
  'research/price-source-inventory.json': 'b32a8f8126e73b28fd0609fc7e0856990a454402b440735a77627f26fe986564',
  'research/field-evidence-bindings.json': 'dc8a912cd1054572257e83b654cedb63c8d2d6ff29f327ce0151498b4ad59827',
  'research/mechanics-audit-progress.json': '03643330c73dc3fe88f9abeb8a086883a3955d918cba2573e198563631a75785',
});

const fixtureBytes = readFileSync(new URL('../research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json', import.meta.url));
assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'), FIXTURE_SHA256);
const fixture = JSON.parse(fixtureBytes.toString('utf8'));
assert.equal(fixture.sourceEpoch.sourceCommit, SOURCE_COMMIT);
assert.equal(fixture.sourceEpoch.sourceTree, SOURCE_TREE);
assert.deepEqual(fixture.expected.ownersByCollection, {
  rules: 219, spells: 638, equipment: 192, classes: 16, matrices: 4, progressionExplainer: 1,
});

const expectedSummary = {
  stage: 's1-body-native',
  sourceCommit: SOURCE_COMMIT,
  sourceTree: SOURCE_TREE,
  fixture: {
    path: 'research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json',
    sha256: FIXTURE_SHA256,
  },
  ...fixture.expected,
};

test('installed class-mapping S1 source gate', async t => {
  // Exactly one cold qualification in this process; every later call below is
  // a warm call that still rechecks the fixed physical inputs.
  const cold = assertClassMappingCurrentSourceEpoch();
  assert.deepEqual(cold.summary, expectedSummary);
  assert.equal(cold.inputHashes.sourceBody['dist/data.json'], SOURCE_HASHES['dist/data.json']);
  for (const [path, sha256] of Object.entries(SOURCE_HASHES)) {
    assert.equal(cold.inputHashes.sourceBody[path], sha256, `${path} source-body hash`);
  }

  await t.test('source identity, current four parts, and reviewed counts', () => {
    const identity = assertClassMappingCurrentSourceIdentity();
    assert.deepEqual(identity, {summary: cold.summary, inputHashes: cold.inputHashes});
    assert.deepEqual(Object.keys(cold.inputs).sort(), ['data', 'inventory', 'manual', 'mechanics']);
    assert.deepEqual(assertClassMappingCurrentSnapshot(cold.inputs), expectedSummary);

    assert.equal(cold.summary.owners, 1070);
    assert.equal(cold.summary.canonicalBindings, 5851);
    assert.equal(cold.summary.manualBindings, 1391);
    assert.equal(cold.summary.canonicalReviewStatuses['field-target-reviewed'], 773);
  });

  await t.test('exact 40 newly added mechanics fields remain unchecked', () => {
    const oldFields = fixture.preservation.mechanics.oldFields;
    const newFields = fixture.preservation.mechanics.newFields;
    assert.equal(oldFields, 14201);
    assert.equal(newFields, 40);
    assert.equal(cold.summary.mechanics.totalFields - oldFields, newFields);
    assert.equal(cold.summary.mechanics.uncheckedFields, 939);
    assert.equal(fixture.preservation.mechanics.newFieldsSha256,
      'b61cf6b3b8216b05928206438e5bb5a2ab2ac5a9274f92d7c3a34fef3f9d5895');
    // The cold native gate recomputes the new-field projection against the
    // frozen parent and rejects unless all 40 are unchecked and uninspected.
  });

  await t.test('public APIs reject caller root, identity, count, and arity overrides', () => {
    assert.throws(() => assertClassMappingCurrentSourceEpoch('/tmp/other-repository'));
    assert.throws(() => assertClassMappingCurrentSourceEpoch({expectedCounts: {owners: 1}}));
    assert.throws(() => assertClassMappingCurrentSourceIdentity({sourceCommit: 'caller'}), /Installed class mapping identity gate accepts no caller overrides/);
    assert.throws(() => assertClassMappingCurrentSnapshot());
    assert.throws(() => assertClassMappingCurrentSnapshot(cold.inputs, null));
    const withCallerCounts = {...cold.inputs, expectedCounts: {owners: 1}};
    assert.throws(() => assertClassMappingCurrentSnapshot(withCallerCounts));
  });

  await t.test('snapshot accessors, proxies, and symbol keys are rejected without evaluation', () => {
    let getterCalls = 0;
    let proxyCalls = 0;
    const accessorSnapshot = {...cold.inputs};
    Object.defineProperty(accessorSnapshot, 'data', {
      enumerable: true,
      configurable: true,
      get() { getterCalls++; return cold.inputs.data; },
    });
    assert.throws(() => assertClassMappingCurrentSnapshot(accessorSnapshot));

    const proxySnapshot = new Proxy(cold.inputs, {
      get() { proxyCalls++; throw new Error('snapshot proxy trap should not execute'); },
      ownKeys() { proxyCalls++; throw new Error('snapshot proxy trap should not execute'); },
      getOwnPropertyDescriptor() { proxyCalls++; throw new Error('snapshot proxy trap should not execute'); },
    });
    assert.throws(() => assertClassMappingCurrentSnapshot(proxySnapshot));

    const symbolSnapshot = {...cold.inputs};
    symbolSnapshot[Symbol('unexpected')] = true;
    assert.throws(() => assertClassMappingCurrentSnapshot(symbolSnapshot));
    assert.equal(getterCalls, 0);
    assert.equal(proxyCalls, 0);
  });

  await t.test('changed detached data and identity copies cannot corrupt later warm proofs', () => {
    const detached = structuredClone(cold.inputs);
    detached.data.release.date = 'detached-copy-mutation';
    assert.throws(() => assertClassMappingCurrentSnapshot(detached));

    const laterEpoch = assertClassMappingCurrentSourceEpoch();
    assert.deepEqual(laterEpoch.summary, expectedSummary);
    for (const [path, sha256] of Object.entries(SOURCE_HASHES)) {
      assert.equal(laterEpoch.inputHashes.sourceBody[path], sha256, `${path} warm recovery hash`);
    }

    const detachedIdentity = assertClassMappingCurrentSourceIdentity();
    detachedIdentity.summary.owners = -1;
    assert.deepEqual(assertClassMappingCurrentSourceIdentity(), {summary: expectedSummary, inputHashes: cold.inputHashes});
  });
});
