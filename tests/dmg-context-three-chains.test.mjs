import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {withoutBatch6JoManifest,readBeforeJoBytes,joIntegration} from './helpers/batch6-jo-fixture.mjs';
import {auditRequiredSegmentPresence,validateContinuationManifest} from '../tools/continuation-contract.mjs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';

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
  const currentBatchGroups=withoutBatch6JoManifest(manifest).groups.slice(oldManifest.groups.length);
  assert.deepEqual(currentBatchGroups.filter(group=>plan.groups.some(expected=>expected.id===group.id)),plan.groups,'the three reviewed DMG chains retain their exact order and data');
  const tableGroups=currentBatchGroups.filter(group=>group.id.startsWith('cleric-turning-'));
  assert.equal(tableGroups.length,14,'the complete matrix lookup and thirteen row-context groups are retained');
  assert.ok(tableGroups.some(group=>group.id==='cleric-turning-table-dmg-75-76'));
  assert.equal(tableGroups.filter(group=>group.id.startsWith('cleric-turning-row-context-')).length,13);
  assert.equal(currentBatchGroups.length,17,'the three DMG continuation groups and fourteen Cleric table groups are both retained');
  const validation=validateContinuationManifest(manifest,{data:read('dist/data.json'),catalogRoot:'dist'});
  assert.equal(validation.groups,207+1);
  assert.equal(validation.segments,404+joIntegration.addedContinuationGroup.segments.length);
});

test('source owners, values, unrelated crops and prior PNGs stay unchanged',()=>{
  assert.notEqual(sha(readFileSync('rules.json')),before.files['rules.json'].sha256,'the new Cleric table owner is an intended additive source record');
  const currentOverrides=JSON.parse(readFileSync('citation-overrides.json'));
  const addedTableCitation=currentOverrides.sourceExcerpts['rules:cleric-turning-table'];
  delete currentOverrides.sourceExcerpts['rules:cleric-turning-table'];
  assert.deepEqual(JSON.parse(readBeforeJoBytes('citation-overrides.json')),JSON.parse(before.files['citation-overrides.json'].utf8),'the one new source owner citation is additive; all previous overrides are byte-semantic unchanged');
  assert.deepEqual(addedTableCitation,{collection:'rules',state:'source-excerpt-checked',catalog:'scans/verified/rules-cleric-turning-table.json',regionCount:61,scope:'Complete source excerpt for the bounded Cleric turning matrix and its printed p.76 continuation. This verifies the literal table and linked procedure notes only; other Cleric abilities and whole-book completeness remain outside scope.'});
  assert.ok(JSON.parse(readFileSync('rules.json')).rules.some(row=>row.id==='cleric-turning-table'));
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
