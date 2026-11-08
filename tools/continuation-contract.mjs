import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {auditContinuationOrder} from './continuation-order-audit.mjs';
import {sourceVisualRegionHashes} from './price-source-inventory.mjs';

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function safePath(root, path, description) {
  requireValue(typeof path === 'string' && path.length > 0, `${description} path is missing`);
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, path);
  const rel = relative(absoluteRoot, absolutePath);
  requireValue(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), `${description} escapes its root`);
  return absolutePath;
}

function readJson(root, path, description) {
  try {
    return JSON.parse(readFileSync(safePath(root, path, description), 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${description} is not valid JSON`);
    throw error;
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sourcePages(item) {
  const pages = new Set(), seen = new WeakSet();
  function visit(value) {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value.book === 'string' && Array.isArray(value.pages)) {
      for (const page of value.pages) if (Number.isInteger(page)) pages.add(`${value.book}:${page}`);
    }
    Object.values(value).forEach(visit);
  }
  visit(item);
  return pages;
}

function loadBoundCatalog(group, catalogRoot) {
  const catalog = readJson(catalogRoot, group.catalog, `Catalog for ${group.id}`);
  requireValue(catalog.itemId === group.itemId, `${group.id} catalog item id changed`);
  requireValue(catalog.collection === group.collection, `${group.id} catalog collection changed`);
  return catalog;
}

function validateSegment(group, segment, catalog, catalogRoot) {
  requireValue(Number.isInteger(segment.order) && segment.order > 0, `${group.id} segment order must be a positive integer`);
  requireValue(['opening', 'continuation', 'context'].includes(segment.role), `${group.id} has an unsupported segment role`);
  requireValue(typeof segment.book === 'string' && Number.isInteger(segment.printedPage) && segment.printedPage > 0, `${group.id} segment source location is invalid`);
  requireValue(Number.isInteger(segment.pdfPage) && segment.pdfPage > 0, `${group.id} segment PDF page is invalid`);
  requireValue(typeof segment.relevance === 'string' && segment.relevance.trim(), `${group.id} segment relevance is required`);
  requireValue(['present', 'blocked-source-unavailable'].includes(segment.state), `${group.id} segment state is invalid`);
  const matches = catalog.regions.filter(region => region.book === segment.book && region.printedPage === segment.printedPage);

  if (segment.state === 'blocked-source-unavailable') {
    requireValue(group.status === 'blocked-source-unavailable', `${group.id} cannot be complete while a required segment is blocked`);
    requireValue(segment.regionId === null && segment.image === null && segment.imageSha256 === null, `${group.id} blocked segment must not claim an image or region`);
    requireValue(typeof segment.reason === 'string' && segment.reason.trim(), `${group.id} blocked segment needs a reason`);
    requireValue(matches.length === 0, `${group.id} marks an existing page region as blocked`);
    requireValue(catalog.sources?.[segment.book]?.sha256 === segment.sourceSha256, `${group.id} blocked segment source hash changed`);
    return 'blocked';
  }

  requireValue(['segments-present-pending-deployment', 'blocked-source-unavailable'].includes(group.status), `${group.id} present segment has an invalid group status`);
  requireValue(typeof segment.regionId === 'string' && typeof segment.image === 'string', `${group.id} present segment region/image is missing`);
  requireValue(/^[a-f0-9]{64}$/.test(segment.imageSha256 || ''), `${group.id} present segment image hash is invalid`);
  const region = catalog.regions.find(candidate => candidate.id === segment.regionId);
  requireValue(region, `${group.id} segment region ${segment.regionId} is missing`);
  requireValue(region.book === segment.book && region.printedPage === segment.printedPage && region.pdfPage === segment.pdfPage, `${group.id} segment source location changed`);
  requireValue(region.image === segment.image && region.sha256 === segment.imageSha256, `${group.id} segment image binding changed`);
  requireValue(catalog.sources?.[segment.book]?.sha256 === segment.sourceSha256, `${group.id} segment source hash changed`);
  const imagePath = safePath(resolve(catalogRoot, dirname(group.catalog)), segment.image, `Image for ${group.id}`);
  requireValue(sha256(readFileSync(imagePath)) === segment.imageSha256, `${group.id} image bytes do not match the manifest`);
  return 'present';
}

function validateCitationPages(group, catalog, item) {
  const recordPages = sourcePages(item);
  const coveredRegionIds = new Set();
  for (const citation of group.currentCitationPages || []) {
    requireValue(typeof citation.book === 'string' && Number.isInteger(citation.printedPage), `${group.id} citation page is invalid`);
    requireValue(recordPages.has(`${citation.book}:${citation.printedPage}`), `${group.id} citation page is absent from the source record`);
    requireValue(typeof citation.role === 'string' && citation.role.trim(), `${group.id} citation role is required`);
    if (citation.regionIds) {
      requireValue(Array.isArray(citation.regionIds) && citation.regionIds.length > 0, `${group.id} citation region list is empty`);
      for (const regionId of citation.regionIds) {
        const region = catalog.regions.find(candidate => candidate.id === regionId);
        requireValue(region && region.book === citation.book && region.printedPage === citation.printedPage, `${group.id} citation region ${regionId} does not bind to its cited page`);
        coveredRegionIds.add(regionId);
      }
    }
  }
  const requiredRegionIds = group.requiredRegionIds || catalog.regions.map(region => region.id);
  requireValue(Array.isArray(requiredRegionIds) && requiredRegionIds.length > 0, `${group.id} required catalog region list is empty`);
  requireValue(new Set(requiredRegionIds).size === requiredRegionIds.length, `${group.id} required catalog region list contains duplicates`);
  for (const regionId of requiredRegionIds) {
    requireValue(catalog.regions.some(region => region.id === regionId), `${group.id} required catalog region ${regionId} is missing`);
    requireValue(coveredRegionIds.has(regionId), `${group.id} required catalog region ${regionId} is absent from its explicit citation page mapping`);
  }
}

function validateCheckedCandidates(group, candidateRoot) {
  for (const candidate of group.checkedAlternativeRegions || []) {
    requireValue(candidate.decision === 'not-relevant-to-required-passage', `${group.id} alternative region disposition is missing`);
    const catalog = readJson(candidateRoot, candidate.catalog, `Alternative catalog for ${group.id}`);
    requireValue(catalog.itemId === candidate.itemId && catalog.collection === candidate.collection, `${group.id} alternative catalog owner changed`);
    const region = catalog.regions.find(entry => entry.id === candidate.regionId);
    requireValue(region && region.book === candidate.book && region.printedPage === candidate.printedPage, `${group.id} checked alternative region ${candidate.regionId} changed`);
    requireValue(region.image === candidate.image && region.sha256 === candidate.imageSha256, `${group.id} checked alternative image ${candidate.regionId} changed`);
    requireValue(catalog.sources?.[candidate.book]?.sha256 === candidate.sourceSha256, `${group.id} checked alternative source hash changed`);
  }
}

function validateRegression(regression, data, catalogRoot) {
  requireValue(typeof regression.id === 'string' && regression.id, 'Regression id is required');
  requireValue(Array.isArray(regression.bindings) && regression.bindings.length >= 2, `${regression.id} needs at least two bindings`);
  requireValue(regression.sourceComparison?.status === 'compared-to-verified-original' && regression.sourceComparison.sourceSha256 === regression.source.sourceSha256 && regression.sourceComparison.pdfPage === regression.source.pdfPage, `${regression.id} needs source-bound comparison evidence`);
  const hashes = new Set();
  for (const binding of regression.bindings) {
    const item = data[binding.collection]?.find(entry => entry.id === binding.itemId);
    requireValue(item, `${regression.id} item ${binding.itemId} is missing`);
    const catalog = readJson(catalogRoot, binding.catalog, `Regression catalog ${binding.itemId}`);
    requireValue(catalog.itemId === binding.itemId && catalog.collection === binding.collection, `${regression.id} catalog owner changed`);
    const region = catalog.regions.find(entry => entry.id === binding.regionId);
    requireValue(region && region.book === regression.source.book && region.printedPage === regression.source.printedPage, `${regression.id} binding ${binding.itemId} moved from the reviewed source page`);
    requireValue(region.image === binding.image && region.sha256 === binding.imageSha256, `${regression.id} binding ${binding.itemId} image changed`);
    requireValue(regression.sourceComparison.currentImageSha256 === binding.imageSha256, `${regression.id} source comparison does not bind the current image`);
    requireValue(catalog.sources?.[regression.source.book]?.sha256 === regression.source.sourceSha256, `${regression.id} source identity changed`);
    const imagePath = safePath(resolve(catalogRoot, dirname(binding.catalog)), region.image, `Regression image ${binding.itemId}`);
    requireValue(sha256(readFileSync(imagePath)) === binding.imageSha256, `${regression.id} image bytes changed for ${binding.itemId}`);
    hashes.add(binding.imageSha256);
  }
  requireValue(hashes.size === 1, `${regression.id} shared bindings no longer use the same corrected image`);
  requireValue(regression.priorIncorrectImageSha256 && !hashes.has(regression.priorIncorrectImageSha256), `${regression.id} old clipped image is still current`);
  return regression.bindings.length;
}

// A metadata-only check shared by the live manifest validator and the
// history fixtures. This deliberately checks required segment identity and
// order without opening image files; the full validator below still verifies
// catalog hashes and image bytes. Historical fixtures therefore need only
// retain source/catalog/image identities, not republish old scan images.
export function auditRequiredSegmentPresence(group, catalog) {
  const required = [...(group.segments || [])]
    .filter(segment => segment.state === 'present')
    .sort((a, b) => a.order - b.order);
  const missing = [];
  const mismatches = [];
  const present = [];
  for (const segment of required) {
    const region = catalog?.regions?.find(candidate => candidate.id === segment.regionId);
    if (!region) {
      missing.push({order: segment.order, role: segment.role, regionId: segment.regionId, book: segment.book, printedPage: segment.printedPage});
      continue;
    }
    const fields = ['book', 'printedPage', 'pdfPage', 'image'];
    const changedFields = fields.filter(field => region[field] !== segment[field]);
    if (region.sha256 !== segment.imageSha256) changedFields.push('sha256');
    if (changedFields.length) mismatches.push({order: segment.order, regionId: segment.regionId, changedFields});
    present.push({order: segment.order, role: segment.role, regionId: segment.regionId});
  }
  return {
    expectedOrder: required.map(segment => ({order: segment.order, role: segment.role, regionId: segment.regionId})),
    present,
    missing,
    mismatches,
    ...auditContinuationOrder(group, catalog),
  };
}

export function validateContinuationManifest(manifest, {data, catalogRoot}) {
  requireValue(manifest?.schemaVersion === 1 && Array.isArray(manifest.groups), 'Unsupported citation continuation manifest');
  requireValue(data && typeof data === 'object' && catalogRoot, 'Continuation validation needs assembled data and a catalog root');
  const ids = new Set();
  let segments = 0, presentSegments = 0, blockedSegments = 0;
  const statusCounts = {};
  for (const group of manifest.groups) {
    requireValue(typeof group.id === 'string' && group.id, 'Continuation group id is required');
    requireValue(!ids.has(group.id), `Duplicate continuation group ${group.id}`);
    ids.add(group.id);
    requireValue(['rules', 'spells', 'classes', 'equipment', 'matrices', 'progressionExplainer'].includes(group.collection), `${group.id} collection is unsupported`);
    requireValue(['segments-present-pending-deployment', 'blocked-source-unavailable'].includes(group.status), `${group.id} group status is invalid`);
    requireValue(Array.isArray(group.segments) && group.segments.length > 0, `${group.id} has no required segments`);
    const item = group.collection === 'progressionExplainer'
      ? data.progressionExplainer
      : data[group.collection]?.find(entry => entry.id === group.itemId);
    requireValue(item, `${group.id} source record is missing`);
    requireValue(item.sourceExcerpts?.catalog === group.catalog, `${group.id} record is rebound to another excerpt catalog`);
    const catalog = loadBoundCatalog(group, catalogRoot);
    const presence = auditRequiredSegmentPresence(group, catalog);
    requireValue(presence.missing.length === 0, `${group.id} required segment ${presence.missing[0]?.regionId} is absent from catalog`);
    requireValue(presence.mismatches.length === 0, `${group.id} required segment ${presence.mismatches[0]?.regionId} does not match the catalog binding`);
    requireValue(presence.duplicateRegionIds.length === 0, `${group.id} duplicate required segment ${presence.duplicateRegionIds[0]}`);
    requireValue(presence.orderMismatches.length === 0, `${group.id} required segment order disagrees with the catalog/viewer order`);
    requireValue(catalog.sources?.[group.source.book]?.sha256 === group.source.sourceSha256, `${group.id} group source identity changed`);
    requireValue(group.sourceComparison?.status === 'compared-to-verified-original' && Array.isArray(group.sourceComparison.pages) && group.sourceComparison.pages.length > 0, `${group.id} needs source-bound page comparison evidence`);
    for (const review of group.sourceComparison.pages) {
      requireValue(typeof review.book === 'string' && Number.isInteger(review.printedPage) && Number.isInteger(review.pdfPage), `${group.id} source comparison page is invalid`);
      requireValue(catalog.sources?.[review.book]?.sha256 === review.sourceSha256, `${group.id} comparison source identity changed for ${review.book}`);
      requireValue(catalog.regions.some(region => region.book === review.book && region.printedPage === review.printedPage && region.pdfPage === review.pdfPage), `${group.id} compared page ${review.book} ${review.printedPage} has no catalog region`);
    }
    validateCitationPages(group, catalog, item);
    const ordered = [...group.segments].sort((a, b) => a.order - b.order);
    requireValue(ordered.every((segment, i) => segment.order === i + 1), `${group.id} segment order must be contiguous from 1`);
    const regionIds = new Set();
    for (const segment of ordered) {
      requireValue(segment.sourceSha256 === group.source.sourceSha256, `${group.id} segment source hash disagrees with its group`);
      if (segment.regionId) {
        requireValue(!regionIds.has(segment.regionId), `${group.id} repeats segment region ${segment.regionId}`);
        regionIds.add(segment.regionId);
      }
      const result = validateSegment(group, segment, catalog, catalogRoot);
      segments++;
      if (result === 'present') presentSegments++;
      else blockedSegments++;
    }
    const isBlocked = ordered.some(segment => segment.state === 'blocked-source-unavailable');
    requireValue(isBlocked === (group.status === 'blocked-source-unavailable'), `${group.id} status disagrees with its required segments`);
    validateCheckedCandidates(group, catalogRoot);
    statusCounts[group.status] = (statusCounts[group.status] || 0) + 1;
  }
  let regressionBindings = 0;
  for (const regression of manifest.regressions || []) regressionBindings += validateRegression(regression, data, catalogRoot);
  return {groups: manifest.groups.length, segments, presentSegments, blockedSegments, regressionBindings, statusCounts};
}

export function validateAssassinContextAudit(audit, {data, catalogRoot}) {
  requireValue(audit?.schemaVersion === 1 && Array.isArray(audit.records), 'Unsupported Assassin context audit');
  requireValue(audit.records.length === 1, 'Assassin context audit must contain exactly one scoped record');
  const record = audit.records[0];
  requireValue(record.collection === 'classes' && record.itemId === 'assassin', 'Context audit is not scoped to the Assassin entry');
  const item = data?.classes?.find(entry => entry.id === record.itemId);
  requireValue(item?.sourceExcerpts?.catalog === record.catalog, 'Assassin context record is rebound to another catalog');
  const catalog = readJson(catalogRoot, record.catalog, 'Assassin context catalog');
  requireValue(catalog.itemId === record.itemId && catalog.collection === record.collection, 'Assassin context catalog owner changed');
  requireValue(record.catalogSha256 === sha256(readFileSync(safePath(catalogRoot, record.catalog, 'Assassin context catalog'))), 'Assassin catalog bytes changed since this audit');
  const hasIndependentFocusReview = record.regions.some(entry => entry.independentFocusReview);
  let independentClassProof = null;
  if (hasIndependentFocusReview) {
    const proofRef = record.independentClassReview;
    requireValue(proofRef?.path === 'research/source-audit-batch5-class-independent-review.json', 'Assassin independent class review path changed');
    const repositoryRoot = resolve(import.meta.dirname, '..');
    const proofBytes = readFileSync(safePath(repositoryRoot, proofRef.path, 'Assassin independent class review'));
    requireValue(proofRef.sha256 === sha256(proofBytes), 'Assassin independent class review file hash is stale');
    independentClassProof = JSON.parse(proofBytes);
    requireValue(independentClassProof?.source?.sha256 === catalog.sources?.PHB?.sha256, 'Assassin independent class review source identity changed');
  }
  requireValue(Array.isArray(record.regions) && record.regions.length === catalog.regions.length, 'Assassin audit must enumerate every current region');
  const currentIds = new Set(catalog.regions.map(region => region.id));
  const auditedIds = new Set();
  let priorContextConfirmed = 0, sourceComparedPendingIndependent = 0, repairedPendingIndependent = 0, contextAdequateFocusPending = 0, repairContextAdequateFocusPending = 0, independentlyReviewedContextAndFocus = 0, followupPendingCalibration = 0, followupPendingContinuation = 0, priorCropConfirmed = 0;
  for (const entry of record.regions) {
    requireValue(!auditedIds.has(entry.regionId), `Assassin region ${entry.regionId} is duplicated in the audit`);
    auditedIds.add(entry.regionId);
    requireValue(currentIds.has(entry.regionId), `Assassin region ${entry.regionId} is no longer current`);
    const region = catalog.regions.find(candidate => candidate.id === entry.regionId);
    requireValue(entry.book === region.book && entry.printedPage === region.printedPage && entry.pdfPage === region.pdfPage, `Assassin region ${entry.regionId} source page changed`);
    requireValue(entry.image === region.image && entry.imageSha256 === region.sha256 && entry.width === region.width && entry.height === region.height, `Assassin region ${entry.regionId} image binding changed`);
    requireValue(catalog.sources?.[entry.book]?.sha256 === entry.sourceSha256, `Assassin region ${entry.regionId} source identity changed`);
    requireValue(entry.sourceComparison?.status === 'compared-to-original-page' && typeof entry.sourceComparison.finding === 'string', `Assassin region ${entry.regionId} needs a source comparison finding`);
    if (entry.independentFocusReview) {
      const review = entry.independentFocusReview;
      requireValue(independentClassProof, `Assassin region ${entry.regionId} has a focus review without its verified review receipt`);
      requireValue(entry.contextStatus === 'source-reviewed-context-and-focus-confirmed-independent' && entry.highlightStatus === 'source-reviewed-precise-focus-confirmed', `Assassin region ${entry.regionId} independent focus status changed`);
      requireValue(review.status === 'confirmed' && review.independent === true && review.scope === 'source-image-crop-context-and-highlight-location-only', `Assassin region ${entry.regionId} review scope is unsupported`);
      requireValue(review.evidence === record.independentClassReview.path && review.evidenceSha256 === record.independentClassReview.sha256, `Assassin region ${entry.regionId} independent review evidence hash changed`);
      const proofBinding = independentClassProof.bindings?.find(binding => binding.collection === 'classes' && binding.itemId === 'assassin' && binding.catalog === `dist/${record.catalog}` && binding.regionId === entry.regionId);
      requireValue(proofBinding, `Assassin region ${entry.regionId} is absent from the independent class review`);
      const hashes = sourceVisualRegionHashes(region);
      requireValue(proofBinding.catalogSha256 === record.catalogSha256 && proofBinding.sourceSha256 === entry.sourceSha256, `Assassin region ${entry.regionId} independent review source/catalog binding changed`);
      requireValue(proofBinding.image === region.image && proofBinding.imageSha256 === region.sha256 && proofBinding.focusSha256 === hashes.focusSha256 && proofBinding.contentSha256 === hashes.contentSha256, `Assassin region ${entry.regionId} independent review image/focus/content hashes changed`);
      requireValue(review.sourceSha256 === proofBinding.sourceSha256 && review.imageSha256 === proofBinding.imageSha256 && review.focusSha256 === proofBinding.focusSha256 && review.contentSha256 === proofBinding.contentSha256, `Assassin region ${entry.regionId} audit review hashes differ from the independent proof`);
      requireValue(JSON.stringify(entry.focusRects) === JSON.stringify(region.focusRects) && JSON.stringify(region.focusRects) !== JSON.stringify([[0, 0, 1, 1]]), `Assassin region ${entry.regionId} precise focus is absent or stale`);
      for (const assessmentName of ['crop', 'context', 'highlight']) {
        const assessment = proofBinding.assessments?.[assessmentName];
        requireValue(assessment?.status === 'confirmed' && assessment.independent === true && typeof assessment.reason === 'string' && assessment.reason.length > 0, `Assassin region ${entry.regionId} lacks independently confirmed ${assessmentName} evidence`);
      }
      requireValue(proofBinding.defaultSelection === 'unassessed', `Assassin region ${entry.regionId} review must not imply default-selection approval`);
      independentlyReviewedContextAndFocus++;
    } else {
      requireValue(entry.highlightStatus === 'unreviewed-full-image-sentinel' && JSON.stringify(region.focusRects) === JSON.stringify([[0, 0, 1, 1]]), `Assassin region ${entry.regionId} highlight status changed`);
    }
    requireValue(entry.citationPurpose !== 'price' && entry.priceEvidence === false, `Assassin region ${entry.regionId} is incorrectly treated as price evidence`);
    const imagePath = safePath(resolve(catalogRoot, dirname(record.catalog)), region.image, `Assassin image ${entry.regionId}`);
    requireValue(sha256(readFileSync(imagePath)) === region.sha256, `Assassin image bytes changed for ${entry.regionId}`);
    if (entry.contextStatus === 'prior-context-confirmed') {
      requireValue(entry.regionId === 'phb-37-911fe149fbfab8dd' && entry.evidenceRefs?.includes('research/contextual-adequacy-first-review.json'), 'A prior context confirmation lacks matching evidence');
      priorContextConfirmed++;
    } else if (entry.contextStatus === 'source-reviewed-adequate-pending-independent-signoff') {
      requireValue(entry.sourceComparison.disposition === 'adequate', `Assassin region ${entry.regionId} has no adequate source-context disposition`);
      sourceComparedPendingIndependent++;
    } else if (entry.contextStatus === 'source-reviewed-repair-pending-independent-signoff') {
      requireValue(entry.sourceComparison.disposition === 'repair-applied' && entry.previousImageSha256 && entry.previousNormalizedPageRect, `Assassin region ${entry.regionId} repair history is incomplete`);
      repairedPendingIndependent++;
    } else if (entry.contextStatus === 'source-reviewed-context-adequate-focus-pending') {
      requireValue(['adequate', 'ordered-context-complete'].includes(entry.sourceComparison.disposition), `Assassin region ${entry.regionId} has no context-complete disposition`);
      requireValue(entry.evidenceRefs?.includes('research/assassin-context-recipe-review.json') && entry.independentContextReview?.status === 'approved-source-image-content-and-bounds', `Assassin region ${entry.regionId} lacks independent crop/context review evidence`);
      const boundaryReview = entry.sourceComparison.sourcePixelBoundaryReview;
      if (boundaryReview) {
        requireValue(boundaryReview.sourceSha256 === entry.sourceSha256, `Assassin region ${entry.regionId} pixel review source identity changed`);
        const candidates = boundaryReview.candidateOrderedSegmentBoundsPoints;
        const applied = boundaryReview.appliedSegments;
        requireValue(Array.isArray(candidates) && candidates.length === 2 && Array.isArray(applied) && applied.length === 2, `Assassin region ${entry.regionId} continuation candidates/application are incomplete`);
        for (let index = 0; index < 2; index++) {
          requireValue(candidates[index].order === index + 1 && applied[index].order === index + 1, `Assassin region ${entry.regionId} candidate continuation order changed`);
          requireValue(Array.isArray(candidates[index].rect) && candidates[index].rect.length === 4 && JSON.stringify(candidates[index].rect) === JSON.stringify(applied[index].rectPoints), `Assassin region ${entry.regionId} applied continuation geometry changed from its reviewed candidate`);
          const appliedRegion = catalog.regions.find(candidate => candidate.id === applied[index].regionId);
          requireValue(appliedRegion && appliedRegion.sha256 === applied[index].imageSha256 && appliedRegion.printedPage === entry.printedPage, `Assassin region ${entry.regionId} applied continuation binding changed`);
        }
      }
      contextAdequateFocusPending++;
    } else if (entry.contextStatus === 'source-reviewed-repair-context-adequate-focus-pending') {
      requireValue(entry.sourceComparison.disposition === 'repair-applied' && entry.previousImageSha256 && entry.previousNormalizedPageRect, `Assassin region ${entry.regionId} repair history is incomplete`);
      requireValue(entry.evidenceRefs?.includes('research/assassin-context-recipe-review.json') && entry.independentContextReview?.status === 'approved-source-image-content-and-bounds', `Assassin region ${entry.regionId} lacks independent crop/context review evidence`);
      repairContextAdequateFocusPending++;
    } else if (entry.contextStatus === 'source-reviewed-followup-pending-calibration') {
      requireValue(entry.sourceComparison.disposition === 'follow-up-required' && Array.isArray(entry.sourceComparison.followupReasons) && entry.sourceComparison.followupReasons.length > 0, `Assassin region ${entry.regionId} has no calibrated follow-up reason`);
      followupPendingCalibration++;
    } else if (entry.contextStatus === 'source-reviewed-followup-pending-continuation') {
      requireValue(entry.sourceComparison.disposition === 'follow-up-required' && Array.isArray(entry.sourceComparison.followupReasons) && entry.sourceComparison.followupReasons.length > 0, `Assassin region ${entry.regionId} has no continuation follow-up reason`);
      const review = entry.sourceComparison.sourcePixelBoundaryReview;
      requireValue(review?.sourceSha256 === entry.sourceSha256, `Assassin region ${entry.regionId} pixel review source identity changed`);
      requireValue(Array.isArray(review.candidateOrderedSegmentBoundsPoints) && review.candidateOrderedSegmentBoundsPoints.length === 2, `Assassin region ${entry.regionId} continuation candidates are incomplete`);
      const [opening, continuation] = review.candidateOrderedSegmentBoundsPoints;
      requireValue(opening.order === 1 && continuation.order === 2 && opening.role.includes('left-column opening') && continuation.role.includes('same-page upper-right continuation'), `Assassin region ${entry.regionId} candidate continuation order changed`);
      requireValue(Array.isArray(opening.rect) && opening.rect.length === 4 && Array.isArray(continuation.rect) && continuation.rect.length === 4, `Assassin region ${entry.regionId} candidate segment geometry is incomplete`);
      requireValue(Array.isArray(review.headingDarkPixelBoundsPoints) && review.headingDarkPixelBoundsPoints.length === 4 && Number.isFinite(review.existingTopWordBoxOverlapPoints) && review.existingTopToDarkGlyphClearancePoints > 0, `Assassin region ${entry.regionId} word-box and pixel findings are not distinguished`);
      followupPendingContinuation++;
    } else if (entry.contextStatus === 'source-reviewed-context-and-focus-confirmed-independent') {
      requireValue(Boolean(entry.independentFocusReview), `Assassin region ${entry.regionId} has no independent focus review`);
      requireValue(['adequate', 'repair-applied'].includes(entry.sourceComparison.disposition), `Assassin region ${entry.regionId} lacks a complete reviewed source crop`);
    } else throw new Error(`Assassin region ${entry.regionId} has an unsupported context status`);
    if (entry.priorCropReview === 'confirmed') priorCropConfirmed++;
  }
  requireValue(auditedIds.size === currentIds.size && [...currentIds].every(id => auditedIds.has(id)), 'Assassin context audit does not cover the exact current region set');
  requireValue(record.summary?.regions === catalog.regions.length && record.summary?.sourceCompared === catalog.regions.length && record.summary?.priorContextConfirmed === priorContextConfirmed && record.summary?.sourceComparedPendingIndependent === sourceComparedPendingIndependent && record.summary?.repairedPendingIndependent === repairedPendingIndependent && record.summary?.contextAdequateFocusPending === contextAdequateFocusPending && record.summary?.repairContextAdequateFocusPending === repairContextAdequateFocusPending && record.summary?.independentlyReviewedContextAndFocus === independentlyReviewedContextAndFocus && record.summary?.followupPendingCalibration === followupPendingCalibration && record.summary?.followupPendingContinuation === followupPendingContinuation && record.summary?.priorCropConfirmed === priorCropConfirmed, 'Assassin context summary does not match its bindings');
  const findingIds = new Set();
  for (const finding of record.coverageFindings || []) {
    requireValue(typeof finding.id === 'string' && finding.id && !findingIds.has(finding.id), 'Assassin coverage finding id is missing or duplicated');
    findingIds.add(finding.id);
    requireValue(finding.collection === 'classes' && finding.itemId === 'assassin', `${finding.id} is outside the Assassin record`);
    const region = catalog.regions.find(candidate => candidate.id === finding.regionId);
    requireValue(region && region.book === finding.book && region.printedPage === finding.printedPage && region.pdfPage === finding.pdfPage, `${finding.id} source region changed`);
    requireValue(catalog.sources?.[finding.book]?.sha256 === finding.sourceSha256, `${finding.id} source identity changed`);
    requireValue(Array.isArray(finding.fieldPointers) && finding.fieldPointers.length > 0, `${finding.id} needs a scoped field pointer`);
  }
  requireValue(record.summary?.priceEvidence === record.regions.filter(entry => entry.priceEvidence).length, 'Assassin price-evidence count does not match its regions');
  requireValue(record.sourceAccess?.status === 'verified' && record.sourceAccess?.sourceHashes?.PHB === catalog.sources?.PHB?.sha256 && record.sourceAccess?.sourceHashes?.DMG === catalog.sources?.DMG?.sha256, 'Assassin audit must bind verified source identities');
  return {regions: catalog.regions.length, sourceCompared: record.regions.filter(entry => entry.sourceComparison.status === 'compared-to-original-page').length, priorContextConfirmed, sourceComparedPendingIndependent, repairedPendingIndependent, contextAdequateFocusPending, repairContextAdequateFocusPending, independentlyReviewedContextAndFocus, followupPendingCalibration, followupPendingContinuation, priorCropConfirmed, priceRegions: record.regions.filter(entry => entry.priceEvidence).length};
}
