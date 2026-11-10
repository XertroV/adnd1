// Closed historical transport, separate from every actual-current native guard.
// This successor binds actual HIRED state separately from its Version29 predecessor.
import assert from 'node:assert/strict';
import {readHirelingsCurrentSourceInputs,assertHirelingsCurrentSourceCohort} from '../../tests/helpers/hirelings-source-current-cohort.mjs';
import {readFileSync as actualReadFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const contractBytes=actualReadFileSync(new URL('./closed-version29-reader-actual-hired-v2.json',import.meta.url));
assert.equal(sha(contractBytes),'3a4f78b7c2fb26a3384b4acb705fa645ec6ae7c0547544f28744d624cb7c3b93','exact closed historical reader contract');
const contract=JSON.parse(contractBytes),rows=new Map(contract.files.map(row=>[row.path,row])),cache=new Map();
assert.equal(rows.size,contract.files.length,'unique closed historical paths');
assert.equal(contract.baselineCommit,'1f79d909344ebe7d41a432d8673f3eedb491fa3b');
assert.equal(contract.nativeFixture.path,'tests/fixtures/hirelings-source-current-cohort-v1.json','fixed portable native fixture path');
const nativeFixtureBytes=actualReadFileSync(resolve(root,contract.nativeFixture.path));
assert.equal(sha(nativeFixtureBytes),contract.nativeFixture.sha256,'historical reader binds the exact closed current fixture');
assert.equal(JSON.parse(nativeFixtureBytes).sourceCommit,contract.sourceCommit,'historical and native source epochs match');
const nativeSummary=assertHirelingsCurrentSourceCohort(readHirelingsCurrentSourceInputs(root));
assert.equal(nativeSummary.sourceCommit,contract.sourceCommit,'the native runtime guard accepted this reader source epoch');
function baseline(path){
 const row=rows.get(path);assert.ok(row,'unregistered historical path');
 if(!cache.has(path)){
  const bytes=execFileSync('git',['show',`${contract.baselineCommit}:${path}`],{cwd:root,maxBuffer:128*1024*1024});
  assert.equal(sha(bytes),row.baseline.sha256,path+': complete actual Version29 Git blob');
  assert.equal(bytes.length,row.baseline.sizeBytes,path+': exact Version29 length');cache.set(path,bytes);
 }
 return Buffer.from(cache.get(path));
}
function plain(value,ancestors=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert.ok(Number.isFinite(value)&&!Object.is(value,-0),'closed history finite JSON numbers');return;}
 assert.equal(typeof value,'object','closed history JSON containers');assert.ok(!types.isProxy(value),'closed history rejects proxies');
 assert.ok(!ancestors.has(value),'closed history rejects cycles');assert.equal(Object.getOwnPropertySymbols(value).length,0,'closed history rejects symbols');
 assert.ok(!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'closed history rejects inherited serialization');
 const keys=Object.keys(value);
 if(Array.isArray(value)){
  assert.equal(Object.getPrototypeOf(value),Array.prototype,'closed history plain arrays');
  assert.deepEqual(keys,Array.from({length:value.length},(_,i)=>String(i)),'closed history dense arrays');
  assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'closed history visible array properties');
 }else{assert.equal(Object.getPrototypeOf(value),Object.prototype,'closed history plain objects');assert.deepEqual(Object.getOwnPropertyNames(value),keys,'closed history visible properties');}
 ancestors.add(value);for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);assert.ok(Object.hasOwn(descriptor,'value'),'closed history rejects accessors');plain(descriptor.value,ancestors);}ancestors.delete(value);
}
// Older literal states pass through for the unchanged original kernel to judge.
// Only an exact declared complete current state can take this new outer step.
export function normalizeVersion29HistoricalBytes(path,bytes){
 const row=rows.get(path);if(!row)return bytes;
 assert.ok(Buffer.isBuffer(bytes)||bytes instanceof Uint8Array,path+': history byte input required');
 return sha(bytes)===row.current.sha256?baseline(path):bytes;
}
export function normalizeVersion29HistoricalJson(path,value){
 const row=rows.get(path);if(!row)return value;
 plain(value);
 return row.json&&sha(JSON.stringify(value))===row.currentObjectSha256?JSON.parse(baseline(path)):value;
}
export function readVersion29HistoricalFile(path,options){
 if(typeof path==='number')return actualReadFileSync(path,options);
 const absolute=path instanceof URL?fileURLToPath(path):resolve(String(path)),local=relative(root,absolute).replaceAll('\\','/'),row=rows.get(local);
 if(!row)return actualReadFileSync(path,options);
 const current=actualReadFileSync(path),fingerprint=sha(current);
 assert.ok((fingerprint===row.current.sha256&&current.length===row.current.sizeBytes)||(fingerprint===row.baseline.sha256&&current.length===row.baseline.sizeBytes),local+': exact declared current or Version29 file required');
 const bytes=baseline(local),encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):bytes;
}
