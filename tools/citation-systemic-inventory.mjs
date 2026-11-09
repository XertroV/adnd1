// Whole-database structural inventory for source claims and citation targets.
// This reports what is present in the data and catalog; it does not review semantics.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildVisualCoverage, buildVisualCoverageCore} from './source-visual-coverage.mjs';
import {loadRasterSnapshotInput} from './source-raster-coverage.mjs';
import {validatePriceSourceInventory} from './price-source-inventory.mjs';
import {reportContextContracts} from './citation-context-contract.mjs';
import {validateContinuationManifest} from './continuation-contract.mjs';
import {reportContinuationOrder, continuationValidationGate} from './continuation-order-audit.mjs';
import {validScanCatalogPath, validateScanCatalog} from './scan-catalog.mjs';

export const BASELINE_COMMIT = '13783128ca5955ac707ed7ec6994d78d7c9a7cce';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const books = require('../dist/books.js');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const safePath = value => typeof value === 'string' && value.startsWith('scans/') && !value.split('/').includes('..');
const esc = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
const decode = value => value.replaceAll('~1', '/').replaceAll('~0', '~');
const pointerJoin = (base, part) => `${base}/${esc(part)}`;
const MAIN_COLLECTIONS = ['rules', 'spells', 'equipment', 'matrices', 'classes'];
const RECORD_COLLECTIONS = [...MAIN_COLLECTIONS, 'progressionExplainer'];
const CITATION_KEYS = new Set([
  'sourceExcerpts', 'scanVerification', 'verification', 'evidenceBindings', 'fieldSources',
  'source', 'sources', 'sourcePages', 'sourcePageReference', 'sourceOwner', 'sourceObjectPointer',
  'references', 'reference', 'referenceSources', 'citation', 'citations', 'catalog', 'catalogPath',
  'region', 'regions', 'regionId', 'regionIds', 'unmappedRegionIds', 'book', 'pages', 'printedPage',
  'pdfPage', 'sourceSha256', 'sourceHash', 'imageSha256', 'focusRects', 'highlightCoordinates',
  'cropCoordinates', 'coordinateSpace', 'coordinateSystem', 'reviewStatus', 'contextStatus',
  'contextLimitations', 'sourceRowIds', 'sourceCategory', 'sourceObject', 'fieldPointer',
  'reviewer', 'reviewedAt', 'verificationScope', 'checkedFields',
]);
const METADATA_KEYS = new Set([
  'id', 'name', 'title', 'label', 'category', 'type', 'tags', 'aliases', 'status', 'state',
  'incomplete', 'optional', 'edition', 'track', 'role', 'scope', 'summary', 'description',
  'method', 'sourceCategory', 'priceState', 'availability', 'version', 'schemaVersion',
]);
const FACT_KEYS = new Set([
  'fields', 'price', 'suggestedPrice', 'comparisons', 'amount', 'currency', 'quantity', 'weight',
  'damage', 'range', 'duration', 'components', 'castingTime', 'savingThrow', 'area', 'effect',
  'effects', 'conditions', 'exceptions', 'bullets', 'text', 'changes', 'guidance', 'xp', 'xpRows',
  'levelChanges', 'rows', 'targets', 'armorClasses', 'coverage', 'ruleNotes', 'comparisonExamples',
  'notes', 'value', 'threshold', 'score', 'level', 'levelMin', 'levelMax', 'cost', 'fee',
  'hireling', 'wage', 'income', 'treasure', 'coins', 'gold', 'silver', 'copper', 'platinum',
]);
const FREE_TEXT_FACT_KEYS = new Set(['summary', 'description', 'explanation', 'relevance', 'finding']);
const MONEY_KEY = /(?:^|[_-])(price|cost|amount|currency|coin|money|wage|fee|income|treasure|gp|sp|cp|pp|gold|silver|copper|platinum)(?:$|[_-])/i;
const MONEY_TEXT = /(?:\b\d[\d,]*(?:\.\d+)?\s*(?:cp|sp|gp|pp|ep)\b(?![-\w])|\b\d[\d,]*(?:\.\d+)?\s*(?:copper|silver|gold|platinum|electrum)(?:\s+(?:piece|pieces|coin|coins))?\b|[$£€]\s*\d[\d,]*(?:\.\d+)?)/i;
const MONEY_AMOUNT_SOURCE = String.raw`\d[\d,]*(?:\.\d+)?`;
const MONEY_CURRENCY_SOURCE = String.raw`(?:cp|sp|gp|pp|ep|copper|silver|gold|platinum|electrum)(?:\s+(?:pieces?|coins?))?`;
const MONEY_RANGE_TEXT = new RegExp([
  String.raw`\b${MONEY_AMOUNT_SOURCE}\s*(?:${MONEY_CURRENCY_SOURCE}\s*)?(?:[-–—]|\bto\b)\s*(?:[$£€]\s*)?${MONEY_AMOUNT_SOURCE}\s*${MONEY_CURRENCY_SOURCE}\b`,
  String.raw`\b(?:between|from)\s+(?:[$£€]\s*)?${MONEY_AMOUNT_SOURCE}\s*(?:${MONEY_CURRENCY_SOURCE}\s*)?(?:and|to)\s+(?:[$£€]\s*)?${MONEY_AMOUNT_SOURCE}\s*${MONEY_CURRENCY_SOURCE}\b`,
  String.raw`[$£€]\s*${MONEY_AMOUNT_SOURCE}\s*(?:[-–—]|\bto\b)\s*[$£€]\s*${MONEY_AMOUNT_SOURCE}`,
].join('|'), 'i');
const EXACT_PRICE = /^\s*(?:[$£€]\s*)?(\d[\d,]*(?:\.\d+)?)\s*(cp|sp|gp|pp|ep|copper(?:\s+pieces?)?|silver(?:\s+pieces?)?|gold(?:\s+pieces?)?|platinum(?:\s+pieces?)?|electrum(?:\s+pieces?)?)\s*$/i;
const ENCUMBRANCE_TEXT = /\b\d[\d,]*(?:\.\d+)?\s*gp-weight\b/gi;
const REVIEWED_TARGET_STATUSES = new Set(['field-target-reviewed', 'region-verified']);
const CLASS_CODES = {confirmed: 0, candidate: 1, uncertain: 2, 'not-assessable': 3};
const KIND_CODES = {object: 0, array: 1, string: 2, number: 3, boolean: 4, null: 5};
const ROLE_CODES = {structure: 0, metadata: 1, 'citation-metadata': 2, fact: 3, 'free-text-fact': 4, unclassified: 5};

export function parseExactPrice(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const amountText = typeof raw.amount === 'string' ? raw.amount.trim() : null;
    const amountValid = typeof raw.amount === 'number'
      ? Number.isFinite(raw.amount) && raw.amount >= 0
      : typeof amountText === 'string' && /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(amountText);
    if (!amountValid) return null;
    const amount = typeof raw.amount === 'number' ? raw.amount : Number(amountText.replaceAll(',', ''));
    const currency = typeof raw.currency === 'string' ? raw.currency.trim().toLowerCase() : '';
    if (Number.isFinite(amount) && amount >= 0 && /^(?:cp|sp|gp|pp|ep)$/.test(currency)) return {amount, currency};
    return null;
  }
  if (typeof raw !== 'string') return null;
  const match = raw.match(EXACT_PRICE);
  if (!match) return null;
  const amount = Number(match[1].replaceAll(',', ''));
  const unit = match[2].toLowerCase();
  const currency = {copper: 'cp', 'copper piece': 'cp', 'copper pieces': 'cp', silver: 'sp', 'silver piece': 'sp', 'silver pieces': 'sp', gold: 'gp', 'gold piece': 'gp', 'gold pieces': 'gp', platinum: 'pp', 'platinum piece': 'pp', 'platinum pieces': 'pp', electrum: 'ep', 'electrum piece': 'ep', 'electrum pieces': 'ep'}[unit] || unit;
  return Number.isFinite(amount) ? {amount, currency} : null;
}

function normalizedPriceUnit(value) {
  if (value == null) return null;
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : value;
}

function comparePriceValueSnapshot(actualValue, valueReview) {
  const expectedValue = valueReview?.expectedValue;
  const reviewValid = valueReview?.scope === 'equipment-printed-price'
    && valueReview.independent === true
    && expectedValue && typeof expectedValue === 'object' && !Array.isArray(expectedValue)
    && Object.hasOwn(expectedValue, 'amount')
    && Object.hasOwn(expectedValue, 'currency')
    && Object.hasOwn(expectedValue, 'unit');
  if (!reviewValid) return {matches: false, status: valueReview ? 'snapshot-missing-or-invalid' : 'snapshot-missing', expected: expectedValue || null, actual: actualValue};
  const actualPrice = parseExactPrice(actualValue);
  const expectedPrice = parseExactPrice(expectedValue);
  if (!actualPrice || !expectedPrice) return {matches: false, status: 'snapshot-mismatch', expected: expectedValue, actual: actualValue, mismatchFields: ['amount-or-currency']};
  const mismatchFields = [];
  if (actualPrice.amount !== expectedPrice.amount) mismatchFields.push('amount');
  if (actualPrice.currency !== expectedPrice.currency) mismatchFields.push('currency');
  const actualUnit = actualValue && typeof actualValue === 'object' && Object.hasOwn(actualValue, 'unit') ? actualValue.unit : null;
  if (normalizedPriceUnit(actualUnit) !== normalizedPriceUnit(expectedValue.unit)) mismatchFields.push('unit');
  return {matches: mismatchFields.length === 0, status: mismatchFields.length ? 'snapshot-mismatch' : 'snapshot-matches', expected: expectedValue, actual: {amount: actualPrice.amount, currency: actualPrice.currency, unit: actualUnit}, mismatchFields};
}

function kind(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

function semanticRole(key, pathParts, value) {
  const inCitationContainer = pathParts.some(part => ['sourceExcerpts', 'scanVerification', 'fieldSources', 'evidenceBindings', 'verification', 'references', 'sourcePages', 'sourcePageReference', 'citation', 'citations', 'sourceOwner', 'regionEvidence'].includes(part));
  if (inCitationContainer || CITATION_KEYS.has(key)) return 'citation-metadata';
  const inFactContainer = pathParts.some(part => ['fields', 'price', 'suggestedPrice', 'rows', 'xpRows', 'levelChanges', 'comparisons', 'comparisonExamples', 'ruleNotes', 'effect', 'effects', 'changes', 'guidance', 'bullets', 'conditions', 'exceptions'].includes(part));
  if (FREE_TEXT_FACT_KEYS.has(key)) return 'free-text-fact';
  if (inFactContainer || FACT_KEYS.has(key) || (typeof value === 'string' && MONEY_TEXT.test(value))) return 'fact';
  if (METADATA_KEYS.has(key)) return 'metadata';
  return kind(value) === 'object' || kind(value) === 'array' ? 'structure' : 'unclassified';
}

function certaintyFor(role, key, value) {
  // This is an inventory class, not a claim that labels, names, facts, or sources
  // have been semantically verified. Metadata is therefore not-assessable here.
  if (role === 'citation-metadata' || role === 'metadata' || role === 'structure') return 'not-assessable';
  if (role === 'fact' && (FACT_KEYS.has(key) || MONEY_TEXT.test(String(value ?? '')))) return 'candidate';
  if (role === 'free-text-fact' || role === 'unclassified') return 'uncertain';
  return 'not-assessable';
}

function pointerSegments(pointer) {
  if (!pointer) return [];
  return pointer.slice(1).split('/').map(decode);
}

function resolvePointer(value, pointer) {
  if (typeof pointer !== 'string' || (pointer && !pointer.startsWith('/'))) return {exists: false};
  if (!pointer) return {exists: true, value};
  let current = value;
  for (const segment of pointerSegments(pointer)) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) return {exists: false};
    current = current[segment];
  }
  return {exists: true, value: current};
}

function recordIndex(data) {
  const owners = new Map();
  const records = [];
  const collectionCounts = {};
  for (const [collection, value] of Object.entries(data)) {
    if (!Array.isArray(value)) continue;
    collectionCounts[collection] = value.length;
    value.forEach((item, index) => {
      const id = typeof item?.id === 'string' ? item.id : String(index);
      const pointer = `/${esc(collection)}/${index}`;
      const record = {collection, id, index, pointer, item, exposed: MAIN_COLLECTIONS.includes(collection)};
      records.push(record);
      const key = `${collection}:${id}`;
      owners.set(key, [...(owners.get(key) || []), record]);
    });
  }
  if (data.progressionExplainer && typeof data.progressionExplainer === 'object') {
    const item = data.progressionExplainer;
    const record = {collection: 'progressionExplainer', id: 'progression-explainer', index: null, pointer: '/progressionExplainer', item, exposed: true};
    records.push(record);
    owners.set('progressionExplainer:progression-explainer', [record]);
  }
  return {records, owners, collectionCounts};
}

function collectTree(data, recordsByPointer) {
  const nodes = [];
  const counts = {total: 0, object: 0, array: 0, string: 0, number: 0, boolean: 0, null: 0, properties: 0};
  const classes = Object.fromEntries(Object.keys(CLASS_CODES).map(key => [key, 0]));
  const roles = Object.fromEntries(Object.keys(ROLE_CODES).map(key => [key, 0]));
  const moneyLike = [];
  const ancestorKeys = [];
  function walk(value, pointer, key, recordRoot) {
    recordRoot = recordsByPointer.get(pointer) || recordRoot;
    const valueKind = kind(value);
    const parts = pointerSegments(pointer);
    const role = semanticRole(key, parts.slice(0, -1), value);
    const confidence = certaintyFor(role, key, value);
    nodes.push([pointer, KIND_CODES[valueKind], ROLE_CODES[role], CLASS_CODES[confidence]]);
    counts.total++;
    counts[valueKind]++;
    roles[role]++;
    classes[confidence]++;
    if (valueKind === 'object' || valueKind === 'array') {
      for (const childKey of Object.keys(value)) {
        counts.properties++;
        walk(value[childKey], pointerJoin(pointer, childKey), childKey, recordRoot);
      }
    }
    if (valueKind === 'array') {
      // Object.keys above supplies exact array-index JSON pointers.
    }
    const parentParts = pointerSegments(pointer.slice(0, Math.max(0, pointer.lastIndexOf('/'))));
    const parentIsStructuredPrice = ['price', 'suggestedPrice', 'cost', 'hirelingFee'].includes(parentParts.at(-1));
    const isStructuredPriceObject = valueKind === 'object' && ['price', 'suggestedPrice', 'cost', 'hirelingFee'].includes(key);
    const isKeyCandidate = MONEY_KEY.test(key) && !parentIsStructuredPrice;
    const currencyMatches = typeof value === 'string'
      ? [...value.matchAll(new RegExp(MONEY_TEXT.source, 'gi'))].map(match => ({text: match[0], start: match.index, end: match.index + match[0].length}))
      : [];
    const encumbranceMatches = typeof value === 'string'
      ? [...value.matchAll(new RegExp(ENCUMBRANCE_TEXT.source, 'gi'))].map(match => ({text: match[0], start: match.index, end: match.index + match[0].length}))
      : [];
    const textMatches = currencyMatches.map(match => match.text);
    if ((isStructuredPriceObject || (isKeyCandidate && valueKind !== 'object' && valueKind !== 'array') || textMatches.length || encumbranceMatches.length) && !parentIsStructuredPrice) {
      moneyLike.push({pointer, key, valueKind, rawValue: value, structured: isStructuredPriceObject, textMatches, currencyMatches, encumbranceMatches, textMatch: textMatches.length === 1 ? textMatches[0] : null, recordPointer: recordRoot?.pointer || null, recordCollection: recordRoot?.collection || null, recordId: recordRoot?.id || null});
    }
  }
  walk(data, '', '', null);
  return {nodes, counts, classes, roles, moneyLike};
}

function citationLikeObject(value, key) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (['sourceExcerpts', 'scanVerification', 'fieldSources', 'sourcePageReference', 'evidenceBindings', 'sourceOwner', 'references', 'referenceSources', 'citations'].includes(key)) return true;
  if (Array.isArray(value.evidenceBindings) || Array.isArray(value.regionIds) || Array.isArray(value.unmappedRegionIds)) return true;
  if (typeof value.catalog === 'string' || typeof value.catalogPath === 'string') return true;
  return typeof value.book === 'string' && (Array.isArray(value.pages) || Number.isInteger(value.printedPage) || Number.isInteger(value.pdfPage));
}

function scanObjects(data, records) {
  const recordByItem = new Map(records.map(record => [record.item, record]));
  const citationObjects = [];
  const bindings = [];
  const genericPages = [];
  function walk(value, pointer, key, record) {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value)) {
      if (citationLikeObject(value, key)) {
        const referenceShape = Object.hasOwn(books.books, value.book) && Array.isArray(value.pages) && value.pages.length > 0;
        const bindingShape = Array.isArray(value.evidenceBindings) || Object.hasOwn(value, 'fieldPointer') || Object.hasOwn(value, 'regionIds') || Object.hasOwn(value, 'unmappedRegionIds');
        const catalogMetadataShape = typeof value.catalog === 'string' || typeof value.catalogPath === 'string' || key === 'sourceExcerpts' || key === 'scanVerification';
        const entry = {pointer, collection: record?.collection || null, itemId: record?.id || null, objectKey: key, citationShape: bindingShape ? 'binding-metadata' : referenceShape ? 'page-reference' : catalogMetadataShape ? 'catalog-metadata' : 'citation-like-container', bindingShape, book: value.book || null, pages: Array.isArray(value.pages) ? value.pages : null, printedPage: Number.isInteger(value.printedPage) ? value.printedPage : null, pdfPage: Number.isInteger(value.pdfPage) ? value.pdfPage : null, catalog: value.catalog || value.catalogPath || null, fieldPointer: typeof value.fieldPointer === 'string' ? value.fieldPointer : null, reviewStatus: value.reviewStatus || null, regionIds: Array.isArray(value.regionIds) ? value.regionIds : [], hasEvidenceBindings: Array.isArray(value.evidenceBindings)};
        citationObjects.push(entry);
        if (!bindingShape && Object.hasOwn(books.books, value.book) && ((Array.isArray(value.pages) && value.pages.length > 0) || Number.isInteger(value.printedPage))) genericPages.push(entry);
      }
      if (Array.isArray(value.evidenceBindings)) {
        value.evidenceBindings.forEach((binding, index) => bindings.push({binding, pointer: pointerJoin(pointerJoin(pointer, 'evidenceBindings'), index), attachmentPointer: pointer, record}));
      }
      for (const childKey of Object.keys(value)) walk(value[childKey], pointerJoin(pointer, childKey), childKey, record);
    } else {
      value.forEach((child, index) => walk(child, pointerJoin(pointer, index), String(index), record));
    }
  }
  for (const record of records) walk(record.item, record.pointer, record.id, record);
  // Source registry and release metadata are recursively counted in the JSON-pointer table,
  // but aren't application records and therefore aren't silently promoted to citations here.
  return {citationObjects, bindings, genericPages};
}

export function normalizeRect(raw) {
  if (Array.isArray(raw) && raw.length === 1 && Array.isArray(raw[0]) && raw[0].length === 4 && raw[0].every(Number.isFinite)) return {format: 'xywh-nested', values: raw[0]};
  if (Array.isArray(raw) && raw.length === 4 && raw.every(Number.isFinite)) return {format: 'xywh', values: raw};
  if (raw && typeof raw === 'object') {
    const x = raw.x ?? raw.left ?? raw.x0;
    const y = raw.y ?? raw.top ?? raw.y0;
    const width = raw.width ?? raw.w ?? (Number.isFinite(raw.x1) ? raw.x1 - x : undefined);
    const height = raw.height ?? raw.h ?? (Number.isFinite(raw.y1) ? raw.y1 - y : undefined);
    if ([x, y, width, height].every(Number.isFinite)) return {format: raw.x1 != null || raw.y1 != null ? 'xywh-normalized-from-corners' : 'xywh', values: [x, y, width, height]};
  }
  return null;
}

function recordCitationPages(record, citationObjects) {
  const pages = [];
  for (const ref of citationObjects.filter(entry => entry.collection === record?.collection && entry.itemId === record?.id && !entry.bindingShape)) {
    if (ref.book && ref.pages) for (const page of ref.pages) if (Number.isInteger(page)) pages.push({book: ref.book, printedPage: page, pdfPage: ref.pdfPage || null, source: 'route-record-context', pointer: ref.pointer});
    if (ref.book && Number.isInteger(ref.printedPage)) pages.push({book: ref.book, printedPage: ref.printedPage, pdfPage: ref.pdfPage || null, source: 'route-record-context', pointer: ref.pointer});
  }
  const unique = new Map(pages.map(page => [`${page.book}:${page.printedPage}:${page.pdfPage || ''}:${page.pointer || ''}`, page]));
  return [...unique.values()];
}

function bindingPages(binding) {
  if (!binding?.book) return [];
  const pages = [];
  if (Number.isInteger(binding.printedPage)) pages.push(binding.printedPage);
  if (Array.isArray(binding.sourcePages)) pages.push(...binding.sourcePages.filter(Number.isInteger));
  return [...new Set(pages)].map(printedPage => ({book: binding.book, printedPage, pdfPage: printedPage === binding.printedPage ? binding.pdfPage || null : null, source: 'field-binding', bindingPointer: binding.bindingPointer, routeOwner: binding.routeOwner, sourceOwner: binding.sourceOwner, catalog: binding.selectedOwnerCatalog, fieldPointer: binding.fieldPointer, sourceCategory: binding.sourceCategory}));
}

function regionMatchesBindingPages(region, binding) {
  if (binding.book && region.book !== binding.book) return false;
  const declaredPages = bindingPages(binding);
  if (!declaredPages.length) return true;
  return declaredPages.some(page => page.printedPage === region.printedPage && (!Number.isInteger(page.pdfPage) || page.pdfPage === region.pdfPage));
}

function buildCatalogs(records, reader) {
  const catalogCache = new Map();
  const catalogUsages = [];
  const catalogRegions = [];
  const selectedByOwner = new Map();
  const loadCatalog = catalogPath => {
    if (!safePath(catalogPath)) throw new Error(`Unsafe catalog path: ${catalogPath}`);
    if (!catalogCache.has(catalogPath)) {
      try {
        const bytes = reader(`dist/${catalogPath}`);
        const catalog = JSON.parse(bytes.toString('utf8'));
        catalogCache.set(catalogPath, {catalog, bytesSha256: sha256(bytes), error: null});
      } catch (error) {
        catalogCache.set(catalogPath, {catalog: null, bytesSha256: null, error: error.message});
      }
    }
    return catalogCache.get(catalogPath);
  };
  for (const record of records) {
    const verificationKey = record.item.sourceExcerpts ? 'sourceExcerpts' : record.item.scanVerification ? 'scanVerification' : null;
    const verification = verificationKey ? record.item[verificationKey] : null;
    if (!verification?.catalog) continue;
    const catalogPath = verification.catalog;
    const entry = loadCatalog(catalogPath);
    const catalog = entry.catalog;
    const ownerKey = `${record.collection}:${record.id}`;
    const validPath = validScanCatalogPath(record.id, catalogPath, verification);
    let structuralValid = false;
    let validationError = null;
    if (catalog) {
      const validationItem = record.id === 'progression-explainer' && !record.item.id ? {...record.item, id: record.id} : record.item;
      try { validateScanCatalog(catalog, validationItem, books, verification); structuralValid = true; }
      catch (error) { validationError = error.message; }
    }
    const catalogOwnerMatches = !!catalog && catalog.itemId === record.id && (!catalog.collection || catalog.collection === record.collection);
    const ownerUsage = {ownerKey, collection: record.collection, itemId: record.id, recordPointer: record.pointer, selectedBinding: verificationKey, selectedCatalog: catalogPath, verificationState: verification.state || null, declaredRegionCount: verification.regionCount ?? null, actualRegionCount: catalog?.regions?.length ?? null, catalogBytesSha256: entry.bytesSha256, catalogOwnerMatches, pathValid: validPath, structurallyValid: structuralValid, loadError: entry.error, validationError};
    ownerUsage.declaredRegionCountMatches = ownerUsage.declaredRegionCount == null || ownerUsage.actualRegionCount === ownerUsage.declaredRegionCount;
    ownerUsage.validationCategory = ownerUsage.declaredRegionCountMatches ? structuralValid ? 'valid' : 'catalog-schema-or-metadata-invalid' : 'assembled-declaration-region-count-mismatch';
    catalogUsages.push(ownerUsage);
    selectedByOwner.set(ownerKey, {record, verification, catalogPath, catalog, entry, usage: ownerUsage});
    if (!catalog) continue;
    const seen = new Set();
    catalog.regions.forEach((region, index) => {
      const duplicateId = seen.has(region.id);
      seen.add(region.id);
      const focusRects = Array.isArray(region.focusRects) ? region.focusRects : [];
      const rawSentinels = focusRects.filter(rect => Array.isArray(rect) && rect.length === 4 && rect[0] === 0 && rect[1] === 0 && rect[2] === 1 && rect[3] === 1).length;
      const preciseFocusRects = focusRects.filter(rect => !(Array.isArray(rect) && rect.length === 4 && rect[0] === 0 && rect[1] === 0 && rect[2] === 1 && rect[3] === 1));
      const regionPointer = `${catalogPath}#/regions/${index}`;
      const normalizedCrop = normalizeRect(region.normalizedPageRect);
      const cropCoordinates = normalizedCrop ? {space: 'source-page', origin: 'top-left', units: 'normalized', format: normalizedCrop.format, values: normalizedCrop.values} : region.boundsPdfPoints ? {space: 'source-pdf-page', origin: 'top-left', units: 'points', format: 'x0-y0-x1-y1', values: region.boundsPdfPoints} : region.bounds ? {space: 'source-page-unspecified', origin: 'unspecified', units: 'unspecified', format: 'raw-bounds', values: region.bounds} : null;
      const sourceIdentity = books.resolveRegionSourceIdentity(catalog, region);
      catalogRegions.push({regionPointer, catalog: catalogPath, ownerKey, collection: record.collection, itemId: record.id, index, regionId: region.id, duplicateId, book: region.book || null, printedPage: region.printedPage ?? null, pdfPage: region.pdfPage ?? null, sourceSha256: sourceIdentity?.valid === true ? sourceIdentity.sourceSha256 : null, sourceKind: sourceIdentity?.valid === true ? sourceIdentity.sourceKind : null, sourceArtifactId: sourceIdentity?.valid === true ? sourceIdentity.sourceArtifactId || null : null, canonicalPdfSha256: sourceIdentity?.valid === true ? sourceIdentity.canonicalPdfSha256 || null : null, sourceIdentityValid: sourceIdentity?.valid === true, image: region.image || null, imageSha256: region.sha256 || null, imageWidth: region.width || null, imageHeight: region.height || null, verificationScope: region.verificationScope || null, verification: region.verification || null, normalizedPageRect: normalizedCrop, cropCoordinates, focusCoordinates: focusRects.map((rect, rectIndex) => ({space: 'excerpt-image', origin: 'top-left', units: 'normalized', format: 'xywh', rectIndex, values: rect})), rawBounds: region.boundsPdfPoints || region.bounds || region.normalizedPageRect || null, focusRectCount: focusRects.length, focusRects, rawFullImageSentinelCount: rawSentinels, preciseFocusRectCount: preciseFocusRects.length, missingPreciseFocus: preciseFocusRects.length === 0, sourceBoundCoordinates: cropCoordinates != null});
    });
  }
  return {catalogUsages, catalogRegions, selectedByOwner, loadCatalog};
}

function buildBindingAudit(bindingEntries, ownerIndex, catalogIndex) {
  const audits = [];
  const bindingsByRecordField = new Map();
  for (const entry of bindingEntries) {
    const binding = {...entry.binding, __pointer: entry.pointer};
    const routeCollection = binding.collection || entry.record?.collection || null;
    const routeId = binding.itemId || entry.record?.id || null;
    const routeOwners = ownerIndex.get(`${routeCollection}:${routeId}`) || [];
    const routeRecord = routeOwners.length === 1 ? routeOwners[0] : null;
    const explicitOwner = Object.hasOwn(binding, 'sourceOwner') ? (binding.sourceOwner && typeof binding.sourceOwner === 'object' ? binding.sourceOwner : {}) : null;
    const sourceCollection = explicitOwner ? explicitOwner.collection : routeCollection;
    const sourceId = explicitOwner ? explicitOwner.itemId : routeId;
    const sourceOwners = ownerIndex.get(`${sourceCollection}:${sourceId}`) || [];
    const sourceRecord = sourceOwners.length === 1 ? sourceOwners[0] : null;
    const sourceCatalog = sourceRecord ? catalogIndex.selectedByOwner.get(`${sourceRecord.collection}:${sourceRecord.id}`) : null;
    const targetCatalog = binding.catalog || null;
    const catalogMatches = !!sourceCatalog && !!targetCatalog && targetCatalog === sourceCatalog.catalogPath;
    const bindingIds = [...new Set((Array.isArray(binding.regionIds) ? binding.regionIds : []).filter(id => typeof id === 'string'))];
    const pendingUnmappedRegionIds = [...new Set((Array.isArray(binding.unmappedRegionIds) ? binding.unmappedRegionIds : []).filter(id => typeof id === 'string'))];
    const regions = sourceCatalog?.catalog?.regions || [];
    const byId = new Map(regions.map(region => [region.id, region]));
    const fieldPointer = typeof binding.fieldPointer === 'string' ? binding.fieldPointer : null;
    const fieldPointerResult = routeRecord && fieldPointer !== null ? resolvePointer(routeRecord.item, fieldPointer) : {exists: false};
    const sourceObjectPointer = typeof binding.sourceObjectPointer === 'string' ? binding.sourceObjectPointer : null;
    const sourceObjectResult = routeRecord && sourceObjectPointer !== null ? resolvePointer(routeRecord.item, sourceObjectPointer) : {exists: false};
    const attachmentRelativePointer = routeRecord && entry.record?.pointer === routeRecord.pointer
      ? entry.attachmentPointer === routeRecord.pointer
        ? ''
        : entry.attachmentPointer?.startsWith(`${routeRecord.pointer}/`)
          ? entry.attachmentPointer.slice(routeRecord.pointer.length)
          : null
      : null;
    const sourceObjectStructured = sourceObjectResult.exists && sourceObjectResult.value !== null && typeof sourceObjectResult.value === 'object' && !Array.isArray(sourceObjectResult.value);
    const sourceObjectPointerMatchesAttachment = sourceObjectStructured && attachmentRelativePointer !== null && sourceObjectPointer === attachmentRelativePointer;
    const valuePathStatus = binding.valuePathStatus || null;
    const idChecks = bindingIds.map(regionId => {
      const region = byId.get(regionId);
      if (!region) return {regionId, state: 'out-of-selected-catalog'};
      const pageMatches = regionMatchesBindingPages(region, binding);
      return {regionId, state: pageMatches ? 'resolved' : 'source-page-mismatch', book: region.book, printedPage: region.printedPage, pdfPage: region.pdfPage};
    });
    const structuralIssues = [];
    if (!routeRecord || routeOwners.length > 1) structuralIssues.push(routeOwners.length > 1 ? 'ambiguous-route-owner' : 'route-owner-missing');
    if (!sourceRecord || sourceOwners.length > 1) structuralIssues.push(sourceOwners.length > 1 ? 'ambiguous-source-owner' : 'source-owner-missing');
    if (sourceRecord && (!sourceCatalog || !sourceCatalog.catalog)) structuralIssues.push('selected-owner-catalog-missing');
    if (targetCatalog && sourceCatalog && !catalogMatches) structuralIssues.push('catalog-owner-mismatch');
    if (!targetCatalog && REVIEWED_TARGET_STATUSES.has(binding.reviewStatus)) structuralIssues.push('reviewed-binding-catalog-missing');
    if (typeof sourceObjectPointer !== 'string' || !sourceObjectResult.exists) structuralIssues.push('source-object-pointer-missing');
    else if (!sourceObjectStructured) structuralIssues.push('source-object-pointer-not-structured');
    else if (entry.record?.pointer !== routeRecord?.pointer) structuralIssues.push('source-object-owner-mismatch');
    else if (!sourceObjectPointerMatchesAttachment) structuralIssues.push('source-object-pointer-mismatch');
    const extractionPending = valuePathStatus === 'value-path-missing' && !fieldPointerResult.exists && !REVIEWED_TARGET_STATUSES.has(binding.reviewStatus);
    if (fieldPointer === null && REVIEWED_TARGET_STATUSES.has(binding.reviewStatus)) structuralIssues.push('field-pointer-missing');
    else if (fieldPointer !== null && !fieldPointerResult.exists && !extractionPending) structuralIssues.push('field-pointer-missing');
    if (valuePathStatus === 'value-path-missing' && fieldPointerResult.exists) structuralIssues.push('value-path-status-conflicts-with-data');
    if (idChecks.some(check => check.state === 'out-of-selected-catalog')) structuralIssues.push('stale-or-unmapped-region-id');
    if (idChecks.some(check => check.state === 'source-page-mismatch')) structuralIssues.push('region-source-page-mismatch');
    let targetStatus;
    if (structuralIssues.includes('ambiguous-route-owner')) targetStatus = 'ambiguous-route-owner';
    else if (structuralIssues.includes('route-owner-missing')) targetStatus = 'route-owner-missing';
    else if (structuralIssues.includes('ambiguous-source-owner')) targetStatus = 'ambiguous-source-owner';
    else if (structuralIssues.includes('source-owner-missing')) targetStatus = 'source-owner-missing';
    else if (structuralIssues.includes('selected-owner-catalog-missing')) targetStatus = 'selected-catalog-missing';
    else if (structuralIssues.includes('catalog-owner-mismatch')) targetStatus = 'catalog-owner-mismatch';
    else if (structuralIssues.includes('reviewed-binding-catalog-missing')) targetStatus = 'reviewed-binding-catalog-missing';
    else if (structuralIssues.includes('source-object-pointer-missing')) targetStatus = 'source-object-pointer-missing';
    else if (structuralIssues.includes('source-object-pointer-not-structured')) targetStatus = 'source-object-pointer-not-structured';
    else if (structuralIssues.includes('source-object-owner-mismatch')) targetStatus = 'source-object-owner-mismatch';
    else if (structuralIssues.includes('source-object-pointer-mismatch')) targetStatus = 'source-object-pointer-mismatch';
    else if (structuralIssues.includes('value-path-status-conflicts-with-data')) targetStatus = 'value-path-status-conflicts-with-data';
    else if (extractionPending) targetStatus = 'value-path-missing-pending-extraction';
    else if (structuralIssues.includes('field-pointer-missing')) targetStatus = 'field-pointer-missing';
    else if (structuralIssues.includes('stale-or-unmapped-region-id')) targetStatus = 'stale-or-unmapped-region-id';
    else if (structuralIssues.includes('region-source-page-mismatch')) targetStatus = 'region-source-page-mismatch';
    else if (!bindingIds.length) targetStatus = pendingUnmappedRegionIds.length ? 'region-ids-explicitly-unmapped-pending' : 'empty-region-target';
    else if (!REVIEWED_TARGET_STATUSES.has(binding.reviewStatus)) targetStatus = 'region-resolved-field-review-pending';
    else targetStatus = fieldPointer === '' || fieldPointer === null ? 'record-target-resolved' : 'field-target-resolved';
    let auditClass = 'not-assessable';
    const uncertainIssues = structuralIssues.filter(issue => issue.startsWith('ambiguous-'));
    const confirmedIssues = structuralIssues.filter(issue => !issue.startsWith('ambiguous-'));
    if (confirmedIssues.length) auditClass = 'confirmed';
    else if (['record-target-resolved', 'field-target-resolved'].includes(targetStatus)) auditClass = 'confirmed';
    else if (['empty-region-target', 'region-ids-explicitly-unmapped-pending', 'region-resolved-field-review-pending', 'value-path-missing-pending-extraction'].includes(targetStatus)) auditClass = 'candidate';
    else if (uncertainIssues.length || targetStatus.startsWith('ambiguous')) auditClass = 'uncertain';
    const audit = {bindingPointer: entry.pointer, attachmentPointer: entry.attachmentPointer, attachmentRelativePointer, sourceCategory: binding.sourceCategory || null, sourceObject: binding.sourceObject || null, routeOwner: routeRecord ? {collection: routeRecord.collection, itemId: routeRecord.id, recordPointer: routeRecord.pointer, resolved: true} : {collection: routeCollection, itemId: routeId, resolved: false}, sourceOwner: sourceRecord ? {collection: sourceRecord.collection, itemId: sourceRecord.id, recordPointer: sourceRecord.pointer, resolved: true, explicit: !!explicitOwner} : {collection: sourceCollection, itemId: sourceId, resolved: false, explicit: !!explicitOwner}, fieldPointer, fieldPointerExists: fieldPointer !== null ? fieldPointerResult.exists : null, valuePathStatus, sourceObjectPointer, sourceObjectPointerExists: typeof sourceObjectPointer === 'string' ? sourceObjectResult.exists : null, sourceObjectPointerStructured: sourceObjectResult.exists ? sourceObjectStructured : null, sourceObjectPointerMatchesAttachment, sourceValueStatus: binding.sourceValueStatus || null, valueReview: binding.valueReview || null, reviewStatus: binding.reviewStatus || null, contextStatus: binding.contextStatus || null, book: binding.book || null, printedPage: binding.printedPage ?? null, pdfPage: binding.pdfPage ?? null, bindingCatalog: targetCatalog, selectedOwnerCatalog: sourceCatalog?.catalogPath || null, catalogMatchesSelectedOwner: targetCatalog ? catalogMatches : null, requestedRegionIds: bindingIds, pendingUnmappedRegionIds, regionChecks: idChecks, structuralIssues, targetStatus, auditClass, coordinateSpace: binding.coordinateSpace || null, cropCoordinates: binding.cropCoordinates || [], highlightCoordinates: binding.highlightCoordinates || [], sourcePages: binding.sourcePages || []};
    audits.push(audit);
    if (routeCollection && routeId && fieldPointer !== null) {
      const key = `${routeCollection}:${routeId}:${fieldPointer}`;
      bindingsByRecordField.set(key, [...(bindingsByRecordField.get(key) || []), audit]);
    }
  }
  return {audits, bindingsByRecordField};
}

function buildPageTargetAudit(pageReferences, catalogIndex) {
  const targets = [];
  const counts = {};
  const classes = Object.fromEntries(Object.keys(CLASS_CODES).map(key => [key, 0]));
  for (const reference of pageReferences) {
    const ownerKey = reference.collection && reference.itemId ? `${reference.collection}:${reference.itemId}` : null;
    const selected = ownerKey ? catalogIndex.selectedByOwner.get(ownerKey) : null;
    const pages = [...new Set([...(reference.pages || []), ...(Number.isInteger(reference.printedPage) ? [reference.printedPage] : [])])];
    const regions = selected?.catalog?.regions || [];
    const pageCandidates = pages.flatMap(page => regions.filter(region => region.book === reference.book && region.printedPage === page).map(region => ({page, regionId: region.id, catalog: selected.catalogPath})));
    const explicitIds = reference.regionIds || [];
    const explicitChecks = explicitIds.map(regionId => {
      const region = regions.find(candidate => candidate.id === regionId);
      return {regionId, state: !region ? 'out-of-selected-catalog' : region.book === reference.book && (!pages.length || pages.includes(region.printedPage)) ? 'resolved' : 'source-page-mismatch'};
    });
    let targetStatus;
    let auditClass;
    if (explicitChecks.some(check => check.state !== 'resolved')) { targetStatus = explicitChecks.some(check => check.state === 'out-of-selected-catalog') ? 'stale-or-unmapped-region-id' : 'region-source-page-mismatch'; auditClass = 'confirmed'; }
    else if (explicitChecks.length) { targetStatus = typeof reference.fieldPointer === 'string' && reference.fieldPointer.length > 0 ? 'field-target-region-present' : 'region-target-present-without-field-pointer'; auditClass = REVIEWED_TARGET_STATUSES.has(reference.reviewStatus) ? 'confirmed' : 'uncertain'; }
    else if (!selected?.catalog) { targetStatus = 'source-only-no-selected-owner-catalog'; auditClass = 'not-assessable'; }
    else if (!pages.length || !pageCandidates.length) { targetStatus = 'source-only-page-without-region'; auditClass = 'not-assessable'; }
    else if (typeof reference.fieldPointer === 'string' && reference.fieldPointer.length > 0) { targetStatus = 'field-page-reference-with-region-pending'; auditClass = 'candidate'; }
    else if (pages.some(page => regions.filter(region => region.book === reference.book && region.printedPage === page).length > 1)) { targetStatus = 'source-only-ambiguous-page'; auditClass = 'uncertain'; }
    else { targetStatus = 'source-only-page-reference'; auditClass = 'candidate'; }
    counts[targetStatus] = (counts[targetStatus] || 0) + 1;
    classes[auditClass]++;
    targets.push({pointer: reference.pointer, collection: reference.collection, itemId: reference.itemId, book: reference.book, pages, fieldPointer: reference.fieldPointer, catalog: selected?.catalogPath || null, targetStatus, auditClass, explicitRegionChecks: explicitChecks, genericPageRegionCandidates: pageCandidates});
  }
  return {denominator: targets.length, targetStatusCounts: counts, classification: classes, targets};
}

function fieldFactCoverage(records, bindingAudit) {
  const facts = [];
  for (const record of records) {
    const fields = record.item.fields;
    if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
      for (const key of Object.keys(fields)) {
        const pointer = pointerJoin(pointerJoin(record.pointer, 'fields'), key);
        const fieldPointer = `/fields/${esc(key)}`;
        const matches = bindingAudit.bindingsByRecordField.get(`${record.collection}:${record.id}:${fieldPointer}`) || [];
        facts.push({collection: record.collection, itemId: record.id, recordPointer: record.pointer, pointer, fieldPointer, fieldLabel: key, factKind: 'fields-property', targetStatus: matches.length ? matches.some(x => x.targetStatus === 'field-target-resolved') ? 'field-target-resolved' : matches.map(x => x.targetStatus).join('|') : 'no-direct-field-binding', auditClass: matches.length ? matches.every(x => x.auditClass === 'confirmed') ? 'confirmed' : matches.some(x => x.auditClass === 'candidate') ? 'candidate' : 'uncertain' : 'not-assessable', bindingPointers: matches.map(x => x.bindingPointer)});
      }
    }
    if (Object.hasOwn(record.item, 'price')) {
      const pointer = pointerJoin(record.pointer, 'price');
      const matches = bindingAudit.bindingsByRecordField.get(`${record.collection}:${record.id}:/price`) || [];
      facts.push({collection: record.collection, itemId: record.id, recordPointer: record.pointer, pointer, fieldPointer: '/price', fieldLabel: 'price', factKind: 'price-property', targetStatus: matches.length ? matches.some(x => x.targetStatus === 'field-target-resolved') ? 'field-target-resolved' : matches.map(x => x.targetStatus).join('|') : 'no-direct-field-binding', auditClass: matches.length ? matches.every(x => x.auditClass === 'confirmed') ? 'confirmed' : matches.some(x => x.auditClass === 'candidate') ? 'candidate' : 'uncertain' : 'not-assessable', bindingPointers: matches.map(x => x.bindingPointer)});
    }
  }
  const classification = Object.fromEntries(Object.keys(CLASS_CODES).map(key => [key, 0]));
  for (const fact of facts) classification[fact.auditClass]++;
  return {denominator: facts.length, classification, facts};
}

function moneyClaims(tree, records, allArrayRecords, bindingAudit, citationObjects, catalogIndex, catalogRegions) {
  const recordByPointer = new Map(allArrayRecords.map(record => [record.pointer, record]));
  for (const record of records) recordByPointer.set(record.pointer, record);
  const claims = [];
  for (const candidate of tree.moneyLike) {
    const record = candidate.recordPointer ? recordByPointer.get(candidate.recordPointer) : null;
    const bindingMatches = record ? bindingAudit.audits.filter(binding => binding.routeOwner.collection === record.collection && binding.routeOwner.itemId === record.id && binding.fieldPointer !== null && (binding.fieldPointer === '' ? candidate.pointer === record.pointer : candidate.pointer === `${record.pointer}${binding.fieldPointer}` || candidate.pointer.startsWith(`${record.pointer}${binding.fieldPointer}/`))) : [];
    const fieldBindingPages = bindingMatches.flatMap(bindingPages);
    const routeRecordContextPages = recordCitationPages(record, citationObjects);
    const allAvailableSourcePages = [...fieldBindingPages, ...routeRecordContextPages];
    const sources = allAvailableSourcePages;
    const candidateRegionRefs = [];
    const sourceBindingResults = [];
    if (bindingMatches.length) {
      for (const binding of bindingMatches) {
        const sourceOwnerKey = binding.sourceOwner?.resolved ? `${binding.sourceOwner.collection}:${binding.sourceOwner.itemId}` : null;
        const sourceCatalog = sourceOwnerKey ? catalogIndex.selectedByOwner.get(sourceOwnerKey) : null;
        const selectedCatalogPath = sourceCatalog?.catalogPath || null;
        const catalogIdentityValid = !!sourceCatalog?.catalog && (!binding.bindingCatalog || binding.bindingCatalog === selectedCatalogPath);
        const pages = bindingPages(binding);
        let targetRegionRefs = [];
        let possiblePageRegionRefs = [];
        if (catalogIdentityValid && binding.requestedRegionIds.length) {
          targetRegionRefs = binding.requestedRegionIds.map(regionId => catalogRegions.find(region => region.ownerKey === sourceOwnerKey && region.regionId === regionId)).filter(region => region && regionMatchesBindingPages(region, binding));
          for (const region of targetRegionRefs) candidateRegionRefs.push({regionPointer: region.regionPointer, regionId: region.regionId, catalog: region.catalog, ownerKey: region.ownerKey, collection: region.collection, itemId: region.itemId, book: region.book, printedPage: region.printedPage, coordinateReference: region.normalizedPageRect ? 'regionInventory.normalizedPageRect' : region.cropCoordinates ? 'regionInventory.cropCoordinates' : null, focusReference: 'regionInventory.focusCoordinates', bindingPointer: binding.bindingPointer, relation: 'field-binding-region'});
        } else if (catalogIdentityValid && pages.length) {
          for (const page of pages) {
            possiblePageRegionRefs.push(...catalogRegions.filter(region => region.ownerKey === sourceOwnerKey && region.book === page.book && region.printedPage === page.printedPage));
          }
          for (const region of possiblePageRegionRefs) candidateRegionRefs.push({regionPointer: region.regionPointer, regionId: region.regionId, catalog: region.catalog, ownerKey: region.ownerKey, collection: region.collection, itemId: region.itemId, book: region.book, printedPage: region.printedPage, coordinateReference: region.normalizedPageRect ? 'regionInventory.normalizedPageRect' : region.cropCoordinates ? 'regionInventory.cropCoordinates' : null, focusReference: 'regionInventory.focusCoordinates', bindingPointer: binding.bindingPointer, relation: 'field-page-possibility-unbound'});
        }
        sourceBindingResults.push({bindingPointer: binding.bindingPointer, routeOwner: binding.routeOwner, sourceOwner: binding.sourceOwner, sourceCategory: binding.sourceCategory, reviewStatus: binding.reviewStatus, sourceValueStatus: binding.sourceValueStatus || null, selectedOwnerCatalog: selectedCatalogPath, bindingCatalog: binding.bindingCatalog, catalogIdentityValid, pages, requestedRegionIds: binding.requestedRegionIds, resolvedTargetRegionIds: targetRegionRefs.map(region => region.regionId), possiblePageRegionIds: possiblePageRegionRefs.map(region => region.regionId), targetStatus: binding.targetStatus});
      }
    } else if (record) {
      const routeOwnerKey = `${record.collection}:${record.id}`;
      const routeCatalog = catalogIndex.selectedByOwner.get(routeOwnerKey);
      for (const page of routeRecordContextPages) {
        for (const region of catalogRegions.filter(candidate => candidate.ownerKey === routeOwnerKey && candidate.book === page.book && candidate.printedPage === page.printedPage)) candidateRegionRefs.push({regionPointer: region.regionPointer, regionId: region.regionId, catalog: region.catalog, ownerKey: region.ownerKey, collection: region.collection, itemId: region.itemId, book: region.book, printedPage: region.printedPage, coordinateReference: region.normalizedPageRect ? 'regionInventory.normalizedPageRect' : region.cropCoordinates ? 'regionInventory.cropCoordinates' : null, focusReference: 'regionInventory.focusCoordinates', relation: 'route-record-page-possibility-not-field-bound'});
      }
      sourceBindingResults.push({bindingPointer: null, routeOwner: {collection: record.collection, itemId: record.id}, sourceOwner: {collection: record.collection, itemId: record.id, explicit: false}, selectedOwnerCatalog: routeCatalog?.catalogPath || null, pages: routeRecordContextPages, targetStatus: 'source-only-page-reference'});
    }
    const hasBoundRegion = sourceBindingResults.some(result => result.resolvedTargetRegionIds?.length);
    const hasOwnerPagePossibility = sourceBindingResults.some(result => result.possiblePageRegionIds?.length);
    const hasGenericRoutePossibility = !bindingMatches.length && candidateRegionRefs.length > 0;
    const targetRelation = hasBoundRegion ? 'field-target-region-reference-present' : hasOwnerPagePossibility ? 'field-page-region-possibilities-unbound' : hasGenericRoutePossibility ? 'route-page-regions-unbound' : bindingMatches.length ? sourceBindingResults.map(result => result.targetStatus).join('|') : 'not-bound';
    const rawValue = typeof candidate.rawValue === 'string' || typeof candidate.rawValue !== 'object' || candidate.rawValue === null
      ? candidate.rawValue
      : {amount: candidate.rawValue.amount ?? null, currency: candidate.rawValue.currency ?? null, ...(Object.hasOwn(candidate.rawValue, 'unit') ? {unit: candidate.rawValue.unit} : {})};
    const rangeLike = typeof rawValue === 'string' && MONEY_RANGE_TEXT.test(rawValue);
    const parsedPrice = rangeLike ? null : parseExactPrice(rawValue) || (candidate.textMatches?.length === 1 ? parseExactPrice(candidate.textMatches[0]) : null);
    const encumbranceOnly = candidate.encumbranceMatches?.length > 0 && candidate.currencyMatches?.length === 0;
    const valueReviewChecks = bindingMatches
      .filter(binding => !encumbranceOnly && binding.routeOwner.collection === 'equipment' && binding.fieldPointer === '/price' && binding.sourceValueStatus === 'source-value-independently-confirmed')
      .map(binding => ({bindingPointer: binding.bindingPointer, ...comparePriceValueSnapshot(rawValue, binding.valueReview)}));
    const valueReviewBindings = valueReviewChecks.filter(check => check.matches);
    const staleValueReviewBindings = valueReviewChecks.filter(check => !check.matches);
    const hasManualValueStatus = valueReviewBindings.length > 0;
    const valueReviewStatus = hasManualValueStatus
      ? 'source-value-independently-confirmed'
      : staleValueReviewBindings.some(check => check.status === 'snapshot-mismatch')
        ? 'source-value-review-snapshot-mismatch'
        : staleValueReviewBindings.length
          ? 'source-value-review-snapshot-missing'
          : 'no-independent-source-value-status';
    let auditClass = encumbranceOnly || rangeLike ? 'candidate' : hasManualValueStatus ? 'confirmed' : candidate.textMatches?.length || parsedPrice ? 'candidate' : 'uncertain';
    const sourceAssessability = !sources.length ? 'not-assessable-no-cited-source-pages' : hasBoundRegion ? 'field-target-region-reference-present' : hasOwnerPagePossibility ? 'source-owner-page-region-possibilities-not-field-bound' : hasGenericRoutePossibility ? 'route-record-page-region-possibilities-not-field-bound' : 'source-pages-known-no-region-reference';
    claims.push({collection: record?.collection || null, itemId: record?.id || null, pointer: buildMoneyPointer(candidate, record), propertyKey: candidate.key, candidateKind: encumbranceOnly ? 'nonmonetary-encumbrance-text' : rangeLike ? 'currency-text-range' : candidate.structured ? 'structured-price-object' : candidate.textMatches?.length ? 'currency-text' : 'money-like-property-name', monetaryInterpretation: encumbranceOnly ? 'nonmonetary-encumbrance' : rangeLike ? 'unresolved-money-range-candidate' : valueReviewStatus === 'source-value-review-snapshot-mismatch' ? 'stale-value-review-snapshot' : 'unresolved-money-like-candidate', rawValue, rangeLike, parsedPrice: encumbranceOnly || rangeLike ? null : parsedPrice, matchedCurrencyText: candidate.textMatches || [], currencyMatchSpans: candidate.currencyMatches || [], encumbranceUnitMatches: candidate.encumbranceMatches || [], auditClass, valueReviewStatus, valueReviewBindingPointers: valueReviewBindings.map(check => check.bindingPointer), staleValueReviewBindingPointers: staleValueReviewBindings.map(check => check.bindingPointer), valueReviewSnapshotChecks: valueReviewChecks, valueReviewSnapshotDrift: staleValueReviewBindings.filter(check => check.status === 'snapshot-mismatch').map(check => ({bindingPointer: check.bindingPointer, expected: check.expected, actual: check.actual, mismatchFields: check.mismatchFields})), sourceAssessability, bindingPointers: bindingMatches.map(binding => binding.bindingPointer), reviewStatuses: bindingMatches.map(binding => binding.reviewStatus), sourceValueStatuses: bindingMatches.map(binding => binding.sourceValueStatus || null), bindingGeometry: bindingMatches.map(binding => ({bindingPointer: binding.bindingPointer, coordinateSpace: binding.coordinateSpace, cropCoordinates: binding.cropCoordinates, highlightCoordinates: binding.highlightCoordinates})), availableCitedSourcePages: fieldBindingPages, allAvailableSourcePages, routeRecordContextPages, sourceBindingResults, candidateRegionRefs, targetRelation});
  }
  const classification = Object.fromEntries(Object.keys(CLASS_CODES).map(key => [key, 0]));
  const assessability = {};
  const byCollection = {};
  for (const claim of claims) {
    classification[claim.auditClass]++;
    assessability[claim.sourceAssessability] = (assessability[claim.sourceAssessability] || 0) + 1;
    const collection = claim.collection || 'unowned-root-property';
    byCollection[collection] ||= {count: 0, byCandidateKind: {}, byClassification: Object.fromEntries(Object.keys(CLASS_CODES).map(key => [key, 0]))};
    byCollection[collection].count++;
    byCollection[collection].byCandidateKind[claim.candidateKind] = (byCollection[collection].byCandidateKind[claim.candidateKind] || 0) + 1;
    byCollection[collection].byClassification[claim.auditClass]++;
  }
  return {denominator: claims.length, classification, byCollection, sourceAssessability: assessability, classificationBasis: 'confirmed means an equipment /price evidence binding carries the independent source-value status and an equipment-printed-price expectedValue snapshot whose amount, currency, and unit match the current field; candidate means a structured or textual money-like claim without a matching snapshot; uncertain means a monetary-key candidate could not be parsed; none of these alone confirms broader semantic correctness.', claims};
}

function buildManualCoverage({data, records, catalogRegions, reader, current}) {
  const contextPath = 'research/citation-context-contracts.json';
  const continuationPath = 'research/citation-continuations.json';
  const qualifierPath = 'research/citation-regression-calibration.json';
  let context = {available: false, status: 'not-assessable', annotatedRequirements: 0, matchedRegionRequirements: 0, checks: []};
  let continuation = {available: false, status: 'not-assessable', knownGroups: 0, knownSegments: 0, states: {}};
  let qualifiers = {available: false, status: 'not-assessable', manuallyAnnotatedCases: 0, contractScope: 'No corpus-wide qualifier-dependency annotation is encoded; absence cannot be inferred.'};
  const readJson = file => JSON.parse(reader(file).toString('utf8'));
  try {
    const manifest = readJson(contextPath);
    const checks = reportContextContracts(data, catalogPath => JSON.parse(reader(`dist/${catalogPath}`).toString('utf8')), manifest);
    const outcomeCounts = {};
    for (const item of checks.checks) outcomeCounts[item.status] = (outcomeCounts[item.status] || 0) + 1;
    const matched = new Set(checks.checks.filter(item => item.status === 'contains-required-context' || item.status === 'context-clipped').map(item => `${item.collection}:${item.itemId}:${item.catalog}:${item.regionId}`));
    const contained = new Set(checks.checks.filter(item => item.status === 'contains-required-context').map(item => `${item.collection}:${item.itemId}:${item.catalog}:${item.regionId}`));
    context = {available: true, status: 'structural-only', scope: manifest.scope, annotatedRequirements: checks.total, matchedRegionRequirements: matched.size, containedRegionRequirements: contained.size, requirementOutcomeCounts: outcomeCounts, checks: checks.checks.map(item => ({id: item.id, collection: item.collection, itemId: item.itemId, fieldPointer: item.fieldPointer, catalog: item.catalog, regionId: item.regionId, status: item.status, reason: item.reason}))};
  } catch (error) { context.error = error.message; }
  try {
    const manifest = readJson(continuationPath);
    const stateCounts = {};
    for (const group of manifest.groups || []) {
      for (const segment of group.segments || []) stateCounts[segment.state] = (stateCounts[segment.state] || 0) + 1;
    }
    let validation = null;
    if (current) {
      try { validation = validateContinuationManifest(manifest, {data: current, catalogRoot: path.resolve(root, 'dist')}); }
      catch (error) { validation = {valid: false, error: error.message}; }
    }
    const ordering = reportContinuationOrder(manifest, catalog => reader(`dist/${catalog}`));
    continuation = {available: true, status: 'known-cases-only', scope: manifest.scope, knownGroups: manifest.groups?.length || 0, knownSegments: (manifest.groups || []).reduce((sum, group) => sum + (group.segments || []).length, 0), states: stateCounts, groups: (manifest.groups || []).map(group => ({id: group.id, collection: group.collection, itemId: group.itemId, catalog: group.catalog, status: group.status, source: group.source, segments: (group.segments || []).map(segment => ({regionId: segment.regionId, book: segment.book, printedPage: segment.printedPage, pdfPage: segment.pdfPage, state: segment.state, order: segment.order}))})), ordering, validation};
  } catch (error) { continuation.error = error.message; }
  try {
    const manifest = readJson(qualifierPath);
    qualifiers = {available: true, status: 'known-cases-only', manuallyAnnotatedCases: manifest.qualifierFocusCases?.length || 0, caseIds: (manifest.qualifierFocusCases || []).map(item => item.id), cases: manifest.qualifierFocusCases || [], contractScope: 'Only manually annotated dependency cases in this regression manifest are counted; no automatic semantic discovery or corpus-wide qualifier denominator exists.', fieldBindingDenominator: null, notAssessableReason: 'For field bindings without an explicit qualifier dependency annotation, qualifier necessity and completeness are not assessable from structure alone.'};
  } catch (error) { qualifiers.error = error.message; }
  const annotatedRegionIds = new Set(context.checks.map(item => `${item.catalog}:${item.regionId}`));
  const regionContextCounts = {annotated: 0, notAssessable: 0, containsRequiredContext: 0, contextClipped: 0};
  for (const region of catalogRegions) {
    if (annotatedRegionIds.has(`${region.catalog}:${region.regionId}`)) regionContextCounts.annotated++;
    else regionContextCounts.notAssessable++;
  }
  regionContextCounts.containsRequiredContext = context.containedRegionRequirements || 0;
  regionContextCounts.contextClipped = Math.max(0, (context.matchedRegionRequirements || 0) - regionContextCounts.containsRequiredContext);
  return {context, contextRegionCoverage: {denominator: catalogRegions.length, ...regionContextCounts, interpretation: 'Annotated counts identify reviewed contract coverage; containment passes and clipped results are reported separately. Unannotated regions are not-assessable, not passed.'}, continuation, qualifiers};
}

function buildSemanticReviewUniverse(records, treeNodes, factCoverage, money, bindingAudit, manual) {
  const recordPointers = records.map(record => record.pointer);
  const isContentPointer = pointer => recordPointers.some(recordPointer => pointer === recordPointer || pointer.startsWith(`${recordPointer}/`));
  const contentNodeCount = treeNodes.filter(tuple => isContentPointer(tuple[0])).length;
  const extractionOverrides = bindingAudit.audits
    .filter(binding => binding.valuePathStatus || binding.sourceValueStatus)
    .map(binding => ({bindingPointer: binding.bindingPointer, routeOwner: binding.routeOwner, fieldPointer: binding.fieldPointer, valuePathStatus: binding.valuePathStatus || null, sourceValueStatus: binding.sourceValueStatus || null, reviewStatus: binding.reviewStatus || null, interpretation: binding.sourceValueStatus === 'source-value-independently-confirmed' ? 'source value review only; does not prove extraction completeness or contextual adequacy' : binding.valuePathStatus === 'value-path-missing' ? 'explicit extraction-pending state; not a completed value' : 'explicit status with no broader semantic inference'}));
  return {
    scope: 'Sparse rule and pointer-index mapping over every JSON node rooted in every exposed content record. Each listed obligation dimension defaults to unresolved/not-assessable; exact annotations are surfaced as scoped overrides, never expanded to unrelated properties.',
    denominator: contentNodeCount,
    pointerIndex: {source: 'jsonTree.nodes', tupleSchema: ['jsonPointer', 'kindCode', 'semanticRoleCode', 'inventoryClassificationCode'], selectionRule: 'Include a tuple when its JSON Pointer equals or descends from any recordPointers[].pointer. This preserves an exact pointer for every node without duplicating dimension status on each tuple.'},
    contentRecordPointers: recordPointers,
    defaultDimensionStates: {sourceValueSupport: 'not-assessable', contextualAdequacy: 'not-assessable', continuationCompleteness: 'not-assessable', qualifierCompleteness: 'not-assessable', extractionCompleteness: 'not-assessable'},
    scopedOverrides: {
      contextContracts: {status: 'annotated-obligations-only', denominator: manual.context.annotatedRequirements || 0, requirements: manual.context.checks || [], interpretation: 'A contains-required-context result satisfies only the manually declared geometric containment contract; clipped/unavailable states remain visible, and no annotation is generalized to other fields or regions.'},
      continuationContracts: {status: 'known-cases-only', groups: manual.continuation.groups || [], validation: manual.continuation.validation || null},
      qualifierContracts: {status: 'known-cases-only', cases: manual.qualifiers.cases || []},
      extractionAndValueStatuses: {status: 'explicit-binding-statuses-only', bindings: extractionOverrides},
    },
    narrowerStructuredFieldTargetSubset: {denominator: factCoverage.denominator, pointerReference: 'structuredFieldTargetCoverage.facts in the full report; it covers explicit /fields/* plus /price slots only, not the full mechanics-audit universe or every scalar value.', pinnedGitBaselineComparators: {structuredFieldTargetSlots: 4820, mechanicsAuditFields: 13193, scalarAndNullLeaves: 34280, interpretation: 'These are distinct denominators. The 4,820 explicit field/price slots are a narrower UI-target subset, not all 13,193 mechanics-audit fields or all 34,280 scalar/null leaves.'}},
    moneyCandidateSubset: {denominator: money.denominator, pointerReference: 'moneyLikeProperties.claims', classification: money.classification},
    inventoryClassMeaning: 'Node classes are syntactic inventory categories. A metadata or citation-metadata node marked not-assessable says nothing about whether its name, label, or fact is semantically correct. No node-level class is a semantic source verification.'
  };
}

function structuralValidation({bindingAudits, pageTargetAudit, catalogUsages}) {
  const failures = [];
  const unresolved = [];
  const push = (scope, pointer, code, details = {}) => failures.push({scope, pointer, code, ...details});
  for (const catalog of catalogUsages) {
    if (!catalog.pathValid) push('selected-owner-catalog', catalog.recordPointer, 'unsafe-or-invalid-catalog-path', {catalog: catalog.selectedCatalog});
    if (catalog.loadError || catalog.actualRegionCount == null) push('selected-owner-catalog', catalog.recordPointer, 'selected-catalog-unavailable', {catalog: catalog.selectedCatalog, error: catalog.loadError});
    if (!catalog.catalogOwnerMatches) push('selected-owner-catalog', catalog.recordPointer, 'catalog-owner-mismatch', {catalog: catalog.selectedCatalog, itemId: catalog.itemId, collection: catalog.collection});
    if (!catalog.structurallyValid) push('selected-owner-catalog', catalog.recordPointer, 'selected-catalog-schema-invalid', {catalog: catalog.selectedCatalog, error: catalog.validationError});
    if (!catalog.declaredRegionCountMatches) push('selected-owner-catalog', catalog.recordPointer, 'declared-region-count-mismatch', {catalog: catalog.selectedCatalog, declared: catalog.declaredRegionCount, actual: catalog.actualRegionCount});
  }
  for (const binding of bindingAudits) {
    for (const code of binding.structuralIssues) {
      const issue = {scope: 'evidence-binding', pointer: binding.bindingPointer, code, routeOwner: binding.routeOwner, sourceOwner: binding.sourceOwner, fieldPointer: binding.fieldPointer, sourceObjectPointer: binding.sourceObjectPointer, attachmentPointer: binding.attachmentPointer, attachmentRelativePointer: binding.attachmentRelativePointer, regionChecks: binding.regionChecks};
      if (code.startsWith('ambiguous-')) unresolved.push(issue);
      else push(issue.scope, issue.pointer, issue.code, issue);
    }
  }
  for (const target of pageTargetAudit.targets) {
    if (['stale-or-unmapped-region-id', 'region-source-page-mismatch'].includes(target.targetStatus)) push('page-target', target.pointer, target.targetStatus, {book: target.book, pages: target.pages, explicitRegionChecks: target.explicitRegionChecks});
  }
  return {valid: failures.length === 0, confirmedFailureCount: failures.length, failuresByCode: failures.reduce((out, failure) => { out[failure.code] = (out[failure.code] || 0) + 1; return out; }, {}), failures, unresolvedCount: unresolved.length, unresolved, pendingSemanticReviewIsNonFailing: true, scope: 'Fails only for confirmed structural owner/catalog/region/page/source-object joins. Pending semantic review, empty targets, explicitly unmapped candidate IDs, context/qualifier incompleteness, full-image sentinels, and unannotated obligations remain visible but do not fail this structural gate.'};
}

export function projectVisualCoverageSummary(report, geometrySnapshotReference = null, priceInventoryInput = null) {
  const usages = report.usages.filter(usage => usage.viewerSelected).map(usage => ({collection: usage.collection, itemId: usage.itemId, binding: usage.binding, catalog: usage.catalog, regionId: usage.regionId, book: usage.book, printedPage: usage.page, imageSha256: usage.imageSha256, sourceSha256: usage.sourceSha256, status: usage.status, reviewStale: usage.reviewStale, sentinel: usage.sentinel, sentinelPolicyStatus: usage.sentinelPolicyStatus ?? null, geometryCandidate: usage.geometryCandidate, geometryStaleCandidate: usage.geometryStaleCandidate, reviewGate: usage.reviewGate}));
  const priceInventory = report.priceInventory ? {
    ...report.priceInventory,
    denominatorPolicy: {
      sourceRows: 'sourceRowCount counts rows across sourceTableDenominatorCount named inventories.',
      siteClaims: 'siteClaimCount and siteClaimDenominator count site claim objects; siteClaimTargetBindingDenominator counts only objects with target evidence bindings. siteClaimStates and siteClaimTargetStatuses describe different states, and target statuses do not independently confirm printed values.',
      printedPrices: 'printedPriceEvidenceBindingDenominator and printedPriceSourceValueStatuses describe source-value review separately from target-location review.',
      sourcePages: 'pageCensusPageCount counts PDF pages across sourcePageCensuses; page and row denominators are different units.',
      estimates: 'estimateOverlap reports estimates attached to price-gap objects; estimate and gap counts can overlap and are not additive.',
      exhaustive: false,
    },
  } : null;
  return {
    available: true,
    scope: report.scope,
    inputDataSha256: report.inputDataSha256,
    sourceFrameValidation: report.sourceFrameValidation,
    geometrySnapshotReference,
    geometrySnapshotApplied: report.geometrySnapshotApplied,
    geometrySnapshotDataMatches: report.geometrySnapshotDataMatches,
    selectedRegionUsageCount: usages.length,
    totalsScope: 'Source visual API totals include both sourceExcerpts and legacy scanVerification catalog bindings; selectedRegionReviewStatuses includes only the exact viewer-selected binding.',
    totals: report.totals,
    denominators: report.denominators,
    counts: report.counts,
    byCategory: report.byCategory,
    reviewLedgerSummary: report.reviewLedgerSummary,
    contextContracts: report.contextContracts ? {total: report.contextContracts.total, violations: report.contextContracts.violations.length, statusCounts: report.contextContracts.checks.reduce((out, check) => { out[check.status] = (out[check.status] || 0) + 1; return out; }, {})} : null,
    continuations: report.continuations ? {groupCount: report.continuations.groupCount, segmentCount: report.continuations.segmentCount, stateCounts: report.continuations.stateCounts, valid: report.continuations.valid} : null,
    sentinelPolicy: report.sentinelPolicy || null,
    priceInventory,
    priceInventoryInput,
    selectedRegionReviewStatuses: usages,
  };
}

function visualSummary(data, reader, {current = false} = {}) {
  let ledger = {reviews: []};
  let geometry = null;
  let contextManifest = null;
  let continuationManifest = null;
  let priceInventory = null;
  let priceInventoryValidation = null;
  let priceInventoryInput = {path: 'research/price-source-inventory.json', available: false};
  const readJson = file => JSON.parse(reader(file).toString('utf8'));
  try { ledger = readJson('research/source-visual-reviews.json'); } catch {}
  let geometrySnapshotReference = null;
  try {
    const selected = current ? loadRasterSnapshotInput().geometry : null;
    const geometryPath = selected?.path || 'research/source-visual-audit-release.json';
    const bytes = selected?.bytes || reader(geometryPath);
    geometry = parse(bytes);
    geometrySnapshotReference = {path: geometryPath, sha256: sha256(bytes), inputDataSha256: geometry.inputDataSha256 || null, candidateCount: geometry.candidates?.length || 0, usageCount: geometry.usages?.length || 0};
  } catch (error) { geometrySnapshotReference = {path: current ? 'research/current-source-raster-snapshot.json' : 'research/source-visual-audit-release.json', available: false, error: error.message}; }
  try { contextManifest = readJson('research/citation-context-contracts.json'); } catch {}
  try { continuationManifest = readJson('research/citation-continuations.json'); } catch {}
  try {
    const bytes = reader('research/price-source-inventory.json');
    priceInventory = JSON.parse(bytes.toString('utf8'));
    try { validatePriceSourceInventory(priceInventory); priceInventoryValidation = {valid: true, errors: []}; }
    catch (error) { priceInventoryValidation = {valid: false, errors: [error.message]}; }
    priceInventoryInput = {path: 'research/price-source-inventory.json', available: true, sha256: sha256(bytes), validation: priceInventoryValidation};
  } catch (error) { priceInventoryInput = {path: 'research/price-source-inventory.json', available: false, error: error.message}; }
  try {
    const build = current ? buildVisualCoverage : buildVisualCoverageCore;
    const report = build(data, catalogPath => {
      const bytes = reader(`dist/${catalogPath}`);
      return {catalog: JSON.parse(bytes.toString('utf8')), sha256: sha256(bytes)};
    }, ledger, geometry, {
      loadImage: (catalogPath, image) => reader(`dist/${path.posix.join(path.posix.dirname(catalogPath), image)}`),
      contextContractManifest: contextManifest,
      continuationManifest,
      priceInventory,
      priceInventoryValidation,
    });
    if (current && report.sourceFrameValidation?.valid !== true) throw Error(`Current source visual validation failed: ${report.sourceFrameValidation?.errors?.join('; ') || 'validation unavailable'}`);
    return projectVisualCoverageSummary(report, geometrySnapshotReference, priceInventoryInput);
  } catch (error) {
    return {available: false, error: error.message, sourceFrameValidation: {valid: false, errors: [error.message]}, geometrySnapshotReference, priceInventoryInput, fallback: 'Catalog region geometry and binding state remain available in the main inventory; manual visual status could not be joined through source-visual-coverage API.'};
  }
}

function buildMoneyPointer(raw, record) {
  const pointer = record ? `${record.pointer}${raw.pointer.slice(record.pointer.length)}` : raw.pointer;
  return pointer;
}

export function buildSystemicInventory(data, reader, {source = 'unspecified', commit = null, rawDataFileSha256 = null, includeVisual = false} = {}) {
  const indexed = recordIndex(data);
  const records = indexed.records.filter(record => RECORD_COLLECTIONS.includes(record.collection));
  const allArrayRecords = indexed.records;
  const tree = collectTree(data, new Map(allArrayRecords.map(record => [record.pointer, record])));
  const objects = scanObjects(data, records);
  const catalogIndex = buildCatalogs(records, reader);
  const bindingAudit = buildBindingAudit(objects.bindings, indexed.owners, catalogIndex);
  const pageTargetAudit = buildPageTargetAudit(objects.genericPages, catalogIndex);
  const factCoverage = fieldFactCoverage(records, bindingAudit);
  const money = moneyClaims(tree, records, allArrayRecords, bindingAudit, objects.citationObjects, catalogIndex, catalogIndex.catalogRegions);
  const manual = buildManualCoverage({data, records, catalogRegions: catalogIndex.catalogRegions, reader, current: source === 'working-tree' ? data : null});
  const semanticUniverse = buildSemanticReviewUniverse(records, tree.nodes, factCoverage, money, bindingAudit, manual);
  const structuralGate = structuralValidation({bindingAudits: bindingAudit.audits, pageTargetAudit, catalogUsages: catalogIndex.catalogUsages});
  const bindingClassCounts = Object.fromEntries(Object.keys(CLASS_CODES).map(key => [key, 0]));
  const bindingStatusCounts = {};
  const bindingStatusByCategory = {};
  for (const binding of bindingAudit.audits) {
    bindingClassCounts[binding.auditClass]++;
    bindingStatusCounts[binding.targetStatus] = (bindingStatusCounts[binding.targetStatus] || 0) + 1;
    const category = binding.sourceCategory || 'unspecified';
    bindingStatusByCategory[category] ||= {};
    bindingStatusByCategory[category][binding.targetStatus] = (bindingStatusByCategory[category][binding.targetStatus] || 0) + 1;
  }
  const selectedRegionStatusCounts = {missingPreciseFocus: 0, rawFullImageSentinel: 0, missingCropCoordinates: 0};
  for (const region of catalogIndex.catalogRegions) {
    if (region.missingPreciseFocus) selectedRegionStatusCounts.missingPreciseFocus = (selectedRegionStatusCounts.missingPreciseFocus || 0) + 1;
    if (region.rawFullImageSentinelCount) selectedRegionStatusCounts.rawFullImageSentinel = (selectedRegionStatusCounts.rawFullImageSentinel || 0) + 1;
    if (!region.sourceBoundCoordinates) selectedRegionStatusCounts.missingCropCoordinates = (selectedRegionStatusCounts.missingCropCoordinates || 0) + 1;
  }
  const sourceVisual = includeVisual ? visualSummary(data, reader, {current: source === 'working-tree'}) : {available: false, reason: 'Not run in in-memory test mode.'};
  const recordsByCollection = {};
  for (const record of records) recordsByCollection[record.collection] = (recordsByCollection[record.collection] || 0) + 1;
  const exposedRecordCount = records.length;
  const auxiliaryRecordCount = allArrayRecords.length - records.length;
  const classificationDenominator = Object.values(tree.classes).reduce((sum, count) => sum + count, 0);
  return {
    schemaVersion: 1,
    scope: 'Structural inventory of every JSON node in the assembled app data, every exposed record, source-like object, field binding, selected owner catalog region, and money-like property. Complete pointer denominators are mapped separately from manual semantic obligations. Syntactic classifications and linked review statuses do not establish semantic correctness, complete source evidence, or whole-book completeness.',
    source, commit,
    input: {path: source === 'working-tree' ? 'dist/data.json' : 'dist/data.json at pinned Git commit', sha256: sha256(Buffer.from(JSON.stringify(data))), hashFormat: 'SHA-256 of JSON.stringify(parsed data)', rawFileSha256: rawDataFileSha256, rawFileHashFormat: 'SHA-256 of exact dist/data.json bytes'},
    collectionDenominator: {exposedCollections: RECORD_COLLECTIONS, exposedRecordCount, recordsByCollection, auxiliaryTopLevelArrayRecords: auxiliaryRecordCount, auxiliaryCollectionCounts: indexed.collectionCounts, progressionExplainerIncludedAsRecord: !!data.progressionExplainer},
    jsonTree: {totalNodes: tree.counts.total, objectNodes: tree.counts.object, arrayNodes: tree.counts.array, scalarLeaves: tree.counts.string + tree.counts.number + tree.counts.boolean + tree.counts.null, kinds: tree.counts, propertyEdges: tree.counts.properties, nodeClassificationDenominator: classificationDenominator, nodeClassificationCounts: tree.classes, nodeRoleCounts: tree.roles, tupleSchema: ['jsonPointer', 'kindCode', 'semanticRoleCode', 'inventoryClassificationCode'], classificationMeaning: 'Syntactic inventory class only; semantic verification is recorded in separate source-value/target/context contracts.', codes: {kind: KIND_CODES, semanticRole: ROLE_CODES, classification: CLASS_CODES}, nodes: tree.nodes},
    recordPointers: records.map(record => ({collection: record.collection, itemId: record.id, pointer: record.pointer})),
    citationObjects: {denominator: objects.citationObjects.length, byShape: objects.citationObjects.reduce((out, item) => { out[item.citationShape] = (out[item.citationShape] || 0) + 1; return out; }, {}), pageReferenceDenominator: objects.genericPages.length, objects: objects.citationObjects, genericPageReferences: objects.genericPages.length},
    pageTargets: pageTargetAudit,
    structuredFieldTargetCoverage: {scope: 'This is a narrow UI-target subset of explicit record properties under /fields/* and /price. At the pinned Git baseline, its 4,820 slots are distinct from the 13,193 mechanics-audit fields and 34,280 scalar/null leaves; the UI-target subset is not equivalent to either larger universe. It also excludes arbitrary prose facts and source-row inventory claims.', ...factCoverage},
    evidenceBindings: {denominator: bindingAudit.audits.length, classification: bindingClassCounts, targetStatusCounts: bindingStatusCounts, targetStatusBySourceCategory: bindingStatusByCategory, reviewStatusCounts: bindingAudit.audits.reduce((out, binding) => { const status = binding.reviewStatus || 'missing'; out[status] = (out[status] || 0) + 1; return out; }, {}), bindings: bindingAudit.audits},
    selectedOwnerCatalogs: {denominator: catalogIndex.catalogUsages.length, loaded: catalogIndex.catalogUsages.filter(catalog => catalog.actualRegionCount != null).length, failed: catalogIndex.catalogUsages.filter(catalog => catalog.actualRegionCount == null).length, invalidPaths: catalogIndex.catalogUsages.filter(catalog => !catalog.pathValid).length, ownerMismatch: catalogIndex.catalogUsages.filter(catalog => !catalog.catalogOwnerMatches).length, structurallyInvalid: catalogIndex.catalogUsages.filter(catalog => !catalog.structurallyValid).length, declaredRegionCountMismatches: catalogIndex.catalogUsages.filter(catalog => !catalog.declaredRegionCountMatches).length, validationCategories: catalogIndex.catalogUsages.reduce((out, catalog) => { out[catalog.validationCategory] = (out[catalog.validationCategory] || 0) + 1; return out; }, {}), usages: catalogIndex.catalogUsages},
    selectedCatalogRegions: {denominator: catalogIndex.catalogRegions.length, uniqueCatalogRegionIds: new Set(catalogIndex.catalogRegions.map(region => `${region.catalog}:${region.regionId}`)).size, structuralFlags: selectedRegionStatusCounts, regions: catalogIndex.catalogRegions},
    moneyLikeProperties: {denominator: tree.moneyLike.length, claimsByClassification: money.classification, sourceAssessability: money.sourceAssessability, claims: money.claims},
    contextualCoverage: manual.context,
    contextRegionCoverage: manual.contextRegionCoverage,
    continuationCoverage: manual.continuation,
    qualifierCoverage: manual.qualifiers,
    semanticReviewUniverse: semanticUniverse,
    structuralValidation: structuralGate,
    sourceVisualCoverage: sourceVisual,
    limitations: [
      'A confirmed node inventory class, JSON pointer, or catalog target means only that the recorded structure resolves; it does not prove the cited passage supports the value or that a name/label is semantically correct.',
      'Money-like string matching is intentionally broad and keeps exact raw text; currency candidates are not all prices. XP, weights, package counts and prose may still require a human to classify.',
      'Region IDs resolve only in the exact catalog selected by sourceExcerpts || scanVerification on the source owner. No cross-catalog fallback is attempted.',
      'Only explicitly annotated context, continuation, and qualifier requirements have structural checks. Unannotated obligations are not-assessable, not passed.',
      'Geometry checks and recorded visual reviews are reused as evidence from the existing source-visual-coverage API; they do not establish source completeness or semantic accuracy.',
    ],
  };
}

function readGit(commit, file) {
  const spec = `${commit}:${file}`;
  const exists = spawnSync('git', ['cat-file', '-e', spec], {cwd: root, stdio: 'ignore'});
  if (exists.status !== 0) throw new Error(`Git blob is absent: ${spec}`);
  const result = spawnSync('git', ['show', spec], {cwd: root, maxBuffer: 150 * 1024 * 1024});
  if (result.status !== 0) throw new Error(`Unable to read Git blob: ${spec}`);
  return result.stdout;
}
function readCurrent(file) { return readFileSync(path.resolve(root, file)); }
function parse(bytes) { return JSON.parse(bytes.toString('utf8')); }

export function buildPinnedAndCurrentReports() {
  const baselineDataBytes = readGit(BASELINE_COMMIT, 'dist/data.json');
  const currentDataBytes = readCurrent('dist/data.json');
  const baselineData = parse(baselineDataBytes);
  const currentData = parse(currentDataBytes);
  const baseline = buildSystemicInventory(baselineData, file => readGit(BASELINE_COMMIT, file), {source: 'git-baseline', commit: BASELINE_COMMIT, rawDataFileSha256: sha256(baselineDataBytes), includeVisual: true});
  const current = buildSystemicInventory(currentData, readCurrent, {source: 'working-tree', rawDataFileSha256: sha256(currentDataBytes), includeVisual: true});
  current.companionInventories = companionInventories(current);
  return {baseline, current};
}

function companionInventories(current) {
  const entries = [];
  const add = (file, summarize) => {
    try {
      const bytes = readCurrent(file);
      const value = parse(bytes);
      entries.push({path: file, sha256: sha256(bytes), summary: summarize(value)});
    } catch (error) { entries.push({path: file, available: false, error: error.message}); }
  };
  add('research/citation-binding-scope-audit.json', value => ({baselineCommit: value.baseline?.commit, baselineDataSha256: value.baseline?.distDataSha256, currentSnapshotDataSha256: value.currentPreFixSnapshot?.distDataSha256, currentSnapshotMatchesInventoryInput: value.currentPreFixSnapshot?.distDataSha256 === current.input.rawFileSha256, baselineRecords: value.mechanicsAuditDenominator?.baselineRecords, baselineMechanicsFieldCount: value.mechanicsAuditDenominator?.baselineCommitTotalFields, generatedBindings: value.currentPreFixSnapshot?.currentAutomaticFieldEvidenceBindings?.total, generatedBindingsByCategory: value.currentPreFixSnapshot?.currentAutomaticFieldEvidenceBindings?.bySourceCategory, regionBoundGeneratedBindings: value.currentPreFixSnapshot?.currentAutomaticFieldEvidenceBindings?.regionBound, pendingGeneratedBindings: value.currentPreFixSnapshot?.currentAutomaticFieldEvidenceBindings?.pending}));
  add('research/equipment-price-context-baseline.json', value => ({baselineCommit: value.baselineCommit, baselineDataSha256: value.baselineDataSha256, counts: value.counts}));
  add('research/citation-navigation-coverage.json', value => ({snapshot: value.snapshot, counts: value.counts, preservedPreFixFailureFixture: value.preservedPreFixFailureFixture, observedGaps: value.observedGaps}));
  return entries;
}

export const FULL_REPORT_HASH_FORMAT = 'sha256-utf8-json-stringify-no-trailing-newline';

export function fullReportHashMetadata(report) {
  return {sha256: sha256(Buffer.from(JSON.stringify(report))), hashFormat: FULL_REPORT_HASH_FORMAT};
}

function compactBaseline(report) {
  const compact = structuredClone(report);
  compact.fullReport = {path: 'test-results/citation-systemic/citation-systemic-baseline.json', ...fullReportHashMetadata(report), reproductionCommand: 'node tools/citation-systemic-inventory.mjs --output-dir test-results/citation-systemic', inputCommit: BASELINE_COMMIT, note: 'Complete pointer tuples and money-like candidate queues remain in this compact file. The full report contains per-region crop/focus geometry and per-usage review joins; regenerate from the pinned Git commit.'};
  compact.structuredFieldTargetCoverage.facts = [];
  compact.structuredFieldTargetCoverage.detailsInFullReport = true;
  compact.selectedCatalogRegions.regions = [];
  compact.selectedCatalogRegions.detailsInFullReport = true;
  compact.sourceVisualCoverage.selectedRegionReviewStatuses = [];
  compact.sourceVisualCoverage.detailsInFullReport = true;
  compact.selectedOwnerCatalogs.usages = compact.selectedOwnerCatalogs.usages.map(item => ({ownerKey: item.ownerKey, collection: item.collection, itemId: item.itemId, recordPointer: item.recordPointer, selectedBinding: item.selectedBinding, selectedCatalog: item.selectedCatalog, catalogBytesSha256: item.catalogBytesSha256, declaredRegionCount: item.declaredRegionCount, actualRegionCount: item.actualRegionCount, declaredRegionCountMatches: item.declaredRegionCountMatches, validationCategory: item.validationCategory, pathValid: item.pathValid, catalogOwnerMatches: item.catalogOwnerMatches, structurallyValid: item.structurallyValid}));
  return compact;
}

function summarizeCounts(report) {
  return {
    records: report.collectionDenominator.exposedRecordCount,
    nodes: report.jsonTree.totalNodes,
    scalarLeaves: report.jsonTree.scalarLeaves,
    citationObjects: report.citationObjects.denominator,
    genericPageReferences: report.pageTargets.denominator,
    fieldBindings: report.evidenceBindings.denominator,
    bindingClass: report.evidenceBindings.classification,
    selectedCatalogs: report.selectedOwnerCatalogs.denominator,
    selectedRegions: report.selectedCatalogRegions.denominator,
    moneyCandidates: report.moneyLikeProperties.denominator,
    moneyClass: report.moneyLikeProperties.claimsByClassification,
    contextRequirements: report.contextualCoverage.annotatedRequirements || 0,
    contextOutcomes: report.contextualCoverage.requirementOutcomeCounts || {},
    contextRegionCoverage: report.contextRegionCoverage,
    continuationGroups: report.continuationCoverage.knownGroups || 0,
    continuationSegments: report.continuationCoverage.knownSegments || 0,
    qualifierCases: report.qualifierCoverage.manuallyAnnotatedCases || 0,
    structuralValidation: {valid: report.structuralValidation.valid, confirmedFailureCount: report.structuralValidation.confirmedFailureCount, failuresByCode: report.structuralValidation.failuresByCode, unresolvedCount: report.structuralValidation.unresolvedCount},
  };
}

export function renderSummaryMarkdown(baseline, current, outputFiles) {
  const rows = [
    ['Exposed records', baseline.collectionDenominator.exposedRecordCount, current.collectionDenominator.exposedRecordCount],
    ['JSON nodes (all data)', baseline.jsonTree.totalNodes, current.jsonTree.totalNodes],
    ['Scalar/null leaves', baseline.jsonTree.scalarLeaves, current.jsonTree.scalarLeaves],
    ['Citation-like objects', baseline.citationObjects.denominator, current.citationObjects.denominator],
    ['Page-reference targets', baseline.pageTargets.denominator, current.pageTargets.denominator],
    ['Evidence bindings', baseline.evidenceBindings.denominator, current.evidenceBindings.denominator],
    ['Selected owner catalogs', baseline.selectedOwnerCatalogs.denominator, current.selectedOwnerCatalogs.denominator],
    ['Selected catalog regions', baseline.selectedCatalogRegions.denominator, current.selectedCatalogRegions.denominator],
    ['Money-like candidates', baseline.moneyLikeProperties.denominator, current.moneyLikeProperties.denominator],
    ['Context contracts (known only)', baseline.contextualCoverage.annotatedRequirements || 0, current.contextualCoverage.annotatedRequirements || 0],
    ['Continuation groups (known only)', baseline.continuationCoverage.knownGroups || 0, current.continuationCoverage.knownGroups || 0],
    ['Qualifier cases (known only)', baseline.qualifierCoverage.manuallyAnnotatedCases || 0, current.qualifierCoverage.manuallyAnnotatedCases || 0],
  ];
  const lines = [
    '# Citation systemic inventory',
    '',
    `Pinned baseline: ${BASELINE_COMMIT}. The report inventories all content-record JSON pointers and keeps source-value review, field-target review, geometry, context, continuation, qualifier, and extraction completeness separate.`,
    '',
    '| Measure | Pinned baseline | Current data |',
    '|---|---:|---:|',
    ...rows.map(([label, oldValue, newValue]) => `| ${label} | ${oldValue} | ${newValue} |`),
    '',
    `- Baseline node classifications: ${JSON.stringify(baseline.jsonTree.nodeClassificationCounts)} (inventory classes only; not semantic verification).`,
    `- Current node classifications: ${JSON.stringify(current.jsonTree.nodeClassificationCounts)} (inventory classes only; not semantic verification).`,
    `- Baseline evidence-binding classes: ${JSON.stringify(baseline.evidenceBindings.classification)}; current: ${JSON.stringify(current.evidenceBindings.classification)}.`,
    `- Baseline money-candidate classes: ${JSON.stringify(baseline.moneyLikeProperties.claimsByClassification)}; current: ${JSON.stringify(current.moneyLikeProperties.claimsByClassification)}. A reviewed target does not confirm a price; only explicit independent source-value status does.`,
    `- Context requirements remain bounded to annotations: current outcomes ${JSON.stringify(current.contextualCoverage.requirementOutcomeCounts || {})}; region-level annotated and unassessable counts are separate from containment passes.`,
    `- Declared continuation ordering: ${JSON.stringify(current.continuationCoverage.ordering?.counts || {})} across ${current.continuationCoverage.ordering?.denominator || 0} groups. These checks compare catalog and untargeted same-page viewer relative order; unknown continuations, cross-page viewer sequencing and unrelated-region defaults are not certified.`,
    `- Structural join gate: **${current.structuralValidation.valid ? 'PASS' : 'FAIL'}** (${current.structuralValidation.confirmedFailureCount} confirmed issues; ${current.structuralValidation.unresolvedCount} ambiguous joins). Pending semantic review is non-failing.`,
    `- Current sentinel policy: ${current.sourceVisualCoverage?.sentinelPolicy ? `${current.sourceVisualCoverage.sentinelPolicy.unresolvedHighlightWarnings} / ${current.sourceVisualCoverage.sentinelPolicy.rawFullImageSentinelBindings} raw sentinels still warn; ${current.sourceVisualCoverage.sentinelPolicy.historicalExceptionsNeedingScopeReview} / ${current.sourceVisualCoverage.sentinelPolicy.historicalHighlightExceptionDenominator} historical exceptions need scope review; ${current.sourceVisualCoverage.sentinelPolicy.explicitWholeSpellExceptions} explicit whole-spell exceptions. Field targets: ${current.sourceVisualCoverage.sentinelPolicy.factFocus.fieldTargetReviewed} / ${current.sourceVisualCoverage.sentinelPolicy.factFocus.fieldEvidenceBindingDenominator} reviewed, ${current.sourceVisualCoverage.sentinelPolicy.factFocus.factFocusPending} pending; whole-spell exceptions do not clear field-focus work.` : 'Sentinel scope policy unavailable.'}`,
    `- Current bounded price inventory: ${current.sourceVisualCoverage?.priceInventory ? `${current.sourceVisualCoverage.priceInventory.sourceRowCount} source rows / ${current.sourceVisualCoverage.priceInventory.sourceTableDenominatorCount} named inventories; ${current.sourceVisualCoverage.priceInventory.siteClaimCount} / ${current.sourceVisualCoverage.priceInventory.siteClaimDenominator} site objects; ${current.sourceVisualCoverage.priceInventory.siteClaimTargetBindingDenominator} target bindings; ${current.sourceVisualCoverage.priceInventory.printedPriceEvidenceBindingDenominator} printed-price value bindings; ${current.sourceVisualCoverage.priceInventory.pageCensusPageCount} PDF pages / ${current.sourceVisualCoverage.priceInventory.sourcePageCensuses.length} censuses. Target statuses ${JSON.stringify(current.sourceVisualCoverage.priceInventory.siteClaimTargetStatuses || {})}; source-value statuses ${JSON.stringify(current.sourceVisualCoverage.priceInventory.printedPriceSourceValueStatuses || {})}. ${current.sourceVisualCoverage.priceInventory.estimateOverlap?.editorialEstimateCount || 0} estimates overlap ${current.sourceVisualCoverage.priceInventory.estimateOverlap?.editorialEstimatesWithinPriceGapObjects || 0} price-gap objects; counts are not additive. Units are distinct and the inventory is bounded, not exhaustive.` : 'Bounded price inventory unavailable.'} Validation: ${current.sourceVisualCoverage?.priceInventory?.validation?.valid === true ? 'passed' : current.sourceVisualCoverage?.priceInventory?.validation?.valid === false ? 'failed' : 'unavailable'}.`,
    `- Pinned-baseline price inventory: ${baseline.sourceVisualCoverage?.priceInventory ? 'available in the baseline report.' : baseline.sourceVisualCoverage?.priceInventoryInput?.error?.includes('Git blob is absent') ? 'unavailable; research/price-source-inventory.json is absent from the pinned Git commit.' : 'unavailable for the pinned baseline.'}`,
    '- Every content-record pointer defaults to not-assessable for source support, context, continuation, qualifier, and extraction completeness unless an exact scoped obligation is listed in `semanticReviewUniverse.scopedOverrides`.',
    '- `/fields/*` and `/price` are a narrow UI-target subset, not the full mechanics-audit fact universe or all scalar/null leaves. Unannotated context/continuation/qualifier/completeness cases are not-assessable, not passed.',
    '',
    'Full JSON reports:',
    ...outputFiles.map(file => `- ${file}`),
    '',
  ];
  return lines.join('\n');
}

function parseCliArgs(argv) {
  let outputDir = 'test-results/citation-systemic';
  let writeBaseline = false;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--output-dir') {
      const value = argv[++index];
      if (!value) throw new Error('--output-dir requires a path');
      outputDir = value;
    } else if (arg === '--write-baseline') writeBaseline = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return {outputDir: path.resolve(root, outputDir), writeBaseline};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    const {baseline, current} = buildPinnedAndCurrentReports();
    const baselinePath = path.join(args.outputDir, 'citation-systemic-baseline.json');
    const currentPath = path.join(args.outputDir, 'citation-systemic-current.json');
    const summaryPath = path.join(args.outputDir, 'citation-systemic-summary.md');
    const validationPath = path.join(args.outputDir, 'validation.json');
    const continuationValidation = continuationValidationGate(current.continuationCoverage);
    mkdirSync(args.outputDir, {recursive: true});
    writeFileSync(baselinePath, JSON.stringify(baseline) + '\n');
    writeFileSync(currentPath, JSON.stringify(current) + '\n');
    writeFileSync(validationPath, JSON.stringify({schemaVersion: 1, baseline: baseline.structuralValidation, current: current.structuralValidation, currentContinuations: continuationValidation, gatePolicy: 'Confirmed structural owner/catalog/region/page/source-object join failures and declared continuation contract/order failures fail. Pending semantic review remains non-failing.'}) + '\n');
    writeFileSync(summaryPath, renderSummaryMarkdown(baseline, current, [baselinePath, currentPath, validationPath]));
    if (args.writeBaseline) writeFileSync(path.resolve(root, 'research/citation-systemic-baseline.json'), JSON.stringify(compactBaseline(baseline)) + '\n');
    const result = {baseline: summarizeCounts(baseline), current: summarizeCounts(current), currentContinuations: continuationValidation, files: [baselinePath, currentPath, validationPath, summaryPath], trackedBaselineUpdated: args.writeBaseline};
    console.log(JSON.stringify(result));
    if (!current.structuralValidation.valid || !continuationValidation.valid) process.exitCode = 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
