import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMmTreasureCurrentSourceCohort} from './helpers/mm-treasure-current-m1-cohort-factory-v2.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const originalBytes = readFileSync(new URL('./fixtures/mm-treasure-current-m1-cohort-v1.json', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('the exported MM factory rejects an altered contract even with its matching caller-supplied digest', () => {
  const contract = JSON.parse(originalBytes);
  contract.actualCurrentCanonicalSha256.mechanics = '0'.repeat(64);
  const changedBytes = Buffer.from(JSON.stringify(contract, null, 2) + '\n');
  assert.notEqual(sha(changedBytes), sha(originalBytes));
  assert.throws(() => createMmTreasureCurrentSourceCohort({
    repoRoot: root,
    contractBytes: changedBytes,
    expectedContractSha256: sha(changedBytes),
  }), /fixed reviewed contract digest/);
  assert.throws(() => createMmTreasureCurrentSourceCohort({
    repoRoot: root,
    contractBytes: changedBytes,
    expectedContractSha256: sha(originalBytes),
  }), /exact independently reviewed MM/);
});
