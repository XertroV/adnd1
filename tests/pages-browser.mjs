// Run against a local /adnd1/ mount or the deployed GitHub Pages URL.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=new URL((process.env.TEST_URL || 'http://127.0.0.1:8766/adnd1').replace(/\/$/,'')+'/');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox'],...(process.env.BROWSER_PROXY ? {proxy:{server:process.env.BROWSER_PROXY}} : {})});
// Original, one-page test document generated in memory; no source-book PDF.
function fixture(){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>','<< /Length 0 >>\nstream\n\nendstream'];
 let pdf='%PDF-1.4\n';const offsets=[0];
 objects.forEach((v,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${v}\nendobj\n`;});
 const xref=Buffer.byteLength(pdf);pdf+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('');
 return Array.from(Buffer.from(pdf+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
}
const errors=[],badResponses=[],workers=[],requests=[];let images=0;
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)badResponses.push(`${r.status()} ${r.url()}`);});
 page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 page.on('worker',w=>workers.push(w.url()));
 await page.goto(base.href);
 await page.locator('.result-item').first().waitFor();
 const data=await page.evaluate(async()=>await (await fetch('data.json')).json());
 assert.equal(data.spells.length,638);
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  for(const [collection,id,book] of [['rules','character-creation','PHB'],['equipment','ua-field-plate','UA'],['rules','combat-sequence-dmg','DMG'],['spells','phb-cleric-aerial-servant','MM'],['spells','ua-cleric-animate-dead-monsters','MM2']]){
   const item=data[collection].find(x=>x.id===id);
   const catalog=await page.evaluate(async url=>await (await fetch(url)).json(),item.sourceExcerpts.catalog);
   const region=catalog.regions.find(r=>r.book===book);
   await page.evaluate(({item,region})=>FirstEditionSourceViewer.open({item,contextItemId:item.id,references:[{book:region.book,pages:[region.printedPage]}]}),{item,region});
   await page.locator('.source-viewer-status').filter({hasText:'excerpt 1 of'}).waitFor();
   assert.ok(await page.locator('.source-viewer-scan').evaluate(img=>img.complete&&img.naturalWidth>0));
   assert.ok(await page.locator('dialog.source-viewer').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
   images++;
   await page.keyboard.press('Escape');
  }
 }
 const pdf=await page.evaluate(async bytes=>{
  const lib=await import(new URL('vendor/pdfjs/pdf.mjs',document.baseURI).href);
  lib.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.mjs',document.baseURI).href;
  const task=lib.getDocument({data:new Uint8Array(bytes)}),doc=await task.promise;
  const p=await doc.getPage(1),canvas=document.createElement('canvas'),viewport=p.getViewport({scale:1});
  canvas.width=viewport.width;canvas.height=viewport.height;
  await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  const result={pages:doc.numPages,width:canvas.width};await task.destroy();return result;
 },fixture());
 assert.deepEqual(pdf,{pages:1,width:200});
 assert.ok(workers.some(url=>url===new URL('vendor/pdfjs/pdf.worker.mjs',base).href),'real PDF worker uses project base path');
 assert.ok(requests.every(r=>r.method==='GET'),'no PDF uploads or other writes');
 assert.ok(requests.filter(r=>new URL(r.url).origin===base.origin).every(r=>new URL(r.url).pathname.startsWith(base.pathname)),'all same-origin app requests stay under project path');
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
 console.log(JSON.stringify({url:base.href,spells:data.spells.length,sourceImageChecks:images,viewports:[390,1440],pdf,workers,errors,badResponses},null,2));
}finally{await browser.close();}
