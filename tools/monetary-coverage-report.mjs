import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadMonetaryRowIdentityAudit} from './monetary-row-identity-audit.mjs';
import {runMonetarySourceInventoryCli} from './monetary-source-inventory.mjs';

const root = resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const key = (path, digest, pointer) => JSON.stringify([path, digest, pointer]);
const counts = (rows, field) => rows.reduce((out, row) => {
  out[row[field]] = (out[row[field]] || 0) + 1;
  return out;
}, {});

// A join is a navigation aid between independent inventories. It never transfers
// a source grade by name, alias, shared pixels, a partial pointer or row order.
export function buildMonetaryCoverageReport({index, audit}) {
  if (index?.artifactType !== 'bounded-monetary-source-inventory' || !Array.isArray(index.sourceOccurrences) || !Array.isArray(index.claims)
    || audit?.generatedBy !== 'tools/monetary-row-identity-audit.mjs' || !Array.isArray(audit.records)
    || !Array.isArray(audit.knownFindings) || !Array.isArray(audit.reviewResults)) throw Error('Invalid monetary coverage inputs.');
  const byInput = new Map(), recordIds = new Set();
  for (const row of audit.records) {
    if (!row.uid || recordIds.has(row.uid) || typeof row.input !== 'string' || !/^[a-f0-9]{64}$/.test(row.inputSha256 || '') || typeof row.pointer !== 'string') throw Error('Invalid or duplicate audit record.');
    recordIds.add(row.uid);
    const id = key(row.input, row.inputSha256, row.pointer);
    if (!byInput.has(id)) byInput.set(id, []);
    byInput.get(id).push(row);
  }
  const knownByUid = new Map();
  for (const finding of audit.knownFindings) for (const ref of finding.records || []) {
    if (!knownByUid.has(ref.uid)) knownByUid.set(ref.uid, []);
    knownByUid.get(ref.uid).push({id: finding.id, kind: finding.kind, status: finding.status});
  }
  const auditRow = row => ({
    uid: row.uid,
    inputReference: {path: row.input, sha256: row.inputSha256, jsonPointer: row.pointer},
    source: row.source,
    object: row.label,
    rowIdentitySha256: row.rowIdentitySha256,
    focusGeometrySha256: row.focusGeometrySha256,
    contextEvidenceSha256: row.contextEvidenceSha256 || null,
    knownFindingOutcomes: knownByUid.get(row.uid) || [],
    physicalRowIdentityReview: row.physicalRowIdentityReview,
  });
  const matchedAuditRowUids = new Set();
  const occurrenceIds = new Set();
  const occurrences = index.sourceOccurrences.map((occurrence, occurrenceIndex) => {
    if (!occurrence.sourceOccurrenceId || occurrenceIds.has(occurrence.sourceOccurrenceId)) throw Error('Duplicate or missing source occurrence.');
    occurrenceIds.add(occurrence.sourceOccurrenceId);
    const ref = occurrence.provenance?.inputArtifact;
    const rows = ref ? byInput.get(key(ref.path, ref.sha256, ref.jsonPointer)) || [] : [];
    for (const row of rows) matchedAuditRowUids.add(row.uid);
    return {
      sourceOccurrenceId: occurrence.sourceOccurrenceId,
      inventoryPointer: `/sourceOccurrences/${occurrenceIndex}`,
      sourceInputReference: ref || null,
      joinStatus: rows.length ? 'exact-input-hash-and-row-pointer-match' : 'no-exact-audit-row-match',
      upstreamReviewStatus: occurrence.reviewStatus,
      auditRows: rows.map(auditRow),
      semanticPass: false,
    };
  });
  const byOccurrence = new Map(occurrences.map(occurrence => [occurrence.sourceOccurrenceId, occurrence]));
  const claimIds = new Set();
  const claims = index.claims.map((claim, claimIndex) => {
    if (!claim.claimId || claimIds.has(claim.claimId) || !byOccurrence.has(claim.sourceOccurrenceId)) throw Error('Duplicate claim or dangling occurrence reference.');
    claimIds.add(claim.claimId);
    const occurrence = byOccurrence.get(claim.sourceOccurrenceId);
    return {
      claimId: claim.claimId,
      sourceOccurrenceId: claim.sourceOccurrenceId,
      inventoryPointer: `/claims/${claimIndex}`,
      joinStatus: occurrence.joinStatus,
      auditRowUids: occurrence.auditRows.map(row => row.uid),
    };
  });
  const auditOnlyRows = audit.records.filter(row => !matchedAuditRowUids.has(row.uid)).map(auditRow);
  const findingIndexCoverage = audit.knownFindings.map(finding => {
    const indexedAuditRowUids = finding.records.filter(ref => matchedAuditRowUids.has(ref.uid)).map(ref => ref.uid);
    const auditOnlyRowUids = finding.records.filter(ref => !matchedAuditRowUids.has(ref.uid)).map(ref => ref.uid);
    return {
      findingId: finding.id,
      status: indexedAuditRowUids.length ? auditOnlyRowUids.length ? 'partially-indexed' : 'fully-indexed' : 'audit-only',
      indexedAuditRowUids,
      auditOnlyRowUids,
    };
  });
  return {
    schemaVersion: 1,
    artifactType: 'bounded-monetary-inventory-and-review-coverage',
    scope: 'Exact source-input, byte-hash and row-pointer joins across every indexed occurrence and claim. Missing joins remain visible. Known finding outcomes concern their declared dimension; an absence of findings does not establish source correctness.',
    sourceDenominators: index.sourceGroupDenominators,
    denominators: {
      indexedSourceOccurrences: occurrences.length,
      indexedValueClaims: claims.length,
      auditRecords: audit.records.length,
      matchedAuditRecords: matchedAuditRowUids.size,
      auditOnlyRecords: auditOnlyRows.length,
      occurrenceJoinStatuses: counts(occurrences, 'joinStatus'),
      claimJoinStatuses: counts(claims, 'joinStatus'),
      knownFindings: audit.knownFindings.length,
      knownFindingStatuses: counts(audit.knownFindings, 'status'),
      explicitReviewStatuses: counts(audit.reviewResults, 'status'),
      findingIndexCoverage: counts(findingIndexCoverage, 'status'),
    },
    auditValidation: audit.validation,
    sourceOccurrences: occurrences,
    claims,
    auditOnlyRows,
    knownFindings: audit.knownFindings,
    findingIndexCoverage,
    reviewResults: audit.reviewResults,
    limitations: [
      'No fuzzy matching, source-row alias inference or grade transfer between different source inputs.',
      'Worker transcription status is preserved separately from current hash-bound finding dispositions.',
      'No exact audit-row match is a coverage gap in this join, not evidence that the source occurrence is wrong or absent.',
      'Audit-only rows and findings remain explicit; no indirect receipt, name or alias is treated as an exact indexed join.',
      'Unknown source rows, whole-book completeness, note applicability and semantic row identity require independent source review.',
      'Object, monetary value, source location, crop and highlight coordinate spaces are retained at the linked inventory pointers.',
    ],
  };
}

export async function runMonetaryCoverageReport(argv = process.argv.slice(2)) {
  let indexPath = 'research/monetary-source-inventory.json';
  let output = 'artifacts/monetary-review-coverage/report.json';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--index' && argv[i + 1]) indexPath = argv[++i];
    else if (argv[i] === '--output' && argv[i + 1]) output = argv[++i];
    else throw Error(`Unknown or incomplete argument: ${argv[i]}`);
  }
  await runMonetarySourceInventoryCli(['--check', indexPath]);
  const bytes = readFileSync(resolve(root, indexPath));
  const audit = loadMonetaryRowIdentityAudit();
  const report = buildMonetaryCoverageReport({index: JSON.parse(bytes), audit});
  report.inventory = {path: indexPath, sha256: sha(bytes)};
  const target = resolve(root, output);
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
  return {output, denominators: report.denominators, knownFindingValidation: audit.validation.valid, semanticPass: false};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await runMonetaryCoverageReport())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
