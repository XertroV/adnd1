// Source2 semantic successor for the frozen 6502 sharding/workflow contract.
// The old versioned-registry assertion below is copied intact except that its
// historical pages.yml pin is checked against the exact frozen 6502 fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readActualV10WorkflowInput} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
import {assertClassMappingCurrentSourceIdentity} from '../tools/class-mapping-current-source-gate-v2.mjs';
const root=process.cwd();
// Explicit second historical lane: retained v4 live assertions read the exact
// reviewed runner-only workflow. New date assertions use the actual fs alias.
function readPhysicalWorkflowInput(path,encoding){
 if(resolve(String(path))===resolve(root,'.github/workflows/pages.yml')){
  assert(encoding===undefined||encoding==='utf8','closed reviewed runner-workflow encoding');
  const compressed=readActualV10WorkflowInput(resolve(root,'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/predecessor-pages-v10-runner-v1.yml.gz'));
  assert.equal(compressed.length,4956);assert.equal(createHash('sha256').update(compressed).digest('hex'),'10064e49c867fc3a72c1a1ef740cef09ecc8825e9d3823a4ae0978f2405b378a');
  const bytes=gunzipSync(compressed,{maxOutputLength:29180});assert.equal(bytes.length,29180);assert.equal(createHash('sha256').update(bytes).digest('hex'),'91d774a553d93e808cb9d7cb3bc42ad559afea8134104f0c70c1a4e41f652896');
  return encoding==='utf8'?bytes.toString('utf8'):bytes;
 }
 return readActualV10WorkflowInput(path,encoding);
}

// Explicit historical lane for every retained v3 workflow assertion below.
// Current v10 assertions at the end use readPhysicalWorkflowInput directly.
function readFileSync(path,encoding){
 if(resolve(String(path))===resolve(root,'.github/workflows/pages.yml')){
  assert(encoding===undefined||encoding==='utf8','closed historical workflow read encoding');
  const compressed=readPhysicalWorkflowInput(resolve(root,'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/predecessor-pages-v9.yml.gz'));
  assert.equal(compressed.length,4955);assert.equal(createHash('sha256').update(compressed).digest('hex'),'dbec8cbd36850cb591083485cf816ccffae3bdd54daac43aadb87708e47baf05');
  const bytes=gunzipSync(compressed,{maxOutputLength:29180});assert.equal(bytes.length,29180);assert.equal(createHash('sha256').update(bytes).digest('hex'),'8f0a07d808ddd2e3be751bf7beaa261708143893cecce96b655eff34e038b959');
  return encoding==='utf8'?bytes.toString('utf8'):bytes;
 }
 return readPhysicalWorkflowInput(path,encoding);
}

const R5_ROSTER_PATH='research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const WORKFLOW_MAP_PATH='research/class-mapping-ci-sharding-v1/source2-test-transition-v1/reviewed-24-workflow-block-transition-v2.json';
const WORKFLOW_MAP_SHA256='71cb988a084255378f387852bac29a2649be4c8f24383bad2ec8130874d4ebed';
const PREDECESSOR_WORKFLOW_PATH='research/class-mapping-ci-sharding-v1/source2-test-transition-v1/predecessor-pages-6502.yml.gz';
const PREDECESSOR_WORKFLOW_GZIP_SHA256='a06b0c0797c4b156e29c426ebe0c8e9f58b75e4a3e0169c86fae93e8fae1f760';
const PREDECESSOR_WORKFLOW_GZIP_SIZE_BYTES=4706;
const PREDECESSOR_WORKFLOW_SHA256='fa7dcf6701e5622a71161880ea1006ea0104e428c9d63fae1b5276b3494023df';
const PREDECESSOR_WORKFLOW_SIZE_BYTES=26701;
const FROZEN_GUARD_PATH='research/class-mapping-ci-sharding-v1/source2-test-transition-v1/frozen-current-workflow-guard-callback-v1.mjs';
const FROZEN_GUARD_SHA256='a47450ed5cf802834070461b337ec4e5f098f28a690cdb1386e28f78ad41778f';
const DETECTOR_REPLAY_PATH='research/class-mapping-ci-sharding-v1/source2-test-transition-v1/workflow-detector-replay-v1.json';
const DETECTOR_REPLAY_SHA256='dfe249934bb54345b90dc8795cbeba7587f7cdd127371df93689fb210d76f71f';
const EXPECTED_WORKFLOW_ROLES=[
 'Verify preserved citation evidence','Verify committed static output is current','Generate citation systemic inventory',
 'Reconcile source-table row citations','Verify citation owner identity','Verify monetary source inventory',
 'Verify recorded monetary row identity findings','Join monetary values with current review coverage',
 'Verify current monetary source question dispositions','Verify duplicated monetary focus declarations',
 'Inventory monetary conditions and source contracts','Rebuild and validate current raster and visual coverage',
 'Check current citation field captions','Inventory quantity and source absence assertions','Verify monetary unit provenance',
 'Verify UA source context obligations','Verify current continuation candidate snapshot','Verify declared continuation aliases',
 'Inventory consecutive-page excerpt candidates','Summarize source visual coverage','Check class advancement and source qualifiers',
 'Verify published gaps match current coverage reports','Verify coverage report counts and review scopes','Capture build metadata'
];
const VERSIONED_WORKFLOW_ORDINALS=new Set([1,2,8,11,14,16,20,21,22]);
function validateReviewedWorkflowMapping(map,oldBlocks,workflow=null){
 const nodeToolNames=block=>Array.from(block.matchAll(/tools\/([A-Za-z0-9._-]+\.mjs)/g),match=>match[1]);
 assert.equal(map.status,'COMMAND_ROLES_REVIEWED_IMPLEMENTATION_AND_FULL_SUITE_PENDING');
 assert.equal(map.requiredBlockCount,24);assert.equal(map.rows.length,24);assert.equal(oldBlocks.length,24);
 const roles=map.rows.map(row=>row.role);assert.equal(roles.length,24,'workflow map has exactly 24 roles');assert.deepEqual(roles,EXPECTED_WORKFLOW_ROLES,'workflow role sequence must exactly match the reviewed R5 roles');assert.equal(new Set(roles).size,24,'workflow roles must be unique');
 if(workflow!==null){assert.equal(sha(Buffer.from(workflow)),map.proposedWorkflow.sha256);for(const row of map.rows)assert.equal(workflow.split(row.after.utf8).length-1,1,`missing/duplicate exact approved role ${row.role}`);}
 let unchanged=0,versioned=0;
 for(let index=0;index<24;index++){
  const row=map.rows[index],before=Buffer.from(row.before.utf8),after=Buffer.from(row.after.utf8);
  assert.equal(row.ordinal,index);assert.equal(row.frozenR5BlockSha256,sha(Buffer.from(oldBlocks[index])));assert.equal(row.before.utf8,oldBlocks[index]);
  assert.equal(row.before.sizeBytes,before.length);assert.equal(row.before.sha256,sha(before));assert.equal(row.after.sizeBytes,after.length);assert.equal(row.after.sha256,sha(after));assert.deepEqual(row.beforeNodeTools,nodeToolNames(row.before.utf8),`beforeNodeTools match R5 row ${index}`);assert.deepEqual(row.afterNodeTools,nodeToolNames(row.after.utf8),`afterNodeTools match candidate row ${index}`);
  if(VERSIONED_WORKFLOW_ORDINALS.has(index)){versioned++;assert.equal(row.mode,'reviewed-versioned-command-or-error-capture-transition');assert.notEqual(row.before.sha256,row.after.sha256);}
  else{unchanged++;assert.equal(row.mode,'exact-unchanged');assert.equal(row.after.utf8,row.before.utf8);assert.equal(row.after.sha256,row.before.sha256);}
 }
 assert.equal(unchanged,15);assert.equal(versioned,9);return true;
}

test('reviewed 24-block map preserves all R5 roles and pins nine versioned workflow successors',()=>{
 const mapBytes=readFileSync(resolve(root,WORKFLOW_MAP_PATH));assert.equal(mapBytes.length,46126);assert.equal(sha(mapBytes),WORKFLOW_MAP_SHA256);
 const map=JSON.parse(mapBytes.toString('utf8'));assert.equal(map.scope,'Exact command-block transition only; not report qualification or whole-book source review.');
 const baselineBytes=readFileSync(resolve(root,R5_ROSTER_PATH));assert.equal(baselineBytes.length,53707);assert.equal(sha(baselineBytes),'e5f8917bb9f878fa7ae1e5406584988936fc623e173a9d2a0a2613aaf67b0142');
 const baseline=JSON.parse(baselineBytes.toString('utf8')),oldBlocks=baseline.preservedNonMonolithicBuildRunBlocks;
 validateReviewedWorkflowMapping(map,oldBlocks);
 const gzipBeforeWorkflow=readFileSync(resolve(root,PREDECESSOR_WORKFLOW_PATH));assert.equal(gzipBeforeWorkflow.length,PREDECESSOR_WORKFLOW_GZIP_SIZE_BYTES);assert.equal(sha(gzipBeforeWorkflow),PREDECESSOR_WORKFLOW_GZIP_SHA256);const beforeWorkflow=gunzipSync(gzipBeforeWorkflow);assert.equal(beforeWorkflow.length,PREDECESSOR_WORKFLOW_SIZE_BYTES);assert.equal(sha(beforeWorkflow),PREDECESSOR_WORKFLOW_SHA256);assert.equal(map.beforeWorkflow.sha256,PREDECESSOR_WORKFLOW_SHA256);assert.equal(map.beforeWorkflow.sizeBytes,beforeWorkflow.length);
 const workflowBytes=readFileSync(resolve(root,'.github/workflows/pages.yml'));assert.equal(workflowBytes.length,map.proposedWorkflow.sizeBytes);assert.equal(sha(workflowBytes),map.proposedWorkflow.sha256);
 const workflow=workflowBytes.toString('utf8');validateReviewedWorkflowMapping(map,oldBlocks,workflow);
});

test('balanced role substitution rejects after rebinding the workflow hash; duplicate 24-role mapping rejects',()=>{
 const bytes=readFileSync(resolve(root,WORKFLOW_MAP_PATH)),map=JSON.parse(bytes.toString('utf8')),baseline=JSON.parse(readFileSync(resolve(root,R5_ROSTER_PATH),'utf8'));
 const candidate=readFileSync(resolve(root,'.github/workflows/pages.yml'),'utf8');
 const balanced=structuredClone(map),original=balanced.rows[1].after.utf8,substitute=balanced.rows[2].after.utf8;
 const mutant=candidate.replace(original,substitute);assert.notEqual(mutant,candidate);balanced.proposedWorkflow.sha256=sha(Buffer.from(mutant));assert.throws(()=>validateReviewedWorkflowMapping(balanced,baseline.preservedNonMonolithicBuildRunBlocks,mutant),/missing\/duplicate exact approved role/);
 const duplicate=structuredClone(map);duplicate.rows[1]={...duplicate.rows[2],ordinal:1};assert.throws(()=>validateReviewedWorkflowMapping(duplicate,baseline.preservedNonMonolithicBuildRunBlocks,candidate),/workflow role sequence must exactly match the reviewed R5 roles/);
});

test('frozen predecessor guard passes on fa7 and rejects the 825e0c candidate as expected',()=>{
 const map=JSON.parse(readFileSync(resolve(root,WORKFLOW_MAP_PATH),'utf8'));
 const fixture=readFileSync(resolve(root,PREDECESSOR_WORKFLOW_PATH));
 const candidate=readFileSync(resolve(root,'.github/workflows/pages.yml'));
 const baselineBytes=readFileSync(resolve(root,R5_ROSTER_PATH));
 const callback=readFileSync(resolve(root,FROZEN_GUARD_PATH));assert.equal(callback.length,2003);assert.equal(sha(callback),FROZEN_GUARD_SHA256);
 assert.equal(fixture.length,PREDECESSOR_WORKFLOW_GZIP_SIZE_BYTES);assert.equal(sha(fixture),PREDECESSOR_WORKFLOW_GZIP_SHA256);const decodedFixture=gunzipSync(fixture);assert.equal(decodedFixture.length,PREDECESSOR_WORKFLOW_SIZE_BYTES);assert.equal(sha(decodedFixture),PREDECESSOR_WORKFLOW_SHA256);assert.equal(sha(candidate),map.proposedWorkflow.sha256);
 assert.equal(baselineBytes.length,53707);assert.equal(sha(baselineBytes),'e5f8917bb9f878fa7ae1e5406584988936fc623e173a9d2a0a2613aaf67b0142');
 const replayBytes=readFileSync(resolve(root,DETECTOR_REPLAY_PATH));assert.equal(sha(replayBytes),DETECTOR_REPLAY_SHA256);
 const replay=JSON.parse(replayBytes.toString('utf8'));assert.equal(replay.status,'PASS');assert.equal(replay.scope,'Isolated exact old workflow assertion callback with registered buffers; prospective candidate reproduction, NOT an actual CI/full-suite failure or pass.');
 assert.equal(replay.originalTest.callbackSha256,FROZEN_GUARD_SHA256);assert.equal(replay.beforeWorkflowSha256,PREDECESSOR_WORKFLOW_SHA256);assert.equal(replay.candidateWorkflowSha256,'825e0ce775a87878cd346b74b2ea38d8394738aef04899bd47ba4dfee0bf66a3','the historical replay remains bound to the original 825e0c workflow');assert.equal(replay.manifestSha256,'4703cbd75b933029844d10077d08de78a8009818fde9c2696c4771ae22bc3f3a','the historical detector replay remains bound to the original v1 map');
 assert.deepEqual(replay.controls.map(row=>row.status),['PASS','REJECTED','PASS','PASS','PASS']);assert.equal(replay.controls[3].counterfactualWorkflowSha256,'cb0de7e9cbfab3c619cbae4583736f9cf800e5cf5970b9909566ab5e2a14da7c');
 const runFrozenCallback=workflowBytes=>{
  let registered=null;const virtualRoot='/virtual-source2-root';
  const fakeReadFileSync=(path,encoding)=>{
   const normalized=String(path);
   if(normalized===resolve(virtualRoot,'.github/workflows/pages.yml'))return encoding==='utf8'?workflowBytes.toString('utf8'):workflowBytes;
   if(normalized===resolve(virtualRoot,R5_ROSTER_PATH))return encoding==='utf8'?baselineBytes.toString('utf8'):baselineBytes;
   throw new Error(`unexpected frozen guard read: ${normalized}`);
  };
  runInNewContext(callback.toString('utf8'),{test:(title,fn)=>{assert.equal(title,'all original report commands and pinned actions remain in the gated workflow');registered=fn;},readFileSync:fakeReadFileSync,resolve,root:virtualRoot,R5_ROSTER_PATH,assert},{timeout:1000});
  assert.equal(typeof registered,'function','frozen original callback is registered exactly once');registered();
 };
 assert.doesNotThrow(()=>runFrozenCallback(decodedFixture),'the original callback passes against its exact fa7 predecessor');
 assert.throws(()=>runFrozenCallback(candidate),/lost original report block: .*Verify committed static output is current/,'the original callback rejects the intended command-block migration');
});

test('current Source2 workflow keeps fixed jobs, barriers, pinned actions, and every shard CLI contract',async()=>{
 const workflow=readFileSync(resolve(root,'.github/workflows/pages.yml'),'utf8');
 for(const job of ['build','class-mapping-test-shards','historical-mm-replay','test-shard-reducer','deploy'])assert.match(workflow,new RegExp(`^  ${job}:\\s*$`,'m'));
 assert(workflow.includes('needs: [class-mapping-test-shards, historical-mm-replay, test-shard-reducer]'));assert(workflow.includes('needs: build'));assert(workflow.includes('fail-fast: false'));
 assert(!/^\s*continue-on-error\s*:/m.test(workflow));assert(!/--test-(?:name|skip)-pattern/.test(workflow));assert(!workflow.includes('node tools/run-class-mapping-tests-v1.mjs'));
 assert.match(workflow,/actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803/);assert.match(workflow,/actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
 for(const flag of ['--python','--shard-index','--shard-count','--receipt'])assert(workflow.includes(flag));
 const entrypointPath='tools/run-class-mapping-tests-source2-shard-v1.mjs';
 assert(workflow.includes(entrypointPath));assert(workflow.includes('tools/run-historical-mm-replay-source2-receipt-v1.mjs --receipt artifacts/test-shards/source2-mm.json'));assert(workflow.includes('tools/reduce-class-mapping-test-source2-shards-v1.mjs'));
 for(const variable of ['CM_SOURCE2_SHARDS_JOB_RESULT','CM_SOURCE2_MM_JOB_RESULT'])assert(workflow.includes(variable),`missing explicitly supplied receipt env ${variable}`);
 assert(workflow.includes('source2-shard-${{ matrix.shard_index }}.json'),'shard artifact path is matrix-bound');assert(workflow.includes('source2-mm.json'));assert(workflow.includes('source2-reducer.json'));assert.match(workflow,/shard_index:\s*\[0, 1, 2, 3\]/);
 const completeCurrentSuite=workflow.indexOf('- name: Require complete current test suite'),captureBuildMetadata=workflow.indexOf('- name: Capture build metadata');assert(completeCurrentSuite>=0&&captureBuildMetadata>=0&&completeCurrentSuite<captureBuildMetadata);
 const shardStart=workflow.indexOf('  class-mapping-test-shards:'),mmStart=workflow.indexOf('  historical-mm-replay:');const shardJob=workflow.slice(shardStart,mmStart);
 assert(shardJob.includes('TMPDIR: /tmp/adnd1-source2-shard-${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.shard_index }}'));assert(shardJob.includes('mkdir -p \"$TMPDIR\"'));assert(!shardJob.includes('runner.temp'));
 assert(workflow.includes('TMPDIR: ${{ runner.temp }}/adnd1-source2-mm-${{ github.run_id }}-${{ github.run_attempt }}'));assert(workflow.includes('TMPDIR: ${{ runner.temp }}/adnd1-source2-reducer-${{ github.run_id }}-${{ github.run_attempt }}'));
 // GitHub supplies GITHUB_RUN_ID/ATTEMPT/SHA to each job. Prove this workflow invokes the pinned thin entrypoint, that the actual entrypoint delegates to core v2, and that the actual core functions consume and forward the three values.
 const entrypointSource=readFileSync(resolve(root,entrypointPath),'utf8');
 const coreSource=readFileSync(resolve(root,'tools/class-mapping-source2-test-runner-core-v2.mjs'),'utf8');
 assert.match(entrypointSource,/import \{runSource2Tests\} from '\.\/class-mapping-source2-test-runner-core-v2\.mjs';/);
 assert.match(entrypointSource,/runSource2Tests\(\{mode:'shard',argv:process\.argv\.slice\(2\),entrypointPath:'tools\/run-class-mapping-tests-source2-shard-v1\.mjs'\}\)/);
 assert.match(coreSource,/const runId = process\.env\.GITHUB_RUN_ID, runAttempt = process\.env\.GITHUB_RUN_ATTEMPT, workflowSha = process\.env\.GITHUB_SHA/);
 assert.match(coreSource,/GITHUB_RUN_ID:run\.runId,\s*GITHUB_RUN_ATTEMPT:run\.runAttempt,\s*GITHUB_SHA:run\.workflowSha/);
 assert.match(coreSource,/run=getRunInfo\(\),env=childEnvironment\(run,python,tmpdir\)/);
 const getRunInfoSource=coreSource.match(/function getRunInfo\(\) \{[\s\S]*?^\}/m)?.[0];
 const childEnvironmentSource=coreSource.match(/function childEnvironment\(run, pythonPath, tmpdir\) \{[\s\S]*?^\}/m)?.[0];
 assert(getRunInfoSource&&childEnvironmentSource,'actual core getRunInfo and childEnvironment functions are present');
 const commit='1'.repeat(40),tree='2'.repeat(40);
 const coreFunctions=runInNewContext(`${getRunInfoSource}\n${childEnvironmentSource}\n({getRunInfo,childEnvironment})`,{
  process:{env:{GITHUB_RUN_ID:'44102420263',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:commit},execPath:'/runtime/node/bin/node'},
  validId:value=>/^\d+$/.test(value??''),check:(condition,message)=>{if(!condition)throw new Error(message);},
  controlledGitEnvironment:()=>({}),execFileSync:(_bin,args)=>args[2]==='HEAD'?`${commit}\n`:`${tree}\n`,root:'/virtual/repo',dirname,resolve
 });
 let delegated=null,runIdentity=null,childEnv=null;
 const callCore=args=>{delegated=args;runIdentity=coreFunctions.getRunInfo();childEnv=coreFunctions.childEnvironment(runIdentity,'/runtime/python/bin/python3','/private/tmp');return Promise.resolve();};
 const absoluteEntrypoint=resolve(root,entrypointPath);
 const executable=entrypointSource.split('\n').filter(line=>!line.startsWith('import ')).join('\n').replace('fileURLToPath(import.meta.url)',JSON.stringify(absoluteEntrypoint));
 runInNewContext(executable,{resolve,process:{argv:['/runtime/node/bin/node',absoluteEntrypoint,'--python','/runtime/python/bin/python3','--shard-index','1','--shard-count','4','--receipt','artifacts/test-shards/source2-shard-1.json'],stderr:{write:()=>{}},exitCode:0},runSource2Tests:callCore});
 await Promise.resolve();
 assert.equal(JSON.stringify(delegated),JSON.stringify({mode:'shard',argv:['--python','/runtime/python/bin/python3','--shard-index','1','--shard-count','4','--receipt','artifacts/test-shards/source2-shard-1.json'],entrypointPath}));
 assert.equal(runIdentity.runId,'44102420263');assert.equal(runIdentity.runAttempt,'1');assert.equal(runIdentity.workflowSha,commit);
 assert.equal(childEnv.GITHUB_RUN_ID,'44102420263');assert.equal(childEnv.GITHUB_RUN_ATTEMPT,'1');assert.equal(childEnv.GITHUB_SHA,commit);
});

test('the versioned code receipt pins new executable paths and the old registry bytes',async()=>{
 const registryContainer=readFileSync(resolve(root,'research/class-mapping-ci-sharding-v1/code-pins-v4.json.gz'));
 const receipt=JSON.parse(gunzipSync(registryContainer,{maxOutputLength:256*1024}).toString('utf8'));
 const paths=[
  "research/ci117-citation-navigation-inventory-transition-independent-review-v2/manifest-v1.json",
  "research/ci117-citation-navigation-inventory-transition-independent-review-v2/review-v1.json",
  "research/ci117-citation-navigation-inventory-transition-proposal-v2/manifest-v2.json",
  "research/ci117-mm-test-caller-closure-v2-independent-review-v1/manifest-v1.json",
  "research/ci117-mm-test-caller-closure-v2-independent-review-v1/review-report-v1.json",
  "research/ci117-mm-test-caller-closure-v2/manifest-v1.json",
  "research/ci117-mm-test-transport-independent-review-v1/manifest-v1.json",
  "research/ci117-mm-test-transport-independent-review-v1/review-v1.json",
  "research/ci117-mm-test-transport-repair-v2/manifest-v2.json",
  "research/ci117-public-scan-inventory-transition-proposal-v1/manifest-v1.json",
  "research/ci117-public-scan-root-independent-review-v1/manifest-v1.json",
  "research/ci117-public-scan-root-independent-review-v1/review-v1.json",
  "research/ci117-r7-proof-closure-rebind-independent-review-v1/manifest-v1.json",
  "research/ci117-r7-proof-closure-rebind-independent-review-v1/review-v1.json",
  "research/ci117-r7-shared-codeproof-rebind-root-acceptance-v1/acceptance-v1.json",
  "research/ci117-r7-shared-codeproof-rebind-root-acceptance-v1/manifest-v1.json",
  "research/ci117-shard0-bootstrap-closure-independent-peer-v1/independent-review-v1.json",
  "research/ci117-shard0-bootstrap-closure-independent-peer-v1/manifest-v1.json",
  "research/ci117-shard0-bootstrap-closure-independent-peer-v1/verification-v1.json",
  "research/ci117-shard0-bootstrap-closure-v2/manifest-v2.json",
  "research/ci117-shard0-bootstrap-closure-v3-ua-successor-v1/install-map-v1.json",
  "research/ci117-shard0-bootstrap-closure-v3-ua-successor-v1/manifest-v1.json",
  "research/ci117-systemic-epoch-transport-repair-v3/manifest-v3-final.json",
  "research/ci117-systemic-epoch-transport-root-independent-review-v3/manifest-v3.json",
  "research/ci117-systemic-epoch-transport-root-independent-review-v3/review-v3.json",
  "research/ci117-ua26-cli-epoch-transport-independent-review-v2/manifest-v2.json",
  "research/ci117-ua26-cli-epoch-transport-independent-review-v2/review-v2.json",
  "research/ci117-ua26-cli-epoch-transport-proposal-v2/manifest-v2.json",
  "research/ci118-r8-source-repairs-v1/frozen-component-proposals-v1.json",
  "research/class-mapping-ci-sharding-v1/code-pins-v1.json",
  "research/class-mapping-ci-sharding-v1/code-pins-v2.json",
  "research/class-mapping-ci-sharding-v1/code-pins-v3.json.gz",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/evidence/combined-b-peer-v1/independent-review-v1.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/evidence/combined-b-peer-v1/manifest-v1.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/navigation-before-v1.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/public-scan-before-v2.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/continuation-alias-audit.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/continuation-candidates.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/coverage-gaps.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/dmg175-current-successors-mm-v1.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/mammoth-derived-valuation.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/monetary-unit-provenance-audit.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/pass8-citation-target-crop-history.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/phb-monetary-input-successor.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/refresh-gaps-handoff.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/source-completeness-coverage.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-r5-original-test-sources/source-report-consistency-audit.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-v5-r5-original-test-sources/dmg175-native-structured-controls-current.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-v5-r5-original-test-sources/jo-stick-source-mapping.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-v5-r5-original-test-sources/ua-source-handoff-transition.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r7-v5-r5-original-test-sources/ua26-note-marker-current-mm-v1.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/citation-navigation-producer-call-scan-v2.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/continuation-candidates.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/dmg175-current-monetary-source-questions-mm-v2.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/jo-stick-source-mapping.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/mm-current-cli-replay-v1.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/mm-replay-child-process-v2.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/native-monetary-source-questions-kernel-mm-v2.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/pass8-ua-source-history.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/source-frame-systemic-native-s1-current-v1.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r8-r7-predecessor-sources/ua-source-handoff-transition.test.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r9-r8-predecessor-sources/coverage-gaps.test.mjs.gz",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r9-r8-predecessor-sources/refresh-gaps-handoff-mm-v2.mjs.gz",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r9-v2-r8-predecessor-sources/pass8-citation-target-crop-history.test.mjs.gz",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/r9-v2-r8-predecessor-sources/ua-support-twin-history-v1.mjs.gz",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/systemic-before-v1.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v7.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v8.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v9.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/r9-callback-override-v1.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/r9-expanded-override-v2.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-addon-continuation-alias-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-addon-source-report-consistency-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-transport-continuation-candidates.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-transport-coverage-gaps.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-transport-dmg175-current-successors-mm-v1.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-transport-mammoth-derived-valuation.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-transport-monetary-unit-provenance-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-transport-phb-monetary-input-successor.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-transport-refresh-gaps-handoff.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-mm-transport-source-completeness-coverage.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-nav-v2-current-source-classification.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-public-scan-current-source-inventory-input.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v4-systemic-mm-historical-import-transport.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v5-dmg175-structured-controls.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v5-ua26-cli-transport.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v6-b-bootstrap-crop.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v6-b-bootstrap-jo.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v6-b-bootstrap-ua-handoff.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-addon-continuation-alias-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-addon-source-report-consistency-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-transport-continuation-candidates.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-transport-coverage-gaps.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-transport-dmg175-current-successors-mm-v1.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-transport-mammoth-derived-valuation.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-transport-monetary-unit-provenance-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-transport-phb-monetary-input-successor.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-transport-refresh-gaps-handoff.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-mm-transport-source-completeness-coverage.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v7-rebind-systemic-mm-historical-import-transport.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-addon-continuation-alias-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-addon-source-report-consistency-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-transport-continuation-candidates.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-transport-coverage-gaps.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-transport-dmg175-current-successors-mm-v1.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-transport-mammoth-derived-valuation.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-transport-monetary-unit-provenance-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-transport-phb-monetary-input-successor.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-transport-refresh-gaps-handoff.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-mm-transport-source-completeness-coverage.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r7v8-root-rebind-systemic-mm-historical-import-transport.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-bootstrap-v3-jo-stick-source-mapping.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-bootstrap-v3-ua-source-handoff-transition.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-addon-continuation-alias-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-addon-source-report-consistency-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-continuation-candidates.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-coverage-gaps.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-dmg175-current-successors-mm-v1.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-mammoth-derived-valuation.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-monetary-unit-provenance-audit.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-pass8-citation-target-crop-history.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-phb-monetary-input-successor.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-refresh-gaps-handoff.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-mm-transport-source-completeness-coverage.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-nav-v2-current-source-classification.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-r8-original-pass8-ua-source-history.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r8-root-combined-systemic-mm-historical-import-transport.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r9-independent-callback-override-v1.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/receipts/r9-independent-expanded-override-v2.json",
  "research/class-mapping-history-v1/continuation-baseline-v1/mm-test-role-continuation-baseline-v1.json",
  "research/class-mapping-history-v1/continuation-baseline-v1/requested-input-closure-v1.json",
  "research/class-mapping-history-v1/dmg175-historical-tests/alias/alias-h-v1.test.mjs",
  "research/class-mapping-history-v1/mm-current-alias-cli-input-manifest-v1.json",
  "research/class-mapping-history-v1/mm-replay-child-process-v2.mjs",
  "research/class-mapping-history-v1/mm-replay-fs-continuation-baseline-v1.mjs",
  "research/class-mapping-history-v1/mm-replay-fs-dmg175-history-approval-v1.mjs",
  "research/class-mapping-history-v1/mm-replay-fs-v2.mjs",
  "research/class-mapping-history-v1/mm-replay-fs-v3.mjs",
  "research/class-mapping-history-v1/mm-replay-fs-v4.mjs",
  "research/class-mapping-history-v1/mm-replay-fs-v5.mjs",
  "research/class-mapping-history-v1/mm-replay-io-contract-v3.mjs",
  "research/class-mapping-history-v1/mm-test-dmg175-history-approval-v1.json",
  "research/class-mapping-history-v1/mm-test-dmg175-history-approval-v1.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-continuation-baseline-v1.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-v1.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-v2.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-v3.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-v4.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-v5.mjs",
  "research/class-mapping-history-v1/mm-test-role-supplement-v1.json",
  "research/class-mapping-history-v1/mm-test-role-supplement-v2.json",
  "research/class-mapping-history-v1/mm-test-role-supplement-v3.json",
  "research/class-mapping-history-v1/mm-test-role-supplement-v4.json",
  "research/class-mapping-history-v1/mm-test-role-supplement-v5.json",
  "research/class-mapping-history-v1/replay-kernels/native-monetary-source-questions-kernel-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/batch6-dmg175-source-history-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/pass8-character-reference-history-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/pass8-character-reference-history-mm-v3.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/pass8-citation-target-crop-history-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/pass8-citation-target-crop-history-mm-v3.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/pass8-phb-source-history-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/pass8-phb-source-history-mm-v3.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/pass8-xp-continuation-history-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/pass8-xp-continuation-history-mm-v3.mjs",
  "research/class-mapping-history-v1/replay-test-helpers/ua-source-dmg74-matrix-batch-mm-v3.mjs",
  "research/class-mapping-history-v1/replay-tools/continuation-alias-audit-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/continuation-candidates-validate-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/coverage-gaps-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/dmg175-current-jo-source-gap-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/dmg175-current-monetary-source-questions-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/dmg175-current-successors-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/mm-current-cli-replay-v1.mjs",
  "research/class-mapping-history-v1/replay-tools/monetary-current-source-questions-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/monetary-row-identity-audit-mm-v5.mjs",
  "research/class-mapping-history-v1/replay-tools/monetary-unit-provenance-audit-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/refresh-gaps-handoff-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/source-completeness-coverage-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/source-report-consistency-audit-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/ua26-note-marker-audit-mm-s1-v1.mjs",
  "research/class-mapping-history-v1/ua-support-twin-history-v1.mjs",
  "research/class-mapping-history-v1/ua-support-twin-snapshot-v1.json",
  "research/class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs",
  "research/dmg175-native-structured-controls-r7-independent-peer-v1/independent-review-v1.json",
  "research/dmg175-native-structured-controls-r7-independent-peer-v1/manifest-v1.json",
  "research/dmg175-native-structured-controls-r7-repair-proposal-v1/manifest-v1.json",
  "research/dmg175-party-magic-current-s1-location-recheck-v1.json",
  "research/party-magic-current-s1-root-location-recheck-v3/current-location-recheck-v3.json",
  "research/party-magic-current-s1-root-location-recheck-v3/manifest-v3.json",
  "research/r7-test-source-transition-guard-v8-root-accepted-rebind-v1/manifest-v8.json",
  "tests/citation-navigation-inventory.test.mjs",
  "tests/class-mapping-ci-tracked-checkout-v1.test.mjs",
  "tests/class-mapping-monetary-v5-immutability-current-v1.test.mjs",
  "tests/class-mapping-test-sharding-contract-v1.test.mjs",
  "tests/class-mapping-test-source-transition-guard-v1.test.mjs",
  "tests/continuation-alias-audit.test.mjs",
  "tests/continuation-alias-native-s1-current-v1.test.mjs",
  "tests/continuation-candidates.test.mjs",
  "tests/coverage-gaps.test.mjs",
  "tests/dmg175-current-successors-mm-v1.test.mjs",
  "tests/dmg175-native-structured-controls-current.test.mjs",
  "tests/fixtures/citation-navigation-app-r5-a29-v1.js.gz",
  "tests/fixtures/dmg175-native-structured-controls-pre-location-target-status-v1.json.gz",
  "tests/helpers/source-frame-systemic-mm-inputs-v1.mjs",
  "tests/helpers/ua-source-batch6-xp-source-history.mjs",
  "tests/helpers/ua-source-handoff-mm-epoch-reader-v1.mjs",
  "tests/helpers/ua26-historical-cli-v1.mjs",
  "tests/jo-stick-source-mapping.test.mjs",
  "tests/mammoth-derived-valuation.test.mjs",
  "tests/monetary-unit-provenance-audit.test.mjs",
  "tests/pass8-citation-target-crop-history.test.mjs",
  "tests/pass8-ua-source-history.test.mjs",
  "tests/phb-monetary-input-successor.test.mjs",
  "tests/public-scan-contract.test.mjs",
  "tests/refresh-gaps-handoff.test.mjs",
  "tests/source-completeness-coverage.test.mjs",
  "tests/source-frame-systemic-consumer.test.mjs",
  "tests/source-frame-systemic-native-s1-current-v1.test.mjs",
  "tests/source-report-consistency-audit.test.mjs",
  "tests/ua-source-handoff-transition.test.mjs",
  "tests/ua26-historical-cli-contract-v1.test.mjs",
  "tests/ua26-note-marker-current-mm-v1.test.mjs",
  "tests/ua26-note-marker-native-s1-current-v1.test.mjs",
  "tools/citation-navigation-coverage.mjs",
  "tools/citation-navigation-producer-call-scan-v2.mjs",
  "tools/class-mapping-ci-tracked-checkout-v1.mjs",
  "tools/class-mapping-test-sharding-core-v1.mjs",
  "tools/class-mapping-test-sharding-core-v2.mjs",
  "tools/class-mapping-test-sharding-core-v3.mjs",
  "tools/class-mapping-test-source-lineage-v2.mjs",
  "tools/class-mapping-test-source-override-v1.mjs",
  "tools/class-mapping-test-source-override-v2.mjs",
  "tools/reduce-class-mapping-test-shards-v1.mjs",
  "tools/refresh-gaps-handoff-next-native-v2-qcc-date-v1.mjs",
  "tools/run-class-mapping-tests-shard-v1.mjs",
  "tools/run-historical-mm-replay-receipt-v1.mjs",
  "tools/verify-class-mapping-current-reports-v2.mjs"
];
 assert.deepEqual(receipt.codePins.map(x=>x.path).sort(),paths.sort());
 const {historicalReaderInstallationPins}=await import('../research/class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs');
 const old=Object.entries(historicalReaderInstallationPins.codePins).map(([path,pin])=>({path,...pin}));
 assert.equal(old.length,175);assert.deepEqual(receipt.allCodePins.slice(0,old.length),old);assert.deepEqual(receipt.allCodePins.slice(old.length),receipt.codePins);
 assert.equal(receipt.historicalPrefixCount,175);assert.equal(receipt.expandedCodePinCount,receipt.allCodePins.length);assert.equal(new Set(receipt.allCodePins.map(pin=>pin.path)).size,receipt.allCodePins.length);
 assert(paths.includes('research/class-mapping-history-v1/dmg175-historical-tests/alias/alias-h-v1.test.mjs'));assert(paths.includes('tests/helpers/ua-source-batch6-xp-source-history.mjs'));
 assert.equal(receipt.parentCommit,'873581f3fd9474263b5e377390eaf17ff0acb39c');
 assert.equal(receipt.parentTree,'f132143f4defed8dd39fa01af78483632e25f64f');
 assert.equal(receipt.parentRegistry.path,'research/class-mapping-ci-sharding-v1/code-pins-v3.json.gz');
 assert.equal(receipt.parentRegistry.sha256,'4362149193a9da778d02e8904a6370c9583105461079cf2a286de2bad8b6cca4');
 assert.equal(receipt.parentRegistry.sizeBytes,33896);
 assert.equal(receipt.parentRegistry.encoding,'gzip');
 assert.equal(receipt.parentRegistry.decodedSha256,'0aa1bd69563260219064cf461122c79b2935566f44510be669d825a249415f79');
 assert.equal(receipt.parentRegistry.decodedSizeBytes,123448);
 const parentBytes=readFileSync(resolve(root,receipt.parentRegistry.path));
 assert.equal(createHash('sha256').update(parentBytes).digest('hex'),receipt.parentRegistry.sha256);
 assert.equal(parentBytes.length,receipt.parentRegistry.sizeBytes);
 const parentDecoded=gunzipSync(parentBytes,{maxOutputLength:receipt.parentRegistry.decodedSizeBytes});
 assert.equal(createHash('sha256').update(parentDecoded).digest('hex'),receipt.parentRegistry.decodedSha256);
 assert.equal(parentDecoded.length,receipt.parentRegistry.decodedSizeBytes);
 const frozenR9Registry=JSON.parse(parentDecoded.toString('utf8'));
 assert.equal(frozenR9Registry.parentCommit,'a15b84838439562ea380c444caa15205d3c8e680');
 assert.equal(frozenR9Registry.parentRegistry.path,'research/class-mapping-ci-sharding-v1/code-pins-v2.json');
 assert.equal(frozenR9Registry.parentRegistry.sha256,'bbe795bc1be7d4d542e32f8d4d99d5f4903a21c04efeaa00fc5c74639f87e6bd');
 assert.equal(frozenR9Registry.parentRegistry.sizeBytes,139300);
 const frozenR8Bytes=readFileSync(resolve(root,frozenR9Registry.parentRegistry.path));
 assert.equal(createHash('sha256').update(frozenR8Bytes).digest('hex'),frozenR9Registry.parentRegistry.sha256);
 assert.equal(frozenR8Bytes.length,frozenR9Registry.parentRegistry.sizeBytes);
 const frozenR8Registry=JSON.parse(frozenR8Bytes.toString('utf8'));
 assert.equal(frozenR8Registry.parentRegistry.path,'research/class-mapping-ci-sharding-v1/code-pins-v1.json');
 assert.equal(frozenR8Registry.parentRegistry.sha256,'9ac4e10cda071a24ba991e984863da8a2ff00f7976fd0fca3f87f2c234c0edd3');
 assert.equal(frozenR8Registry.parentRegistry.sizeBytes,113497);
 const frozenV1Bytes=readFileSync(resolve(root,frozenR8Registry.parentRegistry.path));
 assert.equal(createHash('sha256').update(frozenV1Bytes).digest('hex'),frozenR8Registry.parentRegistry.sha256);
 assert.equal(frozenV1Bytes.length,frozenR8Registry.parentRegistry.sizeBytes);
 assert.equal(receipt.workflow.path,'.github/workflows/pages.yml');assert.equal(receipt.baseline.path,R5_ROSTER_PATH);assert.equal(receipt.historicalRegistry.path,'research/class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs');
 for(const pin of [...receipt.allCodePins,receipt.workflow,receipt.baseline,receipt.historicalRegistry]){const isHistoricalWorkflow=pin===receipt.workflow;const path=isHistoricalWorkflow?PREDECESSOR_WORKFLOW_PATH:pin.path;const physicalBytes=readFileSync(resolve(root,path));if(isHistoricalWorkflow){assert.equal(physicalBytes.length,PREDECESSOR_WORKFLOW_GZIP_SIZE_BYTES,pin.path);assert.equal(sha(physicalBytes),PREDECESSOR_WORKFLOW_GZIP_SHA256,pin.path);}const bytes=isHistoricalWorkflow?gunzipSync(physicalBytes,{maxOutputLength:pin.sizeBytes}):physicalBytes;assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256,pin.path);assert.equal(bytes.length,pin.sizeBytes,pin.path);}
});


test('workflow contract successor uses the fresh zero-argument Source2 identity API',()=>{
 const proof=assertClassMappingCurrentSourceIdentity();assert.equal(proof.summary.stage,'source2-body-native');assert.equal(proof.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');assert.equal(proof.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
});


import {assertClassMappingCurrentSourceIdentity as assertSource2IdentityFromV8WorkflowContract} from '../tools/class-mapping-current-source-gate-v2.mjs';

test('v8 Source2 identity gate regression: workflow-contract successor',()=>{
 const identity=assertSource2IdentityFromV8WorkflowContract();
 assert.equal(identity.summary.stage,'source2-body-native');
 assert.equal(identity.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(identity.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
});

// V10 live lane: these reads always inspect the actual workflow and runner.
test('v10 physical whole workflow is exactly the preserved v9 workflow with three reviewed suite entrypoint replacements',()=>{
 const live=readPhysicalWorkflowInput(resolve(root,'.github/workflows/pages.yml'));
 assert.equal(live.length,29180);assert.equal(sha(live),'91d774a553d93e808cb9d7cb3bc42ad559afea8134104f0c70c1a4e41f652896');
 const frozen=readFileSync(resolve(root,'.github/workflows/pages.yml'));
 const swaps=[['tools/run-class-mapping-tests-source2-shard-v1.mjs','tools/run-class-mapping-tests-source2-shard-v2.mjs'],['tools/run-historical-mm-replay-source2-receipt-v1.mjs','tools/run-historical-mm-replay-source2-receipt-v2.mjs'],['tools/reduce-class-mapping-test-source2-shards-v1.mjs','tools/reduce-class-mapping-test-source2-shards-v2.mjs']];
 let expected=frozen.toString('utf8');
 for(const [before,after] of swaps){assert.equal(expected.split(before).length-1,1);assert.equal(expected.split(after).length-1,0);expected=expected.replace(before,after);}
 assert.equal(live.toString('utf8'),expected,'all other workflow bytes, guards, failure barriers, labels and artifact routes remain exact');
 const mapBytes=readPhysicalWorkflowInput(resolve(root,WORKFLOW_MAP_PATH));assert.equal(sha(mapBytes),WORKFLOW_MAP_SHA256);
 const map=JSON.parse(mapBytes),baseline=JSON.parse(readPhysicalWorkflowInput(resolve(root,R5_ROSTER_PATH)));
 const currentMap={...map,proposedWorkflow:{...map.proposedWorkflow,sha256:sha(live),sizeBytes:live.length}};
 assert.equal(validateReviewedWorkflowMapping(currentMap,baseline.preservedNonMonolithicBuildRunBlocks,live.toString('utf8')),true);
 const replaced=live.toString('utf8').replace(map.rows[1].after.utf8,map.rows[2].after.utf8);assert.notEqual(replaced,live.toString('utf8'));
 assert.throws(()=>validateReviewedWorkflowMapping({...currentMap,proposedWorkflow:{...currentMap.proposedWorkflow,sha256:sha(Buffer.from(replaced))}},baseline.preservedNonMonolithicBuildRunBlocks,replaced),/missing\/duplicate exact approved role/);
});

test('v10 live workflow uses the actual v3 runner, derives physical entrypoint provenance, and keeps fresh Source2 admission',async()=>{
 const workflow=readPhysicalWorkflowInput(resolve(root,'.github/workflows/pages.yml'),'utf8');
 const entrypointPath='tools/run-class-mapping-tests-source2-shard-v2.mjs';assert(workflow.includes(entrypointPath));
 assert(workflow.includes('tools/run-historical-mm-replay-source2-receipt-v2.mjs --receipt artifacts/test-shards/source2-mm.json'));assert(workflow.includes('tools/reduce-class-mapping-test-source2-shards-v2.mjs'));
 const entrypoint=readPhysicalWorkflowInput(resolve(root,entrypointPath),'utf8'),core=readPhysicalWorkflowInput(resolve(root,'tools/class-mapping-source2-test-runner-core-v3.mjs'),'utf8');
 assert.match(entrypoint,/import \{runSource2Tests\} from '\.\/class-mapping-source2-test-runner-core-v3\.mjs';/);
 assert.match(entrypoint,/runSource2Tests\(\{mode:'shard',argv:process\.argv\.slice\(2\)\}\)/);assert.doesNotMatch(entrypoint,/entrypointPath:/);
 const body=core.slice(core.indexOf('export async function runSource2Tests'));
 const provenance=body.indexOf('physicalProcessEntrypoint(mode)'),args=body.indexOf('parseSource2RunnerArgs(argv,mode)'),gate=body.indexOf('await verifyFullCurrentTarget()'),roster=body.indexOf('readSource2TestRoster(root,targetBefore.reportReceipt,targetBefore.outputJoinProof)'),selection=body.indexOf('deriveSource2Shards(roster)');
 assert(provenance>=0&&provenance<args&&args<gate&&gate<roster&&roster<selection);
 assert.match(core,/actual===expectedAbsolute/);assert.match(core,/stat\.isFile\(\)&&!stat\.isSymbolicLink\(\)&&realpathSync\(actual\)===actual/);
 assert.match(core,/GITHUB_RUN_ID:run\.runId,\s*GITHUB_RUN_ATTEMPT:run\.runAttempt,\s*GITHUB_SHA:run\.workflowSha/);
 let delegated=null;const absoluteEntrypoint=resolve(root,entrypointPath),executable=entrypoint.split('\n').filter(line=>!line.startsWith('import ')).join('\n').replace('fileURLToPath(import.meta.url)',JSON.stringify(absoluteEntrypoint));
 runInNewContext(executable,{resolve,process:{argv:['/runtime/node/bin/node',absoluteEntrypoint,'--python','/runtime/python/bin/python3','--shard-index','1','--shard-count','4','--receipt','artifacts/test-shards/source2-shard-1.json'],stderr:{write:()=>{}},exitCode:0},runSource2Tests:args=>{delegated=args;return Promise.resolve();}});
 await Promise.resolve();assert.equal(JSON.stringify(delegated),JSON.stringify({mode:'shard',argv:['--python','/runtime/python/bin/python3','--shard-index','1','--shard-count','4','--receipt','artifacts/test-shards/source2-shard-1.json']}));
 const identity=assertClassMappingCurrentSourceIdentity();assert.equal(identity.summary.stage,'source2-body-native');assert.equal(identity.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');assert.equal(identity.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
});

// V10 date live lane: inspect actual current bytes and preserve the complete24-role map.
test('v10 date workflow changes only the unmapped closure and mapped role21 all-verifier commands',()=>{
 const live=readActualV10WorkflowInput(resolve(root,'.github/workflows/pages.yml')),historical=readPhysicalWorkflowInput(resolve(root,'.github/workflows/pages.yml'));
 assert.equal(live.length,29180);assert.equal(sha(live),'d1c7c8d1710684cdc9343a0548832460f6c2f3db3f8bd111151553b392621430');assert.equal(sha(historical),'91d774a553d93e808cb9d7cb3bc42ad559afea8134104f0c70c1a4e41f652896');
 const before='node tools/verify-class-mapping-current-reports-v3.mjs --kind all',after='node tools/verify-class-mapping-current-reports-v4.mjs --kind all',old=historical.toString('utf8'),current=live.toString('utf8');assert.equal(old.split(before).length-1,2);assert.equal(old.split(after).length-1,0);assert.equal(current,old.replaceAll(before,after));assert.equal(current.split(after).length-1,2);assert.equal(current.split(before).length-1,0);
 const mapBytes=readActualV10WorkflowInput(resolve(root,WORKFLOW_MAP_PATH));assert.equal(sha(mapBytes),WORKFLOW_MAP_SHA256);const map=JSON.parse(mapBytes),baseline=JSON.parse(readActualV10WorkflowInput(resolve(root,R5_ROSTER_PATH))),changed=[];
 const rows=map.rows.map(row=>{const utf8=row.after.utf8.replaceAll(before,after);if(utf8!==row.after.utf8)changed.push(row.ordinal);return {...row,after:{...row.after,utf8,sha256:sha(Buffer.from(utf8)),sizeBytes:Buffer.byteLength(utf8)},afterNodeTools:row.afterNodeTools.map(name=>row.ordinal===21?name.replace('verify-class-mapping-current-reports-v3.mjs','verify-class-mapping-current-reports-v4.mjs'):name)};});
 assert.deepEqual(changed,[21]);assert.deepEqual(rows[1],map.rows[1],'mapped assembler role1 remains exact');assert.equal(current.split(rows[1].after.utf8).length-1,1);assert.equal(validateReviewedWorkflowMapping({...map,rows,proposedWorkflow:{...map.proposedWorkflow,sha256:sha(live),sizeBytes:live.length}},baseline.preservedNonMonolithicBuildRunBlocks,current),true);
 const title='      - name: Verify committed Source2 report closure\n',start=current.indexOf(title),end=current.indexOf('\n      - ',start+title.length);assert(start>=0&&end>start);const closure=current.slice(start,end+1);assert.equal(sha(Buffer.from(closure)),'dba15636a020a8815143bd763990a1b322b4c9e11d48317a4f149bfa5ad51a67');assert.equal(Buffer.byteLength(closure),939);assert(closure.includes(after));assert(closure.includes('exit "$report_status"'));assert(closure.includes('if: always()'));
 for(const kind of ['systemic','unit','continuation','ua26','consistency'])assert.equal(current.split('node tools/verify-class-mapping-current-reports-v3.mjs --kind '+kind+' ').length-1,1);
 const swapped=current.replace(rows[21].after.utf8,rows[22].after.utf8);assert.throws(()=>validateReviewedWorkflowMapping({...map,rows,proposedWorkflow:{...map.proposedWorkflow,sha256:sha(Buffer.from(swapped)),sizeBytes:Buffer.byteLength(swapped)}},baseline.preservedNonMonolithicBuildRunBlocks,swapped),/missing\/duplicate exact approved role/);
});

test('v10 date current verifier uses the reviewed QCC-date handoff producer and preserved receipt admission',()=>{
 const verifier=readActualV10WorkflowInput(resolve(root,'tools/verify-class-mapping-current-reports-v4.mjs')),adapter=readActualV10WorkflowInput(resolve(root,'tools/refresh-gaps-handoff-next-native-v3-qcc-date-v1.mjs'));assert.equal(verifier.length,8865);assert.equal(sha(verifier),'5075262020bb7c33d1f43833fb1f1610e4785454ee3166dc5075adc285b205b2');assert.equal(adapter.length,7571);assert.equal(sha(adapter),'bfd2d24436fa13862377d454539335e4faf7961713a7d9f669592c6e68367134');
 const text=verifier.toString('utf8');assert.equal(text.split("handoff:()=>import('./refresh-gaps-handoff-next-native-v3-qcc-date-v1.mjs')").length-1,1);assert(!text.includes("handoff:()=>import('./refresh-gaps-handoff-next-native-v3.mjs')"));const gate=text.indexOf('const verified=await verifyCommittedClassMappingReportReceipt()'),builders=text.indexOf('const builders={');assert(gate>=0&&gate<builders);assert(text.includes("unit:()=>import('./monetary-unit-provenance-audit-next-native-v3.mjs')"));assert(text.includes("consistency:()=>import('./source-report-consistency-audit-next-native-v3.mjs')"));
 const transition=JSON.parse(readActualV10WorkflowInput(resolve(root,'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/v10-whole-workflow-transition-v2.json')));assert.deepEqual(transition.changedMappedOrdinals,[21]);assert.equal(transition.unmappedReportClosureStep.after.sha256,'dba15636a020a8815143bd763990a1b322b4c9e11d48317a4f149bfa5ad51a67');assert.equal(transition.preservedOrderedRoleCount,24);assert.equal(transition.targetPath,'tests/class-mapping-test-sharding-contract-source2-v5.test.mjs');const self=readActualV10WorkflowInput(resolve(root,transition.targetPath));assert.equal(sha(self),transition.targetSha256);assert.equal(self.length,transition.targetSizeBytes);
});
