import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {assertPrimaryRowEvidence,citationRegionRole} from '../tools/citation-region-role.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
test('all twelve actual heading-as-row proposals are detected before selector correction',()=>{
 const baseline=read('research/source-audit-batch5-ua28-field-selector-baseline.json');
 assert.equal(baseline.counts.fieldTargets,69);assert.equal(baseline.counts.headingAsRowTargets,12);
 const bad=baseline.rows.filter(r=>r.badHeadingTarget);assert.equal(bad.length,12);
 for(const row of bad){const target=row.rowTargets.find(r=>r.classification==='heading-as-row-target');
  const catalog={regions:[{id:target.regionId,title:target.title}]};
  assert.throws(()=>assertPrimaryRowEvidence({...row,requiresRowEvidence:true,reviewStatus:'field-target-reviewed',regionIds:[target.regionId]},catalog),/selects heading-context/);
 }
});
test('role claims do not turn unannotated prose into approved row evidence',()=>{
 assert.equal(citationRegionRole({title:'Source passage'}),'role-unassessed');
 assert.throws(()=>assertPrimaryRowEvidence({requiresRowEvidence:true,reviewStatus:'field-target-reviewed',regionIds:['x']},{regions:[{id:'x',title:'Source passage'}]}),/role-unassessed/);
 assert.doesNotThrow(()=>assertPrimaryRowEvidence({requiresRowEvidence:true,reviewStatus:'field-target-pending',regionIds:[]},{regions:[]}));
});
test('a shared adjustment passage selects its note instead of an unrelated row',()=>{
 const binding={requiresPassageEvidence:true,reviewStatus:'field-target-reviewed',regionIds:['row']},catalog={regions:[{id:'row',role:'row'},{id:'note',role:'note',focusRects:[[0.1,0.8,0.8,0.15]]}]};
 assert.throws(()=>assertPrimaryRowEvidence(binding,catalog),/Passage fact/);
 assert.doesNotThrow(()=>assertPrimaryRowEvidence({...binding,regionIds:['note']},catalog));
});
test('an unmarked or whole-image context does not clear an explicit individual fact requirement',()=>{
 const binding={requiresRowEvidence:true,reviewStatus:'field-target-reviewed',regionIds:['r']};
 for(const focusRects of [[],[[0,0,1,1]]])assert.throws(()=>assertPrimaryRowEvidence(binding,{regions:[{id:'r',role:'row',focusRects}]}),/unresolved primary highlight/);
});
