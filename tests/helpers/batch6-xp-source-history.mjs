import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {resolveMechanicsCitationPageTransfer} from '../../tools/mechanics-citation-page-transfer.mjs';
import {withoutGeneratedCitationTransport} from '../equipment-source-first-fixture.mjs';

const root = resolve(import.meta.dirname, '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = path => readFileSync(resolve(root, path));
const read = path => JSON.parse(bytes(path));
const freezePath = 'research/source-audit-batch6-xp206-hp10-source-unit-final-freeze.json';
assert.equal(sha(bytes(freezePath)), '903c3972235c601dd96035b267ec5bbbe0af2cbccb1ff60ace89606f299db07f');
const freeze = read(freezePath);
const beforeAlias = read('research/source-audit-batch5-continuation-alias-before.json');
const beforeSource = read('research/source-audit-batch6-xp-target-integration-before.json');
const sourcePin = path => freeze.sourcePins.find(pin => pin.path === path);
const original = path => execFileSync('git', ['show', `${freeze.baseCommit}:${path}`], {cwd: root});

export function reverseApprovedGrandDruidSourcePage(classes) {
  const copy = structuredClone(classes), druid = copy.find(item => item.id === 'ua-druid');
  assert.ok(druid, 'Grand Druid remains represented in the class checkpoint');
  const path = 'research/source-audit-batch6-grand-druid-mechanics-citation-page-transfer.json';
  assert.equal(sha(bytes(path)), 'ce34f1206624f1122e4f55d8b4ceda5598eb221ff6520201ff28f798680d4f9b');
  const transfer = read(path).transfers[0], rows = withoutGeneratedCitationTransport(druid.xpRows);
  if (isDeepStrictEqual(rows, transfer.beforeWholeXpRows)) return copy;
  const fixtureBytes = bytes(transfer.beforeFixture.path);
  assert.equal(sha(fixtureBytes), transfer.beforeFixture.sha256);
  const review = JSON.parse(JSON.parse(gunzipSync(fixtureBytes)).ledgerRawUtf8).reviewRecords[transfer.beforeFixture.reviewRecordIndex];
  const result = resolveMechanicsCitationPageTransfer({collection: 'classes', id: 'ua-druid', review, change: review.changes[0], currentValue: rows});
  assert.ok(result, 'Only the separately approved Grand[16]→[16,17] source-page metadata may be reversed');
  druid.xpRows[0].pages = [16];
  assert.deepEqual(withoutGeneratedCitationTransport(druid.xpRows), transfer.beforeWholeXpRows);
  return copy;
}

export function xpBeforeCatalogsForAliasReplay(currentCatalogs) {
  const scoped = freeze.sourcePins.filter(pin => pin.path.startsWith('dist/scans/verified/') && pin.path.endsWith('.json'));
  assert.equal(scoped.length, 17);
  const result = new Map(currentCatalogs);
  for (const pin of scoped) {
    assert.equal(sha(bytes(pin.path)), pin.sha256, `${pin.path}: current catalog must equal the independently approved XP/source-family state`);
    const beforeBytes = original(pin.path), catalogPath = pin.path.slice(5);
    assert.deepEqual(currentCatalogs.get(catalogPath), read(pin.path), `${pin.path}: caller cannot substitute unreviewed catalog content`);
    assert.equal(sha(beforeBytes), beforeAlias.inputHashes.catalogs[catalogPath], `${pin.path}: exact historical alias-input hash`);
    result.set(catalogPath, JSON.parse(beforeBytes));
  }
  return result;
}

export function reverseApprovedXpExcerptCounts(overrides) {
  assert.equal(sha(bytes('citation-overrides.json')), sourcePin('citation-overrides.json').sha256);
  assert.deepEqual(overrides, read('citation-overrides.json'), 'Caller must supply the exact approved current source descriptors');
  const oldBytes = original('citation-overrides.json');
  assert.equal(sha(oldBytes), beforeSource.inputs.find(pin => pin.path === 'citation-overrides.json').sha256);
  const old = JSON.parse(oldBytes), copy = structuredClone(overrides);
  const keys = Object.keys(copy.sourceExcerpts).filter(key => copy.sourceExcerpts[key].regionCount !== old.sourceExcerpts[key]?.regionCount);
  assert.equal(keys.length, 17);
  for (const key of keys) {
    const selected = copy.sourceExcerpts[key].catalog;
    assert(sourcePin(`dist/${selected}`), `${key}: no unrelated excerpt count can be reversed`);
    copy.sourceExcerpts[key].regionCount = old.sourceExcerpts[key].regionCount;
  }
  assert.deepEqual(copy, old, 'Only the17 independently approved class/progression catalog counts differ');
  return copy;
}
