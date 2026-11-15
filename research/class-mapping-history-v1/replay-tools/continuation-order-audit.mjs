import {readFileSync, writeFileSync} from '../mm-replay-fs-v1.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const digest = value => createHash('sha256').update(value).digest('hex');

// This checks only declared segments. It does not discover continuation text.
// The viewer filters by page and stably moves context-only regions last.
export function auditContinuationOrder(group, catalog) {
  const required = [...(group.segments || [])].filter(segment => segment.state === 'present').sort((a, b) => a.order - b.order);
  const byId = new Map(required.map(segment => [segment.regionId, segment]));
  const regions = (catalog?.regions || []).map((region, catalogIndex) => ({...region, catalogIndex}));
  const entry = region => {
    const segment = byId.get(region.id);
    return {order: segment.order, role: segment.role, regionId: region.id, catalogIndex: region.catalogIndex};
  };
  const actual = regions.filter(region => byId.has(region.id));
  const actualOrder = actual.map(entry);
  const duplicateRegionIds = [...new Set(actual.filter((region, index) => actual.findIndex(candidate => candidate.id === region.id) !== index).map(region => region.id))];
  const missingRegionIds = required.filter(segment => !actual.some(region => region.id === segment.regionId)).map(segment => segment.regionId);
  const expectedPresent = required.filter(segment => !missingRegionIds.includes(segment.regionId)).map(segment => segment.regionId);
  const orderMismatches = [];
  const actualIds = actual.map(region => region.id);
  if (expectedPresent.join('\0') !== actualIds.join('\0')) orderMismatches.push({dimension: 'catalog', expectedRegionIds: expectedPresent, actualRegionIds: actualIds});
  const pages = [...new Map(required.map(segment => [`${segment.book}:${segment.printedPage}`, {book: segment.book, printedPage: segment.printedPage}])).values()];
  const viewerOrder = [];
  for (const page of pages) {
    const available = regions.filter(region => region.book === page.book && region.printedPage === page.printedPage)
      .sort((a, b) => Number(a.role === 'context') - Number(b.role === 'context'));
    const shown = available.filter(region => byId.has(region.id));
    viewerOrder.push(...shown.map(entry));
    const expected = required.filter(segment => segment.book === page.book && segment.printedPage === page.printedPage && !missingRegionIds.includes(segment.regionId)).map(segment => segment.regionId);
    if (expected.join('\0') !== shown.map(region => region.id).join('\0')) orderMismatches.push({dimension: 'viewer', ...page, expectedRegionIds: expected, actualRegionIds: shown.map(region => region.id)});
  }
  const multiPage = pages.length > 1;
  const blockedSegmentCount = (group.segments || []).filter(segment => segment.state === 'blocked-source-unavailable').length;
  const classification = duplicateRegionIds.length ? 'duplicate-segment' : missingRegionIds.length ? 'missing-segment' : orderMismatches.length ? 'confirmed-order-defect' : !required.length || multiPage || blockedSegmentCount ? 'not-assessable' : 'declared-order-consistent';
  return {classification, actualOrder, viewerOrder, orderMismatches, duplicateRegionIds, missingRegionIds,
    viewerPageSequence: multiPage ? 'not-assessable' : 'single-page', blockedSegmentCount,
    scope: 'Declared required-segment relative order in the catalog and untargeted same-page viewer. Field-target overrides, default selection among unrelated regions, semantic completeness and unknown continuations are not assessed.'};
}

export function reportContinuationOrder(manifest, loadCatalog) {
  const groups = (manifest.groups || []).map(group => {
    try {
      const loaded = loadCatalog(group.catalog);
      const bytes = typeof loaded === 'string' || Buffer.isBuffer(loaded) ? loaded : JSON.stringify(loaded);
      const catalog = typeof loaded === 'string' || Buffer.isBuffer(loaded) ? JSON.parse(String(loaded)) : loaded;
      return {id: group.id, collection: group.collection, itemId: group.itemId, catalog: group.catalog, catalogSha256: digest(bytes), expectedRegionIds: [...(group.segments || [])].filter(segment => segment.state === 'present').sort((a, b) => a.order - b.order).map(segment => segment.regionId), ...auditContinuationOrder(group, catalog)};
    } catch (error) {
      return {id: group.id, catalog: group.catalog, classification: 'not-assessable', reason: error.message};
    }
  });
  const counts = Object.fromEntries(['declared-order-consistent', 'confirmed-order-defect', 'missing-segment', 'duplicate-segment', 'not-assessable'].map(state => [state, groups.filter(group => group.classification === state).length]));
  return {schemaVersion: 1, denominator: groups.length, counts, groups,
    limits: 'Only groups declared in the source-reviewed continuation manifest are assessed. Unannotated passages remain unresolved. No OCR/layout continuation discovery or semantic-completeness inference is performed.'};
}

export function continuationValidationGate(coverage = {}) {
  const counts = coverage.ordering?.counts || {};
  const available = coverage.available === true && coverage.validation != null && coverage.ordering?.counts != null && !coverage.error;
  return {
    valid: Boolean(available && coverage.validation.valid !== false && !coverage.validation.error && !['confirmed-order-defect', 'missing-segment', 'duplicate-segment'].some(state => counts[state] > 0)),
    counts,
    contractError: coverage.error || coverage.validation?.error || (!available ? 'Continuation manifest, validation or ordering report unavailable' : null),
    scope: 'Declared continuation contracts only. Unknown continuations and not-assessable sequencing remain unresolved.',
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifestBytes = readFileSync('research/citation-continuations.json');
  const report = {...reportContinuationOrder(JSON.parse(manifestBytes), catalog => readFileSync(path.join('dist', catalog))), manifestSha256: digest(manifestBytes)};
  const outputIndex = process.argv.indexOf('--output');
  const json = JSON.stringify(report, null, 2) + '\n';
  if (outputIndex >= 0) writeFileSync(process.argv[outputIndex + 1], json);
  else process.stdout.write(json);
  if (report.groups.some(group => ['confirmed-order-defect', 'missing-segment', 'duplicate-segment'].includes(group.classification))) process.exitCode = 1;
}
