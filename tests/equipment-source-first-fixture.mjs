import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const sourceFirstEquipment = JSON.parse(readFileSync(new URL('./fixtures/equipment-source-first-batch1.json', import.meta.url), 'utf8')).records;
const priceCompletionFixture = JSON.parse(readFileSync(new URL('./fixtures/equipment-price-completion-73.json', import.meta.url), 'utf8'));
export const sourcePriceCompletionEquipment = priceCompletionFixture.records;
export const batch5OfferEquipment = JSON.parse(readFileSync(new URL('./fixtures/equipment-offers-batch5.json', import.meta.url), 'utf8')).records;
const ua26CentralIntegration = JSON.parse(readFileSync(new URL('../research/source-audit-batch5-ua26-central-integration.json', import.meta.url), 'utf8'));
const ua26HandQuarrelAppend = JSON.parse(readFileSync(new URL('../research/source-audit-batch5-ua26-current-row-append.json', import.meta.url), 'utf8'));
const ua26HandQuarrelIndependentReview = JSON.parse(readFileSync(new URL('../research/source-audit-batch5-ua26-hand-quarrel-independent-review.json', import.meta.url), 'utf8'));
const ua26HandQuarrelItemId = 'ua-quarrels-for-same';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function readRepoJson(relative) {
 return JSON.parse(readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8'));
}

export function withoutGeneratedCitationTransport(value) {
 if (Array.isArray(value)) return value.map(withoutGeneratedCitationTransport);
 if (value && typeof value === 'object') {
  return Object.fromEntries(Object.entries(value)
   .filter(([key]) => !['evidenceBindings', 'regionReviews'].includes(key))
   .map(([key, child]) => [key, withoutGeneratedCitationTransport(child)]));
 }
 return value;
}

function normalizeExactUa26HandQuarrelAppend(actual, expected) {
 const normalized = structuredClone(actual);
 if (actual.id !== ua26HandQuarrelItemId) return normalized;

 const receipt = ua26HandQuarrelAppend.row.catalog;
 const additions = ua26CentralIntegration.addedReferences.filter(entry => entry.collection === 'equipment' && entry.itemId === ua26HandQuarrelItemId);
 assert.equal(additions.length, 2, 'hand-quarrel append: exactly two context references are authorized');
 assert.deepEqual(additions.map(entry => entry.fieldPointer), ['/references/1', '/references/2']);
 assert.equal(receipt.beforeSha256, '17dbae4fb305e305fa0f1ec14212752c8acd310578ca805fcca3ba5d00ff7670', 'hand-quarrel append: original one-price catalog identity');
 assert.equal(receipt.beforeRegionCount, 1);
 assert.equal(receipt.afterRegionCount, 3);
 assert.equal(ua26HandQuarrelIndependentReview.summary.records, 2);
 assert.equal(ua26HandQuarrelIndependentReview.summary.structuralErrors, 0);
 assert.equal(ua26HandQuarrelIndependentReview.summary.fieldValuesPromoted, 0);

 if (actual.scanVerification?.regionCount === receipt.afterRegionCount) {
  const catalogBytes = readFileSync(new URL(`../dist/${receipt.path.replace(/^dist\//, '')}`, import.meta.url));
  assert.equal(sha256(catalogBytes), receipt.afterSha256, 'hand-quarrel append: exact current catalog hash');
  normalized.scanVerification.regionCount = receipt.beforeRegionCount;
 } else {
  assert.equal(actual.scanVerification?.regionCount, receipt.beforeRegionCount, 'hand-quarrel append: only the receipt-backed region count can differ');
 }

 const refs = actual.references || [];
 if (refs.length === 3) {
  for (const entry of additions) {
   const match = entry.fieldPointer.match(/^\/references\/(\d+)$/);
   assert.ok(match, `hand-quarrel append: expected simple reference pointer ${entry.fieldPointer}`);
   const index = Number(match[1]);
   assert.deepEqual(withoutGeneratedCitationTransport(refs[index]), entry.reference, `hand-quarrel append: ${entry.fieldPointer} exactly matches the central receipt`);
  }
  normalized.references = refs.filter((_, index) => !additions.some(entry => entry.fieldPointer === `/references/${index}`));
 } else {
  assert.equal(refs.length, 1, 'hand-quarrel append: current reference count must be either frozen-one or exact-three');
 }
 return normalized;
}

function validateFixtureRecords(equipment, records, expectedCount, fixtureName, normalizeActual = value => value) {
 const ids = new Set(records.map(item => item.id));
 assert.equal(ids.size, expectedCount, `${fixtureName}: unique fixture ids`);
 for (const expected of records) {
  const matches = equipment.filter(item => item.id === expected.id);
  assert.equal(matches.length, 1, `${fixtureName}: ${expected.id} appears once`);
  const actual = normalizeActual(matches[0], expected);
  for (const [key, value] of Object.entries(expected)) {
   assert.deepEqual(
    withoutGeneratedCitationTransport(actual[key]),
    withoutGeneratedCitationTransport(value),
    `${expected.id} ${key}`
   );
  }
 }
 return ids;
}

export function withoutPriceCompletionEquipment(equipment) {
 const previous = withoutBatch5OfferEquipment(equipment);
 const ids = validateFixtureRecords(previous, sourcePriceCompletionEquipment, 73, 'price completion fixture');
 return previous.filter(item => !ids.has(item.id));
}

// Earlier checkpoints still verify their exact populations and prices. The new
// offer test separately requires both additions, so reversing them cannot waive
// missing current data or silently relax a historical denominator.
export function withoutBatch5OfferEquipment(equipment) {
 const additions=new Set(batch5OfferEquipment.map(item=>item.id));
 if(!equipment.some(item=>additions.has(item.id)))return equipment;
 validateFixtureRecords(equipment,batch5OfferEquipment,2,'batch5 printed offers',normalizeExactUa26HandQuarrelAppend);
 return equipment.filter(item=>!additions.has(item.id));
}

export function withoutSourceFirstEquipment(equipment) {
 const remaining = withoutPriceCompletionEquipment(equipment);
 const ids = validateFixtureRecords(remaining, sourceFirstEquipment, 28, 'source-first fixture');
 return remaining.filter(item => !ids.has(item.id));
}
