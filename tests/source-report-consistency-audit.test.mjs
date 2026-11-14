import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-v2.mjs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {analyzeReportConsistency,fieldBindingAxisMetrics,fieldBindingCountMeaning} from '../research/class-mapping-history-v1/replay-tools/source-report-consistency-audit-mm-v2.mjs';
import {fieldBindingAxisMetrics as originalAxisMetrics} from './fixtures/source-report-consistency-record-target-old-helper-before.mjs';
import {analyzeReportConsistency as partialAnalyze,fieldBindingAxisMetrics as partialAxisMetrics,fieldBindingCountMeaning as partialCountMeaning} from './fixtures/source-report-consistency-record-target-partial-helper-before.mjs';
import {fieldBindingAxisMetrics as beforePendingRegionAxisMetrics} from './fixtures/weapon-source-report-consistency-before.mjs';
import {historicalMmTestRoot, assertHistoricalMmTestStage} from '../research/class-mapping-history-v1/mm-replay-fs-v2.mjs';
assertHistoricalMmTestStage();
const root=historicalMmTestRoot;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const before=JSON.parse(read('research/source-audit-batch6-report-consistency-before.json'));
const compressed=read(before.fixture.path);assert.equal(sha(compressed),before.fixture.sha256);
const raw=gunzipSync(compressed);assert.equal(sha(raw),before.fixtureUncompressedSha256);
const frozen=JSON.parse(raw),args=()=>structuredClone(frozen.arguments);
const pendingRegionBytes=read('tests/fixtures/weapon-source-report-pending-region-before-v1.json.gz');
assert.equal(sha(pendingRegionBytes),'2ec549ee3ca68007a624a3127db4decb23684aec59a22cbc4a05493af231d104');
const pendingRegionBefore=JSON.parse(gunzipSync(pendingRegionBytes));
assert.equal(sha(read(pendingRegionBefore.oldHelper.path)),pendingRegionBefore.oldHelper.sha256);
function proposedArguments(){
 const input=args(),result=analyzeReportConsistency(input);
 input.handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues.countMeaning=fieldBindingCountMeaning(result.metrics);
 input.handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues.recordTargetResolvedBindings=result.metrics.recordTargetResolvedBindings;
 input.gaps.coverage.counts.recordTargetResolvedBindings=result.metrics.recordTargetResolvedBindings;
 const count=input.handoff.summary.formalMechanicsFieldStatuses.ordinaryUncheckedFieldsExcluded;
 input.handoff.excludedFromGapCount[0]=`All ordinary unchecked mechanics fields (${count});`;
 input.gaps.coverage.exclusions[0]=`All ordinary unchecked mechanics fields (${count});`;
 for(const row of result.proposedMonetaryMetadata){
  const report=input.handoff.reviewQueuesNotSourceAbsences.rowNormalizedMonetaryReview.reports[row.reportIndex];
  report.historicalProducerMetadata=row.historicalProducerMetadata;report.currentIntegration=row.currentIntegration;
 }
 // Pure-object replay of captured consumed fields. No generated file, source,
 // filesystem hash or runtime deployment acceptance is claimed by this helper.
 return input;
}

test('actual 4681-binding census preserves the pending-region reporting failure and all four target categories',()=>{
 assert.equal(pendingRegionBefore.failure.returnCode,1);
 assert.match(pendingRegionBefore.failure.stderr,/unknown target state is unassessable/);
 assert.throws(()=>beforePendingRegionAxisMetrics(pendingRegionBefore.systemic),/unknown target state is unassessable/);
 const metrics=fieldBindingAxisMetrics(pendingRegionBefore.systemic);
 assert.deepEqual([metrics.denominator,metrics.emptyRegionTargets,metrics.resolvedRegionTargets,metrics.recordTargetResolvedBindings,metrics.regionResolvedFieldReviewPendingBindings,metrics.fieldTargetReviewed,metrics.fieldTargetNotReviewed],[4681,3586,1043,2,50,757,3924]);
 assert.equal(metrics.emptyRegionTargets+metrics.resolvedRegionTargets+metrics.recordTargetResolvedBindings+metrics.regionResolvedFieldReviewPendingBindings,metrics.denominator);
 assert.match(fieldBindingCountMeaning(metrics),/A further 50 have region locations with field review still pending/);
});

test('pending field-review region counts cannot disappear or be promoted to reviewed targets',()=>{
 const input=proposedArguments(),evidence=input.systemic.evidenceBindings;
 const rows=pendingRegionBefore.systemic.evidenceBindings.bindings.filter(row=>row.targetStatus==='region-resolved-field-review-pending');
 assert.equal(rows.length,50);evidence.bindings.push(...structuredClone(rows));evidence.denominator+=50;
 evidence.targetStatusCounts['region-resolved-field-review-pending']=50;evidence.reviewStatusCounts['field-target-pending']+=50;
 const metrics=fieldBindingAxisMetrics(input.systemic),queue=input.handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues,counts=input.gaps.coverage.counts;
 queue.fieldEvidenceBindingsDenominator=metrics.denominator;queue.fieldTargetsPending=metrics.fieldTargetNotReviewed;queue.countMeaning=fieldBindingCountMeaning(metrics);
 counts.fieldEvidenceBindingDenominator=metrics.denominator;counts.pendingFieldTargets=metrics.fieldTargetNotReviewed;
 assert.throws(()=>analyzeReportConsistency(input),/pending field-review region count is required in the live handoff/);
 queue.regionResolvedFieldReviewPendingBindings=50;
 assert.throws(()=>analyzeReportConsistency(input),/pending field-review region count is required in the public coverage projection/);
 counts.regionResolvedFieldReviewPendingBindings=50;assert.equal(analyzeReportConsistency(input).validation.valid,true);
 counts.regionResolvedFieldReviewPendingBindings=49;assert.ok(analyzeReportConsistency(input).findings.some(row=>row.id==='pending-region-field-review-count'));
 const promoted=structuredClone(input.systemic),row=promoted.evidenceBindings.bindings.find(row=>row.targetStatus==='region-resolved-field-review-pending');
 row.reviewStatus='field-target-reviewed';promoted.evidenceBindings.reviewStatusCounts['field-target-reviewed']++;promoted.evidenceBindings.reviewStatusCounts['field-target-pending']--;
 assert.throws(()=>fieldBindingAxisMetrics(promoted),/pending field review must retain field-target-pending/);
 const unknown=structuredClone(input.systemic),unknownRow=unknown.evidenceBindings.bindings.find(row=>row.targetStatus==='region-resolved-field-review-pending');
 unknownRow.targetStatus='unknown-region-state';unknown.evidenceBindings.targetStatusCounts['region-resolved-field-review-pending']--;unknown.evidenceBindings.targetStatusCounts['unknown-region-state']=1;
 assert.throws(()=>fieldBindingAxisMetrics(unknown),/unknown target state is unassessable/);
});

test('frozen complete4505 census reproduces stale live wording without conflating binding and review axes',()=>{
 assert.equal(frozen.commit,'ae5195a2efe56f25fe9903f788a3c4c98b4e2064');
 assert.equal(frozen.fullInputCensus.length,1119);
 const input=args(),result=analyzeReportConsistency(input),m=result.metrics;
 assert.equal(input.systemic.evidenceBindings.bindings.length,4505);
 assert.deepEqual([m.denominator,m.emptyRegionTargets,m.resolvedRegionTargets,m.fieldTargetReviewed,m.fieldTargetNotReviewed,m.resolvedButFieldTargetNotReviewed],[4505,3772,733,465,4040,268]);
 assert.deepEqual(m.crossTab,[{targetStatus:'empty-region-target',reviewStatus:'field-target-pending',count:3468},{targetStatus:'empty-region-target',reviewStatus:'source-row-transcribed-bounds-provisional',count:93},{targetStatus:'empty-region-target',reviewStatus:'source-row-value-verified-region-pending',count:211},{targetStatus:'field-target-resolved',reviewStatus:'field-target-reviewed',count:465},{targetStatus:'field-target-resolved',reviewStatus:'region-verified',count:268}]);
 assert.deepEqual(result.findings.map(row=>row.id),['stale-live-binding-count-meaning','stale-live-unchecked-exclusion-count','stale-live-unchecked-exclusion-count','producer-history-and-current-integration-not-explicit','producer-history-and-current-integration-not-explicit']);
 assert.equal(result.validation.valid,false);assert.equal(result.validation.semanticPass,false);
});

test('proposed dynamic metadata clears reporting defects while keeping producer phase and general review pending',()=>{
 const input=proposedArguments(),result=analyzeReportConsistency(input);assert.equal(result.validation.valid,true);assert.deepEqual(result.findings,[]);
 const reports=input.handoff.reviewQueuesNotSourceAbsences.rowNormalizedMonetaryReview.reports;
 assert.equal(reports[0].historicalProducerMetadata.status,'private V5 proposal only; not applied; exact V5 source, condition and context review pending');
 for(const report of reports){assert.equal(report.historicalProducerMetadata.independentOverlayReviewNeeded,true);assert.equal(report.currentReview.generalReviewPending,true);assert.equal(report.currentReview.generalSourceReviewStatus,'pending');assert.equal(report.currentIntegration.semanticPass,false);assert.equal(report.currentIntegration.generalSourceReviewStatus,'pending');assert.equal(report.currentIntegration.sourceInput.sha256,report.sha256);}
 assert.equal(reports[0].currentReview.underlyingSourceQuestions.length,2);assert.equal(reports[0].currentReview.underlyingSourceQuestionRows,9);assert.equal(reports[0].currentReview.globalAudit.retainedUncertainties,8);
});

test('region binding presence cannot be substituted for reviewed or pending field target counts',()=>{
 const input=proposedArguments(),queue=input.handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues;
 queue.fieldTargetsPending=3772;input.gaps.coverage.counts.pendingFieldTargets=3772;
 queue.countMeaning=queue.countMeaning.replace('465 have field-target-reviewed status','733 have field-target-reviewed status');
 const report=analyzeReportConsistency(input);assert.equal(report.validation.valid,false);
 assert.ok(report.findings.some(row=>row.id==='queue-fieldTargetsPending'));assert.ok(report.findings.some(row=>row.id==='public-pendingFieldTargets'));assert.ok(report.findings.some(row=>row.id==='stale-live-binding-count-meaning'));
});

test('current linkage rejects stale exact source, reviews, validator and bridge evidence instead of promoting scopes',()=>{
 const paths=['research/source-audit-batch5-phb-dmg-additional-prices.json','research/monetary-row-identity-reviews.json','tools/monetary-row-identity-audit.mjs',frozen.arguments.registration.migrationBridge.path];
 for(const path of paths){const input=proposedArguments();input.currentHashes[path]='f'.repeat(64);assert.throws(()=>analyzeReportConsistency(input),/Report consistency input/);}
 const scope=proposedArguments();scope.handoff.reviewQueuesNotSourceAbsences.rowNormalizedMonetaryReview.reports[0].currentReview.generalReviewPending=false;assert.throws(()=>analyzeReportConsistency(scope),/general-review limits/);
});

test('all binding rows are required and declared summaries cannot override their actual statuses',()=>{
 const missing=args();missing.systemic.evidenceBindings.bindings.pop();assert.throws(()=>fieldBindingAxisMetrics(missing.systemic),/complete evidence-binding denominator/);
 const summary=args();summary.systemic.evidenceBindings.reviewStatusCounts['field-target-reviewed']=733;assert.throws(()=>fieldBindingAxisMetrics(summary.systemic),/rederive from all rows/);
 const row=args();row.systemic.evidenceBindings.bindings.find(value=>value.targetStatus==='empty-region-target').targetStatus='field-target-resolved';assert.throws(()=>fieldBindingAxisMetrics(row.systemic),/rederive from all rows/);
});

test('record-level source references remain distinct from resolved and reviewed field targets',()=>{
 const input=args(),evidence=input.systemic.evidenceBindings,base=fieldBindingAxisMetrics(input.systemic);
 const record=structuredClone(evidence.bindings[0]);record.bindingPointer='/rules/148/evidenceBindings/0';record.attachmentPointer='/rules/148';record.attachmentRelativePointer='';record.fieldPointer='';record.targetStatus='record-target-resolved';record.reviewStatus='region-verified';record.routeOwner={collection:'rules',itemId:'cleric-turning-table',resolved:true};
 evidence.denominator++;evidence.bindings.push(record);evidence.targetStatusCounts['record-target-resolved']=1;evidence.reviewStatusCounts['region-verified']++;
 const metrics=fieldBindingAxisMetrics(input.systemic);
 assert.equal(metrics.denominator,base.denominator+1);assert.equal(metrics.recordTargetResolvedBindings,1);
 assert.equal(metrics.resolvedRegionTargets,base.resolvedRegionTargets);assert.equal(metrics.fieldTargetReviewed,base.fieldTargetReviewed);
 assert.equal(metrics.fieldTargetNotReviewed,base.fieldTargetNotReviewed+1);assert.equal(metrics.resolvedButFieldTargetNotReviewed,base.resolvedButFieldTargetNotReviewed);
 assert.match(fieldBindingCountMeaning(metrics),/1 whole-record references resolve to source regions/);assert.match(fieldBindingCountMeaning(metrics),/and 1 record-resolved references/);
});

test('public count consistency keeps record-resolved references separate from field targets',()=>{
 const input=proposedArguments(),evidence=input.systemic.evidenceBindings;
 const record=structuredClone(evidence.bindings[0]);record.bindingPointer='/rules/148/evidenceBindings/0';record.targetStatus='record-target-resolved';record.reviewStatus='region-verified';
 evidence.denominator++;evidence.bindings.push(record);evidence.targetStatusCounts['record-target-resolved']=1;evidence.reviewStatusCounts['region-verified']++;
 const metrics=fieldBindingAxisMetrics(input.systemic),queue=input.handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues,counts=input.gaps.coverage.counts;
 queue.fieldEvidenceBindingsDenominator=metrics.denominator;queue.fieldTargetsPending=metrics.fieldTargetNotReviewed;queue.recordTargetResolvedBindings=metrics.recordTargetResolvedBindings;queue.countMeaning=fieldBindingCountMeaning(metrics);
 counts.fieldEvidenceBindingDenominator=metrics.denominator;counts.pendingFieldTargets=metrics.fieldTargetNotReviewed;counts.recordTargetResolvedBindings=metrics.recordTargetResolvedBindings;
 const result=analyzeReportConsistency(input);assert.equal(result.validation.valid,true);assert.deepEqual(result.findings,[]);
 queue.recordTargetResolvedBindings=0;const stale=analyzeReportConsistency(input);assert.ok(stale.findings.some(row=>row.id==='queue-recordTargetResolvedBindings'));
});

test('nonzero record-target categories cannot disappear from either public count object',()=>{
 const input=proposedArguments(),evidence=input.systemic.evidenceBindings;
 for(let i=0;i<2;i++){const record=structuredClone(evidence.bindings[0]);record.bindingPointer=`/rules/148/evidenceBindings/${i}`;record.targetStatus='record-target-resolved';record.reviewStatus='region-verified';evidence.bindings.push(record);}
 evidence.denominator+=2;evidence.targetStatusCounts['record-target-resolved']=2;evidence.reviewStatusCounts['region-verified']+=2;
 const metrics=fieldBindingAxisMetrics(input.systemic),queue=input.handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues,counts=input.gaps.coverage.counts;
 queue.fieldEvidenceBindingsDenominator=metrics.denominator;queue.fieldTargetsPending=metrics.fieldTargetNotReviewed;queue.countMeaning=fieldBindingCountMeaning(metrics);
 counts.fieldEvidenceBindingDenominator=metrics.denominator;counts.pendingFieldTargets=metrics.fieldTargetNotReviewed;
 delete queue.recordTargetResolvedBindings;assert.throws(()=>analyzeReportConsistency(input),/record-target resolution count is required in the live handoff/);
 queue.recordTargetResolvedBindings=2;delete counts.recordTargetResolvedBindings;assert.throws(()=>analyzeReportConsistency(input),/record-target resolution count is required in the public coverage projection/);
 counts.recordTargetResolvedBindings=2;assert.equal(analyzeReportConsistency(input).validation.valid,true);
});

test('the frozen full census reproduces the old unknown-state failure and the partial-helper omitted-axis pass',()=>{
 const metadata=JSON.parse(read('research/source-audit-batch6-record-target-axis-before.json'));
 const compressed=read('research/source-audit-batch6-record-target-axis-before.json.gz');assert.equal(sha(compressed),metadata.inventory.sha256);
 const inventory=JSON.parse(gunzipSync(compressed));assert.equal(inventory.denominator,4545);assert.deepEqual(inventory.targetStatusCounts,{'empty-region-target':3772,'record-target-resolved':2,'field-target-resolved':771});
 const systemic={evidenceBindings:{denominator:inventory.denominator,targetStatusCounts:inventory.targetStatusCounts,reviewStatusCounts:inventory.reviewStatusCounts,bindings:inventory.rows}};
 assert.throws(()=>originalAxisMetrics(systemic),/unknown target state is unassessable/);
 const partial=partialAxisMetrics(systemic),current=fieldBindingAxisMetrics(systemic);
 assert.equal(partial.recordTargetResolvedBindings,2);assert.equal(current.recordTargetResolvedBindings,2);
 assert.deepEqual([current.denominator,current.emptyRegionTargets,current.resolvedRegionTargets,current.fieldTargetReviewed,current.fieldTargetNotReviewed,current.resolvedButFieldTargetNotReviewed],[4545,3772,771,500,4045,271]);
 assert.equal(metadata.priorHelper.sha256,sha(read('tests/fixtures/source-report-consistency-record-target-old-helper-before.mjs')));
 assert.equal(metadata.partialHelper.sha256,sha(read('tests/fixtures/source-report-consistency-record-target-partial-helper-before.mjs')));

 const input=proposedArguments(),evidence=input.systemic.evidenceBindings;
 for(const ref of inventory.wholeRecordBindings)evidence.bindings.push({bindingPointer:ref.bindingPointer,targetStatus:ref.targetStatus,reviewStatus:ref.reviewStatus});
 evidence.denominator+=2;evidence.targetStatusCounts['record-target-resolved']=2;evidence.reviewStatusCounts['region-verified']+=2;
 const metrics=partialAxisMetrics(input.systemic),queue=input.handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues,counts=input.gaps.coverage.counts;
 queue.fieldEvidenceBindingsDenominator=metrics.denominator;queue.fieldTargetsPending=metrics.fieldTargetNotReviewed;queue.countMeaning=partialCountMeaning(metrics);
 counts.fieldEvidenceBindingDenominator=metrics.denominator;counts.pendingFieldTargets=metrics.fieldTargetNotReviewed;
 delete queue.recordTargetResolvedBindings;delete counts.recordTargetResolvedBindings;
 assert.equal(partialAnalyze(input).validation.valid,true,'the incomplete helper leaves a missing public record-target axis undetected');
 assert.throws(()=>analyzeReportConsistency(input),/record-target resolution count is required in the live handoff/);
 queue.recordTargetResolvedBindings=2;counts.recordTargetResolvedBindings=2;queue.countMeaning=fieldBindingCountMeaning(fieldBindingAxisMetrics(input.systemic));
 assert.equal(analyzeReportConsistency(input).validation.valid,true);
});

test('historical discovery text remains separate from current supplemental transcription and findings',()=>{
 const input=proposedArguments(),history=structuredClone(input.handoff.sourcePriceDiscoveryCensuses);
 assert.match(history.summary.interpretation,/zero new row-transcribed groups/);
 assert.equal(input.handoff.summary.sourceCensus.newTableGroupsRowTranscribed,33);
 const result=analyzeReportConsistency(input);assert.equal(result.validation.valid,true);assert.deepEqual(input.handoff.sourcePriceDiscoveryCensuses,history);
 assert.equal(input.handoff.reviewQueuesNotSourceAbsences.rowNormalizedMonetaryReview.reports[0].currentReview.generalReviewPending,true);
});

test('removing a live unchecked-count statement cannot waive its consistency check',()=>{
 const input=proposedArguments();input.handoff.excludedFromGapCount.shift();
 assert.throws(()=>analyzeReportConsistency(input),/one current ordinary-unchecked exclusion is required/);
 const missingPublic=proposedArguments();missingPublic.gaps.coverage.exclusions.shift();
 assert.throws(()=>analyzeReportConsistency(missingPublic),/one current ordinary-unchecked exclusion is required/);
});

test('an impossible reviewed-but-empty target is rejected even when its summary totals agree',()=>{
 const fixture=JSON.parse(read('research/source-audit-batch6-report-impossible-cross-tab-before.json'));
 assert.equal(fixture.fullLiveDenominator,4505);
 assert.equal(fixture.liveReviewedEmptyCases,0);
 assert.equal(fixture.observedAcceptedMetrics.fieldTargetReviewed,15);
 assert.equal(fixture.observedAcceptedMetrics.resolvedRegionTargets,14);
 assert.throws(()=>fieldBindingAxisMetrics(fixture.syntheticInput),/field-target-reviewed binding must resolve to a region/);
});
