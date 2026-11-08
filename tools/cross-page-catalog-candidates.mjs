import {readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const COLLECTIONS = ['rules', 'spells', 'equipment', 'matrices', 'classes', 'progressionExplainer'];
const BINDINGS = ['sourceExcerpts', 'scanVerification'];
const OLD_SUMMARY = 'research/source-audit-batch5-continuation.json';
const DRIUD = {
  collection: 'spells', itemId: 'phb-druid-charm-person-or-mammal',
  first: 'phb-55-1ed1d4a06d478c09', second: 'phb-56-52c28faceedb3b01'
};
const PINNED_COMMIT = '679b15d1c580172e54314829c1c3c86dc78b65f3';

function readJson(root, relative) { return JSON.parse(readFileSync(path.join(root, relative), 'utf8')); }
function recordsIn(data) {
  const rows = [];
  for (const collection of COLLECTIONS) {
    const values = Array.isArray(data[collection]) ? data[collection] : data[collection] && typeof data[collection] === 'object' ? [data[collection]] : [];
    for (const record of values) if (record && typeof record.id === 'string') rows.push({collection, itemId: record.id, record});
  }
  return rows;
}

/** Source-page coordinates must be recorded by the catalog; image pixel size is not a source-page bound. */
export function normalizeSourcePageRect(region) {
  const raw = region?.normalizedPageRect ?? region?.sourcePageRect ?? region?.pageRect;
  let values;
  if (Array.isArray(raw) && raw.length >= 4) values = raw.slice(0, 4);
  else if (raw && typeof raw === 'object') values = [raw.x, raw.y, raw.w ?? raw.width, raw.h ?? raw.height];
  else return {status: 'unassessable-missing-source-page-bounds', rect: null};
  const [x, y, w, h] = values.map(Number);
  if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0 || x > 1 || y > 1 || x + w > 1.000001 || y + h > 1.000001) {
    return {status: 'unassessable-invalid-source-page-bounds', rect: null};
  }
  return {status: 'assessable', rect: {x, y, w, h}};
}

export function edgeGeometry(firstRegion, secondRegion) {
  const a = normalizeSourcePageRect(firstRegion);
  const b = normalizeSourcePageRect(secondRegion);
  if (a.status !== 'assessable' || b.status !== 'assessable') {
    return {status: a.status !== 'assessable' ? a.status : b.status, class: 'unassessable',
      coordinateBasis: 'catalog-normalized-source-page-rectangle; physical-source-PDF-page-bounds-not-present-or-inferred',
      first: a.rect, second: b.rect, horizontalOverlap: null, firstBottom: null, secondTop: null};
  }
  const firstBottom = a.rect.y + a.rect.h;
  const secondTop = b.rect.y;
  const horizontalOverlap = Math.max(0, Math.min(a.rect.x + a.rect.w, b.rect.x + b.rect.w) - Math.max(a.rect.x, b.rect.x));
  const firstNearBottom = firstBottom >= 0.9;
  const secondNearTop = secondTop <= 0.1;
  let candidateClass = 'assessable-no-page-edge-cue';
  if (firstNearBottom && secondNearTop) candidateClass = 'elevated-geometry-edge-pair';
  else if (firstNearBottom || secondNearTop) candidateClass = 'weak-geometry-single-edge-cue';
  return {status: 'assessable', class: candidateClass,
    coordinateBasis: 'catalog-normalized-source-page-rectangle; physical-source-PDF-page-bounds-not-present-or-inferred',
    first: a.rect, second: b.rect, firstBottom, secondTop, firstNearBottom, secondNearTop, horizontalOverlap};
}

function manifestPairs(manifest) {
  const map = new Map();
  for (const group of manifest?.groups || []) {
    const segments = Array.isArray(group.segments) ? group.segments : [];
    for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i], b = segments[j];
      if (typeof a.regionId !== 'string' || typeof b.regionId !== 'string') continue;
      const key = `${group.collection}\0${group.itemId}\0${group.catalog}\0${a.regionId}\0${b.regionId}`;
      const refs = map.get(key) || [];
      refs.push({groupId: group.id, firstOrder: a.order ?? i + 1, secondOrder: b.order ?? j + 1});
      map.set(key, refs);
    }
  }
  return map;
}

function currentOwnerPairs({data, catalogs, manifest, sourceCues = new Map()}) {
  const groups = new Map();
  const catalogPaths = new Set();
  const bindingResolutionIssues = [];
  const bindingCounts = Object.fromEntries(BINDINGS.map(key => [key, 0]));
  let bindingRegionUses = 0;
  for (const {collection, itemId, record} of recordsIn(data)) {
    for (const bindingKey of BINDINGS) {
      const binding = record[bindingKey];
      if (!binding || typeof binding.catalog !== 'string') continue;
      bindingCounts[bindingKey]++;
      catalogPaths.add(binding.catalog);
      const catalog = catalogs.get(binding.catalog);
      if (!catalog || !Array.isArray(catalog.regions)) {
        bindingResolutionIssues.push({collection, itemId, bindingKey, catalog: binding.catalog, issue: 'referenced-catalog-unavailable'});
        continue;
      }
      const chosen = Array.isArray(binding.regionReviews) ? binding.regionReviews.map(row => row?.regionId).filter(id => typeof id === 'string') : [];
      const ids = chosen.length ? [...new Set(chosen)] : catalog.regions.map(region => region.id);
      const regions = ids.map(id => catalog.regions.find(region => region.id === id)).filter(Boolean);
      for (const id of ids) if (!catalog.regions.some(region => region.id === id)) bindingResolutionIssues.push({collection, itemId, bindingKey, catalog: binding.catalog, regionId: id, issue: 'selected-region-unavailable'});
      bindingRegionUses += regions.length;
      const ownerKey = `${collection}\0${itemId}\0${bindingKey}\0${binding.catalog}`;
      groups.set(ownerKey, {collection, itemId, bindingKey, catalog: binding.catalog, bookRegions: new Map(regions.reduce((acc, region) => {
        const book = region.book ?? 'UNKNOWN';
        if (!acc.has(book)) acc.set(book, []);
        acc.get(book).push(region);
        return acc;
      }, new Map()))});
    }
  }
  const declared = manifestPairs(manifest);
  const pairs = [];
  for (const owner of groups.values()) for (const [book, regions] of owner.bookRegions) {
    const byPdfPage = new Map();
    for (const region of regions) {
      const page = Number(region.pdfPage);
      if (!Number.isInteger(page) || page < 1) continue;
      const list = byPdfPage.get(page) || [];
      list.push(region); byPdfPage.set(page, list);
    }
    for (const [pdfPage, firstRegions] of byPdfPage) for (const first of firstRegions) for (const second of (byPdfPage.get(pdfPage + 1) || [])) {
      const geometry = edgeGeometry(first, second);
      const key = `${owner.collection}\0${owner.itemId}\0${owner.catalog}\0${first.id}\0${second.id}`;
      const declaredGroups = declared.get(key) || [];
      const cues = sourceCues.get(`${book}\0${pdfPage}`) || [];
      pairs.push({
        pairId: sha256(key).slice(0, 20), collection: owner.collection, itemId: owner.itemId,
        bindingKey: owner.bindingKey, catalog: owner.catalog, book, pdfPages: [pdfPage, pdfPage + 1],
        printedPages: [first.printedPage ?? null, second.printedPage ?? null],
        regionIds: [first.id, second.id], imageSha256: [first.sha256 ?? null, second.sha256 ?? null],
        sourceSha256: [first.sourceSha256 ?? catalogSourceHash(owner, catalogs, book), second.sourceSha256 ?? catalogSourceHash(owner, catalogs, book)],
        geometry, declaredGroups, declaredInSnapshotManifest: declaredGroups.length > 0,
        samePdfPageSourceReportCueIds: cues.map(cue => cue.id), sourcePdfPageHasAnyFlowCue: cues.length > 0,
        sourceReportCueRelation: 'same-book-and-first-PDF-page co-occurrence only; not matched to these region texts or owner'
      });
    }
  }
  pairs.sort((a, b) => a.book.localeCompare(b.book) || a.pdfPages[0] - b.pdfPages[0] || a.collection.localeCompare(b.collection) || a.itemId.localeCompare(b.itemId) || a.regionIds.join().localeCompare(b.regionIds.join()));
  const uniqueOwners = new Set([...groups.values()].map(row => `${row.collection}\0${row.itemId}\0${row.catalog}`));
  return {pairs, ownerBindingCount: groups.size, uniqueOwnerCatalogCount: uniqueOwners.size, bindingCounts, bindingRegionUses,
    bindingResolutionIssues, referencedCatalogPaths: [...catalogPaths].sort()};
}
function catalogSourceHash(owner, catalogs, book) { return catalogs.get(owner.catalog)?.sources?.[book]?.sha256 ?? null; }

function sourceCueUniverse(full) {
  const cues = [];
  for (const page of full.sourcePageUniverse || []) for (let index = 0; index < (page.adjacentPdfPageCandidates || []).length; index++) {
    const candidate = page.adjacentPdfPageCandidates[index];
    const id = `src-${sha256(`${page.book}\0${page.pdfPage}\0${index}\0${JSON.stringify(candidate)}`).slice(0, 16)}`;
    cues.push({id, book: page.book, fromPdfPage: page.pdfPage, toPdfPage: Number(page.pdfPage) + 1,
      kind: candidate.kind ?? null, confidence: candidate.confidence ?? null,
      from: {boxPt: candidate.from?.boxPt ?? null, column: candidate.from?.column ?? null, startClass: candidate.from?.startClass ?? null, endClass: candidate.from?.endClass ?? null, wordCount: candidate.from?.wordCount ?? null},
      to: {boxPt: candidate.to?.boxPt ?? null, column: candidate.to?.column ?? null, startClass: candidate.to?.startClass ?? null, endClass: candidate.to?.endClass ?? null, wordCount: candidate.to?.wordCount ?? null}, semanticReviewRequired: candidate.semanticReviewRequired ?? true});
  }
  return cues;
}

function summarizePairs(pairs) {
  const geometryClasses = {};
  let declared = 0, sourceCued = 0;
  const byBook = {};
  for (const pair of pairs) {
    geometryClasses[pair.geometry.class] = (geometryClasses[pair.geometry.class] || 0) + 1;
    if (pair.declaredInSnapshotManifest) declared++;
    if (pair.sourcePdfPageHasAnyFlowCue) sourceCued++;
    const book = byBook[pair.book] ||= {pairUsages: 0, uniqueOwnerRegionPairs: 0, geometryClasses: {}, declaredPairUsages: 0, firstPdfPageCoCuePairUsages: 0, pairIds: new Set()};
    book.pairUsages++;
    book.geometryClasses[pair.geometry.class] = (book.geometryClasses[pair.geometry.class] || 0) + 1;
    if (pair.declaredInSnapshotManifest) book.declaredPairUsages++;
    if (pair.sourcePdfPageHasAnyFlowCue) book.firstPdfPageCoCuePairUsages++;
    book.pairIds.add(pair.pairId);
  }
  for (const book of Object.values(byBook)) { book.uniqueOwnerRegionPairs = book.pairIds.size; delete book.pairIds; }
  return {allConsecutivePagePairUsages: pairs.length, uniqueOwnerRegionPairIdentities: new Set(pairs.map(pair => pair.pairId)).size,
    geometryClasses, declaredPairUsages: declared, firstPdfPageCoCuePairUsages: sourceCued, byBook,
    semanticReviewDisposition: 'No geometry-only or text-shape candidate absence is a semantic negative or source-completeness pass.'};
}

function currentSnapshot({root, sourceCues, sourceCueMap}) {
  const dataBytes = readFileSync(path.join(root, 'dist/data.json'));
  const data = JSON.parse(dataBytes.toString('utf8'));
  const manifestBytes = readFileSync(path.join(root, 'research/citation-continuations.json'));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const referenced = new Set();
  for (const {record} of recordsIn(data)) for (const key of BINDINGS) if (typeof record[key]?.catalog === 'string') referenced.add(record[key].catalog);
  const catalogs = new Map(), hashes = {};
  for (const relative of [...referenced].sort()) {
    const bytes = readFileSync(path.join(root, 'dist', relative));
    hashes[relative] = sha256(bytes);
    catalogs.set(relative, JSON.parse(bytes.toString('utf8')));
  }
  const inventory = currentOwnerPairs({data, catalogs, manifest, sourceCues: sourceCueMap});
  const dru = inventory.pairs.find(pair => pair.collection === DRIUD.collection && pair.itemId === DRIUD.itemId && pair.regionIds[0] === DRIUD.first && pair.regionIds[1] === DRIUD.second);
  return {
    schemaVersion: 1, kind: 'current-consecutive-page-region-pair-inventory',
    capturePurpose: 'Pre-change snapshot, captured before the PHB p.55→56 Druid continuation group was added.',
    evidenceLimits: ['Catalog crop geometry is a structural cue only.', 'Source PDF page bounds are not inferred from crop image dimensions.', 'No absence of a geometry cue is a semantic negative or completeness assertion.', 'Pairs are generated within each exposed record binding usage; shared owner/catalog pairs may therefore have multiple binding-use rows.'],
    input: {treeSelection: 'current-worktree', distDataSha256: sha256(dataBytes), catalogHashesSha256: hashes,
      catalogUniverseSha256: sha256(Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)))))),
      continuationManifestSha256: sha256(manifestBytes), continuationGroupCount: manifest.groups?.length ?? null,
      sourceCueReportSummarySha256: sha256(readFileSync(path.join(root, OLD_SUMMARY)))},
    universe: {recordCount: recordsIn(data).length, uniqueReferencedCatalogCount: referenced.size,
      ownerCatalogCount: inventory.uniqueOwnerCatalogCount, ownerBindingCount: inventory.ownerBindingCount,
      bindingCounts: inventory.bindingCounts, bindingRegionUses: inventory.bindingRegionUses,
      bindingResolutionIssueCount: inventory.bindingResolutionIssues.length, bindingResolutionIssues: inventory.bindingResolutionIssues,
      sourceReportFlowCueUniverse: {count: sourceCues.length, confidenceCounts: countsBy(sourceCues, row => row.confidence), cues: sourceCues}},
    summary: summarizePairs(inventory.pairs),
    knownHistoricalControl: {owner: `${DRIUD.collection}:${DRIUD.itemId}`, regionIds: [DRIUD.first, DRIUD.second],
      currentPairFound: Boolean(dru), currentPair: dru ?? null, currentManifestDeclaresPair: Boolean(dru?.declaredInSnapshotManifest)},
    pairs: inventory.pairs
  };
}

function countsBy(rows, keyOf) { const out = {}; for (const row of rows) { const key = keyOf(row) ?? 'unclassified'; out[key] = (out[key] || 0) + 1; } return out; }

function historicalSnapshot({root, sourceCues}) {
  const summary = readJson(root, OLD_SUMMARY);
  const fullPath = path.join(root, 'research', summary.fullEvidence.path);
  const compressed = readFileSync(fullPath);
  if (sha256(compressed) !== summary.fullEvidence.sha256) throw new Error('Pinned continuation report compressed hash mismatch.');
  const full = JSON.parse(gunzipSync(compressed).toString('utf8'));
  const oldManifestBytes = execFileSync('git', ['show', `${PINNED_COMMIT}:research/citation-continuations.json`], {cwd: root});
  const oldManifest = JSON.parse(oldManifestBytes.toString('utf8'));
  const groups = new Map();
  for (const row of full.regionAssessments || []) for (const use of row.bindingUses || []) {
    const key = `${use.collection}\0${use.itemId}\0${use.bindingKey}\0${row.owner?.catalog}\0${row.book}`;
    let group = groups.get(key);
    if (!group) { group = {collection: use.collection, itemId: use.itemId, bindingKey: use.bindingKey, catalog: row.owner?.catalog, book: row.book, regions: []}; groups.set(key, group); }
    group.regions.push(row);
  }
  const declared = manifestPairs(oldManifest);
  const pairs = [];
  for (const owner of groups.values()) {
    const byPdfPage = new Map();
    for (const region of owner.regions) {
      const page = Number(region.pdfPage); if (!Number.isInteger(page) || page < 1) continue;
      const list = byPdfPage.get(page) || []; list.push(region); byPdfPage.set(page, list);
    }
    for (const [pdfPage, firstRows] of byPdfPage) for (const a of firstRows) for (const b of (byPdfPage.get(pdfPage + 1) || [])) {
      const geometry = edgeGeometry({normalizedPageRect: a.normalizedPageRect}, {normalizedPageRect: b.normalizedPageRect});
      const key = `${owner.collection}\0${owner.itemId}\0${owner.catalog}\0${a.regionId}\0${b.regionId}`;
      const declaredGroups = declared.get(key) || [];
      const cues = sourceCues.filter(cue => cue.book === owner.book && cue.fromPdfPage === pdfPage);
      pairs.push({pairId: sha256(key).slice(0, 20), collection: owner.collection, itemId: owner.itemId,
        bindingKey: owner.bindingKey, catalog: owner.catalog, book: owner.book, pdfPages: [pdfPage, pdfPage + 1],
        printedPages: [a.printedPage ?? null, b.printedPage ?? null], regionIds: [a.regionId, b.regionId],
        imageSha256: [a.imageSha256 ?? null, b.imageSha256 ?? null], sourceSha256: [a.sourceSha256 ?? null, b.sourceSha256 ?? null],
        geometry, declaredGroups, declaredInSnapshotManifest: declaredGroups.length > 0,
        samePdfPageSourceReportCueIds: cues.map(cue => cue.id), sourcePdfPageHasAnyFlowCue: cues.length > 0,
        sourceReportCueRelation: 'same-book-and-first-PDF-page co-occurrence only; not matched to these region texts or owner'});
    }
  }
  pairs.sort((a, b) => a.book.localeCompare(b.book) || a.pdfPages[0] - b.pdfPages[0] || a.collection.localeCompare(b.collection) || a.itemId.localeCompare(b.itemId) || a.regionIds.join().localeCompare(b.regionIds.join()));
  const druid = pairs.find(pair => pair.collection === DRIUD.collection && pair.itemId === DRIUD.itemId && pair.regionIds[0] === DRIUD.first && pair.regionIds[1] === DRIUD.second);
  return {schemaVersion: 1, kind: 'pinned-679-consecutive-page-region-pair-baseline',
    evidenceLimits: ['Pinned report uses the 679b15d1 tree and original source report inputs.', 'Geometry-only evidence is structural, not source-semantic confirmation.', 'No source-text cue and no geometry cue are not semantic negatives.'],
    input: {gitCommit: PINNED_COMMIT, distDataSha256: summary.input.distDataRawFileSha256,
      continuationManifestSha256: summary.input.continuationManifestSha256, continuationGroupCount: oldManifest.groups?.length ?? null,
      catalogUniverseSha256: summary.input.catalogUniverseSha256, sourceReportSummarySha256: sha256(readFileSync(path.join(root, OLD_SUMMARY))),
      sourceReportFullCompressedSha256: sha256(compressed)},
    universe: {regionAssessmentRows: full.regionAssessments?.length ?? 0, ownerBindingPairGroups: groups.size,
      sourceReportFlowCueUniverse: {count: sourceCues.length, confidenceCounts: countsBy(sourceCues, row => row.confidence), cues: sourceCues}},
    summary: summarizePairs(pairs), knownHistoricalControl: {owner: `${DRIUD.collection}:${DRIUD.itemId}`, regionIds: [DRIUD.first, DRIUD.second],
      pairFound: Boolean(druid), pair: druid ?? null, pinnedManifestDeclaresPair: Boolean(druid?.declaredInSnapshotManifest),
      expectedSourceReportCueStatus: druid?.sourcePdfPageHasAnyFlowCue ? 'page-has-cue' : 'no-adjacent-PDF-flow-cue-on-first-PDF-page'}, pairs};
}

export function buildHistoricalConsecutivePageSnapshot(options) { return historicalSnapshot(options); }
export function buildCurrentConsecutivePageSnapshot(options) { return currentSnapshot(options); }
export function buildSourceReportCueUniverse(full) { return sourceCueUniverse(full); }

function indexSourceCues(cues) {
  const map = new Map();
  for (const cue of cues) {
    const key = `${cue.book}\0${cue.fromPdfPage}`;
    const rows = map.get(key) || [];
    rows.push(cue); map.set(key, rows);
  }
  return map;
}

export function writeSnapshots({root, baselinePath, currentPath}) {
  const summary = readJson(root, OLD_SUMMARY);
  const raw = gunzipSync(readFileSync(path.join(root, 'research', summary.fullEvidence.path)));
  const full = JSON.parse(raw.toString('utf8'));
  const cues = sourceCueUniverse(full);
  const baseline = historicalSnapshot({root, sourceCues: cues});
  const current = currentSnapshot({root, sourceCues: cues, sourceCueMap: indexSourceCues(cues)});
  for (const [target, value] of [[baselinePath, baseline], [currentPath, current]]) {
    mkdirSync(path.dirname(target), {recursive: true});
    writeFileSync(target, `${JSON.stringify(value)}\n`);
  }
  return {baseline, current};
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  const args = process.argv.slice(2);
  const get = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const root = path.resolve(get('--repo-root') || process.cwd());
  const baselinePath = path.resolve(get('--baseline-output') || path.join(root, 'research/source-audit-batch5-cross-page-pairs-baseline.json'));
  const currentPath = path.resolve(get('--current-output') || path.join(root, 'research/source-audit-batch5-cross-page-pairs-current.json'));
  const {baseline, current} = writeSnapshots({root, baselinePath, currentPath});
  process.stdout.write(`${JSON.stringify({baselinePath, baselinePairs: baseline.summary.allConsecutivePagePairUsages, currentPath,
    currentPairs: current.summary.allConsecutivePagePairUsages, currentGeometry: current.summary.geometryClasses,
    currentManifest: current.input.continuationManifestSha256, druidPairFound: current.knownHistoricalControl.currentPairFound,
    druidPairDeclared: current.knownHistoricalControl.currentManifestDeclaresPair})}\n`);
}

