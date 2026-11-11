// Uninstalled strict successor kernel. The production loader supplies closed
// fixture bytes plus their reviewed SHA-256; this factory accepts no open
// expected-count override.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {types} from 'node:util';

const rawSha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const canonicalSha = value => rawSha(canonical(value));

function assertJsonTree(value, ancestors = new Set()) {
  assert.equal(Object.getPrototypeOf(Array.prototype), Object.prototype, 'MM source cohort rejects inserted Array.prototype parents');
  assert.equal(Object.getPrototypeOf(Object.prototype), null, 'MM source cohort requires Object.prototype to remain the root');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value) && !Object.is(value, -0), 'MM source cohort requires finite JSON numbers');
    return;
  }
  assert.equal(typeof value, 'object', 'MM source cohort accepts only JSON values');
  assert.ok(!types.isProxy(value), 'MM source cohort rejects proxies');
  assert.ok(!ancestors.has(value), 'MM source cohort rejects cycles');
  assert.equal(Object.getOwnPropertySymbols(value).length, 0, 'MM source cohort rejects symbol properties');
  assert.ok(!Object.hasOwn(Object.prototype, 'toJSON') && !Object.hasOwn(Array.prototype, 'toJSON'), 'MM source cohort rejects inherited serialization hooks');
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    assert.equal(Object.getPrototypeOf(value), Array.prototype, 'MM source cohort requires plain arrays');
    assert.deepEqual(keys, Array.from({length: value.length}, (_, index) => String(index)), 'MM source cohort rejects sparse arrays');
    assert.deepEqual(Object.getOwnPropertyNames(value), [...keys, 'length'], 'MM source cohort rejects hidden array fields');
  } else {
    assert.equal(Object.getPrototypeOf(value), Object.prototype, 'MM source cohort requires plain objects');
    assert.deepEqual(Object.getOwnPropertyNames(value), keys, 'MM source cohort rejects hidden object fields');
  }
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(Object.hasOwn(descriptor, 'value'), 'MM source cohort rejects accessors');
    assertJsonTree(descriptor.value, ancestors);
  }
  ancestors.delete(value);
}

const ownerArray = (data, collection) => collection === 'progressionExplainer' ? [data[collection]] : data[collection];

export function createMmTreasureCurrentSourceCohort({repoRoot, contractBytes, expectedContractSha256}) {
  const root = resolve(repoRoot);
  assert.equal(rawSha(contractBytes), expectedContractSha256, 'exact independently reviewed MM current-M1 fixture bytes');
  const contract = JSON.parse(contractBytes);
  assert.equal(contract.artifactType, 'Closed MM treasure current M1 source cohort contract');
  assert.notEqual(contract.sourceEpoch.sourceCommit, '167ec2f88fb52785303385f148157f8b51dda9b5', 'reject the known p.74 crop-defect source epoch');
  assert.deepEqual(contract.mmSource.addedRuleIds, ['mm-treasure-types-table', 'mm-treasure-type-use']);
  assert.equal(contract.expectedCounts.priorOwners, 1062);
  assert.equal(contract.expectedCounts.addedOwners, 2);
  assert.equal(contract.expectedCounts.canonicalBindings, 5731);
  assert.equal(contract.expectedCounts.addedCanonicalBindings, 76);
  assert.equal(contract.expectedCounts.manualBindings, 1293);
  assert.equal(contract.expectedCounts.addedManualBindings, 42);
  assert.equal(contract.expectedCounts.tableRows, 26);
  assert.equal(contract.expectedCounts.tableCells, 208);
  assert.equal(contract.expectedCounts.historicalMechanicsReviewRecords, 1215);

  const git = (...args) => execFileSync('git', args, {cwd: root, maxBuffer: 128 * 1024 * 1024});
  let committedSourceBlobsVerified = false;
  for (const [index, commit] of contract.sourceEpoch.requiredAncestry.slice(1).entries()) {
    git('merge-base', '--is-ancestor', contract.sourceEpoch.requiredAncestry[index], commit);
  }
  git('merge-base', '--is-ancestor', contract.sourceEpoch.sourceCommit, 'HEAD');
  assert.equal(git('rev-parse', `${contract.sourceEpoch.sourceCommit}^{tree}`).toString().trim(), contract.sourceEpoch.sourceTree, 'frozen MM source tree matches');

  const h = contract.historicalH;
  assert.equal(git('rev-parse', `${h.sourceCommit}^{tree}`).toString().trim(), h.sourceTree, 'frozen H source8 tree matches');
  assert.equal(git('rev-parse', `${h.fullM1PreimageCommit}^{tree}`).toString().trim(), h.fullM1PreimageTree, 'frozen H full M1 preimage tree matches');
  for (const [ancestor, descendant] of [[h.sourceCommit, h.fullM1PreimageCommit], [h.fullM1PreimageCommit, contract.sourceEpoch.sourceCommit]]) {
    git('merge-base', '--is-ancestor', ancestor, descendant);
  }
  for (const [path, expected] of Object.entries(h.source8RawInputs)) {
    const hSourceBytes = git('show', `${h.sourceCommit}:${path}`);
    const hM1Bytes = git('show', `${h.fullM1PreimageCommit}:${path}`);
    assert.equal(rawSha(hSourceBytes), expected, `${path}: original H source8 bytes preserved`);
    assert.equal(rawSha(hM1Bytes), expected, `${path}: historical H source8 bytes preserved in complete H M1 preimage`);
  }

  const paths = Object.keys(contract.rawInputs);
  const additionalPaths = Object.keys(contract.selectedAdditionalInputs);
  function readMmTreasureCurrentSourceInputs(inputRoot = root) {
    assert.equal(resolve(inputRoot), root, 'current MM reader consumes this checkout directly');
    const read = path => readFileSync(resolve(root, path));
    return {
      data: JSON.parse(read('dist/data.json')),
      inventory: JSON.parse(read('research/price-source-inventory.json')),
      manual: JSON.parse(read('research/field-evidence-bindings.json')),
      mechanics: JSON.parse(read('research/mechanics-audit-progress.json')),
      rawInputs: Object.fromEntries(paths.map(path => [path, rawSha(read(path))])),
      additionalInputs: Object.fromEntries(additionalPaths.map(path => [path, rawSha(read(path))])),
    };
  }

  function assertMmTreasureCurrentSourceCohort(inputs) {
    const {data, inventory, manual, mechanics, rawInputs, additionalInputs} = inputs;
    for (const value of [data, inventory, manual, mechanics, rawInputs, additionalInputs]) assertJsonTree(value);
    git('merge-base', '--is-ancestor', contract.sourceEpoch.sourceCommit, 'HEAD');
    assert.deepEqual(Object.keys(rawInputs), paths, 'all and only the nine closed raw inputs are supplied in fixture order');
    assert.deepEqual(rawInputs, contract.rawInputs, 'all nine actual current source input bytes are exact');
    assert.deepEqual(Object.keys(additionalInputs), additionalPaths, 'all and only selected image/catalog/source metadata inputs are supplied');
    assert.deepEqual(additionalInputs, contract.selectedAdditionalInputs, 'selected MM evidence assets and metadata bytes are exact');
    for (const [key, value] of Object.entries({data, inventory, manual, mechanics})) {
      assert.equal(canonicalSha(value), contract.actualCurrentCanonicalSha256[key], `${key}: complete current M1 object exact`);
    }
    if (!committedSourceBlobsVerified) {
      for (const [path, expected] of Object.entries({...contract.rawInputs, ...contract.selectedAdditionalInputs})) {
        assert.equal(rawSha(git('show', `${contract.sourceEpoch.sourceCommit}:${path}`)), expected, `${path}: exact committed source bytes`);
      }
      committedSourceBlobsVerified = true;
    }

    const newIds = contract.mmSource.addedRuleIds;
    const currentRuleIds = data.rules.map(rule => rule.id);
    assert.deepEqual(currentRuleIds.slice(-newIds.length), newIds, 'the two new rules are the exact ordered append');
    for (const [collection, expected] of Object.entries(contract.expectedCounts.ownersByCollection)) {
      assert.equal(ownerArray(data, collection).length, expected, `${collection}: actual current owner count`);
      const retained = collection === 'rules'
        ? ownerArray(data, collection).filter(owner => !newIds.includes(owner.id))
        : ownerArray(data, collection);
      assert.equal(canonicalSha(retained), contract.historicalH.m1CanonicalSha256.ownersByCollection[collection], `${collection}: all H M1 owner objects and order preserved`);
    }
    const sources = data.sources.map(source => ({...source}));
    const mmSource = sources.find(source => source.id === contract.mmSource.priorSourceCoverageMutation.sourceId);
    assert.ok(mmSource, 'MM source metadata exists');
    assert.equal(mmSource.coverage, contract.mmSource.priorSourceCoverageMutation.after, 'exact declared MM coverage string');
    mmSource.coverage = contract.mmSource.priorSourceCoverageMutation.before;
    assert.equal(canonicalSha(sources), contract.historicalH.m1CanonicalSha256.sources, 'no other historical source metadata changed');

    const currentBindings = inventory.fieldEvidenceBindings;
    assert.equal(currentBindings.length, contract.expectedCounts.canonicalBindings, 'actual complete canonical binding denominator');
    const addedBindings = currentBindings.filter(binding => binding.collection === 'rules' && newIds.includes(binding.itemId));
    assert.equal(currentBindings.filter(binding => newIds.includes(binding.itemId)).length, addedBindings.length, 'the new item IDs occur only in the rules collection');
    const retainedBindings = currentBindings.filter(binding => !(binding.collection === 'rules' && newIds.includes(binding.itemId)));
    assert.equal(canonicalSha(retainedBindings), contract.delta.retainedCanonicalBindingsSha256, 'the complete 5,655-binding H array is preserved in original order');
    assert.deepEqual(addedBindings.map(canonicalSha), contract.delta.addedCanonicalBindingSha256, 'all 76 new canonical bindings are exact');
    const categories = Object.fromEntries(Object.entries(contract.delta.bindingCategoryCounts).map(([category]) => [category, addedBindings.filter(binding => binding.sourceCategory === category).length]));
    assert.deepEqual(categories, contract.delta.bindingCategoryCounts, 'manual, helper, and automatic binding categories are distinct');
    assert.equal(addedBindings.filter(binding => binding.reviewStatus === 'region-verified').length, contract.delta.addedBindingStatusCounts.regionVerified, 'locator status is not field approval');
    assert.equal(addedBindings.filter(binding => binding.reviewStatus === 'field-target-pending').length, contract.delta.addedBindingStatusCounts.fieldTargetPending, 'pending bindings retain pending status');

    assert.equal(manual.bindings.length, contract.expectedCounts.manualBindings, 'actual manual declaration denominator');
    assert.equal(canonicalSha(manual.bindings.slice(0, contract.expectedCounts.priorManualPrefix)), contract.historicalH.m1CanonicalSha256.manualBindings, 'all 1,251 H declarations remain the exact prefix');
    const newManual = manual.bindings.slice(contract.expectedCounts.priorManualPrefix);
    assert.deepEqual(newManual.map(canonicalSha), contract.delta.newManualSha256, 'all 42 MM declarations are exact');
    for (const binding of newManual) {
      assert.equal(binding.collection, 'rules', 'MM manual declaration owner collection is exact');
      assert.ok(newIds.includes(binding.itemId), 'MM manual declaration is attached to a declared new owner');
      assert.equal(binding.reviewStatus, 'field-target-pending', 'MM manual review remains pending');
      assert.equal(binding.sourceValueStatus, 'not-assessed-by-field-target-review', 'MM source values remain unassessed');
      assert.equal(binding.contextStatus, 'context-not-assessed', 'MM context remains unassessed');
    }

    const newRules = data.rules.filter(rule => newIds.includes(rule.id));
    assert.deepEqual(newRules.map(rule => [rule.id, canonicalSha(rule)]), Object.entries(contract.delta.ownerCanonicalSha256), 'new MM owners are exact whole records');
    const table = newRules.find(rule => rule.id === 'mm-treasure-types-table');
    assert.equal(table.table.rows.length, 26, 'MM table contains exactly 26 rows');
    assert.equal(table.table.rows.reduce((sum, row) => sum + row.cells.length, 0), 208, 'MM table contains exactly 208 literal cells');
    assert.deepEqual(table.table.rows.map(canonicalSha), contract.delta.tableRowHashes, 'all 26 complete rows match closed row hashes');
    assert.deepEqual(table.table.rows.map(row => row.cells.length), contract.delta.tableCellCountByRow, 'literal cell counts match per row');

    assert.equal(mechanics.reviewRecords.length, contract.expectedCounts.historicalMechanicsReviewRecords, 'historical mechanics-review record count remains fixed');
    assert.equal(canonicalSha(mechanics.reviewRecords), contract.historicalH.m1CanonicalSha256.mechanicsReviewRecords, 'all prior mechanics review records remain byte-for-byte canonical exact');
    assert.equal(mechanics.records.length, contract.expectedCounts.mechanicsOwnerRecords, 'current mechanics owner records');
    assert.equal(mechanics.counts.totalFields, contract.expectedCounts.mechanicsFormalFields, 'current formal mechanics field count');
    assert.equal(mechanics.counts.uncheckedFields, contract.expectedCounts.mechanicsUncheckedFields, 'current unchecked mechanics field count');

    return {
      sourceCommit: contract.sourceEpoch.sourceCommit,
      sourceTree: contract.sourceEpoch.sourceTree,
      owners: Object.values(contract.expectedCounts.ownersByCollection).reduce((sum, count) => sum + count, 0),
      addedOwners: newIds.length,
      canonicalBindings: currentBindings.length,
      retainedCanonicalBindings: retainedBindings.length,
      addedCanonicalBindings: addedBindings.length,
      manualBindings: manual.bindings.length,
      addedManualBindings: newManual.length,
      tableRows: table.table.rows.length,
      tableCells: table.table.rows.reduce((sum, row) => sum + row.cells.length, 0),
      historicalMechanicsReviewRecords: mechanics.reviewRecords.length,
      mechanicsOwnerRecords: mechanics.records.length,
      mechanicsFormalFields: mechanics.counts.totalFields,
      mechanicsUncheckedFields: mechanics.counts.uncheckedFields,
    };
  }
  return {readMmTreasureCurrentSourceInputs, assertMmTreasureCurrentSourceCohort};
}
