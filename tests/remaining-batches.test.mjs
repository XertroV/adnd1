import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const data=read('../dist/data.json');
const reviewed=read('./fixtures/remaining-reviewed-rows.json').rows;
const dir=new URL('../dist/scans/dagger/',import.meta.url);
const catalogs=readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read('../dist/scans/dagger/'+f));
const newIds=['phb-composite-long-bow','phb-composite-short-bow','phb-long-bow','phb-short-bow','phb-silver-arrow','ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle'];
const item=id=>{const v=data.equipment.find(x=>x.id===id);assert.ok(v,id);return v};
const catalog=id=>{const c=catalogs.find(x=>x.itemId===id);assert.ok(c,id);return c};
test('all 29 newly reviewed rows preserve exact image, focus, numeric values and source binding',()=>{
 assert.equal(reviewed.length,29);assert.equal(new Set(reviewed.map(r=>r.id)).size,29);
 for(const row of reviewed){
  const region=catalog(row.itemId).regions.find(r=>r.id===row.id);assert.ok(region,row.id);
  for(const key of ['book','printedPage','pdfPage','image','sha256','width','height','focusRects','checkedFields'])assert.deepEqual(region[key],row[key],row.id+' '+key);
  assert.equal(region.verification,'visually-checked-crop');
  assert.equal(region.pdfPage,region.printedPage+1);
  const gear=item(row.itemId);assert.equal(gear.incomplete,true);
  const refs=[gear.price,...Object.values(gear.fieldSources||{}),...(gear.references||[])].filter(Boolean);
  assert.ok(refs.some(ref=>ref.book===row.book&&ref.pages.includes(row.printedPage)&&ref.verification?.regions?.includes(row.id)),row.id+' binds a selected value to this row');
  if(row.checkedFields.fireRate){
   const page=`${row.book} p.${row.printedPage}`;
   const rateKey=Object.keys(gear.fields).find(k=>/^(Rate of fire|Fire rate)/.test(k)&&k.includes(page)) || Object.keys(gear.fields).find(k=>/^(Rate of fire|Fire rate)/.test(k));
   const rangeKey=Object.keys(gear.fields).find(k=>k.startsWith('Range S / M / L')&&k.includes(page)) || Object.keys(gear.fields).find(k=>k.startsWith('Range S / M / L'));
   assert.ok(rateKey,row.id);assert.ok(rangeKey,row.id);
   assert.equal(gear.fields[rateKey],`${row.checkedFields.fireRate} (tabletop-miniatures turn or melee round)`);
   assert.ok(gear.fields[rangeKey].startsWith(`${row.checkedFields.rangeShortMediumLong} (numeric bands`),row.id);
   for(const key of [rateKey,rangeKey]) {
    const source=gear.fieldSources[key];assert.ok(source?.verification?.regions?.length,`${row.id}: canonical ${key}`);
    if(key.includes(page)) assert.ok(source.verification.regions.includes(row.id),`${row.id}: ${key}`);
    else assert.ok(gear.references?.some(ref=>ref.book===row.book&&ref.pages.includes(row.printedPage)&&ref.verification?.regions?.includes(row.id)),`${row.id}: corroborating reference`);
   }
   assert.equal(gear.fieldSources[rangeKey].verification.coverage,'numeric-bands-only');
  }
 }
});
test('reviewed inventory adds eight distinct items and preserves price quantities',()=>{
 assert.equal(data.equipment.length,88);assert.equal(new Set(data.equipment.map(i=>i.id)).size,88);
 assert.equal(catalogs.length,20);assert.equal(data.equipment.filter(i=>i.price!==null).length,59);assert.equal(data.equipment.filter(i=>i.price===null).length,29);
 for(const id of newIds){assert.equal(data.equipment.filter(i=>i.id===id).length,1);catalog(id)}
 for(const [id,amount,currency] of [['phb-heavy-crossbow',20,'gp'],['phb-light-crossbow',12,'gp'],['phb-composite-long-bow',100,'gp'],['phb-composite-short-bow',75,'gp'],['phb-long-bow',60,'gp'],['phb-short-bow',15,'gp'],['phb-silver-arrow',1,'gp'],['phb-arrow',2,'sp']]){
  const p=item(id).price;assert.deepEqual([p.amount,p.currency,p.book,p.pages],[amount,currency,'PHB',[35]],id);
 }
 const arrow=item('phb-arrow'),silver=item('phb-silver-arrow');
 assert.equal(arrow.price.unit,'single normal arrow');assert.equal(arrow.fields['Normal arrows, dozen price'],'1 gp per dozen');
 assert.ok(arrow.fieldSources['Normal arrows, dozen price'].verification.regions.includes('phb-arrow-phb35-2'));
 assert.equal(silver.price.unit,'single silver arrow');assert.deepEqual(silver.fields,{});assert.deepEqual(silver.fieldSources,{});
 for(const id of ['ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle','ua-hand-crossbow','phb-club'])assert.equal(item(id).price,null,id);
 assert.match(item('ua-atlatl-javelin').name,/Atlatl \(javelin\)/);
 assert.match(item('ua-aklys-hurled').fields['Range S / M / L (UA p.28)'],/^1\* \/ — \/ —/);
 assert.match(item('ua-aklys-hurled').scanVerification.scope,/asterisk.*unavailable/i);
});
test('unreviewed scale and UA axe damage retain their OCR pending grade',()=>{
 for(const id of ['phb-light-crossbow','phb-heavy-crossbow','ua-hand-crossbow']){
  const s=item(id).fieldSources['Range scale (PHB p.39)'];assert.equal(s.book,'PHB');assert.deepEqual(s.pages,[39]);assert.match(s.status,/OCR checked.*visual.*pending/i);assert.equal(s.verification,undefined);
 }
 for(const id of ['phb-hand-axe','phb-battle-axe'])for(const key of ['Damage vs S/M (UA p.26)','Damage vs Large (UA p.26)']){
  const s=item(id).fieldSources[key];assert.deepEqual([s.book,s.pages],['UA',[26]]);assert.match(s.status,/OCR checked.*visual.*pending/i);assert.equal(s.verification,undefined);
 }
});
test('spell reference additions retain source pages and OCR-pending grading',()=>{
 for(const spell of data.spells){
  const seen=new Set();
  for(const ref of spell.references||[]){
   const limits={PHB:128,UA:128,DMG:239,MM:112,MM2:160};assert.ok(Object.hasOwn(limits,ref.book),spell.id);
   assert.ok(ref.pages?.length,spell.id);
   assert.match(ref.status,/OCR checked.*visual review pending/,spell.id);
   assert.equal(ref.verification,undefined,spell.id);
   for(const page of ref.pages){
    assert.ok(Number.isInteger(page)&&page>0&&page<=limits[ref.book],spell.id);
    assert.ok(!(ref.book==='DMG'&&[175,240].includes(page)),spell.id);
    assert.ok(!(ref.book===spell.book&&spell.pages.includes(page)),`${spell.id}: primary page duplicated`);
    const key=ref.book+':'+page;assert.ok(!seen.has(key),`${spell.id}: repeated reference ${key}`);seen.add(key);
   }
  }
 }
});
test('matching missile rows use one canonical pair and retain separately sourced corroboration',()=>{
 for(const [id,book,page,otherBook,otherPage] of [
  ['phb-hand-axe','UA',28,'PHB',38],['phb-club','UA',28,'PHB',38],['phb-light-crossbow','UA',28,'PHB',38],['phb-heavy-crossbow','UA',28,'PHB',38],
  ['phb-composite-long-bow','PHB',38,'UA',28],['phb-composite-short-bow','PHB',38,'UA',28],['phb-long-bow','PHB',38,'UA',28],['phb-short-bow','PHB',38,'UA',28],
 ]){
  const gear=item(id),rates=Object.keys(gear.fields).filter(k=>/^(Rate of fire|Fire rate)/.test(k)),ranges=Object.keys(gear.fields).filter(k=>k.startsWith('Range S / M / L'));
  assert.equal(rates.length,1,id);assert.equal(ranges.length,1,id);
  for(const key of [...rates,...ranges])assert.deepEqual([gear.fieldSources[key].book,gear.fieldSources[key].pages],[book,[page]],id+' '+key);
  const corroboration=gear.references.find(r=>r.book===otherBook&&r.pages.includes(otherPage)&&r.verification?.method==='supplied-scan-crop');
  assert.ok(corroboration,id+' corroboration');
  assert.ok(corroboration.verification.regions.some(id=>reviewed.some(row=>row.id===id&&row.itemId===gear.id)),id+' row-specific corroboration');
 }
});
test('assembled spell citations exactly match the baseline plus independently approved additions',()=>{
 const fixture=read('./fixtures/remaining-approved-references.json');
 const baseline=read('./fixtures/spell-reference-baseline.json').references;
 assert.equal(fixture.cards,80);assert.equal(fixture.referenceObjects,102);assert.equal(fixture.bookPagePairs,113);
 assert.equal(fixture.additions.length,102);assert.equal(new Set(fixture.additions.map(r=>r.id)).size,80);
 assert.equal(fixture.additions.reduce((n,r)=>n+r.pages.length,0),113);assert.equal(baseline.length,25);
 const key=x=>JSON.stringify([x.id,x.book,x.pages,x.label,x.status]);
 const expected=[...baseline,...fixture.additions].map(key).sort();
 const actual=data.spells.flatMap(spell=>(spell.references||[]).map(ref=>({id:spell.id,...ref}))).map(key).sort();
 assert.deepEqual(actual,expected,'all references must be the unchanged baseline or an explicitly reviewed addition');
 for(const ref of fixture.additions){assert.equal(ref.status,'OCR checked · visual review pending');assert.ok(ref.label);}
});
