// The explainer's citations must bind to the explainer, not the selected class.
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const data=JSON.parse(await readFile('dist/data.json','utf8')),base=JSON.parse(await readFile('dist/scans/dagger/manifest.json','utf8'));
data.progressionExplainer.sourceExcerpts={state:'source-excerpt-checked',catalog:'scans/verified/progression-explainer.json',regionCount:1};
const catalog={schemaVersion:1,itemId:'progression-explainer',scope:'Passage only.',sources:{PHB:{sha256:'a'.repeat(64),hashStatus:'computed-local'}},regions:[{...base.regions[0],id:'explainer',book:'PHB',printedPage:32,pdfPage:33,image:'fixture.png',verificationScope:'source-excerpt'}]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{const p=await browser.newPage();await p.route('**/data.json',r=>r.fulfill({json:data}));await p.route('**/scans/verified/progression-explainer.json',r=>r.fulfill({json:catalog}));await p.route('**/scans/verified/fixture.png',r=>r.fulfill({path:'dist/scans/dagger/'+base.regions[0].image,contentType:'image/png'}));await p.goto('http://127.0.0.1:8765/#classes/fighter');await p.locator('.progression-explainer summary').click();await p.locator('.progression-explainer [data-inline-source]').first().click();await p.locator('.source-viewer-status').filter({hasText:'excerpt 1 of 1'}).waitFor();assert.match(await p.locator('#source-viewer-privacy').textContent(),/extracted values retain their existing status/);console.log('Progression explainer source context passed.');}finally{await browser.close();}
