import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const results=[];
const scan=async name=>{
 await page.addScriptTag({path:process.env.AXE_PATH||'/tmp/adnd-qa/node_modules/axe-core/axe.min.js'});
 const r=await page.evaluate(()=>axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
 results.push({view:name,passes:r.passes.length,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
};
try{
 for(const view of ['spells','rules','classes/cleric','notebook','sources']){
  await page.goto((process.env.TEST_URL||'http://127.0.0.1:8765')+'/#'+view);await page.locator('#main h1').waitFor();await scan(view);
 }
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:8765')+'/#spells');await page.locator('.result-item').first().waitFor();
 await page.locator('#paletteOpen').click();await scan('command palette');await page.keyboard.press('Escape');
 await page.locator('#referenceDetail [data-source-id]').click();await scan('source dialog');await page.keyboard.press('Escape');
 await page.locator('#referenceDetail [data-annotate]').first().click();await scan('annotation editor');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await scan('mobile spellbook');
 mkdirSync(new URL('../test-results/',import.meta.url),{recursive:true});
 writeFileSync(new URL('../test-results/accessibility-report.json',import.meta.url),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));assert.equal(results.reduce((n,r)=>n+r.violations.length,0),0,'Accessibility violations remain');
}finally{await browser.close();}
