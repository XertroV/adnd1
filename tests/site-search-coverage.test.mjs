// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import {createRequire} from 'node:module';
import {readFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {beforeWeaponData,weaponOwnerIds} from './helpers/weapon-source-current-cohort.mjs';
import {readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort} from './helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
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
 assertMmTreasureCurrentSourceCohort(readMmTreasureCurrentSourceInputs(root));
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
