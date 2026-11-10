// Read-only browser harness for the two DMG p.225 thieves-tools continuation groups.
// Usage after the parent confirms the dist refresh is complete:
//   node research/dmg175-unlinked-pair-runtime-review-v1/run-real-dist-browser-review.mjs <frozen-input-pins.json> <new-result.json>
// The pins file must be created from the exact post-assembly inputs; this script
// refuses missing or stale pins before it starts a browser. It serves the actual
// dist directory and does not intercept or synthesize application/data responses.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); }
catch { ({chromium} = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const distRoot = path.join(repoRoot, 'dist');
const [pinsPathArg, resultPathArg] = process.argv.slice(2);
assert.ok(pinsPathArg && resultPathArg, 'pass a frozen post-assembly input-pins JSON and a new output path');
const pinsPath = path.resolve(pinsPathArg), resultPath = path.resolve(resultPathArg);
assert.ok(!resultPath.startsWith(distRoot + path.sep), 'result must not be written into dist');
const pinsBytes = await readFile(pinsPath);
const pins = JSON.parse(pinsBytes.toString('utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(pins.artifactType, 'dmg225-cross-pair-runtime-input-pins-v1');
assert.equal(pins.sourceCommit, execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repoRoot, encoding: 'utf8'}).trim());

const owner = {collection: 'equipment', itemId: 'phb-thieves-tools'};
const fieldLabel = 'Encumbrance treatment (DMG p.225)';
const fieldPointer = `/fields/${fieldLabel}`;
const expectedGroups = [
  {id: 'batch5-cont-dmg-p225-phb-thieves-tools', regions: ['dmg-225-e8ddcda7bb0d9586', 'dmg-225-90b02a4c3e47a923']},
  {id: 'pass8-dmg225-thieves-tools-exclusion-context', regions: ['pass8-dmg225-thieves-tools-exclusion-lead-in', 'pass8-dmg225-thieves-tools-exclusion-list-item']},
];
const requiredFiles = [
  'index.html', 'app.js', 'books.js', 'citations.js', 'search.js', 'source-viewer.js',
  'source-viewer.css', 'styles.css', 'data.json', 'source-continuations.json',
  'scans/verified/equipment-phb-thieves-tools.json',
  'scans/verified/dmg-225-e8ddcda7bb0d9586.png',
  'scans/verified/dmg-225-03c363a115c57487.png',
  'scans/verified/dmg-225-90b02a4c3e47a923.png',
];
assert.deepEqual(Object.keys(pins.distFiles).sort(), [...requiredFiles].sort(), 'pins must cover every served code/data/catalog/image input and no unspecified asset');
const bytesByPath = new Map();
for (const relative of requiredFiles) {
  const bytes = await readFile(path.join(distRoot, relative));
  assert.equal(hash(bytes), pins.distFiles[relative], `stale or mismatched dist input: ${relative}`);
  bytesByPath.set(relative, bytes);
}
for (const [relative, expected] of Object.entries(pins.researchFiles || {})) {
  const bytes = await readFile(path.join(repoRoot, relative));
  assert.equal(hash(bytes), expected, `stale or mismatched research input: ${relative}`);
}

const data = JSON.parse(bytesByPath.get('data.json').toString('utf8'));
const item = data.equipment.find(entry => entry.id === owner.itemId);
assert.ok(item, 'target equipment owner exists');
const binding = item.fieldSources?.[fieldLabel]?.evidenceBindings?.find(entry => entry.fieldPointer === fieldPointer);
assert.ok(binding, 'the exact encumbrance field binding exists');
assert.deepEqual(binding.sourceOwner, owner);
assert.equal(binding.book, 'DMG');
assert.equal(binding.printedPage, 225);
assert.equal(binding.pdfPage, 225);
assert.equal(binding.catalog, 'scans/verified/equipment-phb-thieves-tools.json');
assert.deepEqual(binding.regionIds, expectedGroups[1].regions);

const manifest = JSON.parse(bytesByPath.get('source-continuations.json').toString('utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.groups.length, pins.expectedGroupCount);
for (const expected of expectedGroups) {
  const group = manifest.groups.find(entry => entry.id === expected.id);
  assert.ok(group, `runtime projection contains ${expected.id}`);
  assert.equal(group.collection, owner.collection);
  assert.equal(group.itemId, owner.itemId);
  assert.equal(group.catalog, 'scans/verified/equipment-phb-thieves-tools.json');
  assert.deepEqual([...group.segments].sort((a,b) => a.order - b.order).map(segment => segment.regionId), expected.regions);
}
const catalog = JSON.parse(bytesByPath.get('scans/verified/equipment-phb-thieves-tools.json').toString('utf8'));
assert.equal(catalog.collection, owner.collection);
assert.equal(catalog.itemId, owner.itemId);
for (const regionId of new Set(expectedGroups.flatMap(group => group.regions))) {
  const region = catalog.regions.find(candidate => candidate.id === regionId);
  assert.ok(region, `catalog contains ${regionId}`);
  assert.equal(region.book, 'DMG');
  assert.equal(region.printedPage, 225);
  assert.equal(region.pdfPage, 225);
  assert.ok(region.image && region.sha256);
}

const served = new Map();
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(distRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(distRoot + path.sep)) throw new Error('path outside dist');
    const bytes = await readFile(file);
    const relative = path.relative(distRoot, file).split(path.sep).join('/');
    served.set(relative, hash(bytes));
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(bytes);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
const cases = [];
const errors = [];
const failures = [];
const historyCloseTraces = [];
function deepLink(group, regionId, includeField = false) {
  const params = new URLSearchParams({source: 'DMG:225', region: regionId});
  if (includeField) params.set('field', fieldPointer);
  return `${base}#equipment/${encodeURIComponent(owner.itemId)}?${params}`;
}
async function assertRenderedGroup(page, group, selectedRegion) {
  const dialog = page.locator('dialog.source-viewer[open]');
  await dialog.waitFor();
  await dialog.locator('.source-viewer-linked-part').nth(1).waitFor();
  const actual = await dialog.locator('.source-viewer-linked-part').evaluateAll(nodes => nodes.map(node => ({
    regionId: node.dataset.regionId,
    role: node.dataset.role,
    selected: node.dataset.selected,
    printedPage: node.dataset.printedPage,
    images: [...node.querySelectorAll('img')].map(img => ({src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight})),
  })));
  assert.deepEqual(actual.map(part => part.regionId), group.regions, `${group.id} ordered parts`);
  assert.deepEqual(actual.map(part => part.role), ['opening', 'continuation']);
  assert.equal(actual.filter(part => part.selected === 'true').length, 1);
  assert.equal(actual.find(part => part.selected === 'true').regionId, selectedRegion);
  for (const part of actual) {
    assert.equal(part.printedPage, '225');
    assert.equal(part.images.length, 1);
    assert.ok(part.images[0].width > 0 && part.images[0].height > 0, `${part.regionId} image decoded`);
    assert.ok(part.images[0].src.endsWith(catalog.regions.find(region => region.id === part.regionId).image));
  }
  assert.match(await dialog.locator('.source-viewer-page-title').innerText(), /Dungeon Masters Guide · printed p\. 225 · PDF page 225/);
  return dialog;
}
async function pageAt(viewport) {
  const page = await browser.newPage({viewport, permissions: ['clipboard-read', 'clipboard-write']});
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push({width: viewport.width, message: error.message}));
  return page;
}
async function capturePageState(page) {
  return page.evaluate(() => {
    let historyState;
    try { historyState = history.state == null ? null : JSON.parse(JSON.stringify(history.state)); }
    catch { historyState = String(history.state); }
    const dialog = document.querySelector('dialog.source-viewer');
    return {
      url: location.href,
      hash: location.hash,
      historyLength: history.length,
      historyState,
      dialogPresent: Boolean(dialog),
      dialogOpen: Boolean(dialog?.open),
    };
  });
}
async function tracePageState(trace, step, page) {
  trace.snapshots.push({step, ...(await capturePageState(page))});
}
function linkRequestsSourceViewer(url) {
  const hashQuery = String(url).split('?')[1] || '';
  return new URLSearchParams(hashQuery).has('source');
}

try {
  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
    // Exercise the actual owner field chip, its two alias targets, copy, and history.
    const fieldPage = await pageAt(viewport);
    const ownerUrl = `${base}#equipment/${encodeURIComponent(owner.itemId)}`;
    const fieldTrace = {viewport: viewport.width, routeKind: 'owner-field-chip', groupId: expectedGroups[1].id, snapshots: []};
    await fieldPage.goto(ownerUrl);
    await tracePageState(fieldTrace, 'owner-loaded', fieldPage);
    const fieldSummary = fieldPage.locator('details.attribute-citations > summary');
    await fieldSummary.waitFor({state: 'visible'});
    await fieldSummary.click();
    const fieldButton = fieldPage.locator('[data-inline-source][data-ref-title*="Encumbrance treatment (DMG p.225)"]');
    await fieldButton.waitFor({state: 'visible'});
    await fieldButton.click();
    const fieldDialog = await assertRenderedGroup(fieldPage, expectedGroups[1], expectedGroups[1].regions[0]);
    await tracePageState(fieldTrace, 'field-chip-opened', fieldPage);
    const fieldUrl = new URL(fieldPage.url());
    assert.equal(fieldUrl.hash.includes(`field=${encodeURIComponent(fieldPointer)}`), true);
    assert.equal(new URLSearchParams(fieldUrl.hash.split('?')[1]).get('region'), expectedGroups[1].regions[0]);
    await fieldDialog.getByRole('button', {name: 'Copy link to this source page'}).click();
    const copiedFieldUrl = await fieldPage.evaluate(() => navigator.clipboard.readText());
    const copiedField = new URL(copiedFieldUrl);
    assert.equal(new URLSearchParams(copiedField.hash.split('?')[1]).get('field'), fieldPointer);
    assert.equal(new URLSearchParams(copiedField.hash.split('?')[1]).get('region'), expectedGroups[1].regions[0]);
    const pastedPage = await pageAt(viewport);
    await pastedPage.goto(copiedFieldUrl);
    await assertRenderedGroup(pastedPage, expectedGroups[1], expectedGroups[1].regions[0]);
    await pastedPage.close();
    await fieldPage.goBack();
    await fieldPage.waitForFunction(() => !document.querySelector('dialog.source-viewer')?.open);
    assert.equal(fieldPage.url(), ownerUrl);
    await tracePageState(fieldTrace, 'back-to-owner', fieldPage);
    await fieldPage.goForward();
    await assertRenderedGroup(fieldPage, expectedGroups[1], expectedGroups[1].regions[0]);
    await tracePageState(fieldTrace, 'forward-to-source', fieldPage);
    await fieldPage.locator('.source-viewer-close').click();
    await tracePageState(fieldTrace, 'close-click-immediate', fieldPage);
    await fieldPage.waitForFunction(() => !document.querySelector('dialog.source-viewer')?.open);
    await tracePageState(fieldTrace, 'dialog-closed', fieldPage);
    await fieldPage.waitForTimeout(250);
    const fieldSettled = await capturePageState(fieldPage);
    fieldTrace.snapshots.push({step: 'close-after-250ms', ...fieldSettled});
    if (fieldSettled.url !== ownerUrl) failures.push({
      viewport: viewport.width,
      operation: 'owner-field chip close URL cleanup',
      groupId: expectedGroups[1].id,
      expectedUrl: ownerUrl,
      actualUrl: fieldSettled.url,
      stateAfter250ms: fieldSettled,
    });
    await fieldPage.reload();
    await fieldPage.waitForTimeout(500);
    const fieldReloaded = await capturePageState(fieldPage);
    fieldTrace.snapshots.push({step: 'reload-after-close', expectedDialogOpen: linkRequestsSourceViewer(fieldReloaded.url), ...fieldReloaded});
    if (fieldReloaded.dialogOpen !== linkRequestsSourceViewer(fieldReloaded.url)) failures.push({
      viewport: viewport.width,
      operation: 'owner-field chip reload dialog state',
      groupId: expectedGroups[1].id,
      expectedDialogOpen: linkRequestsSourceViewer(fieldReloaded.url),
      actualDialogOpen: fieldReloaded.dialogOpen,
      stateAfterReload: fieldReloaded,
    });
    if (fieldReloaded.dialogOpen) await assertRenderedGroup(fieldPage, expectedGroups[1], expectedGroups[1].regions[0]);
    historyCloseTraces.push(fieldTrace);
    cases.push({viewport: viewport.width, operation: 'owner-field chip, alias pair, copied direct load, back/forward, and close', groupId: expectedGroups[1].id});
    await fieldPage.close();

    // Exercise every explicit region permalink in both old and new groups.
    for (const group of expectedGroups) {
      for (const selectedRegion of group.regions) {
        const page = await pageAt(viewport);
        const routeTrace = {viewport: viewport.width, routeKind: 'direct-permalink', groupId: group.id, selectedRegion, snapshots: []};
        await page.goto(ownerUrl);
        await tracePageState(routeTrace, 'owner-loaded', page);
        await page.goto(deepLink(group, selectedRegion, group.id === expectedGroups[1].id));
        const dialog = await assertRenderedGroup(page, group, selectedRegion);
        await tracePageState(routeTrace, 'direct-link-opened', page);
        await dialog.getByRole('button', {name: 'Copy link to this source page'}).click();
        const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
        const copiedParams = new URLSearchParams(new URL(copiedUrl).hash.split('?')[1]);
        assert.equal(copiedParams.get('source'), 'DMG:225');
        assert.equal(copiedParams.get('region'), selectedRegion);
        if (group.id === expectedGroups[1].id) assert.equal(copiedParams.get('field'), fieldPointer);
        await page.goBack();
        await page.waitForFunction(() => !document.querySelector('dialog.source-viewer')?.open);
        assert.equal(page.url(), ownerUrl);
        await tracePageState(routeTrace, 'back-to-owner', page);
        await page.goForward();
        await assertRenderedGroup(page, group, selectedRegion);
        await tracePageState(routeTrace, 'forward-to-direct-link', page);
        await page.locator('.source-viewer-close').click();
        await tracePageState(routeTrace, 'close-click-immediate', page);
        await page.waitForFunction(() => !document.querySelector('dialog.source-viewer')?.open);
        await tracePageState(routeTrace, 'dialog-closed', page);
        await page.waitForTimeout(250);
        const settledAfterClose = await capturePageState(page);
        routeTrace.snapshots.push({step: 'close-after-250ms', ...settledAfterClose});
        if (settledAfterClose.url !== ownerUrl) failures.push({
          viewport: viewport.width,
          operation: 'direct permalink close URL cleanup',
          groupId: group.id,
          selectedRegion,
          expectedUrl: ownerUrl,
          actualUrl: settledAfterClose.url,
          stateAfter250ms: settledAfterClose,
        });
        await page.reload();
        await page.waitForTimeout(500);
        const reloaded = await capturePageState(page);
        routeTrace.snapshots.push({step: 'reload-after-close', expectedDialogOpen: linkRequestsSourceViewer(reloaded.url), ...reloaded});
        if (reloaded.dialogOpen !== linkRequestsSourceViewer(reloaded.url)) failures.push({
          viewport: viewport.width,
          operation: 'direct permalink reload dialog state',
          groupId: group.id,
          selectedRegion,
          expectedDialogOpen: linkRequestsSourceViewer(reloaded.url),
          actualDialogOpen: reloaded.dialogOpen,
          stateAfterReload: reloaded,
        });
        if (reloaded.dialogOpen) await assertRenderedGroup(page, group, selectedRegion);
        historyCloseTraces.push(routeTrace);
        cases.push({viewport: viewport.width, operation: 'direct permalink, copy, back/forward, close', groupId: group.id, selectedRegion});
        await page.close();
      }
    }
  }
  assert.deepEqual(errors, [], 'browser emitted no page errors');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

for (const [relative, expectedHash] of Object.entries(pins.distFiles)) {
  assert.equal(hash(await readFile(path.join(distRoot, relative))), expectedHash, `dist input changed during browser review: ${relative}`);
}
for (const [relative, expectedHash] of Object.entries(pins.researchFiles || {})) {
  assert.equal(hash(await readFile(path.join(repoRoot, relative))), expectedHash, `research input changed during browser review: ${relative}`);
}
const result = {
  artifactType: 'dmg225-cross-pair-runtime-review-result-v2',
  passed: failures.length === 0,
  sourceCommit: pins.sourceCommit,
  expectedPinsPath: path.relative(repoRoot, pinsPath),
  expectedPinsSha256: hash(pinsBytes),
  owner,
  fieldPointer,
  groups: expectedGroups,
  cases,
  failures,
  historyCloseTraces,
  browserErrors: errors,
  servedAssets: [...served.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([file, sha256]) => ({file, sha256})),
  servedFromActualDist: true,
  requestInterception: false,
  note: 'Runtime routing/selection proof only. This does not review source meaning, field values, source grades, or group/default semantics.'
};
await writeFile(resultPath, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({passed: result.passed, cases: cases.length, failures: failures.length, resultPath, servedAssets: served.size}));
