import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const testDir = import.meta.dirname;
const repoRoot = resolve(testDir, '..');
const requiredInstalledFiles = [
  'tools/source-report-consistency-audit-next-native-v2.mjs',
];
for (const file of requiredInstalledFiles) {
  assert.ok(existsSync(resolve(repoRoot, file)), `required installed file missing: ${file}`);
}
const analyzerPath = resolve(repoRoot, 'tools/source-report-consistency-audit-next-native-v2.mjs');
const {analyzeReportConsistency, fieldBindingCountMeaning} = await import(pathToFileURL(analyzerPath));

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const parsedDataSha256 = 'a'.repeat(64);
const rawDataSha256 = 'b'.repeat(64);
const systemicPath = 'reports/current-systemic.json';
const systemicSha256 = 'c'.repeat(64);
const systemic = {
  input: {sha256: parsedDataSha256},
  evidenceBindings: {
    denominator: 0,
    bindings: [],
    targetStatusCounts: {},
    reviewStatusCounts: {},
  },
};
const emptyMetrics = {
  denominator: 0,
  emptyRegionTargets: 0,
  resolvedRegionTargets: 0,
  recordTargetResolvedBindings: 0,
  regionResolvedFieldReviewPendingBindings: 0,
  fieldTargetReviewed: 0,
  fieldTargetNotReviewed: 0,
  resolvedButFieldTargetNotReviewed: 0,
};

function fixture() {
  const exclusion = 'All ordinary unchecked mechanics fields (0);';
  const handoff = {
    snapshot: {parsedDataSha256, rawDistDataFileSha256: rawDataSha256},
    summary: {formalMechanicsFieldStatuses: {ordinaryUncheckedFieldsExcluded: 0}},
    excludedFromGapCount: [exclusion],
    reviewQueuesNotSourceAbsences: {
      fieldBindingAndHistoricalScopeQueues: {
        systemicReportPath: systemicPath,
        reportHashes: {systemic: systemicSha256},
        emptyRegionTargetBindings: 0,
        fieldEvidenceBindingsDenominator: 0,
        fieldTargetsPending: 0,
        countMeaning: fieldBindingCountMeaning(emptyMetrics),
      },
      rowNormalizedMonetaryReview: {reports: []},
    },
  };
  const handoffBytes = Buffer.from(`${JSON.stringify(handoff, null, 2)}\n`);
  const gaps = {
    snapshot: {
      dataSha256: parsedDataSha256,
      rawDataSha256: rawDataSha256,
      handoffSha256: sha(handoffBytes),
    },
    coverage: {
      counts: {
        emptyRegionTargetBindings: 0,
        fieldEvidenceBindingDenominator: 0,
        pendingFieldTargets: 0,
      },
      denominators: {mechanicsUncheckedFieldsExcluded: 0},
      exclusions: [exclusion],
    },
  };
  const baseHashes = {
    [systemicPath]: systemicSha256,
    'dist/data.json': rawDataSha256,
    'dist/data.json#parsed-json': parsedDataSha256,
  };
  return {
    handoff,
    gaps,
    currentHashes: baseHashes,
    exactHandoffSha256: sha(handoffBytes),
  };
}

function analyze(input) {
  return analyzeReportConsistency({
    ...input,
    systemic,
    registration: {artifactType: 'current-exact-monetary-known-finding-registration'},
    registrationRef: {path: 'registration.json', sha256: 'd'.repeat(64)},
  });
}

test('fresh handoff alias: missing and incorrect joins are rejected; exact handoff bytes pass', () => {
  const missingAlias = fixture();
  assert.throws(() => analyze(missingAlias), /public gaps projection is stale/);

  const exactAlias = fixture();
  exactAlias.currentHashes['research/gaps-limitations-next-task.json'] = exactAlias.exactHandoffSha256;
  const accepted = analyze(exactAlias);
  assert.equal(accepted.validation.valid, true);
  assert.equal(accepted.validation.semanticPass, false);
  assert.deepEqual(accepted.findings, []);

  const wrongAlias = fixture();
  wrongAlias.currentHashes['research/gaps-limitations-next-task.json'] = '0'.repeat(64);
  assert.throws(() => analyze(wrongAlias), /public gaps projection is stale/);
});
