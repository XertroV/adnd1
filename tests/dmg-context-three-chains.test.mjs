import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {auditRequiredSegmentPresence,validateContinuationManifest} from '../tools/continuation-contract.mjs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';
import {reverseApprovedXpExcerptCounts} from './helpers/batch6-xp-source-history.mjs';

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
  const dmgEnd=oldManifest.groups.length+plan.groups.length;
  assert.deepEqual(manifest.groups.slice(oldManifest.groups.length,dmgEnd),plan.groups,'only the three reviewed DMG groups occupy the historical 193-group extension');
  const xpEnd=dmgEnd+41;
  const xpAppend=manifest.groups.slice(dmgEnd,xpEnd);
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
  assert.deepEqual(xpAppend.map(group=>group.id),expectedXpGroupIds,'the approved 41-group XP/context append remains an exact separate suffix');
  assert.equal(sha(Buffer.from(JSON.stringify(xpAppend))),'8e55326742088967cc75803bee64b30dba0c7a58767bf9faa0d0204c60b97045','all XP append group contents and ordering remain exact');
  const canonicalAppend=manifest.groups.slice(xpEnd);
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
  assert.equal(canonicalApplied.after.manifestSha256,sha(readFileSync('research/citation-continuations.json')));
  assert.deepEqual([canonicalApplied.before.groups,canonicalApplied.after.groups],[234,235]);
  assert.deepEqual([canonicalApplied.before.parts,canonicalApplied.after.parts],[444,446]);
  assert.equal(canonicalApplied.sourceValueGrade,'NOT PROMOTED');
  const historicalDmgManifest={...manifest,groups:manifest.groups.slice(0,dmgEnd)};
  const validation=validateContinuationManifest(historicalDmgManifest,{data:read('dist/data.json'),catalogRoot:'dist'});
  assert.equal(validation.groups,193);
  assert.equal(validation.segments,362);
});

test('source owners and prior PNGs stay unchanged; only exact current catalog counts reflect the XP append',()=>{
  assert.equal(sha(readFileSync('rules.json')),before.files['rules.json'].sha256);
  const oldOverrides=JSON.parse(before.files['citation-overrides.json'].utf8);
  const currentOverrides=read('citation-overrides.json');
  assert.deepEqual(reverseApprovedXpExcerptCounts(currentOverrides),oldOverrides,'only the independently pinned XP catalog-count additions are restored for the historical comparison');
  const changedRegionCountKeys=Object.keys(currentOverrides.sourceExcerpts).filter(key=>oldOverrides.sourceExcerpts[key]?.regionCount!==currentOverrides.sourceExcerpts[key]?.regionCount).sort();
  assert.equal(changedRegionCountKeys.length,17,'only the reviewed XP append adds excerpt rows to canonical catalogs');
  for(const key of changedRegionCountKeys){
    const entry=currentOverrides.sourceExcerpts[key];
    assert.notEqual(entry.regionCount,oldOverrides.sourceExcerpts[key].regionCount);
    assert.equal(read(`dist/${entry.catalog}`).regions.length,entry.regionCount,'catalog count follows the current region rows');
  }
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
