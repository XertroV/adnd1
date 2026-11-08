import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';

const source = readFileSync(new URL('../dist/source-viewer.js', import.meta.url), 'utf8');
const marker = '  root.FirstEditionSourceViewer = Object.freeze({ open, close });';
assert.ok(source.includes(marker), 'source viewer test hook insertion point exists');
const hooksSource = `  root.__labelTestHooks = {
    setExcerptSource(value) { excerptSource = value; },
    fieldTargetLabel
  };\n`;
const context = vm.createContext({
  document: {currentScript: {src: 'https://unit.test/dist/source-viewer.js'}, baseURI: 'https://unit.test/dist/'},
  location: {origin: 'https://unit.test'},
  URL,
  FirstEditionBooks: {
    books: {PHB: {lastPage: 238}, UA: {lastPage: 160}, DMG: {lastPage: 240}, MM: {lastPage: 112}, MM2: {lastPage: 160}},
    code: value => value,
    pdfPage: (_book, page) => page + 1,
    privateEvidence: () => null,
    title: value => value,
    mapping: () => ''
  }
});
vm.runInContext(source.replace(marker, hooksSource + marker), context, {filename: 'dist/source-viewer.js (field-label test VM)'});
const hooks = context.__labelTestHooks;

test('an explicit contextual label on a reviewed indexed reference is retained', () => {
  hooks.setExcerptSource({name: 'Aklys'});
  const target = {
    fieldPointer: '/references/0',
    label: 'Facing-page General Data table and notes (context only)',
    sourceObject: 'Facing-page General Data table and notes (context only)',
    sourceCategory: 'source-context-reference',
    reviewStatus: 'field-target-reviewed',
    regionIds: ['ua-aklys-hurled-ua27-notes-context']
  };
  const before = structuredClone(target);
  assert.equal(hooks.fieldTargetLabel(target), target.label);
  assert.deepEqual(target, before, 'labeling preserves target region and review metadata');
});

const comparatorBaseline = JSON.parse(gunzipSync(readFileSync(new URL('../research/source-audit-batch5-comparator-target-label-before.json.gz', import.meta.url))).toString('utf8'));
assert.equal(comparatorBaseline.confirmedFailures.length, 6, 'the complete known comparator failure set is preserved');
for (const entry of comparatorBaseline.confirmedFailures) {
  test(`the ${entry.routeOwner.itemId} ${entry.target.fieldPointer} comparator keeps its descriptive label`, () => {
    hooks.setExcerptSource({name: entry.sourceName});
    const target = structuredClone(entry.target);
    const before = structuredClone(target);
    assert.equal(target.sourceCategory, 'printed-price-comparator');
    assert.match(target.label, /^Comparison: .+ \(not this item price\)$/);
    assert.equal(hooks.fieldTargetLabel(target), target.label);
    assert.deepEqual(target, before, 'caption formatting preserves the complete citation target');
  });
}

test('an explicit comparison label is retained while numeric comparator labels use entry ordinals', () => {
  hooks.setExcerptSource({name: 'Fixture'});
  const label = 'Comparison: <Spear> & notes (not this item price)';
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/suggestedPrice/comparisons/0', label, sourceObject: label, sourceCategory: 'printed-price-comparison'}), label);
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/suggestedPrice/comparisons/0', label: '0', sourceObject: '0', sourceCategory: 'printed-price-comparator'}), 'Comparisons entry 1');
});

test('XP array indices are ordinal entries, not character levels', () => {
  hooks.setExcerptSource({name: 'Illusionist'});
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/xpRows/10', label: '10', sourceObject: '10', sourceCategory: 'class-xp'}), 'XP entry 11');
});

test('level-change and nested-source arrays retain their full indexed path', () => {
  hooks.setExcerptSource({name: 'Assassin'});
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/levelChanges/0', label: '0', sourceObject: '0', sourceCategory: 'class-level-change'}), 'Level change entry 1');
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/levelChanges/0/additionalSources/0', label: '0', sourceObject: '0', sourceCategory: 'record-reference'}), 'Level change entry 1 › Additional source entry 1');
});

test('JSON Pointer escapes decode and unknown indexed keys receive a neutral ordinal label', () => {
  hooks.setExcerptSource({name: 'Fixture'});
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/notes/1/fields/a~1b~0c', label: '2', sourceObject: '2'}), 'Note entry 2 › Fields › A/B~C');
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/customBuckets/2', label: '', sourceObject: ''}), 'Custom Buckets entry 3');
});

test('ordinary field labels and pointerless page labels keep their established fallback', () => {
  hooks.setExcerptSource({name: 'Magic User'});
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/fields/Rate of fire (UA p.28)', label: 'Aklys rate of fire', sourceObject: 'Aklys'}), 'Aklys rate of fire');
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '/price', label: 'Purchase price', sourceObject: 'Aklys'}), 'Purchase price');
  assert.equal(hooks.fieldTargetLabel({label: 'PHB printed p. 35'}), 'PHB printed p. 35');
  assert.equal(hooks.fieldTargetLabel({fieldPointer: '', label: ''}), 'Citation target');
});
