// Actual current Jo routes, catalogs, images, compiled joins, and viewer. This
// verifies integration and selection only; it does not review source semantics.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const group=JSON.parse(readFileSync('research/citation-continuations.json')).groups.find(g=>g.id==='ua26-wd-31-ua-jo-stick'),base=(process.env.TEST_URL||'http://127.0.0.1:8776').replace(/\/$/,''),output=process.env.TEST_OUTPUT_DIR||'/tmp/batch6-jo-browser-runtime';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),results=[];
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}])for(const segment of group.segments){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const hash=`#equipment/ua-jo-stick?source=${encodeURIComponent(`${segment.book}:${segment.printedPage}`)}&region=${encodeURIComponent(segment.regionId)}`;
  await page.goto(`${base}/${hash}`);const dialog=page.locator('dialog.source-viewer[open]');await dialog.waitFor();
  await dialog.locator(`.source-viewer-linked-part[data-region-id="${segment.regionId}"][data-selected="true"]`).waitFor();
  const parts=dialog.locator('.source-viewer-linked-part');assert.equal(await parts.count(),2);assert.deepEqual(await parts.evaluateAll(nodes=>nodes.map(n=>[n.dataset.regionId,n.dataset.role])),group.segments.map(s=>[s.regionId,s.role]));
  assert.deepEqual(await parts.evaluateAll(nodes=>nodes.filter(n=>n.dataset.selected==='true').map(n=>n.dataset.regionId)),[segment.regionId]);
  await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.source-viewer-linked-part img')];return images.length===2&&images.every(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0);});
  assert.equal(new URL(page.url()).hash,hash);assert.equal(await dialog.locator('.source-viewer-scan').count(),1);assert.ok((await dialog.locator('.source-viewer-scan').getAttribute('src')).endsWith(segment.image));assert.deepEqual(errors,[]);
  const screenshot=resolve(output,`jo-${viewport.width}-${segment.printedPage}.png`);await page.screenshot({path:screenshot,fullPage:true});
  results.push({viewport,selectedRegion:segment.regionId,hash,renderedParts:await parts.evaluateAll(nodes=>nodes.map(n=>({regionId:n.dataset.regionId,role:n.dataset.role,selected:n.dataset.selected,images:[...n.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight}))}))),pageErrors:errors,screenshot});await page.close();
 }
 const inputs=['dist/source-viewer.js','dist/books.js','dist/source-continuations.json','dist/data.json','research/citation-continuations.json','dist/scans/verified/equipment-ua-jo-stick.json'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
 const receipt={passed:true,scope:'Current Jo desktop/mobile direct load from both selected parts; ordered two-part rendering and selected images, not source semantic or default-selection approval.',inputs,results};writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:true,cases:results.length,receipt:resolve(output,'receipt.json')}));
}finally{await browser.close();}
