// Native current-cohort assertions; this helper never projects or restores data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const beforeBytes=execFileSync('git',['show','cc9509047746d5e27a71cb5b1e0cfcb739a688c9:dist/data.json'],{cwd:root,maxBuffer:40*1024*1024});
assert.equal(sha(beforeBytes),'cf6dd7ff912b91fd4525e1d48355e8c21e766e73f2118820e926a96b62f5216f');
export const beforeWeaponData=JSON.parse(beforeBytes);
export const weaponOwnerIds=['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'];
export const weaponBindingAdditionCount=107;
export function beforeWeaponScanInventory(){
 const bytes=execFileSync('git',['show','cc9509047746d5e27a71cb5b1e0cfcb739a688c9:tests/fixtures/source-scan-inventory.json'],{cwd:root,maxBuffer:20*1024*1024});
 assert.equal(sha(bytes),'fffcb4fcd17f31ca22d54fd1af8e42d2d1bda4fa65d4d26afc475bf88b60ead4');
 return JSON.parse(bytes);
}
const isAddition=(row,idKey='itemId')=>weaponOwnerIds.includes(row[idKey])||(row[idKey]==='weapon-versus-armor-adjustments'&&row.fieldPointer==='/sourceContext');

export function assertWeaponPendingBindingCohort(bindings,idKey='itemId'){
 const added=bindings.filter(row=>isAddition(row,idKey));
 assert.equal(added.length,107);
 for(const [id,count]of [[weaponOwnerIds[0],43],[weaponOwnerIds[1],63],['weapon-versus-armor-adjustments',1]]){
  const rows=added.filter(row=>row[idKey]===id);assert.equal(rows.length,count,id);
  for(const row of rows){
   assert.deepEqual(row.sourceOwner,{collection:'rules',itemId:id});
   assert.equal(row.reviewStatus,'field-target-pending');
   if(Object.hasOwn(row,'sourceValueStatus'))assert.equal(row.sourceValueStatus,'not-assessed-by-field-target-review');
  }
 }
 return added;
}

export function assertCompiledWeaponBindingPreservation(){
 const oldBytes=execFileSync('git',['show','cc9509047746d5e27a71cb5b1e0cfcb739a688c9:research/price-source-inventory.json'],{cwd:root,maxBuffer:40*1024*1024});
 assert.equal(sha(oldBytes),'7d16006361279c477ded28030af7ca3b5398d3031ef33580f42744c374c45c68');
 const before=JSON.parse(oldBytes),current=JSON.parse(readFileSync(new URL('research/price-source-inventory.json',root)));
 assert.equal(before.fieldEvidenceBindings.length,4574);assert.equal(current.fieldEvidenceBindings.length,4681);
 assert.deepEqual(current.fieldEvidenceBindings.filter(row=>!isAddition(row)),before.fieldEvidenceBindings,'all 4574 prior whole binding objects and relative order remain exact');
 assertWeaponPendingBindingCohort(current.fieldEvidenceBindings);
 const manualBytes=readFileSync(new URL('research/field-evidence-bindings.json',root)),manual=JSON.parse(manualBytes);
 assert.equal(current.integrity.manualBindingsSha256,sha(manualBytes));assert.equal(manual.bindings.length,807);
 assert.equal(manual.bindings.slice(757).length,50);
 for(const declaration of manual.bindings.slice(757)){
  const rows=current.fieldEvidenceBindings.filter(row=>row.collection===declaration.collection&&row.itemId===declaration.itemId&&row.fieldPointer===declaration.fieldPointer&&row.sourceObjectPointer===declaration.sourceObjectPointer);
  assert.equal(rows.length,1);assert.deepEqual(rows[0].regionIds,declaration.regionIds);
  assert.equal(rows[0].sourceObjectPointer,rows[0].fieldPointer+'/sourceReference');
  assert.equal(rows[0].reviewStatus,'field-target-pending');assert.equal(rows[0].targetReview,null);
 }
}

export function assertCurrentWeaponOwnerAdditions(data){
 for(const collection of ['spells','equipment','classes','matrices'])assert.deepEqual(data[collection],beforeWeaponData[collection],`${collection}: complete prior owners unchanged`);
 assert.deepEqual(data.progressionExplainer,beforeWeaponData.progressionExplainer);
 assert.equal(data.rules.length,beforeWeaponData.rules.length+2);
 assert.deepEqual(data.rules.slice(150).map(item=>item.id),weaponOwnerIds);
 for(const [index,old]of beforeWeaponData.rules.entries()){
  const current=structuredClone(data.rules[index]);
  if(old.id==='weapon-versus-armor-adjustments'){
   const context=current.sourceContext;assert.equal(context.book,'DMG');assert.equal(context.printedPage,28);assert.equal(context.regionId,'dmg-28-opening-8b67aa025e19eddd');
   delete current.sourceContext;current.sourceExcerpts=structuredClone(old.sourceExcerpts);
  }
  assert.deepEqual(current,old,`${old.id}: existing rule content remains exact outside the declared DMG source context`);
 }
 const approved=JSON.parse(readFileSync(new URL('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4/rules-records-candidate-final-v4.json',root))).records;
 for(const [index,id]of weaponOwnerIds.entries()){
  const item=data.rules.find(row=>row.id===id),source=approved.find(row=>row.id===id);
  assert.equal(item.sourceExcerpts.state,'source-excerpt-checked');assert.equal(item.table.rows.length,[15,24][index]);
  assert.deepEqual(item.table.columns,source.table.columns);
  assert.deepEqual(item.table.rows.map(({id,label,printedLabel,markers,cells})=>({id,label,printedLabel,markers,cells})),source.table.rows.map(({id,label,printedLabel,markers,cells})=>({id,label,printedLabel,markers,cells})));
  assert.deepEqual(item.table.sourceNotes.map(({id,label,text})=>({id,label,text})),source.table.sourceNotes.map(({id,label,text})=>({id,label,text})));
 }
}
