import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {
  decodePass8XpContinuationHistory,
  projectPass8XpContinuationJson as project,
  projectPass8XpContinuationBytes as projectBytes,
  projectPass8CharacterReferenceJson as projectCharacter,
  projectPass8CharacterReferenceBytes as projectCharacterBytes,
} from './helpers/pass8-xp-continuation-history.mjs';
// Explicit PHB outer input stage; all original XP projectors and negative assertions remain closed.
import {projectPass8PhbSourceBytes,readBeforePass8XpContinuationFile as readBefore,readBeforePass8CharacterReferenceFile as readBeforeCharacter} from '../research/mm-source-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs';

const root = new URL('../', import.meta.url), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const liveBytes = path => readFileSync(new URL(path, root));
const xpAppliedCommit = 'a46eddc41ac6f712d5ad1498195df6a49810aae1';
// These four derived metadata files have an independently reviewed successor.
// The closed XP stage still receives only its exact a46 bytes; no newer source,
// catalog, data, grade, or arbitrary metadata state is projected into history.
const supersededMetadata = new Set(['research/current-source-raster-snapshot.json','research/gaps-limitations-next-task.json','dist/coverage-gaps.json','research/current-continuation-candidate-snapshot.json']);
const capturedMetadata = new Map();
const bytes = path => {
  if (!supersededMetadata.has(path)) return projectPass8PhbSourceBytes(path,liveBytes(path));
  if (!capturedMetadata.has(path)) capturedMetadata.set(path, execFileSync('git', ['show', `${xpAppliedCommit}:${path}`], {cwd:root,maxBuffer:100 * 1024 * 1024}));
  return Buffer.from(capturedMetadata.get(path));
};
const read = path => JSON.parse(bytes(path));
const zipped = bytes('tests/fixtures/pass8-xp-continuation-history-v1.json.gz');
const contract = decodePass8XpContinuationHistory(zipped);
const oldBytes = path => execFileSync('git', ['show', `${contract.baseCommit}:${path}`], {cwd: root, maxBuffer: 100 * 1024 * 1024});

test('all24 exact XP-stage files restore complete Git777 predecessor objects and raw bytes', () => {
  for (const [path, stage] of Object.entries(contract.files)) {
    const current = bytes(path), before = oldBytes(path);
    assert.equal(sha(current), stage.currentRawSha256, path);
    assert.equal(sha(before), stage.beforeRawSha256, path);
    assert.deepEqual(projectBytes(path, current), before, `${path}: complete raw predecessor`);
    assert.deepEqual(projectBytes(path, before), before, `${path}: exact before is an explicit no-op`);
    const beforeObject = JSON.parse(before);
    assert.deepEqual(project(path, JSON.parse(current)), beforeObject, `${path}: complete object predecessor`);
    assert.deepEqual(project(path, beforeObject), beforeObject);
  }
});

test('current frame metadata is a separate successor rejected by the closed XP adapter', () => {
  for (const path of supersededMetadata) {
    assert.equal(sha(bytes(path)),contract.files[path].currentRawSha256,`${path}: exact a46 XP stage`);
    const successor=liveBytes(path);
    assert.notEqual(sha(successor),contract.files[path].currentRawSha256,`${path}: current frame successor is explicit`);
    assert.throws(()=>projectBytes(path,successor),/exact XP before\/current raw input bytes/);
    assert.throws(()=>project(path,JSON.parse(successor)),/exact approved current or complete before state/);
  }
});

test('every scoped current and predecessor object rejects unrelated additions and raw-byte drift', () => {
  for (const path of Object.keys(contract.files)) {
    for (const original of [read(path), JSON.parse(oldBytes(path))]) {
      original.unapprovedHistoryCanary = 'must not disappear';
      assert.throws(() => project(path, original), /exact approved current or complete before state/);
    }
    assert.throws(() => projectBytes(path, Buffer.concat([bytes(path), Buffer.from(' ')])), /exact XP before\/current raw input bytes/);
  }
});

test('all11 appended catalog cohorts reject missing, duplicate, altered old or new source identities', () => {
  for (const path of Object.keys(contract.files).filter(path => path.startsWith('dist/scans/verified/'))) {
    for (const mutate of [
      value => value.regions.shift(),
      value => value.regions.push(structuredClone(value.regions.at(-1))),
      value => value.regions[0].title += ' changed',
      value => value.regions.at(-1).focusRects[0][0] += .001,
      value => value.sources[value.regions[0].book].sha256 = 'e'.repeat(64),
    ]) {
      const candidate = read(path); mutate(candidate);
      assert.throws(() => project(path, candidate));
    }
  }
});

test('source values, reviewed grades, routing, mixed states and source-comparison substitutions reject', () => {
  const path = 'dist/data.json', before = JSON.parse(oldBytes(path));
  for (const mutate of [
    value => value.classes.find(c => c.id === 'cleric').xpContinuation.increment++,
    value => value.classes.find(c => c.id === 'cleric').xpContinuation.evidenceBindings[0].sourceValueStatus = 'source-value-independently-confirmed',
    value => value.classes.find(c => c.id === 'cleric').xpContinuation.evidenceBindings[0].regionIds = ['other-region'],
    value => value.classes.find(c => c.id === 'cleric').xpContinuation = structuredClone(before.classes.find(c => c.id === 'cleric').xpContinuation),
    value => value.equipment[0].name += ' unrelated change',
    value => value.release.excerpts.regions++,
  ]) {
    const candidate = read(path); mutate(candidate);
    assert.throws(() => project(path, candidate));
  }
  for (const mutate of [
    value => value.groups.at(-1).sourceComparison.pages[0].sourceSha256 = 'e'.repeat(64),
    value => value.groups.at(-1).segments.reverse(),
    value => value.groups[0].scope = 'unrelated rewritten source claim',
  ]) {
    const candidate = read('research/citation-continuations.json'); mutate(candidate);
    assert.throws(() => project('research/citation-continuations.json', candidate));
  }
});

test('only11 field identities change despite deterministic binding-array reordering; all4561 other bindings are exact', () => {
  const path = 'research/price-source-inventory.json', current = read(path), before = JSON.parse(oldBytes(path));
  const identity = row => JSON.stringify([row.collection, row.itemId, row.fieldPointer, row.sourceObjectPointer, row.sourceCategory, row.book, row.printedPage]);
  const old = new Map(before.fieldEvidenceBindings.map(row => [identity(row), row]));
  assert.equal(old.size, 4572);
  let changed = 0, unchanged = 0;
  for (const row of current.fieldEvidenceBindings) {
    const previous = old.get(identity(row)); assert.ok(previous);
    if (row.collection === 'classes' && row.fieldPointer === '/xpContinuation') {
      changed++;
      assert.equal(previous.reviewStatus, 'field-target-pending');
      assert.equal(row.reviewStatus, 'field-target-reviewed');
      assert.equal(row.sourceValueStatus, previous.sourceValueStatus);
    } else {
      unchanged++;
      assert.deepEqual(row, previous);
    }
  }
  assert.equal(changed, 11); assert.equal(unchanged, 4561);
});

test('cached predecessor objects and buffers cannot be poisoned or admit modified current inputs', () => {
  const path = 'dist/scans/verified/classes-cleric.json', current = read(path), expected = JSON.parse(oldBytes(path));
  const first = project(path, current); first.regions[0].title = 'mutated returned object';
  assert.deepEqual(project(path, current), expected);
  const raw = projectBytes(path, bytes(path)); raw[0] ^= 1;
  assert.deepEqual(projectBytes(path, bytes(path)), oldBytes(path));
  current.regions[0].title = 'mutated after cache priming';
  assert.throws(() => project(path, current));
});

test('hidden/non-JSON mutations reject before fingerprinting and cannot be erased', () => {
  const path = 'dist/scans/verified/classes-cleric.json';
  for (const mutate of [
    value => value.hidden = undefined,
    value => value.hidden = NaN,
    value => value.hidden = Infinity,
    value => value.hidden = -0,
    value => value[Symbol('hidden')] = true,
    value => Object.defineProperty(value, 'hidden', {value: true}),
    value => Object.defineProperty(value, 'hidden', {get: () => true, enumerable: true}),
    value => delete value.regions[0],
    value => Object.defineProperty(value.regions, 'hidden', {value: true}),
    value => Object.setPrototypeOf(value.regions[0], {hidden: true}),
  ]) {
    const candidate = read(path); mutate(candidate);
    assert.throws(() => project(path, candidate));
  }
});

test('native read behavior and the unchanged older character-reference stage compose explicitly', () => {
  for (const path of ['dist/data.json', 'research/price-source-inventory.json', 'dist/scans/verified/classes-cleric.json']) {
    const url = new URL(path, root), before = oldBytes(path);
    assert.deepEqual(readBefore(url), before);
    assert.equal(readBefore(url, 'utf8'), before.toString());
    assert.equal(readBefore(url, {encoding: 'utf8'}), before.toString());
  }
  assert.deepEqual(readBefore(new URL('equipment.json', root)), bytes('equipment.json'));
  assert.throws(() => project('equipment.json', read('equipment.json')), /no XP continuation history projection/);
  const oldContract = JSON.parse(gunzipSync(bytes('tests/fixtures/pass8-character-reference-history-v1.json.gz')));
  assert.equal(sha(readBeforeCharacter(new URL('dist/data.json', root))), oldContract.files['dist/data.json'].beforeRawSha256);
  assert.equal(sha(bytes('tests/helpers/pass8-character-reference-history.mjs')), '67ebc08c45e088b41c3b208c1f01cffa6965c36ed8f9875a9d603f84ff5840b9');
  assert.equal(sha(bytes('tests/fixtures/matrix-baseline.mjs')), 'fb5ddc3f922e84799589d9019fe9a87f4f6cedbcffe68c51e3b2217a9b9684a7');
});

test('actual27-failure evidence and closed contract remain exact; a corrupted contract rejects', () => {
  for (const pin of [...contract.archives, ...contract.sourceProofs, contract.actualFailedFullRun.inputs, contract.actualFailedFullRun.log]) assert.equal(sha(bytes(pin.path)), pin.sha256);
  assert.equal(contract.actualFailedFullRun.registeredTests, 832);
  assert.equal(contract.actualFailedFullRun.failed, 27);
  const corrupt = Buffer.from(zipped); corrupt[40] ^= 1;
  assert.throws(() => decodePass8XpContinuationHistory(corrupt), /exact XP history contract bytes/);
});

test('composed JSON and raw-byte stages retain all three exact ancestor states and reject related/unrelated or mixed states', () => {
  const path = 'dist/data.json', oldestBytes = readBeforeCharacter(new URL(path, root)), oldest = JSON.parse(oldestBytes);
  for (const raw of [bytes(path), oldBytes(path), oldestBytes]) {
    const original = JSON.parse(raw);
    assert.deepEqual(projectCharacter(path, original), oldest);
    assert.deepEqual(projectCharacterBytes(path, raw), oldestBytes);
    for (const mutate of [
      value => value.classes.find(c => c.id === 'cleric').xpContinuation.increment++,
      value => value.equipment[0].name += ' unrelated mutation',
    ]) {
      const candidate = structuredClone(original); mutate(candidate);
      assert.throws(() => projectCharacter(path, candidate));
      assert.throws(() => projectCharacterBytes(path, Buffer.from(JSON.stringify(candidate, null, 2) + '\n')));
    }
  }
  const mixed = read(path), predecessor = JSON.parse(oldBytes(path));
  mixed.classes.find(c => c.id === 'cleric').xpContinuation = predecessor.classes.find(c => c.id === 'cleric').xpContinuation;
  assert.throws(() => projectCharacter(path, mixed));
  assert.throws(() => projectCharacterBytes(path, Buffer.from(JSON.stringify(mixed, null, 2) + '\n')));
});
