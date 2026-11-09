import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../');
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8768';
const read=relative=>readFileSync(path.join(root,relative));
const json=relative=>JSON.parse(read(relative));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let assertionCount=0;
const check=(condition,message)=>{assert.ok(condition,message);assertionCount++;};

const appPath='dist/app.js';
const appPreimage=read(appPath).toString('utf8');
const patchSpec=[
 [' const tableContext=item.table?.sourceContext;',' const tableContext=item.table?.sourceContext||item.sourceContext;'],
 ['function originalScansButton(item){const context=item.table?.sourceContext;','function originalScansButton(item){const context=item.table?.sourceContext||item.sourceContext;'],
 ["  let initialReference=target.source,activeTarget=null,targets=FirstEditionCitations.targets(item),fieldScoped=!!target.source.fieldPointer;", "  let initialReference=target.source,activeTarget=null,targets=FirstEditionCitations.targets(item),fieldScoped=!!target.source.fieldPointer;\n  const primarySourceContext=item?.table?.sourceContext||item?.sourceContext;\n  if(!fieldScoped&&!initialReference.region&&primarySourceContext&&bookCode(primarySourceContext.book)===initialReference.book&&Number(primarySourceContext.printedPage)===initialReference.page&&typeof primarySourceContext.regionId==='string')initialReference={...initialReference,region:primarySourceContext.regionId};"],
];
let overlayApp=appPreimage;
for(const [before,after] of patchSpec){check(overlayApp.split(before).length===2,`patch anchor missing or nonunique: ${before}`);overlayApp=overlayApp.replace(before,after);}
const baseData=json('dist/data.json');
const v4Records=json('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/rules-records-candidate-final-v4.json').records;
const phbCatalog=json('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/catalogs/rules-phb-hurled-weapons-and-missiles-table.json');
const uaCatalog=json('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/catalogs/rules-ua-hurled-weapons-and-missiles-table.json');
const dmgCatalog=json('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/catalogs/rules-weapon-versus-armor-adjustments-v2.json');
const continuation=json('research/missile-table-discoverability/implementation-candidate/continuation-group-candidate.json');
const newData=structuredClone(baseData);
const sourceExcerpt=(catalogPath,regionCount,scope='Test-only in-memory candidate overlay. No production source or grade claim.')=>({collection:'rules',state:'source-excerpt-checked',catalog:catalogPath,regionCount,scope});
for(const record of v4Records){
 const catalogPath=`scans/verified/rules-${record.id}.json`;
 record.sourceExcerpts=sourceExcerpt(catalogPath,record.id.startsWith('phb-')?phbCatalog.regions.length:uaCatalog.regions.length);
 newData.rules.push(record);
}
const dmg=newData.rules.find(record=>record.id==='weapon-versus-armor-adjustments');
assert.ok(dmg,'current DMG rule must exist');
dmg.sourceContext={book:'DMG',printedPage:28,regionId:'dmg-28-opening-8b67aa025e19eddd'};
dmg.sourceExcerpts={...dmg.sourceExcerpts,regionCount:dmgCatalog.regions.length};
const mismatchCatalog={...structuredClone(dmgCatalog),itemId:'source-context-mismatch-control'};
const mismatchRecord={id:'source-context-mismatch-control',title:'Synthetic source-context mismatch control',category:'Combat',book:'DMG',pages:[28,29],sourceReferences:[{book:'DMG',pages:[28,29]}],sourceContext:{book:'DMG',printedPage:28,regionId:'dmg-28-opening-8b67aa025e19eddd'},sourceExcerpts:sourceExcerpt('scans/verified/rules-source-context-mismatch-control.json',mismatchCatalog.regions.length)};
newData.rules.push(mismatchRecord);
const bookMismatchCatalog={...structuredClone(dmgCatalog),itemId:'source-context-book-mismatch-control'};
const bookMismatchRecord={id:'source-context-book-mismatch-control',title:'Synthetic source-context book mismatch control',category:'Combat',book:'PHB',pages:[28],sourceReferences:[{book:'PHB',pages:[28]},{book:'DMG',pages:[28]}],sourceContext:{book:'DMG',printedPage:28,regionId:'dmg-28-opening-8b67aa025e19eddd'},sourceExcerpts:sourceExcerpt('scans/verified/rules-source-context-book-mismatch-control.json',bookMismatchCatalog.regions.length)};
newData.rules.push(bookMismatchRecord);
const continuationManifest=json('dist/source-continuations.json');
continuationManifest.groups.push(continuation);

const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const checks=[];
const record=(name,details)=>checks.push({name,...details});
const addCandidateRoutes=async page=>{
 await page.route('**/app.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:overlayApp}));
 await page.route('**/data.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(newData)}));
 await page.route('**/source-continuations.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(continuationManifest)}));
 await page.route('**/scans/verified/rules-phb-hurled-weapons-and-missiles-table.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(phbCatalog)}));
 await page.route('**/scans/verified/rules-ua-hurled-weapons-and-missiles-table.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(uaCatalog)}));
 await page.route('**/scans/verified/rules-weapon-versus-armor-adjustments.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(dmgCatalog)}));
 await page.route('**/scans/verified/rules-source-context-mismatch-control.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mismatchCatalog)}));
 await page.route('**/scans/verified/rules-source-context-book-mismatch-control.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bookMismatchCatalog)}));
 const continuationImage=read('research/missile-table-discoverability/implementation-candidate/catalogs/dmg-28-c37135485e89a720.png');
 await page.route('**/scans/verified/dmg-28-c37135485e89a720.png*',route=>route.fulfill({status:200,contentType:'image/png',body:continuationImage}));
};
const browserState=async page=>{
 await page.locator('dialog.source-viewer[open]').waitFor();
 try{await page.waitForFunction(()=>{
  const status=document.querySelector('.source-viewer-status')?.textContent||'';
  const img=document.querySelector('.source-viewer-scan');
  return !/Loading|Rendering/.test(status)&&!!img?.dataset.regionId;
 },null,{timeout:20000});}catch(error){console.log('viewer debug',JSON.stringify({state:await page.evaluate(()=>({route:location.hash,body:document.querySelector('dialog.source-viewer[open]')?.innerText?.slice(0,4000),status:document.querySelector('.source-viewer-status')?.textContent,excerptNotice:document.querySelector('.source-viewer-excerpt-notice')?.textContent,image:document.querySelector('.source-viewer-scan')?.outerHTML?.slice(0,500)})),requests:page.__requests||[]}));throw error;}
 await page.waitForTimeout(250);
  return page.evaluate(()=>{const activeMode=document.querySelector('.source-viewer-modes button[aria-pressed="true"]')?.textContent?.trim()||null;const mountedImage=document.querySelector('.source-viewer-scan')?.dataset.regionId||null;return {route:location.hash,pageTitle:document.querySelector('.source-viewer-page-title')?.textContent?.trim()||'',status:document.querySelector('.source-viewer-status')?.textContent?.trim()||'',imageRegion:activeMode==='View excerpts'?mountedImage:null,mountedImageRegion:mountedImage,linkedPartIds:[...document.querySelectorAll('.source-viewer-linked-part')].map(part=>part.dataset.regionId),regionLabels:[...document.querySelectorAll('#source-viewer-region option')].map(option=>option.textContent.trim()),targetNotice:document.querySelector('.source-viewer-target-notice')?.textContent?.trim()||'',activeMode,viewerText:document.querySelector('dialog.source-viewer[open]')?.innerText?.slice(0,2500)||''};});
};
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:1000}});
 desktop.__requests=[];desktop.on('requestfailed',request=>desktop.__requests.push({failed:request.url(),error:request.failure()?.errorText}));desktop.on('response',response=>{if(/data\.json|app\.js|weapon-versus-armor|continuation|dmg-28-c371/.test(response.url()))desktop.__requests.push({status:response.status(),url:response.url()});});desktop.on('console',message=>{if(message.type()==='error')desktop.__requests.push({console:message.text()});});desktop.on('pageerror',error=>desktop.__requests.push({pageerror:error.message}));
 await addCandidateRoutes(desktop);
 await desktop.context().grantPermissions(['clipboard-read','clipboard-write']);
 await desktop.goto(`${base}/#rules/weapon-versus-armor-adjustments`);await desktop.locator('#referenceDetail h2').waitFor();
 const dmgh=desktop.locator('#referenceDetail [data-source-id="weapon-versus-armor-adjustments"]').first();
 check(await dmgh.getAttribute('data-source-region')==='dmg-28-opening-8b67aa025e19eddd','DMG header source chip carries precise opening region');
 await dmgh.click();let state=await browserState(desktop);
 check(state.imageRegion==='dmg-28-opening-8b67aa025e19eddd'&&JSON.stringify(state.linkedPartIds)===JSON.stringify(['dmg-28-opening-8b67aa025e19eddd','dmg-28-c37135485e89a720']),'header source chip opens ordered two-part DMG28 note');
 record('desktop-header-chip',state);
 await desktop.locator('.source-viewer-header-actions [aria-label="Copy link to this source page"]').click();
 const copied=await desktop.evaluate(()=>navigator.clipboard.readText());
 check(copied.includes('#rules/weapon-versus-armor-adjustments?source=DMG%3A28&region=dmg-28-opening-8b67aa025e19eddd'),'copied DMG28 route keeps the precise opening region');
 await desktop.reload();state=await browserState(desktop);
 check(state.imageRegion==='dmg-28-opening-8b67aa025e19eddd'&&state.linkedPartIds.length===2,'copied/reloaded route preserves opening and linked continuation');record('desktop-copy-reload',state);
 await desktop.goBack();await desktop.waitForFunction(()=>location.hash==='#rules/weapon-versus-armor-adjustments');
 check(!await desktop.locator('dialog.source-viewer').evaluate(dialog=>dialog.open),'Back returns from source route to the DMG rule');
 await desktop.goForward();state=await browserState(desktop);
 check(state.imageRegion==='dmg-28-opening-8b67aa025e19eddd'&&state.linkedPartIds.length===2,'Forward restores the two-part DMG28 source route');record('desktop-history-forward',state);
 await desktop.locator('.source-viewer-close').click();await desktop.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
 await desktop.locator('[data-view-scans="weapon-versus-armor-adjustments"]').click();state=await browserState(desktop);
 check(state.imageRegion==='dmg-28-opening-8b67aa025e19eddd'&&state.linkedPartIds.length===2,'Original Scans opens opening plus continuation');record('desktop-original-scans',state);
 await desktop.goto(`${base}/#rules/weapon-versus-armor-adjustments?source=DMG%3A28`);state=await browserState(desktop);
 check(state.imageRegion==='dmg-28-opening-8b67aa025e19eddd'&&state.linkedPartIds.length===2,'bare DMG28 permalink inherits exact primary opening');record('desktop-bare-route',state);
 await desktop.goto(`${base}/#rules/weapon-versus-armor-adjustments?source=DMG%3A28&region=dmg-28-8b67aa025e19eddd`);state=await browserState(desktop);
 check(state.imageRegion==='dmg-28-8b67aa025e19eddd'&&state.linkedPartIds.length===0,'explicit legacy region permalink still opens only the unchanged legacy image');record('desktop-legacy-permalink',state);

 await desktop.goto(`${base}/#rules/weapon-versus-armor-adjustments?source=DMG%3A28&target=pending&field=%2Fbullets%2F0`);
 await desktop.locator('dialog.source-viewer[open] .source-viewer-target-notice').waitFor();
 await desktop.waitForFunction(()=>document.querySelector('.source-viewer-target-notice')?.textContent.includes('no reviewed excerpt mapping yet'));
 state=await desktop.evaluate(()=>({route:location.hash,pageTitle:document.querySelector('.source-viewer-page-title')?.textContent?.trim()||'',targetNotice:document.querySelector('.source-viewer-target-notice')?.textContent?.trim()||'',activeMode:document.querySelector('.source-viewer-modes button[aria-pressed="true"]')?.textContent?.trim()||null,viewerText:document.querySelector('dialog.source-viewer[open]')?.innerText?.slice(0,2500)||''}));
 check(!state.route.includes('region=')&&state.targetNotice.includes('no reviewed excerpt mapping yet')&&state.activeMode==='Your PDF'&&state.viewerText.includes('Weapon adjustments are against armor type'),'pending field target stays on PDF with its source owner and does not inherit owner default');record('pending-field-target-negative',state);
 await desktop.goto(`${base}/#rules/source-context-mismatch-control?source=DMG%3A29`);
 await desktop.locator('dialog.source-viewer[open]').waitFor();await desktop.waitForTimeout(400);
 state=await desktop.evaluate(()=>{const activeMode=document.querySelector('.source-viewer-modes button[aria-pressed="true"]')?.textContent?.trim()||null;const mountedImageRegion=document.querySelector('.source-viewer-scan')?.dataset.regionId||null;return {route:location.hash,pageTitle:document.querySelector('.source-viewer-page-title')?.textContent?.trim()||'',imageRegion:activeMode==='View excerpts'?mountedImageRegion:null,mountedImageRegion,regionSelect:document.querySelector('#source-viewer-region')?.value||null,activeMode};});
 check(!state.route.includes('region=')&&state.pageTitle.includes('printed p. 29')&&state.activeMode==='Your PDF','different-page sourceContext is ignored for an exact page mismatch');record('different-page-negative',state);
 await desktop.goto(`${base}/#rules/source-context-book-mismatch-control?source=PHB%3A28`);await desktop.locator('dialog.source-viewer[open]').waitFor();await desktop.waitForTimeout(350);
 state=await desktop.evaluate(()=>{const activeMode=document.querySelector('.source-viewer-modes button[aria-pressed="true"]')?.textContent?.trim()||null;const mountedImageRegion=document.querySelector('.source-viewer-scan')?.dataset.regionId||null;return {route:location.hash,pageTitle:document.querySelector('.source-viewer-page-title')?.textContent?.trim()||'',targetNotice:document.querySelector('.source-viewer-target-notice')?.textContent?.trim()||'',imageRegion:activeMode==='View excerpts'?mountedImageRegion:null,mountedImageRegion,activeMode};});
 check(!state.route.includes('region=')&&state.pageTitle.includes('Players Handbook · printed p. 28')&&state.activeMode==='Your PDF','different-book sourceContext is ignored for an exact book mismatch');record('different-book-negative',state);

 for(const [id,regionId,book,pageNo,catalogName] of [
  ['phb-hurled-weapons-and-missiles-table','phb38-table-context','PHB','38','PHB'],
  ['ua-hurled-weapons-and-missiles-table','ua28-table-context','UA','28','UA'],
 ]){
  await desktop.goto(`${base}/#rules/${id}`);await desktop.locator('#referenceDetail h2').waitFor();
  const citation=desktop.locator(`#referenceDetail [data-source-id="${id}"]`).filter({has:desktop.locator(`[data-source-page="${pageNo}"]`)}).first();
  const pageChip=desktop.locator(`#referenceDetail [data-source-id="${id}"][data-source-page="${pageNo}"]`).first();
  check(await pageChip.getAttribute('data-source-region')===regionId,`${catalogName} table chip keeps whole-table context id`);
  await pageChip.click();state=await browserState(desktop);
  check(state.imageRegion===regionId,`${catalogName} whole-table click defaults to its unmarked complete context region`);
  record(`${catalogName.toLowerCase()}-whole-table-default`,state);
  await desktop.locator('.source-viewer-close').click();await desktop.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
 }

 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await addCandidateRoutes(mobile);await mobile.context().grantPermissions(['clipboard-read','clipboard-write']);
 await mobile.goto(`${base}/#rules/weapon-versus-armor-adjustments`);await mobile.locator('#referenceDetail h2').waitFor();
 await mobile.locator('#referenceDetail [data-source-id="weapon-versus-armor-adjustments"]').first().click();state=await browserState(mobile);
 check(state.imageRegion==='dmg-28-opening-8b67aa025e19eddd'&&JSON.stringify(state.linkedPartIds)===JSON.stringify(['dmg-28-opening-8b67aa025e19eddd','dmg-28-c37135485e89a720']),'mobile source chip opens the same two-part DMG28 note');record('mobile-header-chip',state);
 await mobile.locator('.source-viewer-header-actions [aria-label="Copy link to this source page"]').click();
 check((await mobile.evaluate(()=>navigator.clipboard.readText())).includes('region=dmg-28-opening-8b67aa025e19eddd'),'mobile copy link retains the primary opening');
 await mobile.reload();state=await browserState(mobile);check(state.linkedPartIds.length===2,'mobile reload preserves the linked passage');record('mobile-copy-reload',state);
 await mobile.locator('.source-viewer-close').click();await mobile.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
 await mobile.locator('[data-view-scans="weapon-versus-armor-adjustments"]').click();state=await browserState(mobile);check(state.linkedPartIds.length===2,'mobile Original Scans opens the same two parts');record('mobile-original-scans',state);
 await mobile.goto(`${base}/#rules/weapon-versus-armor-adjustments?source=DMG%3A28`);state=await browserState(mobile);check(state.linkedPartIds.length===2&&state.imageRegion==='dmg-28-opening-8b67aa025e19eddd','mobile bare route uses sourceContext primary region');record('mobile-bare-route',state);
 await mobile.goBack();state=await browserState(mobile);check(state.linkedPartIds.length===2&&state.imageRegion==='dmg-28-opening-8b67aa025e19eddd','mobile Back restores the previous Original Scans source route');record('mobile-history-back',state);
 await mobile.goForward();state=await browserState(mobile);check(state.linkedPartIds.length===2&&state.imageRegion==='dmg-28-opening-8b67aa025e19eddd','mobile Forward restores the bare-page default route');record('mobile-history-forward',state);

 const output={schemaVersion:1,artifactType:'isolated-current-base-source-context-after-control',status:'Research overlay only: app patch and candidate owner/catalog/continuation data were request-intercepted in memory; no dist or production input was written.',baseCommit:'4aa977788085f67a28a24d40965edf987bc7242b',preimageAppSha256:sha(read(appPath)),inMemoryAppPatchPath:'research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/proposed-generic-source-context-routing-v2.patch',inMemoryAppPatchSha256:sha(read('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/proposed-generic-source-context-routing-v2.patch')),candidateInputs:{phbCatalogSha256:sha(read('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/catalogs/rules-phb-hurled-weapons-and-missiles-table.json')),uaCatalogSha256:sha(read('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/catalogs/rules-ua-hurled-weapons-and-missiles-table.json')),dmgCatalogSha256:sha(read('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/catalogs/rules-weapon-versus-armor-adjustments-v2.json')),continuationGroupSha256:sha(read('research/missile-table-discoverability/implementation-candidate/continuation-group-candidate.json'))},assertionCount,checks,claim:'Header chips, Original Scans, and bare DMG28 page routes select the exact opening and its ordered top-right continuation in this isolated overlay. Explicit legacy ID remains singleton. Pending field target and mismatched-book/page sourceContext controls do not inherit the primary default. PHB38 and UA28 whole-table clicks select their explicit unmarked complete-table regions.'};
 const outputPath=path.join(here,'current-base-source-context-after-control-v2.json');writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({output:outputPath,assertionCount,recordedStates:checks.length,checks:checks.map(item=>({name:item.name,route:item.route,imageRegion:item.imageRegion,linkedPartIds:item.linkedPartIds,targetNotice:item.targetNotice,activeMode:item.activeMode})),inputs:{app:output.preimageAppSha256,patch:output.inMemoryAppPatchSha256}},null,2));
 await desktop.close();await mobile.close();
}finally{await browser.close();}
