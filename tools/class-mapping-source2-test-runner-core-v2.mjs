// Source2 current suite runner core. All test paths come from the reviewed,
// SHA-pinned 225-family migration manifest; no shell wildcard is ever used.
import {createHash} from 'node:crypto';
import {accessSync, constants, existsSync, lstatSync, mkdirSync, openSync, closeSync, readFileSync, realpathSync, renameSync, writeFileSync, writeSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {spawn, spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertClassMappingCurrentSourceIdentity} from './class-mapping-current-source-gate-v2.mjs';
import {controlledGitEnvironment} from './class-mapping-raw-git-v1.mjs';
import {assertTrackedCheckoutClean} from './class-mapping-ci-tracked-checkout-v1.mjs';
import {parseSource2TapSummary,SOURCE2_MM_CODE_PIN_PATHS,SOURCE2_SHARD_CODE_PIN_PATHS,SOURCE2_SHARED_CODE_PIN_PATHS} from './class-mapping-source2-test-receipt-core-v2.mjs';
import {deriveSource2Shards, readSource2TestRoster, loadSource2MigrationDocument, SOURCE2_BODY_COMMIT, SOURCE2_BODY_TREE, SOURCE2_INPUT_MAP_COUNTS, SOURCE2_SOURCE_BODY_MAP_SHA256, SOURCE2_SHARD_COUNT} from './class-mapping-source2-test-roster-v2.mjs';
import {verifySource2OReceiptJoin} from './class-mapping-source2-o-receipt-join-v1.mjs';

export const SOURCE2_RUNNER_CORE_PATH = 'tools/class-mapping-source2-test-runner-core-v2.mjs';
export const SOURCE2_GATE_PATH = 'tools/class-mapping-current-source-gate-v2.mjs';
export const SOURCE2_REPORT_SEAL_PATH = 'tools/class-mapping-current-consumer-seal-verifier-v2.mjs';
export const SOURCE2_REPORT_RECEIPT_PATH = 'tools/bind-class-mapping-source-audit-input-commit-v3.mjs';
export const SOURCE2_REPO_ROOT = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const root = SOURCE2_REPO_ROOT;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const validId = value => /^\d+$/.test(value ?? '');
function check(condition, message) { if (!condition) throw new Error(`Source2 runner: ${message}`); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function safeRelativeFile(path) {
  check(typeof path === 'string' && !path.startsWith('/') && path.split('/').every(part => part && part !== '.' && part !== '..'), `safe relative file ${path}`);
  const absolute = resolve(root, path), rel = relative(root, absolute);
  check(rel !== '..' && !rel.startsWith(`..${sep}`), `file inside checkout ${path}`);
  const stat = lstatSync(absolute);
  check(stat.isFile() && !stat.isSymbolicLink() && realpathSync(absolute) === absolute, `regular tracked source file ${path}`);
  const bytes = readFileSync(absolute);
  return {path, bytes, sha256:sha256(bytes), sizeBytes:bytes.length};
}
function getRunInfo() {
  const runId = process.env.GITHUB_RUN_ID, runAttempt = process.env.GITHUB_RUN_ATTEMPT, workflowSha = process.env.GITHUB_SHA;
  check(validId(runId) && validId(runAttempt), 'GITHUB_RUN_ID and GITHUB_RUN_ATTEMPT required');
  check(/^[a-f0-9]{40}$/.test(workflowSha ?? ''), 'GITHUB_SHA must be a full commit');
  const env = controlledGitEnvironment();
  const head = execFileSync('/usr/bin/git', ['--no-replace-objects','rev-parse','HEAD'], {cwd:root, env, encoding:'utf8'}).trim();
  const tree = execFileSync('/usr/bin/git', ['--no-replace-objects','rev-parse','HEAD^{tree}'], {cwd:root, env, encoding:'utf8'}).trim();
  check(head === workflowSha, 'physical checkout HEAD equals workflow GITHUB_SHA');
  return {runId, runAttempt, workflowSha, gitCommit:head, gitTree:tree, env};
}
function checkTemporaryRoot() {
  const candidate = process.env.TMPDIR;
  check(typeof candidate === 'string' && isAbsolute(candidate), 'workflow must set an absolute private TMPDIR');
  const tmpdir = realpathSync(candidate), rel = relative(root, tmpdir);
  check(rel === '..' || rel.startsWith(`..${sep}`), 'private TMPDIR must be outside the repository');
  check(lstatSync(tmpdir).isDirectory(), 'private TMPDIR is a physical directory');
  return tmpdir;
}
function childEnvironment(run, pythonPath, tmpdir) {
  const nodeBin = dirname(process.execPath), pythonBin = dirname(pythonPath);
  return {
    ...run.env,
    PATH:[nodeBin,pythonBin,'/usr/bin','/bin'].join(':'),
    TMPDIR:tmpdir,
    TZ:'UTC',
    CI:'true',
    GITHUB_RUN_ID:run.runId,
    GITHUB_RUN_ATTEMPT:run.runAttempt,
    GITHUB_SHA:run.workflowSha,
    NODE_OPTIONS:''
  };
}
function verifyPython(pythonArg) {
  check(typeof pythonArg === 'string' && isAbsolute(pythonArg), 'physical absolute --python path required');
  const path = realpathSync(pythonArg), stat = lstatSync(path);
  check(stat.isFile() && !stat.isSymbolicLink(), 'Python executable is a physical regular file');
  accessSync(path, constants.X_OK);
  return path;
}
export function validateIdentity(identity) {
  check(identity?.summary?.stage === 'source2-body-native', 'current Source2 epoch stage');
  check(identity.summary.sourceCommit === SOURCE2_BODY_COMMIT && identity.summary.sourceTree === SOURCE2_BODY_TREE, 'fixed Source2 body commit/tree');
  const names=Object.keys(SOURCE2_INPUT_MAP_COUNTS).sort();
  check(identity.inputHashes && JSON.stringify(Object.keys(identity.inputHashes).sort())===JSON.stringify(names), 'exact four complete Source2 input hash maps');
  for(const name of names){
    const rows=identity.inputHashes[name];
    check(rows&&typeof rows==='object'&&!Array.isArray(rows), `complete ${name} path-to-SHA map`);
    check(Object.keys(rows).length===SOURCE2_INPUT_MAP_COUNTS[name], `full ${name} map cardinality`);
    for(const [path,digest] of Object.entries(rows)) check(typeof path==='string'&&path.length>0&&!path.startsWith('/')&&!path.split('/').includes('..')&&/^[a-f0-9]{64}$/.test(digest), `safe path and SHA256 pair in ${name}`);
  }
  check(sha256(Buffer.from(canonical(identity.inputHashes.sourceBody)))===SOURCE2_SOURCE_BODY_MAP_SHA256, 'canonical full 3,063-path sourceBody map hash');
  return identity;
}
export function acceptVerifierResult(value,label){
  check(value!==false&&value!==null,`${label} verifier returned a negative result`);
  if(value&&typeof value==='object'){
    check(value.ok!==false&&value.accepted!==false,`${label} verifier rejected the target`);
    const state=String(value.status??value.stage??'');
    check(!/(pending|unreviewed|rejected|failed|not-qualified|unverified)/i.test(state),`${label} result is not accepted: ${state}`);
  }
  return value===undefined?{verifiedByZeroArgumentNoThrow:true}:value;
}
export async function verifyFullCurrentTarget() {
  // Each API call is zero-argument. Import failure, pending status, or invalid
  // receipts rejects before roster parsing or shard selection.
  const identity = validateIdentity(assertClassMappingCurrentSourceIdentity());
  const sealModule = await import('./class-mapping-current-consumer-seal-verifier-v2.mjs');
  check(typeof sealModule.verifyCurrentConsumerMaterializedStageSeal === 'function', 'materialized report seal verifier exists');
  const consumerSeal = acceptVerifierResult(await sealModule.verifyCurrentConsumerMaterializedStageSeal(),'current consumer stage seal');
  const reportModule = await import('./bind-class-mapping-source-audit-input-commit-v3.mjs');
  check(typeof reportModule.verifyCommittedClassMappingReportReceipt === 'function', 'committed Source2 report receipt verifier exists');
  const reportReceipt = acceptVerifierResult(await reportModule.verifyCommittedClassMappingReportReceipt(),'committed current report receipt');
  const migration=loadSource2MigrationDocument(root);
  const outputJoinProof=verifySource2OReceiptJoin(root,migration.document.currentSuiteSemantics.reportOutputJoin,reportReceipt,migration.sha256);
  return {identity, consumerSeal, reportReceipt, outputJoinProof};
}
export function digestIdentity(identity) {
  const inputMapSha256 = Object.fromEntries(Object.entries(identity.inputHashes).map(([name, rows]) => [name, sha256(Buffer.from(canonical(rows)))]));
  const inputMapCounts = Object.fromEntries(Object.entries(identity.inputHashes).map(([name, rows]) => [name, Object.keys(rows).length]));
  return {summary:identity.summary, inputMapSha256, inputMapCounts};
}
function sourceCodePins(entrypointPath,mode) {
  const paths=mode==='shard'?SOURCE2_SHARD_CODE_PIN_PATHS:[entrypointPath,SOURCE2_RUNNER_CORE_PATH,...SOURCE2_SHARED_CODE_PIN_PATHS];
  check(mode!=='shard'||entrypointPath===SOURCE2_SHARD_CODE_PIN_PATHS[0],'fixed shard entrypoint code pin');
  return paths.map(path=>{try{return safeRelativeFile(path);}catch(error){return {path,sha256:null,sizeBytes:null,unavailable:error.message};}}).map(({path,sha256,sizeBytes,unavailable})=>({path,sha256,sizeBytes,...(unavailable?{unavailable}:{})}));
}
function completeCodePins(rows,expected){return Array.isArray(rows)&&rows.length===expected.length&&rows.every((row,index)=>row.path===expected[index]&&/^[a-f0-9]{64}$/.test(row.sha256??'')&&Number.isSafeInteger(row.sizeBytes)&&row.sizeBytes>0);}

function writeAll(fd, buffer) {
  let offset=0;
  while(offset<buffer.length) offset += writeSync(fd,buffer,offset,buffer.length-offset);
}
function runTestProcess(paths, env, logPrefix) {
  return new Promise(resolvePromise => {
    const logRoot=resolve(root,'artifacts/test-shards');
    mkdirSync(logRoot,{recursive:true,mode:0o700});
    const stdoutPath=resolve(logRoot,`${logPrefix}.tap`),stderrPath=resolve(logRoot,`${logPrefix}.stderr`);
    const outFd=openSync(stdoutPath,'wx',0o600);let errFd;
    try { errFd=openSync(stderrPath,'wx',0o600); }
    catch(error) { closeSync(outFd); throw error; }
    const argv=['--test','--test-reporter=tap','--test-concurrency=1',...paths];
    const child=spawn(process.execPath,argv,{cwd:root,env,stdio:['ignore','pipe','pipe']});
    let stdoutDigest=createHash('sha256'),stderrDigest=createHash('sha256'),stdoutBytes=0,stderrBytes=0,tail='';
    const append=(fd,hash,chunk,isOut)=>{writeAll(fd,chunk);hash.update(chunk);if(isOut)stdoutBytes+=chunk.length;else stderrBytes+=chunk.length;tail=(tail+chunk.toString('utf8')).slice(-262144);};
    child.stdout.on('data',chunk=>append(outFd,stdoutDigest,chunk,true));
    child.stderr.on('data',chunk=>append(errFd,stderrDigest,chunk,false));
    let processError=null;child.on('error',error=>{processError=error.stack??String(error);});
    child.on('close',(status,signal)=>{
      closeSync(outFd);closeSync(errFd);
      resolvePromise({
        status,signal,processError,tapSummary:parseSource2TapSummary(tail),tailBytes:Buffer.byteLength(tail),
        argv,logs:[
          {path:relative(root,stdoutPath),sha256:stdoutDigest.digest('hex'),bytes:stdoutBytes},
          {path:relative(root,stderrPath),sha256:stderrDigest.digest('hex'),bytes:stderrBytes}
        ]
      });
    });
  });
}
function checkTrackedDist(env) {
  const result=spawnSync('/usr/bin/git',['--no-replace-objects','diff','--exit-code','HEAD','--','dist'],{cwd:root,env,encoding:'utf8'});
  return {clean:result.status===0,exitCode:result.status,stderr:result.stderr??'',error:result.error?.message??null};
}
function fixedReceiptPath(mode,index,arg) {
  const expected=mode==='full'?'artifacts/test-shards/source2-full.json':`artifacts/test-shards/source2-shard-${index}.json`;
  check(arg===expected,`fixed receipt path ${expected}`);
  const absolute=resolve(root,arg);
  check(relative(root,absolute)===expected,'receipt path stays under repository');
  return {absolute,parent:dirname(absolute),relative:expected};
}
function writeAtomic(path, value) {
  mkdirSync(path.parent,{recursive:true,mode:0o700});
  check(!existsSync(path.absolute), 'refuse to overwrite an append-only receipt');
  const temp=`${path.absolute}.${process.pid}.tmp`;
  writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
  renameSync(temp,path.absolute);
}
function tapIsClean(summary) {
  return summary && Number.isInteger(summary.tests) && summary.tests>0 && summary.pass===summary.tests && summary.fail===0 && summary.cancelled===0 && summary.skipped===0 && summary.todo===0;
}

export function parseSource2RunnerArgs(argv, mode) {
  if(mode==='full') {
    check(argv.length===4&&argv[0]==='--python'&&argv[2]==='--receipt','use --python PATH --receipt artifacts/test-shards/source2-full.json');
    return {pythonArg:argv[1],receiptArg:argv[3],shardIndex:null};
  }
  check(mode==='shard'&&argv.length===8&&argv[0]==='--python'&&argv[2]==='--shard-index'&&argv[4]==='--shard-count'&&argv[6]==='--receipt','use --python PATH --shard-index N --shard-count 4 --receipt PATH');
  const shardIndex=Number(argv[3]),shardCount=Number(argv[5]);
  check(Number.isInteger(shardIndex)&&shardIndex>=0&&shardIndex<SOURCE2_SHARD_COUNT&&shardCount===SOURCE2_SHARD_COUNT,'fixed four-shard index and count');
  return {pythonArg:argv[1],receiptArg:argv[7],shardIndex};
}

export async function runSource2Tests({mode,argv,entrypointPath}) {
  check((mode==='shard'&&entrypointPath===SOURCE2_SHARD_CODE_PIN_PATHS[0])||(mode==='full'&&entrypointPath==='tools/run-class-mapping-tests-source2-full-v1.mjs'),'fixed Source2 runner entrypoint');
  const args=parseSource2RunnerArgs(argv,mode);
  const output=fixedReceiptPath(mode,args.shardIndex,args.receiptArg);
  const python=verifyPython(args.pythonArg),tmpdir=checkTemporaryRoot(),run=getRunInfo(),env=childEnvironment(run,python,tmpdir);
  const trackedBefore=assertTrackedCheckoutClean(root);
  check(trackedBefore.trackedTreeClean===true,'tracked checkout clean before Source2 test selection');
  const targetBefore=await verifyFullCurrentTarget();
  validateIdentity(targetBefore.identity);
  const roster=readSource2TestRoster(root,targetBefore.reportReceipt,targetBefore.outputJoinProof);
  const shards=deriveSource2Shards(roster);
  const selected=mode==='full'?{entries:roster.entries,shardIndex:null,shardCount:1,totalBytes:roster.entries.reduce((sum,row)=>sum+row.sizeBytes,0)}:shards[args.shardIndex];
  check(selected && Array.isArray(selected.entries) && selected.entries.length>0,'nonempty exact current test selection');
  const paths=selected.entries.map(row=>row.path);
  const logPrefix=mode==='full'?'source2-full':`source2-shard-${args.shardIndex}`;
  let child=null,trackedAfter=null,dist=null,targetAfter=null,rosterAfter=null,gitCommitAfter=null,runnerError=null;
  try {
    child=await runTestProcess(paths,env,logPrefix);
  } catch(error) { runnerError=error.stack??String(error); }
  try { dist=checkTrackedDist(env); } catch(error) { runnerError=runnerError??(error.stack??String(error)); }
  try { trackedAfter=assertTrackedCheckoutClean(root); } catch(error) { runnerError=runnerError??(error.stack??String(error)); }
  try { targetAfter=await verifyFullCurrentTarget(); } catch(error) { runnerError=runnerError??(error.stack??String(error)); }
  try { rosterAfter=readSource2TestRoster(root,targetAfter?.reportReceipt,targetAfter?.outputJoinProof); } catch(error) { runnerError=runnerError??(error.stack??String(error)); }
  try { gitCommitAfter=execFileSync('/usr/bin/git',['--no-replace-objects','rev-parse','HEAD'],{cwd:root,env,encoding:'utf8'}).trim(); } catch(error) { runnerError=runnerError??(error.stack??String(error)); }
  const runnerCodePins=sourceCodePins(entrypointPath,mode);const expectedRunnerCodePins=mode==='shard'?SOURCE2_SHARD_CODE_PIN_PATHS:[entrypointPath,SOURCE2_RUNNER_CORE_PATH,...SOURCE2_SHARED_CODE_PIN_PATHS];const codePinsComplete=completeCodePins(runnerCodePins,expectedRunnerCodePins);
  const sameIdentity=!!targetAfter&&canonical(targetBefore.identity)===canonical(targetAfter.identity);
  const sameAcceptedTarget=!!targetAfter&&canonical(targetBefore.consumerSeal)===canonical(targetAfter.consumerSeal)&&canonical(targetBefore.reportReceipt)===canonical(targetAfter.reportReceipt)&&canonical(targetBefore.outputJoinProof)===canonical(targetAfter.outputJoinProof);
  const sameRoster=!!rosterAfter&&rosterAfter.sourceRosterSha256===roster.sourceRosterSha256&&rosterAfter.entries.length===roster.entries.length;
  const status=codePinsComplete&&!runnerError&&child?.status===0&&!child?.processError&&tapIsClean(child?.tapSummary)&&dist?.clean===true&&trackedBefore.trackedTreeClean===true&&trackedAfter?.trackedTreeClean===true&&gitCommitAfter===run.gitCommit&&sameIdentity&&sameAcceptedTarget&&sameRoster?'success':'failed';
  const receipt={
    schemaVersion:1,status,mode,runId:run.runId,runAttempt:run.runAttempt,
    gitCommit:run.gitCommit,gitTree:run.gitTree,workflowSha:run.workflowSha,gitCommitAfter,
    sourceRosterSha256:roster.sourceRosterSha256,sourceRosterSha256After:rosterAfter?.sourceRosterSha256??null,
    migrationManifest:{path:roster.migrationPath,sha256:roster.sourceRosterSha256,sizeBytes:roster.sourceRosterBytes},
    migrationCounts:roster.familyCounts,topLevelFamilyCount:roster.topLevelFamilyCount,mainCurrentFamilyCount:roster.mainCurrentFamilyCount,historicalMmFamilyCount:roster.historicalMmFamilyCount,supportTestCount:roster.supportTestCount,mainCurrentTestFileCount:roster.mainCurrentTestFileCount,logicalTargetCount:roster.logicalTargetCount,historicalMmTargetPath:roster.historicalMmTarget.path,
    shardCount:mode==='full'?1:SOURCE2_SHARD_COUNT,shardIndex:args.shardIndex,
    selectedTestFiles:paths,selectedTestFileHashes:Object.fromEntries(selected.entries.map(row=>[row.path,{sha256:row.sha256,sizeBytes:row.sizeBytes}])),
    attemptedFileCount:paths.length,actualExecutedFiles:child?.status===0?paths:null,
    sourceIdentityBefore:digestIdentity(targetBefore.identity),sourceIdentityAfter:targetAfter?digestIdentity(targetAfter.identity):null,
    consumerSealBefore:targetBefore.consumerSeal??null,consumerSealAfter:targetAfter?.consumerSeal??null,
    reportReceiptBefore:targetBefore.reportReceipt??null,reportReceiptAfter:targetAfter?.reportReceipt??null,outputJoinProofBefore:targetBefore.outputJoinProof??null,outputJoinProofAfter:targetAfter?.outputJoinProof??null,
    sourceIdentityUnchanged:sameIdentity,acceptedTargetUnchanged:sameAcceptedTarget,sourceRosterUnchanged:sameRoster,
    nodeArgv:child?.argv??[],nodeExitCode:child?.status??null,processError:child?.processError??null,signal:child?.signal??null,
    tapSummary:child?.tapSummary??null,logs:child?.logs??[],trackedCheckoutBefore:trackedBefore,trackedCheckoutAfter:trackedAfter,
    distTrackedTreeCleanAfter:dist?.clean??false,distCheckExitCode:dist?.exitCode??null,
    runnerCodePins,pythonExecutable:python,tmpdir,
    runnerError
  };
  writeAtomic(output,receipt);
  if(status!=='success') throw new Error(`Source2 ${mode} test run failed; complete receipt/logs retained at ${output.relative}: ${JSON.stringify({nodeExitCode:receipt.nodeExitCode,processError:receipt.processError,signal:receipt.signal,tapSummary:receipt.tapSummary,runnerError:receipt.runnerError})}`);
  process.stdout.write(JSON.stringify({status,mode,shardIndex:args.shardIndex,shardCount:receipt.shardCount,selectedFileCount:paths.length,sourceRosterSha256:roster.sourceRosterSha256,receipt:output.relative})+'\n');
  return receipt;
}
