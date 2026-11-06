// Exercises only the seven explicitly approved dagger excerpts; never serves source PDFs.
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const evidence = await mkdtemp(path.join(tmpdir(), 'adnd-dagger-viewer-'));
const catalog = JSON.parse(await readFile(path.join(root, 'scans/dagger/manifest.json'), 'utf8'));
const harness = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dagger excerpts</title><link rel="stylesheet" href="/source-viewer.css"></head><body><button id="opener">Dagger sources</button><script src="/books.js"></script><script src="/source-viewer.js"></script><script>window.daggerReferences=[{book:'PHB',pages:[35,37,38]},{book:'UA',pages:[28]}];document.querySelector('#opener').onclick=()=>FirstEditionSourceViewer.open({item:{id:'phb-dagger',name:'Dagger'},contextItemId:'phb-dagger',references:daggerReferences});</script></body></html>`;
const server = http.createServer(async (req,res) => {
  if (req.url === '/') { res.setHeader('Content-Type','text/html;charset=utf-8'); res.end(harness); return; }
  if (req.url === '/favicon.ico') { res.writeHead(204);res.end();return; }
  const filename = path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if (!filename.startsWith(root+path.sep)) { res.writeHead(403);res.end();return; }
  try {
    const bytes = await readFile(filename);
    res.setHeader('Content-Type',({'.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.json':'application/json'})[path.extname(filename)] || 'application/octet-stream');
    res.end(bytes);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let count=0,currentPage;
const check=(value,label)=>{assert.ok(value,label);count++;};
const shown=page=>page.locator('.source-viewer-status').filter({hasText:/· excerpt \d+ of/}).waitFor();
async function newPage() {
  const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
  currentPage=page;page.setDefaultTimeout(10000);
  await page.goto(origin);return page;
}
try {
  const page=await newPage(), requests=[],errors=[];
  page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#opener').click();await shown(page);
  check(await page.getByRole('button',{name:'Verified excerpts',exact:true}).getAttribute('aria-pressed')==='true','dagger defaults to verified excerpts');
  check(await page.locator('.source-viewer-file-row').isHidden(),'excerpt mode does not ask for a PDF');
  check(await page.locator('.source-viewer-controls select option').count()===4,'four cited pages remain four navigation choices');
  check(await page.locator('.source-viewer-scan').getAttribute('src')===origin+'/scans/dagger/phb35-dagger-price.png','PHB35 price image chosen');
  check((await page.locator('.source-viewer-checked-values').textContent()).includes('2 gp'),'accessible checked price shown');
  check(await page.locator('.source-viewer-focus-rect').count()===1,'verified rectangle shown');
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});await page.waitForTimeout(200);await shown(page);
    check(await page.locator('.source-viewer-stage').evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${width}px default price crop shows full price column without horizontal pan`);
    check(await page.locator('#source-viewer-region').isHidden(),`${width}px single excerpt selector is hidden`);
    check(await page.getByRole('button',{name:/^Highlights (on|off)$/}).isVisible(),`${width}px single excerpt retains highlights`);
  }
  await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(200);await shown(page);
  await page.getByRole('button',{name:/^Highlights (on|off)$/}).click();
  check(await page.locator('.source-viewer-focus-overlay').isHidden(),'highlights can be disabled');
  await page.getByRole('button',{name:/^Highlights (on|off)$/}).click();
  const visited=[];
  for(let pageIndex=0;pageIndex<4;pageIndex++) {
    await page.locator('.source-viewer-controls select').selectOption(String(pageIndex));await shown(page);
    const options=await page.locator('#source-viewer-region option').count();
    check(options===[1,1,3,2][pageIndex],`page ${pageIndex} has expected excerpt count`);
    check(await page.locator('#source-viewer-region').isVisible()===(options>1),`page ${pageIndex} selector visibility matches actual choice count`);
    for(let regionIndex=0;regionIndex<options;regionIndex++) {
      if(options>1)await page.locator('#source-viewer-region').selectOption(String(regionIndex));
      await page.waitForFunction(({p,r})=>document.querySelector('.source-viewer-status').textContent.includes(`excerpt ${r+1} of ${[1,1,3,2][p]}`),{p:pageIndex,r:regionIndex});
      const src=await page.locator('.source-viewer-scan').getAttribute('src');visited.push(path.basename(src));
      check(await page.locator('.source-viewer-scan').evaluate(n=>n.complete&&n.naturalWidth>0),'actual excerpt decoded');
      const region=catalog.regions.find(r=>r.image===path.basename(src));
      const geometry=await page.locator('.source-viewer-image-frame').evaluate(frame=>{const image=frame.querySelector('img').getBoundingClientRect(),box=frame.querySelector('.source-viewer-focus-rect').getBoundingClientRect();return{x:(box.x-image.x)/image.width,y:(box.y-image.y)/image.height,w:box.width/image.width,h:box.height/image.height};});
      check(['x','y','w','h'].every((key,i)=>Math.abs(geometry[key]-region.focusRects[0][i])<.003),'focus rectangle follows original image coordinates');
    }
  }
  check(new Set(visited).size===7,'all seven approved images visited');
  await page.locator('.source-viewer-controls select').selectOption('1');await shown(page);
  await page.getByRole('button',{name:'Actual size',exact:true}).click();await shown(page);
  check(await page.locator('.source-viewer-image-frame').evaluate(n=>n.offsetWidth)===1700,'actual size uses original PNG width');
  await page.getByRole('button',{name:'Fit width',exact:true}).click();await shown(page);
  check(await page.locator('.source-viewer-stage').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'fit width has no horizontal overflow');
  for(let i=0;i<12;i++)await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  check((await page.locator('.source-viewer-zoom-label').textContent())==='400%','excerpt zoom reaches 400 percent');
  check(await page.getByRole('button',{name:'Zoom in',exact:true}).isDisabled(),'400 percent is upper bound');
  for(const width of [1440,491,390,320]) {
    await page.setViewportSize({width,height:1000});
    await page.getByRole('button',{name:'Actual size',exact:true}).click();await shown(page);
    check(await page.locator('dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${width}px modal fits viewport`);
    check(await page.locator('.source-viewer-main').evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${width}px controls do not overflow`);
    const stage=page.locator('.source-viewer-stage');await stage.scrollIntoViewIfNeeded();await stage.focus();
    await page.keyboard.press('ArrowRight');
    check(await stage.evaluate(n=>n.scrollLeft)>0,`${width}px keyboard pans wide table`);
    await page.screenshot({path:path.join(evidence,`dagger-${width}.png`),fullPage:true});
  }
  await page.getByRole('button',{name:'Your PDF',exact:true}).tap();
  check(await page.locator('.source-viewer-file-row').isVisible(),'touch toggle exposes local PDF reader');
  check(await page.locator('.source-viewer-image-frame').isHidden(),'local PDF mode hides hosted excerpts');
  check((await page.locator('#source-viewer-privacy').textContent()).includes('never uploaded'),'PDF mode has accurate privacy text');
  await page.getByRole('button',{name:'Verified excerpts',exact:true}).click();await shown(page);
  await page.locator('.source-viewer-close').focus();await page.keyboard.press('Shift+Tab');
  check(await page.locator('dialog').evaluate(n=>n.contains(document.activeElement)),'excerpt modal traps reverse tab');
  await page.keyboard.press('Escape');
  check(await page.locator('#opener').evaluate(n=>n===document.activeElement),'close restores opener focus');
  await page.evaluate(()=>FirstEditionSourceViewer.open({item:{id:'phb-dagger',name:'Dagger'},contextItemId:'phb-dagger',references:[{book:'UA',pages:[28]}]}));await shown(page);
  check(await page.locator('.source-viewer-controls select option').count()===1,'field click keeps exact UA28 reference');
  check(await page.locator('#source-viewer-region option').count()===2,'UA28 field offers only two UA excerpts');
  await page.evaluate(()=>FirstEditionSourceViewer.open({item:{id:'phb-crossbow-light',name:'Light crossbow'},references:[{book:'PHB',pages:[35,37,38]}]}));
  check(await page.locator('.source-viewer-modes').isHidden(),'unrelated same-page item has no excerpt mode');
  check(await page.locator('.source-viewer-image-frame').isHidden(),'dagger images never leak to other items');
  await page.evaluate(()=>FirstEditionSourceViewer.open({item:{id:'phb-fighter',name:'Fighter'},contextItemId:'phb-dagger',references:[{book:'PHB',pages:[35]}]}));
  check(await page.locator('.source-viewer-modes').isHidden(),'conflicting explicit item ID rejects dagger context');
  check(requests.every(r=>r.url.startsWith(origin+'/')&&r.method==='GET'&&!r.url.includes('.pdf')),'only same-origin excerpt GETs, no PDF requests or uploads');
  check(!requests.some(r=>r.url.includes('/vendor/')),'excerpt mode does not load PDF.js');
  check(errors.length===0,`no browser errors: ${errors}`);
  await page.close();
  const failure=await newPage();let manifestAttempts=0;
  await failure.route('**/scans/dagger/manifest.json',async route=>{if(++manifestAttempts===1)await route.fulfill({status:503,body:'Unavailable'});else await route.continue();});
  await failure.locator('#opener').click();
  await failure.getByText('Verified excerpts could not be loaded.',{exact:false}).waitFor();
  check(await failure.locator('.source-viewer-file-row').isVisible(),'manifest failure exposes PDF fallback');
  await failure.getByRole('button',{name:'Retry verified excerpts',exact:true}).click();await shown(failure);
  check(manifestAttempts===2,'manifest retry is explicit and succeeds');await failure.close();
  const broken=await newPage();let imageAttempts=0;
  await broken.route('**/scans/dagger/phb35-dagger-price.png',async route=>{if(++imageAttempts===1)await route.fulfill({status:404,body:'Missing'});else await route.continue();});
  await broken.locator('#opener').click();
  await broken.getByText('This verified excerpt could not be loaded.',{exact:false}).waitFor();
  check(await broken.locator('.source-viewer-file-row').isVisible(),'broken image exposes PDF fallback');
  await broken.getByRole('button',{name:'Retry verified excerpts',exact:true}).click();await shown(broken);
  check(imageAttempts===2,'broken image retries once on explicit action');await broken.close();
  const race=await newPage(),raceRequests=[];
  race.on('request',r=>raceRequests.push(r.url()));
  await race.route('**/scans/dagger/manifest.json',async route=>{await new Promise(resolve=>setTimeout(resolve,350));await route.continue();});
  await race.locator('#opener').click();
  await race.evaluate(()=>FirstEditionSourceViewer.open({item:{id:'phb-fighter',name:'Fighter'},references:[{book:'PHB',pages:[35]}]}));
  await race.waitForTimeout(500);
  check(await race.locator('.source-viewer-modes').isHidden(),'late manifest cannot change unrelated modal');
  check(!raceRequests.some(url=>url.endsWith('.png')),'late manifest does not fetch a dagger image for unrelated item');await race.close();
  console.log(JSON.stringify({passed:count,evidence,scope:'Seven dagger crops only; no full-book verification'},null,2));
} catch(error) {
  console.error(await currentPage?.locator('.source-viewer-main').textContent().catch(()=>''));
  await currentPage?.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});
  throw error;
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
