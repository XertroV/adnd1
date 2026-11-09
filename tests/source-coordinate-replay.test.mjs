import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const receipt = JSON.parse(readFileSync(path.join(root, 'research/source-audit-pass8-frame-replay.json'), 'utf8'));

test('source-frame receipt pins the current tree and separates raw bytes from canonical data hash', () => {
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.inputCommit, '6d330af372ac809d11ed6029ed8695d0d8dc0909');
  assert.equal(receipt.input.rawDistDataSha256, 'ceb7c8b9a8fe32b676e57c8d007f124a4490684d54558479e555d504075ba4f3');
  assert.equal(receipt.input.canonicalParsedDistDataObjectSha256, '52c405720f28aa665786c38692b2141ce598e3a9d3031555e17020d2f86ca957');
  assert.equal(receipt.input.sourceVisualCoverageInputDataSha256, receipt.input.canonicalParsedDistDataObjectSha256);
  assert.equal(receipt.sourceArtifactsPreserved, true);
  assert.equal(receipt.catalogDataOrReviewFlagChanges, 0);
});

test('current source-frame denominators and exact recipe outcomes stay distinct from historical membership', () => {
  assert.deepEqual(receipt.denominators, {
    catalogFiles: 1020,
    currentCatalogRegionRows: 3396,
    currentOwnerUsesAcrossData: 3399,
    frozenV1RedundantLocatorCandidateRows: 740,
    frozenV1CandidateOwnerUses: 743,
    additionalExplicitFrameRowsOutsideV1CandidateSet: 51,
    otherCurrentRegionRowsOutsideThesePixelReplayCohorts: 2605,
    historicalUnknownFrameMemberCensus: {
      reportedHistoricalDenominator: 726,
      membershipStatus: 'unavailable in the current archival path; not individually closed by this current replay',
    },
  });
  assert.deepEqual(receipt.currentReplay.candidateFrameResultsByRecipeFamily, {
    'direct-exact-pdf-clip': 654,
    'full-page-poppler-raster-then-PIL-crop': 68,
    'full-page-pymupdf-raster-crop': 16,
    'supplement-source-jpeg-pil-crop-not-pdf': 2,
  });
  assert.equal(receipt.currentReplay.candidateUnresolvedCoordinateFrameRows, 0);
  assert.equal(receipt.currentReplay.currentSourceGeometryNotMeaningApproval, true);
  assert.equal(receipt.unassessed[1].count, 726);
});

test('pixel replay retains source typing, quantization, and calibrated negative controls', () => {
  assert.equal(receipt.coordinateClaimDisposition.sourcePixelFrame.exactFullPageRasterCropRows, 16);
  assert.match(receipt.coordinateClaimDisposition.boundsPdfPoints.quantizationNote, /raster quantization, not a nominal-bounds conflict/);
  assert.equal(receipt.coordinateClaimDisposition.sourcePageCropPixelsOnRender.exactFullPageRasterCropRows, 68);
  assert.equal(receipt.coordinateClaimDisposition.sourceCropBoundsPx.typedAsSupplementImageNotPdf, true);
  assert.equal(receipt.coordinateClaimDisposition.sourceCropBoundsPx.pdfPage, null);
  assert.equal(receipt.coordinateClaimDisposition.sourcePageCoordinateAndSourceRowImagePixels.exactAffineAgreementRows, 91);
  assert.equal(receipt.coordinateClaimDisposition.cropProvenance.exactDirectClipReplays, 5);
  assert.equal(receipt.coordinateClaimDisposition.renderFrame.pageBoxRotationAndMatrixMatches, 3);
  assert.equal(receipt.negativeControls.onePixelShiftedArmorCrop.detected, true);
  assert.equal(receipt.negativeControls.wrongBookSamePageNumberAndPixelBounds.detected, true);
  assert.equal(receipt.negativeControls.wrongImageHash.detected, true);
  assert.equal(receipt.negativeControls.wrongSourceHash.detected, true);
  assert.equal(receipt.visualBoundaryReviewScope.includes('does not certify crop completeness'), true);
});
