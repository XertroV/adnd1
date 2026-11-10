import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';

import {assertNativeContractBytes,assertNativeHirelingsSourceEpoch,nativeSourceRawPaths} from './native-h-epoch-guard-v2.mjs';

import {validateJoCurrentSuccessor,joPriceRegistrationPath as priorRegistryPath,joPayloadProofPath as priorProofPath,joPriceRegistrationSha256 as priorRegistrySha256} from './dmg175-jo-unextracted-price-registration-v1.mjs';
import {hash as objectHash} from './monetary-row-identity-audit.mjs';
import {validateCurrentMonetaryIndexDependencies} from './dmg175-current-monetary-source-questions-v1.mjs';

export const nativeJoRegistrationPath='research/hirelings-native-h-v1/jo-current-successor-v1/registration-v1.json';
export const nativeJoPayloadProofPath='research/hirelings-native-h-v1/jo-current-successor-v1/equipment-payload-proof-v1.json';
export const nativeJoCurrentInputPaths=Object.freeze([
 {path:'dist/data.json',role:'assembled HIRED source data'},
 {path:'research/price-source-inventory.json',role:'canonical price claims'},
 {path:'equipment.json',role:'current equipment payload'},
 {path:'research/monetary-source-inventory.json',role:'current monetary index'},
 {path:'research/mechanics-audit-progress.json',role:'current mechanics grades'},
]);
const baselineEquipmentCommit='386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
const baselineEquipmentSha256='9c831f319a8d58bd3c943c610a89326975f622015b760073217ecf0f7b55e6f7';
const currentEquipmentSha256='714d40b9ed9908a069fddc08525d43437c9e974b984572eb1c505c37ee8cae95';
const legacyRegistryPath='research/source-audit-batch6-jo-unextracted-price.json';
const legacyRegistrySha256='1e24b97d355cf2502a2f775d093652cf37675907aae8ffdc63d432d8908df5f5';
const fail=message=>{throw new Error(`Invalid native HIRED Jo successor: ${message}`);};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)
 ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const same=(left,right)=>canonical(left)===canonical(right);
const exactKeys=(value,keys)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&same(Object.keys(value).sort(),[...keys].sort()));
const parse=(bytes,label)=>{try{return JSON.parse(bytes.toString('utf8'));}catch{fail(`${label} is not valid JSON`);}};
function safePath(path){if(typeof path!=='string'||path.startsWith('/')||path.includes('\\')||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('non-repository evidence path');return path;}
function ref(path,sha256Value){return {path,sha256:sha256Value};}

const JO_SEMANTICS=Object.freeze({itemId:'ua-jo-stick',price:null,priceState:'unextracted',sourcePriceAbsenceReviewed:false,extractedPriceReviewed:false,semanticPass:false,unitProvenance:'unassessable',sourceAbsenceProof:false});
const JO_PROOF_SEMANTICS=Object.freeze({price:null,priceState:'unextracted',sourcePriceAbsenceReviewed:false,extractedPriceReviewed:false,semanticPass:false,unitProvenance:'unassessable',sourceAbsenceProof:false});
const HISTORICAL_JO_OUTPUT=Object.freeze({itemId:'ua-jo-stick',name:'Jo Stick',priceNote:'No purchase price is proposed. The reviewed weapon tables provide weight, damage and handling data; source-typed gold-piece weights are not purchase costs.',sourceAbsence:false,valueReviewed:false,recordSha256:'25c8c40eab79b1b1dc44fa701e200bbd63b9594596878a82dd8325479451153b',priorRegistry:ref(priorRegistryPath,priorRegistrySha256),priorProof:ref(priorProofPath,'c86304b4d91062b2d2fd8d90d7219c540d5e30bc24c77ba416647f20a4677ed8'),changedPaths:[
 '/equipment/phb-hammer/fieldSources/Hurled or missile weapon AC adjustments at short range (UA p.28)',
 '/equipment/phb-hammer/fields/Hurled or missile weapon AC adjustments at short range (UA p.28)',
 '/equipment/phb-javelin/fieldSources/Hurled or missile weapon AC adjustments at short range (UA p.28)',
 '/equipment/phb-javelin/fields/Hurled or missile weapon AC adjustments at short range (UA p.28)',
 '/equipment/ua-harpoon/fieldSources/Hurled or missile weapon AC adjustments at short range (UA p.28)',
 '/equipment/ua-harpoon/fields/Hurled or missile weapon AC adjustments at short range (UA p.28)',
],ua28Fields:3,ua28Cells:33,joMechanicsRecordSha256:'f7a6fa1f444cc012f02fe6ee0d92d75ea71ebc3ee1b9e985fdab033cdef01349'});

/** Exact proof.jo schema, kept distinct from the registration's `semantics` schema. */
export function nativeJoProofState({equipmentObjectSha256,mechanicsRecordSha256}={}){
 if(!/^[a-f0-9]{64}$/.test(equipmentObjectSha256||'')||!/^[a-f0-9]{64}$/.test(mechanicsRecordSha256||''))fail('actual current Jo equipment/mechanics SHA-256 values are required');
 return {equipmentObjectSha256,mechanicsRecordSha256,...JO_PROOF_SEMANTICS};
}

/** Shared registry/proof link check used by runtime validation and bounded tests. */
export function assertNativeJoProofReference(registry,expectedProofSha256){
 if(registry?.payloadProof?.path!==nativeJoPayloadProofPath||registry?.payloadProof?.sha256!==expectedProofSha256)fail('native payload-proof reference');
 return true;
}

function assertNativeRegistry(registry,{contract,contractSha256,contractPath,registrySha256,proofSha256}){
 if(!exactKeys(registry,['schemaVersion','artifactType','status','sourceEpoch','historicalSemanticContract','currentInputs','payloadProof','semantics','scope']))fail('unexpected registry properties');
 if(registry.schemaVersion!==1||registry.artifactType!=='HIRED native-H exact-source Jo current-payload successor'
  ||registry.status!=='research proposal; Jo purchase price remains unextracted and source absence unreviewed')fail('registry schema or pending status');
 if(!exactKeys(registry.sourceEpoch,['contract','sourceCommit','sourceTree','baselineCommit','baselineAncestorOfSource','sourceAncestorOfCurrentHead','sourceRawInputs'])
  ||!same(registry.sourceEpoch.contract,ref(contractPath,contractSha256))
  ||registry.sourceEpoch.sourceCommit!==contract.sourceCommit||registry.sourceEpoch.sourceTree!==contract.sourceTree
  ||registry.sourceEpoch.baselineCommit!==contract.baseline.baselineCommit
  ||registry.sourceEpoch.baselineAncestorOfSource!==true||registry.sourceEpoch.sourceAncestorOfCurrentHead!==true)fail('native source epoch contract reference or stable ancestry proof');
 const expectedRaw=nativeSourceRawPaths.map(path=>ref(path,contract.sourceRawInputs[path]));
 if(!same(registry.sourceEpoch.sourceRawInputs,expectedRaw))fail('registry raw source pins differ from the exact native contract');
 const oldProof=ref(priorProofPath,HISTORICAL_JO_OUTPUT.priorProof.sha256);
 const expectedHistory={registration:ref(priorRegistryPath,priorRegistrySha256),proof:oldProof,legacyRegistration:ref(legacyRegistryPath,legacyRegistrySha256),baselineEquipment:{commit:baselineEquipmentCommit,sha256:baselineEquipmentSha256}};
 if(!same(registry.historicalSemanticContract,expectedHistory))fail('historical Jo semantic-contract references changed');
 if(!Array.isArray(registry.currentInputs)||registry.currentInputs.length!==nativeJoCurrentInputPaths.length
  ||!same(registry.currentInputs.map(row=>({path:row.path,role:row.role})),nativeJoCurrentInputPaths))fail('current input reference set/order/roles');
 if(registry.currentInputs.some(row=>!exactKeys(row,['path','sha256','role'])||!/^[a-f0-9]{64}$/.test(row.sha256||'')))fail('current input reference hash schema');
 if(!same(registry.semantics,JO_SEMANTICS))fail('Jo source-question state was promoted');
 assertNativeJoProofReference(registry,proofSha256);
 if(registry.scope!=='Validates the exact native HIRED source epoch and preserves the established Jo gap only. It does not assess or promote a purchase price, source-price absence, or source-question disposition.')fail('registry scope boundary');
 return registry;
}

function assertNativeProof(proof,{contract,registry,sourceContext,proofSha256}){
 if(!exactKeys(proof,['schemaVersion','artifactType','status','sourceEpoch','historicalProducer','currentInputs','currentSemanticInputHash','baselineEquipment','currentEquipment','counts','jo','sourceState']))fail('unexpected native proof properties');
 if(proof.schemaVersion!==1||proof.artifactType!=='HIRED native-H Jo whole-payload preservation proof'
  ||proof.status!=='exact historical UA28 and Jo semantics preserved under current HIRED source pins')fail('native proof schema or status');
 const sourceEpoch={contract:registry.sourceEpoch.contract,sourceCommit:contract.sourceCommit,sourceTree:contract.sourceTree,baselineCommit:contract.baseline.baselineCommit,baselineAncestorOfSource:true,sourceAncestorOfCurrentHead:true,sourceRawInputs:registry.sourceEpoch.sourceRawInputs};
 if(!same(proof.sourceEpoch,sourceEpoch))fail('native proof source epoch differs from closed registry');
if(!same(proof.historicalProducer,{artifact:'root-epoch-preparation-v1/version29-joCurrentSuccessor-actual-producer-v1.json',sha256:'f08f37034135afc91112f0386e3157fc6b92514a90839a21d8f1ddc4cc45e931',semanticValueSha256:'15cca10189eb5c3db459e49a9fab915eddc8023c47d9f4d9bbde5b19212d81d5'}))fail('historical actual Version 29 producer identity');
 if(!same(proof.currentInputs,registry.currentInputs.map(({path,sha256})=>({path,sha256}))))fail('native proof current input pins');
 if(!same(proof.baselineEquipment,{commit:baselineEquipmentCommit,sha256:baselineEquipmentSha256})
  ||!same(proof.currentEquipment,{path:'equipment.json',sha256:currentEquipmentSha256}))fail('baseline/current equipment proof');
 const expectedCounts={wholeEquipmentChangedPaths:6,renderedUa28StringFields:3,ua28NumericCells:33,joEquipmentObjectDiffs:0,joMechanicsRecordDiffs:0};
 if(!same(proof.counts,expectedCounts))fail('native proof comparison denominators');
 const current=Object.fromEntries(registry.currentInputs.map(row=>[row.path,row.sha256]));
 const expectedJo=nativeJoProofState({equipmentObjectSha256:HISTORICAL_JO_OUTPUT.recordSha256,mechanicsRecordSha256:HISTORICAL_JO_OUTPUT.joMechanicsRecordSha256});
 if(!same(proof.jo,expectedJo)||!same(proof.sourceState,JO_SEMANTICS))fail('Jo mechanics/equipment or source-question policy changed');
 if(!sourceContext||sourceContext.sourceCommit!==contract.sourceCommit||proofSha256!==(registry.payloadProof.sha256))fail('native source context or proof file identity');
 if(current['equipment.json']!==currentEquipmentSha256)fail('whole current equipment identity changed');
 return proof;
}

function readHistoricalInputs(root,currentEquipment,currentMechanics){
 const readPinned=(inputRef,{compressed=false}={})=>{
  const path=safePath(inputRef.path),bytes=readFileSync(resolve(root,path));
  if(sha256(bytes)!==inputRef.sha256)fail(`stale historical evidence ${path}`);
  return compressed?bytes:parse(bytes,path);
 };
 const oldRegistryBytes=readFileSync(resolve(root,priorRegistryPath));
 if(sha256(oldRegistryBytes)!==priorRegistrySha256)fail('closed predecessor Jo registry bytes changed');
 const oldRegistry=parse(oldRegistryBytes,priorRegistryPath);
 const oldProofBytes=readPinned(oldRegistry.payloadProof,{compressed:true});
 const oldProofSha=sha256(oldProofBytes),oldProof=parse(oldProofBytes,oldRegistry.payloadProof.path);
 if(oldProofSha!==HISTORICAL_JO_OUTPUT.priorProof.sha256)fail('closed predecessor Jo proof bytes changed');
 const legacyBytes=readFileSync(resolve(root,legacyRegistryPath));
 if(sha256(legacyBytes)!==legacyRegistrySha256)fail('closed legacy Jo registration bytes changed');
 const legacyRegistration=parse(legacyBytes,legacyRegistryPath);
 const currentEquipmentBytes=readFileSync(resolve(root,'equipment.json'));
 if(sha256(currentEquipmentBytes)!==currentEquipmentSha256||!same(parse(currentEquipmentBytes,'equipment.json'),currentEquipment))fail('current whole equipment payload changed');
 const oldBaseBytes=execFileSync('git',['-C',root,'show',`${baselineEquipmentCommit}:equipment.json`],{maxBuffer:32*1024*1024});
 if(!Buffer.isBuffer(oldBaseBytes)||sha256(oldBaseBytes)!==baselineEquipmentSha256)fail('SOURCE REF 386b08a equipment bytes changed');
 const baselineEquipment=parse(oldBaseBytes,`${baselineEquipmentCommit}:equipment.json`);
 const oldBeforeBytes=gunzipSync(readPinned(legacyRegistration.beforeEquipment,{compressed:true}));
 const legacyBeforeEquipment=parse(oldBeforeBytes,'legacy Jo before-equipment archive');
 const historicalReceipt=readPinned(legacyRegistration.historicalFourNoteReceipt);
 for(const sourceProof of legacyRegistration.sourceProofs||[])readPinned(sourceProof);
 const oldEpochProofs=(oldRegistry.sourceEpoch?.proofs||[]).map(ref=>readPinned(ref));
 if(oldEpochProofs.length!==4||oldEpochProofs[0]?.sourceInput?.commit!==oldRegistry.sourceEpoch.sourceCommit
  ||oldEpochProofs[0]?.sourceInput?.tree!==oldRegistry.sourceEpoch.sourceTree
  ||oldEpochProofs[1]?.reviewScope?.sourceCommit!==oldRegistry.sourceEpoch.sourceCommit
  ||oldEpochProofs[1]?.reviewScope?.sourceTree!==oldRegistry.sourceEpoch.sourceTree
  ||oldEpochProofs[1]?.evidence?.sourceData?.privateSourceHashesCheckedWithoutCopyingOrRendering?.find(row=>row.filename==='Unearthed Arcana.pdf')?.sha256!=='e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4')fail('predecessor source-epoch proofs are incomplete');
 const baselineMechanicsBytes=execFileSync('git',['-C',root,'show',`${baselineEquipmentCommit}:research/mechanics-audit-progress.json`],{maxBuffer:32*1024*1024});
 if(!Buffer.isBuffer(baselineMechanicsBytes))fail('baseline mechanics reader did not preserve raw bytes');
 const baselineMechanics=parse(baselineMechanicsBytes,`${baselineEquipmentCommit}:research/mechanics-audit-progress.json`);
 const findJo=ledger=>ledger.records?.find(record=>record.collection==='equipment'&&record.id==='ua-jo-stick');
 const baselineMechanicsJo=findJo(baselineMechanics),currentMechanicsJo=findJo(currentMechanics);
 if(!baselineMechanicsJo||!currentMechanicsJo)fail('baseline or native-current Jo mechanics record is missing');
 return {oldRegistry,oldProof,oldProofSha,legacyRegistration,legacyBeforeEquipment,historicalReceipt,oldEpochProofs,baselineEquipment,baselineMechanicsJo,currentMechanicsJo};
}

export function createNativeHirelingsJoSuccessor({contractBytes,contractSha256,contractPath,registryPath=nativeJoRegistrationPath,registrySha256,proofPath=nativeJoPayloadProofPath,proofSha256,repoRoot=process.cwd()}={}){
 const contract=assertNativeContractBytes(contractBytes,contractSha256),root=resolve(repoRoot);
 if(!contractPath||!registryPath||!proofPath||!/^[a-f0-9]{64}$/.test(registrySha256||'')||!/^[a-f0-9]{64}$/.test(proofSha256||''))fail('closed contract, registry, and proof references are required');
 function loadJoCurrentSuccessor({repoRoot:callRoot=root,data,inventory}={}){
  const currentRoot=resolve(callRoot),sourceContext=assertNativeHirelingsSourceEpoch({repoRoot:currentRoot,contract});
  const readPinned=(path,expectedSha,{json=true}={})=>{
   safePath(path);const bytes=readFileSync(resolve(currentRoot,path));
   if(sha256(bytes)!==expectedSha)fail(`stale current native input ${path}`);
   return {bytes,value:json?parse(bytes,path):undefined};
  };
  const contractFile=readPinned(contractPath,contractSha256,{json:false});
  if(!contractFile.bytes.equals(contractBytes))fail('source epoch contract file bytes differ from the installed closed contract');
  const registryFile=readPinned(registryPath,registrySha256),registry=assertNativeRegistry(registryFile.value,{contract,contractSha256,contractPath,registrySha256,proofSha256});
  const proofFile=readPinned(proofPath,proofSha256),proof=assertNativeProof(proofFile.value,{contract,registry,sourceContext,proofSha256});
  const currentInputs=new Map();
  for(const expected of registry.currentInputs){const file=readPinned(expected.path,expected.sha256,{json:expected.path.endsWith('.json')});currentInputs.set(expected.path,{...expected,bytes:file.bytes,value:file.value});}
  const dataBytes=currentInputs.get('dist/data.json')?.bytes,inventoryBytes=currentInputs.get('research/price-source-inventory.json')?.bytes;
  const equipmentBytes=currentInputs.get('equipment.json')?.bytes,mechanics=currentInputs.get('research/mechanics-audit-progress.json')?.value;
  const monetaryIndex=currentInputs.get('research/monetary-source-inventory.json')?.value;
  if(!data||!inventory||!dataBytes||!inventoryBytes||!equipmentBytes||!mechanics)fail('actual HIRED data, canonical price inventory, equipment, and mechanics inputs are required');
  if(objectHash(parse(dataBytes,'dist/data.json'))!==objectHash(data)||objectHash(parse(inventoryBytes,'research/price-source-inventory.json'))!==objectHash(inventory))fail('supplied actual HIRED data or canonical inventory differs from its exact raw input');
  if(!monetaryIndex)fail('actual current monetary index is required');
  try{validateCurrentMonetaryIndexDependencies(currentRoot,monetaryIndex);}catch(error){fail(`actual current monetary index dependencies: ${error.message}`);}
  const expectedInputRows=registry.currentInputs.map(({path,sha256})=>({path,sha256}));
  if(!same(proof.currentInputs,expectedInputRows))fail('proof current file hashes do not bind the actual current files');
  const coreHash=objectHash({data:parse(dataBytes,'dist/data.json'),inventory:parse(inventoryBytes,'research/price-source-inventory.json'),equipment:parse(equipmentBytes,'equipment.json'),mechanics});
  if(proof.currentSemanticInputHash!==coreHash)fail('whole parsed current Jo input identity differs from native proof');
  const currentEquipment=parse(equipmentBytes,'equipment.json');
  const history=readHistoricalInputs(currentRoot,currentEquipment,mechanics);
  const semantic=validateJoCurrentSuccessor({registration:history.oldRegistry,proof:history.oldProof,proofSha:history.oldProofSha,baselineEquipment:history.baselineEquipment,currentEquipment,currentEquipmentSha:sha256(equipmentBytes),legacyRegistration:history.legacyRegistration,legacyBeforeEquipment:history.legacyBeforeEquipment,historicalReceipt:history.historicalReceipt,data,inventory,baselineMechanicsJo:history.baselineMechanicsJo,currentMechanicsJo:history.currentMechanicsJo});
  if(!same({itemId:semantic.itemId,name:semantic.name,priceNote:semantic.priceNote,sourceAbsence:semantic.sourceAbsence,valueReviewed:semantic.valueReviewed,recordSha256:semantic.recordSha256,payloadProof:semantic.payloadProof},{itemId:HISTORICAL_JO_OUTPUT.itemId,name:HISTORICAL_JO_OUTPUT.name,priceNote:HISTORICAL_JO_OUTPUT.priceNote,sourceAbsence:false,valueReviewed:false,recordSha256:HISTORICAL_JO_OUTPUT.recordSha256,payloadProof:{path:priorProofPath,sha256:HISTORICAL_JO_OUTPUT.priorProof.sha256,changedPaths:HISTORICAL_JO_OUTPUT.changedPaths,renderedUa28StringFields:3,ua28NumericCells:33,joObjectSha256:HISTORICAL_JO_OUTPUT.recordSha256,joMechanicsGradeSha256:HISTORICAL_JO_OUTPUT.joMechanicsRecordSha256}}))fail('historical semantic kernel no longer reproduces the frozen actual Version 29 Jo producer output');
  // Hash the exact equipment.json payload object. The assembled dist/data.json
  // owner is checked field-by-field by validateJoCurrentSuccessor and also
  // carries generated sourceExcerpts/evidenceBindings transport metadata.
  const jo=semantic.itemId==='ua-jo-stick'?currentEquipment.equipment.find(item=>item.id==='ua-jo-stick'):null;
  const joMechanics=history.currentMechanicsJo;
  if(!jo||objectHash(jo)!==HISTORICAL_JO_OUTPUT.recordSha256||objectHash(joMechanics)!==HISTORICAL_JO_OUTPUT.joMechanicsRecordSha256)fail('native H current Jo equipment/mechanics identity or unassessed gap changed');
  const nativeProofJo=nativeJoProofState({equipmentObjectSha256:objectHash(jo),mechanicsRecordSha256:objectHash(joMechanics)});
  if(!same(proof.jo,nativeProofJo))fail('native proof Jo rows do not match actual H current data/mechanics');
  const historicalRefs=[ref(priorRegistryPath,priorRegistrySha256),ref(priorProofPath,HISTORICAL_JO_OUTPUT.priorProof.sha256),ref(legacyRegistryPath,legacyRegistrySha256),...history.oldEpochProofs.map((_,i)=>({path:history.oldRegistry.sourceEpoch.proofs[i].path,sha256:history.oldRegistry.sourceEpoch.proofs[i].sha256}))];
  const nativeRefs=[ref(contractPath,contractSha256),ref(registryPath,registrySha256),ref(proofPath,proofSha256),...nativeSourceRawPaths.map(path=>ref(path,contract.sourceRawInputs[path])),...registry.currentInputs.map(row=>ref(row.path,row.sha256)),...historicalRefs];
  const unique=[...new Map(nativeRefs.map(row=>[row.path,row])).values()];
  return {...semantic,registryRef:ref(registryPath,registrySha256),inputRefs:unique,payloadProof:{path:proofPath,sha256:proofSha256,changedPaths:semantic.payloadProof.changedPaths,renderedUa28StringFields:3,ua28NumericCells:33,joObjectSha256:objectHash(jo),joMechanicsGradeSha256:objectHash(joMechanics),nativeCurrentSemanticInputHash:coreHash}};
 }
 return {loadJoCurrentSuccessor,joPriceRegistrationPath:registryPath,joPriceRegistrationSha256:registrySha256,joPayloadProofPath:proofPath,joPayloadProofSha256:proofSha256};
}

export const nativeJoDevelopmentConstants=Object.freeze({priorRegistryPath,priorRegistrySha256,priorProofPath,legacyRegistryPath,legacyRegistrySha256,HISTORICAL_JO_OUTPUT,JO_SEMANTICS,JO_PROOF_SEMANTICS});
