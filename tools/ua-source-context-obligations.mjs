const sha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const rect = value => Array.isArray(value) && value.length === 4
  && value.every(Number.isFinite) && value[2] > value[0] && value[3] > value[1];

const sameSource = (left, right) => left?.book === right?.book
  && left?.sourcePdfSha256 === right?.sourcePdfSha256
  && left?.pdfPage === right?.pdfPage;

const sourceOf = (value, fallback = {}) => ({
  book: value?.book ?? fallback.book,
  sourcePdfSha256: value?.sourcePdfSha256 ?? fallback.sourcePdfSha256,
  printedPage: value?.printedPage ?? fallback.printedPage,
  pdfPage: value?.pdfPage ?? fallback.pdfPage,
});

function unionCoverage(required, candidates) {
  if (!rect(required)) return {classification: 'not-assessable', reason: 'invalid-required-bounds', intersectingRects: 0};
  const valid = candidates.filter(rect);
  if (valid.length !== candidates.length) return {classification: 'not-assessable', reason: 'invalid-linked-context-bounds', intersectingRects: 0};
  const clipped = valid.map(candidate => [
    Math.max(required[0], candidate[0]), Math.max(required[1], candidate[1]),
    Math.min(required[2], candidate[2]), Math.min(required[3], candidate[3]),
  ]).filter(candidate => candidate[0] < candidate[2] && candidate[1] < candidate[3]);
  if (clipped.length === 0) return {classification: 'missing', reason: 'no-positive-area-overlap', intersectingRects: 0};

  const xs = [...new Set([required[0], required[2], ...clipped.flatMap(value => [value[0], value[2]])])].sort((a, b) => a - b);
  const ys = [...new Set([required[1], required[3], ...clipped.flatMap(value => [value[1], value[3]])])].sort((a, b) => a - b);
  let uncoveredCells = 0;
  for (let x = 0; x < xs.length - 1; x += 1) {
    for (let y = 0; y < ys.length - 1; y += 1) {
      if (xs[x] === xs[x + 1] || ys[y] === ys[y + 1]) continue;
      const mx = (xs[x] + xs[x + 1]) / 2;
      const my = (ys[y] + ys[y + 1]) / 2;
      if (!clipped.some(candidate => candidate[0] <= mx && candidate[2] >= mx && candidate[1] <= my && candidate[3] >= my)) uncoveredCells += 1;
    }
  }
  return uncoveredCells === 0
    ? {classification: 'contained', reason: 'required-rectangle-covered-by-linked-context-union', intersectingRects: clipped.length}
    : {classification: 'partially-contained', reason: 'some-required-area-falls-outside-linked-context-union', intersectingRects: clipped.length, uncoveredCells};
}

const rowGroupId = row => {
  const match = /^(ua-other-\d{3})-/.exec(row?.recordId ?? '');
  return match?.[1] ?? null;
};

const rowSegmentId = row => row?.sourceRowIdentity?.segmentId
  ?? row?.evidence?.tableSegmentId
  ?? null;

function activeTargetRecords(data) {
  return (data?.groupReviews ?? []).flatMap(group => (group.activeContextTargets ?? []).map(target => ({
    groupId: group.groupId,
    targetId: target.targetId,
    targetOrder: target.targetOrder,
    role: target.role,
    segmentId: target.segmentId ?? null,
    source: sourceOf(target.source, {book: 'UA', sourcePdfSha256: group.sourcePdfSha256}),
    bounds: target.crop?.cropBoundsPdfPagePointsTopLeftLTRB ?? null,
    privateCropPath: target.crop?.privateCropPath ?? null,
    cropSha256: target.crop?.cropSha256 ?? null,
    target,
  })));
}

function legacyTargetRecords(data) {
  return (data?.groupReviews ?? []).flatMap(group => (group.sourceEvidenceIndex ?? []).map((entry, index) => ({
    groupId: group.groupId,
    targetId: `legacy:${group.groupId}:${entry.segmentId ?? index}`,
    targetOrder: index + 1,
    role: 'legacy-source-evidence-index-context',
    segmentId: entry.segmentId ?? null,
    source: sourceOf(entry, {book: 'UA', sourcePdfSha256: group.sourcePdfSha256 ?? data?.source?.sha256}),
    bounds: entry.tableCropBounds?.pdfPagePoints ?? entry.tableCropBounds?.pdfPagePointsTopLeftLTRB ?? null,
    privateCropPath: null,
    cropSha256: null,
    target: entry,
  })));
}

function definitionById(definitions) {
  return new Map((definitions ?? []).map(definition => [definition.id ?? definition.definitionId, definition]));
}

function rowDefinitionIds(row, resolution, contextMode) {
  const candidateLinks = row?.evidence?.sourceNoteDefinitionLinks;
  if (contextMode === 'active' && Array.isArray(candidateLinks)) {
    const expectedIds = resolution?.sourceDefinitionIds ?? [];
    const candidateIds = candidateLinks.map(link => link.definitionId);
    const result = candidateLinks.map(link => ({
      definitionId: link.definitionId,
      link,
      joinOrigin: 'candidate-sourceNoteDefinitionLinks',
      candidateDefinitionLinkStatus: !resolution ? 'no-independent-before-join-record'
        : expectedIds.includes(link.definitionId) ? 'matches-independent-before-join'
          : 'candidate-link-not-present-in-independent-before-join',
      applicabilityStatus: link.rowMarkerJoin?.status?.includes('no meaning/applicability approval')
        ? 'uncertain-applicability'
        : 'unreviewed-applicability',
    }));
    for (const definitionId of expectedIds) {
      if (!candidateIds.includes(definitionId)) result.push({
        definitionId,
        link: null,
        joinOrigin: 'independent-before-rowResolution',
        candidateDefinitionLinkStatus: 'missing-candidate-source-note-definition-link',
        applicabilityStatus: 'uncertain-applicability',
      });
    }
    return result;
  }
  return (resolution?.sourceDefinitionIds ?? []).map(definitionId => ({
    definitionId,
    link: null,
    joinOrigin: 'independent-before-rowResolution',
    candidateDefinitionLinkStatus: contextMode === 'legacy' ? 'legacy-baseline-no-active-definition-link-schema' : 'independent-before-join-only',
    applicabilityStatus: 'uncertain-applicability',
  }));
}

function linkedTargetsForRow(row, groupId, targetsById, targetsByGroup, contextMode) {
  const links = row?.evidence?.activeContextTargetLinks;
  if (contextMode === 'active' && Array.isArray(links)) {
    return links.map(link => {
      const target = targetsById.get(link.targetId) ?? null;
      const errors = [];
      if (target) {
        const rowSpecific = Array.isArray(target.target?.rowRecordIds);
        if (link.targetOrder !== target.targetOrder) errors.push('target-order-mismatch');
        if (link.role !== target.role) errors.push('target-role-mismatch');
        if (link.segmentId !== target.segmentId) errors.push('target-segment-link-mismatch');
        if (target.groupId !== groupId && !(rowSpecific && target.target.rowRecordIds.includes(row.recordId))) errors.push('target-group-mismatch');
        if (target.groupId === groupId && !rowSpecific && target.segmentId !== rowSegmentId(row)) errors.push('row-segment-target-mismatch');
        if (rowSpecific && !target.target.rowRecordIds.includes(row.recordId)) errors.push('row-specific-target-does-not-include-row');
      }
      return {link, target, errors};
    });
  }
  if (contextMode !== 'legacy') return [];
  const segmentId = rowSegmentId(row);
  return (targetsByGroup.get(groupId) ?? [])
    .filter(target => target.segmentId === segmentId)
    .map(target => ({link: {targetId: target.targetId, targetOrder: target.targetOrder, role: target.role, segmentId: target.segmentId}, target}));
}

function assessJoin({row, definitionId, joinOrigin, candidateDefinitionLinkStatus, applicabilityStatus, definition, link, linkedTargets}) {
  const missingTargetIds = linkedTargets.filter(item => item.target === null).map(item => item.link?.targetId ?? null);
  const invalidTargetLinks = linkedTargets.filter(item => item.errors?.length).map(item => ({targetId: item.link?.targetId ?? null, errors: item.errors}));
  const selected = linkedTargets.flatMap(item => item.target ? [item.target] : []);
  const sourceFrame = definition ? sourceOf({
    book: definition.sourcePage?.book ?? definition.book ?? 'UA',
    sourcePdfSha256: definition.sourcePage?.sourcePdfSha256 ?? definition.sourcePdfSha256,
    printedPage: definition.sourcePage?.printedPage ?? definition.printedPage,
    pdfPage: definition.sourcePage?.pdfPage ?? definition.pdfPage,
  }) : null;
  const required = link?.definitionBoundsPdfPagePointsTopLeftLTRB
    ?? definition?.boundsPdfPagePointsTopLeftLTRB
    ?? definition?.bounds
    ?? null;
  if (!definition || !sourceFrame || !sha256(sourceFrame.sourcePdfSha256) || !Number.isInteger(sourceFrame.pdfPage) || sourceFrame.pdfPage < 1 || !rect(required)) {
    return {
      recordId: row.recordId,
      definitionId,
      joinOrigin,
      candidateDefinitionLinkStatus,
      extentClassification: 'not-assessable',
      applicabilityStatus,
      reason: 'definition-record-or-source-bounds-unavailable',
      requiredBoundsPdfPagePointsTopLeftLTRB: required,
      linkedTargetIds: linkedTargets.map(item => item.link?.targetId ?? null),
      missingTargetIds,
      eligibleTargetIds: [],
      rejectedTargetIds: [],
    };
  }

  const eligible = selected.filter(target => sameSource(target.source, sourceFrame) && rect(target.bounds));
  const invalidSameSource = selected.filter(target => sameSource(target.source, sourceFrame) && !rect(target.bounds));
  const rejected = selected.filter(target => !sameSource(target.source, sourceFrame) || !rect(target.bounds));
  let coverage;
  if (candidateDefinitionLinkStatus === 'missing-candidate-source-note-definition-link') coverage = {classification: 'not-assessable', reason: 'independent-before-join-has-no-candidate-source-note-link'};
  else if (candidateDefinitionLinkStatus === 'candidate-link-not-present-in-independent-before-join') coverage = {classification: 'not-assessable', reason: 'candidate-source-note-link-lacks-independent-before-join'};
  else if (invalidTargetLinks.length > 0) coverage = {classification: 'not-assessable', reason: 'row-context-target-link-integrity-failure'};
  else if (missingTargetIds.length > 0) coverage = {classification: 'not-assessable', reason: 'row-link-references-undeclared-target'};
  else if (invalidSameSource.length > 0) coverage = {classification: 'not-assessable', reason: 'linked-target-has-invalid-source-bounds'};
  else if (selected.length === 0) coverage = {classification: 'missing', reason: 'row-has-no-linked-active-context-targets'};
  else coverage = unionCoverage(required, eligible.map(target => target.bounds));
  return {
    recordId: row.recordId,
    definitionId,
    joinOrigin,
    candidateDefinitionLinkStatus,
    extentClassification: coverage.classification,
    applicabilityStatus,
    reason: coverage.reason,
    requiredBoundsPdfPagePointsTopLeftLTRB: required,
    definitionSourceFrame: sourceFrame,
    linkedTargetIds: linkedTargets.map(item => item.link?.targetId ?? null),
    invalidTargetLinks,
    eligibleTargetIds: eligible.map(target => target.targetId),
    rejectedTargetIds: rejected.map(target => target.targetId),
    invalidSameSourceTargetIds: invalidSameSource.map(target => target.targetId),
    missingTargetIds,
    intersectingTargetCount: coverage.intersectingRects ?? null,
    uncoveredCells: coverage.uncoveredCells ?? null,
    definitionPngIgnored: Boolean(definition.definitionCrop || link?.definitionCrop),
  };
}

function assessContentObligations(obligations, targetsById, targetsByGroup) {
  return (obligations ?? []).map(obligation => {
    const explicitTargetIds = Array.isArray(obligation.targetIds)
      ? obligation.targetIds
      : obligation.targetId ? [obligation.targetId] : null;
    const linked = explicitTargetIds
      ? explicitTargetIds.map(targetId => targetsById.get(targetId) ?? null).filter(Boolean)
      : (targetsByGroup.get(obligation.groupId) ?? []).filter(target => target.segmentId === obligation.segmentId);
    const missingTargetIds = explicitTargetIds?.filter(targetId => !targetsById.has(targetId)) ?? [];
    const matchingSource = linked.filter(target => sameSource(target.source, obligation.sourceFrame));
    const eligible = matchingSource.filter(target => rect(target.bounds));
    const sourceValid = typeof obligation.sourceFrame?.book === 'string'
      && sha256(obligation.sourceFrame?.sourcePdfSha256)
      && Number.isInteger(obligation.sourceFrame?.pdfPage)
      && obligation.sourceFrame.pdfPage > 0;
    const coverage = !sourceValid
      ? {classification: 'not-assessable', reason: 'invalid-content-obligation-source-frame'}
      : missingTargetIds.length > 0
        ? {classification: 'not-assessable', reason: 'content-obligation-references-undeclared-target'}
        : matchingSource.some(target => !rect(target.bounds))
          ? {classification: 'not-assessable', reason: 'content-obligation-linked-target-has-invalid-bounds'}
          : unionCoverage(obligation.boundsPdfPagePointsTopLeftLTRB, eligible.map(target => target.bounds));
    return {
      obligationId: obligation.obligationId,
      groupId: obligation.groupId,
      segmentId: obligation.segmentId ?? null,
      targetId: obligation.targetId ?? null,
      targetIds: explicitTargetIds ?? linked.map(target => target.targetId),
      contentKind: obligation.contentKind ?? 'unclassified-source-context-obligation',
      requiredRecordIds: obligation.recordIds ?? [],
      annotationStatus: obligation.annotationStatus ?? 'unreviewed',
      extentClassification: coverage.classification,
      reason: coverage.reason,
      requiredBoundsPdfPagePointsTopLeftLTRB: obligation.boundsPdfPagePointsTopLeftLTRB,
      linkedTargetIds: linked.map(target => target.targetId),
      missingTargetIds,
      eligibleTargetIds: eligible.map(target => target.targetId),
      sourceFrame: obligation.sourceFrame ?? null,
      semanticPass: false,
    };
  });
}

export function auditUaSourceContextObligations({
  data,
  definitions = [],
  rowResolutions = [],
  contextMode = 'active',
  contentObligations = [],
  contextReviewAnnotations = [],
  expectedDenominators = null,
} = {}) {
  if (!data || !Array.isArray(data.groupReviews) || !Array.isArray(data.rowRecords)) throw new TypeError('UA source context audit requires groupReviews and rowRecords arrays.');
  if (!['active', 'legacy'].includes(contextMode)) throw new TypeError('contextMode must be active or legacy.');

  const resolutionByRow = new Map(rowResolutions.map(resolution => [resolution.recordId, resolution]));
  const definitionMap = definitionById(definitions);
  const reviewByTarget = new Map(contextReviewAnnotations.map(review => [review.targetId, review]));
  const targets = contextMode === 'active' ? activeTargetRecords(data) : legacyTargetRecords(data);
  const targetsById = new Map(targets.map(target => [target.targetId, target]));
  const targetsByGroup = new Map();
  for (const target of targets) targetsByGroup.set(target.groupId, [...(targetsByGroup.get(target.groupId) ?? []), target]);

  const rowAssessments = [];
  for (const row of data.rowRecords) {
    const groupId = rowGroupId(row);
    const linkedTargets = linkedTargetsForRow(row, groupId, targetsById, targetsByGroup, contextMode);
    const joins = rowDefinitionIds(row, resolutionByRow.get(row.recordId), contextMode);
    for (const join of joins) {
      const definition = definitionMap.get(join.definitionId);
      rowAssessments.push(assessJoin({
        row,
        definitionId: join.definitionId,
        joinOrigin: join.joinOrigin,
        candidateDefinitionLinkStatus: join.candidateDefinitionLinkStatus,
        applicabilityStatus: join.applicabilityStatus,
        definition,
        link: join.link,
        linkedTargets,
      }));
    }
  }

  const extentCounts = Object.fromEntries(['contained', 'partially-contained', 'missing', 'not-assessable'].map(status => [
    status,
    rowAssessments.filter(item => item.extentClassification === status).length,
  ]));
  const applicabilityCounts = Object.fromEntries(['uncertain-applicability', 'unreviewed-applicability', 'reviewed-applicability'].map(status => [
    status,
    rowAssessments.filter(item => item.applicabilityStatus === status).length,
  ]));
  const candidateDefinitionLinkCounts = Object.fromEntries([
    'matches-independent-before-join',
    'missing-candidate-source-note-definition-link',
    'candidate-link-not-present-in-independent-before-join',
    'no-independent-before-join-record',
    'legacy-baseline-no-active-definition-link-schema',
    'independent-before-join-only',
  ].map(status => [status, rowAssessments.filter(item => item.candidateDefinitionLinkStatus === status).length]));
  const unjoinedDefinitions = [...definitionMap.keys()].filter(definitionId => !rowAssessments.some(item => item.definitionId === definitionId));
  const obligationAssessments = assessContentObligations(contentObligations, targetsById, targetsByGroup);
  const obligationsByTarget = new Map();
  for (const obligation of obligationAssessments) {
    const selectedTargetIds = obligation.targetIds?.length
      ? obligation.targetIds
      : targets.filter(target => target.groupId === obligation.groupId && target.segmentId === obligation.segmentId).map(target => target.targetId);
    for (const targetId of selectedTargetIds) obligationsByTarget.set(targetId, [...(obligationsByTarget.get(targetId) ?? []), obligation.obligationId]);
  }
  const denominators = {
    rows: data.rowRecords.length,
    groups: data.groupReviews.length,
    physicalDefinitions: definitionMap.size,
    declaredContexts: targets.length,
    rowDefinitionJoins: rowAssessments.length,
    rowsWithDefinitionJoins: new Set(rowAssessments.map(item => item.recordId)).size,
    contentObligations: obligationAssessments.length,
    linkedTargetRows: data.rowRecords.filter(row => linkedTargetsForRow(row, rowGroupId(row), targetsById, targetsByGroup, contextMode).length > 0).length,
  };
  const denominatorMismatches = expectedDenominators
    ? Object.entries(expectedDenominators).filter(([key, value]) => denominators[key] !== value).map(([key, expected]) => ({key, expected, actual: denominators[key]}))
    : [];
  return {
    artifactType: 'UA source-context obligations detector inventory',
    schemaVersion: 1,
    contextMode,
    status: denominatorMismatches.length ? 'denominator-mismatch' : 'complete-structural-inventory-no-semantic-pass',
    denominators,
    expectedDenominators: expectedDenominators ?? null,
    denominatorMismatches,
    extentCounts,
    applicabilityCounts,
    candidateDefinitionLinkCounts,
    unjoinedDefinitionIds: unjoinedDefinitions,
    activeContextTargets: targets.map(target => ({
      groupId: target.groupId,
      targetId: target.targetId,
      targetOrder: target.targetOrder,
      role: target.role,
      segmentId: target.segmentId,
      source: target.source,
      boundsPdfPagePointsTopLeftLTRB: target.bounds,
      cropSha256: target.cropSha256,
      contentObligationIds: obligationsByTarget.get(target.targetId) ?? [],
      contextReviewStatus: reviewByTarget.get(target.targetId)?.status
        ?? (obligationsByTarget.has(target.targetId)
          ? 'explicit-content-obligations-inventory-present; assessment remains geometric-only'
          : 'unreviewed-no-explicit-content-obligation-annotation'),
      contextReviewReceipt: reviewByTarget.get(target.targetId)?.receipt ?? null,
    })),
    rowDefinitionAssessments: rowAssessments,
    contentObligationAssessments: obligationAssessments,
    contextReviewAnnotations: targets.map(target => ({
      targetId: target.targetId,
      status: reviewByTarget.get(target.targetId)?.status ?? 'unreviewed',
      receipt: reviewByTarget.get(target.targetId)?.receipt ?? null,
    })),
    coverageLimits: {
      geometricOnly: true,
      semanticPass: false,
      contextualAdequacyPass: false,
      imagePixelReviewPass: false,
      rowFocusUsedAsContext: false,
      privateDefinitionPngsUsedAsActiveContext: false,
      classificationsAreSourceCompletenessJudgments: false,
      unannotatedRequirementsAreNotInferred: true,
    },
  };
}

export function classifyPdfRectangleUnion(requiredBounds, linkedContextBounds) {
  return unionCoverage(requiredBounds, linkedContextBounds);
}
