import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforePass8CharacterReferenceFile as readFileSync} from '../research/hirelings-source-epoch-proposal-v5/source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs';
import {finalCorrections,reverseFinalCorrections,validateFinalIndependentReviews} from './mechanics-final-fixture.mjs';
const load=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
test('final mechanics corrections retain exact independent review bindings',()=>{
 assert.equal(validateFinalIndependentReviews(),6);
 const records=structuredClone(finalCorrections.records), c=records.flatMap(r=>r.changes).find(c=>c.independentReview);
 c.independentReview.newValue='tampered';assert.throws(()=>validateFinalIndependentReviews(records));
});
test('final mechanics correction preimages are recoverable only from approved values',()=>{
 const groups={equipment:load('equipment.json').equipment,classes:load('classes.json').classes,rules:load('rules.json').rules,spells:[...load('phb-spells.json').spells,...load('phb-magic-user-extra.json').spells,...load('ua-spells.json').spells]};
 for(const [collection,items] of Object.entries(groups))reverseFinalCorrections(items,collection);
 const r=finalCorrections.records[0],items=structuredClone(groups[r.collection]),item=items.find(x=>x.id===r.id),c=r.changes.find(c=>c.independentReview),parts=c.path.split('/').slice(1).map(s=>s.replaceAll('~1','/').replaceAll('~0','~'));let parent=item;
 for(const key of parts.slice(0,-1))parent=parent[key];parent[parts.at(-1)]='tampered';
 assert.throws(()=>reverseFinalCorrections(items,r.collection),/current value/);
});
