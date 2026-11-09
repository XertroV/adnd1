import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import {auditInlineProducerSites,auditRouteQueryContract,auditSourceNavigationAttributes} from '../tools/citation-navigation-coverage.mjs';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const before=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/citation-navigation-unclassified-producers-before.json.gz',import.meta.url))));

test('citation navigation inventory captures all current chip producer classes and sites',()=>{
 const inventory=auditInlineProducerSites(app);
 assert.equal(inventory.sites.length,19);
 assert.equal(inventory.classes.length,13);
 assert.deepEqual(inventory.classes,[
  'class-abilities-table-record','class-advancement','class-progression-reference','class-xp-table','cleric-turning-table-fact','dynamic-xp-result',
  'equipment-estimate-comparison','equipment-related-reference','field-attribute-layout',
  'fighter-matrix-reference','matrix-detail-reference','progression-explainer-detail-reference','progression-explainer-reference'
 ]);
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

test('turning-table record and fact citation producers have distinct bounded classifications',()=>{
 const inventory=auditInlineProducerSites(app);
 const recordSites=inventory.sites.filter(site=>site.function==='classAbilitiesHTML');
 const factSites=inventory.sites.filter(site=>site.function==='tableFactSourceChip');
 assert.equal(recordSites.length,1);
 assert.equal(recordSites[0].producerClass,'class-abilities-table-record');
 assert.equal(factSites.length,1);
 assert.equal(factSites[0].producerClass,'cleric-turning-table-fact');
});

test('an unclassified new source-chip producer fails closed',()=>{
 assert.throws(()=>auditInlineProducerSites(`${app}\nfunction futureCitationControl(){return inlineSourceChip(ref,'Future')}`),/Unclassified citation chip producer/);
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
