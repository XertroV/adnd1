// Exact S1 Paladin source-catalog predecessor transport for sealed XP/UA
// historical tests. This is test-only and does not alter source values,
// grades, IDs, current qualified loaders, or their source pins.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const repoRoot = resolve(import.meta.dirname,'../..');
const manifestPath = resolve(import.meta.dirname,'pass8-s1-paladin-catalog-history-v1.json');
const manifestBytes = readFileSync(manifestPath);
const manifestSha256 = 'b8b734885b277e839466ccec33d45d6ed97e4bfe2404b3ee906df499c9bb8429';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256(manifestBytes),manifestSha256,'fixed S1 Paladin catalog predecessor transport manifest');
const manifest = JSON.parse(manifestBytes.toString('utf8'));
assert.equal(manifest.artifactType,'Exact S1 Paladin catalog predecessor transport candidate');
assert.equal(manifest.sourceEpoch.sourceCommit,'2d35138027f00c0740975e519dbb3a2b6df76d14');
assert.equal(execFileSync('git',['rev-parse',`${manifest.sourceEpoch.sourceCommit}^{tree}`],{cwd:repoRoot,encoding:'utf8'}).trim(),manifest.sourceEpoch.sourceTree);
execFileSync('git',['merge-base','--is-ancestor',manifest.sourceEpoch.sourceCommit,'HEAD'],{cwd:repoRoot});

const base = await import(pathToFileURL(resolve(repoRoot,
  'research/class-mapping-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs')).href);
const gitBytes = (commit,path) => execFileSync('git',['show',`${commit}:${path}`],{cwd:repoRoot,maxBuffer:128*1024*1024});
const rows = new Map(Object.entries(manifest.files));
assert.deepEqual([...rows.keys()].sort(),[
  'dist/scans/verified/classes-paladin.json',
  'dist/scans/verified/classes-ua-paladin.json',
]);
for (const [path,row] of rows) {
  const current = gitBytes(manifest.sourceEpoch.sourceCommit,path);
  assert.equal(sha256(current),row.currentRawSha256,`${path}: exact committed S1 raw bytes`);
  assert.equal(sha256(readFileSync(resolve(repoRoot,path))),row.currentRawSha256,`${path}: live S1 worktree raw bytes`);
  const target = gitBytes(row.targetCommit,path);
  assert.equal(sha256(target),row.targetRawSha256,`${path}: exact historic predecessor raw bytes`);
}

export const projectPass8PhbSourceJson = base.projectPass8PhbSourceJson;
export const decodePass8UaSourceHistory = base.decodePass8UaSourceHistory;
export const readBeforePass8XpContinuationFile = base.readBeforePass8XpContinuationFile;
export const readBeforePass8CharacterReferenceFile = base.readBeforePass8CharacterReferenceFile;

export function projectPass8PhbSourceBytes(path,bytes) {
  const row = rows.get(path);
  if (!row) return base.projectPass8PhbSourceBytes(path,bytes);
  const fingerprint = sha256(bytes);
  const accepted = [row.currentRawSha256,row.targetRawSha256,row.xpBeforeRawSha256,row.uaBeforeRawSha256].filter(Boolean);
  assert.ok(accepted.includes(fingerprint),`${path}: exact S1 or declared historical stage raw bytes required`);
  const normalized = fingerprint===row.currentRawSha256 ? gitBytes(row.targetCommit,path) : Buffer.from(bytes);
  assert.ok([row.targetRawSha256,row.xpBeforeRawSha256,row.uaBeforeRawSha256].filter(Boolean).includes(sha256(normalized)),
    `${path}: closed historical catalog stage required`);
  const result = base.projectPass8PhbSourceBytes(path,normalized);
  if (path.endsWith('classes-paladin.json')) assert.equal(sha256(result),row.targetRawSha256,`${path}: exact a46 XP stage`);
  if (path.endsWith('classes-ua-paladin.json')) assert.equal(sha256(result),row.uaBeforeRawSha256,`${path}: exact UA/6717 XP stage`);
  return result;
}
