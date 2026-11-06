import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {racialLastCorrections,reverseRacialLastCorrections,validateRacialLastIndependentReviews} from './mechanics-racial-last-fixture.mjs';
const load=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
test('racial mechanics corrections retain exact independent review bindings',()=>{
 assert.equal(validateRacialLastIndependentReviews(),3);
 const records=structuredClone(racialLastCorrections.records), c=records.flatMap(r=>r.changes).find(c=>c.independentReview);
 c.independentReview.newValue='tampered';assert.throws(()=>validateRacialLastIndependentReviews(records));
});
test('racial mechanics correction preimages are recoverable only from approved values',()=>{
 const groups={equipment:load('equipment.json').equipment,classes:load('classes.json').classes,rules:load('rules.json').rules,spells:[...load('phb-spells.json').spells,...load('phb-magic-user-extra.json').spells,...load('ua-spells.json').spells]};
 for(const [collection,items] of Object.entries(groups))reverseRacialLastCorrections(items,collection);
 const r=racialLastCorrections.records[0],items=structuredClone(groups[r.collection]),item=items.find(x=>x.id===r.id),c=r.changes.find(c=>c.independentReview),parts=c.path.split('/').slice(1).map(s=>s.replaceAll('~1','/').replaceAll('~0','~'));let parent=item;
 for(const key of parts.slice(0,-1))parent=parent[key];parent[parts.at(-1)]='tampered';
 assert.throws(()=>reverseRacialLastCorrections(items,r.collection),/current value/);
});
