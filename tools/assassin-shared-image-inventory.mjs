import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';

export const ASSASSIN_SHARED_IMAGE_BASELINE = '13783128ca5955ac707ed7ec6994d78d7c9a7cce';

const collections = ['rules', 'spells', 'equipment', 'matrices', 'classes', 'sources'];
const citationMetadata = new Set(['sourceExcerpts', 'scanVerification', 'evidenceBindings', 'regionReviews', 'regionEvidence', 'expectedRegionEvidence', 'targetReview', 'recordedReview', 'verification']);
const pageAnchors = new Set(['PHB:19', 'PHB:27', 'PHB:28', 'PHB:32', 'PHB:33', 'PHB:37']);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const pointer = parts => `/${parts.map(part => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;

function pagesOf(value) {
  const pages = Array.isArray(value?.pages) ? value.pages
    : Number.isInteger(value?.printedPage) ? [value.printedPage]
      : Number.isInteger(value?.page) ? [value.page] : [];
  return [...new Set(pages.filter(page => Number.isInteger(page) && page > 0))];
}

function normalizedRect(region) {
  const rect = region?.normalizedPageRect;
  if (Array.isArray(rect) && rect.length === 4 && rect.every(Number.isFinite)) return rect;
  if (rect && Number.isFinite(rect.x) && Number.isFinite(rect.y) && Number.isFinite(rect.width) && Number.isFinite(rect.height)) return [rect.x, rect.y, rect.width, rect.height];
  return null;
}

function intersects(a, b) {
  return !!a && !!b && a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
}

function sameRect(a, b, tolerance = 1e-5) {
  return !!a && !!b && a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
}

function nearSameCrop(a, b) {
  if (!a || !b) return false;
  const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]);
  const x1 = Math.min(a[0] + a[2], b[0] + b[2]), y1 = Math.min(a[1] + a[3], b[1] + b[3]);
  const overlap = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const areaA = a[2] * a[3], areaB = b[2] * b[3];
  return overlap / Math.min(areaA, areaB) >= 0.95 && Math.max(areaA, areaB) / Math.min(areaA, areaB) <= 1.5;
}

function collectRecords(data) {
  const records = [];
  for (const collection of collections) {
    if (!Array.isArray(data?.[collection])) continue;
    for (const [index, item] of data[collection].entries()) {
      if (!item || typeof item !== 'object') continue;
      records.push({collection, item, itemId: String(item.id ?? index), index});
    }
  }
  if (data?.progressionExplainer && typeof data.progressionExplainer === 'object') {
    const item = data.progressionExplainer;
    records.push({collection: 'progressionExplainer', item, itemId: String(item.id ?? 'progression-explainer'), index: null});
  }
  return records;
}

const ownerKey = owner => owner ? `${owner.collection}:${owner.itemId}` : null;
const routeSelectedCatalog = item => item?.sourceExcerpts?.catalog || item?.scanVerification?.catalog || null;

export function collectCatalogPropertyPointers(data) {
  const records = collectRecords(data);
  const ownerRecords = new Map(records.map(({collection, itemId, item}) => [ownerKey({collection, itemId}), item]));
  const pointers = [];
  const propertyPointers = [];

  for (const record of records) {
    const routeOwner = {collection: record.collection, itemId: record.itemId};
    const selectedCatalog = routeSelectedCatalog(record.item);
    const walkCatalogs = (value, parts = []) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach((child, index) => walkCatalogs(child, [...parts, String(index)]));
        return;
      }
      if (typeof value.catalog === 'string' && value.catalog) {
        const relPointer = pointer([...parts, 'catalog']);
        const generated = parts.includes('evidenceBindings');
        const explicitSourceOwner = value.sourceOwner && typeof value.sourceOwner === 'object' ? value.sourceOwner : null;
        const bindingOwner = generated && value.collection && value.itemId ? {collection: value.collection, itemId: value.itemId} : null;
        const sourceOwner = explicitSourceOwner || bindingOwner || routeOwner;
        const sourceOwnerItem = ownerRecords.get(ownerKey(sourceOwner));
        const selectedForOwner = routeSelectedCatalog(sourceOwnerItem);
        const isSourceExcerpts = relPointer === '/sourceExcerpts/catalog';
        const isScanVerification = relPointer === '/scanVerification/catalog';
        const viewerSelected = value.catalog === selectedCatalog && (isSourceExcerpts || isScanVerification);
        const pointerKind = generated ? 'generated-field-binding-catalog'
          : viewerSelected ? 'viewer-selected-source-catalog'
            : isScanVerification || isSourceExcerpts ? 'nonselected-source-catalog'
              : 'other-nested-catalog-pointer';
        pointers.push({
          id: `catalog-pointer-${pointers.length + 1}`,
          routeOwner,
          propertyPointer: relPointer,
          absoluteDataPointer: record.collection === 'progressionExplainer'
            ? `/progressionExplainer${relPointer}`
            : `/${record.collection}/${record.index}${relPointer}`,
          pointerKind,
          catalog: value.catalog,
          viewerSelectedCatalogForRoute: selectedCatalog,
          viewerSelectedForRoute: viewerSelected,
          sourceOwner,
          viewerSelectedCatalogForSourceOwner: selectedForOwner,
          catalogMatchesSourceOwnerSelection: !!selectedForOwner && value.catalog === selectedForOwner,
          generatedFieldPointer: generated ? (value.fieldPointer ?? null) : null,
        });
      }
      for (const [key, child] of Object.entries(value)) walkCatalogs(child, [...parts, key]);
    };
    walkCatalogs(record.item);

    const walkProperties = (value, parts = []) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach((child, index) => walkProperties(child, [...parts, String(index)]));
        return;
      }
      const pages = pagesOf(value);
      if (typeof value.book === 'string' && pages.length) {
        const sourceObjectPointer = pointer(parts);
        const fieldPointer = parts[0] === 'fieldSources' && parts.length >= 2 && record.item.fields && Object.hasOwn(record.item.fields, parts[1])
          ? pointer(['fields', parts[1]]) : sourceObjectPointer;
        const rawEmbeddedBindings = Array.isArray(value.evidenceBindings) ? value.evidenceBindings : [];
        propertyPointers.push({
          id: `property-pointer-${propertyPointers.length + 1}`,
          routeOwner,
          sourceObjectPointer,
          fieldPointer,
          book: value.book,
          printedPages: pages,
          routeViewerSelectedCatalog: selectedCatalog,
          sourceOwner: value.sourceOwner || routeOwner,
          explicitRegionIds: value.verification?.regions || [],
          embeddedGeneratedBindingIds: rawEmbeddedBindings.map((binding, index) => ({index, catalog: binding.catalog ?? null, fieldPointer: binding.fieldPointer ?? null, sourceOwner: binding.sourceOwner ?? null})),
        });
      }
      for (const [key, child] of Object.entries(value)) if (!citationMetadata.has(key)) walkProperties(child, [...parts, key]);
    };
    walkProperties(record.item);
  }
  return {records, ownerRecords, pointers, propertyPointers};
}

function anchorInfo(assassinCatalog, historicalCatalog) {
  const oldFailureIds = new Set([
    'phb-27-a0862452b397bc19',
    'phb-32-3b48ac7c748517e3',
    'phb-33-3e99376517d917d0',
    'phb-28-c18cfa2ca0a1cda2',
  ]);
  const historical = (historicalCatalog?.regions || []).filter(region => oldFailureIds.has(region.id));
  const current = (assassinCatalog?.regions || []).filter(region => ['PHB:19', 'PHB:28', 'PHB:33', 'PHB:37'].includes(`${region.book}:${region.printedPage}`));
  const p33LeftCandidate = [0.03, 303 / 788.399780273, 272.532826 / 582.239135742, 444.2 / 788.399780273];
  const p33RightCandidate = [302 / 582.239135742, 28 / 788.399780273, 269 / 582.239135742, 82 / 788.399780273];
  const p19ScrollNoteCandidate = [21 / 582.719177246, 227 / 787.199035645, 473 / 582.719177246, 18 / 787.199035645];
  const p37ProficiencyNoteCandidate = [303 / 579.599304199, 116 / 786.239929199, 271 / 579.599304199, 54.5 / 786.239929199];
  return {historical, current, p33LeftCandidate, p33RightCandidate, p19ScrollNoteCandidate, p37ProficiencyNoteCandidate};
}

function classifyRegion(region, anchors, {currentSnapshot}) {
  const rect = normalizedRect(region);
  const oldMatches = anchors.historical.filter(anchor => anchor.sha256 === region.sha256);
  const currentMatches = anchors.current.filter(anchor => anchor.sha256 === region.sha256);
  const geometryMatches = [...anchors.historical, ...anchors.current].filter(anchor => anchor.book === region.book && anchor.printedPage === region.printedPage && sameRect(normalizedRect(anchor), rect));
  const nearGeometryMatches = [...anchors.historical, ...anchors.current].filter(anchor => anchor.book === region.book && anchor.printedPage === region.printedPage && nearSameCrop(normalizedRect(anchor), rect));
  const p33Rect = region.book === 'PHB' && region.printedPage === 33 && rect && (intersects(rect, anchors.p33LeftCandidate) || intersects(rect, anchors.p33RightCandidate));
  const knownPage = pageAnchors.has(`${region.book}:${region.printedPage}`);
  if (oldMatches.length || currentMatches.length || geometryMatches.length || nearGeometryMatches.length || p33Rect) {
    return {
      disposition: 'candidate',
      reasons: [
        ...(oldMatches.length ? ['exact historical Assassin image SHA'] : []),
        ...(currentMatches.length ? ['exact current Assassin image SHA'] : []),
        ...(geometryMatches.length ? ['exact Assassin source-page crop geometry'] : []),
        ...(nearGeometryMatches.length ? ['near-equivalent Assassin crop geometry (at least 95% overlap of the smaller crop; area ratio at most 1.5)'] : []),
        ...(p33Rect ? ['intersects source-measured PHB p.33 left-example or right-continuation bounds'] : []),
      ],
      matchedAnchorRegionIds: [...new Set([...oldMatches, ...currentMatches, ...geometryMatches, ...nearGeometryMatches].map(anchor => anchor.id))],
    };
  }
  if (knownPage && region.book === 'PHB' && region.printedPage === 33 && rect) {
    return {disposition: 'excluded', reasons: ['same printed page, but crop is spatially disjoint from the two-class worked-example segments'], matchedAnchorRegionIds: []};
  }
  return {
    disposition: knownPage ? 'uncertain' : 'excluded',
    reasons: [knownPage ? 'same source page as an Assassin context issue but no matched image/crop geometry; field relevance needs source review' : 'outside the specifically inventoried Assassin source-image/page/geometry sets'],
    matchedAnchorRegionIds: [],
  };
}

function buildSnapshotInventory({name, source, dataBytes, loadCatalogBytes, loadImageBytes, isCurrentSnapshot, historicalAssassinCatalog}) {
  const data = JSON.parse(dataBytes.toString('utf8'));
  const {records, ownerRecords, pointers, propertyPointers} = collectCatalogPropertyPointers(data);
  const catalogCache = new Map();
  for (const item of pointers) {
    if (catalogCache.has(item.catalog)) continue;
    try {
      const bytes = loadCatalogBytes(item.catalog);
      catalogCache.set(item.catalog, {catalog: JSON.parse(bytes.toString('utf8')), sha256: sha256(bytes), loadError: null});
    } catch (error) {
      catalogCache.set(item.catalog, {catalog: null, sha256: null, loadError: String(error.message || error)});
    }
  }
  const assassinPointer = pointers.find(item => item.routeOwner.collection === 'classes' && item.routeOwner.itemId === 'assassin' && item.propertyPointer === '/sourceExcerpts/catalog');
  const assassinCatalog = assassinPointer ? catalogCache.get(assassinPointer.catalog)?.catalog : null;
  const anchors = anchorInfo(assassinCatalog, historicalAssassinCatalog);
  const pointerByCatalog = new Map();
  for (const [index, item] of pointers.entries()) {
    item.pointerIndex = index;
    const values = pointerByCatalog.get(item.catalog) || [];
    values.push(index);
    pointerByCatalog.set(item.catalog, values);
  }
  const catalogRegionUsages = [];
  const candidateImageCache = new Map();
  for (const [catalogPath, loaded] of catalogCache.entries()) {
    if (!loaded.catalog) continue;
    const owners = [...new Set((pointerByCatalog.get(catalogPath) || []).map(index => ownerKey(pointers[index].routeOwner)))];
    const sourceCatalogOwner = {collection: loaded.catalog.collection ?? null, itemId: loaded.catalog.itemId ?? null};
    for (const region of loaded.catalog.regions || []) {
      const classification = classifyRegion(region, anchors, {currentSnapshot: isCurrentSnapshot});
      const use = {
        catalog: catalogPath,
        catalogSha256: loaded.sha256,
        catalogOwner: sourceCatalogOwner,
        routeOwners: owners,
        pointerIndexes: pointerByCatalog.get(catalogPath) || [],
        regionId: region.id,
        book: region.book,
        printedPage: region.printedPage,
        pdfPage: region.pdfPage,
        title: region.title ?? null,
        image: region.image,
        imageSha256: region.sha256,
        width: region.width,
        height: region.height,
        normalizedPageRect: normalizedRect(region),
        role: region.role ?? null,
        disposition: classification.disposition,
        reasons: classification.reasons,
        matchedAnchorRegionIds: classification.matchedAnchorRegionIds,
        imageBytesCheck: classification.disposition === 'candidate' ? 'pending' : 'not-run',
      };
      if (classification.disposition === 'candidate') {
        const assetRel = `${dirname(catalogPath)}/${region.image}`;
        if (!candidateImageCache.has(assetRel)) {
          try { candidateImageCache.set(assetRel, sha256(loadImageBytes(assetRel))); }
          catch { candidateImageCache.set(assetRel, null); }
        }
        const actual = candidateImageCache.get(assetRel);
        use.imageBytesCheck = actual === null ? 'asset-unavailable' : actual === region.sha256 ? 'matches-declared-sha256' : 'declared-sha256-mismatch';
        use.imageBytesActualSha256 = actual;
      }
      catalogRegionUsages.push(use);
    }
  }

  const regionMap = new Map();
  for (const use of catalogRegionUsages) {
    const key = `${use.catalog}\0${use.regionId}`;
    regionMap.set(key, use);
  }
  const propertyPointerDispositions = propertyPointers.map(property => {
    const pages = property.printedPages.map(printedPage => {
      const catalog = property.routeViewerSelectedCatalog;
      const matching = catalog ? catalogRegionUsages.filter(use => use.catalog === catalog && use.book === property.book && use.printedPage === printedPage) : [];
      const explicit = property.explicitRegionIds.length ? matching.filter(use => property.explicitRegionIds.includes(use.regionId)) : matching;
      const disposition = !catalog || !matching.length ? 'uncertain'
        : explicit.some(use => use.disposition === 'candidate') ? 'candidate'
          : explicit.some(use => use.disposition === 'uncertain') ? 'uncertain'
            : 'excluded';
      return {
        book: property.book,
        printedPage,
        disposition,
        matchingRegionIds: matching.map(use => use.regionId),
        explicitTargetRegionIds: property.explicitRegionIds,
        matchedCandidateRegionIds: explicit.filter(use => use.disposition === 'candidate').map(use => use.regionId),
        reason: !catalog ? 'route has no viewer-selected catalog'
          : !matching.length ? 'no region on this cited page in the route-selected catalog'
            : disposition === 'candidate' ? 'page/field points to a route-selected candidate image or crop; semantic use remains for explicit source review'
              : disposition === 'excluded' ? 'route-selected source region is outside this specific shared-image candidate set'
                : 'source page/property mapping remains unresolved',
      };
    });
    return {...property, pageDispositions: pages, disposition: pages.some(page => page.disposition === 'candidate') ? 'candidate' : pages.some(page => page.disposition === 'uncertain') ? 'uncertain' : 'excluded'};
  });

  const seedRegions = [
    ...anchors.historical.map(region => ({id: `historical-${region.id}`, anchorRegionId: region.id, source: {book: region.book, printedPage: region.printedPage}, imageSha256: region.sha256, rect: normalizedRect(region), family: 'historical-assassin-image'})),
    ...anchors.current.map(region => ({id: `snapshot-${region.id}`, anchorRegionId: region.id, source: {book: region.book, printedPage: region.printedPage}, imageSha256: region.sha256, rect: normalizedRect(region), family: 'snapshot-assassin-crop'})),
    {id: 'assassin-phb-33-two-class-example', anchorRegionId: 'phb-33-3e99376517d917d0', source: {book: 'PHB', printedPage: 33}, rects: [anchors.p33LeftCandidate, anchors.p33RightCandidate], family: 'same-page-ordered-example-segments'},
  ];
  const findSnapshotAnchor = predicate => seedRegions.find(seed => seed.source && predicate(seed)) || null;
  const p19TableSeed = findSnapshotAnchor(seed => seed.source.book === 'PHB' && seed.source.printedPage === 19 && seed.rect);
  const p28TableSeed = findSnapshotAnchor(seed => seed.source.book === 'PHB' && seed.source.printedPage === 28 && seed.rect?.[0] < 0.1 && seed.rect?.[1] < 0.1);
  const p28DescriptionSeed = findSnapshotAnchor(seed => seed.source.book === 'PHB' && seed.source.printedPage === 28 && seed.rect?.[0] > 0.45 && seed.rect?.[1] > 0.7);
  const p37TableSeed = findSnapshotAnchor(seed => seed.source.book === 'PHB' && seed.source.printedPage === 37 && seed.rect?.[0] < 0.1 && seed.rect?.[1] < 0.1);
  const issueDefinitions = [
    ...seedRegions.filter(seed => seed.family === 'historical-assassin-image').map(seed => ({id: seed.id, kind: 'historical-image', seed})),
    {id: 'assassin-phb-19-scroll-reading-footnote', kind: 'whole-note-omission', anchorRegionId: p19TableSeed?.anchorRegionId, source: {book: 'PHB', printedPage: 19}, missingExtent: 'four-star note granting scroll reading at 12th level for assassins', seed: {...p19TableSeed, rects: [p19TableSeed?.rect, anchors.p19ScrollNoteCandidate]}},
    {id: 'assassin-phb-28-thief-function-table', kind: 'table-context', anchorRegionId: p28TableSeed?.anchorRegionId, source: {book: 'PHB', printedPage: 28}, seed: p28TableSeed},
    {id: 'assassin-phb-28-class-description', kind: 'prose-context', anchorRegionId: p28DescriptionSeed?.anchorRegionId, source: {book: 'PHB', printedPage: 28}, seed: p28DescriptionSeed},
    {id: 'assassin-phb-33-two-class-example', kind: 'same-page-continuation', anchorRegionId: 'phb-33-3e99376517d917d0', source: {book: 'PHB', printedPage: 33}, seed: seedRegions.find(seed => seed.id === 'assassin-phb-33-two-class-example')},
    {id: 'assassin-phb-37-proficiency-interval-note', kind: 'whole-note-omission', anchorRegionId: p37TableSeed?.anchorRegionId, source: {book: 'PHB', printedPage: 37}, missingExtent: 'right-column Added Proficiency paragraph, including levels-above-1st explanation and progression example', seed: {...p37TableSeed, rects: [p37TableSeed?.rect, anchors.p37ProficiencyNoteCandidate]}},
  ];
  const issueSets = issueDefinitions.map(issue => {
    const source = issue.source || issue.seed?.source;
    const pageRegionUses = catalogRegionUsages.filter(use => use.book === source?.book && use.printedPage === source?.printedPage);
    const candidates = pageRegionUses.filter(use => {
      if (issue.seed?.imageSha256 && use.imageSha256 === issue.seed.imageSha256) return true;
      if (issue.seed?.rect && sameRect(use.normalizedPageRect, issue.seed.rect)) return true;
      if (issue.seed?.rect && nearSameCrop(use.normalizedPageRect, issue.seed.rect)) return true;
      if (issue.seed?.rects && issue.seed.rects.some(rect => intersects(use.normalizedPageRect, rect))) return true;
      return false;
    });
    const propertyRefs = propertyPointerDispositions.filter(property => property.book === source?.book && property.printedPages.includes(source?.printedPage));
    const regionCounts = pageRegionUses.reduce((counts, use) => { counts[use.disposition] = (counts[use.disposition] || 0) + 1; return counts; }, {});
    const propertyCounts = propertyRefs.reduce((counts, property) => {
      const page = property.pageDispositions.find(entry => entry.book === source.book && entry.printedPage === source.printedPage);
      const disposition = page?.disposition ?? property.disposition;
      counts[disposition] = (counts[disposition] || 0) + 1;
      return counts;
    }, {});
    return {
      id: issue.id,
      kind: issue.kind,
      source,
      anchorRegionId: issue.anchorRegionId ?? issue.seed?.anchorRegionId ?? null,
      anchorImageSha256: issue.seed?.imageSha256 ?? null,
      anchorNormalizedPageRect: issue.seed?.rect ?? null,
      candidateRegionUseCount: candidates.length,
      sameSourcePageRegionUseCount: pageRegionUses.length,
      sameSourcePageRegionDispositionCounts: regionCounts,
      sameSourcePagePropertyPointerCount: propertyRefs.length,
      sameSourcePagePropertyDispositionCounts: propertyCounts,
      candidateRegionUses: candidates.map(use => ({catalog: use.catalog, routeOwners: use.routeOwners, catalogOwner: use.catalogOwner, regionId: use.regionId, image: use.image, imageSha256: use.imageSha256, normalizedPageRect: use.normalizedPageRect, disposition: use.disposition, reasons: use.reasons, imageBytesCheck: use.imageBytesCheck})),
      otherSamePageRegionUses: pageRegionUses.filter(use => !candidates.includes(use)).map(use => ({catalog: use.catalog, routeOwners: use.routeOwners, catalogOwner: use.catalogOwner, regionId: use.regionId, image: use.image, imageSha256: use.imageSha256, normalizedPageRect: use.normalizedPageRect, disposition: use.disposition, reasons: use.reasons})),
      sourcePagePropertyPointers: propertyRefs.map(property => ({routeOwner: property.routeOwner, sourceObjectPointer: property.sourceObjectPointer, fieldPointer: property.fieldPointer, routeViewerSelectedCatalog: property.routeViewerSelectedCatalog, explicitRegionIds: property.explicitRegionIds, disposition: property.disposition, pageDispositions: property.pageDispositions.filter(page => page.book === source.book && page.printedPage === source.printedPage)})),
      semanticsNote: 'These are complete same-page consumer candidates, not proof that every property depends on the same passage. Each route/field owner requires its own source relevance disposition; no approval is inherited.',
    };
  });

  const catalogPointerKindCounts = {};
  for (const pointerUse of pointers) catalogPointerKindCounts[pointerUse.pointerKind] = (catalogPointerKindCounts[pointerUse.pointerKind] || 0) + 1;
  const catalogPaths = [...catalogCache.entries()].map(([path, loaded]) => ({
    path,
    sha256: loaded.sha256,
    owner: loaded.catalog ? {collection: loaded.catalog.collection ?? null, itemId: loaded.catalog.itemId ?? null} : null,
    regions: loaded.catalog?.regions?.length ?? 0,
    error: loaded.loadError,
  }));
  return {
    name,
    source,
    hashes: {dataJsonSha256: sha256(dataBytes)},
    denominator: {
      routeRecordsByCollection: Object.fromEntries([...new Set(records.map(record => record.collection))].sort().map(collection => [collection, records.filter(record => record.collection === collection).length])),
      catalogPointerOccurrences: pointers.length,
      catalogPointerKinds: catalogPointerKindCounts,
      uniqueCatalogPaths: catalogCache.size,
      catalogsLoaded: catalogPaths.filter(item => item.sha256).length,
      missingCatalogPaths: catalogPaths.filter(item => !item.sha256).map(item => ({path: item.path, error: item.error})),
      uniqueCatalogRegionBindings: catalogRegionUsages.length,
      propertyCitationPointers: propertyPointerDispositions.length,
      propertyCitationPageReferences: propertyPointerDispositions.reduce((sum, property) => sum + property.printedPages.length, 0),
      propertyPointerDispositionCounts: propertyPointerDispositions.reduce((counts, property) => { counts[property.disposition] = (counts[property.disposition] || 0) + 1; return counts; }, {}),
      regionDispositionCounts: catalogRegionUsages.reduce((counts, usage) => { counts[usage.disposition] = (counts[usage.disposition] || 0) + 1; return counts; }, {}),
    },
    catalogPointers: pointers,
    catalogPaths,
    catalogRegionUsages,
    propertyPointers: propertyPointerDispositions,
    issueSets,
    sourceOwnerVsRouteOwner: pointers.filter(item => ownerKey(item.sourceOwner) !== ownerKey(item.routeOwner)).map(item => ({pointerIndex: item.pointerIndex, routeOwner: item.routeOwner, propertyPointer: item.propertyPointer, sourceOwner: item.sourceOwner, catalog: item.catalog, catalogOwner: catalogCache.get(item.catalog)?.catalog ? {collection: catalogCache.get(item.catalog).catalog.collection ?? null, itemId: catalogCache.get(item.catalog).catalog.itemId ?? null} : null})),
  };
}

function listCatalogJsonFiles(directory, prefix = 'scans') {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const full = resolve(directory, entry.name);
    return entry.isDirectory() ? listCatalogJsonFiles(full, `${prefix}/${entry.name}`)
      : entry.isFile() && entry.name.endsWith('.json') ? [`${prefix}/${entry.name}`] : [];
  });
}

function snapshotBuilder({name, commit, distPath, pinnedBaseline = false}) {
  const root = resolve(import.meta.dirname, '..');
  const isGit = !!commit;
  const load = rel => isGit
    ? execFileSync('git', ['show', `${commit}:dist/${rel}`], {cwd: root, maxBuffer: 30 * 1024 * 1024})
    : readFileSync(resolve(distPath, rel));
  const loadCatalog = path => load(path);
  const dataBytes = load('data.json');
  const data = JSON.parse(dataBytes.toString('utf8'));
  const catalogPaths = new Set(collectCatalogPropertyPointers(data).pointers.map(item => item.catalog));
  const catalogs = new Map();
  for (const path of catalogPaths) {
    try { catalogs.set(path, JSON.parse(loadCatalog(path).toString('utf8'))); } catch { /* recorded in pointer inventory */ }
  }
  const loadImage = path => load(path);
  const historicalAssassinCatalog = isGit || pinnedBaseline
    ? JSON.parse(load('scans/verified/classes-assassin.json').toString('utf8'))
    : JSON.parse(execFileSync('git', ['show', `${ASSASSIN_SHARED_IMAGE_BASELINE}:dist/scans/verified/classes-assassin.json`], {cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024}));
  const built = buildSnapshotInventory({
    name,
    source: isGit ? {kind: 'git-show', commit} : {kind: 'working-tree-dist', gitHead: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(), state: 'working tree; may contain uncommitted files'},
    dataBytes,
    loadCatalogBytes: loadCatalog,
    loadImageBytes: loadImage,
    isCurrentSnapshot: !isGit && !pinnedBaseline,
    historicalAssassinCatalog,
  });
  return {built, data, catalogs, loadCatalogBytes: loadCatalog};
}

export async function buildAssassinSharedImageInventory({baselineCommit = ASSASSIN_SHARED_IMAGE_BASELINE, baselineDist = null, currentDist = resolve(import.meta.dirname, '../dist')} = {}) {
  const root = resolve(import.meta.dirname, '..');
  let baseline;
  if (baselineDist) {
    const dist = resolve(baselineDist);
    const loaded = snapshotBuilder({name: 'immutable-baseline', distPath: dist, pinnedBaseline: true});
    loaded.built.source = {kind: 'immutable-dist-export', expectedGitCommit: baselineCommit, note: 'The caller supplied the immutable dist export for the pinned baseline.'};
    baseline = loaded;
  } else baseline = snapshotBuilder({name: 'immutable-baseline', commit: baselineCommit});
  const current = snapshotBuilder({name: 'current-worktree', distPath: resolve(root, currentDist)});

  const {buildPriceSourceInventory} = await import('./price-source-inventory.mjs');
  const generatedProjection = snapshot => {
    const inventory = buildPriceSourceInventory({data: JSON.parse(JSON.stringify(snapshot.data)), catalogs: snapshot.catalogs, manualBindings: {schemaVersion: 1, bindings: []}});
    const bindings = inventory.fieldEvidenceBindings || [];
    const ownerIndex = new Map(collectRecords(snapshot.data).map(record => [ownerKey({collection: record.collection, itemId: record.itemId}), record.item]));
    const crossOwner = bindings.filter(binding => ownerKey(binding.sourceOwner) !== ownerKey({collection: binding.collection, itemId: binding.itemId}));
    const assassinBindings = bindings.filter(binding => binding.collection === 'classes' && binding.itemId === 'assassin');
    const relevant = bindings.filter(binding => binding.collection === 'classes' && binding.itemId === 'assassin' || crossOwner.includes(binding));
    const project = binding => {
      const routeOwner = {collection: binding.collection, itemId: binding.itemId};
      const sourceOwner = binding.sourceOwner || routeOwner;
      const routeItem = ownerIndex.get(ownerKey(routeOwner));
      const sourceItem = ownerIndex.get(ownerKey(sourceOwner));
      const routeCatalog = routeSelectedCatalog(routeItem);
      const sourceCatalog = routeSelectedCatalog(sourceItem);
      return {
        routeOwner,
        sourceOwner,
        fieldPointer: binding.fieldPointer,
        sourceObjectPointer: binding.sourceObjectPointer ?? null,
        book: binding.book,
        printedPage: binding.printedPage,
        generatedBindingCatalog: binding.catalog ?? null,
        routeViewerSelectedCatalog: routeCatalog,
        sourceOwnerViewerSelectedCatalog: sourceCatalog,
        generatedCatalogMatchesRouteSelection: !!routeCatalog && binding.catalog === routeCatalog,
        generatedCatalogMatchesSourceOwnerSelection: !!sourceCatalog && binding.catalog === sourceCatalog,
        regionIds: binding.regionIds || [],
        reviewStatus: binding.reviewStatus,
      };
    };
    const allByCollection = {};
    for (const binding of bindings) allByCollection[binding.collection] = (allByCollection[binding.collection] || 0) + 1;
    return {
      generator: 'tools/price-source-inventory.mjs::buildPriceSourceInventory',
      builderSha256: sha256(readFileSync(resolve(root, 'tools/price-source-inventory.mjs'))),
      status: 'derived-projection; not a persisted viewer catalog pointer',
      denominator: {
        generatedFieldBindings: bindings.length,
        byCollection: allByCollection,
        regionBound: bindings.filter(binding => (binding.regionIds || []).length > 0).length,
        pendingRegion: bindings.filter(binding => !(binding.regionIds || []).length).length,
        crossRouteSourceOwner: crossOwner.length,
        assassinFieldBindings: assassinBindings.length,
        catalogMatchesRouteSelection: bindings.filter(binding => binding.catalog && binding.catalog === routeSelectedCatalog(ownerIndex.get(ownerKey({collection: binding.collection, itemId: binding.itemId})))).length,
        catalogMatchesSourceOwnerSelection: bindings.filter(binding => binding.catalog && binding.catalog === routeSelectedCatalog(ownerIndex.get(ownerKey(binding.sourceOwner || {collection: binding.collection, itemId: binding.itemId})))).length,
      },
      relevantBindings: relevant.map(project),
    };
  };
  baseline.built.generatedFieldBindingProjection = generatedProjection(baseline);
  current.built.generatedFieldBindingProjection = generatedProjection(current);
  return {
    schemaVersion: 1,
    scope: 'Complete differential inventory of catalog pointer occurrences, structured citation-property pointers, route-selected source catalogs, generated field-evidence binding projections, and every region in each unique exposed catalog. Candidate/excluded/uncertain describe only relation to the named Assassin shared-image and context defects; they are not approvals or general source-quality verdicts.',
    baselineCommit: baselineCommit,
    candidateRules: {
      historicalAssassinImages: ['PHB p.27', 'PHB p.32', 'PHB p.33', 'PHB p.28'],
      currentAssassinSourceRegionsIncluded: ['PHB p.19', 'PHB p.28', 'PHB p.33', 'PHB p.37'],
      sourceVerifiedRecipes: {
        sourceSha256: 'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095',
        coordinateSpace: 'original PDF page points, top-left, xyxy',
        p19: {pdfPage: 20, printedPage: 19, pageSizePoints: [582.719177, 787.199036], tableCurrentRegionId: 'phb-19-602a36abc607e820', omittedFootnoteSourceWordBox: [25.7, 231.51, 488.504, 239.889], footnoteInkBounds: [25.708, 231.542, 485.792, 240], noteCrop: [21, 227, 494, 245], omittedContext: 'The four-star line states thieves gain magic-user/illusionist scroll reading at level 10, while assassins do so at level 12.'},
        p28: {pdfPage: 29, printedPage: 28, pageSizePoints: [579.599121, 781.918945], tableRegionId: 'phb-28-c18cfa2ca0a1cda2', tableCurrentRect: [11.592, 27.367, 562.211, 336.225], tableInkBounds: [14.217, 33.992, 550.717, 324.17], replacementCrop: [8, 27, 556, 330], scope: 'Complete thief-function table through Half-Orc racial row and full horizontal boundary; stop before the following Notes Regarding Thief Function Table heading.'},
        p28AssassinDescription: {pdfPage: 29, printedPage: 28, regionId: 'phb-28-51e6c7616e751132', pageSizePoints: [579.599121, 781.918945], currentRect: [295.596, 586.439, 562.211, 742.823], textInkBounds: [296.846, 594.981, 554.554, 737.981], scope: 'Title and both complete Assassin description paragraphs; current passage is complete, so no replacement is required.'},
        p33: {pdfPage: 34, printedPage: 33, pageSizePoints: [582.239136, 788.39978], formerRect: [17.467, 307.476, 285.297, 678.024], orderedSegments: [{order: 1, rect: [17.467, 303, 290, 747.2], role: 'left-column opening and complete worked-example introduction through “however, the”', darkInkBounds: [20.842, 308.208, 280.384, 742.25]}, {order: 2, rect: [302, 28, 571, 110], role: 'same-page upper-right continuation and complete Fighter/Magic-user example', darkInkBounds: [308.875, 34.208, 565.875, 105.667]}], relevance: 'The worked example is general human two-class procedure context; it does not establish Assassin eligibility.'},
        p37: {pdfPage: 38, printedPage: 37, pageSizePoints: [579.599304, 786.239929], tableRegionIds: ['phb-37-911fe149fbfab8dd', 'phb-37-94857b7670eeef3b'], noteSourceWordBox: [308.2, 120.85, 568.74, 165.23], noteInkBounds: [308.125, 121.542, 565.833, 164.042], noteCrop: [303, 116, 574, 170.5], omittedContext: 'Added Proficiency paragraph explains levels counted above first and gives example allotments at levels 1, 5, 9, and 13.'},
      },
      knownWholeNoteDependencies: [
        {id: 'assassin-phb-19-scroll-reading-footnote', source: 'PHB p.19 four-star footnote at 12th level for assassins', finding: 'The current table crop does not include the separate note; issue candidates include crops intersecting the measured note bounds and every same-page property pointer.'},
        {id: 'assassin-phb-37-proficiency-interval-note', source: 'PHB p.37 right-column Added Proficiency note', finding: 'The current table crop does not include the separate explanatory note; issue candidates include crops intersecting the measured note bounds and every same-page property pointer.'},
      ],
      dispositions: {candidate: 'Exact old/current Assassin image, exact relevant crop geometry, or measured p.33 example-segment overlap. Candidate relevance still requires source/field review.', excluded: 'Outside the specific image/page/crop issue being inventoried; this is not a general adequacy approval.', uncertain: 'Same source-page family or unresolved property-to-region mapping without a defensible exact match.'},
    },
    snapshots: {immutableBaseline: baseline.built, current: current.built},
    comparison: {
      catalogPointerOccurrencesDelta: current.built.denominator.catalogPointerOccurrences - baseline.built.denominator.catalogPointerOccurrences,
      uniqueCatalogPathsDelta: current.built.denominator.uniqueCatalogPaths - baseline.built.denominator.uniqueCatalogPaths,
      uniqueCatalogRegionBindingsDelta: current.built.denominator.uniqueCatalogRegionBindings - baseline.built.denominator.uniqueCatalogRegionBindings,
      propertyCitationPointersDelta: current.built.denominator.propertyCitationPointers - baseline.built.denominator.propertyCitationPointers,
      note: 'Current may be a dirty working tree. The baseline is the exact immutable Git tree; generated field binding projections are recomputed with the recorded current builder and are not represented as historical persisted state.'
    },
  };
}

function parseArgs(argv) {
  const options = {baselineCommit: ASSASSIN_SHARED_IMAGE_BASELINE, currentDist: 'dist', output: null, baselineDist: null};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--baseline-commit') options.baselineCommit = argv[++index];
    else if (arg === '--baseline-dist') options.baselineDist = argv[++index];
    else if (arg === '--current-dist') options.currentDist = argv[++index];
    else if (arg === '--output') options.output = argv[++index];
    else throw new Error(`Unknown argument ${arg}`);
  }
  return options;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isMain) {
  const options = parseArgs(process.argv.slice(2));
  const report = await buildAssassinSharedImageInventory(options);
  const json = JSON.stringify(report, null, 2) + '\n';
  if (options.output) {
    const output = resolve(options.output);
    const repo = resolve(import.meta.dirname, '..');
    const rel = relative(repo, output);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Output must remain inside the repository');
    const {writeFileSync} = await import('node:fs');
    writeFileSync(output, json);
  } else process.stdout.write(json);
}
