import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {containsContext,focusCoversEvidence,sourceRect} from '../tools/citation-context-contract.mjs';

const read=p=>JSON.parse(readFileSync(p,'utf8'));
const calibration=read('research/ua28-geometry-focus-calibration.json');
const catalog=read('dist/scans/verified/equipment-ua-aklys-hurled.json');
const requirement=read('research/citation-context-contracts.json').requirements.find(x=>x.id==='equipment:ua-aklys-hurled:ua28-missile-table-context');
const targeted=[
  'ua-aklys-hurled-ua28-thrown',
  'ua28-missile-notes',
  'ua-28-141383fc8196129e',
  'ua-28-a4aceb548ae4a6c6',
  'ua-28-26806da269f6f9ce',
  'ua-aklys-range-note',
];

function pointRectToNormalized([x0,y0,x1,y1],[pageW,pageH]){
  return [x0/pageW,y0/pageH,(x1-x0)/pageW,(y1-y0)/pageH];
}
function cropRelative([x0,y0,x1,y1],crop){
  const [cx0,cy0,cx1,cy1]=crop;
  return [(x0-cx0)/(cx1-cx0),(y0-cy0)/(cy1-cy0),(x1-x0)/(cx1-cx0),(y1-y0)/(cy1-cy0)];
}

test('UA p.28 Aklys context uses the exact reviewed complete-table crop and stable IDs',()=>{
  assert.ok(requirement);
  const crop=calibration.crop;
  assert.deepEqual(crop.requestedAndEffectiveBoundsPoints,[15,12,580,375]);
  assert.deepEqual(crop.pixels,[1130,726]);
  assert.equal(crop.sha256,'f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b');
  const [x0,y0,x1,y1]=crop.requestedAndEffectiveBoundsPoints;
  const [pageW,pageH]=calibration.source.pageBoundsPoints.slice(2);
  const expected=[x0/pageW,y0/pageH,(x1-x0)/pageW,(y1-y0)/pageH];
  assert.deepEqual(requirement.requiredBounds.values,expected);
  const bytes=readFileSync(`dist/scans/verified/${crop.image}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),crop.sha256);
  const records=new Map(catalog.regions.map(region=>[region.id,region]));
  for(const id of targeted){
    const region=records.get(id);assert.ok(region,`stable region ${id} remains present`);
    assert.equal(region.image,crop.image,id);
    assert.equal(region.sha256,crop.sha256,id);
    assert.deepEqual(region.boundsPdfPoints,crop.requestedAndEffectiveBoundsPoints,id);
    assert.deepEqual([region.normalizedPageRect.x,region.normalizedPageRect.y,region.normalizedPageRect.width,region.normalizedPageRect.height],expected,id);
    assert.equal(region.verificationScope,'source-excerpt',id);
    assert.equal(containsContext(region.normalizedPageRect,expected),true,id);
  }
  assert.equal(catalog.regions.length,10,'the bounded repair keeps the catalog’s region inventory stable');
});

test('all six old narrow Aklys p.28 crops fail the complete-table extent',()=>{
  assert.equal(calibration.oldNarrowRegionFixtures.length,6);
  const [pageW,pageH]=calibration.source.pageBoundsPoints.slice(2);
  const required=calibration.crop.normalizedPageRect;
  for(const old of calibration.oldNarrowRegionFixtures){
    let oldCrop=old.normalizedPageRect;
    if(!oldCrop&&old.boundsPdfPoints)oldCrop=pointRectToNormalized(old.boundsPdfPoints,[pageW,pageH]);
    assert.ok(sourceRect(oldCrop),`old geometry is recorded for ${old.regionId}`);
    assert.equal(containsContext(oldCrop,required),false,`${old.regionId} did not contain the complete table, heading, and notes`);
  }
});

test('Aklys row, asterisk qualifier, shared range legend and AC note retain separate focus geometry',()=>{
  const cropBounds=calibration.crop.requestedAndEffectiveBoundsPoints;
  const cropArea=calibration.crop.normalizedPageRect;
  const [pageW,pageH]=calibration.source.pageBoundsPoints.slice(2);
  const ink=calibration.sourcePixelInkBoundsAt12pxPerPointThreshold170;
  const cases=[
    ['ua-aklys-hurled-ua28-thrown','aklysRow','aklys-row'],
    ['ua-aklys-range-note','asteriskQualifier','aklys-range-asterisk-note'],
    ['ua28-missile-notes','rateAndRangeLegend','fire-rate-and-range-legend'],
    ['ua28-missile-notes','armorClassAdjustmentNote','armor-class-adjustment-note'],
  ];
  const byId=new Map(catalog.regions.map(region=>[region.id,region]));
  for(const [regionId,inkKey,focusKey] of cases){
    const region=byId.get(regionId);assert.ok(region,regionId);
    const focusBounds=calibration.focuses.find(focus=>focus.id===focusKey).boundsPoints;
    const expectedFocus=cropRelative(focusBounds,cropBounds);
    assert.ok(region.focusRects.some(rect=>rect.every((value,i)=>Math.abs(value-expectedFocus[i])<1e-12)),`${regionId} retains ${focusKey}`);
    const requiredInk=pointRectToNormalized(ink[inkKey],[pageW,pageH]);
    assert.equal(focusCoversEvidence(cropArea,region.focusRects,[requiredInk]),true,`${regionId} focus covers its reviewed source ink`);
  }
  const contracts=new Map(catalog.fieldEvidenceContracts.map(contract=>[contract.fieldKey,contract]));
  const range=contracts.get('/fields/Range S ~1 M ~1 L (UA p.28)');
  assert.deepEqual(catalog.evidenceContextSets.find(set=>set.id==='ua28-aklys-range').orderedRegionIds,[
    'ua-aklys-hurled-ua28-thrown','ua-aklys-range-note','ua28-missile-notes',
  ]);
  assert.equal(range.contextSetId,'ua28-aklys-range');
  assert.match(range.status,/field-value-grade-separate/);
  for(const field of ['/fields/Rate of fire (UA p.28)','/fields/Hurled or missile weapon AC adjustments at short range (UA p.28)'])
    assert.match(contracts.get(field).status,/field-value-grade-separate/);
});

test('the historical 113-occurrence census keeps unreviewed outside consumers unresolved',()=>{
  const compressed=readFileSync('research/ua28-context-consumer-census.json.gz');
  const census=JSON.parse(gunzipSync(compressed).toString('utf8'));
  assert.equal(census.baseline.denominators.regionOccurrences,113);
  assert.equal(census.baseline.denominators.catalogFiles,33);
  assert.equal(census.disposition.reviewedOccurrences,6);
  assert.equal(census.disposition.unresolvedOccurrences,107);
  assert.equal(census.records.length,113);
  assert.equal(census.records.filter(row=>row.disposition==='repaired-reviewed-batch').length,6);
  assert.equal(census.records.filter(row=>row.disposition==='unresolved-outside-reviewed-batch').length,107);
  assert.ok(census.scope.includes('not automatically defects'));
});
