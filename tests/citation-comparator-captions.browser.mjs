import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {attachEvidenceBindings, buildPriceSourceInventory, validatePriceSourceInventory} from '../tools/price-source-inventory.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); }
catch { ({chromium} = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }

const repo = path.resolve('.');
const dist = path.join(repo, 'dist');
const fixture = JSON.parse(await readFile(new URL('./fixtures/citation-comparator-captions-base-079.json', import.meta.url), 'utf8'));
const sourceBytes = await readFile(path.join(dist, 'data.json'));
const data = JSON.parse(sourceBytes);
const inventory = buildPriceSourceInventory({equipment: data.equipment, data});
validatePriceSourceInventory(inventory, {equipment: data.equipment, data});
attachEvidenceBindings(data, inventory);

const actualTargets = [];
for (const owner of data.equipment || []) {
  for (let index = 0; index < (owner.suggestedPrice?.comparisons || []).length; index++) {
    const comparison = owner.suggestedPrice.comparisons[index];
    const binding = (comparison.evidenceBindings || []).find(entry => entry.sourceCategory === 'printed-price-comparator');
    if (binding) actualTargets.push({owner, comparison, binding, index});
  }
}
assert.equal(actualTargets.length, fixture.denominator.printedPriceComparatorTargets);
assert.equal(actualTargets.length, 6, 'the scoped comparator census currently contains six targets');
for (const expected of fixture.targets) {
  const actual = actualTargets.find(entry => entry.owner.id === expected.routeOwner.itemId && entry.index === expected.comparisonIndex);
  assert.ok(actual, `missing comparator ${expected.routeOwner.itemId}${expected.fieldPointer}`);
  assert.deepEqual({
    routeOwner: {collection: 'equipment', itemId: actual.owner.id, name: actual.owner.name},
    comparisonIndex: actual.index,
    fieldPointer: actual.binding.fieldPointer,
    sourceItem: {collection: 'equipment', itemId: actual.comparison.itemId, name: data.equipment.find(item => item.id === actual.comparison.itemId)?.name || actual.comparison.itemId},
    comparisonValue: {label: actual.comparison.label, amount: actual.comparison.amount, currency: actual.comparison.currency, unit: actual.comparison.unit, book: actual.comparison.book, pages: actual.comparison.pages},
    evidence: {sourceObject: actual.binding.sourceObject, sourceCategory: actual.binding.sourceCategory, sourceOwner: actual.binding.sourceOwner, printedPage: actual.binding.printedPage, pdfPage: actual.binding.pdfPage, catalog: actual.binding.catalog, regionIds: actual.binding.regionIds, reviewStatus: actual.binding.reviewStatus}
  }, {
    routeOwner: expected.routeOwner,
    comparisonIndex: expected.comparisonIndex,
    fieldPointer: expected.fieldPointer,
    sourceItem: expected.sourceItem,
    comparisonValue: expected.comparisonValue,
    evidence: expected.evidence
  }, `baseline comparator identity remains unchanged: ${expected.routeOwner.itemId}${expected.fieldPointer}`);
}

const appData = JSON.stringify(data);
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/data.json') {
      res.setHeader('Content-Type', 'application/json');
      res.end(appData);
      return;
    }
    const file = path.resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(dist + path.sep)) throw new Error('invalid path');
    res.setHeader('Content-Type', ({'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png'})[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
const results = [];
const errors = [];
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  page.on('pageerror', error => errors.push(error.message));
  for (const viewport of [{name: 'desktop', width: 1280, height: 900}, {name: 'mobile', width: 390, height: 844}]) {
    await page.setViewportSize({width: viewport.width, height: viewport.height});
    for (const expected of fixture.targets) {
      await page.goto(`http://127.0.0.1:${server.address().port}/#equipment/${expected.routeOwner.itemId}`);
      await page.locator('#referenceDetail .detail-card').waitFor();
      const comparisonRow = page.locator(`.suggested-price li:nth-child(${expected.comparisonIndex + 1})`);
      await comparisonRow.locator('[data-inline-source]').click();
      const dialog = page.locator('dialog.source-viewer[open]');
      await dialog.waitFor();
      await page.waitForFunction(() => document.querySelector('.source-viewer-labels')?.innerText.startsWith('Field target:'));

      const actualCaption = (await dialog.locator('.source-viewer-labels').innerText()).trim();
      const displayedSourceItem = (await dialog.locator('.source-viewer-item').innerText()).trim();
      const route = new URL(page.url());
      const routeParams = new URLSearchParams(route.hash.split('?')[1] || '');
      const viewportState = await page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth}));

      assert.equal(actualCaption, expected.expectedViewerCaption, `${viewport.name}: ${expected.routeOwner.itemId}${expected.fieldPointer} caption`);
      assert.equal(displayedSourceItem, expected.sourceItem.name, `${viewport.name}: comparator item remains the citation source owner`);
      assert.equal(route.hash.split('?')[0], `#equipment/${expected.routeOwner.itemId}`, `${viewport.name}: route keeps the estimate as the origin`);
      assert.equal(routeParams.get('source'), `${expected.comparisonValue.book}:${expected.comparisonValue.pages[0]}`);
      assert.equal(routeParams.get('field'), expected.fieldPointer);
      assert.equal(routeParams.get('owner'), `equipment:${expected.sourceItem.itemId}`);
      assert.equal(routeParams.get('region'), expected.evidence.regionIds[0]);
      assert.equal(routeParams.get('target'), null, 'the reviewed comparator target remains resolved');
      assert.ok(viewportState.scrollWidth <= viewportState.width + 1, `${viewport.name}: comparator caption has no horizontal overflow`);

      await page.reload();
      await page.locator('dialog.source-viewer[open]').waitFor();
      await page.waitForFunction(() => document.querySelector('.source-viewer-labels')?.innerText.startsWith('Field target:'));
      const afterReloadCaption = (await page.locator('.source-viewer-labels').innerText()).trim();
      assert.equal(afterReloadCaption, expected.expectedViewerCaption, `${viewport.name}: caption survives reload`);
      assert.equal(new URL(page.url()).hash, route.hash, `${viewport.name}: deep link remains exact after reload`);
      results.push({viewport: viewport.name, routeOwner: expected.routeOwner.itemId, fieldPointer: expected.fieldPointer, sourceOwner: expected.sourceItem.itemId, caption: actualCaption, regionId: expected.evidence.regionIds[0], route: route.hash, afterReloadCaption, scrollWidth: viewportState.scrollWidth, viewportWidth: viewportState.width});
      await page.goto(`http://127.0.0.1:${server.address().port}/#equipment/${expected.routeOwner.itemId}`);
      await page.locator('#referenceDetail .detail-card').waitFor();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({baselineHead: fixture.base.head, baselineDataSha256: fixture.base.sourceData.sha256, historicalFailureArtifact: fixture.historicalKnownFailure.path, historicalFallbackCount: fixture.historicalKnownFailure.captionFallback.length, currentComparatorCount: actualTargets.length, browserChecks: results.length, errors, results}, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
