// Proposed target: tools/class-mapping-test-sharding-core-v1.mjs
// Pure exact-inventory, partition, and receipt-validation functions.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync, readdirSync} from 'node:fs';
import {relative, resolve, sep} from 'node:path';

export const SHARD_COUNT = 4;
export const R5_ROSTER_PATH = 'research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json';
export const R5_ROSTER_SHA256 = 'e5f8917bb9f878fa7ae1e5406584988936fc623e173a9d2a0a2613aaf67b0142';
export const BASELINE_PATH = 'research/class-mapping-history-v1/original-top-level-test-entries-v1.json';
export const BASELINE_SHA256 = '33e7e87992f529f0c90a39b3a0d7103c49da4127f8d8b03ca663832d648d040e';
export const DEDICATED_MM_PATH = 'tests/mm-treasure-current-m1-cohort-v2.test.mjs';
export const MM_CAPSULE_SHA256 = '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003';
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
  for(const prior of r5.entries){
    const current=entries.find(row=>row.path===prior.path);
    fail(current&&current.sha256===prior.sha256&&current.sizeBytes===prior.sizeBytes,`R5 test source remains exact: ${prior.path}`);
  }
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
