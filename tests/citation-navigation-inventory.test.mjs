import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {auditInlineProducerSites,auditInlineProducerCallExpressions,auditRouteQueryContract,auditSourceNavigationAttributes,citationControlClasses} from '../tools/citation-navigation-coverage.mjs';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const dataBytes=readFileSync(new URL('../dist/data.json',import.meta.url));
const data=JSON.parse(dataBytes.toString('utf8'));
const require=createRequire(import.meta.url);
const citations=require('../dist/citations.js');
const before=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/citation-navigation-unclassified-producers-before.json.gz',import.meta.url))));


const historicalR5AppBytes=readFileSync(new URL('./fixtures/citation-navigation-app-r5-a29-v1.js.gz',import.meta.url));
const historicalR5App=gunzipSync(historicalR5AppBytes).toString('utf8');

test('the exact A29 app f4381ff producer census remains preserved as a source-byte regression',()=>{
 assert.equal(createHash('sha256').update(historicalR5AppBytes).digest('hex'),'361597559d89eb2c2085cb3ad170f4b29deb9d7d3e226f83e163f1a51dff5ab0');
 assert.equal(createHash('sha256').update(historicalR5App).digest('hex'),'f4381ff282ea6ff7d245c915ab17fafd4b19e025e2af6c2a496145429285f2c7');
 const inventory=auditInlineProducerSites(historicalR5App);
 const callInventory=auditInlineProducerCallExpressions(historicalR5App);
 assert.equal(inventory.unit,'distinct source line and enclosing producer function');
 assert.equal(inventory.sites.length,22);
 assert.equal(callInventory.sourceLineSiteCount,22);
 assert.equal(callInventory.callExpressionCount,27);
 assert.equal(callInventory.classes.length,15);
 assert.equal(callInventory.calls.filter(call=>call.function==='classAbilitiesHTML').length,1);
 assert.equal(callInventory.calls.find(call=>call.function==='classAbilitiesHTML').producerClass,'class-abilities-table-record');
 assert.equal(inventory.classes.length,15);
 assert.deepEqual(inventory.classes,[
  'class-abilities-table-record','class-advancement','class-progression-reference','class-xp-table','dynamic-xp-result',
  'equipment-estimate-comparison','equipment-related-reference','field-attribute-layout',
  'fighter-matrix-reference','hireling-pending-pdf-bullet-field-reference','matrix-detail-reference','progression-explainer-detail-reference','progression-explainer-reference','rule-bullet-field-reference','source-table-fact-reference'
 ]);
 const recordSites=inventory.sites.filter(site=>site.function==='classAbilitiesHTML');
 assert.equal(recordSites.length,1);
 assert.equal(recordSites[0].producerClass,'class-abilities-table-record');
});

test('citation navigation inventory captures all current chip producer classes and sites',()=>{
 assert.equal(createHash('sha256').update(app).digest('hex'),'876df077e57041e77732ea56cc47123dc1f459ba6badac0ce98d3254345106d6');
 assert.equal(createHash('sha256').update(dataBytes).digest('hex'),'16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573');
 const inventory=auditInlineProducerSites(app);
 const callInventory=auditInlineProducerCallExpressions(app);
 assert.equal(inventory.unit,'distinct source line and enclosing producer function');
 assert.equal(inventory.sites.length,23);
 assert.equal(callInventory.sourceLineSiteCount,23);
 assert.equal(callInventory.callExpressionCount,29);
 assert.equal(callInventory.classes.length,16);
 assert.equal(inventory.classes.length,16);
 assert.deepEqual(inventory.classes,[
  'class-abilities-table-record','class-ability-field-reference','class-advancement','class-progression-reference','class-xp-table','dynamic-xp-result',
  'equipment-estimate-comparison','equipment-related-reference','field-attribute-layout',
  'fighter-matrix-reference','hireling-pending-pdf-bullet-field-reference','matrix-detail-reference','progression-explainer-detail-reference','progression-explainer-reference','rule-bullet-field-reference','source-table-fact-reference'
 ]);
 const historicalSites=auditInlineProducerSites(historicalR5App).sites.map(site=>[site.function,site.producerClass]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const currentWithoutAddedFieldSite=inventory.sites.filter(site=>site.producerClass!=='class-ability-field-reference').map(site=>[site.function,site.producerClass]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 assert.deepEqual(currentWithoutAddedFieldSite,historicalSites,'all 22 A29 source-line sites remain represented');
 assert.equal(inventory.sites.filter(site=>site.producerClass==='class-ability-field-reference').length,1);
 const oldCallPairs=auditInlineProducerCallExpressions(historicalR5App).calls.map(call=>[call.function,call.producerClass]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const currentWithoutNewFields=callInventory.calls.filter(call=>call.producerClass!=='class-ability-field-reference').map(call=>[call.function,call.producerClass]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 assert.deepEqual(currentWithoutNewFields,oldCallPairs,'all 27 A29 call expressions remain represented');
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
 const fieldSites=inventory.sites.filter(site=>site.function==='classAbilitiesHTML'&&site.producerClass==='class-ability-field-reference');
 const recordSites=inventory.sites.filter(site=>site.function==='classAbilitiesHTML'&&site.producerClass==='class-abilities-table-record');
 const calls=auditInlineProducerCallExpressions(app).calls.filter(call=>call.function==='classAbilitiesHTML');
 const recordControl=citationControlClasses.find(control=>control.id==='class-abilities-table-record');
 const fieldControl=citationControlClasses.find(control=>control.id==='class-ability-field-reference');
 const factSites=inventory.sites.filter(site=>site.function==='tableFactSourceChip');
 assert.equal(fieldSites.length,1);
 assert.equal(recordSites.length,1);
 assert.equal(calls.filter(call=>call.producerClass==='class-ability-field-reference').length,2);
 assert.equal(calls.filter(call=>call.producerClass==='class-abilities-table-record').length,1);
 assert.deepEqual(calls.map(({producerClass,sourceContainer,scope})=>({producerClass,sourceContainer,scope})),[
  {producerClass:'class-ability-field-reference',sourceContainer:'classes.classAbilityInheritance.references',scope:undefined},
  {producerClass:'class-ability-field-reference',sourceContainer:'classes.classAbilities[].references',scope:undefined},
  {producerClass:'class-abilities-table-record',sourceContainer:undefined,scope:'rules:cleric-turning-table'}
 ]);
 assert.deepEqual(recordControl.scope,['rules:cleric-turning-table']);
 assert.deepEqual(fieldControl.scope,['classes.classAbilities[].references','classes.classAbilityInheritance.references']);
 assert.equal(recordSites[0].producerClass,'class-abilities-table-record');
 assert.equal(factSites.length,2);
 assert.ok(factSites.every(site=>site.producerClass==='source-table-fact-reference'));
});

test('per-call AST census counts both same-line class-ability chips and rejects unknown calls',()=>{
 const current=auditInlineProducerCallExpressions(app),historical=auditInlineProducerCallExpressions(historicalR5App);
 assert.equal(historical.callExpressionCount,27);
 assert.equal(historical.sourceLineSiteCount,22);
 assert.equal(current.callExpressionCount,29);
 assert.equal(current.sourceLineSiteCount,23);
 const abilityCall="inlineSourceChip(reference,`${x.name} · ${ability.title}`)";
 assert.equal(app.split(abilityCall).length-1,1,'the exact ability call exists once in the current source');
 const unknownCall="inlineSourceChip(unclassifiedReference,'new producer')";
 const mutated=app.replace(abilityCall,'('+abilityCall+','+unknownCall+')');
 assert.notEqual(mutated,app);
 assert.throws(()=>auditInlineProducerCallExpressions(mutated),/Unclassified classAbilitiesHTML inlineSourceChip CallExpression/);
 const decoys=app+'\n// inlineSourceChip(fakeReference, \"comment\")\nconst inertString = \"inlineSourceChip(fakeReference, comment)\";\nconst inertTemplate = `inlineSourceChip(fakeReference, template)`;\n';
 assert.equal(auditInlineProducerCallExpressions(decoys).callExpressionCount,29,'comments and literal/template text are not CallExpressions');
});

test('the Paladin ability producer routes only the eleven current class-field references as pending targets',()=>{
 const targets=[];
 for(const ownerId of ['paladin','ua-paladin']){
  const owner=data.classes.find(item=>item.id===ownerId);
  assert.ok(owner,ownerId);
  for(let abilityIndex=0;abilityIndex<(owner.classAbilities||[]).length;abilityIndex++){
   const ability=owner.classAbilities[abilityIndex];
   for(let referenceIndex=0;referenceIndex<(ability.references||[]).length;referenceIndex++){
    const reference=ability.references[referenceIndex];
    const fieldPointer=`/classAbilities/${abilityIndex}/description`,sourceObjectPointer=`/classAbilities/${abilityIndex}/references/${referenceIndex}`;
    const bindings=(reference.evidenceBindings||[]).filter(binding=>binding.collection==='classes'&&binding.itemId===ownerId&&binding.fieldPointer===fieldPointer&&binding.sourceObjectPointer===sourceObjectPointer);
    assert.equal(bindings.length,1,`${ownerId}${fieldPointer}`);
    const [binding]=bindings;
    assert.equal(binding.sourceCategory,'class-ability');
    assert.equal(binding.reviewStatus,'field-target-pending');
    assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
    assert.equal(binding.contextStatus,'context-not-assessed');
    assert.equal(binding.targetReview,null);
    const matching=citations.targets(reference).filter(target=>target.fieldPointer===fieldPointer&&target.fieldOwner?.collection==='classes'&&target.fieldOwner?.itemId===ownerId&&target.sourceOwner?.collection==='classes'&&target.sourceOwner?.itemId===ownerId);
    assert.equal(matching.length,1,`${ownerId}${fieldPointer}: one exact class owner`);
    assert.equal(matching[0].targetStatus,'pending');
    assert.equal(matching[0].reviewStatus,'field-target-pending');
    assert.equal(matching[0].contextStatus,'context-not-assessed');
    assert.deepEqual(matching[0].regionIds,binding.regionIds);
    targets.push({ownerId,fieldPointer,sourceObjectPointer,sourceCategory:binding.sourceCategory,book:binding.book,printedPage:binding.printedPage,pdfPage:binding.pdfPage,regionIds:binding.regionIds});
   }
  }
  for(let referenceIndex=0;referenceIndex<(owner.classAbilityInheritance?.references||[]).length;referenceIndex++){
   const reference=owner.classAbilityInheritance.references[referenceIndex];
   const fieldPointer='/classAbilityInheritance/description',sourceObjectPointer=`/classAbilityInheritance/references/${referenceIndex}`;
   const bindings=(reference.evidenceBindings||[]).filter(binding=>binding.collection==='classes'&&binding.itemId===ownerId&&binding.fieldPointer===fieldPointer&&binding.sourceObjectPointer===sourceObjectPointer);
   assert.equal(bindings.length,1,`${ownerId}${fieldPointer}`);
   const [binding]=bindings;
   assert.equal(binding.sourceCategory,'class-ability-inheritance');
   assert.equal(binding.reviewStatus,'field-target-pending');
   assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
   assert.equal(binding.contextStatus,'context-not-assessed');
   assert.equal(binding.targetReview,null);
   const matching=citations.targets(reference).filter(target=>target.fieldPointer===fieldPointer&&target.fieldOwner?.collection==='classes'&&target.fieldOwner?.itemId===ownerId&&target.sourceOwner?.collection==='classes'&&target.sourceOwner?.itemId===ownerId);
   assert.equal(matching.length,1,`${ownerId}${fieldPointer}: one exact inheritance owner`);
   assert.equal(matching[0].targetStatus,'pending');
   assert.equal(matching[0].reviewStatus,'field-target-pending');
   assert.equal(matching[0].contextStatus,'context-not-assessed');
   assert.deepEqual(matching[0].regionIds,binding.regionIds);
   targets.push({ownerId,fieldPointer,sourceObjectPointer,sourceCategory:binding.sourceCategory,book:binding.book,printedPage:binding.printedPage,pdfPage:binding.pdfPage,regionIds:binding.regionIds});
  }
 }
 assert.deepEqual(targets,[
  {ownerId:'paladin',fieldPointer:'/classAbilities/0/description',sourceObjectPointer:'/classAbilities/0/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-01-detect-evil']},
  {ownerId:'paladin',fieldPointer:'/classAbilities/1/description',sourceObjectPointer:'/classAbilities/1/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-02-saving-throw-bonus']},
  {ownerId:'paladin',fieldPointer:'/classAbilities/2/description',sourceObjectPointer:'/classAbilities/2/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-03-disease-immunity']},
  {ownerId:'paladin',fieldPointer:'/classAbilities/3/description',sourceObjectPointer:'/classAbilities/3/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-06-protection-from-evil-emanation']},
  {ownerId:'paladin',fieldPointer:'/classAbilities/4/description',sourceObjectPointer:'/classAbilities/4/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-09-holy-sword']},
  {ownerId:'ua-paladin',fieldPointer:'/classAbilities/0/description',sourceObjectPointer:'/classAbilities/0/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-01-detect-evil']},
  {ownerId:'ua-paladin',fieldPointer:'/classAbilities/1/description',sourceObjectPointer:'/classAbilities/1/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-02-saving-throw-bonus']},
  {ownerId:'ua-paladin',fieldPointer:'/classAbilities/2/description',sourceObjectPointer:'/classAbilities/2/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-03-disease-immunity']},
  {ownerId:'ua-paladin',fieldPointer:'/classAbilities/3/description',sourceObjectPointer:'/classAbilities/3/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-06-protection-from-evil-emanation']},
  {ownerId:'ua-paladin',fieldPointer:'/classAbilities/4/description',sourceObjectPointer:'/classAbilities/4/references/0',sourceCategory:'class-ability',book:'PHB',printedPage:22,pdfPage:23,regionIds:['phb-22-paladin-power-09-holy-sword']},
  {ownerId:'ua-paladin',fieldPointer:'/classAbilityInheritance/description',sourceObjectPointer:'/classAbilityInheritance/references/0',sourceCategory:'class-ability-inheritance',book:'UA',printedPage:16,pdfPage:17,regionIds:['pass8-ua-paladin-phb-advancement-context']}
 ]);

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
