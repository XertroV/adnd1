#!/usr/bin/env node
// Research-only native-H successor with the installed full cohort guard.
// The legacy audit remains unchanged and supplies every marker/alias assertion.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
function locateRepoRoot(start = here) {
  let current = path.resolve(start);
  for (;;) {
    if (path.basename(current) === 'tools'
        && fs.existsSync(path.join(current, 'ua26-note-marker-audit.mjs'))) return path.dirname(current);
    if (fs.existsSync(path.join(current, 'tools', 'ua26-note-marker-audit.mjs'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('Cannot locate tools/ua26-note-marker-audit.mjs from this helper');
    current = parent;
  }
}

const repoRoot = locateRepoRoot();
const {auditUa26MarkerReceipt} = await import(pathToFileURL(
  path.join(repoRoot, 'tools/ua26-note-marker-audit.mjs')
).href);

export const ua26MarkerHTransitionRegistryPath = 'research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json';
export const ua26MarkerHTransitionRegistrySha256 = '477a06a2d1fe0f3e87d4e02f60604532aa3aaeebe5e50a68c8cb27bc959bd2c3';
export const ua26MarkerHTransitionProofSha256 = '22fdb51eca0ea89b67ccf9578d412e6bb2b3b4f16d4d8111d3ad637566881403';
export const ua26MarkerHNativeFixtureSha256 = '62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f';
const hirelingsCurrentSourceHelperPath = 'tests/helpers/hirelings-source-current-cohort.mjs';
const hirelingsCurrentSourceHelperSha256 = '9cec0405991d67fef08eba7859c8b8f300942295379e1f83c84ee8b21d048998';
const hirelingsCurrentSourceKernelPath = 'tests/helpers/hirelings-source-current-cohort-kernel-v1.mjs';
const hirelingsCurrentSourceKernelSha256 = 'aca1b4ddef5ee0f1b66684fb22a8879fa77a0c925d5c5da4f909c0430fcba9df';
const hirelingsCurrentMechanicsPath = 'research/mechanics-audit-progress.json';
const hirelingsCurrentMechanicsSha256 = '5627488c038354a15e4cc3ab1871dab02eb1f3eec9fa84a5ff3666cf253bcc43';
const ua26MarkerHSourceCommit = 'bc819621e49788260bb34ea47c1f7a8b35af6edf';
const ua26MarkerHSourceTree = 'e6bc420f70656825a926297b959bc6d98758bfcd';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Invalid native-H UA26 marker transition h-v2: ${message}`); };
const readBytes = (root, rel) => fs.readFileSync(path.join(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], {maxBuffer: 64 * 1024 * 1024});
const nativeCohortCheckedRoots = new Set();

const expectedLegacyHashes = Object.freeze({
  'dist/scans/verified/equipment-ua-harpoon.json': '6278d7e6104692e83c8c7312d127b8ee5faa5999bc5fa1abce9ea8ae58787247',
  'dist/scans/verified/equipment-phb-hammer.json': 'cfb47569d010a1bfd7a540da1eb9a550417da3a6787e00e716989ded93574538',
  'dist/scans/verified/equipment-phb-javelin.json': 'c3df025fa7a92e993fed997ba871f82bbee2c78b559a88ced8a7cf1d11fb106c'
});

const expectedAddedRegions = Object.freeze({
  'dist/scans/verified/equipment-ua-harpoon.json': [
    {id: 'ua28-ac-field-ua-harpoon-v2', role: 'row', verificationScope: 'selected-values'},
    {id: 'ua28-ac-range-note-ua-harpoon-v2', role: 'context', verificationScope: 'source-excerpt'}
  ],
  'dist/scans/verified/equipment-phb-hammer.json': [
    {id: 'ua28-ac-field-phb-hammer-v2', role: 'row', verificationScope: 'selected-values'},
    {id: 'ua28-ac-range-note-phb-hammer-v2', role: 'context', verificationScope: 'source-excerpt'}
  ],
  'dist/scans/verified/equipment-phb-javelin.json': [
    {id: 'ua28-ac-field-phb-javelin-v2', role: 'row', verificationScope: 'selected-values'},
    {id: 'ua28-ac-range-note-phb-javelin-v2', role: 'context', verificationScope: 'source-excerpt'}
  ]
});

function requireHash(root, ref, expected, label) {
  if (sha256(readBytes(root, ref)) !== expected) fail(`${label} bytes or epoch`);
}

function validateSourceEpoch(root, registry) {
  const epoch = registry.sourceEpoch;
  if (epoch.commit !== ua26MarkerHSourceCommit || epoch.tree !== ua26MarkerHSourceTree
      || epoch.nativeFixture?.path !== 'tests/fixtures/hirelings-source-current-cohort-v1.json'
      || epoch.nativeFixture?.sha256 !== ua26MarkerHNativeFixtureSha256
      || epoch.currentData?.path !== 'dist/data.json'
      || epoch.rawInputs?.['dist/data.json'] !== epoch.currentData?.sha256) {
    fail('native-H source epoch identity or bounded data input');
  }
  requireHash(root, epoch.nativeFixture.path, ua26MarkerHNativeFixtureSha256, 'native-H source fixture');
  requireHash(root, hirelingsCurrentSourceHelperPath, hirelingsCurrentSourceHelperSha256, 'installed native-H cohort helper');
  requireHash(root, hirelingsCurrentSourceKernelPath, hirelingsCurrentSourceKernelSha256, 'installed native-H cohort kernel');
  requireHash(root, hirelingsCurrentMechanicsPath, hirelingsCurrentMechanicsSha256, 'native-H mechanics input');
  const fixture = readJson(root, epoch.nativeFixture.path);
  if (fixture.artifactType !== 'Native actual-current hirelings source cohort contract'
      || fixture.sourceCommit !== ua26MarkerHSourceCommit
      || fixture.sourceTree !== ua26MarkerHSourceTree
      || fixture.baseline?.baselineCommit !== '1f79d909344ebe7d41a432d8673f3eedb491fa3b'
      || !deepEqual(fixture.sourceRawInputs, epoch.rawInputs)) {
    fail('native-H fixture source commit/tree or exact raw-input set');
  }
  for (const [rel, expected] of Object.entries(registry.sourceEpoch.rawInputs)) {
    requireHash(root, rel, expected, `native-H source input ${rel}`);
  }
  const handoffRef = epoch.sourceHandoffTransition;
  requireHash(root, handoffRef.path, handoffRef.sha256, 'native-H source handoff receipt');
  const handoff = readJson(root, handoffRef.path);
  if (handoff.artifactType !== 'exact-HIRED-native-source-body-historical-transition-qualification'
      || handoff.sourceEpoch?.contract?.path !== epoch.nativeFixture.path
      || handoff.sourceEpoch?.contract?.sha256 !== ua26MarkerHNativeFixtureSha256
      || handoff.sourceEpoch?.sourceCommit !== ua26MarkerHSourceCommit
      || handoff.sourceEpoch?.sourceTree !== ua26MarkerHSourceTree
      || handoff.currentSourceData?.path !== epoch.currentData.path
      || handoff.currentSourceData?.rawSha256 !== epoch.currentData.sha256
      || handoff.sourceEpoch?.sourceRawInputs?.length !== Object.keys(epoch.rawInputs).length) {
    fail('native-H handoff source fixture, data bytes, or raw-input denominator');
  }
  const handoffInputs = new Map(handoff.sourceEpoch.sourceRawInputs.map(row => [row.path, row.sha256]));
  if (!deepEqual([...Object.entries(epoch.rawInputs)].sort(), [...handoffInputs.entries()].sort())) {
    fail('native-H handoff raw source input set');
  }
  if (!fs.existsSync(path.join(root, '.git'))) fail('native-H source requires the actual read-only Git metadata pointer');
  if (git(root, 'rev-parse', `${ua26MarkerHSourceCommit}^{tree}`).toString().trim() !== ua26MarkerHSourceTree) {
    fail('actual native-H source Git tree');
  }
  try {
    git(root, 'merge-base', '--is-ancestor', ua26MarkerHSourceCommit, 'HEAD');
  } catch {
    fail('native-H source commit is not an ancestor of current HEAD');
  }
  for (const [rel, expected] of Object.entries(epoch.rawInputs)) {
    if (sha256(git(root, 'show', `${ua26MarkerHSourceCommit}:${rel}`)) !== expected) {
      fail(`native-H committed source input ${rel}`);
    }
  }

  const canonicalRoot = path.resolve(root);
  if (!nativeCohortCheckedRoots.has(canonicalRoot)) {
    const installedToolPath = path.join(root, 'tools', path.basename(fileURLToPath(import.meta.url)));
    const guardToolPath = fs.existsSync(installedToolPath) ? installedToolPath : fileURLToPath(import.meta.url);
    const output = execFileSync(process.execPath, [guardToolPath, '--native-h-current-source-guard'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024
    });
    const summary = JSON.parse(output);
    const expected = {
      sourceCommit: ua26MarkerHSourceCommit,
      owners: 1062,
      canonicalBindings: 5655,
      priorWholeBindings: 4931,
      addedBindings: 724,
      manualAdditions: 321,
      newRules: 48,
      sourceTableRows: 244,
      sourceCells: 343,
      historicalMechanicsReviews: 1215
    };
    if (!deepEqual(summary, expected)) fail('installed full native-H current-source cohort result');
    nativeCohortCheckedRoots.add(canonicalRoot);
  }
}

function validateReviewFiles(root, registry) {
  const refs = registry.catalogTransitionQualification.reviews;
  for (const [name, ref] of Object.entries(refs)) requireHash(root, ref.path, ref.sha256, `${name} review`);
  return {
    fieldTarget: readJson(root, refs.fieldTarget.path),
    noteCaption: readJson(root, refs.noteCaption.path),
    rowCaption: readJson(root, refs.rowCaption.path)
  };
}

function validateFieldTargetScope(registry, reviews) {
  const review = reviews.fieldTarget;
  const scope = registry.catalogTransitionQualification.fieldTargetScope;
  if (review.artifactType !== 'UA p.28 / PDF p.29 three-equipment field-target location independent review evidence'
      || review.status !== 'confirmed exact owner/field-to-row location for Hammer, Harpoon, and Javelin; all source-value grades and contextual adequacy remain unassessed'
      || review.reviewScope?.rows !== 3
      || review.reviewScope?.sourceRowsAreAC0Through10 !== true
      || review.reviewScope?.rowCellCount !== 11
      || review.reviewScope?.explicitOutOfScopeChecks?.length !== 5
      || review.decisionBoundary?.sourceValue !== 'not assessed; do not promote sourceValueStatus or add valueReview'
      || review.decisionBoundary?.context !== 'not assessed; do not promote contextStatus to complete-table or complete-passage review'
      || review.targets?.length !== 3) fail('field-target review scope or grade boundary');

  const expectedByOwner = new Map(scope.owners.map(row => [row.itemId, row]));
  const seen = new Set();
  for (const target of review.targets) {
    const expected = expectedByOwner.get(target.itemId);
    const ids = target.selectedRegions?.map(region => region.regionId);
    if (!expected || seen.has(target.itemId)
        || target.target?.fieldPointer !== scope.fieldPointer
        || target.targetLocationDecision !== 'confirmed for this owner/field-to-row location only'
        || target.sourceValueStatus !== 'not-assessed-by-field-target-review; no numeric/source-value grade assigned'
        || target.contextualAdequacyStatus !== 'context-not-assessed; source location review is not a complete context review'
        || !deepEqual(ids, expected.regionIds)) {
      fail(`field-target review owner/scope: ${target.itemId || 'unknown owner'}`);
    }
    seen.add(target.itemId);
  }
  if (seen.size !== expectedByOwner.size) fail('field-target review owner set');
}

function validateCaptionReviewChain(registry, reviews) {
  const noteReview = reviews.noteCaption;
  const rowReview = reviews.rowCaption;
  const refs = registry.catalogTransitionQualification.reviews;
  if (noteReview.artifactType !== 'UA28 three-equipment caption-only independent metadata successor review'
      || rowReview.previousIndependentNoteCaptionReview?.path !== refs.noteCaption.path
      || rowReview.previousIndependentNoteCaptionReview?.sha256 !== refs.noteCaption.sha256
      || rowReview.targets?.length !== 3
      || noteReview.targets?.length !== 3
      || !/no value or contextual-adequacy grade promoted/.test(noteReview.status)
      || rowReview.status !== 'confirmed three changed row-summary content hashes; source-value/contextual-adequacy grades remain unassessed') {
    fail('caption-only review chain or decision boundary');
  }

  const expectedByItem = new Map(registry.catalogTransitionQualification.catalogs.map(row => [row.owner, row]));
  const fieldByItem = new Map(reviews.fieldTarget.targets.map(target => [target.itemId, target]));
  for (const [label, review, regionPrefix] of [
    ['note caption', noteReview, 'ua28-ac-range-note-'],
    ['row caption', rowReview, 'ua28-ac-field-']
  ]) {
    const seen = new Set();
    for (const target of review.targets) {
      const expected = expectedByItem.get(target.itemId);
      const expectedRegion = expected?.addedRegions.find(id => id.startsWith(regionPrefix));
      const previousReviewCatalog = label === 'note caption'
        ? fieldByItem.get(target.itemId)?.ownerCatalog?.sha256
        : noteReview.targets.find(previous => previous.itemId === target.itemId)?.afterCatalog?.sha256;
      if (!expected || !expectedRegion || seen.has(target.itemId)
          || target.changedMetadata?.regionId !== expectedRegion
          || target.changedMetadata?.property !== 'summary'
          || target.sourceValueGrade !== 'NOT PROMOTED'
          || target.contextualAdequacy !== 'NOT ASSESSED') {
        fail(`${label} target scope: ${target.itemId || 'unknown owner'}`);
      }
      if (target.beforeCatalog?.sha256 !== previousReviewCatalog) {
        fail(`${label} predecessor catalog chain: ${target.itemId}`);
      }
      if (label === 'note caption' && target.afterCatalog?.sha256 !== expected.noteCaptionIntermediateSha256) {
        fail(`note caption intermediate catalog hash: ${target.itemId}`);
      }
      if (label === 'row caption' && target.afterCatalog?.sha256 !== expected.currentSha256) {
        fail(`row caption final catalog hash: ${target.itemId}`);
      }
      seen.add(target.itemId);
    }
    if (seen.size !== expectedByItem.size) fail(`${label} owner set`);
  }
}

function validateFullCatalogTransition(root, registry, receipt, reviews) {
  const qualification = registry.catalogTransitionQualification;
  const rows = qualification.catalogs;
  if (!Array.isArray(rows) || rows.length !== 3
      || qualification.baseline?.commit !== 'd4229f438757ee2cad5ecbe8327e21731a38a3ed'
      || qualification.baseline?.tree !== '7cab21346a5f34c333418a88bb8a9faacf14e030'
      || qualification.catalogPayloadCommit?.commit !== '2af25997fb831b89a5ff158ed55e17ccf5943fbe'
      || qualification.catalogPayloadCommit?.tree !== '53f25e4bd350fe72cba9869f80f6e72ee0b5c245'
      || qualification.currentInputCommit?.commit !== ua26MarkerHSourceCommit
      || qualification.currentInputCommit?.tree !== ua26MarkerHSourceTree
      || qualification.diff?.preexistingCatalogPropertiesUnchanged !== true
      || qualification.diff?.onlyChanges !== 'two appended UA28 region objects per catalog; no existing region or non-region property changed') {
    fail('full old-receipt-to-current catalog transition qualification');
  }

  const diffProofRef = qualification.diff.proof;
  if (diffProofRef.sha256 !== ua26MarkerHTransitionProofSha256) fail('pinned H catalog diff proof identity');
  requireHash(root, diffProofRef.path, diffProofRef.sha256, 'full catalog diff proof');
  const diffProof = readJson(root, diffProofRef.path);
  if (diffProof.artifactType !== 'full parsed-catalog transition evidence for the H-current UA26 marker audit successor'
      || diffProof.sourceEpoch?.commit !== ua26MarkerHSourceCommit
      || diffProof.sourceEpoch?.tree !== ua26MarkerHSourceTree
      || diffProof.comparison?.baselineCommit !== qualification.baseline.commit
      || diffProof.comparison?.catalogPayloadCommit !== qualification.catalogPayloadCommit.commit
      || diffProof.comparison?.currentInputCommit !== qualification.currentInputCommit.commit
      || diffProof.comparison?.results?.allTopLevelPropertiesUnchanged !== true
      || diffProof.comparison?.results?.preexistingRegionObjectsChanged !== 0
      || diffProof.comparison?.results?.regionRemovals !== 0
      || diffProof.comparison?.results?.appendedRegionObjects !== 6
      || diffProof.comparison?.results?.currentCatalogBytesEqualPayloadCommit !== true
      || diffProof.comparison?.results?.currentCatalogBytesEqualSourceEpoch !== true
      || diffProof.comparison?.results?.exactCatalogDenominator !== 3
      || diffProof.catalogs?.length !== 3) fail('full parsed-catalog diff proof content or denominator');

  const actualPaths = rows.map(row => row.path).sort();
  const expectedPaths = Object.keys(expectedLegacyHashes).sort();
  if (!deepEqual(actualPaths, expectedPaths)) fail('catalog hash transition widened beyond three reviewed owners');

  validateFieldTargetScope(registry, reviews);
  validateCaptionReviewChain(registry, reviews);

  for (const row of rows) {
    if (expectedLegacyHashes[row.path] !== row.previousReceiptSha256
        || receipt.currentCatalogHashes?.[row.path] !== row.previousReceiptSha256
        || row.previousReceiptSha256 !== row.baselineCatalogSha256) {
      fail(`${row.path}: predecessor catalog hash does not match frozen UA26 receipt`);
    }
    requireHash(root, row.path, row.currentSha256, `${row.path} exact current bytes`);
    if (row.currentSha256 !== row.v7AfterCatalogSha256) fail(`${row.path}: final V7 catalog hash`);

    const diffRow = diffProof.catalogs.find(item => item.path === row.path);
    if (!diffRow
        || diffRow.baselineReceiptSha256 !== row.previousReceiptSha256
        || diffRow.baselineRawSha256 !== row.baselineCatalogSha256
        || diffRow.currentRawSha256 !== row.currentSha256
        || diffRow.payloadRawSha256 !== row.currentSha256
        || diffRow.sourceEpochRawSha256 !== row.currentSha256
        || diffRow.baselineRegionCount !== row.beforeRegionCount
        || diffRow.currentRegionCount !== row.afterRegionCount
        || !deepEqual(diffRow.addedRegions.map(item => item.id), row.addedRegions)) {
      fail(`${row.path}: full diff proof binding`);
    }
    if (sha256(git(root, 'show', `${ua26MarkerHSourceCommit}:${row.path}`)) !== row.currentSha256) {
      fail(`${row.path}: actual native-H committed catalog bytes`);
    }

    const target = reviews.fieldTarget.targets.find(item => item.itemId === row.owner);
    const catalog = readJson(root, row.path);
    const currentRegions = catalog.regions.filter(region => row.addedRegions.includes(region.id));
    const ua28Regions = catalog.regions.filter(region => region.id.startsWith('ua28-ac-'));
    const byId = new Map(currentRegions.map(region => [region.id, region]));
    const expectedAddition = registry.catalogTransitionQualification.addedRegionProofs
      .filter(proof => proof.path === row.path);
    if (!target || !deepEqual(ua28Regions.map(region => region.id), row.addedRegions)
        || !deepEqual(ua28Regions.map(region => ({id: region.id, role: region.role, verificationScope: region.verificationScope})),
          row.addedRegions.map((id, index) => ({id, ...expectedAddedRegions[row.path][index]})))
        || expectedAddition.length !== 2) fail(`${row.path}: exact UA28 append set`);

    const captionTargets = new Map(reviews.rowCaption.targets.map(item => [item.itemId, item]));
    const noteTargets = new Map(reviews.noteCaption.targets.map(item => [item.itemId, item]));
    const rowCaption = captionTargets.get(row.owner)?.changedMetadata?.after;
    const noteCaption = noteTargets.get(row.owner)?.changedMetadata?.after;
    for (const proof of expectedAddition) {
      const region = byId.get(proof.regionId);
      const expectedSummary = proof.regionId.startsWith('ua28-ac-field-') ? rowCaption : noteCaption;
      if (!region || sha256(Buffer.from(JSON.stringify(region))) !== proof.regionObjectSha256
          || sha256(Buffer.from(region.summary || '')) !== proof.summarySha256
          || region.summary !== expectedSummary) fail(`${row.path}: exact appended region/caption evidence (${proof.regionId})`);
    }

    const targetRegionIds = target.selectedRegions?.map(region => region.regionId);
    if (!deepEqual(targetRegionIds, row.addedRegions)
        || row.noteCaptionIntermediateSha256 !== noteTargets.get(row.owner)?.afterCatalog?.sha256) {
      fail(`${row.path}: field-target and intermediate caption transition binding`);
    }
  }
}

/**
 * Runs the complete frozen UA26 marker audit against the exact native-H source
 * fixture and raw inputs. Only the exact three receipt-bound catalog changes
 * are qualified; the frozen audit still rejects every additional marker-owner
 * catalog hash transition.
 */
export function auditUa26MarkerReceiptWithHCurrentSourceEpoch(root = repoRoot) {
  requireHash(root, ua26MarkerHTransitionRegistryPath, ua26MarkerHTransitionRegistrySha256, 'pinned H successor registry');
  const registry = readJson(root, ua26MarkerHTransitionRegistryPath);
  if (registry.schemaVersion !== 1
      || registry.artifactType !== 'native H-current-source successor and bounded three-catalog transition qualification for the frozen UA26 marker audit'
      || registry.status !== 'research-only guarded successor proposal; source/value review status unchanged'
      || registry.semanticPass !== false
      || registry.sourceValueGradePromoted !== false
      || registry.contextualAdequacyPromoted !== false
      || registry.catalogTransitionQualification?.captionReviewMeaning !== 'Caption receipts qualify only their six named summary-field edits; they do not independently approve the three catalogs, the six UA28 region additions, numeric values, or context.') {
    fail('H-v1 registry identity or review boundary');
  }

  const legacyModulePath = 'tools/ua26-note-marker-audit.mjs';
  const markerReceiptPath = 'research/source-audit-batch5-ua26-marker-correction.json';
  requireHash(root, legacyModulePath, '4cd3e158451d842c4b097a0ddc726b5c248dfe2b0428cae719f1e4b27a85c49c', 'unchanged legacy audit module');
  requireHash(root, markerReceiptPath, registry.predecessor.correctionReceipt.sha256, 'frozen marker correction receipt');
  validateSourceEpoch(root, registry);

  const receipt = readJson(root, markerReceiptPath);
  const reviews = validateReviewFiles(root, registry);
  validateFullCatalogTransition(root, registry, receipt, reviews);

  const legacy = auditUa26MarkerReceipt(root, markerReceiptPath);
  const expectedFailures = registry.catalogTransitionQualification.catalogs.map(row =>
    `${row.path}: current catalog hash differs from correction receipt`);
  if (legacy.ok !== false
      || !deepEqual(legacy.failures, expectedFailures)
      || legacy.counts?.physicalRows !== 68
      || legacy.counts?.marked !== 17
      || legacy.counts?.unmarked !== 51
      || legacy.counts?.aliases !== 66) {
    fail(`frozen marker/alias assertions changed or failed outside the exact three catalog transitions${legacy.failures ? `: ${legacy.failures.join('; ')}` : ''}`);
  }

  const oldCounts = registry.predecessor.frozenCounts;
  const expectedCheckedCatalogs = Object.keys(receipt.currentCatalogHashes).length + oldCounts.currentAppendAliases;
  if (receipt.sourceMarkerCensusSha256 !== registry.predecessor.sourceMarkerCensusSha256
      || receipt.affectedCatalogs?.length !== oldCounts.correctedCatalogs
      || Object.keys(receipt.currentCatalogHashes).length !== 63
      || expectedCheckedCatalogs !== oldCounts.checkedCatalogs
      || oldCounts.physicalRows !== 68 || oldCounts.markedRows !== 17
      || oldCounts.unmarkedRows !== 51 || oldCounts.correctiveAliases !== 66
      || oldCounts.currentAppendAliases !== 2 || oldCounts.currentAliases !== 68) {
    fail('frozen marker/alias denominator or legacy result contract');
  }

  return {
    scope: 'Frozen 68 UA26 marker rows and corrective 66 aliases at native H source epoch bc819621e49788260bb34ea47c1f7a8b35af6edf; three exact receipt-bound catalog transitions qualify six appended UA28 row/range regions plus six separately caption-reviewed summary edits; no numeric/value or contextual-adequacy grade added',
    semanticPass: false,
    ok: true,
    receiptPath: markerReceiptPath,
    counts: {
      physicalRows: oldCounts.physicalRows,
      marked: oldCounts.markedRows,
      unmarked: oldCounts.unmarkedRows,
      corrective66Aliases: oldCounts.correctiveAliases,
      currentTargetAppends: oldCounts.currentAppendAliases,
      currentWDAliases: oldCounts.currentAliases,
      explicitMarkerRows: oldCounts.markedRows,
      baselineWrongSpecificAssignments: oldCounts.baselineWrongSpecificAssignments,
      previouslyUnresolvedNowSourceAdjudicated: oldCounts.previouslyUnresolvedNowSourceAdjudicated,
      correctedCatalogs: oldCounts.correctedCatalogs,
      checkedCatalogs: oldCounts.checkedCatalogs
    },
    sourceMarkerCensusSha256: registry.predecessor.sourceMarkerCensusSha256,
    currentEpoch: {
      sourceInputCommit: registry.sourceEpoch.commit,
      sourceInputTree: registry.sourceEpoch.tree,
      nativeFixture: registry.sourceEpoch.nativeFixture,
      currentData: registry.sourceEpoch.currentData,
      catalogTransitions: registry.catalogTransitionQualification.catalogs.map(row => ({
        path: row.path,
        previousReceiptSha256: row.previousReceiptSha256,
        currentSha256: row.currentSha256,
        addedUa28Regions: row.addedRegions
      }))
    },
    catalogReviewScope: {
      fieldTargetOwners: 3,
      appendedUa28Regions: 6,
      captionOnlySummaryEdits: 6,
      sourceValueGrade: 'NOT PROMOTED',
      contextualAdequacy: 'NOT ASSESSED'
    },
    sourceValueGrade: 'NOT PROMOTED',
    contextualAdequacy: 'NOT ASSESSED',
    transitionRegistry: {path: ua26MarkerHTransitionRegistryPath, sha256: ua26MarkerHTransitionRegistrySha256}
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--native-h-current-source-guard') {
    try {
      const helper = await import(pathToFileURL(path.join(repoRoot, hirelingsCurrentSourceHelperPath)).href);
      const summary = helper.assertHirelingsCurrentSourceCohort(helper.readHirelingsCurrentSourceInputs(repoRoot));
      process.stdout.write(`${JSON.stringify(summary)}\n`);
    } catch (error) {
      process.stderr.write(`${error.stack || error}\n`);
      process.exitCode = 1;
    }
  } else {
    try {
      const result = auditUa26MarkerReceiptWithHCurrentSourceEpoch();
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (!result.ok) process.exitCode = 1;
    } catch (error) {
      process.stderr.write(`${error.stack || error}\n`);
      process.exitCode = 1;
    }
  }
}
