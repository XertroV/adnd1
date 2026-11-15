import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dmg175HistoryContract} from './helpers/batch6-dmg175-source-history.mjs';
import {isExactCurrentDmg175Json, projectKnownDmg175OuterJson} from '../research/class-mapping-history-v1/source-postmetadata-facade-v2/pass8-ua-source-history-v2.proposed.mjs';

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
