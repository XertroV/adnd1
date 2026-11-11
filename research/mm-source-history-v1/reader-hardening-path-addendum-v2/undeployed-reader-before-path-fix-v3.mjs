// Research-only adapter. It never intercepts filesystem APIs and never alters
// the frozen H/Version29 readers or their historical fixtures.
import {readFileSync as nodeReadFileSync} from 'node:fs';
import {execFileSync as nodeExecFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {assertCurrentMmSourceEpoch as assertCurrentMmSourceEpochFixed} from '../../tools/mm-current-source-gate-v1.mjs';

export const bridgeContractPath = 'research/mm-source-history-v1/mm-to-historical-h-v1.json';
export const bridgeContractSha256 = '23afdc77bfbc2eb31eda6304035fab4ea6e08f5d1d94342b964871ae1dc47cce';
export const preservedHReaderContractPath = 'research/hirelings-source-epoch-proposal-v5/closed-version29-reader-actual-hired-v2.json';
export const preservedHReaderContractSha256 = '3a4f78b7c2fb26a3384b4acb705fa645ec6ae7c0547544f28744d624cb7c3b93';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error('Invalid MM-to-H historical source reader: ' + message); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function assertPlainJson(value, label, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail(label + ': non-JSON number');
    return;
  }
  if (typeof value !== 'object' || types.isProxy(value)) fail(label + ': non-JSON value or proxy');
  if (ancestors.has(value)) fail(label + ': cycle');
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)
      || Object.getPrototypeOf(Object.prototype) !== null
      || Object.getPrototypeOf(Array.prototype) !== Object.prototype
      || Object.hasOwn(Object.prototype, 'toJSON') || Object.hasOwn(Array.prototype, 'toJSON')) {
    fail(label + ': non-plain prototype or inherited serializer');
  }
  const keys = Reflect.ownKeys(value);
  if (array) {
    const length = Object.getOwnPropertyDescriptor(value, 'length');
    if (!length || !Object.hasOwn(length, 'value') || length.value !== value.length
        || !length.writable || length.enumerable || length.configurable
        || keys.length !== value.length + 1 || !keys.includes('length')) fail(label + ': sparse array or extra property');
  }
  ancestors.add(value);
  for (const key of keys) {
    if (array && key === 'length') continue;
    const descriptor = typeof key === 'string' ? Object.getOwnPropertyDescriptor(value, key) : null;
    if (typeof key !== 'string' || !descriptor?.enumerable || !descriptor.writable || !descriptor.configurable
        || !Object.hasOwn(descriptor, 'value')) fail(label + ': symbol, hidden property, or accessor');
    if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) fail(label + ': sparse array or extra property');
    assertPlainJson(descriptor.value, label, ancestors);
  }
  ancestors.delete(value);
}

function parseJson(bytes, label) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { fail(label + ': invalid JSON'); }
}

function detachedFrozenJson(value, label) {
  assertPlainJson(value, label);
  const copy = structuredClone(value);
  function freezeTree(node) {
    if (node === null || typeof node !== 'object' || Object.isFrozen(node)) return node;
    for (const key of Object.keys(node)) freezeTree(node[key]);
    return Object.freeze(node);
  }
  return freezeTree(copy);
}

function safeRepoPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe repository path ' + path);
  return path;
}

function fixedLocalPath(path) {
  if (typeof path === 'string') return resolve(path);
  if (types.isProxy(path) || !path || typeof path !== 'object'
      || Object.getPrototypeOf(path) !== URL.prototype || Reflect.ownKeys(path).length !== 0) {
    fail('reader path must be a string or plain file URL');
  }
  return fileURLToPath(path);
}

function copyRawBytes(value, label) {
  if (types.isProxy(value) || !value || typeof value !== 'object') fail(label + ': raw byte input required');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Buffer.prototype && prototype !== Uint8Array.prototype) {
    fail(label + ': raw byte input must be a Buffer or plain Uint8Array');
  }
  // Use typed-array internal-slot accessors and set; do not enumerate Buffer's
  // per-byte own keys (large files exceed Reflect.ownKeys limits) or consult
  // caller properties such as length, iterator, constructor, or toJSON.
  // Extra own decorations on raw byte containers are ignored because only
  // their native view bytes define this input; strict descriptor checks remain
  // unchanged for every parsed JSON value.
  const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
  const byteLengthGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteLength').get;
  let byteLength;
  try {
    byteLength = byteLengthGetter.call(value);
  } catch {
    fail(label + ': detached or invalid typed-array view');
  }
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) fail(label + ': invalid typed-array length');
  const copy = new Uint8Array(byteLength);
  try { Uint8Array.prototype.set.call(copy, value); }
  catch { fail(label + ': typed-array bytes could not be copied'); }
  return Buffer.from(copy.buffer, copy.byteOffset, copy.byteLength);
}

function readEncoding(options) {
  if (options === undefined) return undefined;
  if (typeof options === 'string') return options;
  if (types.isProxy(options) || !options || typeof options !== 'object'
      || Object.getPrototypeOf(options) !== Object.prototype) fail('reader options must be a string or plain options object');
  const keys = Reflect.ownKeys(options);
  if (keys.some(key => key !== 'encoding')) fail('reader options only accept an own data encoding property');
  if (!keys.length) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(options, 'encoding');
  if (!descriptor || typeof descriptor.value !== 'string' || !descriptor.enumerable
      || !descriptor.writable || !descriptor.configurable) fail('reader encoding must be an own enumerable data string');
  return descriptor.value;
}

/**
 * Private constructor for the MM -> exact full-M1 H preimage -> Version29
 * chain. The installed reader has no caller-supplied source, filesystem, Git,
 * or contract dependencies; the fixed v2 current-MM guard is invoked on each
 * public reader/predicate call.
 */
function createCurrentMmVersion29HistoricalReader(repoRoot) {
  if (typeof repoRoot !== 'string' || !repoRoot) fail('fixed repository root is required');
  const readFileSync = nodeReadFileSync;
  const execFileSync = nodeExecFileSync;
  const assertCurrentMmSourceEpoch = assertCurrentMmSourceEpochFixed;
  const bridgeContractBytes = readFileSync(resolve(repoRoot, bridgeContractPath));
  if (hash(bridgeContractBytes) !== bridgeContractSha256) fail('fixed current-MM bridge contract digest');
  const root = resolve(repoRoot);
  const bridge = parseJson(bridgeContractBytes, 'MM-to-H bridge contract');
  assertPlainJson(bridge, 'MM-to-H bridge contract');
  const hContractBytes = readFileSync(resolve(root, preservedHReaderContractPath));
  if (hash(hContractBytes) !== preservedHReaderContractSha256) fail('preserved H-to-Version29 contract bytes');
  const hContract = parseJson(hContractBytes, 'H-to-Version29 contract');
  const hRows = new Map(hContract.files.map(row => [row.path, row]));
  const bridgeRows = new Map(bridge.mappingPolicy.orderedFiles.map(row => [row.path, row]));
  if (bridgeRows.size !== 22 || bridgeRows.size !== bridge.mappingPolicy.orderedFiles.length
      || !same([...bridgeRows.keys()], hContract.files.map(row => row.path))) fail('exact ordered 22-path H/Version29 universe');
  if (hContract.baselineCommit !== bridge.version29.baselineCommit
      || hContract.sourceCommit !== bridge.historicalH.sourceCommit
      || (hContract.sourceTree !== undefined && hContract.sourceTree !== bridge.historicalH.sourceTree)) fail('H and Version29 epoch contract mismatch');
  if (hContract.nativeFixture.path !== bridge.historicalH.fixturePath
      || hContract.nativeFixture.sha256 !== bridge.historicalH.fixtureSha256) fail('exact historical H fixture contract mismatch');
  if (bridge.sourceEpoch.mmSourceCommit !== '0f2d70a135e3ad486152bf00f21387d60a1a97ef'
      || bridge.sourceEpoch.mmSourceTree !== '08010faf457df22cdb0a5ec35d2dcf79e622ade9'
      || bridge.sourceEpoch.currentSnapshotCommit !== 'ac60970626fd5e0421fc4b99c141cc11f53ffff3'
      || bridge.historicalH.sourceTree !== 'e6bc420f70656825a926297b959bc6d98758bfcd'
      || bridge.historicalH.fullM1PreimageCommit !== '5c6a57386af372c7c0d89e342003a7edf68ca0dd'
      || bridge.version29.baselineCommit !== '1f79d909344ebe7d41a432d8673f3eedb491fa3b'
      || bridge.version29.baselineTree !== '8c2f652d6a692c76d188ce83504fcd6191bb935f') fail('fixed source commit sequence');

  const git = (...args) => execFileSync('git', ['-C', root, ...args], {maxBuffer: 128 * 1024 * 1024});
  const blob = (commit, path) => git('show', commit + ':' + safeRepoPath(path));
  const assertBlob = (bytes, expected, label) => {
    if (!Buffer.isBuffer(bytes) || hash(bytes) !== expected.sha256 || bytes.length !== expected.sizeBytes) fail(label + ': raw blob SHA/size mismatch');
  };
  const assertJsonObject = (bytes, expected, label) => {
    const value = parseJson(bytes, label);
    assertPlainJson(value, label);
    if (hash(Buffer.from(JSON.stringify(value))) !== expected.objectSha256) fail(label + ': parsed-object SHA mismatch');
    return value;
  };

  function assertCommitChain() {
    const sourceEpoch = bridge.sourceEpoch, historicalH = bridge.historicalH, version29 = bridge.version29;
    const pairs = [
      [version29.baselineCommit, historicalH.sourceCommit],
      [historicalH.sourceCommit, historicalH.fullM1PreimageCommit],
      [historicalH.fullM1PreimageCommit, sourceEpoch.mmSourceCommit],
      [sourceEpoch.mmSourceCommit, sourceEpoch.currentSnapshotCommit],
      [sourceEpoch.currentSnapshotCommit, 'HEAD'],
    ];
    for (const pair of pairs) git('merge-base', '--is-ancestor', pair[0], pair[1]);
    if (git('rev-parse', sourceEpoch.currentSnapshotCommit + '^{tree}').toString('utf8').trim() !== sourceEpoch.currentSnapshotTree
        || git('rev-parse', sourceEpoch.mmSourceCommit + '^{tree}').toString('utf8').trim() !== sourceEpoch.mmSourceTree
        || git('rev-parse', historicalH.sourceCommit + '^{tree}').toString('utf8').trim() !== historicalH.sourceTree
        || git('rev-parse', historicalH.fullM1PreimageCommit + '^{tree}').toString('utf8').trim() !== historicalH.fullM1PreimageTree
        || git('rev-parse', version29.baselineCommit + '^{tree}').toString('utf8').trim() !== version29.baselineTree) {
      fail('fixed MM snapshot, full-M1 H preimage, or Version29 baseline tree');
    }
  }

  function verifyStrictGuardCode() {
    const rows = bridge.sourceEpoch.strictGuard.codeFiles;
    const expectedPaths = [
      'tools/mm-current-source-gate-v1.mjs',
      'tests/helpers/mm-treasure-current-m1-cohort-v2.mjs',
      'tests/helpers/mm-treasure-current-m1-cohort-factory-v2.mjs',
    ];
    if (!Array.isArray(rows) || rows.length !== expectedPaths.length
        || !same(rows.map(row => row.path), expectedPaths)) fail('strict current-MM guard code manifest');
    for (const row of rows) {
      const bytes = readFileSync(resolve(root, safeRepoPath(row.path)));
      if (hash(bytes) !== row.sha256 || bytes.length !== row.sizeBytes) fail(row.path + ': strict current-MM guard code identity');
    }
  }

  function verifyContractWorktreeBytes() {
    const currentBridgeBytes = readFileSync(resolve(root, bridgeContractPath));
    const currentHContractBytes = readFileSync(resolve(root, preservedHReaderContractPath));
    if (hash(currentBridgeBytes) !== bridgeContractSha256 || currentBridgeBytes.length !== bridgeContractBytes.length
        || hash(currentHContractBytes) !== preservedHReaderContractSha256 || currentHContractBytes.length !== hContractBytes.length) {
      fail('bridge or preserved H-to-Version29 contract changed on disk');
    }
    const fixturePath = safeRepoPath(bridge.historicalH.fixturePath);
    const fixtureBytes = readFileSync(resolve(root, fixturePath));
    const fixtureBlob = blob(bridge.historicalH.fullM1PreimageCommit, fixturePath);
    if (hash(fixtureBytes) !== bridge.historicalH.fixtureSha256
        || hash(fixtureBlob) !== bridge.historicalH.fixtureSha256) fail('historical H source fixture identity');
  }

  function currentGuard() {
    verifyContractWorktreeBytes();
    verifyStrictGuardCode();
    const checked = assertCurrentMmSourceEpoch(root);
    const summary = checked?.summary, inputs = checked?.inputs;
    if (!summary || summary.sourceCommit !== bridge.sourceEpoch.mmSourceCommit
        || summary.sourceTree !== bridge.sourceEpoch.mmSourceTree
        || summary.owners !== 1064 || summary.canonicalBindings !== 5731
        || summary.retainedCanonicalBindings !== 5655 || summary.addedCanonicalBindings !== 76
        || summary.manualBindings !== 1293 || summary.addedManualBindings !== 42 || summary.addedOwners !== 2
        || !same(inputs?.rawInputs, bridge.sourceEpoch.strictGuard.rawInputs)
        || !same(inputs?.additionalInputs, bridge.sourceEpoch.strictGuard.selectedAdditionalInputs)) {
      fail('strict full current-MM v2 source cohort or raw/selected inputs');
    }
    assertCommitChain();
    return checked;
  }

  function verifyAllMappings() {
    for (const row of bridge.mappingPolicy.orderedFiles) {
      const path = safeRepoPath(row.path), hRow = hRows.get(path);
      if (!hRow || row.historicalH.sha256 !== hRow.current.sha256
          || row.historicalH.sizeBytes !== hRow.current.sizeBytes
          || row.version29Baseline.sha256 !== hRow.baseline.sha256
          || row.version29Baseline.sizeBytes !== hRow.baseline.sizeBytes) fail(path + ': bridge does not match preserved H/V29 pins');
      const mmBlob = blob(bridge.sourceEpoch.currentSnapshotCommit, path);
      const hBlob = blob(bridge.historicalH.fullM1PreimageCommit, path);
      const v29Blob = blob(bridge.version29.baselineCommit, path);
      assertBlob(mmBlob, row.currentMm, path + ' MM snapshot');
      assertBlob(hBlob, row.historicalH, path + ' H preimage');
      assertBlob(v29Blob, row.version29Baseline, path + ' Version29 baseline');
      if (row.json) {
        assertJsonObject(mmBlob, row.currentMm, path + ' MM JSON');
        assertJsonObject(hBlob, row.historicalH, path + ' H JSON');
        assertJsonObject(v29Blob, row.version29Baseline, path + ' Version29 JSON');
      }
      const worktree = readFileSync(resolve(root, path));
      assertBlob(worktree, row.currentMm, path + ' live MM worktree');
    }
  }
  currentGuard();
  verifyAllMappings();

  function rowFor(path) { return bridgeRows.get(safeRepoPath(path)); }
  function historicalHBlob(row) {
    const bytes = blob(bridge.historicalH.fullM1PreimageCommit, row.path);
    assertBlob(bytes, row.historicalH, row.path + ' H preimage');
    return bytes;
  }
  function version29Blob(row) {
    const bytes = blob(bridge.version29.baselineCommit, row.path);
    assertBlob(bytes, row.version29Baseline, row.path + ' Version29 baseline');
    return bytes;
  }
  function assertLiveMmPath(row) {
    const bytes = readFileSync(resolve(root, row.path));
    assertBlob(bytes, row.currentMm, row.path + ' live MM worktree');
    assertBlob(blob(bridge.sourceEpoch.currentSnapshotCommit, row.path), row.currentMm, row.path + ' MM Git snapshot');
    return bytes;
  }
  function mmToHBytes(row, bytes) {
    const supplied = copyRawBytes(bytes, row.path);
    if (hash(supplied) === row.currentMm.sha256 && supplied.length === row.currentMm.sizeBytes) return historicalHBlob(row);
    if (hash(supplied) === row.historicalH.sha256 && supplied.length === row.historicalH.sizeBytes) return supplied;
    if (hash(supplied) === row.version29Baseline.sha256 && supplied.length === row.version29Baseline.sizeBytes) return supplied;
    fail(row.path + ': unknown MM/H/Version29 byte state');
  }
  function mmToHJson(row, value) {
    assertPlainJson(value, row.path + ' caller JSON');
    const suppliedSha = hash(Buffer.from(JSON.stringify(value)));
    if (suppliedSha === row.currentMm.objectSha256) return assertJsonObject(historicalHBlob(row), row.historicalH, row.path + ' H JSON');
    if (suppliedSha === row.historicalH.objectSha256 || suppliedSha === row.version29Baseline.objectSha256) return value;
    fail(row.path + ': unknown MM/H/Version29 object state');
  }

  // This is the frozen Version29 inverse kernel relation; its input is now an
  // exact H preimage or exact Version29 baseline, never unrecognized MM data.
  function version29KernelBytes(path, bytes) {
    const hRow = hRows.get(path);
    if (!hRow) return bytes;
    return hash(bytes) === hRow.current.sha256 ? version29Blob(bridgeRows.get(path)) : bytes;
  }
  function version29KernelJson(path, value) {
    const hRow = hRows.get(path);
    if (!hRow) return value;
    assertPlainJson(value, path + ' frozen inverse input');
    return hRow.json && hash(Buffer.from(JSON.stringify(value))) === hRow.currentObjectSha256
      ? parseJson(version29Blob(bridgeRows.get(path)), path + ' Version29 JSON') : value;
  }

  function normalizeVersion29HistoricalBytes(path, bytes) {
    const row = rowFor(path);
    if (!row) fail('raw normalization path is outside the closed 22-path H bridge');
    currentGuard();
    assertLiveMmPath(row);
    const historical = mmToHBytes(row, bytes);
    return version29KernelBytes(row.path, historical);
  }
  function normalizeVersion29HistoricalJson(path, value) {
    const row = rowFor(path);
    if (!row) fail('JSON normalization path is outside the closed 22-path H bridge');
    currentGuard();
    assertLiveMmPath(row);
    const historical = mmToHJson(row, value);
    return version29KernelJson(row.path, historical);
  }
  function isVersion29HistoricalPath(path) {
    return typeof path === 'string' && bridgeRows.has(path);
  }
  function readVersion29HistoricalFile(path, options) {
    const encoding = readEncoding(options);
    if (typeof path === 'number') return readFileSync(path, options);
    const absolute = fixedLocalPath(path);
    const local = relative(root, absolute).split(sep).join('/');
    const row = bridgeRows.get(local);
    if (!row) return readFileSync(path, options);
    currentGuard();
    const currentBytes = assertLiveMmPath(row);
    const historical = mmToHBytes(row, currentBytes);
    const version29 = version29KernelBytes(row.path, historical);
    return encoding ? version29.toString(encoding) : version29;
  }
  function readExactHistoricalHPreimageFile(path, options) {
    const row = rowFor(path);
    currentGuard();
    assertLiveMmPath(row);
    const bytes = historicalHBlob(row);
    const encoding = readEncoding(options);
    return encoding ? bytes.toString(encoding) : bytes;
  }
  function assertHistoricalHPreimage() {
    const current = currentGuard();
    verifyAllMappings();
    return Object.freeze({
      status: 'verified-exact-historical-H-preimage; not current-MM data',
      currentMmSnapshotCommit: bridge.sourceEpoch.currentSnapshotCommit,
      mmSourceCommit: bridge.sourceEpoch.mmSourceCommit,
      historicalHPreimageCommit: bridge.historicalH.fullM1PreimageCommit,
      historicalHSourceTree: bridge.historicalH.sourceTree,
      historicalHPreimageTree: bridge.historicalH.fullM1PreimageTree,
      currentMmSummary: detachedFrozenJson(current.summary, 'current-MM proof summary'),
      historicalHSummary: detachedFrozenJson(bridge.historicalH.historicalSummary, 'historical-H proof summary'),
      historicalPaths: bridge.mappingPolicy.orderedFiles.length,
      mmChangedPathsRestored: bridge.counts.exactMmToHRestores,
      sourcePdfsCopied: false,
    });
  }

  return {normalizeVersion29HistoricalBytes, normalizeVersion29HistoricalJson, readVersion29HistoricalFile,
    isVersion29HistoricalPath,
    readExactHistoricalHPreimageFile, assertHistoricalHPreimage};
}

const fixedRepoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const reader = createCurrentMmVersion29HistoricalReader(fixedRepoRoot);
export const {
  normalizeVersion29HistoricalBytes,
  normalizeVersion29HistoricalJson,
  readVersion29HistoricalFile,
  isVersion29HistoricalPath,
  readExactHistoricalHPreimageFile,
  assertHistoricalHPreimage,
} = reader;

