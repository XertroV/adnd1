import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, isAbsolute, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditUaSourceContextObligations} from './ua-source-context-obligations.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = 'research/source-audit-batch5-ua-additional-prices.json';
const BEFORE_PATH = 'research/source-audit-batch5-ua-context-obligations-before-v3.json.gz';
const BEFORE_SHA256 = 'ee30b00f77d85a4b5dcf8878ddd97e7630777857cb6ba7b947dd4a03e4933c6b';
const SOURCE_ARTIFACT_SHA256 = '8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a';
const SOURCE_PDF_SHA256 = 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4';
const EXPECTED = Object.freeze({rows: 583, groups: 15, physicalDefinitions: 23, declaredContexts: 43, rowDefinitionJoins: 103, rowsWithDefinitionJoins: 98, contentObligations: 6, linkedTargetRows: 583});
const LEGACY_EXPECTED = Object.freeze({...EXPECTED, declaredContexts: 33});

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const parseJsonBytes = bytes => JSON.parse(bytes.toString('utf8'));
const readArtifact = path => {
  const absolute = isAbsolute(path) ? path : resolve(root, path);
  const bytes = readFileSync(absolute);
  return {path: absolute, sha256: sha256(bytes), bytes};
};
const loadBefore = path => {
  const artifact = readArtifact(path);
  if (artifact.sha256 !== BEFORE_SHA256) throw new Error(`Frozen UA context baseline SHA mismatch: ${artifact.sha256} != ${BEFORE_SHA256}`);
  const content = artifact.bytes[0] === 0x1f && artifact.bytes[1] === 0x8b ? gunzipSync(artifact.bytes) : artifact.bytes;
  return {...artifact, data: parseJsonBytes(content)};
};

function buildIndependentInputs(before) {
  const assessments = before?.activeV2?.rowDefinitionAssessments;
  const summary = before?.activeV2?.summary;
  const legacySummary = before?.originalLegacy33?.summary;
  if (!Array.isArray(assessments) || !summary || !legacySummary) throw new TypeError('Frozen UA before baseline is missing active/legacy row-definition assessments.');
  const definitions = new Map();
  const resolutions = new Map();
  for (const assessment of assessments) {
    const id = assessment.definitionId;
    const frame = assessment.definitionSourceFrame;
    const bounds = assessment.requiredBoundsPdfPagePointsTopLeftLTRB;
    if (typeof id !== 'string' || !frame || !Array.isArray(bounds) || bounds.length !== 4) throw new TypeError('Frozen UA before baseline has an invalid definition join.');
    const prior = definitions.get(id);
    const next = {id, book: frame.book, sourcePdfSha256: frame.sourcePdfSha256, printedPage: frame.printedPage, pdfPage: frame.pdfPage, bounds};
    if (prior && JSON.stringify(prior) !== JSON.stringify(next)) throw new Error(`Frozen UA baseline has inconsistent source bounds for definition ${id}.`);
    definitions.set(id, next);
    const ids = resolutions.get(assessment.recordId) ?? [];
    if (!ids.includes(id)) ids.push(id);
    resolutions.set(assessment.recordId, ids);
  }
  const rowResolutions = [...resolutions].map(([recordId, sourceDefinitionIds]) => ({recordId, sourceDefinitionIds}));
  const contentObligations = (before.activeV2.contentObligationAssessments ?? []).map(item => ({
    obligationId: item.obligationId,
    groupId: item.groupId,
    segmentId: item.segmentId ?? null,
    targetId: item.targetId ?? null,
    targetIds: item.targetIds,
    contentKind: item.contentKind,
    recordIds: item.requiredRecordIds ?? [],
    sourceFrame: item.sourceFrame,
    boundsPdfPagePointsTopLeftLTRB: item.requiredBoundsPdfPagePointsTopLeftLTRB,
    annotationStatus: item.annotationStatus,
  }));
  if (summary.rows !== 583 || summary.groups !== 15 || summary.physicalDefinitions !== 23 || summary.rowDefinitionJoins !== 103 || summary.rowsWithDefinitionJoins !== 98 || summary.contentObligations !== 6
    || legacySummary.declaredContexts !== 33 || summary.declaredContexts !== 38) {
    throw new Error('Frozen UA context baseline no longer matches its pinned full denominator (583 rows, 23 definitions, 103 joins, six measured blocks, 33 legacy / 38 V2 contexts).');
  }
  if (definitions.size !== 23 || rowResolutions.length !== 98 || assessments.length !== 103 || contentObligations.length !== 6) throw new Error('Frozen UA before baseline full denominators do not reconcile.');
  return {definitions: [...definitions.values()], rowResolutions, contentObligations};
}

function inspectSourceIdentity(data) {
  const issues = [];
  if (data?.source?.sha256 !== SOURCE_PDF_SHA256) issues.push({scope: 'source', reason: 'source-pdf-sha-mismatch', expected: SOURCE_PDF_SHA256, actual: data?.source?.sha256 ?? null});
  const groupIds = new Set();
  for (const group of data?.groupReviews ?? []) {
    if (groupIds.has(group.groupId)) issues.push({scope: 'group', groupId: group.groupId, reason: 'duplicate-group-id'});
    groupIds.add(group.groupId);
    if (group.sourcePdfSha256 !== SOURCE_PDF_SHA256) issues.push({scope: 'group', groupId: group.groupId, reason: 'group-source-pdf-sha-mismatch'});
    const targets = group.activeContextTargets;
    if (!Array.isArray(targets)) continue;
    let priorOrder = 0;
    const ids = new Set();
    for (const target of targets) {
      const source = target?.source ?? {};
      const render = target?.sourceRender ?? {};
      const crop = target?.crop ?? {};
      const bounds = crop.cropBoundsPdfPagePointsTopLeftLTRB;
      const pixels = crop.cropBoundsPixelsLTRB;
      const dims = crop.cropDimensionsPx;
      const page = render.pageBoundsPdfPagePointsTopLeftLTRB;
      const validRect = r => Array.isArray(r) && r.length === 4 && r.every(Number.isFinite) && r[2] > r[0] && r[3] > r[1];
      const validPixels = r => Array.isArray(r) && r.length === 4 && r.every(Number.isInteger) && r[2] > r[0] && r[3] > r[1];
      const validPair = x => Array.isArray(x) && x.length === 2 && x.every(n => Number.isInteger(n) && n > 0);
      const failure = [];
      if (!target?.targetId || ids.has(target.targetId)) failure.push('missing-or-duplicate-target-id');
      ids.add(target?.targetId);
      if (!Number.isInteger(target?.targetOrder) || target.targetOrder !== priorOrder + 1) failure.push('noncontiguous-target-order');
      priorOrder = target?.targetOrder ?? priorOrder;
      if (source.book !== 'UA' || source.sourcePdfSha256 !== SOURCE_PDF_SHA256 || !Number.isInteger(source.printedPage) || source.printedPage < 1 || !Number.isInteger(source.pdfPage) || source.pdfPage < 1) failure.push('invalid-target-source-frame');
      if (!render.sourceRenderId || !/^[a-f0-9]{64}$/.test(render.sourceRenderSha256 ?? '') || !validPair(render.sourceRenderDimensionsPx) || !Number.isFinite(render.renderDpi) || render.renderDpi <= 0 || !validRect(page) || !render.coordinateSpace) failure.push('invalid-source-render-frame');
      if (render.sourcePdfSha256 !== SOURCE_PDF_SHA256) failure.push('render-source-pdf-sha-mismatch');
      if (!validRect(bounds) || !validPixels(pixels) || !validPair(dims) || !/^[a-f0-9]{64}$/.test(crop.cropSha256 ?? '') || !Number.isFinite(crop.renderDpi) || crop.renderDpi !== render.renderDpi || !crop.coordinateSpace) failure.push('invalid-crop-metadata');
      if (validRect(bounds) && validRect(page) && (bounds[0] < page[0] || bounds[1] < page[1] || bounds[2] > page[2] || bounds[3] > page[3])) failure.push('crop-outside-declared-page-frame');
      if (validPixels(pixels) && validPair(dims) && (dims[0] !== pixels[2] - pixels[0] || dims[1] !== pixels[3] - pixels[1])) failure.push('pixel-crop-dimension-span-mismatch');
      if (validPixels(pixels) && validPair(render.sourceRenderDimensionsPx) && (pixels[0] < 0 || pixels[1] < 0 || pixels[2] > render.sourceRenderDimensionsPx[0] || pixels[3] > render.sourceRenderDimensionsPx[1])) failure.push('pixel-crop-outside-render');
      if (failure.length) issues.push({scope: 'active-target', groupId: group.groupId, targetId: target?.targetId ?? null, reason: failure});
    }
  }
  for (const row of data?.rowRecords ?? []) {
    const evidence = row?.evidence ?? {};
    if (evidence.sourcePdfSha256 !== SOURCE_PDF_SHA256 || !Number.isInteger(row?.sourceRowIdentity?.printedPage) || !Number.isInteger(row?.sourceRowIdentity?.pdfPage) || !Number.isInteger(row?.sourceRowIdentity?.rowIndexWithinGroup)) {
      issues.push({scope: 'row', recordId: row?.recordId ?? null, reason: 'invalid-row-source-identity'});
    }
  }
  return issues;
}

export function buildUaSourceContextObligationsReport({data, before, beforeArtifactSha256 = BEFORE_SHA256} = {}) {
  if (beforeArtifactSha256 !== BEFORE_SHA256) throw new Error('UA before baseline is not the pinned immutable full-context capture.');
  if (!data || !Array.isArray(data.groupReviews) || !Array.isArray(data.rowRecords)) throw new TypeError('Current UA source context input must contain groupReviews and rowRecords.');
  const independent = buildIndependentInputs(before);
  const sourceIdentityIssues = inspectSourceIdentity(data);
  const expected = EXPECTED;
  const active = auditUaSourceContextObligations({
    data, ...independent, contextMode: 'active', expectedDenominators: expected,
    contentObligations: independent.contentObligations,
  });
  const legacy = auditUaSourceContextObligations({
    data, ...independent, contextMode: 'legacy', expectedDenominators: LEGACY_EXPECTED,
    contentObligations: independent.contentObligations,
  });
  const badDefinitions = active.rowDefinitionAssessments.filter(item => item.extentClassification !== 'contained'
    || item.candidateDefinitionLinkStatus !== 'matches-independent-before-join'
    || item.applicabilityStatus !== 'uncertain-applicability');
  const badContent = active.contentObligationAssessments.filter(item => item.extentClassification !== 'contained' || item.semanticPass !== false);
  const activeTargetCount = active.denominators.declaredContexts;
  const checks = {
    pinnedBeforeHash: {status: beforeArtifactSha256 === BEFORE_SHA256 ? 'pass' : 'fail', expected: BEFORE_SHA256, actual: beforeArtifactSha256},
    immutableSourceIdentity: {status: data.source?.sha256 === SOURCE_PDF_SHA256 && sourceIdentityIssues.length === 0 ? 'pass' : 'fail', expectedSourcePdfSha256: SOURCE_PDF_SHA256, frozenSourceArtifactSha256: SOURCE_ARTIFACT_SHA256, issueCount: sourceIdentityIssues.length},
    activeDenominator: {status: active.denominatorMismatches.length === 0 ? 'pass' : 'fail', expected: expected, actual: active.denominators, mismatches: active.denominatorMismatches},
    legacyDenominator: {status: legacy.denominatorMismatches.length === 0 ? 'pass' : 'fail', expected: LEGACY_EXPECTED, actual: legacy.denominators, mismatches: legacy.denominatorMismatches},
    activeSourceFrameAndRasterGeometry: {status: sourceIdentityIssues.length === 0 && activeTargetCount === expected.declaredContexts ? 'pass' : 'fail', issueCount: sourceIdentityIssues.length, issues: sourceIdentityIssues},
    independentRowDefinitionLinksAndExtents: {status: active.rowDefinitionAssessments.length === 103 && badDefinitions.length === 0 ? 'pass' : 'fail', assessed: active.rowDefinitionAssessments.length, badRecordDefinitionPairs: badDefinitions.map(item => ({recordId: item.recordId, definitionId: item.definitionId, extentClassification: item.extentClassification, candidateDefinitionLinkStatus: item.candidateDefinitionLinkStatus, applicabilityStatus: item.applicabilityStatus}))},
    measuredContentExtents: {status: active.contentObligationAssessments.length === 6 && badContent.length === 0 ? 'pass' : 'fail', assessed: active.contentObligationAssessments.length, failures: badContent.map(item => ({obligationId: item.obligationId, extentClassification: item.extentClassification, sourceFrame: item.sourceFrame}))},
  };
  const failed = Object.values(checks).some(item => item.status === 'fail');
  return {
    artifactType: 'UA source-context obligations CI report', schemaVersion: 1,
    status: failed ? 'structural-fail-source-review-still-required' : 'structural-pass-source-semantics-and-applicability-pending',
    inputs: {currentSourcePath: SOURCE_PATH, currentSourcePdfSha256: data.source?.sha256 ?? null, frozenSourceArtifactSha256: SOURCE_ARTIFACT_SHA256, immutableFullBeforePath: BEFORE_PATH, immutableFullBeforeSha256: beforeArtifactSha256},
    pinnedBeforeDenominators: {rows: 583, groups: 15, legacyContexts: 33, v2ContextsBeforeV3: 38, physicalDefinitions: 23, rowDefinitionJoins: 103, rowsWithDefinitionJoins: 98, measuredContentBlocks: 6},
    expectedCurrentDenominators: {activeContextTargets: 43, rows: 583, groups: 15, physicalDefinitions: 23, rowDefinitionJoins: 103, rowsWithDefinitionJoins: 98, measuredContentBlocks: 6},
    checks,
    sourceIdentityIssues,
    active,
    legacy,
    interpretation: {structuralOnly: true, semanticPass: false, contextualAdequacyPass: false, imagePixelReviewPass: false, sourceValuesApproved: false, all103ApplicabilityUncertain: active.applicabilityCounts['uncertain-applicability'] === 103 && active.applicabilityCounts['reviewed-applicability'] === 0},
  };
}

function parseArgs(argv) {
  const options = {source: SOURCE_PATH, before: BEFORE_PATH, output: null, check: false};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source') options.source = argv[++i];
    else if (arg === '--before') options.before = argv[++i];
    else if (arg === '--output') options.output = argv[++i];
    else if (arg === '--check') options.check = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument ${arg}.`);
  }
  if (options.check && options.output) throw new Error('Use either --check or --output, not both.');
  return options;
}

export function runUaSourceContextObligationsCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) return {status: 'usage', text: 'Usage: node tools/ua-source-context-obligations-cli.mjs [--source <current-UA-json>] [--before <pinned-full-before.json.gz>] [--output <report.json> | --check]'};
  const current = readArtifact(options.source);
  const before = loadBefore(options.before);
  const report = buildUaSourceContextObligationsReport({data: parseJsonBytes(current.bytes), before: before.data, beforeArtifactSha256: before.sha256});
  report.inputs.currentArtifactSha256 = current.sha256;
  if (options.output) {
    const output = isAbsolute(options.output) ? options.output : resolve(root, options.output);
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
    return {status: report.status, output, currentRows: report.active.denominators.rows, activeTargets: report.active.denominators.declaredContexts};
  }
  return {status: report.status, currentRows: report.active.denominators.rows, activeTargets: report.active.denominators.declaredContexts, checks: report.checks};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = runUaSourceContextObligationsCli();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.status === 'structural-fail-source-review-still-required') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
