import {createHash} from 'node:crypto';
import {assertPrimaryRowEvidence} from './citation-region-role.mjs';
import {existsSync, readFileSync, readdirSync, writeFileSync} from '../mm-replay-fs-v1.mjs';
import {createRequire} from 'node:module';
import {basename,resolve} from 'node:path';
import {ambiguousItemOverrideIds, appendOverrideReferences, classProgressionOverride, cloneOverrideJson, collectionOverride, collectionReferenceOverrides, equipmentPriceStateOverride} from './citation-override-identity.mjs';
import {assertReviewedClassXpContinuationTarget} from './class-xp-continuation-target-review.mjs';

const root = resolve(import.meta.dirname, '../../..');
const books = createRequire(import.meta.url)('../../../dist/books.js');
// Optional frozen review overlay schema: {schemaVersion:1, bindings:[{sourceInventoryFile,sourceInventorySha256,sourceRecordIndex,sourceObject,sourceSha256,itemId,independentReviewFile,independentReviewFileSha256,independentReviewRecordIndex}]}.
const EQUIPMENT_SOURCE_ROW_BINDINGS_FILE = 'research/equipment-source-row-bindings.json';
const PASS8_DMG225_AUTHOR_PATH = 'research/source-audit-pass8-dmg225-field-mapping-author-proposal.json';
const PASS8_DMG225_AUTHOR_SHA256 = '3a8939c6c3c6a4e3513708b7252c596e2359ca6a7e0ab5c877a48874d9c7b8c5';
const PASS8_DMG225_FIELD_REVIEW_PATH = 'research/source-audit-pass8-dmg225-field-mapping-independent-review.json';
const PASS8_DMG225_FIELD_REVIEW_SHA256 = 'bcf60a52e60766ef824fce1ea4edacdc2182d98b2395510051e6ee60ff4a7231';
const PASS8_DMG225_TOOLS_LEAD_REVIEW_PATH = 'research/source-audit-pass8-dmg225-tools-lead-in-independent-review.json';
const PASS8_DMG225_TOOLS_LEAD_REVIEW_SHA256 = '987915068003079fa3de2eb91ff4ad9858fb9540e4ae7af84594dc92f99d2793';
const PASS8_DMG225_TOOLS_ORDER_REVIEW_PATH = 'research/source-audit-pass8-dmg225-tools-alias-order-independent-review.json';
const PASS8_DMG225_TOOLS_ORDER_REVIEW_SHA256 = 'ff2c53802101439e2d258293524b0193f9991dce4e5d800272983ab5ab2ba0eb';
const PASS8_DMG225_TOOLS_GROUP_SHA256 = '5ee81d2d555cacbb6400181daf1684fd9faa427869ea0e05fde97a9c0c377b13';
const PASS8_DMG225_TOOLS_GROUP_ID = 'pass8-dmg225-thieves-tools-exclusion-context';
const PASS8_DMG225_FIELD_TARGET_COUNT = 29;
const PASS8_DMG225_PAGE_GROUP_RECEIPT_PATH = 'research/source-audit-pass8-dmg225-page-group-before-after-receipt-proposal.json';
const PASS8_DMG225_PAGE_GROUP_RECEIPT_SHA256 = 'f8285fc53655c578caf8a4591183c7cb58a8749231470fa92c8bfad74709f425';
const PASS8_DMG225_PAGE_GROUP_REVIEW_PATH = 'research/source-audit-pass8-dmg225-page-group-before-after-independent-review-v1.json';
const PASS8_DMG225_PAGE_GROUP_REVIEW_SHA256 = '385764932c5dda04847d13e7180a19cd3ed6da5be74b099665a19319778cbf95';
const PASS8_DMG225_SOURCE_PDF_SHA256 = '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669';
const hashFile = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const BOOKS_JS_SHA256 = hashFile('dist/books.js');
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
function regionSourceIdentity(catalog,region){
  const identity=books.resolveRegionSourceIdentity(catalog,region);
  return identity?.valid?identity:null;
}
function regionSourceSha256(catalog,region){return regionSourceIdentity(catalog,region)?.sourceSha256??null;}
const jsonPointer = path => `/${path.map(part => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
const sha = value => createHash('sha256').update(value).digest('hex');
function canonical(value){
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value!==null&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function semanticValueSnapshot(value){
  if(Array.isArray(value))return value.map(semanticValueSnapshot);
  if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value)
    .filter(([key])=>key!=='evidenceBindings'&&key!=='regionReviews')
    .map(([key,child])=>[key,semanticValueSnapshot(child)]));
  return value;
}

export function sourceVisualRegionHashes(region){
  const {focusRects,...content}=region;
  return {focusSha256:sha(canonical(focusRects)),contentSha256:sha(canonical(content))};
}

function pass8Dmg225Failure(binding,message){
  throw new Error(`Invalid DMG p.225 field-target proof ${binding?.collection??'(missing collection)'}:${binding?.itemId??'(missing item)'}${binding?.fieldPointer??'(missing field pointer)'} ${message}`);
}

function pass8Dmg225ReviewData(){
  const authorBytes=readFileSync(resolve(root,PASS8_DMG225_AUTHOR_PATH));
  const reviewBytes=readFileSync(resolve(root,PASS8_DMG225_FIELD_REVIEW_PATH));
  if(sha(authorBytes)!==PASS8_DMG225_AUTHOR_SHA256)throw new Error('DMG p.225 field-mapping author proposal hash is stale');
  if(sha(reviewBytes)!==PASS8_DMG225_FIELD_REVIEW_SHA256)throw new Error('DMG p.225 independent field review hash is stale');
  const author=JSON.parse(authorBytes.toString('utf8'));
  const review=JSON.parse(reviewBytes.toString('utf8'));
  if(author.schemaVersion!==1||review.schemaVersion!==1||!Array.isArray(author.mappings)||!Array.isArray(review.cases)
    ||author.mappings.length!==PASS8_DMG225_FIELD_TARGET_COUNT||review.cases.length!==PASS8_DMG225_FIELD_TARGET_COUNT)
    throw new Error('DMG p.225 field-target review denominator changed');
  if(review.authorProposal?.sha256!==PASS8_DMG225_AUTHOR_SHA256)throw new Error('DMG p.225 independent review no longer pins the approved author proposal');
  return {author,review};
}

let pass8Dmg225PageGroupReceiptCache=null;
function pass8Dmg225PageGroupReceipt(){
  if(pass8Dmg225PageGroupReceiptCache)return pass8Dmg225PageGroupReceiptCache;
  const receiptBytes=readFileSync(resolve(root,PASS8_DMG225_PAGE_GROUP_RECEIPT_PATH));
  const reviewBytes=readFileSync(resolve(root,PASS8_DMG225_PAGE_GROUP_REVIEW_PATH));
  if(sha(receiptBytes)!==PASS8_DMG225_PAGE_GROUP_RECEIPT_SHA256)throw new Error('DMG p.225 page-group drift receipt hash is stale');
  if(sha(reviewBytes)!==PASS8_DMG225_PAGE_GROUP_REVIEW_SHA256)throw new Error('DMG p.225 page-group independent integrity review hash is stale');
  const receipt=JSON.parse(receiptBytes.toString('utf8'));
  const review=JSON.parse(reviewBytes.toString('utf8'));
  if(receipt.schemaVersion!==1||receipt.artifactType!=='pass8-dmg225-page-group-before-after-drift-receipt'
    ||receipt.status!=='author-proposed; independent integrity review pending'
    ||receipt.sourceCommit!=='a46eddc41ac6f712d5ad1498195df6a49810aae1'
    ||receipt.sourcePdfSha256!==PASS8_DMG225_SOURCE_PDF_SHA256
    ||receipt.denominator?.targets!==PASS8_DMG225_FIELD_TARGET_COUNT
    ||receipt.denominator?.uniqueOwnerCatalogs!==PASS8_DMG225_FIELD_TARGET_COUNT
    ||!Array.isArray(receipt.targets)||receipt.targets.length!==PASS8_DMG225_FIELD_TARGET_COUNT)
    throw new Error('DMG p.225 page-group drift receipt schema/denominator changed');
  if(review.schemaVersion!==1||review.artifactType!=='pass8-dmg225-page-group-before-after-drift-receipt-independent-review'
    ||review.status!=='accepted as a byte-bound drift receipt only; no default or source grade granted'
    ||review.receipt?.path!==PASS8_DMG225_PAGE_GROUP_RECEIPT_PATH
    ||review.receipt?.sha256!==PASS8_DMG225_PAGE_GROUP_RECEIPT_SHA256
    ||review.receipt?.sourceCommit!==receipt.sourceCommit
    ||review.receipt?.denominator?.targets!==PASS8_DMG225_FIELD_TARGET_COUNT
    ||review.receipt?.denominator?.uniqueOwnerCatalogs!==PASS8_DMG225_FIELD_TARGET_COUNT
    ||review.approvalBoundary?.pageDefaultApproval!==false
    ||review.approvalBoundary?.sourceValueApproval!==false
    ||review.approvalBoundary?.mechanicsApproval!==false
    ||review.approvalBoundary?.browserRoutingApproval!==false
    ||review.approvalBoundary?.oldToolsDefaultDefectCleared!==false)
    throw new Error('DMG p.225 page-group review identity or no-grade boundary changed');
  const refExpectations={
    authorProposal:[PASS8_DMG225_AUTHOR_PATH,PASS8_DMG225_AUTHOR_SHA256],
    fieldIndependentReview:[PASS8_DMG225_FIELD_REVIEW_PATH,PASS8_DMG225_FIELD_REVIEW_SHA256],
    toolsAliasOrderReview:[PASS8_DMG225_TOOLS_ORDER_REVIEW_PATH,PASS8_DMG225_TOOLS_ORDER_REVIEW_SHA256],
  };
  for(const [key,[path,hash]] of Object.entries(refExpectations)){
    const ref=review.trustedReferences?.[key];
    if(ref?.path!==path||ref.sha256!==hash)throw new Error(`DMG p.225 page-group review ${key} reference changed`);
  }
  if(review.independentReproduction?.output?.allTargetAndGroupChecksPass!==true
    ||review.independentReproduction?.output?.targets!==PASS8_DMG225_FIELD_TARGET_COUNT
    ||review.independentReproduction?.output?.allowlistOfAppendedRegions!==4)
    throw new Error('DMG p.225 page-group independent reproduction receipt changed');
  pass8Dmg225PageGroupReceiptCache=receipt;
  return receipt;
}

function pass8Dmg225ReceiptGroupProjection(group){
  return {
    orderedRegionIds:group.orderedRegionIds,
    defaultRegionId:group.defaultRegionId,
    defaultOrderSha256:group.defaultOrderSha256,
    orderedEvidence:(group.orderedRegions||[]).map(({id,role,imageSha256,focusSha256,contentSha256})=>({
      id,role,imageSha256,focusSha256,contentSha256,
    })),
  };
}

function pass8Dmg225AuthorGroupProjection(group){
  return {
    orderedRegionIds:group.orderedRegionIds,
    defaultRegionId:group.defaultRegionId,
    defaultOrderSha256:group.defaultOrderSha256,
    orderedRegions:(group.orderedRegions||[]).map(({id,role,imageSha256,focusSha256,contentSha256})=>({
      id,role,imageSha256,focusSha256,contentSha256,
    })),
  };
}

function pass8Dmg225IsJsonSafe(value,stack=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return true;
  if(typeof value==='number')return Number.isFinite(value);
  if(typeof value!=='object')return false;
  if(stack.has(value))return false;
  stack.add(value);
  let safe=false;
  try{
    if(Array.isArray(value)){
      const keys=Reflect.ownKeys(value);
      safe=keys.every(key=>key==='length'||(typeof key==='string'&&/^(0|[1-9]\d*)$/.test(key)&&Number(key)<value.length))
        &&keys.filter(key=>key!=='length').length===value.length;
      for(let index=0;safe&&index<value.length;index++){
        const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
        safe=Boolean(descriptor?.enumerable&&'value'in descriptor&&pass8Dmg225IsJsonSafe(descriptor.value,stack));
      }
    }else{
      const prototype=Object.getPrototypeOf(value);
      const ownKeys=Reflect.ownKeys(value),enumerableKeys=Object.keys(value);
      safe=(prototype===Object.prototype||prototype===null)&&ownKeys.every(key=>typeof key==='string')
        &&ownKeys.length===enumerableKeys.length;
      for(const key of enumerableKeys){
        const descriptor=Object.getOwnPropertyDescriptor(value,key);
        safe=safe&&Boolean(descriptor?.enumerable&&'value'in descriptor&&pass8Dmg225IsJsonSafe(descriptor.value,stack));
      }
    }
  }catch{safe=false;}
  stack.delete(value);
  return safe;
}

let pass8Dmg225TargetsCache=null;
function pass8Dmg225TargetMap(){
  if(pass8Dmg225TargetsCache)return pass8Dmg225TargetsCache;
  const {author,review}=pass8Dmg225ReviewData();
  const receipt=pass8Dmg225PageGroupReceipt();
  const targets=new Map();
  for(let index=0;index<PASS8_DMG225_FIELD_TARGET_COUNT;index++){
    const mapping=author.mappings[index], reviewed=review.cases[index];
    const pageReceipt=receipt.targets[index];
    const owner=mapping?.owner, key=[owner?.collection,owner?.itemId,mapping?.fieldPointer].join('\\0');
    if(!owner?.collection||!owner?.itemId||!mapping?.fieldPointer||targets.has(key))throw new Error('DMG p.225 field-target identities are incomplete or duplicated');
    if(reviewed?.caseIndex!==index||reviewed.collection!==owner.collection||reviewed.itemId!==owner.itemId
      ||reviewed.fieldPointer!==mapping.fieldPointer||reviewed.sourceObjectPointer!==mapping.sourceObjectPointer)
      throw new Error(`DMG p.225 independent-review case ${index} no longer matches its exact author target`);
    if(pageReceipt?.targetIndex!==index||pageReceipt.owner?.collection!==owner.collection||pageReceipt.owner?.itemId!==owner.itemId
      ||pageReceipt.fieldPointer!==mapping.fieldPointer||pageReceipt.sourceObjectPointer!==mapping.sourceObjectPointer
      ||pageReceipt.catalogPath!==mapping.candidateCatalog
      ||canonical(pass8Dmg225AuthorGroupProjection(pageReceipt.before))!==canonical(mapping.currentPageDefaultOrder)
      ||pageReceipt.oldDefaultPreserved!==true||pageReceipt.defaultAssessment!=='not-approved; this receipt pins before/after state for drift detection only'
      ||pageReceipt.before?.defaultRegionId!==pageReceipt.after?.defaultRegionId
      ||pageReceipt.oldRegionObjectsAndOrderPreserved!==true)
      throw new Error(`DMG p.225 independent drift receipt does not pin the exact no-grade before/after group at ${owner.itemId}`);
    const priorIds=pageReceipt.before?.orderedRegionIds;
    const appendedIds=pageReceipt.allowedAppendedRegions?.map(region=>region.id);
    if(!Array.isArray(priorIds)||!Array.isArray(appendedIds)
      ||canonical(pageReceipt.after?.orderedRegionIds?.filter(id=>priorIds.includes(id)))!==canonical(priorIds)
      ||appendedIds.some(id=>priorIds.includes(id)||!pageReceipt.after.orderedRegionIds.includes(id)))
      throw new Error(`DMG p.225 drift receipt has an invalid prior-order or append allowlist at ${owner.itemId}`);
    targets.set(key,{index,mapping,reviewed,pageReceipt});
  }
  pass8Dmg225TargetsCache=targets;
  return targets;
}

function pass8Dmg225PageGroup(catalog,book,printedPage){
  const ordered=(catalog?.regions||[]).filter(region=>region.book===book&&region.printedPage===printedPage)
    .sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
  const evidence=ordered.map(region=>({
    id:region.id,role:region.role||null,imageSha256:region.sha256,...sourceVisualRegionHashes(region),
  }));
  return {
    orderedRegionIds:ordered.map(region=>region.id),
    defaultRegionId:ordered[0]?.id??null,
    defaultOrderSha256:sha(canonical(evidence)),
    orderedEvidence:evidence,
  };
}

function pass8Dmg225ReviewPointer(record, pointer){
  if(pointer==='')return record;
  if(typeof pointer!=='string'||!pointer.startsWith('/'))return undefined;
  return pointer.slice(1).split('/').map(part=>part.replaceAll('~1','/').replaceAll('~0','~'))
    .reduce((current,part)=>current?.[Array.isArray(current)?Number(part):part],record);
}

export function assertPass8Dmg225TargetUniverse(bindings){
  if(!Array.isArray(bindings))throw new Error('DMG p.225 current target universe must be an array');
  const targets=pass8Dmg225TargetMap();
  const candidates=bindings.filter(binding=>binding?.collection==='equipment'&&binding?.sourceCategory==='equipment-field'
    &&binding?.book==='DMG'&&binding?.printedPage===225);
  if(candidates.length!==targets.size)pass8Dmg225Failure(candidates[0],`expected exactly ${targets.size} current DMG p.225 equipment-field bindings, found ${candidates.length}`);
  for(const binding of candidates){
    if(!pass8Dmg225IsJsonSafe(binding))pass8Dmg225Failure(binding,'target binding contains non-JSON data');
    const key=[binding.collection,binding.itemId,binding.fieldPointer].join('\\0');
    if(!targets.has(key))pass8Dmg225Failure(binding,'unexpected DMG p.225 equipment-field target is outside the closed 29-target universe');
  }
  for(const [key,{mapping}] of targets){
    const [collection,itemId,fieldPointer]=key.split('\\0');
    const matches=bindings.filter(binding=>binding.collection===collection&&binding.itemId===itemId&&binding.fieldPointer===fieldPointer);
    if(matches.length!==1)pass8Dmg225Failure({collection,itemId,fieldPointer},`expected exactly one current target binding, found ${matches.length}`);
    const binding=matches[0];
    if(binding.sourceCategory!=='equipment-field'||binding.book!=='DMG'||binding.printedPage!==225
      ||binding.sourceObjectPointer!==mapping.sourceObjectPointer||binding.reviewStatus!=='field-target-reviewed'
      ||!binding.expectedTargetProof)pass8Dmg225Failure(binding,'exact reviewed target was omitted, relabeled, or left pending');
  }
  return {targets:targets.size,reviewed:targets.size};
}

function pass8Dmg225CheckPinnedReview(ref,binding){
  if(!ref||typeof ref.path!=='string'||typeof ref.sha256!=='string'||typeof ref.pointer!=='string')pass8Dmg225Failure(binding,'review source reference is malformed');
  const bytes=readFileSync(resolve(root,ref.path));
  if(sha(bytes)!==ref.sha256)pass8Dmg225Failure(binding,`review source ${ref.path} hash is stale`);
  let report;
  try{report=JSON.parse(bytes.toString('utf8'));}catch{pass8Dmg225Failure(binding,`review source ${ref.path} is not JSON`);}
  const target=pass8Dmg225ReviewPointer(report,ref.pointer);
  if(!target||typeof target!=='object'||Array.isArray(target))pass8Dmg225Failure(binding,`review pointer ${ref.path}${ref.pointer} is missing`);
  return target;
}

/**
 * Closed guard for the exact 29 reviewed DMG p.225 field targets. It binds the
 * current authored owner, field/source-object pointers, source value snapshot,
 * ordered reviewed regions, and the exact page-group default order. It checks
 * target location only; it never upgrades a source-value or default grade.
 */
export function assertPass8Dmg225FieldTargetProof(binding,{
  item,
  target,
  sourceObject,
  sourceOwner,
  sourceObjectPointer,
  catalog,
  authoredOwner,
}={}){
  const key=[binding?.collection,binding?.itemId,binding?.fieldPointer].join('\\0');
  const targetRef=pass8Dmg225TargetMap().get(key);
  if(!targetRef)return false;
  // Legacy and explicitly scoped inventory fixtures can mention these source
  // fields without carrying the current reviewed manual-binding set. The
  // canonical builder separately requires all 29 new proofs as a closed set.
  if(!binding.expectedTargetProof&&binding.reviewStatus!=='field-target-reviewed')return false;
  const {index,mapping,reviewed}=targetRef;
  const fail=message=>pass8Dmg225Failure(binding,message);
  const proof=binding.expectedTargetProof;
  if(!pass8Dmg225IsJsonSafe(binding)||!pass8Dmg225IsJsonSafe(proof)||!pass8Dmg225IsJsonSafe(target)
    ||!pass8Dmg225IsJsonSafe(sourceOwner)||!pass8Dmg225IsJsonSafe(sourceObject)||!pass8Dmg225IsJsonSafe(catalog))
    fail('target proof/input contains non-JSON data');
  const proofKeys=['schemaVersion','artifactType','targetIndex','owner','fieldPointer','sourceObjectPointer','sourceCategory','sourceObjectLabel',
    'authoredOwnerCanonicalSha256','fieldValueSha256','sourceObjectSnapshotSha256','targetSnapshotSha256','sourceRowIds',
    'expectedRegionEvidence','orderedContext','pageGroupOrder','reviewEvidence','continuationGroup','sourceValueGrade','defaultAssessment','browserRouting'];
  if(!proof||typeof proof!=='object'||Array.isArray(proof)||canonical(Object.keys(proof).sort())!==canonical([...proofKeys].sort()))fail('proof is missing or has an open schema');
  if(proof.schemaVersion!==1||proof.artifactType!=='pass8-dmg225-exact-field-target-proof'||proof.targetIndex!==index)fail('proof schema or target index changed');
  const expectedOwner={collection:mapping.owner.collection,itemId:mapping.owner.itemId};
  if(canonical(proof.owner)!==canonical(expectedOwner)||binding.collection!==expectedOwner.collection||binding.itemId!==expectedOwner.itemId
    ||canonical(sourceOwner)!==canonical(expectedOwner)||canonical(binding.sourceOwner)!==canonical(expectedOwner))fail('owner identity is borrowed, stale, or differs from the reviewed target');
  if(binding.fieldPointer!==mapping.fieldPointer||proof.fieldPointer!==mapping.fieldPointer
    ||binding.sourceObjectPointer!==mapping.sourceObjectPointer||sourceObjectPointer!==mapping.sourceObjectPointer
    ||proof.sourceObjectPointer!==mapping.sourceObjectPointer)fail('field/source-object pointer differs from the reviewed target');
  if(binding.sourceCategory!=='equipment-field'||proof.sourceCategory!=='equipment-field')fail('source category differs from the reviewed equipment field');
  if(!item||item.id!==expectedOwner.itemId)fail('current target owner does not resolve');
  const rawOwner=authoredOwner??readJson('equipment.json').equipment.find(candidate=>candidate.id===expectedOwner.itemId);
  if(!rawOwner||rawOwner.id!==expectedOwner.itemId)fail('authored current owner is missing or mismatched');
  const ownerCanonicalSha256=sha(canonical(rawOwner));
  if(proof.authoredOwnerCanonicalSha256!==ownerCanonicalSha256||ownerCanonicalSha256!==reviewed.currentRawEquipmentOwnerCanonicalSha256)fail('authored owner snapshot is stale');
  if(target===undefined||canonical(target)!==canonical(mapping.currentValue))fail('current field value differs from the reviewed value snapshot');
  const fieldValueSha256=sha(canonical(target));
  if(proof.fieldValueSha256!==fieldValueSha256||fieldValueSha256!==sha(canonical(mapping.currentValue)))fail('field value hash differs from the exact reviewed value');
  const actualSourceObject=valueAtPointer(rawOwner,mapping.sourceObjectPointer);
  const liveSourceObject=valueAtPointer(item,mapping.sourceObjectPointer);
  if(!actualSourceObject||typeof actualSourceObject!=='object'||Array.isArray(actualSourceObject)
    ||!liveSourceObject||typeof liveSourceObject!=='object'||Array.isArray(liveSourceObject)
    ||canonical(semanticValueSnapshot(actualSourceObject))!==canonical(semanticValueSnapshot(liveSourceObject))
    ||canonical(semanticValueSnapshot(sourceObject))!==canonical(semanticValueSnapshot(liveSourceObject)))fail('current source-object snapshot differs from its authored owner/pointer');
  const sourceObjectSnapshotSha256=sha(canonical(actualSourceObject));
  if(proof.sourceObjectSnapshotSha256!==sourceObjectSnapshotSha256)fail('source-object snapshot hash is stale');
  if(proof.sourceObjectLabel!==mapping.sourceObject||binding.sourceObject!==mapping.sourceObject)fail('source-object label differs from the reviewed target');
  if(binding.reviewStatus!=='field-target-reviewed'||binding.valueReview||binding.sourceValueStatus!=='not-assessed-by-field-target-review'
    ||proof.sourceValueGrade!=='NOT_PROMOTED')fail('field-location review must not promote or replace the existing source-value grade');
  const expectedDefaultAssessment=index===28
    ? 'not-approved; existing default defect remains recorded and is not transferred'
    : 'not-approved; current default is pinned only as a drift guard';
  if(proof.defaultAssessment!==expectedDefaultAssessment)fail('default selection must remain unapproved');
  if(proof.browserRouting!=='pending')fail('browser-routing state must remain pending');
  const sourceRowIds=mapping.sourceRows.map(row=>row.sourceUnitId);
  if(!Array.isArray(binding.sourceRowIds)||canonical(binding.sourceRowIds)!==canonical(sourceRowIds)
    ||canonical(proof.sourceRowIds)!==canonical(sourceRowIds))fail('source row identity list differs from the reviewed source rows');
  const currentValueIdentity={owner:expectedOwner,fieldPointer:mapping.fieldPointer,sourceObjectPointer:mapping.sourceObjectPointer,
    sourceCategory:'equipment-field',sourceObjectLabel:mapping.sourceObject,authoredOwnerCanonicalSha256:ownerCanonicalSha256,
    fieldValueSha256,sourceObjectSnapshotSha256,sourceRowIds};
  if(proof.targetSnapshotSha256!==sha(canonical(currentValueIdentity)))fail('exact owner/pointer/value/source-object snapshot proof is stale');
  if(!catalog||binding.catalog!==`scans/verified/equipment-${expectedOwner.itemId}.json`)fail('catalog is not the exact selected owner catalog');
  const regionIds=(binding.regionIds||[]).map(id=>id);
  const orderedContext=proof.orderedContext;
  const orderedContextKeys=['regionIds','sourceRowIds','regions'];
  if(!orderedContext||canonical(Object.keys(orderedContext).sort())!==canonical([...orderedContextKeys].sort())
    ||canonical(orderedContext.regionIds)!==canonical(regionIds)||!regionIds.length)fail('ordered field-specific context differs from the exact target selection');
  if(!Array.isArray(orderedContext.sourceRowIds)||canonical(orderedContext.sourceRowIds)!==canonical(sourceRowIds))fail('ordered context source-row identities differ from the reviewed source rows');
  const primaryIndices=[];
  const actualEvidence=regionIds.map((id,regionIndex)=>{
    const region=catalog.regions?.find(candidate=>candidate.id===id);
    if(!region)fail(`selected region ${id} is absent from the owner catalog`);
    const hashEvidence={regionId:id,sourceSha256:regionSourceSha256(catalog,region),imageSha256:region.sha256,...sourceVisualRegionHashes(region)};
    const contextRegion=orderedContext.regions?.[regionIndex];
    const contextRegionKeys=['regionId','role','sourceRowIds','evidence'];
    if(!contextRegion||canonical(Object.keys(contextRegion).sort())!==canonical([...contextRegionKeys].sort())
      ||contextRegion.regionId!==id||contextRegion.role!==region.role||canonical(contextRegion.evidence)!==canonical(hashEvidence)
      ||!Array.isArray(contextRegion.sourceRowIds))fail(`ordered context evidence is stale for ${id}`);
    if(region.role==='row')primaryIndices.push(regionIndex);
    return hashEvidence;
  });
  if(canonical(proof.expectedRegionEvidence)!==canonical(actualEvidence)||canonical(binding.expectedRegionEvidence)!==canonical(actualEvidence))fail('approved expected-region evidence is missing, stale, or borrowed');
  if(index<28){
    if(primaryIndices.length!==sourceRowIds.length)fail('source row count does not match the selected primary row components');
    const projected=orderedContext.regions.map(region=>region.sourceRowIds);
    for(let rowIndex=0;rowIndex<projected.length;rowIndex++){
      const expectedRows=primaryIndices.includes(rowIndex)?[sourceRowIds[primaryIndices.indexOf(rowIndex)]]:[];
      if(canonical(projected[rowIndex])!==canonical(expectedRows))fail(`source row IDs do not align with selected component ${regionIds[rowIndex]}`);
    }
  }else if(orderedContext.regions.some(region=>region.sourceRowIds.length)||sourceRowIds.length)fail('prose field must not invent table source-row IDs');
  const pageReceipt=pass8Dmg225PageGroupReceipt().targets[index];
  const catalogBytes=readFileSync(resolve(root,`dist/${binding.catalog}`));
  if(sha(catalogBytes)!==pageReceipt.afterCatalogSha256)fail('owner catalog bytes differ from the independently reviewed after-state receipt');
  const diskCatalog=JSON.parse(catalogBytes.toString('utf8'));
  if(canonical(catalog)!==canonical(diskCatalog))fail('caller-supplied catalog differs from the repository-pinned catalog bytes');
  const catalogPageOrder=pass8Dmg225PageGroup(catalog,'DMG',225);
  const expectedPageGroup=proof.pageGroupOrder;
  const receiptBefore=pass8Dmg225ReceiptGroupProjection(pageReceipt.before);
  const receiptAfter=pass8Dmg225ReceiptGroupProjection(pageReceipt.after);
  const pageGroupKeys=['book','printedPage','previousDefaultRegionId','previousOrderedRegionIds','previousOrderSha256','orderedRegionIds','defaultRegionId','defaultOrderSha256','orderedEvidence'];
  if(!expectedPageGroup||canonical(Object.keys(expectedPageGroup).sort())!==canonical([...pageGroupKeys].sort()))fail('page-group default proof is missing or open');
  if(canonical(catalogPageOrder)!==canonical(receiptAfter))fail('current DMG p.225 page-group differs from the immutable independently reviewed after-state receipt');
  if(expectedPageGroup.book!=='DMG'||expectedPageGroup.printedPage!==225
    ||expectedPageGroup.previousDefaultRegionId!==receiptBefore.defaultRegionId
    ||canonical(expectedPageGroup.previousOrderedRegionIds)!==canonical(receiptBefore.orderedRegionIds)
    ||expectedPageGroup.previousOrderSha256!==receiptBefore.defaultOrderSha256
    ||expectedPageGroup.defaultRegionId!==receiptAfter.defaultRegionId
    ||canonical(expectedPageGroup.orderedRegionIds)!==canonical(receiptAfter.orderedRegionIds)
    ||expectedPageGroup.defaultOrderSha256!==receiptAfter.defaultOrderSha256
    ||canonical(expectedPageGroup.orderedEvidence)!==canonical(receiptAfter.orderedEvidence)
    ||receiptBefore.defaultRegionId!==receiptAfter.defaultRegionId)
    fail('page-group proof does not match the immutable before/after drift receipt; defaults remain unapproved');
  const priorIds=receiptBefore.orderedRegionIds;
  const currentPriorIds=catalogPageOrder.orderedRegionIds.filter(id=>priorIds.includes(id));
  if(canonical(currentPriorIds)!==canonical(priorIds))fail('an A46 page-group region was removed or reordered');
  const reviewEvidence=proof.reviewEvidence;
  if(!Array.isArray(reviewEvidence)||reviewEvidence.length<2)fail('pinned author and independent-review evidence is incomplete');
  const expectedReviewEvidence=[
    {kind:'author-proposal',path:PASS8_DMG225_AUTHOR_PATH,sha256:PASS8_DMG225_AUTHOR_SHA256,pointer:`/mappings/${index}`},
    {kind:'field-independent-review',path:PASS8_DMG225_FIELD_REVIEW_PATH,sha256:PASS8_DMG225_FIELD_REVIEW_SHA256,pointer:`/cases/${index}`},
    ...(index===28?[
      {kind:'tools-lead-component-review',path:PASS8_DMG225_TOOLS_LEAD_REVIEW_PATH,sha256:PASS8_DMG225_TOOLS_LEAD_REVIEW_SHA256,pointer:''},
      {kind:'tools-alias-order-review',path:PASS8_DMG225_TOOLS_ORDER_REVIEW_PATH,sha256:PASS8_DMG225_TOOLS_ORDER_REVIEW_SHA256,pointer:''},
    ]:[]),
  ];
  if(canonical(reviewEvidence)!==canonical(expectedReviewEvidence))fail('review source references differ from the fixed current-root allowlist');
  const byKind=new Map();
  for(const ref of expectedReviewEvidence)byKind.set(ref.kind,pass8Dmg225CheckPinnedReview(ref,binding));
  const authorRef=reviewEvidence.find(ref=>ref.kind==='author-proposal');
  const fieldRef=reviewEvidence.find(ref=>ref.kind==='field-independent-review');
  if(authorRef?.path!==PASS8_DMG225_AUTHOR_PATH||authorRef.sha256!==PASS8_DMG225_AUTHOR_SHA256||authorRef.pointer!==`/mappings/${index}`
    ||fieldRef?.path!==PASS8_DMG225_FIELD_REVIEW_PATH||fieldRef.sha256!==PASS8_DMG225_FIELD_REVIEW_SHA256||fieldRef.pointer!==`/cases/${index}`)fail('author/independent field-review pointer does not match this target');
  const authorRecord=byKind.get('author-proposal'),fieldRecord=byKind.get('field-independent-review');
  if(authorRecord?.owner?.collection!==expectedOwner.collection||authorRecord.owner?.itemId!==expectedOwner.itemId
    ||authorRecord.fieldPointer!==mapping.fieldPointer||authorRecord.sourceObjectPointer!==mapping.sourceObjectPointer
    ||fieldRecord?.collection!==expectedOwner.collection||fieldRecord.itemId!==expectedOwner.itemId
    ||fieldRecord.fieldPointer!==mapping.fieldPointer||fieldRecord.sourceObjectPointer!==mapping.sourceObjectPointer
    ||fieldRecord.currentValue!==mapping.currentValue)fail('pinned review pointer does not prove this owner, pointers, and current value');
  if(index<28){
    if(fieldRecord.decision!=='accepted'||fieldRecord.componentAssessments?.targetLocation!=='accepted'
      ||fieldRecord.componentAssessments?.targetFocus!=='accepted'
      ||!String(fieldRecord.componentAssessments?.necessaryContext||'').includes('accepted')
      ||fieldRecord.componentAssessments?.numericAndSourceValueGrade!=='NOT_PROMOTED')fail('table field review no longer accepts only the exact location/focus/context');
    const acceptedEvidence=fieldRecord.acceptedRegionEvidence||[];
    if(canonical(acceptedEvidence)!==canonical(actualEvidence)
      ||canonical(fieldRecord.proposedFieldOrderedRegionIds)!==canonical(regionIds))fail('reviewed table region evidence/order differs from the active field target');
    if(proof.continuationGroup!==null)fail('table target must not borrow a prose continuation group');
    if(canonical(proof.reviewEvidence)!==canonical([
      {kind:'author-proposal',path:PASS8_DMG225_AUTHOR_PATH,sha256:PASS8_DMG225_AUTHOR_SHA256,pointer:`/mappings/${index}`},
      {kind:'field-independent-review',path:PASS8_DMG225_FIELD_REVIEW_PATH,sha256:PASS8_DMG225_FIELD_REVIEW_SHA256,pointer:`/cases/${index}`},
    ]))fail('table target review evidence reference set changed');
  }else{
    const leadRef=reviewEvidence.find(ref=>ref.kind==='tools-lead-component-review');
    const orderRef=reviewEvidence.find(ref=>ref.kind==='tools-alias-order-review');
    const leadRecord=byKind.get('tools-lead-component-review'),orderRecord=byKind.get('tools-alias-order-review');
    if(fieldRecord.decision!=='rejected'||fieldRecord.componentAssessments?.targetLocation!=='accepted'
      ||!String(fieldRecord.componentAssessments?.necessaryContext||'').includes('accepted')
      ||fieldRecord.componentAssessments?.numericAndSourceValueGrade!=='NOT_PROMOTED')fail('original tools field-review boundary changed');
    if(leadRef?.path!==PASS8_DMG225_TOOLS_LEAD_REVIEW_PATH||leadRef.sha256!==PASS8_DMG225_TOOLS_LEAD_REVIEW_SHA256
      ||leadRef.pointer!==''||orderRef?.path!==PASS8_DMG225_TOOLS_ORDER_REVIEW_PATH
      ||orderRef.sha256!==PASS8_DMG225_TOOLS_ORDER_REVIEW_SHA256||orderRef.pointer!=='')fail('tools component/order review references are incomplete or borrowed');
    const expectedToolsIds=['pass8-dmg225-thieves-tools-exclusion-lead-in','pass8-dmg225-thieves-tools-exclusion-list-item'];
    if(orderRecord?.status!=='accepted-bounded-source-component-and-ordered-context-only; activation-and-browser-routing-pending'
      ||orderRecord.acceptedGroup?.id!==PASS8_DMG225_TOOLS_GROUP_ID||orderRecord.acceptedGroup?.canonicalSha256!==PASS8_DMG225_TOOLS_GROUP_SHA256
      ||canonical(orderRecord.acceptedGroup?.requiredRegionIds)!==canonical(expectedToolsIds)
      ||leadRecord?.status!=='accepted-at-component-scope-after-declared-DPI-replay'
      ||canonical(orderedContext.regionIds)!==canonical(expectedToolsIds))fail('tools ordered-context approval or remaining gates changed');
    const toolComponents=[leadRecord.acceptedRegionEvidence,orderRecord.acceptedRegionEvidence];
    if(canonical(toolComponents)!==canonical(actualEvidence))fail('tools field target is not bound to the exact independently accepted lead and alias hashes');
    const manifest=readJson('research/citation-continuations.json');
    const groups=(manifest.groups||[]).filter(group=>group.id===PASS8_DMG225_TOOLS_GROUP_ID);
    if(groups.length!==1||sha(canonical(groups[0]))!==PASS8_DMG225_TOOLS_GROUP_SHA256
      ||canonical(groups[0].requiredRegionIds)!==canonical(expectedToolsIds)
      ||canonical(groups[0].segments?.map(segment=>segment.regionId))!==canonical(expectedToolsIds))fail('tools continuation group differs from the exact root-accepted group');
    if(proof.continuationGroup?.id!==PASS8_DMG225_TOOLS_GROUP_ID||proof.continuationGroup?.canonicalSha256!==PASS8_DMG225_TOOLS_GROUP_SHA256
      ||canonical(proof.continuationGroup?.requiredRegionIds)!==canonical(expectedToolsIds))fail('tools target proof does not pin the exact ordered continuation group');
    if(canonical(proof.reviewEvidence)!==canonical([
      {kind:'author-proposal',path:PASS8_DMG225_AUTHOR_PATH,sha256:PASS8_DMG225_AUTHOR_SHA256,pointer:`/mappings/${index}`},
      {kind:'field-independent-review',path:PASS8_DMG225_FIELD_REVIEW_PATH,sha256:PASS8_DMG225_FIELD_REVIEW_SHA256,pointer:`/cases/${index}`},
      {kind:'tools-lead-component-review',path:PASS8_DMG225_TOOLS_LEAD_REVIEW_PATH,sha256:PASS8_DMG225_TOOLS_LEAD_REVIEW_SHA256,pointer:''},
      {kind:'tools-alias-order-review',path:PASS8_DMG225_TOOLS_ORDER_REVIEW_PATH,sha256:PASS8_DMG225_TOOLS_ORDER_REVIEW_SHA256,pointer:''},
    ]))fail('tools source review reference set changed');
  }
  const expectedTargetReview= index===28
    ? {status:'confirmed',independent:true,scope:'exact encumbrance-exclusion field location and root-accepted ordered source context only; no source-value, mechanics, default, or browser-routing approval',evidence:PASS8_DMG225_TOOLS_ORDER_REVIEW_PATH,evidenceSha256:PASS8_DMG225_TOOLS_ORDER_REVIEW_SHA256}
    : {status:'confirmed',independent:true,scope:'exact DMG p.225 field location, row focus, and necessary interpretation context only; no source-value, mechanics, or page-default approval',evidence:PASS8_DMG225_FIELD_REVIEW_PATH,evidenceSha256:PASS8_DMG225_FIELD_REVIEW_SHA256};
  if(canonical(binding.targetReview)!==canonical(expectedTargetReview))fail('target review identity/scope does not match the independent review record');
  return true;
}

export function attachSourceVisualReviewMetadata(data,{ledger=readJson('research/source-visual-reviews.json'),catalogs=catalogMap()}={}){
  const records=['rules','spells','equipment','matrices','classes'].flatMap(collection=>(data[collection]||[]).map(item=>({collection,item})));
  if(data.progressionExplainer){if(!data.progressionExplainer.id)data.progressionExplainer.id='progression-explainer';records.push({collection:'progressionExplainer',item:data.progressionExplainer});}
  const reviews=new Map();
  for(const review of ledger.reviews||[]){
    if(!review||!['rules','spells','equipment','matrices','classes','progressionExplainer'].includes(review.collection)
      ||typeof review.itemId!=='string'||!review.itemId.trim()
      ||!['sourceExcerpts','scanVerification'].includes(review.binding)
      ||typeof review.regionId!=='string'||!review.regionId.trim())throw new Error('Source visual review requires a collection, item owner, binding and region identity');
    const key=[review.collection,review.itemId,review.binding,review.regionId].join('|');
    if(reviews.has(key))throw new Error(`Duplicate source visual review ${key}`);
    reviews.set(key,review);
  }
  for(const {collection,item} of records) for(const bindingName of ['sourceExcerpts','scanVerification']){
    const binding=item[bindingName];
    if(!binding?.catalog)continue;
    const catalog=catalogs.get(binding.catalog);
    if(!catalog)throw new Error(`Source visual review catalog missing for ${collection}:${item.id}/${bindingName}: ${binding.catalog}`);
    binding.regionReviews=(catalog.regions||[]).map(region=>{
      const key=[collection,item.id,bindingName,region.id].join('|');
      const recorded=reviews.get(key)||null;
      const sourceSha256=regionSourceSha256(catalog,region);
      const {focusSha256,contentSha256}=sourceVisualRegionHashes(region);
      const hashes={sourceSha256,imageSha256:region.sha256,focusSha256,contentSha256};
      const matches=!!recorded&&recorded.sourceSha256===sourceSha256&&recorded.imageSha256===region.sha256&&recorded.focusSha256===focusSha256&&recorded.contentSha256===contentSha256;
      const assessment=recorded?.assessments?.highlight??null;
      const sentinel=(region.focusRects||[]).some(rect=>Array.isArray(rect)&&rect.length===4&&rect[0]===0&&rect[1]===0&&rect[2]===1&&rect[3]===1);
      const accepted=matches&&assessment?.independent===true&&typeof assessment.evidence==='string'&&!!assessment.evidence.trim()&&['confirmed','defect','exception'].includes(assessment.status)&&!(sentinel&&assessment.status==='confirmed');
      const status=accepted?'current-reviewed':recorded&&!matches?'stale':sentinel?'unreviewed-full-image-sentinel':'unreviewed';
      const review=accepted?{
        status:assessment.status,independent:true,evidence:assessment.evidence,
        ...(assessment.scope!==undefined?{scope:assessment.scope}:recorded.scope!==undefined?{scope:recorded.scope}:{}),
        ...(assessment.kind!==undefined?{kind:assessment.kind}:recorded.kind!==undefined?{kind:recorded.kind}:{}),
      }:null;
      return {
        regionId:region.id,status,sentinel,...hashes,review,
        recordedReview:recorded?{
          status:assessment?.status??null,independent:assessment?.independent===true,
          evidence:assessment?.evidence??null,hashesMatch:matches,
          ...(assessment?.scope!==undefined?{scope:assessment.scope}:recorded.scope!==undefined?{scope:recorded.scope}:{}),
          ...(assessment?.kind!==undefined?{kind:assessment.kind}:recorded.kind!==undefined?{kind:recorded.kind}:{}),
        }:null,
      };
    });
  }
  return data;
}

const sources = [
  {id:'phb35-equipment-purchase', file:'research/price-source-inventory-phb35.json', reviewFile:'research/price-source-inventory-phb35-independent-review.json', category:'equipment-purchase-price', denominatorKind:'source-table-row'},
  {id:'phb36-equipment-supplies', file:'research/price-source-inventory-phb36.json', category:'equipment-purchase-price', denominatorKind:'source-table-row'},
  {id:'ua26-equipment-supplies', file:'research/price-source-inventory-ua26.json', category:'equipment-purchase-price', denominatorKind:'source-table-row'},
  {id:'dmg28-standard-hireling-rates', file:'research/price-source-inventory-dmg28.json', category:'hireling-wage', denominatorKind:'source-occupation-row', cellDenominatorKind:'printed-rate-cell'},
  {id:'dmg29-expert-hireling-rates', file:'research/price-source-inventory-dmg29.json', category:'hireling-wage', denominatorKind:'source-occupation-row'},
  {id:'dmg-services-construction', file:'research/price-source-inventory-dmg-services-construction.json', reviewFile:'research/price-source-inventory-dmg-services-independent-review.json', category:'service-fee-construction-cost-suggested-material-cost', denominatorKind:'source-table-row'},
  {id:'dmg-magic-item-sale-values', file:'research/price-source-inventory-dmg-magic-partial.json', reviewFile:'research/price-source-inventory-dmg-magic-independent-review.json', category:'magic-item-sale-value', denominatorKind:'source-table-row'},
  {id:'dmg-post125-screening', file:'research/price-source-inventory-dmg-post125-survey.json', category:'market-valuation-or-screening-finding', denominatorKind:'recorded-screening-finding'},
];

const auxiliarySources = [
  'research/price-source-inventory-dmg-scope.json',
  'research/price-source-inventory-dmg-post125-survey.json',
  'research/price-source-inventory-unmatched-semantic-review.json',
  'research/price-source-inventory-index.json',
  'research/price-source-inventory-phb-other-survey.md',
  'research/price-source-inventory-phb-dmg-other.json',
  'research/price-source-inventory-ua-other.json',
  'research/price-source-inventory-monster-books.json',
];

const sourceCensusFiles=[
  'research/price-source-inventory-phb-dmg-other.json',
  'research/price-source-inventory-ua-other.json',
  'research/price-source-inventory-monster-books.json',
];

const categoryFor = source => source.category;
const rawSourceFor = record => record.source || record.snapshot || {
  book:record.book,
  page:record.printedPage ?? record.page,
  pdfPage:record.pdfPage,
  sourceSha256:record.sourceSha256,
};
const pageFor = source => source.page ?? source.printedPage;
const valueFor = record => record.price ?? record.printedPrice ?? record.printedSaleValue ?? record.rate ?? record.printedValue ?? null;
const displaySourceObject = record => record.sourceObject ?? record.name ?? record.subject ?? record.topic ?? null;
const textMatchId = value => typeof value === 'string' ? value : value?.id ?? null;
const viewerCatalogFor = item => item?.sourceExcerpts?.catalog ?? item?.scanVerification?.catalog ?? null;

function canonicalBook(book) {
  const text=String(book??'').trim().toUpperCase();
  if(text==='PHB'||text.includes('PLAYER'))return 'PHB';
  if(text==='UA'||text.includes('ARCANA'))return 'UA';
  if(text==='DMG'||text.includes('DUNGEON'))return 'DMG';
  if(text==='MM'||text==='MONSTER MANUAL')return 'MM';
  if(text==='MM2'||text==='MMII'||text.includes('MONSTER MANUAL II'))return 'MM2';
  return null;
}

function sourcePdfPage(book,page) {
  const code=canonicalBook(book);
  if(!Number.isInteger(page)||page<1)return null;
  if(code==='PHB'||code==='UA'||code==='MM')return page+1;
  if(code==='DMG')return page<=174?page+1:page>=176&&page<=238?page:null;
  if(code==='MM2')return page===83?92:page>=84&&page<=91?page:page+1;
  return null;
}

function derivePrintedPageFromPdf(book,pdfPage) {
  const code=canonicalBook(book);
  const bookInfo=books.books?.[code];
  if(!code||!bookInfo||!Number.isInteger(pdfPage))return null;
  const matches=[];
  for(let printedPage=1;printedPage<=bookInfo.lastPage;printedPage++){
    if(books.availability(code,printedPage)==='available'&&books.pdfPage(code,printedPage)===pdfPage)matches.push(printedPage);
  }
  if(matches.length!==1)return null;
  return {
    printedPage:matches[0],
    mappingBasis:{kind:'inverse-books-js-page-map',file:'dist/books.js',fileSha256:BOOKS_JS_SHA256,book:code,rule:bookInfo.mapping,uniqueMatch:true},
  };
}

function censusPageWithMapping(page,bookFallback) {
  const book=canonicalBook(page.bookKey??page.book??bookFallback);
  if(Number.isInteger(page.printedPage)){
    const result=pageMappingResult(book,page.printedPage,page.pdfPage);
    return {...page,printedPageMappingStatus:result.status,mappingBasis:{kind:'observed-printed-page',book,file:page.sourceFile??null}};
  }
  const derived=derivePrintedPageFromPdf(book,page.pdfPage);
  if(derived)return {...page,derivedPrintedPage:derived.printedPage,mappingBasis:derived.mappingBasis,printedPageMappingStatus:'mapping-derivable-not-visually-read'};
  const reason=book==='DMG'&&(page.pdfPage===239||page.pdfPage===240)?'unverified-dmg-terminal-page':
    'outside-verified-printed-page-map';
  return {...page,printedPageMappingStatus:'unresolved-boundary-or-unverified',mappingBasis:{kind:'no-unique-printed-page-from-books-js-map',book,file:'dist/books.js',fileSha256:BOOKS_JS_SHA256,reason}};
}

function censusPages(artifact) {
  if(Array.isArray(artifact?.pageCensus))return artifact.pageCensus;
  if(Array.isArray(artifact?.pageCensus?.pages))return artifact.pageCensus.pages;
  return [];
}

function normalizeCensusClaim(record) {
  const source=record?.sourcePassage??record?.source??record?.sourceReference??{};
  const sourcePages=Array.isArray(record?.sourcePages)?record.sourcePages:[];
  const book=record?.book??record?.bookKey??source?.book??source?.bookKey??sourcePages[0]?.bookKey??sourcePages[0]?.book??null;
  const pages=record?.printedPages??record?.pages??source?.printedPages??source?.pages??(sourcePages.length?sourcePages.map(page=>page.printedPage).filter(Number.isInteger):Number.isInteger(record?.printedPage)?[record.printedPage]:Number.isInteger(source?.printedPage)?[source.printedPage]:[]);
  return {
    sourceObject:record?.subject??record?.sourceObjectOrPassage??record?.sourceObject??record?.name??record?.title??record?.label??null,
    amountOrFormula:record?.amountOrFormula??record?.printedValue??record?.value??record?.formula??record?.locatorAmountCue??record?.discoverySummary??null,
    currency:record?.currency??record?.currencyLabel??null,
    unit:record?.unit??record?.unitQualifier??record?.qualification??null,
    sourceCategory:record?.claimType??record?.category??record?.classification??null,
    sourcePages:{book,pages:Array.isArray(pages)?pages:[],pdfPages:record?.pdfPages??source?.pdfPages??(sourcePages.length?sourcePages.map(page=>page.pdfPage).filter(Number.isInteger):Number.isInteger(record?.pdfPage)?[record.pdfPage]:Number.isInteger(source?.pdfPage)?[source.pdfPage]:[])},
    reviewStatus:record?.reviewStatus??record?.sourceReviewStatus??record?.visualReviewStatus??record?.status??record?.disposition??'discovery-only-not-source-value-reviewed',
  };
}

function buildSourcePageCensuses() {
  return sourceCensusFiles.filter(existsSync).map(sourceFile=>{
    const artifact=readJson(sourceFile);
    const pages=censusPages(artifact);
    const sources=artifact.sources??(artifact.source?[artifact.source]:[]);
    const rawClaims=artifact.claims??artifact.records??[];
    const pageDenominator=artifact.denominators?.sourcePdfPages??artifact.denominators?.pdfPages??pages.length;
    const bookCounts={};
    for(const page of pages){const book=canonicalBook(page.bookKey??page.book??sources[0]?.book??'');const key=book??String(page.book??page.bookKey??'unknown');bookCounts[key]=(bookCounts[key]||0)+1;}
    return {
      id:basename(sourceFile,'.json').replace('price-source-inventory-',''),
      sourceFiles:[sourceFile],
      sourceFileSha256:hashFile(sourceFile),
      sourceIdentity:sources.map(source=>({book:canonicalBook(source.book??source.bookKey??source.title),title:source.title??source.book??null,sourceSha256:source.sha256??source.sourceSha256??null,pdfPages:source.pdfPages??source.pdfPageCount??null})),
      scope:artifact.scope??null,
      screening:artifact.screening??artifact.screeningMethod??null,
      reportedDenominators:artifact.denominators??null,
      denominator:[{kind:'PDF-page',count:pageDenominator}],
      pageCensus:{denominator:{kind:'PDF-page',count:pageDenominator},pages:pages.map(page=>censusPageWithMapping(page,page.bookKey??page.book??sources[0]?.book??sources[0]?.title)),perBook:artifact.denominators?.perBook??bookCounts},
      claims:rawClaims.map(normalizeCensusClaim),
      tableGroups:artifact.tableGroups??artifact.monetaryGroups??[],
      exclusions:artifact.exclusions??artifact.excluded??[],
      unresolved:artifact.unresolved??artifact.unresolvedCandidates??[],
      limitations:artifact.limitations??[],
      relatedInventories:artifact.relatedInventories??artifact.relatedInventory??[],
      supplementalPageCensus:artifact.supplementalImagePageCensus??[],
      sourceArtifact:artifact,
    };
  });
}

function pageMappingResult(book,printedPage,pdfPage) {
  const code=canonicalBook(book);
  if(!code||!Number.isInteger(printedPage)||!Number.isInteger(pdfPage))return {status:'unassessable-missing-identity'};
  const expected=sourcePdfPage(code,printedPage);
  if(expected===null)return {status:code==='DMG'&&printedPage===175?'unassessable-known-missing-page':'unassessable-book-mapping'};
  return {status:expected===pdfPage?'mapping-consistent':'mapping-inconsistent',expectedPdfPage:expected};
}

function buildSourcePageMappingAudit(sourceInventories,sourceCensuses) {
  const bounded={total:0,assessable:0,consistent:0,inconsistent:0,unassessable:0,issues:[]};
  for(const inventory of sourceInventories)for(const row of inventory.sourceRows){
    bounded.total++;
    const book=row.source?.book,printedPage=row.source?.page??row.source?.printedPage,pdfPage=row.source?.pdfPage;
    const result=pageMappingResult(book,printedPage,pdfPage);
    if(result.status==='mapping-consistent'){bounded.assessable++;bounded.consistent++;}
    else if(result.status==='mapping-inconsistent'){bounded.assessable++;bounded.inconsistent++;bounded.issues.push({sourceFile:inventory.sourceFiles[0],recordId:row.id,sourceObject:row.sourceObject,book,printedPage,pdfPage,...result});}
    else bounded.unassessable++;
  }
  const pageCensus={total:0,assessable:0,consistent:0,inconsistent:0,derivable:0,unassessable:0,byBook:{},issues:[]};
  for(const census of sourceCensuses)for(const page of census.pageCensus.pages){
    pageCensus.total++;
    const book=canonicalBook(page.bookKey??page.book??census.sourceIdentity[0]?.book);
    const bookCounts=pageCensus.byBook[book]??={total:0,observedPrintedPage:0,consistent:0,inconsistent:0,derivableNotVisuallyRead:0,unresolvedBoundaryOrUnverified:0};
    bookCounts.total++;
    if(Number.isInteger(page.printedPage)){
      const result=pageMappingResult(book,page.printedPage,page.pdfPage);
      bookCounts.observedPrintedPage++;
      if(result.status==='mapping-consistent'){pageCensus.assessable++;pageCensus.consistent++;bookCounts.consistent++;}
      else if(result.status==='mapping-inconsistent'){pageCensus.assessable++;pageCensus.inconsistent++;bookCounts.inconsistent++;pageCensus.issues.push({sourceFile:census.sourceFiles[0],book,printedPage:page.printedPage,pdfPage:page.pdfPage,...result});}
      else {pageCensus.unassessable++;bookCounts.unresolvedBoundaryOrUnverified++;}
    } else if(page.printedPageMappingStatus==='mapping-derivable-not-visually-read'&&Number.isInteger(page.derivedPrintedPage)){
      pageCensus.derivable++;
      bookCounts.derivableNotVisuallyRead++;
    } else {
      pageCensus.unassessable++;
      bookCounts.unresolvedBoundaryOrUnverified++;
    }
  }
  const excludedOrUnresolved=[];
  for(const census of sourceCensuses){
    for(const [listName,list] of [['exclusions',census.exclusions],['unresolved',census.unresolved]])for(const record of Array.isArray(list)?list:[]){
      const book=record.book??record.bookKey??record.source?.book??record.source?.bookKey;
      const printedPage=record.printedPage??record.source?.printedPage;
      const pdfPage=record.pdfPage??record.source?.pdfPage;
      if(!Number.isInteger(printedPage)||!Number.isInteger(pdfPage))continue;
      const result=pageMappingResult(book,printedPage,pdfPage);
      if(result.status==='mapping-inconsistent')excludedOrUnresolved.push({sourceFile:census.sourceFiles[0],recordType:listName,subject:record.subject??record.sourceObject??record.name??null,book:canonicalBook(book),printedPage,pdfPage,...result});
    }
  }
  const auxiliary={total:0,assessable:0,consistent:0,inconsistent:0,unassessable:0,issues:[]};
  for(const file of auxiliarySources.filter(file=>file.endsWith('.json')&&!sourceCensusFiles.includes(file)&&existsSync(resolve(root,file)))){
    const document=readJson(file);
    const bookHint=/dmg/i.test(file)?'DMG':null;
    const walk=(value,pointer='')=>{
      if(!value||typeof value!=='object')return;
      if(Array.isArray(value)){value.forEach((child,index)=>walk(child,`${pointer}/${index}`));return;}
      const printedPage=value.printedPage??value.source?.printedPage;
      const pdfPage=value.pdfPage??value.source?.pdfPage;
      if(Number.isInteger(printedPage)&&Number.isInteger(pdfPage)){
        auxiliary.total++;
        const book=value.book??value.bookKey??value.source?.book??value.source?.bookKey??bookHint;
        const result=pageMappingResult(book,printedPage,pdfPage);
        if(result.status==='mapping-consistent'){auxiliary.assessable++;auxiliary.consistent++;}
        else if(result.status==='mapping-inconsistent'){auxiliary.assessable++;auxiliary.inconsistent++;auxiliary.issues.push({sourceFile:file,pointer: pointer||'/',subject:value.subject??value.sourceObject??value.sourceObjectOrPassage??null,book:canonicalBook(book),printedPage,pdfPage,...result});}
        else auxiliary.unassessable++;
      }
      for(const [key,child] of Object.entries(value))walk(child,`${pointer}/${key}`);
    };
    walk(document);
  }
  return {scope:'Book mapping consistency only; no printed page is inferred when page identity is missing or the book mapping is unverified.',boundedSourceRows:bounded,pageCensusPages:pageCensus,auxiliaryPageRecords:auxiliary,unresolvedOrExcludedIssues:excludedOrUnresolved};
}

function rectValues(value) {
  const values=Array.isArray(value)?value:value&&typeof value==='object'?[value.x,value.y,value.width??value.w,value.height??value.h]:null;
  return Array.isArray(values)&&values.length===4&&values.every(Number.isFinite)?values:null;
}

function regionCropCoordinate(region) {
  if(region.sourceArtifactId){
    return {regionId:region.id,coordinateSpace:region.sourceCoordinateSpace??'supplement-image-pixels',format:'LTRB-half-open',rect:rectValues(region.sourceCropBoundsPx)};
  }
  if(region.boundsPdfPoints){
    return {regionId:region.id,coordinateSpace:'catalog-bounds-pdf-points-as-recorded',format:'x0-y0-x1-y1',rect:rectValues(region.boundsPdfPoints)};
  }
  const rect=rectValues(region.normalizedPageRect);
  if(rect) return {regionId:region.id,coordinateSpace:'rendered-source-page-normalized-top-left-xywh',format:'xywh',rect};
  return {regionId:region.id,coordinateSpace:null,format:null,rect:null};
}

function assemblyIdentityData(equipment) {
  const data={
    rules:readJson('rules.json').rules||[],
    classes:readJson('classes.json').classes||[],
    equipment,
    matrices:readJson('attack-matrices.json').matrices||[],
    spells:[],
  };
  for(const file of ['phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json'])data.spells.push(...(readJson(file).spells||[]));
  const progression=readJson('progression-overrides.json');
  if(progression.explainer)data.progressionExplainer={...progression.explainer,id:progression.explainer.id||'progression-explainer'};
  return data;
}

function applyAssemblyMetadata(equipment) {
  const citations=readJson('citation-overrides.json');
  const ambiguousIds=ambiguousItemOverrideIds(assemblyIdentityData(equipment));
  for(let index=0;index<equipment.length;index++){
    const item=equipment[index]={...equipment[index]};
    const referenceOverrides=collectionReferenceOverrides(citations.items,'equipment',item.id,ambiguousIds);
    appendOverrideReferences(item,referenceOverrides);
    const sourceExcerpts=collectionOverride(citations.sourceExcerpts,'equipment',item.id,ambiguousIds,{allowDeclaredCollection:true,mapName:'sourceExcerpts'});
    if(sourceExcerpts)item.sourceExcerpts=cloneOverrideJson(sourceExcerpts);
    const scanVerification=collectionOverride(citations.scanVerification,'equipment',item.id,ambiguousIds);
    if(scanVerification)item.scanVerification=cloneOverrideJson(scanVerification);
    const priceState=equipmentPriceStateOverride(citations.priceStates,'equipment',item.id);
    if(priceState)item.priceState=priceState;
  }
  return equipment;
}

function defaultBindingData(equipment) {
  const fileCollections={
    rules:'rules.json',classes:'classes.json',matrices:'attack-matrices.json',
    equipment:'equipment.json',
  };
  const data={};
  for(const [collection,file] of Object.entries(fileCollections)) data[collection]=collection==='equipment'?equipment:(readJson(file)[collection]||[]);
  const spellFiles=['phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json'];
  const spellMap=new Map();
  for(const file of spellFiles) for(const spell of readJson(file).spells||[]){
    const key=[spell.book,spell.class,spell.name.toLowerCase().replace(/[^a-z0-9]/g,'')].join(':');
    const prior=spellMap.get(key),detailed=Object.keys(spell.fields||{}).length>0||(spell.effect||[]).length>0;
    if(!prior||detailed){
      const merged={...prior,...spell};
      const aliases=[...new Set([...(prior?.aliases||[]),...(spell.aliases||[])])];
      if(aliases.length)merged.aliases=aliases;
      const shared=spell.classes||prior?.classes;
      if(shared?.length){merged.classes=shared;if(shared.length>1)merged.pages=[...new Set([...(spell.pages||[]),...(prior?.pages||[])])];}
      spellMap.set(key,merged);
    }
  }
  data.spells=[...spellMap.values()];
  const citations=readJson('citation-overrides.json'),progression=readJson('progression-overrides.json');
  const ambiguousIds=ambiguousItemOverrideIds(data,progression.explainer);
  for(const [collection,items] of Object.entries({rules:data.rules,spells:data.spells,classes:data.classes,equipment:data.equipment,matrices:data.matrices})) for(const item of items){
    const referenceOverrides=collectionReferenceOverrides(citations.items,collection,item.id,ambiguousIds);
    appendOverrideReferences(item,referenceOverrides);
    const excerpts=collectionOverride(citations.sourceExcerpts,collection,item.id,ambiguousIds,{allowDeclaredCollection:true,mapName:'sourceExcerpts'});
    if(excerpts)item.sourceExcerpts=cloneOverrideJson(excerpts);
    const scanVerification=collectionOverride(citations.scanVerification,collection,item.id,ambiguousIds);
    if(scanVerification)item.scanVerification=cloneOverrideJson(scanVerification);
    const priceState=equipmentPriceStateOverride(citations.priceStates,collection,item.id);
    if(priceState)item.priceState=priceState;
    const classOverride=classProgressionOverride(progression.classes,collection,item.id);
    if(classOverride)Object.assign(item,cloneOverrideJson(classOverride));
  }
  if(progression.explainer){
    data.progressionExplainer=progression.explainer;
    const explainerId='progression-explainer';
    const scanVerification=collectionOverride(citations.scanVerification,'progressionExplainer',explainerId,ambiguousIds);
    if(scanVerification)data.progressionExplainer.scanVerification=cloneOverrideJson(scanVerification);
    const excerpts=collectionOverride(citations.sourceExcerpts,'progressionExplainer',explainerId,ambiguousIds,{allowDeclaredCollection:true,mapName:'sourceExcerpts'});
    if(excerpts)data.progressionExplainer.sourceExcerpts=excerpts;
  }
  return data;
}

function geometryFrom(record, source) {
  const bounds = source.normalizedPageBounds ?? record.normalizedPageBounds ?? record.normalizedPageRect ?? record.originalBounds ?? null;
  if (!bounds) return null;
  const rect = Array.isArray(bounds) ? bounds : [bounds.x, bounds.y, bounds.width, bounds.height];
  return {
    coordinateSpace: 'rendered-source-page-normalized-top-left-xywh',
    rect,
    status: source.boundsStatus ?? record.boundsStatus ?? record.boundsVerdict ?? record.boundsStatus ?? 'provisional',
  };
}

function inventoryReviewFor(config, raw, index, review, sourceFresh, reviewFileFresh) {
  const reviewed = review?.records?.[index];
  const reviewData = reviewed ? {
    file: config.reviewFile,
    expectedInventorySha256: review.inventorySha256 ?? review.inventory,
    inventoryFresh: reviewFileFresh,
    verdict: reviewed.verdict ?? reviewed.valueVerdict ?? reviewed.siteVerdict ?? null,
    boundsVerdict: reviewed.boundsVerdict ?? null,
    siteVerdict: reviewed.siteVerdict ?? null,
    changes: reviewed.changes ?? [],
  } : null;
  const hasVisualTranscription = /visual|confirmed/i.test(raw.reviewStatus ?? raw.boundsVerdict ?? raw.siteMatch?.status ?? '');
  return {
    sourceValues: reviewed?.valueVerdict === 'confirmed' || reviewed?.verdict === 'confirmed'
      ? (reviewFileFresh ? 'independently-confirmed' : 'previously-confirmed-review-stale')
      : (hasVisualTranscription ? 'source-visually-transcribed' : 'source-review-pending'),
    sourceRowBounds: reviewed?.boundsVerdict === 'confirmed'
      ? (reviewFileFresh ? 'independently-confirmed' : 'previously-confirmed-review-stale')
      : (raw.source?.boundsStatus ?? raw.boundsStatus ?? 'provisional'),
    sourceInventoryFresh: sourceFresh,
    review: reviewData,
  };
}

function independentReviewMap(config) {
  if (!config.reviewFile || !existsSync(resolve(root, config.reviewFile))) return {review:null, fresh:false};
  const review = readJson(config.reviewFile);
  const inputHash = hashFile(config.file);
  const inventoryRef = typeof review.inventory==='string'
    ? (review.inventory.startsWith('research/') ? review.inventory : `research/${review.inventory}`)
    : null;
  const expected = review.inventorySha256;
  if (inventoryRef && expected) return {review, fresh:hashFile(inventoryRef)===expected};
  const fresh = typeof expected === 'string' && expected === inputHash;
  return {review, fresh};
}

function boundTargetReview(review){
  return review?{...review}:null;
}

const classXpRowIdentityValueKeys=['level','xp','book','pages','track'];
const classXpRowIdentityKeys=['kind','collection','itemId','fieldPointer','sourceObjectPointer','value'];
const classXpTargetReviewDocumentKeys=['artifactType','reviewedTargets','schemaVersion'];
const classXpTargetReviewTargetKeys=['expectedTargetIdentity','independent','regionEvidence','sourceEvidence','sourceValueGrade','status'];
const classXpTargetReviewSourceKeys=['path','pointer','sha256'];
const classXpTargetReviewRegionKeys=['contentSha256','focusSha256','imageSha256','regionId','sourceSha256'];

function isReviewedClassXpTarget(binding){
  if(binding?.reviewStatus!=='field-target-reviewed')return false;
  const isXpPath=binding.collection==='classes'&&typeof binding.fieldPointer==='string'&&binding.fieldPointer.startsWith('/xpRows/');
  return binding.sourceCategory==='class-xp-row'||(binding.collection==='classes'&&isXpPath);
}

function assertReviewedClassXpTargetIdentity(binding,{item,target,sourceOwner,sourceObjectPointer}){
  if(!isReviewedClassXpTarget(binding))return;
  const fail=message=>{throw new Error(`Reviewed class XP target ${binding.collection??'(missing collection)'}:${binding.itemId??'(missing item)'}${binding.fieldPointer??'(missing field pointer)'} ${message}`);};
  const xpPath=/^\/xpRows\/(0|[1-9]\d*)$/.exec(binding.fieldPointer??'');
  if(binding.collection!=='classes')fail('must use collection classes');
  if(!xpPath)fail('fieldPointer must identify exactly one /xpRows/N object');
  if(binding.sourceCategory!=='class-xp-row')fail('sourceCategory must be class-xp-row');
  if(typeof binding.sourceObjectPointer!=='string'||binding.sourceObjectPointer!==binding.fieldPointer||sourceObjectPointer!==binding.fieldPointer)fail('sourceObjectPointer must equal fieldPointer');
  if(!binding.sourceOwner||binding.sourceOwner.collection!=='classes'||binding.sourceOwner.itemId!==binding.itemId
      ||sourceOwner?.collection!=='classes'||sourceOwner?.itemId!==binding.itemId)fail('sourceOwner must exactly identify the routed classes item');
  if(binding.requiresRowEvidence!==true)fail('requiresRowEvidence must be true');
  if(!item||item.id!==binding.itemId||!target||typeof target!=='object'||Array.isArray(target))fail('does not resolve to a current XP row object');
  for(const key of classXpRowIdentityValueKeys)if(!Object.hasOwn(target,key))fail(`current XP row is missing ${key}`);
  if(!Number.isInteger(target.level)||target.level<1||!Number.isInteger(target.xp)||target.xp<0
      ||typeof target.book!=='string'||!target.book.trim()||!Array.isArray(target.pages)||!target.pages.length
      ||target.pages.some(page=>!Number.isInteger(page)||page<1)||typeof target.track!=='string'||!target.track.trim())fail('current XP row identity has invalid field types');
  const rowValue=Object.fromEntries(classXpRowIdentityValueKeys.map(key=>[key,target[key]]));
  const expected={kind:'class-xp-row',collection:'classes',itemId:binding.itemId,fieldPointer:binding.fieldPointer,sourceObjectPointer:binding.sourceObjectPointer,value:rowValue};
  const actual=binding.targetReview?.expectedTargetIdentity;
  if(!actual||typeof actual!=='object'||Array.isArray(actual)
      ||JSON.stringify(Object.keys(actual).sort())!==JSON.stringify([...classXpRowIdentityKeys].sort())
      ||!actual.value||typeof actual.value!=='object'||Array.isArray(actual.value)
      ||JSON.stringify(Object.keys(actual.value).sort())!==JSON.stringify([...classXpRowIdentityValueKeys].sort())
      ||canonical(actual)!==canonical(expected))fail('targetReview.expectedTargetIdentity does not exactly match its owner, pointers, and current {level,xp,book,pages,track} projection');

  const targetReview=binding.targetReview;
  if(targetReview?.status!=='confirmed'||targetReview.independent!==true)fail('target review must be independently confirmed');
  const evidencePath=targetReview?.evidence;
  if(typeof evidencePath!=='string'||!evidencePath.startsWith('research/')||evidencePath.split('/').includes('..')||!existsSync(resolve(root,evidencePath)))fail('target review evidence file is missing or outside research');
  if(typeof targetReview.evidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(targetReview.evidenceSha256)||targetReview.evidenceSha256!==hashFile(evidencePath))fail('target review evidence file is stale or lacks its recorded hash');
  let proof;
  try{proof=readJson(evidencePath);}catch{fail('target review evidence is not valid JSON');}
  if(!proof||typeof proof!=='object'||Array.isArray(proof)
      ||JSON.stringify(Object.keys(proof).sort())!==JSON.stringify([...classXpTargetReviewDocumentKeys].sort())
      ||proof.schemaVersion!==1||proof.artifactType!=='class-xp-row-target-review'||!Array.isArray(proof.reviewedTargets))fail('target review evidence must use the closed class-xp-row-target-review schemaVersion 1');
  const targets=proof.reviewedTargets;
  const scopes=new Set();
  for(const reviewed of targets){
    if(!reviewed||typeof reviewed!=='object'||Array.isArray(reviewed)
        ||JSON.stringify(Object.keys(reviewed).sort())!==JSON.stringify([...classXpTargetReviewTargetKeys].sort()))fail('target review proof contains an unsupported or open target entry');
    const identity=reviewed.expectedTargetIdentity;
    if(!identity||typeof identity!=='object'||Array.isArray(identity)
        ||JSON.stringify(Object.keys(identity).sort())!==JSON.stringify([...classXpRowIdentityKeys].sort())
        ||!identity.value||typeof identity.value!=='object'||Array.isArray(identity.value)
        ||JSON.stringify(Object.keys(identity.value).sort())!==JSON.stringify([...classXpRowIdentityValueKeys].sort())
        ||identity.kind!=='class-xp-row'||identity.collection!=='classes'||typeof identity.itemId!=='string'||!identity.itemId.trim()
        ||typeof identity.fieldPointer!=='string'||!/^\/xpRows\/(0|[1-9]\d*)$/.test(identity.fieldPointer)
        ||identity.sourceObjectPointer!==identity.fieldPointer
        ||!Number.isInteger(identity.value.level)||identity.value.level<1||!Number.isInteger(identity.value.xp)||identity.value.xp<0
        ||typeof identity.value.book!=='string'||!identity.value.book.trim()||!Array.isArray(identity.value.pages)||!identity.value.pages.length
        ||identity.value.pages.some(page=>!Number.isInteger(page)||page<1)||typeof identity.value.track!=='string'||!identity.value.track.trim())fail('target review proof contains a malformed target identity');
    const scope=[identity.collection,identity.itemId,identity.fieldPointer].join('|');
    if(scopes.has(scope))fail('target review proof contains duplicate target identities');
    scopes.add(scope);
    if(reviewed.status!=='confirmed'||reviewed.independent!==true)fail('target review proof must independently confirm each target');
    if(reviewed.sourceValueGrade!=='NOT PROMOTED')fail('target review proof must explicitly preserve sourceValueGrade NOT PROMOTED');
    if(!Array.isArray(reviewed.sourceEvidence)||reviewed.sourceEvidence.length<2)fail('target review proof must retain author and independent-review source evidence references');
    const sourceRefs=new Set();
    const sourcePaths=new Set();
    for(const source of reviewed.sourceEvidence){
      if(!source||typeof source!=='object'||Array.isArray(source)
          ||JSON.stringify(Object.keys(source).sort())!==JSON.stringify([...classXpTargetReviewSourceKeys].sort()))fail('target review proof contains an unsupported source evidence reference');
      if(typeof source.path!=='string'||!source.path.startsWith('research/')||source.path.split('/').includes('..')||source.path===evidencePath||!existsSync(resolve(root,source.path)))fail('target review proof source evidence path is missing, cyclic, or outside research');
      if(typeof source.sha256!=='string'||!/^[a-f0-9]{64}$/.test(source.sha256)||source.sha256!==hashFile(source.path))fail('target review proof source evidence digest is stale');
      if(typeof source.pointer!=='string'||!source.pointer.startsWith('/')||pointerParts(source.pointer)===null)fail('target review proof source evidence pointer is invalid');
      const referenced=valueAtPointer(readJson(source.path),source.pointer);
      if(!referenced||typeof referenced!=='object'||Array.isArray(referenced))fail('target review proof source evidence pointer does not resolve to a source-row object');
      if(referenced.fieldPointer!==identity.fieldPointer||referenced.sourceObjectPointer!==identity.sourceObjectPointer)fail('target review proof source evidence pointer does not identify the reviewed field and source object');
      if((Object.hasOwn(referenced,'collection')&&referenced.collection!==identity.collection)||(Object.hasOwn(referenced,'itemId')&&referenced.itemId!==identity.itemId))fail('target review proof source evidence pointer identifies a different owner');
      const refKey=`${source.path}|${source.pointer}`;
      if(sourceRefs.has(refKey))fail('target review proof contains duplicate source evidence references');
      sourceRefs.add(refKey);
      sourcePaths.add(source.path);
    }
    if(sourcePaths.size<2)fail('target review proof source evidence must come from distinct author and independent-review records');
    if(!Array.isArray(reviewed.regionEvidence)||reviewed.regionEvidence.length<1)fail('target review proof must bind selected region source/image/focus/content hashes');
    const regionIds=new Set();
    for(const region of reviewed.regionEvidence){
      if(!region||typeof region!=='object'||Array.isArray(region)
          ||JSON.stringify(Object.keys(region).sort())!==JSON.stringify([...classXpTargetReviewRegionKeys].sort()))fail('target review proof contains an unsupported region evidence entry');
      if(typeof region.regionId!=='string'||!region.regionId.trim()||regionIds.has(region.regionId)
          ||['sourceSha256','imageSha256','focusSha256','contentSha256'].some(key=>typeof region[key]!=='string'||!/^[a-f0-9]{64}$/.test(region[key])))fail('target review proof contains incomplete or duplicate region hashes');
      regionIds.add(region.regionId);
    }
  }
  const matching=targets.filter(reviewed=>reviewed.expectedTargetIdentity.collection===expected.collection
    &&reviewed.expectedTargetIdentity.itemId===expected.itemId&&reviewed.expectedTargetIdentity.fieldPointer===expected.fieldPointer);
  if(matching.length!==1)fail('target review evidence must contain exactly one entry for this collection, owner, and field pointer');
  const approved=matching[0];
  if(canonical(approved.expectedTargetIdentity)!==canonical(expected))fail('targetReview.expectedTargetIdentity does not exactly match the hash-pinned review proof target identity');
  const expectedRegions=binding.expectedRegionEvidence;
  if(!Array.isArray(expectedRegions)||!expectedRegions.length
      ||JSON.stringify(expectedRegions.map(region=>region.regionId))!==JSON.stringify(binding.regionIds)
      ||canonical(approved.regionEvidence)!==canonical(expectedRegions))fail('target review proof region source/image/focus/content hashes do not exactly match expectedRegionEvidence');
}

function makeSourceRows(config, inventory, review, reviewFresh) {
  const rawRows = inventory.records || [];
  const arrayIndex = new Map();
  const rows = [];
  for (let i=0; i<rawRows.length; i++) {
    const record = rawRows[i];
    const source = rawSourceFor(record);
    const rowId = `${config.id}-${String(i+1).padStart(3,'0')}`;
    const rawSiteMatch = record.siteMatch || null;
    const targetId = textMatchId(rawSiteMatch);
    const sourceValue = valueFor(record);
    const rawMatchStatus = rawSiteMatch?.status ?? null;
    const row = {
      id: rowId,
      sourceFile: config.file,
      sourceRecordIndex: i,
      sourceObject: displaySourceObject(record),
      section: record.section ?? record.category ?? null,
      sourceCategory: categoryFor(config),
      sourceValue,
      source: {
        book: source.book ?? record.book ?? null,
        printedPage: pageFor(source) ?? record.printedPage ?? record.page ?? null,
        pdfPage: source.pdfPage ?? record.pdfPage ?? null,
        sourceSha256: source.sourceSha256 ?? record.sourceSha256 ?? source.sha256 ?? null,
        passage: record.section ?? record.category ?? inventory.title ?? null,
      },
      sourceRowCoordinates: geometryFrom(record, source),
      cropCoordinates: null,
      highlightCoordinates: null,
      siteMatch: targetId ? {
        collection: rawSiteMatch.collection ?? (config.category==='equipment-purchase-price' ? 'equipment' : null),
        itemId: targetId,
        fieldPointer: config.category==='equipment-purchase-price' ? '/price' : null,
        status: rawMatchStatus,
      } : rawSiteMatch ? {
        collection: rawSiteMatch.collection ?? null,
        itemId: null,
        fieldPointer: null,
        status: rawMatchStatus,
      } : null,
      reviewStatus: inventoryReviewFor(config, record, i, review, true, reviewFresh),
      sourceRecord: record,
    };
    arrayIndex.set(record, i);
    rows.push(row);
  }
  return {rows, arrayIndex};
}

function rowMatchesSitePrice(row, item) {
  // A legacy source row may have an explicit manual overlay that resolves its
  // item identity even when the original row mapping was null/unrepresented.
  // Preserve an explicit, conflicting legacy item ID as a hard failure; the
  // reviewed overlay identity is checked separately before this value match.
  if ((row.siteMatch?.itemId && row.siteMatch.itemId !== item.id) || !item.price) return false;
  const src = row.sourceValue;
  const sourcePrice = Array.isArray(src) ? null : src;
  if (!sourcePrice || typeof sourcePrice !== 'object') return false;
  return String(sourcePrice.amount) === String(item.price.amount)
    && sourcePrice.currency === item.price.currency
    && row.source.book === item.price.book
    && row.source.printedPage === item.price.pages?.[0];
}

function reviewRecordMatchesRowBinding(reviewRecord,binding) {
  return reviewRecord?.sourceInventoryFile===binding.sourceInventoryFile
    &&reviewRecord?.sourceInventorySha256===binding.sourceInventorySha256
    &&reviewRecord?.sourceRecordIndex===binding.sourceRecordIndex
    &&reviewRecord?.sourceObject===binding.sourceObject
    &&reviewRecord?.sourceSha256===binding.sourceSha256
    &&reviewRecord?.itemId===binding.itemId
    &&reviewRecord?.verdict==='confirmed';
}

function attachEquipmentSourceRowBindings({rows,config,equipment,overlay,reviewFileCache=new Map()}) {
  const bindings=Array.isArray(overlay?.bindings)?overlay.bindings:[];
  const matching=bindings.map((binding,index)=>({binding,index})).filter(({binding})=>binding.sourceInventoryFile===config.file);
  const targetCounts=new Map();
  for(const {binding} of matching)if(Number.isInteger(binding.sourceRecordIndex))targetCounts.set(binding.sourceRecordIndex,(targetCounts.get(binding.sourceRecordIndex)||0)+1);
  const currentInventorySha256=hashFile(config.file);
  const rowBindings=[];
  for(const {binding,index} of matching){
    const row=Number.isInteger(binding.sourceRecordIndex)?rows[binding.sourceRecordIndex]:null;
    const item=equipment.find(candidate=>candidate.id===binding.itemId);
    let status='pending-invalid-binding';
    let reviewRecord=null;
    if((targetCounts.get(binding.sourceRecordIndex)||0)>1)status='conflict-duplicate-overlay-source-row';
    else if(!row)status='stale-source-row-index';
    else if(binding.sourceInventorySha256!==currentInventorySha256)status='stale-source-inventory-hash';
    else if(binding.sourceObject!==row.sourceObject||binding.sourceSha256!==row.source.sourceSha256)status='stale-source-row-identity';
    else if(typeof binding.independentReviewFile!=='string'||typeof binding.independentReviewFileSha256!=='string'||!Number.isInteger(binding.independentReviewRecordIndex))status='pending-independent-review-reference';
    else {
      let reviewDoc=reviewFileCache.get(binding.independentReviewFile);
      if(reviewDoc===undefined){
        const filePath=resolve(root,binding.independentReviewFile);
        reviewDoc=existsSync(filePath)?{document:readJson(binding.independentReviewFile),sha256:hashFile(binding.independentReviewFile)}:null;
        reviewFileCache.set(binding.independentReviewFile,reviewDoc);
      }
      if(!reviewDoc)status='stale-independent-review-file-missing';
      else if(reviewDoc.sha256!==binding.independentReviewFileSha256)status='stale-independent-review-hash';
      else {
        reviewRecord=reviewDoc.document?.records?.[binding.independentReviewRecordIndex]??null;
        if(!reviewRecordMatchesRowBinding(reviewRecord,binding))status='pending-independent-review-does-not-confirm-binding';
        else if(!item)status='stale-site-item-missing';
        else if(row.siteMatch?.itemId&&row.siteMatch.itemId!==binding.itemId)status='conflict-source-inventory-site-match';
        else if(!item.price)status='site-item-price-missing';
        else if(!rowMatchesSitePrice(row,item))status='source-site-price-conflict';
        else status='reviewed-source-row-binding-current';
      }
    }
    const audit={
      overlayIndex:index,status,sourceInventoryFile:binding.sourceInventoryFile??null,
      sourceInventorySha256:binding.sourceInventorySha256??null,sourceRecordIndex:binding.sourceRecordIndex??null,
      sourceObject:binding.sourceObject??null,sourceSha256:binding.sourceSha256??null,
      itemId:binding.itemId??null,independentReviewFile:binding.independentReviewFile??null,
      independentReviewFileSha256:binding.independentReviewFileSha256??null,
      independentReviewRecordIndex:binding.independentReviewRecordIndex??null,
      sourceRowPresent:!!row,reviewRecordConfirmed:!!reviewRecordMatchesRowBinding(reviewRecord,binding),
      sitePriceCheck:row&&item?(rowMatchesSitePrice(row,item)?'exact-amount-currency-book-page':'conflict'):null,
    };
    rowBindings.push(audit);
    if(row){
      row.sourceRowBinding=audit;
      if(status==='reviewed-source-row-binding-current'&&!row.siteMatch?.itemId){
        row.siteMatch={
          collection:'equipment',itemId:binding.itemId,fieldPointer:'/price',
          status:'reviewed-source-row-binding',
          ...(row.siteMatch?.status?{legacyStatus:row.siteMatch.status}:{}),
        };
      }
    }
  }
  return rowBindings;
}

function sourceRowBindingSummary(records,overlayFileSha256=null) {
  const counts={};
  for(const record of records)counts[record.status]=(counts[record.status]||0)+1;
  return {sourceFile:EQUIPMENT_SOURCE_ROW_BINDINGS_FILE,sourceFileSha256:overlayFileSha256,total:records.length,counts,records};
}

function inventoryDenominator(config, inventory) {
  const count = inventory.sourceRows ?? inventory.records?.length ?? 0;
  const denominators = [{kind:config.denominatorKind, count}];
  if (inventory.priceCells != null) denominators.push({kind:config.cellDenominatorKind, count:inventory.priceCells});
  if (config.id==='dmg29-expert-hireling-rates') {
    denominators.push({kind:'numeric-source-row', count:inventory.printedNumericRows});
    denominators.push({kind:'special-fee-source-row', count:inventory.specialRows});
  }
  if (inventory.conditions) denominators.push({kind:'contextual-condition-group', count:inventory.conditions.length});
  if (inventory.formulas) denominators.push({kind:'printed-formula', count:inventory.formulas.length});
  if (inventory.qualifiers) denominators.push({kind:'source-qualifier', count:inventory.qualifiers.length});
  return denominators;
}

function matchSourceRows(siteItems, rowLists) {
  const byId = new Map(siteItems.map(item=>[item.id,item]));
  const allRows = rowLists.flatMap(({config,rows})=>rows.map(row=>({config,row})));
  const byItemId = new Map();
  for (const pair of allRows) {
    const itemId = pair.row.siteMatch?.itemId;
    if (!itemId) continue;
    const item = byId.get(itemId);
    pair.row.siteMatch.currentPriceCheck = item?.price ? rowMatchesSitePrice(pair.row, item) ? 'exact-amount-currency-page' : 'conflict' : 'site-item-price-missing';
    if (!byItemId.has(itemId)) byItemId.set(itemId, []);
    byItemId.get(itemId).push(pair.row);
  }
  return {allRows, byItemId};
}

const CONFIRMED_PRICE_VALUE_STATUS='source-value-independently-confirmed';

function priceValueSnapshot(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  return {amount:value.amount??null,currency:value.currency??null,unit:typeof value.unit==='string'?value.unit:null};
}

function derivePriceValueStatus({collection,itemId,fieldPointer,sourceObjectPointer,target,valueReview,claimedStatus}) {
  if(!valueReview){
    if(claimedStatus===CONFIRMED_PRICE_VALUE_STATUS)throw new Error(`${collection}:${itemId}${fieldPointer}: independent price value status lacks a frozen valueReview`);
    return claimedStatus??'not-assessed-by-field-target-review';
  }
  if(collection!=='equipment'||fieldPointer!=='/price'||sourceObjectPointer!=='/price'||valueReview.scope!=='equipment-printed-price')throw new Error(`${collection}:${itemId}${fieldPointer}: valueReview is only supported for the equipment /price source object`);
  if(valueReview.independent!==true)throw new Error(`${collection}:${itemId}${fieldPointer}: price valueReview is not marked independent`);
  const expected=valueReview.expectedValue;
  const validAmount=typeof expected?.amount==='number'?Number.isFinite(expected.amount):typeof expected?.amount==='string'&&!!expected.amount.trim();
  if(!expected||typeof expected!=='object'||Array.isArray(expected)||!Object.hasOwn(expected,'amount')||!Object.hasOwn(expected,'currency')||!Object.hasOwn(expected,'unit')
      ||!validAmount
      ||typeof expected.currency!=='string'||!(expected.unit===null||typeof expected.unit==='string'))throw new Error(`${collection}:${itemId}/price: price valueReview requires expectedValue {amount,currency,unit}`);
  if(typeof valueReview.evidence!=='string'||!valueReview.evidence.startsWith('research/')||valueReview.evidence.split('/').includes('..')||!existsSync(resolve(root,valueReview.evidence)))throw new Error(`${collection}:${itemId}/price: price valueReview evidence file is missing or outside research`);
  if(typeof valueReview.evidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(valueReview.evidenceSha256)||valueReview.evidenceSha256!==hashFile(valueReview.evidence))throw new Error(`${collection}:${itemId}/price: price valueReview evidence file is stale or lacks its recorded hash`);
  const actual=priceValueSnapshot(target);
  if(!actual||actual.amount!==expected.amount||actual.currency!==expected.currency||actual.unit!==expected.unit)throw new Error(`${collection}:${itemId}/price: price valueReview snapshot does not match current amount, currency, and unit`);
  return CONFIRMED_PRICE_VALUE_STATUS;
}

function itemBinding(item, {rootBindings, catalogs}) {
  const manual = (rootBindings.bindings || []).filter(binding=>binding.collection==='equipment'&&binding.itemId===item.id);
  const pageCatalog = item.sourceExcerpts?.catalog ?? item.scanVerification?.catalog ?? null;
  const make = (ref, pointer, sourceObject, category, sourceObjectPointer=pointer) => {
    const directIds = ref?.verification?.regions || [];
    const manualRef = manual.find(binding=>binding.fieldPointer===pointer);
    const catalog=pageCatalog;
    if(manualRef?.reviewStatus==='field-target-reviewed'&&manualRef.catalog!==catalog)throw new Error(`Reviewed target ${item.id}${pointer} catalog ${manualRef.catalog??'(missing)'} is not the viewer-selected catalog ${catalog??'(none)'}`);
    const candidateIds=[...new Set(Array.isArray(manualRef?.regionIds)?manualRef.regionIds:directIds)];
    const catalogRegions=catalog&&catalogs.get(catalog)?catalogs.get(catalog).regions:[];
    const regionIds=candidateIds.filter(id=>catalogRegions.some(region=>region.id===id));
    const unmappedRegionIds=candidateIds.filter(id=>!regionIds.includes(id));
    const refPage = (ref?.pages || item.price?.pages || item.pages || [])[0] ?? null;
    const book = ref?.book ?? item.price?.book ?? item.book ?? null;
    const matchedRegions = regionIds.map(id=>catalogRegions.find(region=>region.id===id)).filter(Boolean);
    const valuePathMissing=valueAtPointer(item,pointer)===undefined&&isPairedFieldSourcePointer(pointer,sourceObjectPointer);
    let reviewStatus = manualRef?.reviewStatus;
    if (!reviewStatus) {
      if (directIds.length && directIds.every(id=>regionIds.includes(id))) reviewStatus='region-verified';
      else if (/Selected purchase-price row visually checked/i.test(ref?.status||'')) reviewStatus='source-row-value-verified-region-pending';
      else if (/Visually checked/i.test(ref?.status||'')) reviewStatus=directIds.length&&directIds.every(id=>regionIds.includes(id)) ? 'region-verified' : 'source-row-value-verified-region-pending';
      else if (/OCR checked/i.test(ref?.status||'')) reviewStatus='source-row-transcribed-bounds-provisional';
      else if (pageCatalog) reviewStatus='source-excerpt-only';
      else reviewStatus='discovery-unreviewed';
    }
    if(valuePathMissing&&reviewStatus==='field-target-reviewed')throw new Error(`Reviewed target ${item.id}${pointer} has no current value at the cited field path`);
    if(valuePathMissing)reviewStatus='field-target-pending';
    const sourcePages = ref?.pages || item.price?.pages || item.pages || [];
    const binding={
      fieldPointer:pointer,
      sourceObjectPointer,
      sourceOwner:{collection:'equipment',itemId:item.id},
      sourceObject,
      sourceCategory:category,
      book,
      printedPage:refPage,
      pdfPage:matchedRegions.length ? matchedRegions[0].pdfPage : (book && refPage ? sourcePdfPage(book, refPage) : null),
      catalog,
      regionIds,
      ...(unmappedRegionIds.length?{unmappedRegionIds}:{}),
      coordinateSpace:regionIds.length ? 'excerpt-image-normalized-top-left-xywh' : null,
      reviewStatus,
      valuePathStatus:valuePathMissing?'value-path-missing':'value-present',
      contextStatus:manualRef?.contextStatus ?? 'context-not-assessed',
      contextLimitations:manualRef?.contextLimitations ?? (valuePathMissing?['The source reference is retained, but no value is currently present at its semantic field path.']:regionIds.length ? ['Field-to-region selection does not by itself establish complete table or passage context.'] : []),
      sourcePages,
      sourceSha256:matchedRegions.length ? regionSourceSha256(catalogs.get(catalog),matchedRegions[0]) : null,
      cropCoordinates:matchedRegions.map(regionCropCoordinate),
      highlightCoordinates:matchedRegions.map(region=>({regionId:region.id, coordinateSpace:'excerpt-image-normalized-top-left-xywh', origin:'top-left', format:'xywh', rects:region.focusRects||[]})),
      regionEvidence:matchedRegions.map(region=>({
        regionId:region.id,
        book:region.book,
        printedPage:region.printedPage,
        pdfPage:region.pdfPage,
        sourceSha256:regionSourceSha256(catalogs.get(catalog),region),
        imageSha256:region.sha256,
        focusRectsSha256:createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex'),
        ...sourceVisualRegionHashes(region),
      })),
    };
    if (manualRef) {
      const currentRegionEvidence=binding.regionEvidence;
      const expectedRegionEvidence=manualRef.expectedRegionEvidence??manualRef.regionEvidence??[];
      Object.assign(binding,manualRef);
      binding.targetReview=boundTargetReview(manualRef.targetReview);
      binding.expectedRegionEvidence=expectedRegionEvidence;
      binding.regionEvidence=currentRegionEvidence;
      if(manualRef.valueReview||manualRef.sourceValueStatus===CONFIRMED_PRICE_VALUE_STATUS){
        binding.sourceValueStatus=derivePriceValueStatus({collection:'equipment',itemId:item.id,fieldPointer:pointer,sourceObjectPointer,target:valueAtPointer(item,pointer),valueReview:manualRef.valueReview,claimedStatus:manualRef.sourceValueStatus});
        binding.valueReview=manualRef.valueReview?{...manualRef.valueReview,expectedValue:{...manualRef.valueReview.expectedValue}}:undefined;
      }
    }
    return binding;
  };
  const bindings=[];
  if (item.price && typeof item.price==='object') bindings.push(make(item.price,'/price',item.name,'equipment-purchase-price'));
  for (const [label,ref] of Object.entries(item.fieldSources||{})) {
    if (!ref || typeof ref!=='object') continue;
    bindings.push(make(ref,jsonPointer(['fields',label]),`${item.name}: ${label}`,'equipment-field',jsonPointer(['fieldSources',label])));
  }
  for (let i=0;i<(item.references||[]).length;i++) {
    const ref=item.references[i];
    if (!ref || typeof ref!=='object') continue;
    if (!ref.verification?.regions?.length && !ref.book) continue;
    bindings.push(make(ref,jsonPointer(['references',i]),`${item.name}: source reference ${i+1}`,'record-reference'));
  }
  return bindings;
}

function comparatorBinding(owner, index, comparison, comparatorItem, {rootBindings,catalogs,sourceRowsByItem}) {
  if(!comparatorItem) return null;
  const fieldPointer=jsonPointer(['suggestedPrice','comparisons',index]);
  const manual=(rootBindings.bindings||[]).find(binding=>binding.collection==='equipment'&&binding.itemId===owner.id&&binding.fieldPointer===fieldPointer);
  const directIds=comparatorItem.price?.verification?.regions||[];
  const selectedCatalog=viewerCatalogFor(comparatorItem);
  if(manual?.reviewStatus==='field-target-reviewed'&&manual.catalog!==selectedCatalog)throw new Error(`Reviewed comparator target ${owner.id}${fieldPointer} catalog ${manual.catalog??'(missing)'} is not the viewer-selected catalog ${selectedCatalog??'(none)'}`);
  const catalog=selectedCatalog;
  const candidateIds=[...new Set(Array.isArray(manual?.regionIds)?manual.regionIds:directIds)];
  const catalogRegions=catalog&&catalogs.get(catalog)?catalogs.get(catalog).regions:[];
  const regionIds=candidateIds.filter(id=>catalogRegions.some(region=>region.id===id));
  const unmappedRegionIds=candidateIds.filter(id=>!regionIds.includes(id));
  const refs=regionIds.map(id=>catalogRegions.find(region=>region.id===id)).filter(Boolean);
  const sourceStatus=comparatorItem.price?.status||comparison.status||'';
  const reviewStatus=manual?.reviewStatus??(directIds.length&&directIds.every(id=>regionIds.includes(id))?'region-verified':/visually checked/i.test(sourceStatus)?'source-row-value-verified-region-pending':/OCR checked/i.test(sourceStatus)?'source-row-transcribed-bounds-provisional':'source-excerpt-only');
  const pages=comparison.pages||comparatorItem.price?.pages||[];
  const book=comparison.book||comparatorItem.price?.book||null;
  return {
    collection:'equipment',
    itemId:owner.id,
    fieldPointer,
    sourceObjectPointer:manual?.sourceObjectPointer??fieldPointer,
    sourceObject:comparison.label||comparatorItem.name,
    sourceCategory:'printed-price-comparator',
    sourceOwner:{collection:'equipment',itemId:comparatorItem.id},
    book,
    printedPage:pages[0]??null,
    pdfPage:refs.length?refs[0].pdfPage:(book&&pages[0]?sourcePdfPage(book,pages[0]):null),
    catalog,
    regionIds,
    ...(unmappedRegionIds.length?{unmappedRegionIds}:{}),
    coordinateSpace:regionIds.length?'excerpt-image-normalized-top-left-xywh':null,
    reviewStatus,
    targetReview:boundTargetReview(manual?.targetReview),
    expectedRegionEvidence:manual?.expectedRegionEvidence??[],
    contextStatus:manual?.contextStatus??'context-not-assessed',
    contextLimitations:manual?.contextLimitations??(regionIds.length?['Comparator region selection does not verify the estimate itself or complete table context.']:[]),
    sourcePages:pages,
    sourceSha256:refs.length?regionSourceSha256(catalogs.get(catalog),refs[0]):null,
    cropCoordinates:refs.map(regionCropCoordinate),
    highlightCoordinates:refs.map(region=>({regionId:region.id,coordinateSpace:'excerpt-image-normalized-top-left-xywh',origin:'top-left',format:'xywh',rects:region.focusRects||[]})),
    regionEvidence:refs.map(region=>({regionId:region.id,book:region.book,printedPage:region.printedPage,pdfPage:region.pdfPage,sourceSha256:regionSourceSha256(catalogs.get(catalog),region),imageSha256:region.sha256,focusRectsSha256:createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex'),...sourceVisualRegionHashes(region)})),
    sourceRowIds:(sourceRowsByItem.get(comparatorItem.id)||[]).filter(row=>rowMatchesSitePrice(row,comparatorItem)).map(row=>row.id),
  };
}

function buildEvidenceBindings(items, {rootBindings,catalogs,sourceRowsByItem}) {
  const claims=[];
  const byId=new Map(items.map(item=>[item.id,item]));
  for (const item of items) {
    const bindings=itemBinding(item,{rootBindings,catalogs});
    for (const binding of bindings) {
      if (binding.fieldPointer==='/price') {
        binding.sourceRowIds=(sourceRowsByItem.get(item.id)||[]).filter(row=>rowMatchesSitePrice(row,item)).map(row=>row.id);
      }
      claims.push({collection:'equipment',itemId:item.id,...binding});
    }
    for(let index=0;index<(item.suggestedPrice?.comparisons||[]).length;index++){
      const comparison=item.suggestedPrice.comparisons[index];
      const binding=comparatorBinding(item,index,comparison,byId.get(comparison.itemId),{rootBindings,catalogs,sourceRowsByItem});
      if(binding)claims.push(binding);
    }
  }
  return claims;
}

function catalogMap() {
  const map=new Map();
  const folder=resolve(root,'dist/scans');
  const scan=(dir,prefix='scans')=>{
    if(!existsSync(dir)) return;
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const full=resolve(dir,entry.name);
      if (entry.isDirectory()) scan(full,`${prefix}/${entry.name}`);
      else if (entry.isFile()&&entry.name.endsWith('.json')) {
        try {const catalog=JSON.parse(readFileSync(full,'utf8'));map.set(`${prefix}/${entry.name}`,catalog);} catch {}
      }
    }
  };
  scan(folder);
  return map;
}

function sourceIntegrity(config, reviewResult) {
  const inventory=readJson(config.file);
  const expected=reviewResult.review?.inventorySha256 ?? null;
  return {
    sourceFile:config.file,
    sourceFileSha256:hashFile(config.file),
    sourceSha256:inventory.sourceSha256 ?? inventory.source?.sourceSha256 ?? null,
    sourceReviewFile:config.reviewFile ?? null,
    expectedInventorySha256:expected,
    reviewFresh:reviewResult.review ? reviewResult.fresh : null,
    reviewStatus:reviewResult.review ? (reviewResult.fresh?'current':'stale-hash') : 'no-separate-independent-review',
  };
}

function auxiliaryIntegrity(file, equipmentHash, inventoryHashes) {
  if (!existsSync(resolve(root,file))) return {file,status:'missing'};
  if (!file.endsWith('.json')) return {file,status:'narrative-source',sha256:hashFile(file)};
  const contents=readJson(file);
  const checks=[];
  if (contents.equipmentSha256) checks.push({kind:'equipment-data',expected:contents.equipmentSha256,actual:equipmentHash,status:contents.equipmentSha256===equipmentHash?'current':'stale-hash'});
  for (const [referenced,expected] of Object.entries(contents.inventorySha256||{})) {
    const normalized=referenced.startsWith('research/')?referenced:`research/${referenced}`;
    const actual=inventoryHashes.get(normalized)??(existsSync(resolve(root,normalized))?hashFile(normalized):null);
    checks.push({kind:'source-inventory',file:normalized,expected,actual,status:expected===actual?'current':'stale-hash'});
  }
  return {file,status:checks.some(check=>check.status==='stale-hash')?'stale-reference':'recorded',checks};
}

function sourceRowResultStatus(record, sourceFile) {
  const review=record.reviewStatus;
  if (record.siteMatch?.currentPriceCheck==='exact-amount-currency-page') return 'site-price-exactly-matched';
  if (record.siteMatch?.currentPriceCheck==='conflict') return 'site-price-conflict';
  if (record.siteMatch?.status) return record.siteMatch.status;
  if (review?.sourceValues==='independently-confirmed') return 'source-value-independently-confirmed';
  if (review?.sourceValues==='previously-confirmed-review-stale') return 'source-value-confirmation-review-stale';
  return 'source-row-transcribed-bounds-provisional';
}

function projectCollections(data={}) {
  const result=new Map();
  for(const collection of ['rules','spells','classes','equipment','matrices']) result.set(collection,data[collection]||[]);
  if(data.progressionExplainer){
    if(!data.progressionExplainer.id)data.progressionExplainer.id='progression-explainer';
    result.set('progressionExplainer',[data.progressionExplainer]);
  }
  return result;
}

function collectionItem(collections, collection, itemId) {
  const items=collections.get(collection);
  if(!items) return null;
  return items.find(item=>item.id===itemId)??null;
}

const citationMetadataKeys=new Set(['sourceExcerpts','scanVerification','evidenceBindings','regionReviews','regionEvidence','expectedRegionEvidence','targetReview','recordedReview','verification']);

function citationPages(value) {
  const pages=Array.isArray(value?.pages)?value.pages:Number.isInteger(value?.printedPage)?[value.printedPage]:Number.isInteger(value?.page)?[value.page]:[];
  return [...new Set(pages.filter(page=>Number.isInteger(page)&&page>0))];
}

function sourceCategoryFor(collection,parts) {
  if(parts[0]==='fieldSources')return 'field-source-reference';
  if(parts[0]==='references')return 'record-reference';
  if(collection==='classes'&&parts[0]==='xpRows')return 'class-xp-row';
  if(collection==='classes'&&parts[0]==='levelChanges')return 'class-level-change';
  if(collection==='classes'&&parts[0]==='xpContinuation')return 'class-xp-continuation';
  if(collection==='classes'&&parts[0]==='levelLimit')return 'class-level-limit';
  if(collection==='matrices')return 'matrix-reference';
  if(collection==='progressionExplainer')return 'progression-reference';
  return parts.length?'structured-source-reference':'record-page-reference';
}

function citationFieldPointer(collection,item,parts,sourceObjectPointer) {
  if(!parts.length)return '';
  if(parts.length>=2&&parts[0]==='fieldSources'){
    const candidate=jsonPointer(['fields',parts[1]]);
    if(valueAtPointer(item,candidate)!==undefined)return candidate;
  }
  return sourceObjectPointer;
}

function collectStructuredCitations(collections) {
  const candidates=[];
  for(const [collection,items] of collections){
    for(const item of items){
      const seen=new WeakSet();
      const walk=(value,parts=[])=>{
        if(!value||typeof value!=='object'||seen.has(value))return;
        seen.add(value);
        if(Array.isArray(value)){value.forEach((child,index)=>walk(child,[...parts,String(index)]));return;}
        const pages=citationPages(value);
        if(value.book&&pages.length){
          const sourceObjectPointer=parts.length?jsonPointer(parts):'';
          candidates.push({collection,item,value,parts,sourceObjectPointer,fieldPointer:citationFieldPointer(collection,item,parts,sourceObjectPointer),pages});
        }
        for(const [key,child] of Object.entries(value))if(!citationMetadataKeys.has(key))walk(child,[...parts,key]);
      };
      walk(item);
    }
  }
  return candidates;
}

function verifiedLegacyRegionIds(value,{book,printedPage,sourcePages,catalog}) {
  const ids=value.verification?.regions||[];
  if(!ids.length)return {regionIds:[],unmappedRegionIds:[],regions:[],hasLegacyTargets:false};
  const allRegions=catalog?.regions||[];
  const regions=ids.map(id=>allRegions.find(region=>region.id===id)).filter(region=>region&&region.book===book&&region.printedPage===printedPage);
  const matchedIds=new Set(regions.map(region=>region.id));
  const noCatalogMatch=ids.filter(id=>!allRegions.some(region=>region.id===id));
  const outsideCitedPages=ids.filter(id=>{
    const region=allRegions.find(candidate=>candidate.id===id);
    return region&&!(region.book===book&&sourcePages.includes(region.printedPage));
  });
  return {
    regionIds:[...new Set(regions.map(region=>region.id))],
    unmappedRegionIds:[...new Set([...noCatalogMatch,...outsideCitedPages])],
    regions,
    hasLegacyTargets:true,
  };
}

function structuredCitationBindings(collections,{knownBindings,catalogs}) {
  const covered=new Map();
  for(const binding of knownBindings){
    const key=`${binding.collection}\0${binding.itemId}\0${binding.sourceObjectPointer??binding.fieldPointer??''}`;
    if(!covered.has(key))covered.set(key,new Set());
    const pages=binding.pages??(Number.isInteger(binding.printedPage)?[binding.printedPage]:binding.sourcePages??[]);
    for(const page of pages)if(Number.isInteger(page))covered.get(key).add(page);
  }
  const generated=[];
  for(const candidate of collectStructuredCitations(collections)){
    const {collection,item,value,parts,sourceObjectPointer,pages}=candidate;
    const key=`${collection}\0${item.id}\0${sourceObjectPointer}`;
    const already=covered.get(key)||new Set();
    const book=value.book;
    const selectedCatalog=viewerCatalogFor(item);
    const catalog=selectedCatalog?catalogs.get(selectedCatalog):null;
    if(selectedCatalog&&!catalog)throw new Error(`Viewer-selected catalog ${selectedCatalog} is missing for ${collection}:${item.id}`);
    const missingValue=valueAtPointer(item,candidate.fieldPointer)===undefined;
    const valuePathMissing=missingValue&&isPairedFieldSourcePointer(candidate.fieldPointer,sourceObjectPointer);
    const valuePathStatus=valuePathMissing?'value-path-missing':'value-present';
    const pendingLabel=value.label??value.title??value.name??(parts.length?parts.at(-1):item.name??item.title??item.id);
    const rawLegacyIds=value.verification?.regions||[];
    for(const printedPage of pages){
      if(already.has(printedPage))continue;
      const {regionIds,unmappedRegionIds,regions,hasLegacyTargets}=verifiedLegacyRegionIds(value,{book,printedPage,sourcePages:pages,catalog});
      const sourceRowCurrent=hasLegacyTargets&&regionIds.length>0&&unmappedRegionIds.length===0;
      const reviewStatus=sourceRowCurrent?'region-verified':'field-target-pending';
      const sourceObjectPointerParts=pointerParts(sourceObjectPointer);
      const binding={
        collection,itemId:item.id,
        fieldPointer:candidate.fieldPointer,
        sourceObjectPointer,
        sourceOwner:{collection,itemId:item.id},
        sourceObject:pendingLabel,
        sourceCategory:sourceCategoryFor(collection,parts),
        book,printedPage,pdfPage:regions.length?regions[0].pdfPage:sourcePdfPage(book,printedPage),
        pages:[printedPage],sourcePages:pages,
        catalog:selectedCatalog,regionIds,...(unmappedRegionIds.length?{unmappedRegionIds}:{}),
        coordinateSpace:regionIds.length?'excerpt-image-normalized-top-left-xywh':null,
        reviewStatus,
        contextStatus:'context-not-assessed',
        contextLimitations:regionIds.length?['Legacy region IDs match this cited source page; contextual adequacy is not certified.']:['No independently reviewed field-to-region binding is recorded.'],
        sourceValueStatus:'not-assessed-by-field-target-review',
        valuePathStatus,
        sourceSha256:regions.length?regionSourceSha256(catalog,regions[0]):null,
        cropCoordinates:regions.map(regionCropCoordinate),
        highlightCoordinates:regions.map(region=>({regionId:region.id,coordinateSpace:'excerpt-image-normalized-top-left-xywh',origin:'top-left',format:'xywh',rects:region.focusRects||[]})),
        regionEvidence:regions.map(region=>({regionId:region.id,book:region.book,printedPage:region.printedPage,pdfPage:region.pdfPage,sourceSha256:regionSourceSha256(catalog,region),imageSha256:region.sha256,focusRectsSha256:createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex'),...sourceVisualRegionHashes(region)})),
        targetReview:null,
        ...(rawLegacyIds.length&&!regionIds.length?{legacyRegionStatus:'unmapped-or-source-page-mismatch'}:{}),
      };
      generated.push(binding);
      if(!covered.has(key))covered.set(key,new Set());
      covered.get(key).add(printedPage);
    }
  }
  return generated;
}

function manualBindingFor(binding,{collections,catalogs}) {
  const item=collectionItem(collections,binding.collection,binding.itemId);
  if(!item) throw new Error(`Manual field evidence target ${binding.collection}:${binding.itemId} is missing`);
  const target=valueAtPointer(item,binding.fieldPointer);
  const sourceObjectPointer=binding.sourceObjectPointer??binding.fieldPointer;
  const sourceObject=valueAtPointer(item,sourceObjectPointer);
  const valuePathMissing=target===undefined&&isPairedFieldSourcePointer(binding.fieldPointer,sourceObjectPointer);
  if(target===undefined&&!valuePathMissing) throw new Error(`Manual field evidence target ${binding.collection}:${binding.itemId}${binding.fieldPointer} does not resolve`);
  if(valuePathMissing&&binding.reviewStatus==='field-target-reviewed')throw new Error(`Reviewed target ${binding.collection}:${binding.itemId}${binding.fieldPointer} has no current value at the cited field path`);
  if(sourceObject===undefined||sourceObject===null||typeof sourceObject!=='object'||Array.isArray(sourceObject)) throw new Error(`Manual field evidence source object ${binding.collection}:${binding.itemId}${sourceObjectPointer} must resolve to a non-array source object`);
  const sourceOwner=binding.sourceOwner??{collection:binding.collection,itemId:binding.itemId};
  const owner=collectionItem(collections,sourceOwner.collection,sourceOwner.itemId);
  if(!owner) throw new Error(`Manual field evidence source owner ${sourceOwner.collection}:${sourceOwner.itemId} is missing`);
  const selectedCatalog=viewerCatalogFor(owner);
  if(binding.reviewStatus==='field-target-reviewed'&&binding.catalog!==selectedCatalog)throw new Error(`Reviewed target ${binding.collection}:${binding.itemId}${binding.fieldPointer} catalog ${binding.catalog??'(missing)'} is not the viewer-selected catalog ${selectedCatalog??'(none)'}`);
  const catalog=selectedCatalog?catalogs.get(selectedCatalog):null;
  if(selectedCatalog&&!catalog) throw new Error(`Viewer-selected catalog ${selectedCatalog} is missing`);
  assertPass8Dmg225FieldTargetProof({...binding,sourceOwner,sourceObjectPointer},
    {item,target,sourceObject,sourceOwner,sourceObjectPointer,catalog});
  const candidateIds=[...new Set(binding.regionIds||[])];
  const catalogRegions=catalog?.regions||[];
  const regionIds=candidateIds.filter(id=>catalogRegions.some(region=>region.id===id));
  const unmappedRegionIds=candidateIds.filter(id=>!regionIds.includes(id));
  const regions=regionIds.map(id=>catalogRegions.find(region=>region.id===id));
  const book=binding.book??sourceObject.book??target?.book??null;
  const printedPage=binding.printedPage??sourceObject.printedPage??sourceObject.pages?.[0]??sourceObject.page??target?.printedPage??target?.pages?.[0]??target?.page??null;
  const pdfPage=binding.pdfPage??(regions.length?regions[0].pdfPage:(book&&printedPage?sourcePdfPage(book,printedPage):null));
  const bindingSourceSha=binding.sourceSha256??(regions.length?regionSourceSha256(catalog,regions[0]):null);
  const reviewStatus=valuePathMissing?'field-target-pending':binding.reviewStatus??'field-target-pending';
  assertReviewedClassXpTargetIdentity({...binding,reviewStatus},{item,target,sourceOwner,sourceObjectPointer});
  const targetReview=boundTargetReview(binding.targetReview);
  const evidence=regions.map(region=>({
    regionId:region.id,book:region.book,printedPage:region.printedPage,pdfPage:region.pdfPage,
    sourceSha256:regionSourceSha256(catalog,region),imageSha256:region.sha256,
    focusRectsSha256:createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex'),
    ...sourceVisualRegionHashes(region),
  }));
  let sourceValueStatus=valuePathMissing?'source-field-value-missing':binding.sourceValueStatus??'not-assessed-by-field-target-review';
  if(!valuePathMissing&&(binding.valueReview||binding.sourceValueStatus===CONFIRMED_PRICE_VALUE_STATUS)){
    sourceValueStatus=derivePriceValueStatus({collection:binding.collection,itemId:binding.itemId,fieldPointer:binding.fieldPointer,sourceObjectPointer,target,valueReview:binding.valueReview,claimedStatus:binding.sourceValueStatus});
  }
  return {
    collection:binding.collection,itemId:binding.itemId,fieldPointer:binding.fieldPointer,
    sourceObject:binding.sourceObject??sourceObject.label??sourceObject.name??sourceObject.title??null,
    sourceCategory:binding.sourceCategory??'record-reference',book,printedPage,pdfPage,
    ...(binding.requiresRowEvidence===true?{requiresRowEvidence:true}:{}),
    ...(binding.requiresPassageEvidence===true?{requiresPassageEvidence:true}:{}),
    catalog:selectedCatalog,regionIds,...(unmappedRegionIds.length?{unmappedRegionIds}:{}),coordinateSpace:regionIds.length?'excerpt-image-normalized-top-left-xywh':null,
    reviewStatus,contextStatus:binding.contextStatus??'context-not-assessed',
    contextLimitations:binding.contextLimitations??[],sourcePages:binding.sourcePages??sourceObject.pages??target.pages??(printedPage?[printedPage]:[]),
    sourceValueStatus,
    valuePathStatus:valuePathMissing?'value-path-missing':'value-present',
    sourceSha256:bindingSourceSha,cropCoordinates:regions.map(regionCropCoordinate),
    highlightCoordinates:regions.map(region=>({regionId:region.id,coordinateSpace:'excerpt-image-normalized-top-left-xywh',origin:'top-left',format:'xywh',rects:region.focusRects||[]})),
    regionEvidence:evidence,expectedRegionEvidence:binding.expectedRegionEvidence??[],targetReview,
    sourceOwner,
    sourceObjectPointer,
  };
}

export function buildPriceSourceInventory({equipment=applyAssemblyMetadata(readJson('equipment.json').equipment), data=null, manualBindings=readJson('research/field-evidence-bindings.json'), catalogs=catalogMap(),sourceRowBindings=existsSync(resolve(root,EQUIPMENT_SOURCE_ROW_BINDINGS_FILE))?readJson(EQUIPMENT_SOURCE_ROW_BINDINGS_FILE):{schemaVersion:1,bindings:[]},sourceRowReviewFiles=new Map()}={}) {
  const currentManualBindings=readJson('research/field-evidence-bindings.json');
  if(!pass8Dmg225IsJsonSafe(manualBindings))throw new Error('Manual field bindings contain non-JSON data');
  const manualBindingsCanonical=canonical(manualBindings)===canonical(currentManualBindings);
  if(manualBindingsCanonical)assertPass8Dmg225TargetUniverse(currentManualBindings.bindings);
  if(sourceRowBindings?.schemaVersion!==1||!Array.isArray(sourceRowBindings.bindings))throw new Error('Unsupported equipment source-row binding overlay; expected schemaVersion 1 with a bindings array');
  const sourceInventories=[];
  const rowLists=[];
  const sourceRowBindingRecords=[];
  const reviewFileCache=new Map(sourceRowReviewFiles);
  const sourceRowBindingsSha256=existsSync(resolve(root,EQUIPMENT_SOURCE_ROW_BINDINGS_FILE))?hashFile(EQUIPMENT_SOURCE_ROW_BINDINGS_FILE):null;
  const inventoryHashes=new Map();
  for (const config of sources) {
    const inventory=readJson(config.file);
    const reviewResult=independentReviewMap(config);
    const {rows}=makeSourceRows(config,inventory,reviewResult.review,reviewResult.fresh);
    sourceRowBindingRecords.push(...attachEquipmentSourceRowBindings({rows,config,equipment,overlay:sourceRowBindings,reviewFileCache}));
    inventoryHashes.set(config.file,hashFile(config.file));
    for (const row of rows) row.reviewStatus.final=sourceRowResultStatus(row,config.file);
    const denominators=inventoryDenominator(config,inventory);
    sourceInventories.push({
      id:config.id,
      category:config.category,
      sourceFiles:[config.file,...(config.reviewFile?[config.reviewFile]:[])],
      sourceIdentity:{book:inventory.source?.book??null,sourceSha256:inventory.sourceSha256??null},
      scope:inventory.scope,
      denominator:denominators,
      rowCount:rows.length,
      sourceRows:rows,
      formulas:(inventory.formulas??[]).map(formula=>({...formula,sourceCategory:'magic-item-sale-formula'})),
      qualifiers:(inventory.qualifiers??[]).map(qualifier=>({...qualifier,sourceCategory:'source-value-qualification'})),
      conditions:(inventory.conditions??[]).map(condition=>({...condition,sourceCategory:'price-or-fee-condition'})),
      exclusions:inventory.excluded??[],
      unresolved:inventory.unresolved??[],
      screening:inventory.screening??null,
      integrity:sourceIntegrity(config,reviewResult),
    });
    rowLists.push({config,rows});
  }
  for(const [overlayIndex,binding] of sourceRowBindings.bindings.entries())if(!sources.some(config=>config.file===binding.sourceInventoryFile)){
    sourceRowBindingRecords.push({overlayIndex,status:'pending-unknown-source-inventory',sourceInventoryFile:binding.sourceInventoryFile??null,sourceInventorySha256:binding.sourceInventorySha256??null,sourceRecordIndex:binding.sourceRecordIndex??null,sourceObject:binding.sourceObject??null,sourceSha256:binding.sourceSha256??null,itemId:binding.itemId??null,independentReviewFile:binding.independentReviewFile??null,independentReviewFileSha256:binding.independentReviewFileSha256??null,independentReviewRecordIndex:binding.independentReviewRecordIndex??null,sourceRowPresent:false,reviewRecordConfirmed:false,sitePriceCheck:null});
  }
  const sourceCensuses=buildSourcePageCensuses();
  const sourcePageMappingAudit=buildSourcePageMappingAudit(sourceInventories,sourceCensuses);
  const sourceRowBindingAudit=sourceRowBindingSummary(sourceRowBindingRecords,sourceRowBindingsSha256);
  const {allRows,byItemId}=matchSourceRows(equipment,rowLists);
  const equipmentHash=hashFile('equipment.json');
  const equipmentBindings=buildEvidenceBindings(equipment,{rootBindings:manualBindings,catalogs,sourceRowsByItem:byItemId});
  const assembledData=data??defaultBindingData(equipment);
  if(!assembledData.equipment) assembledData.equipment=equipment;
  const collections=projectCollections(assembledData);
  const genericBindings=(manualBindings.bindings||[]).filter(binding=>binding.collection!=='equipment').map(binding=>manualBindingFor(binding,{collections,catalogs}));
  const explicitBindings=[...equipmentBindings,...genericBindings];
  const generatedCitationBindings=structuredCitationBindings(collections,{knownBindings:explicitBindings,catalogs});
  const evidenceBindings=[...explicitBindings,...generatedCitationBindings];
  if(manualBindingsCanonical)assertPass8Dmg225TargetUniverse(evidenceBindings);
  for (const {row} of allRows) {
    const itemId=row.siteMatch?.itemId;
    if (!itemId) continue;
    const itemBindings=evidenceBindings.filter(binding=>binding.itemId===itemId&&binding.fieldPointer==='/price');
    const rowBinding=itemBindings.find(binding=>binding.sourceRowIds?.includes(row.id))??itemBindings[0];
    if (rowBinding) {
      row.catalog=rowBinding.catalog;
      row.regionIds=rowBinding.regionIds;
      row.cropCoordinates=rowBinding.cropCoordinates;
      row.highlightCoordinates=rowBinding.highlightCoordinates;
      row.reviewStatus.binding=rowBinding.reviewStatus;
      row.reviewStatus.context=rowBinding.contextStatus;
    }
  }
  const bindingsByItem=new Map();
  for (const binding of evidenceBindings) {
    if(!bindingsByItem.has(binding.itemId))bindingsByItem.set(binding.itemId,[]);
    bindingsByItem.get(binding.itemId).push(binding);
  }
  const siteClaims=equipment.map(item=>{
    const bindings=bindingsByItem.get(item.id)||[];
    const priceBinding=bindings.find(binding=>binding.fieldPointer==='/price')??null;
    const rowRefs=byItemId.get(item.id)||[];
    const matchedRows=rowRefs.filter(row=>rowMatchesSitePrice(row,item));
    const proposedRows=rowRefs.filter(row=>row.siteMatch?.currentPriceCheck==='conflict');
    const claimType=item.price?'printed-price':'unextracted-price';
    return {
      itemId:item.id,
      name:item.name,
      fieldPointer:'/price',
      claimType,
      printedPrice:item.price?semanticValueSnapshot(item.price):null,
      priceState:item.priceState??null,
      priceNote:item.priceNote??null,
      reviewStatus:priceBinding?.reviewStatus??(item.price?'source-excerpt-only':'unextracted-gap'),
      evidenceBindings:priceBinding?[priceBinding]:[],
      sourceRowIds:matchedRows.map(row=>row.id),
      conflictingSourceRowIds:proposedRows.map(row=>row.id),
      sourcePageReference:item.price?{book:item.price.book??null,printedPages:item.price.pages??[],pdfPages:(item.price.pages||[]).map(page=>sourcePdfPage(item.price.book,page))}:null,
      estimate:item.suggestedPrice?{
        fieldPointer:'/suggestedPrice',
        classification:'editorial-estimate',
        value:semanticValueSnapshot(item.suggestedPrice),
        reviewStatus:'editorial-estimate',
        comparatorPointers:(item.suggestedPrice.comparisons||[]).map((_,index)=>jsonPointer(['suggestedPrice','comparisons',index])),
        comparatorEvidenceBindings:bindings.filter(binding=>binding.fieldPointer.startsWith('/suggestedPrice/comparisons/')),
      }:null,
      missingPrice:item.price==null,
    };
  });
  const auxiliary=auxiliarySources.map(file=>auxiliaryIntegrity(file,equipmentHash,inventoryHashes));
  const discoveries=readJson('research/price-source-inventory-index.json');
  const currentHashes=Object.fromEntries([...inventoryHashes.entries()].map(([file,sha256])=>[file,sha256]));
  const sourceRowCount=sourceInventories.reduce((sum,inventory)=>sum+inventory.rowCount,0);
  const categories={};
  for(const inventory of sourceInventories){
    categories[inventory.category]??={sourceInventories:0,sourceRows:0};
    categories[inventory.category].sourceInventories++;
    categories[inventory.category].sourceRows+=inventory.rowCount;
  }
  const allEvidenceBindings=evidenceBindings;
  return {
    schemaVersion:1,
    generatedBy:'tools/price-source-inventory.mjs',
    scope:'Bounded source-first inventory assembled from named reviewed tables, surveys and current site equipment claims. It is not an exhaustive inventory of price-bearing content in any book and does not certify whole-book coverage.',
    sourceInventories,
    sourcePageCensuses:sourceCensuses,
    sourcePageMappingAudit,
    sourceRowBindings:sourceRowBindingAudit,
    siteClaims,
    fieldEvidenceBindings:allEvidenceBindings,
    sourcePageDiscovery:{
      sourceFile:'research/price-source-inventory-index.json',
      scope:discoveries.scope,
      books:discoveries.books.map(book=>({book:book.book,sourceSha256:book.sourceSha256,pdfPages:book.pdfPages,candidatePages:book.candidatePages,reviewStatus:'discovery-unreviewed',candidates:book.candidates})),
      exhaustive:false,
    },
    auxiliaryRecords:auxiliary,
    counts:{
      siteEquipmentObjects:equipment.length,
      sitePrintedPrices:siteClaims.filter(claim=>claim.printedPrice).length,
      sitePriceGaps:siteClaims.filter(claim=>claim.missingPrice).length,
      editorialEstimates:siteClaims.filter(claim=>claim.estimate).length,
      sourceInventories:sourceInventories.length,
      sourceRows:sourceRowCount,
      sourceRowsByCategory:categories,
      fieldEvidenceBindings:evidenceBindings.length,
      fieldEvidenceBindingsByCollection:Object.fromEntries([...new Set(evidenceBindings.map(binding=>binding.collection))].sort().map(collection=>[collection,evidenceBindings.filter(binding=>binding.collection===collection).length])),
      regionBoundBindings:evidenceBindings.filter(binding=>binding.regionIds.length).length,
      pendingRegionBindings:evidenceBindings.filter(binding=>!binding.regionIds.length).length,
      sourcePageCensuses:sourceCensuses.length,
      sourceCensusPdfPages:sourceCensuses.reduce((sum,census)=>sum+census.pageCensus.denominator.count,0),
      sourceCensusClaims:sourceCensuses.reduce((sum,census)=>sum+census.claims.length,0),
      sourceCensusTableGroups:sourceCensuses.reduce((sum,census)=>sum+census.tableGroups.length,0),
      sourceRowBindings:sourceRowBindingAudit.total,
      currentReviewedSourceRowBindings:sourceRowBindingAudit.counts['reviewed-source-row-binding-current']??0,
      staleAuxiliaryReferences:auxiliary.reduce((sum,entry)=>sum+(entry.checks||[]).filter(check=>check.status==='stale-hash').length,0),
    },
    integrity:{
      equipmentSourceSha256:equipmentHash,
      sourceInventoryHashes:currentHashes,
      sourceCensusHashes:Object.fromEntries(sourceCensuses.map(census=>[census.sourceFiles[0],census.sourceFileSha256])),
      sourceRowBindingsSha256:sourceRowBindingsSha256,
      manualBindingsSha256:manualBindingsCanonical?hashFile('research/field-evidence-bindings.json'):null,
    },
  };
}

function pointerParts(pointer) {
  if(pointer==='') return [];
  if (typeof pointer!=='string'||!pointer.startsWith('/')) return null;
  return pointer.slice(1).split('/').map(part=>part.replaceAll('~1','/').replaceAll('~0','~'));
}

function valueAtPointer(object,pointer) {
  const parts=pointerParts(pointer);
  if (!parts) return undefined;
  let current=object;
  for(const part of parts){
    if(current==null) return undefined;
    current=current[part];
  }
  return current;
}

function isPairedFieldSourcePointer(fieldPointer,sourceObjectPointer) {
  const field=pointerParts(fieldPointer),source=pointerParts(sourceObjectPointer);
  return field?.length===2&&source?.length>=2&&field[0]==='fields'&&source[0]==='fieldSources'&&field[1]===source[1];
}

export function validatePriceSourceInventory(inventory,options={}){
  return validatePriceSourceInventoryCore(inventory,options,true);
}

/**
 * Validate a deliberately scoped historical/custom inventory for diagnostics.
 * This skips the canonical current 29-target cohort check and must not be used
 * to certify or publish the active inventory.
 */
export function validatePriceSourceInventoryDiagnostic(inventory,options={}){
  return validatePriceSourceInventoryCore(inventory,options,false);
}

function validatePriceSourceInventoryCore(inventory,{equipment=applyAssemblyMetadata(readJson('equipment.json').equipment),data=null,catalogs=catalogMap()}={},requireCurrentDmg225TargetSet) {
  const fail=(message)=>{throw new Error(`Invalid price source inventory: ${message}`);};
  if(inventory?.schemaVersion!==1||!Array.isArray(inventory.sourceInventories)||!Array.isArray(inventory.siteClaims)||!Array.isArray(inventory.fieldEvidenceBindings)) fail('missing schema or collections');
  if(requireCurrentDmg225TargetSet){
    const activeManualBindings=readJson('research/field-evidence-bindings.json');
    try{
      assertPass8Dmg225TargetUniverse(activeManualBindings.bindings);
      assertPass8Dmg225TargetUniverse(inventory.fieldEvidenceBindings);
    }catch(error){fail(error.message);}
  }
  if(inventory.sourcePageCensuses!==undefined&&!Array.isArray(inventory.sourcePageCensuses))fail('source-page census section must be an array');
  if(inventory.siteClaims.length!==equipment.length) fail(`site-claim denominator ${inventory.siteClaims.length} != equipment records ${equipment.length}`);
  if(inventory.siteClaims.some((claim,index)=>claim.itemId!==equipment[index].id)) fail('site claim order or IDs do not match authored equipment');
  const validationData=data??defaultBindingData(equipment);
  if(!validationData.equipment)validationData.equipment=equipment;
  const collections=projectCollections(validationData);
  for(const source of inventory.sourceInventories){
    if(source.rowCount!==source.sourceRows.length) fail(`${source.id}: source row count mismatch`);
    if(source.denominator.some(d=>!Number.isInteger(d.count)||d.count<0)) fail(`${source.id}: invalid denominator`);
    if(source.integrity?.sourceFile && source.integrity.sourceFileSha256!==hashFile(source.integrity.sourceFile)) fail(`${source.id}: stale source inventory hash; regenerate report`);
    for(const row of source.sourceRows){
      if(row.sourceRowCoordinates && (row.sourceRowCoordinates.coordinateSpace!=='rendered-source-page-normalized-top-left-xywh'||row.sourceRowCoordinates.rect.length!==4||row.sourceRowCoordinates.rect.some(n=>!Number.isFinite(n)))) fail(`${row.id}: untyped source-row geometry`);
      if(row.source.sourceSha256 && !/^[a-f0-9]{64}$/.test(row.source.sourceSha256)) fail(`${row.id}: invalid source hash`);
    }
  }
  for(const census of inventory.sourcePageCensuses||[]){
    if(census.sourceFiles?.[0]&&census.sourceFileSha256!==hashFile(census.sourceFiles[0]))fail(`${census.sourceFiles[0]}: stale source-page census hash; regenerate report`);
    if(census.pageCensus?.denominator?.count!==census.pageCensus?.pages?.length)fail(`${census.id}: source-page census denominator does not match complete per-page records`);
  }
  if(inventory.sourceRowBindings){
    const overlayExists=existsSync(resolve(root,EQUIPMENT_SOURCE_ROW_BINDINGS_FILE));
    const currentOverlayHash=overlayExists?hashFile(EQUIPMENT_SOURCE_ROW_BINDINGS_FILE):null;
    if(inventory.sourceRowBindings.sourceFile!==EQUIPMENT_SOURCE_ROW_BINDINGS_FILE||inventory.sourceRowBindings.sourceFileSha256!==currentOverlayHash)fail('equipment source-row binding overlay is stale; regenerate report');
    if(inventory.integrity?.sourceRowBindingsSha256!==currentOverlayHash)fail('equipment source-row binding overlay integrity hash is stale; regenerate report');
    if(!Array.isArray(inventory.sourceRowBindings.records)||inventory.sourceRowBindings.total!==inventory.sourceRowBindings.records.length)fail('equipment source-row binding overlay denominator does not match records');
    for(const record of inventory.sourceRowBindings.records){
      if(record.status==='reviewed-source-row-binding-current'){
        const row=inventory.sourceInventories.find(source=>source.sourceFiles?.[0]===record.sourceInventoryFile)?.sourceRows?.[record.sourceRecordIndex];
        if(!row||row.sourceObject!==record.sourceObject||row.source.sourceSha256!==record.sourceSha256)fail(`${record.sourceInventoryFile}[${record.sourceRecordIndex}]: reviewed overlay does not resolve to its source row`);
        if(row.siteMatch?.itemId!==record.itemId||row.siteMatch.currentPriceCheck!=='exact-amount-currency-page')fail(`${record.sourceInventoryFile}[${record.sourceRecordIndex}]: reviewed overlay does not match current site price exactly`);
        if(record.reviewRecordConfirmed!==true||record.sitePriceCheck!=='exact-amount-currency-book-page')fail(`${record.sourceInventoryFile}[${record.sourceRecordIndex}]: reviewed overlay lacks independent identity/value confirmation`);
      }
    }
  }
  if(inventory.sourcePageMappingAudit){
    const currentAudit=buildSourcePageMappingAudit(inventory.sourceInventories,inventory.sourcePageCensuses||[]);
    if(JSON.stringify(inventory.sourcePageMappingAudit)!==JSON.stringify(currentAudit))fail('source-page mapping audit is stale; regenerate report');
  }
  const items=new Map(equipment.map(item=>[item.id,item]));
  for(const binding of inventory.fieldEvidenceBindings){
    const item=collectionItem(collections,binding.collection||'equipment',binding.itemId);
    if(!item) fail(`${binding.itemId}: unknown evidence binding target`);
    const sourceOwner=binding.sourceOwner??{collection:binding.collection||'equipment',itemId:binding.itemId};
    const owner=collectionItem(collections,sourceOwner.collection,sourceOwner.itemId);
    if(!owner) fail(`${binding.itemId}${binding.fieldPointer}: source owner ${sourceOwner.collection}:${sourceOwner.itemId} is missing`);
    const selectedCatalog=viewerCatalogFor(owner);
    if((binding.catalog??null)!==(selectedCatalog??null)) fail(`${binding.itemId}${binding.fieldPointer}: binding catalog ${binding.catalog??'(none)'} is not the viewer-selected catalog ${selectedCatalog??'(none)'} for ${sourceOwner.collection}:${sourceOwner.itemId}`);
    if(binding.reviewStatus==='field-target-reviewed'&&binding.unmappedRegionIds?.length) fail(`${binding.itemId}${binding.fieldPointer}: reviewed target contains region IDs outside its viewer-selected catalog`);
    const target=valueAtPointer(item,binding.fieldPointer??'');
    const sourceObjectPointer=binding.sourceObjectPointer??binding.fieldPointer??'';
    let sourceObject=valueAtPointer(item,sourceObjectPointer);
    let effectiveSourceObjectPointer=sourceObjectPointer;
    const fieldParts=pointerParts(binding.fieldPointer);
    const derivedFieldSource=fieldParts?.length===2&&fieldParts[0]==='fields'?jsonPointer(['fieldSources',fieldParts[1]]):null;
    if((sourceObject===undefined||sourceObject===null||typeof sourceObject!=='object')&&!binding.sourceObjectPointer&&binding.sourceCategory==='equipment-field'&&derivedFieldSource&&isPairedFieldSourcePointer(binding.fieldPointer,derivedFieldSource)){
      const derived=derivedFieldSource;
      const candidate=valueAtPointer(item,derived);
      if(candidate&&typeof candidate==='object'){effectiveSourceObjectPointer=derived;sourceObject=candidate;}
    }
    const valuePathMissing=target===undefined&&isPairedFieldSourcePointer(binding.fieldPointer,effectiveSourceObjectPointer);
    if(target===undefined&&(!valuePathMissing||binding.valuePathStatus!=='value-path-missing')) fail(`${binding.itemId}${binding.fieldPointer}: JSON Pointer does not resolve and is not explicitly recorded as a missing field value`);
    if(target!==undefined&&binding.valuePathStatus==='value-path-missing') fail(`${binding.itemId}${binding.fieldPointer}: value path is marked missing but resolves`);
    if(sourceObject===undefined||sourceObject===null||typeof sourceObject!=='object') fail(`${binding.itemId}${sourceObjectPointer}: cited source object does not resolve to an object`);
    if(requireCurrentDmg225TargetSet){
      try{assertPass8Dmg225FieldTargetProof(binding,{item,target,sourceObject,sourceOwner,sourceObjectPointer,catalog:catalogs.get(binding.catalog)});}
      catch(error){fail(error.message);}
    }
    try{assertReviewedClassXpTargetIdentity(binding,{item,target,sourceOwner,sourceObjectPointer});}catch(error){fail(error.message);}
    try{assertReviewedClassXpContinuationTarget(binding,{item,target,sourceOwner,sourceObjectPointer});}catch(error){fail(error.message);}
    if(binding.valueReview||binding.sourceValueStatus===CONFIRMED_PRICE_VALUE_STATUS){
      let derivedStatus;
      try{derivedStatus=derivePriceValueStatus({collection:binding.collection||'equipment',itemId:binding.itemId,fieldPointer:binding.fieldPointer??'',sourceObjectPointer:effectiveSourceObjectPointer,target,valueReview:binding.valueReview,claimedStatus:binding.sourceValueStatus});}
      catch(error){fail(error.message);}
      if(binding.sourceValueStatus!==derivedStatus)fail(`${binding.itemId}${binding.fieldPointer}: sourceValueStatus is not derived from its current frozen valueReview snapshot`);
    }
    if(sourceOwner.collection!==(binding.collection||'equipment')) fail(`${binding.itemId}${binding.fieldPointer}: source owner collection does not match route collection`);
    if(binding.sourceCategory==='printed-price-comparator'&&sourceObject.itemId!==sourceOwner.itemId) fail(`${binding.itemId}${binding.fieldPointer}: source owner does not match the cited comparator item`);
    if(binding.sourceCategory!=='printed-price-comparator'&&sourceOwner.itemId!==binding.itemId) fail(`${binding.itemId}${binding.fieldPointer}: non-comparator source owner must be the routed item`);
    if(!binding.book||!Number.isInteger(binding.printedPage)||!Array.isArray(binding.regionIds)||typeof binding.reviewStatus!=='string') fail(`${binding.itemId}${binding.fieldPointer}: incomplete binding`);
    for(const key of ['regionEvidence','cropCoordinates','highlightCoordinates']){
      if(!Array.isArray(binding[key])||JSON.stringify(binding[key].map(region=>region.regionId))!==JSON.stringify(binding.regionIds)) fail(`${binding.itemId}${binding.fieldPointer}: region selection alignment differs in ${key}`);
    }
    const targetBook=sourceObject.book??sourceObject.source?.book??null;
    const targetPages=sourceObject.pages??(Number.isInteger(sourceObject.printedPage)?[sourceObject.printedPage]:Number.isInteger(sourceObject.page)?[sourceObject.page]:null);
    if(targetBook&&targetBook!==binding.book) fail(`${binding.collection||'equipment'}:${binding.itemId}${binding.fieldPointer}: bound book does not match cited source object`);
    if(targetPages&&!targetPages.includes(binding.printedPage)) fail(`${binding.collection||'equipment'}:${binding.itemId}${binding.fieldPointer}: bound printed page does not match cited source object`);
    if(binding.regionIds.length){
      if(!binding.catalog) fail(`${binding.itemId}${binding.fieldPointer}: region target has no catalog`);
      const catalog=catalogs.get(binding.catalog);
      if(!catalog) fail(`${binding.catalog}: bound catalog missing`);
      try{assertPrimaryRowEvidence(binding,catalog);}catch(error){fail(error.message);}
      for(const id of binding.regionIds){
        const region=catalog.regions?.find(candidate=>candidate.id===id);
        if(!region) fail(`${binding.itemId}${binding.fieldPointer}: region ${id} missing from ${binding.catalog}`);
        if(region.book!==binding.book||region.printedPage!==binding.printedPage||region.pdfPage!==(binding.pdfPage??null)) fail(`${binding.itemId}${binding.fieldPointer}: ${id} does not match cited source page`);
        if(region.boundsPdfPoints||region.normalizedPageRect){
          const expectedCrop=regionCropCoordinate(region);
          const actualCrop=binding.cropCoordinates?.find(candidate=>candidate.regionId===id);
          if(!Array.isArray(expectedCrop.rect)||expectedCrop.rect.length!==4||expectedCrop.rect.some(value=>!Number.isFinite(value))) fail(`${binding.itemId}${binding.fieldPointer}: catalog crop geometry is malformed for ${id}`);
          if(!actualCrop||JSON.stringify(actualCrop)!==JSON.stringify(expectedCrop)) fail(`${binding.itemId}${binding.fieldPointer}: exported crop geometry is missing, lossy, or stale for ${id}`);
        }
        const evidence=binding.regionEvidence?.find(candidate=>candidate.regionId===id);
        if(evidence){
          const actualHashes=sourceVisualRegionHashes(region);
          if(evidence.sourceSha256!==regionSourceSha256(catalog,region)) fail(`${binding.itemId}${binding.fieldPointer}: source hash is stale for ${id}`);
          if(evidence.imageSha256!==region.sha256) fail(`${binding.itemId}${binding.fieldPointer}: image hash is stale for ${id}`);
          if(evidence.focusRectsSha256!==createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex')) fail(`${binding.itemId}${binding.fieldPointer}: highlight geometry is stale for ${id}`);
          if(evidence.focusSha256!==actualHashes.focusSha256) fail(`${binding.itemId}${binding.fieldPointer}: canonical highlight geometry is stale for ${id}`);
          if(evidence.contentSha256!==actualHashes.contentSha256) fail(`${binding.itemId}${binding.fieldPointer}: region content hash is stale for ${id}`);
        }
        const expectedEvidence=binding.expectedRegionEvidence?.find(candidate=>candidate.regionId===id);
        if(expectedEvidence){
          const actualHashes=sourceVisualRegionHashes(region);
          if(expectedEvidence.sourceSha256!==regionSourceSha256(catalog,region)) fail(`${binding.itemId}${binding.fieldPointer}: recorded source hash is stale for ${id}`);
          if(expectedEvidence.imageSha256!==region.sha256) fail(`${binding.itemId}${binding.fieldPointer}: recorded image hash is stale for ${id}`);
          if(expectedEvidence.focusSha256!==actualHashes.focusSha256) fail(`${binding.itemId}${binding.fieldPointer}: recorded canonical highlight geometry is stale for ${id}`);
          if(expectedEvidence.contentSha256!==actualHashes.contentSha256) fail(`${binding.itemId}${binding.fieldPointer}: recorded region content hash is stale for ${id}`);
        }
    if(binding.reviewStatus==='field-target-reviewed'){
          const expectedReview=binding.expectedRegionEvidence||[];
          const reviewed=expectedReview.find(candidate=>candidate.regionId===id);
          if(!binding.targetReview||binding.targetReview.status!=='confirmed'||binding.targetReview.independent!==true||typeof binding.targetReview.evidence!=='string'||!reviewed) fail(`${binding.itemId}${binding.fieldPointer}: reviewed target ${id} lacks independent hash-bound target review`);
          if(!reviewed.sourceSha256||!reviewed.imageSha256||!reviewed.focusSha256||!reviewed.contentSha256) fail(`${binding.itemId}${binding.fieldPointer}: reviewed target ${id} lacks complete source/image/focus/content hashes`);
          if(!binding.targetReview.evidence.startsWith('research/')||binding.targetReview.evidence.split('/').includes('..')||!existsSync(resolve(root,binding.targetReview.evidence))) fail(`${binding.itemId}${binding.fieldPointer}: target review evidence file is missing or outside research`);
          if(typeof binding.targetReview.evidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(binding.targetReview.evidenceSha256)||binding.targetReview.evidenceSha256!==hashFile(binding.targetReview.evidence)) fail(`${binding.itemId}${binding.fieldPointer}: target review evidence file is stale or lacks its recorded hash`);
        }
      }
      if(binding.coordinateSpace!=='excerpt-image-normalized-top-left-xywh') fail(`${binding.itemId}${binding.fieldPointer}: region target coordinate space missing`);
    } else if(binding.reviewStatus==='field-target-reviewed') fail(`${binding.itemId}${binding.fieldPointer}: reviewed target has no region IDs`);
    if(binding.sourceSha256&&binding.catalog){const sourceRegion=(catalogs.get(binding.catalog)?.regions||[]).find(region=>region.book===binding.book&&region.printedPage===binding.printedPage);if(!sourceRegion||binding.sourceSha256!==regionSourceSha256(catalogs.get(binding.catalog),sourceRegion))fail(`${binding.itemId}${binding.fieldPointer}: cited source hash is stale`);}
  }
  for(const claim of inventory.siteClaims){
    const item=items.get(claim.itemId);
    if(Boolean(claim.printedPrice)!==Boolean(item.price)) fail(`${claim.itemId}: printed-price classification mismatch`);
    if(claim.printedPrice&&JSON.stringify(semanticValueSnapshot(claim.printedPrice))!==JSON.stringify(semanticValueSnapshot(item.price))) fail(`${claim.itemId}: source claim drift`);
    if(Boolean(claim.estimate)!==Boolean(item.suggestedPrice)) fail(`${claim.itemId}: estimate classification mismatch`);
    if(claim.estimate&&JSON.stringify(semanticValueSnapshot(claim.estimate.value))!==JSON.stringify(semanticValueSnapshot(item.suggestedPrice))) fail(`${claim.itemId}: editorial estimate snapshot drift`);
    if(claim.missingPrice!==(item.price==null)) fail(`${claim.itemId}: gap classification mismatch`);
  }
  return inventory;
}

export function attachEvidenceBindings(data, inventory) {
  const collections=projectCollections(data);
  const seen=new WeakSet();
  const clearGeneratedEvidenceBindings=value=>{
    if(!value||typeof value!=='object'||seen.has(value))return;
    seen.add(value);
    if(!Array.isArray(value))delete value.evidenceBindings;
    for(const [key,child] of Object.entries(value))if(key!=='evidenceBindings')clearGeneratedEvidenceBindings(child);
  };
  clearGeneratedEvidenceBindings(data);
  const bindingsBySourceObject=new Map();
  for(const binding of inventory.fieldEvidenceBindings){
    const item=collectionItem(collections,binding.collection||'equipment',binding.itemId);
    if(!item)throw new Error(`Cannot attach field evidence to missing ${binding.collection||'equipment'}:${binding.itemId}`);
    const target=valueAtPointer(item,binding.sourceObjectPointer??binding.fieldPointer);
    if(!target||typeof target!=='object'||Array.isArray(target))throw new Error(`Cannot attach field evidence without a non-array source object: ${binding.collection||'equipment'}:${binding.itemId}${binding.fieldPointer}`);
    if(!bindingsBySourceObject.has(target))bindingsBySourceObject.set(target,[]);
    bindingsBySourceObject.get(target).push(binding);
  }
  for(const [target,bindings] of bindingsBySourceObject)target.evidenceBindings=bindings;
  return data;
}

export function writePriceSourceInventory(inventory, output='research/price-source-inventory.json') {
  writeFileSync(resolve(root,output),`${JSON.stringify(inventory,null,2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1])===resolve(import.meta.filename)) {
  const inventory=buildPriceSourceInventory();
  validatePriceSourceInventory(inventory);
  writePriceSourceInventory(inventory);
  console.log(JSON.stringify(inventory.counts));
}

