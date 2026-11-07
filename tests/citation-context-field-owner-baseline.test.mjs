import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const bytes=readFileSync(new URL('../research/citation-context-field-owner-prefx.json',import.meta.url));
const report=JSON.parse(bytes);

test('frozen pre-fix contextual field-owner browser probe retains all 146 observations',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'77e8e92f968468313563f174bb2933328769c85817380732fb14d4084a450dc3');
 assert.equal(report.provenance.gitHead,'13783128ca5955ac707ed7ec6994d78d7c9a7cce');
 assert.equal(report.summary.observations,146);
 assert.deepEqual(report.summary.byScenario['progression-explainer'],64);
 assert.equal(Object.entries(report.summary.byScenario).filter(([name])=>name.startsWith('fighter-matrix')).reduce((sum,[,count])=>sum+count,0),76);
 assert.equal(report.summary.byScenario['equipment-comparison'],6);
 assert.equal(report.summary.ownerNamespaceNotRouteable,64);
 assert.equal(report.summary.roundTripMisses,141);
 const progression=report.observations.find(row=>row.scenario==='progression-explainer');
 const matrix=report.observations.find(row=>row.scenario.startsWith('fighter-matrix'));
 const comparator=report.observations.find(row=>row.scenario==='equipment-comparison');
 assert.equal(progression.clickedRoute.fieldOwner,null);
 assert.equal(progression.fieldTarget.fieldOwner.collection,'progressionExplainer');
 assert.equal(matrix.clickedRoute.fieldOwner,null);
 assert.equal(matrix.fieldTarget.fieldOwner.collection,'matrices');
 assert.equal(comparator.fieldTarget.fieldOwner.collection,'equipment');
 assert.equal(comparator.fieldTarget.sourceOwner.itemId,'phb-spear');
});
