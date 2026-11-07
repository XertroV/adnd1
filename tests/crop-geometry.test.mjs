import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('crop geometry candidate fixtures run with Python standard library only', () => {
  const fixture = fileURLToPath(new URL('./crop-geometry-fixtures.py', import.meta.url));
  const result = spawnSync('python3', [fixture], {encoding: 'utf8'});
  assert.equal(result.status, 0, `geometry fixture failed: ${result.error || result.stderr}`);
});
