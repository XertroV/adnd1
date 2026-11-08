import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// These are source-first table identities, not a list inferred from site titles.
// DMG printed74/PDF75 was inspected independently before the data repair.
export const sourceMatrixFamilies = Object.freeze([
  {id:'dmg-cleric-druid-monk-attack-matrix',sourceHeading:'I.A.',levelBands:7,numericCells:147},
  {id:'dmg-magic-user-illusionist-attack-matrix',sourceHeading:'I.C.',levelBands:5,numericCells:105},
  {id:'dmg-thief-assassin-attack-matrix',sourceHeading:'I.D.',levelBands:6,numericCells:126},
]);

export function auditSourceMatrices(data) {
  const matrices=Array.isArray(data?.matrices)?data.matrices:[];
  const expectedArmorClasses=Array.from({length:21},(_,index)=>10-index);
  const tables=sourceMatrixFamilies.map(family=>{
    const matches=matrices.filter(matrix=>matrix.id===family.id);
    const matrix=matches[0];
    const issues=[];
    if(matches.length===0)issues.push('structured-source-table-absent');
    if(matches.length>1)issues.push('duplicate-source-table-id');
    if(matrix){
      if(matrix.book!=='DMG'||!Array.isArray(matrix.pages)||!matrix.pages.includes(74))issues.push('source-page-identity-mismatch');
      if(JSON.stringify(matrix.armorClasses)!==JSON.stringify(expectedArmorClasses))issues.push('armor-class-axis-incomplete');
      if(!Array.isArray(matrix.rows)||matrix.rows.length!==family.levelBands)issues.push('attacker-band-axis-incomplete');
      for(const row of matrix.rows||[]){
        if(!Array.isArray(row.targets)||row.targets.length!==21||row.targets.some(value=>!Number.isInteger(value)))issues.push('numeric-row-incomplete');
      }
    }
    const numericCells=(matrix?.rows||[]).reduce((count,row)=>count+(row.targets||[]).filter(Number.isInteger).length,0);
    return {...family,source:{book:'DMG',printedPage:74,pdfPage:75},
      status:issues.length?issues[0]:'structured-cells-present',issues:[...new Set(issues)],
      currentNumericCells:numericCells,
      numericSourceVerification:'not-established-by-structural-detector',
      qualifiersAndFootnotes:'require-independent-source-review'};
  });
  return {schemaVersion:1,scope:'Three independently identified non-fighter DMG74 source tables only; all supplied-book source units remain a separate inventory.',
    sourceTableDenominator:3,sourceCellDenominator:378,currentMatrixRecordCount:matrices.length,tables,
    tablesWithStructuralGaps:tables.filter(table=>table.issues.length).length,
    sourceNumericCompleteness:'not-proved-by-structure-or-cell-count'};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const path=process.argv[2]||'dist/data.json';
  const report=auditSourceMatrices(JSON.parse(readFileSync(path,'utf8')));
  console.log(JSON.stringify(report,null,2));
}
