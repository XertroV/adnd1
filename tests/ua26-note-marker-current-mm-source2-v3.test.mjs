// Original MM assertions retain their fixed historical fixture under a separate genuine Source2 proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from './helpers/ua26-current-mm-cli-source2-v1.mjs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('current-MM UA26 CLI proves the complete cohort and retained catalog transition before reporting markers', () => {
  const output = execFileSync(process.execPath, ['tools/ua26-note-marker-audit-mm-source2-v1.mjs'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const report = JSON.parse(output);
  assert.equal(report.ok, true);
  assert.equal(report.semanticPass, false);
  assert.equal(report.sourceValueGrade, 'NOT PROMOTED');
  assert.equal(report.contextualAdequacy, 'NOT ASSESSED');
  assert.equal(report.epochRole, 'historical-MM-checkpoint-under-genuine-current-Source2');
  assert.equal(report.currentSource2Epoch.summary.stage, 'source2-body-native');
  assert.equal(report.currentSource2Epoch.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  assert.equal(report.currentSource2Epoch.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
  assert.equal(report.currentSource2Epoch.data.path, 'dist/data.json');
  assert.equal(report.currentSource2Epoch.data.sha256, '16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573');
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
// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
