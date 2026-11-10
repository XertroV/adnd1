import {readBeforeJoFile as readFileSync} from '../research/dmg175-validation-coordinator-v1/source-postmetadata-facade-v1/ua-source-batch6-jo-fixture-v1.proposed.mjs';
import {reverseMatrixCellReview} from './helpers/ua-source-dmg74-matrix-batch.mjs';
import {reverseApprovedEquipmentChanges} from './equipment-mechanics-fixture.mjs';
import {withoutBatch5OfferEquipment,withoutGeneratedCitationTransport,withoutSourceFirstEquipment} from './equipment-source-first-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const dir=new URL('../dist/scans/dagger/',import.meta.url);
const catalog=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url)));
const historicalFixtureBytes=readFileSync(new URL('./fixtures/ua28-dagger-baseline-679.json.gz',import.meta.url));
const historical=JSON.parse(gunzipSync(historicalFixtureBytes));
const knownCleanup=JSON.parse(readFileSync(new URL('./fixtures/equipment-known-active-cleanup.json',import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const stripExcerpts=v=>withoutGeneratedCitationTransport(Array.isArray(v)?v.map(stripExcerpts):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='sourceExcerpts').map(([k,value])=>[k,stripExcerpts(value)])):v);

const originalPngs={
 'phb35-dagger-price.png':[394,454,'679d01d3fcf760fe438cd08f07142da8956d365971831a3a08bb4285c5e5ab12'],
 'phb37-dagger-weight-damage.png':[1700,368,'50a7d56c754f4597a336c5fdbc494b81af51b83dae7495eb960e005e1098ba30'],
 'phb38-dagger-melee.png':[1688,346,'de24fd714503bc6a20209fd2ce9175c513c8d4efb695897cbb118768b6c39673'],
 'phb38-dagger-thrown.png':[1688,316,'7b88bf3d177e9058e40f1af95ed00237fb18f2b66ae271de57a7aa86676ac425'],
 'phb38-missile-notes.png':[1716,100,'488de56f7ded8b5ef7e51226cf976c23a3a2d1bd65b1e810aedc43ce95f0d669'],
 'ua28-dagger-thrown.png':[1700,510,'124c61dff155f4b1d59fd442846d7eef584c8606ef7b05e671839544757444c3'],
 'ua28-missile-notes.png':[1608,136,'0ff1fd747b85152d2dca21de68bcf49a08c84f6817c05574cb5729e0f89c350a'],
};
const fullTable={name:'ua28-full-table-f9e1d616b1cec48a.png',sha256:'f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b',width:1130,height:726};
const batchItems=['phb-battle-axe','phb-hand-axe','phb-bardiche','phb-bec-de-corbin','phb-bill-guisarme','phb-bo-stick','phb-club','phb-arrow','phb-heavy-crossbow','phb-light-crossbow','ua-hand-crossbow','phb-composite-long-bow','phb-composite-short-bow','phb-long-bow','phb-short-bow','phb-silver-arrow','ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle'];

test('original seven PNGs and all frozen 679 catalog bytes remain pinned regression fixtures',()=>{
 assert.equal(hash(historicalFixtureBytes),'c252599bafd3e9f3aea29e5b1251058a9a2351972e5ce8eb21d7e3bfc343fb21');
 assert.equal(historical.baselineCommit,'679b15d1c580172e54314829c1c3c86dc78b65f3');
 assert.equal(Object.keys(historical.baselineCatalogs).length,13);
 assert.equal(historical.recipes.length,26);
 assert.equal(Object.keys(historical.originalPngAssets).length,7);
 for(const [name,[width,height,sha]] of Object.entries(originalPngs)){
  const fixture=historical.originalPngAssets[name];assert.ok(fixture,name);assert.equal(fixture.sha256,sha);assert.equal(fixture.width,width);assert.equal(fixture.height,height);
  const png=readFileSync(new URL(name,dir));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);assert.equal(hash(png),sha);assert.equal(hash(png),fixture.sha256);
  assert.doesNotMatch(png.toString('latin1'),/libfile_|oai-library|asset_pointer|\/workspace\/|render_crops\.py/i);
 }
 const paths=Object.keys(historical.baselineCatalogs).sort();
 for(const path of paths){
  const baseline=historical.baselineCatalogs[path],bytes=Buffer.from(baseline.contentBase64,'base64');
  assert.equal(bytes.length,baseline.bytes,path);assert.equal(hash(bytes),baseline.sha256,path);
  const original=JSON.parse(bytes.toString('utf8')),expected=structuredClone(original);
  const recipes=historical.recipes.filter(x=>x.catalogPath===path);assert.equal(recipes.length,2,path);
  for(const recipe of recipes){
   const matches=expected.regions.filter(r=>r.id===recipe.regionId);assert.equal(matches.length,1,`${path}:${recipe.regionId}`);
   Object.assign(matches[0],recipe.expectedRegion);
  }
  const current=JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
  if(path==='dist/scans/dagger/ua-aklys-hurled.json'){
   const cleanup=knownCleanup.cases.find(item=>item.id==='ua-aklys-stale-range-asterisk-availability');
   assert.ok(cleanup,'the later scope-only change has an exact cleanup fixture');
   assert.equal(current.scope,`${cleanup.unchangedNumericClaimPrefix} ${cleanup.replacementSentence}`,
     'the Aklys note wording is exactly the receipt-backed availability correction');
   current.scope=expected.scope;
  }
  assert.deepEqual(canonical(current),canonical(expected),`${path}: only the pinned UA28 context recipes may differ from frozen bytes`);
 }
 const changedRegions=historical.recipes.map(r=>r.regionId);
 assert.equal(new Set(changedRegions).size,14); // Thirteen per-item rows plus one shared notes region ID.
 assert.equal(new Set(historical.recipes.map(r=>r.catalogPath)).size,13);
});

test('new UA28 dagger citations use the exact full table crop and row or note focus recipes',()=>{
 const png=readFileSync(new URL(fullTable.name,dir));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),fullTable.width);assert.equal(png.readUInt32BE(20),fullTable.height);assert.equal(hash(png),fullTable.sha256);
 assert.equal(historical.fullTableAsset.filename,fullTable.name);assert.equal(historical.fullTableAsset.sha256,fullTable.sha256);
 const expectedEntries=['manifest.json',...batchItems.map(id=>id+'.json'),...Object.keys(originalPngs),fullTable.name].sort();
 assert.deepEqual(readdirSync(dir).sort(),expectedEntries);
 const serialized=JSON.stringify(catalog);assert.doesNotMatch(serialized,/libfile_|oai-library|asset_pointer|\/workspace|\/tmp|render_crops|review\.json|file:\/\//i);
 assert.equal(catalog.itemId,'phb-dagger');assert.equal(catalog.regions.length,7);
 for(const region of catalog.regions){
  if(region.book==='UA'){
   assert.equal(region.image,fullTable.name);assert.equal(region.sha256,fullTable.sha256);assert.equal(region.width,fullTable.width);assert.equal(region.height,fullTable.height);
   assert.ok(historical.recipes.some(x=>x.catalogPath==='dist/scans/dagger/manifest.json'&&x.regionId===region.id));
  } else {
   const [width,height,sha]=originalPngs[region.image];assert.ok(sha,region.image);assert.equal(region.width,width);assert.equal(region.height,height);assert.equal(region.sha256,sha);
  }
  for(const [x,y,w,h]of region.focusRects){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1);}
  assert.equal(region.verification,'visually-checked-crop');assert.ok(region.alt.includes('dagger')||region.alt.includes('missile notes'));
 }
 assert.deepEqual([...new Set(catalog.regions.map(r=>r.book+':'+r.printedPage))],['PHB:35','PHB:37','PHB:38','UA:28']);
 for(const source of Object.values(catalog.sources)){assert.equal(source.hashStatus,'supplied-handoff');assert.match(source.sha256,/^[a-f0-9]{64}$/);}
 assert.match(catalog.scope,/outside this image review/);
 const rowRecipes=historical.recipes.filter(x=>x.class==='row');const noteRecipes=historical.recipes.filter(x=>x.class==='notes');
 assert.equal(rowRecipes.length,13);assert.equal(noteRecipes.length,13);
 assert.ok(rowRecipes.every(r=>r.rowLabels.length===1));assert.ok(noteRecipes.every(r=>r.rowLabels.length===0));
 assert.ok(historical.recipes.every(r=>r.expectedRegion.image===fullTable.name&&r.expectedRegion.sha256===fullTable.sha256&&r.expectedRegion.verificationScope==='source-excerpt'));
});

test('dagger keeps its historical mechanics and the separate offer batch stays reversible',()=>{
 const dagger=reverseApprovedEquipmentChanges(data.equipment).find(x=>x.id==='phb-dagger');assert.equal(dagger.price.amount,2);assert.equal(dagger.price.currency,'gp');assert.deepEqual(dagger.price.pages,[35]);assert.match(dagger.priceNote,/dagger and scabbard/);assert.equal(dagger.incomplete,true);assert.equal(dagger.scanVerification.regionCount,7);assert.equal(Object.keys(dagger.fields).length,6);assert.equal(dagger.fields['Approx. weight'],'10 gp-weight (encumbrance; not purchase cost)');assert.equal(dagger.fields['Damage vs S/M'],'1–4');assert.equal(dagger.fields['Damage vs Large'],'1–3');assert.equal(dagger.fields['Weapon speed factor'],'2');assert.equal(dagger.fields['Thrown rate (UA p.28)'],'2 per melee round');assert.equal(dagger.fields['Thrown range S/M/L (UA p.28)'],'1″ / 2″ / 3″');assert.equal(dagger.fieldSources['Thrown range S/M/L (UA p.28)'].verification.coverage,'numeric-bands-only');
 const withoutOffers=withoutBatch5OfferEquipment(data.equipment);
 assert.equal(withoutSourceFirstEquipment(withoutOffers).filter(x=>x.price!==null).length,84);assert.equal(withoutOffers.filter(x=>x.price===null).length,4);
 const other=reverseApprovedEquipmentChanges(withoutOffers).filter(x=>!['phb-dagger','phb-battle-axe','phb-hand-axe','phb-bardiche','phb-bec-de-corbin','phb-bill-guisarme','phb-bo-stick','phb-club','phb-arrow','phb-heavy-crossbow','phb-light-crossbow','ua-hand-crossbow','phb-composite-long-bow','phb-composite-short-bow','phb-long-bow','phb-short-bow','phb-silver-arrow','ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle','phb-partisan','phb-ranseur'].includes(x.id)).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(hash(JSON.stringify(canonical(stripExcerpts(other)))),'e4886fa506a940cd8bb7ecc52be577d9d1e892942f3b9633d8249dcde4bc8f5e');
 assert.equal(hash(JSON.stringify(canonical(stripExcerpts(reverseMatrixCellReview(data.matrices))))),'6f7427943e6de6229dd24f44770388a5de70ccbf861c931eff93c12d3db8a383');
});
