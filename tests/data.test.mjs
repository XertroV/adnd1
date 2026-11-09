import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
const root=resolve(import.meta.dirname,'..');
const data=JSON.parse(readFileSync(resolve(root,'dist/data.json'),'utf8'));
test('all entries have unique stable identifiers and valid source locations',()=>{
 for(const collection of ['rules','spells','classes']) {
  const ids=new Set();
  for(const item of data[collection]) {
   assert.ok(item.id,`${collection}: missing id`);
   assert.ok(!ids.has(item.id),`duplicate id: ${item.id}`); ids.add(item.id);
   assert.ok(['PHB','UA','DMG'].includes(item.book),`${item.id}: invalid source`);
   assert.ok(Array.isArray(item.pages)&&item.pages.length,`${item.id}: missing citation`);
   for(const page of item.pages) {
    assert.ok(Number.isInteger(page)&&page>0,`${item.id}: invalid page`);
    const max={PHB:128,UA:128,DMG:240}[item.book];
    assert.ok(page<=max,`${item.id}: page out of range`);
    if(item.book==='DMG') assert.ok(![175,239,240].includes(page),`${item.id}: cites missing or unverified page`);
   }
   assert.ok(item.status,`${item.id}: missing verification status`);
   assert.ok(!/visually verified/i.test(item.status),`${item.id}: unsupported visual verification`);
  }
 }
});
test('XP thresholds are cumulative, integral and strictly increasing',()=>{
 for(const cls of data.classes) {
  assert.ok(Array.isArray(cls.xp),`${cls.id}: xp must be array`);
  cls.xp.forEach((xp,i)=>{assert.ok(Number.isSafeInteger(xp)&&xp>=0,`${cls.id}: invalid XP`); if(i)assert.ok(xp>cls.xp[i-1],`${cls.id}: non-monotonic XP`);});
 }
});
test('sparse XP, continuation anchors and level changes retain exact source context',()=>{
 for(const cls of data.classes){
  const tracks=new Map();
  for(const row of cls.xpRows||[]){
   assert.ok(Number.isInteger(row.level)&&row.level>=1);
   assert.ok(Number.isSafeInteger(row.xp)&&row.xp>=0);
   const track=row.track||'';if(!tracks.has(track))tracks.set(track,[]);tracks.get(track).push(row);
  }
  for(const rows of tracks.values()){
   rows.sort((a,b)=>a.level-b.level);rows.forEach((r,i)=>{if(i){assert.ok(r.level>rows[i-1].level);assert.ok(r.xp>rows[i-1].xp);}});
  }
  if(cls.xpContinuation?.anchorXp!=null){
   const c=cls.xpContinuation;assert.ok(c.increment>0&&Number.isInteger(c.increment));
   assert.ok((cls.xpRows||[]).some(r=>r.level===c.afterLevel&&r.xp===c.anchorXp&&r.track===c.track),`${cls.id}: continuation needs its matching source anchor`);
  }
  for(const ref of [...(cls.xpRows||[]),...(cls.levelChanges||[]),...(cls.xpContinuation?[cls.xpContinuation]:[]),...(cls.levelLimit?[cls.levelLimit]:[])]){
   assert.ok(['PHB','DMG','UA'].includes(ref.book),`${cls.id}: nested source required`);
   assert.ok(ref.pages?.length,`${cls.id}: nested pages required`);
   for(const page of ref.pages){assert.ok(Number.isInteger(page)&&page>=1&&page<=({PHB:128,UA:128,DMG:240}[ref.book]));if(ref.book==='DMG')assert.ok(![175,239,240].includes(page));}
   assert.ok(ref.status,`${cls.id}: nested verification status required`);
   if(ref.changes){assert.equal(ref.incomplete,true);assert.ok(ref.changes.length>0);}
  }
 }
});
test('spell filters have source-supported class and level values',()=>{
 for(const spell of data.spells) {
  assert.ok(['Magic-user','Magic-User','Cleric','Druid','Illusionist'].includes(spell.class),`${spell.id}: unsupported class ${spell.class}`);
  assert.ok(Number.isInteger(spell.level)&&spell.level>=0&&spell.level<=9,`${spell.id}: invalid spell level`);
  if(spell.classes) assert.ok(spell.classes.includes(spell.class)&&spell.classes.every(c=>['Magic-user','Cleric','Druid','Illusionist'].includes(c)),`${spell.id}: invalid shared classes`);
  assert.equal(typeof spell.fields,'object');
  for(const field of ['effect','conditions','exceptions'])assert.ok(Array.isArray(spell[field]),`${spell.id}: ${field} must be array`);
 }
});
test('all five source editions, the DMG gap, and unnumbered physical leaves are disclosed',()=>{
 assert.deepEqual(data.sources.map(s=>s.id),['PHB','UA','DMG','MM','MM2']);
 const dmg=data.sources.find(s=>s.id==='DMG');assert.deepEqual(dmg.gaps,[175]);assert.deepEqual(dmg.unnumberedPdfLeaves.map(({pdfPage,printedPage,kind})=>[pdfPage,printedPage,kind]),[[239,null,'interior-reference-leaf'],[240,null,'rear-cover']]);assert.equal(Object.hasOwn(dmg,'unverified'),false);
 assert.equal(data.release.sourceFilesDeployed,false);
});
test('deployed tree contains no source PDFs, credentials or wholesale OCR',()=>{
 const walk=dir=>readdirSync(dir).flatMap(n=>{const p=resolve(dir,n);return statSync(p).isDirectory()?walk(p):[p]});
 for(const file of walk(resolve(root,'dist')))assert.ok(!/\.(pdf|txt|py|env|pem|key)$/i.test(file),file);
 const text=readFileSync(resolve(root,'dist/data.json'),'utf8');
 assert.ok(!/download_url|completion_token|source_repository_credential|<PARSED TEXT FOR PAGE/.test(text));
});
