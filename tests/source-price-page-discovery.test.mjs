import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('offline source-price discovery cue fixtures run with Python standard library only',()=>{
  const fixture=fileURLToPath(new URL('./source-price-page-discovery-fixtures.py',import.meta.url));
  const result=spawnSync('python3',[fixture],{encoding:'utf8'});
  assert.equal(result.status,0,`source-price cue fixture failed: ${result.error||result.stderr}`);
});
