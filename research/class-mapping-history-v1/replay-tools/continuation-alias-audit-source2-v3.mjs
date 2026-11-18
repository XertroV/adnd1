// Source2 successor of the declared continuation-alias audit. Historical
// fixtures remain on the Source2 MM reader; current data/catalogs are read only
// after the genuine Source2 body map admits their physical bytes.
import {readFileSync as readHistoricalFileSync, assertHistoricalMmTestStage} from '../mm-replay-fs-source2-v3.mjs';
import {readFileSync as readPhysicalFileSync, lstatSync, realpathSync} from 'node:fs';
import {resolve, dirname, relative} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {assertCurrentClassMappingSource2Identity} from '../../class-mapping-source-epoch-v2/closed-historical-reader-source2-v2.mjs';
import {sourceRect} from './citation-context-contract.mjs';

const root = realpathSync(resolve(import.meta.dirname, '../../..'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
  : JSON.stringify(value);
const collections = ['rules', 'spells', 'equipment', 'matrices', 'classes', 'progressionExplainer'];
function records(data) {
  return collections.flatMap(collection => (Array.isArray(data[collection]) ? data[collection] : data[collection] ? [data[collection]] : []).map(item => ({collection, item})));
}
function currentSource2Proof() {
  const proof = assertCurrentClassMappingSource2Identity();
  const summary = proof?.summary;
  if (summary?.stage !== 'source2-body-native'
      || summary.sourceCommit !== '400f6e9d123d8a654b9b9af48133a2533506e73d'
      || summary.sourceTree !== '664c02504efcece25669d2f9c3fdb26437cd5b09'
      || summary.fixture?.path !== 'research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json'
      || summary.fixture?.sha256 !== 'a333c3920f5ec5d3dbdca4b32673dd22ba94c77807794103af3eb21af71b14c2'
      || !proof.inputHashes?.sourceBody || Object.keys(proof.inputHashes.sourceBody).length !== 3063
      || proof.inputHashes.sourceBody['dist/app.js'] !== '57eae6b440f2b75294ca6021adbcd9e29a43646a7a6177cc6800973b94f0b8c1'
      || proof.inputHashes.sourceBody['dist/data.json'] !== '16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573') {
    throw new Error('Exact genuine current Source2 identity and 3063-row body map required');
  }
  return proof;
}
function currentSource2Bytes(path, proof) {
  if (typeof path !== 'string' || path.startsWith('/') || path.split('/').includes('..')) throw new Error('Current Source2 read requires one fixed relative source path');
  const expected = proof.inputHashes.sourceBody[path];
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error(`Current Source2 body map does not admit ${path}`);
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  if (rel === '' || rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Current Source2 read escaped fixed repository root');
  const entry = lstatSync(absolute);
  if (!entry.isFile() || entry.isSymbolicLink() || realpathSync(absolute) !== absolute) throw new Error(`Current Source2 source must be a regular non-symlink file: ${path}`);
  const bytes = readPhysicalFileSync(absolute);
  if (hash(bytes) !== expected) throw new Error(`Physical current Source2 bytes differ from the admitted body map: ${path}`);
  return bytes;
}
function currentBooks(proof) {
  const path = resolve(root, 'dist/books.js');
  currentSource2Bytes('dist/books.js', proof);
  const require = createRequire(import.meta.url);
  return require(path);
}

export function resolveAliasRegionIdentity(catalog, region, books) {
  const bounds = sourceRect(region?.normalizedPageRect);
  if (!catalog || typeof catalog !== 'object' || !region || typeof region !== 'object' || !bounds || !/^[a-f0-9]{64}$/.test(region.sha256 || '')) return null;
  const resolved = books.resolveRegionSourceIdentity(catalog, region);
  // Preserve the ordinary PDF identity exactly; the resolver confirms its
  // canonical source hash/page mapping before this identity is accepted.
  if (resolved?.valid && resolved.sourceKind === 'pdf') {
    return {key: canonical({book: region.book, printedPage: region.printedPage, pdfPage: region.pdfPage, sourceSha256: resolved.sourceSha256, imageSha256: region.sha256, sourceCropBounds: bounds, focusRects: region.focusRects || []}), sourceIdentity: resolved, normalizedCropBounds: bounds};
  }
  if (resolved?.valid && resolved.sourceKind === 'supplemental-image') {
    return {key: canonical({book: region.book, printedPage: region.printedPage, pdfPage: region.pdfPage, sourceSha256: resolved.sourceSha256, imageSha256: region.sha256, sourceCropBounds: bounds, focusRects: region.focusRects || [], sourceKind: resolved.sourceKind, sourceArtifactId: resolved.sourceArtifactId, canonicalPdfSha256: resolved.canonicalPdfSha256, sourceCropBoundsPx: resolved.sourceCropBoundsPx, sourceCoordinateSpace: resolved.sourceCoordinateSpace}), sourceIdentity: resolved, normalizedCropBounds: bounds};
  }
  return null;
}

export function buildContinuationAliasReport({data, manifest, catalogs, inputHashes = {}, books} = {}) {
  const activeBooks = books || currentBooks(currentSource2Proof());
  const exposed = records(data), owners = new Map(exposed.map(({collection, item}) => [`${collection}:${item.id || 'progression-explainer'}`, item]));
  const declared = new Map(), invalidGroups = [], unassessableParts = [], matches = [];
  const groupKey = group => `${group.collection}:${group.itemId}|${group.catalog}`;
  for (const group of manifest.groups || []) {
    const owner = owners.get(`${group.collection}:${group.itemId}`), catalog = catalogs.get(group.catalog);
    if (!owner || owner.sourceExcerpts?.catalog !== group.catalog || !catalog || catalog.collection !== group.collection || catalog.itemId !== group.itemId) {
      invalidGroups.push({groupId: group.id, reason: 'missing-or-rebound-owner/catalog'}); continue;
    }
    const key = groupKey(group), ids = declared.get(key) || new Set();
    for (const segment of group.segments || []) if (segment.state === 'present' && segment.regionId) ids.add(segment.regionId);
    declared.set(key, ids);
  }
  for (const group of manifest.groups || []) {
    if (invalidGroups.some(row => row.groupId === group.id)) continue;
    const catalog = catalogs.get(group.catalog), linked = declared.get(groupKey(group));
    for (const segment of group.segments || []) {
      const region = catalog.regions.find(row => row.id === segment.regionId), resolved = region && resolveAliasRegionIdentity(catalog, region, activeBooks);
      if (segment.state !== 'present' || !resolved) {
        unassessableParts.push({groupId: group.id, regionId: segment.regionId || null, reason: segment.state === 'present' ? 'missing-source/image/crop-identity' : 'blocked-part'}); continue;
      }
      for (const alias of catalog.regions) {
        if (alias.id === region.id || resolveAliasRegionIdentity(catalog, alias, activeBooks)?.key !== resolved.key) continue;
        const identity = resolved.sourceIdentity;
        matches.push({groupId: group.id, collection: group.collection, itemId: group.itemId, catalog: group.catalog, role: segment.role, segmentRegionId: region.id, aliasRegionId: alias.id, sourceSha256: identity.sourceSha256, imageSha256: region.sha256, sourceCropBounds: resolved.normalizedCropBounds, focusSha256: hash(canonical(region.focusRects || [])), ...(identity.sourceKind === 'supplemental-image' ? {sourceKind: identity.sourceKind, sourceArtifactId: identity.sourceArtifactId, canonicalPdfSha256: identity.canonicalPdfSha256, sourceCropBoundsPx: identity.sourceCropBoundsPx, sourceCoordinateSpace: identity.sourceCoordinateSpace} : {}), status: linked.has(alias.id) ? 'alias-participates-in-declared-group' : 'exact-alias-has-no-declared-linked-group'});
      }
    }
  }
  const referenced = new Set(exposed.flatMap(({item}) => ['sourceExcerpts', 'scanVerification'].map(key => item[key]?.catalog).filter(Boolean)));
  const missingAliases = matches.filter(row => row.status === 'exact-alias-has-no-declared-linked-group');
  return {schemaVersion: 1, artifactType: 'declared-continuation exact-region-alias inventory', scope: 'All exposed records and referenced catalogs are inventoried; exact aliases are checked only for parts of declared continuation groups. Matching pixels, source frame and focus establish an alias identity, not passage completeness or mechanics. A linked alias retains its own group review scope.', inputHashes, denominators: {exposedRecords: exposed.length, referencedCatalogs: [...referenced].length, catalogRegionRows: [...referenced].reduce((n, path) => n + (catalogs.get(path)?.regions?.length || 0), 0), declaredGroups: (manifest.groups || []).length, declaredParts: (manifest.groups || []).reduce((n, group) => n + (group.segments?.length || 0), 0), exactAliasMatches: matches.length, missingAliasLinks: missingAliases.length, unassessableDeclaredParts: unassessableParts.length}, matches, missingAliases, unassessableParts, invalidGroups, structuralCheck: {valid: invalidGroups.length === 0 && missingAliases.length === 0, sourceSemanticsCertified: false}};
}

export function loadContinuationAliasReport(...args) {
  if (args.length !== 0) throw new Error('Installed Source2 continuation-alias loader accepts no caller root or input overrides');
  const historical = assertHistoricalMmTestStage();
  const proof = currentSource2Proof();
  if (canonical(historical.currentSource2Summary) !== canonical(proof.summary)) throw new Error('Historical MM stage and separate current Source2 identity diverged');
  const dataBytes = currentSource2Bytes('dist/data.json', proof);
  const manifestBytes = currentSource2Bytes('research/citation-continuations.json', proof);
  const data = JSON.parse(dataBytes), manifest = JSON.parse(manifestBytes), catalogs = new Map();
  for (const {item} of records(data)) {
    for (const key of ['sourceExcerpts', 'scanVerification']) {
      const path = item[key]?.catalog;
      if (path && !catalogs.has(path)) catalogs.set(path, JSON.parse(currentSource2Bytes(`dist/${path}`, proof)));
    }
  }
  const report = buildContinuationAliasReport({data, manifest, catalogs, books: currentBooks(proof), inputHashes: {data: {path: 'dist/data.json', sha256: hash(dataBytes)}, manifest: {path: 'research/citation-continuations.json', sha256: hash(manifestBytes)}, catalogs: Object.fromEntries([...catalogs.keys()].sort().map(path => [path, hash(currentSource2Bytes(`dist/${path}`, proof))]))}});
  return {...report, currentSource2Summary: structuredClone(proof.summary)};
}

// Explicit immutable historical-MM role. This never accepts a caller root or
// current data; the separate current loader above owns physical Source2 bytes.
export function loadHistoricalMmContinuationAliasReport(...args) {
  if (args.length !== 0) throw new Error('Historical-MM continuation-alias loader accepts no caller overrides');
  const historical = assertHistoricalMmTestStage(), proof = currentSource2Proof();
  if (canonical(historical.currentSource2Summary) !== canonical(proof.summary)) throw new Error('Historical MM stage and separate current Source2 identity diverged');
  const bytes = path => readHistoricalFileSync(resolve(root, path));
  const dataBytes = bytes('dist/data.json'), manifestBytes = bytes('research/citation-continuations.json');
  if (hash(dataBytes) !== '2ab84cfe5e4234e5d0303b2062f941f7d8e1b93d798a7402c16e78d6d2e4672c') throw new Error('Exact immutable historical-MM data role required');
  const data = JSON.parse(dataBytes), manifest = JSON.parse(manifestBytes), catalogs = new Map();
  for (const {item} of records(data)) {
    for (const key of ['sourceExcerpts', 'scanVerification']) {
      const path = item[key]?.catalog;
      if (path && !catalogs.has(path)) catalogs.set(path, JSON.parse(bytes(`dist/${path}`)));
    }
  }
  const report = buildContinuationAliasReport({data, manifest, catalogs, books: currentBooks(proof), inputHashes: {data: {path: 'dist/data.json', sha256: hash(dataBytes)}, manifest: {path: 'research/citation-continuations.json', sha256: hash(manifestBytes)}, catalogs: Object.fromEntries([...catalogs.keys()].sort().map(path => [path, hash(bytes(`dist/${path}`))]))}});
  return {...report, currentSource2Summary: structuredClone(proof.summary), historicalMmDataCheckpoint: {dataSourceCommit: '0f2d70a135e3ad486152bf00f21387d60a1a97ef', dataSourceTree: '08010faf457df22cdb0a5ec35d2dcf79e622ade9', replayHeadCommit: historical.historicalHead, dataSha256: hash(dataBytes)}};
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const args = process.argv.slice(2), outputIndex = args.indexOf('--output'), report = loadContinuationAliasReport();
  if (outputIndex >= 0) {
    const output = resolve(args[outputIndex + 1]);
    const historicalStage = assertHistoricalMmTestStage();
    // Output writing remains governed by the exact Source2 child/fs adapters.
    const {mkdirSync, writeFileSync} = await import('../mm-replay-fs-source2-v3.mjs');
    mkdirSync(dirname(output), {recursive: true});
    writeFileSync(output, JSON.stringify({...report, historicalCurrentSource2Summary: historicalStage.currentSource2Summary}, null, 2) + '\n');
  }
  console.log(JSON.stringify({denominators: report.denominators, structuralCheck: report.structuralCheck, currentSource2Summary: report.currentSource2Summary}));
  if (args.includes('--check') && !report.structuralCheck.valid) process.exitCode = 1;
}
