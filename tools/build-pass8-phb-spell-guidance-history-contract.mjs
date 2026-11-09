#!/usr/bin/env node
// Rebuild the exact outer history-stage contract for the combined PHB spell
// guidance and source-overview application batch. This public builder reads
// only Git JSON inputs and pinned public review artifacts; it never reads PDFs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseCommit = 'a46eddc41ac6f712d5ad1498195df6a49810aae1';
const outputPath = 'tests/fixtures/pass8-phb-spell-guidance-history-v1.json.gz';
const paths = [
  'phb-spells.json',
  'rules.json',
  'dist/data.json',
  'citation-overrides.json',
  'research/citation-continuations.json',
  'dist/source-continuations.json',
  'research/source-visual-reviews.json',
  'research/price-source-inventory.json',
];
const changedSpellIds = [
  'phb-cleric-bless',
  'phb-cleric-cure-light-wounds',
  'phb-cleric-protection-from-evil',
  'phb-cleric-sanctuary',
  'phb-cleric-spiritual-hammer',
  'phb-cleric-animate-dead',
  'phb-cleric-speak-with-the-dead',
  'phb-cleric-exorcise',
  'phb-cleric-aerial-servant',
  'phb-cleric-animate-object',
];
const druidRuleId = 'phb-druid-mistletoe-spell-components';
const druidGroupId = 'pass8-phb-druid-spell-components-note-p54';
const druidExcerptKey = `rules:${druidRuleId}`;
const druidRegionIds = [
  'phb-54-druid-note-grid-ebfa1c01c47e3a9d',
  'phb-54-druid-note-definitions-c98ac7d9d638ae45',
];
const sourceProofPaths = [
  'research/source-audit-pass8-phb-spell-guidance-author-proposal-v2.json',
  'research/source-audit-pass8-phb-spell-guidance-final-independent-review.json',
  'research/source-audit-pass8-phb-spell-guidance-final-independent-review-correction.json',
  'research/source-audit-pass8-source-overview-author-proposal.json',
  'research/source-audit-pass8-source-overview-root-independent-review.json',
  'research/source-audit-pass8-phb-druid-continuation-proposal.json',
  'research/source-audit-pass8-phb-spell-guidance-root-precision-proposal.json',
  'research/source-audit-pass8-phb-spell-guidance-independent-review.json',
  'research/source-audit-pass8-dmg-appendix-e-star-independent-review.json',
  'dist/scans/verified/rules-phb-druid-mistletoe-spell-components.json',
  'dist/scans/verified/phb-54-druid-component-grid-12e0268a4de65de9.png',
  'dist/scans/verified/phb-54-druid-harvest-steps-64a622ca28524273.png',
];
const preEditTestArchivePath = 'tests/fixtures/pass8-phb-spell-guidance-current-test-expectations-before-a46.json.gz';
const firstRun = {
  runId: 84776,
  registeredTests: 840,
  passed: 775,
  failed: 65,
  skipped: 0,
  cancelled: 0,
  exitCode: 1,
  inputManifest: {
    path: '/workspace/vault-audit-private/pass8/root/phb-spell-guidance-precision-review/first-full-node/inputs.json.gz',
    sha256: 'ea8b656cd5933c20bc8ac1e9138d1a4976c9ae9e9e01ea887741e56068d904c7',
    sizeBytes: 4_455_229,
  },
  log: {
    path: '/workspace/vault-audit-private/pass8/root/phb-spell-guidance-precision-review/first-full-node/output.log',
    sha256: '1c8389405fdfcd5eb4a568fb4005b1444f39a79ab922db17b6e772b82083a4a3',
    sizeBytes: 596_911,
  },
};

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const objectSha = value => sha(Buffer.from(JSON.stringify(value)));

function assertJsonTree(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value) && !Object.is(value, -0), 'history accepts only exact JSON numbers');
    return;
  }
  assert.equal(typeof value, 'object', 'history cannot mask non-JSON values');
  assert.equal(Object.getOwnPropertySymbols(value).length, 0, 'history cannot hide symbols');
  if (Array.isArray(value)) {
    assert.deepEqual(Object.keys(value), Array.from({ length: value.length }, (_, i) => String(i)), 'history arrays are dense');
    assert.deepEqual(Object.getOwnPropertyNames(value), [...Object.keys(value), 'length'], 'history arrays have no hidden properties');
  } else {
    assert.equal(Object.getPrototypeOf(value), Object.prototype, 'history objects are plain JSON objects');
    assert.deepEqual(Object.getOwnPropertyNames(value), Object.keys(value), 'history objects have no hidden properties');
  }
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(Object.hasOwn(descriptor, 'value'), 'history cannot hide accessors');
    assertJsonTree(descriptor.value);
  }
}

function gitBytes(commit, relPath) {
  return execFileSync('git', ['show', `${commit}:${relPath}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
}

function at(value, parts) {
  for (const part of parts) {
    assert.ok(value !== null && typeof value === 'object' && Object.hasOwn(value, part), 'history path resolves exactly');
    value = value[part];
  }
  return value;
}

function ownerArrayDelta(before, current, parts) {
  const ids = rows => {
    assert.ok(rows.every(row => row && typeof row.id === 'string'), 'approved owner arrays use stable string IDs');
    const found = rows.map(row => row.id);
    assert.equal(new Set(found).size, found.length, 'owner arrays cannot contain duplicate IDs');
    return found;
  };
  const beforeIds = ids(before), currentIds = ids(current);
  const beforeMap = new Map(before.map(row => [row.id, row]));
  const currentMap = new Map(current.map(row => [row.id, row]));
  return {
    kind: 'owner-array-delta',
    path: parts,
    beforeIds,
    currentIds,
    replacements: beforeIds.filter(id => currentMap.has(id) && !isDeepStrictEqual(beforeMap.get(id), currentMap.get(id)))
      .map(id => ({ id, before: beforeMap.get(id), current: currentMap.get(id) })),
    additions: currentIds.filter(id => !beforeMap.has(id)).map(id => ({ id, current: currentMap.get(id) })),
    removals: beforeIds.filter(id => !currentMap.has(id)).map(id => ({ id, before: beforeMap.get(id) })),
  };
}

const ownerArrays = new Set([
  'phb-spells.json#/spells',
  'rules.json#/rules',
  'rules.json#/sources',
  'dist/data.json#/rules',
  'dist/data.json#/spells',
  'dist/data.json#/sources',
]);

function collectChanges(filePath, before, current, parts = [], operations = [], objectOrders = []) {
  const marker = `${filePath}#/${parts.join('/')}`;
  if (ownerArrays.has(marker)) {
    if (!isDeepStrictEqual(before, current)) operations.push(ownerArrayDelta(before, current, parts));
    return;
  }
  if (Array.isArray(before) && Array.isArray(current)) {
    if (before.length !== current.length) {
      if (before.length < current.length && before.every((value, index) => isDeepStrictEqual(value, current[index]))) {
        operations.push({ kind: 'appended-array', path: parts, beforeLength: before.length, currentLength: current.length, currentSuffix: current.slice(before.length) });
      } else {
        operations.push({ kind: 'replace', path: parts, before, current });
      }
      return;
    }
    for (let index = 0; index < before.length; index++) collectChanges(filePath, before[index], current[index], [...parts, index], operations, objectOrders);
    return;
  }
  if (before && current && typeof before === 'object' && typeof current === 'object' && !Array.isArray(before) && !Array.isArray(current)) {
    const beforeKeys = Object.keys(before), currentKeys = Object.keys(current);
    if (!isDeepStrictEqual(beforeKeys, currentKeys)) objectOrders.push({ path: parts, before: beforeKeys, current: currentKeys });
    for (const key of new Set([...beforeKeys, ...currentKeys])) {
      const beforePresent = Object.hasOwn(before, key), currentPresent = Object.hasOwn(current, key);
      if (!beforePresent || !currentPresent) {
        operations.push({ kind: 'property', path: [...parts, key], beforePresent, currentPresent, before: beforePresent ? before[key] : null, current: currentPresent ? current[key] : null });
      } else {
        collectChanges(filePath, before[key], current[key], [...parts, key], operations, objectOrders);
      }
    }
    return;
  }
  if (!isDeepStrictEqual(before, current)) operations.push({ kind: 'replace', path: parts, before, current });
}

function changedIds(beforeRows, currentRows) {
  const before = new Map(beforeRows.map(row => [row.id, row]));
  const current = new Map(currentRows.map(row => [row.id, row]));
  return [...new Set([...before.keys(), ...current.keys()])].filter(id => !isDeepStrictEqual(before.get(id), current.get(id)));
}

function assertExactApprovedScope(beforeDocs, currentDocs) {
  const beforeSpells = beforeDocs['phb-spells.json'].spells;
  const currentSpells = currentDocs['phb-spells.json'].spells;
  assert.deepEqual(changedIds(beforeSpells, currentSpells), changedSpellIds, 'only the ten reviewed PHB spell owners changed');

  for (const filePath of ['rules.json', 'dist/data.json']) {
    const before = beforeDocs[filePath], current = currentDocs[filePath];
    assert.equal(before.sources.length, 3, `${filePath}: source array predecessor count`);
    assert.equal(current.sources.length, 5, `${filePath}: source array current count`);
    assert.deepEqual(before.sources.map(source => source.id), ['PHB', 'UA', 'DMG'], `${filePath}: exact source predecessor order`);
    assert.deepEqual(current.sources.map(source => source.id), ['PHB', 'UA', 'DMG', 'MM', 'MM2'], `${filePath}: exact current source order`);
    assert.deepEqual(changedIds(before.sources, current.sources), ['PHB', 'UA', 'DMG', 'MM', 'MM2'], `${filePath}: only the five reviewed ordered source metadata records changed`);
    assert.deepEqual(changedIds(before.rules, current.rules), [druidRuleId], `${filePath}: only the approved Druid rule was added`);
  }

  const beforeData = beforeDocs['dist/data.json'], currentData = currentDocs['dist/data.json'];
  assert.deepEqual(changedIds(beforeData.spells, currentData.spells), changedSpellIds, 'assembled spell owner changes match the authored ten');
  assert.deepEqual(currentData.sources, currentDocs['rules.json'].sources, 'assembled source metadata matches the authored source array');

  const beforeOverrides = beforeDocs['citation-overrides.json'], currentOverrides = currentDocs['citation-overrides.json'];
  const beforeExcerptKeys = Object.keys(beforeOverrides.sourceExcerpts || {}), currentExcerptKeys = Object.keys(currentOverrides.sourceExcerpts || {});
  assert.deepEqual(currentExcerptKeys.filter(key => !beforeExcerptKeys.includes(key)), [druidExcerptKey], 'exactly one scoped source-excerpt override was added');
  assert.deepEqual(currentExcerptKeys.filter(key => beforeExcerptKeys.includes(key) && !isDeepStrictEqual(beforeOverrides.sourceExcerpts[key], currentOverrides.sourceExcerpts[key])), [], 'existing excerpt overrides are unchanged');

  const addedGroups = currentDocs['research/citation-continuations.json'].groups.filter(group => !beforeDocs['research/citation-continuations.json'].groups.some(old => old.id === group.id));
  assert.deepEqual(addedGroups.map(group => group.id), [druidGroupId], 'exactly one Druid context group was appended');
  assert.equal(beforeDocs['research/citation-continuations.json'].groups.length, 252);
  assert.equal(currentDocs['research/citation-continuations.json'].groups.length, 253);
  const assembledGroups = currentDocs['dist/source-continuations.json'].groups.filter(group => !beforeDocs['dist/source-continuations.json'].groups.some(old => old.id === group.id));
  const sourceGroup = addedGroups[0];
  const expectedCompiledGroup = {
    id: sourceGroup.id,
    collection: sourceGroup.collection,
    itemId: sourceGroup.itemId,
    catalog: sourceGroup.catalog,
    segments: sourceGroup.segments.map(segment => ({
      order: segment.order, role: segment.role, book: segment.book, printedPage: segment.printedPage,
      pdfPage: segment.pdfPage, regionId: segment.regionId, image: segment.image,
      imageSha256: segment.imageSha256, sourceSha256: segment.sourceSha256, state: segment.state,
    })),
  };
  assert.deepEqual(assembledGroups, [expectedCompiledGroup], 'compiled group has the exact declared runtime fields and ordered segments');

  const beforeReviews = beforeDocs['research/source-visual-reviews.json'].reviews;
  const currentReviews = currentDocs['research/source-visual-reviews.json'].reviews;
  const addedReviews = currentReviews.filter(review => !beforeReviews.some(old => isDeepStrictEqual(old, review)));
  assert.deepEqual(addedReviews.map(review => review.regionId), druidRegionIds, 'the only new visual reviews are the two precise component reviews in order');
  assert.equal(beforeReviews.length, 1827);
  assert.equal(currentReviews.length, 1829);

  const beforeBindings = beforeDocs['research/price-source-inventory.json'].fieldEvidenceBindings;
  const currentBindings = currentDocs['research/price-source-inventory.json'].fieldEvidenceBindings;
  const bindingKey = binding => `${binding.collection}:${binding.itemId}:${binding.fieldPointer}`;
  const beforeBindingMap = new Map(beforeBindings.map(binding => [bindingKey(binding), binding]));
  const currentBindingMap = new Map(currentBindings.map(binding => [bindingKey(binding), binding]));
  assert.equal(beforeBindingMap.size, beforeBindings.length, 'historical binding identities are unique');
  assert.equal(currentBindingMap.size, currentBindings.length, 'current binding identities are unique');
  for (const [key, binding] of beforeBindingMap) assert.deepEqual(currentBindingMap.get(key), binding, `all old price-source bindings remain exact: ${key}`);
  const addedBindings = [...currentBindingMap].filter(([key]) => !beforeBindingMap.has(key)).map(([, binding]) => binding);
  assert.equal(addedBindings.length, 2, 'only the two generated Druid source-reference records were appended');
  assert.deepEqual(addedBindings.map(binding => bindingKey(binding)).sort(), [
    `rules:${druidRuleId}:`, `rules:${druidRuleId}:/sourceReferences/0`,
  ]);
  assert.ok(addedBindings.every(binding => binding.collection === 'rules' && binding.itemId === druidRuleId), 'generated owner references stay scoped to the new Druid rule');
  assert.ok(addedBindings.every(binding => binding.reviewStatus === 'field-target-pending' && binding.sourceValueStatus === 'not-assessed-by-field-target-review' && binding.targetReview === null), 'generated references promote no manual field binding or grade');
}

function pin(rootPath, relPath) {
  const bytes = readFileSync(path.join(rootPath, relPath));
  return { path: relPath, sha256: sha(bytes), sizeBytes: bytes.length };
}

function buildContract() {
  const beforeDocs = {}, currentDocs = {}, files = {};
  for (const relPath of paths) {
    const beforeRaw = gitBytes(baseCommit, relPath);
    const currentRaw = readFileSync(path.join(root, relPath));
    const before = JSON.parse(beforeRaw), current = JSON.parse(currentRaw);
    assertJsonTree(before); assertJsonTree(current);
    beforeDocs[relPath] = before; currentDocs[relPath] = current;
    if (sha(beforeRaw) === sha(currentRaw)) continue;
    const operations = [], objectOrders = [];
    collectChanges(relPath, before, current, [], operations, objectOrders);
    const prettyBefore = Buffer.from(JSON.stringify(before, null, 2) + '\n');
    files[relPath] = {
      beforeRawSha256: sha(beforeRaw), currentRawSha256: sha(currentRaw),
      beforeObjectSha256: objectSha(before), currentObjectSha256: objectSha(current),
      beforeRawSizeBytes: beforeRaw.length, currentRawSizeBytes: currentRaw.length,
      operations, objectOrders,
      ...(sha(prettyBefore) === sha(beforeRaw) ? {} : { beforeRawUtf8: beforeRaw.toString('utf8') }),
    };
  }
  assertExactApprovedScope(beforeDocs, currentDocs);
  for (const relPath of paths) assert.ok(Object.hasOwn(files, relPath), `${relPath}: expected an explicit reversible application-stage diff`);

  const helperFiles = [
    'tests/helpers/pass8-xp-continuation-history.mjs',
    'tests/helpers/pass8-character-reference-history.mjs',
    'tests/helpers/batch6-jo-fixture.mjs',
    'tests/pass8-xp-continuation-history.test.mjs',
    'tests/pass8-character-reference-history.test.mjs',
  ].map(relPath => {
    const bytes = gitBytes(baseCommit, relPath);
    return { path: relPath, sha256: sha(bytes), sizeBytes: bytes.length, utf8: bytes.toString('utf8') };
  });

  const preEditArchive = pin(root, preEditTestArchivePath);
  const archiveRaw = gunzipSync(readFileSync(path.join(root, preEditTestArchivePath)));
  const preEditTests = JSON.parse(archiveRaw);
  assert.equal(preEditTests.baseCommit, baseCommit, 'pre-edit test byte archive is pinned to a46');

  return {
    schemaVersion: 1,
    artifactType: 'exact-pass8-phb-spell-guidance-historical-projection',
    baseCommit,
    scope: {
      authoredChangedSpellOwnerIds: changedSpellIds,
      addedDruidRuleOwnerId: druidRuleId,
      sourceArrayCountTransition: [3, 5],
      addedScopedSourceExcerptOverride: druidExcerptKey,
      addedContinuationGroupId: druidGroupId,
      addedVisualReviewRegionIds: druidRegionIds,
      generatedDruidReferenceBindingsAdded: currentDocs['research/price-source-inventory.json'].fieldEvidenceBindings.length - beforeDocs['research/price-source-inventory.json'].fieldEvidenceBindings.length,
      manualFieldBindingsOrGradesPromoted: 0,
      liveCurrentInterfacesOutsideHistory: ['README.md', 'dist/app.js', 'dist/books.js', 'dist/scans/verified/*', 'tests/* current validators'],
      stageOrder: 'exact approved-current → Git a46 predecessor; only then the unchanged XP → Git 777 → character-reference/matrix/DMG175/Jo historical guards',
    },
    capturedUnchangedHarnessRun: firstRun,
    exactBeforeArtifacts: {
      preEditCurrentTestFiles: preEditArchive,
      oldHelpersAndHistoryTestsAtBase: helperFiles,
    },
    sourceProofs: sourceProofPaths.map(relPath => pin(root, relPath)),
    files,
  };
}

function main() {
  const [mode, target] = process.argv.slice(2);
  assert.ok(['--write', '--check'].includes(mode) && target, 'usage: build-pass8-phb-spell-guidance-history-contract.mjs --write|--check PATH');
  const contract = buildContract();
  const builtRaw = Buffer.from(JSON.stringify(contract, null, 2) + '\n');
  const built = gzipSync(builtRaw, { level: 9, mtime: 0 });
  const targetPath = path.resolve(root, target);
  if (mode === '--write') writeFileSync(targetPath, built);
  else assert.deepEqual(readFileSync(targetPath), built, 'checked-in PHB history contract must match the exact deterministic build');
  console.log(JSON.stringify({
    output: path.relative(root, targetPath),
    sha256: sha(built),
    sizeBytes: built.length,
    rawSizeBytes: builtRaw.length,
    changedPaths: Object.keys(contract.files),
    sourceProofCount: sourceProofPaths.length,
  }, null, 2));
}

main();
