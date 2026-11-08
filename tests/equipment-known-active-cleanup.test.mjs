import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const fixture = read('tests/fixtures/equipment-known-active-cleanup.json');
const receipt = read('research/source-audit-batch5-known-active-cleanup.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const imageHash = path => sha(readFileSync(path));
const cases = new Map(fixture.cases.map(item => [item.id, item]));

function regionAt(catalog, id) {
  const region = catalog.regions.find(item => item.id === id);
  assert.ok(region, `${id} must remain under its stable region ID`);
  return region;
}

test('four active defects are pinned before repair, including original 679 Aklys claim and catalog universe', () => {
  assert.equal(fixture.sourceActiveDefectsArtifact.sha256, 'dfe59e548af80bac3f1a7342483af5f5d26541b632b01e4d6e962102d890fcd4');
  assert.equal(fixture.sourceActiveDefectsArtifact.findingCount, 3);
  assert.deepEqual(fixture.preRepairCatalogUniverse, {
    summaryPath: 'research/source-audit-batch5-table-context-baseline.json',
    summarySha256: '011a5c85f148384604b80d6862316a90959db0564ece3ca9f4c455a7f3e740bc',
    fullInventoryPath: 'research/source-audit-batch5-table-context-baseline-full.json.gz',
    fullInventorySha256: 'df4894758af167e0d18b10fa57ec8ee21b4c26d5e5540a0d066eb548d1664aa5',
    catalogCount: 1015,
    regionCount: 2859,
  });
  assert.deepEqual(fixture.cases.map(item => item.id), [
    'battle-axe-phb37-strip-lacks-table-context',
    'battle-axe-phb38-strip-lacks-table-context',
    'spear-phb38-heading-only-region-misdescribed-as-row',
    'ua-aklys-stale-range-asterisk-availability',
  ]);
  const aklys = cases.get('ua-aklys-stale-range-asterisk-availability');
  const historical = execFileSync('git', ['show', `${aklys.original679HistoricalCatalog.gitCommit}:${aklys.catalog}`]);
  assert.equal(sha(historical), aklys.original679HistoricalCatalog.catalogSha256);
  assert.equal(execFileSync('git', ['rev-parse', `${aklys.original679HistoricalCatalog.gitCommit}:${aklys.catalog}`,], {encoding: 'utf8'}).trim(), aklys.original679HistoricalCatalog.gitBlobOid);
  assert.equal(JSON.parse(historical.toString('utf8')).scope, aklys.original679HistoricalCatalog.scope);
  assert.match(aklys.original679HistoricalCatalog.scope, /explanation of the range asterisk is unavailable in the supplied crop\./);
});

test('bounded cleanup receipt binds the baseline, row focus, preserved strips and all four dispositions', () => {
  assert.equal(receipt.baseline.sourceActiveDefectsSha256, fixture.sourceActiveDefectsArtifact.sha256);
  assert.equal(receipt.baseline.originalCatalogUniverseSummary.sha256, fixture.preRepairCatalogUniverse.summarySha256);
  assert.equal(receipt.baseline.originalCatalogUniverseFullGzip.sha256, fixture.preRepairCatalogUniverse.fullInventorySha256);
  assert.deepEqual(receipt.decisions.map(item => item.id), fixture.cases.map(item => item.id));
  for (const id of ['battle-axe-phb37-strip-lacks-table-context', 'battle-axe-phb38-strip-lacks-table-context']) {
    const decision = receipt.decisions.find(item => item.id === id);
    const item = cases.get(id);
    const catalog = read(item.catalog);
    const region = regionAt(catalog, item.regionId);
    const canonical = regionAt(catalog, item.approvedReplacementRecipe.sourceRegionId);
    assert.deepEqual(decision.current.focusRects, canonical.focusRects);
    assert.deepEqual({focusSha256: decision.current.focusSha256, contentSha256: decision.current.contentSha256}, sourceVisualRegionHashes(region));
    assert.equal(decision.current.imageSha256, region.sha256);
    assert.equal(decision.preservedOldPng.sha256, item.oldImageSha256);
    assert.equal(region.verificationScope, 'source-excerpt');
    assert.deepEqual(region.checkedFields, item.historicalRegionSnapshot.checkedFields);
  }
  const battleAxeSnapshot = receipt.catalogSnapshots.find(item => item.path === 'dist/scans/verified/equipment-phb-battle-axe.json');
  assert.equal(battleAxeSnapshot.sha256AtReceipt, battleAxeSnapshot.sha256AfterOwnedMutation,
    'the receipt pins the catalog immediately after its owned edits');
  assert.notEqual(battleAxeSnapshot.sha256AtReceipt, sha(readFileSync(battleAxeSnapshot.path)),
    'the later UA26 catalog append does not rewrite the cleanup snapshot');
});

test('Battle Axe p.37 and p.38 stable excerpts use the already-reviewed full-table crop recipe', () => {
  const catalogPath = 'dist/scans/verified/equipment-phb-battle-axe.json';
  const catalog = read(catalogPath);
  for (const id of ['battle-axe-phb37-strip-lacks-table-context', 'battle-axe-phb38-strip-lacks-table-context']) {
    const entry = cases.get(id);
    const region = regionAt(catalog, entry.regionId);
    const recipe = entry.approvedReplacementRecipe;
    const approvedRow = regionAt(catalog, recipe.sourceRegionId);
    assert.deepEqual({image: approvedRow.image, imageSha256: approvedRow.sha256, width: approvedRow.width, height: approvedRow.height,
      boundsPdfPoints: approvedRow.boundsPdfPoints, normalizedPageRect: approvedRow.normalizedPageRect}, {
      image: recipe.image, imageSha256: recipe.imageSha256, width: recipe.width, height: recipe.height,
      boundsPdfPoints: recipe.boundsPdfPoints, normalizedPageRect: recipe.normalizedPageRect,
    }, `${id}: copied recipe remains anchored to its current independently reviewed table row`);
    assert.equal(region.image, recipe.image);
    assert.equal(region.sha256, recipe.imageSha256);
    assert.deepEqual([region.width, region.height], [recipe.width, recipe.height]);
    assert.deepEqual(region.boundsPdfPoints, recipe.boundsPdfPoints);
    assert.deepEqual(region.normalizedPageRect, recipe.normalizedPageRect);
    assert.equal(region.verificationScope, 'source-excerpt', 'the context excerpt does not acquire the fact row value scope');
    assert.deepEqual(region.focusRects, recipe.focusRects, 'precise focus matches the independently reviewed canonical source row');
    assert.notDeepEqual(region.focusRects, entry.historicalRegionSnapshot.focusRects, 'the historical full-image sentinel is preserved only in the before-state fixture');
    assert.deepEqual(region.checkedFields, entry.historicalRegionSnapshot.checkedFields, 'no checked value fields are added to the source excerpt');
    assert.equal(imageHash(`dist/scans/verified/${region.image}`), region.sha256);
    assert.equal(imageHash(`dist/scans/verified/${entry.historicalRegionSnapshot.image}`), entry.oldImageSha256, 'old strip PNG bytes remain available as historical evidence');
  }
});

test('Spear p.38 heading remains context-only, is accurately named, and follows evidence rows', () => {
  const entry = cases.get('spear-phb38-heading-only-region-misdescribed-as-row');
  const catalog = read(entry.catalog);
  const region = regionAt(catalog, entry.regionId);
  assert.equal(region.role, 'context');
  assert.match(region.title, /heading|context/i);
  assert.match(region.alt, /heading|context only/i);
  assert.match(region.summary, /heading|context only/i);
  assert.match(region.checkedFields.sourceLocation, /heading|context/i);
  assert.doesNotMatch(region.checkedFields.sourceLocation, /Spear row/i);
  assert.doesNotMatch(region.summary, /Spear row located and legible/i);
  assert.deepEqual(Object.keys(region.checkedFields), ['sourceLocation'], 'only source location is described; no Spear fact target is promoted');
  assert.equal(imageHash(`dist/scans/verified/${region.image}`), entry.oldImageSha256, 'the heading-only source image bytes are retained');
  const ids = catalog.regions.filter(item => item.book === 'PHB' && item.printedPage === 38).map(item => item.id);
  const headingIndex = ids.indexOf(entry.regionId);
  const evidenceIndices = entry.expectedContextOrderAfterRepair.slice(0, 2).map(id => ids.indexOf(id));
  assert.ok(evidenceIndices.every(index => index >= 0), 'both evidence-bearing p.38 table rows remain present');
  assert.ok(headingIndex > Math.max(...evidenceIndices), 'context appears after the applicable handheld and missile evidence rows');
});

test('Aklys metadata changes only stale availability wording and preserves numeric review inputs', () => {
  const entry = cases.get('ua-aklys-stale-range-asterisk-availability');
  const catalog = read(entry.catalog);
  assert.equal(catalog.sources.UA.sha256, 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4');
  const expectedScope = `${entry.unchangedNumericClaimPrefix} ${entry.replacementSentence}`;
  assert.equal(catalog.scope, expectedScope);
  assert.doesNotMatch(catalog.scope, /asterisk is unavailable/i);
  assert.match(catalog.scope, /fire rate and numeric range bands/i);
  assert.deepEqual(catalog.regions.map(region => region.id), entry.regionsBeforeRepair.map(region => region.id));
  for (const region of catalog.regions) {
    const historical = entry.regionsBeforeRepair.find(old => old.id === region.id);
    assert.ok(historical, `${region.id} remains represented in the original comparison`);
    assert.equal(region.sha256, historical.sha256, `${region.id}: source image is unchanged`);
    assert.equal(region.verificationScope, historical.verificationScope, `${region.id}: value grade is unchanged`);
    assert.deepEqual(region.checkedFields, historical.checkedFields, `${region.id}: checked mechanics remain unchanged`);
  }
});
