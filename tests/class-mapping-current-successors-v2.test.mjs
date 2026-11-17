// Real public successor graph and semantics; report metadata transport is isolated.
// Genuine Native2 source/core inputs remain read-only; no actual M/N claim.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createSemanticBackend,nativeSnapshot,assertNativeBodyUnchanged,sourceHandoffContext,readJson,readBytes,sha} from './helpers/native2-production-semantic-backend-v1.mjs';
const backend=createSemanticBackend();
const kernel=backend.evaluate('tools/class-mapping-current-monetary-question-kernel-v2.mjs');
const monetary=backend.evaluate('tools/class-mapping-current-monetary-questions-v2.mjs',{createCurrentNativeMonetaryQuestionSuccessor:kernel.createCurrentNativeMonetaryQuestionSuccessor});
const jo=backend.evaluate('tools/class-mapping-current-jo-gap-v2.mjs'),handoff=backend.evaluate('tools/class-mapping-current-source-handoff-v2.mjs'),ua=backend.evaluate('tools/class-mapping-current-ua26-marker-v2.mjs');
const actualExports={...monetary,...jo,...handoff,...ua},api=backend.evaluate('tools/class-mapping-current-successors-v2.mjs',actualExports);
const expected=['loadJoCurrentSuccessor','joCurrentNativeContractPath','loadSourceHandoffTransition','sourceHandoffContextMatches','isQualifiedSourceHistoricalChange','sourceHistoricalCaution','sourceHandoffTransitionReference','sourceHandoffTransitionPath','buildNextNativeSourceHandoffTransitionReceipt','loadCurrentMonetarySourceQuestions','validateCurrentMonetarySourceQuestionProjection','buildNextNativeMonetaryQuestionProof','auditUa26MarkerReceiptWithCurrentSourceEpoch'];
after(()=>assertNativeBodyUnchanged());

test('successor barrel re-exports the actual intended production functions without substitutes',()=>{
 assert.deepEqual(Object.keys(api).sort(),expected.sort());for(const name of expected)assert.equal(api[name],actualExports[name],name+' is the actual imported production export');
 assert.equal(backend.scope.genuineNative2Body,true);assert.equal(backend.scope.sourceMapCount,3063);assert.equal(backend.scope.metadataBackendIsolated,true);assert.equal(backend.scope.actualReportQualification,false);assert.equal(backend.scope.syntheticReportQcc,true);
});

test('monetary public exports preserve unresolved questions and explicit non-approval proof',()=>{
 const p=api.loadCurrentMonetarySourceQuestions();assert.equal(api.validateCurrentMonetarySourceQuestionProjection(p),true);
 assert.equal(p.sourceQuestions.length,9);assert.equal(p.records.length,8);assert.equal(p.semanticPass,false);assert.equal(p.generalSourceReviewPending,true);assert.equal(p.currentInputs.nativeSourceEpoch.sourceCommit,nativeSnapshot().summary.sourceCommit);
 const proof=api.buildNextNativeMonetaryQuestionProof({projection:p});assert.equal(proof.proofBoundary.questionTargetSemanticsPreserved,true);assert.equal(proof.proofBoundary.sourceValuesApproved,false);assert.equal(proof.proofBoundary.sourceScopeQuestionsResolved,false);
 const mutated=structuredClone(p);mutated.sourceQuestions[0].status='resolved';assert.throws(()=>api.validateCurrentMonetarySourceQuestionProjection(mutated),/projection does not equal/);
});

test('Jo and UA26 public exports retain null/unextracted state and all pending grades',()=>{
 const result=api.loadJoCurrentSuccessor();assert.equal(result.itemId,'ua-jo-stick');const row=nativeSnapshot().inputs.data.equipment.find(x=>x.id===result.itemId);assert.equal(row.price,null);assert.equal(row.priceState,'unextracted');assert.equal(result.sourceAbsence,false);assert.equal(result.sourcePriceAbsenceReviewed,false);assert.equal(result.extractedPriceReviewed,false);assert.equal(result.valueReviewed,false);assert.equal(result.unitProvenance,'unassessable');
 assert.deepEqual(result.currentSourceRefs.map(x=>x.path).sort(),['dist/data.json','equipment.json','research/field-evidence-bindings.json','research/mechanics-audit-progress.json','research/price-source-inventory.json'].sort());
 const historyPaths=new Set(result.historicalEvidenceRefs.map(x=>x.path));for(const ref of result.currentSourceRefs){assert.equal(historyPaths.has(ref.path),false);assert.equal(sha(readBytes(ref.path)),ref.sha256);assert.equal(ref.sha256,nativeSnapshot().inputHashes.sourceBody[ref.path]);}
 for(const ref of [...result.historicalEvidenceRefs,...result.currentSourceRefs,...result.contractLineageRefs]){assert.equal(sha(readBytes(ref.path)),ref.sha256);assert.deepEqual(result.inputRefs.find(x=>x.path===ref.path),ref);}
 assert.equal(new Set(result.inputRefs.map(x=>x.path)).size,result.inputRefs.length);assert.deepEqual(result.currentSourceEpoch,{sourceCommit:nativeSnapshot().summary.sourceCommit,sourceTree:nativeSnapshot().summary.sourceTree,fixture:nativeSnapshot().summary.fixture});
 const marker=api.auditUa26MarkerReceiptWithCurrentSourceEpoch();assert.equal(marker.ok,true);assert.equal(marker.semanticPass,false);assert.equal(marker.sourceValueGrade,'NOT PROMOTED');assert.equal(marker.contextualAdequacy,'NOT ASSESSED');assert.equal(marker.defaultSelectionReview,'NOT PROMOTED');
 assert.equal(marker.currentEpoch.sourceCommit,nativeSnapshot().summary.sourceCommit);assert.deepEqual(marker.currentEpoch.fixture,nativeSnapshot().summary.fixture);
 const contract=readJson('research/class-mapping-current-adapters-v2/ua26-marker-current-contract-v2.json');assert.deepEqual(marker.counts,contract.expectedCounts);assert.equal(marker.currentEpoch.catalogTransitions.length,3);
});

test('public handoff exports generate and validate real receipt semantics with private identity and pending grades',()=>{
 const built=api.buildNextNativeSourceHandoffTransitionReceipt();backend.setReceipt(built.bytes);
 assert.equal(built.path,api.sourceHandoffTransitionPath);assert.equal(built.semanticPass,false);assert.equal(built.currentSourceValueGrade,'NOT PROMOTED');assert.equal(built.contextualAdequacy,'NOT ASSESSED');
 assert.equal(built.receipt.provenance.qualifierCodeCommit,backend.stage.reportQcc.commit);assert.equal(built.receipt.provenance.receiptSha256,null);assert.equal(built.receipt.qualifiedTarget.currentMechanicsField.status,'unchecked');assert.equal(built.receipt.qualifiedTarget.currentMechanicsField.inspected,false);
 const context=sourceHandoffContext(),receipt=api.loadSourceHandoffTransition(context);assert.equal(api.sourceHandoffContextMatches(receipt,context),true);assert.deepEqual(api.sourceHandoffTransitionReference(receipt),{path:built.path,sha256:built.sha256});
 assert.equal(api.isQualifiedSourceHistoricalChange(receipt,receipt.originalConflictReceipt.change),true);
 const caution=api.sourceHistoricalCaution(receipt,receipt.curatedHistoricalCaution.note,receipt.curatedHistoricalCaution.baselineIndex);assert.ok(caution);assert.equal(caution.currentFieldStatus,'unchecked');assert.equal(caution.sourceValueGrade,'NOT PROMOTED');
 const cloned=structuredClone(receipt);assert.equal(api.sourceHandoffContextMatches(cloned,context),false);assert.throws(()=>api.sourceHandoffTransitionReference(cloned),/unchanged, validated/);
 const changed=structuredClone(context.currentData);changed.spells.find(x=>x.id==='ua-druid-ceremony').exceptions[0]+=' changed';assert.equal(api.sourceHandoffContextMatches(receipt,{...context,currentData:changed}),false);
});

test('public successor exports preserve zero-argument boundaries and reject unqualified receipts',()=>{
 for(const fn of [api.loadCurrentMonetarySourceQuestions,api.loadJoCurrentSuccessor,api.auditUa26MarkerReceiptWithCurrentSourceEpoch,api.buildNextNativeSourceHandoffTransitionReceipt])assert.throws(()=>fn({repoRoot:'/caller',sourceCommit:'caller'}),/accepts no caller|no caller|no arguments/);
 assert.throws(()=>api.loadSourceHandoffTransition(),/exactly one/);assert.throws(()=>api.sourceHandoffTransitionReference({}),/unchanged, validated/);assert.equal(api.sourceHistoricalCaution({},'invented',0),null);assert.equal(api.isQualifiedSourceHistoricalChange({},{}),false);
});
