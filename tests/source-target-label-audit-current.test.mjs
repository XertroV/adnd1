import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';

test('current label mode audits the present collector without claiming a fresh rendered sweep', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'source-target-label-audit-'));
  try {
    execFileSync(process.execPath, ['tools/source-target-label-audit.mjs', '--current', '--output-dir', outputDir, '--check'], {stdio: 'pipe'});
    const summary = JSON.parse(readFileSync(join(outputDir, 'current-summary.json'), 'utf8'));
    const compressed = readFileSync(join(outputDir, 'current.json.gz'));
    const hash = createHash('sha256').update(compressed).digest('hex');
    assert.equal(hash, summary.fullReport.sha256);
    const report = JSON.parse(gunzipSync(compressed).toString('utf8'));
    assert.equal(report.denominator.contentRecords, 995+1);
    assert.equal(report.denominator.routeRecords, 993+1);
    assert.equal(report.denominator.collectorTargets, report.entries.length);
    assert.ok(report.entries.filter(row=>row.owner?.collection==='equipment'&&row.owner?.itemId==='ua-jo-stick').length>=14,'current captions include the distinct Jo fields');
    assert.equal(report.denominator.currentBrowserRenderedControls, 'not-run');
    assert.equal(report.denominator.currentDistinctRenderedPayloads, 'not-assessed');
    assert.equal(report.categories.afterNumericOnlyCandidates, 0);
    assert.ok(report.entries.every(row => row.owner?.collection && row.owner?.itemId && row.sourceName));
    assert.ok(report.entries.every(row => row.afterLabel && (!row.fieldPointer || !/^\d+$/.test(row.afterLabel))));
  } finally {
    rmSync(outputDir, {recursive: true, force: true});
  }
});
