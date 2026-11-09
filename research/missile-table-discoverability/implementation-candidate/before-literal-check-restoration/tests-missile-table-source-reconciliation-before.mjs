import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
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
const actualBadRecordsBytes=readFileSync(new URL('../research/missile-table-discoverability/implementation-candidate/before-ua-column-alignment/rules-records-before.json',import.meta.url));
const actualBadRecords=JSON.parse(actualBadRecordsBytes);
const sourcePinNegativeBytes=readFileSync(new URL('../research/missile-table-discoverability/root-actual-source-pin-and-browser-negative-control-v1.json',import.meta.url));
const sourcePinNegative=JSON.parse(sourcePinNegativeBytes);
const sourcePinAudit=JSON.parse(readFileSync(new URL('../research/missile-table-discoverability/implementation-candidate/phb-source-pin-audit-candidate.json',import.meta.url),'utf8'));
const catalogs=new Map(candidate.records.map(record=>[record.id,JSON.parse(readFileSync(new URL(`../research/missile-table-discoverability/implementation-candidate/catalogs/rules-${record.id}.json`,import.meta.url),'utf8'))]));
const expectedColumns=book=>book==='PHB'?['fire-rate','range-short','range-medium','range-long',...Array.from({length:9},(_,index)=>`ac-${index+2}`)]:['fire-rate','range-short','range-medium','range-long',...Array.from({length:11},(_,index)=>`ac-${index}`)];
function cellMismatches(records){
 const failures=[];
 const comparable=value=>String(value).normalize('NFKC').replaceAll('−','-').replaceAll('–','-').replaceAll('—','-').replaceAll('⁄','/').replaceAll(' ','');
 for(const record of records){
  const sourceRows=Object.values(source[record.book]);
  for(const row of record.table.rows){
   const expected=sourceRows.find(sourceRow=>sourceRow.rowId===row.id);
   if(!expected){failures.push({book:record.book,rowId:row.id,error:'source-row-not-found'});continue;}
   const actual=new Map(row.cells.map(cell=>[cell.columnId,cell.raw]));
   const cells=[['fire-rate',expected.fireRate],['range-short',expected.rangeBands[0]],['range-medium',expected.rangeBands[1]],['range-long',expected.rangeBands[2]],...expected.armorClasses.map((ac,index)=>[`ac-${ac}`,expected.adjustments[index]])];
   for(const [columnId,value] of cells)if(comparable(actual.get(columnId))!==comparable(value))failures.push({book:record.book,rowId:row.id,columnId,actual:actual.get(columnId),expected:value});
  }
 }
 return failures;
}
function rowTargetJoinFailures(records){
 return records.flatMap(record=>record.table.rows.flatMap((row,index)=>{
  const reference=row.sourceReference,binding=reference?.evidenceBindings?.[0];
  const regionIds=binding?.regionIds||reference?.verification?.regions||[];
  const expectedSuffix=`-row-${row.id}`;
  return regionIds.length!==1||!regionIds[0].endsWith(expectedSuffix)
   ?[{book:record.book,rowId:row.id,index,regionIds,failure:'row source target does not join to the same source row'}]
   :[];
 }));
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
function phbPins(value,path='$',out=[]){
 if(Array.isArray(value)){value.forEach((entry,index)=>phbPins(entry,`${path}/${index}`,out));return out;}
 if(!value||typeof value!=='object')return out;
 if(value.book==='PHB'&&typeof value.sourceSha256==='string')out.push({path:`${path}/sourceSha256`,value:value.sourceSha256});
 if(value.sources?.PHB?.sha256)out.push({path:`${path}/sources/PHB/sha256`,value:value.sources.PHB.sha256});
 for(const [key,child] of Object.entries(value))phbPins(child,`${path}/${key}`,out);
 return out;
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

test('all current PHB source pins exactly match the private PDF and reject the preserved 64-character typo',()=>{
 const expected='e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095';
 const bad='e43e667bad1c2cb093bb28b47b78ec663623b367ae817895bd188bdc3dd4f095';
 const pins=[...phbPins(candidate),...phbPins([...catalogs.values()])];
 const producer=readFileSync(new URL('../research/missile-table-discoverability/implementation-candidate/build-candidate.mjs',import.meta.url),'utf8');
 assert.equal(sourcePinNegative.artifactType,'actual unpublished missile candidate source-pin and browser-sequence negative control');
 assert.equal(createHash('sha256').update(sourcePinNegativeBytes).digest('hex'),'04b0d8939e3b1247a8c37c079e8a2e36604a1a33d315f898afbc112f54c61eeb');
 assert.equal(sourcePinNegative.sourcePinFailure.actualOccurrences,46);
 assert.equal(sourcePinNegative.sourcePinFailure.canonicalPdfSourceSha256,expected);
 assert.equal(sourcePinNegative.sourcePinFailure.paths[0].actual,bad);
 assert.equal(sourcePinNegative.sourcePinFailure.paths[0].expected,expected);
 assert.equal(sourcePinNegative.sourcePinFailure.paths[0].actualLength,64);
 assert.equal(pins.length,48,'46 record-level and 2 catalog PHB pins are checked');
 assert.ok(pins.every(pin=>pin.value===expected),JSON.stringify(pins.filter(pin=>pin.value!==expected)));
 assert.ok(!pins.some(pin=>pin.value===bad),'the exact old 64-character typo is absent from current record and catalog pins');
 assert.equal((producer.match(new RegExp(expected,'g'))||[]).length,2,'one producer pin plus one expected guard constant');
 assert.equal((producer.match(new RegExp(bad,'g'))||[]).length,0);
 const actualBeforePins=phbPins(actualBadRecords);
 assert.equal(createHash('sha256').update(actualBadRecordsBytes).digest('hex'),'a3630411d26e2d4797cfdb8d369bef9b2a12c73b8666630173a0ea5323d9b889');
 assert.equal(actualBeforePins.length,46,'the actual preserved pre-fix record file contains the 46 bad PHB PDF pins');
 assert.ok(actualBeforePins.every(pin=>pin.value===bad),'the pin detector rejects each actual bad before-state record binding, not only a synthetic string');
 assert.match(producer,/actualPhbPdfSha!==sources\.PHB\.sha256/,'the builder hashes the private PDF and stops unless the exact source pin matches');
 assert.equal(sourcePinAudit.status,'exact PHB source pins match the private PDF; candidate only; no grade or sourceExcerpt registration');
 assert.deepEqual(sourcePinAudit.counts,{recordAndCatalogPins:48,producerSourcePins:1,guardExpectedHashLiterals:1,totalSourcePins:49});
 assert.equal(sourcePinAudit.inputs.privatePhbPdf.sha256,expected);
 assert.equal(sourcePinAudit.inputs.rootBeforeNegativeControl.sha256,'04b0d8939e3b1247a8c37c079e8a2e36604a1a33d315f898afbc112f54c61eeb');
});

test('actual preserved bad candidate replays all independent cell and row-join findings; current mutations fail',()=>{
 assert.equal(rootsNegative.valueCellsCompared,555);
 assert.equal(rootsNegative.candidateValueErrors,30);
 assert.equal(rootsNegative.affectedRows,14);
 assert.equal(rootsNegative.rowTargetStructureFindings.filter(finding=>finding.rowId).length,39);
 assert.equal(createHash('sha256').update(actualBadRecordsBytes).digest('hex'),rootsNegative.candidate.sha256);
 const actualOldRecords=actualBadRecords.records;
 const actualOldValueFailures=cellMismatches(actualOldRecords);
 assert.equal(actualOldValueFailures.length,30,'the current exact-cell detector replays all 30 errors from the actual preserved bad record bytes');
 assert.equal(new Set(actualOldValueFailures.map(failure=>`${failure.book}:${failure.rowId}`)).size,14,'the 30 errors affect the same 14 actual source rows reported in the root control');
 assert.deepEqual(actualOldValueFailures.map(failure=>`${failure.book}:${failure.rowId}:${failure.columnId}`).sort(),rootsNegative.valueErrors.map(failure=>`${failure.book}:${failure.rowId}:${failure.columnId}`).sort());
 const actualOldRowJoinFailures=rowTargetJoinFailures(actualOldRecords);
 assert.equal(actualOldRowJoinFailures.length,39,'the current row-identity join detector replays all 39 invalid row-region joins from the actual preserved rows');
 assert.deepEqual(actualOldRowJoinFailures.map(failure=>`${failure.book}:${failure.rowId}`).sort(),rootsNegative.rowTargetStructureFindings.filter(finding=>finding.rowId).map(finding=>`${finding.book}:${finding.rowId}`).sort());
 assert.deepEqual(rowTargetJoinFailures(candidate.records),[],'corrected row joins resolve to their exact unique source row IDs');
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
