import assert from 'node:assert/strict';
import {readFileSync, realpathSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {
  admitBeforeShardSelection,
  deriveSource2Shards,
  readSource2TestRoster,
  SOURCE2_BODY_COMMIT,
  SOURCE2_BODY_TREE,
  SOURCE2_DEDICATED_MM_PATH, SOURCE2_DEDICATED_MM_SHA256, SOURCE2_DEDICATED_MM_SIZE_BYTES, SOURCE2_HISTORICAL_MM_MANIFEST_SHA256, SOURCE2_HISTORICAL_MM_COMMIT,
  SOURCE2_DYNAMIC_ONLY_PATHS,
  SOURCE2_INPUT_MAP_COUNTS,
  SOURCE2_SOURCE_BODY_MAP_SHA256,
  SOURCE2_SHARD_COUNT,
  validateSource2MigrationDocument
} from '../tools/class-mapping-source2-test-roster-v1.mjs';
import {parseSource2TapSummary, validateSource2ReceiptSet, SOURCE2_SHARD_CODE_PIN_PATHS, SOURCE2_MM_CODE_PIN_PATHS} from '../tools/class-mapping-source2-test-receipt-core-v1.mjs';

const repoRoot=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const sharedCodePins=[
  ['tools/class-mapping-current-source-gate-v2.mjs','1'],
  ['tools/class-mapping-current-consumer-seal-verifier-v2.mjs','2'],
  ['tools/bind-class-mapping-source-audit-input-commit-v3.mjs','3'],
  ['tools/class-mapping-source2-test-roster-v1.mjs','4']
].map(([path,digit])=>({path,sha256:digit.repeat(64),sizeBytes:1}));
const syntheticPinHashes=new Map([...sharedCodePins.map(row=>[row.path,row.sha256]),['tools/run-class-mapping-tests-source2-shard-v1.mjs','a'.repeat(64)],['tools/class-mapping-source2-test-runner-core-v1.mjs','b'.repeat(64)],['tools/run-historical-mm-replay-source2-receipt-v1.mjs','c'.repeat(64)],['tools/replay-historical-mm-native-tests-source2-v1.mjs','d'.repeat(64)]]);
function syntheticCodePins(paths){return paths.map(path=>({path,sha256:syntheticPinHashes.get(path),sizeBytes:1}));}

function syntheticRoster(){
  const entries=Array.from({length:20},(_,index)=>({path:`tests/family-${String(index).padStart(2,'0')}.test.mjs`,sha256:String(index%10).repeat(64),sizeBytes:100+index,kind:'synthetic'}));
  const historicalMmTarget={path:SOURCE2_DEDICATED_MM_PATH,sha256:SOURCE2_DEDICATED_MM_SHA256,sizeBytes:SOURCE2_DEDICATED_MM_SIZE_BYTES};
  return {sourceRosterSha256:'a'.repeat(64),sourceRosterBytes:1234,migrationPath:'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v2.json',familyCounts:{static:8,dynamic:2,unaffected:11,workflow:0,successors:10},topLevelFamilyCount:21,mainCurrentFamilyCount:20,historicalMmFamilyCount:1,supportTestCount:0,mainCurrentTestFileCount:20,logicalTargetCount:21,historicalMmTarget,logicalTargetPaths:[...entries.map(row=>row.path),SOURCE2_DEDICATED_MM_PATH].sort(),entries};
}
function successfulReceiptSet(roster){
  const shards=deriveSource2Shards(roster),runId='301',runAttempt='2',gitCommit='b'.repeat(40),gitTree='c'.repeat(40);
  const sourceIdentity={summary:{stage:'source2-body-native',sourceCommit:SOURCE2_BODY_COMMIT,sourceTree:SOURCE2_BODY_TREE},inputMapSha256:{sourceBody:SOURCE2_SOURCE_BODY_MAP_SHA256,qualificationMetadata:'d'.repeat(64),protectedHistorical:'e'.repeat(64),installedCode:'f'.repeat(64)},inputMapCounts:SOURCE2_INPUT_MAP_COUNTS};
  const seal={status:'verified',sha256:'e'.repeat(64)},report={status:'verified',sha256:'f'.repeat(64)};
  const tracked={trackedTreeClean:true};
  const shardReceipts=shards.map((shard,index)=>({
    status:'success',mode:'shard',shardIndex:index,shardCount:4,runId,runAttempt,gitCommit,gitTree,workflowSha:gitCommit,gitCommitAfter:gitCommit,topLevelFamilyCount:225,mainCurrentFamilyCount:224,historicalMmFamilyCount:1,supportTestCount:15,mainCurrentTestFileCount:239,logicalTargetCount:240,historicalMmTargetPath:SOURCE2_DEDICATED_MM_PATH,
    sourceRosterSha256:roster.sourceRosterSha256,sourceRosterSha256After:roster.sourceRosterSha256,
    selectedTestFiles:shard.entries.map(row=>row.path),selectedTestFileHashes:Object.fromEntries(shard.entries.map(row=>[row.path,{sha256:row.sha256,sizeBytes:row.sizeBytes}])),
    attemptedFileCount:shard.entries.length,actualExecutedFiles:shard.entries.map(row=>row.path),tapSummary:{tests:5,pass:5,fail:0,cancelled:0,skipped:0,todo:0},
    nodeExitCode:0,processError:null,signal:null,runnerError:null,sourceIdentityBefore:sourceIdentity,sourceIdentityAfter:sourceIdentity,sourceIdentityUnchanged:true,acceptedTargetUnchanged:true,sourceRosterUnchanged:true,
    consumerSealBefore:seal,consumerSealAfter:seal,reportReceiptBefore:report,reportReceiptAfter:report,trackedCheckoutBefore:tracked,trackedCheckoutAfter:tracked,distTrackedTreeCleanAfter:true,
    runnerCodePins:syntheticCodePins(SOURCE2_SHARD_CODE_PIN_PATHS)
  }));
  const mmReceipt={
    status:'success',mode:'historical-mm-replay',shardIndex:null,shardCount:4,runId,runAttempt,gitCommit,gitTree,workflowSha:gitCommit,gitCommitAfter:gitCommit,mainCurrentFamilyCount:224,historicalMmFamilyCount:1,supportTestCount:15,mainCurrentTestFileCount:239,logicalTargetCount:240,historicalMmTargetPath:SOURCE2_DEDICATED_MM_PATH,
    sourceRosterSha256:roster.sourceRosterSha256,sourceRosterSha256After:roster.sourceRosterSha256,
    historicalMmReplay:{manifestSha256:SOURCE2_HISTORICAL_MM_MANIFEST_SHA256,manifestPath:'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json',testEntry:SOURCE2_DEDICATED_MM_PATH,testEntryPin:{commit:SOURCE2_HISTORICAL_MM_COMMIT,sha256:SOURCE2_DEDICATED_MM_SHA256,sizeBytes:SOURCE2_DEDICATED_MM_SIZE_BYTES},expectedAssertions:19,actualAssertions:19,passed:19,failed:0,skipped:0,capsuleAndPrivateTmpRemoved:true,activeSourceFilesWritten:false},
    tapSummary:{tests:19,pass:19,fail:0,cancelled:0,skipped:0,todo:0},nodeExitCode:0,processError:null,runnerError:null,
    sourceIdentityBefore:sourceIdentity,sourceIdentityAfter:sourceIdentity,sourceIdentityUnchanged:true,acceptedTargetUnchanged:true,sourceRosterUnchanged:true,
    consumerSealBefore:seal,consumerSealAfter:seal,reportReceiptBefore:report,reportReceiptAfter:report,trackedCheckoutBefore:tracked,trackedCheckoutAfter:tracked,distTrackedTreeCleanAfter:true,
    signal:null,runnerCodePins:syntheticCodePins(SOURCE2_MM_CODE_PIN_PATHS)
  };
  const currentCodePins=[...new Map([...shardReceipts,mmReceipt].flatMap(row=>row.runnerCodePins).map(row=>[row.path,row])).values()];
  return {shardReceipts,mmReceipt,runId,runAttempt,gitCommit,gitTree,currentIdentity:sourceIdentity,currentConsumerSeal:seal,currentReportReceipt:report,currentCodePins};
}

test('finite Source2 manifest covers 64 static, 7 dynamic/pin, 153 unchanged and one workflow family',()=>{
  const roster=readSource2TestRoster(repoRoot);
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
  const roster=readSource2TestRoster(repoRoot);
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
  const source=readFileSync(resolve(repoRoot,'tools/class-mapping-source2-test-runner-core-v1.mjs'),'utf8');
  const runner=source.slice(source.indexOf('export async function runSource2Tests'));
  const gate=runner.indexOf('await verifyFullCurrentTarget()');
  const roster=runner.indexOf('readSource2TestRoster(root)');
  const shard=runner.indexOf('deriveSource2Shards(roster)');
  assert.ok(gate>=0&&gate<roster&&roster<shard);
  const fullTarget=source.slice(source.indexOf('export async function verifyFullCurrentTarget'),source.indexOf('function digestIdentity'));
  const identity=fullTarget.indexOf('assertClassMappingCurrentSourceIdentity()');
  const consumerSeal=fullTarget.indexOf('verifyCurrentConsumerMaterializedStageSeal');
  const report=fullTarget.indexOf('verifyCommittedClassMappingReportReceipt');
  assert.ok(identity>=0&&identity<consumerSeal&&consumerSeal<report);
  assert.match(source,/verifyCurrentConsumerMaterializedStageSeal/);
  assert.match(source,/verifyCommittedClassMappingReportReceipt/);
  assert.doesNotMatch(source,/test-isolation=none/);
  assert.match(source,/--test-concurrency=1/);
  assert.doesNotMatch(source,/tests\/\*\.mjs/);
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

test('run, attempt, checkout, Source2 inputs, consumer seal, and report receipt cannot drift',()=>{
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
