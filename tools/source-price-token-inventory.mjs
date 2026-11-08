import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const BOOK_ORDER = ['PHB', 'DMG', 'UA', 'MM', 'MM2'];
const PRICE_KINDS = new Set(['currency', 'xp', 'weight']);
const require = createRequire(import.meta.url);
const printedPageMap = require('../dist/books.js');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const printedPageMapPath = fileURLToPath(new URL('../dist/books.js', import.meta.url));
const printedPageMapSha256 = sha256(readFileSync(printedPageMapPath));

function canonicalCurrency(raw) {
  const token = String(raw ?? '').toLowerCase().replaceAll('.', '').replaceAll(' ', '');
  if (token === '$' || token === 'usd' || token.includes('us$')) return 'usd';
  if (token === 'gp' || token.startsWith('gold')) return 'gp';
  if (token === 'sp' || token.startsWith('silver')) return 'sp';
  if (token === 'cp' || token.startsWith('copper')) return 'cp';
  if (token === 'ep' || token.startsWith('electrum')) return 'ep';
  if (token === 'pp' || token.startsWith('platinum')) return 'pp';
  return 'unmapped-currency-token';
}

function stableSpan(span, lineId) {
  return {
    lineCandidateId: lineId,
    characterStart: span.characterStart,
    characterEnd: span.characterEnd,
  };
}

function validateHash(value, description) {
  if (!/^[a-f0-9]{64}$/i.test(value ?? '')) throw new TypeError(`${description} must be a SHA-256 hex digest.`);
}

function assertNoSourceText(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:text|matchedText|sourceLineText|rawLine|contextText)$/i.test(key)) throw new Error(`Sanitized output contains prohibited source text at ${path}.${key}.`);
    assertNoSourceText(child, `${path}.${key}`);
  }
}

export function buildSourcePriceTokenInventory({discovery, candidateQueue, discoverySha256, candidateQueueSha256}) {
  if (!discovery || !candidateQueue || !Array.isArray(discovery.sources) || !discovery.pagesByBook || !Array.isArray(candidateQueue.candidates)) {
    throw new TypeError('Private page-discovery JSON and candidate queue are required.');
  }
  validateHash(discoverySha256, 'discovery input hash');
  validateHash(candidateQueueSha256, 'candidate-queue input hash');
  if (discovery.denominators?.sourcePdfs !== 5 || discovery.denominators?.pdfPages !== 776) throw new Error('This task-bound inventory requires the five supplied source PDFs and 776-page denominator.');
  if (candidateQueue.candidateCount !== candidateQueue.candidates.length) throw new Error('Candidate queue count does not match its candidate array.');

  const sourceByBook = new Map(discovery.sources.map(source => [source.book, source]));
  for (const book of BOOK_ORDER) {
    const source = sourceByBook.get(book);
    if (!source) throw new Error(`Missing source metadata for ${book}.`);
    validateHash(source.sourceSha256, `${book} source PDF hash`);
    if ((discovery.pagesByBook[book] ?? []).length !== source.pdfPageCount) throw new Error(`${book} page array does not match the source PDF page count.`);
  }
  const pages = [];
  for (const book of BOOK_ORDER) {
    const source = sourceByBook.get(book);
    for (const page of discovery.pagesByBook[book]) {
      const matches = [];
      const map = printedPageMap.books[book];
      if (map) {
        for (let printedPage = 1; printedPage <= map.lastPage; printedPage++) {
          if (printedPageMap.availability(book, printedPage) === 'available' && printedPageMap.pdfPage(book, printedPage) === page.pdfPage) matches.push(printedPage);
        }
      }
      const derivedPrintedPage = matches.length === 1 ? matches[0] : null;
      const mappingStatus = derivedPrintedPage !== null ? 'mapping-derivable-not-visually-read' : 'unresolved-boundary-or-unverified';
      const sourceLabel = derivedPrintedPage !== null
        ? `${book} printed p.${derivedPrintedPage} (derived from pinned PDF page map; not visually read)`
        : `${book} PDF p.${page.pdfPage}; printed-page identity unknown or unverified`;
      pages.push({
        book,
        sourceFile: source.fileName,
        sourcePdfSha256: source.sourceSha256,
        pdfPage: page.pdfPage,
        printedPage: derivedPrintedPage,
        printedPageMappingStatus: mappingStatus,
        printedPageMappingBasis: {
          kind: 'unique inverse of dist/books.js availability/page map',
          fileSha256: printedPageMapSha256,
          mappingText: map?.mapping ?? 'no printed-page map available',
        },
        sourceLabel,
        pageGeometryPdfPoints: page.pageGeometryPdfPoints ?? null,
        textLayer: {
          status: page.textLayer?.status ?? 'not-assessable',
          characterCount: page.textLayer?.characterCount ?? null,
        },
        screenStatus: page.screenStatus,
        candidateLineCount: page.candidateCount,
        explicitWeightOrXpLineCount: page.explicitExclusionCandidateCount,
        reviewStatus: 'not-reviewed; no-cue and empty-text pages are not absence passes',
      });
    }
  }

  const candidateLines = [];
  const tokenMentions = [];
  const numericMoneyCandidates = [];
  const pageRecords = new Map(pages.map(page => [`${page.book}:${page.pdfPage}`, page]));
  for (const [index, candidate] of candidateQueue.candidates.entries()) {
    const source = sourceByBook.get(candidate.book);
    if (!source || !Number.isInteger(candidate.pdfPage) || candidate.pdfPage < 1 || candidate.pdfPage > source.pdfPageCount) {
      throw new Error(`Candidate ${candidate.candidateId} has an invalid source page.`);
    }
    const lineCandidateId = index + 1;
    const bounds = candidate.sourcePdfPointBounds?.rect ?? null;
    if (bounds !== null && (!Array.isArray(bounds) || bounds.length !== 4 || bounds.some(value => !Number.isFinite(value)))) {
      throw new Error(`Candidate ${candidate.candidateId} has malformed text-line bounds.`);
    }
    const line = {
      lineCandidateId,
      book: candidate.book,
      sourcePdfSha256: source.sourceSha256,
      pdfPage: candidate.pdfPage,
      blockIndex: candidate.blockIndex ?? null,
      lineIndex: candidate.lineIndex ?? null,
      classification: candidate.classification,
      classificationBasis: candidate.classificationBasis,
      cueKinds: [...new Set((candidate.cueMatches ?? []).map(match => match.cueKind))].sort(),
      cueMatchCount: candidate.cueMatches?.length ?? 0,
      numericMoneyValueCandidateCount: candidate.moneyValueCandidates?.length ?? 0,
      sourcePdfPointBounds: {
        coordinateSpace: 'source-pdf-points-top-left-origin',
        format: 'x0-y0-x1-y1',
        rect: bounds,
        precision: 'union of text-span boxes for the complete candidate line; not a token-level box',
        status: candidate.boundsStatus,
      },
      reviewStatus: 'pending source and semantic review',
    };
    candidateLines.push(line);
    const page = pageRecords.get(`${candidate.book}:${candidate.pdfPage}`);
    if (!page) throw new Error(`Candidate ${candidate.candidateId} has no page denominator record.`);
    const firstTokenMentionIndex = tokenMentions.length;
    const firstMoneyCandidateIndex = numericMoneyCandidates.length;
    for (const [cueIndex, cue] of (candidate.cueMatches ?? []).entries()) {
      if (!PRICE_KINDS.has(cue.cueKind)) continue;
      const id = tokenMentions.length + 1;
      const record = {
        tokenMentionId: id,
        ...stableSpan(cue, lineCandidateId),
        book: candidate.book,
        sourcePdfSha256: source.sourceSha256,
        pdfPage: candidate.pdfPage,
        printedPage: page.printedPage,
        printedPageMappingStatus: page.printedPageMappingStatus,
        sourceLabel: page.sourceLabel,
        lineCueIndex: cueIndex,
        tokenClass: cue.cueKind === 'currency' ? 'currency' : cue.cueKind === 'xp' ? 'experience-point' : 'weight-unit',
        currency: cue.cueKind === 'currency' ? canonicalCurrency(cue.matchedText) : null,
        sourcePdfPointBounds: bounds,
        boundsStatus: bounds ? 'candidate-line-union; token-specific box not measured' : 'not-assessable-no-text-span-bounds',
        reviewStatus: 'pending source review; syntactic cue only',
      };
      tokenMentions.push(record);
    }
    for (const [valueIndex, value] of (candidate.moneyValueCandidates ?? []).entries()) {
      numericMoneyCandidates.push({
        moneyCandidateId: numericMoneyCandidates.length + 1,
        ...stableSpan(value, lineCandidateId),
        book: candidate.book,
        sourcePdfSha256: source.sourceSha256,
        pdfPage: candidate.pdfPage,
        printedPage: page.printedPage,
        printedPageMappingStatus: page.printedPageMappingStatus,
        sourceLabel: page.sourceLabel,
        lineValueIndex: valueIndex,
        patternId: value.patternId,
        amountText: value.amountText,
        currencyTokenClass: canonicalCurrency(value.currencyText),
        sourcePdfPointBounds: bounds,
        boundsStatus: bounds ? 'candidate-line-union; amount-specific box not measured' : 'not-assessable-no-text-span-bounds',
        semanticStatus: 'not-assessed; not a confirmed price',
      });
    }
    page.candidateLineIds ??= [];
    page.tokenMentionIds ??= [];
    page.numericMoneyCandidateIds ??= [];
    page.candidateLineIds.push(lineCandidateId);
    for (const mention of tokenMentions.slice(firstTokenMentionIndex)) page.tokenMentionIds.push(mention.tokenMentionId);
    for (const value of numericMoneyCandidates.slice(firstMoneyCandidateIndex)) page.numericMoneyCandidateIds.push(value.moneyCandidateId);
  }

  const tokenClassCounts = Object.fromEntries(['currency', 'experience-point', 'weight-unit'].map(kind => [kind, tokenMentions.filter(record => record.tokenClass === kind).length]));
  const output = {
    schemaVersion: 1,
    artifactType: 'five-book-source-price-token-discovery-metadata',
    generatedBy: 'tools/source-price-token-inventory.mjs',
    scope: 'Source-first metadata for candidate currency, XP, weight and broad valuation/transaction cue lines on every page of five supplied PDFs. All candidate cues remain unreviewed; this is not a semantic price transcription or absence survey.',
    privacy: {
      sourceContext: 'private in the local raw discovery output; no source-line text, matched source phrases or page images are included here',
      coordinates: 'page/line candidate bounds are metadata; they are unions of line span boxes, not token-level regions',
    },
    inputArtifacts: {
      rawDiscovery: {sha256: discoverySha256, private: true},
      privateCandidateQueue: {sha256: candidateQueueSha256, private: true},
      printedPageMap: {path: 'dist/books.js', sha256: printedPageMapSha256, status: 'used only to derive page labels; derived values are not visually read'},
      detector: discovery.generatedBy,
      detectorVersion: discovery.detectorVersion,
      cueConfigurationSha256: discovery.cueConfigurationSha256,
      runtime: discovery.runtime,
    },
    sourcePdfs: BOOK_ORDER.map(book => {
      const source = sourceByBook.get(book);
      const map = printedPageMap.books[book];
      return {
        book,
        fileName: source.fileName,
        sourcePdfSha256: source.sourceSha256,
        pdfPageCount: source.pdfPageCount,
        printedPageMapSha256,
        printedPageMapping: map ? map.mapping : 'not available',
        knownMissingPrintedPages: map?.gaps ?? [],
        printedPagesWithUnverifiedIdentity: map?.unverified ?? [],
      };
    }),
    denominators: {
      sourcePdfs: discovery.denominators.sourcePdfs,
      pdfPages: discovery.denominators.pdfPages,
      candidateLines: candidateLines.length,
      currencyXpWeightTokenMentions: tokenMentions.length,
      numericMoneyValueCandidates: numericMoneyCandidates.length,
    },
    counts: {
      tokenClassCounts,
      pageScreenStatuses: discovery.counts.pageScreenStatuses,
      pageCandidateKinds: discovery.counts.candidateKinds,
      pagesByBook: discovery.counts.pagesByBook,
      notAbsencePasses: {
        noConfiguredCuePages: discovery.counts.pageScreenStatuses['screened-no-configured-cue-not-absence'] ?? 0,
        emptyOrUnextractablePages: discovery.counts.pageScreenStatuses['not-assessable-empty-text-layer'] ?? 0,
        pagesWithOnlyExplicitWeightOrXpLines: discovery.counts.pageScreenStatuses['only-explicit-weight-or-xp-line-candidates; rest-not-assessed'] ?? 0,
      },
    },
    limits: [
      'The detector searches PDF text layers, not page pixels; text extraction can omit visible print or confuse OCR glyphs.',
      'No-cue pages and empty-text pages are not negative findings and remain unreviewed.',
      'A number beside a currency cue is only a syntactic candidate. It may be an amount, threshold, formula, treasure quantity, weight, XP-adjacent text, example, or unrelated use.',
      'Line boxes are candidate locations, not precise amount or token highlights. Pixel review is required before claiming exact evidence bounds.',
      'A table value whose currency appears only in a separate heading may have no per-row currency token; source-table rows and printed unit headings require separate reconciliation.',
      'This 776-page candidate inventory does not assert that every price in the five books was detected or semantically assessed.',
    ],
    pages,
    candidateLines,
    tokenMentions,
    numericMoneyCandidates,
  };
  assertNoSourceText(output);
  return output;
}

export function runSourcePriceTokenInventoryCli(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const option = argv[index];
    if (option === '--input-discovery') options.discovery = argv[++index];
    else if (option === '--input-queue') options.queue = argv[++index];
    else if (option === '--output') options.output = argv[++index];
    else return {status: 'usage', text: 'Usage: node tools/source-price-token-inventory.mjs --input-discovery <private.json> --input-queue <private.json> --output <metadata.json>'};
  }
  if (!options.discovery || !options.queue || !options.output) return {status: 'usage', text: 'Usage: node tools/source-price-token-inventory.mjs --input-discovery <private.json> --input-queue <private.json> --output <metadata.json>'};
  const discoveryBytes = readFileSync(options.discovery);
  const queueBytes = readFileSync(options.queue);
  const output = buildSourcePriceTokenInventory({
    discovery: JSON.parse(discoveryBytes.toString('utf8')),
    candidateQueue: JSON.parse(queueBytes.toString('utf8')),
    discoverySha256: sha256(discoveryBytes),
    candidateQueueSha256: sha256(queueBytes),
  });
  writeFileSync(options.output, JSON.stringify(output, null, 2) + '\n');
  return {status: 'written', output: options.output, denominators: output.denominators, tokenClassCounts: output.counts.tokenClassCounts};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runSourcePriceTokenInventoryCli();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === 'usage') process.exitCode = 2;
}
