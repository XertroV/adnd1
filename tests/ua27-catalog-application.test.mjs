import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const proposal = JSON.parse(fs.readFileSync(path.join(repoRoot, 'research/source-audit-batch5-ua27-review.json'), 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('UA p.27 row citations use visually reviewed, row-specific regions on the complete table', () => {
  const tableSha = proposal.source.tableImage.sha256;
  const tableImage = path.join(repoRoot, proposal.source.tableImage.path);
  assert.equal(sha256(tableImage), tableSha);

  assert.equal(proposal.rows.length, 60);
  const confirmedRows = proposal.rows.filter((row) => row.rowDisposition === 'confirmed-row-to-item');
  assert.equal(confirmedRows.length, 57);
  assert.equal(proposal.rows.filter((row) => row.rowDisposition === 'uncertain-row-to-item').length, 2);
  assert.equal(proposal.rows.filter((row) => row.rowDisposition === 'inapplicable-to-equipment').length, 1);

  const targetRegionIds = new Set();
  const ownerItemIds = new Set();
  let stableRegions = 0;
  let newRegions = 0;
  for (const row of confirmedRows) {
    const matches = row.targetMapping.filter((target) => target.applicability === 'confirmed');
    assert.equal(matches.length, 1, `${row.id} must have one confirmed owner mapping`);
    const target = matches[0];
    const recipe = target.catalogRecipe;
    assert.ok(recipe, `${row.id} has a catalog recipe`);
    const catalogPath = recipe.ownerCatalog.startsWith('dist/')
      ? path.join(repoRoot, recipe.ownerCatalog)
      : path.join(repoRoot, 'dist', recipe.ownerCatalog);
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const region = catalog.regions.find((candidate) => candidate.id === recipe.regionId);

    assert.ok(region, `${row.id} region ${recipe.regionId} exists in ${target.itemId}`);
    assert.equal(targetRegionIds.has(recipe.regionId), false, `region ID ${recipe.regionId} is unique`);
    targetRegionIds.add(recipe.regionId);
    ownerItemIds.add(target.itemId);
    assert.equal(region.role, 'row', `${recipe.regionId} is row evidence`);
    assert.equal(region.sourceRowId, row.id);
    assert.equal(region.sourceTableId, 'ua-p27-weapon-table');
    assert.equal(target.rowIdentityCheck.sourceRowId, row.id);
    assert.equal(target.rowIdentityCheck.headerOrContextRegionUsedAsEvidence, false);
    assert.equal(target.rowIdentityCheck.focusContainsPrintedRowLabelAndAllSourceCells, true);
    assert.equal(target.rowIdentityCheck.focusExcludesAdjacentDataRows, true);
    assert.equal(region.sha256, tableSha);
    assert.equal(region.image, path.basename(proposal.source.tableImage.path));
    assert.deepEqual(region.focusRects, recipe.focusRects, `${recipe.regionId} keeps its reviewed row focus`);
    assert.ok(region.focusRects.length > 0, `${recipe.regionId} has a precise focus`);
    assert.ok(region.focusRects.every((rect) => rect.length === 4 && rect.every(Number.isFinite)));
    assert.equal(catalog.sources?.UA?.sha256, proposal.inputs.sourceSha256, `${target.itemId} records the reviewed UA source`);

    if (recipe.preserveStableRegionId) stableRegions += 1;
    else newRegions += 1;
    if (recipe.preserveStableRegionId) assert.equal(recipe.beforeRegion?.id, recipe.regionId);

    const heading = catalog.regions.find((candidate) => candidate.id === 'ua-27-2c829644bd303eb8');
    if (heading) {
      assert.equal(heading.role, 'context');
      const headingIndex = catalog.regions.indexOf(heading);
      const rowIndexes = catalog.regions
        .filter((candidate) => candidate.sourceTableId === 'ua-p27-weapon-table' && candidate.role === 'row')
        .map((candidate) => catalog.regions.indexOf(candidate));
      assert.ok(rowIndexes.length > 0 && rowIndexes.every((index) => index < headingIndex), `${target.itemId}: table heading follows row evidence`);
    }
  }

  assert.equal(targetRegionIds.size, 57);
  assert.equal(ownerItemIds.size, 55);
  assert.equal(stableRegions, 30);
  assert.equal(newRegions, 27);
});

