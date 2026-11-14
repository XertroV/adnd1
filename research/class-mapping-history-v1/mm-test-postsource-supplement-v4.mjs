// Exact one-role supplement for the historical MM test filesystem.
// Install beside mm-test-postsource-supplement-v3.mjs in the project.
import {readFileSync as nodeReadFileSync, lstatSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {assertHistoricalMmTestStage, historicalMmTestRoot} from './mm-replay-fs-v3.mjs';
import {assertHistoricalMmRoleSupplementV3} from './mm-test-postsource-supplement-v3.mjs';

export const mmTestRoleSupplementV4Path = 'research/class-mapping-history-v1/mm-test-role-supplement-v4.json';
export const mmTestRoleSupplementV4Sha256 = '517f8b522abe7da2261f5f03cfdc2d2aa848905ea20fed148755d6067bdbafe4';
export const historicalMmTestRoleSupplementV4Paths = Object.freeze([
  Object.freeze({role: 'historical-test-code-dmg175-current-monetary-source-questions', path: 'tools/dmg175-current-monetary-source-questions-v1.mjs'}),
]);

const root = realpathSync(resolve(import.meta.dirname, '../..'));
if (root !== historicalMmTestRoot) throw new Error('Fixed historical-MM repository root required');
const raw = createRawGitReader(root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const A29 = 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2';
const A29_TREE = 'da1c64ea25f178a1155a79c4692964e9b17dd645';
const M1 = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
const M1_TREE = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
const ROLE = 'historical-test-code-dmg175-current-monetary-source-questions';
const PATH = 'tools/dmg175-current-monetary-source-questions-v1.mjs';
const ROLE_SHA256 = 'b234e164e14218be1e130554016e51d36dd685bccb18ae40f5bc5c01e7ee0139';
const ROLE_SIZE = 26939;
let loaded = null;
const fail = message => { throw new Error(`Historical-MM test-code supplement V4: ${message}`); };

function readPinnedPhysical(path, expectedSha256) {
  const absolute = resolve(root, path), stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`manifest must be a regular physical file: ${path}`);
  const bytes = nodeReadFileSync(absolute);
  if (hash(bytes) !== expectedSha256) fail(`manifest bytes changed: ${path}`);
  return bytes;
}

function initialize() {
  if (loaded) return;
  assertHistoricalMmTestStage();
  raw.assertView();
  const predecessor = assertHistoricalMmRoleSupplementV3();
  if (predecessor?.roles?.length !== 9 || predecessor?.a29ReplayHead !== A29
      || predecessor?.sourceSemanticsCertified !== false || predecessor?.numericOrGradeApproval !== false
      || predecessor?.nativeQualification !== false) fail('exact V3 predecessor role closure required');
  const ownBytes = readPinnedPhysical(mmTestRoleSupplementV4Path, mmTestRoleSupplementV4Sha256);
  let doc;
  try { doc = JSON.parse(ownBytes.toString('utf8')); } catch { fail('V4 role manifest is not JSON'); }
  const expected = {
    schemaVersion: 4,
    artifactType: 'typed supplemental historical-MM test-code role; outside the immutable 25/21 source capsule',
    status: 'PROPOSED_NOT_INSTALLED_NOT_EXECUTED',
    sourceSemanticsCertified: false,
    numericOrGradeApproval: false,
    nativeQualification: false,
    predecessorSupplement: {path: 'research/class-mapping-history-v1/mm-test-role-supplement-v3.json', sha256: '27856ec212c1e0d9326572e8fd44b1c261f18db6ca838c6277cd6c42face8235', roleCount: 9},
    preservedV2: {path: 'research/class-mapping-history-v1/mm-test-role-supplement-v2.json', sha256: 'b8c887c3f75a2ac128c635d7016549df47a372ddc74b7f78d3ab045c3effca12', roleCount: 12},
    preservedCapsule: {path: 'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json', sha256: '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003', fileCount: 25, sourceInputCount: 21},
    preservedReplayManifest: {path: 'research/class-mapping-history-v1/mm-test-input-manifest-v6.json', sha256: 'a063dd1910847d94e363f1cee502dfa34fd283ccf2c79f1370bcffe00f886070', fileCount: 2932},
    historicalReplayHead: {commit: A29, tree: A29_TREE},
    currentMmSourceEpoch: {commit: M1, tree: M1_TREE},
    roles: [{role: ROLE, path: PATH, originCommit: A29, originTree: A29_TREE, sha256: ROLE_SHA256, sizeBytes: ROLE_SIZE,
      sourceEpochMirrorCommit: M1, sourceEpochMirrorTree: M1_TREE, sourceEpochMirrorSha256: ROLE_SHA256,
      sourceEpochMirrorSizeBytes: ROLE_SIZE,
      classification: 'historical test-code dependency; byte-identical at A29 and M1; not a source-capsule body input'}],
  };
  for (const [key, value] of Object.entries(expected)) {
    if (JSON.stringify(doc[key]) !== JSON.stringify(value)) fail(`fixed V4 field changed: ${key}`);
  }
  const v3Bytes = readPinnedPhysical('research/class-mapping-history-v1/mm-test-role-supplement-v3.json', expected.predecessorSupplement.sha256);
  const v2Bytes = readPinnedPhysical(expected.preservedV2.path, expected.preservedV2.sha256);
  const capsuleBytes = readPinnedPhysical(expected.preservedCapsule.path, expected.preservedCapsule.sha256);
  const v6Bytes = readPinnedPhysical(expected.preservedReplayManifest.path, expected.preservedReplayManifest.sha256);
  if (!v3Bytes.length || !v2Bytes.length || !capsuleBytes.length || !v6Bytes.length) fail('predecessor closure is empty');
  const v6 = JSON.parse(v6Bytes.toString('utf8'));
  const v2 = JSON.parse(v2Bytes.toString('utf8'));
  const v3 = JSON.parse(v3Bytes.toString('utf8'));
  if (v6.files?.length !== 2932 || v2.files?.length !== 12 || v3.roles?.length !== 9
      || v6.files.some(row => row.path === PATH)
      || v2.files.some(row => row.path === PATH)
      || v3.roles.some(row => row.path === PATH)) fail('V4 role must be exactly one path absent from all preserved predecessor role sets');
  if (raw.git('rev-parse', `${A29}^{tree}`).toString('utf8').trim() !== A29_TREE
      || raw.git('rev-parse', `${M1}^{tree}`).toString('utf8').trim() !== M1_TREE) fail('fixed A29/M1 Git trees changed');
  raw.git('merge-base', '--is-ancestor', M1, A29);
  const a29Bytes = raw.git('show', `${A29}:${PATH}`);
  const m1Bytes = raw.git('show', `${M1}:${PATH}`);
  if (a29Bytes.length !== ROLE_SIZE || m1Bytes.length !== ROLE_SIZE
      || hash(a29Bytes) !== ROLE_SHA256 || hash(m1Bytes) !== ROLE_SHA256 || !a29Bytes.equals(m1Bytes)) {
    fail('A29 origin and M1 source-epoch mirror bytes do not match the pinned role');
  }
  raw.assertView();
  loaded = Buffer.from(a29Bytes);
}

export function assertHistoricalMmRoleSupplementV4() {
  initialize();
  return Object.freeze({status: 'verified one exact A29 historical-MM test-code role with byte-identical M1 mirror',
    roles: [ROLE], a29ReplayHead: A29, currentMmSourceCommit: M1,
    sourceSemanticsCertified: false, numericOrGradeApproval: false, nativeQualification: false});
}

export function readHistoricalMmRoleSupplementV4(role) {
  if (role !== ROLE) fail('unknown role');
  initialize();
  return Buffer.from(loaded);
}
