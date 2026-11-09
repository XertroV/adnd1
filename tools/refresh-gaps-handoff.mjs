import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, renameSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateLedger, dataHash as mechanicsDataHash} from './mechanics-audit.mjs';
import {validatePriceSourceInventory} from './price-source-inventory.mjs';
import {buildCoverageGaps} from './coverage-gaps.mjs';
import {loadMonetaryRowIdentityAudit} from './monetary-row-identity-audit.mjs';
import {loadJoUnextractedPriceRegistration} from './jo-unextracted-price-registration.mjs';
import {fieldBindingAxisMetrics, fieldBindingCountMeaning, historicalProducerMetadata, sourceIntegrationDescriptor, currentUncheckedExclusions, uncheckedExclusionTemplate} from './source-report-consistency-audit.mjs';
import {loadCurrentMonetarySourceQuestions,validateCurrentMonetarySourceQuestionProjection} from './monetary-current-source-questions.mjs';
import {loadUaSourceHandoffTransition,uaSourceHandoffContextMatches,isQualifiedUaSourceHistoricalChange,uaSourceHistoricalCaution,uaSourceHandoffTransitionPath,uaSourceHandoffTransitionSha256} from './ua-source-handoff-transition.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require=createRequire(import.meta.url);
const sourceBooks=require('../dist/books.js');
const BASELINE_COMMIT = '679b15d1c580172e54314829c1c3c86dc78b65f3';
const HANDOFF_PATH = 'research/gaps-limitations-next-task.json';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const parsedHash = value => sha256(Buffer.from(JSON.stringify(value)));
const clone = value => JSON.parse(JSON.stringify(value));
const fail = message => { throw new Error(`Cannot refresh gaps handoff: ${message}`); };

function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function handoffTemplateSnapshot(handoff) {
  const scope = clone(handoff.scope || {}); delete scope.currentExposedRecords;
  const queue = handoff.reviewQueuesNotSourceAbsences || {};
  const staticQueues = Object.fromEntries(Object.entries(queue).filter(([key]) => !['classPrecisionProposals', 'fieldBindingAndHistoricalScopeQueues', 'sourceTableCitationReview', 'rowNormalizedMonetaryReview'].includes(key)));
  const offerNuance = (handoff.equipmentOffers?.rowReviewStateNuance || []).map(({effect, ...row}) => row);
  const contrast = handoff.equipmentOffers?.contrastingExistingSlingBulletPrice;
  return clone({
    schemaVersion: handoff.schemaVersion, artifactType: handoff.artifactType, title: handoff.title, state: handoff.state,
    scope, classificationRules: handoff.classificationRules, missingReferencedContent: handoff.missingReferencedContent,
    sourcePriceDiscoveryCensuses: handoff.sourcePriceDiscoveryCensuses,
    otherDocumentedOpenQuestions: handoff.otherDocumentedOpenQuestions, excludedFromGapCount: uncheckedExclusionTemplate(handoff.excludedFromGapCount),
    primaryEvidencePaths: handoff.primaryEvidencePaths, staticQueues,
    classPrecisionProposalPath: queue.classPrecisionProposals?.path,
    historicalOfferReviewGrades: offerNuance,
    contrastingExistingOffer: contrast ? {collection: contrast.collection, itemId: contrast.itemId, fieldPointer: contrast.fieldPointer, sourceRowId: contrast.sourceRowId, note: contrast.note} : null,
    nullPriceTemplateItemIds: (handoff.currentSitePriceGaps?.records || []).map(record => record.itemId),
    namedOfferTemplateIds: (handoff.equipmentOffers?.records || []).map(record => record.sourceRowId),
  });
}
function pointer(rootValue, path) {
  if (path === '' || path === '/') return {found: true, value: rootValue};
  if (typeof path !== 'string' || !path.startsWith('/')) return {found: false};
  let value = rootValue;
  for (const part of path.slice(1).split('/').map(token => token.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return {found: false};
    value = value[part];
  }
  return {found: true, value};
}
function itemFor(data, collection, itemId) {
  if (collection === 'progressionExplainer') return data.progressionExplainer || null;
  return data[collection]?.find(item => item.id === itemId) || null;
}
function exposedRecordCount(data) {
  return ['rules', 'spells', 'classes', 'equipment', 'matrices'].reduce((n, key) => n + (data[key]?.length || 0), data.progressionExplainer ? 1 : 0);
}
function parseJson(bytes, path) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { fail(`${path} is not valid JSON`); }
}
function containsXpKey(value) {
  if (Array.isArray(value)) return value.some(containsXpKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => /^(xp|experience(?:Points)?)$/i.test(key) || containsXpKey(child));
}

function historicalInputs(repoRoot) {
  const get = path => {
    try { return execFileSync('git', ['show', `${BASELINE_COMMIT}:${path}`], {cwd: repoRoot, maxBuffer: 32 * 1024 * 1024}); }
    catch { fail(`cannot read historical input ${BASELINE_COMMIT}:${path}`); }
  };
  const dataBytes = get('dist/data.json');
  const handoffBytes = get(HANDOFF_PATH);
  const data = parseJson(dataBytes, `${BASELINE_COMMIT}:dist/data.json`);
  const handoff = parseJson(handoffBytes, `${BASELINE_COMMIT}:${HANDOFF_PATH}`);
  if (sha256(dataBytes) !== handoff.snapshot?.rawDistDataFileSha256 || parsedHash(data) !== handoff.snapshot?.parsedDataSha256) {
    fail('the actual 679b15d historical data does not match its frozen handoff snapshot');
  }
  const notes = handoff.mechanicsAudit?.specificReviewNoteCandidates?.notes;
  if (!Array.isArray(notes) || notes.length !== 78) fail('the immutable 679b15d curated caution baseline is not 78 notes');
  return {data, handoff, hashes: {
    [`git:${BASELINE_COMMIT}:dist/data.json`]: sha256(dataBytes),
    [`git:${BASELINE_COMMIT}:${HANDOFF_PATH}`]: sha256(handoffBytes),
  }};
}

function reviewCandidates(mechanics, collection, itemId) {
  const rows = [];
  (mechanics.reviewRecords || []).forEach((record, index) => {
    if (record.collection !== collection || record.id !== itemId) return;
    for (const unresolved of record.unresolved || []) rows.push({record, index, unresolved});
  });
  return rows;
}
function candidateMatchesNote(candidate, note) {
  const unresolved = candidate.unresolved;
  if (typeof unresolved === 'string') return unresolved === note.reason;
  if (!unresolved || typeof unresolved !== 'object' || unresolved.reason !== note.reason) return false;
  return note.fieldPointer == null || unresolved.path === note.fieldPointer;
}
function normalizedActiveNote(note, candidate) {
  const value = candidate.unresolved;
  return {
    ...clone(note),
    ...(typeof value === 'object' && value?.path ? {fieldPointer: value.path} : {}),
    reason: typeof value === 'string' ? value : value.reason,
    checkers: [candidate.record.checker],
    sourceReferences: clone(candidate.record.sources || []),
    reviewRecordIndexes: [candidate.index],
  };
}
function exactDataTransition({change, baselineData, currentData}) {
  const oldItem = itemFor(baselineData, change.collection, change.itemId);
  const currentItem = itemFor(currentData, change.collection, change.itemId);
  if (!oldItem || !currentItem) return false;
  const oldValue = pointer(oldItem, change.pointer);
  const currentValue = pointer(currentItem, change.pointer);
  const oldMatches = oldValue.found ? same(oldValue.value, change.oldValue) : change.oldValue === null;
  return oldMatches && currentValue.found && same(currentValue.value, change.newValue);
}

export function validateApprovedTransitions({baselineData, currentData, conflictReceipt, animalReceipt, classRetirementReceipt, sourceBodyTransition = null}) {
  if(sourceBodyTransition&&!uaSourceHandoffContextMatches(sourceBodyTransition,{baselineData,currentData,conflictReceipt}))fail('UA source-body transition qualification does not match exact current and historical inputs');
  const validated = [];
  for (const change of conflictReceipt.changes || []) {
    const current=exactDataTransition({change, baselineData, currentData});
    const qualifiedHistorical=!current&&sourceBodyTransition&&isQualifiedUaSourceHistoricalChange(sourceBodyTransition,change);
    if (!current&&!qualifiedHistorical) fail(`conflict receipt no longer exactly matches historical/current data: ${change.collection}/${change.itemId}${change.pointer}`);
    validated.push(qualifiedHistorical?{kind:'historical-source-body-transition-qualified',collection:change.collection,itemId:change.itemId,pointer:change.pointer,currentFieldStatus:'unchecked',sourceValueGrade:'NOT PROMOTED',receipt:{path:uaSourceHandoffTransitionPath,sha256:uaSourceHandoffTransitionSha256}}:{kind: 'conflict-integration', collection: change.collection, itemId: change.itemId, pointer: change.pointer, reason: change.reason});
  }
  const animal = (animalReceipt.fieldReviews || []).find(record => record.collection === 'spells' && record.itemId === 'phb-magic-user-animal-growth' && record.fieldPointer === '/exceptions/2');
  if (!animal || itemFor(currentData, 'spells', 'phb-magic-user-animal-growth')?.exceptions?.[2] !== animal.valueAfter) fail('Animal Growth source-note transition is not the exact reviewed receipt value');
  const retired = classRetirementReceipt;
  if (retired?.itemId !== 'assassin' || retired.retiredPointer !== '/levelChanges/50' || !retired.supersededEvidence?.some(record => record.checkedValues?.['/levelChanges/50/level'] === 17)) fail('Assassin retirement receipt is missing its superseded source-checked event');
  const baselineAssassin = itemFor(baselineData, 'classes', 'assassin'), currentAssassin = itemFor(currentData, 'classes', 'assassin');
  const historicalEvent = pointer(baselineAssassin, '/levelChanges/50');
  const currentEvent = pointer(currentAssassin, '/levelChanges/50');
  if (historicalEvent.value?.level !== 17 || currentEvent.found || currentAssassin?.levelChanges?.some(event => event.level === 17) || currentAssassin?.maxLevel != null || currentAssassin?.levelLimit != null) fail('Assassin level-17 retirement must remove only the unsupported event and leave maximum-level scope unstated');
  validated.push({kind: 'unextracted-source-review', collection: 'spells', itemId: animal.itemId, pointer: animal.fieldPointer, value: animal.valueAfter});
  return validated;
}

function exactReplacement({note, baselineData, currentData, mechanics, changes}) {
  const itemChanges = changes.filter(change => change.collection === note.collection && change.itemId === note.itemId);
  const candidates = reviewCandidates(mechanics, note.collection, note.itemId);
  for (const change of itemChanges) {
    const notePathRelated = note.fieldPointer == null || change.pointer === note.fieldPointer || change.pointer.startsWith(`${note.fieldPointer}/`) || note.fieldPointer.startsWith(`${change.pointer}/`);
    if (!notePathRelated || !exactDataTransition({change, baselineData, currentData})) continue;
    const currentMatch = candidates.find(candidate => typeof candidate.unresolved === 'object' && candidate.unresolved.path === change.pointer);
    if (currentMatch) return {active: {...normalizedActiveNote(note, currentMatch), transitionReceipt: {path: 'research/source-audit-batch5-conflict-integration.json', pointer: `/changes/${(changes || []).indexOf(change)}`}}, change};
    const stillSameScope = candidates.find(candidate => note.fieldPointer != null && typeof candidate.unresolved === 'object' && candidate.unresolved.path === note.fieldPointer);
    if (stillSameScope) return {active: {...normalizedActiveNote(note, stillSameScope), transitionReceipt: {path: 'research/source-audit-batch5-conflict-integration.json', pointer: `/changes/${(changes || []).indexOf(change)}`}}, change};
    return {history: {
      ...clone(note), disposition: 'resolved-by-reviewed-source-transition',
      receipt: 'research/source-audit-batch5-conflict-integration.json',
      receiptPointer: `/changes/${(changes || []).indexOf(change)}`,
      reason: 'The exact reviewed source transition removed or replaced the prior caution; the current ledger has no matching unresolved candidate.',
    }};
  }
  return null;
}

export function reconcileCuratedNotes({curatedNotes, currentHandoff, baselineData, currentData, mechanics, conflictReceipt, conflictReceiptSha256, classRetirementReceipt, classRetirementReceiptSha256, animalReceipt, animalReceiptSha256, sourceBodyTransition = null}) {
  if(sourceBodyTransition&&!uaSourceHandoffContextMatches(sourceBodyTransition,{baselineData,currentData,conflictReceipt}))fail('UA source-body caution qualification does not match exact current and historical inputs');
  if (!Array.isArray(curatedNotes) || curatedNotes.length !== 78) fail('curated note set must contain exactly 78 historical candidates');
  const active = [], history = [], usedCurrent = new Set(), knownChanges = conflictReceipt.changes || [];
  for (const [baselineIndex, note] of curatedNotes.entries()) {
    const candidates = reviewCandidates(mechanics, note.collection, note.itemId);
    const exact = candidates.find(candidate => candidateMatchesNote(candidate, note));
    if (exact) {
      const activeNote = normalizedActiveNote(note, exact);
      active.push(activeNote); usedCurrent.add(`${activeNote.collection}:${activeNote.itemId}:${activeNote.fieldPointer}:${activeNote.reason}`);
      continue;
    }
    const replacement = exactReplacement({note, baselineData, currentData, mechanics, changes: knownChanges});
    if (replacement?.active) {
      replacement.active.transitionReceipt.sha256 = conflictReceiptSha256;
      active.push(replacement.active); usedCurrent.add(`${replacement.active.collection}:${replacement.active.itemId}:${replacement.active.fieldPointer}:${replacement.active.reason}`);
      continue;
    }
    if (replacement?.history) {
      replacement.history.baselineIndex = baselineIndex;
      replacement.history.receiptSha256 = conflictReceiptSha256;
      history.push(replacement.history);
      continue;
    }
    const qualifiedHistory=sourceBodyTransition?uaSourceHistoricalCaution(sourceBodyTransition,note,baselineIndex):null;
    if(qualifiedHistory){history.push(qualifiedHistory);continue;}
    if (note.collection === 'classes' && note.itemId === 'assassin' && (note.fieldPointer || '').startsWith('/levelChanges/50')) {
      history.push({...clone(note), baselineIndex, disposition: 'retired-unsupported-class-event', receipt: 'research/source-audit-batch5-class-retired-ledger.json', receiptSha256: classRetirementReceiptSha256});
      continue;
    }
    fail(`unreceipted caution transition requires review: ${note.collection}/${note.itemId}${note.fieldPointer || ''}`);
  }
  // The corrected Animal Growth wording is a new current caution derived from its exact source-review receipt.
  const animalReview = (animalReceipt.fieldReviews || []).find(record => record.collection === 'spells' && record.itemId === 'phb-magic-user-animal-growth' && record.fieldPointer === '/exceptions/2');
  const animalItem = itemFor(currentData, 'spells', 'phb-magic-user-animal-growth');
  const animalCandidate = reviewCandidates(mechanics, 'spells', 'phb-magic-user-animal-growth').find(candidate => typeof candidate.unresolved === 'object' && candidate.unresolved.path === '/exceptions');
  if (!animalReview || animalReview.valueAfter !== animalItem?.exceptions?.[2] || !animalCandidate) fail('Animal Growth must retain its current caution after the exact reviewed wording change');
  const animalKey = `spells:phb-magic-user-animal-growth:/exceptions:${animalCandidate.unresolved.reason}`;
  if (!usedCurrent.has(animalKey)) {
    active.push({collection: 'spells', itemId: animalReview.itemId, fieldPointer: animalCandidate.unresolved.path, annotationType: 'field-note', reason: animalCandidate.unresolved.reason, checkers: [animalCandidate.record.checker], sourceReferences: clone(animalCandidate.record.sources || animalReview.sourceReferences || []), reviewRecordIndexes: [animalCandidate.index], transitionReceipt: {path: 'research/source-audit-batch5-unextracted.json', sha256: animalReceiptSha256, pointer: '/fieldReviews'}});
  }
  active.sort((a, b) => `${a.collection}:${a.itemId}:${a.fieldPointer || ''}:${a.reason}`.localeCompare(`${b.collection}:${b.itemId}:${b.fieldPointer || ''}:${b.reason}`));
  history.sort((a, b) => (a.baselineIndex ?? 999) - (b.baselineIndex ?? 999));
  const byCollection = Object.fromEntries([...new Set(active.map(note => note.collection))].sort().map(collection => [collection, active.filter(note => note.collection === collection).length]));
  return {active, history, curatedBaselineDenominator: 78, denominator: active.length, byCollection, method: 'Curated 679b15d cautions are carried only through exact current ledger matches or exact reviewed transitions. Resolved/stale records remain in history; newly reviewed cautions are added only from their named receipt.'};
}

function formalIssues(data, mechanics) {
  const output = {notExtracted: [], sourceConflict: []};
  for (const record of mechanics.records || []) for (const field of record.fields || []) {
    if (!['not-extracted', 'source-conflict'].includes(field.status)) continue;
    const actual = pointer(itemFor(data, record.collection, record.id), field.path);
    const absentPrice = field.status === 'not-extracted' && record.collection === 'equipment' && field.path === '/price' && !actual.found && field.value == null;
    if (!absentPrice && (!actual.found || !same(actual.value, field.value))) fail(`formal ledger field differs from current data: ${record.collection}/${record.id}${field.path}`);
    const key = field.status === 'not-extracted' ? 'notExtracted' : 'sourceConflict';
    output[key].push({collection: record.collection, itemId: record.id, fieldPointer: field.path, status: field.status, value: field.value, checkers: field.checkers || [], sourceReferences: record.sources || []});
  }
  return output;
}

function sourcePriceGaps({data, inventory, receipt, existing, joAddition}) {
  const byId = new Map((receipt.records || []).map(record => [record.itemId, record]));
  const claims = inventory.siteClaims.filter(claim => claim.missingPrice);
  if (byId.size !== 4 || claims.length !== byId.size + 1 || !joAddition) fail('canonical inventory must preserve the historical four gaps plus the registered unextracted Jo field');
  const oldById = new Map((existing.records || []).map(record => [record.itemId, record]));
  return claims.map(claim => {
    if(claim.itemId===joAddition.itemId)return {collection:'equipment',itemId:joAddition.itemId,name:joAddition.name,fieldPointer:'/price',claimType:'unextracted-price',priceState:'unextracted',reviewStatus:'unextracted-gap',priceNote:joAddition.priceNote,estimate:null,sourceRowIds:[...(claim.sourceRowIds||[])],registration:joAddition.registryRef,sourceAbsenceReviewed:false};
    const sourceReview = byId.get(claim.itemId), item = itemFor(data, 'equipment', claim.itemId);
    if (!item || item.price != null || !sourceReview || item.priceNote !== sourceReview.currentValue || claim.priceNote !== item.priceNote) fail(`null-price receipt does not match current item/inventory: ${claim.itemId}`);
    const old = oldById.get(claim.itemId);
    if (!old) fail(`no prior handoff slot for null-price estimate: ${claim.itemId}`);
    const estimate = item.suggestedPrice ? {fieldPointer: '/suggestedPrice', classification: 'editorial-estimate', value: clone(item.suggestedPrice)} : null;
    return {...clone(old), collection: 'equipment', name: item.name, fieldPointer: '/price', claimType: 'unextracted-price', priceState: 'unextracted', reviewStatus: 'unextracted-gap', priceNote: item.priceNote, ...(estimate ? {estimate} : {estimate: null}), sourceRowIds: [...(claim.sourceRowIds || [])]};
  });
}

export function validateNullPriceTransitions({baselineData, currentData, receipt}) {
  for (const record of receipt.records || []) {
    const oldItem = itemFor(baselineData, 'equipment', record.itemId), currentItem = itemFor(currentData, 'equipment', record.itemId);
    if (!oldItem || !currentItem) fail(`null-price transition item is missing: ${record.itemId}`);
    for (const evidence of record.supersededEvidence || []) {
      const change = evidence.change;
      if (change?.path !== '/priceNote') fail(`null-price note lacks exact prior-value evidence: ${record.itemId}`);
      const oldValue = pointer(oldItem, change.path), currentValue = pointer(currentItem, change.path);
      // The 679 checkpoint already contains the prior review's new value.
      // This receipt preserves that review and separately names its successor.
      const oldMatches = oldValue.found && same(oldValue.value, change.newValue);
      if (!oldMatches || !currentValue.found || !same(currentValue.value, record.currentValue)) fail(`null-price transition receipt does not match historical/current data: ${record.itemId}${change.path}`);
    }
    if (oldItem.price !== null || currentItem.price !== null || currentItem.priceNote !== record.currentValue) fail(`current null-price note differs from its source receipt: ${record.itemId}`);
  }
}

function offerHandoff({data, reconciliation, reconciliationSha256, existing, readJson, hashFile}) {
  const oldById = new Map(existing.records.map(record => [record.sourceRowId, record]));
  const records = reconciliation.records.map((row, index) => {
    const sourceBytes = readJson(row.sourceInventoryFile);
    const sourceInventory = sourceBytes.json;
    if (sourceBytes.sha256 !== row.sourceInventorySha256) fail(`source row inventory hash is stale: ${row.sourceInventoryFile}`);
    const sourceRows = sourceInventory.records || sourceInventory.sourceRows || [];
    const sourceRow = sourceRows[row.sourceRecordIndex];
    if (!sourceRow || sourceRow.sourceObject !== row.sourceObject) fail(`source row identity is stale: ${row.sourceRowId}`);
    const sourcePrice = sourceRow.price;
    if (sourcePrice && (sourcePrice.amount !== row.price.amount || sourcePrice.currency !== row.price.currency || (sourcePrice.unit ?? null) !== (row.price.unit ?? null))) fail(`source row printed amount/unit differs from reconciliation: ${row.sourceRowId}`);
    const old = oldById.get(row.sourceRowId);
    if (!old) fail(`source offer has no historical handoff row: ${row.sourceRowId}`);
    const offer = {...clone(old), sourceInventoryFile: row.sourceInventoryFile, sourceInventorySha256: row.sourceInventorySha256, sourceRecordIndex: row.sourceRecordIndex, sourceRowId: row.sourceRowId, sourceObject: row.sourceObject, price: clone(row.price), source: clone(row.source), disposition: row.disposition, itemId: row.itemId ?? null, fieldPointer: row.fieldPointer ?? null, note: row.note, canonicalItemPriceBinding: row.canonicalItemPriceBinding === true};
    if (row.currentMappingReview) offer.currentMappingReview = clone(row.currentMappingReview); else delete offer.currentMappingReview;
    if (row.sourceRowId === 'phb35-equipment-purchase-056') {
      const item = itemFor(data, 'equipment', row.itemId);
      if (row.disposition !== 'extracted-canonical-offer' || !item?.price || item.price.amount !== 15 || item.price.currency !== 'sp' || item.price.unit !== 'dozen') fail('Sling & Bullets dozen must remain its independently reviewed canonical offer');
      if (!row.currentMappingReview) fail('Sling & Bullets dozen current mapping review is missing');
    }
    if (row.sourceRowId === 'ua26-equipment-supplies-011') {
      const item = itemFor(data, 'equipment', row.itemId);
      if (row.disposition !== 'extracted-quantity-unspecified-offer' || !item?.price || item.price.amount !== 100 || item.price.currency !== 'gp' || item.price.unit != null || row.price.unit != null) fail('Quarrels offer quantity must remain unknown');
      if (!row.currentMappingReview) fail('Quarrels current mapping review is missing');
    }
    const review = row.currentMappingReview;
    if (review) {
      const reviewBytes = hashFile(review.path); if (reviewBytes !== review.sha256) fail(`offer mapping receipt hash is stale: ${review.path}`);
      const reviewed = parseJson(readFileSync(resolve(root, review.path)), review.path).records?.[review.recordIndex];
      if (!reviewed || reviewed.independent !== true || reviewed.verdict !== 'confirmed' || reviewed.sourceRowId !== row.sourceRowId || reviewed.itemId !== row.itemId) fail(`offer mapping receipt identity is stale: ${row.sourceRowId}`);
      const currentItem = itemFor(data, 'equipment', row.itemId);
      const actual = {amount: currentItem?.price?.amount, currency: currentItem?.price?.currency, unit: currentItem?.price?.unit ?? null};
      if (!same(actual, reviewed.expectedPrice) || reviewed.sourceSha256 !== row.source.sourceSha256) fail(`offer mapping receipt value/source differs: ${row.sourceRowId}`);
    }
    if (row.sourceRowId === 'phb35-equipment-purchase-016' && row.disposition !== 'extracted-separate-field') fail('Arrow dozen must remain a separate extracted field');
    if (row.sourceRowId !== 'phb35-equipment-purchase-016' && row.sourceRowId !== 'phb35-equipment-purchase-056' && row.sourceRowId !== 'ua26-equipment-supplies-011') fail(`unexpected named offer row ${row.sourceRowId}`);
    return offer;
  });
  const rowReviewStateNuance = clone(existing.rowReviewStateNuance);
  const sling = rowReviewStateNuance.find(row => row.sourceRowId === 'phb35-equipment-purchase-056');
  const quarrels = rowReviewStateNuance.find(row => row.sourceRowId === 'ua26-equipment-supplies-011');
  if (sling) sling.effect = 'The 15 sp dozen offer is now separately extracted; the existing sling-bullet price remains 10 sp per score. The older source-inventory grade remains stale.';
  if (quarrels) quarrels.effect = 'The 100 gp offer is separately extracted; the source table states no quantity. Preserve the unknown quantity and do not infer per-bolt price.';
  const slingBullet = itemFor(data, 'equipment', 'phb-sling-bullet');
  const contrasting = {...clone(existing.contrastingExistingSlingBulletPrice), price: clone(slingBullet.price)};
  const denom = reconciliation.denominator;
  if (denom.namedSourceOffers !== denom.canonicalEquipmentPrices + denom.additionalExtractedOfferFields || denom.unrepresentedOffers !== 0 || denom.representedOffersWithUnresolvedQuantity !== 1) fail('source offer denominator does not preserve current canonical/unknown-quantity distinctions');
  return {...clone(existing), sourceFile: 'research/equipment-source-offer-reconciliation.json', sourceFileSha256: reconciliationSha256, denominator: clone(denom), records, rowReviewStateNuance, contrastingExistingSlingBulletPrice: contrasting, interpretation: 'Sling & Bullets, dozen is a separately extracted canonical package. Quarrels for same is separately extracted at 100 gp with quantity unknown; no per-bolt price is inferred. Arrow dozen remains a separate field.'};
}

export function validateSupplementalMonetaryReport({path, json, bytes, repoRoot = root, hashes = {}}) {
  hashes[path] = sha256(bytes);
  const report = json;
  if (report.artifactType === 'ua-additional-prices-row-normalized-audit') {
    const censusPath = report.scope?.inventoryArtifact;
    if (!censusPath || sha256(readFileSync(resolve(repoRoot, censusPath))) !== report.scope.inventorySha256 || report.source?.sha256 !== report.baseline?.source?.sha256 || report.inputCommit !== report.baseline?.inputCommit || report.baseline?.inputHashesSha256?.[censusPath] !== report.scope.inventorySha256) fail(`${path} baseline source identity/census hash is invalid`);
    hashes[censusPath] = report.scope.inventorySha256;
    hashes[`${path}#authorized-source`] = report.source.sha256;
    if (!Array.isArray(report.groupReviews) || !Array.isArray(report.rowRecords) || report.aggregate?.groupCount !== report.groupReviews.length || report.aggregate?.rowRecordCount !== report.rowRecords.length || report.aggregate?.rowRecordCount !== report.aggregate.sourceRowDenominator) fail(`${path} row-normalized denominators do not validate`);
    if (report.aggregate?.structuredValueCellCount !== report.aggregate?.structuredGpMonetaryCellCount + report.aggregate?.xpReferenceValueCellCount) fail(`${path} XP and money cell totals must remain separately reconciled`);
    const a = report.aggregate;
    return {path, sha256: hashes[path], source: report.source.fileName, sourceSha256: report.source.sha256, sourceCensusPath: censusPath, sourceCensusSha256: report.scope.inventorySha256, groups: a.groupCount, rows: a.rowRecordCount, monetaryCells: a.structuredGpMonetaryCellCount, xpReferenceCells: a.xpReferenceValueCellCount, upstreamIndependentOverlayReviewPending: a.independentOverlayReviewNeeded === true, upstreamReviewStatus: report.status ?? null, status: 'bounded-source-transcription'};
  }
  if (report.artifactType === 'source-audit-batch5-phb-dmg-additional-prices') {
    const base = report.baseline;
    if (!base?.censusFile || sha256(readFileSync(resolve(repoRoot, base.censusFile))) !== base.censusFileSha256) fail(`${path} captured PHB/DMG census identity is stale`);
    hashes[base.censusFile] = base.censusFileSha256;
    const historicalInventory = execFileSync('git', ['show', `${base.inputCommit}:${base.priceInventoryFile}`], {cwd: repoRoot, maxBuffer: 32 * 1024 * 1024});
    if (sha256(historicalInventory) !== base.priceInventoryFileSha256) fail(`${path} captured canonical inventory baseline hash is invalid`);
    hashes[`git:${base.inputCommit}:${base.priceInventoryFile}`] = sha256(historicalInventory);
    const groups = report.review?.groups, records = report.review?.sourceRowsOrClaims, d = report.review?.denominators;
    if (!Array.isArray(groups) || groups.length !== 18 || !Array.isArray(records) || records.length !== d?.sourceMonetaryRowsOrClaimsStructurallyRecorded || d.groupsWithTypedOutput !== 18 || d.groupsStillUnreviewed !== 0) fail(`${path} PHB/DMG typed extraction denominators are incomplete or schema changed`);
    const xpCount = records.filter(row => containsXpKey(row.typedValue)).length;
    for (const source of Object.values(base.sources || {})) if (source.sourceHashMatches === false || source.sourceFileSha256 !== source.censusDeclaredSourceSha256) fail(`${path} contains an unverified PHB/DMG source identity`);
    for (const [book, source] of Object.entries(base.sources || {})) hashes[`${path}#authorized-source-${book}`] = source.sourceFileSha256;
    const refRows = report.additionalReferenceSheetReview?.denominators;
    if (!refRows || refRows.p123EquipmentPurchaseRows !== refRows.p35EquivalentRows + refRows.p36EquivalentRows || refRows.valueAndCurrencyMatches + refRows.numericAmountOrCurrencyDiscrepancies !== refRows.p123EquipmentPurchaseRows) fail(`${path} additional PHB equipment reference-row comparison denominator is incomplete`);
    return {path, sha256: hashes[path], source: 'PHB and DMG authorized source PDFs', sourceIdentities: Object.fromEntries(Object.entries(base.sources).map(([book, source]) => [book, source.sourceFileSha256])), sourceCensusPath: base.censusFile, sourceCensusSha256: base.censusFileSha256, groups: groups.length, rows: records.length, monetaryRowsOrClaims: d.sourceMonetaryRowsOrClaimsStructurallyRecorded, monetaryCountUnit: 'structured source-monetary rows or claims; not amount cells', xpReferenceRows: xpCount, tableRowsOrOutcomesReviewed: d.tableRowsOrOutcomesReviewed, referencePriceRows: refRows.p123EquipmentPurchaseRows, referencePriceMatches: refRows.valueAndCurrencyMatches, referencePriceDiscrepancies: refRows.numericAmountOrCurrencyDiscrepancies, additionalQualifierDifferences: refRows.additionalSourceQualifierDifferences, upstreamIndependentOverlayReviewPending: true, upstreamReviewStatus: report.status, status: 'bounded-source-transcription'};
  }
  fail(`${path} has unknown supplemental monetary report schema`);
}


const UA_MEANING_REVIEW_PATH = 'research/source-audit-batch5-ua-context-meaning-independent-review.json';
const UA_MEANING_REVIEW_SHA256 = 'e5f430957786aa0e5d0a5e967df939953bd4aa2bb1c3759f2ca7757f09ac801b';
const currentFindingStatuses = new Set(['explicit-source-reviewed-repair', 'explicit-source-reviewed-qualified-representation', 'explicit-source-reviewed-provenance-repair']);
const countBy = (rows, key) => rows.reduce((counts, row) => (counts[row[key]] = (counts[row[key]] || 0) + 1, counts), {});

export function projectUaMeaningReview({sourceReport, sourceSha256, review, reviewSha256}) {
  if (reviewSha256 !== UA_MEANING_REVIEW_SHA256 || review?.artifactType !== 'independent-ua-note-applicability-review'
      || review.source?.sourcePdfSha256 !== sourceReport.source?.sha256 || !Array.isArray(review.records)) fail('UA context-meaning review identity is stale');
  const rows = new Map((sourceReport.rowRecords || []).map(row => [row.recordId, row]));
  const actualLinks = new Set((sourceReport.rowRecords || []).flatMap(row => (row.evidence?.sourceNoteDefinitionLinks || []).map(link => `${row.recordId}::${link.definitionId}`)));
  const seen = new Set();
  for (const record of review.records) {
    const row = rows.get(record.row?.recordId), note = record.note;
    const link = row?.evidence?.sourceNoteDefinitionLinks?.find(link => link.definitionId === note?.definitionId);
    if (!row || !link || seen.has(record.linkId) || record.linkId !== `${row.recordId}::${note.definitionId}` || !actualLinks.has(record.linkId)
        || !['source-applicable', 'qualified', 'uncertain'].includes(record.disposition)
        || record.row.sourcePdfSha256 !== row.evidence.sourcePdfSha256 || record.row.pageImageSha256 !== row.evidence.pageImageSha256
        || record.row.label !== row.object || record.row.table !== row.sourceRowIdentity.table || record.row.segmentId !== row.evidence.tableSegmentId
        || record.row.printedPage !== row.sourceRowIdentity.printedPage || record.row.pdfPage !== row.sourceRowIdentity.pdfPage
        || !same(record.row.footnoteMarkers, row.footnoteMarkers)
        || !same(record.row.candidateRowAnchorBoundsPdfPagePointsTopLeftLTRB, row.evidence.rowHighlightBounds.pdfPagePoints)
        || note.sourcePdfSha256 !== link.sourcePage?.sourcePdfSha256 || note.sourcePageImageSha256 !== link.sourcePage?.sourcePageImageSha256
        || !same(note.definitionBoundsPdfPagePointsTopLeftLTRB, link.definitionBoundsPdfPagePointsTopLeftLTRB)
        || note.definitionCrop?.sha256 !== link.definitionCrop?.sha256) fail(`UA context-meaning row/definition join is stale: ${record.linkId}`);
    seen.add(record.linkId);
  }
  if (seen.size !== actualLinks.size || review.denominator?.candidateRows !== rows.size || review.denominator?.rowDefinitionLinks !== seen.size
      || !same(countBy(review.records, 'disposition'), review.denominator.dispositions)) fail('UA context-meaning review denominator or dispositions changed');
  const glyphs = review.findings?.unresolvedGlyphAssociations;
  const heldGlyphLinks = review.records.filter(record => record.associationBasisClass === 'explicit-prose-scope; glyph-association-open').map(record => record.linkId).sort();
  const uncertainLinks = review.records.filter(record => record.disposition === 'uncertain').map(record => record.linkId).sort();
  const declaredUncertain = (review.findings?.uncertainApplicability || []).map(record => `${record.recordId}::${record.definitionId}`).sort();
  if (!same(uncertainLinks, declaredUncertain) || !Array.isArray(glyphs) || !same(heldGlyphLinks, glyphs.map(record => `${record.recordId}::${record.definitionId}`).sort())
      || glyphs.some(record => !actualLinks.has(`${record.recordId}::${record.definitionId}`) || record.status !== 'uncertain-source-marker-association')) fail('UA unresolved applicability or glyph holds cannot be waived');
  return {
    reviewPath: UA_MEANING_REVIEW_PATH, reviewSha256, sourceInputSha256: sourceSha256,
    originalReviewedCandidateSha256: review.inputs?.candidate?.sha256, rowDefinitionLinks: seen.size,
    rowsWithDefinitions: new Set(review.records.map(record => record.row.recordId)).size,
    dispositions: countBy(review.records, 'disposition'),
    unresolvedApplicability: (review.findings?.uncertainApplicability || []).map(({recordId, definitionId}) => ({recordId, definitionId})),
    unresolvedGlyphAssociations: glyphs.map(({recordId, definitionId, status}) => ({recordId, definitionId, status})),
    status: 'bounded-note-meaning-review-with-retained-qualifications', semanticPass: false,
    scope: 'Note applicability only; qualified links and unresolved glyph associations remain qualified or unresolved. This does not approve values, focus rectangles, changed crop transport, or general source completeness.',
  };
}

export function projectCurrentMonetaryReview({metadata, audit, reviewManifest, sourceReport, meaningReview = null, meaningReviewSha256 = null, currentSourceQuestions = null}) {
  if (audit?.generatedBy !== 'tools/monetary-row-identity-audit.mjs' || !Array.isArray(audit.records) || !Array.isArray(audit.knownFindings)
      || !Array.isArray(audit.reviewResults) || !Array.isArray(audit.retainedUncertainties) || !Array.isArray(reviewManifest?.reviews)
      || audit.validation?.semanticRowIdentityComplete !== false || audit.validation?.structuralErrors?.length) fail('monetary current review audit is invalid or claims semantic clearance');
  if (audit.retainedUncertainties.some(record => record.semanticPass !== false || !['record-unavailable-needs-source-review', 'record-changed-question-remains-unresolved', 'retained-unresolved-source-question'].includes(record.status))) fail('retained monetary uncertainties cannot be waived');
  const input = audit.inputManifest?.find(input => input.path === metadata.path);
  if (input?.sha256 !== metadata.sha256) fail(`monetary current review input hash/path mismatch: ${metadata.path}`);
  const inputRows = audit.records.filter(row => row.input === metadata.path);
  const sourcePrefix = metadata.sourceIdentities ? '/review/sourceRowsOrClaims/' : metadata.sourceSha256 ? '/rowRecords/' : null;
  const rows = sourcePrefix ? inputRows.filter(row => row.pointer?.startsWith(sourcePrefix) && /^\d+$/.test(row.pointer.slice(sourcePrefix.length))) : inputRows;
  if (rows.length !== metadata.rows || inputRows.some(row => row.inputSha256 !== metadata.sha256) || new Set(inputRows.map(row => row.uid)).size !== inputRows.length
      || sourcePrefix && (new Set(rows.map(row => row.pointer)).size !== metadata.rows || rows.some(row => Number(row.pointer.slice(sourcePrefix.length)) >= metadata.rows))) fail(`monetary current review row denominator/hash mismatch: ${metadata.path}`);
  const uids = new Set(inputRows.map(row => row.uid));
  if (audit.reviewResults.length !== reviewManifest.reviews.length) fail('monetary explicit review denominator mismatch');
  for (const [index, result] of audit.reviewResults.entries()) {
    const review = reviewManifest.reviews[index];
    if (result.index !== index || result.id !== review.id || result.disposition !== review.disposition || !['current-explicit-review', 'stale-or-incomplete-review'].includes(result.status)
        || result.status === 'current-explicit-review' && (review.independent !== true || result.evidenceStatus !== 'hash-matched')) fail('monetary explicit review identity/status mismatch');
  }
  for (const finding of audit.knownFindings) {
    if (!finding.id || !Array.isArray(finding.records) || !finding.records.length || typeof finding.status !== 'string'
        || !(currentFindingStatuses.has(finding.status) || /^(confirmed-|legacy-context-migration-baseline-pending-source-repair$)/.test(finding.status) || /needs-source-review$/.test(finding.status) || finding.status === 'unresolved-source-scope')) fail('unsupported monetary finding status');
    if (currentFindingStatuses.has(finding.status) && !reviewManifest.reviews.some((review, index) => review.supersedes === finding.id
        && audit.reviewResults[index].status === 'current-explicit-review' && ['source-reviewed-repair', 'source-reviewed-qualified-representation'].includes(review.disposition)
        && finding.records.every(ref => review.records?.some(record => record.uid === ref.uid)))) fail(`monetary finding status has no current explicit review: ${finding.id}`);
  }
  const findings = audit.knownFindings.filter(finding => finding.records.some(ref => uids.has(ref.uid)));
  const reviews = audit.reviewResults.filter((result, index) => reviewManifest.reviews[index].records?.some(ref => uids.has(ref.uid)));
  if(currentSourceQuestions)validateCurrentMonetarySourceQuestionProjection(currentSourceQuestions);
  const uncertainties = currentSourceQuestions ? currentSourceQuestions.records.filter(record=>record.currentDisposition==='unresolved-source-question'&&uids.has(record.uid)).map(record=>({...record,status:'retained-unresolved-source-question'})) : audit.retainedUncertainties.filter(record => uids.has(record.uid));
  const questionLabels = {
    'phb-dmg-commodity-adjustment-scope': 'Whether the fur-value adjustment also applies to the listed commodities',
    'phb-dmg-alchemist-discount-scope': 'Whether or how alchemist assistance affects potion monetary costs',
  };
  const underlyingQuestions = items => items.filter(finding => finding.kind === 'unresolved-source-scope').map(finding => ({
    id: finding.id,
    label: questionLabels[finding.id] || 'Source interpretation remains unresolved',
    status: 'unresolved', semanticPass: false,
    extractionRepresentation: finding.status === 'explicit-source-reviewed-qualified-representation' ? 'qualified-representation-recorded' : 'pending',
    affectedAuditUids: [...new Set(finding.records.map(record => record.uid))],
  }));
  const sourceQuestions = underlyingQuestions(findings), globalQuestions = underlyingQuestions(audit.knownFindings);
  const pending = findings.filter(finding => !currentFindingStatuses.has(finding.status));
  const result = {
    sourceInput: {path: metadata.path, sha256: metadata.sha256}, sourceRows: metadata.rows, exactAuditRows: rows.length,
    inputAuditRecords: inputRows.length, auxiliaryInputAuditRecords: inputRows.length - rows.length,
    knownFindings: findings.length, knownFindingStatuses: countBy(findings, 'status'), knownFindingKinds: countBy(findings, 'kind'),
    unresolvedKnownFindingIds: pending.map(finding => finding.id),
    explicitReviews: reviews.length, explicitReviewStatuses: countBy(reviews, 'status'),
    recordsTouchedByCurrentExplicitReview: new Set(reviewManifest.reviews.flatMap((review, index) => audit.reviewResults[index].status === 'current-explicit-review' ? (review.records || []).filter(ref => uids.has(ref.uid)).map(ref => ref.uid) : [])).size,
    retainedUncertainties: uncertainties.map(({id, uid, status}) => ({id, uid, status})),
    underlyingSourceQuestions: sourceQuestions,
    underlyingSourceQuestionRows: new Set(sourceQuestions.flatMap(question => question.affectedAuditUids)).size,
    globalAudit: {knownFindings: audit.knownFindings.length, knownFindingStatuses: countBy(audit.knownFindings, 'status'), retainedUncertainties: currentSourceQuestions?.counts.currentUnresolvedQuestions ?? audit.retainedUncertainties.length, ...(currentSourceQuestions?{legacyRegisteredQuestions:currentSourceQuestions.counts.historicalRegisteredQuestions,derivedAdjudications:currentSourceQuestions.counts.derivedAdjudications,legacyRegisteredQuestionStatuses:countBy(audit.retainedUncertainties,'status'),currentSourceQuestionRegistry:currentSourceQuestions.registry}:{}), retainedUncertaintyStatuses: currentSourceQuestions?countBy(currentSourceQuestions.records.filter(record=>record.currentDisposition==='unresolved-source-question'),'currentDisposition'):countBy(audit.retainedUncertainties, 'status'), underlyingSourceQuestions: globalQuestions.length, underlyingSourceQuestionIds: globalQuestions.map(question => question.id), underlyingSourceQuestionRows: new Set(globalQuestions.flatMap(question => question.affectedAuditUids)).size},
    status: pending.length || reviews.some(review => review.status !== 'current-explicit-review') ? 'current-scoped-review-queue' : 'current-scoped-finding-reviews-recorded',
    semanticPass: false, sourceAbsence: false, generalReviewPending: true, generalSourceReviewStatus: 'pending',
    scope: 'Exact source-input hash and audit-record joins. Finding repairs concern their declared dimensions; records touched by reviews are not a count of fully verified source rows or field highlights.',
  };
  if (metadata.sourceSha256) result.contextMeaning = projectUaMeaningReview({sourceReport, sourceSha256: metadata.sha256, review: meaningReview, reviewSha256: meaningReviewSha256});
  return result;
}

function loadCurrentMonetaryReview({repoRoot, read, hashFile, hashes}) {
  const audit = loadMonetaryRowIdentityAudit({repoRoot});
  const reviewManifest = read('research/monetary-row-identity-reviews.json');
  const findings = read('research/monetary-row-identity-findings.json');
  const bind = ref => { if (!ref) return; assertCurrentFileHash({path: ref.path, expected: ref.sha256, hashFile, label: 'monetary current review'}); hashes[ref.path] = ref.sha256; };
  for (const input of audit.inputManifest) bind(input);
  for (const ref of [findings.baseline, ...(findings.extensions || []), findings.retainedUncertainties, findings.contextMigrationBridge]) bind(ref);
  for (const review of reviewManifest.reviews) { bind(review.evidence); if (review.provenanceArtifact) bind(review.provenanceArtifact); }
  if (audit.contextMigrationBridgeStatus?.snapshot) bind(audit.contextMigrationBridgeStatus.snapshot);
  const meaningReview = read(UA_MEANING_REVIEW_PATH);
  if (hashes[UA_MEANING_REVIEW_PATH] !== UA_MEANING_REVIEW_SHA256) fail('UA context-meaning evidence hash is stale');
  const registrationPath = 'research/source-audit-batch5-current-finding-disposition-registration.json';
  const registration = read(registrationPath);
  bind(registration.migrationBridge);
  bind(registration.authorityAvailability);
  bind({path: 'tools/monetary-row-identity-audit.mjs', sha256: registration.currentCode?.rowToolSha256});
  bind({path: 'tools/monetary-context-extent-contract.mjs', sha256: registration.currentCode?.extentSha256});
  const currentSourceQuestions=loadCurrentMonetarySourceQuestions({repoRoot,audit});
  for(const ref of currentSourceQuestions.inputs)bind(ref);
  return {audit, reviewManifest, meaningReview, meaningReviewSha256: hashes[UA_MEANING_REVIEW_PATH], registration, registrationRef: {path: registrationPath, sha256: hashes[registrationPath]}, currentSourceQuestions};
}

function exposedRecords(data) {
  const records = ['rules', 'spells', 'classes', 'equipment', 'matrices'].flatMap(collection => (data?.[collection] || []).map((item, index) => ({collection, item, index})));
  if (data?.progressionExplainer) records.push({collection: 'progressionExplainer', item: {...data.progressionExplainer, id: data.progressionExplainer.id || 'progression-explainer'}, index: null});
  return records;
}
function localInputPath(path, label) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) {
    fail(`${label} has an unsupported non-local input identity: ${String(path)}`);
  }
  return path;
}
function assertCurrentFileHash({path, expected, hashFile, label}) {
  localInputPath(path, label);
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) fail(`${label} has no SHA-256 for ${path}`);
  let actual;
  try { actual = hashFile(path); }
  catch (error) { fail(`${label} input unavailable at ${path}: ${error.message}`); }
  if (actual !== expected) fail(`${label} dependency is stale at ${path}`);
}
function assertHashMapCurrent({inputHashes, requiredPaths = [], hashFile, label}) {
  if (!inputHashes || typeof inputHashes !== 'object' || Array.isArray(inputHashes)) fail(`${label} has no supported input-hash map`);
  for (const path of requiredPaths) if (!Object.hasOwn(inputHashes, path)) fail(`${label} input-hash map omits required local input ${path}`);
  for (const [path, expected] of Object.entries(inputHashes)) assertCurrentFileHash({path, expected, hashFile, label});
}
function reportRecords(data) {
  return exposedRecords(data).map(({collection, item, index}) => ({collection, item, index, ownerKey: `${collection}:${item.id || 'progression-explainer'}`}));
}
function validateSystemicDependencies({report, data, dataHash, rawDataHash, hashFile}) {
  const input = report.input;
  if (!input || input.path !== 'dist/data.json' || input.sha256 !== dataHash || input.rawFileSha256 !== rawDataHash) fail('systemic report is stale for current data');
  assertCurrentFileHash({path: input.path, expected: rawDataHash, hashFile, label: 'systemic report'});

  // These are the three explicit local companion reports consumed by this schema.
  // Their embedded baseline commits/source hashes are historical identities, not local file inputs.
  if (!Array.isArray(report.companionInventories) || report.companionInventories.length === 0) fail('systemic report lacks its companion inventory input list');
  const expectedCompanions = ['research/citation-binding-scope-audit.json', 'research/equipment-price-context-baseline.json', 'research/citation-navigation-coverage.json'];
  if (report.companionInventories.length !== expectedCompanions.length || !same([...report.companionInventories.map(entry => entry.path)].sort(), [...expectedCompanions].sort())) fail('systemic report companion inventory schema changed');
  for (const entry of report.companionInventories) {
    if (!entry || entry.available === false || !entry.path || !entry.sha256) fail('systemic report contains an unavailable companion inventory');
    assertCurrentFileHash({path: entry.path, expected: entry.sha256, hashFile, label: 'systemic report'});
  }

  const usages = report.selectedOwnerCatalogs?.usages;
  if (!Array.isArray(usages)) fail('systemic report lacks selected owner-catalog dependencies');
  const byOwner = new Map();
  for (const usage of usages) {
    const owner = `${usage.collection}:${usage.itemId}`;
    if (byOwner.has(owner)) fail(`systemic report duplicates selected catalog owner ${owner}`);
    byOwner.set(owner, usage);
  }
  const expected = reportRecords(data).map(record => {
    const selectedBinding = record.item.sourceExcerpts ? 'sourceExcerpts' : record.item.scanVerification ? 'scanVerification' : null;
    return {...record, selectedBinding, selectedCatalog: selectedBinding ? record.item[selectedBinding].catalog || null : null};
  }).filter(record => record.selectedCatalog);
  if (byOwner.size !== expected.length || report.selectedOwnerCatalogs.denominator !== expected.length) fail('systemic report selected-catalog owner denominator is stale for current data');
  for (const {collection, ownerKey, selectedBinding, selectedCatalog} of expected) {
    const usage = byOwner.get(ownerKey);
    if (!usage || usage.selectedBinding !== selectedBinding || usage.selectedCatalog !== selectedCatalog) fail(`systemic report selected catalog is stale for ${ownerKey}`);
    if (selectedCatalog) assertCurrentFileHash({path: `dist/${selectedCatalog}`, expected: usage.catalogBytesSha256, hashFile, label: 'systemic report'});
  }
}
function visualRegionHashes(region) {
  const {focusRects, ...content} = region;
  return {focusSha256: sha256(Buffer.from(canonicalJson(focusRects))), contentSha256: sha256(Buffer.from(canonicalJson(content)))};
}
function visualUsageKey(usage) { return [usage.collection, usage.itemId, usage.binding, usage.catalog, usage.regionId].join('|'); }
function validateVisualCatalogDependencies({report, data, readJson, hashFile}) {
  const actualUsages = report.usages;
  if (!Array.isArray(actualUsages)) fail('visual report lacks catalog-region usages');
  const actualByKey = new Map();
  for (const usage of actualUsages) {
    const key = visualUsageKey(usage);
    if (actualByKey.has(key)) fail(`visual report duplicates catalog-region usage ${key}`);
    actualByKey.set(key, usage);
  }
  const expectedKeys = new Set(), catalogCache = new Map();
  for (const {collection, item} of reportRecords(data)) {
    for (const binding of ['sourceExcerpts', 'scanVerification'].filter(name => item[name]?.catalog)) {
      const catalogPath = item[binding].catalog;
      localInputPath(`dist/${catalogPath}`, 'visual report');
      if (!catalogCache.has(catalogPath)) {
        let loaded;
        try { loaded = readJson(`dist/${catalogPath}`); }
        catch (error) { fail(`visual report catalog unavailable at dist/${catalogPath}: ${error.message}`); }
        const catalog = loaded.json.catalog || loaded.json;
        if (!Array.isArray(catalog.regions)) fail(`visual report catalog has no region list at dist/${catalogPath}`);
        catalogCache.set(catalogPath, catalog);
      }
      const catalog = catalogCache.get(catalogPath);
      const viewerSelected = binding === (item.sourceExcerpts ? 'sourceExcerpts' : 'scanVerification');
      const groups = new Map();
      for (const region of catalog.regions) {
        const group = `${region.book}:${region.printedPage}`;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(region);
      }
      for (const regions of groups.values()) {
        const ordered = [...regions].sort((a, b) => Number(a.role === 'context') - Number(b.role === 'context'));
        const orderHash = sha256(Buffer.from(canonicalJson(ordered.map(region => ({id: region.id, role: region.role || null, imageSha256: region.sha256, ...visualRegionHashes(region)})))));
        for (const [ordinal, region] of ordered.entries()) {
          const key = [collection, item.id, binding, catalogPath, region.id].join('|');
          expectedKeys.add(key);
          const usage = actualByKey.get(key);
          if (!usage) fail(`visual report omits current catalog region ${key}`);
          const hashes = visualRegionHashes(region);
          // sourceSha256 is the actual source artifact for this region. Normal
          // page crops resolve to their book PDF; a typed supplemental crop
          // resolves to its separately registered image while retaining the
          // canonical PDF identity in a distinct field.
          const sourceIdentity=sourceBooks.resolveRegionSourceIdentity(catalog,region);
          if(!sourceIdentity?.valid)fail(`visual report region has invalid source identity for ${key}: ${sourceIdentity?.reason||'unassessable'}`);
          const expected = {
            book: region.book, page: region.printedPage, printedPage: region.printedPage, pdfPage: region.pdfPage ?? null,
            image: region.image, imageSha256: region.sha256, width: region.width, height: region.height, title: region.title || null,
            focusRects: region.focusRects || [], cropBounds: region.normalizedPageRect || null,
            focusSha256: hashes.focusSha256, contentSha256: hashes.contentSha256,
            viewerSelected, default: viewerSelected && ordinal === 0,
            defaultOrderSha256: viewerSelected && ordinal === 0 ? orderHash : null,
            sourceSha256: sourceIdentity.sourceSha256 || null, role: region.role || null,
          };
          for (const [field, value] of Object.entries(expected)) if (!same(usage[field] ?? null, value)) fail(`visual report has stale ${field} for ${key}`);
          const imagePath = `dist/${catalogPath.slice(0, catalogPath.lastIndexOf('/') + 1)}${region.image}`;
          localInputPath(imagePath, 'visual report');
          let imageHash = null;
          try { imageHash = hashFile(imagePath); } catch { /* Missing image bytes are represented by the report's imageBytesMatch result. */ }
          const imageMatches = imageHash === region.sha256;
          if (usage.reviewGate?.imageBytesMatch !== imageMatches) fail(`visual report has stale image-byte status for ${key}`);
        }
      }
    }
  }
  if (actualByKey.size !== expectedKeys.size) fail('visual report catalog-region denominator is stale for current data');
}
export function validateReportDependencies({report, type, data, dataHash, rawDataHash, readJson, hashFile}) {
  if (type === 'systemic') return validateSystemicDependencies({report, data, dataHash, rawDataHash, hashFile});
  if (type === 'visual') {
    const input = report.inputs;
    if (report.inputDataSha256 !== dataHash || !input || input.data !== rawDataHash) fail('visual report is stale for current data');
    const allowed = new Set(['data', 'independentReviewLedger', 'triage', 'geometry', 'priceInventory', 'continuationManifest', 'contextContractManifest']);
    for (const key of Object.keys(input)) if (!allowed.has(key)) fail(`visual report has unsupported dependency input ${key}`);
    const required = ['data', 'independentReviewLedger', 'triage', 'geometry', 'priceInventory', 'continuationManifest', 'contextContractManifest'];
    for (const key of required) if (!Object.hasOwn(input, key)) fail(`visual report omits dependency input ${key}`);
    assertCurrentFileHash({path: 'dist/data.json', expected: input.data, hashFile, label: 'visual report'});
    assertCurrentFileHash({path: 'research/source-visual-reviews.json', expected: input.independentReviewLedger, hashFile, label: 'visual report'});
    assertHashMapCurrent({inputHashes: input.triage, hashFile, label: 'visual report'});
    for (const key of ['geometry', 'priceInventory', 'continuationManifest', 'contextContractManifest']) {
      const descriptor = input[key];
      if (!descriptor || descriptor.generatedInMemorySha256) fail(`visual report ${key} dependency is not locally hash-verifiable`);
      assertCurrentFileHash({path: descriptor.file, expected: descriptor.sha256, hashFile, label: 'visual report'});
    }
    return validateVisualCatalogDependencies({report, data, readJson, hashFile});
  }
  if (type === 'table') {
    if (report.schemaVersion !== 1 || report.generatedBy !== 'tools/source-table-citation-coverage.mjs') fail('source-table report has an unsupported dependency schema');
    const catalogPaths = reportRecords(data).flatMap(({item}) => ['sourceExcerpts', 'scanVerification'].filter(binding => item[binding]?.catalog).map(binding => `dist/${item[binding].catalog}`));
    const requiredPaths = ['dist/data.json', 'research/price-source-inventory.json', 'research/source-table-citation-contracts.json', ...new Set(catalogPaths)];
    if (report.inputHashes?.['dist/data.json'] !== rawDataHash) fail('table report is stale for current data');
    return assertHashMapCurrent({inputHashes: report.inputHashes, requiredPaths, hashFile, label: 'table report'});
  }
  fail(`unknown report dependency schema: ${type}`);
}

export function currentQueueMetadata({handoff, data, dataHash, rawDataHash, reportPaths, monetaryReports, readJson, hashFile, hashes}) {
  const queues = handoff.reviewQueuesNotSourceAbsences;
  const oldQueues = queues.fieldBindingAndHistoricalScopeQueues;
  const nextQueues = {...oldQueues};
  const checkReport = (path, type, required) => {
    let result;
    try { result = readJson(path); }
    catch (error) { if (required) fail(`${type} report unavailable at ${path}: ${error.message}`); return null; }
    const inputHash = type === 'systemic' ? result.json.input?.sha256 : type === 'visual' ? result.json.inputDataSha256 : result.json.inputHashes?.['dist/data.json'];
    const matches = type === 'table' ? inputHash === rawDataHash : inputHash === dataHash;
    if (!matches) { if (required) fail(`${type} report is stale for current data`); return null; }
    validateReportDependencies({report: result.json, type, data, dataHash, rawDataHash, readJson, hashFile});
    hashes[path] = result.sha256;
    return result.json;
  };
  const defaults = {
    systemic: 'artifacts/citation-systemic-coverage/citation-systemic-current.json',
    visual: 'artifacts/source-visual-coverage/report.json',
    table: 'artifacts/source-table-citation-coverage/report.json',
  };
  const systemPath = reportPaths.systemic === null ? defaults.systemic : reportPaths.systemic;
  const visualPath = reportPaths.visual === null ? defaults.visual : reportPaths.visual;
  const tablePath = reportPaths.table === null ? defaults.table : reportPaths.table;
  if (reportPaths.systemic !== null && !reportPaths.systemic) fail('--systemic-report requires a path');
  if (reportPaths.visual !== null && !reportPaths.visual) fail('--visual-report requires a path');
  if (reportPaths.table !== null && !reportPaths.table) fail('--table-report requires a path');
  const systemTry = checkReport(systemPath, 'systemic', true);
  const visualTry = checkReport(visualPath, 'visual', true);
  if (systemTry) {
    const metrics = fieldBindingAxisMetrics(systemTry);
    const {emptyRegionTargets: empty, denominator: bindings, fieldTargetReviewed: reviewed, fieldTargetNotReviewed: pending} = metrics;
    if (![empty, bindings, pending].every(Number.isInteger)) fail('hash-current systemic report lacks explicit evidence-binding counts');
    nextQueues.bindingsInputDataSha256 = dataHash;
    nextQueues.emptyRegionTargetBindings = empty;
    nextQueues.fieldEvidenceBindingsDenominator = bindings;
    nextQueues.fieldTargetsPending = pending;
    nextQueues.regionTargetResolvedBindings = metrics.resolvedRegionTargets;
    nextQueues.recordTargetResolvedBindings = metrics.recordTargetResolvedBindings;
    nextQueues.regionResolvedFieldReviewPendingBindings = metrics.regionResolvedFieldReviewPendingBindings;
    nextQueues.fieldTargetsReviewed = reviewed;
    nextQueues.regionResolvedFieldTargetsPending = metrics.resolvedButFieldTargetNotReviewed;
    nextQueues.countMeaning = fieldBindingCountMeaning(metrics);
    nextQueues.systemicReportPath = systemPath;
    const citationObjects = systemTry.citationObjects?.objects;
    if (!Array.isArray(citationObjects)) fail('hash-current systemic report lacks current class citation-target records');
    queues.classPrecisionProposals.currentPendingFieldTargets = citationObjects.filter(object => object.collection === 'classes' && object.reviewStatus === 'field-target-pending').length;
    queues.classPrecisionProposals.currentPendingInputDataSha256 = dataHash;
    nextQueues.reportHashes = {...(nextQueues.reportHashes || {}), systemic: hashes[systemPath]};
  }
  if (visualTry) {
    const scope = visualTry.sentinelPolicy;
    if (!Number.isInteger(scope?.historicalExceptionsNeedingScopeReview) || !Number.isInteger(scope?.historicalHighlightExceptionDenominator)) fail('hash-current visual report lacks explicit historical-scope queue counts');
    nextQueues.historicalScopesInputDataSha256 = dataHash;
    nextQueues.historicalScopesNeedingReview = scope.historicalExceptionsNeedingScopeReview;
    nextQueues.historicalScopeDenominator = scope.historicalHighlightExceptionDenominator;
    nextQueues.sourceVisualReportPath = visualPath;
    nextQueues.reportHashes = {...(nextQueues.reportHashes || {}), visual: hashes[visualPath]};
  }
  nextQueues.refreshBeforeFinalReport = !(systemTry && visualTry);
  if (!systemTry) {
    delete queues.classPrecisionProposals.currentPendingFieldTargets;
    delete queues.classPrecisionProposals.currentPendingInputDataSha256;
    delete nextQueues.recordTargetResolvedBindings;
    delete nextQueues.regionResolvedFieldReviewPendingBindings;
  }
  if (systemTry && visualTry) nextQueues.inputDataSha256 = dataHash;
  else if (nextQueues.inputDataSha256 === dataHash) nextQueues.inputDataSha256 = oldQueues.inputDataSha256;
  let tableResult = null;
  tableResult = checkReport(tablePath, 'table', true);
  if (tableResult) {
    const report = tableResult;
    const targetRows = report.rows?.flatMap(row => row.targets || []) || [];
    const rowWithout = report.rows?.filter(row => !row.targets?.length).length;
    const confirmedMissing = report.counts?.targetStatus?.['confirmed-missing-reference'] ?? 0;
    const uncertain = targetRows.filter(target => target.applicability === 'uncertain').length;
    if (![report.counts?.sourceRows, rowWithout, confirmedMissing, uncertain].every(Number.isInteger)) fail('source-table report lacks expected source row/target review counts');
    queues.sourceTableCitationReview = {reportPath: tablePath, reportSha256: hashes[tablePath], inputDataSha256: dataHash, rawDataFileSha256: rawDataHash, sourceRows: report.counts.sourceRows, confirmedMissingReferenceTargets: confirmedMissing, uncertainTargets: uncertain, rowsWithoutItemTargets: rowWithout, interpretation: 'Hash-bound source-table citation review queues; these counts are not proof of missing rules.'};
  } else delete queues.sourceTableCitationReview;
  queues.fieldBindingAndHistoricalScopeQueues = nextQueues;
  if (monetaryReports.length) queues.rowNormalizedMonetaryReview = {reports: monetaryReports, scope: 'Supplemental source-first monetary transcription, separate from the immutable discovery census. These are row/group inventories, not item bindings or completeness claims.'};
  else delete queues.rowNormalizedMonetaryReview;
  return queues;
}

export function buildRefreshedHandoff({repoRoot = root, handoff: currentHandoff, data, dataBytes, readJson, hashFile, reportPaths = {systemic: null, visual: null, table: null}, supplementalMonetary = []}) {
  if (!currentHandoff || !data || !Buffer.isBuffer(dataBytes) || typeof readJson !== 'function' || typeof hashFile !== 'function') fail('current handoff, parsed data, exact data bytes and file readers are required');
  const hashes = {};
  const read = path => { const loaded = readJson(path); hashes[path] = loaded.sha256; return loaded.json; };
  const handoffTemplateSha256 = sha256(Buffer.from(canonicalJson(handoffTemplateSnapshot(currentHandoff))));
  hashes[`${HANDOFF_PATH}#refresh-template`] = handoffTemplateSha256;
  hashes['dist/data.json'] = sha256(dataBytes);
  const dataSha = parsedHash(data), mechanicsSha = mechanicsDataHash(data);
  const mechanicsBytes = read('research/mechanics-audit-progress.json');
  const scanBytes = read('tests/fixtures/source-scan-inventory.json');
  const inventoryBytes = read('research/price-source-inventory.json');
  const reconciliationBytes = read('research/equipment-source-offer-reconciliation.json');
  const continuationBytes = read('research/citation-continuations.json');
  const mechanics = mechanicsBytes, scan = scanBytes, inventory = inventoryBytes, reconciliation = reconciliationBytes;
  if (mechanics.input?.sha256 !== mechanicsSha || validateLedger(mechanics, data).length) fail('mechanics ledger is not current and validated');
  if (scan.input?.sha256 !== dataSha || scan.counts?.records !== exposedRecordCount(data)) fail('source-scan fixture is stale or its record denominator changed');
  if (inventory.counts?.siteEquipmentObjects !== data.equipment?.length || inventory.counts?.sitePriceGaps !== 5 || inventory.counts?.sitePrintedPrices + inventory.counts?.sitePriceGaps !== data.equipment?.length) fail('canonical price inventory does not match the current equipment denominator');
  try { validatePriceSourceInventory(inventory, {data, equipment: data.equipment}); } catch (error) { fail(`canonical price inventory is not validated: ${error.message}`); }
  const historical = historicalInputs(repoRoot);
  for (const [path, hash] of Object.entries(historical.hashes)) hashes[path] = hash;
  const conflictReceipt = read('research/source-audit-batch5-conflict-integration.json');
  const nullPriceReceipt = read('research/source-audit-batch5-null-price-notes.json');
  const joAddition=loadJoUnextractedPriceRegistration({repoRoot,data,inventory});
  for(const ref of joAddition.inputRefs){assertCurrentFileHash({path:ref.path,expected:ref.sha256,hashFile,label:'Jo unextracted-price registration'});hashes[ref.path]=ref.sha256;}
  const animalReceipt = read('research/source-audit-batch5-unextracted.json');
  const classIntegration = read('research/source-audit-batch5-class-integration.json');
  const classRetirementReceipt = read('research/source-audit-batch5-class-retired-ledger.json');
  const classRetirement = read('research/source-audit-batch5-class-progression-retirement.json');
  const classDetection = read('research/source-audit-batch5-class-progression-baseline.json');
  const priceReview = read('research/source-audit-batch5-price-independent-review.json');
  if (classRetirementReceipt.detectionReceipt !== 'research/source-audit-batch5-class-progression-baseline.json' || classRetirementReceipt.retirementReceipt !== 'research/source-audit-batch5-class-progression-retirement.json' || classRetirement.retired?.source?.itemId !== 'assassin' || classRetirement.retired?.source?.pointer !== '/levelChanges/50' || classRetirement.disposition?.status !== 'removed-from-current-progression' || classRetirement.after?.assassin?.lastEventLevel !== 15 || classDetection.input?.commit !== BASELINE_COMMIT || classDetection.input?.sha256 !== historical.hashes[`git:${BASELINE_COMMIT}:dist/data.json`] || classDetection.counts?.classRecords !== 16 || !Array.isArray(classRetirementReceipt.supersededEvidence)) fail('class progression retirement receipts do not form the reviewed input chain');
  const sourceBodyTransition=loadUaSourceHandoffTransition({read,hashFile,baselineData:historical.data,currentData:data,mechanics,conflictReceipt});
  const transitions = validateApprovedTransitions({baselineData: historical.data, currentData: data, conflictReceipt, animalReceipt, classRetirementReceipt,sourceBodyTransition});
  if (classIntegration.promotedSemanticFields !== 49 || classIntegration.promotedPageBindings !== 51 || classIntegration.retiredOrBlockedFields?.length !== 1 || classRetirementReceipt.retiredPointer !== '/levelChanges/50') fail('class integration receipt is no longer the reviewed 49/51/1 disposition');
  for (const [path, expected] of Object.entries(inventory.integrity?.sourceInventoryHashes || {})) if (hashFile(path) !== expected) fail(`canonical source inventory input hash is stale: ${path}`);
  for (const census of currentHandoff.sourcePriceDiscoveryCensuses?.censuses || []) for (const path of census.sourceFiles || []) {
    if (!inventory.integrity?.sourceCensusHashes?.[path] || hashFile(path) !== inventory.integrity.sourceCensusHashes[path]) fail(`historical source census changed: ${path}`);
  }
  hashes['research/price-source-inventory.json'] = hashFile('research/price-source-inventory.json');
  const noteProjection = reconcileCuratedNotes({curatedNotes: historical.handoff.mechanicsAudit.specificReviewNoteCandidates.notes, currentHandoff, baselineData: historical.data, currentData: data, mechanics, conflictReceipt, conflictReceiptSha256: hashes['research/source-audit-batch5-conflict-integration.json'], classRetirementReceipt, classRetirementReceiptSha256: hashes['research/source-audit-batch5-class-retired-ledger.json'], animalReceipt, animalReceiptSha256: hashes['research/source-audit-batch5-unextracted.json'],sourceBodyTransition});
  // The underlying mechanics ledger remains immutable historical evidence.
  // Project the current, user-confirmed supplemental availability only onto
  // the active p.175 source reference so an old availability notice does not
  // survive refresh as if it were current. This does not grade the record or
  // change its source-value status.
  const dmg175Supplement = currentHandoff.sourcePriceDiscoveryCensuses?.supplementalPageScreens?.find(row =>
    row.id === 'dmg-175-user-confirmed-supplement'
    && row.book === 'DMG'
    && row.printedPage === 175
    && row.canonicalPdfPage === null
    && row.canonicalPdfSha256 === '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'
    && row.supplementalImageSha256 === 'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7'
    && row.editionStatus === 'user-confirmed-correct-edition'
    && row.printingStatus === 'not-specified'
    && Array.isArray(row.cropRegions)
    && row.cropRegions.length === 2
  );
  if (!dmg175Supplement) fail('the bounded DMG p.175 supplemental-page status is missing or mismatched');
  const p175NoteRefs = noteProjection.active.flatMap((note, noteIndex) => (note.sourceReferences || [])
    .map((reference, referenceIndex) => ({note, noteIndex, reference, referenceIndex}))
    .filter(row => row.reference.book === 'DMG' && (row.reference.page === 175 || row.reference.printedPage === 175)
      && row.reference.sourceSha256 === dmg175Supplement.supplementalImageSha256));
  if (p175NoteRefs.length !== 1) fail(`expected one active DMG p.175 source-reference projection, found ${p175NoteRefs.length}`);
  const p175Target = p175NoteRefs[0];
  p175Target.note.sourceReferences[p175Target.referenceIndex] = {
    ...p175Target.reference,
    historicalAvailability: p175Target.reference.availability || null,
    historicalPrinting: p175Target.reference.printing || null,
    availability: 'limited-supplemental-excerpts-available',
    printing: dmg175Supplement.printingStatus,
    userConfirmedCorrectEdition: true,
    supplementalArtifactId: dmg175Supplement.id,
    supplementalImageSha256: dmg175Supplement.supplementalImageSha256,
    canonicalPdfSha256: dmg175Supplement.canonicalPdfSha256,
    originalPdfPage: 'missing',
    limitedExcerptRegionIds: dmg175Supplement.cropRegions.map(region => region.regionId),
    fullSourceImagePublished: false,
    supersedingReview: {
      path: 'research/source-audit-batch6-dmg175-v2-focus-root-independent-review.json',
      sha256: '2319330608c7e2ad768428e225f4baad7d81067dd067f831d0fea4e5bb9f1f0c',
    },
  };
  const issues = formalIssues(data, mechanics);
  validateNullPriceTransitions({baselineData: historical.data, currentData: data, receipt: nullPriceReceipt});
  const priceGaps = sourcePriceGaps({data, inventory, receipt: nullPriceReceipt, existing: currentHandoff.currentSitePriceGaps,joAddition});
  const offer = offerHandoff({data, reconciliation, reconciliationSha256: hashes['research/equipment-source-offer-reconciliation.json'], existing: currentHandoff.equipmentOffers, readJson, hashFile});
  const reportMetadata = [];
  const monetaryCurrent = supplementalMonetary.length ? loadCurrentMonetaryReview({repoRoot, read, hashFile, hashes}) : null;
  for (const path of supplementalMonetary) {
    const file = readJson(path);
    const metadata=validateSupplementalMonetaryReport({path, json: file.json, bytes: file.bytes, repoRoot, hashes});
    metadata.currentReview = projectCurrentMonetaryReview({metadata, ...monetaryCurrent, sourceReport: file.json});
    metadata.status = metadata.currentReview.status;
    metadata.historicalProducerMetadata = historicalProducerMetadata(metadata);
    metadata.currentIntegration = sourceIntegrationDescriptor(metadata, {registration: monetaryCurrent.registration, registrationRef: monetaryCurrent.registrationRef, currentHashes: hashes});
    if(reportMetadata.some(previous=>previous.sourceCensusPath===metadata.sourceCensusPath))fail(`duplicate supplemental census report: ${metadata.sourceCensusPath}`);
    reportMetadata.push(metadata);
  }
  if(reportMetadata.reduce((sum,report)=>sum+report.groups,0)>inventory.counts.sourceCensusTableGroups)fail('structured group count exceeds the declared source-census denominator');
  const handoff = clone(currentHandoff);
  const parsedRecordCount = exposedRecordCount(data);
  handoff.generatedOn = new Date().toISOString().slice(0, 10);
  if(monetaryCurrent)handoff.currentMonetarySourceQuestions=monetaryCurrent.currentSourceQuestions;
  handoff.snapshot = {...handoff.snapshot, dataRecordCount: parsedRecordCount, parsedDataSha256: dataSha, rawDistDataFileSha256: hashes['dist/data.json'], mechanicsAuditInputSha256: mechanicsSha, mechanicsAuditFileSha256: hashes['research/mechanics-audit-progress.json'], sourceScanInputSha256: scan.input.sha256, sourceScanFileSha256: hashes['tests/fixtures/source-scan-inventory.json'], canonicalPriceInventoryFileSha256: hashes['research/price-source-inventory.json'], sourceOfferReconciliationFileSha256: hashes['research/equipment-source-offer-reconciliation.json'], refreshBaselineCommit: BASELINE_COMMIT, refreshTemplateSha256: handoffTemplateSha256, refreshInputHashes: hashes};
  handoff.scope = {...handoff.scope, currentExposedRecords: parsedRecordCount};
  handoff.mechanicsAudit.counts = clone(mechanics.counts);
  handoff.excludedFromGapCount = currentUncheckedExclusions(handoff.excludedFromGapCount, mechanics.counts.uncheckedFields);
  handoff.mechanicsAudit.validation = clone(mechanics.validation);
  handoff.mechanicsAudit.formalFieldIssues = issues;
  // `active` is the reconciler's internal partition; the published schema and
  // its JSON pointers name current cautions `notes`. Keep retired notes in
  // history instead of publishing them as active again.
  const {active: activeNotes, ...noteMetadata} = noteProjection;
  handoff.mechanicsAudit.specificReviewNoteCandidates = {...noteMetadata, notes: activeNotes};
  handoff.equipmentOffers = offer;
  handoff.currentSitePriceGaps.records = priceGaps;
  const queue = handoff.reviewQueuesNotSourceAbsences;
  const classQueue = queue.classPrecisionProposals;
  classQueue.count = classIntegration.originalProposals;
  classQueue.breakdown = {fields: classIntegration.originalProposals, assassinScrollField: 1, coreProficiencyFields: 48, validFieldsApplied: classIntegration.promotedSemanticFields, pageBindingsApplied: classIntegration.promotedPageBindings, retiredUnsupportedFields: classIntegration.retiredOrBlockedFields.length, preciseHighlightsReviewed: classIntegration.visualBindingsReviewed, fieldValueGradesChanged: 0, productBindingsApplied: true};
  classQueue.proof = {path: 'research/source-audit-batch5-class-integration.json', sha256: hashes['research/source-audit-batch5-class-integration.json']};
  classQueue.status = '49 fields and 51 page bindings applied after review; one unsupported Assassin level-17 event retired; remaining class facts stay under review.';
  if ((currentHandoff.missingReferencedContent?.missingCitedPages || []).length !== scan.counts.knownGapPages) fail('source-scan missing-page count differs from the declared cited-page absence list');
  currentQueueMetadata({handoff, data, dataHash: dataSha, rawDataHash: hashes['dist/data.json'], reportPaths, monetaryReports: reportMetadata, readJson, hashFile, hashes});
  const sourceStats = scan.counts;
  handoff.summary = {...handoff.summary,
    explicitMissingCitedSourcePages: handoff.missingReferencedContent.missingCitedPages.length,
    citedPagesWithoutPublishedCropPixels: sourceStats.citedPagesWithoutSuppliedCropPixels,
    unverifiedUncitedEndMatterPages: sourceStats.unverifiedPages,
    formalMechanicsFieldStatuses: {notExtracted: issues.notExtracted.length, sourceConflict: issues.sourceConflict.length, ordinaryUncheckedFieldsExcluded: mechanics.counts.uncheckedFields},
    additionalRecordedReviewNoteCandidates: noteProjection.active.length,
    distinctUnrepresentedOrUnresolvedEquipmentOffers: reconciliation.denominator.distinctUnrepresentedOrUnresolvedOffers,
    currentExplicitUnextractedEquipmentPriceFields: priceGaps.length,
    sourceCensus: {...handoff.summary.sourceCensus, totalPdfPages: inventory.counts.sourceCensusPdfPages, claims: inventory.counts.sourceCensusClaims, tableGroups: inventory.counts.sourceCensusTableGroups,
      newTableGroupsRowTranscribed: reportMetadata.reduce((sum,report)=>sum+report.groups,0),
      rowTranscribedNewTableGroups:Object.fromEntries(handoff.sourcePriceDiscoveryCensuses.censuses.map(census=>{
        const reports=reportMetadata.filter(report=>census.sourceFiles.includes(report.sourceCensusPath));
        return [census.id,reports.length?reports.reduce((sum,report)=>sum+report.groups,0):census.id==='monster-books'?'not-applicable/none enumerated':0];
      })),
    },
  };
  handoff.mechanicsAudit.counts = clone(mechanics.counts);
  handoff.currentSitePriceGaps.count = priceGaps.length;
  handoff.currentSitePriceGaps.denominator = data.equipment.length;
  handoff.equipmentOffers.denominator = clone(reconciliation.denominator);
  // Hash every source record, reconciliation review and census file consumed in the final result.
  for (const row of reconciliation.records) { hashes[row.sourceInventoryFile] = hashFile(row.sourceInventoryFile); if (row.currentMappingReview) hashes[row.currentMappingReview.path] = hashFile(row.currentMappingReview.path); }
  for (const source of inventory.sourceInventories || []) for (const path of source.sourceFiles || []) hashes[path] = hashFile(path);
  for (const census of inventory.sourcePageCensuses || []) for (const path of census.sourceFiles || []) hashes[path] = hashFile(path);
  for (const collection of ['rules', 'spells', 'classes', 'equipment', 'matrices']) for (const item of data[collection] || []) for (const bindingName of ['sourceExcerpts', 'scanVerification']) {
    const catalog = item[bindingName]?.catalog;
    if (catalog) hashes[`dist/${catalog}`] = hashFile(`dist/${catalog}`);
  }
  handoff.snapshot.refreshInputHashes = hashes;
  return {handoff, hashes, transitions, reportMetadata};
}

function parseArgs(args) {
  const options = {check: false, systemic: null, visual: null, table: null, monetary: []};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') options.check = true;
    else if (['--systemic-report', '--visual-report', '--table-report', '--monetary-report'].includes(arg)) {
      const value = args[++i]; if (!value) fail(`${arg} requires a path`);
      if (arg === '--systemic-report') options.systemic = value;
      else if (arg === '--visual-report') options.visual = value;
      else if (arg === '--table-report') options.table = value;
      else options.monetary.push(value);
    } else fail(`unknown argument ${arg}`);
  }
  return options;
}

export function handoffDate({checking, existingDate, now = new Date()}) {
  const value=checking?existingDate:now.toISOString().slice(0,10);
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('invalid snapshot date');
  return value;
}

export function runRefresh({repoRoot = root, args = process.argv.slice(2), now = new Date()} = {}) {
  const options = parseArgs(args);
  const paths = {systemic: options.systemic, visual: options.visual, table: options.table};
  const filePath = path => resolve(repoRoot, path);
  const hashFile = path => sha256(readFileSync(filePath(path)));
  const readJson = path => { const bytes = readFileSync(filePath(path)); return {bytes, sha256: sha256(bytes), json: parseJson(bytes, path)}; };
  const dataBytes = readFileSync(filePath('dist/data.json'));
  const data = parseJson(dataBytes, 'dist/data.json');
  const handoff = readJson(HANDOFF_PATH).json;
  const monetaryReports = options.monetary.length ? options.monetary : [
    'research/source-audit-batch5-phb-dmg-additional-prices.json',
    'research/source-audit-batch5-ua-additional-prices.json',
  ];
  const result = buildRefreshedHandoff({repoRoot, handoff, data, dataBytes, readJson, hashFile, reportPaths: paths, supplementalMonetary: monetaryReports});
  // Checking an existing snapshot validates its inputs without dating it anew.
  result.handoff.generatedOn = handoffDate({checking:options.check,existingDate:handoff.generatedOn,now});
  const candidate = `${JSON.stringify(result.handoff, null, 2)}\n`;
  // Validate through the production projection before either checking or writing.
  const readForBuilder = path => path === HANDOFF_PATH ? Buffer.from(candidate) : readFileSync(filePath(path));
  buildCoverageGaps({data, handoff: result.handoff, readFile: readForBuilder});
  const current = readFileSync(filePath(HANDOFF_PATH));
  if (options.check) {
    if (!current.equals(Buffer.from(candidate))) { console.error('Gaps handoff is stale; validated candidate differs from the file.'); process.exitCode = 1; return result; }
    console.log(`Gaps handoff is current (${result.transitions.length} reviewed transitions; ${result.handoff.summary.additionalRecordedReviewNoteCandidates} active cautions).`);
    return result;
  }
  const temp = `${filePath(HANDOFF_PATH)}.tmp-${process.pid}`;
  writeFileSync(temp, candidate);
  renameSync(temp, filePath(HANDOFF_PATH));
  console.log(`Refreshed ${HANDOFF_PATH}: ${result.handoff.summary.additionalRecordedReviewNoteCandidates} active cautions; ${result.handoff.mechanicsAudit.specificReviewNoteCandidates.history.length} historical dispositions.`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runRefresh(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
