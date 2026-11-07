// Run only in an approved browser environment; this test does not publish or access external sites.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import http from 'node:http';
import path from 'node:path';
const require=createRequire(import.meta.url);let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve('dist'),data=JSON.parse(await readFile(path.join(root,'data.json'),'utf8'));
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error();const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const [width,height] of [[320,568],[390,900],[640,360],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height}});await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForTimeout(150);
  const item={...data.spells.find(x=>x.id==='phb-magic-user-fireball'),name:'A very long source entry title that must wrap without obscuring the viewing mode or close button'};
  const open=()=>page.evaluate(item=>FirstEditionSourceViewer.open({item,contextItemId:item.id,references:FirstEditionCitations.collect(item)}),item);
  await open();const dialog=page.locator('dialog.source-viewer'),heading=dialog.locator('#source-viewer-title'),notice=dialog.locator('.source-viewer-privacy');
  const separatorThickness=()=>dialog.evaluate(el=>{const privacy=el.querySelector('.source-viewer-privacy'),layout=el.querySelector('.source-viewer-layout');return privacy.hidden?parseFloat(getComputedStyle(layout).borderTopWidth):parseFloat(getComputedStyle(privacy).borderBottomWidth)+parseFloat(getComputedStyle(layout).borderTopWidth)});
  assert.equal(await separatorThickness(),1,'visible source notice has one divider');
  assert.equal(await heading.innerText(),`Original Sources: ${item.name}`);
  assert.equal(await dialog.locator('.source-viewer-eyebrow').count(),0);
  const actions=dialog.locator('.source-viewer-header-actions');assert.equal(await actions.getByRole('group',{name:'Source viewing mode'}).count(),1);assert.equal(await actions.getByRole('button',{name:'Close original sources'}).count(),1);
  assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,`dialog overflow at ${width}`);
  const dismiss=dialog.getByRole('button',{name:'Dismiss source notice'});await dismiss.focus();await page.keyboard.press('Enter');assert.equal(await notice.isHidden(),true);assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);assert.equal(await separatorThickness(),1,'dismissed source notice leaves one divider');
  await dialog.getByRole('button',{name:'Close original sources'}).click();await open();assert.equal(await notice.isHidden(),true,'dismissal survives reopening');assert.equal(await separatorThickness(),1,'reopening keeps one divider');
  await page.reload();await page.waitForTimeout(150);await open();assert.equal(await notice.isVisible(),true,'reload restores notice');assert.equal(await separatorThickness(),1,'reload still shows one divider');await page.close();
 }
 for(const [width,height] of [[640,360],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height}});
  for(const [id,printedPage] of [['phb-magic-user-fireball',73],['phb-magic-user-sleep',68]]){
   await page.goto(`http://127.0.0.1:${server.address().port}/#spells/${id}?source=PHB%3A${printedPage}`);
   const dialog=page.locator('dialog.source-viewer[open]');await dialog.waitFor();
   const image=dialog.locator('.source-viewer-scan');await image.waitFor({state:'visible'});await page.waitForFunction(()=>{const image=document.querySelector('.source-viewer-scan');return image&&image.naturalWidth>0});
   assert.equal(await dialog.locator('.source-viewer-focus-rect').count(),0,`${id} full-image sentinel should not be drawn`);assert.equal(await dialog.locator('.source-viewer-highlight-notice').isVisible(),true,`${id} should disclose its unmarked whole-spell review`);assert.match(await dialog.locator('.source-viewer-highlight-notice').innerText(),/Unmarked whole-spell view reviewed against its exact source, image, focus and content hashes/i);
   const framing=await dialog.locator('.source-viewer-stage').evaluate(stage=>({scrollTop:stage.scrollTop,stageTop:stage.getBoundingClientRect().top,frameTop:stage.querySelector('.source-viewer-image-frame').getBoundingClientRect().top}));
   assert.equal(framing.scrollTop,0,`${id} should start at the top at ${width}x${height}`);assert.ok(framing.frameTop>=framing.stageTop+5,`${id} scan should not be clipped above the viewport at ${width}x${height}`);
   await dialog.locator('.source-viewer-close').click();
  }
  const tablePage=await browser.newPage({viewport:{width,height}});
  await tablePage.route('**/equipment-phb-banded-mail.json',async route=>{const response=await route.fetch(),catalog=await response.json();catalog.regions.find(region=>region.id==='phb-36-36541e88d64c623b').focusRects=[[0,0,1,1]];await route.fulfill({response,json:catalog});});
  await tablePage.goto(`http://127.0.0.1:${server.address().port}/#equipment/phb-banded-mail?source=PHB%3A36&region=phb-36-36541e88d64c623b`);
  const tableDialog=tablePage.locator('dialog.source-viewer[open]');await tableDialog.waitFor();await tableDialog.locator('.source-viewer-scan').waitFor({state:'visible'});await tablePage.waitForFunction(()=>document.querySelector('.source-viewer-scan')?.naturalWidth>0);
  const tableFraming=await tableDialog.locator('.source-viewer-stage').evaluate(stage=>({scrollTop:stage.scrollTop,stageTop:stage.getBoundingClientRect().top,frameTop:stage.querySelector('.source-viewer-image-frame').getBoundingClientRect().top}));
  assert.equal(tableFraming.scrollTop,0,`full table sentinel should start at the top at ${width}x${height}`);assert.ok(tableFraming.frameTop>=tableFraming.stageTop+5);assert.equal(await tableDialog.locator('.source-viewer-focus-rect').count(),0);assert.match(await tableDialog.locator('.source-viewer-highlight-notice').innerText(),/full-image highlight flag|precise highlighting is not reviewed/i);assert.match(await tableDialog.locator('.source-viewer-caption').innerText(),/without a marked passage/);
  await tableDialog.locator('.source-viewer-close').click();await tablePage.close();
  await page.close();
 }
}finally{await browser.close();server.close();}
