// Pure handoff snapshot kernel: exact used functions extracted from the frozen native-H v2 adapter.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';
export const nativeSourceHandoffTransitionPath='research/hirelings-native-h-v1/source-body-handoff-transition-v1.json';
const fail=message=>{throw new Error(`Invalid native HIRED source-body handoff transition V2: ${message}`);};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
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

