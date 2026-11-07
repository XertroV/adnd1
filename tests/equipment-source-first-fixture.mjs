import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

export const sourceFirstEquipment = JSON.parse(readFileSync(new URL('./fixtures/equipment-source-first-batch1.json', import.meta.url), 'utf8')).records;

export function withoutSourceFirstEquipment(equipment) {
 const ids = new Set(sourceFirstEquipment.map(item => item.id));
 assert.equal(ids.size, 28);
 for (const expected of sourceFirstEquipment) {
  const matches = equipment.filter(item => item.id === expected.id);
  assert.equal(matches.length, 1, expected.id);
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(matches[0][key], value, `${expected.id} ${key}`);
 }
 return equipment.filter(item => !ids.has(item.id));
}
