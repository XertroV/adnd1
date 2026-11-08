// Browser-level contract for the accessible description on a reviewed related passage.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildPublishedContinuations} from '../tools/published-continuations.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); }
catch { ({chromium} = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }

const root = path.resolve('dist');
const read = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const data = await read('data.json');
const base = (process.env.TEST_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const manifest = JSON.parse(await readFile('research/citation-continuations.json', 'utf8'));
const synthetic = structuredClone(manifest);
const group = synthetic.groups.find(candidate => candidate.id === 'ua-cleric-abjure-ua-37');
assert.ok(group, 'the tested source-reviewed passage is present');
group.relationship = {
  kind: 'related-source-rules',
  label: 'Solid Fog',
  reason: 'This is explicitly related context. Individual field values are not transferred.',
  ownerPage: {book: 'UA', printedPage: 70},
};
synthetic.groups = [group];
const published = buildPublishedContinuations({manifest: synthetic, data, catalogRoot: root});
const owner = data.spells.find(item => item.id === group.itemId);
const first = group.segments[0];
const hash = `#spells/${encodeURIComponent(group.itemId)}?source=${encodeURIComponent(`${first.book}:${first.printedPage}`)}&region=${encodeURIComponent(first.regionId)}`;
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});

try {
  assert.ok(owner, 'the passage owner resolves to a current spell');
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/source-continuations.json', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(published)}));
  await page.goto(`${base}/${hash}`);
  const dialog = page.locator('dialog.source-viewer[open]');
  await dialog.waitFor();
  await dialog.locator(`.source-viewer-linked-part[data-region-id="${first.regionId}"]`).waitFor();
  const note = dialog.getByRole('note');
  await note.waitFor();
  const text = await note.textContent();
  assert.equal(text, 'Related passage: Solid Fog. This is explicitly related context. Individual field values are not transferred. Owner entry: Unearthed Arcana printed p. 70.');
  assert.equal(await dialog.locator('.source-viewer-linked-relationship').count(), 1);
  assert.ok(await dialog.locator('.source-viewer-linked-relationship').evaluate(node => {
    const firstPart = node.parentElement.querySelector('.source-viewer-linked-part');
    return !!firstPart && !!(node.compareDocumentPosition(firstPart) & Node.DOCUMENT_POSITION_FOLLOWING);
  }), 'the relationship note is announced before the linked source excerpts');
  assert.deepEqual(errors, []);
  await page.close();
  console.log(JSON.stringify({passed: true, noteRole: 'note', relationship: text, groupId: group.id}));
} finally {
  await browser.close();
}

