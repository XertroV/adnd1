import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.TEST_URL||'http://127.0.0.1:8768';
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const candidates=JSON.parse(readFileSync(new URL('../research/missile-table-discoverability/implementation-candidate/rules-records-candidate.json',import.meta.url),'utf8')).records;
const candidateIds=['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'];
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const context=async options=>{
 const page=await browser.newPage(options);
 await page.route('**/data.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...data,rules:[...data.rules,...candidates]})}));
 return page;
};
try{
 const desktop=await context({viewport:{width:1440,height:1000}});
 await desktop.goto(`${base}/#rules`);await desktop.locator('.result-item').first().waitFor();
 await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('hurled weapons');
 await desktop.locator('#commandResults [data-command-index="0"]').waitFor();
 const count=Number((await desktop.locator('#commandResultCount').innerText()).match(/of ([\d,]+)/)?.[1]?.replaceAll(',',''));
 check(count>18,'hurled weapons crosses the app palette visible cutoff, exposing Show all');
 check(await desktop.locator('#commandResults [data-command-index="0"] .result-title').innerText().then(text=>text.startsWith('PHB p. 38'))&&await desktop.locator('#commandResults [data-command-index="1"] .result-title').innerText().then(text=>text.startsWith('UA p. 28')),'both source tables rank ahead of the weapon cards');
 await desktop.locator('#commandShowAll').click();
 check(await desktop.locator('#commandResults [role="option"]').count()===count,'Show all exposes every global match');
 await desktop.locator('#commandResults [data-command-index="0"]').click();await desktop.waitForFunction(()=>location.hash==='#rules/phb-hurled-weapons-and-missiles-table');
 const phb= candidates[0];
 check(await desktop.locator('.source-rule-table caption').innerText()===phb.table.title,'the PHB result opens its own titled table');
 check(await desktop.locator('.source-rule-table tbody tr').count()===15&&await desktop.locator('.source-rule-table thead tr').nth(1).locator('th').count()===13,'the PHB table renders all 15 rows and its distinct 13 columns');
 check(await desktop.locator('.source-table-notes h3').textContent()==='Source notes and Armor Class column key','the PHB source-note heading renders the separate Armor Class column key');
 check(await desktop.locator('.table-note-source').count()===5,'PHB printed source notes and three PHB36 armor rows render five owner-scoped note targets');
 const phbTargets=await desktop.locator('.table-note-source').evaluateAll(buttons=>buttons.map(button=>JSON.parse(button.dataset.refTargets||'[]')[0]||null));
 check(phbTargets.every(target=>target?.sourceOwner?.itemId===phb.id&&target.targetStatus==='pending')&&phbTargets.filter(target=>target?.book==='PHB'&&target.page===36).length===3,'PHB36 armor-key targets retain the table owner and visibly pending review state');
 await desktop.locator('.table-note-source').nth(2).click();await desktop.locator('dialog.source-viewer[open]').waitFor();
 await desktop.waitForFunction(()=>location.hash.includes('source=PHB%3A36')&&location.hash.includes('target=pending')&&location.hash.includes('field=%2Ftable%2FsourceNotes%2F2'));
 check(await desktop.evaluate(()=>location.hash.includes('#rules/phb-hurled-weapons-and-missiles-table?')&&!location.hash.includes('region='))&&await desktop.locator('.source-viewer').innerText().then(text=>text.includes('no reviewed excerpt mapping yet')),'a PHB36 armor key opens only its pending owner/field route until its source target is independently reviewed');
 await desktop.locator('dialog.source-viewer[open] .source-viewer-close').click();await desktop.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
 await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('UA 28 hurled weapons');
 await desktop.locator('#commandResults [data-command-index="0"]').waitFor();
 check(await desktop.locator('#commandResults [data-command-index="0"] .result-title').innerText().then(text=>text.startsWith('UA p. 28')),'UA 28 query leads directly to the UA source table');
 await desktop.locator('#commandResults [data-command-index="0"]').click();await desktop.waitForFunction(()=>location.hash==='#rules/ua-hurled-weapons-and-missiles-table');
 check(await desktop.locator('.source-rule-table tbody tr').count()===24&&await desktop.locator('.source-rule-table thead tr').nth(1).locator('th').count()===15,'the UA table renders all 24 rows and its distinct 15 columns');
 check(await desktop.locator('.table-footnote-source').count()===1&&await desktop.locator('.source-table-footnotes').textContent().then(text=>text.includes('10-foot range only, not 10 yards')),'UA Aklys footnote stays separate from the source-note and armor-key section');
 await desktop.close();

 const mobile=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.goto(`${base}/#rules`);await mobile.locator('.result-item').first().waitFor();
 await mobile.locator('#mobileSearchOpen').click();await mobile.locator('#commandInput').fill('missile weapon versus armour');
 await mobile.locator('#commandResults [data-command-index="0"]').waitFor();
 check(await mobile.locator('#commandResults [data-command-index="0"] .result-title').innerText().then(text=>text.startsWith('PHB p. 38'))&&await mobile.locator('#commandResults [data-command-index="1"] .result-title').innerText().then(text=>text.startsWith('UA p. 28')),'mobile search ranks both table documents for the armour spelling');
 await mobile.locator('#commandResults [data-command-index="1"]').click();await mobile.waitForFunction(()=>location.hash==='#rules/ua-hurled-weapons-and-missiles-table');
 check(await mobile.locator('.source-rule-table caption').innerText()===candidates[1].table.title&&await mobile.locator('.source-rule-table tbody tr').count()===24,'mobile selection opens the distinct UA table directly');
 check(await mobile.locator('.source-table-notes').isVisible()&&await mobile.locator('.table-note-source').count()===5&&await mobile.locator('.source-table-notes h3').textContent()==='Source notes and Armor Class column key','mobile keeps the source notes and armor key visible and separately cited');
 await mobile.close();
 console.log(JSON.stringify({status:'candidate DOM/search routing only; excerpt catalogs remain unregistered and no source target is certified',checks}));
}finally{await browser.close();}
