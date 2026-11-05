import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
try{
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:8765')+'/#spells');await page.locator('.result-item').first().waitFor();
 const examples=[['CLW','Cure Light Wounds'],['C.L.W.','Cure Light Wounds'],['c l w','Cure Light Wounds'],['MM','Magic Missile'],['DM','Dispel Magic'],['PFE','Protection from Evil'],['CSW','Cure Serious Wounds'],['CCW','Cure Critical Wounds'],['FB','Fireball'],['prot evil','Protection from Evil']];
 for(const [query,title]of examples){
  await page.locator('#referenceSearch').fill(query);await page.waitForTimeout(160);
  assert.ok((await page.locator('.result-name').allTextContents()).includes(title),`spell search ${query}`);checks.push(`spell search: ${query}`);
  await page.locator('#paletteOpen').click();await page.locator('#commandInput').fill(query);
  assert.ok((await page.locator('#commandResults .result-title').allTextContents()).some(t=>t.startsWith(title)),`command palette ${query}`);checks.push(`command palette: ${query}`);await page.keyboard.press('Escape');await page.locator('#palette').waitFor({state:'hidden'});
 }
 await page.locator('#referenceSearch').fill('CLW');await page.waitForTimeout(160);await page.locator('#classFilter').selectOption('Druid');
 assert.equal(await page.locator('.result-item').count(),1);assert.equal(await page.locator('.result-name').innerText(),'Cure Light Wounds');checks.push('Druid class filter with CLW');
 await page.locator('#clearFilters').click();await page.locator('#referenceSearch').fill('CLW cleric');await page.waitForTimeout(160);
 assert.equal(await page.locator('.result-item').count(),1);assert.match(await page.locator('.result-meta').innerText(),/Cleric/);checks.push('CLW with inline class term');
 await page.keyboard.press('Control+k');await page.locator('#commandInput').fill('CLW');await page.keyboard.press('Enter');
 assert.equal(await page.locator('#referenceDetail h2').innerText(),'Cure Light Wounds');checks.push('keyboard opens actual CLW card');
 assert.deepEqual(errors,[]);checks.push('no browser errors');
 mkdirSync(new URL('../test-results/',import.meta.url),{recursive:true});const report={passed:checks.length,checks,errors};writeFileSync(new URL('../test-results/search-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
