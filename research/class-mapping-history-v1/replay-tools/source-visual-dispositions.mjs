import {createHash} from 'node:crypto';

const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const identityFor=usage=>({kind:'current-catalog-binding',collection:usage.collection,itemId:usage.itemId,binding:usage.binding,catalog:usage.catalog,regionId:usage.regionId,book:usage.book,page:usage.page,sourceSha256:usage.sourceSha256,imageSha256:usage.imageSha256,focusSha256:usage.focusSha256,contentSha256:usage.contentSha256});
const open=new Set(['unreviewed','suspected','defect','stale']);
const clean=new Set(['confirmed','exception','not-applicable']);
const statusFor=usage=>Object.fromEntries(['highlight','crop','context','default'].map(dimension=>[dimension,usage.status?.[dimension]||'missing']));

export function stableDispositionId(identity){return `svd-${sha(canonical(identity)).slice(0,20)}`;}

function countsByDimension(usages){
  const result={};
  for(const dimension of ['highlight','crop','context','default']){
    const counts={};for(const usage of usages){const status=usage.status?.[dimension]||'missing';counts[status]=(counts[status]||0)+1;}result[dimension]=counts;
  }
  return result;
}

/** A durable work queue; status labels describe review state, not source truth. */
export function buildDispositionManifest(coverage){
  const usages=coverage.usages||[];
  const current=usages.flatMap(usage=>{
    const status=statusFor(usage),attentionDimensions=Object.entries(status).filter(([,value])=>open.has(value)).map(([dimension])=>dimension);
    if(usage.sentinelPolicyStatus==='historical-exception-needs-scope-review')attentionDimensions.push('sentinel-scope-review');
    else if(['unresolved-full-image-sentinel','mixed-focus-sentinel-review-required'].includes(usage.sentinelPolicyStatus))attentionDimensions.push('sentinel-highlight-review');
    const identity=identityFor(usage);
    const remainsOpen=attentionDimensions.length>0||usage.reviewStale||usage.geometryCandidate||usage.geometryStaleCandidate||usage.sentinel;
    if(!remainsOpen)return [];
    return [{dispositionId:stableDispositionId(identity),identity,link:usage.link,image:usage.image,imageSha256:usage.imageSha256,sourceSha256:usage.sourceSha256,status,attentionDimensions,sentinel:!!usage.sentinel,sentinelPolicyStatus:usage.sentinelPolicyStatus||'not-assessed',geometryCandidateIds:usage.geometryCandidateIds||[],staleGeometryCandidateIds:usage.staleGeometryCandidateIds||[],reviewStale:!!usage.reviewStale,reviewGate:usage.reviewGate||null,recordedReview:usage.recordedReview||null,independentReviewApplied:Object.values(status).some(value=>value==='confirmed'||value==='exception')}];
  });
  const findings=coverage.findingDispositions||[];
  const findingIds=new Set();for(const finding of findings){if(findingIds.has(finding.dispositionId))throw Error(`Duplicate finding disposition ${finding.dispositionId}`);findingIds.add(finding.dispositionId);}
  const counts={
    allCurrentBindings:usages.length,uniqueImages:coverage.totals?.uniqueImages??null,currentBindingsNeedingAttention:current.length,
    rawFullImageSentinelBindings:usages.filter(usage=>usage.sentinel).length,
    sentinelHighlightSuspects:usages.filter(usage=>usage.sentinel&&usage.status?.highlight==='suspected').length,
    sentinelIndependentExceptions:usages.filter(usage=>usage.sentinel&&usage.status?.highlight==='exception').length,
    sentinelOtherHighlightStates:usages.filter(usage=>usage.sentinel&&!['suspected','exception'].includes(usage.status?.highlight)).length,
    sentinelWarningsNeedingScopeReview:usages.filter(usage=>usage.sentinel&&usage.sentinelPolicyStatus==='historical-exception-needs-scope-review').length,
    mixedFocusSentinelWarnings:usages.filter(usage=>usage.sentinel&&usage.sentinelPolicyStatus==='mixed-focus-sentinel-review-required').length,
    mixedFocusSentinelExceptionsRejected:coverage.sentinelPolicy?.mixedFocusSentinelExceptionsRejected??0,
    explicitWholeSpellSentinelExceptions:usages.filter(usage=>usage.sentinel&&usage.sentinelPolicyStatus==='explicit-whole-spell-unmarked-exception').length,
    currentBindingsWithSentinel:usages.filter(usage=>usage.sentinel).length,currentBindingsWithGeometryCandidate:usages.filter(usage=>usage.geometryCandidate).length,
    currentBindingsWithStaleGeometryCandidate:usages.filter(usage=>usage.geometryStaleCandidate).length,
    sentinelPolicy:coverage.sentinelPolicy||null,
    orphanedReviewRecords:coverage.totals?.orphanedReviews??0,orphanedGeometryCandidates:coverage.totals?.orphanedGeometryCandidates??0,
    recordedFindingRecords:findings.length,recordedFindingsMatchingCurrentEvidence:findings.filter(finding=>finding.relation==='current-binding').length,
    recordedFindingsStaleOrUnmatched:findings.filter(finding=>finding.relation!=='current-binding').length,
  };
  const manifest={
    schemaVersion:1,
    scope:'Hash-bound current catalog bindings and preserved triage or dogfood records. Open states are review work; catalog coverage does not establish source completeness or mechanics correctness.',
    inputs:coverage.inputs||{dataSha256:coverage.inputDataSha256||null},
    denominators:{currentCatalogRegionBindings:usages.length,uniqueCatalogImages:coverage.totals?.uniqueImages??null,sourceFindingRecords:findings.length},
    counts,statusCountsByDimension:countsByDimension(usages),currentDispositions:current,historicalFindings:findings,
    orphanedReviews:coverage.orphanedReviews||[],orphanedGeometryCandidates:coverage.orphanedGeometryCandidates||[],
  };
  manifest.structuralValidation={valid:true,errors:[]};
  manifest.structuralValidation.errors=validateDispositionManifest(manifest,coverage);
  manifest.structuralValidation.valid=manifest.structuralValidation.errors.length===0;
  return manifest;
}

export function validateDispositionManifest(manifest,coverage){
  const errors=[];const usages=coverage.usages||[];const findings=coverage.findingDispositions||[];
  if(manifest.denominators?.currentCatalogRegionBindings!==usages.length)errors.push('Disposition denominator differs from current catalog bindings.');
  if(manifest.denominators?.sourceFindingRecords!==findings.length)errors.push('Historical finding denominator differs from configured triage inputs.');
  const expected=usages.filter(usage=>Object.values(statusFor(usage)).some(value=>open.has(value))||usage.reviewStale||usage.geometryCandidate||usage.geometryStaleCandidate||usage.sentinel);
  if(expected.length!==manifest.currentDispositions?.length)errors.push('Disposition queue does not include every current binding with an open state or candidate.');
  const currentIds=new Set(usages.map(usage=>stableDispositionId(identityFor(usage))));
  const queueIds=(manifest.currentDispositions||[]).map(item=>item.dispositionId);
  if(queueIds.some(id=>!currentIds.has(id)))errors.push('Disposition queue contains a binding outside the current report.');
  if(new Set(queueIds).size!==queueIds.length)errors.push('Current binding disposition IDs are not unique.');
  const expectedCurrent=new Set(expected.map(usage=>stableDispositionId(identityFor(usage))));
  if([...expectedCurrent].some(id=>!queueIds.includes(id)))errors.push('Disposition queue dropped an open current binding.');
  const findingIds=new Set(findings.map(finding=>finding.dispositionId));
  if(findingIds.size!==findings.length)errors.push('Coverage findings include duplicate stable IDs.');
  const manifestFindingIds=new Set((manifest.historicalFindings||[]).map(finding=>finding.dispositionId));
  if(manifestFindingIds.size!==(manifest.historicalFindings||[]).length)errors.push('Disposition manifest duplicates a historical finding.');
  if(manifestFindingIds.size!==findingIds.size||[...findingIds].some(id=>!manifestFindingIds.has(id)))errors.push('Disposition manifest dropped or changed a historical finding.');
  for(const finding of findings){if(!finding.origin||!finding.originSha256||!Number.isInteger(finding.recordIndex)||!finding.recordSha256)errors.push(`Historical finding ${finding.dispositionId} lacks exact input-file/record identity.`);}
  for(const usage of usages){
    if(usage.sentinel&&!['suspected','defect','exception'].includes(usage.status?.highlight))errors.push(`Full-image highlight is not preserved as suspected, reviewed defect, or independent exception: ${usageKey(usage)}.`);
    if(usage.sentinel&&usage.status?.highlight==='confirmed')errors.push(`Full-image sentinel cannot be cleared as ordinary confirmed: ${usageKey(usage)}.`);
    if(usage.sentinel&&usage.sentinelPolicyStatus==='explicit-whole-spell-unmarked-exception'&&(usage.status?.highlight!=='exception'||usage.reviewGate?.applied!==true||usage.recordedReview?.assessments?.highlight?.scope!=='whole-spell'||usage.recordedReview?.assessments?.highlight?.kind!=='whole-spell-unmarked'))errors.push(`Full-image sentinel lacks exact explicit whole-spell exception evidence: ${usageKey(usage)}.`);
    if(usage.sentinel&&usage.sentinelPolicyStatus==='mixed-focus-sentinel-review-required'&&!['suspected','defect'].includes(usage.status?.highlight))errors.push(`Mixed-focus full-image sentinel must remain suspected or retain its reviewed defect: ${usageKey(usage)}.`);
    if(usage.sentinel&&usage.status?.highlight==='exception'&&usage.sentinelPolicyStatus!=='explicit-whole-spell-unmarked-exception'&&usage.sentinelPolicyStatus!=='historical-exception-needs-scope-review')errors.push(`Full-image sentinel exception has no scope-review policy state: ${usageKey(usage)}.`);
    if(usage.status?.crop==='confirmed'&&usage.status?.context==='unreviewed'){} // Distinct assessments are allowed; neither implies the other.
  }
  if(manifest.counts?.sentinelPolicy?.rawFullImageSentinelBindings!==coverage.sentinelPolicy?.rawFullImageSentinelBindings)errors.push('Sentinel policy denominator differs from current raw sentinel bindings.');
  if(manifest.counts?.sentinelPolicy?.historicalHighlightExceptionDenominator!==coverage.sentinelPolicy?.historicalHighlightExceptionDenominator)errors.push('Historical sentinel-exception denominator changed.');
  return [...new Set(errors)];
}
const usageKey=usage=>`${usage.collection}:${usage.itemId}/${usage.binding}/${usage.regionId}`;

const cell=value=>String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');
export function renderDispositionMarkdown(manifest){
  const counts=manifest.counts;
  let markdown=`# Source visual dispositions\n\n${manifest.scope}\n\nCurrent region bindings: **${counts.allCurrentBindings}** · unique images: **${counts.uniqueImages??'unavailable'}** · bindings with open review states: **${counts.currentBindingsNeedingAttention}** · recorded triage/dogfood records: **${counts.recordedFindingRecords}**. These are different denominators and overlap.\n\n`;
  markdown+=`Open bindings include **${counts.rawFullImageSentinelBindings}** raw full-image sentinel usages: **${counts.sentinelHighlightSuspects}** are still suspected and **${counts.sentinelIndependentExceptions}** have a recorded exact hash-bound independent exception. **${counts.mixedFocusSentinelWarnings}** mixed-focus sentinels remain actionable, including **${counts.mixedFocusSentinelExceptionsRejected}** hash-exact exception reviews rejected because a precise focus shares the region. **${counts.sentinelWarningsNeedingScopeReview}** current exception sentinels still need explicit scope/kind review; **${counts.explicitWholeSpellSentinelExceptions}** meet the structured pure whole-spell-unmarked policy. Historical exceptions needing scope review: **${counts.sentinelPolicy?.historicalExceptionsNeedingScopeReview??0} / ${counts.sentinelPolicy?.historicalHighlightExceptionDenominator??0}**. Field-target focus is independent: **${counts.sentinelPolicy?.factFocus?.factFocusPending??0} / ${counts.sentinelPolicy?.factFocus?.fieldEvidenceBindingDenominator??0}** field bindings remain pending, including **${counts.sentinelPolicy?.factFocus?.sentinelLinkedFactFocusPending??0} / ${counts.sentinelPolicy?.factFocus?.sentinelLinkedFieldBindingDenominator??0}** linked to sentinel regions. There are **${counts.currentBindingsWithGeometryCandidate}** current geometry candidates, **${counts.currentBindingsWithStaleGeometryCandidate}** stale geometry candidates, and **${counts.orphanedReviewRecords}** orphaned independent review records. Geometry is candidate evidence only.\n\n`;
  markdown+='## Current bindings needing attention\n\n| Disposition | Entry and region | Source | Highlight | Crop | Context | Default | Other evidence |\n|---|---|---|---|---|---|---|---|\n';
  for(const item of manifest.currentDispositions){
    const identity=item.identity;const entry=`${identity.collection}:${identity.itemId} · ${identity.regionId}`;
    const source=`${identity.book||'unknown'} p.${identity.page??'?'}`;
    const other=[item.sentinel?`full-image sentinel: ${item.sentinelPolicyStatus}`:'',item.geometryCandidateIds.length?`geometry ${item.geometryCandidateIds.join(', ')}`:'',item.staleGeometryCandidateIds.length?`stale geometry ${item.staleGeometryCandidateIds.join(', ')}`:'',item.reviewStale?'stale review':''].filter(Boolean).join('; ')||'—';
    markdown+=`| ${item.dispositionId} | [${cell(entry)}](${item.link}) | ${source} | ${item.status.highlight} | ${item.status.crop} | ${item.status.context} | ${item.status.default} | ${cell(other)} |\n`;
  }
  markdown+='\n## Preserved triage and dogfood records\n\nRecorded states remain separate from hash-bound independent review. Exact current hashes link records to current bindings; stale or incomplete identities remain visible without being promoted to verdicts.\n\n| Disposition | Origin / candidate | Recorded state | Current evidence relation | Reason |\n|---|---|---|---|---|\n';
  for(const finding of manifest.historicalFindings){
    const matches=(finding.matches?.length?finding.matches:finding.candidateBindings||[]).map(match=>`${match.collection}:${match.itemId} · ${match.regionId}`).join(', ')||'—';
    markdown+=`| ${finding.dispositionId} | ${cell(`${finding.origin} / ${finding.candidateId||`record-${finding.recordIndex}`}`)} | ${cell(finding.recordedStatus)} | ${cell(finding.relation)}${matches==='—'?'':` — ${cell(matches)}`} | ${cell(finding.reason||finding.record?.note||'')} |\n`;
  }
  markdown+=`\nStructural consistency: **${manifest.structuralValidation.valid?'passed':'failed'}**${manifest.structuralValidation.errors.length?` (${manifest.structuralValidation.errors.map(cell).join(' ')})`:''}.\n`;
  return markdown;
}
