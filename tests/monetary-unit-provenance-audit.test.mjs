import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadAuditInputs} from '../tools/quantity-source-absence-audit.mjs';
import {collectMonetaryRowIdentityRecords} from '../tools/monetary-row-identity-audit.mjs';
import {
 buildMonetaryUnitProvenanceReport,classifyUnitFieldProvenance,loadFrozenUnitInventoryBaseline,
 scanUnitRelatedScalarFields,validateMonetaryUnitProvenanceReport,
 expectedWhaleUnitBeforeSha256,expectedWhaleUnitNullSha256,expectedWhaleCarcassUnitSha256,
 quantityUnitBeforeSha256,
} from '../tools/monetary-unit-provenance-audit.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function setAt(data,pointer,value){
 const parts=pointer.slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));
 let target=data;for(const part of parts.slice(0,-1))target=Array.isArray(target)?target[Number(part)]:target[part];
 target[parts.at(-1)]=value;
}
function documentsWithAmbergrisUnit(value){
 const docs=loadAuditInputs().map(doc=>({...doc,data:structuredClone(doc.data)}));
 const refs=[
  ['canonical','/sourcePageCensuses/2/claims/36/unit'],
  ['canonical','/sourcePageCensuses/2/sourceArtifact/claims/36/unit'],
  ['receipts','/claimReceipts/153/typedClaim/unit'],
  ['monsterCensus','/claims/36/unit'],
 ];
 for(const [key,pointer]of refs){const doc=docs.find(item=>item.key===key);setAt(doc.data,pointer,value);doc.bytes=Buffer.from(JSON.stringify(doc.data,null,2)+'\n');doc.sha256=digest(doc.bytes);}
 return docs;
}
function recordsFor(documents){return collectMonetaryRowIdentityRecords(new Map(documents.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).records;}
function currentReport(options={}){
 const documents=options.documents||loadAuditInputs(),records=recordsFor(documents);
 return {documents,records,report:buildMonetaryUnitProvenanceReport({documents,records,...options})};
}

test('current inventory retains full denominators and binds the immutable before snapshot',()=>{
 const {documents,records,report}=currentReport();
 const frozen=loadFrozenUnitInventoryBaseline();
 assert.equal(documents.length,10);
 assert.equal(records.length,2161);
 assert.equal(report.baseline.inputs.length,10);
 assert.equal(report.scope.monetaryRowIdentityRecordCount,2161);
 assert.equal(report.scope.allRawScalarLeaves,report.baseline.inputs.reduce((n,row)=>n+row.scalarLeaves,0));
 assert.equal(report.scope.unitQuantityIntervalSourceBasisFieldLeaves,report.fieldRows.length);
 assert.equal(report.monetaryRecordInventory.length,2161);
 assert.equal(report.monetaryRecordInventory.filter(row=>row.matchedUnitQuantityFields.length).length,report.scope.monetaryRecordsWithMatchedFields);
 assert.equal(report.beforeBaseline.sha256,quantityUnitBeforeSha256);
 assert.equal(frozen.baselineSha256,quantityUnitBeforeSha256);
 assert.match(report.baseline.inputs.find(row=>row.key==='canonical').sha256,/^[a-f0-9]{64}$/);
 assert.equal(validateMonetaryUnitProvenanceReport(report,{documents,records}),true);
});

test('frozen Whale targets and positive carcass fixture are hash-bound separately from current state',()=>{
 const {report}=currentReport();
 const ambergris=report.sourceWitnesses.whaleAmbergris,carcass=report.sourceWitnesses.whaleCarcass;
 assert.equal(ambergris.classification,'editorial');
 assert.equal(ambergris.classificationAppliesTo,'the exact pre-correction value in the frozen before inventory only');
 assert.equal(carcass.classification,'explicit-printed');
 assert.equal(ambergris.baselinePointerValues.length,4);
 assert.equal(ambergris.proposedCorrection.targetPointers.length,4);
 assert.deepEqual(ambergris.baselinePointerValues.map(row=>[row.inputKey,row.jsonPointer,row.valueSha256]),[
  ['canonical','/sourcePageCensuses/2/claims/36/unit',expectedWhaleUnitBeforeSha256],
  ['canonical','/sourcePageCensuses/2/sourceArtifact/claims/36/unit',expectedWhaleUnitBeforeSha256],
  ['receipts','/claimReceipts/153/typedClaim/unit',expectedWhaleUnitBeforeSha256],
  ['monsterCensus','/claims/36/unit',expectedWhaleUnitBeforeSha256],
 ]);
 assert.deepEqual(ambergris.proposedCorrection.targetPointers.map(row=>[row.inputKey,row.jsonPointer,row.valueSha256]),[
  ['canonical','/sourcePageCensuses/2/claims/36/unit',expectedWhaleUnitBeforeSha256],
  ['canonical','/sourcePageCensuses/2/sourceArtifact/claims/36/unit',expectedWhaleUnitBeforeSha256],
  ['receipts','/claimReceipts/153/typedClaim/unit',expectedWhaleUnitBeforeSha256],
  ['monsterCensus','/claims/36/unit',expectedWhaleUnitBeforeSha256],
 ]);
 assert.ok(carcass.pointerValues.every(row=>row.valueSha256===expectedWhaleCarcassUnitSha256));
 assert.ok(ambergris.proposedCorrection.preservedFields.length>0);
 assert.ok(ambergris.proposedCorrection.preservedFields.every(row=>row.matchesBefore));
 assert.ok(ambergris.proposedCorrection.preservedFields.some(row=>row.fieldName==='amountOrFormula'));
 assert.ok(ambergris.proposedCorrection.preservedFields.some(row=>row.fieldName==='currency'));
 assert.ok(ambergris.proposedCorrection.preservedFields.some(row=>row.fieldName==='conditions'));
 assert.equal(ambergris.currentState.sourceAbsenceProof,false);
 assert.equal(ambergris.proposedCorrection.sourceAbsenceProof,false);
 assert.ok(ambergris.pointerValues.every(row=>/^[a-f0-9]{64}$/.test(row.valueSha256)));
});

test('approved exact null correction remains unassessable and null itself is never absence proof',()=>{
 const documents=documentsWithAmbergrisUnit(null),records=recordsFor(documents),{report}=currentReport({documents,records});
 const ambergris=report.sourceWitnesses.whaleAmbergris;
 assert.equal(ambergris.currentState.currentState,'approved-null-correction-applied');
 assert.equal(ambergris.currentState.sourceAbsenceProof,false);
 assert.ok(ambergris.pointerValues.every(row=>row.valueSha256===expectedWhaleUnitNullSha256));
 for(const row of ambergris.pointerValues){
  const field=report.fieldRows.find(item=>item.inputKey===row.inputKey&&item.jsonPointer===row.jsonPointer);
  assert.equal(field.classification,'unassessable');
  assert.equal(field.sourceReviewStatus,'exact null correction matches the hash-bound approved review');
 }
 assert.equal(validateMonetaryUnitProvenanceReport(report,{documents,records}),true);
});

test('null without a verified receipt stays pending and unassessable',()=>{
 const documents=documentsWithAmbergrisUnit(null),records=recordsFor(documents),{report}=currentReport({documents,records,reviewReceiptPath:null});
 const ambergris=report.sourceWitnesses.whaleAmbergris;
 assert.equal(report.approvedReviewReceipt,null);
 assert.equal(ambergris.currentState.currentState,'null-metadata-without-approved-review');
 assert.equal(ambergris.currentState.sourceAbsenceProof,false);
 for(const ref of ambergris.pointerValues){
  const field=report.fieldRows.find(item=>item.inputKey===ref.inputKey&&item.jsonPointer===ref.jsonPointer);
  assert.equal(field.classification,'unassessable');
  assert.equal(field.curatedCaseId,'whaleAmbergris');
  assert.equal(field.sourceReviewStatus,'null metadata without an approved current review receipt');
 }
 assert.equal(validateMonetaryUnitProvenanceReport(report,{documents,records,reviewReceiptPath:null}),true);
});

test('an arbitrary changed Whale unit is not auto-curated',()=>{
 const documents=documentsWithAmbergrisUnit('per pound'),records=recordsFor(documents),{report}=currentReport({documents,records});
 const ambergris=report.sourceWitnesses.whaleAmbergris;
 assert.equal(ambergris.currentState.currentState,'unrecognized-current-value');
 for(const ref of ambergris.pointerValues){
  const field=report.fieldRows.find(item=>item.inputKey===ref.inputKey&&item.jsonPointer===ref.jsonPointer);
  assert.equal(field.classification,'missing-provenance');
  assert.equal(field.curatedCaseId,null);
 }
});

test('unreviewed units and null unit metadata never become semantic source-absence passes',()=>{
 assert.equal(classifyUnitFieldProvenance({fieldName:'unit',value:null}),'unassessable');
 assert.equal(classifyUnitFieldProvenance({fieldName:'unit',value:'per item'}),'missing-provenance');
 assert.equal(classifyUnitFieldProvenance({fieldName:'quantityOrScale',value:null}),'unassessable');
 assert.equal(classifyUnitFieldProvenance({fieldName:'sourceBasis',value:'table heading'}),'unassessable');
 assert.equal(classifyUnitFieldProvenance({fieldName:'unit',value:'x',manualClassification:'editorial'}),'editorial');
});

test('raw scanner counts new fields and finds unit fields by pointer without emitting their text',()=>{
 const scan=scanUnitRelatedScalarFields({rows:[{quantity:null,unit:'per bundle',interval:2,sourceBasis:'table header',comment:'one dose'}]});
 assert.equal(scan.scalarLeaves,5);
 assert.deepEqual(scan.fields.map(row=>row.jsonPointer).sort(),['/rows/0/interval','/rows/0/quantity','/rows/0/sourceBasis','/rows/0/unit']);
 assert.ok(scan.fields.every(row=>!Object.hasOwn(row,'value')));
 assert.ok(scan.fields.every(row=>/^[a-f0-9]{64}$/.test(row.valueSha256)));
});

test('validator rejects a changed live unit-field hash',()=>{
 const {documents,records,report}=currentReport();
 const changed=structuredClone(report);changed.fieldRows[0].valueSha256='0'.repeat(64);
 assert.throws(()=>validateMonetaryUnitProvenanceReport(changed,{documents,records}),/Field pointer\/hash\/type mismatch/);
});
