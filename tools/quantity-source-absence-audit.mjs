// Candidate inventory only. It does not establish what any printed source says.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {monetaryRowIdentityInputs} from './monetary-row-identity-audit.mjs';

const root=resolve(import.meta.dirname,'..');
export const beforeBaselinePath='research/quantity-source-absence-detector-baseline.json';
export const beforeBaselineSha256='17e3c215c7d3b0becae642d906ba179f4510e32d766d084761e6c553a9ad676a';
export const calibrationsPath='research/quantity-source-absence-before-calibrations.json';
export const calibrationsSha256='5ffbc3fe90b0cac46b736115ea946639a2fc73636c04275212b4c80c69fff709';
export const quantitySourceAbsenceInputs=[
 {key:'dist',path:'dist/data.json',stage:'current-distribution-catalog'},
 ...monetaryRowIdentityInputs.map(({key,path,stage})=>({key,path,stage:stage||'monetary-row-identity-audit-input'})),
];
export const quantityUncertaintyPattern=/\b(?:unspecified|not\s+(?:specified|stated|given|provided|listed|known|available|resolved|assessed|visually\s+read|transcribed|located|mapped|reviewed)|unknown|unclear|unresolved|uncertain|missing|unavailable|pending|not\s+found|n\s*\/?\s*a|not\s+applicable)\b/i;
export const quantityContextFieldPattern=/(?:quantity|qty|count|number|pieces?|units?|amount|scale|size|interval|duration)/i;
export const quantityContextTextPattern=/\b(?:quantity|quantities|count|number|pieces?|units?|amount|scale|size|interval|duration|each|per|total)\b/i;
export const lexicalAbsencePattern=/(?:\b(?:quantity|quantities|count|number\s+of\s+(?:pieces|gems|units|items)|amount|unit|size|time\s+unit|interval|duration)\b.{0,120}\b(?:unspecified|not\s+(?:specified|stated|given|provided|listed)|unknown|not\s+printed|not\s+given|missing)\b|\b(?:unspecified|not\s+(?:specified|stated|given|provided|listed)|unknown|not\s+printed|missing)\b.{0,120}\b(?:quantity|quantities|count|number\s+of\s+(?:pieces|gems|units|items)|amount|unit|size|time\s+unit|interval|duration)\b|\b(?:no|does not give|does not state|does not specify|not printed)\b.{0,80}\b(?:quantity|quantities|count|number|amount|units|pieces)\b)/i;
// Separate from the historical quantity predicates; tested on every string leaf.
// A candidate is an assertion awaiting review, not a confirmed source error.
const numericSubject='(?:numeric(?:al)?(?:\\s+(?:value|amount|factor|multiplier|ratio|percentage|rate|range))?|multipliers?|ratios?|amounts?|percentages?|percents?|factors?|rates?)';
const numericAbsence='(?:no|without|lacks?|missing|unknown|unspecified|unavailable|not\\s+(?:specified|stated|given|provided|listed|printed|known|available)|does\\s+not\\s+(?:supply|give|state|specify|provide|list)|supplies\\s+no)';
export const numericSourceAbsencePattern=new RegExp(`\\b${numericAbsence}\\b.{0,100}\\b${numericSubject}\\b|\\b${numericSubject}\\b.{0,100}\\b${numericAbsence}\\b`,'i');
const extractionPendingPattern=/\b(?:pending|not\s+transcribed|not\s+visually\s+(?:read|reviewed|verified)|unlocated|unmapped|not\s+yet\s+reviewed|awaiting\s+(?:review|verification)|ocr\s+checked)\b/i;
const semanticQuestionPattern=/\b(?:unresolved|unclear|uncertain|ambiguous|interpretation|interact|intended|meaning|identity)\b/i;
const notAssessablePattern=/\b(?:unknown|unavailable|missing|not\s+available|cannot\s+assess|not\s+assessed|not\s+visually\s+read|not\s+reviewed|unreviewed|inaccessible|clipped|absent)\b/i;
const ownerKeys=['sourceRowOrClaimId','rowOrPassageIdentity','recordId','itemId','sourceRowId','claimId','id','slug','key','name','objectOrSubject','sourceObject','title'];
const sourceKeys=['book','bookKey','printedPage','pdfPage','printedPages','pdfPages','sourcePdfSha256','sourceSha256','sourceFileSha256'];
const topContentArrays=['rules','spells','equipment','matrices','classes'];
const allowedCategories=new Set([
 'source-absence-assertion-in-text-unverified',
 'context-or-workflow-uncertainty-not-source-absence',
 'unreviewed-lexical-source-absence-candidate',
 'extraction-or-review-pending',
 'semantic-question-or-identity-unresolved',
 'not-assessable-or-evidence-unavailable',
 'quantity-unit-context-uncertainty',
 'other-uncertainty-or-workflow-status',
]);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const esc=value=>String(value).replace(/~/g,'~0').replace(/\//g,'~1');
const ptr=parts=>parts.length?`/${parts.map(esc).join('/')}`:'';
const typeOf=value=>value===null?'null':Array.isArray(value)?'array':typeof value;
const lexicalCandidate=(text,path)=>lexicalAbsencePattern.test(`${path} ${text}`);
const sourceFieldValue=value=>{
 if(value===null||['string','number','boolean'].includes(typeof value))return value;
 if(Array.isArray(value)&&value.every(v=>v===null||['string','number','boolean'].includes(typeof v)))return value;
 return undefined;
};
function safeOwner(value,pointer){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const identity=Object.fromEntries(ownerKeys.filter(key=>Object.hasOwn(value,key)&&['string','number'].includes(typeof value[key])).map(key=>[key,value[key]]));
 return Object.keys(identity).length?{pointer,identity}:null;
}
function safeSource(value,pointer){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const fields={};for(const key of sourceKeys)if(Object.hasOwn(value,key)){const safe=sourceFieldValue(value[key]);if(safe!==undefined)fields[key]=safe;}
 return Object.keys(fields).length?{pointer,fields}:null;
}
function walkLeaves(value,visit,parts=[],ancestor={owner:null,source:null}){
 if(value!==null&&typeof value==='object'){
  const here=ptr(parts),owner=safeOwner(value,here)||ancestor.owner,source=safeSource(value,here)||ancestor.source;
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)walkLeaves(value[i],visit,[...parts,i],{owner,source});}
  else for(const [key,child]of Object.entries(value))walkLeaves(child,visit,[...parts,key],{owner,source});
 } else visit({pointer:ptr(parts),parts,value,owner:ancestor.owner,source:ancestor.source});
}
function safeParse(bytes,path){try{return JSON.parse(bytes.toString('utf8'));}catch(error){throw new Error(`Invalid JSON in ${path}: ${error.message}`);}}
export function loadAuditInputs({repoRoot=root}={}){
 return quantitySourceAbsenceInputs.map(config=>{
  const bytes=readFileSync(resolve(repoRoot,config.path));
  return {...config,bytes,sha256:sha256(bytes),data:safeParse(bytes,config.path)};
 });
}
export function loadFrozenCalibrations({repoRoot=root}={}){
 const baseBytes=readFileSync(resolve(repoRoot,beforeBaselinePath));
 const calibrationBytes=readFileSync(resolve(repoRoot,calibrationsPath));
 const baseHash=sha256(baseBytes),calibrationHash=sha256(calibrationBytes);
 if(baseHash!==beforeBaselineSha256)throw new Error(`Frozen before baseline changed: ${baseHash}`);
 if(calibrationHash!==calibrationsSha256)throw new Error(`Frozen before calibrations changed: ${calibrationHash}`);
 const before=safeParse(baseBytes,beforeBaselinePath),calibrations=safeParse(calibrationBytes,calibrationsPath);
 if(calibrations.baselineArtifactSha256!==beforeBaselineSha256)throw new Error('Calibration fixture is not bound to the frozen before baseline.');
 return {before,calibrations,beforeHash:baseHash,calibrationHash};
}
function currentValueAt(data,pointer){
 if(pointer==='')return {found:true,value:data};
 const parts=pointer.slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));
 let value=data;
 for(const part of parts){if(Array.isArray(value)){if(!/^\d+$/.test(part)||Number(part)>=value.length)return {found:false};value=value[Number(part)];}
  else if(value!==null&&typeof value==='object'&&Object.hasOwn(value,part))value=value[part];else return {found:false};}
 return {found:true,value};
}
export function classifyQuantityText(text,path,baselineCase){
 const isLexical=lexicalCandidate(text,path);
 if(isLexical){
  if(baselineCase&&baselineCase.valueSha256===sha256(text))return baselineCase.baselineClassification;
  return 'unreviewed-lexical-source-absence-candidate';
 }
 if(extractionPendingPattern.test(text))return 'extraction-or-review-pending';
 if(semanticQuestionPattern.test(text))return 'semantic-question-or-identity-unresolved';
 if(notAssessablePattern.test(text))return 'not-assessable-or-evidence-unavailable';
 if(quantityContextFieldPattern.test(path)||quantityContextTextPattern.test(text))return 'quantity-unit-context-uncertainty';
 return 'other-uncertainty-or-workflow-status';
}
function baselineRelation(input,baselineCase){
 if(!baselineCase)return 'new-current-candidate';
 if(input.sha256===baselineCase.inputSha256)return 'input-file-hash-matches-before';
 return 'input-file-hash-differs-from-before';
}
export function buildQuantitySourceAbsenceReport({documents=loadAuditInputs(),frozen=loadFrozenCalibrations()}={}){
 const docs=new Map(documents.map(doc=>[doc.key,doc]));
 const expected=quantitySourceAbsenceInputs.map(x=>x.key);
 if(documents.length!==expected.length||expected.some(key=>!docs.has(key)))throw new Error('Audit input universe does not match dist/data.json plus the nine monetary-row-identity inputs.');
 const beforeByPointer=new Map(frozen.calibrations.cases.map(c=>[`${c.inputKey}\u0000${c.jsonPointer}`,c]));
 const perInput=[];const candidates=[];const lexicalRows=[];const nullQuantityMetadata=[];const numericSourceAbsenceCandidates=[];
 const candidatePointers=new Set();const lexicalPointers=new Set();const nullPointers=new Set();
 for(const config of quantitySourceAbsenceInputs){
  const doc=docs.get(config.key);const counts={scalarLeaves:0,leafTypes:{string:0,number:0,boolean:0,null:0},uncertaintyTextCandidates:0,quantityContextUncertaintyCandidates:0,lexicalAbsenceCandidates:0,nullQuantityLikeMetadataLeaves:0,numericSourceAbsenceCandidates:0};
  walkLeaves(doc.data,leaf=>{
   const typ=typeOf(leaf.value);if(Object.hasOwn(counts.leafTypes,typ))counts.leafTypes[typ]++;
   if(!['array','object'].includes(typ))counts.scalarLeaves++;
   const field=String(leaf.parts.at(-1)??''),fieldOrPath=quantityContextFieldPattern.test(leaf.pointer),quantityInField=quantityContextFieldPattern.test(field),isMonetary=config.key!=='dist';
   if(leaf.value===null&&quantityInField){
    counts.nullQuantityLikeMetadataLeaves++;const key=`${config.key}\u0000${leaf.pointer}`;if(nullPointers.has(key))throw new Error(`Duplicate null metadata pointer ${key}`);nullPointers.add(key);
    nullQuantityMetadata.push({inputKey:config.key,inputPath:config.path,inputSha256:doc.sha256,jsonPointer:leaf.pointer,fieldName:field,owner:leaf.owner,source:leaf.source,classification:'null quantity-like metadata; not evidence of source absence'});
   }
   if(typeof leaf.value!=='string')return;
   const isLexical=lexicalCandidate(leaf.value,leaf.pointer),isUncertainty=quantityUncertaintyPattern.test(leaf.value);
   const valueSha256=sha256(leaf.value),pointerKey=`${config.key}\u0000${leaf.pointer}`,baselineCase=beforeByPointer.get(pointerKey),category=classifyQuantityText(leaf.value,leaf.pointer,baselineCase);
   const qText=quantityContextTextPattern.test(leaf.value),isQuantityContext=fieldOrPath||qText;
   const relation=baselineCase?(baselineCase.valueSha256===valueSha256?'same-before-value':'changed-before-value'):null;
   const common={inputKey:config.key,inputPath:config.path,inputSha256:doc.sha256,jsonPointer:leaf.pointer,leafField:field,owner:leaf.owner,source:leaf.source,valueLength:leaf.value.length,valueSha256,quantityContextCues:{fieldOrPath,text:qText},monetaryQuantityContextCandidate:isMonetary&&isQuantityContext,lexicalAbsenceCandidate:isLexical,baselineClassification:baselineCase?.baselineClassification||null,baselineValueRelation:relation,reviewState:isLexical?(baselineCase&&relation==='same-before-value'?'source-assertion-unverified':'pending-human-classification-and-source-review'):'not-a-source-absence-candidate'};
   if(numericSourceAbsencePattern.test(leaf.value)){
    counts.numericSourceAbsenceCandidates++;
    numericSourceAbsenceCandidates.push({...common,candidateClass:'numeric-source-absence-assertion',reviewState:'pending-human-classification-and-source-review',semanticErrorConfirmed:false,uncertaintyTextPredicate:isUncertainty});
   }
   if(isLexical){
    counts.lexicalAbsenceCandidates++;if(lexicalPointers.has(pointerKey))throw new Error(`Duplicate lexical pointer ${pointerKey}`);lexicalPointers.add(pointerKey);
    lexicalRows.push({...common,primaryCategory:category,uncertaintyTextPredicate:isUncertainty});
   }
   if(!isUncertainty)return;
   counts.uncertaintyTextCandidates++;
   if(isMonetary&&isQuantityContext)counts.quantityContextUncertaintyCandidates++;
   if(candidatePointers.has(pointerKey))throw new Error(`Duplicate candidate pointer ${pointerKey}`);candidatePointers.add(pointerKey);
   candidates.push({...common,primaryCategory:category,uncertaintyTextPredicate:true});
  });
  const topArrays=doc.key==='dist'&&doc.data&&typeof doc.data==='object'?Object.fromEntries(Object.entries(doc.data).filter(([,value])=>Array.isArray(value)).map(([key,value])=>[key,value.length])):{};
  perInput.push({key:config.key,path:config.path,stage:config.stage,bytes:doc.bytes.length,sha256:doc.sha256,topLevelArrayLengths:topArrays,allTopLevelArrayEntryCount:Object.values(topArrays).reduce((a,b)=>a+b,0),...counts});
 }
 const currentLexicalAbsenceCandidates=lexicalRows.map(candidate=>({inputKey:candidate.inputKey,jsonPointer:candidate.jsonPointer,inputSha256:candidate.inputSha256,valueSha256:candidate.valueSha256,classification:candidate.primaryCategory,baselineClassification:candidate.baselineClassification,baselineValueRelation:candidate.baselineValueRelation,reviewState:candidate.reviewState,uncertaintyTextPredicate:candidate.uncertaintyTextPredicate}));
 const candidateByInput=new Map(documents.map(doc=>[doc.key,doc]));
 const historicalBaselineCases=frozen.calibrations.cases.map(item=>{
  const doc=candidateByInput.get(item.inputKey),current=currentValueAt(doc.data,item.jsonPointer);
  let liveRelation='current-pointer-missing',currentValueSha256=null,currentLexicalMatch=false;
  if(current.found){
   if(typeof current.value==='string'){
    currentValueSha256=sha256(current.value);currentLexicalMatch=lexicalCandidate(current.value,item.jsonPointer);
    liveRelation=currentValueSha256===item.valueSha256?'same-before-value':currentLexicalMatch?'changed-value-still-matches-lexicon':'no-longer-lexical-match-not-a-pass';
   } else liveRelation='current-pointer-is-not-string';
  }
  return {...item,currentInputSha256:doc.sha256,currentInputRelation:baselineRelation(doc,item),currentValueSha256,currentLexicalMatch,liveRelation};
 });
 const categoryCounts={};const monetaryCategoryCounts={};for(const c of candidates){categoryCounts[c.primaryCategory]=(categoryCounts[c.primaryCategory]||0)+1;if(c.inputKey!=='dist')monetaryCategoryCounts[c.primaryCategory]=(monetaryCategoryCounts[c.primaryCategory]||0)+1;}
 const dist=docs.get('dist').data;const arrays=dist&&typeof dist==='object'?Object.fromEntries(topContentArrays.map(key=>[key,Array.isArray(dist[key])?dist[key].length:0])):{};
 const arrayBackedContentRecords=Object.values(arrays).reduce((a,b)=>a+b,0);const progressionExplainerCount=dist?.progressionExplainer&&typeof dist.progressionExplainer==='object'&&!Array.isArray(dist.progressionExplainer)?1:0;
 const sourceMetadataRecords=Array.isArray(dist?.sources)?dist.sources.length:0;
 const allTopLevelArrayEntries=perInput.find(x=>x.key==='dist').allTopLevelArrayEntryCount;
 const inputHashMatchesBefore=perInput.every(item=>frozen.calibrations.inputHashes[item.key]?.sha256===item.sha256);
 const knownDeckGemCalibrations=historicalBaselineCases.filter(item=>item.deckGemCalibration);
 const lexicalByInput={};for(const candidate of lexicalRows){const row=lexicalByInput[candidate.inputKey]||{total:0,withUncertaintyToken:0,lexicalOnly:0,frozenBeforePointerCount:0};row.total++;if(candidate.uncertaintyTextPredicate)row.withUncertaintyToken++;else row.lexicalOnly++;if(candidate.baselineClassification)row.frozenBeforePointerCount++;lexicalByInput[candidate.inputKey]=row;}
 const beforeSamePointerCount=lexicalRows.filter(candidate=>candidate.baselineClassification).length;
 const report={
  artifactType:'quantity/source-absence complete scalar-leaf candidate inventory',version:1,status:'current structural inventory; source statements unverified until human review',
  detectorSemantics:{numericSourceAbsence:'Distinct heuristic over every string leaf for numeric, ratio, multiplier, amount, percentage or factor absence assertions. Candidate does not establish source omission or semantic error; no match is not a pass.',noNegativePass:'No lexical match is not evidence that a source contains or omits a quantity.',nullMetadata:'Null quantity-like metadata is recorded separately and is never treated as source-absence evidence.',reviewBoundary:'A source-absence category means the record text asserts omission. It does not certify the printed source.',historicalPreservation:'The complete hash-bound before calibration set is retained even if live data later changes or the lexical match disappears.'},
  baseline:{artifactPath:beforeBaselinePath,artifactSha256:frozen.beforeHash,calibrationsPath,calibrationsSha256:frozen.calibrationHash,inputHashes:frozen.calibrations.inputHashes,inputHashMatchesBefore},
  scope:{distributionPath:'dist/data.json',monetaryRowIdentityInputCount:monetaryRowIdentityInputs.length,totalInputCount:quantitySourceAbsenceInputs.length,contentRecordMethod:'Counted dynamically from rules, spells, equipment, matrices, and classes, plus one progressionExplainer object when present; sources metadata is counted separately.',distributionContentArrayCounts:arrays,arrayBackedContentRecordCount:arrayBackedContentRecords,progressionExplainerCount,contentRecordCount:arrayBackedContentRecords+progressionExplainerCount,sourceMetadataRecordCount:sourceMetadataRecords,allTopLevelArrayEntryCount:allTopLevelArrayEntries},
  denominators:{allScalarLeaves:perInput.reduce((a,b)=>a+b.scalarLeaves,0),uncertaintyTextCandidates:candidates.length,monetaryUncertaintyTextCandidates:candidates.filter(x=>x.inputKey!=='dist').length,monetaryQuantityContextCandidates:candidates.filter(x=>x.monetaryQuantityContextCandidate).length,nullQuantityLikeMetadataLeaves:nullQuantityMetadata.length,currentLexicalAbsenceCandidateLeaves:lexicalRows.length,numericSourceAbsenceCandidateLeaves:numericSourceAbsenceCandidates.length,categoryCounts,monetaryCategoryCounts},
  predicateComparison:{legacyUncertaintyTokenGatedLexicalMatches:lexicalRows.filter(x=>x.uncertaintyTextPredicate).length,broadLexicalMatches:lexicalRows.length,broadLexicalOnlyAdditional:lexicalRows.filter(x=>!x.uncertaintyTextPredicate).length,frozenBeforeLexicalPointersPresent:beforeSamePointerCount,lexicalOnlyByInput:Object.fromEntries(Object.entries(lexicalByInput).filter(([,value])=>value.lexicalOnly).map(([key,value])=>[key,value.lexicalOnly]))},
  inputs:perInput,
  candidates,
  monetaryQuantityContextPointers:candidates.filter(x=>x.monetaryQuantityContextCandidate).map(x=>({inputKey:x.inputKey,jsonPointer:x.jsonPointer,inputSha256:x.inputSha256,valueSha256:x.valueSha256})),
  nullQuantityLikeMetadata:nullQuantityMetadata,
  currentLexicalAbsenceCandidates,
  numericSourceAbsenceCandidates,
  historicalBeforeCalibrations:historicalBaselineCases,
  preservedKnownDeckGem:{sourceRowOrClaimId:'dmg-deck-gem-card',baselineCaseCount:knownDeckGemCalibrations.length,cases:knownDeckGemCalibrations,noLongerMatchingIsNotAPass:true},
 };
 validateQuantitySourceAbsenceReport(report,{documents,frozen});
 return report;
}
export function validateQuantitySourceAbsenceReport(report,{documents,frozen}={}){
 const expectedKeys=quantitySourceAbsenceInputs.map(x=>x.key);if(JSON.stringify(report.inputs.map(x=>x.key))!==JSON.stringify(expectedKeys))throw new Error('Input key ordering/universe mismatch.');
 if(report.inputs.length!==10||quantitySourceAbsenceInputs.length!==10)throw new Error('Expected dist/data.json plus all nine monetary audit inputs.');
 if(report.denominators.allScalarLeaves!==report.inputs.reduce((a,b)=>a+b.scalarLeaves,0))throw new Error('Scalar leaf denominator does not match per-input totals.');
 if(report.denominators.uncertaintyTextCandidates!==report.candidates.length||report.candidates.some(x=>!x.uncertaintyTextPredicate))throw new Error('Uncertainty candidate denominator mismatch.');
 const numericSet=new Set(report.numericSourceAbsenceCandidates.map(x=>`${x.inputKey}\u0000${x.jsonPointer}`));
 if(numericSet.size!==report.numericSourceAbsenceCandidates.length||numericSet.size!==report.denominators.numericSourceAbsenceCandidateLeaves||numericSet.size!==report.inputs.reduce((sum,input)=>sum+input.numericSourceAbsenceCandidates,0))throw new Error('Numeric source-absence candidate denominator mismatch.');
 if(report.numericSourceAbsenceCandidates.some(x=>x.candidateClass!=='numeric-source-absence-assertion'||x.semanticErrorConfirmed!==false||x.reviewState!=='pending-human-classification-and-source-review'))throw new Error('Numeric source-absence candidate was promoted to a source adjudication.');
 if(documents)for(const candidate of report.numericSourceAbsenceCandidates){const doc=documents.find(x=>x.key===candidate.inputKey),value=doc&&currentValueAt(doc.data,candidate.jsonPointer);if(!value?.found||typeof value.value!=='string'||sha256(value.value)!==candidate.valueSha256||doc.sha256!==candidate.inputSha256||!numericSourceAbsencePattern.test(value.value))throw new Error('Numeric source-absence candidate is not bound to the scanned string.');}
 const candidateSet=new Set(report.candidates.map(x=>`${x.inputKey}\u0000${x.jsonPointer}`));if(candidateSet.size!==report.candidates.length)throw new Error('Candidate pointers are not unique.');
 if(report.candidates.some(x=>!allowedCategories.has(x.primaryCategory)||!/^[a-f0-9]{64}$/.test(x.inputSha256)||!/^[a-f0-9]{64}$/.test(x.valueSha256)))throw new Error('Candidate category or hash metadata is malformed.');
 const qset=new Set(report.monetaryQuantityContextPointers.map(x=>`${x.inputKey}\u0000${x.jsonPointer}`));
 const expectedQ=new Set(report.candidates.filter(x=>x.monetaryQuantityContextCandidate).map(x=>`${x.inputKey}\u0000${x.jsonPointer}`));if(qset.size!==expectedQ.size||[...qset].some(x=>!expectedQ.has(x)))throw new Error('Monetary quantity-context pointer subset mismatch.');
 if(report.monetaryQuantityContextPointers.some(x=>x.inputKey==='dist'||!candidateSet.has(`${x.inputKey}\u0000${x.jsonPointer}`)))throw new Error('Monetary quantity-context pointer outside the uncertainty universe.');
 const nullset=new Set(report.nullQuantityLikeMetadata.map(x=>`${x.inputKey}\u0000${x.jsonPointer}`));if(nullset.size!==report.nullQuantityLikeMetadata.length||report.nullQuantityLikeMetadata.some(x=>x.classification!=='null quantity-like metadata; not evidence of source absence'))throw new Error('Null metadata inventory is malformed.');
 const lexicalSet=new Set(report.currentLexicalAbsenceCandidates.map(x=>`${x.inputKey}\u0000${x.jsonPointer}`));if(lexicalSet.size!==report.currentLexicalAbsenceCandidates.length||lexicalSet.size!==report.denominators.currentLexicalAbsenceCandidateLeaves)throw new Error('Current lexical candidate count or uniqueness mismatch.');
 if(report.currentLexicalAbsenceCandidates.some(x=>x.uncertaintyTextPredicate!==candidateSet.has(`${x.inputKey}\u0000${x.jsonPointer}`)))throw new Error('Lexical/uncertainty candidate subset relation mismatch.');
 const lexicalCount=report.currentLexicalAbsenceCandidates.filter(x=>x.uncertaintyTextPredicate).length,lexicalOnlyCount=report.currentLexicalAbsenceCandidates.length-lexicalCount;
 if(report.predicateComparison.legacyUncertaintyTokenGatedLexicalMatches!==lexicalCount||report.predicateComparison.broadLexicalOnlyAdditional!==lexicalOnlyCount||report.predicateComparison.broadLexicalMatches!==report.currentLexicalAbsenceCandidates.length)throw new Error('Broad-vs-legacy predicate comparison is inconsistent.');
 if(report.historicalBeforeCalibrations.length!==20||report.preservedKnownDeckGem.baselineCaseCount!==6)throw new Error('Frozen 20-case / six-case Deck Gem calibration was lost.');
 const curatedAbsence=report.historicalBeforeCalibrations.filter(x=>x.baselineClassification==='source-absence-assertion-in-text-unverified');const curatedContext=report.historicalBeforeCalibrations.filter(x=>x.baselineClassification==='context-or-workflow-uncertainty-not-source-absence');if(curatedAbsence.length!==17||curatedContext.length!==3)throw new Error('Frozen curated before classifications changed.');
 if(frozen){
  for(const input of report.inputs){const doc=documents.find(x=>x.key===input.key);if(!doc||doc.sha256!==input.sha256)throw new Error(`Input hash mismatch for ${input.path}.`);}
  for(const candidate of report.candidates){const doc=documents.find(x=>x.key===candidate.inputKey);const value=currentValueAt(doc.data,candidate.jsonPointer);if(!value.found||typeof value.value!=='string'||sha256(value.value)!==candidate.valueSha256||!quantityUncertaintyPattern.test(value.value))throw new Error(`Candidate pointer/hash/classification mismatch: ${candidate.inputPath}${candidate.jsonPointer}`);const baselineCase=frozen.calibrations.cases.find(c=>c.inputKey===candidate.inputKey&&c.jsonPointer===candidate.jsonPointer);if(classifyQuantityText(value.value,candidate.jsonPointer,baselineCase)!==candidate.primaryCategory)throw new Error(`Candidate category does not match structural rules: ${candidate.inputPath}${candidate.jsonPointer}`);}
  for(const lexical of report.currentLexicalAbsenceCandidates){const doc=documents.find(x=>x.key===lexical.inputKey),value=currentValueAt(doc.data,lexical.jsonPointer);if(!value.found||typeof value.value!=='string'||sha256(value.value)!==lexical.valueSha256||!lexicalCandidate(value.value,lexical.jsonPointer))throw new Error(`Lexical pointer/hash mismatch: ${lexical.inputKey}${lexical.jsonPointer}`);}
  for(const item of report.nullQuantityLikeMetadata){const doc=documents.find(x=>x.key===item.inputKey);const value=currentValueAt(doc.data,item.jsonPointer);if(!value.found||value.value!==null||!quantityContextFieldPattern.test(String(item.jsonPointer.split('/').at(-1)||'')))throw new Error(`Null metadata pointer mismatch: ${item.inputPath}${item.jsonPointer}`);}
  for(const item of report.historicalBeforeCalibrations){const doc=documents.find(x=>x.key===item.inputKey),value=currentValueAt(doc.data,item.jsonPointer);const expectedLive=value.found&&typeof value.value==='string'&&lexicalCandidate(value.value,item.jsonPointer);if(item.currentLexicalMatch!==expectedLive)throw new Error(`Historical/live relation mismatch: ${item.inputPath}${item.jsonPointer}`);}
 }
 return true;
}
function markdownReport(report){
 const lines=['# Quantity/source-absence audit','',`Status: ${report.status}. This is a structural candidate inventory, not source adjudication.`,``,`Inputs: ${report.inputs.length}; scalar leaves: ${report.denominators.allScalarLeaves.toLocaleString('en-US')}; uncertainty text candidates: ${report.denominators.uncertaintyTextCandidates.toLocaleString('en-US')}; monetary quantity-context candidates: ${report.denominators.monetaryQuantityContextCandidates.toLocaleString('en-US')}; null quantity-like metadata: ${report.denominators.nullQuantityLikeMetadataLeaves.toLocaleString('en-US')}; current broad lexical matches: ${report.denominators.currentLexicalAbsenceCandidateLeaves.toLocaleString('en-US')}; distinct numeric-source-absence candidates: ${report.denominators.numericSourceAbsenceCandidateLeaves.toLocaleString('en-US')}.`,``,`The broadened lexical predicate matches ${report.predicateComparison.broadLexicalMatches} strings; ${report.predicateComparison.legacyUncertaintyTokenGatedLexicalMatches} also carry an uncertainty token, while ${report.predicateComparison.broadLexicalOnlyAdditional} are lexical-only additions (not newly verified source errors). The before baseline has SHA-256 ${report.baseline.artifactSha256}; its calibration file has SHA-256 ${report.baseline.calibrationsSha256}. The 20 hash-bound historical lexical cases (17 source-absence assertions in text, 3 context/workflow cases) remain in the report even when current data no longer matches them. All source-absence statements remain unverified until human review.`,``,`Distribution scope: ${report.scope.contentRecordCount} content records (${report.scope.arrayBackedContentRecordCount} array-backed plus ${report.scope.progressionExplainerCount} progression explainer); ${report.scope.sourceMetadataRecordCount} separate source metadata records; ${report.scope.allTopLevelArrayEntryCount} top-level array entries across every array.`,``,`Categories:`,``,...Object.entries(report.denominators.categoryCounts).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`- ${key}: ${value.toLocaleString('en-US')}`),'','No lexical match is a pass. Null quantity metadata, unreviewed pages, and unavailable evidence do not establish source omission. Candidate rows contain JSON pointers, identifiers, hashes, counts, and categories only; no source text, OCR, or page images are included.','','Per-input hashes, counts, every candidate pointer, null metadata pointers, current lexical hits, and historical calibration relations are in report.json.',''];
 return lines.join('\n');
}
export function writeQuantitySourceAbsenceArtifacts(report,outputDir){
 mkdirSync(outputDir,{recursive:true});const jsonPath=resolve(outputDir,'report.json'),mdPath=resolve(outputDir,'report.md');
 writeFileSync(jsonPath,JSON.stringify(report,null,2)+'\n');writeFileSync(mdPath,markdownReport(report));return {jsonPath,mdPath};
}
function cli(){
 const args=process.argv.slice(2);let outputDir='artifacts/quantity-source-absence';for(let i=0;i<args.length;i++)if(args[i]==='--output-dir'&&args[i+1])outputDir=args[++i];
 const unknown=args.filter((arg,i)=>arg==='--output-dir'||i>0&&args[i-1]==='--output-dir'?false:arg!=='--check');if(unknown.length)throw new Error(`Unknown arguments: ${unknown.join(' ')}`);
 const check=args.includes('--check'),documents=loadAuditInputs(),frozen=loadFrozenCalibrations(),report=buildQuantitySourceAbsenceReport({documents,frozen});
 const target=resolve(root,outputDir);const paths=writeQuantitySourceAbsenceArtifacts(report,target);
 if(check){const persisted=safeParse(readFileSync(paths.jsonPath),paths.jsonPath);validateQuantitySourceAbsenceReport(persisted,{documents,frozen});for(const doc of documents){const actual=sha256(readFileSync(resolve(root,doc.path)));if(actual!==doc.sha256)throw new Error(`Input changed during report generation: ${doc.path}`);}}
 console.log(JSON.stringify({status:check?'structural-check-passed':'written',outputDir:target,json:paths.jsonPath,markdown:paths.mdPath,denominators:report.denominators,contentRecords:report.scope.contentRecordCount,sourceMetadataRecords:report.scope.sourceMetadataRecordCount}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli();
