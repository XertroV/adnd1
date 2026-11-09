import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8768';
const sha=relative=>createHash('sha256').update(readFileSync(path.join(root,relative))).digest('hex');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),cases=[];
try{
 await page.goto(`${base}/#rules/weapon-versus-armor-adjustments`);
 await page.locator('#referenceDetail h2').waitFor();
 const chip=page.locator('#referenceDetail [data-source-id="weapon-versus-armor-adjustments"]').first();
 await chip.waitFor();
 const headerChip={text:(await chip.innerText()).trim(),book:await chip.getAttribute('data-source-book'),page:await chip.getAttribute('data-source-page'),region:await chip.getAttribute('data-source-region')};
 const capture=async name=>{
  await page.locator('dialog.source-viewer[open]').waitFor();
  await page.waitForFunction(()=>{const status=document.querySelector('.source-viewer-status')?.textContent||'';return !/Loading|Rendering/.test(status)&&!!document.querySelector('.source-viewer-page-title')?.textContent;});
  await page.waitForTimeout(350);
  const state=await page.evaluate(()=>({
   route:location.hash,
   pageTitle:document.querySelector('.source-viewer-page-title')?.textContent?.trim()||'',
   status:document.querySelector('.source-viewer-status')?.textContent?.trim()||'',
   selectedPage:document.querySelector('#source-viewer-page')?.value||'',
   selectedRegion:document.querySelector('#source-viewer-region')?.value||'',
   regionOptions:[...document.querySelectorAll('#source-viewer-region option')].map(option=>({value:option.value,label:option.textContent.trim()})),
   imageRegion:document.querySelector('.source-viewer-scan')?.dataset.regionId||null,
   caption:document.querySelector('.source-viewer-caption h4')?.textContent?.trim()||'',
   summary:document.querySelector('.source-viewer-caption .source-viewer-checked')?.textContent?.trim()||'',
   linkedPartIds:[...document.querySelectorAll('.source-viewer-linked-part')].map(node=>node.dataset.regionId),
   viewerText:document.querySelector('dialog.source-viewer[open]')?.innerText?.slice(0,3000)||''
  }));
  cases.push({name,...state});
 };
 await chip.click();await capture('record-header-source-chip');
 await page.locator('dialog.source-viewer[open] .source-viewer-close').click();
 await page.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
 await page.locator('[data-view-scans="weapon-versus-armor-adjustments"]').click();await capture('view-original-scans-button');
 await page.goto(`${base}/#rules/weapon-versus-armor-adjustments?source=DMG%3A28`);await capture('bare-printed-page-permalink');
 const output={schemaVersion:1,artifactType:'observed-current-base-dmg28-default-before-v4',status:'Observed in actual cc950 current production item and catalog only. Candidate V4 objects were not loaded into this replay.',baseCommit:'cc9509047746d5e27a71cb5b1e0cfcb739a688c9',inputs:{'dist/app.js':sha('dist/app.js'),'dist/source-viewer.js':sha('dist/source-viewer.js'),'dist/data.json':sha('dist/data.json'),'dist/scans/verified/rules-weapon-versus-armor-adjustments.json':sha('dist/scans/verified/rules-weapon-versus-armor-adjustments.json'),'dist/source-continuations.json':sha('dist/source-continuations.json')},headerChip,cases,claim:'Each tested current primary entry path defaults to the existing one-region legacy page image. That region does not select the reviewed bottom-left opening plus top-right continuation; bare source=DMG:28 does not encode a precise region.'};
 const destination=path.join(here,'current-cc950-dmg28-primary-route-before-v1.json');writeFileSync(destination,JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({output:destination,cases:cases.map(({name,route,pageTitle,status,selectedRegion,imageRegion,linkedPartIds})=>({name,route,pageTitle,status,selectedRegion,imageRegion,linkedPartIds})),inputs:output.inputs},null,2));
}finally{await browser.close();}
