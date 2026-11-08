import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import vm from 'node:vm';

const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const payloadUrl = new URL('../dist/coverage-gaps.json', import.meta.url);
const payload = existsSync(payloadUrl) ? JSON.parse(readFileSync(payloadUrl, 'utf8')) : null;
const handoff = JSON.parse(readFileSync(new URL('../research/gaps-limitations-next-task.json', import.meta.url), 'utf8'));
const source = app.slice(app.indexOf('function coverageGapsHTML(payload) {'), app.indexOf('\nfunction coverageGapsPanelHTML(payload) {'));
assert.ok(source.startsWith('function coverageGapsHTML(payload) {'), 'coverageGapsHTML should stay a pure named renderer for isolated CI checks');
const context = vm.createContext({});
vm.runInContext(source, context);
const render = value => context.coverageGapsHTML(value);
const count = (text, expression) => [...text.matchAll(expression)].length;
const escapeAttribute = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#39;');

test('coverage gaps renderer emits every payload group and entry exactly once with matching group counts', () => {
  assert.ok(payload, 'dist/coverage-gaps.json must be generated and committed');
  assert.equal(payload.schemaVersion, 1);
  assert.ok(Array.isArray(payload.groups) && payload.groups.length > 0);
  const markup = render(payload);
  assert.match(markup, /<section id="coverageGapsPanel"/);
  const entryIds = payload.groups.flatMap(group => group.entries.map(entry => entry.id));
  assert.equal(new Set(entryIds).size, entryIds.length, 'payload entry IDs must be unique');
  assert.equal(count(markup, /<details\b[^>]*data-gap-group=/g), payload.groups.length);
  for (const group of payload.groups) {
    const groupStart = markup.indexOf(`data-gap-group="${escapeAttribute(group.id)}"`);
    assert.notEqual(groupStart, -1, `group ${group.id} should be rendered`);
    const groupOpen = markup.lastIndexOf('<details', groupStart);
    const groupClose = markup.indexOf('</details>', groupStart);
    assert.ok(groupOpen >= 0 && groupClose > groupStart, `group ${group.id} should have a complete disclosure`);
    const groupMarkup = markup.slice(groupOpen, groupClose);
    const expectedCount = group.entries.filter(entry => entry && typeof entry.id === 'string').length;
    assert.match(groupMarkup, new RegExp(`data-gap-count="${expectedCount}"`), `${group.id} count should match its entries`);
    for (const entry of group.entries) {
      assert.equal(count(markup, new RegExp(`data-gap-id="${escapeAttribute(entry.id)}"`, 'g')), 1, `${entry.id} should render once`);
      assert.ok(groupMarkup.includes(`data-gap-id="${escapeAttribute(entry.id)}"`), `${entry.id} should stay inside ${group.id}`);
    }
  }
  for (const [groupId, expectedCount] of [['formal-field-statuses', handoff.mechanicsAudit.formalFieldIssues.notExtracted.length + handoff.mechanicsAudit.formalFieldIssues.sourceConflict.length], ['recorded-review-notes', handoff.mechanicsAudit.specificReviewNoteCandidates.notes.length]]) {
    const group = payload.groups.find(entry => entry.id === groupId);
    assert.ok(group, `missing ${groupId} payload group`);
    assert.equal(group.entries.length, expectedCount, `${groupId} canonical payload count`);
  }
});

test('offer rows preserve the extracted readings, unresolved quantity and separate arrow field', () => {
  assert.ok(payload, 'dist/coverage-gaps.json must be generated and committed');
  const groups = new Map(payload.groups.map(group => [group.id, group]));
  const offers = groups.get('equipment-offers')?.entries || [];
  const sling = offers.find(entry => entry.id === 'phb-sling-bullets-dozen');
  const quarrels = offers.find(entry => entry.id === 'ua-quarrels-for-same');
  const arrow = offers.find(entry => entry.id === 'phb-arrow-dozen-already-extracted');
  assert.equal(offers.filter(entry => ['phb-sling-bullets-dozen', 'ua-quarrels-for-same'].includes(entry.id)).length, 2,
    'both formerly unrepresented offers remain documented');
  assert.equal(sling?.status, 'extracted-canonical-offer');
  assert.match(`${sling?.title} ${sling?.description}`, /Sling\s*&\s*Bullets/i);
  assert.match(sling.description, /15\s*sp/i);
  assert.match(sling.description, /dozen/i);
  assert.equal(quarrels?.status, 'extracted-quantity-unresolved');
  assert.match(`${quarrels?.title} ${quarrels?.description}`, /Quarrels for same/i);
  assert.match(quarrels.description, /100\s*gp/i);
  assert.match(quarrels.description, /quantity|equivalence|unit/i);
  assert.doesNotMatch(quarrels.description, /(?:per|each|\/)\s*bolt/i, 'unknown quantity must not become a per-bolt offer');
  assert.ok(!arrow || arrow.status === 'extracted-separate-field', 'the Arrow dozen is an already-extracted distinction, not a missing offer');

  const markup = render(payload);
  for (const entry of [sling, quarrels, arrow].filter(Boolean)) assert.ok(markup.includes(`data-gap-id="${entry.id}"`));
});

test('coverage gaps renderer escapes untrusted text and discards unsafe link destinations', () => {
  assert.ok(payload, 'dist/coverage-gaps.json must be generated and committed');
  const hostile = structuredClone(payload);
  hostile.title = '<img src=x onerror=alert(1)>';
  hostile.groups.push({
    id: 'renderer-security-fixture',
    title: '<script>alert(1)</script>',
    description: '<svg onload=alert(1)>',
    entries: [{
      id: 'renderer-security-entry',
      title: '<img src=x onerror=alert(1)>',
      status: '<b>untrusted status</b>',
      description: '<script>not executable</script>',
      sourceLocations: [{book: 'PHB <img src=x>', printedPage: 35, pdfPage: 36}],
      links: [
        {label: 'run javascript', href: 'javascript:alert(1)'},
        {label: 'escape route', href: '#equipment/../admin'},
        {label: 'safe record', href: '#equipment/phb-arrow'}
      ]
    }]
  });
  const markup = render(hostile);
  assert.doesNotMatch(markup, /<(?:script|img|svg)\b/i, 'untrusted text must never become executable markup');
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(markup, /href="#equipment\/phb-arrow"/);
  assert.doesNotMatch(markup, /href="(?:javascript:|#equipment\/\.\.)/i);
  assert.equal(count(markup, /data-gap-id="renderer-security-entry"/g), 1);
});

const routeFixture = {
  schemaVersion: 1,
  title: 'Synthetic route and review status fixture',
  groups: [{
    id: 'renderer-route-status-fixture',
    title: 'Route and review statuses',
    description: 'Synthetic renderer regression fixture.',
    entries: [
      {id: 'field-target-pending-fixture', title: 'Field target', status: 'field-target-review-pending', description: 'Field target needs review.', sourceLocations: [], links: []},
      {id: 'highlight-pending-fixture', title: 'Highlight target', status: 'highlight-review-pending', description: 'Highlight focus needs review.', sourceLocations: [], links: []},
      {id: 'source-link-fixture', title: 'Abjure continuation', status: 'source-reviewed', description: 'Open the exact source segment.', sourceLocations: [], links: [
        {label: 'Open Abjure continuation', href: '#spells/ua-cleric-abjure?source=UA%3A37&region=ua-37-47646031f5b262d9'},
        {label: 'Open pending price target', href: '#equipment/phb-arrow?source=PHB%3A35&target=pending&field=%2Fprice&owner=equipment%3Aphb-arrow'},
        {label: 'Open nested source owner', href: '#classes/fighter?source=DMG%3A74&target=pending&field=%2FruleNotes%2F0&fieldOwner=matrices%3Admg-original-fighter-attack-matrix&owner=matrices%3Admg-original-fighter-attack-matrix'},
        {label: 'Unsafe external query', href: '#equipment/phb-arrow?source=PHB%3A35&redirect=javascript%3Aalert%281%29'}
      ]}
    ]
  }]
};

test('renderer retains validated citation source and region query links', () => {
  const markup = render(routeFixture);
  assert.match(markup, /href="#spells\/ua-cleric-abjure\?source=UA%3A37&amp;region=ua-37-47646031f5b262d9"/,
    'a valid record route with encoded source page and stable region must remain navigable');
  assert.match(markup, /href="#equipment\/phb-arrow\?source=PHB%3A35&amp;target=pending&amp;field=%2Fprice&amp;owner=equipment%3Aphb-arrow"/,
    'valid pending, field, and owner flags must be preserved');
  assert.match(markup, /href="#classes\/fighter\?source=DMG%3A74&amp;target=pending&amp;field=%2FruleNotes%2F0&amp;fieldOwner=matrices%3Admg-original-fighter-attack-matrix&amp;owner=matrices%3Admg-original-fighter-attack-matrix"/,
    'valid nested field-owner route flags must be preserved');
  assert.doesNotMatch(markup, /redirect=javascript/i, 'unknown query flags must not introduce a redirect target');
});

test('renderer preserves field-target and highlight pending status dimensions', () => {
  const markup = render(routeFixture);
  const statusFor = id => {
    const start = markup.indexOf(`data-gap-id="${id}"`);
    assert.notEqual(start, -1);
    const end = markup.indexOf('</article>', start);
    const match = markup.slice(start, end).match(/class="coverage-gap-status">([^<]*)</);
    assert.ok(match, `${id} should have an accessible status label`);
    return match[1];
  };
  const fieldStatus = statusFor('field-target-pending-fixture');
  const highlightStatus = statusFor('highlight-pending-fixture');
  assert.match(fieldStatus, /field/i, 'field-target status must retain its scope');
  assert.match(fieldStatus, /pending/i);
  assert.match(highlightStatus, /highlight/i, 'highlight review status must retain its scope');
  assert.match(highlightStatus, /pending/i);
  assert.notEqual(fieldStatus, 'Source review pending');
  assert.notEqual(highlightStatus, 'Source review pending');
});
