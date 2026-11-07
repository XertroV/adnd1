import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {containsContext,focusCoversEvidence,sourceRect} from '../tools/citation-context-contract.mjs';

const calibration=JSON.parse(readFileSync('research/geometry-focus-calibration.json','utf8'));
const crops=new Map(calibration.contextCrops.map(c=>[c.id,c]));
const cases=new Map(calibration.focusCases.map(c=>[c.id,c]));

function toNormalized(bounds,pageSize){
  const [x0,y0,x1,y1]=bounds,[width,height]=pageSize;
  return [x0/width,y0/height,(x1-x0)/width,(y1-y0)/height];
}
function cropOf(id){
  const crop=crops.get(id);assert.ok(crop,`missing crop ${id}`);
  const area=toNormalized(crop.effectiveBoundsPoints,crop.pageSizePoints);
  assert.ok(sourceRect(area),`invalid effective crop geometry ${id}`);
  return {record:crop,area};
}
function focusRelativeToCrop(bounds,crop){
  const [cx0,cy0,cx1,cy1]=crop.effectiveBoundsPoints;
  const [x0,y0,x1,y1]=bounds;
  return [(x0-cx0)/(cx1-cx0),(y0-cy0)/(cy1-cy0),(x1-x0)/(cx1-cx0),(y1-y0)/(cy1-cy0)];
}
function coverageFor(caseRecord,focusBounds){
  const {record:crop,area}=cropOf(caseRecord.cropId);
  const focuses=focusBounds.map(bounds=>focusRelativeToCrop(bounds,crop));
  const required=caseRecord.requiredEvidence.map(e=>toNormalized(e.boundsPoints,crop.pageSizePoints));
  return {result:focusCoversEvidence(area,focuses,required),focuses,required};
}
function fieldCoverage(caseRecord,focusBounds){
  const {record:crop,area}=cropOf(caseRecord.cropId);
  const focuses=focusBounds.map(bounds=>focusRelativeToCrop(bounds,crop));
  return caseRecord.requiredEvidence.map(e=>({id:e.id,covered:focusCoversEvidence(area,focuses,[toNormalized(e.boundsPoints,crop.pageSizePoints)])}));
}

test('all six context crops use actual page-clipped bounds and a valid normalized raster mapping',()=>{
  assert.equal(calibration.contextCrops.length,6);
  for(const crop of calibration.contextCrops){
    const [pageW,pageH]=crop.pageSizePoints;
    const [x0,y0,x1,y1]=crop.effectiveBoundsPoints;
    assert.ok(x0>=0&&y0>=0&&x1<=pageW&&y1<=pageH,`${crop.id} effective source rect is inside page`);
    assert.ok(sourceRect(toNormalized(crop.effectiveBoundsPoints,crop.pageSizePoints)),`${crop.id} normalized source rect is valid`);
    assert.deepEqual(crop.image.pixels,[Math.ceil((x1-x0)*2-1e-8),Math.ceil((y1-y0)*2-1e-8)],`${crop.id} expected 2 px/pt outward-rounded raster size`);
  }
  const p37=crops.get('phb37-weight-damage');
  assert.deepEqual(p37.requestedBoundsPoints,[23,177,580,745]);
  assert.equal(p37.effectiveBoundsPoints[2],p37.pageSizePoints[0]);
  assert.equal(sourceRect(toNormalized(p37.requestedBoundsPoints,p37.pageSizePoints)),null,'unclamped x=580 must not enter normalized geometry');
  assert.equal(p37.image.sha256,'a0447e9e609ad1191beda38a39a6f3673a0fb11bbfd72472f3f21df7f8445a31','effective clipping did not alter the candidate PNG bytes');
  assert.equal(p37.printedHeading,'WEIGHT AND DAMAGE BY WEAPON TYPE');
  assert.match(p37.scope,/Hurled Weapons and Missiles table is on printed p\.38\/PDF39/);
});

test('all focus rectangles are derived relative to the effective crop, including the clipped PHB p.37 edge',()=>{
  assert.equal(calibration.focusCases.length,9);
  for(const row of calibration.focusCases){
    const {record:crop}=cropOf(row.cropId);
    const check=(bounds,expected,label)=>{
      const actual=focusRelativeToCrop(bounds,crop);
      assert.equal(actual.length,expected.length,`${row.id} ${label}`);
      actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<1e-12,`${row.id} ${label} coordinate ${index}`));
    };
    check(row.correctedFocusBoundsPoints,row.correctedFocusImageXYWH,'corrected image-relative xywh');
    if(row.priorProposedFocusBoundsPoints)check(row.priorProposedFocusBoundsPoints,row.priorProposedFocusImageXYWH,'prior image-relative xywh');
    if(row.priorBadFocusBoundsPoints)check(row.priorBadFocusBoundsPoints,row.priorBadFocusImageXYWH,'prior bad image-relative xywh');
  }
});

test('PHB p.37 and p.38 contexts retain the table headings, units, and applicable notes',()=>{
  const p37=crops.get('phb37-weight-damage');
  const p37Area=toNormalized(p37.effectiveBoundsPoints,p37.pageSizePoints);
  assert.equal(containsContext(p37Area,toNormalized(p37.requiredHeaderBoundsPoints,p37.pageSizePoints)),true);
  const p38=crops.get('phb38-general-data');
  const p38Area=toNormalized(p38.effectiveBoundsPoints,p38.pageSizePoints);
  for(const bounds of [p38.requiredHeaderBoundsPoints,p38.requiredTableNotesBoundsPoints])
    assert.equal(containsContext(p38Area,toNormalized(bounds,p38.pageSizePoints)),true);
});

test('historical PHB p.38 Sword Long proposal fails the AC 8–10 cells; corrected row covers AC 2–10',()=>{
  const row=cases.get('phb-long-sword-to-hit-adjustments');
  assert.ok(row);
  assert.deepEqual(row.priorBadFocusBoundsPoints,[10.8,420,449,429.2]);
  const misses=fieldCoverage(row,[row.priorBadFocusBoundsPoints]).filter(f=>!f.covered).map(f=>f.id);
  assert.deepEqual(misses,row.badProposalMissingFields);
  assert.deepEqual(misses,['AC8','AC9','AC10']);
  assert.equal(coverageFor(row,[row.priorBadFocusBoundsPoints]).result,false);
  assert.equal(coverageFor(row,[row.correctedFocusBoundsPoints]).result,true);
  assert.equal(row.correctedFocusBoundsPoints[2]>544.45,true,'corrected source focus extends beyond the AC10 +2 source word box');
  assert.deepEqual(row.requiredEvidence.filter(e=>/^AC/.test(e.id)).map(e=>e.id),['AC2','AC3','AC4','AC5','AC6','AC7','AC8','AC9','AC10']);
});

test('PHB normal-arrow price focus includes the complete currency punctuation',()=>{
  for(const id of ['phb-arrow-normal-single-price','phb-arrow-normal-dozen-price']){
    const row=cases.get(id);assert.ok(row);
    const old=fieldCoverage(row,[row.priorProposedFocusBoundsPoints]);
    assert.equal(old.find(f=>f.id==='label').covered,true,id);
    assert.equal(old.find(f=>f.id==='amountAndCurrency').covered,false,id);
    assert.equal(coverageFor(row,[row.priorProposedFocusBoundsPoints]).result,false,id);
    assert.equal(coverageFor(row,[row.correctedFocusBoundsPoints]).result,true,id);
    assert.ok(row.correctedFocusBoundsPoints[2]>row.requiredEvidence.find(e=>e.id==='amountAndCurrency').boundsPoints[2],`${id} has a margin beyond the final punctuation`);
  }
});

test('the newly included PHB p.37 Sword Long weight/damage focus covers each field under the correct unit header',()=>{
  const row=cases.get('phb-long-sword-weight-damage');assert.ok(row);
  assert.equal(coverageFor(row,[row.correctedFocusBoundsPoints]).result,true);
  const crop=crops.get(row.cropId);
  assert.equal(containsContext(toNormalized(crop.effectiveBoundsPoints,crop.pageSizePoints),toNormalized(row.requiredHeaderBoundsPoints,crop.pageSizePoints)),true);
  assert.match(row.claim,/60 gold pieces of weight/);
  assert.match(row.claim,/1–8.*1–12/);
});

test('the remaining Arrow and PHB price fields retain complete row evidence',()=>{
  for(const id of ['phb-long-sword-price','phb-arrow-weight-damage']){
    const row=cases.get(id);assert.ok(row);
    assert.equal(coverageFor(row,[row.correctedFocusBoundsPoints]).result,true,id);
  }
  assert.match(cases.get('phb-long-sword-price').claim,/includes the scabbard/);
  assert.match(cases.get('phb-arrow-weight-damage').claim,/not a purchase price/);
});

test('UA Aklys price and stats remain distinct and their complete row evidence is covered',()=>{
  const price=cases.get('ua-aklys-purchase-price'),stats=cases.get('ua-aklys-weight-damage');
  assert.ok(price&&stats);
  assert.equal(coverageFor(price,[price.correctedFocusBoundsPoints]).result,true);
  assert.equal(fieldCoverage(price,[price.priorProposedFocusBoundsPoints]).find(f=>f.id==='amountAndCurrency').covered,false);
  assert.equal(coverageFor(stats,[stats.correctedFocusBoundsPoints]).result,true);
  assert.ok(stats.correctedFocusBoundsPoints[3]<stats.followingRowInkTopPoints,'Aklys focus ends before the Atlatl row');
  assert.equal(stats.footnoteAssociation.rowMarkerPresent,false);
  assert.deepEqual(stats.footnoteAssociation.numberedPage27FootnotesAssignedToAklys,[]);
  assert.match(price.claim,/2 gp/);assert.match(stats.claim,/35 gold pieces/);
});

test('UA p.27 Sword Long focus excludes the prior row and covers all general-data columns',()=>{
  const row=cases.get('ua-long-sword-general-data');assert.ok(row);
  assert.ok(row.priorProposedFocusBoundsPoints[1]<row.precedingRowInkBottomPoints,'historical top edge overlapped Sword, Khopesh');
  assert.equal(row.correctedFocusBoundsPoints[1]>=row.precedingRowInkBottomPoints,true);
  assert.equal(row.correctedFocusBoundsPoints[3]<row.followingRowInkTopPoints,true);
  assert.equal(coverageFor(row,[row.correctedFocusBoundsPoints]).result,true);
  assert.deepEqual(row.requiredEvidence.filter(e=>/^AC/.test(e.id)).map(e=>e.id),['AC0','AC1','AC2','AC3','AC4','AC5','AC6','AC7','AC8','AC9','AC10']);
  assert.match(row.noteScope,/Footnote 5 .*Sword, Bastard/);
});

test('applied excerpt assets and all selected stable row IDs use the calibrated source crops and foci',()=>{
  const cropImage=new Map();
  for(const crop of calibration.contextCrops){
    const filename=crop.image.path.split('/').at(-1);
    const bytes=readFileSync(`dist/scans/verified/${filename}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),crop.image.sha256,`${crop.id} published PNG hash`);
    assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],crop.image.pixels,`${crop.id} published PNG dimensions`);
    cropImage.set(crop.id,filename);
  }
  const applied=[
    ['equipment-phb-arrow.json',[
      ['phb-arrow-phb35-1','phb35-arms-complete',['phb-arrow-normal-single-price']],
      ['phb-arrow-phb35-2','phb35-arms-complete',['phb-arrow-normal-dozen-price']],
      ['phb-35-99d338a0db024fc0','phb35-arms-complete',['phb-arrow-normal-single-price','phb-arrow-normal-dozen-price']],
      ['phb-arrow-phb35-arms-left','phb35-arms-complete',[]],
      ['phb-arrow-phb35-arms-right','phb35-arms-complete',[]],
      ['phb-35-11d89f055598d8a4','phb35-arms-complete',[]],
      ['phb-arrow-phb37-3','phb37-weight-damage',['phb-arrow-weight-damage']],
      ['phb-37-c39cf8acc326eb5d','phb37-weight-damage',['phb-arrow-weight-damage']],
      ['phb-37-979be85653ffd9a3','phb37-weight-damage',[]],
    ]],
    ['equipment-phb-long-sword.json',[
      ['phb-long-sword-phb35-price','phb35-arms-complete',['phb-long-sword-price']],
      ['phb-35-24f9543184fe2a2a','phb35-arms-complete',['phb-long-sword-price']],
      ['phb-long-sword-phb35-arms-left','phb35-arms-complete',[]],
      ['phb-35-11d89f055598d8a4','phb35-arms-complete',[]],
      ['phb-37-2b2447ac14bb294c','phb37-weight-damage',['phb-long-sword-weight-damage']],
      ['phb-37-979be85653ffd9a3','phb37-weight-damage',[]],
      ['phb-38-779f5d713364297a','phb38-general-data',['phb-long-sword-to-hit-adjustments']],
      ['phb-38-dbc5670aafbf7843','phb38-general-data',[]],
      ['ua-27-fe40d4e1625a88fc','ua27-general-data',['ua-long-sword-general-data']],
      ['ua-27-2c829644bd303eb8','ua27-general-data',[]],
    ]],
    ['equipment-ua-aklys-hurled.json',[
      ['ua-equipment-price-table','ua26-equipment-price',['ua-aklys-purchase-price']],
      ['ua-26-92697cf6b5d2d5ec','ua26-weight-damage',['ua-aklys-weight-damage']],
      ['ua-26-5d54b5aed2ac32f3','ua26-weight-damage',[]],
      ['ua-aklys-hurled-ua27-notes-context','ua27-general-data',[]],
    ]],
  ];
  for(const [filename,expected] of applied){
    const catalog=JSON.parse(readFileSync(`dist/scans/verified/${filename}`,'utf8'));
    const regions=new Map(catalog.regions.map(region=>[region.id,region]));
    for(const [id,cropId,focusIds] of expected){
      const region=regions.get(id);assert.ok(region,`${filename}: stable region ${id}`);
      const crop=crops.get(cropId);
      assert.equal(region.image,cropImage.get(cropId),`${id} image`);
      assert.equal(region.sha256,crop.image.sha256,`${id} image SHA`);
      assert.deepEqual(region.boundsPdfPoints,crop.effectiveBoundsPoints,`${id} actual source crop bounds`);
      const expectedFocus=focusIds.map(focusId=>cases.get(focusId).correctedFocusImageXYWH);
      assert.equal(region.focusRects.length,expectedFocus.length,`${id} focus count`);
      for(let i=0;i<expectedFocus.length;i++)region.focusRects[i].forEach((v,j)=>assert.ok(Math.abs(v-expectedFocus[i][j])<1e-12,`${id} focus ${i} coordinate ${j}`));
      if(!focusIds.length)assert.equal(region.role,'context',`${id} is explicit context`);
    }
  }
  const ua=JSON.parse(readFileSync('dist/scans/verified/equipment-ua-aklys-hurled.json','utf8'));
  const uaNotes=ua.regions.find(r=>r.id==='ua-aklys-hurled-ua27-notes-context');
  assert.match(uaNotes.summary,/no p\.27 footnote is assigned as an Aklys qualifier/i);
  assert.equal(ua.evidenceContextSets.find(s=>s.id==='ua27-aklys-facing-notes-context').orderedRegionIds[0],uaNotes.id);
  assert.notEqual(ua.regions.find(r=>r.id==='ua-equipment-price-table').id,ua.regions.find(r=>r.id==='ua-26-92697cf6b5d2d5ec').id,'price and weapon stats remain separate regions');
});
