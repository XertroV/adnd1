import test from 'node:test';
import {after} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync, gunzipSync} from 'node:zlib';
import {buildHistoricalSourceRasterCoverage, buildSourceRasterCoverage, collectLiveRasterUniverse, loadRasterSnapshotInput, roundHalfUpRasterPixel, runSourceRasterCoverage} from '../tools/source-raster-coverage.mjs';
import {assertMmTreasureCurrentSourceCohort, readMmTreasureCurrentSourceInputs} from './helpers/mm-treasure-current-m1-cohort-v2.mjs';

const snapshot = JSON.parse(gunzipSync(loadRasterSnapshotInput().bytes));
const historicalSnapshot = JSON.parse(gunzipSync(readFileSync(new URL('../research/source-audit-batch5-raster-boundary-before-source-repairs.json.gz', import.meta.url))));
const historicalLive = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-raster-live-b90d317-before.json.gz', import.meta.url)))).live;
const live = collectLiveRasterUniverse();
const releasedJoSnapshot=JSON.parse(gunzipSync(readFileSync(new URL('../research/source-raster-boundary-batch6-jo-search079-v1.json.gz',import.meta.url))));
const priorJoSearchSnapshot=JSON.parse(gunzipSync(readFileSync(new URL('../research/source-raster-boundary-batch6-search-cleric-post-pr34.json.gz',import.meta.url))));
const dmg175MapperBeforeBytes=readFileSync(new URL('./fixtures/source-raster-dmg175-live-mapper-reconstruction-v1.json.gz',import.meta.url));
const dmg175MapperBefore=JSON.parse(gunzipSync(dmg175MapperBeforeBytes));
const dmg175UniverseV1Bytes=readFileSync(new URL('./fixtures/dmg175-current-supplemental-usage-universe-v1.json',import.meta.url));
const dmg175UniverseV1=JSON.parse(dmg175UniverseV1Bytes.toString('utf8'));
const dmg175UniverseBytes=readFileSync(new URL('./fixtures/dmg175-current-supplemental-usage-universe-v2.json',import.meta.url));
const dmg175Universe=JSON.parse(dmg175UniverseBytes.toString('utf8'));
const hirelingsCurrentFixtureBytes=readFileSync(new URL('./fixtures/hirelings-source-current-cohort-v1.json',import.meta.url));
const hirelingsCurrentFixture=JSON.parse(hirelingsCurrentFixtureBytes.toString('utf8'));
const dmg175Require=createRequire(import.meta.url),dmg175Books=dmg175Require('../dist/books.js');
const hM1Commit='bc819621e49788260bb34ea47c1f7a8b35af6edf';
const dmg175DataBytes=execFileSync('git',['show',`${hM1Commit}:dist/data.json`],{maxBuffer:32*1024*1024});
const dmg175Data=JSON.parse(dmg175DataBytes.toString('utf8'));
const dmg175Tuple=row=>[row.collection,row.itemId,row.binding,row.catalog,row.regionId,row.book,row.printedPage,row.pdfPage,row.imageSha256,row.sourceKind,row.sourceArtifactId,row.sourceArtifactSha256,row.sourcePdfSha256];
const dmg175UsageOrder=(a,b)=>`${a.catalog}:${a.regionId}`.localeCompare(`${b.catalog}:${b.regionId}`);
const sortedDmg175Tuples=rows=>rows.slice().sort(dmg175UsageOrder).map(dmg175Tuple);
function historicalCatalogSnapshot(data){
 const paths=[...new Set(['rules','spells','equipment','matrices','classes','progressionExplainer'].flatMap(collection=>{
  const owners=Array.isArray(data[collection])?data[collection]:data[collection]?[data[collection]]:[];
  return owners.flatMap(owner=>['sourceExcerpts','scanVerification'].flatMap(key=>owner[key]?.catalog?[`dist/${owner[key].catalog}`]:[]));
 }))].sort();
 const tree=execFileSync('git',['ls-tree','-r','-z',hM1Commit,'--','dist/scans'],{maxBuffer:16*1024*1024}).toString('utf8');
 const objectByPath=new Map(tree.split('\0').filter(Boolean).map(row=>{const [meta,path]=row.split('\t');return[path,meta.split(' ')[2]];}));
 assert.equal(paths.length,dmg175Universe.inputs.catalogCount,'historical H M1 exposes the exact catalog denominator');
 const objectIds=paths.map(path=>{const oid=objectByPath.get(path);assert.ok(oid,`${path}: exact H M1 catalog Git object exists`);return oid;});
 const batch=execFileSync('git',['cat-file','--batch'],{input:`${objectIds.join('\n')}\n`,maxBuffer:128*1024*1024});
 const hashes={};let offset=0;
 for(let index=0;index<objectIds.length;index++){
  const headerEnd=batch.indexOf(0x0a,offset);assert.notEqual(headerEnd,-1,'git cat-file returns a complete H catalog header');
  const [oid,type,sizeText]=batch.subarray(offset,headerEnd).toString('utf8').split(' ');
  assert.equal(oid,objectIds[index]);assert.equal(type,'blob');const size=Number(sizeText);assert.ok(Number.isSafeInteger(size)&&size>=0);
  const start=headerEnd+1,end=start+size;assert.equal(batch[end],0x0a,'git cat-file terminates each complete catalog blob');
  hashes[paths[index].slice('dist/'.length)]=createHash('sha256').update(batch.subarray(start,end)).digest('hex');offset=end+1;
 }
 assert.equal(offset,batch.length,'all H M1 catalog blobs are consumed exactly once');
 return{count:paths.length,sha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex')};
}
function sourceDerivedDmg175UsageRows(){
 assert.equal(createHash('sha256').update(dmg175UniverseBytes).digest('hex'),'023fcc8eaac62a005e465b602fc81828b833eb2aabade85e52583de6a45a55dd');
 assert.equal(dmg175Universe.sourceEpoch.sourceCommit,hirelingsCurrentFixture.sourceCommit);
 assert.equal(dmg175Universe.sourceEpoch.sourceTree,hirelingsCurrentFixture.sourceTree);
 assert.equal(dmg175Universe.sourceEpoch.nativeHirelingsCohortFixtureSha256,'62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f');
 assert.equal(dmg175Universe.inputs.dataSha256,hirelingsCurrentFixture.sourceRawInputs['dist/data.json']);
 assert.equal(createHash('sha256').update(dmg175DataBytes).digest('hex'),dmg175Universe.inputs.dataSha256);
 assert.deepEqual(historicalCatalogSnapshot(dmg175Data),{count:dmg175Universe.inputs.catalogCount,sha256:dmg175Universe.inputs.catalogSnapshotSha256},'the sealed 1082-catalog H M1 universe remains exact in Git');
 const registryBytes=readFileSync(new URL('../research/dmg175-supplement-crop-registry-v1.json',import.meta.url));
 assert.equal(createHash('sha256').update(registryBytes).digest('hex'),dmg175Universe.inputs.registrySha256);
 const registry=JSON.parse(registryBytes.toString('utf8'));
 assert.deepEqual(registry.sourceIdentity,dmg175Universe.sourceIdentity);
 assert.deepEqual(registry.regions,dmg175Universe.registryRegions);
 assert.equal(createHash('sha256').update(JSON.stringify(registry.regions)).digest('hex'),dmg175Universe.inputs.registryRegionMetadataSha256);
 const registryIds=registry.regions.map(region=>region.regionId).sort();
 assert.deepEqual(registryIds,dmg175Universe.registryRegionIds);
 assert.equal(createHash('sha256').update(JSON.stringify(registryIds)).digest('hex'),dmg175Universe.inputs.registryRegionIdsSha256);
 const actualGroups=[],actualRows=[];
 for(const group of dmg175Universe.activeCatalogs){
  const owners=group.collection==='progressionExplainer'?(dmg175Data[group.collection]?[dmg175Data[group.collection]]:[]):(dmg175Data[group.collection]||[]);
  const owner=owners.find(item=>item.id===group.itemId);assert.ok(owner,`${group.collection}:${group.itemId} exists`);
  const bindingName=owner.sourceExcerpts?'sourceExcerpts':owner.scanVerification?'scanVerification':null;
  assert.equal(bindingName,group.binding,`${group.collection}:${group.itemId} selected binding`);
  const binding=owner[bindingName];assert.equal(binding.catalog,group.catalog);
  const catalogBytes=readFileSync(new URL(`../dist/${group.catalog}`,import.meta.url));
  assert.equal(createHash('sha256').update(catalogBytes).digest('hex'),group.catalogSha256,group.catalog);
  const catalog=JSON.parse(catalogBytes.toString('utf8'));
  assert.equal(catalog.collection,group.collection);assert.equal(catalog.itemId,group.itemId);
  assert.equal(binding.regionCount,catalog.regions.length,`${group.catalog} binding region count`);
  const regions=catalog.regions.filter(region=>region.sourceArtifactId==='dmg175-user-confirmed-supplement');
  assert.deepEqual(regions.map(region=>region.id).sort(),group.regionIds,`${group.catalog} supplemental regions`);
  actualGroups.push({collection:group.collection,itemId:group.itemId,binding:bindingName,catalog:group.catalog,catalogSha256:createHash('sha256').update(catalogBytes).digest('hex'),regionIds:regions.map(region=>region.id).sort()});
  for(const regionId of group.regionIds){
   const region=regions.find(candidate=>candidate.id===regionId);assert.ok(region,`${group.catalog}#${regionId} exists`);
   const identity=dmg175Books.resolveRegionSourceIdentity(catalog,region);assert.equal(identity.valid,true,`${group.catalog}#${regionId} source identity`);
   actualRows.push({collection:group.collection,itemId:group.itemId,binding:bindingName,catalog:group.catalog,regionId:region.id,book:region.book,printedPage:region.printedPage,pdfPage:region.pdfPage,imageSha256:region.sha256,sourceKind:identity.sourceKind,sourceArtifactId:identity.sourceArtifactId,sourceArtifactSha256:identity.sourceSha256,sourcePdfSha256:identity.canonicalPdfSha256});
  }
 }
 assert.deepEqual(actualGroups,dmg175Universe.activeCatalogs);
 assert.equal(actualGroups.length,dmg175Universe.counts.activeCatalogs);
 assert.equal(actualRows.length,dmg175Universe.counts.activeUsageRows);
 assert.equal(new Set(actualRows.map(row=>row.regionId)).size,dmg175Universe.counts.activeDistinctRegionIds);
 assert.deepEqual([...new Set(actualRows.map(row=>row.regionId))].sort(),dmg175Universe.registryRegionIds);
 assert.deepEqual(sortedDmg175Tuples(actualRows),sortedDmg175Tuples(dmg175Universe.expectedUsages));
 return actualRows;
}
const legacyFixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-raster-coverage-derived-metrics-before.json.gz', import.meta.url))));
const legacySource = legacyFixture.files['tools/source-raster-coverage.mjs'];
assert.equal(createHash('sha256').update(legacySource.utf8).digest('hex'), legacySource.sha256);
const legacyDir = mkdtempSync(join(tmpdir(), 'source-raster-coverage-legacy-'));
const legacyPath = join(legacyDir, 'source-raster-coverage.mjs');
writeFileSync(legacyPath, legacySource.utf8);
const {buildSourceRasterCoverage: buildLegacyCoverage} = await import(pathToFileURL(legacyPath).href);
const windowBindingFixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-raster-coverage-window-binding-before.json.gz', import.meta.url))));
assert.equal(createHash('sha256').update(windowBindingFixture.checker.utf8).digest('hex'), windowBindingFixture.checker.sha256);
const windowBindingBeforePath = join(legacyDir, 'source-raster-window-binding-before.mjs');
writeFileSync(windowBindingBeforePath, windowBindingFixture.checker.utf8);
const {buildSourceRasterCoverage: buildBeforeWindowBindingCoverage} = await import(pathToFileURL(windowBindingBeforePath).href);
after(() => rmSync(legacyDir, {recursive: true, force: true}));

const coordinatedMutations = [
  ['candidate metrics altered without changing evidence arrays', copy => {
    copy.counts.geometriesWithStrongCrossingComponentCandidateMinGrayLt230 = 0;
    copy.counts.componentsLt254AcrossFourEdges = 0;
  }],
  ['all live rows reclassified as arbitrary not-assessable uses', copy => {
    copy.notAssessableUsages = copy.usages.map(usage => ({...usage, notAssessableReason: 'manually unassessable'}));
    copy.usages = [];
    copy.geometries = [];
    copy.sourceFrames = [];
    Object.assign(copy.counts, {
      assessedUsages: 0,
      notAssessableUsages: copy.notAssessableUsages.length,
      uniqueImageGeometryBindings: 0,
      sourcePagesRendered: 0,
    });
  }],
  ['orphan geometry appended with matching counter', copy => {
    const extra = structuredClone(copy.geometries[0]);
    extra.geometryId = 'orphan-geometry';
    extra.uses = [];
    copy.geometries.push(extra);
    copy.counts.uniqueImageGeometryBindings++;
  }],
  ['unrelated source frame appended with matching counter', copy => {
    const extra = structuredClone(copy.sourceFrames[0]);
    extra.book = 'UNRELATED';
    extra.pdfPage = 9999;
    copy.sourceFrames.push(extra);
    copy.counts.sourcePagesRendered++;
  }],
  ['geometry and linked frame share a bogus source PDF hash', copy => {
    const first = copy.geometries[0];
    const hash = 'f'.repeat(64);
    for (const geometry of copy.geometries.filter(row => row.book === first.book && row.pdfPage === first.pdfPage)) geometry.sourcePdfSha256 = hash;
    const frame = copy.sourceFrames.find(row => row.book === first.book && row.pdfPage === first.pdfPage);
    frame.sourcePdfSha256 = hash;
  }],
  ['edge component counter altered without changing component records', copy => {
    const geometry = copy.geometries.find(row => Object.values(row.scan.edges).some(edge => edge.componentCountLt254 > 0));
    const edge = Object.values(geometry.scan.edges).find(row => row.componentCountLt254 > 0);
    edge.componentCountLt254 = 0;
  }],
  ['usage candidate flag disagrees with its linked geometry scan', copy => {
    const usage = copy.usages.find(row => row.strongCrossingComponentCandidate);
    usage.strongCrossingComponentCandidate = false;
  }],
];

const componentIntegrityMutations = [
  ['component contact contradicts its side pixel counts', copy => {
    const edge = copy.geometries.find(row => Object.values(row.scan.edges).some(candidate => candidate.componentsLt254.length))
      .scan.edges;
    const component = Object.values(edge).find(candidate => candidate.componentsLt254.length).componentsLt254[0];
    component.contact = component.contact === 'crossing' ? 'inside-only' : 'crossing';
  }],
  ['component pixel count is negative', copy => {
    const edge = copy.geometries.find(row => Object.values(row.scan.edges).some(candidate => candidate.componentsLt254.length))
      .scan.edges;
    Object.values(edge).find(candidate => candidate.componentsLt254.length).componentsLt254[0].pixelCountLt254 = -1;
  }],
  ['component minimum gray is outside the scanned threshold', copy => {
    const edge = copy.geometries.find(row => Object.values(row.scan.edges).some(candidate => candidate.componentsLt254.length))
      .scan.edges;
    Object.values(edge).find(candidate => candidate.componentsLt254.length).componentsLt254[0].minGray = 254;
  }],
  ['component bounds escape the edge band', copy => {
    const edge = copy.geometries.find(row => Object.values(row.scan.edges).some(candidate => candidate.componentsLt254.length))
      .scan.edges;
    Object.values(edge).find(candidate => candidate.componentsLt254.length).componentsLt254[0].boundsPx[0] = -1;
  }],
  ['geometry candidate summary disagrees with edge components', copy => {
    copy.geometries.find(row => row.scan.strongCrossingComponentCandidate).scan.strongCrossingComponentCandidate = false;
  }],
  ['frame dimensions disagree with linked geometry bounds', copy => {
    copy.sourceFrames[0].rasterDimensionsPx[0]++;
  }],
  ['duplicate frame with adjusted counter', copy => {
    copy.sourceFrames.push(structuredClone(copy.sourceFrames[0]));
    copy.counts.sourcePagesRendered++;
  }],
];

test('the frozen historical catalog universe retains3069 uses and1284 source windows', () => {
  const report = buildHistoricalSourceRasterCoverage({
    snapshotPath: 'research/source-audit-batch5-raster-boundary-before-source-repairs.json.gz',
    livePath: 'tests/fixtures/source-raster-live-b90d317-before.json.gz',
  });
  assert.deepEqual(report.validation, {valid: true, errors: []});
  assert.equal(report.runMode.status, 'historical-sealed-diagnostics-only');
  assert.equal(report.liveUniverse.regionUsages, 3069);
  assert.equal(report.geometries.length, 1284);
  assert.equal(report.currentCandidateCounts.sourcePagesRendered, 229);
  assert.deepEqual(report.currentCandidateCounts, historicalSnapshot.counts);
  assert.equal(report.semanticPass, false);
});

test('the active pointer snapshot covers the complete actual current catalog universe', () => {
  const report = buildSourceRasterCoverage(snapshot, live);
  assert.deepEqual(report.validation, {valid: true, errors: []});
  assert.equal(report.liveUniverse.regionUsages, live.usages.length);
  const pdfFrameUsages=live.usages.filter(row=>row.sourceKind==='pdf'||row.sourceKind===undefined);
  assert.equal(report.currentCandidateCounts.sourcePagesRendered, new Set(pdfFrameUsages.map(row => `${row.book}:${row.pdfPage}`)).size);
  assert.equal(pdfFrameUsages.length, snapshot.counts.assessedUsages);
  assert.equal(live.usages.length, pdfFrameUsages.length + snapshot.counts.notAssessableUsages);
  assert.deepEqual(report.currentCandidateCounts, snapshot.counts);
  assert.equal(report.semanticPass, false);
});

test('the frozen released Jo snapshot preserves its exact seven-use extension and source windows', () => {
  assert.equal(releasedJoSnapshot.usages.length,priorJoSearchSnapshot.usages.length+7);
  assert.deepEqual(releasedJoSnapshot.sourceFrames,priorJoSearchSnapshot.sourceFrames);
  assert.deepEqual(releasedJoSnapshot.usages.slice(0,priorJoSearchSnapshot.usages.length),priorJoSearchSnapshot.usages);
  assert.deepEqual(releasedJoSnapshot.geometries.map(({uses,...row})=>row),priorJoSearchSnapshot.geometries.map(({uses,...row})=>row));
  assert.equal(releasedJoSnapshot.geometries.length,releasedJoSnapshot.counts.uniqueImageGeometryBindings);
});

test('the Version29 V1 usage universe stays explicit historical evidence',()=>{
 assert.equal(createHash('sha256').update(dmg175UniverseV1Bytes).digest('hex'),'c5162dd3f52982b223fea95a9bdef0f0654cc2f03982acaafb2981e34aa7d56e');
 assert.equal(dmg175UniverseV1.inputs.dataSha256,'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d');
 assert.equal(dmg175UniverseV1.inputs.catalogSnapshotSha256,'607ae98a5215dd46a2ff2b0cee4867fc02e4bb865900be872071c5b4a5c56a9d');
 assert.equal(dmg175UniverseV1.counts.activeUsageRows,45);
 assert.equal(dmg175UniverseV1.counts.activeCatalogs,7);
});

test('decimal rational half-up keeps the recorded DMG p.19 boundary and handles ties around both signs and frame origins',()=>{
 const actualPdfBounds=[21.24,74.27,288.43,133.08],actualOrigin=[0,0];
 assert.deepEqual(actualPdfBounds.map((point,index)=>roundHalfUpRasterPixel(point,300,actualOrigin[index%2])),[89,309,1202,555]);
 assert.deepEqual([
  roundHalfUpRasterPixel(21.239999999999,300,0),roundHalfUpRasterPixel(21.24,300,0),roundHalfUpRasterPixel(21.240000000001,300,0),
  roundHalfUpRasterPixel(-0.360000000001,300,0),roundHalfUpRasterPixel(-0.36,300,0),roundHalfUpRasterPixel(-0.359999999999,300,0),
  roundHalfUpRasterPixel(1.799999999999,300,5),roundHalfUpRasterPixel(1.8,300,5),roundHalfUpRasterPixel(1.800000000001,300,5),
  roundHalfUpRasterPixel(0.119999999999,300,-2),roundHalfUpRasterPixel(0.12,300,-2),roundHalfUpRasterPixel(0.120000000001,300,-2),
  roundHalfUpRasterPixel(-0.360000000001,300,5),roundHalfUpRasterPixel(-0.36,300,5),roundHalfUpRasterPixel(-0.359999999999,300,5),
 ],[88,89,89,-2,-1,-1,2,3,3,2,3,3,-7,-6,-6]);
 assert.equal(roundHalfUpRasterPixel(1e-7,360000000,0),1,'shortest exponential JSON number form retains an exact positive half tie');
 assert.equal(roundHalfUpRasterPixel(-1e-7,360000000,0),0,'negative half tie matches floor(x + 0.5) semantics');
});

test('the reconstructed Version29 pre-fix mapper preserves its exact two historical rows and old failure evidence',()=>{
 assert.equal(createHash('sha256').update(dmg175MapperBeforeBytes).digest('hex'),'5f253065ab442a67ca1d0d7467226b30685c9bc6a6d2f7840a495d90c2186f98');
 assert.equal(createHash('sha256').update(dmg175MapperBefore.beforeCapture.helperSource).digest('hex'),dmg175MapperBefore.beforeCapture.helperSha256);
 assert.equal(dmg175MapperBefore.captureMode,'retrospective-reconstruction');
 assert.equal(dmg175MapperBefore.actualPreFixCapture,false);
 assert.equal(dmg175MapperBefore.reconstructedFromCurrentSource,true);
 assert.equal(dmg175MapperBefore.sourceFixtureSha256,'130e8413219bd689cbd4734783ca9d7433496e473af7e99e6f1b1f73d6eec0ff');
 assert.equal(dmg175MapperBefore.beforeCapture.liveUniverse.usages.length,3132);
 const oldRows=dmg175MapperBefore.beforeCapture.liveUniverse.usages.filter(row=>row.sourceKind==='supplemental-image');
 assert.deepEqual(oldRows.map(row=>row.regionId).sort(),['dmg-175-level-others-context-5aa02e91e35c4c28','dmg-175-party-table-context-78c4c383c38c7d10']);
 assert.ok(oldRows.every(row=>row.printedPage===undefined));
 const historicalTuples=[
  ['rules','encounter-types','sourceExcerpts','scans/verified/rules-encounter-types.json','dmg-175-party-table-context-78c4c383c38c7d10','DMG',undefined,null,'78c4c383c38c7d100a9e66bec4f36de1fdb9453d6e44d1eec53120e849a36e89','supplemental-image','dmg175-user-confirmed-supplement','e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7','7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'],
  ['rules','encounter-types','sourceExcerpts','scans/verified/rules-encounter-types.json','dmg-175-level-others-context-5aa02e91e35c4c28','DMG',undefined,null,'5aa02e91e35c4c28152caccd947096943b74889b8596376cb86cb0c7170291b8','supplemental-image','dmg175-user-confirmed-supplement','e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7','7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'],
 ];
 assert.deepEqual(oldRows.map(dmg175Tuple).sort((a,b)=>String(a[4]).localeCompare(String(b[4]))),historicalTuples.sort((a,b)=>String(a[4]).localeCompare(String(b[4]))),'the sealed reconstructed historical rows remain exact and untyped by printedPage');
 assert.ok(dmg175MapperBefore.beforeCapture.reportedPipelineFailure.errors.includes('Not-assessable usages must be exactly the live typed DMG p.175 supplemental-image rows with the approved unassessed reason.'));
 assert.ok(dmg175MapperBefore.beforeCapture.reportedPipelineFailure.errors.includes('A supplemental raster usage has an invalid typed source identity.'));
 assert.equal(dmg175MapperBefore.afterFix.sourceRasterCandidateValidation.valid,true);
 assert.equal(dmg175MapperBefore.afterFix.sourceRasterCandidateCounts.regionUsages,3132);
 assert.equal(dmg175MapperBefore.afterFix.sourceRasterCandidateCounts.notAssessableUsages,2);
 assert.equal(dmg175MapperBefore.afterFix.sourceRasterCandidateCounts.assessedUsages,3130);
});

test('the current H+MM raster universe retains the exact historical H 45-use supplement universe',()=>{
 const currentInputs=readMmTreasureCurrentSourceInputs();
 const cohort=assertMmTreasureCurrentSourceCohort(currentInputs);
 const mmFixture=JSON.parse(readFileSync(new URL('./fixtures/mm-treasure-current-m1-cohort-v1.json',import.meta.url),'utf8'));
 assert.equal(cohort.sourceCommit,mmFixture.sourceEpoch.sourceCommit);
 assert.equal(cohort.sourceTree,mmFixture.sourceEpoch.sourceTree);
 assert.equal(createHash('sha256').update(hirelingsCurrentFixtureBytes).digest('hex'),'62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f');
 const sourceRows=sourceDerivedDmg175UsageRows();
 const supplemental=live.usages.filter(row=>row.sourceKind==='supplemental-image');
 const pdfFrameUsages=live.usages.filter(row=>row.sourceKind==='pdf'||row.sourceKind===undefined);
 assert.equal(live.dataSha256,currentInputs.rawInputs['dist/data.json'],'the live raster mapper follows the complete current H+MM data input');
 assert.equal(live.catalogCount,1084,'the live raster mapper includes the two MM-era catalogs');
 assert.deepEqual(sortedDmg175Tuples(sourceRows),sortedDmg175Tuples(dmg175Universe.expectedUsages));
 assert.deepEqual(sortedDmg175Tuples(supplemental),sortedDmg175Tuples(sourceRows),'live native mapping equals the independently joined current closed catalog universe');
 assert.equal(dmg175Universe.counts.activeUsageRows,45);assert.equal(dmg175Universe.counts.activeCatalogs,7);assert.equal(dmg175Universe.counts.activeDistinctRegionIds,34);
 assert.equal(supplemental.length,dmg175Universe.counts.activeUsageRows);assert.equal(pdfFrameUsages.length,4072);
 assert.equal(live.usages.length,pdfFrameUsages.length+supplemental.length);
 assert.deepEqual({regionUsages:live.usages.length,pdfFrameUsages:pdfFrameUsages.length,supplementalImageUsages:supplemental.length},{regionUsages:4117,pdfFrameUsages:4072,supplementalImageUsages:45});
});

test('typed DMG 175 supplemental rows stay in the raster denominator as explicit unassessable image frames',()=>{
 const copy=structuredClone(snapshot),liveCopy={...live,usages:structuredClone(live.usages)};
 const reason='Supplemental source-image frame is retained in the usage denominator but is not part of the current PDF-raster geometry assessment.';
 let ordinal=Math.max(0,...copy.usages.map(row=>row.usageOrdinal),...(copy.notAssessableUsages||[]).map(row=>row.usageOrdinal));
 const existing=new Set(copy.notAssessableUsages.map(row=>`${row.catalog}:${row.regionId}`));
 for(const region of live.usages.filter(row=>row.sourceKind==='supplemental-image'))if(!existing.has(`${region.catalog}:${region.regionId}`))copy.notAssessableUsages.push({...region,usageOrdinal:++ordinal,notAssessableReason:reason});
 const supplemental={collection:'rules',itemId:'synthetic-dmg175-supplement',binding:'sourceExcerpts',catalog:'scans/verified/rules-synthetic-dmg175-supplement.json',regionId:'dmg175-test-region',book:'DMG',printedPage:175,pdfPage:null,imageSha256:'c'.repeat(64),sourceKind:'supplemental-image',sourceArtifactId:'dmg175-user-confirmed-supplement',sourceArtifactSha256:'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7',sourcePdfSha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'};
 const synthetic={...supplemental,usageOrdinal:++ordinal,notAssessableReason:reason};copy.notAssessableUsages.push(synthetic);liveCopy.usages.push(supplemental);
 const all=[...copy.usages,...copy.notAssessableUsages];copy.inputs.distDataSha256=live.dataSha256;copy.inputs.catalogSnapshotSha256=live.catalogSnapshotSha256;copy.inputs.catalogCount=live.catalogCount;
 copy.counts.regionUsages=all.length;copy.counts.uniqueImages=new Set(all.map(row=>row.imageSha256)).size;copy.counts.regionUsagesByBook=Object.fromEntries([...new Set(all.map(row=>row.book))].sort().map(book=>[book,all.filter(row=>row.book===book).length]));copy.counts.notAssessableUsages=copy.notAssessableUsages.length;copy.counts.assessedUsages=copy.usages.length;
 const report=buildSourceRasterCoverage(copy,liveCopy);assert.equal(report.validation.valid,false);assert.ok(report.validation.errors.some(error=>error.includes('Caller snapshot differs from the repository-pinned active current snapshot.')));assert.equal(report.liveUniverse.regionUsages,live.usages.length);const supplementalCount=live.usages.filter(row=>row.sourceKind==='supplemental-image').length;assert.deepEqual(report.sourceIdentityCoverage,{pdfFrameUsages:live.usages.length-supplementalCount,supplementalImageUsages:supplementalCount,supplementalImageUsagesNotAssessed:supplementalCount});
 for(const mutate of [row=>row.sourceArtifactSha256='a'.repeat(64),row=>row.notAssessableReason='unreviewed',row=>row.pdfPage=176,row=>delete row.printedPage]){const bad=structuredClone(copy);mutate(bad.notAssessableUsages.at(-1));assert.equal(buildSourceRasterCoverage(bad,liveCopy).validation.valid,false);}
});

test('sealed historical CLI diagnostics are explicit and cannot satisfy current --check', () => {
  const snapshotPath = 'research/source-audit-batch5-raster-boundary-before-source-repairs.json.gz';
  const livePath = 'tests/fixtures/source-raster-live-b90d317-before.json.gz';
  assert.throws(() => runSourceRasterCoverage([
    '--historical-diagnostics', snapshotPath, '--historical-live', livePath,
    '--check', '--output', join(tmpdir(), 'source-raster-historical-check-forbidden.json'),
  ]), /cannot be used with current --check/);
  assert.throws(() => runSourceRasterCoverage([
    '--snapshot', snapshotPath, '--check', '--output', join(tmpdir(), 'source-raster-historical-snapshot-check-forbidden.json'),
  ]), /must equal the repository-pinned active current snapshot/);
  const cliDir = mkdtempSync(join(tmpdir(), 'source-raster-historical-cli-'));
  try {
    const output = join(cliDir, 'historical-report.json');
    const cliResult = runSourceRasterCoverage([
      '--historical-diagnostics', snapshotPath, '--historical-live', livePath, '--output', output,
    ]);
    assert.deepEqual(cliResult.validation, {valid: true, errors: []});
    assert.equal(cliResult.runMode.status, 'historical-sealed-diagnostics-only');
    assert.equal(JSON.parse(readFileSync(output, 'utf8')).runMode.status, 'historical-sealed-diagnostics-only');
  } finally {
    rmSync(cliDir, {recursive: true, force: true});
  }
  const currentAsHistorical = buildHistoricalSourceRasterCoverage({
    snapshotPath: 'research/source-raster-boundary-current-a46-frame-guard-v2.json.gz',
    livePath,
  });
  assert.equal(currentAsHistorical.runMode.status, 'historical-sealed-diagnostics-only');
  assert.equal(currentAsHistorical.semanticPass, false);
  assert.equal(currentAsHistorical.validation.valid, false);
  assert.throws(() => buildHistoricalSourceRasterCoverage({
    snapshotPath: 'tests/fixtures/source-frame-forged-history-snapshot-before.json.gz',
    livePath,
  }), /not byte-identical to a sealed repository artifact/);

  const fakeRoot = mkdtempSync(join(tmpdir(), 'source-raster-forged-seals-'));
  const forgedSnapshot = structuredClone(historicalSnapshot);
  forgedSnapshot.scope = 'forged self-sealed current-looking report';
  const forgedSnapshotPath = join(fakeRoot, 'source-raster-boundary-forged.json.gz');
  const forgedLivePath = join(fakeRoot, 'source-raster-live-forged.json.gz');
  writeFileSync(forgedSnapshotPath, gzipSync(Buffer.from(JSON.stringify(forgedSnapshot))));
  writeFileSync(forgedLivePath, readFileSync(new URL('./fixtures/source-raster-live-b90d317-before.json.gz', import.meta.url)));
  const forgedManifest = {seals: [
    {path: 'research/source-raster-boundary-forged.json.gz', sha256: createHash('sha256').update(readFileSync(forgedSnapshotPath)).digest('hex')},
    {path: 'tests/fixtures/source-raster-live-forged.json.gz', sha256: createHash('sha256').update(readFileSync(forgedLivePath)).digest('hex')},
  ]};
  writeFileSync(join(fakeRoot, 'citation-evidence-seals.json'), JSON.stringify(forgedManifest));
  try {
    assert.throws(() => buildHistoricalSourceRasterCoverage({
      repoRoot: fakeRoot, snapshotPath: forgedSnapshotPath, livePath: forgedLivePath,
    }), /not byte-identical to a sealed repository artifact/);
  } finally {
    rmSync(fakeRoot, {recursive: true, force: true});
  }
});

test('dropping uses cannot claim complete coverage even when reported counts and current hashes are retained', () => {
  for (const keep of [0, snapshot.usages.length - 1]) {
    const incomplete = structuredClone(snapshot);
    incomplete.usages = incomplete.usages.slice(0, keep);
    incomplete.counts.regionUsages = keep;
    incomplete.counts.assessedUsages = keep;
    const report = buildSourceRasterCoverage(incomplete, live);
    assert.equal(report.validation.valid, false);
    assert.ok(report.validation.errors.some(error => error.includes('Caller snapshot differs from the repository-pinned active current snapshot.')));
    assert.equal(report.currentCandidateCounts, null);
    assert.equal(report.snapshotCounts.regionUsages, snapshot.counts.regionUsages, 'the report retains only the repository-pinned current snapshot counts');
  }
});

test('same-count identity substitutions, broken frame links and claimed semantic clearance are rejected', () => {
  for (const change of [
    copy => { copy.usages[0].regionId = 'unrelated'; },
    copy => { copy.usages[0].geometryId = 'missing'; },
    copy => { copy.geometries[0].sourceFrameRawGraySha256 = '0'.repeat(64); },
    copy => { copy.geometries[0].scan.semanticReviewStatus = 'confirmed'; },
  ]) {
    const copy = structuredClone(snapshot);
    change(copy);
    assert.equal(buildSourceRasterCoverage(copy, live).validation.valid, false);
  }
});

test('stale input hashes retain historical evidence without presenting its candidates as current', () => {
  const report = buildSourceRasterCoverage(snapshot, {...live, catalogSnapshotSha256: '0'.repeat(64)});
  assert.equal(report.validation.valid, false);
  assert.equal(report.currentCandidateCounts, null);
  assert.deepEqual(report.snapshotCounts, snapshot.counts);
  assert.equal(report.semanticPass, false);
});

test('the sealed pre-fix checker accepts every coordinated mutation used as a regression', () => {
  for (const [name, mutate] of coordinatedMutations) {
    const copy = structuredClone(historicalSnapshot);
    mutate(copy);
    assert.equal(buildLegacyCoverage(copy, historicalLive).validation.valid, true, `sealed checker should reproduce prior acceptance: ${name}`);
  }
});

test('coordinated omissions, orphan evidence, hash substitutions and altered metrics are rejected', () => {
  for (const [name, mutate] of coordinatedMutations) {
    const copy = structuredClone(snapshot);
    mutate(copy);
    const report = buildSourceRasterCoverage(copy, live);
    assert.equal(report.validation.valid, false, name);
    assert.equal(report.currentCandidateCounts, null, name);
    if (name.startsWith('all live rows')) {
      assert.equal(report.notAssessableUsages.length, snapshot.notAssessableUsages.length);
      assert.ok(report.notAssessableUsages.length < live.usages.length, 'only the trusted active snapshot is reported');
    }
  }
});

test('edge components, candidate flags, band bounds and frame geometry are internally consistent', () => {
  for (const [name, mutate] of componentIntegrityMutations) {
    const copy = structuredClone(snapshot);
    mutate(copy);
    const report = buildSourceRasterCoverage(copy, live);
    assert.equal(report.validation.valid, false, name);
    assert.equal(report.currentCandidateCounts, null, name);
  }
});

test('the public current API refuses unpinned synthetic source-window snapshots', () => {
  const {snapshot: windows, live: windowUses} = windowBindingFixture;
  assert.deepEqual(buildBeforeWindowBindingCoverage(windows, windowUses).validation, windowBindingFixture.beforeValidation);

  const distinct = buildSourceRasterCoverage(windows, windowUses);
  assert.equal(distinct.validation.valid, false);
  assert.ok(distinct.validation.errors.some(error => error.includes('Caller snapshot differs from the repository-pinned active current snapshot.')));
  assert.equal(distinct.currentCandidateCounts, null);
  assert.equal(distinct.semanticPass, false);

  const duplicate = structuredClone(windows);
  for (const field of ['boundsPdfPagePointsLTRB', 'boundsRasterPixelsLTRB', 'scan']) {
    duplicate.geometries[1][field] = structuredClone(duplicate.geometries[0][field]);
  }
  const repeated = buildSourceRasterCoverage(duplicate, windowUses);
  assert.equal(repeated.validation.valid, false);
  assert.ok(repeated.validation.errors.some(error => error.includes('Caller snapshot differs from the repository-pinned active current snapshot.')));
  assert.equal(repeated.currentCandidateCounts, null);
});
