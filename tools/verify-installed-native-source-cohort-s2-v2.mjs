// Portable installed-cohort verifier. It depends on Node and the sibling
// assertion module only; research model builders and private staging paths are
// not imported or resolved.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, writeFileSync} from 'node:fs';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  assertClosedHirelingsCurrentNativeSourceCohort,
  assertFrozenCatalog,
  assertPublishedContinuations,
  hash,
} from './assert-current-native-source-cohort-s2-v1.mjs';

const [repoRootArg, fixtureArg, expectedFixtureSha, targetManifestArg, outputArg, ...flags] = process.argv.slice(2);
assert.ok(repoRootArg && fixtureArg && expectedFixtureSha && targetManifestArg && outputArg,
  'usage: node tools/verify-installed-native-source-cohort-s2-v2.mjs <repoRoot> <fixture-relative-path> <expected-fixture-sha256> <target-manifest-relative-path> <output-relative-path> [--source-map <source-map-path>] [--artifact-root <artifact-dir>]');
assert.match(expectedFixtureSha, /^[a-f0-9]{64}$/, 'caller supplies a pinned fixture digest');
const repoRoot = resolve(repoRootArg);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function inside(root, path, label) {
  assert.ok(!isAbsolute(path), `${label}: path must be relative to the checkout`);
  const absolute = resolve(root, path);
  const rel = relative(resolve(root), absolute);
  assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), `${label}: path stays within the checkout`);
  return absolute;
}
let artifactRoot = repoRoot;
let sourceMapPath = null;
for (let index = 0; index < flags.length;) {
  const flag = flags[index++];
  assert.ok(index < flags.length, `${flag}: option value is present`);
  const value = flags[index++];
  if (flag === '--artifact-root') artifactRoot = resolve(value);
  else if (flag === '--source-map') sourceMapPath = resolve(value);
  else assert.fail(`unsupported option: ${flag}`);
}
const fixturePath = inside(artifactRoot, fixtureArg, 'fixture');
const targetManifestPath = inside(artifactRoot, targetManifestArg, 'target manifest');
const outputPath = inside(artifactRoot, outputArg, 'output');
const readBytes = path => readFileSync(path);
const readJson = path => JSON.parse(readBytes(path).toString('utf8'));
const fixtureBytes = readBytes(fixturePath), targetManifestBytes = readBytes(targetManifestPath);
const fixture = JSON.parse(fixtureBytes.toString('utf8'));
const copyPlan = JSON.parse(targetManifestBytes.toString('utf8'));
assert.equal(sha(fixtureBytes), expectedFixtureSha, 'exact fixture bytes match caller-pinned digest');
assert.equal(sha(targetManifestBytes), fixture.sourceCohort.assetCopyPlan.sha256, 'exact portable S2 target manifest bytes');
assert.equal(copyPlan.privateFullSourcesIncluded, false, 'manifest excludes private full sources');
assert.equal(Object.hasOwn(copyPlan, 'sourcePath'), false, 'target-only manifest has no source-path dependency');
assert.ok(copyPlan.files.every(file => !Object.hasOwn(file, 'sourcePath')), 'no per-file source path is available to portable target verification');

const repoJson = path => readJson(join(repoRoot, path));
const candidate = {
  repoRoot,
  rawRules: repoJson('rules.json'),
  data: repoJson('dist/data.json'),
  overrides: repoJson('citation-overrides.json'),
  manual: repoJson('research/field-evidence-bindings.json'),
  inventory: repoJson('research/price-source-inventory.json'),
  mechanics: repoJson('research/mechanics-audit-progress.json'),
  seals: repoJson('research/citation-evidence-seals.json'),
  continuations: repoJson('research/citation-continuations.json'),
  copyPlan,
};

const catalogMap = new Map();
for (const expected of fixture.sourceCohort.catalogs) {
  const catalogPath = inside(repoRoot, expected.targetPath, `${expected.ownerId} catalog`);
  const bytes = readBytes(catalogPath);
  const catalog = JSON.parse(bytes.toString('utf8'));
  assertFrozenCatalog(catalog, bytes, expected);
  catalogMap.set(expected.targetPath.replace(/^dist\//, ''), catalog);
}
const catalogFor = relativeCatalog => {
  const path = relativeCatalog.replace(/^dist\//, '');
  if (catalogMap.has(path)) return catalogMap.get(path);
  const bytes = readBytes(inside(repoRoot, `dist/${path}`, `${path} existing catalog`));
  const catalog = JSON.parse(bytes.toString('utf8'));
  catalogMap.set(path, catalog);
  return catalog;
};
const importTool = async name => await import(pathToFileURL(join(repoRoot, 'tools', name)).href);
const [{buildInventory: buildSourceScanInventory}, {loadContinuationAliasReport}, {buildPublishedContinuations}] = await Promise.all([
  importTool('source-scan-inventory.mjs'),
  importTool('continuation-alias-audit.mjs'),
  importTool('published-continuations.mjs'),
]);
const sourceScanValue = buildSourceScanInventory(candidate.data, requested => {
  const relativeCatalog = requested.replace(/^dist\//, '');
  return catalogFor(relativeCatalog);
});
const continuationBytes = readBytes(join(repoRoot, 'research/citation-continuations.json'));
// Match the production wrapper exactly. It includes all referenced catalog
// inputs from sourceExcerpts and scanVerification across every collection.
const aliasAuditValue = loadContinuationAliasReport({repoRoot});
const publishedValue = buildPublishedContinuations({
  manifest: candidate.continuations,
  data: candidate.data,
  catalogRoot: join(repoRoot, 'dist'),
});
const installedPublished = repoJson('dist/source-continuations.json');
assert.deepEqual(installedPublished, publishedValue,
  'installed published continuations exactly equal the production publisher output from installed inputs and target catalogs');
const nativeState = {
  ...candidate,
  sourceScan: {status: 'pass', value: sourceScanValue},
  aliasAudit: {status: 'pass', value: aliasAuditValue},
  published: {status: 'pass', value: publishedValue},
};
const closure = assertClosedHirelingsCurrentNativeSourceCohort(nativeState, fixture, {checkAssets: true});
const publishedClosure = assertPublishedContinuations(installedPublished, fixture);

let sourceCopyVerification = 'skipped; no source path is present in the portable target manifest';
if (sourceMapPath) {
  const sourceMapBytes = readBytes(sourceMapPath);
  const sourceMap = JSON.parse(sourceMapBytes.toString('utf8'));
  assert.equal(sourceMap.files.length, copyPlan.files.length, 'source map has the complete target denominator');
  const planByTarget = new Map(copyPlan.files.map(file => [file.targetPath, file]));
  const seen = new Set();
  for (const source of sourceMap.files) {
    const planned = planByTarget.get(source.targetPath);
    assert.ok(planned, `${source.targetPath}: source map target is registered`);
    assert.equal(seen.has(source.targetPath), false, `${source.targetPath}: source map target is unique`);
    seen.add(source.targetPath);
    assert.equal(source.sha256, planned.sha256, `${source.targetPath}: source map hash matches target manifest`);
    assert.equal(source.sizeBytes, planned.sizeBytes, `${source.targetPath}: source map size matches target manifest`);
    const sourceStat = lstatSync(source.sourcePath);
    const targetPath = inside(repoRoot, planned.targetPath, `${planned.targetPath} target`);
    const targetStat = lstatSync(targetPath);
    assert.ok(sourceStat.isFile() && !sourceStat.isSymbolicLink() && sourceStat.nlink === 1, `${source.targetPath}: source is regular, non-symlink, single-link`);
    assert.ok(targetStat.isFile() && !targetStat.isSymbolicLink() && targetStat.nlink === 1, `${source.targetPath}: target is regular, non-symlink, single-link`);
    const sourceBytes = readBytes(source.sourcePath), targetBytes = readBytes(targetPath);
    assert.equal(sourceBytes.length, source.sizeBytes, `${source.targetPath}: source byte size`);
    assert.equal(targetBytes.length, source.sizeBytes, `${source.targetPath}: target byte size`);
    assert.equal(sha(sourceBytes), source.sha256, `${source.targetPath}: source exact hash`);
    assert.equal(sha(targetBytes), source.sha256, `${source.targetPath}: target exact hash`);
    assert.ok(sourceStat.dev !== targetStat.dev || sourceStat.ino !== targetStat.ino, `${source.targetPath}: target is physically distinct from source`);
  }
  assert.equal(seen.size, copyPlan.files.length, 'source map covers every exact target once');
  sourceCopyVerification = {status: 'pass', sourceMapSha256: sha(sourceMapBytes), files: seen.size};
}

const result = {
  schemaVersion: 1,
  artifactType: 'portable installed S2 current-native source cohort verifier',
  status: 'pass',
  activeInputsChanged: false,
  repoRoot,
  fixture: {path: relative(artifactRoot, fixturePath), sha256: sha(fixtureBytes)},
  targetManifest: {path: relative(artifactRoot, targetManifestPath), sha256: sha(targetManifestBytes), targets: copyPlan.files.length},
  assertionModuleSha256: sha(readBytes(new URL('./assert-current-native-source-cohort-s2-v1.mjs', import.meta.url))),
  nativeClosure: closure,
  productionConsumers: {
    sourceScan: {sha256: hash(sourceScanValue), counts: sourceScanValue.counts},
    aliasAudit: {sha256: hash(aliasAuditValue), denominators: aliasAuditValue.denominators},
    publishedContinuations: publishedClosure,
  },
  sourceCopyVerification,
  installedFiles: {
    rawRulesSha256: sha(readBytes(join(repoRoot, 'rules.json'))),
    compiledDataSha256: sha(readBytes(join(repoRoot, 'dist/data.json'))),
    manualBindingsSha256: sha(readBytes(join(repoRoot, 'research/field-evidence-bindings.json'))),
    canonicalInventorySha256: sha(readBytes(join(repoRoot, 'research/price-source-inventory.json'))),
    continuationManifestSha256: sha(continuationBytes),
    publishedContinuationsSha256: sha(readBytes(join(repoRoot, 'dist/source-continuations.json'))),
  },
};
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({status: result.status, outputPath, owners: closure.counts.owners, canonical: closure.counts.canonicalBindings, targetFiles: copyPlan.files.length, sourceCopyVerification: sourceMapPath ? 'performed' : 'skipped'}, null, 2));
