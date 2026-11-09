import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';

export const SOURCE_FRAME_BRIDGE_PATH = 'research/source-frame-coordinate-bridge.json';
export const SOURCE_FRAME_BRIDGE_SHA256 = '2899f53a9cfa1741d9fd9aed3c47ada0eb3a80fc842352c8c64deb3869986318';
const OUTSIDE_REASON = 'No exact owner/region binding is present in this bounded correction registry; this does not make a claim about separate frame evidence.';
const OUTSIDE_RESOLUTION_STATUS = 'legacy-diagnostic-projection-retained; no new frame approval by this registry';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const canonicalSha = value => sha(Buffer.from(canonical(value), 'utf8'));
const joinKey = (collection, itemId, binding, catalog, regionId) => JSON.stringify([collection, itemId, binding, catalog, regionId]);
const ownerLinkKey = (collection, itemId, binding) => JSON.stringify([collection, itemId, binding]);
const closeArray = (actual, expected) => Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length && actual.every((value, index) => Math.abs(Number(value) - Number(expected[index])) <= 0.0002);

function imageDimensions(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString('ascii', 12, 16) !== 'IHDR') return null;
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

export function loadActiveSourceFrameBridge(repoRoot) {
  const bytes = readFileSync(resolve(repoRoot, SOURCE_FRAME_BRIDGE_PATH));
  if (sha(bytes) !== SOURCE_FRAME_BRIDGE_SHA256) throw Error('Active source-frame bridge bytes differ from the trusted repository pin.');
  const registry = JSON.parse(bytes);
  if (registry.schemaVersion !== 1 || registry.artifactType !== 'hash-bound-current-source-frame-coordinate-bridge' ||
      registry.status !== 'scoped-geometric-provenance-only' ||
      !isExpectedCountObject(registry.counts) || registry.frames?.length !== 9) {
    throw Error('Active source-frame bridge has an invalid bounded registry shape.');
  }
  return registry;
}

function isExpectedCountObject(counts) {
  return counts?.frameGroups === 9 && counts?.physicalPdfPages === 7 && counts?.regionBindings === 102 && counts?.ownerBindings === 102;
}

export function expectedFrameResolution(registry, usage) {
  if (usage.sourceKind === 'supplemental-image') return {status: 'not-applicable-supplemental-image-frame', basis: 'unassessable'};
  const row = registry.frames.flatMap(frame => frame.regions.map(region => ({frame, region}))).find(({frame, region}) =>
    joinKey(region.owner.collection, region.owner.itemId, region.owner.binding, region.catalog, region.regionId) ===
    joinKey(usage.collection, usage.itemId, usage.binding, usage.catalog, usage.regionId));
  return row
    ? {status: 'matched', basis: row.frame.coordinateSpace, frameId: row.frame.frameId}
    : {status: 'outside-bounded-correction-registry', basis: 'legacy-diagnostic-projection-retained', reason: OUTSIDE_REASON,
      correctionRegistryMembership: 'outside-this-bounded-correction-registry', resolutionStatus: OUTSIDE_RESOLUTION_STATUS};
}

export function projectRegisteredRect(frame, row) {
  const rect = row.normalizedPageRect;
  const values = Array.isArray(rect) ? rect : rect && typeof rect === 'object'
    ? [rect.x, rect.y, rect.width ?? rect.w, rect.height ?? rect.h] : null;
  if (!values || values.length !== 4) return null;
  const [x, y, width, height] = values.map(Number);
  const boxes = frame.pdfBoxesPoints;
  const [px0, py0, px1, py1] = boxes.pageRect;
  const [cx0, cy0, cx1, cy1] = boxes.cropBox;
  const [mx0, my0, mx1, my1] = boxes.mediaBox;
  let out;
  if (frame.coordinateSpace === 'cropbox-pageRect-normalized' || frame.coordinateSpace === 'coincident-cropbox-mediabox-pageRect-normalized') {
    out = [x * (px1 - px0), y * (py1 - py0), (x + width) * (px1 - px0), (y + height) * (py1 - py0)];
  } else if (frame.coordinateSpace === 'mediabox-normalized') {
    const mediaWidth = mx1 - mx0, mediaHeight = my1 - my0;
    const mediaTopOffset = my1 - cy1;
    out = [mx0 + x * mediaWidth - cx0, y * mediaHeight - mediaTopOffset,
      mx0 + (x + width) * mediaWidth - cx0, (y + height) * mediaHeight - mediaTopOffset];
  } else return null;
  return out.map(value => Math.round(value * 10000) / 10000);
}

export function validateLiveSourceFrameBridge({repoRoot, data, loadCatalog, loadImage}) {
  const registry = loadActiveSourceFrameBridge(repoRoot);
  const owners = new Map();
  for (const collection of ['rules', 'spells', 'equipment', 'matrices', 'classes']) {
    for (const item of data[collection] || []) owners.set(ownerLinkKey(collection, item.id, 'sourceExcerpts'), item), owners.set(ownerLinkKey(collection, item.id, 'scanVerification'), item);
  }
  if (data.progressionExplainer) {
    const item = {...data.progressionExplainer, id: 'progression-explainer'};
    owners.set(ownerLinkKey('progressionExplainer', item.id, 'sourceExcerpts'), item);
    owners.set(ownerLinkKey('progressionExplainer', item.id, 'scanVerification'), item);
  }
  const catalogs = new Map(), mismatches = [];
  try {
    if (sha(readFileSync(resolve(repoRoot, 'dist/books.js'))) !== registry.provenance?.booksJsSha256) {
      mismatches.push({frameId: null, fields: ['booksJsSha256']});
    }
  } catch {
    mismatches.push({frameId: null, fields: ['booksJsSha256']});
  }
  const getCatalog = path => {
    if (!catalogs.has(path)) catalogs.set(path, loadCatalog(path));
    return catalogs.get(path);
  };
  for (const frame of registry.frames) {
    for (const row of frame.regions) {
      const fields = [], owner = row.owner;
      const item = owners.get(ownerLinkKey(owner.collection, owner.itemId, owner.binding));
      const link = item?.[owner.binding];
      if (!item || !link || link.catalog !== row.catalog) fields.push('ownerBinding');
      else if (canonicalSha(link) !== row.ownerSourceLinkSha256) fields.push('ownerSourceLinkSha256');
      let loaded;
      try { loaded = getCatalog(row.catalog); } catch { loaded = null; }
      const catalog = loaded?.catalog || loaded;
      if (!catalog) fields.push('catalogUnavailable');
      else {
        if (loaded?.sha256 && loaded.sha256 !== row.catalogSha256) fields.push('catalogSha256');
        const found = (catalog.regions || []).filter(region => region?.id === row.regionId);
        if (found.length !== 1) fields.push('regionMissingOrAmbiguous');
        else {
          const region = found[0];
          const content = Object.fromEntries(Object.entries(region).filter(([key]) => key !== 'focusRects'));
          const sourceSha = catalog.sources?.[row.book]?.sha256;
          const dimensions = (() => { try { return imageDimensions(loadImage(row.catalog, row.image)); } catch { return null; } })();
          const actualImageSha = (() => { try { return sha(loadImage(row.catalog, row.image)); } catch { return null; } })();
          const checks = [
            ['sourceIdentity', canonical([region.book, region.printedPage, region.pdfPage]), canonical([row.book, row.printedPage, row.pdfPage])],
            ['imageIdentity', canonical([region.image, region.sha256, region.width, region.height]), canonical([row.image, row.imageSha256, row.imageDimensionsPx[0], row.imageDimensionsPx[1]])],
            ['normalizedPageRect', canonical(region.normalizedPageRect), canonical(row.normalizedPageRect)],
            ['sourcePdfInCatalog', sourceSha, row.sourcePdfSha256],
            ['focusSha256', canonicalSha(region.focusRects || []), row.focusSha256],
            ['contentSha256', canonicalSha(content), row.contentSha256],
            ['imageBytes', canonical([actualImageSha, dimensions]), canonical([row.imageSha256, row.imageDimensionsPx])],
          ];
          for (const [name, actual, expected] of checks) if (actual !== expected) fields.push(name);
        }
      }
      if (row.sourceFrameId !== frame.frameId || row.coordinateSpace !== frame.coordinateSpace || row.sourcePdfSha256 !== frame.sourcePdfSha256) fields.push('frameIdentity');
      if (fields.length) mismatches.push({frameId: frame.frameId, ownerBindingKey: row.ownerBindingKey, fields: [...new Set(fields)].sort()});
    }
  }
  const validation = {status: mismatches.length ? 'current-pins-conflict' : 'current-pins-match', frameGroups: registry.frames.length,
    ownerJoinsValidated: registry.counts.ownerBindings, mismatchCount: mismatches.length, mismatches};
  return {registry, validation, expectedResolution: usage => expectedFrameResolution(registry, usage)};
}

export function validateCurrentSourceGeometry({geometry, liveUsages, bridge}) {
  const errors = [];
  const registered = new Map();
  for (const frame of bridge.registry.frames) for (const row of frame.regions) {
    registered.set(joinKey(row.owner.collection, row.owner.itemId, row.owner.binding, row.catalog, row.regionId), {frame, row});
  }
  const declaration = geometry?.sourceFrameCoordinateBridge;
  if (!declaration || declaration.path !== SOURCE_FRAME_BRIDGE_PATH || declaration.sha256 !== SOURCE_FRAME_BRIDGE_SHA256 ||
      declaration.status !== 'scoped-geometric-provenance-only' || canonical(declaration.registryValidation) !== canonical(bridge.validation)) {
    errors.push('Source geometry is missing the exact active source-frame bridge declaration or current registry validation.');
  }
  const geometryRows = Array.isArray(geometry?.usages) ? geometry.usages : [];
  const byKey = new Map(geometryRows.map(row => [joinKey(row.collection, row.itemId, row.binding, row.catalog, row.regionId), row]));
  if (byKey.size !== liveUsages.length || liveUsages.some(row => !byKey.has(joinKey(row.collection, row.itemId, row.binding, row.catalog, row.regionId)))) {
    errors.push('Source geometry usage set differs from the complete current catalog universe.');
  }
  const statusCounts = {};
  for (const live of liveUsages) {
    const key = joinKey(live.collection, live.itemId, live.binding, live.catalog, live.regionId);
    const observed = byKey.get(key);
    if (!observed) continue;
    const expected = bridge.expectedResolution(live);
    statusCounts[expected.status] = (statusCounts[expected.status] || 0) + 1;
    if (canonical(observed.coordinateFrameResolution) !== canonical(expected)) errors.push(`Source geometry frame annotation mismatch: ${live.catalog}#${live.regionId}.`);
    const join = registered.get(key);
    if (join) {
      const bounds = projectRegisteredRect(join.frame, join.row);
      if (!bounds || !closeArray(observed.pdfBounds, bounds)) errors.push(`Registered source geometry uses the wrong active frame projection: ${live.catalog}#${live.regionId}.`);
    }
  }
  if (declaration && canonical(declaration.resolutionCounts) !== canonical(Object.fromEntries(Object.entries(statusCounts).sort(([a], [b]) => a.localeCompare(b))))) {
    errors.push('Source geometry frame resolution counts are missing or stale.');
  }
  if (geometry?.sourceFrameCoordinateBridge && bridge.validation.status !== 'current-pins-match') errors.push('Active source-frame bridge does not match current catalog pins.');
  return {valid: errors.length === 0, errors};
}
