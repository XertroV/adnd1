// Preserved exact a29/MM assertions use historical data; the separate Source2 test below owns current data.
import {createRequire} from 'node:module';
import {readFileSync,assertHistoricalMmTestStage} from '../research/class-mapping-history-v1/mm-replay-fs-source2-v3.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {beforeWeaponData,weaponOwnerIds} from './helpers/weapon-search-baseline-source2-v1.mjs';
import {readMmTreasureCurrentSourceInputsSource2 as readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort,assertCurrentMmSourceEpochSource2} from './helpers/class-mapping-historical-mm-test-inputs-source2-v2.mjs';
import {readCurrentSource2TestCohort} from './helpers/class-mapping-current-test-cohort-source2-v1.mjs';
const hirelingRuleIds=JSON.parse(readFileSync(new URL('./fixtures/hirelings-source-current-cohort-v1.json',import.meta.url))).newRuleIds;
const hirelingRuleIdSet=new Set(hirelingRuleIds);
const mmTreasureRuleIds=JSON.parse(readFileSync(new URL('./fixtures/mm-treasure-current-m1-cohort-v1.json',import.meta.url))).mmSource.addedRuleIds;
const mmTreasureRuleIdSet=new Set(mmTreasureRuleIds);
const priorAppendixCRuleIds=JSON.parse(readFileSync(new URL('./fixtures/dmg175-source-current-cohort-v1.json',import.meta.url))).newRuleIds;
const require=createRequire(import.meta.url);
const search=require('../dist/search.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const books=require('../dist/books.js');
const ruleSearchDocs=data.rules.map(item=>search.prepare({...item,_view:'rules',_title:item.title||'',_subtitle:`${item.category||'Rule'} · ${books.code(item.book)}`,_bookName:books.title(item.book)}));
const classDocs=data.classes.map(item=>search.prepare({...item,_view:'classes',_title:item.name,_subtitle:`Class & advancement · ${item.book}`}));
const addedDmg74MatrixIds=[
 'dmg-cleric-druid-monk-attack-matrix',
 'dmg-magic-user-illusionist-attack-matrix',
 'dmg-thief-assassin-attack-matrix',
];
const matrixDocs=data.matrices.map(item=>{
 const relatedId=item.sourceConflict?.relatedClassGuideId;
 const guide=data.classes.find(candidate=>candidate.id===relatedId);
 const guideName=guide?.name||guide?.title||guide?.id;
 return search.prepare({...item,_view:'matrices',_title:item.title,_subtitle:`${item.book} · Combat matrix`,_sourceConflictClassGuideLabel:guide&&guideName?`Open ${guideName} class guide`:''});
});
const progressionDoc=search.prepare({...data.progressionExplainer,_view:'progressionExplainer',_title:data.progressionExplainer.title,_subtitle:'Class progression reference'});
const byClass=id=>classDocs.find(item=>item.id===id);
const searchRuleIds=query=>new Set(ruleSearchDocs.filter(item=>Number.isFinite(search.score(item,query))).map(item=>item.id));

test('current global content owner set preserves prior docs and appends the exact weapon, Appendix C, H, and MM owners',()=>{
 const historicalInputs=readMmTreasureCurrentSourceInputs();
 assertMmTreasureCurrentSourceCohort(historicalInputs);
 assert.deepEqual(data,historicalInputs.data,'the unchanged predecessor assertions consume the exact historical-MM body');
 const count=data.spells.length+data.rules.length+data.equipment.length+data.classes.length+data.matrices.length+1;
 const newMatrixIds=data.matrices.filter(item=>addedDmg74MatrixIds.includes(item.id)).map(item=>item.id).sort();
 assert.deepEqual(newMatrixIds,[...addedDmg74MatrixIds].sort());
 assert.equal(count,997+addedDmg74MatrixIds.length+1+weaponOwnerIds.length+priorAppendixCRuleIds.length+hirelingRuleIds.length+mmTreasureRuleIds.length);
 assert.equal(count,1064,'the 1001-owner baseline, prior weapon and Appendix C additions, 48 H owners, and2 MM owners remain distinct');
 assert.deepEqual(data.rules.filter(row=>row.id==='phb-druid-mistletoe-spell-components').map(row=>[row.id,row.book,row.pages]),[['phb-druid-mistletoe-spell-components','PHB',[54]]]);
 const identities=[...['spells','rules','equipment','classes','matrices'].flatMap(collection=>data[collection].map(item=>`${collection}:${item.id}`)),`progressionExplainer:${data.progressionExplainer.id}`];
 assert.equal(new Set(identities).size,997+addedDmg74MatrixIds.length+1+weaponOwnerIds.length+priorAppendixCRuleIds.length+hirelingRuleIds.length+mmTreasureRuleIds.length);
 assert.equal(new Set(identities).size,1064);
 const addedOwnerKeys=new Set([...weaponOwnerIds,...priorAppendixCRuleIds,...hirelingRuleIds,...mmTreasureRuleIds].map(id=>`rules:${id}`));
 const beforeIds=['spells','rules','equipment','classes','matrices'].flatMap(collection=>beforeWeaponData[collection].map(item=>`${collection}:${item.id}`)).concat(`progressionExplainer:${beforeWeaponData.progressionExplainer.id}`);
 assert.deepEqual(identities.filter(id=>!addedOwnerKeys.has(id)),beforeIds,'all prior owner identities remain in relative order after the exact additions');
 assert.equal(matrixDocs.length,data.matrices.length);
});

test('Hireling tables and procedures are discoverable through the compiled rule search index',()=>{
 const cases=[
  ['cleric follower types','dmg-hireling-table-t01'],
  ['henchman search methods effectiveness','dmg-hireling-table-t24'],
  ['loyalty check situations morale','dmg-hireling-table-t26'],
  ['loyalty modifiers situation','dmg-hireling-table-t38'],
  ['followers stronghold','dmg-hireling-procedure-u01'],
  ['ranger follower count reroll category','dmg-hireling-procedure-u04'],
  ['spy discovery precautions','dmg-hireling-procedure-u10'],
 ];
 for(const [query,itemId]of cases){
  assert.ok(hirelingRuleIdSet.has(itemId),`${itemId}: H-current fixture owner required`);
  assert.ok(searchRuleIds(query).has(itemId),`${itemId}: authored owner text remains discoverable for ${query}`);
 }
});

test('MM Treasure Types lookup and procedure terms are discoverable through the compiled rule search index',()=>{
 assert.ok(mmTreasureRuleIdSet.has('mm-treasure-types-table'));
 assert.ok(mmTreasureRuleIdSet.has('mm-treasure-type-use'));
 assert.ok(searchRuleIds('Treasure Type A').has('mm-treasure-types-table'));
 assert.ok(searchRuleIds('lair status').has('mm-treasure-type-use'));
});

test('class note fields and every existing pending mechanics value remain searchable',()=>{
 const monk=data.classes.find(item=>item.id==='monk');
 const acrobat=data.classes.find(item=>item.id==='ua-thief-acrobat');
 assert.ok(Number.isFinite(search.score(byClass('monk'),'Confirm which table the campaign uses')));
 assert.ok(Number.isFinite(search.score(byClass('ua-thief-acrobat'),'categorical freeze')));
 for(const item of data.classes)for(const candidate of item.pendingMechanics||[])assert.ok(byClass(item.id)._search.includes(search.normalize(candidate)),`${item.id}: ${candidate}`);
 assert.equal(data.classes.reduce((sum,item)=>sum+(item.pendingMechanics||[]).length,0),69);
 assert.ok(monk.pendingMechanics.includes(monk.attackTableNote));
});

test('only the observed authored note fields are projected; future review-note names stay private',()=>{
 const synthetic=search.prepare({_view:'classes',_title:'Note projection boundary',attackTableNote:'Visible attack table note canary',retainedSkillsNote:'Visible retained skills note canary',priceNote:'Visible public price note canary',xpNote:'Visible XP note canary',privateReviewNote:'private review note canary',sourceProvenanceNote:'source provenance note canary'});
 for(const query of ['visible attack table note','visible retained skills note','visible public price note','visible xp note'])assert.ok(Number.isFinite(search.score(synthetic,query)),`${query} remains searchable`);
 for(const query of ['private review note canary','source provenance note canary'])assert.equal(search.score(synthetic,query),Infinity,`${query} stays excluded`);
 const publicPriceNotes=data.equipment.filter(item=>typeof item.priceNote==='string'&&item.priceNote.trim());
 assert.equal(publicPriceNotes.length,49);
 for(const item of publicPriceNotes){const prepared=search.prepare({...item,_view:'equipment',_title:item.name});assert.ok(prepared._search.includes(search.normalize(item.priceNote)),`${item.id} visible public priceNote remains searchable`);}
});

test('displayed XP level, threshold, label and track values are searchable without audit metadata',()=>{
 const magicUser=byClass('magic-user');
 assert.ok(Number.isFinite(search.score(magicUser,'1875001')));
 assert.ok(Number.isFinite(search.score(magicUser,'level 15')));
 assert.doesNotMatch(magicUser._search,/field-target-pending|not-assessed-by-field-target-review|sourceOwner|sourceSha256/i);
 assert.equal(search.score(magicUser,'not-assessed-by-field-target-review'),Infinity);
});

test('XP thresholds accept both raw integer and displayed thousands separators',()=>{
 const magicUser=byClass('magic-user');
 for(const query of ['1875001','1,875,001','1 875 001'])assert.ok(Number.isFinite(search.score(magicUser,query)),query);
 assert.equal(search.score(magicUser,'source provenance note canary'),Infinity);
});

test('matrix and progression auxiliary records search authored content under their own types',()=>{
 assert.ok(Number.isFinite(search.score(matrixDocs[0],'fighters paladins rangers related attackers')));
 assert.ok(Number.isFinite(search.score(matrixDocs[0],'repeated 20s natural 20 option')));
 assert.ok(Number.isFinite(search.score(progressionDoc,'navigation gloss')));
 assert.ok(Number.isFinite(search.score(progressionDoc,'The Character With Two Classes')));
 assert.doesNotMatch(matrixDocs[0]._search,/field-target-pending|not-assessed-by-field-target-review|7052949697a009/i);
 assert.doesNotMatch(progressionDoc._search,/field-target-pending|not-assessed-by-field-target-review|sourceOwner/i);
 assert.equal(search.score(matrixDocs[0],'not-assessed-by-field-target-review'),Infinity);
});

test('matrix source-conflict prose and the validated Monk class-guide link are searchable without arbitrary metadata',()=>{
 const monkMatrix=matrixDocs.find(item=>item.id==='dmg-cleric-druid-monk-attack-matrix');
 assert.ok(monkMatrix);
 for(const query of [
  'Recorded source conflict',
  'Monk attack matrix',
  'PHB printed p. 30',
  'DMG printed p. 74 clerics druids',
  'Unresolved source conflict this DMG table does not adjudicate or reconcile it',
  'Open Monk class guide',
 ])assert.ok(Number.isFinite(search.score(monkMatrix,query)),`visible conflict text is searchable: ${query}`);
 const privateMetadata=search.prepare({...monkMatrix,sourceConflict:{...monkMatrix.sourceConflict,privateReviewNote:'private conflict review canary',internalRuling:'private conflict decision canary'}});
 assert.equal(search.score(privateMetadata,'private conflict review canary'),Infinity);
 assert.equal(search.score(privateMetadata,'private conflict decision canary'),Infinity);
 const unresolvedGuide=search.prepare({...monkMatrix,_sourceConflictClassGuideLabel:''});
 assert.equal(search.score(unresolvedGuide,'Open Monk class guide'),Infinity,'a class-guide link label is indexed only when its ID resolves to a current class record');
});




test('Source2 current data drives the compiled site-search rule lookup',()=>{
 const source2=readCurrentSource2TestCohort();
 const currentData=source2.inputs.data;
 assert.equal(source2.currentSource2Identity.stage,'source2-body-native');
 assert.equal(source2.currentSource2Identity.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(source2.currentSource2Identity.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
 assert.equal(source2.currentSource2Identity.owners,1070);
 assert.equal(Object.keys(source2.inputHashes.sourceBody).length,3063);
 assert.equal(source2.inputHashes.sourceBody['dist/app.js'],'57eae6b440f2b75294ca6021adbcd9e29a43646a7a6177cc6800973b94f0b8c1');
 const currentOwners=['rules','spells','equipment','classes','matrices'].flatMap(key=>currentData[key]).concat(currentData.progressionExplainer);
 assert.equal(currentOwners.length,1070);
 assert.equal(new Set(currentOwners.flatMap(item=>['sourceExcerpts','scanVerification'].flatMap(key=>item[key]?.catalog?[item[key].catalog]:[]))).size,1090);
 const historical=assertCurrentMmSourceEpochSource2(),stage=assertHistoricalMmTestStage();
 assert.equal(historical.summary.sourceCommit,'0f2d70a135e3ad486152bf00f21387d60a1a97ef');
 assert.equal(historical.summary.sourceTree,'08010faf457df22cdb0a5ec35d2dcf79e622ade9');
 assert.equal(historical.summary.owners,1064);
 assert.equal(historical.inputs.rawInputs['dist/data.json'],'2ab84cfe5e4234e5d0303b2062f941f7d8e1b93d798a7402c16e78d6d2e4672c');
 assert.deepEqual(historical.currentSource2Summary,source2.currentSource2Identity);
 assert.deepEqual(stage.currentSource2Summary,source2.currentSource2Identity);
 assert.notDeepEqual(currentData,historical.inputs.data);
 assert.throws(()=>assertMmTreasureCurrentSourceCohort({...historical.inputs,data:currentData}),/Exact historical-MM whole-source body required/,'current Source2 data cannot enter the historical-MM input role');
 assert.equal(source2.inputHashes.sourceBody['dist/data.json'],'16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573');
 const currentRuleDocs=currentData.rules.map(item=>search.prepare({...item,_view:'rules',_title:item.title||'',_subtitle:`${item.category||'Rule'} · ${books.code(item.book)}`,_bookName:books.title(item.book)}));
 const currentRuleIds=query=>new Set(currentRuleDocs.filter(item=>Number.isFinite(search.score(item,query))).map(item=>item.id));
 assert.ok(currentData.rules.some(item=>item.id==='mm-treasure-types-table'));
 assert.ok(currentRuleIds('Treasure Type A').has('mm-treasure-types-table'));
 assert.ok(currentRuleIds('pieces per individual').has('mm-treasure-types-table'));
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
