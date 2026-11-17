// Finite Source2 current-test roster and deterministic four-way partition.
// This module is deliberately separate from the current-source gate: callers
// must admit Source2 first, then load this roster, then select any shard.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {relative, resolve, sep} from 'node:path';

export const SOURCE2_MIGRATION_PATH = 'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v2.json';
export const SOURCE2_MIGRATION_SHA256 = 'f2bc18a1b157fa559f4da11ce4f6155452893cc67a2ba9d920ae965ea87e8b9a';
export const SOURCE2_WORKFLOW_TRANSITION_PATH = 'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/reviewed-24-workflow-block-transition-v1.json';
export const SOURCE2_WORKFLOW_TRANSITION_SHA256 = '4703cbd75b933029844d10077d08de78a8009818fde9c2696c4771ae22bc3f3a';
export const SOURCE2_WORKFLOW_TRANSITION_SIZE_BYTES = 46126;
export const SOURCE2_PREDECESSOR_WORKFLOW_PATH = 'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/predecessor-pages-6502.yml';
export const SOURCE2_PREDECESSOR_WORKFLOW_SHA256 = 'fa7dcf6701e5622a71161880ea1006ea0104e428c9d63fae1b5276b3494023df';
export const SOURCE2_PREDECESSOR_WORKFLOW_SIZE_BYTES = 26701;
export const SOURCE2_FROZEN_OLD_GUARD_PATH = 'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/frozen-current-workflow-guard-callback-v1.mjs';
export const SOURCE2_FROZEN_OLD_GUARD_SHA256 = 'a47450ed5cf802834070461b337ec4e5f098f28a690cdb1386e28f78ad41778f';
export const SOURCE2_FROZEN_OLD_GUARD_SIZE_BYTES = 2003;
export const SOURCE2_WORKFLOW_DETECTOR_REPLAY_PATH = 'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/workflow-detector-replay-v1.json';
export const SOURCE2_WORKFLOW_DETECTOR_REPLAY_SHA256 = 'dfe249934bb54345b90dc8795cbeba7587f7cdd127371df93689fb210d76f71f';
export const SOURCE2_WORKFLOW_DETECTOR_REPLAY_SIZE_BYTES = 2014;
export const SOURCE2_SHARD_COUNT = 4;
export const SOURCE2_DYNAMIC_ONLY_PATHS = Object.freeze([
  'tests/class-mapping-current-s1-report-behavior.test.mjs',
  'tests/class-mapping-native-source-gate-v1.test.mjs',
  'tests/continuation-alias-audit.test.mjs',
  'tests/current-continuation-snapshot.test.mjs',
  'tests/current-s1-import-boundary-v2.test.mjs',
  'tests/hirelings-source-current-cohort.test.mjs',
  'tests/ua26-note-marker-native-s1-current-v1.test.mjs'
]);
export const SOURCE2_PARENT_COMMIT = '6502b19620e092ced9f3e233f2dc3d5ffc8bd3ec';
export const SOURCE2_PARENT_TREE = '2d64093489afd63223ccc94c07446d03fa80f72e';
export const SOURCE2_BODY_COMMIT = '400f6e9d123d8a654b9b9af48133a2533506e73d';
export const SOURCE2_BODY_TREE = '664c02504efcece25669d2f9c3fdb26437cd5b09';
export const SOURCE2_INPUT_MAP_COUNTS = Object.freeze({sourceBody:3063,qualificationMetadata:4,protectedHistorical:29,installedCode:7});
export const SOURCE2_SOURCE_BODY_MAP_SHA256 = '1e2196258513b05029d966431bc9827a5259e0e122eec9a3fa4aed90ed2b62f9';
export const SOURCE2_DEDICATED_MM_PATH = 'tests/mm-treasure-current-m1-cohort-v2.test.mjs';
export const SOURCE2_DEDICATED_MM_SHA256 = '59c0d0acc64917c01de8337e1386fead6b44bb1c86e0c7d73ac252260d0a9509';
export const SOURCE2_DEDICATED_MM_SIZE_BYTES = 8428;
export const SOURCE2_HISTORICAL_MM_MANIFEST_SHA256 = '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003';
export const SOURCE2_HISTORICAL_MM_COMMIT = 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2';

function check(condition, message) {
  if (!condition) throw new Error(`Source2 test roster: ${message}`);
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const validSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const validSize = value => Number.isSafeInteger(value) && value >= 0;
export function validateSource2InputMapReceipt(identity) {
  check(identity && typeof identity === 'object', 'Source2 input-map receipt object');
  check(identity.summary?.stage === 'source2-body-native' && identity.summary.sourceCommit === SOURCE2_BODY_COMMIT && identity.summary.sourceTree === SOURCE2_BODY_TREE, 'exact Source2 epoch in input-map receipt');
  const expectedNames=Object.keys(SOURCE2_INPUT_MAP_COUNTS).sort();
  check(identity.inputMapSha256 && identity.inputMapCounts && typeof identity.inputMapSha256 === 'object' && typeof identity.inputMapCounts === 'object', 'all input-map hashes and counts');
  check(JSON.stringify(Object.keys(identity.inputMapSha256).sort())===JSON.stringify(expectedNames), 'exact four full input-map hash names');
  check(JSON.stringify(Object.keys(identity.inputMapCounts).sort())===JSON.stringify(expectedNames), 'exact four full input-map count names');
  for(const name of expectedNames){
    check(identity.inputMapCounts[name]===SOURCE2_INPUT_MAP_COUNTS[name], `complete ${name} input map cardinality`);
    check(validSha(identity.inputMapSha256[name]), `canonical ${name} input map SHA256`);
  }
  check(identity.inputMapSha256.sourceBody===SOURCE2_SOURCE_BODY_MAP_SHA256, 'canonical complete 3,063-path sourceBody map SHA256');
  return true;
}
function safePath(root, path) {
  check(typeof path === 'string' && path.startsWith('tests/'), `test path under tests/: ${path}`);
  check(!path.startsWith('/') && path.split('/').every(part => part && part !== '.' && part !== '..'), `safe relative test path: ${path}`);
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  check(rel !== '..' && !rel.startsWith(`..${sep}`), `test path inside repository: ${path}`);
  const stat = lstatSync(absolute);
  check(stat.isFile() && !stat.isSymbolicLink() && realpathSync(absolute) === absolute, `regular non-symlink test file: ${path}`);
  return readFileSync(absolute);
}
function safeArtifact(root, path) {
  check([SOURCE2_MIGRATION_PATH,SOURCE2_WORKFLOW_TRANSITION_PATH,SOURCE2_PREDECESSOR_WORKFLOW_PATH,SOURCE2_FROZEN_OLD_GUARD_PATH,SOURCE2_WORKFLOW_DETECTOR_REPLAY_PATH].includes(path), 'fixed migration/review artifact path');
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  check(rel === path, 'fixed transition artifact remains in repository');
  const stat = lstatSync(absolute);
  check(stat.isFile() && !stat.isSymbolicLink() && realpathSync(absolute) === absolute, 'regular transition artifact');
  return readFileSync(absolute);
}

export function validateSource2MigrationDocument(document) {
  check(document?.schemaVersion === 1, 'schema version 1');
  check(document.artifactType === 'finite Source2 current test family migration from immutable 6502 predecessor roster', 'fixed migration artifact type');
  check(document.status === 'READY_FOR_SOURCE2_QUALIFICATION', 'migration manifest is finalized');
  check(document.predecessor?.commit === SOURCE2_PARENT_COMMIT && document.predecessor?.tree === SOURCE2_PARENT_TREE, 'exact immutable predecessor commit and tree');
  check(document.predecessor?.testFileCount === 225, 'all 225 predecessor test families');
  check(document.sourceEpoch?.commit === SOURCE2_BODY_COMMIT && document.sourceEpoch?.tree === SOURCE2_BODY_TREE && document.sourceEpoch?.stage === 'source2-body-native', 'exact Source2 body epoch');
  check(JSON.stringify(document.sourceEpoch?.inputMapCardinalities)===JSON.stringify(SOURCE2_INPUT_MAP_COUNTS), 'full Source2 input-map cardinalities');
  check(document.sourceEpoch?.sourceBodyMapSha256===SOURCE2_SOURCE_BODY_MAP_SHA256, 'complete 3,063-path sourceBody map hash');
  check(Array.isArray(document.testFamilies) && document.testFamilies.length === 225, 'exact 225-family migration map');
  check(document.workflowTransition?.path === SOURCE2_WORKFLOW_TRANSITION_PATH && document.workflowTransition.sha256 === SOURCE2_WORKFLOW_TRANSITION_SHA256 && document.workflowTransition.sizeBytes === SOURCE2_WORKFLOW_TRANSITION_SIZE_BYTES, 'exact root-reviewed 24-block transition input pin');
  check(document.workflowTransition?.unchangedBlockCount === 15 && document.workflowTransition?.versionedBlockCount === 9, 'exact 15 unchanged and nine versioned workflow command roles');
  check(document.predecessorWorkflowFixture?.path === SOURCE2_PREDECESSOR_WORKFLOW_PATH && document.predecessorWorkflowFixture.sha256 === SOURCE2_PREDECESSOR_WORKFLOW_SHA256 && document.predecessorWorkflowFixture.sizeBytes === SOURCE2_PREDECESSOR_WORKFLOW_SIZE_BYTES, 'exact frozen 6502 pages.yml registry fixture pin');
  check(document.workflowTransition?.frozenOldGuardCallback?.path===SOURCE2_FROZEN_OLD_GUARD_PATH && document.workflowTransition.frozenOldGuardCallback.sha256===SOURCE2_FROZEN_OLD_GUARD_SHA256 && document.workflowTransition.frozenOldGuardCallback.sizeBytes===SOURCE2_FROZEN_OLD_GUARD_SIZE_BYTES, 'exact frozen predecessor workflow callback pin');
  check(document.workflowTransition?.detectorReplay?.path===SOURCE2_WORKFLOW_DETECTOR_REPLAY_PATH && document.workflowTransition.detectorReplay.sha256===SOURCE2_WORKFLOW_DETECTOR_REPLAY_SHA256 && document.workflowTransition.detectorReplay.sizeBytes===SOURCE2_WORKFLOW_DETECTOR_REPLAY_SIZE_BYTES, 'exact prospective detector replay evidence pin');
  check(Array.isArray(document.currentSuiteSemantics?.source2SupportTests), 'explicit support-test roster');
  check(document.currentSuiteSemantics.source2SupportTestCountExpected === 15 && document.currentSuiteSemantics.source2SupportTests.length === 15, 'all 15 explicit Source2 support tests');
  const source2SemanticFamilies=document.testFamilies.filter(row=>row?.predecessorAssertionProof?.kind==='Source2-semantic-successor-with-frozen-6502-predecessor-history');
  const source2SemanticPaths=source2SemanticFamilies.map(row=>row.successorPath);
  const source2SupportPaths=document.currentSuiteSemantics.source2SupportTests.map(row=>row.path);
  const source2ExplicitTargets=[...source2SemanticPaths,...source2SupportPaths];
  check(source2SemanticPaths.length===6&&source2SupportPaths.length===15&&source2ExplicitTargets.length===21&&new Set(source2ExplicitTargets).size===21&&!source2SemanticPaths.some(path=>source2SupportPaths.includes(path)), 'exact 21 explicit semantic/support targets are unique and disjoint');
  check(JSON.stringify(document.classificationEvidence?.dynamicOrCurrentPinOnlyPaths) === JSON.stringify(SOURCE2_DYNAMIC_ONLY_PATHS), 'exact seven dynamic/pin-only predecessor families');
  check(document.currentSuiteSemantics.pendingTargetsFailBeforeRosterAndShardSelection === true, 'pending targets rejected before roster or shard selection');
  check(JSON.stringify(document.currentSuiteSemantics.fullyAcceptedTargetGatesBeforeRosterSelection) === JSON.stringify(['assertClassMappingCurrentSourceIdentity()','verifyCurrentConsumerMaterializedStageSeal()','verifyCommittedClassMappingReportReceipt()']), 'all three accepted-target gates precede roster selection');
  const families = document.testFamilies;
  const mmRows=families.filter(row=>row?.predecessorPath===SOURCE2_DEDICATED_MM_PATH||row?.successorPath===SOURCE2_DEDICATED_MM_PATH);
  check(mmRows.length===1&&mmRows[0].predecessorPath===SOURCE2_DEDICATED_MM_PATH&&mmRows[0].successorPath===SOURCE2_DEDICATED_MM_PATH&&mmRows[0].migrationKind==='unchanged-current-test-family'&&mmRows[0].familyKind==='unaffected'&&mmRows[0].successorSha256===SOURCE2_DEDICATED_MM_SHA256&&mmRows[0].successorSizeBytes===SOURCE2_DEDICATED_MM_SIZE_BYTES, 'exact unchanged dedicated MM family remains in the 225-family map');
  check(document.historicalMmReplayTarget?.path===SOURCE2_DEDICATED_MM_PATH&&document.historicalMmReplayTarget.sha256===SOURCE2_DEDICATED_MM_SHA256&&document.historicalMmReplayTarget.sizeBytes===SOURCE2_DEDICATED_MM_SIZE_BYTES&&document.historicalMmReplayTarget.lane==='separate-historical-a29-capsule'&&document.historicalMmReplayTarget.manifestSha256===SOURCE2_HISTORICAL_MM_MANIFEST_SHA256&&document.historicalMmReplayTarget.historicalCommit===SOURCE2_HISTORICAL_MM_COMMIT&&document.historicalMmReplayTarget.sourceFamilyCount===1&&document.historicalMmReplayTarget.currentPathIncludedInMainShards===false, 'dedicated MM family has one exact separate historical capsule route');
  const predecessorPaths = new Set();
  const currentPaths = new Set();
  const counts = {static: 0, dynamic: 0, unaffected: 0, workflow: 0, successors: 0, exactPrefix: 0, semantic: 0};
  for (const row of families) {
    check(row && typeof row.predecessorPath === 'string' && !predecessorPaths.has(row.predecessorPath), 'unique predecessor family');
    check(validSha(row.predecessorSha256) && validSize(row.predecessorSizeBytes), `exact predecessor pin ${row?.predecessorPath}`);
    check(typeof row.successorPath === 'string' && !currentPaths.has(row.successorPath), 'unique current family target');
    check(validSha(row.successorSha256) && validSize(row.successorSizeBytes), `exact current family pin ${row?.successorPath}`);
    check(['native1-static-runtime-consumer','native1-dynamic-or-current-pin-consumer','unaffected','current-workflow-contract'].includes(row.familyKind), `closed family class ${row.familyKind}`);
    check(row.executionLane===(row.successorPath===SOURCE2_DEDICATED_MM_PATH?'separate-historical-a29-capsule':'source2-current-four-shards'), `exact execution lane for ${row.successorPath}`);
    if (row.familyKind === 'native1-static-runtime-consumer') counts.static++;
    else if (row.familyKind === 'native1-dynamic-or-current-pin-consumer') counts.dynamic++;
    else if (row.familyKind === 'current-workflow-contract') counts.workflow++;
    else counts.unaffected++;
    if (row.migrationKind === 'versioned-current-source-successor') {
      counts.successors++;
      check(row.successorPath !== row.predecessorPath, 'affected family has a versioned successor path');
      check(row.source2IdentityApi === 'tools/class-mapping-current-source-gate-v2.mjs#assertClassMappingCurrentSourceIdentity()', 'successor binds the fresh zero-argument Source2 identity API');
      if (row.predecessorAssertionProof?.kind === 'exact-predecessor-prefix') counts.exactPrefix++;
      else {
        counts.semantic++;
        check(row.predecessorAssertionProof?.mappingStatus === 'INDEPENDENT_ASSERTION_COVERAGE_REVIEWED', `semantic successor assertion coverage reviewed: ${row.predecessorPath}`);
        if(row.predecessorPath==='tests/class-mapping-test-sharding-contract-v1.test.mjs'){
          const mapped=row.predecessorAssertionProof.semanticAssertionCoverage;
          check(Array.isArray(mapped)&&mapped.length===row.predecessorTestCaseCount&&row.predecessorTestCaseCount===13, 'all 13 workflow predecessor tests have semantic successors');
          const mappedTitles=mapped.map(entry=>entry.predecessorTitle).sort(),oldTitles=[...row.predecessorAssertionProof.oldTestCaseTitles].sort();
          check(JSON.stringify(mappedTitles)===JSON.stringify(oldTitles), 'workflow semantic assertion map covers every frozen predecessor title once');
          check(mapped.every(entry=>Array.isArray(entry.successorTests)&&entry.successorTests.length>0&&Array.isArray(entry.preservedGuards)&&entry.preservedGuards.length>0), 'every workflow predecessor test maps to concrete successor assertions and preserved guards');
        }
      }
    } else {
      check(row.migrationKind === 'unchanged-current-test-family' && row.familyKind === 'unaffected', 'only unaffected families remain in place');
      check(row.successorPath === row.predecessorPath && row.predecessorSha256 === row.successorSha256 && row.predecessorSizeBytes === row.successorSizeBytes, 'unchanged family preserves exact bytes');
    }
    predecessorPaths.add(row.predecessorPath);
    currentPaths.add(row.successorPath);
  }
  check(counts.static === 64 && counts.dynamic === 7 && counts.unaffected === 153 && counts.workflow === 1 && counts.successors === 72 && counts.exactPrefix === 64 && counts.semantic === 8, 'derived 64+7+153+1 workflow census with 64 exact-prefix and eight semantic successors');
  check(document.classificationCounts?.staticNative1RuntimeConsumers === 64 && document.classificationCounts?.dynamicOrCurrentPinConsumers === 7 && document.classificationCounts?.unchangedFamilies === 153 && document.classificationCounts?.workflowContractFamily === 1 && document.classificationCounts?.versionedSuccessors === 72 && document.classificationCounts?.source2CurrentSuccessors === 71 && document.classificationCounts?.semanticSource2Successors === 7 && document.classificationCounts?.exactPrefixSource2Successors === 64 && document.classificationCounts?.semanticWorkflowSuccessors === 1, 'classification receipt matches the derived migration census');
  const supportPaths = new Set();
  for (const support of document.currentSuiteSemantics.source2SupportTests) {
    check(support && typeof support.path === 'string' && !supportPaths.has(support.path), 'unique explicit Source2 support path');
    check(support.executionLane==='source2-current-four-shards', `support test remains in current lane: ${support.path}`);
    check(validSha(support.sha256) && validSize(support.sizeBytes), `final support-test pin ${support?.path}`);
    check(!currentPaths.has(support.path), `support path is distinct from 225 family targets: ${support.path}`);
    supportPaths.add(support.path);
  }
  check(document.currentSuiteSemantics.all225FamiliesRepresentedExactlyOnce === true, 'all predecessor families represented once');
  check(document.semanticReplacementCount === 8 && document.exactPrefixCurrentSuccessorCount === 64, '64 exact-prefix and eight semantic successors');
  check(Array.isArray(document.currentSuiteSemantics.source2SemanticReplacementPaths) && document.currentSuiteSemantics.source2SemanticReplacementPaths.length === 8, 'eight separately mapped semantic successor families');
  const mappedSemantic=document.currentSuiteSemantics.source2SemanticReplacementPaths.map(row=>`${row.predecessor}=>${row.successor}`).sort();
  const actualSemantic=families.filter(row=>row.migrationKind==='versioned-current-source-successor'&&row.predecessorAssertionProof?.kind!=='exact-predecessor-prefix').map(row=>`${row.predecessorPath}=>${row.successorPath}`).sort();
  check(JSON.stringify(mappedSemantic)===JSON.stringify(actualSemantic), 'semantic migration paths exactly match the family ledger');
  check(document.currentSuiteSemantics.expectedCurrentTestFileCount===240&&document.currentSuiteSemantics.expectedLogicalTargetCount===240&&document.currentSuiteSemantics.expectedMainCurrentTestFileCount===239&&document.currentSuiteSemantics.expectedHistoricalMmTargetCount===1&&document.currentSuiteSemantics.mainCurrentFamilyCount===224, '224 main families plus 15 support and one separate historical MM target');
  check(document.currentSuiteSemantics.noWildcardExpansion === true, 'no wildcard selection');
  check(document.currentSuiteSemantics.freshIdentityCheckPerSuccessor === true, 'fresh gate call from every affected successor');
  return {familyCounts: counts, supportTestCount: supportPaths.size, currentTestCount: currentPaths.size + supportPaths.size, mainCurrentTestCount: currentPaths.size + supportPaths.size - 1, historicalMmTargetCount:1};
}

export function readSource2TestRoster(repositoryRoot) {
  const root = realpathSync(repositoryRoot);
  const manifestBytes = safeArtifact(root, SOURCE2_MIGRATION_PATH);
  check(sha256(manifestBytes) === SOURCE2_MIGRATION_SHA256, 'exact reviewed migration manifest bytes');
  const document = JSON.parse(manifestBytes.toString('utf8'));
  const counts = validateSource2MigrationDocument(document);
  const workflowMap = safeArtifact(root, SOURCE2_WORKFLOW_TRANSITION_PATH);
  check(workflowMap.length === SOURCE2_WORKFLOW_TRANSITION_SIZE_BYTES && sha256(workflowMap) === SOURCE2_WORKFLOW_TRANSITION_SHA256, 'exact reviewed workflow transition bytes');
  const workflowFixture = safeArtifact(root, SOURCE2_PREDECESSOR_WORKFLOW_PATH);
  check(workflowFixture.length === SOURCE2_PREDECESSOR_WORKFLOW_SIZE_BYTES && sha256(workflowFixture) === SOURCE2_PREDECESSOR_WORKFLOW_SHA256, 'exact historical workflow registry fixture bytes');
  const frozenGuard = safeArtifact(root,SOURCE2_FROZEN_OLD_GUARD_PATH);check(frozenGuard.length===SOURCE2_FROZEN_OLD_GUARD_SIZE_BYTES&&sha256(frozenGuard)===SOURCE2_FROZEN_OLD_GUARD_SHA256,'exact old workflow guard callback bytes');
  const detectorReplay = safeArtifact(root,SOURCE2_WORKFLOW_DETECTOR_REPLAY_PATH);check(detectorReplay.length===SOURCE2_WORKFLOW_DETECTOR_REPLAY_SIZE_BYTES&&sha256(detectorReplay)===SOURCE2_WORKFLOW_DETECTOR_REPLAY_SHA256,'exact prospective detector replay bytes');
  const entries = [];
  let historicalMmTarget=null;
  for (const row of document.testFamilies) {
    const before = safePath(root, row.predecessorPath);
    check(before.length === row.predecessorSizeBytes && sha256(before) === row.predecessorSha256, `exact immutable predecessor path bytes ${row.predecessorPath}`);
    const current = safePath(root, row.successorPath);
    check(current.length === row.successorSizeBytes && sha256(current) === row.successorSha256, `exact current successor bytes ${row.successorPath}`);
    if (row.predecessorAssertionProof?.kind === 'exact-predecessor-prefix') {
      check(current.subarray(0,before.length).equals(before), `all frozen predecessor assertion bytes retained as an exact prefix: ${row.predecessorPath}`);
      check(row.predecessorAssertionProof.sha256 === sha256(before) && row.predecessorAssertionProof.sizeBytes === before.length, `predecessor assertion proof agrees with source bytes: ${row.predecessorPath}`);
    }
    if (row.predecessorPath === 'tests/citation-navigation.test.mjs') {
      check(row.predecessorAssertionProof?.predecessorTestCount === 14 && row.predecessorAssertionProof?.all14Retained === true, 'all 14 navigation predecessor cases retained');
      check(row.predecessorAssertionProof?.newFooterRegressionTestCount === 5 && row.successorTestCaseCount === 20, 'five navigation footer regressions and one fresh identity admission case');
      for (const title of row.predecessorAssertionProof.retainedPredecessorTestNames) check(current.toString('utf8').includes(title), `navigation predecessor test title retained: ${title}`);
      for (const title of row.predecessorAssertionProof.newFooterRegressionTestNames) check(current.toString('utf8').includes(title), `navigation footer regression title retained: ${title}`);
    }
    const entry={path:row.successorPath,sha256:row.successorSha256,sizeBytes:row.successorSizeBytes,kind:'predecessor-family',predecessorPath:row.predecessorPath,familyKind:row.familyKind};
    if(row.successorPath===SOURCE2_DEDICATED_MM_PATH){check(!historicalMmTarget,'only one dedicated MM family target');historicalMmTarget={...entry,lane:'separate-historical-a29-capsule',historicalCommit:SOURCE2_HISTORICAL_MM_COMMIT,manifestPath:'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json',manifestSha256:SOURCE2_HISTORICAL_MM_MANIFEST_SHA256};}
    else entries.push(entry);
  }
  for (const support of document.currentSuiteSemantics.source2SupportTests) {
    const bytes = safePath(root, support.path);
    check(bytes.length === support.sizeBytes && sha256(bytes) === support.sha256, `exact current support test bytes ${support.path}`);
    entries.push({path: support.path, sha256: support.sha256, sizeBytes: support.sizeBytes, kind: support.kind});
  }
  entries.sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  check(new Set(entries.map(row => row.path)).size === entries.length, 'all main current test paths are distinct');
  check(historicalMmTarget?.path===SOURCE2_DEDICATED_MM_PATH&&!entries.some(row=>row.path===SOURCE2_DEDICATED_MM_PATH),'dedicated MM target omitted from main current suite');
  check(entries.length===counts.mainCurrentTestCount&&counts.currentTestCount===240,'exact 239 main files and 240 logical targets');
  const logicalTargetPaths=[...document.testFamilies.map(row=>row.successorPath),...document.currentSuiteSemantics.source2SupportTests.map(row=>row.path)].sort();
  check(logicalTargetPaths.length===240&&new Set(logicalTargetPaths).size===240,'all225 family targets plus 15 support paths are unique logical targets');
  return Object.freeze({
    repositoryRoot: root,
    sourceRosterSha256: sha256(manifestBytes),
    sourceRosterBytes: manifestBytes.length,
    migrationPath: SOURCE2_MIGRATION_PATH,
    familyCounts: counts.familyCounts,
    topLevelFamilyCount:225,mainCurrentFamilyCount:224,historicalMmFamilyCount:1,logicalTargetCount:counts.currentTestCount,
    supportTestCount:counts.supportTestCount,mainCurrentTestFileCount:counts.mainCurrentTestCount,historicalMmTarget:Object.freeze(historicalMmTarget),logicalTargetPaths:Object.freeze(logicalTargetPaths),
    entries: Object.freeze(entries.map(row => Object.freeze(row))),
    document
  });
}

export function deriveSource2Shards(roster, shardCount = SOURCE2_SHARD_COUNT) {
  check(shardCount === SOURCE2_SHARD_COUNT, 'exactly four shards');
  check(roster && Array.isArray(roster.entries) && roster.entries.length > shardCount, 'complete finite roster');
  const shards = Array.from({length: shardCount}, (_,index) => ({shardIndex:index, entries:[], totalBytes:0}));
  const ordered = [...roster.entries].sort((a,b) => b.sizeBytes-a.sizeBytes || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const entry of ordered) {
    shards.sort((a,b) => a.totalBytes-b.totalBytes || a.shardIndex-b.shardIndex);
    shards[0].entries.push(entry);
    shards[0].totalBytes += entry.sizeBytes;
  }
  for (const shard of shards) shard.entries.sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  shards.sort((a,b) => a.shardIndex-b.shardIndex);
  const all = shards.flatMap(shard => shard.entries.map(row => row.path));
  check(all.length === roster.entries.length && new Set(all).size === all.length, 'four fixed shards are disjoint and complete');
  return shards.map(shard => Object.freeze({...shard, entries:Object.freeze(shard.entries)}));
}

export function admitBeforeShardSelection(assertIdentity, loadRoster, chooseShard) {
  if (typeof assertIdentity !== 'function' || typeof loadRoster !== 'function' || typeof chooseShard !== 'function') throw new Error('Source2 test runner: admission callbacks required');
  const identity = assertIdentity();
  if (identity?.summary?.stage !== 'source2-body-native' || identity.summary.sourceCommit !== SOURCE2_BODY_COMMIT || identity.summary.sourceTree !== SOURCE2_BODY_TREE) throw new Error('Source2 test runner: current identity is not the fixed reviewed Source2 target');
  const roster = loadRoster();
  return {identity, roster, selected: chooseShard(roster)};
}
