import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {attachEvidenceBindings,buildPriceSourceInventory,validatePriceSourceInventory} from '../tools/price-source-inventory.mjs';
import citations from '../dist/citations.js';
import books from '../dist/books.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const dataBytes=await readFile(path.join(dist,'data.json')),data=JSON.parse(dataBytes);
const inventory=buildPriceSourceInventory({equipment:data.equipment,data});validatePriceSourceInventory(inventory,{equipment:data.equipment,data});attachEvidenceBindings(data,inventory);
const cases=[
 {view:'spells',requested:'phb-cleric-bless',filterRecord:'phb-cleric-command',query:'command'},
 {view:'rules',requested:'character-creation',filterRecord:'six-abilities',query:'six ability scores'},
 {view:'equipment',requested:'phb-bo-stick',filterRecord:'phb-banded-mail',query:'banded mail'},
 {view:'classes',requested:'fighter',filterRecord:'cleric',query:'cleric'}
];
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/data.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;}
  const file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(dist+path.sep))throw Error('path traversal');
  const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const observations=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(20000);
 page.on('pageerror',error=>observations.push({type:'browser-error',detail:error.message}));
 const readView=async(view,id,caseType)=>({caseType,view,requestedId:id,hash:await page.evaluate(()=>location.hash),detailId:await page.locator('#referenceDetail .detail-card').getAttribute('data-annotation-target'),filter:await page.locator('#referenceSearch').inputValue(),sourceViewerOpen:await page.locator('dialog.source-viewer').evaluate(dialog=>dialog.open).catch(()=>false),sourceViewerItem:await page.locator('dialog.source-viewer .source-viewer-item').innerText().catch(()=>''),visibleResultIds:await page.locator('.result-item').evaluateAll(buttons=>buttons.map(button=>button.dataset.select))});
 const prepareFilter=async fixture=>{
  const filterHash=`#${fixture.view}/${encodeURIComponent(fixture.filterRecord)}`;
  await page.goto(`${origin}/${filterHash}`);await page.locator(`#referenceDetail .detail-card[data-annotation-target="${fixture.filterRecord}"]`).waitFor();
  await page.locator('#referenceSearch').fill(fixture.query);
  await page.waitForFunction(({id})=>!!document.querySelector(`[data-select="${CSS.escape(id)}"]`),{id:fixture.filterRecord});
  await page.waitForTimeout(140);
  const resultIds=await page.locator('.result-item').evaluateAll(buttons=>buttons.map(button=>button.dataset.select));
  assert.ok(resultIds.length,`${fixture.view}: filter query must produce at least one result`);
  assert.ok(!resultIds.includes(fixture.requested),`${fixture.view}: filtered result set must exclude requested deep-link item`);
  assert.equal(await page.locator('#referenceSearch').inputValue(),fixture.query);
 };
 const setRoute=async hash=>{
  await page.evaluate(next=>{location.hash=next;},hash);
  await page.waitForFunction(expected=>location.hash===expected,hash);
  await page.waitForFunction(()=>!!document.querySelector('#referenceDetail .detail-card'));
 };

 for(const fixture of cases){
  const requestedItem=data[fixture.view].find(item=>item.id===fixture.requested),filterItem=data[fixture.view].find(item=>item.id===fixture.filterRecord);
  assert.ok(requestedItem&&filterItem,`${fixture.view}: fixture records must exist`);
  const route=`#${fixture.view}/${encodeURIComponent(fixture.requested)}`;
  await prepareFilter(fixture);await setRoute(route);observations.push(await readView(fixture.view,fixture.requested,'direct-same-view-route'));

  const firstCitation=citations.collect(requestedItem)[0];assert.ok(firstCitation?.pages?.length,`${fixture.view}: requested item has a cited page`);
  const sourceRoute=`${route}?source=${encodeURIComponent(`${books.code(firstCitation.book)}:${firstCitation.pages[0]}`)}`;
  await prepareFilter(fixture);await setRoute(sourceRoute);await page.locator('dialog.source-viewer[open]').waitFor();observations.push(await readView(fixture.view,fixture.requested,'direct-source-link'));
  await page.goto(`${origin}/#${fixture.view}/${encodeURIComponent(fixture.filterRecord)}`);

  await prepareFilter(fixture);await setRoute(route);observations.push(await readView(fixture.view,fixture.requested,'history-forward-target'));
  await page.goBack();await page.waitForFunction(hash=>location.hash===hash,`#${fixture.view}/${encodeURIComponent(fixture.filterRecord)}`);await page.waitForFunction(()=>document.querySelector('#referenceDetail .detail-card')?.dataset.annotationTarget);
  observations.push(await readView(fixture.view,fixture.filterRecord,'history-back-filter-record'));
  await page.goForward();await page.waitForFunction(hash=>location.hash===hash,route);await page.waitForFunction(()=>document.querySelector('#referenceDetail .detail-card')?.dataset.annotationTarget);
  observations.push(await readView(fixture.view,fixture.requested,'history-forward-filtered-target'));
 }
 const browserErrors=observations.filter(row=>row.type==='browser-error');
 const routeResults=observations.filter(row=>row.caseType);
 const report={schemaVersion:1,purpose:'Pre-fix baseline for an explicit same-view route whose requested record is excluded by an active nonempty filter. Captures direct detail route, source deep link, Back and Forward in all four filterable collections.',provenance:{gitHead:(await import('node:child_process')).execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dataSha256:createHash('sha256').update(dataBytes).digest('hex'),distAppSha256:createHash('sha256').update(await readFile(path.join(dist,'app.js'))).digest('hex'),browserVersion:browser.version(),viewport:{width:1280,height:900}},fixtures:cases.map(fixture=>({...fixture,sourcePage:citations.collect(data[fixture.view].find(item=>item.id===fixture.requested))[0]?.pages?.[0]})),outcome:{cases:routeResults.length,mismatches:routeResults.filter(row=>row.detailId!==row.requestedId).length,filterRetained:routeResults.filter(row=>row.filter===cases.find(fixture=>fixture.view===row.view)?.query).length,sourceViewerOpen:routeResults.filter(row=>row.sourceViewerOpen).length,browserErrors},observations:routeResults};
 const baselineMode=process.argv.includes('--capture-baseline');
 if(baselineMode){const output=process.argv[process.argv.indexOf('--capture-baseline')+1];if(!output)throw new Error('Use --capture-baseline <path>');await writeFile(path.resolve(root,output),JSON.stringify(report,null,2)+'\n');}
 else{
  assert.equal(browserErrors.length,0,'browser has no script errors');
  const mismatches=routeResults.filter(row=>row.detailId!==row.requestedId);
  assert.deepEqual(mismatches,[],`explicit routes must show their requested detail, found: ${mismatches.map(row=>`${row.view}/${row.requestedId} displayed ${row.detailId} (${row.caseType})`).join('; ')}`);
  assert.ok(routeResults.filter(row=>row.caseType==='direct-source-link').every(row=>row.sourceViewerOpen&&row.sourceViewerItem), 'source links open the requested source viewer');
  console.log(`Filtered same-view deep links, source links, and Back/Forward remain aligned across ${cases.length} views.`);
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
