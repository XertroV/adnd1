// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-source2-v3.mjs';
import {createRequire} from 'node:module';
import {buildInventory,BATCH_SIZE} from '../research/class-mapping-history-v1/replay-tools/source-scan-inventory-historical-mm-source2-v3.mjs';
import {beforeWeaponScanInventory,weaponOwnerIds} from './helpers/weapon-source-current-cohort.mjs';
import {assertUaSourceContextBindingCohort} from './helpers/ua-source-closed-v28-context.mjs';
import {readMmTreasureCurrentSourceInputsSource2 as readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort} from './helpers/class-mapping-historical-mm-test-inputs-source2-v2.mjs';
import {resolve} from 'node:path';
import {execFileSync} from '../research/class-mapping-history-v1/mm-replay-child-process-source2-v5.mjs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url), citations=require('../dist/citations.js');
const root=resolve(import.meta.dirname,'..');
const currentRuleIds=[
 ...JSON.parse(readFileSync(new URL('./fixtures/hirelings-source-current-cohort-v1.json',import.meta.url))).newRuleIds,
 ...JSON.parse(readFileSync(new URL('./fixtures/mm-treasure-current-m1-cohort-v1.json',import.meta.url))).mmSource.addedRuleIds,
];
const priorDmg175RuleIds=JSON.parse(readFileSync(new URL('./fixtures/dmg175-source-current-cohort-v1.json',import.meta.url))).newRuleIds;
const isHirelingRule=row=>row.collection==='rules'&&currentRuleIds.includes(row.id);
const isPriorDmg175Rule=row=>row.collection==='rules'&&priorDmg175RuleIds.includes(row.id);
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
 assertMmTreasureCurrentSourceCohort(readMmTreasureCurrentSourceInputs());
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
 assert.deepEqual(inventory.records.filter(isHirelingRule).map(row=>row.id).sort(),[...currentRuleIds].sort(),'the exact 48 H plus2 MM current rule owners enter source scan');
 assert.equal(inventory.records.filter(isHirelingRule).reduce((sum,row)=>sum+row.pages.length,0),86,'the 48 H owners contribute79 pairs and the two MM owners contribute7 more');
 assert.deepEqual(inventory.records.filter(isPriorDmg175Rule).map(row=>row.id).sort(),[...priorDmg175RuleIds].sort(),'the eleven prior Appendix C owners remain in the current scan');
 assert.equal(inventory.records.filter(isPriorDmg175Rule).reduce((sum,row)=>sum+row.pages.length,0),12,'the prior Appendix C owners contribute twelve owner/page pairs');
 assert.equal(inventory.counts.records,1064);assert.equal(inventory.counts.recordPagePairs,2111+14+12+86);assert.equal(inventory.counts.citedPages,246);assert.equal(inventory.counts.batches,26);
 const isUaClass=row=>row.collection==='classes'&&Object.hasOwn(uaPageAdditions,row.id);
 const expectedChangedKeys=[...Object.keys(uaPageAdditions).map(id=>`classes:${id}`),...boundedReferenceDeltaKeys].sort();
 const v27ByKey=new Map(v27.records.map(row=>[ownerKey(row),row]));
 const currentByKey=new Map(inventory.records.map(row=>[ownerKey(row),row]));
 const changedKeys=[...currentByKey.keys()].filter(key=>v27ByKey.has(key)&&JSON.stringify(currentByKey.get(key))!==JSON.stringify(v27ByKey.get(key))).sort();
 assert.deepEqual(changedKeys,expectedChangedKeys,'only seven UA source-phase class rows and four exact bounded current reference owners differ from immutable V27');
 const excludedHistoricalKeys=row=>isUaClass(row)||isPriorDmg175Rule(row)||isHirelingRule(row)||boundedReferenceDeltaKeys.has(ownerKey(row));
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
 assert.deepEqual(inventory.records.filter(row=>!weaponOwnerKeys.has(ownerKey(row))&&!isUaClass(row)&&!isPriorDmg175Rule(row)&&!isHirelingRule(row)&&!preWeaponExceptions.has(ownerKey(row))),before.records.filter(row=>!isUaClass(row)&&!preWeaponExceptions.has(ownerKey(row))),'all other pre-weapon scan rows retain their exact record objects and order; only seven current UA class additions, four bounded current references and one previously approved V27 weapon-context owner are scoped out');
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



import {buildCurrentSource2Inventory} from '../research/class-mapping-history-v1/replay-tools/source-scan-inventory-source2-v3.mjs';
import {readCurrentSource2TestCohort} from './helpers/class-mapping-current-test-cohort-source2-v1.mjs';
test('Source2 current data and all1090 catalogs are inventoried under the actual closed reader proof',()=>{
 const source2=readCurrentSource2TestCohort(),report=buildCurrentSource2Inventory(),currentInventory=report.inventory,currentData=source2.inputs.data;
 assert.deepEqual(report.currentSource2Summary,source2.currentSource2Identity);
 assert.deepEqual(report.inputHashes,source2.inputHashes);
 assert.equal(report.currentSource2Summary.stage,'source2-body-native');
 assert.equal(report.currentSource2Summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(report.currentSource2Summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
 assert.equal(report.currentSource2Summary.owners,1070);
 assert.equal(Object.keys(report.inputHashes.sourceBody).length,3063);
 assert.equal(report.inputHashes.sourceBody['dist/data.json'],'16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573');
 assert.equal(Object.hasOwn(report.inputHashes.sourceBody,'dist/citations.js'),false,'citations code keeps its separately typed B/T authority');
 assert.equal(report.catalogClosure.catalogJsonRows,1090);
 const owners=['rules','spells','equipment','matrices','classes'].flatMap(collection=>(currentData[collection]||[]).map(item=>({collection,item})));
 if(currentData.progressionExplainer)owners.push({collection:'progressionExplainer',item:currentData.progressionExplainer});
 assert.equal(owners.length,1070);
 const expectedRecords=owners.filter(({item})=>citations.pages(item).length).map(({collection,item})=>`${collection}:${item.id||'progression-explainer'}`);
 assert.deepEqual(currentInventory.records.map(row=>`${row.collection}:${row.id}`),expectedRecords);
 const expectedPagePairs=owners.flatMap(({item})=>citations.pages(item));
 assert.equal(currentInventory.counts.records,1070);assert.equal(currentInventory.counts.recordPagePairs,2232);
 assert.equal(currentInventory.counts.recordPagePairs,expectedPagePairs.length);
 assert.equal(currentInventory.counts.citedPages,new Set(expectedPagePairs.map(page=>`${page.book}:${page.page}`)).size);
 assert.equal(currentInventory.counts.citedPages,246);assert.equal(currentInventory.counts.batches,26);
 const currentCatalogs=new Set(owners.map(({item})=>item.sourceExcerpts||item.scanVerification).filter(v=>['selected-values-checked','source-excerpt-checked'].includes(v?.state)).map(v=>`dist/${v.catalog}`));
 assert.equal(report.catalogClosure.referencedCatalogRows,currentCatalogs.size);
 const citedCode=report.separateCodeAuthorities.find(pin=>pin.path==='dist/citations.js');
 assert.equal(citedCode.sha256,'63e1667cd93c773e950bf6c53d8cf56e6beb29490278cecdeeb952cfa2663032');assert.equal(citedCode.sizeBytes,8056);
 assert.deepEqual(citedCode.stages.map(({commit,tree,path})=>({commit,tree,path})),[
  {commit:'400f6e9d123d8a654b9b9af48133a2533506e73d',tree:'664c02504efcece25669d2f9c3fdb26437cd5b09',path:'dist/citations.js'},
  {commit:'343ab90610a224786b4ce64c3e9e2ba928a3d6c8',tree:'af9f440cd871dc4285c2660149de39da87385b26',path:'dist/citations.js'},
  {commit:'a29d72d5147c497addd9e46f54ea3f8222f6e9c2',tree:'da1c64ea25f178a1155a79c4692964e9b17dd645',path:'dist/citations.js'},
 ]);
 for(const record of currentInventory.records){
  const paths=new Set(record.references.flatMap(ref=>ref.pages.map(page=>`${ref.book}:${page}`))),collected=new Set(record.pages.map(ref=>`${ref.book}:${ref.page}`));
  assert.deepEqual([...paths].sort(),[...collected].sort(),`${record.collection}:${record.id}: current nested paths retain collector identity`);
 }
 const queued=currentInventory.queue.batches.flatMap(batch=>{assert.ok(batch.pages.length>0&&batch.pages.length<=BATCH_SIZE);return batch.pages.map(page=>`${batch.book}:${page}`)});
 assert.deepEqual(queued,currentInventory.pages.filter(page=>page.records.length&&page.availability==='available').map(page=>`${page.book}:${page.page}`));
 assert.equal(new Set(queued).size,queued.length);
 assert.deepEqual(currentInventory.queue.blocked.map(page=>[page.book,page.page,page.availability,page.evidenceAvailability]),[['DMG',175,'missing','supplemental']]);
 assert.equal(currentInventory.counts.knownGapPages,1);assert.equal(currentInventory.counts.pdfOmittedCitedPages,1);assert.equal(currentInventory.counts.supplementedCitedPages,1);assert.equal(currentInventory.counts.evidenceUnavailableCitedPages,0);assert.equal(currentInventory.counts.unverifiedPages,0);
 assert.ok(currentInventory.pages.every(page=>!Object.hasOwn(page,'verified')));
 assert.ok(currentInventory.pages.filter(page=>!page.suppliedCropPixels).every(page=>page.scopedCropChecks.length===0));
 const checks=currentInventory.pages.flatMap(page=>page.scopedCropChecks);
 assert.ok(checks.some(check=>check.state==='source-excerpt-checked'));assert.ok(checks.filter(check=>check.state==='source-excerpt-checked').every(check=>check.fields.length===0));
 assert.ok(checks.some(check=>check.state==='selected-values-checked'&&check.fields.length>0));
});

// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
