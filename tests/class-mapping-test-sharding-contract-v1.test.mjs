// Pure contract checks. Synthetic receipts are not Native or CI qualification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {collectRoster,deriveShards,rosterDigest,validateReceiptSet,parseTapSummary,DEDICATED_MM_PATH,SHARD_COUNT,R5_ROSTER_PATH} from '../tools/class-mapping-test-sharding-core-v1.mjs';
const root=process.cwd(),roster=collectRoster(root),shards=deriveShards(roster);
const checkout='fa45f44c8ccc3d80226984fab7792eac9353b252',logicalSource='2d35138027f00c0740975e519dbb3a2b6df76d14';
const identity={summary:{sourceCommit:logicalSource,sourceTree:'40ecb15130b339658522794db6d9e1bc58f43b50'},inputHashes:{sourceBody:{'fixture.json':'a'.repeat(64)}}};
const runId='123456',runAttempt='1';
function common(){return {schemaVersion:1,status:'success',runId,runAttempt,gitCommit:checkout,gitCommitAfter:checkout,sourceRosterSha256:roster.rosterSha256,sourceRosterSha256After:roster.rosterSha256,topLevelFileCount:roster.topLevelFileCount,mainFileCount:roster.mainFileCount,shardCount:SHARD_COUNT,rosterEntries:roster.entries,sourceIdentityBefore:structuredClone(identity),sourceIdentityAfter:structuredClone(identity),distTrackedTreeCleanAfter:true};}
function fixtures(){return {receipts:shards.map(s=>{const files=s.entries.map(e=>e.path);return {...common(),shardIndex:s.shardIndex,selectedFiles:files,actualExecutedFiles:files,selectedFileHashes:Object.fromEntries(s.entries.map(e=>[e.path,e.sha256])),expectedFileCount:files.length,nodeExitCode:0,processError:null,tapSummary:{tests:1,pass:1,fail:0,cancelled:0,skipped:0,todo:0}};}),mm:{...common(),historicalMmReplay:{capsuleManifestSha256:'5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003',capsuleFileCount:25,sourceInputCount:21,expectedAssertions:19,actualAssertions:19,passed:19,failed:0,skipped:0,activeInputMapsUnchanged:true,currentS1SourceCommit:logicalSource}}};}
function validate(f=fixtures(),overrides={}){return validateReceiptSet({repositoryRoot:root,shardReceipts:f.receipts,mmReceipt:f.mm,runId,runAttempt,gitCommit:checkout,matrixResult:'success',mmJobResult:'success',currentIdentity:identity,...overrides});}
function reject(mutate,overrides={}){const f=fixtures();mutate(f);assert.throws(()=>validate(f,overrides));}

test('every old217 source remains exact and every current addition is selected once',()=>{
 assert(roster.topLevelFileCount>=218);assert.equal(roster.mainFileCount+1,roster.topLevelFileCount);
 assert.equal(roster.entries.filter(e=>e.original200Entry).length,200);
 const paths=shards.flatMap(s=>s.entries.map(e=>e.path));assert.equal(paths.length,roster.mainFileCount);assert.equal(new Set(paths).size,paths.length);
 assert(!paths.includes(DEDICATED_MM_PATH));assert(paths.includes('tests/class-mapping-test-sharding-contract-v1.test.mjs'));
 const added={path:'tests/zz-future-extra.test.mjs',sha256:'c'.repeat(64),sizeBytes:123,route:'main-node-test',mainOrdinal:roster.mainFileCount,shardIndex:roster.mainFileCount%SHARD_COUNT};
 const future={...roster,entries:[...roster.entries,added]};future.rosterSha256=rosterDigest(future.entries);assert.equal(deriveShards(future).flatMap(s=>s.entries).filter(e=>e.path===added.path).length,1);
});
test('the actual distinct checkout and logical-source roles are accepted',()=>{assert.notEqual(checkout,logicalSource);const result=validate();assert.equal(result.gitCommit,checkout);assert.equal(result.logicalSourceCommit,logicalSource);assert.equal(result.mainTestOutcomes.tests,4);});
test('missing or duplicate shard receipts are rejected',()=>{reject(f=>f.receipts.pop());reject(f=>{f.receipts[1].shardIndex=0;});});
test('omitted or substituted selected files are rejected',()=>{reject(f=>f.receipts[0].selectedFiles.pop());reject(f=>{f.receipts[0].selectedFileHashes[f.receipts[0].selectedFiles[0]]='b'.repeat(64);});});
test('failed, cancelled and skipped process results are rejected',()=>{reject(f=>{f.receipts[0].status='failed';f.receipts[0].nodeExitCode=1;});reject(f=>{f.receipts[0].nodeExitCode=null;f.receipts[0].status='cancelled';});reject(f=>{f.receipts[0].status='skipped';});});
test('both workflow dependencies must explicitly succeed',()=>{reject(()=>{}, {matrixResult:'failure'});reject(()=>{}, {mmJobResult:'cancelled'});reject(()=>{}, {matrixResult:undefined});});
test('receipt run, attempt and checkout identities cannot drift',()=>{reject(f=>{f.receipts[1].runId='999';});reject(f=>{f.receipts[1].runAttempt='2';});reject(f=>{f.receipts[1].gitCommit=logicalSource;});reject(f=>{f.receipts[1].gitCommitAfter=logicalSource;});});
test('logical-source and physical-input drift are independently rejected',()=>{reject(f=>{f.receipts[2].sourceIdentityAfter.summary.sourceCommit=checkout;});reject(f=>{f.receipts[2].sourceIdentityAfter.inputHashes.sourceBody['fixture.json']='b'.repeat(64);});reject(()=>{}, {currentIdentity:undefined});});
test('roster changes or tracked dist changes during execution are rejected',()=>{reject(f=>{f.receipts[0].sourceRosterSha256After='b'.repeat(64);});reject(f=>{f.receipts[0].distTrackedTreeCleanAfter=false;});});
test('the exact single historical replay must pass all19 assertions',()=>{reject(f=>{f.mm.historicalMmReplay.passed=18;f.mm.historicalMmReplay.failed=1;});reject(f=>{f.mm.historicalMmReplay.skipped=1;});reject(f=>{f.mm.historicalMmReplay.actualAssertions=18;});reject(f=>{f.mm.historicalMmReplay.currentS1SourceCommit=checkout;});});
test('TAP outcomes stay visible and incomplete summaries cannot pass',()=>{
 const tap='# tests 2\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 1\n# todo 0\n';
 assert.deepEqual(parseTapSummary(tap),{tests:2,pass:1,fail:0,cancelled:0,skipped:1,todo:0});reject(f=>{f.receipts[0].tapSummary.tests=9;});reject(f=>{f.receipts[0].tapSummary=null;});
 const f=fixtures();f.receipts[0].tapSummary=parseTapSummary(tap);assert.equal(validate(f).mainTestOutcomes.skipped,1);
});
test('all original report commands and pinned actions remain in the gated workflow',()=>{
 const workflow=readFileSync(resolve(root,'.github/workflows/pages.yml'),'utf8'),baseline=JSON.parse(readFileSync(resolve(root,R5_ROSTER_PATH),'utf8'));
 for(const block of baseline.preservedNonMonolithicBuildRunBlocks)assert(workflow.includes(block),`lost original report block: ${block.split('\n')[0]}`);
 for(const job of ['class-mapping-test-shards','historical-mm-replay','test-shard-reducer'])assert.match(workflow,new RegExp(`^  ${job}:\\s*$`,'m'));
 assert(workflow.includes('needs: [class-mapping-test-shards, historical-mm-replay, test-shard-reducer]'));assert(workflow.includes('needs: build'));assert(workflow.includes('fail-fast: false'));
 assert(!/^\s*continue-on-error\s*:/m.test(workflow));assert(!/--test-(?:name|skip)-pattern/.test(workflow));assert(!workflow.includes('node tools/run-class-mapping-tests-v1.mjs'));
 for(const key of ['CM_SHARDS_RESULT','CM_MM_RESULT','CM_REDUCER_RESULT'])assert(workflow.includes(key));
 assert(workflow.indexOf('- name: Require complete current test suite')<workflow.indexOf('- name: Capture build metadata'));
 assert.match(workflow,/actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803/);assert.match(workflow,/actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
});
test('the versioned code receipt pins new executable paths and the old registry bytes',async()=>{
 const receipt=JSON.parse(readFileSync(resolve(root,'research/class-mapping-ci-sharding-v1/code-pins-v1.json'),'utf8'));
 const paths=['tools/class-mapping-test-sharding-core-v1.mjs','tools/run-class-mapping-tests-shard-v1.mjs','tools/run-historical-mm-replay-receipt-v1.mjs','tools/reduce-class-mapping-test-shards-v1.mjs','tests/class-mapping-test-sharding-contract-v1.test.mjs'];
 assert.deepEqual(receipt.codePins.map(x=>x.path).sort(),paths.sort());
 const {historicalReaderInstallationPins}=await import('../research/class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs');
 const old=Object.entries(historicalReaderInstallationPins.codePins).map(([path,pin])=>({path,...pin}));
 assert.equal(old.length,175);assert.deepEqual(receipt.allCodePins.slice(0,old.length),old);assert.deepEqual(receipt.allCodePins.slice(old.length),receipt.codePins);
 for(const pin of [...receipt.codePins,receipt.workflow,receipt.baseline,receipt.historicalRegistry]){const bytes=readFileSync(resolve(root,pin.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256,pin.path);assert.equal(bytes.length,pin.sizeBytes,pin.path);}
});
