import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {hash} from './monetary-row-identity-audit.mjs';
export const joPriceRegistrationPath='research/source-audit-batch6-jo-unextracted-price.json';
const historicalPath='research/source-audit-batch5-null-price-notes.json';
const historicalHash='af5cece0d237b0b70f774ff8254414d4701074121c61f1719487a3f01f96b44b';
const originalEquipmentHash='469c3d6643a209473e1ee5d052ad9e9320d00e69172130b151ada877e3846edf';
const oldIds=['phb-bo-stick','phb-club','phb-quarterstaff','phb-sling-stone'];
const currentIds=[...oldIds,'ua-jo-stick'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const sameIds=(a,b)=>Array.isArray(a)&&a.length===b.length&&new Set(a).size===a.length&&[...a].sort().join('\0')===[...b].sort().join('\0');
const fail=message=>{throw Error(`Invalid Jo unextracted-price registration: ${message}`);};
export function validateJoUnextractedPriceRegistration({registration,beforeEquipment,currentEquipment,historicalReceipt,data,inventory}){
 const r=registration;
 if(r?.schemaVersion!==1||r.owner?.collection!=='equipment'||r.owner.itemId!=='ua-jo-stick'||r.currentEquipment?.path!=='equipment.json'||r.historicalFourNoteReceipt?.path!==historicalPath||r.historicalFourNoteReceipt.sha256!==historicalHash||r.beforeEquipment?.uncompressedSha256!==originalEquipmentHash||r.beforeEquipment.ownerAbsent!==true)fail('exact owner and historical input identities');
 if(beforeEquipment.equipment?.length!==191||beforeEquipment.equipment.some(item=>item.id==='ua-jo-stick'))fail('owner must be absent from the exact before input');
 if(!sameIds(historicalReceipt.records?.map(x=>x.itemId),oldIds)||!sameIds(r.currentUnextractedIds,currentIds)||!sameIds(inventory.siteClaims.filter(c=>c.missingPrice).map(c=>c.itemId),currentIds))fail('current IDs must exhaustively equal the historical four plus distinct Jo');
 const raw=currentEquipment.equipment?.find(i=>i.id==='ua-jo-stick'),item=data.equipment?.find(i=>i.id==='ua-jo-stick');
 if(!raw||!item||currentEquipment.equipment.length!==192||hash(raw)!==r.owner.recordSha256||raw.book!=='UA'||raw.price!==null||item.price!==null||raw.priceState!=='unextracted'||item.priceState!=='unextracted'||Object.hasOwn(raw,'suggestedPrice')||Object.hasOwn(item,'suggestedPrice')||raw.priceNote!==r.priceNote||item.priceNote!==r.priceNote)fail('current Jo record, null price, source state or absent estimate');
 if(r.price!==null||r.priceState!=='unextracted'||r.suggestedPricePresent!==false||r.sourcePriceAbsenceReviewed!==false||r.extractedPriceReviewed!==false||r.semanticPass!==false)fail('unextracted field cannot be promoted to a reviewed value or source-absence claim');
 if(Object.keys(raw.fields??{}).length!==14||hash(raw.fields)!==hash(item.fields))fail('source-specific Jo fields differ from the registered record');
 return {itemId:'ua-jo-stick',name:raw.name,priceNote:r.priceNote,sourceAbsence:false,valueReviewed:false,recordSha256:r.owner.recordSha256};
}
export function loadJoUnextractedPriceRegistration({repoRoot,data,inventory}){
 const inputRefs=[];
 const bind=(ref,compressed=false)=>{if(!ref||typeof ref.path!=='string'||ref.path.startsWith('/')||ref.path.includes('\\')||ref.path.split('/').some(p=>!p||p==='.'||p==='..'))fail('non-repository evidence path');const bytes=readFileSync(resolve(repoRoot,ref.path));if(sha(bytes)!==ref.sha256)fail(`stale evidence ${ref.path}`);inputRefs.push({path:ref.path,sha256:ref.sha256});return compressed?bytes:JSON.parse(bytes);};
 const bytes=readFileSync(resolve(repoRoot,joPriceRegistrationPath)),registration=JSON.parse(bytes),registryRef={path:joPriceRegistrationPath,sha256:sha(bytes)};
 const oldBytes=gunzipSync(bind(registration.beforeEquipment,true));if(sha(oldBytes)!==originalEquipmentHash)fail('exact original equipment bytes');
 const currentEquipment=bind(registration.currentEquipment),historicalReceipt=bind(registration.historicalFourNoteReceipt);
 if(registration.sourceProofs?.length!==2||registration.sourceProofs[0].path!=='research/source-audit-batch6-jo-mapping-independent-review.json'||registration.sourceProofs[0].sha256!=='2393845114b9a2b9d29518c8464374b1e7312efd61dfbf68ace17afd4e3ed95c'||registration.sourceProofs[1].path!=='research/source-audit-batch6-jo-source-row-proof.json'||registration.sourceProofs[1].sha256!=='f919798c63d20a69605b7c2ac095acfe7bf9f4ec56ab7b767af3601f93ad2859')fail('source review identity');
 for(const proof of registration.sourceProofs)bind(proof);
 const addition=validateJoUnextractedPriceRegistration({registration,beforeEquipment:JSON.parse(oldBytes),currentEquipment,historicalReceipt,data,inventory});
 return {...addition,registryRef,inputRefs:[registryRef,...inputRefs]};
}
