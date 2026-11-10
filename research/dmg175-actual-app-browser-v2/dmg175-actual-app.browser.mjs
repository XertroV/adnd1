// Actual compiled-site D175 browser proof. This runner never serves a fixture,
// injects data, intercepts requests, or starts a server.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const FIXTURE_PATH = resolve(HERE, '../dmg175-actual-app-browser-v1/expected-controls-v1.json');
const FIXTURE_SHA = 'ed18ac3efa7bca3f7e845dda5f16eb32fc11224048f16ac5474330ffd3905d3e';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(resolve(ROOT, path));
const fixtureBytes = readFileSync(FIXTURE_PATH);
assert.equal(hash(fixtureBytes), FIXTURE_SHA, 'the frozen expected-control fixture changed');
const fixture = JSON.parse(fixtureBytes.toString('utf8'));
assert.equal(fixture.status, 'frozen-source-side-expectations; browser-not-run');
const gatePath = process.env.DMG175_RUN_GATE_PATH;
assert.ok(gatePath, 'Set DMG175_RUN_GATE_PATH to the root-provided final assembled-dist gate before running this browser proof.');
const gate = JSON.parse(readFileSync(gatePath, 'utf8'));
assert.equal(gate.artifactType, 'dmg175-actual-app-final-runtime-gate');
assert.equal(gate.status, 'ready', 'browser run is blocked until the exact assembled dist is ready');
assert.equal(gate.expectedFixtureSha256, FIXTURE_SHA, 'run gate must bind this exact frozen fixture');
for (const pin of fixture.assetPins.authoredInputs) assert.equal(hash(read(pin.path)), pin.sha256, `authored input changed after fixture freeze: ${pin.path}`);
for (const pin of fixture.assetPins.catalogs) assert.equal(hash(read(pin.path)), pin.sha256, `source catalog changed after fixture freeze: ${pin.path}`);
for (const pin of fixture.assetPins.selectedTestImages) assert.equal(hash(read(pin.path)), pin.sha256, `selected source image changed after fixture freeze: ${pin.path}`);
for (const pin of fixture.assetPins.allCatalogImages) assert.equal(hash(read(pin.path)), pin.sha256, `catalog image changed after fixture freeze: ${pin.path}`);

const requiredAssets = new Set([
  'index.html', 'styles.css', 'source-viewer.css', 'app.js', 'books.js', 'citations.js',
  'search.js', 'source-viewer.js', 'data.json', 'source-continuations.json',
  ...fixture.assetPins.catalogs.map(pin => pin.path.replace(/^dist\//, '')),
  ...fixture.assetPins.allCatalogImages.map(pin => pin.path.replace(/^dist\//, '')),
]);
const base = (process.env.TEST_URL || 'http://127.0.0.1:8778').replace(/\/$/, '');
assert.ok(/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(base) || /^http:\/\/localhost(?::\d+)?$/.test(base), 'serve only the local compiled dist');
const resultPath = resolve(ROOT, process.env.BROWSER_RESULT_PATH || 'research/dmg175-actual-app-browser-v2/actual-app-browser-result-v2.json');
const evidenceDir = resolve(process.env.BROWSER_EVIDENCE_DIR || '/workspace/vault-audit-private/pass8/root/dmg175-actual-app-browser-v1');
assert.ok(isAbsolute(evidenceDir));
mkdirSync(dirname(resultPath), {recursive: true});
mkdirSync(evidenceDir, {recursive: true});

const result = {
  schemaVersion: 1,
  artifactType: 'dmg175-actual-compiled-app-browser-result',
  status: 'running',
  startedAt: new Date().toISOString(),
  base,
  runner: {path: relative(ROOT, fileURLToPath(import.meta.url)).split(sep).join('/'), sha256: hash(readFileSync(fileURLToPath(import.meta.url)))},
  expectedFixture: {path: relative(ROOT, FIXTURE_PATH).split(sep).join('/'), sha256: FIXTURE_SHA},
  runGate: {path: gatePath, sha256: hash(readFileSync(gatePath))},
  policy: 'Actual compiled static assets served from dist with no request interception, fixture overlay, synthetic owner, data injection, server startup, or production mutation.',
  matchedAssets: [],
  checks: [],
  controlTargets: {expected: fixture.counts.pendingTargets, observed: 0, clicked: 0},
  continuationViews: [],
  screenshotsPrivate: [],
  pageErrors: [],
  consoleErrors: [],
  httpErrors: [],
  requestErrors: [],
};
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; result.checks.push(label); };

function normalizeTarget(target) {
  const output = {};
  for (const key of [
    'book', 'page', 'pdfPage', 'fieldPointer', 'fieldOwner', 'sourceOwner', 'sourceObject',
    'sourceCategory', 'catalog', 'regionIds', 'reviewStatus', 'targetStatus',
    'contextStatus', 'contextLimitations',
  ]) if (Object.hasOwn(target, key)) output[key] = target[key];
  return output;
}
function sameJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function sourceRoute(hashText) {
  const query = new URLSearchParams((hashText.split('?')[1] || '').replaceAll('&amp;', '&'));
  return {ownerRoute: hashText.split('?')[0], source: query.get('source'), region: query.get('region'), target: query.get('target'), field: query.get('field'), owner: query.get('owner')};
}
function controlKey(target) { return `${target.fieldOwner?.collection}:${target.fieldOwner?.itemId}\0${target.fieldPointer}\0${target.book}:${target.page}\0${target.regionIds?.join(',')}`; }
function controlMap() { return new Map(fixture.controls.map(control => [controlKey(control.expectedTarget), control])); }
const expectedByKey = controlMap();
assert.equal(expectedByKey.size, 120, 'fixture target tuple keys must be unique');

async function checkServedAssets() {
  const declared = gate.distAssets;
  assert.ok(declared && typeof declared === 'object' && !Array.isArray(declared), 'run gate requires a path-to-SHA distAssets map');
  for (const path of requiredAssets) {
    const expected = declared[path];
    assert.match(expected || '', /^[a-f0-9]{64}$/, `run gate omits exact dist asset hash: ${path}`);
    const localPath = resolve(ROOT, 'dist', path);
    const localHash = hash(readFileSync(localPath));
    assert.equal(localHash, expected, `local dist asset differs from final run gate: ${path}`);
    const response = await fetch(new URL(path, `${base}/`), {method: 'GET', redirect: 'error'});
    assert.equal(response.status, 200, `compiled asset returned HTTP ${response.status}: ${path}`);
    const responseHash = hash(Buffer.from(await response.arrayBuffer()));
    assert.equal(responseHash, expected, `HTTP server did not return the exact gated dist asset: ${path}`);
    result.matchedAssets.push({path, sha256: responseHash});
  }
  check(true, `served actual dist assets match final gate (${requiredAssets.size} assets)`);
}

function checkCompiledOwnerBindings(compiledData) {
  assert.ok(Array.isArray(compiledData.rules), 'compiled data has rules collection');
  const owners = new Map(compiledData.rules.map(item => [item.id, item]));
  let matched = 0;
  for (const control of fixture.controls) {
    const owner = owners.get(control.ownerId);
    assert.ok(owner, `compiled data missing owner ${control.ownerId}`);
    const sourceObject = pointerGet(owner, control.sourceObjectPointer);
    assert.ok(sourceObject && typeof sourceObject === 'object' && !Array.isArray(sourceObject), `${control.ownerId}${control.sourceObjectPointer} must resolve to an object`);
    if (control.kind === 'table-row') {
      assert.equal(sourceObject.book, 'DMG');
      assert.equal(sourceObject.printedPage, control.printedPage);
      assert.equal(sourceObject.pdfPage, control.pdfPage);
      assert.equal(sourceObject.catalog, control.catalog);
      assert.equal(sourceObject.sourceFocusId, control.regionId);
      assert.equal(sourceObject.imageSha256, control.imageSha256);
      for (const [key, value] of Object.entries(control.sourceReference)) assert.equal(sourceObject[key], value, `${control.ownerId}${control.sourceObjectPointer}: source identity ${key}`);
    } else {
      assert.equal(sourceObject.book, 'DMG');
      assert.ok(sourceObject.pages?.includes(control.printedPage));
      assert.ok(sourceObject.verification?.regions?.includes(control.regionId), `${control.ownerId}${control.sourceObjectPointer}: bullet passage names the expected region`);
    }
    const attached = (sourceObject.evidenceBindings || []).filter(binding => binding.collection === 'rules'
      && binding.itemId === control.ownerId && binding.fieldPointer === control.fieldPointer
      && binding.sourceObjectPointer === control.sourceObjectPointer && binding.book === 'DMG'
      && binding.printedPage === control.printedPage && binding.pdfPage === control.pdfPage
      && binding.catalog === control.catalog && sameJson(binding.regionIds, [control.regionId])
      && binding.reviewStatus === 'field-target-pending' && binding.targetReview == null
      && binding.sourceValueStatus === 'not-assessed-by-field-target-review'
      && binding.sourceOwner?.collection === 'rules' && binding.sourceOwner?.itemId === control.ownerId);
    assert.equal(attached.length, 1, `compiled data must attach exactly one native pending binding at ${control.ownerId}${control.sourceObjectPointer}`);
    matched++;
  }
  assert.equal(matched, 120);
  check(matched === fixture.counts.pendingTargets, 'served compiled data retains every fixed native owner/source-object binding exactly once');
}

function pointerGet(value, pointer) {
  for (const part0 of pointer.split('/').slice(1)) {
    const part = part0.replaceAll('~1', '/').replaceAll('~0', '~');
    value = Array.isArray(value) ? value[Number(part)] : value?.[part];
  }
  return value;
}

async function recordScreenshot(page, label) {
  const path = resolve(evidenceDir, `${label}.png`);
  await page.screenshot({path, fullPage: true});
  const bytes = readFileSync(path);
  result.screenshotsPrivate.push({label, privatePath: path, sha256: hash(bytes), sizeBytes: bytes.length});
}

async function wirePage(page, label) {
  page.on('pageerror', error => result.pageErrors.push({label, message: String(error)}));
  page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push({label, message: message.text()}); });
  page.on('response', response => { if (response.status() >= 400) result.httpErrors.push({label, url: response.url(), status: response.status()}); });
  page.on('requestfailed', request => result.requestErrors.push({label, url: request.url(), failure: request.failure()?.errorText || 'unknown'}));
}

async function waitOwner(page, ownerId) {
  await page.locator('#referenceDetail h2').waitFor({state: 'visible'});
  await page.waitForFunction(id => location.hash.split('?')[0] === `#rules/${id}`, ownerId);
}
async function directOwner(page, ownerId, label) {
  await page.goto(`${base}/#rules/${encodeURIComponent(ownerId)}`);
  await waitOwner(page, ownerId);
  check((await page.locator('#referenceDetail h2').innerText()).trim() === fixture.ownerCounts[ownerId].title, `${label}: direct route opens ${ownerId}`);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: ${ownerId} has no document-width overflow`);
}
async function searchOwner(page, ownerId, label, mobile = false) {
  const title = fixture.ownerCounts[ownerId].title;
  await page.goto(`${base}/#rules`);
  await page.locator(mobile ? '#mobileSearchOpen' : '#paletteOpen').click();
  await page.locator('#commandInput').fill(title);
  await page.locator('#commandResults [role="option"]').first().waitFor();
  const matching = await page.locator('#commandResults [role="option"]').evaluateAll((nodes, expectedTitle) => nodes.map((node, index) => {
    const titleNode = node.querySelector('.result-title');
    const titleText = titleNode?.firstChild?.textContent?.trim() || '';
    return {index, titleText, fullText: titleNode?.innerText?.trim() || ''};
  }).filter(item => item.titleText === expectedTitle || item.fullText.startsWith(expectedTitle)), title);
  assert.ok(matching.length, `${label}: title search returns the exact ${ownerId} card`);
  await page.locator(`#commandResults [data-command-index="${matching[0].index}"]`).click();
  await waitOwner(page, ownerId);
  check((await page.locator('#referenceDetail h2').innerText()).trim() === title, `${label}: search selection opens exact ${ownerId}`);
}

async function loadSourceViewer(page) {
  const dialog = page.locator('dialog.source-viewer[open]');
  await dialog.waitFor({state: 'visible'});
  await page.waitForFunction(() => {
    const dialog = document.querySelector('dialog.source-viewer[open]');
    return !!dialog && !/Loading|Rendering/.test(dialog.querySelector('.source-viewer-status')?.textContent || '');
  });
  return dialog;
}
async function closeSourceViewer(page, returnControl = null) {
  await page.locator('dialog.source-viewer[open] .source-viewer-close').click();
  await page.waitForFunction(() => !document.querySelector('dialog.source-viewer[open]'));
  if (returnControl) {
    const restored = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() || '');
    assert.ok(restored === returnControl.ariaLabel || restored.includes(returnControl.text), 'closing source viewer restores focus to its opener');
    checks++; result.checks.push('source viewer close restores focus to the activating pending field button');
  }
}

async function inspectAllControls(page) {
  const grouped = new Map();
  for (const id of Object.keys(fixture.ownerCounts)) {
    await page.goto(`${base}/#rules/${encodeURIComponent(id)}`);
    await waitOwner(page, id);
    const tableButtons = page.locator('.table-row-source');
    const bulletButtons = page.locator('.bullet-source-chip');
    const expectedOwner = fixture.ownerCounts[id];
    assert.equal(await tableButtons.count(), expectedOwner.tableRows, `${id}: row chip count`);
    assert.equal(await bulletButtons.count(), expectedOwner.bulletTargets, `${id}: bullet chip count`);
    const selectors = [
      ...Array.from({length: await tableButtons.count()}, (_, index) => ({kind: 'table-row', index, selector: '.table-row-source'})),
      ...Array.from({length: await bulletButtons.count()}, (_, index) => ({kind: 'bullet', index, selector: '.bullet-source-chip'})),
    ];
    for (const entry of selectors) {
      const button = page.locator(entry.selector).nth(entry.index);
      const actual = await button.evaluate(node => ({
        ariaLabel: node.getAttribute('aria-label') || '',
        text: node.textContent.trim(),
        targets: JSON.parse(node.dataset.refTargets || '[]'),
      }));
      assert.equal(actual.targets.length, 1, `${id} ${entry.kind} chip exposes one owner-scoped target`);
      const target = normalizeTarget(actual.targets[0]);
      const key = controlKey(target);
      const expected = expectedByKey.get(key);
      assert.ok(expected, `no frozen expectation for rendered target ${key}`);
      assert.equal(expected.ownerId, id);
      assert.equal(expected.kind, entry.kind);
      assert.ok(sameJson(target, expected.expectedTarget), `${id}${expected.fieldPointer}: rendered target tuple matches frozen source declaration`);
      assert.equal(actual.targets[0].targetStatus, 'pending', `${id}${expected.fieldPointer}: source target remains pending`);
      assert.equal(actual.targets[0].reviewStatus, 'field-target-pending');
      const record = {expected, selector: entry.selector, index: entry.index, ariaLabel: actual.ariaLabel, text: actual.text};
      assert.ok(!grouped.has(key), `duplicate visible chip for ${key}`);
      grouped.set(key, record);
    }
  }
  assert.equal(grouped.size, fixture.counts.pendingTargets, 'exactly 120 pending controls are visible across all owners');
  result.controlTargets.observed = grouped.size;
  check(grouped.size === 120, 'all87 row and33 bullet pending controls render with exact owner, field, page and excerpt identities');

  // Click each control, ensure the source route remains a pending field route,
  // and close it so keyboard focus returns to that exact control.
  for (const ownerId of Object.keys(fixture.ownerCounts)) {
    const ownerControls = [...grouped.entries()].filter(([, record]) => record.expected.ownerId === ownerId);
    await page.goto(`${base}/#rules/${encodeURIComponent(ownerId)}`);
    await waitOwner(page, ownerId);
    for (const [key, record] of ownerControls) {
      const button = page.locator(record.selector).nth(record.index);
      const actual = await button.evaluate(node => ({ariaLabel: node.getAttribute('aria-label') || '', text: node.textContent.trim(), targets: JSON.parse(node.dataset.refTargets || '[]')}));
      assert.equal(actual.targets.length, 1);
      assert.equal(controlKey(normalizeTarget(actual.targets[0])), key, `${key}: current owner DOM still exposes the fixed target`);
      await button.click();
      const dialog = await loadSourceViewer(page);
      const route = await page.evaluate(() => location.hash);
      const parsed = sourceRoute(route);
      const expected = record.expected;
      assert.equal(parsed.ownerRoute, `#rules/${expected.ownerId}`);
      assert.equal(parsed.source, `DMG:${expected.printedPage}`);
      assert.equal(parsed.target, 'pending');
      assert.equal(parsed.field, expected.fieldPointer);
      assert.equal(parsed.region, null, `${key}: a pending target must not select a source region`);
      const text = await dialog.innerText();
      assert.match(text, /no reviewed excerpt mapping yet/i, `${key}: pending route explains its target status`);
      assert.match(await dialog.locator('.source-viewer-page-title').innerText(), new RegExp(`printed p\\. ${expected.printedPage}(?:\\b| ·)`));
      if (expected.printedPage === 175) {
        const placeholder = await dialog.locator('.source-viewer-placeholder').innerText();
        assert.match(placeholder, /accepted supplemental image/i, `${key}: p.175 opens its accepted supplemental evidence status`);
        assert.match(placeholder, /no corresponding page exists in this PDF/i, `${key}: p.175 explains the PDF leaf omission without calling the source unavailable`);
      } else {
        assert.match(text, /PDF page 176|printed p\\. 176/i, `${key}: p.176 retains its canonical PDF page mapping`);
      }
      check(true, `${key}: actual source route identifies the correct page and keeps the field target pending`);
      if (result.controlTargets.clicked === 0) await recordScreenshot(page, 'desktop-first-pending-source-control');
      result.controlTargets.clicked++;
      await closeSourceViewer(page, {ariaLabel: record.ariaLabel, text: record.text});
    }
  }
}

async function openOwnerPageChip(page, ownerId, printedPage) {
  await page.goto(`${base}/#rules/${encodeURIComponent(ownerId)}`);
  await waitOwner(page, ownerId);
  const button = page.locator(`.detail-header [data-source-id="${ownerId}"][data-source-book="DMG"][data-source-page="${printedPage}"]`).first();
  await button.waitFor({state: 'visible'});
  await button.click();
  await loadSourceViewer(page);
  return button;
}

async function verifyContinuation(page, spec) {
  await openOwnerPageChip(page, spec.itemId, spec.openPage);
  const dialog = page.locator('dialog.source-viewer[open]');
  await page.waitForFunction(() => document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length === 2);
  const parts = await dialog.locator('.source-viewer-linked-part').evaluateAll(nodes => nodes.map(node => ({
    regionId: node.dataset.regionId,
    role: node.dataset.role,
    printedPage: Number(node.dataset.printedPage),
    selected: node.dataset.selected === 'true',
    label: node.querySelector('.source-viewer-linked-page')?.textContent?.trim() || '',
    images: [...node.querySelectorAll('img')].map(img => ({regionId: img.dataset.regionId || null, src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0})),
  })));
  assert.equal(parts.length, spec.physicalPartCount);
  for (let index = 0; index < parts.length; index++) {
    const expected = spec.physicalParts[index];
    assert.ok([expected.regionId, ...expected.focusAliasRegionIds].includes(parts[index].regionId), `${spec.id}: selected region is the declared segment or one of its focus aliases`);
    assert.equal(parts[index].role, expected.role);
    assert.equal(parts[index].printedPage, expected.printedPage);
    assert.ok(parts[index].images.length && parts[index].images.every(image => image.loaded), `${spec.id}: linked source images load`);
    if (expected.printedPage === 175) assert.match(parts[index].label, /supplemental source image.*original PDF omits this page/i);
    if (expected.printedPage === 176) assert.match(parts[index].label, /PDF page 176/i);
  }
  check(true, `${spec.id}: exactly two ordered physical passage parts load with correct source identities`);
  if (spec.id === 'appendix-c-character-levels-dmg-175-same-page-continuation') {
    assert.ok(parts.every(part => part.printedPage === 175 && /supplemental source image/.test(part.label)));
    result.continuationViews.push({id: spec.id, physicalPartCount: parts.length, pages: parts.map(part => part.printedPage), allSegmentsSupplemental175: true});
    await recordScreenshot(page, 'desktop-character-level-same-page-continuation');
  } else {
    const p175 = spec.physicalParts[0];
    assert.equal(p175.focusAliases.length, 12, 'p.175 Party Magic Items row aliases stay one physical segment');
    const selector = dialog.locator('#source-viewer-region');
    const options = await selector.locator('option').evaluateAll(nodes => nodes.map(option => ({value: option.value, label: option.textContent.trim()})));
    for (const alias of p175.focusAliases) {
      const option = options.find(candidate => candidate.label === alias.title);
      assert.ok(option, `p.175 row focus alias is selectable: ${alias.regionId}`);
      await selector.selectOption(option.value);
      await page.waitForFunction(id => document.querySelector('dialog.source-viewer[open] .source-viewer-linked-part[data-selected="true"]')?.dataset.regionId === id, alias.regionId);
      const selected = await dialog.locator('.source-viewer-linked-part[data-selected="true"]').getAttribute('data-region-id');
      assert.equal(selected, alias.regionId);
      assert.equal(await dialog.locator('.source-viewer-linked-part').count(), 2, 'row aliases do not fabricate extra physical continuation parts');
      assert.equal((await dialog.locator('.source-viewer-linked-part[data-selected="true"] img').first().getAttribute('src')).split('/').at(-1), alias.image);
    }
    const p176 = spec.physicalParts[1];
    assert.equal(p176.focusAliases.length, 1);
    await closeSourceViewer(page);
    await openOwnerPageChip(page, spec.itemId, 176);
    const secondDialog = page.locator('dialog.source-viewer[open]');
    await page.waitForFunction(() => document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length === 2);
    const p176Options = await secondDialog.locator('#source-viewer-region option').evaluateAll(nodes => nodes.map(option => ({value: option.value, label: option.textContent.trim()})));
    const advice = p176.focusAliases[0];
    const adviceOption = p176Options.find(candidate => candidate.label === advice.title);
    assert.ok(adviceOption, 'p.176 continuation advice alias is selectable');
    await secondDialog.locator('#source-viewer-region').selectOption(adviceOption.value);
    await page.waitForFunction(id => document.querySelector('dialog.source-viewer[open] .source-viewer-linked-part[data-selected="true"]')?.dataset.regionId === id, advice.regionId);
    assert.equal(await secondDialog.locator('.source-viewer-linked-part').count(), 2);
    await recordScreenshot(page, 'desktop-party-magic-distribution-two-page-continuation');
    result.continuationViews.push({id: spec.id, physicalPartCount: 2, p175RowAliasCount: p175.focusAliases.length, p176AdviceAliasCount: 1, pages: [175, 176]});
  }
  return dialog;
}

async function checkNavigation(page) {
  let opener = await openOwnerPageChip(page, 'appendix-c-character-levels', 175);
  let dialog = page.locator('dialog.source-viewer[open]');
  await page.waitForFunction(() => document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length === 2);
  await page.keyboard.press('Tab');
  check(await page.evaluate(() => document.querySelector('dialog.source-viewer[open]')?.contains(document.activeElement)), 'keyboard focus remains within the open source dialog');
  await closeSourceViewer(page, {ariaLabel: await opener.getAttribute('aria-label'), text: await opener.innerText()});

  opener = await openOwnerPageChip(page, 'appendix-c-character-levels', 175);
  dialog = page.locator('dialog.source-viewer[open]');
  await page.waitForFunction(() => document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length === 2);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await dialog.locator('[aria-label="Copy link to this source page"]').click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copied, /#rules\/appendix-c-character-levels\?source=DMG%3A175/);
  assert.ok(!/target=pending|&field=/.test(copied), 'page-level continuation link does not inherit a pending field route');
  check(true, 'continuation copy link preserves the owner and supplemental source page without field-target promotion');
  await page.reload();
  await page.locator('dialog.source-viewer[open]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length === 2);
  check(true, 'reload restores the exact two-part continuation viewer');
  await page.goBack();
  await page.waitForFunction(() => location.hash.split('?')[0] === '#rules/appendix-c-character-levels' && !document.querySelector('dialog.source-viewer[open]'));
  await page.goForward();
  await page.locator('dialog.source-viewer[open]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length === 2);
  check(true, 'Back and Forward restore the owner and the continuation source route');
  await closeSourceViewer(page);
}

async function main() {
  const dataResponse = await fetch(new URL('data.json', `${base}/`), {redirect: 'error'});
  assert.equal(dataResponse.status, 200);
  const compiledDataBytes = Buffer.from(await dataResponse.arrayBuffer());
  const gateDataHash = gate.distAssets['data.json'];
  assert.equal(hash(compiledDataBytes), gateDataHash, 'actual HTTP data.json hash matches the final assembled gate');
  checkCompiledOwnerBindings(JSON.parse(compiledDataBytes.toString('utf8')));
  await checkServedAssets();

  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const desktop = await browser.newPage({viewport: {width: 1440, height: 1000}});
    await wirePage(desktop, 'desktop');
    for (const ownerId of Object.keys(fixture.ownerCounts)) {
      await directOwner(desktop, ownerId, 'desktop');
      await searchOwner(desktop, ownerId, 'desktop search');
    }
    await inspectAllControls(desktop);
    for (const spec of fixture.continuations) await verifyContinuation(desktop, spec);
    await checkNavigation(desktop);
    await desktop.close();

    const mobile = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
    await wirePage(mobile, 'mobile');
    for (const ownerId of Object.keys(fixture.ownerCounts)) {
      await directOwner(mobile, ownerId, 'mobile');
      await searchOwner(mobile, ownerId, 'mobile search', true);
    }
    await openOwnerPageChip(mobile, 'appendix-c-party-magic-distribution', 175);
    const mobileDialog = mobile.locator('dialog.source-viewer[open]');
    await mobile.waitForFunction(() => document.querySelectorAll('dialog.source-viewer[open] .source-viewer-linked-part').length === 2);
    check(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile source viewer has no horizontal page overflow');
    check(await mobileDialog.locator('.source-viewer-linked-part').count() === 2, 'mobile continuation keeps its two physical source parts');
    await closeSourceViewer(mobile);
    await mobile.close();

    check(result.controlTargets.observed === 120 && result.controlTargets.clicked === 120, 'all 120 pending controls were verified through the actual viewer route');
    check(result.pageErrors.length === 0, 'desktop and mobile routes emit no JavaScript errors');
    check(result.consoleErrors.length === 0, 'desktop and mobile routes emit no console errors');
    check(result.httpErrors.length === 0, 'all compiled page and source assets load without HTTP errors');
    check(result.requestErrors.length === 0, 'all browser requests complete without failures');
    result.status = 'passed';
    result.finishedAt = new Date().toISOString();
    result.checkCount = checks;
    writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({status: result.status, resultPath, checkCount: checks, matchedAssets: result.matchedAssets.length, controls: result.controlTargets, continuationViews: result.continuationViews, privateScreenshots: result.screenshotsPrivate.map(({label, sha256, sizeBytes}) => ({label, sha256, sizeBytes}))}));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  result.status = 'failed';
  result.finishedAt = new Date().toISOString();
  result.failure = String(error?.stack || error);
  result.checkCount = checks;
  try { writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n'); } catch {}
  throw error;
});
