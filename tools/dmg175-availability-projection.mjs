import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import books from '../dist/books.js';

export const DMG175_IMAGE_SHA256 = 'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7';
export const DMG_CANONICAL_PDF_SHA256 = '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669';
export const DMG175_SOURCE_ARTIFACT_ID = 'dmg175-user-confirmed-supplement';
export const DMG175_MONETARY_SCREEN_ID = 'dmg-175-user-confirmed-supplement';

export const DMG175_OWNER_CATALOGS = Object.freeze({
  'appendix-c-character-subtable': 'scans/verified/rules-appendix-c-character-subtable.json',
  'appendix-c-party-size': 'scans/verified/rules-appendix-c-party-size.json',
  'appendix-c-character-levels': 'scans/verified/rules-appendix-c-character-levels.json',
  'appendix-c-henchmen': 'scans/verified/rules-appendix-c-henchmen.json',
  'appendix-c-character-guidance': 'scans/verified/rules-appendix-c-character-guidance.json',
  'appendix-c-party-magic-distribution': 'scans/verified/rules-appendix-c-party-magic-distribution.json',
  'appendix-c-magic-table-i': 'scans/verified/rules-appendix-c-magic-table-i.json',
  'appendix-c-magic-table-ii': 'scans/verified/rules-appendix-c-magic-table-ii.json',
  'appendix-c-magic-table-iii': 'scans/verified/rules-appendix-c-magic-table-iii.json',
  'appendix-c-magic-table-iv': 'scans/verified/rules-appendix-c-magic-table-iv.json',
  'appendix-c-magic-item-notes': 'scans/verified/rules-appendix-c-magic-item-notes.json',
});

export const DMG175_TABLE_OWNER_IDS = Object.freeze([
  'appendix-c-character-subtable', 'appendix-c-party-magic-distribution',
  'appendix-c-magic-table-i', 'appendix-c-magic-table-ii',
  'appendix-c-magic-table-iii', 'appendix-c-magic-table-iv',
]);

export const DMG175_EXPECTED_REGION_IDS = Object.freeze([
  "dmg-175-level-others-context-5aa02e91e35c4c28",
  "dmg-175-party-table-context-78c4c383c38c7d10",
  "dmg175-character-level-left-level-of-characters-paragraph-left-column-portion",
  "dmg175-character-level-right-level-of-characters-paragraph-right-column-continuation",
  "dmg175-character-subtable-character-subtable-row-00",
  "dmg175-character-subtable-character-subtable-row-01-17",
  "dmg175-character-subtable-character-subtable-row-18-20",
  "dmg175-character-subtable-character-subtable-row-21-60",
  "dmg175-character-subtable-character-subtable-row-61-62",
  "dmg175-character-subtable-character-subtable-row-63-65",
  "dmg175-character-subtable-character-subtable-row-66-86",
  "dmg175-character-subtable-character-subtable-row-87-88",
  "dmg175-character-subtable-character-subtable-row-89-98",
  "dmg175-character-subtable-character-subtable-row-99",
  "dmg175-character-subtable-complete-character-subtable-heading-column-labels-and-all-rows",
  "dmg175-level-others-abilities-guidance-character-and-henchman-abilities-alignment-paragraph",
  "dmg175-level-others-abilities-guidance-character-and-henchman-equipment-paragraph",
  "dmg175-level-others-abilities-guidance-character-spells-paragraph",
  "dmg175-level-others-abilities-guidance-complete-level-of-others-with-characters-paragraph",
  "dmg175-party-magic-items-party-magic-items-complete-introductory-paragraph",
  "dmg175-party-magic-items-party-magic-items-distribution-10th-level",
  "dmg175-party-magic-items-party-magic-items-distribution-11th-level",
  "dmg175-party-magic-items-party-magic-items-distribution-12th-level",
  "dmg175-party-magic-items-party-magic-items-distribution-1st-level",
  "dmg175-party-magic-items-party-magic-items-distribution-2nd-level",
  "dmg175-party-magic-items-party-magic-items-distribution-3rd-level",
  "dmg175-party-magic-items-party-magic-items-distribution-4th-level",
  "dmg175-party-magic-items-party-magic-items-distribution-5th-level",
  "dmg175-party-magic-items-party-magic-items-distribution-6th-level",
  "dmg175-party-magic-items-party-magic-items-distribution-7th-level",
  "dmg175-party-magic-items-party-magic-items-distribution-8th-level",
  "dmg175-party-magic-items-party-magic-items-distribution-9th-level",
  "dmg175-party-size-number-of-characters-in-party-procedure",
  "dmg175-party-size-separate-party-procedure-clause-incompatible-profession-and-class-maximum-results"
]);
const DMG175_LEGACY_CONTEXT_IDS = Object.freeze(['dmg-175-level-others-context-5aa02e91e35c4c28','dmg-175-party-table-context-78c4c383c38c7d10']);
function approvedImageHashes() {
  return [...new Set(DMG175_EXPECTED_REGION_IDS.map(id => {
    const crop = books.supplementalCrop('DMG',175,id);
    if (!crop) fail(`expected supplemental region is absent from the current approved registry: ${id}`);
    return crop.sha256;
  }))].sort();
}
function validateRegisteredSupplement(catalog,region) {
  const identity = books.resolveRegionSourceIdentity(catalog,region);
  if (!identity?.valid || identity.sourceKind !== 'supplemental-image' || identity.sourceSha256 !== DMG175_IMAGE_SHA256) fail(`unregistered supplemental crop/source tuple: ${region.id}`);
}

// Closed reviewed source-catalog contents; canonical hashes ignore JSON object-key order.
const EXPECTED_CATALOG_FILE_HASHES = Object.freeze({
  "scans/verified/rules-appendix-c-character-guidance.json": "06aca643a116795eb8da20ed9447a2495ec71b150e047005db48dfac0c8a0102",
  "scans/verified/rules-appendix-c-character-levels.json": "f7f2c6b0e3272ee9c078686ce03b065160bde6b0f1218a9c8d9e9efdd51e66ff",
  "scans/verified/rules-appendix-c-character-subtable.json": "0df6a6dde3884e3dc81810c1d8750aab7a645e85674af4a37b5b479c4bbe2e19",
  "scans/verified/rules-appendix-c-henchmen.json": "dc1e6e42c6a21dee554f583da43518bbdd0f44bf0de9ce87a375b8270a15fa87",
  "scans/verified/rules-appendix-c-magic-item-notes.json": "ef15db32b4af72fc52984f2bc1e87dd0b3ea5e4a26f9df44b0a9f21272adf116",
  "scans/verified/rules-appendix-c-magic-table-i.json": "b8b6331b7a73db2706c2fa7cd182436eb630543952cd5eba0815a4f43b659de0",
  "scans/verified/rules-appendix-c-magic-table-ii.json": "4e0bd4444cbde7a7589ef528f0b9df20457baa97b594410aefb1b042c8b9e7fb",
  "scans/verified/rules-appendix-c-magic-table-iii.json": "b9a17461b509c194906dfd4bc81cb7ab2d2d1db3f780d408675096736bcf86c5",
  "scans/verified/rules-appendix-c-magic-table-iv.json": "489e3ad4eb09edd2eb241c7192063f7e7ecccb9dff9040d4ece89a051b225511",
  "scans/verified/rules-appendix-c-party-magic-distribution.json": "50f67f70cecb18aa86fd3bbc802da03b02f4b2c5b056be0577e08fa7e40ac706",
  "scans/verified/rules-appendix-c-party-size.json": "617df82bf7a79f243106bf3b424546164a1832b0106e7e3deb51dff797cb1b8a",
  "scans/verified/rules-encounter-types.json": "ffbe682e5c4ba3f2d2f45e0e6fc9361654fa6527c231f3a4fc220b4510e1aa3d"
});
const EXPECTED_CATALOG_CONTENT_HASHES = Object.freeze({
  "scans/verified/rules-appendix-c-character-guidance.json": "869d0b2d5d9d3e0c6a2e68346251a0c3d1f2023de1cf605994b783014512f30a",
  "scans/verified/rules-appendix-c-character-levels.json": "99f3685ed874d94579c6232dce694107cdbb4c6049975e1672b4bb01ec4e2e1f",
  "scans/verified/rules-appendix-c-character-subtable.json": "fab3addf877032a0e8120fc8d978fdd3f37735d884a16089864f7e6e17f57062",
  "scans/verified/rules-appendix-c-henchmen.json": "48cc31dce2132ed0b4229e63cf19c5373f16ebed55adc86bd484fbdfe6bb20e1",
  "scans/verified/rules-appendix-c-magic-item-notes.json": "e9e552747dbff86a439b70288c4ade3d2b9f97f1aa63eb3c44019066cffff019",
  "scans/verified/rules-appendix-c-magic-table-i.json": "f0745b0778ff9cf115693495649b3870a2c97c5e61ba041deef2fe5facbd41f4",
  "scans/verified/rules-appendix-c-magic-table-ii.json": "20a37e6a39d5d370b988b1adfd0062f47f2f79658bca4d7d0c73465de190f9b0",
  "scans/verified/rules-appendix-c-magic-table-iii.json": "577076327661ee39bc8274ae67c5f8b7a4806a21d1f2a077bfe0df353ab9ecea",
  "scans/verified/rules-appendix-c-magic-table-iv.json": "bad5af3834f1016a8b7c0e1d9ffc069c4676094c36ae0c61df0a553907e00461",
  "scans/verified/rules-appendix-c-party-magic-distribution.json": "6df35d02e51eddd572b2e69b9114e97166c6f63bcc455a34d67f4fa8409bdf65",
  "scans/verified/rules-appendix-c-party-size.json": "c5df44bd163e6362a1e6808beec64fbc2946a51f8be4fce39ee5d82a9bdf9456",
  "scans/verified/rules-encounter-types.json": "747c00b8f5c52d26b0aec0e0b262a78b0ebcbbefe2d2d56435108d5474992c02"
});
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value !== null && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const catalogContentHash = catalog => createHash('sha256').update(canonical(catalog)).digest('hex');

const EXPECTED_SOURCE_PAGES = Object.freeze({
  'appendix-c-character-subtable': [175],
  'appendix-c-party-size': [175],
  'appendix-c-character-levels': [175],
  'appendix-c-henchmen': [175],
  'appendix-c-character-guidance': [175],
  'appendix-c-party-magic-distribution': [175, 176],
  'appendix-c-magic-table-i': [176],
  'appendix-c-magic-table-ii': [176],
  'appendix-c-magic-table-iii': [176],
  'appendix-c-magic-table-iv': [176],
  'appendix-c-magic-item-notes': [176],
});

const fail = message => { throw new Error(`Invalid DMG p.175 availability projection: ${message}`); };
const exact = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
const clone = value => structuredClone(value);

function validatePageIdentity(handoff) {
  const pages = handoff?.missingReferencedContent?.missingCitedPages;
  if (!Array.isArray(pages) || pages.length !== 1) fail('the single missing cited page denominator changed');
  const missing = pages[0];
  if (missing.book !== 'DMG' || missing.printedPage !== 175 || missing.pdfPage !== null
      || missing.canonicalSource?.sha256 !== DMG_CANONICAL_PDF_SHA256
      || missing.canonicalSource?.file !== 'DMG_1stEd.pdf'
      || missing.privateSupplement?.sha256 !== DMG175_IMAGE_SHA256
      || !isDeepStrictEqual(missing.privateSupplement?.dimensions, [1329, 1796])
      || missing.privateSupplement?.printing !== 'not specified'
      || missing.privateSupplement?.published !== false) fail('the known p.175 missing-PDF / private-image identity changed');
  const oldRegions = missing.currentReference?.regionIds;
  if (!Array.isArray(oldRegions) || oldRegions.length !== 2 || new Set(oldRegions).size !== 2) fail('the two existing context-review region IDs changed');
  exact([...oldRegions].sort(), DMG175_LEGACY_CONTEXT_IDS, 'legacy context region identity set changed');
  const screens = handoff.sourcePriceDiscoveryCensuses?.supplementalPageScreens;
  if (!Array.isArray(screens) || screens.length !== 1) fail('the bounded supplemental monetary screen is missing');
  const screen = screens[0];
  if (screen.id !== DMG175_MONETARY_SCREEN_ID || screen.book !== 'DMG' || screen.printedPage !== 175
      || screen.canonicalPdfPage !== null || screen.canonicalPdfSha256 !== DMG_CANONICAL_PDF_SHA256
      || screen.supplementalImageSha256 !== DMG175_IMAGE_SHA256 || screen.editionStatus !== 'user-confirmed-correct-edition'
      || screen.printingStatus !== 'not-specified' || !Array.isArray(screen.cropRegions) || screen.cropRegions.length !== 2) {
    fail('the older two-crop monetary-source screen changed; availability must be projected separately');
  }
  return {missing, oldContextRegionIds: [...oldRegions], monetaryScreen: clone(screen)};
}

function sourceArtifactMatches(catalog) {
  const artifact = catalog.sourceArtifacts?.[DMG175_SOURCE_ARTIFACT_ID];
  return artifact && artifact.id === DMG175_SOURCE_ARTIFACT_ID
    && artifact.type === 'supplemental-page-image'
    && artifact.book === 'DMG' && artifact.printedPage === 175
    && artifact.sha256 === DMG175_IMAGE_SHA256
    && artifact.mediaType === 'image/jpeg'
    && isDeepStrictEqual(artifact.dimensionsPx, [1329, 1796])
    && artifact.canonicalPdfSha256 === DMG_CANONICAL_PDF_SHA256
    && artifact.originalPdfContainsPrintedPage === false
    && artifact.editionStatus === 'user-confirmed-correct-edition'
    && artifact.printingStatus === 'not-specified';
}

function validateTargetPlan(targetPlan) {
  const counts = targetPlan?.counts;
  const claims = targetPlan?.claims;
  if (targetPlan?.artifactType !== 'DMG175 V5 current-UA research-only native/raw successor'
      || !counts || counts.rawNewOwners !== 11 || counts.structuredPhysicalRows !== 87
      || counts.rowsPrinted175Supplement !== 22 || counts.rowsPrinted176Pdf !== 65
      || counts.bulletTargets !== 33 || counts.pendingBindingAppend !== 120
      || !claims || claims.sourceValuesOrMechanicsGradesPromoted !== false) {
    fail('the pinned D175 target-plan denominator or pending-grade claim changed');
  }
  return {plannedTargets: counts.pendingBindingAppend, pendingTargets: counts.pendingBindingAppend, bulletTargets: counts.bulletTargets};
}

export function deriveDmg175Availability({data, baselineData, handoff, loadCatalog, targetPlan}) {
  if (!data || !baselineData || typeof loadCatalog !== 'function') fail('current/baseline data and a catalog reader are required');
  const {missing, oldContextRegionIds, monetaryScreen} = validatePageIdentity(handoff);
  const presentIds = new Set((data.rules || []).map(record => record.id));
  const baselineIds = new Set((baselineData.rules || []).map(record => record.id));
  const ownerIds = Object.keys(DMG175_OWNER_CATALOGS);
  for (const id of ownerIds) {
    if (!presentIds.has(id)) fail(`current Appendix C owner is missing: ${id}`);
    if (baselineIds.has(id)) fail(`candidate owner is not new against the pinned baseline: ${id}`);
  }
  const ownerRecords = ownerIds.map(id => data.rules.find(record => record.id === id));
  const catalogPaths = new Set([missing.currentReference.catalog, ...ownerIds.map(id => DMG175_OWNER_CATALOGS[id])]);
  if (catalogPaths.size !== 12) fail('expected one old context catalog plus eleven current owner catalogs');
  const catalogs = new Map();
  for (const catalogPath of catalogPaths) {
    const catalog = loadCatalog(`dist/${catalogPath}`);
    if (!catalog || catalog.collection !== 'rules' || typeof catalog.itemId !== 'string'
        || catalog.sources?.DMG?.sha256 !== DMG_CANONICAL_PDF_SHA256 || !Array.isArray(catalog.regions)) {
      fail(`invalid or unpinned source catalog: ${catalogPath}`);
    }
    if (catalog.regions.some(region => region.printedPage === 175) && !sourceArtifactMatches(catalog)) {
      fail(`p.175 supplemental artifact identity is incomplete in ${catalogPath}`);
    }
    if (catalogContentHash(catalog) !== EXPECTED_CATALOG_CONTENT_HASHES[catalogPath]) fail(`current reviewed catalog content changed: ${catalogPath}`);
    catalogs.set(catalogPath, catalog);
  }

  const ownerCatalogHashSet = new Set();
  const uniqueRegionMap = new Map();
  const p175Images = new Set();
  const allCatalogImages = new Set();
  for (const [index, id] of ownerIds.entries()) {
    const owner = ownerRecords[index];
    const catalogPath = DMG175_OWNER_CATALOGS[id];
    const catalog = catalogs.get(catalogPath);
    const expectedPages = EXPECTED_SOURCE_PAGES[id];
    if (owner.sourceExcerpts?.collection !== 'rules' || owner.sourceExcerpts?.catalog !== catalogPath
        || owner.sourceExcerpts?.state !== 'source-excerpt-checked'
        || !isDeepStrictEqual(owner.pages, expectedPages)
        || catalog.itemId !== id || catalog.regions.length !== owner.sourceExcerpts.regionCount) {
      fail(`current owner/catalog relationship changed: ${id}`);
    }
    ownerCatalogHashSet.add(catalogPath);
    for (const region of catalog.regions) {
      if (!expectedPages.includes(region.printedPage) || region.book !== 'DMG') fail(`unexpected source page in ${id}: ${region.id}`);
      if (region.printedPage === 175) {
        if (region.pdfPage !== null || region.sourceArtifactId !== DMG175_SOURCE_ARTIFACT_ID) fail(`p.175 region has invalid PDF/supplement identity: ${region.id}`);
        validateRegisteredSupplement(catalog,region);
        p175Images.add(region.sha256);
        const previous = uniqueRegionMap.get(region.id);
        if (previous && !isDeepStrictEqual(previous, region)) fail(`duplicate p.175 region identity differs across catalogs: ${region.id}`);
        uniqueRegionMap.set(region.id, region);
      } else if (region.printedPage === 176) {
        if (region.pdfPage !== 176 || (region.sourceArtifactId != null && region.sourceArtifactId !== 'dmg-canonical-pdf')) fail(`p.176 region is not tied to the canonical PDF: ${region.id}`);
      }
      allCatalogImages.add(region.image);
    }
  }
  if (ownerCatalogHashSet.size !== 11 || p175Images.size !== 6) fail('new owner catalog or supplemental crop-image denominator changed');

  const legacyCatalog = catalogs.get(missing.currentReference.catalog);
  if (legacyCatalog.itemId !== missing.currentReference.itemId) fail('legacy p.175 context catalog owner changed');
  for (const region of legacyCatalog.regions) allCatalogImages.add(region.image);
  const legacyP175Regions = legacyCatalog.regions.filter(region => region.book === 'DMG' && region.printedPage === 175);
  exact(legacyP175Regions.filter(region => oldContextRegionIds.includes(region.id)).map(region => region.id).sort(), [...oldContextRegionIds].sort(), 'the two old context regions are not present in the legacy catalog');
  const legacyImages = new Set(legacyP175Regions.filter(region => oldContextRegionIds.includes(region.id)).map(region => region.sha256));
  if (legacyImages.size !== 2) fail('the existing two context regions no longer correspond to two distinct crops');
  for (const region of legacyP175Regions) {
    validateRegisteredSupplement(legacyCatalog,region);
    const prior = uniqueRegionMap.get(region.id);
    if (prior && !isDeepStrictEqual(prior, region)) fail(`legacy/current catalog region collision: ${region.id}`);
    uniqueRegionMap.set(region.id, region);
    p175Images.add(region.sha256);
    allCatalogImages.add(region.image);
  }
  if (p175Images.size !== 8 || uniqueRegionMap.size !== 34 || allCatalogImages.size !== 15) {
    fail(`p.175/p.176/PHB catalog asset counts changed (crops=${p175Images.size}, p175Regions=${uniqueRegionMap.size}, allImages=${allCatalogImages.size})`);
  }

  exact([...uniqueRegionMap.keys()].sort(), DMG175_EXPECTED_REGION_IDS, 'current p.175 region identity set changed');
  exact([...p175Images].sort(), approvedImageHashes(), 'current p.175 image hash set differs from the approved native crops');

  let structuredRows = 0;
  const rowsByPage = {175: 0, 176: 0};
  for (const id of DMG175_TABLE_OWNER_IDS) {
    const owner = ownerRecords[ownerIds.indexOf(id)];
    const rows = owner.table?.rows;
    const references = owner.sourceReferences;
    if (!Array.isArray(rows) || !Array.isArray(references) || references.length !== rows.length) fail(`table/source-reference denominator changed: ${id}`);
    structuredRows += rows.length;
    for (const reference of references) {
      if (reference.book !== 'DMG' || ![175, 176].includes(reference.printedPage)
          || reference.reviewStatus !== 'field-target-pending' || reference.targetReview != null) {
        fail(`table target is no longer pending or has an invalid source identity: ${id}`);
      }
      if (reference.printedPage === 175) {
        if (reference.pdfPage !== null || reference.sourceArtifactId !== DMG175_SOURCE_ARTIFACT_ID
            || reference.sourceSha256 !== DMG175_IMAGE_SHA256 || reference.canonicalPdfSha256 !== DMG_CANONICAL_PDF_SHA256) fail(`supplemental row provenance changed: ${id}`);
      } else if (reference.pdfPage !== 176 || reference.sourceArtifactId !== 'dmg-canonical-pdf'
          || reference.sourceSha256 !== DMG_CANONICAL_PDF_SHA256) fail(`canonical p.176 row provenance changed: ${id}`);
      rowsByPage[reference.printedPage]++;
    }
  }
  exact({structuredRows, ...rowsByPage}, {structuredRows: 87, 175: 22, 176: 65}, 'structured-row count or p.175/p.176 split changed');
  const targetCounts = validateTargetPlan(targetPlan);
  if (targetCounts.plannedTargets !== structuredRows + targetCounts.bulletTargets) fail('planned field targets do not reconcile with table rows and prose targets');

  return {
    schemaVersion: 1,
    artifactType: 'DMG p.175 current-source availability projection evidence',
    sourceIdentity: {
      book: 'DMG', printedPage: 175, canonicalPdfPage: null,
      canonicalPdfSha256: DMG_CANONICAL_PDF_SHA256,
      supplementalImageSha256: DMG175_IMAGE_SHA256,
      imageDimensionsPx: [1329, 1796],
      editionStatus: 'user-confirmed-correct-edition', printingStatus: 'not-specified',
      fullImagePublished: false,
    },
    availability: {
      distinctSupplementalCropImages: p175Images.size,
      distinctP175RegionIds: uniqueRegionMap.size,
      previouslyReviewedContextRegions: oldContextRegionIds.length,
      newlyCatalogedSupplementalImages: p175Images.size - legacyImages.size,
      catalogImagesAcrossP175P176AndPHB103: allCatalogImages.size,
      supplementalCropImageSha256s: [...p175Images].sort(),
      p175RegionIds: [...uniqueRegionMap.keys()].sort(),
    },
    content: {
      currentRuleOwners: ownerIds.length,
      tableOwners: DMG175_TABLE_OWNER_IDS.length,
      structuredTableRows: structuredRows,
      rowsPrinted175Supplement: rowsByPage[175],
      rowsPrinted176Pdf: rowsByPage[176],
      plannedFieldTargets: targetCounts.plannedTargets,
      pendingFieldTargets: targetCounts.pendingTargets,
      proseTargets: targetCounts.bulletTargets,
      sourceValuesAssessed: false,
      mechanicsGradesPromoted: false,
      contextReviewExpanded: false,
      completeAppendixCTranscription: false,
    },
    handoffPreservation: {
      legacyContextRegionIds: oldContextRegionIds,
      monetarySourceScreenCropCount: monetaryScreen.cropRegions.length,
      monetarySourceScreenUnchanged: true,
    },
    evidence: {
      ownerIds,
      ownerCatalogs: [...ownerCatalogHashSet].sort(),
      legacyCatalog: missing.currentReference.catalog,
      targetPlanManifest: 'research/dmg175-current-content-projection-v1/inputs/target-plan-manifest-v2.json',
      targetPlanOriginalPath: 'research/dmg175-current-ua-native-successor-v2/manifest-v2.json',
      targetPlanManifestSha256: '1f7ab9d2c84fafd62231b9fbd6fc58933a0179cba97dc51fd728ad1cafc6458f',
    },
  };
}

export function projectDmg175Handoff({handoff, evidence}) {
  if (!handoff || evidence?.artifactType !== 'DMG p.175 current-source availability projection evidence') fail('validated p.175 evidence is required');
  const next = clone(handoff);
  const page = next.missingReferencedContent?.missingCitedPages?.[0];
  if (!page || page.book !== 'DMG' || page.printedPage !== 175 || page.pdfPage !== null) fail('cannot project a non-DMG p.175 page');
  const availability = evidence.availability;
  const content = evidence.content;
  page.status = 'missing-from-supplied-canonical-PDF; user-confirmed correct-edition supplemental image available in bounded catalog crops; printing not specified';
  page.privateSupplement.limitedCropsStaged = availability.distinctSupplementalCropImages;
  page.privateSupplement.distinctP175RegionIds = availability.distinctP175RegionIds;
  page.privateSupplement.previouslyReviewedContextRegionCount = availability.previouslyReviewedContextRegions;
  page.privateSupplement.note = 'The user confirmed the separate image is from the correct edition. Eight distinct limited p.175 crops are cataloged across 34 distinct region IDs. The two prior context regions remain reviewed only for their existing encounter-procedure facts; availability does not extend those reviews. Printing is not specified, the full image remains private, and the canonical PDF still omits p. 175.';
  page.contentScope = 'The current bounded cards contain 11 Appendix C rule owners and 87 structured rows across six tables: 22 rows cite supplemental printed p. 175 and 65 rows cite canonical PDF p. 176. The plan has 120 source-field targets (87 table rows and 33 prose targets), all pending. Source values and mechanics are not assessed by these target statuses. This does not establish complete Appendix C or DMG coverage.';
  page.currentAvailability = clone(evidence);
  next.summary.currentSupplementalSourcePage = {
    book: 'DMG', printedPage: 175, canonicalPdfPage: null,
    userConfirmedCorrectEdition: true,
    reviewedCropCount: availability.previouslyReviewedContextRegions,
    reviewedCropCountScope: 'The preserved legacy field counts only the two prior context-reviewed regions. It is not a total of later crop/highlight-only visual assessments; those remain in the independent visual-review ledger.',
    availableDistinctCropCount: availability.distinctSupplementalCropImages,
    distinctRegionIdCount: availability.distinctP175RegionIds,
    additionalAvailableCropCount: availability.newlyCatalogedSupplementalImages,
    availability: 'Eight distinct limited crops are cataloged across 34 p.175 region IDs. The two prior context regions remain reviewed only for existing facts.',
    contentScope: `${content.currentRuleOwners} bounded Appendix C owners contain ${content.structuredTableRows} structured table rows (${content.rowsPrinted175Supplement} supplemental p.175; ${content.rowsPrinted176Pdf} canonical p.176); ${content.plannedFieldTargets} source-field targets remain pending.`,
    sourceValueScope: 'Table values, source-field targets, and mechanics remain unassessed; no review grade is inherited from the two prior context regions. The full Appendix C and DMG are not declared complete.',
  };
  return next;
}

export function buildDmg175CoverageEntry({data, handoff, evidence}) {
  const missing = handoff?.missingReferencedContent?.missingCitedPages?.[0];
  const expectedCatalogs = [...new Set([missing?.currentReference?.catalog, ...Object.values(DMG175_OWNER_CATALOGS)])].sort();
  const actualCatalogHashes = evidence?.evidence?.sourceCatalogSha256;
  const availability = evidence?.availability;
  if (!missing || missing.book !== 'DMG' || missing.printedPage !== 175 || missing.pdfPage !== null
      || !isDeepStrictEqual(missing.currentAvailability,evidence)
      || evidence?.artifactType !== 'DMG p.175 current-source availability projection evidence'
      || !isDeepStrictEqual(evidence.sourceIdentity,{book:'DMG',printedPage:175,canonicalPdfPage:null,canonicalPdfSha256:DMG_CANONICAL_PDF_SHA256,supplementalImageSha256:DMG175_IMAGE_SHA256,imageDimensionsPx:[1329,1796],editionStatus:'user-confirmed-correct-edition',printingStatus:'not-specified',fullImagePublished:false})
      || availability?.distinctSupplementalCropImages !== 8 || availability?.distinctP175RegionIds !== 34
      || availability?.previouslyReviewedContextRegions !== 2 || availability?.newlyCatalogedSupplementalImages !== 6
      || availability?.catalogImagesAcrossP175P176AndPHB103 !== 15
      || !Array.isArray(availability?.supplementalCropImageSha256s) || availability.supplementalCropImageSha256s.length !== 8
      || !availability.supplementalCropImageSha256s.every(hash => /^[a-f0-9]{64}$/.test(hash))
      || new Set(availability.supplementalCropImageSha256s).size !== 8
      || !Array.isArray(availability?.p175RegionIds) || availability.p175RegionIds.length !== 34
      || new Set(availability.p175RegionIds).size !== 34 || availability.p175RegionIds.some(id => typeof id !== 'string' || !id.startsWith('dmg175-') && !id.startsWith('dmg-175-'))
      || evidence?.content?.currentRuleOwners !== 11 || evidence?.content?.structuredTableRows !== 87
      || evidence?.content?.rowsPrinted175Supplement !== 22 || evidence?.content?.rowsPrinted176Pdf !== 65
      || evidence?.content?.plannedFieldTargets !== 120 || evidence?.content?.pendingFieldTargets !== 120
      || evidence?.content?.sourceValuesAssessed !== false || evidence?.content?.mechanicsGradesPromoted !== false
      || evidence?.content?.contextReviewExpanded !== false || evidence?.content?.completeAppendixCTranscription !== false
      || evidence?.handoffPreservation?.monetarySourceScreenCropCount !== 2
      || evidence?.handoffPreservation?.monetarySourceScreenUnchanged !== true
      || evidence?.evidence?.targetPlanManifest !== 'research/dmg175-current-content-projection-v1/inputs/target-plan-manifest-v2.json'
      || evidence?.evidence?.targetPlanManifestSha256 !== '1f7ab9d2c84fafd62231b9fbd6fc58933a0179cba97dc51fd728ad1cafc6458f'
      || !/^[a-f0-9]{64}$/.test(evidence?.evidence?.currentDataSha256 || '')
      || !actualCatalogHashes || !isDeepStrictEqual(Object.keys(actualCatalogHashes).sort(), expectedCatalogs)
      || Object.values(actualCatalogHashes).some(hash => !/^[a-f0-9]{64}$/.test(hash))) fail('current p.175 availability is missing or unbounded');
  exact(actualCatalogHashes, EXPECTED_CATALOG_FILE_HASHES, 'published current source-catalog file hashes changed');
  exact(availability.p175RegionIds, DMG175_EXPECTED_REGION_IDS, 'published p.175 region identity set changed');
  exact(availability.supplementalCropImageSha256s, approvedImageHashes(), 'published p.175 image hash set differs from the approved native crops');
  exact([...(evidence.handoffPreservation.legacyContextRegionIds || [])].sort(), DMG175_LEGACY_CONTEXT_IDS, 'published legacy context identities changed');
  const links = [
    ['encounter-types', 'Open existing encounter-procedure card'],
    ['appendix-c-character-subtable', 'Appendix C character-class limits'],
    ['appendix-c-party-magic-distribution', 'Appendix C party magic-item distribution'],
    ['appendix-c-magic-table-i', 'Appendix C Magic Item Table I'],
    ['appendix-c-magic-table-ii', 'Appendix C Magic Item Table II'],
    ['appendix-c-magic-table-iii', 'Appendix C Magic Item Table III'],
    ['appendix-c-magic-table-iv', 'Appendix C Magic Item Table IV'],
  ].map(([id, label]) => {
    if (!data.rules?.some(record => record.id === id)) fail(`coverage link target is missing: ${id}`);
    return {label, href: `#rules/${encodeURIComponent(id)}`};
  });
  return {
    id: 'missing-cited-DMG-175',
    title: 'DMG p. 175 · supplemental source available',
    status: 'physical-gap-in-supplied-pdf; limited-supplemental-excerpts-available',
    description: `The supplied image is confirmed as the correct edition and provides evidence for printed p.175. This page is absent from the original PDF. Eight limited p.175 excerpts are available with the linked Appendix C cards, with related tables and continuations on p.176. The 11 Appendix C cards contain 87 table rows; their individual citations and numerical values still await verification. The image’s printing is unspecified, and the full image remains private. Appendix C and DMG coverage remain incomplete.`,
    sourceLocations: [{book: 'DMG', printedPage: 175}],
    links,
    handoffPointers: ['/missingReferencedContent/missingCitedPages/0', '/summary/currentSupplementalSourcePage'],
  };
}
