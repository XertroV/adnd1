// Historical MM replay tool copy; old unit-provenance assertions remain exact.
// Full structural inventory of unit/quantity/interval/source-basis metadata.
// This records candidate field locations and hashes; it does not infer source
// meanings from lexical matches or treat null fields as source omissions.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,assertHistoricalMmTestStage,historicalMmTestRoot} from '../mm-replay-fs-v2.mjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {loadAuditInputs} from './quantity-source-absence-audit.mjs';
import {collectMonetaryRowIdentityRecords,monetaryRowIdentityInputs} from './monetary-row-identity-audit.mjs';
import {loadJoCurrentSuccessor,joCurrentMmContractPath as joPriceRegistrationPath,joCurrentMmContractSha256 as joPriceRegistrationSha256} from './dmg175-current-successors-mm-v2.mjs';
import {assertCurrentMmSourceEpoch} from '../../../tests/helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {joPriceRegistrationPath as legacyJoPriceRegistrationPath} from './jo-unextracted-price-registration.mjs';

assertHistoricalMmTestStage();
const root=historicalMmTestRoot;
export const unitFieldPattern=/(?:unit|quantit|qty|count|number|pieces?|scale|size|interval|duration|period|basis|measure|rate|amount(?:per|or)|perUnit|frequency|timeunit)/i;
export const semanticUnitFieldPattern=/^(?:unit|units|quantity|qty|quantityOrScale|quantityCondition|amountPer[A-Z].*|perUnitPriceDerived)$/i;
export const quantityUnitBeforePath='research/quantity-unit-provenance-before-v1.json';
export const quantityUnitBeforeSha256='984fd892d09dd7d6330b0f12f79280d4e17f0aac69de3b3dd37ebb432c51ffcd';
export const whaleUnitReviewReceiptPath='research/source-audit-batch5-whale-unit-root-independent-review-v3.json';
export const whaleUnitReviewReceiptSha256='ff213c5708557968e757ebb270c8380d8d27b0237902d36123bfc99523af5c2f';
export const whaleUnitExactInputArchivePath='tests/fixtures/whale-unit-exact-inputs-and-proposal-before-root.json.gz';
export const whaleUnitExactInputArchiveSha256='c9dfe390c9711da9f3569b3fd927c22bc35c4424aaa7344e0f4ee3047f686a38';
export const expectedWhaleUnitBeforeSha256='6eeffcb1b213fb00a443f55acd3f78312697efd1391d7fcb3cfa112f8da1766d';
export const expectedWhaleUnitNullSha256='74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b';
export const expectedWhaleCarcassUnitSha256='1b68d1ff64b72310eca7dd8e9e3f98c931f707aecf7a2ad8194a69f3dff2fc3d';
export const joUnitAdmissionBeforePath='tests/fixtures/monetary-unit-provenance-jo-2162-before.json.gz';
export const joUnitAdmissionBeforeSha256='ea0bac57fffec3b8d449d65ee67f15cc772ba98b1641876405844d612621f723';
export const expectedCurrentUnitRecordCount=2162;
export const expectedJoUnitRecord={
 uid:'site-price-claim:ua-jo-stick',input:'research/price-source-inventory.json',pointer:'/siteClaims/191',
 recordSha256:'be68e9ff606e5ed998aed58485b4a84eebb8777ddd7638d7f4b89c3190237e85',
 rowIdentitySha256:'4fb44a000bbd0378c43d7d1a5be03610b2364a95b4f0e8502d5c7a19e4ac0547',
 sourceValueSha256ByPointer:{
  '/printedPrice':'74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
  '/priceState':'184fac4333b3e186799bef0a7805b436595ad687589175af9bca713497adfacf',
  '/priceNote':'284d1fa330d65dd42d867350b5053a2b4be3affd18bd19f60eb2e7207f3a0c7c',
  '/missingPrice':'b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b',
 },
};
export const sourceWitnesses={
 whaleAmbergris:{
  source:{book:'MM',printedPage:100,pdfPage:101,sourcePdfSha256:'c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81'},
  sourceRender:{sha256:'9f619442e28828ef11ee21b45c9ce0a9eab875390f05e86b42eb6bb0e835a379',width:1416,height:1936,dpi:180},
  pdfPageBoundsPoints:[284.2,283.3,534.43,343.02],
  unitPointers:[
   {inputKey:'canonical',jsonPointer:'/sourcePageCensuses/2/claims/36/unit'},
   {inputKey:'canonical',jsonPointer:'/sourcePageCensuses/2/sourceArtifact/claims/36/unit'},
   {inputKey:'receipts',jsonPointer:'/claimReceipts/153/typedClaim/unit'},
   {inputKey:'monsterCensus',jsonPointer:'/claims/36/unit'},
  ],
 },
 whaleCarcass:{
  source:{book:'MM',printedPage:100,pdfPage:101,sourcePdfSha256:'c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81'},
  sourceRender:{sha256:'9f619442e28828ef11ee21b45c9ce0a9eab875390f05e86b42eb6bb0e835a379',width:1416,height:1936,dpi:180},
  pdfPageBoundsPoints:[284.2,283.3,534.43,343.02],
  unitPointers:[
   {inputKey:'canonical',jsonPointer:'/sourcePageCensuses/2/claims/37/unit'},
   {inputKey:'canonical',jsonPointer:'/sourcePageCensuses/2/sourceArtifact/claims/37/unit'},
   {inputKey:'receipts',jsonPointer:'/claimReceipts/154/typedClaim/unit'},
   {inputKey:'monsterCensus',jsonPointer:'/claims/37/unit'},
  ],
 },
};
const sha=value=>createHash('sha256').update(Buffer.isBuffer(value)?value:typeof value==='string'?value:canonical(value)).digest('hex');
function canonical(value){return Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`:JSON.stringify(value);}
function safeParse(bytes,path){try{return JSON.parse(bytes.toString('utf8'));}catch(error){throw new Error(`Invalid JSON in ${path}: ${error.message}`);}}
const esc=value=>String(value).replace(/~/g,'~0').replace(/\//g,'~1');
const ptr=parts=>parts.length?`/${parts.map(esc).join('/')}`:'';
const typeOf=value=>value===null?'null':Array.isArray(value)?'array':typeof value;
const sourceKeys=['book','bookKey','printedPage','pdfPage','sourcePdfSha256','sourceSha256','sourceFileSha256'];
const metadataOnlyKeys=['id','recordId','sourceRowOrClaimId','sourceObject','sourceObjectOrPassage','itemId','name','slug','key','rowOrPassageIdentity','recordType'];
const groupFor=field=>{
 const groups=[];
 if(/unit|perUnit/i.test(field))groups.push('unit');
 if(/quantit|qty|count|number|piece/i.test(field))groups.push('quantity');
 if(/interval|duration|period|frequency|timeunit/i.test(field))groups.push('interval-or-duration');
 if(/scale|size/i.test(field))groups.push('scale-or-size');
 if(/basis|measure/i.test(field))groups.push('source-or-measurement-basis');
 if(/rate/i.test(field))groups.push('rate');
 if(/amount/i.test(field))groups.push('amount');
 return groups;
};

function walkScalarLeaves(value,visit,parts=[]){
 if(value!==null&&typeof value==='object'){
  if(Array.isArray(value))for(let i=0;i<value.length;i++)walkScalarLeaves(value[i],visit,[...parts,i]);
  else for(const [key,child]of Object.entries(value))walkScalarLeaves(child,visit,[...parts,key]);
 } else visit({jsonPointer:ptr(parts),parts,value});
}
function valueAt(data,pointer){
 if(pointer==='')return {found:true,value:data};
 let value=data;
 for(const part of pointer.slice(1).split('/').map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~'))){
  if(Array.isArray(value)){if(!/^\d+$/.test(part)||Number(part)>=value.length)return {found:false};value=value[Number(part)];}
  else if(value!==null&&typeof value==='object'&&Object.hasOwn(value,part))value=value[part];else return {found:false};
 }
 return {found:true,value};
}
function safeContext(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const identity=Object.fromEntries(metadataOnlyKeys.filter(key=>Object.hasOwn(value,key)&&['string','number'].includes(typeof value[key])).map(key=>[key,value[key]]));
 const source=Array.isArray(value.source)?value.source[0]:value.source;
 if(source&&typeof source==='object')for(const key of sourceKeys)if(Object.hasOwn(source,key)&&['string','number'].includes(typeof source[key]))identity[`source.${key}`]=source[key];
 return Object.keys(identity).length?identity:null;
}
export function loadFrozenUnitInventoryBaseline({repoRoot=root}={}){
 const bytes=readFileSync(resolve(repoRoot,quantityUnitBeforePath)),baseline=safeParse(bytes,quantityUnitBeforePath),baselineSha256=sha(bytes);
 if(baselineSha256!==quantityUnitBeforeSha256)throw new Error(`Frozen unit-inventory baseline changed: ${baselineSha256}`);
 if(baseline.baseline?.inputs?.length!==10||baseline.scope?.monetaryRowIdentityRecordCount!==2161)throw new Error('Frozen unit-inventory baseline scope changed.');
 for(const [name,expectedHash]of [['whaleAmbergris',expectedWhaleUnitBeforeSha256],['whaleCarcass',expectedWhaleCarcassUnitSha256]]){
  const fixture=baseline.sourceWitnesses?.[name],pointers=sourceWitnesses[name].unitPointers;
  if(!fixture||fixture.pointerValues?.length!==pointers.length)throw new Error(`Frozen unit baseline lacks exact ${name} pointer set.`);
  const keys=new Set(fixture.pointerValues.map(row=>`${row.inputKey}\u0000${row.jsonPointer}`));
  if(keys.size!==pointers.length||pointers.some(ref=>!keys.has(`${ref.inputKey}\u0000${ref.jsonPointer}`)))throw new Error(`Frozen unit baseline pointer set changed for ${name}.`);
  if(fixture.pointerValues.some(row=>row.valueSha256!==expectedHash))throw new Error(`Frozen ${name} value hash changed.`);
  for(const row of fixture.pointerValues){const input=baseline.baseline.inputs.find(item=>item.key===row.inputKey);if(!input||row.inputPath!==input.path||!/^([a-f0-9]{64})$/.test(row.inputSha256)||row.inputSha256!==input.sha256)throw new Error(`Frozen ${name} input binding changed at ${row.inputKey}${row.jsonPointer}.`);}
 }
 if(expectedWhaleUnitNullSha256!==sha(null))throw new Error('Expected null unit value hash constant mismatch.');
 return {baseline,baselineSha256,bytes:bytes.length};
}
export function loadApprovedWhaleUnitReviewReceipt({repoRoot=root}={}){
 const bytes=readFileSync(resolve(repoRoot,whaleUnitReviewReceiptPath)),receipt=safeParse(bytes,whaleUnitReviewReceiptPath),receiptSha256=sha(bytes);
 if(receiptSha256!==whaleUnitReviewReceiptSha256)throw new Error(`Whale unit review receipt hash changed: ${receiptSha256}`);
 if(receipt.status!=='approved-exact-unit-correction; implementation pending'||receipt.independent!==true||receipt.reviewedUid!=='source-census-claim:mm-whale-ambergris')throw new Error('Whale unit review receipt is not the exact approved independent review.');
 if(receipt.source?.sha256!==sourceWitnesses.whaleAmbergris.source.sourcePdfSha256||receipt.sourcePixelWitness?.sha256!==sourceWitnesses.whaleAmbergris.sourceRender.sha256||receipt.sourcePixelWitness?.printedPage!==100||receipt.sourcePixelWitness?.pdfPage!==101)throw new Error('Whale unit review receipt source witness changed.');
 const mutation=receipt.approvedMutation;
 if(mutation?.beforeValueSha256!==expectedWhaleUnitBeforeSha256||mutation?.expectedValue!==null||mutation?.expectedValueSha256!==expectedWhaleUnitNullSha256||receipt.decisions?.ambergrisSourceTypedUnit!==null||receipt.decisions?.printedPerLumpUnit!==false)throw new Error('Whale unit review receipt does not authorize the exact null correction.');
 if(receipt.decisions?.sourceRange?.minimum!==1000||receipt.decisions?.sourceRange?.maximum!==20000||receipt.decisions?.sourceRange?.currency!=='gp'||receipt.decisions?.sourceRange?.condition!=='in a large city'||receipt.decisions?.whaleCarcassUnit!=='per hit die of size'||receipt.decisions?.whaleCarcassAmountGp!==100)throw new Error('Whale unit review receipt changes the separately reviewed price facts.');
 const mirrors=mutation.mirrorFields,pointers=sourceWitnesses.whaleAmbergris.unitPointers;
 if(!Array.isArray(mirrors)||mirrors.length!==pointers.length)throw new Error('Whale unit review receipt mirror set is incomplete.');
 const actual=new Set(mirrors.map(row=>`${row.inputKey}\u0000${row.jsonPointer}`)),expected=new Set(pointers.map(ref=>`${ref.inputKey}\u0000${ref.jsonPointer}`));
 if(actual.size!==expected.size||[...expected].some(key=>!actual.has(key)))throw new Error('Whale unit review receipt mirror pointers changed.');
 for(const row of mirrors){
  if(row.currentValueSha256!==expectedWhaleUnitBeforeSha256||row.expectedTypedValue!==null||row.expectedTypedValueSha256!==expectedWhaleUnitNullSha256||row.expectedEditorialUnit!==null||row.historicalEditorialUnit?.valueSha256!==expectedWhaleUnitBeforeSha256||row.historicalEditorialUnit?.retainInFindingHistory!==true||row.collectorUid!=='source-census-claim:mm-whale-ambergris'||row.collectorTypedFieldPointer!=='/unit')throw new Error(`Whale unit review receipt mirror binding changed: ${row.inputKey}${row.jsonPointer}.`);
  const ref=pointers.find(item=>item.inputKey===row.inputKey&&item.jsonPointer===row.jsonPointer);
  if(row.path!==receiptInputPath(row.inputKey)||row.jsonPointer!==ref.jsonPointer)throw new Error(`Whale unit review receipt input path changed: ${row.inputKey}${row.jsonPointer}.`);
 }
 if(mutation.preserve?.includes('amountOrFormula')!==true||mutation.preserve?.includes('currency')!==true||mutation.preserve?.includes('conditions')!==true||!mutation.preserve.includes('the separately printed carcass unit and rate'))throw new Error('Whale unit review receipt does not preserve the reviewed amount, currency, conditions and carcass data.');
 return {receipt,receiptSha256,bytes:bytes.length,path:whaleUnitReviewReceiptPath};
}
function loadJoUnitAdmissionBeforeCapture({repoRoot=root}={}){
 const bytes=readFileSync(resolve(repoRoot,joUnitAdmissionBeforePath)),capture=safeParse(gunzipSync(bytes),joUnitAdmissionBeforePath),captureSha256=sha(bytes);
 if(captureSha256!==joUnitAdmissionBeforeSha256)throw new Error(`Frozen Jo unit-admission before capture changed: ${captureSha256}`);
 const historical=capture.historicalBaseline,current=capture.currentFullUnitReport;
 if(capture.artifactType!=='batch6-jo-monetary-unit-provenance-before-implementation'||historical?.frozenRecordCount!==2161
   ||historical?.frozenUnitFileSha256!==quantityUnitBeforeSha256||historical?.frozenUnitRecordUids?.length!==2161
   ||new Set(historical.frozenUnitRecordUids).size!==2161||current?.scope?.monetaryRowIdentityRecordCount!==expectedCurrentUnitRecordCount
   ||current?.monetaryRecordInventory?.length!==expectedCurrentUnitRecordCount
   ||capture.capture?.oldUnitGuardFailure!==`Expected 2,161 monetary row-identity records; found ${expectedCurrentUnitRecordCount}.`)
  throw new Error('Frozen Jo unit-admission before capture scope changed.');
 if(capture.joAdmission?.uid!==expectedJoUnitRecord.uid||capture.joAdmission?.input!==expectedJoUnitRecord.input
   ||capture.joAdmission?.pointer!==expectedJoUnitRecord.pointer||capture.joAdmission?.recordSha256!==expectedJoUnitRecord.recordSha256
   ||capture.joAdmission?.currentJoRegistrationPath!==legacyJoPriceRegistrationPath)
  throw new Error('Frozen Jo unit-admission before capture does not bind the exact registered Jo record.');
 return {capture,captureSha256};
}
function currentJoUnitAdmission({documents,records,frozen,repoRoot=root}){
 const before=loadJoUnitAdmissionBeforeCapture({repoRoot});
 const oldRows=frozen.baseline.monetaryRecordInventory,oldUids=oldRows.map(row=>row.uid),currentUids=records.map(row=>row.uid);
 if(oldUids.length!==2161||new Set(oldUids).size!==2161||records.length!==expectedCurrentUnitRecordCount||new Set(currentUids).size!==expectedCurrentUnitRecordCount)
  throw new Error('Current monetary row-identity universe must preserve the exact 2,161 historical IDs and one Jo registration.');
 const expectedUids=new Set([...oldUids,expectedJoUnitRecord.uid]),actualUids=new Set(currentUids);
 if(actualUids.size!==expectedUids.size||[...expectedUids].some(uid=>!actualUids.has(uid))||[...actualUids].some(uid=>!expectedUids.has(uid)))
  throw new Error('Current monetary row-identity universe differs from the 2,161 historical IDs plus the exact Jo registration.');
 const record=records.find(row=>row.uid===expectedJoUnitRecord.uid);
 if(!record||record.input!==expectedJoUnitRecord.input||record.pointer!==expectedJoUnitRecord.pointer
   ||record.recordSha256!==expectedJoUnitRecord.recordSha256||record.rowIdentitySha256!==expectedJoUnitRecord.rowIdentitySha256
   ||canonical(record.sourceValueSha256ByPointer)!==canonical(expectedJoUnitRecord.sourceValueSha256ByPointer)
   ||record.identityStatus!=='recorded-unverified'||record.identity?.kind!=='unextracted-price'
   ||record.identity?.sourceRowIds?.length!==0||record.source?.book!==null||record.source?.printedPage!==null
   ||record.source?.pdfPage!==null||record.source?.sourceSha256!==null)
  throw new Error('Current Jo monetary row does not match its exact source-unknown unextracted-price identity.');
 const canonicalDoc=documents.find(doc=>doc.key==='canonical'),distDoc=documents.find(doc=>doc.key==='dist'),siteClaim=valueAt(canonicalDoc?.data,expectedJoUnitRecord.pointer);
 if(!canonicalDoc||!distDoc||!siteClaim?.found||!siteClaim.value||typeof siteClaim.value!=='object'
   ||sha(siteClaim.value)!==expectedJoUnitRecord.recordSha256||siteClaim.value.itemId!=='ua-jo-stick'
   ||siteClaim.value.claimType!=='unextracted-price'||siteClaim.value.printedPrice!==null
   ||siteClaim.value.priceState!=='unextracted'||siteClaim.value.missingPrice!==true
   ||siteClaim.value.sourcePageReference!==null||siteClaim.value.estimate!==null
   ||!Array.isArray(siteClaim.value.sourceRowIds)||siteClaim.value.sourceRowIds.length!==0)
  throw new Error('Current Jo price-claim pointer no longer proves only the exact unextracted, unknown-price state.');
 const {inputs:sourceInputs}=assertCurrentMmSourceEpoch(repoRoot);
 const registration=loadJoCurrentSuccessor({repoRoot,data:sourceInputs.data,inventory:sourceInputs.inventory});
 if(registration.itemId!=='ua-jo-stick'||registration.recordSha256!=='25c8c40eab79b1b1dc44fa701e200bbd63b9594596878a82dd8325479451153b'
   ||registration.sourceAbsence!==false||registration.valueReviewed!==false||registration.registryRef?.path!==joPriceRegistrationPath
   ||registration.registryRef?.sha256!==joPriceRegistrationSha256)
  throw new Error('Jo price registration no longer preserves the exact unextracted source-unknown state.');
 const matchedUnitQuantityFields=[];
 walkScalarLeaves(siteClaim.value,leaf=>{const fieldName=String(leaf.parts.at(-1)??'');if(unitFieldPattern.test(fieldName))matchedUnitQuantityFields.push(expectedJoUnitRecord.pointer+leaf.jsonPointer);});
 if(matchedUnitQuantityFields.length)throw new Error('Jo unit admission cannot assign semantic unit provenance from unrelated price-claim fields.');
 return {
  status:'exact-current-unextracted-record; purchase-price and source unit unassessed',
  historicalRecordCount:oldUids.length,currentRecordCount:records.length,additionalRecordUids:[expectedJoUnitRecord.uid],
  record:{uid:record.uid,inputPath:record.input,inputSha256:record.inputSha256,jsonPointer:record.pointer,recordSha256:record.recordSha256,rowIdentitySha256:record.rowIdentitySha256,sourceValueSha256ByPointer:record.sourceValueSha256ByPointer,matchedUnitQuantityFields},
  registration:{path:registration.registryRef.path,sha256:registration.registryRef.sha256,sourceEvidenceRefs:registration.inputRefs},
  sourceState:{priceState:'unextracted',sourceValueStatus:'not-assessed',unitProvenance:'unassessable',sourcePriceAbsenceReviewed:false,extractedPriceReviewed:false,semanticPass:false,sourceAbsenceProof:false},
  beforeCapture:{path:joUnitAdmissionBeforePath,sha256:before.captureSha256,historicalUnitCount:2161,currentUnitRecordCount:expectedCurrentUnitRecordCount},
 };
}
function receiptInputPath(inputKey){return sourceWitnesses.whaleAmbergris.unitPointers.find(ref=>ref.inputKey===inputKey)?.inputPath||({canonical:'research/price-source-inventory.json',receipts:'research/source-audit-batch5-price-discovery-reconciliation.json',monsterCensus:'research/price-source-inventory-monster-books.json'})[inputKey];}
function loadWhaleBeforeSourceInputs({repoRoot=root,receipt}){
 const bytes=readFileSync(resolve(repoRoot,whaleUnitExactInputArchivePath));
 if(sha(bytes)!==whaleUnitExactInputArchiveSha256)throw new Error('Whale exact before-source archive hash changed.');
 if(receipt&&(receipt.receipt.exactInputArchive?.path!==whaleUnitExactInputArchivePath||receipt.receipt.exactInputArchive?.sha256!==whaleUnitExactInputArchiveSha256))throw new Error('Whale exact before-source archive receipt binding changed.');
 const archive=safeParse(gunzipSync(bytes),whaleUnitExactInputArchivePath),files=archive.files;
 if(!files||typeof files!=='object')throw new Error('Whale exact before-source archive is malformed.');
 const inputs={};
 for(const key of ['canonical','receipts','monsterCensus']){
  const path=receiptInputPath(key),file=files[path];
  if(!file||typeof file.utf8!=='string'||file.sha256!==refBaselineInputHash(key))throw new Error(`Whale exact before-source archive lacks the frozen ${key} input.`);
  const raw=Buffer.from(file.utf8);if(sha(raw)!==file.sha256)throw new Error(`Whale archived ${key} bytes do not match their frozen hash.`);
  inputs[key]=safeParse(raw,path);
 }
 return inputs;
}
function refBaselineInputHash(key){
 const input=sourceWitnesses.whaleAmbergris.unitPointers.find(ref=>ref.inputKey===key);
 if(!input)throw new Error(`Unknown Whale witness input key: ${key}`);
 const expected={canonical:'3415ed60e597232f503ff767434b9c282b8da8c7b0661bc0e927f743d136bad9',receipts:'523c097624a0a91f4e3cf8aa40540a2f27d68a6136a04226e2fc3a94a941aeb8',monsterCensus:'87ea54c296d9a6b4697a997b5da1ee38b9c844668fc4fb54d5a8794d6aaef106'}[key];
 return expected;
}
export function classifyUnitFieldProvenance({fieldName,value,manualClassification=null}){
 if(manualClassification)return manualClassification;
 if(semanticUnitFieldPattern.test(fieldName)){
  if(value===null)return 'unassessable';
  return 'missing-provenance';
 }
 return 'unassessable';
}
export function scanUnitRelatedScalarFields(data){
 let scalarLeaves=0;const fields=[];
 walkScalarLeaves(data,leaf=>{
  scalarLeaves++;const fieldName=String(leaf.parts.at(-1)??'');if(!unitFieldPattern.test(fieldName))return;
  fields.push({jsonPointer:leaf.jsonPointer,fieldName,fieldGroups:groupFor(fieldName),leafType:typeOf(leaf.value),valueSha256:sha(leaf.value)});
 });
 return {scalarLeaves,fields};
}
function curatedCaseMap(docs,frozen,reviewReceipt){
 const result=new Map();
 for(const [caseId,fixture]of Object.entries(sourceWitnesses))for(const ref of fixture.unitPointers){
  const doc=docs.find(item=>item.key===ref.inputKey),current=doc&&valueAt(doc.data,ref.jsonPointer);
  if(!doc||!current.found)throw new Error(`Source witness pointer missing: ${ref.inputKey}${ref.jsonPointer}`);
  const frozenCase=frozen.baseline.sourceWitnesses[caseId].pointerValues.find(row=>row.inputKey===ref.inputKey&&row.jsonPointer===ref.jsonPointer);
  if(!frozenCase)throw new Error(`Exact frozen source-witness pointer missing: ${ref.inputKey}${ref.jsonPointer}`);
  const currentHash=sha(current.value);
  if(caseId==='whaleAmbergris'&&currentHash===expectedWhaleUnitBeforeSha256)result.set(`${ref.inputKey}\u0000${ref.jsonPointer}`,{caseId,classification:'editorial',basis:'exact historical value hash bound to the frozen before inventory; current field remains the historical editorial value',currentReviewStatus:reviewReceipt?'approved exact correction pending':'historical value; no current approved review receipt loaded'});
  if(caseId==='whaleAmbergris'&&currentHash===expectedWhaleUnitNullSha256)result.set(`${ref.inputKey}\u0000${ref.jsonPointer}`,{caseId,classification:'unassessable',basis:'null unit metadata is not a source-absence proof',currentReviewStatus:reviewReceipt?'exact null correction matches the hash-bound approved review':'null metadata without an approved current review receipt'});
  if(caseId==='whaleCarcass'&&currentHash===expectedWhaleCarcassUnitSha256)result.set(`${ref.inputKey}\u0000${ref.jsonPointer}`,{caseId,classification:'explicit-printed',basis:'exact retained positive unit hash bound to the frozen before inventory'});
 }
 return result;
}

function stateForWhaleAmbergris(pointerValues,reviewReceipt){
 const hashes=new Set(pointerValues.map(row=>row.valueSha256));
 let currentState;
 if(hashes.size!==1)currentState='inconsistent-mirror-values';
 else if(hashes.has(expectedWhaleUnitNullSha256))currentState=reviewReceipt?'approved-null-correction-applied':'null-metadata-without-approved-review';
 else if(hashes.has(expectedWhaleUnitBeforeSha256))currentState=reviewReceipt?'approved-null-correction-pending':'historical-editorial-unit-present';
 else currentState='unrecognized-current-value';
 return {currentState,sourceAbsenceProof:false,sourceEvidenceVerdict:reviewReceipt?'exact source-page review approves a null typed unit for this one claim; the null metadata value itself is not proof of omission':'no approved current source review receipt loaded; do not infer source omission from the current unit value'};
}

function buildPreservedFieldComparison({documents,beforeSourceInputs}){
 const keys=['amountOrFormula','currency','conditions'];
 const rows=[];
 for(const ref of sourceWitnesses.whaleAmbergris.unitPointers){
  const doc=documents.find(item=>item.key===ref.inputKey),current=doc&&valueAt(doc.data,ref.jsonPointer),currentParent=ref.jsonPointer.slice(0,ref.jsonPointer.lastIndexOf('/'));
  const beforeParent=beforeSourceInputs[ref.inputKey]&&valueAt(beforeSourceInputs[ref.inputKey],currentParent);
  if(!doc||!current?.found||!beforeParent?.found||!beforeParent.value||typeof beforeParent.value!=='object')throw new Error(`Whale preserved-field parent missing at ${ref.inputKey}${currentParent}`);
  for(const fieldName of keys){
   const currentValue=valueAt(doc.data,`${currentParent}/${fieldName}`),beforeValue=valueAt(beforeSourceInputs[ref.inputKey],`${currentParent}/${fieldName}`);
   if(!beforeValue.found&&!currentValue.found)continue;
   rows.push({inputKey:ref.inputKey,inputPath:doc.path,jsonPointer:`${currentParent}/${fieldName}`,fieldName,beforePresent:beforeValue.found,currentPresent:currentValue.found,beforeValueSha256:beforeValue.found?sha(beforeValue.value):null,currentValueSha256:currentValue.found?sha(currentValue.value):null,beforeType:beforeValue.found?typeOf(beforeValue.value):null,currentType:currentValue.found?typeOf(currentValue.value):null,matchesBefore:beforeValue.found===currentValue.found&&(!beforeValue.found||sha(beforeValue.value)===sha(currentValue.value))});
  }
 }
 return rows;
}

export function buildMonetaryUnitProvenanceReport({documents=null,monetaryRecords=null,repoRoot=root,reviewReceiptPath=whaleUnitReviewReceiptPath}={}){
 const {inputs:sourceInputs,summary:sourceSummary}=assertCurrentMmSourceEpoch(repoRoot);
 documents=documents??loadAuditInputs({repoRoot});
 const frozen=loadFrozenUnitInventoryBaseline({repoRoot});
 const reviewReceipt=reviewReceiptPath===null?null:loadApprovedWhaleUnitReviewReceipt({repoRoot});
 const beforeSourceInputs=loadWhaleBeforeSourceInputs({repoRoot,receipt:reviewReceipt});
 const expectedKeys=['dist',...monetaryRowIdentityInputs.map(item=>item.key)];
 if(documents.length!==10||expectedKeys.some(key=>!documents.some(doc=>doc.key===key)))throw new Error('Unit inventory requires dist/data.json plus all nine monetary row-identity inputs.');
 const docsByKey=new Map(documents.map(doc=>[doc.key,doc])),docsByPath=new Map(documents.map(doc=>[doc.path,doc]));
 const records=monetaryRecords||collectMonetaryRowIdentityRecords(new Map(documents.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).records;
 const sourceDataDoc=documents.find(doc=>doc.path==='dist/data.json'),sourceInventoryDoc=documents.find(doc=>doc.path==='research/price-source-inventory.json');
 const allCurrentAuditInputsMatch=documents.every(doc=>{
  try{return doc.sha256===sha(doc.bytes)&&doc.sha256===sha(readFileSync(resolve(repoRoot,doc.path)));}
  catch{return false;}
 });
 const principalSourceInputsMatch=allCurrentAuditInputsMatch&&sourceDataDoc?.sha256===sourceInputs.rawInputs['dist/data.json']&&sourceInventoryDoc?.sha256===sourceInputs.rawInputs['research/price-source-inventory.json'];
 const currentSourceEpoch=principalSourceInputsMatch?{sourceCommit:sourceSummary.sourceCommit,sourceTree:sourceSummary.sourceTree,cohortSummary:sourceSummary,cohortFixture:{path:'tests/fixtures/mm-treasure-current-m1-cohort-v1.json',sha256:'7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550'}}:null;
 const joAdmission=currentJoUnitAdmission({documents,records,frozen,repoRoot});
 const curated=curatedCaseMap(documents,frozen,reviewReceipt),candidateMap=new Map(),inputStats=[];
 for(const doc of documents){
  const scan=scanUnitRelatedScalarFields(doc.data);
  for(const field of scan.fields)candidateMap.set(`${doc.key}\u0000${field.jsonPointer}`,{inputKey:doc.key,inputPath:doc.path,...field,metadataContext:null,monetaryRecordRefs:[],curated:null});
  inputStats.push({key:doc.key,path:doc.path,stage:doc.stage,sha256:doc.sha256,scalarLeaves:scan.scalarLeaves,matchingFieldLeaves:scan.fields.length});
 }
 const monetaryRecordInventory=[];
 for(const record of records){
  const doc=docsByPath.get(record.input);if(!doc)throw new Error(`Monetary record refers to an out-of-scope input: ${record.input}`);
  const raw=valueAt(doc.data,record.pointer);if(!raw.found||!raw.value||typeof raw.value!=='object')throw new Error(`Monetary record source pointer is not an object: ${record.input}${record.pointer}`);
  const recordFieldRefs=[];
  walkScalarLeaves(raw.value,leaf=>{
   const fieldName=String(leaf.parts.at(-1)??'');if(!unitFieldPattern.test(fieldName))return;
   const jsonPointer=record.pointer+leaf.jsonPointer,key=`${record.input}\u0000${jsonPointer}`;
   const candidate=[...candidateMap.values()].find(row=>row.inputPath===record.input&&row.jsonPointer===jsonPointer);
   if(!candidate)throw new Error(`Monetary record field missing from raw inventory: ${record.input}${jsonPointer}`);
   candidate.monetaryRecordRefs.push(record.uid);recordFieldRefs.push(jsonPointer);
  });
  monetaryRecordInventory.push({uid:record.uid,inputPath:record.input,jsonPointer:record.pointer,recordId:record.id,recordSha256:record.recordSha256,source:record.source,matchedUnitQuantityFields:recordFieldRefs.sort()});
 }
 const allCandidates=[...candidateMap.values()].sort((a,b)=>a.inputKey.localeCompare(b.inputKey)||a.jsonPointer.localeCompare(b.jsonPointer));
 const fieldRows=allCandidates.map(row=>{
  const doc=docsByKey.get(row.inputKey),value=valueAt(doc.data,row.jsonPointer).value,curatedRow=curated.get(`${row.inputKey}\u0000${row.jsonPointer}`)||null;
  const metadataContext=(()=>{
   const parts=row.jsonPointer.slice(1).split('/').slice(0,-1).map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~'));
   let data=doc.data,nearest=null;
   for(const part of parts){data=Array.isArray(data)?data[Number(part)]:data?.[part];const context=safeContext(data);if(context)nearest=context;}
   return nearest;
  })();
  const classification=classifyUnitFieldProvenance({fieldName:row.fieldName,value,manualClassification:curatedRow?.classification});
  return {...row,metadataContext,monetaryRecordRefs:row.monetaryRecordRefs.sort(),classification,classificationBasis:curatedRow?curatedRow.basis:semanticUnitFieldPattern.test(row.fieldName)?value===null?'null metadata is unassessable and does not assert source omission':'field exists without a field-level unit-provenance disposition; source meaning unreviewed':'field is related measurement/source metadata; no semantic unit assessment',curatedCaseId:curatedRow?.caseId||null,sourceReviewStatus:curatedRow?.currentReviewStatus||null};
 });
 const fieldClassificationCounts=Object.fromEntries(['explicit-printed','editorial','missing-provenance','unassessable'].map(status=>[status,fieldRows.filter(row=>row.classification===status).length]));
 const monetaryRecordsWithFields=monetaryRecordInventory.filter(row=>row.matchedUnitQuantityFields.length).length;
 const whaleRows=sourceWitnesses.whaleAmbergris.unitPointers.map(ref=>{
  const doc=docsByKey.get(ref.inputKey),value=valueAt(doc.data,ref.jsonPointer).value;
  return {...ref,inputPath:doc.path,inputSha256:doc.sha256,valueSha256:sha(value),fieldType:typeOf(value)};
 });
 const carcassRows=sourceWitnesses.whaleCarcass.unitPointers.map(ref=>{
  const doc=docsByKey.get(ref.inputKey),value=valueAt(doc.data,ref.jsonPointer).value;
  return {...ref,inputPath:doc.path,inputSha256:doc.sha256,valueSha256:sha(value),fieldType:typeOf(value)};
 });
 const ambergrisCurrentState=stateForWhaleAmbergris(whaleRows,reviewReceipt),preservedFieldComparisons=buildPreservedFieldComparison({documents,beforeSourceInputs});
 const report={
  artifactType:'current-MM monetary unit/quantity/interval/source-basis field inventory',version:3,status:principalSourceInputsMatch?'current-MM structural inventory; source provenance unassessed except exact hash-bound review fixtures':'synthetic input mutation projection; not a current-MM report',
  currentSourceEpoch,
  beforeBaseline:{artifactPath:quantityUnitBeforePath,sha256:frozen.baselineSha256,immutable:true,meaning:'historical before inventory; current input hashes and values are recorded separately below'},
  approvedReviewReceipt:reviewReceipt?{path:reviewReceipt.path,sha256:reviewReceipt.receiptSha256,status:reviewReceipt.receipt.status,reviewedUid:reviewReceipt.receipt.reviewedUid,approvedTypedUnitValue:null,approvedTypedUnitValueSha256:expectedWhaleUnitNullSha256,sourceEvidenceVerdict:'full-page review supports this exact typed-field correction; null is metadata and does not itself prove source absence',sourceAbsenceProof:false}:null,
  historicalBeforeInputs:frozen.baseline.baseline.inputs.map(({key,path,sha256})=>({key,path,sha256})),
  detectorSemantics:{completeRawScalarScan:'Every scalar leaf in all ten inputs is counted; every leaf whose field name matches unitFieldPattern is listed with its pointer and hash.',recordUniverse:'The current universe is the exact 2,161 historical record IDs from the immutable before inventory plus the one hash-bound Jo unextracted-price record; no other additions or substitutions are admitted. Each current record lists every matching field pointer in its raw object.',nullMetadata:'Null values are unassessable metadata and never treated as evidence that a printed source omits a quantity or unit.',classification:'explicit-printed/editorial are used only for the exact source-page reviewed cases below. missing-provenance marks a populated semantic unit field without a dedicated field-level unit provenance disposition; it does not mean the source lacks that unit. The registered Jo purchase price and unit remain unassessed, and the admission is not source-absence proof. All other candidates are unassessable.',privacy:'The report contains counts, identifiers, JSON pointers, source/input hashes, field names and value hashes. It contains no source text, OCR, PDF or page images.'},
  joUnitAdmission:joAdmission,
  sourceWitnesses:{
   whaleAmbergris:{...sourceWitnesses.whaleAmbergris,classification:'editorial',classificationAppliesTo:'the exact pre-correction value in the frozen before inventory only',reviewFinding:'The independent source-page review approved a null typed unit for this one claim; the current null metadata value is not itself proof of source absence.',baselinePointerValues:frozen.baseline.sourceWitnesses.whaleAmbergris.pointerValues,pointerValues:whaleRows,currentState:ambergrisCurrentState,proposedCorrection:{action:'set only the unit field to null at the four listed pointers; preserve amount, currency, conditions and the separately printed carcass fields',targetPointers:frozen.baseline.sourceWitnesses.whaleAmbergris.proposedCorrection.targetPointers,historicalTargets:frozen.baseline.sourceWitnesses.whaleAmbergris.proposedCorrection.targetPointers,expectedTypedUnitValue:null,expectedTypedUnitValueSha256:expectedWhaleUnitNullSha256,preservedFields:preservedFieldComparisons,allPreservedFieldsMatchBefore:preservedFieldComparisons.length>0&&preservedFieldComparisons.every(row=>row.matchesBefore),amountValuesRemainUnchanged:preservedFieldComparisons.filter(row=>row.fieldName==='amountOrFormula').length>0&&preservedFieldComparisons.filter(row=>row.fieldName==='amountOrFormula').every(row=>row.matchesBefore),sourceAbsenceProof:false}},
   whaleCarcass:{...sourceWitnesses.whaleCarcass,classification:'explicit-printed',classificationAppliesTo:'the exact retained positive value hash only',reviewFinding:'The same MM passage explicitly states the carcass sale rate per hit die of size; retained as the positive unit-provenance fixture.',baselinePointerValues:frozen.baseline.sourceWitnesses.whaleCarcass.pointerValues,pointerValues:carcassRows},
  },
  baseline:{inputs:inputStats,sourceInputCount:documents.length,monetaryInputCount:monetaryRowIdentityInputs.length,allInputHashesMatchLoadedBytes:documents.every(doc=>sha(doc.bytes)===doc.sha256)},
  scope:{allRawScalarLeaves:inputStats.reduce((total,row)=>total+row.scalarLeaves,0),unitQuantityIntervalSourceBasisFieldLeaves:fieldRows.length,fieldNamesMatchingPattern:[...new Set(fieldRows.map(row=>row.fieldName))].sort(),monetaryRowIdentityRecordCount:records.length,monetaryRecordsWithMatchedFields:monetaryRecordsWithFields,recordCollectorCoverage:collectMonetaryRowIdentityRecords(new Map(documents.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).coverage},
  denominators:{fieldClassificationCounts,fieldGroupCounts:Object.fromEntries([...new Set(fieldRows.flatMap(row=>row.fieldGroups))].sort().map(group=>[group,fieldRows.filter(row=>row.fieldGroups.includes(group)).length])),populatedSemanticUnitFields:fieldRows.filter(row=>semanticUnitFieldPattern.test(row.fieldName)&&row.leafType!=='null').length,nullSemanticUnitFields:fieldRows.filter(row=>semanticUnitFieldPattern.test(row.fieldName)&&row.leafType==='null').length},
  fieldRows,monetaryRecordInventory,
 };
 validateMonetaryUnitProvenanceReport(report,{documents,records,repoRoot,reviewReceiptPath});
 return report;
}

export function validateMonetaryUnitProvenanceReport(report,{documents=null,records=null,repoRoot=root,reviewReceiptPath=whaleUnitReviewReceiptPath}={}){
 const {inputs:sourceInputs,summary:sourceSummary}=assertCurrentMmSourceEpoch(repoRoot);
 documents=documents??loadAuditInputs({repoRoot});
 const frozen=loadFrozenUnitInventoryBaseline({repoRoot}),reviewReceipt=reviewReceiptPath===null?null:loadApprovedWhaleUnitReviewReceipt({repoRoot});
 if(report.version!==3||report.beforeBaseline?.artifactPath!==quantityUnitBeforePath||report.beforeBaseline?.sha256!==frozen.baselineSha256||report.beforeBaseline?.immutable!==true)throw new Error('Frozen before-baseline binding mismatch.');
 const expectedHistorical=frozen.baseline.baseline.inputs.map(({key,path,sha256})=>({key,path,sha256}));
 if(canonical(report.historicalBeforeInputs)!==canonical(expectedHistorical))throw new Error('Historical input hashes do not match the immutable before inventory.');
 const sourceDataDoc=documents.find(doc=>doc.path==='dist/data.json'),sourceInventoryDoc=documents.find(doc=>doc.path==='research/price-source-inventory.json');
 const allCurrentAuditInputsMatch=documents.every(doc=>{
  try{return doc.sha256===sha(doc.bytes)&&doc.sha256===sha(readFileSync(resolve(repoRoot,doc.path)));}
  catch{return false;}
 });
 const principalSourceInputsMatch=allCurrentAuditInputsMatch&&sourceDataDoc?.sha256===sourceInputs.rawInputs['dist/data.json']&&sourceInventoryDoc?.sha256===sourceInputs.rawInputs['research/price-source-inventory.json'];
 if(principalSourceInputsMatch){if(report.currentSourceEpoch?.sourceCommit!==sourceSummary.sourceCommit||report.currentSourceEpoch?.sourceTree!==sourceSummary.sourceTree||report.currentSourceEpoch?.cohortFixture?.sha256!=='7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550')throw new Error('Current-MM source epoch binding mismatch.');}
 else if(report.currentSourceEpoch!==null||report.status!=='synthetic input mutation projection; not a current-MM report')throw new Error('Synthetic input mutation projection cannot claim current-MM status.');
 const expectedReview=reviewReceipt?{path:reviewReceipt.path,sha256:reviewReceipt.receiptSha256,status:reviewReceipt.receipt.status,reviewedUid:reviewReceipt.receipt.reviewedUid,approvedTypedUnitValue:null,approvedTypedUnitValueSha256:expectedWhaleUnitNullSha256,sourceEvidenceVerdict:'full-page review supports this exact typed-field correction; null is metadata and does not itself prove source absence',sourceAbsenceProof:false}:null;
 if(canonical(report.approvedReviewReceipt)!==canonical(expectedReview))throw new Error('Approved Whale review receipt summary mismatch.');
 if(report.baseline.sourceInputCount!==10||report.baseline.monetaryInputCount!==9||report.scope.monetaryRowIdentityRecordCount!==expectedCurrentUnitRecordCount)throw new Error('Current unit inventory input or monetary record denominator mismatch.');
 if(report.scope.allRawScalarLeaves!==report.baseline.inputs.reduce((total,row)=>total+row.scalarLeaves,0))throw new Error('Raw scalar leaf denominator mismatch.');
 const keys=new Set(report.baseline.inputs.map(row=>row.key));if(keys.size!==10)throw new Error('Input key uniqueness mismatch.');
 const candidateKeys=new Set(report.fieldRows.map(row=>`${row.inputKey}\u0000${row.jsonPointer}`));if(candidateKeys.size!==report.fieldRows.length||report.fieldRows.some(row=>!keys.has(row.inputKey)||!unitFieldPattern.test(row.fieldName)||!/^[a-f0-9]{64}$/.test(row.valueSha256)))throw new Error('Unit field pointer/hash inventory malformed.');
 if(report.monetaryRecordInventory.length!==expectedCurrentUnitRecordCount||new Set(report.monetaryRecordInventory.map(row=>row.uid)).size!==expectedCurrentUnitRecordCount)throw new Error('Current monetary record inventory is incomplete or duplicated.');
 const classifications=Object.fromEntries(['explicit-printed','editorial','missing-provenance','unassessable'].map(status=>[status,report.fieldRows.filter(row=>row.classification===status).length]));
 if(canonical(classifications)!==canonical(report.denominators.fieldClassificationCounts))throw new Error('Classification counts do not match field inventory.');
 if(report.sourceWitnesses.whaleAmbergris.pointerValues.length!==4||report.sourceWitnesses.whaleCarcass.pointerValues.length!==4)throw new Error('Whale source witness pointer count changed.');
 const ambergris=report.sourceWitnesses.whaleAmbergris;
 if(ambergris.baselinePointerValues.length!==4||canonical(ambergris.baselinePointerValues)!==canonical(frozen.baseline.sourceWitnesses.whaleAmbergris.pointerValues))throw new Error('Whale historical before pointer values changed.');
 if(ambergris.proposedCorrection.targetPointers.length!==4||canonical(ambergris.proposedCorrection.targetPointers)!==canonical(frozen.baseline.sourceWitnesses.whaleAmbergris.proposedCorrection.targetPointers)||ambergris.proposedCorrection.expectedTypedUnitValue!==null||ambergris.proposedCorrection.expectedTypedUnitValueSha256!==expectedWhaleUnitNullSha256||ambergris.proposedCorrection.sourceAbsenceProof!==false)throw new Error('Whale proposed correction does not match its exact historical pointer set or null semantics.');
 const expectedState=stateForWhaleAmbergris(ambergris.pointerValues,reviewReceipt);
 if(canonical(ambergris.currentState)!==canonical(expectedState))throw new Error('Whale current state does not match current pointer hashes or review status.');
 if(ambergris.classification!=='editorial'||ambergris.classificationAppliesTo!=='the exact pre-correction value in the frozen before inventory only')throw new Error('Whale historical editorial classification is not scoped to the before value.');
 if(ambergris.proposedCorrection.preservedFields.some(row=>row.matchesBefore!==true)||ambergris.proposedCorrection.allPreservedFieldsMatchBefore!==true||ambergris.proposedCorrection.amountValuesRemainUnchanged!==true)throw new Error('Whale preserved amount/currency/condition fields no longer match their exact before archive.');
 if(ambergris.currentState.sourceAbsenceProof!==false||report.approvedReviewReceipt?.sourceAbsenceProof===true)throw new Error('A null unit value cannot be treated as source-absence proof.');
 const validationDocuments=documents;
 const validationRecords=records||collectMonetaryRowIdentityRecords(new Map(validationDocuments.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).records;
 const joAdmission=currentJoUnitAdmission({documents:validationDocuments,records:validationRecords,frozen,repoRoot});
 if(canonical(report.joUnitAdmission)!==canonical(joAdmission))throw new Error('Jo unit admission does not match the exact hash-bound unextracted record and its current source-unknown registration.');
 {
  for(const input of report.baseline.inputs){const doc=validationDocuments.find(item=>item.key===input.key);if(!doc||doc.sha256!==input.sha256||sha(doc.bytes)!==input.sha256)throw new Error(`Source input hash changed: ${input.path}`);}
  for(const row of report.fieldRows){const doc=validationDocuments.find(item=>item.key===row.inputKey),value=valueAt(doc.data,row.jsonPointer);if(!value.found||sha(value.value)!==row.valueSha256||typeOf(value.value)!==row.leafType)throw new Error(`Field pointer/hash/type mismatch: ${row.inputKey}${row.jsonPointer}`);}
  for(const row of report.monetaryRecordInventory){const record=validationRecords.find(item=>item.uid===row.uid);if(!record||record.input!==row.inputPath||record.pointer!==row.jsonPointer||record.recordSha256!==row.recordSha256)throw new Error(`Monetary record binding mismatch: ${row.uid}`);}
  for(const name of ['whaleAmbergris','whaleCarcass'])for(const ref of report.sourceWitnesses[name].pointerValues){const doc=validationDocuments.find(item=>item.key===ref.inputKey),value=valueAt(doc.data,ref.jsonPointer);if(!value.found||sha(value.value)!==ref.valueSha256)throw new Error(`Curated source witness pointer/hash mismatch: ${ref.inputKey}${ref.jsonPointer}`);}
  const beforeSourceInputs=loadWhaleBeforeSourceInputs({repoRoot,receipt:reviewReceipt}),expectedPreserved=buildPreservedFieldComparison({documents:validationDocuments,beforeSourceInputs});
  if(canonical(expectedPreserved)!==canonical(ambergris.proposedCorrection.preservedFields))throw new Error('Whale preserved field comparison does not match current source inputs.');
  for(const ref of ambergris.pointerValues){
   const row=report.fieldRows.find(field=>field.inputKey===ref.inputKey&&field.jsonPointer===ref.jsonPointer);
   if(!row)throw new Error(`Current Whale unit field missing from field inventory: ${ref.inputKey}${ref.jsonPointer}`);
   if(ref.valueSha256===expectedWhaleUnitNullSha256){if(row.classification!=='unassessable'||row.sourceReviewStatus!==(reviewReceipt?'exact null correction matches the hash-bound approved review':'null metadata without an approved current review receipt'))throw new Error(`Null Whale unit was assigned a source-absence classification: ${ref.inputKey}${ref.jsonPointer}`);}
   else if(ref.valueSha256!==expectedWhaleUnitBeforeSha256&&row.curatedCaseId==='whaleAmbergris')throw new Error(`Unrecognized Whale unit value was auto-curated: ${ref.inputKey}${ref.jsonPointer}`);
  }
 }
 return true;
}

function markdown(report){
 const d=report.denominators,s=report.scope;
 const ambergris=report.sourceWitnesses.whaleAmbergris;
 return ['# Monetary unit-provenance inventory','',`Status: ${report.status}. The frozen before inventory is ${report.beforeBaseline.artifactPath} (SHA-256 ${report.beforeBaseline.sha256}); current input hashes are reported separately. This is a structural inventory, not a whole-book source verdict.`,'',`All ten current inputs were scanned: ${s.allRawScalarLeaves.toLocaleString('en-US')} scalar leaves, including ${s.unitQuantityIntervalSourceBasisFieldLeaves.toLocaleString('en-US')} field-name matches across ${s.monetaryRowIdentityRecordCount.toLocaleString('en-US')} monetary row-identity records. ${s.monetaryRecordsWithMatchedFields.toLocaleString('en-US')} records have at least one matched field. The current set preserves all 2,161 historical IDs and admits only the hash-bound Jo unextracted-price row; its amount and unit remain unassessed.` ,`Classification counts: ${Object.entries(d.fieldClassificationCounts).map(([key,value])=>`${key} ${value.toLocaleString('en-US')}`).join('; ')}. “Missing provenance” marks a populated semantic unit field without a separate field-level provenance disposition; it does not say what the source states. Nulls and unreviewed fields remain unassessable.`,'',`Whale ambergris current state: ${ambergris.currentState.currentState}. The v3 receipt is ${report.approvedReviewReceipt?.sha256||'not loaded'}; its approved exact typed-unit value is null. Null metadata is not itself proof of source absence. Current amount/currency/condition fields are compared by hash with the archived before inputs; preserved fields match: ${ambergris.proposedCorrection.allPreservedFieldsMatchBefore}. The separate carcass unit fixture remains “per hit die of size” only under its exact reviewed hash.`,'','The JSON report contains current and historical input hashes, all matching input pointers, field names and value hashes, the complete current monetary record universe, source witness hashes/bounds and exact frozen correction targets. It contains no source text, OCR, PDF or page images.',''].join('\n');
}
export function writeMonetaryUnitProvenanceArtifacts(report,outputDir){
 mkdirSync(outputDir,{recursive:true});const jsonPath=resolve(outputDir,'report.json'),mdPath=resolve(outputDir,'report.md');
 const jsonBytes=Buffer.from(JSON.stringify(report,null,2)+'\n'),mdBytes=Buffer.from(markdown(report));
 for(const [path,bytes]of [[jsonPath,jsonBytes],[mdPath,mdBytes]]){try{const prior=readFileSync(path);if(!prior.equals(bytes))throw new Error(`Refusing to overwrite sealed unit-provenance artifact: ${path}`);}catch(error){if(error.code!=='ENOENT')throw error;writeFileSync(path,bytes,{flag:'wx'});}}
 return {jsonPath,mdPath};
}
function cli(){
 const args=process.argv.slice(2);let outputDir='artifacts/monetary-unit-provenance-current-mm-v1';
 for(let i=0;i<args.length;i++)if(args[i]==='--output-dir'&&args[i+1])outputDir=args[++i];
 const allowed=new Set(['--check','--output-dir']);for(let i=0;i<args.length;i++)if(!allowed.has(args[i])&&(i===0||args[i-1]!=='--output-dir'))throw new Error(`Unknown argument: ${args[i]}`);
 const {summary:sourceSummary}=assertCurrentMmSourceEpoch(root);
 const documents=loadAuditInputs({repoRoot:root}),records=collectMonetaryRowIdentityRecords(new Map(documents.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).records,report=buildMonetaryUnitProvenanceReport({documents,records}),out=resolve(root,outputDir),paths=writeMonetaryUnitProvenanceArtifacts(report,out);
 if(args.includes('--check')){validateMonetaryUnitProvenanceReport(JSON.parse(readFileSync(paths.jsonPath,'utf8')),{documents,records});for(const doc of documents)if(sha(readFileSync(resolve(root,doc.path)))!==doc.sha256)throw new Error(`Input changed during report generation: ${doc.path}`);}
 console.log(JSON.stringify({status:args.includes('--check')?'structural-check-passed':'written',sourceEpoch:{sourceCommit:sourceSummary.sourceCommit,sourceTree:sourceSummary.sourceTree},outputDir:out,json:paths.jsonPath,markdown:paths.mdPath,beforeBaseline:{path:quantityUnitBeforePath,sha256:quantityUnitBeforeSha256},approvedReviewReceipt:{path:whaleUnitReviewReceiptPath,sha256:whaleUnitReviewReceiptSha256},inputs:documents.length,scalarLeaves:report.scope.allRawScalarLeaves,matchedFieldLeaves:report.scope.unitQuantityIntervalSourceBasisFieldLeaves,monetaryRecords:report.scope.monetaryRowIdentityRecordCount,monetaryRecordsWithMatchedFields:report.scope.monetaryRecordsWithMatchedFields,classificationCounts:report.denominators.fieldClassificationCounts}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli();
