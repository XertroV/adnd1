import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve('dist');
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/equipment-phb-banded-mail.json',async route=>{const response=await route.fetch(),catalog=await response.json();const context=catalog.regions.find(r=>r.id==='phb-35-11d89f055598d8a4');context.role='context';context.focusRects=[[0,0,1,1]];catalog.regions.find(r=>r.id==='phb-35-aace59b02b33236d').focusRects=[[.1,.3,.6,.04],[0,0,1,1]];await route.fulfill({response,json:catalog});});
  const entry=`${origin}/#equipment/phb-banded-mail`,deep=`${entry}?source=PHB%3A36`;
  await page.goto(deep);await page.locator('dialog.source-viewer[open]').waitFor();await page.locator('.source-viewer-scan').waitFor({state:'visible'});
  assert.match(await page.locator('.source-viewer-page-title').innerText(),/printed p\. 36/);assert.equal(await page.locator('.source-viewer-header').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  await page.getByRole('button',{name:'Copy link to this source page'}).click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/source=PHB%3A36&region=/);
  await page.locator('.source-viewer-close').click();await page.waitForURL(entry);await page.waitForFunction(()=>!document.querySelector('dialog.source-viewer').open);assert.equal(page.url(),entry);await page.waitForFunction(()=>document.activeElement?.matches('#referenceDetail .detail-card h2'));
  await page.evaluate(()=>{history.pushState(null,'','#equipment/phb-banded-mail?source=PHB%3A36');dispatchEvent(new HashChangeEvent('hashchange'));});await page.locator('dialog.source-viewer[open]').waitFor();
  await page.goBack();await page.waitForURL(entry);await page.waitForFunction(()=>!document.querySelector('dialog.source-viewer').open);assert.equal(page.url(),entry);await page.waitForFunction(()=>document.activeElement?.matches('#referenceDetail .detail-card h2'));
  await page.goForward();await page.locator('dialog.source-viewer[open]').waitFor();assert.equal(page.url(),deep);assert.match(await page.locator('.source-viewer-page-title').innerText(),/printed p\. 36/);
  await page.goto(`${entry}?source=PHB%3A35`);await page.locator('dialog.source-viewer[open]').waitFor();await page.waitForFunction(()=>document.querySelector('#source-viewer-region')?.options.length>=2);assert.equal(await page.locator('#source-viewer-region').inputValue(),'0');await page.locator('.source-viewer-scan[src$="phb-35-aace59b02b33236d.png"]').waitFor({state:'visible'});assert.equal(await page.locator('.source-viewer-focus-rect').count(),1);
  const regionLink=`${entry}?source=PHB%3A35&region=phb-35-11d89f055598d8a4`;
  await page.goto(regionLink);await page.locator('dialog.source-viewer[open]').waitFor();await page.waitForFunction(()=>document.querySelector('#source-viewer-region')?.value==='1');
  await page.locator('.source-viewer-scan[src$="phb-35-11d89f055598d8a4.png"]').waitFor({state:'visible'});assert.equal(await page.locator('.source-viewer-focus-rect').count(),0);assert.equal(await page.getByRole('button',{name:/Highlights/}).isVisible(),false);assert.match(await page.locator('.source-viewer-caption').innerText(),/without a marked passage/);await page.getByRole('button',{name:'Copy link to this source page'}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),regionLink);
  await page.goto(`${entry}?source=PHB%3A35&region=stale-region`);await page.locator('dialog.source-viewer[open]').waitFor();await page.waitForFunction(()=>document.querySelector('#source-viewer-region')?.options.length>=2);assert.equal(await page.locator('#source-viewer-region').inputValue(),'0');
  await page.goto(`${entry}?source=DMG%3A175`);await page.waitForTimeout(300);assert.equal(await page.locator('dialog.source-viewer').evaluate(n=>n.open),false);
  await page.goto(entry);await page.locator('#referenceDetail [data-source-id][data-source-book="PHB"]').click();await page.locator('dialog.source-viewer[open]').waitFor();await page.waitForFunction(()=>location.hash.includes('source=PHB%3A35'));
  await page.locator('[aria-label="Select cited page"]').selectOption({label:'PHB p. 36'});assert.match(page.url(),/source=PHB%3A36/);
  await page.goBack();await page.waitForFunction(()=>location.hash.includes('source=PHB%3A35'));await page.goBack();await page.waitForFunction(()=>!document.querySelector('dialog.source-viewer').open);assert.equal(page.url(),entry);
  await page.goForward();await page.locator('dialog.source-viewer[open]').waitFor();assert.match(page.url(),/source=PHB%3A35/);await page.goForward();await page.waitForFunction(()=>location.hash.includes('source=PHB%3A36'));assert.match(await page.locator('.source-viewer-page-title').innerText(),/printed p\. 36/);
  await page.goto(`${origin}/#equipment/phb-bo-stick`);await page.locator('.suggested-price [data-source-context="phb-spear"] button').click();await page.locator('dialog.source-viewer[open]').waitFor();const comparison=page.url();assert.match(comparison,/owner=equipment%3Aphb-spear/);await page.reload();await page.locator('dialog.source-viewer[open]').waitFor();assert.equal(await page.locator('.source-viewer-item').innerText(),'Spear');
  await page.goto(`${origin}/#classes/fighter`);await page.locator('[data-fighter-matrix] summary').click();await page.locator('[data-fighter-matrix] [data-ref-pages="82"]').first().click();await page.locator('dialog.source-viewer[open]').waitFor();assert.match(page.url(),/owner=matrices%3Admg-original-fighter-attack-matrix/);await page.reload();await page.locator('dialog.source-viewer[open]').waitFor();assert.match(await page.locator('.source-viewer-item').innerText(),/Original attack matrix/);
  await page.goto(`${origin}/#classes/fighter`);await page.locator('.progression-explainer > summary').click();await page.locator('.progression-explainer [data-inline-source]').first().click();await page.locator('dialog.source-viewer[open]').waitFor();assert.match(page.url(),/owner=classes%3Aprogression-explainer/);await page.reload();await page.locator('dialog.source-viewer[open]').waitFor();assert.match(await page.locator('.source-viewer-item').innerText(),/Class tracks/);
  await page.goto(`${origin}/#equipment/phb-banded-mail?source=PHB%3A35&owner=equipment%3Aphb-spear`);await page.waitForTimeout(250);assert.equal(await page.locator('dialog.source-viewer').evaluate(n=>n.open),false);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Source permalink direct load, copy, close, back and forward passed at 1440 and 390 pixels.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
