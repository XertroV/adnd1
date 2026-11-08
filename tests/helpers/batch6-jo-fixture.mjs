import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {hash} from '../../tools/monetary-row-identity-audit.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,relative} from 'node:path';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root))),sha=b=>createHash('sha256').update(b).digest('hex');
export const joIntegration=read('research/source-audit-batch6-jo-integration-v2.json');
assert.equal(sha(readFileSync(new URL(joIntegration.supersedes.path,root))),joIntegration.supersedes.sha256,'the former Jo integration receipt remains exact historical evidence');
export const semanticJoFixture=value=>Array.isArray(value)?value.map(semanticJoFixture):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['evidenceBindings','regionReviews'].includes(key)).map(([key,child])=>[key,semanticJoFixture(child)])):value;
function frozen(ref){const zipped=readFileSync(new URL(ref.path,root));assert.equal(sha(zipped),ref.sha256,ref.path);const bytes=gunzipSync(zipped);if(ref.uncompressedSha256)assert.equal(sha(bytes),ref.uncompressedSha256);return JSON.parse(bytes);}
export const dataBeforeJo=frozen(joIntegration.beforeData);
export const caltropCatalogBeforeJo=frozen(joIntegration.beforeCaltropCatalog);
export const manifestBeforeJo=frozen(joIntegration.beforeContinuationManifest);
const equipmentBeforeJo=frozen(joIntegration.beforeEquipment);
export const contractsBeforeJo=frozen(joIntegration.beforeSourceContracts);
export function withoutBatch6JoEquipment(equipment){
 const matches=equipment.filter(item=>item.id==='ua-jo-stick');
 if(!matches.length)return equipment;
 assert.equal(matches.length,1,'the distinct Jo owner is unique');
 const actualHash=hash(semanticJoFixture(matches[0]));
 assert.ok([joIntegration.currentJo.rawRecordSha256,joIntegration.currentJo.assembledSemanticRecordSha256].includes(actualHash),'only an exact receipt-backed authored/assembled Jo record may be reversed');
 const assembled=actualHash===joIntegration.currentJo.assembledSemanticRecordSha256;
 return equipment.filter(item=>item.id!=='ua-jo-stick').map(item=>{
  if(item.id!=='ua-caltrop'||!assembled)return item;
  assert.equal(hash(semanticJoFixture(item)),joIntegration.currentCaltrop.assembledSemanticRecordSha256,'Caltrop may differ only by the exact new source/context transport');
  return structuredClone(dataBeforeJo.equipment.find(old=>old.id==='ua-caltrop'));
 });
}
export function withoutBatch6JoData(data){const equipment=withoutBatch6JoEquipment(data.equipment);if(equipment===data.equipment)return data;assert.deepEqual(data.release.priceInventory,joIntegration.currentReleasePriceInventory,'only the declared Jo price-inventory counters may be reversed');assert.deepEqual(data.release.excerpts,joIntegration.currentReleaseExcerpts,'only the exact Jo/Caltrop excerpt-count and owner changes may be reversed');return {...data,equipment,release:{...data.release,priceInventory:structuredClone(dataBeforeJo.release.priceInventory),excerpts:structuredClone(dataBeforeJo.release.excerpts)}};}
export function withoutBatch6JoManifest(manifest){
 const matches=manifest.groups.filter(group=>group.id===joIntegration.addedContinuationGroup.id);
 if(!matches.length)return manifest;
 assert.equal(matches.length,1);assert.equal(hash(matches[0]),joIntegration.groupSha256,'only the registered Jo context group may be reversed');
 return {...manifest,groups:manifest.groups.filter(group=>group.id!==joIntegration.addedContinuationGroup.id)};
}

export function readBeforeJoBytes(path){
 const normalized=String(path).replace(/^\.\//,'');
 const current=readFileSync(new URL(normalized,root));
 if(normalized==='dist/scans/verified/equipment-ua-caltrop.json'){
  assert.equal(sha(current),joIntegration.currentCaltrop.catalog.sha256,'exact current Caltrop catalogue before history reversal');return gunzipSync(readFileSync(new URL(joIntegration.beforeCaltropCatalog.path,root)));
 }
 if(normalized==='research/source-table-citation-contracts.json'){
  assert.equal(sha(current),joIntegration.currentSourceContracts.sha256,'exact current mapping contracts before history reversal');return gunzipSync(readFileSync(new URL(joIntegration.beforeSourceContracts.path,root)));
 }
 if(normalized==='research/citation-continuations.json'){assert.deepEqual(withoutBatch6JoManifest(JSON.parse(current)),manifestBeforeJo,'the original190 groups remain unchanged');return gunzipSync(readFileSync(new URL(joIntegration.beforeContinuationManifest.path,root)));}
 if(normalized==='citation-overrides.json'){assert.equal(sha(current),joIntegration.currentCitationOverrides.sha256,'exact current scoped overrides before history reversal');return gunzipSync(readFileSync(new URL(joIntegration.beforeCitationOverrides.path,root)));}
 const parsed=['dist/data.json','equipment.json','research/citation-continuations.json'].includes(normalized)?JSON.parse(current):null;
 const projected=normalized==='dist/data.json'?withoutBatch6JoData(parsed):normalized==='equipment.json'?{...parsed,equipment:withoutBatch6JoEquipment(parsed.equipment)}:normalized==='research/citation-continuations.json'?withoutBatch6JoManifest(parsed):null;
 return projected?Buffer.from(JSON.stringify(projected,null,2)+'\n'):current;
}
export const readBeforeJoJson=path=>JSON.parse(readBeforeJoBytes(path));

export function readBeforeJoFile(path,options){
 if(typeof path==='number')return readFileSync(path,options);
 const absolute=path instanceof URL?fileURLToPath(path):resolve(String(path));
 const local=relative(fileURLToPath(root),absolute).replaceAll('\\','/');
 const scoped=['equipment.json','dist/data.json','citation-overrides.json','research/citation-continuations.json','research/source-table-citation-contracts.json','dist/scans/verified/equipment-ua-caltrop.json'];
 if(!scoped.includes(local))return readFileSync(path,options);
 const bytes=readBeforeJoBytes(local),encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):bytes;
}

// Older context-fingerprint models can retain all their live source records
// while excluding only the separately registered, new unknown-price owner.
export function withoutBatch6JoCanonicalArtifact(artifact){
 const jo=artifact.data.siteClaims?.find(row=>row.itemId==='ua-jo-stick');if(!jo)return artifact;
 assert.equal(hash(jo),joIntegration.currentJo.canonicalSiteClaimSha256,'only the exact registered Jo canonical claim may be reversed');
 assert.equal(jo.missingPrice,true);assert.equal(jo.printedPrice,null);
 const data={...artifact.data,siteClaims:artifact.data.siteClaims.filter(row=>row.itemId!=='ua-jo-stick')};
 return {...artifact,data,sha256:hash(JSON.stringify(data))};
}
