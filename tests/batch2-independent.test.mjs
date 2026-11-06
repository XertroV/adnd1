import {reverseMechanicsBatchTwo} from './mechanics-batch-two-fixture.mjs';
import {reverseMatrixCellReview} from './fixtures/matrix-baseline.mjs';
import {reverseApprovedEquipmentChanges} from './equipment-mechanics-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const data=read('../dist/data.json'),dir=new URL('../dist/scans/dagger/',import.meta.url);
const catalogs=readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read('../dist/scans/dagger/'+f));
const reviewed=read('./fixtures/batch2-reviewed-rows.json').rows;
const changed=['phb-arrow','phb-club','phb-composite-long-bow','phb-composite-short-bow','phb-hand-axe','phb-heavy-crossbow','phb-light-crossbow','phb-long-bow','phb-short-bow','phb-silver-arrow','ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle','ua-hand-crossbow'];
const items=['phb-dagger','phb-battle-axe','phb-hand-axe','phb-bardiche','phb-bec-de-corbin','phb-bill-guisarme','phb-bo-stick','phb-club'];
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const stripExcerpts=v=>Array.isArray(v)?v.map(stripExcerpts):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='sourceExcerpts').map(([k,value])=>[k,stripExcerpts(value)])):v;
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(canonical(v))).digest('hex');
const pngs={
 'phb35-dagger-price.png':[394,454,'679d01d3fcf760fe438cd08f07142da8956d365971831a3a08bb4285c5e5ab12'],
 'phb37-dagger-weight-damage.png':[1700,368,'50a7d56c754f4597a336c5fdbc494b81af51b83dae7495eb960e005e1098ba30'],
 'phb38-dagger-melee.png':[1688,346,'de24fd714503bc6a20209fd2ce9175c513c8d4efb695897cbb118768b6c39673'],
 'phb38-dagger-thrown.png':[1688,316,'7b88bf3d177e9058e40f1af95ed00237fb18f2b66ae271de57a7aa86676ac425'],
 'phb38-missile-notes.png':[1716,100,'488de56f7ded8b5ef7e51226cf976c23a3a2d1bd65b1e810aedc43ce95f0d669'],
 'ua28-dagger-thrown.png':[1700,510,'124c61dff155f4b1d59fd442846d7eef584c8606ef7b05e671839544757444c3'],
 'ua28-missile-notes.png':[1608,136,'0ff1fd747b85152d2dca21de68bcf49a08c84f6817c05574cb5729e0f89c350a'],
};
test('twenty scoped catalogs reuse exactly seven unchanged images without private metadata',()=>{
 assert.equal(catalogs.length,20);for(const id of items) assert.ok(catalogs.some(c=>c.itemId===id),id);
 assert.deepEqual(readdirSync(dir).filter(f=>f.endsWith('.png')).sort(),Object.keys(pngs).sort());
 assert.equal(readdirSync(dir).length,27);
 for(const [name,[width,height,sha]] of Object.entries(pngs)){
  const bytes=readFileSync(new URL(name,dir));assert.equal(hash(bytes),sha,name);assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
 }
 for(const catalog of catalogs){
  assert.doesNotMatch(JSON.stringify(catalog),/libfile_|oai-library|asset_pointer|\/workspace|\/tmp|render_crops|\.pdf["']|\.zip["']|file:\/\//i);
  for(const source of Object.values(catalog.sources))assert.equal(source.hashStatus,'supplied-handoff');
  for(const r of catalog.regions){const [w,h,sha]=pngs[r.image]||[];assert.ok(w,r.id);assert.equal(r.width,w);assert.equal(r.height,h);assert.equal(r.sha256,sha);assert.equal(r.pdfPage,r.printedPage+1);assert.equal(r.verification,'visually-checked-crop');assert.notEqual(r.printedPage,26);for(const [x,y,rw,rh] of r.focusRects)assert.ok(x>=0&&y>=0&&rw>0&&rh>0&&x+rw<=1&&y+rh<=1);}
 }
});
test('all twenty independently read rows retain exact source, values and focus rectangles',()=>{
 assert.equal(reviewed.length,20);
 for(const row of reviewed){const catalog=catalogs.find(c=>c.itemId===row.itemId),region=catalog.regions.find(r=>r.id===row.id);assert.ok(region,row.id);for(const key of ['book','printedPage','pdfPage','image','focusRects','checkedFields'])assert.deepEqual(region[key],row[key],row.id+' '+key);}
 const scoped=catalogs.flatMap(c=>c.regions),unique=new Set(scoped.map(r=>r.id));assert.equal(scoped.length,76);assert.equal(unique.size,56);
 const shared=scoped.filter(r=>r.id==='ua28-missile-notes');assert.ok(shared.length>=2);for(const note of shared)assert.deepEqual(note,shared[0]);
 assert.equal(new Set(scoped.map(r=>r.image)).size,7);
 // Legacy catalog counts are checked above; release totals include additional catalogs.
 for(const catalog of catalogs) assert.ok(data.release.excerpts.itemIds.includes(catalog.itemId),catalog.itemId);
});
test('five visible purchase prices added, and absent Bo/Club rows remain unextracted',()=>{
 for(const [id,amount]of [['phb-battle-axe',5],['phb-hand-axe',1],['phb-bardiche',7],['phb-bec-de-corbin',6],['phb-bill-guisarme',6]]){
  const item=data.equipment.find(e=>e.id===id);assert.equal(item.price.amount,amount);assert.equal(item.price.currency,'gp');assert.equal(item.price.book,'PHB');assert.deepEqual(item.price.pages,[35]);assert.equal(item.priceState,'source_listed');assert.match(item.price.status,/Visually checked/);assert.match(item.fields['Approx. weight'],/encumbrance; not purchase cost/);
 }
 for(const id of ['phb-bo-stick','phb-club']){const item=data.equipment.find(e=>e.id===id);assert.equal(item.price,null);assert.equal(item.priceState,'unextracted');assert.ok(!catalogs.find(c=>c.itemId===id).regions.some(r=>r.printedPage===35));}
 assert.equal(data.equipment.filter(e=>e.price!==null).length,84);assert.equal(data.equipment.filter(e=>e.price===null).length,4);
});
test('UA26 axe damage retains OCR grade despite matching visible PHB damage',()=>{
 for(const [id,sm,large]of [['phb-battle-axe','1–8','1–8'],['phb-hand-axe','1–6','1–4']]){
  const item=data.equipment.find(e=>e.id===id);for(const [label,value]of [['Damage vs S/M (UA p.26)',sm],['Damage vs Large (UA p.26)',large]]){assert.equal(item.fields[label],value);assert.deepEqual(item.fieldSources[label],{book:'UA',pages:[26],status:'OCR checked · visual verification pending'});assert.ok(!item.scanVerification.checkedFields.includes(label));}
  assert.match(item.scanVerification.scope,/UA p\.26 damage.*(?:OCR checked|pending visual review)/);
 }
 const hand=data.equipment.find(e=>e.id==='phb-hand-axe');assert.equal(hand.fields['Fire rate (UA p.28)'],'1 (tabletop-miniatures turn or melee round)');assert.equal(hand.fields['Range S / M / L (UA p.28)'],'1 / 2 / 3 (numeric bands)');assert.equal(hand.fieldSources['Range S / M / L (UA p.28)'].verification.coverage,'numeric-bands-only');
});
test('new selected-value evidence belongs to its item and exact cited page',()=>{
 for(const item of data.equipment.filter(e=>items.includes(e.id))){
  const catalog=catalogs.find(c=>c.itemId===item.id);assert.ok(catalog);assert.equal(item.scanVerification.regionCount,catalog.regions.length);assert.equal(item.incomplete,true);
  for(const source of [item.price,...Object.values(item.fieldSources||{}),...(item.references||[])].filter(Boolean)){
   if(!source.verification)continue;
   for(const id of source.verification.regions){const region=catalog.regions.find(r=>r.id===id);assert.ok(region,item.id+' '+id);assert.equal(region.book,source.book);assert.ok(source.pages.includes(region.printedPage));}
  }
 }
 for(const [id,weight,speed,sm,large]of [['phb-bardiche',125,9,'2–8','3–12'],['phb-bec-de-corbin',100,9,'1–8','1–6'],['phb-bill-guisarme',150,10,'2–8','1–10'],['phb-bo-stick',15,3,'1–6','1–3'],['phb-club',30,4,'1–6','1–3']]){
  const i=data.equipment.find(e=>e.id===id);assert.match(i.fields['Approx. weight'],new RegExp('^'+weight+' gp-weight'));assert.equal(i.fields['Weapon speed factor'],String(speed));assert.equal(i.fields['Damage vs S/M'],sm);assert.equal(i.fields['Damage vs Large'],large);
 }
});
test('the untouched equipment entries, Dagger and matrices match the v9 semantic baseline',()=>{
 const others=reverseApprovedEquipmentChanges(data.equipment).filter(e=>![...items,...changed,'phb-partisan','phb-ranseur'].includes(e.id)).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(others.length,66);assert.equal(hash(stripExcerpts(others)),'e4886fa506a940cd8bb7ecc52be577d9d1e892942f3b9633d8249dcde4bc8f5e');assert.equal(hash(stripExcerpts(data.equipment.find(e=>e.id==='phb-dagger'))),'557dbc64622c8e7b01f2e77a634845f75578d14aaec2a28371ccc1f47c6ecd8a');assert.equal(hash(stripExcerpts(reverseMatrixCellReview(data.matrices))),'6f7427943e6de6229dd24f44770388a5de70ccbf861c931eff93c12d3db8a383');
});
test('other spells retain their semantics; rules and classes are unchanged',()=>{
 assert.equal(hash(stripExcerpts(reverseMechanicsBatchTwo(data.spells,'spells').filter(s=>!['ua-cleric-endure-cold-endure-heat','ua-illusionist-mirage-arcane','ua-magic-user-dusty','phb-magic-user-pyrotechnics','phb-illusionist-emotion','phb-illusionist-first-level-magic-user-spells','phb-cleric-speak-with-animals','phb-druid-speak-with-animals'].includes(s.id)).map(({references,...item})=>item))),'cd920ade0f945463be0737a0f4da43eed0f6edd0c899f33b8504affd94941f73');assert.equal(hash(stripExcerpts(reverseMechanicsBatchTwo(data.rules,'rules'))),'ad9db274e4f158d9f931c0eba3b52878b432754318b6b8e120e68f148a035de6');assert.equal(hash(stripExcerpts(data.classes)),'2dc47b8a22e59046c76d9f1fe00b75c86ee973c9af0180363d9bde423a94f820');
 const refs={
  'ua-cleric-ceremony':[['PHB',43]],'ua-cleric-aid':[['PHB',43]],'ua-cleric-heroes-feast':[['PHB',43]],'ua-druid-slow-poison':[['PHB',45]],'ua-illusionist-dispel-magic':[['PHB',47]],'ua-cleric-abjure':[['PHB',47]],'ua-magic-user-mordenkainens-disjunction':[['PHB',47],['PHB',73]],'ua-magic-user-yawn':[['PHB',68]],'ua-magic-user-bind':[['PHB',54]],'ua-magic-user-teleport-without-error':[['PHB',82]],'ua-cleric-spike-growth':[['DMG',74]],'ua-druid-spike-growth':[['DMG',74]],'ua-cleric-spike-stones':[['DMG',74]],'ua-druid-spike-stones':[['DMG',74]],'ua-magic-user-magic-mirror':[['DMG',141]],'ua-illusionist-magic-mirror':[['DMG',141]],'ua-druid-reflecting-pool':[['DMG',141]],'ua-magic-user-leomunds-secure-shelter':[['PHB',69],['PHB',72]],'ua-illusionist-read-illusionist-magic':[['PHB',68]],'ua-magic-user-melfs-minute-meteors':[['DMG',64]],
 };
 assert.equal(Object.keys(refs).length,20);assert.equal(Object.values(refs).flat().length,22);
 for(const [id,pairs]of Object.entries(refs)){const spell=data.spells.find(s=>s.id===id);assert.ok(spell,id);for(const[book,page]of pairs){const r=spell.references.find(r=>r.book===book&&r.pages.includes(page));assert.ok(r,id+' '+book+page);assert.match(r.status,/OCR checked.*visual review pending/);assert.equal(r.verification,undefined);}}
 for(const id of ['ua-cleric-spike-growth','ua-druid-spike-growth','ua-cleric-spike-stones','ua-druid-spike-stones'])assert.match(data.spells.find(s=>s.id===id).references.find(r=>r.book==='DMG'&&r.pages.includes(74)).label,/lookup context/);
 for(const[id,page]of [['ua-druid-spike-growth',38],['ua-druid-spike-stones',40],['ua-illusionist-magic-mirror',57]]){const s=data.spells.find(s=>s.id===id);assert.equal(s.pages.filter(p=>p===page).length,1);assert.equal((s.references||[]).filter(r=>r.book==='UA'&&r.pages.includes(page)).length,0);}
});
test('Speak With Animals adds only the unresolved reaction-chart note',()=>{
 const hashes=[['phb-cleric-speak-with-animals','31591fbf566d3781b4904d3562460efe95adf21fabe60ef6f6ddd875ff9b9abf'],['phb-druid-speak-with-animals','48177a1c7a1074471271c97609f053cd68f9690827cc93df080fce8b8f419c84']];
 for(const [id,expected] of hashes){
  const {references,...spell}=data.spells.find(item=>item.id===id);
  assert.equal(spell.exceptions.length,2);
  assert.equal(spell.exceptions[1],'The PHB calls for a special reaction chart but does not identify it; the referee determines how to resolve the favor or service.');
  assert.equal(hash(stripExcerpts({...spell,exceptions:spell.exceptions.slice(0,1)})),expected,id);
 }
});
