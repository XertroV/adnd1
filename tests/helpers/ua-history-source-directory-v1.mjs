// Exact, in-memory historical source directory. The test sees the real raw
// Git blob bytes for every M1 path; a single cat-file batch avoids thousands
// of subprocesses and does not materialize a historical checkout on disk.
import assert from 'node:assert/strict';
import {execFileSync as nodeExecFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

export const sourceCommit = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
export const sourceTree = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
export const repositoryRoot = resolve(import.meta.dirname, '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function rawGit(args, options = {}) {
  return nodeExecFileSync('git', args, {
    ...options,
    cwd: repositoryRoot,
    maxBuffer: Math.max(options.maxBuffer || 0, 512 * 1024 * 1024),
  });
}
function cwdPath(value) { return resolve(value instanceof URL ? fileURLToPath(value) : String(value)); }
function resultEncoding(bytes, encoding) {
  return encoding && encoding !== 'buffer' ? bytes.toString(encoding) : Buffer.from(bytes);
}

assert.equal(rawGit(['rev-parse', `${sourceCommit}^{tree}`], {encoding:'utf8'}).trim(), sourceTree,
  'exact historical M1 source tree');
rawGit(['merge-base','--is-ancestor',sourceCommit,'HEAD']);

const listing = rawGit(['ls-tree','-r','-z','-l',sourceCommit,'--','dist','tools']);
const rows = listing.toString('utf8').split('\0').filter(Boolean).map(entry => {
  const tab = entry.indexOf('\t');
  assert.ok(tab > 0, 'Git tree record has a path separator');
  const [mode,type,oid,sizeText] = entry.slice(0,tab).trim().split(/\s+/);
  const path = entry.slice(tab+1);
  assert.equal(type,'blob',`${path}: only regular Git blobs are in the historical source listing`);
  assert.match(oid,/^[a-f0-9]{40}$/);
  assert.ok(Number.isSafeInteger(Number(sizeText)) && Number(sizeText)>=0);
  return {path,mode,oid,size:Number(sizeText)};
});
assert.equal(rows.length,3239,'fixed historical M1 dist/tools path count');
const rowByPath = new Map(rows.map(row => [row.path,row]));
assert.equal(rowByPath.size,rows.length,'unique historical source paths');

// The blob OIDs are read from the exact pinned tree, then sent together to
// Git's batch reader. Retain views into this one output buffer so the cache
// avoids a second 350+ MB copy.
const uniqueOids = [...new Set(rows.map(row => row.oid))];
const input = Buffer.from(uniqueOids.map(oid => `${oid}\n`).join(''));
const batch = rawGit(['cat-file','--batch'],{input,maxBuffer:512*1024*1024});
const blobByOid = new Map();
let cursor = 0;
for (const expectedOid of uniqueOids) {
  const headerEnd = batch.indexOf(0x0a,cursor);
  assert.ok(headerEnd >= cursor, `${expectedOid}: cat-file header terminator`);
  const [oid,type,sizeText] = batch.subarray(cursor,headerEnd).toString('ascii').split(' ');
  const size = Number(sizeText), start = headerEnd+1, end = start+size;
  assert.equal(oid,expectedOid,'cat-file returned the exact tree-listed object');
  assert.equal(type,'blob','cat-file object type');
  assert.ok(Number.isSafeInteger(size) && size>=0 && end<batch.length,'cat-file bounded blob length');
  assert.equal(batch[end],0x0a,'cat-file blob terminator');
  blobByOid.set(oid,batch.subarray(start,end));
  cursor=end+1;
}
assert.equal(cursor,batch.length,'no trailing unparsed batch output');
for (const row of rows) assert.equal(blobByOid.get(row.oid).length,row.size,`${row.path}: exact Git blob size`);

const uaFixturePath = resolve(repositoryRoot,'tests/fixtures/pass8-ua-source-history-v1.json.gz');
const uaFixtureBytes = readFileSync(uaFixturePath);
assert.equal(sha(uaFixtureBytes),'8d4d781dfa364b677d279753991dbe5cb14f3fee0e7ead08538a54d7ca89d89a',
  'closed UA history contract bytes');
const uaContract = JSON.parse(gunzipSync(uaFixtureBytes));
const weaponFixturePath = resolve(repositoryRoot,'tests/fixtures/pass8-weapon-source-history-v1.json.gz');
const weaponFixtureBytes = readFileSync(weaponFixturePath);
assert.equal(sha(weaponFixtureBytes),'049924ffd08e0fd88839ddea635f34300bab9800a4299c39cb41cb77abafb1f8',
  'closed weapon-history support contract bytes');
const weaponContract = JSON.parse(gunzipSync(weaponFixtureBytes));
const callersPath = resolve(repositoryRoot,'tests/fixtures/pass8-ua-source-history-callers-before-v1.json.gz');
const callersBytes = readFileSync(callersPath);
assert.equal(sha(callersBytes),'96e635799baa670b37d1a97f32e0c7febb1cf1468d27d311d20f2aaae9237ceb',
  'closed caller-preimage manifest bytes');
const callers = JSON.parse(gunzipSync(callersBytes));
const kernelPath = resolve(repositoryRoot,'research/ua-source-history-integration-v1/old-kernel-preservation-manifest-v1.json');
const kernelBytes = readFileSync(kernelPath);
assert.equal(sha(kernelBytes),'55f19741500e649c5fb84d35dcd4ee1da7825559b8850a6b029922cc12b92f41',
  'closed old-helper preservation input');
const kernel = JSON.parse(kernelBytes.toString('utf8'));

const allowedShowPairs = new Set();
function allowShow(commit,path) { allowedShowPairs.add(`${commit}:${path}`); }
function allowContract(contract) {
  for (const path of [...(contract.sourcePaths||[]),...(contract.metadataPaths||[]),...(contract.rawPaths||[])]) {
    allowShow(contract.sourceCommit,path); allowShow(contract.beforeCommit,path);
  }
  for (const [path,stage] of Object.entries(contract.files||{})) {
    allowShow(contract.beforeCommit,path); allowShow(contract.sourceCommit,path);
    allowShow(contract.metadataCommit,path); allowShow(stage.afterCommit,path);
  }
  for (const [path,stage] of Object.entries(contract.rawFiles||{})) {
    allowShow(contract.beforeCommit,path); allowShow(contract.sourceCommit,path);
    allowShow(contract.metadataCommit,path); allowShow(stage.afterCommit,path);
  }
}
allowContract(uaContract);
allowContract(weaponContract);
for (const row of callers.files) allowShow(callers.commit,row.path);
for (const row of kernel.files) allowShow(kernel.beforeCommit,row.path);
for (const path of ['classes.json']) allowShow(uaContract.beforeCommit,path);

export function historicalSourceDirectoryPaths() { return rows.map(row => row.path); }
export function readHistoricalSourceDirectoryPath(path) {
  const row = rowByPath.get(path);
  assert.ok(row, `${path}: only exact paths from the fixed M1 dist/tools tree`);
  const bytes = blobByOid.get(row.oid);
  assert.equal(bytes.length,row.size,`${path}: exact cached historical raw bytes`);
  return Buffer.from(bytes);
}

export function execFileSync(file,args,options={}) {
  assert.equal(file,'git','only Git is allowed by this historical source adapter');
  assert.ok(Array.isArray(args) && args.every(value=>typeof value==='string'),'string-only Git argv');
  assert.equal(cwdPath(options.cwd),repositoryRoot,'fixed repository root');
  if (JSON.stringify(args)===JSON.stringify(['ls-files','--cached','--others','--exclude-standard','-z','--','dist','tools'])) {
    return resultEncoding(Buffer.from(rows.map(row=>row.path).join('\0')+'\0'),options.encoding);
  }
  if (args[0]==='show' && args.length===2) {
    const match=/^([a-f0-9]{40}):(.+)$/.exec(args[1]);
    assert.ok(match && allowedShowPairs.has(args[1]),'only source paths and Git stages sealed by the original fixtures can be read');
    const path = match[2];
    assert.ok(!path.startsWith('/') && !path.includes('\\') && path.split('/').every(part=>part && part!=='.' && part!=='..'),
      'safe relative Git path');
    return resultEncoding(rawGit(args,options),options.encoding);
  }
  throw new Error('Historical UA source adapter: unsupported command or arguments');
}
