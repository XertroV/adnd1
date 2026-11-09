import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforePass8CharacterReferenceFile as readFileSync} from './helpers/pass8-phb-source-history.mjs';
import {nextCorrections,reverseNextCorrections,validateNextIndependentReviews} from './mechanics-next-fixture.mjs';
const load=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
test('next mechanics corrections retain exact independent review bindings',()=>{
 assert.equal(validateNextIndependentReviews(),57);
 const records=structuredClone(nextCorrections.records), c=records.flatMap(r=>r.changes).find(c=>c.independentReview);
 c.independentReview.newValue='tampered';assert.throws(()=>validateNextIndependentReviews(records));
});
test('next mechanics correction preimages are recoverable only from approved values',()=>{
 const groups={equipment:load('equipment.json').equipment,classes:load('classes.json').classes,rules:load('rules.json').rules,spells:[...load('phb-spells.json').spells,...load('phb-magic-user-extra.json').spells,...load('ua-spells.json').spells]};
 for(const [collection,items] of Object.entries(groups))reverseNextCorrections(items,collection);
 const r=nextCorrections.records.find(r=>r.collection==='equipment'),items=structuredClone(groups.equipment),item=items.find(x=>x.id===r.id),c=r.changes.find(c=>c.path.startsWith('/fields/'));item.fields[c.path.split('/').at(-1).replaceAll('~1','/').replaceAll('~0','~')]='tampered';
 assert.throws(()=>reverseNextCorrections(items,'equipment'),/current value/);
});
