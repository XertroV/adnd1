// Original, generated fixtures only. Never add source-book PDFs to this test or dist.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const temporary = await mkdtemp(path.join(tmpdir(), 'adnd-original-pdf-fixture-'));
function makePdf(count) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const kids = [];
  for (let i = 1; i <= count; i++) {
    const id = objects.length + 1;
    kids.push(`${id} 0 R`);
    const stream = `BT /F1 20 Tf 40 720 Td (ORIGINAL TEST FIXTURE - PDF PAGE ${i}) Tj ET\n`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`);
  }
  objects[1] = `<< /Type /Pages /Count ${count} /Kids [${kids.join(' ')}] >>`;
  let data = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(data)); data += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(data);
  data += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  data += offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
  data += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return data;
}
const fixture = path.join(temporary, 'original-fixture.pdf');
const short = path.join(temporary, 'too-short.pdf');
const invalid = path.join(temporary, 'invalid.pdf');
const mmFixture=path.join(temporary,'mm-generated-113.pdf'),mmShort=path.join(temporary,'mm-generated-112.pdf');
const mm2Fixture=path.join(temporary,'mm2-generated-161.pdf'),mm2Short=path.join(temporary,'mm2-generated-160.pdf');
await writeFile(fixture, makePdf(241));
await writeFile(short, makePdf(3));
await writeFile(invalid, 'This is not a PDF.');
await Promise.all([[mmFixture,113],[mmShort,112],[mm2Fixture,161],[mm2Short,160]].map(([f,n])=>writeFile(f,makePdf(n))));
const harness = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Source viewer fixture</title><link rel="stylesheet" href="/source-viewer.css"></head><body><button id="opener">Open sources</button><script src="/books.js"></script><script src="/source-viewer.js"></script><script>document.querySelector('#opener').onclick=()=>FirstEditionSourceViewer.open({item:{name:'Original fixture reference'},references:[{book:'PHB',pages:[35,37,38],labels:['Price','Damage']},{book:'UA',pages:[28]},{book:'DMG',pages:[174,175,176,239,240]},{book:'MM',pages:[6,112]},{book:'MM2',pages:[83,84,91,92,131,160]}]});</script></body></html>`;
const requests = [];
const server = http.createServer(async (req, res) => {
  requests.push({ method: req.method, url: req.url });
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end(harness); return; }
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const filename = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(filename);
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' })[path.extname(filename)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
let checks = 0;
let activePage;
function check(value, label) { assert.ok(value, label); checks++; }
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 }, hasTouch: true });
  activePage = page;
  page.setDefaultTimeout(10000);
  const errors = [], network = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  page.on('request', req => network.push({ method: req.method(), url: req.url() }));
  await page.goto(origin);
  await page.locator('#opener').click();
  check(await page.locator('dialog').evaluate(n => n.open), 'modal opens');
  check(await page.locator('.source-viewer-close').evaluate(n => n === document.activeElement), 'initial focus on close');
  check((await page.locator('.source-viewer-page-title').textContent()).includes('PDF page 36'), 'PHB printed 35 maps to PDF36');
  check(network.every(r => !r.url.includes('/vendor/')), 'opening reader does not fetch PDF.js assets');
  await page.locator('#source-viewer-file').setInputFiles(invalid);
  await page.getByText('This file is not a readable PDF.', { exact: false }).waitFor();
  check(true, 'invalid file rejected');
  await page.locator('#source-viewer-file').setInputFiles(short);
  await page.getByText('This PDF has 3 pages;', { exact: false }).waitFor();
  check(true, 'too-short wrong scan rejected');
  await page.locator('#source-viewer-file').setInputFiles(fixture);
  await page.locator('.source-viewer-status').filter({ hasText: 'Showing printed p. 35' }).waitFor();
  check(await page.locator('.source-viewer-stage canvas').isVisible(), 'original fixture rendered');
  await page.getByText('Read selectable page text', { exact: true }).click();
  await page.locator('.source-viewer-text p').filter({ hasText: 'PDF PAGE 36' }).waitFor();
  check(true, 'actual selected PDF text is page36');
  check(await page.getByText('Focused regions not yet verified.', { exact: false }).isVisible(), 'crop coverage limit disclosed');
  await page.getByRole('button', { name: 'Next cited page', exact: true }).click();
  await page.locator('.source-viewer-status').filter({ hasText: 'Showing printed p. 37' }).waitFor();
  await page.locator('.source-viewer-text p').filter({ hasText: 'PDF PAGE 38' }).waitFor({ state: 'attached' });
  check(true, 'next citation maps correctly');
  await page.locator('.source-viewer-controls select').selectOption('4');
  check((await page.locator('.source-viewer-page-title').textContent()).includes('PDF page 175'), 'DMG174 maps PDF175');
  await page.locator('#source-viewer-file').setInputFiles(fixture);
  await page.locator('.source-viewer-status').filter({ hasText: 'Showing printed p. 174' }).waitFor();
  await page.getByRole('button', { name: 'Next cited page', exact: true }).click();
  await page.getByText('Known source gap', { exact: false }).waitFor();
  check(!await page.locator('.source-viewer-stage canvas').isVisible(), 'DMG175 gap shows no substitute page');
  await page.getByRole('button', { name: 'Next cited page', exact: true }).click();
  await page.locator('.source-viewer-status').filter({ hasText: 'Showing printed p. 176' }).waitFor();
  await page.locator('.source-viewer-text p').filter({ hasText: 'PDF PAGE 176' }).waitFor({ state: 'attached' });
  check(true, 'DMG176 uses PDF176');
  await page.locator('.source-viewer-controls select').selectOption('3');
  check((await page.locator('.source-viewer-page-title').textContent()).includes('PDF page 29'), 'UA28 maps PDF29');
  await page.locator('.source-viewer-controls select').selectOption('6');
  await page.locator('.source-viewer-status').filter({ hasText: 'Showing printed p. 176' }).waitFor();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.locator('.source-viewer-status').filter({ hasText: 'Showing printed p. 176' }).waitFor();
  check((await page.locator('.source-viewer-zoom-label').textContent()) === '125%', 'zoom controls work');
  await page.getByRole('button', { name: 'Fit page', exact: true }).click();
  check((await page.locator('.source-viewer-zoom-label').textContent()) === '100%', 'fit page resets zoom');
  for (const width of [320,390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    check(await page.locator('dialog').evaluate(n => n.scrollWidth <= n.clientWidth + 1), `${width}px modal has no overflow`);
    check(await page.locator('.source-viewer-main').evaluate(n => n.scrollWidth <= n.clientWidth + 1), `${width}px content has no overflow`);
    const screenshot = path.join(temporary, `viewer-${width}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await page.locator('.source-viewer-stage').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(temporary, `viewer-${width}-page.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Next cited page', exact: true }).tap();
  await page.getByText('Printed p. 239 cannot be mapped reliably', { exact: false }).waitFor();
  check(!await page.locator('.source-viewer-stage canvas').isVisible(), 'touch navigation shows DMG239 as unverified');
  await page.getByRole('button', { name: 'Next cited page', exact: true }).click();
  await page.getByText('Printed p. 240 cannot be mapped reliably', { exact: false }).waitFor();
  check(!await page.locator('.source-viewer-stage canvas').isVisible(), 'DMG240 stays unverified');
  await page.getByRole('button', { name: 'Previous cited page', exact: true }).click();
  await page.keyboard.press('Alt+ArrowLeft');
  await page.locator('.source-viewer-status').filter({ hasText: 'Showing printed p. 176' }).waitFor();
  check(true, 'keyboard alternative navigates cited pages');
  await page.locator('.source-viewer-close').focus();
  await page.keyboard.press('Shift+Tab');
  check(await page.locator('dialog').evaluate(n => n.contains(document.activeElement)), 'reverse tab stays in modal');
  await page.keyboard.press('Escape');
  check(!await page.locator('dialog').evaluate(n => n.open), 'Escape closes modal');
  check(await page.locator('#opener').evaluate(n => n === document.activeElement), 'focus restored to opener');
  await page.locator('#opener').click();
  await page.locator('.source-viewer-status').filter({ hasText: 'Showing printed p. 35' }).waitFor();
  check(true, 'chosen PHB retained in tab memory');
  await page.getByRole('button', { name: 'Forget PDF', exact: true }).click();
  await page.getByText('No local PDF selected', { exact: true }).waitFor();
  check(!await page.locator('.source-viewer-stage canvas').isVisible(), 'Forget removes loaded PDF');
  check(await page.locator('.source-viewer-stage canvas').evaluate(n => n.width === 0 && n.height === 0), 'Forget clears the rendered bitmap');
  check((await page.locator('.source-viewer-text p').textContent()) === '', 'Forget clears selectable source text');
  const cited=page.getByRole('combobox',{name:'Select cited page',exact:true});
  await cited.selectOption({label:'MM p. 6'});
  await page.locator('#source-viewer-file').setInputFiles(mmShort);
  await page.getByText('This PDF has 112 pages;', {exact:false}).waitFor();
  check(true,'MM rejects a 112-page fixture');
  await page.locator('#source-viewer-file').setInputFiles(mmFixture);
  await page.locator('.source-viewer-status').filter({hasText:'Showing printed p. 6'}).waitFor();
  await page.locator('.source-viewer-text p').filter({hasText:'PDF PAGE 7'}).waitFor({state:'attached'});
  check(await page.locator('.source-viewer-stage canvas').isVisible(),'MM6 renders generated PDF page 7');
  await cited.selectOption({label:'MM p. 112'});
  await page.locator('.source-viewer-status').filter({hasText:'Showing printed p. 112'}).waitFor();
  await page.locator('.source-viewer-text p').filter({hasText:'PDF PAGE 113'}).waitFor({state:'attached'});
  check(true,'MM112 renders generated PDF page 113');
  await cited.selectOption({label:'MM2 p. 83'});
  check(await page.getByText('No local PDF selected',{exact:true}).isVisible()&&!await page.locator('.source-viewer-stage canvas').isVisible(),'switching to MM2 requires its own PDF');
  await page.locator('#source-viewer-file').setInputFiles(mm2Short);
  await page.getByText('This PDF has 160 pages;', {exact:false}).waitFor();
  check(true,'MM2 rejects a 160-page fixture');
  await page.locator('#source-viewer-file').setInputFiles(mm2Fixture);
  for(const [printed,pdf] of [[83,92],[84,84],[91,91],[92,93],[131,132],[160,161]]){
    if(printed!==83)await cited.selectOption({label:`MM2 p. ${printed}`});
    await page.locator('.source-viewer-status').filter({hasText:`Showing printed p. ${printed}`}).waitFor();
    await page.locator('.source-viewer-text p').filter({hasText:`PDF PAGE ${pdf}`}).waitFor({state:'attached'});
    check(await page.locator('.source-viewer-stage canvas').isVisible(),`MM2 printed ${printed} renders generated PDF page ${pdf}`);
  }
  await cited.selectOption({label:'MM p. 6'});
  await page.locator('.source-viewer-status').filter({hasText:'Showing printed p. 6'}).waitFor();
  check(true,'switching back restores the selected MM PDF');
  check(network.every(r => r.url.startsWith(origin + '/')), 'all network requests are same origin');
  check(network.every(r => r.method === 'GET' && !r.url.toLowerCase().includes('.pdf')), 'no PDF HTTP request or upload');
  check(errors.length === 0, `no browser errors: ${errors.join(', ')}`);
  console.log(JSON.stringify({ passed: checks, fixture: 'Original generated pages, not source-book content', screenshotDirectory: temporary, requests: requests.length, vendorRequests: requests.filter(r => r.url.includes('/vendor/')).map(r => r.url) }, null, 2));
} catch (error) {
  console.error('Fixture failure state:', await activePage?.locator('.source-viewer-main').textContent());
  await activePage?.screenshot({ path: path.join(temporary, 'failure.png'), fullPage: true });
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  // Keep fixture/screenshot evidence locally for independent review. Never deploy this directory.
}
