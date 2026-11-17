import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const testDir = import.meta.dirname;
const repoRoot = process.env.NATIVE2_SOURCE_REPO_ROOT || resolve(testDir, '..');
const proposalRoot = resolve(testDir, '..');
const requiredInstalledFiles = [
  'tools/class-mapping-current-source-gate-v2.mjs',
  'tools/bind-class-mapping-source-audit-input-commit-v3.mjs',
  'tools/class-mapping-current-monetary-questions-v2.mjs',
  'tools/class-mapping-current-ua26-marker-v2.mjs',
  'tools/monetary-unit-provenance-audit-next-native-v3.mjs',
  'tools/monetary-row-identity-audit.mjs',
  'research/class-mapping-current-adapters-v2/native-monetary-question-contract-v2.json',
  'research/class-mapping-current-adapters-v2/ua26-marker-current-contract-v2.json',
  'dist/data.json',
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readBytes = path => { const installed=resolve(repoRoot,path); if(existsSync(installed)) return readFileSync(installed); return readFileSync(resolve(proposalRoot,path)); };
const readJson = path => JSON.parse(readBytes(path).toString('utf8'));
function atPointer(value, pointer) {
  let current = value;
  for (const part of pointer.slice(1).split('/').map(token => token.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, part)) return {found: false};
    current = current[part];
  }
  return {found: true, value: current};
}

const paths = Object.freeze({
  handoff: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/current/gaps-handoff.json',
  coverage: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/current/coverage-gaps.json',
  consistency: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/current/report-consistency.json',
  systemic: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/current/citation-systemic-current.json',
  table: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/current/source-table-citation-coverage.json',
  visual: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/visual/source-visual-coverage.json',
  geometry: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/geometry/source-visual-audit-next-native-v3.json',
  rasterBoundary: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/raster/source-raster-boundary.json.gz',
  rasterCoverage: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/raster/source-raster-coverage.json',
  continuationFull: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/continuation/continuation-candidates.json.gz',
  continuationSummary: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/continuation/continuation-summary.json',
  unit: 'research/class-mapping-source-epoch-v2/reports/next-native-v3/current/monetary-unit-provenance/report.json',
  sourceScan: 'research/class-mapping-source-epoch-v2/reports/current/source-scan-inventory-class-mapping-current-v2.json',
  monetaryQuestionContract: 'research/class-mapping-current-adapters-v2/native-monetary-question-contract-v2.json',
  ua26MarkerContract: 'research/class-mapping-current-adapters-v2/ua26-marker-current-contract-v2.json',
});
const requiredReportFiles = [
  'research/class-mapping-source-epoch-v2/metadata-stage-v3.json',
  ...Object.values(paths),
];
const ready = requiredInstalledFiles.every(file => existsSync(resolve(repoRoot, file)))
  && requiredReportFiles.every(file => existsSync(resolve(repoRoot, file)));
const moduleAt = path => pathToFileURL(resolve(repoRoot, path));
let sourceGate=null, receiptVerifier=null, questionsApi=null, ua26Api=null, unitApi=null, rowIdentity=null;
if (ready) {
  [sourceGate, receiptVerifier, questionsApi, ua26Api, unitApi, rowIdentity] = await Promise.all([
    import(moduleAt('tools/class-mapping-current-source-gate-v2.mjs')),
    import(moduleAt('tools/bind-class-mapping-source-audit-input-commit-v3.mjs')),
    import(moduleAt('tools/class-mapping-current-monetary-questions-v2.mjs')),
    import(moduleAt('tools/class-mapping-current-ua26-marker-v2.mjs')),
    import(moduleAt('tools/monetary-unit-provenance-audit-next-native-v3.mjs')),
    import(moduleAt('tools/monetary-row-identity-audit.mjs')),
  ]);
}

function pinnedOutput(receipt, path) {
  const pin = receipt.outputs.find(row => row.path === path);
  assert.ok(pin, `report receipt omits ${path}`);
  const bytes = readBytes(path);
  assert.equal(sha(bytes), pin.rawSha256, `${path} raw bytes must match the sealed output pin`);
  assert.equal(bytes.length, pin.sizeBytes, `${path} byte length must match the sealed output pin`);
  return bytes;
}
function pinnedJson(receipt, path) {
  return JSON.parse(pinnedOutput(receipt, path).toString('utf8'));
}
function verifyTargetRef(ref) {
  assert.ok(ref && typeof ref.path === 'string' && typeof ref.pointer === 'string');
  const bytes = readBytes(ref.path);
  assert.equal(sha(bytes), ref.sha256, `${ref.path} must match the target's raw input identity`);
  const document = JSON.parse(bytes.toString('utf8'));
  const target = atPointer(document, ref.pointer);
  assert.equal(target.found, true, `${ref.path}${ref.pointer} must resolve`);
  assert.equal(rowIdentity.hash(target.value), ref.recordSha256, `${ref.uid} must retain its exact record identity`);
}

// Question targets may be S1 authored inputs or exact QCC/P static report
// data. Both are authority roles from the already verified receipt, never a
// fallback to any file merely present on disk.
function assertClosedQuestionInputAuthority(receipt, sourceBody, target) {
  assert.equal(receipt.sourceEpoch.sourceBody.stage, 'source2-body-native');
  assert.equal(receipt.qualifierProducer.stage, 'Native2 report QCC M');
  const bodyHash = sourceBody.get(target.inputPath);
  const bodyPins = receipt.sourceEpoch.sourceBody.inputs.filter(row => row.path === target.inputPath);
  assert.ok(bodyPins.length <= 1, `${target.inputPath} must have one exact Source2 authority`);
  assert.equal(bodyPins.length, bodyHash === undefined ? 0 : 1, `${target.inputPath} must retain source-map/receipt agreement`);
  const reportPins = receipt.qualifierProducer.staticAdapterData.filter(row => row.path === target.inputPath);
  assert.ok(reportPins.length <= 1, `${target.inputPath} must have one exact report-data authority`);
  assert.ok(reportPins.length === 1, `${target.inputPath} must have a closed qualified input authority`);
  if (bodyHash !== undefined) {
    assert.equal(bodyHash, target.inputSha256, `${target.inputPath} must retain its exact Source2 input hash`);
    assert.equal(bodyPins[0].sha256, target.inputSha256);
    assert.ok(Number.isSafeInteger(bodyPins[0].sizeBytes) && bodyPins[0].sizeBytes >= 0);
  }
  for (const pin of reportPins) {
    assert.equal(pin.stage, 'Native2-static-report-data', `${target.inputPath} must retain its static report-data role`);
    assert.equal(pin.sha256, target.inputSha256, `${target.inputPath} must retain its exact M report-data hash`);
    assert.ok(Number.isSafeInteger(pin.sizeBytes) && pin.sizeBytes >= 0);
    if (bodyPins.length) assert.equal(pin.sizeBytes, bodyPins[0].sizeBytes, `${target.inputPath} authority roles must agree on size`);
  }
}

test('current Source2 reports preserve open questions and join the fresh handoff, unit, source, raster, and continuation evidence', {timeout: 180_000, skip: !ready && 'awaiting actual sealed M/N/O report outputs'}, async () => {
  // These are current no-argument APIs. The first pins the installed source
  // identity, the verifier checks the sealed output closure, and the question
  // loader rebuilds the current projection from its installed evidence.
  const identity = sourceGate.assertClassMappingCurrentSourceIdentity();
  const verified = await receiptVerifier.verifyCommittedClassMappingReportReceipt();
  const projection = questionsApi.loadCurrentMonetarySourceQuestions();
  const receipt = verified.receipt;
  assert.equal(verified.sourceCommit, identity.summary.sourceCommit);
  assert.equal(verified.sourceTree, identity.summary.sourceTree);
  assert.equal(receipt.sourceEpoch.sourceBody.commit, identity.summary.sourceCommit);
  assert.equal(receipt.sourceEpoch.sourceBody.tree, identity.summary.sourceTree);

  const handoffBytes = pinnedOutput(receipt, paths.handoff);
  const handoff = JSON.parse(handoffBytes.toString('utf8'));
  const ua26Marker = ua26Api.auditUa26MarkerReceiptWithCurrentSourceEpoch();
  const ua26Contract = readJson(paths.ua26MarkerContract);
  assert.equal(ua26Marker.ok, true);
  assert.equal(ua26Marker.semanticPass, false);
  assert.deepEqual(ua26Marker.counts, {physicalRows: 68, marked: 17, unmarked: 51, aliases: 66});
  assert.equal(ua26Marker.receiptPath, ua26Contract.legacyMarkerReceipt.path);
  assert.equal(ua26Marker.sourceValueGrade, 'NOT PROMOTED');
  assert.equal(ua26Marker.contextualAdequacy, 'NOT ASSESSED');
  assert.equal(ua26Marker.defaultSelectionReview, 'NOT PROMOTED');
  assert.equal(ua26Marker.currentEpoch.sourceCommit, identity.summary.sourceCommit);
  assert.equal(ua26Marker.currentEpoch.sourceTree, identity.summary.sourceTree);
  assert.deepEqual(ua26Marker.currentEpoch.catalogTransitions.map(({path, sha256}) => ({path, sha256})),
    ua26Contract.currentS1Catalogs.map(({path, sha256}) => ({path, sha256})));
  assert.deepEqual(handoff.currentNativeEvidence.ua26MarkerAudit, ua26Marker);
  assert.deepEqual(handoff.currentNativeEvidence.gradeBoundary, {
    semanticPass: false, sourceValues: 'NOT PROMOTED', context: 'NOT ASSESSED', defaultSelection: 'NOT PROMOTED',
  });
  const coverage = pinnedJson(receipt, paths.coverage);
  assert.equal(coverage.snapshot.handoffSha256, sha(handoffBytes));
  const consistency = pinnedJson(receipt, paths.consistency);
  const systemic = pinnedJson(receipt, paths.systemic);
  const evidenceBindings = systemic.evidenceBindings;
  const bindingRows = evidenceBindings.bindings;
  const metrics = consistency.metrics;
  const tally = key => bindingRows.reduce((counts, row) => {
    counts[row[key]] = (counts[row[key]] || 0) + 1;
    return counts;
  }, {});
  const targetCounts = tally('targetStatus');
  const reviewCounts = tally('reviewStatus');
  const reviewedCount = bindingRows.filter(row => row.reviewStatus === 'field-target-reviewed').length;
  assert.equal(evidenceBindings.denominator, bindingRows.length);
  assert.equal(metrics.denominator, evidenceBindings.denominator);
  assert.deepEqual(metrics.targetStatusCounts, targetCounts);
  assert.deepEqual(metrics.reviewStatusCounts, reviewCounts);
  assert.deepEqual(evidenceBindings.targetStatusCounts, targetCounts);
  assert.deepEqual(evidenceBindings.reviewStatusCounts, reviewCounts);
  assert.equal(metrics.emptyRegionTargets, targetCounts['empty-region-target'] || 0);
  assert.equal(metrics.resolvedRegionTargets, targetCounts['field-target-resolved'] || 0);
  assert.equal(metrics.recordTargetResolvedBindings, targetCounts['record-target-resolved'] || 0);
  assert.equal(metrics.regionResolvedFieldReviewPendingBindings, targetCounts['region-resolved-field-review-pending'] || 0);
  assert.equal(metrics.fieldTargetReviewed, reviewedCount);
  assert.equal(metrics.fieldTargetNotReviewed, bindingRows.length - reviewedCount);
  assert.equal(metrics.resolvedButFieldTargetNotReviewed, bindingRows.filter(row =>
    row.targetStatus === 'field-target-resolved' && row.reviewStatus !== 'field-target-reviewed').length);
  const crossTabKeys = [...new Set(bindingRows.map(row => JSON.stringify([row.targetStatus, row.reviewStatus])))].sort();
  const crossTab = crossTabKeys.map(key => {
    const [targetStatus, reviewStatus] = JSON.parse(key);
    return {targetStatus, reviewStatus, count: bindingRows.filter(row =>
      row.targetStatus === targetStatus && row.reviewStatus === reviewStatus).length};
  });
  assert.deepEqual(metrics.crossTab, crossTab);
  const visual = pinnedJson(receipt, paths.visual);
  const geometry = pinnedJson(receipt, paths.geometry);
  const rasterCoverage = pinnedJson(receipt, paths.rasterCoverage);
  const continuationSummary = pinnedJson(receipt, paths.continuationSummary);
  const unit = pinnedJson(receipt, paths.unit);
  const sourceScanBytes = pinnedOutput(receipt, paths.sourceScan);
  const sourceScan = JSON.parse(sourceScanBytes.toString('utf8'));
  const rasterBoundaryBytes = pinnedOutput(receipt, paths.rasterBoundary);
  const rasterBoundary = JSON.parse(gunzipSync(rasterBoundaryBytes).toString('utf8'));
  const continuationBytes = pinnedOutput(receipt, paths.continuationFull);
  const continuationRaw = gunzipSync(continuationBytes);
  const continuation = JSON.parse(continuationRaw.toString('utf8'));

  const sourceBody = new Map(receipt.sourceEpoch.sourceBody.inputs.map(row => [row.path, row.sha256]));
  const currentDataBytes = readBytes('dist/data.json');
  const currentData = JSON.parse(currentDataBytes.toString('utf8'));
  assert.equal(sha(currentDataBytes), sourceBody.get('dist/data.json'));
  assert.equal(sha(Buffer.from(JSON.stringify(currentData))), handoff.snapshot.parsedDataSha256);
  assert.equal(sha(currentDataBytes), handoff.snapshot.rawDistDataFileSha256);
  assert.equal(sha(sourceScanBytes), handoff.snapshot.sourceScanFileSha256);
  assert.equal(sourceScan.input.sha256, handoff.snapshot.sourceScanInputSha256);
  assert.equal(systemic.input.sha256, handoff.snapshot.parsedDataSha256);
  assert.deepEqual(handoff.currentNativeEvidence.sourceEpoch, {
    sourceCommit: identity.summary.sourceCommit,
    sourceTree: identity.summary.sourceTree,
    fixture: identity.summary.fixture,
  });
  assert.equal(projection.currentInputs.nativeSourceEpoch.sourceCommit, identity.summary.sourceCommit);
  assert.equal(projection.currentInputs.nativeSourceEpoch.sourceTree, identity.summary.sourceTree);

  // Seven interpretation questions and two source-scope questions stay
  // unresolved. Each affected target points to the exact current raw input
  // and row bytes, rather than relying on a denominator alone.
  const interpretationIds = [
    'relative-monetary-reading-ua-census-record-006',
    'relative-monetary-reading-ua-census-record-038',
    'uncertain-scimitar-marker-ua-other-008-H1-cont-r030',
    'uncertain-scimitar-marker-ua-other-008-H2-r070',
    'uncertain-scimitar-marker-ua-other-008-H2-r071',
    'uncertain-scimitar-marker-ua-other-008-H2-r072',
    'uncertain-scimitar-marker-ua-other-008-H2-r073',
  ];
  const scopeIds = ['phb-dmg-commodity-adjustment-scope', 'phb-dmg-alchemist-discount-scope'];
  assert.deepEqual(projection.sourceQuestions.slice(0, 7).map(row => row.id), interpretationIds);
  assert.deepEqual(projection.sourceQuestions.slice(7).map(row => row.id), scopeIds);
  assert.deepEqual(projection.questionCounts, {
    currentInterpretationQuestions: 7,
    independentSourceScopeQuestions: 2,
    distinctScopeRows: 9,
    currentUnresolvedQuestions: 9,
  });
  assert.equal(projection.semanticPass, false);
  assert.equal(projection.generalSourceReviewPending, true);
  assert.deepEqual(handoff.currentMonetarySourceQuestions, projection);
  assert.deepEqual(handoff.currentNativeEvidence.monetarySourceQuestions, projection);
  const questionContract = readJson(paths.monetaryQuestionContract);
  const contractTargets = new Map(questionContract.targetSemanticContract.targets.map(row => [row.uid, row]));
  const historicalQuestions = new Map(questionContract.historicalBoundary.questionRecords.map(row => [row.id, row]));
  const scopeQuestions = new Map(questionContract.scopeBoundary.questions.map(row => [row.id, row]));
  function assertClosedQuestionRef(ref, uid) {
    const target = contractTargets.get(uid);
    assert.ok(target, `${uid} must be declared by the closed current question contract`);
    assert.equal(ref.uid, uid);
    assert.equal(ref.path, target.inputPath);
    assert.equal(ref.pointer, target.pointer);
    assert.equal(ref.sha256, target.inputSha256);
    assert.equal(ref.recordSha256, target.recordSha256);
    assert.equal(ref.rowIdentitySha256, target.rowIdentitySha256);
    assertClosedQuestionInputAuthority(receipt, sourceBody, target);
    verifyTargetRef(ref);
    return target;
  }
  for (const question of projection.sourceQuestions) {
    assert.equal(question.status, 'unresolved');
    assert.equal(question.semanticPass, false);
  }
  // Seven interpretation questions each carry one exact current row target.
  // The two scope questions instead carry their closed contract row sets
  // (eight commodity rows and one alchemist row); no optional branch can skip verification.
  for (const question of projection.sourceQuestions.slice(0, 7)) {
    assert.equal(question.currentDisposition, 'unresolved-source-question');
    const historical = historicalQuestions.get(question.id);
    assert.ok(historical, `missing closed historical question declaration: ${question.id}`);
    assert.equal(question.uid, historical.uid);
    const target = assertClosedQuestionRef(question.currentTargetRef, historical.uid);
    assert.equal(question.currentRecordSha256, target.recordSha256);
    assert.equal(question.currentRowIdentitySha256, target.rowIdentitySha256);
    assert.equal(Object.hasOwn(question, 'currentTargetRefs'), false);
  }
  for (const question of projection.sourceQuestions.slice(7)) {
    assert.equal(question.currentDisposition, undefined);
    const scope = scopeQuestions.get(question.id);
    assert.ok(scope, `missing closed scope question declaration: ${question.id}`);
    assert.deepEqual(question.affectedAuditRows.map(row => row.uid), scope.uids);
    assert.ok(Array.isArray(question.currentTargetRefs));
    assert.equal(question.currentTargetRefs.length, scope.uids.length);
    assert.deepEqual(question.currentTargetRefs.map(ref => ref.uid), scope.uids);
    for (const [index, ref] of question.currentTargetRefs.entries()) {
      const target = assertClosedQuestionRef(ref, scope.uids[index]);
      const affected = question.affectedAuditRows[index];
      assert.equal(affected.recordSha256, target.recordSha256);
      assert.equal(affected.rowIdentitySha256, target.rowIdentitySha256);
      assert.equal(ref.recordSha256, affected.recordSha256);
      assert.equal(ref.rowIdentitySha256, affected.rowIdentitySha256);
    }
    assert.equal(Object.hasOwn(question, 'currentTargetRef'), false);
  }
  const scopedRows = projection.sourceQuestions.slice(7).flatMap(question => question.affectedAuditRows);
  assert.equal(scopedRows.length, 9);
  assert.equal(new Set(scopedRows.map(row => row.uid)).size, 9);
  assert.deepEqual(projection.sourceQuestions.slice(7).map(question => question.affectedAuditRows.length), [8, 1]);

  const derived = projection.records.filter(row => row.currentDisposition === 'source-backed-derived-valuation');
  assert.equal(derived.length, 1);
  assert.equal(projection.records.length, 8);
  assert.equal(projection.records.filter(row => row.currentDisposition === 'unresolved-source-question').length, 7);
  const mammoth = derived[0];
  assert.equal(mammoth.semanticPass, false);
  assert.equal(mammoth.printedValuePass, false);
  assert.deepEqual(
    [mammoth.derivedValue.kind, mammoth.derivedValue.minimumAmount, mammoth.derivedValue.maximumAmount,
      mammoth.derivedValue.currency, mammoth.derivedValue.unit, mammoth.derivedValue.isSourcePrinted,
      mammoth.derivedValue.printedAsRange, mammoth.derivedValue.derivation.factor,
      mammoth.derivedValue.derivationStatus],
    ['range', 150, 900, 'gp', 'per tusk', false, false, 1.5, 'source-backed-derived-interpretation'],
  );
  assert.equal(mammoth.currentTargetRef.path, 'research/price-source-inventory-monster-books.json');
  assert.equal(mammoth.currentTargetRef.pointer, '/claims/18');
  verifyTargetRef(mammoth.currentTargetRef);
  const monetaryIndex = readJson('research/monetary-source-inventory.json');
  assert.equal(sha(readBytes('research/monetary-source-inventory.json')), projection.currentInputs.monetaryIndex.sha256);
  const indexedMammoth = monetaryIndex.claims.find(row => row.claimId === 'price-discovery:mm-mammoth-tusks-relative#/typedClaim');
  assert.ok(indexedMammoth);
  assert.deepEqual(indexedMammoth.valueSemantics, mammoth.derivedValue);

  // Jo remains an unextracted, source-unknown claim: both the current data
  // owner and the unit report preserve nulls and decline absence/unit claims.
  const jo = unit.joUnitAdmission;
  const expectedJo = unitApi.expectedJoUnitRecord;
  assert.equal(jo.record.uid, expectedJo.uid);
  assert.equal(jo.record.inputPath, expectedJo.input);
  assert.equal(jo.record.jsonPointer, expectedJo.pointer);
  assert.equal(jo.record.recordSha256, expectedJo.recordSha256);
  assert.equal(jo.record.rowIdentitySha256, expectedJo.rowIdentitySha256);
  assert.deepEqual(jo.record.matchedUnitQuantityFields, []);
  assert.deepEqual(jo.sourceState, {
    priceState: 'unextracted', sourceValueStatus: 'not-assessed', unitProvenance: 'unassessable',
    sourcePriceAbsenceReviewed: false, extractedPriceReviewed: false,
    semanticPass: false, sourceAbsenceProof: false,
  });
  const priceInventory = readJson('research/price-source-inventory.json');
  assert.equal(sha(readBytes('research/price-source-inventory.json')), sourceBody.get('research/price-source-inventory.json'));
  const joClaim = atPointer(priceInventory, expectedJo.pointer);
  assert.equal(joClaim.found, true);
  assert.equal(rowIdentity.hash(joClaim.value), expectedJo.recordSha256);
  assert.equal(joClaim.value.itemId, 'ua-jo-stick');
  assert.equal(joClaim.value.printedPrice, null);
  assert.equal(joClaim.value.estimate, null);
  assert.equal(joClaim.value.sourcePageReference, null);
  assert.equal(joClaim.value.priceState, 'unextracted');
  const joData = currentData.equipment.find(row => row.id === 'ua-jo-stick');
  assert.equal(joData.price, null);
  assert.equal(joData.priceState, 'unextracted');
  const joGap = handoff.currentNativeEvidence.joSourceGap;
  assert.equal(joGap.itemId, 'ua-jo-stick');
  assert.equal(joGap.sourceAbsence, false);
  assert.equal(joGap.valueReviewed, false);
  assert.equal(joGap.sourcePriceAbsenceReviewed, false);
  assert.equal(joGap.unitProvenance, 'unassessable');
  const joSiteGap = handoff.currentSitePriceGaps.records.find(row => row.itemId === 'ua-jo-stick');
  assert.ok(joSiteGap);
  assert.equal(joSiteGap.priceState, 'unextracted');
  assert.equal(joSiteGap.estimate, null);
  assert.equal(joSiteGap.sourceAbsenceReviewed, false);

  // p.175 has current limited supplemental crops while its canonical PDF
  // page remains physically absent; availability never upgrades the PDF.
  const p175 = handoff.missingReferencedContent.missingCitedPages.find(row => row.book === 'DMG' && row.printedPage === 175);
  assert.ok(p175);
  assert.equal(p175.pdfPage, null);
  assert.equal(p175.canonicalSource.sha256, p175.currentAvailability.sourceIdentity.canonicalPdfSha256);
  assert.equal(p175.privateSupplement.sha256, p175.currentAvailability.sourceIdentity.supplementalImageSha256);
  assert.equal(p175.currentAvailability.sourceIdentity.canonicalPdfPage, null);
  assert.equal(p175.currentAvailability.sourceIdentity.editionStatus, 'user-confirmed-correct-edition');
  assert.equal(p175.currentAvailability.sourceIdentity.printingStatus, 'not-specified');
  assert.equal(p175.currentAvailability.sourceIdentity.fullImagePublished, false);
  assert.equal(p175.currentAvailability.availability.distinctSupplementalCropImages, 8);
  assert.equal(new Set(p175.currentAvailability.availability.supplementalCropImageSha256s).size, 8);
  assert.equal(p175.currentAvailability.availability.distinctP175RegionIds, 34);
  assert.equal(new Set(p175.currentAvailability.availability.p175RegionIds).size, 34);
  assert.equal(p175.currentAvailability.content.sourceValuesAssessed, false);
  assert.equal(p175.currentAvailability.content.mechanicsGradesPromoted, false);
  assert.equal(p175.currentAvailability.content.contextReviewExpanded, false);
  assert.equal(p175.currentAvailability.content.completeAppendixCTranscription, false);
  const p175Coverage = coverage.groups.find(group => group.id === 'missing-referenced-content').entries.find(row => row.id === 'missing-cited-DMG-175');
  assert.ok(p175Coverage);
  assert.equal(p175Coverage.status, 'physical-gap-in-supplied-pdf; limited-supplemental-excerpts-available');
  assert.ok(p175Coverage.handoffPointers.includes('/missingReferencedContent/missingCitedPages/0'));

  // The exact fresh reports cross-join by bytes and named identities. The
  // continuation pair also binds its compressed and raw representation.
  const outputHash = path => receipt.outputs.find(row => row.path === path)?.rawSha256;
  for (const [key, path] of [
    ['sourceScan', paths.sourceScan], ['systemic', paths.systemic], ['visual', paths.visual],
    ['raster', paths.rasterCoverage], ['sourceTable', paths.table],
  ]) {
    const ref = handoff.currentNativeEvidence.reports[key];
    assert.equal(ref.path, path);
    assert.equal(ref.sha256, outputHash(path), `${key} handoff pin must be the exact report output`);
    assert.equal(sha(readBytes(ref.path)), ref.sha256);
  }
  const geometryRef = visual.inputs.geometry;
  assert.equal(geometryRef.file, paths.geometry);
  assert.equal(geometryRef.sha256, outputHash(paths.geometry));
  assert.equal(sha(readBytes(geometryRef.file)), geometryRef.sha256);
  assert.equal(rasterCoverage.snapshot.path, paths.rasterBoundary);
  assert.equal(rasterCoverage.snapshot.sha256, outputHash(paths.rasterBoundary));
  assert.deepEqual(rasterCoverage.sourceGeometry, {path: paths.geometry, sha256: outputHash(paths.geometry), selection: 'next-native-v3-fresh-output'});
  assert.deepEqual(geometry.sourcePdfSha256, rasterBoundary.inputs.sourcePdfSha256);
  assert.equal(continuationSummary.fullEvidence.sha256, outputHash(paths.continuationFull));
  assert.equal(sha(continuationBytes), continuationSummary.fullEvidence.sha256);
  assert.equal(sha(continuationRaw), continuationSummary.fullEvidence.rawReportSha256);
  assert.deepEqual(continuation.input, continuationSummary.input);
  assert.equal(continuationSummary.input.distDataRawFileSha256, handoff.snapshot.rawDistDataFileSha256);
  assert.equal(consistency.validation.valid, true);
  assert.equal(consistency.validation.semanticPass, false);
  assert.deepEqual(consistency.findings, []);
  assert.equal(receipt.semantics.semanticPass, false);
});



test('Jo Source2 binding preserves exact references while retaining the unknown-price grade boundary',()=>{
  const jo=readJson('research/class-mapping-current-adapters-v2/jo-current-source-gap-contract-v3.json');
  assert.equal(jo.materialized,true);
  assert.equal(jo.status,'qualified; Jo null/unextracted gap retained with review pending');
  assert.deepEqual(jo.nativeSourceEpochBinding,{sourceCommit:'400f6e9d123d8a654b9b9af48133a2533506e73d',sourceTree:'664c02504efcece25669d2f9c3fdb26437cd5b09',fixturePath:'research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json',fixtureSha256:'a333c3920f5ec5d3dbdca4b32673dd22ba94c77807794103af3eb21af71b14c2'});
  assert.equal(jo.retainedJoTarget.itemId,'ua-jo-stick');
  assert.equal(jo.retainedJoTarget.price,null);assert.equal(jo.retainedJoTarget.priceState,'unextracted');
  assert.deepEqual(jo.retainedJoTarget.requiredState,{price:null,priceState:'unextracted',mechanicsPriceStatus:'not-extracted',mechanicsPriceValue:null,mechanicsPriceInspected:false,mechanicsCheckers:[]});
  assert.equal(jo.retainedJoTarget.sourcePriceAbsenceReviewed,false);assert.equal(jo.retainedJoTarget.extractedPriceReviewed,false);
  assert.equal(jo.retainedJoTarget.unitProvenance,'unassessable');assert.equal(jo.retainedJoTarget.semanticPass,false);
  assert.ok(jo.historicalEvidence.legacyJoRegistration.path.startsWith('research/source-audit-batch6-'));
  assert.ok(jo.currentEvidence.sourceBodyRefs.some(row=>row.path==='equipment.json'));
  assert.notDeepEqual(jo.historicalEvidence,jo.currentEvidence);
});


test('report-data coverage names accepted B/K/L/F and preserves the old fixture candidate separately',()=>{
  const manifest=readJson('research/class-mapping-source-epoch-v2/report-data-coverage-v3.json');
  assert.equal(manifest.sourceEpoch.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
  assert.equal(manifest.sourceEpoch.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
  assert.equal(manifest.sourceEpoch.parentCommit,'6502b19620e092ced9f3e233f2dc3d5ffc8bd3ec');
  assert.equal(manifest.sourceEpoch.fixtureSha256,'a333c3920f5ec5d3dbdca4b32673dd22ba94c77807794103af3eb21af71b14c2');
  assert.deepEqual(manifest.sourceEpoch.coreCodeK,{commit:'3da6f9f59fcca6b5ce7e3b55be15357182591edf',tree:'42484c6cf36df7dcb8dedb99c05414168e74fb5d',parent:'400f6e9d123d8a654b9b9af48133a2533506e73d'});
  assert.deepEqual(manifest.sourceEpoch.metadataL,{commit:'06d5278d28bc346ca9b7bca11622d6c8b4ec5a5a',tree:'3d9f4953dfd8a62674e81cefdec89cf1cc2320f9',parent:'3da6f9f59fcca6b5ce7e3b55be15357182591edf'});
  assert.equal(manifest.sourceEpoch.fixtureCandidateRawSha256,undefined);
  assert.equal(manifest.sourceEpoch.fixtureFinalHashPending,undefined);
  assert.equal(manifest.historicalCandidateMetadata.sourceEpoch.fixtureCandidateRawSha256,'a0df8069b856d2748f0a0024e5c1b13e5004b900f3d2220fa943f0514c45af25');
  assert.equal(manifest.historicalCandidateMetadata.sourceEpoch.fixtureFinalHashPending,true);
  const preimage=manifest.historicalCandidateMetadata.preimage,bytes=readBytes(preimage.path);
  assert.equal(sha(bytes),preimage.sha256);assert.equal(bytes.length,preimage.sizeBytes);
  assert.deepEqual(manifest.reportQualification,{reportQccM:null,consumerSealN:null,producerO:null,qualified:false});
  assert.match(manifest.status,/accepted core readiness.*byte-identical through M to N/i);
  assert.match(manifest.status,/M\/N\/O qualification remain pending/);
});

test('current question input authority keeps source and static report roles exact and rejects undeclared or conflicting pins', () => {
  const bodyPath = 'dist/data.json';
  const reportPath = 'research/source-audit-batch5-ua-additional-prices.json';
  const bodySha = 'a'.repeat(64), reportSha = 'b'.repeat(64);
  const receipt = {sourceEpoch:{sourceBody:{stage:'source2-body-native',inputs:[{path:bodyPath,sha256:bodySha,sizeBytes:10}]}},qualifierProducer:{stage:'Native2 report QCC M',staticAdapterData:[{path:reportPath,sha256:reportSha,sizeBytes:20,stage:'Native2-static-report-data'},{path:bodyPath,sha256:bodySha,sizeBytes:10,stage:'Native2-static-report-data'}]}};
  const source = new Map([[bodyPath,bodySha]]);
  assert.doesNotThrow(() => assertClosedQuestionInputAuthority(receipt,source,{inputPath:bodyPath,inputSha256:bodySha}));
  assert.doesNotThrow(() => assertClosedQuestionInputAuthority(receipt,source,{inputPath:reportPath,inputSha256:reportSha}));
  assert.throws(() => assertClosedQuestionInputAuthority(receipt,source,{inputPath:'unadmitted-question-input',inputSha256:reportSha}), /closed qualified input authority/);
  assert.throws(() => assertClosedQuestionInputAuthority(receipt,source,{inputPath:bodyPath,inputSha256:reportSha}), /exact Source2 input hash/);
  assert.throws(() => assertClosedQuestionInputAuthority(receipt,source,{inputPath:reportPath,inputSha256:bodySha}), /exact M report-data hash/);
  const wrongStage = structuredClone(receipt);wrongStage.qualifierProducer.staticAdapterData[0].stage = 'unqualified-data';
  assert.throws(() => assertClosedQuestionInputAuthority(wrongStage,source,{inputPath:reportPath,inputSha256:reportSha}), /static report-data role/);
  const duplicate = structuredClone(receipt);duplicate.qualifierProducer.staticAdapterData.push({...duplicate.qualifierProducer.staticAdapterData[0]});
  assert.throws(() => assertClosedQuestionInputAuthority(duplicate,source,{inputPath:reportPath,inputSha256:reportSha}), /one exact report-data authority/);
  const conflicting = structuredClone(receipt);conflicting.qualifierProducer.staticAdapterData.find(row => row.path === bodyPath).sha256 = reportSha;
  assert.throws(() => assertClosedQuestionInputAuthority(conflicting,source,{inputPath:bodyPath,inputSha256:bodySha}), /exact M report-data hash/);
  const sizeConflict = structuredClone(receipt);sizeConflict.qualifierProducer.staticAdapterData.find(row => row.path === bodyPath).sizeBytes = 11;
  assert.throws(() => assertClosedQuestionInputAuthority(sizeConflict,source,{inputPath:bodyPath,inputSha256:bodySha}), /agree on size/);
  const sourceOnly = structuredClone(receipt);sourceOnly.qualifierProducer.staticAdapterData = sourceOnly.qualifierProducer.staticAdapterData.filter(row => row.path !== bodyPath);
  assert.throws(() => assertClosedQuestionInputAuthority(sourceOnly,source,{inputPath:bodyPath,inputSha256:bodySha}), /closed qualified input authority/);
  const duplicateBody = structuredClone(receipt);duplicateBody.sourceEpoch.sourceBody.inputs.push({...duplicateBody.sourceEpoch.sourceBody.inputs[0]});
  assert.throws(() => assertClosedQuestionInputAuthority(duplicateBody,source,{inputPath:bodyPath,inputSha256:bodySha}), /one exact Source2 authority/);
});


test('each actual dual-role question input retains its mandatory M-sealed static-adapter pin', () => {
  const contract = readJson(paths.monetaryQuestionContract);
  const dualRolePaths=['research/price-source-inventory-ua-other.json','research/price-source-inventory-monster-books.json'];
  const targets=dualRolePaths.map(inputPath=>contract.targetSemanticContract.targets.find(row=>row.inputPath===inputPath));
  const source=new Map(targets.map(target=>[target.inputPath,target.inputSha256]));
  const receipt={sourceEpoch:{sourceBody:{stage:'source2-body-native',inputs:targets.map(target=>({path:target.inputPath,sha256:target.inputSha256,sizeBytes:64}))}},qualifierProducer:{stage:'Native2 report QCC M',staticAdapterData:targets.map(target=>({path:target.inputPath,sha256:target.inputSha256,sizeBytes:64,stage:'Native2-static-report-data'}))}};
  for (const [index,inputPath] of dualRolePaths.entries()) {
    const target = targets[index];
    assert.ok(target);
    assert.equal(source.get(inputPath), target.inputSha256);
    assert.doesNotThrow(() => assertClosedQuestionInputAuthority(receipt,source,target));
    const missingStatic = structuredClone(receipt);
    missingStatic.qualifierProducer.staticAdapterData = missingStatic.qualifierProducer.staticAdapterData.filter(row => row.path !== inputPath);
    assert.throws(() => assertClosedQuestionInputAuthority(missingStatic,source,target), /closed qualified input authority/);
  }
});
