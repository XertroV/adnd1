import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {buildCoverageGaps} from '../tools/coverage-gaps.mjs';

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
  assert.equal(payload.groups.reduce((sum, group) => sum + group.entries.length, 0), 134);

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
  assert.equal(offers[1].status, 'previously-confirmed-review-stale');
  assert.match(offers[1].description, /15 sp/);
  assert.match(offers[1].description, /10 sp per score/);
  assert.equal(offers[2].status, 'source-review-pending-provisional-bounds');
  assert.match(offers[2].description, /100 gp/);
  assert.match(offers[2].description, /quantity or equivalence remains unresolved/);
  assert.doesNotMatch(offers[2].description, /quantity or equivalence is not stated/);
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
