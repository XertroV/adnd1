import {readFileSync, mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadMonetaryRowIdentityAudit} from './monetary-row-identity-audit.mjs';
import {runMonetarySourceInventoryCli} from './monetary-source-inventory.mjs';

const root = resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pointerToken = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
const makePointer = (...parts) => `/${parts.map(pointerToken).join('/')}`;
const typeOf = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
const fieldState = (present, value) => {
  if (!present) return 'absent-from-index-record';
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length ? 'populated-array' : 'empty-array';
  if (typeof value === 'string') return value.length ? 'populated-string' : 'empty-string';
  if (value && typeof value === 'object') return Object.keys(value).length ? 'populated-object' : 'empty-object';
  return `present-${typeof value}`;
};
const countBy = (rows, field) => rows.reduce((out, row) => {
  out[row[field]] = (out[row[field]] || 0) + 1;
  return out;
}, {});
const refKey = ref => JSON.stringify([ref?.path || null, ref?.sha256 || null, ref?.jsonPointer || null]);
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const sourceRefFromAudit = row => row ? {path: row.input, sha256: row.inputSha256, jsonPointer: row.pointer} : null;
const validSourceRef = ref => Boolean(ref && typeof ref.path === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256 || '') && typeof ref.jsonPointer === 'string');
const sameSourceRef = (left, right) => validSourceRef(left) && validSourceRef(right) && refKey(left) === refKey(right);
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function namedConditionFields(value, pointer, {skip = new Set()} = {}, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    value.forEach((child, index) => namedConditionFields(child, `${pointer}/${index}`, {skip}, out));
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    if (skip.has(key)) continue;
    const childPointer = `${pointer}/${pointerToken(key)}`;
    if (/(?:condition|qualifier)/i.test(key)) {
      out.push({pointer: childPointer, fieldName: key, present: true, type: typeOf(child), state: fieldState(true, child), value: copy(child)});
    }
    namedConditionFields(child, childPointer, {skip}, out);
  }
  return out;
}

function indexedFieldSnapshots(record, recordPointer) {
  const direct = {};
  for (const key of ['conditions', 'qualifiers']) {
    const present = Object.hasOwn(record, key);
    direct[key] = {
      pointer: `${recordPointer}/${key}`,
      present,
      type: present ? typeOf(record[key]) : 'absent',
      state: fieldState(present, record[key]),
      value: present ? copy(record[key]) : null,
    };
  }
  const nested = namedConditionFields(record, recordPointer, {
    skip: new Set(['reviewStatus', 'sourceReviewStatus', 'evidence', 'provenance', 'geometry', 'sourceReview', 'reviewResults', 'contextReview']),
  });
  // The direct fields above are represented once in direct; keep nested occurrences,
  // but retain other nested `conditions`/`qualifiers` as exact source-value paths.
  const nestedFields = nested.filter(field => !['conditions', 'qualifiers'].includes(field.fieldName) || field.pointer !== `${recordPointer}/${field.fieldName}`);
  const unique = new Map(nestedFields.map(field => [`${field.pointer}\0${JSON.stringify(field.value)}`, field]));
  return {direct, nested: [...unique.values()]};
}

function rowAuditFieldSnapshots(row, rowIndex) {
  const rowPointer = `/records/${rowIndex}`;
  const annotations = row.annotations && typeof row.annotations === 'object' ? row.annotations : {};
  const fields = [];
  for (const [sourceFieldPointer, value] of Object.entries(annotations)) {
    if (!/(?:condition|qualifier)/i.test(sourceFieldPointer) || /(?:^|\/)(?:sourceReviewStatus|reviewStatus)(?:\/|$)/i.test(sourceFieldPointer)) continue;
    fields.push({
      sourceFieldPointer,
      auditJsonPointer: `${rowPointer}/annotations/${pointerToken(sourceFieldPointer)}`,
      present: true,
      type: typeOf(value),
      state: fieldState(true, value),
      value: copy(value),
      contentStatus: 'exact-row-audit-annotation-content; not independently source-validated or authorship-certified',
    });
  }
  const sourceFieldHashes = Object.entries(row.sourceValueSha256ByPointer || {})
    .filter(([sourceFieldPointer]) => /(?:condition|qualifier)/i.test(sourceFieldPointer) && !/(?:^|\/)(?:sourceReviewStatus|reviewStatus)(?:\/|$)/i.test(sourceFieldPointer))
    .map(([sourceFieldPointer, valueSha256]) => ({sourceFieldPointer, valueSha256, contentStatus: 'hash-only; source text/value content not exposed here'}));
  return {rowPointer, fields, sourceFieldHashes};
}

function outcomeMapByUid(records = []) {
  const byUid = new Map();
  for (const item of records) {
    for (const ref of item.records || []) {
      if (!ref?.uid) continue;
      if (!byUid.has(ref.uid)) byUid.set(ref.uid, []);
      byUid.get(ref.uid).push({id: item.id, kind: item.kind || null, status: item.status || null});
    }
  }
  return byUid;
}

function declaredAuditReferenceMatches(contractRow, indexed, auditMatch) {
  const expectedSourceInput = contractRow.sourceInput;
  const actualIndexSourceInput = indexed?.ref || null;
  const actualAuditSourceInput = sourceRefFromAudit(auditMatch?.row);
  const declaredAudit = contractRow.sourceRowAudit || {};
  const declaredAuditSourceInput = {
    path: declaredAudit.input,
    sha256: declaredAudit.inputSha256,
    jsonPointer: declaredAudit.jsonPointer,
  };
  const checks = {
    sourceInputIsValidTriple: validSourceRef(expectedSourceInput),
    indexSourceReferenceMatchesSourceInput: sameSourceRef(expectedSourceInput, actualIndexSourceInput),
    auditUidDeclared: typeof declaredAudit.uid === 'string' && Boolean(declaredAudit.uid),
    auditUidExists: Boolean(auditMatch),
    declaredAuditTripleMatchesSourceInput: sameSourceRef(expectedSourceInput, declaredAuditSourceInput),
    actualAuditTripleMatchesSourceInput: sameSourceRef(expectedSourceInput, actualAuditSourceInput),
    actualIndexAndAuditTriplesMatch: sameSourceRef(actualIndexSourceInput, actualAuditSourceInput),
    declaredAuditRowIndexMatches: Boolean(auditMatch && declaredAudit.rowAuditIndex === auditMatch.rowIndex),
  };
  return {checks, expectedSourceInput: copy(expectedSourceInput || null), actualIndexSourceInput: copy(actualIndexSourceInput), actualAuditSourceInput: copy(actualAuditSourceInput)};
}

function currentContractStatus({contractRow, contractStatus, indexed, actualPointer, auditMatch, referenceCheck, knownFindings, reviewResults}) {
  const frozenSourceInput = contractRow.sourceInput || null;
  const currentIndexSourceInput = indexed?.ref || null;
  const currentAuditSourceInput = sourceRefFromAudit(auditMatch?.row);
  const currentExactRef = sameSourceRef(currentIndexSourceInput, currentAuditSourceInput);
  const baselinePathAndPointerMatch = validSourceRef(frozenSourceInput)
    && currentIndexSourceInput?.path === frozenSourceInput.path
    && currentIndexSourceInput?.jsonPointer === frozenSourceInput.jsonPointer
    && currentAuditSourceInput?.path === frozenSourceInput.path
    && currentAuditSourceInput?.jsonPointer === frozenSourceInput.jsonPointer;
  const uidMatches = Boolean(auditMatch && contractRow.sourceRowAudit?.uid === auditMatch.row.uid);
  const occurrenceMatches = Boolean(indexed && indexed.record?.sourceOccurrenceId === contractRow.indexedOccurrence?.sourceOccurrenceId);
  const declaredBeforeReferenceMatches = Boolean(referenceCheck.checks.sourceInputIsValidTriple && referenceCheck.checks.declaredAuditTripleMatchesSourceInput);
  const currentBindingValid = Boolean(uidMatches && occurrenceMatches && currentExactRef && baselinePathAndPointerMatch && declaredBeforeReferenceMatches);
  const conditionChanged = !sameJson(indexed?.record?.conditions, contractRow.indexedOccurrence?.conditions);
  const sourceHashChanged = Boolean(currentIndexSourceInput?.sha256 && frozenSourceInput?.sha256 && currentIndexSourceInput.sha256 !== frozenSourceInput.sha256);
  const indexPointerChanged = Boolean(indexed && contractRow.indexedOccurrence?.inventoryPointer && actualPointer !== contractRow.indexedOccurrence.inventoryPointer);
  let status;
  if (!currentBindingValid) status = 'current-row-audit-uid-or-reference-mismatch-needs-independent-review';
  else if (conditionChanged && sourceHashChanged) status = 'condition-and-source-hash-changed-needs-independent-review';
  else if (conditionChanged) status = 'condition-changed-needs-independent-review';
  else if (sourceHashChanged) status = 'source-hash-changed-needs-independent-review';
  else if (indexPointerChanged) status = 'index-pointer-changed-needs-independent-review';
  else status = 'unchanged-known-condition-omission-needs-independent-review';
  return {
    status,
    currentBindingValid,
    conditionChanged,
    sourceHashChanged,
    indexPointerChanged,
    currentIndexSourceInput: copy(currentIndexSourceInput),
    currentRowAuditSourceInput: copy(currentAuditSourceInput),
    currentIndexAndAuditTriplesMatch: currentExactRef,
    currentPathAndPointerMatchFrozenContract: baselinePathAndPointerMatch,
    explicitRowAuditUidMatched: uidMatches,
    currentOccurrenceIdMatched: occurrenceMatches,
    currentRowAuditUid: auditMatch?.row.uid || contractRow.sourceRowAudit?.uid || null,
    currentRowAuditKnownFindingOutcomes: auditMatch ? copy(knownFindings.get(auditMatch.row.uid) || []) : [],
    currentRowAuditReviewOutcomes: auditMatch ? copy(reviewResults.get(auditMatch.row.uid) || []) : [],
    contractStatus,
  };
}

export function buildMonetaryConditionCoverage({index, audit, inputRefs = {}, declaredSourceContracts = [], mode = 'before'}) {
  if (index?.artifactType !== 'bounded-monetary-source-inventory' || !Array.isArray(index.sourceOccurrences) || !Array.isArray(index.claims)) throw Error('Invalid monetary source index.');
  if (!audit || !Array.isArray(audit.records)) throw Error('Invalid full monetary row-audit input.');
  if (!Array.isArray(declaredSourceContracts) || declaredSourceContracts.some(contract => !contract?.contractId || !Array.isArray(contract.rows))) throw Error('Invalid declared source-condition contract.');
  if (!['before', 'current'].includes(mode)) throw Error('Invalid monetary condition coverage mode.');
  if (audit.knownFindings !== undefined && !Array.isArray(audit.knownFindings)) throw Error('Invalid current row-audit known findings.');
  if (audit.reviewResults !== undefined && !Array.isArray(audit.reviewResults)) throw Error('Invalid current row-audit review results.');

  const occurrenceById = new Map();
  const rowAuditByRef = new Map();
  const rowAuditByUid = new Map();
  const knownFindingOutcomesByUid = outcomeMapByUid(audit.knownFindings || []);
  const reviewOutcomesByUid = outcomeMapByUid(audit.reviewResults || []);
  for (let i = 0; i < audit.records.length; i++) {
    const row = audit.records[i];
    if (!row?.uid || rowAuditByUid.has(row.uid) || typeof row.input !== 'string' || !/^[a-f0-9]{64}$/.test(row.inputSha256 || '') || typeof row.pointer !== 'string') throw Error('Invalid or duplicate row-audit record.');
    const ref = {path: row.input, sha256: row.inputSha256, jsonPointer: row.pointer};
    const key = refKey(ref);
    if (!rowAuditByRef.has(key)) rowAuditByRef.set(key, []);
    rowAuditByRef.get(key).push({row, rowIndex: i});
    rowAuditByUid.set(row.uid, {row, rowIndex: i});
  }

  const occurrenceIds = new Set();
  const auditRowsMatched = new Set();
  const occurrences = index.sourceOccurrences.map((record, i) => {
    const id = record?.sourceOccurrenceId;
    if (!id || occurrenceIds.has(id)) throw Error('Duplicate or missing indexed source occurrence ID.');
    occurrenceIds.add(id);
    const ref = record.provenance?.inputArtifact || null;
    const matches = ref ? rowAuditByRef.get(refKey(ref)) || [] : [];
    for (const match of matches) auditRowsMatched.add(match.row.uid);
    const fields = indexedFieldSnapshots(record, `/sourceOccurrences/${i}`);
    occurrenceById.set(id, {record, i, ref, matches});
    return {
      sourceOccurrenceId: id,
      occurrenceKind: record.occurrenceKind,
      inventoryPointer: `/sourceOccurrences/${i}`,
      object: record.object,
      purpose: record.purpose,
      source: copy(record.source || null),
      sourceIdentity: copy(record.sourceIdentity || null),
      sourceArtifactPointers: copy(record.provenance || null),
      directFieldSnapshots: fields.direct,
      nestedConditionQualifierFields: fields.nested,
      exactAuditJoin: {
        status: matches.length ? 'exact-path-hash-row-pointer-match' : 'no-exact-full-row-audit-match',
        auditRecordUids: matches.map(match => match.row.uid),
      },
      sourceSemanticReview: 'unassessed; field values and empty states are recorded without inferring printed-source absence or completeness',
    };
  });

  const claimIds = new Set();
  const claims = index.claims.map((record, i) => {
    const id = record?.claimId;
    if (!id || claimIds.has(id) || !occurrenceById.has(record.sourceOccurrenceId)) throw Error('Duplicate claim ID or dangling source occurrence reference.');
    claimIds.add(id);
    const fields = indexedFieldSnapshots(record, `/claims/${i}`);
    return {
      claimId: id,
      sourceOccurrenceId: record.sourceOccurrenceId,
      claimPointer: `/claims/${i}`,
      object: record.object,
      purpose: record.purpose,
      source: copy(record.source || null),
      valueSemantics: copy(record.valueSemantics || null),
      sourceArtifactPointers: copy(record.provenance || null),
      directFieldSnapshots: fields.direct,
      nestedConditionQualifierFields: fields.nested,
      sourceSemanticReview: 'unassessed; field values and empty states are recorded without inferring printed-source absence or completeness',
    };
  });

  const rowAuditRecords = audit.records.map((row, i) => {
    const fieldSnapshots = rowAuditFieldSnapshots(row, i);
    const exactRef = {path: row.input, sha256: row.inputSha256, jsonPointer: row.pointer};
    const matches = rowAuditByRef.has(refKey(exactRef))
      ? occurrences.filter(occurrence => occurrence.exactAuditJoin.auditRecordUids.includes(row.uid))
      : [];
    return {
      uid: row.uid,
      surface: row.surface,
      rowAuditPointer: fieldSnapshots.rowPointer,
      exactSourceArtifactPointer: exactRef,
      sourceIdentity: copy(row.identity || null),
      sourceLocation: copy(row.source || null),
      recordedConditionQualifierAnnotations: fieldSnapshots.fields,
      sourceFieldContentHashes: fieldSnapshots.sourceFieldHashes,
      exactIndexedOccurrenceIds: matches.map(occurrence => occurrence.sourceOccurrenceId),
      indexJoinStatus: matches.length ? 'exact-path-hash-row-pointer-match' : 'no-corresponding-indexed-occurrence',
      knownFindingOutcomes: copy(knownFindingOutcomesByUid.get(row.uid) || []),
      explicitReviewOutcomes: copy(reviewOutcomesByUid.get(row.uid) || []),
      sourceSemanticReview: 'unassessed; absent audit annotation is not evidence of absent printed-source condition or qualifier',
    };
  });

  const noIndexQueue = rowAuditRecords.filter(row => row.indexJoinStatus === 'no-corresponding-indexed-occurrence');
  const indexOnlyOccurrences = occurrences.filter(row => row.exactAuditJoin.status === 'no-exact-full-row-audit-match');
  const declaredContractProjection = declaredSourceContracts.map(contract => {
    const contractStatus = contract.reviewStatus || contract.status || 'declared-status-not-provided';
    return {
      contractId: contract.contractId,
      contractStatus,
      sourceReviewStatus: 'retained-source-review-contract; generic inventory does not independently evaluate semantics',
      inputContract: copy(contract),
      exactIndexBindings: contract.rows.map(contractRow => {
        const indexed = occurrenceById.get(contractRow.indexedOccurrence?.sourceOccurrenceId);
        const actualPointer = indexed ? `/sourceOccurrences/${indexed.i}` : null;
        const expectedPointer = contractRow.indexedOccurrence?.inventoryPointer || null;
        const actualCondition = indexed?.record?.conditions;
        const expectedCondition = contractRow.indexedOccurrence?.conditions;
        const auditMatch = contractRow.sourceRowAudit?.uid ? rowAuditByUid.get(contractRow.sourceRowAudit.uid) : null;
        const references = declaredAuditReferenceMatches(contractRow, indexed, auditMatch);
        const indexPointerMatches = Boolean(indexed && actualPointer === expectedPointer);
        const beforeValueMatches = Boolean(indexed && sameJson(actualCondition, expectedCondition));
        const sourceFieldPointer = contract.expectedSourceFieldPointer || '/conditions';
        const expectedConditionPointer = contractRow.indexedOccurrence?.conditionPointer || null;
        const actualConditionPointer = indexed ? `${actualPointer}${sourceFieldPointer}` : null;
        const conditionPointerMatches = !expectedConditionPointer || expectedConditionPointer === actualConditionPointer;
        const exactBeforeBinding = indexPointerMatches && beforeValueMatches && conditionPointerMatches
          && Object.values(references.checks).every(Boolean);
        const currentBinding = mode === 'current' ? currentContractStatus({
          contractRow,
          contractStatus,
          indexed,
          actualPointer,
          auditMatch,
          referenceCheck: references,
          knownFindings: knownFindingOutcomesByUid,
          reviewResults: reviewOutcomesByUid,
        }) : null;
        return {
          recordId: contractRow.recordId,
          sourceInputPointer: copy(contractRow.sourceInput || null),
          declaredSourceRowAudit: copy(contractRow.sourceRowAudit || null),
          indexedOccurrenceId: contractRow.indexedOccurrence?.sourceOccurrenceId || null,
          expectedIndexPointer: expectedPointer,
          actualIndexPointer: actualPointer,
          expectedBeforeCondition: copy(expectedCondition),
          actualIndexCondition: copy(actualCondition),
          exactSourceReferenceChecks: references.checks,
          frozenContractReferenceChecks: references.checks,
          actualIndexedSourceInput: references.actualIndexSourceInput,
          actualSourceRowAuditInput: references.actualAuditSourceInput,
          sourceRowAuditUidFound: Boolean(auditMatch),
          beforeValueMatches,
          indexPointerMatches,
          conditionPointerMatches,
          ...(mode === 'current' ? currentBinding : {}),
          status: mode === 'current'
            ? currentBinding.status
            : exactBeforeBinding ? 'exact-pointer-hash-row-audit-uid-and-before-value-match' : 'contract-to-source-or-index-identity-mismatch',
          semanticConditionPass: false,
        };
      }),
    };
  });
  const claimCountsByOccurrence = new Map();
  for (const claim of claims) claimCountsByOccurrence.set(claim.sourceOccurrenceId, (claimCountsByOccurrence.get(claim.sourceOccurrenceId) || 0) + 1);
  const claimCountDistribution = {};
  for (const count of claimCountsByOccurrence.values()) claimCountDistribution[count] = (claimCountDistribution[count] || 0) + 1;
  const allIndexRows = [...occurrences, ...claims];
  const fieldStateCounts = {};
  for (const record of allIndexRows) {
    for (const [field, snapshot] of Object.entries(record.directFieldSnapshots)) {
      const key = `${record.claimId ? 'claim' : 'occurrence'}.${field}`;
      fieldStateCounts[key] ||= {};
      fieldStateCounts[key][snapshot.state] = (fieldStateCounts[key][snapshot.state] || 0) + 1;
    }
  }
  const nestedFieldPathCounts = {};
  for (const record of allIndexRows) for (const field of record.nestedConditionQualifierFields) {
    const root = record.claimId ? /^\/claims\/\d+/ : /^\/sourceOccurrences\/\d+/;
    const relative = field.pointer.replace(root, '').replace(/\/\d+(?=\/|$)/g, '/*');
    const key = `${record.claimId ? 'claim' : 'occurrence'}:${relative}`;
    nestedFieldPathCounts[key] = (nestedFieldPathCounts[key] || 0) + 1;
  }
  return {
    schemaVersion: 3,
    artifactType: mode === 'current'
      ? 'monetary-condition-and-qualifier-coverage-current'
      : 'monetary-condition-and-qualifier-coverage-before-source-correction',
    executionMode: mode,
    generatedBy: 'tools/monetary-condition-coverage.mjs',
    scope: mode === 'current'
      ? 'Read-only current projection of condition and qualifier fields, exact input references, row-audit correspondences, and separate existing row-audit finding outcomes. Changes to held contract rows require independent review; this does not certify source completeness or semantics.'
      : 'Read-only before-correction projection of condition and qualifier fields, exact input references and row-audit correspondences. This records dataset contents, not source completeness, applicability, meaning, or correctness.',
    inputArtifacts: {
      indexedInventory: inputRefs.index || null,
      fullRowAudit: inputRefs.audit || null,
      sourceConditionContracts: inputRefs.contracts || null,
      sourceArtifactsFromIndex: copy(index.inputArtifacts || []),
    },
    denominators: {
      indexedSourceOccurrences: occurrences.length,
      indexedValueClaims: claims.length,
      fullRowAuditRecords: rowAuditRecords.length,
      auditRowsWithExactIndexedOccurrence: rowAuditRecords.length - noIndexQueue.length,
      auditRowsWithoutExactIndexedOccurrence: noIndexQueue.length,
      indexOccurrencesWithoutExactAuditRow: indexOnlyOccurrences.length,
      indexedOccurrencesByClaimCount: claimCountDistribution,
      occurrenceKinds: countBy(occurrences, 'occurrenceKind'),
      auditSurfacesWithoutExactIndexMatch: countBy(noIndexQueue, 'surface'),
      directFieldStates: fieldStateCounts,
      nestedConditionQualifierFieldPathCounts: nestedFieldPathCounts,
      auditAnnotationFieldNameCounts: rowAuditRecords.flatMap(row => row.recordedConditionQualifierAnnotations).reduce((out, field) => {
        out[field.sourceFieldPointer] = (out[field.sourceFieldPointer] || 0) + 1;
        return out;
      }, {}),
      indexOnlyOccurrenceKinds: countBy(indexOnlyOccurrences, 'occurrenceKind'),
    },
    sourceOccurrences: occurrences.map(occurrence => ({...occurrence, valueClaimIds: index.claims.filter(c => c.sourceOccurrenceId === occurrence.sourceOccurrenceId).map(c => c.claimId)})),
    claims,
    fullRowAuditRecords: rowAuditRecords,
    ...(mode === 'current' ? {
      currentRowAuditKnownFindings: copy(audit.knownFindings || []),
      currentRowAuditReviewResults: copy(audit.reviewResults || []),
    } : {}),
    explicitNoCorrespondingIndexQueue: noIndexQueue.map(row => ({
      uid: row.uid,
      rowAuditPointer: row.rowAuditPointer,
      exactSourceArtifactPointer: row.exactSourceArtifactPointer,
      recordedConditionQualifierAnnotationPointers: row.recordedConditionQualifierAnnotations.map(field => field.sourceFieldPointer),
      sourceFieldContentHashPointers: row.sourceFieldContentHashes.map(field => field.sourceFieldPointer),
      disposition: 'no-exact-indexed-source-occurrence; source-semantic-absence-unassessed',
    })),
    explicitIndexOccurrencesWithoutExactAuditQueue: indexOnlyOccurrences.map(row => ({
      sourceOccurrenceId: row.sourceOccurrenceId,
      inventoryPointer: row.inventoryPointer,
      sourceArtifactPointers: row.sourceArtifactPointers,
      disposition: 'no-exact-full-row-audit-reference; retained as an explicit index-side queue',
    })),
    declaredSourceConditionContracts: declaredContractProjection,
    sourceSemanticPass: false,
    sourceSemanticCompleteness: 'unassessed for every occurrence, value claim, and audit row unless separately linked to a named manual source contract; no null, empty or absent field is an automatic negative pass',
    snapshotLineage: mode === 'current'
      ? {sourceConditionContractsRemainBoundToTheirFrozenBeforeReferences: true, currentInputHashesAreRecordedSeparately: true}
      : {
        supersedes: {
          path: 'research/source-audit-batch5-monetary-condition-coverage-before-source-corrections.json',
          sha256: '555b6b7a1b872aed1c6f6858765bbab3511eb979672ed6ae9e77fc6ab8c5d5e7',
        },
        reason: 'Version 3 adds full source-reference and row-audit UID binding checks; source field snapshots and audit/index denominators remain explicit and source semantics stay unassessed.',
      },
    limitations: [
      'The inventory records only currently serialized condition/qualifier fields and their exact source artifact pointers.',
      'A null, empty, missing, or unhashed field is not evidence that the printed source has no qualifier.',
      'No value, phrase, condition, qualifier, or applicability receives a semantic pass from this programmatic report.',
      'Audit rows with no exact indexed occurrence are retained individually in the queue; they are not inferred absent from the source.',
      'Index receipts without a matching full row-audit pointer are separately retained and are not silently discarded.',
      'Known reviewed cases must be represented by explicit, source-bound contracts and preserved before correction; this generic scanner does not discover semantic omissions.',
    ],
  };
}

export async function runMonetaryConditionCoverage(argv = process.argv.slice(2), dependencies = {}) {
  const repoRoot = dependencies.repoRoot || root;
  const beforeMode = argv.includes('--before');
  let indexPath = beforeMode ? 'artifacts/monetary-source-inventory-before-source-corrections/index.json' : 'research/monetary-source-inventory.json';
  let auditPath = beforeMode ? 'research/source-audit-batch5-monetary-context-migration-before-v3.json' : null;
  let outputPath = beforeMode ? null : 'artifacts/monetary-condition-coverage/report.json';
  let contractsPath = 'research/source-audit-batch5-monetary-condition-contract-before-info4-v2.json';
  let explicitOutput = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--before') continue;
    if (arg === '--index' && argv[i + 1]) {
      if (!beforeMode) throw Error('--index is available only with --before; current mode uses the validated committed index.');
      indexPath = argv[++i];
    } else if (arg === '--row-audit' && argv[i + 1]) {
      if (!beforeMode) throw Error('--row-audit is available only with --before; current mode loads the live row audit.');
      auditPath = argv[++i];
    } else if (arg === '--source-contracts' && argv[i + 1]) {
      if (!beforeMode) throw Error('--source-contracts is available only with --before.');
      contractsPath = argv[++i];
    } else if (arg === '--output' && argv[i + 1]) {
      outputPath = argv[++i];
      explicitOutput = true;
    } else {
      throw Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (beforeMode && !explicitOutput) throw Error('--before requires an explicit --output path for a new historical report.');
  if (!outputPath) throw Error('Missing output path.');

  const target = resolve(repoRoot, outputPath);
  const frozenBeforeTargets = [
    'research/source-audit-batch5-monetary-condition-coverage-before-source-corrections.json',
    'research/source-audit-batch5-monetary-condition-coverage-before-source-corrections-v2.json',
  ].map(path => resolve(repoRoot, path));
  if (frozenBeforeTargets.includes(target)) throw Error('Output path is reserved for a frozen before-correction report.');
  if (beforeMode && existsSync(target)) throw Error(`--before output already exists; refusing to overwrite ${outputPath}.`);
  if (beforeMode && [indexPath, auditPath, contractsPath].some(path => path && resolve(repoRoot, path) === target)) {
    throw Error('--before output must be a new path separate from its historical inputs.');
  }

  let indexBytes;
  let audit;
  let auditRef;
  if (beforeMode) {
    indexBytes = readFileSync(resolve(repoRoot, indexPath));
    const auditBytes = readFileSync(resolve(repoRoot, auditPath));
    audit = JSON.parse(auditBytes);
    auditRef = {path: auditPath, sha256: sha(auditBytes), adapter: audit.sourceAdapter || null};
  } else {
    const validateCurrentIndex = dependencies.validateCurrentIndex || runMonetarySourceInventoryCli;
    await validateCurrentIndex(['--check', indexPath]);
    indexBytes = readFileSync(resolve(repoRoot, indexPath));
    const loadLiveAudit = dependencies.loadLiveAudit || loadMonetaryRowIdentityAudit;
    audit = await loadLiveAudit({repoRoot});
    auditRef = {
      source: 'loadMonetaryRowIdentityAudit',
      inputManifest: copy(audit.inputManifest || []),
      mandatoryFindings: copy(audit.mandatoryFindings || null),
      knownFindings: Array.isArray(audit.knownFindings) ? audit.knownFindings.length : null,
      reviewResults: Array.isArray(audit.reviewResults) ? audit.reviewResults.length : null,
      validation: copy(audit.validation || null),
    };
  }
  const contractsBytes = readFileSync(resolve(repoRoot, contractsPath));
  const index = JSON.parse(indexBytes);
  const contractsDocument = JSON.parse(contractsBytes);
  if (contractsDocument?.artifactType !== 'manual-source-condition-contracts-before-correction' || !Array.isArray(contractsDocument.contracts)) throw Error('Invalid source-condition contract artifact.');
  if (beforeMode) {
    const frozenIndexRef = contractsDocument.inputs?.index;
    const frozenAuditRef = contractsDocument.inputs?.fullRowAudit;
    if (frozenIndexRef?.path !== indexPath || frozenIndexRef?.sha256 !== sha(indexBytes)
      || frozenAuditRef?.path !== auditPath || frozenAuditRef?.sha256 !== auditRef.sha256) {
      throw Error('Historical inputs do not match the frozen source-condition contract references.');
    }
  }
  const report = buildMonetaryConditionCoverage({
    index,
    audit,
    declaredSourceContracts: contractsDocument.contracts,
    mode: beforeMode ? 'before' : 'current',
    inputRefs: {
      index: {path: indexPath, sha256: sha(indexBytes)},
      audit: auditRef,
      contracts: {path: contractsPath, sha256: sha(contractsBytes)},
    },
  });
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  return {
    output: outputPath,
    mode: beforeMode ? 'before' : 'current',
    reportSha256: sha(readFileSync(target)),
    denominators: {
      indexedSourceOccurrences: report.denominators.indexedSourceOccurrences,
      indexedValueClaims: report.denominators.indexedValueClaims,
      fullRowAuditRecords: report.denominators.fullRowAuditRecords,
      exactAuditMatches: report.denominators.auditRowsWithExactIndexedOccurrence,
      noCorrespondingIndex: report.denominators.auditRowsWithoutExactIndexedOccurrence,
      indexOnlyOccurrences: report.denominators.indexOccurrencesWithoutExactAuditRow,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await runMonetaryConditionCoverage())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
