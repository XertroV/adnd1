import {readFileSync, mkdirSync, writeFileSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve, dirname, isAbsolute, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const root = resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = row => JSON.stringify(['collection', 'itemId', 'binding', 'catalog', 'regionId', 'book', 'pdfPage', 'imageSha256'].map(key => row?.[key]));
const multiset = rows => {
  const result = new Map();
  for (const row of rows) {
    const key = identity(row);
    result.set(key, (result.get(key) || 0) + 1);
  }
  return result;
};
const sameMultiset = (a, b) => a.size === b.size && [...a].every(([key, count]) => b.get(key) === count);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isArrayOfRecords = value => Array.isArray(value) && value.every(isRecord);
const isInt = value => Number.isInteger(value);
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const pointKey = (book, pdfPage) => JSON.stringify([book, pdfPage]);
const sortedCounts = counts => Object.fromEntries([...counts].sort(([a], [b]) => String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));
const increment = (counts, key, amount = 1) => counts.set(key, (counts.get(key) || 0) + amount);

function rectangle(rect, {allowEmpty = false} = {}) {
  return Array.isArray(rect) && rect.length === 4 && rect.every(isInt) &&
    rect[0] >= 0 && rect[1] >= 0 &&
    (allowEmpty ? rect[2] >= rect[0] && rect[3] >= rect[1] : rect[2] > rect[0] && rect[3] > rect[1]);
}

function expectedEdgeBands(bounds, dimensions, band) {
  const [x0, y0, x1, y1] = bounds, [width, height] = dimensions;
  return {
    left: {
      boundaryPixel: x0,
      combinedBandBoundsPx: [Math.max(0, x0 - band), y0, Math.min(width, x0 + band), y1],
      outsideBandBoundsPx: [Math.max(0, x0 - band), y0, x0, y1],
      insideBandBoundsPx: [x0, y0, Math.min(width, x0 + band), y1],
      outsideAxis: 'x-low', insideAxis: 'x-high',
    },
    right: {
      boundaryPixel: x1,
      combinedBandBoundsPx: [Math.max(0, x1 - band), y0, Math.min(width, x1 + band), y1],
      outsideBandBoundsPx: [x1, y0, Math.min(width, x1 + band), y1],
      insideBandBoundsPx: [Math.max(0, x1 - band), y0, x1, y1],
      outsideAxis: 'x-high', insideAxis: 'x-low',
    },
    top: {
      boundaryPixel: y0,
      combinedBandBoundsPx: [x0, Math.max(0, y0 - band), x1, Math.min(height, y0 + band)],
      outsideBandBoundsPx: [x0, Math.max(0, y0 - band), x1, y0],
      insideBandBoundsPx: [x0, y0, x1, Math.min(height, y0 + band)],
      outsideAxis: 'y-low', insideAxis: 'y-high',
    },
    bottom: {
      boundaryPixel: y1,
      combinedBandBoundsPx: [x0, Math.max(0, y1 - band), x1, Math.min(height, y1 + band)],
      outsideBandBoundsPx: [x0, y1, x1, Math.min(height, y1 + band)],
      insideBandBoundsPx: [x0, Math.max(0, y1 - band), x1, y1],
      outsideAxis: 'y-high', insideAxis: 'y-low',
    },
  };
}

function validateEdge(edgeName, edge, expected, errors) {
  if (!isRecord(edge)) {
    errors.push(`Raster geometry edge ${edgeName} is malformed.`);
    return null;
  }
  for (const key of ['boundaryPixel', 'combinedBandBoundsPx', 'outsideBandBoundsPx', 'insideBandBoundsPx']) {
    if (!isDeepStrictEqual(edge[key], expected[key])) errors.push(`Raster geometry edge ${edgeName} has inconsistent ${key}.`);
  }
  const components = Array.isArray(edge.componentsLt254) ? edge.componentsLt254 : [];
  if (!Array.isArray(edge.componentsLt254)) errors.push(`Raster geometry edge ${edgeName} has no component array.`);
  const sums = {outside: 0, inside: 0};
  const derived = {crossing: 0, strongCrossing: 0, faintCrossing: 0, outsideOnly: 0, strongOutsideOnly: 0, insideOnly: 0};
  for (const component of components) {
    if (!isRecord(component)) {
      errors.push(`Raster geometry edge ${edgeName} has a malformed component.`);
      continue;
    }
    const box = component.boundsPx;
    if (!rectangle(box) || !rectangle(expected.combinedBandBoundsPx, {allowEmpty: true}) ||
        box[0] < expected.combinedBandBoundsPx[0] || box[1] < expected.combinedBandBoundsPx[1] ||
        box[2] > expected.combinedBandBoundsPx[2] || box[3] > expected.combinedBandBoundsPx[3]) {
      errors.push(`Raster geometry edge ${edgeName} component bounds are outside its band.`);
    }
    const total = component.pixelCountLt254, outside = component.outsidePixelCountLt254, inside = component.insidePixelCountLt254;
    if (![total, outside, inside].every(value => isInt(value) && value >= 0) || total < 1 || outside + inside !== total ||
        (rectangle(box) && total > (box[2] - box[0]) * (box[3] - box[1]))) {
      errors.push(`Raster geometry edge ${edgeName} component pixel counts are inconsistent.`);
    }
    if (!isInt(component.minGray) || component.minGray < 0 || component.minGray >= 254) errors.push(`Raster geometry edge ${edgeName} component minimum gray is invalid.`);
    const contact = outside > 0 && inside > 0 ? 'crossing' : outside > 0 ? 'outside-only' : inside > 0 ? 'inside-only' : 'invalid';
    if (component.contact !== contact) errors.push(`Raster geometry edge ${edgeName} component contact disagrees with pixel counts.`);
    if (rectangle(box)) {
      const boundary = expected.boundaryPixel;
      const outsideExtent = expected.outsideAxis === 'x-low' ? box[0] < boundary :
        expected.outsideAxis === 'x-high' ? box[2] > boundary :
        expected.outsideAxis === 'y-low' ? box[1] < boundary : box[3] > boundary;
      const insideExtent = expected.insideAxis === 'x-high' ? box[2] > boundary :
        expected.insideAxis === 'x-low' ? box[0] < boundary :
        expected.insideAxis === 'y-high' ? box[3] > boundary : box[1] < boundary;
      if ((outside > 0 && !outsideExtent) || (inside > 0 && !insideExtent)) errors.push(`Raster geometry edge ${edgeName} component bounds contradict its contact.`);
    }
    sums.outside += Number.isFinite(outside) ? outside : 0;
    sums.inside += Number.isFinite(inside) ? inside : 0;
    if (contact === 'crossing') {
      derived.crossing++;
      if (component.minGray < 230) derived.strongCrossing++;
      else derived.faintCrossing++;
    } else if (contact === 'outside-only') {
      derived.outsideOnly++;
      if (component.minGray < 230) derived.strongOutsideOnly++;
    } else if (contact === 'inside-only') derived.insideOnly++;
  }
  const expectedFields = {
    componentCountLt254: components.length,
    crossingComponentCountLt254: derived.crossing,
    crossingComponentCountWithMinGrayLt230: derived.strongCrossing,
    faintCrossingComponentCountMinGray230To253: derived.faintCrossing,
    outsideOnlyComponentCountLt254: derived.outsideOnly,
    outsideOnlyComponentCountWithMinGrayLt230: derived.strongOutsideOnly,
    insideOnlyComponentCountLt254: derived.insideOnly,
  };
  for (const [field, value] of Object.entries(expectedFields)) if (edge[field] !== value) errors.push(`Raster geometry edge ${edgeName} has inconsistent ${field}.`);
  for (const side of ['outside', 'inside']) {
    const counts = edge[`${side}InkPixels`];
    if (!isRecord(counts) || !['lt180', 'lt230', 'lt254'].every(key => isInt(counts[key]) && counts[key] >= 0) ||
        !(counts.lt180 <= counts.lt230 && counts.lt230 <= counts.lt254)) {
      errors.push(`Raster geometry edge ${edgeName} has invalid ${side} ink counts.`);
      continue;
    }
    const expectedLt254 = side === 'outside' ? sums.outside : sums.inside;
    if (counts.lt254 !== expectedLt254) errors.push(`Raster geometry edge ${edgeName} ${side} lt254 total disagrees with component records.`);
    const rect = side === 'outside' ? expected.outsideBandBoundsPx : expected.insideBandBoundsPx;
    const area = Math.max(0, rect[2] - rect[0]) * Math.max(0, rect[3] - rect[1]);
    if (counts.lt254 > area) errors.push(`Raster geometry edge ${edgeName} ${side} ink count exceeds its band area.`);
  }
  return derived;
}

export function collectLiveRasterUniverse({repoRoot = root} = {}) {
  const bytes = readFileSync(resolve(repoRoot, 'dist/data.json'));
  const data = JSON.parse(bytes), catalogs = new Map(), imageHashes = new Map(), usages = [];
  for (const collection of ['rules', 'spells', 'equipment', 'matrices', 'classes', 'progressionExplainer']) {
    const items = collection === 'progressionExplainer' ? data[collection] ? [{...data[collection], id: 'progression-explainer'}] : [] : data[collection] || [];
    for (const item of items) for (const binding of ['sourceExcerpts', 'scanVerification']) {
      const path = item[binding]?.catalog;
      if (!path) continue;
      if (!catalogs.has(path)) {
        const raw = readFileSync(resolve(repoRoot, 'dist', path));
        catalogs.set(path, {sha256: sha(raw), data: JSON.parse(raw)});
      }
      const catalog = catalogs.get(path).data;
      for (const region of catalog.regions || []) {
        const imagePath = resolve(repoRoot, 'dist', dirname(path), region.image);
        if (!imageHashes.has(imagePath)) imageHashes.set(imagePath, sha(readFileSync(imagePath)));
        if (imageHashes.get(imagePath) !== region.sha256) throw Error(`Published raster image hash mismatch: ${path} ${region.id}`);
        usages.push({collection, itemId: item.id, binding, catalog: path, regionId: region.id, book: region.book, pdfPage: region.pdfPage, imageSha256: region.sha256, sourcePdfSha256: catalog.sources?.[region.book]?.sha256});
      }
    }
  }
  const catalogHashes = Object.fromEntries([...catalogs].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, value]) => [path, value.sha256]));
  return {dataSha256: sha(bytes), catalogSnapshotSha256: sha(JSON.stringify(catalogHashes)), catalogCount: catalogs.size, usages};
}

export function buildSourceRasterCoverage(snapshot, live) {
  const errors = [];
  const usages = Array.isArray(snapshot?.usages) ? snapshot.usages : [];
  const notAssessable = Array.isArray(snapshot?.notAssessableUsages) ? snapshot.notAssessableUsages : [];
  const geometryRows = Array.isArray(snapshot?.geometries) ? snapshot.geometries : [];
  const frameRows = Array.isArray(snapshot?.sourceFrames) ? snapshot.sourceFrames : [];
  const liveUsages = Array.isArray(live?.usages) ? live.usages : [];
  const inputs = isRecord(snapshot?.inputs) ? snapshot.inputs : {};
  const render = isRecord(snapshot?.render) ? snapshot.render : {};
  const allUses = [...usages, ...notAssessable];
  if (snapshot?.artifactType !== 'Complete numeric source-raster crop-boundary candidate inventory' ||
      !Array.isArray(snapshot?.usages) || !Array.isArray(snapshot?.notAssessableUsages) ||
      !Array.isArray(snapshot?.geometries) || !Array.isArray(snapshot?.sourceFrames) ||
      !isRecord(snapshot?.counts) || !isRecord(snapshot?.inputs)) errors.push('Invalid source-raster snapshot structure.');
  if (inputs.distDataSha256 !== live?.dataSha256) errors.push('Current data hash differs from raster snapshot.');
  if (inputs.catalogSnapshotSha256 !== live?.catalogSnapshotSha256 || inputs.catalogCount !== live?.catalogCount) errors.push('Current catalog hashes differ from raster snapshot.');
  if (!sameMultiset(multiset(allUses), multiset(liveUsages))) errors.push('Raster usage multiset differs from the complete live catalog universe.');
  if (notAssessable.length !== 0) errors.push('This frozen raster snapshot requires zero not-assessable usages; a current assessability policy is required to change that partition.');

  const livePdfHashes = new Map();
  for (const usage of liveUsages) {
    if (!isRecord(usage) || typeof usage.book !== 'string' || !isHash(usage.sourcePdfSha256)) {
      errors.push('A live catalog usage has no valid source PDF identity/hash.');
      continue;
    }
    if (livePdfHashes.has(usage.book) && livePdfHashes.get(usage.book) !== usage.sourcePdfSha256) errors.push(`Live catalog source PDF hashes disagree for ${usage.book}.`);
    livePdfHashes.set(usage.book, usage.sourcePdfSha256);
  }
  const inputPdfHashes = isRecord(inputs.sourcePdfSha256) ? inputs.sourcePdfSha256 : {};
  if (!isDeepStrictEqual(sortedCounts(new Map(Object.entries(inputPdfHashes))), sortedCounts(livePdfHashes))) errors.push('Raster source PDF hash map differs from the complete live catalog universe.');

  const expectedFrameKeys = new Set();
  for (const usage of liveUsages) if (typeof usage?.book === 'string' && isInt(usage.pdfPage) && usage.pdfPage > 0) expectedFrameKeys.add(pointKey(usage.book, usage.pdfPage));
  const frames = new Map();
  for (const frame of frameRows) {
    if (!isRecord(frame) || typeof frame.book !== 'string' || !isInt(frame.pdfPage) || frame.pdfPage < 1) {
      errors.push('A source-raster frame has invalid page identity.');
      continue;
    }
    const key = pointKey(frame.book, frame.pdfPage);
    if (frames.has(key)) errors.push('Duplicate source-raster frame.');
    frames.set(key, frame);
    const expectedPdfHash = livePdfHashes.get(frame.book);
    if (!isHash(frame.sourcePdfSha256) || frame.sourcePdfSha256 !== inputPdfHashes[frame.book] || frame.sourcePdfSha256 !== expectedPdfHash) errors.push('Raster frame source PDF hash differs from the current catalog.');
    if (!isHash(frame.rawGrayRasterSha256)) errors.push('Raster frame raw-gray hash is invalid.');
    if (!Array.isArray(frame.rasterDimensionsPx) || frame.rasterDimensionsPx.length !== 2 || !frame.rasterDimensionsPx.every(value => isInt(value) && value > 0)) errors.push('Raster frame dimensions are invalid.');
    if (!Array.isArray(frame.rasterOriginPx) || frame.rasterOriginPx.length !== 2 || !frame.rasterOriginPx.every(isInt)) errors.push('Raster frame origin is invalid.');
    if (!Array.isArray(frame.pageRectPoints) || frame.pageRectPoints.length !== 4 || !frame.pageRectPoints.every(isFiniteNumber) || frame.pageRectPoints[2] <= frame.pageRectPoints[0] || frame.pageRectPoints[3] <= frame.pageRectPoints[1]) errors.push('Raster frame page bounds are invalid.');
    if (frame.renderDpi !== render.dpi || !isFiniteNumber(frame.renderDpi) || frame.renderDpi <= 0) errors.push('Raster frame render DPI is inconsistent.');
  }
  if (!isDeepStrictEqual([...frames.keys()].sort(), [...expectedFrameKeys].sort())) errors.push('Raster frame set differs from pages used by the complete live catalog universe.');

  const geometries = new Map(), geometryBindings = new Set(), referencedGeometryIds = new Set(), usageRowsByGeometry = new Map();
  const geometryDerived = new Map();
  for (const geometry of geometryRows) {
    if (!isRecord(geometry) || typeof geometry.geometryId !== 'string' || !geometry.geometryId) {
      errors.push('Missing or malformed raster geometry identity.');
      continue;
    }
    if (geometries.has(geometry.geometryId)) errors.push('Duplicate raster geometry identity.');
    geometries.set(geometry.geometryId, geometry);
    const frame = frames.get(pointKey(geometry.book, geometry.pdfPage));
    if (!frame || frame.sourcePdfSha256 !== geometry.sourcePdfSha256 || frame.rawGrayRasterSha256 !== geometry.sourceFrameRawGraySha256) errors.push('Raster geometry frame is absent or inconsistent.');
    const expectedPdfHash = livePdfHashes.get(geometry.book);
    if (!isHash(geometry.sourcePdfSha256) || geometry.sourcePdfSha256 !== inputPdfHashes[geometry.book] || geometry.sourcePdfSha256 !== expectedPdfHash) errors.push('Raster geometry source PDF hash differs from the current catalog.');
    if (!isHash(geometry.sourceFrameRawGraySha256)) errors.push('Raster geometry source-frame hash is invalid.');
    if (!isHash(geometry.imageSha256)) errors.push('Raster geometry published image hash is invalid.');

    const binding = JSON.stringify([geometry.book, geometry.pdfPage, geometry.boundsPdfPagePointsLTRB, geometry.imageSha256]);
    if (geometryBindings.has(binding)) errors.push('Duplicate raster geometry binding.');
    geometryBindings.add(binding);

    if (!frame || !Array.isArray(frame.rasterDimensionsPx) || !Array.isArray(frame.rasterOriginPx)) {
      errors.push('Raster geometry has no usable linked frame dimensions/origin.');
    } else {
      const [width, height] = frame.rasterDimensionsPx;
      const [originX, originY] = frame.rasterOriginPx;
      const rectPoints = frame.pageRectPoints;
      const pdfBounds = geometry.boundsPdfPagePointsLTRB;
      if (geometry.renderDpi !== frame.renderDpi || geometry.renderDpi !== render.dpi) errors.push('Raster geometry render DPI differs from its frame.');
      if (!isDeepStrictEqual(geometry.sourceFrameDimensionsPx, frame.rasterDimensionsPx)) errors.push('Raster geometry dimensions differ from its frame.');
      if (!Array.isArray(pdfBounds) || pdfBounds.length !== 4 || !pdfBounds.every(isFiniteNumber) || pdfBounds[0] < 0 || pdfBounds[1] < 0 || pdfBounds[2] <= pdfBounds[0] || pdfBounds[3] <= pdfBounds[1] ||
          !Array.isArray(rectPoints) || pdfBounds[2] > rectPoints[2] - rectPoints[0] + 0.002 || pdfBounds[3] > rectPoints[3] - rectPoints[1] + 0.002) {
        errors.push('Raster geometry PDF-page bounds are invalid or outside the frame.');
      } else if (isFiniteNumber(geometry.renderDpi)) {
        const halfUp = value => Math.floor(value + 0.5);
        const expectedPx = [
          halfUp(pdfBounds[0] * geometry.renderDpi / 72 - originX),
          halfUp(pdfBounds[1] * geometry.renderDpi / 72 - originY),
          halfUp(pdfBounds[2] * geometry.renderDpi / 72 - originX),
          halfUp(pdfBounds[3] * geometry.renderDpi / 72 - originY),
        ];
        if (!rectangle(geometry.boundsRasterPixelsLTRB) || geometry.boundsRasterPixelsLTRB[2] > width || geometry.boundsRasterPixelsLTRB[3] > height ||
            !isDeepStrictEqual(geometry.boundsRasterPixelsLTRB, expectedPx)) errors.push('Raster geometry pixel bounds do not match its PDF bounds and frame.');
      }
      if (!isInt(geometry.edgeBandWidthPx) || geometry.edgeBandWidthPx < 1 || geometry.edgeBandWidthPx !== render.edgeBandWidthPx) errors.push('Raster geometry edge band width is inconsistent.');
      if (rectangle(geometry.boundsRasterPixelsLTRB) && isInt(geometry.edgeBandWidthPx) && geometry.edgeBandWidthPx > 0) {
        const bandSpecs = expectedEdgeBands(geometry.boundsRasterPixelsLTRB, frame.rasterDimensionsPx, geometry.edgeBandWidthPx);
        const scan = geometry.scan;
        if (!isRecord(scan) || !isRecord(scan.edges) || !isDeepStrictEqual(Object.keys(scan.edges).sort(), ['bottom', 'left', 'right', 'top'])) {
          errors.push('Raster geometry must contain exactly four edge scans.');
        } else {
          const combined = {crossing: 0, strongCrossing: 0, faintCrossing: 0, outsideOnly: 0, strongOutsideOnly: 0, components: 0};
          for (const edgeName of ['left', 'right', 'top', 'bottom']) {
            const result = validateEdge(edgeName, scan.edges[edgeName], bandSpecs[edgeName], errors);
            if (!result) continue;
            combined.crossing += result.crossing;
            combined.strongCrossing += result.strongCrossing;
            combined.faintCrossing += result.faintCrossing;
            combined.outsideOnly += result.outsideOnly;
            combined.strongOutsideOnly += result.strongOutsideOnly;
            combined.components += Array.isArray(scan.edges[edgeName].componentsLt254) ? scan.edges[edgeName].componentsLt254.length : 0;
          }
          const edgeStatus = combined.components ? 'near-edge-ink-components-present' : 'no-near-edge-component-at-configured-threshold';
          const derived = {
            edgeStatus,
            crossingComponentCandidate: combined.crossing > 0,
            strongCrossingComponentCandidate: combined.strongCrossing > 0,
            strongOutsideOnlyComponentCandidate: combined.strongOutsideOnly > 0,
            faintOnlyCrossingComponentCandidate: combined.strongCrossing === 0 && combined.faintCrossing > 0,
            componentCount: combined.components,
          };
          for (const [field, value] of Object.entries({
            edgeStatus: derived.edgeStatus,
            crossingComponentCandidate: derived.crossingComponentCandidate,
            strongCrossingComponentCandidate: derived.strongCrossingComponentCandidate,
            strongOutsideOnlyComponentCandidate: derived.strongOutsideOnlyComponentCandidate,
          })) if (scan[field] !== value) errors.push(`Raster geometry scan has inconsistent ${field}.`);
          if (scan.semanticReviewStatus !== 'unresolved-requires-source-review') errors.push('Raster candidate incorrectly claims a semantic disposition.');
          geometryDerived.set(geometry.geometryId, derived);
        }
      }
    }
    if (!geometryDerived.has(geometry.geometryId)) geometryDerived.set(geometry.geometryId, {
      edgeStatus: geometry.scan?.edgeStatus,
      crossingComponentCandidate: false,
      strongCrossingComponentCandidate: false,
      strongOutsideOnlyComponentCandidate: false,
      faintOnlyCrossingComponentCandidate: false,
      componentCount: 0,
    });
    if (!isArrayOfRecords(geometry.uses)) errors.push('Raster geometry usage links are malformed.');
  }

  const ordinalSet = new Set();
  for (const usage of allUses) {
    if (!isRecord(usage)) {
      errors.push('Raster usage record is malformed.');
      continue;
    }
    if (!isInt(usage.usageOrdinal) || usage.usageOrdinal < 0 || ordinalSet.has(usage.usageOrdinal)) errors.push('Raster usage ordinals are invalid or duplicated.');
    ordinalSet.add(usage.usageOrdinal);
  }
  for (const usage of usages) {
    if (!isRecord(usage)) continue;
    const geometry = geometries.get(usage.geometryId);
    const derived = geometryDerived.get(usage.geometryId);
    if (!geometry || geometry.book !== usage.book || geometry.pdfPage !== usage.pdfPage || geometry.imageSha256 !== usage.imageSha256) errors.push('Raster usage has an inconsistent geometry link.');
    if (usage.semanticReviewStatus !== 'unresolved-requires-source-review') errors.push('Raster usage incorrectly claims semantic clearance.');
    if (typeof usage.priorWordboxCandidate !== 'boolean') errors.push('Raster usage prior wordbox flag is invalid.');
    if (!derived || usage.rasterPixelCandidateStatus !== derived.edgeStatus ||
        usage.strongCrossingComponentCandidate !== derived.strongCrossingComponentCandidate ||
        usage.strongOutsideOnlyComponentCandidate !== derived.strongOutsideOnlyComponentCandidate) errors.push('Raster usage candidate flags disagree with its linked geometry scan.');
    if (geometry) {
      referencedGeometryIds.add(geometry.geometryId);
      const links = usageRowsByGeometry.get(geometry.geometryId) || [];
      links.push({usageOrdinal: usage.usageOrdinal, collection: usage.collection, itemId: usage.itemId, binding: usage.binding, catalog: usage.catalog, regionId: usage.regionId});
      usageRowsByGeometry.set(geometry.geometryId, links);
    }
  }
  if (!isDeepStrictEqual([...referencedGeometryIds].sort(), [...geometries.keys()].sort())) errors.push('Raster geometry set contains orphan or unreferenced geometry records.');
  for (const [geometryId, geometry] of geometries) {
    const actual = Array.isArray(geometry.uses) ? geometry.uses.map(row => isRecord(row) ? ({usageOrdinal: row.usageOrdinal, collection: row.collection, itemId: row.itemId, binding: row.binding, catalog: row.catalog, regionId: row.regionId}) : row) : [];
    const expected = usageRowsByGeometry.get(geometryId) || [];
    const byIdentity = rows => rows.map(row => JSON.stringify(row)).sort();
    if (!isDeepStrictEqual(byIdentity(actual), byIdentity(expected))) errors.push('Raster geometry use list differs from its linked assessed usages.');
  }

  const geometryStatusCounts = new Map(), geometriesByBook = new Map(), regionUsagesByBook = new Map(), sourcePagesRenderedByBook = new Map();
  let geometriesWithBoundaryCrossingComponentCandidate = 0;
  let geometriesWithStrongCrossingComponentCandidateMinGrayLt230 = 0;
  let geometriesWithStrongOutsideOnlyComponentCandidateMinGrayLt230 = 0;
  let geometriesWithFaintOnlyCrossingComponentCandidateMinGray230To253 = 0;
  let componentsLt254AcrossFourEdges = 0;
  for (const geometry of geometryRows) {
    if (!isRecord(geometry)) continue;
    const derived = geometryDerived.get(geometry.geometryId);
    increment(geometryStatusCounts, derived?.edgeStatus || 'invalid');
    if (typeof geometry.book === 'string') increment(geometriesByBook, geometry.book);
    if (derived?.crossingComponentCandidate) geometriesWithBoundaryCrossingComponentCandidate++;
    if (derived?.strongCrossingComponentCandidate) geometriesWithStrongCrossingComponentCandidateMinGrayLt230++;
    if (derived?.strongOutsideOnlyComponentCandidate) geometriesWithStrongOutsideOnlyComponentCandidateMinGrayLt230++;
    if (derived?.faintOnlyCrossingComponentCandidate) geometriesWithFaintOnlyCrossingComponentCandidateMinGray230To253++;
    componentsLt254AcrossFourEdges += derived?.componentCount || 0;
  }
  for (const usage of allUses) if (isRecord(usage) && typeof usage.book === 'string') increment(regionUsagesByBook, usage.book);
  for (const frame of frameRows) if (isRecord(frame) && typeof frame.book === 'string') increment(sourcePagesRenderedByBook, frame.book);
  const uniqueImageCount = new Set(allUses.filter(isRecord).map(usage => usage.imageSha256)).size;
  const uniqueSourcePageCount = new Set(allUses.filter(isRecord).filter(usage => typeof usage.book === 'string' && isInt(usage.pdfPage) && usage.pdfPage > 0).map(usage => pointKey(usage.book, usage.pdfPage))).size;
  const expectedCounts = {
    regionUsages: allUses.length,
    uniqueImages: uniqueImageCount,
    uniqueImageGeometryBindings: geometryRows.length,
    uniqueSourcePages: uniqueSourcePageCount,
    sourcePagesRendered: frameRows.length,
    sourcePagesRenderedByBook: sortedCounts(sourcePagesRenderedByBook),
    geometriesByBook: sortedCounts(geometriesByBook),
    regionUsagesByBook: sortedCounts(regionUsagesByBook),
    notAssessableUsages: notAssessable.length,
    assessedUsages: usages.length,
    geometryStatusCounts: sortedCounts(geometryStatusCounts),
    geometriesWithBoundaryCrossingComponentCandidate,
    geometriesWithStrongCrossingComponentCandidateMinGrayLt230,
    geometriesWithStrongOutsideOnlyComponentCandidateMinGrayLt230,
    geometriesWithFaintOnlyCrossingComponentCandidateMinGray230To253,
    componentsLt254AcrossFourEdges,
    priorWordboxCandidateUsages: usages.filter(usage => isRecord(usage) && usage.priorWordboxCandidate === true).length,
    candidateMetricNote: 'Strong crossing, strong outside-only, and faint-only crossing counts overlap by geometry and are not defect rates or mutually exclusive categories. Component counts are per crop edge; corner components can be counted on two adjacent edges.',
  };
  if (!isDeepStrictEqual(snapshot?.counts, expectedCounts)) errors.push('Raster snapshot aggregate metrics differ from recomputed records.');
  const valid = errors.length === 0;
  return {
    schemaVersion: 1,
    artifactType: 'current-source-raster-coverage',
    validation: {valid, errors: [...new Set(errors)]},
    scope: 'Current graph/hash and numeric snapshot checks only. CI does not rerender private source PDFs or establish crop semantics.',
    liveUniverse: {regionUsages: live.usages.length, catalogs: live.catalogCount, dataSha256: live.dataSha256, catalogSnapshotSha256: live.catalogSnapshotSha256},
    snapshotCounts: snapshot.counts,
    currentCandidateCounts: valid ? expectedCounts : null,
    calibration: snapshot.calibration,
    sourceFrames: frameRows,
    geometries: geometryRows,
    usages,
    notAssessableUsages: notAssessable,
    semanticPass: false,
    limitations: [
      'Near-edge ink includes background noise, rules, artwork and unrelated neighbors; candidate counts are not defect rates.',
      'Strong, faint and outside-only metrics have different and sometimes overlapping denominators; components at corners may be counted on two edges.',
      'Native source-window scanning is separate from exact replay of published crop PNG pixels.',
      'An empty band or a valid snapshot never clears source context, fact highlights or unknown continuations.',
    ],
  };
}

export function loadRasterSnapshotInput({repoRoot = root, explicitPath = null} = {}) {
  if (explicitPath) return {path: explicitPath, bytes: readFileSync(resolve(repoRoot, explicitPath)), geometry: null, selection: 'explicit-snapshot'};
  const pointerPath = 'research/current-source-raster-snapshot.json';
  let pointerBytes;
  try { pointerBytes = readFileSync(resolve(repoRoot, pointerPath)); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const path = 'research/source-audit-batch5-raster-boundary-before-source-repairs.json.gz';
    return {path, bytes: readFileSync(resolve(repoRoot, path)), geometry: null, selection: 'historical-fallback-no-active-pointer'};
  }
  const pointer = JSON.parse(pointerBytes);
  if (pointer?.schemaVersion !== 1) throw Error('Unsupported current raster snapshot pointer.');
  const loadPinned = (entry, label) => {
    if (!isRecord(entry) || typeof entry.path !== 'string' || isAbsolute(entry.path) || entry.path.includes('\\') || entry.path.split('/').some(part => !part || part === '.' || part === '..') || !isHash(entry.sha256)) throw Error(`Invalid ${label} repository path/hash.`);
    const location = relative(realpathSync(repoRoot), realpathSync(resolve(repoRoot, entry.path)));
    if (location === '..' || location.startsWith(`..${sep}`) || isAbsolute(location)) throw Error(`${label} path escapes the repository.`);
    const bytes = readFileSync(resolve(repoRoot, entry.path));
    if (sha(bytes) !== entry.sha256) throw Error(`${label} bytes differ from the active pointer.`);
    return {...entry, bytes};
  };
  const snapshot = loadPinned(pointer.snapshot, 'Current raster snapshot');
  const geometry = loadPinned(pointer.sourceGeometry, 'Current source geometry snapshot');
  const parsed = JSON.parse(gunzipSync(snapshot.bytes));
  if (parsed.inputs?.sourceUsageMapSha256 !== geometry.sha256) throw Error('Current raster snapshot does not bind the pinned source geometry snapshot.');
  return {...snapshot, geometry, selection: 'active-pointer', pointer: {path: pointerPath, sha256: sha(pointerBytes)}};
}

export function runSourceRasterCoverage(argv = process.argv.slice(2)) {
  let output = 'artifacts/source-raster-coverage/report.json';
  let explicitPath = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--output' && argv[i + 1]) output = argv[++i];
    else if (argv[i] === '--snapshot' && argv[i + 1]) explicitPath = argv[++i];
    else if (argv[i] !== '--check') throw Error(`Unknown argument: ${argv[i]}`);
  }
  const selected = loadRasterSnapshotInput({explicitPath});
  const bytes = selected.bytes;
  const report = buildSourceRasterCoverage(JSON.parse(gunzipSync(bytes)), collectLiveRasterUniverse());
  report.snapshot = {path: selected.path, sha256: sha(bytes), selection: selected.selection, ...(selected.pointer ? {pointer: selected.pointer, sourceGeometry: {path: selected.geometry.path, sha256: selected.geometry.sha256}} : {})};
  const target = resolve(root, output);
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, JSON.stringify(report) + '\n');
  if (argv.includes('--check') && !report.validation.valid) process.exitCode = 1;
  return {output, validation: report.validation, liveUniverse: report.liveUniverse, semanticPass: false};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(runSourceRasterCoverage())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
