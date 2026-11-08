import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertReviewedClassXpContinuationTarget,classXpContinuationTargetIdentity} from '../tools/class-xp-continuation-target-review.mjs';

const before=JSON.parse(readFileSync(new URL('./fixtures/pass8-xp-continuation-before-tuples.json',import.meta.url)));
const clone=value=>structuredClone(value),bytes=value=>Buffer.from(JSON.stringify(value)),sha=value=>createHash('sha256').update(value).digest('hex');
function fixture(row=before.records[0]){
  const identity=classXpContinuationTargetIdentity(row.itemId,row.value);
  const region={regionId:'synthetic-primary',sourceSha256:'a'.repeat(64),imageSha256:'b'.repeat(64),focusSha256:'c'.repeat(64),contentSha256:'d'.repeat(64)};
  const source={collection:'classes',itemId:row.itemId,fieldPointer:'/xpContinuation',sourceObjectPointer:'/xpContinuation',currentTupleProjection:identity.value};
  const author=bytes({cases:[{...source,acceptedRegionEvidence:region}]}),review=bytes({reviews:[{...source,acceptedRegionEvidence:[region]}]});
  const entry={expectedTargetIdentity:identity,independent:true,status:'confirmed',sourceValueGrade:'NOT PROMOTED',
    sourceEvidence:[{path:'research/synthetic-author.json',pointer:'/cases/0',sha256:sha(author)},{path:'research/synthetic-review.json',pointer:'/reviews/0',sha256:sha(review)}],regionEvidence:[region]};
  const files=new Map([['research/synthetic-author.json',author],['research/synthetic-review.json',review]]);
  const binding={collection:'classes',itemId:row.itemId,fieldPointer:'/xpContinuation',sourceObjectPointer:'/xpContinuation',sourceCategory:'class-xp-continuation',
    sourceOwner:{collection:'classes',itemId:row.itemId},reviewStatus:'field-target-reviewed',regionIds:[region.regionId],expectedRegionEvidence:[region],targetReview:{status:'confirmed',independent:true,expectedTargetIdentity:identity,evidence:'research/synthetic-proof.json',evidenceSha256:''}};
  const context={item:{id:row.itemId},target:clone(row.value),sourceOwner:{collection:'classes',itemId:row.itemId},sourceObjectPointer:'/xpContinuation',readEvidence:path=>{if(!files.has(path))throw Error('missing');return files.get(path);}};
  const proof={schemaVersion:1,artifactType:'class-xp-continuation-target-review',reviewedTargets:[entry]};
  function freeze(){const b=bytes(proof);files.set('research/synthetic-proof.json',b);binding.targetReview.evidenceSha256=sha(b);}
  freeze();return {binding,context,files,proof,entry,freeze};
}
const run=f=>assertReviewedClassXpContinuationTarget(f.binding,f.context);
test('closed synthetic proof accepts all eleven actual before tuples without asserting source approval',()=>{
  assert.equal(before.records.length,11);
  for(const row of before.records)assert.doesNotThrow(()=>run(fixture(row)));
});
test('a pending continuation remains pending and does not require an invented review',()=>{
  const f=fixture();f.binding.reviewStatus='field-target-pending';f.binding.targetReview=null;assert.doesNotThrow(()=>run(f));
});
test('changed increment, boundary, anchor, book, page or track cannot retain a tuple review',()=>{
  for(const [key,value] of Object.entries({afterLevel:12,increment:225001,anchorLevel:12,anchorXp:675002,book:'UA',pages:[21],track:'other'})){
    const f=fixture();f.context.target[key]=value;assert.throws(()=>run(f),/exact current seven-field/);
  }
});
test('category, nested pointer and cross-owner bypasses are rejected',()=>{
  for(const change of [f=>f.binding.sourceCategory='generic',f=>f.binding.fieldPointer='/xpContinuation/increment',f=>f.binding.collection='rules',f=>f.binding.sourceOwner.itemId='fighter',f=>f.context.item.id='fighter',f=>f.context.sourceOwner.collection='rules',f=>f.context.sourceObjectPointer='/xpRows/0']){
    const f=fixture();change(f);assert.throws(()=>run(f),/must identify|must agree/);
  }
});
test('open identities, invalid numeric values and invented tuple fields are rejected',()=>{
  for(const change of [f=>f.binding.targetReview.expectedTargetIdentity.value.extra=true,f=>f.context.target.increment=0,f=>f.context.target.anchorXp=-1,f=>f.context.target.afterLevel=1.5,f=>f.context.target.pages=[],f=>f.context.target.track='',f=>f.binding.targetReview.expectedTargetIdentity.extra='x']){
    const f=fixture();change(f);assert.throws(()=>run(f),/exact current seven-field/);
  }
});
test('stale files, path escapes, self-reference and source-owner/tuple substitutions fail',()=>{
  for(const change of [f=>f.files.set('research/synthetic-proof.json',bytes({})),f=>f.binding.targetReview.evidence='../outside.json',f=>{f.entry.sourceEvidence[0].path=f.binding.targetReview.evidence;f.freeze();},f=>{const b=bytes({cases:[{collection:'classes',itemId:'fighter',fieldPointer:'/xpContinuation',sourceObjectPointer:'/xpContinuation',currentTupleProjection:f.entry.expectedTargetIdentity.value}]});f.files.set('research/synthetic-author.json',b);f.entry.sourceEvidence[0].sha256=sha(b);f.freeze();},f=>{const b=bytes({cases:[{collection:'classes',itemId:f.binding.itemId,fieldPointer:'/xpContinuation',sourceObjectPointer:'/xpContinuation',currentTupleProjection:{...f.entry.expectedTargetIdentity.value,increment:1}}]});f.files.set('research/synthetic-author.json',b);f.entry.sourceEvidence[0].sha256=sha(b);f.freeze();}]){
    const f=fixture();change(f);assert.throws(()=>run(f),/digest|path|cyclic|same owner/);
  }
});
test('closed proof, unique identity and distinct author/independent source documents are enforced',()=>{
  for(const change of [f=>f.proof.extra=true,f=>f.proof.artifactType='class-xp-row-target-review',f=>f.proof.reviewedTargets.push(clone(f.entry)),f=>f.entry.extra=true,f=>f.entry.independent=false,f=>f.entry.sourceValueGrade='PROMOTED',f=>f.entry.sourceEvidence.pop(),f=>f.entry.sourceEvidence[1]=clone(f.entry.sourceEvidence[0]),f=>f.entry.sourceEvidence[1].pointer='/reviews/~2']){
    const f=fixture();change(f);f.freeze();assert.throws(()=>run(f),/closed|duplicate|malformed|required|source reference/);
  }
});
test('exact primary region membership/order and all four hashes remain bound',()=>{
  for(const change of [f=>f.entry.regionEvidence=[],f=>f.entry.regionEvidence.push(clone(f.entry.regionEvidence[0])),f=>f.entry.regionEvidence[0]={...f.entry.regionEvidence[0],contentSha256:'invalid'},f=>f.entry.regionEvidence[0]={...f.entry.regionEvidence[0],focusSha256:'e'.repeat(64)},f=>f.binding.regionIds=['another-region'],f=>f.entry.regionEvidence[0]={...f.entry.regionEvidence[0],extra:true}]){
    const f=fixture();change(f);f.freeze();assert.throws(()=>run(f),/region evidence|region hashes|accepted by/);
  }
});
test('retained continuation identity rejects the independently reproduced category-and-pointer bypass',()=>{
  const f=fixture();f.binding.sourceCategory='generic';f.binding.fieldPointer='/abilities';f.binding.sourceObjectPointer='/abilities';f.context.sourceObjectPointer='/abilities';
  assert.throws(()=>run(f),/must identify exactly/);
});
test('independently reproduced substituted region/focus cannot borrow tuple-only source approval',()=>{
  for(const change of [region=>region.regionId='unaccepted-region',region=>region.focusSha256='f'.repeat(64)]){
    const f=fixture();const region=clone(f.entry.regionEvidence[0]);change(region);f.entry.regionEvidence=[region];f.binding.regionIds=[region.regionId];f.binding.expectedRegionEvidence=[region];f.freeze();
    assert.throws(()=>run(f),/not exactly accepted by both source records/);
  }
});
test('either author or independent source acceptance can reject missing, duplicated or changed region hashes',()=>{
  for(const file of ['research/synthetic-author.json','research/synthetic-review.json'])for(const change of [r=>r.acceptedRegionEvidence=null,r=>r.acceptedRegionEvidence=[...(Array.isArray(r.acceptedRegionEvidence)?r.acceptedRegionEvidence:[r.acceptedRegionEvidence]),clone(Array.isArray(r.acceptedRegionEvidence)?r.acceptedRegionEvidence[0]:r.acceptedRegionEvidence)],r=>{const v=Array.isArray(r.acceptedRegionEvidence)?r.acceptedRegionEvidence[0]:r.acceptedRegionEvidence;v.imageSha256='e'.repeat(64);}]){
    const f=fixture(),doc=JSON.parse(f.files.get(file));change(file.includes('author')?doc.cases[0]:doc.reviews[0]);const b=bytes(doc);f.files.set(file,b);f.entry.sourceEvidence.find(r=>r.path===file).sha256=sha(b);f.freeze();assert.throws(()=>run(f),/accepted region evidence|not exactly accepted/);
  }
});
