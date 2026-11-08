import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {validateContinuationManifest} from '../tools/continuation-contract.mjs';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bundle = read('research/source-audit-batch5-continuation-final-proposal.json');
const reconciliation = read('research/source-audit-batch5-continuation-reconciliation.json');
const manifestBytes = fs.readFileSync('research/citation-continuations.json');
const manifest = JSON.parse(manifestBytes);
const data = read('dist/data.json');
const activation = read('research/source-audit-batch5-continuation-final-integration.json');
const ua10 = read('research/source-audit-batch5-ua10-crop-integration.json');
const alias = read('research/source-audit-batch5-continuation-alias-integration.json');
const frozenInputs = JSON.parse(gunzipSync(fs.readFileSync(ua10.before.additionalExactInputs.path)));
const activated187 = JSON.parse(frozenInputs.files['research/citation-continuations.json'].utf8);
const laterGroups = [...ua10.addedGroups, alias.addedGroup];

test('final continuation proposal preserves the frozen denominators and reconstructs its exact 151-group preimage', () => {
  assert.equal(bundle.lineage.frozenSamePageDenominator.pairs, 32);
  assert.equal(bundle.lineage.frozenSamePageDenominator.ownerRows, 44);
  assert.equal(bundle.lineage.frozenManifest.groupCount, 60);
  assert.equal(activation.proposal.sha256, sha(fs.readFileSync(activation.proposal.path)));
  assert.equal(bundle.lineage.currentIntegrationPoint.manifestSha256, activation.priorManifestSha256);
  assert.deepEqual(manifest.groups, [...activated187.groups, ...laterGroups]);
  const before = structuredClone(activated187);
  const additions = new Set(activation.added.map(group => group.id));
  before.groups = before.groups.filter(group => !additions.has(group.id));
  for (const replacement of activation.replacements) {
    const index = before.groups.findIndex(group => group.id === replacement.groupId);
    assert.notEqual(index, -1);
    assert.deepEqual(before.groups[index], replacement.after);
    before.groups[index] = replacement.before;
  }
  // The original worker used Python's ensure_ascii serialization. Retain its
  // exact bytes rather than substituting a different Unicode serialization.
  const originalBytes=(JSON.stringify(before, null, 2) + '\n').replace(/[\u007f-\uffff]/g,character=>'\\u'+character.charCodeAt(0).toString(16).padStart(4,'0'));
  assert.equal(sha(originalBytes), activation.priorManifestSha256);
  assert.equal(before.groups.length, activation.before.groups);
  assert.equal(bundle.lineage.currentIntegrationPoint.groupCount, 151);
  assert.equal(bundle.lineage.currentIntegrationPoint.segmentCount, 278);
  assert.equal(bundle.lineage.currentIntegrationPoint.originalFrozen60PrefixPreserved, true);
  assert.equal(bundle.proposals.samePageAndRelated.length, 34);
  assert.equal(bundle.proposals.additionalCrossPageOwnerPassage.id, 'batch5-cont-phb-p55-56-phb-druid-charm-person-or-mammal');
  assert.equal(bundle.proposals.legacyElvenStableDeepLink.id, 'batch5-ua10-elven-legacy-source-passage');
  assert.equal(bundle.existingGroupRelationshipRepairs.length, 5);
  assert.equal(bundle.countProjection.newGroupProposals, 36);
  assert.equal(bundle.countProjection.projectedGroups, 187);
  assert.equal(bundle.countProjection.projectedSegments, 350);
  assert.equal(reconciliation.ownerPairRows.length, 44);
  assert.equal(reconciliation.counts.directOwnerSourcePassageRows, 29);
  assert.equal(reconciliation.counts.relatedSourceContextRows, 14);
  assert.equal(reconciliation.counts.fieldSourcePassageRows, 1);
});

test('all 36 new group proposals and five metadata recipes validate against the current catalogs', () => {
  const proposals = [
    ...bundle.proposals.samePageAndRelated,
    bundle.proposals.additionalCrossPageOwnerPassage,
    bundle.proposals.legacyElvenStableDeepLink,
    ...bundle.existingGroupRelationshipRepairs.map(repair => repair.proposedGroup),
  ];
  const currentIds = new Set(manifest.groups.map(group => group.id));
  assert.equal(proposals.length, 41);
  assert.equal(new Set(proposals.map(group => group.id)).size, proposals.length);
  const newGroups = proposals.slice(0, 36);
  const relationshipRepairs = proposals.slice(36);
  assert.ok(newGroups.every(group => currentIds.has(group.id)), 'all 36 independently reviewed new groups are activated');
  for (const proposed of proposals) assert.deepEqual(manifest.groups.find(group => group.id === proposed.id), proposed);
  assert.equal(activated187.groups.length, activation.after.groups);
  assert.deepEqual(manifest.groups, [...activated187.groups, ...laterGroups]);
  assert.equal(activated187.groups.reduce((count, group) => count + group.segments.length, 0), activation.after.segments);
  assert.ok(relationshipRepairs.every(group => currentIds.has(group.id)), 'the five exact relationship replacements target extant groups');
  const validation = validateContinuationManifest({schemaVersion: 1, groups: proposals}, {data, catalogRoot: 'dist'});
  assert.equal(validation.groups, proposals.length);
  assert.equal(validation.segments, 82);

  const legacy = bundle.proposals.legacyElvenStableDeepLink;
  assert.deepEqual(legacy.requiredRegionIds, ['ua-10-d3cdc07db7c18a50', 'ua-10-46ba4e69b0474ea1']);
  assert.deepEqual(legacy.segments.map(segment => segment.imageSha256), [
    '391dc1287b053d9889ce426c9a5051942fcf935a52a2bd4ee70c65d222a2d169',
    '0f52a85b943013cf754d1ff6594095da8a0f0ad1e369c421d25e5abfc8abc9c2',
  ]);
  assert.equal(bundle.proposals.samePageAndRelated.find(group => group.id === 'batch5-ua69-death-fog-related-solid-fog-passage').requiredRegionIds.join(','), 'ua-69-29065a55e88e8ad4,ua-69-7ceb51358e10f81e');
});

