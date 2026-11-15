// One closed historical-MM evidence role for the orthogonal continuation
// detector. It extends V3 without widening the V1 25/21 source capsule.
import assert from 'node:assert/strict';
import {readFileSync as nodeReadFileSync, lstatSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {assertHistoricalMmTestStage, historicalMmTestRoot} from './mm-replay-fs-v3.mjs';
import {assertHistoricalMmRoleSupplementV3} from './mm-test-postsource-supplement-v3.mjs';

export const mmContinuationBaselineRoleManifestPath = 'research/class-mapping-history-v1/continuation-baseline-v1/mm-test-role-continuation-baseline-v1.json';
export const mmContinuationBaselineRoleManifestSha256 = 'acf6f846368319136f7d0881fe30048f8a089eb33e2ae63edff1387627f0e3cf';

const root = realpathSync(resolve(import.meta.dirname, '../..'));
if (root !== historicalMmTestRoot) throw new Error('Fixed historical-MM repository root required');
const raw = createRawGitReader(root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const M1 = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
const M1_TREE = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
const A29 = 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2';
const A29_TREE = 'da1c64ea25f178a1155a79c4692964e9b17dd645';
const CAPSULE_PATH = 'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json';
const CAPSULE_SHA256 = '5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003';
const V6_PATH = 'research/class-mapping-history-v1/mm-test-input-manifest-v6.json';
const V6_SHA256 = 'a063dd1910847d94e363f1cee502dfa34fd283ccf2c79f1370bcffe00f886070';
const V2_PATH = 'research/class-mapping-history-v1/mm-test-role-supplement-v2.json';
const V2_SHA256 = 'b8c887c3f75a2ac128c635d7016549df47a372ddc74b7f78d3ab045c3effca12';
const V3_PATH = 'research/class-mapping-history-v1/mm-test-role-supplement-v3.json';
const V3_SHA256 = '27856ec212c1e0d9326572e8fd44b1c261f18db6ca838c6277cd6c42face8235';
const closurePath = 'research/class-mapping-history-v1/continuation-baseline-v1/requested-input-closure-v1.json';
const closureSha256 = 'aad4ae8e99ba47ef637924a30b8e07df6b0165ae21fc72ce79929c6a7ceb1e98';
const expectedRole = Object.freeze({
  role: 'historical-test-evidence-orthogonal-continuation-full',
  path: 'research/source-audit-batch5-continuation-orthogonal-baseline-full.json.gz',
  originCommit: M1,
  originTree: M1_TREE,
  sha256: '03bc04c79d2c8fa86cc853296fb6550ddba65d3600b740b5740cf77cb3a3f643',
  sizeBytes: 1433616,
  mirrorCommit: A29,
  mirrorTree: A29_TREE,
  mirrorSha256: '03bc04c79d2c8fa86cc853296fb6550ddba65d3600b740b5740cf77cb3a3f643',
  mirrorSizeBytes: 1433616,
  classification: 'fixed M1 detector report mirrored unchanged at A29; historical test evidence outside the source capsule',
});
const fail = message => { throw new Error('Historical-MM continuation-baseline supplement V1: ' + message); };
let loaded = null;

function readPinnedPhysical(path, expectedSha256) {
  const absolute = resolve(root, path), stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('manifest must be a regular physical file: ' + path);
  const bytes = nodeReadFileSync(absolute);
  if (hash(bytes) !== expectedSha256) fail('pinned manifest bytes changed: ' + path);
  return bytes;
}

function initialize() {
  if (loaded) return;
  assertHistoricalMmTestStage();
  assertHistoricalMmRoleSupplementV3();
  raw.assertView();
  const manifestBytes = readPinnedPhysical(mmContinuationBaselineRoleManifestPath, mmContinuationBaselineRoleManifestSha256);
  let doc;
  try { doc = JSON.parse(manifestBytes.toString('utf8')); } catch { fail('role manifest is not JSON'); }
  if (doc.schemaVersion !== 1
      || doc.artifactType !== 'typed supplemental exact historical-MM orthogonal continuation report role; not an expansion of the 25/21 source capsule'
      || doc.sourceSemanticsCertified !== false || doc.numericOrGradeApproval !== false || doc.nativeQualification !== false
      || doc.predecessorSupplement?.path !== V3_PATH || doc.predecessorSupplement?.sha256 !== V3_SHA256 || doc.predecessorSupplement?.roleCount !== 9
      || doc.preservedCapsule?.path !== CAPSULE_PATH || doc.preservedCapsule?.sha256 !== CAPSULE_SHA256 || doc.preservedCapsule?.fileCount !== 25 || doc.preservedCapsule?.sourceInputCount !== 21
      || doc.preservedReplayManifest?.path !== V6_PATH || doc.preservedReplayManifest?.sha256 !== V6_SHA256 || doc.preservedReplayManifest?.fileCount !== 2932
      || doc.closedInputInventory?.path !== closurePath || doc.closedInputInventory?.sha256 !== closureSha256
      || doc.lineage?.currentMmSource?.commit !== M1 || doc.lineage?.currentMmSource?.tree !== M1_TREE
      || doc.lineage?.a29Mirror?.commit !== A29 || doc.lineage?.a29Mirror?.tree !== A29_TREE
      || !Array.isArray(doc.roles) || doc.roles.length !== 1
      || JSON.stringify(doc.roles[0]) !== JSON.stringify(expectedRole)) fail('lineage, closure, or exact one-role declaration changed');

  const v2Bytes = readPinnedPhysical(V2_PATH, V2_SHA256);
  const v3Bytes = readPinnedPhysical(V3_PATH, V3_SHA256);
  const v6Bytes = readPinnedPhysical(V6_PATH, V6_SHA256);
  const closureBytes = readPinnedPhysical(closurePath, closureSha256);
  readPinnedPhysical(CAPSULE_PATH, CAPSULE_SHA256);
  const v2 = JSON.parse(v2Bytes.toString('utf8'));
  const v3 = JSON.parse(v3Bytes.toString('utf8'));
  const v6 = JSON.parse(v6Bytes.toString('utf8'));
  let closure;
  try { closure = JSON.parse(closureBytes.toString('utf8')); } catch { fail('closed input inventory is not JSON'); }
  if (closure.schemaVersion !== 1
      || closure.artifactType !== 'closed input inventory for the R7 orthogonal continuation detector test'
      || closure.sourceCommit !== '5b76ccca0d2df451dbcc7ce22c78d895a2138f45'
      || closure.sourceTree !== 'b9f4de0a48842c1989a2fb198eb2eb15270af0ef'
      || !Array.isArray(closure.literalAndDeclaredInputs)
      || !closure.literalAndDeclaredInputs.some(row => row.path === expectedRole.path && row.sha256 === expectedRole.sha256 && row.transport === 'proposed continuation-baseline V1 exact typed role')) fail('closed input inventory does not declare the exact missing report role');
  if (v2.files?.length !== 12 || v3.roles?.length !== 9 || v6.files?.length !== 2932) fail('predecessor role/file roster changed');
  const priorPaths = new Set([...v2.files.map(row => row.path), ...v3.roles.map(row => row.path), ...v6.files.map(row => row.path)]);
  if (priorPaths.has(expectedRole.path)) fail('new role duplicates an existing V6/V2/V3 path');

  if (raw.git('rev-parse', M1 + '^{tree}').toString('utf8').trim() !== M1_TREE
      || raw.git('rev-parse', A29 + '^{tree}').toString('utf8').trim() !== A29_TREE) fail('fixed M1/A29 source trees changed');
  const origin = raw.git('show', M1 + ':' + expectedRole.path);
  const mirror = raw.git('show', A29 + ':' + expectedRole.path);
  if (origin.length !== expectedRole.sizeBytes || hash(origin) !== expectedRole.sha256) fail('M1-origin report bytes differ');
  if (mirror.length !== expectedRole.mirrorSizeBytes || hash(mirror) !== expectedRole.mirrorSha256) fail('A29-mirror report bytes differ');
  if (!origin.equals(mirror)) fail('A29 artifact is not byte-identical to its M1 origin');
  raw.assertView();
  loaded = Buffer.from(origin);
}

export function assertHistoricalMmContinuationBaselineRoleV1() {
  initialize();
  return Object.freeze({status: 'verified one exact M1-origin/A29-mirror orthogonal report role; V6/V2/V3 and 25/21 capsule retained', role: expectedRole.role, originCommit: M1, mirrorCommit: A29, sourceSemanticsCertified: false, numericOrGradeApproval: false, nativeQualification: false});
}

export function historicalMmContinuationBaselineRoleV1Paths() {
  return Object.freeze([Object.freeze({role: expectedRole.role, path: expectedRole.path})]);
}

export function readHistoricalMmContinuationBaselineRoleV1(role) {
  if (typeof role !== 'string' || role !== expectedRole.role) fail('unknown role');
  initialize();
  return Buffer.from(loaded);
}
