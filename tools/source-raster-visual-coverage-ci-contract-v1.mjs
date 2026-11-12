// Pure contract checks for the CI-only fresh current report wrapper. They do
// not accept a root, snapshot path, source hash, or output-path override.
export const CURRENT_S1 = Object.freeze({
  sourceCommit: '2d35138027f00c0740975e519dbb3a2b6df76d14',
  sourceTree: '40ecb15130b339658522794db6d9e1bc58f43b50',
  qccCommit: '46ce96934ac460063d9c32d1aca513d292b30735',
  dataSha256: '16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573',
  parsedDataSha256: '06be8cf95fbae3305f96befae32f6dc7c46696e73df265b05cc275f0ec74eead',
});
export const NEXT_NATIVE_PATHS = Object.freeze({
  rasterSnapshot: 'research/class-mapping-source-epoch-v1/reports/next-native-v2/raster/source-raster-boundary.json.gz',
  geometry: 'research/class-mapping-source-epoch-v1/reports/next-native-v2/geometry/source-visual-audit-next-native-v2.json',
  rasterCoverage: 'research/class-mapping-source-epoch-v1/reports/next-native-v2/raster/source-raster-coverage.json',
  visualCoverage: 'research/class-mapping-source-epoch-v1/reports/next-native-v2/visual/source-visual-coverage.json',
  sourceFrameBridge: 'research/class-mapping-source-epoch-v1/next-native-source-frame-bridge-v2.json',
});
export const VISUAL_ARTIFACT_NAMES = Object.freeze({
  'source-visual-coverage.json': 'report.json',
  'source-visual-coverage.md': 'report.md',
  'dispositions.json': 'dispositions.json',
  'dispositions.md': 'dispositions.md',
  'price-source-inventory.json': 'price-source-inventory.json',
  'price-source-inventory.md': 'price-source-inventory.md',
});
const isSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function need(ok, message) { if (!ok) throw new Error(message); }

export function validateNextNativeRasterCoverage(report) {
  need(report && typeof report === 'object' && !Array.isArray(report), 'raster report must be an object');
  need(report.validation?.valid === true && Array.isArray(report.validation.errors) && report.validation.errors.length === 0,
    'fresh raster report must have valid=true and no validation errors');
  need(report.runMode?.status === 'next-native-fresh-inputs-only' && report.runMode.semanticPass === false,
    'raster report must use the next-native fresh-input builder without a semantic-pass claim');
  need(report.snapshot?.path === NEXT_NATIVE_PATHS.rasterSnapshot &&
    report.snapshot.selection === 'next-native-v2-fresh-output' && isSha(report.snapshot.sha256),
  'raster report must name the fixed next-native-v2 raster snapshot and raw hash');
  need(report.sourceGeometry?.path === NEXT_NATIVE_PATHS.geometry &&
    report.sourceGeometry.selection === 'next-native-v2-fresh-output' && isSha(report.sourceGeometry.sha256),
  'raster report must name the fixed next-native-v2 geometry and raw hash');
  need(report.liveUniverse?.dataSha256 === CURRENT_S1.dataSha256 &&
    Number.isSafeInteger(report.liveUniverse?.regionUsages) && Number.isSafeInteger(report.liveUniverse?.catalogs),
  'raster live universe must match the fixed current S1 data identity and carry finite counts');
  need(report.currentCandidateCounts?.regionUsages === report.liveUniverse.regionUsages,
    'raster current candidate denominator must match the complete live usage count');
  return report;
}

export function validateNextNativeVisualCoverage(report) {
  need(report && typeof report === 'object' && !Array.isArray(report), 'visual report must be an object');
  need(report.runMode?.status === 'next-native-fresh-source-frame-contract' &&
    report.runMode.sourceCommit === CURRENT_S1.sourceCommit && report.runMode.qccCommit === CURRENT_S1.qccCommit &&
    report.runMode.semanticPass === false,
  'visual report must use the fixed S1/QCC next-native source-frame contract without a semantic-pass claim');
  need(report.inputs?.data === CURRENT_S1.dataSha256 && report.inputDataSha256 === CURRENT_S1.parsedDataSha256,
    'visual report must preserve the distinct fixed current S1 raw-file and parsed-object hash domains');
  need(report.inputs?.geometry?.file === NEXT_NATIVE_PATHS.geometry && isSha(report.inputs.geometry.sha256),
    'visual report must bind the fixed next-native-v2 geometry input');
  need(report.runtimeInputProofs?.rasterBoundary?.path === NEXT_NATIVE_PATHS.rasterSnapshot &&
    isSha(report.runtimeInputProofs.rasterBoundary.sha256),
  'visual report must bind the fixed next-native-v2 raster boundary');
  need(report.runtimeInputProofs?.sourceFrameBridgeContract?.registryPath === NEXT_NATIVE_PATHS.sourceFrameBridge &&
    isSha(report.runtimeInputProofs.sourceFrameBridgeContract.registrySha256),
  'visual report must bind the fixed source-frame bridge registry');
  need(report.sourceFrameCoordinateBridge?.path === NEXT_NATIVE_PATHS.sourceFrameBridge &&
    report.sourceFrameCoordinateBridge.status === 'scoped-geometric-provenance-only' &&
    report.sourceFrameCoordinateBridge.sha256 === report.runtimeInputProofs.sourceFrameBridgeContract.registrySha256,
  'visual report must preserve the exact bounded source-frame registry proof');
  need(report.sourceFrameValidation?.valid === true && Array.isArray(report.sourceFrameValidation.errors) &&
    report.sourceFrameValidation.errors.length === 0,
  'visual report must pass the current source-frame validation');
  const registry = report.sourceFrameCoordinateBridge.registryValidation;
  need(registry?.status === 'current-pins-match' && registry.mismatchCount === 0 &&
    registry.frameGroups === 9 && registry.ownerJoinsValidated === 102,
  'visual report must preserve the exact current frame registry coverage without mismatch');
  need(report.priceInventory?.validation?.valid === true && report.continuations?.valid === true &&
    Array.isArray(report.contextContracts?.violations) && report.contextContracts.violations.length === 0,
  'visual report must retain its current price, continuation, and context-extent structural checks');
  need(Number.isSafeInteger(report.totals?.regionUsages) && Number.isSafeInteger(report.totals?.uniqueImages),
    'visual report must provide complete current region and unique-image denominators');
  return report;
}
