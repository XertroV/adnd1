import {readFileSync} from 'node:fs';
const before=JSON.parse(readFileSync(new URL('./matrix-before-cell-review.json',import.meta.url),'utf8')).matrices[0];
// Undo only the approved cell additions and their associated coverage metadata.
export function reverseMatrixCellReview(matrices) {
 return matrices.map(matrix=>{
  if(matrix.id!==before.id)return matrix;
  const copy=structuredClone(matrix);
  copy.rows.forEach((row,i)=>row.targets.forEach((_,j)=>{
   if(before.rows[i].targets[j]===null)row.targets[j]=null;
  }));
  copy.notes[0]=before.notes[0];
  copy.coverage=structuredClone(before.coverage);
  delete copy.cellVerification;
  return copy;
 });
}
