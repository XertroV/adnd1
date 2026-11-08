import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditClassProgressions} from '../tools/class-progression-audit.mjs';

const baseline = JSON.parse(await readFile(new URL('../research/source-audit-batch5-class-progression-baseline.json', import.meta.url), 'utf8'));
const current = JSON.parse(await readFile(new URL('../dist/data.json', import.meta.url), 'utf8'));
const sourceClasses = JSON.parse(await readFile(new URL('../classes.json', import.meta.url), 'utf8')).classes;

test('679b15d baseline retains the complete progression denominator and catches Assassin 17', () => {
  assert.equal(baseline.input.commit, '679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.equal(baseline.counts.classRecords, 16);
  assert.equal(baseline.counts.levelChangeEvents, 1082);
  assert.equal(baseline.counts.xpRows, 206);
  assert.deepEqual(baseline.counts.progressionDomainCounts, {
    'advanced-reset-track': 1,
    'class-revision': 1,
    'class-track': 12,
    'special-sequential': 1,
    'specialist-path': 1,
  });
  const historical = auditClassProgressions({classes: baseline.classes.map(record => ({
    id: record.id,
    name: record.name,
    progression: record.progression,
    xp: record.xp,
    xpRows: record.xpRows,
    xpContinuation: record.xpContinuation,
    maxLevel: record.maxLevel,
    levelLimit: record.levelLimit,
    levelChanges: record.events.map(entry => ({...entry.event, level: entry.level})),
  }))});
  assert.deepEqual(historical.validation.findings.map(({classId, pointer, level, code}) => ({classId, pointer, level, code})), [
    {classId: 'assassin', pointer: '/levelChanges/50', level: 17, code: 'outside-tabulated-xp-without-continuation'},
  ]);
  const assassin = baseline.classes.find(item => item.id === 'assassin');
  assert.equal(assassin.xpRows.at(-1).level, 15);
  assert.equal(assassin.xpContinuation, null);
  assert.equal(assassin.maxLevel, null);
  assert.equal(assassin.declaredMaximums.levelLimit, null);
  assert.match(assassin.events[50].event.changes.join(' '), /proficiency allotment 6 → 7/);
});

test('current exposed progression data has no event outside declared or tabulated progression', () => {
  const report = auditClassProgressions(current);
  assert.equal(report.counts.classRecords, 16);
  assert.equal(report.counts.levelChangeEvents, 1081);
  assert.equal(report.counts.xpRows, 206);
  assert.deepEqual(report.validation.findings, []);
  assert.equal(report.counts.eventCoverageDisposition['outside-declared-maximum'], 0);
  assert.equal(report.counts.eventCoverageDisposition['outside-tabulated-xp-without-continuation'], 0);
  assert.equal(report.counts.eventCoverageDisposition['otherwise-covered'], 1081);

  const assassin = current.classes.find(item => item.id === 'assassin');
  assert.equal(assassin.levelChanges.length, 50);
  assert.equal(assassin.levelChanges.at(-1).level, 15);
  assert.equal(assassin.xpRows.at(-1).level, 15);
  assert.equal(assassin.xpContinuation, undefined);
  assert.equal(assassin.maxLevel, undefined);
  assert.equal(assassin.levelLimit, undefined);

  const sourceAssassin = sourceClasses.find(item => item.id === 'assassin');
  assert.equal(sourceAssassin.levelChanges.length, 50);
  assert.equal(sourceAssassin.levelChanges.at(-1).level, 15);
});

test('declared maxima, tabulated rows, and explicit continuations remain distinct', () => {
  const report = auditClassProgressions({classes: [
    {
      id: 'limited',
      progression: {kind: 'class-track'},
      maxLevel: 3,
      levelLimit: {level: 3},
      xpRows: [{level: 1, xp: 0}, {level: 2, xp: 100}, {level: 3, xp: 200}],
      levelChanges: [{level: 4, changes: ['beyond explicit limit']}],
    },
    {
      id: 'continued',
      progression: {kind: 'class-track'},
      xpRows: [{level: 1, xp: 0}, {level: 2, xp: 100}, {level: 3, xp: 200}],
      xpContinuation: {afterLevel: 3, increment: 100, anchorLevel: 3, anchorXp: 200},
      levelChanges: [{level: 4, changes: ['covered by declared continuation']}],
    },
  ]});
  assert.deepEqual(report.classes.map(record => record.events[0].coverageDisposition), [
    'outside-declared-maximum',
    'otherwise-covered',
  ]);
  assert.deepEqual(report.classes.map(record => record.events[0].xpDisposition), [
    'outside-tabulated-xp-without-continuation',
    'declared-xp-continuation',
  ]);
  assert.equal(report.validation.findings.length, 1);
  assert.equal(report.validation.findings[0].classId, 'limited');
});
