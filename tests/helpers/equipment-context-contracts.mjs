import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function getPointer(value, pointer) {
  return pointer.split('/').slice(1).map(key => key.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((current, key) => current?.[key], value);
}

/** Validate the narrow, local field-to-image context contract for these equipment records. */
export function inspectEquipmentContextContract({ catalog, catalogPath, item, distRoot }) {
  const errors = [];
  const regions = new Map((catalog.regions || []).map(region => [region.id, region]));
  const sets = new Map((catalog.evidenceContextSets || []).map(set => [set.id, set]));
  const fieldOwners = new Map();
  if (catalog.itemId !== item.id) errors.push(`catalog item ${catalog.itemId} does not match ${item.id}`);
  if (!catalog.evidenceContextSets?.length) errors.push('no evidence context sets');
  if (!catalog.fieldEvidenceContracts?.length) errors.push('no field evidence contracts');

  for (const set of catalog.evidenceContextSets || []) {
    if (!set.orderedRegionIds?.length) errors.push(`${set.id}: missing ordered region IDs`);
    if (!/original[- ]PDF.*reviewed/i.test(set.reviewLimitation || '') ||
        !/(?:value|mechanic).*(?:separate|pending)|footnote.*(?:separate|not assigned|not claimed)|no .*footnote.*assigned/i.test(set.reviewLimitation || '')) {
      errors.push(`${set.id}: context review scope or separate value/footnote grading is not explicit`);
    }
    const seen = new Set();
    let pageKey = null;
    for (const id of set.orderedRegionIds || []) {
      if (seen.has(id)) errors.push(`${set.id}: duplicate ordered region ${id}`);
      seen.add(id);
      const region = regions.get(id);
      if (!region) {
        errors.push(`${set.id}: missing ordered region ${id}`);
        continue;
      }
      const key = `${region.book}:${region.printedPage}`;
      if (pageKey && key !== pageKey) errors.push(`${set.id}: context spans more than one source page`);
      pageKey = key;
    }
  }

  for (const contract of catalog.fieldEvidenceContracts || []) {
    const target = regions.get(contract.primaryRegionId);
    const set = sets.get(contract.contextSetId);
    if (!target) errors.push(`${contract.contextSetId}: missing target ${contract.primaryRegionId}`);
    if (!set) errors.push(`${contract.primaryRegionId}: missing context set ${contract.contextSetId}`);
    if (!contract.semanticClaim) errors.push(`${contract.primaryRegionId}: missing semantic claim`);
    if (!/source-location-and-focus-reviewed.*field-value-grade-separate/i.test(contract.status || '')) {
      errors.push(`${contract.primaryRegionId}: source-location review must remain separate from field-value grading`);
    }
    for (const id of contract.supportingRegionIds || []) {
      if (!regions.has(id)) errors.push(`${contract.primaryRegionId}: missing supporting region ${id}`);
    }
    if (target && set) {
      const sameContextImage = (set.orderedRegionIds || []).some(id => {
        const region = regions.get(id);
        return region && region.image === target.image && region.sha256 === target.sha256;
      });
      if (!(set.orderedRegionIds || []).includes(target.id) && !sameContextImage) {
        errors.push(`${target.id}: target is not represented by its ordered context set`);
      }
      if (target.book !== regions.get(set.orderedRegionIds?.[0])?.book ||
          target.printedPage !== regions.get(set.orderedRegionIds?.[0])?.printedPage) {
        errors.push(`${target.id}: target does not match its context set book/page`);
      }
      if (!target.focusRects?.length) errors.push(`${target.id}: target has no focused passage`);
      for (const [x, y, width, height] of target.focusRects || []) {
        if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
          errors.push(`${target.id}: invalid image-local focus rectangle`);
        }
        if (x === 0 && y === 0 && width === 1 && height === 1) errors.push(`${target.id}: full-image sentinel is not a row focus`);
      }
    }
    const keys = [contract.fieldKey, ...(contract.fieldKeys || [])].filter(Boolean);
    if (!keys.length) errors.push(`${contract.primaryRegionId}: no field key`);
    for (const key of keys) {
      if (fieldOwners.has(key)) errors.push(`${key}: duplicate target contracts`);
      fieldOwners.set(key, contract.primaryRegionId);
      if (getPointer(item, key) === undefined) errors.push(`${key}: field does not exist on ${item.id}`);
    }
  }

  // Recheck the actual public pixels and each catalog's local image-relative coordinate space.
  const catalogDir = path.dirname(path.resolve(distRoot, catalogPath));
  for (const region of regions.values()) {
    const imagePath = path.join(catalogDir, region.image);
    let bytes;
    try { bytes = readFileSync(imagePath); }
    catch { errors.push(`${region.id}: missing public image ${region.image}`); continue; }
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') errors.push(`${region.id}: image is not PNG`);
    if (bytes.readUInt32BE(16) !== region.width || bytes.readUInt32BE(20) !== region.height) errors.push(`${region.id}: image dimensions mismatch`);
    if (hash(bytes) !== region.sha256) errors.push(`${region.id}: image SHA-256 mismatch`);
  }

  return { errors, fieldOwners };
}
