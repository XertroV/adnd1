import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';
import {readFileSync} from '../mm-replay-fs-v1.mjs';
import {resolve} from 'node:path';

import {assertNativeContractBytes,assertNativeHirelingsSourceEpoch,nativeSourceRawPaths} from './native-h-epoch-guard-v2.mjs';

import * as priorModule from './dmg175-source-handoff-transition-v1.mjs';
const {dmg175SourceHandoffTransitionPath:priorTransitionPath,dmg175SourceHandoffTransitionSha256:priorTransitionSha256,
 isQualifiedSourceHistoricalChange:priorIsQualifiedChange,sourceHistoricalCaution:priorHistoricalCaution,
 sourceHandoffTransitionReference:priorTransitionReference}=priorModule;

export const nativeSourceHandoffTransitionPath='research/hirelings-native-h-v1/source-body-handoff-transition-v1.json';
const BASELINE_DATA_COMMIT='679b15d1c580172e54314829c1c3c86dc78b65f3';
const BASELINE_DATA_PARSED_SHA256='b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6';
const ORIGINAL_CONFLICT_VALUE_SHA256='7a61d692cd1cfe6bb08ab337d113c35041a5b47d0c97a18219eb25ead40ecc9e';
const fail=message=>{throw new Error(`Invalid native HIRED source-body handoff transition V2: ${message}`);};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const valueHash=value=>sha256(Buffer.from(JSON.stringify(value)));
const same=(left,right)=>isDeepStrictEqual(left,right);
const parse=(bytes,label)=>{try{return JSON.parse(bytes.toString('utf8'));}catch{fail(`${label} is not valid JSON`);}};
function plainJson(value,active=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return true;
 if(typeof value==='number')return Number.isFinite(value)&&!Object.is(value,-0);
 if(typeof value!=='object'||types.isProxy(value)||active.has(value))return false;
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(prototype!==(array?Array.prototype:Object.prototype)||Object.getPrototypeOf(Object.prototype)!==null
  ||Object.getPrototypeOf(Array.prototype)!==Object.prototype||Object.hasOwn(Object.prototype,'toJSON')
  ||Object.hasOwn(Array.prototype,'toJSON'))return false;
 const keys=Reflect.ownKeys(value);if(array&&(keys.length!==value.length+1||!keys.includes('length')))return false;
 active.add(value);
 for(const key of keys){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||array&&!/^(0|[1-9]\d*)$/.test(key)
   ||!plainJson(d.value,active)){active.delete(value);return false;}}
 active.delete(value);return true;
}
function safePath(path){if(typeof path!=='string'||path.startsWith('/')||path.includes('\\')||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('non-repository evidence path');return path;}
const ref=(path,sha)=>({path,sha256:sha});

function deepFreezeJson(value){
 if(value===null||typeof value!=='object')return value;
 for(const key of Object.keys(value))deepFreezeJson(value[key]);
 return Object.freeze(value);
}

/** Parse the exact closed receipt bytes and return a separate frozen JSON snapshot. */
export function snapshotNativeHandoffReceiptBytes(bytes,expectedSha256){
 if(!Buffer.isBuffer(bytes)||!/^[a-f0-9]{64}$/.test(expectedSha256||'')||sha256(bytes)!==expectedSha256)
  fail('native H transition receipt bytes are not the exact closed receipt');
 const parsed=parse(bytes,nativeSourceHandoffTransitionPath);
 if(!plainJson(parsed))fail('native H transition receipt is not plain JSON');
 return deepFreezeJson(parsed);
}

export function assertNativeHandoffCallerReceiptMatchesSnapshot(callerReceipt,snapshot){
 if(!plainJson(callerReceipt)||!snapshot||!same(callerReceipt,snapshot))fail('caller receipt reader differs from the exact checked receipt bytes');
 return true;
}

/** Pure seam shared by the runtime API and bounded snapshot-mutation checks. */
export function addNativeSourceQualificationFromValidatedSnapshot(caution,pin){
 if(!pin||!pin.receiptSnapshot||!/^[a-f0-9]{40}$/.test(pin.sourceCommit||'')
  ||!/^[a-f0-9]{40}$/.test(pin.sourceTree||'')||!/^[a-f0-9]{64}$/.test(pin.receiptSha256||'')
  ||typeof pin.receiptPath!=='string'||!plainJson(caution)
  ||pin.receiptSnapshot.sourceEpoch?.sourceCommit!==pin.sourceCommit
  ||pin.receiptSnapshot.sourceEpoch?.sourceTree!==pin.sourceTree)return null;
 const closedCaution=structuredClone(caution);
 closedCaution.nativeSourceQualification={path:pin.receiptPath,sha256:pin.receiptSha256,pointer:'/qualifiedTarget',
  sourceCommit:pin.sourceCommit,sourceTree:pin.sourceTree,currentFieldStatus:'unchecked',sourceValueGrade:'NOT PROMOTED'};
 return deepFreezeJson(closedCaution);
}

function assertReceipt(receipt,{contract,contractSha256,contractPath,receiptPath,receiptSha256,priorReceipt}){
 const keys=['schemaVersion','artifactType','status','sourceEpoch','priorTransition','currentSourceData','currentMechanics','historicalBaseline','originalConflictReceipt','qualifiedTarget','curatedHistoricalCaution','priorHandoffDisposition','inheritedHistoricalQualification','evidence','policy','semanticPass','currentSourceValueGrade'];
 if(!receipt||!same(Object.keys(receipt).sort(),keys.sort()))fail('unexpected native transition receipt properties');
 if(receipt.schemaVersion!==1||receipt.artifactType!=='exact-HIRED-native-source-body-historical-transition-qualification'
  ||receipt.status!=='historical-correction-qualified-current-body-unchecked'||receipt.semanticPass!==false
  ||receipt.currentSourceValueGrade!=='NOT PROMOTED')fail('receipt status/policy boundary');
 const expectedEpoch={contract:ref(contractPath,contractSha256),sourceCommit:contract.sourceCommit,sourceTree:contract.sourceTree,baselineCommit:contract.baseline.baselineCommit,
  baselineAncestorOfSource:true,sourceAncestorOfCurrentHead:true,sourceRawInputs:nativeSourceRawPaths.map(path=>ref(path,contract.sourceRawInputs[path]))};
 if(!same(receipt.sourceEpoch,expectedEpoch))fail('native source epoch identity or ancestry proof');
 if(!same(receipt.priorTransition,{path:priorTransitionPath,sha256:priorTransitionSha256,valueSha256:'b595af00888043e480fa22a43db473763cacb62d358174574f1a500253b0afd7'}))fail('prior D175 transition lineage');
 if(!same(receipt.currentSourceData,{path:'dist/data.json',rawSha256:contract.sourceRawInputs['dist/data.json'],parsedSha256:receipt.currentSourceData?.parsedSha256})
  ||!/^[a-f0-9]{64}$/.test(receipt.currentSourceData?.parsedSha256||''))fail('actual current H data reference');
 if(!same(receipt.historicalBaseline,{commit:BASELINE_DATA_COMMIT,parsedDataSha256:BASELINE_DATA_PARSED_SHA256}))fail('exact historical data baseline');
 const oldTarget=priorReceipt.qualifiedTarget;
 const expectedTarget={...oldTarget,wholeCurrentOwnerSha256:'10935b5f68822fe32345ee226633f017934e6b57ac90a02f4d63b9271b1a16a7'};
 if(!same(receipt.qualifiedTarget,expectedTarget))fail('exact Druid Ceremony owner, pointer, source-body value, and pending mechanics field');
 if(receipt.originalConflictReceipt?.path!==priorReceipt.originalConflictReceipt.path
  ||receipt.originalConflictReceipt?.sha256!==priorReceipt.originalConflictReceipt.sha256
  ||receipt.originalConflictReceipt?.qualifiedChangeIndex!==4
  ||!same(receipt.originalConflictReceipt.change,priorReceipt.originalConflictReceipt.change))fail('exact prior conflict-receipt/change lineage');
 if(!same(receipt.curatedHistoricalCaution,priorReceipt.curatedHistoricalCaution)
  ||!same(receipt.priorHandoffDisposition,priorReceipt.priorHandoffDisposition)
  ||!same(receipt.inheritedHistoricalQualification,priorReceipt.inheritedHistoricalQualification))fail('historical caution, handoff disposition, or inherited qualification was rewritten');
 const m=receipt.currentMechanics;
 if(!m||m.path!=='research/mechanics-audit-progress.json'||!/^[a-f0-9]{64}$/.test(m.rawSha256||'')
  ||!/^[a-f0-9]{64}$/.test(m.parsedSha256||'')||!/^[a-f0-9]{64}$/.test(m.mechanicsInputSha256||'')
  ||m.reviewRecords!==1215||m.reviewRecordsSha256!=='cfad75c6e4385af44edc85fe655d5913e2851aa2b948b7dfaf13e6ff01c6065e')fail('actual current mechanics source and 1,215 historical review-record pins');
 const expectedEvidence=[ref(contractPath,contractSha256),ref('research/mechanics-audit-progress.json',receipt.currentMechanics.rawSha256),ref(priorReceipt.originalConflictReceipt.path,priorReceipt.originalConflictReceipt.sha256)];
 if(!same(receipt.evidence,expectedEvidence))fail('current H source, mechanics, and exact conflict evidence references');
 const requiredPolicy=[
  'Exactly the original conflict change 4 and curated caution 70 qualify as inherited history. No second conflict row or caution is waived.',
  'The current HIRED source data and mechanics inputs are validated from actual files under the exact native source epoch; no projected Version 29 data is accepted.',
  'The prior D175 receipt and its caution meaning remain unchanged and are referenced as history. This receipt adds only the native HIRED source qualification.',
  'The ua-druid-ceremony /exceptions/0 assertion and its mechanics field remain unchanged, unchecked, and NOT PROMOTED.',
  'This metadata qualification records historical intent only. It grants no source-value, field-target, context, continuation, overlay, whole-book, publication, or release approval.'
 ];
 if(!same(receipt.policy,requiredPolicy))fail('native pending/review boundary policy');
 if(!receiptPath||!receiptSha256)fail('closed current receipt identity');
 return receipt;
}

export function createNativeHirelingsSourceHandoffTransition({contractBytes,contractSha256,contractPath,receiptPath=nativeSourceHandoffTransitionPath,receiptSha256,repoRoot=process.cwd()}={}){
 const contract=assertNativeContractBytes(contractBytes,contractSha256),root=resolve(repoRoot);
 if(!contractPath||!/^[a-f0-9]{64}$/.test(receiptSha256||''))fail('closed source contract and current receipt references are required');
 safePath(contractPath);safePath(receiptPath);
 const validated=new WeakMap();
 function verifyContext(receipt,{baselineData,currentData,conflictReceipt}){
  const pin=validated.get(receipt);if(!pin)return false;
  if(![baselineData,currentData,conflictReceipt].every(value=>plainJson(value)))return false;
  if(valueHash(baselineData)!==BASELINE_DATA_PARSED_SHA256||valueHash(currentData)!==pin.currentDataParsedSha256
   ||valueHash(conflictReceipt)!==pin.conflictReceiptValueSha256)return false;
  const owner=currentData.spells?.find(item=>item.id==='ua-druid-ceremony');
  return valueHash(owner)===pin.ownerSha256&&owner?.exceptions?.[0]===pin.currentValue;
 }
 function loadSourceHandoffTransition({read,hashFile,baselineData,currentData,mechanics,conflictReceipt,repoRoot:callRoot=root}={}){
  const currentRoot=resolve(callRoot);
  if(typeof read!=='function'||typeof hashFile!=='function'||![baselineData,currentData,mechanics,conflictReceipt].every(value=>plainJson(value)))fail('JSON current/historical inputs and file readers are required');
  const sourceContext=assertNativeHirelingsSourceEpoch({repoRoot:currentRoot,contract});
  const contractBytesCurrent=readFileSync(resolve(currentRoot,contractPath));
  if(sha256(contractBytesCurrent)!==contractSha256||!contractBytesCurrent.equals(contractBytes))fail('closed source contract file bytes changed');
  const receiptBytes=readFileSync(resolve(currentRoot,receiptPath));
  if(sha256(receiptBytes)!==receiptSha256||hashFile(receiptPath)!==receiptSha256)fail('native H transition receipt bytes');
  const receipt=snapshotNativeHandoffReceiptBytes(receiptBytes,receiptSha256);
  const callerReceipt=read(receiptPath);
  assertNativeHandoffCallerReceiptMatchesSnapshot(callerReceipt,receipt);
  const priorBytes=readFileSync(resolve(currentRoot,priorTransitionPath));
  if(sha256(priorBytes)!==priorTransitionSha256)fail('prior D175 transition receipt bytes');
  const priorReceipt=deepFreezeJson(parse(priorBytes,priorTransitionPath));
  if(priorTransitionReference(priorReceipt).path!==priorTransitionPath||priorTransitionReference(priorReceipt).sha256!==priorTransitionSha256)fail('prior exact historical receipt identity');
  assertReceipt(receipt,{contract,contractSha256,contractPath,receiptPath,receiptSha256,priorReceipt});
  if(valueHash(baselineData)!==BASELINE_DATA_PARSED_SHA256||valueHash(currentData)!==receipt.currentSourceData.parsedSha256)fail('historical baseline or complete current data identity');
  const currentDataBytes=readFileSync(resolve(currentRoot,'dist/data.json'));
  if(sha256(currentDataBytes)!==receipt.currentSourceData.rawSha256||JSON.stringify(parse(currentDataBytes,'dist/data.json'))!==JSON.stringify(currentData))fail('actual current data bytes do not match passed HIRED data');
  const mechanicsBytes=readFileSync(resolve(currentRoot,receipt.currentMechanics.path));
  if(sha256(mechanicsBytes)!==receipt.currentMechanics.rawSha256||valueHash(mechanics)!==receipt.currentMechanics.parsedSha256
   ||mechanics.input?.sha256!==receipt.currentMechanics.mechanicsInputSha256||mechanics.reviewRecords?.length!==1215
   ||valueHash(mechanics.reviewRecords)!==receipt.currentMechanics.reviewRecordsSha256)fail('complete current mechanics input or all 1,215 historical reviews');
  const conflictBytes=readFileSync(resolve(currentRoot,receipt.originalConflictReceipt.path));
  if(sha256(conflictBytes)!==receipt.originalConflictReceipt.sha256||hashFile(receipt.originalConflictReceipt.path)!==receipt.originalConflictReceipt.sha256)fail('original complete conflict receipt bytes');
  const actualConflict=parse(conflictBytes,receipt.originalConflictReceipt.path);
  if(!same(actualConflict,conflictReceipt)||valueHash(conflictReceipt)!==ORIGINAL_CONFLICT_VALUE_SHA256)fail('passed conflict object differs from the exact unchanged source receipt');
  const prior=receipt.priorTransition;
  if(!same(receipt.originalConflictReceipt,priorReceipt.originalConflictReceipt)
   ||!same(receipt.qualifiedTarget.currentMechanicsField,priorReceipt.qualifiedTarget.currentMechanicsField))fail('inherited historical change or current pending field drifted');
  const target=receipt.qualifiedTarget,owner=currentData.spells.find(row=>row.id===target.itemId);
  const field=mechanics.records?.find(row=>row.collection===target.collection&&row.id===target.itemId)?.fields?.find(row=>row.path===target.pointer);
  if(target.collection!=='spells'||target.itemId!=='ua-druid-ceremony'||target.pointer!=='/exceptions/0'
   ||valueHash(owner)!==target.wholeCurrentOwnerSha256||owner.exceptions?.[0]!==target.currentValue
   ||!same(field,target.currentMechanicsField)||field.status!=='unchecked'||field.inspected!==false)fail('current exact target owner/value and still-pending mechanics field');
  for(const evidence of receipt.evidence){safePath(evidence.path);if(hashFile(evidence.path)!==evidence.sha256)fail(`stale current H handoff evidence ${evidence.path}`);}
  const originalChange=receipt.originalConflictReceipt.change;
  if(!priorIsQualifiedChange(priorReceipt,originalChange))fail('prior exact historical change no longer qualifies');
  const priorCaution=priorHistoricalCaution(priorReceipt,receipt.curatedHistoricalCaution.note,receipt.curatedHistoricalCaution.baselineIndex);
  if(!priorCaution)fail('prior exact curated caution no longer qualifies');
  const currentDataParsedSha256=valueHash(currentData),conflictReceiptValueSha256=valueHash(conflictReceipt);
  const pin=Object.freeze({receiptSnapshot:receipt,receiptPath,receiptSha256,repoRoot:currentRoot,
   sourceCommit:sourceContext.sourceCommit,sourceTree:sourceContext.sourceTree,
   currentDataParsedSha256,conflictReceiptValueSha256,ownerSha256:valueHash(owner),currentValue:target.currentValue});
  validated.set(receipt,pin);
  if(!verifyContext(receipt,{baselineData,currentData,conflictReceipt}))fail('full native handoff context does not match');
  return receipt;
 }
 function sourceHandoffContextMatches(receipt,context){return verifyContext(receipt,context);}
 function isQualifiedSourceHistoricalChange(receipt,change){
  const pin=validated.get(receipt);if(!pin||!plainJson(change))return false;
  const priorBytes=readFileSync(resolve(pin.repoRoot,priorTransitionPath));if(sha256(priorBytes)!==priorTransitionSha256)return false;
  const priorReceipt=deepFreezeJson(parse(priorBytes,priorTransitionPath));
  return priorIsQualifiedChange(priorReceipt,change)&&same(change,pin.receiptSnapshot.originalConflictReceipt.change);
 }
 function sourceHistoricalCaution(receipt,note,baselineIndex){
  const pin=validated.get(receipt);if(!pin||!plainJson(note))return null;
  const snapshot=pin.receiptSnapshot;
  if(!same(note,snapshot.curatedHistoricalCaution.note)||baselineIndex!==snapshot.curatedHistoricalCaution.baselineIndex)return null;
  const priorBytes=readFileSync(resolve(pin.repoRoot,priorTransitionPath));if(sha256(priorBytes)!==priorTransitionSha256)return null;
  const priorReceipt=deepFreezeJson(parse(priorBytes,priorTransitionPath)),caution=priorHistoricalCaution(priorReceipt,note,baselineIndex);
  if(!caution)return null;
  return addNativeSourceQualificationFromValidatedSnapshot(caution,pin);
 }
 function sourceHandoffTransitionReference(receipt){
  const pin=validated.get(receipt);if(pin)return ref(pin.receiptPath,pin.receiptSha256);
  return priorTransitionReference(receipt);
 }
 return {loadSourceHandoffTransition,sourceHandoffContextMatches,isQualifiedSourceHistoricalChange,sourceHistoricalCaution,sourceHandoffTransitionReference,sourceHandoffTransitionPath:receiptPath,sourceHandoffTransitionSha256:receiptSha256};
}

export const nativeHandoffDevelopmentConstants=Object.freeze({priorTransitionPath,priorTransitionSha256,BASELINE_DATA_COMMIT,BASELINE_DATA_PARSED_SHA256});
