// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import {reverseClosureCorrections} from './mechanics-closure-fixture.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import test from 'node:test';
import {assertUaSourceContextBindingCohort} from './helpers/ua-source-closed-v28-context.mjs';
import {readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort} from './helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');

const load = file => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
const data = load('dist/data.json');
const authorClasses = load('classes.json').classes;
const progression = load('progression-overrides.json');
const uaDetails = load('ua-spells.json').spells;
const byId = new Map(data.spells.map(spell => [spell.id, spell]));

test('assembly includes every indexed spell and the current class checkpoint plus reviewed progression metadata', () => {
  assert.equal(data.spells.length, 638);
  assert.equal(data.spells.filter(spell => spell.effect?.length).length, 638);
  assertMmTreasureCurrentSourceCohort(readMmTreasureCurrentSourceInputs(root));
  const classBindings=data.classes.flatMap(owner=>(owner.references||[]).flatMap(reference=>reference.evidenceBindings||[]));
  assert.equal(assertUaSourceContextBindingCohort(classBindings).length,24,'the exact prior 24 UA class reference objects remain present in the current native source');
  const currentClasses=reverseClosureCorrections(data.classes,'classes');
  const authoredClasses=reverseClosureCorrections(authorClasses.map(cls=>({...cls,...progression.classes[cls.id]})),'classes');
  for(const [index,authored]of authoredClasses.entries())assert.deepEqual(Object.fromEntries(Object.keys(authored).map(key=>[key,currentClasses[index][key]])),authored,'every current authored class property and reviewed progression value survives assembly; the native guard separately checks the complete generated reference and excerpt metadata');
  const {sourceExcerpts, id:explainerId, ...explainer} = data.progressionExplainer;
  assert.equal(explainerId, 'progression-explainer', 'synthetic citation owner identity remains stable');
  const withoutGeneratedTransport=value=>Array.isArray(value)?value.map(withoutGeneratedTransport):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['evidenceBindings','regionReviews'].includes(key)).map(([key,child])=>[key,withoutGeneratedTransport(child)])):value;
  assert.deepEqual(withoutGeneratedTransport(explainer), progression.explainer);
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
