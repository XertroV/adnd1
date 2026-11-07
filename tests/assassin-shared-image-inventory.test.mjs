import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {collectCatalogPropertyPointers} from '../tools/assassin-shared-image-inventory.mjs';

const root = resolve(import.meta.dirname, '..');

test('shared-image inventory distinguishes route catalogs, generated binding pointers and field properties', () => {
  const data = {
    equipment: [{
      id: 'route-item',
      sourceExcerpts: {catalog: 'scans/route-item.json'},
      scanVerification: {catalog: 'scans/legacy-item.json'},
      fields: {price: 10},
      fieldSources: {
        price: {
          book: 'PHB',
          pages: [19],
          evidenceBindings: [{
            collection: 'equipment',
            itemId: 'source-owner',
            fieldPointer: '/price',
            catalog: 'scans/generated-source-owner.json',
            sourceOwner: {collection: 'equipment', itemId: 'source-owner'},
          }],
        },
      },
    }],
  };

  const {pointers, propertyPointers} = collectCatalogPropertyPointers(data);
  assert.deepEqual(pointers.map(({propertyPointer, pointerKind}) => [propertyPointer, pointerKind]), [
    ['/sourceExcerpts/catalog', 'viewer-selected-source-catalog'],
    ['/scanVerification/catalog', 'nonselected-source-catalog'],
    ['/fieldSources/price/evidenceBindings/0/catalog', 'generated-field-binding-catalog'],
  ]);
  assert.deepEqual(pointers[2].routeOwner, {collection: 'equipment', itemId: 'route-item'});
  assert.deepEqual(pointers[2].sourceOwner, {collection: 'equipment', itemId: 'source-owner'});
  assert.equal(pointers[2].viewerSelectedCatalogForRoute, 'scans/route-item.json');
  assert.equal(pointers[2].viewerSelectedCatalogForSourceOwner, null);
  assert.deepEqual(propertyPointers.map(({fieldPointer, book, printedPages}) => [fieldPointer, book, printedPages]), [
    ['/fields/price', 'PHB', [19]],
  ]);
});

test('pinned/current shared-image census retains full denominators and explicit dispositions', () => {
  const summary = JSON.parse(readFileSync(resolve(root, 'research/assassin-shared-image-inventory-summary.json'), 'utf8'));
  const compressed = readFileSync(resolve(root, 'research/assassin-shared-image-inventory.json.gz'));
  assert.equal(createHash('sha256').update(compressed).digest('hex'), summary.sourceGzipSha256);
  const report = JSON.parse(gunzipSync(compressed).toString('utf8'));
  assert.equal(report.baselineCommit, '13783128ca5955ac707ed7ec6994d78d7c9a7cce');
  for (const key of ['immutableBaseline', 'current']) {
    const snapshot = report.snapshots[key];
    assert.equal(snapshot.denominator.uniqueCatalogPaths, 940);
    assert.equal(snapshot.denominator.catalogsLoaded, 940);
    assert.deepEqual(snapshot.denominator.missingCatalogPaths, []);
    assert.equal(snapshot.denominator.propertyCitationPointers, 3182);
    assert.equal(snapshot.denominator.propertyCitationPageReferences, 4113);
    assert.equal(snapshot.catalogPaths.length, 940);
    assert.equal(snapshot.catalogPointers.length, snapshot.denominator.catalogPointerOccurrences);
    assert.equal(snapshot.catalogRegionUsages.length, snapshot.denominator.uniqueCatalogRegionBindings);
    assert.equal(snapshot.propertyPointers.length, snapshot.denominator.propertyCitationPointers);
    for (const issue of snapshot.issueSets) {
      assert.equal(issue.sameSourcePageRegionUseCount, issue.otherSamePageRegionUses.length + issue.candidateRegionUseCount);
      assert.equal(issue.sameSourcePagePropertyPointerCount, issue.sourcePagePropertyPointers.length);
      for (const property of issue.sourcePagePropertyPointers) assert.ok(['candidate', 'excluded', 'uncertain'].includes(property.disposition));
    }
  }
  assert.deepEqual(report.snapshots.immutableBaseline.denominator.catalogPointerKinds, {
    'viewer-selected-source-catalog': 920,
    'nonselected-source-catalog': 20,
  });
  assert.deepEqual(report.snapshots.current.denominator.catalogPointerKinds, {
    'viewer-selected-source-catalog': 920,
    'generated-field-binding-catalog': 662,
    'nonselected-source-catalog': 20,
  });
  const p19 = report.snapshots.current.issueSets.find(issue => issue.id === 'assassin-phb-19-scroll-reading-footnote');
  const p37 = report.snapshots.current.issueSets.find(issue => issue.id === 'assassin-phb-37-proficiency-interval-note');
  assert.equal(p19.sameSourcePagePropertyPointerCount, 119);
  assert.equal(p37.sameSourcePagePropertyPointerCount, 178);
  assert.ok(p19.candidateRegionUses.some(use => use.normalizedPageRect));
});

test('frozen Assassin recipe records exact ordered same-page source segments without inheriting approval', () => {
  const recipe = JSON.parse(readFileSync(resolve(root, 'research/assassin-context-recipe-review.json'), 'utf8'));
  assert.equal(recipe.status, 'independent-source-crop-review-confirmed; context-crops-applied; focus/value-review-pending');
  assert.equal(recipe.identity.source.sha256, 'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095');
  assert.equal(recipe.recipe.length, 5);
  const p33 = recipe.recipe.filter(entry => entry.source.printedPage === 33);
  assert.deepEqual(p33.map(entry => entry.regionId), ['phb-33-6fe233ecf3bcfa40', 'phb-33-7d2eca37ce27b8e']);
  assert.deepEqual(p33.map(entry => entry.sourceBounds.values), [[17.467, 303, 290, 747.2], [302, 28, 571, 110]]);
  assert.equal(recipe.consumerDisposition.p19ScrollFootnote.directlyRelevantFieldPointers[0], 'classes:assassin /levelChanges/35');
  assert.equal(recipe.consumerDisposition.p37AddedProficiency.directlyRelevantCoreClassProperties, 49);
  assert.equal(recipe.visualReview.independentReview.status, 'approved-source-image-content-and-bounds');
  assert.equal(recipe.applicationMap.totalAssassinRegionCountDelta, 3);
  assert.equal(recipe.applicationMap.totalSourceCatalogRegionCountDelta, 23);
  assert.equal(recipe.sharedSourceCropRepairs[0].catalogs.length, 2);
  assert.equal(recipe.sharedSourceCropRepairs[1].catalogs.length, 10);
});
