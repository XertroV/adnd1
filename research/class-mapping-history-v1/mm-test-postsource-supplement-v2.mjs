// Exact role-based reads for MM test metadata/evidence omitted from the old
// 25/21 source capsule and v6 caller manifest. These are not current S1 files.
import {readFileSync as nodeReadFileSync, realpathSync, lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {assertHistoricalMmTestStage, historicalMmTestRoot} from './mm-replay-fs-v1.mjs';

export const mmTestRoleSupplementV2Path = 'research/class-mapping-history-v1/mm-test-role-supplement-v2.json';
export const mmTestRoleSupplementV2Sha256 = 'b8c887c3f75a2ac128c635d7016549df47a372ddc74b7f78d3ab045c3effca12';

const root = realpathSync(resolve(import.meta.dirname, '../..'));
if (root !== historicalMmTestRoot) throw new Error('Fixed historical-MM repository root required');
const raw = createRawGitReader(root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const M1 = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
const M1_TREE = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
const A29 = 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2';
const A29_TREE = 'da1c64ea25f178a1155a79c4692964e9b17dd645';
const REGISTRY = 'ac60970626fd5e0421fc4b99c141cc11f53ffff3';
const REGISTRY_TREE = '617b73d3d6db32d9406309dececcaa2eeb708568';
const expected = new Map([
  ['post-source-metadata-native-monetary-contract', {
    path: 'research/mm-current-cli-successors-v1/native-monetary-question-contract-mm-v1.json',
    originCommit: REGISTRY, originTree: REGISTRY_TREE,
    sha256: 'ea2d5e14901c2a9c91265bc8093f786bd434e898c9da8257887719ae01f5452d', sizeBytes: 61246,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {parentCommit: M1, parentTree: M1_TREE, classification: 'added after the MM source snapshot as registry metadata'},
  }],
  ['version29-projection-baseline-metadata', {
    path: 'research/hirelings-current-next-batch-v1/native-monetary-successor-v2/version29-monetary-questions-actual-projection-baseline-v2.json',
    originCommit: M1, originTree: M1_TREE,
    sha256: 'c220e9a5d4ef6d53d671df0ecf947fc7f8150a0c71b2dafc610f590e70b3eda6', sizeBytes: 42966,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {classification: 'comparison baseline artifact in the MM snapshot; not a raw source-body input'},
  }],
  ['historical-test-evidence-continuation-alias-before', {
    path: 'tests/fixtures/continuation-manifest-before-legacy-alias.json.gz',
    originCommit: A29, originTree: A29_TREE,
    sha256: '3288c21f162493bd040b41305ca71de01fe15cc7451ed43eba9ba15d10e19ab8', sizeBytes: 40868,
  }],
  ['historical-test-evidence-source-report-consistency-before', {
    path: 'tests/fixtures/source-report-consistency-ae5195a-before.json.gz',
    originCommit: A29, originTree: A29_TREE,
    sha256: '9b8790958c9747b0edcbdf57bc5ca30dfbed6e630b9a0af492f9b0de37fa39ab', sizeBytes: 194406,
  }],
  ['historical-test-evidence-source-frame-systemic-before', {
    path: 'tests/fixtures/source-frame-systemic-visual-caller-before.json.gz',
    originCommit: A29, originTree: A29_TREE,
    sha256: 'dfb555443634502c86bf53f53a0f2c9deff27b3761e21c04ba7970cd1f973b50', sizeBytes: 23901,
  }],
  ['historical-test-evidence-orthogonal-continuation-baseline', {
    path: 'research/source-audit-batch5-continuation-orthogonal-baseline-summary.json',
    originCommit: M1, originTree: M1_TREE,
    sha256: 'ca0ca5b9f8b2460b70167461eeff2948c52c21dfd9f856942fbc799915f96f90', sizeBytes: 1138473,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {classification: 'fixed M1 repository metadata used as historical test evidence; outside the preserved 25/21 source capsule'},
  }],
  ['historical-test-evidence-pass8-content-repair-independent-review', {
    path: 'research/source-audit-pass8-content-repair-independent-review.json',
    originCommit: M1, originTree: M1_TREE,
    sha256: '0b668fe48de26533b9ce0570c90d54089641cfb3cdf2618523a5ea96c4a36f91', sizeBytes: 13951,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {classification: 'fixed M1 repository metadata used as historical test evidence; outside the preserved 25/21 source capsule'},
  }],
  ['historical-test-evidence-source-completeness-phb', {
    path: 'research/source-completeness-phb.json', originCommit: M1, originTree: M1_TREE,
    sha256: '2a8bcf30c39138ea92b36d7c70b7103a82afbaafff221fd1a253306e5adf9e03', sizeBytes: 340442,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {classification: 'fixed M1 repository metadata used as historical test evidence; outside the preserved 25/21 source capsule'},
  }],
  ['historical-test-evidence-source-completeness-dmg', {
    path: 'research/source-completeness-dmg.json', originCommit: M1, originTree: M1_TREE,
    sha256: 'aa2a54b141bcf3813edd5545d29f0b96d5d6aa25a4404a291463235bc991bc84', sizeBytes: 307487,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {classification: 'fixed M1 repository metadata used as historical test evidence; outside the preserved 25/21 source capsule'},
  }],
  ['historical-test-evidence-source-completeness-ua', {
    path: 'research/source-completeness-ua.json', originCommit: M1, originTree: M1_TREE,
    sha256: 'd19143fb4686e6f7069492bf391e2c9884a0cf5d80a8e1b17d72ec9c5198953f', sizeBytes: 161444,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {classification: 'fixed M1 repository metadata used as historical test evidence; outside the preserved 25/21 source capsule'},
  }],
  ['historical-test-evidence-source-completeness-mm', {
    path: 'research/source-completeness-mm.json', originCommit: M1, originTree: M1_TREE,
    sha256: '0f319cf99cc9ef207df052551dafd77519b7190d04c603de691766bf1ed29be3', sizeBytes: 876105,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {classification: 'fixed M1 repository metadata used as historical test evidence; outside the preserved 25/21 source capsule'},
  }],
  ['historical-test-evidence-source-completeness-mm2', {
    path: 'research/source-completeness-mm2.json', originCommit: M1, originTree: M1_TREE,
    sha256: '220049803ccc80810f6e97ca9af5a78ef48e57d144f92dc3b05ee0aa1f403b2e', sizeBytes: 151802,
    mirrorCommit: A29, mirrorTree: A29_TREE,
    originRelation: {classification: 'fixed M1 repository metadata used as historical test evidence; outside the preserved 25/21 source capsule'},
  }],
]);
export const historicalMmRoleSupplementV2Paths = Object.freeze(
  [...expected.entries()].map(([role, pin]) => Object.freeze({role, path: pin.path})),
);

let loaded = null;
const fail = message => { throw new Error(`Historical-MM typed supplement V2: ${message}`); };

const V1_MANIFEST_PATH = 'research/class-mapping-history-v1/mm-test-role-supplement-v1.json';
const V1_HELPER_PATH = 'research/class-mapping-history-v1/mm-test-postsource-supplement-v1.mjs';
const CAPSULE_PATH = 'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json';
const REPLAY_MANIFEST_PATH = 'research/class-mapping-history-v1/mm-test-input-manifest-v6.json';
const V1_MANIFEST_SHA256 = '150944e77a18872b35d799d8b1701491a333ff9064a496231e6228de50495393';
const V1_HELPER_SHA256 = '7da9d09a1f49da2e026d7f4766a0a680db2a57b185df9006c1f26bb1dc40fdd0';
const CAPSULE_SHA256 = '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003';
const REPLAY_MANIFEST_SHA256 = 'a063dd1910847d94e363f1cee502dfa34fd283ccf2c79f1370bcffe00f886070';
const V1_EXPECTED_ARTIFACT_TYPE = 'typed supplemental historical-MM replay metadata and test-evidence inputs';
const V1_ACTUAL_ARTIFACT_TYPE = 'typed supplemental historical-MM replay metadata and test-evidence inputs; not an expansion of the 25/21 source capsule';

function readPinnedPhysical(path, expectedSha256) {
  const absolute = resolve(root, path), stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`pinned historical manifest must be a regular physical file: ${path}`);
  const bytes = nodeReadFileSync(absolute);
  if (hash(bytes) !== expectedSha256) fail(`pinned historical manifest bytes changed: ${path}`);
  return bytes;
}

function fixedManifest() {
  const path = resolve(root, mmTestRoleSupplementV2Path);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('manifest must be a regular physical file');
  const bytes = nodeReadFileSync(path);
  if (hash(bytes) !== mmTestRoleSupplementV2Sha256) fail('supplement manifest hash changed');
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail('supplement manifest is not JSON'); }
  if (value.schemaVersion !== 2
      || value.artifactType !== 'typed supplemental historical-MM replay metadata and test-evidence inputs; not an expansion of the 25/21 source capsule'
      || value.sourceSemanticsCertified !== false
      || value.numericOrGradeApproval !== false
      || value.nativeQualification !== false
      || value.predecessorSupplement?.path !== 'research/class-mapping-history-v1/mm-test-role-supplement-v1.json'
      || value.predecessorSupplement?.sha256 !== '150944e77a18872b35d799d8b1701491a333ff9064a496231e6228de50495393'
      || value.predecessorSupplement?.fileCount !== 5
      || value.knownPredecessorValidatorMismatch?.validatorPath !== V1_HELPER_PATH
      || value.knownPredecessorValidatorMismatch?.validatorSha256 !== V1_HELPER_SHA256
      || value.knownPredecessorValidatorMismatch?.manifestPath !== V1_MANIFEST_PATH
      || value.knownPredecessorValidatorMismatch?.manifestSha256 !== V1_MANIFEST_SHA256
      || value.knownPredecessorValidatorMismatch?.validatorExpectedArtifactType !== V1_EXPECTED_ARTIFACT_TYPE
      || value.knownPredecessorValidatorMismatch?.manifestActualArtifactType !== V1_ACTUAL_ARTIFACT_TYPE
      || value.preservedCapsule?.path !== 'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json'
      || value.preservedCapsule?.sha256 !== '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003'
      || value.preservedCapsule?.fileCount !== 25 || value.preservedCapsule?.sourceInputCount !== 21
      || value.preservedReplayManifest?.path !== 'research/class-mapping-history-v1/mm-test-input-manifest-v6.json'
      || value.preservedReplayManifest?.sha256 !== 'a063dd1910847d94e363f1cee502dfa34fd283ccf2c79f1370bcffe00f886070'
      || value.preservedReplayManifest?.fileCount !== 2932
      || value.epochs?.currentMmSource?.commit !== M1 || value.epochs?.currentMmSource?.tree !== M1_TREE
      || value.epochs?.postSourceRegistryMetadata?.commit !== REGISTRY
      || value.epochs?.postSourceRegistryMetadata?.tree !== REGISTRY_TREE
      || value.epochs?.postSourceRegistryMetadata?.parentCommit !== M1
      || value.epochs?.postSourceRegistryMetadata?.parentTree !== M1_TREE
      || value.epochs?.fullA29ReplayHead?.commit !== A29 || value.epochs?.fullA29ReplayHead?.tree !== A29_TREE
      || !Array.isArray(value.files) || value.files.length !== expected.size) fail('fixed capsule lineage or twelve typed roles changed');
  const actual = new Map();
  for (const row of value.files) {
    if (!row || typeof row !== 'object' || typeof row.role !== 'string' || actual.has(row.role)) fail('duplicate or malformed supplement role');
    actual.set(row.role, row);
  }
  if (actual.size !== expected.size) fail('unknown supplement role');
  for (const [role, pin] of expected) {
    const row = actual.get(role);
    if (!row || row.path !== pin.path || row.originCommit !== pin.originCommit
        || row.originTree !== pin.originTree || row.sha256 !== pin.sha256 || row.sizeBytes !== pin.sizeBytes
        || (pin.originRelation && JSON.stringify(row.originRelation) !== JSON.stringify(pin.originRelation))
        || (!pin.originRelation && Object.hasOwn(row, 'originRelation'))
        || (pin.mirrorCommit && (row.a29MirrorCommit !== pin.mirrorCommit || row.a29MirrorTree !== pin.mirrorTree
          || row.a29MirrorSha256 !== pin.sha256 || row.a29MirrorSizeBytes !== pin.sizeBytes))) fail(`role pin differs: ${role}`);
  }
  return value;
}

function initialize() {
  if (loaded) return;
  assertHistoricalMmTestStage();
  raw.assertView();
  const manifest = fixedManifest();
  const predecessorBytes = readPinnedPhysical(V1_MANIFEST_PATH, V1_MANIFEST_SHA256);
  const predecessorHelperBytes = readPinnedPhysical(V1_HELPER_PATH, V1_HELPER_SHA256);
  readPinnedPhysical(CAPSULE_PATH, CAPSULE_SHA256);
  readPinnedPhysical(REPLAY_MANIFEST_PATH, REPLAY_MANIFEST_SHA256);
  const predecessor = JSON.parse(predecessorBytes.toString('utf8'));
  if (predecessor.artifactType !== V1_ACTUAL_ARTIFACT_TYPE
      || !predecessorHelperBytes.toString('utf8').includes(`value.artifactType !== '${V1_EXPECTED_ARTIFACT_TYPE}'`)) fail('known V1 predecessor validator mismatch evidence changed');
  if (raw.git('rev-parse', `${M1}^{tree}`).toString('utf8').trim() !== M1_TREE
      || raw.git('rev-parse', `${A29}^{tree}`).toString('utf8').trim() !== A29_TREE
      || raw.git('rev-parse', `${REGISTRY}^{tree}`).toString('utf8').trim() !== REGISTRY_TREE) fail('fixed Git trees changed');
  const parentLine = raw.git('rev-list', '--parents', '-n', '1', REGISTRY).toString('utf8').trim().split(' ');
  if (parentLine.length !== 2 || parentLine[0] !== REGISTRY || parentLine[1] !== M1) fail('registry is no longer a direct post-source child');
  const contractPath = expected.get('post-source-metadata-native-monetary-contract').path;
  try {
    raw.git('cat-file', '-e', `${M1}:${contractPath}`);
    fail('post-source contract unexpectedly exists at the MM source commit');
  } catch (error) {
    if (String(error?.message || '').includes('post-source contract unexpectedly')) throw error;
    if (!Number.isInteger(error?.status) || error.status === 0) fail('could not verify contract absence at the MM source commit');
  }
  const bytesByRole = new Map();
  for (const [role, pin] of expected) {
    const bytes = raw.git('show', `${pin.originCommit}:${pin.path}`);
    if (bytes.length !== pin.sizeBytes || hash(bytes) !== pin.sha256) fail(`origin bytes differ: ${role}`);
    if (pin.mirrorCommit) {
      if (raw.git('rev-parse', `${pin.mirrorCommit}^{tree}`).toString('utf8').trim() !== pin.mirrorTree) fail(`mirror tree changed: ${role}`);
      const mirror = raw.git('show', `${pin.mirrorCommit}:${pin.path}`);
      if (mirror.length !== bytes.length || hash(mirror) !== pin.sha256 || !mirror.equals(bytes)) fail(`a29 mirror differs: ${role}`);
    }
    bytesByRole.set(role, Buffer.from(bytes));
  }
  raw.assertView();
  loaded = {manifest, bytesByRole};
}

export function assertHistoricalMmRoleSupplementV2() {
  initialize();
  return Object.freeze({
    status: 'verified twelve fixed historical-MM auxiliary roles; original 25/21 capsule unchanged',
    roles: [...expected.keys()],
    currentMmSourceCommit: M1,
    postSourceRegistryCommit: REGISTRY,
    a29ReplayHead: A29,
    sourceSemanticsCertified: false,
    predecessorV1ValidatorInvoked: false,
    predecessorV1ArtifactTypeMismatch: true,
  });
}

// Fixed role names only; no caller path, fallback, or generic repository read.
export function readHistoricalMmRoleSupplementV2(role) {
  if (typeof role !== 'string' || !expected.has(role)) fail('unknown role');
  initialize();
  return Buffer.from(loaded.bytesByRole.get(role));
}
