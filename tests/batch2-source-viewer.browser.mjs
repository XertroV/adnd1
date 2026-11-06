// Local-only integration tests. Synthetic catalogs are HTTP fixtures, never public data files.
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
let chromium;
try {({chromium}=require('playwright'));}
catch {({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const base=JSON.parse(await readFile(path.join(root,'scans/dagger/manifest.json'),'utf8'));
const data=JSON.parse(await readFile(path.join(root,'data.json'),'utf8'));
const evidence=await mkdtemp(path.join(tmpdir(),'adnd-batch2-viewer-'));
const fixtureOnly=process.argv.includes('--fixtures-only');
const copy=value=>structuredClone(value);
const catalog=(id,marker,regions=[base.regions[0]])=>({...copy(base),itemId:id,scope:`Test fixture ${marker}; no new book verification`,regions:regions.map((region,i)=>({...copy(region),id:`${id}-region-${i}`,title:`Fixture ${marker} region ${i}`,alt:`Fixture ${marker} image`,summary:`Fixture ${marker} summary`,checkedFields:{fixture_marker:marker},focusRects:[[.04,marker==='A'?.1:.55,.8,.07]]}))});
const item=(id,name=id,catalogName=`${id}.json`)=>({id,name,scanVerification:{state:'selected-values-checked',catalog:`scans/dagger/${catalogName}`}});
const A=item('phb-fixture-a','Fixture A'),B=item('phb-fixture-b','Fixture B');
const initial=new Map([['/scans/dagger/phb-fixture-a.json',catalog(A.id,'A')],['/scans/dagger/phb-fixture-b.json',catalog(B.id,'B')]]);
const harness='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local batch2 viewer tests</title><link rel="stylesheet" href="/source-viewer.css"></head><body><button id="opener">Open reference</button><script src="/books.js"></script><script src="/source-viewer.js"></script></body></html>';
const server=http.createServer(async(req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(harness);return;}
  if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(initial.has(req.url)){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(initial.get(req.url)));return;}
  const filename=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{const bytes=await readFile(filename);res.setHeader('Content-Type',({'.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.json':'application/json'})[path.extname(filename)]||'application/octet-stream');res.end(bytes);}
  catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0,activePage;
const check=(value,label)=>{assert.ok(value,label);checks++;};
async function page(){const p=await browser.newPage({viewport:{width:1200,height:900},hasTouch:true});activePage=p;p.setDefaultTimeout(10000);p.net=[];p.errors=[];p.on('request',r=>p.net.push({url:r.url(),method:r.method()}));p.on('pageerror',e=>p.errors.push(e.message));await p.goto(origin);return p;}
async function open(p,entry,references=[{book:'PHB',pages:[35]}],contextItemId=entry.id){await p.evaluate(args=>FirstEditionSourceViewer.open(args),{item:entry,references,contextItemId});}
const shown=p=>p.locator('.source-viewer-status').filter({hasText:/· excerpt \d+ of/}).waitFor();
const checked=p=>p.locator('.source-viewer-checked-values').textContent();
async function isPrivate(p,label){check(await p.locator('.source-viewer-modes').isHidden(),label);check(await p.locator('.source-viewer-image-frame').isHidden(),`${label}: no excerpt image`);}
async function fail(p,label){await p.locator('.source-viewer-excerpt-notice').filter({hasText:'could not be loaded'}).waitFor();check(await p.locator('.source-viewer-file-row').isVisible(),label);}
try{
  const p=await page();
  const unchecked=[
    {id:'phb-fighter',name:'Fighter'},
    {...copy(A),scanVerification:{state:'ocr-checked',catalog:A.scanVerification.catalog}},
    {id:'phb-dagger',name:'Dagger',scanVerification:{}},
    {id:'phb-dagger',name:'Dagger',scanVerification:{state:'ocr-checked',catalog:'scans/dagger/manifest.json'}},
    ...['https://example.invalid/catalog.json','/scans/dagger/phb-fixture-a.json','scans/dagger/phb-fixture-a.json?x=1','scans/dagger/phb-fixture-a.json#x','scans/dagger/../dagger/phb-fixture-a.json','scans/dagger/%70hb-fixture-a.json','scans/other/phb-fixture-a.json','scans/dagger/manifest.png'].map(c=>({...copy(A),scanVerification:{state:'selected-values-checked',catalog:c}})),
  ];
  for(const entry of unchecked){await open(p,entry);await isPrivate(p,'invalid or unchecked metadata stays private');}
  check(!p.net.some(r=>r.url.includes('/scans/')),'invalid metadata triggers no catalog or image request');
  await open(p,A,undefined,B.id);await isPrivate(p,'conflicting explicit context rejected');
  await open(p,{...copy(A),contextItemId:B.id});await isPrivate(p,'conflicting item context rejected');
  await open(p,A);await shown(p);
  check((await checked(p)).includes('A'),'A catalog renders only A checked fields');
  check((await p.locator('#source-viewer-privacy').textContent()).includes('Fixture A'),'privacy names the active item');
  const aY=await p.locator('.source-viewer-focus-rect').evaluate(n=>parseFloat(n.style.top));
  await open(p,B);await shown(p);
  check((await checked(p)).includes('B')&&!(await checked(p)).includes('Fixture markerA'),'B catalog renders B fields');
  const bY=await p.locator('.source-viewer-focus-rect').evaluate(n=>parseFloat(n.style.top));
  check(aY===10&&Math.abs(bY-55)<.01,'same PNG uses independent per-item row focus');
  check((await p.locator('.source-viewer-scan').getAttribute('alt')).includes('Fixture B'),'shared image alt updates per item');
  await open(p,A);await shown(p);
  check(p.net.filter(r=>r.url.endsWith('/phb-fixture-a.json')).length===1,'A catalog is cached by URL across item switches');
  check(p.net.filter(r=>r.url.endsWith('/phb-fixture-b.json')).length===1,'B has its own catalog cache entry');
  check(p.net.filter(r=>r.url.endsWith('/phb35-dagger-price.png')).length===1,'shared PNG is reused by full URL');
  for(const width of [320,390,491,1440]){
    await p.setViewportSize({width,height:900});await p.waitForTimeout(180);await shown(p);
    check(await p.locator('dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${width}px generic modal fits`);
    check(await p.locator('.source-viewer-stage').evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${width}px narrow shared image fits`);
  }
  await p.getByRole('button',{name:'Your PDF',exact:true}).click();
  check(await p.locator('.source-viewer-file-row').isVisible(),'generic item retains private PDF mode');
  await p.getByRole('button',{name:'Verified excerpts',exact:true}).click();await shown(p);
  check(p.net.every(r=>r.method==='GET'&&r.url.startsWith(origin+'/')&&!r.url.includes('.pdf')),'same-origin-only assets with no PDF upload');
  check(p.errors.length===0,'metadata and cache tests have no uncaught errors');await p.close();

  const mismatch=await page();await open(mismatch,item('phb-wrong-item','Wrong','phb-fixture-a.json'));await isPrivate(mismatch,'wrong-item catalog path falls back to private reader');
  check(!mismatch.net.some(r=>r.url.endsWith('.png')),'mismatched item catalog never fetches a PNG');await mismatch.close();
  const invalid=await page();await invalid.route('**/phb-fixture-a.json',r=>r.fulfill({json:{...catalog(A.id,'A'),regions:[{...catalog(A.id,'A').regions[0],image:'https://example.invalid/private.png'}]}}));
  await open(invalid,A);await fail(invalid,'external image filename is rejected');check(!invalid.net.some(r=>r.url.endsWith('.png')),'unsafe manifest rejected before PNG fetch');await invalid.close();
  const dims=await page();await open(dims,A);await shown(dims);
  const badDims=catalog(B.id,'B');badDims.regions[0].width++;
  await dims.route('**/phb-fixture-b.json',r=>r.fulfill({json:badDims}));await open(dims,B);await fail(dims,'cached shared image is still checked against B dimensions');await dims.close();

  const late=await page();await late.route('**/phb-fixture-a.json',async r=>{await new Promise(resolve=>setTimeout(resolve,350));await r.continue();});
  await open(late,A);await open(late,B);await shown(late);await late.waitForTimeout(450);
  check((await checked(late)).includes('B'),'late A catalog cannot overwrite B fields');check((await late.locator('.source-viewer-item').textContent())==='Fixture B','late A catalog keeps B heading');
  await open(late,A);await shown(late);check((await checked(late)).includes('A'),'late A catalog remains reusable for A');check(late.net.filter(r=>r.url.endsWith('/phb-fixture-a.json')).length===1,'late A resolved cache avoids refetch');await late.close();

  const closeRace=await page();await closeRace.route('**/phb-fixture-a.json',async r=>{await new Promise(resolve=>setTimeout(resolve,300));await r.continue();});
  await open(closeRace,A);await closeRace.evaluate(({entry})=>{document.querySelector('dialog').close();FirstEditionSourceViewer.open({item:entry,contextItemId:entry.id,references:[{book:'PHB',pages:[35]}]});},{entry:B});
  await shown(closeRace);await closeRace.waitForTimeout(400);
  check(await closeRace.locator('dialog').evaluate(n=>n.open),'queued old Close cannot close B');check((await checked(closeRace)).includes('B'),'queued old Close cannot cancel B rendering');check(await closeRace.evaluate(()=>document.body.classList.contains('source-viewer-open')),'queued Close preserves B scroll lock');await closeRace.close();

  const shared=await page();await shared.route('**/phb35-dagger-price.png',async r=>{await new Promise(resolve=>setTimeout(resolve,300));await r.continue();});
  const sharedRequest=shared.waitForRequest('**/phb35-dagger-price.png');await open(shared,A);await sharedRequest;await open(shared,B);await shown(shared);
  check((await checked(shared)).includes('B'),'late shared image uses current B caption');check(Math.abs(await shared.locator('.source-viewer-focus-rect').evaluate(n=>parseFloat(n.style.top))-55)<.01,'late shared image uses B focus box');check(shared.net.filter(r=>r.url.endsWith('/phb35-dagger-price.png')).length===1,'in-flight shared image has one URL request');await shared.close();

  const failedA=await page();await failedA.route('**/phb-fixture-b.json',r=>r.fulfill({json:catalog(B.id,'B',[base.regions[1]])}));await failedA.route('**/phb35-dagger-price.png',async r=>{await new Promise(resolve=>setTimeout(resolve,400));await r.fulfill({status:404,body:'Missing'});});
  const failedImage=failedA.waitForRequest('**/phb35-dagger-price.png');await open(failedA,A);await failedImage;await open(failedA,B,[{book:'PHB',pages:[37]}]);await shown(failedA);await failedA.waitForTimeout(500);
  check((await checked(failedA)).includes('B'),'late A image failure cannot replace B caption');check(await failedA.locator('.source-viewer-file-row').isHidden(),'late A failure cannot force B to PDF');check(failedA.errors.length===0,'late A error is handled');await failedA.close();

  const privateChoice=await page();await privateChoice.route('**/phb-fixture-a.json',async r=>{await new Promise(resolve=>setTimeout(resolve,250));await r.continue();});await open(privateChoice,A);await privateChoice.getByRole('button',{name:'Your PDF',exact:true}).click();await privateChoice.waitForTimeout(400);
  check(await privateChoice.locator('.source-viewer-file-row').isVisible(),'late catalog respects explicit private PDF choice');check(!privateChoice.net.some(r=>r.url.endsWith('.png')),'private mode choice avoids background PNG fetch');await privateChoice.close();

  const retry=await page();let attempts=0;await retry.route('**/phb-fixture-a.json',async r=>{if(++attempts===1)await r.fulfill({status:503,body:'Unavailable'});else await r.continue();});await open(retry,A);await fail(retry,'catalog failure offers private reader');await retry.waitForTimeout(150);check(attempts===1,'catalog failure does not auto retry');await retry.getByRole('button',{name:'Retry verified excerpts',exact:true}).click();await shown(retry);check(attempts===2,'explicit retry reloads only current catalog');await retry.close();

  let actual=0;
  if(!fixtureOnly){
    const entries=data.equipment.filter(e=>e.scanVerification?.state==='selected-values-checked'&&e.scanVerification.catalog);
    check(entries.length>=8,'eight explicitly checked entries are assembled');
    const real=await page();
    for(const entry of entries){
      const manifest=JSON.parse(await readFile(path.join(root,entry.scanVerification.catalog),'utf8'));
      const references=[...new Set(manifest.regions.map(r=>r.book))].map(book=>({book,pages:[...new Set(manifest.regions.filter(r=>r.book===book).map(r=>r.printedPage))]}));
      await open(real,entry,references);await shown(real);
      check((await real.locator('.source-viewer-item').textContent())===entry.name,`${entry.id} heading matches actual item`);
      for(let pageIndex=0;pageIndex<references.flatMap(r=>r.pages).length;pageIndex++){
        await real.locator('[aria-label="Select cited page"]').selectOption(String(pageIndex));await shown(real);
        const regionCount=await real.locator('#source-viewer-region option').count();
        for(let i=0;i<regionCount;i++){
          if(regionCount>1)await real.locator('#source-viewer-region').selectOption(String(i));await shown(real);
          check(await real.locator('.source-viewer-scan').evaluate(n=>n.complete&&n.naturalWidth>0),`${entry.id} actual image decodes`);actual++;
        }
      }
      check(!(await real.locator('#source-viewer-privacy').textContent()).includes('Dagger:')||entry.id==='phb-dagger',`${entry.id} privacy is not inherited from dagger`);
    }
    await real.screenshot({path:path.join(evidence,'actual-last-item.png'),fullPage:true});check(real.errors.length===0,'actual item catalogs have no uncaught errors');await real.close();
  }
  console.log(JSON.stringify({passed:checks,actualRegions:actual,fixtureOnly,evidence,publication:'local-only'},null,2));
}catch(error){console.error(await activePage?.locator('.source-viewer-main').textContent().catch(()=>''));await activePage?.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
