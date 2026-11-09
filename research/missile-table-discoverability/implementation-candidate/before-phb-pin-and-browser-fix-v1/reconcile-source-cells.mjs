import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {validateScanCatalog} from '../../../tools/scan-catalog.mjs';

const root=path.resolve(import.meta.dirname,'../../..');
const out=path.join(root,'research/missile-table-discoverability/implementation-candidate');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=(relative)=>readFileSync(path.join(root,relative));
const sourcePath='research/missile-table-discoverability/root-source-cell-review-v1.json';
const sourceSha='7a9866ca04dbc71138b260ede3936ae4c99a8db10b685435c7ac424f1517f7c3';
const sourceBytes=read(sourcePath);
if(sha(sourceBytes)!==sourceSha)throw Error('Independent root source-cell review hash changed');
const truth=JSON.parse(sourceBytes);
const candidateBytes=read('research/missile-table-discoverability/implementation-candidate/rules-records-candidate.json');
const candidate=JSON.parse(candidateBytes);
const books=createRequire(import.meta.url)(path.join(root,'dist/books.js'));
const counts={PHB:0,UA:0,total:0,sharedRows:0,sharedCellMatches:0,uaOnlyRows:0};
const mismatches=[];
const structuralErrors=[];
const byBook={};

function sourceCells(book,rowId){
 const group=truth[book]||{};
 return Object.values(group).find(row=>row.rowId===rowId)||null;
}
for(const record of candidate.records){
 const book=record.book,owner=record.id;
 const source=truth[book];
 const sourceRows=Object.values(source||{});
 const expectedColumns=book==='PHB'
  ?['fire-rate','range-short','range-medium','range-long',...Array.from({length:9},(_,i)=>`ac-${i+2}`)]
  :['fire-rate','range-short','range-medium','range-long',...Array.from({length:11},(_,i)=>`ac-${i}`)];
 if(JSON.stringify(record.table.columns.map(column=>column.id))!==JSON.stringify(expectedColumns))structuralErrors.push(`${book}: table column IDs/order differ from source header`);
 if(record.table.rows.length!==(book==='PHB'?15:24))structuralErrors.push(`${book}: physical row count mismatch`);
 const catalogPath=`research/missile-table-discoverability/implementation-candidate/catalogs/rules-${owner}.json`;
 const catalog=JSON.parse(read(catalogPath));
 const activePath=`scans/verified/rules-${owner}.json`;
 const verification={collection:'rules',state:'source-excerpt-checked',catalog:activePath,regionCount:catalog.regions.length};
 try{validateScanCatalog(catalog,{id:owner},books,verification);}catch(error){structuralErrors.push(`${book}: official scan catalog validator: ${error.message}`);}
 const regionIds=catalog.regions.map(region=>region.id);
 if(new Set(regionIds).size!==regionIds.length)structuralErrors.push(`${book}: duplicate source region ID`);
 const rowTargets=[];
 record.table.rows.forEach((row,index)=>{
  const expected=sourceCells(book,row.id);
  if(!expected){mismatches.push({book,rowId:row.id,error:'independent-source-row-missing'});return;}
  const candidateCells=new Map(row.cells.map(cell=>[cell.columnId,cell.raw]));
  const sourceValueCells=[['fire-rate',expected.fireRate],['range-short',expected.rangeBands[0]],['range-medium',expected.rangeBands[1]],['range-long',expected.rangeBands[2]],...expected.armorClasses.map((ac,i)=>[`ac-${ac}`,expected.adjustments[i]])];
  if(row.cells.length!==expectedColumns.length)structuralErrors.push(`${book}/${row.id}: row cell count mismatch`);
  if(row.cells.some((cell,cellIndex)=>cell.columnId!==expectedColumns[cellIndex]))structuralErrors.push(`${book}/${row.id}: row cell order differs from column order`);
  for(const [columnId,sourceValue] of sourceValueCells){
   counts[book]++;counts.total++;
   const candidateValue=candidateCells.get(columnId);
   if(candidateValue!==sourceValue)mismatches.push({book,rowId:row.id,columnId,candidateValue,independentSourceValue:sourceValue});
  }
  const binding=row.sourceReference?.evidenceBindings?.[0];
  const regionId=binding?.regionIds?.[0];
  const region=catalog.regions.find(item=>item.id===regionId);
  const focus=record.sourceReferences.filter(ref=>ref.focusRects?.some(rect=>rect.id===row.sourceReference?.sourceFocusId));
  if(!binding||row.sourceReference.evidenceBindings.length!==1||!region||region.role!=='row'||region.sourceRowId!==row.id||region.sourcePointer!==`/table/rows/${index}`||binding.itemId!==owner||binding.collection!=='rules'||binding.fieldPointer!==`/table/rows/${index}`||binding.sourceOwner?.collection!=='rules'||binding.sourceOwner?.itemId!==owner||binding.catalog!==activePath||binding.book!==book||binding.printedPage!==record.pages[0]||binding.pdfPage!==record.pages[0]+1||!region.focusRects.length||focus.length!==1)structuralErrors.push(`${book}/${row.id}: owner/pointer/region/focus binding does not close`);
  rowTargets.push({rowId:row.id,regionId,fieldPointer:binding?.fieldPointer||null});
 });
 if(new Set(record.table.rows.map(row=>row.id)).size!==record.table.rows.length)structuralErrors.push(`${book}: row IDs are not unique`);
 if(new Set(rowTargets.map(target=>target.regionId)).size!==record.table.rows.length)structuralErrors.push(`${book}: row targets do not use one unique region each`);
 byBook[book]={owner,rowCount:record.table.rows.length,valueCellCount:sourceRows.reduce((sum,row)=>sum+1+row.rangeBands.length+row.adjustments.length,0),catalogRegionCount:catalog.regions.length,rowTargetCount:rowTargets.length};
}
const recordsById=new Map(candidate.records.map(record=>[record.book,record]));
const phb=recordsById.get('PHB'),ua=recordsById.get('UA');
const uaIds=new Set(ua.table.rows.map(row=>row.id));
for(const row of phb.table.rows){
 const counterpart=ua.table.rows.find(candidateRow=>candidateRow.id===row.id);
 if(!counterpart){structuralErrors.push(`Shared source row missing from UA table: ${row.id}`);continue;}
 counts.sharedRows++;
 for(const columnId of expectedSharedColumns()){
  const left=row.cells.find(cell=>cell.columnId===columnId)?.raw;
  const right=counterpart.cells.find(cell=>cell.columnId===columnId)?.raw;
  if(left!==right)structuralErrors.push(`${row.id}/${columnId}: shared source values differ (${left} vs ${right})`);
  else counts.sharedCellMatches++;
 }
 uaIds.delete(row.id);
}
counts.uaOnlyRows=uaIds.size;
if(counts.sharedRows!==15||counts.sharedCellMatches!==195||counts.uaOnlyRows!==9)structuralErrors.push('Source overlap/addition denominator mismatch');
function expectedSharedColumns(){return ['fire-rate','range-short','range-medium','range-long',...Array.from({length:9},(_,i)=>`ac-${i+2}`)];}

const bad=JSON.parse(read('research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json'));
const badBytes=read('research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json');
if(sha(badBytes)!=='fda09edec63001ee80bda4f06f25429c2189034a2fff5b29b3bb7dc64ae9e10c'||bad.valueCellsCompared!==555||bad.candidateValueErrors!==30||bad.rowTargetStructureFindings.filter(finding=>finding.rowId).length!==39)structuralErrors.push('Root pre-fix negative-control artifact does not match its pinned expected counts');
const report={schemaVersion:1,artifactType:'missile-table-source-cell-reconciliation-candidate',status:structuralErrors.length||mismatches.length?'failed-candidate-reconciliation':'all-555-source-cells-and-39-row-targets-reconcile; independent focus/source-note review still pending',scope:'Reconciles candidate values against the independent root transcription of the complete PHB p.38/PDF39 and UA p.28/PDF29 source images. This is not a source-value publication grade, source-note review, focus approval, sourceExcerpt registration, or active mapping.',inputs:{independentSourceReview:{path:sourcePath,sha256:sourceSha},candidateRecords:{path:'research/missile-table-discoverability/implementation-candidate/rules-records-candidate.json',sha256:sha(candidateBytes)},preFixNegativeControl:{path:'research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json',sha256:sha(badBytes)}},counts,byBook,mismatches,structuralErrors,negativeControl:{artifact:badBytes?{path:'research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json',sha256:sha(badBytes),candidateValueErrors:bad.candidateValueErrors,affectedRows:bad.affectedRows,rowTargetFailures:bad.rowTargetStructureFindings.length}:null,interpretation:'The root-preserved pre-fix candidate had 30 wrong value cells and 39 invalid row-target findings. This candidate reconciliation runs against the independent source transcription, and current mutations are also covered by a test that must fail on a changed source cell or row target.'}};
writeFileSync(path.join(out,'source-cell-reconciliation-candidate.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,counts,mismatches:mismatches.length,structuralErrors,sha256:sha(readFileSync(path.join(out,'source-cell-reconciliation-candidate.json')))},null,2));
if(mismatches.length||structuralErrors.length)process.exitCode=1;
