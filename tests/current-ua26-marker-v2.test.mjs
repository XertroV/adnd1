// Real production UA26 semantics with only unavailable M/N metadata isolated.
// This suite does not claim a native report-consumer qualification.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createSemanticBackend,nativeSnapshot,historicalMmCheckpoint,assertNativeBodyUnchanged,readBytes,readJson,sha} from './helpers/native2-production-semantic-backend-v1.mjs';
const modulePath='tools/class-mapping-current-ua26-marker-v2.mjs',contractPath='research/class-mapping-current-adapters-v2/ua26-marker-current-contract-v2.json';
const contract=readJson(contractPath);
after(()=>assertNativeBodyUnchanged());
test('the actual UA26 adapter keeps marker semantics, exact current catalogs and every grade boundary', {timeout:600_000},()=>{
 const backend=createSemanticBackend(),api=backend.evaluate(modulePath),report=api.auditUa26MarkerReceiptWithCurrentSourceEpoch(),source=nativeSnapshot();
 assert.equal(backend.scope.metadataBackendIsolated,true);assert.equal(backend.scope.actualReportQualification,false);assert.equal(backend.scope.sourceMapCount,3063);
 assert.equal(report.ok,true);assert.equal(report.semanticPass,false);assert.deepEqual(report.counts,{physicalRows:68,marked:17,unmarked:51,aliases:66});
 assert.equal(report.receiptPath,contract.legacyMarkerReceipt.path);assert.equal(report.sourceMarkerCensusSha256,readJson(report.receiptPath).sourceMarkerCensusSha256);
 assert.equal(report.sourceValueGrade,'NOT PROMOTED');assert.equal(report.contextualAdequacy,'NOT ASSESSED');assert.equal(report.defaultSelectionReview,'NOT PROMOTED');
 assert.equal(report.currentEpoch.sourceCommit,source.summary.sourceCommit);assert.equal(report.currentEpoch.sourceTree,source.summary.sourceTree);assert.deepEqual(report.currentEpoch.fixture,source.summary.fixture);
 assert.equal(report.currentEpoch.currentData.sha256,sha(readBytes('dist/data.json')));assert.equal(report.currentEpoch.currentData.sha256,source.inputHashes.sourceBody['dist/data.json']);
 assert.equal(report.currentEpoch.catalogTransitions.length,3);assert.deepEqual(report.currentEpoch.catalogTransitions.map(({path,sha256})=>({path,sha256})),contract.currentS1Catalogs.map(({path,sha256})=>({path,sha256})));
 for(const ref of report.currentEpoch.catalogTransitions){assert.equal(sha(readBytes(ref.path)),ref.sha256);assert.equal(ref.sha256,source.inputHashes.sourceBody[ref.path]);}
 assert.deepEqual(report.historicalTransitionRegistry,contract.historicalHTransition.registry);assert.equal(report.historicalTransitionStatus,readJson(contract.historicalHTransition.registry.path).status);
});
test('the complete historical MM checkpoint stays distinct from the genuine Source2 body', {timeout:600_000},()=>{
 const source=nativeSnapshot(),historical=historicalMmCheckpoint(),report=createSemanticBackend().evaluate(modulePath).auditUa26MarkerReceiptWithCurrentSourceEpoch();
 assert.equal(source.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');assert.equal(source.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');assert.equal(source.summary.owners,1070);
 assert.equal(historical.summary.sourceCommit,'0f2d70a135e3ad486152bf00f21387d60a1a97ef');assert.equal(historical.summary.sourceTree,'08010faf457df22cdb0a5ec35d2dcf79e622ade9');assert.equal(historical.summary.owners,1064);assert.equal(historical.summary.addedCanonicalBindings,76);assert.equal(historical.summary.addedManualBindings,42);
 assert.equal(historical.data.sha256,'2ab84cfe5e4234e5d0303b2062f941f7d8e1b93d798a7402c16e78d6d2e4672c');assert.notEqual(historical.data.sha256,report.currentEpoch.currentData.sha256);assert.deepEqual(historical.currentNative2Summary,source.summary);
});
test('the real UA26 public API rejects root/receipt overrides before touching caller getters',()=>{
 const api=createSemanticBackend().evaluate(modulePath);let getters=0;const options={get repoRoot(){getters++;throw Error('getter');}};
 for(const args of [[options],[undefined],['some-receipt.json']])assert.throws(()=>api.auditUa26MarkerReceiptWithCurrentSourceEpoch(...args),/no caller root\/receipt overrides/);assert.equal(getters,0);
});
test('the real UA26 adapter rejects rebound catalogs, changed historical evidence and promoted grades',()=>{
 const edits=[['unmaterialized',c=>c.materialized=false],['stale source',c=>c.nativeSourceEpochBinding.sourceCommit='6502b19620e092ced9f3e233f2dc3d5ffc8bd3ec'],['wrong fixture',c=>c.nativeSourceEpochBinding.fixtureSha256='0'.repeat(64)],['semantic grade',c=>c.gradeBoundary.semanticPass=true],['value grade',c=>c.gradeBoundary.sourceValueGrade='APPROVED'],['context grade',c=>c.gradeBoundary.contextualAdequacy='ASSESSED'],['default grade',c=>c.gradeBoundary.defaultSelectionReview='PROMOTED'],['historical census',c=>c.expectedCounts.marked++],['legacy receipt',c=>c.legacyMarkerReceipt.sha256='0'.repeat(64)],['catalog digest',c=>c.currentS1Catalogs[0].sha256='0'.repeat(64)],['catalog omission',c=>c.currentS1Catalogs.pop()],['catalog substitution',c=>c.currentS1Catalogs[0].path='research/unadmitted-catalog.json']];
 for(const[label,edit]of edits){const changed=structuredClone(contract);edit(changed);const backend=createSemanticBackend({contractOverrides:new Map([[contractPath,Buffer.from(JSON.stringify(changed))]])}),api=backend.evaluate(modulePath);assert.throws(()=>api.auditUa26MarkerReceiptWithCurrentSourceEpoch(),/closed Source2 marker contract|three current S1 catalog pins|binding paths|catalog pin differs|frozen H/,label);}
});
