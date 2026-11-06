import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url)));
const get=id=>data.spells.find(item=>item.id===id);
test('Emotion preserves its duration and labels both Symbol comparisons',()=>{
 const item=get('phb-illusionist-emotion');
 assert.equal(item.fields.Area,'4″ × 4″ area');
 assert.equal(item.fields.Duration,'While concentrating');
 assert.deepEqual(item.pages,[76,97]);
 for(const page of [53,91])assert.ok(item.references.some(r=>r.book==='PHB'&&r.pages.includes(page)&&r.label.includes('Candidate comparison')));
 assert.match(item.exceptions.join(' '),/does not specify/);
});
test('first-level selection presents the conflicting introduction as a source question',()=>{
 const item=get('phb-illusionist-first-level-magic-user-spells');
 assert.equal(item.fields.Area,'As the chosen spell');
 assert.equal(item.fields['PHB p.100 listed spells'].split(';').length,20);
 assert.match(item.exceptions.join(' '),/p\.94.*conflict/);
 assert.ok(item.references.some(r=>r.book==='PHB'&&r.pages.includes(94)&&r.label.includes('Conflicting')));
});

test('Speak With Animals leaves the special reaction chart unidentified',()=>{
 for(const id of ['phb-cleric-speak-with-animals','phb-druid-speak-with-animals']){
  const item=get(id);
  assert.match(item.exceptions.join(' '),/special reaction chart but does not identify it/);
  assert.match(item.conditions.join(' '),/referee/);
 }
});
