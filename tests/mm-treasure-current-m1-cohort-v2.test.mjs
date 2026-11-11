// Focused negative controls for the uninstalled successor. The loader and its
// closed candidate fixture are generated only after the source-fix commit is
// independently fixed; this file is intentionally not run against the known
// p.74 crop-defect source commit.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {assertMmTreasureCurrentSourceCohort, readMmTreasureCurrentSourceInputs} from './helpers/mm-treasure-current-m1-cohort-v2.mjs';
import {createMmTreasureCurrentSourceCohort} from './helpers/mm-treasure-current-m1-cohort-factory-v2.mjs';

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
}, /extra-input snapshot|selected MM|current-worktree/i);
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

test('MM current M1 guard rejects a proxy around the outer input wrapper without invoking traps', () => {
  let trapCalls = 0;
  const candidate = new Proxy(original, {
    get() { trapCalls += 1; throw new Error('getter trap ran'); },
    ownKeys() { trapCalls += 1; throw new Error('ownKeys trap ran'); },
    getOwnPropertyDescriptor() { trapCalls += 1; throw new Error('descriptor trap ran'); },
  });
  assert.throws(() => assertMmTreasureCurrentSourceCohort(candidate), /proxi/i);
  assert.equal(trapCalls, 0, 'proxy traps are never invoked during wrapper preflight');
});

test('MM current M1 guard rejects a top-level accessor without invoking its getter', () => {
  const candidate = {...original};
  let getterCalls = 0;
  Object.defineProperty(candidate, 'data', {enumerable: true, configurable: true, get() { getterCalls += 1; throw new Error('data getter ran'); }});
  assert.throws(() => assertMmTreasureCurrentSourceCohort(candidate), /accessors/);
  assert.equal(getterCalls, 0, 'the outer wrapper data getter is never invoked');
});

test('MM current M1 guard rejects a custom outer prototype before inherited toJSON can run', () => {
  const candidatePrototype = Object.create(Object.prototype);
  let hookCalls = 0;
  Object.defineProperty(candidatePrototype, 'toJSON', {value() { hookCalls += 1; return 'serialized'; }});
  const candidate = Object.assign(Object.create(candidatePrototype), original);
  assert.throws(() => assertMmTreasureCurrentSourceCohort(candidate), /plain objects/);
  assert.equal(hookCalls, 0, 'an inherited wrapper serialization hook never runs');
});

test('MM current M1 guard re-reads physical source files and rejects a catalog changed after snapshot read', () => {
  const contractBytes = readFileSync(new URL('./fixtures/mm-treasure-current-m1-cohort-v1.json', import.meta.url));
  const temporaryWorktree = mkdtempSync(join(tmpdir(), 'mm-current-source-view-'));
  const target = 'dist/scans/verified/rules-mm-treasure-type-use.json';
  const rootTarget = resolve(repoRoot, target);
  const isolatedTarget = resolve(temporaryWorktree, target);
  const originalTargetBytes = readFileSync(rootTarget);
  const originalTargetSha256 = createHash('sha256').update(originalTargetBytes).digest('hex');
  const allPaths = [...Object.keys(original.rawInputs), ...Object.keys(original.additionalInputs)];
  try {
    for (const path of allPaths) {
      const destination = resolve(temporaryWorktree, path);
      mkdirSync(dirname(destination), {recursive: true});
      if (path === target) copyFileSync(rootTarget, destination);
      else symlinkSync(resolve(repoRoot, path), destination);
    }
    const isolatedCohort = createMmTreasureCurrentSourceCohort({
      repoRoot,
      worktreeRoot: temporaryWorktree,
      contractBytes,
      expectedContractSha256: '7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550',
    });
    const savedSnapshot = isolatedCohort.readMmTreasureCurrentSourceInputs(temporaryWorktree);
    writeFileSync(isolatedTarget, Buffer.concat([originalTargetBytes, Buffer.from('\nmutated-after-read\n')]));
    assert.throws(() => isolatedCohort.assertMmTreasureCurrentSourceCohort(savedSnapshot), /fresh current-worktree hashes for selected MM assets and metadata are exact/);
    assert.equal(createHash('sha256').update(readFileSync(rootTarget)).digest('hex'), originalTargetSha256, 'only the isolated temp view was mutated');
  } finally {
    rmSync(temporaryWorktree, {recursive: true, force: true});
  }
});
