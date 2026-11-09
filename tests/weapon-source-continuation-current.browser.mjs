// Native compiled-site browser proof. No request interception or injected data.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const base=(process.env.TEST_URL||'http://127.0.0.1:8778').replace(/\/$/,''),runId=new Date().toISOString().replace(/[^0-9]/g,'')+'-'+process.pid;
const resultPath=process.env.BROWSER_RESULT_PATH||`research/missile-table-discoverability/weapon-native-dmg28-continuation-browser-${runId}.json`;
const screenshotDir=resolve(process.env.BROWSER_EVIDENCE_DIR||'/workspace/vault-audit-private/pass8/root/weapon-integration-v1/native-dmg28-continuation',runId);mkdirSync(screenshotDir,{recursive:true});
const dmgId='weapon-versus-armor-adjustments',phbId='phb-hurled-weapons-and-missiles-table',opening='dmg-28-opening-8b67aa025e19eddd',continuation='dmg-28-c37135485e89a720',legacy='dmg-28-8b67aa025e19eddd',pair=[opening,continuation];
const proofPaths=['research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/current-base-source-context-after-control-v2.json','research/missile-table-discoverability/authored-activation-cc950-v1/current-cc950-source-context-after-control-v1.json','research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/run-current-base-source-context-after-control.mjs'];
const preservedProofs=proofPaths.map(path=>({path,sha256:sha(read(path)),sizeBytes:read(path).length}));
const rootRunnerPath='tests/weapon-source-current.browser.mjs',rootRunnerSha256=sha(read(rootRunnerPath));
const data=JSON.parse(read('dist/data.json')),dmg=data.rules.find(item=>item.id===dmgId),phb=data.rules.find(item=>item.id===phbId),dmgCatalog=JSON.parse(read('dist/'+dmg.sourceExcerpts.catalog)),phbCatalog=JSON.parse(read('dist/'+phb.sourceExcerpts.catalog));
assert.equal(dmg.sourceContext.regionId,opening);assert.equal(phb.table.sourceContext.regionId,'phb38-table-context');
const assetPaths=['data.json','app.js','source-viewer.js','citations.js','search.js','books.js','source-continuations.json',dmg.sourceExcerpts.catalog,phb.sourceExcerpts.catalog,...new Set([...dmgCatalog.regions,...phbCatalog.regions].map(region=>'scans/verified/'+region.image))];
const result={schemaVersion:1,artifactType:'native-current-dmg28-continuation-browser-proof',runId,startedAt:new Date().toISOString(),base,inputCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceInputCommit:'9ee2550e9793e6aae9a7ac8fd71525704894950f',runner:{path:'tests/weapon-source-continuation-current.browser.mjs',sha256:sha(read('tests/weapon-source-continuation-current.browser.mjs'))},policy:'Actual compiled HTTP assets and browser UI only. No request interception, candidate overlay, synthetic owner, data injection, historical projection or production mutation.',matchedAssets:[],preservedProofs,rootRunner:{path:rootRunnerPath,sha256:rootRunnerSha256},assertions:[],states:[],screenshots:[],pageErrors:[],consoleErrors:[],httpErrors:[],requestErrors:[]};
const check=(condition,message)=>{assert.ok(condition,message);result.assertions.push(message);};
function record(name,state){result.states.push({name,...state});return state;}
function route(id,book,page,region){return `#rules/${id}?source=${encodeURIComponent(`${book}:${page}`)}${region?'&region='+encodeURIComponent(region):''}`;}
function query(state){return new URLSearchParams(state.route.split('?')[1]||'');}
let browser;
async function settled(page){await page.waitForLoadState('networkidle');}
async function owner(page,id){await page.goto(`${base}/#rules/${id}`);await page.locator('#referenceDetail h2').waitFor();await settled(page);check(!await page.evaluate(()=>document.querySelector('dialog.source-viewer')?.open),'direct owner route keeps its detail view without opening a source dialog');}
async function state(page){
 await page.locator('dialog.source-viewer[open]').waitFor();
 await page.waitForFunction(()=>{const text=document.querySelector('.source-viewer-status')?.textContent||'';return !/Loading|Rendering/.test(text)&&document.querySelector('.source-viewer-modes button[aria-pressed="true"]');});
 await settled(page);
 return page.evaluate(()=>{
  const dialog=document.querySelector('dialog.source-viewer[open]'),mode=dialog.querySelector('.source-viewer-modes button[aria-pressed="true"]')?.textContent.trim()||null;
  const image=dialog.querySelector('.source-viewer-scan'),parts=[...dialog.querySelectorAll('.source-viewer-linked-part')];
  return {route:location.hash,pageTitle:dialog.querySelector('.source-viewer-page-title')?.textContent.trim(),status:dialog.querySelector('.source-viewer-status')?.textContent.trim(),item:dialog.querySelector('.source-viewer-item')?.textContent.trim(),activeMode:mode,imageRegion:mode==='View excerpts'?image?.dataset.regionId||null:null,mountedImageRegion:image?.dataset.regionId||null,primaryImage:mode==='View excerpts'?image?.getAttribute('src')||null:null,primaryImageLoaded:mode==='View excerpts'?!!(image?.complete&&image.naturalWidth>0):null,linkedParts:parts.map(part=>({regionId:part.dataset.regionId,role:part.dataset.role,selected:part.dataset.selected==='true',printedPage:Number(part.dataset.printedPage),images:[...part.querySelectorAll('img')].map(img=>({regionId:img.dataset.regionId||null,src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0}))})),targetNotice:dialog.querySelector('.source-viewer-target-notice')?.textContent.trim()||'',dialogWidth:dialog.clientWidth,dialogScrollWidth:dialog.scrollWidth};
 });
}
async function capture(page,name){const path=resolve(screenshotDir,name+'.png');await page.screenshot({path,fullPage:true});const bytes=readFileSync(path);result.screenshots.push({name,path,sha256:sha(bytes),sizeBytes:bytes.length});}
function joined(value,selected,label){
 check(query(value).get('source')==='DMG:28'&&value.pageTitle.includes('printed p. 28'),`${label}: DMG printed page28 remains selected`);
 check(value.activeMode==='View excerpts'&&value.imageRegion===selected,`${label}: exact intended DMG region is the active excerpt`);
 check(JSON.stringify(value.linkedParts.map(part=>part.regionId))===JSON.stringify(pair),`${label}: complete opening/continuation sequence is ordered`);
 check(JSON.stringify(value.linkedParts.map(part=>part.role))===JSON.stringify(['opening','continuation']),`${label}: ordered parts retain their explicit roles`);
 check(value.linkedParts.filter(part=>part.selected).length===1&&value.linkedParts.find(part=>part.selected).regionId===selected,`${label}: only the requested part is selected`);
 check(value.primaryImageLoaded&&value.linkedParts.every(part=>part.printedPage===28&&part.images.length===1&&part.images.every(image=>image.loaded)),`${label}: actual primary and companion image pixels loaded for both parts`);
 check(value.dialogScrollWidth<=value.dialogWidth+1,`${label}: dialog fits the viewport`);
}
async function copy(page,label){await page.getByRole('button',{name:'Copy link to this source page',exact:true}).click();const copied=await page.evaluate(()=>navigator.clipboard.readText());record(label,{copied});return new URL(copied).hash;}
async function pending(page,expectedPage,pointer,label){
 const value=record(label,await state(page)),q=query(value);
 check(q.get('source')===`PHB:${expectedPage}`&&q.get('field')===pointer&&q.get('target')==='pending'&&!q.has('region'),`${label}: exact pending field/page route has no promoted region`);
 check(value.activeMode==='Your PDF'&&value.imageRegion===null&&value.targetNotice.includes('no reviewed excerpt mapping yet'),`${label}: pending field uses PDF mode and keeps the review warning`);
 check(await page.locator('dialog.source-viewer .source-viewer-scan:visible,dialog.source-viewer .source-viewer-linked-part:visible').count()===0,`${label}: no owner-default or linked excerpt is displayed for the pending field`);
 return value;
}
try{
 for(const asset of [...new Set(assetPaths)]){const response=await fetch(`${base}/${asset}?native-continuation=${runId}`);check(response.ok,`actual server asset exists: ${asset}`);const bytes=Buffer.from(await response.arrayBuffer()),expected=read('dist/'+asset);check(sha(bytes)===sha(expected),`actual server asset bytes equal current dist: ${asset}`);result.matchedAssets.push({path:'dist/'+asset,url:response.url,status:response.status,sha256:sha(bytes),sizeBytes:bytes.length});}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const [label,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,isMobile:label==='mobile',hasTouch:label==='mobile',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();page.on('pageerror',error=>result.pageErrors.push({label,message:error.message}));page.on('console',message=>{if(message.type()==='error')result.consoleErrors.push({label,text:message.text(),location:message.location()});});page.on('response',response=>{if(response.status()>=400)result.httpErrors.push({label,url:response.url(),status:response.status()});});page.on('requestfailed',request=>result.requestErrors.push({label,url:request.url(),failure:request.failure()}));
  await owner(page,dmgId);check(await page.locator('#referenceDetail h2').innerText()==='Weapon adjustments are against armor type',`${label}: direct DMG owner title is exact`);
  const source=page.locator(`#referenceDetail [data-source-id="${dmgId}"]`).first(),scans=page.locator(`[data-view-scans="${dmgId}"]`);
  check(await source.getAttribute('data-source-book')==='DMG'&&await source.getAttribute('data-source-page')==='28'&&await source.getAttribute('data-source-region')===opening,`${label}: Source entry button carries the exact DMG opening`);
  check(await scans.getAttribute('data-scan-book')==='DMG'&&await scans.getAttribute('data-scan-page')==='28'&&await scans.getAttribute('data-scan-region')===opening,`${label}: Original Scans carries the exact DMG opening`);
  await source.click();let value=record(label+'-source-entry',await state(page));joined(value,opening,label+' Source entry');await capture(page,label+'-source-entry');
  const copied=await copy(page,label+'-source-copy');check(copied===route(dmgId,'DMG',28,opening),`${label}: copied opening route is exact`);
  await page.reload();value=record(label+'-source-reload',await state(page));joined(value,opening,label+' reload');check(value.route===copied,`${label}: reload retains the copied opening route`);
  await page.goBack();await page.waitForFunction(id=>location.hash===`#rules/${id}`,dmgId);check(!await page.locator('dialog.source-viewer').evaluate(node=>node.open),`${label}: Back closes source to the exact DMG owner`);
  await page.goForward();value=record(label+'-source-forward',await state(page));joined(value,opening,label+' Forward');
  await page.locator('.source-viewer-close').click();await page.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);await scans.click();value=record(label+'-original-scans',await state(page));joined(value,opening,label+' Original Scans');await capture(page,label+'-original-scans');
  await page.goto(`${base}/${route(dmgId,'DMG',28)}`);value=record(label+'-bare-page-route',await state(page));joined(value,opening,label+' bare DMG page');
  await page.goto(`${base}/${route(dmgId,'DMG',28,opening)}`);value=record(label+'-explicit-opening',await state(page));joined(value,opening,label+' precise opening');
  await page.goto(`${base}/${route(dmgId,'DMG',28,continuation)}`);value=record(label+'-explicit-continuation',await state(page));joined(value,continuation,label+' precise continuation');check(await copy(page,label+'-continuation-copy')===route(dmgId,'DMG',28,continuation),`${label}: copying continuation preserves the selected continuation`);await capture(page,label+'-selected-continuation');
  await page.reload();value=record(label+'-continuation-reload',await state(page));joined(value,continuation,label+' continuation reload');
  await page.goto(`${base}/${route(dmgId,'DMG',28,legacy)}`);value=record(label+'-explicit-legacy',await state(page));check(value.route===route(dmgId,'DMG',28,legacy)&&value.activeMode==='View excerpts'&&value.imageRegion===legacy&&value.primaryImageLoaded&&value.linkedParts.length===0,`${label}: explicit legacy permalink remains one exact singleton excerpt`);check(await copy(page,label+'-legacy-copy')===route(dmgId,'DMG',28,legacy),`${label}: copying legacy keeps the legacy singleton route`);await capture(page,label+'-legacy-singleton');
  await owner(page,phbId);const row=page.locator('.table-row-source').first();check(JSON.parse(await row.getAttribute('data-ref-targets'))[0].targetStatus==='pending',`${label}: same-page PHB38 row is natively pending`);await row.click();await pending(page,38,'/table/rows/0',label+'-same-page-pending');check(await copy(page,label+'-pending-PHB38-copy')===route(phbId,'PHB',38)+'&target=pending&field=%2Ftable%2Frows%2F0',`${label}: pending PHB38 copy cannot inherit table sourceContext`);await capture(page,label+'-pending-PHB38');await page.reload();await pending(page,38,'/table/rows/0',label+'-same-page-pending-reload');
  await owner(page,phbId);const secondary=page.locator(`.detail-header [data-source-id="${phbId}"][data-source-page="36"]`);check(await secondary.count()===1&&await secondary.getAttribute('data-source-region')===null,`${label}: PHB36 secondary source has its own page and no PHB38 region hint`);await secondary.click();value=record(label+'-secondary-PHB36-header',await state(page));const selectedArmor=phbCatalog.regions.find(region=>region.id===value.imageRegion);check(query(value).get('source')==='PHB:36'&&value.pageTitle.includes('printed p. 36')&&selectedArmor?.book==='PHB'&&selectedArmor.printedPage===36&&value.imageRegion!=='phb38-table-context',`${label}: PHB36 secondary header selects actual PHB36 pixels`);const armorCopied=await copy(page,label+'-secondary-PHB36-copy');check(new URLSearchParams(armorCopied.split('?')[1]).get('source')==='PHB:36',`${label}: PHB36 secondary copy keeps page36`);await capture(page,label+'-secondary-PHB36');await page.reload();value=record(label+'-secondary-PHB36-reload',await state(page));check(query(value).get('source')==='PHB:36'&&value.pageTitle.includes('printed p. 36'),`${label}: PHB36 secondary reload cannot fall back to PHB38`);
  await owner(page,phbId);await page.locator('.table-note-source').nth(2).click();await pending(page,36,'/table/sourceNotes/2',label+'-armour-PHB36-pending');check(await copy(page,label+'-armour-PHB36-copy')===route(phbId,'PHB',36)+'&target=pending&field=%2Ftable%2FsourceNotes%2F2',`${label}: PHB36 armour field copy keeps its pending page36 identity`);await capture(page,label+'-armour-PHB36-pending');
  await context.close();
 }
 for(const proof of preservedProofs)check(sha(read(proof.path))===proof.sha256,`old sealed source-context proof remains exact: ${proof.path}`);check(sha(read(rootRunnerPath))===rootRunnerSha256,'root-owned native browser runner remains exact');
 result.browserStartupDiagnostics=result.consoleErrors.filter(error=>error.location?.url===base+'/favicon.ico'&&error.text==='Failed to load resource: the server responded with a status of 404 (File not found)');
 result.applicationConsoleErrors=result.consoleErrors.filter(error=>!result.browserStartupDiagnostics.includes(error));
 check(result.pageErrors.length===0,'zero JavaScript page errors');check(result.applicationConsoleErrors.length===0,'zero application console errors; browser-managed favicon diagnostics are retained separately');check(result.httpErrors.length===0,'zero HTTP errors observed through page response events');check(result.requestErrors.length===0,'zero failed requests observed through page request events');result.status='passed';
}catch(error){result.status='failed';result.failure={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;}
finally{if(browser)await browser.close();result.finishedAt=new Date().toISOString();result.assertionCount=result.assertions.length;mkdirSync(resolve(new URL('research/missile-table-discoverability/',root).pathname),{recursive:true});writeFileSync(new URL(resultPath,root),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({resultPath,status:result.status,assertions:result.assertionCount,states:result.states.length,screenshots:result.screenshots.length,pageErrors:result.pageErrors.length,consoleErrors:result.consoleErrors.length,httpErrors:result.httpErrors.length,requestErrors:result.requestErrors.length,failure:result.failure?.message},null,2));}
