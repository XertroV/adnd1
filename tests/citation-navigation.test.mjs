import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url), citations=require('../dist/citations.js'), books=require('../dist/books.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url)));
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('function showSource('),app.indexOf('\nfunction openNote('));
let opened;
const context=vm.createContext({data,FirstEditionCitations:citations,bookCode:books.code,FirstEditionSourceViewer:{open:args=>{opened=args;}}});
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
test('all-scans viewer receives the full entry and no initial page filter',()=>{
 const item=data.spells.find(item=>item.id==='ua-cleric-abjure');opened=undefined;
 context.openScanViewer(item,citations.collect(item));
 assert.equal(opened.item,item);assert.equal(opened.contextItemId,item.id);assert.equal(opened.initialReference,undefined);
 assert.deepEqual(groups(opened.references),[['PHB',[47]],['UA',[37]]]);
});
test('viewer selects the requested cited page and falls back for absent or invalid targets',()=>{
 const script=readFileSync(new URL('../dist/source-viewer.js',import.meta.url),'utf8');
 const fn=script.slice(script.indexOf('  function open({ item, references, contextItemId, initialReference'),script.indexOf('\n  function resetZoom()',script.indexOf('  function open({ item, references, contextItemId, initialReference')));
 let selected;const sink=()=>({replaceChildren(){},append(){},focus(){}});
 const ctx=vm.createContext({privacyDismissed:false,session:0,catalogRequest:0,excerptSource:null,excerptCatalog:null,excerptLoading:false,excerptError:'',requestedMode:'',refs:[],current:0,regionIndex:0,showHighlights:false,returnFocus:null,
  setup(){},resolveExcerptSource(){return null},normalize:refs=>refs.flatMap(g=>g.pages.map(page=>({book:g.book,page}))),books:()=>books,resetZoom(){},
  document:{activeElement:null,body:{classList:{add(){}}}},el:{item:{},privacyNotice:{},referenceList:sink(),select:sink(),close:sink()},dialog:{open:true,setAttribute(){},removeAttribute(){}} ,
  button:()=>({}),node:()=>({}),title:book=>book,update(){selected=ctx.refs[ctx.current]},loadExcerpts(){}});
 vm.runInContext(fn,ctx);const item={id:'ua-cleric-abjure'},references=citations.collect(data.spells.find(s=>s.id===item.id));
 for(const [initialReference,expected] of [[{book:'UA',page:37},['UA',37]],[{book:'PHB',page:47},['PHB',47]],[{book:'UA',page:999},['PHB',47]],[undefined,['PHB',47]]]){
  ctx.open({item,references,initialReference});assert.deepEqual([selected.book,selected.page],expected);
 }
});
test('inline controls pass the explicit owner and clicked page to citation navigation',()=>{
 const fn=app.slice(app.indexOf('function bindInlineSources('),app.indexOf('\nfunction bindAdvancement(',app.indexOf('function bindInlineSources(')));
 let click;const el={dataset:{refTitle:'Nested source',refBook:'DMG',refPages:'82',refStatus:'OCR checked'},closest:selector=>selector==='[data-source-context]'?{dataset:{sourceView:'matrices',sourceContext:'dmg-original-fighter-attack-matrix'}}:null};
 const ctx=vm.createContext({view:'classes',selectedId:'fighter',document:{},$$:()=>[el],showSource:(...args)=>{click=args;}});
 vm.runInContext(fn,ctx);ctx.bindInlineSources();el.onclick();
 assert.equal(click[0],'matrices');assert.equal(click[1],'dmg-original-fighter-attack-matrix');
 assert.deepEqual(JSON.parse(JSON.stringify(click[2])),{name:'Nested source',book:'DMG',pages:[82],status:'OCR checked'});
});
test('viewer keeps selection, aria-current and previous/next controls synchronized',()=>{
 const script=readFileSync(new URL('../dist/source-viewer.js',import.meta.url),'utf8');
 const extract=(start,end)=>script.slice(script.indexOf(start),script.indexOf(end,script.indexOf(start)));
 const component=()=>({children:[],attrs:{},append(x){this.children.push(x)},replaceChildren(...x){this.children=x},querySelectorAll(){return this.children},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},focus(){}});
 const controls=new Proxy({},{get:(o,k)=>o[k]||(o[k]=component())});
 const ctx=vm.createContext({privacyDismissed:false,session:0,catalogRequest:0,excerptSource:null,excerptCatalog:null,excerptLoading:false,excerptError:'',requestedMode:'',refs:[],current:0,regionIndex:0,showHighlights:false,returnFocus:null,files:new Map(),editions:{PHB:'PHB',UA:'UA'},
  setup(){},resolveExcerptSource(){return null},normalize:groups=>groups.flatMap(g=>g.pages.map(page=>({book:g.book,page,labels:[]}))),books:()=>books,resetZoom(){},matchingRegions:()=>[],viewingExcerpts:()=>false,
  document:{activeElement:null,body:{classList:{add(){}}}},el:controls,dialog:{open:true,setAttribute(){},removeAttribute(){}},button:()=>component(),node:()=>component(),title:book=>book,pageNumber:()=>null,renderPage(){},loadExcerpts(){}});
 vm.runInContext(extract('  function open({ item, references, contextItemId, initialReference','\n  function resetZoom()')+extract('  function navigate(delta)', '\n  function matchingRegions()')+extract('  function update()', '\n  async function library()'),ctx);
 const references=citations.collect(data.spells.find(s=>s.id==='ua-cleric-abjure'));
 ctx.open({item:{id:'ua-cleric-abjure'},references,initialReference:{book:'Unearthed Arcana',page:37}});
 assert.equal(controls.select.value,'1');assert.deepEqual(controls.referenceList.children.map(b=>b.attrs['aria-current']),['false','page']);assert.equal(controls.previous.disabled,false);assert.equal(controls.next.disabled,true);
 ctx.navigate(-1);assert.equal(controls.select.value,'0');assert.deepEqual(controls.referenceList.children.map(b=>b.attrs['aria-current']),['page','false']);assert.equal(controls.previous.disabled,true);assert.equal(controls.next.disabled,false);
});
