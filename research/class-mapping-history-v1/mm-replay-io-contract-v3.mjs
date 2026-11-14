import {types} from 'node:util';
import {absoluteInput} from './mm-replay-io-contract-v1.mjs';

const hasOwn=(value,key)=>Object.hasOwn(value,key);
const nativeSource=Function.prototype.toString;

function ownDataDescriptor(value,key){
 const descriptor=Object.getOwnPropertyDescriptor(value,key);
 return descriptor&&hasOwn(descriptor,'value')?descriptor:null;
}

function sameDataDescriptorShape(actual,expected){
 return !!actual&&!!expected&&hasOwn(actual,'value')&&hasOwn(expected,'value')&&
  actual.enumerable===expected.enumerable&&actual.writable===expected.writable&&
  actual.configurable===expected.configurable;
}

// Native source and proxy rejection happen before descriptor checks. The
// name/length/prototype fields are then read only from own data descriptors;
// no value.name/value.length/value.prototype access can invoke a caller getter.
function isNativeIntrinsic(value,expected){
 if(typeof value!=='function'||types.isProxy(value))return false;
 let source,expectedSource;
 try{
  source=Reflect.apply(nativeSource,value,[]);
  expectedSource=Reflect.apply(nativeSource,expected,[]);
 }catch{return false;}
 if(source!==expectedSource)return false;
 const name=ownDataDescriptor(value,'name'),length=ownDataDescriptor(value,'length'),prototype=ownDataDescriptor(value,'prototype');
 const expectedName=ownDataDescriptor(expected,'name'),expectedLength=ownDataDescriptor(expected,'length'),expectedPrototype=ownDataDescriptor(expected,'prototype');
 return sameDataDescriptorShape(name,expectedName)&&name.value===expectedName.value&&
  sameDataDescriptorShape(length,expectedLength)&&length.value===expectedLength.value&&
  sameDataDescriptorShape(prototype,expectedPrototype)&&prototype.value!==null&&typeof prototype.value==='object';
}

// Recognize the real Object.prototype from another realm without accepting
// arbitrary custom prototypes. No caller property is read through inheritance.
function isRealmObjectPrototype(proto){
 if(proto===Object.prototype)return true;
 if(!proto||typeof proto!=='object'||types.isProxy(proto)||Object.getPrototypeOf(proto)!==null)return false;
 const d=Object.getOwnPropertyDescriptor(proto,'constructor');
 if(!d||!hasOwn(d,'value')||d.enumerable!==false||d.writable!==true||d.configurable!==true||!isNativeIntrinsic(d.value,Object))return false;
 return ownDataDescriptor(d.value,'prototype')?.value===proto;
}

// A cross-realm Array is accepted only when its immediate prototype is that
// realm's native Array.prototype. Subclass/custom-prototype arrays still fail.
function isRealmArrayPrototype(proto){
 if(proto===Array.prototype)return true;
 if(!proto||types.isProxy(proto)||!Array.isArray(proto)||!isRealmObjectPrototype(Object.getPrototypeOf(proto)))return false;
 const d=Object.getOwnPropertyDescriptor(proto,'constructor');
 if(!d||!hasOwn(d,'value')||d.enumerable!==false||d.writable!==true||d.configurable!==true||!isNativeIntrinsic(d.value,Array))return false;
 return ownDataDescriptor(d.value,'prototype')?.value===proto;
}

function isPlainRecord(value){
 if(types.isProxy(value)||!value||typeof value!=='object')return false;
 const proto=Object.getPrototypeOf(value);
 return proto===Object.prototype||isRealmObjectPrototype(proto);
}

export function detachedArgvForChildV3(args){
 if(types.isProxy(args)||!Array.isArray(args)||!isRealmArrayPrototype(Object.getPrototypeOf(args)))throw Error('Plain bounded historical argv required');
 const d=Object.getOwnPropertyDescriptors(args),n=d.length?.value;
 if(!Number.isSafeInteger(n)||n<1||n>16||Reflect.ownKeys(d).length!==n+1)throw Error('Dense bounded historical argv required');
 const copy=[];
 for(let i=0;i<n;i++){const value=d[i];if(!value||!hasOwn(value,'value')||typeof value.value!=='string')throw Error('Own historical argv string data required');copy.push(value.value);}
 return copy;
}

export function detachedChildOptionsForChildV3(value={}){
 if(!isPlainRecord(value))throw Error('Plain historical child options required');
 const result={};
 for(const key of Reflect.ownKeys(value)){
  const d=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||!['cwd','encoding','maxBuffer','input','stdio'].includes(key)||!d||!hasOwn(d,'value'))throw Error('Closed historical child data options required');
  const x=d.value;
  if(key==='maxBuffer'){
   if(!Number.isSafeInteger(x)||x<1||x>150*1024*1024)throw Error('Typed historical child option required');
   result[key]=x;continue;
  }
  if(key==='stdio'){
   if(!['pipe','ignore'].includes(x))throw Error('Typed historical child option required');
   result[key]=x;continue;
  }
  if(key==='cwd'){
   if(typeof x==='string'){result.cwd=x;continue;}
   try{result.cwd=absoluteInput(x);}catch{throw Error('Typed historical child option required');}
   continue;
  }
  if(typeof x!=='string')throw Error('Typed historical child option required');
  if(key==='encoding'&&!['utf8','utf-8'].includes(x))throw Error('UTF8 historical child encoding required');
  result[key]=x;
 }
 return result;
}
