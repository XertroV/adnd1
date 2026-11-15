import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyCommittedClassMappingReportReceipt} from '../tools/bind-class-mapping-source-audit-input-commit-v2.mjs';
import {projectVisualCoverageSummary} from '../tools/citation-systemic-inventory.mjs';
import {collectLiveRasterUniverse} from '../tools/source-raster-coverage-next-native-v2.mjs';
import {validateLiveSourceFrameBridge,validateCurrentSourceGeometry} from '../tools/source-frame-coordinate-bridge-next-native-v2.mjs';

const root=new URL('../',import.meta.url),repoRoot=fileURLToPath(root);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const paths=Object.freeze({
 visual:'research/class-mapping-source-epoch-v1/reports/next-native-v2/visual/source-visual-coverage.json',
 geometry:'research/class-mapping-source-epoch-v1/reports/next-native-v2/geometry/source-visual-audit-next-native-v2.json',
 systemic:'research/class-mapping-source-epoch-v1/reports/next-native-v2/current/citation-systemic-current.json',
});
const read=path=>readFileSync(new URL(path,root));

test('genuine current S1 systemic/visual geometry keeps P1 provenance, denominators and strict frame checks', {timeout:600_000}, async()=>{
 // This verifier obtains its own current Native1 proof and reruns the exact
 // source/QCC/code/data/output/metadata checks. No old MM data is current proof.
 const proof=await verifyCommittedClassMappingReportReceipt();
 const receipt=proof.receipt,source=receipt.sourceEpoch.sourceBody;
 assert.equal(source.commit,'2d35138027f00c0740975e519dbb3a2b6df76d14');
 assert.equal(source.tree,'40ecb15130b339658522794db6d9e1bc58f43b50');
 const output=path=>{const rows=receipt.outputs.filter(row=>row.path===path);assert.equal(rows.length,1);const bytes=read(path);assert.equal(bytes.length,rows[0].sizeBytes);assert.equal(sha(bytes),rows[0].sha256);return bytes;};
 const dataBytes=read('dist/data.json'),data=JSON.parse(dataBytes),bodyRows=source.inputs.filter(row=>row.path==='dist/data.json');assert.equal(bodyRows.length,1);assert.equal(sha(dataBytes),bodyRows[0].sha256);assert.equal(dataBytes.length,bodyRows[0].sizeBytes);
 const visual=JSON.parse(output(paths.visual)),geometryBytes=output(paths.geometry),geometry=JSON.parse(geometryBytes),systemic=JSON.parse(output(paths.systemic));
 const geometryRef={path:paths.geometry,sha256:sha(geometryBytes),inputDataSha256:geometry.inputDataSha256,candidateCount:geometry.candidates.length,usageCount:geometry.usages.length};
 const summary=projectVisualCoverageSummary(visual,geometryRef);
 assert.equal(summary.available,true);
 assert.equal(summary.inputDataSha256,systemic.input.sha256);
 assert.equal(summary.inputDataSha256,sha(Buffer.from(JSON.stringify(data))));
 assert.equal(systemic.input.rawFileSha256,sha(dataBytes));
 assert.equal(geometry.inputDataSha256,sha(dataBytes),'geometry uses raw bytes; systemic/visual input uses parsed-data hash');
 assert.equal(summary.selectedRegionUsageCount,systemic.selectedCatalogRegions.denominator);
 assert.equal(summary.totals.regionUsages,geometry.usages.length);
 assert.equal(summary.geometrySnapshotReference.path,paths.geometry);
 assert.equal(summary.geometrySnapshotReference.sha256,sha(geometryBytes));
 assert.equal(summary.sourceFrameValidation.valid,true);
 assert.deepEqual(summary.sourceFrameValidation.errors,[]);
 // Recompute strict current frame validation through the installed P1 APIs,
 // rather than trusting an output flag or changing the old global MM pointer.
 const live=collectLiveRasterUniverse({repoRoot});
 const bridge=validateLiveSourceFrameBridge({repoRoot,data,loadCatalog:catalog=>{const bytes=read('dist/'+catalog);return {catalog:JSON.parse(bytes),sha256:sha(bytes)};},loadImage:(catalog,image)=>read('dist/'+catalog.slice(0,catalog.lastIndexOf('/')+1)+image)});
 assert.equal(bridge.validation.status,'current-pins-match');
 assert.deepEqual(validateCurrentSourceGeometry({geometry,liveUsages:live.usages,bridge}),visual.sourceFrameValidation);
 const oldPointer=JSON.parse(read('research/current-source-raster-snapshot.json'));
 assert.equal(oldPointer.sourceGeometry.path,'research/source-visual-audit-mm-treasure-mm74-fixed-v2.json');
 assert.notEqual(oldPointer.sourceGeometry.path,paths.geometry,'legacy MM pointer remains an explicit historical role');
 const oldGeometryBytes=read(oldPointer.sourceGeometry.path);assert.equal(sha(oldGeometryBytes),oldPointer.sourceGeometry.sha256);
 const oldGeometry=JSON.parse(oldGeometryBytes);
 assert.equal(validateCurrentSourceGeometry({geometry:oldGeometry,liveUsages:live.usages,bridge}).valid,false,'MM geometry cannot certify current S1');
 const missingDeclaration=structuredClone(geometry);delete missingDeclaration.sourceFrameCoordinateBridge;
 assert.equal(validateCurrentSourceGeometry({geometry:missingDeclaration,liveUsages:live.usages,bridge}).valid,false);
 const missingUsage=structuredClone(geometry);missingUsage.usages.pop();
 assert.equal(validateCurrentSourceGeometry({geometry:missingUsage,liveUsages:live.usages,bridge}).valid,false);
 const failed=projectVisualCoverageSummary({usages:[],sourceFrameValidation:{valid:false,errors:['diagnostic-only']}},null,{available:false});
 assert.deepEqual(failed.sourceFrameValidation,{valid:false,errors:['diagnostic-only']});
});
