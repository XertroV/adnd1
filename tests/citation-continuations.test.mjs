import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateAssassinContextAudit,validateContinuationManifest} from '../tools/continuation-contract.mjs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const manifest=read('research/citation-continuations.json');
const assassinAudit=read('research/assassin-context-audit.json');
const data=read('dist/data.json');
const context={data,catalogRoot:'dist'};

test('current continuation groups bind ordered segments, catalogs and source pages',()=>{
  const summary=validateContinuationManifest(manifest,context);
  assert.equal(summary.groups,14);
  assert.equal(summary.segments,28);
  assert.equal(summary.presentSegments,28);
  assert.equal(summary.blockedSegments,0);
  assert.equal(summary.regressionBindings,2);
  assert.deepEqual(summary.statusCounts,{'segments-present-pending-deployment':14});
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
  assert.equal(summary.presentSegments,27);
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
  assert.deepEqual(summary,{regions:15,sourceCompared:15,priorContextConfirmed:1,sourceComparedPendingIndependent:7,repairedPendingIndependent:0,contextAdequateFocusPending:4,repairContextAdequateFocusPending:3,followupPendingCalibration:0,followupPendingContinuation:0,priorCropConfirmed:5,priceRegions:0});
  const record=assassinAudit.records[0];
  assert.equal(record.regions.length,15);
  assert.ok(record.regions.every(region=>region.priceEvidence===false));
  assert.ok(record.regions.every(region=>region.highlightStatus==='unreviewed-full-image-sentinel'));
  assert.ok(record.coverageFindings.some(finding=>finding.id==='assassin-phb-19-scroll-reading-footnote'));
  assert.ok(record.coverageFindings.some(finding=>finding.id==='assassin-phb-37-proficiency-interval-note'));
  assert.equal(record.openFindings.find(finding=>finding.id==='assassin-phb-33-heading-edge-calibration')?.status,'resolved-wordbox-only-hit');
  assert.ok(record.openFindings.some(finding=>finding.id==='assassin-phb-33-example-continuation'&&finding.status==='source-continuation-applied-focus-pending'));
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
