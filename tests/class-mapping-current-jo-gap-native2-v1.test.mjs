// Executes the actual Native2 Jo adapter; only unavailable M/N metadata is
// isolated. This is not a report-consumer or source-value approval.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import * as registry from '../tools/class-mapping-report-input-contract-v3.mjs';
import * as historicalRegistry from '../tools/class-mapping-report-input-contract-v2.mjs';
import {createSemanticBackend,nativeSnapshot,assertNativeBodyUnchanged,readBytes,readJson,sha} from './helpers/native2-production-semantic-backend-v1.mjs';
const modulePath='tools/class-mapping-current-jo-gap-v2.mjs',contractPath='research/class-mapping-current-adapters-v2/jo-current-source-gap-contract-v3.json',contract=readJson(contractPath);
after(()=>assertNativeBodyUnchanged());
test('actual Jo successor preserves historical witnesses, current row identity and null/unextracted grades', {timeout:600_000},()=>{
 const backend=createSemanticBackend(),api=backend.evaluate(modulePath),result=api.loadJoCurrentSuccessor(),source=nativeSnapshot();
 assert.equal(backend.scope.actualReportQualification,false);assert.equal(backend.scope.sourceMapCount,3063);assert.equal(api.joCurrentNativeContractPath,contractPath);
 assert.deepEqual(contract.historicalEvidence,readJson(contract.semanticParent.path).historicalEvidence);assert.deepEqual(contract.historicalEvidence,readJson(contract.predecessor.path).historicalEvidence);
 assert.deepEqual(contract.semanticParent,{path:'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json',sha256:'81418abaf817005269f87bf000509b04133f3701cd5a4188830119a5a377989b'});
 assert.deepEqual(contract.predecessor,{path:'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json',sha256:'9fd26ebccaa5211bdcac50e33ed2f4debc160b93aa0c4bee41d0603058915fdf'});
 assert.equal(Object.hasOwn(contract.nativeSourceEpochBinding,'qualifierCodeCommit'),false);assert.equal(result.itemId,'ua-jo-stick');assert.equal(result.sourceAbsence,false);assert.equal(result.valueReviewed,false);assert.equal(result.sourcePriceAbsenceReviewed,false);assert.equal(result.extractedPriceReviewed,false);assert.equal(result.unitProvenance,'unassessable');assert.equal(result.semanticPass,false);
 assert.deepEqual(result.currentSourceRefs,contract.currentEvidence.sourceBodyRefs);for(const ref of result.currentSourceRefs){assert.equal(ref.sha256,source.inputHashes.sourceBody[ref.path]);assert.equal(sha(readBytes(ref.path)),ref.sha256);}
 assert.equal(result.historicalWitness.uncompressedSha256,'9c831f319a8d58bd3c943c610a89326975f622015b760073217ecf0f7b55e6f7');assert.equal(sha(gunzipSync(readBytes(result.historicalWitness.archivePath))),result.historicalWitness.uncompressedSha256);assert.notEqual(result.historicalWitness.uncompressedSha256,result.currentSourceRefs.find(ref=>ref.path==='equipment.json').sha256);
 for(const ref of [...result.historicalEvidenceRefs,...result.contractLineageRefs,result.registryRef])assert.equal(sha(readBytes(ref.path)),ref.sha256);assert.equal(result.registryRef.path,contractPath);assert.equal(result.registryRef.sha256,sha(readBytes(contractPath)));
 assert.equal(new Set(result.inputRefs.map(ref=>ref.path)).size,result.inputRefs.length);assert.deepEqual(result.currentSourceEpoch,{sourceCommit:source.summary.sourceCommit,sourceTree:source.summary.sourceTree,fixture:source.summary.fixture});
 const raw=readJson('equipment.json').equipment.find(row=>row.id==='ua-jo-stick'),assembled=source.inputs.data.equipment.find(row=>row.id==='ua-jo-stick'),mechanics=source.inputs.mechanics.records.find(row=>row.collection==='equipment'&&row.id==='ua-jo-stick').fields.find(row=>row.path==='/price');
 for(const row of [raw,assembled]){assert.equal(row.price,null);assert.equal(row.priceState,'unextracted');assert.equal(Object.hasOwn(row,'suggestedPrice'),false);assert.equal(Object.keys(row.fields).length,14);}assert.equal(mechanics.value,null);assert.equal(mechanics.status,'not-extracted');assert.equal(mechanics.inspected,false);assert.deepEqual(mechanics.checkers,[]);
 assert.equal(result.payloadProof.currentDataRecordSha256,contract.retainedJoTarget.currentDataRecordSha256);assert.equal(result.payloadProof.currentEquipmentRecordSha256,contract.retainedJoTarget.currentEquipmentRecordSha256);assert.equal(result.payloadProof.currentMechanicsRecordSha256,contract.retainedJoTarget.currentMechanicsRecordSha256);assert.equal(result.payloadProof.semanticPass,false);
});
test('the actual Jo API is zero-argument and its closed semantic guard rejects all old target/grade mutations',()=>{
 const api=createSemanticBackend().evaluate(modulePath);let getters=0;const options={get repoRoot(){getters++;throw Error('getter');}};assert.throws(()=>api.loadJoCurrentSuccessor(options),/no caller-selected root/);assert.throws(()=>api.loadJoCurrentSuccessor(undefined),/no caller-selected root/);assert.equal(getters,0);
 const edits=[c=>c.retainedJoTarget.collection='spells',c=>c.retainedJoTarget.itemId='phb-bo-stick',c=>c.retainedJoTarget.pricePointer='/fields/other',c=>c.retainedJoTarget.requiredState.price=1,c=>c.retainedJoTarget.requiredState.priceState='estimated',c=>c.retainedJoTarget.requiredState.mechanicsPriceInspected=true,c=>c.retainedJoTarget.sourcePriceAbsenceReviewed=true,c=>c.retainedJoTarget.unitProvenance='price-per-item'];
 for(const edit of edits){const changed=structuredClone(contract);edit(changed);const backend=createSemanticBackend({contractOverrides:new Map([[contractPath,Buffer.from(JSON.stringify(changed))]])});assert.throws(()=>backend.evaluate(modulePath).loadJoCurrentSuccessor(),/closed Jo target identity, null\/unextracted field, or pending grade contract/);}
});
test('current Jo dependency roles retain the historical nineteen-code prefix and every read dependency',()=>{
 assert.equal(historicalRegistry.S2_CURRENT_ADAPTER_CODE_PATHS.length,19);assert.equal(Object.keys(historicalRegistry.S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES).length,19);
 for(const path of historicalRegistry.S2_CURRENT_ADAPTER_CODE_PATHS)assert.ok(registry.S2_CURRENT_ADAPTER_CODE_PATHS.includes(registry.REPORT_PATH_SUCCESSORS[path]??path),path);
 const paths=[contractPath,'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json','research/source-audit-batch6-jo-unextracted-price.json','research/class-mapping-current-adapters-v1/jo-registered-equipment-v1.json.gz','tests/fixtures/equipment-before-jo.json.gz','research/source-audit-batch6-jo-mapping-independent-review.json','research/source-audit-batch6-jo-source-row-proof.json'];
 for(const path of paths)assert.ok(registry.REPORT_DATA_PATHS.includes(path),path);
 const edges=registry.REPORT_DATA_POINTER_EDGES.filter(row=>row.sourcePath===contractPath);assert.equal(edges.length,8);for(const edge of edges){assert.ok(registry.REPORT_DATA_PATHS.includes(edge.sourcePath));assert.ok(registry.REPORT_DATA_PATHS.includes(edge.targetPath)||registry.HISTORICAL_REPORT_DATA_PATHS.includes(edge.targetPath));}
 assert.equal(historicalRegistry.S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES['tools/class-mapping-current-jo-gap-v1.mjs'],'1a36b58c8e6da6bc281d46b3028372feb6e5c26014cb79ff4ef01cf004d44199');assert.equal(historicalRegistry.S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES['tools/class-mapping-current-consumer-runtime-v1.mjs'],'eddac05f87eb17876f70fc93952a0be04f3139a2f8815c38c47668b9d5e38a5b');assert.equal(historicalRegistry.S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES['tools/class-mapping-current-consumer-seal-verifier-v1.mjs'],'2024a67b10faf01292838f4c1f69f70b634ee6cdbab063cdaa04b72e36902678');
 assert.ok(registry.REPORT_CODE_PATHS.includes('tools/monetary-unit-provenance-audit-next-native-v3.mjs'));assert.equal(registry.REPORT_DATA_EXPECTED_SHA256[contractPath],sha(readBytes(contractPath)));
});

test('historical Jo predecessor identities and both pre-QCC stubs stay byte-exact',()=>{
 const previous=readJson(contract.predecessor.path);
 assert.equal(previous.predecessor.path,'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json');
 assert.equal(previous.predecessor.sha256,'88f5fc0fe4e19bbcc171a29f60a465df6c8a7c3b2486a8e56b9277d0d14e96fc');
 assert.equal(previous.nativeSourceEpochBinding.qualifierCodeCommit,null);
 assert.deepEqual(previous.historicalEvidence,readJson(previous.predecessor.path).historicalEvidence);
 const code='research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.qcc-stub.mjs',final='research/class-mapping-current-adapters-v1/current-consumer-pins-v1.qcc-stub.mjs';
 assert.equal(sha(readBytes(code)),'8549e478c6ef762a49145420c610d12d8ed767b34648bdaa894b82ec09b08bb5');
 assert.equal(sha(readBytes(final)),'53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385');
});
