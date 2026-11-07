import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const baseline=JSON.parse(readFileSync(new URL('../research/citation-filtered-route-prefx.json',import.meta.url),'utf8'));

test('frozen pre-fix filtered-route sweep records the explicit-route mismatch in all four views',()=>{
 assert.equal(baseline.schemaVersion,1);
 assert.deepEqual(baseline.fixtures.map(fixture=>fixture.view).sort(),['classes','equipment','rules','spells']);
 assert.equal(baseline.outcome.cases,20);
 assert.equal(baseline.outcome.mismatches,16);
 assert.equal(baseline.outcome.filterRetained,20);
 for(const fixture of baseline.fixtures){
  const observations=baseline.observations.filter(row=>row.view===fixture.view);
  assert.equal(observations.length,5,`${fixture.view}: direct, source, back, and forward paths are retained`);
  for(const caseType of ['direct-same-view-route','direct-source-link','history-forward-target','history-forward-filtered-target']){
   const observed=observations.find(row=>row.caseType===caseType);
   assert.ok(observed,`${fixture.view}: missing ${caseType} baseline`);
   assert.notEqual(observed.detailId,fixture.requested,`${fixture.view}: ${caseType} should preserve the pre-fix failure`);
  }
  const back=observations.find(row=>row.caseType==='history-back-filter-record');
  assert.equal(back.detailId,fixture.filterRecord,`${fixture.view}: Back returns to the filtered record`);
 }
});
