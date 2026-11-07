import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {auditRequiredSegmentPresence, validateContinuationManifest} from '../tools/continuation-contract.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = readJson(join(root, 'research/citation-continuations.json'));
const history = readJson(join(root, 'tests/fixtures/citation-continuation-history.json'));
const fixture = readJson(join(root, 'tests/fixtures/citation-continuation-order.json'));
const data = readJson(join(root, 'dist/data.json'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function groupFor(id) {
  const group = manifest.groups.find(entry => entry.id === id);
  assert.ok(group, `missing continuation group ${id}`);
  return group;
}

function caseFor(id) {
  const item = fixture.orderedCases.find(entry => entry.id === id);
  assert.ok(item, `missing order fixture case ${id}`);
  return item;
}

function sourceCatalog(group) {
  return readJson(join(root, 'dist', group.catalog));
}

function replaceRegionPositions(catalog, regionIds, replacementIds) {
  const result = structuredClone(catalog);
  const positions = regionIds.map(id => result.regions.findIndex(region => region.id === id));
  assert.ok(positions.every(index => index >= 0), 'all fixture regions must exist in the source catalog');
  const byId = new Map(result.regions.map(region => [region.id, region]));
  positions.forEach((position, index) => {
    result.regions[position] = structuredClone(byId.get(replacementIds[index]));
  });
  return result;
}

function samePageRegionIds(catalog, book, printedPage) {
  return catalog.regions.filter(region => region.book === book && region.printedPage === printedPage).map(region => region.id);
}

function projectedIds(entries) {
  return entries.map(entry => entry.regionId);
}

function temporaryCatalogRoot(t, group, mutate) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'citation-continuation-order-'));
  const catalogRoot = join(tempRoot, 'dist');
  const writtenPaths = new Set();

  function copyCatalog(relativeCatalog, includeImages = false, replacement = null) {
    const sourcePath = join(root, 'dist', relativeCatalog);
    const catalog = replacement || readJson(sourcePath);
    const targetPath = join(catalogRoot, relativeCatalog);
    mkdirSync(dirname(targetPath), {recursive: true});
    writeFileSync(targetPath, JSON.stringify(catalog, null, 2));
    writtenPaths.add(relativeCatalog);
    if (includeImages) {
      const sourceDirectory = dirname(sourcePath);
      const targetDirectory = dirname(targetPath);
      for (const region of catalog.regions || []) {
        if (!region.image) continue;
        const sourceImage = join(sourceDirectory, region.image);
        const targetImage = join(targetDirectory, region.image);
        if (existsSync(sourceImage) && !existsSync(targetImage)) copyFileSync(sourceImage, targetImage);
      }
    }
  }

  const changed = mutate ? mutate(sourceCatalog(group)) : sourceCatalog(group);
  copyCatalog(group.catalog, true, changed);
  for (const candidate of group.checkedAlternativeRegions || []) {
    if (!writtenPaths.has(candidate.catalog)) copyCatalog(candidate.catalog);
  }
  t.after(() => rmSync(tempRoot, {recursive: true, force: true}));
  return catalogRoot;
}

function validateOneGroup(t, group, mutate) {
  const catalogRoot = temporaryCatalogRoot(t, group, mutate);
  return validateContinuationManifest({schemaVersion: 1, groups: [group]}, {data, catalogRoot});
}

test('metadata-only receipt pins the exact pre-fix Abjure checker and catalog Git objects', () => {
  const receipt = fixture.preFixReceipt;
  assert.equal(receipt.imageBytesIncluded, false);
  const catalogBytes = execFileSync('git', ['show', `${receipt.gitCommit}:${receipt.catalogPath}`], {cwd: root});
  const checkerBytes = execFileSync('git', ['show', `${receipt.gitCommit}:${receipt.checkerPath}`], {cwd: root});
  assert.equal(sha256(catalogBytes), receipt.catalogSha256);
  assert.equal(execFileSync('git', ['rev-parse', `${receipt.gitCommit}:${receipt.catalogPath}`], {cwd: root, encoding: 'utf8'}).trim(), receipt.catalogGitBlobOid);
  assert.equal(execFileSync('git', ['rev-parse', `${receipt.gitCommit}:${receipt.checkerPath}`], {cwd: root, encoding: 'utf8'}).trim(), receipt.checkerGitBlobOid);
  const catalog = JSON.parse(catalogBytes.toString('utf8'));
  assert.equal(catalog.collection, receipt.collection);
  assert.equal(catalog.itemId, receipt.itemId);
  assert.deepEqual(catalog.regions.map(region => region.id), receipt.baselineCatalogRegionIds);
  assert.deepEqual(samePageRegionIds(catalog, 'UA', 37), receipt.requiredSegmentOrder);
  assert.ok(checkerBytes.toString('utf8').includes('catalog.regions.find(candidate => candidate.id === segment.regionId)'));
});

test('the source-reviewed segment orders are pinned for Abjure, Charging, and shared PHB p.33', () => {
  for (const item of fixture.orderedCases) {
    const group = groupFor(item.id);
    assert.equal(group.collection, item.collection);
    assert.equal(group.itemId, item.itemId);
    assert.equal(group.catalog, item.catalog);
    assert.deepEqual(group.segments.filter(segment => segment.state === 'present').map(segment => segment.regionId), item.requiredRegionIds);
    assert.ok(group.segments.filter(segment => segment.state === 'present').every(segment => segment.book === item.book && segment.printedPage === item.printedPage));
  }
});

test('reversed catalog order is reported for Abjure, Charging, and a shared PHB p.33 copy', () => {
  for (const item of fixture.orderedCases) {
    const group = groupFor(item.id);
    const catalog = sourceCatalog(group);
    const reversed = replaceRegionPositions(catalog, item.requiredRegionIds, [...item.requiredRegionIds].reverse());
    const report = auditRequiredSegmentPresence(group, reversed);
    assert.deepEqual(report.missing, [], `${item.id}: reversal is not a missing-region case`);
    assert.deepEqual(projectedIds(report.actualOrder), [...item.requiredRegionIds].reverse(), `${item.id}: actual catalog order`);
    assert.ok(report.orderMismatches.some(mismatch => mismatch.dimension === 'catalog'
      && JSON.stringify(mismatch.expectedRegionIds) === JSON.stringify(item.requiredRegionIds)
      && JSON.stringify(mismatch.actualRegionIds) === JSON.stringify([...item.requiredRegionIds].reverse())), `${item.id}: catalog-order mismatch must be explicit`);
  }
});

test('the full Abjure continuation validator rejects a reversed UA p.37 catalog pair', t => {
  const item = caseFor('ua-cleric-abjure-ua-37');
  const group = groupFor(item.id);
  const catalog = sourceCatalog(group);
  const reversed = replaceRegionPositions(catalog, item.requiredRegionIds, [...item.requiredRegionIds].reverse());
  const catalogRoot = temporaryCatalogRoot(t, group, () => reversed);
  assert.throws(
    () => validateContinuationManifest({schemaVersion: 1, groups: [group]}, {data, catalogRoot}),
    /order|sequence|display/i,
    'matching each region ID independently must not accept a reversed same-page continuation'
  );
});

test('unrelated book/page regions and unrelated interleaving do not change required relative order', () => {
  const item = caseFor('ua-cleric-abjure-ua-37');
  const group = groupFor(item.id);
  const catalog = sourceCatalog(group);
  const opening = catalog.regions.find(region => region.id === item.requiredRegionIds[0]);
  const continuation = catalog.regions.find(region => region.id === item.requiredRegionIds[1]);
  const unrelated = catalog.regions.find(region => region.book !== item.book || region.printedPage !== item.printedPage);
  assert.ok(unrelated, 'fixture should include an unrelated book/page excerpt');
  const interleaved = structuredClone(catalog);
  interleaved.regions = [structuredClone(opening), structuredClone(unrelated), structuredClone(continuation),
    ...catalog.regions.filter(region => ![opening.id, continuation.id, unrelated.id].includes(region.id))];
  const report = auditRequiredSegmentPresence(group, interleaved);
  assert.deepEqual(projectedIds(report.actualOrder), item.requiredRegionIds);
  assert.deepEqual(projectedIds(report.viewerOrder), item.requiredRegionIds);
  assert.deepEqual(report.orderMismatches, []);
  assert.deepEqual(report.missing, []);
});

test('a required opening marked context is rejected because viewer sorting moves it after the continuation', t => {
  const item = caseFor('ua-cleric-abjure-ua-37');
  const group = groupFor(item.id);
  const catalog = sourceCatalog(group);
  const mutated = structuredClone(catalog);
  mutated.regions.find(region => region.id === item.requiredRegionIds[0]).role = 'context';
  const report = auditRequiredSegmentPresence(group, mutated);
  assert.deepEqual(projectedIds(report.actualOrder), item.requiredRegionIds, 'catalog order itself remains opening then continuation');
  assert.deepEqual(projectedIds(report.viewerOrder), [...item.requiredRegionIds].reverse(), 'viewer context-last sort reverses the required pair');
  assert.ok(report.orderMismatches.some(mismatch => mismatch.dimension === 'viewer'), 'viewer-order mismatch must be explicit');
  assert.throws(() => validateOneGroup(t, group, () => mutated), /order|sequence|display|context|role/i);
});

test('duplicate required region IDs are reported and rejected', t => {
  const item = caseFor('ua-cleric-abjure-ua-37');
  const group = groupFor(item.id);
  const catalog = sourceCatalog(group);
  const duplicated = structuredClone(catalog);
  duplicated.regions.push(structuredClone(duplicated.regions.find(region => region.id === item.requiredRegionIds[0])));
  const report = auditRequiredSegmentPresence(group, duplicated);
  assert.ok(report.duplicateRegionIds.includes(item.requiredRegionIds[0]));
  assert.throws(() => validateOneGroup(t, group, () => duplicated), /duplicate|repeated|order|catalog/i);
});

test('the fixture pre-fix receipt matches the older missing-segment regression identity', () => {
  const historical = history.cases.find(entry => entry.id === 'ua-cleric-abjure-ua-37');
  assert.ok(historical, 'existing history fixture retains the Abjure missing-continuation case');
  assert.equal(historical.historicalCatalog.itemId, fixture.preFixReceipt.itemId);
  assert.equal(historical.historicalCatalog.collection, fixture.preFixReceipt.collection);
  assert.equal(historical.historicalCatalog.imageBytesIncluded, false);
});
