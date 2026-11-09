import {readFileSync} from 'node:fs';
const {records}=JSON.parse(readFileSync(new URL('./rules-records-before.json',import.meta.url),'utf8'));
const [phb,ua]=records.map(record=>record.table.rows);
const uaById=new Map(ua.map(row=>[row.id,row]));
console.log('Classification: pre-fix candidate transcription comparison; not source-verified.');
console.log('Mechanism: compares candidate-record values by AC labels. Any differences are candidate transcription differences, not findings about the printed books.');
for(const row of phb){
 const counterpart=uaById.get(row.id);
 const phbCells=Object.fromEntries(row.cells.filter(cell=>cell.columnId.startsWith('ac-')).map(cell=>[cell.columnId,cell.raw]));
 const uaCells=Object.fromEntries(counterpart.cells.filter(cell=>cell.columnId.startsWith('ac-')).map(cell=>[cell.columnId,cell.raw]));
 const differences=Object.keys(phbCells).filter(columnId=>phbCells[columnId]!==uaCells[columnId]).map(columnId=>`${columnId.slice(3)}:${phbCells[columnId]}→${uaCells[columnId]}`);
 if(differences.length)console.log(`${row.id}: ${differences.join(' ')}`);
}
