import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';

export const CANONICAL_PDF_SHA256 = '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669';
export const SUPPLEMENT_IMAGE_SHA256 = 'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7';
export const SUPPLEMENT_ARTIFACT_ID = 'dmg175-user-confirmed-supplement';
export const SOURCE_DIMENSIONS = Object.freeze([1329, 1796]);
export const COORDINATE_SPACE = 'supplement-image pixels; top-left origin; LTRB half-open';
export const LEGACY_CROP_TUPLES = Object.freeze({
  'dmg-175-party-table-context-78c4c383c38c7d10': {
    cropBoundsPx: [0, 1145, 635, 1635],
    imageSha256: '78c4c383c38c7d100a9e66bec4f36de1fdb9453d6e44d1eec53120e849a36e89',
  },
  'dmg-175-level-others-context-5aa02e91e35c4c28': {
    cropBoundsPx: [670, 120, 1329, 492],
    imageSha256: '5aa02e91e35c4c28152caccd947096943b74889b8596376cb86cb0c7170291b8',
  },
});
export const FD13_STABLE_REGION = Object.freeze({
  id: 'dmg175-character-level-left-level-of-characters-paragraph-left-column-portion',
  cropBoundsPx: [0, 1625, 650, 1760],
  imageSha256: 'fd13f5d51d4f527d8887c31627d39ce224c33ccd810a78bd8b01ba204f8aa3fc',
});

export const EXPECTED_CATALOGS = Object.freeze({
  'scans/verified/rules-appendix-c-character-subtable.json': 'appendix-c-character-subtable',
  'scans/verified/rules-appendix-c-party-size.json': 'appendix-c-party-size',
  'scans/verified/rules-appendix-c-character-levels.json': 'appendix-c-character-levels',
  'scans/verified/rules-appendix-c-henchmen.json': 'appendix-c-henchmen',
  'scans/verified/rules-appendix-c-character-guidance.json': 'appendix-c-character-guidance',
  'scans/verified/rules-appendix-c-party-magic-distribution.json': 'appendix-c-party-magic-distribution',
  'scans/verified/rules-appendix-c-magic-table-i.json': 'appendix-c-magic-table-i',
  'scans/verified/rules-appendix-c-magic-table-ii.json': 'appendix-c-magic-table-ii',
  'scans/verified/rules-appendix-c-magic-table-iii.json': 'appendix-c-magic-table-iii',
  'scans/verified/rules-appendix-c-magic-table-iv.json': 'appendix-c-magic-table-iv',
  'scans/verified/rules-appendix-c-magic-item-notes.json': 'appendix-c-magic-item-notes',
  'scans/verified/rules-encounter-types.json': 'encounter-types',
});

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const fail = message => { throw new Error(`D175 source registry invalid: ${message}`); };
const exact = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };

function catalogInputBundle(packageRoot) {
  const pinPath = path.join(packageRoot, 'inputs/catalog-source-pins-v1.json');
  const pins = JSON.parse(fs.readFileSync(pinPath, 'utf8'));
  if (pins.artifactType !== 'D175 final-catalog input pins for supplemental identity registry'
      || pins.sourcePhaseCommitPending !== true
      || !Array.isArray(pins.catalogs) || pins.catalogs.length !== 12) fail('catalog pin document is not the bounded 12-catalog snapshot');
  const expectedPaths = Object.keys(EXPECTED_CATALOGS).sort();
  const actualPaths = pins.catalogs.map(row => row.catalogPath).sort();
  exact(actualPaths, expectedPaths, 'catalog path universe changed');
  const catalogs = new Map();
  const pinRows = new Map();
  for (const pin of pins.catalogs) {
    const bytes = fs.readFileSync(path.join(packageRoot, 'inputs/catalogs', path.basename(pin.catalogPath)));
    if (sha(bytes) !== pin.sha256) fail(`catalog bytes differ from captured pin: ${pin.catalogPath}`);
    const catalog = JSON.parse(bytes.toString('utf8'));
    const expectedOwner = EXPECTED_CATALOGS[pin.catalogPath];
    if (catalog.collection !== 'rules' || catalog.itemId !== expectedOwner
        || catalog.sources?.DMG?.sha256 !== CANONICAL_PDF_SHA256 || !Array.isArray(catalog.regions)) {
      fail(`catalog owner/source identity changed: ${pin.catalogPath}`);
    }
    catalogs.set(pin.catalogPath, catalog);
    pinRows.set(pin.catalogPath, pin);
  }
  return {pins, catalogs, pinRows};
}

function validateArtifact(catalog, catalogPath) {
  const artifact = catalog.sourceArtifacts?.[SUPPLEMENT_ARTIFACT_ID];
  const expected = {
    id: SUPPLEMENT_ARTIFACT_ID,
    type: 'supplemental-page-image',
    book: 'DMG',
    printedPage: 175,
    sha256: SUPPLEMENT_IMAGE_SHA256,
    mediaType: 'image/jpeg',
    dimensionsPx: SOURCE_DIMENSIONS,
    canonicalPdfSha256: CANONICAL_PDF_SHA256,
    originalPdfContainsPrintedPage: false,
    editionStatus: 'user-confirmed-correct-edition',
    printingStatus: 'not-specified',
  };
  if (!artifact) fail(`p.175 catalog lacks the supplemental source artifact: ${catalogPath}`);
  for (const [key, value] of Object.entries(expected)) exact(artifact[key], value, `p.175 source artifact ${key} changed in ${catalogPath}`);
}

function validateRegion(region, catalog, catalogPath) {
  if (region.book !== 'DMG' || region.printedPage !== 175 || region.pdfPage !== null
      || region.sourceArtifactId !== SUPPLEMENT_ARTIFACT_ID
      || region.sourceCoordinateSpace !== COORDINATE_SPACE) fail(`p.175 crop must remain a separate supplemental-image frame: ${catalogPath}#${region.id}`);
  const bounds = region.sourceCropBoundsPx;
  if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isInteger)) fail(`p.175 source crop bounds are invalid: ${catalogPath}#${region.id}`);
  const [left, top, right, bottom] = bounds;
  if (!(left >= 0 && top >= 0 && left < right && top < bottom && right <= SOURCE_DIMENSIONS[0] && bottom <= SOURCE_DIMENSIONS[1])) {
    fail(`p.175 source crop is outside the JPEG dimensions: ${catalogPath}#${region.id}`);
  }
  if (region.width !== right - left || region.height !== bottom - top) fail(`p.175 crop pixel dimensions disagree with source bounds: ${catalogPath}#${region.id}`);
  if (typeof region.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(region.sha256)
      || typeof region.image !== 'string' || region.image.startsWith('/') || region.image.includes('\\')
      || region.image.split('/').some(part => part === '..' || part === '.')) fail(`p.175 crop image pointer/hash is invalid: ${catalogPath}#${region.id}`);
  const rect = region.normalizedPageRect;
  const expectedRect = [left / SOURCE_DIMENSIONS[0], top / SOURCE_DIMENSIONS[1], (right-left) / SOURCE_DIMENSIONS[0], (bottom-top) / SOURCE_DIMENSIONS[1]];
  const actualRect = rect && typeof rect === 'object' && !Array.isArray(rect)
    ? [rect.x, rect.y, rect.width ?? rect.w, rect.height ?? rect.h] : null;
  if (!actualRect || actualRect.length !== 4 || actualRect.some((value, index) => !Number.isFinite(Number(value)) || Math.abs(Number(value) - expectedRect[index]) > 0.000002)) {
    fail(`p.175 normalized image rectangle disagrees with source-pixel bounds: ${catalogPath}#${region.id}`);
  }
  return {
    regionId: region.id,
    image: region.image,
    imageSha256: region.sha256,
    cropBoundsPx: [...bounds],
    sourceDimensionsPx: [...SOURCE_DIMENSIONS],
    width: region.width,
    height: region.height,
    normalizedImageRect: {x: actualRect[0], y: actualRect[1], width: actualRect[2], height: actualRect[3]},
    sourceCoordinateSpace: COORDINATE_SPACE,
  };
}

export function buildClosedSupplementalCropRegistry(packageRoot) {
  const {pins, catalogs, pinRows} = catalogInputBundle(packageRoot);
  const catalogPins = Object.fromEntries([...pinRows].map(([catalogPath,pin]) => [catalogPath,pin.sha256]));
  return buildSupplementalCropRegistryFromCatalogs(catalogs, catalogPins, pins.catalogs.length);
}

export function buildSupplementalCropRegistryFromCatalogs(catalogs, catalogPins, catalogCount = Object.keys(catalogPins || {}).length) {
  if (!(catalogs instanceof Map) || catalogs.size !== 12 || !catalogPins || Object.keys(catalogPins).length !== 12) fail('exact pinned 12-catalog map is required');
  exact([...catalogs.keys()].sort(), Object.keys(EXPECTED_CATALOGS).sort(), 'catalog path universe changed');
  for (const [catalogPath, catalog] of catalogs) {
    if (catalog.collection !== 'rules' || catalog.itemId !== EXPECTED_CATALOGS[catalogPath]
        || catalog.sources?.DMG?.sha256 !== CANONICAL_PDF_SHA256 || !Array.isArray(catalog.regions)
        || !/^[a-f0-9]{64}$/.test(catalogPins[catalogPath])) fail(`catalog owner/source identity changed: ${catalogPath}`);
  }
  const regionsById = new Map();
  const cropHashes = new Set();
  for (const [catalogPath, catalog] of catalogs) {
    const p175 = catalog.regions.filter(region => region.printedPage === 175);
    if (p175.length) validateArtifact(catalog, catalogPath);
    for (const region of p175) {
      const row = validateRegion(region, catalog, catalogPath);
      const previous = regionsById.get(row.regionId);
      if (previous && !isDeepStrictEqual(previous, row)) fail(`duplicate region ID has conflicting crop identity: ${row.regionId}`);
      regionsById.set(row.regionId, row);
      cropHashes.add(row.imageSha256);
    }
  }
  if (regionsById.size !== 34 || cropHashes.size !== 8) fail(`unexpected p.175 crop universe (regions=${regionsById.size}, distinct crops=${cropHashes.size})`);
  for (const [regionId, expected] of Object.entries(LEGACY_CROP_TUPLES)) {
    const row = regionsById.get(regionId);
    if (!row) fail(`legacy p.175 region disappeared: ${regionId}`);
    exact(row.cropBoundsPx, expected.cropBoundsPx, `legacy crop bounds changed: ${regionId}`);
    exact(row.imageSha256, expected.imageSha256, `legacy crop image hash changed: ${regionId}`);
  }
  const fd13 = regionsById.get(FD13_STABLE_REGION.id);
  if (!fd13) fail('accepted fd13 crop must be attached to its stable left-column region ID');
  exact(fd13.cropBoundsPx, FD13_STABLE_REGION.cropBoundsPx, 'fd13 source bounds changed');
  exact(fd13.imageSha256, FD13_STABLE_REGION.imageSha256, 'fd13 image hash changed');
  const rows = [...regionsById.values()].sort((a,b) => a.regionId.localeCompare(b.regionId));
  return {
    schemaVersion: 1,
    artifactType: 'closed-DMG-p175-supplemental-crop-identity-registry',
    status: 'research-only-source-identity-and-geometry; no semantic or source-value assessment',
    sourceIdentity: {
      book: 'DMG', printedPage: 175, pdfPage: null,
      canonicalPdfSha256: CANONICAL_PDF_SHA256,
      supplementalImageSha256: SUPPLEMENT_IMAGE_SHA256,
      sourceDimensionsPx: [...SOURCE_DIMENSIONS],
      editionStatus: 'user-confirmed-correct-edition', printingStatus: 'not-specified',
      originalPdfContainsPrintedPage: false, fullImagePublished: false,
      coordinateSpace: COORDINATE_SPACE,
    },
    counts: {catalogs: catalogCount, uniqueRegionIds: rows.length, distinctCropImageHashes: cropHashes.size, legacyTuplesPreserved: 2},
    sourceCatalogPins: Object.fromEntries(Object.entries(catalogPins).sort(([a],[b])=>a.localeCompare(b))),
    regions: rows,
  };
}

export function asContinuationCropMap(registry) {
  if (registry?.artifactType !== 'closed-DMG-p175-supplemental-crop-identity-registry'
      || registry.counts?.uniqueRegionIds !== 34 || registry.counts?.distinctCropImageHashes !== 8
      || !Array.isArray(registry.regions) || registry.regions.length !== 34) fail('closed p.175 registry is required for continuation identity mapping');
  return Object.fromEntries(registry.regions.map(row => [row.regionId, {cropBoundsPx: [...row.cropBoundsPx], imageSha256: row.imageSha256}]));
}

export function makeBridgeSuccessor(oldRegistryBytes, expectedOldSha256, newBooksJsSha256) {
  if (sha(oldRegistryBytes) !== expectedOldSha256) fail('old source-frame registry bytes differ from the sealed source pin');
  if (!/^[a-f0-9]{64}$/.test(newBooksJsSha256)) fail('new books.js source hash is invalid');
  const oldRegistry = JSON.parse(oldRegistryBytes.toString('utf8'));
  if (oldRegistry.counts?.frameGroups !== 9 || oldRegistry.counts?.physicalPdfPages !== 7
      || oldRegistry.counts?.regionBindings !== 102 || oldRegistry.counts?.ownerBindings !== 102
      || oldRegistry.frames?.length !== 9 || oldRegistry.frames.reduce((n,frame)=>n+frame.regions.length,0) !== 102) {
    fail('old source-frame cohort is not exactly 9 frames / 102 joins');
  }
  const next = clone(oldRegistry);
  const oldBooksJsSha256 = next.provenance?.booksJsSha256;
  next.provenance.booksJsSha256 = newBooksJsSha256;
  if (oldBooksJsSha256 === newBooksJsSha256) fail('source bridge books.js pin did not change');
  const rollback = clone(next);
  rollback.provenance.booksJsSha256 = oldBooksJsSha256;
  exact(rollback, oldRegistry, 'bridge successor changes fields beyond provenance.booksJsSha256');
  return {oldRegistry, next, oldBooksJsSha256};
}

export function validateBridgeSuccessor(oldRegistry, candidate, expectedBooksJsSha256) {
  if (candidate?.provenance?.booksJsSha256 !== expectedBooksJsSha256) fail('bridge books.js pin does not match the expected current code hash');
  const rollback = clone(candidate);
  rollback.provenance.booksJsSha256 = oldRegistry.provenance.booksJsSha256;
  exact(rollback, oldRegistry, 'bridge changed old frame groups, owner joins, or provenance beyond books.js');
  if (candidate.counts?.frameGroups !== 9 || candidate.counts?.physicalPdfPages !== 7
      || candidate.counts?.regionBindings !== 102 || candidate.counts?.ownerBindings !== 102
      || candidate.frames?.reduce((n,frame)=>n+frame.regions.length,0) !== 102) fail('bridge successor denominator changed');
  return true;
}

export function sha256(bytes) { return sha(bytes); }
