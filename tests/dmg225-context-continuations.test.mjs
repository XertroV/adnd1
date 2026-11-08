import {readBeforeJoFile as readFileSync} from './helpers/batch6-jo-fixture.mjs';
import {frozenDmgBeforeManifest,dmgContextBefore} from './helpers/dmg-context-frozen-manifest.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

import {gunzipSync} from 'node:zlib';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const baseline = read('research/source-audit-batch5-table-context-baseline.json');
const baselineFull = JSON.parse(gunzipSync(readFileSync('research/source-audit-batch5-table-context-baseline-full.json.gz')).toString('utf8'));
const requiredLeadInBoundsPdfPoints = [16, 706, 282, 756]; // Independently checked against DMG PDF page 225.

test('pre-repair DMG p.225 context snapshot records the missing exclusion-list lead-in', () => {
  assert.equal(baseline.catalogCount, 1015);
  assert.equal(baseline.regionCount, 2859);
  assert.equal(baseline.reviewCohort.physicalRows, 182);
  assert.equal(baseline.reviewCohort.targetBindings, 156);
  assert.equal(baseline.knownFailure.status, 'source-confirmed-missing-exclusion-list-lead-in');

  const oldTable = baseline.reviewCohort.contextAssets.find(asset => asset.image === 'dmg-225-2f9de8a9b21e35e1.png');
  const oldNotes = baseline.reviewCohort.contextAssets.find(asset => asset.image === 'dmg-225-51d14c515e96b1bb.png');
  assert.ok(oldTable);
  assert.ok(oldNotes);
  assert.deepEqual(oldTable.boundsPdfPoints, [16, 33, 282, 700]);
  assert.deepEqual(oldNotes.boundsPdfPoints, [303, 20, 564, 175]);
  assert.deepEqual(requiredLeadInBoundsPdfPoints, [16, 706, 282, 756]);
  assert.ok(oldTable.boundsPdfPoints[3] < requiredLeadInBoundsPdfPoints[3], 'the baseline table crop ends before the lead-in and load paragraph');
  assert.match(oldNotes.scope, /lead-in not included/);
});

import {createHash} from 'node:crypto';
import {auditRequiredSegmentPresence} from '../tools/continuation-contract.mjs';
import {auditContinuationOrder} from '../tools/continuation-order-audit.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const continuationReport = read('research/source-audit-batch5-dmg225-context-repair.json');
const continuationManifest = read('research/citation-continuations.json');
const finalContinuationIntegration = read('research/source-audit-batch5-continuation-final-integration.json');
const oldTablePath = 'dist/scans/verified/dmg-225-2f9de8a9b21e35e1.png';
const oldNotesPath = 'dist/scans/verified/dmg-225-51d14c515e96b1bb.png';
const newTablePath = 'dist/scans/verified/dmg-225-d1f201bb58ae9b41.png';
const newNotesPath = 'dist/scans/verified/dmg-225-b2576ee304734e9b.png';

function canonicalHash(value) {
  return hash(Buffer.from(JSON.stringify(value)));
}

test('extended table and right-column continuation retain old pixels and exact source geometry', () => {
  const oldTableBytes = readFileSync(oldTablePath);
  const oldNotesBytes = readFileSync(oldNotesPath);
  const newTableBytes = readFileSync(newTablePath);
  const newNotesBytes = readFileSync(newNotesPath);
  assert.equal(hash(oldTableBytes), '2f9de8a9b21e35e163f4156a5b578ca51e8bd552527d3630c1b030d850f924a1');
  assert.equal(hash(oldNotesBytes), '51d14c515e96b1bb8f6b72ad5db9f16ee75794d5969bda9030b781e858525c51');
  assert.equal(hash(newTableBytes), 'd1f201bb58ae9b41da0277981c467fdff78120108c68c5dff647fcc58dca0d99');
  assert.equal(hash(newNotesBytes), 'b2576ee304734e9bbdae553a7d7577fac22df69a73e08102316e08a6ace6f565');
  assert.deepEqual(continuationReport.assets.extendedTable.new.boundsPdfPoints, [16, 33, 282, 756]);
  assert.deepEqual(continuationReport.assets.rightContinuation.new.boundsPdfPoints, [303, 33, 565, 175]);
  assert.equal(continuationReport.assets.extendedTable.new.dimensions[1], 2169);
  assert.deepEqual(continuationReport.assets.rightContinuation.new.dimensions, [786, 426]);
  assert.equal(continuationReport.counts.targetRowGroups, 38);
  assert.equal(continuationReport.counts.affectedCatalogs, 34);
  assert.equal(continuationReport.counts.additionalNoteAliases, 4);
  assert.equal(continuationReport.counts.totalGroups, 60);
  assert.equal(continuationReport.counts.totalSegments, 120);

  assert.equal(continuationReport.catalogEdits.length, 34);
  for (const edit of continuationReport.catalogEdits) {
    const baselineHashes = [...new Set(baselineFull.rows.filter(row => row.catalog === edit.catalog).map(row => row.catalogSha256))];
    assert.deepEqual(baselineHashes, [edit.beforeSha256], `${edit.catalog} baseline hash`);
    const catalog = read(edit.catalog);
    assert.equal(new Set(edit.changedDmg225RegionIds).size, edit.affectedRegionCount, `${edit.catalog} receipt region count`);
    for (const regionId of edit.changedDmg225RegionIds) {
      assert.ok(catalog.regions.some(region => region.id === regionId), `${edit.catalog}: scoped DMG region ${regionId} remains present`);
    }
  }
});

test('all 38 encumbrance row continuations bind exact images, detect every missing/reversed part, and preserve group order', () => {
  const groups = continuationManifest.groups.filter(group => group.id.startsWith('dmg225-encumbrance-'));
  assert.equal(groups.length, 38);
  assert.deepEqual(groups.map(group => group.id), continuationReport.continuationGroups.map(group => group.id));
  assert.equal(continuationReport.counts.totalGroups, 60, 'the DMG receipt records its historical 60-group snapshot');
  assert.equal(continuationReport.counts.totalSegments, 120, 'the DMG receipt records its historical 120-segment snapshot');
  assert.ok(continuationManifest.groups.length >= 60, 'the current manifest retains the DMG-era prefix');
  assert.equal(continuationReport.continuationManifest.preexistingGroupPrefixCount, 22);
  for (let index = 0; index < 22; index++) {
    const expected = continuationReport.continuationManifest.preexistingGroupSnapshots[index];
    assert.equal(continuationManifest.groups[index].id, expected.id);
    const replacement = finalContinuationIntegration.replacements.find(item => item.groupId === expected.id);
    if (replacement) {
      assert.equal(canonicalHash(replacement.before), expected.sha256, `${expected.id} replacement before-state matches the DMG-era prefix`);
      assert.deepEqual(continuationManifest.groups[index], replacement.after, `${expected.id} matches the exact later replacement receipt`);
    } else {
      assert.equal(canonicalHash(continuationManifest.groups[index]), expected.sha256, `${expected.id} changed outside the five receipt-backed replacements`);
    }
  }
  assert.equal(finalContinuationIntegration.replacements.length, 5, 'only five historical groups have receipt-backed replacements');
  assert.deepEqual(continuationManifest.groups.slice(22, 60), continuationReport.continuationGroups, 'the 38 DMG groups remain an exact immutable prefix');
  assert.equal(continuationManifest.groups.slice(0, finalContinuationIntegration.after.groups).length, finalContinuationIntegration.after.groups);
  const laterGroups = [...read('research/source-audit-batch5-ua10-crop-integration.json').addedGroups, read('research/source-audit-batch5-continuation-alias-integration.json').addedGroup];
  assert.deepEqual(frozenDmgBeforeManifest.groups.slice(finalContinuationIntegration.after.groups), laterGroups);
  assert.equal(continuationManifest.groups.slice(0, finalContinuationIntegration.after.groups).reduce((total, group) => total + group.segments.length, 0), finalContinuationIntegration.after.segments);

  const aliasCatalogKeys = new Set();
  let missingCasesChecked = 0;
  let reversedCasesChecked = 0;
  let currentImageBindingsChecked = 0;
  for (const group of groups) {
    assert.equal(group.segments.length, 2, `${group.id} segment count`);
    assert.deepEqual(group.segments.map(segment => segment.order), [1, 2]);
    assert.deepEqual(group.segments.map(segment => segment.role), ['opening', 'continuation']);
    assert.deepEqual(group.requiredRegionIds, group.segments.map(segment => segment.regionId));
    const catalog = read(`dist/${group.catalog}`);
    assert.equal(catalog.sources.DMG.sha256, '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
    const table = catalog.regions.find(region => region.id === group.segments[0].regionId);
    const notes = catalog.regions.find(region => region.id === group.segments[1].regionId);
    assert.ok(table, `${group.id} opening row exists`);
    assert.ok(notes, `${group.id} continuation exists`);
    assert.equal(table.image, 'dmg-225-d1f201bb58ae9b41.png');
    assert.equal(table.sha256, group.segments[0].imageSha256);
    assert.deepEqual(table.boundsPdfPoints, [16, 33, 282, 756]);
    assert.equal(notes.image, 'dmg-225-b2576ee304734e9b.png');
    assert.equal(notes.sha256, group.segments[1].imageSha256);
    assert.deepEqual(notes.boundsPdfPoints, [303, 33, 565, 175]);
    assert.deepEqual(notes.focusRects, [], 'continuation remains unmarked context');
    assert.equal(notes.role, 'context');
    currentImageBindingsChecked += 2;
    assert.ok(catalog.regions.indexOf(table) < catalog.regions.indexOf(notes), `${group.id} opening row precedes its notes segment`);
    const present = auditRequiredSegmentPresence(group, catalog);
    assert.deepEqual(present.missing, [], `${group.id} missing segments`);
    assert.deepEqual(present.mismatches, [], `${group.id} image binding`);
    assert.deepEqual(present.orderMismatches, [], `${group.id} region order`);

    for (const segment of group.segments) {
      const missingCatalog = structuredClone(catalog);
      missingCatalog.regions = missingCatalog.regions.filter(region => region.id !== segment.regionId);
      const missing = auditRequiredSegmentPresence(group, missingCatalog);
      assert.deepEqual(missing.missing.map(entry => entry.regionId), [segment.regionId], `${group.id} missing-${segment.role} detector`);
      missingCasesChecked++;
    }

    const reversed = {...group, segments: group.segments.map(segment => ({...segment, order: 3 - segment.order}))};
    const reversedOrder = auditContinuationOrder(reversed, catalog);
    assert.equal(reversedOrder.classification, 'confirmed-order-defect', `${group.id} reversed-order detector`);
    reversedCasesChecked++;

    if (group.segments[1].regionId !== 'batch5-dmg225-encumbrance-notes') {
      aliasCatalogKeys.add(`${group.catalog}|${group.segments[1].regionId}`);
    }
  }
  assert.equal(aliasCatalogKeys.size, 4);
  assert.equal(continuationReport.aliasMappings.length, 4);
  assert.equal(missingCasesChecked, 76);
  assert.equal(reversedCasesChecked, 38);
  assert.equal(currentImageBindingsChecked, 76);
});

test('every expanded DMG row focus is the un-inset physical-coordinate transform of its baseline rectangle', () => {
  assert.equal(continuationReport.rowRepairs.length, 38);
  for (const repair of continuationReport.rowRepairs) {
    assert.equal(repair.focusTransformedThroughPhysicalCoordinates, true);
    assert.equal(repair.oldFocusRects.length, repair.newFocusRects.length, repair.groupId);
    for (let index = 0; index < repair.oldFocusRects.length; index++) {
      const oldRect = repair.oldFocusRects[index];
      const newRect = repair.newFocusRects[index];
      assert.equal(newRect[0], oldRect[0], `${repair.groupId} x moved`);
      assert.equal(newRect[2], oldRect[2], `${repair.groupId} width changed`);
      assert.ok(Math.abs(newRect[1] - oldRect[1] * 667 / 723) < 1e-9, `${repair.groupId} y transform`);
      assert.ok(Math.abs(newRect[3] - oldRect[3] * 667 / 723) < 1e-9, `${repair.groupId} height transform`);
    }
  }
});
