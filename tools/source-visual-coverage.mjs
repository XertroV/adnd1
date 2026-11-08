// Public catalog coverage only: this tool never reads originals or OCR.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildDispositionManifest,renderDispositionMarkdown,stableDispositionId} from './source-visual-dispositions.mjs';
import {reportContextContracts} from './citation-context-contract.mjs';
import {validateContinuationManifest} from './continuation-contract.mjs';
import {buildPriceSourceInventory,validatePriceSourceInventory} from './price-source-inventory.mjs';
import {loadRasterSnapshotInput} from './source-raster-coverage.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const require=createRequire(import.meta.url),citations=require('../dist/citations.js'),books=require('../dist/books.js');
const sha=value=>createHash('sha256').update(value).digest('hex');
export function canonical(value){
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value!==null&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function regionHashes(region){
  const {focusRects,...content}=region;
  return {focusSha256:sha(canonical(focusRects)),contentSha256:sha(canonical(content))};
}
const usageKey=usage=>[usage.collection,usage.itemId,usage.binding,usage.regionId].join('|');
const dimensions=['highlight','crop','context','default'];
const actionable=new Set(['unreviewed','suspected','defect','stale']);
const isExplicitWholeSpellException=assessment=>assessment?.status==='exception'&&assessment.independent===true&&assessment.scope==='whole-spell'&&assessment.kind==='whole-spell-unmarked';
const isFullImageSentinel=rect=>Array.isArray(rect)&&rect.length===4&&rect[0]===0&&rect[1]===0&&rect[2]===1&&rect[3]===1;
function emptyCounts(){return {total:0,reviewed:0,unreviewed:0,confirmed:0,defect:0,suspected:0,exception:0,stale:0};}
function count(map,dimension,status,stale){
  const counts=map[dimension];counts.total++;
  if(['confirmed','defect','exception'].includes(status))counts.reviewed++;else counts.unreviewed++;
  if(['confirmed','defect','suspected','exception'].includes(status))counts[status]++;
  if(stale)counts.stale++;
}
const recordRefs=finding=>finding.usages||finding.linkedUsages||finding.bindings||[];
function findingLocation(record){
  const source=record.source||{};
  return {book:record.book||source.book||null,page:record.printedPage??source.printedPage??source.page??null,pdfPage:record.pdfPage??source.pdfPage??null};
}
function findingImageHash(record){return record.imageSha256||record.baselineImageSha256||record.currentImageSha256||null;}
function exactUsageRef(usage,ref){
  return (!ref.collection||usage.collection===ref.collection)&&(!ref.itemId||usage.itemId===ref.itemId)&&(!ref.binding||usage.binding===ref.binding)&&(!ref.regionId||usage.regionId===ref.regionId)&&(!ref.catalog||usage.catalog===ref.catalog);
}
function normalizeHistoricalFindings(findings,usages){
  return findings.map((entry,index)=>{
    const record=entry.record||entry;
    const location=findingLocation(record);
    const imageSha256=findingImageHash(record);
    const sourceCandidate=record.source?.sha256||record.sourceSha256||entry.sourceSha256||null;
    const sourceSha256=typeof sourceCandidate==='string'?sourceCandidate:null;
    const refs=recordRefs(record);
    const pageCandidates=usages.filter(usage=>(!location.book||usage.book===location.book)&&(location.page==null||usage.page===location.page));
    const identityCandidates=refs.length?usages.filter(usage=>refs.some(ref=>exactUsageRef(usage,ref))):pageCandidates;
    const refCandidates=identityCandidates.filter(usage=>(!location.book||usage.book===location.book)&&(location.page==null||usage.page===location.page));
    const imageMatches=refCandidates.filter(usage=>imageSha256&&usage.imageSha256===imageSha256&&usage.reviewGate?.imageBytesMatch);
    const hashCandidates=imageMatches.filter(usage=>sourceSha256&&usage.sourceSha256===sourceSha256);
    let disposition;
    if(!imageSha256)disposition='identity-incomplete';
    else if(!sourceSha256&&imageMatches.length)disposition='current-image-match-source-hash-missing';
    else if(!sourceSha256)disposition='identity-incomplete';
    else if(hashCandidates.length)disposition='current-binding';
    else if(refCandidates.length)disposition='binding-present-evidence-changed';
    else if(identityCandidates.length)disposition='binding-present-source-location-changed';
    else if(pageCandidates.length)disposition='page-present-binding-unmatched';
    else disposition='unmatched-current-catalog';
    const identity={origin:entry.origin||'unknown',originSha256:entry.originSha256||null,recordIndex:entry.recordIndex??index,candidateId:record.candidateId||null,recordSha256:sha(canonical(record))};
    const dispositionId=stableDispositionId({kind:'historical-triage-record',...identity});
    return {
      dispositionId,origin:identity.origin,originSha256:identity.originSha256,recordIndex:identity.recordIndex,
      candidateId:identity.candidateId,recordSha256:identity.recordSha256,recordedStatus:record.status||record.state||record.reviewStatus||'unrecorded',
      category:record.category||null,reason:record.reason||record.observation||record.note||null,limitations:record.limitations||null,
      book:location.book,page:location.page,pdfPage:location.pdfPage,image:record.image||record.baselineImage||null,
      imageSha256,sourceSha256,relation:disposition,
      matches:(hashCandidates.length?hashCandidates:!sourceSha256?imageMatches:[]).map(usage=>({collection:usage.collection,itemId:usage.itemId,binding:usage.binding,regionId:usage.regionId,catalog:usage.catalog,link:usage.link,sourceSha256:usage.sourceSha256,imageSha256:usage.imageSha256})),
      candidateBindings:identityCandidates.map(usage=>({collection:usage.collection,itemId:usage.itemId,binding:usage.binding,regionId:usage.regionId,catalog:usage.catalog,link:usage.link,book:usage.book,page:usage.page,sourceSha256:usage.sourceSha256,imageSha256:usage.imageSha256})),
      identityRefs:refs,
      record,
    };
  });
}

/**
 * Build binding-level visual coverage. Automated geometry and historical triage
 * stay candidate evidence; only current hash-bound independent ledger records
 * produce accepted dimension states.
 */
export function buildVisualCoverage(data,loadCatalog,ledger={reviews:[]},geometry=null,{
  dataFileHash=null,loadImage=null,knownFindings=[],inputHashes={},priceInventory=null,
  priceInventoryValidation=null,continuationManifest=null,contextContractManifest=null,
}={}){
  const records=['rules','spells','equipment','matrices','classes'].flatMap(collection=>(data[collection]||[]).map(item=>({collection,item})));
  if(data.progressionExplainer)records.push({collection:'progressionExplainer',item:{...data.progressionExplainer,id:'progression-explainer'}});
  const reviewMap=new Map();
  for(const review of ledger.reviews||[]){const key=usageKey(review);if(reviewMap.has(key))throw Error(`Duplicate visual review ${key}`);reviewMap.set(key,review);}
  const counts={highlight:emptyCounts(),crop:emptyCounts(),context:emptyCounts(),default:emptyCounts()},byCategory={};
  const usages=[],pairs=new Set(),images=new Set(),catalogCache=new Map(),imageHashCache=new Map();
  const dataHash=sha(JSON.stringify(data));
  const geometryValid=!!geometry;
  const geometryDataMatches=geometry?.inputDataSha256===(dataFileHash||dataHash);
  for(const {collection,item} of records){
    for(const page of citations.pages(item))pairs.add(`${collection}|${item.id}|${page.book}|${page.page}`);
    for(const binding of ['sourceExcerpts','scanVerification'].filter(name=>item[name]?.catalog)){
      const viewerSelected=binding===(item.sourceExcerpts?'sourceExcerpts':'scanVerification');
      const catalogPath=item[binding].catalog;
      if(!catalogCache.has(catalogPath))catalogCache.set(catalogPath,loadCatalog(catalogPath));
      const raw=catalogCache.get(catalogPath),catalog=raw.catalog||raw;
      byCategory[collection] ||= {highlight:emptyCounts(),crop:emptyCounts(),context:emptyCounts(),default:emptyCounts()};
      const groups=new Map();
      for(const region of catalog.regions||[]){const group=`${region.book}:${region.printedPage}`;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(region);}
      for(const regions of groups.values()){
        const ordered=[...regions].sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
        const orderSha256=sha(canonical(ordered.map(region=>({id:region.id,role:region.role||null,imageSha256:region.sha256,...regionHashes(region)}))));
        for(const [ordinal,region] of ordered.entries()){
          const sourceIdentity=books.resolveRegionSourceIdentity(catalog,region);
          const usage={collection,itemId:item.id,binding,catalog:catalogPath,regionId:region.id,book:region.book,page:region.printedPage,printedPage:region.printedPage,pdfPage:region.pdfPage,image:region.image,imageSha256:region.sha256,width:region.width,height:region.height,title:region.title||null,focusRects:region.focusRects||[],cropBounds:region.normalizedPageRect||null,...regionHashes(region),viewerSelected,default:viewerSelected&&ordinal===0,defaultOrderSha256:viewerSelected&&ordinal===0?orderSha256:null,sourceSha256:sourceIdentity?.valid?sourceIdentity.sourceSha256:null,sourceKind:sourceIdentity?.sourceKind||'invalid-source-identity',sourceArtifactId:sourceIdentity?.sourceArtifactId||null,canonicalPdfSha256:sourceIdentity?.valid?sourceIdentity.canonicalPdfSha256:null,role:region.role||null};
          images.add(region.sha256);
          const imageKey=`${catalogPath}|${region.image}`;
          if(loadImage&&!imageHashCache.has(imageKey))imageHashCache.set(imageKey,sha(loadImage(catalogPath,region.image)));
          const imageMatches=!!loadImage&&imageHashCache.get(imageKey)===region.sha256;
          const saved=reviewMap.get(usageKey(usage));
          const reviewHashesMatch=!!saved&&imageMatches&&!!usage.sourceSha256&&saved.sourceSha256===usage.sourceSha256&&saved.imageSha256===usage.imageSha256&&saved.focusSha256===usage.focusSha256&&saved.contentSha256===usage.contentSha256;
          const focusRects=region.focusRects||[];
          const sentinelRects=focusRects.filter(isFullImageSentinel);
          const sentinel=sentinelRects.length>0;
          const onlySentinel=sentinel&&sentinelRects.length===focusRects.length;
          const mixedSentinel=sentinel&&!onlySentinel;
          const geometryUsage=geometryValid&&raw.sha256&&imageMatches&&geometry.sourcePdfSha256?.[region.book]===catalog.sources?.[region.book]?.sha256&&geometry.catalogSha256?.[catalogPath]===raw.sha256?geometry.usages?.find(candidate=>usageKey(candidate)===usageKey(usage)&&candidate.imageSha256===usage.imageSha256&&candidate.sourceHashMatches&&candidate.imageHashMatches):null;
          const snapshotCandidates=(geometry?.candidates||[]).filter(candidate=>(candidate.usages||[]).some(candidateUsage=>usageKey(candidateUsage)===usageKey(usage)));
          const currentGeometryCandidates=geometryUsage?snapshotCandidates.filter(candidate=>candidate.imageSha256===usage.imageSha256):[];
          const staleGeometryCandidates=snapshotCandidates.filter(candidate=>!currentGeometryCandidates.some(current=>current.candidateId===candidate.candidateId));
          const currentDefaultOrderMatches=usage.default&&saved?.defaultOrderSha256===usage.defaultOrderSha256;
          const status={};
          for(const dimension of dimensions){
            if(dimension==='default'&&!usage.default){status[dimension]='not-applicable';continue;}
            const verdict=reviewHashesMatch&&(dimension!=='default'||currentDefaultOrderMatches)?saved.assessments?.[dimension]:null;
            const accepted=['confirmed','defect','exception'].includes(verdict?.status)&&verdict.independent===true&&!(dimension==='highlight'&&sentinel&&(verdict.status==='confirmed'||(verdict.status==='exception'&&!onlySentinel)))&&typeof verdict.evidence==='string'&&verdict.evidence.trim();
            status[dimension]=accepted?verdict.status:dimension==='highlight'&&sentinel?'suspected':dimension==='crop'&&currentGeometryCandidates.length?'suspected':dimension==='default'&&geometryUsage?.defaultContextCandidate?'suspected':'unreviewed';
            const stale=!!saved&&(!reviewHashesMatch||(dimension==='default'&&!!saved.assessments?.default&&!currentDefaultOrderMatches));
            count(counts,dimension,status[dimension],stale);count(byCategory[collection],dimension,status[dimension],stale);
          }
          const reviewStale=!!saved&&(!reviewHashesMatch||(usage.default&&!!saved.assessments?.default&&!currentDefaultOrderMatches));
          const scopedSentinelException=sentinel&&onlySentinel&&status.highlight==='exception'&&reviewHashesMatch&&isExplicitWholeSpellException(saved?.assessments?.highlight);
          const sentinelPolicyStatus=!sentinel?'not-applicable':scopedSentinelException?'explicit-whole-spell-unmarked-exception':mixedSentinel?'mixed-focus-sentinel-review-required':status.highlight==='exception'?'historical-exception-needs-scope-review':'unresolved-full-image-sentinel';
          usage.status=status;usage.reviewStale=reviewStale;usage.sentinel=sentinel;usage.sentinelPolicyStatus=sentinelPolicyStatus;
          usage.geometryCandidate=currentGeometryCandidates.length>0;usage.geometryStaleCandidate=staleGeometryCandidates.length>0;
          usage.geometryCandidateIds=currentGeometryCandidates.map(candidate=>candidate.candidateId);
          usage.staleGeometryCandidateIds=staleGeometryCandidates.map(candidate=>candidate.candidateId);
          usage.reviewGate={imageBytesMatch:imageMatches,sourceHashMatch:!!saved&&saved.sourceSha256===usage.sourceSha256,imageHashMatch:!!saved&&saved.imageSha256===usage.imageSha256,focusHashMatch:!!saved&&saved.focusSha256===usage.focusSha256,contentHashMatch:!!saved&&saved.contentSha256===usage.contentSha256,defaultOrderHashMatch:!usage.default||!saved?.assessments?.default||currentDefaultOrderMatches,applied:reviewHashesMatch};
          usage.recordedReview=saved?{sourceSha256:saved.sourceSha256,imageSha256:saved.imageSha256,focusSha256:saved.focusSha256,contentSha256:saved.contentSha256,defaultOrderSha256:saved.defaultOrderSha256||null,assessments:saved.assessments||{},reviewer:saved.reviewer||null,reviewedAt:saved.reviewedAt||null}:null;
          usage.link=`https://xertrov.github.io/adnd1/#${collection}/${encodeURIComponent(item.id)}?source=${encodeURIComponent(`${region.book}:${region.printedPage}`)}&region=${encodeURIComponent(region.id)}`;
          usages.push(usage);
        }
      }
    }
  }
  const findingDispositions=normalizeHistoricalFindings(knownFindings,usages);
  const activeKeys=new Set(usages.map(usageKey));
  const orphanedReviews=[...reviewMap.values()].filter(review=>!activeKeys.has(usageKey(review))).map(review=>({collection:review.collection,itemId:review.itemId,binding:review.binding,regionId:review.regionId,sourceSha256:review.sourceSha256,imageSha256:review.imageSha256,focusSha256:review.focusSha256,contentSha256:review.contentSha256,assessments:review.assessments||{}}));
  const orphanedGeometryCandidates=(geometry?.candidates||[]).flatMap(candidate=>(candidate.usages||[]).filter(usage=>!activeKeys.has(usageKey(usage))).map(usage=>({candidateId:candidate.candidateId,collection:usage.collection,itemId:usage.itemId,binding:usage.binding,regionId:usage.regionId,catalog:usage.catalog,imageSha256:candidate.imageSha256})));
  const reviewLedgerSummary={recordCount:(ledger.reviews||[]).length,assessmentCounts:Object.fromEntries(dimensions.map(dimension=>[dimension,(ledger.reviews||[]).filter(review=>review.assessments?.[dimension]).reduce((acc,review)=>{const status=review.assessments[dimension].status||'missing';acc[status]=(acc[status]||0)+1;return acc;},{})]))};
  const contextContracts=contextContractManifest?reportContextContracts(data,loadCatalog,contextContractManifest):null;
  let continuationValidation=null,continuationValidationError=null;
  if(continuationManifest){try{continuationValidation={...validateContinuationManifest(continuationManifest,{data,catalogRoot:path.resolve(root,'dist')}),valid:true,errors:[]};}catch(error){continuationValidationError=error.message;continuationValidation={groups:continuationManifest.groups?.length??0,segments:(continuationManifest.groups||[]).reduce((total,group)=>total+(group.segments||[]).length,0),presentSegments:null,blockedSegments:null,regressionBindings:null,statusCounts:{},valid:false,errors:[error.message]};}}
  const continuationSummary=continuationManifest?{
    schemaVersion:continuationManifest.schemaVersion??null,scope:continuationManifest.scope||null,
    ...continuationValidation,groupCount:continuationValidation.groups,segmentCount:continuationValidation.segments,stateCounts:continuationValidation.statusCounts,
    blockedSegmentList:(continuationManifest.groups||[]).flatMap(group=>(group.segments||[]).filter(segment=>segment.state==='blocked-source-unavailable').map(segment=>({groupId:group.id,order:segment.order,role:segment.role,book:segment.book,printedPage:segment.printedPage??null}))),validationError:continuationValidationError,
  }:null;
  const priceSummary=priceInventory? summarizePriceInventory(priceInventory,priceInventoryValidation):null;
  const sentinelUsages=usages.filter(usage=>usage.sentinel);
  const historicalHighlightExceptions=(ledger.reviews||[]).filter(review=>review.assessments?.highlight?.status==='exception');
  const historicalExceptionsNeedingScopeReview=historicalHighlightExceptions.filter(review=>!isExplicitWholeSpellException(review.assessments.highlight));
  const fieldBindings=priceInventory?.fieldEvidenceBindings||[];
  const fieldTargetStatusCounts={},fieldValuePathStatusCounts={};
  for(const binding of fieldBindings){const state=binding.reviewStatus||'unspecified';fieldTargetStatusCounts[state]=(fieldTargetStatusCounts[state]||0)+1;const valueState=binding.valuePathStatus||'unspecified';fieldValuePathStatusCounts[valueState]=(fieldValuePathStatusCounts[valueState]||0)+1;}
  const findBindingUsages=binding=>{
    const regionIds=new Set(binding.regionIds||[]);
    if(!regionIds.size||!binding.catalog)return [];
    return usages.filter(usage=>usage.catalog===binding.catalog&&regionIds.has(usage.regionId)&&!(binding.regionEvidence||[]).some(evidence=>evidence.regionId===usage.regionId&&((evidence.imageSha256&&evidence.imageSha256!==usage.imageSha256)||(evidence.sourceSha256&&usage.sourceSha256&&evidence.sourceSha256!==usage.sourceSha256))));
  };
  const sentinelFieldBindings=fieldBindings.filter(binding=>findBindingUsages(binding).some(usage=>usage.sentinel));
  const fieldFocusPolicy={
    fieldEvidenceBindingDenominator:fieldBindings.length,
    fieldTargetReviewed:fieldBindings.filter(binding=>binding.reviewStatus==='field-target-reviewed').length,
    factFocusPending:fieldBindings.filter(binding=>binding.reviewStatus!=='field-target-reviewed').length,
    reviewStatusCounts:fieldTargetStatusCounts,
    valuePathStatusCounts:fieldValuePathStatusCounts,
    valuePathsMissing:fieldBindings.filter(binding=>binding.valuePathStatus==='value-path-missing').length,
    bindingsWithRegionTargets:fieldBindings.filter(binding=>(binding.regionIds||[]).length>0).length,
    bindingsWithoutRegionTargets:fieldBindings.filter(binding=>(binding.regionIds||[]).length===0).length,
    sentinelLinkedFieldBindingDenominator:sentinelFieldBindings.length,
    sentinelLinkedFieldTargetsReviewed:sentinelFieldBindings.filter(binding=>binding.reviewStatus==='field-target-reviewed').length,
    sentinelLinkedFactFocusPending:sentinelFieldBindings.filter(binding=>binding.reviewStatus!=='field-target-reviewed').length,
    scope:'Field-to-region review is an independent dimension. A whole-spell highlight exception never clears a pending or missing field target.'
  };
  const explicitWholeSpellExceptions=sentinelUsages.filter(usage=>usage.sentinelPolicyStatus==='explicit-whole-spell-unmarked-exception').length;
  const mixedFocusSentinelExceptionsRejected=sentinelUsages.filter(usage=>usage.sentinelPolicyStatus==='mixed-focus-sentinel-review-required'&&usage.reviewGate?.applied&&usage.recordedReview?.assessments?.highlight?.status==='exception').length;
  const sentinelPolicy={
    rawFullImageSentinelBindings:sentinelUsages.length,
    unresolvedHighlightWarnings:sentinelUsages.length-explicitWholeSpellExceptions,
    unreviewedOrSuspectedSentinels:sentinelUsages.filter(usage=>['unreviewed','suspected'].includes(usage.status.highlight)).length,
    mixedFocusSentinelBindings:sentinelUsages.filter(usage=>usage.sentinelPolicyStatus==='mixed-focus-sentinel-review-required').length,
    mixedFocusSentinelExceptionsRejected,
    currentExactExceptionsNeedingScopeReview:sentinelUsages.filter(usage=>usage.status.highlight==='exception'&&usage.reviewGate?.applied&&usage.sentinelPolicyStatus==='historical-exception-needs-scope-review').length,
    historicalHighlightExceptionDenominator:historicalHighlightExceptions.length,
    historicalExceptionsNeedingScopeReview:historicalExceptionsNeedingScopeReview.length,
    historicalExceptionsWithExplicitWholeSpellScope:historicalHighlightExceptions.length-historicalExceptionsNeedingScopeReview.length,
    explicitWholeSpellExceptions,
    requiredExceptionScope:'whole-spell',requiredExceptionKind:'whole-spell-unmarked',
    factFocus:fieldFocusPolicy
  };
  const reportableStatuses=new Set(['confirmed-defect','clipped-repair-candidate','source-location-or-relevance-check','pending-defect']);
  const reportedFindings=findingDispositions.filter(finding=>reportableStatuses.has(finding.recordedStatus)&&['current-binding','current-image-match-source-hash-missing'].includes(finding.relation)).map(finding=>({candidateId:finding.candidateId,origin:finding.origin,status:finding.recordedStatus,category:finding.category||'unspecified',reason:finding.reason||'',limitations:finding.limitations||null,book:finding.book,page:finding.page,imageSha256:finding.imageSha256,bindings:finding.matches.map(match=>({collection:match.collection,itemId:match.itemId,binding:match.binding,regionId:match.regionId,catalog:match.catalog,link:match.link}))}));
  return {
    schemaVersion:2,scope:'Public catalog bindings and independently recorded visual reviews. Unreviewed is not confirmed safe; geometry is candidate evidence only. Catalog binding counts do not establish source completeness.',
    inputDataSha256:dataHash,inputs:inputHashes,geometrySnapshotApplied:geometryValid,geometrySnapshotDataMatches:geometryDataMatches,
    totals:{citedRecordPagePairs:pairs.size,regionUsages:usages.length,uniqueImages:images.size,geometryCandidates:usages.filter(usage=>usage.geometryCandidate).length,staleGeometryCandidates:usages.filter(usage=>usage.geometryStaleCandidate).length,orphanedGeometryCandidates:orphanedGeometryCandidates.length,orphanedReviews:orphanedReviews.length,historicalFindingRecords:findingDispositions.length,historicalFindingCurrentHashMatches:findingDispositions.filter(finding=>finding.relation==='current-binding').length,reportedFindings:reportedFindings.length,fullImageSentinelBindings:usages.filter(usage=>usage.sentinel).length,sentinelHighlightSuspects:usages.filter(usage=>usage.sentinel&&usage.status.highlight==='suspected').length,sentinelIndependentExceptions:usages.filter(usage=>usage.sentinel&&usage.status.highlight==='exception').length,sentinelOtherHighlightStates:usages.filter(usage=>usage.sentinel&&!['suspected','exception'].includes(usage.status.highlight)).length},
    denominators:{citedRecordPagePairs:pairs.size,regionBindings:usages.length,uniqueImages:images.size,independentReviewRecords:reviewLedgerSummary.recordCount,historicalTriageRecords:findingDispositions.length,fieldEvidenceBindings:fieldBindings.length},
    counts,byCategory,usages,reviewLedgerSummary,findingDispositions,reportedFindings,orphanedGeometryCandidates,orphanedReviews,
    priceInventory:priceSummary,continuations:continuationSummary,contextContracts,sentinelPolicy,
  };
}

export function summarizePriceInventory(inventory,validation=null){
  const sources=(inventory.sourceInventories||[]).map(source=>{
    const rows=source.sourceRows||source.rows||[];const statuses={};
    for(const row of rows){const state=row.reviewStatus?.final||row.status||row.reviewStatus?.sourceValues||row.evidenceBindings?.[0]?.reviewStatus||'unspecified';statuses[state]=(statuses[state]||0)+1;}
    return {id:source.id,category:source.category,denominators:source.denominator??[],rowCount:source.rowCount??rows.length,statuses,sourceFiles:source.sourceFiles||[]};
  });
  const claims=inventory.siteClaims||[];const siteClaimStates={},siteClaimTargetStatuses={};
  for(const claim of claims){const state=claim.reviewStatus||claim.status||'unspecified';siteClaimStates[state]=(siteClaimStates[state]||0)+1;}
  const siteClaimTargetBindings=claims.flatMap(claim=>{
    const targetPointer=claim.fieldPointer||'/price';
    const bindings=Array.isArray(claim.evidenceBindings)&&claim.evidenceBindings.length?claim.evidenceBindings:claim.printedPrice?.evidenceBindings||[];
    return bindings.filter(binding=>!binding.fieldPointer||binding.fieldPointer===targetPointer);
  });
  for(const binding of siteClaimTargetBindings){const state=binding.reviewStatus||'unspecified';siteClaimTargetStatuses[state]=(siteClaimTargetStatuses[state]||0)+1;}
  const printedPriceBindings=claims.flatMap(claim=>{
    if(!claim.printedPrice)return [];
    const targetPointer=claim.fieldPointer||'/price';
    const valueBindings=claim.printedPrice?.evidenceBindings;
    const bindings=Array.isArray(valueBindings)&&valueBindings.length?valueBindings:Array.isArray(claim.evidenceBindings)?claim.evidenceBindings:[];
    return bindings.filter(binding=>!binding.fieldPointer||binding.fieldPointer===targetPointer);
  });
  const printedPriceSourceValueStatuses={};
  for(const binding of printedPriceBindings){const state=binding.sourceValueStatus||'no-independent-source-value-status';printedPriceSourceValueStatuses[state]=(printedPriceSourceValueStatuses[state]||0)+1;}
  const estimateCount=inventory.counts?.editorialEstimates??claims.filter(claim=>claim.estimate).length;
  const estimateOverlap={editorialEstimateCount:estimateCount,editorialEstimatesWithinPriceGapObjects:claims.filter(claim=>claim.estimate&&!claim.printedPrice).length,priceGapObjectDenominator:inventory.counts?.sitePriceGaps??claims.filter(claim=>!claim.printedPrice).length};
  const bindings=inventory.fieldEvidenceBindings||[];const bindingStatuses={},bindingsByCollection={};
  for(const binding of bindings){const state=binding.reviewStatus||'unspecified';bindingStatuses[state]=(bindingStatuses[state]||0)+1;const collection=binding.collection||'unspecified';bindingsByCollection[collection]??={count:0,statuses:{}};bindingsByCollection[collection].count++;bindingsByCollection[collection].statuses[state]=(bindingsByCollection[collection].statuses[state]||0)+1;}
  const pageCensuses=(inventory.sourcePageCensuses||[]).map(census=>{
    const pages=Array.isArray(census.pageCensus)?census.pageCensus:Array.isArray(census.pageCensus?.pages)?census.pageCensus.pages:Array.isArray(census.sourceArtifact?.pageCensus)?census.sourceArtifact.pageCensus:[];
    const declared=census.denominator||census.pageCensus?.denominator||[];
    const denominator=Array.isArray(declared)?declared:Array.isArray(declared.units)?declared.units:[declared];
    const pageDenominator=denominator.find(entry=>String(entry.kind||'').toLowerCase().includes('page'))?.count??pages.length;
    const isCandidate=page=>page.screenDisposition==='broad-text-candidate'||page.screenDisposition==='candidate'||page.candidate===true||page.isCandidate===true||page.screenCandidate===true||Boolean((page.candidateReasons||[]).length)||Boolean(Object.values(page.screenCueCounts||{}).some(value=>Number(value)>0));
    const visualStatus=page=>page.visualReviewStatus||page.visualStatus||page.reviewStatus||page.visualReview?.status||'unspecified';
    const reviewed=status=>/(reviewed|confirmed|checked|inspected|viewed)/i.test(String(status))&&!/(unreviewed|not.*review|pending|unknown|not.*assessed|not.*viewed)/i.test(String(status));
    const reviewStatusCounts={};for(const page of pages){const state=String(visualStatus(page));reviewStatusCounts[state]=(reviewStatusCounts[state]||0)+1;}
    const candidates=pages.filter(isCandidate);
    return {id:census.id||census.book||'source-census',sourceFiles:census.sourceFiles||[],sourceIdentity:census.sourceIdentity||null,sourceArtifact:census.sourceArtifact||null,scope:census.scope||null,denominator,pageDenominator,pages,screenedPageCount:pages.filter(page=>page.screened===true||page.textScreened===true||page.screenStatus||page.screenDisposition||page.textLayerStatus).length,candidatePageCount:candidates.length,candidatePagesVisuallyReviewed:candidates.filter(page=>reviewed(visualStatus(page))).length,candidatePagesUnreviewed:candidates.filter(page=>!reviewed(visualStatus(page))).length,visuallyReviewedPageCount:pages.filter(page=>reviewed(visualStatus(page))).length,visualReviewStatusCounts:reviewStatusCounts,claimCount:(census.claims||[]).length,tableGroupCount:(census.tableGroups||[]).length,exclusionCount:(census.exclusions||[]).length,unresolvedCount:(census.unresolved||census.unresolvedCandidates||[]).length,claims:census.claims||[],tableGroups:census.tableGroups||[],exclusions:census.exclusions||[],unresolved:census.unresolved||census.unresolvedCandidates||[]};
  });
  const discoveryCandidates=inventory.sourcePageDiscovery?.books?.reduce((total,book)=>total+(Number.isInteger(book.candidatePages)?book.candidatePages:Array.isArray(book.candidatePages)?book.candidatePages.length:Array.isArray(book.candidates)?book.candidates.length:0),0)??inventory.discoveries?.length??0;
  return {schemaVersion:inventory.schemaVersion??null,scope:inventory.scope||null,sourceInventories:sources,sourceRowCount:sources.reduce((total,source)=>total+source.rowCount,0),sourceTableDenominatorCount:sources.length,sourcePageCensuses:pageCensuses,pageCensusPageCount:pageCensuses.reduce((total,census)=>total+census.pageDenominator,0),siteClaimDenominator:inventory.counts?.siteEquipmentObjects??inventory.counts?.siteClaims??claims.length,siteClaimCount:claims.length,siteClaimStates,siteClaimTargetBindingDenominator:siteClaimTargetBindings.length,siteClaimTargetStatuses,printedPriceEvidenceBindingDenominator:printedPriceBindings.length,printedPriceSourceValueStatuses,estimateOverlap,fieldEvidenceBindingCount:bindings.length,fieldEvidenceBindingStatuses:bindingStatuses,fieldEvidenceBindingsByCollection:bindingsByCollection,discoveries:discoveryCandidates,counts:inventory.counts||{},validation};
}

export function renderPriceInventoryMarkdown(inventory){
  const esc=value=>String(value??'—').replaceAll('|','\\|').replaceAll('\n',' ');
  const price=value=>value?`${value.amount??''} ${value.currency??''}`.trim():'—';
  let markdown=`# Equipment price and source-field inventory\n\n${inventory.scope||'Bounded source-first inventory.'} The JSON companion contains every bounded source row and field binding. This report has separate source-table, site-object and citation-field denominators; it does not assert whole-book price completeness.\n\n`;
  const summary=summarizePriceInventory(inventory);
  const estimateOverlap=summary.estimateOverlap;
  const estimateNote=estimateOverlap.editorialEstimateCount?` (${estimateOverlap.editorialEstimatesWithinPriceGapObjects} overlap price-gap objects; counts are not additive)`:'';
  markdown+=`Site equipment objects: **${inventory.counts?.siteEquipmentObjects??inventory.siteClaims?.length??0}** · printed prices: **${inventory.counts?.sitePrintedPrices??'unavailable'}** · price gaps: **${inventory.counts?.sitePriceGaps??'unavailable'}** · editorial estimates: **${inventory.counts?.editorialEstimates??'unavailable'}**${estimateNote}. Field evidence bindings: **${inventory.fieldEvidenceBindings?.length??0}**.\n\n`;
  const censusSummary=summary.sourcePageCensuses;
  if(censusSummary.length)markdown+=`Source-page census: **${censusSummary.reduce((total,census)=>total+census.pageDenominator,0)} PDF pages** across **${censusSummary.length} named source censuses**. Page screening/visual-review counts have their own denominators; they do not certify that no other page contains a monetary claim.\n\n`;
  if(inventory.validation)markdown+=`Inventory structural validation: **${inventory.validation.valid?'passed':'failed'}**${inventory.validation.errors?.length?` (${inventory.validation.errors.join(' ')})`:''}. This checks current data consistency; it is not a visual source review.\n\n`;
  markdown+='## Named source-table denominators\n\n| Source inventory | Category | Source rows | Additional denominator units | Status counts |\n|---|---|---:|---|---|\n';
  for(const source of inventory.sourceInventories||[]){const denominators=(source.denominator||[]).map(entry=>`${entry.kind}: ${entry.count}`).join('; ');const statuses={};for(const row of source.sourceRows||[]){const state=row.reviewStatus?.final||row.reviewStatus?.sourceValues||'unspecified';statuses[state]=(statuses[state]||0)+1;}markdown+=`| ${esc(source.id)} | ${esc(source.category)} | ${source.rowCount} | ${esc(denominators)} | ${esc(Object.entries(statuses).map(([state,count])=>`${state}: ${count}`).join('; '))} |\n`;}
  markdown+=`\nSite claim states (${summary.siteClaimCount} site objects): ${esc(Object.entries(summary.siteClaimStates).map(([status,count])=>`${status}: ${count}`).join('; ')||'not recorded')}. Site-claim target-evidence bindings: **${summary.siteClaimTargetBindingDenominator}**; target-review statuses: ${esc(Object.entries(summary.siteClaimTargetStatuses).map(([status,count])=>`${status}: ${count}`).join('; ')||'not recorded')}. Printed-price evidence-binding denominator: **${summary.printedPriceEvidenceBindingDenominator}**; source-value statuses: ${esc(Object.entries(summary.printedPriceSourceValueStatuses).map(([status,count])=>`${status}: ${count}`).join('; ')||'not recorded')}. Target-location review does not imply source-value confirmation.\n\n`;
  if(censusSummary.length){
    markdown+='\n## Source-page census\n\nEvery page listed below belongs to its source PDF-page denominator. Cue and visual-review states document screening scope; they do not assert that an unflagged or unreviewed page contains no monetary claim, and they do not make the source-row inventory exhaustive.\n\n| Census | PDF-page denominator | Pages recorded | Text-screened | Broad cue candidates | Candidate pages visually reviewed | Candidate pages still pending | Claims | Table groups | Exclusions | Unresolved |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
    for(const census of censusSummary)markdown+=`| ${esc(census.id)} | ${census.pageDenominator} | ${census.pages.length} | ${census.screenedPageCount} | ${census.candidatePageCount} | ${census.candidatePagesVisuallyReviewed} | ${census.candidatePagesUnreviewed} | ${census.claimCount} | ${census.tableGroupCount} | ${census.exclusionCount} | ${census.unresolvedCount} |\n`;
    const pageRef=page=>{const book=page.book||page.source?.book||page.sourceIdentity?.book||'book unspecified';const printed=page.printedPage??page.page?.printedPage??null;const pdf=page.pdfPage??page.page?.pdfPage??null;return `${book}${printed==null?'':` p.${printed}`}${pdf==null?'':` / PDF ${pdf}`}`;};
    const candidateCue=page=>{const cues=Object.entries(page.screenCueCounts||{}).filter(([,count])=>Number(count)>0).map(([name,count])=>`${name}:${count}`);return cues.join(', ')||(page.candidateReasons||page.candidateReason||[]).toString()||'—';};
    const claimValue=claim=>{const value=claim.amountOrFormula??claim.amount??claim.value??claim.price??claim.sourceValue;return value==null?'—':typeof value==='object'?JSON.stringify(value):String(value);};
    const claimPages=claim=>{const pages=claim.sourcePages||claim.sourcePageReference?.pages||claim.sourcePageReference?.printedPages||[];if(!Array.isArray(pages))return '—';return pages.map(page=>typeof page==='object'?`${page.book||claim.book||''} p.${page.printedPage??page.page??'?'} / PDF ${page.pdfPage??'?'}`:`${claim.book||''} p.${page}`).join(', ')||`${claim.book||''} p.${claim.printedPage??claim.page??'?'}`;};
    const claimStatus=claim=>claim.sourceReviewStatus||claim.reviewStatus?.final||claim.reviewStatus||claim.sourceReview?.value||claim.status||claim.interpretationStatus||'unspecified';
    for(const census of censusSummary){
      const identities=Array.isArray(census.sourceIdentity)?census.sourceIdentity:census.sourceArtifact?.sources||[census.sourceIdentity].filter(Boolean);
      const identityText=identities.map(source=>`${source.book||source.name||source.bookKey||'?'} SHA256 ${source.sourceSha256||source.sha256||'not recorded'}`).join('; ')||'source hash not recorded';
      markdown+=`\n### ${esc(census.id)}\n\n${esc(census.scope||'Source-page census.')} Source files: ${esc(census.sourceFiles.join(', ')||'not stated')}. Source identity: ${esc(identityText)}. Review-status counts: ${esc(Object.entries(census.visualReviewStatusCounts).map(([status,count])=>`${status}: ${count}`).join('; ')||'not recorded')}.\n\n| Page reference | Text characters | Text layer | Screen/candidate state | Cue summary | Visual review status |\n|---|---:|---|---|---|---|\n`;
      for(const page of census.pages){const textCount=page.textCharCount??page.textCharacters??page.textLength??'—';const textState=page.textLayerStatus||page.textStatus||page.textLayerState||'unspecified';const screenState=page.screenDisposition||page.screenStatus||page.candidateStatus||'unspecified';const visualState=page.visualReviewStatus||page.visualStatus||page.reviewStatus||page.visualReview?.status||'unspecified';markdown+=`| ${esc(pageRef(page))} | ${esc(textCount)} | ${esc(textState)} | ${esc(screenState)} | ${esc(candidateCue(page))} | ${esc(visualState)} |\n`;}
      if(census.claims.length){markdown+='\nMonetary and valuation claims documented in this census:\n\n| Source object or passage | Claim type | Amount/formula | Currency | Unit | Source location | Review/interpretation status |\n|---|---|---|---|---|---|---|\n';for(const claim of census.claims){const subject=claim.sourceObjectOrPassage||claim.subject||claim.object||claim.sourceObject||claim.passageIdentity||claim.id||'unspecified';markdown+=`| ${esc(subject)} | ${esc(claim.claimType||claim.type||'unspecified')} | ${esc(claimValue(claim))} | ${esc(claim.currency||'—')} | ${esc(claim.unit||claim.units||'—')} | ${esc(claimPages(claim))} | ${esc(claimStatus(claim))} |\n`;}}
      if(census.tableGroups.length){markdown+='\nTable/group scope:\n\n| Table group | Denominator / rows | Status or note |\n|---|---:|---|\n';for(const group of census.tableGroups){const denom=group.denominator||group.rowCount||group.rows?.length||'—';markdown+=`| ${esc(group.id||group.name||group.sourceObject||'unnamed')} | ${esc(typeof denom==='object'?JSON.stringify(denom):denom)} | ${esc(group.status||group.note||group.scope||'—')} |\n`;}}
      if(census.exclusions.length||census.unresolved.length){markdown+='\nExclusions and unresolved readings:\n\n| Record | Source location | Disposition | Status |\n|---|---|---|---|\n';for(const record of [...census.exclusions,...census.unresolved]){const subject=record.sourceObjectOrPassage||record.subject||record.object||record.id||'unspecified';const location=record.source?`${record.source.book||''} p.${record.source.printedPage??'?'} / PDF ${record.source.pdfPage??'?'}`:record.sourcePage?`${record.book||''} p.${record.sourcePage.printedPage??'?'} / PDF ${record.sourcePage.pdfPage??'?'}`:claimPages(record);const disposition=record.disposition||record.reason||record.notes?.join?.('; ')||record.sourceReading||'—';markdown+=`| ${esc(subject)} | ${esc(location)} | ${esc(disposition)} | ${esc(record.reviewStatus||record.sourceReviewStatus||'unspecified')} |\n`;}}
    }
  }
  markdown+='\n## Site equipment claims and evidence bindings\n\nEvery equipment object appears once. A missing price, estimate, unbound excerpt, or unreviewed field remains explicit. Target-location status and source-value status are separate; estimates do not become printed prices. Coordinates are copied from the source inventory and retain their declared coordinate spaces.\n\n| Object | Claim | Value | Source pages | Target review status | Source-value status | Catalog regions | Crop coordinates | Highlight coordinates | Context status |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
  for(const claim of inventory.siteClaims||[]){const targetPointer=claim.fieldPointer||'/price';const targetBindings=claim.evidenceBindings?.length?claim.evidenceBindings:claim.printedPrice?.evidenceBindings||[];const binding=targetBindings.find(candidate=>!candidate.fieldPointer||candidate.fieldPointer===targetPointer)||null;const pageList=claim.sourcePageReference?.printedPages||[];const pages=pageList.length?pageList.map((page,index)=>`${claim.sourcePageReference.book||binding?.book||'?'} printed p.${page}${claim.sourcePageReference.pdfPages?.[index]?` / PDF p.${claim.sourcePageReference.pdfPages[index]}`:''}`).join(', '):binding?.printedPage?`${binding.book||'?'} printed p.${binding.printedPage}${binding.pdfPage?` / PDF p.${binding.pdfPage}`:''}`:'—';const regions=binding?.regionIds?.map(id=>{const href=`https://xertrov.github.io/adnd1/#equipment/${encodeURIComponent(claim.itemId)}?source=${encodeURIComponent(`${binding.book||'PHB'}:${binding.printedPage||pageList[0]||35}`)}&region=${encodeURIComponent(id)}`;return `[${id}](${href})`;}).join(', ')||'—';const crop=(binding?.cropCoordinates||[]).map(entry=>`${entry.regionId}: ${entry.coordinateSpace} ${JSON.stringify(entry.rect)}`).join('; ')||'—';const highlight=(binding?.highlightCoordinates||[]).map(entry=>`${entry.regionId}: ${entry.coordinateSpace} ${JSON.stringify(entry.rects)}`).join('; ')||'—';const estimate=claim.estimate?`${price(claim.estimate.value)} (editorial estimate)`:'—';const value=claim.printedPrice?`${price(claim.printedPrice)}${claim.estimate?`; ${estimate}`:''}`:claim.estimate?estimate:'— (price gap)';const sourceHash=binding?.sourceSha256?`; source sha256:${binding.sourceSha256}`:'';const valueBindings=claim.printedPrice?(claim.printedPrice.evidenceBindings?.length?claim.printedPrice.evidenceBindings:claim.evidenceBindings||[]):[];const valueStatuses=[...new Set(valueBindings.map(entry=>entry.sourceValueStatus).filter(Boolean))];const valueStatus=valueStatuses.join(', ')||'no-independent-source-value-status';const targetStatus=binding?.reviewStatus||'no-target-binding';markdown+=`| ${esc(claim.name)} (${esc(claim.itemId)}) | ${esc(claim.fieldPointer||'/price')} | ${esc(value)} | ${esc(pages+sourceHash)} | ${esc(targetStatus)} | ${esc(valueStatus)} | ${regions} | ${esc(crop)} | ${esc(highlight)} | ${esc(binding?.contextStatus||'context-not-assessed')} |\n`;}
  markdown+='\n## Source-page discovery\n\n';const discovery=inventory.sourcePageDiscovery;markdown+=`${esc(discovery?.scope||'No discovery index attached.')} Automated candidate pages are explicitly non-exhaustive and unreviewed.\n`;
  return markdown;
}

function mdCell(value){return String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');}
export function renderMarkdown(report){
  let out=`# Source visual coverage\n\n${report.scope}\n\nCited record-page pairs: **${report.totals.citedRecordPagePairs}** · region bindings: **${report.totals.regionUsages}** · unique images: **${report.totals.uniqueImages}**. Geometry snapshot available: **${report.geometrySnapshotApplied?'yes':'no'}**; whole-data hash matches: **${report.geometrySnapshotDataMatches?'yes':'no'}**. Current geometry candidates: **${report.totals.geometryCandidates}**; stale candidates: **${report.totals.staleGeometryCandidates}**; orphaned geometry usages: **${report.totals.orphanedGeometryCandidates}**. Historical triage records retained: **${report.totals.historicalFindingRecords}**; records matching current source and image hashes: **${report.totals.historicalFindingCurrentHashMatches}**.\n\nExact full-image highlight sentinel counts: **${report.totals.fullImageSentinelBindings}** raw bindings; **${report.totals.sentinelHighlightSuspects}** still suspected; **${report.totals.sentinelIndependentExceptions}** exact hash-bound exception records (scope still assessed below); **${report.totals.sentinelOtherHighlightStates}** other states. These denominators concern separate units and overlap. They do not establish whole-book completeness.\n\n${report.sentinelPolicy?`Current warning policy: **${report.sentinelPolicy.unresolvedHighlightWarnings} / ${report.sentinelPolicy.rawFullImageSentinelBindings}** sentinel warnings remain actionable; **${report.sentinelPolicy.mixedFocusSentinelBindings}** mixed-focus sentinel bindings remain actionable, including **${report.sentinelPolicy.mixedFocusSentinelExceptionsRejected}** hash-exact exception reviews rejected because other precise foci share the region; **${report.sentinelPolicy.historicalExceptionsNeedingScopeReview} / ${report.sentinelPolicy.historicalHighlightExceptionDenominator}** historical exceptions need explicit scope/kind review; **${report.sentinelPolicy.explicitWholeSpellExceptions}** current pure whole-spell-unmarked exceptions meet policy; **${report.sentinelPolicy.factFocus.factFocusPending} / ${report.sentinelPolicy.factFocus.fieldEvidenceBindingDenominator}** field-target bindings remain pending. A whole-spell exception never clears fact-focus work.\n\n`:''}| Collection | Dimension | Binding denominator | Reviewed | Unreviewed | Confirmed | Defect | Suspected | Exception | Stale |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for(const [category,dims] of Object.entries(report.byCategory))for(const [dimension,counts] of Object.entries(dims))out+=`| ${mdCell(category)} | ${dimension} | ${counts.total} | ${counts.reviewed} | ${counts.unreviewed} | ${counts.confirmed} | ${counts.defect} | ${counts.suspected} | ${counts.exception} | ${counts.stale} |\n`;
  out+='\n## Independently recorded review ledger\n\nLedger records remain separate from triage reports. Accepted assessment counts are applied only when source, image bytes, focus geometry, content and (for defaults) ordered page-group hashes match. A sentinel warning clears only with an explicit independent exception whose structured scope and kind match the whole-spell-unmarked policy. Legacy exception records lacking those fields remain visible and actionable.\n\n';
  for(const [dimension,states] of Object.entries(report.reviewLedgerSummary.assessmentCounts))out+=`- ${dimension}: ${Object.entries(states).map(([status,count])=>`${status} ${count}`).join(', ')||'no recorded assessments'}\n`;
  if(report.sentinelPolicy){const policy=report.sentinelPolicy,focus=policy.factFocus;out+=`\n## Full-image sentinel warning policy\n\nEvery raw full-image sentinel remains visible in the review workflow. A whole-spell exception clears a sentinel warning only when the region contains only the full-image sentinel rectangle and the current independent review is hash-exact with scope=whole-spell and kind=whole-spell-unmarked. Mixed-focus regions retain an actionable warning, even when a matching review records a whole-spell exception. This policy does not establish source completeness or mechanics correctness, and it never waives field-target focus.\n\n| Policy unit | Count | Denominator / meaning |\n|---|---:|---|\n| Raw full-image sentinel bindings | ${policy.rawFullImageSentinelBindings} | Current region-binding denominator |\n| Unresolved sentinel highlight warnings | ${policy.unresolvedHighlightWarnings} | Raw sentinels minus explicit current pure whole-spell exceptions |\n| Unreviewed or suspected sentinel bindings | ${policy.unreviewedOrSuspectedSentinels} | Current sentinel bindings |\n| Mixed-focus sentinel bindings | ${policy.mixedFocusSentinelBindings} | Regions with a sentinel plus one or more precise focus rectangles |\n| Whole-spell exception reviews rejected for mixed focus | ${policy.mixedFocusSentinelExceptionsRejected} | Hash-exact exception reviews that cannot clear mixed-focus sentinels |\n| Current exact exceptions pending scope review | ${policy.currentExactExceptionsNeedingScopeReview} | Hash-matched sentinel exceptions lacking explicit scope/kind |\n| Historical exceptions pending scope review | ${policy.historicalExceptionsNeedingScopeReview} | ${policy.historicalHighlightExceptionDenominator} recorded highlight exceptions |\n| Historical exceptions with explicit whole-spell scope | ${policy.historicalExceptionsWithExplicitWholeSpellScope} | Same historical exception denominator |\n| Explicit whole-spell exceptions | ${policy.explicitWholeSpellExceptions} | Current pure sentinel exceptions meeting both required fields |\n| Field-target bindings reviewed | ${focus.fieldTargetReviewed} | ${focus.fieldEvidenceBindingDenominator} field-evidence bindings |\n| Fact-focus pending | ${focus.factFocusPending} | Field bindings without field-target-reviewed status |\n| Field value paths missing | ${focus.valuePathsMissing} | Counted separately; not a resolved target |\n| Sentinel-linked field targets pending | ${focus.sentinelLinkedFactFocusPending} | ${focus.sentinelLinkedFieldBindingDenominator} field bindings linked to sentinel regions |\n\n${focus.scope}\n\n`}
  if(report.contextContracts){out+=`\n## Reviewed table-context extent contracts\n\n${report.contextContracts.scope} **${report.contextContracts.total}** previously reviewed table extents are checked for structural crop containment. This preserves the recorded extent and does not create a new visual verdict. Violations or unavailable contracts: **${report.contextContracts.violations.length}**.\n\n| Contract | Binding | Status | Detail |\n|---|---|---|---|\n`;for(const check of report.contextContracts.checks)out+=`| ${mdCell(check.id)} | ${mdCell(check.collection+':'+check.itemId+' · '+check.regionId)} | ${check.status} | ${mdCell(check.reason)} |\n`;}
  if(report.priceInventory){const estimateOverlap=report.priceInventory.estimateOverlap||{};const estimateNote=estimateOverlap.editorialEstimateCount?` Editorial estimates: ${estimateOverlap.editorialEstimateCount}, of which ${estimateOverlap.editorialEstimatesWithinPriceGapObjects} overlap price-gap objects; these counts are not additive.`:'';out+=`\n## Price/source-field inventory\n\n${report.priceInventory.scope||'Bounded source-first price inventory.'} Source rows in named inventories: **${report.priceInventory.sourceRowCount}** across **${report.priceInventory.sourceTableDenominatorCount}** distinct table inventories. Site claim objects: **${report.priceInventory.siteClaimCount} / ${report.priceInventory.siteClaimDenominator}**. Field evidence bindings: **${report.priceInventory.fieldEvidenceBindingCount}** across assembled collections. ${report.priceInventory.sourcePageCensuses.length?`Source-page census: **${report.priceInventory.pageCensusPageCount} PDF pages** across **${report.priceInventory.sourcePageCensuses.length} named source censuses**. `:''}Source-row, page, site-object, and field-binding denominators are different units and do not assert whole-book completeness. Inventory structural validation: **${report.priceInventory.validation?.valid===false?'failed':report.priceInventory.validation?.valid===true?'passed':'unavailable'}**; this checks bindings/data consistency, not visual source review.${estimateNote}\n\n| Source inventory | Category | Source rows | Additional denominator units | Recorded statuses |\n|---|---|---:|---|---|\n`;for(const source of report.priceInventory.sourceInventories)out+=`| ${mdCell(source.id)} | ${mdCell(source.category)} | ${source.rowCount} | ${mdCell(source.denominators.map(entry=>`${entry.kind}: ${entry.count}`).join('; '))} | ${mdCell(Object.entries(source.statuses).map(([status,count])=>`${status}: ${count}`).join(', '))} |\n`;out+=`\nSite claim states: ${mdCell(Object.entries(report.priceInventory.siteClaimStates||{}).map(([status,count])=>`${status}: ${count}`).join(', ')||'not available')}. Site-claim target-evidence bindings: **${report.priceInventory.siteClaimTargetBindingDenominator??0}**; target-review statuses: ${mdCell(Object.entries(report.priceInventory.siteClaimTargetStatuses||{}).map(([status,count])=>`${status}: ${count}`).join(', ')||'not available')}. Printed-price evidence-binding denominator: **${report.priceInventory.printedPriceEvidenceBindingDenominator??0}**; source-value statuses: ${mdCell(Object.entries(report.priceInventory.printedPriceSourceValueStatuses||{}).map(([status,count])=>`${status}: ${count}`).join(', ')||'not available')}. Other field-binding target-review statuses: ${mdCell(Object.entries(report.priceInventory.fieldEvidenceBindingStatuses).map(([status,count])=>`${status}: ${count}`).join(', ')||'not available')}. Field-binding counts by collection: ${mdCell(Object.entries(report.priceInventory.fieldEvidenceBindingsByCollection).map(([collection,value])=>`${collection}: ${value.count}`).join(', ')||'not available')}. Discovery candidate pages: **${report.priceInventory.discoveries}** (unreviewed, non-exhaustive). See the companion price-source-inventory report for every equipment object, source-page census, source claim, source binding, crop, and highlight coordinate.\n`;}
  if(report.continuations){out+=`\n## Citation continuation inventory\n\n${report.continuations.scope||'Known continuation requirements only.'} Groups: **${report.continuations.groupCount}**; segments: **${report.continuations.segmentCount}**; source-unavailable required segments: **${report.continuations.blockedSegmentList.length}**. Structural validation: **${report.continuations.valid?'passed':'failed'}**. This known-case inventory does not certify that all continuations have been discovered.\n\n| Segment state | Count |\n|---|---:|\n`;for(const [state,count] of Object.entries(report.continuations.stateCounts))out+=`| ${mdCell(state)} | ${count} |\n`;}
  out+='\n## Historical triage and dogfood records\n\nEvery record from the configured triage inputs is preserved with its exact record hash, origin-file hash, recorded status and relation to current bindings. Triage status does not become an independent review verdict.\n\n| Disposition | Origin | Candidate | Recorded status | Current relation | Source and image identity | Reason |\n|---|---|---|---|---|---|---|---|\n';
  for(const finding of report.findingDispositions){const source=`${finding.book||'unknown'} p.${finding.page??'?'}`;const links=finding.matches.length?finding.matches:finding.candidateBindings||[];out+=`| ${finding.dispositionId} | ${mdCell(finding.origin)} | ${mdCell(finding.candidateId||`record-${finding.recordIndex}`)} | ${mdCell(finding.recordedStatus)} | ${finding.relation}${links.length?` (${links.map(match=>mdCell(`${match.collection}:${match.itemId}/${match.regionId}`)).join(', ')})`:''} | ${source}; image ${finding.imageSha256?'sha256:'+finding.imageSha256.slice(0,12):'missing'}; source ${finding.sourceSha256?'sha256:'+finding.sourceSha256.slice(0,12):'missing'} | ${mdCell(finding.reason)} |\n`;}
  if(report.orphanedGeometryCandidates.length){out+='\n## Orphaned geometry candidates\n\n';for(const candidate of report.orphanedGeometryCandidates)out+=`- ${candidate.candidateId} · ${candidate.collection}:${candidate.itemId} · ${candidate.regionId} (${candidate.catalog})\n`;}
  if(report.orphanedReviews.length){out+='\n## Orphaned independent review records\n\n';for(const review of report.orphanedReviews)out+=`- ${review.collection}:${review.itemId} · ${review.binding} · ${review.regionId} · source ${review.sourceSha256||'missing'} · image ${review.imageSha256||'missing'}\n`;}
  out+='\n## Bindings requiring review or attention\n\n';
  for(const usage of report.usages.filter(entry=>Object.values(entry.status).some(status=>actionable.has(status))||entry.reviewStale||entry.geometryCandidate||entry.geometryStaleCandidate||entry.sentinel))out+=`- [${usage.collection}:${usage.itemId} · ${usage.book} p.${usage.page} · ${usage.regionId}](${usage.link}) — highlight ${usage.status.highlight}, crop ${usage.status.crop}, context ${usage.status.context}, default ${usage.status.default}${usage.reviewStale?' (stale review)':''}${usage.sentinel?' (full-image sentinel)':''}${usage.geometryCandidate?` (geometry ${usage.geometryCandidateIds.join(', ')})`:''}${usage.geometryStaleCandidate?` (stale geometry ${usage.staleGeometryCandidateIds.join(', ')})`:''}${usage.viewerSelected?'':' (legacy binding; viewer uses its preferred catalog)'}.\n`;
  return out;
}

const triagePaths=[
  'research/source-visual-audit-phb-ua-triage.json','research/source-visual-audit-mm-triage.json',
  'research/phb-equipment-visual-triage.json','research/highlight-dmg-clipping-triage.json',
  'research/phb-45-75-visual-triage.json','research/phb-75-100-visual-triage.json',
  'research/ua-other-visual-review.json','research/nonphb-equipment-visual-review.json',
  'research/source-viewer-dogfood-findings.json',
];
function collectTriage(read,hashFile){
  const all=[];const inputs={};
  for(const origin of triagePaths){
    let value;try{value=read(origin);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    const originSha256=hashFile(origin);inputs[origin]=originSha256;
    const records=value.records||value.candidates||value.findings||[];
    records.forEach((record,recordIndex)=>{
      const book=record.book||record.source?.book;
      const sourceCandidate=record.source?.sha256||record.sourceSha256||value.sourceSha256||value.baselineSourcePdfSha256?.[book]||null;
      all.push({origin,originSha256,recordIndex,record,sourceSha256:typeof sourceCandidate==='string'?sourceCandidate:null});
    });
  }
  return {records:all,inputs};
}
function readOptional(read,filename){try{return read(filename);}catch(error){if(error.code==='ENOENT')return null;throw error;}}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const read=filename=>JSON.parse(readFileSync(path.resolve(root,filename),'utf8'));
  const fileHash=filename=>sha(readFileSync(path.resolve(root,filename)));
  const data=read('dist/data.json'),ledger=read('research/source-visual-reviews.json');
  const activeRaster = loadRasterSnapshotInput();
  let geometry=null,geometryPath=null;for(const candidate of activeRaster.geometry ? [activeRaster.geometry.path] : ['research/source-visual-audit-release.json','research/source-visual-audit-corrected.json']){geometry=readOptional(read,candidate);if(geometry){geometryPath=candidate;break;}}
  const triage=collectTriage(read,fileHash);
  const canonicalPriceInventory=readOptional(read,'research/price-source-inventory.json');
  const priceInventory=canonicalPriceInventory||buildPriceSourceInventory();
  let priceInventoryValidation;
  try{validatePriceSourceInventory(priceInventory);priceInventoryValidation={valid:true,errors:[]};}
  catch(error){priceInventoryValidation={valid:false,errors:[error.message]};}
  const continuationManifest=readOptional(read,'research/citation-continuations.json');
  const contextContractManifest=readOptional(read,'research/citation-context-contracts.json');
  const inputHashes={data:fileHash('dist/data.json'),independentReviewLedger:fileHash('research/source-visual-reviews.json'),triage:triage.inputs,geometry:geometryPath?{file:geometryPath,sha256:fileHash(geometryPath)}:null,priceInventory:canonicalPriceInventory?{file:'research/price-source-inventory.json',sha256:fileHash('research/price-source-inventory.json')}:{generatedInMemorySha256:sha(JSON.stringify(priceInventory))},continuationManifest:continuationManifest?{file:'research/citation-continuations.json',sha256:fileHash('research/citation-continuations.json')}:null,contextContractManifest:contextContractManifest?{file:'research/citation-context-contracts.json',sha256:fileHash('research/citation-context-contracts.json')}:null};
  const report=buildVisualCoverage(data,filename=>{const bytes=readFileSync(path.resolve(root,'dist',filename));return {catalog:JSON.parse(bytes),sha256:sha(bytes)};},ledger,geometry,{
    knownFindings:triage.records,inputHashes,priceInventory,priceInventoryValidation,continuationManifest,contextContractManifest,
    dataFileHash:fileHash('dist/data.json'),
    loadImage:(catalog,image)=>readFileSync(path.resolve(root,'dist',path.dirname(catalog),image)),
  });
  const outDir=path.resolve(process.argv[2]||path.join(root,'artifacts/source-visual-coverage'));mkdirSync(outDir,{recursive:true});
  const dispositions=buildDispositionManifest(report);
  writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(path.join(outDir,'report.md'),renderMarkdown(report));
  writeFileSync(path.join(outDir,'dispositions.json'),JSON.stringify(dispositions,null,2)+'\n');
  writeFileSync(path.join(outDir,'dispositions.md'),renderDispositionMarkdown(dispositions));
  writeFileSync(path.join(outDir,'price-source-inventory.json'),JSON.stringify(priceInventory,null,2)+'\n');
  writeFileSync(path.join(outDir,'price-source-inventory.md'),renderPriceInventoryMarkdown(priceInventory));
  const structuralErrors=[...dispositions.structuralValidation.errors];
  if(report.priceInventory?.validation?.valid===false)structuralErrors.push(...report.priceInventory.validation.errors.map(error=>`Price inventory: ${error}`));
  if(report.continuations?.valid===false)structuralErrors.push(`Continuation manifest: ${report.continuations.validationError}`);
  if(report.contextContracts?.violations?.length)structuralErrors.push(`${report.contextContracts.violations.length} context-extent contract check(s) failed`);
  console.log(JSON.stringify({totals:report.totals,inputs:Object.keys(report.inputs.triage||{}).length,priceInventory:report.priceInventory?.validation,continuations:report.continuations?{groups:report.continuations.groupCount,segments:report.continuations.segmentCount,valid:report.continuations.valid}:null,contextContracts:report.contextContracts?{total:report.contextContracts.total,violations:report.contextContracts.violations.length}:null,dispositionValidation:dispositions.structuralValidation,structuralErrors}));
  if(structuralErrors.length)process.exitCode=1;
}
