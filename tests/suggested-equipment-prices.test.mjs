import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const part=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function setup(){
 const ctx=vm.createContext({data:{equipment:[{id:'comparison',name:'Trusted <weapon>'}]},attributeMode:'table',view:'equipment',esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),icon:()=>'',bookCode:x=>x,inlineSourceChip:(r,title)=>`<button data-inline-source data-ref-book="${r.book}" data-ref-title="${String(title).replaceAll('<','&lt;').replaceAll('>','&gt;')}">SOURCE</button>`,selectedScanVerification:()=>null,detailHeaderHTML:(_,o)=>o.attributes,inlineNotes:()=>'',originalScansButton:()=>''});
 vm.runInContext(part('function fieldEntries(', 'function spellAttributesHTML('),ctx);
 vm.runInContext(part('function hasKnownPrice(', '\nfunction filtersHTML()'),ctx);
 return ctx;
}
test('suggested prices stay separate from printed prices, escape content, and cite comparisons only',()=>{
 const c=setup(),item={id:'target',name:'Item',book:'UA',price:null,priceState:'not_listed',suggestedPrice:{amount:12,currency:'gp',unit:'per <item>',rationale:'Estimate <script>bad</script>',comparisons:[{itemId:'comparison',book:'PHB',pages:[35],amount:10,currency:'gp',unit:'each'}]}};
 assert.equal(c.hasKnownPrice(item),false);assert.equal(c.hasSuggestedPrice(item),true);
 assert.equal(c.equipmentPriceLabel(item),'Suggested (estimate): 12 gp / per <item>');
 const rows=c.attributeRows(item,{equipment:true});assert.equal(rows[0].reference,null);assert.match(rows[0].label,/Suggested \(estimate\)/);
 const table=c.attributeLayoutHTML(item,{equipment:true});assert.match(table,/Suggested \(estimate\)/);assert.match(table,/per &lt;item&gt;/);assert.doesNotMatch(table,/data-inline-source/);
 const detail=c.equipmentDetailHTML(item);assert.match(detail,/Suggested \(estimate\)/);assert.match(detail,/Estimate &lt;script&gt;bad&lt;\/script&gt;/);assert.doesNotMatch(detail,/<script>/);assert.match(detail,/citations document the comparison items, not a printed price/);assert.match(detail,/data-source-context="comparison" data-source-view="equipment"/);assert.equal((detail.match(/data-inline-source/g)||[]).length,1);
 const plain={id:'none',name:'None',price:null};assert.equal(c.hasSuggestedPrice(plain),false);assert.equal(c.equipmentPriceLabel(plain),'Price not extracted');assert.equal(c.suggestedPriceHTML(plain),'');
 const printed={id:'printed',name:'Printed',price:{amount:3,currency:'gp',book:'PHB',pages:[35]},suggestedPrice:item.suggestedPrice};assert.equal(c.hasKnownPrice(printed),true);assert.equal(c.hasSuggestedPrice(printed),false);assert.equal(c.equipmentPriceLabel(printed),'3 gp');assert.equal(c.attributeRows(printed,{equipment:true})[0].reference,printed.price);
 assert.equal([item,plain,printed].filter(c.hasKnownPrice).length,1);assert.equal([item,plain,printed].filter(c.hasSuggestedPrice).length,1);
});

test('estimate filter and printed-price filter remain distinct',()=>{
 const c=setup();Object.assign(c,{index:[{id:'a',_view:'equipment',_title:'A',price:null,suggestedPrice:{amount:1,currency:'gp',unit:'each'}},{id:'b',_view:'equipment',_title:'B',price:null},{id:'c',_view:'equipment',_title:'C',price:{amount:2,currency:'gp'}}],filter:{q:'',book:'',price:'suggested',class:'',category:'',details:''},selectedSpellLevels:new Set(),matchesQuery:()=>true,FirstEditionSearch:{score:()=>0}});
 vm.runInContext(part('function filteredItems()', '\nfunction renderReference()'),c);
 assert.equal(c.filteredItems().map(x=>x.id).join(','),'a');c.filter.price='unknown';assert.equal(c.filteredItems().map(x=>x.id).join(','),'a,b');c.filter.price='known';assert.equal(c.filteredItems().map(x=>x.id).join(','),'c');
});
