// Real Native2 monetary semantics; report-stage metadata transport alone is isolated.
// These controls do not assert actual M/N qualification.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createSemanticBackend,nativeSnapshot,assertNativeBodyUnchanged,readBytes,readJson,sha} from './helpers/native2-production-semantic-backend-v1.mjs';
const backend=createSemanticBackend();
const kernel=backend.evaluate('tools/class-mapping-current-monetary-question-kernel-v2.mjs');
const api=backend.evaluate('tools/class-mapping-current-monetary-questions-v2.mjs',{createCurrentNativeMonetaryQuestionSuccessor:kernel.createCurrentNativeMonetaryQuestionSuccessor});
const registryPath=kernel.currentSourceQuestionRegistryPath,registry=readJson(registryPath);
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const objectHash=v=>sha(Buffer.from(canonical(v)));
const pointer=(v,p)=>p.split('/').slice(1).reduce((n,k)=>n?.[k.replaceAll('~1','/').replaceAll('~0','~')],v);
const expectedIds=[...registry.historicalBoundary.unresolvedInterpretationQuestionIds,...registry.scopeBoundary.questions.map(x=>x.id)];
let projection;
function current(){return projection??=api.loadCurrentMonetarySourceQuestions();}
after(()=>assertNativeBodyUnchanged());

test('actual monetary producer retains all unresolved identities and full Native2 epoch',()=>{
 const p=current(),native=nativeSnapshot();
 assert.equal(backend.scope.metadataBackendIsolated,true);assert.equal(backend.scope.actualReportQualification,false);assert.equal(backend.scope.sourceMapCount,3063);
 assert.equal(p.currentInputs.nativeSourceEpoch.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(p.currentInputs.nativeSourceEpoch.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
 assert.deepEqual(p.currentInputs.nativeSourceEpoch.cohortContract,native.summary.fixture);
 assert.deepEqual(p.currentInputs.nativeSourceEpoch.sourceRawInputs,native.inputHashes.sourceBody);
 assert.equal(Object.hasOwn(native.summary,'parentCommit'),false);
 assert.deepEqual(p.questionCounts,{currentInterpretationQuestions:7,independentSourceScopeQuestions:2,distinctScopeRows:9,currentUnresolvedQuestions:9});
 assert.deepEqual(p.sourceQuestions.map(q=>q.id),expectedIds);assert.equal(p.semanticPass,false);assert.equal(p.generalSourceReviewPending,true);
 for(const q of p.sourceQuestions){assert.equal(q.status,'unresolved');assert.equal(q.semanticPass,false);}
 assert.equal(api.validateCurrentMonetarySourceQuestionProjection(p),true);
});

test('interpretation and scope questions resolve to exact real producer rows and source provenance',()=>{
 const p=current(),refs=p.currentInputs.rowAudit.currentTargetRefs;
 assert.equal(refs.length,17);assert.equal(new Set(refs.map(x=>x.uid)).size,17);
 for(const ref of refs){
  const bytes=readBytes(ref.path),raw=pointer(JSON.parse(bytes),ref.pointer),expected=registry.targetSemanticContract.targets.find(x=>x.uid===ref.uid);
  assert.ok(expected,ref.uid);assert.equal(sha(bytes),ref.sha256);assert.equal(objectHash(raw),ref.recordSha256);
  assert.equal(objectHash({source:ref.sourceProvenance,identity:ref.identity}),ref.rowIdentitySha256);
  assert.equal(ref.path,expected.inputPath);assert.equal(ref.pointer,expected.pointer);assert.deepEqual(ref.sourceProvenance,expected.sourceProvenance);assert.deepEqual(ref.identity,expected.identity);assert.equal(ref.semanticSha256,expected.semanticSha256);
 }
 for(const q of p.sourceQuestions.slice(0,7)){
  assert.equal(q.currentDisposition,'unresolved-source-question');assert.equal(Object.hasOwn(q,'currentTargetRefs'),false);
  const ref=refs.find(x=>x.uid===q.uid);assert.deepEqual(q.currentTargetRef,ref);assert.equal(q.currentRecordSha256,ref.recordSha256);assert.equal(q.currentRowIdentitySha256,ref.rowIdentitySha256);
 }
 for(const q of p.sourceQuestions.slice(7)){
  const scope=registry.scopeBoundary.questions.find(x=>x.id===q.id);assert.equal(Object.hasOwn(q,'currentTargetRef'),false);assert.equal(Object.hasOwn(q,'currentDisposition'),false);
  assert.deepEqual(q.currentTargetRefs.map(x=>x.uid),scope.uids);assert.deepEqual(q.affectedAuditRows.map(x=>x.uid),scope.uids);
  for(const ref of q.currentTargetRefs)assert.deepEqual(ref,refs.find(x=>x.uid===ref.uid));
 }
 assert.deepEqual(p.sourceQuestions.slice(7).map(q=>q.affectedAuditRows.length),[8,1]);
});

test('Mammoth remains a bounded derived range without printed-value or general-semantic approval',()=>{
 const p=current(),row=p.records.find(x=>x.id==='relative-monetary-reading-mm-mammoth-tusks-relative');assert.ok(row);
 assert.equal(p.records.length,8);assert.equal(p.records.filter(x=>x.currentDisposition==='unresolved-source-question').length,7);
 const d=row.derivedValue;
 assert.deepEqual([d.kind,d.minimumAmount,d.maximumAmount,d.currency,d.unit,d.isSourcePrinted,d.printedAsRange,d.derivation.factor,d.derivationStatus],['range',150,900,'gp','per tusk',false,false,1.5,'source-backed-derived-interpretation']);
 assert.equal(row.semanticPass,false);assert.equal(row.printedValuePass,false);
 assert.equal(row.currentTargetRef.path,'research/price-source-inventory-monster-books.json');assert.equal(row.currentTargetRef.pointer,'/claims/18');
 assert.equal(readJson(row.currentTargetRef.path).claims[18].valuationDerivation.factor,1.5);
});

test('real public APIs reject caller roots, gates, counts and extra arguments',()=>{
 for(const value of [undefined,{}, {repoRoot:'/untrusted'}, {assertSourceEpoch:()=>backend.stage}]){
  assert.throws(()=>kernel.createCurrentNativeMonetaryQuestionSuccessor(value),/accepts no caller overrides/);
  assert.throws(()=>api.loadCurrentMonetarySourceQuestions(value),/accepts no caller overrides/);
 }
 assert.throws(()=>api.validateCurrentMonetarySourceQuestionProjection(),/exactly one projection/);
 assert.throws(()=>api.validateCurrentMonetarySourceQuestionProjection(current(),{}),/exactly one projection/);
 assert.throws(()=>api.buildNextNativeMonetaryQuestionProof(),/requires one freshly built/);
});

test('real validator rejects promotions, target swaps, stale row hashes and epoch substitution',()=>{
 const controls=[['semantic pass',p=>p.semanticPass=true],['review dismissal',p=>p.generalSourceReviewPending=false],['question resolution',p=>p.sourceQuestions[0].status='resolved'],['count laundering',p=>p.questionCounts.currentUnresolvedQuestions=8],['target pointer',p=>p.sourceQuestions[0].currentTargetRef.pointer='/records/0'],['record digest',p=>p.sourceQuestions[0].currentRecordSha256='0'.repeat(64)],['scope row membership',p=>p.sourceQuestions[7].currentTargetRefs.reverse()],['printed valuation promotion',p=>p.records.find(x=>x.derivedValue).printedValuePass=true],['fixture substitution',p=>p.currentInputs.nativeSourceEpoch.cohortContract.sha256='0'.repeat(64)]];
 for(const[label,mutate]of controls){const p=structuredClone(current());mutate(p);assert.throws(()=>api.validateCurrentMonetarySourceQuestionProjection(p),/projection does not equal/,label);}
});

test('caller getters, proxies, cycles and toJSON cannot execute through semantic validation',()=>{
 let calls=0;const accessor=structuredClone(current());Object.defineProperty(accessor,'semanticPass',{enumerable:true,get(){calls++;return false;}});
 assert.throws(()=>api.validateCurrentMonetarySourceQuestionProjection(accessor),/inert ordinary JSON/);assert.equal(calls,0);
 const proxy=new Proxy(current(),{get(){calls++;throw Error('proxy executed');}});assert.throws(()=>api.validateCurrentMonetarySourceQuestionProjection(proxy),/inert ordinary JSON/);assert.equal(calls,0);
 const cycle=structuredClone(current());cycle.loop=cycle;assert.throws(()=>api.validateCurrentMonetarySourceQuestionProjection(cycle),/inert ordinary JSON/);
 const toJSON=structuredClone(current());toJSON.toJSON=()=>{calls++;return current();};assert.throws(()=>api.validateCurrentMonetarySourceQuestionProjection(toJSON),/inert ordinary JSON/);assert.equal(calls,0);
});

test('migration proof binds exact targets and keeps every value/scope approval limitation explicit',()=>{
 const p=current(),proof=api.buildNextNativeMonetaryQuestionProof({projection:p});
 assert.equal(proof.sourceInputCommit,p.currentInputs.nativeSourceEpoch.sourceCommit);assert.equal(proof.sourceInputTree,p.currentInputs.nativeSourceEpoch.sourceTree);
 assert.deepEqual(proof.successorRegistry,p.registry);assert.deepEqual(proof.currentTargetRefs,p.currentInputs.rowAudit.currentTargetRefs);
 assert.deepEqual(proof.targetSemanticSha256,registry.targetSemanticContract.targets.map(x=>({uid:x.uid,sha256:x.semanticSha256})));
 assert.deepEqual(proof.proofBoundary,{questionTargetSemanticsPreserved:true,wholeInventorySemanticsCertified:false,sourceValuesApproved:false,sourceScopeQuestionsResolved:false,sourceQuestionTargetChangesAllowed:false});
 assert.equal(proof.dispositions.semanticPass,false);assert.equal(proof.dispositions.generalSourceReviewPending,true);
 const changed=structuredClone(p);changed.sourceQuestions.pop();assert.throws(()=>api.buildNextNativeMonetaryQuestionProof({projection:changed}),/freshly validated/);
});
