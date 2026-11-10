// Exact test-only V28 input context for the unchanged historical Jo loader.
// The current production loader and its actual FD inputs are tested separately.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync, mkdtempSync, mkdirSync, rmSync, realpathSync, lstatSync} from 'node:fs';
import {readVersion29HistoricalFile, normalizeVersion29HistoricalBytes, normalizeVersion29HistoricalJson} from '../closed-version29-reader-v3.proposed.mjs';
const readFileSync=readVersion29HistoricalFile;
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {loadJoUnextractedPriceRegistration as loadHistoricalJo} from '../../../tools/jo-unextracted-price-registration.mjs';
import {readV28Dmg175EquipmentFile} from '../history-recovery-v1/dmg175-equipment-epoch-outer-v2.proposed.mjs';

export {validateJoUnextractedPriceRegistration} from '../../../tools/jo-unextracted-price-registration.mjs';
const root=realpathSync(fileURLToPath(new URL('../../../',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const registryPath='research/source-audit-batch6-jo-unextracted-price.json';
const registrySha256='1e24b97d355cf2502a2f775d093652cf37675907aae8ffdc63d432d8908df5f5';
const historicalToolPath='tools/jo-unextracted-price-registration.mjs';
const historicalToolSha256='dc939de98ff9f796f6a1ec910aa8f0fc287508d6fbe5729c824af1ed4046f7c2';
const expectedDataObjectSha256='96a84012891a48638339ece0d3d7c66017dbf3b66ed30e4f97e5b180501dafba';
const expectedInventoryObjectSha256='70e7b15f68984a1dc0dcfbf98b4f78298f8e7c76d512e206396419fcb7636fa7';

function strictJson(value,ancestors=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert.ok(Number.isFinite(value)&&!Object.is(value,-0),'exact JSON number required');return;}
 assert.equal(typeof value,'object','plain JSON value required');
 assert.ok(!types.isProxy(value),'JSON proxies are not accepted');
 assert.ok(!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'inherited JSON serialization hooks are not accepted');
 assert.ok(!ancestors.has(value),'cyclic JSON is not accepted');
 assert.equal(Object.getOwnPropertySymbols(value).length,0,'symbol JSON properties are not accepted');
 const keys=Object.keys(value);
 if(Array.isArray(value)){
  assert.equal(Object.getPrototypeOf(value),Array.prototype,'plain JSON array required');
  assert.deepEqual(keys,Array.from({length:value.length},(_,index)=>String(index)),'dense JSON array required');
  assert.deepEqual(Object.getOwnPropertyNames(value),[...keys,'length'],'hidden array properties are not accepted');
 }else{
  assert.equal(Object.getPrototypeOf(value),Object.prototype,'plain JSON object required');
  assert.deepEqual(Object.getOwnPropertyNames(value),keys,'hidden object properties are not accepted');
 }
 ancestors.add(value);
 for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);assert.ok(Object.hasOwn(descriptor,'value'),'JSON accessors are not accepted');strictJson(descriptor.value,ancestors);}
 ancestors.delete(value);
}
const objectSha=value=>{strictJson(value);return sha(JSON.stringify(value));};

export function loadJoUnextractedPriceRegistrationAtV28({repoRoot,data,inventory}){
 assert.equal(realpathSync(repoRoot),root,'the actual pinned repository root is required');
 assert.equal(sha(readFileSync(resolve(root,historicalToolPath))),historicalToolSha256,'the entire original Jo loader remains unchanged');
 assert.equal(objectSha(data),expectedDataObjectSha256,'exact XP-before historical Jo data is required');
 assert.equal(objectSha(inventory),expectedInventoryObjectSha256,'exact XP-before historical Jo inventory is required');
 const registryBytes=readFileSync(resolve(root,registryPath));
 assert.equal(sha(registryBytes),registrySha256,'the complete original Jo registry remains unchanged');
 const registration=JSON.parse(registryBytes);
 const references=[registration.beforeEquipment,registration.currentEquipment,registration.historicalFourNoteReceipt,...registration.sourceProofs];
 assert.equal(references.length,5,'exactly five registry inputs are copied beside the original registry');
 const files=[{path:registryPath,bytes:registryBytes}];
 for(const reference of references){
  assert.ok(typeof reference.path==='string'&&!reference.path.startsWith('/')&&!reference.path.includes('\\')&&reference.path.split('/').every(part=>part&&part!=='.'&&part!=='..'),'closed repository evidence path required');
  const bytes=reference.path==='equipment.json'?readV28Dmg175EquipmentFile(resolve(root,reference.path)):readFileSync(resolve(root,reference.path));
  assert.equal(sha(bytes),reference.sha256,reference.path+': exact historical input bytes required');
  files.push({path:reference.path,bytes});
 }
 assert.equal(new Set(files.map(file=>file.path)).size,6,'the exact six physical context files are unique');
 const temporaryBase=realpathSync(tmpdir());
 const scratch=mkdtempSync(join(temporaryBase,'dmg175-jo-v28-loader-'));
 assert.equal(dirname(scratch),temporaryBase,'the owned scratch root must be directly below the temporary directory');
 assert.ok(lstatSync(scratch).isDirectory()&&!lstatSync(scratch).isSymbolicLink(),'the owned scratch root must be a physical directory');
 try{
  for(const file of files){const destination=join(scratch,file.path);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,file.bytes);}
  return loadHistoricalJo({repoRoot:scratch,data,inventory});
 }finally{
  rmSync(scratch,{recursive:true,force:true});
 }
}
