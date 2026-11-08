import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {auditSourceMatrices,sourceMatrixFamilies} from '../tools/source-completeness-matrix-audit.mjs';

const before=JSON.parse(gunzipSync(readFileSync(new URL('../research/source-completeness-matrix-before.json.gz',import.meta.url))));

test('preserved actual before data detects all three missing structured matrices',()=>{
  for(const file of before.files){
    assert.equal(Buffer.byteLength(file.utf8),file.sizeBytes);
    assert.equal(createHash('sha256').update(file.utf8).digest('hex'),file.sha256);
  }
  const data=JSON.parse(before.files.find(file=>file.path==='dist/data.json').utf8);
  const report=auditSourceMatrices(data);
  assert.equal(report.currentMatrixRecordCount,1);
  assert.equal(report.sourceTableDenominator,3);
  assert.equal(report.sourceCellDenominator,378);
  assert.equal(report.tablesWithStructuralGaps,3);
  assert.ok(report.tables.every(table=>table.status==='structured-source-table-absent'));
});

test('a shape-complete table does not manufacture numeric source verification',()=>{
  const family=sourceMatrixFamilies[0];
  const matrix={id:family.id,book:'DMG',pages:[74],armorClasses:Array.from({length:21},(_,i)=>10-i),rows:Array.from({length:7},()=>({targets:Array(21).fill(0)}))};
  const report=auditSourceMatrices({matrices:[matrix]});
  assert.equal(report.tables[0].status,'structured-cells-present');
  assert.equal(report.tables[0].numericSourceVerification,'not-established-by-structural-detector');
  assert.equal(report.sourceNumericCompleteness,'not-proved-by-structure-or-cell-count');
  matrix.rows[0].targets[0]=null;
  assert.ok(auditSourceMatrices({matrices:[matrix]}).tables[0].issues.includes('numeric-row-incomplete'));
  matrix.rows[0].targets[0]=0;matrix.pages=[75];
  assert.ok(auditSourceMatrices({matrices:[matrix]}).tables[0].issues.includes('source-page-identity-mismatch'));
});
