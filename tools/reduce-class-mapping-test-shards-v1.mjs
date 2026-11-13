// Proposed target: tools/reduce-class-mapping-test-shards-v1.mjs
// Validates only current-run receipts; any missing, stale, failed, or incomplete result exits nonzero.
import {mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync, lstatSync} from 'node:fs';
import {dirname, resolve, relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {assertClassMappingCurrentSourceIdentity} from './class-mapping-current-source-gate-v1.mjs';
import {controlledGitEnvironment} from './class-mapping-raw-git-v1.mjs';
import {validateReceiptSet, parseTapSummary} from './class-mapping-test-sharding-core-v1.mjs';
const root=realpathSync(resolve(import.meta.dirname,'..'));
function check(ok,message){if(!ok)throw new Error(`Shard reducer: ${message}`);}
function readArtifact(path){const absolute=resolve(root,path);check(relative(root,absolute)===path,'fixed in-repository artifact path');check(lstatSync(absolute).isFile()&&realpathSync(absolute)===absolute,'physical artifact file');return readFileSync(absolute);}
function readReceipt(path){return JSON.parse(readArtifact(path).toString('utf8'));}
function verifyLogs(receipt,prefix){
 check(Array.isArray(receipt.logs)&&receipt.logs.length===2,'two complete output logs required');
 const names=[`artifacts/test-shards/${prefix}.tap`,`artifacts/test-shards/${prefix}.stderr`];
 for(const path of names){const entries=receipt.logs.filter(log=>log.path===path);check(entries.length===1,'one exact log identity');const bytes=readArtifact(path);check(entries[0].bytes===bytes.length&&entries[0].sha256===createHash('sha256').update(bytes).digest('hex'),'complete output log hash and size');}
 const actual=parseTapSummary(readArtifact(names[0]).toString('utf8'));
 const expected=prefix==='mm'?{tests:receipt.historicalMmReplay?.actualAssertions,pass:receipt.historicalMmReplay?.passed,fail:receipt.historicalMmReplay?.failed,cancelled:0,skipped:receipt.historicalMmReplay?.skipped,todo:0}:receipt.tapSummary;
 check(isDeepStrictEqual(actual,expected),'receipt outcomes match the complete actual TAP log');
}
function writeReport(report){const path=resolve(root,'artifacts/test-shards/reducer.json');mkdirSync(dirname(path),{recursive:true});const tmp=`${path}.${process.pid}.tmp`;writeFileSync(tmp,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});renameSync(tmp,path);}
function main(){
 check(process.argv.length===2,'no command-line overrides');
 const runId=process.env.GITHUB_RUN_ID,runAttempt=process.env.GITHUB_RUN_ATTEMPT;
 check(/^\d+$/.test(runId??'')&&/^\d+$/.test(runAttempt??''),'GitHub run ID and attempt required');
 const env=controlledGitEnvironment();const gitCommit=execFileSync('/usr/bin/git',['--no-replace-objects','rev-parse','HEAD'],{cwd:root,env,encoding:'utf8'}).trim();
 check(gitCommit===process.env.GITHUB_SHA,'checkout matches workflow commit');
 const shardReceipts=[0,1,2,3].map(i=>readReceipt(`artifacts/test-shards/shard-${i}.json`));
 const mmReceipt=readReceipt('artifacts/test-shards/mm.json');
 shardReceipts.forEach((receipt,index)=>verifyLogs(receipt,`shard-${index}`));verifyLogs(mmReceipt,'mm');
 const currentIdentity=assertClassMappingCurrentSourceIdentity();
 check(/^[a-f0-9]{40}$/.test(currentIdentity.summary.sourceCommit),'qualified logical source epoch commit');
 execFileSync('/usr/bin/git',['--no-replace-objects','merge-base','--is-ancestor',currentIdentity.summary.sourceCommit,gitCommit],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 const summary=validateReceiptSet({repositoryRoot:root,shardReceipts,mmReceipt,runId,runAttempt,gitCommit,matrixResult:process.env.CM_SHARDS_JOB_RESULT,mmJobResult:process.env.CM_MM_JOB_RESULT,currentIdentity});
 writeReport(summary);process.stdout.write(JSON.stringify(summary)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(error){const report={schemaVersion:1,status:'failed',runId:process.env.GITHUB_RUN_ID??null,runAttempt:process.env.GITHUB_RUN_ATTEMPT??null,error:error.stack??String(error)};try{writeReport(report);}catch{}process.stderr.write(`${error.stack??error}\n`);process.exitCode=1;}}
