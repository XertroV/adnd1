import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {containsContext} from '../tools/citation-context-contract.mjs';

const baseline=JSON.parse(readFileSync(new URL('../research/equipment-price-context-baseline.json',import.meta.url)));

test('bounded price context baseline retains extracted, unbound and missing source claims',()=>{
  assert.equal(baseline.records.length,185);
  assert.equal(new Set(baseline.records.map(record=>record.itemId)).size,185);
  assert.deepEqual(baseline.counts.recordStates,{'price-target-not-declared':98,'price-target-present':14,'source-row-object-not-extracted':73});
  for(const record of baseline.records){
    assert.match(record.sourceSha256,/^[a-f0-9]{64}$/);
    assert.equal(containsContext(record.requiredContextSourcePageNormalizedXYWH,record.rowSourcePageNormalizedXYWH),true,record.itemId);
  }
});

test('Git baseline retains the narrow Arrow price target and its insufficient context',()=>{
  const record=baseline.records.find(record=>record.itemId==='phb-arrow');
  const old=JSON.parse(execFileSync('git',['show',`${baseline.baselineCommit}:dist/${record.baselineCatalog}`],{encoding:'utf8'}));
  for(const candidate of record.baselineRegionCandidates){
    const region=old.regions.find(region=>region.id===candidate.regionId);
    assert.ok(region,candidate.regionId);
    assert.equal(region.sha256,candidate.imageSha256);
    assert.equal(containsContext(candidate.normalizedSourceCropXYWH,record.requiredContextSourcePageNormalizedXYWH),candidate.status==='annotated-context-contained');
  }
  assert.ok(record.baselineRegionCandidates.some(candidate=>candidate.status==='row-contained-context-insufficient'));
});
