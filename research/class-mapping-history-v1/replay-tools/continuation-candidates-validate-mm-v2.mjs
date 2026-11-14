import {readFileSync, existsSync, readdirSync, mkdirSync, copyFileSync, writeFileSync, realpathSync} from '../mm-replay-fs-v2.mjs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from '../mm-replay-child-process-v2.mjs';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fieldsFor} from './mechanics-audit.mjs';
import {assertCurrentMmSourceEpoch} from '../../../tests/helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {SOURCE_FRAME_BRIDGE_PATH, SOURCE_FRAME_BRIDGE_SHA256, validateLiveSourceFrameBridge, projectRegisteredRect} from './source-frame-coordinate-bridge.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url);
const trustedModuleRoot = path.resolve(import.meta.dirname, '../../..');
const pointerPart = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
const unescapePointer = value => value.replaceAll('~1', '/').replaceAll('~0', '~');
const fail = (errors, code, detail) => errors.push({code, detail});

function listJsonFiles(root, prefix = '') {
  const result = [];
  for (const entry of readdirSync(path.join(root, prefix), {withFileTypes: true})) {
    const relative = path.posix.join(prefix.replaceAll(path.sep, '/'), entry.name);
    if (entry.isDirectory()) result.push(...listJsonFiles(root, relative));
    else if (entry.isFile() && entry.name.endsWith('.json')) result.push(relative);
  }
  return result.sort();
}

function resolvePointer(object, pointer) {
  let value = object;
  for (const rawPart of pointer.split('/').slice(1)) {
    const part = unescapePointer(rawPart);
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return {exists: false};
    value = value[part];
  }
  return {exists: true, value};
}

function allRecords(data) {
  const collections = ['rules', 'spells', 'equipment', 'matrices', 'classes', 'progressionExplainer'];
  const result = [];
  for (const collection of collections) {
    const values = Array.isArray(data[collection]) ? data[collection] : data[collection] && typeof data[collection] === 'object' ? [data[collection]] : [];
    for (const record of values) if (record && typeof record.id === 'string') result.push({collection, itemId: record.id, record});
  }
  return result;
}

function* walkLeaves(value, pointer = '') {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) yield* walkLeaves(value[index], `${pointer}/${index}`);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) yield* walkLeaves(child, `${pointer}/${pointerPart(key)}`);
  } else {
    yield pointer || '/';
  }
}

function recomputeMechanics(data) {
  const byCollection = {};
  let records = 0;
  let total = 0;
  for (const {collection, record} of allRecords(data)) {
    const count = fieldsFor(collection, record).length;
    records++;
    total += count;
    byCollection[collection] = (byCollection[collection] || 0) + count;
  }
  return {records, totalFields: total, byCollection};
}

function expectedCatalogBindings(data, catalogs) {
  const uses = new Map();
  const bindingCounts = {};
  const regionCounts = {};
  for (const {collection, itemId, record} of allRecords(data)) {
    for (const bindingKey of ['sourceExcerpts', 'scanVerification']) {
      const binding = record[bindingKey];
      if (!binding || typeof binding.catalog !== 'string') continue;
      bindingCounts[bindingKey] = (bindingCounts[bindingKey] || 0) + 1;
      const catalog = catalogs.get(binding.catalog);
      if (!catalog) continue;
      const ids = Array.isArray(binding.regionReviews) ? binding.regionReviews.map(review => review?.regionId).filter(id => typeof id === 'string') : [];
      const selectedIds = ids.length ? ids : catalog.regions.map(region => region.id);
      regionCounts[bindingKey] = (regionCounts[bindingKey] || 0) + selectedIds.length;
      for (const regionId of selectedIds) {
        const key = `${binding.catalog}\0${regionId}`;
        const values = uses.get(key) || [];
        values.push({bindingKey, collection, itemId});
        uses.set(key, values);
      }
    }
  }
  return {uses, bindingCounts, regionCounts};
}

export function regionSourceIdentityIssues({books, catalog, region, assessment, summary}) {
  const issues = [];
  const identity = books?.resolveRegionSourceIdentity?.(catalog, region);
  if (identity?.valid !== true) {
    return [{code: 'invalid-source-identity', detail: `${region?.id || 'unknown region'} does not resolve to a valid typed source identity.`}];
  }
  const canonicalPdfSha256 = identity.canonicalPdfSha256 || identity.sourceSha256;
  const expectedCatalogHashes = summary?.input?.sources?.[region.book]?.catalogSourceHashes;
  if (assessment.sourceSha256 !== identity.sourceSha256) {
    issues.push({code: 'stale-source-hash', detail: `${region.id} source SHA differs from the shared typed source identity.`});
  }
  if (!Array.isArray(expectedCatalogHashes) || !expectedCatalogHashes.includes(canonicalPdfSha256)) {
    issues.push({code: 'stale-source-hash', detail: `${region.id} canonical PDF SHA is not bound to the report source set.`});
  }
  if (identity.sourceKind === 'supplemental-image') {
    const expected = {
      sourceKind: 'supplemental-image',
      sourceArtifactId: identity.sourceArtifactId,
      sourceSha256: identity.sourceSha256,
      canonicalPdfSha256: identity.canonicalPdfSha256,
      sourceDimensionsPx: identity.sourceDimensionsPx,
      sourceCropBoundsPx: identity.sourceCropBoundsPx,
      sourceCoordinateSpace: identity.sourceCoordinateSpace,
      textGeometryStatus: 'not-assessable-supplemental-image-format',
    };
    for (const [key, value] of Object.entries(expected)) {
      if (JSON.stringify(assessment[key] ?? null) !== JSON.stringify(value ?? null)) {
        issues.push({code: 'supplemental-source-identity-mismatch', detail: `${region.id} ${key} does not match the shared source-image identity or non-PDF assessment status.`});
      }
    }
    if (assessment.pdfPage !== null || assessment.geometry !== null) {
      issues.push({code: 'supplemental-source-frame-mismatch', detail: `${region.id} must retain its null PDF page and must not claim PDF text geometry.`});
    }
  } else {
    // Historic PDF-only snapshots predate the explicit typed fields. Continue
    // accepting that unchanged PDF representation; when fields are present,
    // bind each one to the resolver result.
    const expected = {
      sourceKind: identity.sourceKind,
      sourceArtifactId: identity.sourceArtifactId || null,
      canonicalPdfSha256,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (Object.hasOwn(assessment, key) && JSON.stringify(assessment[key] ?? null) !== JSON.stringify(value ?? null)) {
        issues.push({code: 'stale-source-identity-metadata', detail: `${region.id} ${key} differs from the shared PDF source identity.`});
      }
    }
  }
  return issues;
}

function checkPropertyPointerInventory(full, data, errors) {
  const inventory = full.propertyPointerInventory;
  if (!inventory || !Array.isArray(inventory.records) || !Array.isArray(inventory.propertyPaths) || !Array.isArray(inventory.propertyRows)) {
    fail(errors, 'property-inventory-missing', 'Full compressed report lacks its compact property pointer tuples.');
    return {records: 0, pointers: 0};
  }
  const records = allRecords(data);
  if (inventory.records.length !== records.length) fail(errors, 'property-record-count-stale', `Report has ${inventory.records.length} records; current data has ${records.length}.`);
  const recordIndex = new Map(records.map((record, index) => [`${record.collection}:${record.itemId}`, index]));
  const reportRecords = inventory.records;
  for (let index = 0; index < reportRecords.length; index++) {
    const expected = records[index], recorded = reportRecords[index];
    if (!expected || recorded.collection !== expected.collection || recorded.itemId !== expected.itemId) {
      fail(errors, 'property-record-order-stale', `Property record ${index} no longer matches exposed collection/item order.`);
      break;
    }
  }
  const observed = new Set();
  for (const row of inventory.propertyRows) {
    if (!Array.isArray(row) || row.length !== 7) { fail(errors, 'property-row-shape-invalid', 'A compact property tuple does not match the recorded schema.'); break; }
    const [recordNumber, pathNumber, kindCode, categoryCode, linkageCode, pageContextNumber, bindingSetNumber] = row;
    if (!Number.isInteger(recordNumber) || recordNumber < 0 || recordNumber >= records.length || !Number.isInteger(pathNumber) || pathNumber < 0 || pathNumber >= inventory.propertyPaths.length) {
      fail(errors, 'property-row-index-invalid', 'A property tuple contains an invalid record/path index.');
      break;
    }
    const recordInfo = records[recordNumber];
    const relativePointer = inventory.propertyPaths[pathNumber];
    if (typeof relativePointer !== 'string' || !relativePointer.startsWith('/')) { fail(errors, 'property-path-invalid', 'A property path is malformed.'); break; }
    const result = resolvePointer(recordInfo.record, relativePointer);
    if (!result.exists || (result.value !== null && typeof result.value === 'object')) {
      fail(errors, 'property-pointer-stale', `${recordInfo.collection}:${recordInfo.itemId}${relativePointer} no longer resolves to a scalar/null property.`);
      break;
    }
    const unique = `${recordNumber}\0${relativePointer}`;
    if (observed.has(unique)) { fail(errors, 'property-pointer-duplicate', `${recordInfo.collection}:${recordInfo.itemId}${relativePointer} is duplicated.`); break; }
    observed.add(unique);
    if (!inventory.sourceLinkageCodes || !Object.values(inventory.sourceLinkageCodes).includes(linkageCode)) { fail(errors, 'property-linkage-code-invalid', 'A property tuple has an unknown source-linkage code.'); break; }
    if (!inventory.categoryCodes || !Object.values(inventory.categoryCodes).includes(categoryCode)) { fail(errors, 'property-category-code-invalid', 'A property tuple has an unknown category code.'); break; }
    if (!inventory.kindCodes || !Object.values(inventory.kindCodes).includes(kindCode)) { fail(errors, 'property-kind-code-invalid', 'A property tuple has an unknown value-kind code.'); break; }
    if (!Array.isArray(inventory.sourcePageContexts?.[pageContextNumber]) || !Array.isArray(inventory.fieldBindingSets?.[bindingSetNumber])) { fail(errors, 'property-source-index-invalid', 'A property tuple has an invalid source-page or binding-set index.'); break; }
  }
  const computedLeafPointers = records.reduce((sum, record) => sum + [...walkLeaves(record.record)].length, 0);
  if (observed.size !== inventory.propertyRows.length || observed.size !== computedLeafPointers) fail(errors, 'property-pointer-denominator-stale', `Report has ${observed.size} unique pointers; current exposed data has ${computedLeafPointers}.`);
  return {records: records.length, pointers: observed.size, recordIndexSize: recordIndex.size};
}

function deriveCurrentFrameEvidence({root, data, books, catalogs, catalogHashes, expected}) {
  const loadCatalog = catalogPath => ({catalog: catalogs.get(catalogPath), sha256: catalogHashes[catalogPath]});
  const loadImage = (catalogPath, image) => readFileSync(path.resolve(root, 'dist', path.dirname(catalogPath), image));
  const bridge = validateLiveSourceFrameBridge({repoRoot: root, data, loadCatalog, loadImage});
  const frameRows = new Map();
  for (const frame of bridge.registry.frames) for (const row of frame.regions) {
    const useKey = JSON.stringify([row.owner.collection, row.owner.itemId, row.owner.binding, row.catalog, row.regionId]);
    frameRows.set(useKey, {frame, row});
  }
  const annotationsByRegion = new Map();
  const resolutionCounts = {};
  for (const [regionKey, uses] of expected.uses) {
    const separator = regionKey.indexOf('\0');
    const catalogPath = regionKey.slice(0, separator), regionId = regionKey.slice(separator + 1);
    const catalog = catalogs.get(catalogPath);
    const region = catalog?.regions?.find(candidate => candidate?.id === regionId);
    if (!catalog || !region) continue;
    const identity = books.resolveRegionSourceIdentity(catalog, region);
    const sourceKind = identity?.valid === true ? identity.sourceKind : 'invalid-source-identity';
    const annotations = [];
    for (const use of uses) {
      const resolution = bridge.expectedResolution({
        collection: use.collection, itemId: use.itemId, binding: use.bindingKey,
        catalog: catalogPath, regionId, sourceKind,
      });
      resolutionCounts[resolution.status] = (resolutionCounts[resolution.status] || 0) + 1;
      const annotation = {bindingKey: use.bindingKey, collection: use.collection, itemId: use.itemId, ...resolution};
      if (resolution.status === 'matched') {
        const match = frameRows.get(JSON.stringify([use.collection, use.itemId, use.bindingKey, catalogPath, regionId]));
        const pdfPagePointsLTRB = match && projectRegisteredRect(match.frame, match.row);
        if (!pdfPagePointsLTRB) throw Error(`Registered source-frame projection is unavailable for ${catalogPath}#${regionId}.`);
        annotation.pdfPagePointsLTRB = pdfPagePointsLTRB;
      }
      annotations.push(annotation);
    }
    annotationsByRegion.set(regionKey, annotations);
  }
  const declaration = {
    path: SOURCE_FRAME_BRIDGE_PATH,
    sha256: SOURCE_FRAME_BRIDGE_SHA256,
    status: 'scoped-geometric-provenance-only',
    resolutionCounts: Object.fromEntries(Object.entries(resolutionCounts).sort(([a], [b]) => a.localeCompare(b))),
    registryValidation: bridge.validation,
  };
  return {bridge, declaration, annotationsByRegion};
}

function sealedHistoricalContinuationInputs(summaryPath, fullPath, summaryBytes, fullBytes) {
  const manifestPath = path.join(trustedModuleRoot, 'research/citation-evidence-seals.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const summaryHash = sha256(summaryBytes), fullHash = sha256(fullBytes);
  const summarySeal = manifest.seals?.find(row => row.sha256 === summaryHash && /^research\/source-audit-[^/]*continuation[^/]*\.json$/.test(row.path || ''));
  const fullSeal = manifest.seals?.find(row => row.sha256 === fullHash && /^research\/source-audit-[^/]*continuation[^/]*\.json\.gz$/.test(row.path || ''));
  if (!summarySeal || !fullSeal) throw Error('Pinned-history continuation diagnostics require exact sealed summary and full-report bytes from the trusted repository seal manifest.');
  return {
    status: 'historical-sealed-diagnostics-only',
    summary: {path: summarySeal.path, sha256: summaryHash},
    fullEvidence: {path: fullSeal.path, sha256: fullHash},
    suppliedPaths: {summary: path.basename(summaryPath), fullEvidence: path.basename(fullPath)},
  };
}

/** Validate checked-in evidence without reading private PDFs or relying on OCR at CI time. */
export function validateContinuationSnapshot({root, summaryPath = path.join(root, 'research/source-audit-batch5-continuation.json'), fullPath = null, dataBytesOverride = null, catalogBytesOverride = {}, treeSelection = 'current-worktree'}) {
  const errors = [];
  if (!['current-worktree', 'pinned-git-commit'].includes(treeSelection)) return {valid: false, errors: [{code: 'validation-mode-invalid', detail: `Unknown tree selection: ${treeSelection}`}], sourcePdfRegeneration: 'unavailable-in-CI'};
  if (treeSelection === 'current-worktree') assertCurrentMmSourceEpoch(root);
  if (treeSelection === 'current-worktree') {
    let trustedRoot = false;
    try { trustedRoot = realpathSync(root) === realpathSync(trustedModuleRoot); } catch { /* fail closed below */ }
    if (!trustedRoot) {
      const error = {code: 'untrusted-current-repository-root', detail: 'Current source-frame validation must run against the repository root that owns this trusted validator and bridge.'};
      return {valid: false, errors: [error], requestedValidationMode: treeSelection, validationBase: null,
        sourceFrameValidation: {status: 'current-active-source-frame-bridge-required', valid: false, errors: [error]},
        sourcePdfRegeneration: 'unavailable-in-CI'};
    }
  }
  let summary, full, summaryBytes, compressed, rawFull;
  try {
    summaryBytes = readFileSync(summaryPath);
    summary = JSON.parse(summaryBytes.toString('utf8'));
    fullPath ||= path.join(path.dirname(summaryPath), summary.fullEvidence.path);
    compressed = readFileSync(fullPath);
    if (sha256(compressed) !== summary.fullEvidence.sha256) fail(errors, 'compressed-evidence-hash-stale', 'The compressed full report does not match its summary SHA-256.');
    rawFull = gunzipSync(compressed);
    if (sha256(rawFull) !== summary.fullEvidence.rawReportSha256) fail(errors, 'raw-evidence-hash-stale', 'The uncompressed report hash does not match its summary SHA-256.');
    full = JSON.parse(rawFull.toString('utf8'));
  } catch (error) {
    return {valid: false, errors: [{code: 'snapshot-unreadable', detail: error.message}], sourcePdfRegeneration: 'unavailable-in-CI'};
  }

  let historicalFrameDiagnostics = null;
  if (treeSelection === 'pinned-git-commit') {
    try { historicalFrameDiagnostics = sealedHistoricalContinuationInputs(summaryPath, fullPath, summaryBytes, compressed); }
    catch (error) { fail(errors, 'historical-continuation-not-sealed', error.message); }
  }

  const dataPath = path.join(root, 'dist/data.json');
  let treeMode = 'current-worktree';
  let readTreeFile = relativePath => readFileSync(path.join(root, relativePath));
  let treeFiles = () => listJsonFiles(path.join(root, 'dist'), 'scans');
  let treeAvailability = 'available';
  if (treeSelection === 'pinned-git-commit') {
    if (summary.input.sourceTreeMode !== 'pinned-git-commit') {
      fail(errors, 'historical-tree-not-declared', 'Pinned-history validation was requested, but the snapshot does not declare a pinned Git source tree.');
    } else try {
      const treeListing = execFileSync('git', ['ls-tree', '-r', '--name-only', summary.input.gitCommit, '--', 'dist'], {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
      if (!treeListing.includes('dist/data.json')) throw new Error('pinned commit does not contain dist/data.json');
      treeMode = 'pinned-git-tree';
      readTreeFile = relativePath => execFileSync('git', ['show', `${summary.input.gitCommit}:${relativePath}`], {cwd: root, maxBuffer: 150 * 1024 * 1024});
      treeFiles = () => treeListing.filter(file => file.startsWith('dist/scans/') && file.endsWith('.json')).map(file => file.slice('dist/'.length)).sort();
    } catch (error) {
      treeAvailability = `pinned-tree-unavailable: ${error.message}`;
      fail(errors, 'pinned-tree-unavailable', treeAvailability);
    }
  }
  const dataBytes = dataBytesOverride || readTreeFile('dist/data.json');
  let books;
  try { books = require(path.resolve(root, 'dist/books.js')); }
  catch (error) { fail(errors, 'source-identity-resolver-unavailable', `Could not load the shared book source-identity resolver: ${error.message}`); }
  if (sha256(dataBytes) !== summary.input.distDataRawFileSha256) fail(errors, 'stale-data-input', 'Current dist/data.json differs from the report input hash. Regenerate the current snapshot or validate the baseline against its pinned tree.');
  const data = JSON.parse(dataBytes.toString('utf8'));
  const manifestPath = path.join(root, 'research/citation-continuations.json');
  const manifestBytes = treeMode === 'pinned-git-tree' ? readTreeFile('research/citation-continuations.json') : existsSync(manifestPath) ? readFileSync(manifestPath) : null;
  if (manifestBytes && sha256(manifestBytes) !== summary.input.continuationManifestSha256) fail(errors, 'stale-continuation-manifest', 'The continuation manifest differs from the snapshot input hash.');
  const historyFixtureBytes = treeMode === 'pinned-git-tree' ? readTreeFile('tests/fixtures/citation-continuation-history.json') : existsSync(path.join(root, 'tests/fixtures/citation-continuation-history.json')) ? readFileSync(path.join(root, 'tests/fixtures/citation-continuation-history.json')) : null;
  if (!historyFixtureBytes || sha256(historyFixtureBytes) !== summary.input.historicalContinuationHistoryFixtureSha256) fail(errors, 'stale-historical-controls', 'The historical omission controls differ from the fixture used to generate this report, or the fixture is unavailable.');

  const catalogFiles = treeFiles();
  const catalogHashes = {};
  const catalogs = new Map();
  for (const relative of catalogFiles) {
    const catalogPath = relative;
    const bytes = catalogBytesOverride[catalogPath] || readTreeFile(`dist/${catalogPath}`);
    const hash = sha256(bytes);
    catalogHashes[catalogPath] = hash;
    try { catalogs.set(catalogPath, JSON.parse(bytes.toString('utf8'))); }
    catch { /* A hashed non-catalog JSON is kept in the file universe. */ }
    if (summary.exposedCatalogSummary.catalogHashesSha256?.[catalogPath] !== hash) fail(errors, 'stale-catalog-hash', `${catalogPath} differs from the catalog bytes pinned by the report.`);
  }
  const expectedHashMap = Object.fromEntries(Object.entries(catalogHashes).sort(([a], [b]) => a.localeCompare(b)));
  const canonicalHash = sha256(Buffer.from(JSON.stringify(expectedHashMap)));
  if (canonicalHash !== summary.input.catalogUniverseSha256) fail(errors, 'stale-catalog-universe', 'The catalog JSON file/hash universe differs from the report.');
  if (Object.keys(summary.exposedCatalogSummary.catalogHashesSha256 || {}).length !== Object.keys(catalogHashes).length) fail(errors, 'catalog-file-count-stale', 'The report catalog file denominator differs from current dist/scans.');

  const expected = expectedCatalogBindings(data, catalogs);
  const frameErrors = [];
  const frameFail = (code, detail) => { fail(errors, code, detail); frameErrors.push({code, detail}); };
  let currentFrameEvidence = null;
  if (treeSelection === 'current-worktree') {
    if (!books) frameFail('source-frame-resolver-unavailable', 'The shared source identity resolver is required for current source-frame validation.');
    else try {
      currentFrameEvidence = deriveCurrentFrameEvidence({root, data, books, catalogs, catalogHashes, expected});
      if (currentFrameEvidence.bridge.validation.status !== 'current-pins-match') frameFail('source-frame-registry-stale', 'The active source-frame registry does not match current owner/catalog/image pins.');
      if (!isDeepStrictEqual(full.sourceFrameCoordinateBridge, currentFrameEvidence.declaration)) frameFail('source-frame-declaration-stale', 'Full report is missing the exact active source-frame bridge declaration and resolution counts.');
      if (!isDeepStrictEqual(summary.sourceFrameCoordinateBridge, currentFrameEvidence.declaration)) frameFail('source-frame-summary-declaration-stale', 'Summary is missing the exact active source-frame bridge declaration and resolution counts.');
      const expectedRunMode = {status: 'current-active-source-frame-bridge-required'};
      if (!isDeepStrictEqual(full.runMode, expectedRunMode) || !isDeepStrictEqual(summary.runMode, expectedRunMode)) frameFail('source-frame-run-mode-invalid', 'Current continuation reports must explicitly use the active source-frame bridge mode.');
      if (summary.input.sourceFrameCoordinateBridgeSha256 !== SOURCE_FRAME_BRIDGE_SHA256 || full.input?.sourceFrameCoordinateBridgeSha256 !== SOURCE_FRAME_BRIDGE_SHA256 ||
          !isDeepStrictEqual(summary.input.sourceFrameRegistryValidation, currentFrameEvidence.bridge.validation) || !isDeepStrictEqual(full.input?.sourceFrameRegistryValidation, currentFrameEvidence.bridge.validation)) {
        frameFail('source-frame-input-pins-stale', 'Current continuation input does not bind the active source-frame registry validation.');
      }
      const actualGeneratorHash = sha256(readFileSync(path.join(root, 'tools/continuation-candidates.py')));
      if (summary.input.generatorSha256 !== actualGeneratorHash || full.input?.generatorSha256 !== actualGeneratorHash) frameFail('stale-continuation-generator', 'Current continuation output was not generated by the current source-frame-aware producer.');
      const expectedPrivateReplay = {status: 'current-pdf-boxes-match-registered-frames', frameGroups: 9, pdfPageBoxesValidated: 9};
      if (!isDeepStrictEqual(full.privatePdfFrameReplay, expectedPrivateReplay) || !isDeepStrictEqual(summary.privatePdfFrameReplay, expectedPrivateReplay)) frameFail('source-frame-private-pdf-replay-missing', 'Current continuation evidence must record successful replay of all nine registered PDF frames.');
    } catch (error) {
      frameFail('source-frame-current-validation-error', error.message);
    }
  }
  if (treeSelection === 'pinned-git-commit' && !historicalFrameDiagnostics) {
    frameFail('historical-continuation-not-sealed', 'Pinned-history mode requires the exact sealed diagnostic summary and full report.');
  }
  for (const bindingKey of ['sourceExcerpts', 'scanVerification']) {
    if ((summary.exposedCatalogSummary.catalogCountByBindingKey?.[bindingKey] || 0) !== (expected.bindingCounts[bindingKey] || 0)) fail(errors, 'catalog-binding-count-stale', `${bindingKey} binding count differs from exposed records.`);
    if ((summary.exposedCatalogSummary.regionBindingUsageCountsByBindingKey?.[bindingKey] || 0) !== (expected.regionCounts[bindingKey] || 0)) fail(errors, 'region-binding-usage-count-stale', `${bindingKey} region use count differs from exposed records.`);
  }
  const regionRows = full.regionAssessments || [];
  if (regionRows.length !== summary.exposedCatalogSummary.catalogRegionRows) fail(errors, 'catalog-region-row-count-stale', `Full report has ${regionRows.length} region rows; summary expects ${summary.exposedCatalogSummary.catalogRegionRows}.`);
  const regionSeen = new Set();
  const imageHashCache = new Map();
  for (const assessment of regionRows) {
    const catalogPath = assessment.owner?.catalog;
    const catalog = catalogs.get(catalogPath);
    if (!catalog) { fail(errors, 'region-owner-catalog-missing', `${catalogPath} is absent from dist/scans.`); continue; }
    const key = `${catalogPath}\0${assessment.regionId}`;
    if (regionSeen.has(key)) { fail(errors, 'duplicate-catalog-region-row', `${catalogPath}:${assessment.regionId} appears more than once.`); continue; }
    regionSeen.add(key);
    const region = catalog.regions?.find(item => item.id === assessment.regionId);
    if (!region) { fail(errors, 'stale-region-id', `${catalogPath}:${assessment.regionId} is absent from its owner catalog.`); continue; }
    if (region.book !== assessment.book || region.printedPage !== assessment.printedPage || region.pdfPage !== assessment.pdfPage) fail(errors, 'stale-region-location', `${catalogPath}:${assessment.regionId} source location changed.`);
    if (region.sha256 !== assessment.imageSha256) fail(errors, 'stale-image-hash', `${catalogPath}:${assessment.regionId} image hash changed.`);
    if (JSON.stringify(region.normalizedPageRect ?? null) !== JSON.stringify(assessment.normalizedPageRect ?? null)) fail(errors, 'stale-crop-geometry', `${catalogPath}:${assessment.regionId} crop geometry changed.`);
    const sourceIdentityProblems = regionSourceIdentityIssues({books, catalog, region, assessment, summary});
    for (const issue of sourceIdentityProblems) fail(errors, issue.code, `${catalogPath}:${assessment.regionId} ${issue.detail}`);
    const expectedUses = expected.uses.get(key) || [];
    const actualUses = assessment.bindingUses || [];
    if (JSON.stringify(expectedUses) !== JSON.stringify(actualUses)) fail(errors, 'stale-record-region-bindings', `${catalogPath}:${assessment.regionId} exposed record bindings changed.`);
    if (treeSelection === 'current-worktree' && currentFrameEvidence) {
      const expectedFrameAnnotations = currentFrameEvidence.annotationsByRegion.get(key) || [];
      if (!isDeepStrictEqual(assessment.coordinateFrameResolutions, expectedFrameAnnotations)) frameFail('source-frame-use-annotation-mismatch', `${catalogPath}:${assessment.regionId} lacks the exact current per-binding source-frame resolution annotations.`);
      const matched = expectedFrameAnnotations.filter(annotation => annotation.status === 'matched');
      const expectedBounds = matched.length === 1 ? matched[0].pdfPagePointsLTRB : null;
      if (!isDeepStrictEqual(assessment.coordinateFrameBoundsPdfPagePointsLTRB ?? null, expectedBounds)) frameFail('source-frame-registered-bounds-mismatch', `${catalogPath}:${assessment.regionId} has missing or incorrect registered PDF-page crop bounds.`);
      if (matched.length === 1 && assessment.geometry) {
        if (!isDeepStrictEqual(assessment.geometry.cropBoundsPdfPagePointsLTRB, expectedBounds)) frameFail('source-frame-word-geometry-window-mismatch', `${catalogPath}:${assessment.regionId} word-geometry candidates use a crop window outside the active registered frame.`);
      } else if (matched.length === 1 && assessment.textGeometryStatus === 'assessed') {
        frameFail('source-frame-word-geometry-window-missing', `${catalogPath}:${assessment.regionId} is assessed but does not expose the crop bounds used for its word-geometry candidates.`);
      } else if (matched.length === 0 && assessment.geometry && Object.hasOwn(assessment.geometry, 'cropBoundsPdfPagePointsLTRB')) {
        frameFail('source-frame-unregistered-window-claim', `${catalogPath}:${assessment.regionId} claims a registered crop projection outside the bounded registry.`);
      }
    }
    if (region.image && treeMode !== 'pinned-git-tree') {
      const imagePath = path.resolve(root, 'dist', path.dirname(catalogPath), region.image);
      const rel = path.relative(path.resolve(root, 'dist'), imagePath);
      if (rel.startsWith('..') || path.isAbsolute(rel)) fail(errors, 'unsafe-image-path', `${catalogPath}:${assessment.regionId} image path escapes dist.`);
      else if (!imageHashCache.has(imagePath)) {
        if (!existsSync(imagePath)) imageHashCache.set(imagePath, null);
        else imageHashCache.set(imagePath, sha256(readFileSync(imagePath)));
      }
      const bytesHash = imageHashCache.get(imagePath);
      if (bytesHash !== null && bytesHash !== region.sha256) fail(errors, 'image-bytes-stale', `${catalogPath}:${assessment.regionId} PNG bytes differ from their recorded image hash.`);
      if (bytesHash === null) fail(errors, 'image-file-missing', `${catalogPath}:${assessment.regionId} image file is missing.`);
    }
  }

  for (const key of expected.uses.keys()) if (!regionSeen.has(key)) fail(errors, 'current-region-assessment-missing', key.replace('\0', ':'));
  for (const key of regionSeen) if (!expected.uses.has(key)) fail(errors, 'unexpected-region-assessment', key.replace('\0', ':'));

  if (full.input.distDataRawFileSha256 !== summary.input.distDataRawFileSha256 || full.input.continuationManifestSha256 !== summary.input.continuationManifestSha256 || full.input.catalogUniverseSha256 !== summary.input.catalogUniverseSha256) fail(errors, 'full-summary-input-mismatch', 'Full report and public summary refer to different data/catalog/continuation inputs.');
  const propertyStats = checkPropertyPointerInventory(full, data, errors);
  const actualMechanics = recomputeMechanics(data);
  const declaredMechanics = summary.exposedUniverse.propertyUniverse.mechanicsFieldDenominator;
  if (JSON.stringify(actualMechanics) !== JSON.stringify({records: declaredMechanics.records, totalFields: declaredMechanics.totalFields, byCollection: declaredMechanics.byCollection})) fail(errors, 'mechanics-field-denominator-stale', 'Mechanics fieldsFor denominator differs from the current exposed records.');

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      catalogFiles: Object.keys(catalogHashes).length,
      exposedCatalogBindings: expected.bindingCounts,
      regionBindingUses: expected.regionCounts,
      catalogRegionRows: regionRows.length,
      distinctSourcePageBindings: summary.exposedUniverse.uniqueSourcePageBindings,
      propertyRecords: propertyStats.records,
      propertyPointers: propertyStats.pointers,
      mechanicsFields: actualMechanics.totalFields,
      verifiedImageFiles: imageHashCache.size,
    },
    validationBase: treeMode,
    requestedValidationMode: treeSelection,
    pinnedTreeAvailability: treeAvailability,
    sourceFrameValidation: treeSelection === 'current-worktree'
      ? {status: 'current-active-source-frame-bridge-required', valid: frameErrors.length === 0, errors: frameErrors}
      : {status: historicalFrameDiagnostics ? historicalFrameDiagnostics.status : 'historical-sealed-diagnostics-rejected', currentValidation: 'not-applicable', sealedInputsVerified: Boolean(historicalFrameDiagnostics), sealedInputs: historicalFrameDiagnostics},
    sourcePdfRegeneration: 'unavailable-in-CI; local geometry snapshot is validated by input/source/catalog/image hashes, not regenerated from private PDFs',
  };
}

export function loadCurrentContinuationCandidateSnapshot({root = process.cwd()} = {}) {
  const pointerPath = 'research/current-continuation-candidate-snapshot.json';
  const pointerBytes = readFileSync(path.resolve(root, pointerPath));
  const pointer = JSON.parse(pointerBytes);
  if (pointer?.schemaVersion !== 1) throw Error('Unsupported current continuation snapshot pointer.');
  const loadPinned = (entry, label) => {
    if (!entry || typeof entry.path !== 'string' || path.isAbsolute(entry.path) || entry.path.includes('\\') || entry.path.split('/').some(part => !part || part === '.' || part === '..') || !/^[a-f0-9]{64}$/.test(entry.sha256 || '')) throw Error(`Invalid ${label} repository path/hash.`);
    const target = path.resolve(root, entry.path);
    const location = path.relative(realpathSync(root), realpathSync(target));
    if (location === '..' || location.startsWith(`..${path.sep}`) || path.isAbsolute(location)) throw Error(`${label} path escapes the repository.`);
    const bytes = readFileSync(target);
    if (sha256(bytes) !== entry.sha256) throw Error(`${label} bytes differ from the active pointer.`);
    return {...entry, absolutePath: target, bytes};
  };
  const summary = loadPinned(pointer.summary, 'Current continuation summary');
  const full = loadPinned(pointer.fullEvidence, 'Current continuation full report');
  const parsed = JSON.parse(summary.bytes);
  if (parsed.fullEvidence?.sha256 !== full.sha256 || typeof parsed.fullEvidence.path !== 'string' || path.resolve(path.dirname(summary.absolutePath), parsed.fullEvidence.path) !== full.absolutePath) throw Error('Current continuation summary/full report pair is disconnected.');
  return {summaryPath: summary.absolutePath, fullPath: full.absolutePath, summary: parsed, pointer: {path: pointerPath, sha256: sha256(pointerBytes)}};
}

function parseCli(argv) {
  const options = {repoRoot: process.cwd(), summary: null, full: null, outputDir: null, treeSelection: null, currentSnapshot: false};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--force-current-tree') options.treeSelection = 'current-worktree';
    else if (arg === '--allow-pinned-history') options.treeSelection = 'pinned-git-commit';
    else if (arg === '--current-snapshot') options.currentSnapshot = true;
    else if (['--repo-root', '--summary', '--full', '--output-dir'].includes(arg)) {
      const value = argv[++index];
      if (!value) throw new Error(`${arg} requires a path`);
      if (arg === '--repo-root') options.repoRoot = value;
      if (arg === '--summary') options.summary = value;
      if (arg === '--full') options.full = value;
      if (arg === '--output-dir') options.outputDir = value;
    } else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.help && !options.treeSelection) throw new Error('Choose exactly one of --force-current-tree or --allow-pinned-history.');
  if (options.treeSelection && argv.includes('--force-current-tree') && argv.includes('--allow-pinned-history')) throw new Error('Choose only one validation tree mode.');
  if (options.currentSnapshot && (options.summary || options.full || options.treeSelection !== 'current-worktree')) throw new Error('--current-snapshot requires --force-current-tree and cannot use --summary, --full or pinned history.');
  if (!options.help && ((!options.summary && !options.currentSnapshot) || !options.outputDir)) throw new Error('--summary or --current-snapshot, and --output-dir, are required.');
  return options;
}

function validationMarkdown(result, paths) {
  const rows = [
    '# Continuation snapshot validation', '',
    `- Result: **${result.valid ? 'valid' : 'stale or invalid'}**`,
    `- Requested tree mode: \`${result.requestedValidationMode}\``,
    `- Validation base: \`${result.validationBase}\``,
    `- Summary: \`${paths.summary}\``,
    `- Numeric report: \`${paths.full}\``,
    `- Source-PDF regeneration: ${result.sourcePdfRegeneration}`, '',
  ];
  if (result.errors.length) {
    rows.push('## Findings', '');
    for (const error of result.errors) rows.push(`- \`${error.code}\`: ${error.detail}`);
    rows.push('');
  } else {
    rows.push('Input hashes, exposed catalog bindings, crop geometry, and property-pointer denominators match the selected tree.', '');
  }
  if (result.counts) rows.push(`Validated ${result.counts.catalogFiles} catalog files, ${result.counts.catalogRegionRows} region rows, ${result.counts.propertyPointers} property pointers, and ${result.counts.mechanicsFields} tracked mechanics fields.`, '');
  return rows.join('\n');
}

function runCli(argv) {
  let options;
  try { options = parseCli(argv); }
  catch (error) {
    process.stderr.write(`${error.message}\nUsage: node tools/continuation-candidates-validate.mjs (--current-snapshot|--summary <summary.json> [--full <numeric.json.gz>]) --output-dir <dir> (--force-current-tree|--allow-pinned-history) [--repo-root <dir>]\n`);
    return 2;
  }
  if (options.help) {
    process.stdout.write('Usage: node tools/continuation-candidates-validate.mjs (--current-snapshot|--summary <summary.json> [--full <numeric.json.gz>]) --output-dir <dir> (--force-current-tree|--allow-pinned-history) [--repo-root <dir>]\n');
    return 0;
  }
  const root = path.resolve(options.repoRoot);
  let summaryPath, fullPath, summary, selection = null;
  try {
    if (options.currentSnapshot) {
      selection = loadCurrentContinuationCandidateSnapshot({root});
      ({summaryPath, fullPath, summary} = selection);
    } else {
      summaryPath = path.resolve(root, options.summary);
      summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
      fullPath = options.full ? path.resolve(root, options.full) : path.resolve(path.dirname(summaryPath), summary.fullEvidence?.path || '');
    }
  }
  catch (error) {
    process.stderr.write(`Unable to read summary JSON: ${error.message}\n`);
    return 2;
  }
  const outputDir = path.resolve(root, options.outputDir);
  const result = validateContinuationSnapshot({root, summaryPath, fullPath, treeSelection: options.treeSelection});
  mkdirSync(outputDir, {recursive: true});
  const summaryCopy = path.join(outputDir, path.basename(summaryPath));
  const fullCopy = path.join(outputDir, path.basename(fullPath));
  if (existsSync(summaryPath)) copyFileSync(summaryPath, summaryCopy);
  if (existsSync(fullPath)) copyFileSync(fullPath, fullCopy);
  const artifact = {
    schemaVersion: 1,
    summary: path.basename(summaryCopy),
    fullEvidence: path.basename(fullCopy),
    ...(selection ? {currentSnapshotPointer: selection.pointer} : {}),
    ...result,
  };
  const validationPath = path.join(outputDir, 'validation.json');
  const markdownPath = path.join(outputDir, 'validation.md');
  writeFileSync(validationPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(markdownPath, validationMarkdown(result, {summary: path.basename(summaryPath), full: path.basename(fullPath)}));
  process.stdout.write(`${JSON.stringify({valid: result.valid, validationBase: result.validationBase, errors: result.errors.length, outputDir, validationPath})}\n`);
  return result.valid ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = runCli(process.argv.slice(2));
}
