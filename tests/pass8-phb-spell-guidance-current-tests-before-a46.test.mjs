import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = 'tests/fixtures/pass8-phb-spell-guidance-current-test-expectations-before-a46.json.gz';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const zipped = readFileSync(path.join(root, fixturePath));
const raw = gunzipSync(zipped);
const archive = JSON.parse(raw);

test('the pre-edit current-test archive preserves exact a46 Git objects', () => {
  assert.equal(hash(zipped), '70f76cf84b41adcdc3b9e047c02dae59f67dbdfde800d657fe9852b53b72e428');
  assert.equal(hash(raw), 'c286c5b877c8dc37300d78cf2fdcfa016574d874cba482a13a3d0da0035651a7');
  assert.equal(archive.artifactType, 'pass8-phb-spell-guidance-current-test-expectations-before-a46');
  assert.equal(archive.baseCommit, 'a46eddc41ac6f712d5ad1498195df6a49810aae1');
  assert.deepEqual(archive.files.map(file => file.path), [
    'tests/books.test.mjs',
    'tests/citations.test.mjs',
    'tests/data.test.mjs',
    'tests/source-scan-inventory.test.mjs',
    'tests/dmg-private-evidence.test.mjs',
  ]);
  assert.equal(new Set(archive.files.map(file => file.path)).size, archive.files.length);
  for (const file of archive.files) {
    const bytes = Buffer.from(file.base64, 'base64');
    assert.equal(bytes.length, file.sizeBytes, `${file.path}: original byte length`);
    assert.equal(hash(bytes), file.sha256, `${file.path}: original content hash`);
    const gitBytes = execFileSync('git', ['show', `${archive.baseCommit}:${file.path}`], { cwd: root });
    assert.deepEqual(bytes, gitBytes, `${file.path}: exact Git predecessor bytes`);
  }
});
