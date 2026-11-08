import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const json = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fileSha = relative => sha(fs.readFileSync(path.join(root, relative)));
const receipt = json('research/source-audit-batch5-ua10-ua69-crop-repair.json');
const before = json('tests/fixtures/continuation-ua10-ua69-crops-before.json');
const fullBaseline = json('research/source-audit-batch5-active-legacy-crop-baseline.json');

function catalog(relative) {
  const fullPath = path.join(root, relative);
  return {raw: fs.readFileSync(fullPath), value: JSON.parse(fs.readFileSync(fullPath, 'utf8'))};
}

test('three confirmed crop defects and one related stable link are rebound to existing canonical recipes with history preserved', () => {
  assert.equal(fullBaseline.catalogRegionDenominator, 3050);
  assert.equal(fullBaseline.notAssessableGeometry, 189);
  assert.equal(fullBaseline.input.gitCommit, '679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.deepEqual(fullBaseline.cases.map(item => item.regionId).sort(), [
    'ua-10-46ba4e69b0474ea1',
    'ua-69-29065a55e88e8ad4',
    'ua-69-7ceb51358e10f81e',
  ]);
  assert.equal(receipt.status, 'four-stable-id-recipes-independent-crop-context-relevance-pass-highlight-unassessed');
  assert.equal(fileSha(receipt.baseline.path), receipt.baseline.sha256);
  assert.equal(before.id, 'ua10-ua69-legacy-crop-recipe-before');
  assert.equal(before.baseline.fullCurrentRegionRows, 3050);
  assert.equal(receipt.afterGeometryAudit.regionUsages, 3053);
  assert.deepEqual(receipt.afterGeometryAudit.bindingGeometryCandidates.map(item => [item.regionId, item.edgeCrossingCount]), [
    ['ua-69-29065a55e88e8ad4', 1],
    ['ua-69-7ceb51358e10f81e', 4],
    ['ua-10-46ba4e69b0474ea1', 0],
    ['ua-10-d3cdc07db7c18a50', 1],
  ]);
  assert.equal(receipt.afterGeometryAudit.supersededWrongSummary.status, 'superseded-invalid-candidate-lookup');
  assert.ok(receipt.afterGeometryAudit.supersededWrongSummary.reason.includes('candidate.usages[].regionId'));
  assert.ok(receipt.afterGeometryAudit.bindingGeometryCandidates.every(item => item.sourcePixelAdjudication === 'independent-pass-no-glyph-clipping'));
  assert.equal(receipt.independentPixelReview.status, 'pass-for-exact-source-image-focus-content-and-catalog-bindings');
  assert.equal(receipt.independentPixelReview.sha256, '85da98a48c0c7f8046a630c8af59db66914419d7bb76f2da7efe5560f56984a0');
  assert.equal(receipt.independentPixelReview.summary.rawTextLayerCrossings, 6);
  assert.equal(receipt.independentPixelReview.summary.confirmedInkClipping, 0);
  assert.equal(receipt.independentPixelReview.summary.fullImageExceptionsApproved, 0);
  assert.equal(receipt.independentPixelReview.summary.fieldValuesPromoted, 0);
  assert.ok(receipt.independentPixelReview.bindings.every(binding => binding.assessments.crop === 'confirmed' && binding.assessments.context === 'confirmed' && binding.assessments.relevance === 'confirmed' && binding.assessments.highlight === 'unassessed'));

  for (const catalogReceipt of receipt.catalogs) {
    const current = catalog(catalogReceipt.path);
    assert.equal(sha(current.raw), catalogReceipt.afterSha256, catalogReceipt.path);
    for (const change of catalogReceipt.repairs) {
      const region = current.value.regions.find(candidate => candidate.id === change.id);
      assert.ok(region, `${catalogReceipt.path} preserves ${change.id}`);
      assert.equal(region.image, change.image);
      assert.equal(region.sha256, change.sha256);
      assert.deepEqual(region.normalizedPageRect, change.normalizedPageRect);
      const canonical = current.value.regions.find(candidate => candidate.id === change.canonicalId)
        || json('dist/scans/verified/spells-ua-illusionist-solid-fog.json').regions.find(candidate => candidate.id === change.canonicalId);
      assert.ok(canonical, `reviewed canonical recipe ${change.canonicalId} is available`);
      assert.equal(region.width, canonical.width);
      assert.equal(region.height, canonical.height);
      assert.deepEqual(region.focusRects, before.catalogs.flatMap(item => item.regions).find(old => old.id === change.id).focusRects, `${change.id} retains its focus rectangles`);
    }
  }

  for (const [file, expected] of Object.entries(receipt.preserve.legacyPngSha256)) {
    assert.equal(fileSha(`dist/scans/verified/${file}`), expected, `${file} remains preserved byte-for-byte`);
  }
  for (const [label, expected] of Object.entries(receipt.canonicalRecipes)) {
    const sourceCatalog = label.startsWith('ua10')
      ? catalog('dist/scans/verified/rules-ua-elven-subrace-adjustments.json').value
      : json('dist/scans/verified/spells-ua-illusionist-solid-fog.json');
    const region = sourceCatalog.regions.find(candidate => candidate.id === expected.regionId);
    assert.ok(region, `${label} resolves to a retained reviewed region`);
    assert.equal(fileSha(`dist/scans/verified/${region.image}`), expected.imageSha256, `${label} remains the exact reviewed image`);
  }

  const deathFog = catalog('dist/scans/verified/spells-ua-illusionist-death-fog.json').value;
  const opening = deathFog.regions.find(region => region.id === 'ua-69-29065a55e88e8ad4');
  const continuation = deathFog.regions.find(region => region.id === 'ua-69-7ceb51358e10f81e');
  const duplicate = deathFog.regions.find(region => region.id === 'ua-69-b8b05ef9807ad0f8');
  assert.match(opening.alt, /Solid Fog.*related context.*not Death Fog text/);
  assert.match(continuation.alt, /Solid Fog.*related context.*not Death Fog text/);
  assert.match(duplicate.alt, /^Solid Fog/);
  assert.equal(receipt.preserve.sharedManifestChanged, false);
  assert.equal(receipt.preserve.sourceFieldGradesChanged, false);
  assert.equal(receipt.preserve.refsChanged, false);
});

