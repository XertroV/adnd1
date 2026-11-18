// Additive Source2 family successor; original case and historical-role assertions are preserved.
// Current Source2 admission remains a separate genuine zero-argument identity case.
import {readBeforeJoFile as readFileSync} from "../research/class-mapping-history-v1/source-postmetadata-facade-v1/ua-source-batch6-jo-fixture-source2-v1.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';

import {createHash} from 'node:crypto';
import {sourceFirstEquipment, withoutSourceFirstEquipment} from './equipment-source-first-fixture.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const data=read('../dist/data.json');
const review=read('../research/equipment-source-first-batch1-second-review.json');
const fullTable=read('./fixtures/equipment-source-first-fulltable.json');
const sourceTables=read('../research/source-table-citation-contracts.json');
test('source-first equipment retains exact reviewed prices, item units and bounded source rows',()=>{
 assert.equal(sourceFirstEquipment.length,28);assert.equal(withoutSourceFirstEquipment(data.equipment).length,88);
 for(const expected of sourceFirstEquipment){
  const item=data.equipment.find(r=>r.id===expected.id);const verdict=review.records.find(r=>r.id===expected.id);assert.ok(verdict,expected.id);
  const replacement=fullTable.records.find(r=>r.id===expected.id);assert.ok(replacement,expected.id);assert.equal(replacement.old.sha256,verdict.row.sha256);
  assert.equal(item.incomplete,true);assert.deepEqual(item.fields,{});assert.deepEqual(item.fieldSources,{});
  const catalog=read('../dist/'+item.sourceExcerpts.catalog);assert.equal(catalog.regions.length,item.sourceExcerpts.regionCount);
  const additionalIds=new Set(sourceTables.tables.flatMap(table=>table.rows.flatMap(row=>row.targets.filter(target=>target.collection==='equipment'&&target.itemId===item.id).flatMap(target=>[...(target.requiredRegionIds||[]),...(target.companionContextRegionIds||[])]))));
  for(const region of catalog.regions.slice(2))assert.ok(additionalIds.has(region.id),`${item.id}/${region.id}: later excerpt is an explicit source-row/context contract`);
  const [row,heading]=catalog.regions;assert.notEqual(row.role,'context');assert.equal(heading.role,'context');
  assert.equal(row.id,replacement.regionId);
  for(const [region,snapshot] of [[row,replacement.new],[heading,verdict.headingContext]]){
   assert.equal(region.sha256,snapshot.sha256);assert.equal(region.printedPage,verdict.source.page);assert.equal(region.pdfPage,verdict.source.pdfPage);
   const image=readFileSync(new URL('../dist/scans/verified/'+region.image,import.meta.url));assert.equal(createHash('sha256').update(image).digest('hex'),snapshot.sha256);
  }
  assert.deepEqual(row.focusRects,replacement.new.focusRects);assert.deepEqual(row.normalizedPageRect,replacement.new.normalizedPageRect);assert.deepEqual(row.checkedFields.purchasePrice,expected.price);
 }
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
