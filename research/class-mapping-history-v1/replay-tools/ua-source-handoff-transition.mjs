// One exact historical correction qualification; current body values remain unchecked.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';

export const uaSourceHandoffTransitionPath='research/source-audit-pass8-ua-source-body-handoff-transition-v1.json';
export const uaSourceHandoffTransitionSha256='f79f4e38d79eff161748e683461b377508d2feff95f86833ba41853370025c05';
const valueHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const receiptValueSha='a4f2a8573fe0e7c37e1747927134ac4ef1e0abcff74e54d852262b67646d3eb3';
const sourceParsedSha='a2b91935062f6806c61ef984af6091342a2440081a07f14c0ca953233be0cafa';
const baselineParsedSha='b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6';
const conflictValueSha='7a61d692cd1cfe6bb08ab337d113c35041a5b47d0c97a18219eb25ead40ecc9e';
const fail=message=>{throw Error(`Invalid exact UA handoff transition: ${message}`);};
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

export function uaSourceHandoffContextMatches(receipt,{baselineData,currentData,conflictReceipt}){
 return receipt!==null&&receipt!==undefined&&[receipt,baselineData,currentData,conflictReceipt].every(value=>plainJson(value))&&valueHash(receipt)===receiptValueSha
  &&valueHash(baselineData)===baselineParsedSha&&valueHash(currentData)===sourceParsedSha
  &&valueHash(conflictReceipt)===conflictValueSha;
}

export function loadUaSourceHandoffTransition({read,hashFile,baselineData,currentData,mechanics,conflictReceipt}){
 // Other source phases retain the existing transition guards and receive no qualification.
 if(!plainJson(currentData)||!plainJson(mechanics)||!plainJson(conflictReceipt))fail('non-JSON current inputs');
 if(valueHash(currentData)!==sourceParsedSha)return null;
 if(hashFile(uaSourceHandoffTransitionPath)!==uaSourceHandoffTransitionSha256)fail('receipt bytes');
 const receipt=read(uaSourceHandoffTransitionPath);
 if(!uaSourceHandoffContextMatches(receipt,{baselineData,currentData,conflictReceipt}))fail('source, historical data, complete conflict receipt or qualification identity');
 if(receipt.sourceInputCommit!=='6b3cfc8cb421a2c1fc2379c38abebe2075634981'
   ||hashFile('dist/data.json')!=='c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3'
   ||hashFile('research/mechanics-audit-progress.json')!=='ca8d331e1e35c64c214bde313004c2d9a8ae19cdd6c5dd36fc644f061a426fd7'
   ||valueHash(mechanics.reviewRecords)!=='cfad75c6e4385af44edc85fe655d5913e2851aa2b948b7dfaf13e6ff01c6065e'
   ||mechanics.reviewRecords.length!==1215)fail('exact committed source or qualified1215 mechanics records');
 if(hashFile(receipt.originalConflictReceipt.path)!==receipt.originalConflictReceipt.sha256)fail('original conflict receipt bytes');
 for(const ref of receipt.evidence)if(hashFile(ref.path)!==ref.sha256)fail(`stale approved evidence ${ref.path}`);
 const target=receipt.qualifiedTarget,owner=currentData.spells.find(item=>item.id===target.itemId);
 const field=mechanics.records.find(item=>item.collection===target.collection&&item.id===target.itemId)?.fields.find(field=>field.path===target.pointer);
 if(target.collection!=='spells'||target.itemId!=='ua-druid-ceremony'||target.pointer!=='/exceptions/0'
   ||valueHash(owner)!==target.wholeCurrentOwnerSha256||owner.exceptions[0]!==target.currentValue
   ||!isDeepStrictEqual(field,target.currentMechanicsField)||field.status!=='unchecked'||field.inspected!==false)fail('exact owner, pointer, current assertion and pending field grade');
 return receipt;
}

export function isQualifiedUaSourceHistoricalChange(receipt,change){
 return valueHash(receipt)===receiptValueSha&&isDeepStrictEqual(change,receipt.originalConflictReceipt.change);
}

export function uaSourceHistoricalCaution(receipt,note,baselineIndex){
 if(valueHash(receipt)!==receiptValueSha||baselineIndex!==receipt.curatedHistoricalCaution.baselineIndex
   ||!isDeepStrictEqual(note,receipt.curatedHistoricalCaution.note))return null;
 return {...structuredClone(note),baselineIndex,disposition:'historical-reviewed-correction-replaced-by-pending-source-body',
  receipt:uaSourceHandoffTransitionPath,receiptSha256:uaSourceHandoffTransitionSha256,receiptPointer:'/qualifiedTarget',
  priorReviewedTransition:{receipt:receipt.originalConflictReceipt.path,receiptSha256:receipt.originalConflictReceipt.sha256,receiptPointer:'/changes/4',status:'historical'},
  priorHandoffDisposition:structuredClone(receipt.priorHandoffDisposition),currentFieldStatus:'unchecked',sourceValueGrade:'NOT PROMOTED',
  qualification:'The exact approved UA source-body replacement withdrew the obsolete current correction applications. The original ambiguity and adjudication remain historical; the replacement body assertion remains pending mechanics review.'};
}
