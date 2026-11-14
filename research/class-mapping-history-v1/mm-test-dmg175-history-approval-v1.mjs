// Typed, finite historical approval-reference reads for the preserved DMG175 helper.
// This does not grade source values or expand the immutable source capsule.
import {readFileSync as nodeReadFileSync, lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {historicalMmTestRoot, assertHistoricalMmTestStage} from './mm-replay-fs-v5.mjs';
import {assertHistoricalMmRoleSupplementV5, historicalMmTestRoleSupplementV5Manifest} from './mm-test-postsource-supplement-v5.mjs';
import {historicalMmRoleSupplementV2Paths} from './mm-test-postsource-supplement-v2.mjs';
import {historicalMmTestRoleSupplementV3Paths} from './mm-test-postsource-supplement-v3.mjs';
import {historicalMmTestRoleSupplementV4Paths} from './mm-test-postsource-supplement-v4.mjs';

export const mmTestDmg175HistoryApprovalPath = 'research/class-mapping-history-v1/mm-test-dmg175-history-approval-v1.json';
export const mmTestDmg175HistoryApprovalSha256 = 'be14d4d03ac799056e4bda0bdd827a915b531e737758730a6950ebb821f64ab5';

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
const CAPSULE_SHA256 = '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003';
const FIXTURE_PATH = 'tests/fixtures/dmg175-853-history-projection-contract-v1.json.gz';
const FIXTURE_SHA256 = '31f3410033b3a2a362cf51e556be55d7d8d6bf7bea66fd47c2b0c5561e6b9d42';
const FOCUS_ROOT_PATH = 'research/source-audit-batch6-dmg175-v2-focus-root-independent-review.json';
const FOCUS_ROOT_SHA256 = '2319330608c7e2ad768428e225f4baad7d81067dd067f831d0fea4e5bb9f1f0c';
const fail = message => { throw new Error(`DMG175 history-approval supplement V1: ${message}`); };
let loaded = null;

function readPinnedPhysical(path, expectedSha256) {
  const absolute = resolve(root, path), stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`pinned metadata must be a regular physical file: ${path}`);
  const bytes = nodeReadFileSync(absolute);
  if (hash(bytes) !== expectedSha256) fail(`pinned metadata bytes changed: ${path}`);
  return bytes;
}

function loadFixedManifest() {
  const bytes = readPinnedPhysical(mmTestDmg175HistoryApprovalPath, mmTestDmg175HistoryApprovalSha256);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail('approval role manifest is not JSON'); }
  if (value.schemaVersion !== 1
      || value.artifactType !== 'typed supplemental historical DMG175 approval-reference roles; outside source capsule'
      || value.status !== 'PROPOSED_NOT_INSTALLED_BOUNDED_COMPONENT_ROUTE_EXECUTED'
      || value.sourceSemanticsCertified !== false || value.numericOrGradeApproval !== false || value.nativeQualification !== false
      || value.historicalReplayHead?.commit !== A29 || value.historicalReplayHead?.tree !== A29_TREE
      || value.currentMmSourceEpoch?.commit !== M1 || value.currentMmSourceEpoch?.tree !== M1_TREE
      || value.postSourceRegistryMetadata?.commit !== AC609 || value.postSourceRegistryMetadata?.tree !== AC609_TREE
      || value.postSourceRegistryMetadata?.parentCommit !== M1 || value.postSourceRegistryMetadata?.parentTree !== M1_TREE
      || value.predecessorCoverage?.replayManifestPath !== V6_PATH || value.predecessorCoverage?.replayManifestSha256 !== V6_SHA256
      || value.predecessorCoverage?.replayManifestFileCount !== 2932
      || value.predecessorCoverage?.sourceCapsule?.sha256 !== CAPSULE_SHA256
      || value.predecessorCoverage?.sourceCapsule?.fileCount !== 25 || value.predecessorCoverage?.sourceCapsule?.sourceInputCount !== 21
      || value.predecessorCoverage?.v1RolePaths !== 5 || value.predecessorCoverage?.v2RolePaths !== 12
      || value.predecessorCoverage?.v3RolePaths !== 9 || value.predecessorCoverage?.v4RolePaths !== 1
      || value.predecessorCoverage?.v5RolePaths !== 31
      || value.predecessorCoverage?.fixture?.path !== FIXTURE_PATH || value.predecessorCoverage?.fixture?.sha256 !== FIXTURE_SHA256
      || !Array.isArray(value.roles) || value.roles.length !== 2) fail('fixed lineage, predecessor scope, or exact two-role manifest changed');
  const expected = [
    {role: 'dmg175-source-review-reference', path: 'research/source-audit-batch6-dmg175-source-review.json',
      sha256: '1111c521f9882cac11104df0c3cdc1a2f1da374b3fad79cf4c0490d7d97ffb1c', sizeBytes: 4587,
      pointer: '/sourceProofs/0'},
    {role: 'dmg175-actual-first-full-failure-reference', path: 'research/source-audit-batch6-dmg175-full-node-first-failure-v1.json',
      sha256: '2d4e1f0004e87170c1d4c7e47cf37731d317ea64afd038942842cef4ff3ff6d7', sizeBytes: 6560,
      pointer: '/activatedAfterFirstFullFailure'},
  ];
  for (let i = 0; i < expected.length; i++) {
    const row = value.roles[i], pin = expected[i], evidence = row?.dependencyEvidence;
    if (!row || row.role !== pin.role || row.path !== pin.path || row.sha256 !== pin.sha256 || row.sizeBytes !== pin.sizeBytes
        || row.originCommit !== A29 || row.originTree !== A29_TREE
        || row.sourceEpochMirrorCommit !== M1 || row.sourceEpochMirrorTree !== M1_TREE
        || row.sourceEpochMirrorSha256 !== pin.sha256 || row.sourceEpochMirrorSizeBytes !== pin.sizeBytes
        || row.postSourceRegistryMirrorCommit !== AC609 || row.postSourceRegistryMirrorTree !== AC609_TREE
        || row.postSourceRegistryMirrorSha256 !== pin.sha256 || row.postSourceRegistryMirrorSizeBytes !== pin.sizeBytes
        || !Array.isArray(evidence) || evidence.length !== 1
        || evidence[0].fixturePath !== FIXTURE_PATH || evidence[0].fixtureSha256 !== FIXTURE_SHA256
        || evidence[0].jsonPointer !== pin.pointer || evidence[0].referenceSha256 !== pin.sha256
        || typeof evidence[0].purpose !== 'string' || !evidence[0].purpose.includes('historical')) {
      fail('unknown, duplicate, reordered, changed, or improperly typed historical approval role');
    }
    if (row.path.startsWith('/') || row.path.includes('\\') || row.path.split('/').some(part => !part || part === '.' || part === '..')) {
      fail(`unsafe approval role path: ${row.path}`);
    }
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

export const historicalDmg175HistoryApprovalManifest = deepFreeze(loadFixedManifest());
export const historicalDmg175HistoryApprovalPaths = Object.freeze(
  historicalDmg175HistoryApprovalManifest.roles.map(({role, path}) => Object.freeze({role, path})),
);

function initialize() {
  if (loaded) return;
  assertHistoricalMmTestStage();
  raw.assertView();
  assertHistoricalMmRoleSupplementV5();
  if (historicalMmRoleSupplementV2Paths.length !== 12 || historicalMmTestRoleSupplementV3Paths.length !== 9
      || historicalMmTestRoleSupplementV4Paths.length !== 1 || historicalMmTestRoleSupplementV5Manifest.roles.length !== 31) {
    fail('fixed V1/V2/V3/V4/V5 predecessor role sets required');
  }
  const v6 = JSON.parse(readPinnedPhysical(V6_PATH, V6_SHA256).toString('utf8'));
  if (v6.files?.length !== 2932) fail('fixed V6 replay manifest required');
  const v6Pins = new Map(v6.files.map(row => [row.path, row]));
  const fixturePin = v6Pins.get(FIXTURE_PATH), focusRootPin = v6Pins.get(FOCUS_ROOT_PATH);
  if (!fixturePin || fixturePin.sha256 !== FIXTURE_SHA256 || fixturePin.sizeBytes !== 2908328
      || !focusRootPin || focusRootPin.sha256 !== FOCUS_ROOT_SHA256 || focusRootPin.sizeBytes !== 5162) {
    fail('exact V6 fixture and focus-root approval-reference pins required');
  }
  if (raw.git('rev-parse', `${A29}^{tree}`).toString('utf8').trim() !== A29_TREE
      || raw.git('rev-parse', `${M1}^{tree}`).toString('utf8').trim() !== M1_TREE
      || raw.git('rev-parse', `${AC609}^{tree}`).toString('utf8').trim() !== AC609_TREE) fail('fixed A29/M1/ac609 Git trees changed');
  raw.git('merge-base', '--is-ancestor', M1, A29);
  const parents = raw.git('rev-list', '--parents', '-n', '1', AC609).toString('utf8').trim().split(' ');
  if (parents.length !== 2 || parents[0] !== AC609 || parents[1] !== M1) fail('ac609 approval registry must remain a direct M1 child');

  const predecessorPaths = new Set([
    ...v6.files.map(row => row.path),
    ...historicalMmRoleSupplementV2Paths.map(row => row.path),
    ...historicalMmTestRoleSupplementV3Paths.map(row => row.path),
    ...historicalMmTestRoleSupplementV4Paths.map(row => row.path),
    ...historicalMmTestRoleSupplementV5Manifest.roles.map(row => row.path),
  ]);
  if (historicalDmg175HistoryApprovalManifest.roles.some(row => predecessorPaths.has(row.path))) {
    fail('new DMG175 approval roles must be exactly additive to V6 and V2/V3/V4/V5 roles');
  }

  for (const row of historicalDmg175HistoryApprovalManifest.roles) {
    const origin = raw.git('show', `${A29}:${row.path}`);
    const sourceMirror = raw.git('show', `${M1}:${row.path}`);
    const registryMirror = raw.git('show', `${AC609}:${row.path}`);
    if (origin.length !== row.sizeBytes || hash(origin) !== row.sha256
        || sourceMirror.length !== row.sourceEpochMirrorSizeBytes || hash(sourceMirror) !== row.sourceEpochMirrorSha256 || !origin.equals(sourceMirror)
        || registryMirror.length !== row.postSourceRegistryMirrorSizeBytes || hash(registryMirror) !== row.postSourceRegistryMirrorSha256 || !origin.equals(registryMirror)) {
      fail(`A29/M1/ac609 approval-history bytes differ: ${row.role}`);
    }
  }
  raw.assertView();
  loaded = new Map(historicalDmg175HistoryApprovalManifest.roles.map(row => [row.role, row]));
}

export function assertHistoricalDmg175HistoryApproval() {
  initialize();
  return Object.freeze({
    status: 'verified two exact historical DMG175 approval-reference reads; V6/V1-V5 predecessors unchanged',
    roles: Object.freeze([...loaded.keys()]),
    a29ReplayHead: A29,
    currentMmSourceCommit: M1,
    postSourceRegistryCommit: AC609,
    sourceSemanticsCertified: false,
    numericOrGradeApproval: false,
    nativeQualification: false,
  });
}

export function readHistoricalDmg175HistoryApproval(role) {
  if (typeof role !== 'string' || !historicalDmg175HistoryApprovalManifest.roles.some(row => row.role === role)) fail('unknown approval-reference role');
  initialize();
  const row = loaded.get(role);
  const bytes = raw.git('show', `${A29}:${row.path}`);
  if (bytes.length !== row.sizeBytes || hash(bytes) !== row.sha256) fail(`A29 approval-reference bytes changed: ${row.path}`);
  return Buffer.from(bytes);
}
