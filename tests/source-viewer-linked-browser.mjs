// Black-box checks for declared linked excerpts in the public source viewer.
// The cross-page case below is an explicitly synthetic route fixture, not a
// source-level continuation claim.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
let chromium;
try { ({chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')); }
catch { ({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }

const root=path.resolve('dist');
const read=async relative=>JSON.parse(await readFile(path.join(root,relative),'utf8'));
const data=await read('data.json');
const published=await read('source-continuations.json');
const abjureRecord=data.spells.find(item=>item.id==='ua-cleric-abjure');
const abjureCatalog=await read(abjureRecord.sourceExcerpts.catalog);
const phb47Region=abjureCatalog.regions.find(region=>region.book==='PHB'&&region.printedPage===47);
const base=(process.env.TEST_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[];
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const abjureOpen='ua-37-e35d106ad24ba65c';
const abjureContinuation='ua-37-47646031f5b262d9';

function entryHash(view,id,book,page,region){
  return `#${view}/${encodeURIComponent(id)}?source=${encodeURIComponent(`${book}:${page}`)}${region?`&region=${encodeURIComponent(region)}`:''}`;
}
async function openAt(page,view,id,book,printedPage,regionId){
  await page.goto(`${base}/${entryHash(view,id,book,printedPage,regionId)}`);
  const dialog=page.locator('dialog.source-viewer[open]');
  await dialog.waitFor();
  await page.locator('.source-viewer-linked-parts').waitFor();
  return dialog;
}
async function waitSelected(dialog,regionId){
  await dialog.locator(`.source-viewer-linked-part[data-region-id="${regionId}"][data-selected="true"]`).waitFor();
  await dialog.locator('.source-viewer-status').filter({hasText:/· excerpt \d+ of/}).waitFor();
}

try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
  page.on('pageerror',error=>errors.push(error.message));
  const abjureHash=entryHash('spells','ua-cleric-abjure','UA',37,abjureContinuation);
  const dialog=await openAt(page,'spells','ua-cleric-abjure','UA',37,abjureContinuation);
  await waitSelected(dialog,abjureContinuation);
  check(new URL(page.url()).hash===abjureHash,'direct deep link preserves the selected continuation region');
  const parts=dialog.locator('.source-viewer-linked-part[data-region-id]');
  check(await parts.count()===2,'Abjure renders both declared same-page segments together');
  check(JSON.stringify(await parts.evaluateAll(nodes=>nodes.map(n=>n.dataset.regionId)))===JSON.stringify([abjureOpen,abjureContinuation]),'Abjure parts are displayed in manifest opening-to-continuation order');
  check(await parts.nth(0).getAttribute('data-selected')==='false'&&await parts.nth(1).getAttribute('data-selected')==='true','only the directly selected continuation is marked selected');
  check(await dialog.locator('.source-viewer-scan').count()===1,'the selected excerpt remains the only primary scan');
  check((await dialog.locator('.source-viewer-scan').getAttribute('src')).endsWith('ua-37-47646031f5b262d9.png'),'the primary scan belongs to the directly selected continuation');
  check(await parts.nth(0).locator('.source-viewer-linked-scan[data-region-id]').count()===1,'opening companion has its own linked image');
  check((await parts.nth(0).locator('.source-viewer-linked-warning').textContent()).includes('Precise highlighting is not reviewed or available for this excerpt'),'opening companion retains its own unresolved precision warning');
  check((await dialog.locator('.source-viewer-highlight-notice').textContent()).includes('Precise highlighting is not reviewed or available for this excerpt'),'selected continuation retains its own unresolved precision warning');
  check(await dialog.locator('.source-viewer-linked-warning').count()===1&&await dialog.locator('.source-viewer-highlight-notice').count()===1,'two separate warnings cover the two Abjure segments');
  check(await dialog.locator('.source-viewer-linked-part').evaluateAll(parts=>parts.every(part=>{
    const notice=part.querySelector('.source-viewer-highlight-notice,.source-viewer-linked-warning,.source-viewer-linked-reviewed');
    const scan=part.querySelector('img');
    return !notice||notice.hidden||!!(notice.compareDocumentPosition(scan)&Node.DOCUMENT_POSITION_FOLLOWING);
  })),'each linked-part review notice precedes its source image');
  check(await dialog.locator('.source-viewer-focus-rect, .source-viewer-linked-focus-rect').count()===0,'no full-image sentinel or focus from the other part is rendered as a highlight');

  // The listed navigation controls must step same-page excerpts and create
  // exact region links; history, copy and reload should preserve that choice.
  const prev=dialog.getByRole('button',{name:'Previous excerpt',exact:true});
  const next=dialog.getByRole('button',{name:'Next cited page',exact:true});
  check(await prev.isEnabled(),'the continuation has a previous excerpt stop');
  check(await next.isDisabled(),'the only cited page has no next cited-page stop');
  await prev.click();
  await waitSelected(dialog,abjureOpen);
  check(new URL(page.url()).hash===entryHash('spells','ua-cleric-abjure','UA',37,abjureOpen),'previous excerpt updates the exact opening-region route');
  await page.goBack();
  await waitSelected(dialog,abjureContinuation);
  check(new URL(page.url()).hash===abjureHash,'Back restores the exact continuation route and selection');
  await page.goForward();
  await waitSelected(dialog,abjureOpen);
  const previousPage=dialog.getByRole('button',{name:'Previous cited page',exact:true});
  check(await previousPage.isEnabled(),'the complete Abjure reference list retains its prior PHB47 citation');
  await previousPage.click();
  await dialog.locator('.source-viewer-page-title').filter({hasText:'printed p. 47'}).waitFor();
  check(new URL(page.url()).hash===entryHash('spells','ua-cleric-abjure','PHB',47,phb47Region.id),'Previous crosses from the UA37 opening to the complete PHB47 related-mechanics citation');
  const nextPage=dialog.getByRole('button',{name:'Next cited page',exact:true});
  check(await nextPage.isEnabled(),'PHB47 can advance to UA37 in the complete citation order');
  await nextPage.click();
  await waitSelected(dialog,abjureOpen);
  check(new URL(page.url()).hash===entryHash('spells','ua-cleric-abjure','UA',37,abjureOpen),'returning to UA37 uses its default first excerpt after the initial deep-link preference is consumed');
  const copied=dialog.getByRole('button',{name:'Copy link to this source page'});
  await copied.click();
  const copiedUrl=new URL(await page.evaluate(()=>navigator.clipboard.readText()));
  check(copiedUrl.hash===entryHash('spells','ua-cleric-abjure','UA',37,abjureOpen),'copy link includes the exact selected region');
  await page.reload();
  const reloaded=page.locator('dialog.source-viewer[open]');
  await reloaded.waitFor();
  await waitSelected(reloaded,abjureOpen);
  check(new URL(page.url()).hash===copiedUrl.hash,'reload restores the copied exact region');

  // Alt-arrow navigation must not hijack text controls or editable content.
  // The controls are temporary test nodes inside the dialog, so this exercises
  // the dialog keydown boundary without changing application state.
  const keyboardRegion=new URL(page.url()).hash;
  await page.evaluate(()=>{
    const dialog=document.querySelector('dialog.source-viewer[open]');
    const box=document.createElement('div');box.id='linked-keyboard-test-controls';
    box.innerHTML='<input id="keyboard-test-input"><select id="keyboard-test-select"><option>one</option><option>two</option></select><textarea id="keyboard-test-textarea"></textarea><div id="keyboard-test-editable" contenteditable="true">edit</div>';
    dialog.append(box);
  });
  for(const selector of ['#keyboard-test-input','#keyboard-test-select','#keyboard-test-textarea','#keyboard-test-editable']){
    const control=page.locator(selector);await control.focus();
    await page.keyboard.press('Alt+ArrowLeft');await page.keyboard.press('Alt+ArrowRight');
    check(new URL(page.url()).hash===keyboardRegion,`Alt+arrow in ${selector} does not navigate citations`);
    await waitSelected(reloaded,abjureOpen);
  }
  await page.locator('#linked-keyboard-test-controls').evaluate(node=>node.remove());

  for(const width of [1920,1440,390,320]){
    await page.setViewportSize({width,height:900});
    await page.waitForTimeout(100);
    check(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${width}px viewport does not overflow the source modal`);
    check(await dialog.locator('.source-viewer-main').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${width}px viewport does not overflow the source content column`);
    check(await parts.count()===2,`${width}px viewport retains both ordered passage parts`);
  }

  // Build an isolated, explicitly synthetic pair across PHB35 and PHB37.
  // The chosen regions are real scan records, but the relationship is not.
  const arrow=data.equipment.find(item=>item.id==='phb-arrow');
  assert.ok(arrow,'synthetic fixture owner is present in current data');
  const arrowCatalog=await read(arrow.sourceExcerpts.catalog);
  const opening=arrowCatalog.regions.find(region=>region.id==='phb-arrow-phb35-1');
  const continuation=arrowCatalog.regions.find(region=>region.id==='phb-arrow-phb37-3');
  assert.ok(opening&&continuation,'synthetic pair uses existing regions from one current catalog');
  const synthetic=structuredClone(published);
  synthetic.groups.push({
    id:'synthetic-only-cross-page-viewer-test',collection:'equipment',itemId:'phb-arrow',catalog:arrow.sourceExcerpts.catalog,
    scope:'Synthetic test pairing only. It does not assert a source continuation.',
    segments:[
      {order:1,role:'opening',book:'PHB',printedPage:opening.printedPage,pdfPage:opening.pdfPage,regionId:opening.id,image:opening.image,imageSha256:opening.sha256,sourceSha256:arrowCatalog.sources.PHB.sha256,state:'present'},
      {order:2,role:'continuation',book:'PHB',printedPage:continuation.printedPage,pdfPage:continuation.pdfPage,regionId:continuation.id,image:continuation.image,imageSha256:continuation.sha256,sourceSha256:arrowCatalog.sources.PHB.sha256,state:'present'},
    ],
  });
  const syntheticPage=await browser.newPage({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});
  syntheticPage.on('pageerror',error=>errors.push(error.message));
  await syntheticPage.route('**/source-continuations.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(synthetic)}));
  const syntheticDialog=await openAt(syntheticPage,'equipment','phb-arrow','PHB',37,continuation.id);
  await waitSelected(syntheticDialog,continuation.id);
  const syntheticParts=syntheticDialog.locator('.source-viewer-linked-part[data-region-id]');
  check(await syntheticParts.count()===2,'synthetic cross-page fixture displays two linked segments');
  check(JSON.stringify(await syntheticParts.evaluateAll(nodes=>nodes.map(n=>n.dataset.regionId)))===JSON.stringify([opening.id,continuation.id]),'synthetic cross-page fixture keeps opening before continuation');
  check(JSON.stringify(await syntheticParts.evaluateAll(nodes=>nodes.map(n=>n.dataset.selected)))===JSON.stringify(['false','true']),'synthetic continuation deep link selects its own segment');
  check(JSON.stringify(await syntheticParts.evaluateAll(nodes=>nodes.map(n=>n.dataset.printedPage)))===JSON.stringify(['35','37']),'synthetic fixture demonstrates explicit cross-page metadata without a source claim');
  check(synthetic.groups.at(-1).scope.includes('does not assert a source continuation'),'synthetic classification is explicit in the fixture');
  check(await syntheticParts.nth(0).getAttribute('data-printed-page')==='35'&&await syntheticParts.nth(1).getAttribute('data-printed-page')==='37','synthetic parts expose their distinct printed-page metadata');
  check(await syntheticDialog.locator('.source-viewer-scan').count()===1,'synthetic cross-page view still keeps one primary selected scan');
  check(await syntheticDialog.locator('.source-viewer-linked-focus-rect, .source-viewer-focus-rect').count()>=1,'each selected/companion focus remains sourced from its own region');

  // Regression for target-first ordering: the dozen-price region is at
  // natural catalog index 1, but field selection promotes it to the first
  // excerpt. Choosing the unrelated single-arrow row must retain that row by
  // ID when normal catalog ordering is restored and must clear field metadata.
  const targetPage=await browser.newPage({viewport:{width:1280,height:900}});
  targetPage.on('pageerror',error=>errors.push(error.message));
  const arrowField='/fields/Normal arrows, dozen price';
  const targetHash=`#equipment/phb-arrow?source=${encodeURIComponent('PHB:35')}&region=${encodeURIComponent('phb-arrow-phb35-2')}&field=${encodeURIComponent(arrowField)}`;
  await targetPage.goto(`${base}/${targetHash}`);
  const targetDialog=targetPage.locator('dialog.source-viewer[open]');
  await targetDialog.waitFor();
  await targetDialog.locator('.source-viewer-status').filter({hasText:/· excerpt \d+ of/}).waitFor();
  check(new URL(targetPage.url()).hash===targetHash,'initial field deep link selects the target region and field pointer');
  check((await targetDialog.locator('.source-viewer-labels').textContent()).startsWith('Field target:'),'field-target semantics are initially active');
  check(await targetDialog.locator('#source-viewer-region').inputValue()==='0','the natural-index-1 field target is promoted to first selection');
  await targetDialog.locator('#source-viewer-region').selectOption('1');
  await targetPage.waitForFunction(()=>location.hash.includes('region=phb-arrow-phb35-1')&&!location.hash.includes('&field='));
  check(new URL(targetPage.url()).hash.includes('region=phb-arrow-phb35-1'),'selecting another part keeps that captured region ID after target order clears');
  check(!new URL(targetPage.url()).hash.includes('&field=')&&!new URL(targetPage.url()).hash.includes('&target=pending')&&!new URL(targetPage.url()).hash.includes('&owner='),'unrelated excerpt drops the prior field, pending state and owner metadata');
  check(await targetDialog.locator('#source-viewer-region').inputValue()==='0','natural ordering is restored with the chosen region still selected by ID');
  check((await targetDialog.locator('.source-viewer-caption').textContent()).includes('Normal single-arrow price'),'the displayed region is the selected single-arrow row, not the stale target index');

  let renderedDeclaredGroups=0;
  for(const group of published.groups){
    if(group.segments.some(segment=>segment.state!=='present'))continue;
    const first=group.segments[0];
    const contextual=['matrices','progressionExplainer'].includes(group.collection);
    const view=contextual?'classes':group.collection;
    const id=contextual?'fighter':group.itemId;
    const owner=group.collection==='progressionExplainer'?'classes':group.collection;
    const hash=entryHash(view,id,first.book,first.printedPage,first.regionId)+(contextual?`&owner=${encodeURIComponent(`${owner}:${group.itemId}`)}`:'');
    const ownerPage=await browser.newPage({viewport:{width:1440,height:1000}});
    ownerPage.on('pageerror',error=>errors.push(error.message));
    try{
      await ownerPage.goto(`${base}/${hash}`);
      const parts=ownerPage.locator('dialog.source-viewer[open] .source-viewer-linked-part');
      await parts.nth(group.segments.length-1).waitFor();
      check(JSON.stringify(await parts.evaluateAll(nodes=>nodes.map(node=>node.dataset.regionId)))===JSON.stringify(group.segments.map(segment=>segment.regionId)),`${group.id}: every declared part renders in source order`);
      check(await parts.evaluateAll(nodes=>nodes.every(part=>{
        const notice=part.querySelector('.source-viewer-highlight-notice,.source-viewer-linked-warning,.source-viewer-linked-reviewed');
        const scan=part.querySelector('img');
        return !!scan&&scan.naturalWidth>0&&(!notice||notice.hidden||!!(notice.compareDocumentPosition(scan)&Node.DOCUMENT_POSITION_FOLLOWING));
      })),`${group.id}: every source image loads with its notice preceding the image`);
      renderedDeclaredGroups++;
    }finally{await ownerPage.close();}
  }
  check(errors.length===0,`no browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({passed:checks,renderedDeclaredGroups,declaredGroups:published.groups.length,blockedDeclaredGroups:published.groups.length-renderedDeclaredGroups,abjure:{opening:abjureOpen,continuation:abjureContinuation,scope:'actual declared same-page pair'},synthetic:{id:'synthetic-only-cross-page-viewer-test',regions:[opening.id,continuation.id],scope:synthetic.groups.at(-1).scope},viewports:[1920,1440,390,320],sourceClaims:'No cross-page source continuation is asserted by the synthetic fixture.'},null,2));
} finally {
  await browser.close();
}
