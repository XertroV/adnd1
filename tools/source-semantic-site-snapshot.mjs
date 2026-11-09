#!/usr/bin/env node
// Private, capture-only inventory of each direct reference owner as the shipped app
// renders it. The browser loads the committed app, except for one in-memory hook that
// exposes the app's own closure-local index and search renderer to this audit.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const gzipAsync = promisify(zlib.gzip);
const require = createRequire(import.meta.url);
const toolPath = fileURLToPath(import.meta.url);
const toolDir = path.dirname(toolPath);
const DEFAULT_REPO = path.resolve(toolDir, '..');
const PRIORITY_COLLECTIONS = ['classes', 'rules', 'matrices'];
const OWNER_COLLECTIONS = ['classes', 'rules', 'matrices', 'spells', 'equipment'];
const CAPTURE_HOOK_NAME = '__sourceSemanticSnapshotCapture';
const INIT_ANCHOR = 'buildIndex();updateCounts();route({force:true});revealInitialReference();';
const CAPTURE_HOOK = `globalThis.${CAPTURE_HOOK_NAME}=Object.freeze({
 index:()=>index.map(item=>({collection:item._view,id:item.id,title:item._title||'',subtitle:item._subtitle||'',bookName:item._bookName||'',searchText:item._search||'',aliases:[...(item._aliases||[])],acronyms:[...(item._acronyms||[])]})),
 loadedDataSha256:()=>loadedDataSha256,
 titleSearchProbes:()=>{const savedLimit=commandLimit,savedIndex=commandIndex,probes=[];commandLimit=18;for(const target of index){const query=target._title||target.name||target.title||'';renderCommands(query);const rank=commandMatches.findIndex(item=>item._view===target._view&&item.id===target.id);const visible=rank>=0&&rank<commandRows.length;const row=visible?document.querySelector('[data-command-index="'+rank+'"]'):null;probes.push({collection:target._view,id:target.id,query,totalMatches:commandMatches.length,selfRank:rank,visibleInInitial18:visible,resultText:row?.innerText||null,resultType:row?.querySelector('.result-type')?.innerText||null});}commandLimit=savedLimit;commandIndex=savedIndex;renderCommands('');return probes;}
});`;

function fail(message) { throw new Error(message); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function stableRecordHash(value) { return sha256(Buffer.from(JSON.stringify(value), 'utf8')); }
function parseArgs(argv) {
  const args = {repo: DEFAULT_REPO};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') return {help: true};
    if (!arg.startsWith('--')) fail(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (!['repo', 'output', 'summary', 'chromium'].includes(key)) fail(`Unknown option: ${arg}`);
    const value = argv[++i];
    if (!value) fail(`Missing value for ${arg}`);
    args[key] = value;
  }
  if (!args.output || !args.summary) fail('Required: --output PRIVATE.json.gz --summary PRIVATE-summary.json');
  args.repo = path.resolve(args.repo);
  args.output = path.resolve(args.output);
  args.summary = path.resolve(args.summary);
  if (args.output === args.summary) fail('--output and --summary must be different files');
  if (args.output.startsWith(args.repo + path.sep) || args.summary.startsWith(args.repo + path.sep)) {
    fail('Full rendered text is private: output and summary must be outside the repository.');
  }
  return args;
}

function ownerRecords(data) {
  const result = [];
  for (const collection of PRIORITY_COLLECTIONS) {
    for (const record of Array.isArray(data[collection]) ? data[collection] : []) {
      result.push({collection, id: String(record?.id ?? ''), route: `#${collection}/${encodeURIComponent(String(record?.id ?? ''))}`, record});
    }
  }
  if (data.progressionExplainer && typeof data.progressionExplainer === 'object') {
    const record = data.progressionExplainer;
    result.push({collection: 'progressionExplainer', id: String(record.id ?? 'progression-explainer'), route: `#progressionExplainer/${encodeURIComponent(String(record.id ?? 'progression-explainer'))}`, record});
  }
  for (const collection of ['spells', 'equipment']) {
    for (const record of Array.isArray(data[collection]) ? data[collection] : []) {
      result.push({collection, id: String(record?.id ?? ''), route: `#${collection}/${encodeURIComponent(String(record?.id ?? ''))}`, record});
    }
  }
  return result;
}

function publicRuntimePins(repo) {
  const dist = path.join(repo, 'dist');
  const files = ['index.html', 'app.js', 'search.js', 'books.js', 'citations.js', 'combat.js', 'source-viewer.js', 'styles.css', 'source-viewer.css', 'data.json'];
  return Object.fromEntries(files.map(file => {
    const bytes = fs.readFileSync(path.join(dist, file));
    return [file, {sha256: sha256(bytes), bytes: bytes.length}];
  }));
}

function instrumentApp(source) {
  const occurrences = source.split(INIT_ANCHOR).length - 1;
  if (occurrences !== 1) fail(`Expected one exact app initialization anchor; found ${occurrences}. Refusing broad instrumentation.`);
  return source.replace(INIT_ANCHOR, `${INIT_ANCHOR}${CAPTURE_HOOK}`);
}

function createStaticServer(distDir, instrumentedApp) {
  const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png'], ['.webp', 'image/webp'], ['.svg', 'image/svg+xml'],
  ]);
  const server = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const relative = pathname.replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(distDir, relative);
      if (file !== distDir && !file.startsWith(distDir + path.sep)) { res.writeHead(400); res.end('Bad path'); return; }
      const body = relative === 'app.js' ? instrumentedApp : fs.readFileSync(file);
      res.writeHead(200, {'content-type': mime.get(path.extname(file)) || 'application/octet-stream', 'cache-control': 'no-store'});
      res.end(body);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500, {'content-type': 'text/plain; charset=utf-8'});
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Static audit server error');
    }
  });
  return server;
}

function pointerSegment(segment) { return String(segment).replaceAll('~', '~0').replaceAll('/', '~1'); }
function enumerateLeaves(value, pointer = '') {
  if (Array.isArray(value)) {
    if (!value.length) return [{pointer, valueType: 'empty-array', value: null}];
    return value.flatMap((child, index) => enumerateLeaves(child, `${pointer}/${index}`));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return [{pointer, valueType: 'empty-object', value: null}];
    return entries.flatMap(([key, child]) => enumerateLeaves(child, `${pointer}/${pointerSegment(key)}`));
  }
  return [{pointer: pointer || '/', valueType: value === null ? 'null' : typeof value, value}];
}

function normalizeForLiteralMatch(value) {
  return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function prepareHaystack(haystack) {
  const raw = String(haystack ?? '');
  return {raw, rawLower: raw.toLowerCase(), normalized: normalizeForLiteralMatch(raw)};
}
function literalPresencePrepared(value, prepared) {
  if (value === null || value === undefined || typeof value === 'boolean') return {assessable: false, matched: false, reason: 'non-textual-value'};
  const options = [];
  if (typeof value === 'number') {
    options.push(String(value));
    if (Number.isFinite(value)) options.push(value.toLocaleString('en-US'));
  } else if (typeof value === 'string') options.push(value);
  else return {assessable: false, matched: false, reason: 'unsupported-value-type'};
  for (const candidate of options) {
    if (typeof candidate === 'string' && candidate.length >= 10 && /\s/.test(candidate) && prepared.rawLower.includes(candidate.toLowerCase())) {
      return {assessable: true, matched: true, method: 'literal-exact'};
    }
    const needle = normalizeForLiteralMatch(candidate);
    if (!needle) {
      if (prepared.rawLower.includes(String(candidate).toLowerCase())) return {assessable: true, matched: true, method: 'literal-symbol'};
      continue;
    }
    if (needle.length < 3) {
      if (prepared.rawLower.includes(String(candidate).toLowerCase())) return {assessable: false, matched: true, method: 'weak-short-literal'};
      continue;
    }
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '\\s+');
    if (new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'u').test(prepared.normalized)) return {assessable: true, matched: true, method: 'normalized-token-sequence'};
  }
  return {assessable: options.some(candidate => normalizeForLiteralMatch(candidate).length >= 3), matched: false, method: 'literal-not-found'};
}
function literalPresence(value, haystack) { return literalPresencePrepared(value, prepareHaystack(haystack)); }

function canonicalPointer(pointer) { return pointer.replace(/\/(?:0|[1-9][0-9]*)(?=\/|$)/g, '/*'); }
function fieldProjection(record, rendered, searchText, controlAttributeText) {
  const rows = [];
  const surfaces = {
    visibleText: prepareHaystack(rendered.visibleText),
    textContent: prepareHaystack(rendered.textContent),
    searchText: prepareHaystack(searchText),
    controlAttributes: prepareHaystack(controlAttributeText),
  };
  for (const leaf of enumerateLeaves(record)) {
    if (leaf.valueType === 'empty-array' || leaf.valueType === 'empty-object' || leaf.valueType === 'null') {
      rows.push({pointer: leaf.pointer, fieldPattern: canonicalPointer(leaf.pointer), valueType: leaf.valueType, assessable: false, visibleText: false, domText: false, searchText: false, sourceControlAttributes: false, classification: 'no-text-leaf'});
      continue;
    }
    const visible = literalPresencePrepared(leaf.value, surfaces.visibleText);
    const dom = literalPresencePrepared(leaf.value, surfaces.textContent);
    const search = literalPresencePrepared(leaf.value, surfaces.searchText);
    const attrs = literalPresencePrepared(leaf.value, surfaces.controlAttributes);
    const searchable = search.assessable && search.matched;
    const visibleText = visible.assessable && visible.matched;
    const domText = dom.assessable && dom.matched;
    const controlAttrs = attrs.assessable && attrs.matched;
    let classification;
    if (visibleText) classification = 'visible-text-literal-present';
    else if (domText) classification = 'dom-text-only-or-not-visible';
    else if (searchable && controlAttrs) classification = 'search-index-and-control-attribute-only';
    else if (searchable) classification = 'search-index-only-literal';
    else if (controlAttrs) classification = 'source-control-attribute-only';
    else if (!visible.assessable || !dom.assessable || !search.assessable) classification = 'literal-test-unassessable-or-short';
    else classification = 'literal-value-not-found-in-rendered-text-or-search';
    rows.push({
      pointer: leaf.pointer, fieldPattern: canonicalPointer(leaf.pointer), valueType: leaf.valueType,
      assessable: visible.assessable && dom.assessable && search.assessable,
      visibleText: visibleText, domText: domText, searchText: searchable, sourceControlAttributes: controlAttrs,
      classification,
    });
  }
  return rows;
}

function aggregateFieldCoverage(records) {
  const grouped = new Map();
  for (const row of records) {
    const key = `${row.collection}\0${row.fieldPattern}`;
    const item = grouped.get(key) || {collection: row.collection, fieldPattern: row.fieldPattern, occurrences: 0, assessableOccurrences: 0, visibleTextOccurrences: 0, domTextOccurrences: 0, searchTextOccurrences: 0, sourceControlAttributeOccurrences: 0, literalAbsentFromVisibleAndSearch: 0, literalAbsentFromDomAndSearchAndControls: 0, classifications: {}};
    item.occurrences++;
    if (row.assessable) item.assessableOccurrences++;
    if (row.visibleText) item.visibleTextOccurrences++;
    if (row.domText) item.domTextOccurrences++;
    if (row.searchText) item.searchTextOccurrences++;
    if (row.sourceControlAttributes) item.sourceControlAttributeOccurrences++;
    if (row.assessable && !row.visibleText && !row.searchText) item.literalAbsentFromVisibleAndSearch++;
    if (row.assessable && !row.domText && !row.searchText && !row.sourceControlAttributes) item.literalAbsentFromDomAndSearchAndControls++;
    item.classifications[row.classification] = (item.classifications[row.classification] || 0) + 1;
    grouped.set(key, item);
  }
  return [...grouped.values()].sort((a, b) => a.collection.localeCompare(b.collection) || a.fieldPattern.localeCompare(b.fieldPattern));
}

function summarizeCapture(records, ownerList, pins, runtimeChecks) {
  const byCollection = {};
  for (const owner of ownerList) byCollection[owner.collection] = (byCollection[owner.collection] || 0) + 1;
  const fieldRows = records.flatMap(record => (record.fieldProjection || []).map(row => ({collection: record.collection, ...row})));
  const fieldCoverage = aggregateFieldCoverage(fieldRows);
  const routeErrors = records.filter(record => !record.rendering?.directRouteMatches || record.captureError);
  const searchProbed = records.filter(record => record.publicSearch?.titleSearch);
  const searchMisses = searchProbed.filter(record => !record.publicSearch.titleSearch.selfMatched);
  const controlTotals = records.reduce((sum, record) => {
    const controls = record.rendering?.sourceControls || [];
    sum.total += controls.length;
    sum.visible += controls.filter(control => control.visible).length;
    sum.hidden += controls.filter(control => !control.visible).length;
    sum.pending += controls.filter(control => control.kind === 'source-pending').length;
    sum.pageButtons += controls.filter(control => control.kind === 'page-source-button').length;
    sum.inlineButtons += controls.filter(control => control.kind === 'inline-source-button').length;
    sum.originalScanButtons += controls.filter(control => control.kind === 'original-scan-button').length;
    return sum;
  }, {total: 0, visible: 0, hidden: 0, pending: 0, pageButtons: 0, inlineButtons: 0, originalScanButtons: 0});
  const leafCounts = fieldRows.reduce((sum, row) => {
    sum.total++;
    if (row.assessable) sum.assessable++;
    if (row.assessable && !row.visibleText && !row.searchText) sum.literalAbsentFromVisibleAndSearch++;
    if (row.assessable && !row.domText && !row.searchText && !row.sourceControlAttributes) sum.literalAbsentFromDomSearchAndControls++;
    if (!row.assessable) sum.unassessable++;
    return sum;
  }, {total: 0, assessable: 0, literalAbsentFromVisibleAndSearch: 0, literalAbsentFromDomSearchAndControls: 0, unassessable: 0});
  const negativeFields = fieldCoverage.filter(field => field.literalAbsentFromVisibleAndSearch > 0 || field.literalAbsentFromDomAndSearchAndControls > 0);
  return {
    schemaVersion: 1,
    reportType: 'public metadata only; no captured source/data prose',
    captureMode: 'capture-only browser instrumentation over the committed local app; route renderer and search implementation execute from the app bundle',
    input: {commit: runtimeChecks.commit, dirty: runtimeChecks.dirty, runtimePins: pins},
    denominators: {ownerRoutes: ownerList.length, ownersByCollection: byCollection, routesAttempted: records.length, directOwnerRouteErrors: routeErrors.length, publicSearchDocsExpected: ownerList.length, publicSearchDocsCaptured: records.filter(record => record.publicSearch?.documentCaptured).length},
    rendering: {detailRecordsFound: records.filter(record => record.rendering?.directRouteMatches).length, detailRootExists: records.filter(record => record.rendering?.detailRootExists).length, visibleDetailRoots: records.filter(record => record.rendering?.detailRootVisible).length, detailTextNonempty: records.filter(record => Boolean(record.rendering?.innerText?.trim())).length, sourceViewerOpened: 0, sourceViewerOpeningNotAttempted: true},
    search: {titleQueryProbes: searchProbed.length, titleQueriesExpected: ownerList.length, selfMatched: searchProbed.length - searchMisses.length, selfMisses: searchMisses.length, initiallyVisibleTop18: searchProbed.filter(record => record.publicSearch.titleSearch.visibleInInitial18).length},
    sourceControls: controlTotals,
    leafProjectionLiteralAudit: {...leafCounts, fieldPatterns: fieldCoverage.length, fieldPatternsWithLiteralAbsence: negativeFields.length, notice: 'Value-literal matching is a detector for review, not a semantic proof. It checks actual detail visibleText/textContent, actual rendered source-control data attributes, and the app-built public search text.'},
    knownNegativeFieldPatterns: negativeFields.map(field => ({collection: field.collection, fieldPattern: field.fieldPattern, occurrences: field.occurrences, literalAbsentFromVisibleAndSearch: field.literalAbsentFromVisibleAndSearch, literalAbsentFromDomAndSearchAndControls: field.literalAbsentFromDomAndSearchAndControls})),
    knownNegativeOwners: {directRouteErrors: routeErrors.length, titleQueryNotSelfMatched: searchMisses.length},
    browserErrors: runtimeChecks.pageErrors.length,
    failedRequests: runtimeChecks.failedRequests.length,
    claimsBoundary: ['This capture inventories currently exposed owner records and app projections; it does not approve extraction accuracy or source support.', 'Source pages are not opened. Controls are inventoried as controls; a cited page image is not treated as rendered evidence.', 'Literal matching may miss formatted or transformed values and may match coincidental repeated tokens; private record-level results preserve enough context for source-first review.'],
  };
}

function buildRecords(ownerList, captured, indexMap, probeMap, {includeFieldProjection = true} = {}) {
  const capturedByKey = new Map(captured.map(item => [`${item.collection}:${item.id}`, item]));
  return ownerList.map(owner => {
    const key = `${owner.collection}:${owner.id}`;
    const observed = capturedByKey.get(key);
    const search = indexMap.get(key);
    const titleSearch = probeMap.get(key);
    if (!observed || !search) {
      return {collection: owner.collection, id: owner.id, route: owner.route, sourceRecordHash: stableRecordHash(owner.record), sourceRecord: owner.record, captureError: !observed ? 'direct-route-capture-missing' : 'actual-search-index-document-missing', rendering: observed?.rendering || null, publicSearch: search ? {documentCaptured: true, ...search, ...(titleSearch ? {titleSearch: {...titleSearch, selfMatched: titleSearch.selfRank >= 0}} : {})} : {documentCaptured: false}};
    }
    const visibleText = observed.rendering?.innerText || '';
    const textContent = observed.rendering?.textContent || '';
    const searchText = search.searchText || '';
    const fieldRows = includeFieldProjection ? fieldProjection(owner.record, {visibleText, textContent}, searchText, observed.rendering?.controlAttributeText || '') : null;
    const directRouteMatches = observed.renderedRoute === owner.route && observed.rendering?.detailAnnotationTarget === owner.id;
    return {
      collection: owner.collection, id: owner.id, route: owner.route,
      sourceRecordHash: stableRecordHash(owner.record), sourceRecord: owner.record,
      rendering: {...observed.rendering, routeHashMatched: observed.renderedRoute === owner.route, directRouteMatches, controlAttributeText: undefined},
      publicSearch: {documentCaptured: true, ...search, ...(titleSearch ? {titleSearch: {...titleSearch, selfMatched: titleSearch.selfRank >= 0}} : {})},
      ...(fieldRows ? {fieldProjection: fieldRows} : {fieldProjectionStatus: 'not computed in priority handoff snapshot'}),
    };
  });
}

function snapshotBytes(snapshot) {
  return gzipAsync(Buffer.from(JSON.stringify(snapshot)), {level: 9, mtime: 0});
}

function makeBundle(records, allOwners, pins, runtimeChecks, captureMeta) {
  const summary = summarizeCapture(records, allOwners, pins, runtimeChecks);
  const fieldRows = records.flatMap(record => (record.fieldProjection || []).map(row => ({collection: record.collection, ...row})));
  summary.capture = captureMeta;
  summary.fieldCoverage = aggregateFieldCoverage(fieldRows);
  summary.errors = {
    pageErrors: runtimeChecks.pageErrors,
    failedRequests: runtimeChecks.failedRequests,
    missingRouteOwners: records.filter(record => !record.rendering?.directRouteMatches).map(record => ({collection: record.collection, id: record.id, route: record.route, renderedTarget: record.rendering?.detailAnnotationTarget || null, routeHashMatched: record.rendering?.routeHashMatched ?? false, error: record.captureError || 'expected owner did not render on its collection-qualified route'})),
    missingSearchOwners: records.filter(record => record.publicSearch?.titleSearch && !record.publicSearch.titleSearch.selfMatched).map(record => ({collection: record.collection, id: record.id, route: record.route, title: record.publicSearch.titleSearch.query || null, rank: record.publicSearch.titleSearch.selfRank ?? null})),
  };
  return {
    summary,
    snapshot: {
      schemaVersion: 1,
      artifactType: 'private full rendered/search/source-control snapshot; never publish this compressed payload',
      capture: captureMeta,
      denominators: summary.denominators,
      errors: summary.errors,
      records,
    },
  };
}

async function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, data, {flag: 'wx'});
  fs.renameSync(temporary, file);
}

function assertFreshOutputs(files) {
  for (const file of files) {
    if (fs.existsSync(file)) fail(`Refusing to overwrite an existing capture output: ${file}. Choose new output paths; previous evidence must remain available.`);
  }
}

async function writeVersionedCheckpoint(file, data) {
  const digest = sha256(data);
  const archive = `${file}.sha256-${digest}`;
  fs.mkdirSync(path.dirname(archive), {recursive: true});
  try {
    fs.writeFileSync(archive, data, {flag: 'wx'});
  } catch (error) {
    if (error.code !== 'EEXIST' || !fs.readFileSync(archive).equals(data)) throw error;
  }
  await atomicWrite(file, data);
  return {path: archive, sha256: digest, bytes: data.length};
}

export {aggregateFieldCoverage, assertFreshOutputs, canonicalPointer, enumerateLeaves, fieldProjection, instrumentApp, literalPresence, normalizeForLiteralMatch, ownerRecords, parseArgs, writeVersionedCheckpoint};

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node tools/source-semantic-site-snapshot.mjs --repo DIR --output PRIVATE.json.gz --summary PRIVATE-summary.json [--chromium PATH]');
    return;
  }
  assertFreshOutputs([args.output, args.summary]);
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/workspace/adnd1-devtools/node_modules/playwright');
  const repo = args.repo;
  const distDir = path.join(repo, 'dist');
  const dataPath = path.join(distDir, 'data.json');
  const appPath = path.join(distDir, 'app.js');
  const rawData = fs.readFileSync(dataPath);
  const data = JSON.parse(rawData);
  const owners = ownerRecords(data);
  const ownerKeys = owners.map(owner => `${owner.collection}:${owner.id}`);
  if (new Set(ownerKeys).size !== owners.length) fail('Owner collection/id keys are not unique in this snapshot input.');
  const originalApp = fs.readFileSync(appPath, 'utf8');
  const instrumentedApp = instrumentApp(originalApp);
  const git = (command) => require('node:child_process').execFileSync('git', ['-C', repo, ...command], {encoding: 'utf8'}).trim();
  const commit = git(['rev-parse', 'HEAD']);
  const dirty = Boolean(git(['status', '--porcelain']));
  const pins = publicRuntimePins(repo);
  const server = createStaticServer(distDir, instrumentedApp);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({executablePath: args.chromium || process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const pageErrors = [], failedRequests = [];
  const captured = [];
  const checkpointArtifacts = [];
  let indexMap = new Map();
  let probeMap = new Map();
  let browserLoaded = null;
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => failedRequests.push({url: request.url(), error: request.failure()?.errorText || 'request failed'}));
    await page.goto(origin + '/index.html', {waitUntil: 'networkidle', timeout: 90000});
    await page.waitForFunction(name => Boolean(window[name]), CAPTURE_HOOK_NAME, {timeout: 30000});
    const boot = await page.evaluate(name => ({
      hookPresent: Boolean(window[name]),
      loadedDataSha256: window[name]?.loadedDataSha256?.(),
      index: window[name]?.index?.() || [],
    }), CAPTURE_HOOK_NAME);
    if (!boot.hookPresent) fail('Capture hook was not initialized by the actual app.');
    indexMap = new Map(boot.index.map(item => [`${item.collection}:${item.id}`, item]));
    if (boot.index.length !== owners.length) fail(`App-built index has ${boot.index.length} items; input has ${owners.length} owners.`);
    const actualDataSha = sha256(Buffer.from(JSON.stringify(data), 'utf8'));
    if (boot.loadedDataSha256 !== actualDataSha) fail('The data object loaded by the app differs from the snapshot input object.');
    browserLoaded = {loadedDataSha256: boot.loadedDataSha256, indexCount: boot.index.length, titleProbeCount: 0};

    const priorityCount = owners.filter(owner => PRIORITY_COLLECTIONS.includes(owner.collection) || owner.collection === 'progressionExplainer').length;
    const makeCaptureMeta = (complete, capturedCount) => {
      const pendingByCollection = {};
      for (const owner of owners.slice(capturedCount)) pendingByCollection[owner.collection] = (pendingByCollection[owner.collection] || 0) + 1;
      return {
        generatedAt: new Date().toISOString(), localOrigin: origin, captureComplete: complete, fieldProjectionComplete: complete,
        fieldProjectionMethod: 'Exact raw value substring first; normalized whole-token sequence fallback. The app-visible detail innerText, actual detail textContent (including closed details), public search text, and source-control data attributes are compared independently. This is a literal detector, not semantic proof.',
        recordsCaptured: capturedCount, recordsRemaining: owners.length - capturedCount, pendingOwnersByCollection: pendingByCollection,
        browserLoaded,
        instrumentation: {
          target: 'dist/app.js, served in-memory only', originalSha256: sha256(Buffer.from(originalApp)), instrumentedSha256: sha256(Buffer.from(instrumentedApp)),
          exactAnchor: INIT_ANCHOR, anchorSha256: sha256(Buffer.from(INIT_ANCHOR)), insertedCode: CAPTURE_HOOK, insertedCodeSha256: sha256(Buffer.from(CAPTURE_HOOK)),
          scope: 'Adds one window hook after successful initialize() calls. It reads the closure-local app-built index and invokes the app renderCommands(query) for each owner title. It does not alter data, renderer functions, search scoring, routes, CSS, or production files.',
          unchangedBrowserClaim: false,
        },
        crawl: {strategy: 'single local SPA, collection-qualified hash routes changed by history.replaceState and dispatched to the actual app hashchange route listener; records captured in batches capped at 40 and priority classes/rules/matrices/progression captured first', viewport: {width: 1440, height: 1000}, sourceViewerOpened: false},
        sourceDataSha256: sha256(rawData), sourceDataCanonicalJsonSha256: browserLoaded.loadedDataSha256,
      };
    };
    const writeBundle = async (recordCount, complete, {fieldProjectionComplete = false} = {}) => {
      const recordsNow = buildRecords(owners.slice(0, recordCount), captured.slice(0, recordCount), indexMap, probeMap, {includeFieldProjection: fieldProjectionComplete});
      const captureMeta = makeCaptureMeta(complete, recordCount);
      captureMeta.fieldProjectionComplete = fieldProjectionComplete;
      const bundle = makeBundle(recordsNow, owners, pins, {commit, dirty, pageErrors, failedRequests}, captureMeta);
      const snapshotBuffer = await snapshotBytes(bundle.snapshot);
      const summaryBuffer = Buffer.from(JSON.stringify(bundle.summary, null, 2) + '\n');
      checkpointArtifacts.push({snapshot: await writeVersionedCheckpoint(args.output, snapshotBuffer), summary: await writeVersionedCheckpoint(args.summary, summaryBuffer)});
      return {snapshotSha256: sha256(snapshotBuffer), snapshotBytes: snapshotBuffer.length, summarySha256: sha256(summaryBuffer), summaryBytes: summaryBuffer.length, bundle};
    };

    const batchSize = 40;
    let partialWritten = false;
    for (let offset = 0; offset < owners.length;) {
      const remainingPriority = offset < priorityCount ? priorityCount - offset : batchSize;
      const size = Math.min(batchSize, remainingPriority, owners.length - offset);
      const batch = owners.slice(offset, offset + size).map(({collection, id, route}) => ({collection, id, route}));
      const batchCaptured = await page.evaluate(async (items) => {
        const displayed = element => {
          if (!element) return false;
          for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
            if (node.hidden) return false;
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || style.contentVisibility === 'hidden') return false;
            if (node.tagName === 'DETAILS' && !node.open && !element.closest('summary')) return false;
          }
          return element.getClientRects().length > 0;
        };
        const attrs = element => Object.fromEntries([...element.attributes].filter(attribute => attribute.name.startsWith('data-') || ['aria-label','aria-expanded','href','class','disabled'].includes(attribute.name)).map(attribute => [attribute.name, attribute.value]));
        const controls = detail => [...detail.querySelectorAll('[data-source-id],[data-inline-source],[data-view-scans],.source-pending')].map(element => {
          const data = attrs(element);
          let targets = null;
          if (data['data-ref-targets']) { try { targets = JSON.parse(data['data-ref-targets']); } catch { targets = {parseError: true}; } }
          const kind = element.matches('[data-source-id]') ? 'page-source-button' : element.matches('[data-inline-source]') ? 'inline-source-button' : element.matches('[data-view-scans]') ? 'original-scan-button' : 'source-pending';
          return {kind, tagName: element.tagName.toLowerCase(), textContent: element.textContent || '', innerText: element.innerText || '', visible: displayed(element), attributes: data, parsedTargets: targets, viewerActivated: false};
        });
        const contexts = detail => [...detail.querySelectorAll('[data-source-context]')].map(element => ({
          tagName: element.tagName.toLowerCase(), visible: displayed(element), attributes: attrs(element),
          textContent: element.textContent || '', innerText: element.innerText || '',
        }));
        const detailState = (detail, expectedId) => {
          const root = detail.querySelector('.detail-card');
          const heading = root?.querySelector('.detail-header h2')?.innerText || root?.querySelector('h2')?.innerText || '';
          const collapsedDetails = [...detail.querySelectorAll('details:not([open])')].map(node => ({summary: node.querySelector('summary')?.innerText || '', textContent: node.textContent || '', visibleSummary: displayed(node.querySelector('summary'))}));
          const hiddenNodes = [...detail.querySelectorAll('[hidden]')].map(node => ({tagName: node.tagName.toLowerCase(), id: node.id || '', className: typeof node.className === 'string' ? node.className : '', textContent: node.textContent || ''}));
          const sourceControlList = controls(detail);
          const controlAttributeText = sourceControlList.flatMap(control => [...Object.values(control.attributes), ...(control.parsedTargets ? [JSON.stringify(control.parsedTargets)] : [])]).join(' ');
          return {
            detailRootExists: Boolean(root), detailRecordFound: Boolean(root) && root.getAttribute('data-annotation-target') === expectedId, detailRootVisible: displayed(root), detailAnnotationTarget: root?.getAttribute('data-annotation-target') || null, heading,
            innerText: detail.innerText || '', textContent: detail.textContent || '',
            collapsedDetails, hiddenNodes,
            sourceControls: sourceControlList, sourceContexts: contexts(detail),
            controlAttributeText,
            sourceViewerOpen: Boolean(document.querySelector('dialog.source-viewer[open]')),
          };
        };
        const result = [];
        for (const item of items) {
          const oldHash = location.hash;
          history.replaceState(null, '', item.route);
          window.dispatchEvent(new HashChangeEvent('hashchange', {oldURL: location.origin + oldHash, newURL: location.href}));
          const detail = document.querySelector('#referenceDetail');
          const state = detailState(detail, item.id);
          result.push({collection: item.collection, id: item.id, route: item.route, renderedRoute: location.hash, rendering: state});
        }
        return result;
      }, batch);
      captured.push(...batchCaptured);
      offset += batch.length;
      process.stdout.write(`Captured ${offset}/${owners.length} owner routes\n`);
      if (!partialWritten && offset === priorityCount) {
        const partial = await writeBundle(offset, false);
        partialWritten = true;
        process.stdout.write(`Wrote first priority-batch snapshot (${offset}/${owners.length}); sha256=${partial.snapshotSha256}\n`);
      }
    }
    const routeOnly = await writeBundle(owners.length, true, {fieldProjectionComplete: false});
    process.stdout.write(`Wrote all-owner rendered/search snapshot before field audit; sha256=${routeOnly.snapshotSha256}\n`);
    const probes = await page.evaluate(name => window[name].titleSearchProbes(), CAPTURE_HOOK_NAME);
    probeMap = new Map(probes.map(probe => [`${probe.collection}:${probe.id}`, probe]));
    if (probeMap.size !== owners.length) fail(`Actual title search probes cover ${probeMap.size} owners; expected ${owners.length}.`);
    browserLoaded.titleProbeCount = probes.length;
    await context.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  const records = buildRecords(owners, captured, indexMap, probeMap);
  const bundle = makeBundle(records, owners, pins, {commit, dirty, pageErrors, failedRequests}, {
    generatedAt: new Date().toISOString(), localOrigin: origin, captureComplete: true, fieldProjectionComplete: true,
    fieldProjectionMethod: 'Exact raw value substring first; normalized whole-token sequence fallback. The app-visible detail innerText, actual detail textContent (including closed details), public search text, and source-control data attributes are compared independently. This is a literal detector, not semantic proof.',
    recordsCaptured: records.length, recordsRemaining: Math.max(0, owners.length - records.length), pendingOwnersByCollection: {}, browserLoaded,
    instrumentation: {
      target: 'dist/app.js, served in-memory only', originalSha256: sha256(Buffer.from(originalApp)), instrumentedSha256: sha256(Buffer.from(instrumentedApp)),
      exactAnchor: INIT_ANCHOR, anchorSha256: sha256(Buffer.from(INIT_ANCHOR)), insertedCode: CAPTURE_HOOK, insertedCodeSha256: sha256(Buffer.from(CAPTURE_HOOK)),
      scope: 'Adds one window hook after successful initialize() calls. It reads the closure-local app-built index and invokes the app renderCommands(query) for each owner title. It does not alter data, renderer functions, search scoring, routes, CSS, or production files.',
      unchangedBrowserClaim: false,
    },
    crawl: {strategy: 'single local SPA, collection-qualified hash routes changed by history.replaceState and dispatched to the actual app hashchange route listener; records captured in batches capped at 40 and priority classes/rules/matrices/progression captured first', viewport: {width: 1440, height: 1000}, sourceViewerOpened: false},
    sourceDataSha256: sha256(rawData), sourceDataCanonicalJsonSha256: browserLoaded.loadedDataSha256,
  });
  const compressed = await snapshotBytes(bundle.snapshot);
  const summaryBytes = Buffer.from(JSON.stringify(bundle.summary, null, 2) + '\n');
  checkpointArtifacts.push({snapshot: await writeVersionedCheckpoint(args.output, compressed), summary: await writeVersionedCheckpoint(args.summary, summaryBytes)});
  const privateSummary = bundle.summary;
  const result = {
    schemaVersion: 1, reportType: 'metadata only; full rendered text is private',
    snapshotPath: args.output, snapshotSha256: sha256(compressed), snapshotBytes: compressed.length,
    privateSummaryPath: args.summary, privateSummarySha256: sha256(summaryBytes), privateSummaryBytes: summaryBytes.length,
    immutableCheckpoints: checkpointArtifacts,
    inputCommit: commit, inputDirty: dirty, dataSha256: sha256(rawData), owners: owners.length,
    directRoutesCaptured: records.filter(record => record.rendering?.directRouteMatches).length,
    publicSearchDocsCaptured: records.filter(record => record.publicSearch?.documentCaptured).length,
    titleQueriesSelfMatched: records.filter(record => record.publicSearch?.titleSearch?.selfMatched).length,
    sourceControls: privateSummary.sourceControls,
    literalProjectionNegativeCounts: privateSummary.leafProjectionLiteralAudit,
    browserErrors: pageErrors.length, failedRequests: failedRequests.length,
  };
  console.log(JSON.stringify(result, null, 2));
  if (records.length !== owners.length || privateSummary.denominators.directOwnerRouteErrors || privateSummary.denominators.publicSearchDocsCaptured !== owners.length || pageErrors.length || failedRequests.length) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === toolPath) {
  main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
