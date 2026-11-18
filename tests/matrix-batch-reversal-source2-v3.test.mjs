// Additive Source2 family successor; original case and historical-role assertions are preserved.
// Current Source2 admission remains a separate genuine zero-argument identity case.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforePass8WeaponSourceFile as readFileSync} from "../research/class-mapping-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-source2-v1.mjs";
import {dmg175HistoryContract} from './helpers/batch6-dmg175-source-history.mjs';
import {addedDmg74MatrixIds,reverseDmg74MatrixBatchFromData,reverseDmg74MatrixBatchFromInventory,reverseSupplementalPdfNoticeViewer} from './helpers/ua-source-dmg74-matrix-batch.mjs';
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


// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
