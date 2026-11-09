import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import test,{after} from 'node:test';
import {buildPriceSourceInventory,sourceVisualRegionHashes,validatePriceSourceInventoryDiagnostic as validateDiagnosticPriceSourceInventory} from '../tools/price-source-inventory.mjs';

const root=resolve(import.meta.dirname,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const beforeFixturePath='tests/fixtures/price-source-inventory-class-xp-target-identity-before.json.gz';
const beforeFixtureSha256='ee9d7c047cf890fa5bdb5e01560a005c3aacdfc8800d7314760f266257b66f87';
const before=JSON.parse(gunzipSync(readFileSync(resolve(root,beforeFixturePath))).toString('utf8'));
const proofRewriteBeforePath='tests/fixtures/price-source-inventory-xp-target-proof-rewrite-before.json.gz';
const proofRewriteBeforeSha256='d0a39afef10100b720ff3042bba4fb9395b53e80d66bdd17612a8dcb9afab6dd';
const proofRewriteBefore=JSON.parse(gunzipSync(readFileSync(resolve(root,proofRewriteBeforePath))).toString('utf8'));
const proofPath=`research/.batch6-class-xp-target-review-test-${process.pid}.json`;
after(()=>{if(existsSync(resolve(root,proofPath)))rmSync(resolve(root,proofPath));});

function catalogMap(){
  const catalogs=new Map();
  const scan=(directory,prefix='scans')=>{
    for(const entry of readdirSync(resolve(root,directory),{withFileTypes:true})){
      const file=`${directory}/${entry.name}`;
      if(entry.isDirectory())scan(file,`${prefix}/${entry.name}`);
      else if(entry.isFile()&&entry.name.endsWith('.json'))catalogs.set(`${prefix}/${entry.name}`,json(file));
    }
  };
  scan('dist/scans');
  return catalogs;
}

function makeFixture(){
  const data=json('dist/data.json');
  const bard=data.classes.find(item=>item.id==='bard');
  assert.ok(bard);
  assert.deepEqual(bard.xpRows[0]&&{
    level:bard.xpRows[0].level,xp:bard.xpRows[0].xp,book:bard.xpRows[0].book,pages:bard.xpRows[0].pages,track:bard.xpRows[0].track,
  },{level:1,xp:0,book:'PHB',pages:[117],track:'main'});

  const proposalPath='research/source-audit-batch6-bard-xp-source-target-proposal.json';
  const proposal=json(proposalPath);
  const proposalBytes=readFileSync(resolve(root,proposalPath));
  assert.equal(sha(proposalBytes),'0992f434871d30a7e6769f0b068d657715a804da4f0360e84cd2069c201b2b6e');
  const independentPath='research/source-audit-batch6-bard-xp-independent-review.json';
  const independent=json(independentPath);
  const independentBytes=readFileSync(resolve(root,independentPath));
  assert.equal(sha(independentBytes),'9da72af51691c31d982b4c654557216a8f23a58942ff7da72de1fd5852f2b1ba');
  assert.equal(independent.proposalSha256,sha(proposalBytes));
  assert.equal(independent.sourcePdf.sha256,'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095');
  assert.equal(independent.review.all23LabelsAndIntervalsMatchOriginal,true);
  assert.equal(independent.review.sourceValueGrade,'NOT PROMOTED');
  const sourceRow=independent.rows.find(row=>row.fieldPointer==='/xpRows/0');
  assert.ok(sourceRow?.fieldTargetValuesMatchCurrentData);
  const proposalRow=proposal.rows.find(row=>row.fieldPointer==='/xpRows/0');
  assert.deepEqual({level:proposalRow.currentSemanticValue.level,xp:proposalRow.currentSemanticValue.xp,book:proposalRow.currentSemanticValue.book,pages:proposalRow.currentSemanticValue.pages,track:proposalRow.currentSemanticValue.track},{level:1,xp:0,book:'PHB',pages:[117],track:'main'});
  assert.deepEqual({level:sourceRow.currentLevel,xp:sourceRow.currentXpLowerBound,track:sourceRow.currentTrack},{level:1,xp:0,track:'main'});
  const candidate=proposalRow?.candidateRegion;
  assert.ok(candidate);
  assert.equal(candidate.id,'phb-117-bard-xp-level-01');

  const catalogPath=bard.sourceExcerpts.catalog;
  const catalogs=catalogMap();
  const catalog=structuredClone(catalogs.get(catalogPath));
  assert.ok(catalog);
  const productionCandidate=catalog.regions.find(region=>region.id===candidate.id);
  if(productionCandidate){
    const currentIdentity=structuredClone(productionCandidate),proposedIdentity=structuredClone(candidate);
    delete currentIdentity.verification;delete proposedIdentity.verification;
    assert.deepEqual(currentIdentity,proposedIdentity,'the live catalog candidate matches the reviewed row target');
    assert.equal(productionCandidate.verification,'visually-checked-crop');
  }
  // Keep this guard fixture isolated from the production catalog whether the
  // real candidate has already been applied or not.
  catalog.regions=catalog.regions.filter(region=>region.id!==candidate.id);
  assert.equal(catalog.regions.some(region=>region.id===candidate.id),false,'the private fixture starts without the target region');
  catalog.regions.push(structuredClone(candidate));
  catalogs.set(catalogPath,catalog);

  const value={level:1,xp:0,book:'PHB',pages:[117],track:'main'};
  const expectedTargetIdentity={kind:'class-xp-row',collection:'classes',itemId:'bard',fieldPointer:'/xpRows/0',sourceObjectPointer:'/xpRows/0',value};
  const evidenceSha256=sha(independentBytes);
  const proposalRowIndex=proposal.rows.indexOf(proposalRow);
  const independentRowIndex=independent.rows.indexOf(sourceRow);
  const expectedRegionEvidence=[{regionId:candidate.id,sourceSha256:catalog.sources.PHB.sha256,imageSha256:candidate.sha256,...sourceVisualRegionHashes(candidate)}];
  const proof={schemaVersion:1,artifactType:'class-xp-row-target-review',reviewedTargets:[{
    expectedTargetIdentity,
    status:'confirmed',independent:true,
    sourceEvidence:[
      {path:proposalPath,sha256:sha(proposalBytes),pointer:`/rows/${proposalRowIndex}`},
      {path:independentPath,sha256:evidenceSha256,pointer:`/rows/${independentRowIndex}`},
    ],
    regionEvidence:expectedRegionEvidence,
    sourceValueGrade:'NOT PROMOTED',
  }]};
  const proofBytes=Buffer.from(`${JSON.stringify(proof,null,2)}\n`);
  writeFileSync(resolve(root,proofPath),proofBytes);
  const manualBindings={bindings:[{
    collection:'classes',itemId:'bard',fieldPointer:'/xpRows/0',sourceObjectPointer:'/xpRows/0',
    sourceOwner:{collection:'classes',itemId:'bard'},sourceObject:'Bard level 1 XP row',sourceCategory:'class-xp-row',
    book:'PHB',printedPage:117,pdfPage:118,catalog:catalogPath,regionIds:[candidate.id],requiresRowEvidence:true,
    reviewStatus:'field-target-reviewed',contextStatus:'context-not-assessed',
    targetReview:{status:'confirmed',independent:true,evidence:proofPath,evidenceSha256:sha(proofBytes),expectedTargetIdentity},
    expectedRegionEvidence,
  }]};
  return {data,catalogs,catalogPath,candidate,manualBindings,expectedTargetIdentity};
}

function buildReviewed({data,catalogs,manualBindings}){
  return buildPriceSourceInventory({data,manualBindings,catalogs});
}

test('historical synthetic XP identity baseline preserves the old false accepts without claiming a production defect',()=>{
  const fixtureBytes=readFileSync(resolve(root,beforeFixturePath));
  assert.equal(sha(fixtureBytes),beforeFixtureSha256);
  assert.equal(before.artifactType,'batch6-class-xp-target-identity-before');
  assert.equal(before.classification,'synthetic future guard demonstration only; not a production defect finding');
  assert.equal(before.codePathGitRef,'ae5195a2efe56f25fe9903f788a3c4c98b4e2064:tools/price-source-inventory.mjs');
  assert.equal(sha(Buffer.from(before.moduleSource,'utf8')),before.moduleSha256);
  assert.equal(before.moduleSha256,'96abb14ce2b640b784753b58c8706a1817b8e10ee8cc93999d18c4acfb0bb0c2');
  assert.equal(before.currentLiveClassXpInventory.total,206);
  assert.equal(before.currentLiveClassXpInventory.reviewed,0);
  assert.equal(before.currentLiveClassXpInventory.pending,206);
  assert.equal(before.currentLiveClassXpInventory.fieldPointers.length,206);
  assert.deepEqual(before.syntheticScenarios.map(scenario=>scenario.mutation),[{}, {level:2}, {xp:1}, {track:'alternate'}]);
  for(const scenario of before.syntheticScenarios){
    assert.equal(scenario.build,'accepted');
    assert.equal(scenario.validate,'accepted');
    assert.deepEqual(scenario.bindingPointers,{fieldPointer:'/xpRows/0',sourceObjectPointer:'/xpRows/0',sourceOwner:{collection:'classes',itemId:'bard'}});
    assert.deepEqual(scenario.regionIds,['phb-117-bard-xp-level-01']);
  }
  assert.equal(before.independentProofClaims.sourceValueGrade,'NOT PROMOTED');
});

test('captured proof-rewrite baseline reproduces the coordinated stale-proof acceptance before the V2 fix',()=>{
  assert.equal(sha(readFileSync(resolve(root,proofRewriteBeforePath))),proofRewriteBeforeSha256);
  assert.equal(proofRewriteBefore.artifactType,'batch6-xp-target-proof-rewrite-before');
  assert.equal(proofRewriteBefore.baseline.toolSha256,'ed9f93cdd12b9994950964b53f454b535ed4105681a15bf82727f196df928466');
  assert.equal(proofRewriteBefore.baseline.independentProof.sha256,'9da72af51691c31d982b4c654557216a8f23a58942ff7da72de1fd5852f2b1ba');
  assert.equal(proofRewriteBefore.baseline.independentProof.reviewTrack,'main');
  assert.equal(proofRewriteBefore.mutation.before,'main');
  assert.equal(proofRewriteBefore.mutation.after,'alternate');
  assert.equal(proofRewriteBefore.mutation.proofBytesChanged,false);
  assert.equal(proofRewriteBefore.baselineOutcome.builder,'accepted');
  assert.equal(proofRewriteBefore.baselineOutcome.serializedValidator,'accepted');
  assert.equal(proofRewriteBefore.baselineOutcome.sourceValueStatus,'not-assessed-by-field-target-review');
});

test('reviewed class XP targets bind the exact current row identity in both builder and serialized inventory validation',()=>{
  const fixture=makeFixture();
  const data=structuredClone(fixture.data);
  const inventory=buildReviewed({...fixture,data});
  validateDiagnosticPriceSourceInventory(inventory,{data,catalogs:fixture.catalogs});
  const binding=inventory.fieldEvidenceBindings.find(candidate=>candidate.collection==='classes'&&candidate.itemId==='bard'&&candidate.fieldPointer==='/xpRows/0');
  assert.ok(binding);
  assert.equal(binding.reviewStatus,'field-target-reviewed');
  assert.equal(binding.requiresRowEvidence,true);
  assert.deepEqual(binding.targetReview.expectedTargetIdentity,fixture.expectedTargetIdentity);
  assert.deepEqual(binding.sourceOwner,{collection:'classes',itemId:'bard'});
  assert.equal(binding.sourceObjectPointer,'/xpRows/0');
  assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review','row identity review does not promote source-value grade');

  for(const mutation of [{level:2},{xp:1},{track:'alternate'}]){
    const staleData=structuredClone(fixture.data);
    Object.assign(staleData.classes.find(item=>item.id==='bard').xpRows[0],mutation);
    assert.throws(()=>buildReviewed({...fixture,data:staleData}),/expectedTargetIdentity does not exactly match/);
    assert.throws(()=>validateDiagnosticPriceSourceInventory(inventory,{data:staleData,catalogs:fixture.catalogs}),/expectedTargetIdentity does not exactly match/);
  }

  const coordinatedData=structuredClone(fixture.data);
  coordinatedData.classes.find(item=>item.id==='bard').xpRows[0].track='alternate';
  const coordinatedBindings=structuredClone(fixture.manualBindings);
  coordinatedBindings.bindings[0].targetReview.expectedTargetIdentity.value.track='alternate';
  assert.throws(()=>buildReviewed({...fixture,data:coordinatedData,manualBindings:coordinatedBindings}),/does not exactly match the hash-pinned review proof target identity/,
    'rewriting current data and the mutable binding snapshot together cannot reuse the old hash-pinned proof');
  const coordinatedInventory=structuredClone(inventory);
  coordinatedInventory.fieldEvidenceBindings.find(candidate=>candidate.itemId==='bard'&&candidate.fieldPointer==='/xpRows/0').targetReview.expectedTargetIdentity.value.track='alternate';
  assert.throws(()=>validateDiagnosticPriceSourceInventory(coordinatedInventory,{data:coordinatedData,catalogs:fixture.catalogs}),/does not exactly match the hash-pinned review proof target identity/);

  const wrongOwnerManual=structuredClone(fixture.manualBindings);
  wrongOwnerManual.bindings[0].sourceOwner.itemId='fighter';
  wrongOwnerManual.bindings[0].catalog='scans/verified/classes-fighter.json';
  assert.throws(()=>buildReviewed({...fixture,manualBindings:wrongOwnerManual}),/sourceOwner must exactly identify the routed classes item/);
  const wrongOwnerInventory=structuredClone(inventory);
  const wrongOwnerBinding=wrongOwnerInventory.fieldEvidenceBindings.find(candidate=>candidate.itemId==='bard'&&candidate.fieldPointer==='/xpRows/0');
  wrongOwnerBinding.sourceOwner.itemId='fighter';
  wrongOwnerBinding.catalog='scans/verified/classes-fighter.json';
  assert.throws(()=>validateDiagnosticPriceSourceInventory(wrongOwnerInventory,{data,catalogs:fixture.catalogs}),/sourceOwner must exactly identify the routed classes item/);

  const wrongPointerManual=structuredClone(fixture.manualBindings);
  wrongPointerManual.bindings[0].sourceObjectPointer='/xpRows/1';
  assert.throws(()=>buildReviewed({...fixture,manualBindings:wrongPointerManual}),/sourceObjectPointer must equal fieldPointer/);
  const wrongPointerInventory=structuredClone(inventory);
  const wrongPointerBinding=wrongPointerInventory.fieldEvidenceBindings.find(candidate=>candidate.itemId==='bard'&&candidate.fieldPointer==='/xpRows/0');
  wrongPointerBinding.fieldPointer='/xpRows/1';
  assert.throws(()=>validateDiagnosticPriceSourceInventory(wrongPointerInventory,{data,catalogs:fixture.catalogs}),/sourceObjectPointer must equal fieldPointer/);

  const missingIdentityManual=structuredClone(fixture.manualBindings);
  delete missingIdentityManual.bindings[0].targetReview.expectedTargetIdentity;
  assert.throws(()=>buildReviewed({...fixture,manualBindings:missingIdentityManual}),/expectedTargetIdentity/);
  const missingIdentityInventory=structuredClone(inventory);
  delete missingIdentityInventory.fieldEvidenceBindings.find(candidate=>candidate.itemId==='bard'&&candidate.fieldPointer==='/xpRows/0').targetReview.expectedTargetIdentity;
  assert.throws(()=>validateDiagnosticPriceSourceInventory(missingIdentityInventory,{data,catalogs:fixture.catalogs}),/expectedTargetIdentity/);

  const wrongCategoryManual=structuredClone(fixture.manualBindings);
  wrongCategoryManual.bindings[0].sourceCategory='record-reference';
  assert.throws(()=>buildReviewed({...fixture,manualBindings:wrongCategoryManual}),/sourceCategory must be class-xp-row/);
  const missingRowEvidenceManual=structuredClone(fixture.manualBindings);
  missingRowEvidenceManual.bindings[0].requiresRowEvidence=false;
  assert.throws(()=>buildReviewed({...fixture,manualBindings:missingRowEvidenceManual}),/requiresRowEvidence must be true/);
  const nestedXpPointerInventory=structuredClone(inventory);
  const nestedXpBinding=nestedXpPointerInventory.fieldEvidenceBindings.find(candidate=>candidate.itemId==='bard'&&candidate.fieldPointer==='/xpRows/0');
  nestedXpBinding.fieldPointer='/xpRows/0/xp';
  assert.throws(()=>validateDiagnosticPriceSourceInventory(nestedXpPointerInventory,{data,catalogs:fixture.catalogs}),/fieldPointer must identify exactly one/);
});

test('class XP target proof is closed, hash-bound, and joins source pointers and region evidence',()=>{
  const fixture=makeFixture();
  const inventory=buildReviewed(fixture);
  validateDiagnosticPriceSourceInventory(inventory,{data:fixture.data,catalogs:fixture.catalogs});
  const binding=inventory.fieldEvidenceBindings.find(candidate=>candidate.itemId==='bard'&&candidate.fieldPointer==='/xpRows/0');
  const originalBytes=readFileSync(resolve(root,proofPath));
  const proof=JSON.parse(originalBytes);
  const rewrite=(mutate)=>{
    const changed=structuredClone(proof);
    mutate(changed.reviewedTargets[0]);
    const bytes=Buffer.from(`${JSON.stringify(changed,null,2)}\n`);
    writeFileSync(resolve(root,proofPath),bytes);
    const forged=structuredClone(inventory);
    forged.fieldEvidenceBindings.find(candidate=>candidate.itemId==='bard'&&candidate.fieldPointer==='/xpRows/0').targetReview.evidenceSha256=sha(bytes);
    return forged;
  };
  try{
    const wrongSourcePointer=rewrite(target=>{target.sourceEvidence[0].pointer='/rows/999';});
    assert.throws(()=>validateDiagnosticPriceSourceInventory(wrongSourcePointer,{data:fixture.data,catalogs:fixture.catalogs}),/source evidence pointer does not resolve/);
    const staleSourceDigest=rewrite(target=>{target.sourceEvidence[0].sha256='0'.repeat(64);});
    assert.throws(()=>validateDiagnosticPriceSourceInventory(staleSourceDigest,{data:fixture.data,catalogs:fixture.catalogs}),/source evidence digest is stale/);
    const singleSource=rewrite(target=>{target.sourceEvidence=target.sourceEvidence.slice(0,1);});
    assert.throws(()=>validateDiagnosticPriceSourceInventory(singleSource,{data:fixture.data,catalogs:fixture.catalogs}),/author and independent-review source evidence/);
    const wrongRegion=rewrite(target=>{target.regionEvidence[0].focusSha256='0'.repeat(64);});
    assert.throws(()=>validateDiagnosticPriceSourceInventory(wrongRegion,{data:fixture.data,catalogs:fixture.catalogs}),/region source\/image\/focus\/content hashes do not exactly match/);
    const promoted=rewrite(target=>{target.sourceValueGrade='CONFIRMED';});
    assert.throws(()=>validateDiagnosticPriceSourceInventory(promoted,{data:fixture.data,catalogs:fixture.catalogs}),/sourceValueGrade NOT PROMOTED/);
    const unconfirmed=rewrite(target=>{target.status='pending';});
    assert.throws(()=>validateDiagnosticPriceSourceInventory(unconfirmed,{data:fixture.data,catalogs:fixture.catalogs}),/independently confirm/);
    const openEntry=rewrite(target=>{target.unreviewedField='not allowed';});
    assert.throws(()=>validateDiagnosticPriceSourceInventory(openEntry,{data:fixture.data,catalogs:fixture.catalogs}),/unsupported or open target entry/);
  }finally{
    writeFileSync(resolve(root,proofPath),originalBytes);
  }
});
