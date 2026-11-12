import assert from 'node:assert/strict';
import {projectPass8PhbSourceBytes} from '../research/class-mapping-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs';
import {projectDmg175Books} from './helpers/batch6-dmg175-source-history.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSourcePriceTokenInventory} from '../tools/source-price-token-inventory.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = 'research/source-audit-batch5-fivebook-currency-token-inventory.json';
const artifactBytes = readFileSync(resolve(root, artifactPath));
const artifact = JSON.parse(artifactBytes.toString('utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const OUTPUT_SHA256 = '311c87563078e8471f5125cf0835ed3aa9b60e32fd95ecd480973f9de7ecead4';

function visit(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!/^(?:text|matchedText|sourceLineText|rawLine|contextText)$/i.test(key), `${path}.${key} must remain private`);
    visit(child, `${path}.${key}`);
  }
}

test('five-book inventory covers every supplied PDF page and keeps candidate classes unreviewed', () => {
  assert.equal(sha256(artifactBytes), OUTPUT_SHA256);
  assert.deepEqual(artifact.denominators, {
    sourcePdfs: 5,
    pdfPages: 776,
    candidateLines: 6137,
    currencyXpWeightTokenMentions: 1021,
    numericMoneyValueCandidates: 704,
  });
  assert.deepEqual(artifact.counts.tokenClassCounts, {currency: 934, 'experience-point': 47, 'weight-unit': 40});
  assert.equal(artifact.pages.length, 776);
  assert.equal(artifact.candidateLines.length, 6137);
  assert.equal(artifact.tokenMentions.length, 1021);
  assert.equal(artifact.numericMoneyCandidates.length, 704);
  assert.equal(new Set(artifact.candidateLines.map(row => row.lineCandidateId)).size, 6137);
  assert.equal(new Set(artifact.tokenMentions.map(row => row.tokenMentionId)).size, 1021);
  assert.equal(new Set(artifact.numericMoneyCandidates.map(row => row.moneyCandidateId)).size, 704);
  assert.deepEqual(artifact.sourcePdfs.map(row => [row.book, row.pdfPageCount]), [
    ['PHB', 130], ['DMG', 240], ['UA', 130], ['MM', 114], ['MM2', 162],
  ]);
  assert.deepEqual(Object.fromEntries(artifact.sourcePdfs.map(row => [row.book, row.sourcePdfSha256])), {
    PHB: 'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095',
    DMG: '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',
    UA: 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4',
    MM: 'c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81',
    MM2: 'b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24',
  });
  // This frozen token census binds its old printed-page-map implementation via
  // the explicit PHB→ae7→DMG history stages. Current overview/mapping tests use native804 books.
  assert.equal(artifact.inputArtifacts.printedPageMap.sha256, sha256(projectDmg175Books(projectPass8PhbSourceBytes('dist/books.js',readFileSync(resolve(root, 'dist/books.js'))))));
  const byBook = new Map(artifact.sourcePdfs.map(source => [source.book, source]));
  const linesById = new Map(artifact.candidateLines.map(row => [row.lineCandidateId, row]));
  const pagesByBookAndPdfPage = new Map(artifact.pages.map(page => [`${page.book}:${page.pdfPage}`, page]));
  assert.deepEqual(byBook.get('DMG').knownMissingPrintedPages, [175]);
  assert.deepEqual(byBook.get('DMG').printedPagesWithUnverifiedIdentity, [239, 240]);
  assert.equal(pagesByBookAndPdfPage.get('DMG:176').printedPage, 176);
  assert.equal(pagesByBookAndPdfPage.get('DMG:176').printedPageMappingStatus, 'mapping-derivable-not-visually-read');
  for (const pdfPage of [239, 240]) {
    const page = pagesByBookAndPdfPage.get(`DMG:${pdfPage}`);
    assert.equal(page.printedPage, null);
    assert.equal(page.printedPageMappingStatus, 'unresolved-boundary-or-unverified');
    assert.match(page.sourceLabel, /unknown or unverified/);
  }
  for (const page of artifact.pages) {
    const lineIds = page.candidateLineIds ?? [];
    assert.equal(lineIds.length, page.candidateLineCount + page.explicitWeightOrXpLineCount, `${page.book}:${page.pdfPage}`);
    for (const id of [...lineIds, ...(page.tokenMentionIds ?? []).map(tokenId => artifact.tokenMentions[tokenId - 1]?.lineCandidateId), ...(page.numericMoneyCandidateIds ?? []).map(valueId => artifact.numericMoneyCandidates[valueId - 1]?.lineCandidateId)]) {
      assert.ok(linesById.has(id), `${page.book}:${page.pdfPage}:${id}`);
      assert.equal(linesById.get(id).book, page.book, `${page.book}:${page.pdfPage}:${id}`);
      assert.equal(linesById.get(id).pdfPage, page.pdfPage, `${page.book}:${page.pdfPage}:${id}`);
    }
  }
  for (const candidate of artifact.candidateLines) {
    const source = byBook.get(candidate.book);
    assert.equal(candidate.sourcePdfSha256, source.sourcePdfSha256, candidate.lineCandidateId);
    assert.equal(candidate.reviewStatus, 'pending source and semantic review');
    assert.ok(candidate.sourcePdfPointBounds.precision.includes('not a token-level box'));
  }
  for (const record of [...artifact.tokenMentions, ...artifact.numericMoneyCandidates]) {
    assert.equal(record.sourcePdfSha256, byBook.get(record.book).sourcePdfSha256, String(record.pdfPage));
    assert.ok(record.lineCandidateId >= 1 && record.lineCandidateId <= artifact.candidateLines.length);
    assert.ok(record.pdfPage >= 1 && record.pdfPage <= byBook.get(record.book).pdfPageCount);
    const page = pagesByBookAndPdfPage.get(`${record.book}:${record.pdfPage}`);
    assert.equal(record.printedPage, page.printedPage);
    assert.equal(record.printedPageMappingStatus, page.printedPageMappingStatus);
    assert.equal(record.sourceLabel, page.sourceLabel);
  }
  assert.equal(artifact.counts.notAbsencePasses.noConfiguredCuePages, 95);
  assert.equal(artifact.counts.notAbsencePasses.emptyOrUnextractablePages, 18);
  assert.match(artifact.limits.join(' '), /not negative findings/i);
  visit(artifact);
});

test('pure sanitizer emits numeric metadata only and never copies source-line text', () => {
  const hash = 'a'.repeat(64);
  const books = [['PHB', 130], ['DMG', 240], ['UA', 130], ['MM', 114], ['MM2', 162]];
  const discovery = {
    generatedBy: 'synthetic-private-discovery', detectorVersion: 1, cueConfigurationSha256: hash,
    runtime: {python: 'test', regexEngine: 'stdlib', pymupdf: 'test'},
    denominators: {sourcePdfs: 5, pdfPages: 776}, sources: books.map(([book, pdfPageCount]) => ({book, fileName: `${book}.pdf`, sourceSha256: hash, pdfPageCount})),
    counts: {pageScreenStatuses: {'screened-no-configured-cue-not-absence': 1}, candidateKinds: {}, pagesByBook: {}},
    pagesByBook: Object.fromEntries(books.map(([book, count]) => [book, Array.from({length: count}, (_, index) => ({pdfPage: index + 1, pageGeometryPdfPoints: null, textLayer: {status: 'text-present', characterCount: 20}, screenStatus: 'broad-cue-candidates-pending-review', candidateCount: 0, explicitExclusionCandidateCount: 0}))])),
  };
  const candidateQueue = {candidateCount: 1, candidates: [{candidateId: 'private-text-hash', book: 'PHB', pdfPage: 1, blockIndex: 0, lineIndex: 0, text: '2,000 gp; 100 XP', classification: 'direct-money-value-candidate', classificationBasis: 'synthetic', boundsStatus: 'candidate-line-bounds-available', sourcePdfPointBounds: {rect: [1, 2, 3, 4]}, cueMatches: [{cueKind: 'currency', cueId: 'currency-abbreviation', matchedText: 'gp', characterStart: 7, characterEnd: 9}, {cueKind: 'xp', cueId: 'experience-points', matchedText: '100 XP', characterStart: 11, characterEnd: 17}], moneyValueCandidates: [{patternId: 'numeric-abbreviated-currency', amountText: '2,000', currencyText: 'gp', matchedText: '2,000 gp', characterStart: 0, characterEnd: 9}]}]};
  const sanitized = buildSourcePriceTokenInventory({discovery, candidateQueue, discoverySha256: hash, candidateQueueSha256: hash});
  visit(sanitized);
  const serialized = JSON.stringify(sanitized);
  assert.ok(!serialized.includes('2,000 gp'));
  assert.ok(!serialized.includes('100 XP'));
  assert.equal(sanitized.tokenMentions.length, 2);
  assert.equal(sanitized.tokenMentions[0].currency, 'gp');
  assert.equal(sanitized.tokenMentions[1].tokenClass, 'experience-point');
  assert.equal(sanitized.numericMoneyCandidates[0].amountText, '2,000');
  assert.equal(sanitized.numericMoneyCandidates[0].currencyTokenClass, 'gp');
  assert.deepEqual(sanitized.candidateLines[0].sourcePdfPointBounds.rect, [1, 2, 3, 4]);
});
