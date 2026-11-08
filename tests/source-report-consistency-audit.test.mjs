import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {analyzeReportConsistency,fieldBindingAxisMetrics,fieldBindingCountMeaning} from '../tools/source-report-consistency-audit.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const before=JSON.parse(read('research/source-audit-batch6-report-consistency-before.json'));
const compressed=read(before.fixture.path);assert.equal(sha(compressed),before.fixture.sha256);
const raw=gunzipSync(compressed);assert.equal(sha(raw),before.fixtureUncompressedSha256);
const frozen=JSON.parse(raw),args=()=>structuredClone(frozen.arguments);
function proposedArguments(){
 const input=args(),result=analyzeReportConsistency(input);
 input.handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues.countMeaning=fieldBindingCountMeaning(result.metrics);
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
