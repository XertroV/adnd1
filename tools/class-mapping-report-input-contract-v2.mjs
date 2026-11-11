// Additive S2 report contract. It preserves the v1 proposal and every frozen
// MM reader, report snapshot, and citation-evidence seal.
import {types} from 'node:util';

export const SOURCE_BODY_COMMIT = '2d35138027f00c0740975e519dbb3a2b6df76d14';
export const SOURCE_BODY_TREE = '40ecb15130b339658522794db6d9e1bc58f43b50';
export const SOURCE_BODY_PARENT = 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2';
export const SOURCE_BODY_PARENT_TREE = 'da1c64ea25f178a1155a79c4692964e9b17dd645';
export const SOURCE_BODY_FIXTURE_SHA256 = 'c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10';
export const QUALIFIER_CODE_COMMIT = null;

export const NATIVE_INSTALLED_CODE_PATHS = Object.freeze([
  'tools/class-mapping-native-contract-v1.mjs',
  'tools/class-mapping-frozen-parent-artifacts-v1.mjs',
  'tools/class-mapping-raw-git-v1.mjs',
  'tools/class-mapping-current-source-gate-v1.mjs',
  'tests/helpers/class-mapping-current-cohort-factory-v1.mjs',
  'tests/helpers/class-mapping-current-cohort-v1.mjs',
]);
export const NATIVE_PIN_MODULE_PATH = 'research/class-mapping-source-epoch-v1/native-qualification-pins-v1.mjs';
// Exact shared helper digest from the independently reviewed native/adapter
// package; literal HEAD resolution remains limited to its fixed safe grammar.
export const NATIVE_RAW_GIT_HELPER_SHA256 = '174d777a6ad719ca783bf8f0345c867469b6b8fb33927e34d744a22362bca909';
export const CURRENT_CONSUMER_PINS_PATH = 'research/class-mapping-current-adapters-v1/current-consumer-pins-v1.mjs';
export const CURRENT_CONSUMER_CODE_STAGE_PINS_PATH = 'research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.mjs';
export const CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH = 'research/class-mapping-current-adapters-v1/current-consumer-code-stage-seal-v1.json';
export const CURRENT_CONSUMER_FINAL_SEAL_PATH = 'research/class-mapping-current-adapters-v1/current-consumer-s2-seal-v1.json';
export const CURRENT_CONSUMER_PINS_QCC_STUB_SHA256 = '5f2d6cb231f77b61e2024f52efa7df132703462a53b1b690af9011794edc38d9';
export const CURRENT_CONSUMER_CODE_STAGE_STATUS = 'code-stage-pins-sealed-before-handoff-receipt-generation';
export const CURRENT_CONSUMER_FINAL_STAGE_STATUS = 'materialized-pins-and-handoff-receipt-sealed-before-current-consumers';
export const S2_CURRENT_ADAPTER_CODE_PATHS = Object.freeze([
  'tools/class-mapping-raw-git-v1.mjs',
  'tools/class-mapping-current-consumer-runtime-v1.mjs',
  'tools/class-mapping-current-monetary-question-kernel-v1.mjs',
  'tools/class-mapping-current-monetary-questions-v1.mjs',
  'tools/class-mapping-current-jo-gap-v1.mjs',
  'tools/class-mapping-current-source-handoff-v1.mjs',
  'tools/class-mapping-current-ua26-marker-v1.mjs',
  'tools/class-mapping-current-successors-v1.mjs',
  'tools/coverage-gaps-class-mapping-v1.mjs',
  'tools/monetary-row-identity-audit.mjs',
  'tools/monetary-context-extent-contract.mjs',
  'tools/monetary-source-render-frames.mjs',
  'tools/jo-unextracted-price-registration.mjs',
  'tools/ua-source-handoff-transition.mjs',
  'tools/ua26-note-marker-audit.mjs',
  'tools/dmg175-availability-projection.mjs',
  'dist/books.js',
  'tools/class-mapping-current-consumer-seal-verifier-v1.mjs',
  'tools/class-mapping-current-head-commit-v1.mjs',
]);
export const S2_CURRENT_ADAPTER_MANIFEST_SHA256='53c8735a206f3d454e1319b0a343052abb34d5bb52db33e373e625f26b5b490b';
// Exact 19-path v7 current-consumer review pins: 11 package-owned hashes from
// its frozen manifest and 8 transitive dependencies from the pinned runtime.
export const S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES=Object.freeze({
  'tools/class-mapping-raw-git-v1.mjs':'174d777a6ad719ca783bf8f0345c867469b6b8fb33927e34d744a22362bca909',
  'tools/class-mapping-current-head-commit-v1.mjs':'318de6e784b3ea6932878ed8fcc25592def4e27bff0b95355aa73f99ef227f22',
  'tools/class-mapping-current-consumer-seal-verifier-v1.mjs':'1d5d17d7fccf0cf17648af2343c16b8ec5557895a88151e274c01eb0eb79a780',
  'tools/class-mapping-current-consumer-runtime-v1.mjs':'c2b7594855c0fc1634f90560b734833a80576b4668a4004b56342f0fac8c7689',
  'tools/class-mapping-current-monetary-question-kernel-v1.mjs':'5e94c4c105b731e0e7c75d3e87924debd6766d9a699158b45b2f536e23a100ae',
  'tools/class-mapping-current-monetary-questions-v1.mjs':'3cc9f0257ebbe39e6e078db4229ec81e9ace79dd85bf8530470da35fb8d9e667',
  'tools/class-mapping-current-jo-gap-v1.mjs':'40a6eb8ed5f5551e7bd7ed9124d7b52c94b019f3852d4f2f5393844026870ce5',
  'tools/class-mapping-current-source-handoff-v1.mjs':'004f347c453f1d48e21cf793c053c0daa7c815b5d7afe33514ea64f09425c3d8',
  'tools/class-mapping-current-ua26-marker-v1.mjs':'865591282907a517ce93211c8c3ef9d35fd67ce4c0b6ec0d32b0e149b86d79f8',
  'tools/class-mapping-current-successors-v1.mjs':'66c4ae039d4765679e1231ada231797c18a57aa52d55502e4f4e74944a4f17ec',
  'tools/coverage-gaps-class-mapping-v1.mjs':'286e8b6465bd34ecfda67aa30f0619e706091de337dcbd4c8e8ed83221d8949a',
  'tools/monetary-row-identity-audit.mjs':'75dd1b6b1177c848c85b148bb806e6653ab6517979d3c7a3a1946f1021b63276',
  'tools/monetary-context-extent-contract.mjs':'64838c56e5303a6a63f4ff0e33c3ee2bb15cd445c4fca50c276dc2906af3074d',
  'tools/monetary-source-render-frames.mjs':'44dc5c4d5233fdf2a8b1a36742712f1b36f69ebcc8d2b6d8208303cdb9b41a39',
  'tools/jo-unextracted-price-registration.mjs':'dc939de98ff9f796f6a1ec910aa8f0fc287508d6fbe5729c824af1ed4046f7c2',
  'tools/ua-source-handoff-transition.mjs':'3adfe83ac23945e103c00c0c860d4d741b2ee0af4015db3bb91925d34e544cc2',
  'tools/ua26-note-marker-audit.mjs':'4cd3e158451d842c4b097a0ddc726b5c248dfe2b0428cae719f1e4b27a85c49c',
  'tools/dmg175-availability-projection.mjs':'43d711afd6f086caeef99a907901759ce79fb3123060674426da7a303a6c9689',
  'dist/books.js':'99928f8e954ef213a51c70dc97d8f63b16a7b5eea9f1cba10b76b527ec17f811',
});

export const SOURCE_SCAN_FRESH_OUTPUT_PATH='research/class-mapping-source-epoch-v1/reports/current/source-scan-inventory-class-mapping-current-v1.json';
export const SOURCE_SCAN_LEGACY_LOGICAL_PATH='tests/fixtures/source-scan-inventory.json';
export const SOURCE_SCAN_LEGACY_ALIAS=Object.freeze({logicalPath:SOURCE_SCAN_LEGACY_LOGICAL_PATH,physicalPath:SOURCE_SCAN_FRESH_OUTPUT_PATH});
export const HANDOFF_FRESH_OUTPUT_PATH='research/class-mapping-source-epoch-v1/reports/next-native-v2/current/gaps-handoff.json';
export const HANDOFF_LEGACY_LOGICAL_PATH='research/gaps-limitations-next-task.json';
export const CURRENT_REPORT_LEGACY_ALIASES=Object.freeze([
  Object.freeze({logicalPath:HANDOFF_LEGACY_LOGICAL_PATH,physicalPath:HANDOFF_FRESH_OUTPUT_PATH}),
  SOURCE_SCAN_LEGACY_ALIAS,
]);

// Explicit local-import closure for the report producers and current adapters.
// The binder re-scans literal relative JS imports in this list on each call;
// any discovered edge must resolve to another listed code path or an S1
// sourceBody path. Python dynamic imports/subprocess entrypoints are in the
// typed edge manifest below and are re-hashed with the rest of the closure.
export const REPORT_CODE_PATHS = Object.freeze([...new Set([
  // Native gate installed-code closure and its excluded-from-self-pin module.
  ...NATIVE_INSTALLED_CODE_PATHS,
  NATIVE_PIN_MODULE_PATH,
  ...S2_CURRENT_ADAPTER_CODE_PATHS,
  // Binder and typed contract.
  'tools/class-mapping-report-input-contract-v2.mjs',
  'tools/bind-class-mapping-source-audit-input-commit-v2.mjs',
  'tools/class-mapping-report-producers-v2.mjs',
  'tools/class-mapping-report-runtime-guards-v1.mjs',
  'tools/assemble-class-mapping-v1.mjs',
  'tools/class-mapping-assembly-core-v1.mjs',
  'tools/source-raster-coverage-next-native-v2.mjs',
  'tools/source-visual-coverage-next-native-v2.mjs',
  'tools/source-frame-coordinate-bridge-next-native-v2.mjs',
  'tools/refresh-gaps-handoff-next-native-v2-callshape-v1.mjs',
  'tools/source-report-consistency-audit-next-native-v2.mjs',
  'tools/monetary-unit-provenance-audit-next-native-v2.mjs',
  // S2 current adapters and their transitive runtime/kernel/wrapper closure.
  'tools/class-mapping-current-consumer-runtime-v1.mjs',
  'tools/class-mapping-current-monetary-question-kernel-v1.mjs',
  'tools/class-mapping-current-monetary-questions-v1.mjs',
  'tools/class-mapping-current-jo-gap-v1.mjs',
  'tools/class-mapping-current-source-handoff-v1.mjs',
  'tools/class-mapping-current-ua26-marker-v1.mjs',
  'tools/class-mapping-current-successors-v1.mjs',
  'tools/coverage-gaps-class-mapping-v1.mjs',
  'tools/jo-unextracted-price-registration.mjs',
  'tools/monetary-row-identity-audit.mjs',
  'tools/ua26-note-marker-audit.mjs',
  'tools/ua-source-handoff-transition.mjs',
  // Producer roots.
  'tools/source-visual-coverage.mjs',
  'tools/source-raster-coverage.mjs',
  'tools/citation-systemic-inventory.mjs',
  'tools/price-source-inventory.mjs',
  'tools/source-frame-coordinate-bridge.mjs',
  'tools/mechanics-audit.mjs',
  'tools/source-completeness-coverage.mjs',
  'tools/source-scan-inventory.mjs',
  'tools/source-table-citation-coverage.mjs',
  'tools/source-discovery-group-reconciliation.mjs',
  'tools/published-continuations.mjs',
  'tools/monetary-source-render-frames.mjs',
  'tools/monetary-context-extent-contract.mjs',
  'tools/monetary-row-identity-audit.mjs',
  'tools/quantity-source-absence-audit.mjs',
  // Full producer-local JS import closure, including paths omitted in v1.
  'tools/source-visual-dispositions.mjs',
  'tools/citation-context-contract.mjs',
  'tools/continuation-contract.mjs',
  'tools/continuation-order-audit.mjs',
  'tools/citation-region-role.mjs',
  'tools/citation-override-identity.mjs',
  'tools/class-xp-continuation-target-review.mjs',
  'tools/scan-catalog.mjs',
  'tools/mechanics-citation-page-transfer.mjs',
  'dist/citations.js',
  'tools/dmg175-availability-projection.mjs',
  'tools/ua-source-handoff-transition.mjs',
  'tools/ua26-note-marker-audit.mjs',
  // Python geometry/raster/continuation producers and local imports.
  'research/source-visual-audit-next-native-v2.py',
  'research/source-raster-boundary-audit-next-native-v2.py',
  'research/source-frame-coordinate-bridge-next-native-v2.py',
  'research/crop_geometry.py',
  'tools/continuation-candidates-next-native-v2.py',
  'tools/build-source-frame-coordinate-bridge.py',
  'research/class-mapping-source-epoch-v1/precoverage-builder-v1/production-readonly.mjs',
  'research/class-mapping-source-epoch-v1/precoverage-builder-v1/source-body.mjs',
  // S2 pin module and typed adapter contracts (listed as typed metadata too).
])]);

export const REPORT_DATA_PATHS = Object.freeze([
  // Non-body source/review inputs read by the fresh geometry, visual and
  // completeness stages. Every dist catalog/image selected from `dist/data`
  // must also occur in the native `sourceBody` map and is checked there.
  'research/source-visual-reviews.json',
  'research/source-completeness-page-baseline.json',
  'research/source-completeness-site.json',
  'research/source-completeness-phb.json',
  'research/source-completeness-dmg.json',
  'research/source-completeness-ua.json',
  'research/source-completeness-mm.json',
  'research/source-completeness-mm2.json',
  'research/current-source-audit-status.json',
  'research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json',
  'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json',
  'research/class-mapping-current-adapters-v1/source-handoff-current-contract-v1.json',
  'research/class-mapping-current-adapters-v1/ua26-marker-current-contract-v1.json',
  'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.template.json',
  'research/hirelings-current-next-batch-v1/native-monetary-successor-v2/version29-monetary-questions-actual-projection-baseline-v2.json',
  'research/class-mapping-source-epoch-v1/next-native-source-frame-bridge-contract-v2.json',
  'research/class-mapping-source-epoch-v1/next-native-source-frame-bridge-v2.json',
  'research/class-mapping-source-epoch-v1/next-native-source-frame-metadata-rebase-v2.json',
  'research/source-table-citation-contracts.json',
  'research/source-audit-batch5-ua-additional-prices.json',
  'research/source-audit-batch5-phb-dmg-additional-prices.json',
  'research/price-source-inventory-phb-dmg-other.json',
  'research/price-source-inventory-ua-other.json',
  'research/price-source-inventory.json',
  'research/price-source-inventory-monster-books.json',
  'research/source-audit-batch5-phb-dmg-price-passage-records.json',
  'research/source-audit-batch5-price-description-records.json',
  'research/source-audit-batch5-price-discovery-reconciliation.json',
  'research/quantity-source-absence-detector-baseline.json',
  'research/quantity-source-absence-before-calibrations.json',
  'research/quantity-unit-provenance-before-v1.json',
  'research/source-audit-batch5-whale-unit-root-independent-review-v3.json',
  'tests/fixtures/whale-unit-exact-inputs-and-proposal-before-root.json.gz',
  'tests/fixtures/monetary-unit-provenance-jo-2162-before.json.gz',
  'research/monetary-row-identity-reviews.json',
  'research/source-audit-batch5-current-finding-disposition-registration.json',
  'research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json',
  'research/source-audit-batch5-existing-approval-195-registration-availability-independent-review.json',
  'research/gaps-limitations-next-task.json',
  'research/equipment-source-offer-reconciliation.json',
  'research/dmg175-current-content-projection-v1/inputs/target-plan-manifest-v2.json',
  'research/source-audit-batch5-conflict-integration.json',
  'research/source-audit-batch5-null-price-notes.json',
  'research/source-audit-batch5-unextracted.json',
  'research/source-audit-batch5-class-integration.json',
  'research/source-audit-batch5-class-retired-ledger.json',
  'research/source-audit-batch5-class-progression-retirement.json',
  'research/source-audit-batch5-class-progression-baseline.json',
  'research/source-audit-batch5-price-independent-review.json',
  'research/source-audit-batch5-ua-context-meaning-independent-review.json',
  'research/monetary-row-identity-findings.json',
]);
export const REPORT_DATA_POINTER_EDGES = Object.freeze([
  Object.freeze({sourcePath:'research/source-audit-batch5-current-finding-disposition-registration.json',pointer:'/migrationBridge',targetPath:'research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json'}),
  Object.freeze({sourcePath:'research/source-audit-batch5-current-finding-disposition-registration.json',pointer:'/authorityAvailability',targetPath:'research/source-audit-batch5-existing-approval-195-registration-availability-independent-review.json'}),
]);
// These historical review/context files are intentionally optional inputs in
// the existing report algorithms. Their exact present/absent state and bytes
// are sealed so their later appearance cannot silently alter current output.
export const REPORT_OPTIONAL_DATA_PATHS = Object.freeze([
  'research/source-visual-audit-phb-ua-triage.json',
  'research/source-visual-audit-mm-triage.json',
  'research/phb-equipment-visual-triage.json',
  'research/highlight-dmg-clipping-triage.json',
  'research/phb-45-75-visual-triage.json',
  'research/phb-75-100-visual-triage.json',
  'research/ua-other-visual-review.json',
  'research/nonphb-equipment-visual-review.json',
  'research/source-viewer-dogfood-findings.json',
  'research/dmg175-character-level-crop-triage-v1.json',
  'research/citation-continuations.json',
  'research/citation-context-contracts.json',
]);
export const POST_QCC_AUXILIARY_PATHS = Object.freeze([
  CURRENT_CONSUMER_PINS_PATH,
  CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,
  CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,
  CURRENT_CONSUMER_FINAL_SEAL_PATH,
]);

export const PYTHON_DYNAMIC_LOCAL_EDGES = Object.freeze([
  Object.freeze({from:'research/source-visual-audit-next-native-v2.py',to:'research/source-frame-coordinate-bridge-next-native-v2.py',mechanism:'importlib.util.spec_from_file_location'}),
  Object.freeze({from:'research/source-visual-audit-next-native-v2.py',to:'tools/continuation-candidates-next-native-v2.py',mechanism:'importlib.util.spec_from_file_location'}),
  Object.freeze({from:'research/source-visual-audit-next-native-v2.py',to:'research/crop_geometry.py',mechanism:'Python import crop_geometry'}),
  Object.freeze({from:'research/source-raster-boundary-audit-next-native-v2.py',to:'research/source-frame-coordinate-bridge-next-native-v2.py',mechanism:'importlib.util.spec_from_file_location'}),
  Object.freeze({from:'research/source-raster-boundary-audit-next-native-v2.py',to:'tools/continuation-candidates-next-native-v2.py',mechanism:'importlib.util.spec_from_file_location'}),
  Object.freeze({from:'tools/continuation-candidates-next-native-v2.py',to:'research/source-frame-coordinate-bridge-next-native-v2.py',mechanism:'importlib.util.spec_from_file_location'}),
  Object.freeze({from:'tools/continuation-candidates-next-native-v2.py',to:'tools/mechanics-audit.mjs',mechanism:'inline Node import from subprocess script'}),
]);
export const ASSEMBLY_DYNAMIC_LOCAL_EDGES = Object.freeze([
  Object.freeze({from:'tools/assemble-class-mapping-v1.mjs',to:'tools/class-mapping-current-source-gate-v1.mjs',mechanism:'dynamic import'}),
  Object.freeze({from:'tools/assemble-class-mapping-v1.mjs',to:'tools/class-mapping-current-consumer-seal-verifier-v1.mjs',mechanism:'dynamic import'}),
  Object.freeze({from:'tools/assemble-class-mapping-v1.mjs',to:'tools/bind-class-mapping-source-audit-input-commit-v2.mjs',mechanism:'dynamic import'}),
  Object.freeze({from:'tools/assemble-class-mapping-v1.mjs',to:'tools/class-mapping-report-input-contract-v2.mjs',mechanism:'dynamic import'}),
  Object.freeze({from:'tools/assemble-class-mapping-v1.mjs',to:'research/class-mapping-source-epoch-v1/precoverage-builder-v1/production-readonly.mjs',mechanism:'dynamic import'}),
  Object.freeze({from:'tools/assemble-class-mapping-v1.mjs',to:'research/class-mapping-source-epoch-v1/precoverage-builder-v1/source-body.mjs',mechanism:'dynamic import'}),
  Object.freeze({from:'tools/assemble-class-mapping-v1.mjs',to:'tools/class-mapping-current-consumer-runtime-v1.mjs',mechanism:'dynamic import'}),
  Object.freeze({from:'tools/assemble-class-mapping-v1.mjs',to:'tools/coverage-gaps-class-mapping-v1.mjs',mechanism:'dynamic import'}),
]);
export const FIXED_DYNAMIC_IMPORT_GROUPS = Object.freeze([
  Object.freeze({from:'research/class-mapping-source-epoch-v1/precoverage-builder-v1/production-readonly.mjs',paths:Object.freeze([
    'tools/scan-catalog.mjs','tools/price-source-inventory.mjs','tools/published-continuations.mjs','tools/citation-override-identity.mjs','dist/books.js',
  ]),mechanism:'fixed modulePaths array passed to pathToFileURL and import'}),
]);
export const HISTORICAL_RAW_GIT_READS = Object.freeze([
  Object.freeze({commit:'679b15d1c580172e54314829c1c3c86dc78b65f3',path:'dist/data.json',role:'frozen handoff baseline data'}),
  Object.freeze({commit:'679b15d1c580172e54314829c1c3c86dc78b65f3',path:'research/gaps-limitations-next-task.json',role:'frozen handoff baseline template'}),
  Object.freeze({commit:'679b15d1c580172e54314829c1c3c86dc78b65f3',path:'research/price-source-inventory.json',role:'typed PHB/DMG supplement baseline',sourcePath:'research/source-audit-batch5-phb-dmg-additional-prices.json',commitPointer:'/baseline/inputCommit',pathPointer:'/baseline/priceInventoryFile',shaPointer:'/baseline/priceInventoryFileSha256'}),
]);

const nextReports = 'research/class-mapping-source-epoch-v1/reports/next-native-v2';
export const REPORT_OUTPUTS = Object.freeze([
  {path:`${nextReports}/geometry/source-visual-audit-next-native-v2.json`,kind:'source-geometry-snapshot',format:'json',producerPath:'research/source-visual-audit-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/geometry/source-visual-audit-next-native-v2.md`,kind:'source-geometry-human-report',format:'markdown',producerPath:'research/source-visual-audit-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/geometry/source-visual-audit-next-native-v2-queue-phb-equipment.json`,kind:'geometry-review-queue',format:'json',producerPath:'research/source-visual-audit-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/geometry/source-visual-audit-next-native-v2-queue-nonphb-equipment.json`,kind:'geometry-review-queue',format:'json',producerPath:'research/source-visual-audit-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/geometry/source-visual-audit-next-native-v2-queue-other-records.json`,kind:'geometry-review-queue',format:'json',producerPath:'research/source-visual-audit-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/raster/source-raster-boundary.json.gz`,kind:'raster-boundary-snapshot',format:'gzip-json',producerPath:'research/source-raster-boundary-audit-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/raster/source-raster-coverage.json`,kind:'current-raster-coverage-report',format:'json',producerPath:'tools/source-raster-coverage-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/visual/source-visual-coverage.json`,kind:'current-source-visual-coverage-report',format:'json',producerPath:'tools/source-visual-coverage-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/visual/source-visual-coverage.md`,kind:'current-source-visual-coverage-human-report',format:'markdown',producerPath:'tools/source-visual-coverage-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/visual/dispositions.json`,kind:'current-visual-disposition-report',format:'json',producerPath:'tools/source-visual-coverage-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/visual/dispositions.md`,kind:'current-visual-disposition-human-report',format:'markdown',producerPath:'tools/source-visual-coverage-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/visual/price-source-inventory.json`,kind:'current-derived-price-inventory-report',format:'json',producerPath:'tools/source-visual-coverage-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/visual/price-source-inventory.md`,kind:'current-derived-price-inventory-human-report',format:'markdown',producerPath:'tools/source-visual-coverage-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/continuation/continuation-candidates.json.gz`,kind:'current-continuation-full-snapshot',format:'gzip-json',producerPath:'tools/continuation-candidates-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/continuation/continuation-summary.json`,kind:'current-continuation-summary',format:'json',producerPath:'tools/continuation-candidates-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/continuation/continuation-report.md`,kind:'current-continuation-human-report',format:'markdown',producerPath:'tools/continuation-candidates-next-native-v2.py',stage:'post-QCC-metadata'},
  {path:`${nextReports}/current/source-completeness.json`,kind:'current-source-completeness-report',format:'json',producerPath:'tools/source-completeness-coverage.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/current/source-completeness.md`,kind:'current-source-completeness-human-report',format:'markdown',producerPath:'tools/source-completeness-coverage.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/current/citation-systemic-current.json`,kind:'current-systemic-coverage-report',format:'json',producerPath:'tools/citation-systemic-inventory.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/current/source-table-citation-coverage.json`,kind:'current-source-table-citation-coverage-report',format:'json',producerPath:'tools/source-table-citation-coverage.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/current/gaps-handoff.json`,kind:'current-gaps-handoff-snapshot',format:'json',producerPath:'tools/refresh-gaps-handoff-next-native-v2-callshape-v1.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/current/coverage-gaps.json`,kind:'current-coverage-gaps-snapshot',format:'json',producerPath:'tools/coverage-gaps-class-mapping-v1.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/current/report-consistency.json`,kind:'current-report-consistency-audit',format:'json',producerPath:'tools/source-report-consistency-audit-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:`${nextReports}/current/monetary-unit-provenance/report.json`,kind:'current-monetary-unit-provenance-report',format:'json',producerPath:'tools/monetary-unit-provenance-audit-next-native-v2.mjs',stage:'post-QCC-metadata'},
  {path:SOURCE_SCAN_FRESH_OUTPUT_PATH,kind:'current-source-scan-inventory',format:'json',producerPath:'tools/source-scan-inventory.mjs',stage:'post-QCC-metadata'},
  {path:'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json',kind:'current-handoff-transition-receipt',format:'json',producerPath:'tools/class-mapping-current-source-handoff-v1.mjs',stage:'post-QCC-metadata-prerequisite'},
].map(row=>Object.freeze({
  ...row,
  producerClass:row.stage==='post-QCC-metadata-prerequisite'?'pre-seal-transition'
    :['tools/refresh-gaps-handoff-next-native-v2-callshape-v1.mjs','tools/coverage-gaps-class-mapping-v1.mjs','tools/source-report-consistency-audit-next-native-v2.mjs','tools/monetary-unit-provenance-audit-next-native-v2.mjs'].includes(row.producerPath)?'current-adapter-report':'core-native-report',
})));

export const PRODUCER_EXECUTION_PLAN = Object.freeze([
  {order:1,stage:'before materialized consumer seal',producer:'tools/class-mapping-current-source-handoff-v1.mjs',invocation:'in a separate Node process, call buildNextNativeSourceHandoffTransitionReceipt() after the code-stage seal; write only its fixed post-QCC receipt path; materialize final consumer pins and final seal in a following commit/process',outputs:'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json',pathSupport:'v6+ adapter code-only stage API; receipt digest is sealed only after its bytes exist'},
  {order:2,stage:'after materialized consumer seal',producer:'tools/class-mapping-report-producers-v2.mjs',invocation:'node tools/class-mapping-report-producers-v2.mjs --source-dir <absolute-private-PDF-directory>',outputs:'20 fresh geometry/raster/visual/continuation/completeness/systemic/source-scan files under reports/next-native-v2 and reports/current',pathSupport:'fixed-path wrapper; verifies both actual-HEAD seals before calling consumers; Python subprocesses use controlled scrubbed Git environment'},
  {order:3,stage:'after 20 core outputs',producer:'current-adapter consumers plus additive exact-path wrappers',invocation:'run the handoff, coverage-gap, consistency, and monetary current adapters against the materialized seal; write their four fresh next-native targets exclusively',outputs:'gaps-handoff.json, coverage-gaps.json, report-consistency.json, monetary-unit-provenance/report.json',pathSupport:'hard QCC integration gate; current adapters expose no report-root runner yet'},
  {order:4,stage:'after every output is committed',producer:'tools/bind-class-mapping-source-audit-input-commit-v2.mjs',invocation:'node tools/bind-class-mapping-source-audit-input-commit-v2.mjs --qualifier-code-commit <actual-QCC-commit>',outputs:'research/class-mapping-source-epoch-v1/metadata-stage-v2.json',pathSupport:'exclusive receipt creation; output blobs must be absent from S1/QCC and equal actual physical bytes'},
  {order:5,stage:'post-metadata commit CI / additive assembly',producer:'tools/bind-class-mapping-source-audit-input-commit-v2.mjs',invocation:'call verifyCommittedClassMappingReportReceipt() with no arguments before assembly; map legacy source-scan read path to the sealed fresh path',outputs:'read-only validation; source-scan alias tests/fixtures/source-scan-inventory.json -> research/class-mapping-source-epoch-v1/reports/current/source-scan-inventory-class-mapping-current-v1.json',pathSupport:'reruns current seal, native, QCC, full closure and report pins while allowing outputs already present in actual HEAD'},
].map(row=>Object.freeze(row)));

export const REPORT_RECEIPT_PATH = 'research/class-mapping-source-epoch-v1/metadata-stage-v2.json';

// Exact schema templates. The fixture digest, QCC identity, and materialized
// pin-module digests are intentionally null until root has real bytes.
export const CURRENT_CONSUMER_CODE_STAGE_SEAL_SCHEMA = Object.freeze({
  schemaVersion:1,
  artifactType:'S2 next-native current-consumer code-stage seal',
  status:CURRENT_CONSUMER_CODE_STAGE_STATUS,
  sourceEpoch:{sourceCommit:SOURCE_BODY_COMMIT,sourceTree:SOURCE_BODY_TREE,fixture:{path:'research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json',sha256:SOURCE_BODY_FIXTURE_SHA256}},
  qualifierCode:{commit:null,tree:null,parent:SOURCE_BODY_COMMIT},
  currentConsumerPinModule:{path:CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,sha256:null},
  transitionReceipt:{path:'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json',sha256:null},
});
export const CURRENT_CONSUMER_FINAL_SEAL_SCHEMA = Object.freeze({
  schemaVersion:1,
  artifactType:'S2 next-native current-consumer materialized-stage seal',
  status:CURRENT_CONSUMER_FINAL_STAGE_STATUS,
  sourceEpoch:{sourceCommit:SOURCE_BODY_COMMIT,sourceTree:SOURCE_BODY_TREE,fixture:{path:'research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json',sha256:SOURCE_BODY_FIXTURE_SHA256}},
  qualifierCode:{commit:null,tree:null,parent:SOURCE_BODY_COMMIT},
  currentConsumerPinModule:{path:CURRENT_CONSUMER_PINS_PATH,sha256:null},
  codeStagePinModule:{path:CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,sha256:null},
  codeStageSeal:{path:CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,sha256:null},
  transitionReceipt:{path:'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json',sha256:null},
});

// Validate before touching any caller property. util.types.isProxy is a VM
// predicate and does not invoke proxy traps. Accessors, inherited prototypes,
// symbols and extra keys are rejected; only own JSON data is read.
export function readQualifierOptions(options) {
  const reject = message => { throw new TypeError(`Report binder options: ${message}`); };
  if (options === null || typeof options !== 'object' || types.isProxy(options)) reject('plain non-proxy object required');
  if (Array.isArray(options) || Object.getPrototypeOf(options) !== Object.prototype) reject('plain JSON object required');
  const keys = Reflect.ownKeys(options);
  if (keys.length !== 1 || keys[0] !== 'qualifierCodeCommit') reject('exactly one own string key, qualifierCodeCommit, is required');
  const descriptor = Object.getOwnPropertyDescriptor(options, 'qualifierCodeCommit');
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) reject('qualifierCodeCommit must be an enumerable own data property');
  const value = descriptor.value;
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) reject('full 40-character lowercase commit required');
  return value;
}

export function validateCurrentConsumerSealDocument(value,stage) {
  const failSeal=message=>{throw new TypeError(`Current-consumer ${stage} seal: ${message}`);};
  if(stage!=='code-stage'&&stage!=='materialized-stage')failSeal('known stage required');
  const final=stage==='materialized-stage';
  const record=(input,label,expected)=>{
    if(input===null||typeof input!=='object'||Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Object.prototype)failSeal(`${label} must be a plain non-proxy JSON object`);
    const keys=Reflect.ownKeys(input);
    if(keys.some(key=>typeof key!=='string'))failSeal(`${label} cannot contain symbol keys`);
    keys.sort();
    if(JSON.stringify(keys)!==JSON.stringify([...expected].sort()))failSeal(`${label} has a non-exact field set`);
    const output={};
    for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(input,key);if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)failSeal(`${label}.${key} must be enumerable own JSON data`);Object.defineProperty(output,key,{value:descriptor.value,enumerable:true,writable:true,configurable:true});}
    return output;
  };
  value=record(value,'seal',['schemaVersion','artifactType','status','sourceEpoch','qualifierCode','currentConsumerPinModule',...(final?['codeStagePinModule','codeStageSeal']:[]),'transitionReceipt']);
  if(value.schemaVersion!==1||value.artifactType!==(final?'S2 next-native current-consumer materialized-stage seal':'S2 next-native current-consumer code-stage seal')
    ||value.status!==(final?CURRENT_CONSUMER_FINAL_STAGE_STATUS:CURRENT_CONSUMER_CODE_STAGE_STATUS))failSeal('schema, artifact type, or fixed stage status differs');
  value.sourceEpoch=record(value.sourceEpoch,'sourceEpoch',['sourceCommit','sourceTree','fixture']);
  if(value.sourceEpoch.sourceCommit!==SOURCE_BODY_COMMIT||value.sourceEpoch.sourceTree!==SOURCE_BODY_TREE)failSeal('S1 source identity differs');
  value.sourceEpoch.fixture=record(value.sourceEpoch.fixture,'native fixture',['path','sha256']);
  if(value.sourceEpoch.fixture.path!=='research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json'||value.sourceEpoch.fixture.sha256!==SOURCE_BODY_FIXTURE_SHA256)failSeal('native fixture reference differs from the actual qualified fixture');
  value.qualifierCode=record(value.qualifierCode,'qualifierCode',['commit','tree','parent']);
  if(!/^[a-f0-9]{40}$/.test(value.qualifierCode.commit||'')||!/^[a-f0-9]{40}$/.test(value.qualifierCode.tree||'')||value.qualifierCode.parent!==SOURCE_BODY_COMMIT)failSeal('QCC identity or exact direct parent is malformed');
  value.currentConsumerPinModule=record(value.currentConsumerPinModule,'currentConsumerPinModule',['path','sha256']);
  const expectedPinsPath=final?CURRENT_CONSUMER_PINS_PATH:CURRENT_CONSUMER_CODE_STAGE_PINS_PATH;
  if(value.currentConsumerPinModule.path!==expectedPinsPath||!/^[a-f0-9]{64}$/.test(value.currentConsumerPinModule.sha256||''))failSeal('current pin-module path or digest is malformed');
  if(final){
    value.codeStagePinModule=record(value.codeStagePinModule,'codeStagePinModule',['path','sha256']);
    if(value.codeStagePinModule.path!==CURRENT_CONSUMER_CODE_STAGE_PINS_PATH||!/^[a-f0-9]{64}$/.test(value.codeStagePinModule.sha256||''))failSeal('immutable code-stage pin module reference is malformed');
  }
  if(final){value.codeStageSeal=record(value.codeStageSeal,'codeStageSeal',['path','sha256']);if(value.codeStageSeal.path!==CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH||!/^[a-f0-9]{64}$/.test(value.codeStageSeal.sha256||''))failSeal('final seal must bind the exact immutable code-stage seal');}
  value.transitionReceipt=record(value.transitionReceipt,'transitionReceipt',['path','sha256']);
  if(value.transitionReceipt.path!=='research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json')failSeal('handoff transition receipt path differs');
  if(final?!/^[a-f0-9]{64}$/.test(value.transitionReceipt.sha256||''):value.transitionReceipt.sha256!==null)failSeal('transition receipt digest does not match the required stage');
  return value;
}
