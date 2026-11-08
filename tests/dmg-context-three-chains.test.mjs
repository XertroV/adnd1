import test from 'node:test';
import {projectDmg175Json} from './helpers/batch6-dmg175-source-history.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {withoutBatch6JoManifest,withoutBatch6XpManifest,beforeJoSearchOverridesForXp,readBeforeJoBytes,joIntegration,xpA65HistoryProjection} from './helpers/batch6-jo-fixture.mjs';
import {auditRequiredSegmentPresence,validateContinuationManifest} from '../tools/continuation-contract.mjs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';
import {reverseApprovedXpExcerptCounts} from './helpers/batch6-xp-source-history.mjs';
import {withoutDmg74MatrixSourceExcerptOverrides} from './helpers/dmg74-matrix-batch.mjs';

const read = path => JSON.parse(readFileSync(path,'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const plan = read('research/source-audit-batch6-dmg-context-plan.json');
const fixtureBytes = readFileSync(plan.beforeFixture.path.split('/').slice(-3).join('/'));
const before = JSON.parse(gunzipSync(fixtureBytes));
const oldManifest = JSON.parse(before.files['research/citation-continuations.json'].utf8);
const liveManifest = () => read('research/citation-continuations.json');
const loadOldCatalog = path => JSON.parse(before.files[path].utf8);
const semantic = value => Array.isArray(value) ? value.map(semantic) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).filter(([key])=>!['evidenceBindings','regionReviews'].includes(key)).map(([key,child])=>[key,semantic(child)])) : value;

function detect(manifest,loadCatalog) {
  return plan.groups.map(group=>{
    const declared = manifest.groups.find(candidate=>candidate.id===group.id);
    const catalog = loadCatalog(`dist/${group.catalog}`);
    const presence = auditRequiredSegmentPresence(group,catalog);
    const focusMismatches = plan.regions.filter(row=>row.owner===group.itemId).filter(row=>
      JSON.stringify(catalog.regions.find(region=>region.id===row.regionId)?.focusRects)!==JSON.stringify(row.after.focusRects)).map(row=>row.regionId);
    return {id:group.id,declared:!!declared,missing:presence.missing,mismatches:presence.mismatches,focusMismatches,valid:!!declared&&presence.missing.length===0&&presence.mismatches.length===0&&presence.orderMismatches.length===0&&focusMismatches.length===0};
  });
}

test('Git-backed before keeps the complete190-group lineage and whole1071-pair/1284-raster census',()=>{
  assert.equal(sha(fixtureBytes),'9a77a8a557823e56506c041f554ad936d98bb4016a15267b4bd73073417c32a4');
  assert.equal(before.baselineCommit,'b90d31762611acc96895c66a9e8697360b39182a');
  assert.equal(oldManifest.groups.length,190);
  assert.equal(before.denominators.crossPagePairUsages,1071);
  assert.equal(before.denominators.rasterGeometryCandidates,1284);
  assert.equal(before.denominators.rasterRegionUses,3069);
  assert.equal(sha(readFileSync('research/source-audit-batch6-dmg-context-independent-review.json')),plan.independentReview.sha256);
  for(const row of plan.regions) assert.deepEqual(loadOldCatalog(row.catalog).regions.find(region=>region.id===row.regionId),row.before);
});

test('same detector rejects all three old undeclared chains, both old crop bindings and all six old focus recipes',()=>{
  const findings=detect(oldManifest,loadOldCatalog);
  assert.deepEqual(findings.map(row=>row.declared),[false,false,false]);
  assert.deepEqual(findings.map(row=>row.valid),[false,false,false]);
  assert.equal(findings.flatMap(row=>row.mismatches).length,2);
  assert.equal(findings.flatMap(row=>row.focusMismatches).length,6);
  assert.equal(findings.flatMap(row=>row.missing).length,0,'IDs were present; complete reviewed recipes and linkage were absent');
});

test('live six stable regions and three ordered groups match the exact independently reviewed recipes',()=>{
  assert.ok(detect(liveManifest(),read).every(row=>row.valid));
  const paths=[...new Set(plan.regions.map(row=>row.catalog))];
  for(const path of paths){
    const catalog=read(path), prior=loadOldCatalog(path);
    assert.deepEqual(catalog.regions.map(row=>row.id),prior.regions.map(row=>row.id),'catalog order and stable IDs preserved');
    for(const old of prior.regions){
      const expected=plan.regions.find(row=>row.catalog===path&&row.regionId===old.id)?.after||old;
      const current=catalog.regions.find(row=>row.id===old.id);
      assert.deepEqual(current,expected);
      assert.equal(sha(readFileSync(`dist/scans/verified/${current.image}`)),current.sha256);
    }
  }
  const manifest=liveManifest();
  assert.deepEqual(manifest.groups.slice(0,oldManifest.groups.length),oldManifest.groups,'historical190 groups unchanged');
  const releasedManifest=withoutBatch6XpManifest(manifest);
  assert.deepEqual(releasedManifest.groups,xpA65HistoryProjection.manifest.releasedGroups,'all208 released Jo/Search groups retain exact objects and order');
  const currentBatchGroups=withoutBatch6JoManifest(releasedManifest).groups.slice(oldManifest.groups.length);
  assert.deepEqual(currentBatchGroups.filter(group=>plan.groups.some(expected=>expected.id===group.id)),plan.groups,'the three reviewed DMG chains retain their exact order and data');
  const tableGroups=currentBatchGroups.filter(group=>group.id.startsWith('cleric-turning-'));
  assert.equal(tableGroups.length,14,'the complete matrix lookup and thirteen row-context groups are retained');
  assert.ok(tableGroups.some(group=>group.id==='cleric-turning-table-dmg-75-76'));
  assert.equal(tableGroups.filter(group=>group.id.startsWith('cleric-turning-row-context-')).length,13);
  assert.equal(currentBatchGroups.length,17);
  const xpGroups=manifest.groups.slice(releasedManifest.groups.length);
  assert.deepEqual(xpGroups,xpA65HistoryProjection.manifest.xpGroups,'only the exact42 approved XP groups extend the released208');
  const xpAppend=xpGroups.slice(0,41);
  const expectedXpGroupIds=[
    'batch6-magic-user-xp-level-01-context','batch6-magic-user-xp-level-02-context','batch6-magic-user-xp-level-03-context',
    'batch6-magic-user-xp-level-04-context','batch6-magic-user-xp-level-05-context','batch6-magic-user-xp-level-06-context',
    'batch6-magic-user-xp-level-07-context','batch6-magic-user-xp-level-08-context','batch6-magic-user-xp-level-09-context',
    'batch6-magic-user-xp-level-10-context','batch6-magic-user-xp-level-11-context','batch6-magic-user-xp-level-12-context',
    'batch6-magic-user-xp-level-13-context','batch6-magic-user-xp-level-14-context','batch6-magic-user-xp-level-15-context',
    'batch6-magic-user-xp-level-16-context','batch6-magic-user-xp-level-17-context','batch6-magic-user-xp-level-18-context',
    ...Array.from({length:9},(_,index)=>`batch6-ua-druid-xp-level-${index+15}-context`),
    'batch6-ua-druid-grand-office-complete-prose-16-17',
    'batch6-ua-cavalier-cavalier-table-and-hp-context','batch6-ua-paladin-cavalier-table-and-hp-context',
    'batch6-progression-explainer-grand-druid-source-context-16-17',
    ...Array.from({length:10},(_,index)=>`batch6-ua-cavalier-hp-source-level-${index+11}`),
  ];
  assert.deepEqual(xpAppend.map(group=>group.id),expectedXpGroupIds);
  assert.equal(sha(Buffer.from(JSON.stringify(xpAppend))),'8e55326742088967cc75803bee64b30dba0c7a58767bf9faa0d0204c60b97045');
  const canonicalAppend=xpGroups.slice(41);
  const canonicalReviewPath='research/source-audit-batch6-magic-user-canonical-context-root-independent-review.json';
  const canonicalProposalPath='research/source-audit-batch6-magic-user-canonical-context-proposal.json';
  const canonicalAppliedPath='research/source-audit-batch6-magic-user-canonical-context-applied.json';
  assert.equal(sha(readFileSync(canonicalReviewPath)),'27e20bfbaf1998c6715a9f5d0af8a200ef09be87d0a6cc8fcf099af86e1aa91e');
  assert.equal(sha(readFileSync(canonicalProposalPath)),'985213a55f3f5ba95fe9317d25338d44023d8201edaf96f8e8a6bb71b5f7d24b');
  assert.equal(sha(readFileSync(canonicalAppliedPath)),'8a20ebe6557365784063f9e5966caa2f628cf76cf5e0fc6ad023c73b6d1e086c');
  const canonicalReview=read(canonicalReviewPath),canonicalApplied=read(canonicalAppliedPath);
  assert.equal(canonicalReview.independent,true);
  assert.equal(canonicalReview.verdict,'approved-two-source-context-records-and-one-ordered-group-only');
  assert.equal(canonicalApplied.rootIndependentReview.sha256,sha(readFileSync(canonicalReviewPath)));
  assert.equal(canonicalApplied.proposal.sha256,sha(readFileSync(canonicalProposalPath)));
  assert.deepEqual(canonicalAppend,[canonicalReview.group],'one separately approved canonical Magic-User context group follows the unchanged 41-group append');
  assert.equal(canonicalApplied.before.manifestSha256,read('research/source-audit-batch6-xp-merged-continuation-current.json').input.continuationManifestSha256);
  assert.equal(canonicalApplied.after.manifestSha256,sha(execFileSync('git',['show','c2efd1eba27f0b3047ef4ce80f7db187597c808f:research/citation-continuations.json'])));
  assert.deepEqual([canonicalApplied.before.groups,canonicalApplied.after.groups],[234,235]);
  assert.deepEqual([canonicalApplied.before.parts,canonicalApplied.after.parts],[444,446]);
  assert.equal(canonicalApplied.sourceValueGrade,'NOT PROMOTED');
  const validation=validateContinuationManifest(manifest,{data:read('dist/data.json'),catalogRoot:'dist'});
  assert.equal(validation.groups,250);
  assert.equal(validation.segments,490);
});

test('source owners, values, unrelated crops and prior PNGs stay unchanged through the exact two history stages',()=>{
  assert.notEqual(sha(readFileSync('rules.json')),before.files['rules.json'].sha256,'the new Cleric table owner is an intended additive source record');
  const oldOverrides=JSON.parse(before.files['citation-overrides.json'].utf8);
  const currentOverrides=read('citation-overrides.json');
  const xpOverrides=beforeJoSearchOverridesForXp(projectDmg175Json('citation-overrides.json',withoutDmg74MatrixSourceExcerptOverrides(currentOverrides)));
  assert.deepEqual(reverseApprovedXpExcerptCounts(xpOverrides),oldOverrides,'Jo/Search-to-C2 and the17 XP count reversals compose exactly once');
  assert.deepEqual(JSON.parse(readBeforeJoBytes('citation-overrides.json')),oldOverrides,'the original JoV4 legacy reader still returns its exact historical override bytes');
  const changedRegionCountKeys=Object.keys(xpOverrides.sourceExcerpts).filter(key=>oldOverrides.sourceExcerpts[key]?.regionCount!==xpOverrides.sourceExcerpts[key]?.regionCount).sort();
  assert.equal(changedRegionCountKeys.length,17);
  for(const key of changedRegionCountKeys){const entry=xpOverrides.sourceExcerpts[key];assert.notEqual(entry.regionCount,oldOverrides.sourceExcerpts[key].regionCount);assert.equal(read(`dist/${entry.catalog}`).regions.length,entry.regionCount);}
  const addedTableCitation=currentOverrides.sourceExcerpts['rules:cleric-turning-table'];
  assert.deepEqual(addedTableCitation,{collection:'rules',state:'source-excerpt-checked',catalog:'scans/verified/rules-cleric-turning-table.json',regionCount:61,scope:'Complete source excerpt for the bounded Cleric turning matrix and its printed p.76 continuation. This verifies the literal table and linked procedure notes only; other Cleric abilities and whole-book completeness remain outside scope.'});
  assert.ok(read('rules.json').rules.some(row=>row.id==='cleric-turning-table'));
  const data=read('dist/data.json');
  for(const owner of before.owners) assert.deepEqual(semantic(data.rules.find(row=>row.id===owner.id)),semantic(owner));
  for(const image of before.oldImageIdentities) assert.equal(sha(readFileSync(image.path)),image.sha256);
});

test('ledger binds only crop/context/highlight to exact current hashes and retains superseded reviews',()=>{
  const ledger=read('research/source-visual-reviews.json');
  const old=JSON.parse(before.files['research/source-visual-reviews.json'].utf8);
  for(const row of plan.regions){
    const current=ledger.reviews.find(review=>review.collection==='rules'&&review.itemId===row.owner&&review.binding==='sourceExcerpts'&&review.regionId===row.regionId);
    assert.ok(current);
    assert.equal(current.sourceSha256,plan.sourcePdfSha256);
    assert.equal(current.imageSha256,row.after.sha256);
    assert.deepEqual({focusSha256:current.focusSha256,contentSha256:current.contentSha256},sourceVisualRegionHashes(row.after));
    assert.deepEqual(Object.keys(current.assessments).sort(),['context','crop','highlight']);
    assert.ok(Object.values(current.assessments).every(value=>value.independent===true&&value.status==='confirmed'));
    const prior=old.reviews.find(review=>review.collection==='rules'&&review.itemId===row.owner&&review.binding==='sourceExcerpts'&&review.regionId===row.regionId);
    if(prior)assert.deepEqual(current.supersedes,prior);
  }
});

test('assembled linked-passages projection publishes all six exact segments without changing unrelated default selection',()=>{
  const published=read('dist/source-continuations.json');
  for(const group of plan.groups){
    const current=published.groups.find(row=>row.id===group.id);
    assert.ok(current);
    assert.deepEqual(current.segments.map(row=>[row.regionId,row.imageSha256]),group.segments.map(row=>[row.regionId,row.imageSha256]));
    assert.equal(group.defaultSelection,'unreviewed; existing catalog order retained');
  }
});

test('both exact history boundaries reject undeclared groups, changed values and repeated override projection',()=>{
 const manifest=liveManifest();
 for(const mutate of [copy=>copy.groups.at(-1).segments.reverse(),copy=>copy.groups.pop(),copy=>copy.groups.push({...copy.groups.at(-1),id:'unapproved-group'})]){
  const changed=structuredClone(manifest);mutate(changed);assert.throws(()=>withoutBatch6XpManifest(changed));
 }
 const overrides=read('citation-overrides.json');
 const changed=structuredClone(overrides);changed.sourceExcerpts['classes:cleric'].regionCount++;assert.throws(()=>beforeJoSearchOverridesForXp(changed));
 assert.throws(()=>beforeJoSearchOverridesForXp(beforeJoSearchOverridesForXp(projectDmg175Json('citation-overrides.json',overrides))),'the C2 stage must go only to the separately pinned XP count reversal');
});
