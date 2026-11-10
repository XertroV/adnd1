import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

import {
 buildCurrentBaselineContextReport,buildWhalePerPoundCounterfactualReport,
 createWhalePerPoundDocuments,validateCurrentBaselineDocuments,validatePinnedCurrentDocuments,
 validateWhaleCounterfactualDocuments,validateCounterfactualReport,inputPins,dependencyPins,
 whaleUnitDeltas,expectedCurrentJoRecord,canonical,
} from './whale-counterfactual-context-v5.mjs';

const root=resolve(import.meta.dirname,'../../../../..');
const outDir=import.meta.dirname;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const isoNow=()=>new Date().toISOString();
const lines=[];
const note=(label,data)=>lines.push(`${label}: ${JSON.stringify(data)}`);
const q=(name)=>pathToFileURL(resolve(root,name)).href;
const load=async name=>await import(q(name));
const setAt=(data,pointer,value)=>{
 const parts=pointer.slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));
 let target=data;for(const part of parts.slice(0,-1))target=Array.isArray(target)?target[Number(part)]:target[part];
 target[parts.at(-1)]=value;
};
function recalculate(doc){doc.bytes=Buffer.from(JSON.stringify(doc.data,null,2)+'\n');doc.sha256=sha(doc.bytes);}
function cloneDocuments(documents){return documents.map(doc=>({...doc,bytes:Buffer.from(doc.bytes),data:structuredClone(doc.data)}));}
function recordsFor(documents,collector){return collector.collectMonetaryRowIdentityRecords(new Map(documents.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).records;}
function joNoPromotion(report){
 const jo=report.joUnitAdmission;
 assert.equal(jo.status,'exact-current-unextracted-record; purchase-price and source unit unassessed');
 assert.equal(jo.record.uid,expectedCurrentJoRecord.uid);
 assert.equal(jo.record.recordSha256,expectedCurrentJoRecord.recordSha256);
 assert.equal(jo.record.rowIdentitySha256,expectedCurrentJoRecord.rowIdentitySha256);
 assert.deepEqual(jo.sourceState,{priceState:'unextracted',sourceValueStatus:'not-assessed',unitProvenance:'unassessable',sourcePriceAbsenceReviewed:false,extractedPriceReviewed:false,semanticPass:false,sourceAbsenceProof:false});
 assert.equal(jo.registration.path,'research/hirelings-native-h-v1/jo-current-successor-v1/registration-v1.json');
 assert.equal(jo.registration.sha256,'48ca91aaa230ce4d09c896a225c464969b91adc12d621548c7d9369369f6e509');
 return jo;
}
function joStableProjection(jo){
 const {inputSha256,...record}=jo.record;
 return {status:jo.status,historicalRecordCount:jo.historicalRecordCount,currentRecordCount:jo.currentRecordCount,
  additionalRecordUids:jo.additionalRecordUids,record,registration:jo.registration,sourceState:jo.sourceState,beforeCapture:jo.beforeCapture};
}
function rejectedShape(label,documents,baselineDocuments,collector,recordsBuilder){
 const records=recordsFor(documents,collector);
 let rejection;
 try{validateWhaleCounterfactualDocuments({baselineDocuments,documents,records,recordsBuilder,sourceRoot:root});}
 catch(error){rejection=error;}
 assert.ok(rejection,`${label} mutation shape must be rejected`);
 assert.match(rejection.message,/counterfactual includes a missing, extra, or wrong-pointer\/value change/);
 note(`rejection-${label}`,{rejected:true,reason:rejection.message,documentCount:documents.length,recordCount:records.length});
}
async function sourceQuestionSnapshot(sourceQuestionLoader){
 const projection=sourceQuestionLoader.loadCurrentMonetarySourceQuestions({repoRoot:root});
 const actualInterpretations=projection.sourceQuestions.slice(0,7).map(row=>row.id);
 const contract=JSON.parse(readFileSync(resolve(root,'research/hirelings-native-h-v1/native-monetary-question-contract-v2.json'),'utf8'));
 assert.deepEqual(actualInterpretations,contract.historicalBoundary.unresolvedInterpretationQuestionIds);
 assert.equal(projection.sourceQuestions.length,9);
 assert.deepEqual(projection.questionCounts,{currentInterpretationQuestions:7,independentSourceScopeQuestions:2,distinctScopeRows:9,currentUnresolvedQuestions:9});
 assert.ok(projection.sourceQuestions.every(row=>row.status==='unresolved'&&row.semanticPass===false));
 assert.ok(projection.sourceQuestions.slice(0,7).every(row=>row.questionType==='historical-monetary-interpretation'&&row.currentDisposition==='unresolved-source-question'));
 assert.ok(projection.sourceQuestions.slice(7).every(row=>row.questionType==='source-scope'&&row.underlyingSourceQuestion?.status==='unresolved'));
 assert.deepEqual(projection.sourceQuestions.slice(7).map(row=>row.id),contract.scopeBoundary.questions.map(row=>row.id));
 return {questionCounts:projection.questionCounts,sourceQuestions:projection.sourceQuestions.map(({id,questionType,currentDisposition,status,semanticPass,underlyingSourceQuestion})=>({id,questionType,currentDisposition:currentDisposition??null,status,semanticPass,underlyingSourceQuestion:underlyingSourceQuestion??null})),
  inputRefs:projection.inputs};
}

function proposedCallerTest(){
 const callerPath='tests/monetary-unit-provenance-audit.test.mjs';
 const original=readFileSync(resolve(root,callerPath));
 const originalSha256=sha(original);
 assert.equal(originalSha256,'07c2ff26015842575c07b63f442e56a6e7841b8d25e883b3920f8ef66898189f','active caller source preimage changed; refresh proposal against reviewable current source');
 const from="../research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v2/whale-counterfactual-context-v2.mjs";
 const to="../research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/whale-counterfactual-context-v5.mjs";
 const patchPath=resolve(outDir,'proposal-callsite-v5.patch'),patchBytes=readFileSync(patchPath);
 execFileSync('git',['-C',root,'apply','--check',patchPath],{encoding:'utf8'});
 const source=original.toString('utf8');
 assert.equal(source.split(from).length-1,1,'caller must contain exactly one expected V2 helper import');
 const proposed=Buffer.from(source.replace(from,to));
 const temporaryRoot=mkdtempSync(resolve(tmpdir(),'dmg175-whale-v5-caller-proposal-'));
 let output='';
 try{
  mkdirSync(resolve(temporaryRoot,'tools'),{recursive:true});
  mkdirSync(resolve(temporaryRoot,'tests'),{recursive:true});
  symlinkSync(resolve(root,'research'),resolve(temporaryRoot,'research'),'dir');
  symlinkSync(resolve(root,'dist'),resolve(temporaryRoot,'dist'),'dir');
  symlinkSync(resolve(root,'tests/fixtures'),resolve(temporaryRoot,'tests/fixtures'),'dir');
  for(const relative of Object.keys(dependencyPins).filter(path=>path.startsWith('tools/'))){
   const expected=dependencyPins[relative],bytes=readFileSync(resolve(root,relative));
   assert.equal(sha(bytes),expected,`caller replay copy pin changed: ${relative}`);
   const destination=resolve(temporaryRoot,relative);
   mkdirSync(resolve(destination,'..'),{recursive:true});
   copyFileSync(resolve(root,relative),destination);
  }
  writeFileSync(resolve(temporaryRoot,callerPath),proposed,{flag:'wx'});
  assert.equal(existsSync(resolve(temporaryRoot,'.git')),false,'isolated proposed caller must not contain a .git directory');
  output=execFileSync(process.execPath,[
   '--test','--test-name-pattern=^an arbitrary changed Whale unit is not auto-curated$',callerPath,
  ],{cwd:temporaryRoot,encoding:'utf8',maxBuffer:20*1024*1024,env:{...process.env,DMG175_WHALE_CONTEXT_SOURCE_ROOT:root}});
  assert.match(output,/an arbitrary changed Whale unit is not auto-curated/);
  assert.match(output,/pass 1\b/);
  assert.match(output,/fail 0\b/);
 }finally{rmSync(temporaryRoot,{recursive:true,force:true});}
 assert.equal(existsSync(temporaryRoot),false,'caller proposal temp layout must be removed');
 note('proposed-caller-test-positive',{passed:true,activeCallerModified:false,isolatedRootCreated:true,isolatedRootRemoved:true,
  testName:'an arbitrary changed Whale unit is not auto-curated',
  command:`${process.execPath} --test --test-name-pattern="^an arbitrary changed Whale unit is not auto-curated$" ${callerPath}`,
  patchPath:patchPath.slice(root.length+1),patchSha256:sha(patchBytes),originalSha256,proposedSha256:sha(proposed),stdout:output.trim()});
 return {callerPath,patchPath:patchPath.slice(root.length+1),patchSha256:sha(patchBytes),originalSha256,proposedSha256:sha(proposed),testName:'an arbitrary changed Whale unit is not auto-curated',stdout:output.trim(),isolatedRootRemoved:true};
}

function assertPinnedInputRejects(label,documents,pattern){
 let rejection;
 try{validatePinnedCurrentDocuments(documents,{sourceRoot:root});}catch(error){rejection=error;}
 assert.ok(rejection,`${label} input shape must be rejected`);
 assert.match(rejection.message,pattern,`${label} rejection must occur in the plain-JSON preflight`);
 return rejection.message;
}

function plainJsonPreflightControls(baselineDocuments,collector){
 const nan=cloneDocuments(baselineDocuments);
 const nanCanonical=nan.find(doc=>doc.key==='canonical');
 const originalNanBytes=Buffer.from(nanCanonical.bytes),originalNanSha=nanCanonical.sha256;
 setAt(nanCanonical.data,'/sourcePageCensuses/2/claims/36/unit',Number.NaN);
 assert.ok(nanCanonical.bytes.equals(originalNanBytes),'NaN canary must leave raw input bytes unchanged');
 assert.equal(nanCanonical.sha256,originalNanSha,'NaN canary must leave raw input SHA metadata unchanged');
 const stringify=JSON.stringify;let stringifyCalls=0;let nanError;
 JSON.stringify=function(...args){stringifyCalls++;return stringify.apply(this,args);};
 try{nanError=assertPinnedInputRejects('null-to-NaN-unchanged-raw-bytes',nan,/non-JSON number before hashing/);}
 finally{JSON.stringify=stringify;}
 assert.equal(stringifyCalls,0,'non-JSON scalar rejection must precede serialization and canonicalization');
 note('rejection-null-to-NaN-unchanged-raw-bytes',{rejected:true,reason:nanError,mutatedPointer:'/sourcePageCensuses/2/claims/36/unit',rawBytesUnchanged:true,rawShaMetadataUnchanged:true,stringifyCallsBeforeRejection:stringifyCalls});

 const accessor=cloneDocuments(baselineDocuments),accessorDoc=accessor.find(doc=>doc.key==='canonical');
 const claim=accessorDoc.data.sourcePageCensuses[2].claims[36];let getterCalls=0;
 Object.defineProperty(claim,'unit',{enumerable:true,configurable:true,get(){getterCalls++;return null;}});
 const accessorError=assertPinnedInputRejects('accessor-property',accessor,/non-enumerable or accessor property before hashing/);
 assert.equal(getterCalls,0,'plain-JSON preflight must inspect descriptors without invoking accessors');
 note('rejection-accessor-property',{rejected:true,reason:accessorError,getterCalls});

 const wrapperAccessor=cloneDocuments(baselineDocuments);let wrapperGetterCalls=0;
 Object.defineProperty(wrapperAccessor[0],'data',{enumerable:true,configurable:true,get(){wrapperGetterCalls++;return baselineDocuments[0].data;}});
 const wrapperAccessorError=assertPinnedInputRejects('document-wrapper-accessor',wrapperAccessor,/accessor or non-plain document wrapper field/);
 assert.equal(wrapperGetterCalls,0,'document wrapper validation must inspect descriptors without reading accessor values');
 note('rejection-document-wrapper-accessor',{rejected:true,reason:wrapperAccessorError,getterCalls:wrapperGetterCalls});

 const sparse=cloneDocuments(baselineDocuments);delete sparse.find(doc=>doc.key==='canonical').data.sourcePageCensuses[0];
 const sparseError=assertPinnedInputRejects('sparse-array',sparse,/non-dense array or unexpected array property/);
 note('rejection-sparse-array',{rejected:true,reason:sparseError});

 const hidden=cloneDocuments(baselineDocuments);
 Object.defineProperty(hidden.find(doc=>doc.key==='canonical').data,'hiddenCanary',{value:'x',enumerable:false,configurable:true});
 const hiddenError=assertPinnedInputRejects('hidden-property',hidden,/non-enumerable or accessor property before hashing/);
 note('rejection-hidden-property',{rejected:true,reason:hiddenError});

 const symbolic=cloneDocuments(baselineDocuments);
 Object.defineProperty(symbolic.find(doc=>doc.key==='canonical').data,Symbol('canary'),{value:'x',enumerable:true,configurable:true});
 const symbolError=assertPinnedInputRejects('symbol-property',symbolic,/symbol property before hashing/);
 note('rejection-symbol-property',{rejected:true,reason:symbolError});

 const cyclic=cloneDocuments(baselineDocuments),cyclicCanonical=cyclic.find(doc=>doc.key==='canonical');
 cyclicCanonical.data.self=cyclicCanonical.data;
 const cycleError=assertPinnedInputRejects('cycle',cyclic,/cycle before hashing/);
 note('rejection-cycle',{rejected:true,reason:cycleError});

 const proxied=cloneDocuments(baselineDocuments),proxyDoc=proxied.find(doc=>doc.key==='canonical');
 proxyDoc.data=new Proxy(proxyDoc.data,{});
 const proxyError=assertPinnedInputRejects('proxy',proxied,/proxy before hashing/);
 note('rejection-proxy',{rejected:true,reason:proxyError});

 const negativeZero=cloneDocuments(baselineDocuments),negativeZeroCanonical=negativeZero.find(doc=>doc.key==='canonical');
 const negativeZeroBytes=Buffer.from(negativeZeroCanonical.bytes),negativeZeroSha=negativeZeroCanonical.sha256;
 setAt(negativeZeroCanonical.data,'/sourcePageCensuses/2/claims/36/unit',-0);
 assert.ok(negativeZeroCanonical.bytes.equals(negativeZeroBytes));assert.equal(negativeZeroCanonical.sha256,negativeZeroSha);
 const negativeZeroError=assertPinnedInputRejects('null-to-negative-zero-unchanged-raw-bytes',negativeZero,/actual current H input pin mismatch/);
 assert.notEqual(canonical(-0),canonical(0),'canonical equality must preserve signed-zero distinction');
 note('rejection-null-to-negative-zero-unchanged-raw-bytes',{rejected:true,reason:negativeZeroError,rawBytesUnchanged:true,rawShaMetadataUnchanged:true,signedZeroCanonicalDistinct:true});
 const badRecords=recordsFor(baselineDocuments,collector),joRecord=badRecords.find(row=>row.uid===expectedCurrentJoRecord.uid);
 assert.equal(joRecord?.source?.printedPage,null,'records canary preimage must be a real Jo null source field');
 joRecord.source.printedPage=Number.NaN;
 let recordError;
 try{validateCurrentBaselineDocuments({documents:baselineDocuments,records:badRecords,recordsBuilder:collector.collectMonetaryRowIdentityRecords,sourceRoot:root});}
 catch(error){recordError=error;}
 assert.match(recordError?.message||'',/non-JSON number before hashing/);
 note('rejection-null-to-NaN-supplied-record',{rejected:true,reason:recordError.message,joField:'source.printedPage'});
 return {nan:{rejected:true,stringifyCalls:0,rawBytesUnchanged:true,rawShaMetadataUnchanged:true},accessor:{rejected:true,getterCalls},wrapperAccessor:{rejected:true,getterCalls:wrapperGetterCalls},sparseArray:true,hiddenProperty:true,symbolProperty:true,cycle:true,proxy:true,negativeZero:true,suppliedRecordNaN:true};
}

async function run(){
 const qty=await load('tools/quantity-source-absence-audit.mjs');
 const collector=await load('tools/monetary-row-identity-audit.mjs');
 const monetary=await load('tools/monetary-unit-provenance-audit.mjs');
 const native=await load('tools/dmg175-hired-native-successors-v2.mjs');
 const sourceQuestions=await load('tools/dmg175-current-monetary-source-questions-native-v2.mjs');
 const baselineDocuments=qty.loadAuditInputs({repoRoot:root});
 const jsonPreflight=plainJsonPreflightControls(baselineDocuments,collector);
 const baselineRecords=recordsFor(baselineDocuments,collector);
 const baselinePins=validateCurrentBaselineDocuments({documents:baselineDocuments,records:baselineRecords,recordsBuilder:collector.collectMonetaryRowIdentityRecords,sourceRoot:root});
 const actualBaselineReport=monetary.buildMonetaryUnitProvenanceReport({documents:baselineDocuments,monetaryRecords:baselineRecords,repoRoot:root});
 assert.equal(monetary.validateMonetaryUnitProvenanceReport(actualBaselineReport,{documents:baselineDocuments,records:baselineRecords,repoRoot:root}),true);
 assert.equal(actualBaselineReport.baseline.sourceInputCount,10);
 assert.equal(actualBaselineReport.scope.monetaryRowIdentityRecordCount,2162);
 assert.equal(actualBaselineReport.sourceWitnesses.whaleAmbergris.currentState.currentState,'approved-null-correction-applied');
 const baselineJo=joNoPromotion(actualBaselineReport);
 note('actual-H-baseline-positive',{valid:true,head:'346c7634f8cad08998389ecd1d084b7082fb91a9',sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',sourceTree:'e6bc420f70656825a926297b959bc6d98758bfcd',inputs:baselinePins.pins.inputPins,dependencies:dependencyPins,currentRecordCount:baselineRecords.length,joSourceState:baselineJo.sourceState,joRegistration:baselineJo.registration});

 const questionBefore=await sourceQuestionSnapshot(sourceQuestions);
 note('current-H-source-questions-before',questionBefore);
 const contextBaseline=await buildCurrentBaselineContextReport({documents:baselineDocuments,records:baselineRecords,recordsBuilder:collector.collectMonetaryRowIdentityRecords,sourceRoot:root});
 assert.deepEqual(contextBaseline.report,actualBaselineReport);
 joNoPromotion(contextBaseline.report);
 note('temp-layout-baseline-positive',{valid:true,reportExactlyMatchesActual: true,layout:contextBaseline.layout});

 const syntheticDocuments=createWhalePerPoundDocuments(baselineDocuments);
 const syntheticRecords=recordsFor(syntheticDocuments,collector);
 const counterfactual=await buildWhalePerPoundCounterfactualReport({documents:syntheticDocuments,records:syntheticRecords,
  recordsBuilder:collector.collectMonetaryRowIdentityRecords,repoRoot:root,sourceRepoRoot:root});
 assert.equal(validateCounterfactualReport(counterfactual.report,{documents:counterfactual.documents,records:counterfactual.records,baselineReport:actualBaselineReport}),true);
 const whale=counterfactual.report.sourceWitnesses.whaleAmbergris;
 assert.equal(whale.currentState.currentState,'unrecognized-current-value');
 assert.equal(whale.currentState.sourceAbsenceProof,false);
 assert.deepEqual(whale.pointerValues.map(({inputKey,jsonPointer,valueSha256})=>({inputKey,jsonPointer,valueSha256})),whaleUnitDeltas.map(row=>({inputKey:row.inputKey,jsonPointer:row.pointer,valueSha256:'41c5c233324cd9ffb757fe16ae635712afaa00c6721fd333a0c632a7d0a919b4'})));
 const fields=whaleUnitDeltas.map(row=>{
  const field=counterfactual.report.fieldRows.find(item=>item.inputKey===row.inputKey&&item.jsonPointer===row.pointer);
  assert.equal(field.classification,'missing-provenance');assert.equal(field.curatedCaseId,null);
  return {inputKey:row.inputKey,jsonPointer:row.pointer,classification:field.classification,curatedCaseId:field.curatedCaseId};
 });
 const counterJo=joNoPromotion(counterfactual.report);
 assert.deepEqual(joStableProjection(counterJo),joStableProjection(baselineJo));
 assert.equal(counterJo.record.inputSha256,counterfactual.documents.find(doc=>doc.key==='canonical').sha256);
 assert.notEqual(counterJo.record.inputSha256,baselineJo.record.inputSha256);
 note('whale-counterfactual-positive',{valid:true,mutationCount:whaleUnitDeltas.length,mutations:whaleUnitDeltas.map(row=>({...row,afterValueSha256:'41c5c233324cd9ffb757fe16ae635712afaa00c6721fd333a0c632a7d0a919b4'})),fieldResults:fields,currentState:whale.currentState,recordCount:counterfactual.records.length,joStableProjectionUnchanged:true,joInputSha256UpdatedOnlyForCounterfactualCanonical:counterJo.record.inputSha256,layout:counterfactual.layout});

 const questionAfter=await sourceQuestionSnapshot(sourceQuestions);
 assert.deepEqual(questionAfter,questionBefore);
 note('current-H-source-questions-after',{unchanged:true,questionCounts:questionAfter.questionCounts,questionIds:questionAfter.sourceQuestions.map(row=>row.id)});

 const missing=cloneDocuments(syntheticDocuments);
 setAt(missing.find(doc=>doc.key==='monsterCensus').data,'/claims/36/unit',null);recalculate(missing.find(doc=>doc.key==='monsterCensus'));
 rejectedShape('missing-target',missing,baselineDocuments,collector,collector.collectMonetaryRowIdentityRecords);
 const wrongPointer=cloneDocuments(syntheticDocuments);
 setAt(wrongPointer.find(doc=>doc.key==='canonical').data,'/sourcePageCensuses/2/claims/36/unit',null);
 setAt(wrongPointer.find(doc=>doc.key==='canonical').data,'/sourcePageCensuses/2/claims/36/testOnlyUnit', 'per pound');recalculate(wrongPointer.find(doc=>doc.key==='canonical'));
 rejectedShape('wrong-pointer',wrongPointer,baselineDocuments,collector,collector.collectMonetaryRowIdentityRecords);
 const wrongText=cloneDocuments(syntheticDocuments);
 setAt(wrongText.find(doc=>doc.key==='canonical').data,'/sourcePageCensuses/2/claims/36/unit','per ton');recalculate(wrongText.find(doc=>doc.key==='canonical'));
 rejectedShape('wrong-value',wrongText,baselineDocuments,collector,collector.collectMonetaryRowIdentityRecords);
 const extra=cloneDocuments(syntheticDocuments);
 setAt(extra.find(doc=>doc.key==='canonical').data,'/sourcePageCensuses/2/claims/36/testOnlyUnit','per pound');recalculate(extra.find(doc=>doc.key==='canonical'));
 rejectedShape('extra-property',extra,baselineDocuments,collector,collector.collectMonetaryRowIdentityRecords);
 const intermediatePrototype=cloneDocuments(syntheticDocuments);
 const intermediateTarget=intermediatePrototype.find(doc=>doc.key==='canonical').data.sourcePageCensuses;
 const intermediate=Object.create(Array.prototype);
 Object.defineProperty(intermediate,'toJSON',{value(){return []},enumerable:false,configurable:true});
 Object.setPrototypeOf(intermediateTarget,intermediate);
 const intermediateRecords=recordsFor(intermediatePrototype,collector);
 let intermediateError;
 try{validateWhaleCounterfactualDocuments({baselineDocuments,documents:intermediatePrototype,records:intermediateRecords,
  recordsBuilder:collector.collectMonetaryRowIdentityRecords,sourceRoot:root});}
 catch(error){intermediateError=error;}
 assert.match(intermediateError?.message||'',/non-standard array prototype before hashing/);
 note('rejection-intermediate-array-prototype-toJSON',{rejected:true,reason:intermediateError.message,location:'canonical.data.sourcePageCensuses',beforeSerialization:true});
 Object.defineProperty(Array.prototype,'toJSON',{value(){return []},enumerable:false,configurable:true});
 try{
  let hookError;
  try{validatePinnedCurrentDocuments(baselineDocuments,{sourceRoot:root});}catch(error){hookError=error;}
  assert.match(hookError?.message||'',/unexpected Array\/Object prototype chain or toJSON hook/);
  note('rejection-global-array-prototype-toJSON',{rejected:true,reason:hookError.message,beforeInputHashing:true});
 }finally{delete Array.prototype.toJSON;}
 const stalePreimage=cloneDocuments(baselineDocuments);
 setAt(stalePreimage.find(doc=>doc.key==='canonical').data,'/sourcePageCensuses/2/claims/36/unit','per pound');recalculate(stalePreimage.find(doc=>doc.key==='canonical'));
 let staleError;
 try{validatePinnedCurrentDocuments(stalePreimage,{sourceRoot:root});}catch(error){staleError=error;}
 assert.match(staleError?.message||'',/actual current H input pin mismatch/);
 note('rejection-stale-preimage',{rejected:true,reason:staleError.message});

 const directNativeRejection=(()=>{
  try{native.loadJoCurrentSuccessor({repoRoot:root,data:baselineDocuments.find(doc=>doc.key==='dist').data,inventory:syntheticDocuments.find(doc=>doc.key==='canonical').data});}
  catch(error){return {rejected:true,message:error.message};}
  return {rejected:false,message:null};
 })();
 assert.equal(directNativeRejection.rejected,true);
 assert.match(directNativeRejection.message,/supplied actual HIRED data or canonical inventory differs from its exact raw input/);
 note('direct-real-H-loader-rejection',directNativeRejection);
 const inheritedHookCalls={count:0};
 let guardedNativeRejection;
 Object.defineProperty(Array.prototype,'toJSON',{value(){inheritedHookCalls.count++;return this;},enumerable:false,configurable:true});
 try{
  try{native.loadJoCurrentSuccessor({repoRoot:root,data:baselineDocuments.find(doc=>doc.key==='dist').data,inventory:syntheticDocuments.find(doc=>doc.key==='canonical').data});}
  catch(error){guardedNativeRejection={rejected:true,message:error.message};}
 }finally{delete Array.prototype.toJSON;}
 assert.equal(guardedNativeRejection?.rejected,true);
 assert.match(guardedNativeRejection.message,/supplied current data\/inventory require plain JSON before hashing/);
 assert.equal(inheritedHookCalls.count,0);
 note('direct-real-H-loader-toJSON-preflight',{...guardedNativeRejection,inheritedToJSONCalls:inheritedHookCalls.count});

 const callerProposal=proposedCallerTest();
 const shim=readFileSync(resolve(outDir,'dmg175-h-native-jo-test-context-shim-v5.mjs'),'utf8');
 assert.doesNotMatch(shim,/Module\._load|process\.binding|createRequire|globalThis|Object\.defineProperty|writeFileSync|unlinkSync|renameSync/);
 assert.match(shim,/resolve\(actualSourceRoot,'tools\/dmg175-hired-native-successors-v2\.mjs'\)/);
 assert.doesNotMatch(shim,/research\/hirelings-source-epoch-proposal-v5|\.proposed\.mjs/);
 note('shim-boundary',{onlyTempHOwnerPathReplaced:true,actualProductionAdapterImportedFromSourceRoot:true,actualNativeLoaderImportedFromSourceRoot:true,genericFilesystemInterception:false,nativeGuardWaiver:false,legacyV29Data:false});
 return {
  schemaVersion:1,artifactType:'Whale H-native V5 focused positive, negative, and proposed-caller evidence',status:'passed',createdAt:isoNow(),
  sourceEpoch:{head:'346c7634f8cad08998389ecd1d084b7082fb91a9',sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',sourceTree:'e6bc420f70656825a926297b959bc6d98758bfcd'},
  currentInputs:inputPins.map(({key,path,sha256})=>({key,path,sha256})),productionDependencyPins:dependencyPins,
  productionInstallReceipt:{path:'/workspace/vault-audit-private/pass8/root/hired-s2-prototype-guard-actual-install-v1/actual-install-receipt-v1.json',sha256:'a18d2a1cf6ef99639587f15e42f7ca6b70d67d43ee7254734b6c842d9e6b42ae'},
  positives:{actualBaseline:true,tempBaselineExactMatch:true,whaleCounterfactual:true,allFourFieldsMissingProvenance:true,joNoPromotion:true,sourceQuestionsRemainSevenInterpretationsAndTwoScopeQuestions:true},
  exactJsonPreflight:{passed:true,canaries:jsonPreflight},
  negativeControls:{fourMutationShapeGuards:true,stalePreimage:true,directRealNativeHRejectsMutatedCanonical:true,directRealNativeHToJSONPreflightCalls:inheritedHookCalls.count,allPassed:true},
  actualBaseline:{recordCount:baselineRecords.length,denominators:actualBaselineReport.denominators,joState:baselineJo.sourceState},
  counterfactual:{records:counterfactual.records.length,fields,whaleState:whale.currentState,joState:counterJo.sourceState,
   joRecordInputSha256:counterJo.record.inputSha256,layout:counterfactual.layout},
  sourceQuestions:{counts:questionBefore.questionCounts,rows:questionBefore.sourceQuestions},
  proposedCaller:callerProposal,
  rejectionEvidence:{directNative:directNativeRejection,shapeControls:lines.filter(line=>line.startsWith('rejection-')).map(line=>JSON.parse(line.slice(line.indexOf(': ')+2)))},
  temporaryProofsPersisted:false,activeSourceToolTestGitOrMetadataWrites:false,
 };
}

let result;
try{
 result=await run();
 const json=JSON.stringify(result,null,2)+'\n';
 writeFileSync(resolve(outDir,'run-v5-controls-v1.json'),json,{flag:'w'});
 lines.unshift('Whale H-native V5 controls: PASSED');
 lines.push(`summary-sha256: ${sha(Buffer.from(json))}`);
 writeFileSync(resolve(outDir,'run-v5-controls-v1.log'),lines.join('\n')+'\n',{flag:'w'});
 process.stdout.write(lines.join('\n')+'\n');
}catch(error){
 const failed={schemaVersion:1,artifactType:'Whale H-native V5 focused positive, negative, and proposed-caller evidence',status:'failed',createdAt:isoNow(),error:{name:error.name,message:error.message,stack:error.stack}};
 writeFileSync(resolve(outDir,'run-v5-controls-v1.json'),JSON.stringify(failed,null,2)+'\n',{flag:'w'});
 lines.unshift(`Whale H-native V5 controls: FAILED: ${error.message}`);
 writeFileSync(resolve(outDir,'run-v5-controls-v1.log'),lines.join('\n')+'\n',{flag:'w'});
 throw error;
}
