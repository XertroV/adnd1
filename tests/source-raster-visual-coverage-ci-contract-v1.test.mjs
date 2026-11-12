import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRENT_S1,NEXT_NATIVE_PATHS,VISUAL_ARTIFACT_NAMES,validateNextNativeRasterCoverage,validateNextNativeVisualCoverage} from '../tools/source-raster-visual-coverage-ci-contract-v1.mjs';

const hash='a'.repeat(64);
const rasterReport=()=>({
  validation:{valid:true,errors:[]},
  runMode:{status:'next-native-fresh-inputs-only',semanticPass:false},
  snapshot:{path:NEXT_NATIVE_PATHS.rasterSnapshot,sha256:hash,selection:'next-native-v2-fresh-output'},
  sourceGeometry:{path:NEXT_NATIVE_PATHS.geometry,sha256:'b'.repeat(64),selection:'next-native-v2-fresh-output'},
  liveUniverse:{regionUsages:12,catalogs:3,dataSha256:CURRENT_S1.dataSha256},
  currentCandidateCounts:{regionUsages:12},
});
const visualReport=()=>({
  runMode:{status:'next-native-fresh-source-frame-contract',sourceCommit:CURRENT_S1.sourceCommit,qccCommit:CURRENT_S1.qccCommit,semanticPass:false},
  inputs:{data:CURRENT_S1.dataSha256,geometry:{file:NEXT_NATIVE_PATHS.geometry,sha256:'c'.repeat(64)}},
  inputDataSha256:CURRENT_S1.parsedDataSha256,
  runtimeInputProofs:{
    rasterBoundary:{path:NEXT_NATIVE_PATHS.rasterSnapshot,sha256:'d'.repeat(64)},
    sourceFrameBridgeContract:{registryPath:NEXT_NATIVE_PATHS.sourceFrameBridge,registrySha256:'e'.repeat(64)},
  },
  sourceFrameCoordinateBridge:{path:NEXT_NATIVE_PATHS.sourceFrameBridge,sha256:'e'.repeat(64),status:'scoped-geometric-provenance-only',registryValidation:{status:'current-pins-match',mismatchCount:0,frameGroups:9,ownerJoinsValidated:102}},
  sourceFrameValidation:{valid:true,errors:[]},
  priceInventory:{validation:{valid:true}},continuations:{valid:true},contextContracts:{violations:[]},
  totals:{regionUsages:4216,uniqueImages:1415},
});
const clone=value=>JSON.parse(JSON.stringify(value));

test('accepts fresh next-native raster output with exact fixed P paths',()=>{
  const report=rasterReport();
  assert.equal(validateNextNativeRasterCoverage(report),report);
});

test('rejects the actual legacy-pointer raster dispatch shape',()=>{
  const report=rasterReport();
  report.runMode.status='current-active-bridge-required';
  report.snapshot={path:'research/source-raster-boundary-mm-treasure-source-0f2d70a135e3.json.gz',sha256:hash,selection:'active-pointer'};
  report.sourceGeometry={path:'research/source-visual-audit-mm-treasure-mm74-fixed-v2.json',sha256:hash,selection:'active-pointer'};
  report.validation={valid:false,errors:[
    'Source geometry is missing the exact active source-frame bridge declaration or current registry validation.',
    'Source geometry usage set differs from the complete current catalog universe.',
    'Raster snapshot is missing the exact current source-frame bridge declaration.',
    'Current data hash differs from raster snapshot.',
    'Current catalog hashes differ from raster snapshot.',
    'Raster usage multiset differs from the complete live catalog universe.',
  ]};
  assert.throws(()=>validateNextNativeRasterCoverage(report),/valid=true and no validation errors/);
});

test('rejects raster reports with errors even if a producer marks valid',()=>{
  const report=rasterReport();report.validation.errors=['stale input'];
  assert.throws(()=>validateNextNativeRasterCoverage(report),/valid=true and no validation errors/);
});

test('accepts a current visual report with both distinct data hash domains and bounded frame registry proof',()=>{
  const report=visualReport();
  assert.equal(validateNextNativeVisualCoverage(report),report);
});

test('rejects the legacy visual active-pointer run mode and geometry source',()=>{
  const report=visualReport();
  report.runMode.status='current-active-bridge-required';
  report.inputs.geometry.file='research/source-visual-audit-mm-treasure-mm74-fixed-v2.json';
  report.runtimeInputProofs.rasterBoundary.path='research/source-raster-boundary-mm-treasure-source-0f2d70a135e3.json.gz';
  assert.throws(()=>validateNextNativeVisualCoverage(report),/fixed S1\/QCC next-native/);
});

test('rejects semantic promotion or an incomplete current source-frame registry check',()=>{
  const semantic=clone(visualReport());semantic.runMode.semanticPass=true;
  assert.throws(()=>validateNextNativeVisualCoverage(semantic),/without a semantic-pass claim/);
  const registry=clone(visualReport());registry.sourceFrameCoordinateBridge.registryValidation.mismatchCount=1;
  assert.throws(()=>validateNextNativeVisualCoverage(registry),/exact current frame registry coverage/);
});

test('maps current visual report outputs to the existing CI artifact filenames',()=>{
  assert.equal(VISUAL_ARTIFACT_NAMES['source-visual-coverage.json'],'report.json');
  assert.equal(VISUAL_ARTIFACT_NAMES['source-visual-coverage.md'],'report.md');
  assert.deepEqual(Object.keys(VISUAL_ARTIFACT_NAMES).sort(),[
    'dispositions.json','dispositions.md','price-source-inventory.json',
    'price-source-inventory.md','source-visual-coverage.json','source-visual-coverage.md',
  ]);
});
