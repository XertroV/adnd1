// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assertHistoricalMmTestStage, authorizeHistoricalMmChildOutputs, mkdtempSync, readFileSync, rmSync} from '../research/class-mapping-history-v1/mm-replay-fs-source2-v3.mjs';
import {readFileSync as readCurrentFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {weaponOwnerIds} from './helpers/weapon-source-current-cohort.mjs';
import {assertUaSourceContextBindingCohort} from './helpers/ua-source-closed-v28-context.mjs';
import {readMmTreasureCurrentSourceInputsSource2,assertMmTreasureCurrentSourceCohort} from './helpers/class-mapping-historical-mm-test-inputs-source2-v2.mjs';
import {assertClassMappingCurrentSourceIdentity} from '../tools/class-mapping-current-source-gate-v2.mjs';
import {fileURLToPath} from 'node:url';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const currentLabelToolPath=fileURLToPath(new URL('../tools/source-target-label-audit.mjs',import.meta.url));
const historicalLabelToolPath=fileURLToPath(new URL('../research/class-mapping-history-v1/replay-tools/source-target-label-audit-source2-v1.mjs',import.meta.url));

test('fixed a29/0f2d historical label replay preserves its current-mode assertions under Source2 transport', () => {
  const outputDir = mkdtempSync('/tmp/source-target-label-audit-historical-');
  try {
    const replayStage=assertHistoricalMmTestStage();
    assert.equal(replayStage.historicalHead,'a29d72d5147c497addd9e46f54ea3f8222f6e9c2');
    assert.equal(replayStage.historicalSearchCjs.historicalS1.sourceCommit,'2d35138027f00c0740975e519dbb3a2b6df76d14');
    assert.equal(replayStage.historicalSearchCjs.historicalS1.sha256,'b9de11c725edbffaf069282a48930052a78b238e925c8acdb6c8db97b764052f');
    assert.equal(replayStage.historicalSearchCjs.currentSource2Summary.stage,'source2-body-native');
    const currentCohortSummary=assertMmTreasureCurrentSourceCohort(readMmTreasureCurrentSourceInputsSource2());
    assert.equal(currentCohortSummary.sourceCommit,'0f2d70a135e3ad486152bf00f21387d60a1a97ef');
    assert.equal(currentCohortSummary.sourceTree,'08010faf457df22cdb0a5ec35d2dcf79e622ade9');
    assert.equal(currentCohortSummary.owners,1064);
    assert.equal(currentCohortSummary.canonicalBindings,5731);
    const historicalArgs=['--current','--output-dir',outputDir,'--check'];
    const childEnv={...process.env,CLASS_MAPPING_MM_OUTPUT_SCOPES:authorizeHistoricalMmChildOutputs(historicalArgs)};
    execFileSync(process.execPath,[historicalLabelToolPath,...historicalArgs],{stdio:'pipe',env:childEnv});
    const summary = JSON.parse(readFileSync(join(outputDir, 'current-summary.json'), 'utf8'));
    const compressed = readFileSync(join(outputDir, 'current.json.gz'));
    const hash = createHash('sha256').update(compressed).digest('hex');
    assert.equal(hash, summary.fullReport.sha256);
    const report = JSON.parse(gunzipSync(compressed).toString('utf8'));
    assert.equal(report.denominator.contentRecords, 1064);
    assert.equal(report.denominator.routeRecords, 1064);
    assert.equal(report.denominator.primaryRouteRecords, 1059);
    assert.equal(report.denominator.auxiliaryRouteRecords, 5);
    assert.ok(report.entries.some(row=>row.owner?.collection==='rules'&&row.owner?.itemId==='phb-druid-mistletoe-spell-components'),'current collector includes the exact new Druid owner');
    assert.ok(report.entries.some(row=>row.owner?.collection==='rules'&&row.owner?.itemId==='mm-treasure-types-table'),'current collector includes the MM Treasure Types table owner');
    assert.ok(report.entries.some(row=>row.owner?.collection==='rules'&&row.owner?.itemId==='mm-treasure-type-use'),'current collector includes the MM treasure procedure owner');
    assert.equal(report.denominator.collections.matrices, 4);
    assert.equal(report.denominator.collections.progressionExplainer, 1);
    assert.equal(report.denominator.collectorTargets, report.entries.length);
    const bindings=JSON.parse(readFileSync('research/price-source-inventory.json')).fieldEvidenceBindings;
    const uaContexts=assertUaSourceContextBindingCohort(bindings);
    assert.equal(uaContexts.length,24);assert.equal(report.denominator.collectorTargets,currentCohortSummary.canonicalBindings,'the collector target count equals the pinned actual current canonical inventory');
    const targetIdentity=row=>JSON.stringify([row.collection,row.itemId,row.fieldPointer]);
    const expectedTargets=bindings.filter(row=>row.collection==='classes'&&row.fieldPointer.startsWith('/references/')).map(targetIdentity).sort();
    assert.equal(expectedTargets.length,25,'one old class reference and24 new context references');
    const currentTargets=report.entries.filter(row=>row.owner?.collection==='classes'&&row.fieldPointer?.startsWith('/references/')).map(row=>targetIdentity({...row.owner,fieldPointer:row.fieldPointer})).sort();
    assert.deepEqual(currentTargets,expectedTargets,'the old reference and all24 new region-context references have distinct correctly owned native collector targets');
    for(const [index,itemId]of weaponOwnerIds.entries())assert.equal(report.entries.filter(row=>row.owner?.collection==='rules'&&row.owner.itemId===itemId).length,[43,63][index]);
    for (const itemId of [
      'dmg-cleric-druid-monk-attack-matrix',
      'dmg-magic-user-illusionist-attack-matrix',
      'dmg-thief-assassin-attack-matrix',
    ]) {
      assert.ok(report.entries.some(row => row.owner?.collection === 'matrices' && row.owner?.itemId === itemId), `current collector omits ${itemId}`);
    }
    assert.ok(report.entries.filter(row=>row.owner?.collection==='equipment'&&row.owner?.itemId==='ua-jo-stick').length>=14,'current captions include all distinct Jo fields');
    assert.equal(report.denominator.currentBrowserRenderedControls, 'not-run');
    assert.equal(report.denominator.currentDistinctRenderedPayloads, 'not-assessed');
    assert.equal(report.categories.afterNumericOnlyCandidates, 0);
    assert.ok(report.entries.every(row => row.owner?.collection && row.owner?.itemId && row.sourceName));
    assert.ok(report.entries.every(row => row.afterLabel && (!row.fieldPointer || !/^\d+$/.test(row.afterLabel))));
  } finally {
    rmSync(outputDir, {recursive: true, force: true});
  }
});


test('the M3 current label producer binds physical data and viewer bytes to the direct Source2 proof',()=>{
  const currentSource2Identity=assertClassMappingCurrentSourceIdentity();
  assert.equal(currentSource2Identity.summary.stage,'source2-body-native');
  assert.equal(currentSource2Identity.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
  assert.equal(currentSource2Identity.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
  const sourceBody=currentSource2Identity.inputHashes.sourceBody;
  const dataBytes=readCurrentFileSync(new URL('../dist/data.json',import.meta.url));
  const viewerBytes=readCurrentFileSync(new URL('../dist/source-viewer.js',import.meta.url));
  const citationsBytes=readCurrentFileSync(new URL('../dist/citations.js',import.meta.url));
  assert.equal(sha(dataBytes),sourceBody['dist/data.json'],'actual Source2 data bytes are covered by the no-argument body proof');
  assert.equal(sha(viewerBytes),sourceBody['dist/source-viewer.js'],'actual Source2 viewer bytes are covered by the no-argument body proof');

  // Citations code remains an exact historical/S1 transport role, not a
  // Source2 body-map row. The Source2 FS stage proves its physical bytes still
  // match the pinned a29 replay manifest while keeping search roles distinct.
  const replayStage=assertHistoricalMmTestStage();
  assert.equal(replayStage.historicalHead,'a29d72d5147c497addd9e46f54ea3f8222f6e9c2');
  assert.equal(replayStage.historicalSearchCjs.historicalS1.sourceCommit,'2d35138027f00c0740975e519dbb3a2b6df76d14');
  assert.equal(replayStage.historicalSearchCjs.currentSource2Summary.sourceCommit,currentSource2Identity.summary.sourceCommit);
  const mmManifest=JSON.parse(readFileSync(new URL('../research/class-mapping-history-v1/mm-test-input-manifest-v6.json',import.meta.url),'utf8'));
  const citationsPin=mmManifest.files.find(row=>row.path==='dist/citations.js');
  assert.ok(citationsPin,'exact historical citations CJS pin is present');
  assert.equal(sha(citationsBytes),citationsPin.sha256,'physical citations bytes retain the historical/S1 role');

  const outputDir=mkdtempSync('/tmp/source-target-label-audit-current-source2-');
  try{
    execFileSync(process.execPath,[currentLabelToolPath,'--current','--output-dir',outputDir,'--check'],{stdio:'pipe'});
    const summary=JSON.parse(readCurrentFileSync(join(outputDir,'current-summary.json'),'utf8'));
    const compressed=readCurrentFileSync(join(outputDir,'current.json.gz'));
    const report=JSON.parse(gunzipSync(compressed).toString('utf8'));
    assert.equal(summary.fullReport.sha256,sha(compressed));
    assert.equal(report.artifactType,'current-data-source-viewer-target-label-audit');
    assert.equal(report.provenance.sourceDataSha256,sourceBody['dist/data.json']);
    assert.equal(report.provenance.viewerSha256,sourceBody['dist/source-viewer.js']);
    assert.equal(report.provenance.citationsSha256,citationsPin.sha256);
    assert.equal(summary.provenance.sourceDataSha256,sourceBody['dist/data.json']);
    assert.equal(summary.provenance.viewerSha256,sourceBody['dist/source-viewer.js']);
    assert.equal(report.denominator.collectorTargets,report.entries.length);
    assert.equal(report.denominator.currentBrowserRenderedControls,'not-run');
    assert.equal(report.denominator.currentDistinctRenderedPayloads,'not-assessed');
    assert.equal(report.categories.afterNumericOnlyCandidates,0);
  }finally{rmSync(outputDir,{recursive:true,force:true});}
});
