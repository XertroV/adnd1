// Finite V5 supplement for the exact current-MM monetary consumer dependency closure.
// Historical reads are served from A29 only after M1/ac609 byte-mirror checks.
import {readFileSync as nodeReadFileSync, lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {assertHistoricalMmTestStage, historicalMmTestRoot} from './mm-replay-fs-v4.mjs';
import {assertHistoricalMmRoleSupplementV4, historicalMmTestRoleSupplementV4Paths} from './mm-test-postsource-supplement-v4.mjs';
import {historicalMmRoleSupplementV2Paths} from './mm-test-postsource-supplement-v2.mjs';
import {historicalMmTestRoleSupplementV3Paths} from './mm-test-postsource-supplement-v3.mjs';

export const mmTestRoleSupplementV5Path = 'research/class-mapping-history-v1/mm-test-role-supplement-v5.json';
export const mmTestRoleSupplementV5Sha256 = '4ed0c75ba78e865db10a39929cb9e80b3938dcecc98394c2215de2f9fdf1a488';

const root = historicalMmTestRoot;
const raw = createRawGitReader(root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const A29 = 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2';
const A29_TREE = 'da1c64ea25f178a1155a79c4692964e9b17dd645';
const M1 = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
const M1_TREE = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
const AC609 = 'ac60970626fd5e0421fc4b99c141cc11f53ffff3';
const AC609_TREE = '617b73d3d6db32d9406309dececcaa2eeb708568';
const V6_PATH = 'research/class-mapping-history-v1/mm-test-input-manifest-v6.json';
const V6_SHA256 = 'a063dd1910847d94e363f1cee502dfa34fd283ccf2c79f1370bcffe00f886070';
const CAPSULE_PATH = 'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json';
const CAPSULE_SHA256 = '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003';
const fail = message => { throw new Error(`Historical-MM consumer dependency supplement V5: ${message}`); };
let loaded = null;

function readPinnedPhysical(path, expectedSha256) {
  const absolute = resolve(root, path), stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`pinned historical manifest must be a regular physical file: ${path}`);
  const bytes = nodeReadFileSync(absolute);
  if (hash(bytes) !== expectedSha256) fail(`pinned historical manifest bytes changed: ${path}`);
  return bytes;
}

function loadFixedManifest() {
  const bytes = readPinnedPhysical(mmTestRoleSupplementV5Path, mmTestRoleSupplementV5Sha256);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail('V5 manifest is not JSON'); }
  if (value.schemaVersion !== 5
      || value.artifactType !== 'typed supplemental historical-MM current monetary consumer dependency roles; outside the immutable source capsule'
      || value.status !== 'PROPOSED_NOT_INSTALLED_NOT_EXECUTED'
      || value.sourceSemanticsCertified !== false || value.numericOrGradeApproval !== false || value.nativeQualification !== false
      || value.predecessorSupplement?.path !== 'research/class-mapping-history-v1/mm-test-role-supplement-v4.json'
      || value.predecessorSupplement?.sha256 !== '517f8b522abe7da2261f5f03cfdc2d2aa848905ea20fed148755d6067bdbafe4'
      || value.predecessorSupplement?.roleCount !== 1
      || value.preservedV3?.sha256 !== '27856ec212c1e0d9326572e8fd44b1c261f18db6ca838c6277cd6c42face8235'
      || value.preservedV3?.roleCount !== 9
      || value.preservedV2?.sha256 !== 'b8c887c3f75a2ac128c635d7016549df47a372ddc74b7f78d3ab045c3effca12'
      || value.preservedV2?.roleCount !== 12
      || value.preservedCapsule?.sha256 !== CAPSULE_SHA256 || value.preservedCapsule?.fileCount !== 25
      || value.preservedCapsule?.sourceInputCount !== 21
      || value.preservedReplayManifest?.sha256 !== V6_SHA256 || value.preservedReplayManifest?.fileCount !== 2932
      || value.historicalReplayHead?.commit !== A29 || value.historicalReplayHead?.tree !== A29_TREE
      || value.currentMmSourceEpoch?.commit !== M1 || value.currentMmSourceEpoch?.tree !== M1_TREE
      || value.postSourceRegistryMetadata?.commit !== AC609 || value.postSourceRegistryMetadata?.tree !== AC609_TREE
      || value.postSourceRegistryMetadata?.parentCommit !== M1 || value.postSourceRegistryMetadata?.parentTree !== M1_TREE
      || value.inventoryEvidence?.missingHistoricalRoles !== 31
      || value.inventoryEvidence?.a29IndexV6MissingCount !== 0
      || value.inventoryEvidence?.a29IndexV6HashMismatchCount !== 0
      || !Array.isArray(value.roles) || value.roles.length !== 31) fail('fixed V5 lineage, scope, or 31-role manifest changed');
  const names = new Set(), paths = new Set();
  for (const row of value.roles) {
    if (!row || typeof row.role !== 'string' || names.has(row.role) || typeof row.path !== 'string' || paths.has(row.path)
        || row.originCommit !== A29 || row.originTree !== A29_TREE
        || row.sourceEpochMirrorCommit !== M1 || row.sourceEpochMirrorTree !== M1_TREE
        || row.postSourceRegistryMirrorCommit !== AC609 || row.postSourceRegistryMirrorTree !== AC609_TREE
        || !/^[a-f0-9]{64}$/.test(row.sha256 ?? '') || row.sourceEpochMirrorSha256 !== row.sha256
        || row.postSourceRegistryMirrorSha256 !== row.sha256 || row.sourceEpochMirrorSizeBytes !== row.sizeBytes
        || row.postSourceRegistryMirrorSizeBytes !== row.sizeBytes || !Number.isSafeInteger(row.sizeBytes)
        || !Array.isArray(row.dependencyEvidence) || row.dependencyEvidence.length === 0
        || row.path.startsWith('/') || row.path.includes('\\')
        || row.path.split('/').some(part => !part || part === '.' || part === '..')) fail('malformed, duplicate, unsafe, or mixed-epoch V5 role');
    names.add(row.role);
    paths.add(row.path);
  }
  return value;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const historicalMmTestRoleSupplementV5Manifest = deepFreeze(loadFixedManifest());
export const historicalMmTestRoleSupplementV5Paths = Object.freeze(
  historicalMmTestRoleSupplementV5Manifest.roles.map(({role, path}) => Object.freeze({role, path})),
);

function initialize() {
  if (loaded) return;
  assertHistoricalMmTestStage();
  raw.assertView();
  const predecessor = assertHistoricalMmRoleSupplementV4();
  if (predecessor?.roles?.length !== 1 || predecessor?.a29ReplayHead !== A29
      || predecessor?.sourceSemanticsCertified !== false || predecessor?.numericOrGradeApproval !== false
      || predecessor?.nativeQualification !== false) fail('exact V4 predecessor closure required');
  const v6 = JSON.parse(readPinnedPhysical(V6_PATH, V6_SHA256).toString('utf8'));
  readPinnedPhysical(CAPSULE_PATH, CAPSULE_SHA256);
  if (v6.files?.length !== 2932) fail('fixed V6 replay manifest required');
  if (raw.git('rev-parse', `${A29}^{tree}`).toString('utf8').trim() !== A29_TREE
      || raw.git('rev-parse', `${M1}^{tree}`).toString('utf8').trim() !== M1_TREE
      || raw.git('rev-parse', `${AC609}^{tree}`).toString('utf8').trim() !== AC609_TREE) fail('fixed A29/M1/ac609 Git trees changed');
  raw.git('merge-base', '--is-ancestor', M1, A29);
  const registryParents = raw.git('rev-list', '--parents', '-n', '1', AC609).toString('utf8').trim().split(' ');
  if (registryParents.length !== 2 || registryParents[0] !== AC609 || registryParents[1] !== M1) fail('post-source registry metadata must remain a direct M1 child');

  const predecessorPaths = new Set([
    ...v6.files.map(row => row.path),
    ...historicalMmRoleSupplementV2Paths.map(row => row.path),
    ...historicalMmTestRoleSupplementV3Paths.map(row => row.path),
    ...historicalMmTestRoleSupplementV4Paths.map(row => row.path),
  ]);
  if (predecessorPaths.size < v6.files.length || historicalMmRoleSupplementV2Paths.length !== 12
      || historicalMmTestRoleSupplementV3Paths.length !== 9 || historicalMmTestRoleSupplementV4Paths.length !== 1
      || historicalMmTestRoleSupplementV5Manifest.roles.some(row => predecessorPaths.has(row.path))) {
    fail('V5 roles must be exactly additive to the preserved V6/V2/V3/V4 role sets');
  }

  for (const row of historicalMmTestRoleSupplementV5Manifest.roles) {
    const origin = raw.git('show', `${A29}:${row.path}`);
    const sourceMirror = raw.git('show', `${M1}:${row.path}`);
    const registryMirror = raw.git('show', `${AC609}:${row.path}`);
    if (origin.length !== row.sizeBytes || hash(origin) !== row.sha256
        || sourceMirror.length !== row.sizeBytes || hash(sourceMirror) !== row.sourceEpochMirrorSha256 || !origin.equals(sourceMirror)
        || registryMirror.length !== row.sizeBytes || hash(registryMirror) !== row.postSourceRegistryMirrorSha256 || !origin.equals(registryMirror)) {
      fail(`A29 origin/M1/ac609 mirror bytes differ: ${row.role}`);
    }
  }
  raw.assertView();
  loaded = new Map(historicalMmTestRoleSupplementV5Manifest.roles.map(row => [row.role, row]));
}

export function assertHistoricalMmRoleSupplementV5() {
  initialize();
  return Object.freeze({
    status: 'verified 31 exact A29 historical-MM consumer dependencies with byte-identical M1 and ac609 mirrors',
    roles: [...loaded.keys()],
    a29ReplayHead: A29,
    currentMmSourceCommit: M1,
    postSourceRegistryCommit: AC609,
    sourceSemanticsCertified: false,
    numericOrGradeApproval: false,
    nativeQualification: false,
  });
}

export function readHistoricalMmRoleSupplementV5(role) {
  if (typeof role !== 'string' || !historicalMmTestRoleSupplementV5Manifest.roles.some(row => row.role === role)) fail('unknown role');
  initialize();
  const row = loaded.get(role);
  const bytes = raw.git('show', `${A29}:${row.path}`);
  if (bytes.length !== row.sizeBytes || hash(bytes) !== row.sha256) fail(`A29 origin bytes changed: ${row.path}`);
  return Buffer.from(bytes);
}
