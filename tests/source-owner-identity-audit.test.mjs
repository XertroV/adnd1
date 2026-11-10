import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {assertWeaponPendingBindingCohort,weaponBindingAdditionCount} from './helpers/weapon-source-current-cohort.mjs';
import {assertUaSourceContextBindingCohort} from './helpers/ua-source-closed-v28-context.mjs';
import {readHirelingsCurrentSourceInputs,assertHirelingsCurrentSourceCohort} from './helpers/hirelings-source-current-cohort.mjs';
import {buildSourceOwnerIdentityAudit, sourceOwnerIdentityCheck} from '../tools/source-owner-identity-audit.mjs';
import {buildPriceSourceInventory} from '../tools/price-source-inventory.mjs';
import {ambiguousItemOverrideIds, appendOverrideReferences, classProgressionOverride, collectionOverride, collectionReferenceOverrides, equipmentPriceStateOverride} from '../tools/citation-override-identity.mjs';

const root = resolve(import.meta.dirname, '..');
const baseline = JSON.parse(readFileSync(resolve(root, 'research/source-owner-identity-baseline.json'), 'utf8'));
const ua75 = JSON.parse(readFileSync(resolve(root, 'research/source-audit-batch5-ua75-secondary-occurrence-integration.json'), 'utf8'));
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const valueSha256 = value => createHash('sha256').update(canonical(value)).digest('hex');
const withoutBinding = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'evidenceBindings'));
const dmg74MatrixIds = [
  'dmg-cleric-druid-monk-attack-matrix',
  'dmg-magic-user-illusionist-attack-matrix',
  'dmg-thief-assassin-attack-matrix',
];
const priorBindingCount = 4489 + 40 + 20 + 1 + ua75.referenceAppends.length;
const dmg74MatrixBindingCount = dmg74MatrixIds.length * 2;
const druidBindingCount = 2;
const uaSourceContextBindingCount = 24;
const priorDmg175BindingAdditionCount = 226;
const nativeHirelingsCohortSummary=assertHirelingsCurrentSourceCohort(readHirelingsCurrentSourceInputs(root));
const hirelingBindingAdditionCount=nativeHirelingsCohortSummary.addedBindings;
const sourcePhaseBindingCount = priorBindingCount + dmg74MatrixBindingCount + druidBindingCount + weaponBindingAdditionCount + uaSourceContextBindingCount;
const priorCurrentBindingCount = sourcePhaseBindingCount + priorDmg175BindingAdditionCount;
const currentBindingCount = nativeHirelingsCohortSummary.canonicalBindings;
assert.equal(sourcePhaseBindingCount,4705,'the closed SOURCE phase still has its exact 4,705 binding objects');
assert.equal(priorCurrentBindingCount,4931,'the prior native current binding cohort remains whole');
assert.equal(currentBindingCount,priorCurrentBindingCount+hirelingBindingAdditionCount,'the pinned H-current cohort adds its exact bindings to the preserved prior set');
function assertDruidBindings(bindings,itemIdField="itemId") {
 const rows=bindings.filter(row=>row[itemIdField]==='phb-druid-mistletoe-spell-components');
 assert.equal(rows.length,2);assert.deepEqual(rows.map(row=>row.fieldPointer).sort(),['','/sourceReferences/0']);
 for(const row of rows){assert.equal(row.collection??row.bindingCollection,'rules');assert.equal(row.book,'PHB');assert.equal(row.printedPage,54);assert.equal(row.reviewStatus,'field-target-pending');}
}

function assertDmg74MatrixBindings(bindings, itemIdField = 'itemId') {
  const matrixBindings = bindings.filter(binding => dmg74MatrixIds.includes(binding[itemIdField]));
  assert.equal(matrixBindings.length, dmg74MatrixBindingCount);
  for (const itemId of dmg74MatrixIds) {
    const rows = matrixBindings.filter(binding => binding[itemIdField] === itemId);
    assert.equal(rows.length, 2, itemId);
    assert.deepEqual(rows.map(binding => binding.fieldPointer).sort(), ['', '/cellVerification'], itemId);
    for (const binding of rows) {
      assert.equal(binding.collection ?? binding.bindingCollection, 'matrices', itemId);
      assert.deepEqual(binding.sourceOwner, {collection: 'matrices', itemId}, itemId);
      assert.equal(binding.sourceCategory, 'matrix-reference', itemId);
      assert.equal(binding.book, 'DMG', itemId);
      assert.equal(binding.printedPage, 74, itemId);
      assert.equal(binding.catalog, `scans/verified/matrices-${itemId}.json`, itemId);
      if ('pdfPage' in binding) assert.equal(binding.pdfPage, 75, itemId);
      assert.equal(binding.reviewStatus, 'field-target-pending', itemId);
    }
  }
}

// Restore only the exact UA75 successor recorded after the owner migration.
// Removing the reference alone leaves its region review and regionCount behind.
function beforeUa75Equipment(items) {
  const copy = structuredClone(items);
  assert.equal(ua75.referenceAppends.length, 16);
  for (const addition of ua75.referenceAppends) {
    const item = copy.find(item => item.id === addition.itemId);
    assert.ok(item, addition.itemId);
    assert.equal(item.references.length, addition.expectedResolvedReferenceCountAfter);
    assert.deepEqual(withoutBinding(item.references[addition.resolvedReferenceIndex]), addition.appendReference);
    item.references.splice(addition.resolvedReferenceIndex, 1);
    if (!item.references.length) delete item.references;
    const catalogAddition = ua75.catalogAppends.find(row => row.itemId === item.id);
    assert.ok(catalogAddition, item.id);
    const regionReviews = item.sourceExcerpts.regionReviews;
    const addedReviews = regionReviews.filter(row => row.regionId === catalogAddition.regionId);
    assert.equal(addedReviews.length, 1, item.id);
    for (const key of ['sourceSha256', 'imageSha256', 'focusSha256', 'contentSha256']) {
      assert.equal(addedReviews[0][key], catalogAddition.regionEvidence[key], `${item.id}/${key}`);
    }
    item.sourceExcerpts.regionReviews = regionReviews.filter(row => row.regionId !== catalogAddition.regionId);
    assert.equal(item.sourceExcerpts.regionCount, regionReviews.length);
    item.sourceExcerpts.regionCount -= 1;
  }
  return copy;
}

test('frozen pre-fix worktree inventory preserves the complete 995-record owner and override universe', () => {
  assert.equal(baseline.capture.inputCommit, '679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.deepEqual(baseline.report.denominator.recordsByCollection, {
    rules: 148,
    spells: 638,
    classes: 16,
    equipment: 191,
    matrices: 1,
    progressionExplainer: 1,
  });
  assert.equal(baseline.report.denominator.recordCount, 995);
  assert.equal(baseline.report.records.length, 995);
  assert.deepEqual(baseline.report.duplicateIdUniverse.map(row => row.itemId), ['ua-buckler', 'ua-field-plate', 'ua-full-plate']);
  assert.deepEqual(Object.fromEntries(Object.entries(baseline.report.overrideApplications).map(([name, entry]) => [name, entry.ambiguousBareEntryCount])), {
    items: 2,
    scanVerification: 0,
    priceStates: 3,
    sourceExcerpts: 0,
  });
});

test('ua-field-plate baseline binds the shared reference and cross-owner bindings to exact inputs', () => {
  const entry = baseline.knownCollisionCases.find(row => row.itemId === 'ua-field-plate');
  assert.ok(entry);
  assert.deepEqual(entry.ownerPaths.map(owner => owner.collection), ['rules', 'equipment']);
  assert.ok(entry.ownerPaths.every(owner => owner.referencePaths.some(path => path.pointer === '/references')));
  assert.ok(entry.ownerPaths.every(owner => owner.attachedEvidenceBindingPaths.includes('/references/0/evidenceBindings/0') && owner.attachedEvidenceBindingPaths.includes('/references/0/evidenceBindings/1')));
  assert.equal(entry.unscopedItemOverride.references[0].verification.regions[0], 'ua-26-ac-row-ab8a47e30af79c9d');
  assert.equal(entry.foreignBindingPaths.length, 2);
  assert.deepEqual(entry.foreignBindingPaths.map(binding => [binding.attachmentOwner.collection, binding.attachmentPath, binding.bindingCollection]), [
    ['rules', '/references/0/evidenceBindings/0', 'equipment'],
    ['equipment', '/references/0/evidenceBindings/1', 'rules'],
  ]);
  for (const owner of entry.catalogs) {
    assert.match(owner.excerptCatalogEvidence.catalogSha256, /^[a-f0-9]{64}$/);
    assert.ok(owner.excerptCatalogEvidence.regions.length > 0);
    assert.ok(owner.excerptCatalogEvidence.regions.every(region => /^[a-f0-9]{64}$/.test(region.imageFileSha256)));
  }
  assert.equal(baseline.inMemoryCurrentAssemblyReplay.preAttachCrossOwnerObjectAliasCount, 2);
  assert.equal(baseline.inMemoryCurrentAssemblyReplay.foreignOwnerBindings.length, 4);
});

test('current source assembly resolves scoped citations, preserves legacy intent, and removes the captured contamination', async () => {
  const citations = JSON.parse(readFileSync(resolve(root, 'citation-overrides.json'), 'utf8'));
  const central = JSON.parse(readFileSync(resolve(root, 'research/source-audit-batch5-ua26-central-integration.json'), 'utf8'));
  const migration = JSON.parse(readFileSync(resolve(root, 'research/source-owner-identity-migration.json'), 'utf8'));
  for (const itemId of ['ua-field-plate', 'ua-full-plate']) {
    const added = central.addedReferences.find(row => row.collection === 'equipment' && row.itemId === itemId && row.reference.label === 'UA p.26 Armor Class Table');
    assert.ok(added, itemId);
    const secondary = ua75.referenceAppends.find(row => row.itemId === itemId);
    assert.ok(secondary, itemId);
    assert.deepEqual(citations.items[`equipment:${itemId}`].references, [added.reference, secondary.appendReference]);
    assert.deepEqual(secondary.beforeScopedEntry.references, [added.reference]);
    assert.equal(Object.hasOwn(citations.items, itemId), false);
    const historical = migration.overrides.removedLegacyBareEntries.find(row => row.legacyBareKey === itemId);
    assert.deepEqual(historical.exactPriorValue, {references: baseline.knownCollisionCases.find(row => row.itemId === itemId).unscopedItemOverride.references});
  }
  assertHirelingsCurrentSourceCohort(readHirelingsCurrentSourceInputs(root));
  const currentData = JSON.parse(readFileSync(resolve(root, 'dist/data.json'), 'utf8'));
  const grandDruidLevel15 = currentData.classes.find(item => item.id === 'ua-druid').levelChanges[0];
  const grandDruidPage16Companion = grandDruidLevel15.evidenceBindings.filter(binding => binding.sourceCategory === 'class-level-change');
  assert.equal(grandDruidPage16Companion.length, 1);
  assert.deepEqual({
    collection: grandDruidPage16Companion[0].collection,
    itemId: grandDruidPage16Companion[0].itemId,
    fieldPointer: grandDruidPage16Companion[0].fieldPointer,
    sourceObjectPointer: grandDruidPage16Companion[0].sourceObjectPointer,
    book: grandDruidPage16Companion[0].book,
    printedPage: grandDruidPage16Companion[0].printedPage,
    pdfPage: grandDruidPage16Companion[0].pdfPage,
    regionIds: grandDruidPage16Companion[0].regionIds,
    reviewStatus: grandDruidPage16Companion[0].reviewStatus,
    contextStatus: grandDruidPage16Companion[0].contextStatus,
  }, {
    collection: 'classes', itemId: 'ua-druid', fieldPointer: '/levelChanges/0', sourceObjectPointer: '/levelChanges/0',
    book: 'UA', printedPage: 16, pdfPage: 17, regionIds: [],
    reviewStatus: 'field-target-pending', contextStatus: 'context-not-assessed',
  });
  const currentReplay = buildSourceOwnerIdentityAudit({replayAssembly: true}).inMemoryCurrentAssemblyReplay;
  assert.equal(currentReplay.preAttachCrossOwnerObjectAliasCount, 0);
  assert.equal(currentReplay.foreignOwnerBindings.length, 0);
  assert.equal(currentReplay.counts.evidenceBindings, currentBindingCount);
  assert.equal(currentReplay.counts.dispositions.validatedExplicitComparatorSource, 6);
  const currentReport = buildSourceOwnerIdentityAudit();
  assert.equal(sourceOwnerIdentityCheck(currentReport).pass, true);
  assert.equal(currentReport.report.evidenceBindings.denominator, currentBindingCount);
  assertUaSourceContextBindingCohort(currentReport.report.evidenceBindings.attachedBindingPaths,'bindingItemId');
  assertWeaponPendingBindingCohort(currentReport.report.evidenceBindings.attachedBindingPaths,'bindingItemId');
  assertDmg74MatrixBindings(currentReport.report.evidenceBindings.attachedBindingPaths, 'bindingItemId');
  assertDruidBindings(currentReport.report.evidenceBindings.attachedBindingPaths,'bindingItemId');
  assert.equal(currentReport.currentOwnerIdentity.progressionClassOverrideApplications.overrideCount, 16);
  assert.equal(currentReport.currentOwnerIdentity.progressionClassOverrideApplications.intendedClassOwnerCount, 16);
  assert.equal(currentReport.currentOwnerIdentity.progressionClassOverrideApplications.nonClassOwnerCountPreviouslyEligible, 0);
  const stateCorrection = migration.equipmentOnlyPriceStateScopeCorrection;
  const historicalEquipment = beforeUa75Equipment(currentData.equipment);
  const lineage = JSON.parse(readFileSync(resolve(root, 'research/source-owner-identity-baseline-lineage-recovery.json'), 'utf8'));
  const baselineBytes = readFileSync(resolve(root, 'research/source-owner-identity-baseline.json'));
  assert.equal(lineage.preservedAvailableBaseline.sha256, createHash('sha256').update(baselineBytes).digest('hex'));
  assert.equal(lineage.reportedFirstSealedHash.status, 'reported-by-parent-but-exact-bytes-unavailable');
  assert.equal(lineage.preservedAvailableBaseline.sha256, '029fc6193118405bb5a9afe38d4ae052aae95c4d4fa5cd2a205a182fe9b02ecd');
  assert.equal(stateCorrection.entries.length, 3);
  for (const entry of stateCorrection.entries) {
    const historical = baseline.knownCollisionCases.find(row => row.itemId === entry.itemId);
    assert.equal(entry.before.rulesRecordSha256, historical.ownerPaths.find(row => row.collection === 'rules').recordSha256);
    assert.equal(entry.before.rulesPriceState, 'source_listed');
    assert.equal(entry.legacyBarePriceStateOverride, 'source_listed');
    assert.equal(entry.after.rulesHasPriceStateProperty, false);
    assert.equal(entry.after.equipmentPriceState, 'source_listed');
    const currentRows = currentReport.report.records.filter(row => row.itemId === entry.itemId);
    assert.equal(entry.after.rulesRecordSha256, currentRows.find(row => row.collection === 'rules').recordSha256);
    assert.equal(entry.after.equipmentRecordSha256, valueSha256(historicalEquipment.find(row => row.id === entry.itemId)));
    assert.equal(currentRows.find(row => row.collection === 'equipment').recordSha256,
      valueSha256(currentData.equipment.find(row => row.id === entry.itemId)));
    assert.equal(currentData.rules.find(row => row.id === entry.itemId).priceState, undefined);
    assert.equal(currentData.equipment.find(row => row.id === entry.itemId).priceState, 'source_listed');
  }
  assert.equal(baseline.report.evidenceBindings.denominator, 4495);
  assert.equal(baseline.report.evidenceBindings.foreignOwnerBindings.length, 4);
});

test('legacy-semantic replay preserves the pre-fix contamination as a reproducible red fixture', () => {
  const replay = JSON.parse(readFileSync(resolve(root, 'research/source-owner-identity-legacy-replay.json'), 'utf8'));
  assert.equal(replay.expectedBaseline.sha256, '029fc6193118405bb5a9afe38d4ae052aae95c4d4fa5cd2a205a182fe9b02ecd');
  assert.equal(replay.inputHashes.rawInputsMatchBaseline, true);
  assert.equal(replay.observed.recordCount, 995);
  assert.equal(replay.observed.evidenceBindingCount, 4495);
  assert.equal(replay.observed.crossOwnerSharedObjectAliasCountBeforeAttach, 2);
  assert.equal(replay.observed.foreignOwnerBindings.length, 4);
  assert.equal(replay.equivalence.oldForeignOwnerBindingCountMatchesFrozenRecord, true);
  assert.equal(replay.equivalence.oldAliasCountMatchesFrozenRecord, true);
  assert.deepEqual(replay.equivalence.priceStateLeakRows.map(row => row.itemId).sort(), ['ua-buckler', 'ua-field-plate', 'ua-full-plate']);
});

test('unique legacy references remain additive with scoped references; unresolved duplicate-ID overrides throw', () => {
  const data = {rules: [{id: 'collision'}], spells: [], classes: [], matrices: [], equipment: [{id: 'collision'}, {id: 'unique'}]};
  const ambiguous = ambiguousItemOverrideIds(data);
  const overrides = {
    'unique': {references: [{label: 'legacy'}]},
    'equipment:unique': {references: [{label: 'scoped'}]},
    'collision': {references: [{label: 'ambiguous legacy'}]},
    'equipment:collision': {references: [{label: 'equipment scoped'}]},
  };
  const target = {id: 'unique'};
  appendOverrideReferences(target, collectionReferenceOverrides(overrides, 'equipment', 'unique', ambiguous));
  assert.deepEqual(target.references.map(reference => reference.label), ['legacy', 'scoped']);
  assert.notEqual(target.references[0], overrides.unique.references[0]);
  assert.notEqual(target.references[1], overrides['equipment:unique'].references[0]);
  assert.throws(() => collectionReferenceOverrides(overrides, 'rules', 'collision', ambiguous), /Ambiguous unscoped item reference override/);
  assert.throws(() => collectionReferenceOverrides(overrides, 'equipment', 'collision', ambiguous), /Ambiguous unscoped item reference override/);
  assert.deepEqual(collectionReferenceOverrides({'collision': {references: []}, 'equipment:collision': {references: [{label: 'equipment scoped'}]}}, 'equipment', 'collision', ambiguous).map(row => row.references[0].label), ['equipment scoped']);
  assert.throws(() => collectionOverride({collision: {state: 'pending'}}, 'rules', 'collision', ambiguous, {mapName: 'scanVerification'}), /Ambiguous unscoped scanVerification override/);
  const scopedExcerpts = {collision: {collection: 'rules', catalog: 'rules-ua-field-plate.json'}};
  assert.equal(collectionOverride(scopedExcerpts, 'rules', 'collision', ambiguous, {allowDeclaredCollection: true, mapName: 'sourceExcerpts'}).catalog, 'rules-ua-field-plate.json');
  assert.equal(collectionOverride(scopedExcerpts, 'equipment', 'collision', ambiguous, {allowDeclaredCollection: true, mapName: 'sourceExcerpts'}), undefined);
  const dualExcerpts = {
    collision: {collection: 'rules', catalog: 'legacy-rules-catalog.json'},
    'rules:collision': {collection: 'rules', catalog: 'scoped-rules-catalog.json'},
  };
  assert.equal(collectionOverride(dualExcerpts, 'rules', 'collision', ambiguous, {allowDeclaredCollection: true, mapName: 'sourceExcerpts'}).catalog, 'scoped-rules-catalog.json');
  assert.equal(equipmentPriceStateOverride({collision: 'source_listed'}, 'equipment', 'collision'), 'source_listed');
  assert.equal(equipmentPriceStateOverride({collision: 'source_listed'}, 'rules', 'collision'), undefined);
  const progressionClass = {collision: {attacksPerRound: {value: 2}}};
  assert.equal(classProgressionOverride(progressionClass, 'rules', 'collision'), undefined);
  assert.equal(classProgressionOverride(progressionClass, 'equipment', 'collision'), undefined);
  assert.equal(classProgressionOverride(progressionClass, 'classes', 'collision'), progressionClass.collision);
});

test('foreign owner bindings are separated from validated explicit comparator-source bindings', () => {
  const ownerBinding = {
    collection: 'equipment', itemId: 'target', fieldPointer: '/suggestedPrice/comparisons/0',
    sourceObjectPointer: '/suggestedPrice/comparisons/0', sourceCategory: 'printed-price-comparator',
    sourceOwner: {collection: 'equipment', itemId: 'source'}, book: 'PHB', printedPage: 35,
    catalog: 'scans/verified/equipment-source.json', regionIds: ['source-row'], reviewStatus: 'field-target-reviewed',
    targetReview: {status: 'confirmed', independent: true},
  };
  const data = {
    rules: [{id: 'target', references: [{evidenceBindings: [{collection: 'equipment', itemId: 'target', sourceOwner: {collection: 'equipment', itemId: 'target'}, sourceCategory: 'record-reference'}]}]}],
    spells: [], classes: [], matrices: [],
    equipment: [
      {id: 'target', suggestedPrice: {comparisons: [{itemId: 'source', evidenceBindings: [ownerBinding]}]}},
      {id: 'source'},
    ],
  };
  const report = buildSourceOwnerIdentityAudit({data, overrides: {items: {target: {references: [{book: 'UA'}]}}, priceStates: {}, sourceExcerpts: {}, scanVerification: {}}}).report;
  assert.deepEqual(report.duplicateIdUniverse.map(row => row.itemId), ['target']);
  assert.equal(report.overrideApplications.items.ambiguousBareEntryCount, 1);
  assert.equal(report.ambiguousActiveItemOverrideCount, 1);
  assert.deepEqual(report.evidenceBindings.dispositions, {ownerMatched: 0, validatedExplicitComparatorSource: 1, foreignOwner: 1});
  assert.equal(report.evidenceBindings.foreignOwnerBindings[0].attachmentOwner.collection, 'rules');
  assert.deepEqual(sourceOwnerIdentityCheck({
    report,
    currentOwnerIdentity: {crossOwnerSharedObjectAliases: [{firstOwnerPath: 'rules:target/a', secondOwnerPath: 'equipment:target/a'}]},
  }), {
    pass: false,
    schemaValid: true,
    errors: [],
    foreignOwnerBindingCount: 1,
    crossOwnerSharedObjectAliasCount: 1,
    ambiguousActiveItemOverrideCount: 1,
  });
  const validReport=buildSourceOwnerIdentityAudit({data:{rules:[{id:'valid-owner',evidenceBindings:[{collection:'rules',itemId:'valid-owner',sourceOwner:{collection:'rules',itemId:'valid-owner'}}]}]},overrides:{}}).report;
  assert.deepEqual(sourceOwnerIdentityCheck({
    report: validReport,
    currentOwnerIdentity: {crossOwnerSharedObjectAliases: []},
  }), {
    pass: true,
    schemaValid: true,
    errors: [],
    foreignOwnerBindingCount: 0,
    crossOwnerSharedObjectAliasCount: 0,
    ambiguousActiveItemOverrideCount: 0,
  });
  const invalidRecords=structuredClone(validReport);invalidRecords.records=[{}];
  const invalidResult=sourceOwnerIdentityCheck({report:invalidRecords,currentOwnerIdentity:{crossOwnerSharedObjectAliases:[]}});
  assert.equal(invalidResult.pass,false);assert.equal(invalidResult.schemaValid,false);
  assert.ok(invalidResult.errors.includes('invalid-owner-record-schema-or-duplicate'));
  const malformed = sourceOwnerIdentityCheck({});
  assert.equal(malformed.pass, false);
  assert.equal(malformed.schemaValid, false);
  assert.deepEqual(malformed.errors, [
    'invalid-or-missing-record-denominator',
    'invalid-or-missing-binding-denominator',
    'missing-cross-owner-alias-inventory',
    'missing-ambiguous-active-override-count',
  ]);
});

test('pending singleton owners participate before collection overrides are applied',()=>{
 const extension=JSON.parse(readFileSync(resolve(root,'research/source-owner-identity-validation-extension.json'),'utf8'));
 assert.deepEqual(extension.cases[0].beforeAmbiguousIds,[]);
 assert.equal(extension.cases[1].beforeResult.pass,true);
 const data={rules:[{id:'progression-explainer'}]};
 const pending={title:'An authored singleton does not need its synthetic ID stored'};
 const collisions=ambiguousItemOverrideIds(data,pending);
 assert.deepEqual([...collisions],['progression-explainer']);
 assert.throws(()=>collectionReferenceOverrides({'progression-explainer':{references:[{book:'PHB',pages:[33]}]}},'rules','progression-explainer',collisions),/Ambiguous/);
});

test('standalone price-source inventory uses scoped owner references without rule-owner leakage', () => {
  assertHirelingsCurrentSourceCohort(readHirelingsCurrentSourceInputs(root));
  const inventory = buildPriceSourceInventory();
  const currentData = JSON.parse(readFileSync(resolve(root, 'dist/data.json'), 'utf8'));
  const historicalData = {...currentData, equipment: beforeUa75Equipment(currentData.equipment)};
  const historicalInventory = buildPriceSourceInventory({equipment: historicalData.equipment, data: historicalData});
  const grandDruidCompanion = inventory.fieldEvidenceBindings.filter(binding => binding.collection === 'classes' && binding.itemId === 'ua-druid' && binding.fieldPointer === '/levelChanges/0' && binding.sourceCategory === 'class-level-change');
  assert.equal(grandDruidCompanion.length, 1);
  assert.deepEqual({
    sourceObjectPointer: grandDruidCompanion[0].sourceObjectPointer,
    book: grandDruidCompanion[0].book,
    printedPage: grandDruidCompanion[0].printedPage,
    pdfPage: grandDruidCompanion[0].pdfPage,
    regionIds: grandDruidCompanion[0].regionIds,
    reviewStatus: grandDruidCompanion[0].reviewStatus,
    contextStatus: grandDruidCompanion[0].contextStatus,
    sourceSha256: grandDruidCompanion[0].sourceSha256,
    targetReview: grandDruidCompanion[0].targetReview,
  }, {
    sourceObjectPointer: '/levelChanges/0', book: 'UA', printedPage: 16, pdfPage: 17, regionIds: [],
    reviewStatus: 'field-target-pending', contextStatus: 'context-not-assessed', sourceSha256: null, targetReview: null,
  });
  const historicalGrandDruidCompanion = historicalInventory.fieldEvidenceBindings.filter(binding => binding.collection === 'classes' && binding.itemId === 'ua-druid' && binding.fieldPointer === '/levelChanges/0' && binding.sourceCategory === 'class-level-change');
  assert.deepEqual(historicalGrandDruidCompanion, grandDruidCompanion);
  assert.equal(historicalInventory.counts.fieldEvidenceBindings, 4489 + 40 + 20 + 1 + dmg74MatrixBindingCount + druidBindingCount + weaponBindingAdditionCount + uaSourceContextBindingCount + priorDmg175BindingAdditionCount + hirelingBindingAdditionCount);
  assert.equal(inventory.counts.fieldEvidenceBindings, currentBindingCount);
  assertUaSourceContextBindingCohort(historicalInventory.fieldEvidenceBindings);assertUaSourceContextBindingCohort(inventory.fieldEvidenceBindings);
  assertWeaponPendingBindingCohort(historicalInventory.fieldEvidenceBindings);assertWeaponPendingBindingCohort(inventory.fieldEvidenceBindings);
  assertDmg74MatrixBindings(historicalInventory.fieldEvidenceBindings);
  assertDmg74MatrixBindings(inventory.fieldEvidenceBindings);
  assertDruidBindings(inventory.fieldEvidenceBindings);
  const joBindings=inventory.fieldEvidenceBindings.filter(binding=>binding.itemId==='ua-jo-stick');assert.equal(joBindings.length,19);assert.ok(joBindings.every(binding=>binding.collection==='equipment'&&binding.sourceOwner.itemId==='ua-jo-stick'));
  assert.equal(inventory.siteClaims.find(claim=>claim.itemId==='ua-jo-stick').missingPrice,true);
  const additions = inventory.fieldEvidenceBindings.filter(binding => binding.sourceCategory === 'equipment-price-occurrence-reference' && binding.printedPage === 75 && ua75.referenceAppends.some(row => row.itemId === binding.itemId && row.fieldPointer === binding.fieldPointer));
  assert.equal(additions.length, 16);
  for (const addition of ua75.referenceAppends) {
    const binding = additions.find(binding => binding.itemId === addition.itemId);
    assert.ok(binding, addition.itemId);
    assert.equal(binding.collection, 'equipment');
    assert.deepEqual(binding.regionIds, addition.appendReference.verification.regions);
  }
  for (const itemId of ['ua-field-plate', 'ua-full-plate']) {
    const bindings = inventory.fieldEvidenceBindings.filter(binding => binding.itemId === itemId && binding.sourceCategory === 'record-reference');
    const historicalBindings = historicalInventory.fieldEvidenceBindings.filter(binding => binding.itemId === itemId && binding.sourceCategory === 'record-reference');
    assert.equal(historicalBindings.length, 1, itemId);
    assert.equal(bindings.length, 1, itemId);
    assert.equal(additions.filter(binding => binding.itemId === itemId).length, 1, itemId);
    const primary = bindings.find(binding => binding.fieldPointer === '/references/0');
    assert.ok(primary, itemId);
    assert.equal(primary.collection, 'equipment');
    assert.equal(primary.catalog, `scans/verified/equipment-${itemId}.json`);
    assert.deepEqual(primary, historicalBindings[0]);
  }
  assert.equal(inventory.fieldEvidenceBindings.some(binding => binding.collection === 'rules' && ['ua-field-plate', 'ua-full-plate'].includes(binding.itemId) && binding.fieldPointer === '/references/0'), false);
});
