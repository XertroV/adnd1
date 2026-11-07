import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {BASELINE_COMMIT, buildSystemicInventory, fullReportHashMetadata, FULL_REPORT_HASH_FORMAT, normalizeRect, parseExactPrice, projectVisualCoverageSummary, renderSummaryMarkdown} from '../tools/citation-systemic-inventory.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const baseline = JSON.parse(readFileSync(new URL('../research/citation-systemic-baseline.json', import.meta.url), 'utf8'));
const calibration = JSON.parse(readFileSync(new URL('../research/citation-regression-calibration.json', import.meta.url), 'utf8'));
const navigationCoverage = JSON.parse(readFileSync(new URL('../research/citation-navigation-coverage.json', import.meta.url), 'utf8'));
const catalogTemplate = JSON.parse(readFileSync(new URL('../dist/scans/verified/equipment-phb-banded-mail.json', import.meta.url), 'utf8'));

function fixtureCatalog(itemId, regionIds = ['fixture-region']) {
  return Buffer.from(JSON.stringify({...catalogTemplate, itemId, regions: regionIds.map((id, index) => ({...structuredClone(catalogTemplate.regions[0]), id, book: 'PHB', printedPage: 35 + index, pdfPage: 36 + index}))}));
}

function hasCommit(commit) {
  return spawnSync('git', ['cat-file', '-e', `${commit}^{commit}`], {cwd: root}).status === 0;
}

test('pinned Git baseline inventories every JSON node and exposed record', {
  skip: hasCommit(BASELINE_COMMIT) ? false : 'Pinned Git objects are absent in this shallow checkout; baseline numeric artifact assertions still run.'
}, () => {
  const bytes = execFileSync('git', ['show', `${BASELINE_COMMIT}:dist/data.json`], {cwd: root, maxBuffer: 150 * 1024 * 1024});
  const data = JSON.parse(bytes.toString('utf8'));
  assert.equal(sha256(Buffer.from(JSON.stringify(data))), baseline.input.sha256);
  assert.equal(sha256(bytes), baseline.input.rawFileSha256);
  assert.equal(baseline.commit, BASELINE_COMMIT);
  assert.equal(baseline.collectionDenominator.exposedRecordCount, 920);
  assert.deepEqual(baseline.collectionDenominator.recordsByCollection, {rules: 148, spells: 638, equipment: 116, matrices: 1, classes: 16, progressionExplainer: 1});
  assert.equal(baseline.jsonTree.totalNodes, 46618);
  assert.equal(baseline.jsonTree.objectNodes, 5140);
  assert.equal(baseline.jsonTree.arrayNodes, 7198);
  assert.equal(baseline.jsonTree.scalarLeaves, 34280);
  assert.equal(baseline.jsonTree.nodes.length, baseline.jsonTree.totalNodes);
  assert.equal(baseline.jsonTree.nodeClassificationDenominator, baseline.jsonTree.totalNodes);
  assert.equal(Object.values(baseline.jsonTree.nodeClassificationCounts).reduce((sum, count) => sum + count, 0), baseline.jsonTree.totalNodes);
});

test('all pinned selected-owner catalogs and their region counts match immutable Git blobs', {
  skip: hasCommit(BASELINE_COMMIT) ? false : 'Pinned Git objects are absent in this shallow checkout; numeric baseline assertions still run.'
}, () => {
  let regionCount = 0;
  for (const usage of baseline.selectedOwnerCatalogs.usages) {
    const bytes = execFileSync('git', ['show', `${BASELINE_COMMIT}:dist/${usage.selectedCatalog}`], {cwd: root, maxBuffer: 20 * 1024 * 1024});
    assert.equal(sha256(bytes), usage.catalogBytesSha256, usage.selectedCatalog);
    const catalog = JSON.parse(bytes.toString('utf8'));
    assert.equal(catalog.itemId, usage.itemId, usage.selectedCatalog);
    assert.ok(!catalog.collection || catalog.collection === usage.collection, usage.selectedCatalog);
    assert.equal(catalog.regions.length, usage.actualRegionCount, usage.selectedCatalog);
    assert.equal(catalog.regions.length, usage.declaredRegionCount, usage.selectedCatalog);
    assert.equal(new Set(catalog.regions.map(region => region.id)).size, catalog.regions.length, usage.selectedCatalog);
    regionCount += catalog.regions.length;
  }
  assert.equal(regionCount, baseline.selectedCatalogRegions.denominator);
  assert.equal(regionCount, 2564);
  assert.equal(baseline.selectedOwnerCatalogs.structurallyInvalid, 0, 'progression explainer uses its synthetic record id for schema validation');
  assert.equal(baseline.selectedCatalogRegions.structuralFlags.missingCropCoordinates, 0);
  assert.equal(baseline.sourceVisualCoverage.totals.regionUsages, 2640, 'existing geometry audit also includes legacy nonselected catalog usages');
  assert.equal(baseline.sourceVisualCoverage.selectedRegionUsageCount, 2564);
});

test('complete JSON Pointer tuple inventory has unique pointers and exhaustive classifications', () => {
  const {nodes, totalNodes, nodeClassificationCounts, codes} = baseline.jsonTree;
  assert.equal(nodes[0][0], '');
  const pointers = nodes.map(tuple => tuple[0]);
  assert.equal(new Set(pointers).size, pointers.length);
  for (const tuple of nodes) {
    assert.equal(tuple.length, 4);
    assert.ok(Number.isInteger(tuple[1]) && Object.values(codes.kind).includes(tuple[1]));
    assert.ok(Number.isInteger(tuple[2]) && Object.values(codes.semanticRole).includes(tuple[2]));
    assert.ok(Number.isInteger(tuple[3]) && Object.values(codes.classification).includes(tuple[3]));
  }
  assert.equal(Object.values(nodeClassificationCounts).reduce((sum, count) => sum + count, 0), totalNodes);
  assert.equal(baseline.recordPointers.length, baseline.collectionDenominator.exposedRecordCount);
});

test('semantic-review dimensions default to not-assessable over every content pointer', () => {
  const contentPointers = new Set(baseline.recordPointers.map(record => record.pointer));
  const contentNodes = baseline.jsonTree.nodes.filter(([pointer]) => [...contentPointers].some(recordPointer => pointer === recordPointer || pointer.startsWith(`${recordPointer}/`)));
  const universe = baseline.semanticReviewUniverse;
  assert.equal(universe.denominator, contentNodes.length);
  assert.equal(universe.pointerIndex.source, 'jsonTree.nodes');
  assert.ok(Object.values(universe.defaultDimensionStates).every(status => status === 'not-assessable'));
  assert.equal(universe.narrowerStructuredFieldTargetSubset.denominator, baseline.structuredFieldTargetCoverage.denominator);
  assert.match(universe.inventoryClassMeaning, /syntactic inventory categories/i);
  const metadataRoles = new Set([baseline.jsonTree.codes.semanticRole.metadata, baseline.jsonTree.codes.semanticRole['citation-metadata']]);
  const notAssessableCode = baseline.jsonTree.codes.classification['not-assessable'];
  assert.ok(contentNodes.filter(([, , role]) => metadataRoles.has(role)).every(([, , , classification]) => classification === notAssessableCode), 'metadata inventory classes do not imply semantic confirmation');
});

test('money-like string and structured price candidates preserve raw text, parses, pages and explicit unbound state', () => {
  const data = {
    rules: [{id: 'hireling-rules', title: 'Hirelings', book: 'PHB', pages: [52], text: 'A 2 gp monthly fee and 1 sp daily fee are listed; record 500 XP separately.', priceNote: 'A 2 gp monthly fee is listed; record 500 XP separately.', electrumNote: '1 electrum piece'}],
    spells: [],
    equipment: [{id: 'test-item', name: 'Test Item', book: 'PHB', pages: [35], price: {amount: 15, currency: 'gp'}, sourceExcerpts: {collection: 'equipment', catalog: 'scans/verified/equipment-test-item.json', regionCount: 0}}],
    matrices: [], classes: [],
  };
  const reader = file => {
    if (file === 'dist/scans/verified/equipment-test-item.json') return Buffer.from(JSON.stringify({collection: 'equipment', itemId: 'test-item', regions: [], sources: {}}));
    throw new Error(`fixture file unavailable: ${file}`);
  };
  const report = buildSystemicInventory(data, reader);
  const currencyText = report.moneyLikeProperties.claims.find(item => item.pointer === '/rules/0/text');
  const singleCurrencyText = report.moneyLikeProperties.claims.find(item => item.pointer === '/rules/0/priceNote');
  const electrumText = report.moneyLikeProperties.claims.find(item => item.pointer === '/rules/0/electrumNote');
  const price = report.moneyLikeProperties.claims.find(item => item.pointer === '/equipment/0/price');
  assert.ok(currencyText);
  assert.equal(currencyText.rawValue, 'A 2 gp monthly fee and 1 sp daily fee are listed; record 500 XP separately.');
  assert.equal(currencyText.parsedPrice, null, 'multiple currencies are retained without choosing one as the price');
  assert.deepEqual(currencyText.matchedCurrencyText, ['2 gp', '1 sp']);
  assert.deepEqual(currencyText.currencyMatchSpans.map(({start, end}) => [start, end]), [[2, 6], [23, 27]]);
  assert.deepEqual(currencyText.availableCitedSourcePages, [], 'route citations remain separate from field bindings');
  assert.ok(currencyText.routeRecordContextPages.some(page => page.book === 'PHB' && page.printedPage === 52));
  assert.ok(singleCurrencyText);
  assert.deepEqual(singleCurrencyText.parsedPrice, {amount: 2, currency: 'gp'}, 'a single currency token is parsed lexically while prose remains a candidate');
  assert.deepEqual(electrumText.parsedPrice, {amount: 1, currency: 'ep'});
  assert.deepEqual(electrumText.matchedCurrencyText, ['1 electrum piece']);
  assert.ok(price);
  assert.deepEqual(price.parsedPrice, {amount: 15, currency: 'gp'});
  assert.equal(price.sourceAssessability, 'source-pages-known-no-region-reference');
  assert.equal(price.targetRelation, 'not-bound');
  assert.deepEqual(parseExactPrice('20 gp'), {amount: 20, currency: 'gp'});
  assert.deepEqual(parseExactPrice('1 ep'), {amount: 1, currency: 'ep'});
  assert.deepEqual(parseExactPrice('1 electrum piece'), {amount: 1, currency: 'ep'});
  assert.deepEqual(parseExactPrice({amount: 1, currency: 'ep'}), {amount: 1, currency: 'ep'});
  assert.equal(parseExactPrice('2 gp-weight'), null);
  assert.equal(parseExactPrice({amount: null, currency: 'gp'}), null);
  assert.equal(parseExactPrice({amount: '', currency: 'gp'}), null);
  assert.equal(parseExactPrice({amount: 0, currency: 'gp'}).amount, 0, 'true numeric zero remains valid');
  assert.equal(parseExactPrice('1–2 gp'), null);
});

test('currency ranges remain unparsed candidates instead of becoming upper-end prices', () => {
  const data = {
    rules: [{id: 'range-claims', price: '60–80 gp', hyphenRange: '1-2 gp', proseRange: 'Cost ranges from 3 gp to 5 ep; another option is between 6 and 9 sp.'}],
    spells: [], equipment: [], matrices: [], classes: [],
  };
  const report = buildSystemicInventory(data, () => { throw new Error('no external files expected'); });
  for (const pointer of ['/rules/0/price', '/rules/0/hyphenRange', '/rules/0/proseRange']) {
    const claim = report.moneyLikeProperties.claims.find(item => item.pointer === pointer);
    assert.ok(claim, `range candidate ${pointer} is inventoried`);
    assert.equal(claim.parsedPrice, null, `${pointer} must not be reduced to its upper endpoint`);
    assert.equal(claim.auditClass, 'candidate');
    assert.equal(claim.rangeLike, true);
  }
  const prose = report.moneyLikeProperties.claims.find(item => item.pointer === '/rules/0/proseRange');
  assert.deepEqual(prose.matchedCurrencyText, ['3 gp', '5 ep', '9 sp']);
  assert.equal(parseExactPrice('60–80 gp'), null);
  assert.equal(parseExactPrice('1-2 gp'), null);
});

test('region identity resolves only in the selected source-owner catalog and keeps an empty JSON Pointer', () => {
  const binding = {
    collection: 'equipment', itemId: 'origin-item', fieldPointer: '',
    sourceOwner: {collection: 'equipment', itemId: 'source-item'},
    catalog: 'scans/verified/equipment-source-item.json', regionIds: ['shared-region'],
    book: 'PHB', printedPage: 35, reviewStatus: 'field-target-reviewed', sourceObjectPointer: '/fieldSources/price',
  };
  const data = {
    equipment: [
      {id: 'origin-item', book: 'PHB', pages: [35], fields: {price: '15 gp'}, sourceExcerpts: {collection: 'equipment', catalog: 'scans/verified/equipment-origin-item.json', regionCount: 1}, fieldSources: {price: {evidenceBindings: [binding]}}},
      {id: 'source-item', book: 'PHB', pages: [35], fields: {price: '15 gp'}, sourceExcerpts: {collection: 'equipment', catalog: 'scans/verified/equipment-source-item.json', regionCount: 1}},
    ],
    rules: [], spells: [], matrices: [], classes: [],
  };
  const makeCatalog = (itemId, regionIds) => Buffer.from(JSON.stringify({collection: 'equipment', itemId, regions: regionIds.map(id => ({id, book: 'PHB', printedPage: 35, pdfPage: 36, normalizedPageRect: [[0.1, 0.2, 0.3, 0.4]], focusRects: [[0, 0, 1, 1]]}))}));
  const reader = file => {
    if (file.endsWith('equipment-origin-item.json')) return makeCatalog('origin-item', ['shared-region']);
    if (file.endsWith('equipment-source-item.json')) return makeCatalog('source-item', ['different-region']);
    throw new Error(`fixture file unavailable: ${file}`);
  };
  const report = buildSystemicInventory(data, reader);
  const target = report.evidenceBindings.bindings[0];
  assert.equal(target.fieldPointer, '', 'empty pointer is an explicit record-level target');
  assert.equal(target.fieldPointerExists, true);
  assert.equal(target.sourceOwner.itemId, 'source-item');
  assert.equal(target.selectedOwnerCatalog, 'scans/verified/equipment-source-item.json');
  assert.equal(target.targetStatus, 'stale-or-unmapped-region-id');
  assert.equal(target.auditClass, 'confirmed');
  assert.equal(report.structuredFieldTargetCoverage.facts.find(fact => fact.itemId === 'origin-item').targetStatus, 'no-direct-field-binding');
  const geometry = report.selectedCatalogRegions.regions.find(region => region.regionId === 'different-region');
  assert.deepEqual(geometry.normalizedPageRect, {format: 'xywh-nested', values: [0.1, 0.2, 0.3, 0.4]});
  assert.equal(geometry.rawFullImageSentinelCount, 1);
  assert.equal(geometry.missingPreciseFocus, true);
});

test('target review does not confirm a money value; source-owner page joins retain every comparator segment', () => {
  const shared = 'scans/verified/equipment-source-owner.json';
  const routeCatalog = 'scans/verified/equipment-estimate.json';
  const bindings = [
    {collection: 'equipment', itemId: 'estimate', fieldPointer: '/suggestedPrice/comparisons/0', sourceObjectPointer: '/suggestedPrice/comparisons/0', sourceOwner: {collection: 'equipment', itemId: 'source-owner'}, catalog: shared, regionIds: ['source-p35'], book: 'PHB', printedPage: 35, reviewStatus: 'field-target-reviewed'},
    {collection: 'equipment', itemId: 'estimate', fieldPointer: '/suggestedPrice/comparisons/0', sourceObjectPointer: '/suggestedPrice/comparisons/0', sourceOwner: {collection: 'equipment', itemId: 'source-owner'}, catalog: shared, regionIds: ['shared-region'], book: 'PHB', printedPage: 36, reviewStatus: 'field-target-reviewed'},
  ];
  const data = {
    rules: [], spells: [], matrices: [], classes: [],
    equipment: [
      {id: 'estimate', book: 'PHB', pages: [35], suggestedPrice: {comparisons: [{text: '3 gp comparator amount', evidenceBindings: bindings}]}, sourceExcerpts: {collection: 'equipment', catalog: routeCatalog, regionCount: 1}},
      {id: 'source-owner', book: 'PHB', pages: [35, 36], sourceExcerpts: {collection: 'equipment', catalog: shared, regionCount: 2}, fields: {weight: '2 gp-weight'}, fieldSources: {weight: {evidenceBindings: [{collection: 'equipment', itemId: 'source-owner', fieldPointer: '/fields/weight', sourceObjectPointer: '/fieldSources/weight', catalog: shared, regionIds: ['source-p35'], book: 'PHB', printedPage: 35, reviewStatus: 'field-target-reviewed', sourceValueStatus: 'source-value-independently-confirmed'}]}}, price: {amount: 7, currency: 'gp', evidenceBindings: [{collection: 'equipment', itemId: 'source-owner', fieldPointer: '/price', sourceObjectPointer: '/price', catalog: shared, regionIds: ['shared-region'], book: 'PHB', printedPage: 36, reviewStatus: 'field-target-reviewed', sourceValueStatus: 'source-value-independently-confirmed', valueReview: {scope: 'equipment-printed-price', independent: true, expectedValue: {amount: 7, currency: 'gp', unit: null}}}]}}
    ],
  };
  const catalog = (itemId, regions) => Buffer.from(JSON.stringify({...catalogTemplate, itemId, regions: regions.map(([id, page]) => ({...structuredClone(catalogTemplate.regions[0]), id, book: 'PHB', printedPage: page, pdfPage: page + 1}))}));
  const reader = file => {
    if (file === `dist/${routeCatalog}`) return catalog('estimate', [['shared-region', 35]]);
    if (file === `dist/${shared}`) return catalog('source-owner', [['source-p35', 35], ['shared-region', 36]]);
    throw new Error(`fixture file unavailable: ${file}`);
  };
  const report = buildSystemicInventory(data, reader);
  const estimate = report.moneyLikeProperties.claims.find(item => item.pointer === '/equipment/0/suggestedPrice/comparisons/0/text');
  assert.ok(estimate);
  assert.equal(estimate.auditClass, 'candidate', 'target-location review is not source-value review');
  assert.equal(estimate.valueReviewStatus, 'no-independent-source-value-status');
  assert.equal(estimate.sourceBindingResults.length, 2, 'all matching page-specific bindings are preserved');
  assert.deepEqual(estimate.availableCitedSourcePages.map(page => page.printedPage).sort(), [35, 36]);
  assert.deepEqual(estimate.candidateRegionRefs.map(ref => [ref.ownerKey, ref.regionId, ref.printedPage]), [['equipment:source-owner', 'source-p35', 35], ['equipment:source-owner', 'shared-region', 36]]);
  assert.deepEqual(estimate.routeRecordContextPages.map(page => page.printedPage), [35]);
  assert.ok(estimate.candidateRegionRefs.every(ref => ref.ownerKey === 'equipment:source-owner'), 'same-named route-owner region must not join to the source binding');
  const weight = report.moneyLikeProperties.claims.find(item => item.pointer === '/equipment/1/fields/weight');
  const confirmedPrice = report.moneyLikeProperties.claims.find(item => item.pointer === '/equipment/1/price');
  assert.equal(weight.auditClass, 'candidate', 'a reviewed target for a gp-weight does not confirm a monetary value');
  assert.equal(weight.valueReviewStatus, 'no-independent-source-value-status');
  assert.equal(weight.candidateKind, 'nonmonetary-encumbrance-text');
  assert.equal(weight.monetaryInterpretation, 'nonmonetary-encumbrance');
  assert.equal(weight.parsedPrice, null);
  assert.deepEqual(weight.encumbranceUnitMatches.map(match => match.text), ['2 gp-weight']);
  assert.equal(confirmedPrice.auditClass, 'confirmed');
  assert.equal(confirmedPrice.valueReviewStatus, 'source-value-independently-confirmed');

  const statusOnlyData = structuredClone(data);
  delete statusOnlyData.equipment[1].price.evidenceBindings[0].valueReview;
  const statusOnlyReport = buildSystemicInventory(statusOnlyData, reader);
  const statusOnlyPrice = statusOnlyReport.moneyLikeProperties.claims.find(item => item.pointer === '/equipment/1/price');
  assert.equal(statusOnlyPrice.auditClass, 'candidate', 'a sourceValueStatus string without the independent expected-value snapshot cannot confirm a price');
  assert.equal(statusOnlyPrice.valueReviewStatus, 'source-value-review-snapshot-missing');
});

test('changed live equipment price cannot reuse an independent review snapshot for the old value', () => {
  const assembled = JSON.parse(readFileSync(new URL('../dist/data.json', import.meta.url), 'utf8'));
  const original = structuredClone(assembled.equipment.find(item => item.id === 'phb-banded-mail'));
  assert.deepEqual(original.price.evidenceBindings[0].valueReview.expectedValue, {amount: 90, currency: 'gp', unit: null});
  const inspect = item => {
    const data = {rules: [], spells: [], equipment: [item], matrices: [], classes: []};
    const report = buildSystemicInventory(data, file => readFileSync(path.join(root, file)));
    return report.moneyLikeProperties.claims.find(claim => claim.pointer === '/equipment/0/price');
  };
  const originalClaim = inspect(original);
  assert.equal(originalClaim.valueReviewStatus, 'source-value-independently-confirmed', 'the unchanged 90 gp source snapshot still confirms');
  const driftedAmount = structuredClone(original);
  driftedAmount.price.amount = 1089;
  const claim = inspect(driftedAmount);
  assert.equal(claim.rawValue.amount, 1089);
  assert.equal(claim.valueReviewStatus, 'source-value-review-snapshot-mismatch');
  assert.equal(claim.auditClass, 'candidate');
  assert.equal(claim.valueReviewSnapshotDrift[0].expected.amount, 90);
  assert.equal(claim.valueReviewSnapshotDrift[0].actual.amount, 1089);
  assert.deepEqual(claim.valueReviewSnapshotDrift[0].mismatchFields, ['amount']);

  const driftedCurrency = structuredClone(original);
  driftedCurrency.price.currency = 'sp';
  assert.deepEqual(inspect(driftedCurrency).valueReviewSnapshotDrift[0].mismatchFields, ['currency']);
  const driftedUnit = structuredClone(original);
  driftedUnit.price.unit = 'per bundle';
  assert.deepEqual(inspect(driftedUnit).valueReviewSnapshotDrift[0].mismatchFields, ['unit']);
});

test('explicit extraction gaps stay pending while confirmed broken source-object joins fail the structural gate', () => {
  const catalogPath = 'scans/verified/equipment-binding-fixture.json';
  const pendingData = {
    rules: [], spells: [], matrices: [], classes: [],
    equipment: [{id: 'binding-fixture', sourceExcerpts: {collection: 'equipment', catalog: catalogPath, regionCount: 1}, fieldSources: {missing: {evidenceBindings: [{collection: 'equipment', itemId: 'binding-fixture', fieldPointer: '/fields/Not extracted', sourceObjectPointer: '/fieldSources/missing', valuePathStatus: 'value-path-missing', reviewStatus: 'unextracted-gap', book: 'PHB', printedPage: 35, catalog: catalogPath, regionIds: []}]}}}],
  };
  const reader = file => file === `dist/${catalogPath}` ? fixtureCatalog('binding-fixture') : (() => { throw new Error(`fixture file unavailable: ${file}`); })();
  const pending = buildSystemicInventory(pendingData, reader);
  const binding = pending.evidenceBindings.bindings[0];
  assert.equal(binding.targetStatus, 'value-path-missing-pending-extraction');
  assert.equal(binding.auditClass, 'candidate');
  assert.deepEqual(binding.structuralIssues, []);
  assert.equal(pending.structuralValidation.valid, true, 'explicit pending extraction is not structural corruption');
  assert.equal(pending.semanticReviewUniverse.scopedOverrides.extractionAndValueStatuses.bindings[0].valuePathStatus, 'value-path-missing');

  const brokenData = {
    rules: [], spells: [], matrices: [], classes: [],
    equipment: [{id: 'binding-fixture', fields: {Price: '4 gp'}, sourceExcerpts: {collection: 'equipment', catalog: catalogPath, regionCount: 1}, fieldSources: {Price: {evidenceBindings: [{collection: 'equipment', itemId: 'binding-fixture', fieldPointer: '/fields/Price', catalog: catalogPath, regionIds: ['fixture-region'], book: 'PHB', printedPage: 35, reviewStatus: 'field-target-reviewed'}]}, noPointer: {evidenceBindings: [{collection: 'equipment', itemId: 'binding-fixture', sourceObjectPointer: '/fieldSources/noPointer', catalog: catalogPath, regionIds: ['fixture-region'], book: 'PHB', printedPage: 35, reviewStatus: 'field-target-reviewed'}]}}}],
  };
  const broken = buildSystemicInventory(brokenData, reader);
  assert.equal(broken.structuralValidation.valid, false);
  assert.ok(broken.structuralValidation.failures.some(failure => failure.code === 'source-object-pointer-missing'));
  assert.ok(broken.structuralValidation.failures.some(failure => failure.code === 'field-pointer-missing'));
});

test('source object pointer must identify the attached semantic source object, with root and alias pointers supported', () => {
  const catalogPath = 'scans/verified/equipment-binding-fixture.json';
  const makeBinding = overrides => ({collection: 'equipment', itemId: 'binding-fixture', fieldPointer: '/fields/armor', sourceObjectPointer: '/fieldSources/armor', catalog: catalogPath, regionIds: ['fixture-region'], book: 'PHB', printedPage: 35, reviewStatus: 'field-target-reviewed', ...overrides});
  const reader = file => file === `dist/${catalogPath}` ? fixtureCatalog('binding-fixture') : (() => { throw new Error(`fixture file unavailable: ${file}`); })();
  const wrongData = {
    rules: [], spells: [], matrices: [], classes: [],
    equipment: [{id: 'binding-fixture', fields: {armor: 'Banded Mail', wrong: {value: 'Long Sword'}}, sourceExcerpts: {collection: 'equipment', catalog: catalogPath, regionCount: 1}, fieldSources: {armor: {evidenceBindings: [makeBinding({sourceObjectPointer: '/fields/wrong'})]}}}],
  };
  const wrong = buildSystemicInventory(wrongData, reader);
  assert.equal(wrong.structuralValidation.valid, false, 'an existing but unrelated object cannot satisfy source-object identity');
  assert.ok(wrong.structuralValidation.failures.some(failure => failure.code === 'source-object-pointer-mismatch'));

  const validData = {
    rules: [], spells: [], matrices: [], classes: [],
    equipment: [{id: 'binding-fixture', fields: {armor: 'Banded Mail'}, sourceExcerpts: {collection: 'equipment', catalog: catalogPath, regionCount: 1}, fieldSources: {armor: {evidenceBindings: [makeBinding()]}}}],
  };
  const valid = buildSystemicInventory(validData, reader);
  assert.equal(valid.structuralValidation.valid, true, 'semantic fieldPointer and attached sourceObjectPointer may be distinct');
  assert.equal(valid.evidenceBindings.bindings[0].sourceObjectPointerMatchesAttachment, true);

  const scalarPointerData = {
    rules: [], spells: [], matrices: [], classes: [],
    equipment: [{id: 'binding-fixture', fields: {armor: 'Banded Mail'}, sourceExcerpts: {collection: 'equipment', catalog: catalogPath, regionCount: 1}, fieldSources: {armor: {evidenceBindings: [makeBinding({sourceObjectPointer: '/fields/armor'})]}}}],
  };
  const scalarPointer = buildSystemicInventory(scalarPointerData, reader);
  assert.ok(scalarPointer.structuralValidation.failures.some(failure => failure.code === 'source-object-pointer-not-structured'));

  const rootBinding = makeBinding({fieldPointer: '', sourceObjectPointer: '', regionIds: ['fixture-region']});
  const rootData = {
    rules: [], spells: [], matrices: [], classes: [],
    equipment: [{id: 'binding-fixture', evidenceBindings: [rootBinding], sourceExcerpts: {collection: 'equipment', catalog: catalogPath, regionCount: 1}}],
  };
  const rootReport = buildSystemicInventory(rootData, reader);
  assert.equal(rootReport.structuralValidation.valid, true, 'a record-level binding may be attached to and point at the record root');
  assert.equal(rootReport.evidenceBindings.bindings[0].sourceObjectPointerMatchesAttachment, true);
});

test('region and money classification denominators remain explicit in every report', () => {
  for (const report of [baseline]) {
    assert.equal(report.jsonTree.nodeClassificationDenominator, report.jsonTree.totalNodes);
    assert.equal(Object.values(report.evidenceBindings.classification).reduce((sum, count) => sum + count, 0), report.evidenceBindings.denominator);
    assert.equal(Object.values(report.structuredFieldTargetCoverage.classification).reduce((sum, count) => sum + count, 0), report.structuredFieldTargetCoverage.denominator);
    assert.equal(Object.values(report.moneyLikeProperties.claimsByClassification).reduce((sum, count) => sum + count, 0), report.moneyLikeProperties.denominator);
    assert.equal(report.contextRegionCoverage.annotated + report.contextRegionCoverage.notAssessable, report.contextRegionCoverage.denominator);
    assert.match(report.limitations.join(' '), /not-assessable, not passed/i);
  }
});

test('nested source-page rectangle shapes retain their normalized coordinate values', () => {
  assert.deepEqual(normalizeRect([[0.1, 0.2, 0.3, 0.4]]), {format: 'xywh-nested', values: [0.1, 0.2, 0.3, 0.4]});
  assert.deepEqual(normalizeRect({x: 0.1, y: 0.2, w: 0.3, h: 0.4}), {format: 'xywh', values: [0.1, 0.2, 0.3, 0.4]});
});

test('compact full-report hash declares the bytes it covers without changing historical baseline metadata', () => {
  const report = {node: 'fixture', count: 2};
  const metadata = fullReportHashMetadata(report);
  assert.equal(metadata.sha256, sha256(Buffer.from(JSON.stringify(report))));
  assert.equal(metadata.hashFormat, FULL_REPORT_HASH_FORMAT);
  assert.equal(FULL_REPORT_HASH_FORMAT, 'sha256-utf8-json-stringify-no-trailing-newline');
  assert.equal(baseline.fullReport.sha256, 'b53b2973e9cd89f7f72aa8d620788bfc21e889620a5c83efec49039b8a5aec78');
  assert.equal(baseline.fullReport.hashFormat, undefined, 'the pinned historical artifact is not rewritten to add new metadata');
});

test('systemic visual projection retains sentinel scope and distinct bounded price denominators', () => {
  const sentinelPolicy = {
    historicalHighlightExceptionDenominator: 154,
    historicalExceptionsNeedingScopeReview: 152,
    historicalExceptionsWithExplicitWholeSpellScope: 2,
    explicitWholeSpellExceptions: 2,
    factFocus: {fieldEvidenceBindingDenominator: 3, factFocusPending: 2},
  };
  const priceInventory = {
    scope: 'Bounded named inventories; not exhaustive.',
    sourceRowCount: 710,
    sourceTableDenominatorCount: 8,
    siteClaimCount: 189,
    siteClaimDenominator: 189,
    pageCensusPageCount: 776,
    sourcePageCensuses: [{id: 'PHB'}, {id: 'UA'}, {id: 'monster-books'}],
    siteClaimStates: {'field-target-reviewed': 185, 'unextracted-gap': 4},
    siteClaimTargetBindingDenominator: 185,
    siteClaimTargetStatuses: {'field-target-reviewed': 185},
    printedPriceEvidenceBindingDenominator: 185,
    printedPriceSourceValueStatuses: {'source-value-independently-confirmed': 185},
    estimateOverlap: {editorialEstimateCount: 4, editorialEstimatesWithinPriceGapObjects: 4, priceGapObjectDenominator: 4},
    validation: {valid: true, errors: []},
  };
  const report = {
    usages: [
      {viewerSelected: true, collection: 'spells', itemId: 'fireball', regionId: 'full', sentinelPolicyStatus: 'explicit-whole-spell-unmarked-exception', status: {highlight: 'exception'}},
      {viewerSelected: false, collection: 'equipment', itemId: 'mail', regionId: 'legacy', sentinelPolicyStatus: 'unresolved-full-image-sentinel'},
    ],
    sentinelPolicy,
    priceInventory,
  };
  const summary = projectVisualCoverageSummary(report);
  assert.deepEqual(summary.sentinelPolicy, sentinelPolicy);
  assert.equal(summary.sentinelPolicy.historicalExceptionsNeedingScopeReview, 152);
  assert.equal(summary.sentinelPolicy.explicitWholeSpellExceptions, 2);
  assert.equal(summary.selectedRegionReviewStatuses.length, 1);
  assert.equal(summary.selectedRegionReviewStatuses[0].sentinelPolicyStatus, 'explicit-whole-spell-unmarked-exception');
  assert.equal(summary.priceInventory.sourceRowCount, 710);
  assert.equal(summary.priceInventory.sourceTableDenominatorCount, 8);
  assert.equal(summary.priceInventory.siteClaimCount, 189);
  assert.equal(summary.priceInventory.siteClaimTargetBindingDenominator, 185);
  assert.deepEqual(summary.priceInventory.siteClaimTargetStatuses, {'field-target-reviewed': 185});
  assert.equal(summary.priceInventory.pageCensusPageCount, 776);
  assert.equal(summary.priceInventory.sourcePageCensuses.length, 3);
  assert.deepEqual(summary.priceInventory.estimateOverlap, priceInventory.estimateOverlap);
  assert.deepEqual(summary.priceInventory.printedPriceSourceValueStatuses, priceInventory.printedPriceSourceValueStatuses);
  assert.equal(summary.priceInventory.validation.valid, true);
  assert.equal(summary.priceInventory.denominatorPolicy.exhaustive, false);
  assert.match(summary.priceInventory.denominatorPolicy.siteClaims, /do not independently confirm printed values/i);
});

test('CI summary surfaces sentinel policy, target/value separation, bounded price units, and unavailable baseline source', () => {
  const emptyReport = () => ({
    collectionDenominator: {exposedRecordCount: 1},
    jsonTree: {totalNodes: 1, scalarLeaves: 1, nodeClassificationCounts: {}},
    citationObjects: {denominator: 1},
    pageTargets: {denominator: 1},
    evidenceBindings: {denominator: 1, classification: {}},
    selectedOwnerCatalogs: {denominator: 1},
    selectedCatalogRegions: {denominator: 1},
    moneyLikeProperties: {denominator: 1, claimsByClassification: {}},
    contextualCoverage: {annotatedRequirements: 0, requirementOutcomeCounts: {}},
    continuationCoverage: {knownGroups: 0, knownSegments: 0},
    qualifierCoverage: {manuallyAnnotatedCases: 0},
    structuralValidation: {valid: true, confirmedFailureCount: 0, unresolvedCount: 0},
  });
  const baselineReport = {...emptyReport(), sourceVisualCoverage: {priceInventory: null, priceInventoryInput: {available: false, error: 'Git blob is absent: 13783128:research/price-source-inventory.json'}}};
  const currentReport = {
    ...emptyReport(),
    sourceVisualCoverage: {
      sentinelPolicy: {
        unresolvedHighlightWarnings: 2243,
        rawFullImageSentinelBindings: 2245,
        historicalExceptionsNeedingScopeReview: 152,
        historicalHighlightExceptionDenominator: 154,
        explicitWholeSpellExceptions: 2,
        factFocus: {fieldTargetReviewed: 209, fieldEvidenceBindingDenominator: 4260, factFocusPending: 4051},
      },
      priceInventory: {
        sourceRowCount: 710,
        sourceTableDenominatorCount: 8,
        siteClaimCount: 189,
        siteClaimDenominator: 189,
        siteClaimTargetBindingDenominator: 185,
        siteClaimTargetStatuses: {'field-target-reviewed': 185},
        printedPriceEvidenceBindingDenominator: 185,
        printedPriceSourceValueStatuses: {'source-value-independently-confirmed': 185},
        pageCensusPageCount: 776,
        sourcePageCensuses: [{}, {}, {}],
        estimateOverlap: {editorialEstimateCount: 4, editorialEstimatesWithinPriceGapObjects: 4, priceGapObjectDenominator: 4},
        validation: {valid: true},
      },
    },
  };
  const markdown = renderSummaryMarkdown(baselineReport, currentReport, []);
  const lines = markdown.split('\n');
  const sentinelLine = lines.find(line => line.startsWith('- Current sentinel policy:'));
  const priceLine = lines.find(line => line.startsWith('- Current bounded price inventory:'));
  assert.ok(sentinelLine);
  assert.ok(priceLine);
  assert.ok(lines.indexOf(sentinelLine) < 35, 'sentinel policy is visible in the compact CI summary');
  assert.ok(lines.indexOf(priceLine) < 35, 'denominator policy is visible in the compact CI summary');
  assert.match(sentinelLine, /152 \/ 154 historical exceptions need scope review; 2 explicit whole-spell exceptions/);
  assert.match(sentinelLine, /209 \/ 4260 reviewed, 4051 pending/);
  assert.match(priceLine, /710 source rows \/ 8 named inventories; 189 \/ 189 site objects; 185 target bindings; 185 printed-price value bindings; 776 PDF pages \/ 3 censuses/);
  assert.match(priceLine, /Target statuses \{"field-target-reviewed":185\}; source-value statuses \{"source-value-independently-confirmed":185\}/);
  assert.match(priceLine, /bounded, not exhaustive/);
  assert.match(lines.find(line => line.startsWith('- Pinned-baseline price inventory:')), /absent from the pinned Git commit/);
});

test('known pre-repair source and route failures remain represented in the regression fixtures', () => {
  const contextIds = new Set(calibration.contextContainmentCases.map(item => item.id));
  assert.ok(contextIds.has('arrow-single-price-requires-arms-table'));
  assert.ok(contextIds.has('long-sword-price-requires-arms-table'));
  assert.ok(contextIds.has('aklys-stat-row-requires-weapon-table'));
  const arrow = calibration.contextContainmentCases.find(item => item.id === 'arrow-single-price-requires-arms-table');
  assert.equal(arrow.candidates.find(candidate => candidate.id === 'baseline-single-row').expected, 'does-not-contain');
  const proficiency = calibration.wholeNoteOmissionCases.find(item => item.id === 'assassin-phb37-proficiency-interval-note');
  assert.equal(proficiency.candidates.find(candidate => candidate.id === 'intermediate-proposed-width').expected, 'does-not-contain');
  assert.ok(calibration.clippingCases.some(item => item.id === 'animate-object-phb51-right-edge-words'));
  assert.equal(calibration.clippingCases.find(item => item.id === 'assassin-phb28-bottom-row-words').expectedOldCrossingCount, 12);
  assert.equal(calibration.qualifierFocusCases[0].id, 'holy-water-asterisk-qualifier-focus');
  assert.equal(navigationCoverage.preservedPreFixFailureFixture.id, 'bo-stick-comparator-origin-field-target-reload');
  assert.equal(navigationCoverage.preservedPreFixFailureFixture.targetProjection.sourceOwnerDropped, true);
});
