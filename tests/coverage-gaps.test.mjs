import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {buildCoverageGaps, supplementalMonetaryPresentation} from '../tools/coverage-gaps.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = path => readFileSync(resolve(root, path));
const data = JSON.parse(read('dist/data.json'));
const handoff = JSON.parse(read('research/gaps-limitations-next-task.json'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const pointer = (value, path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return {found: false};
  for (const part of path.slice(1).split('/').map(token => token.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return {found: false};
    value = value[part];
  }
  return {found: true, value};
};

function build(overrides = new Map()) {
  return buildCoverageGaps({data, handoff, readFile: path => overrides.get(path) ?? read(path)});
}

test('coverage gaps payload has source-linked entries and traces every generated pointer', () => {
  const payload = build();
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.title, 'Known gaps & limitations');
  assert.equal(payload.groups.length, 8);
  const allEntries = payload.groups.flatMap(group => group.entries);
  const currentQuestions = allEntries.filter(row => row.id.startsWith('monetary-source-question-'));
  assert.equal(allEntries.length - currentQuestions.length, 134, 'the existing entries remain present');
  assert.equal(currentQuestions.length, 8, 'all eight historical questions receive explicit current dispositions');
  assert.equal(currentQuestions.filter(row => row.status === 'unresolved-source-question').length, 7);
  assert.equal(currentQuestions.filter(row => row.status === 'source-backed-derived-valuation').length, 1);

  for (const group of payload.groups) {
    for (const row of group.entries) {
      for (const path of row.handoffPointers) {
        assert.equal(pointer(handoff, path).found, true, `${row.id}: unresolved ${path}`);
      }
      for (const ref of row.sourceArtifacts || []) {
        const bytes = read(ref.path);
        assert.equal(sha256(bytes), ref.sha256, `${row.id}: stale artifact ${ref.path}`);
        assert.equal(pointer(JSON.parse(bytes), ref.pointer).found, true, `${row.id}: unresolved ${ref.path}#${ref.pointer}`);
      }
    }
  }

  const continuation = payload.groups.find(group => group.id === 'continuation-limits').entries[0];
  assert.deepEqual(continuation.handoffPointers, []);
  assert.deepEqual(continuation.sourceArtifacts.map(({path, pointer: pathPointer}) => [path, pathPointer]), [
    ['research/citation-continuations.json', '/groups'],
  ]);

  const priceEntries = payload.groups.find(group => group.id === 'formal-field-statuses').entries
    .filter(row => row.handoffPointers.some(path => path.startsWith('/currentSitePriceGaps/records/')));
  assert.equal(priceEntries.length, 4);
  for (const row of priceEntries) {
    assert.ok(row.handoffPointers.some(path => path.startsWith('/mechanicsAudit/formalFieldIssues/')));
    assert.ok(row.handoffPointers.some(path => path.startsWith('/currentSitePriceGaps/records/')));
  }
});

test('every explicit topic target remains reachable, including multi-record questions', () => {
  const payload = build();
  const allEntries = payload.groups.flatMap(group => group.entries);
  const route = target => `#${target.collection}/${encodeURIComponent(target.itemId)}`;

  for (const content of handoff.missingReferencedContent.otherExplicitReferencedButUnresolvedContent) {
    for (const target of content.targets || []) {
      const rowId = `${content.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${target.itemId}`;
      const row = allEntries.find(candidate => candidate.id === rowId);
      assert.ok(row, `missing unresolved-content entry for ${target.itemId}`);
      assert.ok(row.links.some(link => link.href === route(target)), `missing link for ${target.itemId}`);
    }
  }
  for (const [index, question] of handoff.otherDocumentedOpenQuestions.entries()) {
    if (!Array.isArray(question.targets)) continue;
    const row = allEntries.find(candidate => candidate.id === `open-question-${String(index + 1).padStart(2, '0')}`);
    assert.ok(row, `missing open-question entry ${index + 1}`);
    for (const target of question.targets) {
      assert.ok(row.links.some(link => link.href === route(target)), `missing multi-target question link for ${target.itemId}`);
    }
  }

  const unresolved = payload.groups.find(group => group.id === 'missing-referenced-content').entries
    .filter(row => row.id.includes('speak-with-animals'));
  assert.equal(unresolved.length, 2);
  assert.notEqual(unresolved[0].title, unresolved[1].title, 'class variants must be distinguishable');

  const mirror = payload.groups.find(group => group.id === 'open-questions').entries.find(row => row.id === 'open-question-04');
  assert.equal(mirror.links.length, 2);
  assert.notEqual(mirror.links[0].href, mirror.links[1].href);
});

test('offer entries preserve package quantity and distinct current site prices', () => {
  const offers = build().groups.find(group => group.id === 'equipment-offers').entries;
  assert.equal(offers.length, 3);
  assert.equal(offers[0].status, 'extracted-separate-field');
  assert.match(offers[0].description, /1 gp per dozen/);
  assert.match(offers[0].description, /2 sp per single normal arrow/);
  assert.match(offers[0].description, /not a missing item price/);
  assert.equal(offers[1].status, 'extracted-canonical-offer');
  assert.match(offers[1].description, /15 sp/);
  assert.match(offers[1].description, /10 sp per score/);
  assert.equal(offers[2].status, 'extracted-quantity-unresolved');
  assert.match(offers[2].description, /100 gp/);
  assert.match(offers[2].description, /quantity and equivalence remain unresolved/);
  assert.doesNotMatch(offers[2].description, /quantity or equivalence is not stated/);
  for(const [index,itemId] of [[1,'phb-sling-bullets-dozen'],[2,'ua-quarrels-for-same']]){
    assert.ok(data.equipment.some(item=>item.id===itemId&&item.price));
    assert.ok(offers[index].links.some(link=>link.href.includes(itemId)));
    assert.ok(offers[index].sourceArtifacts.some(artifact=>artifact.path==='research/source-audit-batch5-price-independent-review.json'));
  }
});

test('source-census presentation retains history and reports current structured output separately',()=>{
 const before=JSON.parse(read('research/source-audit-batch5-census-presentation-before.json'));
 assert.equal(before.entries.length,3);
 assert.match(before.entries.find(entry=>entry.id==='phb-dmg-other').description,/None of those new table groups/);
 assert.match(before.entries.find(entry=>entry.id==='ua-other').description,/no new table group is transcribed/);
 const entries=build().groups.find(group=>group.id==='source-price-discovery').entries;
 for(const [id,groups,rows]of [['phb-dmg-other',18,179],['ua-other',15,583]]){
  const entry=entries.find(entry=>entry.id===id);
  assert.match(entry.description,new RegExp(`${groups} declared groups, covering ${rows} logical records`));
  assert.match(entry.description,/Transcription, focus\/context review and item-citation mapping are separate/);
  assert.ok(entry.sourceArtifacts.length);
 }
 assert.equal(handoff.summary.sourceCensus.newTableGroupsRowTranscribed,33);
});

test('same-count census review changes fail the frozen source artifact hash check', () => {
  const path = 'research/price-source-inventory-phb-dmg-other.json';
  const source = JSON.parse(read(path));
  const pages = Array.isArray(source.pageCensus) ? source.pageCensus : source.pageCensus.pages;
  const originalCount = pages.length;
  pages[0].visualReviewStatus = 'inspected';
  assert.equal(pages.length, originalCount);
  assert.throws(() => build(new Map([[path, Buffer.from(JSON.stringify(source))]])), /source census artifact hash is stale/);
});

test('same-input-hash mechanics and scan report edits fail frozen report-file checks', () => {
  for (const [path, expected] of [
    ['research/mechanics-audit-progress.json', /mechanics audit report file hash differs/],
    ['tests/fixtures/source-scan-inventory.json', /source-scan report file hash differs/],
  ]) {
    const report = JSON.parse(read(path));
    const pinnedInputHash = report.input.sha256;
    report.extraReviewMutation = 'same input hash, changed report content';
    assert.equal(report.input.sha256, pinnedInputHash);
    assert.throws(() => build(new Map([[path, Buffer.from(JSON.stringify(report))]])), expected);
  }
});


test('supplemental presentation separates current finding repairs, retained questions and bounded note meaning', () => {
  const report = {path: 'source.json', sha256: 'a'.repeat(64), rows: 583, upstreamReviewStatus: 'author pending', currentReview: {
    sourceInput: {path: 'source.json', sha256: 'a'.repeat(64)}, sourceRows: 583, exactAuditRows: 583,
    knownFindings: 195, knownFindingStatuses: {'explicit-source-reviewed-repair': 195},
    explicitReviews: 195, explicitReviewStatuses: {'current-explicit-review': 195},
    retainedUncertainties: [{id: 'held'}], globalAudit: {retainedUncertainties: 8}, underlyingSourceQuestions: [], underlyingSourceQuestionRows: 0,
    status: 'current-scoped-finding-reviews-recorded', semanticPass: false, sourceAbsence: false, generalReviewPending: true, generalSourceReviewStatus: 'pending',
    contextMeaning: {sourceInputSha256: 'a'.repeat(64), semanticPass: false, rowDefinitionLinks: 103,
      dispositions: {'source-applicable': 4, qualified: 98, uncertain: 1}, unresolvedGlyphAssociations: Array.from({length: 5}, () => ({}))},
  }};
  const rendered = supplementalMonetaryPresentation(report);
  assert.equal(rendered.status, 'known-issues-reviewed-general-review-pending');
  assert.match(rendered.description, /corrected 195 known issues/);
  assert.match(rendered.description, /8 across all monetary records/);
  assert.match(rendered.description, /4 apply directly, 98 need qualifications, and 1 remain uncertain/);
  assert.match(rendered.description, /5 Scimitar note-marker associations still need source review/);
  assert.match(rendered.description, /do not verify every row or field highlight/);
  assert.match(rendered.description, /General source review remains pending/);
  for (const mutate of [
    value => {value.currentReview.sourceInput.sha256 = 'b'.repeat(64);},
    value => {value.currentReview.sourceInput.path = 'other.json';},
    value => {value.currentReview.knownFindingStatuses = {'focus-changed-needs-source-review': 195};},
    value => {value.currentReview.contextMeaning.semanticPass = true;},
    value => {value.currentReview.sourceAbsence = true;},
    value => {value.currentReview.generalReviewPending = false;},
  ]) {
    const bad = structuredClone(report); mutate(bad);
    assert.throws(() => supplementalMonetaryPresentation(bad), /identity|waive|invalid/);
  }
});

test('qualified monetary extraction keeps the unresolved source questions visible', () => {
  const report = {path: 'source.json', sha256: 'a'.repeat(64), rows: 179, currentReview: {
    sourceInput: {path: 'source.json', sha256: 'a'.repeat(64)}, sourceRows: 179, exactAuditRows: 179,
    knownFindings: 2, knownFindingKinds: {'unresolved-source-scope': 2}, knownFindingStatuses: {'explicit-source-reviewed-qualified-representation': 2},
    explicitReviews: 2, explicitReviewStatuses: {'current-explicit-review': 2}, retainedUncertainties: [], globalAudit: {retainedUncertainties: 8},
    underlyingSourceQuestions: [{id: 'commodity', status: 'unresolved', semanticPass: false, affectedAuditUids: Array.from({length: 8}, (_, i) => `commodity-${i}`)}, {id: 'alchemist', status: 'unresolved', semanticPass: false, affectedAuditUids: ['alchemist']}], underlyingSourceQuestionRows: 9,
    status: 'current-scoped-finding-reviews-recorded', semanticPass: false, sourceAbsence: false, generalReviewPending: true, generalSourceReviewStatus: 'pending',
  }};
  const rendered = supplementalMonetaryPresentation(report);
  assert.match(rendered.description, /corrected 0 known issues/);
  assert.match(rendered.description, /2 source interpretation questions remain unresolved across 9 records/);
  for (const change of [value => {delete value.currentReview.underlyingSourceQuestions;}, value => {value.currentReview.underlyingSourceQuestions.pop();}, value => {value.currentReview.underlyingSourceQuestions[0].status = 'resolved';}, value => {value.currentReview.underlyingSourceQuestionRows = 0;}]) {
    const bad = structuredClone(report); change(bad);
    assert.throws(() => supplementalMonetaryPresentation(bad), /invalid/);
  }
});


test('missing current monetary review never turns an upstream pending assessment into a bounded review pass', () => {
  for (const metadata of [{upstreamIndependentOverlayReviewPending: true}, {independentOverlayReviewPending: true}, {}]) {
    const rendered = supplementalMonetaryPresentation(metadata);
    assert.match(rendered.status, /review-pending/);
    assert.match(rendered.description, /General source and field-highlight review remain pending/);
  }
});
