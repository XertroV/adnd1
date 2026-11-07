import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {TextEncoder} from 'node:util';
import vm from 'node:vm';

const source = readFileSync(new URL('../dist/source-viewer.js', import.meta.url), 'utf8');
const marker = '  root.FirstEditionSourceViewer = Object.freeze({ open, close });';
assert.ok(source.includes(marker), 'source viewer instrumentation marker exists');
const hookSource = `  root.__linkedPolicyTestHooks = {
    setState(state = {}) {
      if ('excerptSource' in state) excerptSource = state.excerptSource;
      if ('excerptCatalog' in state) excerptCatalog = state.excerptCatalog;
      if ('targets' in state) targets = state.targets;
      if ('activeTarget' in state) activeTarget = state.activeTarget;
      if ('targetDismissed' in state) targetDismissed = state.targetDismissed;
    },
    highlightDisposition
  };\n`;
const context = vm.createContext({
  URL,
  TextEncoder,
  crypto: webcrypto,
  document: {currentScript: {src: 'https://unit.test/dist/source-viewer.js'}, baseURI: 'https://unit.test/dist/'},
  location: {origin: 'https://unit.test'},
  FirstEditionBooks: {
    books: {PHB: {lastPage: 238}, UA: {lastPage: 160}, DMG: {lastPage: 240}, MM: {lastPage: 112}, MM2: {lastPage: 160}},
    code: value => value,
    pdfPage: (_book, page) => page + 1,
    privateEvidence: () => null,
    title: value => value,
    mapping: () => ''
  }
});
vm.runInContext(source.replace(marker, hookSource + marker), context, {filename: 'dist/source-viewer.js (linked-policy test VM)'});
const hooks = context.__linkedPolicyTestHooks;

const canonical = value => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const sha = value => createHash('sha256').update(value).digest('hex');

function reviewedWholeSpell(id, page, focusRects = [[0, 0, 1, 1]]) {
  const region = {
    id,
    book: 'PHB',
    printedPage: page,
    pdfPage: page + 1,
    image: `${id}.png`,
    width: 400,
    height: 300,
    sha256: 'b'.repeat(64),
    focusRects,
    title: 'Complete spell excerpt',
    alt: 'Complete spell excerpt from the original printing',
    summary: 'The full spell passage is visible.'
  };
  const sourceSha256 = 'a'.repeat(64);
  const {focusRects: _focusRects, ...content} = region;
  const record = {
    regionId: id,
    status: 'current-reviewed',
    sentinel: focusRects.some(rect => rect[0] === 0 && rect[1] === 0 && rect[2] === 1 && rect[3] === 1),
    sourceSha256,
    imageSha256: region.sha256,
    focusSha256: sha(canonical(focusRects)),
    contentSha256: sha(canonical(content)),
    review: {
      status: 'exception',
      independent: true,
      evidence: 'Synthetic exact-hash policy fixture for a complete unmarked spell.',
      scope: 'whole-spell',
      kind: 'whole-spell-unmarked'
    }
  };
  const excerptSource = {regionReviews: [record]};
  const excerptCatalog = {sources: {PHB: {sha256: sourceSha256}}};
  return {region, excerptSource, excerptCatalog};
}

test('whole-spell no-mark policy is per companion page and never masks an active field target', async () => {
  assert.equal(typeof hooks.highlightDisposition, 'function');

  const page73 = reviewedWholeSpell('spell-whole-page-73', 73);
  const page74 = reviewedWholeSpell('spell-whole-page-74', 74);
  const fieldPointer = '/effect/0';
  const originTarget = {book: 'PHB', page: 73, fieldPointer, regionIds: ['spell-effect-page-73'], reviewStatus: 'field-target-reviewed', targetStatus: 'resolved'};
  const companionTarget = {book: 'PHB', page: 74, fieldPointer, regionIds: [page74.region.id], reviewStatus: 'field-target-reviewed', targetStatus: 'resolved'};

  // The current page has a field target for the same semantic fact, even though
  // the active target was first opened on PHB p.73. The whole-spell exception
  // must not make this companion-page fact appear precisely highlighted.
  hooks.setState({excerptSource: page74.excerptSource, excerptCatalog: page74.excerptCatalog,
    targets: [originTarget, companionTarget], activeTarget: originTarget, targetDismissed: false});
  const linkedFact = await hooks.highlightDisposition(page74.region, {book: 'PHB', page: 74});
  assert.equal(linkedFact.reviewed, false, 'a matching secondary-page field target prevents whole-spell exception acceptance');
  assert.equal(linkedFact.needsWarning, true);
  assert.match(linkedFact.text, /Precise highlighting is not reviewed or available/i);

  // With no target for this companion page, the same exact source/image/focus/
  // content review remains a valid whole-spell no-mark exception.
  hooks.setState({excerptSource: page74.excerptSource, excerptCatalog: page74.excerptCatalog,
    targets: [originTarget], activeTarget: originTarget, targetDismissed: false});
  const unrelatedCompanion = await hooks.highlightDisposition(page74.region, {book: 'PHB', page: 74});
  assert.equal(unrelatedCompanion.reviewed, true);
  assert.equal(unrelatedCompanion.needsWarning, false);
  assert.match(unrelatedCompanion.text, /whole-spell.*reviewed.*source.*image.*focus.*content/i);

  // Existing generic whole-spell behavior remains valid on its own page.
  hooks.setState({excerptSource: page73.excerptSource, excerptCatalog: page73.excerptCatalog,
    targets: [], activeTarget: null, targetDismissed: false});
  const ordinaryWholeSpell = await hooks.highlightDisposition(page73.region, {book: 'PHB', page: 73});
  assert.equal(ordinaryWholeSpell.reviewed, true);
  assert.equal(ordinaryWholeSpell.needsWarning, false);

  // A mixed sentinel plus precise rectangle remains a warning, regardless of
  // a valid whole-spell exception; zero-focus excerpts also retain a warning.
  const mixed = reviewedWholeSpell('spell-mixed-focus', 75, [[0, 0, 1, 1], [.2, .2, .1, .1]]);
  hooks.setState({excerptSource: mixed.excerptSource, excerptCatalog: mixed.excerptCatalog,
    targets: [], activeTarget: null, targetDismissed: false});
  const mixedResult = await hooks.highlightDisposition(mixed.region, {book: 'PHB', page: 75});
  assert.equal(mixedResult.reviewed, false);
  assert.equal(mixedResult.needsWarning, true);
  assert.match(mixedResult.text, /full-image highlight flag is present but suppressed/i);

  const empty = {id: 'spell-zero-focus', book: 'PHB', printedPage: 76, pdfPage: 77, image: 'zero.png', sha256: 'c'.repeat(64), focusRects: []};
  hooks.setState({excerptSource: {regionReviews: []}, excerptCatalog: {sources: {PHB: {sha256: 'a'.repeat(64)}},
    regions: [empty]}, targets: [], activeTarget: null, targetDismissed: false});
  const emptyResult = await hooks.highlightDisposition(empty, {book: 'PHB', page: 76});
  assert.equal(emptyResult.reviewed, false);
  assert.equal(emptyResult.needsWarning, true);
  assert.match(emptyResult.text, /Precise highlighting is not reviewed or available/i);
});
