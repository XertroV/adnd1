import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {validateContinuationManifest} from '../../tools/continuation-contract.mjs';

const repo = path.resolve(import.meta.dirname, '../..');
const frozenCommit = '386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
const apiPath = path.join(repo, 'tools/continuation-contract.mjs');
const manifestPath = path.join(repo, 'research/citation-continuations.json');
const publishedPath = path.join(repo, 'dist/source-continuations.json');
const dataPath = path.join(repo, 'dist/data.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const json = bytes => JSON.parse(bytes.toString('utf8'));
const read = p => readFileSync(p);

function gitShow(relativePath) {
  return execFileSync('git', ['show', `${frozenCommit}:${relativePath}`], {
    cwd: repo,
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
}

const oldManifestBytes = gitShow('research/citation-continuations.json');
const oldManifest = json(oldManifestBytes);
const manifestBytes = read(manifestPath);
const manifest = json(manifestBytes);
const published = json(read(publishedPath));
const data = json(read(dataPath));
const partyGroupId = 'appendix-c-party-magic-distribution-dmg-175-176';
const levelGroupId = 'appendix-c-character-levels-dmg-175-same-page-continuation';
const oldOpeningImage = 'dmg-175-dmg175-character-level-left-07fd3a11c0cc61f1.png';
const oldOpeningSha256 = '07fd3a11c0cc61f10ecf3bc812e8c91b34731c81855a72aec0ce3786f1242c3d';

function group(id) {
  const found = manifest.groups.find(candidate => candidate.id === id);
  assert.ok(found, `current continuation manifest contains ${id}`);
  return found;
}

function validateOne(candidate) {
  return validateContinuationManifest({schemaVersion: 1, groups: [candidate]}, {data, catalogRoot: path.join(repo, 'dist')});
}

function expectRejected(candidate, pattern, label) {
  assert.throws(() => validateOne(candidate), pattern, label);
}

test('production continuation contract preserves 271 groups and guards the two appended D175 groups', async t => {
  await t.test('actual production API validates the current 273-group / 540-segment manifest against root dist', () => {
    assert.equal(sha256(read(apiPath)), '97e0fe73bd0bdd21d1f207ca97a65395794aede69b3e7803eca965e7f801cfa3');
    assert.equal(sha256(oldManifestBytes), '9929dd838c8f9ce86c0fd6259d4bb93310a739886f47c98f9e40b6d33ef244d0');
    assert.equal(sha256(manifestBytes), 'f1bfc6cffbfdd625e96bb5398e7f8db16730264a7f46ce4bcc7667ca2ef24cc7');
    assert.equal(sha256(read(publishedPath)), '32f177b264f8673edf054b25a0bd9b8df6668c5b9fb55a17d4161cf5b0cc1e5d');
    assert.equal(sha256(read(dataPath)), 'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d');
    assert.equal(oldManifest.groups.length, 271);
    assert.equal(manifest.groups.length, 273);
    assert.equal(published.groups.length, 273);
    assert.equal(published.groups.reduce((sum, entry) => sum + entry.segments.length, 0), 540);
    assert.equal(manifest.groups.reduce((sum, entry) => sum + entry.segments.length, 0), 540);
    assert.deepEqual(manifest.groups.slice(0, oldManifest.groups.length), oldManifest.groups,
      'all 271 historical groups remain byte-shaped and in order');
    assert.equal(JSON.stringify(manifest.groups.slice(0, oldManifest.groups.length)), JSON.stringify(oldManifest.groups),
      'serialized old group records retain their member order and values');
    assert.deepEqual(manifest.groups.slice(oldManifest.groups.length).map(entry => entry.id), [partyGroupId, levelGroupId]);
    assert.deepEqual(published.groups.map(entry => entry.id), manifest.groups.map(entry => entry.id));
    const result = validateContinuationManifest(manifest, {data, catalogRoot: path.join(repo, 'dist')});
    assert.deepEqual({groups: result.groups, segments: result.segments, presentSegments: result.presentSegments, blockedSegments: result.blockedSegments},
      {groups: 273, segments: 540, presentSegments: 540, blockedSegments: 0});
  });

  await t.test('ordinary groups reject any own focusAliasRegionIds property', () => {
    const ordinary = structuredClone(manifest.groups.find(entry => entry.id === 'charging-melee-dmg-66'));
    const values = [undefined, null, [], ['unapproved-region-alias']];
    for (const value of values) {
      const candidate = structuredClone(ordinary);
      candidate.segments[0].focusAliasRegionIds = structuredClone(value);
      assert.equal(Object.hasOwn(candidate.segments[0], 'focusAliasRegionIds'), true);
      expectRejected(candidate, /focusAliasRegionIds are reserved/, `ordinary alias property value ${String(value)} is rejected`);
    }
  });

  await t.test('Character Levels segments reject every own focusAliasRegionIds property', () => {
    const levels = group(levelGroupId);
    for (const value of [undefined, null, [], ['dmg175-fake-alias']]) {
      const candidate = structuredClone(levels);
      candidate.segments[0].focusAliasRegionIds = structuredClone(value);
      expectRejected(candidate, /character continuation scope changed/, `Character Levels alias property value ${String(value)} is rejected`);
    }
  });

  await t.test('Party Magic accepts only its exact 12 supplemental and one canonical continuation aliases', () => {
    const party = group(partyGroupId);
    const expectedP175 = [
      'dmg175-party-magic-items-party-magic-items-distribution-1st-level',
      'dmg175-party-magic-items-party-magic-items-distribution-2nd-level',
      'dmg175-party-magic-items-party-magic-items-distribution-3rd-level',
      'dmg175-party-magic-items-party-magic-items-distribution-4th-level',
      'dmg175-party-magic-items-party-magic-items-distribution-5th-level',
      'dmg175-party-magic-items-party-magic-items-distribution-6th-level',
      'dmg175-party-magic-items-party-magic-items-distribution-7th-level',
      'dmg175-party-magic-items-party-magic-items-distribution-8th-level',
      'dmg175-party-magic-items-party-magic-items-distribution-9th-level',
      'dmg175-party-magic-items-party-magic-items-distribution-10th-level',
      'dmg175-party-magic-items-party-magic-items-distribution-11th-level',
      'dmg175-party-magic-items-party-magic-items-distribution-12th-level',
    ];
    const expectedP176 = ['dmg176-level13-magic-items-level-13-continuation-personal-selection-and-groups-multiples-advice'];
    assert.deepEqual(party.segments.map(segment => segment.focusAliasRegionIds), [expectedP175, expectedP176]);
    assert.deepEqual(party.requiredRegionIds, [
      'dmg175-party-magic-items-party-magic-items-complete-introductory-paragraph',
      ...expectedP175,
      'dmg176-level13-magic-items-party-magic-items-distribution-13th-level',
      ...expectedP176,
    ]);
    assert.deepEqual(party.currentCitationPages.map(page => page.regionIds), [
      ['dmg175-party-magic-items-party-magic-items-complete-introductory-paragraph', ...expectedP175],
      ['dmg176-level13-magic-items-party-magic-items-distribution-13th-level', ...expectedP176],
    ]);
    const first = party.segments[0];
    const second = party.segments[1];
    const partyCatalog = json(read(path.join(repo, 'dist', party.catalog)));
    const supplementalArtifact = partyCatalog.sourceArtifacts?.['dmg175-user-confirmed-supplement'];
    assert.equal(supplementalArtifact?.mediaType, 'image/jpeg');
    assert.deepEqual(supplementalArtifact?.dimensionsPx, [1329, 1796]);
    assert.equal(supplementalArtifact?.sha256, 'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');
    assert.equal(partyCatalog.sources?.DMG?.sha256, '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
    assert.equal(first.printedPage, 175);
    assert.equal(first.pdfPage, null);
    assert.equal(first.sourceArtifactId, 'dmg175-user-confirmed-supplement');
    assert.equal(first.sourceIdentityKind, 'supplemental-image');
    assert.equal(first.sourceSha256, 'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');
    assert.equal(first.canonicalPdfSha256, '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
    assert.equal(second.printedPage, 176);
    assert.equal(second.pdfPage, 176);
    assert.equal(second.sourceArtifactId, 'dmg-canonical-pdf');
    assert.equal(second.sourceIdentityKind, 'canonical-pdf');
    assert.equal(second.sourceSha256, '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
    assert.deepEqual(party.sourceComparison.pages.map(page => [page.printedPage, page.pdfPage, page.sourceIdentityKind]), [
      [175, null, 'supplemental-image'], [176, 176, 'canonical-pdf'],
    ]);
    assert.deepEqual(validateOne(party), {
      groups: 1, segments: 2, presentSegments: 2, blockedSegments: 0, regressionBindings: 0,
      statusCounts: {'segments-present-pending-deployment': 1},
    });

    const extraAlias = structuredClone(party);
    extraAlias.segments[0].focusAliasRegionIds.push('dmg175-unreviewed-extra-alias');
    expectRejected(extraAlias, /focus-alias set changed/, 'an unreviewed additional Party Magic alias is rejected');
    const crossPageAlias = structuredClone(party);
    crossPageAlias.segments[1].focusAliasRegionIds[0] = expectedP175[0];
    expectRejected(crossPageAlias, /focus-alias set changed/, 'a p.175 alias cannot be moved to the p.176 part');
  });

  await t.test('Party Magic rejects reversed pages and a missing continuation part', () => {
    const reversed = structuredClone(group(partyGroupId));
    reversed.segments[0].order = 2;
    reversed.segments[1].order = 1;
    expectRejected(reversed, /required segment order|physical region order\/role changed/, 'the canonical p.176 part cannot precede the supplemental p.175 opening');

    const missing = structuredClone(group(partyGroupId));
    missing.segments.pop();
    expectRejected(missing, /physical-segment count changed/, 'both Party Magic parts are required');
  });

  await t.test('Character Levels rejects the stale clipped old-07fd opening tuple', () => {
    const stale = structuredClone(group(levelGroupId));
    stale.segments[0].image = oldOpeningImage;
    stale.segments[0].imageSha256 = oldOpeningSha256;
    expectRejected(stale, /does not match the catalog binding/, 'the old clipped opening image cannot satisfy the current group');
  });
});
