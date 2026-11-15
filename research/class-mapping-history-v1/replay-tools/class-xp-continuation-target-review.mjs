import {createHash} from 'node:crypto';
import {readFileSync} from '../mm-replay-fs-v1.mjs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../../..');
const valueKeys=['afterLevel','increment','anchorLevel','anchorXp','book','pages','track'];
const identityKeys=['kind','collection','itemId','fieldPointer','sourceObjectPointer','value'];
const documentKeys=['artifactType','reviewedTargets','schemaVersion'];
const targetKeys=['expectedTargetIdentity','independent','regionEvidence','sourceEvidence','sourceValueGrade','status'];
const sourceKeys=['path','pointer','sha256'];
const regionKeys=['contentSha256','focusSha256','imageSha256','regionId','sourceSha256'];
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`:JSON.stringify(value);
const exactKeys=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&canonical(Object.keys(value).sort())===canonical([...keys].sort());
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

function researchPath(path){return typeof path==='string'&&path.startsWith('research/')&&!path.split('/').some(part=>part==='..'||part==='.'||!part)&&!path.includes('\\');}
function atPointer(value,pointer){
  if(typeof pointer!=='string'||!pointer.startsWith('/')||/~(?![01])/u.test(pointer))return undefined;
  for(const part of pointer.slice(1).split('/').map(p=>p.replaceAll('~1','/').replaceAll('~0','~'))){
    if(!value||typeof value!=='object'||!Object.hasOwn(value,part))return undefined;
    value=value[part];
  }
  return value;
}
function validValue(value){return exactKeys(value,valueKeys)&&Number.isSafeInteger(value.afterLevel)&&value.afterLevel>=1
  &&Number.isSafeInteger(value.increment)&&value.increment>0&&Number.isSafeInteger(value.anchorLevel)&&value.anchorLevel>=1
  &&Number.isSafeInteger(value.anchorXp)&&value.anchorXp>=0&&typeof value.book==='string'&&!!value.book.trim()
  &&Array.isArray(value.pages)&&value.pages.length>0&&value.pages.every(p=>Number.isSafeInteger(p)&&p>=1)
  &&typeof value.track==='string'&&!!value.track.trim();}
function validIdentity(value){return exactKeys(value,identityKeys)&&value.kind==='class-xp-continuation'&&value.collection==='classes'
  &&typeof value.itemId==='string'&&!!value.itemId.trim()&&value.fieldPointer==='/xpContinuation'
  &&value.sourceObjectPointer==='/xpContinuation'&&validValue(value.value);}

export function classXpContinuationTargetIdentity(itemId,target){
  return {kind:'class-xp-continuation',collection:'classes',itemId,fieldPointer:'/xpContinuation',sourceObjectPointer:'/xpContinuation',
    value:Object.fromEntries(valueKeys.map(key=>[key,target?.[key]]))};
}

/** Location review is bound to this exact current rule tuple, independently of
 * numeric mechanics grades and independently of ordered companion-context review. */
export function assertReviewedClassXpContinuationTarget(binding,{item,target,sourceOwner,sourceObjectPointer,
  readEvidence=path=>readFileSync(resolve(root,path)),}={}){
  if(binding?.reviewStatus!=='field-target-reviewed')return;
  if(binding.sourceCategory!=='class-xp-continuation'&&binding.targetReview?.expectedTargetIdentity?.kind!=='class-xp-continuation'
    &&!(binding.collection==='classes'&&typeof binding.fieldPointer==='string'&&binding.fieldPointer.startsWith('/xpContinuation')))return;
  const fail=message=>{throw new Error(`Reviewed class XP continuation ${binding.collection??'(missing collection)'}:${binding.itemId??'(missing owner)'}${binding.fieldPointer??'(missing pointer)'} ${message}`);};
  if(binding.collection!=='classes'||binding.sourceCategory!=='class-xp-continuation'||binding.fieldPointer!=='/xpContinuation'
    ||binding.sourceObjectPointer!=='/xpContinuation'||sourceObjectPointer!=='/xpContinuation')fail('must identify exactly the classes /xpContinuation object and category');
  if(binding.sourceOwner?.collection!=='classes'||binding.sourceOwner.itemId!==binding.itemId||sourceOwner?.collection!=='classes'
    ||sourceOwner.itemId!==binding.itemId||item?.id!==binding.itemId||!target||typeof target!=='object'||Array.isArray(target))fail('owner and current continuation object must agree');
  const expected=classXpContinuationTargetIdentity(binding.itemId,target);
  if(!validIdentity(expected)||!validIdentity(binding.targetReview?.expectedTargetIdentity)||canonical(expected)!==canonical(binding.targetReview.expectedTargetIdentity))fail('expectedTargetIdentity must match the exact current seven-field rule tuple');
  const review=binding.targetReview;
  if(review?.status!=='confirmed'||review.independent!==true)fail('target review must be independently confirmed');
  function read(path,hash){
    if(!researchPath(path)||!digest(hash))fail('evidence path or digest is invalid');
    let bytes;try{bytes=readEvidence(path);}catch{fail('evidence is unavailable');}
    if(createHash('sha256').update(bytes).digest('hex')!==hash)fail('evidence digest is stale');
    try{return JSON.parse(bytes.toString('utf8'));}catch{fail('evidence is not JSON');}
  }
  const proof=read(review.evidence,review.evidenceSha256);
  if(!exactKeys(proof,documentKeys)||proof.schemaVersion!==1||proof.artifactType!=='class-xp-continuation-target-review'||!Array.isArray(proof.reviewedTargets))fail('evidence must use the closed continuation target-review schema');
  const seen=new Set();
  for(const entry of proof.reviewedTargets){
    if(!exactKeys(entry,targetKeys)||!validIdentity(entry.expectedTargetIdentity)||entry.status!=='confirmed'||entry.independent!==true||entry.sourceValueGrade!=='NOT PROMOTED')fail('proof target is malformed or promotes a numeric grade');
    const id=entry.expectedTargetIdentity,key=[id.collection,id.itemId,id.fieldPointer].join('|');
    if(seen.has(key))fail('proof contains duplicate target identities');seen.add(key);
    if(!Array.isArray(entry.sourceEvidence)||entry.sourceEvidence.length<2)fail('author and independent source references are required');
    const sourcePaths=new Set(),sourceRefs=new Set(),sourceAcceptances=[];
    for(const ref of entry.sourceEvidence){
      if(!exactKeys(ref,sourceKeys)||ref.path===review.evidence)fail('source evidence is malformed or cyclic');
      const source=atPointer(read(ref.path,ref.sha256),ref.pointer),refkey=[ref.path,ref.pointer].join('|');
      if(!source||typeof source!=='object'||Array.isArray(source)||source.collection!=='classes'||source.itemId!==id.itemId
        ||source.fieldPointer!==id.fieldPointer||source.sourceObjectPointer!==id.sourceObjectPointer
        ||canonical(source.currentTupleProjection)!==canonical(id.value))fail('source reference must identify the same owner, field and exact tuple');
      const accepted=Array.isArray(source.acceptedRegionEvidence)?source.acceptedRegionEvidence:[source.acceptedRegionEvidence];
      const sourceRegions=new Map();
      for(const region of accepted){
        if(!region||typeof region!=='object'||Array.isArray(region)||typeof region.regionId!=='string'||!region.regionId.trim()
          ||sourceRegions.has(region.regionId)||!['sourceSha256','imageSha256','focusSha256','contentSha256'].every(key=>digest(region[key])))fail('source record accepted region evidence is missing, malformed or duplicated');
        sourceRegions.set(region.regionId,Object.fromEntries(regionKeys.map(key=>[key,region[key]])));
      }
      sourceAcceptances.push(sourceRegions);
      if(sourceRefs.has(refkey))fail('duplicate source reference');sourceRefs.add(refkey);sourcePaths.add(ref.path);
    }
    if(sourcePaths.size<2)fail('source references must use distinct author and independent records');
    if(!Array.isArray(entry.regionEvidence)||!entry.regionEvidence.length)fail('exact selected-region evidence is required');
    const ids=new Set();
    for(const region of entry.regionEvidence){
      if(!exactKeys(region,regionKeys)||typeof region.regionId!=='string'||!region.regionId.trim()||ids.has(region.regionId)
        ||!['sourceSha256','imageSha256','focusSha256','contentSha256'].every(key=>digest(region[key])))fail('region evidence is incomplete or duplicated');
      ids.add(region.regionId);
      if(sourceAcceptances.some(accepted=>canonical(accepted.get(region.regionId))!==canonical(region)))fail('proof primary region is not exactly accepted by both source records');
    }
  }
  const matches=proof.reviewedTargets.filter(entry=>entry.expectedTargetIdentity.itemId===binding.itemId);
  if(matches.length!==1||canonical(matches[0].expectedTargetIdentity)!==canonical(expected))fail('proof must contain exactly this current target identity');
  if(!Array.isArray(binding.expectedRegionEvidence)||!Array.isArray(binding.regionIds)
    ||canonical(binding.expectedRegionEvidence.map(r=>r.regionId))!==canonical(binding.regionIds)
    ||canonical(matches[0].regionEvidence)!==canonical(binding.expectedRegionEvidence))fail('proof must match the exact ordered primary region hashes');
}
