'use strict';

// Run against assembled data: TEST_URL=http://127.0.0.1:8766 node tests/gear-matrix-browser.cjs --live
// No request interception or data fixtures: the browser loads the same data.json as the app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const base = process.env.TEST_URL || 'http://127.0.0.1:8765';
const axePath = process.env.AXE_PATH || '/tmp/adnd-qa/node_modules/axe-core/axe.min.js';
const output = path.join(root, 'test-results');
const checks = [], errors = [], accessibility = [];
const check = (name, result) => { assert.ok(result, name); checks.push(name); };
const assembled = JSON.parse(fs.readFileSync(path.join(root, 'dist/data.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:1440, height:1000}});
  await context.addInitScript(() => {
    window.__referenceScrolls = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function(options) {
      window.__referenceScrolls.push({target:this.dataset.annotationTarget || this.id, behavior:options?.behavior});
      return original.call(this, options);
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const route = async hash => { await page.goto(`${base}/#${hash}`); await page.locator('#main h1').waitFor(); };
  const search = async text => { await page.locator('#referenceSearch').fill(text); await page.waitForTimeout(200); };
  const count = async () => Number((await page.locator('.result-toolbar strong').innerText()).replaceAll(',', ''));
  const scan = async name => {
    if (!fs.existsSync(axePath)) return;
    await page.addScriptTag({path:axePath});
    const report = await page.evaluate(() => axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
    accessibility.push({view:name, passes:report.passes.length, violations:report.violations.map(v => ({id:v.id, impact:v.impact, targets:v.nodes.map(n => n.target)}))});
    assert.equal(report.violations.length, 0, `${name}: accessibility violations ${JSON.stringify(accessibility.at(-1).violations)}`);
  };
  const selectedInView = async (id, title) => {
    await page.waitForFunction(({id,title}) => {
      const card = document.querySelector('#referenceDetail .detail-card');
      const heading = card?.querySelector('h2');
      if (card?.dataset.annotationTarget !== id || heading?.textContent !== title || document.activeElement !== heading) return false;
      const rect = heading.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    }, {id,title});
    await page.evaluate(() => new Promise(resolve => {
      let previous = scrollY, stable = 0;
      const frame = () => { const current=scrollY; stable=current===previous?stable+1:0; previous=current; stable>=4?resolve():requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    }));
    return page.locator('#referenceDetail h2').evaluate(h => { const r=h.getBoundingClientRect(); return document.activeElement===h && r.top>=0 && r.bottom<=innerHeight; });
  };
  try {
    const response = await page.request.get(`${base}/data.json`);
    assert.equal(response.status(), 200);
    const live = await response.json();
    assert.deepEqual(live, assembled, 'test server must expose the current assembled checkpoint');
    check('live assembly has 638 spell cards, 80 gear entries and the original matrix', live.spells.length===638 && live.spells.every(s=>s.effect?.length) && live.equipment.length===80 && live.matrices.length===1);

    await route('equipment');
    check('equipment index loads all 80 entries', await count()===80);
    await page.locator('#priceFilter').selectOption('known');
    check('known-price filter returns 46 entries', await count()===46);
    await page.locator('#priceFilter').selectOption('unknown');
    check('unknown-price filter returns 34 entries', await count()===34);
    await page.locator('#clearFilters').click();
    for (const query of ['light crossbow','lightcrossbow','lightxbow','light x-bow','crossbow light']) {
      await search(query);
      check(`equipment alias ${query} finds Light Crossbow`, (await page.locator('.result-name').allTextContents()).includes('Light Crossbow'));
    }
    await search('xbow');
    check('generic xbow finds all three crossbows', await count()===3);
    await search('lightxbow');
    await page.locator('#bookFilter').selectOption('UA');
    check('field-source UA filter preserves the PHB Light Crossbow', await count()===1 && await page.locator('#referenceDetail h2').innerText()==='Light Crossbow');
    await page.locator('.result-item').first().click(); // Persist the selected reference in the URL before testing reload.
    const crossbowText = await page.locator('#referenceDetail').innerText();
    check('crossbow price stays unavailable rather than zero or weight-derived', /Price not extracted/.test(await page.locator('.attribute-fact').first().innerText()) && (await page.locator('.price-gap').innerText()).trim().length>0);
    check('crossbow card preserves source rate, ranges and range-unit distinction', /1 per melee round/.test(crossbowText) && /6″ \/ 12″ \/ 18″/.test(crossbowText) && /10 feet indoors; 10 yards outdoors/.test(crossbowText));
    check('currency versus gp-weight is explained in the gear card', /Purchase price · currency/.test(crossbowText) && /gp-weight.*encumbrance unit.*not a price/s.test(crossbowText));
    await page.locator('[data-attribute-view="table"]').click();
    await page.locator('.attribute-table [data-ref-book="UA"][data-ref-pages="28"]').first().click();
    check('gear field source dialog maps printed UA28 to PDF29', /28/.test(await page.locator('.source-viewer-main').innerText()) && /29/.test(await page.locator('.source-viewer-main').innerText()));
    await scan('gear field source dialog');
    await page.keyboard.press('Escape');

    const noteText = 'Live gear regression: <img src=x onerror="window.__gearUnsafe=1">';
    await page.locator('#referenceDetail [data-annotate]').first().click();
    await page.locator('#noteText').fill(noteText);
    await page.locator('#noteForm button[type="submit"]').click();
    await page.locator('.inline-note').waitFor();
    check('gear annotation is escaped and saves locally', (await page.locator('.inline-note').innerText()).includes(noteText) && await page.evaluate(()=>window.__gearUnsafe===undefined));
    check('saving a gear note restores focus to its annotation button', await page.evaluate(()=>document.activeElement?.dataset.annotate==='phb-light-crossbow'));
    await page.reload(); await page.locator('.inline-note').waitFor();
    check('gear annotation survives reload', (await page.locator('.inline-note').innerText()).includes(noteText));
    await route('notebook');
    await page.locator('a[href="#equipment/phb-light-crossbow"]').click();
    await page.waitForFunction(()=>location.hash==='#equipment/phb-light-crossbow' && document.querySelector('#referenceDetail h2')?.textContent==='Light Crossbow');
    check('notebook gear link opens the annotated card', (await page.locator('#referenceDetail .inline-note').innerText()).includes(noteText));
    await scan('equipment card');

    await route('classes/fighter');
    await page.locator('#targetLevel').selectOption('4');
    check('Fighter3to4 official AC0 remains18to18', /18.*18/s.test(await page.locator('.standard-attack strong').innerText()));
    check('matrix and Alt disclosures begin closed', await page.locator('[data-fighter-alt]').evaluate(e=>!e.open) && await page.locator('[data-fighter-matrix]').evaluate(e=>!e.open));
    await page.locator('#targetLevel').selectOption('5');
    check('Fighter4to5 official AC0 changes18to16', /18.*16/s.test(await page.locator('.standard-attack strong').innerText()));
    await page.locator('[data-fighter-alt] summary').click();
    check('Alt shows17to16 and explicitly labels its first-level anchor and house rule', /17.*16/s.test(await page.locator('.alt-attack-target').innerText()) && /level 1.*20/s.test(await page.locator('[data-fighter-alt]').innerText()) && /house.rule/i.test(await page.locator('[data-fighter-alt]').innerText()));
    await page.locator('[data-fighter-alt] [data-inline-source]').click();
    check('Alt anchor source maps DMG74 to PDF75', /74/.test(await page.locator('.source-viewer-main').innerText()) && /75/.test(await page.locator('.source-viewer-main').innerText()));
    await page.keyboard.press('Escape');
    await page.locator('[data-fighter-matrix] summary').click();
    const cells = await page.locator('.matrix-table tbody td').allTextContents();
    check('original matrix renders210cells with70known and140explicit gaps', cells.length===210 && cells.filter(c=>c==='Not transcribed').length===140 && cells.filter(c=>/^-?\d+$/.test(c)).length===70);
    check('matrix preserves zero and negative source targets', cells.includes('0') && cells.includes('-3'));
    check('natural20 amendment is clearly separate and optional', /Separate optional amendment/i.test(await page.locator('.natural-twenty-option').innerText()));
    await page.locator('.natural-twenty-option [data-inline-source]').click();
    check('natural20 optional amendment retains DMG82 source', /82/.test(await page.locator('.source-viewer-main').innerText()) && /83/.test(await page.locator('.source-viewer-main').innerText()));
    await page.keyboard.press('Escape');
    await scan('fighter expanded matrix and Alt');

    for (const width of [390,320]) {
      await page.setViewportSize({width,height:844});
      check(`${width}px expanded matrix stays inside document width`, await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      check(`${width}px matrix has its own horizontal scroll region`, await page.locator('.matrix-scroll').evaluate(e=>e.scrollWidth>e.clientWidth && e.tabIndex===0));
    }
    await page.locator('.matrix-scroll').focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(180);
    check('matrix horizontal overflow is keyboard scrollable', await page.locator('.matrix-scroll').evaluate(e=>e.scrollLeft>0));
    await route('classes/paladin');
    check('fighter Alt is absent for Paladin', await page.locator('[data-fighter-alt]').count()===0);

    const spell = live.spells.find(s=>s.id==='phb-magic-user-magic-missile');
    const starts = [`spells/phb-magic-user-fireball`,'classes/druid'];
    for (const width of [320,390,491]) {
      await page.setViewportSize({width,height:900});
      await page.emulateMedia({reducedMotion:'no-preference'});
      for (const mode of ['keyboard','mouse']) for (const start of starts) {
        await route(start);
        if (mode==='keyboard') await page.keyboard.press('Control+k'); else await page.locator('#paletteOpen').click();
        await page.locator('#commandInput').fill('Magic Missile');
        if (mode==='keyboard') await page.keyboard.press('Enter'); else await page.locator('.palette-result').first().click();
        check(`${width}px ${mode} palette ${start} reveals and focuses selected spell`, await selectedInView(spell.id,spell.name));
        check(`${width}px ${mode} palette ${start} closes modal and preserves viewport width`, !await page.locator('#palette').evaluate(e=>e.open) && await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      }
      await page.emulateMedia({reducedMotion:'reduce'});
      await route('classes/druid');
      await page.evaluate(()=>window.__referenceScrolls=[]);
      await page.keyboard.press('Control+k'); await page.locator('#commandInput').fill('Magic Missile'); await page.keyboard.press('Enter');
      check(`${width}px reduced-motion palette reveals and focuses selected spell`, await selectedInView(spell.id,spell.name));
      check(`${width}px reduced-motion navigation uses immediate scroll`, await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior==='auto' && window.__referenceScrolls.some(s=>s.target==='phb-magic-user-magic-missile' && s.behavior==='auto')));
    }
    await route('equipment/phb-light-crossbow');
    check('mobile gear route fits the viewport', await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await scan('mobile equipment card');
    check('no browser JavaScript errors', errors.length===0);
  } finally {
    fs.mkdirSync(output,{recursive:true});
    fs.writeFileSync(path.join(output,'gear-matrix-browser-report.json'), JSON.stringify({base,liveData:true,passed:checks.length,checks,errors,accessibility,axeAvailable:fs.existsSync(axePath)},null,2));
    console.log(JSON.stringify({base,passed:checks.length,errors,axeScans:accessibility.length,axeViolations:accessibility.reduce((n,r)=>n+r.violations.length,0)}));
    await context.close(); await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
