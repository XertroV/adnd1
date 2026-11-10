#!/usr/bin/env node
// Closed metadata-phase binder for the exact D175 source follow-up commit.
// It verifies source/report identities and writes only its own new receipt.
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_COMMIT = '987a25d3ba2dcac0940569a2afab73f775e38028';
const INPUT_TREE = 'd7ac09ce9abe4ef94ae355a44b8e0c5ca6f74ea3';
const PARENT_COMMIT = '2af25997fb831b89a5ff158ed55e17ccf5943fbe';
const PARENT_TREE = '53f25e4bd350fe72cba9869f80f6e72ee0b5c245';
const SOURCE_REPORT_PREFIX = 'dmg175-source-987a25d3ba2d';
const CONTINUATION_PREFIX = 'source-audit-pass8-dmg175-continuation-987a25d3ba2d';
const RECEIPT_PATH = 'research/source-audit-input-dmg175-source-987a25d3ba2d.json';
const REGISTRY_PATH = 'research/source-frame-coordinate-bridge-dmg175-source-v1.json';
const CROP_REGISTRY_PATH = 'research/dmg175-source-metadata-regeneration-v2/outputs/dmg175-supplement-crop-registry-v2.json';
const V2_MANIFEST_PATH = 'research/dmg175-source-metadata-regeneration-v2/manifest-v2.json';
const EXPECTED = Object.freeze({
  dataSha256: 'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d',
  booksJsSha256: '99928f8e954ef213a51c70dc97d8f63b16a7b5eea9f1cba10b76b527ec17f811',
  continuationsSha256: '32f177b264f8673edf054b25a0bd9b8df6668c5b9fb55a17d4161cf5b0cc1e5d',
  bridgeSha256: '137b9c0044a72b587cc7ef6273e398106d574727f1656d58c742ac8c47ac68b3',
  cropRegistrySha256: '94fad75fb5a0b235b7f81b7dfddf65fc098194148cada86c5d963d8462d1cbf6',
  visualGeneratorSha256: '58c6a52801e022ba596432d139fff096cc78e4c2af741a51977974037635d3e9',
  rasterGeneratorSha256: 'fb87a5810917c01d67c914549995db736e3eacb8fff4c74947cb1d154af1899d',
  continuationGeneratorSha256: '9255716a1f5dd30b55b02151f8cd4b56083f3094063f1870829e82d52de96ad5',
  pythonBridgeSha256: '4ae397c11a6d5a0ed91da2653da815ed5cee7225f9d018641e8a19c4f01d4c80',
  javascriptBridgeSha256: '3e5ddbeb3d62d787297fab50b267296d97db930a9b761f4542ddaa0e5bcd51f1',
});
const CATALOGS = [
  ['rules-appendix-c-character-subtable.json', '0df6a6dde3884e3dc81810c1d8750aab7a645e85674af4a37b5b479c4bbe2e19'],
  ['rules-appendix-c-party-size.json', '617df82bf7a79f243106bf3b424546164a1832b0106e7e3deb51dff797cb1b8a'],
  ['rules-appendix-c-character-levels.json', 'f7f2c6b0e3272ee9c078686ce03b065160bde6b0f1218a9c8d9e9efdd51e66ff'],
  ['rules-appendix-c-henchmen.json', 'dc1e6e42c6a21dee554f583da43518bbdd0f44bf0de9ce87a375b8270a15fa87'],
  ['rules-appendix-c-character-guidance.json', '06aca643a116795eb8da20ed9447a2495ec71b150e047005db48dfac0c8a0102'],
  ['rules-appendix-c-party-magic-distribution.json', '52c01795856e9e6ec69aca061109e490d8b876cdcfcbfc1ca414351684def18f'],
  ['rules-appendix-c-magic-table-i.json', 'b8b6331b7a73db2706c2fa7cd182436eb630543952cd5eba0815a4f43b659de0'],
  ['rules-appendix-c-magic-table-ii.json', '4e0bd4444cbde7a7589ef528f0b9df20457baa97b594410aefb1b042c8b9e7fb'],
  ['rules-appendix-c-magic-table-iii.json', 'b9a17461b509c194906dfd4bc81cb7ab2d2d1db3f780d408675096736bcf86c5'],
  ['rules-appendix-c-magic-table-iv.json', '489e3ad4eb09edd2eb241c7192063f7e7ecccb9dff9040d4ece89a051b225511'],
  ['rules-appendix-c-magic-item-notes.json', 'ef15db32b4af72fc52984f2bc1e87dd0b3ea5e4a26f9df44b0a9f21272adf116'],
  ['rules-encounter-types.json', 'ffbe682e5c4ba3f2d2f45e0e6fc9361654fa6527c231f3a4fc220b4510e1aa3d'],
];
const PDF_INPUTS = [
  ['tsr2010-players-handbook.pdf', 'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095'],
  ['DMG_1stEd.pdf', '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'],
  ['Unearthed Arcana.pdf', 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4'],
  ['Monster_Manual.pdf', 'c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81'],
  ['Monster Manual II.pdf', 'b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24'],
  ['dmg175.jpg', 'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7'],
];
const PRODUCER_FILES = [
  'research/source-visual-audit.py',
  'research/source-raster-boundary-audit.py',
  'tools/continuation-candidates.py',
  'research/source_frame_coordinate_bridge.py',
  'tools/source-frame-coordinate-bridge.mjs',
  'research/crop_geometry.py',
  'tools/mechanics-audit.mjs',
];
const VISUAL_PATH = `research/source-visual-audit-${SOURCE_REPORT_PREFIX}.json`;
const VISUAL_MD_PATH = `research/source-visual-audit-${SOURCE_REPORT_PREFIX}.md`;
const VISUAL_QUEUES = [
  `research/source-visual-audit-${SOURCE_REPORT_PREFIX}-queue-phb-equipment.json`,
  `research/source-visual-audit-${SOURCE_REPORT_PREFIX}-queue-nonphb-equipment.json`,
  `research/source-visual-audit-${SOURCE_REPORT_PREFIX}-queue-other-records.json`,
];
const RASTER_PATH = `research/source-raster-boundary-${SOURCE_REPORT_PREFIX}.json.gz`;
const CONT_SUMMARY_PATH = `research/${CONTINUATION_PREFIX}.json`;
const CONT_FULL_PATH = `research/${CONTINUATION_PREFIX}-full.json.gz`;
const CONT_MD_PATH = `research/${CONTINUATION_PREFIX}.md`;
const OUTPUT_PATHS = [VISUAL_PATH, VISUAL_MD_PATH, ...VISUAL_QUEUES, RASTER_PATH, CONT_SUMMARY_PATH, CONT_FULL_PATH, CONT_MD_PATH];

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = relative => readFileSync(path.join(ROOT, relative));
const readJson = relative => JSON.parse(read(relative).toString('utf8'));
const git = (args, options={}) => execFileSync('git', args, {cwd:ROOT, ...options});
const gitBytes = relative => git(['show', `${INPUT_COMMIT}:${relative}`], {maxBuffer:80*1024*1024});
const hashFile = relative => sha(read(relative));
function assertCommittedHash(relative, expected) {
  const bytes = gitBytes(relative);
  assert.equal(sha(bytes), expected, `committed hash mismatch: ${relative}`);
  assert.equal(sha(read(relative)), expected, `working-tree hash mismatch: ${relative}`);
  return bytes;
}
function privateSourceHash(filename) {
  const base = '/workspace/vault-audit-private/sources';
  const bytes = readFileSync(path.join(base, filename));
  return sha(bytes);
}
function outputRecord(relative) {
  const bytes = read(relative);
  return {path:relative,sha256:sha(bytes),bytes:bytes.length};
}
function assertBridge(report, where) {
  assert.equal(report?.path, REGISTRY_PATH, `${where}: bridge path mismatch`);
  assert.equal(report?.sha256, EXPECTED.bridgeSha256, `${where}: bridge hash mismatch`);
  assert.equal(report?.status, 'scoped-geometric-provenance-only', `${where}: bridge status mismatch`);
  assert.equal(report?.registryValidation?.status, 'current-pins-match', `${where}: registry did not validate current pins`);
  assert.equal(report?.registryValidation?.frameGroups, 9, `${where}: frame denominator mismatch`);
  assert.equal(report?.registryValidation?.ownerJoinsValidated, 102, `${where}: join denominator mismatch`);
  assert.equal(report?.registryValidation?.mismatchCount, 0, `${where}: bridge mismatches remain`);
}
function collectReportInputs() {
  const visualBytes = read(VISUAL_PATH);
  const visual = JSON.parse(visualBytes.toString('utf8'));
  assert.equal(visual.inputDataSha256, EXPECTED.dataSha256, 'visual report data hash mismatch');
  assert.deepEqual(visual.sourcePdfSha256, Object.fromEntries(PDF_INPUTS.slice(0,5).map(([name,digest])=>[({
    'tsr2010-players-handbook.pdf':'PHB','DMG_1stEd.pdf':'DMG','Unearthed Arcana.pdf':'UA','Monster_Manual.pdf':'MM','Monster Manual II.pdf':'MM2'
  })[name],digest])), 'visual report PDF identities mismatch');
  assertBridge(visual.sourceFrameCoordinateBridge, 'visual report');
  assert.equal(Array.isArray(visual.warnings) && visual.warnings.length, 0, 'visual report contains warnings');
  assert.match(visual.scope, /cataloged limited crops/);
  assert.doesNotMatch(visual.scope, /two published crops/i);
  assert.equal(visual.counts.regionUsages, 3625);
  assert.equal(visual.counts.cropEdgeAssessments['not-assessable-supplemental-image-format'], 45);

  const rasterBytes = read(RASTER_PATH);
  const raster = JSON.parse(gunzipSync(rasterBytes).toString('utf8'));
  assert.equal(raster.inputs.sourceUsageMapPath, path.join(ROOT,VISUAL_PATH));
  assert.equal(raster.inputs.sourceUsageMapSha256, sha(visualBytes), 'raster-to-visual hash mismatch');
  assert.equal(raster.inputs.distDataSha256, EXPECTED.dataSha256);
  assert.deepEqual(raster.inputs.sourcePdfSha256, visual.sourcePdfSha256);
  assertBridge(raster.sourceFrameCoordinateBridge, 'raster report');
  assert.equal(raster.counts.regionUsages, 3625);
  assert.equal(raster.counts.notAssessableUsages, 45);
  assert.equal(raster.counts.assessedUsages, 3580);
  assert.equal(raster.counts.sourcePagesRendered, 231);
  assert.equal(raster.runMode?.status, 'current-active-bridge-required');
  assert.equal(raster.status, 'complete-structural-inventory-semantic-review-unresolved');

  const summaryBytes=read(CONT_SUMMARY_PATH);
  const summary=JSON.parse(summaryBytes.toString('utf8'));
  const fullBytes=read(CONT_FULL_PATH);
  const fullRaw=gunzipSync(fullBytes);
  const full=JSON.parse(fullRaw.toString('utf8'));
  assert.equal(summary.input.gitCommit, INPUT_COMMIT, 'continuation summary source commit mismatch');
  assert.equal(summary.input.distDataSha256, EXPECTED.dataSha256);
  assert.equal(summary.input.sourceTreeMode, 'pinned-git-commit');
  assert.equal(summary.input.generatorSha256, EXPECTED.continuationGeneratorSha256);
  assertBridge(summary.sourceFrameCoordinateBridge, 'continuation summary');
  assert.equal(summary.fullEvidence.sha256, sha(fullBytes), 'summary full-evidence gzip hash mismatch');
  assert.equal(summary.fullEvidence.rawReportSha256, sha(fullRaw), 'summary raw-evidence hash mismatch');
  assert.equal(summary.exposedUniverse.bindingRegionUsageCount, 3625);
  assert.equal(summary.exposedUniverse.catalogRegionRows, 3622);
  assert.equal(summary.exposedUniverse.propertyUniverse.propertyPointerCount, 247223);
  assert.equal(summary.exposedUniverse.uniqueSourcePageBindings, 231);
  assert.equal(summary.assessmentCounts.regionTextGeometryStatus['not-assessable-supplemental-image-format'], 45);
  assert.equal(summary.assessmentCounts.noSignalInterpretation?.includes('not a semantic pass'), true);
  assert.equal(full.input.gitCommit, INPUT_COMMIT);
  assert.equal(full.input.distDataRawFileSha256, EXPECTED.dataSha256);
  assert.equal(full.input.generatorSha256, EXPECTED.continuationGeneratorSha256);

  return {visual, raster, summary, full, visualBytes, rasterBytes, summaryBytes, fullBytes};
}

function buildReceipt() {
  const head = git(['rev-parse','HEAD'], {encoding:'utf8'}).trim();
  assert.equal(head, INPUT_COMMIT, 'binder only accepts the exact source commit checkout');
  const tree = git(['rev-parse',`${INPUT_COMMIT}^{tree}`],{encoding:'utf8'}).trim();
  assert.equal(tree, INPUT_TREE, 'source commit tree changed');
  const parent = git(['rev-parse',`${INPUT_COMMIT}^`],{encoding:'utf8'}).trim();
  assert.equal(parent, PARENT_COMMIT, 'source follow-up parent changed');
  assert.equal(git(['rev-parse',`${PARENT_COMMIT}^{tree}`],{encoding:'utf8'}).trim(),PARENT_TREE);
  const changedFromParent=git(['diff','--name-only',PARENT_COMMIT,INPUT_COMMIT],{encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changedFromParent,[
    'research/citation-evidence-seals.json',
    'research/source-audit-pass8-dmg175-visual-json-scope-wording-v1.json',
    'research/source-visual-audit.py',
  ],'source follow-up delta must remain the scoped wording correction and its evidence/seal');

  const pins=JSON.parse(gitBytes('research/dmg175-source-metadata-regeneration-v2/inputs/catalog-source-pins-v1.json').toString('utf8'));
  const actualData=assertCommittedHash('dist/data.json',EXPECTED.dataSha256);
  const actualBooks=assertCommittedHash('dist/books.js',EXPECTED.booksJsSha256);
  const actualContinuations=assertCommittedHash('dist/source-continuations.json',EXPECTED.continuationsSha256);
  const bridgeBytes=assertCommittedHash(REGISTRY_PATH,EXPECTED.bridgeSha256);
  const cropRegistryBytes=assertCommittedHash(CROP_REGISTRY_PATH,EXPECTED.cropRegistrySha256);
  const v2ManifestBytes=gitBytes(V2_MANIFEST_PATH);
  const v2Manifest=JSON.parse(v2ManifestBytes.toString('utf8'));
  assert.equal(sha(v2ManifestBytes),'571c0ef029b89affe77a1538c3cf944f461e8d7948281e7fbf3d6752d5a61215');
  assert.equal(v2Manifest.supplementalIdentity.sha256,EXPECTED.cropRegistrySha256);
  assert.equal(v2Manifest.sourceFrameBridge.newSha256,EXPECTED.bridgeSha256);
  assert.equal(v2Manifest.sourceFrameBridge.newPath,REGISTRY_PATH);
  assert.equal(pins.sourcePhaseCommitPending,true);
  assert.equal(pins.sourcePhaseDraft.distDataSha256,EXPECTED.dataSha256);
  assert.equal(pins.sourcePhaseDraft.distBooksJsSha256,EXPECTED.booksJsSha256);
  assert.equal(pins.sourcePhaseDraft.distSourceContinuationsSha256,EXPECTED.continuationsSha256);
  assert.equal(pins.catalogs.length,12);
  const catalogRecords=[];
  const p175Regions=new Map();
  const p175Images=new Map();
  for(const pin of pins.catalogs){
    const relative=`dist/${pin.catalogPath}`;
    const bytes=assertCommittedHash(relative,pin.sha256);
    assert.equal(bytes.length,pin.bytes,`catalog byte size mismatch: ${relative}`);
    const catalog=JSON.parse(bytes.toString('utf8'));
    assert.equal(catalog.collection,'rules');
    assert.equal(catalog.itemId,pin.ownerId);
    catalogRecords.push({path:relative,sha256:pin.sha256,bytes:pin.bytes,ownerId:pin.ownerId});
    for(const region of catalog.regions||[]){
      if(region.printedPage!==175)continue;
      p175Regions.set(region.id,{catalog:relative,region});
      p175Images.set(region.image,region.sha256);
    }
  }
  const cropRegistry=JSON.parse(cropRegistryBytes.toString('utf8'));
  assert.equal(cropRegistry.counts.catalogs,12);
  assert.equal(cropRegistry.counts.uniqueRegionIds,34);
  assert.equal(cropRegistry.counts.distinctCropImageHashes,8);
  assert.equal(p175Regions.size,34);
  assert.equal(p175Images.size,8);
  const cropAssets=[];
  for(const [image,imageSha256] of [...p175Images].sort(([a],[b])=>a.localeCompare(b))){
    const relative=`dist/scans/verified/${image}`;
    const bytes=assertCommittedHash(relative,imageSha256);
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`p.175 crop must be PNG: ${relative}`);
    const region=[...p175Regions.values()].find(value=>value.region.image===image)?.region;
    assert.ok(region,`p.175 image has no catalog region: ${image}`);
    assert.equal(bytes.readUInt32BE(16),region.width,`p.175 PNG width mismatch: ${image}`);
    assert.equal(bytes.readUInt32BE(20),region.height,`p.175 PNG height mismatch: ${image}`);
    cropAssets.push({path:relative,sha256:imageSha256,bytes:bytes.length,scope:'limited catalog crop; not a full-page source image'});
  }
  const bridge=JSON.parse(bridgeBytes.toString('utf8'));
  assert.deepEqual(bridge.counts,{frameGroups:9,physicalPdfPages:7,regionBindings:102,ownerBindings:102});
  const frameOwnerCount=bridge.frames.reduce((n,frame)=>n+frame.regions.length,0);
  assert.equal(frameOwnerCount,102);

  const sourceCodeHashes={};
  const sourceInputPaths=[
    'dist/data.json','dist/books.js','dist/source-continuations.json',REGISTRY_PATH,CROP_REGISTRY_PATH,
    ...catalogRecords.map(row=>row.path),...cropAssets.map(row=>row.path),...PRODUCER_FILES,
    'research/citation-continuations.json','citation-overrides.json','equipment.json',
  ];
  for(const relative of [...new Set(sourceInputPaths)]){
    const committed=gitBytes(relative);
    const actualHash=sha(committed);
    assert.equal(sha(read(relative)),actualHash,`working-tree source input changed: ${relative}`);
    sourceCodeHashes[relative]=actualHash;
  }
  const dirtySourceDiff=spawnSync('git',['diff','--quiet',INPUT_COMMIT,'--',...sourceInputPaths],{cwd:ROOT});
  assert.equal(dirtySourceDiff.status,0,'source input paths differ from the exact commit');
  const dirtySourceStatus=git(['status','--porcelain','--untracked-files=all','--',...sourceInputPaths],{encoding:'utf8'});
  assert.equal(dirtySourceStatus,'','source input paths have uncommitted or untracked changes');

  const pdfSources=PDF_INPUTS.map(([filename,expectedSha256])=>{
    const observed=privateSourceHash(filename);
    assert.equal(observed,expectedSha256,`private source identity mismatch: ${filename}`);
    return {filename,sha256:expectedSha256,privateSource:true};
  });
  assert.equal(pins.catalogs.length,12);

  const {visual,raster,summary,full,visualBytes,rasterBytes,summaryBytes,fullBytes}=collectReportInputs();
  assert.equal(summary.input.sources.DMG.sourcePdfSha256,pdfSources.find(row=>row.filename==='DMG_1stEd.pdf').sha256);
  assert.equal(summary.input.sources.PHB.sourcePdfSha256,pdfSources.find(row=>row.filename==='tsr2010-players-handbook.pdf').sha256);
  assert.equal(summary.input.sources.UA.sourcePdfSha256,pdfSources.find(row=>row.filename==='Unearthed Arcana.pdf').sha256);
  assert.equal(summary.input.sources.MM.sourcePdfSha256,pdfSources.find(row=>row.filename==='Monster_Manual.pdf').sha256);
  assert.equal(summary.input.sources.MM2.sourcePdfSha256,pdfSources.find(row=>row.filename==='Monster Manual II.pdf').sha256);
  assert.equal(full.input.sourceDirectoryWasPrivateInput,true);

  const sealManifest=JSON.parse(read('research/citation-evidence-seals.json').toString('utf8'));
  for(const relative of OUTPUT_PATHS){
    assert.equal(sealManifest.seals.some(row=>row.path===relative),false,`new output path already sealed: ${relative}`);
    assert.equal(git(['ls-tree','-r','--name-only',INPUT_COMMIT,'--',relative],{encoding:'utf8'}),'',`output path already exists in source commit: ${relative}`);
  }
  const legacyPaths=[
    ['research/source-visual-audit-ua-source-v1.json','90a62727d0c4892b007c121ea79b32a027b0ac25e7725afe27f98a90daa6fccd'],
    ['research/source-raster-boundary-ua-source-v1.json.gz','61f1bb1124d25aeb4906333425fcddacf62a07539b3cd93578d942d1a35b3945'],
  ];
  const legacyArtifacts=legacyPaths.map(([relative,expectedSha256])=>{
    const actual=hashFile(relative);assert.equal(actual,expectedSha256,`legacy artifact changed: ${relative}`);
    return {path:relative,sha256:actual,bytes:read(relative).length,preserved:true};
  });
  const currentPointers=['research/current-source-raster-snapshot.json','research/current-continuation-candidate-snapshot.json']
    .map(relative=>({path:relative,sha256:hashFile(relative),bytes:read(relative).length,updatedByThisProcess:false}));

  const toolHash=sha(readFileSync(fileURLToPath(import.meta.url)));
  const rawFull=gunzipSync(fullBytes);
  const reportArtifacts=OUTPUT_PATHS.map(relative=>outputRecord(relative));
  const receipt={
    schemaVersion:1,
    artifactType:'closed exact D175 source-input and derived audit binding',
    status:'verified source commit and metadata-only derived snapshots; semantic/source-value review remains unresolved',
    sourceInput:{
      commit:INPUT_COMMIT,tree:INPUT_TREE,parentCommit:PARENT_COMMIT,parentTree:PARENT_TREE,
      exactParentDelta:changedFromParent,
      scope:'The source follow-up changes only the count-agnostic p.175 crop wording in source-visual-audit.py, plus its recorded review and seal. Data, Books, catalogs, images, manual records, bridge geometry and audit algorithms are unchanged from the preserved 2af source snapshot.',
      dataSha256:sha(actualData),booksJsSha256:sha(actualBooks),publishedContinuationsSha256:sha(actualContinuations),
      catalogTree:{path:'dist/scans/verified',gitTree:git(['rev-parse',`${INPUT_COMMIT}:dist/scans/verified`],{encoding:'utf8'}).trim()},
      p175Catalogs:catalogRecords,p175CropAssets:cropAssets,
      supplementalImage:{artifactId:'dmg175-user-confirmed-supplement',sha256:PDF_INPUTS.find(row=>row[0]==='dmg175.jpg')[1],printedPage:175,pdfPage:null,edition:'user-confirmed-correct-edition',printing:'not-specified',publishedFullImage:false,uniqueCropRegions:34,uniqueCropImages:8},
      sourceFrameBridge:{path:REGISTRY_PATH,sha256:sha(bridgeBytes),frameGroups:9,pdfPages:7,regionBindings:102,ownerBindings:102,deltaFromOldRegistry:['provenance.booksJsSha256 only']},
      producerCodeHashes:Object.fromEntries(PRODUCER_FILES.map(relative=>[relative,sourceCodeHashes[relative]])),
      canonicalPrivateSources:pdfSources,
      workingTreeValidation:{sourceInputPathsMatchCommit:true,sourceInputPathsHaveNoUncommittedChanges:true,unrelatedMetadataChangesExcludedFromSourceInputComparison:true},
    },
    derivedReports:{
      visual:{path:VISUAL_PATH,sha256:sha(visualBytes),bytes:visualBytes.length,markdown:outputRecord(VISUAL_MD_PATH),queues:VISUAL_QUEUES.map(outputRecord),counts:visual.counts,warnings:0,bridge:visual.sourceFrameCoordinateBridge},
      raster:{path:RASTER_PATH,sha256:sha(rasterBytes),bytes:rasterBytes.length,uncompressedBytes:gunzipSync(rasterBytes).length,sourceUsageMapPath:VISUAL_PATH,sourceUsageMapSha256:sha(visualBytes),counts:raster.counts,calibration:raster.calibration,bridge:raster.sourceFrameCoordinateBridge},
      continuation:{summary:outputRecord(CONT_SUMMARY_PATH),fullEvidence:outputRecord(CONT_FULL_PATH),markdown:outputRecord(CONT_MD_PATH),rawFullSha256:sha(rawFull),counts:summary.assessmentCounts,exposedUniverse:{catalogFiles:summary.exposedCatalogSummary.catalogFilesReferencedByExposedRecords,catalogRegionRows:summary.exposedUniverse.catalogRegionRows,bindingRegionUses:summary.exposedUniverse.bindingRegionUsageCount,propertyPointers:summary.exposedUniverse.propertyUniverse.propertyPointerCount,sourcePages:summary.exposedUniverse.uniqueSourcePageBindings},limits:summary.limits},
      sourceAndGeometryChecksOnly:true,
      semanticCompletenessClaim:false,
      sourceValueReviewClaim:false,
      candidateGeometryIsNotDefect:true,
      zeroCandidatesWouldNotConstitutePass:true,
    },
    preservedHistoricalArtifacts:legacyArtifacts,
    currentPointers,
    metadataBindingTool:{path:'tools/bind-dmg175-source-audit-input-commit-v1.mjs',sha256:toolHash,notPartOfSourceInputCommit:true},
  };
  return receipt;
}

assert.equal(process.argv.length,2,'this binder is closed to one source commit and writes one new receipt');
const receipt=buildReceipt();
const serialized=Buffer.from(`${JSON.stringify(receipt,null,2)}\n`);
const target=path.join(ROOT,RECEIPT_PATH);
if(existsSync(target)) assert.equal(sha(readFileSync(target)),sha(serialized),'receipt already exists with different bytes');
else writeFileSync(target,serialized,{flag:'wx'});
console.log(JSON.stringify({path:RECEIPT_PATH,sha256:sha(readFileSync(target)),sourceCommit:INPUT_COMMIT,reportCount:OUTPUT_PATHS.length,semanticReview:'unresolved'},null,2));
