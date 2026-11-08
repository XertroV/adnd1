import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {validateContinuationManifest} from '../tools/continuation-contract.mjs';
import {buildPublishedContinuations} from '../tools/published-continuations.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonicalHash = value => hash(Buffer.from(JSON.stringify(value)));
const report = json('research/source-audit-batch5-continuation-reconciliation.json');
const preFix = json('tests/fixtures/continuation-phb45-hold-person-before.json');
const relationshipBaseline = json('tests/fixtures/continuation-relationship-projection-before.json');
const sourcePairReview = json('research/source-audit-batch5-continuation-review.json');
const preDruidCorrection = json('research/source-audit-batch5-continuation-reconciliation-before-druid-correction.json');
const preDruidProposal = json('tests/fixtures/continuation-relationship-projection-before.json');
const data = json('dist/data.json');

function tempCatalogRoot(t, group, aliases = []) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'continuation-reconciliation-'));
  const distRoot = path.join(tempRoot, 'dist');
  const catalogPath = path.join(root, 'dist', group.catalog);
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (aliases.length) catalog.regions.push(...aliases);
  const targetCatalogPath = path.join(distRoot, group.catalog);
  fs.mkdirSync(path.dirname(targetCatalogPath), {recursive: true});
  fs.writeFileSync(targetCatalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  const sourceDirectory = path.dirname(catalogPath);
  const targetDirectory = path.dirname(targetCatalogPath);
  for (const region of catalog.regions || []) {
    if (!region.image) continue;
    const sourceImage = path.join(sourceDirectory, region.image);
    const targetImage = path.join(targetDirectory, region.image);
    if (fs.existsSync(sourceImage) && !fs.existsSync(targetImage)) fs.copyFileSync(sourceImage, targetImage);
  }
  t.after(() => fs.rmSync(tempRoot, {recursive: true, force: true}));
  return distRoot;
}

test('PHB 45 Hold Person no-group failure remains pinned to the exact pre-repair crops', () => {
  assert.equal(preFix.id, 'phb45-hold-person-present-crops-no-continuation-group-before');
  assert.equal(preFix.manifest.groupCount, 60);
  assert.deepEqual(preFix.manifest.matchingPairGroups, []);
  assert.equal(preFix.pair.pairId, 'PHB-p45-phb-45-41097b70770c8ae7-phb-45-dacaab7bfdf68a5d');
  assert.equal(preFix.pair.ownerCount, 3);
  for (const owner of preFix.pair.owners) {
    const catalog = json(path.join('dist', owner.catalog));
    assert.equal(hash(fs.readFileSync(path.join(root, 'dist', owner.catalog))), owner.catalogSha256);
    for (const region of owner.regions) {
      const current = catalog.regions.find(candidate => candidate.id === region.regionId);
      assert.ok(current, `${owner.itemId} keeps ${region.regionId}`);
      assert.equal(current.sha256, region.imageSha256);
      assert.equal(hash(fs.readFileSync(path.join(root, 'dist', path.dirname(owner.catalog), region.image))), region.imageBytesSha256);
    }
  }
  const reviewedPair = sourcePairReview.sourcePairReviews.find(pair => pair.pairId === preFix.pair.pairId);
  assert.equal(reviewedPair.disposition, 'present-but-unlinked');
});

test('the rejected PHB p.45 Druid misassociation diagnosis is preserved and superseded by complete-passage evidence', () => {
  const before = relationshipBaseline.druidHoldPersonMisassociation;
  const owner = data.spells.find(item => item.id === 'phb-druid-charm-person-or-mammal');
  const catalog = json(path.join('dist', owner.sourceExcerpts.catalog));
  const ref = owner.references.find(reference => reference.pages?.includes(45));
  const page45 = catalog.regions.filter(region => region.book === 'PHB' && region.printedPage === 45);
  assert.equal(before.record.rawOwnerPages.includes(45), false);
  assert.equal(before.record.sourceReference.label, 'Cleric hold person');
  assert.equal(before.uiSelection.page45Reference.fieldPointer, '/references/1');
  assert.deepEqual(before.uiSelection.page45Reference.regionIds, []);
  assert.deepEqual(before.uiSelection.matchingRegionIds, ['phb-45-41097b70770c8ae7', 'phb-45-dacaab7bfdf68a5d']);
  assert.equal(before.uiSelection.defaultRegionId, 'phb-45-41097b70770c8ae7');
  assert.equal(hash(fs.readFileSync(path.join(root, 'dist', owner.sourceExcerpts.catalog))), before.catalog.sha256);
  assert.equal(ref.label, 'Cleric hold person');
  assert.deepEqual(page45.map(region => region.id), before.uiSelection.matchingRegionIds);
  assert.ok(page45.every(region => /Charm Person or Mammal/.test(region.alt)));
  assert.equal(report.counts.confirmedMisassociatedOwnerRows, 0);
  const row = report.ownerPairRows.find(entry => entry.owner.itemId === owner.id && entry.book === 'PHB' && entry.printedPage === 45);
  assert.equal(row.disposition, 'proposed-new-group');
  assert.equal(row.proposedGroupId, 'batch5-cont-phb-p45-phb-druid-charm-person-or-mammal');
  assert.equal(row.ownerSourceRelation.kind, 'explicit-qv-source-cross-reference-context');
  assert.equal(row.ownerSourceRelation.ownerPage.printedPage, 56);
  assert.match(row.ownerSourceRelation.reason, /PHB p\.56.*Hold Person/);
  assert.equal(row.supersededPriorDiagnosis.status, 'rejected-after-complete-owner-passage-review');
  assert.equal(row.misassociation.status, 'superseded-false-positive');
  assert.deepEqual(row.misassociation.catalogRegionIds, before.uiSelection.matchingRegionIds);
  assert.equal(before.proposedRemediation.imageDeletion, false, 'the immutable pre-review fixture never deleted PNG bytes');
  assert.equal(before.proposedRemediation.referenceDeletion, false, 'the immutable pre-review fixture preserves the reference');
  assert.equal(before.proposedRemediation.stableOwnerRegionIdsPreserved, true);
  const oldRow = preDruidCorrection.ownerPairRows.find(entry => entry.owner.itemId === owner.id && entry.printedPage === 45);
  assert.equal(oldRow.disposition, 'confirmed-misassociated-excerpt', 'the rejected diagnosis remains in the immutable pre-correction report');
  assert.match(oldRow.ownerSourceRelation.reason, /pp\.55–56 do not mention Hold Person/);
  assert.equal(preDruidProposal.files.manifest.groupCount, 60, 'the false initial diagnosis remains pinned to the original 60-group state');
  assert.equal(report.druidMisassociation.status, 'superseded-false-positive-after-complete-owner-passage-review');
});

test('a separate PHB p.55–56 Druid own-passage continuation is pinned as a source-positive no-group baseline', () => {
  const before = json('tests/fixtures/continuation-druid-phb55-56-before.json');
  assert.equal(before.id, 'druid-charm-person-phb55-56-no-linked-continuation-before');
  assert.equal(before.manifest.groupCount, 60);
  assert.deepEqual(before.manifest.matchingOwnerGroups, []);
  assert.deepEqual(before.catalog.regions.map(region => region.regionId), ['phb-55-1ed1d4a06d478c09', 'phb-56-52c28faceedb3b01']);
  assert.equal(report.ownerPairRows.length, 44, 'the cross-page own-spell finding stays outside the fixed 44 same-page owner denominator');
  const proposalFixtureBytes = fs.readFileSync(new URL('../tests/fixtures/continuation-druid-phb55-56-proposal.json.gz', import.meta.url));
  assert.equal(hash(proposalFixtureBytes), '3d0d997c7f0ec7abde7a5d79540310039bc5af8263bc06e14c6e5833e2a60025');
  const proposalBytes = gunzipSync(proposalFixtureBytes);
  assert.equal(hash(proposalBytes), '036cc95bef27587548ee9f4bcf66ba2a45475d93be368b46287104bbf587e527');
  const group = JSON.parse(proposalBytes.toString('utf8'));
  const committedProposal = json('research/source-audit-batch5-continuation-final-proposal.json').proposals.additionalCrossPageOwnerPassage;
  assert.deepEqual(group, committedProposal, 'the pinned proposal is the exact published continuation proposal object');
  assert.equal(group.sourceComparison.evidence, 'research/source-audit-batch5-continuation-phb55-56.json');
  assert.equal(hash(fs.readFileSync(path.join(root, group.sourceComparison.evidence))), group.sourceComparison.evidenceSha256);
  assert.ok(group.segments.every(segment => typeof segment.image === 'string' && /^[a-f0-9]{64}$/.test(segment.imageSha256)), 'the fixture contains image references and hashes, not source image bytes');
  assert.equal(group.id, 'batch5-cont-phb-p55-56-phb-druid-charm-person-or-mammal');
  assert.deepEqual(group.requiredRegionIds, ['phb-55-1ed1d4a06d478c09', 'phb-56-52c28faceedb3b01']);
  assert.deepEqual(group.segments.map(segment => segment.role), ['opening', 'continuation']);
  assert.equal(group.sourceReviewDisposition, 'separate-cross-page-owner-continuation-proposal-not-in-44-row-denominator');
});

test('the frozen 60-group manifest and published projection are retained as pre-relationship-display evidence', () => {
  assert.equal(relationshipBaseline.files.manifest.groupCount, 60);
  assert.equal(relationshipBaseline.files.projection.fullProjection.groups.length, 60);
  assert.equal(relationshipBaseline.files.projection.fullProjection.counts.segments, 120);
  assert.equal(relationshipBaseline.files.manifest.sha256, report.inputs.currentManifest.sha256);
  assert.equal(relationshipBaseline.files.sourceViewer.sha256.length, 64);
  assert.equal(relationshipBaseline.files.publishedTool.sha256.length, 64);
  assert.deepEqual(relationshipBaseline.files.manifest.groupHashes.map(group => group.id), relationshipBaseline.files.manifest.fullGroups.map(group => group.id));
  assert.equal(relationshipBaseline.knownRelationshipInventory.currentP70OwnerGroups.length, 6);
  assert.equal(report.inputs.currentManifest.groupCount, 60);
  assert.equal(report.existingGroupRelationshipRepairs.length, 5);
  for (const repair of report.existingGroupRelationshipRepairs) {
    const original = relationshipBaseline.files.manifest.fullGroups.find(group => group.id === repair.groupId);
    assert.ok(original, `${repair.groupId} was present before relationship metadata`);
    assert.equal(canonicalHash(original), repair.beforeCanonicalSha256);
    assert.equal(canonicalHash(repair.proposedGroup), repair.afterCanonicalSha256);
    assert.deepEqual(repair.proposedGroup.requiredRegionIds, original.requiredRegionIds);
    assert.deepEqual(repair.proposedGroup.segments.map(segment => segment.role), original.segments.map(segment => segment.role), 'opening/continuation ordering stays unchanged');
    assert.ok(repair.proposedGroup.relationship);
  }
});

test('the complete source-pair denominator assigns every pair and owner row one explicit disposition', () => {
  assert.equal(report.pairReconciliations.length, 32);
  assert.equal(report.ownerPairRows.length, 44);
  assert.equal(report.counts.fullyLinkedExisting, 8);
  assert.equal(report.counts.canonicallySubsumed, 3);
  assert.equal(report.counts.proposedNewGroupsForOwnerPair, 33);
  assert.equal(report.counts.confirmedMisassociatedOwnerRows, 0);
  assert.equal(report.newGroupProposals.length, 34);
  const seen = new Set();
  for (const row of report.ownerPairRows) {
    const key = `${row.pairId}|${row.owner.catalogOwner}`;
    assert.equal(seen.has(key), false, `${key} appears only once`);
    seen.add(key);
    assert.ok(['fully-linked-existing', 'canonically-subsumed', 'proposed-new-group', 'confirmed-misassociated-excerpt'].includes(row.disposition), `${key} has explicit disposition`);
    assert.ok(row.ownerSourceRelation?.reason, `${key} has owner-passage reasoning`);
  }
  assert.equal(seen.size, 44);
  const druid = report.ownerPairRows.find(row => row.owner.itemId === 'phb-druid-charm-person-or-mammal' && row.printedPage === 45);
  assert.equal(druid.proposedGroupId, 'batch5-cont-phb-p45-phb-druid-charm-person-or-mammal');
  assert.equal(druid.ownerSourceRelation.status, 'confirmed-related-definition-context');
  assert.ok(druid.supersededPriorDiagnosis);
  const relationshipProposals = report.newGroupProposals.filter(group => group.relationship);
  assert.equal(relationshipProposals.length, 8);
  assert.ok(relationshipProposals.every(group => group.segments.map(segment => segment.role).join(',') === 'opening,continuation'));
  assert.equal(report.projectedIfAppliedNow.groupCount, 94);
  assert.equal(report.projectedIfAppliedNow.segmentCount, 188);
});

test('new source-supported groups and relationship repairs validate against exact catalogs and image bindings', t => {
  const groups = [...report.newGroupProposals, ...report.existingGroupRelationshipRepairs.map(repair => repair.proposedGroup)];
  assert.equal(groups.length, 39);
  for (const group of groups) {
    const catalogRoot = tempCatalogRoot(t, group);
    const validation = validateContinuationManifest({schemaVersion: 1, groups: [group]}, {data, catalogRoot});
    assert.equal(validation.groups, 1, group.id);
    assert.equal(validation.segments, 2, group.id);
    const published = buildPublishedContinuations({manifest: {schemaVersion: 1, groups: [group]}, data, catalogRoot});
    if (group.relationship) assert.deepEqual(published.groups[0].relationship, group.relationship, `${group.id} relationship projects exactly`);
    else assert.equal(Object.hasOwn(published.groups[0], 'relationship'), false, `${group.id} remains a direct owner passage`);
  }
  assert.equal(report.deathFogAliasCatalogProposal.regionObjects.length, 0, 'the repaired Death Fog group uses stable owner-catalog regions without adding aliases');
  assert.equal(report.deathFogAliasCatalogProposal.aliasRegionsAdded, 0);
  const deathFog = report.newGroupProposals.find(group => group.id === 'batch5-ua69-death-fog-related-solid-fog-passage');
  assert.deepEqual(deathFog.requiredRegionIds, ['ua-69-29065a55e88e8ad4', 'ua-69-7ceb51358e10f81e']);
  assert.deepEqual(deathFog.segments.map(segment => segment.imageSha256), [
    'f499dfef2e7e7aa9b3d181fa095ab18e861dec40220e0757729f4a3e9b4f5eda',
    'b8b05ef9807ad0f820896e4297cb5afa07f1521df5a6c709652ada10043a3d70',
  ]);
});
