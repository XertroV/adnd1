import {reverseRacialLastCorrections} from './mechanics-racial-last-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dependencyCorrections,reverseDependencyCorrections,validateDependencyIndependentReviews} from './mechanics-dependency-fixture.mjs';
const load=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
test('dependency mechanics corrections retain exact independent review bindings',()=>{
 assert.equal(validateDependencyIndependentReviews(),13);
 const records=structuredClone(dependencyCorrections.records), c=records.flatMap(r=>r.changes).find(c=>c.independentReview);
 c.independentReview.newValue='tampered';assert.throws(()=>validateDependencyIndependentReviews(records));
});
test('dependency mechanics correction preimages are recoverable only from approved values',()=>{
 const groups={equipment:load('equipment.json').equipment,classes:load('classes.json').classes,rules:load('rules.json').rules,spells:[...load('phb-spells.json').spells,...load('phb-magic-user-extra.json').spells,...load('ua-spells.json').spells]};
 for(const [collection,items] of Object.entries(groups))reverseDependencyCorrections(reverseRacialLastCorrections(items,collection),collection);
 const r=dependencyCorrections.records[0],items=reverseRacialLastCorrections(groups[r.collection],r.collection),item=items.find(x=>x.id===r.id),c=r.changes.find(c=>c.independentReview),parts=c.path.split('/').slice(1).map(s=>s.replaceAll('~1','/').replaceAll('~0','~'));let parent=item;
 for(const key of parts.slice(0,-1))parent=parent[key];parent[parts.at(-1)]='tampered';
 assert.throws(()=>reverseDependencyCorrections(items,r.collection),/current value/);
});
