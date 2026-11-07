import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

export const sourceFirstEquipment = JSON.parse(readFileSync(new URL('./fixtures/equipment-source-first-batch1.json', import.meta.url), 'utf8')).records;
const priceCompletionFixture = JSON.parse(readFileSync(new URL('./fixtures/equipment-price-completion-73.json', import.meta.url), 'utf8'));
export const sourcePriceCompletionEquipment = priceCompletionFixture.records;

export function withoutGeneratedCitationTransport(value) {
 if (Array.isArray(value)) return value.map(withoutGeneratedCitationTransport);
 if (value && typeof value === 'object') {
  return Object.fromEntries(Object.entries(value)
   .filter(([key]) => !['evidenceBindings', 'regionReviews'].includes(key))
   .map(([key, child]) => [key, withoutGeneratedCitationTransport(child)]));
 }
 return value;
}

function validateFixtureRecords(equipment, records, expectedCount, fixtureName) {
 const ids = new Set(records.map(item => item.id));
 assert.equal(ids.size, expectedCount, `${fixtureName}: unique fixture ids`);
 for (const expected of records) {
  const matches = equipment.filter(item => item.id === expected.id);
  assert.equal(matches.length, 1, `${fixtureName}: ${expected.id} appears once`);
  for (const [key, value] of Object.entries(expected)) {
   assert.deepEqual(
    withoutGeneratedCitationTransport(matches[0][key]),
    withoutGeneratedCitationTransport(value),
    `${expected.id} ${key}`
   );
  }
 }
 return ids;
}

export function withoutPriceCompletionEquipment(equipment) {
 const ids = validateFixtureRecords(equipment, sourcePriceCompletionEquipment, 73, 'price completion fixture');
 return equipment.filter(item => !ids.has(item.id));
}

export function withoutSourceFirstEquipment(equipment) {
 const remaining = withoutPriceCompletionEquipment(equipment);
 const ids = validateFixtureRecords(remaining, sourceFirstEquipment, 28, 'source-first fixture');
 return remaining.filter(item => !ids.has(item.id));
}
