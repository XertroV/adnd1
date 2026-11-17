// Source2 semantic successor for the frozen 6502 sharding/workflow contract.
// The old versioned-registry assertion below is copied intact except that its
// historical pages.yml pin is checked against the exact frozen 6502 fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
import {assertClassMappingCurrentSourceIdentity} from '../tools/class-mapping-current-source-gate-v2.mjs';
const root=process.cwd();
const R5_ROSTER_PATH='research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const WORKFLOW_MAP_PATH='research/class-mapping-ci-sharding-v1/source2-test-transition-v1/reviewed-24-workflow-block-transition-v1.json';
const WORKFLOW_MAP_SHA256='4703cbd75b933029844d10077d08de78a8009818fde9c2696c4771ae22bc3f3a';
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
 assert.equal(map.status,'COMMAND_ROLES_REVIEWED_IMPLEMENTATION_AND_FULL_SUITE_PENDING');
 assert.equal(map.requiredBlockCount,24);assert.equal(map.rows.length,24);assert.equal(oldBlocks.length,24);
 const roles=map.rows.map(row=>row.role);assert.deepEqual(roles,EXPECTED_WORKFLOW_ROLES);assert.equal(new Set(roles).size,24);
 if(workflow!==null){assert.equal(sha(Buffer.from(workflow)),map.proposedWorkflow.sha256);for(const row of map.rows)assert.equal(workflow.split(row.after.utf8).length-1,1,`missing/duplicate exact approved role ${row.role}`);}
 let unchanged=0,versioned=0;
 for(let index=0;index<24;index++){
  const row=map.rows[index],before=Buffer.from(row.before.utf8),after=Buffer.from(row.after.utf8);
  assert.equal(row.ordinal,index);assert.equal(row.frozenR5BlockSha256,sha(Buffer.from(oldBlocks[index])));assert.equal(row.before.utf8,oldBlocks[index]);
  assert.equal(row.before.sizeBytes,before.length);assert.equal(row.before.sha256,sha(before));assert.equal(row.after.sizeBytes,after.length);assert.equal(row.after.sha256,sha(after));
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
 const duplicate=structuredClone(map);duplicate.rows[1]={...duplicate.rows[2],ordinal:1};assert.throws(()=>validateReviewedWorkflowMapping(duplicate,baseline.preservedNonMonolithicBuildRunBlocks,candidate),/24|workflow roles|ordinal/);
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
 assert.equal(replay.originalTest.callbackSha256,FROZEN_GUARD_SHA256);assert.equal(replay.beforeWorkflowSha256,PREDECESSOR_WORKFLOW_SHA256);assert.equal(replay.candidateWorkflowSha256,map.proposedWorkflow.sha256);assert.equal(replay.manifestSha256,WORKFLOW_MAP_SHA256);
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

test('current Source2 workflow keeps fixed jobs, barriers, pinned actions, and every shard CLI contract',()=>{
 const workflow=readFileSync(resolve(root,'.github/workflows/pages.yml'),'utf8');
 for(const job of ['build','class-mapping-test-shards','historical-mm-replay','test-shard-reducer','deploy'])assert.match(workflow,new RegExp(`^  ${job}:\\s*$`,'m'));
 assert(workflow.includes('needs: [class-mapping-test-shards, historical-mm-replay, test-shard-reducer]'));assert(workflow.includes('needs: build'));assert(workflow.includes('fail-fast: false'));
 assert(!/^\s*continue-on-error\s*:/m.test(workflow));assert(!/--test-(?:name|skip)-pattern/.test(workflow));assert(!workflow.includes('node tools/run-class-mapping-tests-v1.mjs'));
 assert.match(workflow,/actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803/);assert.match(workflow,/actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
 for(const flag of ['--python','--shard-index','--shard-count','--receipt'])assert(workflow.includes(flag));
 assert(workflow.includes('tools/run-class-mapping-tests-source2-shard-v1.mjs'));assert(workflow.includes('tools/run-historical-mm-replay-source2-receipt-v1.mjs --receipt artifacts/test-shards/source2-mm.json'));assert(workflow.includes('tools/reduce-class-mapping-test-source2-shards-v1.mjs'));
 for(const variable of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_SHA','CM_SOURCE2_SHARDS_JOB_RESULT','CM_SOURCE2_MM_JOB_RESULT'])assert(workflow.includes(variable),`missing receipt env ${variable}`);
 for(const output of ['source2-shard-0.json','source2-shard-1.json','source2-shard-2.json','source2-shard-3.json','source2-mm.json','source2-reducer.json'])assert(workflow.includes(output),`missing artifact ${output}`);
 const completeCurrentSuite=workflow.indexOf('- name: Require complete current test suite'),captureBuildMetadata=workflow.indexOf('- name: Capture build metadata');assert(completeCurrentSuite>=0&&captureBuildMetadata>=0&&completeCurrentSuite<captureBuildMetadata);
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
