import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  auditUaSourceContextObligations,
  classifyPdfRectangleUnion,
} from '../tools/ua-source-context-obligations.mjs';

const realCases = JSON.parse(readFileSync(new URL('./fixtures/ua-source-context-obligations-real-v2-cases.json', import.meta.url), 'utf8'));
const shaA = 'a'.repeat(64);
const source = {book: 'UA', sourcePdfSha256: shaA, printedPage: 10, pdfPage: 11};
const definition = (bounds, overrides = {}) => ({
  id: 'ua-test-note',
  kind: 'literal-row-marker-definition',
  marker: '*',
  sourcePdfSha256: source.sourcePdfSha256,
  printedPage: source.printedPage,
  pdfPage: source.pdfPage,
  bounds,
  sourcePageRectPointsTopLeftLTRB: [0, 0, 100, 100],
  ...overrides,
});
const target = (id, bounds, sourceOverride = {}) => ({
  targetId: id,
  targetOrder: 1,
  role: 'primary-table-context',
  segmentId: 'segment-a',
  source: {...source, ...sourceOverride},
  crop: {cropBoundsPdfPagePointsTopLeftLTRB: bounds, cropSha256: 'b'.repeat(64)},
});
const row = links => ({
  recordId: 'ua-other-900-row-001',
  object: 'Test',
  sourceRowIdentity: {printedPage: 10, pdfPage: 11, rowLabel: 'Test'},
  evidence: {
    tableSegmentId: 'segment-a',
    activeContextTargetLinks: links,
    rowHighlightBounds: {pdfPagePoints: [0, 0, 100, 100]},
    rowFocusFrameEvidence: {sourceRender: {pdfPage: 11}},
  },
});
const data = (rows, targets, groupId = 'ua-other-900') => ({
  source: {book: 'UA', sha256: source.sourcePdfSha256},
  groupReviews: [{groupId, sourcePdfSha256: source.sourcePdfSha256, activeContextTargets: targets}],
  rowRecords: rows,
});
const link = (targetId, segmentId = 'segment-a') => ({targetId, targetOrder: 1, role: 'primary-table-context', segmentId});
const defLink = (bounds, overrides = {}) => ({
  definitionId: 'ua-test-note',
  marker: '*',
  definitionBoundsPdfPagePointsTopLeftLTRB: bounds,
  definitionCrop: {boundsPdfPagePointsTopLeftLTRB: [0, 0, 100, 100], privatePath: '/private/note.png'},
  rowMarkerJoin: {status: 'candidate source marker/definition join; no meaning/applicability approval'},
  ...overrides,
});

test('actual V2 potion, Ring and Staff/Spear note bounds are detected outside their linked crops', () => {
  const report = auditUaSourceContextObligations({data: realCases.data, definitions: realCases.definitions});
  assert.deepEqual(report.denominators, {
    rows: 3, groups: 3, physicalDefinitions: 3, declaredContexts: 6,
    rowDefinitionJoins: 3, rowsWithDefinitionJoins: 3, contentObligations: 0, linkedTargetRows: 3,
  });
  assert.deepEqual(report.rowDefinitionAssessments.map(item => [item.recordId, item.extentClassification]), [
    ['ua-other-002-potion-a1-main-r001', 'missing'],
    ['ua-other-003-rings-c-r003', 'missing'],
    ['ua-other-009-item-r006', 'missing'],
  ]);
  assert.ok(report.rowDefinitionAssessments.every(item => item.definitionPngIgnored));
  assert.ok(report.rowDefinitionAssessments.every(item => item.applicabilityStatus === 'uncertain-applicability'));
  assert.equal(report.coverageLimits.semanticPass, false);
});

test('rectangle coverage uses the union of ordered linked parts, not single-crop containment', () => {
  const required = [40, 20, 60, 40];
  assert.equal(classifyPdfRectangleUnion(required, [[20, 10, 50, 50], [50, 10, 80, 50]]).classification, 'contained');
  assert.equal(classifyPdfRectangleUnion(required, [[20, 10, 50, 50]]).classification, 'partially-contained');
  const targets = [target('left', [20, 10, 50, 50]), {...target('right', [50, 10, 80, 50]), targetOrder: 2}];
  const r = row([link('left'), {...link('right'), targetOrder: 2}]);
  r.evidence.sourceNoteDefinitionLinks = [defLink(required)];
  const report = auditUaSourceContextObligations({data: data([r], targets), definitions: [definition(required)]});
  assert.equal(report.rowDefinitionAssessments[0].extentClassification, 'contained');
  assert.deepEqual(report.rowDefinitionAssessments[0].eligibleTargetIds, ['left', 'right']);
});

test('cross-page companion targets count only on the definition page and exact source identity', () => {
  const required = [20, 30, 40, 50];
  const rowWithTarget = row([link('note-on-p12')]);
  rowWithTarget.evidence.sourceNoteDefinitionLinks = [defLink(required)];
  const def = definition(required, {pdfPage: 12, printedPage: 11});
  const valid = auditUaSourceContextObligations({
    data: data([rowWithTarget], [target('note-on-p12', [0, 0, 100, 100], {printedPage: 11, pdfPage: 12})]),
    definitions: [def],
  });
  assert.equal(valid.rowDefinitionAssessments[0].extentClassification, 'contained');

  for (const badFrame of [{printedPage: 10, pdfPage: 11}, {printedPage: 11, pdfPage: 12, sourcePdfSha256: 'c'.repeat(64)}]) {
    const bad = auditUaSourceContextObligations({
      data: data([rowWithTarget], [target('note-on-p12', [0, 0, 100, 100], badFrame)]),
      definitions: [def],
    });
    assert.equal(bad.rowDefinitionAssessments[0].extentClassification, 'missing');
    assert.deepEqual(bad.rowDefinitionAssessments[0].rejectedTargetIds, ['note-on-p12']);
  }
});

test('focus rectangles and private note-definition PNG bounds never substitute for linked context', () => {
  const required = [20, 30, 40, 50];
  const r = row([]);
  r.evidence.sourceNoteDefinitionLinks = [defLink(required)];
  const report = auditUaSourceContextObligations({
    data: data([r], [target('unlinked-target', [0, 0, 100, 100])]),
    definitions: [definition(required)],
  });
  assert.equal(report.rowDefinitionAssessments[0].extentClassification, 'missing');
  assert.equal(report.rowDefinitionAssessments[0].definitionPngIgnored, true);
  assert.deepEqual(report.rowDefinitionAssessments[0].linkedTargetIds, []);

  const malformed = row([{...link('ghost-target')}]);
  malformed.evidence.sourceNoteDefinitionLinks = [defLink(required)];
  const missingLink = auditUaSourceContextObligations({
    data: data([malformed], [target('unrelated-target', [0, 0, 100, 100])]),
    definitions: [definition(required)],
  });
  assert.equal(missingLink.rowDefinitionAssessments[0].extentClassification, 'not-assessable');
  assert.deepEqual(missingLink.rowDefinitionAssessments[0].missingTargetIds, ['ghost-target']);
});

test('a missing or extraneous candidate definition link is reported against the independent row join', () => {
  const required = [20, 30, 40, 50];
  const omitted = row([]);
  omitted.evidence.sourceNoteDefinitionLinks = [];
  const omittedReport = auditUaSourceContextObligations({
    data: data([omitted], [target('table', [0, 0, 100, 100])]),
    definitions: [definition(required)],
    rowResolutions: [{recordId: omitted.recordId, sourceDefinitionIds: ['ua-test-note']}],
  });
  assert.equal(omittedReport.denominators.rowDefinitionJoins, 1);
  assert.equal(omittedReport.rowDefinitionAssessments[0].candidateDefinitionLinkStatus, 'missing-candidate-source-note-definition-link');
  assert.equal(omittedReport.rowDefinitionAssessments[0].extentClassification, 'not-assessable');

  const extra = row([link('table')]);
  extra.evidence.sourceNoteDefinitionLinks = [defLink(required, {definitionId: 'ua-unadjudicated-extra'})];
  const extraReport = auditUaSourceContextObligations({
    data: data([extra], [target('table', [0, 0, 100, 100])]),
    definitions: [definition(required, {id: 'ua-unadjudicated-extra'})],
    rowResolutions: [{recordId: extra.recordId, sourceDefinitionIds: []}],
  });
  assert.equal(extraReport.rowDefinitionAssessments[0].candidateDefinitionLinkStatus, 'candidate-link-not-present-in-independent-before-join');
  assert.equal(extraReport.rowDefinitionAssessments[0].extentClassification, 'not-assessable');
});

test('legacy sourceEvidenceIndex is joined by row segment and records definitions without inferring links', () => {
  const required = [30, 30, 40, 40];
  const legacyData = {
    source: {book: 'UA', sha256: shaA},
    groupReviews: [{
      groupId: 'ua-other-900', sourcePdfSha256: shaA,
      sourceEvidenceIndex: [{segmentId: 'segment-a', printedPage: 10, pdfPage: 11, sourcePdfSha256: shaA, tableCropBounds: {pdfPagePoints: [20, 20, 50, 50]}}],
    }],
    rowRecords: [{recordId: 'ua-other-900-row-001', evidence: {tableSegmentId: 'segment-a'}}],
  };
  const report = auditUaSourceContextObligations({
    data: legacyData,
    definitions: [definition(required)],
    rowResolutions: [{recordId: 'ua-other-900-row-001', sourceDefinitionIds: ['ua-test-note']}],
    contextMode: 'legacy',
  });
  assert.equal(report.denominators.declaredContexts, 1);
  assert.equal(report.rowDefinitionAssessments[0].extentClassification, 'contained');
  assert.equal(report.rowDefinitionAssessments[0].applicabilityStatus, 'uncertain-applicability');
  assert.equal(report.coverageLimits.rowFocusUsedAsContext, false);
});

test('legacy focus extent remains bound to original sourceEvidenceIndex after active target links are added', () => {
  const required = [30, 30, 40, 40];
  const legacyData = {
    source: {book: 'UA', sha256: shaA},
    groupReviews: [{
      groupId: 'ua-other-900', sourcePdfSha256: shaA,
      sourceEvidenceIndex: [{segmentId: 'segment-a', printedPage: 10, pdfPage: 11, sourcePdfSha256: shaA, tableCropBounds: {pdfPagePoints: [20, 20, 50, 50]}}],
      activeContextTargets: [target('active-candidate', [90, 90, 100, 100])],
    }],
    rowRecords: [{
      recordId: 'ua-other-900-row-001',
      sourceRowIdentity: {segmentId: 'segment-a', printedPage: 10, pdfPage: 11},
      evidence: {
        tableSegmentId: 'segment-a',
        activeContextTargetLinks: [{targetId: 'active-candidate', targetOrder: 1, role: 'primary-table-context', segmentId: 'segment-a'}],
        sourceNoteDefinitionLinks: [defLink(required)],
      },
    }],
  };
  const report = auditUaSourceContextObligations({
    data: legacyData,
    definitions: [definition(required)],
    rowResolutions: [{recordId: 'ua-other-900-row-001', sourceDefinitionIds: ['ua-test-note']}],
    contextMode: 'legacy',
  });
  assert.equal(report.denominators.declaredContexts, 1);
  assert.equal(report.rowDefinitionAssessments[0].extentClassification, 'contained');
  assert.deepEqual(report.rowDefinitionAssessments[0].linkedTargetIds, ['legacy:ua-other-900:segment-a']);
  assert.equal(report.coverageLimits.rowFocusUsedAsContext, false);
});

test('content obligations remain explicit and unreviewed extent does not become a semantic pass', () => {
  const required = [40, 40, 60, 60];
  const obligations = [{
    obligationId: 'heading-and-lead-in', groupId: 'ua-other-900', segmentId: 'segment-a',
    contentKind: 'subject-identifying-lead-in', recordIds: ['ua-other-900-row-001'],
    sourceFrame: source, boundsPdfPagePointsTopLeftLTRB: required, annotationStatus: 'unreviewed',
  }];
  const report = auditUaSourceContextObligations({
    data: data([row([link('table')])], [target('table', [20, 20, 50, 50])]),
    definitions: [], contentObligations: obligations,
  });
  assert.equal(report.contentObligationAssessments[0].extentClassification, 'partially-contained');
  assert.equal(report.contentObligationAssessments[0].annotationStatus, 'unreviewed');
  assert.equal(report.contentObligationAssessments[0].semanticPass, false);

  const union = auditUaSourceContextObligations({
    data: data([row([link('left'), {...link('right'), targetOrder: 2}])], [target('left', [20, 10, 50, 50]), {...target('right', [50, 10, 80, 50]), targetOrder: 2}]),
    definitions: [],
    contentObligations: [{...obligations[0], targetId: undefined, targetIds: ['left', 'right'], boundsPdfPagePointsTopLeftLTRB: [40, 20, 60, 40]}],
  });
  assert.equal(union.contentObligationAssessments[0].extentClassification, 'contained');
  assert.deepEqual(union.contentObligationAssessments[0].linkedTargetIds, ['left', 'right']);
  assert.equal(union.contentObligationAssessments[0].semanticPass, false);

  const reviewed = auditUaSourceContextObligations({
    data: data([row([link('table')])], [target('table', [0, 0, 100, 100])]),
    definitions: [],
    contextReviewAnnotations: [{targetId: 'table', status: 'reviewed-for-context; no source-value/semantic pass', receipt: {path: 'review.json', sha256: 'd'.repeat(64)}}],
  });
  assert.equal(reviewed.activeContextTargets[0].contextReviewStatus, 'reviewed-for-context; no source-value/semantic pass');
  assert.equal(reviewed.coverageLimits.semanticPass, false);
});

test('invalid bounds remain not assessable and denominator drift is reported', () => {
  const r = row([link('table')]);
  r.evidence.sourceNoteDefinitionLinks = [defLink([1, 2, 1, 5])];
  const report = auditUaSourceContextObligations({
    data: data([r], [target('table', [0, 0, 100, 100])]),
    definitions: [definition([1, 2, 1, 5])],
    expectedDenominators: {rows: 2, physicalDefinitions: 2, declaredContexts: 2},
  });
  assert.equal(report.rowDefinitionAssessments[0].extentClassification, 'not-assessable');
  assert.equal(report.status, 'denominator-mismatch');
  assert.equal(report.denominatorMismatches.length, 3);

  const invalidTarget = target('table', [0, 0, 100, 100]);
  invalidTarget.crop.cropBoundsPdfPagePointsTopLeftLTRB = [0, 0, 0, 100];
  const validRequired = [10, 10, 20, 20];
  const noteRow = row([link('table')]);
  noteRow.evidence.sourceNoteDefinitionLinks = [defLink(validRequired)];
  const badFrame = auditUaSourceContextObligations({
    data: data([noteRow], [invalidTarget]),
    definitions: [definition(validRequired)],
  });
  assert.equal(badFrame.rowDefinitionAssessments[0].extentClassification, 'not-assessable');
  assert.equal(badFrame.rowDefinitionAssessments[0].reason, 'linked-target-has-invalid-source-bounds');
});
