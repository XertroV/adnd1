import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {buildSystemicInventory, projectVisualCoverageSummary} from '../tools/citation-systemic-inventory.mjs';
import {loadRasterSnapshotInput} from '../tools/source-raster-coverage.mjs';

const root = new URL('../', import.meta.url), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const image = Buffer.from('historical visual fixture');
const data = {equipment:[{id:'historical-fixture',name:'Historical fixture',book:'PHB',pages:[35],sourceExcerpts:{catalog:'scans/verified/historical-fixture.json'}}]};
const template = JSON.parse(readFileSync(new URL('../dist/scans/verified/equipment-phb-banded-mail.json', import.meta.url)));
const catalog = {...template,itemId:'historical-fixture',regions:[{...template.regions[0],id:'historical-fixture-region',image:'historical-fixture.png',sha256:sha(image)}]};
const catalogBytes = Buffer.from(JSON.stringify(catalog));
const geometry = {inputDataSha256:sha(JSON.stringify(data)),sourcePdfSha256:{PHB:catalog.sources.PHB.sha256},catalogSha256:{'scans/verified/historical-fixture.json':sha(catalogBytes)},usages:[],candidates:[]};
const geometryBytes = Buffer.from(JSON.stringify(geometry));
const files = new Map([['dist/scans/verified/historical-fixture.json',catalogBytes],['dist/scans/verified/historical-fixture.png',image],['research/source-visual-audit-release.json',geometryBytes]]);
const historicalRead = path => {if(!files.has(path))throw Error(`fixture has no ${path}`);return files.get(path);};

test('the actual generated before report preserved the baseline/current visual denominator substitution', () => {
  const before=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-frame-systemic-visual-caller-before.json.gz',import.meta.url))));
  const historical=before.reports['citation-systemic-baseline.json'];
  assert.equal(historical.selectedCatalogRegionDenominator,2564);
  assert.equal(historical.sourceVisualCoverage.selectedRegionUsageCount,3333);
  assert.equal(historical.sourceVisualCoverage.totals.regionUsages,3412);
  assert.equal(historical.sourceFrameValidationPresent,false);
  assert.equal(sha(before.code.utf8),before.code.sha256);
});

test('historical systemic visual diagnostics retain their reader, data hash, geometry and denominators', () => {
  const report=buildSystemicInventory(data,historicalRead,{source:'git-baseline',commit:'historical-fixture',includeVisual:true});
  const visual=report.sourceVisualCoverage;
  assert.equal(visual.available,true);
  assert.equal(visual.inputDataSha256,sha(JSON.stringify(data)));
  assert.equal(visual.inputDataSha256,report.input.sha256);
  assert.equal(report.selectedCatalogRegions.denominator,1);
  assert.equal(visual.selectedRegionUsageCount,1);
  assert.equal(visual.totals.regionUsages,1);
  assert.equal(visual.geometrySnapshotReference.path,'research/source-visual-audit-release.json');
  assert.equal(visual.geometrySnapshotReference.sha256,sha(geometryBytes));
  assert.equal(visual.sourceFrameValidation.valid,false,'historical diagnostics have no current-frame approval');
});

test('the current systemic visual report uses the exact active geometry and phase-specific data', () => {
  const raw=readFileSync(new URL('../dist/data.json',import.meta.url)),currentData=JSON.parse(raw);
  const selected=loadRasterSnapshotInput();
  const report=buildSystemicInventory(currentData,path=>readFileSync(new URL(path,root)),{source:'working-tree',rawDataFileSha256:sha(raw),includeVisual:true});
  const visual=report.sourceVisualCoverage;
  assert.equal(visual.available,true);
  assert.equal(visual.inputDataSha256,report.input.sha256);
  assert.equal(visual.inputDataSha256,sha(JSON.stringify(currentData)));
  assert.equal(visual.selectedRegionUsageCount,report.selectedCatalogRegions.denominator);
  assert.equal(visual.totals.regionUsages,JSON.parse(selected.geometry.bytes).usages.length);
  assert.equal(visual.geometrySnapshotReference.path,selected.geometry.path);
  assert.equal(visual.geometrySnapshotReference.sha256,selected.geometry.sha256);
  assert.equal(visual.sourceFrameValidation.valid,true);
});

test('a current systemic call cannot certify historical toy data or discard failed validation', () => {
  const report=buildSystemicInventory(data,historicalRead,{source:'working-tree',includeVisual:true});
  assert.equal(report.sourceVisualCoverage.available,false);
  assert.equal(report.sourceVisualCoverage.sourceFrameValidation.valid,false);
  assert.match(report.sourceVisualCoverage.error,/Current source visual validation failed/);
  const projected=projectVisualCoverageSummary({usages:[],sourceFrameValidation:{valid:false,errors:['diagnostic-only']}},null,{available:false});
  assert.deepEqual(projected.sourceFrameValidation,{valid:false,errors:['diagnostic-only']});
});
