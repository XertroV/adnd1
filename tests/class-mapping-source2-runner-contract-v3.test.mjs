import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import test from 'node:test';
import {tmpdir} from 'node:os';
import {
  admitBeforeShardSelection,
  deriveSource2Shards,
  readSource2TestRoster,
  loadSource2MigrationDocument,
  SOURCE2_MIGRATION_SHA256,
  SOURCE2_BODY_COMMIT,
  SOURCE2_BODY_TREE,
  SOURCE2_DEDICATED_MM_PATH, SOURCE2_DEDICATED_MM_SHA256, SOURCE2_DEDICATED_MM_SIZE_BYTES, SOURCE2_HISTORICAL_MM_MANIFEST_SHA256, SOURCE2_HISTORICAL_MM_COMMIT,
  SOURCE2_DYNAMIC_ONLY_PATHS,
  SOURCE2_INPUT_MAP_COUNTS,
  SOURCE2_SOURCE_BODY_MAP_SHA256,
  SOURCE2_SHARD_COUNT,
  validateSource2MigrationDocument
} from '../tools/class-mapping-source2-test-roster-v2.mjs';
import {parseSource2TapSummary, validateSource2ReceiptSet, SOURCE2_SHARD_CODE_PIN_PATHS, SOURCE2_MM_CODE_PIN_PATHS} from '../tools/class-mapping-source2-test-receipt-core-v2.mjs';
import {SOURCE2_O_JOIN_PINS, verifySource2OReceiptJoin, assertVerifiedSource2OJoinProof, assertOutputCommitAncestor} from '../tools/class-mapping-source2-o-receipt-join-v1.mjs';
import {createRawGitReader} from '../tools/class-mapping-raw-git-v1.mjs';

const repoRoot=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const allSyntheticCodePinPaths=[...new Set([...SOURCE2_SHARD_CODE_PIN_PATHS,...SOURCE2_MM_CODE_PIN_PATHS])];
const syntheticPinHashes=new Map(allSyntheticCodePinPaths.map((path,index)=>[path,String((index%9)+1).repeat(64)]));
function syntheticCodePins(paths){return paths.map(path=>({path,sha256:syntheticPinHashes.get(path),sizeBytes:1}));}
let cachedAcceptedRosterFixture;
function acceptedRosterFixture(){
  if(cachedAcceptedRosterFixture)return cachedAcceptedRosterFixture;
  const loaded=loadSource2MigrationDocument(repoRoot),receiptBytes=readFileSync(resolve(repoRoot,SOURCE2_O_JOIN_PINS.metadataReceiptPath));
  const receipt=JSON.parse(receiptBytes.toString('utf8'));
  const rawGit=createRawGitReader(repoRoot);
  const headCommit=rawGit.git('rev-parse','--verify','HEAD^{commit}').toString('utf8').trim();
  const verifiedReportReceipt=Object.freeze({path:SOURCE2_O_JOIN_PINS.metadataReceiptPath,sha256:sha(receiptBytes),sourceCommit:SOURCE2_O_JOIN_PINS.bodyCommit,sourceTree:SOURCE2_O_JOIN_PINS.bodyTree,reportQccCommit:SOURCE2_O_JOIN_PINS.reportQccCommit,qualifierCodeCommit:SOURCE2_O_JOIN_PINS.reportQccCommit,headCommit,receipt});
  const outputJoinProof=verifySource2OReceiptJoin(repoRoot,loaded.document.currentSuiteSemantics.reportOutputJoin,verifiedReportReceipt,loaded.sha256);
  const roster=readSource2TestRoster(repoRoot,verifiedReportReceipt,outputJoinProof);
  cachedAcceptedRosterFixture={loaded,verifiedReportReceipt,outputJoinProof,roster};
  return cachedAcceptedRosterFixture;
}

function syntheticRoster(){
  const entries=Array.from({length:20},(_,index)=>({path:`tests/family-${String(index).padStart(2,'0')}.test.mjs`,sha256:String(index%10).repeat(64),sizeBytes:100+index,kind:'synthetic'}));
  const historicalMmTarget={path:SOURCE2_DEDICATED_MM_PATH,sha256:SOURCE2_DEDICATED_MM_SHA256,sizeBytes:SOURCE2_DEDICATED_MM_SIZE_BYTES};
  return {sourceRosterSha256:'a'.repeat(64),sourceRosterBytes:1234,migrationPath:'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v2.json',familyCounts:{static:8,dynamic:2,unaffected:11,workflow:0,successors:10},topLevelFamilyCount:21,mainCurrentFamilyCount:20,historicalMmFamilyCount:1,supportTestCount:0,mainCurrentTestFileCount:20,logicalTargetCount:21,historicalMmTarget,logicalTargetPaths:[...entries.map(row=>row.path),SOURCE2_DEDICATED_MM_PATH].sort(),entries};
}
function successfulReceiptSet(roster){
  const shards=deriveSource2Shards(roster),runId='301',runAttempt='2',gitCommit='b'.repeat(40),gitTree='c'.repeat(40);
  const sourceIdentity={summary:{stage:'source2-body-native',sourceCommit:SOURCE2_BODY_COMMIT,sourceTree:SOURCE2_BODY_TREE},inputMapSha256:{sourceBody:SOURCE2_SOURCE_BODY_MAP_SHA256,qualificationMetadata:'d'.repeat(64),protectedHistorical:'e'.repeat(64),installedCode:'f'.repeat(64)},inputMapCounts:SOURCE2_INPUT_MAP_COUNTS};
  const seal={status:'verified',sha256:'e'.repeat(64)},report={status:'verified',sha256:SOURCE2_O_JOIN_PINS.metadataReceiptSha256};
  const tracked={trackedTreeClean:true};
  const outputJoinProof={manifestSha256:SOURCE2_MIGRATION_SHA256,reportReceiptSha256:report.sha256,outputCommit:SOURCE2_O_JOIN_PINS.outputCommit,outputTree:SOURCE2_O_JOIN_PINS.outputTree,outputParentCommit:SOURCE2_O_JOIN_PINS.outputParentCommit,bodyCommit:SOURCE2_O_JOIN_PINS.bodyCommit,reportQccCommit:SOURCE2_O_JOIN_PINS.reportQccCommit,metadataReceiptPath:SOURCE2_O_JOIN_PINS.metadataReceiptPath,metadataReceiptSha256:SOURCE2_O_JOIN_PINS.metadataReceiptSha256,reportOutputContractCount:26,newOFileCount:26,newOFileBytes:183170305,currentHeadCommit:gitCommit,currentHeadTree:gitTree};
  const shardReceipts=shards.map((shard,index)=>({
    status:'success',mode:'shard',shardIndex:index,shardCount:4,runId,runAttempt,gitCommit,gitTree,workflowSha:gitCommit,gitCommitAfter:gitCommit,topLevelFamilyCount:225,mainCurrentFamilyCount:224,historicalMmFamilyCount:1,supportTestCount:15,mainCurrentTestFileCount:239,logicalTargetCount:240,historicalMmTargetPath:SOURCE2_DEDICATED_MM_PATH,
    sourceRosterSha256:roster.sourceRosterSha256,sourceRosterSha256After:roster.sourceRosterSha256,
    selectedTestFiles:shard.entries.map(row=>row.path),selectedTestFileHashes:Object.fromEntries(shard.entries.map(row=>[row.path,{sha256:row.sha256,sizeBytes:row.sizeBytes}])),
    attemptedFileCount:shard.entries.length,actualExecutedFiles:shard.entries.map(row=>row.path),tapSummary:{tests:5,pass:5,fail:0,cancelled:0,skipped:0,todo:0},
    nodeExitCode:0,processError:null,signal:null,runnerError:null,sourceIdentityBefore:sourceIdentity,sourceIdentityAfter:sourceIdentity,sourceIdentityUnchanged:true,acceptedTargetUnchanged:true,sourceRosterUnchanged:true,
    consumerSealBefore:seal,consumerSealAfter:seal,reportReceiptBefore:report,reportReceiptAfter:report,outputJoinProofBefore:outputJoinProof,outputJoinProofAfter:outputJoinProof,trackedCheckoutBefore:tracked,trackedCheckoutAfter:tracked,distTrackedTreeCleanAfter:true,
    runnerCodePins:syntheticCodePins(SOURCE2_SHARD_CODE_PIN_PATHS)
  }));
  const mmReceipt={
    status:'success',mode:'historical-mm-replay',shardIndex:null,shardCount:4,runId,runAttempt,gitCommit,gitTree,workflowSha:gitCommit,gitCommitAfter:gitCommit,mainCurrentFamilyCount:224,historicalMmFamilyCount:1,supportTestCount:15,mainCurrentTestFileCount:239,logicalTargetCount:240,historicalMmTargetPath:SOURCE2_DEDICATED_MM_PATH,
    sourceRosterSha256:roster.sourceRosterSha256,sourceRosterSha256After:roster.sourceRosterSha256,
    historicalMmReplay:{manifestSha256:SOURCE2_HISTORICAL_MM_MANIFEST_SHA256,manifestPath:'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json',testEntry:SOURCE2_DEDICATED_MM_PATH,testEntryPin:{commit:SOURCE2_HISTORICAL_MM_COMMIT,sha256:SOURCE2_DEDICATED_MM_SHA256,sizeBytes:SOURCE2_DEDICATED_MM_SIZE_BYTES},expectedAssertions:19,actualAssertions:19,passed:19,failed:0,skipped:0,capsuleAndPrivateTmpRemoved:true,activeSourceFilesWritten:false},
    tapSummary:{tests:19,pass:19,fail:0,cancelled:0,skipped:0,todo:0},nodeExitCode:0,processError:null,runnerError:null,
    sourceIdentityBefore:sourceIdentity,sourceIdentityAfter:sourceIdentity,sourceIdentityUnchanged:true,acceptedTargetUnchanged:true,sourceRosterUnchanged:true,
    consumerSealBefore:seal,consumerSealAfter:seal,reportReceiptBefore:report,reportReceiptAfter:report,outputJoinProofBefore:outputJoinProof,outputJoinProofAfter:outputJoinProof,trackedCheckoutBefore:tracked,trackedCheckoutAfter:tracked,distTrackedTreeCleanAfter:true,
    signal:null,runnerCodePins:syntheticCodePins(SOURCE2_MM_CODE_PIN_PATHS)
  };
  const currentCodePins=[...new Map([...shardReceipts,mmReceipt].flatMap(row=>row.runnerCodePins).map(row=>[row.path,row])).values()];
  return {shardReceipts,mmReceipt,runId,runAttempt,gitCommit,gitTree,currentIdentity:sourceIdentity,currentConsumerSeal:seal,currentReportReceipt:report,currentOutputJoinProof:outputJoinProof,currentCodePins};
}

test('finite Source2 manifest covers 64 static, 7 dynamic/pin, 153 unchanged and one workflow family',()=>{
  const roster=acceptedRosterFixture().roster;
  assert.deepEqual(roster.familyCounts,{static:64,dynamic:7,unaffected:153,workflow:1,successors:72,exactPrefix:64,semantic:8});
  assert.equal(roster.topLevelFamilyCount,225);
  assert.equal(roster.entries.length,239);
  assert.equal(roster.logicalTargetCount,240);
  assert.equal(roster.mainCurrentFamilyCount,224);
  assert.equal(roster.historicalMmTarget.path,'tests/mm-treasure-current-m1-cohort-v2.test.mjs');
  assert.equal(roster.entries.some(row=>row.path===roster.historicalMmTarget.path),false);
  assert.equal(roster.supportTestCount,15);
  assert.equal(roster.sourceRosterSha256.length,64);
  assert.deepEqual(roster.document.sourceEpoch.inputMapCardinalities,SOURCE2_INPUT_MAP_COUNTS);
  assert.equal(roster.document.sourceEpoch.sourceBodyMapSha256,SOURCE2_SOURCE_BODY_MAP_SHA256);
  assert.deepEqual(roster.document.classificationEvidence.dynamicOrCurrentPinOnlyPaths,SOURCE2_DYNAMIC_ONLY_PATHS);
  assert.equal(validateSource2MigrationDocument(roster.document).currentTestCount,240);assert.equal(validateSource2MigrationDocument(roster.document).mainCurrentTestCount,239);
});

test('Source2 roster preserves every frozen predecessor prefix and the complete navigation replacement proof',()=>{
  const roster=acceptedRosterFixture().roster;
  const originalBytes=readFileSync(resolve(repoRoot,'research/class-mapping-history-v1/original-top-level-test-entries-v1.json'));assert.equal(originalBytes.length,10031);assert.equal(sha(originalBytes),'33e7e87992f529f0c90a39b3a0d7103c49da4127f8d8b03ca663832d648d040e');const original=JSON.parse(originalBytes.toString('utf8'));assert.equal(original.entries.length,200);assert.equal(new Set(original.entries).size,200);
  const r5Bytes=readFileSync(resolve(repoRoot,'research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json'));assert.equal(r5Bytes.length,53707);assert.equal(sha(r5Bytes),'e5f8917bb9f878fa7ae1e5406584988936fc623e173a9d2a0a2613aaf67b0142');const r5=JSON.parse(r5Bytes.toString('utf8'));assert.equal(r5.entries.length,217);assert.equal(new Set(r5.entries.map(row=>row.path)).size,217);
  const predecessorPaths=new Set(roster.document.testFamilies.map(row=>row.predecessorPath));assert.ok(original.entries.every(path=>predecessorPaths.has(path)));assert.ok(r5.entries.every(row=>predecessorPaths.has(row.path)));
  const actualShards=deriveSource2Shards(roster),actualSelection=actualShards.flatMap(shard=>shard.entries.map(row=>row.path));assert.equal(actualShards.length,4);assert.equal(actualSelection.length,239);assert.equal(new Set(actualSelection).size,239);assert.deepEqual([...actualSelection].sort(),roster.entries.map(row=>row.path).sort());assert.equal(actualSelection.includes(SOURCE2_DEDICATED_MM_PATH),false);
  const affected=roster.document.testFamilies.filter(row=>row.familyKind==='native1-static-runtime-consumer'||row.familyKind==='native1-dynamic-or-current-pin-consumer');
  assert.equal(affected.length,71);
  assert.equal(affected.filter(row=>row.predecessorAssertionProof?.kind==='exact-predecessor-prefix').length,64);
  const dedicated=roster.document.testFamilies.find(row=>row.successorPath==='tests/mm-treasure-current-m1-cohort-v2.test.mjs');assert.equal(dedicated.migrationKind,'unchanged-current-test-family');assert.equal(dedicated.executionLane,'separate-historical-a29-capsule');assert.equal(roster.entries.some(row=>row.path===dedicated.successorPath),false);assert.equal(roster.historicalMmTarget.sha256,dedicated.successorSha256);
  assert.ok(affected.filter(row=>row.predecessorAssertionProof?.kind==='exact-predecessor-prefix').every(row=>row.predecessorAssertionProof.successorStartsWithExactPredecessorBytes));
  const workflowFamily=roster.document.testFamilies.find(row=>row.familyKind==='current-workflow-contract');assert.equal(workflowFamily.predecessorPath,'tests/class-mapping-test-sharding-contract-v1.test.mjs');assert.equal(workflowFamily.predecessorAssertionProof.predecessorAssertionCount,66);assert.equal(workflowFamily.predecessorAssertionProof.oldTestCaseTitles.length,13);assert.equal(workflowFamily.predecessorAssertionProof.semanticAssertionCoverage.length,13);assert.deepEqual(workflowFamily.predecessorAssertionProof.semanticAssertionCoverage.map(row=>row.predecessorTitle).sort(),[...workflowFamily.predecessorAssertionProof.oldTestCaseTitles].sort());
  const navigation=affected.find(row=>row.predecessorPath==='tests/citation-navigation.test.mjs');
  assert.equal(navigation.predecessorAssertionProof.predecessorTestCount,14);
  assert.equal(navigation.predecessorAssertionProof.newFooterRegressionTestCount,5);
  assert.equal(navigation.successorTestCaseCount,20);
});

test('four deterministic shards are disjoint, complete, and stable',()=>{
  const roster=syntheticRoster(),first=deriveSource2Shards(roster),second=deriveSource2Shards(roster);
  assert.equal(first.length,SOURCE2_SHARD_COUNT);
  assert.deepEqual(first,second);
  const selected=first.flatMap(shard=>shard.entries.map(row=>row.path));
  assert.equal(new Set(selected).size,roster.entries.length);
  assert.deepEqual([...selected].sort(),roster.entries.map(row=>row.path).sort());
  const added={path:'tests/zz-future-extra.test.mjs',sha256:'c'.repeat(64),sizeBytes:123,kind:'synthetic'};const future={...roster,entries:[...roster.entries,added]};const futureSelected=deriveSource2Shards(future).flatMap(shard=>shard.entries.map(row=>row.path));assert.equal(futureSelected.filter(path=>path===added.path).length,1);
  assert.throws(()=>deriveSource2Shards(roster,3),/exactly four shards/);
});

test('a pending or wrong source target rejects before manifest loading or shard selection',()=>{
  const order=[];
  assert.throws(()=>admitBeforeShardSelection(()=>{order.push('identity');return {summary:{stage:'pending'}};},()=>{order.push('roster');return {};},()=>{order.push('shard');return {}; }),/fixed reviewed Source2 target/);
  assert.deepEqual(order,['identity']);
});

test('accepted identity gates precede roster and selection in the production runner',()=>{
  const source=readFileSync(resolve(repoRoot,'tools/class-mapping-source2-test-runner-core-v2.mjs'),'utf8');
  const runner=source.slice(source.indexOf('export async function runSource2Tests'));
  const gate=runner.indexOf('await verifyFullCurrentTarget()');
  const roster=runner.indexOf('readSource2TestRoster(root,targetBefore.reportReceipt,targetBefore.outputJoinProof)');
  const shard=runner.indexOf('deriveSource2Shards(roster)');
  assert.ok(gate>=0&&gate<roster&&roster<shard);
  const fullTarget=source.slice(source.indexOf('export async function verifyFullCurrentTarget'),source.indexOf('function digestIdentity'));
  const identity=fullTarget.indexOf('assertClassMappingCurrentSourceIdentity()');
  const consumerSeal=fullTarget.indexOf('verifyCurrentConsumerMaterializedStageSeal');
  const report=fullTarget.indexOf('verifyCommittedClassMappingReportReceipt');
  const outputJoin=fullTarget.indexOf('verifySource2OReceiptJoin');
  assert.ok(identity>=0&&identity<consumerSeal&&consumerSeal<report&&report<outputJoin);
  assert.match(source,/verifyCurrentConsumerMaterializedStageSeal/);
  assert.match(source,/verifyCommittedClassMappingReportReceipt/);
  assert.match(source,/verifySource2OReceiptJoin/);
  assert.match(source,/outputJoinProofBefore/);
  const reducer=readFileSync(resolve(repoRoot,'tools/reduce-class-mapping-test-source2-shards-v1.mjs'),'utf8');
  assert.ok(reducer.indexOf('await verifyFullCurrentTarget()')<reducer.indexOf('readSource2TestRoster(root,target.reportReceipt,target.outputJoinProof)'));
  const mm=readFileSync(resolve(repoRoot,'tools/run-historical-mm-replay-source2-receipt-v1.mjs'),'utf8');
  assert.ok(mm.indexOf('await acceptedTarget()')<mm.indexOf('readSource2TestRoster(root,targetBefore.reportReceipt,targetBefore.outputJoinProof)'));
  const replay=readFileSync(resolve(repoRoot,'tools/replay-historical-mm-native-tests-source2-v1.mjs'),'utf8');
  assert.ok(replay.indexOf('await verifyFullCurrentTarget()')<replay.indexOf('readSource2TestRoster(root,targetBefore.reportReceipt,targetBefore.outputJoinProof)'));
  assert.match(replay,/verifyFullCurrentTarget\(\)/);
  assert.doesNotMatch(source,/test-isolation=none/);
  assert.match(source,/--test-concurrency=1/);
  assert.doesNotMatch(source,/tests\/\*\.mjs/);
});

test('raw O join rejects substituted commit, tree, parent, receipt, ancestry, and output evidence before roster admission',()=>{
  const {loaded,verifiedReportReceipt,outputJoinProof}=acceptedRosterFixture();
  assert.equal(assertVerifiedSource2OJoinProof(outputJoinProof),outputJoinProof);
  assert.throws(()=>assertVerifiedSource2OJoinProof({...outputJoinProof}),/must come from the raw-Git O verifier/);
  assert.throws(()=>readSource2TestRoster(repoRoot,verifiedReportReceipt),/join proof must come from the raw-Git O verifier/);
  assert.throws(()=>verifySource2OReceiptJoin(repoRoot,{...loaded.document.currentSuiteSemantics.reportOutputJoin,outputCommit:'0'.repeat(40)},verifiedReportReceipt,loaded.sha256),/exact v9 O pin outputCommit/);
  assert.throws(()=>verifySource2OReceiptJoin(repoRoot,{...loaded.document.currentSuiteSemantics.reportOutputJoin,outputTree:'0'.repeat(40)},verifiedReportReceipt,loaded.sha256),/exact v9 O pin outputTree/);
  assert.throws(()=>verifySource2OReceiptJoin(repoRoot,{...loaded.document.currentSuiteSemantics.reportOutputJoin,outputParentCommit:'0'.repeat(40)},verifiedReportReceipt,loaded.sha256),/exact v9 O pin outputParentCommit/);
  assert.throws(()=>verifySource2OReceiptJoin(repoRoot,loaded.document.currentSuiteSemantics.reportOutputJoin,{...verifiedReportReceipt,sha256:'0'.repeat(64)},loaded.sha256),/verifier receipt raw SHA256/);
  assert.throws(()=>verifySource2OReceiptJoin(repoRoot,loaded.document.currentSuiteSemantics.reportOutputJoin,{...verifiedReportReceipt,headCommit:SOURCE2_O_JOIN_PINS.outputParentCommit},loaded.sha256),/verifier headCommit equals raw current HEAD/);
  assert.throws(()=>verifySource2OReceiptJoin(repoRoot,loaded.document.currentSuiteSemantics.reportOutputJoin,verifiedReportReceipt,'0'.repeat(64)),/exact pinned v9 manifest digest/);
  const wrongOutput={...verifiedReportReceipt,receipt:structuredClone(verifiedReportReceipt.receipt)};
  wrongOutput.receipt.outputs[0].rawSha256='0'.repeat(64);
  assert.throws(()=>verifySource2OReceiptJoin(repoRoot,loaded.document.currentSuiteSemantics.reportOutputJoin,wrongOutput,loaded.sha256),/returned verified receipt object equals raw O metadata receipt/);
  const rawGit=createRawGitReader(repoRoot);
  assert.equal(assertOutputCommitAncestor(rawGit,SOURCE2_O_JOIN_PINS.outputCommit,verifiedReportReceipt.headCommit),true);
  assert.throws(()=>assertOutputCommitAncestor(rawGit,SOURCE2_O_JOIN_PINS.outputCommit,SOURCE2_O_JOIN_PINS.outputParentCommit),/not an ancestor/);
  assert.throws(()=>assertOutputCommitAncestor({git(){throw new Error('synthetic negative ancestry fixture');}},SOURCE2_O_JOIN_PINS.outputCommit,'f'.repeat(40)),/not an ancestor/);
  assert.equal(outputJoinProof.outputCommit,SOURCE2_O_JOIN_PINS.outputCommit);
  assert.equal(outputJoinProof.reportOutputContractCount,26);
});

test('receipt reducer accepts complete exact-coverage receipts for one run and Source2 target',()=>{
  const roster=syntheticRoster(),set=successfulReceiptSet(roster);
  const summary=validateSource2ReceiptSet({...set,shardJobResult:'success',mmJobResult:'success',roster,currentIdentity:set.currentIdentity,currentConsumerSeal:set.currentConsumerSeal,currentReportReceipt:set.currentReportReceipt});
  assert.equal(summary.status,'success');
  assert.equal(summary.all225FamiliesAndSupportTestsExecutedOnceAcrossMainAndHistoricalLanes,true);assert.equal(summary.source2CurrentTestFileCount,20);assert.equal(summary.mainCurrentTestFileCount,20);assert.equal(summary.logicalTargetCount,21);
  assert.notEqual(set.gitCommit,set.currentIdentity.summary.sourceCommit);assert.equal(summary.gitCommit,set.gitCommit);assert.equal(set.currentIdentity.summary.sourceCommit,SOURCE2_BODY_COMMIT);assert.equal(summary.aggregate.tests,39);
  assert.equal(summary.aggregate.skipped,0);
  const broken=structuredClone(set.shardReceipts);
  broken[2].sourceRosterSha256='0'.repeat(64);
  assert.throws(()=>validateSource2ReceiptSet({...set,shardReceipts:broken,shardJobResult:'success',mmJobResult:'success',roster,currentIdentity:set.currentIdentity,currentConsumerSeal:set.currentConsumerSeal,currentReportReceipt:set.currentReportReceipt}),/exact roster hash/);
  const wrongJoin=structuredClone(set.shardReceipts);wrongJoin[1].outputJoinProofAfter.outputCommit='0'.repeat(40);assert.throws(()=>validateSource2ReceiptSet({...set,shardReceipts:wrongJoin,shardJobResult:'success',mmJobResult:'success',roster}),/current seal\/report\/O-join pins before\/after|exact current raw O\/receipt join/);
  assert.throws(()=>validateSource2ReceiptSet({...set,currentOutputJoinProof:undefined,shardJobResult:'success',mmJobResult:'success',roster}),/fresh accepted Source2 identity, consumer seal, report receipt, and O join proof/);
});

test('receipt reducer rejects hidden skips, todos, failures, incomplete files, and stale attempts',()=>{
  const roster=syntheticRoster(),set=successfulReceiptSet(roster),base={...set,shardJobResult:'success',mmJobResult:'success',roster};
  for(const [field,value,pattern] of [
    ['skipped',1,/no hidden failure/],['todo',1,/no hidden failure/],['fail',1,/no hidden failure/]
  ]){
    const broken=structuredClone(set.shardReceipts);broken[0].tapSummary[field]=value;
    assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:broken}),pattern);
  }
  const incomplete=structuredClone(set.shardReceipts);incomplete[1].actualExecutedFiles.pop();
  assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:incomplete}),/every requested current file executed/);
  const stale=structuredClone(set.mmReceipt);stale.runAttempt='1';
  assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:stale}),/MM exact run\/attempt\/commit/);
});

test('missing/duplicate receipts, selected files, and source hashes reject',()=>{
  const roster=syntheticRoster(),set=successfulReceiptSet(roster),base={...set,shardJobResult:'success',mmJobResult:'success',roster,currentIdentity:set.currentIdentity,currentConsumerSeal:set.currentConsumerSeal,currentReportReceipt:set.currentReportReceipt};
  assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:set.shardReceipts.slice(0,3)}),/exact four shard receipts/);
  const duplicate=structuredClone(set.shardReceipts);duplicate[1].shardIndex=0;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:duplicate}),/receipt identity/);
  const omitted=structuredClone(set.shardReceipts);omitted[0].selectedTestFiles.pop();assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:omitted}),/deterministic target selection/);
  const substituted=structuredClone(set.shardReceipts);substituted[0].selectedTestFileHashes[substituted[0].selectedTestFiles[0]].sha256='9'.repeat(64);assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:substituted}),/selected file hash pins/);
  const wrongMmLane=structuredClone(set.mmReceipt);wrongMmLane.historicalMmReplay.testEntry='tests/mm-treasure-current-m1-cohort-v3.test.mjs';assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:wrongMmLane}),/dedicated MM family runs exactly once/);
  const shardAlsoRunsMm=structuredClone(set.shardReceipts);shardAlsoRunsMm[0].selectedTestFiles.push(SOURCE2_DEDICATED_MM_PATH);assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:shardAlsoRunsMm}),/exact deterministic target selection/);
  const duplicatePin=structuredClone(set.shardReceipts);duplicatePin[0].runnerCodePins[1]={...duplicatePin[0].runnerCodePins[0]};assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:duplicatePin}),/exact code-pin role|unique code-pin path/);
  const malformedPin=structuredClone(set.shardReceipts);malformedPin[0].runnerCodePins[0].sizeBytes=0;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:malformedPin}),/well-formed nonempty code pin/);
  const staleLivePin=structuredClone(set.shardReceipts);staleLivePin[0].runnerCodePins[0].sha256='0'.repeat(64);assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:staleLivePin}),/receipt code pin equals live accepted checkout bytes/);
});

test('failed, cancelled, nonzero, and incomplete execution outcomes reject',()=>{
  const roster=syntheticRoster(),set=successfulReceiptSet(roster),base={...set,shardJobResult:'success',mmJobResult:'success',roster,currentIdentity:set.currentIdentity,currentConsumerSeal:set.currentConsumerSeal,currentReportReceipt:set.currentReportReceipt};
  const failed=structuredClone(set.shardReceipts);failed[0].status='failed';failed[0].nodeExitCode=1;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:failed}),/receipt identity\/status/);
  const cancelled=structuredClone(set.shardReceipts);cancelled[0].tapSummary.cancelled=1;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:cancelled}),/no hidden failure/);
  const cancelledStatus=structuredClone(set.shardReceipts);cancelledStatus[0].status='cancelled';cancelledStatus[0].nodeExitCode=null;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:cancelledStatus}),/receipt identity\/status/);
  const skippedStatus=structuredClone(set.shardReceipts);skippedStatus[0].status='skipped';assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:skippedStatus}),/receipt identity\/status/);
  const processError=structuredClone(set.shardReceipts);processError[0].processError='spawn failed';assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:processError}),/clean Node process/);
  assert.throws(()=>validateSource2ReceiptSet({...base,shardJobResult:'failure'}),/both workflow jobs report success/);
  assert.throws(()=>validateSource2ReceiptSet({...base,shardJobResult:undefined}),/both workflow jobs report success/);
  assert.throws(()=>validateSource2ReceiptSet({...base,mmJobResult:'cancelled'}),/both workflow jobs report success/);
  assert.throws(()=>validateSource2ReceiptSet({...base,mmJobResult:undefined}),/both workflow jobs report success/);
});

test('run, attempt, checkout, Source2 inputs, consumer seal, report receipt, and O join cannot drift',()=>{
  const roster=syntheticRoster(),set=successfulReceiptSet(roster),base={...set,shardJobResult:'success',mmJobResult:'success',roster,currentIdentity:set.currentIdentity,currentConsumerSeal:set.currentConsumerSeal,currentReportReceipt:set.currentReportReceipt};
  const run=structuredClone(set.shardReceipts);run[1].runId='999';assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:run}),/exact run\/attempt\/commit/);
  const attempt=structuredClone(set.shardReceipts);attempt[1].runAttempt='9';assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:attempt}),/exact run\/attempt\/commit/);
  const logicalAsCheckout=structuredClone(set.shardReceipts);logicalAsCheckout[1].gitCommit=set.currentIdentity.summary.sourceCommit;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:logicalAsCheckout}),/exact run\/attempt\/commit/);
  const tree=structuredClone(set.shardReceipts);tree[2].gitTree='0'.repeat(40);assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:tree}),/tree equals actual checkout HEAD/);
  const headAfter=structuredClone(set.shardReceipts);headAfter[1].gitCommitAfter='0'.repeat(40);assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:headAfter}),/post-run HEAD unchanged/);
  const wrongShardSource=structuredClone(set.shardReceipts);wrongShardSource[2].sourceIdentityBefore.summary.sourceCommit=set.gitCommit;wrongShardSource[2].sourceIdentityAfter=structuredClone(wrongShardSource[2].sourceIdentityBefore);assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:wrongShardSource}),/exact current Source2 input-map and epoch pins/);
  const inputs=structuredClone(set.shardReceipts);inputs[2].sourceIdentityAfter=structuredClone(inputs[2].sourceIdentityAfter);inputs[2].sourceIdentityAfter.inputMapSha256.sourceBody='8'.repeat(64);assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:inputs}),/fresh current identity before\/after/);
  const stale=structuredClone(set.shardReceipts);stale[2].sourceIdentityBefore.inputMapSha256.sourceBody='8'.repeat(64);stale[2].sourceIdentityAfter=structuredClone(stale[2].sourceIdentityBefore);assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:stale}),/exact current Source2 input-map and epoch pins/);
  const seal=structuredClone(set.mmReceipt);seal.consumerSealAfter.sha256='8'.repeat(64);assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:seal}),/MM current/);
  const report=structuredClone(set.mmReceipt);report.reportReceiptBefore.sha256='8'.repeat(64);assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:report}),/MM current/);
  const outputJoin=structuredClone(set.mmReceipt);outputJoin.outputJoinProofAfter.metadataReceiptSha256='8'.repeat(64);assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:outputJoin}),/MM current seal\/report\/O-join pins before\/after|MM exact current raw O\/receipt join/);
  const incompleteMap=structuredClone(set.currentIdentity);incompleteMap.inputMapCounts.sourceBody=3062;assert.throws(()=>validateSource2ReceiptSet({...base,currentIdentity:incompleteMap}),/complete sourceBody input map cardinality/);
  const substitutedBodyMap=structuredClone(set.currentIdentity);substitutedBodyMap.inputMapSha256.sourceBody='8'.repeat(64);assert.throws(()=>validateSource2ReceiptSet({...base,currentIdentity:substitutedBodyMap}),/canonical complete 3,063-path sourceBody map SHA256/);
});


test('complete TAP summaries expose failures, cancellation, skip and todo states',()=>{
  const actual=parseSource2TapSummary('# tests 2\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 1\n# todo 0\n');
  assert.deepEqual(actual,{tests:2,pass:1,fail:0,cancelled:0,skipped:1,todo:0});
  assert.deepEqual(parseSource2TapSummary(''),{tests:null,pass:null,fail:null,cancelled:null,skipped:null,todo:null});
  const roster=syntheticRoster(),set=successfulReceiptSet(roster),base={...set,shardJobResult:'success',mmJobResult:'success',roster,currentIdentity:set.currentIdentity,currentConsumerSeal:set.currentConsumerSeal,currentReportReceipt:set.currentReportReceipt};
  const noCurrentIdentity={...base,currentIdentity:undefined};assert.throws(()=>validateSource2ReceiptSet(noCurrentIdentity),/fresh accepted Source2 identity/);
  const dirty=structuredClone(set.shardReceipts);dirty[0].trackedCheckoutAfter.trackedTreeClean=false;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:dirty}),/tracked checkout and dist clean/);
  const rosterDrift=structuredClone(set.shardReceipts);rosterDrift[0].sourceRosterUnchanged=false;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:rosterDrift}),/roster unchanged/);
  const rosterHashDrift=structuredClone(set.mmReceipt);rosterHashDrift.sourceRosterSha256After='0'.repeat(64);assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:rosterHashDrift}),/MM same exact roster hash/);
  const dirtyDist=structuredClone(set.mmReceipt);dirtyDist.distTrackedTreeCleanAfter=false;assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:dirtyDist}),/tracked checkout and dist clean/);
  const badMm=structuredClone(set.mmReceipt);badMm.historicalMmReplay.passed=18;badMm.historicalMmReplay.failed=1;assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:badMm}),/complete immutable 19-case MM replay/);
  const skippedMm=structuredClone(set.mmReceipt);skippedMm.historicalMmReplay.skipped=1;assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:skippedMm}),/complete immutable 19-case MM replay/);
  const shortMm=structuredClone(set.mmReceipt);shortMm.historicalMmReplay.actualAssertions=18;assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:shortMm}),/complete immutable 19-case MM replay/);
  const staleMmSource=structuredClone(set.mmReceipt);staleMmSource.sourceIdentityBefore.summary.sourceCommit='b'.repeat(40);staleMmSource.sourceIdentityAfter=structuredClone(staleMmSource.sourceIdentityBefore);assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:staleMmSource}),/MM exact current Source2 input-map and epoch pins/);
  const staleMmInput=structuredClone(set.mmReceipt);staleMmInput.sourceIdentityBefore.inputMapSha256.sourceBody='8'.repeat(64);staleMmInput.sourceIdentityAfter=structuredClone(staleMmInput.sourceIdentityBefore);assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:staleMmInput}),/MM exact current Source2 input-map and epoch pins/);
  const signaledMm=structuredClone(set.mmReceipt);signaledMm.signal='SIGTERM';assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:signaledMm}),/MM process clean with no signal/);
  const absentShardTap=structuredClone(set.shardReceipts);absentShardTap[0].tapSummary=null;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:absentShardTap}),/positive test count/);
  const incompleteShardTap=structuredClone(set.shardReceipts);incompleteShardTap[0].tapSummary.tests=9;assert.throws(()=>validateSource2ReceiptSet({...base,shardReceipts:incompleteShardTap}),/all tests pass/);
  const absentMmTap=structuredClone(set.mmReceipt);absentMmTap.tapSummary=null;assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:absentMmTap}),/historical MM: positive test count/);
  const incompleteMmTap=structuredClone(set.mmReceipt);incompleteMmTap.tapSummary.tests=18;assert.throws(()=>validateSource2ReceiptSet({...base,mmReceipt:incompleteMmTap}),/historical MM: all tests pass/);
});

test('runner child-pipe writer imports writeSync and records stdout/stderr, TAP, and digests',async()=>{
  assert.equal(typeof globalThis.writeSync,'undefined','the regression must not provide a global writeSync');
  const privateRoot=mkdtempSync(join(tmpdir(),'source2-runner-pipe-'));
  try{
    const modules=[
      'tools/class-mapping-source2-test-runner-core-v2.mjs',
      'tools/class-mapping-current-source-gate-v2.mjs',
      'tests/helpers/class-mapping-current-cohort-v2.mjs',
      'tests/helpers/class-mapping-current-cohort-factory-v2.mjs',
      'tools/class-mapping-frozen-parent-artifacts-v1.mjs',
      'tools/class-mapping-native-contract-v1.mjs',
      'tools/class-mapping-native-contract-v2.mjs',
      'tools/class-mapping-raw-git-v1.mjs',
      'tools/class-mapping-ci-tracked-checkout-v1.mjs',
      'tools/class-mapping-source2-test-receipt-core-v2.mjs',
      'tools/class-mapping-source2-test-roster-v2.mjs',
      'tools/class-mapping-source2-o-receipt-join-v1.mjs'
    ];
    for(const relativePath of modules){
      const bytes=readFileSync(resolve(repoRoot,relativePath));
      const destination=resolve(privateRoot,relativePath);
      mkdirSync(dirname(destination),{recursive:true});
      const instrumented=relativePath==='tools/class-mapping-source2-test-runner-core-v2.mjs'
        ?Buffer.concat([bytes,Buffer.from('\n// Test-only export; the module body and lexical imports above are unchanged.\nexport {runTestProcess};\n')])
        :bytes;
      writeFileSync(destination,instrumented,{flag:'wx',mode:0o600});
    }
    const childPath=resolve(privateRoot,'tests/runner-process-child.test.mjs');
    writeFileSync(childPath,
      "import test from 'node:test';\n"+
      "test('emits both child streams',()=>{process.stdout.write('SOURCE2_CHILD_STDOUT_SENTINEL\\n');process.stderr.write('SOURCE2_CHILD_STDERR_SENTINEL\\n');});\n",
      {flag:'wx',mode:0o600});
    const instrumentedRunner=await import(pathToFileURL(resolve(privateRoot,'tools/class-mapping-source2-test-runner-core-v2.mjs')).href);
    const childEnv={PATH:process.env.PATH||'/usr/bin:/bin',TMPDIR:privateRoot,TZ:'UTC',CI:'true',NODE_OPTIONS:''};
    const success=await instrumentedRunner.runTestProcess(['tests/runner-process-child.test.mjs'],childEnv,'runner-contract-success');
    assert.equal(success.status,0);assert.equal(success.signal,null);assert.equal(success.processError,null);
    assert.deepEqual(success.tapSummary,{tests:1,pass:1,fail:0,cancelled:0,skipped:0,todo:0});
    const successOut=success.logs.find(row=>row.path.endsWith('.tap'));
    const successErr=success.logs.find(row=>row.path.endsWith('.stderr'));
    assert.ok(successOut&&successErr);
    const successOutBytes=readFileSync(resolve(privateRoot,successOut.path));
    const successErrBytes=readFileSync(resolve(privateRoot,successErr.path));
    assert.match(successOutBytes.toString('utf8'),/TAP version 13/);
    assert.match(successOutBytes.toString('utf8'),/SOURCE2_CHILD_STDOUT_SENTINEL/);
    assert.match(successOutBytes.toString('utf8'),/SOURCE2_CHILD_STDERR_SENTINEL/);
    assert.equal(successOut.bytes,successOutBytes.length);assert.equal(successOut.sha256,sha(successOutBytes));
    assert.equal(successErr.bytes,successErrBytes.length);assert.equal(successErr.sha256,sha(successErrBytes));
    assert.equal(successErrBytes.length,0);

    // A controlled Node startup error is routed through the actual child stderr
    // pipe. It must be logged and hashed even though no TAP summary is available.
    const stderrCase=await instrumentedRunner.runTestProcess(['tests/runner-process-child.test.mjs'],
      {...childEnv,NODE_OPTIONS:'--not-a-real-node-option'},'runner-contract-stderr');
    assert.notEqual(stderrCase.status,0);assert.equal(stderrCase.signal,null);assert.equal(stderrCase.processError,null);
    assert.deepEqual(stderrCase.tapSummary,{tests:null,pass:null,fail:null,cancelled:null,skipped:null,todo:null});
    const stderrOut=stderrCase.logs.find(row=>row.path.endsWith('.tap'));
    const stderrLog=stderrCase.logs.find(row=>row.path.endsWith('.stderr'));
    assert.ok(stderrOut&&stderrLog);
    const stderrOutBytes=readFileSync(resolve(privateRoot,stderrOut.path));
    const stderrLogBytes=readFileSync(resolve(privateRoot,stderrLog.path));
    assert.equal(stderrOut.bytes,stderrOutBytes.length);assert.equal(stderrOut.sha256,sha(stderrOutBytes));
    assert.ok(stderrLogBytes.length>0);assert.match(stderrLogBytes.toString('utf8'),/NODE_OPTIONS/);
    assert.equal(stderrLog.bytes,stderrLogBytes.length);assert.equal(stderrLog.sha256,sha(stderrLogBytes));
  }finally{
    rmSync(privateRoot,{recursive:true,force:true});
  }
});

// V10 successor: every predecessor byte above remains an exact prefix. These
// cases use private disposable fixtures, never the active checkout's code bytes.
import {execFileSync as v10ExecFileSync} from 'node:child_process';
import {controlledGitEnvironment as v10GitEnvironment} from '../tools/class-mapping-raw-git-v1.mjs';
import {validateSource2V10OverlayDocument as v10ValidateOverlay} from '../tools/class-mapping-source2-test-roster-v3.mjs';
import {runSource2Tests as v10RunSource2Tests} from '../tools/class-mapping-source2-test-runner-core-v3.mjs';
import {SOURCE2_SHARD_CODE_PIN_PATHS as v10ShardPins,SOURCE2_MM_CODE_PIN_PATHS as v10MmPins} from '../tools/class-mapping-source2-test-receipt-core-v3.mjs';

function v10WriteFixture(root,path,bytes){const destination=resolve(root,path);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,bytes,{flag:'wx',mode:0o600});}
function v10ReplaceOne(source,before,after){assert.equal(source.split(before).length,2,`one exact fixture import seam: ${before}`);return source.replace(before,after);}
function v10CodePins(paths){return paths.map(path=>({path,sha256:sha(Buffer.from(`v10-receipt-fixture:${path}`)),sizeBytes:1}));}
function v10ClosedOverlayFixture(){
  const loaded=loadSource2MigrationDocument(repoRoot),d=structuredClone(loaded.document);
  d.artifactVersion=10;d.status='READY_FOR_SOURCE2_QUALIFICATION';
  d.v10Integration={status:'CLOSED_ACCEPTED_FOR_RUNTIME_QUALIFICATION',pending:[],
    frozenV9:{path:'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v9.json',sha256:loaded.sha256,sizeBytes:loaded.sizeBytes},
    stableSupportMappings:d.currentSuiteSemantics.source2SupportTests.map(row=>{const p={path:row.path,sha256:row.sha256,sizeBytes:row.sizeBytes};return {baselinePath:p.path,baselinePin:p,target:p};}),additionalSupportTests:[]};
  return d;
}
async function v10RuntimeFixture(){
  const privateRoot=mkdtempSync(join(tmpdir(),'source2-v10-runtime-contract-'));
  try{
    const authorityPath='tools/class-mapping-source2-runtime-code-authority-v10.mjs';
    let authoritySource=readFileSync(resolve(repoRoot,authorityPath),'utf8');
    const match=/const REQUIRED_TRANSITIVE_CODE_PATHS=Object\.freeze\((\[[^\n]+\])\);/.exec(authoritySource);
    assert.ok(match,'the actual production required-code declaration is present');
    const required=JSON.parse(match[1]),provider='research/v10-fixture/provider-source2-v1.mjs',template='research/v10-fixture/generated-template-v1.mjs';
    const paths=[...required,provider,template],bootstrap=['tools/v10-fixture-bootstrap.mjs'];
    for(const path of [...paths,...bootstrap])v10WriteFixture(privateRoot,path,Buffer.from(`// closed runtime fixture ${path}\nexport const fixtureValue=1;\n`));
    const document={v10Integration:{status:'CLOSED_ACCEPTED_FOR_RUNTIME_QUALIFICATION',pending:[],boundaries:{sourceBodyRows:3063,frozenReportCodeRows:104,frozenNative1ReaderCodeRows:175},runtimeCodeAuthority:{
      schema:'source2-typed-loaded-code-authority-v1',status:'CLOSED_ACCEPTED_TYPED_SOURCE_AND_RECIPE_AUTHORITY',physicalHeadCodeRows:paths.map(path=>{const bytes=readFileSync(resolve(privateRoot,path));return {id:'head:'+path,path,sha256:sha(bytes),sizeBytes:bytes.length,acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'};}),
      rawGitCodeRows:[],artifactRows:[],fixedContractBindings:[],decodedFixtureCodeRows:[],deterministicGeneratedCodeRows:[],parameterizedProducerContracts:[],emittedInstanceReceipts:[],contextEdges:[{fromId:'head:'+required[0],toId:'head:'+provider,kind:'static-import',specifier:'../../'+provider},{fromId:'head:'+required[0],toId:'head:'+template,kind:'static-import',specifier:'../../'+template}],rootCodeIds:['head:'+required[0]],unresolved:[],allLoadedTemplatesClassified:true}}};
    const manifestModule="export const SOURCE2_V10_REPO_ROOT="+JSON.stringify(privateRoot)+";\nexport const SOURCE2_V10_BOOTSTRAP_CODE_PATHS="+JSON.stringify(bootstrap)+";\nexport const fixtureDocument="+JSON.stringify(document)+";\nexport function readAcceptedSource2V10Manifest(){return {document:fixtureDocument,sha256:'a'.repeat(64)};}\n";
    v10WriteFixture(privateRoot,'tools/fixture-accepted-manifest.mjs',manifestModule);
    authoritySource=v10ReplaceOne(authoritySource,"'./class-mapping-source2-typed-runtime-contract-v1.mjs'",JSON.stringify(pathToFileURL(resolve(repoRoot,'tools/class-mapping-source2-typed-runtime-contract-v1.mjs')).href));
    authoritySource=v10ReplaceOne(authoritySource,"'./class-mapping-raw-git-v1.mjs'",JSON.stringify(pathToFileURL(resolve(repoRoot,'tools/class-mapping-raw-git-v1.mjs')).href));
    authoritySource=v10ReplaceOne(authoritySource,"'./class-mapping-source2-v10-accepted-manifest-v1.mjs'","'./fixture-accepted-manifest.mjs'");
    v10WriteFixture(privateRoot,'tools/runtime-authority-fixture.mjs',authoritySource);
    let receiptSource=readFileSync(resolve(repoRoot,'tools/class-mapping-source2-test-receipt-core-v3.mjs'),'utf8');
    for(const path of ['class-mapping-source2-v10-accepted-manifest-v1.mjs','class-mapping-source2-o-receipt-join-v2.mjs','class-mapping-source2-test-roster-v3.mjs'])receiptSource=v10ReplaceOne(receiptSource,JSON.stringify('./'+path).replaceAll('"',"'"),JSON.stringify(pathToFileURL(resolve(repoRoot,'tools',path)).href));
    receiptSource=v10ReplaceOne(receiptSource,"'./class-mapping-source2-runtime-code-authority-v10.mjs'","'./runtime-authority-fixture.mjs'");
    v10WriteFixture(privateRoot,'tools/receipt-core-fixture.mjs',receiptSource);
    const gitEnv={...v10GitEnvironment(),GIT_AUTHOR_NAME:'Source2 fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',GIT_COMMITTER_NAME:'Source2 fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid'};
    const git=(...argv)=>v10ExecFileSync('/usr/bin/git',argv,{cwd:privateRoot,env:gitEnv,stdio:'pipe'});
    git('init','-q');git('add','--all');git('commit','-q','-m','Private Source2 runtime contract fixture');
    const authority=await import(pathToFileURL(resolve(privateRoot,'tools/runtime-authority-fixture.mjs')).href);
    const receipt=await import(pathToFileURL(resolve(privateRoot,'tools/receipt-core-fixture.mjs')).href);
    const manifest=await import(pathToFileURL(resolve(privateRoot,'tools/fixture-accepted-manifest.mjs')).href);
    return {privateRoot,provider,template,authority,receipt,document:manifest.fixtureDocument};
  }catch(error){rmSync(privateRoot,{recursive:true,force:true});throw error;}
}
function v10SuccessfulReceiptSet(roster,proof){
  const set=successfulReceiptSet(roster);
  for(const receipt of [...set.shardReceipts,set.mmReceipt]){
    Object.assign(receipt,{integrationVersion:10,runtimeCodeAuthorityUnchanged:true,runtimeCodeAuthorityBefore:proof,runtimeCodeAuthorityAfter:proof});
    receipt.runnerCodePins=v10CodePins(receipt.mode==='shard'?v10ShardPins:v10MmPins);
  }
  return {...set,roster,shardJobResult:'success',mmJobResult:'success',currentRuntimeCodeAuthority:proof,
    currentCodePins:v10CodePins([...new Set([...v10ShardPins,...v10MmPins])])};
}

test('v10 fixed manifest and acceptance readers reject unsealed or caller-supplied pins before filesystem admission',async()=>{
  const privateRoot=mkdtempSync(join(tmpdir(),'source2-v10-unsealed-contract-'));
  try{
    let source=readFileSync(resolve(repoRoot,'tools/class-mapping-source2-v10-accepted-manifest-v1.mjs'),'utf8');
    for(const name of ['SOURCE2_V10_MANIFEST_PIN','SOURCE2_V10_ACCEPTANCE_PIN']){
      const pattern=new RegExp(`^export const ${name}=Object\\.freeze\\([^\\n]+\\);$`,'m');
      assert.equal([...source.matchAll(new RegExp(pattern.source,'gm'))].length,1,'one fixed pin declaration');
      source=source.replace(pattern,`export const ${name}=Object.freeze({path:'absent.json',sha256:null,sizeBytes:null,status:'UNSEALED_PENDING_CLOSED_ACCEPTANCE'});`);
    }
    v10WriteFixture(privateRoot,'tools/accepted-manifest-unsealed.mjs',source);
    const fixture=await import(pathToFileURL(resolve(privateRoot,'tools/accepted-manifest-unsealed.mjs')).href);
    assert.throws(()=>fixture.readAcceptedSource2V10Manifest(),/unsealed acceptance; reject before roster\/shard selection/);
    assert.throws(()=>fixture.readFixedV10Pin(fixture.SOURCE2_V10_ACCEPTANCE_PIN),/unsealed acceptance/);
    assert.throws(()=>fixture.readFixedV10Pin({...fixture.SOURCE2_V10_MANIFEST_PIN}),/only installed closed pins accepted/);
    assert.throws(()=>fixture.readAcceptedSource2V10Manifest({root:privateRoot}),/no caller root\/path\/hash\/fixture/);
  }finally{rmSync(privateRoot,{recursive:true,force:true});}
});

test('v10 overlay rejects unsealed documents and support collisions without filtering a target',()=>{
  assert.throws(()=>v10ValidateOverlay({...v10ClosedOverlayFixture(),status:'PENDING'}),/closed v10; no pending targets\/code/);
  const reviewReceipt={path:'tests/class-mapping-source2-runner-contract-v1.test.mjs',sha256:'0bd389d6b2c77270a2c4e8dfdb5d7cbee84ded2744ddec7a94daee56d96239eb',sizeBytes:38962};
  const duplicate=v10ClosedOverlayFixture();
  duplicate.v10Integration.additionalSupportTests=[{acceptance:'INDEPENDENTLY_REVIEWED_ADDITIONAL_SUPPORT',reviewReceipt,target:duplicate.v10Integration.stableSupportMappings[0].target}];
  assert.throws(()=>v10ValidateOverlay(duplicate),/supports disjoint; no collision filtered/);
  const familyCollision=v10ClosedOverlayFixture(),family=familyCollision.testFamilies[0];
  familyCollision.v10Integration.additionalSupportTests=[{acceptance:'INDEPENDENTLY_REVIEWED_ADDITIONAL_SUPPORT',reviewReceipt,target:{path:family.successorPath,sha256:family.successorSha256,sizeBytes:family.successorSizeBytes}}];
  assert.throws(()=>v10ValidateOverlay(familyCollision),/supports disjoint; no collision filtered/);
});

test('v10 runtime authority rejects missing, tampered, or uncovered loaded providers and templates',async()=>{
  const fixture=await v10RuntimeFixture();
  try{
    const proof=fixture.authority.verifySource2RuntimeCodeAuthority();
    assert.equal(fixture.authority.assertVerifiedSource2RuntimeCodeAuthority(proof),proof);
    assert.throws(()=>fixture.authority.assertVerifiedSource2RuntimeCodeAuthority({...proof}),/fresh installed zero-argument runtime-code verifier proof required/);
    assert.throws(()=>fixture.authority.verifySource2RuntimeCodeAuthority({root:fixture.privateRoot}),/no caller root\/hash\/manifest\/provider overrides/);
    for(const path of [fixture.provider,fixture.template]){
      const absolute=resolve(fixture.privateRoot,path),bytes=readFileSync(absolute);
      rmSync(absolute);
      assert.throws(()=>fixture.authority.verifySource2RuntimeCodeAuthority(),/ENOENT/);
      writeFileSync(absolute,Buffer.concat([bytes,Buffer.from('// tampered\n')]));
      assert.throws(()=>fixture.authority.verifySource2RuntimeCodeAuthority(),/actual code\/template equals authenticated checkout HEAD/);
      writeFileSync(absolute,bytes);
      const rows=fixture.document.v10Integration.runtimeCodeAuthority.physicalHeadCodeRows,index=rows.findIndex(row=>row.path===path),[removed]=rows.splice(index,1);
      assert.throws(()=>fixture.authority.verifySource2RuntimeCodeAuthority(),/resolved contextual source/);
      rows.splice(index,0,removed);
    }
    assert.equal(fixture.authority.verifySource2RuntimeCodeAuthority().allFixedCodeBytesVerified,true);
  }finally{rmSync(fixture.privateRoot,{recursive:true,force:true});}
});

test('v3 receipt reducer requires v10 integration, fresh runtime proof, and exact code pins across all five receipts',async()=>{
  const fixture=await v10RuntimeFixture();
  try{
    const proof=fixture.authority.verifySource2RuntimeCodeAuthority(),roster=acceptedRosterFixture().roster;
    const make=()=>v10SuccessfulReceiptSet(roster,proof);
    assert.equal(fixture.receipt.validateSource2ReceiptSet(make()).status,'success');
    for(let index=0;index<5;index++){
      const set=make(),receipts=[...set.shardReceipts,set.mmReceipt];receipts[index].integrationVersion=9;
      assert.throws(()=>fixture.receipt.validateSource2ReceiptSet(set),/exact v10 complete runtime-code receipt/);
      const drift=make(),driftReceipts=[...drift.shardReceipts,drift.mmReceipt];driftReceipts[index].runtimeCodeAuthorityAfter={...proof,authoritySha256:'0'.repeat(64)};
      assert.throws(()=>fixture.receipt.validateSource2ReceiptSet(drift),/all five jobs preserve exact current helpers\/templates\/bootstrap code/);
    }
    assert.throws(()=>fixture.receipt.validateSource2ReceiptSet({...make(),currentRuntimeCodeAuthority:{...proof}}),/fresh installed zero-argument runtime-code verifier proof required/);
    const missing=make();missing.shardReceipts[0].runnerCodePins.pop();
    assert.throws(()=>fixture.receipt.validateSource2ReceiptSet(missing),/exact runner-code pin count/);
    const tampered=make();tampered.mmReceipt.runnerCodePins[0].sha256='0'.repeat(64);
    assert.throws(()=>fixture.receipt.validateSource2ReceiptSet(tampered),/receipt code pin equals live accepted checkout bytes/);
  }finally{rmSync(fixture.privateRoot,{recursive:true,force:true});}
});

test('v3 runner rejects a spoofed canonical wrapper path from another actual process entrypoint',async()=>{
  for(const [mode,wrapper] of [['full','tools/run-class-mapping-tests-source2-full-v2.mjs'],['shard','tools/run-class-mapping-tests-source2-shard-v2.mjs']]){
    // The obsolete caller field is supplied deliberately. Actual process argv[1]
    // is this test file, so the production core must reject before parsing argv.
    await assert.rejects(v10RunSource2Tests({mode,argv:[],entrypointPath:wrapper}),/physical process entrypoint/);
  }
});

test('sealed v10 manifest requires the exact sealed accepted migration with no pending inputs',async()=>{
 const original=readFileSync(resolve(repoRoot,'tools/class-mapping-source2-v10-accepted-manifest-v1.mjs'),'utf8');
 const migration={schemaVersion:1,fixture:'exact closed migration input'},manifestBytes=Buffer.from(JSON.stringify(migration)+'\n');
 const variants=[['unsealed',/unsealed acceptance/],['missing',/ENOENT/],['tampered',/closed artifact bytes differ/],['pending',/closed root acceptance with no pending inputs required/],['wrong-status',/closed root acceptance with no pending inputs required/],['mismatch',/root acceptance migration must equal the exact installed manifest/],['accepted',null]];
 for(const [variant,message] of variants){
  const privateRoot=mkdtempSync(join(tmpdir(),'source2-v10-acceptance-join-'));
  try{
   const accepted={status:variant==='wrong-status'?'PENDING':'ROOT_ACCEPTED_CLOSED_V10_INTEGRATION',pending:variant==='pending'?['review']:[],migration:variant==='mismatch'?{...migration,fixture:'substituted'}:migration};
   const acceptanceBytes=Buffer.from(JSON.stringify(accepted)+'\n');
   const pins=[['SOURCE2_V10_MANIFEST_PIN',{path:'inputs/manifest.json',sha256:sha(manifestBytes),sizeBytes:manifestBytes.length,status:'SEALED_CLOSED_ACCEPTANCE'}],['SOURCE2_V10_ACCEPTANCE_PIN',{path:'inputs/acceptance.json',sha256:sha(acceptanceBytes),sizeBytes:acceptanceBytes.length,status:variant==='unsealed'?'UNSEALED_PENDING_CLOSED_ACCEPTANCE':'SEALED_CLOSED_ACCEPTANCE'}]];
   let source=original;
   for(const [name,pin] of pins){const pattern=new RegExp(`^export const ${name}=Object\\.freeze\\([^\\n]+\\);$`,'m');assert.equal([...source.matchAll(new RegExp(pattern.source,'gm'))].length,1);source=source.replace(pattern,`export const ${name}=Object.freeze(${JSON.stringify(pin)});`);}
   v10WriteFixture(privateRoot,'tools/accepted-manifest-joined.mjs',source);v10WriteFixture(privateRoot,'inputs/manifest.json',manifestBytes);
   if(variant!=='missing')v10WriteFixture(privateRoot,'inputs/acceptance.json',variant==='tampered'?Buffer.concat([acceptanceBytes,Buffer.from(' ')]):acceptanceBytes);
   const fixture=await import(pathToFileURL(resolve(privateRoot,'tools/accepted-manifest-joined.mjs')).href);
   if(message)assert.throws(()=>fixture.readAcceptedSource2V10Manifest(),message);else{const result=fixture.readAcceptedSource2V10Manifest();assert.deepEqual(result.document,migration);assert.equal(result.sha256,sha(manifestBytes));assert.equal(result.sizeBytes,manifestBytes.length);}
  }finally{rmSync(privateRoot,{recursive:true,force:true});}
 }
});

// V5 typed authority cases invoke only the pure byte contract below. They do not
// call production source gates, and no unbranded result can mint a runtime proof.
import {verifyTypedSource2RuntimeAuthorityContract as v5Verify} from '../tools/class-mapping-source2-typed-runtime-contract-v1.mjs';
import {gzipSync as v5Gzip} from 'node:zlib';
function v5Fixture(){
 const acceptance='ACCEPTED_AFTER_INDEPENDENT_REVIEW',heads=new Map(),rawFiles=new Map(),bindingDocument={bindings:[]};
 const digest=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
 const rawCommitBytes=Buffer.from('tree '+ 'e'.repeat(40)+'\nauthor Fixture <fixture@example.invalid> 1 +0000\ncommitter Fixture <fixture@example.invalid> 1 +0000\n\nHistorical fixture\n');
 const commit=createHash('sha1').update(`commit ${rawCommitBytes.length}\0`).update(rawCommitBytes).digest('hex');
 for(const [path,text] of [['lib/main.mjs','import "./shared.mjs"; export const era="head";\n'],['lib/shared.mjs','export const era="head";\n'],['lib/producer.mjs','import "./shared.mjs"; export const producer=true;\n']])heads.set(path,Buffer.from(text));
 rawFiles.set('lib/main.mjs',Buffer.from('import "./shared.mjs"; export const root="__ROOT__";\n'));rawFiles.set('lib/shared.mjs',Buffer.from('export const era="historical";\n'));
 const a={schema:'source2-typed-loaded-code-authority-v1',status:'CLOSED_ACCEPTED_TYPED_SOURCE_AND_RECIPE_AUTHORITY',physicalHeadCodeRows:[],rawGitCodeRows:[],artifactRows:[],fixedContractBindings:[],decodedFixtureCodeRows:[],deterministicGeneratedCodeRows:[],parameterizedProducerContracts:[],contextEdges:[],rootCodeIds:['head:lib/main.mjs'],emittedInstanceReceipts:[],unresolved:[],allLoadedTemplatesClassified:true};
 const fields=(r,names)=>Object.fromEntries(names.map(k=>[k,r[k]]));
 const pinned=(id,path,b)=>({id,path,sha256:sha(b),sizeBytes:b.length,acceptance});
 for(const [path,b] of heads)a.physicalHeadCodeRows.push(pinned('head:'+path,path,b));
 const bind=(row,value)=>{const id='binding:'+a.fixedContractBindings.length,pointer='/bindings/'+bindingDocument.bindings.length;bindingDocument.bindings.push(structuredClone(value));a.fixedContractBindings.push({id,artifactId:'artifact:contracts/runtime.json',selector:{kind:'json-pointer',pointer},expectedValue:structuredClone(value),producerCodeIds:['head:lib/producer.mjs'],acceptance});row.contractBindingId=id;};
 for(const [path,b] of rawFiles){const row={...pinned(`git:${commit}:${path}`,path,b),commit,tree:'e'.repeat(40),blobOid:digest(b)};bind(row,{kind:'raw-git-code',...fields(row,['id','commit','tree','blobOid','path','sha256','sizeBytes'])});a.rawGitCodeRows.push(row);}
 const historicalMain=a.rawGitCodeRows[0].id,historicalShared=a.rawGitCodeRows[1].id;
 const decodedBytes=Buffer.from('import "./shared.mjs"; export const decoded=true;\n'),fixtureBytes=v5Gzip(Buffer.from(JSON.stringify({files:{module:{utf8:decodedBytes.toString('utf8')}}})));
 heads.set('fixtures/code.json.gz',fixtureBytes);a.artifactRows.push({...pinned('artifact:fixtures/code.json.gz','fixtures/code.json.gz',fixtureBytes),storage:'physical-head'});
 const decoded={id:'decoded:fixture-module',logicalPath:'lib/decoded.mjs',inputIds:['artifact:fixtures/code.json.gz'],recipe:{baseInputId:'artifact:fixtures/code.json.gz',maxOutputBytes:4096,steps:[{op:'gunzip',maxOutputBytes:4096},{op:'jsonUtf8Member',pointer:'/files/module/utf8'}]},sha256:sha(decodedBytes),sizeBytes:decodedBytes.length,acceptance};bind(decoded,{kind:'decoded-fixture-code',...fields(decoded,['id','logicalPath','inputIds','recipe','sha256','sizeBytes'])});a.decodedFixtureCodeRows.push(decoded);
 const derivedBytes=Buffer.concat([decodedBytes,Buffer.from('export const derived=true;\n')]),derived={id:'derived:fixture-module',logicalPath:'lib/derived.mjs',generatorCodeId:'head:lib/producer.mjs',inputIds:[decoded.id],recipe:{baseInputId:decoded.id,maxOutputBytes:4096,steps:[{op:'appendUtf8',value:'export const derived=true;\n'}]},dependencyIds:['head:lib/shared.mjs'],sha256:sha(derivedBytes),sizeBytes:derivedBytes.length,acceptance};bind(derived,{kind:'deterministic-generated-code',...fields(derived,['id','logicalPath','generatorCodeId','inputIds','recipe','dependencyIds','sha256','sizeBytes'])});a.deterministicGeneratedCodeRows.push(derived);
 const edge=(fromId,toId,kind,specifier)=>{const row={fromId,toId,kind,specifier};if(kind!=='static-import'||fromId.startsWith('decoded:')||fromId.startsWith('derived:'))bind(row,{kind:'context-edge',fromId,toId,kind,specifier});a.contextEdges.push(row);};
 edge('head:lib/main.mjs','head:lib/shared.mjs','static-import','./shared.mjs');edge('head:lib/producer.mjs','head:lib/shared.mjs','static-import','./shared.mjs');edge(historicalMain,historicalShared,'static-import','./shared.mjs');edge(decoded.id,'head:lib/shared.mjs','static-import','./shared.mjs');edge(derived.id,'head:lib/shared.mjs','static-import','./shared.mjs');
 const parameterized={id:'producer:root-url-module',logicalPath:'lib/root-url.mjs',generatorCodeId:'head:lib/producer.mjs',inputIds:[historicalMain],recipe:{baseInputId:historicalMain,maxOutputBytes:4096,steps:[{op:'replaceStringAll',from:'"__ROOT__"',to:{parameter:'moduleURL',encoding:'json'},occurrences:1}]},dependencyIds:['head:lib/shared.mjs'],parameters:{moduleURL:{kind:'authenticated-head-module-file-url',targetId:'head:lib/shared.mjs',maxUtf8Bytes:4096}},outputBounds:{minBytes:1,maxBytes:4096},acceptance};bind(parameterized,{kind:'parameterized-producer-contract',...fields(parameterized,['id','logicalPath','generatorCodeId','inputIds','recipe','dependencyIds','parameters','outputBounds'])});a.parameterizedProducerContracts.push(parameterized);edge('head:lib/main.mjs',parameterized.id,'parameterized-emission','owned generated module');
 const refreshBindingArtifact=()=>{const bytes=Buffer.from(JSON.stringify(bindingDocument));heads.set('contracts/runtime.json',bytes);const row={...pinned('artifact:contracts/runtime.json','contracts/runtime.json',bytes),storage:'physical-head'},index=a.artifactRows.findIndex(x=>x.id===row.id);if(index<0)a.artifactRows.push(row);else a.artifactRows[index]=row;};refreshBindingArtifact();
 const io={headCommit:'a'.repeat(40),headTree:'b'.repeat(40),rootPhysical:'/private/typed-source-contract',requiredHeadPaths:[],bootstrapPaths:[],readHead:path=>{assert(heads.has(path));return heads.get(path);},readCommit:id=>{assert.equal(id,commit);return rawCommitBytes;},readRawGit:(id,path)=>{assert.equal(id,commit);assert(rawFiles.has(path));return rawFiles.get(path);}};
 return {a,io,heads,rawFiles,rawCommitBytes,commit,historicalMain,historicalShared,decoded,derived,parameterized,bindingDocument,refreshBindingArtifact,bind,edge,fields};
}
function v5Rebind(f,row){const binding=f.a.fixedContractBindings.find(x=>x.id===row.contractBindingId);assert(binding);const value={kind:binding.expectedValue.kind};for(const key of Object.keys(binding.expectedValue).filter(x=>x!=='kind'))value[key]=structuredClone(row[key]);binding.expectedValue=structuredClone(value);f.bindingDocument.bindings[Number(binding.selector.pointer.split('/').at(-1))]=value;f.refreshBindingArtifact();}

test('typed authority verifies separate HEAD, raw, decoded, derived and guarded-recipe denominators without emitted-byte claims',()=>{
 const f=v5Fixture(),result=v5Verify(f.a,f.io);
 assert.equal(result.qualifiedForRuntimePreflight,true);assert.equal(result.denominators.physicalHeadCodeRows,3);assert.equal(result.denominators.rawGitCodeRows,2);assert.equal(result.denominators.decodedFixtureCodeRows,1);assert.equal(result.denominators.deterministicGeneratedCodeRows,1);assert.equal(result.denominators.parameterizedProducerContracts,1);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.denominators.distinctFixedCodeContexts,7);
 assert.equal(result.allFixedCodeBytesVerified,true);assert.equal(result.allGuardedProducerContractsVerified,true);assert.equal(result.allExecutedCodeBytesVerified,false);
 assert.notEqual(result.rawGitCodePins[1].sha256,result.physicalHeadCodePins.find(x=>x.path==='lib/shared.mjs').sha256,'same pathname retains different historical and current bytes');
 assert.equal(result.rootDerivedExpectedRecipePins.length,1);assert.match(result.rootDerivedExpectedRecipePins[0].scope,/NOT_EMITTED_INSTANCE/);
 const expected=f.rawFiles.get('lib/main.mjs').toString('utf8').replace('"__ROOT__"',JSON.stringify('file:///private/typed-source-contract/lib/shared.mjs'));assert.equal(result.rootDerivedExpectedRecipePins[0].sha256,sha(Buffer.from(expected)));
});

test('typed authority rejects legacy pathname coverage, omitted groups, unresolved inputs and fabricated observations',()=>{
 const legacy=v5Fixture();legacy.a.codeRows=[];assert.throws(()=>v5Verify(legacy.a,legacy.io),/legacy pathname-only authority/);
 for(const key of ['rawGitCodeRows','decodedFixtureCodeRows','parameterizedProducerContracts','contextEdges']){const f=v5Fixture();delete f.a[key];assert.throws(()=>v5Verify(f.a,f.io),/explicit typed array/);}
 const unresolved=v5Fixture();unresolved.a.unresolved=['unknown VM source'];assert.throws(()=>v5Verify(unresolved.a,unresolved.io),/complete finite typed source classification/);
 const emitted=v5Fixture();emitted.a.emittedInstanceReceipts=[{claimed:true}];assert.throws(()=>v5Verify(emitted.a,emitted.io),/emitted observations cannot be fabricated/);
});

test('raw historical authority authenticates commit, tree, blob, digest and size rather than current same-path bytes',()=>{
 for(const [field,value,message] of [['tree','f'.repeat(40),/authenticated commit tree/],['blobOid','f'.repeat(40),/raw code blob OID/],['sha256','f'.repeat(64),/exact typed source bytes/],['sizeBytes',1,/exact typed source bytes/]]){const f=v5Fixture();f.a.rawGitCodeRows[0][field]=value;assert.throws(()=>v5Verify(f.a,f.io),message);}
 const commit=v5Fixture();commit.io.readCommit=()=>Buffer.concat([commit.rawCommitBytes,Buffer.from('changed')]);assert.throws(()=>v5Verify(commit.a,commit.io),/authenticated raw commit object/);
 const alias=v5Fixture();alias.io.readRawGit=(_commit,path)=>alias.heads.get(path);assert.throws(()=>v5Verify(alias.a,alias.io),/raw code blob OID/);
 const edge=v5Fixture();edge.a.contextEdges.find(x=>x.fromId===edge.historicalMain).toId='head:lib/shared.mjs';assert.throws(()=>v5Verify(edge.a,edge.io),/relative import resolves in the actual code context/);
});

test('decoded sealed members and deterministic outputs reject missing members, tampering, changed recipes and unbound dependencies',()=>{
 for(const data of [{files:{}},{files:{module:{utf8:'export const changed=true;'}}}]){const f=v5Fixture(),bytes=v5Gzip(Buffer.from(JSON.stringify(data))),row=f.a.artifactRows.find(x=>x.path==='fixtures/code.json.gz');f.heads.set(row.path,bytes);row.sha256=sha(bytes);row.sizeBytes=bytes.length;assert.throws(()=>v5Verify(f.a,f.io),/own JSON member|exact typed source bytes/);}
 const recipe=v5Fixture();recipe.derived.recipe.steps[0].value='export const changed=true;\n';assert.throws(()=>v5Verify(recipe.a,recipe.io),/exact authenticated fixed contract binding/);v5Rebind(recipe,recipe.derived);assert.throws(()=>v5Verify(recipe.a,recipe.io),/exact typed source bytes/);
 const producer=v5Fixture();producer.heads.set('lib/producer.mjs',Buffer.from('changed producer'));assert.throws(()=>v5Verify(producer.a,producer.io),/exact typed source bytes/);
 const dependencies=v5Fixture();dependencies.a.contextEdges=dependencies.a.contextEdges.filter(x=>x.fromId!==dependencies.derived.id);assert.throws(()=>v5Verify(dependencies.a,dependencies.io),/every generated\/producer dependency/);
 const bounded=v5Fixture();bounded.decoded.recipe.steps[0].maxOutputBytes=1;v5Rebind(bounded,bounded.decoded);assert.throws(()=>v5Verify(bounded.a,bounded.io));
});

test('guarded parameterized recipes reject historical-as-current URLs, wrong substitution counts and false output bounds',()=>{
 const context=v5Fixture();context.parameterized.parameters.moduleURL.targetId=context.historicalShared;v5Rebind(context,context.parameterized);assert.throws(()=>v5Verify(context.a,context.io),/root-derived URL uses authenticated current HEAD code/);
 const substitution=v5Fixture();substitution.parameterized.recipe.steps[0].occurrences=2;v5Rebind(substitution,substitution.parameterized);assert.throws(()=>v5Verify(substitution.a,substitution.io),/literal recipe replacement count/);
 const bounds=v5Fixture();bounds.parameterized.outputBounds={minBytes:5000,maxBytes:6000};v5Rebind(bounds,bounds.parameterized);assert.throws(()=>v5Verify(bounds.a,bounds.io),/expected recipe output bound/);
 const binding=v5Fixture();binding.bindingDocument.bindings[0].tree='f'.repeat(40);binding.refreshBindingArtifact();assert.throws(()=>v5Verify(binding.a,binding.io),/actual fixed contract artifact value/);
});

test('owned historical-root recipes permit preflight without invented temporary emitted instances',()=>{
 const f=v5Fixture(),row=f.parameterized;row.parameters={ownedRoot:{kind:'owned-historical-layout-root',commit:f.commit,tree:'e'.repeat(40),layoutNodeIds:[f.historicalMain,f.historicalShared],maxUtf8Bytes:4096}};
 const spec=row.parameters.ownedRoot;f.bind(spec,{kind:'historical-layout-contract',commit:spec.commit,tree:spec.tree,layoutNodeIds:spec.layoutNodeIds});row.recipe.steps[0].to={parameter:'ownedRoot',encoding:'json'};v5Rebind(f,row);
 const result=v5Verify(f.a,f.io);assert.equal(result.qualifiedForRuntimePreflight,true);assert.equal(result.denominators.parameterizedLoadEdges,1);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.rootDerivedExpectedRecipePins.length,0);assert.equal(result.allExecutedCodeBytesVerified,false);
 spec.layoutNodeIds=['head:lib/shared.mjs'];v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/historical layout uses exact raw context/);
});

test('decoded artifacts have separate bounded intermediate and final code limits',()=>{
 const f=v5Fixture(),member='export const decoded=true;\n',bytes=v5Gzip(Buffer.from(JSON.stringify({padding:'x'.repeat(32768),files:{module:{utf8:member}}}))),artifact=f.a.artifactRows.find(x=>x.path==='fixtures/code.json.gz');f.heads.set(artifact.path,bytes);artifact.sha256=sha(bytes);artifact.sizeBytes=bytes.length;
 f.decoded.recipe.maxOutputBytes=4096;f.decoded.recipe.maxIntermediateBytes=65536;f.decoded.recipe.steps[0].maxOutputBytes=65536;f.decoded.sha256=sha(Buffer.from(member));f.decoded.sizeBytes=Buffer.byteLength(member);v5Rebind(f,f.decoded);
 const derived=Buffer.from(member+'export const derived=true;\n');f.derived.sha256=sha(derived);f.derived.sizeBytes=derived.length;v5Rebind(f,f.derived);
 assert.equal(v5Verify(f.a,f.io).denominators.decodedFixtureCodeRows,1);
 f.decoded.recipe.maxIntermediateBytes=2**30;v5Rebind(f,f.decoded);assert.throws(()=>v5Verify(f.a,f.io),/bounded recipe intermediate bytes/);
});

test('parameterized derivation matches actual JavaScript dollar replacement semantics and bounded output',()=>{
 const f=v5Fixture();f.io.rootPhysical='/private/$&/$$/typed';
 const replacement=JSON.stringify('file:///private/$&/$$/typed/lib/shared.mjs'),expected=f.rawFiles.get('lib/main.mjs').toString('utf8').replaceAll('"__ROOT__"',replacement);
 assert.equal(v5Verify(f.a,f.io).rootDerivedExpectedRecipePins[0].sha256,sha(Buffer.from(expected)));
 f.parameterized.recipe.steps[0].to={concat:[{parameter:'moduleURL',encoding:'json'},'$`',"$'"]};v5Rebind(f,f.parameterized);
 const expanded=f.rawFiles.get('lib/main.mjs').toString('utf8').replaceAll('"__ROOT__"',replacement+'$`'+"$'");assert.equal(v5Verify(f.a,f.io).rootDerivedExpectedRecipePins[0].sha256,sha(Buffer.from(expanded)));
 f.parameterized.recipe.maxIntermediateBytes=256;f.parameterized.recipe.maxOutputBytes=256;f.parameterized.recipe.steps[0].to={concat:[{parameter:'moduleURL',encoding:'json'},'$`'.repeat(100)]};v5Rebind(f,f.parameterized);assert.throws(()=>v5Verify(f.a,f.io),/bounded ECMAScript replacement intermediate/);
});

test('typed installed runtime proof stays zero-argument, branded and deeply immutable',async()=>{
 const fixture=await v10RuntimeFixture();
 try{const proof=fixture.authority.verifySource2RuntimeCodeAuthority();assert.equal(proof.qualifiedForRuntimePreflight,true);assert.equal(proof.allExecutedCodeBytesVerified,false);assert.equal(proof.denominators.actualEmittedInstancesObserved,0);assert(Object.isFrozen(proof)&&Object.isFrozen(proof.denominators)&&Object.isFrozen(proof.physicalHeadCodePins)&&Object.isFrozen(proof.physicalHeadCodePins[0]));assert.throws(()=>{proof.physicalHeadCodePins[0].sha256='0'.repeat(64);},TypeError);assert.throws(()=>fixture.authority.verifySource2RuntimeCodeAuthority({root:fixture.privateRoot}),/no caller root\/hash\/manifest\/provider overrides/);assert.throws(()=>fixture.authority.assertVerifiedSource2RuntimeCodeAuthority({...proof}),/fresh installed zero-argument runtime-code verifier proof required/);}finally{rmSync(fixture.privateRoot,{recursive:true,force:true});}
});
