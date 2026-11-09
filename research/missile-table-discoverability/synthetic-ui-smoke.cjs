// Research-only browser smoke check. It intercepts data.json in memory and adds
// two synthetic table documents plus a synthetic owner catalog that reuses the
// existing complete PNGs. No production file or catalog is written.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..');
const dist=path.join(root,'dist');
const hash=b=>createHash('sha256').update(b).digest('hex');
const dataBytes=fs.readFileSync(path.join(dist,'data.json'));
const baseData=JSON.parse(dataBytes);
const phb=jsonImage('scans/verified/equipment-phb-short-bow.json','phb-short-bow-phb38-thrown');
const ua=jsonImage('scans/verified/equipment-phb-short-bow.json','ua-28-30f4c8bf2d0bba19');
const ids={phb:'phb-38-hurled-table-context',ua:'ua-28-hurled-table-context'};
function jsonImage(relative,id){
  const cat=JSON.parse(fs.readFileSync(path.join(dist,relative),'utf8'));
  return cat.regions.find(x=>x.id===id);
}
function syntheticRegion(source,id,title,summary){
  return {
    id,book:source.book,printedPage:source.printedPage,pdfPage:source.pdfPage,
    image:source.image,width:source.width,height:source.height,sha256:source.sha256,
    title,alt:summary,summary,checkedFields:{sourceLocation:summary},
    verification:'visually-checked-crop',verificationScope:'source-excerpt',
    focusRects:[],normalizedPageRect:source.normalizedPageRect,
  };
}
const records=[
  {
    id:'phb-hurled-weapons-and-missiles-table',title:'PHB p. 38 · Hurled Weapons and Missiles',category:'Combat',book:'PHB',pages:[38],
    aliases:['hurled weapons','hurled weapons and missiles','missile weapon versus armor','missile weapon versus armour'],
    tags:['hurled weapons','missiles','missile weapon versus armor','missile weapon versus armour','bow','short bow','leather','plate','shield','armor class adjustment','armour class adjustment','to hit'],
    summary:'Source-specific PHB missile table. Bow and armor class lookup; leather, plate, shield, range adjustment. Consult this edition’s own table.',
    bullets:['PHB p.38 only. See the distinct UA p.28 table for UA-only rows and AC 0–1 columns.'],
    sourceExcerpts:{collection:'rules',state:'source-excerpt-checked',catalog:'scans/verified/rules-phb-hurled-weapons-and-missiles-table.json',regionCount:2,scope:'Synthetic route test only; no new review is implied.',regionReviews:[]},
    sourceReferences:[{id:'phb-table-source',book:'PHB',pages:[38],printedPage:38,pdfPage:39,label:'Complete PHB p.38 missile table',verification:{regions:[ids.phb]}},{id:'ua-related-table',book:'UA',pages:[28],printedPage:28,pdfPage:29,label:'Separate UA p.28 comparison table',verification:{regions:[ids.ua]}}],
  },
  {
    id:'ua-hurled-weapons-and-missiles-table',title:'UA p. 28 · Hurled Weapon and Missile Types',category:'Combat',book:'UA',pages:[28],
    aliases:['hurled weapons','hurled weapons and missiles','missile weapon versus armor','missile weapon versus armour'],
    tags:['hurled weapons','missiles','missile weapon versus armor','missile weapon versus armour','bow','short bow','leather','plate','shield','armor class adjustment','armour class adjustment','to hit'],
    summary:'Source-specific UA missile table. Includes Aklys and UA additions, AC 0–10, the Aklys 10-foot range footnote and its own range note.',
    bullets:['UA p.28 only. This does not change the PHB p.38 table.'],
    sourceExcerpts:{collection:'rules',state:'source-excerpt-checked',catalog:'scans/verified/rules-ua-hurled-weapons-and-missiles-table.json',regionCount:2,scope:'Synthetic route test only; no new review is implied.',regionReviews:[]},
    sourceReferences:[{id:'ua-table-source',book:'UA',pages:[28],printedPage:28,pdfPage:29,label:'Complete UA p.28 missile table',verification:{regions:[ids.ua]}},{id:'phb-related-table',book:'PHB',pages:[38],printedPage:38,pdfPage:39,label:'Separate PHB p.38 comparison table',verification:{regions:[ids.phb]}}],
  },
];
const catalog={schemaVersion:1,collection:'rules',itemId:'phb-hurled-weapons-and-missiles-table',scope:'Synthetic UI smoke fixture only; source content is unreviewed.',sources:{PHB:{title:'Players Handbook',edition:'sixth printing, January 1980',sha256:'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095',hashStatus:'computed-local'},UA:{title:'Unearthed Arcana',edition:'original 1985 edition',sha256:'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4',hashStatus:'computed-local'}},regions:[
  syntheticRegion(phb,'phb-38-hurled-table-context','PHB p.38 complete missile table context','Complete PHB p.38 table crop; route smoke only.'),
  syntheticRegion(ua,'ua-28-hurled-table-context','UA p.28 complete missile table context','Complete UA p.28 table crop; route smoke only.'),
]};
// Source viewer enforces the catalog item's owner. For the UA record, provide a
// second owner-matched response with the same two source images and no foci.
function ownerCatalog(itemId){return {...catalog,itemId,regions:catalog.regions};}
const data={...baseData,rules:[...baseData.rules,...records]};
const checks=[];
const check=(name,ok,detail)=>{assert.ok(ok,`${name}${detail?`: ${detail}`:''}`);checks.push({name,passed:true,...(detail?{detail}:{})});};

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/data.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}));
  await page.route('**/scans/verified/rules-phb-hurled-weapons-and-missiles-table.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ownerCatalog('phb-hurled-weapons-and-missiles-table'))}));
  await page.route('**/scans/verified/rules-ua-hurled-weapons-and-missiles-table.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ownerCatalog('ua-hurled-weapons-and-missiles-table'))}));
  const base=process.env.TEST_URL||'http://127.0.0.1:8766/';
  const search=async(q)=>{await page.locator('#referenceSearch').fill(q);await page.waitForTimeout(200);};
  await page.goto(base+'#rules/phb-hurled-weapons-and-missiles-table');
  await page.locator('#referenceDetail').getByText('PHB p. 38 · Hurled Weapons and Missiles',{exact:true}).waitFor();
  check('desktop direct record route resolves',await page.locator('#referenceDetail .detail-card').getAttribute('data-annotation-target')==='phb-hurled-weapons-and-missiles-table');
  const desktopChips=await page.locator('#referenceDetail [data-source-id]').allTextContents();
  check('desktop exposes separate PHB and UA citation controls',desktopChips.some(x=>x.includes('PHB'))&&desktopChips.some(x=>x.includes('UA')),JSON.stringify(desktopChips));
  await page.locator('#referenceDetail [data-source-id]').filter({hasText:'UA'}).click();
  await page.locator('.source-viewer-main img').waitFor({state:'visible'});
  const openedAlt=await page.locator('.source-viewer-main img').getAttribute('alt');
  check('desktop UA chip opens exact UA table image',openedAlt==='Complete UA p.28 table crop; route smoke only.',String(openedAlt));
  await page.keyboard.press('Escape');
  await page.locator('#referenceDetail [data-source-id]').filter({hasText:'PHB'}).click();
  await page.locator('.source-viewer-main img').waitFor({state:'visible'});
  const openedPhbAlt=await page.locator('.source-viewer-main img').getAttribute('alt');
  check('desktop PHB chip opens exact PHB table image',openedPhbAlt==='Complete PHB p.38 table crop; route smoke only.',String(openedPhbAlt));
  await page.keyboard.press('Escape');
  await page.goto(base+'#rules');await page.locator('#referenceSearch').waitFor();await search('hurled weapons');
  const ruleNames=await page.locator('.result-name').allTextContents();
  check('rules ranking puts both source table docs first',ruleNames.slice(0,2).some(x=>x.includes('PHB p. 38'))&&ruleNames.slice(0,2).some(x=>x.includes('UA p. 28')));
  await page.keyboard.press('Control+k');await page.locator('#commandInput').fill('hurled weapons');await page.waitForTimeout(150);
  check('desktop global palette exposes show-all for more than 18 matching records',await page.locator('#commandShowAll').isVisible()&&/Show all 19 results/.test(await page.locator('#commandShowAll').innerText()));
  await page.locator('#commandShowAll').click();
  const desktopCommandText=await page.locator('#commandResults').innerText();
  check('desktop show-all exposes both candidate records',desktopCommandText.includes('PHB p. 38')&&desktopCommandText.includes('UA p. 28'),desktopCommandText.slice(0,1200));
  await page.keyboard.press('Escape');
  const results=[];
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:844});
    await page.goto(base+'#rules/ua-hurled-weapons-and-missiles-table');
    await page.locator('#referenceDetail .detail-card').waitFor();
    check(`direct UA route works at ${width}px`,await page.locator('#referenceDetail .detail-card').getAttribute('data-annotation-target')==='ua-hurled-weapons-and-missiles-table');
    check(`no viewport horizontal overflow at ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const allChips=await page.locator('#referenceDetail [data-source-id]').allTextContents();
    check(`both citation sources remain available at ${width}px`,allChips.some(x=>x.includes('UA'))&&allChips.some(x=>x.includes('PHB')),JSON.stringify(allChips));
    if(width===390){
      await page.locator('#referenceDetail [data-source-id]').filter({hasText:'PHB'}).click();
      await page.locator('.source-viewer-main img').waitFor({state:'visible'});
      const mobileSourceAlt=await page.locator('.source-viewer-main img').getAttribute('alt');
      check('mobile PHB citation opens its exact table image',mobileSourceAlt==='Complete PHB p.38 table crop; route smoke only.',String(mobileSourceAlt));
      await page.keyboard.press('Escape');
      await page.locator('#mobileSearchOpen').click();
      await page.locator('#commandInput').fill('hurled weapons');await page.waitForTimeout(150);
      check('mobile search launcher opens global palette',await page.locator('#palette').evaluate(e=>e.open));
      check('mobile global palette exposes show-all',await page.locator('#commandShowAll').isVisible());
      await page.locator('#commandShowAll').click();
      const mobileCommandText=await page.locator('#commandResults').innerText();
      check('mobile show-all exposes both table records',mobileCommandText.includes('PHB p. 38')&&mobileCommandText.includes('UA p. 28'),mobileCommandText.slice(0,1200));
      await page.keyboard.press('Escape');
    }
  }
  check('no uncaught browser errors',errors.length===0,errors.join('; '));
  const out={schemaVersion:1,artifactType:'synthetic-missile-table-ui-smoke',scope:'Synthetic records/catalog only; this verifies existing route/search/show-all plumbing, not production data, citation semantics, source overlays, or review status.',baselineCommit:'236818f2026f61eb0cb696ffb0ea9ff166a491ff',baselineDataSha256:hash(dataBytes),views:[1440,390],checks,errors};
  const output=path.join(__dirname,'synthetic-ui-smoke.json');fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({output,sha256:hash(fs.readFileSync(output)),checks:checks.length,failed:[],errors},null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
