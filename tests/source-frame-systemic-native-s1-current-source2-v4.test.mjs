import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from '../tools/class-mapping-historical-s1-fs-source2-v1.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readAuthenticatedHistoricalS1ReportEvidenceSource2,runWithAuthenticatedHistoricalS1ReadsSource2} from '../tools/class-mapping-historical-s1-evidence-source2-v1.mjs';
import {projectVisualCoverageSummary} from '../tools/citation-visual-summary-historical-s1-source2-v1.mjs';
import {collectLiveRasterUniverse} from '../tools/source-raster-coverage-historical-s1-source2-v1.mjs';
import {validateLiveSourceFrameBridge,validateCurrentSourceGeometry} from '../tools/source-frame-coordinate-bridge-historical-s1-source2-v1.mjs';

const root=new URL('../',import.meta.url),repoRoot=fileURLToPath(root);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const paths=Object.freeze({
 visual:'research/class-mapping-source-epoch-v1/reports/next-native-v2/visual/source-visual-coverage.json',
 geometry:'research/class-mapping-source-epoch-v1/reports/next-native-v2/geometry/source-visual-audit-next-native-v2.json',
 systemic:'research/class-mapping-source-epoch-v1/reports/next-native-v2/current/citation-systemic-current.json',
});
const read=path=>readFileSync(new URL(path,root));

test('authenticated historical S1 systemic/visual geometry keeps P1 provenance and strict frame checks under separate current Source2 identity', {timeout:600_000}, ()=>{
 runWithAuthenticatedHistoricalS1ReadsSource2(()=>{
  assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(()=>{}),/nested historical read scopes are forbidden/);
 // Authenticated raw S1 receipt/source/QCC/output evidence stays historical.
 // The provider independently admits the actual current Source2 body before and after.
 const proof=readAuthenticatedHistoricalS1ReportEvidenceSource2();
 const receipt=proof.historicalS1Receipt,source=receipt.sourceEpoch.sourceBody;
 assert.equal(proof.historicalS1Identity.stage,'authenticated-historical-s1-receipt-and-runtime');
 assert.equal(proof.historicalS1Identity.sourceBodyFileCount,2636);
 assert.equal(proof.historicalS1Identity.sourceBodyMapSha256,'2843ed5f0e11e3b2c639748e4b693bc8854bc6660b2817a7254555ca67596e08');
 assert.equal(source.inputs.length,2636);
 assert.equal(proof.currentSource2Identity.stage,'source2-body-native');
 assert.equal(proof.currentSource2Identity.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(proof.currentSource2Identity.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
 assert.equal(source.commit,'2d35138027f00c0740975e519dbb3a2b6df76d14');
 assert.equal(source.tree,'40ecb15130b339658522794db6d9e1bc58f43b50');
 const output=path=>{const rows=receipt.outputs.filter(row=>row.path===path);assert.equal(rows.length,1);const bytes=read(path);assert.equal(bytes.length,rows[0].sizeBytes);assert.equal(sha(bytes),rows[0].rawSha256);return bytes;};
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
 // Recompute strict S1 frame validation through the unchanged P1 algorithms
 // over authenticated historical reads; the old MM pointer remains explicit.
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
});
test('historical S1 read scope rejects invalid callbacks before invoking them or their hooks',()=>{
 let calls=0,hooks=0;
 const callback=()=>{calls++;};
 const proxy=new Proxy(callback,{get(){hooks++;throw Error('callback property hook');},getPrototypeOf(){hooks++;throw Error('callback prototype hook');}});
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(),/historical read scope requires exactly one synchronous callback/);
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(callback,{}),/historical read scope requires exactly one synchronous callback/);
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(null),/historical read scope requires a non-proxy ordinary synchronous callback/);
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(proxy),/historical read scope requires a non-proxy ordinary synchronous callback/);
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(async()=>{calls++;}),/historical read scope forbids nonplain, async and generator callbacks/);
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(function*(){calls++;}),/historical read scope forbids nonplain, async and generator callbacks/);
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(callback.bind(null)),/historical read scope forbids native, bound and class callbacks/);
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(class ScopeCallback{}),/historical read scope forbids native, bound and class callbacks/);
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(Math.max),/historical read scope forbids native, bound and class callbacks/);
 assert.equal(calls,0,'invalid callback bodies never run');
 assert.equal(hooks,0,'callback proxy hooks never run');
});
test('historical S1 read scope rejects unvalidated thenable returns and clears the private scope for a healthy control',()=>{
 let calls=0,hooks=0;
 const thenable=new Proxy({then(){hooks++;throw Error('then method must not run');}},{get(){hooks++;throw Error('thenable property hook');},getPrototypeOf(){hooks++;throw Error('thenable prototype hook');}});
 assert.throws(()=>runWithAuthenticatedHistoricalS1ReadsSource2(()=>{calls++;return thenable;}),/historical read scope callback must synchronously return undefined/);
 assert.equal(calls,1,'the rejected-result callback ran exactly once');
 assert.equal(hooks,0,'thenable/proxy result hooks are never inspected');
 assert.equal(runWithAuthenticatedHistoricalS1ReadsSource2(()=>{calls++;}),undefined,'a healthy synchronous control succeeds after the rejected return');
 assert.equal(calls,2,'the healthy control was independently invoked');
});
// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
