// Transport-only adapter for unchanged historical semantic bodies.
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {types} from 'node:util';
// Inspect descriptors before iteration, property reads, or spreading. This pure
// boundary does not execute Git; the installed raw reader then enforces its
// fixed read-only command grammar before spawning the fixed Git executable.
export function cloneHistoricalGitCall(args,options={}){
 const fail=()=>{throw new Error('Plain historical Git string arguments and utf8 data option required');};
 if(types.isProxy(args)||!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||types.isProxy(options)||!options||Object.getPrototypeOf(options)!==Object.prototype)fail();
 const descriptors=Object.getOwnPropertyDescriptors(args),length=descriptors.length;
 if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<1||length.value>8||Reflect.ownKeys(descriptors).length!==length.value+1)fail();
 const copy=[];for(let index=0;index<length.value;index++){const descriptor=descriptors[index];if(!descriptor||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='string')fail();copy.push(descriptor.value);}
 let encoding=null;for(const key of Reflect.ownKeys(options)){const descriptor=Object.getOwnPropertyDescriptor(options,key);if(key!=='encoding'||!descriptor||!Object.hasOwn(descriptor,'value')||descriptor.value!=='utf8')fail();encoding=descriptor.value;}
 return {args:copy,encoding};
}
export function createHistoricalControlledGit(root){const raw=createRawGitReader(root);return Object.freeze({git(args,options={}){const call=cloneHistoricalGitCall(args,options),bytes=raw.git(...call.args);return call.encoding?bytes.toString(call.encoding):bytes;},spawnGit(args){const call=cloneHistoricalGitCall(args);try{return {status:0,stdout:raw.git(...call.args),stderr:Buffer.alloc(0)};}catch(error){if(!Number.isInteger(error.status))throw error;return {status:error.status,stdout:error.stdout??Buffer.alloc(0),stderr:error.stderr??Buffer.alloc(0)};}}});}
