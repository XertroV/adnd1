import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateScanCatalog} from '../tools/scan-catalog.mjs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';

const require=createRequire(import.meta.url);
const books=require('../dist/books.js');
const citations=require('../dist/citations.js');
const baseDir='../research/missile-table-discoverability/implementation-candidate';
const correctedDir=`${baseDir}/focus-navigation-correction-v1`;
const read=relative=>readFileSync(new URL(relative,import.meta.url));
const json=relative=>JSON.parse(read(relative));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=json(`${baseDir}/rules-records-candidate.json`).records;
const preNavigation=json('../research/missile-table-discoverability/implementation-candidate/before-table-source-default-fix-v1/rules-records-candidate.json').records;
const corrected=json(`${correctedDir}/rules-records-candidate-corrected.json`).records;
const baselineCatalogs=new Map(baseline.map(record=>[record.id,json(`${baseDir}/catalogs/rules-${record.id}.json`)]));
const correctedCatalogs=new Map(corrected.map(record=>[record.id,json(`${correctedDir}/catalogs/rules-${record.id}.json`)]));
const source=json('../research/missile-table-discoverability/root-source-cell-review-v1.json');
const proposal=json(`${correctedDir}/focus-correction-proposal.json`);
const manifest=json(`${correctedDir}/focus-correction-manifest.json`);

function literalCellMismatches(records){
 const errors=[];
 for(const record of records){
  for(const row of record.table.rows){
   const sourceRow=Object.values(source[record.book]).find(candidate=>candidate.rowId===row.id);
   assert.ok(sourceRow,`${record.book}/${row.id} exists in the independent source census`);
   const expected=[['fire-rate',sourceRow.fireRate],['range-short',sourceRow.rangeBands[0]],['range-medium',sourceRow.rangeBands[1]],['range-long',sourceRow.rangeBands[2]],...sourceRow.armorClasses.map((ac,index)=>[`ac-${ac}`,sourceRow.adjustments[index]])];
   const actual=new Map(row.cells.map(cell=>[cell.columnId,cell.raw]));
   for(const [column,value] of expected)if(actual.get(column)!==value)errors.push({book:record.book,rowId:row.id,column,value:actual.get(column)});
  }
 }
 return errors;
}
function withoutApprovedFocusChanges(value){
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
function catalogContentWithoutFocus(catalog){
 const copy=structuredClone(catalog);
 for(const region of copy.regions){delete region.focusRects;delete region.alt;delete region.summary;}
 return copy;
}
function normalizedRect(rect){
 assert.ok(Array.isArray(rect)&&rect.length===4);
 const [x,y,width,height]=rect;
 for(const value of rect)assert.ok(Number.isFinite(value));
 assert.ok(x>=0&&y>=0&&width>0&&height>0&&x+width<=1&&y+height<=1);
 return {x,y,width,height};
}

test('focus correction preserves all literal source values, row ownership and unapproved grades',()=>{
 assert.equal(corrected.length,2);
 assert.deepEqual(literalCellMismatches(baseline),[]);
 assert.deepEqual(literalCellMismatches(corrected),[]);
 assert.equal(source.denominators.combinedValueCells,555);
 assert.deepEqual(corrected.map(record=>record.table.rows.length),[15,24]);
 assert.deepEqual(withoutApprovedFocusChanges({records:baseline}),withoutApprovedFocusChanges({records:corrected}));
 for(const record of corrected){
  const catalog=correctedCatalogs.get(record.id);
  const verification={collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${record.id}.json`,regionCount:catalog.regions.length};
  validateScanCatalog(catalog,{id:record.id},books,verification);
  for(const [index,row] of record.table.rows.entries()){
   const binding=row.sourceReference.evidenceBindings[0],region=catalog.regions.find(entry=>entry.id===binding.regionIds[0]);
   assert.equal(binding.fieldPointer,`/table/rows/${index}`);
   assert.equal(binding.itemId,record.id);
   assert.equal(region.sourceRowId,row.id);
   assert.equal(region.sourcePointer,`/table/rows/${index}`);
   assert.equal(binding.reviewStatus,'field-target-pending');
  }
 }
});

test('table-context routing metadata preserves the original complete source-page citation set',()=>{
 for(const current of baseline){
  const old=preNavigation.find(record=>record.id===current.id);
  assert.ok(old);
  assert.deepEqual(citations.pages(current),citations.pages(old),`${current.id} keeps every original cited PHB/UA page`);
  const context=current.table.sourceContext;
  const region=correctedCatalogs.get(current.id).regions.find(entry=>entry.id===context.regionId);
  assert.equal(context.book,current.book);
  assert.equal(context.printedPage,current.pages[0]);
  assert.ok(region,'the explicit navigation context resolves to a separate table-context region');
  assert.equal(region.role,'context');
  assert.equal(region.printedPage,context.printedPage);
  assert.deepEqual(region.focusRects,[],'whole-table context stays unhighlighted');
 }
});

test('the 15 PHB row corrections use separate source-baseline bands without touching neighboring rows',()=>{
 const phb=corrected.find(record=>record.book==='PHB'),catalog=correctedCatalogs.get(phb.id),previous=baselineCatalogs.get(phb.id);
 const leftRanges=[],rightRanges=[];
 for(const [index,row] of phb.table.rows.entries()){
  const id=row.sourceReference.evidenceBindings[0].regionIds[0];
  const region=catalog.regions.find(entry=>entry.id===id),old=previous.regions.find(entry=>entry.id===id);
  assert.equal(region.focusRects.length,2,`${row.id} has label/range and adjustment focus rectangles`);
  assert.equal(old.focusRects.length,1,'the preserved baseline used one wide rectangle');
  const left=normalizedRect(region.focusRects[0]),right=normalizedRect(region.focusRects[1]);
  assert.ok(left.x+left.width<right.x,'the two rectangles remain disjoint across the table split');
  if(leftRanges.length)assert.ok(left.y+1e-8>=leftRanges.at(-1).y+leftRanges.at(-1).height,'left row focus bands do not overlap adjacent rows');
  if(rightRanges.length)assert.ok(right.y+1e-8>=rightRanges.at(-1).y+rightRanges.at(-1).height,'Armor Class focus bands do not overlap adjacent rows');
  leftRanges.push(left);rightRanges.push(right);
  const evidence=row.sourceReference.evidenceBindings[0].regionEvidence[0];
  assert.deepEqual(evidence,{
   ...evidence,
   ...sourceVisualRegionHashes(region),
   focusRectsSha256:sha(Buffer.from(JSON.stringify(region.focusRects))),
  },'row region hashes are recomputed for the exact candidate foci');
 }
 assert.equal(proposal.phbRows.length,15);
 assert.equal(proposal.counts.phbRectsPerRow,2);
});

test('the UA Aklys marker and descender-safe focus are a separate printed footnote correction',()=>{
 const ua=corrected.find(record=>record.book==='UA'),baseUa=baseline.find(record=>record.book==='UA');
 const catalog=correctedCatalogs.get(ua.id),region=catalog.regions.find(entry=>entry.id==='ua28-footnote-aklys-10-foot');
 assert.equal(ua.table.footnotes[0].marker,'*');
 assert.equal(ua.table.footnotes[0].text,baseUa.table.footnotes[0].text);
 assert.equal(ua.table.footnotes[0].sourceReference.evidenceBindings[0].reviewStatus,'field-target-pending');
 assert.deepEqual(region.focusRects,[[35/1130,601/726,265/1130,23/726]]);
 assert.equal(region.candidateStatus,'pending-independent-source-focus-review');
});

test('candidate receipt pins baseline, partial acceptance and held source groups without claiming approval',()=>{
 assert.equal(manifest.status,'candidate geometry/metadata only; PHB row focus and UA Aklys marker/focus await independent review; no active excerpt registration or source-value promotion');
 assert.equal(manifest.inputs.sourceCellReview.sha256,'7a9866ca04dbc71138b260ede3936ae4c99a8db10b685435c7ac424f1517f7c3');
 assert.equal(manifest.inputs.actualBadCandidateNegative.sha256,'fda09edec63001ee80bda4f06f25429c2189034a2fff5b29b3bb7dc64ae9e10c');
 assert.equal(manifest.inputs.rootPartialFocusAcceptance.sha256,'01923b45ab676a72a3811b811f9000e20872efa0d662398fab071ca3895bb6ff');
 assert.equal(manifest.counts.sourceValueChanges,0);
 assert.equal(manifest.counts.activeRegistrations,0);
 assert.equal(manifest.sourceContexts.phb.status,'pending-group-default-and-source-context-review');
 assert.equal(manifest.sourceContexts.ua.status,'pending-group-default-and-source-context-review');
 assert.equal(sha(read(`${correctedDir}/rules-records-candidate-corrected.json`)),manifest.outputs[0].sha256);
 assert.equal(sha(read(`${correctedDir}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`)),manifest.outputs[1].sha256);
 assert.equal(sha(read(`${correctedDir}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`)),manifest.outputs[2].sha256);
});
