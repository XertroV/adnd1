import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const require=createRequire(import.meta.url);
const search=require('../dist/search.js');
const books=require('../dist/books.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const candidate=JSON.parse(readFileSync(new URL('../research/missile-table-discoverability/implementation-candidate/rules-records-candidate.json',import.meta.url),'utf8'));
const expectedIds=['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'];

// Mirrors dist/app.js buildIndex() collection order and searchable projections.
const classText=item=>(Array.isArray(item.classes)&&item.classes.length?item.classes:Array.isArray(item.class)?item.class:item.class?[item.class]:[]).join(' / ')||'Class not yet extracted';
const levelText=item=>item.level===undefined||item.level===null||item.level===''?'Level not yet extracted':`Level ${item.level}`;
const knownPrice=item=>item.price!==null&&typeof item.price==='object'&&typeof item.price.amount==='number'&&Number.isFinite(item.price.amount)&&item.price.amount>=0&&typeof item.price.currency==='string'&&Boolean(item.price.currency.trim());
const suggestedPrice=item=>{const p=item.suggestedPrice;return !knownPrice(item)&&!!p&&typeof p.amount==='number'&&Number.isFinite(p.amount)&&p.amount>=0&&typeof p.currency==='string'&&!!p.currency.trim()&&typeof p.unit==='string'&&!!p.unit.trim();};
const priceLabel=item=>{if(knownPrice(item))return `${['estimate','estimated'].includes(item.priceState)?'Estimate · ':''}${item.price.amount.toLocaleString()} ${item.price.currency}${item.price.unit?` / ${item.price.unit}`:''}`;if(suggestedPrice(item)){const p=item.suggestedPrice;return `Suggested (estimate): ${p.amount.toLocaleString()} ${p.currency} / ${p.unit}`;}return item.priceState==='not_listed'?'Not listed in source':'Price not extracted';};
function globalIndex(extraRules=[]){
 return [
  ...data.spells.map(x=>({...x,_view:'spells',_title:x.name||x.title||'',_subtitle:`${classText(x)} · ${levelText(x)} · ${books.code(x.book)}`})),
  ...[...data.rules,...extraRules].map(x=>({...x,_view:'rules',_title:x.title||'',_subtitle:`${x.category||'Rule'} · ${books.code(x.book)}`})),
  ...data.equipment.map(x=>({...x,_view:'equipment',_title:x.name||'',_subtitle:`${x.category||'Equipment'} · ${priceLabel(x)} · ${books.code(x.book)}`})),
  ...data.classes.map(x=>({...x,_view:'classes',_title:x.name||'',_subtitle:`Class & advancement · ${books.code(x.book)}`})),
  ...data.matrices.map(x=>({...x,_view:'matrices',_title:x.title||x.name||'',_subtitle:`${books.code(x.book)} · Combat matrix`})),
  ...(data.progressionExplainer?[{...data.progressionExplainer,_view:'progressionExplainer',_title:data.progressionExplainer.title||'Class progression paths',_subtitle:'Class progression reference'}]:[]),
 ].map(x=>search.prepare({...x,_bookName:books.title(x.book)}));
}
const items=globalIndex(candidate.records);
const ranked=query=>items.filter(item=>Number.isFinite(search.score(item,query))).sort((a,b)=>search.compare(a,b,query));
const topIds=query=>ranked(query).slice(0,2).map(item=>item.id);

test('the candidate tables rank ahead of the full current app index for user phrases',()=>{
 assert.equal(data.rules.some(item=>expectedIds.includes(item.id)),false,'the active baseline has neither table record');
 for(const query of ['hurled weapons','hurled weapons and missiles','missile weapon versus armor','missile weapon versus armour','bow leather plate']){
  assert.deepEqual(topIds(query),expectedIds,`${query} should put both source-specific tables before weapon cards`);
 }
 assert.equal(ranked('PHB 38 hurled weapons')[0]?.id,expectedIds[0]);
 assert.equal(ranked('UA 28 hurled weapons')[0]?.id,expectedIds[1]);
});

test('authored table source notes are indexed while citation and audit metadata stay private',()=>{
 const phb=items.find(item=>item.id===expectedIds[0]);
 assert.ok(Number.isFinite(search.score(phb,'melee round')),'the printed fire-rate note is searchable');
 assert.ok(Number.isFinite(search.score(phb,'short range')),'the printed range-adjustment note is searchable');
 assert.ok(Number.isFinite(search.score(phb,'Armor Class column key')),'the authored armor-column key is searchable');
 assert.equal(search.score(phb,'evidence bindings pending'),Infinity,'review-state metadata is not searchable');
});
