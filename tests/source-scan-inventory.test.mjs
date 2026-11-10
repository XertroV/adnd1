import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {buildInventory,BATCH_SIZE} from '../tools/source-scan-inventory.mjs';
import {beforeWeaponScanInventory,weaponOwnerIds} from './helpers/weapon-source-current-cohort.mjs';
import {assertUaSourceContextBindingCohort} from './helpers/ua-source-closed-v28-context.mjs';
import {readDmg175CurrentSourceInputs,assertDmg175CurrentSourceCohort} from './helpers/dmg175-source-current-cohort.mjs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url), citations=require('../dist/citations.js');
const root=resolve(import.meta.dirname,'..');
const currentRuleIds=JSON.parse(readFileSync(new URL('./fixtures/dmg175-source-current-cohort-v1.json',import.meta.url))).newRuleIds;
const isDmg175Rule=row=>row.collection==='rules'&&currentRuleIds.includes(row.id);
const ownerKey=row=>`${row.collection}:${row.id}`;
const boundedReferenceDeltaKeys=new Set(['rules:encounter-types','equipment:phb-hammer','equipment:phb-javelin','equipment:ua-harpoon']);
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url)));
const fixture=readFileSync(new URL('./fixtures/source-scan-inventory.json',import.meta.url),'utf8');
const inventory=buildInventory(data);
test('fixture is reproducible and includes every assembled reference-bearing record',()=>{
 assert.equal(JSON.stringify(inventory)+'\n',fixture);
 const expected=['rules','spells','equipment','matrices','classes'].flatMap(k=>data[k].filter(x=>citations.pages(x).length).map(x=>`${k}:${x.id}`));
 if(citations.pages(data.progressionExplainer).length)expected.push('progressionExplainer:progression-explainer');
 assert.deepEqual(inventory.records.map(r=>`${r.collection}:${r.id}`),expected);
 assert.equal(inventory.counts.records,expected.length);
 assertDmg175CurrentSourceCohort(readDmg175CurrentSourceInputs(root));
 const classBindings=data.classes.flatMap(owner=>(owner.references||[]).flatMap(reference=>reference.evidenceBindings||[]));
 assert.equal(assertUaSourceContextBindingCohort(classBindings).length,24,'all 24 exact UA class context references remain');
 const owners=['rules','spells','equipment','matrices','classes'].flatMap(collection=>data[collection]||[]).concat(data.progressionExplainer?[data.progressionExplainer]:[]);
 const expectedPages=owners.flatMap(item=>citations.pages(item));
 assert.equal(inventory.counts.recordPagePairs,expectedPages.length);
 assert.equal(inventory.counts.citedPages,new Set(expectedPages.map(page=>`${page.book}:${page.page}`)).size);

 const v27Bytes=execFileSync('git',['show','6717c6f22bbf2f2b421327e4c8561b1d81df00d4:tests/fixtures/source-scan-inventory.json'],{maxBuffer:20*1024*1024});
 assert.equal(createHash('sha256').update(v27Bytes).digest('hex'),'958a0aef30297a829329eb7b41d4b9119659ebf2c102ec422d9884b47ce5a6cd');
 const v27=JSON.parse(v27Bytes),uaPageAdditions={fighter:[13,26],ranger:[13,26],'ua-cavalier':[25,26],'ua-barbarian':[13,26],'ua-thief-acrobat':[13,22,26],'ua-paladin':[26],'ua-druid':[13,26]};
 assert.equal(v27.counts.recordPagePairs,2111);assert.equal(Object.values(uaPageAdditions).flat().length,14);
 assert.deepEqual(inventory.records.filter(isDmg175Rule).map(row=>row.id).sort(),[...currentRuleIds].sort(),'exact eleven current Appendix C rule owners enter source scan');
 assert.equal(inventory.records.filter(isDmg175Rule).reduce((sum,row)=>sum+row.pages.length,0),12,'the eleven owners contribute twelve owner/page pairs');
 assert.equal(inventory.counts.records,1014);assert.equal(inventory.counts.recordPagePairs,2111+14+12);assert.equal(inventory.counts.citedPages,232);assert.equal(inventory.counts.batches,25);
 const isUaClass=row=>row.collection==='classes'&&Object.hasOwn(uaPageAdditions,row.id);
 const expectedChangedKeys=[...Object.keys(uaPageAdditions).map(id=>`classes:${id}`),...boundedReferenceDeltaKeys].sort();
 const v27ByKey=new Map(v27.records.map(row=>[ownerKey(row),row]));
 const currentByKey=new Map(inventory.records.map(row=>[ownerKey(row),row]));
 const changedKeys=[...currentByKey.keys()].filter(key=>v27ByKey.has(key)&&JSON.stringify(currentByKey.get(key))!==JSON.stringify(v27ByKey.get(key))).sort();
 assert.deepEqual(changedKeys,expectedChangedKeys,'only seven UA source-phase class rows and four exact bounded current reference owners differ from immutable V27');
 const excludedHistoricalKeys=row=>isUaClass(row)||isDmg175Rule(row)||boundedReferenceDeltaKeys.has(ownerKey(row));
 assert.deepEqual(inventory.records.filter(row=>!excludedHistoricalKeys(row)),v27.records.filter(row=>!excludedHistoricalKeys(row)),'every otherwise unchanged V27 source-scan record object and its relative order remain exact');
 for(const [id,pages]of Object.entries(uaPageAdditions)){
  const current=inventory.records.find(row=>row.collection==='classes'&&row.id===id),old=v27.records.find(row=>row.collection==='classes'&&row.id===id);
  assert.deepEqual(current.pages.filter(page=>!old.pages.some(before=>before.book===page.book&&before.page===page.page)).map(page=>[page.book,page.page]),pages.map(page=>['UA',page]),`${id}: the exact approved new cited page pairs`);
 }
 const encounter= currentByKey.get('rules:encounter-types'), oldEncounter=v27ByKey.get('rules:encounter-types');
 assert.deepEqual(encounter.pages.map(({book,page})=>[book,page]),[['PHB',103],['DMG',175]]);
 assert.equal(oldEncounter.references.some(row=>row.path==='/references/1'&&row.book==='DMG'&&row.pages.includes(175)),false);
 assert.deepEqual(encounter.references.filter(row=>row.path==='/references/1'),[{path:'/references/1',book:'DMG',pages:[175],label:'DMG p. 175 · Character Subtable class-limit rows',status:'Additional bounded table context for the existing class-limit statement; table data are carried by the separate Character Subtable entry.'}]);
 const shortRangePath='/fieldSources/Hurled or missile weapon AC adjustments at short range (UA p.28)';
 for(const id of ['phb-hammer','phb-javelin','ua-harpoon']){
  const key=`equipment:${id}`,current=currentByKey.get(key),old= v27ByKey.get(key);
  assert.ok(current&&old,`${key}: current and immutable V27 row exist`);
  assert.deepEqual(current.pages.map(({book,page})=>[book,page]),old.pages.map(({book,page})=>[book,page]),`${key}: primary cited page pairs remain exact`);
  assert.equal(old.references.some(row=>row.path===shortRangePath),false,`${key}: V27 has no retrofitted short-range field paths`);
  assert.deepEqual(current.references.filter(row=>row.path===shortRangePath||row.path===`${shortRangePath}/evidenceBindings/0`).map(({path,book,pages})=>[path,book,pages]),[[shortRangePath,'UA',[28]],[`${shortRangePath}/evidenceBindings/0`,'UA',[28]]],`${key}: exactly two scoped source-field reference paths were added`);
 }
 const before=beforeWeaponScanInventory();
 const priorApprovedWeaponContextKey='rules:weapon-versus-armor-adjustments';
 assert.deepEqual(currentByKey.get(priorApprovedWeaponContextKey),v27ByKey.get(priorApprovedWeaponContextKey),'the already-approved DMG p.28 source-context row remains exact against immutable V27');
 const preWeaponExceptions=new Set([...boundedReferenceDeltaKeys,priorApprovedWeaponContextKey]);
 const weaponOwnerKeys=new Set(weaponOwnerIds.map(id=>`rules:${id}`));
 assert.deepEqual(inventory.records.filter(row=>!weaponOwnerKeys.has(ownerKey(row))&&!isUaClass(row)&&!isDmg175Rule(row)&&!preWeaponExceptions.has(ownerKey(row))),before.records.filter(row=>!isUaClass(row)&&!preWeaponExceptions.has(ownerKey(row))),'all other pre-weapon scan rows retain their exact record objects and order; only seven current UA class additions, four bounded current references and one previously approved V27 weapon-context owner are scoped out');
 assert.deepEqual(inventory.records.filter(row=>weaponOwnerIds.includes(row.id)).map(row=>[row.collection,row.id,row.pages.map(page=>[page.book,page.page])]),[['rules',weaponOwnerIds[0],[['PHB',36],['PHB',38]]],['rules',weaponOwnerIds[1],[['PHB',36],['UA',28]]]]);
 assert.equal(inventory.counts.knownGapPages,1);assert.equal(inventory.counts.pdfOmittedCitedPages,1);assert.equal(inventory.counts.supplementedCitedPages,1);assert.equal(inventory.counts.evidenceUnavailableCitedPages,0);assert.equal(inventory.counts.unverifiedPages,0);
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
test('queue covers available cited pages exactly once and blocks only the absent printed page',()=>{
 const queued=inventory.queue.batches.flatMap(b=>{assert.ok(b.pages.length>0&&b.pages.length<=BATCH_SIZE); return b.pages.map(page=>`${b.book}:${page}`)});
 const expected=inventory.pages.filter(p=>p.records.length&&p.availability==='available').map(p=>`${p.book}:${p.page}`);
 assert.deepEqual(queued,expected);
 assert.equal(new Set(queued).size,queued.length);
 assert.deepEqual(inventory.queue.blocked.map(p=>`${p.book}:${p.page}`),['DMG:175']);
 assert.deepEqual(inventory.queue.blocked.map(p=>p.availability),['missing']);
 assert.deepEqual(inventory.queue.blocked.map(p=>p.evidenceAvailability),['supplemental']);
});
test('crop pixels and scoped catalog checks never imply that a page or unrelated record is verified',()=>{
 const pixels=new Set(inventory.pages.filter(p=>p.suppliedCropPixels).map(p=>`${p.book}:${p.page}`));
 for(const key of ['PHB:35','PHB:37','PHB:38','UA:28'])assert.ok(pixels.has(key));
 const checks=inventory.pages.flatMap(p=>p.scopedCropChecks);
 assert.ok(checks.some(c=>c.state==='source-excerpt-checked'));
 assert.ok(checks.filter(c=>c.state==='source-excerpt-checked').every(c=>c.fields.length===0));
 assert.ok(checks.some(c=>c.state==='selected-values-checked'&&c.fields.length>0));
 const page=inventory.pages.find(p=>p.book==='PHB'&&p.page===35);
 assert.ok(page.scopedCropChecks.some(c=>c.itemId==='phb-dagger'&&c.regionId==='phb35-dagger-price'&&c.fields.includes('purchasePrice')));
 assert.ok(inventory.records.find(r=>r.id==='phb-dagger').references.some(r=>r.path==='/price'&&r.book==='PHB'&&r.pages.includes(35)));
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

test('unnumbered DMG PDF leaves are not synthesized as printed-page citations',()=>{
 const result=buildInventory({rules:[{id:'test-dmg-end',title:'End matter',book:'DMG',pages:[238,239,240]}]});
 const cited=result.records[0].pages;
 assert.deepEqual(cited.map(p=>[p.page,p.pdfPage,p.missing,p.availability]),[[238,238,false,'available']]);
 assert.deepEqual(result.pages.filter(p=>p.book==='DMG'&&(p.page===239||p.page===240)),[]);
 assert.deepEqual(result.queue.batches.flatMap(b=>b.pages),[238]);
 assert.deepEqual(result.queue.blocked.map(p=>[p.page,p.availability,p.evidenceAvailability]),[[175,'missing','supplemental']]);
});
