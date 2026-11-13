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

test('every old217 source is exact or explicitly peer-reviewed and every current addition is selected once',()=>{
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
 const beforeCommand="node tools/verify-class-mapping-current-reports-v1.mjs --kind all --output artifacts/source-domain-audits/gaps-handoff-check.json",afterCommand="node tools/verify-class-mapping-current-reports-v2.mjs --kind all --output artifacts/source-domain-audits/gaps-handoff-check.json";
 assert.equal(baseline.preservedNonMonolithicBuildRunBlocks.filter(block=>block.includes(beforeCommand)).length,1,'one preserved report command has a reviewed successor');
 for(const block of baseline.preservedNonMonolithicBuildRunBlocks){const expected=block.includes(beforeCommand)?block.replace(beforeCommand,afterCommand):block;assert(workflow.includes(expected),`lost original report block: ${block.split('\n')[0]}`);}
 assert(!workflow.includes(beforeCommand),'the nondeterministic all-report invocation was replaced');
 for(const job of ['class-mapping-test-shards','historical-mm-replay','test-shard-reducer'])assert.match(workflow,new RegExp(`^  ${job}:\\s*$`,'m'));
 assert(workflow.includes('needs: [class-mapping-test-shards, historical-mm-replay, test-shard-reducer]'));assert(workflow.includes('needs: build'));assert(workflow.includes('fail-fast: false'));
 assert(!/^\s*continue-on-error\s*:/m.test(workflow));assert(!/--test-(?:name|skip)-pattern/.test(workflow));assert(!workflow.includes('node tools/run-class-mapping-tests-v1.mjs'));
 for(const key of ['CM_SHARDS_RESULT','CM_MM_RESULT','CM_REDUCER_RESULT'])assert(workflow.includes(key));
 assert(workflow.indexOf('- name: Require complete current test suite')<workflow.indexOf('- name: Capture build metadata'));
 assert.match(workflow,/actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803/);assert.match(workflow,/actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
});
test('the versioned code receipt pins new executable paths and the old registry bytes',async()=>{
 const receipt=JSON.parse(readFileSync(resolve(root,'research/class-mapping-ci-sharding-v1/code-pins-v1.json'),'utf8'));
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
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/fixtures/systemic-before-v1.mjs",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v7.json",
  "research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v8.json",
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
  "research/class-mapping-history-v1/dmg175-historical-tests/alias/alias-h-v1.test.mjs",
  "research/class-mapping-history-v1/mm-current-alias-cli-input-manifest-v1.json",
  "research/class-mapping-history-v1/mm-replay-child-process-v2.mjs",
  "research/class-mapping-history-v1/mm-replay-fs-v2.mjs",
  "research/class-mapping-history-v1/mm-replay-fs-v3.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-v1.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-v2.mjs",
  "research/class-mapping-history-v1/mm-test-postsource-supplement-v3.mjs",
  "research/class-mapping-history-v1/mm-test-role-supplement-v1.json",
  "research/class-mapping-history-v1/mm-test-role-supplement-v2.json",
  "research/class-mapping-history-v1/mm-test-role-supplement-v3.json",
  "research/class-mapping-history-v1/replay-kernels/native-monetary-source-questions-kernel-mm-v2.mjs",
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
  "research/class-mapping-history-v1/replay-tools/monetary-unit-provenance-audit-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/refresh-gaps-handoff-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/source-completeness-coverage-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/source-report-consistency-audit-mm-v2.mjs",
  "research/class-mapping-history-v1/replay-tools/ua26-note-marker-audit-mm-s1-v1.mjs",
  "research/dmg175-native-structured-controls-r7-independent-peer-v1/independent-review-v1.json",
  "research/dmg175-native-structured-controls-r7-independent-peer-v1/manifest-v1.json",
  "research/dmg175-native-structured-controls-r7-repair-proposal-v1/manifest-v1.json",
  "research/dmg175-party-magic-current-s1-location-recheck-v1.json",
  "research/party-magic-current-s1-root-location-recheck-v3/current-location-recheck-v3.json",
  "research/party-magic-current-s1-root-location-recheck-v3/manifest-v3.json",
  "research/r7-test-source-transition-guard-v8-root-accepted-rebind-v1/manifest-v8.json",
  "tests/citation-navigation-inventory.test.mjs",
  "tests/class-mapping-ci-tracked-checkout-v1.test.mjs",
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
  "tests/helpers/ua26-historical-cli-v1.mjs",
  "tests/jo-stick-source-mapping.test.mjs",
  "tests/mammoth-derived-valuation.test.mjs",
  "tests/monetary-unit-provenance-audit.test.mjs",
  "tests/pass8-citation-target-crop-history.test.mjs",
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
 assert.equal(receipt.parentCommit,'d83bd30f3b74da488f78ea3302fa1e67a94c7607');
 assert.equal(receipt.workflow.path,'.github/workflows/pages.yml');assert.equal(receipt.baseline.path,R5_ROSTER_PATH);assert.equal(receipt.historicalRegistry.path,'research/class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs');
 for(const pin of [...receipt.codePins,receipt.workflow,receipt.baseline,receipt.historicalRegistry]){const bytes=readFileSync(resolve(root,pin.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256,pin.path);assert.equal(bytes.length,pin.sizeBytes,pin.path);}
});
