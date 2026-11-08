import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
const viewer=readFileSync(new URL('../dist/source-viewer.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const before=JSON.parse(gunzipSync(readFileSync(new URL('../research/source-audit-batch5-rapid-history-before.json.gz',import.meta.url))));
function harness(viewerSource=viewer,appSource=app){
 const queue=[],timers=[],doc={activeElement:null,createTextNode:text=>({textContent:text}),body:{append(){},classList:{add(){},remove(){}}}};
 class Element{
  constructor(tag,attrs={},text=''){Object.assign(this,{tag,attrs:{...attrs},textContent:text,children:[],listeners:{},hidden:false,disabled:false});}
  append(...xs){this.children.push(...xs)} replaceChildren(...xs){this.children=xs} setAttribute(k,v){this.attrs[k]=v} removeAttribute(k){delete this.attrs[k]}
  addEventListener(t,fn){this.listeners[t]=fn} focus(){doc.activeElement=this} showModal(){this.open=true} close(){this.open=false;queue.push(()=>this.listeners.close?.())} click(){this.listeners.click?.()}
 }
 const item={id:'entry',name:'Entry'},references=[{book:'UA',pages:[26]}];let ctx;
 ctx=vm.createContext({document:doc,root:{addEventListener(){}},dialog:undefined,el:{},session:0,catalogRequest:0,renderVersion:0,renderTask:null,returnFocus:null,privacyDismissed:false,refs:[],current:0,regionIndex:0,showHighlights:true,excerptSource:null,excerptCatalog:null,excerptError:'',excerptLoading:false,requestedMode:'',
  node:(tag,attrs,text)=>new Element(tag,attrs,text),button:(label,action,attrs)=>{const e=new Element('button',attrs,label);e.addEventListener('click',action);return e},
  resolveExcerptSource:()=>null,normalize:()=>[],books:()=>({code:x=>x}),resetZoom(){},title:x=>x,loadExcerpts(){},update(){ctx.el.modes.hidden=true},setMode(){},navigate(){},forget(){},changeZoom(){},renderPage(){},loadFile(){},
  view:'equipment',selectedId:'entry',data:{equipment:[item]},location:{hash:'#equipment/entry'},renderedRouteHash:'',bookCode:x=>x,
  FirstEditionCitations:{targets:()=>[]},sourceTargetSelection:()=>({initialReference:{book:'UA',page:26,region:'row'},targets:[],targetStatus:'resolved'}),
  sourceLinkHash:(view,id,ref)=>`#${view}/${id}?source=${ref.book}%3A${ref.page}${ref.region?`&region=${ref.region}`:''}`,
  parseReferenceRoute:()=>({view:'equipment',id:'entry',source:ctx.location.hash.includes('?source=')?{book:'UA',page:26}:null}),
  history:{pushState(_s,_t,hash){ctx.location.hash=hash},replaceState(_s,_t,hash){ctx.location.hash=hash}},setTimeout:fn=>timers.push(fn),
 });
 const part=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
 vm.runInContext(part(viewerSource,'  function setup()','\n  function resetZoom()'),ctx);
 vm.runInContext(part(viewerSource,'  function close(','  root.FirstEditionSourceViewer ='),ctx);
 ctx.FirstEditionSourceViewer={open:ctx.open,close:ctx.close};
 vm.runInContext(part(appSource,'function openScanViewer(','\nfunction openNote('),ctx);
 const open=()=>ctx.openScanViewer(item,references,'entry',{book:'UA',page:26,region:'row'});
 return {ctx,queue,open,item,references,flush:()=>{while(queue.length)queue.shift()()}};
}
function forwardWhileCloseIsQueued(s){s.open();const sourceHash=s.ctx.location.hash;s.ctx.location.hash='#equipment/entry';s.ctx.FirstEditionSourceViewer.close({fromRoute:true});s.ctx.location.hash=sourceHash;s.flush();return sourceHash;}
test('sealed native failure and complete target inventory remain available for calibration',()=>{
 assert.equal(before.sourceTargetUniverse.records,995);assert.equal(before.sourceTargetUniverse.targets,4505);
 assert.equal(before.failingBrowserProbe.counts.sequences,16);assert.equal(before.failingBrowserProbe.counts.failed,5);
 const old=harness(before.sourceFiles['dist/source-viewer.js'].source,before.sourceFiles['dist/app.js'].source),expected=forwardWhileCloseIsQueued(old);
 assert.notEqual(old.ctx.location.hash,expected,'the old queued route close erases the Forward source URL');
});
test('a queued navigation close preserves a Forward citation URL before its route opens',()=>{
 const s=harness(),expected=forwardWhileCloseIsQueued(s);assert.equal(s.ctx.location.hash,expected);
 s.ctx.openScanViewer(s.item,s.references,'entry',{book:'UA',page:26,region:'row'},{fromRoute:true});assert.equal(s.ctx.dialog.open,true);assert.equal(s.ctx.location.hash,expected);
});
test('explicit user Close still removes the source URL after a navigation close',()=>{
 const s=harness();forwardWhileCloseIsQueued(s);s.open();s.ctx.el.close.click();s.flush();assert.equal(s.ctx.location.hash,'#equipment/entry');assert.equal(s.ctx.dialog.open,false);
});
test('an older close event cannot dismiss a reopened viewer or consume its user-close callback',()=>{
 const s=harness();s.open();s.ctx.FirstEditionSourceViewer.close({fromRoute:true});s.ctx.openScanViewer(s.item,s.references,'entry',{book:'UA',page:26,region:'row'},{fromRoute:true});const hash=s.ctx.location.hash;s.flush();assert.equal(s.ctx.dialog.open,true);assert.equal(s.ctx.location.hash,hash);s.ctx.el.close.click();s.flush();assert.equal(s.ctx.location.hash,'#equipment/entry');
});
test('navigation supersedes a queued user close when the dialog is already closed',()=>{
 const s=harness();s.open();const hash=s.ctx.location.hash;s.ctx.el.close.click();s.ctx.location.hash='#equipment/entry';s.ctx.FirstEditionSourceViewer.close({fromRoute:true});s.ctx.location.hash=hash;s.flush();assert.equal(s.ctx.location.hash,hash);
});
