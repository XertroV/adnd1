import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {assertClassMappingCurrentSourceIdentity} from '../tools/class-mapping-current-source-gate-v1.mjs';
import {controlledGitEnvironment} from '../tools/class-mapping-raw-git-v1.mjs';

const root = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('UA26 marker replay keeps its MM fixture separate from genuine current S1 data and catalogs', {timeout:600_000}, () => {
  const before = assertClassMappingCurrentSourceIdentity();
  const raw = readFileSync(resolve(root, 'dist/data.json'));
  assert.equal(hash(raw), before.inputHashes.sourceBody['dist/data.json']);
  const report = JSON.parse(execFileSync(process.execPath, ['research/class-mapping-history-v1/replay-tools/ua26-note-marker-audit-mm-s1-v1.mjs'], {
    cwd:root, encoding:'utf8', maxBuffer:16*1024*1024, env:controlledGitEnvironment(),
  }));
  assert.equal(report.epochRole, 'historical-MM-checkpoint-under-genuine-current-S1');
  assert.deepEqual(report.currentS1Epoch.summary, before.summary);
  assert.equal(report.currentS1Epoch.summary.owners, 1070);
  assert.equal(report.currentS1Epoch.data.sha256, hash(raw));
  assert.equal(report.currentEpoch.cohortSummary.owners, 1064);
  assert.equal(report.currentEpoch.sourceInputCommit, '0f2d70a135e3ad486152bf00f21387d60a1a97ef');
  assert.equal(report.currentEpoch.currentData.sha256, '2ab84cfe5e4234e5d0303b2062f941f7d8e1b93d798a7402c16e78d6d2e4672c');
  assert.notEqual(report.currentEpoch.currentData.sha256, report.currentS1Epoch.data.sha256);
  assert.equal(report.currentS1Epoch.retainedCatalogs.length, 3);
  for (const ref of report.currentS1Epoch.retainedCatalogs) {
    assert.equal(hash(readFileSync(resolve(root, ref.path))), ref.sha256);
    assert.equal(ref.sha256, before.inputHashes.sourceBody[ref.path]);
  }
  assert.deepEqual(report.counts, {physicalRows:68,marked:17,unmarked:51,aliases:66});
  assert.equal(report.ok, true);
  assert.equal(report.semanticPass, false);
  assert.equal(report.sourceValueGrade, 'NOT PROMOTED');
  assert.equal(report.contextualAdequacy, 'NOT ASSESSED');
  assert.deepEqual(assertClassMappingCurrentSourceIdentity(), before);
});
