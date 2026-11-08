import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';

const repo = new URL('../', import.meta.url);
const copy = (from, to) => copyFileSync(new URL(from, repo), to);

function fixtureRepo() {
  const root = mkdtempSync(join(tmpdir(), 'source-target-label-current-fixture-'));
  mkdirSync(join(root, 'dist'), {recursive: true});
  mkdirSync(join(root, 'research'), {recursive: true});
  mkdirSync(join(root, 'tools'), {recursive: true});
  for (const name of ['source-viewer.js', 'citations.js', 'books.js']) copy(`dist/${name}`, join(root, 'dist', name));
  copy('tools/source-target-label-audit.mjs', join(root, 'tools/source-target-label-audit.mjs'));
  copy('research/source-audit-batch5-target-label-before-summary.json', join(root, 'research/source-audit-batch5-target-label-before-summary.json'));
  const binding = {
    collection: 'equipment', itemId: 'fixture-armor', fieldPointer: '/references/0', sourceObjectPointer: '/references/0',
    sourceObject: '0', sourceCategory: 'equipment-price-occurrence-reference', book: 'UA', pages: [75], printedPage: 75,
    pdfPage: 76, label: '0', regionIds: ['fixture-ua75-row'], reviewStatus: 'field-target-reviewed'
  };
  const record = {id: 'fixture-armor', name: 'Fixture armor', references: [{book: 'UA', pages: [75], label: '0', evidenceBindings: [binding]}]};
  const data = {rules: [], spells: [], equipment: [record], classes: [], matrices: [], progressionExplainer: null};
  writeFileSync(join(root, 'dist/data.json'), `${JSON.stringify(data)}\n`);
  return {root, record};
}

test('current audit handles changed isolated data and rejects silently shrinking owner inventories', () => {
  const {root, record} = fixtureRepo();
  try {
    const outputDir = join(root, 'artifacts', 'labels');
    execFileSync(process.execPath, ['tools/source-target-label-audit.mjs', '--current', '--output-dir', outputDir, '--check'], {cwd: root, stdio: 'pipe'});
    const summary = JSON.parse(readFileSync(join(outputDir, 'current-summary.json'), 'utf8'));
    const report = JSON.parse(gunzipSync(readFileSync(join(outputDir, 'current.json.gz'))).toString('utf8'));
    assert.equal(report.denominator.contentRecords, 1);
    assert.equal(report.denominator.routeRecords, 1);
    assert.equal(report.denominator.collectorTargets, 1);
    assert.notEqual(report.provenance.sourceDataSha256, report.provenance.frozenCalibrationBaselineDataSha256);
    assert.equal(report.entries[0].owner.itemId, record.id);
    assert.equal(report.entries[0].sourceName, record.name);
    assert.equal(report.entries[0].beforeLabel, '0');
    assert.equal(report.entries[0].afterLabel, 'Reference entry 1');
    assert.equal(summary.denominator.historicalBrowserSweep.distinctPayloads, 2850);
    assert.equal(summary.denominator.currentDistinctRenderedPayloads, 'not-assessed');

    const invalidData = {rules: [], spells: [], equipment: [record, {...record}], classes: [], matrices: [], progressionExplainer: null};
    writeFileSync(join(root, 'dist/data.json'), `${JSON.stringify(invalidData)}\n`);
    assert.throws(() => execFileSync(process.execPath, ['tools/source-target-label-audit.mjs', '--current', '--output-dir', join(root, 'artifacts', 'duplicates')], {cwd: root, stdio: 'pipe'}), error => String(error.stderr).includes('duplicate owner id fixture-armor'));

    invalidData.equipment = [null];
    writeFileSync(join(root, 'dist/data.json'), `${JSON.stringify(invalidData)}\n`);
    assert.throws(() => execFileSync(process.execPath, ['tools/source-target-label-audit.mjs', '--current', '--output-dir', join(root, 'artifacts', 'invalid')], {cwd: root, stdio: 'pipe'}), error => String(error.stderr).includes('invalid record shape'));

    invalidData.equipment = [record];
    invalidData.progressionExplainer = [];
    writeFileSync(join(root, 'dist/data.json'), `${JSON.stringify(invalidData)}\n`);
    assert.throws(() => execFileSync(process.execPath, ['tools/source-target-label-audit.mjs', '--current', '--output-dir', join(root, 'artifacts', 'invalid-progression')], {cwd: root, stdio: 'pipe'}), error => String(error.stderr).includes('invalid record shape'));
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
