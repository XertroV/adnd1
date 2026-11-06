import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/source-viewer.js',import.meta.url),'utf8');
const excerpt=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
function makeViewer(){
 const doc={activeElement:null,createTextNode:text=>({textContent:text}),body:{append(){},classList:{add(){},remove(){}}}};
 class Element{
  constructor(tag,attrs={},text=''){this.tag=tag;this.attrs={...attrs};this.textContent=text;this.children=[];this.listeners={};this.hidden=false;this.disabled=false;}
  append(...nodes){this.children.push(...nodes)} replaceChildren(...nodes){this.children=nodes} setAttribute(k,v){this.attrs[k]=v} removeAttribute(k){delete this.attrs[k]}
  addEventListener(type,fn){this.listeners[type]=fn} focus(){doc.activeElement=this} showModal(){this.open=true} close(){this.open=false;this.listeners.close?.()} click(){this.listeners.click?.()}
 }
 const ctx=vm.createContext({document:doc,root:{addEventListener(){}},dialog:undefined,el:{},session:0,catalogRequest:0,renderVersion:0,renderTask:null,returnFocus:null,privacyDismissed:false,refs:[],current:0,regionIndex:0,showHighlights:true,excerptSource:null,excerptCatalog:null,excerptError:'',excerptLoading:false,requestedMode:'',
  node:(tag,attrs,text)=>new Element(tag,attrs,text),button:(label,action,attrs)=>{const el=new Element('button',attrs,label);el.addEventListener('click',action);return el},
  resolveExcerptSource:item=>item.hasExcerpt?{state:'source-excerpt-checked'}:null,normalize:()=>[],books:()=>({code:x=>x}),resetZoom(){},title:x=>x,loadExcerpts(){},update(){ctx.el.modes.hidden=!ctx.excerptSource;ctx.el.excerptMode.disabled=false},setMode(){},navigate(){},forget(){},changeZoom(){},renderPage(){},loadFile(){}});
 vm.runInContext(excerpt('  function setup()','\n  function resetZoom()'),ctx);
 return {ctx,doc};
}
test('header groups the named title, mode controls and accessible close button',()=>{
 const {ctx}=makeViewer();ctx.open({item:{name:'A long entry title',hasExcerpt:true},references:[]});
 assert.equal(ctx.dialog.attrs['aria-labelledby'],'source-viewer-title');
 assert.equal(ctx.el.title.tag,'h2');assert.equal(ctx.el.title.children[0].textContent,'Original Sources: ');assert.equal(ctx.el.title.children[1].textContent,'A long entry title');
 assert.deepEqual(ctx.el.headerActions.children,[ctx.el.modes,ctx.el.close]);assert.equal(ctx.el.modes.attrs['aria-label'],'Source viewing mode');
 assert.equal(ctx.el.excerptMode.textContent,'View excerpts');assert.equal(ctx.el.pdfMode.textContent,'Your PDF');assert.equal(ctx.el.close.attrs['aria-label'],'Close original sources');
 assert.equal(ctx.el.dismissPrivacy.attrs['aria-label'],'Dismiss source notice');assert.equal(ctx.dialog.attrs['aria-describedby'],'source-viewer-privacy');
});
test('notice dismissal stays in memory across opens and resets in a fresh viewer',()=>{
 const {ctx,doc}=makeViewer();ctx.open({item:{name:'First',hasExcerpt:true},references:[]});assert.equal(ctx.el.privacyNotice.hidden,false);
 ctx.el.dismissPrivacy.click();assert.equal(ctx.el.privacyNotice.hidden,true);assert.equal(ctx.dialog.attrs['aria-describedby'],undefined);assert.equal(doc.activeElement,ctx.el.excerptMode);
 ctx.open({item:{name:'Second',hasExcerpt:false},references:[]});assert.equal(ctx.el.privacyNotice.hidden,true);assert.equal(ctx.dialog.attrs['aria-describedby'],undefined);
 const fresh=makeViewer();fresh.ctx.open({item:{name:'Reloaded',hasExcerpt:false},references:[]});assert.equal(fresh.ctx.el.privacyNotice.hidden,false);assert.equal(fresh.ctx.dialog.attrs['aria-describedby'],'source-viewer-privacy');
 fresh.ctx.el.dismissPrivacy.click();assert.equal(fresh.doc.activeElement,fresh.ctx.el.close);
});
