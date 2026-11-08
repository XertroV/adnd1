import test from 'node:test';
import {after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {buildSourceRasterCoverage, collectLiveRasterUniverse, loadRasterSnapshotInput} from '../tools/source-raster-coverage.mjs';

const snapshot = JSON.parse(gunzipSync(loadRasterSnapshotInput().bytes));
const historicalSnapshot = JSON.parse(gunzipSync(readFileSync(new URL('../research/source-audit-batch5-raster-boundary-before-source-repairs.json.gz', import.meta.url))));
const historicalLive = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-raster-live-b90d317-before.json.gz', import.meta.url)))).live;
const live = collectLiveRasterUniverse();
const releasedJoSnapshot=JSON.parse(gunzipSync(readFileSync(new URL('../research/source-raster-boundary-batch6-jo-search079-v1.json.gz',import.meta.url))));
const priorJoSearchSnapshot=JSON.parse(gunzipSync(readFileSync(new URL('../research/source-raster-boundary-batch6-search-cleric-post-pr34.json.gz',import.meta.url))));
const dmg175MapperBeforeBytes=readFileSync(new URL('./fixtures/source-raster-dmg175-live-mapper-reconstruction-v1.json.gz',import.meta.url));
const dmg175MapperBefore=JSON.parse(gunzipSync(dmg175MapperBeforeBytes));
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
  const report = buildSourceRasterCoverage(historicalSnapshot, historicalLive);
  assert.deepEqual(report.validation, {valid: true, errors: []});
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

test('the reconstructed pre-fix mapper omits page 175; the current live mapper carries both typed supplemental crops',()=>{
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
 assert.ok(dmg175MapperBefore.beforeCapture.reportedPipelineFailure.errors.includes('Not-assessable usages must be exactly the live typed DMG p.175 supplemental-image rows with the approved unassessed reason.'));
 assert.ok(dmg175MapperBefore.beforeCapture.reportedPipelineFailure.errors.includes('A supplemental raster usage has an invalid typed source identity.'));
 const supplemental=live.usages.filter(row=>row.sourceKind==='supplemental-image');
 const pdfFrameUsages=live.usages.filter(row=>row.sourceKind==='pdf'||row.sourceKind===undefined);
 assert.equal(supplemental.length,2);assert.equal(pdfFrameUsages.length,snapshot.counts.regionUsages-snapshot.counts.notAssessableUsages);
 assert.equal(live.usages.length,pdfFrameUsages.length+supplemental.length);
 assert.deepEqual(supplemental.map(row=>[row.regionId,row.book,row.printedPage,row.pdfPage,row.sourceArtifactId,row.sourceArtifactSha256,row.sourcePdfSha256]).sort((a,b)=>a[0].localeCompare(b[0])),[
  ['dmg-175-level-others-context-5aa02e91e35c4c28','DMG',175,null,'dmg175-user-confirmed-supplement','e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7','7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'],
  ['dmg-175-party-table-context-78c4c383c38c7d10','DMG',175,null,'dmg175-user-confirmed-supplement','e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7','7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'],
 ].sort((a,b)=>a[0].localeCompare(b[0])));
 assert.equal(dmg175MapperBefore.afterFix.sourceRasterCandidateValidation.valid,true);
 assert.equal(dmg175MapperBefore.afterFix.sourceRasterCandidateCounts.regionUsages,3132);
 assert.equal(dmg175MapperBefore.afterFix.sourceRasterCandidateCounts.notAssessableUsages,2);
 assert.equal(dmg175MapperBefore.afterFix.sourceRasterCandidateCounts.assessedUsages,3130);
});

test('typed DMG 175 supplemental rows stay in the raster denominator as explicit unassessable image frames',()=>{
 const copy=structuredClone(snapshot),liveCopy=structuredClone(live);
 const reason='Supplemental source-image frame is retained in the usage denominator but is not part of the current PDF-raster geometry assessment.';
 let ordinal=Math.max(0,...copy.usages.map(row=>row.usageOrdinal),...(copy.notAssessableUsages||[]).map(row=>row.usageOrdinal));
 const existing=new Set(copy.notAssessableUsages.map(row=>`${row.catalog}:${row.regionId}`));
 for(const region of live.usages.filter(row=>row.sourceKind==='supplemental-image'))if(!existing.has(`${region.catalog}:${region.regionId}`))copy.notAssessableUsages.push({...region,usageOrdinal:++ordinal,notAssessableReason:reason});
 const supplemental={collection:'rules',itemId:'synthetic-dmg175-supplement',binding:'sourceExcerpts',catalog:'scans/verified/rules-synthetic-dmg175-supplement.json',regionId:'dmg175-test-region',book:'DMG',printedPage:175,pdfPage:null,imageSha256:'c'.repeat(64),sourceKind:'supplemental-image',sourceArtifactId:'dmg175-user-confirmed-supplement',sourceArtifactSha256:'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7',sourcePdfSha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'};
 const synthetic={...supplemental,usageOrdinal:++ordinal,notAssessableReason:reason};copy.notAssessableUsages.push(synthetic);liveCopy.usages.push(supplemental);
 const all=[...copy.usages,...copy.notAssessableUsages];copy.inputs.distDataSha256=live.dataSha256;copy.inputs.catalogSnapshotSha256=live.catalogSnapshotSha256;copy.inputs.catalogCount=live.catalogCount;
 copy.counts.regionUsages=all.length;copy.counts.uniqueImages=new Set(all.map(row=>row.imageSha256)).size;copy.counts.regionUsagesByBook=Object.fromEntries([...new Set(all.map(row=>row.book))].sort().map(book=>[book,all.filter(row=>row.book===book).length]));copy.counts.notAssessableUsages=copy.notAssessableUsages.length;copy.counts.assessedUsages=copy.usages.length;
 const report=buildSourceRasterCoverage(copy,liveCopy);assert.deepEqual(report.validation,{valid:true,errors:[]});assert.equal(report.liveUniverse.regionUsages,live.usages.length+1);assert.deepEqual(report.sourceIdentityCoverage,{pdfFrameUsages:live.usages.length-2,supplementalImageUsages:3,supplementalImageUsagesNotAssessed:3});
 for(const mutate of [row=>row.sourceArtifactSha256='a'.repeat(64),row=>row.notAssessableReason='unreviewed',row=>row.pdfPage=176,row=>delete row.printedPage]){const bad=structuredClone(copy);mutate(bad.notAssessableUsages.at(-1));assert.equal(buildSourceRasterCoverage(bad,liveCopy).validation.valid,false);}
});

test('dropping uses cannot claim complete coverage even when reported counts and current hashes are retained', () => {
  for (const keep of [0, snapshot.usages.length - 1]) {
    const incomplete = structuredClone(snapshot);
    incomplete.usages = incomplete.usages.slice(0, keep);
    incomplete.counts.regionUsages = keep;
    incomplete.counts.assessedUsages = keep;
    const report = buildSourceRasterCoverage(incomplete, live);
    assert.equal(report.validation.valid, false);
    assert.ok(report.validation.errors.some(error => error.includes('multiset')));
    assert.equal(report.currentCandidateCounts, null);
    assert.equal(report.snapshotCounts.regionUsages, keep);
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
      assert.equal(report.notAssessableUsages.length, snapshot.usages.length);
      assert.ok(report.notAssessableUsages.length < live.usages.length, 'the snapshot counts assessed PDF uses, not later supplement usages');
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

test('the same image may bind distinct source windows while a repeated exact window is rejected', () => {
  const {snapshot: windows, live: windowUses} = windowBindingFixture;
  assert.deepEqual(buildBeforeWindowBindingCoverage(windows, windowUses).validation, windowBindingFixture.beforeValidation);

  const distinct = buildSourceRasterCoverage(windows, windowUses);
  assert.deepEqual(distinct.validation, {valid: true, errors: []});
  assert.equal(distinct.currentCandidateCounts.uniqueImages, 1);
  assert.equal(distinct.currentCandidateCounts.uniqueImageGeometryBindings, 2);
  assert.equal(distinct.semanticPass, false);

  const duplicate = structuredClone(windows);
  for (const field of ['boundsPdfPagePointsLTRB', 'boundsRasterPixelsLTRB', 'scan']) {
    duplicate.geometries[1][field] = structuredClone(duplicate.geometries[0][field]);
  }
  const repeated = buildSourceRasterCoverage(duplicate, windowUses);
  assert.equal(repeated.validation.valid, false);
  assert.ok(repeated.validation.errors.includes('Duplicate raster geometry binding.'));
  assert.equal(repeated.currentCandidateCounts, null);
});
