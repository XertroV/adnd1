import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reverseApprovedEquipmentChanges} from './equipment-mechanics-fixture.mjs';
import {projectDmg175EquipmentLeavesForHistoricalFixture} from '../research/dmg175-validation-coordinator-v1/history-recovery-v1/dmg175-equipment-epoch-outer-v2.proposed.mjs';
import {withoutGeneratedCitationTransport} from './equipment-source-first-fixture.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
test('bone case price follows PHB 36 while retaining its previous value for baseline checks',()=>{
 const equipment=read('../dist/data.json').equipment;
 const item=equipment.find(x=>x.id==='phb-bone-case');
 assert.equal(item.price.amount,5);assert.equal(item.price.currency,'gp');
 const fixture=read('./fixtures/equipment-bone-case-price-correction.json').records[0].changes[0];
 assert.deepEqual(withoutGeneratedCitationTransport(fixture.newValue),withoutGeneratedCitationTransport(item.price));assert.equal(fixture.oldValue.currency,'sp');
 assert.equal(fixture.independentReview.verdict,'confirmed');
 const old=reverseApprovedEquipmentChanges(projectDmg175EquipmentLeavesForHistoricalFixture(equipment)).find(x=>x.id===item.id);
 assert.equal(old.price.currency,'sp');
 const catalog=read('../dist/scans/verified/equipment-phb-bone-case.json');
 assert.deepEqual(catalog.regions.find(x=>x.id==='phb-36-d3d596c3f9310d33').checkedFields.purchasePrice,{amount:5,currency:'gp',book:'PHB',pages:[36]});
});
