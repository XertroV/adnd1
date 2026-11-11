#!/usr/bin/env node
// Fixed-path next-native producer stage. It performs the final current-consumer
// seal check before importing the adapter runtime or calling any adapter.
// Every output target is new and exclusive; no active/MM snapshot is selected.
import {createHash} from 'node:crypto';
import {lstatSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {createRawGitReader} from './class-mapping-raw-git-v1.mjs';
import {buildReportSubprocessEnvironment,validateReportPythonExecutable,selectContinuationSnapshotHead,assertRasterSnapshotMatchesGeometry,loadSourceScanCatalogFromProducerPath,validateCurrentMonetaryIndexDependencyClosure} from './class-mapping-report-runtime-guards-v1.mjs';
import {
  SOURCE_BODY_COMMIT,SOURCE_BODY_TREE,REPORT_OUTPUTS,REPORT_DATA_PATHS,REPORT_OPTIONAL_DATA_PATHS,
  CURRENT_CONSUMER_FINAL_SEAL_PATH,CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,
  CURRENT_CONSUMER_PINS_PATH,CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,
  SOURCE_SCAN_FRESH_OUTPUT_PATH,SOURCE_SCAN_LEGACY_ALIAS,CURRENT_REPORT_LEGACY_ALIASES,
  CURRENT_CONSUMER_CODE_STAGE_STATUS,CURRENT_CONSUMER_FINAL_STAGE_STATUS,
  REPORT_DATA_POINTER_EDGES,HISTORICAL_RAW_GIT_READS,CURRENT_MONETARY_SOURCE_INDEX_PATH,REPORT_DATA_EXPECTED_SHA256,
} from './class-mapping-report-input-contract-v2.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reports='research/class-mapping-source-epoch-v1/reports/next-native-v2';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(`Next-native report producer stage: ${message}`);};
const rawGit=createRawGitReader(root),git=(...args)=>rawGit.git(...args);
function repoPath(value){if(typeof value!=='string'||value.startsWith('/')||value.includes('\\')||value.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('-')))fail(`unsafe repository path ${String(value)}`);return value;}
function physical(relative){const file=repoPath(relative),absolute=path.resolve(root,file),stat=lstatSync(absolute);if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(absolute)!==absolute)fail(`${file}: expected physical regular file`);return readFileSync(absolute);}
function physicalOptional(relative){const file=repoPath(relative),absolute=path.resolve(root,file);try{const stat=lstatSync(absolute);if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(absolute)!==absolute)fail(`${file}: expected physical regular file`);return readFileSync(absolute);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function readJson(relative){return JSON.parse(physical(relative).toString('utf8'));}
function readOptionalJson(relative){try{return readJson(relative);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function outputPath(relative){return path.resolve(root,repoPath(relative));}
function assertAbsent(relative,head){
  const file=repoPath(relative),absolute=outputPath(file);
  try{lstatSync(absolute);fail(`${file}: fresh output already exists on disk`);}catch(error){if(error.code!=='ENOENT')throw error;}
  try{git('cat-file','-e',`${head}:${file}`);fail(`${file}: fresh output already exists in actual HEAD`);}
  catch(error){const stderr=Buffer.isBuffer(error?.stderr)?error.stderr.toString('utf8'):String(error?.stderr||'');if(error?.message?.includes('fresh output already exists'))throw error;if(error?.status!==128||!stderr.includes(`path '${file}' does not exist in '${head}'`))fail(`${file}: cannot prove output path absent from raw HEAD (${stderr.trim()||error?.message||'unknown Git failure'})`);}
}
function writeExclusive(relative,bytes){
  const target=outputPath(relative);mkdirSync(path.dirname(target),{recursive:true});
  writeFileSync(target,bytes,{flag:'wx'});
  return {path:relative,sha256:sha(bytes),sizeBytes:bytes.length};
}
function validateBuiltArtifact(result,expectedPath,label){
  if(!result||result.path!==expectedPath||!Buffer.isBuffer(result.bytes)||!result.report||typeof result.report!=='object'||Array.isArray(result.report))fail(`${label}: zero-argument builder returned an unexpected path or byte/report value`);
  let parsed;try{parsed=JSON.parse(result.bytes.toString('utf8'));}catch{fail(`${label}: builder bytes are not JSON`);}
  if(!isDeepStrictEqual(parsed,result.report))fail(`${label}: returned report object differs from exact serialized bytes`);
  return result;
}
function writeJson(relative,value,pretty=true){return writeExclusive(relative,Buffer.from(JSON.stringify(value,null,pretty?2:0)+'\n'));}
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
  for(const origin of paths){let value;try{value=readJson(origin);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    const originSha256=sha(physical(origin));inputs[origin]=originSha256;
    for(const [recordIndex,record]of (value.records||value.candidates||value.findings||[]).entries()){
      const book=record.book||record.source?.book,source=record.source?.sha256||record.sourceSha256||value.sourceSha256||value.baselineSourcePdfSha256?.[book]||null;
      records.push({origin,originSha256,recordIndex,record,sourceSha256:typeof source==='string'?source:null});
    }
  }
  return {records,inputs};
}
function runPython(script,args,pythonExecutable){
  rawGit.assertView();
  const executable=validateReportPythonExecutable(pythonExecutable);
  const result=spawnSync(executable,[path.resolve(root,script),...args],{cwd:root,env:buildReportSubprocessEnvironment(executable),encoding:null,maxBuffer:128*1024*1024});
  if(result.error)fail(`${script}: could not start controlled Python: ${result.error.message}`);
  if(result.status!==0)fail(`${script}: exited ${result.status}; stderr=${Buffer.from(result.stderr||[]).toString('utf8').slice(-4000)}`);
  rawGit.assertView();
  return Buffer.from(result.stdout||[]);
}
function absoluteOutput(relative){return outputPath(relative);}
function pathSha(relative){return sha(physical(relative));}
function qccPathPresent(commit,relative){const file=repoPath(relative);try{git('cat-file','-e',`${commit}:${file}`);return true;}catch(error){const stderr=Buffer.isBuffer(error?.stderr)?error.stderr.toString('utf8'):String(error?.stderr||'');if(error?.status===128&&stderr.includes(`path '${file}' does not exist in '${commit}'`))return false;fail(`${file}: cannot establish raw QCC path presence (${stderr.trim()||error?.message||'unknown Git failure'})`);}}
function verifyReportDataInputs(commit,sourceBodyRows){
  for(const file of REPORT_DATA_PATHS){const live=physical(file),blob=Buffer.from(git('show',`${commit}:${repoPath(file)}`));if(!blob.equals(live))fail(`${file}: report data differs from its exact raw QCC blob`);if(REPORT_DATA_EXPECTED_SHA256[file]&&sha(blob)!==REPORT_DATA_EXPECTED_SHA256[file])fail(`${file}: fixed monetary-index, frame, question-contract, or kernel-review data pin differs from the reviewed artifact`);}
  for(const file of REPORT_OPTIONAL_DATA_PATHS){const live=physicalOptional(file),present=qccPathPresent(commit,file);if((live!==null)!==present)fail(`${file}: optional report-data physical/raw-QCC presence differs`);if(present&&!Buffer.from(git('show',`${commit}:${repoPath(file)}`)).equals(live))fail(`${file}: optional report data differs from its exact raw QCC blob`);}
  for(const edge of REPORT_DATA_POINTER_EDGES){if(!REPORT_DATA_PATHS.includes(edge.sourcePath)||!REPORT_DATA_PATHS.includes(edge.targetPath))fail(`typed report-data pointer is not statically closed: ${edge.sourcePath} -> ${edge.targetPath}`);const source=readJson(edge.sourcePath),parts=edge.pointer.slice(1).split('/');let value=source;for(const part of parts){if(!value||typeof value!=='object'||!Object.hasOwn(value,part)){value=null;break;}value=value[part];}if(!value||value.path!==edge.targetPath||!/^[a-f0-9]{64}$/.test(value.sha256||''))fail(`${edge.sourcePath}${edge.pointer}: unexpected exact report-data target or digest`);const target=physical(edge.targetPath);if(sha(target)!==value.sha256||!Buffer.from(git('show',`${commit}:${edge.targetPath}`)).equals(target))fail(`${edge.targetPath}: pointer-resolved report data differs from its declared or raw QCC digest`);}
  const historicalCommits=[...new Set(HISTORICAL_RAW_GIT_READS.map(row=>row.commit))];if(historicalCommits.length!==1)fail('historical raw-Git input set must bind one fixed baseline commit');
  const history=HISTORICAL_RAW_GIT_READS.map(row=>{const bytes=Buffer.from(git('show',`${row.commit}:${row.path}`));let pointerBinding=null;if(row.sourcePath){if(!REPORT_DATA_PATHS.includes(row.sourcePath))fail(`${row.sourcePath}: historical pointer source is outside static QCC data pins`);const source=readJson(row.sourcePath),readPointer=pointer=>{let value=source;for(const part of pointer.slice(1).split('/')){if(!value||typeof value!=='object'||!Object.hasOwn(value,part))return undefined;value=value[part];}return value;};if(readPointer(row.commitPointer)!==row.commit||readPointer(row.pathPointer)!==row.path||readPointer(row.shaPointer)!==sha(bytes))fail(`${row.sourcePath}: historical raw-Git target differs from its exact typed pointer`);pointerBinding={sourcePath:row.sourcePath,commitPointer:row.commitPointer,pathPointer:row.pathPointer,shaPointer:row.shaPointer};}return {path:row.path,sha256:sha(bytes),bytes,...(pointerBinding?{pointerBinding}:{})};});
  const historyData=JSON.parse(history.find(row=>row.path==='dist/data.json').bytes.toString('utf8')),
    historyHandoff=JSON.parse(history.find(row=>row.path==='research/gaps-limitations-next-task.json').bytes.toString('utf8'));
  if(historyHandoff.snapshot?.rawDistDataFileSha256!==history.find(row=>row.path==='dist/data.json').sha256||historyHandoff.snapshot?.parsedDataSha256!==sha(Buffer.from(JSON.stringify(historyData))))fail('fixed historical handoff baseline does not bind the exact historical data blob');
  return validateCurrentMonetaryIndexDependencyClosure(physical(CURRENT_MONETARY_SOURCE_INDEX_PATH),commit,sourceBodyRows,
    physical,(relative,selectedCommit)=>Buffer.from(git('show',`${selectedCommit}:${repoPath(relative)}`)));
}
function verifyBridgeContract(){
  const contractPath='research/class-mapping-source-epoch-v1/next-native-source-frame-bridge-contract-v2.json';
  const registryPath='research/class-mapping-source-epoch-v1/next-native-source-frame-bridge-v2.json';
  const contract=readJson(contractPath),registry=physical(registryPath);
  if(contract.schemaVersion!==1||contract.artifactType!=='Next-native source-frame bridge report contract'
      ||contract.status!=='reviewed current source-frame registry bound to actual S1 body'
      ||contract.sourceEpoch?.sourceCommit!==SOURCE_BODY_COMMIT||contract.sourceEpoch?.sourceTree!==SOURCE_BODY_TREE
      ||contract.registry?.path!==registryPath||contract.registry?.sha256!==sha(registry))fail('reviewed next-native source-frame bridge contract/registry does not match actual S1 bytes');
  return {contractPath,contractSha256:pathSha(contractPath),registryPath,registrySha256:sha(registry)};
}
function runCli(){
  const args=process.argv.slice(2);
  if(args.length!==4||args[0]!=='--source-dir'||!path.isAbsolute(args[1])||args[2]!=='--python-executable')fail('usage: node tools/class-mapping-report-producers-v2.mjs --source-dir <absolute-private-source-pdf-directory> --python-executable <absolute-physical-executable>');
  const sourceDirectory=path.resolve(args[1]),sourceStat=lstatSync(sourceDirectory);
  if(!sourceStat.isDirectory()||sourceStat.isSymbolicLink()||realpathSync(sourceDirectory)!==sourceDirectory)fail('source directory must be a physical non-symlink directory');
  const pythonExecutable=validateReportPythonExecutable(args[3]);
  return runNextNativeReportProducers(sourceDirectory,pythonExecutable);
}

function runNextNativeReportProducers(sourceDirectory,pythonExecutable){
  // This no-argument verifier is the trust root. Its fixed seals are read from
  // actual raw HEAD blobs before importing/calling current adapter APIs.
  rawGit.assertView();
  return import('./class-mapping-current-consumer-seal-verifier-v1.mjs').then(async verifier=>{
    const codeStage=verifier.verifyCurrentConsumerCodeStageSeal();
    const finalStage=verifier.verifyCurrentConsumerMaterializedStageSeal();
    if(codeStage.qualifierCode.commit!==finalStage.qualifierCode.commit||finalStage.sourceEpoch.sourceCommit!==SOURCE_BODY_COMMIT)fail('code and materialized seal identities differ');
    const head=finalStage.head;
    for(const output of REPORT_OUTPUTS){if(output.stage==='post-QCC-metadata-prerequisite')continue;assertAbsent(output.path,head);}
    const framePins=verifyBridgeContract();

    // The current runtime re-verifies the same seals and per-call S1/S2 pins.
    const runtime=await import('./class-mapping-current-consumer-runtime-v1.mjs');
    const current=runtime.qualifyCurrentConsumerStage();
    const sourceCommit=current.summary.sourceCommit,qcc=current.consumerPins.qualifierCodeCommit;
    if(sourceCommit!==SOURCE_BODY_COMMIT||current.summary.sourceTree!==SOURCE_BODY_TREE||qcc!==finalStage.qualifierCode.commit)fail('runtime/native stage differs from sealed S1/QCC identity');
    const monetaryIndexDependencyClosure=verifyReportDataInputs(finalStage.qualifierCode.commit,Object.entries(current.inputHashes?.sourceBody||{}).map(([file,digest])=>({path:file,sha256:digest})));
    const continuationCommit=selectContinuationSnapshotHead(sourceCommit,qcc,head);
    rawGit.assertView();

    const sourceRoot=path.resolve(sourceDirectory),geometryDir=`${reports}/geometry`,rasterDir=`${reports}/raster`,continuationDir=`${reports}/continuation`;
    const geometryPath=`${geometryDir}/source-visual-audit-next-native-v2.json`;
    const rasterBoundaryPath=`${rasterDir}/source-raster-boundary.json.gz`;
    runPython('research/source-visual-audit-next-native-v2.py',[
      '--source-dir',sourceRoot,'--data-root',path.join(root,'dist'),'--output-prefix','next-native-v2','--output-dir',absoluteOutput(geometryDir),
    ],pythonExecutable);
    for(const row of REPORT_OUTPUTS.filter(row=>row.path.startsWith(`${geometryDir}/`)))physical(row.path);
    runPython('research/source-raster-boundary-audit-next-native-v2.py',[
      '--source-dir',sourceRoot,'--source-usage-map',absoluteOutput(geometryPath),'--data-root',path.join(root,'dist'),
      '--dpi','300','--output',absoluteOutput(rasterBoundaryPath),
    ],pythonExecutable);
    physical(rasterBoundaryPath);
    const continuationPaths=[`${continuationDir}/continuation-candidates.json.gz`,`${continuationDir}/continuation-summary.json`,`${continuationDir}/continuation-report.md`];
    runPython('tools/continuation-candidates-next-native-v2.py',[
      '--root',root,'--source-dir',sourceRoot,'--output',absoluteOutput(continuationPaths[0]),
      '--summary',absoluteOutput(continuationPaths[1]),'--markdown',absoluteOutput(continuationPaths[2]),'--commit',continuationCommit,
    ],pythonExecutable);
    for(const relative of continuationPaths)physical(relative);

    const visual=await import('./source-visual-coverage-next-native-v2.mjs');
    const dispositionsModule=await import('./source-visual-dispositions.mjs');
    const raster=await import('./source-raster-coverage-next-native-v2.mjs');
    const frame=await import('./source-frame-coordinate-bridge-next-native-v2.mjs');
    const data=current.inputs.data,inventory=current.inputs.inventory;
    const dataBytes=physical('dist/data.json'),geometry=readJson(geometryPath),rasterSnapshot=JSON.parse(gunzipSync(physical(rasterBoundaryPath)));
    const expectedBooks=['DMG','MM','MM2','PHB','UA'];
    if(!geometry.sourcePdfSha256||expectedBooks.some(book=>!/^[a-f0-9]{64}$/.test(geometry.sourcePdfSha256?.[book]||'')))fail('geometry output must bind the five external source-PDF SHA-256 identities');
    try{assertRasterSnapshotMatchesGeometry(rasterSnapshot,geometry.sourcePdfSha256);}catch{fail('geometry and raster outputs must bind the same five external source-PDF SHA-256 identities');}
    const live=raster.collectLiveRasterUniverse({repoRoot:root});
    const bridge=frame.validateLiveSourceFrameBridge({repoRoot:root,data,loadCatalog,loadImage});
    const frameValidation=frame.validateCurrentSourceGeometry({geometry,liveUsages:live.usages,bridge});
    const visualLedger=readJson('research/source-visual-reviews.json'),triage=collectTriage();
    const priceMod=await import('./price-source-inventory.mjs');
    const priceValidation={valid:true,errors:[]};
    try{priceMod.validatePriceSourceInventory(inventory);}catch(error){priceValidation.valid=false;priceValidation.errors.push(error.message);}
    const continuationManifest=readOptionalJson('research/citation-continuations.json');
    const contextContractManifest=readOptionalJson('research/citation-context-contracts.json');
    const visualReport=visual.buildVisualCoverageCore(data,loadCatalog,visualLedger,geometry,{
      knownFindings:triage.records,
      inputHashes:{data:sha(dataBytes),independentReviewLedger:pathSha('research/source-visual-reviews.json'),triage:triage.inputs,
        geometry:{path:geometryPath,sha256:pathSha(geometryPath)},rasterBoundary:{path:rasterBoundaryPath,sha256:pathSha(rasterBoundaryPath)},
        sourceFrameBridgeContract:framePins},
      priceInventory:inventory,priceInventoryValidation:priceValidation,
      continuationManifest,contextContractManifest,dataFileHash:sha(dataBytes),loadImage,
    });
    visualReport.sourceFrameCoordinateBridge={path:frame.SOURCE_FRAME_BRIDGE_PATH,sha256:frame.SOURCE_FRAME_BRIDGE_SHA256,status:'scoped-geometric-provenance-only',registryValidation:bridge.validation};
    visualReport.sourceFrameValidation=frameValidation;
    visualReport.runMode={status:'next-native-fresh-source-frame-contract',sourceCommit,qccCommit:qcc,semanticPass:false};
    const dispositions=dispositionsModule.buildDispositionManifest(visualReport);
    const visualOutputs=[
      [`${reports}/visual/source-visual-coverage.json`,Buffer.from(JSON.stringify(visualReport,null,2)+'\n')],
      [`${reports}/visual/source-visual-coverage.md`,Buffer.from(visual.renderMarkdown(visualReport))],
      [`${reports}/visual/dispositions.json`,Buffer.from(JSON.stringify(dispositions,null,2)+'\n')],
      [`${reports}/visual/dispositions.md`,Buffer.from(dispositionsModule.renderDispositionMarkdown(dispositions))],
      [`${reports}/visual/price-source-inventory.json`,Buffer.from(JSON.stringify(inventory,null,2)+'\n')],
      [`${reports}/visual/price-source-inventory.md`,Buffer.from(visual.renderPriceInventoryMarkdown(inventory))],
    ];
    for(const [relative,bytes]of visualOutputs)writeExclusive(relative,bytes);

    const rasterReport=raster.buildNextNativeSourceRasterCoverage();
    rasterReport.sourceEpoch={sourceCommit,sourceTree:current.summary.sourceTree,qccCommit:qcc};
    writeJson(`${reports}/raster/source-raster-coverage.json`,rasterReport,false);

    const completeness=await import('./source-completeness-coverage.mjs');
    const codes=['PHB','DMG','UA','MM','MM2'];
    const pageBaseline=readJson('research/source-completeness-page-baseline.json');
    const siteBaseline=readJson('research/source-completeness-site.json');
    const ledgers=codes.map(code=>readJson(`research/source-completeness-${code.toLowerCase()}.json`));
    const register=completeness.loadCurrentSourceRepairRegister({rootPath:root});
    const completenessReport=completeness.buildSourceCompletenessCoverage({pageBaseline,siteBaseline,ledgers,currentData:data,repairs:register.repairs});
    completenessReport.sourceEpoch={sourceCommit,sourceTree:current.summary.sourceTree,qccCommit:qcc};
    completenessReport.inputs=[...['research/source-completeness-page-baseline.json','research/source-completeness-site.json',...codes.map(code=>`research/source-completeness-${code.toLowerCase()}.json`),'dist/data.json'].map(relative=>({path:relative,sha256:pathSha(relative)})),...register.inputs];
    writeJson(`${reports}/current/source-completeness.json`,completenessReport);
    writeExclusive(`${reports}/current/source-completeness.md`,Buffer.from(completeness.markdownSourceCompleteness(completenessReport)));

    const systemic=await import('./citation-systemic-inventory.mjs');
    const systemicReport=systemic.buildSystemicInventory(data,relative=>physical(relative),{source:'working-tree',commit:sourceCommit,rawDataFileSha256:sha(dataBytes),includeVisual:false});
    systemicReport.sourceEpoch={sourceCommit,sourceTree:current.summary.sourceTree,qccCommit:qcc};
    writeJson(`${reports}/current/citation-systemic-current.json`,systemicReport,false);

    const scan=await import('./source-scan-inventory.mjs');
    const scanReport=scan.buildInventory(data,relative=>loadSourceScanCatalogFromProducerPath(relative,readJson,repoPath));
    scanReport.sourceEpoch={sourceCommit,sourceTree:current.summary.sourceTree,qccCommit:qcc};
    scanReport.aliasContract=SOURCE_SCAN_LEGACY_ALIAS;
    writeJson(SOURCE_SCAN_FRESH_OUTPUT_PATH,scanReport,false);

    // Build the required source-table queue from the same qualified S1 data,
    // fresh in-memory price inventory, and exact current catalog bytes. The
    // historical artifact path is never read or overwritten.
    const tableModule=await import('./source-table-citation-coverage.mjs');
    const discoveryModule=await import('./source-discovery-group-reconciliation.mjs');
    const tableContractsPath='research/source-table-citation-contracts.json';
    const tableContracts=readJson(tableContractsPath),tableCatalogs=new Map(),tableInputHashes={
      'dist/data.json':sha(dataBytes),
      'research/price-source-inventory.json':pathSha('research/price-source-inventory.json'),
      [tableContractsPath]:pathSha(tableContractsPath),
    };
    const tableOwners=['rules','spells','equipment','classes','matrices'].flatMap(collection=>(data[collection]||[]).map(item=>({collection,item})));
    if(data.progressionExplainer)tableOwners.push({collection:'progressionExplainer',item:data.progressionExplainer});
    for(const {item} of tableOwners)for(const binding of ['sourceExcerpts','scanVerification']){
      const catalogPath=item[binding]?.catalog;
      if(!catalogPath||tableCatalogs.has(catalogPath))continue;
      const loaded=loadCatalog(catalogPath);
      tableCatalogs.set(catalogPath,loaded.catalog);
      tableInputHashes[`dist/${repoPath(catalogPath)}`]=loaded.sha256;
    }
    const discoveryReconciliation=discoveryModule.loadSourceDiscoveryGroupReconciliation({repoRoot:root});
    Object.assign(tableInputHashes,discoveryReconciliation.inputHashes);
    const tableReport=tableModule.buildSourceTableCitationCoverage({data,priceInventory:inventory,contracts:tableContracts,
      catalogs:tableCatalogs,inputHashes:tableInputHashes,strictViewerMetadata:true,discoveryReconciliation});
    tableReport.contractInputStatus='loaded';
    tableReport.sourceEpoch={sourceCommit,sourceTree:current.summary.sourceTree,qccCommit:qcc};
    const tablePath=`${reports}/current/source-table-citation-coverage.json`;
    writeJson(tablePath,tableReport);

    const handoffPath=`${reports}/current/gaps-handoff.json`;
    const handoffModule=await import('./refresh-gaps-handoff-next-native-v2-callshape-v1.mjs');
    const handoffBuilt=validateBuiltArtifact(handoffModule.buildCurrentClassMappingGapsHandoff(),handoffPath,'current gaps handoff');
    writeExclusive(handoffPath,handoffBuilt.bytes);

    // The coverage builder retains the published pure projection. Its one
    // legacy scan/handoff read names resolve through the two exact aliases,
    // while every other read must belong to a sealed body/data/output path.
    const coveragePath=`${reports}/current/coverage-gaps.json`,coverageModule=await import('./coverage-gaps-class-mapping-v1.mjs');
    const allowedCoverageInputs=new Set([
      ...Object.keys(current.inputHashes?.sourceBody||{}),...REPORT_DATA_PATHS,...REPORT_OPTIONAL_DATA_PATHS,
      ...Object.keys(current.consumerPins?.contractPins||{}),...Object.keys(current.consumerPins?.receiptPins||{}),
      ...REPORT_OUTPUTS.map(row=>row.path),
    ]);
    const aliasMap=new Map(CURRENT_REPORT_LEGACY_ALIASES.map(row=>[row.logicalPath,row.physicalPath]));
    const coverageReads=new Map();
    const readCoverageFile=logical=>{
      const actual=aliasMap.get(logical)||logical;
      if(!allowedCoverageInputs.has(actual))fail(`coverage projection read is outside the native/current/report closure: ${logical} -> ${actual}`);
      const bytes=physical(actual);coverageReads.set(actual,sha(bytes));return bytes;
    };
    const coverageReport=coverageModule.buildCoverageGaps({data,handoff:handoffBuilt.report,readFile:readCoverageFile});
    const coverageBytes=Buffer.from(JSON.stringify(coverageReport,null,2)+'\n');
    writeExclusive(coveragePath,coverageBytes);

    const monetaryPath=`${reports}/current/monetary-unit-provenance/report.json`;
    const monetaryModule=await import('./monetary-unit-provenance-audit-next-native-v2.mjs');
    const monetaryBuilt=validateBuiltArtifact(monetaryModule.buildCurrentClassMappingMonetaryUnitProvenance(),monetaryPath,'current monetary-unit provenance');
    writeExclusive(monetaryPath,monetaryBuilt.bytes);

    const consistencyPath=`${reports}/current/report-consistency.json`;
    const consistencyModule=await import('./source-report-consistency-audit-next-native-v2.mjs');
    const consistencyBuilt=validateBuiltArtifact(consistencyModule.buildCurrentClassMappingReportConsistency(),consistencyPath,'current report consistency');
    writeExclusive(consistencyPath,consistencyBuilt.bytes);

    // The final handoff transition is a separately generated pre-seal input;
    // all 25 report outputs are checked here after their fresh builders run.
    for(const row of REPORT_OUTPUTS.filter(row=>row.stage==='post-QCC-metadata'))physical(row.path);
    const blocked=['research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json'];
    return {sourceCommit,sourceTree:current.summary.sourceTree,qccCommit:qcc,headCommit:head,outputCount:REPORT_OUTPUTS.length-blocked.length,
      outputCounts:{generated:REPORT_OUTPUTS.length-blocked.length,coreNative:REPORT_OUTPUTS.filter(row=>row.producerClass==='core-native-report').length,currentAdapterReports:REPORT_OUTPUTS.filter(row=>row.producerClass==='current-adapter-report').length,preSealTransition:blocked.length},
      externalSourcePdfSha256:Object.fromEntries(expectedBooks.map(book=>[book,geometry.sourcePdfSha256[book]])),
      generated:REPORT_OUTPUTS.filter(row=>!blocked.includes(row.path)).map(row=>row.path),blocked,
      currentOutputBuilderPaths:[tablePath,handoffPath,coveragePath,monetaryPath,consistencyPath],coverageReadHashes:Object.fromEntries([...coverageReads].sort(([a],[b])=>a.localeCompare(b))),
      monetaryIndexDependencyClosure,
      sourceScanLegacyAlias:SOURCE_SCAN_LEGACY_ALIAS,currentReportLegacyAliases:CURRENT_REPORT_LEGACY_ALIASES,
      consumerSeals:{codeStage:{path:CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,status:CURRENT_CONSUMER_CODE_STAGE_STATUS},final:{path:CURRENT_CONSUMER_FINAL_SEAL_PATH,status:CURRENT_CONSUMER_FINAL_STAGE_STATUS},pins:[CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,CURRENT_CONSUMER_PINS_PATH]},
      semanticPass:false,sourceCompletenessCertified:false,visualReviewPromoted:false};
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const result=runCli();if(result&&typeof result.then==='function')result.then(value=>process.stdout.write(JSON.stringify(value)+'\n')).catch(error=>{console.error(error.message);process.exitCode=1;});else process.stdout.write(JSON.stringify(result)+'\n');}
  catch(error){console.error(error.message);process.exitCode=1;}
}
