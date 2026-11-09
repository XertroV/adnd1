import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {canonical,regionHashes} from '../../../tools/source-visual-coverage.mjs';
import {validateScanCatalog} from '../../../tools/scan-catalog.mjs';
import {validateContinuationManifest} from '../../../tools/continuation-contract.mjs';
import {isDeepStrictEqual} from 'node:util';
const here=path.dirname(new URL(import.meta.url).pathname),root=path.resolve(here,'../../..');
const require=createRequire(import.meta.url),books=require('../../../dist/books.js');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=p=>readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const hashFile=p=>sha(read(p));
const oldJson=p=>JSON.parse(execFileSync('git',['show',`HEAD:${p}`],{cwd:root,maxBuffer:32*1024*1024}));
const equal=(a,b,msg)=>assert.ok(isDeepStrictEqual(a,b),msg);
const receipt=json('research/missile-table-discoverability/authored-activation-cc950-v1/authored-activation-receipt-v1.json');
const ruleDoc=json('rules.json'),baseRuleDoc=oldJson('rules.json');
assert.equal(ruleDoc.rules.length,152);assert.equal(baseRuleDoc.rules.length,150);
for(let i=0;i<baseRuleDoc.rules.length;i++){
 const active=structuredClone(ruleDoc.rules[i]),prior=baseRuleDoc.rules[i];
 if(active.id==='weapon-versus-armor-adjustments')delete active.sourceContext;
 equal(active,prior,`preexisting rule changed: ${prior.id}`);
}
const candidateOwners=json('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/rules-records-candidate-final-v4.json').records;
for(const candidate of candidateOwners)equal(ruleDoc.rules.find(r=>r.id===candidate.id),candidate,`active owner changed: ${candidate.id}`);
const oldDmg=baseRuleDoc.rules.find(r=>r.id==='weapon-versus-armor-adjustments');
const activeDmg=ruleDoc.rules.find(r=>r.id==='weapon-versus-armor-adjustments');
const withoutContext=structuredClone(activeDmg);delete withoutContext.sourceContext;equal(withoutContext,oldDmg,'old DMG rule changed outside the sourceContext property');
assert.deepEqual(activeDmg.sourceContext,{book:'DMG',printedPage:28,regionId:'dmg-28-opening-8b67aa025e19eddd'});

const overrides=json('citation-overrides.json'),baseOverrides=oldJson('citation-overrides.json');
equal(overrides.items,baseOverrides.items,'citation items changed');equal(overrides.priceStates,baseOverrides.priceStates,'price states changed');
const expectedOverrides=new Set(['rules:phb-hurled-weapons-and-missiles-table','rules:ua-hurled-weapons-and-missiles-table']);
for(const [key,value] of Object.entries(baseOverrides.sourceExcerpts)){
 if(key==='rules:weapon-versus-armor-adjustments'){
  const expected=structuredClone(value);expected.regionCount=3;expected.scope=overrides.sourceExcerpts[key].scope;const actual=structuredClone(overrides.sourceExcerpts[key]);actual.scope=expected.scope;equal(actual,expected,'DMG source excerpt override changed beyond regionCount/scope');
 }else equal(overrides.sourceExcerpts[key],value,`unrelated source excerpt changed: ${key}`);
}
for(const id of expectedOverrides){assert(!Object.hasOwn(baseOverrides.sourceExcerpts,id));assert.equal(overrides.sourceExcerpts[id].collection,'rules');assert.equal(overrides.sourceExcerpts[id].state,'source-excerpt-checked');}
assert.equal(overrides.sourceExcerpts['rules:weapon-versus-armor-adjustments'].regionCount,3);

const catPaths=[
 'dist/scans/verified/rules-phb-hurled-weapons-and-missiles-table.json',
 'dist/scans/verified/rules-ua-hurled-weapons-and-missiles-table.json',
 'dist/scans/verified/rules-weapon-versus-armor-adjustments.json',
];
const catalogs=catPaths.map(p=>json(p));
for(const [catalog,itemId] of [[catalogs[0],candidateOwners[0].id],[catalogs[1],candidateOwners[1].id],[catalogs[2],'weapon-versus-armor-adjustments']])
 validateScanCatalog(catalog,{id:itemId},books,{collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${itemId}.json`,regionCount:catalog.regions.length});
const baseDmgCatalog=oldJson('dist/scans/verified/rules-weapon-versus-armor-adjustments.json');
equal(catalogs[2].regions[0],baseDmgCatalog.regions[0],'unchanged legacy DMG region object changed');
assert.equal(catalogs[2].regions.length,3);
for(const catalog of catalogs)for(const region of catalog.regions)assert.equal(hashFile(`dist/scans/verified/${region.image}`),region.sha256,`image bytes changed: ${region.image}`);

const continuationDoc=json('research/citation-continuations.json'),baseContinuation=oldJson('research/citation-continuations.json');
equal(continuationDoc.groups.slice(0,baseContinuation.groups.length),baseContinuation.groups,'prior continuation group prefix changed');
assert.equal(continuationDoc.groups.length,baseContinuation.groups.length+1);
const group=continuationDoc.groups.at(-1);assert.equal(group.id,'dmg28-weapon-versus-armor-complete-note');
const data={rules:ruleDoc.rules};
for(const item of data.rules){const source=overrides.sourceExcerpts[`rules:${item.id}`];if(source)item.sourceExcerpts=source;}
const continuationValidation=validateContinuationManifest({schemaVersion:1,groups:[group]},{data,catalogRoot:path.join(root,'dist')});
assert.deepEqual(continuationValidation,{groups:1,segments:2,presentSegments:2,blockedSegments:0,regressionBindings:0,statusCounts:{'segments-present-pending-deployment':1}});

const ledger=json('research/source-visual-reviews.json'),baseLedger=oldJson('research/source-visual-reviews.json');
equal(ledger.reviews.slice(0,baseLedger.reviews.length),baseLedger.reviews,'prior manual visual reviews changed');
assert.equal(ledger.reviews.length,baseLedger.reviews.length+4);
const added=ledger.reviews.slice(baseLedger.reviews.length);
assert.deepEqual(added.map(r=>[r.itemId,r.regionId]),[
 ['phb-hurled-weapons-and-missiles-table','phb38-table-context'],
 ['ua-hurled-weapons-and-missiles-table','ua28-table-context'],
 ['weapon-versus-armor-adjustments','dmg-28-opening-8b67aa025e19eddd'],
 ['weapon-versus-armor-adjustments','dmg-28-c37135485e89a720'],
]);
for(const r of added){const catalog=catalogs.find(c=>c.itemId===r.itemId);const region=catalog.regions.find(x=>x.id===r.regionId);assert(region);assert.equal(r.imageSha256,region.sha256);assert.deepEqual({focusSha256:r.focusSha256,contentSha256:r.contentSha256},regionHashes(region));assert.equal(r.sourceSha256,books.resolveRegionSourceIdentity(catalog,region).sourceSha256);}

let bindingCount=0;
const countBindings=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const item of value)countBindings(item);return;}if(Array.isArray(value.evidenceBindings))bindingCount+=value.evidenceBindings.length;for(const child of Object.values(value))countBindings(child);};
for(const owner of candidateOwners)countBindings(owner);
assert.equal(bindingCount,50);
for(const owner of candidateOwners){
 for(const row of owner.table.rows)for(const cell of row.cells||[])for(const binding of cell.evidenceBindings||[]){assert.equal(binding.reviewStatus,'field-target-pending');assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');}
}
for(const p of ['dist/data.json','dist/source-continuations.json'])assert.equal(hashFile(p),receipt.preservation[p==='dist/data.json'?'distDataSha256After':'distSourceContinuationsSha256After']);
assert.equal(hashFile('dist/search.js'),receipt.base.preActivationHashes['dist/search.js']);
assert.equal(hashFile('dist/source-viewer.js'),receipt.base.preActivationHashes['dist/source-viewer.js']);
assert.equal(hashFile('tests/search-ranking.browser.mjs'),receipt.base.preActivationHashes['tests/search-ranking.browser.mjs']);

const output={schemaVersion:1,artifactType:'missile-table-authored-activation-validation-v1',baseCommit:'cc9509047746d5e27a71cb5b1e0cfcb739a688c9',activationReceiptSha256:hashFile('research/missile-table-discoverability/authored-activation-cc950-v1/authored-activation-receipt-v1.json'),checks:{rulesOldPrefix:150,appendedOwners:2,dmgChangedPropertyCount:1,citationUnrelatedItemsAndPriceStatesDeepEqual:true,priorCitationSourceExcerptsDeepEqualExceptDmgRegionCountAndScope:true,officialCatalogValidation:{catalogs:3,regions:55,legacyDmgRowPreserved:true,allImageBytesMatch:true},continuationValidation,priorContinuationGroupsUnchanged:baseContinuation.groups.length,manualReviewsAdded:added.length,priorManualReviewPrefixUnchanged:true,evidenceBindings:bindingCount,fieldTargetPending:50,sourceValuesNotAssessed:50,compiledDistDataUnchanged:true,compiledContinuationProjectionUnchanged:true,searchViewerAndBrowserTestSourceDeltaPreserved:true},hashes:{rules:hashFile('rules.json'),citationOverrides:hashFile('citation-overrides.json'),continuations:hashFile('research/citation-continuations.json'),visualReviews:hashFile('research/source-visual-reviews.json'),app:hashFile('dist/app.js'),catalogs:Object.fromEntries(catPaths.map(p=>[p,hashFile(p)])),limitedImage:hashFile('dist/scans/verified/dmg-28-c37135485e89a720.png'),distData:hashFile('dist/data.json'),distContinuations:hashFile('dist/source-continuations.json')}};
const outPath='research/missile-table-discoverability/authored-activation-cc950-v1/official-source-activation-validation-v1.json';
writeFileSync(path.join(root,outPath),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({valid:true,output:outPath,checks:output.checks,hashes:output.hashes},null,2));
