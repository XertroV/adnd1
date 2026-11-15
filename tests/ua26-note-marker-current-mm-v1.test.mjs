// Original MM assertions retain their fixed historical fixture under a separate genuine S1 proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from './helpers/ua26-historical-cli-v1.mjs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('current-MM UA26 CLI proves the complete cohort and retained catalog transition before reporting markers', () => {
  const output = execFileSync(process.execPath, ['tools/ua26-note-marker-audit-mm-v1.mjs'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const report = JSON.parse(output);
  assert.equal(report.ok, true);
  assert.equal(report.semanticPass, false);
  assert.equal(report.sourceValueGrade, 'NOT PROMOTED');
  assert.equal(report.contextualAdequacy, 'NOT ASSESSED');
  assert.deepEqual(report.counts, {
    physicalRows: 68,
    marked: 17,
    unmarked: 51,
    aliases: 66,
  });
  assert.equal(report.currentEpoch.sourceInputCommit, '0f2d70a135e3ad486152bf00f21387d60a1a97ef');
  assert.equal(report.currentEpoch.sourceInputTree, '08010faf457df22cdb0a5ec35d2dcf79e622ade9');
  assert.equal(report.currentEpoch.cohortSummary.owners, 1064);
  assert.equal(report.currentEpoch.cohortSummary.addedCanonicalBindings, 76);
  assert.equal(report.currentEpoch.cohortSummary.addedManualBindings, 42);
  assert.equal(report.currentEpoch.catalogTransitions.length, 3);
  assert.ok(report.currentEpoch.catalogTransitions.every(ref => ref.status === 'exact-current-MM-catalog-bytes-retained-from-H-reviewed-transition'));
  assert.equal(report.currentEpoch.currentData.sha256, '2ab84cfe5e4234e5d0303b2062f941f7d8e1b93d798a7402c16e78d6d2e4672c');
});
