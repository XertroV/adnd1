import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const require=createRequire(import.meta.url);
const search=require('../dist/search.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const records=[...data.spells.map(x=>({...x,_view:'spells',_title:x.name,_subtitle:[...(x.classes||[x.class]),x.level,x.book].join(' ')})),...data.rules.map(x=>({...x,_view:'rules',_title:x.title}))].map(search.prepare);
const results=query=>records.filter(x=>Number.isFinite(search.score(x,query))).sort((a,b)=>search.score(a,query)-search.score(b,query));
test('CLW exists in authoritative-derived data for both spellcasting classes',()=>{
 for(const cls of ['Cleric','Druid'])assert.ok(data.spells.some(s=>s.name==='Cure Light Wounds'&&s.class===cls&&s.effect.length));
});
test('compact, dotted, spaced and hyphenated CLW resolve to the same actual spell',()=>{
 for(const query of ['CLW','clw','C.L.W.','c l w','C-L-W'])assert.deepEqual(new Set(results(query).map(x=>x.name)),new Set(['Cure Light Wounds']),query);
});
test('acronym can be combined with class terms',()=>{
 assert.deepEqual(results('clw cleric').map(s=>s.id),['phb-cleric-cure-light-wounds']);
 assert.deepEqual(results('c l w druid').map(s=>s.id),['phb-druid-cure-light-wounds']);
});
test('common spell abbreviations resolve and preserve ambiguity',()=>{
 const examples={MM:'Magic Missile',DM:'Dispel Magic',PFE:'Protection from Evil',CSW:'Cure Serious Wounds',CCW:'Cure Critical Wounds',LB:'Lightning Bolt',FB:'Fireball'};
 for(const [query,name]of Object.entries(examples))assert.ok(results(query).some(x=>x.name.toLowerCase()===name.toLowerCase()),query);
 assert.ok(results('DM').some(s=>s.name==='Detect Magic'));
 const rule=search.prepare({_view:'rules',_title:'Unrelated rule',book:'DMG',summary:'A source reference'});
 assert.equal(search.score(rule,'DM'),Infinity,'DM must not substring-match the DMG book code');
 assert.ok(results('DM')[0]._view==='spells','spell acronyms rank before ordinary DM references');
});
test('common shorthand phrases, full names and partial names remain searchable',()=>{
 for(const [query,name]of [['cure lt wounds','Cure Light Wounds'],['prot evil','Protection from Evil'],['invis','Invisibility'],['magic missiles','Magic Missile'],['cure l','Cure Light Wounds'],['Cure Light Wounds','Cure Light Wounds']])assert.ok(results(query).some(s=>s.name===name),query);
});
test('spell abbreviations are exact, never arbitrary paragraph initials',()=>{
 const fake=search.prepare({_view:'spells',_title:'Unrelated Spell',description:'Cure Light Wounds is a cross reference',effect:[]});
 assert.equal(search.score(fake,'CLW'),Infinity);
 assert.equal(search.score(fake,'CL'),Infinity);
});
test('exact title and explicit alias rank ahead of body-only references',()=>{
 const fake=search.prepare({_view:'spells',_title:'Another Spell',description:'Cure Light Wounds is a cross reference'});
 const clw=records.find(x=>x.id==='phb-cleric-cure-light-wounds');
 assert.ok(search.score(clw,'cure light wounds')<search.score(fake,'cure light wounds'));
});
test('source-attested reverse-form names are searchable aliases',()=>{
 assert.ok(results('Cause Light Wounds').some(s=>s.name==='Cure Light Wounds'));
});
