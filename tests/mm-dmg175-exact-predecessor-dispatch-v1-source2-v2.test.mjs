// Additive Source2 family successor; original case and historical-role assertions are preserved.
// Current Source2 admission remains a separate genuine zero-argument identity case.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dmg175HistoryContract} from './helpers/batch6-dmg175-source-history.mjs';
import {isExactCurrentDmg175Json, projectKnownDmg175OuterJson} from "../research/class-mapping-history-v1/source-postmetadata-facade-v2/pass8-ua-source-history-source2-v2.mjs";

const objectSha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const expectedPredecessorObjectSha256 = '00c7794cc7a8e888cfdc524291da7269226d98bfc216c4d9c8bcd5ac0c7e3250';

test('the exact Dmg175 data predecessor is noncurrent; only that pinned state takes the old-kernel path', () => {
  const before = dmg175HistoryContract().files['dist/data.json'].before;
  assert.equal(objectSha(before), expectedPredecessorObjectSha256);
  assert.equal(isExactCurrentDmg175Json('dist/data.json', before), false);
  assert.deepEqual(projectKnownDmg175OuterJson('dist/data.json', before), before);

  const changed = structuredClone(before);
  changed.release.priceInventory.fieldEvidenceBindings += 1;
  assert.throws(() => isExactCurrentDmg175Json('dist/data.json', changed));
  assert.throws(() => projectKnownDmg175OuterJson('dist/data.json', changed));
});


// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
