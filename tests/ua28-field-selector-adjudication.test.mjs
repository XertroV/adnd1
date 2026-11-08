import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {assertPrimaryRowEvidence, citationRegionRole} from '../tools/citation-region-role.mjs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const selectorBaselinePath = 'research/source-audit-batch5-ua28-field-selector-baseline.json';
const proposalPath = 'research/source-audit-batch5-ua28-repair.json';
const roleBaselinePath = 'research/source-audit-batch5-field-region-role-baseline.json';
const roleFullPath = 'research/source-audit-batch5-field-region-role-baseline.json.gz';
const geometryPath = 'research/ua28-geometry-focus-calibration.json';
const reportPath = 'research/source-audit-batch5-ua28-field-selector-adjudication.json';
const baseline = read(selectorBaselinePath);
const proposals = read(proposalPath);
const roleBaseline = read(roleBaselinePath);
const geometry = read(geometryPath);
const report = read(reportPath);
const key = row => `${row.itemId}|${row.fieldPointer}`;
const proposalByKey = new Map(proposals.fieldBindingProposals.map(row => [key(row), row]));
const decisionByKey = new Map(report.decisions.map(row => [row.key, row]));
const data = read('dist/data.json');
const expectedHeaderRows = {
  'phb-sling-bullet': 'ua-28-1fd6c783421b2c7b',
  'phb-sling-stone': 'ua-28-607d1b22ce3047f9',
  'ua-knife': 'ua-28-0703212be457ca70',
  'ua-lasso': 'ua-28-9f41c065eb8b505e',
};
const noteFieldPointer = '/fields/Additional missile range adjustments (UA p.28)';
const catalogFor = itemId => {
  const item = data.equipment.find(row => row.id === itemId);
  assert.ok(item, `${itemId} exists in assembled data`);
  const catalogPath = `dist/${item.sourceExcerpts.catalog}`;
  return {catalogPath, catalog: read(catalogPath)};
};
const regionAt = (catalog, id) => {
  const region = catalog.regions.find(row => row.id === id);
  assert.ok(region, `catalog contains stable region ${id}`);
  return region;
};
const rectMatchesReview = (actual, approved, tolerance = 1e-8) => actual.length === approved.length &&
  actual.every((value, index) => Math.abs(value - approved[index]) <= tolerance);

test('selector baselines freeze all 69 originals before bindings and preserve the 4,328-binding role universe', () => {
  const selectorBytes = readFileSync(selectorBaselinePath);
  const proposalBytes = readFileSync(proposalPath);
  const roleBytes = readFileSync(roleBaselinePath);
  const roleFullBytes = readFileSync(roleFullPath);
  assert.equal(baseline.capturedBeforeApplyingAnyProposedFieldBindings, true);
  assert.equal(sha(selectorBytes), '5aa803599e11e47eea9ab0f3454fc91a6a85dd448df78b770e89fd414c5507b5');
  assert.equal(sha(proposalBytes), '81f0ec41e8da09388c0bd3b7703d7f3e0929e66a48231af88aee9c8f55592095');
  assert.equal(baseline.rows.length, 69);
  assert.equal(baseline.counts.headingAsRowTargets, 12);
  assert.equal(sha(roleBytes), '53e55d8221667db7bde90afbd459e2b9003280b38919a73d30078421de678c05');
  assert.equal(sha(roleFullBytes), '2f8a86f2625dfe7a5c26b54455ef70863f83002d064a5d01bd8433bb50df7750');
  assert.equal(roleBaseline.counts.bindings, 4328);
  assert.equal(JSON.parse(gunzipSync(roleFullBytes)).rows.length, 4328);
  assert.deepEqual(report.counts, {
    fieldTargets: 69,
    newSelectorTargets: 66,
    rowPrimary: 47,
    passagePrimary: 19,
    preservedExistingAklysTargets: 3,
    historicalHeadingAsRowTargets: 12,
  });
  assert.deepEqual(report.decisions.map(row => row.key), baseline.rows.map(key));
  for (const original of baseline.rows) {
    const decision = decisionByKey.get(key(original));
    assert.ok(decision, `${key(original)} has a corrected counterpart`);
    assert.deepEqual(decision.originalBaselineRow, original, `${key(original)} retains its exact pre-binding selector record`);
    assert.deepEqual(decision.originalProposal, proposalByKey.get(key(original)), `${key(original)} retains its original proposal`);
  }
});

test('all 12 heading-as-row proposals now select their approved owner row', () => {
  const wrong = baseline.rows.filter(row => row.badHeadingTarget);
  assert.equal(wrong.length, 12);
  for (const original of wrong) {
    const expectedRegionId = expectedHeaderRows[original.itemId];
    assert.ok(expectedRegionId, `approved row mapping exists for ${original.itemId}`);
    const decision = decisionByKey.get(key(original));
    if (original.fieldPointer === noteFieldPointer) {
      assert.equal(decision.corrected.primaryEvidenceRole, 'passage');
      assert.ok(decision.corrected.rowContextTargets.some(row => row.regionId === expectedRegionId));
      assert.equal(decision.corrected.orderedRegionIds[0], decision.corrected.primaryRegionId);
    } else {
      assert.equal(decision.corrected.primaryEvidenceRole, 'row');
      assert.equal(decision.corrected.primaryRegionId, expectedRegionId);
      assert.deepEqual(decision.corrected.orderedRegionIds, [expectedRegionId]);
    }
    const {catalog} = catalogFor(original.itemId);
    assert.equal(citationRegionRole(regionAt(catalog, expectedRegionId)), 'declared-row');
    assert.equal(citationRegionRole(regionAt(catalog, original.rowTargets[0].regionId)), 'heading-context', 'the old heading region remains pinned as the bad preimage');
  }
});

test('19 Additional missile range adjustment proposals select the AC note before correct row context', () => {
  const wrongPurpose = baseline.rows.filter(row => row.fieldPointer === noteFieldPointer);
  assert.equal(wrongPurpose.length, 19);
  assert.equal(report.preCreationMisselectors.length, 19);
  const approvedACFocus = geometry.normalizedFoci['armor-class-adjustment-note'];
  const broaderRateFocus = geometry.normalizedFoci['fire-rate-and-range-legend'];
  assert.notDeepEqual(approvedACFocus, broaderRateFocus);

  for (const original of wrongPurpose) {
    const decision = decisionByKey.get(key(original));
    const proposal = proposalByKey.get(key(original));
    const misselector = report.preCreationMisselectors.find(row => row.key === key(original));
    assert.ok(misselector, `${key(original)} is captured as wrong-purpose before note-region creation`);
    assert.equal(misselector.noteRegionAbsentBeforeCreation, true);
    assert.deepEqual(misselector.originalPrimaryRegionIds, proposal.rowTargets.map(row => row.regionId));
    assert.equal(misselector.fieldLabel, 'Additional missile range adjustments (UA p.28)');
    assert.match(misselector.component, /shared range note/i);
    assert.equal(decision.corrected.primaryEvidenceRole, 'passage');
    assert.equal(decision.corrected.requiresPassageEvidence, true);
    assert.equal(decision.corrected.requiresRowEvidence, false);
    assert.equal(decision.corrected.primaryRegionId, `ua28-additional-range-note-${original.itemId}`);
    assert.deepEqual(decision.corrected.orderedRegionIds.slice(1), decision.corrected.rowContextTargets.map(row => row.regionId));
    assert.ok(decision.corrected.rowContextTargets.length >= 1, `${key(original)} retains owner row context`);
    assert.equal(decision.corrected.orderedRegionIds[0], decision.corrected.primaryRegionId);

    const {catalog, catalogPath} = catalogFor(original.itemId);
    const note = regionAt(catalog, decision.corrected.primaryRegionId);
    const sourceNote = regionAt(catalog, decision.noteSourceBeforeCreation.regionId);
    assert.equal(decision.catalogPath, catalogPath);
    assert.equal(note.role, 'note');
    assert.equal(citationRegionRole(note), 'declared-passage');
    assert.equal(note.book, 'UA');
    assert.equal(note.printedPage, 28);
    assert.equal(note.pdfPage, 29);
    assert.equal(note.image, 'ua-28-f9e1d616b1cec48a.png');
    assert.equal(note.sha256, 'f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b');
    assert.equal(note.focusRects.length, 1, 'only one focused paragraph is selected');
    assert.ok(rectMatchesReview(note.focusRects[0], approvedACFocus), 'focus matches the reviewed second AC-adjustment rectangle within catalog rounding');
    assert.notDeepEqual(note.focusRects, [sourceNote.focusRects[0]], 'the separate fire-rate/range-label paragraph is not selected');
    assert.deepEqual(note.boundsPdfPoints, sourceNote.boundsPdfPoints);
    assert.deepEqual(note.normalizedPageRect, sourceNote.normalizedPageRect);
    assert.deepEqual(note.focusRects[0], sourceNote.focusRects[1]);
    assert.ok(rectMatchesReview(sourceNote.focusRects[0], broaderRateFocus), 'old note region retains the distinct fire-rate/range-label paragraph');
    assert.equal(note.verificationScope, 'source-excerpt', 'source-location coverage does not promote field-value grade');
    assert.deepEqual(Object.keys(note.checkedFields), ['sourceLocation'], 'new note region does not claim numeric field verification');
    assert.match(note.title, /AC|Armor Class/i);
    assert.match(note.summary, /note|passage/i);
    assert.doesNotMatch(note.summary, /rate of fire/i);
    assert.equal(sourceNote.id, decision.noteSourceBeforeCreation.regionId, 'old notes region keeps its stable ID');
    assert.equal(sourceNote.image, decision.noteSourceBeforeCreation.image);
    assert.equal(sourceNote.sha256, decision.noteSourceBeforeCreation.imageSha256);
    assert.deepEqual(sourceVisualRegionHashes(sourceNote), decision.noteSourceBeforeCreation.regionHashes);

    for (const target of decision.corrected.rowContextTargets) {
      assert.equal(citationRegionRole(regionAt(catalog, target.regionId)), 'declared-row', `${target.regionId} is contextual row evidence`);
    }
    assert.doesNotThrow(() => assertPrimaryRowEvidence({itemId:original.itemId,fieldPointer:original.fieldPointer,
      reviewStatus:'field-target-reviewed',requiresPassageEvidence:true,regionIds:decision.corrected.orderedRegionIds},catalog));
  }
});

test('47 other new fields require a row first, while the three already-reviewed Aklys selectors stay unchanged', () => {
  const aklys = baseline.rows.filter(row => row.itemId === 'ua-aklys-hurled');
  assert.equal(aklys.length, 3);
  const preserved = new Set(aklys.map(key));
  const newRows = baseline.rows.filter(row => !preserved.has(key(row)) && row.fieldPointer !== noteFieldPointer);
  assert.equal(newRows.length, 47);
  for (const original of newRows) {
    const decision = decisionByKey.get(key(original));
    assert.equal(decision.corrected.primaryEvidenceRole, 'row');
    assert.equal(decision.corrected.requiresRowEvidence, true);
    assert.equal(decision.corrected.requiresPassageEvidence, false);
    assert.equal(decision.corrected.primaryRegionId, decision.corrected.orderedRegionIds[0]);
    const {catalog} = catalogFor(original.itemId);
    assert.equal(citationRegionRole(regionAt(catalog, decision.corrected.primaryRegionId)), 'declared-row');
    assert.doesNotThrow(() => assertPrimaryRowEvidence({itemId:original.itemId,fieldPointer:original.fieldPointer,
      reviewStatus:'field-target-reviewed',requiresRowEvidence:true,regionIds:decision.corrected.orderedRegionIds},catalog));
  }
  for (const original of aklys) {
    const decision = decisionByKey.get(key(original));
    assert.equal(decision.disposition, 'preserve-existing-reviewed-target');
    assert.deepEqual(decision.corrected.orderedRegionIds, proposalByKey.get(key(original)).rowTargets.map(row => row.regionId));
    assert.equal(decision.corrected.valueGradeChanged, false);
  }
});
