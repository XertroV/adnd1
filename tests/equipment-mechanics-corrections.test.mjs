import {readBeforeJoFile as readFileSync} from '../research/class-mapping-history-v1/source-postmetadata-facade-v1/ua-source-batch6-jo-fixture-v1.proposed.mjs';
import {withoutGeneratedCitationTransport,withoutSourceFirstEquipment} from './equipment-source-first-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {equipmentCorrections,equipmentAdditionalCorrections,reverseApprovedEquipmentChanges} from './equipment-mechanics-fixture.mjs';
import {priorReviewedBatch5Value} from './helpers/batch5-semantic-history.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const data=read('../dist/data.json'),require=createRequire(import.meta.url),citations=require('../dist/citations.js');
const item=id=>{const x=data.equipment.find(x=>x.id===id);assert.ok(x,id);return x};
const catalog=id=>read(`../dist/scans/verified/equipment-${id}.json`);
const digest=b=>createHash('sha256').update(b).digest('hex');
const get=(obj,p)=>p.split('/').slice(1).map(x=>x.replaceAll('~1','/').replaceAll('~0','~')).reduce((x,k)=>x[k],obj);
test('approved correction fixture validates every current value before restoring the original semantic baseline',()=>{
 assert.equal(equipmentCorrections.records.length,28);
 assert.equal(equipmentCorrections.records.flatMap(x=>x.changes).length,78);
 const reversed=reverseApprovedEquipmentChanges(data.equipment);
 for(const row of equipmentCorrections.records)for(const c of row.changes){
  assert.deepEqual(withoutGeneratedCitationTransport(priorReviewedBatch5Value('equipment',row.id,c.path,get(item(row.id),c.path),c.newValue)),withoutGeneratedCitationTransport(c.newValue),`${row.id} ${c.path} approved current value`);
  assert.deepEqual(withoutGeneratedCitationTransport(get(reversed.find(x=>x.id===row.id),c.path)),withoutGeneratedCitationTransport(c.oldValue),`${row.id} ${c.path} original value`);
 }
 const tampered=structuredClone(data.equipment);tampered.find(x=>x.id==='phb-oil-flask').price.currency='cp';
 assert.throws(()=>reverseApprovedEquipmentChanges(tampered),/approved current value/);
});
test('new purchase prices preserve listed quantities and unknown prices remain unknown',()=>{
 assert.equal(withoutSourceFirstEquipment(data.equipment).filter(x=>x.price!==null).length,84);
 assert.deepEqual(data.equipment.filter(x=>x.price===null).map(x=>x.id).sort(),['phb-bo-stick','phb-club','phb-quarterstaff','phb-sling-stone'].sort());
 for(const [id,amount,currency,unit] of [
  ['phb-oil-flask',1,'gp','flask'],['phb-light-bolt',1,'sp','single light bolt'],['phb-heavy-bolt',2,'gp','score of heavy bolts'],['phb-sling-bullet',10,'sp','score of sling bullets'],['phb-long-sword',15,'gp','sword and scabbard'],['phb-short-sword',8,'gp','sword and scabbard'],['phb-bastard-sword',25,'gp','sword and scabbard'],['ua-atlatl-javelin',1,'gp','atlatl launcher']
 ]) assert.deepEqual([item(id).price.amount,item(id).price.currency,item(id).price.unit],[amount,currency,unit],id);
 assert.match(item('ua-atlatl-javelin').priceNote,/does not specify a javelin/i);
 assert.equal(item('phb-heavy-bolt').fields['Damage vs S/M'],'2–5');
 assert.equal(item('phb-heavy-bolt').fields['Damage vs S/M (UA p.26)'],'2–5');
 assert.doesNotMatch(item('phb-heavy-bolt').priceNote,/differ/i);
 assert.match(item('ua-aklys-hurled').fields['Range S / M / L (UA p.28)'],/10-foot range only, not 10 yards/);
});
test('new equipment source references and corrected excerpt bind to the right pages and image bytes',()=>{
 for(const id of ['ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle']){
  assert.ok(citations.pages(item(id)).some(p=>p.book==='UA'&&p.page===26),id);
  const c=catalog(id),r=c.regions.find(r=>r.id==='ua-equipment-price-table');assert.ok(r,id);assert.deepEqual([r.book,r.printedPage,r.pdfPage],['UA',26,27]);
 }
 const c=catalog('ua-aklys-hurled'),note=c.regions.find(r=>r.id==='ua-aklys-range-note');assert.ok(note);assert.deepEqual([note.book,note.printedPage,note.pdfPage],['UA',28,29]);
 const heavy=catalog('phb-heavy-bolt');assert.ok(!heavy.regions.some(r=>r.id==='phb-37-2b48e8334c573a67'));
 const replacement=heavy.regions.find(r=>r.id==='phb-37-1424cd0922cd9867');assert.ok(replacement);assert.deepEqual([replacement.book,replacement.printedPage,replacement.pdfPage],['PHB',37,38]);
 for(const r of [note,replacement]){const bytes=readFileSync(new URL(`../dist/scans/verified/${r.image}`,import.meta.url));assert.equal(digest(bytes),r.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[r.width,r.height]);}
});


test('additional source-checked equipment fields retain every approved value and precise source',()=>{
 const records=equipmentAdditionalCorrections.records;
 assert.equal(records.length,45);
 const changes=records.flatMap(r=>r.changes);
 assert.equal(changes.filter(c=>c.path.startsWith('/fields/')).length,209);
 assert.equal(changes.filter(c=>c.path.startsWith('/fieldSources/')).length,209);
 assert.equal(changes.filter(c=>c.path==='/summary').length,9);
 const reversed=reverseApprovedEquipmentChanges(data.equipment);
 for(const row of records) for(const c of row.changes){
  assert.deepEqual(withoutGeneratedCitationTransport(get(item(row.id),c.path)),withoutGeneratedCitationTransport(c.newValue),`${row.id} ${c.path}`);
  if(c.oldExists===false) {
   const parts=c.path.split('/').slice(1).map(k=>k.replaceAll('~1','/').replaceAll('~0','~'));
   const parent=parts.slice(0,-1).reduce((x,k)=>x[k],reversed.find(x=>x.id===row.id));
   assert.ok(!Object.hasOwn(parent,parts.at(-1)),`${row.id} ${c.path}: absent in baseline`);
  } else assert.deepEqual(withoutGeneratedCitationTransport(get(reversed.find(x=>x.id===row.id),c.path)),withoutGeneratedCitationTransport(c.oldValue));
 }
 assert.equal(item('ua-man-catcher').fields['Length (UA p.27)'],'8 ft+');
 assert.match(item('phb-hand-axe').fields['Hand-held AC adjustments (PHB p.38)'],/^AC 2 through 10:/);
 assert.match(item('phb-hand-axe').fields['Hand-held AC adjustments (UA p.27)'],/^AC 0 through 10:/);
 assert.match(item('ua-blowgun-needle').fields['Blowgun and needle combined weight (UA p.26)'],/^15 gp-weight/);
 assert.match(item('ua-staff-sling').fields['Range with bullet or stone (UA p.28)'],/medium: 3–6; long: 9/);
});
