import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {auditInlineProducerSites,auditRouteQueryContract,auditSourceNavigationAttributes} from '../tools/citation-navigation-coverage.mjs';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const require=createRequire(import.meta.url);
const citations=require('../dist/citations.js');
const before=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/citation-navigation-unclassified-producers-before.json.gz',import.meta.url))));

test('citation navigation inventory captures all current chip producer classes and sites',()=>{
 const inventory=auditInlineProducerSites(app);
 assert.equal(inventory.sites.length,22);
 assert.equal(inventory.classes.length,15);
 assert.deepEqual(inventory.classes,[
  'class-abilities-table-record','class-advancement','class-progression-reference','class-xp-table','dynamic-xp-result',
  'equipment-estimate-comparison','equipment-related-reference','field-attribute-layout',
  'fighter-matrix-reference','hireling-pending-pdf-bullet-field-reference','matrix-detail-reference','progression-explainer-detail-reference','progression-explainer-reference','rule-bullet-field-reference','source-table-fact-reference'
 ]);
});

test('the HIRED pending PDF bullet producer has its own field-reference class',()=>{
 const sites=auditInlineProducerSites(app).sites.filter(site=>site.function==='exactPendingPdfHirelingBulletSourceChips');
 assert.equal(sites.length,1);
 assert.equal(sites[0].producerClass,'hireling-pending-pdf-bullet-field-reference');
});

test('the preserved clean-workflow failure is detected before and explicitly classified after',()=>{
 const capturedApp=before.files['dist/app.js'],capturedTool=before.files['tools/citation-navigation-coverage.mjs'];
 assert.equal(createHash('sha256').update(capturedApp.content).digest('hex'),capturedApp.sha256);
 assert.equal(createHash('sha256').update(capturedTool.content).digest('hex'),capturedTool.sha256);
 assert.equal(before.actualFailure.capturedNotReconstructed,true);
 assert.match(before.actualFailure.stackExcerpt,/Unclassified citation chip producer at dist\/app\.js:535 in progressionExplainerDetailHTML/);
 const mapStart=capturedTool.content.indexOf('const producerClassByFunction=');
 const auditStart=capturedTool.content.indexOf('export function auditInlineProducerSites(');
 const auditEnd=capturedTool.content.indexOf('\nconst routeQueryNames',auditStart);
 const oldDetector=vm.createContext({});
 vm.runInContext(`${capturedTool.content.slice(mapStart,auditStart)}\n${capturedTool.content.slice(auditStart,auditEnd).replace('export function','function')}\nthis.auditBefore=auditInlineProducerSites;`,oldDetector);
 assert.throws(()=>oldDetector.auditBefore(capturedApp.content),/Unclassified citation chip producer at dist\/app\.js:535 in progressionExplainerDetailHTML/);
 const expected={progressionExplainerDetailHTML:{producerClass:'progression-explainer-detail-reference',sites:2},matrixDetailHTML:{producerClass:'matrix-detail-reference',sites:1}};
 const sourceLines=capturedApp.content.split('\n');
 for(const [functionName,{producerClass,sites:siteCount}] of Object.entries(expected)){
  const start=sourceLines.findIndex(value=>value.startsWith(`function ${functionName}(`));
  assert.notEqual(start,-1,`${functionName} exists in the exact captured before source`);
  const next=sourceLines.findIndex((value,index)=>index>start&&value.startsWith('function '));
  const functionSource=sourceLines.slice(start,next<0?undefined:next).join('\n');
  assert.throws(()=>oldDetector.auditBefore(functionSource),new RegExp(`Unclassified citation chip producer.*${functionName}`));
  assert.deepEqual(auditInlineProducerSites(functionSource).sites.map(site=>[site.function,site.producerClass]),Array.from({length:siteCount},()=>[functionName,producerClass]));
 }
});

test('auxiliary detail producers retain their collection owner classes',()=>{
 const inventory=auditInlineProducerSites(app);
 assert.deepEqual(inventory.sites.filter(site=>['progressionExplainerDetailHTML','matrixDetailHTML'].includes(site.function)).map(site=>[site.function,site.producerClass]),[
  ['progressionExplainerDetailHTML','progression-explainer-detail-reference'],
  ['progressionExplainerDetailHTML','progression-explainer-detail-reference'],
  ['matrixDetailHTML','matrix-detail-reference']
 ]);
});

test('source-table record and fact citation producers have distinct bounded classifications',()=>{
 const inventory=auditInlineProducerSites(app);
 const recordSites=inventory.sites.filter(site=>site.function==='classAbilitiesHTML');
 const factSites=inventory.sites.filter(site=>site.function==='tableFactSourceChip');
 assert.equal(recordSites.length,1);
 assert.equal(recordSites[0].producerClass,'class-abilities-table-record');
 assert.equal(factSites.length,2);
 assert.ok(factSites.every(site=>site.producerClass==='source-table-fact-reference'));
});

test('an unclassified new source-chip producer fails closed',()=>{
 assert.throws(()=>auditInlineProducerSites(`${app}\nfunction futureCitationControl(){return inlineSourceChip(ref,'Future')}`),/Unclassified citation chip producer/);
});

test('all current HIRED pending PDF bullet bindings resolve to their own pending rule field and source owners',()=>{
 const owners=data.rules.filter(item=>/^dmg-hireling-(?:table-t(?:0[1-9]|[12]\d|3[0-8])|procedure-u(?:0[1-9]|10))$/.test(item?.id||''));
 assert.equal(owners.length,48);
 const bindings=[];const ownerFields=new Set();
 for(const owner of owners){
  for(let bulletIndex=0;bulletIndex<(owner.bullets||[]).length;bulletIndex++){
   const fieldPointer=`/bullets/${bulletIndex}`;
   for(const [referenceIndex,reference] of (owner.references||[]).entries()){
    const sourceObjectPointer=`/references/${referenceIndex}`;
    for(const binding of reference?.evidenceBindings||[]){
     if(binding?.collection!=='rules'||binding.itemId!==owner.id||binding.fieldPointer!==fieldPointer||binding.sourceObjectPointer!==sourceObjectPointer)continue;
     assert.equal(binding.sourceCategory,'hireling-procedure-bullet-reference');
     assert.equal(binding.reviewStatus,'field-target-pending');
     assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
     assert.equal(binding.targetReview,null);
     assert.deepEqual(binding.sourceOwner,{collection:'rules',itemId:owner.id});
     const matches=citations.targets(reference).filter(target=>target.fieldPointer===fieldPointer
      &&target.fieldOwner?.collection==='rules'&&target.fieldOwner?.itemId===owner.id
      &&target.sourceOwner?.collection==='rules'&&target.sourceOwner?.itemId===owner.id
      &&JSON.stringify(target.regionIds)===JSON.stringify(binding.regionIds));
     assert.equal(matches.length,1,`${owner.id}${fieldPointer}: binding must resolve to one exact-region target`);
     const [target]=matches;
     assert.equal(target.sourceCategory,'hireling-procedure-bullet-reference');
     assert.equal(target.reviewStatus,'field-target-pending');assert.equal(target.targetStatus,'pending');
     assert.equal(target.contextStatus,'context-not-assessed');
     assert.equal(target.book,binding.book);assert.equal(target.page,binding.printedPage);assert.equal(target.pdfPage,binding.pdfPage);
     assert.equal(target.catalog,binding.catalog);assert.deepEqual(target.regionIds,binding.regionIds);
     bindings.push({ownerId:owner.id,fieldPointer,regionIds:binding.regionIds});ownerFields.add(`${owner.id}\0${fieldPointer}`);
    }
   }
  }
 }
 assert.equal(bindings.length,36);assert.equal(ownerFields.size,35);
});

test('all HIRED pending PDF table-note bindings keep their table field and rule source owners',()=>{
 const owners=data.rules.filter(item=>/^dmg-hireling-table-t(?:0[1-9]|[12]\d|3[0-8])$/.test(item?.id||''));
 assert.equal(owners.length,38);
 const bindings=[];const ownerFields=new Set();
 for(const owner of owners){
  for(let noteIndex=0;noteIndex<(owner.table?.sourceNotes||[]).length;noteIndex++){
   const note=owner.table.sourceNotes[noteIndex],reference=note?.sourceReference;
   const fieldPointer=`/table/sourceNotes/${noteIndex}`,sourceObjectPointer=`${fieldPointer}/sourceReference`;
   for(const binding of reference?.evidenceBindings||[]){
    if(binding?.collection!=='rules'||binding.itemId!==owner.id||binding.fieldPointer!==fieldPointer||binding.sourceObjectPointer!==sourceObjectPointer)continue;
    assert.ok(['hireling-table-note-reference','hireling-table-note-page-reference'].includes(binding.sourceCategory));
    assert.equal(binding.reviewStatus,'field-target-pending');assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
    assert.equal(binding.targetReview,null);assert.deepEqual(binding.sourceOwner,{collection:'rules',itemId:owner.id});
    const matches=citations.targets(reference).filter(target=>target.fieldPointer===fieldPointer
     &&target.fieldOwner?.collection==='rules'&&target.fieldOwner?.itemId===owner.id
     &&target.sourceOwner?.collection==='rules'&&target.sourceOwner?.itemId===owner.id
     &&JSON.stringify(target.regionIds)===JSON.stringify(binding.regionIds));
    assert.equal(matches.length,1,`${owner.id}${fieldPointer}: note binding must resolve to one exact-region target`);
    const [target]=matches;assert.equal(target.sourceCategory,binding.sourceCategory);
    assert.equal(target.reviewStatus,'field-target-pending');assert.equal(target.targetStatus,'pending');
    assert.equal(target.contextStatus,'context-not-assessed');assert.equal(target.book,binding.book);
    assert.equal(target.page,binding.printedPage);assert.equal(target.pdfPage,binding.pdfPage);assert.equal(target.catalog,binding.catalog);
    assert.deepEqual(target.regionIds,binding.regionIds);bindings.push({ownerId:owner.id,fieldPointer,regionIds:binding.regionIds});ownerFields.add(`${owner.id}\0${fieldPointer}`);
   }
  }
 }
 assert.equal(bindings.length,41);assert.equal(ownerFields.size,38);
});

test('route parser and permalink builder agree on every source query parameter',()=>{
 assert.deepEqual(auditRouteQueryContract(app),{
  parsed:['field','fieldOwner','owner','region','source','target'],
  serialized:['field','fieldOwner','owner','region','source','target']
 });
 assert.throws(()=>auditRouteQueryContract(app.replace("params.get('owner')", "params.get('owner'),unused=params.get('future')")),/unknown=future/);
});

test('citation navigation HTML attributes have an explicit inventory',()=>{
 const inventory=auditSourceNavigationAttributes(app);
 assert.deepEqual(inventory.missing,[]);
 assert.ok(inventory.observed.includes('data-source-context'));
 assert.ok(inventory.observed.includes('data-ref-targets'));
 assert.deepEqual(inventory.metadata,['data-source-card']);
 assert.throws(()=>auditSourceNavigationAttributes(`${app} <button data-source-unreviewed>`),/Unclassified citation navigation attribute/);
});

test('the actual weapon page/region failure and formerly invisible scan attributes remain narrowly classified',()=>{
 const bytes=readFileSync(new URL('./fixtures/weapon-source-navigation-attributes-before-v1.json.gz',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'b6f7f60e13cebd24fdbf9fa207aa78961537b94aa57976c1f12ac3b0e808c8fb');
 const fixture=JSON.parse(gunzipSync(bytes));
 for(const item of [fixture.oldTool,fixture.actualApp])assert.equal(createHash('sha256').update(item.source).digest('hex'),item.sha256);
 assert.equal(fixture.failure.exitCode,1);assert.match(fixture.failure.stderr,/data-source-page, data-source-region/);
 const oldTool=fixture.oldTool.source,start=oldTool.indexOf('const sourceAttributes='),end=oldTool.indexOf('\nconst producerInventory=',start),context=vm.createContext({});
 vm.runInContext(oldTool.slice(start,end).replace('export function','function')+'\nthis.auditBefore=auditSourceNavigationAttributes;',context);
 assert.throws(()=>context.auditBefore(fixture.actualApp.source),/Unclassified citation navigation attribute\(s\): data-source-page, data-source-region/);
 const sourceWithoutNewPageNames=fixture.actualApp.source.replaceAll('data-source-page','data-prior-page').replaceAll('data-source-region','data-prior-region');
 const oldObserved=context.auditBefore(sourceWithoutNewPageNames).observed;
 for(const name of ['data-scan-book','data-scan-page','data-scan-region'])assert.equal(oldObserved.includes(name),false,'the old detector missed these actual controls');
 const current=auditSourceNavigationAttributes(app);
 for(const name of ['data-source-page','data-source-region','data-scan-book','data-scan-page','data-scan-region'])assert.ok(current.observed.includes(name),name);
 assert.deepEqual(current.missing,[]);assert.deepEqual(current.metadata,['data-source-card']);
 assert.throws(()=>auditSourceNavigationAttributes(`${app} <button data-scan-unreviewed>`),/Unclassified citation navigation attribute/);
 assert.throws(()=>auditSourceNavigationAttributes(`${app} <button data-source-unreviewed>`),/Unclassified citation navigation attribute/);
});

test('the actual source-card metadata failure remains reproducible and narrowly classified',()=>{
 const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-audit-pass8-source-card-navigation-before.json.gz',import.meta.url))));
 const files=new Map(fixture.files.map(file=>{
  assert.equal(createHash('sha256').update(file.utf8).digest('hex'),file.sha256);
  return [file.path,file.utf8];
 }));
 const oldTool=files.get('tools/citation-navigation-coverage.mjs');
 const start=oldTool.indexOf('const sourceAttributes='),end=oldTool.indexOf('\nconst producerInventory=',start);
 const context=vm.createContext({});
 vm.runInContext(oldTool.slice(start,end).replace('export function','function')+'\nthis.auditBefore=auditSourceNavigationAttributes;',context);
 const capturedApp=files.get('dist/app.js');
 assert.throws(()=>context.auditBefore(capturedApp),/Unclassified citation navigation attribute\(s\): data-source-card/);
 assert.deepEqual(auditSourceNavigationAttributes(capturedApp).metadata,['data-source-card']);
 assert.throws(()=>auditSourceNavigationAttributes(capturedApp+' <article data-source-unreviewed-card>'),/Unclassified citation navigation attribute/);
});

test('current rule bullet field chips retain a distinct explicit producer class',()=>{
 const inventory=auditInlineProducerSites(app);
 const sites=inventory.sites.filter(site=>site.function==='ruleBulletSourceChips');
 assert.equal(sites.length,1);assert.equal(sites[0].producerClass,'rule-bullet-field-reference');
});
