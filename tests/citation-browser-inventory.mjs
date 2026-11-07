import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {attachEvidenceBindings,buildPriceSourceInventory,validatePriceSourceInventory} from '../tools/price-source-inventory.mjs';
import {makeCitationBrowserIndex,inventoryCatalogPaths,safeCatalogPath,targetKey,validateTargetPayload} from '../tools/citation-browser-inventory.mjs';
import citations from '../dist/citations.js';
import books from '../dist/books.js';
import {auditInlineProducerSites} from '../tools/citation-navigation-coverage.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const distRoot=path.join(repoRoot,'dist');
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const sourceDataBytes=await readFile(path.join(distRoot,'data.json'));
const appBytes=await readFile(path.join(distRoot,'app.js'));
const citationApiBytes=await readFile(path.join(distRoot,'citations.js'));
const inventoryHelperBytes=await readFile(path.join(repoRoot,'tools/price-source-inventory.mjs'));
const data=JSON.parse(sourceDataBytes);
const inventory=buildPriceSourceInventory({equipment:data.equipment,data});
const inventoryValidation=validatePriceSourceInventory(inventory,{equipment:data.equipment,data});
attachEvidenceBindings(data,inventory);
const appSource=appBytes.toString('utf8');
const producerInventory=auditInlineProducerSites(appSource);
const catalogEntries=[],catalogInputHashes=[];
const catalogPaths=new Set(inventoryCatalogPaths(data));
for(const binding of inventory.fieldEvidenceBindings)if(binding.catalog)catalogPaths.add(binding.catalog);
const findCatalogPaths=value=>{
 if(!value||typeof value!=='object')return;
 if(Array.isArray(value)){value.forEach(findCatalogPaths);return;}
 for(const [key,child] of Object.entries(value)){if(key==='catalog'&&typeof child==='string'&&child)catalogPaths.add(child);else findCatalogPaths(child);}
};
findCatalogPaths(data);
for(const catalogPath of [...catalogPaths].sort()){
 const file=safeCatalogPath(distRoot,catalogPath);
 if(!file)throw new Error(`Catalog path escapes dist/: ${catalogPath}`);
 try{const bytes=await readFile(file);catalogEntries.push([catalogPath,JSON.parse(bytes.toString('utf8'))]);catalogInputHashes.push({catalogPath,sha256:createHash('sha256').update(bytes).digest('hex')});}
 catch(error){catalogEntries.push([catalogPath,null]);catalogInputHashes.push({catalogPath,missing:true});}
}
const auditIndex=makeCitationBrowserIndex({data,bindings:inventory.fieldEvidenceBindings,catalogs:Object.fromEntries(catalogEntries),books:books.books});
const records=[];
for(const collection of ['spells','rules','equipment','classes']){
 for(const item of data[collection]||[])records.push({collection,id:item.id,title:item.name||item.title||item._title||item.id,route:`#${collection}/${encodeURIComponent(item.id)}`});
}
for(const collection of ['matrices'])for(const item of data[collection]||[])records.push({collection,id:item.id,title:item.title||item.id,route:'rendered through classes/fighter matrix controls',syntheticRoute:true});
if(data.progressionExplainer)records.push({collection:'progressionExplainer',id:data.progressionExplainer.id||'progression-explainer',title:data.progressionExplainer.title||'Progression explainer',route:'rendered through classes progression explainer',syntheticRoute:true});
const contentRecordCount=records.length;
assert.ok(contentRecordCount>=920,'The browser inventory denominator must include the current content records, including matrix and progression explainer');

const staticServer=http.createServer(async(request,response)=>{
 try{
  const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  if(pathname==='/data.json'){
   response.setHeader('Content-Type','application/json');response.end(JSON.stringify(data));return;
  }
  const file=path.resolve(distRoot,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(distRoot+path.sep))throw new Error('Path traversal');
  const ext=path.extname(file);
  response.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[ext]||'application/octet-stream');
  response.end(await readFile(file));
 }catch{response.writeHead(404).end();}
});
await new Promise(resolve=>staticServer.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${staticServer.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1365,height:900}});
page.setDefaultTimeout(30000);
const browserErrors=[];page.on('pageerror',error=>browserErrors.push(error.message));

const scanRoutedRecords=async()=>page.evaluate(async(routeRecords)=>{
 const hashFor=record=>`#${record.collection}/${encodeURIComponent(record.id)}`;
 const navigate=hash=>new Promise(resolve=>{
  if(location.hash===hash){resolve();return;}
  window.addEventListener('hashchange',resolve,{once:true});location.hash=hash;
 });
 const ownerFor=(element,routeRecord)=>{
  const source=element.closest('[data-source-context]');
  return source?{collection:source.dataset.sourceView||routeRecord.collection,itemId:source.dataset.sourceContext}:{collection:routeRecord.collection,itemId:routeRecord.id};
 };
 const capture=(routeRecord,scenario)=>{
  const controls=[...document.querySelectorAll('#main [data-inline-source]')];
  const entries=controls.map((element,index)=>{
   let targets=null,payloadError='';
   try{targets=JSON.parse(element.dataset.refTargets||'');}catch(error){payloadError=String(error.message||error);}
   const hiddenDetails=[];
   for(let parent=element.parentElement;parent&&parent!==document.querySelector('#main');parent=parent.parentElement){
    if(parent.tagName==='DETAILS'&&!parent.open)hiddenDetails.push(parent.querySelector('summary')?.innerText.trim()||'unnamed details');
   }
   let hiddenAncestors=[];
   for(let parent=element;parent&&parent!==document.body;parent=parent.parentElement){
    if(parent.hidden)hiddenAncestors.push('hidden attribute');
    const style=getComputedStyle(parent);
    if(style.display==='none')hiddenAncestors.push('display:none');
    if(style.visibility==='hidden')hiddenAncestors.push('visibility:hidden');
   }
   const rect=element.getBoundingClientRect();
   const rendered=element.getClientRects().length>0;
   const visible=rendered&&!hiddenDetails.length&&!hiddenAncestors.length;
   const inViewport=visible&&rect.bottom>0&&rect.right>0&&rect.top<innerHeight&&rect.left<innerWidth;
   const detail=element.closest('[data-annotation-target]');
   const row=element.closest('tr[data-xp-level]');
   const field=element.closest('[data-field-label]');
   const context=element.closest('[data-source-context]');
   const section=element.closest('[data-attribute-layout]');
   const containerKinds=[];
   for(const selector of ['.progression-explainer','.progression-context','.advancement-summary','.advancement-planner','.level-change-group','.fighter-combat','.additional-references','.attribute-citations','.attribute-table-wrap','.compact-facts']){
    if(element.closest(selector))containerKinds.push(selector.slice(1));
   }
   return {
    ordinal:index,
    routeRecord:{collection:routeRecord.collection,itemId:routeRecord.id},
    contextOwner:ownerFor(element,routeRecord),
    detailOwner:detail?.dataset.annotationTarget||'',
    fieldLabel:field?.dataset.fieldLabel||'',
    xpLevel:row?.dataset.xpLevel||'',
    attributeLayout:section?.dataset.attributeLayout||'',
    containerKinds,
    disclosurePath:hiddenDetails.reverse(),
    visible,inViewport,rendered,hiddenReasons:[...new Set([...hiddenDetails.map(name=>`closed details: ${name}`),...hiddenAncestors])],
    buttonText:element.innerText.trim(),
    referenceTitle:element.dataset.refTitle||'',
    referenceStatus:element.dataset.refStatus||'',
    book:element.dataset.refBook||'',
    pages:element.dataset.refPages||'',
    payloadError,
    targets:Array.isArray(targets)?targets:[]
   };
  });
  return {scenario,viewport:{width:innerWidth,height:innerHeight},renderedControlCount:entries.length,visibleControlCount:entries.filter(entry=>entry.visible).length,hiddenControlCount:entries.filter(entry=>!entry.visible).length,controls:entries};
 };
 const states=[];
 const routed=routeRecords.filter(record=>!record.syntheticRoute);
 for(const record of routed){
  await navigate(hashFor(record));
  const card=document.querySelector('#referenceDetail .detail-card');
  if(!card||card.dataset.annotationTarget!==record.id){
   states.push({routeRecord:record,scenario:'initial',failure:'selected detail did not render for route'});continue;
  }
  const compact=document.querySelector('#referenceDetail [data-attribute-view="compact"]');
  if(compact&&compact.getAttribute('aria-pressed')!=='true')compact.click();
  states.push({routeRecord:record,...capture(record,'initial-compact')});

  const section=document.querySelector('#referenceDetail [data-attribute-layout]');
  const table=document.querySelector('#referenceDetail [data-attribute-view="table"]');
  if(table){
   table.click();states.push({routeRecord:record,...capture(record,'attribute-table')});
   document.querySelector('#referenceDetail [data-attribute-view="compact"]')?.click();
  }

  const details=[...document.querySelectorAll('#main details')];
  if(details.some(detail=>!detail.open)){
   details.forEach(detail=>{detail.open=true;});
   states.push({routeRecord:record,...capture(record,'all-details-open')});
   details.forEach(detail=>{detail.open=false;});
  }
  if(record.collection==='classes'){
   const level=document.querySelector('#targetLevel');
   if(level){
    for(const option of [...level.options]){
     if(option.value===level.value)continue;
     level.value=option.value;level.dispatchEvent(new Event('change',{bubbles:true}));
     states.push({routeRecord:record,...capture(record,`target-level-${option.value}`)});
    }
   }
   const xp=document.querySelector('#xpInput');
   if(xp){xp.value='1000000000';xp.dispatchEvent(new Event('input',{bubbles:true}));states.push({routeRecord:record,...capture(record,'xp-calculator-high-value')});xp.value='0';xp.dispatchEvent(new Event('input',{bubbles:true}));}
   const combatDetails=[...document.querySelectorAll('#main details[data-fighter-alt],#main details[data-fighter-matrix]')];
   if(combatDetails.length){combatDetails.forEach(detail=>{detail.open=true;});states.push({routeRecord:record,...capture(record,'class-combat-details-open')});combatDetails.forEach(detail=>{detail.open=false;});}
  }
  // The app remembers fighter disclosure and attribute layout state across routes. Reset the DOM state
  // before the next hash event; route() snapshots these states before replacing the previous card.
  document.querySelectorAll('#main details[open]').forEach(detail=>{detail.open=false;});
 }
 return states;
},records);

const mobileSample=async()=>page.evaluate(async(sampleRecords)=>{
 const routeRecord=async record=>{
  const hash=`#${record.collection}/${encodeURIComponent(record.id)}`;
  if(location.hash!==hash)await new Promise(resolve=>{window.addEventListener('hashchange',resolve,{once:true});location.hash=hash;});
  const card=document.querySelector('#referenceDetail .detail-card');
  if(!card||card.dataset.annotationTarget!==record.id)return {routeRecord:record,scenario:'mobile-initial',failure:'selected detail did not render'};
  const controls=[...document.querySelectorAll('#main [data-inline-source]')].map((element,index)=>{
   let targets=[];let payloadError='';try{targets=JSON.parse(element.dataset.refTargets||'');}catch(error){payloadError=String(error.message||error);}
   const hidden=[];for(let parent=element.parentElement;parent&&parent!==document.querySelector('#main');parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open)hidden.push(parent.querySelector('summary')?.innerText.trim()||'unnamed details');
   const source=element.closest('[data-source-context]'),detail=element.closest('[data-annotation-target]'),rect=element.getBoundingClientRect();
   return {ordinal:index,routeRecord:{collection:record.collection,itemId:record.id},contextOwner:source?{collection:source.dataset.sourceView||record.collection,itemId:source.dataset.sourceContext}:{collection:record.collection,itemId:record.id},detailOwner:detail?.dataset.annotationTarget||'',fieldLabel:element.closest('[data-field-label]')?.dataset.fieldLabel||'',containerKinds:[],disclosurePath:hidden.reverse(),visible:!hidden.length&&element.getClientRects().length>0,inViewport:rect.bottom>0&&rect.right>0&&rect.top<innerHeight&&rect.left<innerWidth,rendered:element.getClientRects().length>0,hiddenReasons:hidden.map(x=>`closed details: ${x}`),buttonText:element.innerText.trim(),referenceTitle:element.dataset.refTitle||'',referenceStatus:element.dataset.refStatus||'',book:element.dataset.refBook||'',pages:element.dataset.refPages||'',payloadError,targets};
  });
  return {routeRecord:record,scenario:'mobile-initial',viewport:{width:innerWidth,height:innerHeight},renderedControlCount:controls.length,visibleControlCount:controls.filter(x=>x.visible).length,hiddenControlCount:controls.filter(x=>!x.visible).length,controls};
 };
 const states=[];
 for(const record of sampleRecords)states.push(await routeRecord(record));
 const fighter=sampleRecords.find(record=>record.collection==='classes'&&record.id==='fighter');
 if(fighter){
  const level=document.querySelector('#targetLevel');if(level){level.value='3';level.dispatchEvent(new Event('change',{bubbles:true}));const controls=[...document.querySelectorAll('#main [data-inline-source]')].map((element,index)=>{let targets=[];let payloadError='';try{targets=JSON.parse(element.dataset.refTargets||'');}catch(error){payloadError=String(error.message||error);}const source=element.closest('[data-source-context]'),detail=element.closest('[data-annotation-target]'),hidden=[];for(let parent=element.parentElement;parent&&parent!==document.querySelector('#main');parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open)hidden.push(parent.querySelector('summary')?.innerText.trim()||'unnamed details');const rect=element.getBoundingClientRect();return {ordinal:index,routeRecord:{collection:fighter.collection,itemId:fighter.id},contextOwner:source?{collection:source.dataset.sourceView||fighter.collection,itemId:source.dataset.sourceContext}:{collection:fighter.collection,itemId:fighter.id},detailOwner:detail?.dataset.annotationTarget||'',fieldLabel:element.closest('[data-field-label]')?.dataset.fieldLabel||'',containerKinds:['dynamic-class-level'],disclosurePath:hidden.reverse(),visible:!hidden.length&&element.getClientRects().length>0,inViewport:rect.bottom>0&&rect.right>0&&rect.top<innerHeight&&rect.left<innerWidth,rendered:element.getClientRects().length>0,hiddenReasons:hidden.map(x=>`closed details: ${x}`),buttonText:element.innerText.trim(),referenceTitle:element.dataset.refTitle||'',referenceStatus:element.dataset.refStatus||'',book:element.dataset.refBook||'',pages:element.dataset.refPages||'',payloadError,targets};});states.push({routeRecord:fighter,scenario:'mobile-target-level-3',viewport:{width:innerWidth,height:innerHeight},renderedControlCount:controls.length,visibleControlCount:controls.filter(x=>x.visible).length,hiddenControlCount:controls.filter(x=>!x.visible).length,controls});}
 }
 return states;
},records.filter(record=>record.collection==='spells'&&record.id==='phb-cleric-snake-charm'||record.collection==='equipment'&&record.id==='phb-bo-stick'||record.collection==='classes'&&record.id==='fighter'));

try{
 await page.goto(origin);
 await page.locator('#referenceDetail .detail-card').waitFor();
 const desktopStates=await scanRoutedRecords();
 await page.setViewportSize({width:390,height:844});
 const mobileStates=await mobileSample();
 const allStates=[...desktopStates,...mobileStates];
 const controlsByKey=new Map(),routeFailures=[],validationIssueMap=new Map();
 const addValidationIssue=issue=>{
  const key=JSON.stringify({code:issue.code,detail:issue.detail,controlId:issue.controlId,routeRecord:issue.routeRecord});
  const existing=validationIssueMap.get(key);
  if(existing){if(issue.scenario&&!existing.scenarios.includes(issue.scenario))existing.scenarios.push(issue.scenario);}
  else validationIssueMap.set(key,{...issue,scenarios:issue.scenario?[issue.scenario]:[]});
 };
 for(const state of allStates){
  if(state.failure){routeFailures.push({routeRecord:state.routeRecord,scenario:state.scenario,detail:state.failure});continue;}
  for(const control of state.controls){
   const identity={routeRecord:control.routeRecord,contextOwner:control.contextOwner,detailOwner:control.detailOwner,fieldLabel:control.fieldLabel,xpLevel:control.xpLevel||'',attributeLayout:control.attributeLayout||'',containerKinds:control.containerKinds||[],ordinal:control.ordinal,buttonText:control.buttonText,referenceTitle:control.referenceTitle,book:control.book,pages:control.pages,targets:control.targets};
   const key=JSON.stringify(identity),controlId=`inline-${createHash('sha256').update(key).digest('hex').slice(0,18)}`;
   let record=controlsByKey.get(controlId);
   if(!record){record={controlId,...identity,payloadError:control.payloadError||'',observations:[]};controlsByKey.set(controlId,record);}
   record.observations.push({scenario:state.scenario,visible:control.visible,inViewport:control.inViewport,rendered:control.rendered,hiddenReasons:control.hiddenReasons||[],disclosurePath:control.disclosurePath||[],viewport:state.viewport});
   if(control.payloadError)addValidationIssue({code:'invalid-target-json',controlId,routeRecord:control.routeRecord,scenario:state.scenario,detail:control.payloadError});
   const targetIssues=validateTargetPayload(control.targets,control,auditIndex);
   for(const issue of targetIssues)addValidationIssue({controlId,routeRecord:control.routeRecord,scenario:state.scenario,...issue});
  }
 }
 const validationIssues=[...validationIssueMap.values()];
 const currentTargets=new Map();
 for(const control of controlsByKey.values())for(const target of control.targets){
  const key=targetKey(target);const entry=currentTargets.get(key)||{target,controlIds:new Set(),observations:0};entry.controlIds.add(control.controlId);entry.observations+=control.observations.length;currentTargets.set(key,entry);
 }
 const expectedTargets=new Map();
 const targetCollections=[...['spells','rules','equipment','classes','matrices'].flatMap(collection=>(data[collection]||[]).map(item=>({collection,itemId:item.id,item}))),...(data.progressionExplainer?[{collection:'progressionExplainer',itemId:data.progressionExplainer.id||'progression-explainer',item:data.progressionExplainer}]:[])];
 for(const origin of targetCollections)for(const target of citations.targets(origin.item)){
  const key=targetKey(target),entry=expectedTargets.get(key)||{target,origins:[]};
  entry.origins.push({collection:origin.collection,itemId:origin.itemId});expectedTargets.set(key,entry);
 }
 const targetExposure=[];
 for(const [key,entry] of expectedTargets){
  const found=currentTargets.get(key);
  targetExposure.push({target:entry.target,origins:entry.origins,exposure:found?(found.controlIds.size?'rendered-inline':'not-rendered'):'not-rendered-inline',controlIds:found?[...found.controlIds]:[],
   class:entry.target.fieldPointer?'field-scoped':'page-level'});
 }
 const expectedFieldTargets=targetExposure.filter(entry=>entry.class==='field-scoped');
 const unrenderedFieldTargets=expectedFieldTargets.filter(entry=>entry.exposure!=='rendered-inline');
 const statusCounts={};for(const issue of validationIssues)statusCounts[issue.code]=(statusCounts[issue.code]||0)+1;
 const inMemoryRecords=targetCollections.length;
 assert.equal(inMemoryRecords,contentRecordCount,'Target collector denominator must equal the full browser record set');
 const targetPayloadTable=new Map();
 const targetProjection=target=>{
  const keys=['book','page','regionIds','label','labels','status','reviewStatus','targetStatus','fieldPointer','fieldPointers','fieldOwner','sourceObject','sourceCategory','sourceCategories','catalog','pdfPage','coordinateSpace','contextStatus','contextLimitations','sourcePages','sourceSha256','sourceOwner','unmappedRegionIds','sourceRowIds'];
  return Object.fromEntries(keys.filter(key=>target[key]!==undefined).map(key=>[key,target[key]]));
 };
 const reportControls=[...controlsByKey.values()].map(control=>{
  const payload=JSON.stringify(control.targets),payloadSha256=createHash('sha256').update(payload).digest('hex');
  const targetIds=control.targets.map(target=>{
   const projection=targetProjection(target),targetPayload=JSON.stringify(projection),targetHash=createHash('sha256').update(JSON.stringify(target)).digest('hex');
   const targetId=`target-${createHash('sha256').update(targetPayload).digest('hex').slice(0,18)}`;
   if(!targetPayloadTable.has(targetId))targetPayloadTable.set(targetId,{targetId,...projection,rawTargetSha256s:[]});
   const stored=targetPayloadTable.get(targetId);if(!stored.rawTargetSha256s.includes(targetHash))stored.rawTargetSha256s.push(targetHash);
   return targetId;
  });
  const {targets:_omittedTargets,...rest}=control;
  return {...rest,targetIds,dataRefTargetsSha256:payloadSha256};
 });
 const report={
  schemaVersion:1,
  purpose:'Regeneratable browser inventory of every rendered inline citation control over the current content record set. It audits control payload identities against test-only in-memory attached evidence bindings and the owner-selected public catalogs; it does not review source meaning or geometry.',
  provenance:{gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim(),sourceDataSha256:createHash('sha256').update(sourceDataBytes).digest('hex'),distAppSha256:createHash('sha256').update(appBytes).digest('hex'),distCitationApiSha256:createHash('sha256').update(citationApiBytes).digest('hex'),inventoryHelperSha256:createHash('sha256').update(inventoryHelperBytes).digest('hex'),dataBytes:sourceDataBytes.length,servedData:'test-only in-memory data after buildPriceSourceInventory + attachEvidenceBindings',browserName:'Chromium',browserVersion:browser.version(),desktopViewport:{width:1365,height:900},mobileViewport:{width:390,height:844},distFilesUnmodified:true},
  denominator:{contentRecords:contentRecordCount,routeRecords:records.filter(record=>!record.syntheticRoute).length,syntheticRenderedRecords:records.filter(record=>record.syntheticRoute).map(record=>({collection:record.collection,itemId:record.id,route:record.route})),supplementalSourceMetadataRecords:(data.sources||[]).length,routeCollections:{spells:data.spells.length,rules:data.rules.length,equipment:data.equipment.length,classes:data.classes.length,matrices:data.matrices.length,progressionExplainer:data.progressionExplainer?1:0}},
  staticProducerDenominator:{classCount:producerInventory.classes.length,classes:producerInventory.classes,siteCount:producerInventory.sites.length,sites:producerInventory.sites},
  evidenceInventory:{validation:'passed',fieldEvidenceBindings:inventoryValidation.counts.fieldEvidenceBindings,regionBoundBindings:inventoryValidation.counts.regionBoundBindings,pendingRegionBindings:inventoryValidation.counts.pendingRegionBindings,bindingsByCollection:inventoryValidation.counts.fieldEvidenceBindingsByCollection,selectedCatalogCount:inventoryCatalogPaths(data).length,auditedCatalogCount:catalogEntries.length,loadedCatalogCount:catalogEntries.filter(([,catalog])=>!!catalog).length,catalogInputs:catalogInputHashes},
  sweep:{desktopRoutedRecords:new Set(desktopStates.filter(state=>state.scenario==='initial-compact').map(state=>`${state.routeRecord.collection}:${state.routeRecord.id}`)).size,desktopRenderStates:desktopStates.length,mobileRepresentativeRecords:new Set(mobileStates.filter(state=>!state.failure).map(state=>`${state.routeRecord.collection}:${state.routeRecord.id}`)).size,renderStates:allStates.length,renderedInlineControls:controlsByKey.size,controlObservations:[...controlsByKey.values()].reduce((sum,control)=>sum+control.observations.length,0),visibleObservations:[...controlsByKey.values()].flatMap(control=>control.observations).filter(observation=>observation.visible).length,hiddenObservations:[...controlsByKey.values()].flatMap(control=>control.observations).filter(observation=>!observation.visible).length,hiddenReasons:[...new Set([...controlsByKey.values()].flatMap(control=>control.observations.flatMap(observation=>observation.hiddenReasons)))].sort(),routeFailures},
  payloadAudit:{valid:validationIssues.length===0,issueCount:validationIssues.length,issueCounts:statusCounts,issues:validationIssues,uniqueTargetsFromRenderedControls:currentTargets.size,uniqueTargetsFromCollector:expectedTargets.size,expectedFieldTargets:expectedFieldTargets.length,renderedExpectedFieldTargets:expectedFieldTargets.length-unrenderedFieldTargets.length,unrenderedExpectedFieldTargets:unrenderedFieldTargets.length,unrenderedFieldTargetDetails:unrenderedFieldTargets.map(entry=>({...entry,target:targetProjection(entry.target)}))},
  unrenderedTargetExposure:targetExposure.filter(entry=>entry.exposure!=='rendered-inline').map(entry=>({...entry,target:targetProjection(entry.target)})),
  targetPayloads:[...targetPayloadTable.values()].sort((a,b)=>a.targetId.localeCompare(b.targetId)),
  controls:reportControls.sort((a,b)=>a.routeRecord.collection.localeCompare(b.routeRecord.collection)||a.routeRecord.itemId.localeCompare(b.routeRecord.itemId)||a.controlId.localeCompare(b.controlId)),
  renderStates:allStates.map(state=>({routeRecord:state.routeRecord,scenario:state.scenario,viewport:state.viewport,renderedControlCount:state.renderedControlCount,visibleControlCount:state.visibleControlCount,hiddenControlCount:state.hiddenControlCount,controlIds:(state.controls||[]).map(control=>`inline-${createHash('sha256').update(JSON.stringify({routeRecord:control.routeRecord,contextOwner:control.contextOwner,detailOwner:control.detailOwner,fieldLabel:control.fieldLabel,xpLevel:control.xpLevel||'',attributeLayout:control.attributeLayout||'',containerKinds:control.containerKinds||[],ordinal:control.ordinal,buttonText:control.buttonText,referenceTitle:control.referenceTitle,book:control.book,pages:control.pages,targets:control.targets})).digest('hex').slice(0,18)}`)})),
  failures:{browserErrors}
 };
 report.provenance.distFilesUnmodified=Buffer.compare(sourceDataBytes,await readFile(path.join(distRoot,'data.json')))===0&&Buffer.compare(appBytes,await readFile(path.join(distRoot,'app.js')))===0&&Buffer.compare(citationApiBytes,await readFile(path.join(distRoot,'citations.js')))===0; // attachment is held in memory only.
 const serialized=JSON.stringify(report,null,2)+'\n';
 const writeArg=process.argv.indexOf('--write');
 if(writeArg>=0){const outputPath=process.argv[writeArg+1];if(!outputPath)throw new Error('Usage: node tests/citation-browser-inventory.mjs --write research/citation-browser-inventory.json');await writeFile(path.resolve(repoRoot,outputPath),serialized);}
 else process.stdout.write(serialized);
 if(routeFailures.length||validationIssues.length||browserErrors.length)process.exitCode=1;
}finally{
 await browser.close();await new Promise(resolve=>staticServer.close(resolve));
}
