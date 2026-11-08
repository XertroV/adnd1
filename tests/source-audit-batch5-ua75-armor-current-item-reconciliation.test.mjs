import {readBeforeJoFile as readFileSync} from './helpers/batch6-jo-fixture.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

import {gunzipSync} from 'node:zlib';
import {test} from 'node:test';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = 'research/source-audit-batch5-ua75-armor-current-item-reconciliation.json';
const bytes = readFileSync(resolve(root, path));
const artifact = JSON.parse(bytes.toString('utf8'));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

test('all 17 UA p.75 armor rows are traced to source rows and current item candidates without changing catalog data', () => {
  assert.equal(sha256(bytes), '4ef8e49fc76dd1891dcbdb4ecc9c5f13617e4f13700c7f349e171abdb5efe623');
  const archivePath = 'tests/fixtures/monetary-source-ua-583-before.json.gz';
  const sourceBytes = gunzipSync(readFileSync(resolve(root, archivePath)));
  assert.equal(artifact.inputArtifacts.uaSupplement.path, 'research/source-audit-batch5-ua-additional-prices.json');
  assert.equal(sha256(sourceBytes), artifact.inputArtifacts.uaSupplement.sha256);
  const equipmentBytes = readFileSync(resolve(root, artifact.inputArtifacts.equipment.path));
  assert.equal(sha256(equipmentBytes), artifact.inputArtifacts.equipment.sha256);
  assert.equal(artifact.denominators.sourceRows, 17);
  assert.equal(artifact.denominators.printedPage, 75);
  assert.equal(artifact.denominators.pdfPage, 76);
  assert.equal(artifact.denominators.currentEquipmentRecords, 191);
  assert.equal(artifact.denominators.rowsWithP75ItemSourceBinding, 0);
  assert.equal(artifact.sourceRowMappings.length, 17);
  const source = JSON.parse(sourceBytes.toString('utf8'));
  const currentSourceBytes = readFileSync(resolve(root, artifact.inputArtifacts.uaSupplement.path));
  const currentSource = JSON.parse(currentSourceBytes.toString('utf8'));
  assert.equal(currentSource.rowRecords.length, 583);
  const currentRows = new Map(currentSource.rowRecords.map(row => [row.recordId, row]));
  const equipment = JSON.parse(equipmentBytes.toString('utf8'));
  const items = new Map(Object.values(equipment.equipment).map(item => [item.id, item]));
  const ids = new Set();
  for (const row of artifact.sourceRowMappings) {
    assert.ok(!ids.has(row.sourceRowId), row.sourceRowId);
    ids.add(row.sourceRowId);
    const sourceRow = source.rowRecords[Number(row.sourceRowJsonPointer.split('/').at(-1))];
    assert.equal(sourceRow.recordId, row.sourceRowId);
    assert.equal(sourceRow.sourceRowIdentity.printedPage, 75);
    assert.equal(sourceRow.sourceRowIdentity.pdfPage, 76);
    assert.deepEqual(row.sourceRowIdentity, sourceRow.sourceRowIdentity);
    const currentSourceRow = currentRows.get(row.sourceRowId);
    assert.ok(currentSourceRow, row.sourceRowId);
    assert.deepEqual(currentSourceRow.sourceRowIdentity, row.sourceRowIdentity);
    assert.deepEqual(currentSourceRow.values.gpPurchaseCost, sourceRow.values.gpPurchaseCost, row.sourceRowId);
    const historicalPrice = sourceRow.values.gpPurchaseCost;
    const mappedPrice = historicalPrice.kind === 'exact'
      ? {kind: 'exact', amount: historicalPrice.amount, currency: historicalPrice.currency}
      : {kind: 'not-for-sale-or-unavailable', reason: historicalPrice.reason};
    assert.deepEqual(row.sourceValue, mappedPrice, row.sourceRowId);
    if (row.currentItem) {
      const current = items.get(row.currentItem.id);
      assert.ok(current, row.currentItem.id);
      assert.equal(current.price.amount, row.currentItem.currentPrice.amount);
      assert.equal(current.price.currency, row.currentItem.currentPrice.currency);
      assert.equal(current.price.amount, row.sourceValue.amount, row.sourceRowId);
      assert.equal(current.price.currency, row.sourceValue.currency, row.sourceRowId);
      assert.equal(row.currentItem.comparison.p75SourceBindingPresent, false);
    }
  }
  assert.equal(artifact.summary.typedOpenMarketPriceRows, 16);
  assert.equal(artifact.summary.currentItemPriceMatches, 16);
  assert.equal(artifact.summary.sameValueMatches, 16);
  assert.equal(artifact.summary.nonMarketUnavailableRows, 1);
  const elfin = artifact.sourceRowMappings.find(row => row.sourceRowIdentity.rowLabel === 'Elfin Chain Mail');
  assert.equal(elfin.currentItem, null);
  assert.match(elfin.sourceValue.reason, /never available on open market/i);
  const buckler = artifact.sourceRowMappings.find(row => row.sourceRowIdentity.rowLabel === 'Shield, Buckler');
  assert.equal(buckler.currentItem.id, 'ua-buckler');
  assert.deepEqual(buckler.excludedNearMatches, ['ua-spiked-buckler']);
  assert.equal(artifact.summary.ordinaryBucklerExistingSource.printedPages[0], 26);
  assert.equal(artifact.summary.spikedBucklerSeparateItemId, 'ua-spiked-buckler');
  assert.equal(artifact.review.catalogMutation, 'none');
});
