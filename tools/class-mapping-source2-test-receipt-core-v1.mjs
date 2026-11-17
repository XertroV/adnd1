// Pure receipt-set contract for the Source2 four-shard current test suite.
import {isDeepStrictEqual} from 'node:util';
import {deriveSource2Shards, SOURCE2_SHARD_COUNT, SOURCE2_DEDICATED_MM_PATH, SOURCE2_DEDICATED_MM_SHA256, SOURCE2_DEDICATED_MM_SIZE_BYTES, SOURCE2_HISTORICAL_MM_MANIFEST_SHA256, SOURCE2_HISTORICAL_MM_COMMIT, validateSource2InputMapReceipt} from './class-mapping-source2-test-roster-v1.mjs';
function check(ok,message){if(!ok)throw new Error(`Source2 shard reducer: ${message}`);}
export const SOURCE2_SHARED_CODE_PIN_PATHS=Object.freeze(['tools/class-mapping-current-source-gate-v2.mjs','tools/class-mapping-current-consumer-seal-verifier-v2.mjs','tools/bind-class-mapping-source-audit-input-commit-v3.mjs','tools/class-mapping-source2-test-roster-v1.mjs']);
export const SOURCE2_SHARD_CODE_PIN_PATHS=Object.freeze(['tools/run-class-mapping-tests-source2-shard-v1.mjs','tools/class-mapping-source2-test-runner-core-v1.mjs',...SOURCE2_SHARED_CODE_PIN_PATHS]);
export const SOURCE2_MM_CODE_PIN_PATHS=Object.freeze(['tools/run-historical-mm-replay-source2-receipt-v1.mjs','tools/replay-historical-mm-native-tests-source2-v1.mjs',...SOURCE2_SHARED_CODE_PIN_PATHS]);
export const SOURCE2_ALL_JOB_CODE_PIN_PATHS=Object.freeze([...new Set([...SOURCE2_SHARD_CODE_PIN_PATHS,...SOURCE2_MM_CODE_PIN_PATHS])]);
const shaPattern=/^[a-f0-9]{64}$/;
function validateLiveCodePinRows(rows){
 check(Array.isArray(rows)&&rows.length===SOURCE2_ALL_JOB_CODE_PIN_PATHS.length,'exact live code-pin set');
 const paths=new Set();
 for(const row of rows){check(row&&JSON.stringify(Object.keys(row).sort())===JSON.stringify(['path','sha256','sizeBytes']),'exact live code-pin row fields');check(typeof row.path==='string'&&!row.path.startsWith('/')&&!row.path.split('/').includes('..'),'safe live code-pin path');check(!paths.has(row.path),'unique live code-pin path');check(shaPattern.test(row.sha256??'')&&Number.isSafeInteger(row.sizeBytes)&&row.sizeBytes>0,`well-formed live code pin ${row.path}`);paths.add(row.path);}
 check(JSON.stringify([...paths].sort())===JSON.stringify([...SOURCE2_ALL_JOB_CODE_PIN_PATHS].sort()),'exact live shard/MM code-pin paths');
 return new Map(rows.map(row=>[row.path,row]));
}
function validateReceiptCodePins(receipt,livePins,label){
 const expected=receipt.mode==='shard'?SOURCE2_SHARD_CODE_PIN_PATHS:receipt.mode==='historical-mm-replay'?SOURCE2_MM_CODE_PIN_PATHS:null;
 check(expected,`${label}: fixed runner mode for code pins`);
 const rows=receipt.runnerCodePins;
 check(Array.isArray(rows)&&rows.length===expected.length,`${label}: exact runner-code pin count`);
 const seen=new Set();
 for(let index=0;index<expected.length;index++){
  const row=rows[index],path=expected[index];
  check(row&&JSON.stringify(Object.keys(row).sort())===JSON.stringify(['path','sha256','sizeBytes']),`${label}: exact code-pin row fields ${path}`);
  check(row&&row.path===path,`${label}: exact code-pin role ${path}`);
  check(!seen.has(row.path),`${label}: unique code-pin path ${row.path}`);seen.add(row.path);
  check(shaPattern.test(row.sha256??'')&&Number.isSafeInteger(row.sizeBytes)&&row.sizeBytes>0,`${label}: well-formed nonempty code pin ${path}`);
  const live=livePins.get(path);check(live&&row.sha256===live.sha256&&row.sizeBytes===live.sizeBytes,`${label}: receipt code pin equals live accepted checkout bytes ${path}`);
 }
 return new Map(rows.map(row=>[row.path,row]));
}
export function parseSource2TapSummary(text){
  if(typeof text!=='string') throw new Error('Source2 TAP: complete text required');
  const keys=['tests','pass','fail','cancelled','skipped','todo'];
  return Object.fromEntries(keys.map(key=>{const matches=[...text.matchAll(new RegExp(`^# ${key} (\\d+)$`,'gm'))];return [key,matches.length?Number(matches.at(-1)[1]):null];}));
}
function successfulTestSummary(summary,label){check(summary&&Number.isInteger(summary.tests)&&summary.tests>0,`${label}: positive test count`);check(summary.pass===summary.tests&&summary.fail===0&&summary.cancelled===0&&summary.skipped===0&&summary.todo===0,`${label}: all tests pass; no hidden failure/cancel/skip/todo`);}
function commonCodePins(pinMaps){for(const path of SOURCE2_SHARED_CODE_PIN_PATHS){const first=pinMaps[0].get(path);check(first,`shared accepted-target code pin exists: ${path}`);for(const map of pinMaps)check(isDeepStrictEqual(map.get(path),first),`shared code pin agrees across jobs: ${path}`);}return SOURCE2_SHARED_CODE_PIN_PATHS.map(path=>pinMaps[0].get(path));}
export function validateSource2ReceiptSet({shardReceipts,mmReceipt,runId,runAttempt,gitCommit,gitTree,shardJobResult,mmJobResult,roster,currentIdentity,currentConsumerSeal,currentReportReceipt,currentCodePins}){
 check(Array.isArray(shardReceipts)&&shardReceipts.length===SOURCE2_SHARD_COUNT,'exact four shard receipts');check(roster?.historicalMmTarget?.path===SOURCE2_DEDICATED_MM_PATH&&roster.historicalMmTarget.sha256===SOURCE2_DEDICATED_MM_SHA256&&roster.historicalMmTarget.sizeBytes===SOURCE2_DEDICATED_MM_SIZE_BYTES,'one pinned dedicated MM family target in the roster');check(!roster.entries.some(row=>row.path===SOURCE2_DEDICATED_MM_PATH),'dedicated MM family is excluded from current shard entries');check(mmReceipt&&typeof mmReceipt==='object','historical-MM receipt');check(shardJobResult==='success'&&mmJobResult==='success','both workflow jobs report success');check(currentIdentity&&currentConsumerSeal&&currentReportReceipt,'fresh accepted Source2 identity, consumer seal, and report receipt');validateSource2InputMapReceipt(currentIdentity);check(typeof gitTree==='string'&&/^[a-f0-9]{40}$/.test(gitTree),'actual checkout tree pin supplied by reducer');const livePins=validateLiveCodePinRows(currentCodePins);
 const shards=deriveSource2Shards(roster),allReceipts=[...shardReceipts,mmReceipt],receiptPinMaps=[];
 for(const [index,receipt] of shardReceipts.entries()){
  receiptPinMaps.push(validateReceiptCodePins(receipt,livePins,`shard ${index}`));
  check(receipt.status==='success'&&receipt.mode==='shard'&&receipt.shardIndex===index&&receipt.shardCount===4,`shard ${index} receipt identity/status`);
  check(receipt.runId===runId&&receipt.runAttempt===runAttempt&&receipt.gitCommit===gitCommit&&receipt.workflowSha===gitCommit,`shard ${index} exact run/attempt/commit`);check(receipt.gitCommitAfter===gitCommit,`shard ${index} post-run HEAD unchanged`);
  check(receipt.gitTree===gitTree,`shard ${index} tree equals actual checkout HEAD^{tree}`);
  check(receipt.sourceRosterSha256===roster.sourceRosterSha256&&receipt.sourceRosterSha256After===roster.sourceRosterSha256,`shard ${index} exact roster hash before/after`);check(receipt.topLevelFamilyCount===225&&receipt.mainCurrentFamilyCount===224&&receipt.historicalMmFamilyCount===1&&receipt.supportTestCount===15&&receipt.mainCurrentTestFileCount===239&&receipt.logicalTargetCount===240&&receipt.historicalMmTargetPath===SOURCE2_DEDICATED_MM_PATH,`shard ${index} exact main/historical family routing counts`);
  check(isDeepStrictEqual(receipt.selectedTestFiles,shards[index].entries.map(row=>row.path)),`shard ${index} exact deterministic target selection`);
  const expected=Object.fromEntries(shards[index].entries.map(row=>[row.path,{sha256:row.sha256,sizeBytes:row.sizeBytes}]));check(isDeepStrictEqual(receipt.selectedTestFileHashes,expected),`shard ${index} exact selected file hash pins`);
  check(receipt.attemptedFileCount===shards[index].entries.length&&isDeepStrictEqual(receipt.actualExecutedFiles,receipt.selectedTestFiles),`shard ${index} every requested current file executed`);
  successfulTestSummary(receipt.tapSummary,`shard ${index}`);check(receipt.nodeExitCode===0&&!receipt.processError&&!receipt.signal&&!receipt.runnerError,`shard ${index} clean Node process`);
  check(receipt.sourceIdentityUnchanged===true&&isDeepStrictEqual(receipt.sourceIdentityBefore,receipt.sourceIdentityAfter),`shard ${index} fresh current identity before/after`);
  check(isDeepStrictEqual(receipt.sourceIdentityBefore,currentIdentity),`shard ${index} exact current Source2 input-map and epoch pins`);
  check(receipt.acceptedTargetUnchanged===true&&isDeepStrictEqual(receipt.consumerSealBefore,receipt.consumerSealAfter)&&isDeepStrictEqual(receipt.reportReceiptBefore,receipt.reportReceiptAfter),`shard ${index} current seal/report pins before/after`);
  check(isDeepStrictEqual(receipt.consumerSealBefore,currentConsumerSeal)&&isDeepStrictEqual(receipt.reportReceiptBefore,currentReportReceipt),`shard ${index} current accepted seal/report pins`);
  check(receipt.sourceRosterUnchanged===true,`shard ${index} roster unchanged`);
  check(receipt.distTrackedTreeCleanAfter===true&&receipt.trackedCheckoutBefore?.trackedTreeClean===true&&receipt.trackedCheckoutAfter?.trackedTreeClean===true,`shard ${index} tracked checkout and dist clean`);
 }
 receiptPinMaps.push(validateReceiptCodePins(mmReceipt,livePins,'MM'));
 check(mmReceipt.status==='success'&&mmReceipt.mode==='historical-mm-replay'&&mmReceipt.shardIndex===null&&mmReceipt.shardCount===4,'MM receipt status and separate historical lane');
 check(mmReceipt.runId===runId&&mmReceipt.runAttempt===runAttempt&&mmReceipt.gitCommit===gitCommit&&mmReceipt.workflowSha===gitCommit, 'MM exact run/attempt/commit');check(mmReceipt.gitCommitAfter===gitCommit,'MM post-run HEAD unchanged');
 check(mmReceipt.gitTree===gitTree,'MM tree equals actual checkout HEAD^{tree}');
 check(mmReceipt.sourceRosterSha256===roster.sourceRosterSha256&&mmReceipt.sourceRosterSha256After===roster.sourceRosterSha256,'MM same exact roster hash');check(mmReceipt.mainCurrentFamilyCount===224&&mmReceipt.historicalMmFamilyCount===1&&mmReceipt.supportTestCount===15&&mmReceipt.mainCurrentTestFileCount===239&&mmReceipt.logicalTargetCount===240&&mmReceipt.historicalMmTargetPath===SOURCE2_DEDICATED_MM_PATH,'MM receipt uses exact 239-main/240-logical route counts');
 const historical=mmReceipt.historicalMmReplay;check(historical?.manifestSha256===SOURCE2_HISTORICAL_MM_MANIFEST_SHA256&&historical.manifestPath==='research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json','fixed historical MM capsule');check(historical.testEntry===SOURCE2_DEDICATED_MM_PATH&&historical.testEntryPin?.commit===SOURCE2_HISTORICAL_MM_COMMIT&&historical.testEntryPin?.sha256===SOURCE2_DEDICATED_MM_SHA256&&historical.testEntryPin?.sizeBytes===SOURCE2_DEDICATED_MM_SIZE_BYTES,'dedicated MM family runs exactly once in the historical capsule lane');
 check(historical.expectedAssertions===19&&historical.actualAssertions===19&&historical.passed===19&&historical.failed===0&&historical.skipped===0&&historical.capsuleAndPrivateTmpRemoved===true&&historical.activeSourceFilesWritten===false,'complete immutable 19-case MM replay');
 successfulTestSummary(mmReceipt.tapSummary,'historical MM');check(mmReceipt.nodeExitCode===0&&!mmReceipt.processError&&!mmReceipt.signal&&!mmReceipt.runnerError,'MM process clean with no signal');
 check(mmReceipt.sourceIdentityUnchanged===true&&isDeepStrictEqual(mmReceipt.sourceIdentityBefore,mmReceipt.sourceIdentityAfter),'MM Source2 identity before/after');check(isDeepStrictEqual(mmReceipt.sourceIdentityBefore,currentIdentity),'MM exact current Source2 input-map and epoch pins');check(mmReceipt.acceptedTargetUnchanged===true&&isDeepStrictEqual(mmReceipt.consumerSealBefore,mmReceipt.consumerSealAfter)&&isDeepStrictEqual(mmReceipt.reportReceiptBefore,mmReceipt.reportReceiptAfter),'MM current seal/report pins before/after');check(isDeepStrictEqual(mmReceipt.consumerSealBefore,currentConsumerSeal)&&isDeepStrictEqual(mmReceipt.reportReceiptBefore,currentReportReceipt),'MM current accepted seal/report pins');check(mmReceipt.sourceRosterUnchanged===true,'MM roster unchanged');check(mmReceipt.distTrackedTreeCleanAfter===true&&mmReceipt.trackedCheckoutBefore?.trackedTreeClean===true&&mmReceipt.trackedCheckoutAfter?.trackedTreeClean===true,'MM tracked checkout and dist clean');
 const rosters=new Set(allReceipts.map(row=>row.sourceRosterSha256));check(rosters.size===1,'all five input receipts share one Source2 roster hash');
 const runs=new Set(allReceipts.map(row=>`${row.runId}/${row.runAttempt}/${row.gitCommit}/${row.gitTree}`));check(runs.size===1&&allReceipts.every(row=>row.gitTree===gitTree),'all five input receipts share exact run/attempt/commit/tree bound to live checkout');
 const identityPins=new Set(allReceipts.map(row=>JSON.stringify(row.sourceIdentityBefore)));check(identityPins.size===1,'all five input receipts share exact Source2 identity digest');
 const sealPins=new Set(allReceipts.map(row=>JSON.stringify(row.consumerSealBefore)));check(sealPins.size===1,'all five input receipts share exact current consumer seal');
 const reportPins=new Set(allReceipts.map(row=>JSON.stringify(row.reportReceiptBefore)));check(reportPins.size===1,'all five input receipts share exact current report receipt');
 check(new Set(allReceipts.map(row=>JSON.stringify(row.consumerSealAfter))).size===1,'all five input receipts share exact final consumer seal');
 check(new Set(allReceipts.map(row=>JSON.stringify(row.reportReceiptAfter))).size===1,'all five input receipts share exact final report receipt');
 const codePins=commonCodePins(receiptPinMaps);
 const selected=shardReceipts.flatMap(row=>row.selectedTestFiles);check(selected.length===roster.entries.length&&new Set(selected).size===selected.length,'four shard selections are disjoint and complete');check(isDeepStrictEqual([...selected].sort(),roster.entries.map(row=>row.path).sort()),'all 239 main current files appear exactly once');const logicalSelected=[...selected,historical.testEntry];check(logicalSelected.length===roster.logicalTargetPaths.length&&new Set(logicalSelected).size===logicalSelected.length,'historical MM lane is distinct and appears exactly once');check(isDeepStrictEqual([...logicalSelected].sort(),[...roster.logicalTargetPaths].sort()),'all 225 predecessor families plus 15 support paths route exactly once across shards and historical MM');
 const aggregate=shardReceipts.reduce((sum,row)=>{for(const key of ['tests','pass','fail','cancelled','skipped','todo'])sum[key]=(sum[key]??0)+(row.tapSummary?.[key]??0);return sum;},{tests:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0});
 const mmTap=mmReceipt.tapSummary;for(const key of ['tests','pass','fail','cancelled','skipped','todo'])aggregate[key]=(aggregate[key]??0)+(mmTap?.[key]??0);
 return {schemaVersion:1,status:'success',runId,runAttempt,gitCommit,gitTree:shardReceipts[0].gitTree,sourceRosterSha256:roster.sourceRosterSha256,migrationManifest:{path:roster.migrationPath,sha256:roster.sourceRosterSha256,sizeBytes:roster.sourceRosterBytes},familyCounts:roster.familyCounts,topLevelFamilyCount:roster.topLevelFamilyCount,mainCurrentFamilyCount:roster.mainCurrentFamilyCount,historicalMmFamilyCount:roster.historicalMmFamilyCount,supportTestCount:roster.supportTestCount,source2CurrentTestFileCount:roster.entries.length,mainCurrentTestFileCount:roster.entries.length,logicalTargetCount:roster.logicalTargetCount,historicalMmFamilyPath:historical.testEntry,source2FourShardSelection:shardReceipts.map(row=>({shardIndex:row.shardIndex,fileCount:row.selectedTestFiles.length,tests:row.tapSummary.tests,pass:row.tapSummary.pass})),historicalMmReplay:{tests:mmTap.tests,pass:mmTap.pass,manifestSha256:historical.manifestSha256,testEntry:historical.testEntry,testEntryPin:historical.testEntryPin},aggregate,sharedCodePins:codePins,allFiveInputReceiptsShareExactRunAndTarget:true,generatedReducerReportIsSixthArtifact:true,all225FamiliesAndSupportTestsExecutedOnceAcrossMainAndHistoricalLanes:true,skipTodoCountsVisible:true};
}
