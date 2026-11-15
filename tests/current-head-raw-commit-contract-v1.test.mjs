import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {parseRawHeadCommitBytes} from '../tools/class-mapping-current-head-commit-v1.mjs';

const tree = '1'.repeat(40);
const firstParent = '2'.repeat(40);
const secondParent = '3'.repeat(40);
function commitBytes({trees=[tree], parents=[firstParent], message='fixture'} = {}) {
  return Buffer.from(`${trees.map(value => `tree ${value}`).join('\n')}\n${parents.map(value => `parent ${value}`).join('\n')}\nauthor A <a@example.test> 1 +0000\ncommitter A <a@example.test> 1 +0000\n\n${message}\n`, 'ascii');
}
function commitBytesWithHeaderByte(field, byte) {
  const bytes=commitBytes();
  const marker=Buffer.from(field==='tree'?'tree ':'parent ','ascii');
  const offset=bytes.indexOf(marker)+marker.length;
  bytes[offset]=byte;
  return bytes;
}
function commitId(bytes) {
  return createHash('sha1').update(`commit ${bytes.length}\0`).update(bytes).digest('hex');
}
function rejects(bytes, expected = commitId(bytes)) {
  assert.throws(() => parseRawHeadCommitBytes(bytes, expected));
}

test('accepts a valid single-parent actual HEAD commit', () => {
  const bytes = commitBytes();
  assert.deepEqual(parseRawHeadCommitBytes(bytes, commitId(bytes)), {tree, parents:[firstParent]});
});

test('accepts a valid two-parent GitHub merge HEAD commit', () => {
  const bytes = commitBytes({parents:[firstParent,secondParent]});
  assert.deepEqual(parseRawHeadCommitBytes(bytes, commitId(bytes)), {tree, parents:[firstParent,secondParent]});
});

test('rejects a raw commit whose computed hash differs from HEAD', () => {
  const bytes = commitBytes({parents:[firstParent,secondParent]});
  const wrongId = commitId(bytes) === '0'.repeat(40) ? 'f'.repeat(40) : '0'.repeat(40);
  rejects(bytes, wrongId);
});

test('rejects a malformed raw tree header', () => rejects(commitBytes({trees:['bad-tree']})));

test('rejects a high-bit byte hidden in the raw tree ID', () => rejects(commitBytesWithHeaderByte('tree',0xb1)));

test('rejects duplicate raw tree headers', () => rejects(commitBytes({trees:[tree,'4'.repeat(40)]})));

test('rejects malformed raw parent headers', () => rejects(commitBytes({parents:['bad-parent']})));

test('rejects a high-bit byte hidden in the raw parent ID', () => rejects(commitBytesWithHeaderByte('parent',0xb2)));

test('rejects more than two raw parent headers', () => rejects(commitBytes({parents:[firstParent,secondParent,'4'.repeat(40)]})));

test('rejects duplicate raw parent headers', () => rejects(commitBytes({parents:[firstParent,firstParent]})));
