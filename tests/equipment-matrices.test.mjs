import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const load = name => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const authoredGear = load('equipment.json').equipment;
const authoredMatrices = load('attack-matrices.json').matrices;
const assembled = load('dist/data.json');
const citationOverrides = load('citation-overrides.json');
const cropCatalogs = readdirSync(new URL('dist/scans/dagger/', root)).filter(name=>name.endsWith('.json')).map(name=>load('dist/scans/dagger/'+name));
const cropRegions=cropCatalogs.flatMap(catalog=>catalog.regions);
const require = createRequire(import.meta.url);
const combat = require('../dist/combat.js');
const independentMatrix = load('tests/fixtures/dmg74-matrix-independent.json');

function source(ref, context) {
  assert.ok(ref && typeof ref === 'object', `${context}: source is required`);
  assert.ok(['PHB', 'UA', 'DMG'].includes(ref.book), `${context}: source book`);
  assert.ok(Array.isArray(ref.pages) && ref.pages.length > 0, `${context}: printed pages`);
  for (const page of ref.pages) {
    assert.ok(Number.isInteger(page) && page > 0 && page <= ({PHB:128, UA:128, DMG:240}[ref.book]), `${context}: valid printed page`);
    if (ref.book === 'DMG') assert.ok(![175, 239, 240].includes(page), `${context}: missing or unverified DMG page`);
  }
  if(ref.verification?.method==='supplied-scan-crop'){
    assert.ok(ref.verification.regions?.length,`${context}: crop evidence required`);
    for(const id of ref.verification.regions){
      const region=cropRegions.find(region=>region.id===id);
      assert.ok(region,`${context}: known region`);
      assert.equal(region.book,ref.book,`${context}: evidence retains book identity`);
      assert.ok(ref.pages.includes(region.printedPage),`${context}: evidence retains printed page`);
    }
    assert.match(ref.status || '', /checked/i, `${context}: selected values checked`);
  }else if(ref.scanVerification?.state==='selected-values-checked'){
    const catalog=cropCatalogs.find(catalog=>catalog.itemId===ref.id);
    assert.ok(catalog,`${context}: item-specific catalog required`);
    assert.equal(ref.scanVerification.regionCount,catalog.regions.length);
    assert.equal(ref.incomplete,true);
  }else if (ref.status === 'Selected numeric value visually checked') {
    const id=context.split(':')[0];
    const catalog=load(`dist/${citationOverrides.sourceExcerpts[`equipment:${id}`].catalog}`);
    assert.ok(catalog.regions.some(region=>region.book===ref.book && ref.pages.includes(region.printedPage)), `${context}: cited source excerpt`);
  }else if (/purchase price$/.test(context) && ref.status === 'Selected purchase-price row visually checked') {
    assert.equal(ref.status, 'Selected purchase-price row visually checked');
    const id=context.split(':')[0];
    const catalog=load(`dist/${citationOverrides.sourceExcerpts[`equipment:${id}`].catalog}`);
    assert.ok(catalog.regions.some(region=>region.book===ref.book && ref.pages.includes(region.printedPage) && !/table headings/i.test(region.title)), `${context}: source excerpt`);
  }else{
    assert.match(ref.status || '', /OCR checked/, `${context}: verification state`);
    assert.match(ref.status || '', /visual.*pending/i, `${context}: visual verification is pending`);
  }
  assert.doesNotMatch(ref.status || '', /visually verified/i, `${context}: unsupported visual claim`);
}

test('assembly preserves every equipment and matrix field from the author checkpoints', () => {
  assert.ok(Array.isArray(assembled.equipment), 'assembled equipment collection is required');
  assert.ok(Array.isArray(assembled.matrices), 'assembled matrices collection is required');
  const expected=authoredGear.map(item=>({...item,...(citationOverrides.items[item.id]||{}),priceState:citationOverrides.priceStates[item.id],...(citationOverrides.items[item.id]?.references?{references:[...(item.references||[]),...citationOverrides.items[item.id].references]}:{})}));
  assert.deepEqual(assembled.equipment.map(({sourceExcerpts,...item})=>item), expected, 'equipment and reviewed reference additions must not be omitted or flattened');
  assert.deepEqual(assembled.matrices.map(({sourceExcerpts,...matrix})=>matrix), authoredMatrices, 'matrix nulls and source notes must survive assembly');
});

for (const [name, gear] of [['authored', authoredGear], ['assembled', assembled.equipment]]) {
  test(`${name} catalogue distinguishes 84 sourced prices from 4 unavailable prices`, () => {
    assert.ok(Array.isArray(gear), 'equipment collection must be assembled');
    assert.equal(gear.length, 88);
    assert.equal(new Set(gear.map(item => item.id)).size, 88, 'stable unique equipment identifiers');
    assert.equal(gear.filter(item => item.price !== null).length, 84);
    assert.equal(gear.filter(item => item.price === null).length, 4);
    for (const item of gear) {
      source(item, item.id);
      assert.equal(item.incomplete, true, `${item.id}: catalogue remains a partial transcription`);
      if (item.price === null) {
        assert.ok(typeof item.priceNote === 'string' && item.priceNote.trim(), `${item.id}: explain the unavailable price`);
      } else {
        assert.ok(Number.isFinite(item.price.amount) && item.price.amount > 0, `${item.id}: positive source price`);
        assert.ok(['gp', 'sp', 'cp'].includes(item.price.currency), `${item.id}: purchase currency`);
        source(item.price, `${item.id}: purchase price`);
      }
    }
  });

  test(`${name} equipment gives each attribute and related reference its own printed source`, () => {
    assert.ok(Array.isArray(gear), 'equipment collection must be assembled');
    for (const item of gear) {
      assert.deepEqual(Object.keys(item.fieldSources || {}).sort(), Object.keys(item.fields || {}).sort(), `${item.id}: no orphaned or uncited attribute`);
      for (const [label, value] of Object.entries(item.fields || {})) {
        assert.ok(value !== null && value !== undefined && value !== '', `${item.id}: ${label} must not imply an unknown number`);
        const ref = item.fieldSources[label];
        source(ref, `${item.id}: ${label}`);
        const namedSource = label.match(/\((PHB|UA|DMG) p\.(\d+)\)/);
        if (namedSource) {
          assert.equal(ref.book, namedSource[1], `${item.id}: field label/source agreement`);
          assert.ok(ref.pages.includes(Number(namedSource[2])), `${item.id}: labeled printed page`);
        }
      }
      for (const ref of item.references || []) source(ref, `${item.id}: related reference`);
    }
  });

  test(`${name} equipment never converts gp-weight into a purchase price or loses package quantities`, () => {
    assert.ok(Array.isArray(gear), 'equipment collection must be assembled');
    const weighted = gear.filter(item => Object.keys(item.fields).some(label => /weight/i.test(label)));
    assert.ok(weighted.length > 0, 'weight-unit regression requires weighted items');
    for (const item of weighted) {
      for (const [label, value] of Object.entries(item.fields)) if (/weight/i.test(label)) {
        assert.match(String(value), /gp-weight/, `${item.id}: encumbrance unit must be explicit`);
        assert.match(String(value), /not (?:purchase )?cost/i, `${item.id}: weight is not currency`);
      }
      assert.ok(item.price === null || item.price.currency !== 'gp-weight');
    }
    const axe = gear.find(item => item.id === 'phb-battle-axe');
    assert.equal(axe.price.amount, 5, 'the separately checked PHB p.35 price is 5 gp, not 75 gp-weight');
    assert.equal(axe.price.currency,'gp');
    assert.deepEqual(axe.price.pages,[35]);
    assert.match(axe.fields['Approx. weight'], /^75 gp-weight/);
    for (const [id, amount, currency, unit] of [
      ['phb-rope-50', 4, 'sp', '50-foot length'],
      ['phb-oil-flask', 1, 'gp', 'flask'],
      ['phb-holy-water', 25, 'gp', 'vial'],
      ['phb-standard-rations', 3, 'gp', '1 week'],
    ]) {
      const item = gear.find(item => item.id === id);
      assert.deepEqual([item.price.amount, item.price.currency, item.price.unit], [amount, currency, unit], `${id}: source package price`);
      assert.deepEqual([item.price.book, item.price.pages], ['PHB', [36]]);
    }
  });

  test(`${name} crossbows preserve UA statistics, PHB range units and reviewed costs`, () => {
    assert.ok(Array.isArray(gear), 'equipment collection must be assembled');
    for (const [id, rate, ranges] of [
      ['phb-light-crossbow', '1 (tabletop-miniatures turn or melee round)', '6 / 12 / 18 (numeric bands)'],
      ['phb-heavy-crossbow', '½ (tabletop-miniatures turn or melee round)', '8 / 16 / 24 (numeric bands)'],
      ['ua-hand-crossbow', '1 (tabletop-miniatures turn or melee round)', '2 / 4 / 6 (numeric bands)'],
    ]) {
      const item = gear.find(item => item.id === id);
      assert.ok(item, id);
      if (id === 'ua-hand-crossbow') assert.deepEqual([item.price.amount,item.price.currency,item.price.book,item.price.pages], [300,'gp','UA',[26]]);
      else { assert.equal(item.price.amount, id === 'phb-light-crossbow' ? 12 : 20); assert.equal(item.price.currency, 'gp'); assert.deepEqual(item.price.pages, [35]); }
      assert.equal(item.fields['Rate of fire (UA p.28)'], rate);
      assert.equal(item.fields['Range S / M / L (UA p.28)'], ranges);
      assert.deepEqual([item.fieldSources['Rate of fire (UA p.28)'].book, item.fieldSources['Rate of fire (UA p.28)'].pages], ['UA', [28]]);
      assert.deepEqual([item.fieldSources['Range S / M / L (UA p.28)'].book, item.fieldSources['Range S / M / L (UA p.28)'].pages], ['UA', [28]]);
      assert.match(item.fields['Range scale (PHB p.39)'], /10 feet indoors; 10 yards outdoors/);
      assert.deepEqual([item.fieldSources['Range scale (PHB p.39)'].book, item.fieldSources['Range scale (PHB p.39)'].pages], ['PHB', [39]]);
      assert.ok(item.references.some(ref => ref.book === 'UA' && ref.pages.includes(28)));
      assert.ok(item.references.some(ref => ref.book === 'PHB' && ref.pages.includes(39)));
    }
  });
}

for (const [name, matrices] of [['authored', authoredMatrices], ['assembled', assembled.matrices]]) {
  test(`${name} original matrix preserves all 210 independently checked source cells`, () => {
    assert.ok(Array.isArray(matrices) && matrices.length === 1);
    const matrix = matrices[0];
    source(matrix, matrix.id);
    assert.deepEqual([matrix.book, matrix.pages], ['DMG', [74]]);
    assert.equal(matrix.incomplete, true, 'other combat mechanics retain their review status');
    assert.deepEqual(matrix.armorClasses, Array.from({length:21}, (_, i) => 10 - i));
    assert.equal(matrix.rows.length, 10);
    matrix.rows.forEach((row, band) => {
      assert.equal(row.targets.length, 21);
      matrix.armorClasses.forEach((ac, column) => {
        const sourceRow = independentMatrix.armorClasses.indexOf(ac);
        assert.equal(row.targets[column], independentMatrix.rows[sourceRow][band], `${row.label}, AC ${ac}`);
      });
    });
    assert.deepEqual(combat.coverage(matrix), {known:210, total:210, missing:0});
    assert.deepEqual([matrix.coverage.knownCells, matrix.coverage.totalCells, matrix.coverage.missingCells], [210, 210, 0]);
    assert.deepEqual(matrix.coverage.completeArmorClassRows, matrix.armorClasses);
    assert.deepEqual(matrix.coverage.unreadableArmorClassRows, []);
    assert.deepEqual([matrix.cellVerification.book, matrix.cellVerification.printedPage, matrix.cellVerification.pdfPage, matrix.cellVerification.cellCount], ['DMG',74,75,210]);
    assert.equal(matrix.cellVerification.sourceSha256, '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
    assert.match(matrix.cellVerification.scope, /cells only.*other combat mechanics/i);
  });

  test(`${name} source AC-zero progression retains official bands and separate optional rules`, () => {
    assert.ok(Array.isArray(matrices) && matrices.length === 1);
    const matrix = matrices[0];
    assert.deepEqual(matrix.rows.map(row => [row.levelMin, row.levelMax ?? null]), [[0,0],[1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,null]]);
    assert.deepEqual(matrix.rows.map(row => row.targets[matrix.armorClasses.indexOf(0)]), [20,20,18,16,14,12,10,8,6,4]);
    assert.match(matrix.rows[0].label, /halflings and humans/, 'level zero is not a generic fighter row');
    for (const ref of [...matrix.ruleNotes, ...matrix.comparisonExamples]) source(ref, `${matrix.id}: ${ref.id || ref.armorClass}`);
    const perLevel = matrix.ruleNotes.find(note => note.id === 'dmg-fighter-per-level-attack-option');
    assert.deepEqual([perLevel.book, perLevel.pages, perLevel.optional], ['DMG', [74], true]);
    const naturalTwenty = matrix.ruleNotes.find(note => note.id === 'dmg-repeated-twenties');
    assert.deepEqual([naturalTwenty.book, naturalTwenty.pages, naturalTwenty.optional], ['DMG', [82], true]);
    assert.match(naturalTwenty.text, /optional amendment/i);
  });
}

test('fighter Alt uses the sourced first-level AC-zero anchor rather than the special level-zero column', () => {
  const matrix = assembled.matrices?.[0];
  assert.ok(matrix, 'matrix must be assembled before comparing progression');
  const acZero = matrix.armorClasses.indexOf(0);
  const fixture = {...matrix, rows:matrix.rows.map(row => ({...row, targets:row.targets.map((value, index) => row.levelMin === 0 && index === acZero ? 99 : value)}))};
  const alt = combat.fighterAltTransition(fixture, 4, 5);
  assert.deepEqual([alt.anchorLevel, alt.anchorArmorClass, alt.anchorTarget], [1, 0, 20]);
  assert.deepEqual([alt.from, alt.to, alt.houseRule, alt.book, alt.pages], [17, 16, true, 'DMG', [74]]);
  const standard = combat.standardTransition(matrix, 4, 5);
  assert.deepEqual([standard.from, standard.to, standard.book, standard.pages], [18, 16, 'DMG', [74]]);
});
