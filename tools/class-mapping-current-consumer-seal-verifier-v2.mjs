// Mandatory zero-argument Native2 report trust boundary. Pin modules are data;
// this module never imports the adapter runtime, report binder, or pin exports.
import {assertClassMappingCurrentSourceIdentity} from './class-mapping-current-source-gate-v2.mjs';
import {createRawGitReader,verifyRawCommit} from './class-mapping-raw-git-v1.mjs';
import {parseRawHeadCommitBytes} from './class-mapping-current-head-commit-v1.mjs';
import * as contract from './class-mapping-report-input-contract-v3.mjs';
import {constants,closeSync,fstatSync,lstatSync,openSync,readFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TextDecoder} from 'node:util';
const repoRoot=realpathSync(resolve(fileURLToPath(new URL('..',import.meta.url))));
const rawGit=createRawGitReader(repoRoot);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const B={commit:'400f6e9d123d8a654b9b9af48133a2533506e73d',tree:'664c02504efcece25669d2f9c3fdb26437cd5b09',parent:'6502b19620e092ced9f3e233f2dc3d5ffc8bd3ec'};
const K={commit:'3da6f9f59fcca6b5ce7e3b55be15357182591edf',tree:'42484c6cf36df7dcb8dedb99c05414168e74fb5d',parent:B.commit};
const L={commit:'06d5278d28bc346ca9b7bca11622d6c8b4ec5a5a',tree:'3d9f4953dfd8a62674e81cefdec89cf1cc2320f9',parent:K.commit};
const fixturePath='research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json';
const fixtureSha256='a333c3920f5ec5d3dbdca4b32673dd22ba94c77807794103af3eb21af71b14c2';
const fixtureSizeBytes=1111074;
const nativePinPath='research/class-mapping-source-epoch-v2/native-qualification-pins-v2.mjs';
const nativePinSha256='176be6d20d5c4c21169e7114009a5a867ec049fc7066c131fda6f65f589c3f7f';
const nativePinSizeBytes=2417;
const prefix='research/class-mapping-current-adapters-v2/';
const codeStageSealPath=prefix+'current-consumer-code-stage-seal-v2.json';
const finalSealPath=prefix+'current-consumer-native2-seal-v2.json';
const codeStagePinsPath=prefix+'current-consumer-code-stage-pins-v2.mjs';
const finalPinsPath=prefix+'current-consumer-pins-v2.mjs';
const transitionReceiptPath=prefix+'source-body-handoff-transition-v2.json';
const fail=message=>{throw Error('Invalid Native2 current-consumer seal: '+message);};
const check=(value,message)=>{if(!value)fail(message);};
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value)&&!/^0{40}$/.test(value);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function assertNativeObjectPrototypes(){
 check(Object.getPrototypeOf(Object.prototype)===null&&Object.getPrototypeOf(Array.prototype)===Object.prototype&&!Object.hasOwn(Object.prototype,'toJSON')&&!Object.hasOwn(Array.prototype,'toJSON'),'global prototype hooks are not permitted during seal verification');
 check(realpathSync(repoRoot)===repoRoot,'fixed physical repository root');
}
function safePath(path){check(typeof path==='string'&&!!path&&!path.startsWith('/')&&!path.includes('\\')&&!/[:\x00-\x1f\x7f]/.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!part.startsWith('-')),'unsafe fixed repository path');}
function readPhysical(path){
 safePath(path);const absolute=resolve(repoRoot,path);let stat;
 try{stat=lstatSync(absolute);}catch{fail('required seal input is missing: '+path);}
 check(stat.isFile()&&!stat.isSymbolicLink(),'seal input must be a physical regular file: '+path);
 check(realpathSync(absolute)===absolute,'seal input resolves through a symlink: '+path);
 let fd;try{fd=openSync(absolute,constants.O_RDONLY|constants.O_NOFOLLOW);}catch{fail('cannot open seal input without following a symlink: '+path);}
 try{const opened=fstatSync(fd);check(opened.isFile()&&opened.dev===stat.dev&&opened.ino===stat.ino,'opened seal input changed identity: '+path);const bytes=readFileSync(fd);check(realpathSync(absolute)===absolute,'seal input changed to a symlink while reading: '+path);return bytes;}finally{closeSync(fd);}
}
function exactKeys(value,keys,label){check(value&&typeof value==='object'&&!Array.isArray(value)&&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort()),label+': exact key set');}
function jsonBytes(bytes,label){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));}catch{fail(label+': invalid UTF-8/JSON');}}
function equal(left,right){const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);return canonical(left)===canonical(right);}
function readSeal(path,stage,summary){const bytes=readPhysical(path),seal=contract.validateCurrentConsumerSealDocument(jsonBytes(bytes,path),stage,summary);return {seal,bytes,digest:sha256(bytes)};}
function readPins(path,stage){const bytes=readPhysical(path),pins=contract.parseCurrentConsumerPinModuleBytes(bytes,stage);return {pins,bytes,digest:sha256(bytes)};}
function assertBlob(path,commit,physicalBytes,label){const bytes=rawGit.git('show',commit+':'+path);check(bytes.equals(physicalBytes),label+' physical bytes differ from exact raw commit blob: '+path);}
function verifyCommit(value){check(value&&oid(value.commit)&&oid(value.tree)&&oid(value.parent),'exact commit/tree/single-parent identities are required');check(rawGit.git('rev-parse','--verify',value.commit+'^{commit}').toString('utf8').trim()===value.commit&&rawGit.git('rev-parse','--verify',value.commit+'^{tree}').toString('utf8').trim()===value.tree,'raw commit/tree object identity');verifyRawCommit(rawGit.git('cat-file','commit',value.commit),value.commit,value.tree,value.parent);}
function rawHead(){const head=rawGit.git('rev-parse','--verify','HEAD^{commit}').toString('utf8').trim();check(oid(head),'actual HEAD commit identity');const {tree,parents}=parseRawHeadCommitBytes(rawGit.git('cat-file','commit',head),head);check(rawGit.git('rev-parse','--verify',head+'^{tree}').toString('utf8').trim()===tree,'HEAD raw tree identity');for(const parent of parents)check(rawGit.git('rev-parse','--verify',parent+'^{commit}').toString('utf8').trim()===parent,'HEAD raw parent object identity');return {head,tree,parents};}
function assertNativeIdentity(){
 const proof=assertClassMappingCurrentSourceIdentity(),summary=proof?.summary;
 check(summary?.stage==='source2-body-native'&&summary.sourceCommit===B.commit&&summary.sourceTree===B.tree&&summary.fixture?.path===fixturePath&&summary.fixture.sha256===fixtureSha256,'actual qualified Native2 core body and metadata fixture required');
 check(proof.inputHashes?.qualificationMetadata&&typeof proof.inputHashes.qualificationMetadata==='object','qualified core metadata hash closure required');return proof;
}
function assertCoreChainAndPhysicalMetadata(proof){
 // Reprove all direct core parents and physical/raw-L metadata on every call.
 for(const identity of [B,K,L])verifyCommit(identity);
 const fixed=[{path:fixturePath,sha256:fixtureSha256,sizeBytes:fixtureSizeBytes},{path:nativePinPath,sha256:nativePinSha256,sizeBytes:nativePinSizeBytes}];
 const fixtureBytes=readPhysical(fixturePath);check(fixtureBytes.length===fixtureSizeBytes&&sha256(fixtureBytes)===fixtureSha256,'exact qualified final native fixture');
 const fixture=jsonBytes(fixtureBytes,'native fixture');exactKeys(fixture.certificates,['preservation','closure'],'native certificates');
 const expectedBody=Object.fromEntries(fixture.sourceInputs.map(row=>[row.path,row.sha256]));contract.assertSourceBodyInputHashes(expectedBody);contract.assertSourceBodyInputHashes(proof.inputHashes.sourceBody);check(equal(expectedBody,proof.inputHashes.sourceBody),'qualified core must expose the entire immutable 3063 source-body input map');
 for(const kind of ['preservation','closure']){
  const ref=fixture.certificates[kind];exactKeys(ref,['path','sha256','sizeBytes'],kind+' native certificate');
  const expected=kind==='preservation'?'independent-preservation-certificate-v2.json':'independent-input-closure-certificate-v2.json';
  check(ref.path==='research/class-mapping-source-epoch-v2/'+expected&&digest(ref.sha256)&&Number.isSafeInteger(ref.sizeBytes)&&ref.sizeBytes>0,'exact two native certificate references');fixed.push(ref);
 }
 for(const row of fixed){const bytes=readPhysical(row.path);check(bytes.length===row.sizeBytes&&sha256(bytes)===row.sha256&&proof.inputHashes.qualificationMetadata[row.path]===row.sha256,'physical native metadata differs from qualified core bytes: '+row.path);assertBlob(row.path,L.commit,bytes,'immutable raw-L native metadata');}
}
function assertPinIdentity(pins,reportQcc,stage,proof){
 check(pins.materialized===true,'current-consumer pins remain unmaterialized');
 const source=pins.sourceEpoch,fixture=source?.fixture??{path:source?.fixturePath,sha256:source?.fixtureSha256};
 check(source?.sourceCommit===B.commit&&source.sourceTree===B.tree&&fixture.path===fixturePath&&fixture.sha256===fixtureSha256,'pin source differs from qualified Native2 fixture');
 check(equal(pins.coreCode,K)&&equal(pins.metadata,L),'pin core-code/metadata identities differ');
 contract.assertSourceBodyInputHashes(pins.sourceBodyInputHashes);contract.assertSourceBodyInputHashes(proof.inputHashes.sourceBody);check(equal(pins.sourceBodyInputHashes,proof.inputHashes.sourceBody),'consumer source body hashes differ from the entire qualified core input map');
 const expected=stage==='code-stage'?{commit:null,tree:null,parent:L.commit}:reportQcc;
 check(equal(pins.reportQcc,expected),'pin report-QCC identity differs from the required stage');
}
function assertReportCommit(reportQcc,head){
 check(reportQcc?.parent===L.commit,'report QCC must be a direct child of exact metadata L');verifyCommit(reportQcc);
 try{rawGit.git('merge-base','--is-ancestor',reportQcc.commit,head);}catch{fail('actual report M must be an ancestor of raw HEAD');}
}
function finalAnchor(proof,head){
 const parsed=readSeal(finalSealPath,'materialized-stage',proof.summary),pin=readPins(finalPinsPath,'materialized-stage');
 assertPinIdentity(pin.pins,parsed.seal.reportQcc,'materialized-stage',proof);
 check(parsed.seal.currentConsumerPinModule.path===finalPinsPath&&parsed.seal.currentConsumerPinModule.sha256===pin.digest,'final pin module hash differs from final seal');
 assertBlob(finalSealPath,head,parsed.bytes,'final M identity anchor');assertBlob(finalPinsPath,head,pin.bytes,'final pin identity anchor');return parsed.seal.reportQcc;
}
function verifyCodeStage(proof,headView,explicitReportQcc=null){
 const parsed=readSeal(codeStageSealPath,'code-stage',proof.summary),pin=readPins(codeStagePinsPath,'code-stage'),seal=parsed.seal;
 check(equal(seal.coreCode,K)&&equal(seal.metadata,L),'code-stage fixed B/K/L identities');
 check(equal(seal.reportQcc,{commit:null,tree:null,parent:L.commit}),'code-stage document must retain pending report-QCC identity');
 let reportQcc=explicitReportQcc;
 if(reportQcc===null){
  if(headView.parents.length===1&&headView.parents[0]===L.commit)reportQcc={commit:headView.head,tree:headView.tree,parent:L.commit};
  else if(headView.parents.length===1){
   // Exactly one bounded extra edge supports N before its receipt/final seal
   // exists. Never search ancestors or accept a caller-selected M identity.
   const parent=headView.parents[0],parsedParent=parseRawHeadCommitBytes(rawGit.git('cat-file','commit',parent),parent);
   if(parsedParent.parents.length===1&&parsedParent.parents[0]===L.commit)reportQcc={commit:parent,tree:parsedParent.tree,parent:L.commit};
  }
  if(reportQcc===null)reportQcc=finalAnchor(proof,headView.head);
 }
 assertReportCommit(reportQcc,headView.head);assertPinIdentity(pin.pins,reportQcc,'code-stage',proof);
 check(seal.currentConsumerPinModule.path===codeStagePinsPath&&seal.currentConsumerPinModule.sha256===pin.digest,'code-stage pin module hash differs from seal');
 exactKeys(seal.transitionReceipt,['path','sha256'],'code-stage transition receipt');check(seal.transitionReceipt.path===transitionReceiptPath&&seal.transitionReceipt.sha256===null,'code stage must precede generated transition receipt');
 for(const [path,bytes]of [[codeStageSealPath,parsed.bytes],[codeStagePinsPath,pin.bytes]]){assertBlob(path,reportQcc.commit,bytes,'immutable raw-M code stage');assertBlob(path,headView.head,bytes,'preserved code stage at raw HEAD');}
 const stub=rawGit.git('show',reportQcc.commit+':'+finalPinsPath);
 const expectedStub=contract.currentConsumerPinModuleBytes(contract.currentConsumerFinalStubFromCodeStagePins(pin.pins),'materialized-stage');
 check(stub.equals(expectedStub),'raw report M must retain the exact unmaterialized final pin stub');
 contract.parseCurrentConsumerPinModuleBytes(stub,'materialized-stage');
 for(const path of contract.CURRENT_CONSUMER_CONTRACT_PATHS){const pending=rawGit.git('show',reportQcc.commit+':'+path);check(sha256(pending)===pin.pins.contractPins[path],'raw-M pending contract differs from immutable code-stage pin: '+path);}
 return {sourceEpoch:seal.sourceEpoch,coreCode:seal.coreCode,metadata:seal.metadata,reportQcc,qualifierCode:reportQcc,currentConsumerPinModule:{path:codeStagePinsPath,sha256:pin.digest},codeStageSeal:{path:codeStageSealPath,sha256:parsed.digest},head:headView.head};
}
export function verifyCurrentConsumerCodeStageSeal(...args){
 check(args.length===0,'code-stage seal verifier accepts no caller inputs');
 assertNativeObjectPrototypes();rawGit.assertView();const proof=assertNativeIdentity();assertCoreChainAndPhysicalMetadata(proof);
 const result=verifyCodeStage(proof,rawHead());rawGit.assertView();assertNativeObjectPrototypes();return result;
}
export function verifyCurrentConsumerMaterializedStageSeal(...args){
 check(args.length===0,'materialized-stage seal verifier accepts no caller inputs');
 assertNativeObjectPrototypes();
 const codeStage=verifyCurrentConsumerCodeStageSeal();
 rawGit.assertView();const proof=assertNativeIdentity();assertCoreChainAndPhysicalMetadata(proof);const headView=rawHead();
 const parsed=readSeal(finalSealPath,'materialized-stage',proof.summary),seal=parsed.seal,pin=readPins(finalPinsPath,'materialized-stage');
 assertReportCommit(seal.reportQcc,headView.head);assertPinIdentity(pin.pins,seal.reportQcc,'materialized-stage',proof);
 for(const key of ['sourceEpoch','coreCode','metadata'])check(equal(seal[key],codeStage[key]),'final seal differs from code-stage '+key);
 check(equal(seal.reportQcc,codeStage.reportQcc),'final seal differs from actual immutable report M');
 exactKeys(seal.currentConsumerPinModule,['path','sha256'],'final pin module');exactKeys(seal.codeStagePinModule,['path','sha256'],'code-stage pin module');exactKeys(seal.codeStageSeal,['path','sha256'],'code-stage seal');exactKeys(seal.transitionReceipt,['path','sha256'],'transition receipt');
 const codePinsBytes=readPhysical(codeStagePinsPath),codeSealBytes=readPhysical(codeStageSealPath),receiptBytes=readPhysical(transitionReceiptPath);
 check(seal.currentConsumerPinModule.path===finalPinsPath&&seal.currentConsumerPinModule.sha256===pin.digest,'final pin physical hash differs from seal');
 check(seal.codeStagePinModule.path===codeStagePinsPath&&seal.codeStagePinModule.sha256===sha256(codePinsBytes),'immutable code-stage pin reference differs');
 check(seal.codeStageSeal.path===codeStageSealPath&&seal.codeStageSeal.sha256===codeStage.codeStageSeal.sha256&&seal.codeStageSeal.sha256===sha256(codeSealBytes),'immutable code-stage seal reference differs');
 check(seal.transitionReceipt.path===transitionReceiptPath&&digest(seal.transitionReceipt.sha256)&&seal.transitionReceipt.sha256===sha256(receiptBytes),'final transition receipt reference differs');
 check(pin.pins.receiptPins?.[transitionReceiptPath]===seal.transitionReceipt.sha256,'final pin receipt map differs from the sealed physical receipt');
 const rawStub=rawGit.git('show',seal.reportQcc.commit+':'+finalPinsPath);contract.assertCurrentConsumerPinMaterialization(rawStub,pin.pins);
 for(const path of contract.CURRENT_CONSUMER_CONTRACT_PATHS){
  const pending=rawGit.git('show',seal.reportQcc.commit+':'+path),final=readPhysical(path);
  check(sha256(pending)===pin.pins.pendingContractPins[path]&&sha256(final)===pin.pins.contractPins[path],'pending/final consumer contract SHA join: '+path);
  assertBlob(path,headView.head,final,'final materialized consumer payload');
  contract.assertCurrentConsumerContractMaterialization(path,pending,final,seal.transitionReceipt.sha256);
 }
 for(const [path,bytes]of [[finalSealPath,parsed.bytes],[finalPinsPath,pin.bytes],[codeStagePinsPath,codePinsBytes],[codeStageSealPath,codeSealBytes],[transitionReceiptPath,receiptBytes]])assertBlob(path,headView.head,bytes,'final materialized stage');
 rawGit.assertView();assertNativeObjectPrototypes();
 return {sourceEpoch:seal.sourceEpoch,coreCode:seal.coreCode,metadata:seal.metadata,reportQcc:seal.reportQcc,qualifierCode:seal.reportQcc,currentConsumerPinModule:{path:finalPinsPath,sha256:pin.digest},transitionReceipt:seal.transitionReceipt,seal:{path:finalSealPath,sha256:parsed.digest},head:headView.head};
}
