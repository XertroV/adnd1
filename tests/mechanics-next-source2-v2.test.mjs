// Additive Source2 family successor; original case and historical-role assertions are preserved.
// Current Source2 admission remains a separate genuine zero-argument identity case.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforePass8CharacterReferenceFile as readFileSync} from "../research/class-mapping-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-source2-v1.mjs";
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


// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
