// Proposed target: tools/run-historical-mm-replay-receipt-v1.mjs
// Calls the unchanged 19-assertion replay exactly once and writes only an artifact receipt.
import {mkdirSync, realpathSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, resolve, relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assertClassMappingCurrentSourceIdentity} from './class-mapping-current-source-gate-v1.mjs';
import {controlledGitEnvironment} from './class-mapping-raw-git-v1.mjs';
import {assertTrackedCheckoutClean} from './class-mapping-ci-tracked-checkout-v1.mjs';
import {replayHistoricalMmNativeTests} from './replay-historical-mm-native-tests-v1.mjs';
import {collectRoster, MM_CAPSULE_SHA256} from './class-mapping-test-sharding-core-v2.mjs';
const root=realpathSync(resolve(import.meta.dirname,'..'));
function check(ok,message){if(!ok)throw new Error(`MM replay receipt: ${message}`);}
function receiptPath(argv){check(argv.length===2&&argv[0]==='--receipt','use --receipt artifacts/test-shards/mm.json');check(argv[1]==='artifacts/test-shards/mm.json','fixed receipt path');const path=resolve(root,argv[1]);check(relative(root,path)==='artifacts/test-shards/mm.json','receipt stays inside checkout');return path;}
function writeAtomic(path,value){mkdirSync(dirname(path),{recursive:true});const tmp=`${path}.${process.pid}.tmp`;writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});renameSync(tmp,path);}
function main(){
 const out=receiptPath(process.argv.slice(2));const runId=process.env.GITHUB_RUN_ID,runAttempt=process.env.GITHUB_RUN_ATTEMPT;
 check(/^\d+$/.test(runId??'')&&/^\d+$/.test(runAttempt??''),'GitHub run ID and attempt required');
 const env=controlledGitEnvironment();const gitCommit=execFileSync('/usr/bin/git',['--no-replace-objects','rev-parse','HEAD'],{cwd:root,env,encoding:'utf8'}).trim();
 check(gitCommit===process.env.GITHUB_SHA,'checkout matches workflow commit');
 const trackedBefore=assertTrackedCheckoutClean(root);
 const roster=collectRoster(root);const before=assertClassMappingCurrentSourceIdentity();
 // This is the only call to the existing immutable replay in this job.
 let replay=null,after=null,rosterAfter=null,gitCommitAfter=null,error=null,trackedAfter=null;
 try{
  replay=replayHistoricalMmNativeTests();
  trackedAfter=assertTrackedCheckoutClean(root);
  after=assertClassMappingCurrentSourceIdentity();rosterAfter=collectRoster(root);
  gitCommitAfter=execFileSync('/usr/bin/git',['--no-replace-objects','rev-parse','HEAD'],{cwd:root,env,encoding:'utf8'}).trim();
 }catch(cause){error=cause.stack??String(cause);}
 const result=replay?.result;
 const historicalMmReplay=replay?{capsuleManifestSha256:replay.manifest.sha256,capsuleFileCount:replay.manifest.files,sourceInputCount:replay.manifest.sourcePaths,expectedAssertions:19,actualAssertions:result.tests,passed:result.passed,failed:result.failed,skipped:result.skipped,activeInputMapsUnchanged:replay.activeInputMapsUnchanged,currentS1SourceCommit:replay.currentS1SourceCommit,capsuleAndPrivateTmpRemoved:replay.capsuleAndPrivateTmpRemoved,activeSourceFilesWritten:replay.activeSourceFilesWritten}:null;
 const distClean=execFileSync('/usr/bin/git',['--no-replace-objects','diff','--name-only','HEAD','--','dist'],{cwd:root,env,encoding:'utf8'}).trim()==='';
 const status=!error&&replay.manifest.sha256===MM_CAPSULE_SHA256&&result.status===0&&result.tests===19&&result.passed===19&&result.failed===0&&result.skipped===0&&JSON.stringify(before)===JSON.stringify(after)&&replay.activeInputMapsUnchanged&&rosterAfter?.rosterSha256===roster.rosterSha256&&gitCommitAfter===gitCommit&&distClean&&trackedBefore.trackedTreeClean===true&&trackedAfter?.trackedTreeClean===true?'success':'failed';
 const logs=[['mm.tap',result?.stdout??''],['mm.stderr',(result?.stderr??'')+(error??'')]].map(([name,text])=>{const bytes=Buffer.from(text),path=resolve(root,'artifacts/test-shards',name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes,{flag:'wx',mode:0o600});return {path:relative(root,path),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
 const receipt={schemaVersion:1,status,runId,runAttempt,gitCommit,gitCommitAfter,sourceRosterSha256:roster.rosterSha256,sourceRosterSha256After:rosterAfter?.rosterSha256??null,topLevelFileCount:roster.topLevelFileCount,mainFileCount:roster.mainFileCount,shardCount:4,rosterEntries:roster.entries,sourceIdentityBefore:before,sourceIdentityAfter:after,historicalMmReplay,trackedCheckoutBefore:trackedBefore,trackedCheckoutAfter:trackedAfter,distTrackedTreeCleanAfter:distClean,logs,runnerError:error};
 writeAtomic(out,receipt);process.stdout.write(JSON.stringify({status:receipt.status,runId,runAttempt,gitCommit,sourceRosterSha256:roster.rosterSha256,receipt:'artifacts/test-shards/mm.json'})+'\n');
 check(status==='success','historical replay failed; receipt and output retained');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(error){process.stderr.write(`${error.stack??error}\n`);process.exitCode=1;}}
