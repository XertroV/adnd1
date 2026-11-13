import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const decode = (path, expected) => {
  const bytes = read(path);
  assert.equal(sha(bytes), expected, 'preserved actual failure bytes');
  return JSON.parse(gunzipSync(bytes));
};
const legacyIds = new Set(['cleric-turning-table', 'phb-hurled-weapons-and-missiles-table', 'ua-hurled-weapons-and-missiles-table']);
const sourceFacts = item => [
  ...['rows', 'symbols', 'procedure', 'footnotes', 'sourceNotes'].flatMap(key => item.table?.[key] || []),
  ...(item.table?.progressionNote ? [item.table.progressionNote] : []),
];
function helper({books, citations, shared, source}) {
  const context = {
    inlineSourceChip: (_reference, title, _extra, kind) => `<button class="${kind}" title="${title}"></button>`,
  };
  vm.createContext(context);
  vm.runInContext(books, context);
  vm.runInContext(citations, context);
  vm.runInContext(`${shared}\n${source}\nthis.resolveFact=exactTableFactSourceReference;`, context);
  if (source.includes('function ruleBulletSourceChips(')) vm.runInContext('this.bulletChips=ruleBulletSourceChips;', context);
  return context;
}
function legacyResolved(resolve, owners) {
  return owners.filter(owner => legacyIds.has(owner.id))
    .reduce((sum, owner) => sum + sourceFacts(owner).filter(fact => resolve(owner, fact) === fact.sourceReference).length, 0);
}
function proposedCounts(context, owners) {
  const appendix = owners.filter(owner => owner.id.startsWith('appendix-c-'));
  const rows = appendix.flatMap(owner => (owner.table?.rows || []).map(row => ({owner, row})));
  const bulletOwners = owners.filter(owner => owner.id.startsWith('appendix-c-') || owner.id === 'encounter-types');
  return {
    rows: rows.length,
    resolvedRows: rows.filter(({owner, row}) => context.resolveFact(owner, row) === row.sourceReference).length,
    bulletChips: bulletOwners.reduce((sum, owner) => sum + (owner.bullets || []).reduce((n, _text, index) =>
      n + (context.bulletChips(owner, index).match(/class="bullet-source-chip"/g) || []).length, 0), 0),
  };
}

test('preserved actual V2 helper loses all82 existing controls; its exact predecessor retains them', () => {
  const fixture = decode('tests/fixtures/dmg175-v2-lost-existing-controls-before-v1.json.gz', 'a743ee952a748f7114b44108b5b2c0f0ad725f0cd7747193dabb59e3cf7bcc90');
  const old = helper({books: fixture.beforeBooks, citations: fixture.citations, shared: fixture.sharedProductionHelpers, source: fixture.beforeHelper});
  const failed = helper({books: fixture.candidateBooks, citations: fixture.citations, shared: fixture.sharedProductionHelpers, source: fixture.candidateHelper});
  assert.equal(legacyResolved(old.resolveFact, fixture.actualOwnerObjects), 82);
  assert.equal(legacyResolved(failed.resolveFact, fixture.actualOwnerObjects), 0);
});

test('preserved actual V3 helper loses51 supplemental controls on real compiler output', () => {
  const fixture = decode('tests/fixtures/dmg175-v3-real-compiler-controls-before-v1.json.gz', 'd9a5c5e07c6cd20606b27d86351c73dcee413b8822be41a0c484a6b766fd01d0');
  assert.equal(fixture.data.fields, 4931);
  const failed = helper({books: fixture.books, citations: fixture.citations, shared: fixture.sharedProductionHelpers, source: fixture.fragment});
  assert.equal(legacyResolved(failed.resolveFact, fixture.ownerObjects), 82);
  assert.deepEqual(proposedCounts(failed, fixture.ownerObjects), {rows: 87, resolvedRows: 65, bulletChips: 4});
});

test('current canonical compiler output preserves82 existing and all87 row plus33 bullet controls', () => {
  const prior = JSON.parse(gunzipSync(read('tests/fixtures/cleric-turning-helper-schema-history.json.gz')));
  const app = read('dist/app.js').toString();
  const start = app.indexOf('function displaySourceValue(');
  const end = app.indexOf('function ruleTableHTML(', start);
  assert.ok(start >= 0 && end > start, 'current helper block boundaries');
  const current = helper({books: read('dist/books.js').toString(), citations: read('dist/citations.js').toString(), shared: prior.sharedProductionHelpers, source: app.slice(start, end)});
  const data = JSON.parse(read('dist/data.json'));
  assert.equal(legacyResolved(current.resolveFact, data.rules), 82);
  assert.deepEqual(proposedCounts(current, data.rules), {rows: 87, resolvedRows: 87, bulletChips: 33});
  const mistletoe = data.rules.find(owner => owner.id === 'phb-druid-mistletoe-spell-components');
  assert.ok(mistletoe, 'the fourth existing structured table remains in the current universe');
  assert.ok(sourceFacts(mistletoe).every(fact => current.resolveFact(mistletoe, fact) === null), 'unbound Mistletoe facts do not acquire fabricated source controls');
  const bindings = JSON.parse(read('research/price-source-inventory.json')).fieldEvidenceBindings;
  const added = bindings.filter(binding => binding.collection === 'rules'
    && (binding.itemId.startsWith('appendix-c-') || binding.itemId === 'encounter-types' && binding.fieldPointer.startsWith('/bullets/'))
    && (/^\/table\/rows\//.test(binding.fieldPointer) || /^\/bullets\//.test(binding.fieldPointer)));
  assert.equal(added.length, 120);
  assert.ok(added.every(binding => binding.reviewStatus === 'field-target-pending'
    && binding.targetReview === null && binding.contextStatus === 'context-not-assessed'
    && binding.sourceValueStatus === 'not-assessed-by-field-target-review'), 'working controls do not promote target/value/context review');
});
