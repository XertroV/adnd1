// Historical-MM replay copy of the exact a29 consumer; S1 companions remain separate.
// Current-MM CLI successor. The exact H-native v2 CLI and receipts remain
// frozen; this adapter consumes actual current M1 data only after the strict
// current-MM cohort guard succeeds.
import {readFileSync, writeFileSync} from '../mm-replay-fs-v1.mjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadMonetaryRowIdentityAudit} from './monetary-row-identity-audit.mjs';
import {assertCurrentMmSourceEpoch} from '../../../tests/helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {createMmCurrentMonetaryQuestionSuccessor, historicalProjectionBaselinePath,
  currentSourceQuestionRegistryPath, researchContractSha256} from '../replay-kernels/native-monetary-source-questions-kernel-mm-v1.mjs';

import {historicalMmTestRoot} from '../mm-replay-fs-v1.mjs';
const root = historicalMmTestRoot;
const contractBytes = readFileSync(resolve(root, currentSourceQuestionRegistryPath));
const baselineBytes = readFileSync(resolve(root, historicalProjectionBaselinePath));
const contract = JSON.parse(contractBytes.toString('utf8'));
const baseline = JSON.parse(baselineBytes.toString('utf8'));
const api = createMmCurrentMonetaryQuestionSuccessor({
  repoRoot: root,
  contract,
  contractBytes,
  baseline,
  baselineBytes,
  loadAudit: loadMonetaryRowIdentityAudit,
  assertSourceEpoch: assertCurrentMmSourceEpoch,
  expectedContractSha256: researchContractSha256,
});

export const loadCurrentMonetarySourceQuestions = api.loadCurrentMonetarySourceQuestions;
export const validateCurrentMonetarySourceQuestionProjection = api.validateCurrentMonetarySourceQuestionProjection;
export const buildCurrentMmMigrationProof = api.buildCurrentMmMigrationProof;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg, index) => !['--check', '--output'].includes(arg) && args[index - 1] !== '--output')) {
    throw Error('Usage: dmg175-current-monetary-source-questions-mm-v1.mjs [--check] [--output path]');
  }
  const {summary} = assertCurrentMmSourceEpoch(root);
  const projection = loadCurrentMonetarySourceQuestions({repoRoot: root});
  validateCurrentMonetarySourceQuestionProjection(projection, {repoRoot: root});
  const output = args.indexOf('--output');
  if (output >= 0) {
    if (!args[output + 1]) throw Error('--output requires a path');
    writeFileSync(resolve(args[output + 1]), JSON.stringify(projection, null, 2) + '\n');
  }
  process.stdout.write(`${JSON.stringify({
    status: 'current-MM-source-question-projection-valid-awaiting-review',
    sourceEpoch: {sourceCommit: summary.sourceCommit, sourceTree: summary.sourceTree},
    cohort: summary,
    currentDataSha256: projection.currentInputs.nativeSourceEpoch.sourceRawInputs['dist/data.json'],
    currentInputs: projection.currentInputs,
    questionCounts: projection.questionCounts,
    semanticPass: projection.semanticPass,
    generalSourceReviewPending: projection.generalSourceReviewPending,
  })}\n`);
}
