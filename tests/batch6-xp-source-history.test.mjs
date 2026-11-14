import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforePass8XpContinuationFile as readFileSync} from '../research/class-mapping-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs';
import {execFileSync} from 'node:child_process';
import {reverseApprovedGrandDruidSourcePage, xpBeforeCatalogsForAliasReplay, reverseApprovedXpExcerptCounts} from './helpers/ua-source-batch6-xp-source-history.mjs';
const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)));
const data = read('dist/data.json');

test('historical class replay reverses only the exact approved Grand source page', () => {
  const expected = structuredClone(data.classes);
  expected.find(item => item.id === 'ua-druid').xpRows[0].pages = [16];
  const actual = reverseApprovedGrandDruidSourcePage(data.classes);
  assert.deepEqual(actual, expected);
  assert.deepEqual(data.classes.find(item => item.id === 'ua-druid').xpRows[0].pages, [16, 17]);
  for (const mutate of [rows => rows[0].xp++, rows => rows[0].level++, rows => rows[0].track = 'changed', rows => rows[0].pages = [17], rows => rows[1].pages = [16, 17]]) {
    const copy = structuredClone(data.classes); mutate(copy.find(item => item.id === 'ua-druid').xpRows);
    assert.throws(() => reverseApprovedGrandDruidSourcePage(copy));
  }
  const unrelated = structuredClone(data.classes);
  unrelated.find(item => item.id === 'cleric').xpRows[0].xp++;
  assert.equal(reverseApprovedGrandDruidSourcePage(unrelated).find(item => item.id === 'cleric').xpRows[0].xp, unrelated.find(item => item.id === 'cleric').xpRows[0].xp);
});

test('the released777 alias checkpoint uses exact approved catalogs and frozen older catalog hashes', () => {
  const freeze = read('research/source-audit-batch6-xp206-hp10-source-unit-final-freeze.json');
  const pins = freeze.sourcePins.filter(pin => pin.path.startsWith('dist/scans/verified/') && pin.path.endsWith('.json'));
  const catalogs = new Map(pins.map(pin => [pin.path.slice(5), read(pin.path)]));
  const replay = xpBeforeCatalogsForAliasReplay(catalogs);
  assert.equal(replay.size, 17);
  assert(replay.get('scans/verified/classes-magic-user.json').regions.length < catalogs.get('scans/verified/classes-magic-user.json').regions.length);
  const changed = structuredClone(catalogs);
  changed.get('scans/verified/classes-magic-user.json').regions[0].printedPage = 99;
  assert.throws(() => xpBeforeCatalogsForAliasReplay(changed));
});

test('source-descriptor replay rejects changes beyond the seventeen approved region counts', () => {
  const overrides = JSON.parse(execFileSync('git', ['show', 'c2efd1eba27f0b3047ef4ce80f7db187597c808f:citation-overrides.json']));
  const replay = reverseApprovedXpExcerptCounts(overrides);
  const keys = Object.keys(overrides.sourceExcerpts).filter(key => overrides.sourceExcerpts[key].regionCount !== replay.sourceExcerpts[key].regionCount);
  assert.equal(keys.length, 17);
  const changed = structuredClone(overrides);
  changed.sourceExcerpts['classes:magic-user'].regionCount++;
  assert.throws(() => reverseApprovedXpExcerptCounts(changed));
  assert.throws(() => reverseApprovedXpExcerptCounts(read('citation-overrides.json')), 'A combined Jo/Search state cannot bypass its separate exact projection');
});
