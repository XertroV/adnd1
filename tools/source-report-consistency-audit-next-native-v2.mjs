// Batch6 proposal: read-only consistency checks over live report metadata.
// No source/producer payload, historical grade or review disposition is changed.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {qualifyCurrentConsumerStage, currentConsumerRepoRoot, assertCurrentBodyValue} from './class-mapping-current-consumer-runtime-v1.mjs';
const root=currentConsumerRepoRoot;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const counter=values=>{const out={};for(const value of values)out[value]=(out[value]||0)+1;return out;};
const equalCounter=(a,b)=>same(Object.entries(a).sort(),Object.entries(b).sort());
const requireValue=(value,message)=>{if(!value)throw Error(`Report consistency input: ${message}`);};
const format=value=>value.toLocaleString('en-US');
const outputPath='research/class-mapping-source-epoch-v1/reports/next-native-v2/current/report-consistency.json';
const handoffPath='research/class-mapping-source-epoch-v1/reports/next-native-v2/current/gaps-handoff.json';
const gapsPath='research/class-mapping-source-epoch-v1/reports/next-native-v2/current/coverage-gaps.json';
const systemicPath='research/class-mapping-source-epoch-v1/reports/next-native-v2/current/citation-systemic-current.json';
const registrationPath='research/source-audit-batch5-current-finding-disposition-registration.json';
function loadJson(path){
 const bytes=readFileSync(resolve(root,path));
 return {bytes,sha256:sha(bytes),json:JSON.parse(bytes.toString('utf8'))};
}
function hashPath(path){return sha(readFileSync(resolve(root,path)));}

export function fieldBindingAxisMetrics(systemic){
 const evidence=systemic?.evidenceBindings,rows=evidence?.bindings;
 requireValue(Array.isArray(rows)&&Number.isInteger(evidence.denominator)&&rows.length===evidence.denominator,'complete evidence-binding denominator required');
 requireValue(new Set(rows.map(row=>row.bindingPointer)).size===rows.length&&rows.every(row=>typeof row.bindingPointer==='string'),'binding pointers must be unique');
 const targets=counter(rows.map(row=>row.targetStatus)),reviews=counter(rows.map(row=>row.reviewStatus));
 requireValue(equalCounter(targets,evidence.targetStatusCounts)&&equalCounter(reviews,evidence.reviewStatusCounts),'declared binding/review totals must rederive from all rows');
 requireValue(Object.keys(targets).every(key=>['empty-region-target','field-target-resolved','record-target-resolved','region-resolved-field-review-pending'].includes(key)),'unknown target state is unassessable');
 requireValue(rows.every(row=>row.targetStatus!=='region-resolved-field-review-pending'||row.reviewStatus==='field-target-pending'),'a region with pending field review must retain field-target-pending status');
 requireValue(rows.every(row=>row.reviewStatus!=='field-target-reviewed'||row.targetStatus==='field-target-resolved'),'a field-target-reviewed binding must resolve to a region');
 const count=predicate=>rows.filter(predicate).length,reviewed=count(row=>row.reviewStatus==='field-target-reviewed');
 return {denominator:rows.length,emptyRegionTargets:targets['empty-region-target']||0,resolvedRegionTargets:targets['field-target-resolved']||0,recordTargetResolvedBindings:targets['record-target-resolved']||0,regionResolvedFieldReviewPendingBindings:targets['region-resolved-field-review-pending']||0,fieldTargetReviewed:reviewed,fieldTargetNotReviewed:rows.length-reviewed,resolvedButFieldTargetNotReviewed:count(row=>row.targetStatus==='field-target-resolved'&&row.reviewStatus!=='field-target-reviewed'),targetStatusCounts:targets,reviewStatusCounts:reviews,crossTab:[...new Set(rows.map(row=>JSON.stringify([row.targetStatus,row.reviewStatus])))].sort().map(key=>{const [targetStatus,reviewStatus]=JSON.parse(key);return {targetStatus,reviewStatus,count:count(row=>row.targetStatus===targetStatus&&row.reviewStatus===reviewStatus)};})};
}
export function fieldBindingCountMeaning(metrics){
 return `${format(metrics.denominator)} evidence bindings: ${format(metrics.resolvedRegionTargets)} field targets resolve to regions, ${format(metrics.recordTargetResolvedBindings)} whole-record references resolve to source regions, and ${format(metrics.emptyRegionTargets)} have no region target.${metrics.regionResolvedFieldReviewPendingBindings?` A further ${format(metrics.regionResolvedFieldReviewPendingBindings)} have region locations with field review still pending.`:''} ${format(metrics.fieldTargetReviewed)} have field-target-reviewed status; ${format(metrics.fieldTargetNotReviewed)} do not, including ${format(metrics.resolvedButFieldTargetNotReviewed)} region-resolved field bindings and ${format(metrics.recordTargetResolvedBindings)} record-resolved references. Binding resolution and field-target review are separate. These are review queues, not proof of missing source content.`;
}
export function historicalProducerMetadata(report){
 return {sourceInput:{path:report.path,sha256:report.sha256},temporalScope:'historical-producer-phase',status:report.upstreamReviewStatus??null,independentOverlayReviewNeeded:report.upstreamIndependentOverlayReviewPending===true,scope:'Preserved producer-phase metadata. It is not a current application or scoped-review disposition, and no general overlay approval is inferred.'};
}
const uncheckedExclusionPattern=/^All ordinary unchecked mechanics fields \(([\d,]+)\);$/;
const legacyEndMatterExclusion='DMG printed pp.239–240 are unverified and uncited, not confirmed missing.';
const currentEndMatterExclusion='DMG unnumbered PDF leaves 239–240 remain unverified and uncited; they are not printed-page citations or confirmed missing.';
export function currentUncheckedExclusions(exclusions,count){
 requireValue(Array.isArray(exclusions)&&Number.isInteger(count)&&count>=0,'unchecked exclusion list and current denominator required');
 requireValue(exclusions.filter(text=>uncheckedExclusionPattern.test(text)).length===1,'one current ordinary-unchecked exclusion is required');
 return exclusions.map(text=>uncheckedExclusionPattern.test(text)?`All ordinary unchecked mechanics fields (${format(count)});`:text===legacyEndMatterExclusion?currentEndMatterExclusion:text);
}
export function uncheckedExclusionTemplate(exclusions){
 return exclusions.map(text=>uncheckedExclusionPattern.test(text)?'All ordinary unchecked mechanics fields (current denominator);':text===currentEndMatterExclusion?legacyEndMatterExclusion:text);
}
export function sourceIntegrationDescriptor(report,{registration,registrationRef,currentHashes}){
 requireValue(registration?.artifactType==='current-exact-monetary-known-finding-registration','current registration schema required');
 const key=report.sourceIdentities?'PHB-DMG179':'UA583',registered=registration.sourcePayloads?.[key];
 requireValue(registered===report.sha256&&currentHashes[report.path]===report.sha256,'current source does not match registered applied payload');
 requireValue(currentHashes['research/monetary-row-identity-reviews.json']===registration.manifest?.afterSha256,'review manifest changed since registration');
 requireValue(currentHashes['tools/monetary-row-identity-audit.mjs']===registration.currentCode?.rowToolSha256&&currentHashes['tools/monetary-context-extent-contract.mjs']===registration.currentCode?.extentSha256,'validator code changed since registration');
 const bridge=registration.migrationBridge,authority=registration.authorityAvailability;
 requireValue(bridge&&authority&&currentHashes[bridge.path]===bridge.sha256&&currentHashes[authority.path]===authority.sha256,'registration bridge/authority is stale');
 const current=report.currentReview;
 requireValue(current?.sourceInput?.path===report.path&&current.sourceInput.sha256===report.sha256&&current.generalReviewPending===true&&current.generalSourceReviewStatus==='pending'&&current.semanticPass===false,'current scoped review and general-review limits required');
 return {sourceInput:{path:report.path,sha256:report.sha256},status:'current-source-matches-registered-application',registration:registrationRef,scopedFindingReviewStatus:current.status,generalSourceReviewStatus:'pending',semanticPass:false,scope:'Exact current source/registration linkage only. Known-finding dispositions do not certify every source row, pixel, field or overlay.'};
}
export function analyzeReportConsistency({handoff,gaps,systemic,registration,registrationRef,currentHashes}){
 const metrics=fieldBindingAxisMetrics(systemic),queue=handoff.reviewQueuesNotSourceAbsences?.fieldBindingAndHistoricalScopeQueues,findings=[];
 requireValue(queue&&gaps?.coverage?.counts,'live handoff and public coverage counts required');
 requireValue(metrics.recordTargetResolvedBindings===0||Object.hasOwn(queue,'recordTargetResolvedBindings'),'record-target resolution count is required in the live handoff');
 requireValue(metrics.recordTargetResolvedBindings===0||Object.hasOwn(gaps.coverage.counts,'recordTargetResolvedBindings'),'record-target resolution count is required in the public coverage projection');
 requireValue(metrics.regionResolvedFieldReviewPendingBindings===0||Object.hasOwn(queue,'regionResolvedFieldReviewPendingBindings'),'pending field-review region count is required in the live handoff');
 requireValue(metrics.regionResolvedFieldReviewPendingBindings===0||Object.hasOwn(gaps.coverage.counts,'regionResolvedFieldReviewPendingBindings'),'pending field-review region count is required in the public coverage projection');
 requireValue(currentHashes[queue.systemicReportPath]===queue.reportHashes?.systemic,'systemic report bytes changed since handoff refresh');
 requireValue(currentHashes['dist/data.json']===handoff.snapshot?.rawDistDataFileSha256&&currentHashes['dist/data.json#parsed-json']===handoff.snapshot?.parsedDataSha256&&systemic.input?.sha256===handoff.snapshot.parsedDataSha256,'systemic/handoff data identity is stale');
 requireValue(gaps.snapshot?.dataSha256===handoff.snapshot.parsedDataSha256&&gaps.snapshot?.rawDataSha256===handoff.snapshot.rawDistDataFileSha256&&gaps.snapshot?.handoffSha256===currentHashes['research/gaps-limitations-next-task.json'],'public gaps projection is stale');
 const add=(id,document,pointer,observed,expected,scope)=>findings.push({id,document,pointer,observed,expected,scope});
 for(const [document,values,prefix]of [['research/gaps-limitations-next-task.json',queue,'/reviewQueuesNotSourceAbsences/fieldBindingAndHistoricalScopeQueues'],['dist/coverage-gaps.json',gaps.coverage.counts,'/coverage/counts']])if(Object.hasOwn(values,'regionResolvedFieldReviewPendingBindings')&&values.regionResolvedFieldReviewPendingBindings!==metrics.regionResolvedFieldReviewPendingBindings)add('pending-region-field-review-count',document,`${prefix}/regionResolvedFieldReviewPendingBindings`,values.regionResolvedFieldReviewPendingBindings,metrics.regionResolvedFieldReviewPendingBindings,'Regions with pending field review remain distinct from empty, resolved field and whole-record targets.');
 for(const [field,key]of [['emptyRegionTargetBindings','emptyRegionTargets'],['fieldEvidenceBindingsDenominator','denominator'],['fieldTargetsPending','fieldTargetNotReviewed']])if(queue[field]!==metrics[key])add(`queue-${field}`,'research/gaps-limitations-next-task.json',`/reviewQueuesNotSourceAbsences/fieldBindingAndHistoricalScopeQueues/${field}`,queue[field],metrics[key],'Current metric mismatch; binding presence and review status remain separate axes.');
 for(const [field,key]of [['regionTargetResolvedBindings','resolvedRegionTargets'],['recordTargetResolvedBindings','recordTargetResolvedBindings'],['fieldTargetsReviewed','fieldTargetReviewed'],['regionResolvedFieldTargetsPending','resolvedButFieldTargetNotReviewed']])if(Object.hasOwn(queue,field)&&queue[field]!==metrics[key])add(`queue-${field}`,'research/gaps-limitations-next-task.json',`/reviewQueuesNotSourceAbsences/fieldBindingAndHistoricalScopeQueues/${field}`,queue[field],metrics[key],'Binding and review axes must retain their own current totals.');
 for(const [field,key]of [['emptyRegionTargetBindings','emptyRegionTargets'],['fieldEvidenceBindingDenominator','denominator'],['pendingFieldTargets','fieldTargetNotReviewed']])if(gaps.coverage.counts[field]!==metrics[key])add(`public-${field}`,'dist/coverage-gaps.json',`/coverage/counts/${field}`,gaps.coverage.counts[field],metrics[key],'Public numeric projection must match current authoritative binding rows.');
 for(const [field,key]of [['regionTargetResolvedBindings','resolvedRegionTargets'],['recordTargetResolvedBindings','recordTargetResolvedBindings'],['reviewedFieldTargets','fieldTargetReviewed'],['regionResolvedPendingFieldTargets','resolvedButFieldTargetNotReviewed']])if(Object.hasOwn(gaps.coverage.counts,field)&&gaps.coverage.counts[field]!==metrics[key])add(`public-${field}`,'dist/coverage-gaps.json',`/coverage/counts/${field}`,gaps.coverage.counts[field],metrics[key],'Public binding and review axes must retain their own current totals.');
 const expectedMeaning=fieldBindingCountMeaning(metrics);
 if(queue.countMeaning!==expectedMeaning)add('stale-live-binding-count-meaning','research/gaps-limitations-next-task.json','/reviewQueuesNotSourceAbsences/fieldBindingAndHistoricalScopeQueues/countMeaning',queue.countMeaning,expectedMeaning,`Canonical dynamic count narrative; all ${metrics.denominator} bindings and both distinct status axes are accounted for.`);
 const excluded=handoff.summary?.formalMechanicsFieldStatuses?.ordinaryUncheckedFieldsExcluded;
 requireValue(Number.isInteger(excluded)&&excluded===gaps.coverage.denominators?.mechanicsUncheckedFieldsExcluded,'current unchecked denominator mismatch');
 for(const [document,values,prefix]of [['research/gaps-limitations-next-task.json',handoff.excludedFromGapCount,'/excludedFromGapCount'],['dist/coverage-gaps.json',gaps.coverage.exclusions,'/coverage/exclusions']]){
  currentUncheckedExclusions(values,excluded);
  for(const [index,text]of values.entries()){
  const match=String(text).match(/ordinary unchecked mechanics fields\s*\(([\d,]+)\)/i);
  if(match&&Number(match[1].replaceAll(',',''))!==excluded)add('stale-live-unchecked-exclusion-count',document,`${prefix}/${index}`,text,`All ordinary unchecked mechanics fields (${format(excluded)});`,'Current live exclusion count only; historical evidence and source grades stay unchanged.');
  }
 }
 const proposedMonetaryMetadata=[];
 for(const [index,report]of (handoff.reviewQueuesNotSourceAbsences.rowNormalizedMonetaryReview?.reports||[]).entries()){
  const producerHistory=historicalProducerMetadata(report);
  const currentIntegration=sourceIntegrationDescriptor(report,{registration,registrationRef,currentHashes});
  proposedMonetaryMetadata.push({reportIndex:index,historicalProducerMetadata:producerHistory,currentIntegration});
  if(!same(report.historicalProducerMetadata,producerHistory)||!same(report.currentIntegration,currentIntegration))add('producer-history-and-current-integration-not-explicit','research/gaps-limitations-next-task.json',`/reviewQueuesNotSourceAbsences/rowNormalizedMonetaryReview/reports/${index}`,{upstreamReviewStatus:report.upstreamReviewStatus??null,upstreamIndependentOverlayReviewPending:report.upstreamIndependentOverlayReviewPending,currentReviewStatus:report.currentReview?.status},{historicalProducerMetadata:producerHistory,currentIntegration},'Keep exact source bytes and producer history. Add only explicitly scoped current linkage; preserve generalReviewPending and unresolved source questions.');
 }
 return {artifactType:'source-report-consistency-proposal-audit',metrics,findings,proposedMonetaryMetadata,validation:{valid:findings.length===0,semanticPass:false},limits:['This validation reads current report inputs; it does not edit source values or certify source completeness.','Exact195 known dimensions are distinct from whole-row, whole-book and global overlay review.','Historical census/baseline text and raw producer focus/crop metadata are preserved; lexical candidates are not automatically defects.']};
}
export function buildCurrentClassMappingReportConsistency(...args){
 if(args.length)throw Error('next-native report consistency producer accepts no caller overrides');
 const stage=qualifyCurrentConsumerStage();
 assertCurrentBodyValue(stage,stage.inputs.data,'data');
 const handoffFile=loadJson(handoffPath),gapsFile=loadJson(gapsPath),systemicFile=loadJson(systemicPath),registrationFile=loadJson(registrationPath);
 const handoff=handoffFile.json,registration=registrationFile.json;
 const systemicReportPath=handoff.reviewQueuesNotSourceAbsences?.fieldBindingAndHistoricalScopeQueues?.systemicReportPath;
 requireValue(systemicReportPath===systemicPath,'handoff must point to the fresh next-native systemic report');
 const reports=handoff.reviewQueuesNotSourceAbsences?.rowNormalizedMonetaryReview?.reports||[];
 const mechanicsFile=loadJson('research/mechanics-audit-progress.json'),dataBytes=readFileSync(resolve(root,'dist/data.json'));
 requireValue(sha(dataBytes)===stage.inputHashes.sourceBody['dist/data.json'],'current S1 data bytes differ from the native source-body pin');
 requireValue(sha(mechanicsFile.bytes)===stage.inputHashes.sourceBody['research/mechanics-audit-progress.json'],'current S1 mechanics bytes differ from the native source-body pin');
 const paths=[...reports.map(report=>report.path),'research/monetary-row-identity-reviews.json','tools/monetary-row-identity-audit.mjs','tools/monetary-context-extent-contract.mjs',registration.migrationBridge?.path,registration.authorityAvailability?.path,'dist/data.json',handoffPath,systemicPath,'research/mechanics-audit-progress.json'].filter(Boolean);
 const currentHashes=Object.fromEntries([...new Set(paths)].map(path=>[path,hashPath(path)]));
 currentHashes['research/gaps-limitations-next-task.json']=handoffFile.sha256;
 currentHashes['dist/data.json#parsed-json']=sha(Buffer.from(JSON.stringify(stage.inputs.data)));
 requireValue(currentHashes['research/mechanics-audit-progress.json']===handoff.snapshot.mechanicsAuditFileSha256&&mechanicsFile.json.counts?.uncheckedFields===handoff.summary.formalMechanicsFieldStatuses.ordinaryUncheckedFieldsExcluded,'mechanics unchecked denominator is stale');
 const result=analyzeReportConsistency({handoff,gaps:gapsFile.json,systemic:systemicFile.json,registration,
   registrationRef:{path:registrationPath,sha256:registrationFile.sha256},currentHashes});
 const finalStage=qualifyCurrentConsumerStage();
 requireValue(finalStage.summary.sourceCommit===stage.summary.sourceCommit&&finalStage.summary.sourceTree===stage.summary.sourceTree,'native source epoch changed during report consistency build');
 const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n','utf8');
 return {path:outputPath,bytes,report:result};
}
