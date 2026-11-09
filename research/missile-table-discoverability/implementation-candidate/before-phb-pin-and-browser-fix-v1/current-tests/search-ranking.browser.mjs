import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.TEST_URL||'http://127.0.0.1:8765';
const checks=[];
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
const waitForDecodedSourceImages=page=>page.waitForFunction(async()=>{
 const images=[...document.querySelectorAll('dialog.source-viewer[open] img')];
 if(images.length<3)return false;
 await Promise.all(images.map(image=>image.decode().catch(()=>null)));
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 return images.length>=3&&images.every(image=>image.complete&&image.naturalWidth>0&&image.naturalHeight>0);
},null,{timeout:15000});
const citationOwnerBefore=JSON.parse(readFileSync(new URL('./fixtures/cleric-turning-citation-owner-before.json',import.meta.url),'utf8'));
const baseData=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const sourceContinuations=JSON.parse(readFileSync(new URL('../dist/source-continuations.json',import.meta.url),'utf8'));
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 desktop.on('pageerror',error=>errors.push(error.message));
 await desktop.goto(`${base}/#rules`);await desktop.locator('.result-item').first().waitFor();
 await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('turn undead');
 await desktop.locator('#commandResults [data-command-index="0"]').waitFor();
 const firstTurnTitle=await desktop.locator('#commandResults [data-command-index="0"] .result-title').innerText();
 const verifiedTableAvailable=baseData.rules.some(record=>record.id==='cleric-turning-table');
 const expectedTableTitle=baseData.rules.find(record=>record.id==='cleric-turning-table')?.title||'';
 check('turn undead ranks the verified table first when present, otherwise the available mixed-groups rule',verifiedTableAvailable?firstTurnTitle.startsWith(expectedTableTitle):firstTurnTitle.startsWith('Turning mixed groups of undead'));
 check('palette states total and displayed match count',/Showing \d+ of \d+ matching references/.test(await desktop.locator('#commandResultCount').innerText()));
 await desktop.locator('#commandResults [data-command-index="0"]').click();
 await desktop.waitForFunction(expected=>location.hash===`#rules/${expected}`,verifiedTableAvailable?'cleric-turning-table':'turning-undead');
 check('selecting the ranked result opens its exact reference route',await desktop.locator('#referenceDetail h2').innerText()===(verifiedTableAvailable?firstTurnTitle.split('\n')[0]:'Turning mixed groups of undead'));
 check('the opened rule retains its printed DMG citation',await desktop.locator('#referenceDetail .source-chip').allTextContents().then(values=>values.some(text=>text.includes('DMG')&&(text.includes(verifiedTableAvailable?'75':'65')))));

 await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('undead');
 const total=Number((await desktop.locator('#commandResultCount').innerText()).match(/of (\d+)/)?.[1]);
 check('a query with more than 18 matches exposes the total and a next-page control',total>18&&await desktop.locator('#commandMore').isVisible()&&await desktop.locator('#commandShowAll').isVisible());
 const groupCounts=(await desktop.locator('#commandResultGroups').innerText()).split(' · ').map(group=>Number(group.match(/[\d,]+/)?.[0]?.replaceAll(',','')||0));
 check('palette groups are labeled and their counts reconcile to the total',groupCounts.length>1&&groupCounts.reduce((sum,count)=>sum+count,0)===total);
 const firstPage=await desktop.locator('#commandResults [role="option"]').count();
 await desktop.locator('#commandMore').click();
 check('show-more appends results and advances keyboard selection',await desktop.locator('#commandResults [role="option"]').count()>firstPage&&await desktop.locator('#commandInput').evaluate(input=>input.getAttribute('aria-activedescendant'))===`command-${firstPage}`);
 await desktop.locator('#commandInput').fill('magic');
 const magicTotal=Number((await desktop.locator('#commandResultCount').innerText()).match(/of (\d+)/)?.[1]);
 await desktop.locator('#commandShowAll').click();
 check('show-all makes every match selectable in the palette',magicTotal>18&&await desktop.locator('#commandResults [role="option"]').count()===magicTotal&&await desktop.locator('#commandResultCount').innerText()===`Showing ${magicTotal} of ${magicTotal} matching references`&&!await desktop.locator('#commandMore').isVisible());
 await desktop.keyboard.press('Escape');

 await desktop.locator('#paletteOpen').click();await desktop.locator('#commandInput').fill('undead');
 for(let i=0;i<18;i++)await desktop.keyboard.press('ArrowDown');
 check('keyboard navigation loads the next result page without losing selection',await desktop.locator('#commandResults [role="option"]').count()>18&&await desktop.locator('#commandResults [data-command-index="18"]').getAttribute('aria-selected')==='true');
 await desktop.keyboard.press('Escape');
 check('desktop search finishes without browser errors',errors.length===0);

 const actualTable=baseData.rules.find(record=>record.id==='cleric-turning-table');
 check('the actual approved turning table is present in current source data',!!actualTable);
 await desktop.goto(`${base}/#classes/cleric`);await desktop.locator('#referenceDetail h2').waitFor();
 await desktop.locator('.class-abilities a[href="#rules/cleric-turning-table"]').click();
 await desktop.waitForFunction(()=>location.hash==='#rules/cleric-turning-table');
 await desktop.locator('.source-rule-table').waitFor();
 check('Cleric class abilities opens the actual turning-table record',await desktop.locator('#referenceDetail h2').innerText().then(text=>text.includes(expectedTableTitle))&&await desktop.locator('.source-rule-table caption').innerText()===actualTable.table.title);
 const actualFactCount=actualTable.table.rows.length+actualTable.table.symbols.length+actualTable.table.procedure.length+actualTable.table.footnotes.length+1;
 const actualTargets=await desktop.locator('.source-table-section [data-inline-source]').evaluateAll(elements=>elements.map(element=>{try{return JSON.parse(element.dataset.refTargets||'[]');}catch{return [];}}));
 check('every actual row, symbol, procedure, footnote, and progression source chip resolves instead of showing an unavailable placeholder',actualTargets.length===actualFactCount&&actualTargets.every(targets=>targets.length===1&&targets[0].book==='DMG'&&targets[0].fieldOwner?.collection==='rules'&&targets[0].fieldOwner?.itemId==='cleric-turning-table'&&targets[0].sourceOwner?.collection==='rules'&&targets[0].sourceOwner?.itemId==='cleric-turning-table'&&targets[0].fieldPointer&&targets[0].regionIds?.length===1)&&await desktop.locator('.source-focus-pending').count()===0);
 check('the three actual DMG matrix/continuation source segments remain visible',await desktop.locator('.source-table-references').innerText().then(text=>text.includes('DMG p. 75 (supplied PDF p. 76)')&&text.includes('DMG p. 76 (supplied PDF p. 77)'))&&actualTable.sourceReferences.length===3);
 const actualRowBinding=actualTable.table.rows[0].sourceReference.evidenceBindings[0];
 const actualRowGroup=sourceContinuations.groups.find(group=>group.collection==='rules'&&group.itemId==='cleric-turning-table'&&group.catalog===actualRowBinding.catalog&&group.segments.some(segment=>segment.regionId===actualRowBinding.regionIds[0]));
 check('the real row binding selects its approved three-part continuation group',!!actualRowGroup&&actualRowGroup.segments.length===3);
 await desktop.locator('.table-row-source').first().click();
 await desktop.locator('dialog.source-viewer[open]').waitFor();
 await desktop.waitForFunction(region=>location.hash.includes(`region=${region}`),actualRowBinding.regionIds[0]);
 await desktop.waitForFunction(()=>document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length===3);
 await waitForDecodedSourceImages(desktop);
 const displayedActualSegments=await desktop.locator('dialog.source-viewer[open] .source-viewer-linked-part').evaluateAll(elements=>elements.map(element=>element.dataset.regionId));
 check('the actual Skeleton fact chip opens its exact p.75 row plus both linked p.76 context parts',JSON.stringify(displayedActualSegments)===JSON.stringify(actualRowGroup.segments.map(segment=>segment.regionId))&&displayedActualSegments[0]===actualRowBinding.regionIds[0]);
 check('the actual row citation keeps a semantic table/creature caption in the source viewer',await desktop.locator('.source-viewer-labels').innerText().then(text=>text.includes('III. MATRIX FOR CLERICS AFFECTING UNDEAD, et al. · Skeleton')&&!text.includes('Row entry 1')));
 await desktop.locator('dialog.source-viewer[open] .source-viewer-close').click();
 await desktop.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
 const actualFirstContinuationFootnote=actualTable.table.footnotes.find(note=>note.sourceReference.evidenceBindings[0].printedPage===76),actualFootnoteBinding=actualFirstContinuationFootnote.sourceReference.evidenceBindings[0];
 await desktop.locator('.table-footnote-source').nth(actualTable.table.footnotes.indexOf(actualFirstContinuationFootnote)).click();
 await desktop.locator('dialog.source-viewer[open]').waitFor();
 await desktop.waitForFunction(region=>location.hash.includes(`region=${region}`),actualFootnoteBinding.regionIds[0]);
 check('an actual footnote chip routes to its own precise DMG p.76 focus',await desktop.evaluate(()=>location.hash.includes('source=DMG%3A76'))&&await desktop.evaluate(region=>location.hash.includes(`region=${region}`),actualFootnoteBinding.regionIds[0]));
 await desktop.locator('dialog.source-viewer[open] .source-viewer-close').click();
 await desktop.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
 const visitedActualFacts=new Set([actualRowBinding.fieldPointer,actualFootnoteBinding.fieldPointer]);
 const actualFactCases=[
  ...actualTable.table.rows.map((fact,index)=>({kind:'row',selector:'.table-row-source',index,fact})),
  ...actualTable.table.symbols.map((fact,index)=>({kind:'symbol',selector:'.table-symbol-source',index,fact})),
  ...actualTable.table.procedure.map((fact,index)=>({kind:'procedure',selector:'.table-procedure-source',index,fact})),
  ...actualTable.table.footnotes.map((fact,index)=>({kind:'footnote',selector:'.table-footnote-source',index,fact})),
  {kind:'progression',selector:'.table-progression-source',index:0,fact:actualTable.table.progressionNote},
 ];
 let actualFactClickCount=2,actualRowGroupClickCount=1;
 for(const entry of actualFactCases){
  const binding=entry.fact.sourceReference.evidenceBindings[0];
  if(visitedActualFacts.has(binding.fieldPointer))continue;
  const expectedSource=`${binding.book}:${binding.printedPage}`;
  await desktop.locator(entry.selector).nth(entry.index).click();
  await desktop.locator('dialog.source-viewer[open]').waitFor();
  await desktop.waitForFunction(expected=>{const params=new URLSearchParams(location.hash.split('?',2)[1]||'');return params.get('source')===expected;},expectedSource);
  const selectedRoute=await desktop.evaluate(()=>{const params=new URLSearchParams(location.hash.split('?',2)[1]||'');return {source:params.get('source'),region:params.get('region'),field:params.get('field')};});
  const selectedTarget=await entry.fact.sourceReference.evidenceBindings[0];
  const chipTargets=await desktop.locator(entry.selector).nth(entry.index).evaluate(element=>JSON.parse(element.dataset.refTargets||'[]'));
  check(`actual ${entry.kind} fact ${entry.index+1} opens its exact page/region/field`,selectedRoute.source===expectedSource&&selectedRoute.region===binding.regionIds[0]&&selectedRoute.field===binding.fieldPointer&&chipTargets.length===1&&chipTargets[0].fieldOwner?.itemId===actualTable.id&&chipTargets[0].sourceOwner?.itemId===actualTable.id&&chipTargets[0].regionIds[0]===binding.regionIds[0]&&chipTargets[0].label.length>0&&selectedTarget.fieldPointer===binding.fieldPointer);
  if(entry.kind==='row'){
   const rowGroup=sourceContinuations.groups.find(group=>group.collection==='rules'&&group.itemId===actualTable.id&&group.catalog===binding.catalog&&group.segments.some(segment=>segment.regionId===binding.regionIds[0]));
   await desktop.waitForFunction(()=>document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length===3);
   const linkedIds=await desktop.locator('dialog.source-viewer[open] .source-viewer-linked-part').evaluateAll(elements=>elements.map(element=>element.dataset.regionId));
   check(`actual row ${entry.index+1} displays its own ordered three-part group`,!!rowGroup&&JSON.stringify(linkedIds)===JSON.stringify(rowGroup.segments.map(segment=>segment.regionId))&&linkedIds[0]===binding.regionIds[0]);
   actualRowGroupClickCount++;
  }
  actualFactClickCount++;
  visitedActualFacts.add(binding.fieldPointer);
  await desktop.locator('dialog.source-viewer[open] .source-viewer-close').click();
  await desktop.waitForFunction(()=>!document.querySelector('dialog.source-viewer')?.open);
 }
 check('all 32 actual fact-level bindings were clicked and routed with no duplicate field pointer',actualFactClickCount===32&&visitedActualFacts.size===32);
 check('all 13 actual row groups were opened with complete ordered context',actualRowGroupClickCount===13);

 const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mobile=await mobileContext.newPage(),mobileErrors=[];mobile.on('pageerror',error=>mobileErrors.push(error.message));
 await mobile.addInitScript(()=>localStorage.removeItem('first-edition-search-history-v1'));
 await mobile.goto(`${base}/#spells`);await mobile.locator('.result-item').first().waitFor();
 await mobile.locator('#mobileSearchOpen').click();await mobile.locator('#commandInput').fill('fireball');
 check('mobile search puts exact spell title first',await mobile.locator('#commandResults [data-command-index="0"] .result-title').innerText().then(text=>text.startsWith('Fireball')));
 await mobile.locator('#commandInput').fill('magic');
 check('mobile palette gives full-result controls usable touch targets',await mobile.locator('#commandShowAll').evaluate(button=>button.getBoundingClientRect().height>=44));
 await mobile.locator('#commandInput').fill('fireball');
 await mobile.keyboard.press('Enter');await mobile.waitForFunction(()=>document.querySelector('#referenceDetail h2')?.textContent==='Fireball');
 check('mobile Enter opens the exact match and keeps history persistence',JSON.stringify(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('first-edition-search-history-v1'))))==='["fireball"]');
 await mobile.goto(`${base}/#classes/cleric`);await mobile.locator('.class-abilities [data-inline-source]').click();
 await mobile.waitForFunction(()=>location.hash.includes('owner=rules%3Acleric-turning-table')&&location.hash.includes('source=DMG%3A75'));
 check('mobile real class-abilities chip routes to the current rules owner',await mobile.evaluate(()=>location.hash.includes('owner=rules%3Acleric-turning-table')&&location.hash.includes('source=DMG%3A75')));
 await mobile.goBack();await mobile.waitForFunction(()=>location.hash==='#classes/cleric');
 await mobile.locator('.class-abilities a[href="#rules/cleric-turning-table"]').click();await mobile.waitForFunction(()=>location.hash==='#rules/cleric-turning-table');
 await mobile.locator('.table-row-source').first().click();await mobile.locator('dialog.source-viewer[open]').waitFor();
 await mobile.waitForFunction(region=>location.hash.includes(`region=${region}`),actualRowBinding.regionIds[0]);
 await waitForDecodedSourceImages(mobile);
 check('mobile real row chip opens the exact region with all three source images decoded',await mobile.locator('dialog.source-viewer[open] .source-viewer-linked-part').count()===3&&await mobile.locator('dialog.source-viewer[open] img').count()>=3);
 await mobile.reload();await mobile.locator('dialog.source-viewer[open]').waitFor();await waitForDecodedSourceImages(mobile);
 check('mobile reload preserves the current row focus and decodable three-part context',await mobile.evaluate(region=>location.hash.includes(`region=${region}`)&&location.hash.includes('field=%2Ftable%2Frows%2F0'),actualRowBinding.regionIds[0])&&await mobile.locator('dialog.source-viewer[open] .source-viewer-linked-part').count()===3);
 await mobile.goBack();await mobile.waitForFunction(()=>location.hash==='#rules/cleric-turning-table');
 check('mobile Back returns from the restored row viewer to the actual table',await mobile.evaluate(()=>location.hash==='#rules/cleric-turning-table'));
 await mobileContext.close();
 check('mobile and desktop search finish without browser errors',mobileErrors.length===0);

 const syntheticContext=await browser.newContext({viewport:{width:1280,height:900}}),synthetic=await syntheticContext.newPage();
 await synthetic.route('**/data.json',async route=>{
  const payload=structuredClone(baseData);
  payload.rules=payload.rules.filter(rule=>rule.id!=='cleric-turning-table');
  const factReference=(focusId,printedPage,pdfPage,regionId,fieldPointer)=>({book:'DMG',pages:[printedPage],sourceFocusId:focusId,verification:{regions:[regionId]},evidenceBindings:[{collection:'rules',itemId:'cleric-turning-table',fieldPointer,sourceObjectPointer:`${fieldPointer}/sourceReference`,sourceOwner:{collection:'rules',itemId:'cleric-turning-table'},book:'DMG',printedPage,pdfPage,sourcePages:[printedPage],regionIds:[regionId],catalog:'synthetic/rules-cleric-turning-table.json',reviewStatus:'field-target-reviewed',status:'Synthetic exact focus'}]});
  const sourceReferences=[
   {book:'DMG',printedPage:75,pdfPage:76,regionId:'synthetic-table-context',imageSha256:'synthetic-table-image',focusRects:[{id:'skeleton-row-focus'},{id:'wrong-page-focus'}]},
   {book:'DMG',printedPage:76,pdfPage:77,regionId:'synthetic-left-context',imageSha256:'synthetic-left-image',focusRects:[{id:'roll-procedure-focus'},{id:'asterisk-footnote-focus'}]},
   {book:'DMG',printedPage:76,pdfPage:77,regionId:'synthetic-right-context',imageSha256:'synthetic-right-image',focusRects:[{id:'turn-symbol-focus'},{id:'progression-focus'},{id:'unbound-symbol-focus'},{id:'wrong-owner-focus'},{id:'wrong-region-focus'},{id:'missing-source-pages-focus'}]},
   {book:'PHB',printedPage:36,pdfPage:37,regionId:'synthetic-armor-context',imageSha256:'synthetic-armor-image',focusRects:[{id:'armor-column-key-focus'},{id:'wrong-armor-note-focus'}]},
  ];
  const validRow=factReference('skeleton-row-focus',75,76,'dmg-75-skeleton-clone','/table/rows/0');
  const invalidOwner=factReference('wrong-owner-focus',76,77,'dmg-76-wrong-owner','/table/symbols/1');invalidOwner.evidenceBindings[0].collection='classes';invalidOwner.evidenceBindings[0].itemId='cleric';invalidOwner.evidenceBindings[0].sourceOwner={collection:'classes',itemId:'cleric'};
  const invalidPage=factReference('wrong-page-focus',75,76,'dmg-75-wrong-page','/table/symbols/2');invalidPage.evidenceBindings[0].printedPage=76;invalidPage.evidenceBindings[0].pdfPage=77;invalidPage.evidenceBindings[0].sourcePages=[76];
  const invalidRegion=factReference('wrong-region-focus',76,77,'dmg-76-wrong-region','/table/symbols/3');invalidRegion.verification.regions=['dmg-76-other-region'];
  const invalidSourcePages=factReference('missing-source-pages-focus',76,77,'dmg-76-missing-source-pages','/table/symbols/4');delete invalidSourcePages.evidenceBindings[0].sourcePages;
  const armorNote=factReference('armor-column-key-focus',36,37,'phb-36-leather-clone','/table/sourceNotes/0');armorNote.book='PHB';armorNote.evidenceBindings[0].book='PHB';armorNote.evidenceBindings[0].sourcePages=[36];
  const invalidArmorNote=factReference('wrong-armor-note-focus',36,37,'phb-36-wrong-owner','/table/sourceNotes/1');invalidArmorNote.book='PHB';invalidArmorNote.evidenceBindings[0].book='PHB';invalidArmorNote.evidenceBindings[0].sourcePages=[36];invalidArmorNote.evidenceBindings[0].sourceOwner={collection:'classes',itemId:'cleric'};
  payload.rules.push({id:'cleric-turning-table',title:'Synthetic test matrix',category:'Class abilities',book:'DMG',pages:[75,76],aliases:['turn undead','cleric table'],sourceReferences,table:{title:'Synthetic test matrix',rowHeader:{label:'Creature'},columnGroup:{label:'Level'},columns:[{id:'level-1',label:'1'},{id:'level-2',label:'2'}],rows:[{id:'test-row',label:'Skeleton',markers:['*'],sourceReference:validRow,cells:[{columnId:'level-1',raw:'T',kind:'symbol'},{columnId:'level-2',raw:'--',kind:'no-effect'}]}],symbols:[{symbol:'T',text:'synthetic symbol definition',sourceReference:factReference('turn-symbol-focus',76,77,'dmg-76-symbol-clone','/table/symbols/0')},{symbol:'D',text:'deliberately unbound synthetic symbol',sourceReference:{book:'DMG',pages:[76],sourceFocusId:'unbound-symbol-focus',evidenceBindings:[]}},{symbol:'BAD-OWNER',text:'wrong owner',sourceReference:invalidOwner},{symbol:'BAD-PAGE',text:'wrong page',sourceReference:invalidPage},{symbol:'BAD-REGION',text:'wrong region',sourceReference:invalidRegion},{symbol:'BAD-PAGES',text:'missing sourcePages',sourceReference:invalidSourcePages}],procedure:[{step:'roll',text:'synthetic procedure',sourceReference:factReference('roll-procedure-focus',76,77,'dmg-76-procedure-clone','/table/procedure/0')}],footnotes:[{marker:'*',text:'synthetic footnote',appliesTo:'synthetic row',sourceReference:factReference('asterisk-footnote-focus',76,77,'dmg-76-footnote-clone','/table/footnotes/0')}],sourceNotesTitle:'Armor Class column key',sourceNotes:[{label:'Leather or padded armor',text:'AC 8',sourceReference:armorNote},{label:'Wrong owner control',text:'Must remain pending',sourceReference:invalidArmorNote}],progressionNote:{text:'synthetic continuation',sourceFocusId:'progression-focus',sourceReference:factReference('progression-focus',76,77,'dmg-76-progression-clone','/table/progressionNote')}}});
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
 });
 await synthetic.goto(`${base}/#classes/cleric`);await synthetic.locator('#referenceDetail h2').waitFor();
 check('Cleric page surfaces a verified class-abilities record when present',await synthetic.locator('.class-abilities').getByRole('link',{name:'Synthetic test matrix'}).isVisible());
 check('the pre-change class-chip wrong-owner route is preserved as a regression fixture',citationOwnerBefore.capturedAgainst.appSha256==='55966941fa9876fc7d7ff4534efd7af4d440cb6c386dbd20b89ec313e21bd262'&&citationOwnerBefore.scenario.observedContextOwner==='classes:cleric'&&citationOwnerBefore.scenario.expectedSourceOwner==='rules:cleric-turning-table');
 await synthetic.locator('.class-abilities [data-inline-source]').first().click();
 await synthetic.waitForFunction(()=>location.hash.includes('owner=rules%3Acleric-turning-table')&&location.hash.includes('source=DMG%3A75'));
 check('class-abilities citation opens the table owner at the exact source page instead of inheriting the Cleric guide',await synthetic.evaluate(()=>location.hash.includes('owner=rules%3Acleric-turning-table')&&location.hash.includes('source=DMG%3A75')&&location.hash.includes('region=dmg-75-skeleton-clone')));
 await synthetic.goBack();await synthetic.waitForFunction(()=>location.hash==='#classes/cleric');
 await synthetic.locator('.class-abilities a').click();await synthetic.waitForFunction(()=>location.hash==='#rules/cleric-turning-table');
 await synthetic.locator('.source-rule-table').waitFor();
 check('Cleric class-abilities link opens the table record',await synthetic.locator('#referenceDetail').innerText().then(text=>/class abilities/i.test(text)&&text.includes('Synthetic test matrix')));
 check('table renderer preserves cells, literal markers, and printed continuation text',await synthetic.locator('.source-rule-table tbody').innerText().then(text=>text.includes('T')&&text.includes('--'))&&await synthetic.locator('.source-row-marker').innerText()==='*'&&await synthetic.locator('.source-table-symbols').innerText().then(text=>text.includes('synthetic symbol definition'))&&await synthetic.locator('.source-table-procedure').innerText().then(text=>text.includes('synthetic procedure'))&&await synthetic.locator('.source-table-footnotes').innerText().then(text=>text.includes('synthetic footnote'))&&await synthetic.locator('.source-table-notes').innerText().then(text=>text.includes('Armor Class column key')&&text.includes('Leather or padded armor')&&text.includes('AC 8'))&&await synthetic.locator('.source-table-progression').innerText().then(text=>text.includes('synthetic continuation'))&&await synthetic.locator('.source-table-references').innerText().then(text=>text.includes('DMG p. 76 (supplied PDF p. 77)')));
 check('rendered table text omits private image hashes and catalog paths',await synthetic.locator('#referenceDetail').innerText().then(text=>!text.includes('synthetic-table-image')&&!text.includes('synthetic/rules-cleric-turning-table.json')));
 const factSelectors=['.table-row-source','.table-symbol-source','.table-procedure-source','.table-footnote-source','.table-note-source','.table-progression-source'];
 const factTargets=[];
 for(const selector of factSelectors){
  const chip=synthetic.locator(selector);check(`${selector} exposes one accessible exact source-chip`,await chip.count()===1&&await chip.getAttribute('aria-label').then(value=>value?.startsWith('Open source for ')));
  factTargets.push(await chip.evaluate(element=>JSON.parse(element.dataset.refTargets||'[]')));
 }
 check('row, symbol, procedure, footnote, source note, and progression chips carry only their exact owner, page, field, and clone region',factTargets.every((targets,index)=>targets.length===1&&targets[0].fieldOwner?.collection==='rules'&&targets[0].fieldOwner?.itemId==='cleric-turning-table'&&targets[0].regionIds?.length===1&&targets[0].regionIds[0]===['dmg-75-skeleton-clone','dmg-76-symbol-clone','dmg-76-procedure-clone','dmg-76-footnote-clone','phb-36-leather-clone','dmg-76-progression-clone'][index])&&factTargets[4][0].book==='PHB'&&factTargets[4][0].page===36&&factTargets[4][0].fieldPointer==='/table/sourceNotes/0');
 check('unbound, wrong-owner, wrong-page, wrong-region, missing-sourcePages, and wrong-owner source notes fail closed without a broad-page fallback',await synthetic.locator('.source-focus-pending').count()===6&&await synthetic.locator('.source-table-symbols .source-focus-pending').count()===5&&await synthetic.locator('.source-table-notes .source-focus-pending').count()===1&&await synthetic.locator('.source-table-symbols .table-symbol-source').count()===1&&await synthetic.locator('.source-table-notes .table-note-source').count()===1);
 await synthetic.locator('.table-row-source').click();
 await synthetic.waitForFunction(()=>location.hash.includes('region=dmg-75-skeleton-clone')&&location.hash.includes('field=%2Ftable%2Frows%2F0'));
 check('a row chip selects its exact catalog clone and field pointer in the route',await synthetic.evaluate(()=>location.hash.includes('region=dmg-75-skeleton-clone')&&location.hash.includes('field=%2Ftable%2Frows%2F0')));
 await synthetic.goBack();await synthetic.waitForFunction(()=>location.hash==='#rules/cleric-turning-table');
 await synthetic.locator('.table-note-source').click();
 await synthetic.waitForFunction(()=>location.hash.includes('source=PHB%3A36')&&location.hash.includes('region=phb-36-leather-clone')&&location.hash.includes('field=%2Ftable%2FsourceNotes%2F0'));
 check('the PHB36 source note opens its exact owner, row region, and field pointer',await synthetic.evaluate(()=>location.hash.includes('source=PHB%3A36')&&location.hash.includes('region=phb-36-leather-clone')&&location.hash.includes('field=%2Ftable%2FsourceNotes%2F0')));
 await synthetic.reload();
 check('reload preserves the same row region and field selection',await synthetic.evaluate(()=>location.hash.includes('region=dmg-75-skeleton-clone')&&location.hash.includes('field=%2Ftable%2Frows%2F0')));
 await synthetic.goBack();
 check('Back returns to the uncited table route without changing the owner',await synthetic.evaluate(()=>location.hash==='#rules/cleric-turning-table'));
 await synthetic.setViewportSize({width:390,height:844});
 await synthetic.goto(`${base}/#classes/cleric`);
 await synthetic.locator('.class-abilities [data-inline-source]').click();
 await synthetic.waitForFunction(()=>location.hash.includes('owner=rules%3Acleric-turning-table'));
 check('mobile class-abilities citation also routes to the table owner',await synthetic.evaluate(()=>location.hash.includes('owner=rules%3Acleric-turning-table')));
 await synthetic.goBack();
 check('mobile Back restores the Cleric page after opening the table citation',await synthetic.evaluate(()=>location.hash==='#classes/cleric'));
 await synthetic.locator('.class-abilities a').click();await synthetic.waitForFunction(()=>location.hash==='#rules/cleric-turning-table');
 await synthetic.locator('.table-row-source').click();
 await synthetic.waitForFunction(()=>location.hash.includes('region=dmg-75-skeleton-clone')&&location.hash.includes('field=%2Ftable%2Frows%2F0'));
 check('mobile row citation keeps the exact source clone and field in history',await synthetic.evaluate(()=>location.hash.includes('region=dmg-75-skeleton-clone')&&location.hash.includes('field=%2Ftable%2Frows%2F0')));
 await synthetic.reload();await synthetic.locator('dialog.source-viewer[open]').waitFor();
 check('mobile reload restores the synthetic row region and field route',await synthetic.evaluate(()=>location.hash.includes('region=dmg-75-skeleton-clone')&&location.hash.includes('field=%2Ftable%2Frows%2F0')));
 await synthetic.goBack();
 check('mobile Back restores the table record from its exact row citation',await synthetic.evaluate(()=>location.hash==='#rules/cleric-turning-table'));
 await syntheticContext.close();
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();}
