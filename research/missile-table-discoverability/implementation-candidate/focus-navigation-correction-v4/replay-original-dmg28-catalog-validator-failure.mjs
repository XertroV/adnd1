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
const appPath='dist/app.js',app=read(appPath).toString('utf8');
let overlay=app;
for(const [before,after] of [
 [' const tableContext=item.table?.sourceContext;',' const tableContext=item.table?.sourceContext||item.sourceContext;'],
 ['function originalScansButton(item){const context=item.table?.sourceContext;','function originalScansButton(item){const context=item.table?.sourceContext||item.sourceContext;'],
 ["  let initialReference=target.source,activeTarget=null,targets=FirstEditionCitations.targets(item),fieldScoped=!!target.source.fieldPointer;", "  let initialReference=target.source,activeTarget=null,targets=FirstEditionCitations.targets(item),fieldScoped=!!target.source.fieldPointer;\n  const primarySourceContext=item?.table?.sourceContext||item?.sourceContext;\n  if(!fieldScoped&&!initialReference.region&&primarySourceContext&&bookCode(primarySourceContext.book)===initialReference.book&&Number(primarySourceContext.printedPage)===initialReference.page&&typeof primarySourceContext.regionId==='string')initialReference={...initialReference,region:primarySourceContext.regionId};"],
]){assert.equal(overlay.split(before).length,2,`patch anchor not unique: ${before}`);overlay=overlay.replace(before,after);}
const data=json('dist/data.json');
const oldCatalog=json('research/missile-table-discoverability/implementation-candidate/catalogs/rules-weapon-versus-armor-adjustments.json');
const group=json('research/missile-table-discoverability/implementation-candidate/continuation-group-candidate.json');
const continuations=json('dist/source-continuations.json');continuations.groups.push(group);
const record=data.rules.find(item=>item.id==='weapon-versus-armor-adjustments');
record.sourceContext={book:'DMG',printedPage:28,regionId:'dmg-28-opening-8b67aa025e19eddd'};record.sourceExcerpts.regionCount=3;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),network=[];
page.on('response',response=>{if(/app\.js|data\.json|source-continuations|weapon-versus-armor/.test(response.url()))network.push({status:response.status(),url:response.url()});});
page.on('requestfailed',request=>network.push({failed:request.url(),error:request.failure()?.errorText}));
try{
 await page.route('**/app.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:overlay}));
 await page.route('**/data.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}));
 await page.route('**/source-continuations.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(continuations)}));
 await page.route('**/scans/verified/rules-weapon-versus-armor-adjustments.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(oldCatalog)}));
 await page.goto(`${base}/#rules/weapon-versus-armor-adjustments`);await page.locator('#referenceDetail h2').waitFor();
 await page.locator('#referenceDetail [data-source-id="weapon-versus-armor-adjustments"]').first().click();
 await page.locator('dialog.source-viewer[open] .source-viewer-excerpt-notice').waitFor();
 await page.waitForFunction(()=>document.querySelector('.source-viewer-excerpt-notice')?.textContent.includes('Verified excerpts could not be loaded'));
 const dom=await page.evaluate(()=>({route:location.hash,headerTitle:document.querySelector('#referenceDetail h2')?.textContent?.trim()||'',viewerText:document.querySelector('dialog.source-viewer[open]')?.innerText?.slice(0,2500)||'',status:document.querySelector('.source-viewer-status')?.textContent?.trim()||'',excerptNotice:document.querySelector('.source-viewer-excerpt-notice')?.textContent?.trim()||'',scanRegion:document.querySelector('.source-viewer-scan')?.dataset.regionId||null,linkedParts:[...document.querySelectorAll('.source-viewer-linked-part')].map(node=>node.dataset.regionId)}));
 assert.ok(dom.excerptNotice.includes('Verified excerpts could not be loaded'),'expected catalog schema rejection/fallback was not rendered');
 assert.equal(dom.scanRegion,null,'invalid candidate catalog did not render an excerpt image');
 const result={schemaVersion:1,artifactType:'observed-dmg28-current-source-viewer-catalog-rejection-before-region-schema-fix',status:'Preserved actual consumer failure. The source-viewer implementation and legacy candidate catalog were served unchanged; only sourceContext route code and DMG owner/continuation metadata were injected in memory.',baseCommit:'4aa977788085f67a28a24d40965edf987bc7242b',inputs:{appPreimageSha256:sha(read(appPath)),sourceViewerSha256:sha(read('dist/source-viewer.js')),dataSha256:sha(read('dist/data.json')),legacyCandidateCatalogPath:'research/missile-table-discoverability/implementation-candidate/catalogs/rules-weapon-versus-armor-adjustments.json',legacyCandidateCatalogSha256:sha(read('research/missile-table-discoverability/implementation-candidate/catalogs/rules-weapon-versus-armor-adjustments.json')),continuationGroupSha256:sha(read('research/missile-table-discoverability/implementation-candidate/continuation-group-candidate.json'))},requiredRegion:dmgCatalogMissingKeys(oldCatalog),browser:{dom,network},conclusion:'Source Viewer rejects the three-region candidate catalog because the new continuation segment lacks required region schema properties, then falls back to the local-PDF view; no source image is displayed. The separate versioned V2 catalog adds only the three consumer-required metadata properties to that continuation region.'};
 const pathOut=path.join(here,'original-dmg28-catalog-schema-failure-v1.json');writeFileSync(pathOut,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output:pathOut,dom,network,inputs:result.inputs},null,2));
}finally{await browser.close();}
function dmgCatalogMissingKeys(catalog){const region=catalog.regions.find(entry=>entry.id==='dmg-28-c37135485e89a720');return {regionId:region.id,missing:['verification','verificationScope','checkedFields'].filter(key=>!Object.hasOwn(region,key)),catalogSha256:sha(read('research/missile-table-discoverability/implementation-candidate/catalogs/rules-weapon-versus-armor-adjustments.json'))};}
