import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const before=JSON.parse(readFileSync(new URL('../research/missile-table-discoverability/implementation-candidate/renderer-before.json',import.meta.url),'utf8'));
const current=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const rendererStart='function ruleTableHTML(item) {';
const rendererEnd='\nfunction classTarget(';
function renderer(source){
 const start=source.indexOf(rendererStart),end=source.indexOf(rendererEnd,start);
 assert.ok(start>=0&&end>start,'ruleTableHTML boundaries exist');
 return source.slice(start,end);
}
function render(source,table){
 const context={
  esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
  bookCode:value=>String(value||''),
  displaySourceValue:value=>typeof value==='string'||typeof value==='number'?String(value):String(value?.text??value?.meaning??value?.label??''),
  tableFactSourceChip:(_item,fact)=>fact?.sourceReference?'[exact source]':'[pending source]',
 };
 vm.runInNewContext(`${source}\nresult=ruleTableHTML(item);`,Object.assign(context,{item:{id:'table-fixture',category:'Combat',title:'Table fixture',sourceReferences:[],table}}));
 return context.result;
}

test('optional source-note support leaves ordinary table rendering byte-identical',()=>{
 const table={title:'Table fixture',rowHeader:{label:'Weapon'},columnGroup:{label:'Armor Class'},columns:[{id:'ac-2',label:'2'}],rows:[],symbols:[],procedure:[],footnotes:[],sourceReferences:[]};
 assert.equal(render(renderer(current),table),render(before.functionText,table));
});

test('source-note rendering uses the explicit heading and does not label editorial guidance as a printed footnote',()=>{
 const table={title:'Table fixture',rowHeader:{label:'Weapon'},columnGroup:{label:'Armor Class'},columns:[],rows:[],sourceNotesTitle:'Armor Class column key',sourceNotes:[{label:'PHB p. 36 · Leather',text:'Leather or padded armor: AC 8',sourceReference:{sourceFocusId:'leather-row'}}]};
 const html=render(renderer(current),table);
 assert.match(html,/<section class="source-table-notes"><h3>Armor Class column key<\/h3>/);
 assert.match(html,/Leather or padded armor: AC 8/);
 assert.match(html,/\[exact source\]/);
 assert.doesNotMatch(html,/Printed footnotes/);
});

test('unbound source-note guidance stays visibly pending',()=>{
 const table={title:'Table fixture',rowHeader:{label:'Weapon'},columnGroup:{label:'Armor Class'},columns:[],rows:[],sourceNotesTitle:'Armor Class column key',sourceNotes:[{label:'PHB p. 36 · Plate',text:'Plate mail: AC 3'}]};
 const html=render(renderer(current),table);
 assert.match(html,/Plate mail: AC 3/);
 assert.match(html,/\[pending source\]/);
});
