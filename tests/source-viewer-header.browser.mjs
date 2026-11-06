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
  const page=await browser.newPage({viewport:{width,height}});await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const item={...data.spells.find(x=>x.id==='ua-cleric-abjure'),name:'A very long source entry title that must wrap without obscuring the viewing mode or close button'};
  const open=()=>page.evaluate(item=>FirstEditionSourceViewer.open({item,contextItemId:item.id,references:FirstEditionCitations.collect(item)}),item);
  await open();const dialog=page.locator('dialog.source-viewer'),heading=dialog.locator('#source-viewer-title'),notice=dialog.locator('.source-viewer-privacy');
  assert.equal(await heading.innerText(),`Original Sources: ${item.name}`);
  assert.equal(await dialog.locator('.source-viewer-eyebrow').count(),0);
  const actions=dialog.locator('.source-viewer-header-actions');assert.equal(await actions.getByRole('group',{name:'Source viewing mode'}).count(),1);assert.equal(await actions.getByRole('button',{name:'Close original sources'}).count(),1);
  assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,`dialog overflow at ${width}`);
  const dismiss=dialog.getByRole('button',{name:'Dismiss source notice'});await dismiss.focus();await page.keyboard.press('Enter');assert.equal(await notice.isHidden(),true);assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
  await dialog.getByRole('button',{name:'Close original sources'}).click();await open();assert.equal(await notice.isHidden(),true,'dismissal survives reopening');
  await page.reload();await open();assert.equal(await notice.isVisible(),true,'reload restores notice');await page.close();
 }
}finally{await browser.close();server.close();}
