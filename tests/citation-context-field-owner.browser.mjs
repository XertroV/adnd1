import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {attachEvidenceBindings,buildPriceSourceInventory,validatePriceSourceInventory} from '../tools/price-source-inventory.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const dataBytes=await readFile(path.join(dist,'data.json')),data=JSON.parse(dataBytes);
const inventory=buildPriceSourceInventory({equipment:data.equipment,data});validatePriceSourceInventory(inventory,{equipment:data.equipment,data});attachEvidenceBindings(data,inventory);
const bindings=inventory.fieldEvidenceBindings;
const server=http.createServer(async(req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(pathname==='/data.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;}const file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(dist+path.sep))throw Error();const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const observations=[],browserErrors=[],reloadScenarios=new Set();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});page.setDefaultTimeout(15000);page.on('pageerror',error=>browserErrors.push(error.message));
 await page.goto(`${origin}/#classes/fighter`);await page.locator('#referenceDetail .detail-card').waitFor();
 const recordForBinding=(binding)=>binding.collection==='progressionExplainer'?data.progressionExplainer:(Array.isArray(data[binding.collection])?data[binding.collection].find(item=>item.id===binding.itemId):null);
 const findOrigin=(target)=>{
  const matches=bindings.filter(binding=>binding.fieldPointer===target.fieldPointer&&binding.book===target.book&&Number(binding.printedPage)===Number(target.page)&&binding.catalog===target.catalog&&JSON.stringify(binding.regionIds||[])===JSON.stringify(target.regionIds||[]));
  return matches[0]?{collection:matches[0].collection,itemId:matches[0].itemId}:null;
 };
 const parsedRoute=hash=>{
  const [pathname,query='']=hash.slice(1).split('?',2),params=new URLSearchParams(query);
  return {path:pathname,source:params.get('source'),owner:params.get('owner'),field:params.get('field'),fieldOwner:params.get('fieldOwner'),target:params.get('target'),region:params.get('region')};
 };
 const closeViewer=async()=>{
  const dialog=page.locator('dialog.source-viewer');
  if(await dialog.evaluate(element=>element.open).catch(()=>false))await dialog.locator('.source-viewer-close').click();
  await page.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
  await page.waitForFunction(()=>!new URLSearchParams(location.hash.split('?',2)[1]||'').has('source'));
 };
 const replay=async(hash,expected)=>{
  await page.evaluate(next=>{location.hash=next;},hash);await page.waitForTimeout(120);
  let opened=false;try{await page.locator('dialog.source-viewer[open]').waitFor({timeout:1800});opened=true;}catch{}
  if(!opened)return {opened:false,viewerItem:'',labels:'',notice:'',actualHash:await page.evaluate(()=>location.hash)};
  const dialog=page.locator('dialog.source-viewer[open]');
  const result={opened:true,viewerItem:await dialog.locator('.source-viewer-item').innerText().catch(()=>''),labels:await dialog.locator('.source-viewer-labels').innerText().catch(()=>''),notice:await dialog.locator('.source-viewer-target-notice').innerText().catch(()=>''),actualHash:await page.evaluate(()=>location.hash)};
  await closeViewer();
  return result;
 };
 const probeButton=async({routeRecord,locator,ordinal,scenario})=>{
  const button=locator.nth(ordinal);
  let metadata=await button.evaluate(element=>{
   let targets=[];try{targets=JSON.parse(element.dataset.refTargets||'[]');}catch{}
   const context=element.closest('[data-source-context]'),detail=element.closest('[data-annotation-target]');
   return {contextOwner:context?{collection:context.dataset.sourceView||'classes',itemId:context.dataset.sourceContext}:null,detailOwner:detail?.dataset.annotationTarget||'',referenceTitle:element.dataset.refTitle||'',buttonText:element.innerText.trim(),targets};
  });
  const fieldTarget=metadata.targets.find(target=>target.fieldPointer);if(!fieldTarget)return null;
  const fieldOwner=findOrigin(fieldTarget);
  await button.click();await page.locator('dialog.source-viewer[open]').waitFor();
  const clickedHash=await page.evaluate(()=>location.hash),clickedRoute=parsedRoute(clickedHash);
  const copyButton=page.locator('dialog.source-viewer[open]').getByRole('button',{name:'Copy link to this source page'});
  let copiedHash='';if(await copyButton.isVisible().catch(()=>false)){await copyButton.click();copiedHash=await page.evaluate(async()=>new URL(await navigator.clipboard.readText()).hash).catch(()=>{});}
  await closeViewer();
  let reloaded=null;
  const reloadKey=scenario==='progression-explainer'?'progression-explainer':scenario.startsWith('fighter-matrix')?'fighter-matrix':scenario==='equipment-comparison'?'equipment-comparison':'';
  if(reloadKey&&!reloadScenarios.has(reloadKey)){
   reloadScenarios.add(reloadKey);await page.goto(`${origin}/${clickedHash}`);
   let opened=false;try{await page.locator('dialog.source-viewer[open]').waitFor({timeout:4000});opened=true;}catch{}
   if(opened){const dialog=page.locator('dialog.source-viewer[open]');reloaded={opened:true,viewerItem:await dialog.locator('.source-viewer-item').innerText().catch(()=>''),labels:await dialog.locator('.source-viewer-labels').innerText().catch(()=>''),actualHash:await page.evaluate(()=>location.hash)};await closeViewer();}
   else reloaded={opened:false,viewerItem:'',labels:'',actualHash:await page.evaluate(()=>location.hash)};
  }
  const replayed=await replay(clickedHash,fieldTarget);
  return {scenario,routeRecord,buttonOrdinal:ordinal,uiPath:{contextOwner:metadata.contextOwner,detailOwner:metadata.detailOwner,referenceTitle:metadata.referenceTitle,buttonText:metadata.buttonText},fieldTarget:{book:fieldTarget.book,page:fieldTarget.page,fieldPointer:fieldTarget.fieldPointer,fieldOwner:fieldTarget.fieldOwner||fieldOwner,sourceOwner:fieldTarget.sourceOwner||null,catalog:fieldTarget.catalog||'',regionIds:fieldTarget.regionIds||[],targetStatus:fieldTarget.targetStatus||'',reviewStatus:fieldTarget.reviewStatus||'',label:fieldTarget.label||''},clickedHash,clickedRoute,copiedHash,reloaded,replayed};
 };
 const navigate=async(view,id)=>{
  const hash=`#${view}/${encodeURIComponent(id)}`;await page.evaluate(next=>{location.hash=next;},hash);await page.waitForFunction(value=>location.hash===value,hash);await page.waitForFunction(()=>!!document.querySelector('#referenceDetail .detail-card'));
 };

 for(const classItem of data.classes){
  await navigate('classes',classItem.id);
  await page.locator('.progression-explainer').evaluate(element=>{element.open=true;});
  const controls=page.locator('.progression-explainer [data-inline-source]');
  const count=await controls.count();
  for(let index=0;index<count;index++){
   const rows=await controls.evaluateAll(elements=>elements.map(element=>{let targets=[];try{targets=JSON.parse(element.dataset.refTargets||'[]');}catch{}return targets.some(target=>target.fieldPointer);}));
   if(!rows[index])continue;
   const row=await probeButton({routeRecord:{collection:'classes',itemId:classItem.id},locator:controls,ordinal:index,scenario:'progression-explainer'});
   if(row)observations.push(row);
   await navigate('classes',classItem.id);await page.locator('.progression-explainer').evaluate(element=>{element.open=true;});
  }
 }

 const fighter=data.classes.find(item=>item.id==='fighter');
 if(fighter){
  await navigate('classes','fighter');const level=page.locator('#targetLevel');const values=await level.locator('option').evaluateAll(options=>options.map(option=>option.value));
  for(const value of values){
   await level.selectOption(value);await page.locator('.fighter-combat').waitFor();
   await page.locator('.fighter-combat details').evaluateAll(elements=>elements.forEach(element=>{element.open=true;}));
   const matrixControls=page.locator('.fighter-combat [data-inline-source]');const matrixCount=await matrixControls.count();
   for(let index=0;index<matrixCount;index++){
    const hasField=await matrixControls.nth(index).evaluate(element=>{try{return JSON.parse(element.dataset.refTargets||'[]').some(target=>target.fieldPointer);}catch{return false;}});if(!hasField)continue;
    const row=await probeButton({routeRecord:{collection:'classes',itemId:'fighter'},locator:matrixControls,ordinal:index,scenario:`fighter-matrix-level-${value}`});if(row)observations.push(row);
    await navigate('classes','fighter');await page.locator('#targetLevel').selectOption(value);await page.locator('.fighter-combat').waitFor();await page.locator('.fighter-combat details').evaluateAll(elements=>elements.forEach(element=>{element.open=true;}));
   }
  }
 }

 for(const item of data.equipment){
  const comparisons=item.suggestedPrice?.comparisons||[];
  if(!comparisons.some(comparison=>(comparison.evidenceBindings||[]).some(binding=>binding.fieldPointer)))continue;
  await navigate('equipment',item.id);const controls=page.locator('.suggested-price [data-inline-source]');const count=await controls.count();
  for(let index=0;index<count;index++){
   const hasField=await controls.nth(index).evaluate(element=>{try{return JSON.parse(element.dataset.refTargets||'[]').some(target=>target.fieldPointer);}catch{return false;}});if(!hasField)continue;
   const row=await probeButton({routeRecord:{collection:'equipment',itemId:item.id},locator:controls,ordinal:index,scenario:'equipment-comparison'});if(row)observations.push(row);
   await navigate('equipment',item.id);
  }
 }

 const unique=new Map();for(const row of observations){const key=JSON.stringify([row.routeRecord,row.scenario,row.uiPath.contextOwner,row.fieldTarget.fieldPointer,row.fieldTarget.book,row.fieldTarget.page,row.fieldTarget.regionIds,row.fieldTarget.label,row.buttonOrdinal]);unique.set(key,row);}
 const entries=[...unique.values()];
 const routeOwnerFor=owner=>owner?.collection==='progressionExplainer'?{view:'classes',id:'progression-explainer'}:owner?{view:owner.collection,id:owner.itemId}:null;
 const routeFieldOwnerFor=row=>row.fieldTarget.fieldOwner&&(row.fieldTarget.fieldOwner.collection!==row.routeRecord.collection||row.fieldTarget.fieldOwner.itemId!==row.routeRecord.itemId)?`${row.fieldTarget.fieldOwner.collection}:${row.fieldTarget.fieldOwner.itemId}`:null;
 const routeSourceOwnerFor=row=>{const owner=routeOwnerFor(row.fieldTarget.sourceOwner);return owner&&(owner.view!==row.routeRecord.collection||owner.id!==row.routeRecord.itemId)?`${owner.view}:${owner.id}`:null;};
 const titleForOwner=owner=>{if(!owner)return '';const item=recordForBinding(owner);return item?.name||item?.title||'';};
 const summary={observations:entries.length,byScenario:Object.fromEntries([...new Set(entries.map(row=>row.scenario))].map(scenario=>[scenario,entries.filter(row=>row.scenario===scenario).length])),urlMissingFieldPointer:entries.filter(row=>!row.clickedRoute.field).length,fieldOwnerMismatch:entries.filter(row=>row.clickedRoute.fieldOwner!==routeFieldOwnerFor(row)).length,sourceOwnerMismatch:entries.filter(row=>row.clickedRoute.owner!==routeSourceOwnerFor(row)).length,ownerNamespaceNotRouteable:entries.filter(row=>row.clickedRoute.owner&& !['rules','spells','equipment','classes','matrices'].includes(decodeURIComponent(row.clickedRoute.owner).split(':')[0])).length,roundTripMisses:entries.filter(row=>!row.replayed.opened||!row.replayed.labels.includes(row.fieldTarget.label)||row.replayed.viewerItem!==titleForOwner(row.fieldTarget.sourceOwner)).length,copyMismatch:entries.filter(row=>row.copiedHash!==row.clickedHash).length,browserErrors};
 const reloadRows=entries.filter(row=>row.reloaded),reloadFailures=reloadRows.filter(row=>!row.reloaded.opened||!row.reloaded.labels.includes(row.fieldTarget.label)||row.reloaded.viewerItem!==titleForOwner(row.fieldTarget.sourceOwner));
 summary.actualReloadChecks=reloadRows.length;summary.actualReloadMisses=reloadFailures.length;
 const report={schemaVersion:1,purpose:'Full rendered contextual field citation regression over progression explainer, fighter matrix and equipment comparison controls, including copy, same-page replay and representative actual reloads.',provenance:{gitHead:(await import('node:child_process')).execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceDataSha256:createHash('sha256').update(dataBytes).digest('hex'),appSha256:createHash('sha256').update(await readFile(path.join(dist,'app.js'))).digest('hex'),citationsSha256:createHash('sha256').update(await readFile(path.join(dist,'citations.js'))).digest('hex'),sourceViewerSha256:createHash('sha256').update(await readFile(path.join(dist,'source-viewer.js'))).digest('hex'),browserVersion:browser.version(),inventoryBindings:inventory.counts.fieldEvidenceBindings},summary,observations:entries};
 if(process.argv.includes('--write-current')){const output=process.argv[process.argv.indexOf('--write-current')+1];if(!output)throw new Error('Use --write-current <path>');await writeFile(path.resolve(root,output),JSON.stringify(report,null,2)+'\n');}
 if(process.argv.includes('--capture-baseline')){const output=process.argv[process.argv.indexOf('--capture-baseline')+1];if(!output)throw new Error('Use --capture-baseline <path>');await writeFile(path.resolve(root,output),JSON.stringify(report,null,2)+'\n');}
 else{
  assert.equal(browserErrors.length,0);
  assert.equal(summary.observations,146,'all rendered contextual field citation controls remain in the denominator');
  assert.equal(summary.urlMissingFieldPointer,0);
  assert.equal(summary.fieldOwnerMismatch,0);
  assert.equal(summary.sourceOwnerMismatch,0);
  assert.equal(summary.ownerNamespaceNotRouteable,0);
  assert.equal(summary.roundTripMisses,0);
  assert.equal(summary.copyMismatch,0);
  assert.equal(summary.actualReloadChecks,3);
  assert.equal(summary.actualReloadMisses,0);
 }
 console.log(`Probed ${summary.observations} contextual field links: ${summary.fieldOwnerMismatch} field-owner mismatches, ${summary.sourceOwnerMismatch} source-owner mismatches, ${summary.roundTripMisses} replay misses.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
