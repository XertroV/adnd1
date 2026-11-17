// Native2 current-consumer boundary. All entrypoints authenticate the genuine
// Source2 body gate and the exact B -> K -> L -> M raw single-parent chain.
import {createHash} from 'node:crypto';
import {constants,closeSync,fstatSync,lstatSync,openSync,readFileSync,realpathSync} from 'node:fs';
import {isDeepStrictEqual,types} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertClassMappingCurrentSourceEpoch,assertClassMappingCurrentSnapshot} from './class-mapping-current-source-gate-v2.mjs';
import {createRawGitReader} from './class-mapping-raw-git-v1.mjs';
import {verifyCurrentConsumerCodeStageSeal,verifyCurrentConsumerMaterializedStageSeal} from './class-mapping-current-consumer-seal-verifier-v2.mjs';
import {
  parseCurrentConsumerPinModuleBytes,currentConsumerPinModuleBytes,
  currentConsumerFinalStubFromCodeStagePins,assertCurrentConsumerPinMaterialization,
  assertCurrentConsumerContractMaterialization,
  SOURCE_BODY_COMMIT,SOURCE_BODY_TREE,SOURCE_BODY_PARENT,SOURCE_BODY_PARENT_TREE,SOURCE_BODY_FIXTURE_PATH,SOURCE_BODY_FIXTURE_SHA256,SOURCE_BODY_FIXTURE_SIZE_BYTES,
  NATIVE_PIN_MODULE_SHA256,NATIVE_PIN_MODULE_SIZE_BYTES,SOURCE_BODY_INPUT_COUNT,SOURCE_BODY_INPUT_HASHES_SHA256,SOURCE_BODY_SNAPSHOT_PATHS,assertSourceBodyInputHashes,CORE_CODE_IDENTITY,METADATA_IDENTITY,REPORT_QCC_PARENT,
  NATIVE_INSTALLED_CODE_PATHS,NATIVE_PIN_MODULE_PATH,REPORT_CODE_PATHS,
  CURRENT_CONSUMER_CONTRACT_PATHS,CURRENT_CONSUMER_RECEIPT_PATHS,
  CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,CURRENT_CONSUMER_PINS_PATH,
  TRANSITION_RECEIPT_PATH,
} from './class-mapping-report-input-contract-v3.mjs';
import {assertNative2Lineage} from './class-mapping-report-lineage-v2.mjs';

export const currentConsumerRepoRoot=realpathSync(resolve(fileURLToPath(new URL('..',import.meta.url))));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(`Invalid Native2 current consumer input: ${message}`);};
const safePath=value=>{if(typeof value!=='string'||value.startsWith('/')||value.includes('\\')||value.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('-')))fail(`unsafe repository path ${String(value)}`);return value;};
const raw=createRawGitReader(currentConsumerRepoRoot);
const stageTokens=new WeakMap();
const certificatePaths=Object.freeze([
 'research/class-mapping-source-epoch-v2/independent-input-closure-certificate-v2.json',
 'research/class-mapping-source-epoch-v2/independent-preservation-certificate-v2.json',
]);

function readRegularFile(relative){
 const path=safePath(relative),absolute=resolve(currentConsumerRepoRoot,path);let stat;
 try{stat=lstatSync(absolute);}catch{fail(`required file is missing: ${path}`);}
 if(!stat.isFile()||stat.isSymbolicLink())fail(`required file is not a regular non-symlink: ${path}`);
 if(realpathSync(absolute)!==absolute)fail(`required file resolves through a symlink: ${path}`);
 let fd;try{fd=openSync(absolute,constants.O_RDONLY|constants.O_NOFOLLOW);}catch{fail(`cannot open without following a symlink: ${path}`);}
 try{if(!fstatSync(fd).isFile())fail(`opened path is not a regular file: ${path}`);const bytes=readFileSync(fd);if(realpathSync(absolute)!==absolute)fail(`file changed to symlink: ${path}`);return bytes;}finally{closeSync(fd);}
}
const physical=readRegularFile;
// The shared raw-Git helper fixes maxBuffer at 128 MiB. Never downgrade to
// Node's 1 MiB default or classify a large-object failure as absence.
function rawBlob(commit,path){return raw.git('show',`${commit}:${safePath(path)}`);}
function exactObjectKeys(value,expected){return value&&typeof value==='object'&&!Array.isArray(value)&&isDeepStrictEqual(Object.keys(value).sort(),[...expected].sort());}
function assertExactMap(value,paths,label){if(!value||typeof value!=='object'||Array.isArray(value)||!isDeepStrictEqual(Object.keys(value).sort(),[...paths].sort()))fail(`${label}: exact path set`);for(const [path,digest]of Object.entries(value)){safePath(path);if(!/^[a-f0-9]{64}$/.test(digest||''))fail(`${label}: malformed digest for ${path}`);}}
function parseJson(bytes,label){try{return JSON.parse(Buffer.from(bytes).toString('utf8'));}catch{fail(`${label}: invalid JSON`);}}
function assertNativeSourceProof(proof){
 const {summary,inputs,inputHashes}=proof||{};
 // The gate summary intentionally omits parentCommit. Authenticate the
 // SHA-pinned full fixture first, including B's direct parent and parent tree.
 const fixtureBytes=physical(SOURCE_BODY_FIXTURE_PATH);
 if(fixtureBytes.length!==SOURCE_BODY_FIXTURE_SIZE_BYTES||sha(fixtureBytes)!==SOURCE_BODY_FIXTURE_SHA256)fail('exact accepted Source2 fixture bytes and size required');
 const fixture=JSON.parse(fixtureBytes.toString('utf8'));
 if(fixture?.sourceEpoch?.parentCommit!==SOURCE_BODY_PARENT||fixture?.sourceEpoch?.parentTree!==SOURCE_BODY_PARENT_TREE)fail('Source2 parent identity must come from the SHA-pinned fixture');
 if(summary?.stage!=='source2-body-native'||summary.sourceCommit!==SOURCE_BODY_COMMIT||summary.sourceTree!==SOURCE_BODY_TREE
   ||summary.fixture?.path!==SOURCE_BODY_FIXTURE_PATH||summary.fixture?.sha256!==SOURCE_BODY_FIXTURE_SHA256
   ||!inputs?.data||!inputs?.inventory||!inputs?.manual||!inputs?.mechanics||!inputHashes?.sourceBody)fail('complete physically qualified Source2 body proof required');
 assertSourceBodyInputHashes(inputHashes.sourceBody);
 if(Object.keys(inputHashes.sourceBody).length!==SOURCE_BODY_INPUT_COUNT||SOURCE_BODY_INPUT_HASHES_SHA256.length!==64)fail('full exact Source2 input hash closure required');
 if(!exactObjectKeys(inputHashes.installedCode,NATIVE_INSTALLED_CODE_PATHS))fail('Native2 gate must qualify the exact seven installed code paths');
 const qualificationPaths=[SOURCE_BODY_FIXTURE_PATH,NATIVE_PIN_MODULE_PATH,...certificatePaths];
 if(!exactObjectKeys(inputHashes.qualificationMetadata,qualificationPaths))fail('Native2 final fixture/pins/two accepted certificates must form the exact metadata closure');
 if(fixture?.schemaVersion!==2||fixture?.stage!=='source2-body-native'||fixture.sourceEpoch?.sourceCommit!==SOURCE_BODY_COMMIT
   ||fixture.sourceEpoch?.sourceTree!==SOURCE_BODY_TREE||fixture.sourceEpoch?.parentCommit!==SOURCE_BODY_PARENT
   ||fixture.codeStage?.commit!==CORE_CODE_IDENTITY.commit||fixture.codeStage?.tree!==CORE_CODE_IDENTITY.tree||fixture.codeStage?.parentCommit!==SOURCE_BODY_COMMIT)fail('accepted final fixture must join B and actual K exactly');
 if(!fixture.certificates?.closure||!fixture.certificates?.preservation)fail('final fixture must reference both accepted certificates');
 const certRefs=[fixture.certificates.closure,fixture.certificates.preservation];
 if(!isDeepStrictEqual(certRefs.map(r=>r.path).sort(),[...certificatePaths].sort()))fail('fixture certificate paths differ from the fixed Native2 pair');
 for(const path of qualificationPaths){const expected=inputHashes.qualificationMetadata[path],bytes=physical(path);if(!/^[a-f0-9]{64}$/.test(expected||'')||sha(bytes)!==expected)fail(`Native2 qualification input changed: ${path}`);if(path===NATIVE_PIN_MODULE_PATH&&(bytes.length!==NATIVE_PIN_MODULE_SIZE_BYTES||expected!==NATIVE_PIN_MODULE_SHA256))fail('exact accepted Native2 pin module digest/size required');}
 for(const ref of certRefs){const cert=parseJson(physical(ref.path),ref.path);if(cert.accepted!==true||cert.independent!==true||cert.sourceEpoch?.sourceCommit!==SOURCE_BODY_COMMIT||cert.sourceEpoch?.sourceTree!==SOURCE_BODY_TREE)fail(`${ref.path}: accepted independent Native2 certificate required`);if(ref.sha256!==inputHashes.qualificationMetadata[ref.path])fail(`${ref.path}: fixture digest differs from qualification closure`);}
 for(const path of SOURCE_BODY_SNAPSHOT_PATHS){const expected=inputHashes.sourceBody[path];if(!/^[a-f0-9]{64}$/.test(expected||'')||sha(physical(path))!==expected)fail(`required Source2 snapshot differs from the full native map: ${path}`);}
 for(const [path,digest]of Object.entries(inputHashes.sourceBody)){safePath(path);if(!/^[a-f0-9]{64}$/.test(digest||''))fail(`malformed Source2 source-body pin ${path}`);}
 if(!isDeepStrictEqual(assertClassMappingCurrentSnapshot(inputs),summary))fail('Source2 body changed between qualification and consumer use');
 return {summary,inputs,inputHashes,fixture};
}
function assertSourceEpochPins(pins,summary){
 const source=pins?.sourceEpoch;
 if(!source||source.sourceCommit!==summary.sourceCommit||source.sourceTree!==summary.sourceTree||source.fixturePath!==summary.fixture.path||source.fixtureSha256!==summary.fixture.sha256)fail('consumer pins do not bind the accepted Source2 fixture');
 if(pins.materialized!==true||pins.schemaVersion!==2)fail('materialized Native2 consumer pin module required');
}
function assertIdentityPins(pins,sealedIdentity,kind){
 if(!isDeepStrictEqual(pins.coreCode,CORE_CODE_IDENTITY)||!isDeepStrictEqual(pins.metadata,METADATA_IDENTITY))fail('separate exact Native2 core K and metadata L identities required');
 const actualM=sealedIdentity?.reportQcc;if(!actualM)fail('seal verifier must supply actual report QCC M identity');
 if(kind==='code'){if(!isDeepStrictEqual(pins.reportQcc,{commit:null,tree:null,parent:REPORT_QCC_PARENT}))fail('M preimage pins must retain explicit pending M child of L');}
 else if(!isDeepStrictEqual(pins.reportQcc,actualM))fail('final pins must explicitly bind actual report QCC M');
 const chain=assertNative2Lineage({sourceEpoch:{sourceCommit:SOURCE_BODY_COMMIT,sourceTree:SOURCE_BODY_TREE,parentCommit:SOURCE_BODY_PARENT},coreCode:pins.coreCode,metadata:pins.metadata,reportQcc:actualM});
 if(!isDeepStrictEqual(sealedIdentity.coreCode,chain.coreCode)||!isDeepStrictEqual(sealedIdentity.metadata,chain.metadata)||!isDeepStrictEqual(actualM,chain.reportQcc))fail('sealed B/K/L/M identity differs from exact raw ancestry');
 return chain;
}
function assertNativePinsMatchGate(pins,proof){
 const gateCode=proof.inputHashes.installedCode;
 if(proof.fixture.codeStage?.commit!==pins.coreCode.commit||proof.fixture.codeStage?.tree!==pins.coreCode.tree||proof.fixture.codeStage?.parentCommit!==SOURCE_BODY_COMMIT)fail('Native2 accepted fixture is not bound to the exact K child of B');
 for(const path of NATIVE_INSTALLED_CODE_PATHS){const digest=gateCode[path];if(!/^[a-f0-9]{64}$/.test(digest||'')||sha(physical(path))!==digest||sha(rawBlob(pins.coreCode.commit,path))!==digest)fail(`Native2 K installed-code pin differs: ${path}`);}
 const inputPins=proof.inputHashes.qualificationMetadata;
 for(const path of Object.keys(inputPins)){if(sha(rawBlob(pins.metadata.commit,path))!==inputPins[path])fail(`accepted Native2 L metadata pin differs: ${path}`);}
 for(const path of certificatePaths){const cert=parseJson(rawBlob(pins.metadata.commit,path),path);if(cert.accepted!==true||cert.independent!==true)fail(`${path}: raw L must contain the accepted independent certificate`);}
 if(sha(rawBlob(pins.metadata.commit,SOURCE_BODY_FIXTURE_PATH))!==SOURCE_BODY_FIXTURE_SHA256)fail('raw L must contain the exact accepted final Native2 fixture');
 if(sha(rawBlob(pins.metadata.commit,NATIVE_PIN_MODULE_PATH))!==proof.inputHashes.qualificationMetadata[NATIVE_PIN_MODULE_PATH])fail('raw L must contain the exact Native2 qualification pin module');
}
function assertCodeClosure(codePins,chain){
 assertExactMap(codePins,REPORT_CODE_PATHS,'report QCC code pins');
 for(const path of REPORT_CODE_PATHS){const expected=codePins[path];if(sha(physical(path))!==expected||sha(rawBlob(chain.reportQcc.commit,path))!==expected)fail(`M report code pin differs: ${path}`);}
}
function assertPendingContractsAtM(pendingContractPins,chain){
 assertExactMap(pendingContractPins,CURRENT_CONSUMER_CONTRACT_PATHS,'pending M consumer contract pins');
 for(const path of CURRENT_CONSUMER_CONTRACT_PATHS){const expected=pendingContractPins[path];if(sha(physical(path))!==expected||sha(rawBlob(chain.reportQcc.commit,path))!==expected)fail(`pending M consumer contract preimage differs: ${path}`);}
}
function assertPendingContractHashesInM(pendingContractPins,chain){
 assertExactMap(pendingContractPins,CURRENT_CONSUMER_CONTRACT_PATHS,'immutable pending M consumer contract pins');
 for(const path of CURRENT_CONSUMER_CONTRACT_PATHS){if(sha(rawBlob(chain.reportQcc.commit,path))!==pendingContractPins[path])fail(`raw M pending contract hash differs: ${path}`);}
}
function assertMaterializedContracts(pins,chain){
 const receiptSha=pins.receiptPins?.[TRANSITION_RECEIPT_PATH];
 for(const path of CURRENT_CONSUMER_CONTRACT_PATHS){
  const pendingBytes=rawBlob(chain.reportQcc.commit,path),finalBytes=physical(path),expected=pins.contractPins[path];
  if(sha(pendingBytes)!==pins.pendingContractPins[path]||sha(finalBytes)!==expected||sha(rawBlob(pins.reportQcc.commit,path))!==expected)fail(`N materialized contract hash differs: ${path}`);
  assertCurrentConsumerContractMaterialization(path,pendingBytes,finalBytes,receiptSha);
 }
}
function assertSourceBodyPins(pins,proof){
 assertSourceBodyInputHashes(pins.sourceBodyInputHashes);
 if(!isDeepStrictEqual(pins.sourceBodyInputHashes,proof.inputHashes.sourceBody))fail('full 3,063-entry consumer source-body map differs from the live Native2 gate');
 for(const path of SOURCE_BODY_SNAPSHOT_PATHS){const expected=pins.sourceBodyInputHashes[path];if(sha(physical(path))!==expected)fail(`primary Source2 snapshot differs from the full native map: ${path}`);}
}
function assertPendingFinalStub(codePins,chain){
 const expected=currentConsumerPinModuleBytes(currentConsumerFinalStubFromCodeStagePins(codePins),'materialized-stage');
 const actual=physical(CURRENT_CONSUMER_PINS_PATH);
 if(!actual.equals(expected)||!rawBlob(chain.reportQcc.commit,CURRENT_CONSUMER_PINS_PATH).equals(expected))fail('M must contain the exact canonical pending final-pin preimage derived from authenticated code-stage maps');
 return actual;
}
function freezeTree(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;}
function remember(kind,pending){const stage={summary:pending.proof.summary,inputs:pending.proof.inputs,inputHashes:pending.proof.inputHashes,consumerPins:pending.pins,sourceEpoch:pending.chain.sourceEpoch,coreCode:pending.chain.coreCode,metadata:pending.chain.metadata,reportQcc:pending.chain.reportQcc,qualifierCodeCommit:pending.chain.reportQcc.commit};freezeTree(stage.summary);freezeTree(stage.inputs);freezeTree(stage.inputHashes);freezeTree(stage.consumerPins);stageTokens.set(stage,kind);return Object.freeze(stage);}
function run(pins,kind,sealedIdentity){
 raw.assertView();const proof=assertNativeSourceProof(assertClassMappingCurrentSourceEpoch());assertSourceEpochPins(pins,proof.summary);const chain=assertIdentityPins(pins,sealedIdentity,kind);assertNativePinsMatchGate(pins,proof);assertSourceBodyPins(pins,proof);assertCodeClosure(pins.codePins,chain);
 if(kind==='code'){assertPendingContractsAtM(pins.contractPins,chain);assertPendingFinalStub(pins,chain);}
 else{assertPendingContractHashesInM(pins.pendingContractPins,chain);assertExactMap(pins.contractPins,CURRENT_CONSUMER_CONTRACT_PATHS,'materialized N consumer contract pins');assertMaterializedContracts(pins,chain);const rawStub=rawBlob(chain.reportQcc.commit,CURRENT_CONSUMER_PINS_PATH);assertCurrentConsumerPinMaterialization(rawStub,pins);}
 const fresh=assertClassMappingCurrentSnapshot(proof.inputs);if(!isDeepStrictEqual(fresh,proof.summary))fail('fresh Source2 snapshot differs from installed gate');raw.assertView();return {proof,pins,chain};
}
function refresh(stage,minimum='code'){
 const kind=stage&&typeof stage==='object'?stageTokens.get(stage):undefined;if(!kind||(minimum==='full'&&kind!=='full'))fail('stage token must come from this installed Source2 runtime');return kind==='full'?qualifyCurrentConsumerStage():qualifyCurrentConsumerCodeStage();
}
export function qualifyCurrentConsumerCodeStage(...args){
 if(args.length)fail('code-stage qualification accepts no caller overrides');const sealed=verifyCurrentConsumerCodeStageSeal();
 const pinBytes=physical(CURRENT_CONSUMER_CODE_STAGE_PINS_PATH),pins=parseCurrentConsumerPinModuleBytes(pinBytes,'code-stage');
 if(sha(pinBytes)!==sealed.currentConsumerPinModule?.sha256||pins.materialized!==true)fail('materialized code-stage pins must match their exact seal');
 return remember('code',run(pins,'code',sealed));
}
export function qualifyCurrentConsumerStage(...args){
 if(args.length)fail('materialized consumer stage accepts no caller overrides');const sealed=verifyCurrentConsumerMaterializedStageSeal();
 const pinBytes=physical(CURRENT_CONSUMER_PINS_PATH),pins=parseCurrentConsumerPinModuleBytes(pinBytes,'materialized-stage');
 if(sha(pinBytes)!==sealed.currentConsumerPinModule?.sha256||pins.materialized!==true)fail('materialized final pins must match their exact seal');
 const stage=run(pins,'full',sealed);
 assertExactMap(pins.receiptPins,CURRENT_CONSUMER_RECEIPT_PATHS,'current consumer receipt pins');
 for(const path of CURRENT_CONSUMER_RECEIPT_PATHS){const expected=pins.receiptPins[path];if(sha(physical(path))!==expected||sha(rawBlob(sealed.head,path))!==expected)fail(`sealed current receipt differs: ${path}`);}
 if(sha(rawBlob(sealed.reportQcc.commit,CURRENT_CONSUMER_CODE_STAGE_PINS_PATH))!==sha(physical(CURRENT_CONSUMER_CODE_STAGE_PINS_PATH)))fail('code-stage pins changed after QCC');
 return remember('full',stage);
}
export function requireQualificationArtifact(stage,relativePath){const current=refresh(stage,'code'),expected=current.consumerPins.contractPins?.[relativePath];if(!/^[a-f0-9]{64}$/.test(expected||''))fail(`consumer contract is not pinned for this stage: ${relativePath}`);const bytes=physical(relativePath);if(sha(bytes)!==expected)fail(`consumer contract is stale: ${relativePath}`);return {bytes,sha256:expected};}
export function requireConsumerReceipt(stage,relativePath){const current=refresh(stage,'full'),expected=current.consumerPins.receiptPins?.[relativePath];if(!/^[a-f0-9]{64}$/.test(expected||''))fail(`consumer receipt is not pinned: ${relativePath}`);const bytes=physical(relativePath);if(sha(bytes)!==expected)fail(`consumer receipt is stale: ${relativePath}`);return {bytes,sha256:expected};}
export function sourceBodyReference(stage,relativePath){const current=refresh(stage,'code'),expected=current.inputHashes.sourceBody?.[relativePath];if(!/^[a-f0-9]{64}$/.test(expected||''))fail(`path is outside the Native2 body closure: ${relativePath}`);if(sha(physical(relativePath))!==expected)fail(`Source2 body reference changed: ${relativePath}`);return {path:relativePath,sha256:expected};}
export function assertPlainJson(value,label='caller value'){
 if(Object.getPrototypeOf(Object.prototype)!==null||Object.getPrototypeOf(Array.prototype)!==Object.prototype||Object.hasOwn(Object.prototype,'toJSON')||Object.hasOwn(Array.prototype,'toJSON'))fail(`${label}: prototype hooks not permitted`);
 const active=new Set();function visit(node){if(node===null||typeof node==='string'||typeof node==='boolean')return true;if(typeof node==='number')return Number.isFinite(node)&&!Object.is(node,-0);if(typeof node!=='object'||types.isProxy(node)||active.has(node))return false;const array=Array.isArray(node),prototype=Object.getPrototypeOf(node);if(prototype!==(array?Array.prototype:Object.prototype))return false;active.add(node);const keys=Reflect.ownKeys(node);if(array&&(keys.length!==node.length+1||!keys.includes('length')))return false;for(const key of keys){if(array&&key==='length')continue;if(typeof key!=='string'||(array&&!/^(0|[1-9]\d*)$/.test(key)))return false;const descriptor=Object.getOwnPropertyDescriptor(node,key);if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value')||!visit(descriptor.value))return false;}active.delete(node);return true;}if(!visit(value))fail(`${label}: inert plain JSON required`);return true;
}
export function assertCurrentBodyValue(stage,candidate,key){const current=refresh(stage,'code');assertPlainJson(candidate,`caller-supplied ${key}`);if(!Object.hasOwn(current.inputs,key)||!isDeepStrictEqual(candidate,current.inputs[key]))fail(`caller-supplied ${key} is not the exact current Native2 snapshot`);return true;}
