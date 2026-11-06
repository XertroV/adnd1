import {reverseMatrixCellReview} from './fixtures/matrix-baseline.mjs';
import {reverseApprovedEquipmentChanges} from './equipment-mechanics-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('../dist/scans/dagger/',import.meta.url),catalog=JSON.parse(readFileSync(new URL('manifest.json',dir))),data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url)));
const expected={
 'phb35-dagger-price':['PHB',35,36,394,454,'679d01d3fcf760fe438cd08f07142da8956d365971831a3a08bb4285c5e5ab12',[.038071,.92511,.931472,.070485]],
 'phb37-dagger-weight-damage':['PHB',37,38,1700,368,'50a7d56c754f4597a336c5fdbc494b81af51b83dae7495eb960e005e1098ba30',[.007059,.915761,.608824,.078804]],
 'phb38-dagger-melee':['PHB',38,39,1688,346,'de24fd714503bc6a20209fd2ce9175c513c8d4efb695897cbb118768b6c39673',[.004739,.913295,.978673,.080925]],
 'phb38-dagger-thrown':['PHB',38,39,1688,316,'7b88bf3d177e9058e40f1af95ed00237fb18f2b66ae271de57a7aa86676ac425',[.004147,.901899,.978673,.091772]],
 'phb38-missile-notes':['PHB',38,39,1716,100,'488de56f7ded8b5ef7e51226cf976c23a3a2d1bd65b1e810aedc43ce95f0d669',[.002914,.03,.907343,.92]],
 'ua28-dagger-thrown':['UA',28,29,1700,510,'124c61dff155f4b1d59fd442846d7eef584c8606ef7b05e671839544757444c3',[.004118,.937255,.979412,.058824]],
 'ua28-missile-notes':['UA',28,29,1608,136,'0ff1fd747b85152d2dca21de68bcf49a08c84f6817c05574cb5729e0f89c350a',[.004975,.036765,.939055,.926471]],
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const stripExcerpts=v=>Array.isArray(v)?v.map(stripExcerpts):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='sourceExcerpts').map(([k,value])=>[k,stripExcerpts(value)])):v;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
test('only seven unchanged authorized PNG excerpts plus sanitized manifest are public',()=>{
 assert.equal(catalog.itemId,'phb-dagger');assert.equal(catalog.regions.length,7);
 const batchItems=['phb-battle-axe','phb-hand-axe','phb-bardiche','phb-bec-de-corbin','phb-bill-guisarme','phb-bo-stick','phb-club','phb-arrow','phb-heavy-crossbow','phb-light-crossbow','ua-hand-crossbow','phb-composite-long-bow','phb-composite-short-bow','phb-long-bow','phb-short-bow','phb-silver-arrow','ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle'];
 assert.deepEqual(readdirSync(dir).sort(),['manifest.json',...batchItems.map(id=>id+'.json'),...Object.keys(expected).map(id=>id+'.png')].sort());
 const serialized=JSON.stringify(catalog);assert.doesNotMatch(serialized,/libfile_|oai-library|asset_pointer|\/workspace|\/tmp|render_crops|review\.json|file:\/\//i);
 for(const region of catalog.regions){
  const [book,page,pdf,width,height,sha,focus]=expected[region.id]||[];assert.ok(book,region.id);
  assert.equal(region.image,region.id+'.png');assert.equal(region.book,book);assert.equal(region.printedPage,page);assert.equal(region.pdfPage,pdf);
  const png=readFileSync(new URL(region.image,dir));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);assert.equal(region.width,width);assert.equal(region.height,height);assert.equal(hash(png),sha);assert.doesNotMatch(png.toString('latin1'),/libfile_|oai-library|asset_pointer|\/workspace\/|render_crops\.py/i);assert.equal(region.sha256,sha);assert.deepEqual(region.focusRects,[focus]);
  for(const [x,y,w,h]of region.focusRects){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1);}
  assert.equal(region.verification,'visually-checked-crop');assert.ok(region.alt.includes('dagger')||region.alt.includes('missile notes'));
 }
});
test('four source pages contain seven different regions; PDF digests stay handoff provenance',()=>{
 assert.deepEqual([...new Set(catalog.regions.map(r=>r.book+':'+r.printedPage))],['PHB:35','PHB:37','PHB:38','UA:28']);
 for(const source of Object.values(catalog.sources)){assert.equal(source.hashStatus,'supplied-handoff');assert.match(source.sha256,/^[a-f0-9]{64}$/);}
 assert.match(catalog.scope,/outside this image review/);
});
test('dagger retains its scoped evidence while the separate local batch is tested independently',()=>{
 const dagger=reverseApprovedEquipmentChanges(data.equipment).find(x=>x.id==='phb-dagger');assert.equal(dagger.price.amount,2);assert.equal(dagger.price.currency,'gp');assert.deepEqual(dagger.price.pages,[35]);assert.match(dagger.priceNote,/dagger and scabbard/);assert.equal(dagger.incomplete,true);assert.equal(dagger.scanVerification.regionCount,7);assert.equal(Object.keys(dagger.fields).length,6);assert.equal(dagger.fields['Approx. weight'],'10 gp-weight (encumbrance; not purchase cost)');assert.equal(dagger.fields['Damage vs S/M'],'1–4');assert.equal(dagger.fields['Damage vs Large'],'1–3');assert.equal(dagger.fields['Weapon speed factor'],'2');assert.equal(dagger.fields['Thrown rate (UA p.28)'],'2 per melee round');assert.equal(dagger.fields['Thrown range S/M/L (UA p.28)'],'1″ / 2″ / 3″');assert.equal(dagger.fieldSources['Thrown range S/M/L (UA p.28)'].verification.coverage,'numeric-bands-only');
 assert.equal(data.equipment.filter(x=>x.price!==null).length,84);assert.equal(data.equipment.filter(x=>x.price===null).length,4);
 // Pinned semantic hashes from the independent pre-update comparison, without private paths/IDs.
 const other=reverseApprovedEquipmentChanges(data.equipment).filter(x=>!['phb-dagger','phb-battle-axe','phb-hand-axe','phb-bardiche','phb-bec-de-corbin','phb-bill-guisarme','phb-bo-stick','phb-club','phb-arrow','phb-heavy-crossbow','phb-light-crossbow','ua-hand-crossbow','phb-composite-long-bow','phb-composite-short-bow','phb-long-bow','phb-short-bow','phb-silver-arrow','ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle','phb-partisan','phb-ranseur'].includes(x.id)).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(hash(JSON.stringify(canonical(stripExcerpts(other)))),'e4886fa506a940cd8bb7ecc52be577d9d1e892942f3b9633d8249dcde4bc8f5e');assert.equal(hash(JSON.stringify(canonical(stripExcerpts(reverseMatrixCellReview(data.matrices))))),'6f7427943e6de6229dd24f44770388a5de70ccbf861c931eff93c12d3db8a383');
});
