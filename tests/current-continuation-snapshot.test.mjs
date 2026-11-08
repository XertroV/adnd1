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
function archivedPdfSelection(){
 const commit='853f2fb931c7e18d50caf06f43c73df848ff5ab2';
 const gitBytes=relativePath=>{
  const result=spawnSync('git',['show',`${commit}:${relativePath}`],{cwd:root,maxBuffer:150*1024*1024});
  assert.equal(result.status,0,`Archived source snapshot remains available: ${relativePath}`);return result.stdout;
 };
 const pointer=JSON.parse(gitBytes('research/current-continuation-candidate-snapshot.json'));
 assert.deepEqual(pointer,{schemaVersion:1,summary:{path:'research/source-audit-batch6-xp-a65-continuation-current-v1.json',sha256:'d081a85bb937b9213512a1868e4bd03467740552ff8fd89b0faee5d6fc4cfe3d'},fullEvidence:{path:'research/source-audit-batch6-xp-a65-continuation-current-v1-full.json.gz',sha256:'9cad1ff653cce0505b0bf81ccd38490d0d760178bc5c774c58744af71d68d79d'}});
 const summaryBytes=gitBytes(pointer.summary.path),fullBytes=gitBytes(pointer.fullEvidence.path),summary=JSON.parse(summaryBytes);
 assert.equal(sha(summaryBytes),pointer.summary.sha256);assert.equal(sha(fullBytes),pointer.fullEvidence.sha256);
 assert.equal(summary.input.sourceTreeMode,'pinned-git-commit');
 assert.equal(summary.input.gitCommit,'3d610f60763b7343e7bd4bb5508d5461a6c90bf3');
 const dir=mkdtempSync(path.join(temp,'archived-pdf-')),summaryPath=path.join(dir,'summary.json'),fullPath=path.join(dir,'full.json.gz');
 writeFileSync(summaryPath,summaryBytes);writeFileSync(fullPath,fullBytes);
 return {summary,summaryPath,fullPath};
}
function mutant(change,{source=selected,treeSelection='current-worktree'}={}){
 const full=JSON.parse(gunzipSync(readFileSync(source.fullPath))),summary=structuredClone(source.summary);
 change(full,summary);
 const dir=mkdtempSync(path.join(temp,'mutation-')),raw=Buffer.from(JSON.stringify(full)+'\n'),compressed=gzipSync(raw);
 writeFileSync(path.join(dir,'full.json.gz'),compressed);
 Object.assign(summary.fullEvidence,{path:'full.json.gz',sha256:sha(compressed),rawReportSha256:sha(raw)});
 const summaryPath=path.join(dir,'summary.json');writeFileSync(summaryPath,JSON.stringify(summary));
 return {root,summaryPath,treeSelection};
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
test('the archived PDF-only tree reproduces the omitted-alias false pass against its exact captured source tree',()=>{
 const source=archivedPdfSelection(),base={root,summaryPath:source.summaryPath,fullPath:source.fullPath,treeSelection:'pinned-git-commit'};
 const full=JSON.parse(gunzipSync(readFileSync(source.fullPath)));
 assert.equal(full.regionAssessments.length,3391);
 assert.equal(full.regionAssessments.some(r=>r.sourceKind==='supplemental-image'),false);
 assert.equal(oldValidate(base).valid,true);assert.equal(validateContinuationSnapshot(base).valid,true);
 const options=mutant((full,summary)=>{const before=full.regionAssessments.length;full.regionAssessments=full.regionAssessments.filter(r=>!(r.regionId==='ua-69-b8b05ef9807ad0f8'&&r.owner.itemId==='ua-illusionist-death-fog'));assert.equal(full.regionAssessments.length,before-1);summary.exposedCatalogSummary.catalogRegionRows--;},{source,treeSelection:'pinned-git-commit'});
 assert.equal(oldValidate(options).valid,true,'exact pre-fix checker reproduces the omission false pass');
 const result=validateContinuationSnapshot(options);assert.equal(result.valid,false);
 assert.ok(result.errors.some(x=>x.code==='current-region-assessment-missing'&&x.detail.includes('ua-69-b8b05ef9807ad0f8')));
});
test('the native current3396-row universe includes exactly the three new matrix owners and rejects an omitted alias',()=>{
 const full=JSON.parse(gunzipSync(readFileSync(selected.fullPath))),supplemental=full.regionAssessments.filter(r=>r.sourceKind==='supplemental-image');
 assert.equal(full.regionAssessments.length,3396);
 assert.equal(selected.summary.exposedUniverse.catalogRegionUsageCount,3396);
 assert.equal(selected.summary.exposedUniverse.bindingRegionUsageCount,3399,'binding uses are a separate denominator from catalog-region rows');
 const newMatrixOwners=[
  {itemId:'dmg-cleric-druid-monk-attack-matrix',regionId:'dmg-74-ia-cleric-druid-monk',catalog:'scans/verified/matrices-dmg-cleric-druid-monk-attack-matrix.json'},
  {itemId:'dmg-magic-user-illusionist-attack-matrix',regionId:'dmg-74-ic-magic-user-illusionist',catalog:'scans/verified/matrices-dmg-magic-user-illusionist-attack-matrix.json'},
  {itemId:'dmg-thief-assassin-attack-matrix',regionId:'dmg-74-id1-thief-assassin',catalog:'scans/verified/matrices-dmg-thief-assassin-attack-matrix.json'},
 ];
 const currentNewMatrixRows=full.regionAssessments.filter(r=>newMatrixOwners.some(expected=>expected.itemId===r.owner?.itemId)).map(r=>({collection:r.owner.collection,itemId:r.owner.itemId,catalog:r.owner.catalog,regionId:r.regionId,book:r.book,printedPage:r.printedPage,pdfPage:r.pdfPage})).sort((a,b)=>a.itemId.localeCompare(b.itemId));
 assert.deepEqual(currentNewMatrixRows,newMatrixOwners.map(expected=>({collection:'matrices',...expected,book:'DMG',printedPage:74,pdfPage:75})).sort((a,b)=>a.itemId.localeCompare(b.itemId)));
 assert.deepEqual(supplemental.map(r=>r.regionId).sort(),['dmg-175-level-others-context-5aa02e91e35c4c28','dmg-175-party-table-context-78c4c383c38c7d10']);
 for(const row of supplemental){assert.equal(row.sourceSha256,'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');assert.equal(row.sourceArtifactId,'dmg175-user-confirmed-supplement');assert.equal(row.pdfPage,null);}
 const options=mutant((copy,summary)=>{copy.regionAssessments=copy.regionAssessments.filter(r=>!(r.regionId==='ua-69-b8b05ef9807ad0f8'&&r.owner.itemId==='ua-illusionist-death-fog'));assert.equal(copy.regionAssessments.length,3395);assert.deepEqual(copy.regionAssessments.filter(r=>r.sourceKind==='supplemental-image'),supplemental);summary.exposedCatalogSummary.catalogRegionRows--;});
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
