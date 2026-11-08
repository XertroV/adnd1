import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';
import {citationRegionRole} from '../tools/citation-region-role.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const receipt=read('research/source-audit-batch5-ua28-field-integration.json');
const proof=read(receipt.proof.path);
const bindings=read('research/field-evidence-bindings.json').bindings;

test('all 66 reviewed selectors are applied with their source-purpose order and exact current evidence',()=>{
  assert.equal(receipt.added.length,66);assert.equal(proof.selectors.length,66);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+receipt.proof.path,import.meta.url))).digest('hex'),receipt.proof.sha256);
  for(const selector of proof.selectors){
    const binding=bindings.find(b=>b.collection==='equipment'&&b.itemId===selector.itemId&&b.fieldPointer===selector.fieldPointer&&b.book==='UA'&&b.printedPage===28);
    assert.ok(binding,selector.key);
    assert.deepEqual(binding.regionIds,selector.orderedRegionIds,selector.key);
    assert.equal(binding.requiresRowEvidence,selector.requiresRowEvidence);
    assert.equal(binding.requiresPassageEvidence,selector.requiresPassageEvidence);
    assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
    const catalog=read('dist/'+binding.catalog);
    for(const evidence of binding.expectedRegionEvidence){
      const region=catalog.regions.find(r=>r.id===evidence.regionId);
      assert.equal(region.sha256,evidence.imageSha256);
      assert.deepEqual(sourceVisualRegionHashes(region),{focusSha256:evidence.focusSha256,contentSha256:evidence.contentSha256});
    }
  }
});

test('three active Aklys missile bindings remain identical to the reviewed 679 bindings',()=>{
  const historical=JSON.parse(execFileSync('git',['show','679b15d:research/field-evidence-bindings.json'],{maxBuffer:8*1024*1024}));
  const select=rows=>rows.filter(b=>b.collection==='equipment'&&b.itemId==='ua-aklys-hurled'&&b.book==='UA'&&b.printedPage===28);
  assert.equal(select(bindings).length,3);
  assert.deepEqual(select(bindings),select(historical.bindings));
});

test('every UA28 physical row contract selects the reviewed table and an actual row',()=>{
  const table=read('research/source-table-citation-contracts.json').tables.find(t=>t.id==='ua-p28-weapon-table');
  const overrides=read('citation-overrides.json');
  assert.equal(table.rows.length,24);assert.equal(receipt.contractChanges.length,24);
  assert.equal(receipt.contractChanges.filter(c=>c.before.requiredRegionIds.includes('ua-28-73a3e8aed178e52a')).length,4);
  for(const row of table.rows)for(const target of row.targets){
    const catalog=read('dist/'+overrides.sourceExcerpts['equipment:'+target.itemId].catalog);
    assert.equal(target.requiredEvidenceRole,'row');assert.equal(target.requiredRegionIds.length,1);
    const region=catalog.regions.find(r=>r.id===target.requiredRegionIds[0]);
    assert.equal(region.sha256,target.requiredTableImageSha256);
    assert.equal(citationRegionRole(region),'declared-row');
  }
});
