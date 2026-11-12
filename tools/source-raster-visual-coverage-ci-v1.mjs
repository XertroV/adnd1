#!/usr/bin/env node
// CI-only dispatcher for the already-qualified next-native raster/visual
// builders. Fixed inputs and output locations; this does not alter P reports.
import {createHash} from 'node:crypto';
import {lstatSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildNextNativeSourceRasterCoverage} from './source-raster-coverage-next-native-v2.mjs';
import {buildVisualCoverageCore,renderMarkdown,renderPriceInventoryMarkdown} from './source-visual-coverage-next-native-v2.mjs';
import {buildDispositionManifest,renderDispositionMarkdown} from './source-visual-dispositions.mjs';
import {collectLiveRasterUniverse} from './source-raster-coverage-next-native-v2.mjs';
import {assertRasterSnapshotMatchesGeometry} from './class-mapping-report-runtime-guards-v1.mjs';
import {validateLiveSourceFrameBridge,validateCurrentSourceGeometry,SOURCE_FRAME_BRIDGE_PATH,SOURCE_FRAME_BRIDGE_SHA256} from './source-frame-coordinate-bridge-next-native-v2.mjs';
import {validatePriceSourceInventory} from './price-source-inventory.mjs';
import {verifyCommittedClassMappingReportReceipt} from './bind-class-mapping-source-audit-input-commit-v2.mjs';
import {SOURCE_BODY_COMMIT,SOURCE_BODY_TREE,REPORT_OUTPUTS} from './class-mapping-report-input-contract-v2.mjs';
import {validateNextNativeRasterCoverage,validateNextNativeVisualCoverage,NEXT_NATIVE_PATHS,VISUAL_ARTIFACT_NAMES} from './source-raster-visual-coverage-ci-contract-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reports='research/class-mapping-source-epoch-v1/reports/next-native-v2';
const artifactPaths=Object.freeze({
  raster:'artifacts/source-raster-coverage',
  visual:'artifacts/source-visual-coverage',
});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(`Current raster/visual CI validation: ${message}`);};

function repoPath(value){
  if(typeof value!=='string'||value.startsWith('/')||value.includes('\\')||
      value.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('-')))
    fail(`unsafe fixed repository path ${String(value)}`);
  return value;
}
function physical(relative){
  const file=repoPath(relative),absolute=path.resolve(root,file),stat=lstatSync(absolute);
  if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(absolute)!==absolute)fail(`${file}: expected physical regular file`);
  return readFileSync(absolute);
}
function optionalPhysical(relative){
  const file=repoPath(relative),absolute=path.resolve(root,file);
  try{const stat=lstatSync(absolute);if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(absolute)!==absolute)fail(`${file}: expected physical regular file`);return readFileSync(absolute);}
  catch(error){if(error.code==='ENOENT')return null;throw error;}
}
function readJson(relative){return JSON.parse(physical(relative).toString('utf8'));}
function readOptionalJson(relative){const bytes=optionalPhysical(relative);return bytes===null?null:JSON.parse(bytes.toString('utf8'));}
function loadCatalog(relative){const bytes=physical(`dist/${repoPath(relative)}`);return {catalog:JSON.parse(bytes.toString('utf8')),sha256:sha(bytes)};}
function loadImage(catalog,image){return physical(`dist/${path.posix.join(path.posix.dirname(repoPath(catalog)),repoPath(image))}`);}

function collectTriage(){
  const paths=[
    'research/source-visual-audit-phb-ua-triage.json','research/source-visual-audit-mm-triage.json',
    'research/phb-equipment-visual-triage.json','research/highlight-dmg-clipping-triage.json',
    'research/phb-45-75-visual-triage.json','research/phb-75-100-visual-triage.json',
    'research/ua-other-visual-review.json','research/nonphb-equipment-visual-review.json',
    'research/source-viewer-dogfood-findings.json','research/dmg175-character-level-crop-triage-v1.json',
  ];
  const records=[],inputs={};
  for(const origin of paths){
    const bytes=optionalPhysical(origin);if(bytes===null)continue;
    const value=JSON.parse(bytes.toString('utf8')),originSha256=sha(bytes);inputs[origin]=originSha256;
    for(const [recordIndex,record]of (value.records||value.candidates||value.findings||[]).entries()){
      const book=record.book||record.source?.book;
      const source=record.source?.sha256||record.sourceSha256||value.sourceSha256||value.baselineSourcePdfSha256?.[book]||null;
      records.push({origin,originSha256,recordIndex,record,sourceSha256:typeof source==='string'?source:null});
    }
  }
  return {records,inputs};
}
function frameContractPins(){
  const contractPath='research/class-mapping-source-epoch-v1/next-native-source-frame-bridge-contract-v2.json';
  const registryPath=NEXT_NATIVE_PATHS.sourceFrameBridge;
  const contract=readJson(contractPath),registry=physical(registryPath);
  if(contract.schemaVersion!==1||contract.artifactType!=='Next-native source-frame bridge report contract'||
      contract.status!=='reviewed current source-frame registry bound to actual S1 body'||
      contract.sourceEpoch?.sourceCommit!==SOURCE_BODY_COMMIT||contract.sourceEpoch?.sourceTree!==SOURCE_BODY_TREE||
      contract.registry?.path!==registryPath||contract.registry?.sha256!==sha(registry))
    fail('fixed source-frame bridge contract/registry does not match exact S1 bytes');
  return {contractPath,contractSha256:sha(physical(contractPath)),registryPath,registrySha256:sha(registry)};
}
function fixedOutputPin(receipt,relative,bytes){
  const pin=receipt.outputs.find(row=>row.path===relative);
  if(!pin)fail(`${relative}: missing fixed current report output pin`);
  const committed=physical(relative);
  if(!Buffer.from(bytes).equals(committed)||sha(bytes)!==pin.rawSha256||bytes.length!==pin.sizeBytes||
      sha(committed)!==pin.rawSha256||committed.length!==pin.sizeBytes)
    fail(`${relative}: freshly rebuilt bytes do not exactly match the committed receipt and physical report`);
}
function serializedJson(value,pretty=true){return Buffer.from(JSON.stringify(value,null,pretty?2:0)+'\n');}
function buildFreshVisualReport(receipt){
  const dataBytes=physical('dist/data.json'),data=JSON.parse(dataBytes.toString('utf8'));
  const geometryPath=NEXT_NATIVE_PATHS.geometry,geometryBytes=physical(geometryPath),geometry=JSON.parse(geometryBytes.toString('utf8'));
  const rasterBytes=physical(NEXT_NATIVE_PATHS.rasterSnapshot),rasterSnapshot=JSON.parse(gunzipSync(rasterBytes).toString('utf8'));
  try{assertRasterSnapshotMatchesGeometry(rasterSnapshot,geometry.sourcePdfSha256);}catch{fail('fixed P geometry/raster outputs do not bind the same source PDF identities');}
  const live=collectLiveRasterUniverse({repoRoot:root});
  const bridge=validateLiveSourceFrameBridge({repoRoot:root,data,loadCatalog,loadImage});
  const sourceFrameValidation=validateCurrentSourceGeometry({geometry,liveUsages:live.usages,bridge});
  const ledger=readJson('research/source-visual-reviews.json'),triage=collectTriage();
  const inventory=readJson('research/price-source-inventory.json');
  let priceInventoryValidation={valid:true,errors:[]};
  try{validatePriceSourceInventory(inventory);}catch(error){priceInventoryValidation={valid:false,errors:[error.message]};}
  const continuationManifest=readJson('research/citation-continuations.json');
  const contextContractManifest=readJson('research/citation-context-contracts.json');
  const inputHashes={
    data:sha(dataBytes),independentReviewLedger:sha(physical('research/source-visual-reviews.json')),triage:triage.inputs,
    geometry:{file:geometryPath,sha256:sha(geometryBytes)},
    priceInventory:{file:'research/price-source-inventory.json',sha256:sha(physical('research/price-source-inventory.json'))},
    continuationManifest:{file:'research/citation-continuations.json',sha256:sha(physical('research/citation-continuations.json'))},
    contextContractManifest:{file:'research/citation-context-contracts.json',sha256:sha(physical('research/citation-context-contracts.json'))},
  };
  const report=buildVisualCoverageCore(data,loadCatalog,ledger,geometry,{
    knownFindings:triage.records,inputHashes,priceInventory:inventory,priceInventoryValidation,
    continuationManifest,contextContractManifest,dataFileHash:sha(dataBytes),loadImage,
  });
  report.runtimeInputProofs={rasterBoundary:{path:NEXT_NATIVE_PATHS.rasterSnapshot,sha256:sha(rasterBytes)},sourceFrameBridgeContract:frameContractPins()};
  report.sourceFrameCoordinateBridge={path:SOURCE_FRAME_BRIDGE_PATH,sha256:SOURCE_FRAME_BRIDGE_SHA256,status:'scoped-geometric-provenance-only',registryValidation:bridge.validation};
  report.sourceFrameValidation=sourceFrameValidation;
  report.runMode={status:'next-native-fresh-source-frame-contract',sourceCommit:receipt.sourceEpoch.sourceBody.commit,
    qccCommit:receipt.qualifierProducer.commit,semanticPass:false};
  const dispositions=buildDispositionManifest(report);
  const outputs=new Map([
    [`${reports}/visual/source-visual-coverage.json`,serializedJson(report)],
    [`${reports}/visual/source-visual-coverage.md`,Buffer.from(renderMarkdown(report))],
    [`${reports}/visual/dispositions.json`,serializedJson(dispositions)],
    [`${reports}/visual/dispositions.md`,Buffer.from(renderDispositionMarkdown(dispositions))],
    [`${reports}/visual/price-source-inventory.json`,serializedJson(inventory)],
    [`${reports}/visual/price-source-inventory.md`,Buffer.from(renderPriceInventoryMarkdown(inventory))],
  ]);
  const errors=[...dispositions.structuralValidation.errors,...sourceFrameValidation.errors];
  if(!priceInventoryValidation.valid)errors.push(...priceInventoryValidation.errors.map(error=>`Price inventory: ${error}`));
  if(report.continuations?.valid===false)errors.push(`Continuation manifest: ${report.continuations.validationError}`);
  if(report.contextContracts?.violations?.length)errors.push(`${report.contextContracts.violations.length} context-extent contract check(s) failed`);
  return {report,dispositions,outputs,errors};
}
function ensurePhysicalDirectory(relative){
  const parts=repoPath(relative).split('/');let current=root;
  for(const part of parts){
    current=path.join(current,part);
    try{const stat=lstatSync(current);if(!stat.isDirectory()||stat.isSymbolicLink()||realpathSync(current)!==current)fail(`${relative}: output directory component is not a physical directory`);}
    catch(error){if(error.code!=='ENOENT')throw error;mkdirSync(current);}
  }
  return current;
}
function writeExclusive(relative,bytes){
  const file=repoPath(relative),target=path.resolve(root,file);ensurePhysicalDirectory(path.posix.dirname(file));
  writeFileSync(target,bytes,{flag:'wx'});return {path:file,sha256:sha(bytes),sizeBytes:bytes.length};
}
function writeFailureArtifacts(error){
  const message=String(error?.message||error);
  for(const directory of Object.values(artifactPaths)){
    try{
      const target=ensurePhysicalDirectory(directory);
      const errorPath=path.join(target,'generation-error.txt');
      try{writeFileSync(errorPath,Buffer.from(message+'\n'),{flag:'wx'});}catch(writeError){if(writeError.code!=='EEXIST')throw writeError;}
      writeFileSync(path.join(target,'validation-exit-status.txt'),Buffer.from('1\n'));
    }catch{}
  }
}

export async function runCurrentRasterVisualCoverageCi(argv=process.argv.slice(2)){
  if(!Array.isArray(argv)||argv.length!==0)fail('this fixed-input CI runner accepts no caller arguments');
  try{
    const verified=await verifyCommittedClassMappingReportReceipt();
    const receipt=verified.receipt;
    if(verified.sourceCommit!==SOURCE_BODY_COMMIT||verified.sourceTree!==SOURCE_BODY_TREE||
        receipt.qualifierProducer.commit!==receipt.currentConsumer.qualifierCode.commit)
      fail('verified report receipt does not preserve the fixed current S1/QCC lineage');
    if(receipt.outputs.length!==REPORT_OUTPUTS.length)fail('committed report output count differs from the fixed producer contract');

    const rasterReport=validateNextNativeRasterCoverage(buildNextNativeSourceRasterCoverage());
    rasterReport.sourceEpoch={sourceCommit:verified.sourceCommit,sourceTree:verified.sourceTree,qccCommit:verified.qualifierCodeCommit};
    const rasterBytes=serializedJson(rasterReport,false);
    fixedOutputPin(receipt,NEXT_NATIVE_PATHS.rasterCoverage,rasterBytes);

    const visual=buildFreshVisualReport(receipt);
    validateNextNativeVisualCoverage(visual.report);
    for(const [relative,bytes]of visual.outputs)fixedOutputPin(receipt,relative,bytes);

    const rasterArtifactBytes=serializedJson(rasterReport,false);
    const rasterArtifactPaths=[
      writeExclusive(`${artifactPaths.raster}/report.json`,rasterArtifactBytes),
      writeExclusive(`${artifactPaths.raster}/validation.json`,serializedJson({valid:rasterReport.validation.valid,errors:rasterReport.validation.errors,runMode:rasterReport.runMode,snapshot:rasterReport.snapshot,sourceGeometry:rasterReport.sourceGeometry,liveUniverse:rasterReport.liveUniverse,currentCandidateCounts:rasterReport.currentCandidateCounts})),
      writeExclusive(`${artifactPaths.raster}/validation-exit-status.txt`,Buffer.from('0\n')),
    ];
    const visualArtifactPaths=[];
    for(const [relative,bytes]of visual.outputs){
      const reportName=relative.slice(`${reports}/visual/`.length);
      const name=VISUAL_ARTIFACT_NAMES[reportName];
      if(!name)fail(`missing fixed visual artifact name for ${reportName}`);
      visualArtifactPaths.push(writeExclusive(`${artifactPaths.visual}/${name}`,bytes));
    }
    const visualErrorSummary={
      valid:visual.errors.length===0,errors:visual.errors,
      sourceFrameValidation:visual.report.sourceFrameValidation,
      totals:visual.report.totals,
      priceInventory:visual.report.priceInventory?.validation,
      continuations:visual.report.continuations?{valid:visual.report.continuations.valid,groups:visual.report.continuations.groupCount,segments:visual.report.continuations.segmentCount}:null,
      contextContracts:visual.report.contextContracts?{total:visual.report.contextContracts.total,violations:visual.report.contextContracts.violations.length}:null,
    };
    visualArtifactPaths.push(writeExclusive(`${artifactPaths.visual}/validation.json`,serializedJson(visualErrorSummary)));
    visualArtifactPaths.push(writeExclusive(`${artifactPaths.visual}/validation-exit-status.txt`,Buffer.from(visualErrorSummary.valid?'0\n':'1\n')));
    console.log(JSON.stringify({status:visualErrorSummary.valid?'pass':'fail',mode:'fresh-next-native-current-raster-and-visual',sourceCommit:verified.sourceCommit,qccCommit:verified.qualifierCodeCommit,
      rasterValidation:rasterReport.validation,visualValidation:visualErrorSummary,receiptSha256:verified.sha256,
      rasterArtifacts:rasterArtifactPaths,visualArtifacts:visualArtifactPaths},null,2));
    if(!visualErrorSummary.valid)process.exitCode=1;
    return {status:visualErrorSummary.valid?'pass':'fail',receiptSha256:verified.sha256,visualErrors:visual.errors};
  }catch(error){writeFailureArtifacts(error);console.error(error.message);process.exitCode=1;return {status:'error',error:error.message};}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  runCurrentRasterVisualCoverageCi();
