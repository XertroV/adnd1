// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from '../research/class-mapping-history-v1/mm-replay-child-process-v1.mjs';
import {fileURLToPath} from 'node:url';
import {projectPass8PhbSourceBytes,projectPass8PhbSourceJson} from './helpers/pass8-ua-source-history.mjs';
import {assertReviewedClassXpContinuationTarget} from '../research/class-mapping-history-v1/replay-tools/class-xp-continuation-target-review.mjs';
import {readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort} from './helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {readVersion29HistoricalSourceInputs} from './helpers/version29-native-source-context.mjs';
import {assertUaSourceContextBindingCohort as assertClosedV28UaSourceContextBindingCohort} from './helpers/ua-source-closed-v28-context.mjs';

function assertExpectedHirelingsCurrentSourceSummary(summary){
  assert.deepEqual(summary,{sourceCommit:'0f2d70a135e3ad486152bf00f21387d60a1a97ef',sourceTree:'08010faf457df22cdb0a5ec35d2dcf79e622ade9',owners:1064,addedOwners:2,canonicalBindings:5731,retainedCanonicalBindings:5655,addedCanonicalBindings:76,manualBindings:1293,addedManualBindings:42,tableRows:26,tableCells:208,historicalMechanicsReviewRecords:1215,mechanicsOwnerRecords:1064,mechanicsFormalFields:14201,mechanicsUncheckedFields:899});
  assert.equal(summary.retainedCanonicalBindings-4931,724,'the exact H current cohort remains distinct from the MM append');
  assert.equal(summary.addedCanonicalBindings,76,'the MM cohort adds 76 canonical bindings');
  assert.equal(summary.addedManualBindings,42,'the MM cohort adds 42 manual declarations');
  assert.equal(summary.canonicalBindings,4931+(summary.retainedCanonicalBindings-4931)+summary.addedCanonicalBindings,'the total composes Version29, retained H additions, and the exact MM append');
}

// Native assertions read current files directly. The four retained XP application
// comparisons then receive the complete closed ae7 predecessor through history.
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url));
const nativeJson=path=>JSON.parse(read(path));
const phbProjectionCommit='6b3cfc8cb421a2c1fc2379c38abebe2075634981';
const phbProjectionBytes=path=>{
  const exists=spawnSync('git',['cat-file','-e',`${phbProjectionCommit}:${path}`],{cwd:root,stdio:'ignore'});
  if(exists.status!==0)return read(path);
  return execFileSync('git',['show',`${phbProjectionCommit}:${path}`],{cwd:root,maxBuffer:100*1024*1024});
};
const json=path=>JSON.parse(projectPass8PhbSourceBytes(path,phbProjectionBytes(path)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function archive(path){
  const result=new Map();
  for(const file of JSON.parse(gunzipSync(read(path))).files){
    const bytes=Buffer.from(file.base64,'base64');
    assert.equal(sha(bytes),file.sha256,`${file.path}: retained before bytes`);
    result.set(file.path,JSON.parse(bytes));
  }
  return result;
}
const before=archive('tests/fixtures/pass8-xp-continuation-before-mapping-inputs.json.gz');
const oldCatalogs=archive('tests/fixtures/pass8-xp-continuation-before-catalogs.json.gz');
const application=json('research/source-audit-pass8-xp-continuation-local-application.json');
const owners=new Set(application.bindings.map(binding=>binding.itemId));
const visualReviews=json('research/source-visual-reviews.json').reviews;
const sourceDataBytes=execFileSync('git',['show','6b3cfc8cb421a2c1fc2379c38abebe2075634981:dist/data.json'],{maxBuffer:40*1024*1024});
assert.equal(sha(sourceDataBytes),'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3');
const approvedUaData=JSON.parse(sourceDataBytes);
const weaponDataBytes=execFileSync('git',['show','6717c6f22bbf2f2b421327e4c8561b1d81df00d4:dist/data.json'],{maxBuffer:40*1024*1024});
assert.equal(sha(weaponDataBytes),'6643d7b58c90d982244f1d8f03b6f03a7587446ba25c402be8f9a81a8b701f8f');
const approvedWeaponData=JSON.parse(weaponDataBytes);

function assertCurrentRegionReviews(item,previous,{native=false}={}){
  if(native){
    const before=approvedWeaponData.classes.find(row=>row.id===item.id).sourceExcerpts;
    const approved=approvedUaData.classes.find(row=>row.id===item.id).sourceExcerpts;
    const oldIds=new Set(before.regionReviews.map(row=>row.regionId));
    assert.deepEqual(item.sourceExcerpts.regionReviews.filter(row=>oldIds.has(row.regionId)),before.regionReviews,`${item.id}: exact retained review prefix and single disclosed defect annotation, in relative source order`);
    assert.deepEqual(item.sourceExcerpts,approved,`${item.id}: exact retained review prefix and single disclosed defect annotation plus declared UA source review additions`);
    return;
  }
  const catalog=json(`dist/${item.sourceExcerpts.catalog}`);
  const oldRegions=oldCatalogs.get(`dist/${item.sourceExcerpts.catalog}`).regions;
  const addedRegions=catalog.regions.slice(oldRegions.length);
  assert.equal(item.sourceExcerpts.regionCount,previous.sourceExcerpts.regionCount+addedRegions.length);
  const expectedOld=structuredClone(previous.sourceExcerpts.regionReviews);
  if(item.id==='ua-paladin'){
    const sentinel=expectedOld.find(review=>review.regionId==='ua-16-73a314c55d8d5fee');
    const defect=visualReviews.find(review=>review.itemId===item.id&&review.regionId===sentinel.regionId&&review.assessments?.crop?.status==='defect');
    assert.ok(defect,'the exact retained crop defect is recorded');
    sentinel.recordedReview={status:null,independent:false,evidence:null,hashesMatch:true,scope:defect.scope};
  }
  assert.deepEqual(item.sourceExcerpts.regionReviews.slice(0,expectedOld.length),expectedOld,`${item.id}: exact retained review prefix and single disclosed defect annotation`);
  const expectedAdded=addedRegions.map(region=>{
    const recorded=visualReviews.find(review=>review.collection==='classes'&&review.itemId===item.id&&review.regionId===region.id);
    assert.ok(recorded,`${region.id}: exact component review exists`);
    const review=recorded.assessments.highlight;
    assert.equal(review.status,'confirmed');
    assert.equal(review.independent,true);
    return {
      regionId:region.id,status:'current-reviewed',sentinel:false,
      sourceSha256:recorded.sourceSha256,imageSha256:recorded.imageSha256,
      focusSha256:recorded.focusSha256,contentSha256:recorded.contentSha256,
      review,recordedReview:{...review,hashesMatch:true},
    };
  });
  assert.deepEqual(item.sourceExcerpts.regionReviews.slice(expectedOld.length),expectedAdded,`${item.id}: only the exact new component reviews are appended`);
}

test('native PHB distribution retains all eleven strict continuation targets and exact old region-review prefixes',()=>{
  const current=nativeJson('dist/data.json'),old=before.get('dist/data.json');
  for(const item of current.classes){
    if(!owners.has(item.id))continue;
    const previous=old.classes.find(candidate=>candidate.id===item.id);
    const bindings=item.xpContinuation.evidenceBindings;
    assert.equal(bindings.length,1);
    const binding=bindings[0];
    assert.deepEqual({collection:binding.collection,itemId:binding.itemId,fieldPointer:binding.fieldPointer,sourceObjectPointer:binding.sourceObjectPointer,sourceCategory:binding.sourceCategory,sourceOwner:binding.sourceOwner},
      {collection:'classes',itemId:item.id,fieldPointer:'/xpContinuation',sourceObjectPointer:'/xpContinuation',sourceCategory:'class-xp-continuation',sourceOwner:{collection:'classes',itemId:item.id}},'actual continuation binding must enter the strict guard scope');
    assert.equal(binding.reviewStatus,'field-target-reviewed');
    assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
    assertReviewedClassXpContinuationTarget(binding,{
      item,target:item.xpContinuation,sourceOwner:{collection:'classes',itemId:item.id},
      sourceObjectPointer:'/xpContinuation',readEvidence:read,
    });
    assert.deepEqual(binding.regionIds,[`pass8-${item.id}-xp-continuation-rule`]);
    assert.deepEqual(previous.xpContinuation.evidenceBindings[0].regionIds,[]);
    assert.equal(previous.xpContinuation.evidenceBindings[0].reviewStatus,'field-target-pending');
    assertCurrentRegionReviews(item,previous,{native:true});
  }
  const currentInputs=readMmTreasureCurrentSourceInputs(root);
  assert.deepEqual(currentInputs.data,current,'native current guard uses the exact PHB distribution parsed by this test');
  const currentCohortSummary=assertMmTreasureCurrentSourceCohort(currentInputs);
  assertExpectedHirelingsCurrentSourceSummary(currentCohortSummary);
  assertClosedV28UaSourceContextBindingCohort(currentInputs.inventory.fieldEvidenceBindings);
  assert.deepEqual(projectPass8PhbSourceJson('dist/data.json',approvedUaData),json('dist/data.json'),'the exact Git-pinned PHB/UA predecessor projects through the unchanged XP history checks');
});

test('native current references preserve Version29 bindings, prior UA and weapon cohorts, and Hireling additions',()=>{
  const gitJson=path=>JSON.parse(execFileSync('git',['show',`cc9509047746d5e27a71cb5b1e0cfcb739a688c9:${path}`],{maxBuffer:64*1024*1024}));
  const currentInputs=readMmTreasureCurrentSourceInputs(root);
  const currentCohortSummary=assertMmTreasureCurrentSourceCohort(currentInputs);
  assertExpectedHirelingsCurrentSourceSummary(currentCohortSummary);
  const current=currentInputs.inventory.fieldEvidenceBindings,published=gitJson('research/price-source-inventory.json').fieldEvidenceBindings;
  assert.equal(published.length,4574);assert.equal(current.length,currentCohortSummary.canonicalBindings);
  const version29Bindings=readVersion29HistoricalSourceInputs(root).inventory.fieldEvidenceBindings;
  assert.equal(version29Bindings.length,4931);
  const version29Objects=new Set(version29Bindings.map(binding=>JSON.stringify(binding)));
  assert.deepEqual(current.filter(binding=>version29Objects.has(JSON.stringify(binding))),version29Bindings,'all4931 prior native current bindings remain whole and in relative order');
  assert.equal(current.filter(binding=>!version29Objects.has(JSON.stringify(binding))).length,(currentCohortSummary.retainedCanonicalBindings-version29Bindings.length)+currentCohortSummary.addedCanonicalBindings,'the exact 724 H additions and 76 MM additions extend Version29');
  const oldObjects=new Set(published.map(binding=>JSON.stringify(binding)));
  assert.equal(oldObjects.size,4574);
  assert.deepEqual(current.filter(binding=>oldObjects.has(JSON.stringify(binding))),published,'all4574 complete old binding objects and their relative order remain exact');
  assertClosedV28UaSourceContextBindingCohort(current);
  const weaponOwnerIds=new Set(['rules:phb-hurled-weapons-and-missiles-table','rules:ua-hurled-weapons-and-missiles-table','rules:weapon-versus-armor-adjustments']);
  const added=current.filter(binding=>!oldObjects.has(JSON.stringify(binding))&&weaponOwnerIds.has(`${binding.collection}:${binding.itemId}`));
  assert.equal(added.length,107);
  assert.deepEqual(added.reduce((counts,binding)=>{const key=`${binding.collection}:${binding.itemId}`;counts[key]=(counts[key]||0)+1;return counts;},{}),{
    'rules:phb-hurled-weapons-and-missiles-table':43,
    'rules:ua-hurled-weapons-and-missiles-table':63,
    'rules:weapon-versus-armor-adjustments':1,
  },'only the two new table owners and the existing DMG28 source-context field add these 107 bindings');
  assert.ok(added.every(binding=>binding.reviewStatus==='field-target-pending'&&binding.sourceValueStatus==='not-assessed-by-field-target-review'&&binding.valueReview==null),'all107 added weapon bindings retain pending field and unassessed source-value status');
});

test('all eleven current continuation mappings pass their real source-bound guard without changing class mechanics',()=>{
  const data=json('dist/data.json');
  assert.equal(owners.size,11);
  const restored=structuredClone(data),old=before.get('dist/data.json');
  for(const item of restored.classes){
    const previous=old.classes.find(candidate=>candidate.id===item.id);
    assert.ok(previous,`${item.id}: stable class identity`);
    if(!owners.has(item.id))continue;
    const bindings=item.xpContinuation.evidenceBindings;
    assert.equal(bindings.length,1);
    const binding=bindings[0];
    assert.deepEqual({collection:binding.collection,itemId:binding.itemId,fieldPointer:binding.fieldPointer,sourceObjectPointer:binding.sourceObjectPointer,sourceCategory:binding.sourceCategory,sourceOwner:binding.sourceOwner},
      {collection:'classes',itemId:item.id,fieldPointer:'/xpContinuation',sourceObjectPointer:'/xpContinuation',sourceCategory:'class-xp-continuation',sourceOwner:{collection:'classes',itemId:item.id}},'actual continuation binding must enter the strict guard scope');
    assert.equal(binding.reviewStatus,'field-target-reviewed');
    assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
    assertReviewedClassXpContinuationTarget(binding,{
      item,target:item.xpContinuation,sourceOwner:{collection:'classes',itemId:item.id},
      sourceObjectPointer:'/xpContinuation',readEvidence:read,
    });
    assert.deepEqual(binding.regionIds,[`pass8-${item.id}-xp-continuation-rule`]);
    assert.deepEqual(previous.xpContinuation.evidenceBindings[0].regionIds,[]);
    assert.equal(previous.xpContinuation.evidenceBindings[0].reviewStatus,'field-target-pending');
    assertCurrentRegionReviews(item,previous);
    // Restore only the exact location metadata changed by this batch. The whole
    // resulting object must equal its retained predecessor, including grades.
    item.xpContinuation.evidenceBindings=previous.xpContinuation.evidenceBindings;
    item.sourceExcerpts.regionCount=previous.sourceExcerpts.regionCount;
    item.sourceExcerpts.regionReviews=previous.sourceExcerpts.regionReviews;
  }
  for(const [key,delta]of Object.entries({regions:13,scopedRegions:13,imageFiles:5})){
    assert.equal(restored.release.excerpts[key],old.release.excerpts[key]+delta,`exact current excerpt counter ${key}`);
    restored.release.excerpts[key]=old.release.excerpts[key];
  }
  for(const [key,delta]of Object.entries({regionBoundBindings:11,pendingRegionBindings:-11})){
    assert.equal(restored.release.priceInventory[key],old.release.priceInventory[key]+delta,`exact current binding counter ${key}`);
    restored.release.priceInventory[key]=old.release.priceInventory[key];
  }
  assert.deepEqual(restored,old,'all remaining actual distribution content and grades are unchanged');
});

test('current manual bindings and catalog additions preserve every prior binding, region and default',()=>{
  const oldBindings=before.get('research/field-evidence-bindings.json').bindings;
  const bindings=json('research/field-evidence-bindings.json').bindings;
  assert.equal(oldBindings.length,717);
  assert.equal(bindings.length,728);
  assert.deepEqual(bindings.slice(0,717),oldBindings);
  assert.deepEqual(bindings.slice(717),application.bindings);
  let additions=0;
  for(const [path,old]of oldCatalogs){
    const current=json(path),restored=structuredClone(current);
    assert.deepEqual(current.regions.slice(0,old.regions.length),old.regions,`${path}: every existing region unchanged`);
    const added=current.regions.slice(old.regions.length);
    additions+=added.length;
    assert.ok(added.every(region=>region.id.startsWith(`pass8-${current.itemId}-`)));
    for(const region of added)assert.equal(sha(read(`dist/scans/verified/${region.image}`)),region.sha256);
    restored.regions=old.regions;
    assert.deepEqual(restored,old,`${path}: no other catalog metadata changed`);
  }
  assert.equal(additions,13);
  assert.equal(application.copiedImages.length,5);
  for(const image of application.copiedImages)assert.equal(sha(read(image.path)),image.sha256);
  const overrides=json('citation-overrides.json'),oldOverrides=before.get('citation-overrides.json');
  for(const id of owners){
    const path=`dist/scans/verified/classes-${id}.json`;
    const oldCount=oldCatalogs.get(path).regions.length,newCount=json(path).regions.length;
    assert.equal(overrides.sourceExcerpts[`classes:${id}`].regionCount,oldOverrides.sourceExcerpts[`classes:${id}`].regionCount+newCount-oldCount,`${id}: exact override region count`);
    overrides.sourceExcerpts[`classes:${id}`].regionCount=oldOverrides.sourceExcerpts[`classes:${id}`].regionCount;
  }
  assert.deepEqual(overrides,oldOverrides,'all existing default selections and owner overrides unchanged');
  const targets=json('research/price-source-inventory.json').fieldEvidenceBindings;
  const oldTargets=before.get('research/price-source-inventory.json').fieldEvidenceBindings;
  assert.equal(targets.length,4572);
  assert.equal(oldTargets.length,4572);
  const isContinuation=target=>target.collection==='classes'&&owners.has(target.itemId)&&target.fieldPointer==='/xpContinuation';
  assert.equal(targets.filter(isContinuation).length,11);
  for(const target of targets.filter(isContinuation))assert.equal(target.reviewStatus,'field-target-reviewed');
  // The inventory emits reviewed bindings before pending records, so this batch
  // moves eleven entries. Compare the complete remaining multiset, retaining
  // duplicate multiplicity and every property, rather than assuming row order.
  const unrelated=rows=>rows.filter(target=>!isContinuation(target)).map(target=>JSON.stringify(target)).sort();
  assert.deepEqual(unrelated(targets),unrelated(oldTargets),'all 4561 unrelated targets unchanged');
});

test('the two new ordered groups preserve all 250 old groups and each source part identity',()=>{
  const manifest=json('research/citation-continuations.json');
  const old=before.get('research/citation-continuations.json');
  assert.deepEqual(manifest.groups.slice(0,250),old.groups);
  assert.equal(manifest.groups.length,252);
  const expected=new Map([
    ['magic-user',[['PHB',25,'pass8-magic-user-xp-continuation-table-opening'],['PHB',26,'pass8-magic-user-xp-continuation-rule']]],
    ['ua-paladin',[['PHB',24,'pass8-ua-paladin-xp-continuation-rule'],['UA',16,'pass8-ua-paladin-phb-advancement-context']]],
  ]);
  const published=json('dist/source-continuations.json').groups;
  assert.equal(published.length,252);
  assert.deepEqual(published.slice(0,250),before.get('dist/source-continuations.json').groups,'all old public source groups unchanged');
  for(const group of manifest.groups.slice(250)){
    assert.deepEqual(group.segments.map(part=>[part.book,part.printedPage,part.regionId]),expected.get(group.itemId));
    assert.deepEqual(group.requiredRegionIds,group.segments.map(part=>part.regionId));
    const catalog=json(`dist/${group.catalog}`);
    for(const part of group.segments){
      const region=catalog.regions.find(candidate=>candidate.id===part.regionId);
      assert.ok(region);
      assert.deepEqual([part.book,part.printedPage,part.pdfPage,part.imageSha256,part.sourceSha256],
        [region.book,region.printedPage,region.pdfPage,region.sha256,catalog.sources[region.book].sha256]);
    }
    const publicGroup=published.find(candidate=>candidate.id===group.id);
    assert.ok(publicGroup,'new group is present in actual public projection');
    assert.deepEqual([publicGroup.collection,publicGroup.itemId,publicGroup.catalog],[group.collection,group.itemId,group.catalog]);
    assert.deepEqual(publicGroup.relationship,group.relationship);
    const partIdentity=part=>[part.order,part.role,part.book,part.printedPage,part.pdfPage,part.regionId,part.image,part.imageSha256,part.sourceSha256,part.state];
    assert.deepEqual(publicGroup.segments.map(partIdentity),group.segments.map(partIdentity),'actual public source parts retain order and every source/image identity');
  }
});

test('new component reviews retain all old reviews and explicitly preserve the old UA16 crop defect',()=>{
  const reviews=json('research/source-visual-reviews.json').reviews;
  const old=before.get('research/source-visual-reviews.json').reviews;
  assert.deepEqual(reviews.slice(0,old.length),old);
  const added=reviews.slice(old.length);
  assert.equal(added.length,14);
  const defect=added.find(review=>review.regionId==='ua-16-73a314c55d8d5fee');
  assert.equal(defect.assessments.crop.status,'defect');
  assert.equal(defect.assessments.crop.independent,true);
  const catalog=json('dist/scans/verified/classes-ua-paladin.json');
  const retained=catalog.regions.find(region=>region.id===defect.regionId);
  assert.equal(retained.sha256,defect.imageSha256);
  assert.deepEqual(retained.focusRects,[[0,0,1,1]],'the old full-image sentinel is preserved');
  assert.equal(added.filter(review=>review.regionId.startsWith('pass8-')).length,13);
});
