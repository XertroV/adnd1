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

// V6 concrete fixture recipes; all prior V5 bytes and callbacks remain above.
import {runInNewContext as v6RunInNewContext} from 'node:vm';
function v6AddSource(f,path,bytes,artifact=false){bytes=Buffer.from(bytes);f.heads.set(path,bytes);const row={id:(artifact?'artifact:':'head:')+path,path,sha256:sha(bytes),sizeBytes:bytes.length,acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW',...(artifact?{storage:'physical-head'}:{})};(artifact?f.a.artifactRows:f.a.physicalHeadCodeRows).push(row);return row.id;}
function v6Bind(f,row,value,ownerId){f.bind(row,value);f.a.fixedContractBindings.at(-1).producerCodeIds=[ownerId];}
function v6Derived(f,ownerId,id,inputIds,recipe,expected){const row={id:'derived:'+id,logicalPath:'private/'+id+'.mjs',generatorCodeId:ownerId,inputIds,recipe,dependencyIds:[],sha256:sha(expected),sizeBytes:expected.length,proofScope:'ISOLATED_TEST_FIXTURE_ONLY',acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'};v6Bind(f,row,{kind:'deterministic-generated-code',...f.fields(row,['id','logicalPath','generatorCodeId','inputIds','recipe','dependencyIds','sha256','sizeBytes','proofScope'])},ownerId);f.a.deterministicGeneratedCodeRows.push(row);f.edge(ownerId,row.id,'derived-load','isolated concrete fixture');f.a.fixedContractBindings.at(-1).producerCodeIds=[ownerId];f.refreshBindingArtifact();return row;}
function v6Producer(f,row){v6Bind(f,row,{kind:'parameterized-producer-contract',...f.fields(row,['id','logicalPath','generatorCodeId','inputIds','recipe','dependencyIds','parameters','outputBounds','proofScope'])},row.generatorCodeId);f.a.parameterizedProducerContracts.push(row);f.edge(row.generatorCodeId,row.id,'parameterized-emission','isolated concrete fixture');f.a.fixedContractBindings.at(-1).producerCodeIds=[row.generatorCodeId];f.refreshBindingArtifact();return row;}
function v6GeneratedPin(f,id){return v5Verify(f.a,f.io).deterministicGeneratedCodePins.find(row=>row.id===id);}
function v6PinMaskLoop(owner,json=false){const start=owner.indexOf(json?'   for(const [name,pin] of pins){':"    for(const name of ['SOURCE2_V10_MANIFEST_PIN','SOURCE2_V10_ACCEPTANCE_PIN']){");assert(start>=0,'actual support generator loop');const end=owner.indexOf(json?'\n   v10WriteFixture':'\n    v10WriteFixture',start);assert(end>start);return owner.slice(start,end);}

test('named pin masking matches actual support generators without embedding installed final hashes',()=>{
 const owner=readFileSync(resolve(repoRoot,'tests/class-mapping-source2-runner-contract-v3.test.mjs'),'utf8'),template=readFileSync(resolve(repoRoot,'tools/class-mapping-source2-v10-accepted-manifest-v1.mjs'),'utf8');
 for(const serialization of ['legacy-unsealed-literal','json']){
  const loop=v6PinMaskLoop(owner,serialization==='json'),pins=['SOURCE2_V10_MANIFEST_PIN','SOURCE2_V10_ACCEPTANCE_PIN'].map(name=>[name,serialization==='json'?{path:name==='SOURCE2_V10_MANIFEST_PIN'?'inputs/manifest.json':'inputs/acceptance.json',sha256:'c'.repeat(64),sizeBytes:42,status:'SEALED_CLOSED_ACCEPTANCE'}:{path:'absent.json',sha256:null,sizeBytes:null,status:'UNSEALED_PENDING_CLOSED_ACCEPTANCE'}]);
  const hashes=['a'.repeat(64),'b'.repeat(64)],outputs=[];
  for(const installedHash of hashes){let installed=template;for(const name of ['SOURCE2_V10_MANIFEST_PIN','SOURCE2_V10_ACCEPTANCE_PIN'])installed=installed.replace(new RegExp(`^export const ${name}=Object\\.freeze\\([^\\n]+\\);$`,'m'),`export const ${name}=Object.freeze(${JSON.stringify({path:'research/installed.json',sha256:installedHash,sizeBytes:500,status:'SEALED_CLOSED_ACCEPTANCE'})});`);
   const expected=v6RunInNewContext('let source=input;\n'+loop+'\nsource',{input:installed,pins,assert}),f=v5Fixture(),ownerId=v6AddSource(f,'tests/fixture-pin-owner.test.mjs',owner);
   f.heads.set('tools/class-mapping-source2-v10-accepted-manifest-v1.mjs',Buffer.from(installed));f.io.bootstrapPaths=['tools/class-mapping-source2-v10-accepted-manifest-v1.mjs'];
   const recipe={baseInputId:'head:tools/class-mapping-source2-v10-accepted-manifest-v1.mjs',maxOutputBytes:65536,steps:pins.map(([name,pin])=>({op:'replaceFixedPinDeclaration',name,pin,serialization}))},row=v6Derived(f,ownerId,'masked-'+serialization,[recipe.baseInputId],recipe,Buffer.from(expected));
   assert(!JSON.stringify(recipe).includes(installedHash),'recipe has no installed final hash input');assert(!JSON.stringify(f.a).includes(installedHash),'manifest data has no bootstrap self hash');assert.equal(v6GeneratedPin(f,row.id).sha256,sha(Buffer.from(expected)));outputs.push(expected);
   row.recipe.steps[0].name='UNREVIEWED_PIN';v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/only two installed V10 pin declarations/);
  }
  assert.equal(outputs[0],outputs[1],'mask output is independent of installed pin literal values');
 }
});

test('owned private fixture roots match the actual manifest constructor and remain distinct from historical roots',()=>{
 const owner=readFileSync(resolve(repoRoot,'tests/class-mapping-source2-runner-contract-v3.test.mjs'),'utf8'),start=owner.indexOf('\n    const manifestModule=')+1,end=owner.indexOf('\n    v10WriteFixture(privateRoot,',start);assert(start>0&&end>start);const actual=privateRoot=>v6RunInNewContext(owner.slice(start,end)+'\nmanifestModule',{privateRoot,bootstrap:['tools/v10-fixture-bootstrap.mjs'],document:{v10Integration:{fixture:true}}});
 const sentinel='__OWNED_PRIVATE_ROOT_SENTINEL__',template=actual(sentinel),parts=template.split(JSON.stringify(sentinel));assert.equal(parts.length,2);
 const f=v5Fixture(),ownerId=v6AddSource(f,'tests/fixture-private-owner.test.mjs',owner),prefix=v6AddSource(f,'fixtures/private-prefix.txt',parts[0],true),suffix=v6AddSource(f,'fixtures/private-suffix.txt',parts[1],true);
 for(const [index,value] of ['/private/owned-root',"/private/$&/quote'root"].entries()){const recipe={baseInputId:prefix,maxOutputBytes:65536,steps:[{op:'appendUtf8',value:JSON.stringify(value)},{op:'appendInput',inputId:suffix}]},row=v6Derived(f,ownerId,'private-literal-'+index,[prefix,suffix],recipe,Buffer.from(actual(value)));assert.equal(v6GeneratedPin(f,row.id).sha256,sha(Buffer.from(actual(value))));}
 const spec={kind:'owned-private-fixture-root',ownerCodeId:ownerId,sourceNodeIds:[ownerId,prefix,suffix],rootPolicy:'OWNED_MKDTEMP_OUTSIDE_CHECKOUT',maxUtf8Bytes:4096};v6Bind(f,spec,{kind:'private-fixture-layout-contract',ownerCodeId:ownerId,sourceNodeIds:spec.sourceNodeIds,rootPolicy:spec.rootPolicy,proofScope:'ISOLATED_TEST_FIXTURE_ONLY'},ownerId);
 const row=v6Producer(f,{id:'producer:owned-private-manifest',logicalPath:'private/manifest.mjs',generatorCodeId:ownerId,inputIds:[prefix,suffix],recipe:{baseInputId:prefix,maxOutputBytes:65536,steps:[{op:'appendUtf8',value:{parameter:'privateRoot',encoding:'json'}},{op:'appendInput',inputId:suffix}]},dependencyIds:[],parameters:{privateRoot:spec},outputBounds:{minBytes:1,maxBytes:65536},proofScope:'ISOLATED_TEST_FIXTURE_ONLY',acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'});
 const result=v5Verify(f.a,f.io);assert.equal(result.parameterDomainCounts['owned-private-fixture-root'],1);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert(!result.rootDerivedExpectedRecipePins.some(x=>x.producerContractId===row.id));assert.equal(result.allExecutedCodeBytesVerified,false);
 row.proofScope='GUARDED_RUNTIME_SOURCE_RECIPE';v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/isolated test-only generator scope/);row.proofScope='ISOLATED_TEST_FIXTURE_ONLY';spec.commit=f.commit;v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/actual private fixture owner\/root policy/);
});

test('synthetic SHA and byte-size repinning matches the actual isolated V9 fixture generator',()=>{
 const path='tests/class-mapping-test-source-transition-guard-v1.test.mjs',owner=readFileSync(resolve(repoRoot,path),'utf8'),start=owner.indexOf('function writeSyntheticV9Fixture(root,inputDocument){'),end=owner.indexOf('\nfunction buildAcceptedCollectRosterFixture',start);assert(start>=0&&end>start);
 const corePath='tools/class-mapping-test-sharding-core-v2.mjs',lineagePath='tools/class-mapping-test-source-lineage-v2.mjs',coreBytes=readFileSync(resolve(repoRoot,corePath)),lineage=readFileSync(resolve(repoRoot,lineagePath)),written=new Map(),virtualRoot='/virtual/owned-fixture';
 v6RunInNewContext(owner.slice(start,end)+'\nwriteSyntheticV9Fixture(root,inputDocument);',{root:virtualRoot,inputDocument:{artifactType:'input',transitions:[{path:'tests/a.test.mjs'}],ancestry:{old:true},revisions:['old']},proposedRoot:'/virtual/source',structuredClone,Buffer,sha,join,dirname,resolve,mkdirSync:()=>{},writeFileSync:(path,bytes)=>{assert(path.startsWith(virtualRoot+'/'));written.set(path,Buffer.from(bytes));},readFileSync:(path,encoding)=>{const bytes=path==='/virtual/source/'+corePath?coreBytes:path==='/virtual/source/'+lineagePath?lineage:null;assert(bytes,'closed actual generator read');return encoding?bytes.toString(encoding):bytes;}});
 const evidence='research/class-mapping-ci-sharding-v1/test-source-transition-v1/',parent=written.get(virtualRoot+'/'+evidence+'migrations-v8.json'),child=written.get(virtualRoot+'/'+evidence+'migrations-v9.json'),expected=written.get(virtualRoot+'/'+corePath);assert(parent&&child&&expected);
 const f=v5Fixture(),ownerId=v6AddSource(f,path,owner),coreId=v6AddSource(f,corePath,coreBytes),parentId=v6AddSource(f,'fixtures/synthetic-parent.json',parent,true),childId=v6AddSource(f,'fixtures/synthetic-child.json',child,true),parameters={};
 for(const [name,sourceRole,sourceArtifactId,kind] of [['childSha','synthetic-child-json',childId,'test-control-lowerhex64'],['childSize','synthetic-child-json',childId,'test-control-byte-size'],['parentSha','synthetic-parent-json',parentId,'test-control-lowerhex64'],['parentSize','synthetic-parent-json',parentId,'test-control-byte-size']]){const size=kind==='test-control-byte-size',spec={kind,generatorCodeId:ownerId,sourceRole,sourceArtifactId,maxUtf8Bytes:size?9:64,...(size?{minimumBytes:1,maximumBytes:134217728}:{})};v6Bind(f,spec,{kind:'isolated-test-control-contract',generatorCodeId:ownerId,controlKind:kind,sourceRole,...(size?{minimumBytes:1,maximumBytes:134217728}:{}),sourceArtifactId,proofScope:'ISOLATED_TEST_FIXTURE_ONLY'},ownerId);parameters[name]=spec;}
 const names=[['TEST_SOURCE_MIGRATIONS_SHA256','childSha'],['TEST_SOURCE_MIGRATIONS_SIZE_BYTES','childSize'],['R7_PARENT_MIGRATIONS_SHA256','parentSha'],['R7_PARENT_MIGRATIONS_SIZE_BYTES','parentSize']],row=v6Producer(f,{id:'producer:synthetic-core',logicalPath:'private/synthetic-core.mjs',generatorCodeId:ownerId,inputIds:[coreId],recipe:{baseInputId:coreId,maxOutputBytes:coreBytes.length+1024,steps:names.map(([name,parameter])=>({op:'replaceSyntheticControlDeclaration',name,value:{parameter,encoding:'utf8'}}))},dependencyIds:[],parameters,outputBounds:{minBytes:1,maxBytes:coreBytes.length+1024},proofScope:'ISOLATED_TEST_FIXTURE_ONLY',acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'});
 let result=v5Verify(f.a,f.io);assert.equal(result.rootDerivedExpectedRecipePins.find(x=>x.producerContractId===row.id).sha256,sha(expected));assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.parameterDomainCounts['test-control-lowerhex64'],2);assert.equal(result.parameterDomainCounts['test-control-byte-size'],2);
 row.recipe.steps[0].value="not-a-hash; process.exit()";v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/bounded synthetic hash\/decimal replacement/);row.recipe.steps[0].value={parameter:'childSha',encoding:'utf8'};row.recipe.steps[0].name='SOURCE2_BODY_COMMIT';v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/only four synthetic test migration constants/);row.recipe.steps[0].name=names[0][0];parameters.childSha.maxUtf8Bytes=63;v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/narrow lowerhex64 or decimal byte-size domain/);parameters.childSha.maxUtf8Bytes=64;
 const spec=parameters.childSha,binding=f.a.fixedContractBindings.find(x=>x.id===spec.contractBindingId);delete spec.sourceArtifactId;delete binding.expectedValue.sourceArtifactId;f.bindingDocument.bindings[Number(binding.selector.pointer.split('/').at(-1))]=structuredClone(binding.expectedValue);v5Rebind(f,row);result=v5Verify(f.a,f.io);assert(!result.rootDerivedExpectedRecipePins.some(x=>x.producerContractId===row.id),'unknown per-job test control is never an observed output');assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.allExecutedCodeBytesVerified,false);
});

test('authenticated module paths match the actual workflow VM rewrite and remain distinct from file URLs',()=>{
 const ownerPath='tests/class-mapping-test-sharding-contract-source2-v4.test.mjs',owner=readFileSync(resolve(repoRoot,ownerPath),'utf8'),at=owner.indexOf('executable=entrypoint.split('),end=owner.indexOf(';',at);assert(at>=0&&end>at);const actualExpression=owner.slice(at+'executable='.length,end);
 for(const version of [1,2]){const path=`tools/run-class-mapping-tests-source2-shard-v${version}.mjs`,source=readFileSync(resolve(repoRoot,path),'utf8'),f=v5Fixture(),ownerId=v6AddSource(f,ownerPath,owner),input=v6AddSource(f,path,source),imports=source.split('\n').filter(line=>line.startsWith('import '));assert.equal(imports.length,3);
  const steps=imports.map(line=>({op:'replaceStringAll',from:line+'\n',to:'',occurrences:1}));steps.push({op:'replaceStringAll',from:'fileURLToPath(import.meta.url)',to:{parameter:'entrypoint',encoding:'json'},occurrences:1});
  const row=v6Producer(f,{id:'producer:wrapper-v'+version,logicalPath:'private/wrapper-v'+version+'.mjs',generatorCodeId:ownerId,inputIds:[input],recipe:{baseInputId:input,maxOutputBytes:16384,steps},dependencyIds:[],parameters:{entrypoint:{kind:'authenticated-head-module-path',targetId:input,maxUtf8Bytes:4096}},outputBounds:{minBytes:1,maxBytes:16384},proofScope:'ISOLATED_TEST_FIXTURE_ONLY',acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'});
  const absoluteEntrypoint=resolve(f.io.rootPhysical,path),expected=v6RunInNewContext('('+actualExpression+')',{entrypoint:source,absoluteEntrypoint});assert.equal(v5Verify(f.a,f.io).rootDerivedExpectedRecipePins.find(x=>x.producerContractId===row.id).sha256,sha(Buffer.from(expected)));assert(!absoluteEntrypoint.startsWith('file:'));
  row.parameters.entrypoint.kind='authenticated-head-module-file-url';assert.throws(()=>v5Verify(f.a,f.io),/exact authenticated fixed contract binding/);
 }
});

test('authenticated checkout roots and citation URLs match the actual literal frozen-adapter generator',()=>{
 const ownerPath='research/dmg175-continuation-alias-audit-v2/frozen-before-adapter-v2.mjs',owner=readFileSync(resolve(repoRoot,ownerPath),'utf8'),beforePath='research/dmg175-continuation-alias-audit-v2/continuation-alias-audit-before-v1.mjs',before=readFileSync(resolve(repoRoot,beforePath)),citationPath='tools/citation-context-contract.mjs',citation=readFileSync(resolve(repoRoot,citationPath));assert.equal(sha(before),owner.match(/const expectedSha256='([a-f0-9]{64})'/)[1]);
 const helper=owner.slice(owner.indexOf('function replaceExactlyOnce('),owner.indexOf('\n\nexport async function')),start=owner.indexOf(' source=replaceExactlyOnce(source,'),end=owner.indexOf('\n // The original CLI',start);assert(start>=0&&end>start);
 const f=v5Fixture();f.io.rootPhysical='/private/$&/adapter';const ownerId=v6AddSource(f,ownerPath,owner),input=v6AddSource(f,beforePath,before),citationId=v6AddSource(f,citationPath,citation);
 const expected=v6RunInNewContext('let source=input;\n'+helper+'\n'+owner.slice(start,end)+'\nsource',{input:before.toString('utf8'),repoRoot:f.io.rootPhysical,resolve,pathToFileURL,assert});
 f.edge(ownerId,citationId,'dynamic-import','guarded sourceRect import');f.a.fixedContractBindings.at(-1).producerCodeIds=[ownerId];
 const row=v6Producer(f,{id:'producer:literal-frozen-adapter',logicalPath:'private/frozen-adapter.mjs',generatorCodeId:ownerId,inputIds:[input],recipe:{baseInputId:input,maxOutputBytes:before.length+16384,steps:[{op:'replaceLiteralAll',from:"import {sourceRect} from './citation-context-contract.mjs';",to:{concat:['import {sourceRect} from ',{parameter:'citationURL',encoding:'json'},';']},occurrences:1},{op:'replaceLiteralAll',from:"const root=resolve(import.meta.dirname,'..');",to:{concat:['const root=resolve(',{parameter:'checkoutRoot',encoding:'json'},');']},occurrences:1}]},dependencyIds:[citationId],parameters:{citationURL:{kind:'authenticated-head-module-file-url',targetId:citationId,maxUtf8Bytes:4096},checkoutRoot:{kind:'authenticated-checkout-root',maxUtf8Bytes:4096}},outputBounds:{minBytes:1,maxBytes:before.length+16384},proofScope:'GUARDED_RUNTIME_SOURCE_RECIPE',acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'});
 assert.equal(v5Verify(f.a,f.io).rootDerivedExpectedRecipePins.find(x=>x.producerContractId===row.id).sha256,sha(Buffer.from(expected)));row.recipe.steps[0].op='replaceStringAll';v5Rebind(f,row);assert.notEqual(v5Verify(f.a,f.io).rootDerivedExpectedRecipePins.find(x=>x.producerContractId===row.id).sha256,sha(Buffer.from(expected)),'native dollar replacement must not be substituted for actual slice concatenation');
});

test('fixed UTF8 byte slices match actual selected app and viewer VM generators',()=>{
 for(const [ownerPath,inputPath,first,last] of [['tests/source-viewer-focus-source2-v2.test.mjs','dist/source-viewer.js','const start=source.indexOf(','\nconst ctx'],['tests/advancement-source2-v2.test.mjs','dist/app.js','const start = app.indexOf(','\nassert.ok']]){
  const owner=readFileSync(resolve(repoRoot,ownerPath),'utf8'),bytes=readFileSync(resolve(repoRoot,inputPath)),source=bytes.toString('utf8'),a=owner.indexOf(first),z=owner.indexOf(last,a);assert(a>=0&&z>a);const bounds=v6RunInNewContext(owner.slice(a,z)+'\n({start,end})',{source,app:source});assert(bounds.start>=0&&bounds.end>bounds.start);
  const f=v5Fixture(),ownerId=v6AddSource(f,ownerPath,owner),input=v6AddSource(f,inputPath,bytes),start=Buffer.byteLength(source.slice(0,bounds.start)),end=Buffer.byteLength(source.slice(0,bounds.end)),expected=Buffer.from(source.slice(bounds.start,bounds.end)),row=v6Derived(f,ownerId,'actual-slice-'+(inputPath.includes('viewer')?'viewer':'app'),[input],{baseInputId:input,maxOutputBytes:bytes.length,steps:[{op:'sliceBytes',start,end}]},expected);assert.equal(v6GeneratedPin(f,row.id).sha256,sha(expected));row.recipe.steps[0].end=bytes.length+1;v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/fixed bounded source byte slice/);
 }
 const f=v5Fixture(),ownerId=v6AddSource(f,'tests/unicode-slice-owner.test.mjs','// bounded Unicode fixture\n'),text='// π😀\nexport const value=1;\n',bytes=Buffer.from(text),input=v6AddSource(f,'private/unicode.js',bytes),start=Buffer.byteLength('// π😀\n'),expected=Buffer.from('export const value=1;\n'),row=v6Derived(f,ownerId,'unicode-slice',[input],{baseInputId:input,maxOutputBytes:bytes.length,steps:[{op:'sliceBytes',start,end:bytes.length}]},expected);assert.equal(v6GeneratedPin(f,row.id).sha256,sha(expected));row.recipe.steps[0].start=4;v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/slice preserves exact UTF8 source bytes/);
});

test('declaration masking rejects duplicate or executable pin bodies and nonfixture scope',()=>{
 const f=v5Fixture(),owner=v6AddSource(f,'tests/pin-data-owner.test.mjs','// isolated pin data owner\n'),path='tools/class-mapping-source2-v10-accepted-manifest-v1.mjs',name='SOURCE2_V10_MANIFEST_PIN',pin={path:'absent.json',sha256:null,sizeBytes:null,status:'UNSEALED_PENDING_CLOSED_ACCEPTANCE'},original=`export const ${name}=Object.freeze({path:'research/installed.json',sha256:null,sizeBytes:null,status:'UNSEALED_PENDING_CLOSED_ACCEPTANCE'});\n`,expected=Buffer.from(`export const ${name}=Object.freeze(${JSON.stringify(pin)});\n`);f.heads.set(path,Buffer.from(original));f.io.bootstrapPaths=[path];const row=v6Derived(f,owner,'pin-data-only',['head:'+path],{baseInputId:'head:'+path,maxOutputBytes:4096,steps:[{op:'replaceFixedPinDeclaration',name,pin,serialization:'json'}]},expected);assert.equal(v6GeneratedPin(f,row.id).sha256,sha(expected));
 f.heads.set(path,Buffer.from(original+original));assert.throws(()=>v5Verify(f.a,f.io),/one fixed named pin declaration/);f.heads.set(path,Buffer.from(`export const ${name}=Object.freeze((()=>({path:'research/installed.json'}))());\n`));assert.throws(()=>v5Verify(f.a,f.io),/literal installed pin object only/);f.heads.set(path,Buffer.from(original));row.proofScope='GUARDED_RUNTIME_SOURCE_RECIPE';v5Rebind(f,row);assert.throws(()=>v5Verify(f.a,f.io),/isolated test-only generator scope/);
});
// V7 authenticated producer contexts; the complete 92,782-byte V6 source remains above.
function v7Edge(f,ownerId,fromId,toId,kind,specifier){f.edge(fromId,toId,kind,specifier);f.a.fixedContractBindings.at(-1).producerCodeIds=[ownerId];f.refreshBindingArtifact();return f.a.contextEdges.at(-1);}
function v7FixtureGraph(){
 const f=v5Fixture();f.io.rootPhysical=repoRoot;
 const ownerPath='tests/class-mapping-source2-runner-contract-v4.test.mjs',ownerId=v6AddSource(f,ownerPath,readFileSync(resolve(repoRoot,ownerPath))),source=v10RuntimeFixture.toString(),start=source.indexOf('    const authorityPath='),end=source.indexOf('    const gitEnv=',start);assert(start>=0&&end>start);
 const virtualRoot='__OWNED_PRIVATE_ROOT_SENTINEL__',written=new Map(),actual=v6RunInNewContext(source.slice(start,end)+'\n({manifestModule,authoritySource,receiptSource})',{privateRoot:virtualRoot,repoRoot,resolve,Buffer,sha,assert,pathToFileURL,v10ReplaceOne,v10WriteFixture:(root,path,bytes)=>{assert.equal(root,virtualRoot);written.set(resolve(root,path),Buffer.from(bytes));},readFileSync:(path,encoding)=>{const bytes=written.get(path)??readFileSync(path);return encoding?bytes.toString(encoding):bytes;}});
 f.a.rootCodeIds.push(ownerId);
 const paths=['tools/class-mapping-source2-runtime-code-authority-v10.mjs','tools/class-mapping-source2-test-receipt-core-v3.mjs','tools/class-mapping-source2-typed-runtime-contract-v1.mjs','tools/class-mapping-raw-git-v1.mjs','tools/class-mapping-source2-v10-accepted-manifest-v1.mjs','tools/class-mapping-source2-o-receipt-join-v2.mjs','tools/class-mapping-source2-test-roster-v3.mjs'];
 for(const path of paths)v6AddSource(f,path,readFileSync(resolve(repoRoot,path)));
 const parts=actual.manifestModule.split(JSON.stringify(virtualRoot));assert.equal(parts.length,2);const artifact=v6AddSource(f,'fixtures/v7-manifest-prefix.json',JSON.stringify({prefix:parts[0]}),true),scope='ISOLATED_TEST_FIXTURE_ONLY',spec={kind:'owned-private-fixture-root',ownerCodeId:ownerId,sourceNodeIds:[ownerId,artifact],rootPolicy:'OWNED_MKDTEMP_OUTSIDE_CHECKOUT',maxUtf8Bytes:4096};
 v6Bind(f,spec,{kind:'private-fixture-layout-contract',ownerCodeId:ownerId,sourceNodeIds:spec.sourceNodeIds,rootPolicy:spec.rootPolicy,proofScope:scope},ownerId);
 const base={generatorCodeId:ownerId,outputBounds:{minBytes:1,maxBytes:1048576},proofScope:scope,acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'};
 const manifest=v6Producer(f,{...base,id:'producer:v7-private-manifest',logicalPath:'tools/fixture-accepted-manifest.mjs',inputIds:[artifact],recipe:{baseInputId:artifact,maxOutputBytes:1048576,steps:[{op:'jsonUtf8Member',pointer:'/prefix'},{op:'appendUtf8',value:{parameter:'privateRoot',encoding:'json'}},{op:'appendUtf8',value:parts[1]}]},dependencyIds:[],parameters:{privateRoot:spec}});
 const head=path=>'head:'+path,url=targetId=>({kind:'authenticated-head-module-file-url',targetId,maxUtf8Bytes:4096}),replace=(from,to)=>({op:'replaceStringAll',from,to,occurrences:1});
 const authority=v6Producer(f,{...base,id:'producer:v7-private-authority',logicalPath:'tools/runtime-authority-fixture.mjs',inputIds:[head(paths[0])],recipe:{baseInputId:head(paths[0]),maxOutputBytes:1048576,steps:[replace("'./class-mapping-source2-typed-runtime-contract-v1.mjs'",{parameter:'typedURL',encoding:'json'}),replace("'./class-mapping-raw-git-v1.mjs'",{parameter:'rawURL',encoding:'json'}),replace("'./class-mapping-source2-v10-accepted-manifest-v1.mjs'","'./fixture-accepted-manifest.mjs'")]},dependencyIds:[manifest.id,head(paths[2]),head(paths[3])],parameters:{typedURL:url(head(paths[2])),rawURL:url(head(paths[3]))}});
 const receiptParameters={},receiptSteps=[],receiptDeps=[];for(const [name,path] of [['acceptedURL',paths[4]],['joinURL',paths[5]],['rosterURL',paths[6]]]){receiptParameters[name]=url(head(path));receiptSteps.push(replace("'./"+path.split('/').at(-1)+"'",{parameter:name,encoding:'json'}));receiptDeps.push(head(path));}
 receiptSteps.push(replace("'./class-mapping-source2-runtime-code-authority-v10.mjs'","'./runtime-authority-fixture.mjs'"));receiptDeps.push(authority.id);
 const receipt=v6Producer(f,{...base,id:'producer:v7-private-receipt',logicalPath:'tools/receipt-core-fixture.mjs',inputIds:[head(paths[1])],recipe:{baseInputId:head(paths[1]),maxOutputBytes:1048576,steps:receiptSteps},dependencyIds:receiptDeps,parameters:receiptParameters});
 const edges=[v7Edge(f,ownerId,authority.id,manifest.id,'producer-module-dependency','./fixture-accepted-manifest.mjs'),v7Edge(f,ownerId,authority.id,head(paths[2]),'producer-module-dependency','parameter:typedURL'),v7Edge(f,ownerId,authority.id,head(paths[3]),'producer-module-dependency','parameter:rawURL')];
 for(const [name,path] of [['acceptedURL',paths[4]],['joinURL',paths[5]],['rosterURL',paths[6]]])edges.push(v7Edge(f,ownerId,receipt.id,head(path),'producer-module-dependency','parameter:'+name));edges.push(v7Edge(f,ownerId,receipt.id,authority.id,'producer-module-dependency','./runtime-authority-fixture.mjs'));
 f.a.parameterizedProducerContracts=[receipt,authority,manifest,...f.a.parameterizedProducerContracts.filter(row=>![receipt,authority,manifest].includes(row))];
 return {f,ownerId,actual,manifest,authority,receipt,edges,artifact};
}

test('V7 actual nested fixture generators verify forward producer contexts and exact expected sources',()=>{
 const g=v7FixtureGraph(),result=v5Verify(g.f.a,g.f.io),pins=result.rootDerivedExpectedRecipePins;
 assert.equal(pins.find(row=>row.producerContractId===g.authority.id).sha256,sha(Buffer.from(g.actual.authoritySource)));assert.equal(pins.find(row=>row.producerContractId===g.receipt.id).sha256,sha(Buffer.from(g.actual.receiptSource)));assert(!pins.some(row=>row.producerContractId===g.manifest.id));
 assert.equal(result.denominators.producerModuleDependencyEdges,7);assert.equal(result.denominators.rootReachableProducerContracts,4);assert.equal(result.producerContextGraphRequired,true);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.allExecutedCodeBytesVerified,false);
});

test('V7 actual producer graph rejects unknown targets, laundering, wrong namespace, artifacts, cycles and orphan roots',()=>{
 {const g=v7FixtureGraph();g.authority.dependencyIds.push('producer:unknown');v5Rebind(g.f,g.authority);assert.throws(()=>v5Verify(g.f.a,g.f.io),/resolved contextual source/);}
 {const g=v7FixtureGraph();g.authority.dependencyIds=g.authority.dependencyIds.filter(id=>id!==g.manifest.id);v5Rebind(g.f,g.authority);assert.throws(()=>v5Verify(g.f.a,g.f.io),/declared by its actual source contract/);}
 {const g=v7FixtureGraph(),edge=g.edges[0];g.f.a.contextEdges=g.f.a.contextEdges.filter(row=>row!==edge);v7Edge(g.f,g.ownerId,g.ownerId,g.manifest.id,'parameterized-emission','laundered actual producer dependency');assert.throws(()=>v5Verify(g.f.a,g.f.io),/every generated\/producer dependency/);}
 {const g=v7FixtureGraph(),edge=g.edges[0];edge.specifier='./wrong-manifest.mjs';v5Rebind(g.f,edge);assert.throws(()=>v5Verify(g.f.a,g.f.io),/relative producer import resolves/);}
 {const g=v7FixtureGraph(),edge=g.edges[1];edge.specifier='parameter:rawURL';v5Rebind(g.f,edge);assert.throws(()=>v5Verify(g.f.a,g.f.io),/authenticated HEAD target/);}
 {const g=v7FixtureGraph(),edge=g.edges[0];edge.toId=g.artifact;g.authority.dependencyIds.push(g.artifact);v5Rebind(g.f,g.authority);v5Rebind(g.f,edge);assert.throws(()=>v5Verify(g.f.a,g.f.io),/executable context cannot be replaced by artifact/);}
 {const g=v7FixtureGraph();g.authority.dependencyIds.push(g.receipt.id);v5Rebind(g.f,g.authority);v7Edge(g.f,g.ownerId,g.authority.id,g.receipt.id,'producer-module-dependency','./receipt-core-fixture.mjs');assert.throws(()=>v5Verify(g.f.a,g.f.io),/acyclic authenticated producer dependency graph/);}
 {const g=v7FixtureGraph();g.f.a.rootCodeIds=g.f.a.rootCodeIds.filter(id=>id!==g.ownerId);assert.throws(()=>v5Verify(g.f.a,g.f.io),/reachable from an authenticated concrete root/);}
 {const g=v7FixtureGraph();g.authority.inputIds=[g.manifest.id];g.authority.recipe.baseInputId=g.manifest.id;v5Rebind(g.f,g.authority);assert.throws(()=>v5Verify(g.f.a,g.f.io),/resolved contextual source/);}
 {const g=v7FixtureGraph();g.edges[0].specifier='./changed.mjs';assert.throws(()=>v5Verify(g.f.a,g.f.io),/relative producer import resolves|exact authenticated binding/);}
});

function v7HistoricalFixture(){
 const f=v5Fixture(),base='research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/',ownerPath=base+'whale-counterfactual-context-v5.mjs',templatePath=base+'dmg175-h-native-jo-test-context-shim-v5.mjs',owner=readFileSync(resolve(repoRoot,ownerPath)),template=readFileSync(resolve(repoRoot,templatePath)),ownerId=v6AddSource(f,ownerPath,owner),input=v6AddSource(f,templatePath,template),commit='2b4425314053d429492b19114859ca4a084e7404',tree='391026a96811e7bcf0dfcb61c3753ff708308fe1';f.a.rootCodeIds.push(ownerId);
 const git=(...args)=>v10ExecFileSync('/usr/bin/git',['--no-replace-objects',...args],{cwd:repoRoot,env:v10GitEnvironment(),stdio:'pipe'}),commitBytes=git('cat-file','commit',commit),raws=new Map(),oldReadCommit=f.io.readCommit,oldReadRaw=f.io.readRawGit;
 const ids=[];for(const path of ['tools/dmg175-hired-native-successors-v2.mjs',ownerPath]){const bytes=git('show',commit+':'+path),row={id:`git:${commit}:${path}`,commit,tree,path,blobOid:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),sha256:sha(bytes),sizeBytes:bytes.length,acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'};raws.set(path,bytes);f.bind(row,{kind:'raw-git-code',...f.fields(row,['id','commit','tree','blobOid','path','sha256','sizeBytes'])});f.a.rawGitCodeRows.push(row);ids.push(row.id);}
 f.io.readCommit=id=>id===commit?commitBytes:oldReadCommit(id);f.io.readRawGit=(id,path)=>id===commit?raws.get(path):oldReadRaw(id,path);
 const spec={kind:'owned-historical-layout-root',commit,tree,layoutNodeIds:ids,maxUtf8Bytes:4096};v6Bind(f,spec,{kind:'historical-layout-contract',commit,tree,layoutNodeIds:ids},ownerId);
 const row=v6Producer(f,{id:'producer:v7-real-whale-shim',logicalPath:'tools/dmg175-hired-native-successors-v2.mjs',generatorCodeId:ownerId,inputIds:[input],recipe:{baseInputId:input,maxOutputBytes:template.length+8192,steps:[{op:'replaceStringAll',from:'__ACTUAL_SOURCE_ROOT__',to:{parameter:'sourceRoot',encoding:'json'},occurrences:1}]},dependencyIds:ids,parameters:{sourceRoot:spec},outputBounds:{minBytes:1,maxBytes:template.length+8192},proofScope:'GUARDED_RUNTIME_SOURCE_RECIPE',acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'});
 const edge=v7Edge(f,ownerId,row.id,ids[0],'producer-module-dependency','parameter:sourceRoot/tools/dmg175-hired-native-successors-v2.mjs');v7Edge(f,ownerId,row.id,ids[1],'producer-module-dependency','../'+ownerPath);
 return {f,row,spec,edge,template,owner};
}

test('V7 real Whale historical imports bind fixed commit tree path and layout membership',()=>{
 const h=v7HistoricalFixture(),result=v5Verify(h.f.a,h.f.io);assert.equal(result.denominators.producerModuleDependencyEdges,2);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.allExecutedCodeBytesVerified,false);assert(!result.rootDerivedExpectedRecipePins.some(row=>row.producerContractId===h.row.id));
 const source=h.owner.toString('utf8'),start=source.indexOf('materialized=template.replaceAll('),end=source.indexOf(';',start);assert(start>=0&&end>start);const expression=source.slice(start+'materialized='.length,end),root='/private/$&/historical';assert.equal(v6RunInNewContext(expression,{template:h.template.toString('utf8'),sourceRoot:root}),h.template.toString('utf8').replaceAll('__ACTUAL_SOURCE_ROOT__',JSON.stringify(root)));
 h.edge.specifier='parameter:sourceRoot/tools/absent.mjs';v5Rebind(h.f,h.edge);assert.throws(()=>v5Verify(h.f.a,h.f.io),/exact authenticated layout member/);
 const wrong=v7HistoricalFixture();wrong.row.parameters.sourceRoot={kind:'authenticated-checkout-root',maxUtf8Bytes:4096};v5Rebind(wrong.f,wrong.row);assert.throws(()=>v5Verify(wrong.f.a,wrong.f.io),/exact authenticated layout member/);
 const member=v7HistoricalFixture();member.spec.layoutNodeIds=member.spec.layoutNodeIds.slice(1);const b=member.f.a.fixedContractBindings.find(row=>row.id===member.spec.contractBindingId);b.expectedValue.layoutNodeIds=member.spec.layoutNodeIds;member.f.bindingDocument.bindings[Number(b.selector.pointer.split('/').at(-1))]=structuredClone(b.expectedValue);v5Rebind(member.f,member.row);assert.throws(()=>v5Verify(member.f.a,member.f.io),/exact authenticated layout member/);
 const tree=v7HistoricalFixture();tree.spec.tree='f'.repeat(40);v5Rebind(tree.f,tree.row);assert.throws(()=>v5Verify(tree.f.a,tree.f.io),/historical layout uses exact raw context/);
});

function v7FunctionFixture(){
 const f=v5Fixture(),ownerPath='tests/class-mapping-report-runtime-guards-v2.test.mjs',inputPath='tools/bind-class-mapping-source-audit-input-commit-v3.mjs',owner=readFileSync(resolve(repoRoot,ownerPath)),input=readFileSync(resolve(repoRoot,inputPath)),ownerId=v6AddSource(f,ownerPath,owner),inputId=v6AddSource(f,inputPath,input),expected=Buffer.concat([input.subarray(3771,4042),Buffer.from('\n'),input.subarray(4737,5606),Buffer.from('\n'),input.subarray(6280,7127),Buffer.from('\nreturn gitPathExists;')]);
 assert.equal(sha(expected),'0ac95fae345d9c25cc5bf48e9f0b98a68889b400b24c20d2df9503d5b7b5acf1');const body=v6Derived(f,ownerId,'v7-real-report-function',[inputId],{baseInputId:inputId,maxOutputBytes:input.length,maxIntermediateBytes:input.length,steps:[{op:'sliceBytes',start:3771,end:4042},{op:'appendUtf8',value:'\n'+input.subarray(4737,5606).toString('utf8')+'\n'+input.subarray(6280,7127).toString('utf8')+'\nreturn gitPathExists;'}]},expected),line=owner.toString('utf8').split('\n')[291],start=Buffer.byteLength(owner.toString('utf8').split('\n').slice(0,291).join('\n')+'\n');assert(line.includes("new Function('git','Buffer','fail','createHash'"));
 const row={id:'function:v7-real-report-292',generatorCodeId:ownerId,bodyCodeId:body.id,formalParameterStrings:['git','Buffer','fail','createHash'],namespaceBindings:[{formalName:'git',kind:'carrier-defined-callback-or-data',sourceCodeIds:[ownerId]},{formalName:'Buffer',kind:'node-builtin',sourceCodeIds:[ownerId]},{formalName:'fail',kind:'carrier-defined-callback-or-data',sourceCodeIds:[ownerId]},{formalName:'createHash',kind:'node-builtin',sourceCodeIds:[ownerId]}],actualCallSite:{line:292,startByte:start,endByte:start+Buffer.byteLength(line),sha256:sha(Buffer.from(line)),source:line},acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'};v6Bind(f,row,{kind:'function-constructor-contract',...f.fields(row,['id','generatorCodeId','bodyCodeId','formalParameterStrings','namespaceBindings','actualCallSite'])},ownerId);f.a.functionConstructorContracts=[row];v7BindFunctionCensus(f);v7Edge(f,ownerId,ownerId,body.id,'function-constructor','ordered source-derived report constructor');return {f,row,body,ownerId};
}

test('V7 actual Function constructor preserves ordered formals caller bytes and injected authority',()=>{
 const h=v7FunctionFixture(),result=v5Verify(h.f.a,h.f.io);assert.equal(result.denominators.functionConstructorContracts,1);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.allExecutedCodeBytesVerified,false);
 {const h=v7FunctionFixture();h.row.formalParameterStrings[0]='git=process.exit()';v5Rebind(h.f,h.row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/simple finite Function formal identifier/);}
 {const h=v7FunctionFixture();h.row.namespaceBindings.reverse();v5Rebind(h.f,h.row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/ordered Function namespace/);}
 {const h=v7FunctionFixture();h.row.actualCallSite.startByte++;v5Rebind(h.f,h.row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/exact actual Function callsite/);}
 {const h=v7FunctionFixture();h.row.actualCallSite.sha256='0'.repeat(64);v5Rebind(h.f,h.row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/exact actual Function callsite/);}
 {const h=v7FunctionFixture();h.row.namespaceBindings[0].sourceCodeIds=['artifact:contracts/runtime.json'];v5Rebind(h.f,h.row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/executable context cannot be replaced by artifact/);}
 {const h=v7FunctionFixture();h.row.bodyCodeId='head:lib/main.mjs';v5Rebind(h.f,h.row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/Function body uses its authenticated generator recipe/);}
 {const h=v7FunctionFixture();h.f.a.contextEdges=h.f.a.contextEdges.filter(edge=>!(edge.fromId===h.ownerId&&edge.toId===h.body.id));assert.throws(()=>v5Verify(h.f.a,h.f.io),/explicit authenticated body context edge/);}
 {const h=v7FunctionFixture();h.row.namespaceBindings[0].sourceProducerContractIds=['producer:missing'];h.row.namespaceBindings[0].kind='repository-code';v5Rebind(h.f,h.row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/authenticated producer source contract/);}
});

test('V7 authenticated module dirname and producer-injected Function namespaces remain separate from concrete bytes',async()=>{
 const h=v7FunctionFixture(),row=h.f.parameterized;row.parameters.moduleURL.kind='authenticated-head-module-dirname';v5Rebind(h.f,row);let result=v5Verify(h.f.a,h.f.io);const expected=h.f.rawFiles.get('lib/main.mjs').toString('utf8').replaceAll('"__ROOT__"',JSON.stringify(resolve(h.f.io.rootPhysical,'lib')));assert.equal(result.rootDerivedExpectedRecipePins.find(pin=>pin.producerContractId===row.id).sha256,sha(Buffer.from(expected)));
 h.row.namespaceBindings[0].kind='repository-code';h.row.namespaceBindings[0].sourceProducerContractIds=[row.id];v5Rebind(h.f,h.row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/explicit authenticated source context edge/);v7Edge(h.f,h.ownerId,h.ownerId,row.id,'parameterized-emission','injected guarded function result');result=v5Verify(h.f.a,h.f.io);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.allExecutedCodeBytesVerified,false);
 row.parameters.moduleURL.targetId=h.f.historicalShared;v5Rebind(h.f,row);assert.throws(()=>v5Verify(h.f.a,h.f.io),/authenticated current HEAD code/);

 const b=v7ProductionBootstrapFixture(),joined=v5Verify(b.f.a,b.f.io);assert.equal(joined.acceptedManifestBootstrapJoin.normalizedBodySha256,'7dc390fbf614ae525e63deaec0b390b9729da9f9ca84b52c357a8c8dfe75fe88');assert.equal(joined.acceptedManifestBootstrapJoin.normalizedBodySizeBytes,3104);assert.equal(joined.acceptedManifestBootstrapJoin.actualHeadArtifactPinsVerified,true);assert.equal(joined.denominators.actualEmittedInstancesObserved,0);
 const runtimeSource=readFileSync(resolve(repoRoot,'tools/class-mapping-source2-runtime-code-authority-v10.mjs'),'utf8');assert(runtimeSource.includes('"tools/class-mapping-source2-v10-accepted-manifest-v1.mjs"]);'),'the real installed wrapper requires the structural bootstrap path');assert(runtimeSource.includes('const closed=readAcceptedSource2V10Manifest()'),'the actual zero-argument reader still validates sealed pins before authority');
 const privateRoot=mkdtempSync(join(tmpdir(),'source2-production-bootstrap-contract-'));
 try{for(const path of [b.modulePath,b.manifestPath,b.acceptancePath])v10WriteFixture(privateRoot,path,b.f.heads.get(path));const reader=await import(pathToFileURL(resolve(privateRoot,b.modulePath)).href);assert.deepEqual(reader.readAcceptedSource2V10Manifest().document,b.document);writeFileSync(resolve(privateRoot,b.acceptancePath),Buffer.concat([b.f.heads.get(b.acceptancePath),Buffer.from(' ')]));assert.throws(()=>reader.readAcceptedSource2V10Manifest(),/closed artifact bytes differ/);}finally{rmSync(privateRoot,{recursive:true,force:true});}
 {const b=v7ProductionBootstrapFixture();b.f.heads.set(b.modulePath,Buffer.from(b.source+'// changed executable body\n'));assert.throws(()=>v5Verify(b.f.a,b.f.io),/reviewed production manifest structural body/);}
 for(const name of ['SOURCE2_V10_MANIFEST_PIN','SOURCE2_V10_ACCEPTANCE_PIN']){const b=v7ProductionBootstrapFixture(),pin={path:b.pins[name].path,sha256:null,sizeBytes:null,status:'UNSEALED_PENDING_CLOSED_ACCEPTANCE'};b.f.heads.set(b.modulePath,Buffer.from(b.source.replace(new RegExp(`^export const ${name}=Object\\.freeze\\([^\\n]+\\);$`,'m'),()=>`export const ${name}=Object.freeze(${JSON.stringify(pin)});`)));assert.throws(()=>v5Verify(b.f.a,b.f.io),/exact sealed artifact pin/);}
 {const b=v7ProductionBootstrapFixture(),name='SOURCE2_V10_MANIFEST_PIN',line=b.source.split('\n').find(line=>line.startsWith('export const '+name+'='));b.f.heads.set(b.modulePath,Buffer.from(b.source+'\n'+line+'\n'));assert.throws(()=>v5Verify(b.f.a,b.f.io),/one exact production named pin declaration/);}
 {const b=v7ProductionBootstrapFixture();b.f.heads.set(b.modulePath,Buffer.from(b.source.replace(/^export const SOURCE2_V10_MANIFEST_PIN=Object\.freeze\([^\n]+\);$/m,"export const SOURCE2_V10_MANIFEST_PIN=Object.freeze((()=>({path:'arbitrary.json'}))());")));assert.throws(()=>v5Verify(b.f.a,b.f.io),/literal installed pin object only/);}
 {const b=v7ProductionBootstrapFixture();b.f.heads.set(b.acceptancePath,Buffer.concat([b.f.heads.get(b.acceptancePath),Buffer.from(' ')]));assert.throws(()=>v5Verify(b.f.a,b.f.io),/exact typed source bytes production-acceptance/);}
 {const b=v7ProductionBootstrapFixture();b.f.heads.delete(b.acceptancePath);assert.throws(()=>v5Verify(b.f.a,b.f.io));}
 {const b=v7ProductionBootstrapFixture();b.setArtifacts(b.document,{...b.acceptance,pending:['unreviewed']});assert.throws(()=>v5Verify(b.f.a,b.f.io),/actual sealed root acceptance joins/);}
 {const b=v7ProductionBootstrapFixture();b.setArtifacts(b.document,{...b.acceptance,migration:{changed:true}});assert.throws(()=>v5Verify(b.f.a,b.f.io),/actual sealed root acceptance joins/);}
 {const b=v7ProductionBootstrapFixture(),other=structuredClone(b.document);other.v10Integration.runtimeCodeAuthority.unresolved=['other authority'];b.setArtifacts(other,{status:'ROOT_ACCEPTED_CLOSED_V10_INTEGRATION',pending:[],migration:other});assert.throws(()=>v5Verify(b.f.a,b.f.io),/pinned manifest equals the actual typed authority/);}
 {const b=v7ProductionBootstrapFixture(),path='tools/unreviewed-bootstrap.mjs';b.f.heads.set(path,Buffer.from('export const changed=true;\n'));b.f.io.bootstrapPaths.push(path);b.f.io.requiredHeadPaths.push(path);assert.throws(()=>v5Verify(b.f.a,b.f.io),/required transitive old-verifier\/rawGit\/helper code omitted/);}
 {const h=v7FunctionFixture();h.f.io.requiredFunctionConstructorCensus=structuredClone(h.f.a.functionConstructorCensus);h.f.a.functionConstructorContracts=[];h.f.a.contextEdges=h.f.a.contextEdges.filter(edge=>!(edge.fromId===h.ownerId&&edge.toId===h.body.id));delete h.f.a.functionConstructorCensus;assert.throws(()=>v5Verify(h.f.a,h.f.io),/installed production requires its exact sealed selected Function constructor census/);}
 {const h=v7FunctionFixture();h.f.io.requiredFunctionConstructorCensus=structuredClone(h.f.a.functionConstructorCensus);h.f.a.functionConstructorContracts=[];h.f.a.contextEdges=h.f.a.contextEdges.filter(edge=>edge.kind!=='function-constructor');v7Edge(h.f,h.ownerId,h.ownerId,h.body.id,'vm','changed known constructor kind');delete h.f.a.functionConstructorCensus;assert.throws(()=>v5Verify(h.f.a,h.f.io),/installed production requires its exact sealed selected Function constructor census/);}
 {const h=v7FunctionFixture();h.f.a.functionConstructorContracts=[];assert.throws(()=>v5Verify(h.f.a,h.f.io),/Function census exactly joins|typed Function edge has/);}
 {const h=v7FunctionFixture();delete h.f.a.functionConstructorCensus;assert.throws(()=>v5Verify(h.f.a,h.f.io),/authenticated complete selected Function constructor census required/);}
 {const h=v7FunctionFixture();h.f.a.functionConstructorCensus.sites[0].constructorContractIds=[];assert.throws(()=>v5Verify(h.f.a,h.f.io),/exact authenticated fixed contract binding/);}
 {const b=v7ProductionBootstrapFixture(),document=structuredClone(b.document);Object.assign(document.v10Integration,{status:'CLOSED_ACCEPTED_FOR_RUNTIME_QUALIFICATION',pending:[],boundaries:{sourceBodyRows:3063,frozenReportCodeRows:104,frozenNative1ReaderCodeRows:175}});b.setArtifacts(document,{status:'ROOT_ACCEPTED_CLOSED_V10_INTEGRATION',pending:[],migration:document});const privateRoot=mkdtempSync(join(tmpdir(),'source2-canonical-admission-negative-')),runtimePath='tools/class-mapping-source2-runtime-code-authority-v10.mjs';let source=runtimeSource;for(const path of ['class-mapping-source2-typed-runtime-contract-v1.mjs','class-mapping-raw-git-v1.mjs'])source=v10ReplaceOne(source,"'./"+path+"'",JSON.stringify(pathToFileURL(resolve(repoRoot,'tools',path)).href));
  try{for(const path of [b.modulePath,b.manifestPath,b.acceptancePath])v10WriteFixture(privateRoot,path,b.f.heads.get(path));v10WriteFixture(privateRoot,runtimePath,source);const canonical=await import(pathToFileURL(resolve(privateRoot,runtimePath)).href);assert.throws(()=>canonical.verifySource2RuntimeCodeAuthority(),/fixed sealed selected 13-site\/18-variant Function admission required from actual reader/);const isolated=await v10RuntimeFixture();try{const proof=isolated.authority.verifySource2RuntimeCodeAuthority();assert.equal(proof.runtimeAuthorityScope,'ISOLATED_NONCANONICAL_MODULE_FIXTURE_ONLY');assert.equal(proof.qualifiedForProductionRuntime,false);assert.throws(()=>canonical.assertVerifiedSource2RuntimeCodeAuthority(proof),/fresh installed zero-argument runtime-code verifier proof required/);}finally{rmSync(isolated.privateRoot,{recursive:true,force:true});}}finally{rmSync(privateRoot,{recursive:true,force:true});}
 }

 {const h=v7FunctionFixture(),input=h.body.inputIds[0],body=v6Producer(h.f,{id:'producer:v7-guarded-function-body',logicalPath:'private/guarded-report-function.js',generatorCodeId:h.ownerId,inputIds:[input],recipe:{...structuredClone(h.body.recipe),steps:[...structuredClone(h.body.recipe.steps),{op:'appendUtf8',value:{concat:['\n// isolated expected module directory ',{parameter:'moduleDirectory',encoding:'json'}]}}]},dependencyIds:[],parameters:{moduleDirectory:{kind:'authenticated-head-module-dirname',targetId:h.ownerId,maxUtf8Bytes:4096}},outputBounds:{minBytes:1,maxBytes:h.body.recipe.maxOutputBytes},proofScope:'ISOLATED_TEST_FIXTURE_ONLY',acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'});h.row.bodyCodeId=body.id;v5Rebind(h.f,h.row);v7BindFunctionCensus(h.f);h.f.a.contextEdges=h.f.a.contextEdges.filter(edge=>edge.kind!=='function-constructor');const edge=v7Edge(h.f,h.ownerId,h.ownerId,body.id,'function-constructor','guarded Function body fixture');const result=v5Verify(h.f.a,h.f.io);assert.equal(result.denominators.functionConstructorContracts,1);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.allExecutedCodeBytesVerified,false);edge.toId='head:lib/main.mjs';assert.throws(()=>v5Verify(h.f.a,h.f.io),/Function edge resolves to its authenticated generated body/);}

 {const f=v5Fixture();f.a.fixedContractBindings[0].producerCodeIds=[f.derived.id];const result=v5Verify(f.a,f.io);assert.equal(result.denominators.deterministicGeneratedCodeRows,1);assert.equal(result.denominators.actualEmittedInstancesObserved,0);for(const id of ['artifact:contracts/runtime.json','producer:root-url-module','derived:missing-copy']){const f=v5Fixture();f.a.fixedContractBindings[0].producerCodeIds=[id];assert.throws(()=>v5Verify(f.a,f.io),/executable context cannot be replaced by artifact|resolved contextual source/);}const cyclic=v5Fixture();cyclic.derived.generatorCodeId=cyclic.derived.id;v5Rebind(cyclic,cyclic.derived);assert.throws(()=>v5Verify(cyclic.a,cyclic.io),/resolved contextual source/);}

});

function v7ProductionBootstrapFixture(){
 const f=v5Fixture(),modulePath='tools/class-mapping-source2-v10-accepted-manifest-v1.mjs',manifestPath='research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v10.json',acceptancePath='research/class-mapping-ci-sharding-v1/source2-test-transition-v1/closed-v10-integration-acceptance-v1.json',template=readFileSync(resolve(repoRoot,modulePath),'utf8');
 f.io.bootstrapPaths=[modulePath];f.io.requiredHeadPaths=[modulePath];const state={f,modulePath,manifestPath,acceptancePath,template};
 state.setArtifacts=(document,acceptance)=>{state.document=document;state.acceptance=acceptance;state.pins={};let source=template;for(const [name,path,value] of [['SOURCE2_V10_MANIFEST_PIN',manifestPath,document],['SOURCE2_V10_ACCEPTANCE_PIN',acceptancePath,acceptance]]){const bytes=Buffer.from(JSON.stringify(value));f.heads.set(path,bytes);const pin={path,sha256:sha(bytes),sizeBytes:bytes.length,status:'SEALED_CLOSED_ACCEPTANCE'};state.pins[name]=pin;source=source.replace(new RegExp(`^export const ${name}=Object\\.freeze\\([^\\n]+\\);$`,'m'),()=>`export const ${name}=Object.freeze(${JSON.stringify(pin)});`);}state.source=source;f.heads.set(modulePath,Buffer.from(source));};
 const document={v10Integration:{runtimeCodeAuthority:f.a}};state.setArtifacts(document,{status:'ROOT_ACCEPTED_CLOSED_V10_INTEGRATION',pending:[],migration:document});return state;
}

function v7BindFunctionCensus(f){
 const sites=new Map();for(const row of f.a.functionConstructorContracts){const key=JSON.stringify([row.generatorCodeId,row.actualCallSite.startByte,row.actualCallSite.endByte]);if(!sites.has(key))sites.set(key,{generatorCodeId:row.generatorCodeId,actualCallSite:structuredClone(row.actualCallSite),constructorContractIds:[]});sites.get(key).constructorContractIds.push(row.id);}
 const census={status:'INDEPENDENTLY_REVIEWED_COMPLETE_SELECTED_FUNCTION_CONSTRUCTOR_CENSUS',generatorCodeIds:[...new Set(f.a.functionConstructorContracts.map(row=>row.generatorCodeId))],sites:[...sites.values()]};f.bind(census,{kind:'function-constructor-census',...f.fields(census,['status','generatorCodeIds','sites'])});f.a.fixedContractBindings.at(-1).producerCodeIds=[...census.generatorCodeIds];f.a.functionConstructorCensus=census;f.refreshBindingArtifact();return census;
}

// F fixed platform source: the complete qualified E 40-case source is above.
// These pure contracts never evaluate Acorn or audited application source.
import {readSource2NodeAcornPlatformSource as fReadNodeAcorn} from '../tools/class-mapping-source2-runtime-code-authority-v10.mjs';
const fNativeKey='internal/deps/acorn/acorn/dist/acorn',fNativeId='node-native:node24-acorn-v1';
const fNativeSources=Object.freeze([
 ['tests/class-mapping-current-handoff-builder-v1.test.mjs','2ad4bc5f44014962105eaeb2598b405c333f3170732458b8e3bd9ed461f492e4',8096,1205,1321,'module'],
 ['tests/class-mapping-current-report-phase-interface-v1.test.mjs','16f6709b0d8e0447fca96d54db83d3267901549d778ab83e6477be9558df2970',8035,5957,6072,'module'],
 ['tests/helpers/native2-production-semantic-backend-v1.mjs','413d73076d787cd286cdf0525518aa8d698a0a53a166f07803b83c04d36bc0c5',10084,2116,2248,'acornModule'],
 ['tests/rule-notes-current-source-chips-native2.test.mjs','831ac459b28c04fcfb4fcfff8368e13cf7dc736ce670acc5e07c5fe3bc909a8d',11766,835,967,'acornModule'],
 ['tools/citation-navigation-producer-call-scan-v3.mjs','96b213168a7abb21078444af01a380990c25c4292564dee0db6915df2f15f879',7066,550,633,'parserModule']
]);
function fNativeWitness(bytes,source){const startByte=bytes.indexOf(source);assert(startByte>=0&&bytes.indexOf(source,startByte+1)===-1,'one exact actual native source witness');const endByte=startByte+Buffer.byteLength(source);return {line:bytes.subarray(0,startByte).toString('utf8').split('\n').length,startByte,endByte,sha256:sha(bytes.subarray(startByte,endByte)),source};}
function fBindNativeCensus(f){const rows=f.a.nodeNativeVmContracts,census={status:'INDEPENDENTLY_REVIEWED_COMPLETE_SELECTED_NODE_NATIVE_VM_CENSUS',generatorCodeIds:rows.map(row=>row.generatorCodeId),sites:rows.map(row=>({generatorCodeId:row.generatorCodeId,actualCallSite:structuredClone(row.actualCallSite),nativeVmContractId:row.id}))};f.bind(census,{kind:'node-native-vm-census',...f.fields(census,['status','generatorCodeIds','sites'])});f.a.fixedContractBindings.at(-1).producerCodeIds=[...census.generatorCodeIds];f.a.nodeNativeVmCensus=census;f.refreshBindingArtifact();return census;}
function fNativeFixture(){
 const f=v5Fixture(),runtimePath='tools/class-mapping-source2-runtime-code-authority-v10.mjs',providerCodeId=v6AddSource(f,runtimePath,readFileSync(resolve(repoRoot,runtimePath))),native={id:fNativeId,nativeKey:fNativeKey,nodeMajor:24,sha256:'fc3ed7b81e58464715d0291402892f22c3d86ea75302645a330390f85d8015c9',sizeBytes:245232,providerCodeId,acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'};
 v6Bind(f,native,{kind:'node-native-source',...f.fields(native,['id','nativeKey','nodeMajor','sha256','sizeBytes','providerCodeId'])},providerCodeId);f.a.nodeNativeSourceRows=[native];f.a.nodeNativeVmContracts=[];f.io.readNodeAcornPlatformSource=fReadNodeAcorn;
 for(const [path,hash,size,start,end,name] of fNativeSources){
  const bytes=readFileSync(resolve(repoRoot,path));assert.equal(sha(bytes),hash);assert.equal(bytes.length,size);const generatorCodeId=v6AddSource(f,path,bytes);f.a.rootCodeIds.push(generatorCodeId);const alias=name==='parserModule',getter="process.binding('natives')['internal/deps/acorn/acorn/dist/acorn']",call=bytes.subarray(start,end).toString('utf8'),actualCallSite=fNativeWitness(bytes,call);assert.equal(actualCallSite.startByte,start);assert.equal(actualCallSite.endByte,end);
  const moduleText=path.includes('phase-interface')?'module={exports:{}}':name==='module'?'const module = {exports:{}};':`const ${name}={exports:{}};`;
  const row={id:'native-vm:'+path,generatorCodeId,nativeSourceId:fNativeId,actualCallSite,vmBinding:{kind:alias?'default-vm':'named-runInNewContext',importWitness:fNativeWitness(bytes,alias?"import vm from 'node:vm';":"import {runInNewContext} from 'node:vm';")},sourceAcquisition:alias?{kind:'local-const-native-member',identifier:'parserSource',witness:fNativeWitness(bytes,'const parserSource='+getter+';')}:{kind:'direct-native-member',witness:fNativeWitness(bytes,getter)},moduleDeclaration:fNativeWitness(bytes,moduleText),namespace:{kind:'COMMONJS_SHARED_MODULE_EXPORTS',moduleIdentifier:name},acceptance:'ACCEPTED_AFTER_INDEPENDENT_REVIEW'};
  v6Bind(f,row,{kind:'node-native-vm-contract',...f.fields(row,['id','generatorCodeId','nativeSourceId','actualCallSite','vmBinding','sourceAcquisition','moduleDeclaration','namespace'])},generatorCodeId);f.a.nodeNativeVmContracts.push(row);v7Edge(f,generatorCodeId,generatorCodeId,fNativeId,'vm-native',row.id);
 }
 fBindNativeCensus(f);return {f,native,contracts:f.a.nodeNativeVmContracts};
}
function fNativeRebind(f,row,kind){const keys=kind==='node-native-source'?['id','nativeKey','nodeMajor','sha256','sizeBytes','providerCodeId']:['id','generatorCodeId','nativeSourceId','actualCallSite','vmBinding','sourceAcquisition','moduleDeclaration','namespace'];const binding=f.a.fixedContractBindings.find(x=>x.id===row.contractBindingId),value={kind,...f.fields(row,keys)};binding.expectedValue=structuredClone(value);f.bindingDocument.bindings[Number(binding.selector.pointer.split('/').at(-1))]=structuredClone(value);f.refreshBindingArtifact();}

test('F actual fixed-key Node24 Acorn IO verifies five real VM sources without evaluating their input',()=>{
 const actual=fReadNodeAcorn();assert.equal(actual.nativeKey,fNativeKey);assert.equal(actual.sourceBytes.length,245232);assert.equal(sha(actual.sourceBytes),'fc3ed7b81e58464715d0291402892f22c3d86ea75302645a330390f85d8015c9');assert.equal(actual.nodeVersion,process.versions.node);assert.equal(actual.processVersion,process.version);assert.equal(actual.platform,process.platform);assert.equal(actual.arch,process.arch);assert.throws(()=>fReadNodeAcorn(fNativeKey),/no caller native key\/source\/runtime overrides/);
 const {f}=fNativeFixture(),result=v5Verify(f.a,f.io);assert.equal(result.nodeNativeSourcePins.length,1);assert.equal(result.nodeNativeSourcePins[0].observedRuntime.nodeVersion,process.versions.node);assert.equal(result.denominators.nodeNativeSourceRows,1);assert.equal(result.denominators.nodeNativeVmContracts,5);assert.equal(result.denominators.nodeNativeVmSites,5);assert.equal(result.allDeclaredNodeNativeSourceBytesVerified,true);assert.equal(result.denominators.actualEmittedInstancesObserved,0);assert.equal(result.allExecutedCodeBytesVerified,false);assert(!result.physicalHeadCodePins.some(row=>row.id===fNativeId));assert(!result.deterministicGeneratedCodePins.some(row=>row.id===fNativeId));
});

test('F native platform authority rejects unknown keys tampered bytes other Node majors and artifact substitution',()=>{
 {const {f,native}=fNativeFixture();native.nativeKey='internal/other';fNativeRebind(f,native,'node-native-source');assert.throws(()=>v5Verify(f.a,f.io),/only fixed Node 24 embedded Acorn/);}
 {const {f}=fNativeFixture(),actual=fReadNodeAcorn();f.io.readNodeAcornPlatformSource=()=>({...actual,sourceBytes:Buffer.concat([actual.sourceBytes,Buffer.from(' ')])});assert.throws(()=>v5Verify(f.a,f.io),/exact typed source bytes/);}
 {const {f}=fNativeFixture(),actual=fReadNodeAcorn(),sourceBytes=Buffer.from(actual.sourceBytes);sourceBytes[0]^=1;f.io.readNodeAcornPlatformSource=()=>({...actual,sourceBytes});assert.throws(()=>v5Verify(f.a,f.io),/exact typed source bytes/);}
 {const {f}=fNativeFixture(),actual=fReadNodeAcorn();f.io.readNodeAcornPlatformSource=()=>({...actual,nodeVersion:'26.0.0',processVersion:'v26.0.0'});assert.throws(()=>v5Verify(f.a,f.io),/actual Node major 24 runtime identity/);}
 {const {f}=fNativeFixture(),actual=fReadNodeAcorn();f.io.readNodeAcornPlatformSource=()=>({...actual,nativeKey:'internal/other'});assert.throws(()=>v5Verify(f.a,f.io),/actual fixed native key identity/);}
 {const {f}=fNativeFixture();delete f.io.readNodeAcornPlatformSource;assert.throws(()=>v5Verify(f.a,f.io),/actual installed zero-argument Node native source IO/);}
 {const {f,contracts}=fNativeFixture();contracts[0].nativeSourceId='artifact:contracts/runtime.json';fNativeRebind(f,contracts[0],'node-native-vm-contract');assert.throws(()=>v5Verify(f.a,f.io),/native VM uses exact HEAD caller and verified platform source/);}
 {const {f,native}=fNativeFixture();native.providerCodeId='artifact:contracts/runtime.json';fNativeRebind(f,native,'node-native-source');assert.throws(()=>v5Verify(f.a,f.io),/executable context cannot be replaced by artifact/);}
});

test('F native VM contracts bind exact getter imports call bytes and shared module exports namespace',()=>{
 {const {f,contracts}=fNativeFixture();contracts[0].namespace.moduleIdentifier='parserModule';fNativeRebind(f,contracts[0],'node-native-vm-contract');assert.throws(()=>v5Verify(f.a,f.io),/actual empty CommonJS module declaration/);}
 {const {f,contracts}=fNativeFixture();contracts[0].actualCallSite.startByte++;fNativeRebind(f,contracts[0],'node-native-vm-contract');assert.throws(()=>v5Verify(f.a,f.io),/exact actual native VM callsite/);}
 {const {f,contracts}=fNativeFixture();contracts[0].sourceAcquisition.kind='local-const-native-member';contracts[0].sourceAcquisition.identifier='parserSource';fNativeRebind(f,contracts[0],'node-native-vm-contract');assert.throws(()=>v5Verify(f.a,f.io),/actual fixed native source const alias/);}
 {const {f,contracts}=fNativeFixture();contracts.at(-1).vmBinding.kind='named-runInNewContext';fNativeRebind(f,contracts.at(-1),'node-native-vm-contract');assert.throws(()=>v5Verify(f.a,f.io),/exact named Node VM import/);}
 {const {f,contracts}=fNativeFixture();contracts[0].namespace.kind='ARBITRARY_NAMESPACE';fNativeRebind(f,contracts[0],'node-native-vm-contract');assert.throws(()=>v5Verify(f.a,f.io),/finite shared CommonJS native VM namespace/);}
 {const {f,contracts}=fNativeFixture();f.a.rootCodeIds=f.a.rootCodeIds.filter(id=>id!==contracts[0].generatorCodeId);assert.throws(()=>v5Verify(f.a,f.io),/native VM source and actual selected caller are root reachable/);}
});

test('F installed native admission cannot be omitted emptied recast or severed from reverse site coverage',()=>{
 {const {f}=fNativeFixture();f.io.requiredNodeNativeVmCensus=structuredClone(f.a.nodeNativeVmCensus);delete f.a.nodeNativeVmCensus;f.a.nodeNativeSourceRows=[];f.a.nodeNativeVmContracts=[];f.a.contextEdges=f.a.contextEdges.filter(edge=>edge.kind!=='vm-native');assert.throws(()=>v5Verify(f.a,f.io),/installed production requires its exact sealed selected Node native VM census/);}
 {const {f}=fNativeFixture();f.io.requiredNodeNativeVmCensus=structuredClone(f.a.nodeNativeVmCensus);f.a.nodeNativeSourceRows=[];f.a.nodeNativeVmContracts=[];f.a.contextEdges=f.a.contextEdges.filter(edge=>edge.kind!=='vm-native');assert.throws(()=>v5Verify(f.a,f.io),/authenticated complete selected Node native VM census required/);}
 {const {f}=fNativeFixture();f.a.nodeNativeVmContracts.pop();assert.throws(()=>v5Verify(f.a,f.io),/native VM census exactly joins/);}
 {const {f}=fNativeFixture();f.a.nodeNativeVmContracts=[];fBindNativeCensus(f);f.a.fixedContractBindings.at(-1).producerCodeIds=[f.a.nodeNativeSourceRows[0].providerCodeId];assert.throws(()=>v5Verify(f.a,f.io),/nonempty selected native VM census/);}
 {const {f,contracts}=fNativeFixture();f.a.contextEdges=f.a.contextEdges.filter(edge=>edge.specifier!==contracts[0].id);assert.throws(()=>v5Verify(f.a,f.io),/native VM contract has its exact platform context edge/);}
 {const {f,contracts}=fNativeFixture(),edge=f.a.contextEdges.find(edge=>edge.specifier===contracts[0].id);edge.kind='vm';v5Rebind(f,edge);assert.throws(()=>v5Verify(f.a,f.io),/resolved contextual source/);}
 {const {f}=fNativeFixture();delete f.a.nodeNativeVmCensus;assert.throws(()=>v5Verify(f.a,f.io),/authenticated complete selected Node native VM census required/);}
});

test('F canonical zero-argument runtime requires native admission from actual sealed reader before raw Git',async()=>{
 // This negative fixture passes the wrapper's finite Function admission shape so
 // missing native admission is the first guard; it mints no production proof.
 const b=v7ProductionBootstrapFixture(),document=structuredClone(b.document),functionAdmission={status:'INDEPENDENTLY_REVIEWED_COMPLETE_SELECTED_FUNCTION_CONSTRUCTOR_CENSUS',generatorCodeIds:['head:tests/class-mapping-report-runtime-guards-v2.test.mjs','head:tests/report-runtime-guards-v4-source2-v4.test.mjs','head:tests/class-mapping-current-handoff-builder-v1.test.mjs','head:tests/class-mapping-current-jo-gap-v2.test.mjs','head:tests/class-mapping-current-report-phase-interface-v1.test.mjs','head:tests/helpers/native2-production-semantic-backend-v1.mjs','head:tests/rule-notes-current-source-chips-native2.test.mjs'],sites:Array.from({length:13},(_,i)=>({constructorContractIds:i===0?Array(6).fill('fixture-negative-only'):['fixture-negative-only']}))};
 Object.assign(document.v10Integration,{status:'CLOSED_ACCEPTED_FOR_RUNTIME_QUALIFICATION',pending:[],functionConstructorAdmission:functionAdmission,boundaries:{sourceBodyRows:3063,frozenReportCodeRows:104,frozenNative1ReaderCodeRows:175}});document.v10Integration.runtimeCodeAuthority.functionConstructorCensus=functionAdmission;b.setArtifacts(document,{status:'ROOT_ACCEPTED_CLOSED_V10_INTEGRATION',pending:[],migration:document});
 const privateRoot=mkdtempSync(join(tmpdir(),'source2-canonical-native-admission-negative-')),runtimePath='tools/class-mapping-source2-runtime-code-authority-v10.mjs';let source=readFileSync(resolve(repoRoot,runtimePath),'utf8');for(const name of ['class-mapping-source2-typed-runtime-contract-v1.mjs','class-mapping-raw-git-v1.mjs'])source=v10ReplaceOne(source,"'./"+name+"'",JSON.stringify(pathToFileURL(resolve(repoRoot,'tools',name)).href));
 try{for(const path of [b.modulePath,b.manifestPath,b.acceptancePath])v10WriteFixture(privateRoot,path,b.f.heads.get(path));v10WriteFixture(privateRoot,runtimePath,source);const canonical=await import(pathToFileURL(resolve(privateRoot,runtimePath)).href);assert.throws(()=>canonical.verifySource2RuntimeCodeAuthority(),/fixed sealed selected 5-site Node native VM admission required from actual reader/);const isolated=await v10RuntimeFixture();try{const proof=isolated.authority.verifySource2RuntimeCodeAuthority();assert.equal(proof.qualifiedForProductionRuntime,false);assert.throws(()=>canonical.assertVerifiedSource2RuntimeCodeAuthority(proof),/fresh installed zero-argument runtime-code verifier proof required/);}finally{rmSync(isolated.privateRoot,{recursive:true,force:true});}}finally{rmSync(privateRoot,{recursive:true,force:true});}
});
