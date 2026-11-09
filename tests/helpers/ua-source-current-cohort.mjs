// Native UA source-cohort guards. These functions inspect the current source
// build in place; they never project historical inputs into a producer.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';

const root=fileURLToPath(new URL('../../',import.meta.url));
const V27='6717c6f22bbf2f2b421327e4c8561b1d81df00d4';
const SOURCE='6b3cfc8cb421a2c1fc2379c38abebe2075634981';
const V27_DATA_SHA='6643d7b58c90d982244f1d8f03b6f03a7587446ba25c402be8f9a81a8b701f8f';
const SOURCE_DATA_SHA='c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3';
const SOURCE_MANIFEST_PATH='research/ua-source-postmerge-activation-v1/source-activation-manifest-v1.json';
const SOURCE_MANIFEST_SHA='fd8ab259ca804a99417b5c9c975821d92b67b7fda5a423cce7944d746752f338';
const CONTROLLED_DELTA_PATH='research/ua-source-postmerge-activation-v1/controlled-delta-v1.json';
const CONTROLLED_DELTA_SHA='b72a2ece0a4be454903596ea537cd7e4ac74377911a6f58ec49e978e1716dec6';
const V27_CANONICAL_INVENTORY_SHA='4e4085911f6df1926f3b7152df2cb48071112b2f6ff4448a2608270ea13e9727';
const CURRENT_CANONICAL_INVENTORY_SHA='2d050385af4b5ce68152ed1cef9c7f1cc7774612a291db910c5e44d26509d210';
const MANUAL_BINDINGS_SHA='6422b17cf193470a01da432f77ba61d61abe0e69653ceb493048616b4da448b9';
const V27_MECHANICS_SHA='ba9fe216487c80100cd58e6287d8e9079af5fc5eff1af11f03125a4f44492be1';
const CURRENT_MECHANICS_SHA='ca8d331e1e35c64c214bde313004c2d9a8ae19cdd6c5dd36fc644f061a426fd7';
const CURRENT_MECHANICS_REVIEW_SHA='cfad75c6e4385af44edc85fe655d5913e2851aa2b948b7dfaf13e6ff01c6065e';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const canonicalSha=value=>sha(Buffer.from(canonical(value)));

function assertJsonTree(value,ancestors=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){
    assert.ok(Number.isFinite(value)&&!Object.is(value,-0),'UA current cohort rejects non-finite and negative-zero numbers');
    return;
  }
  assert.equal(typeof value,'object','UA current cohort accepts only JSON primitives and containers');
  assert.ok(!types.isProxy(value),'UA current cohort rejects proxies');
  assert.equal(Object.getPrototypeOf(Object.prototype),null,'plain Object prototype chain');
  assert.equal(Object.getPrototypeOf(Array.prototype),Object.prototype,'plain Array prototype chain');
  assert.ok(!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'UA current cohort rejects inherited serialization hooks');
  assert.ok(!ancestors.has(value),'UA current cohort rejects cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length,0,'UA current cohort rejects symbol properties');
  const keys=Object.keys(value);
  if(Array.isArray(value)){
    assert.equal(Object.getPrototypeOf(value),Array.prototype,'UA current cohort requires plain arrays');
    assert.deepEqual(keys,Array.from({length:value.length},(_,index)=>String(index)),'UA current cohort rejects sparse arrays');
    assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'UA current cohort rejects hidden array properties');
  }else{
    assert.equal(Object.getPrototypeOf(value),Object.prototype,'UA current cohort requires plain objects');
    assert.deepEqual(Object.getOwnPropertyNames(value),keys,'UA current cohort rejects hidden properties');
  }
  ancestors.add(value);
  for(const key of keys){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    assert.ok(Object.hasOwn(descriptor,'value'),'UA current cohort rejects accessors');
    assertJsonTree(descriptor.value,ancestors);
  }
  ancestors.delete(value);
}

function gitBytes(revision,path){
  return execFileSync('git',['show',`${revision}:${path}`],{cwd:root,maxBuffer:80*1024*1024});
}
function parseJson(bytes,label){
  const value=JSON.parse(bytes);
  assertJsonTree(value);
  assert.ok(value&&typeof value==='object'&&!Array.isArray(value),`${label}: JSON object required`);
  return value;
}
function pinnedGitJson(revision,path,expectedSha){
  const bytes=gitBytes(revision,path);
  assert.equal(sha(bytes),expectedSha,`${revision}:${path} exact pinned bytes`);
  return parseJson(bytes,`${revision}:${path}`);
}
function activeJson(path,expectedSha){
  const bytes=readFileSync(`${root}/${path}`);
  assert.equal(sha(bytes),expectedSha,`${path} exact current pinned bytes`);
  return parseJson(bytes,path);
}
function own(value,key){return Object.hasOwn(value,key)?value[key]:undefined;}
function same(a,b,label){assert.deepStrictEqual(a,b,label);}
function changedKeys(before,after){
  return [...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].filter(key=>!Object.hasOwn(before||{},key)||!Object.hasOwn(after||{},key)||!isDeepEqual(before[key],after[key])).sort();
}
function isDeepEqual(a,b){
  try{assert.deepStrictEqual(a,b);return true;}catch{return false;}
}
function indexById(rows,label){
  assert.ok(Array.isArray(rows),`${label}: array required`);
  const map=new Map();
  for(const [index,row]of rows.entries()){
    assertJsonTree(row);
    assert.equal(typeof row.id,'string',`${label}[${index}] stable id`);
    assert.ok(!map.has(row.id),`${label}: duplicate id ${row.id}`);
    map.set(row.id,row);
  }
  return map;
}
function idOrder(rows){return rows.map(row=>row.id);}

const CLASS_GUIDANCE_COUNTS=Object.freeze({fighter:3,ranger:5,'ua-cavalier':2,'ua-barbarian':4,'ua-thief-acrobat':3,'ua-paladin':2,'ua-druid':2});
const CLASS_REFERENCE_COUNTS=Object.freeze({fighter:3,ranger:5,'ua-cavalier':3,'ua-barbarian':5,'ua-thief-acrobat':4,'ua-paladin':2,'ua-druid':2});
const CLASS_COMPILED_PROPERTIES=Object.freeze(Object.fromEntries(Object.keys(CLASS_GUIDANCE_COUNTS).map(id=>[id,['guidance','references','sourceExcerpts']])));
const CLASS_RAW_PROPERTIES=Object.freeze(Object.fromEntries(Object.keys(CLASS_GUIDANCE_COUNTS).map(id=>[id,['guidance']])));
const SPELL_BODY_PROPERTIES=Object.freeze({
  'ua-cleric-ceremony':['effect','conditions','exceptions'],
  'ua-cleric-rainbow':['effect','conditions','exceptions'],
  'ua-druid-ceremony':['effect','conditions','exceptions'],
  'ua-magic-user-bind':['effect'],
  'ua-illusionist-chromatic-orb':['effect','exceptions','sourceExcerpts'],
});
const ALLOWED_CLASS_IDS=new Set(Object.keys(CLASS_GUIDANCE_COUNTS));
const WEAPON_IDS=['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'];
const WEAPON_BINDING_COUNTS=Object.freeze({'phb-hurled-weapons-and-missiles-table':43,'ua-hurled-weapons-and-missiles-table':63,'weapon-versus-armor-adjustments':1});
const EXPECTED_COUNTERS=Object.freeze({
  uniqueRegions:{before:2125,delta:30,after:2155},
  scopedRegions:{before:3398,delta:32,after:3430},
  referencedImages:{before:1302,delta:18,after:1320},
  fieldEvidenceBindings:{before:4681,delta:24,after:4705},
  classFieldEvidenceBindings:{before:1807,delta:24,after:1831},
  regionBoundBindings:{before:1095,delta:24,after:1119},
});

let gitContextCache;
function trustedGitContext(){
  if(gitContextCache)return gitContextCache;
  const sourceBaseBytes=gitBytes(V27,'dist/data.json');
  assert.equal(sha(sourceBaseBytes),V27_DATA_SHA,'V27 actual merged master data bytes');
  const sourceAfterBytes=gitBytes(SOURCE,'dist/data.json');
  assert.equal(sha(sourceAfterBytes),SOURCE_DATA_SHA,'approved source-phase compiled data bytes');
  const baseData=parseJson(sourceBaseBytes,'V27 data');
  const approvedData=parseJson(sourceAfterBytes,'approved source-phase data');
  const baseClassFile=pinnedGitJson(V27,'classes.json','f5fd30a69b028489a22b70aa972d92dfffbe75c27bb2d09c4cc1c54a3a1497fb');
  const approvedClassFile=pinnedGitJson(SOURCE,'classes.json','ce7066204550f7cfc0eb06f379de7733a22ea10ed2041fe51f0bc054e4e62832');
  const baseInventoryBytes=gitBytes(V27,'research/price-source-inventory.json');
  assert.equal(sha(baseInventoryBytes),V27_CANONICAL_INVENTORY_SHA,'V27 canonical 4,681-binding inventory bytes');
  const baseInventory=parseJson(baseInventoryBytes,'V27 canonical inventory');
  const oldMechanicsBytes=gitBytes(V27,'research/mechanics-audit-progress.json');
  assert.equal(sha(oldMechanicsBytes),V27_MECHANICS_SHA,'V27 mechanics ledger exact before-state');
  const baseMechanics=parseJson(oldMechanicsBytes,'V27 mechanics ledger');
  assert.equal(baseMechanics.reviewRecords.length,1210);
  gitContextCache={baseData,approvedData,baseClassFile,approvedClassFile,baseInventory,baseMechanics};
  return gitContextCache;
}

function trustedContext(){
  const git=trustedGitContext();
  const manifestBytes=readFileSync(`${root}/${SOURCE_MANIFEST_PATH}`);
  assert.equal(sha(manifestBytes),SOURCE_MANIFEST_SHA,'source activation manifest exact reviewed hash');
  const manifest=parseJson(manifestBytes,SOURCE_MANIFEST_PATH);
  assert.equal(manifest.baseCommit,V27);
  assert.equal(manifest.compiledData.sha256,SOURCE_DATA_SHA);
  assert.equal(manifest.compiledData.path,'dist/data.json');
  assert.deepEqual(manifest.scope,{spellBodyOwners:5,newUaClassGuidanceLeaves:21,classOwners:7,oldPhbGuidanceLeavesExact:24,newClassPageReferences:24,newAcceptedContextReviews:32,newDefaultAssessments:22,retainedOldDefaultsUnchanged:2,newUaContinuationGroups:10,limitedImages:19,frameProvenancePinChanges:22,noNewStructuredUaTables:true,noXpPhysicalSidecars:true,noHirelingsMm2OrDmg175Changes:true});
  const deltaBytes=readFileSync(`${root}/${CONTROLLED_DELTA_PATH}`);
  assert.equal(sha(deltaBytes),CONTROLLED_DELTA_SHA,'source activation controlled-delta proof exact hash');
  const delta=parseJson(deltaBytes,CONTROLLED_DELTA_PATH);
  assert.equal(delta.baseCommit,V27);
  assert.equal(delta.afterDataSha256,SOURCE_DATA_SHA);
  assert.equal(delta.newClassRecordReferences,24);
  assert.equal(delta.newReferenceStatus,'region-verified');
  assert.equal(delta.newReferenceSourceValueStatus,'not-assessed-by-field-target-review');
  assert.equal(delta.newFieldTargetOrValueGrades,0);
  assert.equal(delta.manualDeclarationsUnchanged,807);
  assert.equal(delta.all4681PriorBindingObjectsAndOrderExact,true);
  assert.deepEqual(delta.sourceOnlyReleaseCounterDeltas,{uniqueRegions:30,scopedRegions:32,referencedImages:18,fieldEvidenceBindings:24,classFieldEvidenceBindings:24,regionBoundBindings:24});
  assert.equal(delta.newReferenceStatus,'region-verified');
  assert.equal(delta.newReferenceSourceValueStatus,'not-assessed-by-field-target-review');
  assert.equal(delta.newFieldTargetOrValueGrades,0);
  assert.deepEqual(delta.spells.map(row=>row.itemId).sort(),Object.keys(SPELL_BODY_PROPERTIES).sort());
  assert.deepEqual(delta.classes.map(row=>row.itemId).sort(),Object.keys(CLASS_GUIDANCE_COUNTS).sort());
  assert.ok(delta.spells.every(row=>row.priorStatusAndIncompleteExact===true));
  assert.ok(delta.classes.every(row=>row.priorPropertiesExact===true));
  assert.equal(delta.rawPHBGuidancePrefixesExact,true);
  assert.equal(delta.all16ClassIdsAndOrderExact,true);
  assert.equal(delta.allOtherSourcePropertiesExact,true);
  assert.equal(delta.ledgerPrefixExact,1849);
  assert.equal(delta.linkedProjectionPrefixExact,261);
  assert.equal(delta.allPriceCensusClaimIntegrityObjectsExact,true);
  assert.equal(delta.metadataBoundary.includes('no new publication'),true);

  for(const pin of manifest.currentSourceAndMechanicsFiles){
    const bytes=readFileSync(`${root}/${pin.path}`);
    assert.equal(sha(bytes),pin.sha256,`${pin.path}: current source activation input pin`);
    assert.equal(bytes.length,pin.sizeBytes,`${pin.path}: current source activation byte count`);
  }
  const currentInventory=activeJson('research/price-source-inventory.json',CURRENT_CANONICAL_INVENTORY_SHA);
  const manualBytes=readFileSync(`${root}/research/field-evidence-bindings.json`);
  assert.equal(sha(manualBytes),MANUAL_BINDINGS_SHA,'literal 807-declaration manual binding file');
  const baseManualBytes=gitBytes(V27,'research/field-evidence-bindings.json');
  assert.equal(sha(baseManualBytes),MANUAL_BINDINGS_SHA,'V27 manual binding file is byte-identical');
  const manual=parseJson(manualBytes,'manual bindings');
  assert.equal(manual.bindings.length,807);
  const mechanicsBytes=readFileSync(`${root}/research/mechanics-audit-progress.json`);
  assert.equal(sha(mechanicsBytes),CURRENT_MECHANICS_SHA,'current mechanics ledger exact after-state');
  const mechanics=parseJson(mechanicsBytes,'current mechanics ledger');
  const mechanicsReviewsBytes=Buffer.from(JSON.stringify(mechanics.reviewRecords));
  assert.equal(sha(mechanicsReviewsBytes),CURRENT_MECHANICS_REVIEW_SHA,'1215 mechanics review records exact canonical hash');
  assert.equal(mechanics.reviewRecords.length,1215);
  assert.equal(git.baseMechanics.reviewRecords.length,1210);
  assert.equal(manifest.mechanics.beforeHistoricalRecords,1210);
  assert.equal(manifest.mechanics.qualifiedActiveRecords,6);
  assert.equal(manifest.mechanics.unchangedOtherOriginalActiveRecords,1204);
  assert.equal(manifest.mechanics.appendedEmptyCheckPendingRecords,5);
  assert.equal(manifest.mechanics.currentPendingChangedLeaves,41);
  assert.equal(manifest.mechanics.newCheckedValueApprovals,0);
  assert.equal(manifest.mechanics.canonicalReviewRecordsSha256,CURRENT_MECHANICS_REVIEW_SHA);

  return {...git,manifest,delta,currentInventory,manual,mechanics};
}

function assertStableOwnerArrays(before,after,label){
  for(const key of ['rules','classes','spells','equipment','matrices']){
    assert.ok(Array.isArray(before[key])&&Array.isArray(after[key]),`${label}.${key} arrays`);
    same(idOrder(after[key]),idOrder(before[key]),`${label}.${key} stable owner IDs and order`);
  }
  same(Object.keys(after),Object.keys(before),`${label} top-level data keys`);
  same(after.progressionExplainer,before.progressionExplainer,`${label} progression explainer unchanged`);
  same(after.equipment,before.equipment,`${label} all 192 equipment owners unchanged`);
  same(after.matrices,before.matrices,`${label} all four attack matrices unchanged`);
  same(after.rules,before.rules,`${label} all 152 rules unchanged, including both 555-cell tables and DMG p.28 source context`);
}

function assertDiffAllowlist(beforeRows,afterRows,allowlist,label){
  const before=indexById(beforeRows,`${label} before`),after=indexById(afterRows,`${label} after`);
  same([...after.keys()],[...before.keys()],`${label}: IDs and order exact`);
  const changed=[];
  for(const id of before.keys()){
    const left=before.get(id),right=after.get(id),properties=changedKeys(left,right);
    if(properties.length)changed.push({id,properties});
    const allowed=allowlist[id];
    if(!allowed){same(right,left,`${label}:${id} entire owner unchanged`);continue;}
    same(properties,[...allowed].sort(),`${label}:${id} exact changed-property allowlist`);
    for(const key of Object.keys(left))if(!allowed.includes(key))same(right[key],left[key],`${label}:${id}.${key} prior property exact`);
    for(const key of allowed){
      assert.ok(Object.hasOwn(right,key),`${label}:${id}.${key} approved after-property present`);
      assert.ok(Object.hasOwn(left,key)||Object.hasOwn(right,key),`${label}:${id}.${key} explicit before/after property`);
    }
  }
  const expected=Object.keys(allowlist).sort();
  same(changed.map(row=>row.id).sort(),expected,`${label}: exact changed owner IDs`);
  return changed;
}

function assertGuidanceLeaves(beforeRows,afterRows,label,{checkReferences=true}={}){
  const before=indexById(beforeRows,`${label} before`),after=indexById(afterRows,`${label} after`);
  let total=0;
  for(const [id,count]of Object.entries(CLASS_GUIDANCE_COUNTS)){
    const prior=before.get(id)?.guidance||[],current=after.get(id)?.guidance||[];
    assert.ok(Array.isArray(prior)&&Array.isArray(current),`${id} guidance arrays`);
    same(current.slice(0,prior.length),prior,`${id} complete prior guidance prefix exact`);
    assert.equal(current.length-prior.length,count,`${id} exact number of new guidance leaves`);
    total+=current.length-prior.length;
    if(checkReferences){
      assert.equal(after.get(id).references.length,CLASS_REFERENCE_COUNTS[id],`${id} exact UA reference count`);
      for(const reference of after.get(id).references){
        assert.equal(reference.book,'UA',`${id} class source reference book`);
        assert.equal(reference.pages.length,1,`${id} class source reference page cardinality`);
        assert.equal(reference.verification?.method,'bounded-source-context');
        assert.match(reference.verification?.coverage||'',/^UA-class-guidance-context-only;/);
      }
    }
  }
  assert.equal(total,21,`${label}: 21 newly appended class guidance leaves only`);
}

function releaseCounterPaths(release){
  return {
    uniqueRegions:release.excerpts.regions,
    scopedRegions:release.excerpts.scopedRegions,
    referencedImages:release.excerpts.imageFiles,
    fieldEvidenceBindings:release.priceInventory.fieldEvidenceBindings,
    classFieldEvidenceBindings:release.priceInventory.fieldEvidenceBindingsByCollection.classes,
    regionBoundBindings:release.priceInventory.regionBoundBindings,
  };
}
function assertReleaseCounters(beforeData,afterData){
  const before=releaseCounterPaths(beforeData.release),after=releaseCounterPaths(afterData.release);
  for(const [key,counts]of Object.entries(EXPECTED_COUNTERS)){
    assert.equal(before[key],counts.before,`V27 ${key} counter`);
    assert.equal(after[key],counts.after,`current ${key} counter`);
    assert.equal(counts.before+counts.delta,counts.after,`${key} exact source-only counter delta`);
  }
  const changed=changedLeafPaths(beforeData.release,afterData.release,'release');
  same(changed.sort(),Object.keys(EXPECTED_COUNTERS).map(key=>`release.${counterPointer(key)}`).sort(),'only six approved release counters changed');
}
function counterPointer(key){
  return ({uniqueRegions:'excerpts.regions',scopedRegions:'excerpts.scopedRegions',referencedImages:'excerpts.imageFiles',fieldEvidenceBindings:'priceInventory.fieldEvidenceBindings',classFieldEvidenceBindings:'priceInventory.fieldEvidenceBindingsByCollection.classes',regionBoundBindings:'priceInventory.regionBoundBindings'})[key];
}
function changedLeafPaths(before,after,prefix){
  if(isDeepEqual(before,after))return [];
  if(Array.isArray(before)||Array.isArray(after)||!before||!after||typeof before!=='object'||typeof after!=='object')return [prefix];
  const keys=new Set([...Object.keys(before),...Object.keys(after)]),out=[];
  for(const key of keys)out.push(...changedLeafPaths(before[key],after[key],`${prefix}.${key}`));
  return out;
}

function assertApprovedCompiledClassArrays(actual,base,approved,label){
  assertJsonTree(actual);
  assert.ok(Array.isArray(actual),`${label}: class array required`);
  const changed=assertDiffAllowlist(base,approved,CLASS_COMPILED_PROPERTIES,label);
  same(actual,approved,`${label}: actual compiled class owners match the pinned approved source commit exactly`);
  assertGuidanceLeaves(base,actual,label);
  assert.equal(changed.length,7);
  return {owners:7,guidanceLeaves:21,references:24};
}

function assertApprovedRawClassArray(actual,base,approved){
  assertJsonTree(actual);
  assert.ok(Array.isArray(actual),'raw class source array required');
  const changed=assertDiffAllowlist(base.classes,approved.classes,CLASS_RAW_PROPERTIES,'classes.json');
  same(actual,approved.classes,'raw class source array equals approved source-phase bytes by object');
  assertGuidanceLeaves(base.classes,actual,'raw classes.json',{checkReferences:false});
  assert.equal(changed.length,7);
  return {owners:7,guidanceLeaves:21,source:'raw classes.json'};
}

function normalizedOwnerIdentity(row,idKey='itemId'){
  const owner=row.owner??row.attachmentOwner??row.sourceOwner??null;
  const collection=row.collection??row.bindingCollection??owner?.collection??null;
  const itemId=row[idKey]??row.bindingItemId??owner?.itemId??null;
  return {collection,itemId,fieldPointer:row.fieldPointer??null};
}
function uaReferenceKey(collection,itemId,fieldPointer){return `${collection}\u0000${itemId}\u0000${fieldPointer}`;}
function expectedUaRefs(){
  const {currentInventory}=trustedContext();
  const current=currentInventory.fieldEvidenceBindings;
  assert.equal(current.length,4705);
  const priorBytes=gitBytes(V27,'research/price-source-inventory.json');
  const prior=parseJson(priorBytes,'V27 canonical price-source inventory').fieldEvidenceBindings;
  const priorHashes=new Set(prior.map(canonicalSha));
  const fresh=current.filter(binding=>!priorHashes.has(canonicalSha(binding)));
  assert.equal(fresh.length,24,'canonical source inventory contains exactly 24 new UA class context bindings');
  const keys=new Set();
  for(const binding of fresh){
    const key=uaReferenceKey(binding.collection,binding.itemId,binding.fieldPointer);
    assert.ok(!keys.has(key),`unique UA source context binding ${binding.itemId}${binding.fieldPointer}`);keys.add(key);
    assert.equal(binding.collection,'classes');
    assert.ok(ALLOWED_CLASS_IDS.has(binding.itemId));
    assert.equal(binding.sourceOwner?.collection,'classes');
    assert.equal(binding.sourceOwner?.itemId,binding.itemId);
    assert.match(binding.fieldPointer,/^\/references\/\d+$/);
    assert.equal(binding.sourceObjectPointer,binding.fieldPointer);
    assert.equal(binding.book,'UA');
    assert.equal(binding.reviewStatus,'region-verified');
    assert.equal(binding.contextStatus,'context-not-assessed');
    assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
    assert.equal(binding.targetReview,null);
    assert.ok(Array.isArray(binding.regionIds)&&binding.regionIds.length>0);
  }
  const expectedOrder=[];
  for(const id of Object.keys(CLASS_REFERENCE_COUNTS)){
    const items=fresh.filter(binding=>binding.itemId===id);
    assert.equal(items.length,CLASS_REFERENCE_COUNTS[id],`${id} exact source reference denominator`);
    expectedOrder.push(...items);
  }
  return expectedOrder;
}

// Re-read the active proof and canonical inventory for every classification.
// Only immutable Git-pinned baselines are cached; an earlier successful call
// must never hide a later change to active proof or inventory bytes.
function getExpectedUaBindings(){return expectedUaRefs();}

/** Identity-only lookup. It does not establish or validate source evidence; use the cohort guard for that. */
export function classifyUaSourceContextBinding(row,idKey='itemId'){
  assertJsonTree(row);
  const {collection,itemId,fieldPointer}=normalizedOwnerIdentity(row,idKey);
  const expected=getExpectedUaBindings().find(binding=>uaReferenceKey(binding.collection,binding.itemId,binding.fieldPointer)===uaReferenceKey(collection,itemId,fieldPointer));
  if(!expected)return null;
  return {
    kind:'ua-class-source-context-identity-match',
    classificationScope:'owner-and-pointer-only; source evidence is not validated',
    owner:{collection:expected.collection,itemId:expected.itemId},
    fieldPointer:expected.fieldPointer,
  };
}

function expectedOwnerIdentityProjection(wanted){
  const {approvedData}=trustedGitContext();
  const match=/^\/references\/(\d+)$/.exec(wanted.fieldPointer);
  assert.ok(match,'UA class reference uses a direct reference-array pointer');
  const owner=approvedData.classes.find(row=>row.id===wanted.itemId);
  const reference=owner?.references?.[Number(match[1])];
  assert.ok(reference,'approved source class has the referenced page object');
  assert.equal(reference.evidenceBindings?.length,1,'known source-owner projection attaches one complete reference binding');
  same(reference.evidenceBindings[0],wanted,`${wanted.itemId}: report projection is derived from the complete approved binding`);
  const nullable=key=>wanted[key]??null;
  return {
    attachmentOwner:{collection:wanted.collection,itemId:wanted.itemId},
    attachmentPath:`${wanted.fieldPointer}/evidenceBindings/0`,
    bindingCollection:wanted.collection,
    bindingItemId:wanted.itemId,
    sourceOwner:wanted.sourceOwner??null,
    sourceCategory:nullable('sourceCategory'),
    fieldPointer:nullable('fieldPointer'),
    sourceObjectPointer:nullable('sourceObjectPointer'),
    sourceObject:nullable('sourceObject'),
    book:nullable('book'),
    printedPage:nullable('printedPage'),
    catalog:nullable('catalog'),
    regionIds:wanted.regionIds??[],
    reviewStatus:nullable('reviewStatus'),
    comparatorException:false,
    disposition:'owner-matched',
    bindingSha256:canonicalSha(wanted),
  };
}

const OWNER_IDENTITY_PROJECTION_KEYS=Object.freeze([
  'attachmentOwner','attachmentPath','bindingCollection','bindingItemId','sourceOwner','sourceCategory',
  'fieldPointer','sourceObjectPointer','sourceObject','book','printedPage','catalog','regionIds',
  'reviewStatus','comparatorException','disposition','bindingSha256',
].sort());

function assertKnownUaBindingShape(actual,wanted){
  const actualKeys=Object.keys(actual).sort();
  const canonicalKeys=Object.keys(wanted).sort();
  if(isDeepEqual(actualKeys,canonicalKeys)){
    same(actual,wanted,`${wanted.itemId}${wanted.fieldPointer}: complete canonical binding exact`);
    return;
  }
  same(actualKeys,OWNER_IDENTITY_PROJECTION_KEYS,`${wanted.itemId}${wanted.fieldPointer}: only the exact source-owner report projection is accepted`);
  same(actual,expectedOwnerIdentityProjection(wanted),`${wanted.itemId}${wanted.fieldPointer}: exact source-owner report projection`);
}

/** Check the exact 24 approved owner/reference targets, returning their actual input rows in approved order. */
export function assertUaSourceContextBindingCohort(bindings,idKey='itemId'){
  assertJsonTree(bindings);
  assert.ok(Array.isArray(bindings),'UA source context bindings array required');
  const expected=getExpectedUaBindings();
  const expectedKeys=new Set(expected.map(binding=>uaReferenceKey(binding.collection,binding.itemId,binding.fieldPointer)));
  const selected=bindings.filter(row=>{
    const id=normalizedOwnerIdentity(row,idKey);
    return expectedKeys.has(uaReferenceKey(id.collection,id.itemId,id.fieldPointer));
  });
  assert.equal(selected.length,24,'all 24 UA owner/reference bindings are present exactly once');
  const byKey=new Map();
  for(const row of selected){
    const id=normalizedOwnerIdentity(row,idKey),key=uaReferenceKey(id.collection,id.itemId,id.fieldPointer);
    assert.ok(!byKey.has(key),`no duplicate UA binding ${id.itemId}${id.fieldPointer}`);
    byKey.set(key,row);
  }
  const result=[];
  for(const wanted of expected){
    const key=uaReferenceKey(wanted.collection,wanted.itemId,wanted.fieldPointer),actual=byKey.get(key);
    assert.ok(actual,`missing UA binding ${wanted.itemId}${wanted.fieldPointer}`);
    const identity=normalizedOwnerIdentity(actual,idKey);
    assert.deepEqual(identity,{collection:wanted.collection,itemId:wanted.itemId,fieldPointer:wanted.fieldPointer});
    assertKnownUaBindingShape(actual,wanted);
    result.push(actual);
  }
  const relevantExtras=bindings.filter(row=>{
    const id=normalizedOwnerIdentity(row,idKey);
    return id.collection==='classes'&&ALLOWED_CLASS_IDS.has(id.itemId)&&(id.fieldPointer?.startsWith('/references/')||row.sourceCategory==='record-reference');
  });
  assert.equal(relevantExtras.length,24,'no missing, extra, duplicate, foreign, or mixed-phase UA reference records');
  return result;
}

function assertCurrentDataAllowlist(actual){
  assertJsonTree(actual);
  const {baseData,approvedData}=trustedContext();
  same(Object.keys(actual),Object.keys(baseData),'actual data top-level shape unchanged');
  assertStableOwnerArrays(baseData,actual,'current compiled data');
  same(actual,approvedData,'current data equals the frozen source-phase compiled output; unknown metadata, mixed-phase inputs, and unapproved properties reject');
  const classChanges=assertDiffAllowlist(baseData.classes,actual.classes,CLASS_COMPILED_PROPERTIES,'compiled classes');
  assertGuidanceLeaves(baseData.classes,actual.classes,'compiled classes');
  assert.equal(classChanges.length,7);
  const spellChanges=assertDiffAllowlist(baseData.spells,actual.spells,SPELL_BODY_PROPERTIES,'compiled spells');
  assert.equal(spellChanges.length,5);
  assertReleaseCounters(baseData,actual);
  assert.equal(actual.rules.length,152);
  assert.equal(actual.equipment.length,192);
  assert.equal(actual.matrices.length,4);
  assert.equal(actual.classes.length,16);
  assert.equal(actual.spells.length,638);
  assertWeaponTableV27Cells(actual);
  const uaReferenceBindings=actual.classes.filter(cls=>ALLOWED_CLASS_IDS.has(cls.id)).flatMap(cls=>(cls.references||[]).flatMap(reference=>reference.evidenceBindings||[]));
  assertUaSourceContextBindingCohort(uaReferenceBindings);
  return {spellBodyOwners:5,classGuidanceOwners:7,newGuidanceLeaves:21,newClassReferences:24,rules:152,equipment:192,matrices:4,classes:16,spells:638,weaponLiteralCells:555,releaseCounters:6};
}

function assertWeaponTableV27Cells(data){
  const phb=data.rules.find(item=>item.id==='phb-hurled-weapons-and-missiles-table');
  const ua=data.rules.find(item=>item.id==='ua-hurled-weapons-and-missiles-table');
  assert.ok(phb&&ua,'both V27 weapon lookup table owners remain present');
  assert.equal(phb.table.rows.length,15,'PHB p.38 physical row count remains exact');
  assert.equal(ua.table.rows.length,24,'UA p.28 physical row count remains exact');
  const cells=[phb,ua].flatMap(owner=>owner.table.rows).reduce((sum,row)=>sum+row.cells.length,0);
  assert.equal(cells,555,'15 PHB + 24 UA rows retain 555 literal cell values');
  const dmg=data.rules.find(item=>item.id==='weapon-versus-armor-adjustments');
  const v27=trustedContext().baseData.rules.find(item=>item.id==='weapon-versus-armor-adjustments');
  same(dmg,v27,'DMG p.28 source context and complete existing rule owner exact');
}

/** Native guard for source assembly and current data tests; it never returns or restores the baseline snapshot. */
export function assertCurrentUaSourceOwnerCohort(data){return assertCurrentDataAllowlist(data);}

/** Compatibility export consumed by current data tests; checks the V27 weapon owners and the bounded UA delta. */
export function assertCurrentWeaponOwnerAdditions(data){
  assertCurrentDataAllowlist(data);
  const {baseData}=trustedContext();
  const phb=data.rules.find(item=>item.id===WEAPON_IDS[0]);
  const ua=data.rules.find(item=>item.id===WEAPON_IDS[1]);
  same(phb,baseData.rules.find(item=>item.id===WEAPON_IDS[0]),'PHB weapon owner remains complete V27 object');
  same(ua,baseData.rules.find(item=>item.id===WEAPON_IDS[1]),'UA weapon owner remains complete V27 object');
  return true;
}

/** Read-only approved class guard. Accepts the authored classes array or a compiled data object. */
export function assertApprovedUaClassSource(dataOrClasses){
  assertJsonTree(dataOrClasses);
  const {baseClassFile,approvedClassFile,baseData,approvedData}=trustedContext();
  if(Array.isArray(dataOrClasses))return assertApprovedRawClassArray(dataOrClasses,baseClassFile,approvedClassFile);
  assert.ok(dataOrClasses&&Array.isArray(dataOrClasses.classes),'assembled data with classes array required');
  assertApprovedCompiledClassArrays(dataOrClasses.classes,baseData.classes,approvedData.classes,'compiled UA class cohort');
  const classRefs=dataOrClasses.classes.filter(cls=>ALLOWED_CLASS_IDS.has(cls.id)).flatMap(cls=>(cls.references||[]).flatMap(reference=>reference.evidenceBindings||[]));
  assertUaSourceContextBindingCohort(classRefs);
  return {owners:7,guidanceLeaves:21,references:24};
}

function assertCurrentManualBindingBytes(){
  const current=readFileSync(`${root}/research/field-evidence-bindings.json`);
  assert.equal(sha(current),MANUAL_BINDINGS_SHA,'current manual declarations retain exact 807-byte-object V27 prefix');
  const parsed=parseJson(current,'manual field bindings');
  assert.equal(parsed.bindings.length,807);
  const weaponRows=parsed.bindings.filter(binding=>WEAPON_IDS.includes(binding.itemId)||binding.itemId==='weapon-versus-armor-adjustments'&&binding.fieldPointer==='/sourceContext');
  assert.equal(weaponRows.length,50,'all 50 existing PHB38/UA28 pending declarations remain in the literal prefix');
  assert.ok(weaponRows.every(row=>row.reviewStatus==='field-target-pending'),'all 50 weapon declarations remain pending');
  const before=gitBytes(V27,'research/field-evidence-bindings.json');
  assert.equal(sha(before),MANUAL_BINDINGS_SHA,'V27 manual declaration bytes exact');
  same(current,before,'manual declaration file is an exact literal V27 prefix');
}

/** Existing function name kept for the native test callers; this checks the current canonical inventory, never a V26/V27 projection. */
export function assertCompiledWeaponBindingPreservation(inventoryArgument=undefined){
  const {baseInventory,currentInventory}=trustedContext();
  const inventory=inventoryArgument===undefined?currentInventory:inventoryArgument;
  assertJsonTree(inventory);
  assert.ok(inventory&&Array.isArray(inventory.fieldEvidenceBindings),'canonical inventory object required');
  const before=baseInventory.fieldEvidenceBindings,current=inventory.fieldEvidenceBindings;
  assert.equal(before.length,4681,'actual V27 canonical binding denominator');
  assert.equal(current.length,4705,'current inventory has exactly 24 source-context additions');
  const beforeHashes=new Set(before.map(canonicalSha));
  const retained=current.filter(binding=>beforeHashes.has(canonicalSha(binding)));
  same(retained,before,'all 4,681 complete old binding objects remain exact in relative order');
  const additions=current.filter(binding=>!beforeHashes.has(canonicalSha(binding)));
  const expected=getExpectedUaBindings();
  same(additions,expected,'only the exact 24 approved pending UA class context records are appended');
  assertUaSourceContextBindingCohort(current);
  assertCurrentManualBindingBytes();
  return {priorWholeObjects:4681,addedUaContextReferences:24,total:4705,manualDeclarations:807,weaponDeclarations:50};
}

/** Compatibility classifier for the prior 107 weapon pending binding cohort. */
export function assertWeaponPendingBindingCohort(bindings,idKey='itemId'){
  assertJsonTree(bindings);
  assert.ok(Array.isArray(bindings),'weapon binding array required');
  const selected=bindings.filter(row=>{
    const {itemId}=normalizedOwnerIdentity(row,idKey);
    return Object.hasOwn(WEAPON_BINDING_COUNTS,itemId)&&((itemId!=='weapon-versus-armor-adjustments')||row.fieldPointer==='/sourceContext');
  });
  assert.equal(selected.length,107,'existing PHB38/UA28/DMG28 pending source-binding denominator');
  for(const [itemId,count]of Object.entries(WEAPON_BINDING_COUNTS)){
    const rows=selected.filter(row=>normalizedOwnerIdentity(row,idKey).itemId===itemId);
    assert.equal(rows.length,count,itemId);
    for(const row of rows){
      const identity=normalizedOwnerIdentity(row,idKey);
      assert.equal(identity.collection,'rules');
      const sourceOwner=row.sourceOwner??{collection:row.owner?.collection,itemId:row.owner?.itemId};
      same(sourceOwner,{collection:'rules',itemId},`${itemId}: owner identity`);
      if(Object.hasOwn(row,'reviewStatus'))assert.equal(row.reviewStatus,'field-target-pending');
      if(Object.hasOwn(row,'sourceValueStatus'))assert.equal(row.sourceValueStatus,'not-assessed-by-field-target-review');
    }
  }
  return selected;
}

/** Verify the source-phase proof and source-only counters without promoting a value grade. */
export function assertUaSourceActivationEvidence(){
  const {manifest,delta,mechanics}=trustedContext();
  return {sourceCommit:SOURCE,baseCommit:V27,dataSha256:SOURCE_DATA_SHA,spellBodyOwners:5,classOwners:7,guidanceLeaves:21,newReferences:24,counters:delta.sourceOnlyReleaseCounterDeltas,mechanicsReviewRecords:mechanics.reviewRecords.length};
}

// Source-visible counters are not field/value approvals; the new UA references
// above are region-verified context only and retain unassessed value status.
export const uaSourceCohortPins=Object.freeze({v27Commit:V27,sourceCommit:SOURCE,v27DataSha256:V27_DATA_SHA,currentDataSha256:SOURCE_DATA_SHA,activationManifestSha256:SOURCE_MANIFEST_SHA,controlledDeltaSha256:CONTROLLED_DELTA_SHA});
