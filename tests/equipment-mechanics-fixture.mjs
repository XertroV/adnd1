import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export const equipmentCompletenessCorrections=JSON.parse(readFileSync(new URL('./fixtures/equipment-completeness-corrections.json',import.meta.url),'utf8'));
export const equipmentAdditionalCorrections=JSON.parse(readFileSync(new URL('./fixtures/equipment-additional-mechanics-corrections.json',import.meta.url),'utf8'));
export const equipmentCorrections=JSON.parse(readFileSync(new URL('./fixtures/equipment-mechanics-corrections.json',import.meta.url),'utf8'));
const unescape=s=>s.replaceAll('~1','/').replaceAll('~0','~');
export function reverseApprovedEquipmentChanges(equipment) {
 const copy=structuredClone(equipment);
 for(const record of [...equipmentCompletenessCorrections.records,...equipmentAdditionalCorrections.records,...equipmentCorrections.records]){
  const item=copy.find(x=>x.id===record.id);assert.ok(item,record.id);
  for(const change of record.changes){
   const parts=change.path.split('/').slice(1).map(unescape);let parent=item;
   for(const part of parts.slice(0,-1)) {assert.ok(parent!==null && typeof parent==='object' && Object.hasOwn(parent,part),`${record.id} ${change.path}: parent exists`);parent=parent[part];}
   const key=parts.at(-1);assert.ok(parent!==null && typeof parent==='object' && Object.hasOwn(parent,key),`${record.id} ${change.path}: value exists`);
   assert.deepEqual(parent[key],change.newValue,`${record.id} ${change.path}: expected approved current value before baseline normalization`);
   if(change.oldExists===false) delete parent[key];
   else parent[key]=structuredClone(change.oldValue);
  }
 }
 return copy;
}
