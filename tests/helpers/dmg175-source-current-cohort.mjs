import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {types} from 'node:util';

const fixtureBytes=readFileSync(new URL('../fixtures/dmg175-source-current-cohort-v1.json',import.meta.url));
const rawSha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(rawSha(fixtureBytes),'b1a39cd6379d1fc34f906781982f9fc049d94089459fd0f7b0243aaeb8476685','closed native source-cohort fixture bytes');
const contract=JSON.parse(fixtureBytes);
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const hash=value=>rawSha(Buffer.from(canonical(value)));
const counts=values=>Object.fromEntries([...values.reduce((map,key)=>map.set(key,(map.get(key)||0)+1),new Map())].sort(([a],[b])=>a.localeCompare(b)));
const ownerField=binding=>JSON.stringify([binding.collection,binding.itemId,binding.fieldPointer]);
const joinKey=binding=>JSON.stringify([binding.collection,binding.itemId,binding.fieldPointer,binding.sourceCategory,binding.regionIds||[]]);

function assertJsonTree(value,ancestors=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert.ok(Number.isFinite(value)&&!Object.is(value,-0),'native cohort requires finite JSON numbers');return;}
 assert.equal(typeof value,'object','native cohort requires JSON primitives and containers');
 assert.ok(!types.isProxy(value),'native cohort rejects proxies');
 assert.ok(!ancestors.has(value),'native cohort rejects cycles');
 assert.equal(Object.getOwnPropertySymbols(value).length,0,'native cohort rejects symbol properties');
 assert.ok(!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'native cohort rejects inherited serialization hooks');
 const keys=Object.keys(value);
 if(Array.isArray(value)){
  assert.equal(Object.getPrototypeOf(value),Array.prototype,'native cohort requires plain arrays');
  assert.deepEqual(keys,Array.from({length:value.length},(_,index)=>String(index)),'native cohort rejects sparse arrays');
  assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'native cohort rejects hidden array properties');
 }else{
  assert.equal(Object.getPrototypeOf(value),Object.prototype,'native cohort requires plain objects');
  assert.deepEqual(Object.getOwnPropertyNames(value),keys,'native cohort rejects hidden properties');
 }
 ancestors.add(value);
 for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);assert.ok(Object.hasOwn(descriptor,'value'),'native cohort rejects accessors');assertJsonTree(descriptor.value,ancestors);}
 ancestors.delete(value);
}

export function readDmg175CurrentSourceInputs(repoRoot){
 const read=path=>readFileSync(resolve(repoRoot,path));
 return {data:JSON.parse(read('dist/data.json')),inventory:JSON.parse(read('research/price-source-inventory.json')),manual:JSON.parse(read('research/field-evidence-bindings.json')),mechanics:JSON.parse(read('research/mechanics-audit-progress.json')),sourceRawInputs:Object.fromEntries(Object.keys(contract.sourceRawInputs).map(path=>[path,rawSha(read(path))]))};
}

// This validator consumes the actual current source. It never projects data to a
// historical epoch. Historical test adapters belong to separate, closed helpers.
export function assertDmg175CurrentSourceCohort({data,inventory,manual,mechanics,sourceRawInputs}){
 for(const value of [data,inventory,manual,mechanics,sourceRawInputs])assertJsonTree(value);
 const ownerCounts=Object.fromEntries(['rules','spells','equipment','classes','matrices'].map(collection=>[collection,data[collection].length]));
 ownerCounts.progressionExplainer=data.progressionExplainer?1:0;
 assert.deepEqual(ownerCounts,contract.expectedOwnerCounts,'native current 1014 owners by collection');
 assert.equal(Object.values(ownerCounts).reduce((sum,n)=>sum+n,0),1014,'native current owner denominator');
 for(const [collection,wanted]of Object.entries(contract.unchangedCollections))assert.equal(hash(data[collection]),wanted,`${collection}: every prior whole object is preserved`);

 const rules=new Map(data.rules.map(rule=>[rule.id,rule]));
 assert.equal(rules.size,data.rules.length,'unique current rule owner IDs');
 for(const [id,wanted]of Object.entries(contract.baselineUnchangedRuleHashes))assert.equal(hash(rules.get(id)),wanted,`${id}: unrelated prior whole rule preserved`);
 for(const [id,wanted]of Object.entries(contract.changedOldRuleHashes))assert.equal(hash(rules.get(id)),wanted,`${id}: exact bounded current whole rule`);
 const newRules=contract.newRuleIds.map(id=>{const rule=rules.get(id);assert.ok(rule,`${id}: current Appendix C owner required`);return rule;});
 assert.equal(newRules.length,11,'exact eleven current Appendix C owners');
 assert.equal(newRules.reduce((sum,rule)=>sum+(rule.table?.rows.length||0),0),87,'87 source table rows remain a separate source census');
 for(const rule of newRules){
  assert.equal((rule.table?.rows||[]).length,contract.newRuleRowCounts[rule.id],`${rule.id}: exact source row denominator`);
  for(const row of rule.table?.rows||[]){assert.equal(row.sourceReference.reviewStatus,'field-target-pending',`${rule.id}: table value review stays pending`);assert.equal(row.sourceReference.sourceValueStatus,'not-assessed-by-field-target-review',`${rule.id}: table source value stays unassessed`);}
  assert.equal(hash(rule),contract.newRuleWholeHashes[rule.id],`${rule.id}: exact whole current source card, table cells and source metadata`);
 }

 const equipment=new Map(data.equipment.map(item=>[item.id,item]));
 assert.equal(equipment.size,192,'unique equipment owners');
 let sourceCells=0;
 for(const [id,wanted]of Object.entries(contract.equipmentStrings)){
  const value=equipment.get(id)?.fields?.[contract.equipmentField];
  assert.equal(typeof value,'string',`${id}: rendered UA28 field is a string`);
  assert.equal(value,wanted,`${id}: exact ordered short-range source-cell rendering`);
  const cells=value.split(': ')[1].split(', ');assert.equal(cells.length,11,`${id}: eleven source cells`);sourceCells+=cells.length;
  const ledger=mechanics.records.find(record=>record.collection==='equipment'&&record.id===id)?.fields.find(field=>field.path===`/fields/${contract.equipmentField}`);
  assert.ok(ledger,`${id}: current formal field is in mechanics ledger`);assert.equal(ledger.status,'unchecked',`${id}: source-value grade remains unchecked`);assert.equal(ledger.inspected,false,`${id}: field is not value-inspected`);assert.deepEqual(ledger.checkers,[],`${id}: no new value checker`);
 }
 assert.equal(sourceCells,33,'three rendered string fields retain 33 source cells');
 for(const [id,wanted]of Object.entries(contract.equipmentWholeHashes))assert.equal(hash(equipment.get(id)),wanted,`${id}: complete current equipment object exact`);

 const bindings=inventory.fieldEvidenceBindings;
 assert.equal(bindings.length,4931,'current canonical binding denominator');
 const oldHashes=new Set(contract.baselineWholeBindingHashes);
 const retained=bindings.filter(binding=>oldHashes.has(hash(binding))).map(hash);
 assert.deepEqual(retained,contract.baselineWholeBindingHashes,'all 4705 prior whole canonical bindings retained in relative order');
 const added=bindings.filter(binding=>!oldHashes.has(hash(binding)));
 assert.equal(added.length,226,'exact 226 additional canonical bindings');
 assert.deepEqual(counts(added.map(binding=>binding.sourceCategory)),contract.expectedAddedCategories,'added source category census');
 assert.deepEqual(counts(added.map(binding=>binding.reviewStatus)),contract.expectedAddedReferenceStatuses,'219 pending, four reference-level region flags, three field-location reviews');
 assert.deepEqual(added.map(hash),contract.addedWholeBindingHashes,'every new whole canonical binding is exact');

 assert.equal(manual.bindings.length,930,'current manual declaration denominator');
 assert.equal(hash(manual.bindings.slice(0,807)),contract.baselineManualPrefixHash,'807 old whole manual declarations remain the exact ordered prefix');
 const newManual=manual.bindings.slice(807),ua=newManual.slice(0,3),dmg=newManual.slice(3);
 assert.equal(newManual.length,123,'123 new manual declarations');
 assert.equal(dmg.length,120,'120 DMG175 manual declarations');
 assert.equal(new Set(dmg.map(ownerField)).size,108,'108 distinct DMG175 owner/field combinations');
 const prose=dmg.filter(binding=>binding.fieldPointer.startsWith('/bullets/'));
 assert.equal(prose.length,33,'33 manual prose bindings');assert.equal(new Set(prose.map(ownerField)).size,21,'21 unique manual prose owner/field pointers');
 assert.equal(dmg.filter(binding=>binding.fieldPointer.startsWith('/table/rows/')).length,87,'87 manual table-row targets');
 for(const binding of dmg){assert.equal(binding.reviewStatus,'field-target-pending','all DMG175 manual review grades remain pending');assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review','all DMG175 manual source values remain unassessed');assert.equal(binding.contextStatus,'context-not-assessed','manual context remains unassessed');}
 for(const binding of ua){assert.equal(binding.reviewStatus,'field-target-reviewed','three UA location reviews');assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review','UA numerical values remain unassessed');assert.equal(binding.targetReview.status,'confirmed','UA exact field location confirmed');assert.equal(binding.contextStatus,'context-not-assessed','UA context not promoted');}
 const addedByKey=new Map();for(const binding of added){const key=joinKey(binding);addedByKey.set(key,[...(addedByKey.get(key)||[]),binding]);}
 const manualKeys=new Set();for(const binding of newManual){const key=joinKey(binding);assert.ok(!manualKeys.has(key),'unique new manual join key');manualKeys.add(key);assert.equal(addedByKey.get(key)?.length,1,`${binding.itemId}${binding.fieldPointer}: one exact canonical manual join`);}
 assert.equal(manualKeys.size,123,'123 distinct manual-to-canonical joins');assert.equal(added.filter(binding=>!manualKeys.has(joinKey(binding))).length,103,'103 nonmanual canonical additions');
 assert.equal(hash(newManual),contract.addedManualHash,'all 123 new whole manual declarations exact');
 assert.equal(mechanics.reviewRecords.length,1215,'1215 historical mechanics reviews retained');
 assert.equal(hash(mechanics.reviewRecords),contract.baselineReviewRecordsHash,'all historical mechanics review records remain exact');
 assert.equal(mechanics.counts.records,1014,'actual current mechanics owner denominator');assert.equal(mechanics.counts.totalFields,14069,'actual current formal leaf denominator');assert.equal(mechanics.counts.uncheckedFields,767,'new formal leaves stay unchecked');
 assert.equal(hash(data),contract.currentWholeDataCanonicalHash,'complete current data object, sources and release metadata exact');
 for(const [name,value]of Object.entries({inventory,manual,mechanics}))assert.equal(hash(value),contract.expectedWholeInputCanonicalHashes[name],`${name}: complete current input object exact`);
 assert.deepEqual(sourceRawInputs,contract.sourceRawInputs,'exact closed current source input bytes; metadata descendants may retain these bytes');
 return {sourceCommit:contract.sourceCommit,owners:1014,canonicalBindings:4931,priorWholeBindings:4705,addedBindings:226,manualAdditions:123,nonmanualAdditions:103,newRules:11,sourceTableRows:87,renderedEquipmentFields:3,sourceCells:33,historicalMechanicsReviews:1215};
}
