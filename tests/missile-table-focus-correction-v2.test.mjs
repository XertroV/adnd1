import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateScanCatalog} from '../tools/scan-catalog.mjs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';

const require=createRequire(import.meta.url);
const books=require('../dist/books.js');
const baseDir='../research/missile-table-discoverability/implementation-candidate';
const v1Dir=`${baseDir}/focus-navigation-correction-v1`;
const v2Dir=`${baseDir}/focus-navigation-correction-v2`;
const read=relative=>readFileSync(new URL(relative,import.meta.url));
const json=relative=>JSON.parse(read(relative));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=json('../research/missile-table-discoverability/root-source-cell-review-v1.json');
const base=json(`${baseDir}/rules-records-candidate.json`).records;
const v1=json(`${v1Dir}/rules-records-candidate-corrected.json`).records;
const v2=json(`${v2Dir}/rules-records-candidate-corrected.json`).records;
const proposal=json(`${v2Dir}/focus-correction-proposal.json`);
const manifest=json(`${v2Dir}/focus-correction-manifest.json`);
const v1Catalogs=new Map(v1.map(record=>[record.id,json(`${v1Dir}/catalogs/rules-${record.id}.json`)]));
const v2Catalogs=new Map(v2.map(record=>[record.id,json(`${v2Dir}/catalogs/rules-${record.id}.json`)]));

function withoutFocus(value){
 const copy=structuredClone(value);
 for(const record of copy.records){
  for(const row of record.table.rows){
   const binding=row.sourceReference?.evidenceBindings?.[0];
   if(binding){delete binding.highlightCoordinates;delete binding.regionEvidence;}
  }
  for(const note of [...(record.table.footnotes||[]),...(record.table.sourceNotes||[])]){
   const binding=note.sourceReference?.evidenceBindings?.[0];
   if(binding){delete binding.highlightCoordinates;delete binding.regionEvidence;}
   delete note.marker;
  }
 }
 return copy;
}
function literalCellMismatches(records){
 const errors=[];
 for(const record of records){
  for(const row of record.table.rows){
   const rowSource=Object.values(source[record.book]).find(candidate=>candidate.rowId===row.id);
   assert.ok(rowSource,`${record.book}/${row.id} is present in independent source transcription`);
   const expected=[['fire-rate',rowSource.fireRate],['range-short',rowSource.rangeBands[0]],['range-medium',rowSource.rangeBands[1]],['range-long',rowSource.rangeBands[2]],...rowSource.armorClasses.map((ac,index)=>[`ac-${ac}`,rowSource.adjustments[index]])];
   const actual=new Map(row.cells.map(cell=>[cell.columnId,cell.raw]));
   for(const [column,raw] of expected)if(actual.get(column)!==raw)errors.push({book:record.book,rowId:row.id,column,expected:raw,actual:actual.get(column)});
  }
 }
 return errors;
}
function region(catalog,id){const result=catalog.regions.find(entry=>entry.id===id);assert.ok(result,`${id} resolves in the owner catalog`);return result;}

test('V2 changes only the two PHB left-band bounds flagged by root while preserving V1 bytes and all source values',()=>{
 assert.equal(sha(read(`${v1Dir}/focus-correction-proposal.json`)),'0da176990c29c8bf1f610eb6e90402340226d196599275f11fa4fe284a8c9ad9');
 assert.equal(sha(read('../research/missile-table-discoverability/root-corrected-focus-partial-review-v2.json')),'e461c61cd382062b40bc5cbce939c9b48b8a1ee231c12a7b464e9f093b3d8a00');
 assert.deepEqual(literalCellMismatches(base),[]);
 assert.deepEqual(literalCellMismatches(v1),[]);
 assert.deepEqual(literalCellMismatches(v2),[]);
 assert.deepEqual(withoutFocus({records:v1}),withoutFocus({records:v2}));
 const v1Phb=v1Catalogs.get('phb-hurled-weapons-and-missiles-table');
 const v2Phb=v2Catalogs.get('phb-hurled-weapons-and-missiles-table');
 const rowsWithChangedFoci=[];
 for(const item of v2Phb.regions){
  const old=region(v1Phb,item.id);
  if(JSON.stringify(old.focusRects)!==JSON.stringify(item.focusRects))rowsWithChangedFoci.push(item.id);
 }
 assert.deepEqual(rowsWithChangedFoci,['phb38-row-axe-hand','phb38-row-hammer']);
 assert.deepEqual(region(v2Phb,'phb38-row-axe-hand').focusRects[0],[2/1656,60/600,719/1656,28/600]);
 assert.deepEqual(region(v2Phb,'phb38-row-hammer').focusRects[0],[2/1656,332/600,719/1656,27/600]);
 assert.equal(proposal.counts.phbRowsWithChangedV1Bounds,2);
 assert.equal(proposal.counts.sourceValueChanges,0);
 assert.equal(proposal.counts.activeRegistrations,0);
});

test('V2 owner catalogs and source-reference hashes validate; PHB bands remain disjoint and row-local',()=>{
 for(const record of v2){
  const catalog=v2Catalogs.get(record.id);
  const verified={collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${record.id}.json`,regionCount:catalog.regions.length};
  validateScanCatalog(catalog,{id:record.id},books,verified);
  for(const [index,row] of record.table.rows.entries()){
   const binding=row.sourceReference.evidenceBindings[0];
   const focused=region(catalog,binding.regionIds[0]);
   assert.equal(binding.fieldPointer,`/table/rows/${index}`);
   assert.equal(focused.sourceRowId,row.id);
   assert.equal(focused.sourcePointer,`/table/rows/${index}`);
   assert.equal(binding.reviewStatus,'field-target-pending');
   assert.equal(binding.regionEvidence.length,1);
   assert.deepEqual(binding.regionEvidence[0],{...binding.regionEvidence[0],...sourceVisualRegionHashes(focused),focusRectsSha256:sha(Buffer.from(JSON.stringify(focused.focusRects)))});
  }
 }
 const phb=v2.find(record=>record.book==='PHB');
 const catalog=v2Catalogs.get(phb.id);
 const left=[],right=[];
 for(const row of phb.table.rows){
  const foci=region(catalog,row.sourceReference.evidenceBindings[0].regionIds[0]).focusRects;
  assert.equal(foci.length,2,row.id);
  assert.ok(foci[0][0]+foci[0][2]<foci[1][0],`${row.id} label/range and AC boxes are horizontally disjoint`);
  for(const rect of foci){
   assert.ok(rect[1]>=0&&rect[1]+rect[3]<=1);
   assert.ok(rect[3]>0);
  }
  if(left.length){assert.ok(foci[0][1]+1e-8>=left.at(-1)[1]+left.at(-1)[3],`${row.id} left focus avoids the preceding row`);assert.ok(foci[1][1]+1e-8>=right.at(-1)[1]+right.at(-1)[3],`${row.id} AC focus avoids the preceding row`);}
  left.push(foci[0]);right.push(foci[1]);
 }
});

test('UA Aklys star and full footnote geometry match the separately accepted V1 source-focus receipt',()=>{
 const ua=v2.find(record=>record.book==='UA');
 const catalog=v2Catalogs.get(ua.id);
 const note=ua.table.footnotes.find(entry=>entry.id==='ua-hurled-weapons-and-missiles-table-focus-aklys-10-foot');
 const focused=region(catalog,'ua28-footnote-aklys-10-foot');
 const review=json('../research/missile-table-discoverability/root-corrected-focus-partial-review-v2.json').accepted;
 assert.equal(note.marker,'*');
 assert.equal(note.text,'10-foot range only, not 10 yards.');
 assert.deepEqual(focused.focusRects,[[35/1130,601/726,265/1130,23/726]]);
 assert.equal(review.regionId,focused.id);
 const evidence=note.sourceReference.evidenceBindings[0].regionEvidence.find(entry=>entry.regionId===focused.id);
 assert.equal(evidence.sourceSha256,review.sourceSha256);
 assert.equal(evidence.imageSha256,review.imageSha256);
 assert.deepEqual(sourceVisualRegionHashes(focused),{focusSha256:review.focusSha256,contentSha256:review.contentSha256});
});

test('V2 receipt identifies the exact delta and keeps all page-group defaults pending',()=>{
 assert.equal(manifest.inputs.rootCorrectedFocusReview.sha256,'e461c61cd382062b40bc5cbce939c9b48b8a1ee231c12a7b464e9f093b3d8a00');
 assert.equal(manifest.inputs.frozenV1.proposal.sha256,'0da176990c29c8bf1f610eb6e90402340226d196599275f11fa4fe284a8c9ad9');
 assert.equal(manifest.counts.phbRowsWithChangedV1Bounds,2);
 assert.equal(manifest.counts.sourceValueChanges,0);
 assert.equal(manifest.counts.activeRegistrations,0);
 assert.equal(manifest.sourceContexts.phb.status,'pending-group-default-and-source-context-review');
 assert.equal(manifest.sourceContexts.ua.status,'pending-group-default-and-source-context-review');
 assert.equal(sha(read(`${v2Dir}/rules-records-candidate-corrected.json`)),manifest.outputs[0].sha256);
 assert.equal(sha(read(`${v2Dir}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`)),manifest.outputs[1].sha256);
 assert.equal(sha(read(`${v2Dir}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`)),manifest.outputs[2].sha256);
});
