#!/usr/bin/env node
// Additive current-MM compatibility adapter. The frozen H audit remains an
// unchanged semantic core; this wrapper first proves the complete current-MM
// cohort, then proves that its three reviewed H-transition catalogs are the
// exact same current Git/worktree objects before accepting the core's three
// expected historical-receipt hash mismatches.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditUa26MarkerReceipt} from './ua26-note-marker-audit.mjs';
import {assertCurrentMmSourceEpoch} from './mm-current-source-gate-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ua26CurrentMmContractPath = 'research/mm-current-cli-successors-v1/ua26-marker-current-mm-v1.json';
export const ua26CurrentMmContractSha256 = '131b7d322a56b87a3373a4f5ec7c1b586549b40349600a566ff5b289c50b1c9d';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Invalid current-MM UA26 marker audit: ${message}`); };
const readBytes = rel => fs.readFileSync(path.resolve(root, rel));
const readJson = rel => JSON.parse(readBytes(rel).toString('utf8'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const gitBytes = (commit, rel) => execFileSync('git', ['-C', root, 'show', `${commit}:${rel}`], {maxBuffer: 64 * 1024 * 1024});

function loadClosedContract() {
  const bytes = readBytes(ua26CurrentMmContractPath);
  if (sha256(bytes) !== ua26CurrentMmContractSha256) fail('current-MM marker contract bytes changed');
  const contract = JSON.parse(bytes.toString('utf8'));
  if (contract.schemaVersion !== 1
      || contract.artifactType !== 'Current-MM UA26 marker audit compatibility contract'
      || contract.status !== 'current-MM cohort guarded; inherited H marker semantics rechecked against current catalogs'
      || contract.gradeBoundary?.semanticPass !== false
      || contract.gradeBoundary?.sourceValueGrade !== 'NOT PROMOTED'
      || contract.gradeBoundary?.contextualAdequacy !== 'NOT ASSESSED') fail('contract identity or review boundary');
  return contract;
}

function validateHistoricalCatalogTransition(contract) {
  const {historicalHTransition: transition} = contract;
  const registryBytes = readBytes(transition.registry.path);
  if (sha256(registryBytes) !== transition.registry.sha256) fail('pinned H transition registry bytes');
  const registry = JSON.parse(registryBytes.toString('utf8'));
  if (registry.sourceEpoch?.commit !== transition.sourceCommit
      || registry.sourceEpoch?.tree !== transition.sourceTree
      || registry.sourceEpoch?.commit !== 'bc819621e49788260bb34ea47c1f7a8b35af6edf'
      || registry.sourceEpoch?.tree !== 'e6bc420f70656825a926297b959bc6d98758bfcd'
      || registry.semanticPass !== false
      || registry.sourceValueGradePromoted !== false
      || registry.contextualAdequacyPromoted !== false) fail('historical H transition identity or grade boundary');
  const diffRef = registry.catalogTransitionQualification?.diff?.proof;
  if (!same(diffRef, transition.diffProof)) fail('historical full catalog diff proof reference');
  const diff = JSON.parse(readBytes(diffRef.path).toString('utf8'));
  if (sha256(readBytes(diffRef.path)) !== diffRef.sha256
      || diff.sourceEpoch?.commit !== transition.sourceCommit || diff.sourceEpoch?.tree !== transition.sourceTree
      || diff.comparison?.results?.preexistingRegionObjectsChanged !== 0
      || diff.comparison?.results?.regionRemovals !== 0
      || diff.comparison?.results?.appendedRegionObjects !== 6
      || diff.comparison?.results?.exactCatalogDenominator !== 3) fail('historical H catalog diff proof content');
  for (const ref of Object.values(registry.catalogTransitionQualification.reviews || {})) {
    if (sha256(readBytes(ref.path)) !== ref.sha256) fail(`stale inherited UA28 review ${ref.path}`);
  }
  const catalogRefs = transition.catalogTransition;
  const registryRows = registry.catalogTransitionQualification.catalogs || [];
  if (catalogRefs.length !== 3 || registryRows.length !== 3
      || !same(catalogRefs.map(row => [row.path, row.sha256]), registryRows.map(row => [row.path, row.currentSha256]))) {
    fail('exact three-catalog current H transition scope');
  }
  for (const ref of catalogRefs) {
    if (sha256(readBytes(ref.path)) !== ref.sha256) fail(`current catalog bytes differ from the reviewed H successor: ${ref.path}`);
    if (sha256(gitBytes(contract.sourceEpoch.sourceCommit, ref.path)) !== ref.sha256) fail(`current-MM committed catalog differs from the reviewed H successor: ${ref.path}`);
  }
  return registry;
}

export function auditUa26MarkerReceiptWithMmCurrentSourceEpoch(repoRoot = root) {
  const {inputs, summary} = assertCurrentMmSourceEpoch(repoRoot);
  const contract = loadClosedContract();
  if (summary.sourceCommit !== contract.sourceEpoch.sourceCommit
      || summary.sourceTree !== contract.sourceEpoch.sourceTree
      || inputs.rawInputs[contract.sourceEpoch.data.path] !== contract.sourceEpoch.data.sha256) {
    fail('current full MM cohort differs from the closed MM marker contract');
  }
  const registry = validateHistoricalCatalogTransition(contract);
  if (sha256(readBytes(contract.legacyMarkerReceipt.path)) !== contract.legacyMarkerReceipt.sha256) fail('frozen marker receipt bytes');
  if (sha256(readBytes('tools/ua26-note-marker-audit.mjs')) !== '4cd3e158451d842c4b097a0ddc726b5c248dfe2b0428cae719f1e4b27a85c49c') fail('frozen marker semantic core bytes changed');
  const legacy = auditUa26MarkerReceipt(repoRoot, contract.legacyMarkerReceipt.path);
  if (legacy.ok !== false
      || !same(legacy.failures, contract.expectedLegacyMismatchMessages)
      || !same(legacy.counts, contract.expectedCounts)) {
    fail(`frozen marker/alias core changed outside the three closed receipt-bound catalog hash transitions${legacy.failures ? `: ${legacy.failures.join('; ')}` : ''}`);
  }
  const catalogTransition = contract.historicalHTransition.catalogTransition.map(ref => ({
    ...ref,
    status: 'exact-current-MM-catalog-bytes-retained-from-H-reviewed-transition',
  }));
  return {
    scope: 'Current-MM source epoch plus the frozen UA26 marker census rechecked against exact current catalogs; no numeric/value or contextual-adequacy grade added',
    semanticPass: false,
    ok: true,
    receiptPath: contract.legacyMarkerReceipt.path,
    counts: legacy.counts,
    sourceMarkerCensusSha256: readJson(contract.legacyMarkerReceipt.path).sourceMarkerCensusSha256,
    currentEpoch: {
      sourceInputCommit: summary.sourceCommit,
      sourceInputTree: summary.sourceTree,
      cohortFixture: contract.sourceEpoch.cohortFixture,
      currentData: {path: contract.sourceEpoch.data.path, sha256: inputs.rawInputs[contract.sourceEpoch.data.path]},
      cohortSummary: summary,
      catalogTransitions: catalogTransition,
    },
    sourceValueGrade: contract.gradeBoundary.sourceValueGrade,
    contextualAdequacy: contract.gradeBoundary.contextualAdequacy,
    historicalTransitionRegistry: contract.historicalHTransition.registry,
    historicalTransitionStatus: registry.status,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(auditUa26MarkerReceiptWithMmCurrentSourceEpoch(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  }
}
