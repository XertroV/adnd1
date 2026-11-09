import {readBeforeJoFile as readFileSync} from './helpers/ua-source-batch6-jo-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

import {sourcePriceCompletionEquipment, withoutBatch5OfferEquipment, withoutPriceCompletionEquipment, withoutSourceFirstEquipment} from './equipment-source-first-fixture.mjs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const rootData = read('../equipment.json');
rootData.equipment=withoutBatch5OfferEquipment(rootData.equipment);
const contextReview = read('../research/equipment-price-context-review.json');
const rowBindings = read('../research/equipment-source-row-bindings.json');
rowBindings.bindings=rowBindings.bindings.filter(binding=>binding.independentReviewFile==='research/equipment-price-context-review.json');
const fixture = read('./fixtures/equipment-price-completion-73.json');
const mechanicsLedger = read('../research/mechanics-audit-progress.json');
const reviewBytes = readFileSync(new URL('../research/equipment-price-context-review.json', import.meta.url));
const reviewSha256 = createHash('sha256').update(reviewBytes).digest('hex');

test('the reversible 73-item fixture is exactly the delta from the pinned Git baseline', () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(fixture.generatedTransportKeysExcluded, ['evidenceBindings', 'regionReviews']);
  const baselineBytes = execFileSync('git', ['show', `${fixture.baselineCommit}:equipment.json`]);
  assert.equal(createHash('sha256').update(baselineBytes).digest('hex'), fixture.baselineEquipmentSha256);
  assert.equal(fixture.baselineEquipmentSha256, '7ce9997910f8a1e5fbbb1f272a894485b77772cf3ff3242992b3e35e6360a264');
  const baseline = JSON.parse(baselineBytes).equipment;
  const baselineIds = new Set(baseline.map(item => item.id));
  const currentDelta = rootData.equipment.filter(item => !baselineIds.has(item.id));
  assert.equal(baseline.length, 116);
  assert.equal(currentDelta.length, 73);
  assert.deepEqual(currentDelta.map(item => item.id).sort(), sourcePriceCompletionEquipment.map(item => item.id).sort());
  assert.equal(withoutPriceCompletionEquipment(rootData.equipment).length, 116);
  assert.equal(withoutSourceFirstEquipment(rootData.equipment).length, 88);
  assert.equal(new Set(rootData.equipment.map(item => item.id)).size, 189);
});

test('fixture comparison ignores only generated citation transport and still catches fact changes', () => {
  const withTransport = structuredClone(rootData.equipment);
  const sample = withTransport.find(item => item.id === sourcePriceCompletionEquipment[0].id);
  sample.regionReviews = [{status: 'current-reviewed'}];
  sample.price.evidenceBindings = [{reviewStatus: 'field-target-pending'}];
  sample.fieldSources.evidenceBindings = [{fieldPointer: '/price/amount'}];
  sample.fieldSources.regionReviews = [];
  assert.equal(withoutPriceCompletionEquipment(withTransport).length, 116);
  sample.price.amount += 1;
  assert.throws(() => withoutPriceCompletionEquipment(withTransport), /price/);
});

test('the 73 additions agree with adjudicated independent amount, currency, and unit reviews', () => {
  assert.equal(fixture.recordCount, 73);
  assert.equal(sourcePriceCompletionEquipment.length, 73);
  assert.equal(contextReview.records.length, 185);
  assert.equal(reviewSha256, '82f8a91f4532fe517253488432bf28da4f6459cbcbf311fc6e087fca399328e4');
  assert.equal(rowBindings.bindings.length, 185);
  const reviewById = new Map(contextReview.records.map(record => [record.itemId, record]));
  const bindingById = new Map(rowBindings.bindings.map(binding => [binding.itemId, binding]));
  const currencies = {};
  const newPagePairs = {};
  for (const fixtureRecord of sourcePriceCompletionEquipment) {
    const item = rootData.equipment.find(candidate => candidate.id === fixtureRecord.id);
    const review = reviewById.get(fixtureRecord.id);
    const binding = bindingById.get(fixtureRecord.id);
    assert.ok(item, fixtureRecord.id);
    assert.ok(review, `${fixtureRecord.id}: independent review`);
    assert.ok(binding, `${fixtureRecord.id}: source row mapping`);
    assert.equal(review.verdict, 'confirmed', fixtureRecord.id);
    assert.deepEqual(
      {amount: item.price.amount, currency: item.price.currency, unit: item.price.unit ?? null},
      review.expectedPrice,
      `${fixtureRecord.id}: reviewed purchase value`
    );
    assert.deepEqual([item.price.book, item.price.pages], [review.book, [review.printedPage]], `${fixtureRecord.id}: printed page`);
    assert.equal(binding.sourceInventoryFile, review.sourceInventoryFile, fixtureRecord.id);
    assert.equal(binding.sourceInventorySha256, review.sourceInventorySha256, fixtureRecord.id);
    assert.equal(binding.sourceRecordIndex, review.sourceRecordIndex, fixtureRecord.id);
    assert.equal(binding.sourceObject, review.sourceObject, fixtureRecord.id);
    assert.equal(binding.sourceSha256, review.sourceSha256, fixtureRecord.id);
    assert.equal(binding.independentReviewFile, 'research/equipment-price-context-review.json', fixtureRecord.id);
    assert.equal(binding.independentReviewFileSha256, reviewSha256, fixtureRecord.id);
    assert.equal(binding.independentReviewRecordIndex, contextReview.records.indexOf(review), fixtureRecord.id);
    currencies[item.price.currency] = (currencies[item.price.currency] || 0) + 1;
    const pair = `${review.book} p.${review.printedPage}/PDF ${review.pdfPage}`;
    newPagePairs[pair] = (newPagePairs[pair] || 0) + 1;
  }
  assert.deepEqual(currencies, {gp: 59, cp: 4, sp: 9, ep: 1});
  assert.deepEqual(newPagePairs, {'PHB p.35/PDF 36': 25, 'PHB p.36/PDF 37': 43, 'UA p.26/PDF 27': 5});
});

test('mechanics audit retains 185 source-checked price reviews with printed-unit dispositions', () => {
  const reviews = mechanicsLedger.reviewRecords.filter(record => record.checker === 'mechanics-equipment-price-context-review');
  assert.equal(reviews.length, 185);
  assert.equal(new Set(reviews.map(record => record.id)).size, 185);
  const byId = new Map(reviews.map(record => [record.id, record]));
  for (const sourceReview of contextReview.records) {
    const record = byId.get(sourceReview.itemId);
    assert.ok(record, sourceReview.itemId);
    assert.ok(record.checkedPaths.includes('/price/amount'), sourceReview.itemId);
    assert.ok(record.checkedPaths.includes('/price/currency'), sourceReview.itemId);
    assert.equal(record.checkedValues['/price/amount'], sourceReview.expectedPrice.amount, sourceReview.itemId);
    assert.equal(record.checkedValues['/price/currency'], sourceReview.expectedPrice.currency, sourceReview.itemId);
    assert.ok(record.reviewedPaths.some(path => path.path === '/price/unit' && /printed unit qualifier/.test(path.result)), sourceReview.itemId);
    const source = record.sources.find(candidate => candidate.priceReviewFile === 'research/equipment-price-context-review.json');
    assert.ok(source, `${sourceReview.itemId}: frozen review source`);
    assert.equal(source.priceReviewSha256, reviewSha256, sourceReview.itemId);
    assert.equal(source.priceReviewRecordIndex, contextReview.records.indexOf(sourceReview), sourceReview.itemId);
    assert.equal(source.sourceSha256, sourceReview.sourceSha256, sourceReview.itemId);
    assert.deepEqual(source.reviewedPrice, sourceReview.expectedPrice, sourceReview.itemId);
  }
});

test('the 185 mapped purchase prices retain the verified currency and page-pair totals', () => {
  const priced = rootData.equipment.filter(item => item.price !== null);
  const currencies = {};
  const pagePairs = {};
  for (const item of priced) {
    currencies[item.price.currency] = (currencies[item.price.currency] || 0) + 1;
    const review = contextReview.records.find(record => record.itemId === item.id);
    assert.ok(review, `${item.id}: price review exists`);
    const pair = `${review.book} p.${review.printedPage}/PDF ${review.pdfPage}`;
    pagePairs[pair] = (pagePairs[pair] || 0) + 1;
  }
  assert.equal(priced.length, 185);
  assert.equal(rootData.equipment.filter(item => item.price === null).length, 4);
  assert.deepEqual(currencies, {gp: 136, sp: 37, cp: 11, ep: 1});
  assert.deepEqual(pagePairs, {'PHB p.35/PDF 36': 78, 'PHB p.36/PDF 37': 85, 'UA p.26/PDF 27': 22});
  assert.equal(withoutPriceCompletionEquipment(rootData.equipment).filter(item => item.price !== null).length, 112);
  assert.equal(withoutSourceFirstEquipment(rootData.equipment).filter(item => item.price !== null).length, 84);
});
