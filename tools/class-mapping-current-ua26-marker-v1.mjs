// Additive next-native wrapper around the frozen UA26 marker semantic core.
// Keeps the 68-row/66-alias historical census and H-reviewed transition proof
// distinct from the new body identity; all value/context/default grades remain pending.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {auditUa26MarkerReceipt} from './ua26-note-marker-audit.mjs';
import {qualifyCurrentConsumerStage, currentConsumerRepoRoot, requireQualificationArtifact, sourceBodyReference} from './class-mapping-current-consumer-runtime-v1.mjs';

export const ua26CurrentNativeContractPath = 'research/class-mapping-current-adapters-v1/ua26-marker-current-contract-v1.json';
const oldContractPath = 'research/mm-current-cli-successors-v1/ua26-marker-current-mm-v1.json';
const oldContractSha = '131b7d322a56b87a3373a4f5ec7c1b586549b40349600a566ff5b289c50b1c9d';
const corePath = 'tools/ua26-note-marker-audit.mjs';
const coreSha = '4cd3e158451d842c4b097a0ddc726b5c248dfe2b0428cae719f1e4b27a85c49c';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(resolve(currentConsumerRepoRoot, path));
const parse = path => JSON.parse(read(path).toString('utf8'));
const fail = message => { throw new Error(`Invalid next-native UA26 marker audit: ${message}`); };

function verifyHistoricalTransition(contract) {
  const transition = contract.historicalHTransition;
  for (const ref of [transition.registry, transition.diffProof]) {
    if (!ref?.path || !/^[a-f0-9]{64}$/.test(ref.sha256 || '') || sha(read(ref.path)) !== ref.sha256) {
      fail(`frozen H marker transition input changed: ${ref?.path}`);
    }
  }
  const registry = parse(transition.registry.path);
  if (registry.sourceEpoch?.commit !== transition.sourceCommit || registry.sourceEpoch?.tree !== transition.sourceTree
      || registry.semanticPass !== false || registry.sourceValueGradePromoted !== false
      || registry.contextualAdequacyPromoted !== false) fail('frozen H marker transition identity or grade boundary');
  const diff = parse(transition.diffProof.path);
  if (diff.sourceEpoch?.commit !== transition.sourceCommit || diff.sourceEpoch?.tree !== transition.sourceTree
      || diff.comparison?.results?.preexistingRegionObjectsChanged !== 0
      || diff.comparison?.results?.regionRemovals !== 0 || diff.comparison?.results?.appendedRegionObjects !== 6
      || diff.comparison?.results?.exactCatalogDenominator !== 3) fail('frozen H full-catalog diff proof');
  for (const ref of Object.values(registry.catalogTransitionQualification?.reviews || {})) {
    if (!ref?.path || !/^[a-f0-9]{64}$/.test(ref.sha256 || '') || sha(read(ref.path)) !== ref.sha256) fail(`frozen H review receipt changed: ${ref?.path}`);
  }
  const currentRows = registry.catalogTransitionQualification?.catalogs || [];
  if (currentRows.length !== 3 || !isDeepStrictEqual(currentRows.map(row => row.path).sort(),
    transition.catalogTransition.map(row => row.path).sort())) fail('exact three-catalog H transition scope');
  return registry;
}

export function auditUa26MarkerReceiptWithCurrentSourceEpoch(...args) {
  if (args.length) fail('native UA26 adapter accepts no caller root/receipt overrides');
  const stage = qualifyCurrentConsumerStage();
  const contractPin = requireQualificationArtifact(stage, ua26CurrentNativeContractPath);
  const contract = JSON.parse(contractPin.bytes.toString('utf8'));
  const binding = contract.nativeSourceEpochBinding;
  const oldBytes = read(oldContractPath);
  if (sha(oldBytes) !== oldContractSha) fail('frozen current-MM marker contract bytes changed');
  const oldContract = JSON.parse(oldBytes.toString('utf8'));
  if (contract.schemaVersion !== 1 || contract.artifactType !== 'Next-native UA26 marker audit contract'
      || contract.status !== 'qualified native S1 catalog transition; inherited UA26 grades remain pending'
      || contract.materialized !== true || binding?.sourceCommit !== stage.summary.sourceCommit
      || binding?.sourceTree !== stage.summary.sourceTree || binding?.fixturePath !== stage.summary.fixture.path
      || binding?.fixtureSha256 !== stage.summary.fixture.sha256
      || !isDeepStrictEqual(contract.historicalHTransition, oldContract.historicalHTransition)
      || !isDeepStrictEqual(contract.legacyMarkerReceipt, oldContract.legacyMarkerReceipt)
      || !isDeepStrictEqual(contract.expectedCounts, oldContract.expectedCounts)
      || !isDeepStrictEqual(contract.expectedLegacyMismatchMessages, oldContract.expectedLegacyMismatchMessages)
      || contract.gradeBoundary?.semanticPass !== false || contract.gradeBoundary?.sourceValueGrade !== 'NOT PROMOTED'
      || contract.gradeBoundary?.contextualAdequacy !== 'NOT ASSESSED'
      || contract.gradeBoundary?.defaultSelectionReview !== 'NOT PROMOTED') fail('closed S1 marker contract, historical H evidence or grade boundary changed');
  const prior = verifyHistoricalTransition(contract);
  if (sha(read(corePath)) !== coreSha) fail('frozen UA26 marker semantic core bytes changed');
  if (!Array.isArray(contract.currentS1Catalogs) || contract.currentS1Catalogs.length !== 3) fail('three current S1 catalog pins are required');
  const hPaths = contract.historicalHTransition.catalogTransition.map(row => row.path).sort();
  if (!isDeepStrictEqual(contract.currentS1Catalogs.map(row => row.path).sort(), hPaths)) fail('S1 catalog binding paths must equal the exact H-reviewed three-catalog set');
  const catalogRefs = contract.currentS1Catalogs.map(row => {
    const actual = sourceBodyReference(stage, row.path);
    if (!/^[a-f0-9]{64}$/.test(row.sha256 || '') || actual.sha256 !== row.sha256) fail(`S1 current catalog pin differs from native body: ${row.path}`);
    return {...actual, status:'current-S1-catalog-closed-by-native-body-fixture'};
  });
  const legacyReceipt = JSON.parse(read(contract.legacyMarkerReceipt.path).toString('utf8'));
  const expectedLegacyMismatches = contract.currentS1Catalogs
    .filter(row => row.sha256 !== legacyReceipt.currentCatalogHashes?.[row.path])
    .map(row => `${row.path}: current catalog hash differs from correction receipt`);
  const legacy = auditUa26MarkerReceipt(currentConsumerRepoRoot, contract.legacyMarkerReceipt.path);
  if (legacy.ok !== (expectedLegacyMismatches.length === 0)
      || !isDeepStrictEqual(legacy.failures, expectedLegacyMismatches)
      || !isDeepStrictEqual(legacy.counts, contract.expectedCounts)) {
    fail(`frozen UA26 marker census differs outside the exact registered three-catalog transition: ${legacy.failures?.join('; ') || 'counts/receipt changed'}`);
  }
  const currentData = sourceBodyReference(stage, 'dist/data.json');
  return {
    scope:'Native S1 source epoch plus frozen UA26 marker census and inherited H-reviewed three-catalog transitions; no value/context/default grade added',
    semanticPass:false,
    ok:true,
    receiptPath:contract.legacyMarkerReceipt.path,
    counts:legacy.counts,
    sourceMarkerCensusSha256:parse(contract.legacyMarkerReceipt.path).sourceMarkerCensusSha256,
    currentEpoch:{sourceCommit:stage.summary.sourceCommit,sourceTree:stage.summary.sourceTree,fixture:stage.summary.fixture,
      currentData,catalogTransitions:catalogRefs},
    sourceValueGrade:contract.gradeBoundary.sourceValueGrade,
    contextualAdequacy:contract.gradeBoundary.contextualAdequacy,
    defaultSelectionReview:contract.gradeBoundary.defaultSelectionReview,
    historicalTransitionRegistry:contract.historicalHTransition.registry,
    historicalTransitionStatus:prior.status,
    registryRef:{path:ua26CurrentNativeContractPath,sha256:contractPin.sha256},
  };
}
