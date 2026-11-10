import {readBeforeJoFile as readFileSync} from '../research/dmg175-validation-coordinator-v1/source-postmetadata-facade-v1/ua-source-batch6-jo-fixture-v1.proposed.mjs';
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
