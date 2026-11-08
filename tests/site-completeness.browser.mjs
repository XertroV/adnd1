import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname,resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/workspace/adnd1-devtools/node_modules/playwright');
const dist=resolve(new URL('../dist',import.meta.url).pathname);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const file=resolve(dist,`.${pathname==='/'?'/index.html':pathname}`);if(!file.startsWith(dist+'/'))throw Error('path');res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
const base=`http://127.0.0.1:${server.address().port}`;
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const matrix=data.matrices[0],monk=data.classes.find(item=>item.id==='monk'),acrobat=data.classes.find(item=>item.id==='ua-thief-acrobat');
const addedDmg74MatrixIds=['dmg-cleric-druid-monk-attack-matrix','dmg-magic-user-illusionist-attack-matrix','dmg-thief-assassin-attack-matrix'];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const checks=[];const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
const errors=[];
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:1000}});await desktop.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:base});desktop.on('pageerror',error=>errors.push(error.message));
 await desktop.goto(`${base}/#classes/fighter`);await desktop.locator('#referenceDetail h2').waitFor();
 await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('fighters paladins rangers related attackers');
 check('global palette finds the matrix from authored title terms',await desktop.locator('#commandResultCount').innerText()==='Showing 1 of 1 matching references'&&await desktop.locator('#commandResults .result-type').first().innerText()==='MATRIX');
 await desktop.locator('#commandResults [data-command-index="0"]').click();await desktop.waitForFunction(id=>location.hash===`#matrices/${id}`,matrix.id);
 check('selecting the matrix result opens its compound collection route',await desktop.locator('#referenceDetail h2').innerText()===matrix.title&&await desktop.locator('.matrix-table tbody td').count()===matrix.coverage.totalCells);
 check('the existing Fighter matrix retains its Fighter advancement backlink',await desktop.locator('#main a[href="#classes/fighter"]').innerText()==='Fighter advancement ↗');
 const visibleMatrixText=await desktop.locator('#referenceDetail').innerText();check('the matrix record shows its status and generic authored title',visibleMatrixText.includes(matrix.status)&&(await desktop.locator('.matrix-table caption').textContent()).startsWith(matrix.title));
 check('the direct matrix route exposes its original matrix citation owner',JSON.parse(await desktop.locator('#referenceDetail .matrix-rule-note [data-inline-source]').first().getAttribute('data-ref-targets'))[0].sourceOwner?.collection==='matrices'&&JSON.parse(await desktop.locator('#referenceDetail .matrix-rule-note [data-inline-source]').first().getAttribute('data-ref-targets'))[0].sourceOwner?.itemId===matrix.id);
 await desktop.locator('#referenceDetail .matrix-rule-note [data-inline-source]').first().click();await desktop.locator('dialog.source-viewer[open]').waitFor();
 check('opening matrix evidence keeps the route in the matrices owner namespace',new URL(desktop.url()).hash.startsWith(`#matrices/${matrix.id}?source=`));
 await desktop.keyboard.press('Escape');await desktop.waitForFunction(()=>!document.querySelector('dialog.source-viewer[open]'));
 await desktop.goBack();await desktop.waitForFunction(()=>location.hash==='#matrices/dmg-original-fighter-attack-matrix');
 check('Back from the evidence URL returns to the matrix detail',await desktop.locator('#referenceDetail h2').innerText()===matrix.title);
 await desktop.goBack();await desktop.waitForFunction(()=>location.hash==='#classes/fighter');
 check('Back from the matrix detail returns to existing Fighter route',await desktop.locator('#referenceDetail h2').innerText()==='Fighter');
 await desktop.goForward();await desktop.waitForFunction(id=>location.hash===`#matrices/${id}`,matrix.id);
 await desktop.reload();await desktop.locator('#referenceDetail h2').waitFor();
 check('direct matrix route survives reload',await desktop.locator('#referenceDetail h2').innerText()===matrix.title&&await desktop.locator('.matrix-table tbody td').count()===matrix.coverage.totalCells);
 await desktop.locator('[data-copy-link]').click();
 check('copy reference link preserves the matrix collection route',(await desktop.evaluate(()=>navigator.clipboard.readText())).includes(`#matrices/${matrix.id}`));

 const newMatrixQueries=[
  ['dmg-cleric-druid-monk-attack-matrix','PHB printed 30'],
  ['dmg-magic-user-illusionist-attack-matrix','normal not magical'],
  ['dmg-thief-assassin-attack-matrix','quintuple surprise back stab'],
 ];
 const newMatrixRecords=data.matrices.filter(item=>addedDmg74MatrixIds.includes(item.id));
 check('current assembled data contains exactly the three added DMG p. 74 matrices',newMatrixRecords.map(item=>item.id).sort().join(',')===[...addedDmg74MatrixIds].sort().join(','));
 for(const [id,query] of newMatrixQueries){
  const target=newMatrixRecords.find(item=>item.id===id);
  await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill(query);
  const match=desktop.locator('#commandResults .palette-result').filter({hasText:target.title});
  check(`global search finds ${id} from its authored source text`,await match.count()===1&&await match.locator('.result-type').innerText()==='MATRIX');
  await match.click();await desktop.waitForFunction(route=>location.hash===route,`#matrices/${id}`);
  check(`the searchable ${id} opens its own matrix route`,await desktop.locator('#referenceDetail h2').innerText()===target.title&&await desktop.locator('.matrix-table tbody td').count()===target.coverage.totalCells);
  if(id==='dmg-cleric-druid-monk-attack-matrix'){
   const conflict=desktop.locator('.matrix-source-conflict');
   const conflictText=await conflict.innerText();
   check('matrix detail shows only the recorded unresolved source readings and disposition',conflictText.includes('Monk attack matrix')&&conflictText.includes('PHB printed p. 30')&&conflictText.includes('DMG printed p. 74, I.A names clerics, druids and monks')&&conflictText.includes('Unresolved source conflict; this DMG table does not adjudicate or reconcile it.'));
   await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('Open Monk class guide');
   const guideLabelMatch=desktop.locator('#commandResults .palette-result').filter({hasText:target.title});
   check('global search indexes the visible validated Monk class-guide link label',await guideLabelMatch.count()===1&&await guideLabelMatch.locator('.result-type').innerText()==='MATRIX');
   await guideLabelMatch.click();await desktop.waitForFunction(route=>location.hash===route,`#matrices/${id}`);
   const monkLink=conflict.locator('a.matrix-conflict-class-guide');
   check('matrix conflict links to the existing Monk class guide without choosing a reading',await monkLink.getAttribute('href')==='#classes/monk'&&(await monkLink.innerText()).includes('Monk class guide'));
   await monkLink.click();await desktop.waitForFunction(()=>location.hash==='#classes/monk');
   check('the conflict link opens the Monk guide and retains its printed conflict wording',await desktop.locator('#referenceDetail h2').innerText()==='Monk'&&await desktop.locator('[data-note-field="attackTableNote"] p').innerText()===monk.attackTableNote);
  }
 }

 await desktop.goto(`${base}/#classes`);await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('navigation gloss');
 check('global palette finds progression prose without a class alias',await desktop.locator('#commandResultCount').innerText()==='Showing 1 of 1 matching references'&&await desktop.locator('#commandResults .result-type').first().innerText()==='PROGRESSION');
 await desktop.locator('#commandResults [data-command-index="0"]').click();await desktop.waitForFunction(()=>location.hash==='#progressionExplainer/progression-explainer');
 check('selecting the progression result opens its own route with sections and top-level references',await desktop.locator('.progression-detail-section').count()===3&&await desktop.locator('.progression-overview-sources [data-inline-source]').count()===data.progressionExplainer.references.length&&(await desktop.locator('#referenceDetail').innerText()).includes('The Character With Two Classes'));
 const progressionTarget=JSON.parse(await desktop.locator('.progression-overview-sources [data-inline-source]').first().getAttribute('data-ref-targets'))[0];
 check('progression evidence keeps its progressionExplainer source and field owners',progressionTarget.sourceOwner?.collection==='progressionExplainer'&&progressionTarget.sourceOwner?.itemId==='progression-explainer'&&progressionTarget.fieldOwner?.collection==='progressionExplainer');
 await desktop.locator('.progression-overview-sources [data-inline-source]').first().click();await desktop.locator('dialog.source-viewer[open]').waitFor();
 check('opening progression evidence keeps the route in the progression owner namespace',new URL(desktop.url()).hash.startsWith('#progressionExplainer/progression-explainer?source='));
 await desktop.keyboard.press('Escape');await desktop.waitForFunction(()=>!document.querySelector('dialog.source-viewer[open]'));
 await desktop.locator('[data-copy-link]').click();
 check('copy reference link preserves the progression collection route',(await desktop.evaluate(()=>navigator.clipboard.readText())).includes('#progressionExplainer/progression-explainer'));
 await desktop.goBack();await desktop.waitForFunction(()=>location.hash==='#progressionExplainer/progression-explainer');
 await desktop.goBack();await desktop.waitForFunction(()=>location.hash==='#classes');
 check('Back returns to existing Classes view',await desktop.locator('#referenceSearch').getAttribute('aria-label')==='Search classes');
 await desktop.goForward();await desktop.waitForFunction(()=>location.hash==='#progressionExplainer/progression-explainer');await desktop.reload();await desktop.waitForFunction(count=>document.querySelectorAll('.progression-terminology li').length===count,data.progressionExplainer.terminologyNotes.length);
 check('direct progression route survives reload and keeps all terminology notes',await desktop.locator('.progression-detail-section').count()===3&&await desktop.locator('.progression-terminology li').count()===data.progressionExplainer.terminologyNotes.length);

 await desktop.goto(`${base}/#classes/monk`);await desktop.locator('#referenceDetail h2').waitFor();
 check('Monk attack-table note is visible exactly once on its class detail',await desktop.locator('[data-note-field="attackTableNote"] p').innerText()===monk.attackTableNote&&await desktop.getByText(monk.attackTableNote,{exact:true}).count()===1);
 check('the duplicate Monk note is omitted from the separate pending-extraction list',!(await desktop.locator('details.pending-class-notes li').allTextContents()).includes(monk.attackTableNote));
 await desktop.locator('details.pending-class-notes summary').click();
 check('pending mechanics are disclosed as extraction notes rather than class rules',(await desktop.locator('details.pending-class-notes').innerText()).includes('not extracted class rules or resolved mechanics')&&await desktop.locator('details.pending-class-notes li').count()>0);
 await desktop.goto(`${base}/#classes/ua-thief-acrobat`);await desktop.locator('#referenceDetail h2').waitFor();
 check('Thief-acrobat retained-skills note is visible in full',await desktop.locator('[data-note-field="retainedSkillsNote"] p').innerText()===acrobat.retainedSkillsNote);
 await desktop.locator('#referenceSearch').fill('categorical freeze');await desktop.waitForTimeout(180);
 check('unique retained-skills note wording returns the Thief-acrobat class',(await desktop.locator('.result-item').evaluateAll(es=>es.map(e=>e.dataset.select))).includes('ua-thief-acrobat'));
 await desktop.goto(`${base}/#classes/magic-user`);await desktop.locator('#referenceDetail h2').waitFor();
 await desktop.locator('#referenceSearch').fill('1875001');await desktop.waitForTimeout(180);
 check('a displayed level-15 XP threshold is searchable and resolves to Magic-user',await desktop.locator('.result-item').count()===1&&await desktop.locator('.result-item').first().getAttribute('data-select')==='magic-user'&&await desktop.locator('tr[data-xp-level="15"] td').nth(1).innerText()==='1,875,001');
 await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('not assessed by field target review');
 check('private source-review metadata remains excluded from global search',await desktop.locator('#commandResultCount').innerText()==='No matching references');
 check('desktop routes and citations complete without browser errors',errors.length===0);

 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const mobileErrors=[];mobile.on('pageerror',error=>mobileErrors.push(error.message));
 await mobile.goto(`${base}/#classes`);await mobile.locator('#mobileSearchOpen').click();await mobile.locator('#commandInput').fill('fighters paladins rangers related attackers');
 check('mobile global search finds the matrix',await mobile.locator('#commandResults .result-type').first().innerText()==='MATRIX');
 await mobile.locator('#commandResults [data-command-index="0"]').click();await mobile.waitForFunction(id=>location.hash===`#matrices/${id}`,matrix.id);
 check('matrix detail remains in the viewport on mobile without page-level horizontal overflow',await mobile.locator('#referenceDetail h2').innerText()===matrix.title&&await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 check('matrix table scrolls inside its own mobile container',await mobile.locator('.matrix-scroll').evaluate(el=>el.scrollWidth>=el.clientWidth));
 await mobile.goto(`${base}/#progressionExplainer/progression-explainer`);
 check('progression detail remains readable on mobile without page-level horizontal overflow',await mobile.locator('.progression-detail-section').count()===3&&await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 check('mobile routes complete without browser errors',mobileErrors.length===0);

 const genericMatrix={id:'synthetic-generic-matrix-route-test',title:'Synthetic generic matrix route test',book:'UA',pages:[23],status:'test fixture; no source proof',attackerLabel:'Test attacker level',armorClasses:[0],rows:[{label:'Test row',targets:[20]}],notes:[],ruleNotes:[],comparisonExamples:[]};
 const genericData={...data,matrices:[...data.matrices,genericMatrix]};
 const genericPage=await browser.newPage({viewport:{width:1200,height:900}});const genericErrors=[];genericPage.on('pageerror',error=>genericErrors.push(error.message));
 await genericPage.route('**/data.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(genericData)}));
 await genericPage.goto(`${base}/#matrices/${genericMatrix.id}`);await genericPage.locator('#referenceDetail h2').waitFor();
 check('a non-Fighter matrix uses the generic class-guides backlink',await genericPage.locator('#main a[href="#classes"]').innerText()==='Class guides ↗'&&await genericPage.locator('#main a[href="#classes/fighter"]').count()===0);
 const genericHeader=await genericPage.locator('.matrix-table th[scope="col"]').first().innerText();
 check('generic matrix detail labels its row header from the record and has no browser errors',genericHeader.toLowerCase()==='test attacker level'&&genericErrors.length===0);

 const privateNotes={privateReviewNote:'PRIVATE REVIEW CANARY 7f02b81',sourceProvenanceNote:'SOURCE PROVENANCE CANARY 1a93c47'};
 const noteCanaryData={...data,classes:data.classes.map(item=>item.id===monk.id?{...item,...privateNotes}:item)};
 const noteCanaryPage=await browser.newPage({viewport:{width:1200,height:900}});const noteCanaryErrors=[];noteCanaryPage.on('pageerror',error=>noteCanaryErrors.push(error.message));
 await noteCanaryPage.route('**/data.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(noteCanaryData)}));
 await noteCanaryPage.goto(`${base}/#classes/${monk.id}`);await noteCanaryPage.locator('#referenceDetail h2').waitFor();
 const injectedClassText=await noteCanaryPage.locator('#referenceDetail').innerText();
 check('class detail renders only explicit note fields when unknown private note keys are injected',injectedClassText.includes(monk.attackTableNote)&&!injectedClassText.includes(privateNotes.privateReviewNote)&&!injectedClassText.includes(privateNotes.sourceProvenanceNote)&&await noteCanaryPage.locator('[data-note-field="privateReviewNote"],[data-note-field="sourceProvenanceNote"]').count()===0&&noteCanaryErrors.length===0);
 await noteCanaryPage.locator('#referenceSearch').fill('7f02b81');await noteCanaryPage.waitForTimeout(180);
 check('injected private note canary remains absent from class search',await noteCanaryPage.locator('.result-item').count()===0);

 const conflictCanary='PRIVATE SOURCE-CONFLICT METADATA 5c19e02';
 const conflictCanaryData={...data,matrices:data.matrices.map(item=>item.id==='dmg-cleric-druid-monk-attack-matrix'?{...item,sourceConflict:{...item.sourceConflict,privateReviewNote:conflictCanary,internalRuling:'This private field must not be presented as a source conclusion.',relatedClassGuideId:'missing-class-guide'}}:item)};
 const conflictCanaryPage=await browser.newPage({viewport:{width:1200,height:900}});const conflictCanaryErrors=[];conflictCanaryPage.on('pageerror',error=>conflictCanaryErrors.push(error.message));
 await conflictCanaryPage.route('**/data.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(conflictCanaryData)}));
 await conflictCanaryPage.goto(`${base}/#matrices/dmg-cleric-druid-monk-attack-matrix`);await conflictCanaryPage.locator('.matrix-source-conflict').waitFor();
 const conflictCanaryText=await conflictCanaryPage.locator('.matrix-source-conflict').innerText();
 check('matrix conflict renderer whitelists topic, cited locations and disposition and validates the related guide ID',conflictCanaryText.includes('Monk attack matrix')&&conflictCanaryText.includes('PHB printed p. 30')&&conflictCanaryText.includes('Unresolved source conflict')&&!conflictCanaryText.includes(conflictCanary)&&!conflictCanaryText.includes('private field must not be presented')&&await conflictCanaryPage.locator('.matrix-conflict-class-guide').count()===0&&conflictCanaryErrors.length===0);
 await conflictCanaryPage.locator('#paletteOpen').click();await conflictCanaryPage.locator('#commandInput').fill('5c19e02');
 check('unknown source-conflict metadata remains excluded from global search',await conflictCanaryPage.locator('#commandResultCount').innerText()==='No matching references');
 await conflictCanaryPage.locator('#commandInput').fill('Open Monk class guide');
 check('an unresolved class-guide ID does not create a searchable matrix link or clickable route',await conflictCanaryPage.locator('#commandResults .palette-result').filter({hasText:'Attack Matrix for Clerics, Druids and Monks'}).count()===0&&await conflictCanaryPage.locator('.matrix-conflict-class-guide').count()===0);
 console.log(JSON.stringify({passed:checks.length,checks,errors,mobileErrors,ownerCounts:{spells:data.spells.length,rules:data.rules.length,equipment:data.equipment.length,classes:data.classes.length,matrices:data.matrices.length,progressionExplainer:1}},null,2));
}finally{await browser.close();await new Promise(resolveClose=>server.close(resolveClose));}
