// Finite report-input closure checks; no source mechanic or whole-book approval.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as c from '../tools/class-mapping-report-input-contract-v3.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),sorted=x=>[...x].sort();
const manifest=JSON.parse(read('research/class-mapping-source-epoch-v2/report-data-coverage-v3.json'));
const git=(...args)=>execFileSync('git',['--no-replace-objects',...args],{cwd:root,maxBuffer:128*1024*1024});
test('117 legacy and five current payload paths form the exact unique required report partition',()=>{
 assert.deepEqual(manifest.partition,{legacyRequiredCount:117,newCurrentBindingCount:5,totalRequired:122,optionalPathCount:12});
 const old=manifest.legacyRows.map(r=>r.path),fresh=manifest.newRows.map(r=>r.path),all=[...old,...fresh];
 assert.equal(new Set(all).size,122);assert.deepEqual(sorted(fresh),sorted(c.CURRENT_CONSUMER_CONTRACT_PATHS));
 assert.deepEqual(sorted(all),sorted(c.REPORT_DATA_PATHS));assert.deepEqual(sorted(manifest.reportDataPathsV3),sorted(all));
 assert.deepEqual(sorted(manifest.optionalDataPaths),sorted(c.REPORT_OPTIONAL_DATA_PATHS));
 for(const path of manifest.optionalDataPaths)assert.ok(!all.includes(path));
});
test('every legacy data witness reproduces its exact raw Source2 B object and installed bytes',()=>{
 for(const row of manifest.legacyRows){const raw=git('show',c.SOURCE_BODY_COMMIT+':'+row.path);assert.equal(raw.length,row.sizeBytes,row.path);assert.equal(hash(raw),row.rawSha256,row.path);assert.equal(git('rev-parse',c.SOURCE_BODY_COMMIT+':'+row.path).toString().trim(),row.gitBlobOid,row.path);assert.ok(read(row.path).equals(raw),row.path);}
});
test('five immutable successor payloads match independently pinned contract digests without grade promotion',()=>{
 for(const row of manifest.newRows){const bytes=read(row.path);assert.equal(bytes.length,row.candidateSizeBytes,row.path);assert.equal(hash(bytes),row.candidateRawSha256,row.path);assert.equal(hash(bytes),row.expectedFinalSha256,row.path);assert.equal(hash(bytes),c.CURRENT_CONSUMER_PENDING_CONTRACT_SHA256[row.path],row.path);}
 assert.equal(manifest.acceptedFixtureSha256,c.SOURCE_BODY_FIXTURE_SHA256);assert.equal(manifest.acceptedNativePinSha256,c.NATIVE_PIN_MODULE_SHA256);
 assert.equal(manifest.grades.sourceValueOrReviewStatusPromotions,0);assert.equal(manifest.grades.sourceCompletenessCertified,false);assert.equal(manifest.grades.sourceSemanticPass,false);
});
test('historical adapter witnesses retain exact B bytes and remain separate from current payloads',()=>{
 assert.equal(manifest.historicalOldVersions.length,5);
 for(const row of manifest.historicalOldVersions){assert.ok(c.HISTORICAL_REPORT_DATA_PATHS.includes(row.oldPath));assert.ok(c.CURRENT_CONSUMER_CONTRACT_PATHS.includes(row.newPath));const raw=git('show',c.SOURCE_BODY_COMMIT+':'+row.oldPath);assert.equal(hash(raw),row.oldRawSha256,row.oldPath);assert.equal(raw.length,row.sizeBytes,row.oldPath);assert.ok(read(row.oldPath).equals(raw),row.oldPath);}
});
