// Exact six-path reader for the source state that authored the support-twin
// assertion. It intentionally exposes no arbitrary path or Git command.
import {readFileSync as nodeReadFileSync, lstatSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';

export const uaSupportTwinSnapshotManifestPath = 'research/class-mapping-history-v1/ua-support-twin-snapshot-v1.json';
export const uaSupportTwinSnapshotManifestSha256 = '031153084e041e5d5b1cabb7532ea18c51515e8fda0e115d0c57f8c5491460e5';

const root = realpathSync(resolve(import.meta.dirname, '../..'));
const raw = createRawGitReader(root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ORIGIN_COMMIT = '23ba5dd12a007a759e36d98822eb9040c395eeef';
const ORIGIN_TREE = 'e779c31882a8b90b47178164f53734bbd3e0adf2';
const R7_COMMIT = '5b76ccca0d2df451dbcc7ce22c78d895a2138f45';
const R7_TREE = 'b9f4de0a48842c1989a2fb198eb2eb15270af0ef';
const fail = message => { throw new Error('UA support-twin historical snapshot V1: ' + message); };
const allowed = new Set([
  'tests/helpers/batch6-jo-fixture.mjs',
  'tests/helpers/ua-source-batch6-jo-fixture.mjs',
  'tests/helpers/batch6-xp-source-history.mjs',
  'tests/helpers/ua-source-batch6-xp-source-history.mjs',
  'tests/helpers/dmg74-matrix-batch.mjs',
  'tests/helpers/ua-source-dmg74-matrix-batch.mjs',
]);
let pinned = null;

function initialize() {
  if (pinned) return;
  raw.assertView();
  if (raw.git('rev-parse', ORIGIN_COMMIT + '^{tree}').toString('utf8').trim() !== ORIGIN_TREE
      || raw.git('rev-parse', R7_COMMIT + '^{tree}').toString('utf8').trim() !== R7_TREE) fail('fixed origin/R7 trees changed');
  raw.git('merge-base', '--is-ancestor', ORIGIN_COMMIT, R7_COMMIT);
  const absolute = resolve(root, uaSupportTwinSnapshotManifestPath);
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('snapshot manifest must be a regular physical file');
  const manifestBytes = nodeReadFileSync(absolute);
  if (hash(manifestBytes) !== uaSupportTwinSnapshotManifestSha256) fail('snapshot manifest bytes changed');
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); } catch { fail('snapshot manifest is not JSON'); }
  if (manifest.schemaVersion !== 1 || manifest.artifactType !== 'closed historical source snapshot for pass8 UA support-twin assertions'
      || manifest.sourceSemanticsCertified !== false || manifest.numericOrGradeApproval !== false || manifest.nativeQualification !== false
      || manifest.origin?.commit !== ORIGIN_COMMIT || manifest.origin?.tree !== ORIGIN_TREE
      || manifest.r7SourceUnderTest?.commit !== R7_COMMIT || manifest.r7SourceUnderTest?.tree !== R7_TREE
      || !Array.isArray(manifest.files) || manifest.files.length !== allowed.size) fail('snapshot lineage or exact six-path roster changed');
  if (new Set(manifest.files.map(row => row.path)).size !== allowed.size
      || manifest.files.some(row => !allowed.has(row.path))) fail('unknown or duplicate snapshot path');
  const next = new Map();
  for (const row of manifest.files) {
    const bytes = raw.git('show', ORIGIN_COMMIT + ':' + row.path);
    const blobOid = raw.git('rev-parse', ORIGIN_COMMIT + ':' + row.path).toString('utf8').trim();
    if (!Number.isSafeInteger(row.sizeBytes) || bytes.length !== row.sizeBytes
        || hash(bytes) !== row.sha256 || blobOid !== row.gitBlobOid) fail('origin pin differs: ' + row.path);
    next.set(row.path, Buffer.from(bytes));
  }
  raw.assertView();
  pinned = next;
}

export function readUaSupportTwinAtHistoricalV1(path) {
  if (typeof path !== 'string' || !allowed.has(path)) fail('path is outside the exact six-file snapshot');
  initialize();
  return Buffer.from(pinned.get(path));
}
