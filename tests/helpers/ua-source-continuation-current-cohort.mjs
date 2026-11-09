// Native current numeric-assessment census. This helper returns no restored data.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {types} from 'node:util';
const root=new URL('../../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const sourceCommit='6b3cfc8cb421a2c1fc2379c38abebe2075634981',metadataCommit='7314165d4e5b09772d2e4dee9a17e000ebc96c5b',beforeCommit='6717c6f22bbf2f2b421327e4c8561b1d81df00d4';
const git=(ref,path)=>execFileSync('git',['show',`${ref}:${path}`],{cwd:root,maxBuffer:30*1024*1024});
const beforeBytes=git(beforeCommit,'research/source-audit-pass8-weapon-source-continuation-v1-full.json.gz');
assert.equal(sha(beforeBytes),'39a808159fda8291ebbf5d0456130f3d957e1b1e88c9ea13fd3e88409192cf6f');
const afterBytes=git(metadataCommit,'research/source-audit-pass8-ua-source-continuation-v1-full.json.gz');
assert.equal(sha(afterBytes),'1119279eebf467b98eac14d1289fd074cff953bfb8f4d1fb2cfd80e5500bbb5d');
const before=JSON.parse(gunzipSync(beforeBytes)).regionAssessments,approvedFull=JSON.parse(gunzipSync(afterBytes)),approved=approvedFull.regionAssessments;
const approvedSummaryBytes=git(metadataCommit,'research/source-audit-pass8-ua-source-continuation-v1.json');
assert.equal(sha(approvedSummaryBytes),'1449825ca788066d75d673cd1672c5d6748bd799ed703712b05c39f305da2014');
const approvedSummary=JSON.parse(approvedSummaryBytes);
const identity=row=>JSON.stringify([row.owner.collection,row.owner.itemId,row.owner.catalog,row.regionId]);
const beforeKeys=new Set(before.map(identity));
const chromaticKey=JSON.stringify(['spells','ua-illusionist-chromatic-orb','scans/verified/spells-ua-illusionist-chromatic-orb.json','ua-67-785f3646c91cc52a']);
const classIds=['fighter','ranger','ua-barbarian','ua-cavalier','ua-druid','ua-paladin','ua-thief-acrobat'];
const expectedAdded=[];
for(const id of classIds){
 const path=`dist/scans/verified/classes-${id}.json`,old=JSON.parse(git(beforeCommit,path)),current=JSON.parse(git(sourceCommit,path));
 const oldIds=new Set(old.regions.map(region=>region.id));
 assert.deepEqual(current.regions.filter(region=>oldIds.has(region.id)),old.regions,`${id}: all old catalog region objects and relative order remain exact`);
 expectedAdded.push(...current.regions.filter(region=>!oldIds.has(region.id)).map(region=>JSON.stringify(['classes',id,path.slice(5),region.id])));
}
assert.equal(expectedAdded.length,32);assert.equal(new Set(expectedAdded).size,32);
const addedKeys=new Set(expectedAdded),approvedAdded=approved.filter(row=>addedKeys.has(identity(row)));
assert.deepEqual(approvedAdded.map(identity).sort(),expectedAdded.toSorted());
const approvedChromatic=approved.filter(row=>identity(row)===chromaticKey);assert.equal(approvedChromatic.length,1);
function assertJsonTree(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {assert.ok(Number.isFinite(value) && !Object.is(value,-0),'native UA continuation cohort requires exact JSON numbers');return;}
  assert.equal(typeof value,'object','native UA continuation cohort rejects non-JSON values');
  assert.ok(!types.isProxy(value),'native UA continuation cohort rejects proxies');
  assert.equal(Object.getPrototypeOf(Object.prototype),null,'native UA continuation cohort requires the plain Object prototype chain');
  assert.equal(Object.getPrototypeOf(Array.prototype),Object.prototype,'native UA continuation cohort requires the plain Array prototype chain');
  assert.ok(!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'native UA continuation cohort rejects inherited serialization hooks');
  assert.ok(!ancestors.has(value),'native UA continuation cohort rejects cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length,0,'native UA continuation cohort rejects symbols');
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    assert.equal(Object.getPrototypeOf(value),Array.prototype,'native UA continuation cohort requires plain JSON arrays');
    assert.deepEqual(keys,Array.from({length:value.length},(_,i)=>String(i)),'native UA continuation cohort requires dense arrays');
    assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'native UA continuation cohort rejects hidden array properties');
  } else {
    assert.equal(Object.getPrototypeOf(value),Object.prototype,'native UA continuation cohort requires plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value),keys,'native UA continuation cohort rejects hidden properties');
  }
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value,key);
    assert.ok(Object.hasOwn(descriptor,'value'),'native UA continuation cohort rejects accessors');
    assertJsonTree(descriptor.value,ancestors);
  }
  ancestors.delete(value);
}
export function assertCurrentUaContinuationCohort(full,summary){
 assertJsonTree(full);assertJsonTree(summary);
 assert.deepEqual(Object.keys(full),Object.keys(approvedFull),'no unknown current report metadata properties');
 for(const key of Object.keys(approvedFull))if(key!=='regionAssessments')assert.deepEqual(full[key],approvedFull[key],`${key}: complete approved M1 current report metadata remains exact`);
 assert.deepEqual(summary.exposedUniverse,approvedSummary.exposedUniverse,'complete current exposed-universe metadata remains exact');
 assert.equal(before.length,3474);assert.equal(full.regionAssessments.length,3506);
 assert.equal(new Set(full.regionAssessments.map(identity)).size,3506,'no duplicate or substituted current region identities');
 assert.deepEqual(full.regionAssessments.filter(row=>!addedKeys.has(identity(row))&&identity(row)!==chromaticKey),before.filter(row=>identity(row)!==chromaticKey),'all3473 unaffected whole weapon-stage assessment objects and relative order remain exact');
 assert.deepEqual(full.regionAssessments.filter(row=>identity(row)===chromaticKey),approvedChromatic,'only the complete declared Chromatic67 successor assessment is accepted');
 assert.deepEqual(full.regionAssessments.filter(row=>!beforeKeys.has(identity(row))),approvedAdded,'all32 new class assessment objects and their source order match the M1 numeric proof');
 assert.equal(summary.exposedUniverse.catalogRegionUsageCount,3506);
 assert.equal(summary.exposedUniverse.bindingRegionUsageCount,3509);
 assert.equal(approvedChromatic[0].imageSha256,'687c9bf8ec5acf82df28eb6a9503bec89a89e6dd627f06b711f7b9129cfb9dcd');
}
