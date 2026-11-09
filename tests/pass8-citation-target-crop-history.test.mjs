import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {decodePass8CitationTargetCropHistory,projectPass8CitationTargetCropJson as project,projectPass8CitationTargetCropBytes as projectBytes,projectPass8XpContinuationJson as xp,projectPass8CharacterReferenceJson as character} from './helpers/pass8-citation-target-crop-history.mjs';
import {readBeforePass8WeaponSourceFile,readBeforePass8CitationTargetCropFile as readBefore} from './helpers/pass8-ua-source-history.mjs';
import {projectPass8PhbSourceJson as originalPhb} from './helpers/pass8-phb-source-history.mjs';
import {validateScanCatalog} from '../tools/scan-catalog.mjs';
import books from '../dist/books.js';
import {loadCurrentMonetarySourceQuestions} from '../tools/monetary-current-source-questions.mjs';
const root=new URL('../',import.meta.url),read=p=>readBeforePass8WeaponSourceFile(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(read(p));
const zipped=read('tests/fixtures/pass8-citation-target-crop-history-v1.json.gz'),contract=decodePass8CitationTargetCropHistory(zipped);
const git=(ref,p)=>execFileSync('git',['show',`${ref}:${p}`],{cwd:root,maxBuffer:100*1024*1024});

test('25 declared whole-file states restore exact4aa Git bytes and objects',()=>{
 assert.equal(Object.keys(contract.files).length,25);assert.equal(contract.sourcePaths.length,20);assert.equal(contract.metadataPaths.length,5);assert.deepEqual(contract.rawPaths,[]);
 for(const [path,stage] of Object.entries(contract.files)){
  const before=git(contract.beforeCommit,path),after=git(stage.afterCommit,path);assert.equal(sha(before),stage.beforeRawSha256);assert.equal(sha(after),stage.afterRawSha256);
  for(const bytes of [before,after]){assert.deepEqual(projectBytes(path,bytes),before,path);assert.deepEqual(project(path,JSON.parse(bytes)),JSON.parse(before),path);}
  assert.deepEqual(readBefore(new URL(path,root)),before,path);
 }
 assert.throws(()=>project('equipment.json',{}),/no citation-target\/crop history projection/);
});
test('every captured object and raw file rejects undeclared additions and whitespace',()=>{
 for(const [path,stage] of Object.entries(contract.files))for(const ref of [contract.beforeCommit,stage.afterCommit]){
  const bytes=git(ref,path),bad=JSON.parse(bytes);bad.unapprovedCitationCanary=true;
  assert.throws(()=>project(path,bad),/exact complete citation-target\/crop/);assert.throws(()=>projectBytes(path,Buffer.concat([bytes,Buffer.from(' ')])),/exact citation-target\/crop/);
 }
});
test('current owner, source, numeric, pixel and mixed-stage changes cannot enter any composed adapter',()=>{
 const path='dist/data.json',current=json(path),before=JSON.parse(git(contract.beforeCommit,path));
 for(const mutate of [v=>v.equipment[0].name+=' changed',v=>v.equipment.find(i=>i.id==='phb-light-crossbow').fieldSources['Encumbrance (DMG p.225)'].evidenceBindings[0].sourceOwner.itemId='phb-heavy-crossbow',v=>v.equipment.find(i=>i.id==='phb-light-crossbow').fields['Encumbrance (DMG p.225)']='999',v=>v.spells.find(i=>i.id==='phb-illusionist-shadow-magic').sourceExcerpts.regionReviews[0].imageSha256='0'.repeat(64),v=>v.release=before.release]){
  const bad=structuredClone(current);mutate(bad);for(const fn of [project,xp,character])assert.throws(()=>fn(path,bad));
 }
 assert.throws(()=>originalPhb(path,current),'the prior PHB stage stays closed to actualcf6');
 for(const path of ['research/field-evidence-bindings.json','dist/scans/verified/equipment-phb-thieves-tools.json']){const bad=json(path);bad.unapproved=true;for(const fn of [project,xp,character])assert.throws(()=>fn(path,bad));}
});
test('proxies, hidden/nonJSON values, accessors and sparse or cyclic inputs reject before hashing',()=>{
 for(const mutate of [v=>v.hidden=undefined,v=>v.hidden=NaN,v=>v.hidden=-0,v=>v[Symbol('hidden')]=true,v=>Object.defineProperty(v,'hidden',{value:1}),v=>Object.defineProperty(v,'hidden',{get(){throw Error('getter must not execute');},enumerable:true}),v=>v.self=v,v=>delete v.bindings[0],v=>v.bindings[0]=new Proxy(v.bindings[0],{})]){
  const bad=json('research/field-evidence-bindings.json');mutate(bad);for(const fn of [project,xp,character])assert.throws(()=>fn('research/field-evidence-bindings.json',bad));
 }
});
test('returned buffers and objects cannot poison caches or approve changed caller objects',()=>{
 const path='research/field-evidence-bindings.json',value=json(path),before=JSON.parse(git(contract.beforeCommit,path));const first=project(path,value);first.bindings.pop();assert.deepEqual(project(path,value),before);
 const bytes=projectBytes(path,read(path));bytes[0]^=1;assert.deepEqual(projectBytes(path,read(path)),git(contract.beforeCommit,path));value.bindings.pop();assert.throws(()=>project(path,value));
 const corrupt=Buffer.from(zipped);corrupt[40]^=1;assert.throws(()=>decodePass8CitationTargetCropHistory(corrupt),/exact closed citation-target\/crop/);
});
test('actual first schema failure remains reproducible and only three crop properties repair it',()=>{
 const fixture=JSON.parse(gunzipSync(read('tests/fixtures/pass8-last-six-catalog-schema-first-assembly-before-v1.json.gz')));assert.equal(fixture.exitCode,1);assert.match(fixture.log.utf8,/Invalid scan catalog contents for phb-illusionist-shadow-magic/);
 const before=new Map(fixture.files.filter(f=>f.path.startsWith('dist/scans/')).map(f=>[f.path,JSON.parse(f.utf8)])),data=json('dist/data.json'),proposal=json('research/source-audit-pass8-last-six-canonical-schema-successor-proposal-v1.json');assert.equal(before.size,7);
 for(const [path,cat] of before){const item=data.spells.find(i=>i.id===cat.itemId),after=json(path);assert.throws(()=>validateScanCatalog(cat,item,books,item.sourceExcerpts));assert.doesNotThrow(()=>validateScanCatalog(after,item,books,item.sourceExcerpts));const restored=structuredClone(after);for(const delta of proposal.regionDeltas.filter(d=>d.path===path)){const row=restored.regions.find(r=>r.id===delta.regionId);assert.equal(row.verification,'visually-checked-crop');assert.equal(row.verificationScope,'source-excerpt');assert.deepEqual(row.checkedFields,{});delete row.verification;delete row.verificationScope;delete row.checkedFields;}assert.deepEqual(restored,cat);}
});
test('actual four stale region-count failures require exactly four4-to6 descriptor changes',()=>{
 const fixture=JSON.parse(gunzipSync(read('tests/fixtures/pass8-dmg225-binding-region-count-first-assembly-before-v1.json.gz')));assert.equal(fixture.exitCode,1);assert.match(fixture.log.utf8,/Invalid scan catalog contents for phb-thieves-tools/);const old=JSON.parse(fixture.files.find(f=>f.path==='citation-overrides.json').utf8),after=json('citation-overrides.json'),restored=structuredClone(after),data=json('dist/data.json');
 for(const id of ['phb-bullseye-lantern','phb-silver-mirror','phb-iron-spike','phb-thieves-tools']){const a=old.sourceExcerpts['equipment:'+id],b=after.sourceExcerpts['equipment:'+id];assert.equal(a.regionCount,4);assert.equal(b.regionCount,6);const item=data.equipment.find(i=>i.id===id),cat=json('dist/'+b.catalog);assert.throws(()=>validateScanCatalog(cat,item,books,a));assert.doesNotThrow(()=>validateScanCatalog(cat,item,books,b));restored.sourceExcerpts['equipment:'+id].regionCount=4;}
 assert.deepEqual(restored,old);
});
test('monetary successor changes provenance only and retains all8/7/1 question boundaries',()=>{
 const before=json('research/source-audit-pass8-phb-current-monetary-source-questions-v1.json'),after=json('research/source-audit-pass8-citation-target-crop-current-monetary-source-questions-v1.json'),restored=structuredClone(after);assert.equal(after.citationTargetCropInputMigration.sourceInputCommit,contract.sourceCommit);delete restored.citationTargetCropInputMigration;for(const key of ['canonical','monetaryIndex']){assert.equal(after.currentInputs[key].sha256,sha(read(after.currentInputs[key].path)));restored.currentInputs[key]=before.currentInputs[key];}assert.deepEqual(restored,before);
 const report=loadCurrentMonetarySourceQuestions();assert.deepEqual(report.counts,{historicalRegisteredQuestions:8,currentUnresolvedQuestions:7,derivedAdjudications:1});assert.equal(report.semanticPass,false);assert.equal(report.generalSourceReviewPending,true);
});
