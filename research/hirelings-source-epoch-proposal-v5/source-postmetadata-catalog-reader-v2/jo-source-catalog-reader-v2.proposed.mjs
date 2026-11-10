// Separate, exact three-catalog epoch for the old alias-universe reader.
// SOURCE11 and every original historical kernel remain unchanged.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
export * from '../source-postmetadata-facade-v2/ua-source-batch6-jo-fixture-v2.proposed.mjs';
import {readBeforeJoFile as legacyRead} from '../source-postmetadata-facade-v2/ua-source-batch6-jo-fixture-v2.proposed.mjs';

const root=realpathSync(fileURLToPath(new URL('../../../',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const contractBytes=readFileSync(new URL('./closed-three-catalog-epoch-v1.json',import.meta.url));
assert.equal(sha(contractBytes),'0da70c72f088884bb47ee999e0e68c1b6d0b9461ca7efcee2d337a9624933395','exact separate three-catalog contract required');
const contract=JSON.parse(contractBytes);
assert.equal(contract.sourcePhase.commit,'987a25d3ba2dcac0940569a2afab73f775e38028');
assert.equal(contract.baseline.commit,'386b08a4678ee033d6daabc0ffa2cc17265a7c1f');
assert.equal(contract.files.length,3,'only three equipment catalog paths are registered');
for(const pin of contract.qualificationPins)assert.equal(sha(readFileSync(resolve(root,pin.path))),pin.sha256,pin.path+': exact qualification bytes required');
const stages=new Map();
for(const row of contract.files){
 const source=execFileSync('git',['show',`${contract.sourcePhase.commit}:${row.path}`],{cwd:root,maxBuffer:1024*1024});
 const before=execFileSync('git',['show',`${contract.baseline.commit}:${row.path}`],{cwd:root,maxBuffer:1024*1024});
 assert.equal(sha(source),row.sourceCurrent.sha256,row.path+': exact SOURCE catalog bytes required');
 assert.equal(source.length,row.sourceCurrent.sizeBytes);
 assert.deepEqual(readFileSync(resolve(root,row.path)),source,row.path+': live catalog must remain exact SOURCE');
 assert.equal(sha(before),row.v28Before.sha256,row.path+': exact complete V28 catalog bytes required');
 assert.equal(before.length,row.v28Before.sizeBytes);
 assert.equal(JSON.parse(source).regions.length,row.sourceCurrent.regionRows);
 assert.equal(JSON.parse(before).regions.length,row.v28Before.regionRows);
 stages.set(row.path,{row,before});
}
assert.equal(stages.size,3,'the three catalog paths are unique');

export function projectDmg175AliasCatalogBytes(path,bytes){
 assert.ok(typeof path==='string'&&stages.has(path),'only a closed three-catalog path may use this epoch');
 assert.ok(Buffer.isBuffer(bytes)||bytes instanceof Uint8Array,'complete raw catalog bytes required');
 const {row,before}=stages.get(path),actual=sha(bytes);
 assert.ok(actual===row.sourceCurrent.sha256||actual===row.v28Before.sha256,path+': exact complete SOURCE or V28 catalog bytes required');
 return Buffer.from(before);
}

export function readBeforeJoFile(path,options){
 if(typeof path==='number')return legacyRead(path,options);
 let local;
 try{const absolute=realpathSync(path instanceof URL?fileURLToPath(path):resolve(String(path)));local=relative(root,absolute).replaceAll('\\','/');}catch{return legacyRead(path,options);}
 if(!stages.has(local))return legacyRead(path,options);
 const bytes=projectDmg175AliasCatalogBytes(local,readFileSync(path));
 const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):bytes;
}
