import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/mechanics-batch-two-corrections.json',import.meta.url),'utf8'));
export function reverseMechanicsBatchTwo(items,collection) {
 const copy=structuredClone(items);
 for(const record of fixture.records.filter(r=>r.collection===collection)) {
  const item=copy.find(x=>x.id===record.id);assert.ok(item,record.id);
  for(const change of [...record.changes].reverse()) {
   const parts=change.path.split('/').slice(1).map(s=>s.replaceAll('~1','/').replaceAll('~0','~'));let parent=item;
   for(const part of parts.slice(0,-1))parent=parent[part];
   const key=parts.at(-1);
   assert.deepEqual(parent[key],change.newValue,`${record.id} ${change.path}: approved value`);
   if(change.oldExists)parent[key]=structuredClone(change.oldValue);else delete parent[key];
  }
 }
 return copy;
}
