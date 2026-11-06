import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/mechanics-batch-two-corrections.json',import.meta.url),'utf8'));
// Review hashes use compact JSON with recursively sorted object keys.
function canonical(value) {
 if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
 if(value!==null && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function validateIndependentReviews(records=fixture.records) {
 const counts={spells:0,classes:0};
 for(const record of records) {
  const review=record.independentReview;
  if(!review) continue;
  assert.ok(Object.hasOwn(counts,record.collection),`${record.id}: review collection`);
  counts[record.collection]++;
  assert.equal(review.id,record.id,`${record.id}: review identity`);
  if(review.collection) assert.equal(review.collection,record.collection,`${record.id}: review collection`);
  assert.equal(review.verdict,'confirmed',`${record.id}: review verdict`);
  let change=record.changes.find(c=>c.path===review.path),value;
  if(change) value=change.newValue;
  else {
   // Reviewed deletion of one array member may be applied as a parent replacement.
   const match=review.path.match(/^(.*)\/(\d+)$/);
   assert.ok(match,`${record.id} ${review.path}: reviewed path`);
   change=record.changes.find(c=>c.path===match[1]);
   assert.ok(change && Array.isArray(change.oldValue) && Array.isArray(change.newValue),`${record.id} ${review.path}: reviewed deletion parent`);
   const index=Number(match[2]),old=structuredClone(change.oldValue);
   assert.ok(index<old.length,`${record.id} ${review.path}: reviewed old element exists`);
   old.splice(index,1);
   assert.deepEqual(change.newValue,old,`${record.id} ${review.path}: exactly one reviewed deletion`);
   value=null;
  }
  if(Object.hasOwn(review,'proposedValue')) assert.deepEqual(value,review.proposedValue,`${record.id} ${review.path}: independently reviewed value`);
  else {
   assert.ok(review.proposedValueSha256,`${record.id} ${review.path}: review snapshot`);
   const hash=createHash('sha256').update(canonical(value)).digest('hex');
   assert.equal(hash,review.proposedValueSha256,`${record.id} ${review.path}: independently reviewed hash`);
  }
 }
 assert.deepEqual(counts,{spells:242,classes:38},'independent review coverage');
}
export function reverseMechanicsBatchTwo(items,collection) {
 const copy=structuredClone(items);
 for(const record of [...fixture.records].reverse().filter(r=>r.collection===collection)) {
  const item=copy.find(x=>x.id===record.id);assert.ok(item,record.id);
  for(const change of [...record.changes].reverse()) {
   const parts=change.path.split('/').slice(1).map(s=>s.replaceAll('~1','/').replaceAll('~0','~'));let parent=item;
   for(const part of parts.slice(0,-1))parent=parent[part];
   const key=parts.at(-1),array=Array.isArray(parent),index=array?Number(key):key,exists=array?Number.isInteger(index)&&index>=0&&index<parent.length:Object.hasOwn(parent,key);
   const newExists=change.newExists!==false;
   assert.equal(exists,newExists,`${record.id} ${change.path}: approved existence`);
   if(newExists)assert.deepEqual(parent[index],change.newValue,`${record.id} ${change.path}: approved value`);
   if(change.oldExists){if(array&&!newExists)parent.splice(index,0,structuredClone(change.oldValue));else parent[index]=structuredClone(change.oldValue);}
   else if(array){if(newExists)parent.splice(index,1);}else delete parent[key];
  }
 }
 return copy;
}
