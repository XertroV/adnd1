#!/usr/bin/env node
// Research-only exact-epoch successor for the frozen UA26 marker audit.
// The legacy audit remains unchanged and supplies every marker/alias assertion.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

export const dmg175MarkerTransitionRegistryPath = 'research/dmg175-validation-coordinator-v1/marker-recovery-v2/ua26-marker-dmg175-transition-v2.json';
export const dmg175MarkerTransitionRegistrySha256 = '1705708a0cc5c6244aa793762560c312500465ac19380db4b64c5d55171f84e1';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Invalid DMG175 UA26 marker transition v2: ${message}`); };
const readBytes = (root, rel) => fs.readFileSync(path.join(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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
  const inputRef = registry.sourceEpoch.inputReceipt;
  requireHash(root, inputRef.path, inputRef.sha256, 'DMG175 source-input receipt');
  const input = readJson(root, inputRef.path).sourceInput;
  if (input?.commit !== registry.sourceEpoch.commit
      || input?.tree !== registry.sourceEpoch.tree
      || input?.dataSha256 !== registry.sourceEpoch.rawInputs['dist/data.json']
      || input?.booksJsSha256 !== registry.sourceEpoch.rawInputs['dist/books.js']) {
    fail('DMG175 source commit/tree and input-receipt identity');
  }
  for (const [rel, expected] of Object.entries(registry.sourceEpoch.rawInputs)) {
    requireHash(root, rel, expected, `source input ${rel}`);
  }
  requireHash(root, registry.sourceEpoch.sourceHandoffTransition.path,
    registry.sourceEpoch.sourceHandoffTransition.sha256, 'DMG175 source handoff receipt');
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
      || qualification.currentInputCommit?.commit !== registry.sourceEpoch.commit
      || qualification.currentInputCommit?.tree !== registry.sourceEpoch.tree
      || qualification.diff?.preexistingCatalogPropertiesUnchanged !== true
      || qualification.diff?.onlyChanges !== 'two appended UA28 region objects per catalog; no existing region or non-region property changed') {
    fail('full old-receipt-to-current catalog transition qualification');
  }

  const diffProofRef = qualification.diff.proof;
  requireHash(root, diffProofRef.path, diffProofRef.sha256, 'full catalog diff proof');
  const diffProof = readJson(root, diffProofRef.path);
  if (diffProof.artifactType !== 'full parsed-catalog transition evidence for UA26 marker audit recovery v2'
      || diffProof.comparison?.baselineCommit !== qualification.baseline.commit
      || diffProof.comparison?.catalogPayloadCommit !== qualification.catalogPayloadCommit.commit
      || diffProof.comparison?.currentInputCommit !== qualification.currentInputCommit.commit
      || diffProof.comparison?.results?.allTopLevelPropertiesUnchanged !== true
      || diffProof.comparison?.results?.preexistingRegionObjectsChanged !== 0
      || diffProof.comparison?.results?.regionRemovals !== 0
      || diffProof.comparison?.results?.appendedRegionObjects !== 6
      || diffProof.comparison?.results?.currentCatalogBytesEqualPayloadCommit !== true
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
        || diffRow.baselineRegionCount !== row.beforeRegionCount
        || diffRow.currentRegionCount !== row.afterRegionCount
        || !deepEqual(diffRow.addedRegions.map(item => item.id), row.addedRegions)) {
      fail(`${row.path}: full diff proof binding`);
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
 * Runs the complete frozen UA26 marker audit against the exact DMG175-current
 * input epoch. The three old hash errors are tolerated only after proving the
 * full receipt-to-current catalog transition: six UA28 regions were appended,
 * while two separate caption review receipts qualify six summary-only edits.
 */
export function auditUa26MarkerReceiptWithDmg175CurrentEpoch(root = repoRoot) {
  requireHash(root, dmg175MarkerTransitionRegistryPath, dmg175MarkerTransitionRegistrySha256, 'pinned v2 successor registry');
  const registry = readJson(root, dmg175MarkerTransitionRegistryPath);
  if (registry.schemaVersion !== 2
      || registry.artifactType !== 'exact DMG175-current-input successor and full catalog-transition qualification for the frozen UA26 marker audit'
      || registry.status !== 'research-only proposed compatibility bridge; source/value review status unchanged'
      || registry.semanticPass !== false
      || registry.sourceValueGradePromoted !== false
      || registry.contextualAdequacyPromoted !== false
      || registry.catalogTransitionQualification?.captionReviewMeaning !== 'Caption receipts qualify only their six named summary-field edits; they do not independently approve the three catalogs, the six UA28 region additions, numeric values, or context.') {
    fail('v2 registry identity or review boundary');
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
    scope: 'Frozen 68 UA26 marker rows and corrective 66 aliases at the exact DMG175-current data epoch; three full catalog hash transitions qualified as six appended UA28 row/range regions plus six separately caption-reviewed summary edits; no new numeric/value or contextual-adequacy grade',
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
    transitionRegistry: {path: dmg175MarkerTransitionRegistryPath, sha256: dmg175MarkerTransitionRegistrySha256}
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = auditUa26MarkerReceiptWithDmg175CurrentEpoch();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  }
}
