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
export const CURRENT_CONSUMER_PINS_QCC_STUB_SHA256 = '53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385';
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
// Exact same 19-path review set: retain the frozen 53c parent manifest and
// apply the reviewed Jo split-epoch adapter plus its QCC-stub runtime literals.
export const S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES=Object.freeze({
  'tools/class-mapping-raw-git-v1.mjs':'174d777a6ad719ca783bf8f0345c867469b6b8fb33927e34d744a22362bca909',
  'tools/class-mapping-current-head-commit-v1.mjs':'318de6e784b3ea6932878ed8fcc25592def4e27bff0b95355aa73f99ef227f22',
  'tools/class-mapping-current-consumer-seal-verifier-v1.mjs':'2024a67b10faf01292838f4c1f69f70b634ee6cdbab063cdaa04b72e36902678',
  'tools/class-mapping-current-consumer-runtime-v1.mjs':'eddac05f87eb17876f70fc93952a0be04f3139a2f8815c38c47668b9d5e38a5b',
  'tools/class-mapping-current-monetary-question-kernel-v1.mjs':'79a0c66c3e5085a4d442d6497497671631691a0042654cc95dd0bb8be575a085',
  'tools/class-mapping-current-monetary-questions-v1.mjs':'3cc9f0257ebbe39e6e078db4229ec81e9ace79dd85bf8530470da35fb8d9e667',
  'tools/class-mapping-current-jo-gap-v1.mjs':'1a36b58c8e6da6bc281d46b3028372feb6e5c26014cb79ff4ef01cf004d44199',
  'tools/class-mapping-current-source-handoff-v1.mjs':'4bf69c7d6b5bbc67807ce21476d96c82c72179ecd4108f18af48e8bb6bec8289',
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

// A reviewed, one-literal successor to the frozen 53c adapter manifest. The
// parent manifest remains unchanged; this proof binds the current question
// contract bytes that the exact kernel literal must name.
export const S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE=Object.freeze({
  schemaVersion:1,
  scope:'independent exact kernel-literal-to-installed-contract correction only',
  path:'tools/class-mapping-current-monetary-question-kernel-v1.mjs',
  oldSha256:'5e94c4c105b731e0e7c75d3e87924debd6766d9a699158b45b2f536e23a100ae',
  newSha256:'79a0c66c3e5085a4d442d6497497671631691a0042654cc95dd0bb8be575a085',
  previousResearchContractSha256:'525b4b6d7daa9274db6a108f25e7bef9f397138899468c4fe01f09d1603f9313',
  currentResearchContractPath:'research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json',
  currentResearchContractSha256:'6f63999336bb41703ca608c3661131fb496c96f6983a8e0e1706f41a1f9a6e17',
  independentReviewPath:'research/class-mapping-source-epoch-v1/monetary-question-kernel-contract-pin-independent-review-v1.json',
  independentReviewSha256:'56e1a9e23b5eab27adca4804fc17c438d17f374376add8cdf8379468b0017169',
  replacementOccurrences:1,
  exactByteReplacementOnly:true,
  sourceOrGradeLogicChanged:false,
  semanticApproval:false,
});

export const CURRENT_MONETARY_SOURCE_INDEX_PATH='research/monetary-source-inventory.json';
export const CURRENT_MONETARY_SOURCE_INDEX_SHA256='0d176306cd20dadb6fd34654deae201be8bd59de493888e9ac0f34f9740ef56f';
export const CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH='research/monetary-source-render-frames.json';
export const CURRENT_MONETARY_SOURCE_RENDER_FRAMES_SHA256='29e0ee3ae3cdaf304b67ca99fe7c51a391e7a1b44b63f12aa9258ce02fed3af7';
export const CURRENT_MONETARY_SOURCE_QUESTION_CONTRACT_PATH='research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json';
export const CURRENT_MONETARY_SOURCE_QUESTION_CONTRACT_SHA256='6f63999336bb41703ca608c3661131fb496c96f6983a8e0e1706f41a1f9a6e17';
export const CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_PATH='research/class-mapping-source-epoch-v1/monetary-question-kernel-contract-pin-independent-review-v1.json';
export const CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_SHA256='56e1a9e23b5eab27adca4804fc17c438d17f374376add8cdf8379468b0017169';
export const CURRENT_MONETARY_INDEX_DEPENDENCY_ARRAYS=Object.freeze([
  Object.freeze({pointer:'/inputArtifacts',role:'current-index-input-artifact',expectedLength:8}),
  Object.freeze({pointer:'/currentInputValidation/validationArtifacts',role:'current-validation-artifact',expectedLength:1098}),
]);
export const CURRENT_MONETARY_INDEX_DEPENDENCY_COUNTS=Object.freeze({references:1106,uniquePaths:1104,duplicatePathReferences:2});

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
  "research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",
  "research/class-mapping-current-adapters-v1/jo-registered-equipment-v1.json.gz",
  "research/dmg175-source-metadata-v1/monetary-provenance-migration-proof-v1.json",
  "research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json",
  "research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/validation/ua26-marker-full-catalog-diff-h-v1.json",
  "research/hirelings-native-h-v1/source-body-handoff-transition-v1.json",
  "research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json",
  "research/source-audit-batch5-monetary-assassination-focus-falsepasses-extension.json",
  "research/source-audit-batch5-monetary-context-crop-findings-extension.json",
  "research/source-audit-batch5-monetary-context-migration-before-v5.json",
  "research/source-audit-batch5-monetary-deck-gem-owner-extension.json",
  "research/source-audit-batch5-monetary-full179-new-findings-extension.json",
  "research/source-audit-batch5-monetary-fur-context-extension.json",
  "research/source-audit-batch5-monetary-not-gem-qualifier-extension.json",
  "research/source-audit-batch5-monetary-preserved-focus-falsepasses-extension.json",
  "research/source-audit-batch5-monetary-producer-anchor-correction-dmg-gem-increase.json",
  "research/source-audit-batch5-monetary-provenance-before.json",
  "research/source-audit-batch5-monetary-provenance-finding-extension.json",
  "research/source-audit-batch5-monetary-retained-uncertainties.json",
  "research/source-audit-batch5-monetary-row-identity-armor-extension.json",
  "research/source-audit-batch5-monetary-row-identity-baseline.json",
  "research/source-audit-batch5-monetary-row-identity-complete-qa-extension.json",
  "research/source-audit-batch5-monetary-whale-unit-finding-extension-v3.json",
  "research/source-audit-batch5-pd179-henchman-typed-finding-extension.json",
  "research/source-audit-batch5-pd179-info-condition-finding.json",
  "research/source-audit-batch5-pd179-poison-context-finding-normalized.json",
  "research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json",
  "research/source-audit-batch5-pd179-v5-crop-frame-bindings-independent-review.json",
  "research/source-audit-batch5-pd179-v5-fresh-frame-replay-independent-review.json",
  "research/source-audit-batch5-phb123-ancillary-context-disposition-independent-review.json",
  "research/source-audit-batch5-phbdmg-final-source-findings-extension.json",
  "research/source-audit-batch5-ua-context-obligations-extension.json",
  "research/source-audit-batch5-ua-double-star-tokenization-extension.json",
  "research/source-audit-batch5-ua-e4-focus-containment-extension.json",
  "research/source-audit-batch5-ua-four-crop-boundary-findings.json",
  "research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json",
  "research/source-audit-batch5-ua26-context-proposal.json",
  "research/source-audit-batch5-ua26-current-row-append.json",
  "research/source-audit-batch5-ua26-marker-correction.json",
  "research/source-audit-batch5-ua26-note-associations-before-correction.json",
  "research/source-audit-batch5-underlying-source-question-interpretation.json",
  "research/source-audit-batch5-whale-unit-before-v2.json",
  "research/source-audit-batch5-whale-unit-current-disposition.json",
  "research/source-audit-batch6-jo-locator-frame-derivation.json",
  "research/source-audit-batch6-jo-mapping-independent-review.json",
  "research/source-audit-batch6-jo-source-row-proof.json",
  "research/source-audit-batch6-jo-ua26-alias-append.json",
  "research/source-audit-batch6-jo-unextracted-price.json",
  "research/source-audit-batch6-mammoth-detector-clarification.json",
  "research/source-audit-batch6-mammoth-root-independent-review.json",
  "research/source-audit-batch6-mammoth-source-proof.json",
  "research/source-audit-batch6-retained-source-first-review.json",
  "research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json",
  "research/source-audit-pass8-ua-source-body-handoff-transition-v1.json",
  "research/source-audit-pass8-ua-source-current-monetary-source-questions-v1.json",
  "research/source-audit-pass8-ua28-caption-metadata-independent-review-v1.json",
  "research/ua28-field-target-review-v1/independent-review-evidence-v1.json",
  "tests/fixtures/equipment-before-jo.json.gz",
  "tests/fixtures/equipment-ua-caltrop-before-jo.json.gz",
  "tests/fixtures/mammoth-derived-valuation-before.json",
  "tests/fixtures/mammoth-retained-question-records-before.json",
  "tests/fixtures/monetary-source-phbdmg-179-before.json.gz",
  "tests/fixtures/monetary-source-ua-583-before.json.gz",
  "tools/dmg175-current-monetary-source-questions-v1.mjs",
  "tools/monetary-current-source-questions.mjs",
  'research/citation-binding-scope-audit.json',
  'research/equipment-price-context-baseline.json',
  'research/citation-navigation-coverage.json',
  CURRENT_MONETARY_SOURCE_INDEX_PATH,
  CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH,
  CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_PATH,
]);
export const REPORT_DATA_EXPECTED_SHA256=Object.freeze({
  ['research/citation-binding-scope-audit.json']:'29656726b2bf5ba6f5fb21e33a81ce9c1bcba0264a667f8e5d90ee8f9b62f95d',
  ['research/equipment-price-context-baseline.json']:'8ae3c95fd9746d827c061eb9fca24266c9253234bf3e0b9ea72ebc0f861f972d',
  ['research/citation-navigation-coverage.json']:'f3308a5a0bee71545da6567ca9e8a6f6b905dc4bb3967e497bccb3ed70132749',

  [CURRENT_MONETARY_SOURCE_INDEX_PATH]:CURRENT_MONETARY_SOURCE_INDEX_SHA256,
  [CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH]:CURRENT_MONETARY_SOURCE_RENDER_FRAMES_SHA256,
  [CURRENT_MONETARY_SOURCE_QUESTION_CONTRACT_PATH]:CURRENT_MONETARY_SOURCE_QUESTION_CONTRACT_SHA256,
  [CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_PATH]:CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_SHA256,
  ["research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json"]:"9fd26ebccaa5211bdcac50e33ed2f4debc160b93aa0c4bee41d0603058915fdf",
  ["research/class-mapping-current-adapters-v1/jo-registered-equipment-v1.json.gz"]:"06f2f6b02c6a3527644808b2e021e1cd56d18b40ade90a6603a1ace73dd3030b",
  ["research/dmg175-source-metadata-v1/monetary-provenance-migration-proof-v1.json"]:"2a23bd6d7d9084e5b6f6ee61fd525b8d96ddae97499dac83d1e7252cad6f2a92",
  ["research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json"]:"477a06a2d1fe0f3e87d4e02f60604532aa3aaeebe5e50a68c8cb27bc959bd2c3",
  ["research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/validation/ua26-marker-full-catalog-diff-h-v1.json"]:"22fdb51eca0ea89b67ccf9578d412e6bb2b3b4f16d4d8111d3ad637566881403",
  ["research/hirelings-native-h-v1/source-body-handoff-transition-v1.json"]:"644992717168c73584a4d30084237aa253fcc5f9143b288a41f1ca6ba8bc4575",
  ["research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json"]:"81418abaf817005269f87bf000509b04133f3701cd5a4188830119a5a377989b",
  ["research/source-audit-batch5-monetary-assassination-focus-falsepasses-extension.json"]:"28327666ba55cfa64cd5d32292d0b0b4275e5a3a8834c4bc9e3bd82bc4baa706",
  ["research/source-audit-batch5-monetary-context-crop-findings-extension.json"]:"0e78bf1f08b9af7072c545292d9706688d6f7ef489d6b9297a02a55793868795",
  ["research/source-audit-batch5-monetary-context-migration-before-v5.json"]:"b2021c1b040a0fa3b0d16e19b5b25d2efba2a96d3d87bc12600dca1015619b04",
  ["research/source-audit-batch5-monetary-deck-gem-owner-extension.json"]:"5c6d9714e1db806dab95b669c4f469e8bfd23519f33a8442a00c18bcdd9bc101",
  ["research/source-audit-batch5-monetary-full179-new-findings-extension.json"]:"05fd4aba3f38a9c216fe9f63d716d2e77b483e49d7588d30482aa85dd264b1a0",
  ["research/source-audit-batch5-monetary-fur-context-extension.json"]:"e3067fea87c334918233e71b610ac8b1b530083efc8def120f47644eb2444424",
  ["research/source-audit-batch5-monetary-not-gem-qualifier-extension.json"]:"d0aec209f04827f39877509420018ebbfa4269a7e30c2be948e7e5b8cf3b3afd",
  ["research/source-audit-batch5-monetary-preserved-focus-falsepasses-extension.json"]:"67e95af41ce44e4ae8ab4ab467b095e0bc0288950bb71a5a1481545259d56b9c",
  ["research/source-audit-batch5-monetary-producer-anchor-correction-dmg-gem-increase.json"]:"933c4dac5fbd77ac6324e79e9e7322dc2aecbfb4129086ce497ff1bec40b3c9d",
  ["research/source-audit-batch5-monetary-provenance-before.json"]:"bc92fbb7a811055b620577125812f066484861cf948aa192d90d3203014a8e53",
  ["research/source-audit-batch5-monetary-provenance-finding-extension.json"]:"996eae6a319e4ae40fd3d3e06176dbe921cedcbaeae5b90396fcfd44e195d36e",
  ["research/source-audit-batch5-monetary-retained-uncertainties.json"]:"93c9547479b8632bc8631c83a5e5496118b3580f516aa2c4cbb2a5515d19ee00",
  ["research/source-audit-batch5-monetary-row-identity-armor-extension.json"]:"dc3353be03fdebe47103568a5df52497e55844a9050baa63cd680cef78f5af60",
  ["research/source-audit-batch5-monetary-row-identity-baseline.json"]:"bd4973e1eca69a56b64adf3758ccce3683783815dea38bb8ca6ec9f33e898bb9",
  ["research/source-audit-batch5-monetary-row-identity-complete-qa-extension.json"]:"72ca57f64da14a89f3240a34e3d58585a7e2fcc8765fad16821e50220cc69fb0",
  ["research/source-audit-batch5-monetary-whale-unit-finding-extension-v3.json"]:"3af12d6ace08916d8f240cc0744ce1a70833684c23128520f4d378070ce0c423",
  ["research/source-audit-batch5-pd179-henchman-typed-finding-extension.json"]:"327e525c87252872e7d344526a69a29cccba1b69b0560fc17d90db73f59243aa",
  ["research/source-audit-batch5-pd179-info-condition-finding.json"]:"074ee50e8ca91962f318c4e66095ab4be73977ecf0d04bbcae9e2552247d5d48",
  ["research/source-audit-batch5-pd179-poison-context-finding-normalized.json"]:"757d17a67f905f39084e10152df61c8d48fd97e4ab75667ba3aaaa6d495f33b7",
  ["research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"]:"418c49fe2647734015e81c8256b136a2277714b5abfc0e037fcaf1c27a211fb2",
  ["research/source-audit-batch5-pd179-v5-crop-frame-bindings-independent-review.json"]:"e04274a0aa8e04ee0a09962c24ed2290c6e3e5e5d92ef79aad38caf625147eee",
  ["research/source-audit-batch5-pd179-v5-fresh-frame-replay-independent-review.json"]:"931ecd38e8dc2660e200e1d4fb5a8f8e3721801e5d4f67020aaee329da8e9106",
  ["research/source-audit-batch5-phb123-ancillary-context-disposition-independent-review.json"]:"204f08dd75f8083a23d34c51df6b7569f21dc8a208fee1e79cacc451c6aebce1",
  ["research/source-audit-batch5-phbdmg-final-source-findings-extension.json"]:"179d676706175be50675430438c0dd5e4aa0d715da035bd128d416e27877b7ef",
  ["research/source-audit-batch5-ua-context-obligations-extension.json"]:"e3b866e11ca94ec7626a03287301e9870fbc55d7a6c6858c12f31539ee730335",
  ["research/source-audit-batch5-ua-double-star-tokenization-extension.json"]:"d88bc09449c2add149815cf317573b3317df9403816d43b8d247633f3446eed9",
  ["research/source-audit-batch5-ua-e4-focus-containment-extension.json"]:"e80345eda9a36c681d23d2bb190f1f0f9be55dea9b8a0c648cfc8fd5e4aac5a3",
  ["research/source-audit-batch5-ua-four-crop-boundary-findings.json"]:"1058d95e426ca5d1c2eea3c229dcac43769eb0b0c8435540b686b42444f2265e",
  ["research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"]:"1c8f53a21fbf95239b59c24a8bd4067a740ae57b93993cf31b79ee79a4487f3b",
  ["research/source-audit-batch5-ua26-context-proposal.json"]:"6257a939f3e8d961949f2a776149e1be2823d5e7c12817989f4eadc1a78937ae",
  ["research/source-audit-batch5-ua26-current-row-append.json"]:"622de82d1c7c44e0ef78612535d4bb4d5ce025ddf02fc8fffb0527cc8532c1ca",
  ["research/source-audit-batch5-ua26-marker-correction.json"]:"8bff58b97b34b3d4de085dc4bf33acbdd0508a645e438211f1a03172c2be73db",
  ["research/source-audit-batch5-ua26-note-associations-before-correction.json"]:"bc22a5eabbb5bc99b3156a89f78cfaed9549a1a8750a63daab13fb7a6a1d5d78",
  ["research/source-audit-batch5-underlying-source-question-interpretation.json"]:"6afe2f5fcfade1febf0e1b85baeaea6583475accde94f26b53d4f8612650dbde",
  ["research/source-audit-batch5-whale-unit-before-v2.json"]:"e0933aa556034bc48aa60d7cf9dba1c44b0d35fa71c4a04dbf15562586578b81",
  ["research/source-audit-batch5-whale-unit-current-disposition.json"]:"2de63cc9de8bb2dd884b6d188814a0571c8d73cd052baa64e53da3005750b32e",
  ["research/source-audit-batch6-jo-locator-frame-derivation.json"]:"44dc37708820df9041b8b2012187f1988385214732c3e4484d80727d63d68168",
  ["research/source-audit-batch6-jo-mapping-independent-review.json"]:"2393845114b9a2b9d29518c8464374b1e7312efd61dfbf68ace17afd4e3ed95c",
  ["research/source-audit-batch6-jo-source-row-proof.json"]:"f919798c63d20a69605b7c2ac095acfe7bf9f4ec56ab7b767af3601f93ad2859",
  ["research/source-audit-batch6-jo-ua26-alias-append.json"]:"b4543a10401a150a70273b803205c07976d0d57fc84766ac9a0d19d327b36f0f",
  ["research/source-audit-batch6-jo-unextracted-price.json"]:"1e24b97d355cf2502a2f775d093652cf37675907aae8ffdc63d432d8908df5f5",
  ["research/source-audit-batch6-mammoth-detector-clarification.json"]:"270df2b2930d6ec6dc4808eebb4f60e6e68dad1f79d153b55d5b5df9f703f3b7",
  ["research/source-audit-batch6-mammoth-root-independent-review.json"]:"b6b7a535eff8ad5c16a157f8b7b7aef796b4e5f3262c7baca5a435e719e01368",
  ["research/source-audit-batch6-mammoth-source-proof.json"]:"6e0b3cacd78475c6c7dc38ae40834a13a6996af56dd9afc45c9cf57a19b7ad1b",
  ["research/source-audit-batch6-retained-source-first-review.json"]:"3e3c02c5c0f139417375fbd675fe169571dcdc691fcfd7dd2d8fe59c417a7d34",
  ["research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json"]:"56cd03c646e971adcd5f5240849b17606b9d07e2cc6b397a75cb75f7495efbe3",
  ["research/source-audit-pass8-ua-source-body-handoff-transition-v1.json"]:"f79f4e38d79eff161748e683461b377508d2feff95f86833ba41853370025c05",
  ["research/source-audit-pass8-ua-source-current-monetary-source-questions-v1.json"]:"864ae05ad5eab345e299a128b6b43c9a364bec7f9fee113ea409078c9afd4b0c",
  ["research/source-audit-pass8-ua28-caption-metadata-independent-review-v1.json"]:"49dafe92a8add4e32b66d2bb9f6a39d773db054be1bf9632d7c4bbf4e5b8fcd1",
  ["research/ua28-field-target-review-v1/independent-review-evidence-v1.json"]:"96289241276133718f10b7f1fff5b0aa69a1f092fb749bd093aea993ee0e1a2c",
  ["tests/fixtures/equipment-before-jo.json.gz"]:"0a240c8377fae92b5e811d6218b22ae9cd7d92079b3ca1c6fa47a6d2f8b8ae5e",
  ["tests/fixtures/equipment-ua-caltrop-before-jo.json.gz"]:"2d6df81d94da813f534ade330c384d52557d9a13c6d98c0a6f2296c595d9d286",
  ["tests/fixtures/mammoth-derived-valuation-before.json"]:"51c27feaba639f8a8b91009308cbb39510ac453b076758d9652387c81f7564f8",
  ["tests/fixtures/mammoth-retained-question-records-before.json"]:"4dfec9ac53bc3419effa3d1817c307e049a2f811e4ed5124067e2856328ab73c",
  ["tests/fixtures/monetary-source-phbdmg-179-before.json.gz"]:"43b0846cfadd33479f032552950cb18318527d5fbe748e6c5a1e46e9a099bcdb",
  ["tests/fixtures/monetary-source-ua-583-before.json.gz"]:"06aef3a43e8c8e4c511c9541b23033a26ce893910920db182d6fc510c86fc2c0",
  ["tools/dmg175-current-monetary-source-questions-v1.mjs"]:"b234e164e14218be1e130554016e51d36dd685bccb18ae40f5bc5c01e7ee0139",
  ["tools/monetary-current-source-questions.mjs"]:"72c9d2b1992ac0960cea8c3e8855a141339142b0ed32bfe194c933491948bc9e",
});
export const REPORT_DATA_POINTER_EDGES = Object.freeze([
  Object.freeze({sourcePath:'research/source-audit-batch5-current-finding-disposition-registration.json',pointer:'/migrationBridge',targetPath:'research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json'}),
  Object.freeze({sourcePath:'research/source-audit-batch5-current-finding-disposition-registration.json',pointer:'/authorityAvailability',targetPath:'research/source-audit-batch5-existing-approval-195-registration-availability-independent-review.json'}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/0",targetPath:"tools/dmg175-current-monetary-source-questions-v1.mjs"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/1",targetPath:"tools/monetary-current-source-questions.mjs"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/2",targetPath:"research/source-audit-pass8-dmg175-source-current-monetary-source-questions-v1.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/3",targetPath:"research/source-audit-pass8-ua-source-current-monetary-source-questions-v1.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/4",targetPath:"research/source-audit-batch5-monetary-retained-uncertainties.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/5",targetPath:"research/source-audit-batch5-underlying-source-question-interpretation.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/6",targetPath:"tests/fixtures/mammoth-retained-question-records-before.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/7",targetPath:"tests/fixtures/mammoth-derived-valuation-before.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/8",targetPath:"research/source-audit-batch6-mammoth-detector-clarification.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/9",targetPath:"research/source-audit-batch6-mammoth-root-independent-review.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/10",targetPath:"research/source-audit-batch6-mammoth-source-proof.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/11",targetPath:"research/source-audit-batch6-retained-source-first-review.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/sealedHistoricalArtifacts/12",targetPath:"research/dmg175-source-metadata-v1/monetary-provenance-migration-proof-v1.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json",pointer:"/historicalRegister",targetPath:"research/source-audit-batch5-monetary-retained-uncertainties.json"}),
  Object.freeze({sourcePath:"research/hirelings-current-next-batch-v1/native-monetary-successor-v2/version29-monetary-questions-actual-projection-baseline-v2.json",pointer:"/value/records/2/integrationReview",targetPath:"research/source-audit-batch6-mammoth-root-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/baseline",targetPath:"research/source-audit-batch5-monetary-row-identity-baseline.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/0",targetPath:"research/source-audit-batch5-monetary-row-identity-armor-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/1",targetPath:"research/source-audit-batch5-monetary-row-identity-complete-qa-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/2",targetPath:"research/source-audit-batch5-monetary-not-gem-qualifier-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/3",targetPath:"research/source-audit-batch5-monetary-preserved-focus-falsepasses-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/4",targetPath:"research/source-audit-batch5-monetary-assassination-focus-falsepasses-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/5",targetPath:"research/source-audit-batch5-monetary-full179-new-findings-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/6",targetPath:"research/source-audit-batch5-monetary-context-crop-findings-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/7",targetPath:"research/source-audit-batch5-monetary-provenance-finding-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/8",targetPath:"research/source-audit-batch5-monetary-deck-gem-owner-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/9",targetPath:"research/source-audit-batch5-ua-context-obligations-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/10",targetPath:"research/source-audit-batch5-ua-double-star-tokenization-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/11",targetPath:"research/source-audit-batch5-monetary-fur-context-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/12",targetPath:"research/source-audit-batch5-monetary-whale-unit-finding-extension-v3.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/13",targetPath:"research/source-audit-batch5-phbdmg-final-source-findings-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/14",targetPath:"research/source-audit-batch5-pd179-henchman-typed-finding-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/15",targetPath:"research/source-audit-batch5-ua-e4-focus-containment-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/16",targetPath:"research/source-audit-batch5-pd179-poison-context-finding-normalized.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/17",targetPath:"research/source-audit-batch5-ua-four-crop-boundary-findings.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/extensions/18",targetPath:"research/source-audit-batch5-pd179-info-condition-finding.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/retainedUncertainties",targetPath:"research/source-audit-batch5-monetary-retained-uncertainties.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-findings.json",pointer:"/contextMigrationBridge",targetPath:"research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json",pointer:"/originalSourceArchive",targetPath:"tests/fixtures/monetary-source-ua-583-before.json.gz"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json",pointer:"/sourceSnapshot",targetPath:"research/source-audit-batch5-monetary-context-migration-before-v5.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json",pointer:"/sourceAdapter/dependencies/1",targetPath:"research/monetary-source-render-frames.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json",pointer:"/sourceAdapter/dependencies/2",targetPath:"research/source-audit-batch5-pd179-v5-fresh-frame-replay-independent-review.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json",pointer:"/sourceAdapter/dependencies/3",targetPath:"research/source-audit-batch5-pd179-v5-crop-frame-bindings-independent-review.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-ua-context-fingerprint-migration-bridge-v5.json",pointer:"/migrations/0/originalFindingArtifact",targetPath:"research/source-audit-batch5-monetary-row-identity-complete-qa-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/0/evidence",targetPath:"research/source-audit-batch5-whale-unit-current-disposition.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/1/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/2/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/3/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/4/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/5/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/6/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/7/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/8/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/9/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/10/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/11/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/12/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/13/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/14/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/15/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/16/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/17/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/18/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/19/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/20/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/21/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/22/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/23/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/24/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/25/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/26/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/27/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/28/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/29/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/30/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/31/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/32/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/33/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/34/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/35/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/36/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/37/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/38/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/39/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/40/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/41/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/42/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/43/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/44/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/45/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/46/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/47/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/48/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/49/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/50/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/51/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/52/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/53/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/54/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/55/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/56/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/57/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/58/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/59/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/60/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/61/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/62/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/63/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/64/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/65/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/66/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/67/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/68/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/69/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/70/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/71/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/72/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/73/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/74/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/75/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/76/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/77/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/78/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/79/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/80/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/81/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/82/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/83/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/84/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/85/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/86/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/87/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/88/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/89/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/90/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/91/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/92/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/93/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/94/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/95/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/96/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/97/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/98/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/99/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/100/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/101/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/102/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/103/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/104/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/105/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/106/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/107/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/108/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/109/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/110/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/111/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/112/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/113/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/114/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/115/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/116/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/117/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/118/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/119/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/120/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/121/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/122/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/123/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/124/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/125/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/126/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/127/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/128/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/129/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/130/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/131/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/132/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/133/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/134/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/135/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/136/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/137/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/138/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/139/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/140/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/141/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/142/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/143/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/144/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/145/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/146/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/147/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/148/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/149/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/150/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/151/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/152/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/153/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/154/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/155/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/156/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/157/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/158/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/159/evidence",targetPath:"research/source-audit-batch5-phb123-ancillary-context-disposition-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/160/evidence",targetPath:"research/source-audit-batch5-phb123-ancillary-context-disposition-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/161/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/162/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/163/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/164/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/165/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/166/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/167/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/168/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/169/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/170/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/171/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/172/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/173/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/174/evidence",targetPath:"research/source-audit-batch5-ua-double-star-tokenization-extension.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/175/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/176/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/177/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/178/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/179/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/180/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/181/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/182/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/183/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/184/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/185/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/186/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/187/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/188/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/189/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/190/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/191/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/192/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/193/evidence",targetPath:"research/source-audit-batch5-ua-v3k-integration-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/194/evidence",targetPath:"research/source-audit-batch5-pd179-v5-aggregate-readiness-independent-review.json"}),
  Object.freeze({sourcePath:"research/monetary-row-identity-reviews.json",pointer:"/reviews/162/provenanceArtifact",targetPath:"research/source-audit-batch5-monetary-producer-anchor-correction-dmg-gem-increase.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-monetary-provenance-finding-extension.json",pointer:"/knownFindings/0/provenanceArtifact",targetPath:"research/source-audit-batch5-monetary-provenance-before.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch6-jo-unextracted-price.json",pointer:"/beforeEquipment",targetPath:"tests/fixtures/equipment-before-jo.json.gz"}),
  Object.freeze({sourcePath:"research/source-audit-batch6-jo-unextracted-price.json",pointer:"/historicalFourNoteReceipt",targetPath:"research/source-audit-batch5-null-price-notes.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch6-jo-unextracted-price.json",pointer:"/sourceProofs/0",targetPath:"research/source-audit-batch6-jo-mapping-independent-review.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch6-jo-unextracted-price.json",pointer:"/sourceProofs/1",targetPath:"research/source-audit-batch6-jo-source-row-proof.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.template.json",pointer:"/inheritedHistoricalQualification",targetPath:"research/source-audit-pass8-ua-source-body-handoff-transition-v1.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/ua26-marker-current-contract-v1.json",pointer:"/historicalHTransition/registry",targetPath:"research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/ua26-marker-current-contract-v1.json",pointer:"/historicalHTransition/diffProof",targetPath:"research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/validation/ua26-marker-full-catalog-diff-h-v1.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/ua26-marker-current-contract-v1.json",pointer:"/legacyMarkerReceipt",targetPath:"research/source-audit-batch5-ua26-marker-correction.json"}),
  Object.freeze({sourcePath:"research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json",pointer:"/catalogTransitionQualification/reviews/fieldTarget",targetPath:"research/ua28-field-target-review-v1/independent-review-evidence-v1.json"}),
  Object.freeze({sourcePath:"research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json",pointer:"/catalogTransitionQualification/reviews/noteCaption",targetPath:"research/source-audit-pass8-ua28-caption-metadata-independent-review-v1.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-ua26-marker-correction.json",pointer:"/frozenInputs/contextProposal",targetPath:"research/source-audit-batch5-ua26-context-proposal.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch5-ua26-marker-correction.json",pointer:"/frozenInputs/beforeAssociationSnapshot",targetPath:"research/source-audit-batch5-ua26-note-associations-before-correction.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch6-jo-ua26-alias-append.json",pointer:"/sourcePeer",targetPath:"research/source-audit-batch6-jo-mapping-independent-review.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch6-jo-ua26-alias-append.json",pointer:"/frameDerivation",targetPath:"research/source-audit-batch6-jo-locator-frame-derivation.json"}),
  Object.freeze({sourcePath:"research/source-audit-batch6-jo-ua26-alias-append.json",pointer:"/caltropCatalogExtension/before",targetPath:"tests/fixtures/equipment-ua-caltrop-before-jo.json.gz"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",pointer:"/semanticParent",targetPath:"research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",pointer:"/predecessor",targetPath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",pointer:"/historicalWitness/legacyRegistration",targetPath:"research/source-audit-batch6-jo-unextracted-price.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",pointer:"/historicalWitness/registeredEquipment/archive",targetPath:"research/class-mapping-current-adapters-v1/jo-registered-equipment-v1.json.gz"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",pointer:"/historicalWitness/beforeEquipment",targetPath:"tests/fixtures/equipment-before-jo.json.gz"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",pointer:"/historicalWitness/fourNoteReceipt",targetPath:"research/source-audit-batch5-null-price-notes.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",pointer:"/historicalWitness/sourceProofs/0",targetPath:"research/source-audit-batch6-jo-mapping-independent-review.json"}),
  Object.freeze({sourcePath:"research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json",pointer:"/historicalWitness/sourceProofs/1",targetPath:"research/source-audit-batch6-jo-source-row-proof.json"}),
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
  {order:2,stage:'after materialized consumer seal and before report-output commit',producer:'tools/class-mapping-report-producers-v2.mjs',invocation:'node tools/class-mapping-report-producers-v2.mjs --source-dir <absolute-private-PDF-directory> --python-executable <absolute-physical-executable>',outputs:'21 core-native reports plus 4 current-adapter reports (25 fresh report outputs total); the separately sealed pre-seal transition receipt is already present',pathSupport:'one fixed-path run produces all report outputs exclusively; checks S1/current-seal identity, QCC and physical data, all 19 adapter review pins, and the typed monetary-index dependency arrays; no semantic or metric waiver'},
  {order:3,stage:'after all 25 fresh reports exist but before any of them is committed',producer:'tools/bind-class-mapping-source-audit-input-commit-v2.mjs',invocation:'node tools/bind-class-mapping-source-audit-input-commit-v2.mjs --qualifier-code-commit <actual-QCC-commit>',outputs:'research/class-mapping-source-epoch-v1/metadata-stage-v2.json',pathSupport:'buildClassMappingReportReceipt requires the 25 fresh output blobs to remain absent from S1, QCC, and current HEAD while checking their exact physical bytes; it binds the separately sealed transition receipt'},
  {order:4,stage:'single metadata commit after receipt generation',producer:'repository commit containing all report metadata',invocation:'commit the 25 fresh report outputs and metadata-stage-v2.json together; then invoke verifyCommittedClassMappingReportReceipt() with no arguments',outputs:'one commit containing 25 report outputs plus the report-input receipt',pathSupport:'post-commit verifier rederives exact raw-QCC, physical, source-body, data-array, current-seal, and output pins with output presence allowed only after receipt creation'},
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
