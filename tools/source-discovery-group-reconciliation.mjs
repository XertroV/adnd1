import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_COMMIT = '679b15d1c580172e54314829c1c3c86dc78b65f3';
const BASELINE_PRICE_INVENTORY_SHA256 = 'f2a02d1e990cf9bd30135f7dc2fcd2f10f9e1f2e172ee594e396677c32fb3852';
const CENSUSES = Object.freeze({
  'phb-dmg-other': Object.freeze({
    sourceFile: 'research/price-source-inventory-phb-dmg-other.json',
    censusSha256: 'a6e653a0ee4854e2d28b2cbc8049c60f038d4e8eabbcc822b10b730ef496ae79',
    groups: Object.freeze([
      'phb-assassination-fees', 'dmg-poison-dose-and-manufacture', 'dmg-gem-base-value-categories',
      'dmg-gem-value-progression', 'dmg-furs-clothing-rare-commodities', 'dmg-support-research-and-information-costs',
      'dmg-henchman-prospect-search-table', 'dmg-town-entry-and-citizenship-fees', 'dmg-monetary-treasure-distribution',
      'dmg-research-costs', 'dmg-research-costs-continuation', 'dmg-scroll-material-per-sheet',
      'dmg-monetary-treasure-tables', 'dmg-gem-and-magic-treasure-valuations', 'dmg-gem-values-by-object',
      'dmg-high-value-gems', 'dmg-random-treasure-values', 'dmg-treasure-per-level-table',
    ]),
  }),
  'ua-other': Object.freeze({
    sourceFile: 'research/price-source-inventory-ua-other.json',
    censusSha256: 'f1f797d9e8664589af5308737d9bc9d5e5dd536339349609fbeec5dc2a58c4b9',
    groups: Object.freeze(Array.from({length: 15}, (_, index) => `ua-other-${String(index + 1).padStart(3, '0')}`)),
  }),
});
const EXPECTED_BASELINE_GROUP_COUNT = 33;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function addIssue(issues, code, detail) { issues.push({code, detail}); }
function recordsById(records, idOf) {
  const map = new Map();
  for (const record of records || []) {
    const id = idOf(record);
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(record);
  }
  return map;
}
function expectedUaGroupId(index) { return `ua-other-${String(index + 1).padStart(3, '0')}`; }
function baselineGroupId(censusId, group, index) { return censusId === 'ua-other' ? expectedUaGroupId(index) : group.recordId; }
function censusMap(inventory) { return new Map((inventory?.sourcePageCensuses || []).map(census => [census.id, census])); }
function sourceRowsForUa(groupId, rows) { return (rows || []).filter(row => row.recordId?.startsWith(`${groupId}-`)); }
function isProseListGroup(group) {
  const evidence = group.sourceEvidenceIndex || [];
  return evidence.length > 0 && evidence.every(item => /prose value list/i.test(item.tableLabel || ''));
}
function uaValueCellCounts(records) {
  const counts = {all: 0, gp: 0, xpReference: 0, purchase: 0, sale: 0};
  for (const row of records || []) {
    const values = row.values || {};
    counts.all += Object.keys(values).length;
    for (const key of Object.keys(values)) {
      if (key === 'gpPurchaseCost') counts.purchase++;
      else if (key === 'gpSaleValue') counts.sale++;
      else if (key === 'xpValue') counts.xpReference++;
    }
  }
  counts.gp = counts.purchase + counts.sale;
  return counts;
}
function hasCompletedExtraction(extraction) {
  return Object.entries(extraction || {}).some(([key, value]) => /^complete(?:Within|Across|For|$)/.test(key) && value === true);
}

function buildBaselineReceipt(inventory, censusFiles, censusArtifacts, issues) {
  const censuses = censusMap(inventory);
  const groups = [];
  const censusArtifactMatches = {};
  for (const [censusId, expected] of Object.entries(CENSUSES)) {
    const census = censuses.get(censusId);
    if (!census) {
      addIssue(issues, 'baseline-census-missing', censusId);
      for (const groupId of expected.groups) groups.push({groupId, censusId, censusSha256: expected.censusSha256, currentCensusGroupPresent: false, baselineRowTranscriptionComplete: false, baselineDisposition: 'untranscribed-at-679b15d'});
      continue;
    }
    const actualCensusSha = census.sourceFileSha256 || null;
    if (actualCensusSha !== expected.censusSha256) addIssue(issues, 'current-census-sha-mismatch', `${censusId}: expected ${expected.censusSha256}, found ${actualCensusSha}`);
    if (!census.sourceFiles?.includes(expected.sourceFile)) addIssue(issues, 'current-census-path-mismatch', `${censusId}: ${expected.sourceFile}`);
    const suppliedCensusFileHash = censusFiles?.[expected.sourceFile];
    if (suppliedCensusFileHash !== expected.censusSha256) addIssue(issues, 'source-census-file-sha-mismatch', `${expected.sourceFile}: expected ${expected.censusSha256}, found ${suppliedCensusFileHash || 'unavailable'}`);
    if (inventory.integrity?.sourceCensusHashes?.[expected.sourceFile] !== expected.censusSha256) addIssue(issues, 'inventory-census-integrity-sha-mismatch', `${censusId}: canonical inventory integrity map does not match the frozen census SHA-256`);
    const actualCensusArtifact = censusArtifacts?.[expected.sourceFile];
    const artifactMatches = !!actualCensusArtifact && same(actualCensusArtifact.tableGroups || [], census.sourceArtifact?.tableGroups || []);
    censusArtifactMatches[censusId] = artifactMatches;
    if (!artifactMatches) addIssue(issues, 'embedded-census-group-copy-mismatch', `${censusId}: canonical sourceArtifact.tableGroups differ from the hash-bound source census file`);
    const rawGroups = census.sourceArtifact?.tableGroups || [];
    const currentById = new Map();
    rawGroups.forEach((group, index) => {
      const groupId = baselineGroupId(censusId, group, index);
      if (!groupId) return;
      if (currentById.has(groupId)) addIssue(issues, 'duplicate-current-census-group-id', `${censusId}:${groupId}`);
      currentById.set(groupId, group);
    });
    if (rawGroups.length !== expected.groups.length) addIssue(issues, 'current-census-group-denominator-mismatch', `${censusId}: expected ${expected.groups.length}, found ${rawGroups.length}`);
    for (const [index, groupId] of expected.groups.entries()) {
      const sourceGroup = currentById.get(groupId);
      if (!sourceGroup) addIssue(issues, 'current-census-group-missing', `${censusId}:${groupId}`);
      // Original group state is pinned from the 679b15d registry, even if a later
      // inventory snapshot changes its current row-transcription flag.
      groups.push({
        groupId, censusId, censusSha256: expected.censusSha256, baselineIndex: index,
        title: sourceGroup?.title || sourceGroup?.sourceObject || null,
        bookKey: sourceGroup?.bookKey || (censusId === 'ua-other' ? 'UA' : null),
        printedPage: sourceGroup?.printedPage ?? null, pdfPage: sourceGroup?.pdfPage ?? null,
        currentCensusGroupPresent: !!sourceGroup,
        baselineRowTranscriptionComplete: false,
        baselineDisposition: censusId === 'ua-other' ? 'visually-confirmed-table-level; rows not transcribed' : 'discovery-only; rows not transcribed',
      });
    }
  }
  if (groups.length !== EXPECTED_BASELINE_GROUP_COUNT) addIssue(issues, 'baseline-group-denominator-mismatch', `expected ${EXPECTED_BASELINE_GROUP_COUNT}, found ${groups.length}`);
  return {
    commit: BASELINE_COMMIT,
    priceInventorySha256: BASELINE_PRICE_INVENTORY_SHA256,
    censusGroupDenominator: EXPECTED_BASELINE_GROUP_COUNT,
    groupsInitiallyUntranscribed: groups.filter(group => !group.baselineRowTranscriptionComplete).length,
    censusArtifactMatches,
    groups,
    interpretation: 'Frozen compact registry from the actual 679b15d inventory: all 33 PHB/DMG and UA groups were row-untranscribed. Group identity is census SHA-256 plus stable group ID; UA IDs are tied to the original indexed group array and its census SHA-256.',
  };
}

function reconcileUa({census, sourceInventoryHash, sourceArtifactMatches, report, baseline, issues}) {
  const sourcePath = CENSUSES['ua-other'].sourceFile;
  const expectedHash = CENSUSES['ua-other'].censusSha256;
  const topHash = report?.scope?.inventorySha256;
  const baselineHash = report?.baseline?.inputHashesSha256?.[sourcePath];
  const sourceHashValid = topHash === expectedHash && baselineHash === expectedHash && sourceInventoryHash === expectedHash && sourceArtifactMatches === true
    && report?.source?.sha256 === census?.sourceIdentity?.find(source => source.book === 'UA')?.sourceSha256;
  if (!sourceHashValid) addIssue(issues, 'ua-supplement-census-sha-mismatch', `expected ${expectedHash}; scope=${topHash || 'missing'}; baseline=${baselineHash || 'missing'}; loaded=${sourceInventoryHash || 'missing'}`);
  if (report?.baseline?.inputCommit !== BASELINE_COMMIT || report?.baseline?.capturedBeforeBatch5Transcription !== true) addIssue(issues, 'ua-baseline-provenance-mismatch', 'UA typed supplement is not bound to the expected pre-transcription capture');
  const groupReviews = report?.groupReviews || [];
  const byGroup = recordsById(groupReviews, group => group.groupId);
  const rows = report?.rowRecords || [];
  const rowIds = new Set();
  for (const row of rows) {
    if (!row.recordId || rowIds.has(row.recordId)) addIssue(issues, 'ua-duplicate-or-empty-row-record-id', row.recordId || 'missing');
    rowIds.add(row.recordId);
  }
  const rowGroups = new Map();
  for (const group of baseline.filter(entry => entry.censusId === 'ua-other')) {
    const candidates = byGroup.get(group.groupId) || [];
    const rowRecords = sourceRowsForUa(group.groupId, rows);
    const review = candidates.length === 1 ? candidates[0] : null;
    const currentGroup = census?.sourceArtifact?.tableGroups?.[group.baselineIndex];
    const expectedObject = currentGroup?.sourceObject || null;
    const expectedLocation = {printedPage: currentGroup?.printedPage ?? null, pdfPage: currentGroup?.pdfPage ?? null};
    const actualLocation = review?.inventoryLocation || {};
    const locationMatches = !!review && review.inventoryIndex === group.baselineIndex
      && same(actualLocation, expectedLocation) && review.sourceObject === expectedObject;
    const groupHashMatches = sourceHashValid && review?.groupId === group.groupId;
    const rowDenominator = review?.summary?.sourceRowDenominator;
    const rowsStructurallyMatch = !!review && Number.isInteger(rowDenominator) && rowDenominator === rowRecords.length
      && review.summary?.rowsStructured === rowRecords.length
      && rowRecords.every(row => row.evidence?.sourcePdfSha256 === report?.source?.sha256 && Object.keys(row.values || {}).length > 0);
    if (candidates.length > 1) addIssue(issues, 'ua-duplicate-supplement-group-id', group.groupId);
    if (!review) addIssue(issues, candidates.length ? 'ua-ambiguous-supplement-group' : 'ua-supplement-group-unmatched', group.groupId);
    if (review && !locationMatches) addIssue(issues, 'ua-group-metadata-mismatch-after-exact-join', group.groupId);
    if (review && !rowsStructurallyMatch) addIssue(issues, 'ua-group-row-denominator-mismatch', `${group.groupId}: declared=${rowDenominator ?? 'missing'}, records=${rowRecords.length}`);
    const typed = groupHashMatches && locationMatches && rowsStructurallyMatch && review?.rowTranscriptionStatus?.startsWith('complete-structured-row-transcription')
      || groupHashMatches && locationMatches && rowsStructurallyMatch && Number.isInteger(review?.summary?.rowsStructured) && review.summary.rowsStructured === rowRecords.length;
    rowGroups.set(group.groupId, rowRecords);
    group.supplement = review ? {
      source: 'ua-additional-prices', typedOutputPresent: typed,
      matchStatus: !sourceHashValid ? 'unmatched-census-sha-mismatch' : typed ? 'exact-census-sha-and-group-id-typed-output' : 'exact-id-join-untyped-or-structurally-inconsistent',
      structuredRecordCount: rowRecords.length,
      structuredValueCellCount: rowRecords.reduce((n, row) => n + Object.keys(row.values || {}).length, 0),
      groupSummary: review.summary || null,
    } : {source: 'ua-additional-prices', typedOutputPresent: false, matchStatus: candidates.length ? 'ambiguous-supplement-group-id' : 'unmatched-no-exact-census-sha-and-group-id'};
  }
  const orphaned = groupReviews.filter(review => !sourceHashValid || !baseline.some(group => group.censusId === 'ua-other' && group.groupId === review.groupId) || (byGroup.get(review.groupId)?.length || 0) > 1);
  for (const review of orphaned) addIssue(issues, 'ua-unmatched-supplement-group', review.groupId || 'missing');
  const cells = uaValueCellCounts(rows);
  const declaredGroups = report?.aggregate?.groupCount;
  const declaredRows = report?.aggregate?.rowRecordCount;
  const groupRowSum = groupReviews.reduce((n, group) => n + (group.summary?.sourceRowDenominator || 0), 0);
  const proseGroups = groupReviews.filter(isProseListGroup);
  const proseRows = proseGroups.reduce((n, group) => n + (group.summary?.sourceRowDenominator || 0), 0);
  const aggregateValid = sourceHashValid && declaredGroups === 15 && groupReviews.length === 15
    && declaredRows === rows.length && report?.aggregate?.sourceRowDenominator === rows.length
    && groupRowSum === rows.length && report?.aggregate?.structuredValueCellCount === cells.all
    && report?.aggregate?.structuredGpMonetaryCellCount === cells.gp
    && report?.aggregate?.gpPurchaseCostCellCount === cells.purchase
    && report?.aggregate?.gpSaleValueCellCount === cells.sale
    && report?.aggregate?.xpReferenceValueCellCount === cells.xpReference
    && report?.aggregate?.proseValueListRows === proseRows;
  if (!aggregateValid) addIssue(issues, 'ua-supplement-aggregate-mismatch', 'UA group, record, value-cell, or prose-list denominators do not reconcile');
  const allExactGroupsValid = baseline.filter(entry => entry.censusId === 'ua-other').every(group => group.supplement?.typedOutputPresent === true);
  if (!allExactGroupsValid) addIssue(issues, 'ua-exact-group-join-incomplete', 'At least one original UA group has no unique census-SHA-bound typed supplement');
  if (!aggregateValid) for (const group of baseline.filter(entry => entry.censusId === 'ua-other')) if (group.supplement) {
    group.supplement.typedOutputPresent = false;
    group.supplement.matchStatus = 'source-supplement-denominators-not-reconciled';
  }
  return {
    censusId: 'ua-other', censusSha256: expectedHash,
    supplementPath: 'research/source-audit-batch5-ua-additional-prices.json',
    identity: 'groupId plus census SHA-256; groupId must encode and agree with the original inventoryIndex in the SHA-bound 15-group census',
    sourceHashVerified: sourceHashValid,
    sourceInventory: {path: sourcePath, expectedSha256: expectedHash, reportedSha256: topHash || null, loadedSha256: sourceInventoryHash || null},
    groupDenominators: {baselineGroups: 15, supplementaryGroupReviews: groupReviews.length, exactTypedGroups: baseline.filter(group => group.censusId === 'ua-other' && group.supplement?.typedOutputPresent).length},
    structuredRecords: {count: rows.length, gpPurchaseRows: cells.purchase, gpSaleOrTreasureRows: cells.sale},
    physicalRows: {physicalTableRows: rows.length - proseRows, nonTableProseListEntries: proseRows, sourceRowDenominator: rows.length, method: 'Only explicitly labeled prose-value-list source evidence is excluded from physical table rows; remaining row units follow the supplement’s source-row denominator.'},
    structuredCells: {allValueCells: cells.all, gpMonetaryCells: cells.gp, xpReferenceCells: cells.xpReference, sourceDeclaredAllValueCells: report?.aggregate?.structuredValueCellCount ?? null},
    integrityValid: aggregateValid && allExactGroupsValid,
    orphanedSupplementGroups: orphaned.map(group => ({groupId: group.groupId || null, censusId: 'ua-other', censusSha256: sourceHashValid ? expectedHash : topHash || null, reason: !sourceHashValid ? 'census-sha-mismatch' : (byGroup.get(group.groupId)?.length || 0) > 1 ? 'duplicate-group-id' : 'group-id-not-in-frozen-baseline'})),
  };
}

function reconcilePhbDmg({census, sourceInventoryHash, sourceArtifactMatches, report, baseline, issues}) {
  const expectedHash = CENSUSES['phb-dmg-other'].censusSha256;
  const sourcePath = CENSUSES['phb-dmg-other'].sourceFile;
  const base = report?.baseline || {};
  const sourceHashValid = base.censusFile === sourcePath && base.censusFileSha256 === expectedHash
    && sourceInventoryHash === expectedHash && census?.sourceFileSha256 === expectedHash && sourceArtifactMatches === true
    && base.priceInventoryFileSha256 === BASELINE_PRICE_INVENTORY_SHA256;
  if (!sourceHashValid) addIssue(issues, 'phb-dmg-supplement-census-sha-mismatch', `expected ${expectedHash}; baseline=${base.censusFileSha256 || 'missing'}; loaded=${sourceInventoryHash || 'missing'}`);
  if (base.inputCommit !== BASELINE_COMMIT || base.capturedBeforeExtraction !== true) addIssue(issues, 'phb-dmg-baseline-provenance-mismatch', 'PHB/DMG typed supplement is not bound to the expected pre-transcription capture');
  const groupReviews = report?.review?.groups || [];
  const byGroup = recordsById(groupReviews, group => group.recordId);
  const claims = report?.review?.sourceRowsOrClaims || [];
  const recordsByGroup = new Map();
  const claimIds = new Set();
  for (const claim of claims) {
    if (!claim.sourceRowOrClaimId || !claim.groupId) addIssue(issues, 'phb-dmg-claim-identity-missing', claim.sourceRowOrClaimId || 'missing');
    if (claimIds.has(claim.sourceRowOrClaimId)) addIssue(issues, 'phb-dmg-duplicate-claim-id', claim.sourceRowOrClaimId || 'missing');
    claimIds.add(claim.sourceRowOrClaimId);
    if (!recordsByGroup.has(claim.groupId)) recordsByGroup.set(claim.groupId, []);
    recordsByGroup.get(claim.groupId).push(claim);
  }
  const sourceHashes = Object.fromEntries((census?.sourceIdentity || []).map(source => [source.book, source.sourceSha256]));
  for (const group of baseline.filter(entry => entry.censusId === 'phb-dmg-other')) {
    const candidates = byGroup.get(group.groupId) || [];
    const review = candidates.length === 1 ? candidates[0] : null;
    const groupClaims = recordsByGroup.get(group.groupId) || [];
    const currentGroup = (census?.sourceArtifact?.tableGroups || []).find(item => item.recordId === group.groupId);
    const source = review?.source || {};
    const identityMatches = !!review && source.bookKey === currentGroup?.bookKey
      && source.printedPage === currentGroup?.printedPage && source.pdfPage === currentGroup?.pdfPage
      && source.sourceFileSha256 === sourceHashes[source.bookKey]
      && review.rowOrClaimIds?.length === groupClaims.length
      && new Set(review.rowOrClaimIds || []).size === (review.rowOrClaimIds || []).length
      && same([...(review.rowOrClaimIds || [])].sort(), groupClaims.map(claim => claim.sourceRowOrClaimId).sort());
    const extractionComplete = hasCompletedExtraction(review?.extraction);
    const typed = sourceHashValid && identityMatches && extractionComplete;
    if (candidates.length > 1) addIssue(issues, 'phb-dmg-duplicate-supplement-group-id', group.groupId);
    if (!review) addIssue(issues, candidates.length ? 'phb-dmg-ambiguous-supplement-group' : 'phb-dmg-supplement-group-unmatched', group.groupId);
    if (review && !identityMatches) addIssue(issues, 'phb-dmg-group-metadata-mismatch-after-exact-join', group.groupId);
    if (review && !extractionComplete) addIssue(issues, 'phb-dmg-group-extraction-not-complete', group.groupId);
    group.supplement = review ? {
      source: 'phb-dmg-additional-prices', typedOutputPresent: typed,
      matchStatus: !sourceHashValid ? 'unmatched-census-sha-mismatch' : typed ? 'exact-census-sha-and-group-id-typed-output' : 'exact-id-join-untyped-or-structurally-inconsistent',
      typedSourceRecordCount: groupClaims.length,
      declaredPhysicalTableRows: review.sourceFirstDenominator?.tableRows ?? null,
      groupSummary: review.sourceFirstDenominator || null,
    } : {source: 'phb-dmg-additional-prices', typedOutputPresent: false, matchStatus: candidates.length ? 'ambiguous-supplement-group-id' : 'unmatched-no-exact-census-sha-and-group-id'};
  }
  const orphaned = groupReviews.filter(group => !sourceHashValid || !baseline.some(entry => entry.censusId === 'phb-dmg-other' && entry.groupId === group.recordId) || (byGroup.get(group.recordId)?.length || 0) > 1);
  for (const group of orphaned) addIssue(issues, 'phb-dmg-unmatched-supplement-group', group.recordId || 'missing');
  const denominators = report?.review?.denominators || {};
  const allExactGroupsValid = baseline.filter(entry => entry.censusId === 'phb-dmg-other').every(group => group.supplement?.typedOutputPresent === true);
  const valid = sourceHashValid && groupReviews.length === 18 && claims.length === denominators.sourceMonetaryRowsOrClaimsStructurallyRecorded
    && denominators.discoveredGroups === 18 && denominators.groupsWithTypedOutput === 18 && denominators.groupsStillUnreviewed === 0
    && denominators.groupsPixelReviewed === 18 && denominators.rowTranscribedGroupsAtBaseline === 0
    && ['PHB','DMG'].every(book => denominators.sourceHashesVerified?.[book]?.matchesCensus === true && denominators.sourceHashesVerified[book].sha256 === sourceHashes[book])
    && groupReviews.every(group => hasCompletedExtraction(group.extraction)) && allExactGroupsValid;
  if (!valid) addIssue(issues, 'phb-dmg-supplement-denominator-mismatch', 'PHB/DMG group, structured-record, census hash, or extraction-completion denominators do not reconcile');
  if (!valid) for (const group of baseline.filter(entry => entry.censusId === 'phb-dmg-other')) if (group.supplement) {
    group.supplement.typedOutputPresent = false;
    group.supplement.matchStatus = 'source-supplement-denominators-not-reconciled';
  }
  return {
    censusId: 'phb-dmg-other', censusSha256: expectedHash,
    supplementPath: 'research/source-audit-batch5-phb-dmg-additional-prices.json',
    identity: 'recordId/groupId plus census SHA-256; page and source-PDF identity are consistency checks after ID join',
    sourceHashVerified: sourceHashValid,
    sourceInventory: {path: sourcePath, expectedSha256: expectedHash, reportedSha256: base.censusFileSha256 || null, loadedSha256: sourceInventoryHash || null},
    groupDenominators: {baselineGroups: 18, supplementaryGroupReviews: groupReviews.length, exactTypedGroups: baseline.filter(group => group.censusId === 'phb-dmg-other' && group.supplement?.typedOutputPresent).length},
    structuredRecords: {sourceMonetaryRowsOrClaims: claims.length, sourceDeclared: denominators.sourceMonetaryRowsOrClaimsStructurallyRecorded ?? null},
    physicalRows: {tableRowsOrOutcomesReviewed: denominators.tableRowsOrOutcomesReviewed ?? null, units: 'source-reported table rows or outcomes; separate from typed monetary rows/claims'},
    structuredCells: {count: null, status: 'no common aggregate cell denominator is declared by this supplement', reason: 'Mixed table row, prose-claim and outcome schemas; preserve group-level amount-cell distinctions instead of summing incompatible units.'},
    integrityValid: valid,
    orphanedSupplementGroups: orphaned.map(group => ({groupId: group.recordId || null, censusId: 'phb-dmg-other', censusSha256: sourceHashValid ? expectedHash : base.censusFileSha256 || null, reason: !sourceHashValid ? 'census-sha-mismatch' : (byGroup.get(group.recordId)?.length || 0) > 1 ? 'duplicate-group-id' : 'group-id-not-in-frozen-baseline'})),
  };
}

export function buildSourceDiscoveryGroupReconciliation({priceInventory, uaSupplement, phbDmgSupplement, sourceCensusFileHashes = {}, sourceCensusArtifacts = {}}) {
  const issues = [];
  const baselineReceipt = buildBaselineReceipt(priceInventory, sourceCensusFileHashes, sourceCensusArtifacts, issues);
  const censuses = censusMap(priceInventory);
  const ua = reconcileUa({census: censuses.get('ua-other'), sourceInventoryHash: sourceCensusFileHashes[CENSUSES['ua-other'].sourceFile], sourceArtifactMatches: baselineReceipt.censusArtifactMatches['ua-other'], report: uaSupplement, baseline: baselineReceipt.groups, issues});
  const phbDmg = reconcilePhbDmg({census: censuses.get('phb-dmg-other'), sourceInventoryHash: sourceCensusFileHashes[CENSUSES['phb-dmg-other'].sourceFile], sourceArtifactMatches: baselineReceipt.censusArtifactMatches['phb-dmg-other'], report: phbDmgSupplement, baseline: baselineReceipt.groups, issues});
  const groups = baselineReceipt.groups;
  const matchedTypedGroups = groups.filter(group => group.supplement?.typedOutputPresent).length;
  const unmatchedBaselineGroups = groups.filter(group => !group.supplement?.typedOutputPresent).map(group => ({groupId: group.groupId, censusId: group.censusId, censusSha256: group.censusSha256, reason: group.supplement?.matchStatus || 'baseline-census-source-group-not-current'}));
  const uaTypedRows = groups.filter(group => group.censusId === 'ua-other' && group.supplement?.typedOutputPresent).reduce((sum, group) => sum + group.supplement.structuredRecordCount, 0);
  const phbDmgTypedRows = groups.filter(group => group.censusId === 'phb-dmg-other' && group.supplement?.typedOutputPresent).reduce((sum, group) => sum + group.supplement.typedSourceRecordCount, 0);
  const validationValid = issues.length === 0 && matchedTypedGroups === EXPECTED_BASELINE_GROUP_COUNT && ua.integrityValid && phbDmg.integrityValid;
  return {
    schemaVersion: 1,
    artifactType: 'source-discovery-group-reconciliation',
    scope: 'Exact reconciliation of the original 33 untranscribed PHB/DMG and UA table groups to typed supplements. This does not establish whole-book completeness or item-to-citation mapping.',
    baselineReceipt,
    sourceReports: {ua, phbDmg},
    reconciliation: {
      identityKey: 'census SHA-256 + stable group ID',
      baselineGroups: EXPECTED_BASELINE_GROUP_COUNT,
      exactTypedGroups: matchedTypedGroups,
      unmatchedBaselineGroups,
      unmatchedSupplementGroups: [...ua.orphanedSupplementGroups, ...phbDmg.orphanedSupplementGroups],
      status: validationValid ? 'all-33-baseline-groups-exactly-joined-to-typed-supplements' : 'incomplete-or-invalid-join; unmatched-groups-remain-unknown',
    },
    structuredRecords: {
      uaRowsOrClaims: uaTypedRows,
      phbDmgRowsOrClaims: phbDmgTypedRows,
      totalTypedSourceRowsOrClaims: uaTypedRows + phbDmgTypedRows,
      interpretation: 'Typed source records/claims; this is not a count of app item citations or mapped site items.',
    },
    itemCitationMappings: {
      count: null,
      status: 'not-measured-by-typed-supplements',
      interpretation: 'UA rowRecords and PHB/DMG sourceRowsOrClaims contain source values and identities but no item-citation target mapping. Use the source-table report target outcomes as a separate denominator.',
    },
    validation: {valid: validationValid, issues},
    limitations: [
      'Only the 33 groups frozen in the 679b15d canonical inventory are covered by this exact join.',
      'UA group IDs are validated against inventoryIndex in a census-SHA-bound original 15-group array because its source census did not itself store IDs.',
      'UA physical table rows exclude only the explicitly labeled Golden Eggs prose value-list entries; other source-record counts retain each supplement’s own definition.',
      'PHB/DMG physical table row/outcome counts are source-reported and remain distinct from structured monetary claims and amount cells.',
      'Typed row coverage does not certify independent overlay review, site-item mapping, price-target citations, or whole-book completeness.',
    ],
  };
}

export function loadSourceDiscoveryGroupReconciliation({repoRoot = root, inventoryPath = 'research/price-source-inventory.json', uaSupplementPath = 'research/source-audit-batch5-ua-additional-prices.json', phbDmgSupplementPath = 'research/source-audit-batch5-phb-dmg-additional-prices.json'} = {}) {
  const load = path => {
    const bytes = readFileSync(resolve(repoRoot, path));
    return {json: JSON.parse(bytes.toString('utf8')), sha256: sha256(bytes)};
  };
  const inventory = load(inventoryPath), ua = load(uaSupplementPath), phbDmg = load(phbDmgSupplementPath);
  const sourceCensusFileHashes = {}, sourceCensusArtifacts = {};
  for (const [censusId, expected] of Object.entries(CENSUSES)) {
    const path = expected.sourceFile;
    const loaded = load(path);
    sourceCensusFileHashes[path] = loaded.sha256;
    sourceCensusArtifacts[path] = loaded.json;
  }
  const result = buildSourceDiscoveryGroupReconciliation({priceInventory: inventory.json, uaSupplement: ua.json, phbDmgSupplement: phbDmg.json, sourceCensusFileHashes, sourceCensusArtifacts});
  result.inputHashes = {
    [inventoryPath]: inventory.sha256,
    [uaSupplementPath]: ua.sha256,
    [phbDmgSupplementPath]: phbDmg.sha256,
    ...sourceCensusFileHashes,
  };
  return result;
}
