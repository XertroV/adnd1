// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import assert from 'node:assert/strict';
import {execFileSync} from '../research/class-mapping-history-v1/mm-replay-child-process-v1.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import {readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort} from './helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {assertUaSourceContextBindingCohort} from './helpers/ua-source-closed-v28-context.mjs';
import {
  assertPass8Dmg225FieldTargetProof,
  assertPass8Dmg225TargetUniverse,
  sourceVisualRegionHashes,
} from '../research/class-mapping-history-v1/replay-tools/price-source-inventory.mjs';

const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`
  :value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    :JSON.stringify(value);
const hashCanonical=value=>hash(Buffer.from(canonical(value)));
const pointer=(item,path)=>path.slice(1).split('/').map(part=>part.replaceAll('~1','/').replaceAll('~0','~')).reduce((value,part)=>value?.[part],item);
const gitJson=path=>JSON.parse(execFileSync('git',['show',`a46eddc41ac6f712d5ad1498195df6a49810aae1:${path}`],{encoding:'utf8',maxBuffer:16*1024*1024}));
const baselineCommit='a46eddc41ac6f712d5ad1498195df6a49810aae1';
const beforeFixtureBytes=readFileSync(new URL('../tests/fixtures/pass8-dmg225-before-targets-a46-v1.json.gz',import.meta.url));
const beforeFixture=JSON.parse(gunzipSync(beforeFixtureBytes).toString('utf8'));
const proposal=read('research/source-audit-pass8-dmg225-field-mapping-author-proposal.json');
const fieldReview=read('research/source-audit-pass8-dmg225-field-mapping-independent-review.json');
const bindingsFile=read('research/field-evidence-bindings.json');
const currentBindings=bindingsFile.bindings.slice(728,757);
const publishedJson=path=>JSON.parse(execFileSync('git',['show',`cc9509047746d5e27a71cb5b1e0cfcb739a688c9:${path}`],{maxBuffer:32*1024*1024}));
const equipmentFile=read('equipment.json');
const sourceReviews=read('research/source-visual-reviews.json');
const continuations=read('research/citation-continuations.json');
// The two historical suffix assertions below receive only complete V27 objects
// through the already approved closed UA boundary. Live guard inputs stay raw.
const weaponSourceCommit='9ee2550e9793e6aae9a7ac8fd71525704894950f';
const weaponSourceFile=path=>execFileSync('git',['show',`${weaponSourceCommit}:${path}`],{maxBuffer:32*1024*1024});
const weaponContinuations=JSON.parse(weaponSourceFile('research/citation-continuations.json'));
const weaponSourceReviews=JSON.parse(weaponSourceFile('research/source-visual-reviews.json'));
const manualsBefore=gitJson('research/field-evidence-bindings.json');
const visualReviewsBefore=gitJson('research/source-visual-reviews.json');
const continuationsBefore=gitJson('research/citation-continuations.json');
const catalogCache=new Map();
function catalog(path){if(!catalogCache.has(path))catalogCache.set(path,read(`dist/${path}`));return catalogCache.get(path);}
function targetContext(binding,item=equipmentFile.equipment.find(entry=>entry.id===binding.itemId)){
  const itemTarget=pointer(item,binding.fieldPointer);
  return {
    item,target:itemTarget,sourceObject:pointer(item,binding.sourceObjectPointer),sourceOwner:binding.sourceOwner,
    sourceObjectPointer:binding.sourceObjectPointer,catalog:catalog(binding.catalog),authoredOwner:item,
  };
}
function pageOrder(catalog){
  const ordered=catalog.regions.filter(region=>region.book==='DMG'&&region.printedPage===225).sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
  const evidence=ordered.map(region=>({id:region.id,role:region.role||null,imageSha256:region.sha256,...sourceVisualRegionHashes(region)}));
  return {ids:ordered.map(region=>region.id),defaultId:ordered[0]?.id??null,sha256:hashCanonical(evidence),evidence};
}

test('A46 before fixture retains all29 empty-region targets and the explicit historical weapon state',()=>{
  assert.equal(hash(beforeFixtureBytes),'7af6ae98d17809a939a3e386c1f830a2697d06bc8313c184b1a3dbc37c604897');
  assert.equal(beforeFixture.inputCommit,baselineCommit);
  assert.equal(beforeFixture.beforeCounts.targets,29);
  assert.equal(beforeFixture.beforeCounts.emptyRegionTargets,29);
  assert.equal(beforeFixture.beforeCounts.tableBackedFields,28);
  assert.equal(beforeFixture.beforeCounts.physicalTableRows,26);
  assert.equal(beforeFixture.beforeCounts.outsideTableExclusionProseFields,1);
  assert.equal(beforeFixture.targets.length,29);
  for(const target of beforeFixture.targets){
    assert.deepEqual(target.beforeBinding.regionIds,[]);
    assert.equal(target.beforeBinding.reviewStatus,'source-row-value-verified-region-pending');
    assert.equal(target.beforeBinding.sourceOwner.collection,target.collection);
    assert.equal(target.beforeBinding.sourceOwner.itemId,target.itemId);
  }
  const capturedEquipment=execFileSync('git',['show',`${baselineCommit}:equipment.json`],{maxBuffer:32*1024*1024});
  assert.equal(hash(capturedEquipment),beforeFixture.files['equipment.json'].sha256,'the original A46 equipment source remains exact in its captured Git stage');
  const capturedData=execFileSync('git',['show',`${baselineCommit}:dist/data.json`],{maxBuffer:32*1024*1024});
  assert.equal(hash(capturedData),beforeFixture.files['dist/data.json'].sha256,'the original unassembled A46 data remains exact in its captured Git stage');
  const historicalBytes=weaponSourceFile('dist/data.json');
  const weaponBytes=execFileSync('git',['show','9ee2550e9793e6aae9a7ac8fd71525704894950f:dist/data.json'],{maxBuffer:32*1024*1024});
  assert.equal(hash(historicalBytes),'6643d7b58c90d982244f1d8f03b6f03a7587446ba25c402be8f9a81a8b701f8f','closed UA history restores the complete actual merged V27 predecessor');
  assert.equal(hash(weaponBytes),'6643d7b58c90d982244f1d8f03b6f03a7587446ba25c402be8f9a81a8b701f8f','the literal weapon source state remains separate historical evidence');
  assert.ok(historicalBytes.equals(weaponBytes),'historical weapon raw bytes remain whole-file exact; no multi-megabyte mismatch diff');
});

test('four candidate catalogs are exact append-only edits; defaults and all historic region objects remain',()=>{
  const expected=new Map([
    ['phb-bullseye-lantern',['pass8-dmg225-fieldmap-row-phb-bullseye-lantern','batch5-dmg225-encumbrance-notes']],
    ['phb-silver-mirror',['pass8-dmg225-fieldmap-row-phb-silver-mirror','batch5-dmg225-encumbrance-notes']],
    ['phb-iron-spike',['pass8-dmg225-fieldmap-row-phb-iron-spike','batch5-dmg225-encumbrance-notes']],
    ['phb-thieves-tools',['pass8-dmg225-thieves-tools-exclusion-lead-in','pass8-dmg225-thieves-tools-exclusion-list-item']],
  ]);
  for(const [itemId,addedIds] of expected){
    const path=`scans/verified/equipment-${itemId}.json`;
    const before=gitJson(`dist/${path}`),after=catalog(path);
    assert.deepEqual({...after,regions:undefined},{...before,regions:undefined},`${itemId} catalog metadata changed`);
    assert.deepEqual(after.regions.slice(0,before.regions.length),before.regions,`${itemId} old region objects/order changed`);
    assert.deepEqual(after.regions.slice(before.regions.length).map(region=>region.id),addedIds);
    assert.equal(pageOrder(after).defaultId,pageOrder(before).defaultId,`${itemId} p.225 default ID changed`);
  }
  const originalGroups=continuationsBefore.groups;
  assert.equal(originalGroups.length,252);
  assert.equal(originalGroups.reduce((sum,group)=>sum+group.segments.length,0),494);
  assert.deepEqual(continuations.groups.slice(0,252),originalGroups,'old continuation groups or memberships changed');
  const phbGroups=JSON.parse(execFileSync('git',['show','4aa977788085f67a28a24d40965edf987bc7242b:research/citation-continuations.json'],{maxBuffer:32*1024*1024})).groups;
  assert.equal(phbGroups.length,253);
  assert.deepEqual(continuations.groups.slice(0,253),phbGroups,'the complete published PHB prefix remains exact');
  const publishedGroups=publishedJson('research/citation-continuations.json').groups;
  assert.equal(publishedGroups.length,260);
  assert.equal(publishedGroups.reduce((sum,group)=>sum+group.segments.length,0),510);
  assert.deepEqual(continuations.groups.slice(0,260),publishedGroups,'all260 published groups and510 exact source parts remain in order');
  assert.equal(weaponContinuations.groups.length,261);
  assert.equal(weaponContinuations.groups.reduce((sum,group)=>sum+group.segments.length,0),512);
  assert.deepEqual(weaponContinuations.groups.slice(260),[read('research/missile-table-discoverability/implementation-candidate/continuation-group-candidate.json')],'only the complete declared two-part DMG28 group is appended');
  assert.deepEqual(continuations.groups.slice(254,260).map(group=>group.id),['pass8-demi-shadow-magic-phb-99','pass8-veil-phb-99-100','pass8-dust-ua-45-46','pass8-vocalize-ua-54-55','pass8-ultravision-magic-user-ua-57-58','pass8-ultravision-illusionist-ua-57-58']);
  const group=continuations.groups[253];
  assert.equal(group.id,'pass8-dmg225-thieves-tools-exclusion-context');
  assert.equal(hashCanonical(group),'5ee81d2d555cacbb6400181daf1684fd9faa427869ea0e05fde97a9c0c377b13');
  assert.deepEqual(group.requiredRegionIds,['pass8-dmg225-thieves-tools-exclusion-lead-in','pass8-dmg225-thieves-tools-exclusion-list-item']);
});

test('all 29 exact owners and source pointers carry closed hash-bound location proofs only',()=>{
  assert.equal(currentBindings.length,29);
  assert.equal(manualsBefore.bindings.length,728);
  assert.deepEqual(bindingsFile.bindings.slice(0,728),manualsBefore.bindings,'old manual field bindings changed');
  const publishedBindings=publishedJson('research/field-evidence-bindings.json').bindings;
  const hCurrentManual=JSON.parse(execFileSync('git',['show','5c6a57386af372c7c0d89e342003a7edf68ca0dd:research/field-evidence-bindings.json'],{maxBuffer:32*1024*1024})).bindings;
  assert.equal(publishedBindings.length,757);assert.equal(hCurrentManual.length,1251);
  assert.deepEqual(bindingsFile.bindings.slice(0,hCurrentManual.length),hCurrentManual,'all1251 historical H manual bindings remain whole-object exact before the MM suffix');
  assert.equal(bindingsFile.bindings.length,hCurrentManual.length+42,'only the exact42 MM manual bindings extend the H-era total');
  assert.deepEqual(bindingsFile.bindings.slice(0,757),publishedBindings,'all757 published manual bindings remain whole-object exact and in order');
  const proposedPath='research/missile-table-discoverability/native-manual-declarations-cc950-v1/proposed-50-manual-bindings.json';
  const proposedBytes=readFileSync(new URL(proposedPath,root));
  assert.equal(hash(proposedBytes),'a20d3252a10cef22551648fe1be65714b5488c8f9285634301112879cf4ad081');
  assert.deepEqual(bindingsFile.bindings.slice(757,807),JSON.parse(proposedBytes).bindings,'the exact50 declared pending manual bindings remain in their original interval');
  assert.ok(bindingsFile.bindings.slice(757,807).every(binding=>binding.reviewStatus==='field-target-pending'&&binding.sourceValueStatus==='not-assessed-by-field-target-review'&&binding.valueReview===undefined),'the original50 declarations carry no field or source-value promotion');
  assert.equal(fieldReview.cases.length,29);
  const mapped=new Map(currentBindings.map(binding=>[[binding.collection,binding.itemId,binding.fieldPointer].join('|'),binding]));
  for(let index=0;index<29;index++){
    const mapping=proposal.mappings[index],reviewed=fieldReview.cases[index];
    const key=[mapping.owner.collection,mapping.owner.itemId,mapping.fieldPointer].join('|');
    const binding=mapped.get(key);
    assert.ok(binding,`missing exact target ${key}`);
    assert.equal(binding.sourceObjectPointer,mapping.sourceObjectPointer);
    assert.deepEqual(binding.sourceOwner,{collection:mapping.owner.collection,itemId:mapping.owner.itemId});
    assert.deepEqual(binding.sourceRowIds,mapping.sourceRows.map(row=>row.sourceUnitId));
    assert.deepEqual(binding.regionIds,index===28
      ?['pass8-dmg225-thieves-tools-exclusion-lead-in','pass8-dmg225-thieves-tools-exclusion-list-item']
      :reviewed.proposedFieldOrderedRegionIds);
    assert.equal(binding.reviewStatus,'field-target-reviewed');
    assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
    assert.equal(binding.valueReview,undefined);
    assert.equal(binding.expectedTargetProof.sourceValueGrade,'NOT_PROMOTED');
    assert.equal(binding.expectedTargetProof.browserRouting,'pending');
    assert.match(binding.expectedTargetProof.defaultAssessment,/not-approved/);
    assertPass8Dmg225FieldTargetProof(binding,targetContext(binding));
  }
  assert.equal(mapped.size,29);
  assert.deepEqual(sourceReviews.reviews.slice(0,visualReviewsBefore.reviews.length),visualReviewsBefore.reviews,'old component review history changed');
  const phbReviews=JSON.parse(execFileSync('git',['show','4aa977788085f67a28a24d40965edf987bc7242b:research/source-visual-reviews.json'],{maxBuffer:32*1024*1024})).reviews;
  assert.equal(phbReviews.length,1829);
  assert.deepEqual(sourceReviews.reviews.slice(0,1829),phbReviews,'all released PHB review records remain exact');
  const publishedReviews=publishedJson('research/source-visual-reviews.json').reviews;
  assert.equal(publishedReviews.length,1845);
  assert.deepEqual(sourceReviews.reviews.slice(0,1845),publishedReviews,'all1845 published review objects remain whole-object exact and in order');
  assert.equal(weaponSourceReviews.reviews.length,publishedReviews.length+4,'the separate historical weapon review suffix remains exactly four records');
  assert.equal(sourceReviews.reviews.slice(1829,1837).length,8);
  assert.ok(sourceReviews.reviews.slice(1829,1837).every(row=>row.collection==='equipment'&&['phb-bullseye-lantern','phb-silver-mirror','phb-iron-spike','phb-thieves-tools'].includes(row.itemId)));
  assert.deepEqual(sourceReviews.reviews.slice(1837,1845),read('research/source-audit-pass8-last-six-canonical-schema-successor-v1/proposed-eight-review-rows.json'),'eight independent crop rows remain separate from DMG location reviews');
  assert.deepEqual(weaponSourceReviews.reviews.slice(1845).map(row=>[row.collection,row.itemId,row.binding,row.regionId]),[
    ['rules','phb-hurled-weapons-and-missiles-table','sourceExcerpts','phb38-table-context'],
    ['rules','ua-hurled-weapons-and-missiles-table','sourceExcerpts','ua28-table-context'],
    ['rules','weapon-versus-armor-adjustments','sourceExcerpts','dmg-28-opening-8b67aa025e19eddd'],
    ['rules','weapon-versus-armor-adjustments','sourceExcerpts','dmg-28-c37135485e89a720'],
  ],'the only four added component reviews have their exact declared owner and region identities');
  for(const itemId of ['phb-bullseye-lantern','phb-silver-mirror','phb-iron-spike','phb-thieves-tools']){
    const path=`scans/verified/equipment-${itemId}.json`,cat=catalog(path);
    for(const region of cat.regions.filter(region=>region.id.startsWith('pass8-dmg225-')||region.id==='batch5-dmg225-encumbrance-notes')){
      const record=sourceReviews.reviews.find(r=>r.collection==='equipment'&&r.itemId===itemId&&r.binding==='sourceExcerpts'&&r.regionId===region.id);
      if(!record)continue;
      assert.equal(record.sourceSha256,cat.sources.DMG.sha256);
      assert.equal(record.imageSha256,region.sha256);
      assert.equal(record.focusSha256,sourceVisualRegionHashes(region).focusSha256);
      assert.equal(record.contentSha256,sourceVisualRegionHashes(region).contentSha256);
      assert.equal(record.assessments.default,undefined,'component review was incorrectly transferred to a page default');
    }
  }
  const lead=readFileSync(new URL('../dist/scans/verified/dmg-225-03c363a115c57487.png',import.meta.url));
  assert.equal(hash(lead),'03c363a115c57487bbacb06f75ab094dec5bbcfabfc6639c998ec46dcb8c1404');
});

test('the exact target proof rejects borrowed, stale-value, owner, pointer, region, and default-group changes',()=>{
  const binding=currentBindings.find(entry=>entry.itemId==='phb-light-crossbow');
  const context=targetContext(binding);
  const borrowed=structuredClone(binding);
  borrowed.expectedTargetProof=structuredClone(currentBindings.find(entry=>entry.itemId==='phb-heavy-crossbow').expectedTargetProof);
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(borrowed,targetContext(borrowed)),/target index changed/);

  const wrongSourceOwner=structuredClone(binding);wrongSourceOwner.sourceOwner.itemId='phb-heavy-crossbow';
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(wrongSourceOwner,targetContext(wrongSourceOwner)),/owner identity/);

  const wrongPointer=structuredClone(binding);wrongPointer.sourceObjectPointer='/price';
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(wrongPointer,targetContext(wrongPointer)),/pointer/);

  const changedItem=structuredClone(context.item);changedItem.fields['Encumbrance (DMG p.225)']='999 gp encumbrance';
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(binding,{...targetContext(binding,changedItem),authoredOwner:changedItem}),/owner snapshot|field value/);

  const staleEvidence=structuredClone(binding);staleEvidence.expectedTargetProof.expectedRegionEvidence[0].focusSha256='0'.repeat(64);
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(staleEvidence,targetContext(staleEvidence)),/expected-region evidence/);

  const targetCatalog=structuredClone(context.catalog);
  const rogue=structuredClone(targetCatalog.regions.find(region=>region.book==='DMG'&&region.printedPage===225));
  rogue.id='guard-negative-default-order';targetCatalog.regions.unshift(rogue);
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(binding,{...context,catalog:targetCatalog}),/repository-pinned catalog bytes/);

  const forgedCatalog=structuredClone(context.catalog);
  const invented=structuredClone(forgedCatalog.regions.find(region=>region.book==='DMG'&&region.printedPage===225));
  invented.id='invented-unreviewed-default-row';invented.role='row';forgedCatalog.regions.unshift(invented);
  const forgedBinding=structuredClone(binding),forgedOrder=pageOrder(forgedCatalog);
  Object.assign(forgedBinding.expectedTargetProof.pageGroupOrder,{
    orderedRegionIds:forgedOrder.ids,defaultRegionId:forgedOrder.defaultId,
    defaultOrderSha256:forgedOrder.sha256,orderedEvidence:forgedOrder.evidence,
  });
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(forgedBinding,{...context,catalog:forgedCatalog}),/repository-pinned catalog bytes/);

  const hiddenRow=structuredClone(binding);
  hiddenRow.sourceRowIds=[undefined];
  hiddenRow.expectedTargetProof.sourceRowIds=[undefined];
  hiddenRow.expectedTargetProof.orderedContext.sourceRowIds=[undefined];
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(hiddenRow,targetContext(hiddenRow)),/non-JSON data/);

  const forgedReviewPath=structuredClone(binding);
  forgedReviewPath.expectedTargetProof.reviewEvidence[0].path='../../tmp/dmg225-invented-source-approval.json';
  assert.throws(()=>assertPass8Dmg225FieldTargetProof(forgedReviewPath,{...targetContext(forgedReviewPath),repoRoot:'/tmp'}),/fixed current-root allowlist/);

  const omitted=currentBindings.filter(entry=>entry.itemId!=='phb-light-crossbow');
  assert.throws(()=>assertPass8Dmg225TargetUniverse(omitted),/expected exactly 29 current DMG p.225 equipment-field bindings/);
  const proofless=currentBindings.map(entry=>entry.itemId==='phb-light-crossbow'?{...entry,expectedTargetProof:undefined}:entry);
  assert.throws(()=>assertPass8Dmg225TargetUniverse(proofless),/non-JSON data/);

  const extra={...structuredClone(currentBindings[0]),itemId:'invented-equipment',fieldPointer:'/fields/Invented DMG p.225 field',sourceObjectPointer:'/fieldSources/Invented DMG p.225 field'};
  assert.throws(()=>assertPass8Dmg225TargetUniverse([...currentBindings,extra]),/expected exactly 29 current DMG p.225 equipment-field bindings/);
});

// Separate actual-current assertions: these do not receive historical objects.
test('current UA owners, current metadata prefixes and all29 DMG225 target proofs remain native',()=>{
  const currentInputs=readMmTreasureCurrentSourceInputs(fileURLToPath(root));
  const currentCohortSummary=assertMmTreasureCurrentSourceCohort(currentInputs);
  assert.equal(currentCohortSummary.addedManualBindings,42,'the exact MM cohort remains a42-binding append');
  const current=currentInputs.data;
  assert.equal(assertUaSourceContextBindingCohort(currentInputs.inventory.fieldEvidenceBindings).length,24,'the prior UA class-context cohort remains exact within the native current source');
  assert.equal(sourceReviews.reviews.length,1882);
  assert.deepEqual(sourceReviews.reviews.slice(0,1849),weaponSourceReviews.reviews,'all1849 historical weapon review objects remain exact in the actual1882-review ledger');
  assert.equal(continuations.groups.length,284);
  assert.equal(continuations.groups.reduce((sum,group)=>sum+group.segments.length,0),560);
  assert.deepEqual(continuations.groups.slice(0,261),weaponContinuations.groups,'all261 historical weapon continuation objects remain exact in the actual284-group manifest');
  assertPass8Dmg225TargetUniverse(bindingsFile.bindings);
  const canonical=read('research/price-source-inventory.json');
  assert.equal(canonical.fieldEvidenceBindings.length,currentCohortSummary.canonicalBindings);
  assertPass8Dmg225TargetUniverse(canonical.fieldEvidenceBindings);
  for(const binding of currentBindings){
    const matches=canonical.fieldEvidenceBindings.filter(row=>row.collection===binding.collection&&row.itemId===binding.itemId&&row.fieldPointer===binding.fieldPointer);
    assert.equal(matches.length,1);
    assertPass8Dmg225FieldTargetProof(matches[0],targetContext(matches[0]));
  }
});
