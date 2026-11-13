// Proposed target: tools/run-class-mapping-tests-shard-v1.mjs
// Strict one-shard runner. No source, report, or workflow file is written by this proposal.
import {accessSync, constants, lstatSync, mkdirSync, realpathSync, renameSync, writeFileSync, openSync, closeSync, writeSync, readFileSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {spawn, spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {controlledGitEnvironment} from './class-mapping-raw-git-v1.mjs';
import {assertClassMappingCurrentSourceIdentity} from './class-mapping-current-source-gate-v1.mjs';
import {collectRoster, deriveShards, SHARD_COUNT, parseTapSummary} from './class-mapping-test-sharding-core-v1.mjs';
const root=realpathSync(resolve(import.meta.dirname,'..'));
function check(ok,message){if(!ok)throw new Error(`Current test shard: ${message}`);}
function parseArgs(argv){
  check(argv.length===8,'exact arguments required');
  check(argv[0]==='--python'&&argv[2]==='--shard-index'&&argv[4]==='--shard-count'&&argv[6]==='--receipt','use --python PATH --shard-index N --shard-count 4 --receipt PATH');
  const index=Number(argv[3]),count=Number(argv[5]);
  check(Number.isInteger(index)&&index>=0&&index<SHARD_COUNT&&count===SHARD_COUNT,'four-shard index/count');
  return {pythonArg:argv[1],shardIndex:index,shardCount:count,receiptArg:argv[7]};
}
function safeReceiptPath(arg,index){
  check(typeof arg==='string'&&/^artifacts\/test-shards\/shard-[0-3]\.json$/.test(arg)&&arg===`artifacts/test-shards/shard-${index}.json`,'fixed in-repository artifact receipt path');
  const absolute=resolve(root,arg), rel=relative(root,absolute);
  check(rel&&!rel.startsWith('..')&&!isAbsolute(rel),'receipt path stays under repository');
  const parent=resolve(root,'artifacts/test-shards');
  return {absolute,parent};
}
function writeReceipt(path,receipt){
  mkdirSync(path.parent,{recursive:true});
  const temp=`${path.absolute}.${process.pid}.tmp`;
  writeFileSync(temp,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  renameSync(temp,path.absolute);
}
function sourceIdentity(){return assertClassMappingCurrentSourceIdentity();}
function runNode(files,environment,index){
  return new Promise(resolvePromise=>{
    const logRoot=resolve(root,'artifacts/test-shards');mkdirSync(logRoot,{recursive:true});
    const stdoutPath=resolve(logRoot,`shard-${index}.tap`),stderrPath=resolve(logRoot,`shard-${index}.stderr`);
    const outFd=openSync(stdoutPath,'wx',0o600);let errFd;
    try{errFd=openSync(stderrPath,'wx',0o600);}catch(error){closeSync(outFd);throw error;}
    const child=spawn(process.execPath,['--test','--test-reporter=tap',...files],{cwd:root,env:environment,stdio:['ignore','pipe','pipe']});
    let tail=''; const retain=chunk=>{tail=(tail+chunk).slice(-131072);};
    child.stdout.on('data',chunk=>{writeSync(outFd,chunk);process.stdout.write(chunk);retain(chunk.toString('utf8'));});
    child.stderr.on('data',chunk=>{writeSync(errFd,chunk);process.stderr.write(chunk);retain(chunk.toString('utf8'));});
    let processError=null;child.on('error',error=>{processError=error.message;});
    child.on('close',(status,signal)=>{
      closeSync(outFd);closeSync(errFd);
      const logs=[stdoutPath,stderrPath].map(file=>{const bytes=readFileSync(file);return {path:relative(root,file),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};});
      resolvePromise({status,signal,processError,tapSummary:parseTapSummary(tail),logs,tailBytes:Buffer.byteLength(tail)});
    });
  });
}
function cleanTrackedDist(environment){
  const result=spawnSync('/usr/bin/git',['--no-replace-objects','diff','--exit-code','HEAD','--','dist'],{cwd:root,env:environment,encoding:'utf8'});
  return {clean:result.status===0,exitCode:result.status,stderr:result.stderr??'',error:result.error?.message??null};
}
async function main(){
  const args=parseArgs(process.argv.slice(2)), output=safeReceiptPath(args.receiptArg,args.shardIndex);
  const python=realpathSync(resolve(args.pythonArg));
  check(lstatSync(python).isFile(),'physical Python file');accessSync(python,constants.X_OK);
  const roster=collectRoster(root);const shard=deriveShards(roster)[args.shardIndex];
  const runId=process.env.GITHUB_RUN_ID,runAttempt=process.env.GITHUB_RUN_ATTEMPT;
  check(/^\d+$/.test(runId??'')&&/^\d+$/.test(runAttempt??''),'GitHub run ID and attempt required');
  const env={...controlledGitEnvironment(),PATH:[dirname(process.execPath),dirname(python),'/usr/bin','/bin'].join(':'),TMPDIR:'/tmp',TZ:'UTC',CI:'true'};
  const gitCommit=execFileSync('/usr/bin/git',['--no-replace-objects','rev-parse','HEAD'],{cwd:root,env,encoding:'utf8'}).trim();
  check(gitCommit===process.env.GITHUB_SHA,'checkout matches the workflow commit');
  const before=sourceIdentity();
  let child=null,dist=null,after=null,error=null,rosterAfter=null,gitCommitAfter=null;
  try{
    child=await runNode(shard.entries.map(row=>row.path),env,args.shardIndex);
    dist=cleanTrackedDist(env);
    after=sourceIdentity();
    rosterAfter=collectRoster(root);
    gitCommitAfter=execFileSync('/usr/bin/git',['--no-replace-objects','rev-parse','HEAD'],{cwd:root,env,encoding:'utf8'}).trim();
  }catch(cause){error=cause?.stack??String(cause);}
  const selectedFileHashes=Object.fromEntries(shard.entries.map(row=>[row.path,row.sha256]));
  const status=!error&&child?.status===0&&!child?.processError&&child?.tapSummary?.tests>0&&child?.tapSummary?.fail===0&&child?.tapSummary?.cancelled===0&&dist?.clean===true&&gitCommitAfter===gitCommit&&rosterAfter?.rosterSha256===roster.rosterSha256&&after&&JSON.stringify(before)===JSON.stringify(after)?'success':'failed';
  const receipt={schemaVersion:1,status,runId,runAttempt,gitCommit,gitCommitAfter,sourceRosterSha256:roster.rosterSha256,sourceRosterSha256After:rosterAfter?.rosterSha256??null,topLevelFileCount:roster.topLevelFileCount,mainFileCount:roster.mainFileCount,shardCount:args.shardCount,rosterEntries:roster.entries,shardIndex:args.shardIndex,selectedFiles:shard.entries.map(row=>row.path),selectedFileHashes,expectedFileCount:shard.entries.length,actualExecutedFiles:child?.status===0?shard.entries.map(row=>row.path):[],nodeExitCode:child?.status??null,processError:child?.processError??error??null,signal:child?.signal??null,tapSummary:child?.tapSummary??null,logs:child?.logs??[],distTrackedTreeCleanAfter:dist?.clean??false,distCheckExitCode:dist?.exitCode??null,sourceIdentityBefore:before,sourceIdentityAfter:after,runnerError:error};
  writeReceipt(output,receipt);
  if(status!=='success')throw new Error(`Shard ${args.shardIndex} failed; receipt retained for reducer: ${JSON.stringify({nodeExitCode:receipt.nodeExitCode,processError:receipt.processError,distTrackedTreeCleanAfter:receipt.distTrackedTreeCleanAfter,tapSummary:receipt.tapSummary})}`);
  process.stdout.write(JSON.stringify({status,shardIndex:args.shardIndex,shardCount:args.shardCount,selectedFileCount:shard.entries.length,sourceRosterSha256:roster.rosterSha256,receipt:args.receiptArg})+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(`${error.stack??error}\n`);process.exitCode=1;});
