import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {validateAssassinContextAudit,validateContinuationManifest} from '../tools/continuation-contract.mjs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const bytes=path=>readFileSync(path);
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const manifest=read('research/citation-continuations.json');
const integration=read('research/source-audit-batch5-continuation-integration.json');
const historicalExpansion=read('tests/fixtures/citation-continuation-expansion-22.json');
const assassinAudit=read('research/assassin-context-audit.json');
const data=read('dist/data.json');
const context={data,catalogRoot:'dist'};

test('current continuation groups bind ordered segments, catalogs and source pages',()=>{
  const summary=validateContinuationManifest(manifest,context);
  const expectedSegments=manifest.groups.reduce((sum,group)=>sum+group.segments.length,0);
  assert.equal(summary.groups,manifest.groups.length);
  assert.equal(summary.segments,expectedSegments);
  assert.equal(summary.presentSegments+summary.blockedSegments,expectedSegments);
  assert.equal(summary.blockedSegments,manifest.groups.flatMap(group=>group.segments).filter(segment=>segment.state==='blocked-source-unavailable').length);
  assert.equal(summary.regressionBindings,2);
  assert.deepEqual(summary.statusCounts,manifest.groups.reduce((counts,group)=>{
    counts[group.status]=(counts[group.status]??0)+1;
    return counts;
  },{}));
});

test('frozen 22-group expansion receipt preserves the historical 14-group prefix and eight reviewed additions',()=>{
  const receipt=historicalExpansion;
  assert.equal(sha(bytes('tests/fixtures/citation-continuation-expansion-22.json')),'b596af78feaa8bb0c5d6e3c0b93dcc6627e7fe14a47e134396b61729b7100e0c');
  assert.equal(receipt.frozenFrom.baselineCommit,'679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.equal(receipt.frozenFrom.baselineManifestSha256,'9504a11f432fd7531f95d0bea4b81a8f50c67e9607c6bfc6faf4aa67b3ef5001');
  assert.equal(receipt.frozenFrom.expandedManifestSha256,'5b5c8e0f8ee1c687aa8c6b9cdbb07c3b7813aec0b41e58506eb8f946b013ffff');
  assert.equal(sha(bytes(receipt.frozenFrom.integrationReceiptPath)),receipt.frozenFrom.integrationReceiptSha256);
  assert.equal(receipt.historicalGitFixture.groupsBeforeExpansion,14);
  assert.equal(receipt.historicalGitFixture.segmentsBeforeExpansion,28);
  assert.equal(receipt.afterExpansion.preservedHistoricalGroupPrefixCount,14);
  assert.equal(receipt.afterExpansion.newGroupCount,8);
  assert.equal(receipt.afterExpansion.groups,22);
  assert.equal(receipt.afterExpansion.segments,44);
  assert.equal(receipt.afterExpansion.presentSegments,44);
  assert.equal(receipt.afterExpansion.blockedSegments,0);
  assert.equal(receipt.historicalGitFixture.groups.length,14);
  assert.equal(receipt.afterExpansion.newGroups.length,8);
  assert.deepEqual(receipt.historicalGitFixture.groups.map(group=>group.id),integration.historicalGitFixture.groups.map(group=>group.id));
  assert.deepEqual(receipt.historicalGitFixture.groups.map(group=>group.requiredSegmentOrder),integration.historicalGitFixture.groups.map(group=>group.requiredSegmentOrder));

  const historicalAdded=receipt.afterExpansion.newGroups;
  const currentById=new Map(manifest.groups.map(group=>[group.id,group]));
  assert.deepEqual(manifest.groups.slice(0,14).map(group=>group.id),receipt.historicalGitFixture.groups.map(group=>group.id));
  assert.deepEqual(manifest.groups.slice(14,22).map(group=>group.id),historicalAdded.map(group=>group.id));
  const additions=historicalAdded.map(snapshot=>{
    const current=currentById.get(snapshot.id);
    assert.ok(current,`${snapshot.id} remains in the current manifest`);
    assert.equal(current.collection,snapshot.collection);
    assert.equal(current.itemId,snapshot.itemId);
    assert.deepEqual(current.segments.map(({order,role,book,printedPage,pdfPage,regionId})=>({order,role,book,printedPage,pdfPage,regionId})),snapshot.segments.map(({order,role,book,printedPage,pdfPage,regionId})=>({order,role,book,printedPage,pdfPage,regionId})));
    return current;
  });
  assert.ok(additions.every(group=>group.sourceComparison.evidenceSha256===integration.detectorBaseline.sourceReviewSha256));
  assert.ok(additions.every(group=>group.sourceReviewDisposition==='present-but-unlinked'&&group.semanticStatus==='owner-specific and unchanged/pending'&&group.highlightStatus==='unreviewed-full-image-sentinel'));
  const phb=additions.filter(group=>group.source.book==='PHB'&&group.source.printedPage===70);
  assert.equal(phb.length,6);
  assert.deepEqual(new Set(phb.map(group=>`${group.collection}:${group.itemId}`)),new Set([
    'spells:phb-illusionist-improved-invisibility','spells:phb-illusionist-invisibility',
    'spells:phb-illusionist-invisibility-10-radius','spells:phb-magic-user-invisibility',
    'spells:phb-magic-user-invisibility-10-radius','spells:phb-magic-user-mass-invisibility',
  ]));
  for(const group of additions){
    assert.deepEqual(group.requiredRegionIds,group.segments.map(segment=>segment.regionId));
    assert.deepEqual(group.segments.map(segment=>segment.order),[1,2]);
  }
  const elven=additions.find(group=>group.id==='ua10-elven-subrace-description-continuation');
  assert.deepEqual(elven.segments.map(segment=>[segment.printedPage,segment.pdfPage,segment.regionId]),[
    [10,11,'ua-10-391dc1287b053d98'],[10,11,'ua-10-0f52a85b943013cf'],
  ]);
  const contingency=additions.find(group=>group.id==='ua59-magic-user-contingency-page-continuation');
  assert.deepEqual(contingency.segments.map(segment=>[segment.printedPage,segment.pdfPage,segment.regionId]),[
    [59,60,'ua-59-fa6e239da74db6dd'],[60,61,'ua-60-b42c889225a311fa'],
  ]);
  assert.equal(contingency.segments[1].imageSha256,integration.historicalCropRegression.repairResult.imageSha256);
  assert.equal(integration.unresolvedUniverseRetained.elevatedPageGroupsUncertain,53,'the historical eight-group expansion did not resolve the remaining uncertain source-review queue');
});

test('UA p.60 Contingency keeps the clipped 679 PNG and binds the source-verified expanded crop',()=>{
  const regression=integration.historicalCropRegression;
  assert.equal(regression.capturedBeforeRepair,true);
  assert.equal(regression.historicalTree.regionId,'ua-60-b42c889225a311fa');
  assert.deepEqual(regression.historicalTree.normalizedPageRect,[0.04,0.035,0.45,0.4]);
  assert.equal(sha(bytes(regression.historicalTree.imagePath)),regression.historicalTree.imageSha256);
  const result=regression.repairResult;
  assert.equal(result.stableRegionId,regression.historicalTree.regionId);
  assert.deepEqual(result.normalizedPageRect,[0.03,0.035,0.46,0.4]);
  assert.equal(result.leftCrossingsBefore,68);
  assert.equal(result.leftCrossingsAfter,0);
  assert.equal(result.historicalImageSha256StillPresent,regression.historicalTree.imageSha256);
  const catalog=read(result.catalogPath);
  const region=catalog.regions.find(candidate=>candidate.id===result.stableRegionId);
  assert.equal(region.image,result.imagePath.split('/').at(-1));
  assert.equal(region.sha256,result.imageSha256);
  assert.deepEqual(region.normalizedPageRect,result.normalizedPageRect);
  assert.equal(sha(bytes(`${result.catalogPath.slice(0,result.catalogPath.lastIndexOf('/'))}/${region.image}`)),result.imageSha256);
});

test('twelve PHB p.33 contexts expose the exact ordered pair without eligibility claims',()=>{
  const groups=manifest.groups.filter(group=>group.id.startsWith('phb33-human-two-class-context-'));
  assert.equal(groups.length,12);
  for(const group of groups){
    assert.deepEqual(group.requiredRegionIds,group.segments.map(segment=>segment.regionId));
    assert.deepEqual(group.segments.map(segment=>[segment.order,segment.role,segment.book,segment.printedPage]),[
      [1,'opening','PHB',33],[2,'continuation','PHB',33],
    ]);
    assert.match(group.scope,/does not establish class eligibility/);
    assert.equal(group.semanticStatus,'owner-specific and unchanged/pending');
    assert.equal(group.highlightStatus,'unreviewed-full-image-sentinel');
  }
});

test('Charging continuation is same-page p.66 left-to-right; p.67 candidates are not required evidence',()=>{
  const group=manifest.groups.find(entry=>entry.id==='charging-melee-dmg-66');
  assert.equal(group.reportedHypothesis.status,'superseded-by-source-review');
  assert.equal(group.segments[0].book,'DMG');
  assert.equal(group.segments[1].book,'DMG');
  assert.deepEqual(group.segments.map(segment=>[segment.order,segment.printedPage,segment.pdfPage,segment.role]),[
    [1,66,67,'opening'],[2,66,67,'continuation'],
  ]);
  assert.equal(group.checkedAlternativeRegions.length,5);
  assert.ok(group.checkedAlternativeRegions.every(region=>region.printedPage===67&&region.decision==='not-relevant-to-required-passage'));
});

test('Abjure keeps its UA p.37 opening and same-page continuation ordered apart from PHB p.47 support',()=>{
  const group=manifest.groups.find(entry=>entry.id==='ua-cleric-abjure-ua-37');
  assert.deepEqual(group.segments.map(segment=>[segment.order,segment.printedPage,segment.regionId,segment.role]),[
    [1,37,'ua-37-e35d106ad24ba65c','opening'],
    [2,37,'ua-37-47646031f5b262d9','continuation'],
  ]);
  assert.deepEqual(group.currentCitationPages.map(page=>[page.book,page.printedPage,page.role]),[
    ['PHB',47,'related mechanics reference'],['UA',37,'ordered spell passage'],
  ]);
  assert.equal(data.spells.find(item=>item.id==='ua-cleric-abjure').incomplete,true);
  assert.match(data.spells.find(item=>item.id==='ua-cleric-abjure').exceptions.at(-1),/different save\/procedure wording/);
});

test('a genuinely missing segment can be represented as blocked, but never falsely complete',()=>{
  const blocked=structuredClone(manifest);
  const group=blocked.groups.find(entry=>entry.id==='charging-melee-dmg-66');
  group.status='blocked-source-unavailable';
  group.segments[1]={order:2,role:'continuation',book:'DMG',printedPage:67,pdfPage:68,regionId:null,image:null,imageSha256:null,sourceSha256:group.source.sourceSha256,state:'blocked-source-unavailable',reason:'Synthetic validator fixture only: continuation source not yet inspected.',relevance:'A required second-page continuation used only to exercise blocked-state validation.'};
  group.currentCitationPages.push({book:'DMG',printedPage:67,role:'synthetic blocked continuation'});
  const fixtureData=structuredClone(data);
  fixtureData.rules.find(item=>item.id==='charging-melee').references=[{book:'DMG',pages:[67]}];
  const summary=validateContinuationManifest(blocked,{data:fixtureData,catalogRoot:'dist'});
  assert.equal(summary.blockedSegments,1);
  assert.equal(summary.presentSegments,summary.segments-1);
  group.status='segments-present-pending-deployment';
  assert.throws(()=>validateContinuationManifest(blocked,{data:fixtureData,catalogRoot:'dist'}),/cannot be complete while a required segment is blocked/);
});

test('Animate Object and Animate Rock retain the same corrected PHB p.51 crop',()=>{
  const regression=manifest.regressions.find(entry=>entry.id==='animate-object-shared-phb-51-crop');
  assert.equal(regression.bindings.length,2);
  assert.ok(regression.bindings.every(binding=>binding.imageSha256===regression.sourceComparison.currentImageSha256));
  assert.equal(regression.priorIncorrectImageSha256,'5f5f86d3cf71f766c6a059dfa580ac459745916aef027bf540ca15fc580ae239');
  assert.notEqual(regression.priorIncorrectImageSha256,regression.sourceComparison.currentImageSha256);
});

test('Assassin audit enumerates every region and distinguishes crop repairs, field coverage and prices',()=>{
  const summary=validateAssassinContextAudit(assassinAudit,context);
  assert.deepEqual(summary,{regions:15,sourceCompared:15,priorContextConfirmed:0,sourceComparedPendingIndependent:6,repairedPendingIndependent:0,contextAdequateFocusPending:3,repairContextAdequateFocusPending:2,independentlyReviewedContextAndFocus:4,followupPendingCalibration:0,followupPendingContinuation:0,priorCropConfirmed:5,priceRegions:0});
  const record=assassinAudit.records[0];
  assert.equal(record.regions.length,15);
  assert.ok(record.regions.every(region=>region.priceEvidence===false));
  const independentlyFocused=record.regions.filter(region=>region.independentFocusReview);
  assert.deepEqual(independentlyFocused.map(region=>region.regionId).sort(),[
    'phb-19-00ed6d9c8e0545a0','phb-27-a0862452b397bc19','phb-29-249e19f022897253','phb-37-911fe149fbfab8dd',
  ]);
  assert.ok(independentlyFocused.every(region=>region.highlightStatus==='source-reviewed-precise-focus-confirmed'));
  assert.equal(record.regions.filter(region=>region.highlightStatus==='unreviewed-full-image-sentinel').length,11);
  const findingFor=id=>record.regions.find(region=>region.regionId===id).sourceComparison.finding;
  assert.match(findingFor('phb-37-911fe149fbfab8dd'),/complete proficiency table and all three explanatory paragraphs/);
  assert.match(findingFor('phb-19-00ed6d9c8e0545a0'),/12th-level Assassin trigger and names magic-user\/illusionist scroll classes/);
  assert.doesNotMatch(findingFor('phb-19-00ed6d9c8e0545a0'),/25%|excluded scroll classes/);
  assert.match(findingFor('phb-27-a0862452b397bc19'),/excluded scroll classes, the 25% misunderstanding clause/);
  assert.match(findingFor('phb-29-249e19f022897253'),/explicit backstab exception, and the two-level reduction/);
  assert.ok(record.coverageFindings.some(finding=>finding.id==='assassin-phb-19-scroll-reading-footnote'));
  assert.ok(record.coverageFindings.some(finding=>finding.id==='assassin-phb-37-proficiency-interval-note'));
  assert.equal(record.openFindings.find(finding=>finding.id==='assassin-phb-33-heading-edge-calibration')?.status,'resolved-wordbox-only-hit');
  assert.ok(record.openFindings.some(finding=>finding.id==='assassin-phb-33-example-continuation'&&finding.status==='source-continuation-applied-focus-pending'));
});

test('Assassin precise-focus approvals fail closed on stale proof hashes or unreviewed sentinel changes',()=>{
  const staleProof=structuredClone(assassinAudit);
  staleProof.records[0].independentClassReview.sha256='0'.repeat(64);
  assert.throws(()=>validateAssassinContextAudit(staleProof,context),/independent class review file hash is stale/);

  const staleFocus=structuredClone(assassinAudit);
  staleFocus.records[0].regions.find(region=>region.regionId==='phb-19-00ed6d9c8e0545a0').independentFocusReview.focusSha256='0'.repeat(64);
  assert.throws(()=>validateAssassinContextAudit(staleFocus,context),/audit review hashes differ from the independent proof/);

  const silentlyFocused=structuredClone(assassinAudit);
  const pending=silentlyFocused.records[0].regions.find(region=>region.regionId==='phb-37-94857b7670eeef3b');
  pending.highlightStatus='source-reviewed-precise-focus-confirmed';
  assert.throws(()=>validateAssassinContextAudit(silentlyFocused,context),/highlight status changed/);
});

test('Assassin p.33 continuation audit keeps the word-box hit separate from ordered source-pixel candidates',()=>{
  const record=assassinAudit.records[0];
  const p33=record.regions.find(region=>region.regionId==='phb-33-3e99376517d917d0');
  const review=p33.sourceComparison.sourcePixelBoundaryReview;
  assert.equal(p33.contextStatus,'source-reviewed-context-adequate-focus-pending');
  assert.equal(review.existingTopWordBoxOverlapPoints,0.064);
  assert.ok(review.existingTopToDarkGlyphClearancePoints>0);
  assert.deepEqual(review.candidateOrderedSegmentBoundsPoints.map(segment=>segment.order),[1,2]);
  assert.deepEqual(review.candidateOrderedSegmentBoundsPoints[1].rect,[302,28,571,110]);

  const badOrder=structuredClone(assassinAudit);
  const badP33=badOrder.records[0].regions.find(region=>region.regionId==='phb-33-3e99376517d917d0');
  badP33.sourceComparison.sourcePixelBoundaryReview.candidateOrderedSegmentBoundsPoints.reverse();
  assert.throws(()=>validateAssassinContextAudit(badOrder,context),/candidate continuation order changed/);
});

test('Assassin source and image changes cannot silently inherit an old context approval',()=>{
  const overapproved=structuredClone(assassinAudit);
  const p28=overapproved.records[0].regions.find(region=>region.regionId==='phb-28-c18cfa2ca0a1cda2');
  p28.contextStatus='prior-context-confirmed';
  assert.throws(()=>validateAssassinContextAudit(overapproved,context),/prior context confirmation lacks matching evidence/);
  const changed=structuredClone(assassinAudit);
  changed.records[0].regions[0].sourceSha256='0'.repeat(64);
  assert.throws(()=>validateAssassinContextAudit(changed,context),/source identity changed/);
});
