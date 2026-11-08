import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

test('full label audit binds the frozen whole-corpus baseline and retains unassessed labels', async () => {
  const summary = await readJson('research/source-audit-batch5-target-label-after-summary.json');
  const compressed = await readFile('research/source-audit-batch5-target-label-after.json.gz');
  assert.equal(sha(compressed), summary.fullReport.sha256);
  const raw = gunzipSync(compressed);
  assert.equal(sha(raw), summary.fullReport.uncompressedSha256);
  const report = JSON.parse(raw.toString('utf8'));

  assert.equal(report.provenance.baselineCompressedSha256, '63b8df53e6f8b0fd981a0466d316974adc76e4779ec103a6893ab2adec862200');
  assert.deepEqual(report.denominator, {contentRecords: 995, routeRecords: 993, renderedControls: 5641, collectedTargets: 4489, renderedDistinctPayloads: 2850});
  assert.equal(report.counts.beforeCollected['numeric-only-field-label-candidate'], 2222);
  assert.equal(report.counts.beforeRendered['numeric-only-field-label-candidate'], 2033);
  assert.equal(report.counts.semanticLabelsUnassessed.collected, 717);
  assert.equal(report.counts.semanticLabelsUnassessed.renderedDistinctPayloads, 717);
  assert.equal(report.counts.afterCollected['pre-existing-semantic-unassessed'], 717);
  assert.equal(report.counts.afterRendered['pre-existing-semantic-unassessed'], 717);
  assert.equal(report.counts.afterCollected['indexed-pointer-qualified-label'] + report.counts.afterCollected['explicit-label-retained'], 2222);
  assert.equal(report.counts.afterRendered['indexed-pointer-qualified-label'] + report.counts.afterRendered['explicit-label-retained'], 2033);

  for (const rows of [report.entries.collected, report.entries.rendered]) {
    assert.ok(rows.every(row => !row.fieldPointer || !/^\d+$/.test(row.afterLabel)), 'no field pointer renders as a bare numeric label');
  }
  const aklys = report.entries.collected.find(row => row.owner?.collection === 'equipment' && row.owner.itemId === 'ua-aklys-hurled' && row.fieldPointer === '/references/0');
  assert.equal(aklys?.afterLabel, 'Facing-page General Data table and notes (context only)');
});
