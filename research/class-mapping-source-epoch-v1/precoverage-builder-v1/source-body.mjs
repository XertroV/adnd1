// Proposal only: deterministic production pre-coverage construction.
// This module has no filesystem, process, Git, dynamic import, or write API.
// Its merge helpers are pure. Production calls are explicit supplied adapters;
// their module-relative reads are described by production-readonly.mjs.
import {createHash} from 'node:crypto';

export const SOURCE_PARTS = Object.freeze([
  'rules.json', 'classes.json', 'phb-spell-index.json', 'ua-spell-index.json',
  'phb-spells.json', 'phb-magic-user-extra.json', 'ua-spells.json',
  'equipment.json', 'attack-matrices.json',
]);
export const RELEASE_SEED = Object.freeze({
  date: '2026-11-07',
  coverage: 'Partial extraction with checked source excerpt locations. Extracted values retain their individual review grades; selected equipment values have narrower checked-field evidence. Full source PDFs are not deployed.',
  sourceFilesDeployed: false,
});
// Fail closed if production changes these two source declarations. This is an
// algorithm-alignment check, not a next-source hash or a new epoch identity.
export const PARTS_DECLARATION = "const parts = ['rules.json','classes.json','phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json','equipment.json','attack-matrices.json'].map(load);";
export const DATA_DECLARATION = "const data = {rules:[],spells:[],equipment:[],matrices:[],classes:[],sources:[],release:{date:'2026-11-07',coverage:'Partial extraction with checked source excerpt locations. Extracted values retain their individual review grades; selected equipment values have narrower checked-field evidence. Full source PDFs are not deployed.',sourceFilesDeployed:false}};";
// Reviewed CURRENT producer prefix only. This is not a proposed next source
// identity. Any producer algorithm change needs a new bounded parity review.
export const REVIEWED_PRE_COVERAGE_SOURCE_SHA256 = '8486f190ff7cfc2ecbb219027810e1989d15cfd913fc5507142dd5d3fdc6ef51';

const clone = value => structuredClone(value);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const productionJsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

export function assertProductionDeclarations(assembleSource) {
  if (typeof assembleSource !== 'string') throw new TypeError('Production assembler source must be text');
  const lines = assembleSource.split('\n');
  if (!lines.includes(PARTS_DECLARATION) || !lines.includes(DATA_DECLARATION)) {
    throw new Error('Production authored-source or release declaration changed; review builder alignment');
  }
  const marker = '// Keep the limitations projection separate from the hash-bound core catalog.';
  if (assembleSource.split(marker).length !== 2) throw new Error('Expected exactly one production coverage boundary');
  const preCoverageSourceSha256 = sha256(assembleSource.slice(0, assembleSource.indexOf(marker)));
  if (preCoverageSourceSha256 !== REVIEWED_PRE_COVERAGE_SOURCE_SHA256) {
    throw new Error('Production pre-coverage algorithm changed; exact reviewed prefix digest required');
  }
  return {preCoverageSourceSha256};
}

// Same source order, detail precedence, insertion order, aliases and class/page
// merge as tools/assemble.mjs. Clone first so caller-authored records stay owned.
export function mergeAuthoredParts(parts, release = RELEASE_SEED) {
  if (!Array.isArray(parts) || parts.length !== SOURCE_PARTS.length) {
    throw new Error('Exactly the nine ordered authored source parts are required');
  }
  const ownParts = clone(parts);
  const data = {rules:[],spells:[],equipment:[],matrices:[],classes:[],sources:[],release:clone(release)};
  for (const key of ['rules','classes','sources','equipment','matrices']) {
    data[key] = ownParts.flatMap(part => part[key] || []);
  }
  const spellMap = new Map();
  for (const part of ownParts) for (const spell of part.spells || []) {
    const key = [spell.book, spell.class, spell.name.toLowerCase().replace(/[^a-z0-9]/g,'')].join(':');
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
  return data;
}

// Existing production override helpers are passed explicitly, including their
// collection-qualified ambiguity and source-object cloning behavior.
export function applyAuthoredMetadata(inputData, citations, progression, overrides) {
  const data = clone(inputData), cite = clone(citations), progress = clone(progression);
  const {
    ambiguousItemOverrideIds, appendOverrideReferences, classProgressionOverride,
    cloneOverrideJson, collectionOverride, collectionReferenceOverrides,
    equipmentPriceStateOverride,
  } = overrides;
  const ambiguousIds = ambiguousItemOverrideIds(data, progress.explainer);
  for (const [collection, items] of Object.entries({rules:data.rules,spells:data.spells,classes:data.classes,equipment:data.equipment,matrices:data.matrices})) {
    for (const item of items) {
      appendOverrideReferences(item, collectionReferenceOverrides(cite.items, collection, item.id, ambiguousIds));
      const sourceExcerpts = collectionOverride(cite.sourceExcerpts, collection, item.id, ambiguousIds,
        {allowDeclaredCollection:true,mapName:'sourceExcerpts'});
      if (sourceExcerpts) {
        if (sourceExcerpts.collection && sourceExcerpts.collection !== collection) throw new Error(`Wrong scan collection for ${item.id}`);
        item.sourceExcerpts = cloneOverrideJson(sourceExcerpts);
      }
      const scanVerification = collectionOverride(cite.scanVerification, collection, item.id, ambiguousIds);
      if (scanVerification) item.scanVerification = cloneOverrideJson(scanVerification);
      const priceState = equipmentPriceStateOverride(cite.priceStates, collection, item.id);
      if (priceState) item.priceState = priceState;
      const classOverride = classProgressionOverride(progress.classes, collection, item.id);
      if (classOverride) Object.assign(item, cloneOverrideJson(classOverride));
    }
  }
  if (progress.explainer) {
    data.progressionExplainer = progress.explainer;
    const scanVerification = collectionOverride(cite.scanVerification, 'progressionExplainer', 'progression-explainer', ambiguousIds);
    if (scanVerification) data.progressionExplainer.scanVerification = cloneOverrideJson(scanVerification);
    const sourceExcerpts = collectionOverride(cite.sourceExcerpts, 'progressionExplainer', 'progression-explainer', ambiguousIds,
      {allowDeclaredCollection:true,mapName:'sourceExcerpts'});
    if (sourceExcerpts) {
      if (sourceExcerpts.collection && sourceExcerpts.collection !== 'progressionExplainer') throw new Error('Wrong scan collection for progression explainer');
      data.progressionExplainer.sourceExcerpts = cloneOverrideJson(sourceExcerpts);
    }
  }
  return data;
}

// Reading image bytes is explicit. No image, crop, review, or source grade is
// created by this structural parity step.
export function validateAndSummarizeExcerpts(data, {catalogFor, readImage, books, scan}) {
  const excerptItems = [...data.rules,...data.spells,...data.classes,...data.equipment,...data.matrices,
    ...(data.progressionExplainer ? [{...data.progressionExplainer,id:'progression-explainer'}] : [])]
    .filter(item => scan.scanStates.has(item.scanVerification?.state) || item.sourceExcerpts?.state === 'source-excerpt-checked');
  const uniqueRegions = new Set(), imageFiles = new Set(), imageMetadata = new Map();
  let scopedRegions = 0, catalogValidationCalls = 0;
  for (const item of excerptItems) {
    for (const verification of [item.scanVerification, item.sourceExcerpts].filter(value => scan.scanStates.has(value?.state))) {
      const path = verification.catalog;
      if (!scan.validScanCatalogPath(item.id, path, verification)) throw new Error(`Invalid scan catalog path for ${item.id}`);
      const catalog = catalogFor(path);
      scan.validateScanCatalog(catalog, item, books, verification);
      catalogValidationCalls++;
      for (const region of catalog.regions) {
        const key = `${path.slice(0, path.lastIndexOf('/') + 1)}${region.image}`;
        if (!imageMetadata.has(key)) {
          const bytes = readImage(path, region.image);
          if (bytes.length < 24 || !bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) throw new Error(`Invalid scan PNG for ${item.id}: ${region.image}`);
          imageMetadata.set(key, {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:sha256(bytes)});
        }
        const meta = imageMetadata.get(key);
        if (meta.width !== region.width || meta.height !== region.height || meta.sha256 !== region.sha256) throw new Error(`Scan image mismatch for ${item.id}: ${region.image}`);
      }
      if (verification === item.scanVerification && item.sourceExcerpts) continue;
      for (const region of catalog.regions) {
        uniqueRegions.add(JSON.stringify([region.book,region.printedPage,region.sha256,region.focusRects]));
        imageFiles.add(region.sha256);
        scopedRegions++;
      }
    }
  }
  return {
    excerpts: {
      itemIds:excerptItems.map(item => item.id), regions:uniqueRegions.size, scopedRegions, imageFiles:imageFiles.size,
      selectedValuesItems:excerptItems.filter(item => item.scanVerification?.state === 'selected-values-checked').length,
      sourceExcerptItems:excerptItems.filter(item => item.scanVerification?.state === 'source-excerpt-checked' || item.sourceExcerpts?.state === 'source-excerpt-checked').length,
    },
    diagnostics: {catalogValidationCalls, physicalImagesValidated:imageMetadata.size},
  };
}

/**
 * Explicit read-only orchestration of existing production functions. This is
 * not a native source gate or full assembler. A future composition can pass
 * reviewed parts/overrides/manual/catalog snapshots, but module-bound evidence
 * reads in the production adapter still require one matching candidate root.
 */
export function buildPreCoverageSourceBody(inputs, runtime) {
  const merged = mergeAuthoredParts(inputs.parts, inputs.release || RELEASE_SEED);
  const data = applyAuthoredMetadata(merged, inputs.citations, inputs.progression, runtime.overrides);
  const validation = validateAndSummarizeExcerpts(data, runtime);
  data.release.excerpts = validation.excerpts;
  const priceInventory = runtime.inventory.buildPriceSourceInventory({
    equipment:data.equipment, data, manualBindings:clone(inputs.manualBindings),
    catalogs:runtime.catalogs,
  });
  runtime.inventory.validatePriceSourceInventory(priceInventory, {equipment:data.equipment,data,catalogs:runtime.catalogs});
  runtime.inventory.attachEvidenceBindings(data, priceInventory);
  runtime.inventory.attachSourceVisualReviewMetadata(data, {ledger:clone(inputs.sourceVisualReviews),catalogs:runtime.catalogs});
  // Match production's writePriceSourceInventory call boundary exactly, before
  // adding release.priceInventory and before calling the publisher.
  const priceInventoryBytes = productionJsonBytes(priceInventory);
  data.release.priceInventory = {
    path:'research/price-source-inventory.json',siteEquipmentObjects:priceInventory.counts.siteEquipmentObjects,
    sitePrintedPrices:priceInventory.counts.sitePrintedPrices,sitePriceGaps:priceInventory.counts.sitePriceGaps,
    editorialEstimates:priceInventory.counts.editorialEstimates,sourceRows:priceInventory.counts.sourceRows,
    fieldEvidenceBindings:priceInventory.counts.fieldEvidenceBindings,
    fieldEvidenceBindingsByCollection:priceInventory.counts.fieldEvidenceBindingsByCollection,
    regionBoundBindings:priceInventory.counts.regionBoundBindings,pendingRegionBindings:priceInventory.counts.pendingRegionBindings,
  };
  // Production writes data immediately before building published continuations.
  const dataBytes = productionJsonBytes(data);
  const publishedContinuations = runtime.publisher.buildPublishedContinuations({
    manifest:clone(inputs.continuationManifest),data,catalogRoot:runtime.catalogRoot,
  });
  return {
    data, priceInventory, publishedContinuations,
    outputBytes:{data:dataBytes,priceInventory:priceInventoryBytes,publishedContinuations:productionJsonBytes(publishedContinuations)},
    diagnostics:{...validation.diagnostics,productionFunctions:{buildPriceSourceInventory:1,validatePriceSourceInventory:1,attachEvidenceBindings:1,attachSourceVisualReviewMetadata:1,buildPublishedContinuations:1}},
  };
}
