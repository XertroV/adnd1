// Current R8 successor; frozen CoreV1 and V8 remain immutable.
// Pure exact-inventory, partition, and receipt-validation functions.
import {createHash} from 'node:crypto';
import {validateR8TransitionLineage, validateGlobalCodeProof} from './class-mapping-test-source-lineage-v2.mjs';
import {lstatSync, readFileSync, realpathSync, readdirSync} from 'node:fs';
import {relative, resolve, sep} from 'node:path';

export const SHARD_COUNT = 4;
export const R5_ROSTER_PATH = 'research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json';
export const R5_ROSTER_SHA256 = 'e5f8917bb9f878fa7ae1e5406584988936fc623e173a9d2a0a2613aaf67b0142';
export const BASELINE_PATH = 'research/class-mapping-history-v1/original-top-level-test-entries-v1.json';
export const BASELINE_SHA256 = '33e7e87992f529f0c90a39b3a0d7103c49da4127f8d8b03ca663832d648d040e';
export const DEDICATED_MM_PATH = 'tests/mm-treasure-current-m1-cohort-v2.test.mjs';
export const MM_CAPSULE_SHA256 = '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003';
export const TEST_SOURCE_MIGRATIONS_PATH = 'research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v9.json';
export const TEST_SOURCE_MIGRATIONS_SHA256 = 'a0622ae8c713abaa6c31f17563c02f01e4f94313f2ec9e6feb23c3731d431e10';
export const TEST_SOURCE_MIGRATIONS_SIZE_BYTES = 353215;
export const R7_PARENT_MIGRATIONS_PATH = 'research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v8.json';
export const R7_PARENT_MIGRATIONS_SHA256 = '12d98850dbd48f3a376ae74aa797cde7753b137c90591628b36fc285736238c5';
export const R7_PARENT_MIGRATIONS_SIZE_BYTES = 192895;
const TEST_SOURCE_EVIDENCE_PREFIX = 'research/class-mapping-ci-sharding-v1/test-source-transition-v1/';
const HISTORICAL_CODE_PROOF_PREFIX = 'research/class-mapping-history-v1/';
export function parseTapSummary(text) {
  return Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key=>{
    const matches=[...text.matchAll(new RegExp(`^# ${key} (\\d+)$`,'gm'))];
    return [key,matches.length?Number(matches.at(-1)[1]):null];
  }));
}
const fail = (ok, message) => { if (!ok) throw new Error(`Sharding contract: ${message}`); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort(compare).map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
function safeFile(root, path) {
  fail(typeof path === 'string' && path.startsWith('tests/') || path === BASELINE_PATH || path === R5_ROSTER_PATH, 'safe source path');
  fail(!path.startsWith('/') && !path.split('/').some(part => !part || part === '.' || part === '..'), 'relative path without traversal');
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  fail(rel !== '..' && !rel.startsWith(`..${sep}`), 'path remains inside checkout');
  const stat = lstatSync(absolute);
  fail(stat.isFile() && !stat.isSymbolicLink() && realpathSync(absolute) === absolute, `regular source file ${path}`);
  return readFileSync(absolute);
}

function checkedRegularFile(root, path, allowed) {
  fail(typeof path === 'string' && allowed(path), `allowed pinned proof path ${path}`);
  fail(!path.startsWith('/') && !path.split('/').some(part => !part || part === '.' || part === '..'), 'proof path is relative without traversal');
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  fail(rel !== '..' && !rel.startsWith(`..${sep}`), 'proof path remains inside checkout');
  const stat = lstatSync(absolute);
  fail(stat.isFile() && !stat.isSymbolicLink() && realpathSync(absolute) === absolute, `regular proof file ${path}`);
  return readFileSync(absolute);
}
const safeTransitionEvidence = (root, path) => checkedRegularFile(root, path, value => value.startsWith(TEST_SOURCE_EVIDENCE_PREFIX));
const safeCodeProof = (root, path) => checkedRegularFile(root, path, value => value.startsWith('tests/') || value.startsWith('tools/') || value.startsWith(HISTORICAL_CODE_PROOF_PREFIX));
export function parsePinnedTestSourceMigrationDocument(bytes) {
  fail(Buffer.isBuffer(bytes), 'migration document is exact raw bytes');
  fail(bytes.length === TEST_SOURCE_MIGRATIONS_SIZE_BYTES && sha(bytes) === TEST_SOURCE_MIGRATIONS_SHA256, 'exact fixed R8 test-source migration document');
  const document = JSON.parse(bytes.toString('utf8'));
  fail(document.artifactType === 'finite R8 test-source transitions for immutable R5 roster', 'current pinned R8 ledger schema');
  fail(document.ledgerPath === TEST_SOURCE_MIGRATIONS_PATH, 'fixed current ledger path');
  const parent = document.ancestry?.parent;
  fail(parent?.path === R7_PARENT_MIGRATIONS_PATH && parent.sha256 === R7_PARENT_MIGRATIONS_SHA256 && parent.sizeBytes === R7_PARENT_MIGRATIONS_SIZE_BYTES, 'exact immutable R7 parent pin');
  fail(parent.path !== document.ledgerPath, 'migration parent cycle rejected');
  return document;
}
const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isSize = value => Number.isSafeInteger(value) && value >= 0;
function checkPin(actual, expected, label) {
  fail(actual && expected && actual.sha256 === expected.sha256 && actual.sizeBytes === expected.sizeBytes, `${label}: exact SHA-256 and byte size`);
}
function validateAcceptedPeer({transition, acceptedPeer, readEvidence}) {
  fail(acceptedPeer && typeof acceptedPeer === 'object', `accepted peer receipt is required for ${transition.path}`);
  fail(typeof acceptedPeer.reviewerId === 'string' && acceptedPeer.reviewerId.length > 0, `reviewer identity for ${transition.path}`);
  fail(typeof acceptedPeer.receiptPath === 'string' && isSha256(acceptedPeer.receiptSha256) && isSize(acceptedPeer.receiptSizeBytes), `peer receipt pins for ${transition.path}`);
  fail(acceptedPeer.reviewerId !== transition.authorId, `reviewer is independent of author for ${transition.path}`);
  const bytes = readEvidence(acceptedPeer.receiptPath);
  fail(bytes.length === acceptedPeer.receiptSizeBytes && sha(bytes) === acceptedPeer.receiptSha256, `peer receipt bytes for ${transition.path}`);
  const receipt = JSON.parse(bytes.toString('utf8'));
  fail(receipt?.schemaVersion === 1 && receipt.status === 'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITION', `accepted peer status for ${transition.path}`);
  fail(receipt.reviewer?.id === acceptedPeer.reviewerId && receipt.reviewer?.role === 'independent', `independent reviewer receipt for ${transition.path}`);
  fail(receipt.authorId === transition.authorId && receipt.authorId !== receipt.reviewer.id, `peer is not the source author for ${transition.path}`);
  fail(same(receipt.subject, {path:transition.path,before:transition.before,after:transition.after}), `peer reviewed exact before/after source for ${transition.path}`);
  fail(same(receipt.beforeFixture, {path:transition.before.fixturePath,sha256:transition.before.fixtureSha256,sizeBytes:transition.before.fixtureSizeBytes}), `peer reviewed exact before fixture for ${transition.path}`);
  fail(same(receipt.proposal, transition.proposal), `peer reviewed exact proposal proof for ${transition.path}`);
  fail(same(receipt.proofScope, transition.proofScope), `peer reviewed exact bounded scope for ${transition.path}`);
  fail(same(receipt.codeProof, transition.codeProof), `peer reviewed exact code proof for ${transition.path}`);
}
/**
 * Pure transition admission logic. Production collectRoster supplies bytes read
 * from fixed, path-checked files. This exported function is used by focused
 * synthetic contract tests; its synthetic accepted examples are not peer
 * approval or CI qualification.
 */
export function validateR5TestSourceTransitions({r5Entries, currentEntries, transitionDocument, readFixture, readEvidence, readCode}) {
  fail(Array.isArray(r5Entries) && Array.isArray(currentEntries), 'R5/current source arrays');
  fail(typeof readFixture === 'function' && typeof readEvidence === 'function' && typeof readCode === 'function', 'closed byte readers are supplied');
  const r5ByPath = new Map();
  for (const row of r5Entries) {
    fail(row && typeof row.path === 'string' && !r5ByPath.has(row.path), 'unique R5 source path');
    fail(isSha256(row.sha256) && isSize(row.sizeBytes), `complete R5 source pin ${row?.path}`);
    r5ByPath.set(row.path, row);
  }
  const currentByPath = new Map();
  for (const row of currentEntries) {
    fail(row && typeof row.path === 'string' && !currentByPath.has(row.path), 'unique current source path');
    fail(isSha256(row.sha256) && isSize(row.sizeBytes), `complete current source pin ${row?.path}`);
    currentByPath.set(row.path, row);
  }
  const doc = transitionDocument;
  fail(doc?.schemaVersion === 1 && ['finite R7 test-source transitions for immutable R5 roster', 'finite R8 test-source transitions for immutable R5 roster'].includes(doc.artifactType), 'migration document schema');
  fail(doc.baseline?.path === R5_ROSTER_PATH && doc.baseline.sha256 === R5_ROSTER_SHA256 && doc.baseline.entryCount === r5Entries.length && doc.baseline.sizeBytes === 53707 && doc.baseline.original200NamesRetained === true, 'migration document names the exact immutable R5 baseline');
  fail(Array.isArray(doc.transitions) && doc.transitionCount === doc.transitions.length, 'migration transition count');
  const migrationByPath = new Map();
  const ids = new Set();
  for (const transition of doc.transitions) {
    fail(transition && typeof transition.id === 'string' && !ids.has(transition.id), 'unique migration identifier');
    ids.add(transition.id);
    fail(typeof transition.path === 'string' && r5ByPath.has(transition.path) && !migrationByPath.has(transition.path), `unique transition for an original R5 path ${transition?.path}`);
    const prior = r5ByPath.get(transition.path);
    checkPin(prior, transition.before, `R5 predecessor ${transition.path}`);
    fail(typeof transition.before.fixturePath === 'string' && isSha256(transition.before.fixtureSha256) && isSize(transition.before.fixtureSizeBytes), `before fixture pin ${transition.path}`);
    const fixture = readFixture(transition.before.fixturePath);
    fail(fixture.length === transition.before.fixtureSizeBytes && sha(fixture) === transition.before.fixtureSha256, `exact before fixture ${transition.path}`);
    fail(fixture.length === prior.sizeBytes && sha(fixture) === prior.sha256, `before fixture equals the frozen R5 bytes ${transition.path}`);
    fail(isSha256(transition.after?.sha256) && isSize(transition.after?.sizeBytes), `exact proposed after pin ${transition.path}`);
    fail(typeof transition.authorId === 'string' && transition.authorId.length > 0, `migration author ${transition.path}`);
    fail(transition.proposal && typeof transition.proposal.id === 'string' && isSha256(transition.proposal.manifestSha256), `versioned source proposal pin ${transition.path}`);
    fail(transition.proofScope && typeof transition.proofScope.kind === 'string', `bounded source proof scope ${transition.path}`);
    fail(Array.isArray(transition.codeProof) && transition.codeProof.length > 0, `nonempty code proof ${transition.path}`);
    for (const proof of transition.codeProof) {
      fail(proof && typeof proof.path === 'string' && isSha256(proof.sha256) && isSize(proof.sizeBytes), `code proof pin ${transition.path}`);
    }
    fail(transition.candidateStatus !== 'ACCEPTED' || transition.acceptedPeer, `accepted status has peer receipt ${transition.path}`);
    migrationByPath.set(transition.path, transition);
  }
  const active = new Set();
  for (const prior of r5Entries) {
    const current = currentByPath.get(prior.path);
    fail(current, `R5 test source remains present: ${prior.path}`);
    if (current.sha256 === prior.sha256 && current.sizeBytes === prior.sizeBytes) continue;
    const transition = migrationByPath.get(prior.path);
    fail(transition, `unlisted R5 source change rejected: ${prior.path}`);
    checkPin(current, transition.after, `physical changed source ${prior.path}`);
    fail(transition.candidateStatus === 'ACCEPTED', `source transition is not accepted: ${prior.path}`);
    fail(doc.status === 'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITIONS' && doc.accepted === true, 'accepted migration document status');
    validateAcceptedPeer({transition, acceptedPeer:transition.acceptedPeer, readEvidence});
    for (const proof of transition.codeProof) {
      const bytes = readCode(proof.path);
      fail(bytes.length === proof.sizeBytes && sha(bytes) === proof.sha256, `scoped code proof bytes ${proof.path}`);
    }
    active.add(prior.path);
  }
  for (const transition of doc.transitions) {
    const current = currentByPath.get(transition.path);
    fail(current, `migration path remains present: ${transition.path}`);
    if (current.sha256 === transition.after.sha256 && current.sizeBytes === transition.after.sizeBytes) {
      fail(active.has(transition.path), `active migration admitted exactly once: ${transition.path}`);
    } else {
      fail(current.sha256 === transition.before.sha256 && current.sizeBytes === transition.before.sizeBytes, `source matches only pinned before or after bytes: ${transition.path}`);
      fail(!active.has(transition.path), `inactive transition is not counted: ${transition.path}`);
    }
  }
  return {acceptedTransitions:[...active].sort(compare),pendingTransitions:doc.transitions.filter(row=>!active.has(row.path)).map(row=>row.path).sort(compare)};
}
export function rosterDigest(entries) {
  const rows = [...entries].sort((a, b) => compare(a.path, b.path));
  return sha(Buffer.from(rows.map(row => `${row.path}\t${row.sha256}\n`).join(''), 'utf8'));
}
export function collectRoster(repositoryRoot) {
  const root = realpathSync(repositoryRoot);
  const baselineBytes = safeFile(root, BASELINE_PATH);
  fail(sha(baselineBytes) === BASELINE_SHA256, 'frozen original-200 manifest hash');
  const baseline = JSON.parse(baselineBytes.toString('utf8'));
  fail(Array.isArray(baseline.entries) && baseline.entries.length === 200, 'original baseline has exactly 200 entries');
  const baselineSet = new Set(baseline.entries);
  fail(baselineSet.size === 200, 'original baseline names are unique');
  const testsDir = resolve(root, 'tests');
  const testDirStat = lstatSync(testsDir);
  fail(testDirStat.isDirectory() && !testDirStat.isSymbolicLink() && realpathSync(testsDir) === testsDir, 'physical tests directory');
  const dirEntries = readdirSync(testsDir, {withFileTypes:true});
  const names = dirEntries.filter(entry => entry.name.endsWith('.test.mjs')).map(entry => entry.name).sort(compare);
  fail(names.length > 0, 'at least one top-level test file');
  for (const name of names) {
    const entry = dirEntries.find(candidate => candidate.name === name);
    fail(entry?.isFile() && !entry.isSymbolicLink(), `top-level regular test file ${name}`);
  }
  const paths = names.map(name => `tests/${name}`);
  for (const path of baseline.entries) fail(paths.includes(path), `original baseline file present: ${path}`);
  fail(paths.filter(path => path === DEDICATED_MM_PATH).length === 1, 'exactly one dedicated historical MM test');
  fail(baselineSet.has(DEDICATED_MM_PATH), 'dedicated MM test remains part of original 200 names');
  const mainPaths = paths.filter(path => path !== DEDICATED_MM_PATH);
  const mainOrdinal = new Map(mainPaths.map((path, index) => [path, index]));
  const entries = paths.map(path => {
    const bytes = safeFile(root, path);
    const main = path !== DEDICATED_MM_PATH;
    const ordinal = main ? mainOrdinal.get(path) : null;
    return {
      path,
      sha256: sha(bytes),
      sizeBytes: bytes.length,
      original200Entry: baselineSet.has(path),
      route: main ? 'main-node-test' : 'separate-historical-mm-replay',
      mainOrdinal: ordinal,
      shardIndex: main ? ordinal % SHARD_COUNT : null
    };
  });
  fail(entries.filter(row => row.original200Entry).length === 200, 'all original-200 entries retained');
  const r5Bytes=safeFile(root,R5_ROSTER_PATH);
  fail(sha(r5Bytes)===R5_ROSTER_SHA256,'exact immutable R5 test roster');
  const r5=JSON.parse(r5Bytes.toString('utf8'));
  fail(r5.schemaVersion===1&&Array.isArray(r5.entries)&&r5.entries.length===217,'217 R5 source entries');
  fail(new Set(r5.entries.map(row=>row.path)).size===217,'unique R5 source entries');
  const transitionBytes=safeTransitionEvidence(root,TEST_SOURCE_MIGRATIONS_PATH);
  const transitionDocument=parsePinnedTestSourceMigrationDocument(transitionBytes);
  const parentBytes=safeTransitionEvidence(root,R7_PARENT_MIGRATIONS_PATH);
  fail(parentBytes.length === R7_PARENT_MIGRATIONS_SIZE_BYTES && sha(parentBytes) === R7_PARENT_MIGRATIONS_SHA256, 'exact immutable R7 parent bytes');
  validateR5TestSourceTransitions({
    r5Entries:r5.entries,
    currentEntries:entries,
    transitionDocument,
    readFixture:path=>safeTransitionEvidence(root,path),
    readEvidence:path=>safeTransitionEvidence(root,path),
    readCode:path=>safeCodeProof(root,path)
  });
  validateR8TransitionLineage({document:transitionDocument,parentDocument:JSON.parse(parentBytes.toString('utf8')),readFixture:path=>safeTransitionEvidence(root,path),readEvidence:path=>safeTransitionEvidence(root,path),readCode:path=>safeCodeProof(root,path)});
  validateGlobalCodeProof({transitions:transitionDocument.transitions,readCode:path=>safeCodeProof(root,path)});
  const rosterSha256 = rosterDigest(entries);
  return {
    schemaVersion: 1,
    gitCommit: null,
    topLevelFileCount: entries.length,
    mainFileCount: mainPaths.length,
    original200ManifestSha256: BASELINE_SHA256,
    dedicatedMmFile: DEDICATED_MM_PATH,
    shardCount: SHARD_COUNT,
    rosterSha256,
    entries
  };
}
export function deriveShards(roster) {
  fail(roster?.shardCount === SHARD_COUNT, 'fixed shard count');
  const shards = Array.from({length:SHARD_COUNT}, (_, shardIndex) => ({shardIndex, shardCount:SHARD_COUNT, entries:[]}));
  for (const row of roster.entries) {
    if (row.route !== 'main-node-test') continue;
    const shard = row.mainOrdinal % SHARD_COUNT;
    fail(row.shardIndex === shard, `roster shard ordinal ${row.path}`);
    shards[shard].entries.push(row);
  }
  return shards;
}
function same(a,b) { return canonical(a) === canonical(b); }
function assertCommon(receipt, roster, runId, runAttempt, gitCommit, label) {
  fail(receipt && receipt.schemaVersion === 1, `${label}: receipt schema`);
  fail(receipt.runId === runId && receipt.runAttempt === runAttempt && receipt.gitCommit === gitCommit, `${label}: current run/attempt/commit`);
  fail(receipt.gitCommitAfter === gitCommit, `${label}: checkout commit unchanged after execution`);
  fail(receipt.sourceRosterSha256 === roster.rosterSha256, `${label}: dynamic roster digest`);
  fail(receipt.sourceRosterSha256After === roster.rosterSha256, `${label}: test roster unchanged after execution`);
  fail(receipt.topLevelFileCount === roster.topLevelFileCount && receipt.mainFileCount === roster.mainFileCount, `${label}: dynamic file counts`);
  fail(receipt.shardCount === SHARD_COUNT, `${label}: shard count`);
  fail(same(receipt.rosterEntries, roster.entries), `${label}: exact current roster entries`);
}
function assertIdentity(before, after, label) {
  fail(before && after && before.inputHashes && after.inputHashes, `${label}: complete source identity maps`);
  fail(same(before.inputHashes, after.inputHashes), `${label}: before/after source input map equality`);
  fail(same(before.summary, after.summary), `${label}: before/after source identity summary equality`);
}
export function validateReceiptSet({repositoryRoot, shardReceipts, mmReceipt, runId, runAttempt, gitCommit, matrixResult, mmJobResult, currentIdentity}) {
  const roster = collectRoster(repositoryRoot);
  const shards = deriveShards(roster);
  fail(/^[a-f0-9]{40}$/.test(gitCommit ?? ''), 'physical checkout commit is a full SHA');
  fail(/^\d+$/.test(runId ?? '') && /^\d+$/.test(runAttempt ?? ''), 'workflow run and attempt are explicit');
  fail(currentIdentity?.inputHashes && /^[a-f0-9]{40}$/.test(currentIdentity?.summary?.sourceCommit ?? ''), 'actual reducer source identity is required');
  fail(matrixResult === 'success' && mmJobResult === 'success', 'workflow matrix and MM job results must both be success');
  fail(Array.isArray(shardReceipts) && shardReceipts.length === SHARD_COUNT, 'exact four shard receipts');
  const seen = new Set();
  const identities = [];
  const allSelected = [];
  for (const receipt of shardReceipts) {
    const i = receipt?.shardIndex;
    fail(Number.isInteger(i) && i >= 0 && i < SHARD_COUNT && !seen.has(i), 'one receipt for each unique shard index');
    seen.add(i);
    const label = `shard ${i}`;
    assertCommon(receipt, roster, runId, runAttempt, gitCommit, label);
    fail(receipt.status === 'success' && receipt.nodeExitCode === 0 && receipt.processError === null, `${label}: successful Node process`);
    fail(receipt.distTrackedTreeCleanAfter === true, `${label}: tracked dist remains clean`);
    fail(receipt.tapSummary && Number.isInteger(receipt.tapSummary.tests) && receipt.tapSummary.tests > 0, `${label}: TAP summary present`);
    fail(Number.isInteger(receipt.tapSummary.fail) && receipt.tapSummary.fail === 0, `${label}: no failed tests`);
    fail(Number.isInteger(receipt.tapSummary.cancelled) && receipt.tapSummary.cancelled === 0, `${label}: no cancelled tests`);
    // Existing conditional skip/todo outcomes are recorded; no test-name or skip filters are accepted by the runner.
    fail(Number.isInteger(receipt.tapSummary.skipped) && Number.isInteger(receipt.tapSummary.todo), `${label}: skip/todo counts recorded`);
    fail(Number.isInteger(receipt.tapSummary.pass) && receipt.tapSummary.pass >= 0 && receipt.tapSummary.skipped >= 0 && receipt.tapSummary.todo >= 0, `${label}: nonnegative TAP outcomes`);
    fail(receipt.tapSummary.pass + receipt.tapSummary.skipped + receipt.tapSummary.todo === receipt.tapSummary.tests, `${label}: complete TAP outcome accounting`);
    const expected = shards[i].entries;
    const expectedPaths = expected.map(row => row.path);
    fail(same(receipt.selectedFiles, expectedPaths), `${label}: exact dynamic path assignment`);
    const expectedHashes = Object.fromEntries(expected.map(row => [row.path, row.sha256]));
    fail(same(receipt.selectedFileHashes, expectedHashes), `${label}: exact selected file hashes`);
    fail(receipt.expectedFileCount === expected.length, `${label}: exact derived file count`);
    fail(Array.isArray(receipt.actualExecutedFiles) && same(receipt.actualExecutedFiles, expectedPaths), `${label}: exact executed file list`);
    assertIdentity(receipt.sourceIdentityBefore, receipt.sourceIdentityAfter, label);
    identities.push(receipt.sourceIdentityAfter);
    allSelected.push(...receipt.selectedFiles);
  }
  fail(seen.size === SHARD_COUNT, 'all shard indexes received');
  fail(new Set(allSelected).size === allSelected.length, 'pairwise disjoint shard file selections');
  const mainPaths = roster.entries.filter(row => row.route === 'main-node-test').map(row => row.path);
  fail(same([...allSelected].sort(compare), mainPaths), 'exact union covers every current main test file');
  assertCommon(mmReceipt, roster, runId, runAttempt, gitCommit, 'MM replay');
  fail(mmReceipt.status === 'success', 'MM replay receipt success');
  fail(mmReceipt.distTrackedTreeCleanAfter === true, 'MM replay tracked dist remains clean');
  const mm = mmReceipt.historicalMmReplay;
  fail(mm && mm.capsuleManifestSha256 === MM_CAPSULE_SHA256 && mm.capsuleFileCount === 25 && mm.sourceInputCount === 21, 'exact historical MM capsule scope');
  fail(mm.expectedAssertions === 19 && mm.actualAssertions === 19 && mm.passed === 19 && mm.failed === 0 && mm.skipped === 0, 'all exact 19 MM assertions passed');
  fail(mm.activeInputMapsUnchanged === true, 'MM replay active input maps unchanged');
  fail(mm.currentS1SourceCommit === (mmReceipt.sourceIdentityAfter?.summary?.sourceCommit), 'MM receipt source commit matches source identity');
  assertIdentity(mmReceipt.sourceIdentityBefore, mmReceipt.sourceIdentityAfter, 'MM replay');
  identities.push(mmReceipt.sourceIdentityAfter);
  identities.push(currentIdentity);
  fail(identities.length >= SHARD_COUNT + 1, 'all source identity maps present');
  for (const identity of identities.slice(1)) {
    fail(same(identity.inputHashes, identities[0].inputHashes) && same(identity.summary, identities[0].summary), 'source identity is identical across all shards, replay, and reducer');
  }
  // The checkout is a descendant of the qualified logical source epoch. Their
  // SHAs are different roles; the CLI verifies real Git ancestry separately.
  const logicalSourceCommit = currentIdentity.summary.sourceCommit;
  const sums = shardReceipts.reduce((result, receipt) => {
    for (const key of ['tests','pass','fail','cancelled','skipped','todo']) result[key] += receipt.tapSummary[key];
    return result;
  }, {tests:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0});
  return {
    schemaVersion:1,
    status:'success',
    runId,
    runAttempt,
    gitCommit,
    logicalSourceCommit,
    sourceRosterSha256:roster.rosterSha256,
    topLevelFileCount:roster.topLevelFileCount,
    mainFileCount:roster.mainFileCount,
    shardCount:SHARD_COUNT,
    shardCounts:shards.map(shard => shard.entries.length),
    selectedMainFiles:mainPaths.length,
    dedicatedMmFile:DEDICATED_MM_PATH,
    historicalMmAssertions:19,
    mainTestOutcomes:sums,
    sourceIdentityUnchanged:true
  };
}
