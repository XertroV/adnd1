import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { attachSourceVisualReviewMetadata, sourceVisualRegionHashes } from '../../tools/price-source-inventory.mjs';

const ROOT = process.cwd();
const OUT = 'research/ua-class-guidance-context-proposal-v8';
const V7 = 'research/ua-class-guidance-context-proposal-v7-clean';
const V6_REVIEW = 'research/source-audit-pass8-ua-class-context-v6-independent-review-v1.json';
const V7_ROOT_REVIEW = 'research/source-audit-pass8-ua-class-context-v7-clean-root-independent-review-v1.json';
const ACTIVE_BRIDGE = 'research/source-frame-coordinate-bridge-phb-source-v1.json';
const WEAPON_ROOT = '/workspace/adnd1-missile-table-discoverability';
const WEAPON_LEDGER = `${WEAPON_ROOT}/research/source-visual-reviews.json`;
const WEAPON_CONTINUATIONS = `${WEAPON_ROOT}/research/citation-continuations.json`;
const WEAPON_GIT_HEAD = '7dd7401b28117bccb9b4e90e15310903fc9f4c72';
const WEAPON_PREFIX_COMMIT = '9ee2550e9793e6aae9a7ac8fd71525704894950f';
const EXPECTED = {
  v6Review: '439aaf8b6ade94c1dfe78c8a2b0f85b235e17bc482eac4ff9794880f759bc302',
  v7RootReview: 'dd26c1e32d6544f33a5a5dc3fdc3122a64d0dca3f49a497965d167e0001d1f15',
  activeBridge: 'a756ac336f14491aa6785615c869a6a9ed8b1cc1632773e468c72e327fa8b1bd',
  v7Bridge: '94f3f96a94fe029c105160873c3e8bfd52482bf9654726bfe0ec269ae85d40a7',
  weaponLedger: 'ae8258c5d787d96b0ac29fa364d7f6d96eae9f9a9496b2c7e34948c6c3beb78c',
  weaponContinuations: '820dac6edf40d02d144af2dffdb5319773e2d8ae26a130732f4f75dd01e0e417',
  v7Manifest: '7a215bd11cbf95697113c9a9f63a8fdf2c2384ce36dce02269fca585b8e41f5d',
  v7Proposal: '2522f66cbb76ebfc7a583345abc501b2d5d007e448097dd217be5de678a18b96',
  v7ReviewPacket: 'aa564c8d416b07cee34920fa4e9433c1ef340894621001c67bac4262e7416563',
  v7Overrides: 'fb77381df8a18e0a703d396242a7f6de2703ed903c0ce419ee0d39b52ea6e670',
  v7Continuations: '7e24841b035a21b1fa3c55f5201b634ea252b404a41e0786ae227a2830c637f0',
};
const ROW_CATALOGS = new Set([
  'scans/verified/classes-fighter.json',
  'scans/verified/classes-ranger.json',
  'scans/verified/classes-ua-barbarian.json',
  'scans/verified/classes-ua-thief-acrobat.json',
]);
const CORE_FIELDS = [
  'owner', 'ownerBindingKey', 'catalog', 'regionId', 'book', 'printedPage', 'pdfPage',
  'sourcePdfSha256', 'image', 'imageSha256', 'imageDimensionsPx', 'normalizedPageRect',
  'coordinateSpace', 'focusSha256', 'contentSha256', 'reviewHashBinding', 'reviewAssessments',
  'sourceFrameId',
];

function bytes(path) { return readFileSync(resolve(ROOT, path)); }
function shaBytes(value) { return createHash('sha256').update(value).digest('hex'); }
function shaPath(path) { return shaBytes(bytes(path)); }
function readJson(path) { return JSON.parse(bytes(path).toString('utf8')); }
function writeJson(path, value) {
  const target = resolve(ROOT, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function hashCanonical(value) { return shaBytes(Buffer.from(canonical(value))); }
function deepEqual(a, b) { return canonical(a) === canonical(b); }
function assert(condition, message) { if (!condition) throw new Error(message); }

for (const [path, expected] of [
  [V6_REVIEW, EXPECTED.v6Review], [V7_ROOT_REVIEW, EXPECTED.v7RootReview],
  [ACTIVE_BRIDGE, EXPECTED.activeBridge],
  [`${V7}/source-frame-coordinate-bridge-v7-candidate.json`, EXPECTED.v7Bridge],
  [`${V7}/final-author-manifest.json`, EXPECTED.v7Manifest],
  [`${V7}/proposal.json`, EXPECTED.v7Proposal],
  [`${V7}/review-packet.json`, EXPECTED.v7ReviewPacket],
  [`${V7}/prospective-citation-overrides.json`, EXPECTED.v7Overrides],
  [`${V7}/prospective-citation-continuations.json`, EXPECTED.v7Continuations],
]) assert(shaPath(path) === expected, `frozen input hash mismatch: ${path}`);
assert(shaPath(WEAPON_LEDGER) === EXPECTED.weaponLedger, 'unpublished weapon source-visual ledger hash mismatch');
assert(shaPath(WEAPON_CONTINUATIONS) === EXPECTED.weaponContinuations, 'unpublished weapon continuation manifest hash mismatch');

const v6 = readJson(V6_REVIEW);
const v7Root = readJson(V7_ROOT_REVIEW);
const proposal = readJson(`${V7}/proposal.json`);
const reviewPacket = readJson(`${V7}/review-packet.json`);
const overrides = readJson(`${V7}/prospective-citation-overrides.json`);
const v7Continuations = readJson(`${V7}/prospective-citation-continuations.json`);
const activeLedger = readJson('research/source-visual-reviews.json');
const weaponLedger = readJson(WEAPON_LEDGER);
const weaponContinuations = readJson(WEAPON_CONTINUATIONS);

assert(v6.regions?.length === 32, 'v6 receipt must contain 32 accepted regions');
assert(v6.images?.length === 18, 'v6 receipt must contain 18 accepted image replays');
assert(v7Root.decision?.includes('accept bounded source/crop/focus/default-order'), 'root v7 decision is not the accepted decision');
assert(v7Root.newEvidenceScope?.newDefaultReviewsAllowed === 22, 'root v7 receipt does not allow exactly 22 new defaults');
assert(v7Root.newEvidenceScope?.retainedOldDefaultsNotNewlyGraded === 2, 'root v7 retained-default scope changed');
assert(activeLedger.reviews.length === 1845, 'local live ledger is not the expected 1,845-review base');
assert(weaponLedger.reviews.length === 1849, 'unpublished weapon ledger does not contain 1,849 reviews');
assert(deepEqual(weaponLedger.reviews.slice(0, 1845), activeLedger.reviews), 'weapon ledger does not preserve the exact live 1,845-review prefix');
assert(weaponContinuations.groups.length === 261, 'unpublished weapon continuation prefix is not 261 groups');
assert(v7Continuations.groups.length === 270, 'v7 continuation candidate is not 260 + 10 groups');

const candidateCatalogs = new Map();
const candidateCatalogRows = new Map();
for (const record of proposal.catalogs) {
  assert(shaPath(record.prospectivePath) === record.afterSha256, `v7 candidate catalog hash changed: ${record.prospectivePath}`);
  const catalog = readJson(record.prospectivePath);
  const key = record.path.replace(/^dist\//, '');
  candidateCatalogs.set(key, catalog);
  candidateCatalogRows.set(key, record);
}
assert(candidateCatalogs.size === 7, 'expected seven prospective UA class catalogs');

const pageGroups = reviewPacket.pageGroups;
assert(pageGroups.length === 24, 'accepted source review page-group census changed');
const defaultByRegionId = new Map();
let newDefaultCount = 0;
let retainedDefaultCount = 0;
for (const [index, group] of pageGroups.entries()) {
  if (group.defaultDisposition === 'retained-original-default') {
    retainedDefaultCount++;
    continue;
  }
  assert(['new-page-group', 'proposed-new-context-default'].includes(group.defaultDisposition), `unexpected default disposition: ${group.defaultDisposition}`);
  const regionId = group.after?.defaultRegionId;
  assert(typeof regionId === 'string' && regionId.startsWith('pass8-ua-guidance-'), `new default is not a new UA region: ${regionId}`);
  assert(!defaultByRegionId.has(regionId), `duplicate accepted default target ${regionId}`);
  defaultByRegionId.set(regionId, { group, index });
  newDefaultCount++;
}
assert(newDefaultCount === 22 && retainedDefaultCount === 2, 'exactly 22 new defaults and two retained defaults are required');

const reviews = structuredClone(weaponLedger.reviews);
const existingReviewKeys = new Set(reviews.map(record => [record.collection, record.itemId, record.binding, record.regionId].join('|')));
const v6ByKey = new Map(v6.regions.map((record, index) => [[record.owner.collection, record.owner.itemId, 'sourceExcerpts', record.regionId].join('|'), { record, index }]));
assert(v6ByKey.size === 32, 'v6 region identities are not unique');
const v6RegionIds = new Set();
for (const { record, index } of v6ByKey.values()) {
  const key = [record.owner.collection, record.owner.itemId, 'sourceExcerpts', record.regionId].join('|');
  assert(!existingReviewKeys.has(key), `new UA visual record already exists in the accepted ledger: ${key}`);
  v6RegionIds.add(record.regionId);
  const catalogPath = record.catalog.replace(/^dist\//, '');
  const catalog = candidateCatalogs.get(catalogPath);
  assert(catalog, `candidate catalog missing for reviewed region: ${catalogPath}`);
  const region = catalog.regions.find(item => item.id === record.regionId);
  assert(region, `reviewed region missing from candidate catalog: ${record.regionId}`);
  const hashes = sourceVisualRegionHashes(region);
  assert(record.sourcePdfSha256 === 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4', `unexpected source PDF for ${record.regionId}`);
  assert(record.imageSha256 === region.sha256 && record.focusSha256 === hashes.focusSha256 && record.contentSha256 === hashes.contentSha256,
    `independent region hashes differ from candidate catalog: ${record.regionId}`);
  assert(record.overlaySha256, `independent focus-overlay pin missing: ${record.regionId}`);

  const evidence = `${V6_REVIEW}#${shaPath(V6_REVIEW)}#/regions/${index}; ${V7_ROOT_REVIEW}#${shaPath(V7_ROOT_REVIEW)}`;
  const review = {
    collection: record.owner.collection,
    itemId: record.owner.itemId,
    binding: 'sourceExcerpts',
    regionId: record.regionId,
    sourceSha256: record.sourcePdfSha256,
    imageSha256: record.imageSha256,
    focusSha256: record.focusSha256,
    contentSha256: record.contentSha256,
    book: region.book,
    printedPage: region.printedPage,
    pdfPage: region.pdfPage,
    normalizedPageRect: region.normalizedPageRect ?? null,
    focusRects: region.focusRects ?? [],
    reviewer: v6.reviewerRole,
    reviewedAt: v6.reviewedAt,
    scope: 'Exact source-image replay, bounded crop/context, and displayed owner-specific focus only. No field, numeric, XP, mechanics, or completeness grade.',
    assessments: {
      crop: {
        status: 'confirmed', independent: true,
        evidence: `${evidence}; all 18 source crops replayed to exact source RGB bytes; this region is among the 32 individually reviewed overlays.`,
      },
      context: {
        status: 'confirmed', independent: true,
        evidence: `${evidence}; the complete relevant excerpt context and passage/table qualifications were accepted within the bounded v6 review scope.`,
      },
      relevance: {
        status: 'confirmed', independent: true,
        evidence: `${evidence}; owner/page association and owner-specific source focus accepted; no numeric, XP, mechanics, or field-target grade.`,
      },
      highlight: {
        status: 'confirmed', independent: true,
        evidence: `${evidence}; the displayed focus overlay was individually inspected and accepted for this exact source/image/focus/content tuple.`,
      },
    },
  };
  if (defaultByRegionId.has(region.id)) {
    const { group, index: groupIndex } = defaultByRegionId.get(region.id);
    assert(group.collection === record.owner.collection && group.itemId === record.owner.itemId && group.catalog === record.catalog,
      `default owner/catalog differs from region ${region.id}`);
    assert(group.after?.orderedRegionIds?.includes(region.id), `default region not in accepted ordered page group: ${region.id}`);
    review.assessments.default = {
      status: 'confirmed', independent: true,
      evidence: `${V6_REVIEW}#${shaPath(V6_REVIEW)}#/reviewFindings/pageGroupAndDefaultReview/groups/${groupIndex}; ${V7_ROOT_REVIEW}#${shaPath(V7_ROOT_REVIEW)}#/newEvidenceScope; exact selected region and full ordered page-group default only.`,
    };
    review.defaultOrderSha256 = group.after.defaultOrderSha256;
    review.pageGroupReview = {
      orderedRegionIds: group.after.orderedRegionIds,
      selectedRegionId: region.id,
      defaultOrderSha256: group.after.defaultOrderSha256,
      disposition: group.defaultDisposition,
      scope: 'Exact reviewed owner/page-group ordering and selected default; no value, field, or mechanics grade.',
    };
  }
  reviews.push(review);
}
assert(v6RegionIds.size === 32, 'expected 32 unique new UA visual region records');
assert(reviews.length === 1881, 'expected 1,849 preserved ledger records plus 32 UA records');
assert(deepEqual(reviews.slice(0, 1849), weaponLedger.reviews), 'V8 candidate does not preserve the exact unpublished weapon-ledger prefix');
assert(reviews.filter(record => record.assessments?.default && record.reviewedAt === v6.reviewedAt).length === 22,
  'expected exactly 22 new default assessments');

const ledgerV8 = {
  schemaVersion: weaponLedger.schemaVersion,
  scope: weaponLedger.scope,
  reviews,
};
writeJson(`${OUT}/source-visual-reviews-v8-candidate.json`, ledgerV8);

// Rebase the class continuation additions onto the exact unpublished weapon prefix.
const appendedUaGroups = v7Continuations.groups.slice(-10);
assert(appendedUaGroups.length === 10, 'expected ten reviewed UA continuation groups');
for (const group of appendedUaGroups) {
  const evidence = group.sourceComparison?.evidence;
  const evidenceSha256 = group.sourceComparison?.evidenceSha256;
  assert(evidence && evidenceSha256, `UA continuation lacks source-comparison evidence: ${group.id}`);
  assert(shaPath(evidence) === evidenceSha256, `UA continuation evidence is missing or stale: ${evidence}`);
}
assert(appendedUaGroups.filter(group => group.collection === 'classes').length === 5, 'expected five UA class continuation groups');
assert(appendedUaGroups.filter(group => group.collection === 'spells').length === 5, 'expected five UA spell continuation groups');
const continuationV8 = {
  ...structuredClone(weaponContinuations),
  scope: `${weaponContinuations.scope} This unpublished candidate appends ten accepted UA source-context joins to the exact 261-group weapon branch prefix; it is prospective and is not the live cc950 base manifest.`,
  groups: [...structuredClone(weaponContinuations.groups), ...structuredClone(appendedUaGroups)],
};
assert(continuationV8.groups.length === 271, 'prospective continuation count must be 261 + 10 = 271');
const weaponPrefixComparison = continuationV8.groups.slice(0, 261);
assert(deepEqual(weaponPrefixComparison, weaponContinuations.groups), 'unpublished weapon continuation prefix changed');
assert(new Set(continuationV8.groups.map(group => group.id)).size === 271, 'duplicate continuation group id in prospective manifest');
writeJson(`${OUT}/citation-continuations-v8-candidate.json`, continuationV8);

// Run the repository's native owner-metadata producer against the future ledger.
const currentDataBytes = bytes('dist/data.json');
const currentData = JSON.parse(currentDataBytes.toString('utf8'));
const ownerIds = proposal.catalogs.map(record => record.prospectivePath.split('/').at(-1).replace(/^classes-|\.json$/g, ''));
const ownerSet = new Set(ownerIds);
const data = { classes: currentData.classes.filter(item => ownerSet.has(item.id)).map(item => structuredClone(item)) };
assert(data.classes.length === 7 && ownerSet.size === 7, 'native producer owner scope differs from seven accepted owners');
const overrideOwners = [];
const oldLinks = new Map();
for (const item of data.classes) {
  const old = structuredClone(item.sourceExcerpts);
  const proposed = structuredClone(overrides.sourceExcerpts[`classes:${item.id}`]);
  assert(proposed, `V7 proposed sourceExcerpts absent for ${item.id}`);
  for (const key of Object.keys(old)) {
    if (key !== 'regionCount' && key !== 'regionReviews') {
      assert(deepEqual(old[key], proposed[key]), `non-count sourceExcerpts property changed for ${item.id}: ${key}`);
    }
  }
  oldLinks.set(item.id, old);
  item.sourceExcerpts = proposed;
  overrideOwners.push(item.id);
}
const catalogs = new Map(candidateCatalogs);
attachSourceVisualReviewMetadata(data, { ledger: ledgerV8, catalogs });

function nativeDataFor(ledger, catalogMap = catalogs) {
  const result = { classes: currentData.classes.filter(item => ownerSet.has(item.id)).map(item => structuredClone(item)) };
  for (const item of result.classes) item.sourceExcerpts = structuredClone(overrides.sourceExcerpts[`classes:${item.id}`]);
  attachSourceVisualReviewMetadata(result, { ledger, catalogs: catalogMap });
  return result;
}

const ownerLinks = [];
for (const item of data.classes) {
  const old = oldLinks.get(item.id);
  const next = item.sourceExcerpts;
  const catalog = catalogs.get(next.catalog);
  assert(catalog && next.regionCount === catalog.regions.length, `native regionCount mismatch for ${item.id}`);
  const oldById = new Map((currentData.classes.find(row => row.id === item.id).sourceExcerpts.regionReviews || []).map(review => [review.regionId, review]));
  const newById = new Map((next.regionReviews || []).map(review => [review.regionId, review]));
  assert(next.regionReviews.length === catalog.regions.length, `native producer did not resolve all catalog regions for ${item.id}`);
  for (const [regionId, oldReview] of oldById) {
    assert(deepEqual(oldReview, newById.get(regionId)), `existing review object changed for ${item.id}#${regionId}`);
  }
  const appendedIds = new Set(v6.regions.filter(record => record.owner.itemId === item.id).map(record => record.regionId));
  const appendedReviews = [...newById.values()].filter(review => appendedIds.has(review.regionId));
  assert(appendedReviews.length === appendedIds.size, `native review output omitted a new region for ${item.id}`);
  assert(appendedReviews.every(review => review.status === 'current-reviewed' && review.review?.independent === true && review.review?.status === 'confirmed'),
    `native producer failed to attach accepted review status for ${item.id}`);
  assert([...newById.values()].filter(review => !oldById.has(review.regionId)).every(review => appendedIds.has(review.regionId)),
    `unexpected new review metadata outside the 32 accepted UA records for ${item.id}`);
  ownerLinks.push({
    ownerId: item.id,
    catalog: next.catalog,
    oldRegionCount: old.regionCount,
    newRegionCount: next.regionCount,
    oldOwnerSourceLinkSha256: hashCanonical(old),
    newOwnerSourceLinkSha256: hashCanonical(next),
    oldRegionReviewCount: oldById.size,
    preservedOldReviewCount: oldById.size,
    appendedRegionIds: [...appendedIds],
    appendedRegionReviewCount: appendedReviews.length,
    appendedCurrentReviewedCount: appendedReviews.filter(review => review.status === 'current-reviewed').length,
    acceptedDefaultReviewCount: appendedReviews.filter(review => review.recordedReview?.status === 'confirmed' &&
      ledgerV8.reviews.find(record => record.collection === 'classes' && record.itemId === item.id && record.regionId === review.regionId)?.assessments?.default?.independent === true).length,
    nativeRegionReviewStatuses: [...new Set(appendedReviews.map(review => review.status))].sort(),
    nonCountSourceExcerptMetadataExact: true,
    allPreexistingReviewObjectsExact: true,
  });
}
assert(ownerLinks.length === 7 && new Set(ownerLinks.map(record => record.ownerId)).size === 7, 'native owner-link output census mismatch');
writeJson(`${OUT}/native-owner-link-replay.json`, {
  schemaVersion: 1,
  artifactType: 'ua-class-guidance-context-v8-native-owner-link-replay',
  status: 'Research-only prospective owner-link metadata generated by the repository native producer; no active data or registry changed.',
  inputPins: {
    currentDataPath: 'dist/data.json', currentDataSha256: shaBytes(currentDataBytes),
    nativeProducerPath: 'tools/price-source-inventory.mjs', nativeProducerSha256: shaPath('tools/price-source-inventory.mjs'),
    explicitProducer: 'attachSourceVisualReviewMetadata(data, { ledger, catalogs })',
    currentBaseLedgerPath: 'research/source-visual-reviews.json', currentBaseLedgerSha256: shaPath('research/source-visual-reviews.json'),
    prospectiveLedgerPath: `${OUT}/source-visual-reviews-v8-candidate.json`, prospectiveLedgerSha256: shaPath(`${OUT}/source-visual-reviews-v8-candidate.json`),
    sourceVisualLedgerUpstreamPath: WEAPON_LEDGER, sourceVisualLedgerUpstreamSha256: shaPath(WEAPON_LEDGER),
    sourceVisualLedgerUpstreamCommit: WEAPON_GIT_HEAD,
    sourceVisualLedgerPreservedPrefixReviews: 1849,
    appendedUaIndependentRecords: 32,
    appendedUaDefaultAssessments: 22,
  },
  scope: { owners: 7, catalogs: 7, appendedRegions: 32, defaults: 22, numericOrMechanicsGrades: 0 },
  owners: ownerLinks,
  validation: {
    sourceExcerptOverridesOnlyChangeRegionCountAndNativeRegionReviews: true,
    allPreexistingRegionReviewObjectsAndGradesExact: true,
    all32NewRegionsHaveAcceptedHashBoundCurrentReviews: true,
    exactly22NewPageGroupDefaultsHaveAcceptedOrderBindings: true,
    noNewRecordsForTwoRetainedOldDefaults: true,
    noNonSourceExcerptOwnerPropertiesChanged: true,
    noNumericMechanicsOrFieldGradePromoted: true,
  },
});

// Re-derive the 9 x 102 frame bridge from the frozen active registry with typed pin changes only.
const bridgeBefore = readJson(ACTIVE_BRIDGE);
const bridgeV7 = readJson(`${V7}/source-frame-coordinate-bridge-v7-candidate.json`);
const bridgeAfter = structuredClone(bridgeBefore);
const baseRows = bridgeBefore.frames.flatMap(frame => frame.regions);
const newCatalogHashes = new Map(proposal.catalogs.map(record => [record.path.replace(/^dist\//, ''), record.afterSha256]));
const beforeCatalogHashes = new Map(proposal.catalogs.map(record => [record.path.replace(/^dist\//, ''), record.beforeSha256]));
const registryCatalogs = Object.keys(bridgeBefore.provenance.catalogHashes);
const sixCatalogs = [...newCatalogHashes.keys()].filter(path => Object.hasOwn(bridgeBefore.provenance.catalogHashes, path)).sort();
assert(sixCatalogs.length === 6, `expected six registered candidate catalog pins, got ${sixCatalogs.length}`);
for (const path of sixCatalogs) {
  assert(bridgeBefore.provenance.catalogHashes[path] === beforeCatalogHashes.get(path), `registry source catalog is not the pinned before catalog: ${path}`);
  bridgeAfter.provenance.catalogHashes[path] = newCatalogHashes.get(path);
}
const nativeOwners = new Map(ownerLinks.map(record => [record.ownerId, record]));
const changedRows = [];
const rowCounts = new Map();
for (const frame of bridgeAfter.frames) for (const row of frame.regions) {
  if (!ROW_CATALOGS.has(row.catalog)) continue;
  const owner = nativeOwners.get(row.owner.itemId);
  assert(owner, `native owner link missing for registry row ${row.owner.itemId}#${row.regionId}`);
  assert(row.catalogSha256 === beforeCatalogHashes.get(row.catalog), `registry row catalog pin differs from before catalog for ${row.catalog}`);
  assert(row.ownerSourceLinkSha256 === owner.oldOwnerSourceLinkSha256, `registry owner-link before pin differs for ${row.owner.itemId}#${row.regionId}`);
  const before = {
    catalogSha256: row.catalogSha256,
    ownerSourceLinkSha256: row.ownerSourceLinkSha256,
  };
  row.catalogSha256 = newCatalogHashes.get(row.catalog);
  row.ownerSourceLinkSha256 = owner.newOwnerSourceLinkSha256;
  rowCounts.set(row.catalog, (rowCounts.get(row.catalog) || 0) + 1);
  changedRows.push({
    owner: row.owner, regionId: row.regionId, catalog: row.catalog,
    oldCatalogSha256: before.catalogSha256, newCatalogSha256: row.catalogSha256,
    oldOwnerSourceLinkSha256: before.ownerSourceLinkSha256, newOwnerSourceLinkSha256: row.ownerSourceLinkSha256,
  });
}
const expectedRowCounts = {
  'scans/verified/classes-fighter.json': 3,
  'scans/verified/classes-ranger.json': 3,
  'scans/verified/classes-ua-barbarian.json': 1,
  'scans/verified/classes-ua-thief-acrobat.json': 1,
};
assert(changedRows.length === 8, `expected exactly eight row joins, got ${changedRows.length}`);
assert(deepEqual(Object.fromEntries([...rowCounts.entries()].sort()), expectedRowCounts), 'row-bearing catalog counts differ from 3+3+1+1');
assert(baseRows.length === 102 && bridgeAfter.frames.flatMap(frame => frame.regions).length === 102, 'frame bridge no longer has 102 joins');
for (const [index, [before, after]] of bridgeBefore.frames.flatMap(frame => frame.regions).map((row, i) => [row, bridgeAfter.frames.flatMap(frame => frame.regions)[i]]).entries()) {
  assert(deepEqual(CORE_FIELDS.map(field => [field, before[field]]), CORE_FIELDS.map(field => [field, after[field]])), `source/image/focus/geometry core tuple changed at row ${index}`);
}

function diffPaths(a, b, path = '') {
  if (deepEqual(a, b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].sort().flatMap(key => diffPaths(a[key], b[key], path ? `${path}.${key}` : key));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const length = Math.max(a.length, b.length);
    return Array.from({ length }, (_, index) => diffPaths(a[index], b[index], `${path}[${index}]`)).flat();
  }
  return [path];
}
const bridgeDiffPaths = diffPaths(bridgeBefore, bridgeAfter);
const expectedPinPaths = [
  ...sixCatalogs.map(path => `provenance.catalogHashes.${path}`),
  ...changedRows.flatMap(row => {
    const index = baseRows.findIndex(old => old.catalog === row.catalog && old.regionId === row.regionId && old.ownerBindingKey?.[1] === row.owner.itemId);
    assert(index >= 0, `row mapping missing for ${row.regionId}`);
    let cursor = 0;
    let location = null;
    for (let frameIndex = 0; frameIndex < bridgeBefore.frames.length; frameIndex++) {
      const rowIndex = bridgeBefore.frames[frameIndex].regions.findIndex(old => old.catalog === row.catalog && old.regionId === row.regionId && old.ownerBindingKey?.[1] === row.owner.itemId);
      if (rowIndex >= 0) { location = `frames[${frameIndex}].regions[${rowIndex}]`; break; }
      cursor += bridgeBefore.frames[frameIndex].regions.length;
    }
    assert(location, `cannot resolve bridge row path for ${row.regionId}`);
    return [`${location}.catalogSha256`, `${location}.ownerSourceLinkSha256`];
  }),
].sort();
assert(deepEqual(bridgeDiffPaths.slice().sort(), expectedPinPaths), 'bridge contains edits outside six catalog pins and two fields on eight owner joins');
assert(bridgeDiffPaths.length === 22, `expected exactly 22 bridge leaf differences, got ${bridgeDiffPaths.length}`);
const v7ToV8DiffPaths = diffPaths(bridgeV7, bridgeAfter);
const expectedV7ToV8Paths = changedRows.map(row => {
  for (let frameIndex = 0; frameIndex < bridgeV7.frames.length; frameIndex++) {
    const rowIndex = bridgeV7.frames[frameIndex].regions.findIndex(old => old.catalog === row.catalog && old.regionId === row.regionId && old.owner.itemId === row.owner.itemId);
    if (rowIndex >= 0) return `frames[${frameIndex}].regions[${rowIndex}].ownerSourceLinkSha256`;
  }
  throw new Error(`V7 bridge row missing for ${row.regionId}`);
}).sort();
assert(deepEqual(v7ToV8DiffPaths.slice().sort(), expectedV7ToV8Paths), 'V8 bridge differs from frozen V7 bridge outside the eight native owner-link hashes');
assert(v7ToV8DiffPaths.length === 8, 'V8 bridge should update only eight row owner-link hashes relative to V7');
writeJson(`${OUT}/source-frame-coordinate-bridge-v8-candidate.json`, bridgeAfter);

// Mutation controls establish that the candidate depends on the accepted hashes and source records.
const firstNewRecordIndex = ledgerV8.reviews.findIndex(record => v6RegionIds.has(record.regionId) && record.itemId === v6.regions[0].owner.itemId && record.regionId === v6.regions[0].regionId);
assert(firstNewRecordIndex >= 0, 'cannot locate first accepted appended region review for mutation control');
const firstNewRecord = ledgerV8.reviews[firstNewRecordIndex];
const missingReviewLedger = structuredClone(ledgerV8);
missingReviewLedger.reviews.splice(firstNewRecordIndex, 1);
const missingReviewData = nativeDataFor(missingReviewLedger);
const missingReviewOwner = missingReviewData.classes.find(item => item.id === firstNewRecord.itemId);
const missingReviewResult = missingReviewOwner.sourceExcerpts.regionReviews.find(review => review.regionId === firstNewRecord.regionId);
assert(missingReviewResult?.status === 'unreviewed' && missingReviewResult.recordedReview === null,
  'native producer did not downgrade a removed accepted visual record');
assert(hashCanonical(missingReviewOwner.sourceExcerpts) !== nativeOwners.get(firstNewRecord.itemId).newOwnerSourceLinkSha256,
  'removing accepted source evidence did not change native owner link');

const firstDefaultRecord = ledgerV8.reviews.find(record => v6RegionIds.has(record.regionId) && record.assessments?.default?.independent === true);
assert(firstDefaultRecord, 'no new default review available for mutation control');
const wrongDefaultLedger = structuredClone(ledgerV8);
const wrongDefaultRecord = wrongDefaultLedger.reviews.find(record => record.collection === firstDefaultRecord.collection && record.itemId === firstDefaultRecord.itemId && record.regionId === firstDefaultRecord.regionId);
wrongDefaultRecord.defaultOrderSha256 = '0'.repeat(64);
const expectedDefaultOrder = defaultByRegionId.get(firstDefaultRecord.regionId).group.after.defaultOrderSha256;
const defaultOrderAccepted = wrongDefaultRecord.defaultOrderSha256 === expectedDefaultOrder;
assert(!defaultOrderAccepted, 'mutated default order unexpectedly matches accepted group order');

const mismatchedCatalogs = new Map([...catalogs.entries()].map(([path, catalog]) => [path, structuredClone(catalog)]));
const mismatchCatalog = mismatchedCatalogs.get(overrides.sourceExcerpts[`classes:${firstNewRecord.itemId}`].catalog);
const mismatchRegion = mismatchCatalog.regions.find(region => region.id === firstNewRecord.regionId);
mismatchRegion.sha256 = '0'.repeat(64);
const mismatchedData = nativeDataFor(ledgerV8, mismatchedCatalogs);
const staleReviewResult = mismatchedData.classes.find(item => item.id === firstNewRecord.itemId).sourceExcerpts.regionReviews.find(review => review.regionId === firstNewRecord.regionId);
assert(staleReviewResult?.status === 'stale' && staleReviewResult.recordedReview?.hashesMatch === false,
  'native producer did not reject a review whose catalog image pin changed');

const mutatedLedgerPrefix = structuredClone(ledgerV8);
mutatedLedgerPrefix.reviews[0].assessments.highlight.evidence = 'mutated preexisting evidence';
const oldPrefixMutationRejected = !deepEqual(mutatedLedgerPrefix.reviews.slice(0, 1849), weaponLedger.reviews);
assert(oldPrefixMutationRejected, 'mutation control failed to detect an altered old review prefix');

const mutatedCoreBridge = structuredClone(bridgeAfter);
mutatedCoreBridge.frames[0].regions[0].normalizedPageRect[0] += 0.000001;
const changedCoreFields = CORE_FIELDS.some(field => !deepEqual(bridgeBefore.frames[0].regions[0][field], mutatedCoreBridge.frames[0].regions[0][field]));
assert(changedCoreFields, 'mutation control failed to detect a changed registered geometry tuple');
const unexpectedBridgeMutationRejected = !deepEqual(diffPaths(bridgeBefore, mutatedCoreBridge).sort(), expectedPinPaths);
assert(unexpectedBridgeMutationRejected, 'mutation control failed to reject an untyped bridge leaf change');

writeJson(`${OUT}/mutation-controls-v8.json`, {
  schemaVersion: 1,
  artifactType: 'ua-class-guidance-context-v8-mutation-controls',
  status: 'All negative mutation controls rejected by the candidate’s exact-hash, native metadata, or typed-diff checks.',
  controls: [
    { mutation: 'Remove one accepted UA region review record', expected: 'Native owner review becomes unreviewed and owner-link hash changes.', observed: 'Rejected; native status unreviewed, recordedReview null, owner-link hash differs.', pass: true },
    { mutation: 'Replace one accepted defaultOrderSha256 with 64 zeroes', expected: 'Must not equal exact accepted ordered page-group hash.', observed: 'Rejected; mutated hash does not equal the pinned accepted group order.', expectedDefaultOrderSha256: expectedDefaultOrder, observedDefaultOrderSha256: wrongDefaultRecord.defaultOrderSha256, pass: !defaultOrderAccepted },
    { mutation: 'Change image SHA on one accepted candidate region', expected: 'Source visual record must be stale against catalog evidence.', observed: `Rejected; native region status is ${staleReviewResult.status}, hashesMatch=${staleReviewResult.recordedReview.hashesMatch}.`, pass: staleReviewResult.status === 'stale' },
    { mutation: 'Alter an existing record in the preserved 1,849-entry prefix', expected: 'Unpublished weapon ledger prefix must remain byte-object exact.', observed: 'Rejected by exact prefix comparison.', pass: oldPrefixMutationRejected },
    { mutation: 'Alter a registered core geometry value', expected: 'All 102 core source/image/focus/geometry tuples must remain exact.', observed: 'Rejected; registered normalizedPageRect differs.', pass: changedCoreFields },
    { mutation: 'Add an untyped registry leaf change outside the 22 authorized pins', expected: 'Typed bridge diff must contain only six catalog map entries and two pin fields on eight rows.', observed: 'Rejected by exact bridge leaf-path comparison.', pass: unexpectedBridgeMutationRejected },
  ],
  validation: { allControlsPassed: true, productionFilesChanged: 0 },
});

const migration = {
  schemaVersion: 1,
  artifactType: 'ua-class-guidance-context-v8-typed-source-frame-provenance-migration',
  status: 'Research-only exact typed pin migration; not active and not a blanket registry repin.',
  baseRegistry: { path: ACTIVE_BRIDGE, sha256: shaPath(ACTIVE_BRIDGE) },
  candidateRegistry: { path: `${OUT}/source-frame-coordinate-bridge-v8-candidate.json`, sha256: shaPath(`${OUT}/source-frame-coordinate-bridge-v8-candidate.json`), frameGroups: bridgeAfter.counts.frameGroups, regionBindings: 102, ownerBindings: 102 },
  acceptedSourceAndDefaultReviews: {
    v6: { path: V6_REVIEW, sha256: shaPath(V6_REVIEW) },
    v7Root: { path: V7_ROOT_REVIEW, sha256: shaPath(V7_ROOT_REVIEW) },
  },
  supersedesV7BridgeCandidate: {
    path: `${V7}/source-frame-coordinate-bridge-v7-candidate.json`,
    sha256: shaPath(`${V7}/source-frame-coordinate-bridge-v7-candidate.json`),
    exactDifferencePaths: v7ToV8DiffPaths,
    exactDifferenceCount: v7ToV8DiffPaths.length,
    reason: 'Only the eight registered ownerSourceLinkSha256 pins change because the native producer now attaches the accepted 32-region visual ledger; the six catalog pins and all other registry data remain the exact V7 proposal.',
  },
  acceptedLedger: { path: `${OUT}/source-visual-reviews-v8-candidate.json`, sha256: shaPath(`${OUT}/source-visual-reviews-v8-candidate.json`), baseEntries: 1849, addedRegionReviews: 32, addedDefaultAssessments: 22 },
  nativeOwnerMetadataProducer: {
    path: 'tools/price-source-inventory.mjs', sha256: shaPath('tools/price-source-inventory.mjs'),
    function: 'attachSourceVisualReviewMetadata(data, { ledger, catalogs })',
    replayPath: `${OUT}/native-owner-link-replay.json`, replaySha256: shaPath(`${OUT}/native-owner-link-replay.json`),
  },
  typedChanges: {
    catalogContentHashMap: sixCatalogs.map(catalog => ({
      type: 'registered-catalog-content-hash', catalog,
      from: bridgeBefore.provenance.catalogHashes[catalog], to: bridgeAfter.provenance.catalogHashes[catalog],
      reason: 'The exact bounded V7 catalog candidate appends source-context regions; source-visual review metadata is owner-bound separately.',
    })),
    registeredOwnerJoins: changedRows.map(row => ({
      type: 'registered-region-owner-join', owner: row.owner, regionId: row.regionId, catalog: row.catalog,
      catalogSha256: { from: row.oldCatalogSha256, to: row.newCatalogSha256 },
      ownerSourceLinkSha256: { from: row.oldOwnerSourceLinkSha256, to: row.newOwnerSourceLinkSha256 },
      nativeProducer: 'The owner link hash is calculated from prospective sourceExcerpts after the actual native attachSourceVisualReviewMetadata producer attaches the 32 accepted region records and 22 page-group defaults.',
    })),
  },
  exactness: {
    changedRegistryLeafCount: bridgeDiffPaths.length,
    changedRegistryLeafPaths: bridgeDiffPaths,
    v7BridgeToV8ChangedLeaves: v7ToV8DiffPaths,
    v7BridgeToV8OnlyEightNativeOwnerLinkPinsChanged: v7ToV8DiffPaths.length === 8,
    sixCatalogHashEntries: sixCatalogs.length,
    rowBearingCatalogs: Object.fromEntries([...rowCounts.entries()].sort()),
    changedOwnerJoins: changedRows.length,
    all102OwnerSourceImageFocusAndGeometryCoreTuplesExact: true,
    allExistingOwnerReviewObjectsAndGradesExact: true,
    noNumericMechanicsOrFieldGradePromoted: true,
    sourcePdfPinsFrameBoxesCoordinateTagsAndOrderingUnchanged: true,
    bridgeDataSha256AtRegistryBuildUnchanged: bridgeAfter.provenance.dataSha256AtRegistryBuild === bridgeBefore.provenance.dataSha256AtRegistryBuild,
    bridgeBooksJsSha256Unchanged: bridgeAfter.provenance.booksJsSha256 === bridgeBefore.provenance.booksJsSha256,
  },
  retainedUntouched: {
    candidateCatalogOutsideExistingRegistryHashMap: [...newCatalogHashes.keys()].filter(path => !registryCatalogs.includes(path)),
    hashOnlyCompanionCatalogs: sixCatalogs.filter(path => !ROW_CATALOGS.has(path)),
    noDataOrBooksJsRepin: true,
    noFrameGeometryOrReviewHashRepin: true,
  },
  activationBoundary: 'Candidate only. The final assembled data hash, current pointer, and remote merge base must be recomputed/revalidated after the unpublished weapon branch is merged. This migration changes only six catalog hash-map entries and the catalog/link pins on eight existing rows.',
};
writeJson(`${OUT}/typed-provenance-migration-v8.json`, migration);

const continuationSource = {
  path: WEAPON_CONTINUATIONS,
  sha256: shaPath(WEAPON_CONTINUATIONS),
  branchCommit: WEAPON_GIT_HEAD,
  prefixCommit: WEAPON_PREFIX_COMMIT,
  prefixGroups: 261,
  prefixCanonicalSha256: hashCanonical(weaponContinuations.groups),
  liveBaseComparison: {
    currentLiveCcBaseGroups: 260,
    unpublishedWeaponPrefixGroups: 261,
    prospectiveAppendedUaGroups: 10,
    prospectiveTotalGroups: continuationV8.groups.length,
    status: 'This candidate is 9ee/7dd based and is not the current live cc950 manifest.',
  },
};
const candidatePinPaths = proposal.catalogs.map(record => ({
  path: record.prospectivePath,
  sha256: record.afterSha256,
  imageRegions: readJson(record.prospectivePath).regions.length,
}));
const manifest = {
  schemaVersion: 1,
  artifactType: 'ua-class-guidance-context-v8-native-accepted-ledger-candidate',
  status: 'Research-only prospective accepted-review metadata and typed frame-provenance successor; no active data, catalogs, ledger, registry, or continuation pointer changed.',
  base: {
    commit: 'cc9509047746d5e27a71cb5b1e0cfcb739a688c9',
    liveLedgerPath: 'research/source-visual-reviews.json',
    liveLedgerSha256: shaPath('research/source-visual-reviews.json'),
    liveLedgerReviewCount: activeLedger.reviews.length,
    unpublishedWeaponCommit: WEAPON_GIT_HEAD,
    unpublishedWeaponContinuationCommit: WEAPON_PREFIX_COMMIT,
    unpublishedWeaponLedgerPath: WEAPON_LEDGER,
    unpublishedWeaponLedgerSha256: shaPath(WEAPON_LEDGER),
    unpublishedWeaponLedgerReviewCount: weaponLedger.reviews.length,
    unpublishedWeaponContinuationPath: WEAPON_CONTINUATIONS,
    unpublishedWeaponContinuationSha256: shaPath(WEAPON_CONTINUATIONS),
  },
  approvalPins: {
    v6IndependentReview: { path: V6_REVIEW, sha256: shaPath(V6_REVIEW) },
    v7RootReview: { path: V7_ROOT_REVIEW, sha256: shaPath(V7_ROOT_REVIEW) },
    v7Manifest: { path: `${V7}/final-author-manifest.json`, sha256: shaPath(`${V7}/final-author-manifest.json`) },
    v7Proposal: { path: `${V7}/proposal.json`, sha256: shaPath(`${V7}/proposal.json`) },
    v7ReviewPacket: { path: `${V7}/review-packet.json`, sha256: shaPath(`${V7}/review-packet.json`) },
    v7BridgeCandidate: { path: `${V7}/source-frame-coordinate-bridge-v7-candidate.json`, sha256: shaPath(`${V7}/source-frame-coordinate-bridge-v7-candidate.json`) },
  },
  candidateArtifacts: {
    sourceVisualReviews: { path: `${OUT}/source-visual-reviews-v8-candidate.json`, sha256: shaPath(`${OUT}/source-visual-reviews-v8-candidate.json`), totalReviews: reviews.length, appendedAcceptedRegions: 32, appendedDefaultReviews: 22 },
    continuationManifest: { path: `${OUT}/citation-continuations-v8-candidate.json`, sha256: shaPath(`${OUT}/citation-continuations-v8-candidate.json`), groups: continuationV8.groups.length, weaponPrefixGroups: 261, uaAppendedGroups: 10 },
    candidateCatalogs: candidatePinPaths,
    nativeOwnerReplay: { path: `${OUT}/native-owner-link-replay.json`, sha256: shaPath(`${OUT}/native-owner-link-replay.json`) },
    mutationControls: { path: `${OUT}/mutation-controls-v8.json`, sha256: shaPath(`${OUT}/mutation-controls-v8.json`) },
    frameBridge: { path: `${OUT}/source-frame-coordinate-bridge-v8-candidate.json`, sha256: shaPath(`${OUT}/source-frame-coordinate-bridge-v8-candidate.json`) },
    typedProvenanceMigration: { path: `${OUT}/typed-provenance-migration-v8.json`, sha256: shaPath(`${OUT}/typed-provenance-migration-v8.json`) },
    builder: { path: `${OUT}/build-v8-candidate.mjs`, sha256: shaPath(`${OUT}/build-v8-candidate.mjs`) },
    continuationBase: continuationSource,
  },
  acceptedScope: {
    owners: 7, sourceRegions: 32, exactSourceCrops: 18, orderedPageGroups: 24,
    newlyAcceptedPageGroupDefaults: 22, retainedOldDefaultsNotNewlyGraded: 2,
    continuationGroupsAppended: 10, allNumericMechanicFieldGradesRemainUnchanged: true,
  },
  registryScope: {
    frameGroups: 9, ownerJoins: 102, changedCatalogHashPins: 6,
    rowBearingCatalogs: Object.fromEntries([...rowCounts.entries()].sort()), changedOwnerJoinRows: changedRows.length,
    companionHashOnlyCatalogs: sixCatalogs.filter(path => !ROW_CATALOGS.has(path)),
    unchangedCoreJoins: 102,
  },
  verification: {
    nativeProducer: 'PASS: exact future ledger and seven prospective catalogs passed through attachSourceVisualReviewMetadata(data, { ledger, catalogs }).',
    ledgerPrefix: 'PASS: first 1,845 live reviews are preserved in the unpublished weapon ledger; all 1,849 weapon entries are preserved before 32 UA append records.',
    continuations: 'PASS: exact 261-group unpublished 9ee/7dd prefix followed by ten reviewed UA groups; total 271 and not live cc950.',
    bridgeDiff: `PASS: exactly ${bridgeDiffPaths.length} typed hash-pin leaves changed; all 102 core source/image/focus/geometry tuples are exact.`,
    gradeBoundary: 'PASS: no numeric, XP, mechanics, source-value, or field-target grade was promoted.',
    noActivation: 'PASS: only files in this new research package were written by this builder.',
  },
};
writeJson(`${OUT}/v8-candidate-manifest.json`, manifest);

const result = {
  schemaVersion: 1,
  artifactType: 'ua-class-guidance-context-v8-build-verification',
  status: 'PASS; research-only candidate generated from pinned inputs.',
  inputPins: {
    v6Review: { path: V6_REVIEW, sha256: shaPath(V6_REVIEW) },
    v7RootReview: { path: V7_ROOT_REVIEW, sha256: shaPath(V7_ROOT_REVIEW) },
    currentData: { path: 'dist/data.json', sha256: shaBytes(currentDataBytes) },
    nativeProducer: { path: 'tools/price-source-inventory.mjs', sha256: shaPath('tools/price-source-inventory.mjs') },
    weaponLedger: { path: WEAPON_LEDGER, sha256: shaPath(WEAPON_LEDGER), reviews: weaponLedger.reviews.length },
    weaponContinuations: { path: WEAPON_CONTINUATIONS, sha256: shaPath(WEAPON_CONTINUATIONS), groups: weaponContinuations.groups.length },
    activeBridge: { path: ACTIVE_BRIDGE, sha256: shaPath(ACTIVE_BRIDGE) },
    v7Bridge: { path: `${V7}/source-frame-coordinate-bridge-v7-candidate.json`, sha256: shaPath(`${V7}/source-frame-coordinate-bridge-v7-candidate.json`) },
  },
  outputPins: {
    ledger: { path: `${OUT}/source-visual-reviews-v8-candidate.json`, sha256: shaPath(`${OUT}/source-visual-reviews-v8-candidate.json`) },
    continuations: { path: `${OUT}/citation-continuations-v8-candidate.json`, sha256: shaPath(`${OUT}/citation-continuations-v8-candidate.json`) },
    ownerReplay: { path: `${OUT}/native-owner-link-replay.json`, sha256: shaPath(`${OUT}/native-owner-link-replay.json`) },
    mutationControls: { path: `${OUT}/mutation-controls-v8.json`, sha256: shaPath(`${OUT}/mutation-controls-v8.json`) },
    bridge: { path: `${OUT}/source-frame-coordinate-bridge-v8-candidate.json`, sha256: shaPath(`${OUT}/source-frame-coordinate-bridge-v8-candidate.json`) },
    migration: { path: `${OUT}/typed-provenance-migration-v8.json`, sha256: shaPath(`${OUT}/typed-provenance-migration-v8.json`) },
    manifest: { path: `${OUT}/v8-candidate-manifest.json`, sha256: shaPath(`${OUT}/v8-candidate-manifest.json`) },
  },
  results: {
    appendedVisualReviewRecords: 32,
    newlyAcceptedDefaultAssessments: 22,
    retainedOldDefaultsNotRegraded: 2,
    nativeOwnerLinkReplays: ownerLinks.length,
    nativeOwnerLinksPreservedOldReviews: ownerLinks.every(record => record.allPreexistingReviewObjectsExact),
    continuationGroups: continuationV8.groups.length,
    continuationPrefixGroups: 261,
    appendedUaContinuationGroups: 10,
    bridgeFrameGroups: bridgeAfter.counts.frameGroups,
    bridgeOwnerJoins: bridgeAfter.counts.ownerBindings,
    bridgeChangedLeaves: bridgeDiffPaths.length,
    v7BridgeChangedLeaves: v7ToV8DiffPaths.length,
    v7BridgeToV8ChangedPaths: v7ToV8DiffPaths,
    bridgeChangedLeafPaths: bridgeDiffPaths,
    bridgeChangedOwnerRows: changedRows.length,
    all102CoreRowsExact: true,
    noGradePromotion: true,
    noActiveFileChanged: true,
  },
};
writeJson(`${OUT}/v8-verification.json`, result);

console.log(JSON.stringify({
  outputDirectory: OUT,
  ledgerReviews: reviews.length,
  appendedRegionReviews: 32,
  appendedDefaultAssessments: 22,
  continuationGroups: continuationV8.groups.length,
  nativeOwnerLinks: ownerLinks.length,
  bridgeLeavesChanged: bridgeDiffPaths.length,
  bridgeOwnerRowsChanged: changedRows.length,
  manifestSha256: shaPath(`${OUT}/v8-candidate-manifest.json`),
  verificationSha256: shaPath(`${OUT}/v8-verification.json`),
}, null, 2));
