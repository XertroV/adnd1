// Exact a29 current-MM CLI adapter for the preserved alias test callsite.
// Only the fixed --check invocation is executed; all inputs come from the
// finite M1 Git manifest and are staged in an owned temporary directory.
import * as fs from 'node:fs';
import {execFileSync as spawnNode} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {createRawGitReader, controlledGitEnvironment} from '../../../tools/class-mapping-raw-git-v1.mjs';
import {historicalMmTestRoot, assertHistoricalMmTestStage, mkdtempSync, mkdirSync, writeFileSync, rmSync, assertHistoricalMmPrivateTempRoot} from '../mm-replay-fs-v1.mjs';
import {detachedArgv, detachedChildOptions, plainRepoPath} from '../mm-replay-io-contract-v1.mjs';

const root = historicalMmTestRoot;
const manifestPath = 'research/class-mapping-history-v1/mm-current-alias-cli-input-manifest-v1.json';
const manifestSha256 = '2757c2061ca90a2aa126338ca809752866aecd577ecbd71ceaa8335c4a0f0535';
const sourceCommit = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
const sourceTree = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
const expectedCounts = Object.freeze({records: 1064, referencedCatalogs: 1084, catalogRegionRows: 4114, declaredGroups: 284, declaredParts: 560});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = createRawGitReader(root);
let verifiedManifest;
const fail = message => { throw new Error(`Historical-MM alias CLI transport: ${message}`); };

function readFixedManifest() {
  if (verifiedManifest) return verifiedManifest;
  assertHistoricalMmTestStage();
  raw.assertView();
  const fixed = resolve(root, manifestPath);
  const physical = fs.realpathSync(fixed);
  const stat = fs.lstatSync(fixed);
  if (physical !== fixed || !stat.isFile() || stat.isSymbolicLink()) fail('fixed manifest must be a regular nonsymlink file');
  const bytes = fs.readFileSync(fixed);
  if (sha(bytes) !== manifestSha256) fail('fixed finite-input manifest hash changed');
  let manifest;
  try { manifest = JSON.parse(bytes.toString('utf8')); } catch { fail('manifest is not JSON'); }
  if (manifest.schemaVersion !== 1 || manifest.artifactType !== 'finite historical current-MM continuation-alias CLI replay inputs'
      || manifest.sourceEpoch?.commit !== sourceCommit || manifest.sourceEpoch?.tree !== sourceTree
      || manifest.executionContract?.entry !== 'tools/continuation-alias-audit.mjs'
      || JSON.stringify(manifest.executionContract?.argv) !== JSON.stringify(['--check'])
      || manifest.executionContract?.noCurrentS1Fallback !== true || manifest.executionContract?.noCallerSuppliedPaths !== true
      || manifest.executionContract?.noSemanticCertification !== true || !Array.isArray(manifest.files)
      || manifest.files.length !== 1089 || manifest.counts?.records !== 1064 || manifest.counts?.referencedCatalogs !== 1084
      || manifest.counts?.declaredGroups !== 284 || manifest.counts?.files !== 1089) fail('fixed source epoch, CLI contract, or finite manifest denominator changed');
  if (raw.git('rev-parse', `${sourceCommit}^{tree}`).toString('utf8').trim() !== sourceTree) fail('fixed M1 source tree changed');
  raw.git('merge-base', '--is-ancestor', sourceCommit, 'HEAD');
  const files = new Map();
  const roleCounts = new Map();
  for (const row of manifest.files) {
    plainRepoPath(row?.path);
    if (files.has(row.path) || !/^[a-f0-9]{64}$/.test(row.sha256 ?? '') || !Number.isSafeInteger(row.sizeBytes) || row.sizeBytes < 0
        || !['historical-cli-code', 'historical-book-resolver', 'historical-current-mm-core-input', 'historical-current-mm-referenced-catalog'].includes(row.role)) fail('manifest rows must be unique, typed fixed-path Git pins');
    files.set(row.path, row);
    roleCounts.set(row.role, (roleCounts.get(row.role) || 0) + 1);
  }
  if (roleCounts.get('historical-cli-code') !== 2 || roleCounts.get('historical-book-resolver') !== 1
      || roleCounts.get('historical-current-mm-core-input') !== 2 || roleCounts.get('historical-current-mm-referenced-catalog') !== 1084
      || files.get('tools/continuation-alias-audit.mjs')?.sha256 !== 'fdc6eaa214ca1b58c83e3d5ddc48c146ce6d062b535e2e2d5ecb57a59df7fbea'
      || files.get('dist/books.js')?.sha256 !== '99928f8e954ef213a51c70dc97d8f63b16a7b5eea9f1cba10b76b527ec17f811'
      || files.get('dist/data.json')?.sha256 !== '2ab84cfe5e4234e5d0303b2062f941f7d8e1b93d798a7402c16e78d6d2e4672c') fail('typed CLI closure differs from the reviewed finite role counts or sentinels');
  const dataBytes = raw.git('show', `${sourceCommit}:dist/data.json`);
  const dataPin = files.get('dist/data.json');
  if (!dataPin || dataBytes.length !== dataPin.sizeBytes || sha(dataBytes) !== dataPin.sha256) fail('M1 data blob differs from finite pin');
  const data = JSON.parse(dataBytes.toString('utf8'));
  const owners = ['rules', 'spells', 'equipment', 'matrices', 'classes', 'progressionExplainer'].flatMap(key =>
    Array.isArray(data[key]) ? data[key] : data[key] ? [data[key]] : []);
  const catalogs = new Set();
  for (const owner of owners) for (const key of ['sourceExcerpts', 'scanVerification']) {
    const path = owner[key]?.catalog;
    if (path) catalogs.add(`dist/${plainRepoPath(path)}`);
  }
  const catalogRows = [...files.values()].filter(row => row.role === 'historical-current-mm-referenced-catalog').map(row => row.path).sort();
  if (owners.length !== 1064 || catalogs.size !== 1084 || JSON.stringify([...catalogs].sort()) !== JSON.stringify(catalogRows)) fail('catalog closure is not exactly the referenced M1 owner set');
  verifiedManifest = {manifest, files};
  return verifiedManifest;
}

function runFixedAliasCli() {
  const {files} = readFixedManifest();
  raw.assertView();
  const tempRoot = mkdtempSync('/tmp/class-mapping-mm-alias-cli-');
  try {
    assertHistoricalMmPrivateTempRoot(tempRoot);
    for (const [path, pin] of files) {
      const bytes = raw.git('show', `${sourceCommit}:${path}`);
      if (bytes.length !== pin.sizeBytes || sha(bytes) !== pin.sha256) fail(`exact M1 Git blob differs: ${path}`);
      const target = resolve(tempRoot, path);
      if (!target.startsWith(`${tempRoot}/`)) fail('manifest path escaped the private replay root');
      mkdirSync(dirname(target), {recursive: true});
      writeFileSync(target, bytes);
    }
    const env = {...controlledGitEnvironment(), PATH: `${resolve(process.execPath, '..')}:/usr/bin:/bin`, NODE_OPTIONS: ''};
    const output = spawnNode(process.execPath, ['tools/continuation-alias-audit.mjs', '--check'], {
      cwd: tempRoot, env, encoding: 'utf8', maxBuffer: 1024 * 1024,
    });
    let report;
    try { report = JSON.parse(output); } catch { fail('fixed CLI output is not one JSON report'); }
    for (const [key, expected] of Object.entries(expectedCounts)) if (report.denominators?.[key] !== expected) fail(`historical denominator changed: ${key}`);
    if (report.denominators?.exactAliasMatches !== 710 || report.denominators?.missingAliasLinks !== 0
        || report.denominators?.unassessableDeclaredParts !== 27 || report.structuralCheck?.valid !== true
        || report.structuralCheck?.sourceSemanticsCertified !== false) fail('historical structural output differs from the fixed expected report');
    return output;
  } finally {
    rmSync(tempRoot, {recursive: true, force: true});
  }
}

export function assertHistoricalAliasCliTransportV1() {
  const {files} = readFixedManifest();
  return Object.freeze({
    stage: 'exact-immutable-a29-MM-test-replay', sourceCommit, sourceTree,
    manifestPath, manifestSha256, fileCount: files.size,
    recordCount: 1064, referencedCatalogCount: 1084, sourceSemanticsCertified: false,
  });
}

// Preserve the test's original fixed Node/argv call. The repository-root
// trailing slash is the exact spelling produced by its unchanged file-URL code.
export function execFileSync(file, args, options = {}) {
  const child = detachedArgv(args);
  const opts = detachedChildOptions(options);
  const cwd = opts.cwd;
  const acceptedCwd = cwd === root || cwd === `${root}/`;
  if (file !== process.execPath || child.length !== 2 || child[0] !== 'tools/continuation-alias-audit.mjs'
      || child[1] !== '--check' || !acceptedCwd || opts.encoding !== 'utf8'
      || Object.keys(opts).length !== 2 || !Object.hasOwn(opts, 'cwd') || !Object.hasOwn(opts, 'encoding')) {
    fail('only the unchanged fixed Node --check invocation at the exact historical test root is allowed');
  }
  return runFixedAliasCli();
}
