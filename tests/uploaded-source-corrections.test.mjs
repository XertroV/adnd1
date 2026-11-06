import {reverseApprovedEquipmentChanges} from './equipment-mechanics-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const equipment = read('equipment.json').equipment;
const spells = read('ua-spells.json').spells;
const assembled = read('dist/data.json');
const get = (items, id) => {
  const item = items.find(entry => entry.id === id);
  assert.ok(item, `missing ${id}`);
  return item;
};

test('PHB weapon corrections retain separate purchase and encumbrance values', () => {
  const originalEquipment = reverseApprovedEquipmentChanges(assembled.equipment);
  const partisan = get(originalEquipment, 'phb-partisan');
  const ranseur = get(originalEquipment, 'phb-ranseur');
  for (const [weapon, amount] of [[partisan, 10], [ranseur, 4]]) {
    assert.deepEqual([weapon.price.amount, weapon.price.currency, weapon.price.book, weapon.price.pages], [amount, 'gp', 'PHB', [35]]);
    assert.match(weapon.price.status, /visually checked/i);
    assert.equal(weapon.incomplete, true);
    assert.match(weapon.status, /visual verification pending/i);
  }
  assert.deepEqual(partisan.fields, {
    'Approx. weight': '80 gp-weight (encumbrance; not purchase cost)',
    'Damage vs S/M': '1–6', 'Damage vs Large': '2–7', 'Weapon speed factor': '9'
  });
  assert.deepEqual(ranseur.fields, {
    'Approx. weight': '50 gp-weight (encumbrance; not purchase cost)',
    'Damage vs S/M': '2–8', 'Damage vs Large': '2–8'
  });
  assert.deepEqual(partisan.fieldSources['Damage vs Large'].pages, [37]);
});

test('UA spell corrections retain partial-review status and unrelated mechanics', () => {
  const endure = get(spells, 'ua-cleric-endure-cold-endure-heat');
  const mirage = get(spells, 'ua-illusionist-mirage-arcane');
  assert.match(endure.effect.join(' '), /−30°F.*130°F/);
  assert.match(endure.effect.join(' '), /1 hp\/hour.*1 hp\/turn/);
  assert.deepEqual(endure.fields, {Range:'Touch', Duration:'9 turns/level', 'Casting time':'1 round', 'Saving throw':'None', Area:'One creature', Components:'V, S'});
  assert.equal(mirage.fields.Area, '1″ per level radius');
  assert.equal(mirage.fields.Range, '1″/level');
  assert.equal(mirage.fields['Casting time'], '3 segments, or 6 with material component');
  assert.deepEqual(endure.pages, [33]);
  assert.deepEqual(mirage.pages, [71]);
  for (const spell of [endure, mirage]) {
    assert.equal(spell.incomplete, true);
    assert.match(spell.status, /visual review pending/i);
  }
});

test('assembled corrections link to scoped source excerpts without upgrading the whole record', () => {
  const cases = [
    ['equipment','phb-partisan','PHB',35], ['equipment','phb-partisan','PHB',37],
    ['equipment','phb-ranseur','PHB',35], ['spells','ua-cleric-endure-cold-endure-heat','UA',33],
    ['spells','ua-illusionist-mirage-arcane','UA',71]
  ];
  for (const [collection,id,book,page] of cases) {
    const item = get(assembled[collection], id);
    assert.equal(item.incomplete, true);
    assert.match(item.status, /visual (?:verification|review) pending/i);
    assert.equal(item.sourceExcerpts.state, 'source-excerpt-checked');
    assert.match(item.sourceExcerpts.scope, /does not verify every card value/i);
    const catalog = read(`dist/${item.sourceExcerpts.catalog}`);
    assert.equal(catalog.itemId, id);
    assert.ok(catalog.regions.some(region => region.book === book && region.printedPage === page && region.verification === 'visually-checked-crop'));
  }
});


test('Dusty omits the unrelated UA p.48 while preserving its mechanics', () => {
  for (const collection of [spells, assembled.spells]) {
    const dusty = get(collection, 'ua-magic-user-dusty');
    assert.deepEqual(dusty.pages, [45,47,65]);
    assert.deepEqual(dusty.fields, {
      Range:'1″ (general cantrip rule)', Components:'V, S (general cantrip rule)',
      Area:'10-foot radius', 'Casting time':'⅙ segment',
      'Casting limit':'Up to two cantrips/round; no leveled spell that round; second cantrip after 1d4 segments'
    });
    assert.deepEqual(dusty.effect, ['Coats exposed surfaces in a film of dust and grime.']);
    assert.deepEqual(dusty.conditions, []);
    assert.deepEqual(dusty.exceptions, []);
  }
});


test('Pyrotechnics omits unrelated PHB p.57 while retaining its mechanics', () => {
  for (const collection of [read('phb-magic-user-extra.json').spells, assembled.spells]) {
    const spell = get(collection, 'phb-magic-user-pyrotechnics');
    assert.deepEqual(spell.pages, [58,71]);
    assert.deepEqual(spell.fields, {Range:'12″', Duration:'Fireworks: 1 segment/level; smoke: 1 round/level', Components:'V, S', 'Casting time':'2 segments', 'Saving throw':'None', Area:'Fireworks: 10× source-fire volume; smoke: 100×'});
    assert.deepEqual(spell.effect, ['Turn a fire into dazzling fireworks that temporarily blind exposed viewers, or a choking smoke cloud that blocks sight beyond two feet.']);
    assert.deepEqual(spell.conditions, ['Requires a fire within range and extinguishes that source immediately.', 'Fireworks also affect unobstructed viewers within 12″ of the display; the smoke conforms to a confined space.']);
    assert.deepEqual(spell.exceptions, []);
  }
});
