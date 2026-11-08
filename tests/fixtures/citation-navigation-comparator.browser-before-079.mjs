import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {attachEvidenceBindings,buildPriceSourceInventory,validatePriceSourceInventory} from '../tools/price-source-inventory.mjs';

const require=createRequire(import.meta.url);let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve('dist'),data=JSON.parse(await readFile(path.join(root,'data.json'),'utf8'));
const inventory=buildPriceSourceInventory({equipment:data.equipment,data});validatePriceSourceInventory(inventory,{equipment:data.equipment,data});attachEvidenceBindings(data,inventory);
const appData=JSON.stringify(data);
const server=http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/data.json'){res.setHeader('Content-Type','application/json');res.end(appData);return;}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error();
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,entry=`${origin}/#equipment/phb-bo-stick`;
const comparisonHash='#equipment/phb-bo-stick?source=PHB%3A35&target=pending&field=%2FsuggestedPrice%2Fcomparisons%2F0&owner=equipment%3Aphb-spear';
const missingOwnerHash='#equipment/phb-bo-stick?source=PHB%3A35&target=pending&field=%2FsuggestedPrice%2Fcomparisons%2F0';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(entry);await page.locator('#referenceDetail .detail-card').waitFor();
 await page.locator('.suggested-price [data-source-context="phb-spear"] [data-inline-source]').click();
 const dialog=page.locator('dialog.source-viewer[open]');await dialog.waitFor();await page.waitForFunction(()=>location.hash.includes('owner=equipment%3Aphb-spear'));
 assert.equal(new URL(page.url()).hash,comparisonHash,'comparison link keeps estimate route identity and comparator source owner separately');
 assert.equal(await dialog.locator('.source-viewer-item').innerText(),'Spear');
 assert.match(await dialog.locator('.source-viewer-labels').innerText(),/^Field target: Comparison: Spear/);
 assert.match(await dialog.locator('.source-viewer-target-notice').innerText(),/Comparison: Spear.*no reviewed excerpt mapping/i);
 assert.equal(await dialog.getByRole('button',{name:'Your PDF'}).getAttribute('aria-pressed'),'true');
 assert.equal(await dialog.locator('.source-viewer-image-frame').isVisible(),false,'pending comparator target must not select a default source crop');
 await dialog.getByRole('button',{name:'Copy link to this source page'}).click();
 assert.equal(new URL(await page.evaluate(()=>navigator.clipboard.readText())).hash,comparisonHash,'copy preserves target pointer, pending state, and source owner');
 await page.reload();await page.locator('dialog.source-viewer[open]').waitFor();
 assert.equal(new URL(page.url()).hash,comparisonHash);
 assert.equal(await dialog.locator('.source-viewer-item').innerText(),'Spear');
 assert.match(await dialog.locator('.source-viewer-labels').innerText(),/^Field target: Comparison: Spear/);
 assert.match(await dialog.locator('.source-viewer-target-notice').innerText(),/Comparison: Spear.*no reviewed excerpt mapping/i);
 assert.equal(await dialog.locator('.source-viewer-image-frame').isVisible(),false,'reload keeps pending target crop-free');
 await page.goBack();await page.waitForURL(entry);await page.waitForFunction(()=>!document.querySelector('dialog.source-viewer').open);
 await page.goForward();await page.locator('dialog.source-viewer[open]').waitFor();
 assert.equal(new URL(page.url()).hash,comparisonHash);assert.match(await dialog.locator('.source-viewer-labels').innerText(),/^Field target: Comparison: Spear/);
 await page.goBack();await page.waitForURL(entry);await page.waitForFunction(()=>!document.querySelector('dialog.source-viewer').open);

 await page.goto(`${origin}/${missingOwnerHash}`);await page.locator('dialog.source-viewer[open]').waitFor();
 assert.equal(await page.locator('.source-viewer-item').innerText(),'Bo Stick','a missing owner cannot promote the comparator to the displayed source');
 assert.match(await dialog.locator('.source-viewer-target-notice').innerText(),/Comparison: Spear.*no reviewed excerpt mapping/i);
 assert.equal(await dialog.locator('.source-viewer-image-frame').isVisible(),false);
 await dialog.getByRole('button',{name:'Copy link to this source page'}).click();
 const canonicalCopy=new URL(await page.evaluate(()=>navigator.clipboard.readText()));assert.equal(canonicalCopy.hash,comparisonHash,'copy recovers the canonical structured sourceOwner from the pending field target');
 await page.goto(canonicalCopy.href);await page.locator('dialog.source-viewer[open]').waitFor();
 assert.equal(await dialog.locator('.source-viewer-item').innerText(),'Spear');
 assert.match(await dialog.locator('.source-viewer-labels').innerText(),/^Field target: Comparison: Spear/);
 assert.equal(await dialog.locator('.source-viewer-image-frame').isVisible(),false);
 assert.deepEqual(errors,[]);await page.close();
 console.log('Comparator target owner/field identity survives click, copy, reload and back/forward; missing owner stays pending and crop-free until a canonical owner is copied.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
