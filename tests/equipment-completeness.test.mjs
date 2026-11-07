import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equipmentCompletenessCorrections,reverseApprovedEquipmentChanges} from './equipment-mechanics-fixture.mjs';
import {withoutGeneratedCitationTransport} from './equipment-source-first-fixture.mjs';
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const find=id=>{const item=data.equipment.find(x=>x.id===id);assert.ok(item,id);return item};
const get=(obj,p)=>p.split('/').slice(1).map(x=>x.replaceAll('~1','/').replaceAll('~0','~')).reduce((x,k)=>x[k],obj);
test('every added equipment field is bound to an independent confirmed old/new snapshot',()=>{
 const records=equipmentCompletenessCorrections.records;
 assert.equal(records.length,38);
 const changes=records.flatMap(r=>r.changes);
 assert.equal(changes.filter(c=>c.path.startsWith('/fields/')).length,118);
 assert.equal(changes.filter(c=>c.path.startsWith('/fieldSources/')).length,118);
 assert.equal(changes.filter(c=>c.path==='/summary').length,7);
 const reversed=reverseApprovedEquipmentChanges(data.equipment);
 for(const r of records) for(const c of r.changes){
  assert.deepEqual(withoutGeneratedCitationTransport(get(find(r.id),c.path)),withoutGeneratedCitationTransport(c.newValue),`${r.id} ${c.path}: approved current value`);
  const review=c.independentReview;
  if(c.path.startsWith('/fields/')){
   assert.ok(review,`${r.id} ${c.path}: independent review`);
   assert.deepEqual([review.id,review.path,review.oldValue,review.newValue,review.verdict],[r.id,c.path,c.oldValue,c.newValue,'confirmed']);
   assert.deepEqual([review.book,review.page],[c.book,c.page]);assert.match(review.sourceSha256,/^[a-f0-9]{64}$/);
  } else if(c.path.startsWith('/fieldSources/')) {
   if(review?.derivedFrom) assert.ok(r.changes.some(parent=>parent.path===review.derivedFrom && parent.independentReview?.verdict==='confirmed'));
   else assert.equal(review?.verdict,'confirmed');
  } else assert.match(c.editorialReview,/independently checked/i);
  const parts=c.path.split('/').slice(1).map(x=>x.replaceAll('~1','/').replaceAll('~0','~'));const parent=parts.slice(0,-1).reduce((x,k)=>x[k],reversed.find(x=>x.id===r.id));
  if(c.oldExists===false)assert.ok(!Object.hasOwn(parent,parts.at(-1)),`${r.id} ${c.path}: absent in original`);
  else assert.deepEqual(parent[parts.at(-1)],c.oldValue);
 }
});
test('equipment completeness retains source-specific and unresolved qualifiers',()=>{
 const staff=find('ua-staff-sling');assert.equal(staff.fields['Staff sling bullet damage vs Large (UA p.26)'],'3–9');assert.equal(staff.fields['Staff sling stone damage vs Large (UA p.26)'],'2–8');
 assert.match(staff.fields['Staff sling range interpretation (UA p.28)'],/no short-range band.*shared AC-adjustment note/i);
 assert.match(find('phb-oil-flask').fields['Encumbrance (DMG p.225)'],/generic flask/i);
 assert.match(find('phb-plate-mail').fields['Encumbrance context'],/category guideline, not a separate weight/i);
 assert.match(find('ua-bronze-plate').fields.Weight,/45 lb \+/);
});

test('holy-water target restriction cites its own DMG p.65 excerpt',()=>{
 const item=find('phb-holy-water');
 assert.deepEqual([item.fieldSources['Affected creatures (DMG p.65)'].book,item.fieldSources['Affected creatures (DMG p.65)'].pages],['DMG',[65]]);
 const cat=JSON.parse(readFileSync(new URL('../dist/scans/verified/equipment-phb-holy-water.json',import.meta.url),'utf8'));
 const region=cat.regions.find(r=>r.id==='dmg-65-6b75e92f6857fece');assert.ok(region);
 assert.deepEqual([region.book,region.printedPage,region.pdfPage],['DMG',65,66]);
 assert.equal(region.sha256,'6b75e92f6857fece62a465c0f8257da8d5e0c97b67b193450f848ec464a9c410');
 assert.ok(!cat.regions.some(r=>r.id==='dmg-64-6b75e92f6857fece'));
});
