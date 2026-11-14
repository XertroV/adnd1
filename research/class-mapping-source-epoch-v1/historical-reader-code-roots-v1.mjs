// Fixed additive historical module roots, separate from QCC report producers.
import {posix} from 'node:path';
export const HISTORICAL_CODE_ROOTS=Object.freeze([
 'research/class-mapping-source-epoch-v1/closed-historical-reader-v1.mjs',
 'research/class-mapping-source-epoch-v1/historical-projection-kernel-v2.mjs',
 'research/class-mapping-source-epoch-v1/historical-reader-code-roots-v1.mjs',
 'research/class-mapping-source-epoch-v1/historical-reader-auxiliary-policy-v1.mjs',
 'research/class-mapping-history-v1/closed-version29-reader-class-mapping-v1.mjs',
 'research/class-mapping-history-v1/historical-controlled-git-v1.mjs',
 'research/class-mapping-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs',
 'research/class-mapping-history-v1/source-postmetadata-facade-v1/ua-source-batch6-jo-fixture-v1.proposed.mjs',
 'research/class-mapping-history-v1/source-postmetadata-facade-v2/pass8-ua-source-history-v2.proposed.mjs',
 'research/class-mapping-history-v1/source-postmetadata-facade-v2/ua-source-batch6-jo-fixture-v2.proposed.mjs',
 'research/class-mapping-history-v1/source-postmetadata-facade-v2/jo-closed-loader-context-v1.mjs',
 'research/class-mapping-history-v1/history-recovery-v1/dmg175-equipment-epoch-outer-v2.proposed.mjs',
 'research/class-mapping-history-v1/history-recovery-v1/dmg175-equipment-context-v28.mjs',
 'tests/helpers/class-mapping-historical-test-inputs-v1.mjs',
 'tests/helpers/class-mapping-historical-mm-test-inputs-v1.mjs',
 'research/class-mapping-history-v1/replay-tools/citation-context-contract.mjs',
 'research/class-mapping-history-v1/replay-tools/citation-override-identity.mjs',
 'research/class-mapping-history-v1/replay-tools/citation-region-role.mjs',
 'research/class-mapping-history-v1/replay-tools/class-xp-continuation-target-review.mjs',
 'research/class-mapping-history-v1/replay-tools/continuation-alias-audit.mjs',
 'research/class-mapping-history-v1/replay-tools/continuation-candidates-validate.mjs',
 'research/class-mapping-history-v1/replay-tools/mechanics-audit.mjs',
 'research/class-mapping-history-v1/replay-tools/mechanics-citation-page-transfer.mjs',
 'research/class-mapping-history-v1/replay-tools/price-source-inventory.mjs',
 'research/class-mapping-history-v1/replay-tools/scan-catalog.mjs',
 'research/class-mapping-history-v1/replay-tools/source-frame-coordinate-bridge.mjs',
 'research/class-mapping-history-v1/replay-tools/source-owner-identity-audit.mjs',
 'research/class-mapping-history-v1/replay-tools/source-raster-coverage.mjs',
 'research/class-mapping-history-v1/replay-tools/source-scan-inventory.mjs',
 'research/class-mapping-history-v1/replay-tools/source-target-label-audit.mjs',
 'research/class-mapping-history-v1/mm-replay-io-contract-v1.mjs',
 'research/class-mapping-history-v1/mm-replay-fs-v1.mjs',
 'research/class-mapping-history-v1/mm-replay-fs-promises-v1.mjs',
 'research/class-mapping-history-v1/mm-replay-child-process-v1.mjs',
 'tools/replay-historical-mm-native-tests-v1.mjs',
 'tools/run-class-mapping-tests-v1.mjs',
 'tools/verify-class-mapping-current-reports-v1.mjs',
 'research/class-mapping-history-v1/replay-tools/citation-systemic-inventory.mjs',
 'research/class-mapping-history-v1/replay-tools/continuation-contract.mjs',
 'research/class-mapping-history-v1/replay-tools/continuation-order-audit.mjs',
 'research/class-mapping-history-v1/replay-tools/dmg175-hired-native-source-handoff-v2.mjs',
 'research/class-mapping-history-v1/replay-tools/dmg175-source-handoff-transition-v1.mjs',
 'research/class-mapping-history-v1/replay-tools/jo-unextracted-price-registration.mjs',
 'research/class-mapping-history-v1/replay-tools/mm-current-safe-json-v1.mjs',
 'research/class-mapping-history-v1/replay-tools/monetary-context-extent-contract.mjs',
 'research/class-mapping-history-v1/replay-tools/monetary-row-identity-audit.mjs',
 'research/class-mapping-history-v1/replay-tools/monetary-source-geometry.mjs',
 'research/class-mapping-history-v1/replay-tools/monetary-source-inventory.mjs',
 'research/class-mapping-history-v1/replay-tools/monetary-source-render-frames.mjs',
 'research/class-mapping-history-v1/replay-tools/native-h-epoch-guard-v2.mjs',
 'research/class-mapping-history-v1/replay-tools/quantity-source-absence-audit.mjs',
 'research/class-mapping-history-v1/replay-tools/source-visual-coverage.mjs',
 'research/class-mapping-history-v1/replay-tools/source-visual-dispositions.mjs',
 'research/class-mapping-history-v1/replay-tools/ua-source-handoff-transition.mjs',
 'research/class-mapping-history-v1/replay-test-helpers/batch6-dmg175-source-history.mjs',
 'research/class-mapping-history-v1/replay-test-helpers/pass8-character-reference-history.mjs',
 'research/class-mapping-history-v1/replay-test-helpers/pass8-citation-target-crop-history.mjs',
 'research/class-mapping-history-v1/replay-test-helpers/pass8-phb-source-history.mjs',
 'research/class-mapping-history-v1/replay-test-helpers/pass8-ua-source-history.mjs',
 'research/class-mapping-history-v1/replay-test-helpers/pass8-weapon-source-history.mjs',
 'research/class-mapping-history-v1/replay-test-helpers/pass8-xp-continuation-history.mjs',
 'research/class-mapping-history-v1/replay-test-helpers/ua-source-dmg74-matrix-batch.mjs',
 'research/class-mapping-history-v1/replay-tools/coverage-gaps.mjs',
 'research/class-mapping-history-v1/replay-tools/refresh-gaps-handoff.mjs',
 'research/class-mapping-history-v1/replay-tools/source-report-consistency-audit.mjs',
 'research/class-mapping-history-v1/replay-tools/source-completeness-coverage.mjs',
 'research/class-mapping-history-v1/replay-tools/monetary-unit-provenance-audit.mjs',
 'research/class-mapping-history-v1/replay-tools/dmg175-current-successors-mm-v1.mjs',
 'research/class-mapping-history-v1/replay-tools/dmg175-current-jo-source-gap-mm-v1.mjs',
 'research/class-mapping-history-v1/replay-tools/dmg175-current-source-handoff-mm-v1.mjs',
 'research/class-mapping-history-v1/replay-tools/dmg175-current-monetary-source-questions-mm-v1.mjs',
 'research/class-mapping-history-v1/replay-tools/monetary-current-source-questions.mjs',
 'research/class-mapping-history-v1/replay-kernels/native-monetary-source-questions-kernel-mm-v1.mjs',
 'research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/whale-counterfactual-context-v5.mjs',
 'research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/dmg175-h-native-jo-test-context-shim-v5.mjs',
 'tests/fixtures/source-report-consistency-record-target-old-helper-before.mjs',
 'tests/fixtures/source-report-consistency-record-target-partial-helper-before.mjs',
 'tests/fixtures/weapon-source-report-consistency-before.mjs',
 'research/class-mapping-history-v1/replay-tools/dmg175-availability-projection.mjs',
 'tests/class-mapping-current-jo-gap-v2.test.mjs',
 'tests/class-mapping-current-handoff-builder-v1.test.mjs',
 'tests/class-mapping-current-report-phase-interface-v1.test.mjs',
 // This test reads/parses the actual assembly source as a fixed code input.
 'tools/assemble-class-mapping-v1.mjs',
 'tests/class-mapping-current-handoff-alias-v1.test.mjs',
 'tests/class-mapping-current-s1-report-behavior.test.mjs',
 // Remaining computed import targets of the accepted current companion test.
 'tools/class-mapping-current-monetary-questions-v1.mjs',
 'tools/monetary-unit-provenance-audit-next-native-v2.mjs',
 // The pure alias test imports this exact dynamically selected module.
 'tools/source-report-consistency-audit-next-native-v2.mjs',
 'tests/helpers/xp-mutation-child-transport-v1.mjs',
 'tests/helpers/historical-h-catalog-view-v1.mjs',
 'tests/helpers/pass8-s1-paladin-catalog-history-v1.mjs',
 'tests/helpers/ua-history-source-directory-v1.mjs',
 'research/class-mapping-history-v1/p175-historical-module-v1.mjs',
 'tests/mm-search-cjs-transport-v1.test.mjs',
 'tests/current-s1-import-boundary-v2.test.mjs',
 'tests/p175-historical-current-boundary-v1.test.mjs',
 'tests/p175-historical-module-transport-v1.test.mjs',
]);
export const HISTORICAL_FIXED_DATA_PATHS=Object.freeze([
 'research/mm-source-history-v1/historical-h-catalog-blobs-v1.json',
 'research/mm-source-history-v1/historical-h-continuation-images-v2.json',
 'research/class-mapping-history-v1/mm-test-input-manifest-v6.json',
 'research/class-mapping-history-v1/original-top-level-test-entries-v1.json',
 'research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json',
 // Exact failed predecessor receipt used by the current builder regression.
 'tests/fixtures/class-mapping-source-handoff-before-mechanics-input-v1.json',
 'tests/fixtures/class-mapping-current-report-phase-before-v1.json',
 // Tests read preserved null-pin fixtures after live modules materialize.
 'research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.qcc-stub.mjs',
 'research/class-mapping-current-adapters-v1/current-consumer-pins-v1.qcc-stub.mjs',
 'tests/helpers/pass8-s1-paladin-catalog-history-v1.json',
]);
export const HISTORICAL_INSTALL_PINS_PATH='research/class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs';
// No caller-provided roots: a code pin can be admitted only when reachable from
// this fixed root set, or one of the two fixed immutable H data manifests.
export function deriveFixedHistoricalCodeClosure(read){
 const queue=[...HISTORICAL_CODE_ROOTS,...HISTORICAL_FIXED_DATA_PATHS],files=new Map();
 while(queue.length){const path=queue.shift();if(files.has(path)||path===HISTORICAL_INSTALL_PINS_PATH)continue;
  if(typeof path!=='string'||path.startsWith('/')||path.includes('\\')||/[\x00-\x1f\x7f:]/.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('-')))throw new Error('Unsafe historical static code path');
  const bytes=read(path);if(!Buffer.isBuffer(bytes))throw new Error('Historical static code bytes required: '+path);files.set(path,bytes);
  // This exact hash-pinned source is a template materialized as tools/ by the
  // unchanged Whale v5 fixture. Its relative imports belong to that bounded H
  // temporary layout, not to its archival template-storage directory.
  if(path==='research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/dmg175-h-native-jo-test-context-shim-v5.mjs')continue;
  if(!/\.(?:mjs|js)$/.test(path))continue;
  for(const match of bytes.toString('utf8').matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)){
   const target=posix.normalize(posix.join(posix.dirname(path),match[1]));
   if(target==='research/mm-source-history-v1/closed-version29-reader-current-mm-v1.mjs')throw new Error('Eager old ec10 import forbidden');
   if(target!==HISTORICAL_INSTALL_PINS_PATH)queue.push(target);
  }
 }
 return files;
}
export function assertExactHistoricalCodeClosure(codeFiles){
 const reached=deriveFixedHistoricalCodeClosure(path=>{const bytes=codeFiles.get(path);if(!bytes)throw new Error('Missing historical static code pin: '+path);return bytes;});
 if(reached.size!==codeFiles.size)throw new Error('Historical code pins must exactly equal the fixed-root static closure; extra independent roots are forbidden');
 return reached;
}
