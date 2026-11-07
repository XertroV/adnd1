import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectEquipmentContextContract } from './helpers/equipment-context-contracts.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(repo, 'dist');
const cases = [
  ['equipment-ua-aklys-hurled', 'ua-aklys-hurled'],
  ['equipment-phb-long-sword', 'phb-long-sword'],
  ['equipment-phb-arrow', 'phb-arrow'],
].map(([catalogName, itemId]) => {
  const catalogPath = `scans/verified/${catalogName}.json`;
  const catalog = JSON.parse(readFileSync(path.join(distRoot, catalogPath), 'utf8'));
  const data = JSON.parse(readFileSync(path.join(distRoot, 'data.json'), 'utf8'));
  const item = data.equipment.find(entry => entry.id === itemId);
  assert.ok(item, `missing equipment item ${itemId}`);
  return { catalog, catalogPath, item };
});

for (const entry of cases) {
  test(`${entry.item.id}: field targets, context order, and image coordinates are bound`, () => {
    const result = inspectEquipmentContextContract({ ...entry, distRoot });
    assert.deepEqual(result.errors, []);
  });
}

test('Aklys price and weapon stats resolve to distinct semantic targets', () => {
  const { catalog } = cases.find(entry => entry.item.id === 'ua-aklys-hurled');
  const price = catalog.fieldEvidenceContracts.find(contract => contract.fieldKey === '/price');
  const stats = catalog.fieldEvidenceContracts.find(contract => contract.fieldKeys?.includes('/fields/Approx. weight (UA p.26)'));
  assert.equal(price.primaryRegionId, 'ua-equipment-price-table');
  assert.equal(price.semanticClaim, 'purchase-price; 2 gp per Aklys');
  assert.equal(stats.primaryRegionId, 'ua-26-92697cf6b5d2d5ec');
  assert.notEqual(price.primaryRegionId, stats.primaryRegionId);
  assert.ok(stats.supportingRegionIds.includes('ua-26-5d54b5aed2ac32f3'));
  assert.equal(catalog.evidenceContextSets.find(set => set.id === price.contextSetId).orderedRegionIds.length, 1);
});

test('PHB Arms price continuations are ordered and quantity variants stay separate', () => {
  const { catalog } = cases.find(entry => entry.item.id === 'phb-arrow');
  const set = catalog.evidenceContextSets.find(context => context.id === 'phb35-arms-price-list');
  assert.deepEqual(set.orderedRegionIds, ['phb-arrow-phb35-arms-left', 'phb-arrow-phb35-arms-right']);
  const single = catalog.fieldEvidenceContracts.find(contract => contract.fieldKey === '/price');
  const dozen = catalog.fieldEvidenceContracts.find(contract => contract.fieldKey === '/fields/Normal arrows, dozen price');
  assert.equal(single.primaryRegionId, 'phb-arrow-phb35-1');
  assert.equal(dozen.primaryRegionId, 'phb-arrow-phb35-2');
  assert.match(single.semanticClaim, /single/);
  assert.match(dozen.semanticClaim, /dozen/);
  assert.deepEqual(single.supportingRegionIds, set.orderedRegionIds);
  assert.deepEqual(dozen.supportingRegionIds, set.orderedRegionIds);
});

test('Long Sword p.37 and p.38 targets retain their separate table-heading companions', () => {
  const { catalog } = cases.find(entry => entry.item.id === 'phb-long-sword');
  const p37 = catalog.fieldEvidenceContracts.find(contract => contract.contextSetId === 'phb37-long-sword-weight-damage');
  const p38 = catalog.fieldEvidenceContracts.find(contract => contract.contextSetId === 'phb38-long-sword-general-data');
  assert.equal(p37.primaryRegionId, 'phb-37-2b2447ac14bb294c');
  assert.deepEqual(p37.supportingRegionIds, ['phb-37-979be85653ffd9a3']);
  assert.equal(p38.primaryRegionId, 'phb-38-779f5d713364297a');
  assert.deepEqual(p38.supportingRegionIds, ['phb-38-dbc5670aafbf7843']);
  assert.equal(p37.status, 'source-location-and-focus-reviewed; field-value-grade-separate');
  assert.equal(p38.status, 'source-location-and-focus-reviewed; field-value-grade-separate');
});

test('reviewed source-location contracts keep field-value grading separate', () => {
  for (const { catalog, item } of cases) {
    for (const contract of catalog.fieldEvidenceContracts) {
      assert.equal(contract.status, 'source-location-and-focus-reviewed; field-value-grade-separate', `${item.id}:${contract.primaryRegionId}`);
    }
    for (const context of catalog.evidenceContextSets) {
      assert.match(context.reviewLimitation, /Original-PDF.*reviewed/i, `${item.id}:${context.id}`);
    }
  }
  const { catalog } = cases.find(entry => entry.item.id === 'ua-aklys-hurled');
  const notes = catalog.evidenceContextSets.find(context => context.id === 'ua27-aklys-facing-notes-context');
  assert.match(notes.reviewLimitation, /no p\.26 Aklys row has no footnote marker|no p\.27 footnote is assigned to Aklys/i);
});
