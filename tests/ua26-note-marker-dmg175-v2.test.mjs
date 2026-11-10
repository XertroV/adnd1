import {after, test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditUa26MarkerReceiptWithHCurrentSourceEpoch} from '../tools/ua26-note-marker-audit-h-v2.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// This is the production layout: tests/ is directly under the repository root.
const repoRoot = path.resolve(here, '..');
const registryPath = 'research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json';
const markerReceiptPath = 'research/source-audit-batch5-ua26-marker-correction.json';
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const add = (set, rel) => { if (typeof rel === 'string' && rel.length && !path.isAbsolute(rel)) set.add(rel); };

const receipt = readJson(repoRoot, markerReceiptPath);
const joAppendPath = 'research/source-audit-batch6-jo-ua26-alias-append.json';
const currentAppendPath = 'research/source-audit-batch5-ua26-current-row-append.json';
const joAppend = readJson(repoRoot, joAppendPath);
const currentAppend = readJson(repoRoot, currentAppendPath);
const required = new Set([
  markerReceiptPath,
  joAppendPath,
  currentAppendPath,
  'dist/data.json',
  'dist/books.js',
  'research/price-source-inventory.json',
  'research/source-audit-input-dmg175-source-987a25d3ba2d.json',
  'research/source-audit-pass8-dmg175-source-body-handoff-transition-v1.json',
  'research/ua28-field-target-review-v1/independent-review-evidence-v1.json',
  'research/source-audit-pass8-ua28-caption-metadata-independent-review-v1.json',
  'research/source-audit-pass8-ua28-v7-row-caption-independent-review-v1.json',
  'research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/validation/ua26-marker-full-catalog-diff-h-v1.json',
  'tools/ua26-note-marker-audit.mjs',
  registryPath
]);
for (const ref of Object.values(receipt.frozenInputs || {})) add(required, ref?.path);
for (const rel of Object.keys(receipt.currentCatalogHashes || {})) add(required, rel);
for (const ref of [joAppend.sourcePeer, joAppend.frameDerivation, joAppend.catalog,
  joAppend.caltropCatalogExtension?.before, joAppend.caltropCatalogExtension?.after]) add(required, ref?.path);
add(required, currentAppend.row?.catalog?.path);
add(required, 'tests/helpers/ua-source-batch6-jo-fixture.mjs');
add(required, 'tests/fixtures/hirelings-source-current-cohort-v1.json');
add(required, 'tests/helpers/hirelings-source-current-cohort.mjs');
add(required, 'tests/helpers/hirelings-source-current-cohort-kernel-v1.mjs');
add(required, 'research/hirelings-native-h-v1/source-body-handoff-transition-v1.json');
add(required, 'research/mechanics-audit-progress.json');
add(required, 'tools/ua26-note-marker-audit-h-v2.mjs');
const nativeHFixture = readJson(repoRoot, 'tests/fixtures/hirelings-source-current-cohort-v1.json');
for (const rel of Object.keys(nativeHFixture.sourceRawInputs)) add(required, rel);

const copiedPaths = new Set([
  'dist/data.json',
  'dist/scans/verified/equipment-ua-harpoon.json',
  'dist/scans/verified/equipment-phb-hammer.json',
  'dist/scans/verified/equipment-phb-javelin.json',
  'dist/scans/verified/equipment-ua-aklys-hurled.json',
  'tests/fixtures/hirelings-source-current-cohort-v1.json',
  'tests/helpers/hirelings-source-current-cohort.mjs',
  'tests/helpers/hirelings-source-current-cohort-kernel-v1.mjs',
  'research/mechanics-audit-progress.json',
  'tools/ua26-note-marker-audit-h-v2.mjs'
]);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ua26-marker-dmg175-installed-canary-'));
for (const rel of required) {
  const source = path.join(repoRoot, rel);
  const destination = path.join(tempRoot, rel);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  if (copiedPaths.has(rel)) fs.copyFileSync(source, destination);
  else fs.symlinkSync(source, destination);
}
fs.symlinkSync(path.join(repoRoot, '.git'), path.join(tempRoot, '.git'), 'file');
after(() => fs.rmSync(tempRoot, {recursive: true, force: true}));

function mutateTempFile(rel, transform, expectedError = /bytes or epoch/) {
  const destination = path.join(tempRoot, rel);
  const before = fs.readFileSync(destination);
  const changed = transform(Buffer.from(before));
  assert.ok(!Buffer.from(changed).equals(before), `${rel} mutation must change bytes`);
  try {
    fs.writeFileSync(destination, changed);
    assert.throws(() => auditUa26MarkerReceiptWithHCurrentSourceEpoch(tempRoot), expectedError);
  } finally {
    fs.writeFileSync(destination, before);
  }
}

function changeCatalog(rel, mutate, expectedError = /bytes or epoch/) {
  return mutateTempFile(rel, bytes => {
    const catalog = JSON.parse(bytes.toString('utf8'));
    mutate(catalog);
    return Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`);
  }, expectedError);
}

test('installed production-root helper passes the exact current epoch and frozen marker contract', () => {
  const result = auditUa26MarkerReceiptWithHCurrentSourceEpoch(repoRoot);
  assert.equal(result.ok, true);
  assert.equal(result.semanticPass, false);
  assert.deepEqual(result.counts, {
    physicalRows: 68,
    marked: 17,
    unmarked: 51,
    corrective66Aliases: 66,
    currentTargetAppends: 2,
    currentWDAliases: 68,
    explicitMarkerRows: 17,
    baselineWrongSpecificAssignments: 2,
    previouslyUnresolvedNowSourceAdjudicated: 3,
    correctedCatalogs: 5,
    checkedCatalogs: 65
  });
  assert.deepEqual(result.catalogReviewScope, {
    fieldTargetOwners: 3,
    appendedUa28Regions: 6,
    captionOnlySummaryEdits: 6,
    sourceValueGrade: 'NOT PROMOTED',
    contextualAdequacy: 'NOT ASSESSED'
  });
});

test('installed CLI locates the production root and emits the same qualified receipt', () => {
  const output = execFileSync(process.execPath, ['tools/ua26-note-marker-audit-h-v2.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  const result = JSON.parse(output);
  assert.equal(result.ok, true);
  assert.equal(result.counts.physicalRows, 68);
  assert.equal(result.catalogReviewScope.appendedUa28Regions, 6);
});

test('wrong UA26 marker token is rejected', () => {
  changeCatalog('dist/scans/verified/equipment-ua-harpoon.json', catalog => {
    catalog.regions.find(region => region.id === 'ua26-notes-26-ua-harpoon').noteAssociation.marker = '*';
  });
});

test('removed UA26 note alias is rejected', () => {
  changeCatalog('dist/scans/verified/equipment-ua-harpoon.json', catalog => {
    catalog.regions = catalog.regions.filter(region => region.id !== 'ua26-notes-26-ua-harpoon');
  });
});

test('source identity metadata mutation is rejected', () => {
  changeCatalog('dist/scans/verified/equipment-ua-harpoon.json', catalog => {
    catalog.sources.UA.sha256 = '0'.repeat(64);
  });
});

test('new UA28 row summary cannot be silently widened into numeric approval', () => {
  changeCatalog('dist/scans/verified/equipment-ua-harpoon.json', catalog => {
    catalog.regions.find(region => region.id === 'ua28-ac-field-ua-harpoon-v2').summary += ' Numeric values independently verified.';
  });
});

test('new UA28 field review scope cannot be promoted', () => {
  changeCatalog('dist/scans/verified/equipment-phb-hammer.json', catalog => {
    catalog.regions.find(region => region.id === 'ua28-ac-field-phb-hammer-v2').verificationScope = 'source-value-verified';
  });
});

test('extra catalog property on an approved transition owner is rejected', () => {
  changeCatalog('dist/scans/verified/equipment-ua-harpoon.json', catalog => {
    catalog.unregisteredTransition = true;
  });
});

test('stale source epoch bytes are rejected', () => {
  mutateTempFile('dist/data.json', bytes => Buffer.concat([bytes, Buffer.from('\n')]));
});

test('a fourth catalog hash transition remains a hard failure', () => {
  changeCatalog('dist/scans/verified/equipment-ua-aklys-hurled.json', catalog => {
    catalog.unregisteredTransition = true;
  }, /frozen marker\/alias assertions changed or failed outside the exact three catalog transitions/);
});
