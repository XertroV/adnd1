import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from '../mm-replay-fs-v1.mjs';
import {resolve} from 'node:path';
import {execFileSync} from '../mm-replay-child-process-v1.mjs';
import {attachEvidenceBindings, buildPriceSourceInventory} from './price-source-inventory.mjs';
import {ambiguousItemOverrideIds, appendOverrideReferences, classProgressionOverride, cloneOverrideJson, collectionOverride, collectionReferenceOverrides, equipmentPriceStateOverride} from './citation-override-identity.mjs';

const root = resolve(import.meta.dirname, '../../..');
const collections = ['rules', 'spells', 'classes', 'equipment', 'matrices'];
const overrideMaps = ['items', 'scanVerification', 'priceStates', 'sourceExcerpts'];
const citationKeys = new Set([
  'references', 'reference', 'referenceSources', 'sourceReferences', 'sourceRefs', 'citations', 'citation',
  'source', 'sources', 'sourcePages', 'sourcePageReference', 'sourceExcerpts', 'scanVerification',
  'fieldSources', 'evidenceBindings', 'sourceOwner', 'sourceObjectPointer', 'verification', 'catalog',
]);
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const readHash = path => shaBytes(readFileSync(resolve(root, path)));
const shaBytes = bytes => createHash('sha256').update(bytes).digest('hex');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
const shaValue = value => shaBytes(Buffer.from(canonical(value)));
const pointerJoin = (pointer, key) => `${pointer}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
const hasCollection = key => collections.includes(key);
const hasActiveValue = value => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value) || typeof value === 'string') return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

function ownerRecords(data) {
  const output = [];
  for (const collection of collections) {
    for (const [index, item] of (data[collection] || []).entries()) {
      output.push({collection, itemId: item.id ?? null, index, item});
    }
  }
  if (data.progressionExplainer) {
    output.push({collection: 'progressionExplainer', itemId: data.progressionExplainer.id || 'progression-explainer', index: 0, item: data.progressionExplainer});
  }
  return output;
}

function getPointer(value, pointer) {
  if (!pointer || pointer === '/') return value;
  return pointer.split('/').slice(1).map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((current, part) => current?.[Array.isArray(current) ? Number(part) : part], value);
}

function isValidatedComparatorBinding(binding, owner, attachmentPath, recordsByOwner) {
  if (binding.sourceCategory !== 'printed-price-comparator') return false;
  if (binding.collection !== owner.collection || binding.itemId !== owner.itemId) return false;
  if (!/^\/suggestedPrice\/comparisons\/\d+\/evidenceBindings\/\d+$/.test(attachmentPath)) return false;
  const comparisonPointer = attachmentPath.replace(/\/evidenceBindings\/\d+$/, '');
  const comparison = getPointer(owner.item, comparisonPointer);
  const sourceOwner = binding.sourceOwner;
  if (!comparison || typeof comparison.itemId !== 'string' || !sourceOwner) return false;
  if (sourceOwner.collection !== binding.collection || sourceOwner.itemId !== comparison.itemId) return false;
  if (!recordsByOwner.has(`${sourceOwner.collection}:${sourceOwner.itemId}`)) return false;
  if (binding.reviewStatus !== 'field-target-reviewed' || binding.targetReview?.status !== 'confirmed' || binding.targetReview?.independent !== true) return false;
  if (!Array.isArray(binding.regionIds) || binding.regionIds.length === 0) return false;
  return true;
}

function scanRecordProperties(owner) {
  const propertyPaths = [];
  const citationPaths = [];
  const bindings = [];
  const active = new WeakSet();
  const walk = (value, pointer = '') => {
    if (value === null || typeof value !== 'object' || active.has(value)) return;
    active.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) walk(value[i], pointerJoin(pointer, i));
    } else {
      for (const [key, child] of Object.entries(value)) {
        const childPointer = pointerJoin(pointer, key);
        propertyPaths.push(childPointer);
        if (citationKeys.has(key)) citationPaths.push({pointer: childPointer, property: key, kind: Array.isArray(child) ? 'array' : child === null ? 'null' : typeof child});
        if (key === 'evidenceBindings' && Array.isArray(child)) {
          child.forEach((binding, index) => bindings.push({binding, attachmentPath: childPointer + '/' + index}));
          continue;
        }
        walk(child, childPointer);
      }
    }
    active.delete(value);
  };
  walk(owner.item);
  return {propertyPaths, citationPaths, bindings};
}

function findSharedObjectAliases(data) {
  const firstOwnerByObject = new WeakMap();
  const aliases = [];
  const aliasKeys = new Set();
  const walk = (value, owner, pointer, active) => {
    if (!value || typeof value !== 'object' || active.has(value)) return;
    active.add(value);
    const prior = firstOwnerByObject.get(value);
    if (prior) {
      if (prior.collection !== owner.collection || prior.itemId !== owner.itemId) {
        const a = `${prior.collection}:${prior.itemId}${prior.pointer}`;
        const b = `${owner.collection}:${owner.itemId}${pointer}`;
        const key = [a, b].sort().join('|');
        if (!aliasKeys.has(key)) {
          aliasKeys.add(key);
          aliases.push({firstOwnerPath: a, secondOwnerPath: b, sharedObjectSha256: shaValue(value)});
        }
      }
      active.delete(value);
      return;
    }
    firstOwnerByObject.set(value, {collection: owner.collection, itemId: owner.itemId, pointer});
    if (Array.isArray(value)) value.forEach((child, index) => walk(child, owner, pointerJoin(pointer, index), active));
    else for (const [key, child] of Object.entries(value)) {
      if (key === 'evidenceBindings') continue;
      walk(child, owner, pointerJoin(pointer, key), active);
    }
    active.delete(value);
  };
  for (const owner of ownerRecords(data)) walk(owner.item, owner, '', new WeakSet());
  return aliases;
}

function inspectData(data, overrides = {}, {includeAllBindings = true} = {}) {
  const owners = ownerRecords(data);
  const byId = new Map();
  const byOwner = new Map();
  for (const owner of owners) {
    const row = {collection: owner.collection, itemId: owner.itemId, index: owner.index, item: owner.item};
    if (!byId.has(owner.itemId)) byId.set(owner.itemId, []);
    byId.get(owner.itemId).push(row);
    byOwner.set(`${owner.collection}:${owner.itemId}`, row);
  }

  const propertyPathCounts = new Map();
  const collectionCounts = {};
  const recordInventory = [];
  const allBindings = [];
  for (const owner of owners) {
    collectionCounts[owner.collection] = (collectionCounts[owner.collection] || 0) + 1;
    const scanned = scanRecordProperties(owner);
    for (const pointer of scanned.propertyPaths) propertyPathCounts.set(pointer, (propertyPathCounts.get(pointer) || 0) + 1);
    const bindingRows = scanned.bindings.map(({binding, attachmentPath}) => {
      const bindingOwnerMatches = binding.collection === owner.collection && binding.itemId === owner.itemId;
      const sourceOwner = binding.sourceOwner || null;
      const sourceOwnerMatches = !sourceOwner || sourceOwner.collection === owner.collection && sourceOwner.itemId === owner.itemId;
      const comparatorException = isValidatedComparatorBinding(binding, owner, attachmentPath, byOwner);
      const disposition = comparatorException ? 'validated-explicit-comparator-source' : bindingOwnerMatches && sourceOwnerMatches ? 'owner-matched' : 'foreign-owner-binding';
      const row = {
        attachmentOwner: {collection: owner.collection, itemId: owner.itemId},
        attachmentPath,
        bindingCollection: binding.collection ?? null,
        bindingItemId: binding.itemId ?? null,
        sourceOwner: sourceOwner ? {collection: sourceOwner.collection ?? null, itemId: sourceOwner.itemId ?? null} : null,
        sourceCategory: binding.sourceCategory ?? null,
        fieldPointer: binding.fieldPointer ?? null,
        sourceObjectPointer: binding.sourceObjectPointer ?? null,
        sourceObject: binding.sourceObject ?? null,
        book: binding.book ?? null,
        printedPage: binding.printedPage ?? null,
        catalog: binding.catalog ?? null,
        regionIds: binding.regionIds ?? [],
        reviewStatus: binding.reviewStatus ?? null,
        comparatorException,
        disposition,
        bindingSha256: shaValue(binding),
      };
      allBindings.push(row);
      return row;
    });
    recordInventory.push({
      collection: owner.collection,
      itemId: owner.itemId,
      index: owner.index,
      displayName: owner.item.name ?? owner.item.title ?? owner.item.label ?? null,
      rootProperties: Object.keys(owner.item).sort(),
      citationPropertyPaths: scanned.citationPaths,
      attachedEvidenceBindings: bindingRows.map(binding => binding.attachmentPath),
      recordSha256: shaValue(owner.item),
    });
  }

  const duplicateIds = [...byId.entries()].filter(([, matches]) => matches.length > 1).map(([id, matches]) => ({
    itemId: id,
    ownerCount: matches.length,
    owners: matches.map(({collection, index, item}) => ({collection, index, name: item.name ?? item.title ?? item.label ?? null})),
  })).sort((a, b) => a.itemId.localeCompare(b.itemId));

  const overrideApplications = {};
  for (const mapName of overrideMaps) {
    const entries = Object.entries(overrides?.[mapName] || {}).map(([key, value]) => {
      const qualifiedSeparator = key.indexOf(':');
      const scoped = qualifiedSeparator > 0;
      const matches = scoped
        ? [{collection: key.slice(0, qualifiedSeparator), itemId: key.slice(qualifiedSeparator + 1)}].filter(match => byOwner.has(`${match.collection}:${match.itemId}`))
        : (byId.get(key) || []).map(({collection, itemId}) => ({collection, itemId}));
      return {
        key,
        scoped,
        matchedOwnerCount: matches.length,
        matchedOwners: matches,
        ambiguousBareKey: !scoped && matches.length > 1,
        valueSha256: shaValue(value),
        references: mapName === 'items' && Array.isArray(value?.references) ? value.references.map((reference, index) => ({index, book: reference.book ?? null, pages: reference.pages ?? null, printedPage: reference.printedPage ?? null, label: reference.label ?? null, status: reference.status ?? null, regionIds: reference.verification?.regions ?? [], referenceSha256: shaValue(reference)})) : undefined,
      };
    });
    const ambiguousActiveEntries = entries.filter(entry => {
      if (!entry.ambiguousBareKey || mapName === 'priceStates') return false;
      const value = overrides?.[mapName]?.[entry.key];
      if (!hasActiveValue(value)) return false;
      if (mapName === 'items' && Array.isArray(value?.references)) {
        const {references, ...other} = value;
        if (references.length === 0 && !hasActiveValue(other)) return false;
      }
      if (mapName === 'sourceExcerpts' && typeof value?.collection === 'string') {
        return !entry.matchedOwners.some(owner => owner.collection === value.collection);
      }
      return true;
    }).map(entry => ({key: entry.key, mapName, matchedOwners: entry.matchedOwners}));
    overrideApplications[mapName] = {
      entryCount: entries.length,
      ambiguousBareEntryCount: entries.filter(entry => entry.ambiguousBareKey).length,
      ambiguousActiveEntryCount: ambiguousActiveEntries.length,
      ambiguousActiveEntries,
      entries,
    };
  }
  const ambiguousActiveItemOverrideEntries = Object.values(overrideApplications).flatMap(application => application.ambiguousActiveEntries || []);

  const classified = {
    ownerMatched: allBindings.filter(binding => binding.disposition === 'owner-matched').length,
    validatedExplicitComparatorSource: allBindings.filter(binding => binding.disposition === 'validated-explicit-comparator-source').length,
    foreignOwner: allBindings.filter(binding => binding.disposition === 'foreign-owner-binding').length,
  };
  const allForeign = allBindings.filter(binding => binding.disposition === 'foreign-owner-binding');
  const referenceOwners = recordInventory.flatMap(record => record.citationPropertyPaths
    .filter(entry => entry.property === 'references')
    .map(entry => ({collection: record.collection, itemId: record.itemId, pointer: entry.pointer})));
  return {
    denominator: {recordCount: owners.length, recordsByCollection: collectionCounts, distinctItemIdCount: byId.size},
    duplicateIdUniverse: duplicateIds,
    propertyInventory: {distinctJsonPropertyPaths: propertyPathCounts.size, propertyPathCounts: Object.fromEntries([...propertyPathCounts.entries()].sort(([a], [b]) => a.localeCompare(b))), recordRootPropertyCount: recordInventory.reduce((n, record) => n + record.rootProperties.length, 0), recordsWithCitationProperties: recordInventory.filter(record => record.citationPropertyPaths.length).length, referenceOwnerPathCount: referenceOwners.length, referenceOwnerPaths: referenceOwners},
    overrideApplications,
    ambiguousActiveItemOverrideCount: ambiguousActiveItemOverrideEntries.length,
    ambiguousActiveItemOverrides: ambiguousActiveItemOverrideEntries,
    evidenceBindings: {denominator: allBindings.length, dispositions: classified, attachedBindingPaths: includeAllBindings ? allBindings : undefined, foreignOwnerBindings: allForeign},
    records: recordInventory,
  };
}

function constructCurrentAssemblyInputs({legacyOwnerIdentitySemantics = false} = {}) {
  const partNames = ['rules.json', 'classes.json', 'phb-spell-index.json', 'ua-spell-index.json', 'phb-spells.json', 'phb-magic-user-extra.json', 'ua-spells.json', 'equipment.json', 'attack-matrices.json'];
  const parts = partNames.map(readJson);
  const data = {rules: [], spells: [], equipment: [], matrices: [], classes: [], sources: [], release: {date: '2026-11-07', coverage: 'Partial extraction with checked source excerpt locations. Extracted values retain their individual review grades; selected equipment values have narrower checked-field evidence. Full source PDFs are not deployed.', sourceFilesDeployed: false}};
  for (const key of ['rules', 'classes', 'sources', 'equipment', 'matrices']) data[key] = parts.flatMap(part => part[key] || []);
  const spellMap = new Map();
  for (const part of parts) for (const spell of part.spells || []) {
    const key = [spell.book, spell.class, spell.name.toLowerCase().replace(/[^a-z0-9]/g, '')].join(':');
    const prior = spellMap.get(key);
    const detailed = Object.keys(spell.fields || {}).length > 0 || (spell.effect || []).length > 0;
    if (!prior || detailed) {
      const merged = {...prior, ...spell};
      const aliases = [...new Set([...(prior?.aliases || []), ...(spell.aliases || [])])];
      if (aliases.length) merged.aliases = aliases;
      const shared = spell.classes || prior?.classes;
      if (shared?.length) {
        merged.classes = shared;
        if (shared.length > 1) merged.pages = [...new Set([...(spell.pages || []), ...(prior?.pages || [])])];
      }
      spellMap.set(key, merged);
    }
  }
  data.spells = [...spellMap.values()];
  const overrides = readJson('citation-overrides.json');
  if (legacyOwnerIdentitySemantics) {
    const migration = readJson('research/source-owner-identity-migration.json');
    for (const entry of migration.overrides.removedLegacyBareEntries || []) {
      overrides.items[entry.legacyBareKey] = cloneOverrideJson(entry.exactPriorValue);
    }
  }
  const progression = readJson('progression-overrides.json');
  const ambiguousIds = ambiguousItemOverrideIds(data, progression.explainer);
  for (const [collection, items] of Object.entries({rules: data.rules, spells: data.spells, classes: data.classes, equipment: data.equipment, matrices: data.matrices})) {
    for (const item of items) {
      if (legacyOwnerIdentitySemantics && ambiguousIds.has(item.id) && overrides.items?.[item.id]) {
        // Reproduce the old bare-ID consumer: the exact same ref object was appended to every matching owner.
        item.references = [...(item.references || []), ...(overrides.items[item.id].references || [])];
      } else {
        const referenceOverrides = collectionReferenceOverrides(overrides.items, collection, item.id, ambiguousIds);
        appendOverrideReferences(item, referenceOverrides);
      }
      const sourceExcerpts = collectionOverride(overrides.sourceExcerpts, collection, item.id, ambiguousIds, {allowDeclaredCollection: true, mapName: 'sourceExcerpts'});
      if (sourceExcerpts) {
        if (sourceExcerpts.collection && sourceExcerpts.collection !== collection) throw new Error(`Wrong scan collection for ${collection}:${item.id}`);
        item.sourceExcerpts = cloneOverrideJson(sourceExcerpts);
      }
      const scanVerification = collectionOverride(overrides.scanVerification, collection, item.id, ambiguousIds);
      if (scanVerification) item.scanVerification = cloneOverrideJson(scanVerification);
      const priceState = legacyOwnerIdentitySemantics ? overrides.priceStates?.[item.id] : equipmentPriceStateOverride(overrides.priceStates, collection, item.id);
      if (priceState) item.priceState = priceState;
      const classOverride = classProgressionOverride(progression.classes, collection, item.id);
      if (classOverride) Object.assign(item, cloneOverrideJson(classOverride));
    }
  }
  if (progression.explainer) {
    data.progressionExplainer = progression.explainer;
    const scanVerification = collectionOverride(overrides.scanVerification, 'progressionExplainer', 'progression-explainer', ambiguousIds);
    if (scanVerification) data.progressionExplainer.scanVerification = cloneOverrideJson(scanVerification);
    const sourceExcerpts = collectionOverride(overrides.sourceExcerpts, 'progressionExplainer', 'progression-explainer', ambiguousIds, {allowDeclaredCollection: true, mapName: 'sourceExcerpts'});
    if (sourceExcerpts) {
      if (sourceExcerpts.collection && sourceExcerpts.collection !== 'progressionExplainer') throw new Error('Wrong scan collection for progression explainer');
      data.progressionExplainer.sourceExcerpts = cloneOverrideJson(sourceExcerpts);
    }
  }
  return {data, overrides};
}

function catalogEvidenceSnapshot(item, catalogPath) {
  const path = `dist/${catalogPath}`;
  if (!existsSync(resolve(root, path))) return {catalogPath, missing: true};
  const catalog = readJson(path);
  const images = (catalog.regions || []).map(region => {
    const imagePath = `dist/scans/verified/${region.image}`;
    return {regionId: region.id, image: region.image, catalogSha256: region.sha256, imageFileSha256: existsSync(resolve(root, imagePath)) ? readHash(imagePath) : null};
  });
  return {catalogPath, catalogSha256: readHash(path), sourceSha256ByBook: catalog.sources, ownerBinding: item ? {collection: item.collection, itemId: item.itemId} : null, regionIds: (catalog.regions || []).map(region => region.id), regions: images};
}

export function buildSourceOwnerIdentityAudit({data = readJson('dist/data.json'), overrides = readJson('citation-overrides.json'), replayAssembly = false} = {}) {
  const report = inspectData(data, overrides);
  const hashes = {};
  for (const path of [
    'dist/data.json', 'citation-overrides.json', 'rules.json', 'classes.json', 'phb-spell-index.json',
    'ua-spell-index.json', 'phb-spells.json', 'phb-magic-user-extra.json', 'ua-spells.json',
    'equipment.json', 'attack-matrices.json', 'progression-overrides.json',
    'research/price-source-inventory.json', 'research/field-evidence-bindings.json',
    'research/equipment-source-row-bindings.json', 'research/source-audit-batch5-ua26-central-integration.json',
    'research/source-owner-identity-migration.json', 'tools/assemble.mjs', 'tools/price-source-inventory.mjs',
    'tools/citation-override-identity.mjs',
    'tools/source-owner-identity-audit.mjs',
  ]) {
    if (existsSync(resolve(root, path))) hashes[path] = readHash(path);
  }
  const knownIds = ['ua-field-plate', 'ua-full-plate', 'ua-buckler'];
  const knownCases = knownIds.map(itemId => {
    const owners = report.records.filter(record => record.itemId === itemId);
    const override = overrides.items?.[itemId] ?? null;
    const catalogs = owners.map(owner => {
      const item = data[owner.collection].find(candidate => candidate.id === itemId);
      const path = item?.sourceExcerpts?.catalog || item?.scanVerification?.catalog || null;
      return {collection: owner.collection, itemId, excerptCatalog: path, excerptCatalogEvidence: path ? catalogEvidenceSnapshot(owner, path) : null};
    });
    const refs = report.evidenceBindings.foreignOwnerBindings.filter(binding => binding.attachmentOwner.itemId === itemId || binding.bindingItemId === itemId);
    return {
      itemId,
      ownerPaths: owners.map(owner => ({collection: owner.collection, index: owner.index, rootProperties: owner.rootProperties, referencePaths: owner.citationPropertyPaths.filter(property => property.property === 'references'), attachedEvidenceBindingPaths: owner.attachedEvidenceBindings, recordSha256: owner.recordSha256})),
      unscopedItemOverride: override ? {valueSha256: shaValue(override), references: override.references ?? null} : null,
      priceState: overrides.priceStates?.[itemId] ?? null,
      catalogs,
      foreignBindingPaths: refs,
    };
  });
  const progression = readJson('progression-overrides.json');
  const progressionClassOverrideApplications = Object.entries(progression.classes || {}).map(([itemId]) => {
    const sameIdOwners = ownerRecords(data).filter(owner => owner.itemId === itemId);
    return {
      itemId,
      intendedClassOwners: sameIdOwners.filter(owner => owner.collection === 'classes').map(owner => ({collection: owner.collection, index: owner.index})),
      preScopeSameIdOwners: sameIdOwners.map(owner => ({collection: owner.collection, index: owner.index})),
      nonClassOwnerCountPreviouslyEligible: sameIdOwners.filter(owner => owner.collection !== 'classes').length,
    };
  });
  const output = {
    schemaVersion: 1,
    artifactType: 'source-owner-identity-audit',
    capture: {capturedAt: new Date().toISOString(), inputCommit: (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(); } catch { return null; } })(), inputHashes: hashes},
    report,
    currentOwnerIdentity: {
      crossOwnerSharedObjectAliases: findSharedObjectAliases(data),
      progressionClassOverrideApplications: {
        overrideCount: progressionClassOverrideApplications.length,
        intendedClassOwnerCount: progressionClassOverrideApplications.reduce((count, item) => count + item.intendedClassOwners.length, 0),
        nonClassOwnerCountPreviouslyEligible: progressionClassOverrideApplications.reduce((count, item) => count + item.nonClassOwnerCountPreviouslyEligible, 0),
        items: progressionClassOverrideApplications,
      },
    },
    knownCollisionCases: knownCases,
  };
  if (replayAssembly) {
    const {data: replayData, overrides: replayOverrides} = constructCurrentAssemblyInputs();
    const aliasObjectsBeforeAttach = findSharedObjectAliases(replayData);
    const replayInventory = buildPriceSourceInventory({equipment: replayData.equipment, data: replayData});
    attachEvidenceBindings(replayData, replayInventory);
    const replay = inspectData(replayData, replayOverrides);
    output.inMemoryCurrentAssemblyReplay = {
      purpose: 'Demonstrate the current source assembly and attachment path without writing output files.',
      counts: {recordCount: replay.denominator.recordCount, evidenceBindings: replay.evidenceBindings.denominator, dispositions: replay.evidenceBindings.dispositions},
      preAttachCrossOwnerObjectAliases: aliasObjectsBeforeAttach,
      preAttachCrossOwnerObjectAliasCount: aliasObjectsBeforeAttach.length,
      foreignOwnerBindings: replay.evidenceBindings.foreignOwnerBindings,
      matchesPersistedDistForeignBindingCount: replay.evidenceBindings.foreignOwnerBindings.length === report.evidenceBindings.foreignOwnerBindings.length,
    };
  }
  return output;
}

export function buildLegacyOwnerIdentityReplay() {
  const baselinePath = 'research/source-owner-identity-baseline.json';
  const baseline = readJson(baselinePath);
  const {data, overrides} = constructCurrentAssemblyInputs({legacyOwnerIdentitySemantics: true});
  const aliasesBeforeAttach = findSharedObjectAliases(data);
  const inventory = buildPriceSourceInventory({equipment: data.equipment, data});
  attachEvidenceBindings(data, inventory);
  const report = inspectData(data, overrides);
  const rawInputPaths = [
    'rules.json', 'classes.json', 'phb-spell-index.json', 'ua-spell-index.json', 'phb-spells.json',
    'phb-magic-user-extra.json', 'ua-spells.json', 'equipment.json', 'attack-matrices.json', 'progression-overrides.json',
  ];
  const currentInputHashes = Object.fromEntries(rawInputPaths.map(path => [path, readHash(path)]));
  const replayImplementationPaths = [
    'tools/source-owner-identity-audit.mjs', 'tools/citation-override-identity.mjs', 'tools/price-source-inventory.mjs',
    'research/price-source-inventory.json', 'research/source-owner-identity-migration.json',
  ];
  const replayImplementationHashes = Object.fromEntries(replayImplementationPaths.map(path => [path, readHash(path)]));
  const baselineInputHashes = baseline.capture.inputHashes;
  const replayRows = ['ua-buckler', 'ua-field-plate', 'ua-full-plate'].map(itemId => ({
    itemId,
    owners: ownerRecords(data).filter(owner => owner.itemId === itemId).map(owner => ({
      collection: owner.collection,
      index: owner.index,
      priceState: owner.item.priceState ?? null,
      recordSha256: shaValue(owner.item),
      referenceObjects: (owner.item.references || []).map((reference, index) => ({index, referenceSha256: shaValue(reference), evidenceBindingCount: reference.evidenceBindings?.length || 0})),
    })),
  }));
  const expectedBaseline = {
    source: baselinePath,
    sha256: readHash(baselinePath),
    recordedOldAttachedEvidenceBindings: baseline.report.evidenceBindings.denominator,
    recordedOldForeignBindingCount: baseline.report.evidenceBindings.foreignOwnerBindings.length,
    recordedOldAliasCount: baseline.inMemoryCurrentAssemblyReplay.preAttachCrossOwnerObjectAliasCount,
    recordedOldForeignBindings: baseline.report.evidenceBindings.foreignOwnerBindings,
  };
  return {
    schemaVersion: 1,
    artifactType: 'source-owner-identity-legacy-semantics-replay',
    capture: {reconstructedAt: new Date().toISOString(), baselinePath, baselineSha256: readHash(baselinePath), baselineInputCommit: baseline.capture.inputCommit},
    method: 'Reconstruct the former all-collections item-ID lookup against the current raw input files. Restore the two exact ambiguous bare references from the migration receipt, append those same reference objects to all matching owners, and apply the existing bare priceStates value across every collection. This replay is evidence of the old consumer semantics and is not a restoration of the complete historical dist/data.json.',
    inputHashes: {currentRawInputHashes: currentInputHashes, baselineRawInputHashes: Object.fromEntries(rawInputPaths.map(path => [path, baselineInputHashes[path]])), replayImplementationHashes, rawInputsMatchBaseline: rawInputPaths.every(path => currentInputHashes[path] === baselineInputHashes[path])},
    expectedBaseline,
    observed: {
      recordCount: report.denominator.recordCount,
      evidenceBindingCount: report.evidenceBindings.denominator,
      bindingDispositions: report.evidenceBindings.dispositions,
      crossOwnerSharedObjectAliasesBeforeAttach: aliasesBeforeAttach,
      crossOwnerSharedObjectAliasCountBeforeAttach: aliasesBeforeAttach.length,
      foreignOwnerBindings: report.evidenceBindings.foreignOwnerBindings,
      ambiguousActiveItemOverrideCount: report.ambiguousActiveItemOverrideCount,
      collisionOwnerRows: replayRows,
    },
    equivalence: {
      oldForeignOwnerBindingCountMatchesFrozenRecord: report.evidenceBindings.foreignOwnerBindings.length === expectedBaseline.recordedOldForeignBindingCount,
      oldAliasCountMatchesFrozenRecord: aliasesBeforeAttach.length === expectedBaseline.recordedOldAliasCount,
      priceStateLeakRows: replayRows.flatMap(row => row.owners.filter(owner => owner.collection === 'rules' && owner.priceState === 'source_listed').map(owner => ({itemId: row.itemId, collection: owner.collection, recordSha256: owner.recordSha256}))),
      note: 'A legacy replay uses the current price-source inventory and current raw inputs. It is compared against the frozen old defect paths/counts, not represented as byte-identical historical assembled output.',
    },
  };
}

export function sourceOwnerIdentityCheck(output) {
  const report = output?.report;
  const denominator = report?.denominator;
  const evidenceBindings = report?.evidenceBindings;
  const dispositions = evidenceBindings?.dispositions;
  const aliases = output?.currentOwnerIdentity?.crossOwnerSharedObjectAliases;
  const ambiguousCount = report?.ambiguousActiveItemOverrideCount;
  const errors = [];
  if (!Number.isInteger(denominator?.recordCount) || denominator.recordCount <= 0 || !Array.isArray(report?.records) || report.records.length !== denominator.recordCount) errors.push('invalid-or-missing-record-denominator');
  if (Array.isArray(report?.records)) {
    const collections=new Set(['rules','spells','classes','equipment','matrices','progressionExplainer']);
    const identities=new Set();
    const valid=report.records.every(record=>{
      if(!record||!collections.has(record.collection)||typeof record.itemId!=='string'||!record.itemId||!Number.isInteger(record.index)||record.index<0||!/^[a-f0-9]{64}$/.test(record.recordSha256||''))return false;
      if(!Array.isArray(record.rootProperties)||record.rootProperties.some(property=>typeof property!=='string')||new Set(record.rootProperties).size!==record.rootProperties.length)return false;
      if(!Array.isArray(record.citationPropertyPaths)||record.citationPropertyPaths.some(property=>typeof property?.pointer!=='string'||!property.pointer.startsWith('/')||typeof property.property!=='string'||typeof property.kind!=='string'))return false;
      if(!Array.isArray(record.attachedEvidenceBindings)||record.attachedEvidenceBindings.some(path=>typeof path!=='string'||!path.startsWith('/')))return false;
      const identity=`${record.collection}:${record.itemId}`;
      if(identities.has(identity))return false;
      identities.add(identity);return true;
    });
    if(!valid)errors.push('invalid-owner-record-schema-or-duplicate');
    else if(report.records.reduce((sum,record)=>sum+record.attachedEvidenceBindings.length,0)!==evidenceBindings?.denominator)errors.push('record-binding-path-denominator-mismatch');
  }
  if (!Number.isInteger(evidenceBindings?.denominator) || evidenceBindings.denominator < 0 || !dispositions || !['ownerMatched', 'validatedExplicitComparatorSource', 'foreignOwner'].every(key => Number.isInteger(dispositions[key]) && dispositions[key] >= 0) || dispositions && Object.values(dispositions).reduce((sum, count) => sum + (Number.isInteger(count) ? count : 0), 0) !== evidenceBindings?.denominator) errors.push('invalid-or-missing-binding-denominator');
  if (!Array.isArray(aliases)) errors.push('missing-cross-owner-alias-inventory');
  if (!Number.isInteger(ambiguousCount) || ambiguousCount < 0) errors.push('missing-ambiguous-active-override-count');
  const foreignOwnerBindingCount = Number.isInteger(dispositions?.foreignOwner) ? dispositions.foreignOwner : null;
  const crossOwnerSharedObjectAliasCount = Array.isArray(aliases) ? aliases.length : null;
  const ambiguousActiveItemOverrideCount = Number.isInteger(ambiguousCount) ? ambiguousCount : null;
  return {
    pass: errors.length === 0 && foreignOwnerBindingCount === 0 && crossOwnerSharedObjectAliasCount === 0 && ambiguousActiveItemOverrideCount === 0,
    schemaValid: errors.length === 0,
    errors,
    foreignOwnerBindingCount,
    crossOwnerSharedObjectAliasCount,
    ambiguousActiveItemOverrideCount,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const output = buildSourceOwnerIdentityAudit({replayAssembly: process.argv.includes('--replay')});
  const pretty = `${JSON.stringify(output, null, 2)}\n`;
  const checkRequested = process.argv.includes('--check');
  const writeIndex = process.argv.indexOf('--write');
  const legacyWriteIndex = process.argv.indexOf('--write-legacy-replay');
  if (writeIndex >= 0 && process.argv[writeIndex + 1]) {
    const {writeFileSync} = await import('node:fs');
    writeFileSync(resolve(root, process.argv[writeIndex + 1]), pretty);
  }
  if (legacyWriteIndex >= 0 && process.argv[legacyWriteIndex + 1]) {
    const {writeFileSync} = await import('node:fs');
    writeFileSync(resolve(root, process.argv[legacyWriteIndex + 1]), `${JSON.stringify(buildLegacyOwnerIdentityReplay(), null, 2)}\n`);
  }
  if (checkRequested) {
    const result = sourceOwnerIdentityCheck(output);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.pass) process.exitCode = 1;
  } else if (writeIndex < 0 && legacyWriteIndex < 0) process.stdout.write(pretty);
}
