import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforePass8XpContinuationFile as readFileSync} from './helpers/pass8-weapon-source-history.mjs';
// Exercise the original character-reference adapter at its exact777 successor
// checkpoint, after the separately guarded XP outer stage has been reversed.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {
  decodePass8CharacterReferenceHistory,
  projectPass8CharacterReferenceJson as project,
  projectPass8CharacterReferenceBytes as projectBytes,
} from './helpers/pass8-xp-continuation-history.mjs';

import {readBeforePass8CharacterReferenceFile as readBefore} from './helpers/pass8-weapon-source-history.mjs';

const root = new URL('../', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(new URL(path, root));
const zipped = read('tests/fixtures/pass8-character-reference-history-v1.json.gz');
const contract = decodePass8CharacterReferenceHistory(zipped);
const current = Object.fromEntries(Object.keys(contract.files).map(path => [path, JSON.parse(read(path))]));
const beforeBytes = Object.fromEntries(Object.keys(contract.files).map(path => [path,
  execFileSync('git', ['show', `${contract.baseCommit}:${path}`], {cwd: root, maxBuffer: 32 * 1024 * 1024})]));
const before = Object.fromEntries(Object.entries(beforeBytes).map(([path, bytes]) => [path, JSON.parse(bytes)]));
const spell = data => data.spells.find(row => row.id === 'phb-magic-user-lnfravision');
const secondary = data => data.rules.find(row => row.id === 'secondary-skills');

test('all five released777 inputs restore complete Git-bound predecessor objects and raw bytes', () => {
  for (const path of Object.keys(contract.files)) {
    const input = structuredClone(current[path]);
    assert.deepEqual(project(path, input), before[path], path);
    assert.deepEqual(input, current[path], `${path}: caller is not mutated`);
    assert.deepEqual(project(path, before[path]), before[path], `${path}: exact before state is accepted`);
    assert.deepEqual(projectBytes(path, read(path)), beforeBytes[path], `${path}: all raw predecessor bytes`);
    assert.deepEqual(projectBytes(path, beforeBytes[path]), beforeBytes[path]);
    assert.equal(sha(beforeBytes[path]), contract.files[path].beforeRawSha256);
  }
});

test('the contract scopes three owner identities, three authored inputs and exactly one generated label', () => {
  assert.deepEqual(contract.scope.authoredInputs, ['rules.json', 'phb-spell-index.json', 'phb-magic-user-extra.json']);
  assert.deepEqual(contract.files['dist/data.json'].replacements.map(row => `${row.collection}:${row.id}`), [
    'rules:secondary-skills', 'rules:ua-elven-subrace-adjustments', 'spells:phb-magic-user-lnfravision',
  ]);
  const [binding] = contract.files['research/price-source-inventory.json'].replacements;
  assert.equal(contract.files['research/price-source-inventory.json'].replacements.length, 1);
  assert.equal(binding.before.sourceObject, 'Lnfravision');
  assert.equal(binding.current.sourceObject, 'Infravision');
  assert.deepEqual({...binding.current, sourceObject: binding.before.sourceObject}, binding.before);
  for (const [path, stage] of Object.entries(contract.files)) {
    for (const replacement of stage.replacements) {
      const candidate = structuredClone(current[path]);
      candidate[replacement.collection][replacement.index] = structuredClone(replacement.before);
      if (stage.replacements.length > 1) assert.throws(() => project(path, candidate), /exact approved current or complete before state/);
    }
  }
});

test('unexpected approved-owner values in either current or before state are rejected', () => {
  let exercised = 0;
  for (const [path, stage] of Object.entries(contract.files)) {
    for (const original of [current[path], before[path]]) {
      for (const replacement of stage.replacements) {
        const candidate = structuredClone(original);
        candidate[replacement.collection][replacement.index].unapprovedHistoryCanary = 'do not strip';
        assert.throws(() => project(path, candidate), /exact approved current or complete before state/);
        exercised++;
      }
    }
  }
  assert.equal(exercised, 16);
});

test('missing, duplicate, reordered or renamed approved owners cannot borrow history approval', () => {
  for (const path of ['rules.json', 'phb-spell-index.json', 'phb-magic-user-extra.json', 'dist/data.json']) {
    const {collection, index} = contract.files[path].replacements[0];
    for (const edit of [
      rows => rows.splice(index, 1),
      rows => rows.push(structuredClone(rows[index])),
      rows => [rows[index], rows[0]] = [rows[0], rows[index]],
      rows => rows[index].id = 'other-owner',
    ]) {
      const candidate = structuredClone(current[path]); edit(candidate[collection]);
      assert.throws(() => project(path, candidate));
    }
  }
});

test('all spell alias variants and a second assembled Infravision owner are rejected', () => {
  for (const path of ['phb-spell-index.json', 'phb-magic-user-extra.json', 'dist/data.json']) {
    for (const aliases of [[], ['Lnfravision', 'Lnfravision'], ['unapproved-alias']]) {
      const candidate = structuredClone(current[path]); spell(candidate).aliases = aliases;
      assert.throws(() => project(path, candidate));
    }
  }
  const candidate = structuredClone(current['dist/data.json']);
  candidate.spells.push({...structuredClone(spell(candidate)), id: 'new-infravision-owner'});
  assert.throws(() => project('dist/data.json', candidate));
});

test('unrelated rules, source values, release counters, grades and generated bindings remain visible to guards', () => {
  for (const edit of [
    value => value.rules[0].summary = 'unapproved unrelated prose',
    value => value.classes[0].xpRows[0].xp++,
    value => value.release.excerpts.selectedValuesItems++,
    value => secondary(value).status = 'new grade',
    value => spell(value).evidenceBindings[0].sourceValueStatus = 'verified',
    value => delete value.release.priceInventory.fieldEvidenceBindingsByCollection.equipment,
  ]) {
    const candidate = structuredClone(current['dist/data.json']); edit(candidate);
    assert.throws(() => project('dist/data.json', candidate));
  }
  for (const edit of [
    value => value.fieldEvidenceBindings[1865].sourceObject = 'wrong label',
    value => value.fieldEvidenceBindings[1865].printedPage = 75,
    value => value.fieldEvidenceBindings[0].sourceObject = 'unrelated label',
    value => value.fieldEvidenceBindings.push(structuredClone(value.fieldEvidenceBindings[1865])),
    value => value.counts.pendingRegionBindings--,
  ]) {
    const candidate = structuredClone(current['research/price-source-inventory.json']); edit(candidate);
    assert.throws(() => project('research/price-source-inventory.json', candidate));
  }
});

test('historical reader handles native encoding/URL reads and leaves unrelated inputs current', () => {
  for (const path of Object.keys(contract.files)) {
    assert.deepEqual(readBefore(new URL(path, root)), beforeBytes[path]);
    assert.equal(readBefore(new URL(path, root), 'utf8'), beforeBytes[path].toString());
    assert.equal(readBefore(new URL(path, root), {encoding: 'utf8'}), beforeBytes[path].toString());
    assert.throws(() => projectBytes(path, Buffer.concat([read(path), Buffer.from(' ')])), /exact before\/current raw input bytes/);
  }
  assert.deepEqual(readBefore(new URL('classes.json', root)), read('classes.json'));
  assert.throws(() => project('classes.json', JSON.parse(read('classes.json'))), /no pass8 history projection/);
});

test('non-JSON mutations cannot disappear behind the whole-object fingerprint', () => {
  for (const original of [current['rules.json'], before['rules.json']]) {
    for (const edit of [
      value => value.hiddenCanary = undefined,
      value => value.hiddenCanary = NaN,
      value => value.hiddenCanary = Infinity,
      value => value.hiddenCanary = -0,
      value => value[Symbol('hidden')] = 'canary',
      value => Object.defineProperty(value, 'hiddenCanary', {value: 'canary'}),
      value => Object.defineProperty(value, 'hiddenCanary', {get: () => 'canary', enumerable: true}),
      value => delete value.rules[0],
      value => value.rules.extraCanary = 'canary',
      value => Object.defineProperty(value.rules, 'hiddenCanary', {value: 'canary'}),
      value => Object.setPrototypeOf(value.rules[0], {hiddenCanary: 'canary'}),
    ]) {
      const candidate = structuredClone(original); edit(candidate);
      assert.throws(() => project('rules.json', candidate));
    }
  }
});

test('actual earlier failures, old helper/test states and sealed baseline remain byte-bound', () => {
  for (const prior of contract.beforeFiles) {
    assert.equal(sha(prior.utf8), prior.sha256);
    assert.deepEqual(execFileSync('git', ['show', `${contract.baseCommit}:${prior.path}`], {cwd: root}), Buffer.from(prior.utf8));
  }
  for (const ref of [...contract.references, contract.sealedBaseline]) assert.equal(sha(read(ref.path)), ref.sha256);
  assert.equal(read(contract.sealedBaseline.path).length, 663);
  assert.equal(sha(gunzipSync(read('research/source-audit-pass8-character-reference-mechanics-before.json.gz'))),
    '7d867071deb7384685a9f599b5d4c02e7a815c15e8df318ca03b2c438f660bc6');
  const corrupt = Buffer.from(zipped); corrupt[40] ^= 1;
  assert.throws(() => decodePass8CharacterReferenceHistory(corrupt), /exact captured pass8 history contract/);
});
