import{createRequire}from'node:module';import{readFileSync,mkdirSync,writeFileSync}from'node:fs';import assert from'node:assert/strict';
const require=createRequire(import.meta.url);const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8')),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(n,c)=>{assert.ok(c,n);checks.push(n);};const level=n=>page.locator(`[data-spell-level="${n}"]`);const cls=n=>page.locator(`[data-spell-class="${n}"]`);const count=async()=>Number((await page.locator('.result-toolbar strong').innerText()).replaceAll(',',''));const expected=(levels=[],c='')=>data.spells.filter(s=>(!levels.length||levels.includes(s.level))&&(!c||(s.classes||[s.class]).includes(c))).length;
try{
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:8765')+'/#spells');await level('all').waitFor();
 check('All initially means every indexed level',await level('all').getAttribute('aria-pressed')==='true'&&await count()===expected());
 await level(1).click();check('first individual level isolates it',await count()===expected([1])&&await level(1).getAttribute('aria-pressed')==='true'&&await level('all').getAttribute('aria-pressed')==='false');
 await level(3).click();check('second individual level adds to selection',await count()===expected([1,3])&&await level(1).getAttribute('aria-pressed')==='true'&&await level(3).getAttribute('aria-pressed')==='true');
 await level(1).click();check('individual removal retains other selections',await count()===expected([3]));
 await level(3).click();check('turning the final selection off returns to All',await count()===expected()&&await level('all').getAttribute('aria-pressed')==='true');
 await level(1).click();await level(3).click();await level('all').click();check('All clears multiple selected levels',await count()===expected()&&await page.locator('[data-spell-level][aria-pressed="true"]').count()===1);
 const levels=await page.locator('[data-spell-level]').evaluateAll(buttons=>buttons.map(b=>b.dataset.spellLevel).filter(n=>n!=='all'));
 for(const n of levels)await level(n).click();check('selecting every individual level normalizes to All',await level('all').getAttribute('aria-pressed')==='true'&&await count()===expected());
 await level(8).click();await level(9).click();await cls('Cleric').click();check('class change with no valid selected level falls back to All',await level('all').getAttribute('aria-pressed')==='true'&&await count()===expected([],'Cleric')&&await level(9).count()===0);
 await cls('').click();await level(1).click();await level(9).click();await cls('Cleric').click();check('class change preserves the valid selected intersection',await level(1).getAttribute('aria-pressed')==='true'&&await count()===expected([1],'Cleric'));
 await cls('Cleric').click();check('toggling selected class off preserves valid levels',await cls('').getAttribute('aria-pressed')==='true'&&await count()===expected([1]));
 await page.locator('#clearFilters').click();check('Reset restores class and level All',await cls('').getAttribute('aria-pressed')==='true'&&await level('all').getAttribute('aria-pressed')==='true'&&await count()===expected());
 await page.setViewportSize({width:390,height:844});await cls('Illusionist').click();await level(0).click();check('mobile shared cantrip filter works',await count()===expected([0],'Illusionist'));
 const sizes=await page.locator('.spell-toggle').evaluateAll(buttons=>buttons.map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})));check('mobile toggle touch targets are at least 44px',sizes.every(s=>s.width>=44&&s.height>=44));
 check('mobile spell toggles avoid horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await level(3).focus();await page.keyboard.press('Space');check('keyboard toggles a level and restores focus',await level(3).getAttribute('aria-pressed')==='true'&&await level(3).evaluate(e=>e===document.activeElement));
 await page.setViewportSize({width:320,height:760});check('320px toggle layout avoids page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 check('multiselect instructions are available',/one or more levels.*All clears/.test(await page.locator('#spellLevelHelp').innerText()));
 check('no browser errors',errors.length===0);mkdirSync(new URL('../test-results/',import.meta.url),{recursive:true});const report={passed:checks.length,checks,errors};writeFileSync(new URL('../test-results/spell-toggles-report.json',import.meta.url),JSON.stringify(report,null,2));await page.screenshot({path:new URL('../test-results/spell-toggles-mobile.png',import.meta.url).pathname,fullPage:true});console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
