import {reverseClosureCorrections} from './mechanics-closure-fixture.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const load = file => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
const data = load('dist/data.json');
const authorClasses = load('classes.json').classes;
const progression = load('progression-overrides.json');
const uaDetails = load('ua-spells.json').spells;
const byId = new Map(data.spells.map(spell => [spell.id, spell]));

test('assembly includes every indexed spell and the current class checkpoint plus reviewed progression metadata', () => {
  assert.equal(data.spells.length, 638);
  assert.equal(data.spells.filter(spell => spell.effect?.length).length, 638);
  assert.deepEqual(reverseClosureCorrections(data.classes,'classes').map(({sourceExcerpts,...cls})=>cls), reverseClosureCorrections(authorClasses.map(cls=>({...cls,...progression.classes[cls.id]})),'classes'), 'authored level changes and reviewed metadata must survive assembly');
  const {sourceExcerpts, ...explainer} = data.progressionExplainer;
  assert.deepEqual(explainer, progression.explainer);
  const indexed = [...load('phb-spell-index.json').spells, ...load('ua-spell-index.json').spells];
  assert.deepEqual(new Set(byId.keys()), new Set(indexed.map(spell => spell.id)));
});

test('assembly retains indexed aliases and shared cantrip access with all source pages', () => {
  const indexed = [...load('phb-spell-index.json').spells, ...load('ua-spell-index.json').spells];
  for (const spell of indexed) {
    const actual = byId.get(spell.id);
    for (const alias of spell.aliases || []) assert.ok(actual.aliases?.includes(alias), `${spell.id}: lost source alias ${alias}`);
    if (spell.classes?.length > 1) {
      assert.deepEqual(new Set(actual.classes), new Set(spell.classes), `${spell.id}: shared class access`);
      for (const page of spell.pages) assert.ok(actual.pages.includes(page), `${spell.id}: lost shared-class source page ${page}`);
    }
  }
  assert.equal(data.spells.filter(spell => spell.book==='UA' && spell.level===0 && spell.classes?.includes('Illusionist')).length, 66);
});

test('the four corrected UA cards reach the assembled site without stale mechanics', () => {
  for (const id of ['ua-magic-user-whip','ua-magic-user-dolor','ua-magic-user-dismissal','ua-magic-user-irritation']) {
    const source = uaDetails.find(spell => spell.id===id);
    const actual = byId.get(id);
    assert.ok(source && actual, id);
    for (const key of ['fields','effect','conditions','exceptions','incomplete','status']) assert.deepEqual(actual[key], source[key], `${id}: ${key}`);
  }
});
