// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import {readFileSync,readdirSync,statSync} from '../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {assertWeaponPendingBindingCohort} from './helpers/weapon-source-current-cohort.mjs';
import {readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort} from './helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {createRequire} from 'node:module';
import {execFileSync} from '../research/class-mapping-history-v1/mm-replay-child-process-v1.mjs';
import {createHash} from 'node:crypto';
import {assertCurrentWeaponOwnerAdditions as partialWeaponOwnerAdditions} from './fixtures/weapon-source-current-cohort-partial-before.mjs';
const root=resolve(import.meta.dirname,'..');
const require=createRequire(import.meta.url),books=require('../dist/books.js');
const currentInputs=readMmTreasureCurrentSourceInputs(root);
const currentSourceRuleIds=new Set([
 ...JSON.parse(readFileSync(resolve(root,'tests/fixtures/hirelings-source-current-cohort-v1.json'),'utf8')).newRuleIds,
 ...JSON.parse(readFileSync(resolve(root,'tests/fixtures/mm-treasure-current-m1-cohort-v1.json'),'utf8')).mmSource.addedRuleIds,
]);
const priorAppendixCRuleIds=new Set(JSON.parse(readFileSync(resolve(root,'tests/fixtures/dmg175-source-current-cohort-v1.json'),'utf8')).newRuleIds);
const allowedDmg175Owners=new Set(['appendix-c-character-subtable','appendix-c-party-size','appendix-c-character-levels','appendix-c-henchmen','appendix-c-character-guidance','appendix-c-party-magic-distribution']);
const data=JSON.parse(readFileSync(resolve(root,'dist/data.json'),'utf8'));
function assertPrintedDmgPageAllowed(collection,item,page){
 if(item.book!=='DMG')return;
 if(page===175){
  assert.equal(collection,'rules',`${item.id}: p.175 supplement is limited to registered current rule owners`);
  assert.ok(allowedDmg175Owners.has(item.id),`${item.id}: unregistered owner cannot use p.175 supplement`);
  assert.equal(books.pdfPage('DMG',175),null,'the physical PDF still has no printed p.175 mapping');
  assert.equal(books.availability('DMG',175),'missing','p.175 remains absent from the supplied PDF');
  assert.equal(books.evidenceAvailability('DMG',175),'supplemental');
  assert.equal(books.supplementalEvidence('DMG',175).published,false,'the full supplemental image remains unpublished');
  return;
 }
 assert.ok(![239,240].includes(page),`${item.id}: cites unnumbered PDF leaf as a printed page`);
}
function assertRegisteredPrintedPageAllowed(collection,item,page){
 const book=item.book;
 assert.equal(typeof book,'string',`${item.id}: source book must be a canonical registered ID`);
 assert.equal(book,books.code(book),`${item.id}: source book must be a canonical registered ID`);
 assert.ok(Object.hasOwn(books.books,book),`${item.id}: unregistered book ${book}`);
 assert.ok(Number.isInteger(page)&&page>0,`${item.id}: invalid page`);
 assertPrintedDmgPageAllowed(collection,item,page);
 const source=books.books[book];
 assert.ok(page<=source.lastPage,`${item.id}: page out of range for ${book}`);
 if(book==='DMG'&&page===175)return;
 assert.equal(books.availability(book,page),'available',`${item.id}: printed page is not physically available`);
 assert.ok(Number.isInteger(books.pdfPage(book,page))&&books.pdfPage(book,page)>0,`${item.id}: printed page has no physical PDF mapping`);
}
test('all entries have unique stable identifiers and valid source locations',()=>{
 assertMmTreasureCurrentSourceCohort(currentInputs);
 for(const id of currentSourceRuleIds){
  const item=data.rules.find(row=>row.id===id);assert.ok(item,`${id}: current source-cohort rule owner required`);assert.ok(item.status,`${id}: current rule owner carries status metadata`);
  const attached=currentInputs.inventory.fieldEvidenceBindings.filter(binding=>binding.collection==='rules'&&binding.itemId===id);
  assert.ok(attached.length,`${id}: attached canonical source bindings required`);
  assert.ok(attached.every(binding=>binding.sourceValueStatus==='not-assessed-by-field-target-review'),`${id}: source values remain unassessed on attached bindings`);
  assert.ok(attached.some(binding=>binding.reviewStatus==='field-target-pending'),`${id}: pending review status lives on an attached binding`);
 }
 for(const collection of ['rules','spells','classes']) {
  const ids=new Set();
  for(const item of data[collection]) {
   assert.ok(item.id,`${collection}: missing id`);
   assert.ok(!ids.has(item.id),`duplicate id: ${item.id}`); ids.add(item.id);
   assert.ok(Array.isArray(item.pages)&&item.pages.length,`${item.id}: missing citation`);
   for(const page of item.pages) assertRegisteredPrintedPageAllowed(collection,item,page);
   if(!item.status){
    if(priorAppendixCRuleIds.has(item.id)){
     assert.equal(collection,'rules',`${item.id}: exact current Appendix C owner`);
     assert.equal(item.book,'DMG');
     assert.equal(item.sourceExcerpts?.state,'source-excerpt-checked','excerpt availability is source evidence, not a value-grade approval');
     for(const row of item.table?.rows||[]){assert.equal(row.sourceReference.reviewStatus,'field-target-pending');assert.equal(row.sourceReference.sourceValueStatus,'not-assessed-by-field-target-review');}
     continue;
    }
    assert.equal(collection,'rules');assert.ok(['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'].includes(item.id),`${item.id}: only the closed prior weapon cohort uses this branch`);
    assert.equal(item.sourceExcerpts?.state,'source-excerpt-checked','the source excerpt state supplies the bounded status; no value review is implied');
    const facts=[...item.table.rows,...item.table.sourceNotes,...(item.table.footnotes||[])];
    assert.equal(facts.length,item.book==='PHB'?20:30);
    for(const fact of facts){assert.equal(fact.sourceReference.evidenceBindings.length,1);assert.ok(fact.sourceReference.evidenceBindings.every(binding=>binding.reviewStatus==='field-target-pending'&&binding.sourceValueStatus==='not-assessed-by-field-target-review'));}
   }
   assert.ok(!/visually verified/i.test(item.status),`${item.id}: unsupported visual verification`);
  }
 }
});
test('DMG p.175 remains a bounded supplemental exception and 239/240 remain invalid printed pages',()=>{
 for(const itemId of allowedDmg175Owners)assert.doesNotThrow(()=>assertPrintedDmgPageAllowed('rules',{id:itemId,book:'DMG'},175));
 assert.throws(()=>assertPrintedDmgPageAllowed('rules',{id:'unregistered-current-owner',book:'DMG'},175),/unregistered owner/);
 assert.throws(()=>assertPrintedDmgPageAllowed('equipment',{id:'appendix-c-party-size',book:'DMG'},175),/limited to registered current rule owners/);
 for(const page of [239,240])assert.throws(()=>assertPrintedDmgPageAllowed('rules',{id:'appendix-c-party-size',book:'DMG'},page),/unnumbered PDF leaf/);
 assert.equal(books.pdfPage('DMG',175),null);assert.equal(books.availability('DMG',175),'missing');
 assert.equal(books.supplementalEvidence('DMG',175).published,false);
});

test('registered books enforce canonical printed-page bounds, availability and mappings',()=>{
 assert.deepEqual(Object.keys(books.books).sort(),['DMG','MM','MM2','PHB','UA']);
 const mappings=[
  ['PHB',1,2],['PHB',128,129],
  ['UA',1,2],['UA',128,129],
  ['DMG',1,2],['DMG',174,175],['DMG',176,176],['DMG',238,238],
  ['MM',1,2],['MM',112,113],
  ['MM2',1,2],['MM2',82,83],['MM2',83,92],['MM2',84,84],['MM2',91,91],['MM2',92,93],['MM2',160,161],
 ];
 for(const [book,printed,pdf] of mappings){
  assert.equal(books.availability(book,printed),'available',`${book} p.${printed}: registered printed page`);
  assert.equal(books.pdfPage(book,printed),pdf,`${book} p.${printed}: PDF mapping`);
 }
 assert.throws(()=>assertRegisteredPrintedPageAllowed('rules',{id:'probe',book:'UNKNOWN'},1),/unregistered book/);
 assert.throws(()=>assertRegisteredPrintedPageAllowed('rules',{id:'probe',book:'Monster Manual'},105),/canonical registered ID/);
 assert.throws(()=>assertRegisteredPrintedPageAllowed('rules',{id:'probe',book:'MM'},113),/page out of range/);
 assert.throws(()=>assertRegisteredPrintedPageAllowed('rules',{id:'probe',book:'MM'},0),/invalid page/);
 assert.throws(()=>assertRegisteredPrintedPageAllowed('rules',{id:'not-registered-owner',book:'DMG'},175),/unregistered owner/);
 for(const page of [239,240])assert.throws(()=>assertRegisteredPrintedPageAllowed('rules',{id:'probe',book:'DMG'},page),/unnumbered PDF leaf/);
 assert.equal(books.pdfPage('DMG',175),null,'the supplemental DMG page has no physical PDF mapping');
 assert.equal(books.evidenceAvailability('DMG',175),'supplemental');
});

test('native current guard preserves the exact current owner graph and prior weapon bindings',()=>{
 assertMmTreasureCurrentSourceCohort(currentInputs);
 const inventory=JSON.parse(readFileSync(resolve(root,'research/price-source-inventory.json'),'utf8'));
 assert.equal(assertWeaponPendingBindingCohort(inventory.fieldEvidenceBindings).length,107);
});
test('the historical partial guard accepts unknown DMG metadata and the native current guard rejects it',()=>{
 assertMmTreasureCurrentSourceCohort(currentInputs);
 const beforeBytes=execFileSync('git',['show','6717c6f22bbf2f2b421327e4c8561b1d81df00d4:dist/data.json'],{cwd:root,maxBuffer:40*1024*1024});
 assert.equal(createHash('sha256').update(beforeBytes).digest('hex'),'6643d7b58c90d982244f1d8f03b6f03a7587446ba25c402be8f9a81a8b701f8f');
 for(const key of ['sourceContext','sourceExcerpts']){
  const historicalMutation=JSON.parse(beforeBytes);historicalMutation.rules.find(item=>item.id==='weapon-versus-armor-adjustments')[key].unapprovedNativeCanary=true;
  assert.doesNotThrow(()=>partialWeaponOwnerAdditions(historicalMutation),'preserved partial guard accepts the mutation at its actual historical source state');
  const mutation=structuredClone(data);mutation.rules.find(item=>item.id==='weapon-versus-armor-adjustments')[key].unapprovedNativeCanary=true;
  assert.throws(()=>assertMmTreasureCurrentSourceCohort({...currentInputs,data:mutation}));
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
