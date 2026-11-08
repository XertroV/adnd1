import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const note='includes all pointed cutting & thrusting weapons with blade length 15–24 in.';
test('the frozen source-row proposal preserves the actual Long/Short condition mistake',()=>{
 const rows=read('research/source-audit-batch5-phb-dmg-table-catalog-patch.json').bindings;
 assert.equal(rows.find(r=>r.rowId==='batch5-phb37-weapon-weight-damage-046').sourceConditions,note);
 assert.equal(rows.find(r=>r.rowId==='batch5-phb37-weapon-weight-damage-047').sourceConditions,'');
});
test('current row conditions and mapping evidence assign the qualifier only to Short',()=>{
 const rows=read('research/source-table-citation-contracts.json').tables.find(t=>t.id==='batch5-phb37-weapon-weight-damage').rows;
 const long=rows.find(r=>r.id.endsWith('-046')),short=rows.find(r=>r.id.endsWith('-047'));
 assert.equal(long.sourceConditions,'');assert.equal(short.sourceConditions,note);
 assert.ok(long.targets.every(t=>!t.evidence.includes(note)));assert.ok(short.targets.every(t=>t.evidence.includes(note)));
});
