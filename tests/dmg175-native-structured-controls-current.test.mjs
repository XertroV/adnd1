import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const decode = (path, expected) => {
  const bytes = read(path);
  assert.equal(sha(bytes), expected, 'preserved actual failure bytes');
  return JSON.parse(gunzipSync(bytes));
};
const legacyIds = new Set(['cleric-turning-table', 'phb-hurled-weapons-and-missiles-table', 'ua-hurled-weapons-and-missiles-table']);
const sourceFacts = item => [
  ...['rows', 'symbols', 'procedure', 'footnotes', 'sourceNotes'].flatMap(key => item.table?.[key] || []),
  ...(item.table?.progressionNote ? [item.table.progressionNote] : []),
];
function helper({books, citations, shared, source}) {
  const context = {
    inlineSourceChip: (_reference, title, _extra, kind) => `<button class="${kind}" title="${title}"></button>`,
  };
  vm.createContext(context);
  vm.runInContext(books, context);
  vm.runInContext(citations, context);
  vm.runInContext(`${shared}\n${source}\nthis.resolveFact=exactTableFactSourceReference;`, context);
  if (source.includes('function ruleBulletSourceChips(')) vm.runInContext('this.bulletChips=ruleBulletSourceChips;', context);
  return context;
}
function legacyResolved(resolve, owners) {
  return owners.filter(owner => legacyIds.has(owner.id))
    .reduce((sum, owner) => sum + sourceFacts(owner).filter(fact => resolve(owner, fact) === fact.sourceReference).length, 0);
}
const bindingTargetKey = item => JSON.stringify([item.collection, item.itemId, item.fieldPointer, item.sourceObjectPointer]);
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  : JSON.stringify(value);
const canonicalSha = value => sha(Buffer.from(canonical(value)));
function proposedCounts(context, owners) {
  const appendix = owners.filter(owner => owner.id.startsWith('appendix-c-'));
  const rows = appendix.flatMap(owner => (owner.table?.rows || []).map(row => ({owner, row})));
  const bulletOwners = owners.filter(owner => owner.id.startsWith('appendix-c-') || owner.id === 'encounter-types');
  return {
    rows: rows.length,
    resolvedRows: rows.filter(({owner, row}) => context.resolveFact(owner, row) === row.sourceReference).length,
    bulletChips: bulletOwners.reduce((sum, owner) => sum + (owner.bullets || []).reduce((n, _text, index) =>
      n + (context.bulletChips(owner, index).match(/class="bullet-source-chip"/g) || []).length, 0), 0),
  };
}

test('pre-installation Party Magic control input kept all120 target fields pending', () => {
  const path = 'tests/fixtures/dmg175-native-structured-controls-pre-location-target-status-v1.json.gz';
  const bytes = read(path);
  const expectedSha256 = '4ae00aad5267062f5ff3d25afe619498dded4781eb4154da30b3173d7705d37b';
  assert.equal(sha(bytes), expectedSha256, 'pinned historical all-pending controls');
  const fixture = JSON.parse(gunzipSync(bytes));
  assert.equal(fixture.source.commit, 'bc819621e49788260bb34ea47c1f7a8b35af6edf');
  assert.equal(fixture.source.tree, 'e6bc420f70656825a926297b959bc6d98758bfcd');
  assert.equal(fixture.source.path, 'research/price-source-inventory.json');
  assert.equal(fixture.source.sha256, '3073ce4f92e772b91ede42cf111d118acaf4a66e636ebbab064b8085708ff3e6');
  const added = fixture.fieldEvidenceBindings.filter(binding => binding.collection === 'rules'
    && (binding.itemId.startsWith('appendix-c-') || binding.itemId === 'encounter-types' && binding.fieldPointer.startsWith('/bullets/'))
    && (/^\/table\/rows\//.test(binding.fieldPointer) || /^\/bullets\//.test(binding.fieldPointer)));
  assert.equal(added.length, 120);
  assert.ok(added.every(binding => binding.reviewStatus === 'field-target-pending'
    && binding.targetReview === null && binding.contextStatus === 'context-not-assessed'
    && binding.sourceValueStatus === 'not-assessed-by-field-target-review'), 'working controls do not promote target/value/context review');
  const current = JSON.parse(read('research/price-source-inventory.json'));
  const currentAdded = current.fieldEvidenceBindings.filter(binding => binding.collection === 'rules'
    && (binding.itemId.startsWith('appendix-c-') || binding.itemId === 'encounter-types' && binding.fieldPointer.startsWith('/bullets/'))
    && (/^\/table\/rows\//.test(binding.fieldPointer) || /^\/bullets\//.test(binding.fieldPointer)));
  assert.deepEqual(added.map(bindingTargetKey).sort(), currentAdded.map(bindingTargetKey).sort(), 'historical control cohort has the exact same 120 target identities');
});

test('preserved actual V2 helper loses all82 existing controls; its exact predecessor retains them', () => {
  const fixture = decode('tests/fixtures/dmg175-v2-lost-existing-controls-before-v1.json.gz', 'a743ee952a748f7114b44108b5b2c0f0ad725f0cd7747193dabb59e3cf7bcc90');
  const old = helper({books: fixture.beforeBooks, citations: fixture.citations, shared: fixture.sharedProductionHelpers, source: fixture.beforeHelper});
  const failed = helper({books: fixture.candidateBooks, citations: fixture.citations, shared: fixture.sharedProductionHelpers, source: fixture.candidateHelper});
  assert.equal(legacyResolved(old.resolveFact, fixture.actualOwnerObjects), 82);
  assert.equal(legacyResolved(failed.resolveFact, fixture.actualOwnerObjects), 0);
});

test('preserved actual V3 helper loses51 supplemental controls on real compiler output', () => {
  const fixture = decode('tests/fixtures/dmg175-v3-real-compiler-controls-before-v1.json.gz', 'd9a5c5e07c6cd20606b27d86351c73dcee413b8822be41a0c484a6b766fd01d0');
  assert.equal(fixture.data.fields, 4931);
  const failed = helper({books: fixture.books, citations: fixture.citations, shared: fixture.sharedProductionHelpers, source: fixture.fragment});
  assert.equal(legacyResolved(failed.resolveFact, fixture.ownerObjects), 82);
  assert.deepEqual(proposedCounts(failed, fixture.ownerObjects), {rows: 87, resolvedRows: 65, bulletChips: 4});
});

test('current canonical compiler output preserves82 existing and all87 row plus33 bullet controls', () => {
  const prior = JSON.parse(gunzipSync(read('tests/fixtures/cleric-turning-helper-schema-history.json.gz')));
  const app = read('dist/app.js').toString();
  const start = app.indexOf('function displaySourceValue(');
  const end = app.indexOf('function ruleTableHTML(', start);
  assert.ok(start >= 0 && end > start, 'current helper block boundaries');
  const current = helper({books: read('dist/books.js').toString(), citations: read('dist/citations.js').toString(), shared: prior.sharedProductionHelpers, source: app.slice(start, end)});
  const data = JSON.parse(read('dist/data.json'));
  assert.equal(legacyResolved(current.resolveFact, data.rules), 82);
  assert.deepEqual(proposedCounts(current, data.rules), {rows: 87, resolvedRows: 87, bulletChips: 33});
  const mistletoe = data.rules.find(owner => owner.id === 'phb-druid-mistletoe-spell-components');
  assert.ok(mistletoe, 'the fourth existing structured table remains in the current universe');
  assert.ok(sourceFacts(mistletoe).every(fact => current.resolveFact(mistletoe, fact) === null), 'unbound Mistletoe facts do not acquire fabricated source controls');
  const bindings = JSON.parse(read('research/price-source-inventory.json')).fieldEvidenceBindings;
  const added = bindings.filter(binding => binding.collection === 'rules'
    && (binding.itemId.startsWith('appendix-c-') || binding.itemId === 'encounter-types' && binding.fieldPointer.startsWith('/bullets/'))
    && (/^\/table\/rows\//.test(binding.fieldPointer) || /^\/bullets\//.test(binding.fieldPointer)));
  assert.equal(added.length, 120);
  const reviewPath = 'research/dmg175-party-magic-current-h-readiness-v2/current-location-review-v2.json';
  const reviewBytes = read(reviewPath);
  const reviewSha256 = '1b5cf48445b65f80dbf411bac7e80a2bf0b5ff0cd1df246068409b65c06ee374';
  assert.equal(sha(reviewBytes), reviewSha256, 'pinned Party Magic location-review lineage');
  const review = JSON.parse(reviewBytes);
  assert.equal(review.scope.acceptedTargets, 13);
  assert.equal(review.scope.locationOnly, true);
  assert.equal(review.scope.productionMutation, false);
  assert.equal(review.scope.rootIndependentRecheckRequired, true, 'the V2 receipt records that a current-content recheck was required');
  for (const excluded of ['numeric/source-value grading', 'context completeness or adequacy', 'default/first-region selection', 'mechanics interpretation']) {
    assert.ok(review.scope.excluded.includes(excluded), `location receipt excludes ${excluded}`);
  }
  assert.deepEqual(review.currentInventory.currentTargetReviewStatusCounts, {
    acceptedLocationOnly: 13, sourceValueGradePromotions: 0, contextPromotions: 0, defaultPromotions: 0,
  });
  const rootReviewPath = 'research/dmg175-party-magic-current-s1-location-recheck-v1.json';
  const rootReviewBytes = read(rootReviewPath);
  const rootReviewSha256 = 'f607a6fb58c4b61469c109db7182355bd83cbb7e1ab6e7357175cfbd89b0008f';
  assert.equal(sha(rootReviewBytes), rootReviewSha256, 'pinned root acceptance summary for current S1 rows');
  const rootReview = JSON.parse(rootReviewBytes);
  assert.equal(rootReview.status, 'ROOT_ACCEPTED_THIRTEEN_EXACT_CURRENT_S1_LOCATION_TARGETS_ONLY');
  assert.equal(rootReview.independentRootRecheckCompleted, true);
  assert.equal(rootReview.independentRootRecheckRequired, false);
  assert.equal(rootReview.targetCount, 13);
  assert.equal(rootReview.sourceEpoch.role, 'Current S1 candidate; not deployed');
  assert.equal(rootReview.supersedesOnlyPendingVisualCondition.receiptPath, reviewPath);
  assert.equal(rootReview.supersedesOnlyPendingVisualCondition.sha256, reviewSha256);
  assert.equal(rootReview.sourceEpoch.dataRawSha256, sha(read('dist/data.json')), 'root recheck is bound to this exact current S1 data');
  assert.equal(rootReview.sourceEpoch.catalogRawSha256, sha(read(rootReview.sourceEpoch.catalogPath)), 'root recheck is bound to the active Party Magic catalog');
  assert.equal(rootReview.gradeBoundary.fieldTargetLocationOnly, true);
  assert.equal(rootReview.gradeBoundary.sourceValueAssessed, false);
  assert.equal(rootReview.gradeBoundary.numericOrMechanicsAssessed, false);
  assert.equal(rootReview.gradeBoundary.contextAdequacyAssessed, false);
  assert.equal(rootReview.gradeBoundary.defaultOrFirstRegionAssessed, false);
  assert.equal(rootReview.gradeBoundary.newGradeChangesPerformed, false);
  const expectedLocationTargets = review.targets.map(target => bindingTargetKey(target.expectedTargetIdentity)).sort();
  const rootAcceptedTargets = rootReview.targets.map(target => bindingTargetKey(target.identity)).sort();
  assert.deepEqual(rootAcceptedTargets, expectedLocationTargets, 'root acceptance covers exactly the 13 receipt rows');
  const currentLocationTargets = added.filter(binding => binding.reviewStatus === 'field-target-reviewed');
  assert.equal(currentLocationTargets.length, 13);
  assert.deepEqual(currentLocationTargets.map(bindingTargetKey).sort(), expectedLocationTargets, 'only the exact 13 receipt rows move to location-reviewed');
  const manualBindings = JSON.parse(read('research/field-evidence-bindings.json')).bindings;
  const currentData = JSON.parse(read('dist/data.json'));
  const owner = currentData.rules.find(item => item.id === 'appendix-c-party-magic-distribution');
  assert.ok(owner, 'current Party Magic owner is present');
  for (const accepted of rootReview.targets) {
    const key = bindingTargetKey(accepted.identity);
    const currentBinding = added.find(binding => bindingTargetKey(binding) === key);
    const manuals = manualBindings.filter(binding => bindingTargetKey(binding) === key);
    const rowIndex = Number(accepted.identity.fieldPointer.match(/^\/table\/rows\/(\d+)$/)?.[1]);
    const row = owner.table.rows[rowIndex];
    assert.ok(currentBinding, `current target binding exists: ${key}`);
    assert.equal(manuals.length, 1, `one canonical manual binding exists: ${key}`);
    assert.ok(row, `current source row exists: ${key}`);
    assert.equal(canonicalSha(currentBinding), accepted.currentBindingCanonicalSha256, `root-bound current inventory record: ${key}`);
    assert.equal(canonicalSha(manuals[0]), accepted.currentManualCanonicalSha256, `root-bound manual record: ${key}`);
    assert.equal(canonicalSha(row), accepted.currentOwnerRowCanonicalSha256, `root-bound owner row: ${key}`);
    assert.equal(canonicalSha(row.sourceReference), accepted.currentSourceObjectCanonicalSha256, `root-bound source object: ${key}`);
  }
  assert.equal(added.filter(binding => binding.reviewStatus === 'field-target-pending').length, 107);
  assert.ok(added.every(binding => binding.sourceValueStatus === 'not-assessed-by-field-target-review'
    && binding.contextStatus === 'context-not-assessed'), 'all 120 retain unassessed source-value and context status');
  const acceptedByKey = new Map(rootReview.targets.map(target => [bindingTargetKey(target.identity), target]));
  assert.ok(currentLocationTargets.every(binding => {
    const accepted = acceptedByKey.get(bindingTargetKey(binding));
    const evidence = accepted?.evidence;
    const region = binding.regionEvidence?.find(item => item.regionId === accepted?.regionId);
    return accepted?.visualDecision === 'ACCEPTED_EXACT_ROW_LOCATION_ONLY'
      && accepted.printedPage === binding.printedPage && accepted.pdfPage === binding.pdfPage
      && region && region.sourceSha256 === evidence.sourceSha256
      && region.imageSha256 === evidence.imageSha256
      && region.focusSha256 === evidence.focusSha256
      && region.contentSha256 === evidence.contentSha256
      && binding.targetReview?.status === 'confirmed'
      && binding.targetReview.independent === true
      && binding.targetReview.scope === 'party-magic-exact-row-location-only'
      && binding.targetReview.evidence === reviewPath
      && binding.targetReview.evidenceSha256 === reviewSha256;
  }), 'the 13 current bindings match the root-accepted location, page and exact region hashes');
  assert.ok(added.filter(binding => binding.reviewStatus === 'field-target-pending').every(binding => binding.targetReview === null), 'the remaining107 controls stay pending');
});
