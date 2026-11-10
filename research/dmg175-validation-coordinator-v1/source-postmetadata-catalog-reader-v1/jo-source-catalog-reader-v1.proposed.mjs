// Additive exact catalog context for the historical alias-universe census.
// Six new UA28 region rows are projected only for this named old reader.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
export * from '../source-postmetadata-facade-v2/ua-source-batch6-jo-fixture-v2.proposed.mjs';
import {readBeforeJoFile as legacyRead,readBeforeJoBytes} from '../source-postmetadata-facade-v2/ua-source-batch6-jo-fixture-v2.proposed.mjs';

const root=realpathSync(fileURLToPath(new URL('../../../',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const[path,expected]of[
 ['research/dmg175-validation-coordinator-v1/source-postmetadata-facade-v2/ua-source-batch6-jo-fixture-v2.proposed.mjs','09da403f955f463a65fc38d28df8cc2c9a32b6f60b729cce2b966669576a1d84'],
 ['research/dmg175-validation-coordinator-v1/source-postmetadata-facade-v2/pass8-ua-source-history-v2.proposed.mjs','ab080c03052095d20b0c0367a9a0484d2f088816e651fcca229fe3462985557b'],
 ['research/dmg175-validation-coordinator-v1/history-epoch-proposal-v1/history-epoch-proposal-987-final-v1.json','6eaa68018b064c1209ce81656b915aa0ed7b02f4fc7b59a149b6571aad0ff7f5'],
])assert.equal(sha(readFileSync(resolve(root,path))),expected,path+': exact frozen predecessor required');
const catalogs=new Set([
 'dist/scans/verified/equipment-phb-hammer.json',
 'dist/scans/verified/equipment-phb-javelin.json',
 'dist/scans/verified/equipment-ua-harpoon.json',
]);

export function readBeforeJoFile(path,options){
 if(typeof path==='number')return legacyRead(path,options);
 let local;
 try{const absolute=realpathSync(path instanceof URL?fileURLToPath(path):resolve(String(path)));local=relative(root,absolute).replaceAll('\\','/');}catch{return legacyRead(path,options);}
 if(!catalogs.has(local))return legacyRead(path,options);
 // The frozen V2 API verifies whole SOURCE11 current/V28 raw blobs before
 // the unchanged character/Jo kernels. Assertion failures propagate here.
 const bytes=readBeforeJoBytes(local);
 const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):bytes;
}
