import test from 'node:test';
import {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,symlinkSync,unlinkSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {loadCurrentContinuationCandidateSnapshot,validateContinuationSnapshot} from '../tools/continuation-candidates-validate.mjs';
const root=process.cwd(),sha=b=>createHash('sha256').update(b).digest('hex');
const fixtureBytes=readFileSync('tests/fixtures/dmg-current-continuation-a5a-before.json.gz');
const before=JSON.parse(gunzipSync(fixtureBytes));
const temp=mkdtempSync(path.join(tmpdir(),'continuation-current-tests-'));
const oldCode=before.files['tools/continuation-candidates-validate.mjs'];
assert.equal(sha(Buffer.from(oldCode.utf8)),oldCode.sha256);
writeFileSync(path.join(temp,'old-validator.mjs'),oldCode.utf8);
copyFileSync('tools/mechanics-audit.mjs',path.join(temp,'mechanics-audit.mjs'));
copyFileSync('tools/mechanics-citation-page-transfer.mjs',path.join(temp,'mechanics-citation-page-transfer.mjs'));
const {validateContinuationSnapshot:oldValidate}=await import(pathToFileURL(path.join(temp,'old-validator.mjs')).href);
after(()=>rmSync(temp,{recursive:true,force:true}));
const selected=loadCurrentContinuationCandidateSnapshot({root});
function mutant(change){
 const full=JSON.parse(gunzipSync(readFileSync(selected.fullPath))),summary=structuredClone(selected.summary);
 change(full,summary);
 const dir=mkdtempSync(path.join(temp,'mutation-')),raw=Buffer.from(JSON.stringify(full)+'\n'),compressed=gzipSync(raw);
 writeFileSync(path.join(dir,'full.json.gz'),compressed);
 Object.assign(summary.fullEvidence,{path:'full.json.gz',sha256:sha(compressed),rawReportSha256:sha(raw)});
 const summaryPath=path.join(dir,'summary.json');writeFileSync(summaryPath,JSON.stringify(summary));
 return {root,summaryPath,treeSelection:'current-worktree'};
}
test('the exact old workflow/summary/full and all twelve real CI errors remain frozen',()=>{
 assert.equal(sha(fixtureBytes),'7c1af89d36234a04f37cd27f384f65efec5e9cceb1af9c82db17638a1e7a4087');
 assert.equal(before.validation.valid,false);assert.equal(before.validation.errors.length,12);
 assert.match(before.files['.github/workflows/pages.yml'].utf8,/--summary research\/source-audit-batch5-continuation-current.json --force-current-tree/);
 for(const p of ['research/source-audit-batch5-continuation-current.json','research/source-audit-batch5-continuation-current-full.json.gz'])assert.equal(sha(readFileSync(p)),before.files[p].sha256);
});
test('forcing the old snapshot against the current tree still fails',()=>{
 const result=validateContinuationSnapshot({root,summaryPath:path.resolve('research/source-audit-batch5-continuation-current.json'),treeSelection:'current-worktree'});
 assert.equal(result.valid,false);assert.ok(result.errors.some(x=>x.code==='stale-data-input'));
 assert.ok(result.errors.some(x=>x.code==='stale-continuation-manifest'));
});
test('the active pair covers the complete current tree without a semantic-source pass',()=>{
 const result=validateContinuationSnapshot({root,summaryPath:selected.summaryPath,fullPath:selected.fullPath,treeSelection:'current-worktree'});
 assert.deepEqual(result.errors,[]);assert.equal(result.valid,true);
 const full=JSON.parse(gunzipSync(readFileSync(selected.fullPath)));
 assert.equal(result.counts.propertyRecords,full.propertyPointerInventory.records.length);
 assert.equal(result.counts.catalogRegionRows,full.regionAssessments.length);
 assert.equal(result.counts.propertyPointers,full.propertyPointerInventory.propertyRows.length);
 assert.equal(result.counts.distinctSourcePageBindings,selected.summary.exposedUniverse.uniqueSourcePageBindings);
 assert.match(result.sourcePdfRegeneration,/not regenerated from private PDFs/);
});
test('an omitted declared alias cannot be hidden by a matching row counter and recomputed hashes',()=>{
 const options=mutant((full,summary)=>{full.regionAssessments=full.regionAssessments.filter(r=>!(r.regionId==='ua-69-b8b05ef9807ad0f8'&&r.owner.itemId==='ua-illusionist-death-fog'));summary.exposedCatalogSummary.catalogRegionRows--;});
 assert.equal(oldValidate(options).valid,true,'exact pre-fix checker reproduces the omission false pass');
 const result=validateContinuationSnapshot(options);assert.equal(result.valid,false);
 assert.ok(result.errors.some(x=>x.code==='current-region-assessment-missing'&&x.detail.includes('ua-69-b8b05ef9807ad0f8')));
});
test('an unknown assessment cannot substitute for a current region',()=>{
 const options=mutant(full=>{full.regionAssessments[0].regionId='unknown-current-region';});
 const result=validateContinuationSnapshot(options);assert.equal(result.valid,false);
 assert.ok(result.errors.some(x=>x.code==='stale-region-id'));
 assert.ok(result.errors.some(x=>x.code==='current-region-assessment-missing'));
});
function pointerFixture(){
 const dir=mkdtempSync(path.join(temp,'pointer-'));mkdirSync(path.join(dir,'research'));
 const full=gzipSync('{}');const summary=Buffer.from(JSON.stringify({fullEvidence:{path:'full.json.gz',sha256:sha(full)}}));
 writeFileSync(path.join(dir,'research/full.json.gz'),full);writeFileSync(path.join(dir,'research/summary.json'),summary);
 const pointer={schemaVersion:1,summary:{path:'research/summary.json',sha256:sha(summary)},fullEvidence:{path:'research/full.json.gz',sha256:sha(full)}};
 const save=()=>writeFileSync(path.join(dir,'research/current-continuation-candidate-snapshot.json'),JSON.stringify(pointer));save();return {dir,pointer,save};
}
test('active pointer paths, hashes, missing files and summary/full pair identity fail closed',()=>{
 for(const change of [
  f=>{f.pointer.summary.path='../summary.json';f.save();},
  f=>{f.pointer.fullEvidence.path='/tmp/full.json.gz';f.save();},
  f=>{f.pointer.summary.sha256='0'.repeat(64);f.save();},
  f=>unlinkSync(path.join(f.dir,'research/full.json.gz')),
  f=>{f.pointer.schemaVersion=2;f.save();},
  f=>{const bytes=Buffer.from(JSON.stringify({fullEvidence:{path:'other.json.gz',sha256:f.pointer.fullEvidence.sha256}}));writeFileSync(path.join(f.dir,'research/summary.json'),bytes);f.pointer.summary.sha256=sha(bytes);f.save();},
 ]){const f=pointerFixture();change(f);assert.throws(()=>loadCurrentContinuationCandidateSnapshot({root:f.dir}));}
});
test('active source snapshots cannot escape through a symlink',()=>{
 const f=pointerFixture(),outside=mkdtempSync(path.join(tmpdir(),'continuation-outside-'));
 try{const bytes=readFileSync(path.join(f.dir,'research/full.json.gz'));writeFileSync(path.join(outside,'full.json.gz'),bytes);unlinkSync(path.join(f.dir,'research/full.json.gz'));symlinkSync(path.join(outside,'full.json.gz'),path.join(f.dir,'research/full.json.gz'));assert.throws(()=>loadCurrentContinuationCandidateSnapshot({root:f.dir}),/escapes/);}
 finally{rmSync(outside,{recursive:true,force:true});}
});
test('the current selector cannot opt into pinned history, explicit replacement files or unknown flags',()=>{
 for(const args of [
  ['--current-snapshot','--allow-pinned-history'],
  ['--current-snapshot','--force-current-tree','--summary','research/source-audit-batch5-continuation-current.json'],
  ['--current-snapshot','--force-current-tree','--unknown-option'],
 ]){const result=spawnSync(process.execPath,['tools/continuation-candidates-validate.mjs',...args,'--output-dir',path.join(temp,'output')]);assert.equal(result.status,2);}
});
