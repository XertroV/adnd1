import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditRequiredSegmentPresence,validateContinuationManifest} from '../tools/continuation-contract.mjs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const manifest=read('research/citation-continuations.json');
const history=read('tests/fixtures/citation-continuation-history.json');
const integration=read('research/source-audit-batch5-continuation-integration.json');
const historicalExpansion=read('tests/fixtures/citation-continuation-expansion-22.json');
const data=read('dist/data.json');

test('Git-backed pre-fix catalogs fail required continuation presence; corrected catalogs pass',()=>{
  assert.equal(history.schemaVersion,1);
  assert.equal(history.cases.length,2);
  for (const fixture of history.cases) {
    const group=manifest.groups.find(entry=>entry.id===fixture.id);
    assert.ok(group,`${fixture.id} is absent from the source-reviewed continuation manifest`);
    assert.equal(fixture.historicalCatalog.collection,fixture.collection);
    assert.equal(fixture.historicalCatalog.itemId,fixture.itemId);
    assert.equal(fixture.historicalCatalog.imageBytesIncluded,false,'historical scan bytes must not be copied into the fixture');
    assert.match(fixture.historicalCatalog.gitCommit,/^[a-f0-9]{40}$/);
    assert.match(fixture.historicalCatalog.gitBlobOid,/^[a-f0-9]{40}$/);
    assert.ok(fixture.historicalCatalog.regions.every(region=>/^[a-f0-9]{64}$/.test(region.sha256)));
    assert.ok(fixture.requiredSegmentsFromCurrentSourceReviewedManifest.every(segment=>segment.sourceSha256===fixture.historicalCatalog.sources[segment.book]?.sha256));
    assert.match(fixture.currentSourceFinding,/same printed page/);

    const historicalGroup={...group,segments:fixture.requiredSegmentsFromCurrentSourceReviewedManifest};
    const historical=auditRequiredSegmentPresence(historicalGroup,fixture.historicalCatalog);
    assert.deepEqual(historical.mismatches,fixture.historicalExpectedBindingMismatches,`${fixture.id} historical image identity differences should be explicit`);
    assert.deepEqual(historical.missing.map(segment=>segment.order),fixture.historicalMissingOrders);
    assert.deepEqual(historical.expectedOrder.map(segment=>segment.order),[1,2]);
    assert.equal(historical.present.length,1);
    assert.equal(historical.missing[0].regionId,fixture.requiredSegmentsFromCurrentSourceReviewedManifest[1].regionId);
    assert.equal(fixture.historicalCatalog.regions.some(region=>region.id===historical.missing[0].regionId),false);

    const corrected=read(`dist/${fixture.correctedCatalogPath}`);
    assert.equal(corrected.itemId,fixture.itemId);
    assert.equal(corrected.collection,fixture.collection);
    const fixed=auditRequiredSegmentPresence(group,corrected);
    assert.deepEqual(fixed.missing,[],`${fixture.id} corrected catalog should include every required segment`);
    assert.deepEqual(fixed.mismatches,[],`${fixture.id} corrected catalog should retain each required source/image binding`);
    assert.deepEqual(fixed.present.map(segment=>segment.regionId),fixture.correctedExpectedRegionIds);
    assert.deepEqual(fixed.present.map(segment=>segment.order),[1,2]);
  }
  const summary=validateContinuationManifest(manifest,{data,catalogRoot:'dist'});
  const currentSegments=manifest.groups.reduce((count,group)=>count+group.segments.length,0);
  assert.equal(summary.presentSegments+summary.blockedSegments,currentSegments);
  assert.equal(summary.groups,manifest.groups.length);
  assert.equal(summary.segments,currentSegments);
  assert.equal(summary.blockedSegments,0);
  assert.deepEqual([
    historicalExpansion.historicalGitFixture.groupsBeforeExpansion,
    historicalExpansion.historicalGitFixture.segmentsBeforeExpansion,
    historicalExpansion.afterExpansion.groups,
    historicalExpansion.afterExpansion.segments,
    historicalExpansion.afterExpansion.presentSegments,
    historicalExpansion.afterExpansion.blockedSegments,
  ],[14,28,22,44,44,0]);
  assert.equal(integration.historicalGitFixture.groupsBeforeExpansion,14);
  assert.equal(integration.historicalGitFixture.segmentsBeforeExpansion,28);
  assert.deepEqual(manifest.groups.slice(0,14).map(group=>group.id),integration.historicalGitFixture.groups.map(group=>group.id));
});

test('all twelve shared PHB p.33 catalog copies require the same ordered example completion',()=>{
  assert.equal(history.sharedP33Cases.length,12);
  const uniqueOwners=new Set();
  for(const fixture of history.sharedP33Cases){
    const group=manifest.groups.find(entry=>entry.id===fixture.id);
    assert.ok(group,`${fixture.id} is absent from the current continuation manifest`);
    assert.equal(group.source.sourceSha256,'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095');
    assert.deepEqual(group.segments.map(segment=>segment.order),[1,2]);
    assert.deepEqual(group.segments.map(segment=>segment.printedPage),[33,33]);
    assert.equal(group.segments[0].role,'opening');
    assert.equal(group.segments[1].role,'continuation');
    assert.equal(group.segments[1].regionId,'phb-33-7d2eca37ce27b8e');
    assert.equal(fixture.historicalCatalog.gitCommit,'13783128ca5955ac707ed7ec6994d78d7c9a7cce');
    assert.equal(fixture.historicalCatalog.imageBytesIncluded,false);
    assert.ok(fixture.historicalCatalog.regions.every(region=>/^[a-f0-9]{64}$/.test(region.sha256)));
    assert.match(fixture.semanticLimit,/does not establish eligibility/);
    const historical=auditRequiredSegmentPresence({...group,segments:fixture.requiredSegmentsFromCurrentSourceReviewedManifest},fixture.historicalCatalog);
    assert.deepEqual(historical.missing.map(segment=>segment.order),[2]);
    assert.deepEqual(historical.mismatches,fixture.historicalExpectedBindingMismatches);
    const corrected=read(`dist/${fixture.correctedCatalogPath}`);
    const fixed=auditRequiredSegmentPresence(group,corrected);
    assert.deepEqual(fixed.missing,[]);
    assert.deepEqual(fixed.mismatches,[]);
    assert.deepEqual(fixed.present.map(segment=>segment.order),[1,2]);
    uniqueOwners.add(`${fixture.collection}:${fixture.itemId}`);
  }
  assert.equal(uniqueOwners.size,12);
});

test('the historical fixtures pin the known Charging and Abjure clipping defects',()=>{
  const charging=history.cases.find(entry=>entry.id==='charging-melee-dmg-66');
  assert.equal(charging.historicalCatalog.gitCommit,'13783128ca5955ac707ed7ec6994d78d7c9a7cce');
  assert.equal(charging.historicalCatalog.gitBlobOid,'8b5af34468aee7dfada58b5f55088429f4f7425c');
  assert.equal(charging.historicalCatalog.regions.filter(region=>region.book==='DMG'&&region.printedPage===66).length,1);
  assert.match(charging.currentSourceFinding,/DMG p\.66 left-column charge text continues in the top-right column/);

  const abjure=history.cases.find(entry=>entry.id==='ua-cleric-abjure-ua-37');
  assert.equal(abjure.historicalCatalog.gitCommit,'84252dc74db14e4c1d6ec465670c8b5b3d88f364');
  assert.equal(abjure.historicalCatalog.gitBlobOid,'f61e1587fde4681b6eb9a94d0e40711363e965ab');
  assert.equal(abjure.historicalCatalog.regions.filter(region=>region.book==='UA'&&region.printedPage===37).length,1);
  assert.match(abjure.currentSourceFinding,/UA p\.37 Abjure continues in the top-right column/);
});

test('an explicitly blocked segment is not counted as a malformed missing crop',()=>{
  const group=structuredClone(manifest.groups.find(entry=>entry.id==='charging-melee-dmg-66'));
  group.segments[1]={...group.segments[1],regionId:null,image:null,imageSha256:null,state:'blocked-source-unavailable'};
  const catalog=read(`dist/${group.catalog}`);
  const result=auditRequiredSegmentPresence(group,catalog);
  assert.deepEqual(result.expectedOrder,[{order:1,role:'opening',regionId:'dmg-66-736ea779203d26d3'}]);
  assert.deepEqual(result.missing,[]);
  assert.deepEqual(result.mismatches,[]);
});
