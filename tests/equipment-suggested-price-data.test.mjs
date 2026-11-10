import {withoutGeneratedCitationTransport,withoutSourceFirstEquipment} from './equipment-source-first-fixture.mjs';
import {projectDmg175EquipmentLeavesForHistoricalFixture} from '../research/dmg175-validation-coordinator-v1/history-recovery-v1/dmg175-equipment-epoch-outer-v2.proposed.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestedPriceCorrections,reverseSuggestedPriceChanges} from './equipment-suggested-price-fixture.mjs';
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
test('editorial suggestions preserve unknown printed prices and match reviewed comparators',()=>{
 assert.equal(suggestedPriceCorrections.records.length,4);
 for(const r of suggestedPriceCorrections.records){
  const item=data.equipment.find(x=>x.id===r.id),change=r.changes.find(c=>c.path==='/suggestedPrice'),v=change.independentReview;
  assert.equal(item.price,null,r.id);assert.equal(item.priceState,'unextracted',r.id);assert.deepEqual(withoutGeneratedCitationTransport(item.suggestedPrice),withoutGeneratedCitationTransport(change.newValue));
  assert.equal(v.verdict,'no decisive inconsistency found');assert.deepEqual({amount:item.suggestedPrice.amount,currency:item.suggestedPrice.currency,unit:item.suggestedPrice.unit},v.suggestedPrice);assert.equal(item.suggestedPrice.rationale,v.basis);
  assert.equal(item.suggestedPrice.comparisons.length,v.comparables.length);
  const ids={Spear:'phb-spear',Sap:'ua-sap','Staff sling':'ua-staff-sling','Sling bullets':'phb-sling-bullet'};
  for(const [index,c] of item.suggestedPrice.comparisons.entries()){
   const reviewed=v.comparables[index],other=data.equipment.find(x=>x.id===c.itemId);assert.ok(other,c.itemId);
   assert.deepEqual({itemId:c.itemId,amount:c.amount,currency:c.currency,unit:c.unit,book:c.book,pages:c.pages},{itemId:ids[reviewed.item],amount:reviewed.amount,currency:reviewed.currency,unit:reviewed.unit,book:reviewed.book,pages:[reviewed.page]},`${r.id}: exact reviewed comparison`);
   assert.equal(other.price.amount,c.amount);assert.equal(other.price.currency,c.currency);assert.equal(other.price.book,c.book);assert.ok(c.pages.every(p=>other.price.pages.includes(p)));assert.match(c.label,/not this item price/);
  }
 }
 assert.equal(withoutSourceFirstEquipment(projectDmg175EquipmentLeavesForHistoricalFixture(data.equipment)).filter(x=>x.price!=null).length,84);
 const clean=reverseSuggestedPriceChanges(data.equipment);assert.ok(clean.filter(x=>suggestedPriceCorrections.records.some(r=>r.id===x.id)).every(x=>!Object.hasOwn(x,'suggestedPrice')));
 const tampered=structuredClone(data.equipment);tampered.find(x=>x.id===suggestedPriceCorrections.records[0].id).suggestedPrice.comparisons[0].unit='tampered';assert.throws(()=>reverseSuggestedPriceChanges(tampered),/approved value/);
});
