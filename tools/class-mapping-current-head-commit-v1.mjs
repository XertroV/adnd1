// Pure parser for the actual repository HEAD commit. S1 and QCC use their
// separate strict single-parent identity verifier.
import {createHash} from 'node:crypto';

export function parseRawHeadCommitBytes(raw, expectedHead) {
  const fail = message => { throw new Error(`Invalid raw HEAD commit: ${message}`); };
  const validObjectId = value => /^[a-f0-9]{40}$/.test(value || '') && !/^0{40}$/.test(value);
  if (!Buffer.isBuffer(raw) || !validObjectId(expectedHead)) fail('commit identity input');
  const actualHead = createHash('sha1').update(`commit ${raw.length}\0`).update(raw).digest('hex');
  if (actualHead !== expectedHead) fail('raw commit object hash');
  const separator = raw.indexOf(Buffer.from('\n\n'));
  if (separator < 0) fail('raw commit header separator');
  // Latin-1 preserves each input byte, so high-bit bytes cannot be masked into
  // apparently valid ASCII hexadecimal by Buffer's `ascii` decoder.
  const header = raw.subarray(0, separator).toString('latin1').split('\n');
  const trees = header.filter(line => line.startsWith('tree '));
  const parents = header.filter(line => line.startsWith('parent '));
  if (trees.length !== 1 || !/^tree [a-f0-9]{40}$/.test(trees[0]) || !validObjectId(trees[0].slice(5)) || header[0] !== trees[0]) {
    fail('one valid first tree header required');
  }
  if (parents.length < 1 || parents.length > 2 || parents.some(line => !/^parent [a-f0-9]{40}$/.test(line) || !validObjectId(line.slice(7)))) {
    fail('one or two valid parent headers required');
  }
  const parentIds = parents.map(line => line.slice(7));
  if (new Set(parentIds).size !== parentIds.length) fail('parent headers must be distinct');
  return {tree:trees[0].slice(5), parents:parentIds};
}
