import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {containsContext,focusCoversEvidence,reportContextContracts} from '../tools/citation-context-contract.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read('research/citation-context-contracts.json'),data=read('dist/data.json');
test('current reviewed price tables retain their independently recorded context extent',()=>{
  const report=reportContextContracts(data,p=>read('dist/'+p),manifest);
  const historical=JSON.parse(execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:research/citation-context-contracts.json'],{encoding:'utf8'}));
  assert.equal(historical.requirements.length,35,'frozen 679 contract denominator');
  const beforeUa10=JSON.parse(gunzipSync(readFileSync('tests/fixtures/ua10-ledger-triage-manifest-before.json.gz')));
  const reviewedPrefix=JSON.parse(beforeUa10.files['research/citation-context-contracts.json'].utf8).requirements;
  const ua10Integration=read('research/source-audit-batch5-ua10-crop-integration.json');
  assert.equal(reviewedPrefix.length,175,'preserved contract denominator before the seven UA10 passage contracts');
  assert.deepEqual(manifest.requirements.slice(0,reviewedPrefix.length),reviewedPrefix);
  assert.equal(manifest.requirements.length,reviewedPrefix.length+ua10Integration.updates.length);
  assert.equal(report.total,manifest.requirements.length);
  for(const requirement of historical.requirements){
    const current=manifest.requirements.find(candidate=>candidate.id===requirement.id);
    assert.ok(current,`${requirement.id} remains in the current contract set`);
    assert.deepEqual(current,requirement,`${requirement.id} remains byte-for-byte equivalent to the frozen contract`);
  }
  assert.deepEqual(report.violations,[]);
});
test('the six calibrated weapon tables retain their exact reviewed source extents',()=>{
  const calibration=read('research/geometry-focus-calibration.json');
  const crops=new Map(calibration.contextCrops.map(crop=>[crop.id,crop]));
  const expected=[
    ['equipment:phb-arrow:phb35-arms-price-context','phb-arrow','phb-arrow-phb35-1','phb35-arms-complete'],
    ['equipment:phb-arrow:phb37-weight-damage-context','phb-arrow','phb-arrow-phb37-3','phb37-weight-damage'],
    ['equipment:phb-long-sword:phb38-general-data-context','phb-long-sword','phb-38-779f5d713364297a','phb38-general-data'],
    ['equipment:ua-aklys-hurled:ua26-purchase-price-context','ua-aklys-hurled','ua-equipment-price-table','ua26-equipment-price'],
    ['equipment:ua-aklys-hurled:ua26-weight-damage-context','ua-aklys-hurled','ua-26-92697cf6b5d2d5ec','ua26-weight-damage'],
    ['equipment:phb-long-sword:ua27-general-data-context','phb-long-sword','ua-27-fe40d4e1625a88fc','ua27-general-data'],
  ];
  for(const [id,itemId,regionId,cropId] of expected){
    const requirement=manifest.requirements.find(record=>record.id===id);assert.ok(requirement,id);
    assert.equal(requirement.itemId,itemId,id);assert.equal(requirement.regionId,regionId,id);
    const crop=crops.get(cropId);assert.ok(crop,cropId);
    const [x0,y0,x1,y1]=crop.effectiveBoundsPoints,[pageW,pageH]=crop.pageSizePoints;
    const expectedBounds=[x0/pageW,y0/pageH,(x1-x0)/pageW,(y1-y0)/pageH];
    requirement.requiredBounds.values.forEach((value,index)=>assert.ok(Math.abs(value-expectedBounds[index])<1e-12,`${id} bound ${index}`));
    const catalog=read(`dist/${requirement.catalog}`),region=catalog.regions.find(candidate=>candidate.id===regionId);assert.ok(region,id);
    const actual=region.normalizedPageRect;
    assert.ok(actual && typeof actual==='object' && !Array.isArray(actual),`${id} source crop is explicitly page-normalized`);
    assert.deepEqual([actual.x,actual.y,actual.width,actual.height],requirement.requiredBounds.values,id);
    assert.equal(catalog.sources[requirement.book].sha256,requirement.sourceSha256,id);
  }
});
test('historical narrow rows fail the complete table context contract',()=>{
  const fixture=read('tests/fixtures/equipment-source-first-fulltable.json');
  for (const row of fixture.records) {
    const required=manifest.requirements.find(r=>r.itemId===row.id).requiredBounds.values;
    assert.equal(containsContext(row.old.normalizedPageRect,required),false,row.id);
    assert.equal(containsContext(row.new.normalizedPageRect,required),true,row.id);
  }
});
test('context containment rejects clipping at each edge and uses explicit coordinate conventions',()=>{
  const required=[.2,.3,.5,.4];
  assert.equal(containsContext([.1,.2,.7,.6],required),true);
  assert.equal(containsContext([[.1,.2,.7,.6]],required),true);
  for(const crop of [[.21,.3,.49,.4],[.2,.31,.5,.39],[.2,.3,.49,.4],[.2,.3,.5,.39]])assert.equal(containsContext(crop,required),false);
  assert.equal(containsContext([0,0,1,1],[.5,.5,NaN,.2]),false);
  const changed=structuredClone(manifest);changed.requirements[0].requiredBounds.format='x0y0x1y1';
  assert.throws(()=>reportContextContracts(data,p=>read('dist/'+p),changed),/coordinate space/);
});
test('source and region rebinding cannot inherit a context contract pass',()=>{
  const altered=structuredClone(data),first=manifest.requirements[0];
  altered.equipment.find(x=>x.id===first.itemId).sourceExcerpts.catalog='other.json';
  const result=reportContextContracts(altered,p=>read('dist/'+p),{...manifest,requirements:[first]});
  assert.equal(result.violations.length,1);assert.equal(result.checks[0].status,'unavailable');
  const changed=reportContextContracts(data,p=>{const c=read('dist/'+p);c.sources.PHB.sha256='changed';return c;},{...manifest,requirements:[first]});
  assert.equal(changed.violations.length,1);
});
test('singleton progression context uses its synthetic owner and nested source rectangle',()=>{
  const required={...manifest.requirements[0],id:'progression-context',collection:'progressionExplainer',itemId:'progression-explainer',fieldPointer:'/sections/0'};
  const singleton={progressionExplainer:{sections:['Progression passage'],sourceExcerpts:{catalog:required.catalog}}};
  const catalog={sources:{[required.book]:{sha256:required.sourceSha256}},regions:[{id:required.regionId,book:required.book,printedPage:required.printedPage,normalizedPageRect:[required.requiredBounds.values]}]};
  assert.deepEqual(reportContextContracts(singleton,()=>catalog,{requirements:[required]}).violations,[]);
});
test('focus coverage includes separately annotated qualifiers and does not assess semantic precision',()=>{
  const crop=[.1,.2,.6,.5],row=[.12,.21,.2,.04],note=[.45,.5,.1,.03];
  assert.equal(focusCoversEvidence(crop,[[0,0,.5,.2]],[row,note]),false);
  assert.equal(focusCoversEvidence(crop,[[0,0,.5,.2],[.55,.55,.25,.2]],[row,note]),true);
  // This function asks only whether evidence is covered. Sentinel review is separate.
  assert.equal(focusCoversEvidence(crop,[[0,0,1,1]],[row,note]),true);
  assert.equal(focusCoversEvidence(crop,[],[row]),false);
});
