import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const metadata = JSON.parse(readFileSync(new URL('../progression-overrides.json', import.meta.url), 'utf8'));
const guides = JSON.parse(readFileSync(new URL('../classes.json', import.meta.url), 'utf8')).classes;
const pendingStatus = 'OCR checked · visual review pending';
const special = {
  bard: 'special-sequential',
  'ua-thief-acrobat': 'specialist-path',
  'ua-druid': 'advanced-reset-track',
  'ua-paladin': 'class-revision'
};

function allReferences() {
  return [
    ...Object.values(metadata.classes).flatMap(x => x.progression.references),
    ...metadata.explainer.sections.flatMap(x => x.references),
    ...metadata.explainer.references
  ];
}

test('metadata addresses exactly the existing sixteen guide identities', () => {
  assert.equal(Object.keys(metadata.classes).length, 16);
  assert.deepEqual(Object.keys(metadata.classes).sort(), guides.map(x => x.id).sort());
});

test('the overlay can only add progression and icon metadata, never replace mechanics', () => {
  assert.deepEqual(Object.keys(metadata).sort(), ['classes', 'explainer']);
  for (const [id, value] of Object.entries(metadata.classes)) {
    assert.deepEqual(Object.keys(value).sort(), ['icon', 'progression'], id);
    assert.deepEqual(Object.keys(value.progression).sort(), ['description', 'kind', 'label', 'references'], id);
    assert.ok(value.progression.description.trim(), id);
  }
});

test('each icon has an agreed editorial SVG key', () => {
  const supported = new Set(['fighter', 'cleric', 'druid', 'paladin', 'ranger', 'wizard', 'illusionist', 'thief', 'assassin', 'monk', 'bard', 'cavalier', 'barbarian', 'acrobat']);
  for (const [id, value] of Object.entries(metadata.classes)) assert.ok(supported.has(value.icon), id);
});

test('all explanatory references use printed pages and retain OCR-only status', () => {
  assert.ok(allReferences().length > 20);
  for (const ref of allReferences()) {
    assert.ok(['PHB', 'UA'].includes(ref.book));
    assert.ok(ref.pages.length > 0);
    assert.equal(new Set(ref.pages).size, ref.pages.length);
    assert.ok(ref.pages.every(p => Number.isInteger(p) && p >= 1 && p <= 128));
    assert.equal(ref.status, pendingStatus);
  }
  assert.equal(metadata.explainer.status, pendingStatus);
});

test('special published paths cannot silently become ordinary multiclass or dual-class labels', () => {
  for (const [id, kind] of Object.entries(special)) {
    assert.equal(metadata.classes[id].progression.kind, kind, id);
  }
  for (const [id, value] of Object.entries(metadata.classes)) {
    if (!(id in special)) {
      assert.equal(value.progression.kind, 'class-track', id);
      assert.equal(value.progression.label, 'Class track', id);
    }
  }
});

test('Bard keeps its appendix qualifications and the unresolved thief-stage wording', () => {
  const bard = metadata.classes.bard.progression;
  assert.match(bard.description, /Fighter → thief → bard/);
  assert.match(bard.description, /human or half-elf/);
  assert.match(bard.description, /between 5th and 9th/);
  assert.doesNotMatch(bard.description, /thief (?:levels? )?5[–-]8/);
  assert.ok(bard.references.some(r => r.book === 'PHB' && r.pages.includes(117) && r.pages.includes(118)));
});

test('thief-acrobat points to the specialist conversion and retained-thief rules', () => {
  const path = metadata.classes['ua-thief-acrobat'].progression;
  assert.match(path.description, /five ordinary thief levels/);
  assert.match(path.description, /Strength 15\+ and Dexterity 16\+/);
  assert.match(path.description, /six weeks/);
  assert.match(path.description, /at least level 10/);
  assert.match(path.description, /split-class/);
  assert.ok(path.references.some(r => r.book === 'UA' && r.pages.includes(23) && r.pages.includes(25)));
});

test('UA druid reset and paladin revision stay separate from concurrent classes', () => {
  const druid = metadata.classes['ua-druid'].progression;
  assert.match(druid.description, /3,500,001 XP/);
  assert.match(druid.description, /successor/);
  assert.match(druid.description, /level-16 Hierophant/);
  assert.match(druid.description, /XP reset to 1/);
  const paladin = metadata.classes['ua-paladin'].progression;
  assert.match(paladin.description, /cavalier subclass/);
  assert.match(paladin.description, /PHB paladin powers and level advancement remain/);
});

test('the explainer differentiates race-qualified concurrent and sequential procedures', () => {
  const concurrent = metadata.explainer.sections.find(x => x.id === 'concurrent-multiclass');
  const sequential = metadata.explainer.sections.find(x => x.id === 'sequential-dual-class');
  assert.match(concurrent.description, /same time/);
  assert.match(concurrent.description, /non-human or semi-human/);
  assert.match(concurrent.description, /depend on race/);
  assert.match(sequential.description, /human-only/);
  assert.match(sequential.description, /stops advancement in the former class/);
  assert.match(sequential.description, /15.*17 or 18/);
  assert.match(sequential.description, /new level exceeds the old/);
  assert.ok(metadata.explainer.terminologyNotes.some(x => x.includes('The Character With Two Classes')));
  assert.ok(metadata.explainer.terminologyNotes.some(x => x.includes('makes no finding about eligibility')));
});
