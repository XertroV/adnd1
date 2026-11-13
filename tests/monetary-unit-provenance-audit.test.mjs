// Historical MM replay: preserved a29 assertions run against the fixed historical stage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from '../research/class-mapping-history-v1/mm-replay-child-process-v2.mjs';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import {dirname,resolve} from 'node:path';
import {historicalMmTestRoot,assertHistoricalMmTestStage} from '../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {loadAuditInputs} from '../research/class-mapping-history-v1/replay-tools/quantity-source-absence-audit.mjs';
import {collectMonetaryRowIdentityRecords} from '../research/class-mapping-history-v1/replay-tools/monetary-row-identity-audit.mjs';
import {
 buildMonetaryUnitProvenanceReport,classifyUnitFieldProvenance,loadFrozenUnitInventoryBaseline,
 scanUnitRelatedScalarFields,validateMonetaryUnitProvenanceReport,
 expectedWhaleUnitBeforeSha256,expectedWhaleUnitNullSha256,expectedWhaleCarcassUnitSha256,
 quantityUnitBeforeSha256,joUnitAdmissionBeforePath,joUnitAdmissionBeforeSha256,expectedCurrentUnitRecordCount,expectedJoUnitRecord,
} from '../research/class-mapping-history-v1/replay-tools/monetary-unit-provenance-audit-mm-v2.mjs';
import {
 buildWhalePerPoundCounterfactualReport,inputPins as whaleHInputPins,dependencyPins as whaleHDependencyPins,
} from '../research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/whale-counterfactual-context-v5.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
assertHistoricalMmTestStage();
const repoRoot=historicalMmTestRoot;
function setAt(data,pointer,value){
 const parts=pointer.slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));
 let target=data;for(const part of parts.slice(0,-1))target=Array.isArray(target)?target[Number(part)]:target[part];
 target[parts.at(-1)]=value;
}
function documentsWithAmbergrisUnit(value,sourceDocuments=loadAuditInputs()){
 const docs=sourceDocuments.map(doc=>({...doc,data:structuredClone(doc.data)}));
 const refs=[
  ['canonical','/sourcePageCensuses/2/claims/36/unit'],
  ['canonical','/sourcePageCensuses/2/sourceArtifact/claims/36/unit'],
  ['receipts','/claimReceipts/153/typedClaim/unit'],
  ['monsterCensus','/claims/36/unit'],
 ];
 for(const [key,pointer]of refs){const doc=docs.find(item=>item.key===key);setAt(doc.data,pointer,value);doc.bytes=Buffer.from(JSON.stringify(doc.data,null,2)+'\n');doc.sha256=digest(doc.bytes);}
 return docs;
}
function recordsFor(documents,collector=collectMonetaryRowIdentityRecords){return collector(new Map(documents.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).records;}
function currentReport(options={}){
 const documents=options.documents||loadAuditInputs(),records=recordsFor(documents);
 return {documents,records,report:buildMonetaryUnitProvenanceReport({documents,records,...options})};
}

// V5 is a deliberately frozen H-era semantic regression. Build only its pinned
// historical inputs in a temporary source view; never run its H assertions on
// the current MM worktree or copy a complete historical checkout.
function withHistoricalWhaleHSourceRoot(){
 const sourceCommit='2b4425314053d429492b19114859ca4a084e7404';
 const root=mkdtempSync(resolve(tmpdir(),'whale-v5-historical-h-source-'));
 const git=(...args)=>execFileSync('git',['-C',repoRoot,...args],{maxBuffer:128*1024*1024});
 const show=path=>git('show',`${sourceCommit}:${path}`);
 const addPath=(set,path)=>{
  if(typeof path==='string'&&(/^(?:dist|research|tests|tools)\//.test(path)||/^[A-Za-z0-9._-]+$/.test(path))&&!path.split('/').includes('..'))set.add(path);
 };
 const files=new Set([
  ...whaleHInputPins.map(row=>row.path),...Object.keys(whaleHDependencyPins),
  'dist/books.js','dist/app.js','dist/source-viewer.js','equipment.json','rules.json',
  'research/field-evidence-bindings.json','research/mechanics-audit-progress.json',
  'research/monetary-source-render-frames.json',
  'research/source-audit-batch5-pd179-v5-fresh-frame-replay-independent-review.json',
  'research/source-audit-batch5-pd179-v5-crop-frame-bindings-independent-review.json',
  'research/quantity-source-absence-detector-baseline.json','research/quantity-source-absence-before-calibrations.json',
  'research/quantity-unit-provenance-before-v1.json','research/source-audit-batch5-whale-unit-root-independent-review-v3.json',
  'research/monetary-source-inventory.json',
  'research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/whale-counterfactual-context-v5.mjs',
  'research/dmg175-validation-coordinator-v1/jo-current-successor-v1/registration-v1.json',
  'research/source-audit-batch6-jo-unextracted-price.json',
  'tests/fixtures/whale-unit-exact-inputs-and-proposal-before-root.json.gz',
  'tests/fixtures/monetary-unit-provenance-jo-2162-before.json.gz',
 ]);
 const index=JSON.parse(show('research/monetary-source-inventory.json').toString('utf8'));
 for(const ref of [...index.inputArtifacts,...index.currentInputValidation.validationArtifacts])addPath(files,ref.path);
 const joArtifacts=[
  'research/dmg175-validation-coordinator-v1/jo-current-successor-v1/registration-v1.json',
  'research/source-audit-batch6-jo-unextracted-price.json',
 ];
 for(const path of joArtifacts){
  const value=JSON.parse(show(path).toString('utf8'));
  const visit=node=>{
   if(!node||typeof node!=='object')return;
   if(!Array.isArray(node)&&typeof node.path==='string'&&typeof node.sha256==='string')addPath(files,node.path);
   for(const child of Object.values(node))visit(child);
  };
  visit(value);
 }
 const rawPaths=['dist/data.json','research/price-source-inventory.json','research/field-evidence-bindings.json','equipment.json','rules.json','dist/books.js','dist/app.js','dist/source-viewer.js'];
 for(const path of rawPaths)addPath(files,path);
 const queuedJson=new Set(joArtifacts),visitedJson=new Set();
 // Follow only the bounded Jo registration and legacy-evidence references.
 for(let pass=0;pass<4&&queuedJson.size;pass++){
  const next=new Set();
  for(const path of queuedJson){
   if(visitedJson.has(path)||!path.endsWith('.json'))continue;
   visitedJson.add(path);
   let value;try{value=JSON.parse(show(path).toString('utf8'));}catch{continue;}
   const visit=node=>{
    if(!node||typeof node!=='object')return;
    if(!Array.isArray(node)&&typeof node.path==='string'&&typeof node.sha256==='string'
      &&/\.(?:json|json\.gz|gz|mjs|js)$/.test(node.path)&&/^(?:dist|research|tests|tools)\//.test(node.path)){
     addPath(files,node.path);
     if(node.path.endsWith('.json')&&!visitedJson.has(node.path))next.add(node.path);
    }
    for(const child of Object.values(node))visit(child);
   };
   visit(value);
  }
  queuedJson.clear();for(const path of next)queuedJson.add(path);
 }
 let changed=true;
 while(changed){
  changed=false;
  for(const path of [...files].filter(path=>path.endsWith('.mjs'))){
   const source=show(path).toString('utf8');
   for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
    const dependency=resolve(dirname(`/${path}`),match[1]).slice(1);
    if(/^(?:dist|research|tests|tools)\//.test(dependency)&&!files.has(dependency)){files.add(dependency);changed=true;}
   }
  }
 }
 for(const path of files){
  const bytes=show(path),destination=resolve(root,path);
  mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,bytes);
 }
 execFileSync('git',['init','--quiet',root]);
 writeFileSync(resolve(root,'.git/HEAD'),`${sourceCommit}\n`);
 mkdirSync(resolve(root,'.git/objects/info'),{recursive:true});
 const common=git('rev-parse','--path-format=absolute','--git-common-dir').toString('utf8').trim();
 writeFileSync(resolve(root,'.git/objects/info/alternates'),`${resolve(common,'objects')}\n`);
 return {
  root,
  dispose(){rmSync(root,{recursive:true,force:true});},
 };
}

test('current inventory retains full denominators and binds the immutable before snapshot',()=>{
 const {documents,records,report}=currentReport();
 const frozen=loadFrozenUnitInventoryBaseline();
 assert.equal(documents.length,10);
 assert.equal(records.length,expectedCurrentUnitRecordCount);
 assert.equal(report.baseline.inputs.length,10);
 assert.equal(report.scope.monetaryRowIdentityRecordCount,expectedCurrentUnitRecordCount);
 assert.equal(report.scope.allRawScalarLeaves,report.baseline.inputs.reduce((n,row)=>n+row.scalarLeaves,0));
 assert.equal(report.scope.unitQuantityIntervalSourceBasisFieldLeaves,report.fieldRows.length);
 assert.equal(report.monetaryRecordInventory.length,expectedCurrentUnitRecordCount);
 assert.equal(report.monetaryRecordInventory.filter(row=>row.matchedUnitQuantityFields.length).length,report.scope.monetaryRecordsWithMatchedFields);
 assert.equal(report.beforeBaseline.sha256,quantityUnitBeforeSha256);
 assert.equal(report.status,'current-MM structural inventory; source provenance unassessed except exact hash-bound review fixtures');
 assert.equal(report.currentSourceEpoch.sourceCommit,'0f2d70a135e3ad486152bf00f21387d60a1a97ef');
 assert.equal(report.currentSourceEpoch.sourceTree,'08010faf457df22cdb0a5ec35d2dcf79e622ade9');
 assert.equal(frozen.baselineSha256,quantityUnitBeforeSha256);
 assert.match(report.baseline.inputs.find(row=>row.key==='canonical').sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(report.joUnitAdmission.additionalRecordUids,[expectedJoUnitRecord.uid]);
 assert.equal(report.joUnitAdmission.historicalRecordCount,2161);
 assert.equal(report.joUnitAdmission.currentRecordCount,expectedCurrentUnitRecordCount);
 assert.equal(report.joUnitAdmission.record.recordSha256,expectedJoUnitRecord.recordSha256);
 assert.equal(report.joUnitAdmission.record.rowIdentitySha256,expectedJoUnitRecord.rowIdentitySha256);
 assert.deepEqual(report.joUnitAdmission.record.matchedUnitQuantityFields,[]);
 assert.equal(report.joUnitAdmission.sourceState.priceState,'unextracted');
 assert.equal(report.joUnitAdmission.sourceState.unitProvenance,'unassessable');
 assert.equal(report.joUnitAdmission.sourceState.sourcePriceAbsenceReviewed,false);
 assert.equal(report.joUnitAdmission.sourceState.sourceAbsenceProof,false);
 assert.ok(report.joUnitAdmission.registration.sourceEvidenceRefs.length>=2);
 assert.ok(report.joUnitAdmission.registration.sourceEvidenceRefs.every(ref=>/^[a-f0-9]{64}$/.test(ref.sha256)));
 assert.equal(report.fieldRows.some(row=>row.monetaryRecordRefs.includes(expectedJoUnitRecord.uid)),false,'the admitted Jo claim has no typed unit/quantity leaf to classify');
 assert.equal(validateMonetaryUnitProvenanceReport(report,{documents,records}),true);
});

test('frozen Jo admission before capture preserves the old 2161 IDs, full 2162 current universe and pre-fix failures',()=>{
 const bytes=readFileSync(resolve(repoRoot,joUnitAdmissionBeforePath));
 assert.equal(digest(bytes),joUnitAdmissionBeforeSha256);
 const capture=JSON.parse(gunzipSync(bytes).toString('utf8'));
 assert.equal(capture.artifactType,'batch6-jo-monetary-unit-provenance-before-implementation');
 assert.equal(capture.capture.currentToolSha256,'34e432e7968db28cfa8efca7ef6a19b9180051182b1e2ace452b48cc770b1420');
 assert.equal(capture.capture.oldUnitGuardFailure,'Expected 2,161 monetary row-identity records; found 2162.');
 assert.equal(capture.historicalBaseline.frozenRecordCount,2161);
 assert.equal(capture.historicalBaseline.frozenUnitFileSha256,quantityUnitBeforeSha256);
 assert.equal(capture.historicalBaseline.frozenUnitRecordUids.length,2161);
 assert.equal(new Set(capture.historicalBaseline.frozenUnitRecordUids).size,2161);
 assert.equal(capture.currentFullUnitReport.scope.monetaryRowIdentityRecordCount,expectedCurrentUnitRecordCount);
 assert.equal(capture.currentFullUnitReport.monetaryRecordInventory.length,expectedCurrentUnitRecordCount);
 assert.equal(capture.scope.fieldRowCount,7771);
 assert.deepEqual(capture.scope.fieldClassificationCounts,{'explicit-printed':4,editorial:0,'missing-provenance':1908,unassessable:5859});
 const oldUids=new Set(capture.historicalBaseline.frozenUnitRecordUids);
 const currentUids=new Set(capture.currentFullUnitReport.monetaryRecordInventory.map(row=>row.uid));
 assert.equal(currentUids.size,expectedCurrentUnitRecordCount);
 assert.deepEqual([...currentUids].filter(uid=>!oldUids.has(uid)),[expectedJoUnitRecord.uid]);
 assert.equal([...oldUids].filter(uid=>!currentUids.has(uid)).length,0);
 assert.equal(capture.joAdmission.uid,expectedJoUnitRecord.uid);
 assert.equal(capture.joAdmission.recordSha256,expectedJoUnitRecord.recordSha256);
 assert.equal(capture.joAdmission.currentJoRegistrationSha256,'1e24b97d355cf2502a2f775d093652cf37675907aae8ffdc63d432d8908df5f5');
 assert.equal(capture.joAdmission.classification,'unassessable pending; unknown purchase amount/unit, not printed-source omission');
 assert.deepEqual(capture.historicalBaseline.oldSuiteFailureArchive.testCounts,{total:740,pass:694,fail:46});
 assert.equal(capture.historicalBaseline.oldSuiteFailureArchive.sha256,'996d78b409ab7d612ee02c752f0cae133a1c88430f2d27e77a8796936ab7cc12');
});

test('current unit universe admits only the frozen 2161 IDs plus the exact Jo unextracted record',()=>{
 const {documents,records,report}=currentReport();
 const withoutJo=records.filter(record=>record.uid!==expectedJoUnitRecord.uid);
 assert.throws(()=>buildMonetaryUnitProvenanceReport({documents,monetaryRecords:withoutJo}),/exact 2,161 historical IDs and one Jo registration/);
 const withUnknown=records.filter(record=>record.uid!==expectedJoUnitRecord.uid).map(record=>structuredClone(record));
 withUnknown.push({...structuredClone(records.find(record=>record.uid===expectedJoUnitRecord.uid)),uid:'site-price-claim:unregistered-unknown'});
 assert.throws(()=>buildMonetaryUnitProvenanceReport({documents,monetaryRecords:withUnknown}),/differs from the 2,161 historical IDs plus the exact Jo registration/);
 const mutatedJo=structuredClone(records);
 const jo=mutatedJo.find(record=>record.uid===expectedJoUnitRecord.uid);
 jo.recordSha256='0'.repeat(64);
 assert.throws(()=>buildMonetaryUnitProvenanceReport({documents,monetaryRecords:mutatedJo}),/exact source-unknown unextracted-price identity/);
 const sourceLaundered=structuredClone(records);
 sourceLaundered.find(record=>record.uid===expectedJoUnitRecord.uid).source.book='UA';
 assert.throws(()=>buildMonetaryUnitProvenanceReport({documents,monetaryRecords:sourceLaundered}),/exact source-unknown unextracted-price identity/);
 const claimedAbsent=structuredClone(report);
 claimedAbsent.joUnitAdmission.sourceState.sourceAbsenceProof=true;
 assert.throws(()=>validateMonetaryUnitProvenanceReport(claimedAbsent,{documents,records}),/Jo unit admission does not match the exact hash-bound/);
 const alteredHash=structuredClone(report);
 alteredHash.joUnitAdmission.registration.sha256='0'.repeat(64);
 assert.throws(()=>validateMonetaryUnitProvenanceReport(alteredHash,{documents,records}),/Jo unit admission does not match the exact hash-bound/);
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
 assert.equal(report.status,'synthetic input mutation projection; not a current-MM report');
 assert.equal(report.currentSourceEpoch,null);
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

test('an arbitrary changed Whale unit is not auto-curated',async()=>{
 const historical=withHistoricalWhaleHSourceRoot();
 try{
  const historicalQuantity=await import(pathToFileURL(resolve(historical.root,'tools/quantity-source-absence-audit.mjs')).href);
  const historicalCollector=await import(pathToFileURL(resolve(historical.root,'tools/monetary-row-identity-audit.mjs')).href);
  const baselineDocuments=historicalQuantity.loadAuditInputs({repoRoot:historical.root});
  const documents=documentsWithAmbergrisUnit('per pound',baselineDocuments);
  const records=recordsFor(documents,historicalCollector.collectMonetaryRowIdentityRecords);
  const {report}=await buildWhalePerPoundCounterfactualReport({documents,records,
   recordsBuilder:historicalCollector.collectMonetaryRowIdentityRecords,repoRoot:historical.root,sourceRepoRoot:historical.root});
  const ambergris=report.sourceWitnesses.whaleAmbergris;
  assert.equal(ambergris.currentState.currentState,'unrecognized-current-value');
  for(const ref of ambergris.pointerValues){
   const field=report.fieldRows.find(item=>item.inputKey===ref.inputKey&&item.jsonPointer===ref.jsonPointer);
   assert.equal(field.classification,'missing-provenance');
   assert.equal(field.curatedCaseId,null);
  }
 }finally{historical.dispose();}
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
