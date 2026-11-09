import assert from 'node:assert/strict';
import {projectPass8CharacterReferenceBytes,isPass8XpContinuationHistoryPath} from './pass8-weapon-source-history.mjs';
import {projectDmg175Json} from './batch6-dmg175-source-history.mjs';
import {dmg175HistoryContract} from './batch6-dmg175-source-history.mjs';
import {reverseDmg74MatrixBatchFromData,withoutDmg74MatrixSourceExcerptOverrides} from './dmg74-matrix-batch.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {hash} from '../../tools/monetary-row-identity-audit.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,relative} from 'node:path';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root))),sha=b=>createHash('sha256').update(b).digest('hex');
export const joIntegration=read('research/source-audit-batch6-jo-integration-v4.json');
assert.equal(sha(readFileSync(new URL(joIntegration.supersedes.path,root))),joIntegration.supersedes.sha256,'the former Jo integration receipt remains exact historical evidence');
for(const ref of [...joIntegration.historicalJoReceipts,joIntegration.upstreamIntegration.sourceMetadataReview,joIntegration.upstreamIntegration.continuationRepairReview,joIntegration.upstreamIntegration.searchSourceReview,joIntegration.upstreamIntegration.searchMetricReview])assert.equal(sha(readFileSync(new URL(ref.path,root))),ref.sha256,'exact historical and published upstream integration review evidence');
export const semanticJoFixture=value=>Array.isArray(value)?value.map(semanticJoFixture):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['evidenceBindings','regionReviews'].includes(key)).map(([key,child])=>[key,semanticJoFixture(child)])):value;
function frozen(ref){const zipped=readFileSync(new URL(ref.path,root));assert.equal(sha(zipped),ref.sha256,ref.path);const bytes=gunzipSync(zipped);if(ref.uncompressedSha256)assert.equal(sha(bytes),ref.uncompressedSha256);return JSON.parse(bytes);}
export const dataBeforeJo=frozen(joIntegration.beforeData);
export const caltropCatalogBeforeJo=frozen(joIntegration.beforeCaltropCatalog);
export const manifestBeforeJo=frozen(joIntegration.beforeContinuationManifest);
const equipmentBeforeJo=frozen(joIntegration.beforeEquipment);
export const contractsBeforeJo=frozen(joIntegration.beforeSourceContracts);
// This separate, hash-bound stage precedes the unchanged JoV4 history guards.
// It has no dependency on the XP helper, which itself uses this fixture reader.
export const xpA65HistoryProjection=frozen({path:'research/source-audit-batch6-xp-a65-history-projection-contract.json.gz',sha256:'15fc0a2b012fefed1f7ea04cc01df979f468f856544cb40d454baf1315145acc'});
assert.equal(xpA65HistoryProjection.releasedMaster,'a65cb9931919a18a50591a206e6e4ea09064fc29');
assert.equal(xpA65HistoryProjection.xpFrozenCandidate,'c2efd1eba27f0b3047ef4ce80f7db187597c808f');
assert.equal(xpA65HistoryProjection.recordTransfers.length,17);
assert.equal(xpA65HistoryProjection.manifest.xpGroups.length,42);
for(const ref of xpA65HistoryProjection.sourceApprovals)assert.equal(sha(readFileSync(new URL(ref.path,root))),ref.sha256,'the existing source approval remains exact');
assert.deepEqual(xpA65HistoryProjection.metadataPolicy.stripOnlyGeneratedKeys,['evidenceBindings','regionReviews']);
assert.equal(xpA65HistoryProjection.metadataPolicy.restoreOnlyDeclaredBindingProperty,'regionCount');
assert.deepEqual(xpA65HistoryProjection.metadataPolicy.soleRawValueDelta,{collection:'classes',itemId:'ua-druid',fieldPointer:'/xpRows/0/pages',released:[16],merged:[16,17]});
for(const ref of xpA65HistoryProjection.recordTransfers){
 assert.equal(hash(ref.mergedRecord),ref.mergedSha256);assert.equal(hash(ref.releasedRecord),ref.releasedSha256);
 const current=semanticJoFixture(ref.mergedRecord),before=semanticJoFixture(ref.releasedRecord);
 for(const count of ref.declaredRegionCountTransitions){assert.ok(['sourceExcerpts','scanVerification'].includes(count.binding));assert.equal(current[count.binding].regionCount,count.afterMerged);assert.equal(before[count.binding].regionCount,count.beforeReleased);current[count.binding].regionCount=count.beforeReleased;}
 if(ref.collection==='classes'&&ref.itemId==='ua-druid'){assert.deepEqual(current.xpRows[0].pages,[16,17]);assert.deepEqual(before.xpRows[0].pages,[16]);current.xpRows[0].pages=[16];}
 assert.deepEqual(current,before,'the XP history stage changes only exact generated transport, declared excerpt counts and the one approved Grand source-page tuple');
}
export function withoutBatch6XpSourceMetadata(data){
 const refs=xpA65HistoryProjection.recordTransfers;
 const selected=refs.map(ref=>{const values=ref.collection==='progressionExplainer'?[data.progressionExplainer]:data[ref.collection];const matches=values.filter(item=>item?.id===ref.itemId);assert.equal(matches.length,1);return matches[0];});
 const alreadyReleased=selected.every((item,index)=>hash(item)===refs[index].releasedSha256);
 if(alreadyReleased){assert.deepEqual(data.release,xpA65HistoryProjection.releaseMetadata.released,'only the exact released Jo stage is an already-projected input');return data;}
 if(data.matrices?.some(matrix=>matrix?.id==='dmg-cleric-druid-monk-attack-matrix'))data=reverseDmg74MatrixBatchFromData(data,dmg175HistoryContract().files['dist/data.json'].current);
 data=projectDmg175Json('dist/data.json',data);
 assert.deepEqual(data.release,xpA65HistoryProjection.releaseMetadata.merged,'only exact merged XP release metadata may be reversed');
 const copy={...data,release:structuredClone(xpA65HistoryProjection.releaseMetadata.released)};
 for(const collection of new Set(refs.map(ref=>ref.collection))){
  const project=item=>{const ref=refs.find(row=>row.collection===collection&&row.itemId===item.id);if(!ref)return item;assert.equal(hash(item),ref.mergedSha256,'only exact approved XP record transport may be reversed');return structuredClone(ref.releasedRecord);};
  copy[collection]=collection==='progressionExplainer'?project(data[collection]):data[collection].map(project);
 }
 return copy;
}
export function withoutBatch6XpManifest(manifest){
 const expected=xpA65HistoryProjection.manifest;
 if(!manifest.groups.some(group=>expected.xpGroups.some(row=>row.id===group.id)))return manifest;
 assert.deepEqual(manifest.groups,[...expected.releasedGroups,...expected.xpGroups],'all208 released groups and the42 approved XP groups retain exact contents and ordering');
 return {...manifest,groups:structuredClone(expected.releasedGroups)};
}
export function beforeJoSearchOverridesForXp(overrides){
 const stages=xpA65HistoryProjection.overrideStages;
 assert.deepEqual(overrides,stages.merged,'only the whole exact merged Jo/Search/XP override object may enter the C2 history stage');
 assert.equal(hash(stages.c2),stages.c2Sha256);
 return structuredClone(stages.c2);
}
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
export function withoutBatch6JoData(data){
 const equipment=withoutBatch6JoEquipment(data.equipment);if(equipment===data.equipment)return data;
 data=withoutBatch6XpSourceMetadata(data);
 assert.deepEqual(data.release.priceInventory,joIntegration.currentReleasePriceInventory,'only the declared current price-inventory counters may be reversed');assert.deepEqual(data.release.excerpts,joIntegration.currentReleaseExcerpts,'only the exact current excerpt-count and owner changes may be reversed');
 const restored={};for(const collection of ['rules','classes']){
  const additions=joIntegration.upstreamIntegration.exactHistoricalRecordAdditions.filter(ref=>ref.collection===collection);
  for(const ref of additions){const matches=data[collection].filter(item=>item.id===ref.itemId);assert.equal(matches.length,1);assert.equal(hash(matches[0]),ref.currentRecordSha256,'only the exact published new source owner may be reversed');assert.equal(dataBeforeJo[collection].some(item=>item.id===ref.itemId),false);}
  restored[collection]=data[collection].filter(item=>!additions.some(ref=>ref.itemId===item.id)).map(item=>{const ref=joIntegration.upstreamIntegration.exactHistoricalRecordRestorations.find(r=>r.collection===collection&&r.itemId===item.id);if(!ref)return item;assert.equal(hash(item),ref.currentRecordSha256,'only exact published upstream source metadata may be reversed');const old=dataBeforeJo[collection].find(r=>r.id===item.id);assert.equal(hash(old),ref.beforeRecordSha256);return structuredClone(old);});
 }
 return {...data,equipment,...restored,release:{...data.release,priceInventory:structuredClone(dataBeforeJo.release.priceInventory),excerpts:structuredClone(dataBeforeJo.release.excerpts)}};
}
export function withoutBatch6JoManifest(manifest){
 const matches=manifest.groups.filter(group=>group.id===joIntegration.addedContinuationGroup.id);
 if(!matches.length)return manifest;
 assert.equal(matches.length,1);assert.equal(hash(matches[0]),joIntegration.groupSha256,'only the registered Jo context group may be reversed');
 return {...manifest,groups:manifest.groups.filter(group=>group.id!==joIntegration.addedContinuationGroup.id)};
}

export function readBeforeJoBytes(path){
 const normalized=String(path).replace(/^\.\//,'');
 let current=projectPass8CharacterReferenceBytes(normalized,readFileSync(new URL(normalized,root)));
 if(normalized==='dist/data.json'){
  let parsed=JSON.parse(current);
  if(parsed.matrices?.some(matrix=>matrix?.id==='dmg-cleric-druid-monk-attack-matrix'))parsed=reverseDmg74MatrixBatchFromData(parsed,dmg175HistoryContract().files[normalized].current);
  current=Buffer.from(JSON.stringify(projectDmg175Json(normalized,parsed),null,2)+'\n');
 }
 if(normalized==='citation-overrides.json'){
  const parsed=JSON.parse(current);
  if(parsed.sourceExcerpts?.['matrices:dmg-cleric-druid-monk-attack-matrix'])current=Buffer.from(JSON.stringify(withoutDmg74MatrixSourceExcerptOverrides(parsed),null,2)+'\n');
 }
 if(['citation-overrides.json','dist/scans/verified/rules-encounter-types.json'].includes(normalized))current=Buffer.from(JSON.stringify(projectDmg175Json(normalized,JSON.parse(current)),null,2)+'\n');
 if(normalized==='dist/scans/verified/equipment-ua-caltrop.json'){
  assert.equal(sha(current),joIntegration.currentCaltrop.catalog.sha256,'exact current Caltrop catalogue before history reversal');return gunzipSync(readFileSync(new URL(joIntegration.beforeCaltropCatalog.path,root)));
 }
 if(normalized==='research/source-table-citation-contracts.json'){
  assert.equal(sha(current),joIntegration.currentSourceContracts.sha256,'exact current mapping contracts before history reversal');return gunzipSync(readFileSync(new URL(joIntegration.beforeSourceContracts.path,root)));
 }
 if(normalized==='research/citation-continuations.json'){let projected=withoutBatch6JoManifest(withoutBatch6XpManifest(JSON.parse(current)));for(const ref of joIntegration.upstreamIntegration.groupAdditions){const matches=projected.groups.filter(group=>group.id===ref.group.id);assert.equal(matches.length,1);assert.equal(hash(matches[0]),ref.sha256,'only an exact reviewed upstream DMG group may be reversed');projected={...projected,groups:projected.groups.filter(group=>group.id!==ref.group.id)};}assert.deepEqual(projected,manifestBeforeJo,'the original190 groups remain unchanged');return gunzipSync(readFileSync(new URL(joIntegration.beforeContinuationManifest.path,root)));}
 if(normalized==='citation-overrides.json'){
  if(sha(current)!==joIntegration.currentCitationOverrides.sha256){
   const stages=xpA65HistoryProjection.overrideStages;assert.deepEqual(JSON.parse(current),stages.merged,'only the exact merged override stage may precede the original JoV4 guard');
   const released=structuredClone(stages.merged);for(const key of stages.regionCountKeys){assert.equal(released.sourceExcerpts[key].regionCount,stages.c2.sourceExcerpts[key].regionCount);released.sourceExcerpts[key].regionCount=stages.released.sourceExcerpts[key].regionCount;}
   assert.deepEqual(released,stages.released,'only the17 approved XP excerpt counts differ from released Jo overrides');
   assert.equal(sha(Buffer.from(JSON.stringify(released,null,2)+'\n')),joIntegration.currentCitationOverrides.sha256,'the original JoV4 override hash guard is retained');
  }
  return gunzipSync(readFileSync(new URL(joIntegration.beforeCitationOverrides.path,root)));
 }
 const parsed=['dist/data.json','equipment.json','research/citation-continuations.json'].includes(normalized)?JSON.parse(current):null;
 const projected=normalized==='dist/data.json'?withoutBatch6JoData(parsed):normalized==='equipment.json'?{...parsed,equipment:withoutBatch6JoEquipment(parsed.equipment)}:normalized==='research/citation-continuations.json'?withoutBatch6JoManifest(parsed):null;
 return projected?Buffer.from(JSON.stringify(projected,null,2)+'\n'):current;
}
export const readBeforeJoJson=path=>JSON.parse(readBeforeJoBytes(path));

export function readBeforeJoFile(path,options){
 if(typeof path==='number')return readFileSync(path,options);
 const absolute=path instanceof URL?fileURLToPath(path):resolve(String(path));
 const local=relative(fileURLToPath(root),absolute).replaceAll('\\','/');
 const scoped=['rules.json','phb-spell-index.json','phb-magic-user-extra.json','equipment.json','dist/data.json','citation-overrides.json','research/citation-continuations.json','research/source-table-citation-contracts.json','dist/scans/verified/equipment-ua-caltrop.json','dist/scans/verified/rules-encounter-types.json'];
 if(!scoped.includes(local)&&!isPass8XpContinuationHistoryPath(local))return readFileSync(path,options);
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
