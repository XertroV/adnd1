// Closed published-alias preimage adapter for the single 6b3 comparison in the
// Source2 continuation-alias test. This is not a general history projector.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readFileSync as readHistoricalFileSync} from '../../research/class-mapping-history-v1/mm-replay-fs-source2-v3.mjs';
import {execFileSync} from '../../research/class-mapping-history-v1/mm-replay-child-process-source2-v5.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SOURCE_COMMIT = '6b3cfc8cb421a2c1fc2379c38abebe2075634981';
const PUBLISHED_DATA_SHA256 = 'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3';
const PUBLISHED_DATA_SIZE = 15732215;
const PUBLISHED_MANIFEST_SHA256 = '9929dd838c8f9ce86c0fd6259d4bb93310a739886f47c98f9e40b6d33ef244d0';
const PUBLISHED_MANIFEST_SIZE = 1087706;
const fixtureSpecs = [
  {
    path: 'tests/fixtures/pass8-ua-source-history-v1.json.gz',
    sha256: '8d4d781dfa364b677d279753991dbe5cb14f3fee0e7ead08538a54d7ca89d89a',
    artifactType: 'exact-pass8-ua-source-historical-projection',
    beforeCommit: '6717c6f22bbf2f2b421327e4c8561b1d81df00d4',
    sourceCommit: SOURCE_COMMIT,
    sourcePaths: 17,
    metadataPaths: 8,
    rawPaths: [],
  },
  {
    path: 'tests/fixtures/pass8-weapon-source-history-v1.json.gz',
    sha256: '049924ffd08e0fd88839ddea635f34300bab9800a4299c39cb41cb77abafb1f8',
    artifactType: 'exact-pass8-weapon-source-historical-projection',
    beforeCommit: 'cc9509047746d5e27a71cb5b1e0cfcb739a688c9',
    sourceCommit: '9ee2550e9793e6aae9a7ac8fd71525704894950f',
    sourcePaths: 12,
    metadataPaths: 5,
    rawPaths: ['dist/source-viewer.js'],
  },
  {
    path: 'tests/fixtures/pass8-citation-target-crop-history-v1.json.gz',
    sha256: '26f1aadb110934ff1b6ce3f7aa334206e65183608d8f13f0248eaf13b1e2987a',
    artifactType: 'exact-pass8-citation-target-crop-historical-projection',
    beforeCommit: '4aa977788085f67a28a24d40965edf987bc7242b',
    sourceCommit: '9f445e32b079a3339b26a345776f8fb34b81f376',
    sourcePaths: 20,
    metadataPaths: 5,
    rawPaths: [],
  },
];

function loadFixture(spec) {
  const compressed = readHistoricalFileSync(spec.path);
  assert.equal(sha(compressed), spec.sha256, `${spec.path}: exact sealed projection contract`);
  const doc = JSON.parse(gunzipSync(compressed));
  assert.equal(doc.artifactType, spec.artifactType);
  assert.equal(doc.beforeCommit, spec.beforeCommit);
  assert.equal(doc.sourceCommit, spec.sourceCommit);
  assert.equal(doc.sourcePaths.length, spec.sourcePaths);
  assert.equal(doc.metadataPaths.length, spec.metadataPaths);
  assert.deepEqual(doc.rawPaths, spec.rawPaths);
  assert.deepEqual(Object.keys(doc.files), [...doc.sourcePaths, ...doc.metadataPaths]);
  assert.deepEqual(Object.keys(doc.rawFiles || {}), spec.rawPaths);
  for (const reference of doc.proofs || []) {
    const proof = readHistoricalFileSync(reference.path);
    assert.equal(sha(proof), reference.sha256, `${reference.path}: sealed pass8 proof`);
    assert.equal(proof.length, reference.sizeBytes, `${reference.path}: sealed pass8 proof size`);
  }
  return {
    beforeCommit: doc.beforeCommit,
    files: new Map(Object.entries({...doc.files, ...(doc.rawFiles || {})})),
  };
}

// The helper chain used by the original assertion is exactly UA -> weapon ->
// citation-target/crop. Later PHB/XP/character stages are not in this API.
const stages = fixtureSpecs.map(loadFixture);
const laterOwnsPath = (index, path) => stages.slice(index + 1).some(stage => stage.files.has(path));
const collections = ['rules', 'spells', 'equipment', 'matrices', 'classes', 'progressionExplainer'];
const rawPublishedData = execFileSync('git', ['show', `${SOURCE_COMMIT}:dist/data.json`], {maxBuffer: 32 * 1024 * 1024});
assert.equal(rawPublishedData.length, PUBLISHED_DATA_SIZE);
assert.equal(sha(rawPublishedData), PUBLISHED_DATA_SHA256);
const publishedData = JSON.parse(rawPublishedData);
const catalogPaths = new Set();
for (const collection of collections) {
  const rows = Array.isArray(publishedData[collection]) ? publishedData[collection] : publishedData[collection] ? [publishedData[collection]] : [];
  for (const owner of rows) {
    for (const key of ['sourceExcerpts', 'scanVerification']) {
      const path = owner[key]?.catalog;
      if (path) catalogPaths.add(path);
    }
  }
}
assert.equal(catalogPaths.size, 1023, 'the fixed 6b3 published source closes 1023 catalog paths');
const publishedCache = new Map([['dist/data.json', Buffer.from(rawPublishedData)]]);

function publishedRaw(path) {
  if (path === 'dist/data.json') return Buffer.from(rawPublishedData);
  if (path !== 'research/citation-continuations.json' && !(path.startsWith('dist/') && catalogPaths.has(path.slice('dist/'.length)))) {
    throw new Error('Published alias projection path is outside the fixed 6b3 data/manifest/catalog closure');
  }
  if (publishedCache.has(path)) return Buffer.from(publishedCache.get(path));
  const bytes = execFileSync('git', ['show', `${SOURCE_COMMIT}:${path}`], {maxBuffer: 32 * 1024 * 1024});
  if (path === 'research/citation-continuations.json') {
    assert.equal(bytes.length, PUBLISHED_MANIFEST_SIZE);
    assert.equal(sha(bytes), PUBLISHED_MANIFEST_SHA256);
  }
  publishedCache.set(path, Buffer.from(bytes));
  return Buffer.from(bytes);
}

function projectClosedPath(path, input) {
  let bytes = Buffer.from(input);
  for (let index = 0; index < stages.length; index++) {
    const stage = stages[index];
    const pin = stage.files.get(path);
    if (!pin) continue;
    const digest = sha(bytes);
    if (![pin.beforeRawSha256, pin.afterRawSha256].includes(digest)) {
      if (laterOwnsPath(index, path)) continue;
      throw new Error(`${path}: source bytes are outside the exact three-stage pass8 projection`);
    }
    const before = execFileSync('git', ['show', `${stage.beforeCommit}:${path}`], {maxBuffer: 100 * 1024 * 1024});
    assert.equal(sha(before), pin.beforeRawSha256, `${path}: exact pass8 stage preimage bytes`);
    if (pin.beforeSizeBytes !== undefined) assert.equal(before.length, pin.beforeSizeBytes, `${path}: exact pass8 stage preimage size`);
    if (pin.beforeObjectSha256 !== undefined) {
      const object = JSON.parse(before);
      assert.equal(sha(Buffer.from(JSON.stringify(object))), pin.beforeObjectSha256, `${path}: exact pass8 stage preimage object`);
    }
    bytes = Buffer.from(before);
  }
  return bytes;
}

export function readPass8PublishedAliasFile(...args) {
  if (args.length !== 1) throw new Error('Published alias projection accepts exactly one fixed relative path');
  const [path] = args;
  return projectClosedPath(path, publishedRaw(path));
}
