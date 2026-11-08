import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dmg175HistoryContract} from './helpers/batch6-dmg175-source-history.mjs';
import {addedDmg74MatrixIds,reverseDmg74MatrixBatchFromData,reverseDmg74MatrixBatchFromInventory,reverseSupplementalPdfNoticeViewer} from './helpers/dmg74-matrix-batch.mjs';
const read=path=>JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url)));
const data=read('dist/data.json'),inventory=read('research/price-source-inventory.json');
const prior=dmg175HistoryContract().files;
const priorData=prior['dist/data.json'].current,priorInventory=prior['research/price-source-inventory.json'].current;

test('the notice adapter restores the exact historical viewer and rejects unrelated changes',()=>{
 const bytes=readFileSync(new URL('../dist/source-viewer.js',import.meta.url));
 const projected=reverseSupplementalPdfNoticeViewer(bytes);
 assert.notDeepEqual(projected,bytes);
 assert.throws(()=>reverseSupplementalPdfNoticeViewer(Buffer.concat([bytes,Buffer.from('\n// unrelated change\n')])));
});

test('the matrix reversal restores both complete frozen predecessor objects',()=>{
 assert.deepEqual(reverseDmg74MatrixBatchFromData(data,priorData),priorData);
 assert.deepEqual(reverseDmg74MatrixBatchFromInventory(inventory,priorInventory),priorInventory);
});
test('matrix reversal rejects a changed unrelated excerpt review counter',()=>{
 const candidate=structuredClone(data);candidate.release.excerpts.selectedValuesItems=987654321;
 assert.throws(()=>reverseDmg74MatrixBatchFromData(candidate,priorData));
});
test('matrix reversal rejects duplicate added excerpt owner identifiers',()=>{
 const candidate=structuredClone(data);candidate.release.excerpts.itemIds.push(addedDmg74MatrixIds[0]);
 assert.throws(()=>reverseDmg74MatrixBatchFromData(candidate,priorData));
});
test('matrix reversal rejects deleted or added unrelated excerpt metadata',()=>{
 for(const operation of ['delete','add']){
  const candidate=structuredClone(data);
  if(operation==='delete')delete candidate.release.excerpts.selectedValuesItems;
  else candidate.release.excerpts.unrelatedCanary='must remain visible';
  assert.throws(()=>reverseDmg74MatrixBatchFromData(candidate,priorData),operation);
 }
});
test('data reversal rejects a deleted unrelated field-binding collection',()=>{
 const candidate=structuredClone(data);delete candidate.release.priceInventory.fieldEvidenceBindingsByCollection.equipment;
 assert.throws(()=>reverseDmg74MatrixBatchFromData(candidate,priorData));
});
test('inventory reversal rejects a deleted unrelated field-binding collection',()=>{
 const candidate=structuredClone(inventory);delete candidate.counts.fieldEvidenceBindingsByCollection.equipment;
 assert.throws(()=>reverseDmg74MatrixBatchFromInventory(candidate,priorInventory));
});
