import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {spawnSync} from 'node:child_process';

test('offline source audit preserves coordinate aliases and rejects unassessable bounds', () => {
  const result = spawnSync('python3', [new URL('./source-visual-audit-inputs.py', import.meta.url).pathname], {encoding:'utf8'});
  assert.equal(result.status, 0, result.error?.message || result.stderr);
});
