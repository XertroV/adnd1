// Sweep every current sourceExcerpts catalog in the real app, without serving PDFs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import http from 'node:http';
import path from 'node:path';
const require=createRequire(import.meta.url);let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const citations=require('../dist/citations.js'),root=path.resolve('dist'),data=JSON.parse(await readFile(path.join(root,'data.json'),'utf8'));
const items=['rules','spells','equipment','classes','matrices'].flatMap(collection=>data[collection].filter(item=>item.sourceExcerpts).map(item=>({collection,item})));
if(data.progressionExplainer?.sourceExcerpts)items.push({collection:'progressionExplainer',item:{...data.progressionExplainer,id:'progression-explainer'}});
const jobs=await Promise.all(items.map(async ({collection,item})=>({collection,item,references:citations.collect(item),catalog:JSON.parse(await readFile(path.join(root,item.sourceExcerpts.catalog),'utf8'))})));
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname);if(/\.pdf$/i.test(name))throw Error('PDFs unavailable');const filename=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!filename.startsWith(root+path.sep))throw Error('Invalid path');const bytes=await readFile(filename);res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.png':'image/png'})[path.extname(filename)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const queue=[...jobs.flatMap(job=>[390,1440].map(width=>({job,width})))];let done=0,regions=0;const failures=[];
async function worker(){const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);while(queue.length){const {job,width}=queue.shift();try{await page.setViewportSize({width,height:900});const count=await page.evaluate(async ({item,references,catalog})=>{
 const wait=async(fn,label)=>{const end=performance.now()+12000;while(performance.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,15));}throw Error('Timed out: '+label);};
 const $=s=>document.querySelector(s),clickSelect=(el,value)=>{el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}));};
 FirstEditionSourceViewer.open({item,contextItemId:item.id,references});const dialog=$('dialog.source-viewer');
 await wait(()=>dialog?.open&&!$('.source-viewer-modes').hidden,'open excerpt mode');
 const pageOptions=[...dialog.querySelector('[aria-label="Select cited page"]').options];let visited=0;
 for(const key of [...new Set(catalog.regions.map(r=>`${r.book}:${r.printedPage}`))]){
  const [book,n]=key.split(':'),page=Number(n),list=catalog.regions.filter(r=>r.book===book&&r.printedPage===page),option=pageOptions.find(o=>o.textContent===`${book} p. ${page}`);if(!option)throw Error(`Uncited page ${key}`);
  clickSelect(dialog.querySelector('[aria-label="Select cited page"]'),option.value);
  await wait(()=>[...dialog.querySelectorAll('#source-viewer-region option')].length===list.length&&dialog.querySelector('.source-viewer-status').textContent.includes(`${book} printed p. ${page}`),`page ${key}`);
  for(let i=0;i<list.length;i++){
   const r=list[i],select=dialog.querySelector('#source-viewer-region');if(i)clickSelect(select,i);
   await wait(()=>{const image=dialog.querySelector('.source-viewer-scan'),title=dialog.querySelector('.source-viewer-caption h4'),status=dialog.querySelector('.source-viewer-status');return !dialog.querySelector('.source-viewer-image-frame').hidden&&image?.complete&&image.naturalWidth&&image.getAttribute('src')?.endsWith('/'+r.image)&&image.alt===r.alt&&title?.textContent===r.title&&status?.textContent.includes(`excerpt ${i+1} of ${list.length}`);},`region ${r.id}`);
   const fit=[...dialog.querySelectorAll('button')].find(b=>b.textContent==='Fit width');fit.click();await wait(()=>fit.getAttribute('aria-pressed')==='true',`fit ${r.id}`);
   const image=dialog.querySelector('.source-viewer-scan'),stage=dialog.querySelector('.source-viewer-stage'),frame=dialog.querySelector('.source-viewer-image-frame'),caption=dialog.querySelector('.source-viewer-caption'),rect=image.getBoundingClientRect(),boxes=[...frame.querySelectorAll('.source-viewer-focus-rect')];
   if(image.naturalWidth!==r.width||image.naturalHeight!==r.height)throw Error(`Dimensions ${r.id}`);
   if(caption.hidden||!caption.textContent.includes(r.summary))throw Error(`Caption ${r.id}`);
   if(dialog.scrollWidth>dialog.clientWidth+1||rect.width>stage.clientWidth+1)throw Error(`Fit overflow ${r.id}`);
   if(boxes.length!==r.focusRects.length)throw Error(`Highlight count ${r.id}`);
   boxes.forEach((box,j)=>{const b=box.getBoundingClientRect(),actual=[(b.left-rect.left)/rect.width,(b.top-rect.top)/rect.height,b.width/rect.width,b.height/rect.height];if(actual.some((v,k)=>Math.abs(v-r.focusRects[j][k])>.008))throw Error(`Highlight geometry ${r.id}`);});
   visited++;
  }
 }
 dialog.close();return visited;
 },job);regions+=count;done++;if(done%100===0)console.log(`Checked ${done}/${jobs.length*2} item/viewport combinations, ${regions} regions`);}catch(error){failures.push(`${job.collection}:${job.item.id} ${width}px: ${error.message}`);try{await page.locator('dialog.source-viewer').evaluate(d=>d.close());}catch{}}}failures.push(...errors.map(e=>'Browser error: '+e));await page.close();}
try{assert.ok(jobs.length>0,'No imported catalogs found');await Promise.all(Array.from({length:4},worker));if(failures.length)throw Error(failures.slice(0,30).join('\n')+`\n${failures.length} failures total`);console.log(JSON.stringify({items:jobs.length,viewports:[390,1440],itemViewportChecks:done,regionViewportChecks:regions,failures:0},null,2));}finally{await browser.close();server.close();}
