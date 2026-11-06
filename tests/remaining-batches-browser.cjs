'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'), base=process.env.TEST_URL||'http://127.0.0.1:8767', out=path.join(root,'test-results');
const catalogs=fs.readdirSync(path.join(root,'dist/scans/dagger')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(root,'dist/scans/dagger',f))));
const checks=[],errors=[],scans=[];const check=(name,ok,detail)=>{checks.push({name,ok,detail});if(!ok)console.log('FAIL',name,JSON.stringify(detail));};
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const ctx=await browser.newContext({viewport:{width:390,height:900},hasTouch:true,reducedMotion:'reduce'});const p=await ctx.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
 const route=async id=>{await p.goto(base+'/#equipment/'+id);await p.locator('#referenceDetail .attribute-section').waitFor();await p.waitForFunction(id=>document.querySelector('#referenceDetail [data-annotation-target]')?.dataset.annotationTarget===id,id);};
 const footer=()=>p.locator('#referenceDetail .view-original-scans');
 const pageSelect=()=>p.getByRole('combobox',{name:'Select cited page',exact:true});
 check('20 actual equipment catalogs and 76 item-scoped regions',catalogs.length===20&&catalogs.reduce((n,c)=>n+c.regions.length,0)===76);
 for(const width of [320,390,491,1440]){
  await p.setViewportSize({width,height:900});let traversed=0;
  for(const cat of catalogs){await route(cat.itemId);await footer().click();
   for(const key of [...new Set(cat.regions.map(r=>r.book+':'+r.printedPage))]){
    const [book,num]=key.split(':');await pageSelect().selectOption({label:`${book} p. ${num}`});
    const regions=cat.regions.filter(r=>r.book===book&&r.printedPage===Number(num));await p.getByAltText(regions[0].alt,{exact:true}).waitFor({state:'visible'});
    check(`scoped choices ${width} ${cat.itemId} ${key}`,await p.locator('#source-viewer-region option').count()===regions.length);
    for(let i=0;i<regions.length;i++){
     if(regions.length>1)await p.locator('#source-viewer-region').selectOption(String(i));const r=regions[i];
     await p.getByAltText(r.alt,{exact:true}).waitFor({state:'visible'});
     const actual=await p.locator('.source-viewer-image-frame').evaluate(f=>{const img=f.querySelector('img'),b=img.getBoundingClientRect();return {width:img.naturalWidth,height:img.naturalHeight,rects:[...f.querySelectorAll('.source-viewer-focus-rect')].map(n=>{const x=n.getBoundingClientRect();return[(x.left-b.left)/b.width,(x.top-b.top)/b.height,x.width/b.width,x.height/b.height]})}});
     const geometry=actual.width===r.width&&actual.height===r.height&&actual.rects.length===r.focusRects.length&&actual.rects.every((a,j)=>a.every((v,k)=>Math.abs(v-r.focusRects[j][k])<.005));
     const caption=await p.locator('.source-viewer-checked-values').innerText();check(`row focus and checked values ${width} ${cat.itemId} ${r.id}`,geometry&&Object.values(r.checkedFields).every(v=>caption.includes(Array.isArray(v)?v.join(' / '):String(v))),geometry?undefined:actual);traversed++;
    }
   }
   await p.keyboard.press('Escape');check(`focus restores ${width} ${cat.itemId}`,await footer().evaluate(n=>n===document.activeElement));
  }
  check(`all 76 scoped rows at ${width}`,traversed===76);
  await route('ua-atlatl-javelin');await footer().click();await p.getByAltText(catalogs.find(c=>c.itemId==='ua-atlatl-javelin').regions[0].alt,{exact:true}).waitFor();
  check(`viewer viewport fits ${width}`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&await p.locator('.source-viewer').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
  await p.screenshot({path:path.join(out,`remaining-viewer-${width}.png`)});
  const axePath=process.env.AXE_PATH||'/tmp/adnd-qa/node_modules/axe-core/axe.min.js';if(fs.existsSync(axePath)){await p.addScriptTag({path:axePath});const a=await p.evaluate(()=>axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));const violations=a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));scans.push({width,violations});check(`axe viewer ${width}`,violations.length===0,violations);}else check('axe available',false);
  await p.keyboard.press('Escape');
 }
 await p.goto(base+'/#equipment');await p.locator('#referenceSearch').waitFor();
 for(const [query,name] of [['arrows','Arrow'],['composite longbow','Composite Long Bow'],['composite shortbow','Composite Short Bow'],['longbow','Long Bow'],['shortbow','Short Bow'],['silver arrows','Silver Arrow'],['aklys','Aklys (hurled)'],['atlatl','Atlatl (javelin)'],['blowgun needles','Blowgun Needle']]){await p.locator('#referenceSearch').fill(query);await p.waitForTimeout(160);check(`search ${query}`, (await p.locator('.result-name').allTextContents()).includes(name));}await p.locator('#referenceSearch').fill('');
 await route('phb-arrow');let t=await p.locator('#referenceDetail').innerText();check('normal arrow package prices distinguish single and dozen',/2 sp\s*\/\s*single normal arrow/.test(t)&&/1 gp per dozen/.test(t));
 await route('phb-silver-arrow');t=await p.locator('#referenceDetail').innerText();check('silver arrow price with no inherited damage or weight',/1 gp\s*\/\s*single silver arrow/.test(t)&&!/Damage vs|Approx\. weight/.test(t));
 await route('ua-atlatl-javelin');t=await p.locator('#referenceDetail').innerText();check('Atlatl specifies javelin',/Atlatl \(javelin\)/.test(t));
 await route('ua-aklys-hurled');t=await p.locator('#referenceDetail').innerText();check('Aklys asterisk explanation remains unavailable',/1\*/.test(t)&&/asterisk explanation unavailable/i.test(t));
 const live=await(await p.request.get(base+'/data.json')).json();
 for(const id of ['phb-light-crossbow','phb-heavy-crossbow','ua-hand-crossbow','phb-long-bow','phb-short-bow','phb-composite-long-bow','phb-composite-short-bow']){
  await route(id);const fields=await p.locator('#referenceDetail .attribute-fact').allTextContents();check(`canonical rate and range once ${id}`,fields.filter(x=>/Rate of fire/.test(x)).length===1&&fields.filter(x=>/Range S \/ M \/ L/.test(x)).length===1,fields);
  if(id!=='ua-hand-crossbow'){const item=live.equipment.find(x=>x.id===id),crossbow=id.includes('crossbow');check(`corroborating source retained ${id}`,item.references.some(r=>r.book===(crossbow?'PHB':'UA')&&r.pages.includes(crossbow?38:28)));}
 }
 await route('phb-light-crossbow');await p.locator('#referenceDetail [data-attribute-citations] summary').click();const ref=p.locator('#referenceDetail [data-ref-book="PHB"][data-ref-pages="39"]').first();await ref.click();await p.waitForFunction(()=>document.querySelector('.source-viewer-modes button')?.disabled);check('crossbow PHB39 opens private fallback only',await p.locator('#source-viewer-file').isVisible()&&await p.locator('.source-viewer-image-frame').isHidden()&&JSON.stringify(await pageSelect().locator('option').allTextContents())===JSON.stringify(['PHB p. 39']));await p.keyboard.press('Escape');check('crossbow PHB39 focus restores',await ref.evaluate(n=>n===document.activeElement));
 for(const [id,book,printed,pdf] of [['phb-cleric-aerial-servant','MM',6,7],['ua-cleric-animate-dead-monsters','MM2',131,132],['ua-magic-user-freshen','PHB',44,45]]){
  await p.goto(base+'/#spells/'+id);const chip=p.locator(`#referenceDetail [data-source-book="${book}"]`).first();await chip.click();const text=await p.locator('.source-viewer').innerText();const opts=await pageSelect().locator('option').allTextContents();check(`spell source ${id} ${book} exact mapping and private PDF`,JSON.stringify(opts)===JSON.stringify([`${book} p. ${printed}`])&&text.includes(`printed p. ${printed}`)&&text.includes(`PDF page ${pdf}`)&&await p.locator('#source-viewer-file').isVisible()&&await p.locator('.source-viewer-image-frame').isHidden(),{opts,text});await p.keyboard.press('Escape');check(`spell source focus restores ${id}`,await chip.evaluate(n=>n===document.activeElement));
 }
 await ctx.close();
 }finally{await browser.close();fs.writeFileSync(path.join(out,'remaining-batches-browser.json'),JSON.stringify({checks,errors,scans},null,2));console.log(JSON.stringify({checks:checks.length,passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok),errors,axeScans:scans.length}));}
 assert.equal(checks.filter(x=>!x.ok).length,0);assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1});
