// Explicit test adapter: separately prove current S1 and exact historical MM/H inputs.
// Extra catalog/image blobs are admitted by closed static SHA/size manifests and fixed Git trees.
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {types} from 'node:util';
import {
  assertHistoricalHPreimage,
  readExactHistoricalHPreimageFile,
  readVersion29HistoricalFile,
} from '../../research/class-mapping-history-v1/closed-version29-reader-class-mapping-v1.mjs';

const repoRoot = resolve(import.meta.dirname, '../..');
const historicalGit=createRawGitReader(repoRoot);
const hCommit = '5c6a57386af372c7c0d89e342003a7edf68ca0dd';
const hTree = '391026a96811e7bcf0dfcb61c3753ff708308fe1';
const hSourceCommit = 'bc819621e49788260bb34ea47c1f7a8b35af6edf';
const hSourceTree = 'e6bc420f70656825a926297b959bc6d98758bfcd';
const mmCommit = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
const mmTree = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
const currentSnapshotCommit = 'ac60970626fd5e0421fc4b99c141cc11f53ffff3';
const catalogManifestPath = 'research/mm-source-history-v1/historical-h-catalog-blobs-v1.json';
const catalogManifestSha256 = 'c35dbe28d2d4a96dceac0a78979dcd97972b4c3a776c129976d627993642b28e';
const continuationImageManifestPath = 'research/mm-source-history-v1/historical-h-continuation-images-v2.json';
const continuationImageManifestSha256 = '54da91999758bb4d4ad236fcf16196d9d46ace2820fe8a3065837a586762c0fe';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Invalid exact H regression inputs: ${message}`); };

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

export function assertCurrentMmHistoricalHPreimage() {
  const proof = assertHistoricalHPreimage();
  if (proof.status !== 'verified-exact-historical-H-preimage; not current-MM data'
      || proof.mmSourceCommit !== mmCommit || proof.currentMmSnapshotCommit !== currentSnapshotCommit
      || proof.historicalHPreimageCommit !== hCommit || proof.historicalHPreimageTree !== hTree
      || proof.historicalHSourceTree !== hSourceTree
      || proof.currentMmSummary?.sourceCommit !== mmCommit || proof.currentMmSummary?.sourceTree !== mmTree
      || proof.currentMmSummary?.owners !== 1064 || proof.currentMmSummary?.canonicalBindings !== 5731
      || proof.currentMmSummary?.retainedCanonicalBindings !== 5655 || proof.currentMmSummary?.addedCanonicalBindings !== 76
      || proof.currentMmSummary?.manualBindings !== 1293 || proof.currentMmSummary?.addedManualBindings !== 42
      || proof.currentMmSummary?.addedOwners !== 2
      || proof.historicalHSummary?.sourceCommit !== hSourceCommit || proof.historicalHSummary?.owners !== 1062
      || proof.historicalHSummary?.canonicalBindings !== 5655 || proof.historicalHSummary?.priorWholeBindings !== 4931
      || proof.historicalHSummary?.addedBindings !== 724 || proof.historicalHSummary?.manualAdditions !== 321
      || proof.historicalPaths !== 22 || proof.sourcePdfsCopied !== false) fail('strict MM cohort plus full-M1 H preimage proof');
  // Never expose a mutable proof summary that could alias the reader's private bridge state.
  return deepFreeze({
    status: proof.status,
    stage: proof.stage,
    currentS1Summary: structuredClone(proof.currentS1Summary),
    currentMmSnapshotCommit: proof.currentMmSnapshotCommit,
    mmSourceCommit: proof.mmSourceCommit,
    historicalHPreimageCommit: proof.historicalHPreimageCommit,
    historicalHSourceTree: proof.historicalHSourceTree,
    historicalHPreimageTree: proof.historicalHPreimageTree,
    currentMmSummary: structuredClone(proof.currentMmSummary),
    historicalHSummary: structuredClone(proof.historicalHSummary),
    historicalPaths: proof.historicalPaths,
    mmChangedPathsRestored: proof.mmChangedPathsRestored,
    sourcePdfsCopied: false,
  });
}

export function readMappedHistoricalHBytes(path) {
  if (typeof path !== 'string') fail('mapped path must be a string');
  const bytes = readExactHistoricalHPreimageFile(path);
  if (!Buffer.isBuffer(bytes)) fail(`${path}: expected exact raw H bytes`);
  return Buffer.from(bytes);
}

function safeRepoPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe Git blob path');
  return path;
}

function manifestRows(path, expectedSha256, artifactType) {
  const bytes = readFileSync(resolve(repoRoot, path));
  if (sha256(bytes) !== expectedSha256) fail(`${path}: manifest bytes changed`);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail(`${path}: invalid manifest JSON`); }
  if (value.schemaVersion !== 1 || value.artifactType !== artifactType
      || value.sourceCommit !== hCommit || value.sourceTree !== hTree
      || !Array.isArray(value.files)) fail(`${path}: wrong fixed H blob manifest identity`);
  const rows = new Map();
  for (const row of value.files) {
    safeRepoPath(row.path);
    if (rows.has(row.path) || !/^[a-f0-9]{64}$/.test(row.sha256 || '')
        || !Number.isSafeInteger(row.sizeBytes) || row.sizeBytes < 0) fail(`${path}: invalid/duplicate blob row`);
    rows.set(row.path, row);
  }
  return rows;
}

const catalogRows = manifestRows(catalogManifestPath, catalogManifestSha256,
  'closed full-M1 historical H catalog Git-blob manifest');
const continuationImageRows = manifestRows(continuationImageManifestPath, continuationImageManifestSha256,
  'closed full-M1 historical H image blobs for full continuation-manifest regression');
if (catalogRows.size !== 1082 || continuationImageRows.size !== 343) fail('fixed catalog/image manifest denominators');

function readClosedHFiles(paths, rows) {
  assertCurrentMmHistoricalHPreimage();
  if (types.isProxy(paths) || !Array.isArray(paths)) fail('closed path list must be an ordinary array');
  const normalized = [];
  const seen = new Set();
  for (const path of paths) {
    safeRepoPath(path);
    if (seen.has(path)) fail(`duplicate closed path: ${path}`);
    const pin = rows.get(path);
    if (!pin) fail(`path is absent from the fixed H Git-blob manifest: ${path}`);
    seen.add(path);
    normalized.push(path);
  }
  if (!normalized.length) fail('empty H blob selection');
  if (historicalGit.git('rev-parse', `${hCommit}^{tree}`).toString('utf8').trim() !== hTree) fail('full-M1 H tree identity changed');
  const files = new Map();
  for (const path of normalized) {
    const bytes = historicalGit.git('show', `${hCommit}:${path}`), pin = rows.get(path);
    if (bytes.length !== pin.sizeBytes || sha256(bytes) !== pin.sha256) fail(`${path}: immutable Git file differs from its exact full-M1 H Git-blob pin`);
    files.set(path, Buffer.from(bytes));
  }
  return files;
}

function catalogRelPath(path) {
  const safe = safeRepoPath(path);
  if (!/^scans\/(?:verified|dagger)\/[a-z0-9._/-]+\.json$/.test(safe)) fail(`not a registered H catalog path: ${path}`);
  return `dist/${safe}`;
}

export function readClosedHistoricalHCatalogBlobs(catalogPaths) {
  if (types.isProxy(catalogPaths) || !Array.isArray(catalogPaths)) fail('catalog path list must be ordinary');
  const files = readClosedHFiles(catalogPaths.map(catalogRelPath), catalogRows);
  return new Map([...files].map(([path, bytes]) => [path.slice('dist/'.length), JSON.parse(bytes.toString('utf8'))]));
}

function catalogsFromHData(data) {
  const paths = new Set();
  for (const collection of ['rules', 'spells', 'equipment', 'matrices', 'classes']) {
    for (const item of data[collection] || []) for (const key of ['sourceExcerpts', 'scanVerification']) {
      const path = item[key]?.catalog;
      if (path) paths.add(path);
    }
  }
  if (data.progressionExplainer) for (const key of ['sourceExcerpts', 'scanVerification']) {
    const path = data.progressionExplainer[key]?.catalog;
    if (path) paths.add(path);
  }
  return [...paths].sort();
}

export function loadHistoricalHAliasInputs() {
  const proof = assertCurrentMmHistoricalHPreimage();
  const dataBytes = readMappedHistoricalHBytes('dist/data.json');
  const manifestBytes = readMappedHistoricalHBytes('research/citation-continuations.json');
  const data = JSON.parse(dataBytes.toString('utf8'));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const catalogPaths = [...new Set([...catalogsFromHData(data), ...manifest.groups.map(group => group.catalog)])].sort();
  const rawCatalogs = readClosedHFiles(catalogPaths.map(catalogRelPath), catalogRows);
  const catalogs = new Map([...rawCatalogs].map(([path, bytes]) => [path.slice('dist/'.length), JSON.parse(bytes.toString('utf8'))]));
  const inputHashes = {
    data: {path: 'dist/data.json', sha256: sha256(dataBytes)},
    manifest: {path: 'research/citation-continuations.json', sha256: sha256(manifestBytes)},
    catalogs: Object.fromEntries([...rawCatalogs.keys()].sort().map(path => [path.slice('dist/'.length), sha256(rawCatalogs.get(path))])),
  };
  return {proof, data, manifest, catalogs, inputHashes, catalogPaths};
}

export function loadHistoricalHContinuationInputs() {
  const proof = assertCurrentMmHistoricalHPreimage();
  const dataBytes = readMappedHistoricalHBytes('dist/data.json');
  const manifestBytes = readMappedHistoricalHBytes('research/citation-continuations.json');
  const data = JSON.parse(dataBytes.toString('utf8'));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const oldManifestBytes = readVersion29HistoricalFile('research/citation-continuations.json');
  const oldPublishedBytes = readVersion29HistoricalFile('dist/source-continuations.json');
  const publishedBytes = readMappedHistoricalHBytes('dist/source-continuations.json');
  const catalogPaths = new Set();
  for (const group of manifest.groups) {
    if (group.catalog) catalogPaths.add(`dist/${group.catalog}`);
    for (const candidate of group.checkedAlternativeRegions || []) if (candidate.catalog) catalogPaths.add(`dist/${candidate.catalog}`);
  }
  for (const regression of manifest.regressions || []) for (const binding of regression.bindings || []) {
    if (binding.catalog) catalogPaths.add(`dist/${binding.catalog}`);
  }
  const orderedCatalogPaths = [...catalogPaths].sort();
  const catalogFiles = readClosedHFiles(orderedCatalogPaths, catalogRows);
  const imagePaths = new Set();
  for (const [catalogPath, bytes] of catalogFiles) {
    const catalog = JSON.parse(bytes.toString('utf8'));
    for (const region of catalog.regions || []) if (region.image) {
      imagePaths.add(join(dirname(catalogPath), region.image).split('\\').join('/'));
    }
  }
  for (const group of manifest.groups) {
    for (const segment of group.segments || []) if (segment.image) imagePaths.add(join('dist', dirname(group.catalog), segment.image).split('\\').join('/'));
    for (const candidate of group.checkedAlternativeRegions || []) if (candidate.image) imagePaths.add(join('dist', dirname(candidate.catalog), candidate.image).split('\\').join('/'));
  }
  for (const regression of manifest.regressions || []) for (const binding of regression.bindings || []) {
    if (binding.image) imagePaths.add(join('dist', dirname(binding.catalog), binding.image).split('\\').join('/'));
  }
  if (imagePaths.size !== continuationImageRows.size || [...imagePaths].some(path => !continuationImageRows.has(path))) fail('full continuation-manifest image set differs from exact H image manifest');
  readClosedHFiles([...imagePaths].sort(), continuationImageRows);
  return {
    proof,
    dataBytes,
    data,
    manifest,
    manifestBytes,
    publishedBytes,
    oldManifestBytes,
    oldPublishedBytes,
    catalogRoot: resolve(repoRoot, 'dist'),
    dispose: () => {},
  };
}

export function loadHistoricalHAvailabilityInputs(ownerCatalogPaths) {
  const proof = assertCurrentMmHistoricalHPreimage();
  const dataBytes = readMappedHistoricalHBytes('dist/data.json');
  // The historical availability comparator's baseline handoff is deliberately
  // the immutable pre-D175 Git blob, not the later full-M1 H handoff. Current
  // data/catalog positives below remain exact full-M1 H inputs.
  const baselineCommit = '386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
  const handoffBytes = historicalGit.git('show', `${baselineCommit}:research/gaps-limitations-next-task.json`);
  if (sha256(handoffBytes) !== '54cb148c3c9e5cfaf4a1a4e55509cd6e93f6f8ce45fedc17e9460ddd81698d77') {
    fail('pre-D175 baseline handoff Git blob identity');
  }
  if (types.isProxy(ownerCatalogPaths) || !Array.isArray(ownerCatalogPaths)) fail('availability owner catalog paths must be ordinary');
  const handoff = JSON.parse(handoffBytes.toString('utf8'));
  const referenced = handoff.missingReferencedContent?.missingCitedPages?.[0]?.currentReference?.catalog;
  if (typeof referenced !== 'string') fail('fixed H handoff citation catalog is missing');
  const catalogPaths = [...new Set([referenced, ...ownerCatalogPaths])].sort();
  const rawCatalogs = readClosedHFiles(catalogPaths.map(catalogRelPath), catalogRows);
  const files = new Map([...rawCatalogs].map(([path, bytes]) => [path.slice('dist/'.length), JSON.parse(bytes.toString('utf8'))]));
  return {
    proof,
    dataBytes,
    handoffBytes,
    data: JSON.parse(dataBytes.toString('utf8')),
    handoff,
    catalogs: files,
    catalogHashes: Object.fromEntries([...rawCatalogs].map(([path, bytes]) => [path.slice('dist/'.length), sha256(bytes)])),
  };
}
