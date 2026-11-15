export const CITATION_OVERRIDE_COLLECTIONS = ['rules', 'spells', 'classes', 'equipment', 'matrices'];

export function ambiguousItemOverrideIds(data = {}, pendingExplainer = data.progressionExplainer) {
  const ownersById = new Map();
  for (const collection of CITATION_OVERRIDE_COLLECTIONS) {
    for (const item of data[collection] || []) {
      if (typeof item?.id !== 'string') continue;
      if (!ownersById.has(item.id)) ownersById.set(item.id, new Set());
      ownersById.get(item.id).add(collection);
    }
  }
  if (pendingExplainer) {
    const id = pendingExplainer.id || 'progression-explainer';
    if (!ownersById.has(id)) ownersById.set(id, new Set());
    ownersById.get(id).add('progressionExplainer');
  }
  return new Set([...ownersById.entries()].filter(([, owners]) => owners.size > 1).map(([id]) => id));
}

/** Resolve a collection-qualified override, then a legacy bare key only when it is unambiguous. */
function nonempty(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value) || typeof value === 'string') return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function nonemptyReferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return nonempty(value);
  const {references, ...other} = value;
  return Array.isArray(references) ? references.length > 0 || nonempty(other) : nonempty(value);
}

export function collectionOverride(map, collection, itemId, ambiguousIds = new Set(), {allowDeclaredCollection = false, mapName = 'override'} = {}) {
  const scopedKey = `${collection}:${itemId}`;
  const hasScoped = Object.hasOwn(map || {}, scopedKey);
  const legacy = map?.[itemId];
  if (ambiguousIds.has(itemId) && nonempty(legacy)) {
    if (allowDeclaredCollection && legacy?.collection) {
      if (legacy.collection === collection) return hasScoped ? map[scopedKey] : legacy;
      return hasScoped ? map[scopedKey] : undefined;
    }
    throw new Error(`Ambiguous unscoped ${mapName} override for cross-collection id ${itemId}; add a collection-qualified key or an explicit collection declaration`);
  }
  if (hasScoped) return map[scopedKey];
  return map?.[itemId];
}

/** Return additive reference overrides for a unique legacy key; ambiguous bare keys never cross owners. */
export function collectionReferenceOverrides(map, collection, itemId, ambiguousIds = new Set()) {
  const scopedKey = `${collection}:${itemId}`;
  const scoped = Object.hasOwn(map || {}, scopedKey) ? map[scopedKey] : undefined;
  const legacy = map?.[itemId];
  if (ambiguousIds.has(itemId) && nonemptyReferences(legacy)) {
    throw new Error(`Ambiguous unscoped item reference override for cross-collection id ${itemId}; migrate exact references to collection-qualified keys`);
  }
  if (ambiguousIds.has(itemId)) return scoped ? [scoped] : [];
  if (legacy && scoped) return [legacy, scoped];
  if (scoped) return [scoped];
  return legacy ? [legacy] : [];
}

/** The priceStates map is equipment-price metadata; keep its legacy bare-key compatibility within equipment only. */
export function equipmentPriceStateOverride(map, collection, itemId) {
  if (collection !== 'equipment') return undefined;
  const scopedKey = `equipment:${itemId}`;
  if (Object.hasOwn(map || {}, scopedKey)) return map[scopedKey];
  return map?.[itemId];
}

/** progression-overrides.json/classes is a class collection map, not a bare-ID global override. */
export function classProgressionOverride(map, collection, itemId) {
  return collection === 'classes' ? map?.[itemId] : undefined;
}

export function cloneOverrideJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function appendOverrideReferences(item, overrides) {
  const sources=Array.isArray(overrides)?overrides:[overrides].filter(Boolean);
  const references=sources.flatMap(override=>Array.isArray(override?.references)?override.references:[]);
  if (references.length === 0) return item;
  const refs = [...(item.references || []), ...references.map(cloneOverrideJson)];
  item.references = refs.filter((ref, index) => refs.findIndex(other => JSON.stringify(other) === JSON.stringify(ref)) === index);
  return item;
}
