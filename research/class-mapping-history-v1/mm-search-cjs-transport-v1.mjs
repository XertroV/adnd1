import {createHash} from 'node:crypto';

// Keep the immutable a29 search.js input separate from the exact current S1
// search.js body. Historical reads still come from a29; the physical checkout
// must match the source body named by the already-qualified current S1 epoch.
export const MM_SEARCH_CJS_STATES = Object.freeze({
  historical: Object.freeze({
    commit: 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2',
    path: 'dist/search.js',
    sha256: '3a82651aa36e36a0a0697b91f6ce5db31350911ce1aa858e59fb91f2b40c66da',
    sizeBytes: 10876,
  }),
  currentS1: Object.freeze({
    commit: '2d35138027f00c0740975e519dbb3a2b6df76d14',
    tree: '40ecb15130b339658522794db6d9e1bc58f43b50',
    path: 'dist/search.js',
    sha256: 'b9de11c725edbffaf069282a48930052a78b238e925c8acdb6c8db97b764052f',
    sizeBytes: 11218,
  }),
});

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function fail(message) {
  throw new Error(`Invalid historical/current search CJS transport: ${message}`);
}

function exactBytes(value, expected, label) {
  if (!Buffer.isBuffer(value) || value.length !== expected.sizeBytes || sha256(value) !== expected.sha256) {
    fail(`${label} bytes do not match the fixed Git object`);
  }
}

export function assertHistoricalSearchCjsTransport({
  currentSummary,
  historicalManifestPin,
  historicalGitBlob,
  currentS1GitBlob,
  physicalCurrentBytes,
}) {
  const old = MM_SEARCH_CJS_STATES.historical;
  const current = MM_SEARCH_CJS_STATES.currentS1;
  if (currentSummary?.sourceCommit !== current.commit || currentSummary?.sourceTree !== current.tree) {
    fail('the fixed current S1 source commit and tree are required');
  }
  if (historicalManifestPin?.path !== old.path || historicalManifestPin?.sha256 !== old.sha256 ||
      historicalManifestPin?.sizeBytes !== old.sizeBytes) {
    fail('the immutable a29 manifest pin for dist/search.js changed');
  }
  exactBytes(historicalGitBlob, old, 'a29 historical search');
  exactBytes(currentS1GitBlob, current, 'current S1 Git search');
  exactBytes(physicalCurrentBytes, current, 'physical current search');
  if (!physicalCurrentBytes.equals(currentS1GitBlob)) {
    fail('the physical S1 search file differs from its exact source-commit blob');
  }
  return Object.freeze({
    historicalPath: old.path,
    historicalSha256: old.sha256,
    currentPath: current.path,
    currentSourceCommit: current.commit,
    currentSourceTree: current.tree,
    currentSha256: current.sha256,
    status: 'historical-a29-and-current-s1-search-identities-verified',
  });
}
