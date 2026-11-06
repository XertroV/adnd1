import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {buildInventory,BATCH_SIZE} from '../tools/source-scan-inventory.mjs';
const require=createRequire(import.meta.url), citations=require('../dist/citations.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url)));
const fixture=readFileSync(new URL('./fixtures/source-scan-inventory.json',import.meta.url),'utf8');
const inventory=buildInventory(data);
test('fixture is reproducible and includes every assembled reference-bearing record',()=>{
 assert.equal(JSON.stringify(inventory)+'\n',fixture);
 const expected=['rules','spells','equipment','matrices','classes'].flatMap(k=>data[k].filter(x=>citations.pages(x).length).map(x=>`${k}:${x.id}`));
 if(citations.pages(data.progressionExplainer).length)expected.push('progressionExplainer:progression-explainer');
 assert.deepEqual(inventory.records.map(r=>`${r.collection}:${r.id}`),expected);
 assert.deepEqual(inventory.counts,{records:892,recordPagePairs:1703,citedPages:216,knownGapPages:2,pagesWithSomeSuppliedCropPixels:4,citedPagesWithoutSuppliedCropPixels:212,batches:24});
});
test('nested field, progression and explainer references retain their paths and page statuses',()=>{
 const dagger=inventory.records.find(r=>r.id==='phb-dagger');
 assert.ok(dagger.references.some(r=>r.path.startsWith('/fieldSources/')&&r.book==='UA'));
 const fighter=inventory.records.find(r=>r.id==='fighter');
 assert.ok(fighter.references.some(r=>r.path.startsWith('/progression/')));
 assert.ok(fighter.references.some(r=>r.path.startsWith('/xpRows/')));
 const explainer=inventory.records.find(r=>r.collection==='progressionExplainer');
 assert.ok(explainer.references.some(r=>r.path.startsWith('/sections/')));
 assert.ok(explainer.pages.every(p=>p.statuses.every(s=>!s.toLowerCase().includes('visually verified'))));
});
test('queue covers all available cited pages exactly once and blocks both missing pages',()=>{
 const queued=inventory.queue.batches.flatMap(b=>{assert.ok(b.pages.length>0&&b.pages.length<=BATCH_SIZE); return b.pages.map(page=>`${b.book}:${page}`)});
 const expected=inventory.pages.filter(p=>p.records.length&&!p.missing).map(p=>`${p.book}:${p.page}`);
 assert.deepEqual(queued,expected);
 assert.equal(new Set(queued).size,queued.length);
 assert.deepEqual(inventory.queue.blocked.map(p=>`${p.book}:${p.page}`),['DMG:175','DMG:240']);
});
test('crop pixels and scoped catalog checks never imply that a page or unrelated record is verified',()=>{
 assert.deepEqual(inventory.pages.filter(p=>p.suppliedCropPixels).map(p=>`${p.book}:${p.page}`),['PHB:35','PHB:37','PHB:38','UA:28']);
 const page=inventory.pages.find(p=>p.book==='PHB'&&p.page===35);
 assert.ok(page.scopedCropChecks.some(c=>c.itemId==='phb-dagger'&&c.fields.includes('price')));
 assert.ok(page.records.some(r=>r.id!=='phb-dagger'));
 assert.ok(!('verified' in page));
 assert.ok(inventory.pages.filter(p=>!p.suppliedCropPixels).every(p=>p.scopedCropChecks.length===0));
});

test('all nested structured reference paths agree with the collector for every record',()=>{
 for(const record of inventory.records){
  const fromPaths=new Set(record.references.flatMap(ref=>ref.pages.map(page=>`${ref.book}:${page}`)));
  const fromCollector=new Set(record.pages.map(ref=>`${ref.book}:${ref.page}`));
  assert.deepEqual([...fromPaths].sort(),[...fromCollector].sort(),`${record.collection}:${record.id}`);
 }
});
