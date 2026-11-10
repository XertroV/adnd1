import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url), citations=require('../dist/citations.js'), books=require('../dist/books.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url)));
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const selectionSource=app.slice(app.indexOf('function sourceTargetSelection('),app.indexOf('\nfunction originalScansButton('));
const inlineChipSource=app.slice(app.indexOf('function inlineSourceChip('),app.indexOf('\nfunction classTarget('));
const routeSource=app.slice(app.indexOf('function parseReferenceRoute('),app.indexOf('\nfunction routeSourceOwner('));
const recordResolverSource=app.slice(app.indexOf('function recordsForView('),app.indexOf('\nfunction pdfPage(',app.indexOf('function recordsForView(')));
const displayLabelStart=app.indexOf('function routeFieldTargetDisplayLabel(');
const displayLabelEnd=app.indexOf('\nfunction unresolvedFieldRouteTarget(',displayLabelStart);
assert.ok(displayLabelStart>=0&&displayLabelEnd>displayLabelStart,'Production field-target display-label helper is available');
const displayLabelSource=app.slice(displayLabelStart,displayLabelEnd);
const source=app.slice(app.indexOf('function showSource('),app.indexOf('\nfunction openNote('));
let opened;
const context=vm.createContext({data,views:['spells','rules','equipment','classes','matrices','progressionExplainer','notebook','sources'],URLSearchParams,view:'spells',selectedId:'ua-cleric-abjure',location:{hash:''},history:{pushState(_state,_title,hash){context.location.hash=hash;},replaceState(_state,_title,hash){context.location.hash=hash;}},sourceLinkHash:(...args)=>`#${args[0]}/${args[1]}?source=${args[2].book}%3A${args[2].page}${args[2].region?`&region=${args[2].region}`:''}${args[4]==='pending'?'&target=pending':''}${args[5]?.fieldPointer?`&field=${encodeURIComponent(args[5].fieldPointer)}`:''}`,renderedRouteHash:'',FirstEditionCitations:citations,bookCode:books.code,FirstEditionSourceViewer:{open:args=>{opened=args;}}});
vm.runInContext(recordResolverSource,context);
vm.runInContext(selectionSource,context);
vm.runInContext(routeSource,context);
vm.runInContext(source,context);
const groups=value=>JSON.parse(JSON.stringify(value.map(group=>[group.book,group.pages])));
const expectOpen=(collection,id,reference,book,expectedInitial)=>{
 opened=undefined;context.showSource(collection,id,reference,book);assert.ok(opened,id);
 const item=id==='progression-explainer'?{...data.progressionExplainer,id}:data[collection].find(item=>item.id===id);
 assert.equal(opened.contextItemId,id);assert.equal(opened.item.id,id);
 assert.deepEqual(groups(opened.references),groups(citations.collect(item)));
 assert.deepEqual(opened.initialReference && {...opened.initialReference},expectedInitial);
};
test('Abjure header book chips retain both complete citation groups and select the clicked book',()=>{
 for(const [book,page] of [['PHB',47],['UA',37]]){
  expectOpen('spells','ua-cleric-abjure',null,book,{book,page});
  assert.deepEqual(groups(opened.references),[['PHB',[47]],['UA',[37]]]);
 }
});
test('nested equipment, matrix, class progression and explainer chips retain their owning entry',()=>{
 for(const [collection,id,book,page] of [
  ['equipment','phb-dagger','UA',28],['matrices','dmg-original-fighter-attack-matrix','DMG',82],
  ['classes','fighter','DMG',74],['classes','progression-explainer','PHB',32],
 ]) expectOpen(collection,id,{book,pages:[page],status:'nested citation'},'',{book,page});
});
test('all-scans viewer keeps the full entry and starts on its first cited page',()=>{
 const item=data.spells.find(item=>item.id==='ua-cleric-abjure');opened=undefined;
 context.openScanViewer(item,citations.collect(item));
 assert.equal(opened.item,item);assert.equal(opened.contextItemId,item.id);assert.deepEqual({...opened.initialReference},{book:'PHB',page:47});assert.equal(opened.targetStatus,'');assert.equal(opened.activeTarget?.fieldPointer,undefined);
 assert.deepEqual(groups(opened.references),[['PHB',[47]],['UA',[37]]]);
});
test('generic book page chips do not promote a same-page resolved field target',()=>{
 context.view='equipment';context.selectedId='ua-aklys-hurled';opened=undefined;
 context.showSource('equipment','ua-aklys-hurled',null,'UA');
 assert.equal(opened.contextItemId,'ua-aklys-hurled');assert.deepEqual({...opened.initialReference},{book:'UA',page:28});
 assert.equal(opened.targetStatus,'');assert.equal(opened.activeTarget?.fieldPointer,undefined);
 assert.ok(opened.targets.some(target=>target.page===28&&target.fieldPointer==='/fields/Rate of fire (UA p.28)'&&target.targetStatus==='resolved'),'field target remains available for a field-scoped chip');
});
test('citation targets preserve verified field identity, secondary IDs and page-segment order',()=>{
 const reference={book:'UA',pages:[26,28],status:'Source checked',evidenceBindings:[
  {fieldPointer:'/price',sourceObject:'price',sourceCategory:'equipment',book:'UA',printedPage:26,pdfPage:27,catalog:'scans/verified/equipment-ua-aklys-hurled.json',regionIds:['ua-aklys-price-row','ua-equipment-price-table'],coordinateSpace:'image-relative',reviewStatus:'field-target-reviewed',contextStatus:'context-adequate'},
  {fieldPointer:'/fields/range',sourceObject:'fieldSources',sourceCategory:'equipment',book:'UA',printedPage:28,pdfPage:29,regionIds:['ua-aklys-range','ua-missile-note'],reviewStatus:'source-excerpt-only'},
 ]};
 const targets=citations.targets(reference);
 assert.deepEqual(targets.map(target=>[target.page,target.regionIds,target.targetStatus]),[[26,['ua-aklys-price-row','ua-equipment-price-table'],'resolved'],[28,['ua-aklys-range','ua-missile-note'],'pending']]);
 assert.equal(targets[0].fieldPointer,'/price');assert.equal(targets[0].contextStatus,'context-adequate');assert.equal(targets[1].reviewStatus,'source-excerpt-only');
 const spanning={book:'PHB',pages:[40,39],verification:{regions:['left-segment','right-segment']}};
 const unresolved=citations.targets(spanning);
 assert.deepEqual(unresolved.map(target=>[target.page,target.regionIds,target.unmappedRegionIds,target.targetStatus]),[[40,[],['left-segment','right-segment'],'pending'],[39,[],['left-segment','right-segment'],'pending']]);
});
test('citation targets keep field origin separate from the displayed source owner',()=>{
 const targets=citations.targets({book:'PHB',pages:[32],evidenceBindings:[{collection:'progressionExplainer',itemId:'progression-explainer',fieldPointer:'/sections/0/references/0',sourceOwner:{collection:'progressionExplainer',itemId:'progression-explainer'},book:'PHB',printedPage:32,regionIds:[],reviewStatus:'field-target-pending'}]});
 assert.deepEqual(JSON.parse(JSON.stringify(targets[0].fieldOwner)),{collection:'progressionExplainer',itemId:'progression-explainer'});
 assert.deepEqual(JSON.parse(JSON.stringify(targets[0].sourceOwner)),{collection:'progressionExplainer',itemId:'progression-explainer'});
});
test('field citation opens its own reviewed target and preserves an explicit pending target',()=>{
 const reference={book:'UA',pages:[26],status:'Price row checked',evidenceBindings:[
  {fieldPointer:'/price',sourceObject:'price',sourceCategory:'equipment',book:'UA',printedPage:26,regionIds:['ua-aklys-price-row'],reviewStatus:'field-target-reviewed',label:'Purchase price'},
  {fieldPointer:'/price',sourceObject:'price',sourceCategory:'equipment',book:'UA',printedPage:26,regionIds:['ua-equipment-price-table'],reviewStatus:'source-excerpt-only',label:'Price table context'},
 ]};
 const item={id:'ua-aklys-link-fixture',name:'Aklys (hurled)',book:'UA',pages:[28],price:reference};data.equipment.push(item);opened=undefined;
 context.view='equipment';context.selectedId=item.id;context.location.hash='';
 context.showSource('equipment',item.id,{...reference,targets:citations.targets(reference)});
 assert.equal(opened.contextItemId,item.id);assert.deepEqual({...opened.initialReference},{book:'UA',page:26,region:'ua-aklys-price-row'});assert.equal(opened.targetStatus,'resolved');
 assert.equal(opened.activeTarget.label,'Purchase price');assert.deepEqual(opened.targets.map(target=>target.regionIds[0]),['ua-aklys-price-row','ua-equipment-price-table']);
 assert.equal(context.location.hash,'#equipment/ua-aklys-link-fixture?source=UA%3A26&region=ua-aklys-price-row&field=%2Fprice');
 const pending={book:'UA',pages:[26],evidenceBindings:[{fieldPointer:'/weight',book:'UA',printedPage:26,regionIds:[],reviewStatus:'field-target-pending',label:'Weight'}]};
 context.showSource('equipment',item.id,{...pending,targets:citations.targets(pending)});
 assert.deepEqual({...opened.initialReference},{book:'UA',page:26});assert.equal(opened.targetStatus,'pending');assert.equal(opened.activeTarget.fieldPointer,'/weight');
 assert.equal(context.location.hash,'#equipment/ua-aklys-link-fixture?source=UA%3A26&target=pending&field=%2Fweight');
});
test('rendered inline chips carry the exact field target metadata',()=>{
 const reference={book:'UA',pages:[26],evidenceBindings:[{fieldPointer:'/price',book:'UA',printedPage:26,regionIds:['ua-aklys-price-row'],reviewStatus:'field-target-reviewed',label:'Purchase price'}]};
 const ctx=vm.createContext({data,pagesFor:value=>value.pages,FirstEditionCitations:citations,esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;'),bookCode:books.code});
 vm.runInContext(recordResolverSource,ctx);
 vm.runInContext(displayLabelSource,ctx);
 vm.runInContext(inlineChipSource,ctx);
 const markup=ctx.inlineSourceChip(reference,'Aklys · Purchase price'),attribute=markup.match(/data-ref-targets="([^"]*)"/)?.[1];
 assert.ok(attribute);const payload=JSON.parse(attribute.replaceAll('&quot;','"').replaceAll('&amp;','&'));
 assert.equal(payload[0].fieldPointer,'/price');assert.equal(payload[0].label,'Purchase price');assert.deepEqual(payload[0].regionIds,['ua-aklys-price-row']);
});
test('source routes preserve pending targets, exact regions and semantic field pointers',()=>{
 const target={view:'equipment',id:'ua-aklys-link-fixture',owner:{view:'equipment',id:'ua-aklys-link-fixture'},source:{book:'UA',page:26,targetStatus:'pending',fieldPointer:'/price'}};
 assert.deepEqual(JSON.parse(JSON.stringify(context.parseReferenceRoute('#equipment/ua-aklys-link-fixture?source=UA%3A26&target=pending&field=%2Fprice&owner=equipment%3Aua-aklys-link-fixture'))),target);
 assert.equal(context.sourceLinkHash('equipment','ua-aklys-link-fixture',{book:'UA',page:26},target.owner,'pending',{fieldPointer:'/price'}),'#equipment/ua-aklys-link-fixture?source=UA%3A26&target=pending&field=%2Fprice&owner=equipment%3Aua-aklys-link-fixture');
 assert.equal(context.sourceLinkHash('equipment','ua-aklys-link-fixture',{book:'UA',page:26,region:'ua-aklys-price-row'},target.owner,'resolved',{fieldPointer:'/price'}),'#equipment/ua-aklys-link-fixture?source=UA%3A26&region=ua-aklys-price-row&field=%2Fprice&owner=equipment%3Aua-aklys-link-fixture');
});
test('contextual source links serialize a routeable page owner and a distinct semantic field owner',()=>{
 const matrix={fieldPointer:'/ruleNotes/0',fieldOwner:{collection:'matrices',itemId:'dmg-original-fighter-attack-matrix'},sourceOwner:{collection:'matrices',itemId:'dmg-original-fighter-attack-matrix'}};
 assert.equal(context.sourceLinkHash('classes','fighter',{book:'DMG',page:74},{view:'matrices',id:'dmg-original-fighter-attack-matrix'},'pending',matrix),'#classes/fighter?source=DMG%3A74&target=pending&field=%2FruleNotes%2F0&fieldOwner=matrices%3Admg-original-fighter-attack-matrix&owner=matrices%3Admg-original-fighter-attack-matrix');
 const progression={fieldPointer:'/sections/0/references/0',fieldOwner:{collection:'progressionExplainer',itemId:'progression-explainer'},sourceOwner:{collection:'progressionExplainer',itemId:'progression-explainer'}};
 const hash=context.sourceLinkHash('classes','cleric',{book:'PHB',page:32},{view:'classes',id:'progression-explainer'},'pending',progression);
 assert.equal(hash,'#classes/cleric?source=PHB%3A32&target=pending&field=%2Fsections%2F0%2Freferences%2F0&fieldOwner=progressionExplainer%3Aprogression-explainer&owner=classes%3Aprogression-explainer');
 assert.deepEqual(JSON.parse(JSON.stringify(context.parseReferenceRoute(hash).source.fieldOwner)),{collection:'progressionExplainer',itemId:'progression-explainer'});
});
test('filter-driven item changes replace the stale selected-item URL',()=>{
 context.view='spells';context.selectedId='new-spell';context.location.hash='#spells/old-spell';context.renderedRouteHash='';
 context.syncSelectionRoute('old-spell');assert.equal(context.location.hash,'#spells/new-spell');assert.equal(context.renderedRouteHash,'#spells/new-spell');
});
test('viewer selects the requested cited page and falls back for absent or invalid targets',()=>{
 const script=readFileSync(new URL('../dist/source-viewer.js',import.meta.url),'utf8');
 const fn=script.slice(script.indexOf('  function open({ item, references, contextItemId, initialReference'),script.indexOf('\n  function resetZoom()',script.indexOf('  function open({ item, references, contextItemId, initialReference')));
 let selected;const sink=()=>({replaceChildren(){},append(){},focus(){}});
 const ctx=vm.createContext({privacyDismissed:false,session:0,catalogRequest:0,excerptSource:null,excerptCatalog:null,excerptLoading:false,excerptError:'',requestedMode:'',refs:[],current:0,regionIndex:0,showHighlights:false,returnFocus:null,targets:[],targetStatus:'',pendingTargetPage:null,unavailableTarget:null,requestedInitialRegion:null,
  setup(){},resolveExcerptSource(){return null},normalize:refs=>refs.flatMap(g=>g.pages.map(page=>({book:g.book,page}))),books:()=>books,resetZoom(){},
  normalizeTargets:()=>[],normalizeActiveTarget:target=>target,orderReferencesByTargets:refs=>refs,targetPageMatches:()=>false,defaultRegionIndex:()=>0,
  document:{activeElement:null,body:{classList:{add(){}}}},el:{item:{},privacyNotice:{},copyLink:{},referenceList:sink(),select:sink(),close:sink()},dialog:{open:true,setAttribute(){},removeAttribute(){}} ,
  button:()=>({}),node:()=>({}),title:book=>book,update(){selected=ctx.refs[ctx.current]},loadExcerpts(){}});
 vm.runInContext(fn,ctx);const item={id:'ua-cleric-abjure'},references=citations.collect(data.spells.find(s=>s.id===item.id));
 for(const [initialReference,expected] of [[{book:'UA',page:37},['UA',37]],[{book:'PHB',page:47},['PHB',47]],[{book:'UA',page:999},['PHB',47]],[undefined,['PHB',47]]]){
  ctx.open({item,references,initialReference});assert.deepEqual([selected.book,selected.page],expected);
 }
});
test('inline controls pass the explicit owner and clicked page to citation navigation',()=>{
 const fn=app.slice(app.indexOf('function bindInlineSources('),app.indexOf('\nfunction bindAdvancement(',app.indexOf('function bindInlineSources(')));
 const targets=[{book:'DMG',page:82,regionIds:['matrix-cell-row'],label:'Matrix cell',fieldPointer:'/comparison',reviewStatus:'field-target-reviewed',targetStatus:'resolved'}];
 let click;const el={dataset:{refTitle:'Nested source',refBook:'DMG',refPages:'82',refStatus:'OCR checked',refTargets:JSON.stringify(targets)},closest:selector=>selector==='[data-source-context]'?{dataset:{sourceView:'matrices',sourceContext:'dmg-original-fighter-attack-matrix'}}:null};
 const ctx=vm.createContext({view:'classes',selectedId:'fighter',document:{},$$:()=>[el],showSource:(...args)=>{click=args;}});
 vm.runInContext(fn,ctx);ctx.bindInlineSources();el.onclick();
 assert.equal(click[0],'matrices');assert.equal(click[1],'dmg-original-fighter-attack-matrix');
 assert.deepEqual(JSON.parse(JSON.stringify(click[2])),{name:'Nested source',book:'DMG',pages:[82],status:'OCR checked',targets});
});
test('viewer keeps selection, aria-current and previous/next controls synchronized',()=>{
 const script=readFileSync(new URL('../dist/source-viewer.js',import.meta.url),'utf8');
 const extract=(start,end)=>script.slice(script.indexOf(start),script.indexOf(end,script.indexOf(start)));
 const component=()=>({children:[],attrs:{},append(x){this.children.push(x)},replaceChildren(...x){this.children=x},querySelectorAll(){return this.children},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},focus(){}});
 const controls=new Proxy({},{get:(o,k)=>o[k]||(o[k]=component())});
 const ctx=vm.createContext({privacyDismissed:false,session:0,catalogRequest:0,excerptSource:null,excerptCatalog:null,excerptLoading:false,excerptError:'',requestedMode:'',refs:[],current:0,regionIndex:0,showHighlights:false,returnFocus:null,files:new Map(),editions:{PHB:'PHB',UA:'UA'},targets:[],targetStatus:'',pendingTargetPage:null,unavailableTarget:null,requestedInitialRegion:null,activeTarget:null,onSourceChange:null,onViewerClose:null,copySourceLink:null,
  setup(){},resolveExcerptSource(){return null},normalize:groups=>groups.flatMap(g=>g.pages.map(page=>({book:g.book,page,labels:[]}))),normalizeTargets:()=>[],orderReferencesByTargets:refs=>refs,targetPageMatches:()=>false,targetIssue:()=>null,defaultRegionIndex:()=>0,books:()=>books,resetZoom(){},matchingRegions:()=>[],viewingExcerpts:()=>false,
  document:{activeElement:null,body:{classList:{add(){}}}},el:controls,dialog:{open:true,setAttribute(){},removeAttribute(){}},button:()=>component(),node:()=>component(),title:book=>book,pageNumber:()=>null,renderPage(){},loadExcerpts(){}});
 vm.runInContext(extract('  function open({ item, references, contextItemId, initialReference','\n  function resetZoom()')+extract('  function matchingRegions(', '\n  function validateCatalog(')+extract('  function update()', '\n  async function library()'),ctx);
 const references=citations.collect(data.spells.find(s=>s.id==='ua-cleric-abjure'));
 ctx.open({item:{id:'ua-cleric-abjure'},references,initialReference:{book:'Unearthed Arcana',page:37}});
 assert.equal(controls.select.value,'1');assert.deepEqual(controls.referenceList.children.map(b=>b.attrs['aria-current']),['false','page']);assert.equal(controls.previous.disabled,false);assert.equal(controls.next.disabled,true);
 ctx.navigate(-1);assert.equal(controls.select.value,'0');assert.deepEqual(controls.referenceList.children.map(b=>b.attrs['aria-current']),['page','false']);assert.equal(controls.previous.disabled,true);assert.equal(controls.next.disabled,false);
});
