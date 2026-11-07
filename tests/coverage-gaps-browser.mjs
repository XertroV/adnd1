import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
const base = (process.env.TEST_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const outputPath = fileURLToPath(new URL('../test-results/coverage-gaps-browser.json', import.meta.url));
const errors = [];
const checks = [];
const failures = [];
const data = JSON.parse(readFileSync(new URL('../dist/data.json', import.meta.url), 'utf8'));
const offerSpecs = [
  {id: 'phb-sling-bullets-dozen', title: 'Sling & Bullets, dozen', status: 'previously-confirmed-review-stale', amount: /15\s*sp/i, unit: /dozen/i},
  {id: 'ua-quarrels-for-same', title: 'Quarrels for same', status: 'source-review-pending-provisional-bounds', amount: /100\s*gp/i, unit: /quantity|equivalence|unit.{0,20}(unknown|unresolved)|unknown.{0,20}quantity/i}
];
const routeTo = hash => `${base}/${hash.startsWith('#') ? hash : `#${hash}`}`;
const selectorValue = value => String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
const check = (name, ok, details = undefined) => {
  const result = {name, passed: !!ok, ...(details === undefined ? {} : {details})};
  checks.push(result);
  if (!ok) failures.push(result);
};
const waitForGapPage = async page => {
  await page.goto(routeTo('#sources'));
  await page.locator('#main h1').waitFor({timeout: 10000});
};
const waitForPayloadSettled = async page => page.waitForFunction(() => {
  const status = document.querySelector('#coverageGapsStatus')?.textContent?.trim() || '';
  return !!document.querySelector('#coverageGapsPanel [data-gap-id]') || !!status && !/loading/i.test(status);
}, {timeout: 10000}).then(() => true).catch(() => false);
const fetchPayload = async page => page.evaluate(async () => {
  const response = await fetch(new URL('coverage-gaps.json', document.baseURI), {cache: 'no-store'});
  return {ok: response.ok, status: response.status, payload: response.ok ? await response.json() : null};
});
const groupEntries = group => Array.isArray(group.entries) ? group.entries : [];
const entryText = entry => [entry.title, entry.status, entry.description, entry.sourceText, JSON.stringify(entry.sourceLocations || []), JSON.stringify(entry.links || [])].filter(Boolean).join(' ');
const entriesFrom = payload => Array.isArray(payload?.entries)
  ? payload.entries
  : (payload?.groups || []).flatMap(groupEntries);
const groupIdForEntry = (payload, entry) => (payload.groups || []).find(group => groupEntries(group).some(candidate => candidate.id === entry.id))?.id || entry.groupId || '';
const detailsFor = (page, id) => page.locator(`details[data-gap-group="${selectorValue(id)}"]`);
const entryFor = (page, id) => page.locator(`[data-gap-id="${selectorValue(id)}"]`);

async function main() {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  page.on('pageerror', error => errors.push(error.message));
  try {
    await waitForGapPage(page);
    const initialPayloadSettled = await waitForPayloadSettled(page);
    check('Sources settles its asynchronous gap payload before entry assertions', initialPayloadSettled);

    // These named regression checks run first so the pre-feature UI fails for the two lost offers,
    // rather than only reporting that the new sidecar contract is absent.
    for (const offer of offerSpecs) {
      const count = await entryFor(page, offer.id).count();
      check(`render missing offer ${offer.id} exactly once`, count === 1, {actualCount: count, expectedTitle: offer.title});
    }

    const status = await fetchPayload(page).catch(error => ({ok: false, status: 'fetch-error', error: error.message, payload: null}));
    check('coverage-gaps.json is available to the Sources view', status.ok, {status: status.status, error: status.error});
    if (status.ok && Array.isArray(status.payload?.groups)) {
      const payload = status.payload;
      const groups = payload.groups;
      const entries = entriesFrom(payload);
      const ids = entries.map(entry => entry.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      check('payload entry IDs are present and unique', ids.length > 0 && ids.every(id => typeof id === 'string' && id.length > 0) && duplicateIds.length === 0, {entryCount: ids.length, duplicateIds});

      const groupNodes = page.locator('#coverageGapsPanel details[data-gap-group]');
      check('Sources exposes one group disclosure per payload group', await groupNodes.count() === groups.length, {payloadGroups: groups.length, renderedGroups: await groupNodes.count()});
      for (const group of groups) {
        const groupId = group.id;
        const expectedCount = groupEntries(group).length;
        const detail = detailsFor(page, groupId);
        const rendered = await detail.count();
        const countText = rendered ? await detail.locator('[data-gap-count]').innerText().catch(() => '') : '';
        const displayedCount = Number.parseInt(countText.replaceAll(',', ''), 10);
        check(`group ${groupId} count matches its payload entries`, rendered === 1 && displayedCount === expectedCount,
          {expectedCount, displayedCount: Number.isFinite(displayedCount) ? displayedCount : null, rendered});
        if (rendered && !(await detail.evaluate(element => element.open))) await detail.locator('summary[data-gap-group-summary]').click();
      }

      for (const entry of entries) {
        const row = entryFor(page, entry.id);
        const count = await row.count();
        check(`payload entry ${entry.id} renders exactly once`, count === 1, {actualCount: count, groupId: groupIdForEntry(payload, entry)});
        if (count === 1) check(`payload entry ${entry.id} is accessible`, await row.isVisible());
        for (const link of entry.links || []) {
          const href = link.href;
          const safeRoute = typeof href === 'string' && /^#(?:spells|rules|equipment|classes)\/[a-z0-9-]+(?:\?.*)?$/.test(href);
          check(`entry ${entry.id} link has a safe in-app route`, safeRoute, {href});
          if (safeRoute && count === 1) {
            const anchor = row.locator(`a[href="${selectorValue(href)}"]`);
            check(`entry ${entry.id} link is rendered`, await anchor.count() === 1, {href, rendered: await anchor.count()});
          }
        }
      }

      for (const offer of offerSpecs) {
        const entry = entries.find(candidate => candidate.id === offer.id);
        const serialized = entry ? entryText(entry) : '';
        const quantityOK = offer.id === 'phb-sling-bullets-dozen'
          ? offer.unit.test(serialized)
          : offer.unit.test(serialized) && !/100\s*gp\s*(?:per|each|\/)\s*bolt/i.test(serialized);
        check(`${offer.id} retains its exact offer status, amount, and quantity limits`, !!entry
          && entry.status === offer.status && offer.amount.test(serialized) && quantityOK,
          {status: entry?.status, title: entry?.title, description: entry?.description});
        if (entry && await entryFor(page, offer.id).count() === 1) {
          const renderedText = await entryFor(page, offer.id).innerText();
          const readableStatus = offer.id === 'phb-sling-bullets-dozen' ? /fresh review|stale/i.test(renderedText) : /source review pending/i.test(renderedText);
          const visibleValue = offer.amount.test(renderedText) && offer.unit.test(renderedText);
          const noBoltPrice = offer.id !== 'ua-quarrels-for-same' || !/100\s*gp\s*(?:per|each|\/)\s*bolt/i.test(renderedText);
          check(`${offer.id} displays its status and source reading accessibly`, readableStatus && visibleValue && noBoltPrice,
            {renderedText});
        }
      }

      const expectedGroupCounts = {'formal-field-statuses': 33, 'recorded-review-notes': 78};
      for (const [groupId, count] of Object.entries(expectedGroupCounts)) {
        const group = groups.find(candidate => candidate.id === groupId);
        check(`${groupId} exposes the expected number of scoped entries`, !!group && groupEntries(group).length === count,
          {expected: count, actual: group ? groupEntries(group).length : null});
      }
      const formalGroup = groups.find(group => group.id === 'formal-field-statuses');
      const noteGroup = groups.find(group => group.id === 'recorded-review-notes');
      check('all 33 formal field references remain visible after opening their group', !!formalGroup
        && await detailsFor(page, formalGroup.id).locator('[data-gap-id]').count() === 33);
      check('all 78 recorded review notes remain visible after opening their group', !!noteGroup
        && await detailsFor(page, noteGroup.id).locator('[data-gap-id]').count() === 78);

      const offerGroup = groups.find(group => group.id === 'equipment-offers');
      if (offerGroup) {
        const unresolvedIds = new Set(offerSpecs.map(offer => offer.id));
        check('equipment-offers group separates exactly two unresolved offers', groupEntries(offerGroup).filter(entry => unresolvedIds.has(entry.id)).length === 2);
        const arrow = groupEntries(offerGroup).find(entry => entry.id === 'phb-arrow-dozen-already-extracted');
        const arrowItem = data.equipment.find(item => item.id === 'phb-arrow');
        check('arrow dozen is not counted as a missing price offer', (!arrow || arrow.status === 'extracted-separate-field')
          && arrowItem?.fields?.['Normal arrows, dozen price'] === '1 gp per dozen'
          && arrowItem?.price?.amount === 2 && arrowItem?.price?.currency === 'sp',
          {status: arrow?.status, field: arrowItem?.fields?.['Normal arrows, dozen price'], canonicalPrice: {amount: arrowItem?.price?.amount, currency: arrowItem?.price?.currency, unit: arrowItem?.price?.unit}});
      }

      const pageText = await page.locator('#main').innerText();
      check('missing DMG p.175 remains distinct from unverified pp.239–240', /missing[^\n]*175/i.test(pageText)
        && /unverified[^\n]*239[^\n]*240/i.test(pageText), {contains175: pageText.includes('175'), contains239: pageText.includes('239'), contains240: pageText.includes('240')});

      const keyboardGroup = groups.find(group => group.id === 'recorded-review-notes');
      if (keyboardGroup) {
        const details = detailsFor(page, keyboardGroup.id);
        await details.evaluate(element => { element.open = false; });
        const summary = details.locator('summary[data-gap-group-summary]');
        await summary.focus();
        await page.keyboard.press('Enter');
        check('group disclosure opens from keyboard', await details.evaluate(element => element.open));
      }

      const routeEntry = entries.find(entry => (entry.links || []).some(link => /^#(?:spells|rules|equipment|classes)\//.test(link.href || '')));
      const routeLink = routeEntry?.links?.find(link => /^#(?:spells|rules|equipment|classes)\//.test(link.href || ''));
      if (routeEntry && routeLink) {
        await entryFor(page, routeEntry.id).locator(`a[href="${selectorValue(routeLink.href)}"]`).click();
        await page.waitForFunction(expected => location.hash === expected, routeLink.href);
        check('related entry link routes to its declared record', page.url().endsWith(routeLink.href), {href: routeLink.href, url: page.url()});
      } else check('at least one generated gap links to a record route', false);
    } else {
      check('gap payload has the declared groups and entry arrays', false, {status: status.status, payloadPresent: !!status.payload});
    }

    for (const width of [320, 390]) {
      await page.setViewportSize({width, height: 844});
      await waitForGapPage(page);
      check(`Sources view has no horizontal overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        {width, scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth)});
    }

    check('no uncaught page errors during normal browsing', errors.length === 0, errors);

    const retryContext = await browser.newContext({viewport: {width: 390, height: 844}});
    const retryPage = await retryContext.newPage();
    let retryRequests = 0;
    retryPage.on('pageerror', error => errors.push(error.message));
    await retryPage.route('**/coverage-gaps.json', async route => {
      retryRequests++;
      if (retryRequests === 1) await route.abort('failed');
      else await route.continue();
    });
    await waitForGapPage(retryPage);
    const retryButton = retryPage.locator('[data-coverage-gaps-retry]');
    const retryButtonVisible = await retryButton.waitFor({state: 'visible', timeout: 5000}).then(() => true).catch(() => false);
    check('failed payload fetch exposes an accessible retry button', retryButtonVisible, {retryRequests});
    if (retryButtonVisible) {
      await retryButton.click();
      const panelReady = await retryPage.locator('#coverageGapsPanel [data-gap-id]').first().waitFor({timeout: 10000}).then(() => true).catch(() => false);
      check('retry fetch renders the gap inventory', panelReady, {retryRequests});
      check('retry performs a second payload request', retryRequests >= 2, {retryRequests});
    }
    await retryContext.close();

    const delayedContext = await browser.newContext({viewport: {width: 390, height: 844}});
    const delayedPage = await delayedContext.newPage();
    delayedPage.on('pageerror', error => errors.push(error.message));
    let releaseDelayed;
    let markDelayedSeen;
    const delayedGate = new Promise(resolve => { releaseDelayed = resolve; });
    const delayedSeen = new Promise(resolve => { markDelayedSeen = resolve; });
    delayedPage.on('requestfailed', request => { if (/coverage-gaps\.json/.test(request.url())) markDelayedSeen('failed'); });
    await delayedPage.route('**/coverage-gaps.json', async route => {
      markDelayedSeen('started');
      await delayedGate;
      await route.continue();
    });
    await waitForGapPage(delayedPage);
    const delayedStart = await Promise.race([delayedSeen, new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))]);
    check('Sources starts its lazy gap payload fetch', delayedStart === 'started', {delayedStart});
    if (delayedStart === 'started') {
      await delayedPage.locator('nav a[data-view="spells"]').click();
      await delayedPage.locator('.result-item').first().waitFor({timeout: 10000});
      releaseDelayed();
      await delayedPage.waitForTimeout(800);
      check('delayed gap response cannot inject Sources content after navigation', await delayedPage.evaluate(() => location.hash === '#spells'
        && !document.querySelector('#coverageGapsPanel') && document.querySelector('.result-item')));
    } else releaseDelayed();
    await delayedContext.close();
    check('no uncaught browser errors across normal, retry, and delayed navigation', errors.length === 0, errors);
  } catch (error) {
    failures.push({name: 'browser runner completed without an uncaught test error', passed: false, details: error.message});
  } finally {
    const report = {base, passed: checks.filter(item => item.passed).length, failed: failures.length, checks, failures, errors};
    mkdirSync(fileURLToPath(new URL('../test-results/', import.meta.url)), {recursive: true});
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({base, passed: report.passed, failed: report.failed, totalChecks: checks.length, failures, errors, reportPath: outputPath}, null, 2));
    await browser.close();
  }
  assert.equal(failures.length, 0, `${failures.length} coverage-gaps browser checks failed; see ${outputPath}`);
}

await main();
