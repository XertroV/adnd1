import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {validateHistoricalUa26Command} from './helpers/ua26-historical-cli-v1.mjs';

const root = resolve(import.meta.dirname, '..');
const args = () => ['tools/ua26-note-marker-audit-mm-v1.mjs'];
const options = () => ({cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});

test('UA26 historical command transport admits only its exact command and fixed options', () => {
  const result = validateHistoricalUa26Command(process.execPath, args(), options());
  assert.equal(result.root, root);
  assert.equal(result.replayCommand, 'research/class-mapping-history-v1/replay-tools/ua26-note-marker-audit-mm-s1-v1.mjs');
  for (const change of [
    () => validateHistoricalUa26Command('node', args(), options()),
    () => validateHistoricalUa26Command(process.execPath, ['other.mjs'], options()),
    () => validateHistoricalUa26Command(process.execPath, [...args(),'--check'], options()),
    () => validateHistoricalUa26Command(process.execPath, args(), {...options(),cwd:'/tmp'}),
    () => validateHistoricalUa26Command(process.execPath, args(), {...options(),env:{}}),
    () => validateHistoricalUa26Command(process.execPath, args(), {...options(),maxBuffer:1}),
  ]) assert.throws(change);
});

test('UA26 command rejection does not invoke caller getters or proxies', () => {
  let hits = 0;
  const getterOptions = options();
  Object.defineProperty(getterOptions, 'cwd', {get(){hits++;return root;},enumerable:true});
  assert.throws(() => validateHistoricalUa26Command(process.execPath,args(),getterOptions));
  const proxyArgs = new Proxy(args(), {get(){hits++;return undefined;},ownKeys(){hits++;return [];}});
  assert.throws(() => validateHistoricalUa26Command(process.execPath,proxyArgs,options()));
  const proxyOptions = new Proxy(options(), {get(){hits++;return undefined;},ownKeys(){hits++;return [];}});
  assert.throws(() => validateHistoricalUa26Command(process.execPath,args(),proxyOptions));
  assert.equal(hits, 0);
});
