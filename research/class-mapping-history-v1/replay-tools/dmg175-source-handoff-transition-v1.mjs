// Separate exact source epoch. The closed UA helper and all its constants remain unchanged.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';
import {loadUaSourceHandoffTransition,uaSourceHandoffContextMatches,isQualifiedUaSourceHistoricalChange,uaSourceHistoricalCaution,uaSourceHandoffTransitionPath,uaSourceHandoffTransitionSha256} from './ua-source-handoff-transition.mjs';

export const dmg175SourceHandoffTransitionPath="research/source-audit-pass8-dmg175-source-body-handoff-transition-v1.json";
export const dmg175SourceHandoffTransitionSha256="01b659d865c8c36eaf7a7a9bf26e3ceebf72ec25c4b431c6b316de2111ebc182";
const valueHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const receiptValueSha="b595af00888043e480fa22a43db473763cacb62d358174574f1a500253b0afd7",oldReceiptValueSha="a4f2a8573fe0e7c37e1747927134ac4ef1e0abcff74e54d852262b67646d3eb3";
const sourceParsedSha="eaa0272264047dd990260b16cfe0909b76e9ec50479989a8cfd579c89490dd8b",baselineParsedSha="b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6",conflictValueSha='7a61d692cd1cfe6bb08ab337d113c35041a5b47d0c97a18219eb25ead40ecc9e';
const fail=message=>{throw Error(`Invalid exact DMG175 handoff transition: ${message}`);};
function plainJson(value,active=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return true;
 if(typeof value==='number')return Number.isFinite(value)&&!Object.is(value,-0);
 if(typeof value!=='object'||types.isProxy(value)||active.has(value))return false;
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(prototype!==(array?Array.prototype:Object.prototype)||Object.getPrototypeOf(Object.prototype)!==null
   ||Object.getPrototypeOf(Array.prototype)!==Object.prototype
   ||Object.hasOwn(Object.prototype,'toJSON')||Object.hasOwn(Array.prototype,'toJSON'))return false;
 const keys=Reflect.ownKeys(value);
 if(array&&(keys.length!==value.length+1||!keys.includes('length')))return false;
 active.add(value);
 for(const key of keys){
  if(array&&key==='length')continue;
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')
    ||array&&!/^(0|[1-9]\d*)$/.test(key)||!plainJson(descriptor.value,active)){active.delete(value);return false;}
 }
 active.delete(value);return true;
}

export function dmg175SourceHandoffContextMatches(receipt,{baselineData,currentData,conflictReceipt}){
 return [receipt,baselineData,currentData,conflictReceipt].every(value=>plainJson(value))&&valueHash(receipt)===receiptValueSha&&valueHash(baselineData)===baselineParsedSha&&valueHash(currentData)===sourceParsedSha&&valueHash(conflictReceipt)===conflictValueSha;
}
export function loadDmg175SourceHandoffTransition({read,hashFile,baselineData,currentData,mechanics,conflictReceipt}){
 if(![currentData,mechanics,conflictReceipt].every(value=>plainJson(value)))fail('non-JSON current inputs');
 if(valueHash(currentData)!==sourceParsedSha)return null;
 if(hashFile(dmg175SourceHandoffTransitionPath)!==dmg175SourceHandoffTransitionSha256)fail('receipt bytes');
 const receipt=read(dmg175SourceHandoffTransitionPath);
 if(!dmg175SourceHandoffContextMatches(receipt,{baselineData,currentData,conflictReceipt}))fail('complete source, baseline, conflict receipt or qualification identity');
 if(receipt.sourceInputCommit!=="987a25d3ba2dcac0940569a2afab73f775e38028"||receipt.sourceInputTree!=="d7ac09ce9abe4ef94ae355a44b8e0c5ca6f74ea3")fail('exact source commit/tree');
 for(const ref of receipt.sourceInputs)if(hashFile(ref.path)!==ref.sha256)fail(`stale exact source input ${ref.path}`);
 if(hashFile(receipt.currentMechanics.path)!==receipt.currentMechanics.rawSha256||valueHash(mechanics)!==receipt.currentMechanics.parsedSha256||mechanics.input.sha256!==receipt.currentMechanics.mechanicsInputSha256||mechanics.reviewRecords.length!==1215||valueHash(mechanics.reviewRecords)!==receipt.currentMechanics.reviewRecordsSha256)fail('complete current mechanics or1215historical review records');
 if(hashFile(receipt.originalConflictReceipt.path)!==receipt.originalConflictReceipt.sha256)fail('original complete conflict receipt bytes');
 for(const ref of receipt.evidence)if(hashFile(ref.path)!==ref.sha256)fail(`stale inherited or actual producer evidence ${ref.path}`);
 const prior=read(receipt.inheritedHistoricalQualification.path);
 if(!plainJson(prior)||valueHash(prior)!==oldReceiptValueSha||!isDeepStrictEqual(prior.qualifiedTarget,receipt.qualifiedTarget)||!isDeepStrictEqual(prior.originalConflictReceipt,receipt.originalConflictReceipt)||!isDeepStrictEqual(prior.curatedHistoricalCaution,receipt.curatedHistoricalCaution)||!isDeepStrictEqual(prior.priorHandoffDisposition,receipt.priorHandoffDisposition))fail('inherited exact historical qualification');
 const target=receipt.qualifiedTarget,owner=currentData.spells.find(row=>row.id===target.itemId),field=mechanics.records.find(row=>row.collection===target.collection&&row.id===target.itemId)?.fields.find(row=>row.path===target.pointer);
 if(target.collection!=='spells'||target.itemId!=='ua-druid-ceremony'||target.pointer!=='/exceptions/0'||valueHash(owner)!==target.wholeCurrentOwnerSha256||owner.exceptions[0]!==target.currentValue||!isDeepStrictEqual(field,target.currentMechanicsField)||field.status!=='unchecked'||field.inspected!==false)fail('exact owner/pointer/value and pending field grade');
 return receipt;
}
export function loadSourceHandoffTransition(args){
 if(!plainJson(args.currentData))fail('non-JSON current source');
 return valueHash(args.currentData)===sourceParsedSha?loadDmg175SourceHandoffTransition(args):loadUaSourceHandoffTransition(args);
}
export function sourceHandoffContextMatches(receipt,context){return dmg175SourceHandoffContextMatches(receipt,context)||uaSourceHandoffContextMatches(receipt,context);}
export function sourceHandoffTransitionReference(receipt){
 if(!plainJson(receipt))fail('non-JSON qualification');
 const hash=valueHash(receipt);
 if(hash===receiptValueSha)return {path:dmg175SourceHandoffTransitionPath,sha256:dmg175SourceHandoffTransitionSha256};
 if(hash===oldReceiptValueSha)return {path:uaSourceHandoffTransitionPath,sha256:uaSourceHandoffTransitionSha256};
 fail('unknown closed qualification');
}
export function isQualifiedSourceHistoricalChange(receipt,change){
 if(!plainJson(receipt)||!plainJson(change))return false;
 return valueHash(receipt)===receiptValueSha?isDeepStrictEqual(change,receipt.originalConflictReceipt.change):isQualifiedUaSourceHistoricalChange(receipt,change);
}
export function sourceHistoricalCaution(receipt,note,baselineIndex){
 if(!plainJson(receipt)||!plainJson(note))return null;
 if(valueHash(receipt)!==receiptValueSha)return uaSourceHistoricalCaution(receipt,note,baselineIndex);
 if(baselineIndex!==70||baselineIndex!==receipt.curatedHistoricalCaution.baselineIndex||!isDeepStrictEqual(note,receipt.curatedHistoricalCaution.note))return null;
 return {...structuredClone(note),baselineIndex,disposition:'historical-reviewed-correction-replaced-by-pending-source-body',receipt:dmg175SourceHandoffTransitionPath,receiptSha256:dmg175SourceHandoffTransitionSha256,receiptPointer:'/qualifiedTarget',priorReviewedTransition:{receipt:receipt.originalConflictReceipt.path,receiptSha256:receipt.originalConflictReceipt.sha256,receiptPointer:'/changes/4',status:'historical'},priorHandoffDisposition:structuredClone(receipt.priorHandoffDisposition),inheritedHistoricalQualification:{path:receipt.inheritedHistoricalQualification.path,sha256:receipt.inheritedHistoricalQualification.sha256},currentFieldStatus:'unchecked',sourceValueGrade:'NOT PROMOTED',qualification:'The exact DMG175 source epoch preserves the prior bounded UA source-body withdrawal as history. The unchanged current assertion remains pending mechanics review.'};
}
