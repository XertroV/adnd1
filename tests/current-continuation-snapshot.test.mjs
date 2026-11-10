import test from 'node:test';
import {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,symlinkSync,unlinkSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {spawnSync,execFileSync} from 'node:child_process';
import {loadCurrentContinuationCandidateSnapshot,validateContinuationSnapshot} from '../tools/continuation-candidates-validate.mjs';
import {assertCurrentUaContinuationCohort} from './helpers/ua-source-continuation-current-cohort.mjs';
import {readHirelingsCurrentSourceInputs,assertHirelingsCurrentSourceCohort} from './helpers/hirelings-source-current-cohort.mjs';
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
function historicalUaSelection(){
 const commit='386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
 const gitBytes=relativePath=>{
  const result=spawnSync('git',['show',`${commit}:${relativePath}`],{cwd:root,maxBuffer:150*1024*1024});
  assert.equal(result.status,0,`V28 historical source pair remains available: ${relativePath}`);return result.stdout;
 };
 const pointer=JSON.parse(gitBytes('research/current-continuation-candidate-snapshot.json'));
 assert.deepEqual(pointer,{schemaVersion:1,summary:{path:'research/source-audit-pass8-ua-source-continuation-v1.json',sha256:'1449825ca788066d75d673cd1672c5d6748bd799ed703712b05c39f305da2014'},fullEvidence:{path:'research/source-audit-pass8-ua-source-continuation-v1-full.json.gz',sha256:'1119279eebf467b98eac14d1289fd074cff953bfb8f4d1fb2cfd80e5500bbb5d'}});
 const summaryBytes=gitBytes(pointer.summary.path),fullBytes=gitBytes(pointer.fullEvidence.path),summary=JSON.parse(summaryBytes);
 assert.equal(sha(summaryBytes),pointer.summary.sha256);assert.equal(sha(fullBytes),pointer.fullEvidence.sha256);
 assert.equal(summary.input.sourceTreeMode,'pinned-git-commit');
 assert.equal(summary.input.gitCommit,'6b3cfc8cb421a2c1fc2379c38abebe2075634981');
 const dir=mkdtempSync(path.join(temp,'ua-v28-')),summaryPath=path.join(dir,'summary.json'),fullPath=path.join(dir,'full.json.gz');
 writeFileSync(summaryPath,summaryBytes);writeFileSync(fullPath,fullBytes);
 return {summary,summaryPath,fullPath};
}
function historicalDmg175Selection(){
 const summaryPath=path.resolve(root,'research/source-audit-pass8-dmg175-continuation-987a25d3ba2d.json');
 const fullPath=path.resolve(root,'research/source-audit-pass8-dmg175-continuation-987a25d3ba2d-full.json.gz');
 return {summaryPath,fullPath,summary:JSON.parse(readFileSync(summaryPath)),fullBytes:readFileSync(fullPath)};
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
test('the active pair covers the exact current HIRED source and continuation metadata',()=>{
 const sourceInputs=readHirelingsCurrentSourceInputs(root);
 const sourceCounts=assertHirelingsCurrentSourceCohort(sourceInputs);
 assert.deepEqual(sourceCounts,{sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',owners:1062,canonicalBindings:5655,priorWholeBindings:4931,addedBindings:724,manualAdditions:321,newRules:48,sourceTableRows:244,sourceCells:343,historicalMechanicsReviews:1215});
 assert.equal(selected.pointer.sha256,'04c54609386a837d1948e6b265c0cf51c18245f2853d0854abd86364d946c9c9');
 assert.equal(path.relative(root,selected.summaryPath),'research/source-audit-pass8-hired-source-bc819621e497-continuation.json');
 assert.equal(path.relative(root,selected.fullPath),'research/source-audit-pass8-hired-source-bc819621e497-continuation-full.json.gz');
 assert.equal(sha(readFileSync(selected.summaryPath)),'37ccd45292b964c4c738e2ca96cafc4c317d900772e20819274de5acea69316d');
 assert.equal(sha(readFileSync(selected.fullPath)),'0374c0fa3f3d070adb594dea3a4eac2c153fa52ef74856c5f2d7125cdc331431');
 const result=validateContinuationSnapshot({root,summaryPath:selected.summaryPath,fullPath:selected.fullPath,treeSelection:'current-worktree'});
 assert.deepEqual(result.errors,[]);assert.equal(result.valid,true);
 assert.deepEqual(result.sourceFrameValidation,{status:'current-active-source-frame-bridge-required',valid:true,errors:[]});
 const full=JSON.parse(gunzipSync(readFileSync(selected.fullPath))),summary=selected.summary;
 assert.deepEqual(full.input,summary.input);
 assert.equal(full.input.gitCommit,sourceCounts.sourceCommit);
 assert.equal(full.input.sourceTreeMode,'pinned-git-commit');
 assert.equal(full.input.distDataRawFileSha256,sourceInputs.sourceRawInputs['dist/data.json']);
 assert.equal(full.input.continuationManifestSha256,sha(readFileSync('research/citation-continuations.json')));
 assert.equal(full.input.generatorSha256,sha(readFileSync('tools/continuation-candidates.py')));
 assert.equal(full.input.sourceFrameCoordinateBridgeSha256,sha(readFileSync(full.sourceFrameCoordinateBridge.path)));
 assert.deepEqual(full.runMode,{status:'current-active-source-frame-bridge-required'});
 assert.deepEqual(full.privatePdfFrameReplay,{status:'current-pdf-boxes-match-registered-frames',frameGroups:9,pdfPageBoxesValidated:9});
 assert.deepEqual(full.sourceFrameCoordinateBridge,summary.sourceFrameCoordinateBridge);
 assert.deepEqual(full.input.sourceFrameRegistryValidation,{status:'current-pins-match',frameGroups:9,ownerJoinsValidated:102,mismatchCount:0,mismatches:[]});
 assert.deepEqual(summary.sourceFrameCoordinateBridge.resolutionCounts,{matched:102,'not-applicable-supplemental-image-frame':45,'outside-bounded-correction-registry':3928});
 assert.deepEqual(full.exposedCatalogSummary,summary.exposedCatalogSummary);
 assert.deepEqual(full.exposedUniverse,summary.exposedUniverse);
 assert.equal(full.regionAssessments.length,4072);
 assert.equal(new Set(full.regionAssessments.map(row=>JSON.stringify([row.owner.collection,row.owner.itemId,row.owner.catalog,row.regionId]))).size,4072);
 assert.deepEqual({catalogFiles:summary.exposedCatalogSummary.catalogJsonFilesUnderScans,catalogsReferenced:summary.exposedCatalogSummary.catalogFilesReferencedByExposedRecords,catalogRegionRows:summary.exposedCatalogSummary.catalogRegionRows,recordCatalogBindingUsages:summary.exposedCatalogSummary.recordCatalogBindingUsages,regionBindingUsageCount:summary.exposedCatalogSummary.regionBindingUsageCount,catalogSourcePages:summary.exposedCatalogSummary.catalogSourcePages,sourcePageBindings:summary.exposedUniverse.uniqueSourcePageBindings,regionBindingUsageCountsByBindingKey:summary.exposedCatalogSummary.regionBindingUsageCountsByBindingKey,catalogCountByBindingKey:summary.exposedCatalogSummary.catalogCountByBindingKey,bookCounts:summary.exposedCatalogSummary.bookCounts,regionBoundCounts:summary.exposedCatalogSummary.regionBoundCounts},{catalogFiles:1082,catalogsReferenced:1082,catalogRegionRows:4072,recordCatalogBindingUsages:1083,regionBindingUsageCount:4075,catalogSourcePages:240,sourcePageBindings:239,regionBindingUsageCountsByBindingKey:{sourceExcerpts:3995,scanVerification:80},catalogCountByBindingKey:{sourceExcerpts:1061,scanVerification:22},bookCounts:{DMG:905,MM:15,MM2:2,PHB:1881,UA:1269},regionBoundCounts:{'normalized-rect-missing-or-invalid':269,'normalized-rect-present':3803}});
 assert.deepEqual({recordCount:summary.exposedUniverse.propertyUniverse.recordCount,propertyPointerCount:summary.exposedUniverse.propertyUniverse.propertyPointerCount,mechanicsRecords:summary.exposedUniverse.propertyUniverse.mechanicsFieldDenominator.records,mechanicsFields:summary.exposedUniverse.propertyUniverse.mechanicsFieldDenominator.totalFields},{recordCount:1062,propertyPointerCount:303299,mechanicsRecords:1062,mechanicsFields:14189});
 assert.equal(result.counts.propertyRecords,full.propertyPointerInventory.records.length);
 assert.equal(result.counts.catalogRegionRows,4072);
 assert.equal(result.counts.propertyPointers,full.propertyPointerInventory.propertyRows.length);
 assert.equal(result.counts.distinctSourcePageBindings,239);
 assert.match(result.sourcePdfRegeneration,/not regenerated from private PDFs/);
 let removed;
 const options=mutant((candidate,report)=>{removed=candidate.regionAssessments.shift();report.exposedCatalogSummary.catalogRegionRows--;});
 const mutation=validateContinuationSnapshot(options);
 assert.equal(mutation.valid,false);
 assert.ok(mutation.errors.some(error=>error.code==='current-region-assessment-missing'&&error.detail===`${removed.owner.catalog}:${removed.regionId}`));
});
test('the sealed historical V29 3622-row DMG175 snapshot remains pinned to its original source tree',()=>{
 const historical=historicalDmg175Selection();
 assert.equal(path.relative(root,historical.summaryPath),'research/source-audit-pass8-dmg175-continuation-987a25d3ba2d.json');
 assert.equal(path.relative(root,historical.fullPath),'research/source-audit-pass8-dmg175-continuation-987a25d3ba2d-full.json.gz');
 assert.equal(sha(readFileSync(historical.summaryPath)),'05dd7e9e219a551129b6b1852828db53625ef9625123f61ce9657fd3c8621366');
 assert.equal(sha(historical.fullBytes),'90cc57263606d27082aea5b51ed627e280071076f801fd434d8e07add6afb3c8');
 assert.equal(sha(readFileSync('research/source-audit-input-dmg175-source-987a25d3ba2d.json')),'f3449210a281b3c7604847cea39508b0a48d65d8971e569494cc14db1588565e');
 assert.equal(sha(readFileSync('research/source-frame-coordinate-bridge-dmg175-source-v1.json')),'137b9c0044a72b587cc7ef6273e398106d574727f1656d58c742ac8c47ac68b3');
 const oldFixture=JSON.parse(readFileSync('tests/fixtures/dmg175-source-current-cohort-v1.json'));
 assert.equal(sha(readFileSync('tests/fixtures/dmg175-source-current-cohort-v1.json')),'b1a39cd6379d1fc34f906781982f9fc049d94089459fd0f7b0243aaeb8476685');
 assert.equal(oldFixture.sourceCommit,'987a25d3ba2dcac0940569a2afab73f775e38028');
 const full=JSON.parse(gunzipSync(historical.fullBytes));
 assert.equal(full.input.sourceTreeMode,'pinned-git-commit');
 assert.equal(full.input.gitCommit,'987a25d3ba2dcac0940569a2afab73f775e38028');
 assert.equal(full.input.distDataRawFileSha256,'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d');
 assert.equal(full.regionAssessments.length,3622);
 assert.equal(historical.summary.exposedCatalogSummary.catalogRegionRows,3622);
 assert.equal(historical.summary.exposedCatalogSummary.regionBindingUsageCount,3625);
 const pinned=validateContinuationSnapshot({root,summaryPath:historical.summaryPath,fullPath:historical.fullPath,treeSelection:'pinned-git-commit'});
 assert.deepEqual(pinned.errors,[]);assert.equal(pinned.valid,true);assert.equal(pinned.validationBase,'pinned-git-tree');
 assert.equal(pinned.sourceFrameValidation.status,'historical-sealed-diagnostics-only');
});

test('current mode rejects missing bridge declarations and removed per-use frame annotations',()=>{
 const missingDeclaration=mutant((full,summary)=>{delete full.sourceFrameCoordinateBridge;delete summary.sourceFrameCoordinateBridge;});
 const declarationResult=validateContinuationSnapshot(missingDeclaration);
 assert.equal(declarationResult.valid,false);
 assert.ok(declarationResult.errors.some(x=>x.code==='source-frame-declaration-stale'));
 assert.ok(declarationResult.errors.some(x=>x.code==='source-frame-summary-declaration-stale'));
 const missingAnnotation=mutant(full=>{const row=full.regionAssessments.find(item=>item.coordinateFrameResolutions?.some(use=>use.status==='matched'));delete row.coordinateFrameResolutions;});
 const annotationResult=validateContinuationSnapshot(missingAnnotation);
 assert.equal(annotationResult.valid,false);
 assert.ok(annotationResult.errors.some(x=>x.code==='source-frame-use-annotation-mismatch'));
});
test('current mode derives trusted frame pins only from the validator-owning repository root',()=>{
 const result=validateContinuationSnapshot({root:temp,summaryPath:selected.summaryPath,fullPath:selected.fullPath,treeSelection:'current-worktree'});
 assert.equal(result.valid,false);
 assert.ok(result.errors.some(x=>x.code==='untrusted-current-repository-root'));
 assert.equal(result.sourceFrameValidation.valid,false);
});
test('current mode rejects all eleven known PHB windows when old page.rect bounds are transplanted under valid bridge annotations',()=>{
 const controls=JSON.parse(readFileSync('research/source-audit-pass8-continuation-frame-negative-controls-v1.json','utf8'));
 const changed=controls.rows.filter(row=>row.changed);
 assert.equal(changed.length,11);
 assert.deepEqual(controls.control.differentWindowsByBookAndPrintedPage,{PHB:{27:1,37:10}});
 const options=mutant((full)=>{
  for(const control of changed){
   const assessment=full.regionAssessments.find(row=>row.owner?.catalog===control.catalog&&row.regionId===control.regionId);
   assert.ok(assessment,`preserved PHB control resolves: ${control.catalog}#${control.regionId}`);
   assessment.coordinateFrameBoundsPdfPagePointsLTRB=control.legacyPageRectBoundsPdfPointsLTRB;
   if(assessment.geometry)assessment.geometry.cropBoundsPdfPagePointsLTRB=control.legacyPageRectBoundsPdfPointsLTRB;
  }
 });
 const result=validateContinuationSnapshot(options);
 assert.equal(result.valid,false);
 assert.equal(result.errors.filter(x=>x.code==='source-frame-registered-bounds-mismatch').length,11);
 assert.equal(result.errors.filter(x=>x.code==='source-frame-word-geometry-window-mismatch').length,11);
});
test('the archived PDF-only tree reproduces the omitted-alias false pass against its exact captured source tree',()=>{
 const source=archivedPdfSelection(),base={root,summaryPath:source.summaryPath,fullPath:source.fullPath,treeSelection:'pinned-git-commit'};
 const full=JSON.parse(gunzipSync(readFileSync(source.fullPath)));
 assert.equal(full.regionAssessments.length,3391);
 assert.equal(full.regionAssessments.some(r=>r.sourceKind==='supplemental-image'),false);
 assert.equal(oldValidate(base).valid,true);assert.equal(validateContinuationSnapshot(base).valid,true);
 assert.equal(validateContinuationSnapshot(base).sourceFrameValidation.status,'historical-sealed-diagnostics-only');
 const options=mutant((full,summary)=>{const before=full.regionAssessments.length;full.regionAssessments=full.regionAssessments.filter(r=>!(r.regionId==='ua-69-b8b05ef9807ad0f8'&&r.owner.itemId==='ua-illusionist-death-fog'));assert.equal(full.regionAssessments.length,before-1);summary.exposedCatalogSummary.catalogRegionRows--;},{source,treeSelection:'pinned-git-commit'});
 assert.equal(oldValidate(options).valid,true,'exact pre-fix checker reproduces the omission false pass');
 const result=validateContinuationSnapshot(options);assert.equal(result.valid,false);
 assert.ok(result.errors.some(x=>x.code==='current-region-assessment-missing'&&x.detail.includes('ua-69-b8b05ef9807ad0f8')));
});
test('the sealed historical3474-row weapon universe retains all3420 prior rows and exactly54 weapon additions',()=>{
 const weaponBytes=readFileSync('research/source-audit-pass8-weapon-source-continuation-v1-full.json.gz');
 assert.equal(sha(weaponBytes),'39a808159fda8291ebbf5d0456130f3d957e1b1e88c9ea13fd3e88409192cf6f');
 const full=JSON.parse(gunzipSync(weaponBytes)),supplemental=full.regionAssessments.filter(r=>r.sourceKind==='supplemental-image');
 const weaponSummary=JSON.parse(readFileSync('research/source-audit-pass8-weapon-source-continuation-v1.json'));
 const publishedBytes=readFileSync('research/source-audit-pass8-citation-target-crop-continuation-v1-full.json.gz');
 assert.equal(sha(publishedBytes),'c41defa5bd4318fa71b4500673424d35548230d5bbdc061e62b44b2396d21e0e');
 const published=JSON.parse(gunzipSync(publishedBytes)).regionAssessments;
 assert.equal(published.length,3420);
 const identity=row=>JSON.stringify([row.owner.collection,row.owner.itemId,row.owner.catalog,row.regionId]);
 const publishedKeys=new Set(published.map(identity));
 assert.equal(publishedKeys.size,3420);
 assert.deepEqual(full.regionAssessments.filter(row=>publishedKeys.has(identity(row))),published,'every published assessment remains whole-object exact and in relative order');
 const tableOwners=['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'];
 const tableCatalogs=tableOwners.map(itemId=>JSON.parse(readFileSync(`dist/scans/verified/rules-${itemId}.json`)));
 assert.deepEqual(tableCatalogs.map(catalog=>catalog.regions.length),[21,31]);
 for(const [index,catalog]of tableCatalogs.entries())assert.deepEqual([catalog.collection,catalog.itemId],['rules',tableOwners[index]]);
 const dmgPath='dist/scans/verified/rules-weapon-versus-armor-adjustments.json';
 const dmgCatalog=JSON.parse(readFileSync(dmgPath));
 const dmgBefore=JSON.parse(execFileSync('git',['show',`cc9509047746d5e27a71cb5b1e0cfcb739a688c9:${dmgPath}`],{maxBuffer:16*1024*1024}));
 assert.deepEqual(dmgCatalog.regions.slice(0,dmgBefore.regions.length),dmgBefore.regions,'the complete legacy DMG region object remains exact');
 assert.equal(dmgBefore.regions.length,1);assert.equal(dmgCatalog.regions.length,3);
 assert.deepEqual(dmgCatalog.regions.slice(1).map(region=>region.id),['dmg-28-opening-8b67aa025e19eddd','dmg-28-c37135485e89a720']);
 const added=full.regionAssessments.filter(row=>!publishedKeys.has(identity(row)));
 const expectedAdded=[...tableCatalogs.flatMap(catalog=>catalog.regions.map(region=>JSON.stringify(['rules',catalog.itemId,`scans/verified/rules-${catalog.itemId}.json`,region.id]))),...dmgCatalog.regions.slice(1).map(region=>JSON.stringify(['rules',dmgCatalog.itemId,'scans/verified/rules-weapon-versus-armor-adjustments.json',region.id]))];
 assert.deepEqual(added.map(identity),expectedAdded,'only the52 table regions and two declared DMG continuation regions are added');
 assert.equal(full.regionAssessments.length,3474);
 assert.equal(weaponSummary.exposedUniverse.catalogRegionUsageCount,3474);
 assert.equal(weaponSummary.exposedUniverse.bindingRegionUsageCount,3477,'historical binding uses remain distinct from catalog-region rows');
 // The exact published3420-row census remains a separate historical stage.
 const predecessorBytes=readFileSync('research/source-audit-pass8-character-reference-continuation-current-full.json.gz');
 assert.equal(sha(predecessorBytes),'43111f6a70ccfc8c6fb0216f52c01362037bc6d1166ce601068d65daa1271368');
 const predecessor=JSON.parse(gunzipSync(predecessorBytes)).regionAssessments;
 assert.equal(predecessor.length,3396,'the literal predecessor denominator is retained');
 const oldKeys=new Set(predecessor.map(identity));
 assert.equal(oldKeys.size,3396);
 assert.equal(new Set(full.regionAssessments.map(identity)).size,3474);
 const phbBytes=readFileSync('research/source-audit-pass8-phb-source-continuation-v1-full.json.gz');
 assert.equal(sha(phbBytes),'b61afb70881858f2a8a63285d475fd04a6803144e877fc80adab42702de87c16');
 const phbRows=JSON.parse(gunzipSync(phbBytes)).regionAssessments;
 assert.equal(phbRows.length,3411);
 const changedKeys=[['spells','phb-illusionist-shadow-magic','scans/verified/spells-phb-illusionist-shadow-magic.json','phb-99-ae531be3faf0648b'],['spells','phb-illusionist-demi-shadow-magic','scans/verified/spells-phb-illusionist-demi-shadow-magic.json','phb-99-4212306ab17751dc'],['spells','phb-illusionist-veil','scans/verified/spells-phb-illusionist-veil.json','phb-99-d6ce0d52b23b9464'],['spells','ua-magic-user-dust','scans/verified/spells-ua-magic-user-dust.json','ua-46-4374f08dbe63db45'],['spells','ua-magic-user-vocalize','scans/verified/spells-ua-magic-user-vocalize.json','ua-55-7c342f3188d1df79'],['spells','ua-magic-user-ultravision','scans/verified/spells-ua-magic-user-ultravision.json','ua-58-6a839b9d9141f495'],['spells','ua-illusionist-ultravision','scans/verified/spells-ua-illusionist-ultravision.json','ua-58-6a839b9d9141f495']].map(row=>JSON.stringify(row));
 const phbByKey=new Map(phbRows.map(row=>[identity(row),row]));
 assert.deepEqual(full.regionAssessments.filter(row=>phbByKey.has(identity(row))&&JSON.stringify(row)!==JSON.stringify(phbByKey.get(identity(row)))).map(identity).sort(),changedKeys.sort());
 assert.deepEqual(full.regionAssessments.filter(row=>phbByKey.has(identity(row))&&!changedKeys.includes(identity(row))),phbRows.filter(row=>!changedKeys.includes(identity(row))),'all3404 unaffected published PHB assessments remain whole-object exact');
 const withoutFrameProjection=row=>{const copy=structuredClone(row);delete copy.coordinateFrameResolutions;delete copy.coordinateFrameBoundsPdfPagePointsLTRB;if(copy.geometry)delete copy.geometry.cropBoundsPdfPagePointsLTRB;return copy;};
 assert.deepEqual(phbRows.filter(row=>oldKeys.has(identity(row))).map(withoutFrameProjection),predecessor.map(withoutFrameProjection),'all3396 old assessment fields remain exact after removing only explicit frame-resolution/projection additions');
 const xpOwners=['cleric','fighter','paladin','ranger','magic-user','illusionist','thief','ua-cavalier','ua-barbarian','ua-thief-acrobat','ua-paladin'];
 const expectedXpKeys=xpOwners.map(id=>JSON.stringify(['classes',id,`scans/verified/classes-${id}.json`,`pass8-${id}-xp-continuation-rule`]));
 expectedXpKeys.push(JSON.stringify(['classes','magic-user','scans/verified/classes-magic-user.json','pass8-magic-user-xp-continuation-table-opening']));
 expectedXpKeys.push(JSON.stringify(['classes','ua-paladin','scans/verified/classes-ua-paladin.json','pass8-ua-paladin-phb-advancement-context']));
 const expectedDruidKeys=['phb-54-druid-note-grid-ebfa1c01c47e3a9d','phb-54-druid-note-definitions-c98ac7d9d638ae45'].map(regionId=>JSON.stringify(['rules','phb-druid-mistletoe-spell-components','scans/verified/rules-phb-druid-mistletoe-spell-components.json',regionId]));
 assert.deepEqual(phbRows.filter(row=>!oldKeys.has(identity(row))).map(identity).sort(),[...expectedXpKeys,...expectedDruidKeys].sort(),'the exact13XP/2Druid historical additions remain separate');
 const addedKeys=[['equipment','phb-bullseye-lantern','scans/verified/equipment-phb-bullseye-lantern.json','pass8-dmg225-fieldmap-row-phb-bullseye-lantern'],['equipment','phb-bullseye-lantern','scans/verified/equipment-phb-bullseye-lantern.json','batch5-dmg225-encumbrance-notes'],['equipment','phb-silver-mirror','scans/verified/equipment-phb-silver-mirror.json','pass8-dmg225-fieldmap-row-phb-silver-mirror'],['equipment','phb-silver-mirror','scans/verified/equipment-phb-silver-mirror.json','batch5-dmg225-encumbrance-notes'],['equipment','phb-iron-spike','scans/verified/equipment-phb-iron-spike.json','pass8-dmg225-fieldmap-row-phb-iron-spike'],['equipment','phb-iron-spike','scans/verified/equipment-phb-iron-spike.json','batch5-dmg225-encumbrance-notes'],['equipment','phb-thieves-tools','scans/verified/equipment-phb-thieves-tools.json','pass8-dmg225-thieves-tools-exclusion-lead-in'],['equipment','phb-thieves-tools','scans/verified/equipment-phb-thieves-tools.json','pass8-dmg225-thieves-tools-exclusion-list-item'],['spells','phb-illusionist-demi-shadow-magic','scans/verified/spells-phb-illusionist-demi-shadow-magic.json','phb-99-9ef97e132b0081e5']].map(row=>JSON.stringify(row));
 assert.deepEqual(published.filter(row=>!phbByKey.has(identity(row))).map(identity).sort(),addedKeys.sort());
 const newMatrixOwners=[
  {itemId:'dmg-cleric-druid-monk-attack-matrix',regionId:'dmg-74-ia-cleric-druid-monk',catalog:'scans/verified/matrices-dmg-cleric-druid-monk-attack-matrix.json'},
  {itemId:'dmg-magic-user-illusionist-attack-matrix',regionId:'dmg-74-ic-magic-user-illusionist',catalog:'scans/verified/matrices-dmg-magic-user-illusionist-attack-matrix.json'},
  {itemId:'dmg-thief-assassin-attack-matrix',regionId:'dmg-74-id1-thief-assassin',catalog:'scans/verified/matrices-dmg-thief-assassin-attack-matrix.json'},
 ];
 const currentNewMatrixRows=full.regionAssessments.filter(r=>newMatrixOwners.some(expected=>expected.itemId===r.owner?.itemId)).map(r=>({collection:r.owner.collection,itemId:r.owner.itemId,catalog:r.owner.catalog,regionId:r.regionId,book:r.book,printedPage:r.printedPage,pdfPage:r.pdfPage})).sort((a,b)=>a.itemId.localeCompare(b.itemId));
 assert.deepEqual(currentNewMatrixRows,newMatrixOwners.map(expected=>({collection:'matrices',...expected,book:'DMG',printedPage:74,pdfPage:75})).sort((a,b)=>a.itemId.localeCompare(b.itemId)));
 assert.deepEqual(supplemental.map(r=>r.regionId).sort(),['dmg-175-level-others-context-5aa02e91e35c4c28','dmg-175-party-table-context-78c4c383c38c7d10']);
 for(const row of supplemental){assert.equal(row.sourceSha256,'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');assert.equal(row.sourceArtifactId,'dmg175-user-confirmed-supplement');assert.equal(row.pdfPage,null);}
 const historicalUa=historicalUaSelection();
 const historicalBaseline=validateContinuationSnapshot({root,summaryPath:historicalUa.summaryPath,fullPath:historicalUa.fullPath,treeSelection:'pinned-git-commit'});
 assert.equal(historicalBaseline.valid,true);assert.deepEqual(historicalBaseline.errors,[]);
 assert.equal(historicalBaseline.validationBase,'pinned-git-tree');assert.equal(historicalBaseline.counts.catalogRegionRows,3506);
 const options=mutant((copy,summary)=>{copy.regionAssessments=copy.regionAssessments.filter(r=>!(r.regionId==='ua-69-b8b05ef9807ad0f8'&&r.owner.itemId==='ua-illusionist-death-fog'));assert.equal(copy.regionAssessments.length,3505);assert.deepEqual(copy.regionAssessments.filter(r=>r.sourceKind==='supplemental-image'),supplemental);summary.exposedCatalogSummary.catalogRegionRows--;},{source:historicalUa,treeSelection:'pinned-git-commit'});
 const result=validateContinuationSnapshot(options);assert.equal(result.valid,false);
 assert.ok(result.errors.some(x=>x.code==='current-region-assessment-missing'&&x.detail.includes('ua-69-b8b05ef9807ad0f8')));
});
test('the native3506-row UA universe preserves3473 old whole assessments, one exact crop successor and32 exact class additions',()=>{
 const selected=historicalUaSelection();
 const full=JSON.parse(gunzipSync(readFileSync(selected.fullPath)));
 assertCurrentUaContinuationCohort(full,selected.summary);
 for(const mutate of [
  value=>value.unapprovedMetadata=true,
  value=>value.input.distDataSha256='0'.repeat(64),
  value=>value.scope='unapproved changed scope',
  value=>value.regionAssessments[0].unapprovedMetadata=true,
  value=>value.regionAssessments.find(row=>row.regionId==='ua-67-785f3646c91cc52a').imageSha256='0'.repeat(64),
  value=>value.regionAssessments.find(row=>row.owner.collection==='classes'&&row.regionId==='pass8-ua-guidance-fighter-permissions').sourceValueStatus='confirmed',
  value=>value.regionAssessments.pop(),
  value=>value.regionAssessments.push(structuredClone(value.regionAssessments.at(-1))),
  value=>Object.defineProperty(value.regionAssessments[0],'hidden',{value:true}),
 ]){const mutation=structuredClone(full);mutate(mutation);assert.throws(()=>assertCurrentUaContinuationCohort(mutation,selected.summary));}
 const beforeBytes=readFileSync('tests/fixtures/ua-source-continuation-root-metadata-before-v1.json.gz');
 assert.equal(sha(beforeBytes),'462f0f5426cbf4437a2f6484728d0aadade49a035fbdf5ad9a534601e18fa04a');
 const before=JSON.parse(gunzipSync(beforeBytes));assert.deepEqual(before.actualResult.outcomes.map(row=>row.accepted),[true,true,false]);
 for(const row of before.actualResult.outcomes){const mutation=structuredClone(full),parts=row.pointer.split('/').slice(1);let parent=mutation;for(const key of parts.slice(0,-1))parent=parent[key];parent[parts.at(-1)]=row.replacement;assert.throws(()=>assertCurrentUaContinuationCohort(mutation,selected.summary),'every actual old-guard metadata mutation now rejects');}
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
