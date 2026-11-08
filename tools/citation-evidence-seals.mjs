import {createHash} from 'node:crypto';
import {readFileSync, realpathSync, statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ARTIFACT_TYPE = 'append-only-citation-evidence-seals';
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;

function assertAllowedRelativePath(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || isAbsolute(value)) {
    throw new Error(`${label} must be a normalized repository-relative path.`);
  }
  const parts = value.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error(`${label} must not contain empty, dot, or traversal path segments.`);
  }
  if (!(value.startsWith('research/') || value.startsWith('tests/fixtures/'))) {
    throw new Error(`${label} must be under research/ or tests/fixtures/.`);
  }
  return value;
}

function readRepoFile(repoRoot, relativePath, label) {
  assertAllowedRelativePath(relativePath, label);
  const root = realpathSync(repoRoot);
  const candidate = resolve(root, ...relativePath.split('/'));
  const lexicalRelative = relative(root, candidate);
  if (!lexicalRelative || lexicalRelative === '..' || lexicalRelative.startsWith(`..${sep}`) || isAbsolute(lexicalRelative)) {
    throw new Error(`${label} resolves outside the repository.`);
  }
  let realPath;
  try {
    realPath = realpathSync(candidate);
  } catch (error) {
    throw new Error(`${label} is missing or unreadable: ${relativePath} (${error.message})`);
  }
  const realRelative = relative(root, realPath).split(sep).join('/');
  if (!realRelative || realRelative === '..' || realRelative.startsWith('../') || !(realRelative.startsWith('research/') || realRelative.startsWith('tests/fixtures/'))) {
    throw new Error(`${label} resolves outside the permitted research/ and tests/fixtures/ trees.`);
  }
  const stat = statSync(realPath);
  if (!stat.isFile()) throw new Error(`${label} must resolve to a regular file: ${relativePath}`);
  return readFileSync(realPath);
}

function parseManifest(bytes, label) {
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error(`${label} must be a JSON object.`);
  if (manifest.schemaVersion !== 1) throw new Error(`${label} must use schemaVersion 1.`);
  if (manifest.artifactType !== ARTIFACT_TYPE) throw new Error(`${label} must have artifactType "${ARTIFACT_TYPE}".`);
  if (!Array.isArray(manifest.seals)) throw new Error(`${label} must contain a seals array.`);
  const manifestKeys = Object.keys(manifest).sort();
  if (manifestKeys.join('|') !== 'artifactType|schemaVersion|seals') throw new Error(`${label} contains unsupported top-level fields.`);

  const ids = new Set(), paths = new Set();
  for (const [index, seal] of manifest.seals.entries()) {
    const location = `${label} seals[${index}]`;
    if (!seal || typeof seal !== 'object' || Array.isArray(seal)) throw new Error(`${location} must be an object.`);
    const keys = Object.keys(seal).sort();
    if (keys.join('|') !== 'id|path|sha256|sizeBytes') throw new Error(`${location} must contain exactly id, path, sha256, and sizeBytes.`);
    if (typeof seal.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(seal.id)) throw new Error(`${location}.id is missing or malformed.`);
    assertAllowedRelativePath(seal.path, `${location}.path`);
    if (!SHA256_PATTERN.test(seal.sha256 ?? '')) throw new Error(`${location}.sha256 must be a lowercase 64-character SHA-256 digest.`);
    if (!Number.isSafeInteger(seal.sizeBytes) || seal.sizeBytes < 0) throw new Error(`${location}.sizeBytes must be a non-negative safe integer.`);
    if (ids.has(seal.id)) throw new Error(`${label} has duplicate seal id ${seal.id}.`);
    if (paths.has(seal.path)) throw new Error(`${label} has duplicate seal path ${seal.path}; new evidence versions need new paths.`);
    ids.add(seal.id);
    paths.add(seal.path);
  }
  return manifest;
}

function validateCurrentSeals(manifest, repoRoot, manifestPath) {
  for (const [index, seal] of manifest.seals.entries()) {
    const bytes = readRepoFile(repoRoot, seal.path, `seal ${seal.id} path`);
    const actualSha = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== seal.sizeBytes) {
      throw new Error(`seal ${seal.id} size mismatch: manifest has ${seal.sizeBytes}, file has ${bytes.length} bytes.`);
    }
    if (actualSha !== seal.sha256) {
      throw new Error(`seal ${seal.id} SHA-256 mismatch: manifest has ${seal.sha256}, file has ${actualSha}.`);
    }
  }
  return manifestPath;
}

function baselineManifestBytes(repoRoot, baselineRef, manifestPath) {
  if (!COMMIT_PATTERN.test(baselineRef ?? '')) throw new Error('--baseline-ref must be a full 40- or 64-character Git commit SHA.');
  let commit;
  try {
    commit = execFileSync('git', ['rev-parse', '--verify', `${baselineRef}^{commit}`], {cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  } catch (error) {
    throw new Error(`Unable to resolve baseline Git commit ${baselineRef}: ${String(error.stderr || error.message).trim()}`);
  }
  let treeEntry;
  try {
    treeEntry = execFileSync('git', ['ls-tree', '-z', commit, '--', manifestPath], {cwd: repoRoot, encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe']});
  } catch (error) {
    throw new Error(`Unable to inspect baseline Git tree ${commit}: ${String(error.stderr || error.message).trim()}`);
  }
  const entries = treeEntry.toString('utf8').split('\0').filter(Boolean);
  if (!entries.length) return {commit, found: false, bytes: null};
  if (entries.length !== 1) throw new Error(`Baseline Git tree has an ambiguous manifest path: ${manifestPath}`);
  const [metadata, recordedPath] = entries[0].split('\t');
  const [, type] = metadata.split(' ');
  if (recordedPath !== manifestPath || type !== 'blob') throw new Error(`Baseline Git path is not a manifest file: ${manifestPath}`);
  try {
    const bytes = execFileSync('git', ['show', `${commit}:${manifestPath}`], {cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe']});
    return {commit, found: true, bytes};
  } catch (error) {
    throw new Error(`Unable to read baseline manifest ${manifestPath} from ${commit}: ${String(error.stderr || error.message).trim()}`);
  }
}

function compareAppendOnly(current, previous) {
  if (current.seals.length < previous.seals.length) {
    throw new Error(`Append-only seal violation: current manifest has ${current.seals.length} entries; baseline has ${previous.seals.length}.`);
  }
  for (let index = 0; index < previous.seals.length; index++) {
    const before = previous.seals[index], after = current.seals[index];
    if (before.id !== after.id || before.path !== after.path || before.sha256 !== after.sha256 || before.sizeBytes !== after.sizeBytes) {
      throw new Error(`Append-only seal violation at index ${index}: prior entries must remain an unchanged ordered prefix; add revised evidence at a new path.`);
    }
  }
  return previous.seals.length;
}

/** Validate current sealed files and, when requested, preserve a Git baseline manifest as an immutable prefix. */
export function validateCitationEvidenceSeals({repoRoot = REPO_ROOT, manifestPath, baselineRef = null} = {}) {
  if (!manifestPath) throw new Error('A --manifest path is required.');
  assertAllowedRelativePath(manifestPath, 'manifest path');
  const currentBytes = readRepoFile(repoRoot, manifestPath, 'manifest path');
  const current = parseManifest(currentBytes, 'Current evidence seal manifest');
  validateCurrentSeals(current, repoRoot, manifestPath);

  if (baselineRef === null || baselineRef === undefined) {
    return {status: 'validated', manifestPath, sealCount: current.seals.length, baselineStatus: 'not-requested', baselineRef: null, priorSealCount: null, newSealCount: null, appendOnlyPrefixPreserved: null};
  }
  const baseline = baselineManifestBytes(repoRoot, baselineRef, manifestPath);
  if (!baseline.found) {
    return {status: 'initial-capture', manifestPath, sealCount: current.seals.length, baselineStatus: 'manifest-absent-at-baseline', baselineRef, baselineCommit: baseline.commit, priorSealCount: null, newSealCount: current.seals.length, appendOnlyPrefixPreserved: null};
  }
  const previous = parseManifest(baseline.bytes, `Baseline evidence seal manifest at ${baseline.commit}`);
  const priorSealCount = compareAppendOnly(current, previous);
  return {status: 'validated', manifestPath, sealCount: current.seals.length, baselineStatus: 'append-only-prefix-preserved', baselineRef, baselineCommit: baseline.commit, priorSealCount, newSealCount: current.seals.length - priorSealCount, appendOnlyPrefixPreserved: true};
}

function parseCli(argv) {
  const options = {check: false, manifestPath: null, baselineRef: null, repoRoot: REPO_ROOT, help: false};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--check') options.check = true;
    else if (['--manifest', '--baseline-ref', '--repo-root'].includes(arg)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
      if (arg === '--manifest') options.manifestPath = value;
      else if (arg === '--baseline-ref') options.baselineRef = value;
      else options.repoRoot = resolve(value);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.help && (!options.check || !options.manifestPath)) throw new Error('--check and --manifest <path> are required.');
  return options;
}

export function runCitationEvidenceSealsCli(argv) {
  let options;
  try { options = parseCli(argv); }
  catch (error) {
    process.stderr.write(`${error.message}\nUsage: node tools/citation-evidence-seals.mjs --check --manifest <research/path.json> [--baseline-ref <GitSHA>] [--repo-root <dir>]\n`);
    return 2;
  }
  if (options.help) {
    process.stdout.write('Usage: node tools/citation-evidence-seals.mjs --check --manifest <research/path.json> [--baseline-ref <GitSHA>] [--repo-root <dir>]\n');
    return 0;
  }
  try {
    const result = validateCitationEvidenceSeals(options);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = runCitationEvidenceSealsCli(process.argv.slice(2));
}
