// PROPOSAL ONLY: independent closed cohort assertions for the eventual
// current-native Hirelings build.  This module is intentionally outside the
// active repository and does not project or modify a historical epoch.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const canonical = value => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
export const hash = value => sha(Buffer.from(canonical(value)));
const countBy = values => Object.fromEntries([...values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));
const identity = item => `${item.collection}:${item.itemId}`;
const fail = (condition, message) => assert.ok(condition, message);

export function atPointer(root, pointer) {
  if (pointer === '') return root;
  return pointer.split('/').slice(1).reduce((value, token) => {
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    return Array.isArray(value) ? value[Number(key)] : value?.[key];
  }, root);
}

function assertOrderedSubsequence(actual, expectedHashes, label) {
  const remaining = new Map();
  for (const digest of expectedHashes) remaining.set(digest, (remaining.get(digest) || 0) + 1);
  const retained = [];
  for (const item of actual) {
    const digest = hash(item);
    const count = remaining.get(digest) || 0;
    if (count) {
      retained.push(digest);
      remaining.set(digest, count - 1);
    }
  }
  assert.deepEqual(retained, expectedHashes, `${label}: every old whole object remains exactly once, in relative order`);
}

function assertPending(binding, label) {
  assert.equal(binding.reviewStatus, 'field-target-pending', `${label}: target review remains pending`);
  assert.equal(binding.sourceValueStatus, 'not-assessed-by-field-target-review', `${label}: source value remains unassessed`);
  assert.equal(binding.contextStatus, 'context-not-assessed', `${label}: context remains unassessed`);
}

function sameHash(actual, expected, label) {
  assert.equal(hash(actual), expected, label);
}

function targetKey(binding) {
  return hash({
    collection: binding.collection,
    itemId: binding.itemId,
    fieldPointer: binding.fieldPointer,
    sourceObjectPointer: binding.sourceObjectPointer,
    sourceObject: binding.sourceObject,
    sourceCategory: binding.sourceCategory,
    book: binding.book,
    printedPage: binding.printedPage,
    pdfPage: binding.pdfPage,
    catalog: binding.catalog,
    regionIds: binding.regionIds || [],
    sourcePages: binding.sourcePages || binding.pages || [],
  });
}

function candidateRules(rawRules, cohort) {
  const newOwners = rawRules.rules.slice(cohort.baseline.rawRuleCount);
  assert.deepEqual(newOwners.map(owner => owner.id), cohort.sourceCohort.ownerIds, '48 raw owners have the exact frozen owner order');
  return new Map(newOwners.map(owner => [owner.id, owner]));
}

function assertProjectedOwner(actual, expected, label) {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${label}: compiled array remains an array`);
    assert.equal(actual.length, expected.length, `${label}: exact array length/order`);
    for (let index = 0; index < expected.length; index++) assertProjectedOwner(actual[index], expected[index], `${label}[${index}]`);
    return;
  }
  if (expected && typeof expected === 'object') {
    assert.ok(actual && typeof actual === 'object' && !Array.isArray(actual), `${label}: compiled object remains an object`);
    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);
    const nativeBindingAttachment = label.endsWith(': compiled source projection')
      || label.endsWith('.sourceReference')
      || label.endsWith('.table.sourceContext')
      || /\.(?:sourceReferences|references)\[\d+\]$/.test(label);
    const generatedSourceExcerptReview = label.endsWith('.sourceExcerpts');
    const extraKeys = actualKeys.filter(key => !Object.hasOwn(expected, key)
      && !(key === 'evidenceBindings' && nativeBindingAttachment)
      && !(key === 'regionReviews' && generatedSourceExcerptReview));
    assert.deepEqual(extraKeys, [], `${label}: native output adds only exact generated evidenceBindings or the generated sourceExcerpts.regionReviews projection`);
    for (const key of expectedKeys) {
      assert.ok(Object.hasOwn(actual, key), `${label}.${key}: every raw/source key is retained`);
      assertProjectedOwner(actual[key], expected[key], `${label}.${key}`);
    }
    return;
  }
  assert.deepEqual(actual, expected, `${label}: exact raw/source value`);
}

function assertOwnerPayloads(rawRules, data, overrides, cohort) {
  const expectedIds = cohort.sourceCohort.ownerIds;
  const rawOwners = candidateRules(rawRules, cohort);
  const compiledRules = new Map(data.rules.map(owner => [owner.id, owner]));
  assert.equal(rawOwners.size, cohort.sourceCohort.ownerIds.length, 'exact candidate owner IDs');
  for (const expected of cohort.sourceCohort.rawOwnerHashes) {
    const raw = rawOwners.get(expected.id);
    assert.ok(raw, `${expected.id}: source owner exists`);
    sameHash(raw, expected.sha256, `${expected.id}: complete raw source owner is exact`);
  }
  assert.equal(rawRules.rules.length, cohort.baseline.rawRuleCount + cohort.sourceCohort.ownerIds.length, 'raw source contains only the exact appended candidate owners');
  assert.deepEqual(rawRules.rules.slice(0, cohort.baseline.rawRuleCount).map(hash), cohort.baseline.rawRuleOwnerHashes.map(item => item.sha256), 'all 163 raw current rule objects remain an exact ordered prefix');

  const expectedRuleIds = [...cohort.baseline.compiledRuleOwnerHashes.map(item => item.id), ...expectedIds];
  assert.deepEqual(data.rules.map(owner => owner.id), expectedRuleIds, 'compiled rule owners preserve the actual current order then append the exact cohort');
  assert.equal(data.rules.length, cohort.baseline.compiledRuleOwnerHashes.length + cohort.sourceCohort.ownerIds.length, 'compiled current rules equal the exact prior owners plus the candidate cohort');
  for (const expected of cohort.baseline.compiledRuleOwnerHashes) {
    const actual = compiledRules.get(expected.id);
    assert.ok(actual, `${expected.id}: prior compiled rule remains present`);
    sameHash(actual, expected.sha256, `${expected.id}: prior complete compiled rule remains exact`);
  }
  for (const id of expectedIds) {
    const raw = rawOwners.get(id);
    const built = compiledRules.get(id);
    assert.ok(built, `${id}: actual native build output has compiled owner`);
    const compiledHash = cohort.nativeProjection.compiledOwnerHashes?.find(item => item.id === id);
    assert.ok(compiledHash, `${id}: frozen whole compiled-owner hash exists`);
    sameHash(built, compiledHash.sha256, `${id}: complete compiled owner, including the exact generated binding arrays, is frozen`);
    const sourceExcerptKey = `rules:${id}`;
    const sourceExcerpts = overrides.sourceExcerpts?.[sourceExcerptKey];
    assert.ok(sourceExcerpts, `${id}: exact source excerpt override is present`);
    if (Object.hasOwn(raw, 'sourceExcerpts')) assert.deepEqual(raw.sourceExcerpts, sourceExcerpts, `${id}: raw source excerpt agrees with its separate override`);
    const expectedCompiledSource = {...raw, sourceExcerpts};
    assertProjectedOwner(built, expectedCompiledSource, `${id}: compiled source projection`);
    fail(built.id === id, `${id}: compiled owner identity remains exact`);
  }
  const counts = Object.fromEntries(['rules', 'spells', 'equipment', 'classes', 'matrices'].map(name => [name, data[name].length]));
  counts.progressionExplainer = data.progressionExplainer ? 1 : 0;
  assert.equal(counts.rules, cohort.baseline.compiledRuleOwnerHashes.length + cohort.sourceCohort.ownerIds.length, 'current compiled rule owner denominator');
  assert.equal(Object.values(counts).reduce((sum, value) => sum + value, 0), cohort.baseline.compiledOwnerCount + cohort.sourceCohort.ownerIds.length, 'native output adds exactly the candidate owner set');
  for (const key of ['spells', 'equipment', 'classes', 'matrices', 'progressionExplainer']) {
    sameHash(data[key], cohort.baseline.unchangedCompiledCollections[key], `${key}: unrelated compiled collection remains exact`);
  }
  assert.equal(cohort.baseline.compiledOwnerCount + cohort.sourceCohort.ownerIds.length, Object.values(counts).reduce((sum, value) => sum + value, 0), 'fixture baseline and current owner denominator agree');
  return rawOwners;
}

function assertSourcePayload(rawOwners, cohort) {
  const source = cohort.sourceCohort;
  const rowById = new Map(source.sourceRows.map(row => [`${row.ownerId}:${row.rowPointer}`, row]));
  const observedRows = [];
  const observedNotes = [];
  const observedBullets = [];
  for (const id of source.ownerIds) {
    const owner = rawOwners.get(id);
    (owner.table?.rows || []).forEach((row, index) => observedRows.push({ownerId: id, rowPointer: `/table/rows/${index}`, row}));
    (owner.table?.sourceNotes || []).forEach((note, index) => observedNotes.push({ownerId: id, fieldPointer: `/table/sourceNotes/${index}`, note}));
    (owner.bullets || []).forEach((text, index) => observedBullets.push({ownerId: id, fieldPointer: `/bullets/${index}`, text, reference: owner.references?.[index] || null}));
  }
  assert.equal(observedRows.length, 244, 'all physical table rows remain present');
  assert.equal(observedRows.reduce((sum, item) => sum + (item.row.cells?.length || 0), 0), 343, 'all source table cells remain present');
  assert.equal(source.tableCount, 38, '38 physical tables in the closed cohort');
  for (const {ownerId, rowPointer, row} of observedRows) {
    const expected = rowById.get(`${ownerId}:${rowPointer}`);
    assert.ok(expected, `${ownerId}${rowPointer}: row belongs to the frozen row census`);
    assert.equal(row.id, expected.rowId, `${ownerId}${rowPointer}: physical row ID remains exact`);
    assert.equal(row.sourceRowId || null, expected.sourceRowId, `${ownerId}${rowPointer}: source row lineage remains exact`);
    sameHash(row, expected.rowHash, `${ownerId}${rowPointer}: row, cells, null/blank state and source metadata remain exact`);
    sameHash(row.sourceReference || null, expected.sourceReferenceHash, `${ownerId}${rowPointer}: row source reference remains exact`);
    assert.equal(row.cells.length, expected.cellCount, `${ownerId}${rowPointer}: exact cell count`);
  }
  assert.equal(observedNotes.length, 38, 'all 38 source note objects remain present');
  assert.deepEqual(observedNotes.map(({ownerId, fieldPointer, note}) => ({ownerId, noteId: note.id, fieldPointer, sourceObjectPointer: `${fieldPointer}/sourceReference`, textSha256: sha(Buffer.from(note.text || '')), noteKind: note.kind || null, sourceReferenceId: note.sourceReference?.id || null, sourceReferenceHash: note.sourceReference ? hash(note.sourceReference) : null, orderedRegionIds: note.sourceReference?.verification?.regions || [], sourcePages: note.sourceReference?.pages || []})), source.notes, 'note text, source references, and ordered regions/pages are exact');
  assert.equal(source.noteTextPreservation.length, 38, 'all source S2 note texts have an explicit preservation disposition');
  const changedNotes = source.noteTextPreservation.filter(note => !note.unchangedFromV7);
  assert.deepEqual(changedNotes.map(note => note.ownerId), source.t01TextCorrection.allowedChangedOwnerIds, 'T01 is the sole explicitly scoped note-text successor');
  const t01 = changedNotes[0];
  assert.equal(t01.sourceV7TextSha256, source.t01TextCorrection.beforeTextSha256, 'T01 predecessor text hash is exact');
  assert.equal(t01.composedTextSha256, source.t01TextCorrection.afterTextSha256, 'T01 scope-successor text hash is exact');
  assert.equal(source.t01TextCorrection.fieldPointer, '/table/sourceNotes/0/text', 'T01 text change is bounded to the source-note text field');
  const expectedBullets = source.bulletFields;
  assert.equal(observedBullets.filter(({reference}) => reference?.sourceUnitId || reference?.id?.includes('-bullet-')).length, 35, 'all 35 source bullet fields retain source-unit lineage');
  assert.deepEqual(observedBullets.filter(({reference}) => reference?.sourceUnitId || reference?.id?.includes('-bullet-')).map(({ownerId, fieldPointer, text, reference}) => ({ownerId, fieldPointer, sourceObjectPointer: `/references/${Number(fieldPointer.split('/').at(-1))}`, sourceUnitId: reference?.sourceUnitId || null, sourceFieldPointer: reference?.sourceFieldPointer || null, textSha256: sha(Buffer.from(text)), sourceReferenceId: reference?.id || null, sourceReferenceHash: reference ? hash(reference) : null, orderedRegionIds: reference?.verification?.regions || [], sourcePages: reference?.sourceDisplayPages || reference?.pages || []})), expectedBullets, 'all 35 normalized source bullet texts and source-unit/reference lineages are exact and ordered');
  const t25 = rawOwners.get('dmg-hireling-table-t25');
  assert.equal(t25?.table?.rows?.[4]?.cells?.[1]?.raw, null, 'T25 printed blank remains null');
  assert.equal(t25?.table?.rows?.[4]?.cells?.[1]?.sourceState, 'printed-blank', 'T25 remains explicitly a printed blank');
  const u08 = rawOwners.get('dmg-hireling-procedure-u08');
  assert.deepEqual(u08?.pages, [18], 'U08 retains its bounded printed page scope');
}

function assertContinuations(continuations, cohort) {
  const expected = cohort.sourceCohort.continuations;
  assert.ok(expected, 'closed fixture includes the exact S2 citation-continuation manifest');
  assert.ok(continuations && Array.isArray(continuations.groups), 'installed/model continuation input has an ordered groups array');
  const groups = continuations.groups;
  const groupHashes = groups.map(hash);
  assert.equal(groups.length, expected.candidate.groupCount, 'no continuation group is missing or extra');
  assert.deepEqual(groupHashes, expected.candidate.groupObjectHashes, 'all continuation whole objects match in exact order');
  assert.deepEqual(groupHashes.slice(0, expected.baseline.groupCount), expected.baseline.groupObjectHashes, 'all 273 pre-existing continuation whole objects remain the exact ordered prefix');
  assert.deepEqual(groupHashes.slice(expected.baseline.groupCount, expected.s1.groupCount), expected.s1.groupObjectHashes.slice(expected.baseline.groupCount), 'all S1 source-delivery groups remain exact after the prior baseline prefix');
  assert.deepEqual(groupHashes.slice(expected.s1.groupCount), expected.aliasAppend.groupObjectHashes, 'both V4 alias groups are the exact S2 continuation suffix');
  const segmentCount = groups.reduce((sum, group) => sum + (group.segments || []).length, 0);
  assert.equal(segmentCount, expected.candidate.segmentCount, 'exact S2 continuation segment denominator');
  const appended = groups.slice(expected.s1.groupCount);
  const orderedParts = appended.map(group => ({id: group.id, partHashes: (group.segments || []).map(hash)}));
  assert.deepEqual(orderedParts, expected.aliasAppend.orderedParts, 'the exact V4 alias parts retain their group and part order');
  assert.deepEqual(appended.map(group => group.id), expected.aliasAppend.groupIds, 'the two V4 alias IDs are closed');
  return {groups: groups.length, segments: segmentCount, baselineGroups: expected.baseline.groupCount, s1Groups: expected.s1.groupCount, s2AliasGroups: appended.length};
}

export function assertPublishedContinuations(published, cohort) {
  const expected = cohort.sourceCohort.continuations;
  const groups = published?.groups;
  assert.ok(Array.isArray(groups), 'published source-continuations has an ordered groups array');
  assert.equal(published.schemaVersion, 1, 'published source-continuations schema');
  assert.deepEqual(published.counts, expected.publication.candidate.counts, 'published continuation counts exactly match production publisher output');
  assert.equal(groups.length, expected.publication.candidate.groupCount, 'published continuation object denominator');
  assert.equal(published.parsedManifestSha256, expected.publication.candidate.parsedManifestSha256, 'published continuation uses exact candidate manifest bytes');
  assert.equal(published.parsedDataSha256, expected.publication.candidate.parsedDataSha256, 'published continuation uses exact candidate compiled data');
  const hashes = groups.map(hash);
  assert.deepEqual(hashes, expected.publication.candidate.groupObjectHashes, 'all published whole group objects and order match the closed S2 projection');
  assert.deepEqual(hashes.slice(0, expected.publication.baseline.groupCount), expected.publication.baseline.groupObjectHashes, 'all pre-existing published groups remain an exact ordered prefix');
  assert.deepEqual(hashes.slice(expected.publication.s1.groupCount), expected.publication.candidate.addedGroupObjectHashes, 'publisher output contains the exact S2 alias suffix');
  assert.deepEqual(groups.slice(expected.publication.s1.groupCount).map(group => group.id), expected.publication.candidate.addedGroupIds, 'published S2 alias IDs remain exact and ordered');
  return {groups: groups.length, segments: published.counts.segments, preservedPublishedPrefix: expected.publication.baseline.groupCount, s1Groups: expected.publication.s1.groupCount, s2AliasGroups: expected.publication.candidate.addedGroupIds.length};
}

function assertManualAndCanonical(rawOwners, compiledRules, manual, inventory, cohort) {
  const baseManualCount = cohort.baseline.manualCount;
  assert.equal(manual.bindings.length, baseManualCount + cohort.sourceCohort.manualTargetCount, 'manual source declarations append exactly the closed target denominator');
  assert.deepEqual(manual.bindings.slice(0, baseManualCount).map(hash), cohort.baseline.manualPrefixHashes, 'all 930 current manual declarations remain an exact ordered prefix');
  const additions = manual.bindings.slice(baseManualCount);
  const expectedTargets = cohort.sourceCohort.manualTargetTuples;
  assert.deepEqual(additions.map(hash), expectedTargets.map(item => item.hash), 'all 321 manual target objects remain exact and in per-page order');
  assert.equal(additions.length, 321, 'source target split is exact: 244 row + 41 note/page + 36 bullet/page declarations');
  for (let index = 0; index < additions.length; index++) {
    const binding = additions[index];
    const expected = expectedTargets[index];
    assert.equal(expected.ordinal, index, `manual declaration ${index} has stable frozen order`);
    assertPending(binding, `${binding.itemId}${binding.fieldPointer}`);
    const owner = rawOwners.get(binding.itemId);
    assert.ok(owner, `${binding.itemId}: manual owner is in this cohort`);
    assert.notEqual(atPointer(owner, binding.fieldPointer), undefined, `${binding.itemId}${binding.fieldPointer}: field pointer resolves in actual owner`);
    assert.notEqual(atPointer(owner, binding.sourceObjectPointer), undefined, `${binding.itemId}${binding.sourceObjectPointer}: source-object pointer resolves in actual owner`);
    assert.equal(binding.collection, 'rules', `${binding.itemId}: declarations bind the rules collection`);
    assert.deepEqual(binding.sourceOwner, {collection: 'rules', itemId: binding.itemId}, `${binding.itemId}: owner identity is local and exact`);
    const sourceReference = atPointer(owner, binding.sourceObjectPointer);
    let actualSourceObject;
    if (binding.sourceCategory === 'hireling-table-row-reference') {
      actualSourceObject = atPointer(owner, binding.fieldPointer.replace(/\/sourceReference$/, ''))?.sourceRowId;
    } else if (binding.sourceCategory.includes('note')) {
      actualSourceObject = atPointer(owner, binding.fieldPointer)?.id;
    } else {
      actualSourceObject = sourceReference?.sourceUnitId;
    }
    assert.equal(actualSourceObject, binding.sourceObject, `${binding.itemId}${binding.fieldPointer}: source object ID resolves to the same physical row, note, or bullet unit`);
    const sourceRegionIds = sourceReference?.verification?.regions || (sourceReference?.regionId ? [sourceReference.regionId] : []);
    for (const regionId of binding.regionIds || []) assert.ok(sourceRegionIds.includes(regionId), `${binding.itemId}${binding.sourceObjectPointer}: declared region ${regionId} is in the actual source reference`);
    const catalogPath = String(binding.catalog || '').replace(/^dist\//, '');
    const catalog = cohort.sourceCohort.catalogs.find(item => item.targetPath.replace(/^dist\//, '') === catalogPath);
    assert.ok(catalog, `${binding.itemId}: manual target points to one of the 48 closed catalogs`);
    for (const regionId of binding.regionIds || []) {
      const region = catalog.regions.find(item => item.id === regionId);
      assert.ok(region, `${binding.itemId}: manual region ${regionId} exists in its catalog`);
      assert.ok((binding.sourcePages || []).includes(region.printedPage), `${binding.itemId}: region ${regionId} is bound to its declared printed page`);
      assert.equal(region.book, binding.book, `${binding.itemId}: catalog page book agrees with manual source book`);
    }
  }
  const currentCanonical = inventory.fieldEvidenceBindings;
  const nativeExpected = cohort.nativeProjection;
  assert.ok(nativeExpected, 'fixture includes the actual native canonical projection');
  assert.ok(Number.isInteger(nativeExpected.canonicalBindingCount), 'frozen S2 native canonical denominator is derived from the actual candidate');
  assert.equal(currentCanonical.length, nativeExpected.canonicalBindingCount, 'actual full canonical inventory count matches the frozen native projection');
  sameHash(currentCanonical, nativeExpected.canonicalBindingArraySha256, 'actual full canonical inventory hash matches the frozen native projection');
  assert.deepEqual(currentCanonical.map(hash), nativeExpected.canonicalBindingObjectHashes, 'all actual canonical whole objects and exact order match the frozen native projection');
  assertOrderedSubsequence(currentCanonical, cohort.baseline.canonicalBindingHashes, 'all old canonical whole objects remain exactly once in relative order');
  assert.equal(nativeExpected.addedCanonicalBindingCount, nativeExpected.canonicalBindingCount - cohort.baseline.canonicalBindingCount, 'closed actual-native canonical delta count');
  const baselineCounts = new Map();
  for (const digest of cohort.baseline.canonicalBindingHashes) baselineCounts.set(digest, (baselineCounts.get(digest) || 0) + 1);
  const additionsCanonical = [];
  for (const binding of currentCanonical) {
    const digest = hash(binding), count = baselineCounts.get(digest) || 0;
    if (count) baselineCounts.set(digest, count - 1);
    else additionsCanonical.push(binding);
  }
  assert.deepEqual(countBy(additionsCanonical.map(binding => binding.sourceCategory)), nativeExpected.addedCanonicalCategoryCounts, 'native-added canonical category counts are exact');
  assert.deepEqual([...new Set(additionsCanonical.map(binding => binding.itemId))].sort(), nativeExpected.addedCanonicalOwnerIds, 'all native-added canonical entries belong to the exact 48 source owners');
  assert.deepEqual(countBy(additionsCanonical.map(binding => binding.reviewStatus)), nativeExpected.addedCanonicalReviewStatusCounts, 'native-added canonical target states remain exact and unpromoted');
  assert.ok(additionsCanonical.every(binding => binding.targetReview === null), 'all native-added canonical entries keep targetReview:null');
  assert.ok(additionsCanonical.every(binding => binding.sourceValueStatus === 'not-assessed-by-field-target-review' && binding.contextStatus === 'context-not-assessed'), 'all native-added canonical entries keep value and context unassessed');
  const actualByKey = new Map();
  for (const binding of additionsCanonical) {
    const key = targetKey(binding);
    actualByKey.set(key, [...(actualByKey.get(key) || []), binding]);
  }
  for (const binding of additions) {
    const key = targetKey(binding);
    assert.equal(actualByKey.get(key)?.length, 1, `${binding.itemId}${binding.fieldPointer}: exactly one new current canonical target matches its complete owner/source/page/region tuple`);
    const joined = actualByKey.get(key)[0];
    assertPending(joined, `${binding.itemId}${binding.fieldPointer}: canonical target`);
    assert.equal(joined.targetReview, null, `${binding.itemId}${binding.fieldPointer}: pending native canonical target has targetReview:null`);
    const compiledOwner = compiledRules.get(binding.itemId);
    const attachedSourceObject = atPointer(compiledOwner, binding.sourceObjectPointer);
    const compiledMatches = (attachedSourceObject?.evidenceBindings || []).filter(candidate => targetKey(candidate) === key);
    assert.equal(compiledMatches.length, 1, `${binding.itemId}${binding.fieldPointer}: one exact actual compiled native evidence binding matches the manual/canonical tuple`);
    assertPending(compiledMatches[0], `${binding.itemId}${binding.fieldPointer}: compiled native target`);
    assert.equal(compiledMatches[0].targetReview, null, `${binding.itemId}${binding.fieldPointer}: compiled pending target has targetReview:null`);
    assert.equal(hash(compiledMatches[0]), hash(joined), `${binding.itemId}${binding.fieldPointer}: owner-attached and canonical pending targets are the same whole object`);
  }
  assert.equal(countBy(additions.map(binding => binding.sourceCategory))['hireling-table-row-reference'], cohort.sourceCohort.manualTargetCountsByCategory['hireling-table-row-reference'], 'exact S2 row target declaration count');
  assert.equal(countBy(additions.map(binding => binding.sourceCategory))['hireling-table-note-reference'], cohort.sourceCohort.manualTargetCountsByCategory['hireling-table-note-reference'], 'exact S2 source-note declaration count');
  assert.equal(countBy(additions.map(binding => binding.sourceCategory))['hireling-table-note-page-reference'], cohort.sourceCohort.manualTargetCountsByCategory['hireling-table-note-page-reference'], 'exact S2 note-page declaration count');
  assert.equal(countBy(additions.map(binding => binding.sourceCategory))['hireling-procedure-bullet-reference'], cohort.sourceCohort.manualTargetCountsByCategory['hireling-procedure-bullet-reference'], 'exact S2 ordered bullet-page declaration count');
  assert.equal(inventory.fieldEvidenceBindings.filter(binding => binding.reviewStatus === 'field-target-reviewed').length, cohort.baseline.reviewedCanonicalBindingCount, 'no new target is promoted and the 760 reviewed count remains exact');
  assert.deepEqual(countBy(additions.map(binding => binding.reviewStatus)), {['field-target-pending']: additions.length}, 'every new manual canonical target remains pending');
  return additionsCanonical;
}

function assertOverrides(overrides, cohort) {
  sameHash(overrides.items || {}, cohort.baseline.existingItemsCanonicalHash, 'all existing citation item overrides remain exact');
  sameHash(overrides.priceStates || {}, cohort.baseline.existingPriceStatesCanonicalHash, 'all existing price-state overrides remain exact');
  const oldKeys = cohort.baseline.existingSourceExcerptKeys;
  const oldValues = Object.fromEntries(oldKeys.map(key => [key, overrides.sourceExcerpts?.[key]]));
  sameHash(oldValues, cohort.baseline.existingSourceExcerptsCanonicalHash, 'all existing source excerpt overrides remain exact');
  const added = cohort.sourceCohort.sourceExcerptOverrides;
  assert.equal(added.length, 48, 'exactly one new source excerpt override per owner');
  for (const expected of added) {
    const key = expected.path.replace(/^\/sourceExcerpts\//, '');
    sameHash(overrides.sourceExcerpts?.[key], expected.valueHash, `${expected.path}: source excerpt metadata stays exact`);
  }
  assert.equal(Object.keys(overrides.sourceExcerpts || {}).length, oldKeys.length + added.length, 'no missing or unsolicited source excerpt override entries');
}

function assertReviewsAndSeals(mechanics, seals, cohort) {
  assert.equal(mechanics.reviewRecords.length, cohort.baseline.mechanicsReviewCount, 'all 1215 existing mechanics review objects remain and no new review is inferred');
  assert.deepEqual(mechanics.reviewRecords.map(hash), cohort.baseline.mechanicsReviewHashes, 'all 1215 mechanics review whole objects remain in exact order');
  assert.ok(seals.seals.length >= cohort.baseline.sealCount, 'citation seals cannot be removed');
  assert.deepEqual(seals.seals.slice(0, cohort.baseline.sealCount).map(hash), cohort.baseline.sealHashes, 'the exact 1,798 existing citation seal whole objects remain as an unchanged prefix; new seals may only append');
}

function assertUnchangedSourceBytes(repoRoot, cohort) {
  for (const file of cohort.baseline.unchangedSourceFiles) {
    const bytes = readFileSync(resolve(repoRoot, file.path));
    assert.equal(bytes.length, file.bytes, `${file.path}: unchanged source-file byte length`);
    assert.equal(sha(bytes), file.sha256, `${file.path}: unchanged source-file bytes`);
  }
}

function readPlanBytes(path) {
  const absolute = resolve(path);
  const stat = lstatSync(absolute);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `${path}: copy target is a physical regular file`);
  assert.equal(stat.nlink, 1, `${path}: physical file has one link and is not shared by hardlink`);
  const bytes = readFileSync(absolute);
  return {absolute, bytes, stat};
}

function assertPngIdentity(bytes, image) {
  assert.ok(bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${image.image}: PNG signature`);
  assert.equal(bytes.readUInt32BE(16), image.width, `${image.image}: copied PNG width`);
  assert.equal(bytes.readUInt32BE(20), image.height, `${image.image}: copied PNG height`);
}

export function assertFrozenCatalog(catalog, catalogBytes, expected) {
  assert.equal(sha(catalogBytes), expected.sha256, `${expected.targetPath}: exact catalog bytes`);
  assert.equal(catalog.regions.length, expected.regionCount, `${expected.targetPath}: exact region count`);
  assert.deepEqual(catalog.regions.map(region => region.id), expected.regionIds, `${expected.targetPath}: ordered region IDs`);
  for (const region of catalog.regions) {
    const frozen = expected.regions.find(item => item.id === region.id);
    assert.ok(frozen, `${expected.targetPath}:${region.id}: region exists in the closed fixture`);
    sameHash(region, frozen.regionHash, `${expected.targetPath}:${region.id}: full region/source geometry exact`);
  }
}

// Validate one installed target from the closed hash/size/type manifest.
// This deliberately never opens a sourcePath; CI can use it from a clean
// checkout where private staging locations do not exist.
export function assertTargetAsset(repoRoot, planned, expected, expectedCatalog = null) {
  assert.equal(planned.sha256, expected.sha256, `${planned.targetPath}: planned exact target hash`);
  assert.ok(!/\.pdf$/i.test(planned.targetPath) && !/full[-_ ]?page/i.test(planned.targetPath), `${planned.targetPath}: no PDF or full-page source asset`);
  if (expected.type === 'catalog') assert.ok(planned.targetPath.endsWith('.json'), `${planned.targetPath}: catalogs are JSON only`);
  else assert.ok(planned.targetPath.endsWith('.png'), `${planned.targetPath}: only limited PNG crops are admitted`);
  const target = readPlanBytes(resolve(repoRoot, planned.targetPath));
  assert.equal(sha(target.bytes), expected.sha256, `${planned.targetPath}: target physical bytes match frozen hash`);
  assert.equal(target.stat.size, planned.sizeBytes, `${planned.targetPath}: exact copied file size`);
  if (expected.type === 'catalog') {
    const catalog = JSON.parse(target.bytes.toString('utf8'));
    assert.ok(expectedCatalog, `${planned.targetPath}: catalog has exact frozen fixture record`);
    assertFrozenCatalog(catalog, target.bytes, expectedCatalog);
  } else {
    assertPngIdentity(target.bytes, expected);
    assert.equal(target.stat.size, planned.sizeBytes, `${planned.targetPath}: actual crop is size-bound`);
  }
  return {bytes: target.bytes, stat: target.stat};
}

function assertAssets(repoRoot, copyPlan, cohort) {
  const expectedCatalogs = cohort.sourceCohort.catalogs;
  const expectedImages = cohort.sourceCohort.uniqueReferencedImages;
  const frozenPlan = cohort.sourceCohort.assetCopyPlan;
  assert.ok(frozenPlan, 'closed fixture includes the final asset-copy plan hash and ordered target manifest');
  assert.equal(copyPlan.privateFullSourcesIncluded, false, 'S2 target plan excludes full/private source files');
  assert.equal(copyPlan.catalogs, frozenPlan.catalogs, 'S2 target manifest contains the exact source catalog count');
  assert.equal(copyPlan.limitedImages, frozenPlan.limitedImages, 'S2 target manifest image count matches the exact frozen asset manifest');
  assert.equal(copyPlan.files.length, frozenPlan.fileCount, 'S2 target plan has no extra or omitted physical assets');
  const frozenPlanFiles = frozenPlan.files;
  assert.deepEqual(copyPlan.files.map(file => ({targetPath: file.targetPath, sha256: file.sha256, sizeBytes: file.sizeBytes, copyMode: file.copyMode, fileKind: file.fileKind})), frozenPlanFiles, 'S2 target plan exact file/hash/size/mode/order projection');
  const expectedByPath = new Map([
    ...expectedCatalogs.map(entry => [entry.targetPath, {...entry, type: 'catalog'}]),
    ...expectedImages.map(entry => [entry.targetPath, {...entry, type: 'limited image'}]),
  ]);
  assert.equal(expectedByPath.size, frozenPlan.fileCount, 'frozen plan has one entry for every closed catalog/image target');
  for (let index = 0; index < frozenPlanFiles.length; index++) {
    const planEntry = frozenPlanFiles[index], planned = copyPlan.files[index];
    const expected = expectedByPath.get(planEntry.targetPath);
    assert.ok(expected, `${planEntry.targetPath}: target is a closed catalog or limited image`);
    assert.equal(planned.sha256, expected.sha256, `${planned.targetPath}: planned exact source hash`);
    assert.ok(typeof planned.copyMode === 'string' && planned.copyMode.length > 0, `${planned.targetPath}: explicit S2 materialization mode is recorded`);
    assert.ok(!/\.pdf$/i.test(planned.targetPath) && !/full[-_ ]?page/i.test(planned.targetPath), `${planned.targetPath}: no PDF or full-page source asset`);
    let expectedImage = null;
    if (expected.type === 'catalog') {
      const expectedCatalog = expectedCatalogs.find(item => item.targetPath === planned.targetPath);
      assertTargetAsset(repoRoot, planned, expected, expectedCatalog);
    } else {
      expectedImage = expectedImages.find(item => item.targetPath === planned.targetPath);
      assert.ok(expectedImage, `${planned.targetPath}: exact image manifest entry exists`);
      assertTargetAsset(repoRoot, planned, {...expected, ...expectedImage});
    }
  }
  for (const image of expectedImages) {
    const regions = expectedCatalogs.flatMap(entry => entry.regions).filter(region => region.image === image.image);
    assert.ok(regions.length > 0, `${image.image}: each copied image is referenced by a catalog region`);
    assert.ok(regions.every(region => region.imageSha256 === image.sha256 && region.width === image.width && region.height === image.height), `${image.image}: all catalog references agree on the exact hash and dimensions`);
  }
}

function assertSourceCopies(copyPlan, cohort) {
  const expected = cohort.sourceCohort.assetCopyPlan.files;
  assert.equal(copyPlan.files.length, expected.length, 'source-copy verification uses the exact closed S2 asset manifest');
  for (let index = 0; index < expected.length; index++) {
    const planned = copyPlan.files[index], frozen = expected[index];
    assert.equal(planned.targetPath, frozen.targetPath, `${frozen.targetPath}: exact ordered source-copy target`);
    assert.equal(planned.sha256, frozen.sha256, `${frozen.targetPath}: exact source-copy hash`);
    assert.ok(typeof planned.sourcePath === 'string' && planned.sourcePath.length > 0, `${frozen.targetPath}: source-copy mode requires physical sourcePath`);
    const source = readPlanBytes(planned.sourcePath);
    assert.equal(sha(source.bytes), frozen.sha256, `${frozen.targetPath}: declared source bytes match frozen hash`);
    const target = readPlanBytes(resolve(copyPlan.repoRoot, planned.targetPath));
    assert.equal(source.bytes.length, target.bytes.length, `${frozen.targetPath}: exact physical source/target byte count`);
    assert.ok(source.stat.dev !== target.stat.dev || source.stat.ino !== target.stat.ino, `${frozen.targetPath}: target is not a hardlink to its source`);
  }
}

export function assertConsumerClosure({sourceScan, aliasAudit, published}, cohort) {
  const expected = cohort.sourceCohort.consumerProjection;
  assert.ok(expected, 'fixture closes production source-scan, alias-audit, and publisher reports');
  assert.equal(sourceScan.status, 'pass', 'production source-scan inventory passes');
  sameHash(sourceScan.value, expected.sourceScanReportSha256, 'complete source-scan report is exact');
  assert.deepEqual(sourceScan.value.counts, expected.sourceScanCounts, 'source-scan counts are exact');
  assert.equal(aliasAudit.status, 'pass', 'production exact-alias audit runs successfully');
  assert.equal(aliasAudit.value.structuralCheck.valid, true, 'production alias structural check is valid');
  sameHash(aliasAudit.value, expected.aliasReportSha256, 'complete exact-alias report is exact');
  assert.deepEqual(aliasAudit.value.denominators, expected.aliasDenominators, 'exact-alias denominators are exact');
  assert.equal(aliasAudit.value.missingAliases.length, 0, 'no exact alias is missing from the continuation groups');
  assert.equal(published.status, 'pass', 'production continuation validator and publisher pass');
  assertPublishedContinuations(published.value, cohort);
  return {sourceScan: sourceScan.value.counts, aliasAudit: aliasAudit.value.denominators, publisher: published.value.counts};
}

export function assertClosedHirelingsCurrentNativeSourceCohort({repoRoot, rawRules, data, overrides, manual, inventory, mechanics, seals, copyPlan, continuations, sourceScan, aliasAudit, published}, cohort, {checkAssets = true, checkSourceCopies = false} = {}) {
  const rawOwners = assertOwnerPayloads(rawRules, data, overrides, cohort);
  const ownerCounts = Object.fromEntries(['rules', 'spells', 'equipment', 'classes', 'matrices'].map(name => [name, data[name].length]));
  ownerCounts.progressionExplainer = data.progressionExplainer ? 1 : 0;
  assertSourcePayload(rawOwners, cohort);
  const continuationCounts = assertContinuations(continuations, cohort);
  const consumerCounts = assertConsumerClosure({sourceScan, aliasAudit, published}, cohort);
  assertOverrides(overrides, cohort);
  assertManualAndCanonical(rawOwners, new Map(data.rules.map(owner => [owner.id, owner])), manual, inventory, cohort);
  assertReviewsAndSeals(mechanics, seals, cohort);
  assertUnchangedSourceBytes(repoRoot, cohort);
  if (checkAssets) assertAssets(repoRoot, copyPlan, cohort);
  if (checkSourceCopies) {
    assert.ok(checkAssets, 'source-copy verification also requires target asset verification');
    assertSourceCopies({...copyPlan, repoRoot}, cohort);
  }
  return {
    status: 'pass',
    artifactType: 'proposed current-native Hirelings source cohort closure assertion',
    scope: 'actual current raw source, native build output, canonical/manual evidence, actual physical catalogs and limited PNG copy plan',
    counts: {owners: cohort.sourceCohort.ownerIds.length, rules: ownerCounts.rules, allOwners: cohort.baseline.compiledOwnerCount + cohort.sourceCohort.ownerIds.length, tables: cohort.sourceCohort.tableCount, rows: cohort.sourceCohort.sourceRows.length, cells: cohort.sourceCohort.sourceCellCount, notes: cohort.sourceCohort.notes.length, notePageTargets: cohort.sourceCohort.notePageTargetCount, bullets: cohort.sourceCohort.bulletFields.length, bulletPageTargets: cohort.sourceCohort.bulletPageTargetCount, manualTargets: cohort.sourceCohort.manualTargetCount, canonicalBindings: cohort.nativeProjection.canonicalBindingCount, catalogs: cohort.sourceCohort.catalogs.length, catalogRegions: cohort.sourceCohort.catalogs.reduce((sum, item) => sum + item.regionCount, 0), limitedImages: cohort.sourceCohort.uniqueReferencedImages.length},
    continuations: continuationCounts,
    consumers: consumerCounts,
    sourceGrades: {
      manualFieldTargets: 'pending',
      addedCanonicalReviewStatusCounts: cohort.nativeProjection.addedCanonicalReviewStatusCounts,
      allAddedTargetReviewNull: cohort.nativeProjection.allAddedCanonicalTargetReviewNull,
      allAddedSourceValueAndContextUnassessed: cohort.nativeProjection.allAddedCanonicalSourceAndContextUnassessed,
      defaults: 'unassessed',
    },
  };
}

export function readNativeInputs(repoRoot, copyPlanPath) {
  const read = path => JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));
  return {
    repoRoot,
    rawRules: read('rules.json'),
    data: read('dist/data.json'),
    overrides: read('citation-overrides.json'),
    manual: read('research/field-evidence-bindings.json'),
    inventory: read('research/price-source-inventory.json'),
    mechanics: read('research/mechanics-audit-progress.json'),
    seals: read('research/citation-evidence-seals.json'),
    continuations: read('research/citation-continuations.json'),
    copyPlan: JSON.parse(readFileSync(resolve(copyPlanPath), 'utf8')),
  };
}
