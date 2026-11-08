import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.TEST_URL||'http://127.0.0.1:8765/dist/index.html';
const checks=[];
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
try{
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mobile=await mobileContext.newPage(),mobileErrors=[];
 mobile.on('pageerror',error=>mobileErrors.push(error.message));
 await mobile.addInitScript(()=>localStorage.removeItem('first-edition-search-history-v1'));
 await mobile.goto(base);await mobile.locator('.result-item').first().waitFor();
 const mobileButton=mobile.locator('#mobileSearchOpen');
 check('mobile search button is a persistent 44px top-right control',await mobileButton.isVisible()&&await mobileButton.evaluate(button=>{const r=button.getBoundingClientRect();return getComputedStyle(button).position==='fixed'&&r.width>=44&&r.height>=44&&r.top>=0&&r.right<=innerWidth&&innerWidth-r.right<=20;}));
 check('mobile search button does not cover the brand name',await mobile.evaluate(()=>{const b=document.querySelector('#mobileSearchOpen').getBoundingClientRect(),t=document.querySelector('.brand strong').getBoundingClientRect();return b.right<=t.left||b.left>=t.right||b.bottom<=t.top||b.top>=t.bottom;}));
 for(const view of ['rules','equipment','classes','notebook','sources','spells']){
  await mobile.goto(`${base}#${view}`);await mobile.locator('#main h1').waitFor();
  check(`mobile search button is available on ${view}`,await mobileButton.isVisible());
 }
 await mobile.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 check('mobile search stays fixed after long-page scrolling',await mobileButton.evaluate(button=>{const r=button.getBoundingClientRect();return r.top>=0&&r.top<100&&r.right<=innerWidth&&r.width>=44&&r.height>=44;}));
 await mobileButton.click();await mobile.locator('#commandInput').fill('Cure');
 await mobile.locator('#commandResults .result-title').filter({hasText:/^Cure Light Wounds/}).first().waitFor();
 await mobile.locator('#commandResults .result-title').filter({hasText:/^Cure Serious Wounds/}).first().waitFor();
 await mobile.locator('#commandResults [data-command-index]').filter({hasText:'Cure Light Wounds'}).first().click();
 await mobile.waitForFunction(()=>document.querySelector('#referenceDetail h2')?.textContent==='Cure Light Wounds');
 check('the first search can open a wrong spell from an ambiguous query',await mobile.locator('#referenceDetail h2').innerText()==='Cure Light Wounds');
 await mobileButton.click();
 const recent=mobile.getByRole('button',{name:'Search again for Cure'});
 await recent.waitFor();await recent.click();
 check('history reselect restores the prior query and its alternatives',await mobile.locator('#commandInput').inputValue()==='Cure'&&await mobile.locator('#commandResults .result-title').filter({hasText:/^Cure Serious Wounds/}).count()>0);
 await mobile.locator('#commandResults [data-command-index]').filter({hasText:'Cure Serious Wounds'}).first().click();
 await mobile.waitForFunction(()=>document.querySelector('#referenceDetail h2')?.textContent==='Cure Serious Wounds');
 check('history results select the intended spell',await mobile.locator('#referenceDetail h2').innerText()==='Cure Serious Wounds');
 check('search history deduplicates and persists in MRU order',JSON.stringify(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('first-edition-search-history-v1'))))==='["Cure"]');
 await mobileButton.click();await mobile.keyboard.press('Escape');
 check('Escape closes the native palette and restores focus to its opener',!(await mobile.locator('#palette').evaluate(dialog=>dialog.open))&&await mobile.evaluate(()=>document.activeElement?.id)==='mobileSearchOpen');
 check('mobile route and interaction produce no browser errors',mobileErrors.length===0);
 await mobileContext.close();

 const desktopContext=await browser.newContext({viewport:{width:1440,height:1000}}),desktop=await desktopContext.newPage(),desktopErrors=[];
 desktop.on('pageerror',error=>desktopErrors.push(error.message));
 await desktop.goto(base);await desktop.locator('.result-item').first().waitFor();
 check('desktop keeps its existing global search control',await desktop.locator('#paletteOpen').isVisible()&&!(await desktop.locator('#mobileSearchOpen').isVisible()));
 await desktop.keyboard.press('Control+k');await desktop.locator('#commandInput').fill('Magic Missile');
 await desktop.keyboard.press('Enter');await desktop.waitForFunction(()=>document.querySelector('#referenceDetail h2')?.textContent==='Magic Missile');
 check('desktop keyboard palette still routes an exact spell',!(await desktop.locator('#palette').evaluate(dialog=>dialog.open)));
 await desktop.locator('#paletteOpen').click();await desktop.keyboard.press('Escape');
 check('desktop Escape retains its existing focus return',await desktop.evaluate(()=>document.activeElement?.id)==='paletteOpen');
 check('desktop search interaction produces no browser errors',desktopErrors.length===0);
 await desktopContext.close();

 const blockedContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),blocked=await blockedContext.newPage(),blockedErrors=[];
 blocked.on('pageerror',error=>blockedErrors.push(error.message));
 await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage blocked','SecurityError');}}));
 await blocked.goto(base);await blocked.locator('.result-item').first().waitFor();
 await blocked.locator('#mobileSearchOpen').click();await blocked.locator('#commandInput').fill('Magic Missile');
 await blocked.locator('#commandResults .result-title').filter({hasText:/^Magic Missile/}).first().click();
 await blocked.waitForFunction(()=>document.querySelector('#referenceDetail h2')?.textContent==='Magic Missile');
 await blocked.locator('#mobileSearchOpen').click();
 check('search remains usable with localStorage blocked',await blocked.getByRole('button',{name:'Search again for Magic Missile'}).isVisible()&&blockedErrors.length===0);
 await blockedContext.close();
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();}
