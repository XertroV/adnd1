import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export const closureCorrections=JSON.parse(readFileSync(new URL('./fixtures/mechanics-closure-corrections.json',import.meta.url),'utf8'));
export function reverseClosureCorrections(items,collection) {
 const copy=structuredClone(items);
 for(const record of [...closureCorrections.records].reverse().filter(r=>r.collection===collection)) {
  const item=copy.find(x=>x.id===record.id);assert.ok(item,record.id);
  for(const c of [...record.changes].reverse()) {
   const parts=c.path.split('/').slice(1).map(s=>s.replaceAll('~1','/').replaceAll('~0','~'));let parent=item;
   for(const key of parts.slice(0,-1)) {assert.ok(parent && Object.hasOwn(parent,key),`${record.id} ${c.path}: parent`);parent=parent[key]}
   const key=parts.at(-1),exists=Object.hasOwn(parent,key);
   assert.equal(exists,c.newExists!==false,`${record.id} ${c.path}: current existence`);
   if(exists)assert.deepEqual(parent[key],c.newValue,`${record.id} ${c.path}: current value`);
   if(c.oldExists)parent[key]=structuredClone(c.oldValue);else delete parent[key];
  }
 }
 for(const entry of closureCorrections.citationOverrides??[]) {
  const item=copy.find(x=>x.id===entry.id);if(!item || !Object.hasOwn(item,'references'))continue;
  const oldRefs=entry.oldValue?.references??[], newRefs=entry.newValue?.references??[];
  for(const ref of newRefs) {
   if(oldRefs.some(old=>JSON.stringify(old)===JSON.stringify(ref)))continue;
   const index=item.references.findIndex(candidate=>JSON.stringify(candidate)===JSON.stringify(ref));
   assert.notEqual(index,-1,`${entry.id}: approved citation reference`);item.references.splice(index,1);
  }
  if(!item.references.length && !oldRefs.length)delete item.references;
 }
 return copy;
}
export function validateClosureIndependentReviews(records=closureCorrections.records) {
 let count=0;
 for(const r of records)for(const c of r.changes) {
  if(c.path==='/fieldSources') {
   const old=c.oldValue??{}, now=c.newValue;
   for(const [label,source] of Object.entries(now)) {
    if(Object.hasOwn(old,label)&&JSON.stringify(old[label])===JSON.stringify(source))continue;
    const escaped=label.replaceAll('~','~0').replaceAll('/','~1');
    const linked=r.changes.find(x=>x.path==='/fields/'+escaped && x.independentReview);
    assert.ok(linked,`${r.id} ${label}: source must derive from reviewed field`);
    assert.equal(source.book,linked.book);assert.deepEqual(source.pages,[linked.page]);
   }
   for(const label of Object.keys(old))assert.ok(Object.hasOwn(now,label),`${r.id}: pre-existing source retained`);
   continue;
  }
  const v=c.independentReview;assert.ok(v,`${r.id} ${c.path}: independent review`);
  for(const k of ['id','collection'])assert.equal(v[k],r[k],`${r.id}: review ${k}`);
  assert.equal(v.path,c.path);assert.equal(v.verdict,'confirmed');assert.deepEqual(v.oldValue,c.oldValue);assert.deepEqual(v.newValue,c.newValue);
  const sources=[...(v.source?[v.source]:[]),...(v.sources??[])];
  assert.ok(sources.some(s=>s.book===c.book&&s.page===c.page&&(Number.isInteger(s.pdfPage)||(s.page===175&&s.pdfPage===null&&s.sourceKind==='separately-supplied-private-image'))&&/^[a-f0-9]{64}$/.test(s.sourceSha256)),`${r.id} ${c.path}: reviewed source`);count++;
 }
 return count;
}
