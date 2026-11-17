import {createHash} from 'node:crypto';

// Pure byte-role validation for the historical MM search reader's Source2
// successor. This is not current-epoch admission. Any FS/Reader caller must
// invoke the genuine zero-argument Source2 identity gate before using this
// transport and must pass that gate's currentSource2Summary here.
export const MM_SEARCH_CJS_SOURCE2_STATES = Object.freeze({
  historical: Object.freeze({
    commit: 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2',
    tree: 'da1c64ea25f178a1155a79c4692964e9b17dd645',
    path: 'dist/search.js',
    sha256: '3a82651aa36e36a0a0697b91f6ce5db31350911ce1aa858e59fb91f2b40c66da',
    sizeBytes: 10876,
  }),
  historicalS1: Object.freeze({
    sourceCommit: '2d35138027f00c0740975e519dbb3a2b6df76d14',
    sourceTree: '40ecb15130b339658522794db6d9e1bc58f43b50',
    path: 'dist/search.js',
    sha256: 'b9de11c725edbffaf069282a48930052a78b238e925c8acdb6c8db97b764052f',
    sizeBytes: 11218,
  }),
  currentSource2: Object.freeze({
    stage: 'source2-body-native',
    sourceCommit: '400f6e9d123d8a654b9b9af48133a2533506e73d',
    sourceTree: '664c02504efcece25669d2f9c3fdb26437cd5b09',
    path: 'dist/search.js',
    sha256: 'b9de11c725edbffaf069282a48930052a78b238e925c8acdb6c8db97b764052f',
    sizeBytes: 11218,
  }),
});

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function fail(message) {
  throw new Error(`Invalid historical/Source2 search CJS transport: ${message}`);
}

function exactBytes(value, expected, label) {
  if (!Buffer.isBuffer(value) || value.length !== expected.sizeBytes || sha256(value) !== expected.sha256) {
    fail(`${label} bytes do not match the fixed Git object`);
  }
}

export function assertHistoricalSearchCjsTransportSource2({
  currentSource2Summary,
  historicalManifestPin,
  historicalGitBlob,
  historicalS1GitBlob,
  source2GitBlob,
  physicalCurrentBytes,
}) {
  const {historical, historicalS1, currentSource2} = MM_SEARCH_CJS_SOURCE2_STATES;
  if (currentSource2Summary?.stage !== currentSource2.stage ||
      currentSource2Summary?.sourceCommit !== currentSource2.sourceCommit ||
      currentSource2Summary?.sourceTree !== currentSource2.sourceTree) {
    fail('the exact current Source2 stage, source commit, and source tree are required');
  }
  if (historicalManifestPin?.path !== historical.path ||
      historicalManifestPin?.sha256 !== historical.sha256 ||
      historicalManifestPin?.sizeBytes !== historical.sizeBytes) {
    fail('the immutable a29 manifest pin for dist/search.js changed');
  }
  exactBytes(historicalGitBlob, historical, 'a29 historical search');
  exactBytes(historicalS1GitBlob, historicalS1, 'historical S1 search');
  exactBytes(source2GitBlob, currentSource2, 'current Source2 Git search');
  exactBytes(physicalCurrentBytes, currentSource2, 'physical current Source2 search');
  if (!historicalS1GitBlob.equals(source2GitBlob)) {
    fail('the fixed S1 bridge search and current Source2 search blobs differ');
  }
  if (!physicalCurrentBytes.equals(source2GitBlob)) {
    fail('the physical Source2 search file differs from its exact source-commit blob');
  }
  return Object.freeze({
    historical: Object.freeze({...historical}),
    historicalS1: Object.freeze({...historicalS1}),
    currentSource2Summary: Object.freeze({
      stage: currentSource2Summary.stage,
      sourceCommit: currentSource2Summary.sourceCommit,
      sourceTree: currentSource2Summary.sourceTree,
    }),
    currentSource2Search: Object.freeze({
      path: currentSource2.path,
      sha256: currentSource2.sha256,
      sizeBytes: currentSource2.sizeBytes,
    }),
    source2Status: 'source2-search-transport-verified',
  });
}
