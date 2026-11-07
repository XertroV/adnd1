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
 assert.equal(inventory.counts.records,892 + 28);assert.equal(inventory.counts.recordPagePairs,1857 + 28);assert.equal(inventory.counts.citedPages,230);assert.equal(inventory.counts.knownGapPages,1);assert.equal(inventory.counts.unverifiedPages,2);
 assert.equal(inventory.counts.pagesWithSomeSuppliedCropPixels,inventory.pages.filter(p=>p.suppliedCropPixels).length);
 assert.equal(inventory.counts.citedPagesWithoutSuppliedCropPixels,inventory.pages.filter(p=>p.records.length&&!p.suppliedCropPixels).length);
 assert.equal(inventory.counts.batches,inventory.queue.batches.length);
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
test('queue covers all available cited pages exactly once and blocks the missing page and unverified end matter',()=>{
 const queued=inventory.queue.batches.flatMap(b=>{assert.ok(b.pages.length>0&&b.pages.length<=BATCH_SIZE); return b.pages.map(page=>`${b.book}:${page}`)});
 const expected=inventory.pages.filter(p=>p.records.length&&p.availability==='available').map(p=>`${p.book}:${p.page}`);
 assert.deepEqual(queued,expected);
 assert.equal(new Set(queued).size,queued.length);
 assert.deepEqual(inventory.queue.blocked.map(p=>`${p.book}:${p.page}`),['DMG:175','DMG:239','DMG:240']);
 assert.deepEqual(inventory.queue.blocked.map(p=>p.availability),['missing','unverified','unverified']);
});
test('crop pixels and scoped catalog checks never imply that a page or unrelated record is verified',()=>{
 const pixels=new Set(inventory.pages.filter(p=>p.suppliedCropPixels).map(p=>`${p.book}:${p.page}`));
 for(const key of ['PHB:35','PHB:37','PHB:38','UA:28'])assert.ok(pixels.has(key));
 const checks=inventory.pages.flatMap(p=>p.scopedCropChecks);
 assert.ok(checks.some(c=>c.state==='source-excerpt-checked'));
 assert.ok(checks.filter(c=>c.state==='source-excerpt-checked').every(c=>c.fields.length===0));
 assert.ok(checks.some(c=>c.state==='selected-values-checked'&&c.fields.length>0));
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

test('cited DMG end matter stays blocked as unverified rather than missing',()=>{
 const result=buildInventory({rules:[{id:'test-dmg-end',title:'End matter',book:'DMG',pages:[238,239,240]}]});
 const cited=result.records[0].pages;
 assert.deepEqual(cited.map(p=>[p.page,p.pdfPage,p.missing,p.availability]),[[238,238,false,'available'],[239,null,false,'unverified'],[240,null,false,'unverified']]);
 assert.deepEqual(result.queue.batches.flatMap(b=>b.pages),[238]);
 assert.deepEqual(result.queue.blocked.map(p=>[p.page,p.availability]),[[175,'missing'],[239,'unverified'],[240,'unverified']]);
});
