// Exact pure visual projection from the preserved systemic inventory.
export function projectVisualCoverageSummary(report, geometrySnapshotReference = null, priceInventoryInput = null) {
  const usages = report.usages.filter(usage => usage.viewerSelected).map(usage => ({collection: usage.collection, itemId: usage.itemId, binding: usage.binding, catalog: usage.catalog, regionId: usage.regionId, book: usage.book, printedPage: usage.page, imageSha256: usage.imageSha256, sourceSha256: usage.sourceSha256, status: usage.status, reviewStale: usage.reviewStale, sentinel: usage.sentinel, sentinelPolicyStatus: usage.sentinelPolicyStatus ?? null, geometryCandidate: usage.geometryCandidate, geometryStaleCandidate: usage.geometryStaleCandidate, reviewGate: usage.reviewGate}));
  const priceInventory = report.priceInventory ? {
    ...report.priceInventory,
    denominatorPolicy: {
      sourceRows: 'sourceRowCount counts rows across sourceTableDenominatorCount named inventories.',
      siteClaims: 'siteClaimCount and siteClaimDenominator count site claim objects; siteClaimTargetBindingDenominator counts only objects with target evidence bindings. siteClaimStates and siteClaimTargetStatuses describe different states, and target statuses do not independently confirm printed values.',
      printedPrices: 'printedPriceEvidenceBindingDenominator and printedPriceSourceValueStatuses describe source-value review separately from target-location review.',
      sourcePages: 'pageCensusPageCount counts PDF pages across sourcePageCensuses; page and row denominators are different units.',
      estimates: 'estimateOverlap reports estimates attached to price-gap objects; estimate and gap counts can overlap and are not additive.',
      exhaustive: false,
    },
  } : null;
  return {
    available: true,
    scope: report.scope,
    inputDataSha256: report.inputDataSha256,
    sourceFrameValidation: report.sourceFrameValidation,
    geometrySnapshotReference,
    geometrySnapshotApplied: report.geometrySnapshotApplied,
    geometrySnapshotDataMatches: report.geometrySnapshotDataMatches,
    selectedRegionUsageCount: usages.length,
    totalsScope: 'Source visual API totals include both sourceExcerpts and legacy scanVerification catalog bindings; selectedRegionReviewStatuses includes only the exact viewer-selected binding.',
    totals: report.totals,
    denominators: report.denominators,
    counts: report.counts,
    byCategory: report.byCategory,
    reviewLedgerSummary: report.reviewLedgerSummary,
    contextContracts: report.contextContracts ? {total: report.contextContracts.total, violations: report.contextContracts.violations.length, statusCounts: report.contextContracts.checks.reduce((out, check) => { out[check.status] = (out[check.status] || 0) + 1; return out; }, {})} : null,
    continuations: report.continuations ? {groupCount: report.continuations.groupCount, segmentCount: report.continuations.segmentCount, stateCounts: report.continuations.stateCounts, valid: report.continuations.valid} : null,
    sentinelPolicy: report.sentinelPolicy || null,
    priceInventory,
    priceInventoryInput,
    selectedRegionReviewStatuses: usages,
  };
}
