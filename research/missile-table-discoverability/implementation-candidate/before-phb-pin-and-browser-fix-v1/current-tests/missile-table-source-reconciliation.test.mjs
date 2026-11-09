import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateScanCatalog} from '../tools/scan-catalog.mjs';

const require=createRequire(import.meta.url);
const books=require('../dist/books.js');
const citations=require('../dist/citations.js');
const sourcePath='../research/missile-table-discoverability/root-source-cell-review-v1.json';
const source=JSON.parse(readFileSync(new URL(sourcePath,import.meta.url),'utf8'));
const candidate=JSON.parse(readFileSync(new URL('../research/missile-table-discoverability/implementation-candidate/rules-records-candidate.json',import.meta.url),'utf8'));
const rootsNegative=JSON.parse(readFileSync(new URL('../research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json',import.meta.url),'utf8'));
const catalogs=new Map(candidate.records.map(record=>[record.id,JSON.parse(readFileSync(new URL(`../research/missile-table-discoverability/implementation-candidate/catalogs/rules-${record.id}.json`,import.meta.url),'utf8'))]));
const expectedColumns=book=>book==='PHB'?['fire-rate','range-short','range-medium','range-long',...Array.from({length:9},(_,index)=>`ac-${index+2}`)]:['fire-rate','range-short','range-medium','range-long',...Array.from({length:11},(_,index)=>`ac-${index}`)];
function cellMismatches(records){
 const failures=[];
 for(const record of records){
  const sourceRows=Object.values(source[record.book]);
  for(const row of record.table.rows){
   const expected=sourceRows.find(sourceRow=>sourceRow.rowId===row.id);
   if(!expected){failures.push({book:record.book,rowId:row.id,error:'source-row-not-found'});continue;}
   const actual=new Map(row.cells.map(cell=>[cell.columnId,cell.raw]));
   const cells=[['fire-rate',expected.fireRate],['range-short',expected.rangeBands[0]],['range-medium',expected.rangeBands[1]],['range-long',expected.rangeBands[2]],...expected.armorClasses.map((ac,index)=>[`ac-${ac}`,expected.adjustments[index]])];
   for(const [columnId,value] of cells)if(actual.get(columnId)!==value)failures.push({book:record.book,rowId:row.id,columnId,actual:actual.get(columnId),expected:value});
  }
 }
 return failures;
}
function validateBindings(record,catalog){
 assert.deepEqual(record.table.columns.map(column=>column.id),expectedColumns(record.book));
 assert.equal(new Set(record.table.rows.map(row=>row.id)).size,record.table.rows.length);
 assert.equal(new Set(catalog.regions.map(region=>region.id)).size,catalog.regions.length);
 record.table.rows.forEach((row,index)=>{
  const binding=row.sourceReference?.evidenceBindings?.[0];
  const region=catalog.regions.find(candidateRegion=>candidateRegion.id===binding?.regionIds?.[0]);
  assert.ok(binding,'row has one evidence binding');
  assert.equal(row.sourceReference.evidenceBindings.length,1);
  assert.equal(binding.collection,'rules');
  assert.equal(binding.itemId,record.id);
  assert.deepEqual(binding.sourceOwner,{collection:'rules',itemId:record.id});
  assert.equal(binding.fieldPointer,`/table/rows/${index}`);
  assert.equal(binding.sourceObjectPointer,`/table/rows/${index}`);
  assert.equal(binding.book,record.book);
  assert.equal(binding.printedPage,record.pages[0]);
  assert.equal(binding.pdfPage,record.pages[0]+1);
  assert.equal(binding.reviewStatus,'field-target-pending');
  assert.ok(region,'row target resolves to a catalog region');
  assert.equal(region.role,'row');
  assert.equal(region.sourceRowId,row.id);
  assert.equal(region.sourcePointer,`/table/rows/${index}`);
  assert.deepEqual(row.sourceReference.verification.regions,[region.id]);
  const exactFocus=record.sourceReferences.filter(reference=>reference.focusRects?.some(focus=>focus.id===row.sourceReference.sourceFocusId));
  assert.equal(exactFocus.length,1);
  const [target]=citations.targets(row.sourceReference);
  assert.equal(target.fieldOwner?.itemId,record.id);
  assert.equal(target.sourceOwner?.itemId,record.id);
  assert.equal(target.fieldPointer,`/table/rows/${index}`);
  assert.deepEqual(target.regionIds,[region.id]);
  assert.equal(target.targetStatus,'pending');
 });
 for(const [index,note] of record.table.sourceNotes.entries()){
  const binding=note.sourceReference?.evidenceBindings?.[0];
  assert.equal(binding?.fieldPointer,`/table/sourceNotes/${index}`);
  assert.equal(binding?.itemId,record.id);
  assert.deepEqual(binding?.sourceOwner,{collection:'rules',itemId:record.id});
  const [target]=citations.targets(note.sourceReference);
  assert.equal(target.sourceOwner?.itemId,record.id);
  assert.equal(target.fieldPointer,`/table/sourceNotes/${index}`);
  assert.equal(target.targetStatus,'pending');
 }
 const verification={collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${record.id}.json`,regionCount:catalog.regions.length};
 validateScanCatalog(catalog,{id:record.id},books,verification);
}

test('all 555 literal PHB38/UA28 values match the exact independent source-cell receipt',()=>{
 assert.equal(source.denominators.combinedValueCells,555);
 assert.equal(source.denominators.PHB.valueCells,195);
 assert.equal(source.denominators.UA.valueCells,360);
 assert.deepEqual(cellMismatches(candidate.records),[]);
 assert.equal(candidate.records.find(record=>record.book==='PHB').table.rows.length,15);
 assert.equal(candidate.records.find(record=>record.book==='UA').table.rows.length,24);
});

test('the full 15-row overlap agrees exactly and UA contributes nine separate rows',()=>{
 const phb=candidate.records.find(record=>record.book==='PHB'),ua=candidate.records.find(record=>record.book==='UA');
 const uaIds=new Set(ua.table.rows.map(row=>row.id));
 for(const row of phb.table.rows){
  const counterpart=ua.table.rows.find(candidateRow=>candidateRow.id===row.id);
  assert.ok(counterpart,`${row.id} appears in both source tables`);
  assert.deepEqual(row.cells.map(cell=>cell.raw),counterpart.cells.filter(cell=>expectedColumns('UA').includes(cell.columnId)&&!['ac-0','ac-1'].includes(cell.columnId)).map(cell=>cell.raw));
  uaIds.delete(row.id);
 }
 assert.deepEqual([...uaIds],['aklys-hurled','atlatl-javelin','blowgun-needle','crossbow-hand','harpoon','knife','lasso','staff-sling-bullet','staff-sling-stone']);
});

test('candidate catalogs and all row/source-note targets pass the official structural checks',()=>{
 for(const record of candidate.records)validateBindings(record,catalogs.get(record.id));
 assert.equal(candidate.records[0].table.sourceNotes.length,5,'PHB has two printed notes plus three separately sourced armor-column examples');
 assert.equal(candidate.records[1].table.sourceNotes.length,5,'UA keeps its two printed notes separate from three PHB36 armor examples');
 assert.equal(candidate.records[1].table.footnotes.length,1,'UA Aklys remains an actual printed footnote');
});

test('actual preserved bad candidate fails the independent cell check and current candidate mutations fail',()=>{
 assert.equal(rootsNegative.valueCellsCompared,555);
 assert.equal(rootsNegative.candidateValueErrors,30);
 assert.equal(rootsNegative.affectedRows,14);
 assert.equal(rootsNegative.rowTargetStructureFindings.filter(finding=>finding.rowId).length,39);
 const mutated=structuredClone(candidate.records);
 const phb=mutated.find(record=>record.book==='PHB'),javelin=phb.table.rows.find(row=>row.id==='javelin');
 javelin.cells.find(cell=>cell.columnId==='ac-8').raw='0';
 assert.equal(cellMismatches(mutated).length,1,'one exact cell mutation is detected by the independently pinned source receipt');
 const broken=structuredClone(candidate.records[0]),brokenCatalog=structuredClone(catalogs.get(broken.id));
 broken.table.rows[0].sourceReference.evidenceBindings[0].regionIds=['missing-row-region'];
 assert.throws(()=>validateBindings(broken,brokenCatalog),'a borrowed/missing row target fails the owner-pointer-region checks');
 const duplicateCatalog=structuredClone(catalogs.get(candidate.records[0].id));
 duplicateCatalog.regions[2].id=duplicateCatalog.regions[1].id;
 const verification={collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${candidate.records[0].id}.json`,regionCount:duplicateCatalog.regions.length};
 assert.throws(()=>validateScanCatalog(duplicateCatalog,{id:candidate.records[0].id},books,verification),'the official validator rejects duplicate row-region identities');
});
