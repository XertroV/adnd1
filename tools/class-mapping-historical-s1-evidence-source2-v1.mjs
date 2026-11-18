// Authenticated fixed historical S1 evidence; actual current Source2 stays separate.
import {createHash} from 'node:crypto';
import {readFileSync as physicalRead,lstatSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {isDeepStrictEqual,types} from 'node:util';
import {createRawGitReader,verifyRawCommit} from './class-mapping-raw-git-v1.mjs';
import {assertClassMappingCurrentSourceIdentity} from './class-mapping-current-source-gate-v2.mjs';
import {absoluteInput,relativeInside,encodingOption} from '../research/class-mapping-history-v1/mm-replay-io-contract-v1.mjs';
const ROOT=realpathSync(resolve(import.meta.dirname,'..')),raw=createRawGitReader(ROOT);
const S1='2d35138027f00c0740975e519dbb3a2b6df76d14',S1TREE='40ecb15130b339658522794db6d9e1bc58f43b50',A29='a29d72d5147c497addd9e46f54ea3f8222f6e9c2';
const QCC='46ce96934ac460063d9c32d1aca513d292b30735',QCCTREE='d0556f35513b23b231423ed193386ee63ed517e3';
const O='0e4cddd40b6ab78a9fe182fa967f0bd43b36070d',OTREE='53b3cbe61d77ba16f460fc398f02fb133a3dd899',OPARENT='180e04a37a5fa7f569f915452340f4a49a52570e';
const RECEIPT='research/class-mapping-source-epoch-v1/metadata-stage-v2.json',RECEIPTSHA='86c7749246498f8d53cc7935151cf23569167c6d913f1a77be3c5c1beea4b189';
const FIXTURE='research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json',FIXTURESHA='c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10';
const MAPSHA='2843ed5f0e11e3b2c639748e4b693bc8854bc6660b2817a7254555ca67596e08',FINALPINS='research/class-mapping-current-adapters-v1/current-consumer-pins-v1.mjs';
const FIXED_METADATA=[
 {path:RECEIPT,sha256:RECEIPTSHA,sizeBytes:1244236},
 {path:FIXTURE,sha256:FIXTURESHA,sizeBytes:2087176},
 {path:FINALPINS,sha256:'396ce633bbef29e90b3393c5c8bb3e44f304f0da27de1c37ce3e9b4e38229888',sizeBytes:5026},
 {path:'research/class-mapping-current-adapters-v1/current-consumer-code-stage-seal-v1.json',sha256:'2037d7007fece6459dea156b690dc2f116fcf1cb02fba5613eefae3dec1d150e',sizeBytes:1071}
];
const LEGACY_MM=[
 {path:'research/current-source-raster-snapshot.json',sha256:'f3298a5707ec7be99145d66b5f91047a5fccfc8f8dc9db012e961111577e50b9',sizeBytes:397},
 {path:'research/source-visual-audit-mm-treasure-mm74-fixed-v2.json',sha256:'ecb57b3a2c4cb75dea42cb3e78eedf59e9d44032b9c37408246bf033224e33ec',sizeBytes:9480362}
];
const sha=b=>createHash('sha256').update(b).digest('hex'),fail=m=>{throw new Error('Authenticated historical S1 evidence: '+m);},check=(ok,m)=>{if(!ok)fail(m);};
let cache=null;
function safePath(p){check(typeof p==='string'&&p&&!p.startsWith('/')&&!p.includes('\\')&&!/[:\x00-\x1f\x7f]/.test(p)&&p.split('/').every(z=>z&&z!=='.'&&z!=='..'&&!z.startsWith('-')),'finite safe path');return p;}
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
function currentIdentity(){const p=assertClassMappingCurrentSourceIdentity(),s=p?.summary;check(s?.stage==='source2-body-native'&&s.sourceCommit==='400f6e9d123d8a654b9b9af48133a2533506e73d'&&s.sourceTree==='664c02504efcece25669d2f9c3fdb26437cd5b09','separate actual Source2 proof');check(!Object.hasOwn(s,'currentS1Summary')&&!Object.hasOwn(s,'s1SourceCommit'),'no S1 relabeling');return freeze(structuredClone(s));}
function blob(commit,row){safePath(row.path);check(/^[a-f0-9]{64}$/.test(row.sha256||'')&&Number.isSafeInteger(row.sizeBytes)&&row.sizeBytes>=0,'exact row SHA/size');const b=raw.git('show',commit+':'+row.path);check(b.length===row.sizeBytes&&sha(b)===row.sha256,'immutable blob '+commit+':'+row.path);return b;}
function physicalMetadata(row){const p=resolve(ROOT,row.path),st=lstatSync(p);check(st.isFile()&&!st.isSymbolicLink()&&realpathSync(p)===p,'regular protected metadata '+row.path);const b=physicalRead(p);check(b.length===row.sizeBytes&&sha(b)===row.sha256,'protected metadata changed '+row.path);}
function historicalCache(){
 raw.assertView();for(const r of FIXED_METADATA)physicalMetadata(r);if(cache!==null)return cache;
 verifyRawCommit(raw.git('cat-file','commit',S1),S1,S1TREE,A29);verifyRawCommit(raw.git('cat-file','commit',QCC),QCC,QCCTREE,S1);verifyRawCommit(raw.git('cat-file','commit',O),O,OTREE,OPARENT);
 raw.git('merge-base','--is-ancestor',QCC,O);raw.git('merge-base','--is-ancestor',O,'HEAD');
 const receipt=JSON.parse(blob(O,FIXED_METADATA[0])),fixture=JSON.parse(blob(O,FIXED_METADATA[1]));
 check(receipt.sourceEpoch?.sourceBody?.commit===S1&&receipt.sourceEpoch.sourceBody.tree===S1TREE&&receipt.qualifierProducer?.commit===QCC&&receipt.qualifierProducer.tree===QCCTREE,'fixed historical receipt identities');
 check(fixture.stage==='s1-body-native'&&fixture.sourceEpoch?.sourceCommit===S1&&fixture.sourceEpoch.sourceTree===S1TREE,'actual historical fixture');
 const source=receipt.sourceEpoch.sourceBody.inputs;check(Array.isArray(source)&&source.length===2636&&Array.isArray(fixture.sourceInputs)&&fixture.sourceInputs.length===2636,'exact2636 source rows');
 const sourceMap=Object.fromEntries(source.map(r=>[safePath(r.path),r.sha256]).sort(([a],[b])=>a<b?-1:a>b?1:0));check(Object.keys(sourceMap).length===2636&&sha(Buffer.from(JSON.stringify(sourceMap)))===MAPSHA,'complete2636map');
 const fixtureMap=new Map(fixture.sourceInputs.map(r=>[r.path,r]));check(fixtureMap.size===2636,'unique native fixture paths');
 const rows=new Map();
 const add=(commit,row,role)=>{const p=safePath(row.path),old=rows.get(p);if(old){check(old.sha256===row.sha256&&old.sizeBytes===row.sizeBytes,'conflicting historical role '+p);old.roles.push(role);}else rows.set(p,{commit,path:p,sha256:row.sha256,sizeBytes:row.sizeBytes,roles:[role]});};
 for(const r of source){const f=fixtureMap.get(r.path);check(f&&f.sha256===r.sha256&&f.sizeBytes===r.sizeBytes&&r.gitBlobSha256===r.sha256&&r.physicalSha256===r.sha256,'receipt/nativefixture agreement '+r.path);blob(S1,r);add(S1,r,'historical-S1-source-body');}
 const qp=receipt.qualifierProducer,tables={codeClosure:67,staticAdapterData:123,reportDataPointers:265,optionalReportData:12,nativeQualificationMetadata:2};
 for(const[name,count]of Object.entries(tables)){check(Array.isArray(qp[name])&&qp[name].length===count,'fixed QCC table '+name);for(const r of qp[name]){
  if(name==='optionalReportData'&&r.present===false){try{raw.git('cat-file','-e',QCC+':'+safePath(r.path));fail('optional path unexpectedly present');}catch(e){if(String(e?.message||'').includes('unexpectedly present')||!Number.isInteger(e.status)||e.status===0)throw e;}continue;}
  blob(QCC,r);add(QCC,r,'historical-QCC-'+name);
 }}
 check(Array.isArray(receipt.outputs)&&receipt.outputs.length===26,'exact26 O outputs');const outputPaths=new Set();
 for(const r of receipt.outputs){const pin={path:r.path,sha256:r.rawSha256,sizeBytes:r.sizeBytes};check(!outputPaths.has(pin.path)&&pin.path!==RECEIPT&&!Object.hasOwn(sourceMap,pin.path),'unique noncyclic output');outputPaths.add(pin.path);blob(O,pin);add(O,pin,'historical-O-report-output');}
 for(const r of FIXED_METADATA){blob(O,r);add(O,r,'fixed-historical-metadata');}
 const consumer=receipt.currentConsumer;check(consumer?.qualifierCode?.commit===QCC&&consumer.qualifierCode.tree===QCCTREE&&consumer.qualifierCode.parent===S1,'consumer QCC identity');
 for(const field of ['codeStageSeal','materializedSeal','currentConsumerPinModule','codeStagePinModule','materializedPinModule','transitionReceipt']){const ref=consumer[field];check(ref&&typeof ref.path==='string'&&/^[a-f0-9]{64}$/.test(ref.sha256||''),'fixed consumer reference '+field);const b=raw.git('show',O+':'+safePath(ref.path));check(sha(b)===ref.sha256,'consumer seal/pin raw O '+field);add(O,{path:ref.path,sha256:ref.sha256,sizeBytes:b.length},'historical-consumer-'+field);}
 const text=blob(O,FIXED_METADATA[2]).toString('utf8'),prefix='export const currentConsumerPins = freezeTree(',start=text.indexOf(prefix);check(start>=0&&text.trimEnd().endsWith(');'),'immutable final pins literal');
 const pins=JSON.parse(text.slice(start+prefix.length,text.lastIndexOf(');')));
 check(pins.sourceEpoch?.sourceCommit===S1&&pins.sourceEpoch.sourceTree===S1TREE&&pins.qualifierCodeCommit===QCC&&pins.qualifierCodeTree===QCCTREE&&pins.qualifierCodeParent===S1,'actual historical runtime pins');
 check(Object.keys(pins.codePins||{}).length===19&&Object.keys(pins.contractPins||{}).length===6&&Object.keys(pins.receiptPins||{}).length===1,'exact19runtime/6contracts/1transition sets');
 for(const[p,digest]of Object.entries(pins.sourceBodyInputHashes||{}))check(sourceMap[p]===digest,'runtime primary source '+p);
 for(const[name,commit]of [['codePins',QCC],['contractPins',QCC],['receiptPins',O]])for(const[p,digest]of Object.entries(pins[name])){const b=raw.git('show',commit+':'+safePath(p));check(sha(b)===digest,'historical runtime '+name+' '+p);add(commit,{path:p,sha256:digest,sizeBytes:b.length},'historical-runtime-'+name);}
 check(sha(raw.git('show',QCC+':'+FINALPINS))==='53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385','exact unmaterialized QCC stub');
 for(const r of LEGACY_MM){const a=blob(A29,r),b=blob(O,r);check(a.equals(b),'separate legacyMM A29/O bytes');add(A29,r,'legacy-MM-comparison-only');}
 raw.assertView();const historicalS1Identity=freeze({stage:'authenticated-historical-s1-receipt-and-runtime',sourceCommit:S1,sourceTree:S1TREE,qualifierCodeCommit:QCC,qualifierCodeTree:QCCTREE,outputCommit:O,outputTree:OTREE,fixture:{path:FIXTURE,sha256:FIXTURESHA},receipt:{path:RECEIPT,sha256:RECEIPTSHA},sourceBodyFileCount:2636,sourceBodyMapSha256:MAPSHA});
 cache={receipt:freeze(receipt),sourceMap:freeze(sourceMap),rows,historicalS1Identity};return cache;
}
function publicEvidence(args){check(args.length===0,'no caller root/hash/fixture/snapshot/receipt overrides');const before=currentIdentity(),historical=historicalCache(),after=currentIdentity();check(isDeepStrictEqual(before,after),'Source2 changed during historical authentication');return{historical,currentSource2Identity:after};}
export function readAuthenticatedHistoricalS1ReportEvidenceSource2(...args){const{historical,currentSource2Identity}=publicEvidence(args);return freeze({historicalS1Receipt:structuredClone(historical.receipt),historicalS1Identity:structuredClone(historical.historicalS1Identity),currentSource2Identity});}
export function readAuthenticatedHistoricalS1ConsumerStageSource2(...args){const{historical,currentSource2Identity}=publicEvidence(args);return freeze({historicalS1Identity:structuredClone(historical.historicalS1Identity),inputHashes:{sourceBody:{...historical.sourceMap}},currentSource2Identity});}
let activeReadScope=false;
const scopeFunctionPrototype=Function.prototype,scopeFunctionSource=Function.prototype.toString;
const scopeApply=Reflect.apply,scopeGetPrototypeOf=Object.getPrototypeOf;
const scopeStringIncludes=String.prototype.includes,scopeStringSlice=String.prototype.slice;
const scopeIsProxy=types.isProxy,scopeIsAsyncFunction=types.isAsyncFunction,scopeIsGeneratorFunction=types.isGeneratorFunction;
function readExactHistoricalS1(p,encoding){
 const row=cache.rows.get(p);check(!!row,'path outside finite authenticated historical roles: '+p);
 raw.assertView();const b=blob(row.commit,row);
 return encoding&&encoding!=='buffer'?b.toString(encoding):Buffer.from(b);
}
export function readHistoricalS1FileSync(input,options){
 const encoding=encodingOption(options),absolute=absoluteInput(input),p=relativeInside(ROOT,absolute);
 check(p!==null,'historical read outside fixed physical root');
 if(activeReadScope)return readExactHistoricalS1(p,encoding);
 const before=currentIdentity();historicalCache();
 const result=readExactHistoricalS1(p,encoding);
 historicalCache();const after=currentIdentity();
 check(isDeepStrictEqual(before,after),'Source2 changed during historical direct read');
 return result;
}
export function runWithAuthenticatedHistoricalS1ReadsSource2(...args){
 check(args.length===1,'historical read scope requires exactly one synchronous callback');
 const callback=args[0];
 check(typeof callback==='function'&&!scopeIsProxy(callback),'historical read scope requires a non-proxy ordinary synchronous callback');
 check(scopeGetPrototypeOf(callback)===scopeFunctionPrototype&&!scopeIsAsyncFunction(callback)&&!scopeIsGeneratorFunction(callback),'historical read scope forbids nonplain, async and generator callbacks');
 const source=scopeApply(scopeFunctionSource,callback,[]);
 check(!scopeApply(scopeStringIncludes,source,['[native code]'])&&scopeApply(scopeStringSlice,source,[0,5])!=='class','historical read scope forbids native, bound and class callbacks');
 check(!activeReadScope,'nested historical read scopes are forbidden');
 const before=currentIdentity();historicalCache();activeReadScope=true;
 try{
  const result=scopeApply(callback,undefined,[]);
  check(result===undefined,'historical read scope callback must synchronously return undefined');
  historicalCache();const after=currentIdentity();
  check(isDeepStrictEqual(before,after),'Source2 changed during authenticated historical read scope');
  return undefined;
 }finally{activeReadScope=false;}
}
