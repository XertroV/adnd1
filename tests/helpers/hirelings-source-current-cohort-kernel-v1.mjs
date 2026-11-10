// This new epoch validates actual current inputs. It never projects history.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {types} from 'node:util';

const rawSha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const hash=value=>rawSha(canonical(value));

function assertJsonTree(value,ancestors=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert.ok(Number.isFinite(value)&&!Object.is(value,-0),'native hirelings cohort requires finite JSON numbers');return;}
 assert.equal(typeof value,'object','native hirelings cohort requires JSON containers');
 assert.ok(!types.isProxy(value),'native hirelings cohort rejects proxies');
 assert.ok(!ancestors.has(value),'native hirelings cohort rejects cycles');
 assert.equal(Object.getOwnPropertySymbols(value).length,0,'native hirelings cohort rejects symbol properties');
 assert.ok(!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'native hirelings cohort rejects inherited serialization hooks');
 const keys=Object.keys(value);
 if(Array.isArray(value)){
  assert.equal(Object.getPrototypeOf(value),Array.prototype,'native hirelings cohort requires plain arrays');
  assert.deepEqual(keys,Array.from({length:value.length},(_,i)=>String(i)),'native hirelings cohort rejects sparse arrays');
  assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'native hirelings cohort rejects hidden array properties');
 }else{
  assert.equal(Object.getPrototypeOf(value),Object.prototype,'native hirelings cohort requires plain objects');
  assert.deepEqual(Object.getOwnPropertyNames(value),keys,'native hirelings cohort rejects hidden properties');
 }
 ancestors.add(value);
 for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);assert.ok(Object.hasOwn(descriptor,'value'),'native hirelings cohort rejects accessors');assertJsonTree(descriptor.value,ancestors);}
 ancestors.delete(value);
}

// A research-time factory keeps the not-yet-materialized final fixture explicit.
// Installation must pin the exact reviewed final fixture bytes in a separate
// tiny loader. No open contract is accepted by the installed production helper.
export function createHirelingsNativeCohort(contractBytes,expectedContractSha256){
 assert.equal(rawSha(contractBytes),expectedContractSha256,'exact reviewed native hirelings fixture bytes');
 const contract=JSON.parse(contractBytes),baseline=contract.baseline;
 assert.equal(baseline.baselineCommit,'1f79d909344ebe7d41a432d8673f3eedb491fa3b');
 assert.equal(contract.newRuleIds.length,48);
 assert.deepEqual(baseline.expectedBaselineCounts,{owners:1014,canonicalBindings:4931,manual:930,mechanicsReviewRecords:1215});
 function readHirelingsCurrentSourceInputs(repoRoot){
  const read=path=>readFileSync(resolve(repoRoot,path));
  return{data:JSON.parse(read('dist/data.json')),inventory:JSON.parse(read('research/price-source-inventory.json')),manual:JSON.parse(read('research/field-evidence-bindings.json')),mechanics:JSON.parse(read('research/mechanics-audit-progress.json')),sourceRawInputs:Object.fromEntries(Object.keys(contract.sourceRawInputs).map(path=>[path,rawSha(read(path))]))};
 }
 function assertHirelingsCurrentSourceCohort({data,inventory,manual,mechanics,sourceRawInputs}){
  for(const value of[data,inventory,manual,mechanics,sourceRawInputs])assertJsonTree(value);
  const collections=Object.keys(baseline.ownerCounts),owners=Object.fromEntries(collections.map(c=>[c,c==='progressionExplainer'?[data[c]]:data[c]]));
  assert.deepEqual(Object.fromEntries(collections.map(c=>[c,owners[c].length])),contract.expectedOwnerCounts,'native current owners by collection');
  for(const collection of collections){
   const wanted=baseline.ownerHashes[collection],byId=new Map(owners[collection].map(owner=>[owner.id,owner]));
   assert.equal(byId.size,owners[collection].length,collection+': unique current owners');
   for(const old of wanted)assert.equal(hash(byId.get(old.id)),old.canonicalSha256,old.id+': original Version29 whole owner preserved');
   const oldIds=new Set(wanted.map(owner=>owner.id));
   assert.deepEqual(owners[collection].filter(owner=>oldIds.has(owner.id)).map(owner=>owner.id),wanted.map(owner=>owner.id),collection+': original owners retain relative order');
  }
  const oldRuleIds=new Set(baseline.ownerHashes.rules.map(owner=>owner.id)),newRules=data.rules.filter(rule=>!oldRuleIds.has(rule.id));
  assert.deepEqual(newRules.map(rule=>rule.id),contract.newRuleIds,'exact48 ordered hirelings source owners');
  const rows=newRules.flatMap(rule=>rule.table?.rows||[]);
  assert.equal(rows.length,244,'244 physical source rows');assert.equal(rows.flatMap(row=>row.cells||[]).length,343,'343 literal source cells');
  for(const rule of newRules){
   assert.equal(rule.table?.rows.length||0,contract.newRuleRowCounts[rule.id],rule.id+': exact row denominator');
   for(const [index,row]of(rule.table?.rows||[]).entries()){
    const attached=row.sourceReference?.evidenceBindings;
    assert.ok(Array.isArray(attached)&&attached.length===1,rule.id+': exactly one native row binding');
    const binding=attached[0];assert.equal(binding.collection,'rules');assert.equal(binding.itemId,rule.id);
    assert.equal(binding.fieldPointer,`/table/rows/${index}/sourceReference`,rule.id+': row binding owns its exact field');
    assert.equal(binding.reviewStatus,'field-target-pending',rule.id+': attached row field review pending');
    assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review',rule.id+': attached row source value unassessed');
    assert.equal(binding.contextStatus,'context-not-assessed',rule.id+': attached row context unassessed');
    assert.equal(binding.targetReview,null,rule.id+': no target review silently introduced');
   }
   assert.equal(hash(rule),contract.newRuleWholeHashes[rule.id],rule.id+': whole new owner exact');
  }
  const bindings=inventory.fieldEvidenceBindings,oldHashes=new Set(baseline.wholeBindingHashes);
  assert.equal(bindings.length,contract.canonicalBindingCount,'native current canonical binding denominator');
  assert.deepEqual(bindings.filter(binding=>oldHashes.has(hash(binding))).map(hash),baseline.wholeBindingHashes,'all4931 original whole bindings preserved in relative order');
  assert.deepEqual(bindings.filter(binding=>!oldHashes.has(hash(binding))).map(hash),contract.addedWholeBindingHashes,'every additional whole canonical binding exact');
  assert.equal(manual.bindings.length,contract.manualCount,'native current manual denominator');
  assert.equal(hash(manual.bindings.slice(0,930)),baseline.manualPrefixCanonicalSha256,'all930 original manual declarations literal prefix');
  const addedManual=manual.bindings.slice(930);assert.equal(addedManual.length,321,'321 exact new manual declarations');
  for(const binding of addedManual){assert.equal(binding.reviewStatus,'field-target-pending','new field review remains pending');assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review','new source values remain unassessed');assert.equal(binding.contextStatus,'context-not-assessed','new context grade remains unassessed');}
  assert.equal(hash(addedManual),contract.addedManualHash,'all321 whole new manual declarations exact');
  assert.equal(mechanics.reviewRecords.length,1215,'1215 historical mechanics reviews retained');
  assert.equal(hash(mechanics.reviewRecords),baseline.mechanicsReviewRecordsCanonicalSha256,'every historical mechanics review exact');
  assert.deepEqual(mechanics.counts,contract.formalMechanicsCounts,'actual current formal mechanics census exact');
  for(const[name,value]of Object.entries({data,inventory,manual,mechanics}))assert.equal(hash(value),contract.expectedWholeInputCanonicalHashes[name],name+': complete actual current object exact');
  assert.deepEqual(sourceRawInputs,contract.sourceRawInputs,'closed actual current source bytes exact');
  return{sourceCommit:contract.sourceCommit,owners:Object.values(contract.expectedOwnerCounts).reduce((a,b)=>a+b,0),canonicalBindings:bindings.length,priorWholeBindings:4931,addedBindings:contract.addedWholeBindingHashes.length,manualAdditions:321,newRules:48,sourceTableRows:244,sourceCells:343,historicalMechanicsReviews:1215};
 }
 return{readHirelingsCurrentSourceInputs,assertHirelingsCurrentSourceCohort};
}
